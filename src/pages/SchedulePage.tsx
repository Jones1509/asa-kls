import { PageHeader } from "@/components/PageHeader";
import { BulkScheduleDialog } from "@/components/schedule/BulkScheduleDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, getISOWeek, isToday, startOfWeek, subWeeks } from "date-fns";
import { da } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 7 days: Monday - Sunday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNum = getISOWeek(weekStart);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["schedules", weekStart.toISOString(), user?.id, role],
    queryFn: async () => {
      const startDate = format(days[0], "yyyy-MM-dd");
      const endDate = format(days[6], "yyyy-MM-dd");
      let query = supabase
        .from("schedules")
        .select("*, cases(case_number, address, customer), profiles!schedules_user_id_profiles_fkey(full_name)")
        .gte("date", startDate)
        .lte("date", endDate);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: cases } = useQuery({
    queryKey: ["cases_schedule"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select("id, case_number, customer")
        .not("status", "eq", "Afsluttet")
        .order("case_number");
      return data || [];
    },
    enabled: role === "admin",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees_schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return data || [];
    },
    enabled: role === "admin",
  });

  const updateSchedule = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase
        .from("schedules")
        .update({
          user_id: entry.user_id,
          case_id: entry.case_id || null,
          date: entry.date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          notes: entry.notes || null,
        })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setEditOpen(false);
      setEditEntry(null);
      toast.success("Opgave opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDeleteConfirm(null);
      toast.success("Opgave slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getScheduleForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules?.filter((s: any) => s.date === dateStr) || [];
  };

  const totalScheduled = schedules?.length || 0;

  const openEdit = (s: any) => {
    setEditEntry({
      ...s,
      case_id: s.case_id || "",
      start_time: s.start_time?.slice(0, 5) || "08:00",
      end_time: s.end_time?.slice(0, 5) || "16:00",
      notes: s.notes || "",
    });
    setEditOpen(true);
  };

  return (
    <div>
      <PageHeader title="Kalender" description={`Uge ${weekNum} · ${totalScheduled} opgaver`}>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <Button
              size="sm"
              className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
              onClick={() => setBulkOpen(true)}
            >
              <Plus size={16} /> Planlæg
            </Button>
          )}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <button
              onClick={goToToday}
              className="text-sm font-semibold text-foreground min-w-[180px] text-center px-2 hover:text-primary transition-colors"
            >
              Uge {weekNum} · {format(weekStart, "MMMM yyyy", { locale: da })}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Week grid - 7 days */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day, i) => {
          const daySchedules = getScheduleForDay(day);
          const dayName = format(day, "EEEE", { locale: da });
          const dateLabel = format(day, "d. MMM", { locale: da });
          const hasSchedule = daySchedules.length > 0;
          const today = isToday(day);
          const isWeekend = i >= 5;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 transition-all min-h-[140px] ${
                today
                  ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                  : hasSchedule
                  ? "border-border bg-card shadow-card"
                  : isWeekend
                  ? "border-border/30 bg-card/30"
                  : "border-border/50 bg-card/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                    {dayName}
                  </p>
                  <p className={`text-xs mt-0.5 ${today ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                    {dateLabel}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSchedule && (
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {daySchedules.length}
                    </span>
                  )}
                  {today && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 rounded-xl bg-muted animate-pulse" />
                </div>
              ) : hasSchedule ? (
                daySchedules.map((s: any) => (
                  <div
                    key={s.id}
                    className="mt-2 rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-2 group relative"
                  >
                    <p className="text-sm font-semibold text-card-foreground pr-14">
                      {(s.cases as any)?.case_number ? `Sag ${(s.cases as any).case_number}` : "–"}
                    </p>
                    {role === "admin" && (s as any).profiles?.full_name && (
                      <p className="text-[11px] font-medium text-primary/70">{(s as any).profiles.full_name}</p>
                    )}
                    {(s.cases as any)?.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin size={12} className="text-muted-foreground/50 flex-shrink-0" />{" "}
                        <span className="truncate">{(s.cases as any).address}</span>
                      </p>
                    )}
                    {s.start_time && s.end_time && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-card-foreground border border-border w-fit">
                        <Clock size={11} className="text-primary" />
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </div>
                    )}
                    {s.notes && <p className="text-[11px] text-muted-foreground/60 italic">{s.notes}</p>}

                    {role === "admin" && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {deleteConfirm === s.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => deleteSchedule.mutate(s.id)}
                              className="rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              Slet
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                              Nej
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(s)}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(s.id)}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-border/50 px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground/50 italic">Ingen opgaver</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bulk schedule dialog */}
      {role === "admin" && (
        <BulkScheduleDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          employees={(employees as any) || []}
          cases={(cases as any) || []}
        />
      )}

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditEntry(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Rediger opgave</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSchedule.mutate(editEntry);
              }}
              className="space-y-4"
            >
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Medarbejder
                </Label>
                <select
                  value={editEntry.user_id}
                  onChange={(e) => setEditEntry({ ...editEntry, user_id: e.target.value })}
                  className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all"
                  required
                >
                  <option value="">Vælg medarbejder...</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sag (valgfrit)
                </Label>
                <select
                  value={editEntry.case_id}
                  onChange={(e) => setEditEntry({ ...editEntry, case_id: e.target.value })}
                  className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all"
                >
                  <option value="">Ingen sag</option>
                  {cases?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number}
                      {c.customer ? ` – ${c.customer}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Dato
                </Label>
                <Input
                  type="date"
                  value={editEntry.date}
                  onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Start
                  </Label>
                  <Input
                    type="time"
                    value={editEntry.start_time}
                    onChange={(e) => setEditEntry({ ...editEntry, start_time: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Slut
                  </Label>
                  <Input
                    type="time"
                    value={editEntry.end_time}
                    onChange={(e) => setEditEntry({ ...editEntry, end_time: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Note
                </Label>
                <Input
                  value={editEntry.notes}
                  onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })}
                  placeholder="Valgfrit"
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl"
                >
                  Annuller
                </Button>
                <Button
                  type="submit"
                  disabled={updateSchedule.isPending}
                  className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                >
                  {updateSchedule.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
