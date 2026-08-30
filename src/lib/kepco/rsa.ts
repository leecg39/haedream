/**
 * pp.kepco.co.kr 이 요구하는 RSA 암호화 — 사이트 원본 jsbn(vendor/)을 node:vm 으로 실행한다.
 *
 * node:crypto 의 RSA_PKCS1_PADDING 암호문은 서버가 거부한다(2026-08-29 A/B 검증:
 * 같은 세션·같은 쿠키에서 jsbn 암호문만 로그인 성공). 브라우저와 바이트 동일한
 * 동작을 보장하기 위해 사이트가 쓰는 라이브러리를 그대로 쓴다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

interface RsaKeyInstance {
  setPublic(modulusHex: string, exponentHex: string): void;
  encrypt(text: string): string;
}

interface RsaContext {
  RSAKey: new () => RsaKeyInstance;
}

let cached: RsaContext | null = null;

function loadRsaContext(): RsaContext {
  if (cached) return cached;
  const sandbox: Record<string, unknown> = {
    window: {},
    navigator: { appName: "Netscape", appVersion: "5.0" },
    alert: () => {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const vendorSources: Array<[string, string]> = [
    ["jsbn.js", readFileSync(path.join(process.cwd(), "src/lib/kepco/vendor/jsbn.js"), "utf8")],
    ["prng4.js", readFileSync(path.join(process.cwd(), "src/lib/kepco/vendor/prng4.js"), "utf8")],
    ["rng.js", readFileSync(path.join(process.cwd(), "src/lib/kepco/vendor/rng.js"), "utf8")],
    ["rsa.js", readFileSync(path.join(process.cwd(), "src/lib/kepco/vendor/rsa.js"), "utf8")],
  ];
  for (const [name, source] of vendorSources) {
    vm.runInContext(source, sandbox, { filename: name });
  }
  cached = sandbox as unknown as RsaContext;
  return cached;
}

/** jsbn RSAKey.encrypt 와 동일한 PKCS#1 v1.5 암호문(소문자 hex)을 만든다. */
export function rsaEncrypt(modulusHex: string, exponentHex: string, text: string): string {
  const { RSAKey } = loadRsaContext();
  const rsa = new RSAKey();
  rsa.setPublic(modulusHex, exponentHex);
  return rsa.encrypt(text);
}
