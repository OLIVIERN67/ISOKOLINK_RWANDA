import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Flag,
  MapPin,
  MessageSquare,
  Package,
  RotateCcw,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { Product } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Field, Textarea } from "../../components/ui/Field";
import { ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatCurrency, formatDateTime, approvalTone, APPROVAL_LABELS, AVAILABILITY_LABELS } from "../../utils/format";

type ActionKind = "approve" | "reject" | "correction" | "suspend" | "reinstate";

const actionCopy: Record<ActionKind, { title: string; description: string; label: string; needsReason: boolean }> = {
  approve: { title: "Approve product", description: "The listing will be published to the marketplace.", label: "Approve listing", needsReason: false },
  reject: { title: "Reject product", description: "The seller will see your reason and can correct and resubmit.", label: "Reject listing", needsReason: true },
  correction: { title: "Request corrections", description: "The listing stays unpublished until the seller fixes it.", label: "Request corrections", needsReason: true },
  suspend: { title: "Suspend product", description: "The listing is removed from public view immediately.", label: "Suspend listing", needsReason: true },
  reinstate: { title: "Reinstate product", description: "Restore this listing to a reviewable state.", label: "Reinstate listing", needsReason: false },
};

export function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  useDocumentTitle("Review product");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const productId = Number(id);

  function load() {
    setLoading(true);
    adminApi
      .product(productId)
      .then(setProduct)
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function runAction() {
    if (!product || !action) return;
    const copy = actionCopy[action];
    if (copy.needsReason && reason.trim().length < 5) {
      error("Give the seller a clear reason (at least 5 characters).");
      return;
    }
    setWorking(true);
    try {
      let updated: Product;
      if (action === "approve") updated = await adminApi.approveProduct(product.id, reason.trim() || undefined);
      else if (action === "reject") updated = await adminApi.rejectProduct(product.id, reason.trim());
      else if (action === "correction") updated = await adminApi.requestCorrection(product.id, reason.trim());
      else if (action === "suspend") updated = await adminApi.suspendProduct(product.id, reason.trim());
      else updated = await adminApi.reinstateProduct(product.id, reason.trim() || undefined);
      setProduct(updated);
      setAction(null);
      setReason("");
      success(`Listing ${updated.approvalStatus === "approved" ? "approved" : updated.approvalStatus.replace(/_/g, " ")}.`);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  async function toggleFeatured() {
    if (!product) return;
    setWorking(true);
    try {
      const updated = await adminApi.featureProduct(product.id, !product.isFeatured);
      setProduct(updated);
      success(updated.isFeatured ? "Product featured." : "Product removed from featured.");
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  async function sendMessage() {
    if (!product || message.trim().length < 2) return;
    setSending(true);
    try {
      const conversation = await adminApi.startConversation({
        recipientId: product.seller.id,
        subject: `About your listing: ${product.name}`,
        message: message.trim(),
      });
      setMessageOpen(false);
      setMessage("");
      success("Message sent to the seller.");
      navigate(`/admin/conversations/${conversation.id}`);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading product…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!product) return <ErrorState message="Product not found." />;

  const images = product.images && product.images.length > 0
    ? product.images.map((image) => image.url)
    : product.primaryImage
      ? [product.primaryImage]
      : [];

  return (
    <div>
      <PageHeader
        eyebrow="Product moderation"
        title={product.name}
        subtitle={`Submitted by ${product.seller.businessName || product.seller.fullName}`}
        actions={
          <>
            <Link to="/admin/products" className="btn-outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to queue
            </Link>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}>
              <MessageSquare className="h-4 w-4" aria-hidden />
              Message seller
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="grid gap-2 p-3 sm:grid-cols-[2fr_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-cream">
                {images[0] ? (
                  <img src={images[0]} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-forest-300">
                    <Package className="h-10 w-10" aria-hidden />
                    <span className="mt-1 text-xs">No photo</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                {images.slice(1, 3).map((image) => (
                  <div key={image} className="aspect-square overflow-hidden rounded-xl bg-cream">
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                {images.length === 1 ? (
                  <div className="flex aspect-square items-center justify-center rounded-xl bg-cream text-xs text-charcoal/35 sm:aspect-auto">
                    Only 1 photo
                  </div>
                ) : null}
              </div>
            </div>
            <div className="border-t border-gray-100 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
                <Badge tone="gray">{AVAILABILITY_LABELS[product.availability]}</Badge>
                {product.isFeatured ? <Badge tone="gold">Featured</Badge> : null}
                {product.isArchived ? <Badge tone="red">Archived</Badge> : null}
              </div>
              <h2 className="mt-3 font-display text-xl font-bold">{product.name}</h2>
              <p className="mt-1 text-sm font-semibold text-forest-700">
                {formatCurrency(product.price)} / {product.unit.label}
                <span className="ml-2 text-xs font-normal text-charcoal/45">Quantity: {product.quantity} {product.unit.code}</span>
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-charcoal/70">{product.description}</p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Listing details</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-charcoal/50">Category</dt>
                <dd className="font-medium">{product.category.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Unit</dt>
                <dd className="font-medium">{product.unit.label} ({product.unit.code})</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Location</dt>
                <dd className="font-medium">{product.location.district}{product.location.province ? `, ${product.location.province}` : ""}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Market</dt>
                <dd className="font-medium">{product.market?.name ?? "No specific market"}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Created</dt>
                <dd className="font-medium">{formatDateTime(product.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Last updated</dt>
                <dd className="font-medium">{formatDateTime(product.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Moderation history</h2>
            {!product.approvalHistory || product.approvalHistory.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal/50">No moderation actions recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {product.approvalHistory.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-forest-200 pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold capitalize">{entry.action.replace(/_/g, " ")}</p>
                      <span className="text-[10px] text-charcoal/40">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-charcoal/45">{entry.adminName ?? "System"}</p>
                    {entry.reason ? <p className="mt-1 rounded-lg bg-cream/70 p-2 text-xs text-charcoal/65">{entry.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Moderation actions</h2>
            <div className="mt-3 space-y-2">
              {product.approvalStatus === "pending" || product.approvalStatus === "requires_correction" ? (
                <Button type="button" className="w-full" onClick={() => setAction("approve")}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Approve listing
                </Button>
              ) : null}
              {product.approvalStatus !== "rejected" && product.approvalStatus !== "suspended" ? (
                <>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setAction("correction")}>
                    <Flag className="h-4 w-4" aria-hidden />
                    Request corrections
                  </Button>
                  <Button type="button" variant="danger" className="w-full" onClick={() => setAction("reject")}>
                    <XCircle className="h-4 w-4" aria-hidden />
                    Reject listing
                  </Button>
                </>
              ) : null}
              {product.approvalStatus !== "suspended" ? (
                <Button type="button" variant="danger" className="w-full" onClick={() => setAction("suspend")}>
                  <XCircle className="h-4 w-4" aria-hidden />
                  Suspend listing
                </Button>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setAction("reinstate")}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Reinstate listing
                </Button>
              )}
              <Button type="button" variant="outline" className="w-full" loading={working} onClick={toggleFeatured}>
                <Sparkles className="h-4 w-4" aria-hidden />
                {product.isFeatured ? "Remove from featured" : "Mark as featured"}
              </Button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Store className="h-4 w-4 text-forest-600" aria-hidden />
              Seller
            </h2>
            <div className="mt-3">
              <p className="text-sm font-semibold">{product.seller.businessName || product.seller.fullName}</p>
              <p className="text-xs text-charcoal/50">{product.seller.fullName}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {product.seller.district ?? "Location not set"}
              </p>
              {product.seller.phone ? <p className="mt-1 text-xs text-charcoal/50">{product.seller.phone}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/admin/users/${product.seller.id}`} className="btn-outline btn-sm">View account</Link>
                <Link to={`/sellers/${product.seller.id}`} className="btn-ghost btn-sm">Storefront</Link>
              </div>
            </div>
          </section>

          <div className="card p-4">
            <p className="flex items-start gap-2 text-xs leading-5 text-charcoal/55">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
              Moderation decisions notify the seller and are recorded in the audit log. Administrators cannot moderate their own listings.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={action !== null}
        onClose={() => {
          setAction(null);
          setReason("");
        }}
        title={action ? actionCopy[action].title : ""}
        description={action ? actionCopy[action].description : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => { setAction(null); setReason(""); }}>Cancel</Button>
            <Button
              type="button"
              variant={action === "reject" || action === "suspend" ? "danger" : "primary"}
              loading={working}
              onClick={runAction}
            >
              {action ? actionCopy[action].label : "Confirm"}
            </Button>
          </>
        }
      >
        <Field
          label={action === "approve" || action === "reinstate" ? "Note to seller (optional)" : "Reason for seller"}
          htmlFor="moderation-reason"
          hint="This reason is included in the seller notification and audit history."
          required={action ? actionCopy[action].needsReason : false}
        >
          <Textarea id="moderation-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        title={`Message ${product.seller.businessName || product.seller.fullName}`}
        description="Send a private moderation message about this listing."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" loading={sending} disabled={message.trim().length < 2} onClick={sendMessage}>Send message</Button>
          </>
        }
      >
        <Field label="Message" htmlFor="seller-message" required>
          <Textarea
            id="seller-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Explain what needs attention on this listing…"
          />
        </Field>
      </Modal>
    </div>
  );
}
