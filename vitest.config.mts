import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Vitest runs in Node; Next's server-only guard must not block repository tests.
      "server-only": fileURLToPath(new URL("./tests/shims/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
      include: [
        "src/features/facilities/**/*.ts",
        "src/lib/{auth,db,http,errors}.ts",
      ],
    },
  },
});
