import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Briefcase,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
  CheckCircle2,
  ArrowLeft,
  Users,
  CalendarClock,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { inputCls } from "../components/ui/input-classes";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup" | "forgot";

function getStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 3) return { score, label: "Fair", color: "bg-orange-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

const VALUE_PROPS = [
  {
    icon: Briefcase,
    title: "Track every application",
    description:
      "From lead to offer, see exactly where each opportunity stands.",
  },
  {
    icon: Users,
    title: "Never lose a contact",
    description:
      "Keep recruiters, referrals, and interviewers linked to every role.",
  },
  {
    icon: CalendarClock,
    title: "Stay ahead of interviews",
    description:
      "See upcoming rounds and follow-ups before they sneak up on you.",
  },
];

export function Auth({
  defaultMode = "login",
}: {
  defaultMode?: "login" | "signup" | "forgot";
}) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const strength = mode === "signup" ? getStrength(password) : null;
  const passwordMismatch =
    mode === "signup" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "forgot") {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password reset email sent. Check your inbox.");
      }
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        toast.error("Sign in failed", { description: error.message });
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
        toast.error("Sign up failed", { description: error.message });
      } else {
        toast.success("Account created!", {
          description: "Check your email to confirm your account.",
        });
        setSuccess(
          "Account created! Check your email to confirm, then log in.",
        );
        switchMode("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left brand panel : desktop only, purely presentational */}
      {/* Fixed hex gradient (not the brand-800/600 tokens, which intentionally
          flip to light shades in dark mode for text/icon use elsewhere). A
          hero panel background should stay the same regardless of theme. */}
      <div
        className="hidden lg:flex flex-col justify-between text-white p-14 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0c3a2f 0%, #155747 55%, #1c6e5c 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Briefcase className="size-6" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Job Application Tracker
          </span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight mb-4">
            Run your job search like a pipeline
          </h1>
          <p className="text-white/80 text-base mb-12">
            Track leads, applications, interviews, and offers in one place, from
            first contact to signed offer.
          </p>

          <div className="space-y-6">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5 backdrop-blur-sm">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-base font-medium">{title}</p>
                  <p className="text-sm text-white/70 mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/60">
          Your data stays private and scoped to your account.
        </p>

        {/* Decorative background accent, purely visual */}
        <div
          className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <div
          className="absolute -right-8 -top-16 w-48 h-48 rounded-full bg-white/5"
          aria-hidden="true"
        />
      </div>

      {/* Right panel : sign in / sign up form */}
      <div className="flex items-center justify-center p-4 sm:p-8 relative min-h-screen lg:min-h-0">
        <button
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="fixed top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="size-5" aria-hidden="true" />
          ) : (
            <Moon className="size-5" aria-hidden="true" />
          )}
        </button>

        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
              <Briefcase
                className="size-6 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Job Application Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your job search in one place
            </p>
          </div>

          <div className="bg-card rounded-xl border card-resting p-8">
            {mode === "forgot" && (
              <button
                onClick={() => switchMode("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Back to sign in
              </button>
            )}

            <h2 className="text-xl font-semibold text-card-foreground mb-6">
              {mode === "login"
                ? "Sign in to your account"
                : mode === "signup"
                  ? "Create an account"
                  : "Reset your password"}
            </h2>

            {error && (
              <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-5">
                <AlertCircle
                  className="size-4 text-destructive mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-5">
                <CheckCircle2
                  className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputCls} h-11 text-base pl-10`}
                  />
                </div>
              </div>

              {/* Password - hidden on forgot mode */}
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      Password
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-xs text-primary hover:underline underline-offset-4"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} h-11 text-base pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {/* Strength meter - signup only */}
                  {mode === "signup" && password.length > 0 && strength && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : "bg-muted"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Strength:{" "}
                        <span
                          className={
                            strength.score >= 4
                              ? "text-green-600 dark:text-green-400"
                              : strength.score >= 2
                                ? "text-orange-600"
                                : "text-destructive"
                          }
                        >
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm password - signup only */}
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} h-11 text-base pl-10 pr-10 ${passwordMismatch ? "border-destructive focus-visible:border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {passwordMismatch && (
                    <p className="text-xs text-destructive mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || passwordMismatch}
                className="w-full h-11 bg-primary text-primary-foreground rounded-md text-base font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors mt-2"
              >
                {loading
                  ? mode === "login"
                    ? "Signing in..."
                    : mode === "signup"
                      ? "Creating account..."
                      : "Sending..."
                  : mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset email"}
              </button>
            </form>

            {mode !== "forgot" && (
              <p className="text-center text-sm text-muted-foreground mt-5">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    switchMode(mode === "login" ? "signup" : "login")
                  }
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
