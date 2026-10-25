import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "btn-primary",
  gold: "btn-gold",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(variantClasses[variant], size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
