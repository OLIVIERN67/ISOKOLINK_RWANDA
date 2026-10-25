import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LayoutDashboard, Menu, Store, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n, LANGUAGE_LABELS, type Language } from "../context/I18nContext";
import { cn } from "../utils/cn";
import { Logo } from "./Logo";
import { Avatar } from "./ui/Avatar";

const publicLinks = [
  { to: "/", key: "nav.home" },
  { to: "/products", key: "nav.products" },
  { to: "/prices", key: "nav.prices" },
  { to: "/about", key: "nav.about" },
  { to: "/faq", key: "nav.faq" },
  { to: "/contact", key: "nav.contact" },
];

export function Navbar() {
  const { user, hasRole } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const dashboardLink = hasRole("admin") ? "/admin" : hasRole("seller") ? "/seller" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-forest-100 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}
            >
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <label className="sr-only" htmlFor="language-select">
            {t("common.language")}
          </label>
          <div className="relative">
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="h-9 appearance-none rounded-lg border border-forest-200 bg-white py-0 pl-2.5 pr-7 text-xs font-semibold text-charcoal focus:border-forest-500"
            >
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" aria-hidden />
          </div>

          {user ? (
            <>
              <Link to={dashboardLink} className="btn-outline btn-sm">
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                {t("nav.dashboard")}
              </Link>
              <Link to="/dashboard/profile" className="flex items-center gap-2 rounded-full border border-forest-100 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-charcoal transition hover:border-forest-300">
                <Avatar name={user.fullName} size="sm" />
                <span className="max-w-[110px] truncate">{user.fullName.split(" ")[0]}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">
                {t("common.signIn")}
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                {t("common.register")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-charcoal hover:bg-forest-50 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-forest-100 bg-cream lg:hidden">
          <div className="container-page space-y-1 py-4">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => cn("block nav-link", isActive && "nav-link-active")}
              >
                {t(link.key)}
              </NavLink>
            ))}
            <div className="my-3 h-px bg-forest-100" />
            {user ? (
              <>
                <Link to={dashboardLink} className="btn-primary w-full">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  {t("nav.dashboard")}
                </Link>
                {hasRole("seller") ? (
                  <Link to={`/sellers/${user.id}`} className="btn-outline mt-2 w-full">
                    <Store className="h-4 w-4" aria-hidden />
                    My storefront
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-outline">
                  {t("common.signIn")}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t("common.register")}
                </Link>
              </div>
            )}
            <div className="pt-3">
              <label className="label" htmlFor="mobile-language">
                {t("common.language")}
              </label>
              <select
                id="mobile-language"
                className="select"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
