# Workflow

- Standard way to close out a unit of work is "커밋 하고 푸시" (commit and push); requested after nearly every completed task. Confidence: 0.9
- Global rule: never commit secrets or real customer data. Stage only the agent's own specific files (never `git add -A`) and verify nothing sensitive or belonging to other sessions is staged. Confidence: 0.85
- Works with many concurrent agent sessions on the same repo; each agent must touch only its designated files ("기존 파일 수정 금지", "다른 에이전트 병렬 작업과 겹치지 않도록") and must not revert or undo other sessions' work arbitrarily. Confidence: 0.85
- Preferred task loop for large features: remaining plan → implement → adversarial review (read-only, no file edits) → fix → commit/push → next plan, repeated without stopping. Confidence: 0.8
- A task is not done until `npx tsc --noEmit` plus lint/tests/build pass; verification commands and their actual results must be reported. Confidence: 0.85
- QA should include E2E flows and may be requested repeatedly ("QA 완벽하게 해줘 (e2e 까지 포함) 5번 반복"), often together with debugging. Confidence: 0.75
- Runs a local Next.js dev server (typically `npm run dev` on port 3000/3456) and frequently asks for restarts; other projects' servers run concurrently (e.g., port 3100), so check port ownership and kill only specific PIDs — never a broad `pkill -f "next dev"`. Confidence: 0.8
- Gives UI feedback through Agentation page-feedback annotations (element location + React tree) and sometimes asks to open pages in the ego-browser for live viewing. Confidence: 0.65
