import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../config/env";
import { execute, queryOne } from "../db/pool";
import type { AuthUser } from "../types/auth";
import { randomToken, sha256 } from "../utils/crypto";

interface SessionUserRow extends RowDataPacket {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  status: AuthUser["status"];
  is_email_verified: number;
  preferred_language: string;
  active_mode: "buyer" | "seller";
  notification_email_enabled: number;
  created_at: string;
  roles: string | null;
  seller_profile_id: number | null;
  seller_business_name: string | null;
  seller_status: AuthUser["sellerStatus"];
}

function mapSessionUser(row: SessionUserRow): AuthUser {
  return {
    id: Number(row.id),
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    status: row.status,
    isEmailVerified: Boolean(row.is_email_verified),
    preferredLanguage: row.preferred_language,
    activeMode: row.active_mode,
    notificationEmailEnabled: Boolean(row.notification_email_enabled),
    roles: row.roles ? row.roles.split(",") : [],
    sellerProfileId: row.seller_profile_id === null ? null : Number(row.seller_profile_id),
    sellerBusinessName: row.seller_business_name,
    sellerStatus: row.seller_status,
    createdAt: row.created_at,
  };
}

function sessionExpiry(): string {
  const expires = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
  return expires.toISOString().slice(0, 19).replace("T", " ");
}

export async function createSession(userId: number, req: Request): Promise<string> {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  await execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      tokenHash,
      userId,
      sessionExpiry(),
      req.ip ?? null,
      (req.get("user-agent") ?? "").slice(0, 255) || null,
    ],
  );
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.sessionCookieName, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
    maxAge: env.sessionTtlHours * 60 * 60 * 1000,
    domain: env.cookieDomain,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
    domain: env.cookieDomain,
  });
}

export async function getSessionUser(token: string): Promise<{ user: AuthUser; sessionHash: string } | null> {
  const tokenHash = sha256(token);
  const row = await queryOne<SessionUserRow>(
    `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.is_email_verified,
            u.preferred_language, u.active_mode, u.notification_email_enabled, u.created_at,
            GROUP_CONCAT(DISTINCT r.name ORDER BY r.name) AS roles,
            sp.id AS seller_profile_id, sp.business_name AS seller_business_name, sp.status AS seller_status
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     GROUP BY u.id, sp.id
     LIMIT 1`,
    [tokenHash],
  );
  if (!row) return null;
  return { user: mapSessionUser(row), sessionHash: tokenHash };
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
}

export async function deleteUserSessions(userId: number, exceptHash?: string): Promise<void> {
  if (exceptHash) {
    await execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, exceptHash]);
    return;
  }
  await execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

export async function cleanupExpiredSessions(): Promise<void> {
  await execute("DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()");
}
