import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-forest-600">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-charcoal/60">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
