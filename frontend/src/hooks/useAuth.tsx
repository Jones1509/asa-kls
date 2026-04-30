import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, type Session, type User, type AppRole } from "@/lib/backend-stub";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; email: string; role_label: string; avatar_url: string | null } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Demo-rolleudledning: emails der indeholder "admin" eller "kontor"
 * får admin-rolle, alle andre er medarbejdere.
 * Når et rigtigt Supabase-projekt tilkobles, hentes rollen fra
 * tabellen `user_roles` (samme logik som tidligere).
 */
function deriveDemoRole(email: string): AppRole {
  const e = email.toLowerCase();
  return e.includes("admin") || e.includes("kontor") ? "admin" : "employee";
}

function makeDemoProfile(user: User): AuthContextType["profile"] {
  const fullName =
    (user.user_metadata?.full_name as string) ||
    user.email.split("@")[0] ||
    "Demo Bruger";
  const role = deriveDemoRole(user.email);
  return {
    full_name: fullName,
    email: user.email,
    role_label: role === "admin" ? "Kontor" : "Medarbejder",
    avatar_url: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = (u: User | null) => {
    if (!u) {
      setRole(null);
      setProfile(null);
      return;
    }
    setRole(deriveDemoRole(u.email));
    setProfile(makeDemoProfile(u));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      hydrateUser(newSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      hydrateUser(existing?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
