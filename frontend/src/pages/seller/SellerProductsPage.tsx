import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, Edit3, Package, Plus, Search, TriangleAlert } from "lucide-react";
import { getApiError, productApi } from "../../services/api";
import type { PaginationMeta, Product } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { Pagination } from "../../components/ui/Pagination";
import { formatCurrency, formatDate, approvalTone, APPROVAL_LABELS, AVAILABILITY_LABELS } from "../../utils/format";

const statuses = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "requires_correction", label: "Corrections" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export function SellerProductsPage() {
  const { success, error } = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    productApi
      .sellerList({
        status,
        q: debouncedSearch || undefined,
        page,
        pageSize: 12,
        includeArchived,
      })
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
      if (next === "all") updated.delete("status");
      else updated.set("status", next);
      return updated;
    });
  }

  async function changeAvailability(product: Product, availability: Product["availability"]) {
    setUpdatingId(product.id);
    try {
      const updated = await productApi.setAvailability(product.id, availability, availability === "sold" ? 0 : undefined);
      setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
      success(`Availability updated for ${product.name}.`);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await productApi.archive(archiveTarget.id);
      setProducts((current) => current.filter((item) => item.id !== archiveTarget.id));
      success(`${archiveTarget.name} archived.`);
      setArchiveTarget(null);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Seller workspace"
        title="My products"
        subtitle="Create listings, respond to moderation feedback, and keep availability current."
        actions={
          <Link to="/seller/products/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            Add product
          </Link>
        }
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Search my products…"
                className="input w-full pl-9 sm:w-64"
                aria-label="Search my products"
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
        <LoadingBlock label="Loading your products…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={status === "all" ? "Add your first product to start selling." : "No products match this filter."}
          icon={<Package className="h-6 w-6" aria-hidden />}
          action={<Link to="/seller/products/new" className="btn-primary">Add product</Link>}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white lg:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price / unit</th>
                  <th>Availability</th>
                  <th>Moderation</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={product.isArchived ? "opacity-60" : undefined}>
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
                      <p className="font-semibold">{formatCurrency(product.price)}</p>
                      <p className="text-charcoal/45">per {product.unit.label}</p>
                    </td>
                    <td>
                      <select
                        value={product.availability}
                        disabled={updatingId === product.id || product.isArchived}
                        onChange={(event) => void changeAvailability(product, event.target.value as Product["availability"])}
                        className="select h-8 py-0 text-xs"
                        aria-label={`Availability for ${product.name}`}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                        <option value="sold">Sold out</option>
                      </select>
                    </td>
                    <td>
                      <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
                      {product.rejectionReason ? (
                        <p className="mt-1 max-w-[180px] truncate text-[10px] text-error" title={product.rejectionReason}>
                          {product.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-xs text-charcoal/50">{formatDate(product.updatedAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link to={`/seller/products/${product.id}/edit`} className="btn-ghost btn-sm" aria-label={`Edit ${product.name}`}>
                          <Edit3 className="h-4 w-4" aria-hidden />
                        </Link>
                        {!product.isArchived ? (
                          <button
                            type="button"
                            className="btn-ghost btn-sm text-error hover:bg-error-light"
                            onClick={() => setArchiveTarget(product)}
                            aria-label={`Archive ${product.name}`}
                          >
                            <Archive className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {products.map((product) => (
              <article key={product.id} className="card p-3">
                <div className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
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
                    <p className="text-xs text-charcoal/50">
                      {formatCurrency(product.price)} / {product.unit.label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus]}</Badge>
                      <Badge tone="gray">{AVAILABILITY_LABELS[product.availability]}</Badge>
                    </div>
                  </div>
                </div>
                {product.rejectionReason ? (
                  <p className="mt-2 flex items-start gap-1 rounded-lg bg-error-light p-2 text-[11px] text-error">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {product.rejectionReason}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Link to={`/seller/products/${product.id}/edit`} className="btn-outline btn-sm flex-1">Edit</Link>
                  <select
                    value={product.availability}
                    disabled={updatingId === product.id || product.isArchived}
                    onChange={(event) => void changeAvailability(product, event.target.value as Product["availability"])}
                    className="select h-9 flex-1 py-0 text-xs"
                    aria-label={`Availability for ${product.name}`}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="sold">Sold out</option>
                  </select>
                  {!product.isArchived ? (
                    <Button type="button" variant="ghost" size="sm" className="text-error" onClick={() => setArchiveTarget(product)}>
                      <Archive className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive product?"
        description={archiveTarget ? `“${archiveTarget.name}” will be hidden from your active listings.` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={archiving} onClick={archive}>Archive product</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">
          Archived products are removed from the marketplace. You can request restoration from support if needed.
        </p>
      </Modal>
    </div>
  );
}
