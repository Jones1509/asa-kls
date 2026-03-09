import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";

interface QuickEntryFormProps {
  form: { case_id: string; user_id: string; date: string; start_time: string; end_time: string; notes: string; lunch_break: boolean };
  setForm: (form: any) => void;
  isAdmin: boolean;
  employees: { user_id: string; full_name: string }[];
  cases: { id: string; case_number: string; customer?: string }[];
  onSubmit: () => void;
  isPending: boolean;
}

export function QuickEntryForm({ form, setForm, isAdmin, employees, cases, onSubmit, isPending }: QuickEntryFormProps) {
  const [calOpen, setCalOpen] = useState(false);

  const employeeOptions = [...(employees || [])]
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "da"))
    .map(e => ({ value: e.user_id, label: e.full_name }));

  const caseOptions = (cases || []).map(c => ({
    value: c.id,
    label: c.case_number,
    sublabel: c.customer,
  }));

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

  // Calculate preview hours
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
      <h3 className="font-heading font-bold text-card-foreground mb-4 flex items-center gap-2 text-[15px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Plus size={15} className="text-primary" />
        </div>
        Registrer timer
      </h3>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        {/* Row 1: Employee + Case + Date */}
        <div className={cn("grid gap-3", isAdmin ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
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
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sag</Label>
            <SearchableSelect
              options={caseOptions}
              value={form.case_id}
              onSelect={(v) => setForm({ ...form, case_id: v })}
              placeholder="Søg sag..."
              searchPlaceholder="Søg sagsnummer..."
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Dato</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal rounded-xl h-10 border-border text-sm"
                >
                  <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
                  {format(selectedDate, "d. MMMM yyyy", { locale: da })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
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

        {/* Row 2: Start + End + Lunch + Note + Submit */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
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
              className="rounded-xl h-10 tabular-nums text-center font-semibold"
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
              className="rounded-xl h-10 tabular-nums text-center font-semibold"
              required
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Frokost</Label>
            <button
              type="button"
              onClick={() => setForm({ ...form, lunch_break: !form.lunch_break })}
              className={cn(
                "w-full h-10 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all",
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
              className="rounded-xl h-10"
            />
          </div>
          <Button
            type="submit"
            className="rounded-xl h-10 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)] font-semibold"
            disabled={isPending}
          >
            {isPending ? "Gemmer..." : "Registrer"}
          </Button>
        </div>

        {/* Hours preview */}
        {previewHours && (
          <div className="flex items-center gap-3 text-sm px-1">
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
