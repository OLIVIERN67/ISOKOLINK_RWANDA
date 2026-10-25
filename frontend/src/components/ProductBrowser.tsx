import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { getApiError, productApi } from "../services/api";
import type { PaginationMeta, Product } from "../types";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useReferenceData } from "../hooks/useReferenceData";
import { cn } from "../utils/cn";
import { ProductCard, ProductGridSkeleton } from "./ProductCard";
import { EmptyState, ErrorState } from "./ui/States";
import { Pagination } from "./ui/Pagination";

const sortOptions = [
  { value: "featured", label: "Recommended" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function ProductBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, locations } = useReferenceData();

  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const locationId = searchParams.get("locationId") ?? "";
  const sort = searchParams.get("sort") ?? "featured";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  const [searchInput, setSearchInput] = useState(q);
  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const firstRun = useRef(true);

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (!value) next.delete(key);
          else next.set(key, value);
        });
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (debouncedSearch === q) return;
    updateParams({ q: debouncedSearch || null });
  }, [debouncedSearch, q]);

  const requestKey = useMemo(
    () => [q, categoryId, locationId, sort, minPrice, maxPrice, page, reloadKey].join("|"),
    [q, categoryId, locationId, sort, minPrice, maxPrice, page, reloadKey],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    productApi
      .list({
        q: q || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort: sort as "featured" | "newest" | "price_asc" | "price_desc",
        page,
        pageSize: 12,
      })
      .then((result) => {
        if (!active) return;
        setProducts(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestKey]);

  const activeFilterCount = [searchInput, categoryId, locationId, minPrice, maxPrice].filter(Boolean).length;

  function clearAll() {
    setSearchInput("");
    setPriceMin("");
    setPriceMax("");
    setSearchParams({}, { replace: true });
  }

  function applyPrice(event: React.FormEvent) {
    event.preventDefault();
    updateParams({ minPrice: priceMin || null, maxPrice: priceMax || null });
  }

  return (
    <div>
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search rice, beans, tomatoes, avocados…"
              className="input pl-10"
              aria-label="Search products"
            />
            {searchInput ? (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-charcoal"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              className="select sm:w-44"
              value={categoryId}
              onChange={(event) => updateParams({ categoryId: event.target.value || null })}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="sort-filter">Sort</label>
            <select
              id="sort-filter"
              className="select sm:w-44"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value === "featured" ? null : event.target.value })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              className={cn("btn-outline shrink-0", showFilters && "border-forest-400 bg-forest-50")}
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 rounded-full bg-forest-600 px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => updateParams({ categoryId: null })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              !categoryId ? "border-forest-600 bg-forest-600 text-white" : "border-gray-200 bg-white text-charcoal/70 hover:border-forest-300",
            )}
          >
            All
          </button>
          {categories.slice(0, 10).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => updateParams({ categoryId: String(category.id) })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                categoryId === String(category.id)
                  ? "border-forest-600 bg-forest-600 text-white"
                  : "border-gray-200 bg-white text-charcoal/70 hover:border-forest-300",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {showFilters ? (
          <div className="mt-4 grid gap-4 rounded-xl bg-cream/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="district-filter">District</label>
              <select
                id="district-filter"
                className="select"
                value={locationId}
                onChange={(event) => updateParams({ locationId: event.target.value || null })}
              >
                <option value="">All districts</option>
                {locations.districts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            </div>
            <form onSubmit={applyPrice} className="sm:col-span-2">
              <span className="label">Price range (RWF)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                  aria-label="Minimum price"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                  aria-label="Maximum price"
                />
                <button type="submit" className="btn-outline shrink-0">Apply</button>
              </div>
            </form>
            <div className="flex items-end">
              <button type="button" className="btn-ghost text-error" onClick={clearAll}>
                <X className="h-4 w-4" aria-hidden />
                Clear all filters
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-charcoal/55">
          {loading ? "Searching the marketplace…" : `${meta?.total ?? products.length} product${(meta?.total ?? products.length) === 1 ? "" : "s"} found`}
        </p>
        {activeFilterCount > 0 ? (
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        {loading ? (
          <ProductGridSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products match your search"
            description="Try a different keyword, category, or district. New listings are added regularly."
            action={
              <button type="button" className="btn-primary" onClick={clearAll}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {meta ? (
        <Pagination
          className="mt-8"
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onChange={(next) => updateParams({ page: String(next) }, false)}
        />
      ) : null}
    </div>
  );
}
