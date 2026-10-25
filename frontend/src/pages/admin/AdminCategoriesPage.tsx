import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { Category } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(100),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AdminCategoriesPage() {
  useDocumentTitle("Categories");
  const { success, error } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", description: "", imageUrl: "", isActive: true },
  });

  function load() {
    setLoading(true);
    adminApi
      .adminCategories()
      .then(setCategories)
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    reset({ name: "", slug: "", description: "", imageUrl: "", isActive: true });
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      isActive: category.isActive,
    });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        imageUrl: values.imageUrl || null,
        isActive: values.isActive,
      };
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
        success("Category updated.");
      } else {
        await adminApi.createCategory(payload);
        success("Category created.");
      }
      setModalOpen(false);
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
      const result = await adminApi.deleteCategory(deleteTarget.id);
      success(result.deleted ? "Category deleted." : "Category has products, so it was deactivated instead.");
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
        eyebrow="Reference data"
        title="Categories"
        subtitle="Organize marketplace products into discoverable food categories."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New category
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading categories…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : categories.length === 0 ? (
        <EmptyState title="No categories" description="Create your first product category." icon={<FolderTree className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>New category</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-forest-50 text-forest-700">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FolderTree className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                  <div>
                    <h2 className="font-semibold">{category.name}</h2>
                    <p className="text-[11px] text-charcoal/45">/{category.slug}</p>
                  </div>
                </div>
                <Badge tone={category.isActive ? "green" : "gray"}>{category.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              {category.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-charcoal/55">{category.description}</p> : null}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-charcoal/45">{category.productCount} products</span>
                <div className="flex gap-1">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(category)} aria-label={`Edit ${category.name}`}>
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-error" onClick={() => setDeleteTarget(category)} aria-label={`Delete ${category.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit category" : "New category"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="category-form" loading={working}>{editing ? "Save changes" : "Create category"}</Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="category-name" error={errors.name?.message} required>
            <Input id="category-name" {...register("name")} />
          </Field>
          <Field label="Slug" htmlFor="category-slug" hint="Leave blank to generate from the name.">
            <Input id="category-slug" {...register("slug")} />
          </Field>
          <Field label="Description" htmlFor="category-description" error={errors.description?.message}>
            <Textarea id="category-description" rows={3} {...register("description")} />
          </Field>
          <Field label="Image URL" htmlFor="category-image" hint="Use an uploaded /uploads/... path or an HTTPS image URL.">
            <Input id="category-image" {...register("imageUrl")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-forest-600" {...register("isActive")} />
            Active (visible to sellers and buyers)
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete category?"
        description={deleteTarget ? `“${deleteTarget.name}” has ${deleteTarget.productCount} products.` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={working} onClick={remove}>Delete category</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">
          Categories with existing products are deactivated instead of deleted, so historical listings keep their category.
        </p>
      </Modal>
    </div>
  );
}
