import { Loader2, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-6 w-6 animate-spin text-forest-600", className)} aria-hidden />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-charcoal/60" role="status">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function LoadingPage({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-charcoal/60" role="status">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-600">
        {icon ?? <PackageOpen className="h-6 w-6" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold text-charcoal">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-charcoal/60">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center">
      <p className="text-sm font-medium text-error">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
