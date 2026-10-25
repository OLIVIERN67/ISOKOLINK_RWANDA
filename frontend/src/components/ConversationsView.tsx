import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquarePlus, Search, Send, ShoppingBasket } from "lucide-react";
import { getApiError, messagingApi } from "../services/api";
import type { Conversation, ConversationSummary } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { cn } from "../utils/cn";
import { formatCurrency, formatDayLabel, formatRelative, formatTime } from "../utils/format";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "./ui/States";
import { PageHeader } from "./ui/PageHeader";

export function ConversationsView({ basePath, title = "Messages" }: { basePath: string; title?: string }) {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? Number(id) : null;
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    messagingApi
      .conversations({ q: debouncedSearch || undefined, pageSize: 40 })
      .then((result) => {
        if (!active) return;
        setList(result.items);
        setListError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setListError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!conversationId || Number.isNaN(conversationId)) {
      setConversation(null);
      return;
    }
    let active = true;
    async function load(initial: boolean) {
      if (initial) setDetailLoading(true);
      try {
        const result = await messagingApi.get(conversationId!);
        if (!active) return;
        setConversation(result);
        setDetailError(null);
        window.dispatchEvent(new Event("isokolink:unread"));
      } catch (requestError) {
        if (!active) return;
        if (initial) setDetailError(getApiError(requestError).message);
      } finally {
        if (active && initial) setDetailLoading(false);
      }
    }
    void load(true);
    const timer = window.setInterval(() => void load(false), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.messages.length, conversationId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await messagingApi.send(conversationId, draft.trim());
      setDraft("");
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, { ...message, senderBusinessName: null }],
              lastMessageAt: message.createdAt,
            }
          : current,
      );
      setList((current) =>
        current.map((item) =>
          item.id === conversationId
            ? { ...item, lastMessage: message.body, lastMessageAt: message.createdAt, lastSenderId: user?.id ?? null, unreadCount: 0 }
            : item,
        ),
      );
      window.dispatchEvent(new Event("isokolink:unread"));
    } catch (requestError) {
      toastError(getApiError(requestError).message);
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(event);
    }
  }

  const otherParticipants = conversation?.participants.filter((participant) => participant.id !== user?.id) ?? [];
  const headerName = otherParticipants
    .map((participant) => participant.businessName || participant.name)
    .join(", ");

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Keep all buyer and seller conversations in one place."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Start from a product
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className={cn("card flex flex-col overflow-hidden", conversationId ? "hidden lg:flex" : undefined)}>
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations…"
                className="input pl-9"
                aria-label="Search conversations"
              />
            </div>
          </div>
          <div className="min-h-[240px] flex-1 overflow-y-auto lg:max-h-[calc(100vh-17rem)]">
            {listLoading ? (
              <LoadingBlock label="Loading conversations…" />
            ) : listError ? (
              <div className="p-3">
                <ErrorState message={listError} />
              </div>
            ) : list.length === 0 ? (
              <p className="p-5 text-center text-sm text-charcoal/50">
                No conversations yet. Open a product and message its seller.
              </p>
            ) : (
              list.map((item) => {
                const active = item.id === conversationId;
                const otherName = item.otherUser.businessName || item.otherUser.name;
                return (
                  <Link
                    key={item.id}
                    to={`${basePath}/${item.id}`}
                    className={cn(
                      "flex gap-3 border-b border-gray-50 px-3 py-3 transition hover:bg-cream/70",
                      active && "bg-forest-50/80",
                    )}
                  >
                    <Avatar name={otherName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-charcoal">{otherName}</p>
                        <span className="shrink-0 text-[10px] text-charcoal/40">
                          {formatRelative(item.lastMessageAt ?? item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-charcoal/50">
                        {item.productName ? `${item.productName} · ` : ""}
                        {item.lastMessage ?? "No messages yet"}
                      </p>
                    </div>
                    {item.unreadCount > 0 && !active ? (
                      <span className="mt-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest-600 px-1 text-[9px] font-bold text-white">
                        {item.unreadCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        <section className={cn("card flex min-h-[520px] flex-col overflow-hidden", !conversationId && "hidden lg:flex")}>
          {!conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation from the list to read and reply to messages."
                icon={<MessageSquarePlus className="h-6 w-6" aria-hidden />}
              />
            </div>
          ) : detailLoading && !conversation ? (
            <LoadingBlock label="Loading conversation…" />
          ) : detailError ? (
            <div className="p-4">
              <ErrorState message={detailError} />
            </div>
          ) : conversation ? (
            <>
              <header className="border-b border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <Link to={basePath} className="mt-0.5 rounded-lg p-1 text-charcoal/50 hover:bg-forest-50 hover:text-forest-700 lg:hidden" aria-label="Back to conversations">
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </Link>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-bold">{headerName || conversation.subject || "Conversation"}</h2>
                      <p className="mt-0.5 truncate text-xs text-charcoal/50">
                        {conversation.subject || "Marketplace conversation"}
                      </p>
                    </div>
                  </div>
                  <Badge tone={conversation.status === "archived" ? "gray" : "green"}>{conversation.status}</Badge>
                </div>
                {conversation.product ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream/70 p-2.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBasket className="h-4 w-4 text-forest-600" aria-hidden />
                      <div>
                        <p className="text-xs font-semibold text-charcoal">{conversation.product.name}</p>
                        <p className="text-[11px] text-charcoal/50">
                          {formatCurrency(conversation.product.price, conversation.product.currency)} listed
                        </p>
                      </div>
                    </div>
                    <Link to={`/products/${conversation.product.id}`} className="text-xs font-semibold text-forest-700 hover:underline">
                      View listing
                    </Link>
                  </div>
                ) : null}
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-cream/40 p-4 lg:max-h-[calc(100vh-24rem)]">
                {conversation.messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-charcoal/50">No messages in this conversation yet.</p>
                ) : (
                  conversation.messages.map((message, index) => {
                    const previous = conversation.messages[index - 1];
                    const showDay =
                      !previous || formatDayLabel(previous.createdAt) !== formatDayLabel(message.createdAt);
                    return (
                      <div key={message.id}>
                        {showDay ? (
                          <p className="my-3 text-center text-[10px] font-semibold uppercase tracking-wide text-charcoal/35">
                            {formatDayLabel(message.createdAt)}
                          </p>
                        ) : null}
                        <div className={cn("flex", message.isMine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] sm:max-w-[75%]")}>
                            {!message.isMine ? (
                              <p className="mb-1 pl-1 text-[10px] font-semibold text-charcoal/45">
                                {message.senderBusinessName || message.senderName}
                              </p>
                            ) : null}
                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
                                message.isMine
                                  ? "rounded-br-md bg-forest-600 text-white"
                                  : "rounded-bl-md border border-forest-100 bg-white text-charcoal",
                              )}
                            >
                              <p className="whitespace-pre-line break-words">{message.body}</p>
                            </div>
                            <p className={cn("mt-1 text-[10px] text-charcoal/35", message.isMine ? "text-right" : "text-left pl-1")}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="border-t border-gray-100 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    className="textarea min-h-[46px] max-h-32 flex-1 py-2.5"
                    rows={1}
                    maxLength={5000}
                    placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                    aria-label="Message"
                  />
                  <Button type="submit" loading={sending} disabled={!draft.trim()} className="h-[46px]">
                    <Send className="h-4 w-4" aria-hidden />
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}