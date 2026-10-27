import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Flag,
  ImageOff,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldAlert,
  Store,
} from "lucide-react";
import { getApiError, productApi, reportApi } from "../services/api";
import type { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDocumentTitle } from "../components/ScrollToTop";
import { SaveButton } from "../components/SaveButton";
import { ContactSellerModal } from "../components/ContactSellerModal";
import { ProductCard } from "../components/ProductCard";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { ErrorState, LoadingPage } from "../components/ui/States";
import {
  APPROVAL_LABELS,
  AVAILABILITY_LABELS,
  approvalTone,
  assetUrl,
  formatCurrency,
  formatDate,
  formatRelative,
} from "../utils/format";
import { REPORT_REASONS } from "../utils/reports";
import { productWhatsAppUrl } from "../utils/whatsapp";
import { WhatsAppContactButton } from "../components/WhatsAppContactButton";
import { useI18n } from "../context/I18nContext";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  useDocumentTitle(product?.name ?? "Product details");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    productApi
      .get(productId)
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setActiveImage(0);
        return productApi.list({ categoryId: result.category.id, pageSize: 4 });
      })
      .then((relatedResult) => {
        if (!active || !relatedResult) return;
        setRelated(relatedResult.items.filter((item) => item.id !== productId).slice(0, 4));
      })
      .catch((requestError) => {
        if (!active) return;
        setLoadError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) return <LoadingPage label="Loading product…" />;
  if (loadError || !product) {
    return (
      <div className="container-page py-16">
        <ErrorState message={loadError ?? "Product not found."} />
        <div className="mt-4 text-center">
          <Link to="/products" className="btn-outline">Back to products</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === product.seller.id;
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImage]?.url ?? null;
  const sellerName = product.seller.businessName || product.seller.fullName;
  const whatsappUrl = isOwner
    ? null
    : productWhatsAppUrl(product, `${window.location.origin}/products/${product.id}`, language);

  async function shareProduct() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product!.name, text: `Check out ${product!.name} on ISOKOLINK RWANDA`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      success("Product link copied.");
    } catch {
      error("Could not share the product link.");
    }
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (reportDetails.trim().length < 10) {
      setReportError("Describe the problem in at least 10 characters.");
      return;
    }
    setReporting(true);
    setReportError(null);
    try {
      await reportApi.create({ productId: product!.id, reason: reportReason, details: reportDetails.trim() });
      success("Report submitted. Our team will review it.");
      setReportOpen(false);
      setReportDetails("");
    } catch (requestError) {
      const parsed = getApiError(requestError);
      setReportError(parsed.message);
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="container-page py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-charcoal/50" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-forest-700">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/products" className="hover:text-forest-700">Products</Link>
          <span aria-hidden>/</span>
          <span className="max-w-[180px] truncate text-charcoal">{product.name}</span>
        </nav>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-forest-100 bg-white">
            <div className="aspect-[4/3] w-full bg-forest-50">
              {currentImage && !brokenImages[activeImage] ? (
                <img
                  src={assetUrl(currentImage) ?? ""}
                  alt={images[activeImage]?.altText || product.name}
                  className="h-full w-full object-cover"
                  onError={() => setBrokenImages((current) => ({ ...current, [activeImage]: true }))}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-forest-300">
                  <ImageOff className="h-12 w-12" aria-hidden />
                  <p className="text-sm font-medium">No photo available</p>
                </div>
              )}
            </div>
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge tone="green">{product.category.name}</Badge>
              {product.isFeatured ? <Badge tone="gold">Featured</Badge> : null}
              {product.approvalStatus !== "approved" ? (
                <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus]}</Badge>
              ) : null}
            </div>
            <div className="absolute right-4 top-4">
              <SaveButton productId={product.id} initialSaved={Boolean(product.isSaved)} />
            </div>
          </div>

          {images.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-lg border-2 bg-white ${
                    activeImage === index ? "border-forest-600" : "border-transparent hover:border-forest-200"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={assetUrl(image.url) ?? ""} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="card mt-5 p-5">
            <h2 className="font-display text-lg font-bold">Product description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-charcoal/70">{product.description}</p>
          </div>

          <div className="card mt-4 p-5">
            <h2 className="font-display text-lg font-bold">Listing details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-charcoal/45">Quantity available</dt>
                <dd className="mt-0.5 font-semibold">{product.quantity} {product.unit.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/45">Category</dt>
                <dd className="mt-0.5 font-semibold">{product.category.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/45">Availability</dt>
                <dd className="mt-0.5 font-semibold">{AVAILABILITY_LABELS[product.availability] ?? product.availability}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/45">Last updated</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(product.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/45">Approved</dt>
                <dd className="mt-0.5 font-semibold">{product.approvedAt ? formatDate(product.approvedAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/45">Listing ID</dt>
                <dd className="mt-0.5 font-semibold">#{product.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-forest-600">{product.category.name}</p>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-charcoal sm:text-3xl">{product.name}</h1>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <p className="font-display text-3xl font-extrabold text-forest-700">{formatCurrency(product.price, product.currency)}</p>
              <p className="pb-1 text-sm font-medium text-charcoal/50">per {product.unit.label}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-charcoal/60">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-forest-500" aria-hidden />
                {product.market ? `${product.market.name}, ` : ""}{product.location.district}
              </span>
              <span className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-forest-500" aria-hidden />
                {sellerName}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-forest-500" aria-hidden />
                Updated {formatRelative(product.updatedAt)}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {isOwner ? (
                <Link to={`/seller/products/${product.id}/edit`} className="btn-outline sm:col-span-2">
                  Manage this listing
                </Link>
              ) : (
                <ContactSellerModal
                  sellerId={product.seller.id}
                  sellerName={sellerName}
                  productId={product.id}
                  productName={product.name}
                  className={whatsappUrl ? "w-full" : "w-full sm:col-span-2"}
                />
              )}
              {whatsappUrl ? (
                <WhatsAppContactButton
                  href={whatsappUrl}
                  className="w-full"
                  aria-label={t("common.contactWhatsAppProduct", { seller: sellerName, product: product.name })}
                />
              ) : null}
              <Button type="button" variant="outline" onClick={shareProduct}>
                <Share2 className="h-4 w-4" aria-hidden />
                Share
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!user) {
                    navigate("/login", { state: { from: location.pathname } });
                    return;
                  }
                  setReportOpen(true);
                }}
              >
                <Flag className="h-4 w-4" aria-hidden />
                Report listing
              </Button>
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-lg bg-cream/70 p-3 text-[11px] leading-5 text-charcoal/55">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-harvest-dark" aria-hidden />
              Meet in a safe public place, inspect goods before paying, and never send advance mobile money to an
              unverified seller.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={sellerName} src={product.seller.profileImageUrl} size="lg" />
              <div className="min-w-0">
                <Link to={`/sellers/${product.seller.id}`} className="truncate font-display text-base font-bold text-charcoal hover:text-forest-700">
                  {sellerName}
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-forest-600">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Registered seller
                </p>
              </div>
            </div>
            {product.seller.description ? (
              <p className="mt-3 text-sm leading-6 text-charcoal/60">{product.seller.description}</p>
            ) : null}
            <div className="mt-3 space-y-1.5 text-xs text-charcoal/55">
              {product.seller.district ? (
                <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-forest-500" aria-hidden />{product.seller.district}</p>
              ) : null}
              {product.seller.phone ? (
                <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-forest-500" aria-hidden />{product.seller.phone}</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/sellers/${product.seller.id}`} className="btn-outline btn-sm flex-1">
                View storefront
              </Link>
              {!isOwner ? (
                <ContactSellerModal
                  sellerId={product.seller.id}
                  sellerName={sellerName}
                  productId={product.id}
                  productName={product.name}
                  label="Ask a question"
                  variant="outline"
                  className="btn-sm flex-1"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Keep exploring</p>
              <h2 className="mt-1 font-display text-xl font-bold">More in {product.category.name}</h2>
            </div>
            <Link to={`/products?categoryId=${product.category.id}`} className="text-sm font-semibold text-forest-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this listing"
        description="Reports help keep the marketplace safe. Our administrators review every report."
      >
        <form onSubmit={submitReport} className="space-y-4">
          <Field label="Reason" htmlFor="report-reason" required>
            <select
              id="report-reason"
              className="select"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </Field>
          <Field
            label="What happened?"
            htmlFor="report-details"
            error={reportError ?? undefined}
            hint="Include specific details so we can investigate."
            required
          >
            <textarea
              id="report-details"
              className="textarea"
              rows={4}
              minLength={10}
              maxLength={2000}
              value={reportDetails}
              onChange={(event) => {
                setReportDetails(event.target.value);
                setReportError(null);
              }}
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={reporting}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              Submit report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
