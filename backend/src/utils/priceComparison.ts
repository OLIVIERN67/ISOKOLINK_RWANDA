export interface ComparisonObservation {
  productName: string;
  price: number;
  unit: { code: string; dimension: string };
  isStale: boolean;
  isVerified: boolean;
  normalizedPrice: { value: number; per: string } | null;
}

export interface PriceComparisonSummary {
  productName: string;
  dimension: string;
  unitCode: string;
  sampleCount: number;
  verifiedFreshCount: number;
  staleCount: number;
  unverifiedCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  averagePrice: number | null;
  normalizedMin: number | null;
  normalizedMax: number | null;
  normalizedUnit: string | null;
  insufficientData: boolean;
}

interface MutableSummary extends PriceComparisonSummary {
  verifiedFreshPriceTotal: number;
}

/** Summarize only verified, fresh observations while retaining quality counts for all samples. */
export function buildPriceComparisonSummary(observations: ComparisonObservation[]): PriceComparisonSummary[] {
  const groups = new Map<string, MutableSummary>();

  for (const observation of observations) {
    const { dimension, code } = observation.unit;
    const key = `${observation.productName.toLowerCase()}|${dimension}|${code}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        productName: observation.productName,
        dimension,
        unitCode: code,
        sampleCount: 0,
        verifiedFreshCount: 0,
        staleCount: 0,
        unverifiedCount: 0,
        minPrice: null,
        maxPrice: null,
        averagePrice: null,
        normalizedMin: null,
        normalizedMax: null,
        normalizedUnit: null,
        insufficientData: true,
        verifiedFreshPriceTotal: 0,
      };
      groups.set(key, group);
    }

    group.sampleCount += 1;
    if (observation.isStale) group.staleCount += 1;
    if (!observation.isVerified) group.unverifiedCount += 1;

    if (observation.isVerified && !observation.isStale) {
      group.verifiedFreshCount += 1;
      group.verifiedFreshPriceTotal += observation.price;
      group.minPrice = group.minPrice === null ? observation.price : Math.min(group.minPrice, observation.price);
      group.maxPrice = group.maxPrice === null ? observation.price : Math.max(group.maxPrice, observation.price);

      if (observation.normalizedPrice) {
        const { value, per } = observation.normalizedPrice;
        group.normalizedMin = group.normalizedMin === null ? value : Math.min(group.normalizedMin, value);
        group.normalizedMax = group.normalizedMax === null ? value : Math.max(group.normalizedMax, value);
        group.normalizedUnit = per;
      }
    }
  }

  return Array.from(groups.values(), ({ verifiedFreshPriceTotal, ...group }) => {
    if (group.verifiedFreshCount > 0) {
      group.averagePrice = Number((verifiedFreshPriceTotal / group.verifiedFreshCount).toFixed(2));
    }
    group.insufficientData = group.verifiedFreshCount === 0;
    return group;
  });
}
