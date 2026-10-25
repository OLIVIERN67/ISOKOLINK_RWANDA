import { useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiError, userApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";

export function SaveButton({
  productId,
  initialSaved = false,
  className,
  onChange,
}: {
  productId: number;
  initialSaved?: boolean;
  className?: string;
  onChange?: (saved: boolean) => void;
}) {
  const { isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        await userApi.unsave(productId);
        setSaved(false);
        onChange?.(false);
        success("Removed from saved products.");
      } else {
        await userApi.save(productId);
        setSaved(true);
        onChange?.(true);
        success("Saved for later.");
      }
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? "Remove from saved products" : "Save product"}
      aria-pressed={saved}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/95 text-charcoal shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Bookmark className={cn("h-4 w-4", saved && "fill-forest-600 text-forest-600")} aria-hidden />
      )}
    </button>
  );
}
