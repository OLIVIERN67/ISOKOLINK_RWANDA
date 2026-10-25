import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { adminApi, getApiError, priceApi, referenceApi } from "../../services/api";
import type { Category, DistrictLocation, Market, MarketObservation, PaginationMeta, Unit } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { formatDate, formatCurrency, freshnessTone } from "../../utils/format";

const schema = z.object({
  productName: z.string().trim().min(2, "Enter a product name.").max(160),
  categoryId: z.string().min(1, "Choose a category."),
  unitId: z.string().min(1, "Choose a unit."),
  price: z.coerce.number({ invalid_type_error: "Enter a price." }).positive("Price must be greater than zero."),
  locationId: z.string().min(1, "Choose a district."),
  marketId: z.string().optional(),
  observedOn: z.string().min(1, "Choose the observation date."),
  source: z.string().trim().min(2, "Enter the price source.").max(160),
  verificationStatus: z.enum(["verified", "unverified"]),
  notes: z.string().trim().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function AdminPricesPage() {
  useDocumentTitle("Market prices");
  const { success, error } = useToast();
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [verification, setVerification] = useState<"" | "verified" | "unverified">("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [districts, setDistricts] = useState<DistrictLocation[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [editing, setEditing] = useState<MarketObservation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MarketObservation | null>(null);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: "",
      categoryId: "",
      unitId: "",
      price: 0,
      locationId: "",
      marketId: "",
      observedOn: new Date().toISOString().slice(0, 10),
      source: "",
      verificationStatus: "unverified",
      notes: "",
    },
  });

  const locationId = watch("locationId");

  function load() {
    setLoading(true);
    priceApi
      .list({ q: debouncedSearch || undefined, verificationStatus: verification || undefined, page, pageSize: 20 })
      .then((result) => {
        setObservations(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
        setLoadError(null);
      })
      .catch((requestError) => setLoadError(getApiError(requestError).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, verification, page]);

  useEffect(() => {
    Promise.all([referenceApi.categories(), referenceApi.units(), referenceApi.locations()])
      .then(([categoryResult, unitResult, locationResult]) => {
        setCategories(categoryResult);
        setUnits(unitResult);
        setDistricts(locationResult.districts);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    if (!locationId) {
      setMarkets([]);
      return;
    }
    referenceApi
      .markets(Number(locationId))
      .then((result) => {
        if (active) setMarkets(result);
      })
      .catch(() => {
        if (active) setMarkets([]);
      });
    return () => {
      active = false;
    };
  }, [locationId]);

  function openCreate() {
    setEditing(null);
    reset({
      productName: "",
      categoryId: "",
      unitId: "",
      price: 0,
      locationId: "",
      marketId: "",
      observedOn: new Date().toISOString().slice(0, 10),
      source: "",
      verificationStatus: "unverified",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(observation: MarketObservation) {
    setEditing(observation);
    reset({
      productName: observation.productName,
      categoryId: String(observation.category.id),
      unitId: String(observation.unit.id),
      price: observation.price,
      locationId: String(observation.location.id),
      marketId: observation.market ? String(observation.market.id) : "",
      observedOn: observation.observedOn.slice(0, 10),
      source: observation.source,
      verificationStatus: observation.verificationStatus,
      notes: observation.notes ?? "",
    });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      const payload = {
        productName: values.productName,
        categoryId: Number(values.categoryId),
        unitId: Number(values.unitId),
        price: values.price,
        currency: "RWF",
        locationId: Number(values.locationId),
        marketId: values.marketId ? Number(values.marketId) : null,
        observedOn: values.observedOn,
        source: values.source,
        verificationStatus: values.verificationStatus,
        notes: values.notes || null,
      };
      if (editing) {
        await adminApi.updateObservation(editing.id, payload);
        success("Price observation updated.");
      } else {
        await adminApi.createObservation(payload);
        success("Price observation created.");
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
      await adminApi.deleteObservation(deleteTarget.id);
      success("Price observation deleted.");
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
        eyebrow="Market intelligence"
        title="Market prices"
        subtitle="Record verified price observations and keep freshness visible to buyers."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Record price
          </Button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search product name…"
              className="input w-full pl-9"
              aria-label="Search price observations"
            />
          </div>
          <select
            value={verification}
            onChange={(event) => {
              setVerification(event.target.value as typeof verification);
              setPage(1);
            }}
            className="select w-auto text-xs"
            aria-label="Filter by verification"
          >
            <option value="">All observations</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading market prices…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : observations.length === 0 ? (
        <EmptyState title="No price observations" description="Record a market price to help buyers compare food costs." icon={<TrendingUp className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>Record price</Button>} />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Market / district</th>
                  <th>Observed</th>
                  <th>Freshness</th>
                  <th>Verification</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr key={observation.id}>
                    <td>
                      <p className="font-medium">{observation.productName}</p>
                      <p className="text-[11px] text-charcoal/45">{observation.category.name} · {observation.unit.label}</p>
                    </td>
                    <td className="text-xs font-semibold">{formatCurrency(observation.price)}</td>
                    <td className="text-xs">
                      {observation.market?.name ?? "—"}
                      <span className="block text-[10px] text-charcoal/45">{observation.location.district}</span>
                    </td>
                    <td className="text-xs text-charcoal/50">{formatDate(observation.observedOn)}</td>
                    <td><Badge tone={freshnessTone(observation.freshness)}>{observation.freshness}</Badge></td>
                    <td><Badge tone={observation.verificationStatus === "verified" ? "green" : "gray"}>{observation.verificationStatus}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(observation)} aria-label={`Edit ${observation.productName}`}>
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button type="button" className="btn-ghost btn-sm text-error" onClick={() => setDeleteTarget(observation)} aria-label={`Delete ${observation.productName}`}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit price observation" : "Record market price"}
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="price-form" loading={working}>{editing ? "Save changes" : "Record price"}</Button>
          </>
        }
      >
        <form id="price-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" htmlFor="price-product" error={errors.productName?.message} required>
              <Input id="price-product" placeholder="e.g. Irish potatoes" {...register("productName")} />
            </Field>
            <Field label="Category" htmlFor="price-category" error={errors.categoryId?.message} required>
              <Select id="price-category" {...register("categoryId")}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit" htmlFor="price-unit" error={errors.unitId?.message} required>
              <Select id="price-unit" {...register("unitId")}>
                <option value="">Select unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.code})</option>)}
              </Select>
            </Field>
            <Field label="Price (RWF)" htmlFor="price-price" error={errors.price?.message} required>
              <Input id="price-price" type="number" min={1} step={1} {...register("price")} />
            </Field>
            <Field label="District" htmlFor="price-location" error={errors.locationId?.message} required>
              <Select id="price-location" {...register("locationId")}>
                <option value="">Select district</option>
                {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </Select>
            </Field>
            <Field label="Market (optional)" htmlFor="price-market">
              <Select id="price-market" {...register("marketId")} disabled={!locationId || markets.length === 0}>
                <option value="">No specific market</option>
                {markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
              </Select>
            </Field>
            <Field label="Observation date" htmlFor="price-date" error={errors.observedOn?.message} required>
              <Input id="price-date" type="date" {...register("observedOn")} />
            </Field>
            <Field label="Verification" htmlFor="price-verification" error={errors.verificationStatus?.message}>
              <Select id="price-verification" {...register("verificationStatus")}>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
              </Select>
            </Field>
          </div>
          <Field label="Source" htmlFor="price-source" error={errors.source?.message} hint="e.g. Field visit, market survey, seller report" required>
            <Input id="price-source" {...register("source")} />
          </Field>
          <Field label="Notes" htmlFor="price-notes" error={errors.notes?.message}>
            <Textarea id="price-notes" rows={3} {...register("notes")} />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete price observation?"
        description={deleteTarget ? `${deleteTarget.productName} · ${formatCurrency(deleteTarget.price)} · ${formatDate(deleteTarget.observedOn)}` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={working} onClick={remove}>Delete observation</Button>
          </>
        }
      >
        <p className="text-sm text-charcoal/60">This removes the observation from public price comparisons. The action is recorded in the audit log.</p>
      </Modal>
    </div>
  );
}
