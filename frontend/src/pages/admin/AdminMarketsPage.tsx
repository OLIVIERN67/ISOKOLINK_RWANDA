import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { DistrictLocation, Market } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the market name.").max(120),
  locationId: z.string().min(1, "Choose a district."),
  address: z.string().trim().max(255).optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AdminMarketsPage() {
  useDocumentTitle("Markets");
  const { success, error } = useToast();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [districts, setDistricts] = useState<DistrictLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Market | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Market | null>(null);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", locationId: "", address: "", isActive: true },
  });

  function load() {
    setLoading(true);
    Promise.all([adminApi.adminMarkets(), adminApi.adminLocations()])
      .then(([marketResult, locationResult]) => {
        setMarkets(marketResult);
        setDistricts(locationResult.districts);
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
    reset({ name: "", locationId: "", address: "", isActive: true });
    setModalOpen(true);
  }

  function openEdit(market: Market) {
    setEditing(market);
    reset({
      name: market.name,
      locationId: String(market.locationId),
      address: market.address ?? "",
      isActive: market.isActive,
    });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      const payload = {
        name: values.name,
        locationId: Number(values.locationId),
        address: values.address || null,
        isActive: values.isActive,
      };
      if (editing) {
        await adminApi.updateMarket(editing.id, payload);
        success("Market updated.");
      } else {
        await adminApi.createMarket(payload);
        success("Market created.");
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
      const result = await adminApi.deleteMarket(deleteTarget.id);
      success(result.deleted ? "Market deleted." : "Market is in use, so it was deactivated instead.");
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
        title="Markets"
        subtitle="Maintain the markets buyers and sellers can select."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New market
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading markets…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : markets.length === 0 ? (
        <EmptyState title="No markets" description="Add markets so sellers can attach listings to a physical market." icon={<Store className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>New market</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>District</th>
                <th>Province</th>
                <th>Address</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                        <MapPin className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="font-medium">{market.name}</span>
                    </div>
                  </td>
                  <td className="text-xs">{market.district}</td>
                  <td className="text-xs text-charcoal/50">{market.province ?? "—"}</td>
                  <td className="text-xs text-charcoal/50">{market.address ?? "—"}</td>
                  <td><Badge tone={market.isActive ? "green" : "gray"}>{market.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(market)} aria-label={`Edit ${market.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" className="btn-ghost btn-sm text-error" onClick={() => setDeleteTarget(market)} aria-label={`Delete ${market.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit market" : "New market"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="market-form" loading={working}>{editing ? "Save changes" : "Create market"}</Button>
          </>
        }
      >
        <form id="market-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <Field label="Market name" htmlFor="market-name" error={errors.name?.message} required>
            <Input id="market-name" placeholder="e.g. Nyabugogo Market" {...register("name")} />
          </Field>
          <Field label="District" htmlFor="market-location" error={errors.locationId?.message} required>
            <Select id="market-location" {...register("locationId")}>
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>{district.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Address" htmlFor="market-address" error={errors.address?.message}>
            <Input id="market-address" placeholder="Street, sector, or landmark" {...register("address")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-forest-600" {...register("isActive")} />
            Active
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete market?"
        description={deleteTarget ? `“${deleteTarget.name}” will be removed from reference data.` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={working} onClick={remove}>Delete market</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">Markets linked to products or price records are deactivated instead of deleted.</p>
      </Modal>
    </div>
  );
}
