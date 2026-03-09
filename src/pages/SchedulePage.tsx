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

      {/* Week Grid - Modern card layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day, i) => {
          const daySchedules = getScheduleForDay(day);
          const dayName = format(day, "EEE", { locale: da });
          const dayNum = format(day, "d");
          const hasSchedule = daySchedules.length > 0;
          const today = isToday(day);
          const isWeekend = i >= 5;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className={cn(
                "rounded-2xl border p-3 transition-all min-h-[160px] flex flex-col",
                today
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                  : hasSchedule
                    ? "border-border bg-card hover:shadow-md hover:border-border/80"
                    : isWeekend
                      ? "border-border/40 bg-muted/30"
                      : "border-border/60 bg-card/60 hover:bg-card hover:border-border"
              )}
            >
              {/* Day Header - Compact and clean */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
                    today 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/80 text-foreground"
                  )}>
                    {dayNum}
                  </div>
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    today ? "text-primary" : "text-muted-foreground"
                  )}>
                    {dayName}
                  </span>
                </div>
                {hasSchedule && (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
                    {daySchedules.length}
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2">
                {isLoading ? (
                  <div className="h-20 rounded-xl bg-muted/50 animate-pulse" />
                ) : hasSchedule ? (
                  daySchedules.map((s: any) => (
                    <div
                      key={s.id}
                      className="rounded-xl bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15 p-2.5 group relative hover:from-primary/12 hover:to-primary/8 transition-all"
                    >
                      {/* Case info */}
                      <p className="text-xs font-semibold text-foreground pr-12 leading-tight">
                        {(s.cases as any)?.case_number ? `Sag ${(s.cases as any).case_number}` : "Ingen sag"}
                      </p>
                      
                      {/* Employee with avatar */}
                      {(s as any).profiles?.full_name && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={(s as any).profiles.avatar_url || ""} />
                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                              {(s as any).profiles.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {(s as any).profiles.full_name}
                          </span>
                        </div>
                      )}

                      {/* Time badge */}
                      {s.start_time && s.end_time && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-primary">
                          <Clock size={10} />
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </div>
                      )}

                      {/* Admin actions */}
                      {role === "admin" && (
                        <div className="absolute top-1.5 right-1.5 flex gap-0.5">
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
                                className="opacity-0 group-hover:opacity-100 rounded-md p-1 bg-background/80 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shadow-sm"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(s.id)}
                                className="opacity-0 group-hover:opacity-100 rounded-md p-1 bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shadow-sm"
                              >
                                <Trash2 size={10} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[11px] text-muted-foreground/40 italic">Ingen opgaver</p>
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
