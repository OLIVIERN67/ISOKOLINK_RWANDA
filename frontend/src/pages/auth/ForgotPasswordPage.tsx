import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import { authApi, getApiError } from "../../services/api";
import { AuthCard } from "../../components/AuthCard";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { useDocumentTitle } from "../../components/ScrollToTop";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  useDocumentTitle("Forgot password");
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setServerError(getApiError(error).message);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email address linked to your account and we will send a reset link."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-forest-700 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="success" title="Check your email">
            If an account exists for that address, a password reset link has been sent. The link expires soon.
          </Alert>
          <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? <Alert tone="error">{serverError}</Alert> : null}
          <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
            <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            {!isSubmitting ? <Mail className="h-4 w-4" aria-hidden /> : null}
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
