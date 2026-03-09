import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";

interface QuickEntryFormProps {
  form: { case_id: string; user_id: string; date: string; start_time: string; end_time: string; notes: string };
  setForm: (form: any) => void;
  isAdmin: boolean;
  employees: { user_id: string; full_name: string }[];
  cases: { id: string; case_number: string }[];
  onSubmit: () => void;
  isPending: boolean;
}

export function QuickEntryForm({ form, setForm, isAdmin, employees, cases, onSubmit, isPending }: QuickEntryFormProps) {
  const sortedEmployees = [...(employees || [])].sort((a, b) => a.full_name.localeCompare(b.full_name, "da"));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-heading font-bold text-card-foreground mb-4 flex items-center gap-2.5 text-[15px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Timer size={15} className="text-primary" />
        </div>
        {isAdmin ? "Registrer timer (admin)" : "Hurtig registrering"}
      </h3>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3"
      >
        {isAdmin && (
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Medarbejder</Label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none transition-all"
              required
            >
              <option value="">Vælg...</option>
              {sortedEmployees.map((e) => (
                <option key={e.user_id} value={e.user_id}>{e.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
          <select
            value={form.case_id}
            onChange={(e) => setForm({ ...form, case_id: e.target.value })}
            className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none transition-all"
            required
          >
            <option value="">Vælg sag...</option>
            {cases?.map((c) => (
              <option key={c.id} value={c.id}>{c.case_number}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dato</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5 rounded-xl h-10" required />
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start</Label>
          <Input
            type="text" inputMode="numeric" placeholder="08:00"
            value={form.start_time}
            onChange={(e) => {
              let raw = e.target.value.replace(/[^0-9:]/g, "");
              if (raw.replace(":", "").length > 4) return;
              setForm({ ...form, start_time: raw });
            }}
            onBlur={() => {
              const clean = form.start_time.replace(/[^0-9]/g, "");
              let h = parseInt(clean.slice(0, 2)) || 0;
              let m = parseInt(clean.slice(2, 4)) || 0;
              if (h > 23) h = 23; if (m > 59) m = 59;
              setForm({ ...form, start_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
            }}
            className="mt-1.5 rounded-xl h-10 tabular-nums"
            required
          />
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Slut</Label>
          <Input
            type="text" inputMode="numeric" placeholder="16:00"
            value={form.end_time}
            onChange={(e) => {
              let raw = e.target.value.replace(/[^0-9:]/g, "");
              if (raw.replace(":", "").length > 4) return;
              setForm({ ...form, end_time: raw });
            }}
            onBlur={() => {
              const clean = form.end_time.replace(/[^0-9]/g, "");
              let h = parseInt(clean.slice(0, 2)) || 0;
              let m = parseInt(clean.slice(2, 4)) || 0;
              if (h > 23) h = 23; if (m > 59) m = 59;
              setForm({ ...form, end_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
            }}
            className="mt-1.5 rounded-xl h-10 tabular-nums"
            required
          />
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Note</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Valgfrit" className="mt-1.5 rounded-xl h-10" />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full rounded-xl h-10 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={isPending}>
            {isPending ? "Gemmer..." : "Registrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
