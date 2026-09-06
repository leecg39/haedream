import { readFileSync } from "node:fs";

const [baselinePath, currentPath] = process.argv.slice(2);
if (!baselinePath || !currentPath) throw new Error("사용법: node autoresearch/meta_eval/outer_score.mjs <baseline/result.json> <current/result.json>");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const current = JSON.parse(readFileSync(currentPath, "utf8"));
if (!baseline.verify || !current.verify || baseline.frozenHash !== current.frozenHash) {
  throw new Error("같은 동결 기준을 통과한 결과만 비교할 수 있습니다.");
}
const regressions = Object.entries(current.metrics.outer)
  .filter(([name, metric]) => metric.work > baseline.metrics.outer[name].work).map(([name]) => name);
const priorities = Object.entries(current.metrics.inner).map(([name, metric]) => ({ name, remainingWork: metric.work,
  ratioToBaseline: metric.work / baseline.metrics.inner[name].work })).sort((a, b) => b.remainingWork - a.remainingWork);
console.log(JSON.stringify({ outer_score: 100 * (1 - current.outer / baseline.outer), regressions,
  priorities, note: "우선순위는 다음 가설 선택에만 사용하며 고정 점수 가중치는 바꾸지 않는다." }, null, 2));
if (regressions.length) process.exitCode = 1;
