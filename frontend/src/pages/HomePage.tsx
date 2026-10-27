import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Megaphone,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { getApiError, priceApi, productApi, referenceApi } from "../services/api";
import type { Announcement, MarketObservation, PaginationMeta, Product } from "../types";
import { useReferenceData } from "../hooks/useReferenceData";
import { useDocumentTitle } from "../components/ScrollToTop";
import { ProductCard, ProductGridSkeleton } from "../components/ProductCard";
import { CategoryIcon } from "../components/CategoryIcon";
import { EmptyState, ErrorState } from "../components/ui/States";
import { Badge } from "../components/ui/Badge";
import { formatCurrency, formatRelative, freshnessTone } from "../utils/format";
import { assetUrl, formatDate } from "../utils/format";
import { useI18n } from "../context/I18nContext";

export function HomePage() {
  useDocumentTitle("Fresh food marketplace for Rwanda");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { categories, locations } = useReferenceData();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState<number | null>(null);
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [observationsTotal, setObservationsTotal] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      productApi.list({ sort: "featured", pageSize: 8 }),
      priceApi.list({ pageSize: 6, sort: "newest" }),
      referenceApi.announcements(),
    ])
      .then(([productResult, priceResult, announcementResult]) => {
        if (!active) return;
        setFeatured(productResult.items);
        setProductsTotal((productResult.meta as unknown as PaginationMeta).total);
        setObservations(priceResult.items);
        setObservationsTotal((priceResult.meta as unknown as PaginationMeta).total);
        setAnnouncements(announcementResult);
        setLoadError(null);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(getApiError(error).message);
      })
      .finally(() => {
        if (!active) return;
        setLoadingProducts(false);
        setLoadingPrices(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(search.trim() ? `/products?q=${encodeURIComponent(search.trim())}` : "/products");
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-forest-700">
        <div className="absolute inset-0 opacity-15">
          <img
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80"
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
          />
        </div>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-harvest/20 blur-3xl" aria-hidden />
        <div className="container-page relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-harvest" aria-hidden />
              Rwanda&apos;s food marketplace with reviewed listings
            </span>
            <h1 className="mt-5 max-w-xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Fresh from Rwandan farms to your table.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/75">
              Discover food from trusted local sellers, compare current market prices, and message sellers directly.
              Everything in one transparent marketplace.
            </p>

            <form onSubmit={handleSearch} className="mt-7 flex max-w-lg gap-2 rounded-2xl bg-white p-1.5 shadow-lift">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="What are you looking for? e.g. rice"
                  className="h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-sm text-charcoal placeholder:text-gray-400 focus:outline-none"
                  aria-label="Search food products"
                />
              </div>
              <button type="submit" className="btn-primary h-11 shrink-0">
                Search
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/70">
              {[
                { icon: ShieldCheck, label: "Admin-reviewed listings" },
                { icon: TrendingUp, label: "Transparent market prices" },
                { icon: MessageCircle, label: "Direct seller messaging" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <item.icon className="h-4 w-4 text-harvest" aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative ml-auto w-[92%] overflow-hidden rounded-[2rem] border border-white/15 shadow-lift">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
                alt="Fresh produce at a Rwandan market"
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/80 to-transparent p-5 pt-16">
                <p className="text-xs font-semibold uppercase tracking-wider text-harvest">Market snapshot</p>
                <p className="mt-1 text-sm text-white/85">
                  Local food, fair prices, and sellers you can reach in one tap.
                </p>
              </div>
            </div>
            <div className="absolute -left-6 top-10 w-52 rounded-2xl border border-white/20 bg-white/95 p-3.5 shadow-lift backdrop-blur">
              <div className="flex items-center gap-2 text-forest-700">
                <Sprout className="h-4 w-4" aria-hidden />
                <p className="text-xs font-bold">Registered sellers</p>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-charcoal/60">
                Every listing is reviewed before it goes live.
              </p>
            </div>
            <div className="absolute -bottom-5 right-2 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-50 text-forest-600">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold text-charcoal">Across Rwanda</p>
                <p className="text-[11px] text-charcoal/55">30 districts connected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-forest-100 bg-white">
        <div className="container-page grid grid-cols-2 divide-x divide-forest-100 py-5 sm:grid-cols-4">
          {[
            { label: "Approved listings", value: productsTotal ?? "—", icon: Store },
            { label: "Market price records", value: observationsTotal ?? "—", icon: TrendingUp },
            { label: "Food categories", value: categories.length || "—", icon: Sprout },
            { label: "Districts covered", value: locations.districts.length || 30, icon: MapPin },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-center gap-3 px-3 py-2 text-center sm:text-left">
              <stat.icon className="hidden h-5 w-5 text-forest-500 sm:block" aria-hidden />
              <div>
                <p className="font-display text-xl font-bold text-charcoal">{stat.value}</p>
                <p className="text-[11px] font-medium text-charcoal/50">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Shop by category</p>
            <h2 className="mt-1 font-display text-2xl font-bold">What are you cooking today?</h2>
          </div>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-semibold text-forest-700 hover:underline sm:inline-flex">
            All products <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 10).map((category) => (
              <Link
                key={category.id}
                to={`/products?categoryId=${category.id}`}
                className="card group flex flex-col items-center gap-3 p-5 text-center transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-lift"
              >
                <CategoryIcon slug={category.slug} name={category.name} size="lg" />
                <span className="text-sm font-semibold text-charcoal group-hover:text-forest-700">{category.name}</span>
                <span className="text-[11px] text-charcoal/45">
                  {category.productCount} listing{category.productCount === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white py-12">
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Fresh listings</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Featured food products</h2>
              <p className="mt-1 text-sm text-charcoal/55">Approved and available from registered sellers.</p>
            </div>
            <Link to="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
              View all <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {loadingProducts ? (
            <ProductGridSkeleton count={4} />
          ) : loadError ? (
            <ErrorState message={loadError} />
          ) : featured.length === 0 ? (
            <EmptyState
              title="No listings yet"
              description="Sellers are getting their first products approved. Check back shortly or explore market prices."
              action={<Link to="/prices" className="btn-primary">Explore market prices</Link>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-600">{t("announcements.eyebrow")}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{t("announcements.title")}</h2>
            <p className="mt-1 text-sm text-charcoal/55">{t("announcements.subtitle")}</p>
          </div>
        </div>
        {announcements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-charcoal/50">{t("announcements.empty")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {announcements.slice(0, 3).map((announcement) => {
              const image = assetUrl(announcement.imageUrl);
              return (
                <article key={announcement.id} className="card overflow-hidden">
                  {image ? <img src={image} alt="" className="aspect-[16/9] w-full object-cover" /> : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-forest-50 text-forest-600"><Megaphone className="h-8 w-8" aria-hidden /></div>
                  )}
                  <div className="p-5">
                    <p className="text-xs text-charcoal/45">{formatDate(announcement.publishedAt)}</p>
                    <h3 className="mt-2 line-clamp-2 text-base font-bold text-charcoal">{announcement.title}</h3>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-charcoal/60">{announcement.body}</p>
                    <Link to={`/announcements/${announcement.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
                      {t("announcements.readMore")} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-forest-700 p-6 text-white sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-harvest">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Know before you buy
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-white">Compare food prices with confidence.</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              See what buyers are paying in different markets, when a price was last observed, and whether it has been
              verified by our team.
            </p>
            <div className="mt-5 space-y-3">
              {[
                { icon: Clock3, text: "Freshness labels show how recent each price is." },
                { icon: ShieldCheck, text: "Verified observations are clearly marked." },
                { icon: Users, text: "Unit normalization helps compare kg, sacks, and bunches." },
              ].map((item) => (
                <p key={item.text} className="flex items-start gap-2.5 text-sm text-white/80">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-harvest" aria-hidden />
                  {item.text}
                </p>
              ))}
            </div>
            <Link to="/prices" className="btn-gold mt-6">
              Open price comparison
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Latest observations</p>
                <h2 className="mt-1 font-display text-xl font-bold">Recent market prices</h2>
              </div>
              <Link to="/prices" className="text-xs font-semibold text-forest-700 hover:underline">See all</Link>
            </div>

            <div className="mt-4 divide-y divide-gray-100">
              {loadingPrices
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between py-3">
                      <div className="space-y-1.5">
                        <div className="skeleton h-3.5 w-32" />
                        <div className="skeleton h-3 w-40" />
                      </div>
                      <div className="skeleton h-4 w-24" />
                    </div>
                  ))
                : observations.length === 0
                  ? (
                    <p className="py-6 text-center text-sm text-charcoal/50">No price observations published yet.</p>
                  )
                  : observations.map((observation) => (
                    <div key={observation.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-charcoal">{observation.productName}</p>
                          <Badge tone={freshnessTone(observation.freshness)}>{observation.freshness}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-charcoal/50">
                          {observation.market?.name ?? observation.location.district}
                          {observation.market ? ` · ${observation.location.district}` : ""} ·{" "}
                          {formatRelative(observation.observedOn)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-forest-700">{formatCurrency(observation.price)}</p>
                        <p className="text-[11px] text-charcoal/45">per {observation.unit.label}</p>
                      </div>
                    </div>
                  ))}
            </div>
            <Link to="/prices" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
              Compare prices by product <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-forest-600">How it works</p>
            <h2 className="mt-1 font-display text-2xl font-bold">A simpler, more trustworthy food market</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Discover",
                body: "Browse approved food listings across Rwanda and filter by category, district, and price.",
              },
              {
                icon: MessageCircle,
                title: "Connect",
                body: "Message sellers directly to confirm quantity, quality, pickup, or delivery arrangements.",
              },
              {
                icon: CheckCircle2,
                title: "Decide with data",
                body: "Check recent market prices and freshness before agreeing on a fair price.",
              },
            ].map((step, index) => (
              <div key={step.title} className="card relative p-6">
                <span className="absolute right-5 top-5 font-display text-3xl font-extrabold text-forest-100">
                  0{index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <step.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-charcoal/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="relative overflow-hidden rounded-3xl bg-harvest-light/50 p-6 sm:p-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-harvest/30 blur-2xl" aria-hidden />
          <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <span className="badge-gold">For sellers</span>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Have food to sell? Reach buyers across Rwanda.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-charcoal/65">
                Create a seller account, submit your listings for review, and connect with buyers looking for exactly
                what you produce. No listing fees.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
              <Link to="/register" className="btn-primary">Create an account</Link>
              <Link to="/dashboard/become-seller" className="btn-outline">Become a seller</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
