import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Package, Search } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { PaginationMeta, Product } from "../../types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { Pagination } from "../../components/ui/Pagination";
import { formatCurrency, formatDate, approvalTone, APPROVAL_LABELS } from "../../utils/format";

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "requires_correction", label: "Corrections" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All" },
];

export function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "pending";
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    adminApi
      .products({ status, q: debouncedSearch || undefined, page, pageSize: 20, includeArchived })
      .then((result) => {
        if (!active) return;
        setProducts(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
      })
      .catch((requestError) => {
        if (active) setLoadError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, debouncedSearch, page, includeArchived]);

  function changeStatus(next: string) {
    setPage(1);
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("status", next);
      return updated;
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Product moderation"
        subtitle="Review seller submissions, request corrections, and enforce marketplace standards."
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1">
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeStatus(item.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  status === item.value ? "bg-forest-600 text-white" : "text-charcoal/60 hover:bg-forest-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search product or seller…"
                className="input w-full pl-9 sm:w-72"
                aria-label="Search products"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 text-forest-600"
              />
              Include archived
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading products…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : products.length === 0 ? (
        <EmptyState
          title={status === "pending" ? "Moderation queue is clear" : "No products found"}
          description={status === "pending" ? "There are no products waiting for review." : "Try a different status or search term."}
          icon={<Package className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white xl:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                          {product.primaryImage ? (
                            <img src={product.primaryImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-forest-300">
                              <Package className="h-4 w-4" aria-hidden />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-medium">{product.name}</p>
                          <p className="text-[11px] text-charcoal/45">
                            {product.category.name}
                            {product.isArchived ? " · Archived" : ""}
                            {product.isFeatured ? " · Featured" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs">
                      <p className="max-w-[160px] truncate font-medium">{product.seller.businessName || product.seller.fullName}</p>
                      <p className="text-charcoal/45">{product.seller.fullName}</p>
                    </td>
                    <td className="text-xs text-charcoal/60">
                      {product.location.district}
                      {product.market ? ` · ${product.market.name}` : ""}
                    </td>
                    <td className="text-xs font-semibold">
                      {formatCurrency(product.price)}
                      <span className="block text-[10px] font-normal text-charcoal/45">per {product.unit.label}</span>
                    </td>
                    <td>
                      <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
                    </td>
                    <td className="text-xs text-charcoal/50">{formatDate(product.submittedAt ?? product.createdAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link to={`/admin/products/${product.id}`} className="btn-outline btn-sm">
                          <Eye className="h-4 w-4" aria-hidden />
                          Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 xl:hidden">
            {products.map((product) => (
              <Link key={product.id} to={`/admin/products/${product.id}`} className="card flex gap-3 p-3 transition hover:border-forest-300">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream">
                  {product.primaryImage ? (
                    <img src={product.primaryImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-forest-300">
                      <Package className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="truncate text-[11px] text-charcoal/50">{product.seller.businessName || product.seller.fullName}</p>
                  <p className="mt-0.5 text-xs font-semibold">{formatCurrency(product.price)} / {product.unit.label}</p>
                  <div className="mt-1">
                    <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus]}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}
