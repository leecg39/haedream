import { createHash, randomBytes, randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { SessionUser, UserRole } from "@/features/facilities/types";

export const SESSION_COOKIE = "solar_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type Permission =
  | "facility:read"
  | "facility:create"
  | "facility:update"
  | "facility:delete"
  | "facility:restore"
  | "facility:purge"
  | "deleted:read";

const permissions: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set([
    "facility:read",
    "facility:create",
    "facility:update",
    "facility:delete",
    "facility:restore",
    "facility:purge",
    "deleted:read",
  ]),
  OPERATOR: new Set([
    "facility:read",
    "facility:create",
    "facility:update",
    "facility:delete",
    "facility:restore",
    "deleted:read",
  ]),
  VIEWER: new Set(["facility:read"]),
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashUserAgent(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export function hasPermission(role: UserRole, permission: Permission) {
  return permissions[role].has(permission);
}

export async function loginUser(
  tenantId: string,
  username: string,
  password: string,
  requestId: string,
  userAgent: string | null,
) {
  const db = getDb();
  const normalizedUsername = username.trim();
  const row = db
    .prepare(
      `SELECT u.id, u.tenant_id, u.username, u.name, u.password_hash,
              u.role, u.active, t.name AS tenant_name
       FROM users u
       INNER JOIN tenants t ON t.id = u.tenant_id
       WHERE u.tenant_id = ? AND u.username = ? COLLATE NOCASE
       LIMIT 1`,
    )
    .get(tenantId, normalizedUsername) as
    | {
        id: string;
        tenant_id: string;
        username: string;
        name: string;
        password_hash: string;
        role: UserRole;
        active: number;
        tenant_name: string;
      }
    | undefined;

  if (!row || !row.active || !(await compare(password, row.password_hash))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "아이디 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();
  const sessionId = randomUUID();

  db.transaction(() => {
    db.prepare(
      `DELETE FROM sessions
       WHERE expires_at <= ? OR revoked_at IS NOT NULL`,
    ).run(now.toISOString());
    db.prepare(
      `INSERT INTO sessions
       (id, tenant_id, user_id, token_hash, expires_at, created_at, user_agent_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      row.tenant_id,
      row.id,
      hashToken(token),
      expiresAt,
      now.toISOString(),
      hashUserAgent(userAgent),
    );
    db.prepare(
      `INSERT INTO audit_logs
       (id, tenant_id, actor_id, entity_type, entity_id, action, request_id, created_at)
       VALUES (?, ?, ?, 'SESSION', ?, 'LOGIN', ?, ?)`,
    ).run(
      randomUUID(),
      row.tenant_id,
      row.id,
      sessionId,
      requestId,
      now.toISOString(),
    );
  })();

  return {
    token,
    expiresAt,
    tenantName: row.tenant_name,
    user: {
      id: row.id,
      tenantId: row.tenant_id,
      username: row.username,
      name: row.name,
      role: row.role,
    } satisfies SessionUser,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function getSessionUser(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.tenant_id, u.username, u.name, u.role
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?
         AND u.active = 1`,
    )
    .get(hashToken(token), new Date().toISOString()) as
    | {
        id: string;
        tenant_id: string;
        username: string;
        name: string;
        role: UserRole;
      }
    | undefined;

  return row
    ? {
        id: row.id,
        tenantId: row.tenant_id,
        username: row.username,
        name: row.name,
        role: row.role,
      }
    : null;
}

export function requirePermission(
  request: NextRequest,
  permission: Permission,
) {
  const user = getSessionUser(request);
  if (!user) {
    throw new AppError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }
  if (!hasPermission(user.role, permission)) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  return user;
}

export function logoutUser(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, tenant_id, user_id FROM sessions
         WHERE token_hash = ? AND revoked_at IS NULL`,
      )
      .get(hashToken(token)) as
      | { id: string; tenant_id: string; user_id: string }
      | undefined;
    if (row) {
      db.transaction(() => {
        const revoked = db.prepare(
          `UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`,
        ).run(new Date().toISOString(), row.id);
        if (revoked.changes === 1) {
          db.prepare(
            `INSERT INTO audit_logs
             (id, tenant_id, actor_id, entity_type, entity_id, action, request_id, created_at)
             VALUES (?, ?, ?, 'SESSION', ?, 'LOGOUT', ?, ?)`,
          ).run(
            randomUUID(),
            row.tenant_id,
            row.user_id,
            row.id,
            requestId,
            new Date().toISOString(),
          );
        }
      })();
    }
  }
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
