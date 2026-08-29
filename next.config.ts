import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// src/lib/fit-mocks/kepco-passwds.json 은 비밀번호를 담은 gitignore 로컬 파일이다.
// 클린 클론에서는 빈 맵을 만들어 두어야 firm.ts 의 JSON import 가 깨지지 않는다.
const kepcoPasswdsPath = join(process.cwd(), "src", "lib", "fit-mocks", "kepco-passwds.json");
if (!existsSync(kepcoPasswdsPath)) {
  writeFileSync(kepcoPasswdsPath, "{}\n");
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
