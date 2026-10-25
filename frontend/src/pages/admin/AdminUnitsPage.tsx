import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Scale } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { Unit } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";

const schema = z.object({
  code: z.string().trim().min(1, "Enter a unit code.").max(20),
  label: z.string().trim().min(1, "Enter a label.").max(50),
  dimension: z.enum(["weight", "volume", "count", "bunch", "bag", "sack"]),
  factorToBase: z.coerce.number({ invalid_type_error: "Enter a factor." }).positive("Factor must be greater than zero."),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AdminUnitsPage() {
  useDocumentTitle("Units");
  const { success, error } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", label: "", dimension: "weight", factorToBase: 1, isActive: true },
  });

  function load() {
    setLoading(true);
    adminApi
      .adminUnits()
      .then((result) => {
        setUnits(result);
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
    reset({ code: "", label: "", dimension: "weight", factorToBase: 1, isActive: true });
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    reset({
      code: unit.code,
      label: unit.label,
      dimension: unit.dimension as FormValues["dimension"],
      factorToBase: unit.factorToBase,
      isActive: unit.isActive,
    });
    setModalOpen(true);
  }

  async function save(values: FormValues) {
    setWorking(true);
    try {
      if (editing) {
        await adminApi.updateUnit(editing.id, {
          label: values.label,
          dimension: values.dimension,
          factorToBase: values.factorToBase,
          isActive: values.isActive,
        });
        success("Unit updated.");
      } else {
        await adminApi.createUnit(values);
        success("Unit created.");
      }
      setModalOpen(false);
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
        title="Units"
        subtitle="Standard units make product prices and market comparisons consistent."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New unit
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading units…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : units.length === 0 ? (
        <EmptyState title="No units" description="Create the units sellers will use for prices and quantities." icon={<Scale className="h-6 w-6" aria-hidden />} action={<Button type="button" onClick={openCreate}>New unit</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Code</th>
                <th>Dimension</th>
                <th>Factor to base</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                        <Scale className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="font-medium">{unit.label}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{unit.code}</td>
                  <td className="text-xs capitalize">{unit.dimension}</td>
                  <td className="text-xs">{unit.factorToBase}</td>
                  <td><Badge tone={unit.isActive ? "green" : "gray"}>{unit.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td>
                    <div className="flex justify-end">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(unit)} aria-label={`Edit ${unit.label}`}>
                        <Pencil className="h-4 w-4" aria-hidden />
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
        title={editing ? "Edit unit" : "New unit"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="unit-form" loading={working}>{editing ? "Save changes" : "Create unit"}</Button>
          </>
        }
      >
        <form id="unit-form" onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <Field label="Code" htmlFor="unit-code" error={errors.code?.message} hint={editing ? "The code cannot be changed after creation." : "e.g. kg, sack, bunch"} required>
            <Input id="unit-code" disabled={Boolean(editing)} {...register("code")} />
          </Field>
          <Field label="Label" htmlFor="unit-label" error={errors.label?.message} required>
            <Input id="unit-label" placeholder="e.g. Kilogram" {...register("label")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dimension" htmlFor="unit-dimension" error={errors.dimension?.message} required>
              <Select id="unit-dimension" {...register("dimension")}>
                <option value="weight">Weight</option>
                <option value="volume">Volume</option>
                <option value="count">Count</option>
                <option value="bunch">Bunch</option>
                <option value="bag">Bag</option>
                <option value="sack">Sack</option>
              </Select>
            </Field>
            <Field label="Factor to base unit" htmlFor="unit-factor" error={errors.factorToBase?.message} hint="e.g. 1 kg = 1, 1 sack = 50" required>
              <Input id="unit-factor" type="number" min={0.0001} step="any" {...register("factorToBase")} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-forest-600" {...register("isActive")} />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}
