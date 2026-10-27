import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, ShoppingBasket, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiError, userApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Alert } from "../../components/ui/Alert";

export function SwitchWorkspacePage() {
  useDocumentTitle("Switch mode");
  const { user, hasRole, updateUser } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [working, setWorking] = useState<"buyer" | "seller" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function switchMode(mode: "buyer" | "seller") {
    setError(null);
    setWorking(mode);
    try {
      await userApi.switchActiveMode(mode);
      updateUser((current) => ({ ...current, activeMode: mode }));
      success(`Switched to ${mode} mode.`);
      navigate(mode === "seller" ? "/seller" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError).message);
    } finally {
      setWorking(null);
    }
  }

  const modes = [
    {
      mode: "buyer" as const,
      title: "Buyer mode",
      description: "Browse products, compare prices, save listings, and message sellers.",
      icon: ShoppingBasket,
      available: true,
      path: "/dashboard",
    },
    {
      mode: "seller" as const,
      title: "Seller mode",
      description: "Manage your storefront, product listings, and buyer conversations.",
      icon: Store,
      available: true,
      path: "/seller",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Switch mode"
        subtitle="Use one account to move between Buyer and Seller workspaces. Your profile, messages, and activity remain shared."
      />
      {error ? <Alert tone="error" className="mb-5">{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = user.activeMode === mode.mode;
          return (
            <div key={mode.mode} className={`card flex flex-col p-5 ${active ? "border-forest-500 ring-2 ring-forest-100" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {active ? <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-1 text-[11px] font-bold text-forest-700"><Check className="h-3 w-3" aria-hidden /> Current mode</span> : null}
              </div>
              <h2 className="mt-4 font-display text-base font-bold">{mode.title}</h2>
              <p className="mt-1 flex-1 text-xs leading-5 text-charcoal/55">{mode.description}</p>
              {mode.available ? (
                <button
                  type="button"
                  className="mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-forest-700 hover:underline disabled:opacity-50"
                  onClick={() => void switchMode(mode.mode)}
                  disabled={active || working !== null}
                >
                  {active ? "Already selected" : `Switch to ${mode.title.replace(" mode", "")}`}
                  {!active ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
                </button>
              ) : (
                <p className="mt-5 text-xs font-medium text-charcoal/45">
                  Seller mode will create a seller workspace on this account if needed.
                </p>
              )}
            </div>
          );
        })}
      </div>
      {hasRole("admin") ? (
        <div className="mt-4 card flex items-center gap-3 p-4">
          <ShieldCheck className="h-5 w-5 text-forest-700" aria-hidden />
          <p className="text-xs text-charcoal/60">Administrator access remains available separately and is not changed by Buyer/Seller mode switching.</p>
        </div>
      ) : null}
    </div>
  );
}
