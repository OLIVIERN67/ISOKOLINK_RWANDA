export const PRODUCTION_API_ORIGIN = "https://isokolink-rwanda.onrender.com";

function normalize(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function pointsAtCurrentOrigin(origin: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URL(origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(value: string | undefined): string {
  const configured = normalize(value);
  const usable = /^https?:\/\//i.test(configured) && !pointsAtCurrentOrigin(configured);

  if (!usable) {
    return import.meta.env.PROD ? `${PRODUCTION_API_ORIGIN}/api` : "/api";
  }

  return configured.endsWith("/api") ? configured : `${configured}/api`;
}

export function resolveApiOrigin(value: string | undefined): string {
  const base = resolveApiBaseUrl(value);
  const match = /^(https?:\/\/[^/]+)/i.exec(base);
  return match ? match[1] : "";
}

export function resolveAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const path = value.startsWith("/") ? value : `/uploads/${value}`;
  const origin = resolveApiOrigin(import.meta.env.VITE_API_URL);
  return origin ? `${origin}${path}` : path;
}
