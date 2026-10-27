import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, CalendarDays, Flag, MapPin, Phone, Store } from "lucide-react";
import { getApiError, productApi, reportApi, userApi } from "../services/api";
import type { Product, PublicSeller } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDocumentTitle } from "../components/ScrollToTop";
import { ProductCard } from "../components/ProductCard";
import { ContactSellerModal } from "../components/ContactSellerModal";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { EmptyState, ErrorState, LoadingPage } from "../components/ui/States";
import { formatDate } from "../utils/format";
import { REPORT_REASONS } from "../utils/reports";

export function SellerStorefrontPage() {
  const { id } = useParams<{ id: string }>();
  const sellerId = Number(id);
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [seller, setSeller] = useState<PublicSeller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useDocumentTitle(seller ? `${seller.businessName} · Seller` : "Seller storefront");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([userApi.publicSeller(sellerId), productApi.list({ sellerId, pageSize: 24 })])
      .then(([sellerResult, productResult]) => {
        if (!active) return;
        setSeller(sellerResult);
        setProducts(productResult.items);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sellerId]);

  function openReport() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setReportReason(REPORT_REASONS[0]);
    setReportDetails("");
    setReportError(null);
    setReportOpen(true);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!seller) return;
    if (reportDetails.trim().length < 10) {
      setReportError("Describe the problem in at least 10 characters.");
      return;
    }
    setReporting(true);
    setReportError(null);
    try {
      await reportApi.create({
        reportedUserId: seller.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      success("Report submitted. Our team will review it.");
      setReportOpen(false);
    } catch (requestError) {
      const apiError = getApiError(requestError);
      setReportError(apiError.message);
      toastError(apiError.message);
    } finally {
      setReporting(false);
    }
  }

  if (loading) return <LoadingPage label="Loading seller storefront…" />;
  if (error || !seller) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error ?? "Seller not found."} />
        <div className="mt-4 text-center">
          <Link to="/products" className="btn-outline">Browse products</Link>
        </div>
      </div>
    );
  }

  const isSelf = user?.id === seller.id;

  return (
    <div>
      <section className="border-b border-forest-100 bg-forest-700">
        <div className="container-page py-10">
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-white/60" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <Link to="/products" className="hover:text-white">Products</Link>
            <span aria-hidden>/</span>
            <span className="text-white">{seller.businessName}</span>
          </nav>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar name={seller.businessName} src={seller.profileImageUrl} size="lg" className="ring-4 ring-white/20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{seller.businessName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-harvest">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Registered seller
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/65">
                {seller.district ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {seller.market ? `${seller.market}, ` : ""}{seller.district}
                    {seller.province ? ` · ${seller.province}` : ""}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  Member since {formatDate(seller.memberSince)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" aria-hidden />
                  {seller.activeListings} active listing{seller.activeListings === 1 ? "" : "s"}
                </span>
                {seller.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {seller.phone}
                  </span>
                ) : null}
              </div>
            </div>
            {!isSelf ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ContactSellerModal
                  sellerId={seller.id}
                  sellerName={seller.businessName}
                  label="Message seller"
                  variant="gold"
                  className="shrink-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  icon={<Flag className="h-4 w-4" aria-hidden />}
                  onClick={openReport}
                  className="shrink-0"
                >
                  Report seller
                </Button>
              </div>
            ) : (
              <Link to="/seller/profile" className="btn-gold shrink-0">Edit seller profile</Link>
            )}
          </div>
          {seller.description ? (
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70">{seller.description}</p>
          ) : null}
        </div>
      </section>

      <div className="container-page py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Storefront</p>
            <h2 className="mt-1 font-display text-xl font-bold">Products from {seller.businessName}</h2>
          </div>
          <Badge tone="green">{products.length} approved</Badge>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="No approved products yet"
            description="This seller has no available products at the moment. Check back soon."
            action={<Link to="/products" className="btn-primary">Browse other products</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Report ${seller.businessName}`}
        description="Tell us what is wrong with this seller. Reports are reviewed by marketplace administrators."
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="report-seller-form" loading={reporting} icon={<Flag className="h-4 w-4" aria-hidden />}>
              Submit report
            </Button>
          </>
        }
      >
        <form id="report-seller-form" onSubmit={submitReport} className="space-y-4">
          <Field label="Reason" htmlFor="report-seller-reason" required>
            <Select
              id="report-seller-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Details"
            htmlFor="report-seller-details"
            required
            hint="At least 10 characters. Include what happened and when."
            error={reportError ?? undefined}
          >
            <Textarea
              id="report-seller-details"
              rows={4}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              placeholder="Describe the issue with this seller or their listings."
              maxLength={2000}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
