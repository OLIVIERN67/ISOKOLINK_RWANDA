import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Inbox } from "lucide-react";
import { getApiError, reportApi } from "../../services/api";
import type { ReportItem } from "../../types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDateTime, REPORT_STATUS_LABELS } from "../../utils/format";

const reasonLabels: Record<string, string> = {
  scam: "Suspected scam",
  misleading: "Misleading listing",
  prohibited: "Prohibited product",
  harassment: "Harassment or abuse",
  spam: "Spam",
  other: "Other",
};

function statusTone(status: ReportItem["status"]): "green" | "gold" | "red" | "gray" {
  if (status === "resolved") return "green";
  if (status === "under_review") return "gold";
  if (status === "open") return "red";
  return "gray";
}

export function BuyerReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    reportApi
      .mine()
      .then((result) => {
        if (active) setReports(result);
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
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Buyer workspace"
        title="My reports"
        subtitle="Reports you have submitted about listings or users, and their review status."
      />

      {loading ? (
        <LoadingBlock label="Loading your reports…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports submitted"
          description="If a listing looks misleading or unsafe, use the Report button on the product page."
          icon={<Flag className="h-6 w-6" aria-hidden />}
          action={<Link to="/dashboard/browse" className="btn-primary">Browse products</Link>}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error-light text-error">
                    <Inbox className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{reasonLabels[report.reason] ?? report.reason}</h2>
                    <p className="mt-0.5 text-xs text-charcoal/50">
                      {report.product ? (
                        <>
                          About{" "}
                          <Link to={`/products/${report.product.id}`} className="font-semibold text-forest-700 hover:underline">
                            {report.product.name}
                          </Link>
                        </>
                      ) : report.reportedUser ? (
                        `About ${report.reportedUser.name}`
                      ) : (
                        "Marketplace report"
                      )}
                      {" · "}
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone(report.status)}>{REPORT_STATUS_LABELS[report.status] ?? report.status}</Badge>
              </div>
              {report.details ? <p className="mt-3 rounded-xl bg-cream/60 p-3 text-xs leading-5 text-charcoal/65">{report.details}</p> : null}
              {report.resolutionNote ? (
                <div className="mt-3 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-700">Resolution</p>
                  <p className="mt-1 text-xs leading-5 text-charcoal/70">{report.resolutionNote}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
