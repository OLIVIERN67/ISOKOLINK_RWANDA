import { useEffect, useState } from "react";
import { referenceApi } from "../services/api";
import type { Category, LocationsResponse, Unit } from "../types";

export interface ReferenceData {
  categories: Category[];
  locations: LocationsResponse;
  units: Unit[];
}

let cached: ReferenceData | null = null;
let pending: Promise<ReferenceData> | null = null;

function load(): Promise<ReferenceData> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = Promise.all([referenceApi.categories(), referenceApi.locations(), referenceApi.units()])
      .then(([categories, locations, units]) => {
        cached = { categories, locations, units };
        return cached;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load categories and locations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    categories: data?.categories ?? [],
    locations: data?.locations ?? { provinces: [], districts: [], total: 0 },
    units: data?.units ?? [],
    loading,
    error,
  };
}
