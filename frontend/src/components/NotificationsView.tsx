import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Megaphone,
  MessageSquare,
  Package,
  ShieldAlert,
  UserCog,
} from "lucide-react";
import { getApiError, notificationApi } from "../services/api";
import type { NotificationItem, PaginationMeta } from "../types";
import { useToast } from "../context/ToastContext";
import { useI18n } from "../context/I18nContext";
import { formatRelative } from "../utils/format";
import { cn } from "../utils/cn";
import { Button } from "./ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "./ui/States";
import { PageHeader } from "./ui/PageHeader";
import { Pagination } from "./ui/Pagination";

function iconFor(type: string) {
  if (type.startsWith("product")) return Package;
  if (type === "message") return MessageSquare;
  if (type === "report" || type === "security") return ShieldAlert;
  if (type === "account") return UserCog;
  if (type === "announcement") return Megaphone;
  return Bell;
}

export function NotificationsView() {
  const { t } = useI18n();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await notificationApi.list({ page, pageSize: 20, unreadOnly });
      setItems(result.items);
      setMeta(result.meta as unknown as PaginationMeta);
    } catch (requestError) {
      setLoadError(getApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openNotification(item: NotificationItem) {
    try {
      if (!item.isRead) {
        await notificationApi.markRead(item.id);
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)));
        window.dispatchEvent(new Event("isokolink:unread"));
      }
      if (item.link) navigate(item.link);
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((entry) => ({ ...entry, isRead: true })));
      setMeta((current) => (current ? { ...current, total: 0 } : current));
      window.dispatchEvent(new Event("isokolink:unread"));
      success(t("notifications.markAllRead"));
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("nav.notifications")}
        subtitle={t("notifications.description")}
        actions={
          <Button type="button" variant="outline" onClick={markAll} loading={markingAll}>
            <CheckCheck className="h-4 w-4" aria-hidden />
            {t("notifications.markAllRead")}
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={cn("flex-1 rounded-lg px-3 py-2 transition sm:flex-none", !unreadOnly ? "bg-forest-600 text-white" : "text-charcoal/60 hover:bg-forest-50")}
        >
          {t("notifications.all")}
        </button>
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={cn("flex-1 rounded-lg px-3 py-2 transition sm:flex-none", unreadOnly ? "bg-forest-600 text-white" : "text-charcoal/60 hover:bg-forest-50")}
        >
          {t("notifications.unreadOnly")}
        </button>
      </div>

      {loading ? (
        <LoadingBlock label="Loading notifications…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? t("notifications.noUnread") : t("notifications.none")}
          description={
            unreadOnly
              ? t("notifications.caughtUp")
              : t("notifications.emptyDescription")
          }
          icon={<Bell className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <div className="card divide-y divide-gray-100 overflow-hidden">
          {items.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void openNotification(item)}
                className={cn(
                  "flex w-full items-start gap-3 p-4 text-left transition hover:bg-cream/60",
                  !item.isRead && "bg-forest-50/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    item.isRead ? "bg-lightgray text-gray-500" : "bg-forest-100 text-forest-700",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", item.isRead ? "font-medium text-charcoal/75" : "font-semibold text-charcoal")}>
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-charcoal/40">{formatRelative(item.createdAt)}</span>
                  </span>
                  {item.body ? <span className="mt-0.5 block text-xs leading-5 text-charcoal/55">{item.body}</span> : null}
                  {item.link ? <span className="mt-1 block text-[11px] font-semibold text-forest-700">{t("notifications.open")}</span> : null}
                </span>
                {!item.isRead ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-forest-600" aria-label={t("notifications.unread")} /> : null}
              </button>
            );
          })}
        </div>
      )}

      {meta ? (
        <Pagination
          className="mt-6"
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onChange={setPage}
        />
      ) : null}
    </div>
  );
}
