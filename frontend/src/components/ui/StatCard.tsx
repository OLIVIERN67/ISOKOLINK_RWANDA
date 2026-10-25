import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "green",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "green" | "gold" | "gray" | "red";
}) {
  const tones = {
    green: "bg-forest-50 text-forest-700",
    gold: "bg-harvest-light/60 text-harvest-dark",
    gray: "bg-lightgray text-gray-600",
    red: "bg-red-50 text-error",
  } as const;

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-charcoal">{value}</p>
        </div>
        {icon ? <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>{icon}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-charcoal/55">{hint}</p> : null}
    </div>
  );
}
