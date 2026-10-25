import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { execute, queryOne, withTransaction } from "../../db/pool";
import { createNotification } from "../../services/notification.service";
import { writeAuditLog } from "../../utils/audit";
import { randomToken, sha256 } from "../../utils/crypto";
import { ApiError } from "../../utils/errors";
import { sendMail } from "../../utils/mailer";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7S5Qp4fqvk9z8Ht1m3g0m6xYhB8sY1K";

interface UserWithPassword extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  status: "active" | "suspended" | "deactivated";
  is_email_verified: number;
}

async function issueToken(
  userId: number,
  type: "email_verification" | "password_reset",
  ttlMinutes: number,
): Promise<string> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  await execute("DELETE FROM auth_tokens WHERE user_id = ? AND type = ? AND used_at IS NULL", [userId, type]);
  await execute(
    "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [userId, type, sha256(token), expires],
  );
  return token;
}

export interface RegisterResult {
  userId: number;
  devVerificationToken?: string;
  emailDelivered: boolean;
}

export async function registerUser(input: RegisterInput, ip?: string): Promise<RegisterResult> {
  const existing = await queryOne<RowDataPacket>("SELECT id FROM users WHERE email = ?", [input.email]);
  if (existing) {
    throw ApiError.conflict("An account with this email address already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const buyerRole = await queryOne<RowDataPacket>("SELECT id FROM roles WHERE name = 'buyer'");
  if (!buyerRole) throw ApiError.internal("Buyer role is not configured. Run the database seed.");

  const userId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, full_name, phone, preferred_language)
       VALUES (?, ?, ?, ?, ?)`,
      [input.email, passwordHash, input.fullName, input.phone || null, input.preferredLanguage],
    );
    const insertId = (result as { insertId: number }).insertId;
    await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [
      insertId,
      buyerRole.id,
    ]);
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, 'account', ?, ?, '/dashboard/profile')`,
      [insertId, "Welcome to ISOKOLINK RWANDA", "Complete your profile and start exploring food products."],
    );
    return insertId;
  });

  const token = await issueToken(userId, "email_verification", env.emailVerificationTtlMinutes);
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const mail = await sendMail({
    to: input.email,
    subject: "Verify your ISOKOLINK RWANDA account",
    text: `Welcome to ISOKOLINK RWANDA.\n\nVerify your email address by opening this link:\n${verifyUrl}\n\nThis link expires in ${env.emailVerificationTtlMinutes} minutes.`,
    html: `<p>Welcome to <strong>ISOKOLINK RWANDA</strong>.</p><p><a href="${verifyUrl}">Verify your email address</a>. This link expires in ${env.emailVerificationTtlMinutes} minutes.</p>`,
  });

  await writeAuditLog({
    actorId: userId,
    action: "user.registered",
    entityType: "user",
    entityId: userId,
    ipAddress: ip,
  });

  return {
    userId,
    emailDelivered: mail.delivered,
    ...(env.exposeDevTokens ? { devVerificationToken: token } : {}),
  };
}

export async function authenticate(input: LoginInput): Promise<number> {
  const user = await queryOne<UserWithPassword>(
    "SELECT id, email, password_hash, status, is_email_verified FROM users WHERE email = ?",
    [input.email],
  );

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const matches = await bcrypt.compare(input.password, user.password_hash);
  if (!matches) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  if (user.status === "suspended") {
    throw ApiError.forbidden("This account is suspended. Please contact support.");
  }
  if (user.status === "deactivated") {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  return Number(user.id);
}

export async function markLogin(userId: number): Promise<void> {
  await execute("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [userId]);
}

export async function verifyEmailToken(token: string, ip?: string): Promise<number> {
  const record = await queryOne<RowDataPacket>(
    `SELECT id, user_id FROM auth_tokens
     WHERE token_hash = ? AND type = 'email_verification' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()`,
    [sha256(token)],
  );
  if (!record) {
    throw ApiError.badRequest("This verification link is invalid or has expired.");
  }
  const userId = Number(record.user_id);
  await withTransaction(async (connection) => {
    await connection.execute("UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?", [record.id]);
    await connection.execute("UPDATE users SET is_email_verified = 1 WHERE id = ?", [userId]);
  });
  await writeAuditLog({
    actorId: userId,
    action: "user.email_verified",
    entityType: "user",
    entityId: userId,
    ipAddress: ip,
  });
  return userId;
}

export async function createVerificationTokenFor(userId: number): Promise<string> {
  const user = await queryOne<RowDataPacket>("SELECT email, is_email_verified FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("Account not found.");
  if (user.is_email_verified) throw ApiError.conflict("Your email address is already verified.");
  const token = await issueToken(userId, "email_verification", env.emailVerificationTtlMinutes);
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: String(user.email),
    subject: "Verify your ISOKOLINK RWANDA account",
    text: `Verify your email address: ${verifyUrl}\nThis link expires in ${env.emailVerificationTtlMinutes} minutes.`,
    html: `<p><a href="${verifyUrl}">Verify your email address</a>. This link expires in ${env.emailVerificationTtlMinutes} minutes.</p>`,
  });
  return token;
}

export async function requestPasswordReset(email: string): Promise<string | undefined> {
  const user = await queryOne<RowDataPacket>(
    "SELECT id, email FROM users WHERE email = ? AND status = 'active'",
    [email],
  );
  if (!user) return undefined;

  const token = await issueToken(Number(user.id), "password_reset", env.passwordResetTtlMinutes);
  const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: String(user.email),
    subject: "Reset your ISOKOLINK RWANDA password",
    text: `Reset your password using this link:\n${resetUrl}\nThis link expires in ${env.passwordResetTtlMinutes} minutes. If you did not request a reset, ignore this email.`,
    html: `<p><a href="${resetUrl}">Reset your password</a>. This link expires in ${env.passwordResetTtlMinutes} minutes. If you did not request this, you can ignore the email.</p>`,
  });
  return env.exposeDevTokens ? token : undefined;
}

export async function resetPassword(token: string, password: string, ip?: string): Promise<void> {
  const record = await queryOne<RowDataPacket>(
    `SELECT id, user_id FROM auth_tokens
     WHERE token_hash = ? AND type = 'password_reset' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()`,
    [sha256(token)],
  );
  if (!record) {
    throw ApiError.badRequest("This password reset link is invalid or has expired.");
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = Number(record.user_id);
  await withTransaction(async (connection) => {
    await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
    await connection.execute("UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?", [record.id]);
    await connection.execute(
      "UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND type = 'password_reset' AND used_at IS NULL",
      [userId],
    );
    await connection.execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'security', 'Password changed', 'Your password was reset. If this was not you, contact support immediately.')`,
      [userId],
    );
  });
  await writeAuditLog({
    actorId: userId,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
    ipAddress: ip,
  });
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  sessionHash?: string,
): Promise<void> {
  const user = await queryOne<RowDataPacket>("SELECT password_hash FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("Account not found.");
  const matches = await bcrypt.compare(currentPassword, String(user.password_hash));
  if (!matches) throw ApiError.badRequest("Your current password is incorrect.");
  if (currentPassword === newPassword) {
    throw ApiError.badRequest("Choose a password that is different from your current password.");
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
  await execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, sessionHash ?? ""]);
  await createNotification({
    userId,
    type: "security",
    title: "Password changed",
    body: "Your password was changed. Other sessions have been signed out.",
  });
}
