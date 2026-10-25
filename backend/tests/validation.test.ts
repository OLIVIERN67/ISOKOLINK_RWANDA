import { describe, expect, it } from "vitest";
import { freshnessFor, daysSince, STALE_AFTER_DAYS, AGING_AFTER_DAYS } from "../src/utils/freshness";
import { normalizePricePerBase, areUnitsComparable, baseUnitLabel, type UnitInfo } from "../src/utils/units";
import { getPagination, paginationMeta } from "../src/utils/pagination";
import { slugify } from "../src/utils/slug";
import { sha256, safeEqual, randomToken } from "../src/utils/crypto";
import { passwordSchema, emailSchema, registerSchema } from "../src/modules/auth/auth.schemas";
import { productCreateSchema } from "../src/modules/products/products.schemas";
import { reportUpdateSchema } from "../src/modules/reports/reports.schemas";
import { buildPriceComparisonSummary } from "../src/utils/priceComparison";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

describe("freshness", () => {
  it("treats today and yesterday as fresh", () => {
    expect(freshnessFor(isoDaysAgo(0)).freshness).toBe("fresh");
    expect(freshnessFor(isoDaysAgo(1)).freshness).toBe("fresh");
  });

  it("marks observations aging before they become stale", () => {
    expect(freshnessFor(isoDaysAgo(AGING_AFTER_DAYS)).freshness).toBe("aging");
    expect(freshnessFor(isoDaysAgo(STALE_AFTER_DAYS - 1)).isStale).toBe(false);
    expect(freshnessFor(isoDaysAgo(STALE_AFTER_DAYS)).isStale).toBe(true);
  });

  it("never returns a negative age for future dates", () => {
    expect(daysSince(isoDaysAgo(-3))).toBe(0);
  });

  it("is robust against malformed input", () => {
    expect(daysSince("not-a-date")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("unit normalization", () => {
  const kg: UnitInfo = { id: 1, code: "kg", label: "Kilogram", dimension: "weight", factor_to_base: 1 };
  const g: UnitInfo = { id: 2, code: "g", label: "Gram", dimension: "weight", factor_to_base: 0.001 };
  const bag: UnitInfo = { id: 3, code: "bag", label: "Bag", dimension: "bag", factor_to_base: 50 };
  const piece: UnitInfo = { id: 4, code: "pc", label: "Piece", dimension: "count", factor_to_base: 1 };

  it("normalizes mass units to kilograms", () => {
    expect(normalizePricePerBase(2, g)).toBe(2000);
    expect(normalizePricePerBase(500, kg)).toBe(500);
  });

  it("refuses unsafe comparisons across dimensions", () => {
    expect(normalizePricePerBase(1000, bag)).toBeNull();
    expect(areUnitsComparable(kg, bag)).toBe(false);
    expect(areUnitsComparable(g, kg)).toBe(true);
    expect(areUnitsComparable(piece, piece)).toBe(true);
  });

  it("rejects invalid prices and factors", () => {
    expect(normalizePricePerBase(-1, kg)).toBeNull();
    expect(normalizePricePerBase(Number.NaN, kg)).toBeNull();
    expect(normalizePricePerBase(100, { ...kg, factor_to_base: 0 })).toBeNull();
  });

  it("labels base units", () => {
    expect(baseUnitLabel("weight")).toBe("kg");
    expect(baseUnitLabel("volume")).toBe("litre");
    expect(baseUnitLabel("count")).toBe("piece");
    expect(baseUnitLabel("unknown")).toBe("unit");
  });
});

describe("price comparison summaries", () => {
  it("calculates the mean from verified fresh observations, not the range midpoint", () => {
    const summary = buildPriceComparisonSummary([
      { productName: "Tomatoes", price: 10, unit: { code: "kg", dimension: "weight" }, isStale: false, isVerified: true, normalizedPrice: { value: 10, per: "kg" } },
      { productName: "Tomatoes", price: 20, unit: { code: "kg", dimension: "weight" }, isStale: false, isVerified: true, normalizedPrice: { value: 20, per: "kg" } },
      { productName: "Tomatoes", price: 90, unit: { code: "kg", dimension: "weight" }, isStale: false, isVerified: true, normalizedPrice: { value: 90, per: "kg" } },
      { productName: "Tomatoes", price: 1000, unit: { code: "kg", dimension: "weight" }, isStale: true, isVerified: true, normalizedPrice: { value: 1000, per: "kg" } },
      { productName: "Tomatoes", price: 1, unit: { code: "kg", dimension: "weight" }, isStale: false, isVerified: false, normalizedPrice: { value: 1, per: "kg" } },
    ]);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      sampleCount: 5,
      verifiedFreshCount: 3,
      staleCount: 1,
      unverifiedCount: 1,
      minPrice: 10,
      maxPrice: 90,
      averagePrice: 40,
      normalizedMin: 10,
      normalizedMax: 90,
      insufficientData: false,
    });
  });
});

describe("pagination", () => {
  it("applies defaults and clamps values", () => {
    expect(getPagination({})).toEqual({ page: 1, pageSize: 12, offset: 0 });
    expect(getPagination({ page: "3", pageSize: "10" })).toEqual({ page: 3, pageSize: 10, offset: 20 });
    expect(getPagination({ page: "-2", pageSize: "999" }, 12, 60)).toEqual({ page: 1, pageSize: 60, offset: 0 });
  });

  it("reports at least one page", () => {
    expect(paginationMeta(0, { page: 1, pageSize: 20, offset: 0 }).totalPages).toBe(1);
    expect(paginationMeta(41, { page: 2, pageSize: 20, offset: 20 }).totalPages).toBe(3);
  });
});

describe("slug and crypto helpers", () => {
  it("slugifies accented names", () => {
    expect(slugify("Café de Kigali")).toBe("cafe-de-kigali");
    expect(slugify("  Fresh   Tomatoes!! ")).toBe("fresh-tomatoes");
  });

  it("hashes deterministically and compares safely", () => {
    expect(sha256("secret")).toHaveLength(64);
    expect(sha256("secret")).toBe(sha256("secret"));
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(randomToken(16).length).toBeGreaterThanOrEqual(16);
  });
});

describe("auth validation", () => {
  it("accepts strong passwords only", () => {
    expect(passwordSchema.safeParse("Str0ngPass").success).toBe(true);
    expect(passwordSchema.safeParse("weakpass").success).toBe(false);
    expect(passwordSchema.safeParse("Short1").success).toBe(false);
  });

  it("normalizes valid emails", () => {
    expect(emailSchema.parse("  Buyer@Example.COM ")).toBe("buyer@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("requires explicit terms acceptance", () => {
    const base = {
      fullName: "Test Buyer",
      email: "buyer@example.com",
      password: "Password123",
    };
    expect(registerSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
  });
});

describe("product validation", () => {
  const valid = {
    name: "Fresh tomatoes",
    description: "Ripe tomatoes harvested this morning from Nyagatare.",
    categoryId: 1,
    unitId: 1,
    price: 1200,
    quantity: 40,
    locationId: 1,
    images: ["/uploads/abc123.jpg", "https://example.com/tomato.jpg"],
  };

  it("accepts a complete listing", () => {
    expect(productCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short descriptions and unsafe image URLs", () => {
    expect(productCreateSchema.safeParse({ ...valid, description: "Too short" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...valid, images: ["javascript:alert(1)"] }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...valid, images: ["/etc/passwd"] }).success).toBe(false);
  });

  it("caps images at five", () => {
    const images = Array.from({ length: 6 }, (_, index) => `/uploads/file-${index}.jpg`);
    expect(productCreateSchema.safeParse({ ...valid, images }).success).toBe(false);
  });
});

describe("report moderation validation", () => {
  it("allows starting a review without a note", () => {
    expect(reportUpdateSchema.safeParse({ status: "under_review" }).success).toBe(true);
  });

  it("requires a note to resolve or dismiss", () => {
    expect(reportUpdateSchema.safeParse({ status: "resolved" }).success).toBe(false);
    expect(reportUpdateSchema.safeParse({ status: "resolved", resolutionNote: "ok" }).success).toBe(false);
    expect(reportUpdateSchema.safeParse({ status: "dismissed", resolutionNote: "No evidence found" }).success).toBe(true);
  });
});
