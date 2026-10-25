import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Logo } from "./Logo";

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-forest-100 bg-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-charcoal/60">{t("footer.tagline")}</p>
          <div className="mt-4 flex items-center gap-2">
            {[Facebook, Instagram, Twitter].map((Icon, index) => (
              <span
                key={index}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-50 text-forest-600"
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">{t("footer.explore")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/60">
            <li><Link className="hover:text-forest-700" to="/products">{t("nav.products")}</Link></li>
            <li><Link className="hover:text-forest-700" to="/prices">{t("nav.prices")}</Link></li>
            <li><Link className="hover:text-forest-700" to="/about">{t("nav.about")}</Link></li>
            <li><Link className="hover:text-forest-700" to="/contact">{t("nav.contact")}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">{t("footer.account")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/60">
            <li><Link className="hover:text-forest-700" to="/login">{t("common.signIn")}</Link></li>
            <li><Link className="hover:text-forest-700" to="/register">{t("common.register")}</Link></li>
            <li><Link className="hover:text-forest-700" to="/dashboard">Dashboard</Link></li>
            <li><Link className="hover:text-forest-700" to="/dashboard/become-seller">Become a seller</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">{t("footer.legal")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/60">
            <li><Link className="hover:text-forest-700" to="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-forest-700" to="/terms">Terms of service</Link></li>
            <li><Link className="hover:text-forest-700" to="/faq">FAQ</Link></li>
          </ul>
          <div className="mt-4 space-y-2 text-xs text-charcoal/55">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-forest-500" aria-hidden /> Kigali, Rwanda</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-forest-500" aria-hidden /> +250 788 000 000</p>
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-forest-500" aria-hidden /> hello@isokolink.rw</p>
          </div>
        </div>
      </div>

      <div className="border-t border-forest-100">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-charcoal/50 sm:flex-row">
          <p>© {year} ISOKOLINK RWANDA. {t("footer.rights")}</p>
          <p>Verified food market information for Rwanda.</p>
        </div>
      </div>
    </footer>
  );
}
