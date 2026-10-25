import {
  Apple,
  Bean,
  Beef,
  Carrot,
  Droplets,
  Fish,
  Milk,
  ShoppingBasket,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";

const map: Array<{ match: string[]; icon: LucideIcon; className: string }> = [
  { match: ["vegetable", "greens", "tomato", "onion"], icon: Carrot, className: "bg-orange-50 text-orange-600" },
  { match: ["fruit", "avocado", "banana", "mango"], icon: Apple, className: "bg-red-50 text-red-500" },
  { match: ["grain", "cereal", "rice", "maize", "flour"], icon: Wheat, className: "bg-amber-50 text-amber-600" },
  { match: ["legume", "bean", "pea", "groundnut"], icon: Bean, className: "bg-lime-50 text-lime-700" },
  { match: ["meat", "livestock", "beef", "goat", "poultry"], icon: Beef, className: "bg-rose-50 text-rose-600" },
  { match: ["dairy", "milk", "egg"], icon: Milk, className: "bg-sky-50 text-sky-600" },
  { match: ["fish", "seafood"], icon: Fish, className: "bg-cyan-50 text-cyan-700" },
  { match: ["tuber", "potato", "cassava", "banana"], icon: Sprout, className: "bg-emerald-50 text-emerald-700" },
  { match: ["oil", "fat"], icon: Droplets, className: "bg-yellow-50 text-yellow-700" },
];

export function CategoryIcon({
  slug,
  name,
  size = "md",
}: {
  slug?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const haystack = `${slug ?? ""} ${name ?? ""}`.toLowerCase();
  const entry = map.find((item) => item.match.some((keyword) => haystack.includes(keyword)));
  const Icon = entry?.icon ?? ShoppingBasket;
  const sizes = { sm: "h-8 w-8", md: "h-11 w-11", lg: "h-14 w-14" } as const;
  const iconSizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } as const;

  return (
    <span className={`flex items-center justify-center rounded-xl ${sizes[size]} ${entry?.className ?? "bg-forest-50 text-forest-600"}`}>
      <Icon className={iconSizes[size]} aria-hidden />
    </span>
  );
}
