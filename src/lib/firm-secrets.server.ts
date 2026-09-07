import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { closeSync, fchmodSync, lstatSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function firmCredentialKeyPath() {
  return process.env.FIRM_CREDENTIAL_KEY_PATH ?? path.join(process.cwd(), "data/firm-credentials.key");
}

/** 키 생성은 명시적인 로컬 CSV 반영에서만 호출한다. 서버 조회는 키를 생성하지 않는다. */
export function readFirmCredentialKey(create = false): Buffer {
  const file = firmCredentialKeyPath();
  if (create) {
    try {
      const fd = openSync(/* turbopackIgnore: true */ file, "wx", 0o600);
      try {
        fchmodSync(fd, 0o600);
        writeFileSync(fd, randomBytes(32));
      } finally { closeSync(fd); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw new Error("자격증명 키를 생성할 수 없습니다.");
    }
  }
  const info = lstatSync(/* turbopackIgnore: true */ file);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o600) {
    throw new Error("자격증명 키는 0600 권한의 일반 파일이어야 합니다.");
  }
  const key = readFileSync(/* turbopackIgnore: true */ file);
  if (key.length !== 32) throw new Error("자격증명 키 형식이 올바르지 않습니다.");
  return key;
}

export function encryptFirmPassword(fid: number, password: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`firm:${fid}:v1`));
  const body = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decryptFirmPassword(fid: number, encrypted: string, key = readFirmCredentialKey()): string {
  const [version, iv, tag, body, extra] = encrypted.split(":");
  if (version !== "v1" || !iv || !tag || !body || extra) throw new Error("자격증명 형식이 올바르지 않습니다.");
  const cipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  cipher.setAAD(Buffer.from(`firm:${fid}:v1`));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([cipher.update(Buffer.from(body, "base64")), cipher.final()]).toString("utf8");
}
