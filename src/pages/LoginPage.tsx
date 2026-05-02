import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SalusLogo } from "../components/SalusLogo";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    const from =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? "/counterparties";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/counterparties", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid username or password.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Sign in failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#0a0e0c] text-white">
      {/* Left column — brand */}
      <div
        className="relative hidden md:flex flex-col items-center justify-center px-12 py-16 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 40%, rgba(46, 204, 143, 0.18) 0%, rgba(46, 204, 143, 0.06) 35%, rgba(10, 14, 12, 0) 70%)",
        }}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <SalusLogo onDark height={56} />
          <p className="mt-10 text-lg font-medium text-white max-w-xs leading-snug">
            Digital Trade Finance for Critical Minerals
          </p>
          <p className="mt-2 text-sm text-white/60">
            Connecting commodities to capital
          </p>
        </div>
      </div>

      {/* Right column — form */}
      <div
        className="relative flex items-center justify-center px-6 py-16 md:py-12"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 70% 30%, rgba(46, 204, 143, 0.10) 0%, rgba(10, 14, 12, 0) 60%)",
        }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="md:hidden flex justify-center mb-10">
            <SalusLogo onDark height={32} />
          </div>

          <h1 className="text-3xl font-semibold text-white">Welcome Back!</h1>
          <p className="mt-2 text-sm text-white/60">
            Please enter your details to sign in.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-white/70 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-md bg-[#1a1f1c] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/70 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md bg-[#1a1f1c] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-white/70 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#1a1f1c] text-mint focus:ring-mint focus:ring-offset-0"
                />
                Remember me
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs text-mint hover:text-mint/80 transition-colors"
              >
                Forgot your password?
              </a>
            </div>

            <button
              type="submit"
              disabled={!username || !password || submitting}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-md bg-mint px-4 py-3 text-sm font-semibold text-black hover:bg-mint/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e0c]"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              LOG IN
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-white/40">
            © 2026, Salus Global Platform Pte Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
