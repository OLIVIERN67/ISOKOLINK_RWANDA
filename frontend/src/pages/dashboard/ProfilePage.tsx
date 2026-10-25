import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BadgeCheck, MailCheck, ShieldCheck, Store, UserRound } from "lucide-react";
import { authApi, getApiError, productApi, userApi } from "../../services/api";
import type { MyProfile } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { LoadingBlock, ErrorState } from "../../components/ui/States";
import { ImageUploader } from "../../components/ImageUploader";
import { formatDate } from "../../utils/format";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100, "Name is too long."),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .refine((value) => value === "" || /^\+?[0-9][0-9\s()-]{6,}$/.test(value), "Enter a valid phone number."),
  preferredLanguage: z.enum(["en", "rw", "fr"]),
  notificationEmailEnabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  useDocumentTitle("My profile");
  const { refresh } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", preferredLanguage: "en", notificationEmailEnabled: true },
  });

  useEffect(() => {
    let active = true;
    userApi
      .me()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        reset({
          fullName: result.fullName,
          phone: result.phone ?? "",
          preferredLanguage: (result.preferredLanguage as FormValues["preferredLanguage"]) ?? "en",
          notificationEmailEnabled: result.notificationEmailEnabled,
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

  async function onSubmit(values: FormValues) {
    try {
      const result = await userApi.update({
        fullName: values.fullName,
        phone: values.phone || null,
        preferredLanguage: values.preferredLanguage,
        notificationEmailEnabled: values.notificationEmailEnabled,
      });
      setProfile(result);
      reset({
        fullName: result.fullName,
        phone: result.phone ?? "",
        preferredLanguage: (result.preferredLanguage as FormValues["preferredLanguage"]) ?? "en",
        notificationEmailEnabled: result.notificationEmailEnabled,
      });
      await refresh();
      success("Profile updated.");
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      const result = await authApi.resendVerification();
      success(result.message);
      setDevToken(result.devVerificationToken ?? null);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setResending(false);
    }
  }

  async function updateSellerImage(urls: string[]) {
    try {
      const updated = await userApi.updateSellerProfile({ profileImageUrl: urls[0] ?? null });
      setProfile((current) => (current ? { ...current, sellerProfile: updated } : current));
      await refresh();
      success("Business logo updated.");
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  if (loading) return <LoadingBlock label="Loading your profile…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!profile) return <ErrorState message="Profile unavailable." />;

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        subtitle="Manage your personal details and notification preferences."
        actions={
          <Link to="/dashboard/security" className="btn-outline">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Security & password
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="card p-5" noValidate>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-forest-600" aria-hidden />
              <h2 className="font-display text-base font-bold">Personal information</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
                <Input id="fullName" autoComplete="name" {...register("fullName")} />
              </Field>
              <Field label="Email address" htmlFor="email" hint="Email changes require support for security.">
                <Input id="email" value={profile.email} disabled readOnly />
              </Field>
              <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} hint="Include the country code, e.g. +250 7xx xxx xxx.">
                <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
              </Field>
              <Field label="Preferred language" htmlFor="preferredLanguage" error={errors.preferredLanguage?.message}>
                <Select id="preferredLanguage" {...register("preferredLanguage")}>
                  <option value="en">English</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="fr">Français</option>
                </Select>
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 p-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-forest-600" {...register("notificationEmailEnabled")} />
              <span>
                <span className="block text-sm font-medium">Email notifications</span>
                <span className="block text-xs text-charcoal/50">Receive important account and listing updates by email.</span>
              </span>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
              {isDirty ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    reset({
                      fullName: profile.fullName,
                      phone: profile.phone ?? "",
                      preferredLanguage: (profile.preferredLanguage as FormValues["preferredLanguage"]) ?? "en",
                      notificationEmailEnabled: profile.notificationEmailEnabled,
                    })
                  }
                >
                  Discard
                </Button>
              ) : null}
            </div>
          </form>

          {profile.sellerProfile ? (
            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Store className="h-4 w-4 text-forest-600" aria-hidden />
                <h2 className="font-display text-base font-bold">Business profile</h2>
              </div>
              <ImageUploader
                label="Business logo"
                value={profile.sellerProfile.profileImageUrl ? [profile.sellerProfile.profileImageUrl] : []}
                onChange={(urls) => void updateSellerImage(urls)}
                upload={productApi.uploadProfileImage}
                max={1}
                hint="Shown on your public seller page · JPEG, PNG, WebP, or GIF up to 5 MB"
              />
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-charcoal/50">Business name</dt>
                  <dd className="font-medium">{profile.sellerProfile.businessName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Seller status</dt>
                  <dd><Badge tone={profile.sellerProfile.status === "active" ? "green" : "gray"}>{profile.sellerProfile.status}</Badge></dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Location</dt>
                  <dd className="font-medium">{profile.sellerProfile.district ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Market</dt>
                  <dd className="font-medium">{profile.sellerProfile.market ?? "No market selected"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-charcoal/50">
                Update your business details from the{" "}
                <Link to="/seller/profile" className="font-semibold text-forest-700 hover:underline">seller profile page</Link>.
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="card p-5 text-center">
            <div className="mx-auto w-fit">
              <Avatar
                name={profile.sellerProfile?.businessName || profile.fullName}
                src={profile.sellerProfile?.profileImageUrl}
                size="lg"
              />
            </div>
            <h2 className="mt-3 font-display text-base font-bold">{profile.fullName}</h2>
            <p className="text-xs text-charcoal/50">{profile.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {profile.roles.map((role) => (
                <Badge key={role} tone={role === "admin" ? "purple" : role === "seller" ? "green" : "gray"}>
                  {role}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-charcoal/40">Member since {formatDate(profile.createdAt)}</p>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-forest-600" aria-hidden />
              Account status
            </h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-charcoal/55">Email</span>
                <Badge tone={profile.isEmailVerified ? "green" : "gold"}>
                  {profile.isEmailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-charcoal/55">Account</span>
                <Badge tone={profile.status === "active" ? "green" : "red"}>{profile.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-charcoal/55">Last sign-in</span>
                <span className="font-medium">{formatDate(profile.lastLoginAt)}</span>
              </div>
            </div>
            {!profile.isEmailVerified ? (
              <div className="mt-3">
                <Button type="button" size="sm" variant="outline" onClick={resendVerification} loading={resending} className="w-full">
                  <MailCheck className="h-4 w-4" aria-hidden />
                  Resend verification
                </Button>
                {devToken ? (
                  <Link to={`/verify-email?token=${encodeURIComponent(devToken)}`} className="mt-2 block text-center text-xs font-semibold text-forest-700 hover:underline">
                    Verify now (development)
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>

          {!profile.roles.includes("seller") ? (
            <Alert tone="info" title="Start selling">
              <p className="text-xs leading-5">Turn your farm or food business into a storefront on ISOKOLINK.</p>
              <Link to="/dashboard/become-seller" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Apply as a seller
              </Link>
            </Alert>
          ) : (
            <Link to="/seller" className="card block p-5 transition hover:border-forest-300">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4 text-forest-600" aria-hidden />
                Seller dashboard
              </div>
              <p className="mt-1 text-xs text-charcoal/55">Manage your listings, storefront, and buyer messages.</p>
            </Link>
          )}
        </aside>
      </div>

      <div className="mt-5">
        <Alert tone="warning" title="Deactivating your account">
          <p className="text-xs leading-5">
            Deactivation signs you out and prevents sign-in. Go to{" "}
            <Link to="/dashboard/security" className="font-semibold text-forest-700 underline">Security & password</Link>{" "}
            if you want to deactivate your account.
          </p>
        </Alert>
      </div>
    </div>
  );
}
