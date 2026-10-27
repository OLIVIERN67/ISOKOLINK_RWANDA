import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ImageOff, MapPin, MessageCircle, Store } from "lucide-react";
import type { Product } from "../types";
import { assetUrl, formatCurrency, formatRelative, APPROVAL_LABELS, AVAILABILITY_LABELS, approvalTone } from "../utils/format";
import { Badge } from "./ui/Badge";
import { SaveButton } from "./SaveButton";
import { WhatsAppContactButton } from "./WhatsAppContactButton";
import { productWhatsAppUrl } from "../utils/whatsapp";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export function ProductCard({ product, showStatus = false, onSaveChange }: { product: Product; showStatus?: boolean; onSaveChange?: (saved: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const image = assetUrl(product.primaryImage);
  const [imageBroken, setImageBroken] = useState(false);
  const sellerName = product.seller.businessName || product.seller.fullName;
  const unavailable = product.availability !== "available";
  const whatsappUrl = user?.id === product.seller.id
    ? null
    : productWhatsAppUrl(product, `${window.location.origin}/products/${product.id}`, language);

  return (
    <article className="group card flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-forest-50">
        <Link to={`/products/${product.id}`} className="block h-full w-full" aria-label={product.name}>
          {image && !imageBroken ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-forest-300">
              <ImageOff className="h-8 w-8" aria-hidden />
              <span className="text-xs font-medium">No photo yet</span>
            </span>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-forest-700 shadow-sm">
            {product.category.name}
          </span>
          {showStatus ? (
            <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          <SaveButton productId={product.id} initialSaved={Boolean(product.isSaved)} onChange={onSaveChange} />
        </div>
        {unavailable ? (
          <div className="absolute inset-x-0 bottom-0 bg-charcoal/75 px-3 py-1.5 text-center text-xs font-semibold text-white">
            {AVAILABILITY_LABELS[product.availability] ?? "Unavailable"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product.id}`} className="line-clamp-2 font-display text-base font-semibold leading-snug text-charcoal hover:text-forest-700">
            {product.name}
          </Link>
        </div>

        <p className="text-lg font-bold text-forest-700">
          {formatCurrency(product.price, product.currency)}
          <span className="ml-1 text-xs font-medium text-charcoal/50">/ {product.unit.label}</span>
        </p>

        <div className="mt-auto space-y-1.5 text-xs text-charcoal/60">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-forest-500" aria-hidden />
            <span className="truncate">
              {product.market ? `${product.market.name}, ` : ""}
              {product.location.district}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 shrink-0 text-forest-500" aria-hidden />
            <span className="truncate">{sellerName}</span>
          </p>
        </div>

        <div className="border-t border-gray-100 pt-2.5">
          <span className="text-[11px] text-charcoal/45">Updated {formatRelative(product.updatedAt)}</span>
          <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/products/${product.id}`, { state: { contact: true } })}
              className="btn-ghost btn-sm text-forest-700"
              aria-label={`Contact seller about ${product.name}`}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              Ask
            </button>
            {whatsappUrl ? (
              <WhatsAppContactButton
                href={whatsappUrl}
                className="!min-h-8 !gap-1.5 !rounded-lg !px-2.5 !py-1.5 !text-xs"
                aria-label={t("common.contactWhatsAppProduct", { seller: sellerName, product: product.name })}
              />
            ) : null}
            <Link
              to={`/products/${product.id}`}
              state={{ from: location.pathname }}
              className="btn-primary btn-sm"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
