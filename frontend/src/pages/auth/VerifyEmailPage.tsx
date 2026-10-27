import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, MailCheck, Send } from "lucide-react";
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
  const emailFromUrl = searchParams.get("email") ?? "";
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const email = emailFromUrl || user?.email || "";
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .verifyEmailLink(token)
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

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("verifying");
    try {
      const result = await authApi.verifyEmail(email, otp);
      setStatus("success");
      setMessage(result.message);
      await refresh();
    } catch (error) {
      setStatus("error");
      setMessage(getApiError(error).message);
    }
  }

  async function resend() {
    if (!email) return;
    setResending(true);
    try {
      const result = await authApi.resendVerification(email);
      setStatus("idle");
      setMessage(result.message);
      setOtp("");
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
          ? "Your account is now verified and ready to use."
          : "Enter the 6-digit code sent to your email address."
      }
      footer={
        <Link to={user ? "/dashboard" : "/login"} className="font-semibold text-forest-700 hover:underline">
          {user ? "Go to dashboard" : "Go to sign in"}
        </Link>
      }
    >
      <div className="space-y-4">
        {status === "verifying" && !otp ? <LoadingBlock label="Checking your verification link…" /> : null}

        {status === "success" ? (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-forest-200 bg-forest-50 p-4">
              <BadgeCheck className="h-8 w-8 shrink-0 text-forest-600" aria-hidden />
              <p className="text-sm text-forest-900">{message}</p>
            </div>
            <Button type="button" className="w-full" onClick={() => navigate(user?.roles.includes("seller") ? "/seller" : "/dashboard")}>
              Continue to dashboard
            </Button>
          </>
        ) : (
          <>
            {status === "error" ? <Alert tone="error" title="Verification failed">{message}</Alert> : null}
            {message && status === "idle" ? <Alert tone="success">{message}</Alert> : null}
            <form onSubmit={verifyOtp} className="space-y-4" noValidate>
              <label htmlFor="verification-email" className="block text-xs font-semibold text-charcoal">
                Email address
              </label>
              <input
                id="verification-email"
                type="email"
                className="input"
                value={email}
                onChange={() => undefined}
                readOnly={Boolean(emailFromUrl || user?.email)}
                placeholder="you@example.com"
                required
              />
              <label htmlFor="verification-otp" className="block text-xs font-semibold text-charcoal">
                6-digit verification code
              </label>
              <input
                id="verification-otp"
                className="input text-center text-2xl font-bold tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
              />
              <Button type="submit" className="w-full" loading={status === "verifying"} disabled={otp.length !== 6 || !email}>
                Verify email
              </Button>
            </form>
            <Button type="button" variant="outline" className="w-full" loading={resending} onClick={resend} disabled={!email}>
              <Send className="h-4 w-4" aria-hidden />
              Resend verification code
            </Button>
            <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              The code expires soon. Check your spam or promotions folder if you do not see it.
            </p>
          </>
        )}
      </div>
    </AuthCard>
  );
}
