import { Outlet } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PublicLayout() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-forest-700"
      >
        {t("common.skipToContent")}
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
