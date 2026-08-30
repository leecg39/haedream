import type { FirmRow } from "@/lib/fit-mocks/firm";

/**
 * API 응답으로 나가는 업체 표현.
 *
 * `FirmRow` 에는 한전 사이버지점 비밀번호(`kepcoPasswd`)가 들어 있다.
 * 이 값은 절대 외부로 나가면 안 되므로 타입 수준에서 빼 둔다.
 * 서버 수집 경로는 `@/lib/kepco/credentials.server` 에서만 자격증명을 읽는다.
 */
export type PublicFirm = Omit<FirmRow, "kepcoPasswd">;
