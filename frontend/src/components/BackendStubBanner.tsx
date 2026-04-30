import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { IS_BACKEND_STUB } from "@/lib/backend-stub";

/**
 * Tydelig (men ikke skrigende) banner i toppen af appen som signalerer
 * at backenden er en placeholder. Vises kun når backend-stubben er aktiv.
 * Banneret kan lukkes for den aktuelle session via knappen i højre side.
 *
 * Når et rigtigt Supabase-projekt tilkobles og backend-stub.ts slettes,
 * fjernes denne komponent automatisk fra layoutet.
 */
export function BackendStubBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!IS_BACKEND_STUB || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 px-4 py-2 text-amber-900 dark:text-amber-100 backdrop-blur-sm"
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
        <AlertTriangle size={14} strokeWidth={2.5} />
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] leading-tight">
        <span className="font-semibold">Backend skal opsættes</span>
        <span className="text-amber-800/80 dark:text-amber-100/70">
          Denne version kører i demo-mode uden database. Forbind dit Supabase-projekt for at gemme og hente rigtige data.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Skjul advarsel"
        className="flex-shrink-0 rounded-md p-1 text-amber-700/70 transition-colors hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-200/70 dark:hover:text-amber-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
