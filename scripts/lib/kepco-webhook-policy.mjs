/**
 * KEPCO webhook destination 정책.
 *
 * HTTPS:
 * - 동기: URL shape / allowlist / literal blocked IP (DNS 없음)
 * - 전달 시: DNS lookup → entry 검증 → 모든 주소 공인일 때만 1개 pin
 * - https.request + custom lookup (Node 20/22: all true/false 계약)
 * - family 고정, autoSelectFamily:false, rejectUnauthorized 기본 true
 * - TLS SNI·HTTP Host = allowlisted 원 hostname (재해석 금지)
 *
 * HTTP loopback (KEPCO_ALERT_ALLOW_HTTP_LOOPBACK=1): 테스트 전용
 *
 * 외부 ACL 등 코드 밖 통제는 “완전 fail-closed”로 과장하지 않는다.
 */
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export function parseHostAllowlist(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return [];
  return String(raw)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function isLoopbackHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/** IPv6 축약/혼합 표기를 8 hextet 으로 확장. 실패 시 null. */
export function expandIpv6(address) {
  let input = address.replace(/^\[|\]$/g, "").toLowerCase();
  const dotted = input.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const octets = dotted[2].split(".").map((part) => Number(part));
    if (
      octets.length !== 4 ||
      octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return null;
    }
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    input = `${dotted[1]}${hi}:${lo}`;
  }
  if (input.includes("::")) {
    const sides = input.split("::");
    if (sides.length !== 2) return null;
    const left = sides[0] ? sides[0].split(":") : [];
    const right = sides[1] ? sides[1].split(":") : [];
    if (left.length + right.length > 8) return null;
    const fill = Array.from({ length: 8 - left.length - right.length }, () => "0");
    input = [...left, ...fill, ...right].join(":");
  }
  const parts = input.split(":");
  if (parts.length !== 8) return null;
  if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return parts.map((part) => part.padStart(4, "0")).join(":");
}

function hextetsToIpv4(hi, lo) {
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * IPv4 embedding → dotted IPv4.
 * 포함: IPv4-mapped, IPv4-compatible, NAT64 64:ff9b::/96, IPv4-translated ::ffff:0:0:0/96
 */
export function ipv4FromMappedOrCompatible(ipv6) {
  const expanded = expandIpv6(ipv6);
  if (!expanded) return null;
  const parts = expanded.split(":").map((part) => Number.parseInt(part, 16));
  // ::ffff:x:x / ::ffff:d.d.d.d (IPv4-mapped)
  if (
    parts[0] === 0 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    parts[5] === 0xffff
  ) {
    return hextetsToIpv4(parts[6], parts[7]);
  }
  // ::ffff:0:x:x (IPv4-translated ::ffff:0:0:0/96)
  if (
    parts[0] === 0 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0xffff &&
    parts[5] === 0
  ) {
    return hextetsToIpv4(parts[6], parts[7]);
  }
  // well-known NAT64 64:ff9b::/96
  if (
    parts[0] === 0x64 &&
    parts[1] === 0xff9b &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    parts[5] === 0
  ) {
    return hextetsToIpv4(parts[6], parts[7]);
  }
  // IPv4-compatible ::x:x (deprecated). :: and ::1 제외.
  if (
    parts[0] === 0 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    parts[5] === 0
  ) {
    if (parts[6] === 0 && (parts[7] === 0 || parts[7] === 1)) return null;
    return hextetsToIpv4(parts[6], parts[7]);
  }
  return null;
}

function isBlockedIpv4(parts) {
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * IPv6 special / transition block table.
 * 정상 global unicast(예: 2001:4860::)는 통과. hostname allowlist 만으로
 * 사설·transition 임베딩이 우회되지 않게 DNS pin 전에 여기서 차단한다.
 *
 * @param {string} expanded 8 hextet colon form
 * @returns {boolean|null} true=blocked, false=allowed, null=not decided by table
 */
function matchIpv6SpecialBlockTable(expanded) {
  const parts = expanded.split(":").map((part) => Number.parseInt(part, 16));
  if (parts.length !== 8 || parts.some((part) => !Number.isFinite(part))) {
    return true;
  }

  // unspecified / loopback
  if (parts.every((part) => part === 0)) return true;
  if (
    parts[0] === 0 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    parts[5] === 0 &&
    parts[6] === 0 &&
    parts[7] === 1
  ) {
    return true;
  }

  // Teredo 2001:0000::/32 — 전체 차단
  if (parts[0] === 0x2001 && parts[1] === 0) return true;

  // documentation 2001:db8::/32
  if (parts[0] === 0x2001 && parts[1] === 0xdb8) return true;

  // 6to4 2002::/16 — transition 전체 차단 (임베디드 IPv4 private 도 명시 적용)
  if (parts[0] === 0x2002) {
    const embeddedParts = [
      (parts[1] >> 8) & 0xff,
      parts[1] & 0xff,
      (parts[2] >> 8) & 0xff,
      parts[2] & 0xff,
    ];
    if (isBlockedIpv4(embeddedParts)) return true;
    return true;
  }

  // local-use NAT64 64:ff9b:1::/48
  if (parts[0] === 0x64 && parts[1] === 0xff9b && parts[2] === 1) return true;

  // link-local fe80::/10
  if (parts[0] >= 0xfe80 && parts[0] <= 0xfebf) return true;

  // deprecated site-local fec0::/10
  if (parts[0] >= 0xfec0 && parts[0] <= 0xfeff) return true;

  // unique local fc00::/7
  if (parts[0] >= 0xfc00 && parts[0] <= 0xfdff) return true;

  // multicast ff00::/8
  if (parts[0] >= 0xff00 && parts[0] <= 0xffff) return true;

  return null;
}

function isBlockedIpv6Native(normalized) {
  if (normalized === "::" || normalized === "::1") return true;
  const expanded = expandIpv6(normalized);
  if (!expanded) return true;
  const table = matchIpv6SpecialBlockTable(expanded);
  if (table !== null) return table;
  return false;
}

/** IPv4/IPv6 literal 또는 해석된 주소가 비공인·특수 대역이면 true. */
export function isBlockedIpAddress(address) {
  const normalized = String(address).replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(normalized) === 4) {
    const parts = normalized.split(".").map((part) => Number(part));
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return true;
    }
    return isBlockedIpv4(parts);
  }
  if (net.isIP(normalized) === 6) {
    const mapped = ipv4FromMappedOrCompatible(normalized);
    if (mapped) return isBlockedIpAddress(mapped);
    return isBlockedIpv6Native(normalized);
  }
  const mapped = ipv4FromMappedOrCompatible(normalized);
  if (mapped) return isBlockedIpAddress(mapped);
  return true;
}

/**
 * DNS 없이 URL/allowlist/literal IP 만 검사.
 * @param {string} rawUrl
 * @param {{ allowHttpLoopback?: boolean, hostAllowlist?: string[] }} [options]
 */
export function assertWebhookUrlShape(
  rawUrl,
  { allowHttpLoopback = false, hostAllowlist = /** @type {string[]} */ ([]) } = {},
) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const error = new Error("invalid webhook url");
    error.code = "WEBHOOK_URL_INVALID";
    throw error;
  }
  if (parsed.username || parsed.password) {
    const error = new Error("webhook url must not include credentials");
    error.code = "WEBHOOK_URL_CREDENTIALS";
    throw error;
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (parsed.protocol === "http:") {
    if (!(allowHttpLoopback && isLoopbackHostname(hostname))) {
      const error = new Error("http webhook requires loopback opt-in");
      error.code = "WEBHOOK_HTTP_FORBIDDEN";
      throw error;
    }
    return {
      parsed,
      hostname,
      mode: "http-loopback",
      url: parsed.toString(),
    };
  }
  if (parsed.protocol !== "https:") {
    const error = new Error("webhook url must be https");
    error.code = "WEBHOOK_PROTOCOL";
    throw error;
  }
  if (net.isIP(hostname) !== 0 && isBlockedIpAddress(hostname)) {
    const error = new Error("webhook url host is a blocked ip");
    error.code = "WEBHOOK_BLOCKED_IP";
    throw error;
  }
  const allowed = new Set(hostAllowlist.map((host) => host.toLowerCase()));
  if (allowed.size === 0) {
    const error = new Error("webhook host allowlist required");
    error.code = "WEBHOOK_ALLOWLIST_REQUIRED";
    throw error;
  }
  if (!allowed.has(hostname.toLowerCase())) {
    const error = new Error("webhook host not in allowlist");
    error.code = "WEBHOOK_HOST_NOT_ALLOWED";
    throw error;
  }
  return {
    parsed,
    hostname,
    mode: "https",
    url: parsed.toString(),
  };
}

/**
 * DNS lookup 결과 entry 정규화.
 * 각 entry: non-null object, address string, family 4|6, net.isIP(address)===family.
 * @returns {{ address: string, family: 4|6 }[]}
 */
export function normalizeDnsLookupEntries(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    const error = new Error("webhook host dns lookup empty");
    error.code = "WEBHOOK_DNS_FAILED";
    throw error;
  }
  const normalized = [];
  for (const entry of addresses) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      const error = new Error("webhook host dns entry invalid");
      error.code = "WEBHOOK_DNS_FAILED";
      throw error;
    }
    const address = entry.address;
    const family = entry.family;
    if (typeof address !== "string" || address.length === 0) {
      const error = new Error("webhook host dns address invalid");
      error.code = "WEBHOOK_DNS_FAILED";
      throw error;
    }
    if (family !== 4 && family !== 6) {
      const error = new Error("webhook host dns family invalid");
      error.code = "WEBHOOK_DNS_FAILED";
      throw error;
    }
    if (net.isIP(address) !== family) {
      const error = new Error("webhook host dns family mismatch");
      error.code = "WEBHOOK_DNS_FAILED";
      throw error;
    }
    normalized.push({ address, family });
  }
  return normalized;
}

/**
 * DNS lookup + blocked IP 검사 후 pin 할 공인 주소 1개 선택.
 * alerting 이후에만 호출한다. 모든 결과가 공인일 때만 pin.
 */
export async function resolvePinnedHttpsAddress(options) {
  const { hostname, lookupAll } = options;
  if (net.isIP(hostname) !== 0) {
    if (isBlockedIpAddress(hostname)) {
      const error = new Error("webhook url host is a blocked ip");
      error.code = "WEBHOOK_BLOCKED_IP";
      throw error;
    }
    const family = net.isIP(hostname);
    return { pinnedAddress: hostname, family, hostname };
  }
  const lookup =
    lookupAll ??
    (async (name) => dns.lookup(name, { all: true, verbatim: true }));
  let addresses;
  try {
    addresses = await lookup(hostname);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "WEBHOOK_DNS_FAILED") {
      throw error;
    }
    const wrapped = new Error("webhook host dns lookup failed");
    wrapped.code = "WEBHOOK_DNS_FAILED";
    throw wrapped;
  }
  const entries = normalizeDnsLookupEntries(addresses);
  for (const entry of entries) {
    if (isBlockedIpAddress(entry.address)) {
      const error = new Error("webhook host resolves to blocked ip");
      error.code = "WEBHOOK_BLOCKED_IP";
      throw error;
    }
  }
  const chosen = entries[0];
  return {
    pinnedAddress: chosen.address,
    family: chosen.family,
    hostname,
  };
}

/** @deprecated 테스트 호환: shape + (HTTPS면) pin resolve */
export async function assertWebhookDestination(options) {
  const shape = assertWebhookUrlShape(options.rawUrl, {
    allowHttpLoopback: options.allowHttpLoopback,
    hostAllowlist: options.hostAllowlist,
  });
  if (shape.mode === "http-loopback") {
    return { ...shape, pinnedAddress: shape.hostname, family: net.isIP(shape.hostname) || 4 };
  }
  const pinned = await resolvePinnedHttpsAddress({
    hostname: shape.hostname,
    lookupAll: options.lookupAll,
  });
  return { ...shape, ...pinned };
}

/**
 * Node 20/22 https.request custom lookup 계약.
 * opts.all === true → callback(null, [{address, family}])
 * 그 외 → callback(null, address, family)
 */
export function createPinnedLookup({ hostname, pinnedAddress, connectFamily }) {
  return (hostnameAsked, opts, callback) => {
    if (hostnameAsked !== hostname) {
      callback(new Error("unexpected lookup hostname"));
      return;
    }
    const family = connectFamily === 6 ? 6 : 4;
    if (opts && opts.all === true) {
      callback(null, [{ address: pinnedAddress, family }]);
      return;
    }
    callback(null, pinnedAddress, family);
  };
}

/**
 * HTTPS POST with TCP pinned to pinnedAddress via custom lookup.
 * TLS SNI + Host header = allowlisted hostname (재해석 금지).
 * rejectUnauthorized 기본 true. ca 는 테스트 전용 trust 주입용.
 *
 * @param {{
 *   url: string|URL,
 *   hostname: string,
 *   pinnedAddress: string,
 *   family?: number|string,
 *   body: string,
 *   signatureHeader: string,
 *   timeoutMs: number,
 *   lookupImpl?: Function,
 *   ca?: string|Buffer|Array<string|Buffer>,
 *   rejectUnauthorized?: boolean,
 *   onPeer?: (info: { remoteAddress?: string, servername?: string }) => void,
 * }} options
 */
export function postWebhookHttpsPinned(options) {
  const {
    url,
    hostname,
    pinnedAddress,
    family,
    body,
    signatureHeader,
    timeoutMs,
    lookupImpl,
    ca,
    rejectUnauthorized = true,
    onPeer,
  } = options;
  const parsed = typeof url === "string" ? new URL(url) : url;
  const connectFamily = family === 6 || family === "IPv6" ? 6 : 4;
  const lookup =
    lookupImpl ??
    createPinnedLookup({ hostname, pinnedAddress, connectFamily });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    /** @type {import("node:https").RequestOptions} */
    const requestOptions = {
      protocol: "https:",
      hostname,
      servername: hostname,
      family: connectFamily,
      autoSelectFamily: false,
      port: parsed.port || 443,
      path: `${parsed.pathname}${parsed.search}`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: parsed.host,
        "x-solarsimz-signature": signatureHeader,
        "content-length": Buffer.byteLength(body),
      },
      lookup,
      timeout: timeoutMs,
      rejectUnauthorized,
    };
    if (ca !== undefined) {
      requestOptions.ca = ca;
    }

    const req = https.request(requestOptions, (res) => {
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400) {
        finish({ delivered: false, sink: "webhook", errorCode: "REDIRECT" });
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        finish({
          delivered: false,
          sink: "webhook",
          errorCode: "HTTP_NON_2XX",
          httpStatus: res.statusCode ?? 0,
        });
        return;
      }
      finish({ delivered: true, sink: "webhook" });
    });

    req.on("socket", (socket) => {
      const reportPeer = () => {
        if (typeof onPeer === "function") {
          onPeer({
            remoteAddress: socket.remoteAddress,
            servername: socket.servername ?? hostname,
          });
        }
      };
      if (socket.connecting) {
        socket.once("secureConnect", reportPeer);
        socket.once("connect", () => {
          // TCP peer 는 connect 시점에 확정; TLS 전이라도 remoteAddress 관찰 가능
          if (!socket.encrypted) {
            // secureConnect 대기
          }
        });
      } else {
        socket.once("secureConnect", reportPeer);
      }
    });

    req.on("timeout", () => {
      req.destroy();
      finish({ delivered: false, sink: "webhook", errorCode: "TIMEOUT" });
    });
    req.on("error", () => {
      finish({ delivered: false, sink: "webhook", errorCode: "NETWORK" });
    });
    req.write(body);
    req.end();
  });
}

/** HTTP loopback 테스트용 (pin 불필요). redirect 수동 거부. */
export function postWebhookHttpLoopback(options) {
  const { url, body, signatureHeader, timeoutMs } = options;
  const parsed = typeof url === "string" ? new URL(url) : url;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const req = http.request(
      {
        protocol: "http:",
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-solarsimz-signature": signatureHeader,
          "content-length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 300 && res.statusCode < 400) {
          finish({ delivered: false, sink: "webhook", errorCode: "REDIRECT" });
          return;
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          finish({
            delivered: false,
            sink: "webhook",
            errorCode: "HTTP_NON_2XX",
            httpStatus: res.statusCode ?? 0,
          });
          return;
        }
        finish({ delivered: true, sink: "webhook" });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      finish({ delivered: false, sink: "webhook", errorCode: "TIMEOUT" });
    });
    req.on("error", () => {
      finish({ delivered: false, sink: "webhook", errorCode: "NETWORK" });
    });
    req.write(body);
    req.end();
  });
}
