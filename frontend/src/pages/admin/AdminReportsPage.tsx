import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Search, ShieldAlert } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { PaginationMeta, ReportItem } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Select, Textarea } from "../../components/ui/Field";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDateTime, REPORT_STATUS_LABELS } from "../../utils/format";

const statuses = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

export function AdminReportsPage() {
  useDocumentTitle("Reports");
  const { success, error } = useToast();
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<ReportItem | null>(null);
  const [nextStatus, setNextStatus] = useState<"under_review" | "resolved" | "dismissed">("under_review");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  function load() {
    setLoading(true);
    adminApi
      .reports({ status, q: debouncedSearch || undefined, page, pageSize: 20 })
      .then((result) => {
        setReports(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
        setLoadError(null);
      })
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch, page]);

  function openUpdate(report: ReportItem, initial: "under_review" | "resolved" | "dismissed") {
    setTarget(report);
    setNextStatus(initial);
    setNote(report.resolutionNote ?? "");
  }

  async function update() {
    if (!target) return;
    if (nextStatus !== "under_review" && note.trim().length < 5) {
      error("Add a resolution note of at least 5 characters.");
      return;
    }
    setWorking(true);
    try {
      await adminApi.updateReport(target.id, nextStatus, note.trim() || undefined);
      success("Report updated and reporter notified.");
      setTarget(null);
      load();
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Trust & safety"
        title="Reports"
        subtitle="Review reports about listings and users, and document your decisions."
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setStatus(item.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  status === item.value ? "bg-forest-600 text-white" : "text-charcoal/60 hover:bg-forest-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search reports…"
              className="input w-full pl-9 sm:w-72"
              aria-label="Search reports"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading reports…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : reports.length === 0 ? (
        <EmptyState
          title={status === "open" ? "No open reports" : "No reports found"}
          description={status === "open" ? "Trust and safety queue is clear." : "Try another status or search term."}
          icon={<Flag className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <>
          <div className="space-y-3">
            {reports.map((report) => (
              <article key={report.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error-light text-error">
                      <ShieldAlert className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold">{report.reason}</h2>
                      <p className="mt-0.5 text-[11px] text-charcoal/50">
                        Reported by {report.reporter.name} · {formatDateTime(report.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-charcoal/60">
                        {report.product ? (
                          <>
                            Against product{" "}
                            <Link to={`/admin/products/${report.product.id}`} className="font-semibold text-forest-700 hover:underline">
                              {report.product.name}
                            </Link>
                          </>
                        ) : report.reportedUser ? (
                          <>
                            Against user{" "}
                            <Link to={`/admin/users/${report.reportedUser.id}`} className="font-semibold text-forest-700 hover:underline">
                              {report.reportedUser.name}
                            </Link>
                          </>
                        ) : (
                          "General report"
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge tone={report.status === "open" ? "red" : report.status === "under_review" ? "gold" : report.status === "resolved" ? "green" : "gray"}>
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </Badge>
                </div>

                <p className="mt-3 rounded-xl bg-cream/60 p-3 text-xs leading-5 text-charcoal/70">{report.details ?? "No additional details."}</p>

                {report.resolutionNote ? (
                  <div className="mt-2 rounded-xl border border-forest-100 bg-forest-50/50 p-3 text-xs">
                    <p className="font-semibold text-forest-700">Resolution note</p>
                    <p className="mt-0.5 text-charcoal/65">{report.resolutionNote}</p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {report.status === "open" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => openUpdate(report, "under_review")}>
                      Start review
                    </Button>
                  ) : null}
                  {report.status !== "resolved" ? (
                    <Button type="button" size="sm" onClick={() => openUpdate(report, "resolved")}>Resolve</Button>
                  ) : null}
                  {report.status !== "dismissed" ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => openUpdate(report, "dismissed")}>Dismiss</Button>
                  ) : null}
                  {report.product ? (
                    <Link to={`/admin/products/${report.product.id}`} className="btn-ghost btn-sm">Review product</Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Update report"
        description={target ? `${target.reason} · reported ${formatDateTime(target.createdAt)}` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="button" loading={working} onClick={update}>Save decision</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Status" htmlFor="report-status" required>
            <Select id="report-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}>
              <option value="under_review">Under review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </Field>
          <Field
            label="Resolution note"
            htmlFor="report-note"
            hint={nextStatus === "under_review" ? "Optional while the report is under review." : "Required when resolving or dismissing."}
            required={nextStatus !== "under_review"}
          >
            <Textarea id="report-note" rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <p className="text-xs text-charcoal/50">The reporter is notified when you save this decision.</p>
        </div>
      </Modal>
    </div>
  );
}
