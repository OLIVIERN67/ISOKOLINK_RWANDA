import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, MapPin, Store } from "lucide-react";
import { getApiError, productApi, referenceApi, userApi } from "../../services/api";
import type { DistrictLocation, Market, SellerProfile } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { LoadingBlock, ErrorState } from "../../components/ui/States";
import { ImageUploader } from "../../components/ImageUploader";
import { formatDate } from "../../utils/format";

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

export function SellerProfilePage() {
  useDocumentTitle("Business profile");
  const { refresh } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [districts, setDistricts] = useState<DistrictLocation[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [logo, setLogo] = useState<string[]>([]);
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
    let active = true;
    Promise.all([userApi.sellerProfile(), referenceApi.locations()])
      .then(([sellerProfile, locationResult]) => {
        if (!active) return;
        setProfile(sellerProfile);
        setDistricts(locationResult.districts);
        setLogo(sellerProfile.profileImageUrl ? [sellerProfile.profileImageUrl] : []);
        reset({
          businessName: sellerProfile.businessName,
          description: sellerProfile.description ?? "",
          locationId: sellerProfile.locationId ? String(sellerProfile.locationId) : "",
          marketId: sellerProfile.marketId ? String(sellerProfile.marketId) : "",
          contactPhone: sellerProfile.contactPhone ?? "",
          preferredContact: sellerProfile.preferredContact,
          publicContactVisibility: sellerProfile.publicContactVisibility,
        });
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
  }, [reset]);

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
      const updated = await userApi.updateSellerProfile({
        businessName: values.businessName,
        description: values.description,
        locationId: Number(values.locationId),
        marketId: values.marketId ? Number(values.marketId) : null,
        contactPhone: values.contactPhone,
        preferredContact: values.preferredContact,
        publicContactVisibility: values.publicContactVisibility,
        profileImageUrl: logo[0] ?? null,
      });
      setProfile(updated);
      setLogo(updated.profileImageUrl ? [updated.profileImageUrl] : []);
      await refresh();
      success("Business profile updated.");
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  if (loading) return <LoadingBlock label="Loading business profile…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!profile) return <ErrorState message="Seller profile unavailable." />;

  return (
    <div>
      <PageHeader
        eyebrow="Seller workspace"
        title="Business profile"
        subtitle="This information appears on your public seller page."
        actions={
          <Link to={`/sellers/${profile.id}`} className="btn-outline">
            <ExternalLink className="h-4 w-4" aria-hidden />
            View storefront
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <form onSubmit={handleSubmit(onSubmit)} className="card p-5" noValidate>
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-4 w-4 text-forest-600" aria-hidden />
            <h2 className="font-display text-base font-bold">Store details</h2>
            <Badge tone={profile.status === "active" ? "green" : "red"}>{profile.status}</Badge>
          </div>

          <div className="space-y-4">
            <ImageUploader
              label="Business logo"
              value={logo}
              onChange={setLogo}
              upload={productApi.uploadProfileImage}
              max={1}
            />
            <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message} required>
              <Input id="businessName" {...register("businessName")} />
            </Field>
            <Field label="About your business" htmlFor="description" error={errors.description?.message} required>
              <Textarea id="description" rows={4} {...register("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District" htmlFor="locationId" error={errors.locationId?.message} required>
                <Select id="locationId" {...register("locationId")}>
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Market" htmlFor="marketId" hint={locationId ? undefined : "Choose a district first."}>
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
                <Input id="contactPhone" type="tel" {...register("contactPhone")} />
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
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-forest-600" {...register("publicContactVisibility")} />
              <span>
                <span className="block text-sm font-medium">Show contact details publicly</span>
                <span className="block text-xs text-charcoal/50">Buyers can always message you privately.</span>
              </span>
            </label>
            <Field label="Contact email" htmlFor="contactEmail" hint="Your sign-in email is used for buyer contact.">
              <Input id="contactEmail" value={profile.contactEmail ?? ""} readOnly disabled />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>Save business profile</Button>
            <Link to="/seller" className="btn-ghost">Back to dashboard</Link>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-forest-600" aria-hidden />
              Profile summary
            </h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div>
                <dt className="text-charcoal/50">Business name</dt>
                <dd className="font-semibold">{profile.businessName}</dd>
              </div>
              <div>
                <dt className="text-charcoal/50">Public storefront</dt>
                <dd>
                  <Link to={`/sellers/${profile.id}`} className="font-semibold text-forest-700 hover:underline">
                    /sellers/{profile.id}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-charcoal/50">Member since</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-charcoal/50">Contact visibility</dt>
                <dd className="font-medium">{profile.publicContactVisibility ? "Public" : "Private"}</dd>
              </div>
            </dl>
          </section>
          <Alert tone="info" title="Storefront quality">
            <p className="text-xs leading-5">
              A complete description, accurate location, and a recognizable logo help buyers trust your business.
            </p>
          </Alert>
        </aside>
      </div>
    </div>
  );
}
