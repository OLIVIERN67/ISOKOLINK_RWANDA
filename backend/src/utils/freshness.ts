export const STALE_AFTER_DAYS = 14;
export const AGING_AFTER_DAYS = 7;

export type Freshness = "fresh" | "aging" | "stale";

export function daysSince(dateString: string): number {
  const observed = new Date(`${dateString.slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(observed)) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((todayUtc - observed) / (24 * 60 * 60 * 1000)));
}

export function freshnessFor(dateString: string): { freshness: Freshness; daysOld: number; isStale: boolean } {
  const daysOld = daysSince(dateString);
  const freshness: Freshness =
    daysOld >= STALE_AFTER_DAYS ? "stale" : daysOld >= AGING_AFTER_DAYS ? "aging" : "fresh";
  return { freshness, daysOld, isStale: freshness === "stale" };
}
