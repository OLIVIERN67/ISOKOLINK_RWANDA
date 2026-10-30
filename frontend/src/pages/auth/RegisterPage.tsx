import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShoppingBasket, Store, UserPlus } from "lucide-react";
import { getApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { AuthCard } from "../../components/AuthCard";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { useI18n } from "../../context/I18nContext";

function createSchema(t: (key: string) => string) {
  return z
    .object({
      fullName: z.string().trim().min(2, t("validation.fullName")).max(150),
      email: z.string().trim().email(t("validation.invalidEmail")),
      phone: z
        .string()
        .trim()
        .max(30)
        .regex(/^[0-9+\-\s()]*$/, t("validation.invalidPhone"))
        .optional(),
      preferredLanguage: z.enum(["en", "rw", "fr"]),
      accountType: z.enum(["buyer", "seller"]),
      password: z
        .string()
        .min(8, t("validation.passwordMin"))
        .regex(/[a-z]/, t("validation.lowercase"))
        .regex(/[A-Z]/, t("validation.uppercase"))
        .regex(/[0-9]/, t("validation.number")),
      confirmPassword: z.string(),
      acceptTerms: z.literal(true, {
        errorMap: () => ({ message: t("validation.acceptTerms") }),
      }),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export function RegisterPage() {
  const { t } = useI18n();
  const schema = useMemo(() => createSchema(t), [t]);
  useDocumentTitle("Create an account");
  const { register: registerUser } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      accountType: "buyer",
      password: "",
      confirmPassword: "",
      acceptTerms: false as true,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        preferredLanguage: values.preferredLanguage,
        accountType: values.accountType,
        acceptTerms: true,
      });
      success("Account created.");
      navigate(values.accountType === "seller" ? "/seller" : "/dashboard", { replace: true });
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

        <Field label={t("registration.accountType")} htmlFor="accountType" error={errors.accountType?.message} required>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { value: "buyer", label: t("role.buyer"), description: t("registration.buyerDescription"), icon: ShoppingBasket },
              { value: "seller", label: t("role.seller"), description: t("registration.sellerDescription"), icon: Store },
            ] as const).map((option) => {
              const Icon = option.icon;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input type="radio" value={option.value} className="peer sr-only" {...register("accountType")} />
                  <span className="flex min-h-[92px] items-start gap-3 rounded-xl border border-forest-100 bg-white p-3 transition peer-checked:border-forest-600 peer-checked:bg-forest-50 peer-focus-visible:ring-2 peer-focus-visible:ring-forest-500">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden />
                    <span>
                      <span className="block text-sm font-bold text-charcoal">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-charcoal/60">{option.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>

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
