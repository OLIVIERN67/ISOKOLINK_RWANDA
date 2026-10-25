import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { authApi, getApiError } from "../../services/api";
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
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  useDocumentTitle("Reset password");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { success } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await authApi.resetPassword(token, values.password);
      success("Password reset. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (error) {
      setServerError(getApiError(error).message);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Reset link required" subtitle="This page needs a valid password reset link.">
        <div className="space-y-4">
          <Alert tone="warning">The reset link is missing or incomplete. Request a new link to continue.</Alert>
          <Link to="/forgot-password" className="btn-primary w-full">Request a new link</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Your new password must be at least 8 characters and include upper case, lower case, and a number."
      footer={
        <Link to="/login" className="font-semibold text-forest-700 hover:underline">Back to sign in</Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}

        <Field label="New password" htmlFor="password" error={errors.password?.message} required>
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

        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="input"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {!isSubmitting ? <KeyRound className="h-4 w-4" aria-hidden /> : null}
          {isSubmitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </AuthCard>
  );
}
