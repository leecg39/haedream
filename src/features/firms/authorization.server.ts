import type { SessionUser } from "@/features/facilities/types";
import { getDb, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";

export interface FirmAccess {
  readonly tenantId: string;
  readonly fid: number;
  readonly canViewPii: boolean;
  readonly canCollect: boolean;
}

export function getFirmAccess(
  tenantId: string,
  fid: number,
  db: AppDatabase = getDb(),
): FirmAccess | null {
  const row = db
    .prepare(
      `SELECT tenant_id, fid, can_view_pii, can_collect
       FROM tenant_firm_access
       WHERE tenant_id = ? AND fid = ?`,
    )
    .get(tenantId, fid) as
    | {
        tenant_id: string;
        fid: number;
        can_view_pii: number;
        can_collect: number;
      }
    | undefined;

  return row
    ? {
        tenantId: row.tenant_id,
        fid: row.fid,
        canViewPii: row.can_view_pii === 1,
        canCollect: row.can_collect === 1,
      }
    : null;
}

export function requireFirmAccess(
  user: SessionUser,
  fid: number,
  options: { readonly pii?: boolean; readonly collect?: boolean } = {},
  db: AppDatabase = getDb(),
): FirmAccess {
  const access = getFirmAccess(user.tenantId, fid, db);
  if (!access) {
    throw new AppError(
      403,
      "FIRM_ACCESS_DENIED",
      "이 업체에 접근할 권한이 없습니다.",
    );
  }
  if (options.pii && !access.canViewPii) {
    throw new AppError(
      403,
      "FIRM_PII_DENIED",
      "이 업체의 고객정보를 조회할 권한이 없습니다.",
    );
  }
  if (options.collect && !access.canCollect) {
    throw new AppError(
      403,
      "FIRM_COLLECTION_DENIED",
      "이 업체의 수집을 실행할 권한이 없습니다.",
    );
  }
  return access;
}
