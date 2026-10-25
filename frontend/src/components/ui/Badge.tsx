import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

const tones = {
  green: "badge-green",
  gold: "badge-gold",
  red: "badge-red",
  gray: "badge-gray",
  blue: "badge-blue",
  purple: "badge-purple",
} as const;

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(tones[tone], className)}>{children}</span>;
}
