import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Megaphone, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { Announcement } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDateTime } from "../../utils/format";

const schema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  body: z.string().trim().min(10, "Write at least 10 characters.").max(10000),
  audience: z.enum(["all", "buyers", "sellers"]),
  isPublished: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AdminAnnouncementsPage() {
  useDocumentTitle("Announcements");
  const { success, error } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", audience: "all", isPublished: false },
  });

  function load() {
    setLoading(true);
    adminApi
      .announcements()
      .then((result) => {
        setItems(result);
        setLoadError(null);
      })
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    reset({ title: "", body: "", audience: "all", isPublished: false });
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    reset({ title: item.title, body: item.body, audience: item.audience, isPublished: item.isPublished });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      if (editing) {
        await adminApi.updateAnnouncement(editing.id, values);
        success(values.isPublished ? "Announcement saved and published." : "Announcement saved as draft.");
      } else {
        await adminApi.createAnnouncement(values);
        success(values.isPublished ? "Announcement published." : "Draft created.");
      }
      setModalOpen(false);
      load();
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  async function togglePublish(item: Announcement) {
    setWorking(true);
    try {
      await adminApi.updateAnnouncement(item.id, { isPublished: !item.isPublished });
      success(item.isPublished ? "Announcement unpublished." : "Announcement published.");
      load();
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setWorking(true);
    try {
      await adminApi.deleteAnnouncement(deleteTarget.id);
      success("Announcement deleted.");
      setDeleteTarget(null);
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
        eyebrow="Communications"
        title="Announcements"
        subtitle="Publish marketplace updates to buyers, sellers, or everyone."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New announcement
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading announcements…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : items.length === 0 ? (
        <EmptyState title="No announcements" description="Publish an update to keep the community informed." icon={<Megaphone className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>New announcement</Button>} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-harvest-light/40 text-harvest-dark">
                    <Megaphone className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">{item.title}</h2>
                    <p className="mt-0.5 text-[11px] text-charcoal/45">
                      {item.createdBy?.name ?? "Admin"} · {formatDateTime(item.createdAt)}
                      {item.publishedAt ? ` · Published ${formatDateTime(item.publishedAt)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge tone={item.isPublished ? "green" : "gray"}>{item.isPublished ? "Published" : "Draft"}</Badge>
                  <Badge tone={item.audience === "all" ? "purple" : item.audience === "sellers" ? "gold" : "green"}>{item.audience}</Badge>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-charcoal/65">{item.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button type="button" size="sm" variant={item.isPublished ? "ghost" : "primary"} loading={working} onClick={() => void togglePublish(item)}>
                  <Send className="h-4 w-4" aria-hidden />
                  {item.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-error" onClick={() => setDeleteTarget(item)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit announcement" : "New announcement"}
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="announcement-form" loading={working}>{editing ? "Save changes" : "Create announcement"}</Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <Field label="Title" htmlFor="announcement-title" error={errors.title?.message} required>
            <Input id="announcement-title" {...register("title")} />
          </Field>
          <Field label="Message" htmlFor="announcement-body" error={errors.body?.message} required>
            <Textarea id="announcement-body" rows={7} {...register("body")} />
          </Field>
          <Field label="Audience" htmlFor="announcement-audience" error={errors.audience?.message}>
            <Select id="announcement-audience" {...register("audience")}>
              <option value="all">Everyone</option>
              <option value="buyers">Buyers</option>
              <option value="sellers">Sellers</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-forest-600" {...register("isPublished")} />
            Publish immediately
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete announcement?"
        description={deleteTarget?.title}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={working} onClick={remove}>Delete announcement</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">This permanently removes the announcement. This action is audit logged.</p>
      </Modal>
    </div>
  );
}
