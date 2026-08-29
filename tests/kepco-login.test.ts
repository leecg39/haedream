import { describe, expect, it } from "vitest";
import { CookieJar } from "@/lib/kepco/login";
import { rsaEncrypt } from "@/lib/kepco/rsa";

describe("CookieJar", () => {
  it("set-cookie 헤더를 이름 기준으로 적재하고 Cookie 헤더로 내보낸다", () => {
    const jar = new CookieJar();
    const headers = new Headers();
    headers.append("set-cookie", "cookieSsId=abc%3D; SameSite=Lax; secure");
    headers.append("set-cookie", "JSESSIONID=abc=; Path=/; HttpOnly");
    jar.absorb(headers);

    // Cookie 헤더에는 원본(raw) 값을 그대로 쓴다(브라우저 동작).
    expect(jar.header()).toBe("cookieSsId=abc%3D; JSESSIONID=abc=");
    // get() 은 JS getCookie 와 동일하게 디코딩한다.
    expect(jar.get("cookieSsId")).toBe("abc=");
    expect(jar.get("JSESSIONID")).toBe("abc=");
    expect(jar.get("missing")).toBe("");
  });

  it("같은 이름의 쿠키는 나중 값으로 교체한다(세션 회전)", () => {
    const jar = new CookieJar();
    const first = new Headers();
    first.append("set-cookie", "JSESSIONID=old; Path=/");
    jar.absorb(first);
    const second = new Headers();
    second.append("set-cookie", "JSESSIONID=new; Path=/");
    jar.absorb(second);
    expect(jar.get("JSESSIONID")).toBe("new");
  });
});

describe("rsaEncrypt (vendor jsbn)", () => {
  // 2048-bit 테스트 모듈러스(형식 검증용)
  const MODULUS =
    "c50a273eef48baf0abe3f9f9f0165885e10a4ddad3bf6c82baf60ac1ddef9e6daea4117c078dc752ab0a2068063b4e3cced0ae0f5f9a118d8870aa91a3f4bf7eac89a2e147813fbb089b9632a8d0b1cd5642847058a3b3c6683e43ae269678b2d191f9f3c14250e83d103a864305aeacbc32fdf5ded4f2f51fdbb5d4bcc61344368b8115f8b5b9093d3adcdc82c0e0b8b88a49d5d9525bf173beeadbcff0a390f0321f16a048cef7a3a15675fde4bdbf2d5442be183abca7459465e975ba9ec597f443f8de58e2f7547c536cf9a814b213c3dc37dec26c981a851a683f3e00f95a0dc00995a757b63b1ece8fe1f237d95f6760085f96f43333e1e085c259433d";

  it("512자 hex 암호문을 생성한다", () => {
    const encrypted = rsaEncrypt(MODULUS, "10001", "1016122623");
    expect(encrypted).toMatch(/^[0-9a-f]+$/);
    expect(encrypted.length).toBeGreaterThanOrEqual(510);
    expect(encrypted.length).toBeLessThanOrEqual(512);
  });

  it("같은 입력도 매번 다른 암호문을 만든다(랜덤 패딩)", () => {
    const a = rsaEncrypt(MODULUS, "10001", "password1");
    const b = rsaEncrypt(MODULUS, "10001", "password1");
    expect(a).not.toBe(b);
  });
});
