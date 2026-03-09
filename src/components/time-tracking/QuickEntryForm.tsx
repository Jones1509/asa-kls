import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface QuickEntryFormProps {
  form: { case_id: string; user_id: string; date: string; start_time: string; end_time: string; notes: string };
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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-heading font-bold text-card-foreground mb-4 flex items-center gap-2 text-[15px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Plus size={15} className="text-primary" />
        </div>
        {isAdmin ? "Registrer timer" : "Registrer timer"}
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
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
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

        {/* Row 2: Start + End + Note + Submit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
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
      </form>
    </div>
  );
}
