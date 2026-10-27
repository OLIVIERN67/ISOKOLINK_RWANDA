import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Megaphone } from "lucide-react";
import { referenceApi, getApiError } from "../services/api";
import type { Announcement } from "../types";
import { useI18n } from "../context/I18nContext";
import { useDocumentTitle } from "../components/ScrollToTop";
import { ErrorState, LoadingBlock } from "../components/ui/States";
import { assetUrl, formatDate } from "../utils/format";

export function AnnouncementPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(announcement?.title ?? t("announcements.title"));

  useEffect(() => {
    const announcementId = Number(id);
    if (!Number.isInteger(announcementId) || announcementId <= 0) {
      setError(t("announcements.notFound"));
      setLoading(false);
      return;
    }
    referenceApi
      .announcement(announcementId)
      .then(setAnnouncement)
      .catch((requestError) => setError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <LoadingBlock label={t("common.loading")} />;
  if (error || !announcement) {
    return <div className="container-page py-12"><ErrorState message={error ?? t("announcements.notFound")} /></div>;
  }

  const image = assetUrl(announcement.imageUrl);
  return (
    <article className="container-page max-w-4xl py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("announcements.backHome")}
      </Link>
      <div className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-sm">
        {image ? <img src={image} alt="" className="max-h-[28rem] w-full object-cover" /> : null}
        <div className="p-6 sm:p-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest-600">
            <Megaphone className="h-4 w-4" aria-hidden />
            {t("announcements.eyebrow")}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">{announcement.title}</h1>
          <p className="mt-2 text-sm text-charcoal/50">{formatDate(announcement.publishedAt)}</p>
          <div className="mt-8 whitespace-pre-line text-base leading-8 text-charcoal/75">{announcement.body}</div>
        </div>
      </div>
    </article>
  );
}
