import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { getApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { AuthCard } from "../../components/AuthCard";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { useDocumentTitle } from "../../components/ScrollToTop";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FormValues = z.infer<typeof schema>;

const demoAccounts = [
  { role: "Administrator", email: "admin@isokolink.rw" },
  { role: "Seller", email: "seller@example.com" },
  { role: "Buyer", email: "buyer@example.com" },
];

export function LoginPage() {
  useDocumentTitle("Sign in");
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const from = (location.state as { from?: string } | null)?.from;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      success(`Welcome back, ${user.fullName.split(" ")[0]}.`);
      const destination =
        from ||
        (user.roles.includes("admin") ? "/admin" : user.roles.includes("seller") ? "/seller" : "/dashboard");
      navigate(destination, { replace: true });
    } catch (error) {
      const parsed = getApiError(error);
      if (parsed.details) {
        parsed.details.forEach((detail) => {
          if (detail.field === "email" || detail.field === "password") {
            setError(detail.field, { message: detail.message });
          }
        });
      }
      setServerError(parsed.message);
    }
  }

  function useDemo(email: string) {
    setValue("email", email);
    setValue("password", "Password123!");
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your listings, messages, and saved products."
      footer={
        <>
          New to ISOKOLINK? <Link to="/register" className="font-semibold text-forest-700 hover:underline">Create an account</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}

        <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            {...register("email")}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input pr-11"
              placeholder="Enter your password"
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

        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-forest-700 hover:underline">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {!isSubmitting ? <LogIn className="h-4 w-4" aria-hidden /> : null}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {import.meta.env.DEV ? (
        <div className="mt-6 rounded-xl border border-dashed border-forest-200 bg-white/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">Demo accounts · password Password123!</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemo(account.email)}
                className="rounded-lg border border-forest-100 bg-white px-2 py-1 text-[11px] font-medium text-forest-700 transition hover:border-forest-300"
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthCard>
  );
}
