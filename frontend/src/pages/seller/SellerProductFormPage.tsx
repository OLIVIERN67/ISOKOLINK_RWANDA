import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Info, Save, TriangleAlert } from "lucide-react";
import { getApiError, productApi, referenceApi } from "../../services/api";
import type { Category, DistrictLocation, Market, Unit } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { LoadingBlock, ErrorState } from "../../components/ui/States";
import { ImageUploader } from "../../components/ImageUploader";
import { approvalTone, APPROVAL_LABELS, formatDateTime } from "../../utils/format";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(160, "Product name is too long."),
  description: z
    .string()
    .trim()
    .min(20, "Describe the product in at least 20 characters.")
    .max(5000, "Description is too long."),
  categoryId: z.string().min(1, "Choose a category."),
  unitId: z.string().min(1, "Choose a unit."),
  price: z.coerce.number({ invalid_type_error: "Enter a price." }).positive("Price must be greater than zero.").max(999999999),
  quantity: z.coerce.number({ invalid_type_error: "Enter a quantity." }).min(0, "Quantity cannot be negative.").max(999999999),
  locationId: z.string().min(1, "Choose a district."),
  marketId: z.string().optional(),
  availability: z.enum(["available", "unavailable", "sold"]),
});

type FormValues = z.infer<typeof schema>;

export function SellerProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? "Edit product" : "Add product");
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [districts, setDistricts] = useState<DistrictLocation[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [approval, setApproval] = useState<{ status: string; reason: string | null; history: NonNullable<Awaited<ReturnType<typeof productApi.sellerGet>>["approvalHistory"]> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      unitId: "",
      price: 0,
      quantity: 0,
      locationId: "",
      marketId: "",
      availability: "available",
    },
  });

  const locationId = watch("locationId");

  useEffect(() => {
    let active = true;
    Promise.all([
      referenceApi.categories(),
      referenceApi.units(),
      referenceApi.locations(),
      id ? productApi.sellerGet(Number(id)) : Promise.resolve(null),
    ])
      .then(([categoryResult, unitResult, locationResult, product]) => {
        if (!active) return;
        setCategories(categoryResult);
        setUnits(unitResult);
        setDistricts(locationResult.districts);
        if (product) {
          reset({
            name: product.name,
            description: product.description,
            categoryId: String(product.category.id),
            unitId: String(product.unit.id),
            price: product.price,
            quantity: product.quantity,
            locationId: String(product.location.id),
            marketId: product.market ? String(product.market.id) : "",
            availability: product.availability,
          });
          setImages(
            product.images && product.images.length > 0
              ? product.images.map((image) => image.url)
              : product.primaryImage
                ? [product.primaryImage]
                : [],
          );
          setApproval({
            status: product.approvalStatus,
            reason: product.rejectionReason,
            history: product.approvalHistory ?? [],
          });
        }
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
  }, [id, reset]);

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

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      description: values.description,
      categoryId: Number(values.categoryId),
      unitId: Number(values.unitId),
      price: values.price,
      quantity: values.quantity,
      currency: "RWF",
      locationId: Number(values.locationId),
      marketId: values.marketId ? Number(values.marketId) : null,
      availability: values.availability,
      images,
    };
    try {
      if (isEdit) {
        await productApi.update(Number(id), payload);
        success("Product updated. Changed listings are sent for re-approval when required.");
      } else {
        await productApi.create(payload);
        success("Product submitted for admin review.");
      }
      navigate("/seller/products");
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  if (loading) return <LoadingBlock label={isEdit ? "Loading product…" : "Preparing form…"} />;
  if (loadError) return <ErrorState message={loadError} />;

  const needsAttention = approval && (approval.status === "rejected" || approval.status === "requires_correction");

  return (
    <div>
      <PageHeader
        eyebrow="Seller workspace"
        title={isEdit ? "Edit product" : "Add product"}
        subtitle={
          isEdit
            ? "Update your listing details. Significant changes may require admin re-approval."
            : "Provide accurate details and clear photos. An administrator reviews every new listing."
        }
        actions={
          <Link to="/seller/products" className="btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to products
          </Link>
        }
      />

      {approval ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-charcoal/50">Moderation status:</span>
          <Badge tone={approvalTone(approval.status)}>{APPROVAL_LABELS[approval.status] ?? approval.status}</Badge>
          {approval.status === "approved" ? (
            <span className="text-xs text-charcoal/50">Editing price, name, category, unit, location, or description resubmits the listing.</span>
          ) : null}
        </div>
      ) : null}

      {needsAttention && approval?.reason ? (
        <Alert tone="error" title={approval.status === "rejected" ? "This product was rejected" : "Corrections requested"} className="mb-4">
          <p className="text-sm leading-6">{approval.reason}</p>
          <p className="mt-1 text-xs text-charcoal/55">Fix the highlighted issues, then save the product to resubmit it for review.</p>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Product information</h2>
            <div className="mt-4 space-y-4">
              <Field label="Product name" htmlFor="name" error={errors.name?.message} required>
                <Input id="name" placeholder="e.g. Fresh tomatoes — Grade A" {...register("name")} />
              </Field>
              <Field
                label="Description"
                htmlFor="description"
                error={errors.description?.message}
                hint="Include variety, quality, packaging, and anything buyers should know."
                required
              >
                <Textarea id="description" rows={5} {...register("description")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="categoryId" error={errors.categoryId?.message} required>
                  <Select id="categoryId" {...register("categoryId")}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Unit" htmlFor="unitId" error={errors.unitId?.message} hint="The unit the price applies to." required>
                  <Select id="unitId" {...register("unitId")}>
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.label} ({unit.code})</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Price & availability</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Price (RWF)" htmlFor="price" error={errors.price?.message} required>
                <Input id="price" type="number" min={1} step={1} {...register("price")} />
              </Field>
              <Field label="Quantity available" htmlFor="quantity" error={errors.quantity?.message} required>
                <Input id="quantity" type="number" min={0} step={0.01} {...register("quantity")} />
              </Field>
              <Field label="Availability" htmlFor="availability" error={errors.availability?.message}>
                <Select id="availability" {...register("availability")}>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="sold">Sold out</option>
                </Select>
              </Field>
            </div>
            <p className="mt-2 text-xs text-charcoal/50">Price is in Rwandan francs (RWF). Quantity is measured in the selected unit.</p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Location</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="District" htmlFor="locationId" error={errors.locationId?.message} required>
                <Select id="locationId" {...register("locationId")}>
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Market (optional)" htmlFor="marketId" hint={locationId ? "Pick the market where the product is sold." : "Choose a district first."}>
                <Select id="marketId" {...register("marketId")} disabled={!locationId || markets.length === 0}>
                  <option value="">No specific market</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>{market.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-base font-bold">Photos</h2>
            <p className="mb-3 mt-1 text-xs text-charcoal/50">The first image becomes the cover. Use clear, well-lit photos of the actual product.</p>
            <ImageUploader value={images} onChange={setImages} upload={productApi.uploadImage} max={5} label="Product photos" />
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              <Save className="h-4 w-4" aria-hidden />
              {isEdit ? "Save & resubmit if needed" : "Submit for review"}
            </Button>
            <Link to="/seller/products" className="btn-ghost">Cancel</Link>
          </div>
        </form>

        <aside className="space-y-4">
          <Alert tone="info" title="Approval checklist">
            <ul className="list-disc space-y-1 pl-4 text-xs leading-5">
              <li>Name and description match the product.</li>
              <li>Price and unit are clear and realistic.</li>
              <li>At least one clear photo is attached.</li>
              <li>Location and market are accurate.</li>
            </ul>
          </Alert>
          <Alert tone="warning" title="Accuracy matters">
            <p className="text-xs leading-5">
              Misleading prices, units, or photos can lead to rejection or suspension. You are responsible for the accuracy of every listing.
            </p>
          </Alert>
          {approval?.history && approval.history.length > 0 ? (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Info className="h-4 w-4 text-forest-600" aria-hidden />
                Approval history
              </h2>
              <ol className="mt-2 space-y-2">
                {approval.history.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="border-l-2 border-forest-200 pl-2 text-[11px]">
                    <p className="font-semibold capitalize">{entry.action.replace(/_/g, " ")}</p>
                    <p className="text-charcoal/45">{formatDateTime(entry.createdAt)}{entry.adminName ? ` · ${entry.adminName}` : ""}</p>
                    {entry.reason ? <p className="mt-0.5 text-charcoal/60">{entry.reason}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {isEdit ? (
            <div className="card p-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-charcoal/55">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-harvest-dark" aria-hidden />
                Removing all photos or making major changes may delay approval. Save changes only when the listing is ready.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
