import { env } from "./env";

const ALWAYS_ALLOWED = [
  "https://isokolink-rwanda.vercel.app",
  "https://isokolink-rwanda.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function toOrigin(url: string): string[] {
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

export const allowedOrigins = new Set(
  [...ALWAYS_ALLOWED, env.frontendUrl, env.apiPublicUrl].flatMap(toOrigin),
);
