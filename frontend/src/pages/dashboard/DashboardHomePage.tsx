import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  ShoppingBasket,
  Store,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { authApi, getApiError, priceApi, productApi, referenceApi, userApi } from "../../services/api";
import type { Announcement, BuyerStats, MarketObservation, Product } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { ProductCard, ProductGridSkeleton } from "../../components/ProductCard";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency, formatDate, formatRelative, freshnessTone } from "../../utils/format";

export function DashboardHomePage() {
  useDocumentTitle("Dashboard");
  const { user, hasRole } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [devVerification, setDevVerification] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      userApi.stats(),
      productApi.list({ sort: "featured", pageSize: 4 }),
      priceApi.list({ pageSize: 4, sort: "newest" }),
      referenceApi.announcements(),
    ])
      .then(([statsResult, productResult, priceResult, announcementResult]) => {
        if (!active) return;
        setStats(statsResult);
        setFeatured(productResult.items);
        setObservations(priceResult.items);
        setAnnouncements(announcementResult.slice(0, 3));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function resendVerification() {
    setResending(true);
    try {
      const result = await authApi.resendVerification();
      success(result.message);
      setDevVerification(result.devVerificationToken ?? null);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setResending(false);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const isSeller = hasRole("seller");

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Buyer workspace"
        title={`${greeting}, ${firstName}`}
        subtitle="Here is what is happening in your marketplace today."
        actions={
          <>
            <Link to="/dashboard/browse" className="btn-primary">
              <ShoppingBasket className="h-4 w-4" aria-hidden />
              Browse products
            </Link>
            <Link to="/dashboard/compare" className="btn-outline">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Compare prices
            </Link>
          </>
        }
      />

      {user && !user.isEmailVerified ? (
        <Alert tone="warning" title="Verify your email address" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Verify your email to unlock seller registration and account recovery.</span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resendVerification} loading={resending}>
                Resend verification
              </Button>
              {devVerification ? (
                <Link to={`/verify-email?token=${encodeURIComponent(devVerification)}`} className="btn-primary btn-sm">
                  Verify now
                </Link>
              ) : (
                <Link to="/verify-email" className="btn-outline btn-sm">Verification page</Link>
              )}
            </div>
          </div>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Saved products"
          value={stats?.savedProducts ?? "—"}
          icon={<Bookmark className="h-5 w-5" aria-hidden />}
          hint="Keep interesting listings for later"
        />
        <StatCard
          label="Conversations"
          value={stats?.conversations ?? "—"}
          icon={<MessageSquare className="h-5 w-5" aria-hidden />}
          hint={stats?.unreadMessages ? `${stats.unreadMessages} unread message${stats.unreadMessages === 1 ? "" : "s"}` : "All caught up"}
          tone="gold"
        />
        <StatCard
          label="Unread notifications"
          value={stats?.unreadNotifications ?? "—"}
          icon={<Bell className="h-5 w-5" aria-hidden />}
          hint="Listing and account updates"
        />
        <StatCard
          label="Seller status"
          value={isSeller ? "Active" : "Buyer"}
          icon={isSeller ? <Store className="h-5 w-5" aria-hidden /> : <UserCheck className="h-5 w-5" aria-hidden />}
          hint={isSeller ? "Manage your listings" : "Register to start selling"}
          tone={isSeller ? "green" : "gray"}
        />
      </div>

      {!isSeller ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-harvest-light/50 text-harvest-dark">
              <Store className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold">Selling food? Join as a seller.</h2>
              <p className="mt-1 text-xs leading-5 text-charcoal/55">
                Create a seller profile, submit products for approval, and reach buyers across Rwanda.
              </p>
              <Link to="/dashboard/become-seller" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
                Become a seller <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="card flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold">Buy with confidence</h2>
              <p className="mt-1 text-xs leading-5 text-charcoal/55">
                Confirm the unit and condition with the seller, inspect goods, and avoid advance payments to strangers.
              </p>
              <Link to="/faq" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
                Safety guidance <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Alert tone="success" title="Your seller workspace is active">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Manage listings and respond to buyers from your seller dashboard.</span>
              <Link to="/seller" className="btn-primary btn-sm">Open seller dashboard</Link>
            </div>
          </Alert>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Recommended for you</h2>
            <p className="text-xs text-charcoal/50">Featured listings from verified sellers.</p>
          </div>
          <Link to="/dashboard/browse" className="text-xs font-semibold text-forest-700 hover:underline">Browse all</Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : featured.length === 0 ? (
          <p className="card p-6 text-sm text-charcoal/50">No featured products are available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold">Recent market prices</h2>
              <p className="text-xs text-charcoal/50">Freshness matters — check the observation date.</p>
            </div>
            <Link to="/dashboard/compare" className="text-xs font-semibold text-forest-700 hover:underline">Compare</Link>
          </div>
          <div className="mt-3 divide-y divide-gray-100">
            {observations.length === 0 ? (
              <p className="py-4 text-sm text-charcoal/50">No price observations yet.</p>
            ) : (
              observations.map((observation) => (
                <div key={observation.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{observation.productName}</p>
                    <p className="truncate text-[11px] text-charcoal/50">
                      {observation.market?.name ?? observation.location.district} · {formatDate(observation.observedOn)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-forest-700">{formatCurrency(observation.price)}</p>
                    <Badge tone={freshnessTone(observation.freshness)}>{observation.freshness}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold">Announcements</h2>
              <p className="text-xs text-charcoal/50">Updates from the ISOKOLINK team.</p>
            </div>
            <Link to="/dashboard/notifications" className="text-xs font-semibold text-forest-700 hover:underline">Notifications</Link>
          </div>
          <div className="mt-3 space-y-3">
            {announcements.length === 0 ? (
              <p className="py-4 text-sm text-charcoal/50">No announcements published yet.</p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-xl border border-forest-100 bg-cream/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{announcement.title}</p>
                    <span className="shrink-0 text-[10px] text-charcoal/40">{formatRelative(announcement.publishedAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-charcoal/55">{announcement.body}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
