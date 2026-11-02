import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Users,
} from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type {
  AdminConversationDetail,
  AdminConversationSummary,
  PaginationMeta,
} from "../../types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { cn } from "../../utils/cn";
import { formatDateTime, formatRelative, formatTime } from "../../utils/format";

const ACCESS_REASONS = [
  "Support review",
  "Security review",
  "Dispute resolution",
  "Abuse investigation",
  "Account recovery",
];

export function AdminConversationsPage() {
  useDocumentTitle("Chat monitoring");
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? Number(id) : null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const participantIdValue = Number(searchParams.get("participantId"));
  const participantId = Number.isFinite(participantIdValue) && participantIdValue > 0 ? participantIdValue : undefined;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState(ACCESS_REASONS[0]);
  const [page, setPage] = useState(1);
  const [conversations, setConversations] = useState<AdminConversationSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError(null);
    adminApi
      .conversations({
        q: debouncedSearch || undefined,
        status,
        participantId,
        page,
        pageSize: 20,
      })
      .then((result) => {
        if (!active) return;
        setConversations(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
      })
      .catch((requestError) => {
        if (active) setListError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, status, participantId, page]);

  useEffect(() => {
    if (!conversationId || Number.isNaN(conversationId)) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError(null);
    adminApi
      .conversation(conversationId, { reason })
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((requestError) => {
        if (active) setDetailError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [conversationId, reason]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.messages.length, conversationId]);

  function openConversation(targetId: number) {
    navigate(`/admin/chats/${targetId}`);
  }

  const detailTitle =
    detail?.participants.map((participant) => participant.businessName || participant.name).join(", ") ||
    detail?.subject ||
    "Conversation";

  return (
    <div>
      <PageHeader
        eyebrow="Trust and safety"
        title="Chat monitoring"
        subtitle="Review buyer and seller conversations for support, security, and dispute-resolution purposes."
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-forest-100 bg-forest-50/70 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden />
        <div className="text-xs leading-5 text-charcoal/65">
          <p className="font-semibold text-charcoal">Every review is audit logged.</p>
          <p>
            Chat access is limited to authorized administrators. Choose an access purpose before opening a
            conversation; the administrator, purpose, time and IP address are recorded. Reviews are read-only and
            do not mark messages as read for participants.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className={cn("card flex flex-col overflow-hidden", conversationId ? "hidden lg:flex" : undefined)}>
          <div className="space-y-2 border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search participants, subject, or message text…"
                className="input pl-9"
                aria-label="Search conversations"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="select w-full text-xs"
                aria-label="Filter conversations by status"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="select w-full text-xs"
                aria-label="Access purpose"
                title="The purpose recorded in the audit log"
              >
                {ACCESS_REASONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-[280px] flex-1 overflow-y-auto lg:max-h-[calc(100vh-24rem)]">
            {listLoading ? (
              <LoadingBlock label="Loading conversations…" />
            ) : listError ? (
              <div className="p-3">
                <ErrorState message={listError} />
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-5 text-center text-sm text-charcoal/50">No conversations match these filters.</p>
            ) : (
              conversations.map((conversation) => {
                const names = conversation.participants
                  .map((participant) => participant.businessName || participant.name)
                  .join(", ");
                const active = conversation.id === conversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                    className={cn(
                      "flex w-full gap-3 border-b border-gray-50 px-3 py-3 text-left transition hover:bg-cream/70",
                      active && "bg-forest-50/80",
                    )}
                  >
                    <Avatar name={names || "Conversation"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-charcoal">
                          {names || "Conversation"}
                        </p>
                        <span className="shrink-0 text-[10px] text-charcoal/40">
                          {formatRelative(conversation.lastMessageAt ?? conversation.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-charcoal/50">
                        {conversation.productName ? `${conversation.productName} · ` : ""}
                        {conversation.lastMessage ?? "No messages yet"}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge tone={conversation.status === "open" ? "green" : "gray"}>
                          {conversation.status}
                        </Badge>
                        <span className="text-[10px] text-charcoal/40">
                          {conversation.messageCount} messages
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {meta ? (
            <div className="border-t border-gray-100 p-3">
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
            </div>
          ) : null}
        </aside>

        <section className={cn("card flex min-h-[540px] flex-col overflow-hidden", !conversationId && "hidden lg:flex")}>
          {!conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation to review its participants and messages. Access is audit logged."
                icon={<Eye className="h-6 w-6" aria-hidden />}
              />
            </div>
          ) : detailLoading && !detail ? (
            <LoadingBlock label="Opening conversation…" />
          ) : detailError ? (
            <div className="p-4">
              <ErrorState message={detailError} />
            </div>
          ) : detail ? (
            <>
              <header className="border-b border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <Link
                      to="/admin/chats"
                      className="mt-0.5 rounded-lg p-1 text-charcoal/50 hover:bg-forest-50 hover:text-forest-700 lg:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </Link>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-bold">{detailTitle}</h2>
                      <p className="mt-0.5 truncate text-xs text-charcoal/50">
                        {detail.subject || "Marketplace conversation"} · {formatDateTime(detail.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge tone={detail.status === "open" ? "green" : "gray"}>{detail.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.participants.map((participant) => (
                    <Link
                      key={participant.id}
                      to={`/admin/users/${participant.id}`}
                      className="flex items-center gap-2 rounded-xl border border-gray-100 bg-cream/50 px-2.5 py-1.5 text-[11px] transition hover:border-forest-200 hover:bg-forest-50/60"
                    >
                      <Avatar name={participant.name} size="sm" />
                      <span>
                        <span className="block font-semibold text-charcoal">
                          {participant.businessName || participant.name}
                        </span>
                        <span className="block text-charcoal/45">
                          {participant.roles.join(", ") || "user"} · {participant.status}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                {detail.product ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream/70 p-2.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBasket className="h-4 w-4 text-forest-600" aria-hidden />
                      <div>
                        <p className="text-xs font-semibold text-charcoal">{detail.product.name}</p>
                        <p className="text-[11px] text-charcoal/50">
                          {detail.product.currency} {detail.product.price.toLocaleString()} listed
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/admin/products/${detail.product.id}`}
                      className="text-xs font-semibold text-forest-700 hover:underline"
                    >
                      Review listing
                    </Link>
                  </div>
                ) : null}

                <p className="mt-3 rounded-xl bg-harvest-light/20 px-3 py-2 text-[11px] text-charcoal/60">
                  Read-only review. Access purpose: <span className="font-semibold">{detail.access.reason ?? reason}</span>.
                  Logged at {formatTime(detail.access.reviewedAt)}.
                </p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-cream/40 p-4 lg:max-h-[calc(100vh-26rem)]">
                {detail.messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-charcoal/50">No messages in this conversation.</p>
                ) : (
                  detail.messages.map((message) => (
                    <div key={message.id} className="flex justify-start">
                      <div className="max-w-[90%] sm:max-w-[78%]">
                        <p className="mb-1 pl-1 text-[10px] font-semibold text-charcoal/45">
                          {message.senderBusinessName || message.senderName}
                        </p>
                        <div className="rounded-2xl rounded-bl-md border border-forest-100 bg-white px-3.5 py-2.5 text-sm leading-6 text-charcoal shadow-sm">
                          <p className="whitespace-pre-line break-words">{message.body}</p>
                        </div>
                        <p className="mt-1 pl-1 text-[10px] text-charcoal/35">{formatTime(message.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>
            </>
          ) : null}
        </section>
      </div>

      {!conversationId ? (
        <div className="mt-4 flex items-center gap-2 text-[11px] text-charcoal/45">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Showing all platform conversations. Use filters to narrow by participant or message content.
          <Users className="ml-2 h-3.5 w-3.5" aria-hidden />
          {meta?.total ?? 0} total
        </div>
      ) : null}
    </div>
  );
}
