import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Verdikt" },
      { name: "description", content: "Sign in to Verdikt to save reviews and tune your verdict profile." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, userEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Redirect if already signed in
  useEffect(() => {
    if (userEmail) {
      navigate({ to: "/" });
    }
  }, [userEmail, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const email = emailRef.current?.value.trim();
      const password = passwordRef.current?.value;

      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }

      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }

      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground grain flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col justify-between p-12 w-full"
        >
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="h-7 w-7 rounded-sm bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl">Verdikt</span>
          </Link>

          <div>
            <h2 className="font-display text-6xl leading-[0.95] tracking-tight">
              The verdict is <em className="italic text-primary">in.</em>
            </h2>
            <p className="mt-6 text-muted-foreground max-w-sm">
              Sign in to save reviews, track wishlists, and feed the model your taste so the next
              verdict actually fits you.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-px bg-border rounded-md overflow-hidden max-w-md">
              {[{ n: "12k+", l: "Products" }, { n: "98.2%", l: "Accuracy" }, { n: "0", l: "Sponsors" }].map((s) => (
                <div key={s.l} className="bg-card p-4">
                  <div className="font-display text-2xl text-primary">{s.n}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="font-mono text-xs text-muted-foreground">
            "Finally — a review that doesn't end with an affiliate link."
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>

          <div className="font-mono text-xs uppercase tracking-widest text-primary mb-3">
            // {mode === "signin" ? "Welcome back" : "New account"}
          </div>
          <h1 className="font-display text-5xl tracking-tight mb-2">
            {mode === "signin" ? "Sign in." : "Get a profile."}
          </h1>
          <p className="text-muted-foreground mb-10">
            {mode === "signin" ? "Pick up where you left off." : "Free forever. No card required."}
          </p>

          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <Field label="Name" type="text" placeholder="Ada Lovelace" />
            )}
            <Field label="Email" type="email" placeholder="you@domain.com" ref={emailRef} />
            <Field label="Password" type="password" placeholder="••••••••" ref={passwordRef} />

            {error && <div className="text-sm text-destructive">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-sm bg-primary text-primary-foreground font-medium disabled:opacity-60 hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Working" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-background font-mono text-xs uppercase tracking-wider text-muted-foreground">or</span></div>
            </div>

            <button type="button" className="w-full px-5 py-3 rounded-sm border border-border bg-card hover:border-primary transition-colors text-sm">
              Continue with Google
            </button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground text-center">
            {mode === "signin" ? "No account yet?" : "Already have one?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline underline-offset-4"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, type, placeholder, ref }: { label: string; type: string; placeholder: string; ref?: React.RefObject<HTMLInputElement | null> }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full bg-card border border-border rounded-sm px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
      />
    </label>
  );
}