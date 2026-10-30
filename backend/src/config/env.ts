import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const boolFromString = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return defaultValue;
      if (typeof value === "boolean") return value;
      return value.toLowerCase() === "true" || value === "1";
    });

const numberFromString = (defaultValue: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return defaultValue;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    });

const nodeEnv = process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "test" ? "test" : "development";
const isProductionEnv = nodeEnv === "production";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numberFromString(5000),

  // Local defaults in development, hosted defaults in production. Explicit
  // FRONTEND_URL / API_PUBLIC_URL environment variables always take priority.
  FRONTEND_URL: z.string().default(isProductionEnv ? "https://isokolink-rwanda.vercel.app" : "http://localhost:5173"),
  API_PUBLIC_URL: z.string().default(isProductionEnv ? "https://isokolink-rwanda.onrender.com" : "http://localhost:5000"),

  // Database credentials from .env
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: numberFromString(24787),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),

  DB_CONNECTION_LIMIT: numberFromString(10),

  SESSION_SECRET: z.string().optional(),
  SESSION_TTL_HOURS: numberFromString(168),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: boolFromString(false),

  EMAIL_VERIFICATION_TTL_MINUTES: numberFromString(1440),
  EMAIL_VERIFICATION_OTP_TTL_MINUTES: numberFromString(10),
  PASSWORD_RESET_TTL_MINUTES: numberFromString(30),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_BYTES: numberFromString(5 * 1024 * 1024),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: numberFromString(587),
  SMTP_SECURE: boolFromString(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});
const parsed = baseSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";

let sessionSecret = raw.SESSION_SECRET;
if (isProduction) {
  if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.includes("replace_with")) {
    throw new Error("SESSION_SECRET must be set to a strong 32+ character value in production.");
  }
} else if (!sessionSecret) {
  sessionSecret = "dev-only-insecure-session-secret-change-me-please";
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isTest: raw.NODE_ENV === "test",
  port: raw.PORT,
  frontendUrl: raw.FRONTEND_URL.trim().replace(/\/$/, ""),
  apiPublicUrl: raw.API_PUBLIC_URL.trim().replace(/\/$/, ""),
  db: {
    host: raw.DB_HOST,
    port: raw.DB_PORT,
    name: raw.DB_NAME,
    user: raw.DB_USER,
    password: raw.DB_PASSWORD,
    connectionLimit: raw.DB_CONNECTION_LIMIT,
  },
  sessionSecret,
  sessionTtlHours: raw.SESSION_TTL_HOURS,
  cookieDomain: raw.COOKIE_DOMAIN || undefined,
  cookieSecure: isProduction ? true : raw.COOKIE_SECURE,
  emailVerificationTtlMinutes: raw.EMAIL_VERIFICATION_TTL_MINUTES,
  emailVerificationOtpTtlMinutes: raw.EMAIL_VERIFICATION_OTP_TTL_MINUTES,
  passwordResetTtlMinutes: raw.PASSWORD_RESET_TTL_MINUTES,
  uploadDir: path.resolve(process.cwd(), raw.UPLOAD_DIR),
  maxUploadBytes: raw.MAX_UPLOAD_BYTES,
  smtp: {
    host: raw.SMTP_HOST || "",
    port: raw.SMTP_PORT,
    secure: raw.SMTP_SECURE,
    user: raw.SMTP_USER || "",
    password: raw.SMTP_PASSWORD || "",
    from: raw.SMTP_FROM || raw.EMAIL_FROM || "",
  },
  sessionCookieName: "isokolink_sid",
};
