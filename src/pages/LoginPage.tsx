import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Shield size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">ASA KLS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kontrolsystem</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <h2 className="mb-4 font-heading text-lg font-semibold text-card-foreground">
            {isSignUp ? "Opret konto" : "Log ind"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label className="text-xs">Fulde navn</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Martin Sørensen"
                  className="mt-1"
                  required
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.dk"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Adgangskode</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className={`text-xs ${error.includes("Tjek") ? "text-success" : "text-destructive"}`}>
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Opret konto" : "Log ind"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isSignUp ? "Har du allerede en konto?" : "Har du ikke en konto?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="font-medium text-primary hover:underline"
            >
              {isSignUp ? "Log ind" : "Opret konto"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
