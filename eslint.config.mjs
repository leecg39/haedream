import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright 보고서의 번들 파일은 생성된 산출물이다. e2e 테스트 소스는 계속 검사한다.
    "playwright-report/**",
    "test-results/**",
    // 로컬 워크트리 사본·운영 증거 폴더는 별도 프로젝트/산출물이다.
    "SolarSimz-worktrees/**",
    "solarsimz-ops-artifacts/**",
    "solarsimz-private-firm-import/**",
    // Mirrored production assets and third-party browser bundles.
    "public/**",
    // Vendored third-party libraries (원본 사이트 jsbn 등)는 린트하지 않는다.
    "src/lib/kepco/vendor/**",
    "scripts/vendor/**",
  ]),
]);

export default eslintConfig;
