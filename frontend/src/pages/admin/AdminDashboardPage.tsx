import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clock3,
  MapPin,
  Package,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi, getApiError } from "../../services/api";
import type { AdminStats } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDate, formatRelative } from "../../utils/format";

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
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

  if (loading) return <LoadingBlock label="Loading admin dashboard…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!stats) return <ErrorState message="Dashboard data unavailable." />;

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Platform overview"
        subtitle="Monitor marketplace activity, moderation queues, and users."
        actions={
          <>
            <Link to="/admin/products" className="btn-primary">
              <Clock3 className="h-4 w-4" aria-hidden />
              Review products
            </Link>
            <Link to="/admin/reports" className="btn-outline">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Open reports
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totals.users} icon={<Users className="h-5 w-5" aria-hidden />} hint={`${stats.totals.activeUsers} active`} />
        <StatCard label="Sellers" value={stats.totals.sellers} icon={<Store className="h-5 w-5" aria-hidden />} hint={`${stats.totals.activeSellers} active`} tone="gold" />
        <StatCard label="Products" value={stats.totals.products} icon={<Package className="h-5 w-5" aria-hidden />} hint={`${stats.totals.approvedProducts} approved`} />
        <StatCard label="Pending review" value={stats.totals.pendingProducts} icon={<Clock3 className="h-5 w-5" aria-hidden />} hint="Listings awaiting moderation" tone="red" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Open reports", value: stats.totals.openReports, to: "/admin/reports" },
          { label: "Under review", value: stats.totals.reviewReports, to: "/admin/reports" },
          { label: "Corrections", value: stats.totals.correctionProducts, to: "/admin/products?status=requires_correction" },
          { label: "Rejected", value: stats.totals.rejectedProducts, to: "/admin/products?status=rejected" },
          { label: "Price records", value: stats.totals.priceObservations, to: "/admin/prices" },
          { label: "Stale prices", value: stats.totals.staleObservations, to: "/admin/prices" },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="card p-3 transition hover:border-forest-300">
            <p className="text-[11px] text-charcoal/50">{item.label}</p>
            <p className="mt-1 font-display text-lg font-bold">{item.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold">Activity trend</h2>
              <p className="text-xs text-charcoal/50">Registrations and product submissions over the last 30 days.</p>
            </div>
            <Badge tone="green"><TrendingUp className="mr-1 h-3 w-3" aria-hidden />30 days</Badge>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.activityTrend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2f6b3f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2f6b3f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="products" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d9a441" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2ed" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(value) => formatDate(String(value))} />
                <Area type="monotone" dataKey="registrations" stroke="#2f6b3f" fill="url(#registrations)" strokeWidth={2} name="Registrations" />
                <Area type="monotone" dataKey="products" stroke="#d9a441" fill="url(#products)" strokeWidth={2} name="Products" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-charcoal/55">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-forest-600" /> Registrations</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-harvest" /> Products</span>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-base font-bold">Products by category</h2>
          <p className="text-xs text-charcoal/50">Approved marketplace inventory mix.</p>
          <div className="mt-4 h-56 w-full">
            {stats.categories.length === 0 ? (
              <p className="py-10 text-center text-sm text-charcoal/50">No product data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categories.slice(0, 7)} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2ed" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={52} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2f6b3f" radius={[4, 4, 0, 0]} name="Products" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 p-4">
            <h2 className="font-display text-base font-bold">Recent registrations</h2>
            <Link to="/admin/users" className="text-xs font-semibold text-forest-700 hover:underline">All users</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentUsers.length === 0 ? (
              <p className="p-4 text-sm text-charcoal/50">No users yet.</p>
            ) : (
              stats.recentUsers.map((user) => (
                <Link key={user.id} to={`/admin/users/${user.id}`} className="flex items-center justify-between gap-3 p-3 transition hover:bg-cream/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.fullName}</p>
                    <p className="truncate text-[11px] text-charcoal/45">{user.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={user.status === "active" ? "green" : "red"}>{user.status}</Badge>
                    <p className="mt-0.5 text-[10px] text-charcoal/40">{formatDate(user.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 p-4">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Activity className="h-4 w-4 text-forest-600" aria-hidden />
              Recent admin activity
            </h2>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-forest-700 hover:underline">Audit logs</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentActivity.length === 0 ? (
              <p className="p-4 text-sm text-charcoal/50">No recorded activity yet.</p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="p-3">
                  <p className="text-xs font-semibold capitalize">{activity.action.replace(/[._]/g, " ")}</p>
                  <p className="mt-0.5 text-[11px] text-charcoal/45">
                    {activity.actorName} · {activity.entityType} {activity.entityId ? `#${activity.entityId}` : ""} ·{" "}
                    {formatRelative(activity.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <MapPin className="h-4 w-4 text-forest-600" aria-hidden />
          Administrative shortcuts
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Manage users", to: "/admin/users", icon: Users },
            { label: "Reference data", to: "/admin/categories", icon: BadgeCheck },
            { label: "Announcements", to: "/admin/announcements", icon: Store },
            { label: "Admin messages", to: "/admin/conversations", icon: ArrowRight },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.to} className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm font-medium transition hover:border-forest-300 hover:bg-forest-50/40">
                <Icon className="h-4 w-4 text-forest-600" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
