import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "./SearchableSelect";
import { Users, CalendarIcon, Coffee, X, Search } from "lucide-react";
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWeekend } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BulkTimeEntryDialogProps {
  employees: { user_id: string; full_name: string }[];
  cases: { id: string; case_number: string; customer?: string; display_label?: string }[];
  onSubmit: (entries: { user_id: string; case_id: string; date: string; start_time: string; end_time: string; lunch_break: boolean; notes: string }[]) => void;
  isPending: boolean;
}

type DatePreset = "custom" | "this_week" | "last_week" | "this_month" | "last_month";

export function BulkTimeEntryDialog({ employees, cases, onSubmit, isPending }: BulkTimeEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [caseId, setCaseId] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [lunchBreak, setLunchBreak] = useState(true);
  const [notes, setNotes] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [empSearch, setEmpSearch] = useState("");

  const caseOptions = (cases || []).map(c => ({
    value: c.id,
    label: c.display_label || c.case_number,
    sublabel: c.customer,
  }));

  const sortedEmployees = useMemo(() =>
    [...(employees || [])].sort((a, b) => a.full_name.localeCompare(b.full_name, "da")),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (!empSearch) return sortedEmployees;
    const q = empSearch.toLowerCase();
    return sortedEmployees.filter(e => e.full_name.toLowerCase().includes(q));
  }, [sortedEmployees, empSearch]);

  const presetDates = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    switch (datePreset) {
      case "this_week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "last_week":
        start = startOfWeek(new Date(now.getTime() - 7 * 86400000), { weekStartsOn: 1 });
        end = endOfWeek(new Date(now.getTime() - 7 * 86400000), { weekStartsOn: 1 });
        break;
      case "this_month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last_month":
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = startOfMonth(lastM);
        end = endOfMonth(lastM);
        break;
      default:
        return selectedDates;
    }
    let days = eachDayOfInterval({ start, end });
    if (skipWeekends) days = days.filter(d => !isWeekend(d));
    return days;
  }, [datePreset, selectedDates, skipWeekends]);

  const activeDates = datePreset === "custom" ? selectedDates : presetDates;

  const toggleEmployee = (userId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === sortedEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(sortedEmployees.map(e => e.user_id));
    }
  };

  const handleCustomDateSelect = (dates: Date[] | undefined) => {
    if (dates) setSelectedDates(dates);
  };

  const totalEntries = selectedEmployees.length * activeDates.length;

  // Calculate preview hours
  const previewHours = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const raw = (eh + em / 60) - (sh + sm / 60);
      if (raw <= 0 || isNaN(raw)) return null;
      const breakDed = lunchBreak && raw >= 7 ? 0.5 : 0;
      return { net: Math.round((raw - breakDed) * 10) / 10, perEmployee: Math.round((raw - breakDed) * activeDates.length * 10) / 10 };
    } catch { return null; }
  }, [startTime, endTime, lunchBreak, activeDates.length]);

  const normalizeTime = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    let h = parseInt(clean.slice(0, 2)) || 0;
    let m = parseInt(clean.slice(2, 4)) || 0;
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    if (!caseId || selectedEmployees.length === 0 || activeDates.length === 0) return;
    const entries = selectedEmployees.flatMap(userId =>
      activeDates.map(date => ({
        user_id: userId,
        case_id: caseId,
        date: format(date, "yyyy-MM-dd"),
        start_time: normalizeTime(startTime),
        end_time: normalizeTime(endTime),
        lunch_break: lunchBreak,
        notes,
      }))
    );
    onSubmit(entries);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedEmployees([]);
    setCaseId("");
    setStartTime("08:00");
    setEndTime("16:00");
    setLunchBreak(true);
    setNotes("");
    setDatePreset("custom");
    setSelectedDates([]);
    setEmpSearch("");
  };

  const presets: { value: DatePreset; label: string }[] = [
    { value: "custom", label: "Vælg datoer" },
    { value: "this_week", label: "Denne uge" },
    { value: "last_week", label: "Sidste uge" },
    { value: "this_month", label: "Denne måned" },
    { value: "last_month", label: "Sidste måned" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl h-10 gap-2 text-sm font-medium">
          <Users size={14} />
          Masseregistrering
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Users size={17} className="text-primary" />
            </div>
            Masseregistrering af timer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Step 1: Select employees */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              1. Vælg medarbejdere ({selectedEmployees.length} valgt)
            </Label>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <Search size={13} className="text-muted-foreground" />
                <input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Søg medarbejder..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button onClick={selectAllEmployees} className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap">
                  {selectedEmployees.length === sortedEmployees.length ? "Fravælg alle" : "Vælg alle"}
                </button>
              </div>
              <ScrollArea className="max-h-[140px]">
                <div className="p-1.5 space-y-0.5">
                  {filteredEmployees.map(emp => (
                    <button
                      key={emp.user_id}
                      onClick={() => toggleEmployee(emp.user_id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                        selectedEmployees.includes(emp.user_id) ? "bg-primary/8 text-primary" : "hover:bg-muted/60"
                      )}
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(emp.user_id)}
                        className="pointer-events-none"
                      />
                      <span className="font-medium">{emp.full_name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Step 2: Select case */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              2. Vælg sag
            </Label>
            <SearchableSelect
              options={caseOptions}
              value={caseId}
              onSelect={setCaseId}
              placeholder="Søg sag..."
              searchPlaceholder="Søg sagsnummer..."
              className="w-full"
            />
          </div>

          {/* Step 3: Select dates */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              3. Vælg datoer ({activeDates.length} dage)
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    datePreset === p.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset !== "custom" && (
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="skip-weekends"
                  checked={skipWeekends}
                  onCheckedChange={(v) => setSkipWeekends(!!v)}
                />
                <label htmlFor="skip-weekends" className="text-xs text-muted-foreground cursor-pointer">Spring weekender over</label>
              </div>
            )}

            {datePreset === "custom" && (
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleCustomDateSelect as any}
                locale={da}
                className="rounded-xl border border-border"
              />
            )}

            {activeDates.length > 0 && datePreset !== "custom" && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeDates.slice(0, 14).map(d => (
                  <span key={d.toISOString()} className="text-[10px] bg-muted rounded-md px-1.5 py-0.5 tabular-nums text-muted-foreground">
                    {format(d, "d. MMM", { locale: da })}
                  </span>
                ))}
                {activeDates.length > 14 && (
                  <span className="text-[10px] text-muted-foreground">+{activeDates.length - 14} mere</span>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Time settings */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              4. Tidsindstillinger
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Start</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="08:00"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value.replace(/[^0-9:]/g, ""))}
                  onBlur={() => setStartTime(normalizeTime(startTime))}
                  className="rounded-xl h-10 tabular-nums text-center font-semibold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Slut</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="16:00"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value.replace(/[^0-9:]/g, ""))}
                  onBlur={() => setEndTime(normalizeTime(endTime))}
                  className="rounded-xl h-10 tabular-nums text-center font-semibold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Frokost</Label>
                <button
                  type="button"
                  onClick={() => setLunchBreak(!lunchBreak)}
                  className={cn(
                    "w-full h-10 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all",
                    lunchBreak
                      ? "bg-warning/10 border-warning/30 text-warning"
                      : "bg-muted/30 border-border text-muted-foreground"
                  )}
                >
                  <Coffee size={14} />
                  {lunchBreak ? "30 min" : "Ingen"}
                </button>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Note</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Valgfrit..."
                  className="rounded-xl h-10"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {totalEntries > 0 && previewHours && (
            <div className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-sm font-medium text-card-foreground mb-1">Opsummering</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-bold text-foreground">{selectedEmployees.length}</span> medarbejdere
                </div>
                <div>
                  <span className="font-bold text-foreground">{activeDates.length}</span> dage
                </div>
                <div>
                  <span className="font-bold text-primary">{previewHours.net}t</span> pr. dag
                </div>
                <div>
                  <span className="font-bold text-primary">{totalEntries}</span> registreringer i alt
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {totalEntries > 0
                ? `${totalEntries} registreringer oprettes`
                : "Vælg medarbejdere, sag og datoer"}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !caseId || selectedEmployees.length === 0 || activeDates.length === 0}
              className="rounded-xl px-6 font-semibold shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
            >
              {isPending ? "Opretter..." : `Registrer ${totalEntries} poster`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
