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

const variantLabels: Record<Variant, { title: string; subtitle: string }> = {
  buyer: { title: "Buyer workspace", subtitle: "Discover food, compare prices, and connect with sellers." },
  seller: { title: "Seller workspace", subtitle: "Manage your listings and talk to interested buyers." },
  admin: { title: "Administration", subtitle: "Moderate listings, users, and marketplace data." },
};

export function DashboardLayout({ variant }: { variant: Variant }) {
  const { user, hasRole, logout } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, messages } = useUnreadCounts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const groups = buildGroups(variant, hasRole("seller"));
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
      error("Could not sign out. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex w-full max-w-[1600px]">
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-charcoal/40 lg:hidden"
            aria-label="Close menu"
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
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="border-b border-forest-100 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-forest-600">{variantLabels[variant].title}</p>
            <p className="mt-1 text-xs leading-5 text-charcoal/50">{variantLabels[variant].subtitle}</p>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
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
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-error"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
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
                className="rounded-lg p-2 text-charcoal hover:bg-white lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{activeItem?.label ?? "Dashboard"}</p>
                <p className="hidden truncate text-[11px] text-charcoal/50 sm:block">
                  Signed in as {user.fullName}
                  {user.isEmailVerified ? "" : " · email not verified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/products"
                className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-charcoal/70 transition hover:bg-white hover:text-forest-700 sm:inline-flex"
              >
                Marketplace
              </Link>
              <Link
                to={variant === "admin" ? "/admin/conversations" : variant === "seller" ? "/seller/conversations" : "/dashboard/conversations"}
                className="relative rounded-lg p-2 text-charcoal/70 transition hover:bg-white hover:text-forest-700"
                aria-label="Messages"
              >
                <MessagesSquare className="h-5 w-5" aria-hidden />
                {messages > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error ring-2 ring-cream" />
                ) : null}
              </Link>
              <Link
                to={variant === "admin" ? "/admin/notifications" : variant === "seller" ? "/seller/notifications" : "/dashboard/notifications"}
                className="relative rounded-lg p-2 text-charcoal/70 transition hover:bg-white hover:text-forest-700"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" aria-hidden />
                {notifications > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-harvest px-1 text-[9px] font-bold text-charcoal">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                ) : null}
              </Link>
              <Link to={variant === "admin" ? "/admin/profile" : variant === "seller" ? "/seller/profile" : "/dashboard/profile"} aria-label="Account">
                <Avatar name={user.fullName} size="sm" />
              </Link>
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

function buildGroups(variant: Variant, isSeller: boolean): NavGroup[] {
  if (variant === "seller") {
    return [
      {
        title: "Overview",
        items: [
          { to: "/seller", label: "Dashboard", icon: LayoutDashboard, end: true },
          { to: "/seller/products", label: "My products", icon: Package, end: true },
          { to: "/seller/products/new", label: "Add product", icon: PlusCircle },
        ],
      },
      {
        title: "Connect",
        items: [
          { to: "/seller/conversations", label: "Messages", icon: MessagesSquare, badge: "messages" },
          { to: "/seller/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
        ],
      },
      {
        title: "Account",
        items: [
          { to: "/seller/profile", label: "Seller profile", icon: Store },
          { to: "/dashboard", label: "Buyer view", icon: ShoppingBasket },
        ],
      },
    ];
  }

  if (variant === "admin") {
    return [
      {
        title: "Overview",
        items: [
          { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
          { to: "/admin/products", label: "Product moderation", icon: ClipboardCheck },
          { to: "/admin/reports", label: "Reports", icon: Flag },
        ],
      },
      {
        title: "Marketplace data",
        items: [
          { to: "/admin/prices", label: "Market prices", icon: TrendingUp },
          { to: "/admin/categories", label: "Categories", icon: Tags },
          { to: "/admin/markets", label: "Markets", icon: Store },
          { to: "/admin/locations", label: "Locations", icon: MapPin },
          { to: "/admin/units", label: "Units", icon: Ruler },
        ],
      },
      {
        title: "People",
        items: [
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/conversations", label: "Messages", icon: MessagesSquare, badge: "messages" },
          { to: "/admin/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
        ],
      },
      {
        title: "Platform",
        items: [
          { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
          { to: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
          { to: "/", label: "Public site", icon: Home },
        ],
      },
    ];
  }

  return [
    {
      title: "Explore",
      items: [
        { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/dashboard/browse", label: "Browse products", icon: ShoppingBasket },
        { to: "/dashboard/compare", label: "Compare prices", icon: LineChart },
        { to: "/dashboard/saved", label: "Saved products", icon: Bookmark },
      ],
    },
    {
      title: "Connect",
      items: [
        { to: "/dashboard/conversations", label: "Messages", icon: MessagesSquare, badge: "messages" },
        { to: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
        { to: "/dashboard/reports", label: "My reports", icon: Flag },
      ],
    },
    {
      title: "Account",
      items: [
        { to: "/dashboard/profile", label: "Profile", icon: User },
        { to: "/dashboard/settings", label: "Security", icon: Settings },
        ...(isSeller
          ? [{ to: "/seller", label: "Seller dashboard", icon: Store }]
          : [{ to: "/dashboard/become-seller", label: "Become a seller", icon: Store }]),
        { to: "/dashboard/switch", label: "Switch workspace", icon: ArrowLeftRight },
      ],
    },
  ];
}

export function DashboardPageFrame({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
