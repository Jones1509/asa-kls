import { Button } from "@/components/ui/button";
import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Coffee } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

interface QuickEntryFormProps {
  form: { case_id: string; user_id: string; date: string; start_time: string; end_time: string; notes: string; lunch_break: boolean };
  setForm: (form: any) => void;
  isAdmin: boolean;
  employees: { user_id: string; full_name: string }[];
  cases: { id: string; case_number: string; customer?: string; customer_id?: string; case_description?: string }[];
  onSubmit: () => void;
  isPending: boolean;
}

export function QuickEntryForm({ form, setForm, isAdmin, employees, cases, onSubmit, isPending }: QuickEntryFormProps) {
  const [calOpen, setCalOpen] = useState(false);

  const employeeOptions = [...(employees || [])]
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "da"))
    .map(e => ({ value: e.user_id, label: e.full_name }));

  const formatTimeInput = (val: string) => {
    let raw = val.replace(/[^0-9:]/g, "");
    if (raw.replace(":", "").length > 4) return null;
    return raw;
  };

  const normalizeTime = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    let h = parseInt(clean.slice(0, 2)) || 0;
    let m = parseInt(clean.slice(2, 4)) || 0;
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const selectedDate = form.date ? new Date(form.date + "T00:00") : new Date();

  const previewHours = useMemo(() => {
    try {
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      const raw = (eh + em / 60) - (sh + sm / 60);
      if (raw <= 0 || isNaN(raw)) return null;
      const breakDeducted = form.lunch_break && raw >= 7 ? 0.5 : 0;
      return { raw: Math.round(raw * 10) / 10, net: Math.round((raw - breakDeducted) * 10) / 10, breakDeducted };
    } catch { return null; }
  }, [form.start_time, form.end_time, form.lunch_break]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-heading font-bold text-card-foreground mb-5 flex items-center gap-2 text-[15px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Plus size={15} className="text-primary" />
        </div>
        Registrer timer
      </h3>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
        <div className={cn(
          "grid items-start gap-4 lg:gap-5",
          isAdmin ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)_minmax(0,1fr)]" : "grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]"
        )}>
          {isAdmin && (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Medarbejder</Label>
              <SearchableSelect
                options={employeeOptions}
                value={form.user_id}
                onSelect={(v) => setForm({ ...form, user_id: v })}
                placeholder="Søg medarbejder..."
                searchPlaceholder="Søg navn..."
                className="w-full"
              />
            </div>
          )}
          <CustomerCaseSelect
            cases={(cases as any) || []}
            value={form.case_id}
            onChange={(caseId) => setForm({ ...form, case_id: caseId })}
            customerLabel="Kunde"
            caseLabel="Sag"
            customerPlaceholder="Vælg kunde..."
            casePlaceholder="Vælg sag..."
            required
          />
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Dato</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start rounded-xl border-border px-3 text-sm font-normal shadow-sm hover:bg-muted/40"
                >
                  <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
                  {format(selectedDate, "d. MMMM yyyy", { locale: da })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)] p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) { setForm({ ...form, date: format(d, "yyyy-MM-dd") }); setCalOpen(false); }
                  }}
                  locale={da}
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)_auto] xl:items-end">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start</Label>
            <Input
              type="text" inputMode="numeric" placeholder="08:00"
              value={form.start_time}
              onChange={(e) => {
                const v = formatTimeInput(e.target.value);
                if (v !== null) setForm({ ...form, start_time: v });
              }}
              onBlur={() => setForm({ ...form, start_time: normalizeTime(form.start_time) })}
              className="h-11 rounded-xl text-center font-semibold tabular-nums"
              required
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Slut</Label>
            <Input
              type="text" inputMode="numeric" placeholder="16:00"
              value={form.end_time}
              onChange={(e) => {
                const v = formatTimeInput(e.target.value);
                if (v !== null) setForm({ ...form, end_time: v });
              }}
              onBlur={() => setForm({ ...form, end_time: normalizeTime(form.end_time) })}
              className="h-11 rounded-xl text-center font-semibold tabular-nums"
              required
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Frokost</Label>
            <button
              type="button"
              onClick={() => setForm({ ...form, lunch_break: !form.lunch_break })}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all",
                form.lunch_break
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-muted/30 border-border text-muted-foreground"
              )}
            >
              <Coffee size={14} />
              {form.lunch_break ? "30 min" : "Ingen"}
            </button>
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Note</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Valgfrit..."
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-xl px-6 font-semibold whitespace-nowrap shadow-[0_2px_8px_hsl(215_80%_56%/0.25)] xl:w-auto"
            disabled={isPending}
          >
            {isPending ? "Gemmer..." : "Registrer"}
          </Button>
        </div>

        {previewHours && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1 text-sm">
            <span className="text-muted-foreground">
              Brutto: <span className="font-semibold text-foreground">{previewHours.raw}t</span>
            </span>
            {previewHours.breakDeducted > 0 && (
              <>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-muted-foreground">
                  Pause: <span className="font-semibold text-warning">-0,5t</span>
                </span>
                <span className="text-muted-foreground/40">→</span>
              </>
            )}
            <span className="text-muted-foreground">
              Netto: <span className="font-bold text-primary">{previewHours.net}t</span>
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
