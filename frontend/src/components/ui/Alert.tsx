import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-forest-200 bg-forest-50 text-forest-900",
    warning: "border-harvest/50 bg-harvest-light/30 text-charcoal",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div className={cn("rounded-xl border p-4 text-sm", tones[tone], className)} role={tone === "error" ? "alert" : "status"}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="text-current/90">{children}</div>
    </div>
  );
}
