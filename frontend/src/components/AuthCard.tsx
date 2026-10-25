import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-6 text-charcoal/60">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-5 text-center text-sm text-charcoal/60">{footer}</div> : null}
    </div>
  );
}
