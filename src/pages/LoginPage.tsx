import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMode, setLoginMode] = useState<"bruger" | "admin">("bruger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,30%,8%)]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(215,80%,56%)]" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) setError(error.message);
        else setError("Tjek din email for bekræftelseslink.");
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(220,30%,8%)]">
      {/* Gradient background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[hsl(215,80%,20%)] opacity-30 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[600px] -translate-x-1/4 translate-y-1/4 rounded-full bg-[hsl(215,80%,15%)] opacity-20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-[hsl(215,80%,15%)] opacity-20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black italic tracking-tight text-[hsl(215,80%,56%)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            ASA
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(220,10%,50%)]">
            Kontrolsystem
          </p>
        </div>

        {/* Role toggle */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setLoginMode("bruger")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              loginMode === "bruger"
                ? "bg-[hsl(215,80%,50%)] text-white shadow-lg shadow-[hsl(215,80%,50%)/0.3]"
                : "bg-[hsl(220,20%,15%)] text-[hsl(220,10%,55%)] hover:bg-[hsl(220,20%,18%)]"
            }`}
          >
            <User size={16} />
            Bruger
          </button>
          <button
            onClick={() => setLoginMode("admin")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              loginMode === "admin"
                ? "bg-[hsl(215,80%,50%)] text-white shadow-lg shadow-[hsl(215,80%,50%)/0.3]"
                : "bg-[hsl(220,20%,15%)] text-[hsl(220,10%,55%)] hover:bg-[hsl(220,20%,18%)]"
            }`}
          >
            <Settings size={16} />
            Admin
          </button>
        </div>

        {/* Welcome text */}
        <div className="mb-8 text-center">
          <h2 className="font-heading text-4xl font-black text-white leading-tight">
            {isSignUp ? "Opret konto" : (
              <>Velkommen<br />tilbage!</>
            )}
          </h2>
          <p className="mt-3 text-sm text-[hsl(220,10%,50%)]">
            {isSignUp ? (
              <>
                Har du allerede en konto?{" "}
                <button onClick={() => { setIsSignUp(false); setError(""); }} className="text-[hsl(215,80%,56%)] hover:underline">
                  Log ind
                </button>
              </>
            ) : (
              <>
                Har du ikke en konto endnu?{" "}
                <button onClick={() => { setIsSignUp(true); setError(""); }} className="text-[hsl(215,80%,56%)] hover:underline">
                  Opret konto
                </button>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Fulde navn"
              required
              className="h-14 rounded-xl border-0 bg-[hsl(220,15%,18%)] px-5 text-white placeholder:text-[hsl(220,10%,40%)] focus-visible:ring-1 focus-visible:ring-[hsl(215,80%,50%)]"
            />
          )}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@email.dk"
            required
            className="h-14 rounded-xl border-0 bg-[hsl(220,15%,18%)] px-5 text-white placeholder:text-[hsl(220,10%,40%)] focus-visible:ring-1 focus-visible:ring-[hsl(215,80%,50%)]"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="h-14 rounded-xl border-0 bg-[hsl(220,15%,18%)] px-5 text-white placeholder:text-[hsl(220,10%,40%)] focus-visible:ring-1 focus-visible:ring-[hsl(215,80%,50%)]"
          />

          {error && (
            <p className={`text-center text-sm ${error.includes("Tjek") ? "text-[hsl(152,60%,48%)]" : "text-[hsl(0,72%,60%)]"}`}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-xl bg-[hsl(215,80%,50%)] text-base font-semibold text-white shadow-lg shadow-[hsl(215,80%,50%)/0.3] hover:bg-[hsl(215,80%,55%)] transition-all"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log ind"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[hsl(220,10%,40%)]">
          Glemt din adgangskode?
        </p>
      </motion.div>
    </div>
  );
}
