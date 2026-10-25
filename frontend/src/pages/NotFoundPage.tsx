import { Link } from "react-router-dom";
import { Compass, Home, SearchX } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";

export function NotFoundPage() {
  useDocumentTitle("Page not found");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 text-forest-600">
        <SearchX className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-5 font-display text-6xl font-extrabold text-forest-200">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">We could not find that page</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-charcoal/60">
        The link may be broken, or the page may have moved. Try the marketplace or head back home.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/products" className="btn-primary">
          <Compass className="h-4 w-4" aria-hidden />
          Browse products
        </Link>
        <Link to="/" className="btn-outline">
          <Home className="h-4 w-4" aria-hidden />
          Back home
        </Link>
      </div>
    </div>
  );
}
