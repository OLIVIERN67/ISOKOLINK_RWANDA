import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Map, Plus, Trash2 } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { LocationsResponse } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a location name.").max(100),
  type: z.enum(["province", "district", "sector", "city"]),
  parentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AdminLocationsPage() {
  useDocumentTitle("Locations");
  const { success, error } = useToast();
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "district", parentId: "" },
  });

  const type = watch("type");

  function load() {
    setLoading(true);
    adminApi
      .adminLocations()
      .then((result) => {
        setData(result);
        setLoadError(null);
      })
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    reset({ name: "", type: "district", parentId: "" });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      await adminApi.createLocation({
        name: values.name,
        type: values.type,
        parentId: values.parentId ? Number(values.parentId) : null,
      });
      success("Location created.");
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
      await adminApi.deleteLocation(deleteTarget.id);
      success("Location deleted.");
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
        title="Locations"
        subtitle="Provinces and districts used by sellers, products, and market prices."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New location
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading locations…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : !data || data.districts.length === 0 ? (
        <EmptyState title="No locations" description="Create provinces and districts before adding sellers or products." icon={<Map className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>New location</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.provinces.map((province) => (
            <section key={province.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold">{province.name}</h2>
                  <p className="text-[11px] uppercase tracking-wide text-charcoal/40">Province</p>
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-error"
                  onClick={() => setDeleteTarget({ id: province.id, name: province.name })}
                  aria-label={`Delete ${province.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <ul className="mt-3 space-y-1.5">
                {province.districts.length === 0 ? (
                  <li className="text-xs text-charcoal/40">No districts recorded.</li>
                ) : (
                  province.districts.map((district) => (
                    <li key={district.id} className="flex items-center justify-between gap-2 rounded-lg bg-cream/60 px-2.5 py-1.5 text-xs">
                      <span>{district.name}</span>
                      <button
                        type="button"
                        className="text-charcoal/35 transition hover:text-error"
                        onClick={() => setDeleteTarget({ id: district.id, name: district.name })}
                        aria-label={`Delete ${district.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New location"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="location-form" loading={working}>Create location</Button>
          </>
        }
      >
        <form id="location-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="location-name" error={errors.name?.message} required>
            <Input id="location-name" {...register("name")} />
          </Field>
          <Field label="Type" htmlFor="location-type" error={errors.type?.message} required>
            <Select id="location-type" {...register("type")}>
              <option value="province">Province</option>
              <option value="district">District</option>
              <option value="city">City</option>
              <option value="sector">Sector</option>
            </Select>
          </Field>
          {type !== "province" ? (
            <Field label="Parent province" htmlFor="location-parent" hint="Districts should belong to a province.">
              <Select id="location-parent" {...register("parentId")}>
                <option value="">No parent</option>
                {data?.provinces.map((province) => (
                  <option key={province.id} value={province.id}>{province.name}</option>
                ))}
              </Select>
            </Field>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete location?"
        description={deleteTarget ? `“${deleteTarget.name}” will be removed from reference data.` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={working} onClick={remove}>Delete location</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">Locations used by markets, products, or price records cannot be deleted until those records are reassigned.</p>
      </Modal>
    </div>
  );
}
