import { useMemo, useState } from "react";
import { addDays, format, getISODay, parseISO } from "date-fns";
import { CalendarDays, Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Employee = { user_id: string; full_name: string };
type Case = { id: string; case_number: string; customer?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  cases: Case[];
}

const defaultForm = {
  caseId: "",
  dateFrom: "",
  dateTo: "",
  startTime: "08:00",
  endTime: "16:00",
  notes: "",
};

export function BulkScheduleDialog({ open, onOpenChange, employees, cases }: Props) {
  const queryClient = useQueryClient();
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState("");

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const toggleEmployee = (uid: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.full_name.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const scheduleDates = useMemo(() => {
    if (!form.dateFrom || !form.dateTo || form.dateFrom > form.dateTo) return [];
    const dates: string[] = [];
    let d = parseISO(form.dateFrom);
    const end = parseISO(form.dateTo);
    while (d.getTime() <= end.getTime()) {
      if (selectedDays.has(getISODay(d))) {
        dates.push(format(d, "yyyy-MM-dd"));
      }
      d = addDays(d, 1);
    }
    return dates;
  }, [form.dateFrom, form.dateTo, selectedDays]);

  const totalEntries = scheduleDates.length * selectedEmployeeIds.length;

  const reset = () => {
    setSelectedEmployeeIds([]);
    setForm(defaultForm);
    setSelectedDays(new Set());
    setEmployeeSearch("");
  };

  const createSchedules = useMutation({
    mutationFn: async () => {
      if (selectedEmployeeIds.length === 0 || scheduleDates.length === 0) return { created: 0, conflicts: 0 };

      // Fetch existing schedules for conflict check
      const { data: existing } = await supabase
        .from("schedules")
        .select("user_id, date, start_time, end_time")
        .in("user_id", selectedEmployeeIds)
        .in("date", scheduleDates);

      const toInsert: any[] = [];
      let conflictCount = 0;

      for (const uid of selectedEmployeeIds) {
        for (const date of scheduleDates) {
          const hasConflict = existing?.some((ex: any) => {
            if (ex.user_id !== uid || ex.date !== date) return false;
            // Overlap: new.start < existing.end AND new.end > existing.start
            return form.startTime < ex.end_time.slice(0, 5) && form.endTime > ex.start_time.slice(0, 5);
          });
          if (hasConflict) {
            conflictCount++;
          } else {
            toInsert.push({
              user_id: uid,
              case_id: form.caseId || null,
              date,
              start_time: form.startTime,
              end_time: form.endTime,
              notes: form.notes || null,
            });
          }
        }
      }

      if (toInsert.length === 0) {
        throw new Error("Alle tidspunkter er allerede optaget – juster tider eller datoer");
      }

      const { error } = await supabase.from("schedules").insert(toInsert);
      if (error) throw error;

      return { created: toInsert.length, conflicts: conflictCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      if (result && result.conflicts > 0) {
        toast.warning(`${result.created} poster oprettet · ${result.conflicts} sprunget over pga. overlap`);
      } else {
        toast.success(`${result?.created || totalEntries} poster planlagt`);
      }
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isValid =
    selectedEmployeeIds.length > 0 &&
    scheduleDates.length > 0 &&
    form.startTime < form.endTime;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="font-heading font-bold text-lg">Planlæg opgave</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Vælg medarbejdere, sag, datointerval og tidspunkter
            </p>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Employee selection */}
            <div className="w-56 flex-shrink-0 border-r border-border flex flex-col">
              <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Medarbejdere
                </p>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Søg..."
                    className="w-full h-8 pl-7 pr-2 rounded-lg border border-input bg-background text-xs focus:ring-1 focus:ring-ring outline-none transition-all"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 px-2 pb-4">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.user_id);
                  return (
                    <button
                      key={emp.user_id}
                      type="button"
                      onClick={() => toggleEmployee(emp.user_id)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEmployee(emp.user_id)}
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{emp.full_name}</span>
                    </button>
                  );
                })}
              </ScrollArea>
              {selectedEmployeeIds.length > 0 && (
                <div className="px-4 py-2 border-t border-border">
                  <p className="text-[11px] font-semibold text-primary">
                    {selectedEmployeeIds.length} valgt
                  </p>
                </div>
              )}
            </div>

            {/* Right: Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Case */}
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sag (valgfrit)
                </Label>
                <select
                  value={form.caseId}
                  onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all"
                >
                  <option value="">Ingen sag</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number}
                      {c.customer ? ` – ${c.customer}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Fra dato
                  </Label>
                  <Input
                    type="date"
                    value={form.dateFrom}
                    onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                    className="mt-1.5 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Til dato
                  </Label>
                  <Input
                    type="date"
                    value={form.dateTo}
                    onChange={(e) => {
                      const newTo = e.target.value;
                      setForm({ ...form, dateTo: newTo, dateFrom: form.dateFrom || newTo });
                    }}
                    className="mt-1.5 rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Day of week toggles */}
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Ugedage
                </Label>
                <div className="flex gap-1.5">
                  {ISO_DAYS.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "flex-1 h-9 rounded-lg text-xs font-semibold transition-all",
                        selectedDays.has(day)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {DAY_LABELS[idx]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Starttid
                  </Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Sluttid
                  </Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Note
                </Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Valgfrit"
                  className="mt-1.5 rounded-xl"
                />
              </div>

              {/* Preview */}
              {totalEntries > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-primary" />
                    <p className="text-sm font-semibold text-primary">Opretter {totalEntries} poster</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEmployeeIds.length} medarbejder{selectedEmployeeIds.length !== 1 ? "e" : ""} ·{" "}
                    {scheduleDates.length} dag{scheduleDates.length !== 1 ? "e" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Annuller
            </Button>
            <Button
              className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
              disabled={!isValid || createSchedules.isPending}
              onClick={() => createSchedules.mutate()}
            >
              {createSchedules.isPending ? "Planlægger..." : `Gem (${totalEntries})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
