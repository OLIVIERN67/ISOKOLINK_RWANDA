export interface UnitInfo {
  id: number;
  code: string;
  label: string;
  dimension: string;
  factor_to_base: string | number;
}

const NORMALIZABLE_DIMENSIONS = new Set(["weight", "volume", "count"]);

/**
 * Returns the price converted to the base unit (kg, litre or piece) when the
 * two units are safely comparable. Returns null when comparison would be
 * misleading (for example a bunch vs a kilogram, or a bag vs a piece).
 */
export function normalizePricePerBase(price: number, unit: UnitInfo): number | null {
  if (!Number.isFinite(price) || price < 0) return null;
  if (!NORMALIZABLE_DIMENSIONS.has(unit.dimension)) return null;
  const factor = Number(unit.factor_to_base);
  if (!Number.isFinite(factor) || factor <= 0) return null;
  return price / factor;
}

export function areUnitsComparable(a: UnitInfo, b: UnitInfo): boolean {
  if (a.id === b.id) return true;
  if (!NORMALIZABLE_DIMENSIONS.has(a.dimension)) return false;
  return a.dimension === b.dimension;
}

export function baseUnitLabel(dimension: string): string {
  switch (dimension) {
    case "weight":
      return "kg";
    case "volume":
      return "litre";
    case "count":
      return "piece";
    default:
      return "unit";
  }
}
