import { PageHeader } from "@/components/PageHeader";
import { Clock, Calendar, TrendingUp, CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { normalizeCaseOptions } from "@/lib/case-options";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import { da } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

import { EmployeeFilter } from "@/components/time-tracking/EmployeeFilter";
import { WeeklyTimesheet } from "@/components/time-tracking/WeeklyTimesheet";
import { TimeEntriesTable } from "@/components/time-tracking/TimeEntriesTable";
import { QuickEntryForm } from "@/components/time-tracking/QuickEntryForm";
import { BulkTimeEntryDialog } from "@/components/time-tracking/BulkTimeEntryDialog";
import { TimeTrackingPdfExport } from "@/components/time-tracking/TimeTrackingPdfExport";

export default function TimeTrackingPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const [form, setForm] = useState({
    case_id: "", user_id: "", date: new Date().toISOString().split("T")[0],
    start_time: "08:00", end_time: "16:00", notes: "", lunch_break: true
  });

  const { data: cases } = useQuery({
    queryKey: ["cases_active_time"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          customer,
          customer_id,
          case_description,
          customers (
            customer_number
          )
        `)
        .eq("status", "Aktiv")
        .order("case_number");
      return normalizeCaseOptions(data as any[]);
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees_time"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["time_entries", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("time_entries").select("*, cases(case_number, customer, case_description)").order("date", { ascending: false }).limit(500);
      if (!isAdmin) query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profileMap } = useQuery({
    queryKey: ["profiles_map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: isAdmin,
  });

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    let result = entries;
    if (isAdmin && selectedEmployee !== "all") {
      result = result.filter((e) => e.user_id === selectedEmployee);
    }
    return result;
  }, [entries, selectedEmployee, isAdmin]);

  const weekStats = useMemo(() => {
    if (!filteredEntries.length) return { thisWeek: 0, lastWeek: 0, today: 0 };
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const dayOfWeek = now.getDay() || 7;
    const ws = new Date(now);
    ws.setDate(now.getDate() - dayOfWeek + 1);
    const lws = new Date(ws);
    lws.setDate(lws.getDate() - 7);
    const wsStr = format(ws, "yyyy-MM-dd");
    const lwsStr = format(lws, "yyyy-MM-dd");
    const thisWeek = filteredEntries.filter(e => e.date >= wsStr).reduce((s, e) => s + Number(e.hours), 0);
    const lastWeek = filteredEntries.filter(e => e.date >= lwsStr && e.date < wsStr).reduce((s, e) => s + Number(e.hours), 0);
    const todayH = filteredEntries.filter(e => e.date === today).reduce((s, e) => s + Number(e.hours), 0);
    return { thisWeek: Math.round(thisWeek * 10) / 10, lastWeek: Math.round(lastWeek * 10) / 10, today: Math.round(todayH * 10) / 10 };
  }, [filteredEntries]);

  const calcHours = (startTime: string, endTime: string, lunchBreak: boolean) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const rawHours = (eh + em / 60) - (sh + sm / 60);
    if (rawHours <= 0) throw new Error("Sluttid skal være efter starttid");
    const breakDeducted = lunchBreak && rawHours >= 7 ? 0.5 : 0;
    const netHours = rawHours - breakDeducted;
    return { rawHours: Math.round(rawHours * 100) / 100, netHours: Math.round(netHours * 100) / 100, breakDeducted };
  };

  const createEntry = useMutation({
    mutationFn: async () => {
      const { netHours, breakDeducted } = calcHours(form.start_time, form.end_time, form.lunch_break);
      const targetUserId = isAdmin && form.user_id ? form.user_id : user!.id;
      const noteWithBreak = breakDeducted > 0
        ? `${form.notes || ""}${form.notes ? " | " : ""}30 min pause fratrukket`.trim()
        : form.notes || null;
      const { error } = await supabase.from("time_entries").insert({
        user_id: targetUserId, case_id: form.case_id, date: form.date,
        start_time: form.start_time, end_time: form.end_time,
        hours: netHours, notes: noteWithBreak,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      const msg = form.lunch_break ? "Timer registreret (30 min pause fratrukket)" : "Timer registreret (uden pause)";
      toast.success(msg);
      setForm({ ...form, notes: "", user_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkCreateEntries = useMutation({
    mutationFn: async (entries: { user_id: string; case_id: string; date: string; start_time: string; end_time: string; lunch_break: boolean; notes: string }[]) => {
      const rows = entries.map(e => {
        const { netHours, breakDeducted } = calcHours(e.start_time, e.end_time, e.lunch_break);
        const noteWithBreak = breakDeducted > 0
          ? `${e.notes || ""}${e.notes ? " | " : ""}30 min pause fratrukket`.trim()
          : e.notes || null;
        return {
          user_id: e.user_id, case_id: e.case_id, date: e.date,
          start_time: e.start_time, end_time: e.end_time,
          hours: netHours, notes: noteWithBreak,
        };
      });
      const { error } = await supabase.from("time_entries").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success(`${vars.length} registreringer oprettet`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Registrering slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { start_time: string; end_time: string; notes: string | null; lunch_break: boolean } }) => {
      const { netHours, breakDeducted } = calcHours(data.start_time, data.end_time, data.lunch_break);
      // Clean old break note and re-add if applicable
      let cleanNotes = (data.notes || "").replace(/\s*\|?\s*30 min pause fratrukket/g, "").trim();
      if (breakDeducted > 0) {
        cleanNotes = cleanNotes ? `${cleanNotes} | 30 min pause fratrukket` : "30 min pause fratrukket";
      }
      const { data: updatedRows, error } = await supabase
        .from("time_entries")
        .update({
          start_time: data.start_time,
          end_time: data.end_time,
          hours: netHours,
          notes: cleanNotes || null,
        })
        .eq("id", id)
        .select("id");

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Kunne ikke opdatere registreringen. Tjek adgangsrettigheder.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Registrering opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFilterDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
      setFilterDateOpen(false);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader title="Timeregistrering" description="Registrer og se arbejdstimer" />
        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF export */}
          {isAdmin && (
            <TimeTrackingPdfExport
              entries={filteredEntries}
              cases={(cases || []).map((c) => ({ id: c.id, case_number: c.case_number || "", customer: c.customer }))}
              profileMap={profileMap || {}}
              isAdmin={isAdmin}
            />
          )}
          {isAdmin && employees && (
            <BulkTimeEntryDialog
              employees={employees}
              cases={(cases as any) || []}
              onSubmit={(entries) => bulkCreateEntries.mutate(entries)}
              isPending={bulkCreateEntries.isPending}
            />
          )}
          {/* Admin date picker filter */}
          {isAdmin && (
            <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 border-border font-normal text-sm gap-2"
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {selectedDate
                    ? format(selectedDate, "d. MMM yyyy", { locale: da })
                    : "Vælg dato"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={handleFilterDateSelect}
                  locale={da}
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>
          )}
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="rounded-xl text-xs text-muted-foreground">
              Ryd filter
            </Button>
          )}
          {isAdmin && employees && (
            <EmployeeFilter
              employees={employees}
              selected={selectedEmployee}
              onSelect={(v) => { setSelectedEmployee(v); setSelectedDate(null); }}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "I dag", value: `${weekStats.today}t`, icon: Clock, color: "bg-primary/10 text-primary" },
          { label: "Denne uge", value: `${weekStats.thisWeek}t`, icon: Calendar, color: "bg-success/10 text-success" },
          { label: "Sidste uge", value: `${weekStats.lastWeek}t`, icon: TrendingUp, color: "bg-muted text-muted-foreground" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon size={17} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-card-foreground">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Entry */}
      <div className="mb-6">
        <QuickEntryForm
          form={form} setForm={setForm} isAdmin={isAdmin}
          employees={employees || []} cases={(cases as any) || []}
          onSubmit={() => createEntry.mutate()} isPending={createEntry.isPending}
        />
      </div>

      {/* Weekly Timesheet */}
      <div className="mb-6">
        <WeeklyTimesheet
          entries={filteredEntries}
          currentWeekStart={currentWeekStart}
          onWeekChange={setCurrentWeekStart}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          profileMap={profileMap || {}}
          isAdmin={isAdmin}
        />
      </div>

      {/* Detail table */}
      <TimeEntriesTable
        entries={filteredEntries}
        profileMap={profileMap || {}}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        selectedDate={selectedDate}
        onClearDate={clearDateFilter}
        onDelete={(id) => deleteEntry.mutate(id)}
        onUpdate={(id, data) => updateEntry.mutate({ id, data })}
        isDeleting={deleteEntry.isPending}
        isUpdating={updateEntry.isPending}
      />
    </div>
  );
}