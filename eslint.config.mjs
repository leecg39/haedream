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
    // Mirrored production assets and third-party browser bundles.
    "public/**",
    // Vendored third-party libraries (원본 사이트 jsbn 등)는 린트하지 않는다.
    "src/lib/kepco/vendor/**",
    "scripts/vendor/**",
  ]),
]);

export default eslintConfig;
