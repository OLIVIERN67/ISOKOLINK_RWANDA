import { useEffect, useState } from "react";
import { ChevronDown, ScrollText, Search } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { AuditLog, PaginationMeta } from "../../types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Field, Input } from "../../components/ui/Field";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDateTime } from "../../utils/format";

export function AdminAuditLogsPage() {
  useDocumentTitle("Audit logs");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .auditLogs({
        q: debouncedSearch || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 30,
      })
      .then((result) => {
        if (!active) return;
        setLogs(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
        setLoadError(null);
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
  }, [debouncedSearch, action, entityType, from, to, page]);

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit logs"
        subtitle="A chronological record of sensitive administrative and account actions."
      />

      <div className="card mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search logs…"
              className="input w-full pl-9"
              aria-label="Search audit logs"
            />
          </div>
          <Input
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            placeholder="Action, e.g. product.approved"
            aria-label="Filter by action"
          />
          <Input
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            placeholder="Entity, e.g. product"
            aria-label="Filter by entity type"
          />
          <Field label="" htmlFor="audit-from">
            <Input
              id="audit-from"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              aria-label="From date"
            />
          </Field>
          <Field label="" htmlFor="audit-to">
            <Input
              id="audit-to"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              aria-label="To date"
            />
          </Field>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading audit logs…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs found" description="Try widening the date range or clearing filters." icon={<ScrollText className="h-6 w-6" aria-hidden />} />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>IP address</th>
                  <th>Timestamp</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="font-mono text-[11px] font-semibold">{log.action}</span>
                    </td>
                    <td className="text-xs">
                      <p className="font-medium">{log.actor?.name ?? "System"}</p>
                      <p className="text-[10px] text-charcoal/45">{log.actor?.email ?? "—"}</p>
                    </td>
                    <td className="text-xs">
                      {log.entityType}
                      {log.entityId ? <span className="text-charcoal/45"> #{log.entityId}</span> : null}
                    </td>
                    <td className="font-mono text-[10px] text-charcoal/50">{log.ipAddress ?? "—"}</td>
                    <td className="text-xs text-charcoal/50">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          aria-expanded={expanded === log.id}
                        >
                          <ChevronDown className={`h-4 w-4 transition ${expanded === log.id ? "rotate-180" : ""}`} aria-hidden />
                          Metadata
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expanded !== null ? (
            <div className="card mt-3 p-4">
              {(() => {
                const log = logs.find((entry) => entry.id === expanded);
                if (!log) return null;
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="gray">{log.entityType}</Badge>
                      <span className="font-mono text-xs font-semibold">{log.action}</span>
                      <span className="text-[11px] text-charcoal/45">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-charcoal p-3 text-[11px] leading-5 text-cream">
                      {JSON.stringify(log.metadata ?? {}, null, 2)}
                    </pre>
                  </>
                );
              })()}
            </div>
          ) : null}

          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}
