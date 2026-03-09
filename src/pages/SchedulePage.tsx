import { PageHeader } from "@/components/PageHeader";
import { BulkScheduleDialog } from "@/components/schedule/BulkScheduleDialog";
import { EditScheduleDialog } from "@/components/schedule/EditScheduleDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, getISOWeek, isToday, startOfWeek, subWeeks } from "date-fns";
import { da } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarX, ChevronLeft, ChevronRight, Clock, History, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeFilterOpen, setEmployeeFilterOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // 7 days: Monday - Sunday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNum = getISOWeek(weekStart);

  // Determine which users to show
  const viewUserIds = useMemo(() => {
    if (role === "admin" && selectedEmployeeIds.length > 0) {
      return selectedEmployeeIds;
    }
    return user ? [user.id] : [];
  }, [role, selectedEmployeeIds, user]);

  const deleteFutureSchedules = useMutation({
    mutationFn: async (userIds: string[]) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("schedules")
        .delete()
        .in("user_id", userIds)
        .gte("date", today);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Fremtidige planer slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePastSchedules = useMutation({
    mutationFn: async (userIds: string[]) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("schedules")
        .delete()
        .in("user_id", userIds)
        .lt("date", today);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Tidligere planer slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["schedules", weekStart.toISOString(), viewUserIds],
    queryFn: async () => {
      const startDate = format(days[0], "yyyy-MM-dd");
      const endDate = format(days[6], "yyyy-MM-dd");
      const query = supabase
        .from("schedules")
        .select("*, cases(case_number, address, customer), profiles!schedules_user_id_profiles_fkey(full_name, avatar_url)")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("user_id", viewUserIds);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && viewUserIds.length > 0,
  });

  // Fetch time entries for the visible week to show hours
  const { data: timeEntries } = useQuery({
    queryKey: ["time_entries_schedule", weekStart.toISOString(), viewUserIds],
    queryFn: async () => {
      const startDate = format(days[0], "yyyy-MM-dd");
      const endDate = format(days[6], "yyyy-MM-dd");
      let query = supabase
        .from("time_entries")
        .select("id, date, hours, user_id, start_time, end_time, cases(case_number)")
        .gte("date", startDate)
        .lte("date", endDate);
      if (role !== "admin") {
        query = query.eq("user_id", user!.id);
      } else if (viewUserIds.length > 0) {
        query = query.in("user_id", viewUserIds);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const timeEntriesByDate = useMemo(() => {
    const map: Record<string, { total: number; entries: any[] }> = {};
    timeEntries?.forEach((e: any) => {
      if (!map[e.date]) map[e.date] = { total: 0, entries: [] };
      map[e.date].total += Number(e.hours);
      map[e.date].entries.push(e);
    });
    return map;
  }, [timeEntries]);

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
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url").order("full_name");
      return data || [];
    },
    enabled: role === "admin",
  });

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q || !employees) return employees || [];
    return employees.filter((e: any) => e.full_name.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const toggleEmployee = (uid: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const clearEmployeeFilter = () => {
    setSelectedEmployeeIds([]);
    setEmployeeSearch("");
  };

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
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Kalender</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalScheduled} opgave{totalScheduled !== 1 ? 'r' : ''} denne uge
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Week Navigation - Clean pill design */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-full p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <button
              onClick={goToToday}
              className="px-4 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              Uge {weekNum} · {format(weekStart, "MMM yyyy", { locale: da })}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="rounded-full text-xs font-medium"
          >
            I dag
          </Button>

          {role === "admin" && (
            <>
              {/* Employee Filter - Modern dropdown */}
              <Popover open={employeeFilterOpen} onOpenChange={setEmployeeFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-2 rounded-full font-medium",
                      selectedEmployeeIds.length > 0 && "bg-primary/10 border-primary/30 text-primary"
                    )}
                  >
                    <Users size={14} />
                    {selectedEmployeeIds.length > 0
                      ? `${selectedEmployeeIds.length} valgt`
                      : "Vælg medarbejder"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-2xl shadow-elevated" align="end">
                  <div className="flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30 rounded-t-2xl">
                      <p className="text-sm font-semibold text-foreground">Vælg medarbejdere</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Filtrer kalendervisning</p>
                    </div>
                    
                    {/* Search */}
                    <div className="p-3 border-b border-border">
                      <Input
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Søg efter navn..."
                        className="h-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
                      />
                    </div>
                    
                    {/* Employee List */}
                    <ScrollArea className="max-h-72">
                      <div className="p-2">
                        {filteredEmployees?.map((emp: any) => {
                          const isSelected = selectedEmployeeIds.includes(emp.user_id);
                          return (
                            <label
                              key={emp.user_id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none",
                                isSelected
                                  ? "bg-primary/10 ring-1 ring-primary/20"
                                  : "hover:bg-muted/70"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleEmployee(emp.user_id)}
                                className="h-5 w-5 rounded-md"
                              />
                              <Avatar className="h-8 w-8 ring-2 ring-background">
                                <AvatarImage src={(emp as any).avatar_url || ""} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {emp.full_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className={cn(
                                "text-sm truncate",
                                isSelected ? "font-semibold text-primary" : "text-foreground"
                              )}>
                                {emp.full_name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    
                    {/* Actions Footer */}
                    {selectedEmployeeIds.length > 0 && (
                      <div className="p-3 border-t border-border bg-muted/20 rounded-b-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">
                            {selectedEmployeeIds.length} medarbejder{selectedEmployeeIds.length > 1 ? 'e' : ''} valgt
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearEmployeeFilter}
                            className="h-7 text-xs rounded-lg hover:bg-background"
                          >
                            Ryd alle
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Slet alle FREMTIDIGE planer?`)) {
                                deleteFutureSchedules.mutate(selectedEmployeeIds);
                              }
                            }}
                            className="h-9 text-xs rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <CalendarX size={14} className="mr-1.5" />
                            Fremtidige
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Slet alle TIDLIGERE planer?`)) {
                                deletePastSchedules.mutate(selectedEmployeeIds);
                              }
                            }}
                            className="h-9 text-xs rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <History size={14} className="mr-1.5" />
                            Tidligere
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Add Schedule Button */}
              <Button
                size="sm"
                className="gap-2 rounded-full shadow-md hover:shadow-lg transition-shadow"
                onClick={() => setBulkOpen(true)}
              >
                <Plus size={16} />
                Planlæg
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Week Grid - Time-based layout like Google Calendar */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border">
          <div className="border-r border-border/50" />
          {days.map((day, i) => {
            const today = isToday(day);
            const dayName = format(day, "EEE", { locale: da }).toUpperCase();
            const dayNum = format(day, "d");
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTime = timeEntriesByDate[dateStr];
            const dayHours = dayTime ? Math.round(dayTime.total * 10) / 10 : 0;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "px-2 py-3 text-center border-r last:border-r-0 border-border/50",
                  today && "bg-primary/5"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    today ? "text-primary" : "text-muted-foreground"
                  )}>
                    {dayName}
                  </span>
                  <span className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold",
                    today
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground"
                  )}>
                    {dayNum}
                  </span>
                  {dayHours > 0 && (
                    <span className={cn(
                      "text-[9px] font-bold rounded-full px-2 py-0.5",
                      dayHours >= 8 ? "bg-success/15 text-success" : dayHours >= 4 ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"
                    )}>
                      {dayHours}t
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] overflow-y-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          {/* Time labels column */}
          <div className="border-r border-border/50 relative">
            {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
              <div key={hour} className="h-[60px] relative">
                <span className="absolute -top-2 right-2 text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const daySchedules = getScheduleForDay(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTime = timeEntriesByDate[dateStr];
            const today = isToday(day);
            const isWeekend = i >= 5;

            const START_HOUR = 6;
            const HOUR_HEIGHT = 60;

            const getPosition = (startTime: string, endTime: string) => {
              const [sh, sm] = startTime.split(":").map(Number);
              const [eh, em] = endTime.split(":").map(Number);
              const top = ((sh - START_HOUR) + sm / 60) * HOUR_HEIGHT;
              const height = Math.max(((eh - sh) + (em - sm) / 60) * HOUR_HEIGHT, 28);
              return { top: Math.max(top, 0), height };
            };

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r last:border-r-0 border-border/50 relative",
                  today && "bg-primary/[0.02]",
                  isWeekend && !today && "bg-muted/10"
                )}
              >
                {/* Hour grid lines */}
                {Array.from({ length: 16 }, (_, h) => h + 6).map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-border/20" />
                ))}

                {/* Schedule entries - positioned by time */}
                {daySchedules.map((s: any) => {
                  if (!s.start_time || !s.end_time) return null;
                  const { top, height } = getPosition(s.start_time.slice(0, 5), s.end_time.slice(0, 5));

                  return (
                    <div
                      key={s.id}
                      className="absolute left-1 right-1 rounded-lg bg-gradient-to-br from-primary/15 to-primary/8 border border-primary/20 px-2 py-1.5 group overflow-hidden hover:from-primary/20 hover:to-primary/12 transition-all cursor-default z-10 shadow-sm"
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '28px' }}
                    >
                      <p className="text-[10px] font-bold text-foreground leading-tight truncate pr-8">
                        {(s.cases as any)?.case_number ? `Sag ${(s.cases as any).case_number}` : "Ingen sag"}
                      </p>
                      {height > 40 && (s.cases as any)?.customer && (
                        <p className="text-[9px] text-muted-foreground truncate">{(s.cases as any).customer}</p>
                      )}
                      {height > 55 && (s as any).profiles?.full_name && (
                        <div className="flex items-center gap-1 mt-1">
                          <Avatar className="h-4 w-4 ring-1 ring-background">
                            <AvatarImage src={(s as any).profiles.avatar_url || ""} />
                            <AvatarFallback className="text-[7px] bg-primary/20 text-primary font-bold">
                              {(s as any).profiles.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {(s as any).profiles.full_name}
                          </span>
                        </div>
                      )}
                      {height > 70 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={9} className="text-primary shrink-0" />
                          <span className="text-[9px] font-semibold text-primary tabular-nums">
                            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                          </span>
                        </div>
                      )}

                      {/* Admin actions */}
                      {role === "admin" && (
                        <div className="absolute top-1 right-1 flex gap-0.5">
                          {deleteConfirm === s.id ? (
                            <div className="flex gap-0.5 bg-background rounded-md p-0.5 shadow-sm">
                              <button
                                onClick={() => deleteSchedule.mutate(s.id)}
                                className="rounded bg-destructive px-1.5 py-0.5 text-[8px] font-semibold text-destructive-foreground"
                              >
                                Slet
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded bg-muted px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground"
                              >
                                Nej
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(s)}
                                className="opacity-0 group-hover:opacity-100 rounded p-1 bg-background/90 text-muted-foreground hover:text-primary transition-all shadow-sm"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(s.id)}
                                className="opacity-0 group-hover:opacity-100 rounded p-1 bg-background/90 text-muted-foreground hover:text-destructive transition-all shadow-sm"
                              >
                                <Trash2 size={10} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Time entries - positioned by time */}
                {dayTime?.entries.map((te: any) => {
                  if (!te.start_time || !te.end_time) return null;
                  const { top, height } = getPosition(te.start_time.slice(0, 5), te.end_time.slice(0, 5));

                  return (
                    <div
                      key={`te-${te.id}`}
                      className="absolute left-1 right-1 rounded-lg bg-success/10 border border-success/20 px-2 py-1 overflow-hidden z-[5]"
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-success truncate">
                          {(te.cases as any)?.case_number || "–"}
                        </span>
                        <span className="text-[9px] font-bold text-success tabular-nums">
                          {Number(te.hours).toFixed(1)}t
                        </span>
                      </div>
                      {height > 35 && (
                        <span className="text-[8px] text-muted-foreground tabular-nums">
                          {te.start_time?.slice(0, 5)}–{te.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {today && (() => {
                  const now = new Date();
                  const h = now.getHours();
                  const m = now.getMinutes();
                  if (h < START_HOUR || h > 21) return null;
                  const top = ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
                  return (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 h-[2px] bg-destructive/70" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
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

      {/* Edit dialog - new modern component */}
      <EditScheduleDialog
        open={editOpen}
        onOpenChange={(v) => { setEditOpen(v); if (!v) setEditEntry(null); }}
        entry={editEntry}
        employees={(employees as any) || []}
        cases={(cases as any) || []}
        onSave={(entry) => updateSchedule.mutate(entry)}
        isSaving={updateSchedule.isPending}
      />
    </div>
  );
}
