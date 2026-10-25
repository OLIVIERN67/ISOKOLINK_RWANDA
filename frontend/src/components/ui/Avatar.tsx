import { assetUrl, initials } from "../../utils/format";
import { cn } from "../../utils/cn";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
  } as const;
  const url = assetUrl(src);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-100 font-semibold text-forest-700",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </span>
  );
}
