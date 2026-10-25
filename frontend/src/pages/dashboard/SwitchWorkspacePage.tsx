import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, ShoppingBasket, Store } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";

export function SwitchWorkspacePage() {
  useDocumentTitle("Switch workspace");
  const { hasRole } = useAuth();

  const workspaces = [
    {
      title: "Buyer workspace",
      description: "Browse products, compare prices, save listings, and message sellers.",
      to: "/dashboard",
      icon: ShoppingBasket,
      available: true,
    },
    {
      title: "Seller workspace",
      description: "Manage your storefront, product listings, and buyer conversations.",
      to: "/seller",
      icon: Store,
      available: hasRole("seller"),
    },
    {
      title: "Admin console",
      description: "Review products, moderate content, manage users, and maintain reference data.",
      to: "/admin",
      icon: ShieldCheck,
      available: hasRole("admin"),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Switch workspace"
        subtitle="Choose the workspace you want to open. Your available workspaces depend on your roles."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => {
          const Icon = workspace.icon;
          return (
            <div key={workspace.title} className="card flex flex-col p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 font-display text-base font-bold">{workspace.title}</h2>
              <p className="mt-1 flex-1 text-xs leading-5 text-charcoal/55">{workspace.description}</p>
              {workspace.available ? (
                <Link to={workspace.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
                  Open workspace <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : workspace.title === "Seller workspace" ? (
                <Link to="/dashboard/become-seller" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-harvest-dark hover:underline">
                  Apply as a seller <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <span className="mt-4 text-xs font-medium text-charcoal/35">Available to administrators only</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
