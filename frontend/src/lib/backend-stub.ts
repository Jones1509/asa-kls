/**
 * ============================================================================
 *  BACKEND STUB / PLACEHOLDER
 * ============================================================================
 *
 *  Denne fil er en MIDLERTIDIG erstatning for Supabase-klienten.
 *  Den efterligner Supabase-API'et nok til at hele UI'et kan køre uden
 *  en rigtig backend tilkoblet:
 *
 *    - Login accepterer enhver email/adgangskode (gemmer en demo-session
 *      i localStorage). Hvis email indeholder "admin" får du admin-rolle,
 *      ellers employee-rolle.
 *    - Alle SELECT-kald returnerer tomme arrays (intet crasher).
 *    - Alle INSERT/UPDATE/DELETE-kald returnerer en venlig fejl:
 *      "Backend skal opsættes – forbind dit Supabase-projekt".
 *    - Storage, Edge Functions og Realtime-channels er no-ops.
 *
 * ----------------------------------------------------------------------------
 *  >>> SÅDAN TILKOBLER DU DIT EGET SUPABASE-PROJEKT SENERE <<<
 * ----------------------------------------------------------------------------
 *
 *  1) Opret et nyt Supabase-projekt på https://supabase.com
 *
 *  2) Kør SQL-migrations fra /app/frontend/supabase/migrations/ i Supabase
 *     SQL-editoren (i kronologisk rækkefølge efter filnavn) for at oprette
 *     den samme tabel-struktur.
 *
 *  3) Tilføj følgende variabler i /app/frontend/.env:
 *
 *       VITE_SUPABASE_URL="https://<dit-projekt-ref>.supabase.co"
 *       VITE_SUPABASE_PUBLISHABLE_KEY="<din-anon-public-key>"
 *
 *  4) Genopret den rigtige Supabase-klient. Opret f.eks. filen
 *     /app/frontend/src/integrations/supabase/client.ts med:
 *
 *       import { createClient } from "@supabase/supabase-js";
 *       const url = import.meta.env.VITE_SUPABASE_URL as string;
 *       const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
 *       export const supabase = createClient(url, key, {
 *         auth: {
 *           storage: localStorage,
 *           persistSession: true,
 *           autoRefreshToken: true,
 *         },
 *       });
 *
 *  5) Erstat alle imports i src/ fra:
 *       import { supabase } from "@/lib/backend-stub";
 *     til:
 *       import { supabase } from "@/integrations/supabase/client";
 *
 *     (Søg-og-erstat på tværs af projektet – mønstret er identisk.)
 *
 *  6) Slet denne fil (backend-stub.ts) og banneret
 *     <BackendStubBanner /> fra src/components/AppLayout.tsx.
 *
 *  7) Pakken @supabase/supabase-js er allerede installeret
 *     (se package.json) og klar til brug.
 *
 * ============================================================================
 */

// ----------------------------------------------------------------------------
//  Lokale typer (ingen import fra @supabase/supabase-js – stubben er ren)
// ----------------------------------------------------------------------------

export type AppRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  created_at: string;
}

export interface Session {
  user: User;
  access_token: string;
  expires_at?: number;
  token_type?: string;
}

const STUB_ERROR_MESSAGE =
  "Backend skal opsættes – forbind dit Supabase-projekt for at gemme data.";
const stubError = () => ({ message: STUB_ERROR_MESSAGE, name: "BackendNotConfigured" });

// ----------------------------------------------------------------------------
//  Demo session-håndtering (localStorage)
// ----------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "asa_kls_demo_session";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function makeSession(email: string): Session {
  // Stabil deterministisk id baseret på email, så samme bruger genkendes
  // mellem reloads – godt nok til demo-formål.
  const id = `demo-${btoa(email).replace(/=/g, "").slice(0, 16)}`;
  return {
    access_token: `demo-token-${id}`,
    token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    user: {
      id,
      email,
      user_metadata: { full_name: email.split("@")[0] || "Demo Bruger" },
      app_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

// ----------------------------------------------------------------------------
//  Auth state-listeners
// ----------------------------------------------------------------------------

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION";
type AuthCallback = (event: AuthEvent, session: Session | null) => void | Promise<void>;
const authListeners = new Set<AuthCallback>();

function notifyAuth(event: AuthEvent, session: Session | null) {
  authListeners.forEach((cb) => {
    try { cb(event, session); } catch { /* swallow */ }
  });
}

// ----------------------------------------------------------------------------
//  Query-builder mock for `.from(table).select()...`
// ----------------------------------------------------------------------------

interface MockSelectResult {
  data: unknown[] | null;
  error: { message: string } | null;
  count?: number | null;
}

interface MockMutationResult {
  data: null;
  error: { message: string };
}

/**
 * Chainable query-builder der efterligner Supabase's PostgrestFilterBuilder.
 * Alle filter-/sorterings-/limit-metoder returnerer `this` så kæder virker.
 * Terminal-metoder (`maybeSingle`, `single`) og `await` på selve builderen
 * returnerer strukturerede objekter.
 */
class StubQueryBuilder<T = unknown> implements PromiseLike<MockSelectResult | MockMutationResult> {
  constructor(
    private readonly mode: "select" | "insert" | "update" | "delete" | "upsert",
    private readonly options: { head?: boolean; count?: string | null } = {}
  ) {}

  // --- filter / order / pagination (alle no-ops, returner this) ---
  eq(_col: string, _val: unknown) { return this; }
  neq(_col: string, _val: unknown) { return this; }
  gt(_col: string, _val: unknown) { return this; }
  gte(_col: string, _val: unknown) { return this; }
  lt(_col: string, _val: unknown) { return this; }
  lte(_col: string, _val: unknown) { return this; }
  like(_col: string, _val: unknown) { return this; }
  ilike(_col: string, _val: unknown) { return this; }
  is(_col: string, _val: unknown) { return this; }
  in(_col: string, _val: unknown[]) { return this; }
  contains(_col: string, _val: unknown) { return this; }
  containedBy(_col: string, _val: unknown) { return this; }
  match(_query: Record<string, unknown>) { return this; }
  not(_col: string, _op: string, _val: unknown) { return this; }
  or(_filters: string) { return this; }
  filter(_col: string, _op: string, _val: unknown) { return this; }
  order(_col: string, _opts?: unknown) { return this; }
  limit(_n: number) { return this; }
  range(_from: number, _to: number) { return this; }
  select(_cols?: string, _opts?: { head?: boolean; count?: string }) {
    return this;
  }
  returns<R = T>() { return this as unknown as StubQueryBuilder<R>; }

  // --- terminale metoder ---
  async maybeSingle(): Promise<{ data: null; error: null }> {
    return { data: null, error: null };
  }
  async single(): Promise<{ data: null; error: null }> {
    return { data: null, error: null };
  }
  async csv(): Promise<{ data: string; error: null }> {
    return { data: "", error: null };
  }

  // --- thenable: await på builderen ---
  then<TResult1 = MockSelectResult | MockMutationResult, TResult2 = never>(
    onfulfilled?:
      | ((value: MockSelectResult | MockMutationResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const result: MockSelectResult | MockMutationResult =
      this.mode === "select"
        ? { data: [], error: null, count: 0 }
        : { data: null, error: stubError() };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function tableApi(_table: string) {
  return {
    select: (_cols?: string, opts?: { head?: boolean; count?: string }) =>
      new StubQueryBuilder("select", opts),
    insert: (_rows: unknown) => new StubQueryBuilder("insert"),
    upsert: (_rows: unknown, _opts?: unknown) => new StubQueryBuilder("upsert"),
    update: (_values: unknown) => new StubQueryBuilder("update"),
    delete: () => new StubQueryBuilder("delete"),
  };
}

// ----------------------------------------------------------------------------
//  Storage stub (file uploads / public URLs)
// ----------------------------------------------------------------------------

function storageApi(_bucket: string) {
  return {
    upload: async (_path: string, _file: unknown, _opts?: unknown) => ({
      data: null,
      error: stubError(),
    }),
    download: async (_path: string) => ({ data: null, error: stubError() }),
    remove: async (_paths: string[]) => ({ data: null, error: stubError() }),
    getPublicUrl: (_path: string) => ({
      data: { publicUrl: "" },
    }),
    createSignedUrl: async (_path: string, _expiresIn: number) => ({
      data: null,
      error: stubError(),
    }),
    list: async (_path?: string, _opts?: unknown) => ({ data: [], error: null }),
  };
}

// ----------------------------------------------------------------------------
//  Realtime channel stub (chat / live updates)
// ----------------------------------------------------------------------------

function makeChannel(_name: string) {
  const channel: {
    on: (..._args: unknown[]) => typeof channel;
    subscribe: (_cb?: (status: string) => void) => typeof channel;
    unsubscribe: () => Promise<"ok">;
  } = {
    on: (..._args: unknown[]) => channel,
    subscribe: (cb?: (status: string) => void) => {
      try { cb?.("SUBSCRIBED"); } catch { /* ignore */ }
      return channel;
    },
    unsubscribe: async () => "ok" as const,
  };
  return channel;
}

// ----------------------------------------------------------------------------
//  Edge Functions stub
// ----------------------------------------------------------------------------

const functionsApi = {
  invoke: async (_name: string, _opts?: unknown) => ({
    data: null,
    error: stubError(),
  }),
};

// ----------------------------------------------------------------------------
//  Auth API stub
// ----------------------------------------------------------------------------

const authApi = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    if (!email || !password) {
      return { data: { user: null, session: null }, error: { message: "Email og adgangskode kræves" } };
    }
    const session = makeSession(email);
    saveSession(session);
    notifyAuth("SIGNED_IN", session);
    return { data: { user: session.user, session }, error: null };
  },

  async signUp({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }) {
    if (!email || !password) {
      return { data: { user: null, session: null }, error: { message: "Email og adgangskode kræves" } };
    }
    const session = makeSession(email);
    if (options?.data?.full_name) {
      session.user.user_metadata.full_name = options.data.full_name;
    }
    saveSession(session);
    notifyAuth("SIGNED_IN", session);
    return { data: { user: session.user, session }, error: null };
  },

  async signOut() {
    saveSession(null);
    notifyAuth("SIGNED_OUT", null);
    return { error: null };
  },

  async getSession() {
    return { data: { session: loadSession() }, error: null };
  },

  async getUser() {
    const s = loadSession();
    return { data: { user: s?.user ?? null }, error: null };
  },

  async resetPasswordForEmail(_email: string, _opts?: unknown) {
    // I demo-mode "lykkes" det altid – men ingen rigtig email sendes.
    return { data: {}, error: null };
  },

  async updateUser(_updates: unknown) {
    return { data: { user: loadSession()?.user ?? null }, error: null };
  },

  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback);
    // Match Supabase: kald straks med initial state (på næste tick)
    setTimeout(() => {
      try { callback("INITIAL_SESSION", loadSession()); } catch { /* ignore */ }
    }, 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
};

// ----------------------------------------------------------------------------
//  Eksport: et objekt der i form ligner Supabase-klienten
// ----------------------------------------------------------------------------

export const supabase = {
  auth: authApi,
  from: (table: string) => tableApi(table),
  storage: { from: (bucket: string) => storageApi(bucket) },
  functions: functionsApi,
  channel: (name: string) => makeChannel(name),
  removeChannel: (_channel: unknown) => Promise.resolve("ok" as const),
  removeAllChannels: () => Promise.resolve(["ok"] as const),
};

// Praktisk flag som UI kan tjekke for at vise advarselsbanneret.
export const IS_BACKEND_STUB = true;
