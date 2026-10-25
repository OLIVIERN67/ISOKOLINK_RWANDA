import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, MailCheck, Send, XCircle } from "lucide-react";
import { authApi, getApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { AuthCard } from "../../components/AuthCard";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { LoadingBlock } from "../../components/ui/States";
import { useDocumentTitle } from "../../components/ScrollToTop";

type Status = "idle" | "verifying" | "success" | "error";

export function VerifyEmailPage() {
  useDocumentTitle("Verify email");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .verifyEmail(token)
      .then(async (result) => {
        if (!active) return;
        setStatus("success");
        setMessage(result.message);
        await refresh();
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(getApiError(error).message);
      });
    return () => {
      active = false;
    };
  }, [token, refresh]);

  async function resend() {
    setResending(true);
    try {
      const result = await authApi.resendVerification();
      setMessage(result.message);
      setDevToken(result.devVerificationToken ?? null);
    } catch (error) {
      setMessage(getApiError(error).message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      title={status === "success" ? "Email verified" : "Verify your email"}
      subtitle={
        status === "success"
          ? "Your account is now fully verified. Seller registration and all buyer features are unlocked."
          : "Email verification keeps your account secure and unlocks seller registration."
      }
      footer={
        <Link to={user ? "/dashboard" : "/login"} className="font-semibold text-forest-700 hover:underline">
          {user ? "Go to dashboard" : "Go to sign in"}
        </Link>
      }
    >
      <div className="space-y-4">
        {status === "verifying" ? <LoadingBlock label="Verifying your email address…" /> : null}

        {status === "success" ? (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-forest-200 bg-forest-50 p-4">
              <BadgeCheck className="h-8 w-8 shrink-0 text-forest-600" aria-hidden />
              <p className="text-sm text-forest-900">{message || "Your email address has been verified."}</p>
            </div>
            <Button type="button" className="w-full" onClick={() => navigate("/dashboard")}>
              Continue to dashboard
            </Button>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <Alert tone="error" title="Verification failed">
              {message}
            </Alert>
            {user ? (
              <Button type="button" className="w-full" loading={resending} onClick={resend}>
                <Send className="h-4 w-4" aria-hidden />
                Send a new verification email
              </Button>
            ) : (
              <Link to="/login" className="btn-primary w-full">Sign in to resend</Link>
            )}
          </>
        ) : null}

        {status === "idle" ? (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Check your inbox</p>
                <p className="mt-1 text-xs leading-5">
                  Open the verification link we sent to your email address. If you cannot find it, check your spam folder.
                </p>
              </div>
            </div>
            {message ? <Alert tone="success">{message}</Alert> : null}
            {user ? (
              <Button type="button" className="w-full" loading={resending} onClick={resend}>
                <Send className="h-4 w-4" aria-hidden />
                Resend verification email
              </Button>
            ) : (
              <Link to="/login" className="btn-primary w-full">Sign in to resend</Link>
            )}
          </>
        ) : null}

        {devToken ? (
          <div className="rounded-xl border border-dashed border-harvest/60 bg-harvest-light/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">Development mode</p>
            <Link to={`/verify-email?token=${encodeURIComponent(devToken)}`} className="mt-1 inline-block text-sm font-semibold text-forest-700 hover:underline">
              Verify using the development token
            </Link>
          </div>
        ) : null}

        {status === "success" ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-forest-600">
            <XCircle className="hidden" aria-hidden />
            You can close this page or continue to your dashboard.
          </p>
        ) : null}
      </div>
    </AuthCard>
  );
}
