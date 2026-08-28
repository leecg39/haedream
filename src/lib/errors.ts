export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isSqliteConstraint(error: unknown, code?: string) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const sqliteCode = String(error.code);
  return code ? sqliteCode === code : sqliteCode.startsWith("SQLITE_CONSTRAINT");
}
