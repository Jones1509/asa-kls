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

      {/* Week Grid - Full height modern layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-0 lg:border lg:border-border lg:rounded-2xl lg:overflow-hidden lg:bg-card lg:shadow-card" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {days.map((day, i) => {
          const daySchedules = getScheduleForDay(day);
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTime = timeEntriesByDate[dateStr];
          const dayHours = dayTime ? Math.round(dayTime.total * 10) / 10 : 0;
          const dayName = format(day, "EEE", { locale: da }).toUpperCase();
          const dayNum = format(day, "d");
          const monthName = format(day, "MMM", { locale: da });
          const hasSchedule = daySchedules.length > 0;
          const hasHours = dayHours > 0;
          const today = isToday(day);
          const isWeekend = i >= 5;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02, duration: 0.15 }}
              className={cn(
                "flex flex-col transition-all relative",
                // Mobile: cards, Desktop: grid columns
                "rounded-2xl lg:rounded-none",
                "border lg:border-0 lg:border-r lg:last:border-r-0",
                today
                  ? "bg-primary/[0.03] lg:bg-primary/[0.03]"
                  : isWeekend
                    ? "bg-muted/20"
                    : "bg-card",
                "lg:border-b-0"
              )}
            >
              {/* Day Header - Sticky top bar */}
              <div className={cn(
                "px-3 py-3 border-b flex items-center justify-between",
                today ? "border-primary/20 bg-primary/5" : "border-border/50"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold",
                    today
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground"
                  )}>
                    {dayNum}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider leading-none",
                      today ? "text-primary" : "text-muted-foreground"
                    )}>
                      {dayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 capitalize">{monthName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {hasHours && (
                    <span className={cn(
                      "text-[10px] font-bold rounded-lg px-2 py-1",
                      dayHours >= 8
                        ? "bg-success/15 text-success"
                        : dayHours >= 4
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/15 text-warning"
                    )}>
                      {dayHours}t
                    </span>
                  )}
                  {hasSchedule && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-lg px-2 py-1">
                      {daySchedules.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Content area - fills remaining space */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {isLoading ? (
                  <>
                    <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
                    <div className="h-12 rounded-xl bg-muted/30 animate-pulse" />
                  </>
                ) : hasSchedule ? (
                  <>
                    {daySchedules.map((s: any) => (
                      <div
                        key={s.id}
                        className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 p-3 group relative hover:from-primary/15 hover:to-primary/8 transition-all cursor-default"
                      >
                        <p className="text-[11px] font-bold text-foreground pr-10 leading-snug">
                          {(s.cases as any)?.case_number ? `Sag ${(s.cases as any).case_number}` : "Ingen sag"}
                        </p>
                        {(s.cases as any)?.customer && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{(s.cases as any).customer}</p>
                        )}

                        {(s as any).profiles?.full_name && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Avatar className="h-5 w-5 ring-1 ring-background">
                              <AvatarImage src={(s as any).profiles.avatar_url || ""} />
                              <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                                {(s as any).profiles.full_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground truncate font-medium">
                              {(s as any).profiles.full_name}
                            </span>
                          </div>
                        )}

                        {s.start_time && s.end_time && (
                          <div className="flex items-center gap-1.5 mt-2 rounded-lg bg-primary/8 px-2 py-1 w-fit">
                            <Clock size={10} className="text-primary" />
                            <span className="text-[10px] font-semibold text-primary tabular-nums">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </span>
                          </div>
                        )}

                        {s.notes && (
                          <p className="text-[9px] text-muted-foreground/70 mt-1.5 italic truncate">{s.notes}</p>
                        )}

                        {role === "admin" && (
                          <div className="absolute top-2 right-2 flex gap-0.5">
                            {deleteConfirm === s.id ? (
                              <div className="flex gap-0.5 bg-background rounded-lg p-0.5 shadow-sm">
                                <button
                                  onClick={() => deleteSchedule.mutate(s.id)}
                                  className="rounded-md bg-destructive px-2 py-1 text-[9px] font-semibold text-destructive-foreground"
                                >
                                  Slet
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="rounded-md bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground"
                                >
                                  Nej
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEdit(s)}
                                  className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 bg-background/90 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shadow-sm"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(s.id)}
                                  className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 bg-background/90 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shadow-sm"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Time entries section if hours logged */}
                    {hasHours && dayTime?.entries && (
                      <div className="mt-1 pt-2 border-t border-border/30">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Registreret</p>
                        {dayTime.entries.map((te: any) => (
                          <div key={te.id} className="rounded-lg bg-success/8 border border-success/12 px-2.5 py-1.5 mb-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-success truncate">
                                {(te.cases as any)?.case_number || "–"}
                              </span>
                              <span className="text-[10px] font-bold text-success tabular-nums">
                                {Number(te.hours).toFixed(1)}t
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground tabular-nums">
                              {te.start_time?.slice(0, 5)}–{te.end_time?.slice(0, 5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : hasHours ? (
                  /* Only time entries, no schedules */
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Registreret</p>
                    {dayTime?.entries.map((te: any) => (
                      <div key={te.id} className="rounded-lg bg-success/8 border border-success/12 px-2.5 py-1.5 mb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-success truncate">
                            {(te.cases as any)?.case_number || "–"}
                          </span>
                          <span className="text-[10px] font-bold text-success tabular-nums">
                            {Number(te.hours).toFixed(1)}t
                          </span>
                        </div>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {te.start_time?.slice(0, 5)}–{te.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-1 opacity-30">
                    <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                      <CalendarX size={14} className="text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Ingen opgaver</p>
                  </div>
                )}
              </div>
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
