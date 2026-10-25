import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className={cn("flex flex-wrap items-center justify-between gap-3", className)} aria-label="Pagination">
      <p className="text-xs text-charcoal/60">
        Page {page} of {totalPages}
        {typeof total === "number" ? ` · ${total} results` : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Prev
        </button>
        {start > 1 ? <span className="px-1 text-xs text-gray-400">…</span> : null}
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition",
              value === page ? "bg-forest-600 text-white" : "text-charcoal hover:bg-forest-50",
            )}
          >
            {value}
          </button>
        ))}
        {end < totalPages ? <span className="px-1 text-xs text-gray-400">…</span> : null}
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
