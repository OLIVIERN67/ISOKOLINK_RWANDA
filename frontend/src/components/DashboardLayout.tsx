import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Bell,
  Bookmark,
  ClipboardCheck,
  Flag,
  Home,
  LayoutDashboard,
  LineChart,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessagesSquare,
  Package,
  PlusCircle,
  Ruler,
  ScrollText,
  Settings,
  ShoppingBasket,
  Store,
  Tags,
  TrendingUp,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { cn } from "../utils/cn";
import { Avatar } from "./ui/Avatar";
import { Logo } from "./Logo";

type Variant = "buyer" | "seller" | "admin";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: "messages" | "notifications";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function DashboardLayout({ variant }: { variant: Variant }) {
  const { user, hasRole, logout } = useAuth();
  const { t } = useI18n();
  const { error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, messages } = useUnreadCounts();
  const [open, setOpen] = useState(false);

  const variantLabels: Record<Variant, { title: string; subtitle: string }> = {
    buyer: { title: t("dashboard.buyer.title"), subtitle: t("dashboard.buyer.subtitle") },
    seller: { title: t("dashboard.seller.title"), subtitle: t("dashboard.seller.subtitle") },
    admin: { title: t("dashboard.admin.title"), subtitle: t("dashboard.admin.subtitle") },
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const groups = buildGroups(variant, hasRole("seller"), t);
  const allItems = groups.flatMap((group) => group.items);
  const activeItem =
    allItems
      .filter((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      .sort((a, b) => b.to.length - a.to.length)[0] ?? null;

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch {
      error(t("errors.signOutFailed"));
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex w-full max-w-[1600px]">
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-charcoal/40 lg:hidden"
            aria-label={t("nav.closeMenu")}
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-forest-100 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-forest-100 px-5">
            <Logo compact />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 min-w-11 rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label={t("nav.closeSidebar")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="border-b border-forest-100 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-forest-600">{variantLabels[variant].title}</p>
            <p className="mt-1 text-xs leading-5 text-charcoal/50">{variantLabels[variant].subtitle}</p>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label={t("dashboard.nav.overview")}>
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const count = item.badge === "messages" ? messages : item.badge === "notifications" ? notifications : 0;
                    return (
                      <NavLink
                        key={`${item.to}-${item.label}`}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => cn("sidebar-link", isActive && "sidebar-link-active")}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {count > 0 ? (
                          <span className="rounded-full bg-harvest px-1.5 py-0.5 text-[10px] font-bold text-charcoal">
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-forest-100 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-cream/70 p-2.5">
              <Avatar name={user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-charcoal">{user.fullName}</p>
                <p className="truncate text-[11px] text-charcoal/50">{user.roles.join(", ")}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-error/20 px-2.5 text-xs font-semibold text-error transition hover:bg-error/5"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-forest-100 bg-cream/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="min-h-11 min-w-11 rounded-lg p-2 text-charcoal hover:bg-white lg:hidden"
                aria-label={t("nav.openSidebar")}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{activeItem?.label ?? t("common.dashboard")}</p>
                <p className="hidden truncate text-[11px] text-charcoal/50 sm:block">
                  {t("common.signedInAs", { name: user.fullName })}
                  {user.isEmailVerified ? "" : ` — ${t("common.emailNotVerified")}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/products"
                className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-charcoal/70 transition hover:bg-white hover:text-forest-700 sm:inline-flex"
              >
                {t("nav.marketplace")}
              </Link>
              <Link
                to={variant === "admin" ? "/admin/conversations" : variant === "seller" ? "/seller/conversations" : "/dashboard/conversations"}
                className="relative min-h-11 min-w-11 rounded-lg p-2 text-charcoal/70 transition hover:bg-white hover:text-forest-700"
                aria-label={t("nav.messages")}
              >
                <MessagesSquare className="h-5 w-5" aria-hidden />
                {messages > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error ring-2 ring-cream" />
                ) : null}
              </Link>
              <Link
                to={variant === "admin" ? "/admin/notifications" : variant === "seller" ? "/seller/notifications" : "/dashboard/notifications"}
                className="relative min-h-11 min-w-11 rounded-lg p-2 text-charcoal/70 transition hover:bg-white hover:text-forest-700"
                aria-label={t("nav.notifications")}
              >
                <Bell className="h-5 w-5" aria-hidden />
                {notifications > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-harvest px-1 text-[9px] font-bold text-charcoal">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                ) : null}
              </Link>
              <Link to={variant === "admin" ? "/admin/profile" : variant === "seller" ? "/seller/profile" : "/dashboard/profile"} aria-label={t("nav.account")}>
                <Avatar name={user.fullName} size="sm" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-error/25 px-2.5 text-xs font-semibold text-error transition hover:bg-error/5 sm:px-3"
                aria-label={t("common.logout")}
                title={t("common.logout")}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("common.logout")}</span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function buildGroups(variant: Variant, isSeller: boolean, t: (key: string) => string): NavGroup[] {
  if (variant === "seller") {
    return [
      {
        title: t("dashboard.group.overview"),
        items: [
          { to: "/seller", label: t("dashboard.nav.overview"), icon: LayoutDashboard, end: true },
          { to: "/seller/products", label: t("dashboard.nav.myProducts"), icon: Package, end: true },
          { to: "/seller/products/new", label: t("dashboard.nav.addProduct"), icon: PlusCircle },
        ],
      },
      {
        title: t("dashboard.group.connect"),
        items: [
          { to: "/seller/conversations", label: t("dashboard.nav.messages"), icon: MessagesSquare, badge: "messages" },
          { to: "/seller/notifications", label: t("dashboard.nav.notifications"), icon: Bell, badge: "notifications" },
        ],
      },
      {
        title: t("dashboard.group.account"),
        items: [
          { to: "/seller/profile", label: t("dashboard.nav.sellerProfile"), icon: Store },
          { to: "/dashboard", label: t("dashboard.nav.buyerView"), icon: ShoppingBasket },
        ],
      },
    ];
  }

  if (variant === "admin") {
    return [
      {
        title: t("dashboard.group.overview"),
        items: [
          { to: "/admin", label: t("dashboard.nav.overview"), icon: LayoutDashboard, end: true },
          { to: "/admin/products", label: t("dashboard.nav.productModeration"), icon: ClipboardCheck },
          { to: "/admin/reports", label: t("dashboard.nav.reports"), icon: Flag },
        ],
      },
      {
        title: t("dashboard.group.marketplaceData"),
        items: [
          { to: "/admin/prices", label: t("dashboard.nav.marketPrices"), icon: TrendingUp },
          { to: "/admin/categories", label: t("dashboard.nav.categories"), icon: Tags },
          { to: "/admin/markets", label: t("dashboard.nav.markets"), icon: Store },
          { to: "/admin/locations", label: t("dashboard.nav.locations"), icon: MapPin },
          { to: "/admin/units", label: t("dashboard.nav.units"), icon: Ruler },
        ],
      },
      {
        title: t("dashboard.group.people"),
        items: [
          { to: "/admin/users", label: t("dashboard.nav.users"), icon: Users },
          { to: "/admin/conversations", label: t("dashboard.nav.messages"), icon: MessagesSquare, badge: "messages" },
          { to: "/admin/notifications", label: t("dashboard.nav.notifications"), icon: Bell, badge: "notifications" },
        ],
      },
      {
        title: t("dashboard.group.platform"),
        items: [
          { to: "/admin/announcements", label: t("dashboard.nav.announcements"), icon: Megaphone },
          { to: "/admin/audit-logs", label: t("dashboard.nav.auditLogs"), icon: ScrollText },
          { to: "/", label: t("dashboard.nav.publicSite"), icon: Home },
        ],
      },
    ];
  }

  return [
    {
      title: t("dashboard.group.explore"),
      items: [
        { to: "/dashboard", label: t("dashboard.nav.overview"), icon: LayoutDashboard, end: true },
        { to: "/dashboard/browse", label: t("dashboard.nav.browseProducts"), icon: ShoppingBasket },
        { to: "/dashboard/compare", label: t("dashboard.nav.comparePrices"), icon: LineChart },
        { to: "/dashboard/saved", label: t("dashboard.nav.savedProducts"), icon: Bookmark },
      ],
    },
    {
      title: t("dashboard.group.connect"),
      items: [
        { to: "/dashboard/conversations", label: t("dashboard.nav.messages"), icon: MessagesSquare, badge: "messages" },
        { to: "/dashboard/notifications", label: t("dashboard.nav.notifications"), icon: Bell, badge: "notifications" },
        { to: "/dashboard/reports", label: t("dashboard.nav.myReports"), icon: Flag },
      ],
    },
    {
      title: t("dashboard.group.account"),
      items: [
        { to: "/dashboard/profile", label: t("dashboard.nav.profile"), icon: User },
        { to: "/dashboard/settings", label: t("dashboard.nav.security"), icon: Settings },
        ...(isSeller
          ? [{ to: "/seller", label: t("dashboard.nav.sellerDashboard"), icon: Store }]
          : [{ to: "/dashboard/become-seller", label: t("dashboard.nav.becomeSeller"), icon: Store }]),
        { to: "/dashboard/switch", label: t("dashboard.nav.switchWorkspace"), icon: ArrowLeftRight },
      ],
    },
  ];
}

export function DashboardPageFrame({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
