const rwfFormatter = new Intl.NumberFormat("en-RW", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-RW", {
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string | null | undefined, currency = "RWF"): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `0 ${currency}`;
  return `${rwfFormatter.format(amount)} ${currency}`;
}

export function formatAmount(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0";
  return decimalFormatter.format(amount);
}

export function formatPricePerUnit(price: number, unitLabel: string, currency = "RWF"): string {
  return `${formatCurrency(price, currency)} / ${unitLabel}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return rwfFormatter.format(Number(value ?? 0));
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined, fallback = "—"): string {
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined, fallback = "—"): string {
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleString("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function formatDayLabel(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

export const APPROVAL_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  requires_correction: "Needs correction",
  suspended: "Suspended",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  unavailable: "Unavailable",
  sold: "Sold out",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function approvalTone(status: string): "green" | "gold" | "red" | "gray" {
  if (status === "approved") return "green";
  if (status === "pending" || status === "requires_correction") return "gold";
  if (status === "rejected" || status === "suspended") return "red";
  return "gray";
}

export function freshnessTone(freshness: string): "green" | "gold" | "red" {
  if (freshness === "fresh") return "green";
  if (freshness === "aging") return "gold";
  return "red";
}

export const RWANDA_PROVINCES = ["Kigali City", "Northern", "Southern", "Eastern", "Western"] as const;
