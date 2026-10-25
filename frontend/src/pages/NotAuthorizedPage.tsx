import { Link } from "react-router-dom";
import { Home, LockKeyhole, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDocumentTitle } from "../components/ScrollToTop";

export function NotAuthorizedPage() {
  useDocumentTitle("Not authorized");
  const { user, hasRole } = useAuth();
  const dashboard = user ? (hasRole("admin") ? "/admin" : hasRole("seller") ? "/seller" : "/dashboard") : "/login";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-harvest-light/50 text-harvest-dark">
        <LockKeyhole className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-forest-600">403 · Access denied</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">You do not have access to this area</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-charcoal/60">
        This page is restricted to a different account role. If you believe this is a mistake, contact the ISOKOLINK
        administration team.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={dashboard} className="btn-primary">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Go to my dashboard
        </Link>
        <Link to="/" className="btn-outline">
          <Home className="h-4 w-4" aria-hidden />
          Back home
        </Link>
      </div>
    </div>
  );
}
