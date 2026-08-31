// Agentation + React 를 정적 HTML 페이지에서 쓸 수 있는 단일 IIFE 번들로 빌드한다.
// agentation 패키지는 CJS/ESM 만 배포하고 react 를 bare import 하므로,
// 브라우저가 script 태그로 바로 로드할 수 있는 형태로 미리 묶어 둔다.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { build } from "vite";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(PROJECT_ROOT, "scripts", "agentation-standalone-entry.js");
const OUT_DIR = join(PROJECT_ROOT, "public", "assets", "js");
const OUT_FILE = "agentation-standalone.js";

async function main() {
  try {
    await build({
      configFile: false,
      root: PROJECT_ROOT,
      logLevel: "warn",
      // 출력 경로가 public/ 안에 있으므로 publicDir 복사를 반드시 꺼야 한다.
      // 켜두면 public/ 전체를 public/assets/js/ 로 재귀 복사하며 기존 파일을 덮어쓴다.
      publicDir: false,
      // 번들에 포함되는 React 는 개발 경고 없이 동작하는 production 빌드를 쓴다.
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        outDir: OUT_DIR,
        emptyOutDir: false,
        target: "es2020",
        minify: true,
        lib: {
          entry: ENTRY,
          formats: ["iife"],
          name: "AgentationStandalone",
          fileName: () => OUT_FILE,
        },
      },
    });

    console.info(`Agentation 정적 번들 생성 완료: public/assets/js/${OUT_FILE}`);
  } catch (error) {
    console.error("Agentation 정적 번들 빌드 실패:", error);
    process.exitCode = 1;
  }
}

main();
