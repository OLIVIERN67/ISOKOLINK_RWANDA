import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Store } from "lucide-react";
import { getApiError, productApi, referenceApi, userApi } from "../../services/api";
import type { DistrictLocation, Market } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { ImageUploader } from "../../components/ImageUploader";

const schema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(120, "Business name is too long."),
  description: z
    .string()
    .trim()
    .min(20, "Describe your business in at least 20 characters.")
    .max(2000, "Description is too long."),
  locationId: z.string().min(1, "Choose your district."),
  marketId: z.string().optional(),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Enter a contact phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^\+?[0-9][0-9\s()-]{6,}$/, "Enter a valid phone number."),
  preferredContact: z.enum(["message", "phone", "email"]),
  publicContactVisibility: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function BecomeSellerPage() {
  useDocumentTitle("Become a seller");
  const { hasRole, refresh } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<DistrictLocation[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: "",
      description: "",
      locationId: "",
      marketId: "",
      contactPhone: "",
      preferredContact: "message",
      publicContactVisibility: false,
    },
  });

  const locationId = watch("locationId");

  useEffect(() => {
    referenceApi
      .locations()
      .then((result) => setDistricts(result.districts))
      .catch((requestError) => setReferenceError(getApiError(requestError).message));
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

  async function onSubmit(values: FormValues) {
    try {
      await userApi.becomeSeller({
        businessName: values.businessName,
        description: values.description,
        locationId: Number(values.locationId),
        marketId: values.marketId ? Number(values.marketId) : null,
        contactPhone: values.contactPhone,
        preferredContact: values.preferredContact,
        publicContactVisibility: values.publicContactVisibility,
        profileImageUrl: images[0] ?? null,
      });
      await refresh();
      success("Seller profile created. You can now submit products.");
      navigate("/seller/profile", { replace: true });
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  if (hasRole("seller")) {
    return (
      <div>
        <PageHeader eyebrow="Seller" title="You are already a seller" subtitle="Your seller workspace is ready." />
        <Alert tone="success" title="Seller profile active">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Manage your business profile and product listings from the seller workspace.</p>
            <div className="flex gap-2">
              <Link to="/seller/profile" className="btn-outline btn-sm">Business profile</Link>
              <Link to="/seller" className="btn-primary btn-sm">Seller dashboard</Link>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Seller application"
        title="Become a seller"
        subtitle="Tell buyers about your food business. You can start submitting products after your profile is created."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <form onSubmit={handleSubmit(onSubmit)} className="card p-5" noValidate>
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-4 w-4 text-forest-600" aria-hidden />
            <h2 className="font-display text-base font-bold">Business details</h2>
          </div>

          <div className="space-y-4">
            <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message} required>
              <Input id="businessName" placeholder="e.g. Kigali Fresh Produce" {...register("businessName")} />
            </Field>
            <Field
              label="About your business"
              htmlFor="description"
              error={errors.description?.message}
              hint="What do you sell, where do you source it, and what makes your business reliable?"
              required
            >
              <Textarea id="description" rows={4} {...register("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District" htmlFor="locationId" error={errors.locationId?.message} required>
                <Select id="locationId" {...register("locationId")}>
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}{district.province ? ` · ${district.province}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Market" htmlFor="marketId" error={errors.marketId?.message} hint={locationId ? undefined : "Choose a district first."}>
                <Select id="marketId" {...register("marketId")} disabled={!locationId || markets.length === 0}>
                  <option value="">No specific market</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>{market.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone?.message} required>
                <Input id="contactPhone" type="tel" placeholder="+250 7xx xxx xxx" {...register("contactPhone")} />
              </Field>
              <Field label="Preferred contact" htmlFor="preferredContact" error={errors.preferredContact?.message}>
                <Select id="preferredContact" {...register("preferredContact")}>
                  <option value="message">In-app messages</option>
                  <option value="phone">Phone call</option>
                  <option value="email">Email</option>
                </Select>
              </Field>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-forest-600"
                {...register("publicContactVisibility")}
              />
              <span>
                <span className="block text-sm font-medium">Show my contact details publicly</span>
                <span className="block text-xs text-charcoal/50">
                  Buyers can still message you privately even when this is off.
                </span>
              </span>
            </label>
            <ImageUploader
              label="Business logo (optional)"
              value={images}
              onChange={setImages}
              upload={productApi.uploadProfileImage}
              max={1}
            />
          </div>

          {referenceError ? (
            <p className="mt-3 text-xs text-error">{referenceError}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              Create seller profile
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Link to="/dashboard" className="btn-ghost">Cancel</Link>
          </div>
        </form>

        <aside className="space-y-4">
          <Alert tone="info" title="How seller approval works">
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-5">
              <li>Create your seller profile with accurate business details.</li>
              <li>Submit products with clear photos, prices, and units.</li>
              <li>An administrator reviews each product before it is published.</li>
              <li>Respond to buyer messages and keep availability up to date.</li>
            </ol>
          </Alert>
          <Alert tone="warning" title="Before you apply">
            <p className="text-xs leading-5">
              Use a phone number you can answer. Listings reported repeatedly may be suspended, and admin decisions are recorded.
            </p>
          </Alert>
        </aside>
      </div>
    </div>
  );
}
