import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="ISOKOLINK RWANDA home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-600 text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M16 27c0-7 3-11 9-13-1 8-4 12-9 13Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M16 27C16 17 11 10 4 7c0 10 5 17 12 20Z" fill="currentColor" opacity="0.75" />
          <path d="M16 27V14" stroke="#E8B44F" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="9" r="3" fill="#E8B44F" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-extrabold tracking-tight text-charcoal">
          ISOKOLINK
        </span>
        {!compact ? (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-600">
            Rwanda
          </span>
        ) : null}
      </span>
    </Link>
  );
}
