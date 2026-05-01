import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { SalusLogo } from "../components/SalusLogo";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-page px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <SalusLogo className="scale-110" />
          <p className="mt-3 text-xs text-ink-muted tracking-wide uppercase">
            Invoicing
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-card-border rounded-lg p-8 space-y-5"
          noValidate
        >
          <div>
            <h1 className="text-lg font-medium text-ink">Sign in</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Use your Salus username.
            </p>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              invalid={!!error}
            />
            {error && (
              <p className="mt-1.5 text-xs text-danger" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={!username || !password || submitting}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Salus Global Platform
        </p>
      </div>
    </div>
  );
}
