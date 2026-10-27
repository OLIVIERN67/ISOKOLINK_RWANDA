import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
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
const VERIFICATION_RESEND_COOLDOWN_MINUTES = 5;
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
  await withTransaction(async (connection) => {
    await connection.execute("DELETE FROM auth_tokens WHERE user_id = ? AND type = ? AND used_at IS NULL", [userId, type]);
    await connection.execute(
      "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [userId, type, sha256(token), expires],
    );
  });
  return token;
}

async function issueVerificationOtp(userId: number): Promise<string> {
  const otp = String(randomInt(100000, 1000000));
  const expires = new Date(Date.now() + env.emailVerificationOtpTtlMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await withTransaction(async (connection) => {
    await connection.execute(
      "DELETE FROM auth_tokens WHERE user_id = ? AND type = 'email_verification' AND used_at IS NULL",
      [userId],
    );
    await connection.execute(
      "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, 'email_verification', ?, ?)",
      [userId, sha256(otp), expires],
    );
  });
  return otp;
}

export interface RegisterResult {
  userId: number;
  emailDelivered: boolean;
}

export async function registerUser(input: RegisterInput, ip?: string): Promise<RegisterResult> {
  const existing = await queryOne<RowDataPacket>("SELECT id FROM users WHERE email = ?", [input.email]);
  if (existing) {
    throw ApiError.conflict("An account with this email address already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const buyerRole = await queryOne<RowDataPacket>("SELECT id FROM roles WHERE name = 'buyer'");
  const sellerRole = await queryOne<RowDataPacket>("SELECT id FROM roles WHERE name = 'seller'");
  if (!buyerRole || !sellerRole) throw ApiError.internal("Account roles are not configured. Run the database seed.");

  const userId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, full_name, phone, preferred_language, active_mode)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.email, passwordHash, input.fullName, input.phone || null, input.preferredLanguage, input.accountType],
    );
    const insertId = (result as { insertId: number }).insertId;
    await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [
      insertId,
      buyerRole.id,
    ]);
    if (input.accountType === "seller") {
      await connection.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [
        insertId,
        sellerRole.id,
      ]);
      await connection.execute(
        `INSERT INTO seller_profiles
          (user_id, business_name, description, contact_phone, contact_email)
         VALUES (?, ?, ?, ?, ?)`,
        [
          insertId,
          input.fullName,
          "Seller profile created during registration. Complete your business details to publish products.",
          input.phone || null,
          input.email,
        ],
      );
    }
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, 'account', ?, ?, '/dashboard/profile')`,
      [insertId, "Welcome to ISOKOLINK RWANDA", "Complete your profile and start exploring food products."],
    );
    return insertId;
  });

  const mail = await sendVerificationEmail(input.email, userId);

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
  if (!user.is_email_verified) {
    throw ApiError.forbidden("Please verify your email address before signing in.");
  }

  return Number(user.id);
}

export async function markLogin(userId: number): Promise<void> {
  await execute("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [userId]);
}

export async function verifyEmailToken(token: string, ip?: string): Promise<number> {
  let userId = 0;
  await withTransaction(async (connection) => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, user_id FROM auth_tokens
       WHERE token_hash = ? AND type = 'email_verification' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
       FOR UPDATE`,
      [sha256(token)],
    );
    const record = rows[0];
    if (!record) throw ApiError.badRequest("This verification link is invalid or has expired.");
    userId = Number(record.user_id);
    await connection.execute("UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET is_email_verified = 1, email_verified_at = UTC_TIMESTAMP() WHERE id = ?", [userId]);
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

export async function verifyEmailOtp(email: string, otp: string, ip?: string): Promise<number> {
  let userId = 0;
  await withTransaction(async (connection) => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT t.id, t.user_id
       FROM auth_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE u.email = ? AND t.token_hash = ? AND t.type = 'email_verification'
         AND t.used_at IS NULL AND t.expires_at > UTC_TIMESTAMP()
       FOR UPDATE`,
      [email, sha256(otp)],
    );
    const record = rows[0];
    if (!record) throw ApiError.badRequest("That verification code is invalid or has expired.");
    userId = Number(record.user_id);
    await connection.execute("UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET is_email_verified = 1, email_verified_at = UTC_TIMESTAMP() WHERE id = ?", [userId]);
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

export async function createVerificationTokenFor(userId: number): Promise<void> {
  const user = await queryOne<RowDataPacket>("SELECT email, is_email_verified FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("Account not found.");
  if (user.is_email_verified) throw ApiError.conflict("Your email address is already verified.");
  const latest = await queryOne<RowDataPacket>(
    "SELECT created_at FROM auth_tokens WHERE user_id = ? AND type = 'email_verification' ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  if (latest && Date.now() - new Date(String(latest.created_at).replace(" ", "T") + "Z").getTime() < VERIFICATION_RESEND_COOLDOWN_MINUTES * 60 * 1000) {
    throw ApiError.tooManyRequests("Please wait a few minutes before requesting another verification email.");
  }
  await sendVerificationEmail(String(user.email), userId);
}

async function sendVerificationEmail(email: string, userId: number): Promise<{ delivered: boolean }> {
  const otp = await issueVerificationOtp(userId);
  const mail = await sendMail({
    to: email,
    subject: "Verify your ISOKOLINK RWANDA account",
    text: `Welcome to ISOKOLINK RWANDA.\n\nYour email verification code is: ${otp}\n\nThis code expires in ${env.emailVerificationOtpTtlMinutes} minutes. If you did not create this account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18352a"><h2>Welcome to ISOKOLINK RWANDA</h2><p>Enter this verification code to confirm your email address:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#176b4d">${otp}</p><p>This code expires in ${env.emailVerificationOtpTtlMinutes} minutes. If you did not create this account, you can ignore this email.</p></div>`,
  });
  if (!mail.delivered) {
    await execute(
      "DELETE FROM auth_tokens WHERE user_id = ? AND type = 'email_verification' AND used_at IS NULL",
      [userId],
    );
    throw ApiError.unavailable("We could not send the verification email. Please try again later.");
  }
  return { delivered: true };
}

export async function resendVerificationByEmail(email: string): Promise<void> {
  const user = await queryOne<RowDataPacket>(
    "SELECT id, email, is_email_verified FROM users WHERE email = ? AND status = 'active'",
    [email],
  );
  if (!user || user.is_email_verified) return;
  try {
    await createVerificationTokenFor(Number(user.id));
  } catch (error) {
    if (error instanceof ApiError && error.code === "RATE_LIMITED") throw error;
    console.error("[auth] verification email delivery failed.");
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await queryOne<RowDataPacket>(
    "SELECT id, email FROM users WHERE email = ? AND status = 'active'",
    [email],
  );
  if (!user) return;

  const token = await issueToken(Number(user.id), "password_reset", env.passwordResetTtlMinutes);
  const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: String(user.email),
    subject: "Reset your ISOKOLINK RWANDA password",
    text: `Reset your password using this link:\n${resetUrl}\nThis link expires in ${env.passwordResetTtlMinutes} minutes. If you did not request a reset, ignore this email.`,
    html: `<p><a href="${resetUrl}">Reset your password</a>. This link expires in ${env.passwordResetTtlMinutes} minutes. If you did not request this, you can ignore the email.</p>`,
  });
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
