import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BarChart3, Info, Search, TrendingUp } from "lucide-react";
import { getApiError, priceApi } from "../services/api";
import type { MarketObservation, PaginationMeta, PriceComparison } from "../types";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDocumentTitle } from "../components/ScrollToTop";
import { Badge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingBlock } from "../components/ui/States";
import { Pagination } from "../components/ui/Pagination";
import { PageHeader } from "../components/ui/PageHeader";
import {
  formatAmount,
  formatCurrency,
  formatDate,
  formatRelative,
  freshnessTone,
} from "../utils/format";

export function PricesPage() {
  useDocumentTitle("Food price comparison");
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, locations } = useReferenceData();

  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("categoryId") ?? "";
  const initialLocation = searchParams.get("locationId") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [locationId, setLocationId] = useState(initialLocation);
  const [comparison, setComparison] = useState<PriceComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [latest, setLatest] = useState<MarketObservation[]>([]);
  const [latestMeta, setLatestMeta] = useState<PaginationMeta | null>(null);
  const [latestPage, setLatestPage] = useState(1);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingLatest(true);
    setLatestError(null);
    priceApi
      .list({
        categoryId: categoryId ? Number(categoryId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        page: latestPage,
        pageSize: 10,
        sort: "newest",
      })
      .then((result) => {
        if (!active) return;
        setLatest(result.items);
        setLatestMeta(result.meta as unknown as PaginationMeta);
      })
      .catch((error) => {
        if (!active) return;
        setLatestError(getApiError(error).message);
      })
      .finally(() => {
        if (active) setLoadingLatest(false);
      });
    return () => {
      active = false;
    };
  }, [categoryId, locationId, latestPage]);

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      void runComparison(initialQuery, initialCategory, initialLocation);
    }
    // Only run for the initial URL state; subsequent searches are submitted by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runComparison(term: string, category: string, district: string) {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setCompareError("Enter at least two characters to compare prices.");
      return;
    }
    setComparing(true);
    setCompareError(null);
    try {
      const result = await priceApi.compare({
        q: trimmed,
        categoryId: category ? Number(category) : undefined,
        locationId: district ? Number(district) : undefined,
      });
      setComparison(result);
      const next = new URLSearchParams();
      next.set("q", trimmed);
      if (category) next.set("categoryId", category);
      if (district) next.set("locationId", district);
      setSearchParams(next, { replace: true });
    } catch (error) {
      const parsed = getApiError(error);
      setCompareError(parsed.message);
      setComparison(null);
    } finally {
      setComparing(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLatestPage(1);
    void runComparison(query, categoryId, locationId);
  }

  function resetComparison() {
    setComparison(null);
    setCompareError(null);
    setQuery("");
    setSearchParams({}, { replace: true });
  }

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-8">
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-charcoal/50" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-forest-700">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-charcoal">Food prices</span>
          </nav>
          <PageHeader
            eyebrow="Price intelligence"
            title="Know the price before you buy"
            subtitle="Search a food product to compare verified market observations and seller-advertised prices across Rwanda."
          />
          <form onSubmit={handleSubmit} className="card max-w-4xl p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. tomatoes, rice, beans"
                  className="input pl-10"
                  aria-label="Product name to compare"
                  minLength={2}
                />
              </div>
              <select
                className="select sm:w-40"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setLatestPage(1);
                }}
                aria-label="Category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <select
                className="select sm:w-40"
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  setLatestPage(1);
                }}
                aria-label="District"
              >
                <option value="">All districts</option>
                {locations.districts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" disabled={comparing}>
                {comparing ? "Comparing…" : "Compare"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {compareError ? <p className="mt-2 text-xs font-medium text-error">{compareError}</p> : null}
          </form>
        </div>
      </section>

      <div className="container-page py-8">
        {comparison ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Results for “{comparison.query.q}”</h2>
                <p className="mt-1 text-sm text-charcoal/55">
                  {comparison.meta.observationCount} market observation{comparison.meta.observationCount === 1 ? "" : "s"} and{" "}
                  {comparison.meta.advertisedCount} seller listing{comparison.meta.advertisedCount === 1 ? "" : "s"}.
                </p>
              </div>
              <button type="button" className="btn-ghost btn-sm" onClick={resetComparison}>
                Clear comparison
              </button>
            </div>

            {comparison.summary.length === 0 && comparison.observations.length === 0 && comparison.advertised.length === 0 ? (
              <EmptyState
                title="No price data found"
                description="Try a broader product name or remove the category and district filters."
                icon={<BarChart3 className="h-6 w-6" aria-hidden />}
              />
            ) : null}

            {comparison.summary.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {comparison.summary.map((group) => (
                  <div key={`${group.productName}-${group.dimension}`} className="card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-charcoal">{group.productName}</h3>
                        <p className="mt-0.5 text-xs text-charcoal/50">
                          {group.sampleCount} observation{group.sampleCount === 1 ? "" : "s"} · {group.unitCode}
                        </p>
                      </div>
                      <Badge tone={group.insufficientData ? "gold" : "green"}>
                        {group.insufficientData ? "Limited data" : "Comparable"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-forest-50 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-700/70">Low</p>
                        <p className="mt-1 text-sm font-bold text-forest-800">{formatCurrency(group.minPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-harvest-light/40 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-harvest-dark/80">Avg</p>
                        <p className="mt-1 text-sm font-bold text-charcoal">{formatCurrency(group.averagePrice)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700/70">High</p>
                        <p className="mt-1 text-sm font-bold text-red-800">{formatCurrency(group.maxPrice)}</p>
                      </div>
                    </div>
                    {group.normalizedMin !== null && group.normalizedUnit ? (
                      <p className="mt-3 text-[11px] text-charcoal/50">
                        Normalized range: {formatAmount(group.normalizedMin)}
                        {group.normalizedMax !== null ? ` – ${formatAmount(group.normalizedMax)}` : ""} per {group.normalizedUnit}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-charcoal/45">
                      {group.verifiedFreshCount} verified fresh · {group.staleCount} stale · {group.unverifiedCount} unverified
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <PriceTable
              observations={comparison.observations}
              emptyText="No market observations matched this search."
              title="Market observations"
            />

            <div className="card overflow-hidden">
              <div className="border-b border-gray-100 p-5">
                <h2 className="font-display text-lg font-bold">Seller-advertised prices</h2>
                <p className="mt-1 text-xs text-charcoal/50">Prices set by sellers in approved, available listings.</p>
              </div>
              {comparison.advertised.length === 0 ? (
                <p className="p-5 text-sm text-charcoal/50">No seller listings matched this search.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Seller</th>
                        <th>Location</th>
                        <th>Price</th>
                        <th>Current unit rate</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.advertised.map((item) => (
                        <tr key={`ad-${item.id}`}>
                          <td>
                            <Link to={`/products/${item.id}`} className="font-semibold text-forest-700 hover:underline">
                              {item.name}
                            </Link>
                          </td>
                          <td className="text-charcoal/70">{item.seller.businessName || item.seller.name}</td>
                          <td className="text-charcoal/70">
                            {item.market ? `${item.market.name}, ` : ""}
                            {item.location.district}
                          </td>
                          <td className="font-semibold text-charcoal">
                            {formatCurrency(item.price)}
                            <span className="block text-[11px] font-normal text-charcoal/45">per {item.unit.label}</span>
                          </td>
                          <td className="text-charcoal/70">
                            {item.normalizedPrice
                              ? `${formatAmount(item.normalizedPrice.value)} / ${item.normalizedPrice.per}`
                              : "—"}
                          </td>
                          <td className="text-charcoal/60">{formatRelative(item.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {comparison.meta.disclaimer}
            </p>
          </section>
        ) : null}

        <section className={comparison ? "mt-10" : ""}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Browse records</p>
              <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold">
                <TrendingUp className="h-5 w-5 text-forest-600" aria-hidden />
                Latest market observations
              </h2>
            </div>
            <p className="text-xs text-charcoal/50">{latestMeta ? `${latestMeta.total} records` : ""}</p>
          </div>

          {loadingLatest ? (
            <LoadingBlock label="Loading market prices…" />
          ) : latestError ? (
            <ErrorState message={latestError} />
          ) : latest.length === 0 ? (
            <EmptyState
              title="No observations yet"
              description="Market price observations published by administrators will appear here."
              icon={<TrendingUp className="h-6 w-6" aria-hidden />}
            />
          ) : (
            <>
              <PriceTable observations={latest} title="" bare />
              {latestMeta ? (
                <Pagination
                  className="mt-6"
                  page={latestMeta.page}
                  totalPages={latestMeta.totalPages}
                  total={latestMeta.total}
                  onChange={setLatestPage}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PriceTable({
  observations,
  emptyText = "No observations found.",
  title,
  bare = false,
}: {
  observations: MarketObservation[];
  emptyText?: string;
  title: string;
  bare?: boolean;
}) {
  return (
    <div className={bare ? "" : "card overflow-hidden"}>
      {!bare ? (
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs text-charcoal/50">Latest first. Freshness is based on the observation date.</p>
        </div>
      ) : null}
      {observations.length === 0 ? (
        <p className="p-5 text-sm text-charcoal/50">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Market</th>
                <th>Price</th>
                <th>Normalized</th>
                <th>Freshness</th>
                <th>Observed</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((observation) => (
                <tr key={observation.id}>
                  <td>
                    <p className="font-semibold text-charcoal">{observation.productName}</p>
                    <p className="mt-0.5 text-[11px] text-charcoal/45">{observation.category.name}</p>
                  </td>
                  <td className="text-charcoal/70">
                    {observation.market?.name ?? observation.location.district}
                    <span className="block text-[11px] text-charcoal/45">{observation.location.district}</span>
                  </td>
                  <td>
                    <p className="font-semibold text-forest-700">{formatCurrency(observation.price)}</p>
                    <p className="text-[11px] text-charcoal/45">per {observation.unit.label}</p>
                  </td>
                  <td className="text-charcoal/70">
                    {observation.normalizedPrice
                      ? `${formatAmount(observation.normalizedPrice.value)} / ${observation.normalizedPrice.per}`
                      : "—"}
                  </td>
                  <td>
                    <Badge tone={freshnessTone(observation.freshness)}>{observation.freshness}</Badge>
                    {observation.isVerified ? (
                      <span className="mt-1 block text-[10px] font-semibold text-forest-600">Verified</span>
                    ) : null}
                  </td>
                  <td className="text-charcoal/60">
                    {formatDate(observation.observedOn)}
                    <span className="block text-[11px] text-charcoal/45">{formatRelative(observation.observedOn)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
