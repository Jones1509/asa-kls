import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { User, Shield, Mail, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const { session, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(220 20% 4%)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Forkert email eller adgangskode"
          : error.message
      );
      setLoading(false);
      return;
    }

    if (isAdminMode) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasAdmin = roleData?.some((r) => r.role === "admin");
        if (!hasAdmin) {
          await supabase.auth.signOut();
          setError("Denne konto har ikke admin-adgang");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Indtast din email-adresse");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
      setError("");
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 70% 20%, hsl(217 80% 20% / 0.7), transparent 60%), radial-gradient(ellipse at 20% 80%, hsl(217 70% 15% / 0.6), transparent 60%), radial-gradient(ellipse at 90% 90%, hsl(220 60% 10% / 0.5), transparent 50%), hsl(220 20% 4%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <span className="font-heading font-extrabold text-5xl tracking-tight text-primary">
              ASA
            </span>
            <div className="font-heading font-semibold text-sm tracking-[0.2em] uppercase text-primary/70">
              Kvalitetsledelsessystem
            </div>
          </div>
        </div>

        {resetMode ? (
          /* Password reset view */
          <div className="flex flex-col gap-5">
            <h1 className="font-heading font-extrabold text-3xl tracking-tight text-center mb-1 text-white">
              Nulstil adgangskode
            </h1>
            {resetSent ? (
              <div className="text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center">
                  <Mail size={24} className="text-success" />
                </div>
                <p className="text-white/50 text-sm leading-relaxed">
                  Vi har sendt et link til{" "}
                  <strong className="text-white/70">{email}</strong>.<br />
                  Tjek din indbakke og klik på linket for at nulstille din
                  adgangskode.
                </p>
                <button
                  onClick={() => {
                    setResetMode(false);
                    setResetSent(false);
                  }}
                  className="text-primary text-sm font-semibold bg-transparent border-none cursor-pointer hover:underline"
                >
                  Tilbage til login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <p className="text-center text-sm text-white/40">
                  Indtast din email-adresse og vi sender dig et link til at
                  nulstille din adgangskode.
                </p>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.dk"
                    required
                    className="w-full px-5 py-4 rounded-xl text-sm outline-none transition-all duration-300 bg-white/[0.08] text-white border-2 border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:bg-white/[0.12]"
                  />
                  <Mail
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25"
                  />
                </div>
                {error && (
                  <div className="text-sm rounded-xl px-4 py-3 bg-destructive/15 text-destructive/80 border border-destructive/20">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 border-none bg-primary text-primary-foreground shadow-[0_4px_20px_hsl(217_91%_60%/0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_hsl(217_91%_60%/0.5)] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Sender...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <KeyRound size={16} />
                      Send nulstillingslink
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setError("");
                  }}
                  className="text-center text-sm text-white/40 bg-transparent border-none cursor-pointer hover:text-white/60 transition-colors"
                >
                  Tilbage til login
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Login view */
          <>
            {/* Bruger / Admin toggle */}
            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  setError("");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  !isAdminMode
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_hsl(217_91%_60%/0.4)]"
                    : "bg-transparent text-white/60 border-white/15 hover:border-white/30"
                }`}
              >
                <User size={15} strokeWidth={2} />
                Bruger
              </button>
              <button
                onClick={() => {
                  setIsAdminMode(true);
                  setError("");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  isAdminMode
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_hsl(217_91%_60%/0.4)]"
                    : "bg-transparent text-white/60 border-white/15 hover:border-white/30"
                }`}
              >
                <Shield size={15} strokeWidth={2} />
                Admin
              </button>
            </div>

            <h1 className="font-heading font-extrabold text-3xl tracking-tight text-center mb-1 text-white">
              {isAdminMode ? "Admin Login" : "Velkommen tilbage!"}
                </h1>
                : isAdminMode
                ? "Admin Login"
                : "Velkommen tilbage!"}
            </h1>

            {!isAdminMode && (
              <p className="text-center text-sm mb-8 text-white/40">
                {isSignUp ? (
                  <>
                    Har du allerede en konto?{" "}
                    <button
                      onClick={() => {
                        setIsSignUp(false);
                        setError("");
                      }}
                      className="bg-transparent border-none cursor-pointer font-semibold hover:underline text-primary"
                    >
                      Log ind
                    </button>
                  </>
                ) : (
                  <>
                    Har du ikke en konto endnu?{" "}
                    <button
                      onClick={() => {
                        setIsSignUp(true);
                        setError("");
                      }}
                      className="bg-transparent border-none cursor-pointer font-semibold hover:underline text-primary"
                    >
                      Opret konto
                    </button>
                  </>
                )}
              </p>
            )}
            {isAdminMode && (
              <p className="text-center text-sm mb-8 text-white/40">
                Log ind med din administrator-konto
              </p>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {isSignUp && (
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Fulde navn"
                    required
                    className="w-full px-5 py-4 rounded-xl text-sm outline-none transition-all duration-300 bg-white/[0.08] text-white border-2 border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:bg-white/[0.12]"
                  />
                  <User
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25"
                  />
                </div>
              )}

              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  required
                  className="w-full px-5 py-4 rounded-xl text-sm outline-none transition-all duration-300 bg-white/[0.08] text-white border-2 border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:bg-white/[0.12]"
                />
                <Mail
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-5 py-4 rounded-xl text-sm outline-none transition-all duration-300 bg-white/[0.08] text-white border-2 border-white/[0.08] placeholder:text-white/30 focus:border-primary/50 focus:bg-white/[0.12]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div
                  className={`text-sm rounded-xl px-4 py-3 ${
                    error.includes("Tjek")
                      ? "bg-success/15 text-success/80 border border-success/20"
                      : "bg-destructive/15 text-destructive/80 border border-destructive/20"
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 border-none bg-primary text-primary-foreground shadow-[0_4px_20px_hsl(217_91%_60%/0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_hsl(217_91%_60%/0.5)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {isSignUp ? "Opretter..." : "Logger ind..."}
                  </span>
                ) : isSignUp ? (
                  "Opret konto"
                ) : (
                  "Log ind"
                )}
              </button>
            </form>

            <p className="text-center text-sm mt-6">
              <button
                onClick={() => {
                  setResetMode(true);
                  setError("");
                }}
                className="text-white/30 bg-transparent border-none cursor-pointer hover:text-white/50 transition-colors text-sm"
              >
                Glemt din adgangskode?
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
