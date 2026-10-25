import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  KeyRound,
  MessageSquare,
  Package,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  UserX,
} from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { AdminUserDetail } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Field, Textarea } from "../../components/ui/Field";
import { ErrorState, LoadingBlock } from "../../components/ui/States";
import { Avatar } from "../../components/ui/Avatar";
import { formatDate, formatDateTime, formatCurrency, approvalTone, APPROVAL_LABELS, REPORT_STATUS_LABELS } from "../../utils/format";

type ConfirmAction =
  | { kind: "suspend" }
  | { kind: "reactivate" }
  | { kind: "grant-seller" }
  | { kind: "revoke-seller" }
  | { kind: "grant-admin" }
  | { kind: "revoke-admin" };

const confirmCopy: Record<ConfirmAction["kind"], { title: string; description: string; label: string }> = {
  suspend: { title: "Suspend user", description: "The user will be signed out and blocked from signing in.", label: "Suspend account" },
  reactivate: { title: "Reactivate user", description: "The account will be able to sign in again.", label: "Reactivate account" },
  "grant-seller": { title: "Grant seller role", description: "The user will be able to create a seller profile and listings.", label: "Grant seller role" },
  "revoke-seller": { title: "Revoke seller role", description: "Seller access will be removed. Existing listings remain on record.", label: "Revoke seller role" },
  "grant-admin": { title: "Grant admin role", description: "The user will gain full access to the admin console.", label: "Grant admin role" },
  "revoke-admin": { title: "Revoke admin role", description: "The user will lose access to the admin console immediately.", label: "Revoke admin role" },
};

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  useDocumentTitle("User details");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const userId = Number(id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .user(userId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((requestError) => {
        if (active) setLoadError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function runConfirm() {
    if (!confirm || !detail) return;
    if (confirm.kind === "suspend" && reason.trim().length < 5) {
      error("Provide a reason of at least 5 characters.");
      return;
    }
    setWorking(true);
    try {
      let updated: AdminUserDetail;
      switch (confirm.kind) {
        case "suspend":
          updated = await adminApi.suspendUser(detail.id, reason.trim());
          break;
        case "reactivate":
          updated = await adminApi.reactivateUser(detail.id);
          break;
        case "grant-seller":
          updated = await adminApi.changeRole(detail.id, "seller", "grant");
          break;
        case "revoke-seller":
          updated = await adminApi.changeRole(detail.id, "seller", "revoke");
          break;
        case "grant-admin":
          updated = await adminApi.changeRole(detail.id, "admin", "grant");
          break;
        case "revoke-admin":
          updated = await adminApi.changeRole(detail.id, "admin", "revoke");
          break;
      }
      setDetail(updated);
      success("Account updated.");
      setConfirm(null);
      setReason("");
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  async function sendMessage() {
    if (!detail || message.trim().length < 2) return;
    setSending(true);
    try {
      const conversation = await adminApi.startConversation({
        recipientId: detail.id,
        subject: "Message from ISOKOLINK administration",
        message: message.trim(),
      });
      setMessageOpen(false);
      setMessage("");
      success("Message sent.");
      navigate(`/admin/conversations/${conversation.id}`);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading user…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!detail) return <ErrorState message="User not found." />;

  const isSelf = currentUser?.id === detail.id;

  return (
    <div>
      <PageHeader
        eyebrow="User management"
        title={detail.fullName}
        subtitle={detail.email}
        actions={
          <>
            <Link to="/admin/users" className="btn-outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to users
            </Link>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}>
              <MessageSquare className="h-4 w-4" aria-hidden />
              Message user
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={detail.fullName} src={detail.sellerProfile?.profileImageUrl} />
                <div>
                  <h2 className="font-display text-lg font-bold">{detail.fullName}</h2>
                  <p className="text-xs text-charcoal/50">{detail.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {detail.roles.map((role) => (
                      <Badge key={role} tone={role === "admin" ? "purple" : role === "seller" ? "green" : "gray"}>{role}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs">
                <Badge tone={detail.status === "active" ? "green" : detail.status === "suspended" ? "red" : "gray"}>{detail.status}</Badge>
                <p className="mt-1 text-charcoal/45">Joined {formatDate(detail.createdAt)}</p>
                <p className="text-charcoal/45">Last login {detail.lastLoginAt ? formatDateTime(detail.lastLoginAt) : "Never"}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-cream/60 p-3">
                <dt className="text-[11px] text-charcoal/50">Saved products</dt>
                <dd className="font-display text-xl font-bold">{detail.stats.savedProducts}</dd>
              </div>
              <div className="rounded-xl bg-cream/60 p-3">
                <dt className="text-[11px] text-charcoal/50">Conversations</dt>
                <dd className="font-display text-xl font-bold">{detail.stats.conversations}</dd>
              </div>
              <div className="rounded-xl bg-cream/60 p-3">
                <dt className="text-[11px] text-charcoal/50">Reports submitted</dt>
                <dd className="font-display text-xl font-bold">{detail.stats.submittedReports}</dd>
              </div>
              <div className="rounded-xl bg-cream/60 p-3">
                <dt className="text-[11px] text-charcoal/50">Reports received</dt>
                <dd className="font-display text-xl font-bold">{detail.stats.receivedReports}</dd>
              </div>
            </dl>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-charcoal/50">Phone</dt>
                <dd className="font-medium">{detail.phone ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Email verified</dt>
                <dd className="font-medium">{detail.isEmailVerified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-xs text-charcoal/50">Preferred language</dt>
                <dd className="font-medium uppercase">{detail.preferredLanguage}</dd>
              </div>
            </dl>
          </section>

          {detail.sellerProfile ? (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Store className="h-4 w-4 text-forest-600" aria-hidden />
                Seller profile
              </h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-charcoal/50">Business name</dt>
                  <dd className="font-medium">{detail.sellerProfile.businessName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Status</dt>
                  <dd><Badge tone={detail.sellerProfile.status === "active" ? "green" : "red"}>{detail.sellerProfile.status}</Badge></dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Location</dt>
                  <dd className="font-medium">{detail.sellerProfile.district ?? "Not set"}{detail.sellerProfile.market ? ` · ${detail.sellerProfile.market}` : ""}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Contact preference</dt>
                  <dd className="font-medium capitalize">{detail.sellerProfile.preferredContact}</dd>
                </div>
              </dl>
              {detail.sellerProfile.description ? <p className="mt-3 text-xs leading-5 text-charcoal/60">{detail.sellerProfile.description}</p> : null}
              <div className="mt-3 flex gap-2">
                <Link to={`/sellers/${detail.sellerProfile.id}`} className="btn-outline btn-sm">View storefront</Link>
              </div>
            </section>
          ) : null}

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Package className="h-4 w-4 text-forest-600" aria-hidden />
                Recent products
              </h2>
              <span className="text-xs text-charcoal/45">{detail.productCount} total</span>
            </div>
            <div className="divide-y divide-gray-100">
              {detail.recentProducts.length === 0 ? (
                <p className="p-4 text-sm text-charcoal/50">No products submitted.</p>
              ) : (
                detail.recentProducts.map((product) => (
                  <Link key={product.id} to={`/admin/products/${product.id}`} className="flex items-center justify-between gap-3 p-3 transition hover:bg-cream/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-[11px] text-charcoal/45">{formatCurrency(product.price)} · {formatDate(product.updatedAt)}</p>
                    </div>
                    <Badge tone={approvalTone(product.approvalStatus)}>{APPROVAL_LABELS[product.approvalStatus] ?? product.approvalStatus}</Badge>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-gray-100 p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <ShieldAlert className="h-4 w-4 text-error" aria-hidden />
                Recent reports
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {detail.recentReports.length === 0 ? (
                <p className="p-4 text-sm text-charcoal/50">No reports involving this user.</p>
              ) : (
                detail.recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{report.reason.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-charcoal/45">{formatDateTime(report.createdAt)}</p>
                    </div>
                    <Badge tone={report.status === "open" ? "red" : report.status === "resolved" ? "green" : "gold"}>
                      {REPORT_STATUS_LABELS[report.status] ?? report.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <ShieldCheck className="h-4 w-4 text-forest-600" aria-hidden />
              Account actions
            </h2>
            {isSelf ? (
              <p className="mt-2 rounded-xl bg-harvest-light/30 p-3 text-xs text-harvest-dark">
                You cannot change your own roles or suspend your own account.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {detail.status === "active" ? (
                  <Button type="button" variant="danger" className="w-full" onClick={() => { setReason(""); setConfirm({ kind: "suspend" }); }}>
                    <UserX className="h-4 w-4" aria-hidden />
                    Suspend account
                  </Button>
                ) : (
                  <Button type="button" className="w-full" onClick={() => setConfirm({ kind: "reactivate" })}>
                    <UserCheck className="h-4 w-4" aria-hidden />
                    Reactivate account
                  </Button>
                )}
                {!detail.roles.includes("seller") ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setConfirm({ kind: "grant-seller" })}>
                    <Store className="h-4 w-4" aria-hidden />
                    Grant seller role
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setConfirm({ kind: "revoke-seller" })}>
                    Revoke seller role
                  </Button>
                )}
                {!detail.roles.includes("admin") ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setConfirm({ kind: "grant-admin" })}>
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Grant admin role
                  </Button>
                ) : (
                  <Button type="button" variant="danger" className="w-full" onClick={() => setConfirm({ kind: "revoke-admin" })}>
                    Revoke admin role
                  </Button>
                )}
              </div>
            )}
          </section>
          <div className="card p-4">
            <p className="text-xs leading-5 text-charcoal/55">
              All account actions are audit logged. Suspended users are notified and existing sessions are revoked by the server.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => { setConfirm(null); setReason(""); }}
        title={confirm ? confirmCopy[confirm.kind].title : ""}
        description={confirm ? confirmCopy[confirm.kind].description : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => { setConfirm(null); setReason(""); }}>Cancel</Button>
            <Button
              type="button"
              variant={confirm && (confirm.kind === "suspend" || confirm.kind === "revoke-admin") ? "danger" : "primary"}
              loading={working}
              onClick={runConfirm}
            >
              {confirm ? confirmCopy[confirm.kind].label : "Confirm"}
            </Button>
          </>
        }
      >
        {confirm?.kind === "suspend" ? (
          <Field label="Reason" htmlFor="suspend-reason" hint="The user will see this reason in their notification." required>
            <Textarea id="suspend-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        ) : (
          <p className="text-sm text-charcoal/60">Confirm this account change. This action is recorded in the audit log.</p>
        )}
      </Modal>

      <Modal
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        title={`Message ${detail.fullName}`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" loading={sending} disabled={message.trim().length < 2} onClick={sendMessage}>Send message</Button>
          </>
        }
      >
        <Field label="Message" htmlFor="admin-user-message" required>
          <Textarea
            id="admin-user-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a clear, professional message…"
          />
        </Field>
      </Modal>
    </div>
  );
}
