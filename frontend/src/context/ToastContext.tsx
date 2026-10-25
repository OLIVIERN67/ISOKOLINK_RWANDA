import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "../utils/cn";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

const styles: Record<ToastType, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: "border-forest-200 bg-white",
    icon: <CheckCircle2 className="h-5 w-5 text-forest-600" aria-hidden />,
  },
  error: {
    wrapper: "border-red-200 bg-white",
    icon: <XCircle className="h-5 w-5 text-error" aria-hidden />,
  },
  warning: {
    wrapper: "border-harvest/60 bg-white",
    icon: <TriangleAlert className="h-5 w-5 text-harvest-dark" aria-hidden />,
  },
  info: {
    wrapper: "border-sky-200 bg-white",
    icon: <Info className="h-5 w-5 text-sky-600" aria-hidden />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = nextId++;
    setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast(message, "success", title),
      error: (message, title) => showToast(message, "error", title),
      info: (message, title) => showToast(message, "info", title),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, toast.type === "error" ? 7000 : 4500);
    return () => window.clearTimeout(timer);
  }, [toast.type, onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lift",
        styles[toast.type].wrapper,
      )}
    >
      <span className="mt-0.5 shrink-0">{styles[toast.type].icon}</span>
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-sm font-semibold text-charcoal">{toast.title}</p> : null}
        <p className="text-sm text-charcoal/80">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-charcoal"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
