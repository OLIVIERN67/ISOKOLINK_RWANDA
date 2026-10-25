import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  MessageSquare,
  Package,
  Plus,
  Store,
  TriangleAlert,
} from "lucide-react";
import { getApiError, productApi } from "../../services/api";
import type { SellerStats } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { LoadingBlock, ErrorState } from "../../components/ui/States";
import { formatCurrency, formatDate, formatRelative, approvalTone, APPROVAL_LABELS } from "../../utils/format";

export function SellerDashboardPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    productApi
      .stats()
      .then((result) => {
        if (active) setStats(result);
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
  }, []);

  if (loading) return <LoadingBlock label="Loading seller dashboard…" />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div>
      <PageHeader
        eyebrow="Seller workspace"
        title="Seller dashboard"
        subtitle="Track your listings, approvals, and buyer interest."
        actions={
          <>
            <Link to="/seller/products/new" className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden />
              Add product
            </Link>
            <Link to="/seller/profile" className="btn-outline">
              <Store className="h-4 w-4" aria-hidden />
              Business profile
            </Link>
          </>
        }
      />

      {stats && stats.counts.requiresCorrection > 0 ? (
        <Alert tone="warning" title="Products need corrections" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{stats.counts.requiresCorrection} product(s) need changes before they can be approved.</span>
            <Link to="/seller/products?status=requires_correction" className="btn-outline btn-sm">Review products</Link>
          </div>
        </Alert>
      ) : null}
      {stats && stats.counts.rejected > 0 ? (
        <Alert tone="error" title="Rejected products" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Read the rejection reason, fix the listing, and save it to resubmit.</span>
            <Link to="/seller/products?status=rejected" className="btn-outline btn-sm">View rejected</Link>
          </div>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total listings" value={stats?.counts.total ?? 0} icon={<Package className="h-5 w-5" aria-hidden />} hint={`${stats?.counts.approved ?? 0} approved`} />
        <StatCard label="Pending review" value={stats?.counts.pending ?? 0} icon={<Clock3 className="h-5 w-5" aria-hidden />} hint="Waiting for admin approval" tone="gold" />
        <StatCard label="Needs attention" value={stats?.counts.requiresCorrection ?? 0} icon={<TriangleAlert className="h-5 w-5" aria-hidden />} hint="Corrections requested" tone="red" />
        <StatCard label="Unread messages" value={stats?.unreadMessages ?? 0} icon={<MessageSquare className="h-5 w-5" aria-hidden />} hint="Buyer conversations" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Approved", value: stats?.counts.approved ?? 0, status: "approved" },
          { label: "Rejected", value: stats?.counts.rejected ?? 0, status: "rejected" },
          { label: "Corrections", value: stats?.counts.requiresCorrection ?? 0, status: "requires_correction" },
          { label: "Suspended", value: stats?.counts.suspended ?? 0, status: "suspended" },
          { label: "Sold out", value: stats?.counts.sold ?? 0, status: "sold" },
          { label: "Unavailable", value: stats?.counts.unavailable ?? 0, status: "unavailable" },
        ].map((item) => (
          <Link
            key={item.label}
            to={`/seller/products?status=${item.status}`}
            className="card flex items-center justify-between p-3 text-xs transition hover:border-forest-300"
          >
            <span className="text-charcoal/55">{item.label}</span>
            <span className="font-display text-base font-bold text-charcoal">{item.value}</span>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Recent listings</h2>
            <p className="text-xs text-charcoal/50">Your latest product submissions and updates.</p>
          </div>
          <Link to="/seller/products" className="text-xs font-semibold text-forest-700 hover:underline">View all</Link>
        </div>
        {!stats || stats.recentProducts.length === 0 ? (
          <div className="card p-6 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-forest-300" aria-hidden />
            <p className="mt-2 text-sm font-semibold">No products yet</p>
            <p className="mt-1 text-xs text-charcoal/50">Add your first listing and submit it for admin review.</p>
            <Link to="/seller/products/new" className="btn-primary btn-sm mt-3">
              <Plus className="h-4 w-4" aria-hidden />
              Add product
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100 overflow-hidden">
            {stats.recentProducts.map((product) => (
              <Link
                key={product.id}
                to={`/seller/products/${product.id}/edit`}
                className="flex items-center gap-3 p-3 transition hover:bg-cream/60"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                  {product.primaryImage ? (
                    <img src={product.primaryImage.startsWith("http") ? product.primaryImage : product.primaryImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-forest-300">
                      <Package className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="truncate text-[11px] text-charcoal/50">
                    {formatCurrency(product.price)} / {product.unit.label} · Updated {formatDate(product.updatedAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
                  {product.rejectionReason ? (
                    <p className="mt-1 max-w-[180px] truncate text-[10px] text-error">{product.rejectionReason}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Recent buyer messages</h2>
            <p className="text-xs text-charcoal/50">The latest messages from people interested in your listings.</p>
          </div>
          <Link to="/seller/conversations" className="text-xs font-semibold text-forest-700 hover:underline">Open inbox</Link>
        </div>
        {!stats || stats.recentMessages.length === 0 ? (
          <p className="py-4 text-sm text-charcoal/50">No buyer messages yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentMessages.map((message) => (
              <Link
                key={message.conversationId}
                to={`/seller/conversations/${message.conversationId}`}
                className="flex items-start gap-3 py-3 transition hover:bg-cream/50"
              >
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${message.isUnread ? "bg-harvest" : "bg-transparent"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-charcoal">{message.senderName}</span>
                    <span className="text-[11px] text-charcoal/45">{formatRelative(message.sentAt)}</span>
                  </span>
                  {message.productName ? <span className="mt-0.5 block text-[11px] text-forest-700">About {message.productName}</span> : null}
                  <span className="mt-1 block truncate text-xs text-charcoal/60">{message.preview}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/seller/conversations" className="card flex items-center justify-between p-4 transition hover:border-forest-300">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
              <MessageSquare className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Buyer messages</p>
              <p className="text-xs text-charcoal/50">Respond quickly to build trust.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-charcoal/35" aria-hidden />
        </Link>
        <Link to="/seller/products/new" className="card flex items-center justify-between p-4 transition hover:border-forest-300">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-harvest-light/50 text-harvest-dark">
              <Plus className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">List a new product</p>
              <p className="text-xs text-charcoal/50">Use clear photos, unit, and price.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-charcoal/35" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => window.location.reload()}>
          Refresh stats
        </Button>
      </div>
    </div>
  );
}
