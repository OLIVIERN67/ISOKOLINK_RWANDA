import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingPage } from "./ui/States";

export function ProtectedRoute({ role }: { role?: "seller" | "admin" }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage label="Checking your session…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!user.isEmailVerified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  if (role === "admin" && !hasRole("admin")) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (role === "seller" && !hasRole("seller")) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
}
