/**
 * 한전 파워플래너(pp.kepco.co.kr) RSA 로그인 모듈.
 *
 * 흐름(docs/research/pp.kepco.co.kr/INTEGRATION.md 에서 실계정 검증):
 *   1. GET /intro.do → cookieSsId / cookieRsa 쿠키 + #RSAExponent 획득
 *   2. RSA(PKCS#1 v1.5)로 고객번호·비밀번호 암호화, `cookieSsId_` 접두사
 *   3. POST /intro/chkUser.do → SSO 여부
 *   4. POST /login → JSESSIONID 세션 확립
 */
import { rsaEncrypt } from "./rsa.ts";

const ORIGIN = "https://pp.kepco.co.kr";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

/** 최소 쿠키 저장소 — set-cookie 헤더를 이름 기준으로 적재한다. */
export class CookieJar {
  private readonly store = new Map<string, string>();

  absorb(headers: Headers) {
    for (const cookie of headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      // Cookie 헤더에는 원본(raw) 값을 그대로 돌려보낸다(브라우저 동작과 동일).
      this.store.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  /** JS getCookie 와 동일하게 URL 디코딩된 값을 반환한다. */
  get(name: string) {
    const raw = this.store.get(name) ?? "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  header() {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

/** jsbn RSAKey.encrypt 결과(소문자 hex) — vendor/jsbn 경유. */
export function rsaEncryptHex(modulusHex: string, exponentHex: string, text: string) {
  return rsaEncrypt(modulusHex, exponentHex, text);
}

export interface KepcoSession {
  readonly jar: CookieJar;
  /** 세션 확립 시각 */
  readonly establishedAt: number;
}

export class KepcoLoginError extends Error {
  readonly stage: "intro" | "chkUser" | "login" | "verify";

  constructor(message: string, stage: "intro" | "chkUser" | "login" | "verify") {
    super(message);
    this.name = "KepcoLoginError";
    this.stage = stage;
  }
}

/**
 * 고객번호+비밀번호로 파워플래너에 로그인해 세션을 반환한다.
 * 실패 시 KepcoLoginError(어느 단계에서 실패했는지 포함).
 */
export async function kepcoLogin(kepcoNo: string, kepcoPasswd: string): Promise<KepcoSession> {
  const jar = new CookieJar();

  // 1. intro.do — RSA 키·세션 토큰 쿠키 획득
  const intro = await fetch(`${ORIGIN}/intro.do`, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });
  jar.absorb(intro.headers);
  const html = await intro.text();
  const exponent = html.match(/id="RSAExponent"[^>]*value="([0-9a-fA-F]+)"/)?.[1]
    ?? html.match(/value="([0-9a-fA-F]+)"[^>]*id="RSAExponent"/)?.[1];
  const modulus = jar.get("cookieRsa");
  const ssId = jar.get("cookieSsId");
  if (!exponent || !modulus || !ssId) {
    throw new KepcoLoginError("intro.do에서 RSA 키/세션 토큰을 얻지 못했습니다.", "intro");
  }

  const encId = `${ssId}_${rsaEncryptHex(modulus, exponent, kepcoNo)}`;
  const encPw = `${ssId}_${rsaEncryptHex(modulus, exponent, kepcoPasswd)}`;

  // 2. chkUser — SSO 통합계정 여부 확인
  const chk = await fetch(`${ORIGIN}/intro/chkUser.do`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.header(),
      "user-agent": USER_AGENT,
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify({ USER_ID: encId, USER_PWD: encPw, USER_CI: "", TYPE: "I" }),
  });
  jar.absorb(chk.headers);
  if (!chk.ok) throw new KepcoLoginError(`chkUser.do HTTP ${chk.status}`, "chkUser");
  // 브라우저는 data.result === "success" 일 때만 USER_SSO_YN 값을 쓰고 아니면 "N" 을 보낸다.
  const chkJson = (await chk.json()) as { result?: string; USER_SSO_YN?: string };
  const ssoYn = chkJson.result === "success" ? (chkJson.USER_SSO_YN ?? "N") : "N";

  // 3. /login — 세션 확립
  // 서버가 fetch/XHR 과 실제 폼 제출(navigation)을 구분하므로 브라우저 폼 제출 헤더를 흉내낸다.
  const login = await fetch(`${ORIGIN}/login`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: jar.header(),
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9",
      origin: ORIGIN,
      referer: `${ORIGIN}/intro.do`,
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
    },
    body: new URLSearchParams({
      USER_ID: encId,
      USER_PWD: encPw,
      APT_YN: kepcoNo.length > 10 ? "Y" : "N",
      SSO_ID: ssoYn,
    }).toString(),
    redirect: "manual",
  });
  // 302 응답의 Set-Cookie(인증된 JSESSIONID로 교체)를 반드시 흡수해야 한다.
  // redirect:"follow" 는 리다이렉트 중간 응답의 쿠키를 버리므로 수동으로 따라간다.
  jar.absorb(login.headers);
  await login.arrayBuffer(); // 본문 소비
  const location = login.headers.get("location") ?? "";
  if (login.status !== 302 || location.includes("intro.do")) {
    throw new KepcoLoginError("로그인 실패: 고객번호/비밀번호를 확인하세요.", "login");
  }
  if (!jar.get("JSESSIONID")) {
    throw new KepcoLoginError("로그인 후 JSESSIONID가 없습니다.", "login");
  }

  // 4. 검증 — 인증 전용 API가 200 JSON을 반환하는지 확인
  const verify = await fetch(`${ORIGIN}/auth/usercustno_list.do`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.header(),
      "user-agent": USER_AGENT,
      "x-requested-with": "XMLHttpRequest",
    },
    body: "{}",
  });
  jar.absorb(verify.headers);
  if (!verify.ok) throw new KepcoLoginError(`세션 검증 HTTP ${verify.status}`, "verify");
  const list = (await verify.json()) as unknown;
  if (!Array.isArray(list) || list.length === 0) {
    throw new KepcoLoginError("세션 검증 실패: 고객번호 목록이 비었습니다.", "verify");
  }

  return { jar, establishedAt: Date.now() };
}
