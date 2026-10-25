import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LogOut, ShieldCheck, TriangleAlert } from "lucide-react";
import { authApi, getApiError, userApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../components/ScrollToTop";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import { formatDate } from "../../utils/format";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Password is too long.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[0-9]/, "Include a number."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function SecurityPage() {
  useDocumentTitle("Security");
  const { user, logout } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onChangePassword(values: PasswordValues) {
    try {
      const result = await authApi.changePassword(values.currentPassword, values.newPassword);
      reset();
      success(result.message);
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  async function deactivate() {
    setDeactivating(true);
    try {
      await userApi.deactivate();
      await logout();
      navigate("/login", { replace: true, state: { message: "Your account has been deactivated." } });
    } catch (requestError) {
      error(getApiError(requestError).message);
      setDeactivating(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Security & password"
        subtitle="Protect your account and manage how you sign in."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit(onChangePassword)} className="card p-5" noValidate>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-forest-600" aria-hidden />
            <h2 className="font-display text-base font-bold">Change password</h2>
          </div>
          <div className="space-y-4">
            <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message} required>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
            </Field>
            <Field
              label="New password"
              htmlFor="newPassword"
              error={errors.newPassword?.message}
              hint="At least 8 characters with uppercase, lowercase, and a number."
              required
            >
              <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            </Field>
          </div>
          <div className="mt-5">
            <Button type="submit" loading={isSubmitting}>Update password</Button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-forest-600" aria-hidden />
              Account information
            </h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-charcoal/55">Email</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-charcoal/55">Email verified</dt>
                <dd className="font-medium">{user?.isEmailVerified ? "Yes" : "No"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-charcoal/55">Account created</dt>
                <dd className="font-medium">{formatDate(user?.createdAt)}</dd>
              </div>
            </dl>
            {!user?.isEmailVerified ? (
              <p className="mt-3 text-xs text-charcoal/50">
                Verify your email from your{" "}
                <Link to="/dashboard/profile" className="font-semibold text-forest-700 hover:underline">profile page</Link>.
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">Sessions</h2>
            <p className="mt-1 text-xs leading-5 text-charcoal/55">
              Signing out ends your current session on this device. If you suspect unauthorized access, change your password immediately.
            </p>
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void logout().then(() => navigate("/"))}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </section>
        </aside>
      </div>

      <div className="mt-5">
        <Alert tone="error" title="Deactivate account">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-5">
              Deactivating prevents sign-in and signs you out. Your listings and reports remain on record.
            </p>
            <Button type="button" variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              <TriangleAlert className="h-4 w-4" aria-hidden />
              Deactivate account
            </Button>
          </div>
        </Alert>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Deactivate your account?"
        description="You will be signed out immediately. Contact support if you need the account restored."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button type="button" variant="danger" loading={deactivating} onClick={deactivate}>
              Yes, deactivate
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-error-light p-3 text-sm text-error">
          Deactivation is not a substitute for resolving account issues. Your email address may remain associated with this account.
        </div>
      </Modal>
    </div>
  );
}
