import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, MailCheck, UserPlus } from "lucide-react";
import { getApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { AuthCard } from "../../components/AuthCard";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { useDocumentTitle } from "../../components/ScrollToTop";

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(150),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+\-\s()]*$/, "Enter a valid phone number.")
      .optional(),
    preferredLanguage: z.enum(["en", "rw", "fr"]),
    password: passwordRules,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and privacy policy." }),
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  useDocumentTitle("Create an account");
  const { register: registerUser } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; devToken?: string; delivered: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      preferredLanguage: "en",
      password: "",
      confirmPassword: "",
      acceptTerms: false as true,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        preferredLanguage: values.preferredLanguage,
        acceptTerms: true,
      });
      success("Account created.");
      setCreated({
        email: values.email,
        devToken: result.devVerificationToken,
        delivered: result.emailDelivered,
      });
    } catch (error) {
      const parsed = getApiError(error);
      parsed.details?.forEach((detail) => {
        if (detail.field in values) {
          setError(detail.field as keyof FormValues, { message: detail.message });
        }
      });
      setServerError(parsed.message);
    }
  }

  if (created) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`We created your account for ${created.email}. Verify your address to unlock seller features.`}
        footer={
          <>
            Already verified? <Link to="/login" className="font-semibold text-forest-700 hover:underline">Sign in</Link>
          </>
        }
      >
        <div className="space-y-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-600">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          {created.delivered ? (
            <p className="text-sm leading-6 text-charcoal/70">
              A verification link has been sent to your inbox. The link expires soon, so use it promptly.
            </p>
          ) : (
            <Alert tone="warning" title="Email delivery is not configured">
              The development server could not send email. Use the verification link below or the resend button on the
              verification page.
            </Alert>
          )}
          {created.devToken ? (
            <Link to={`/verify-email?token=${encodeURIComponent(created.devToken)}`} className="btn-primary w-full">
              Verify my email now
            </Link>
          ) : (
            <Link to="/verify-email" className="btn-primary w-full">Open verification page</Link>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
            Continue to dashboard
          </Button>
          <p className="text-xs leading-5 text-charcoal/45">
            You can browse products and compare prices before verifying. Seller registration requires a verified email.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Buy food, compare prices, and message sellers. You can become a seller later."
      footer={
        <>
          Already have an account? <Link to="/login" className="font-semibold text-forest-700 hover:underline">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}

        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
          <input id="fullName" className="input" autoComplete="name" placeholder="Your full name" {...register("fullName")} />
        </Field>

        <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
          <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </Field>

        <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} hint="Optional, used to help sellers contact you.">
          <input id="phone" className="input" autoComplete="tel" placeholder="+250 7xx xxx xxx" {...register("phone")} />
        </Field>

        <Field label="Preferred language" htmlFor="preferredLanguage" error={errors.preferredLanguage?.message}>
          <select id="preferredLanguage" className="select" {...register("preferredLanguage")}>
            <option value="en">English</option>
            <option value="rw">Kinyarwanda</option>
            <option value="fr">Français</option>
          </select>
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters with upper and lower case letters and a number."
          required
        >
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input pr-11"
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:text-charcoal"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="input"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </Field>

        <div>
          <label className="flex items-start gap-2.5 text-xs leading-5 text-charcoal/70">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" {...register("acceptTerms")} />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="font-semibold text-forest-700 hover:underline" target="_blank" rel="noreferrer">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-semibold text-forest-700 hover:underline" target="_blank" rel="noreferrer">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptTerms ? <p className="field-error">{errors.acceptTerms.message}</p> : null}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {!isSubmitting ? <UserPlus className="h-4 w-4" aria-hidden /> : null}
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
