import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getISOWeek, isToday } from "date-fns";
import { da } from "date-fns/locale";

export default function SchedulePage() {
  const { user, role } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekNum = getISOWeek(weekStart);

  const { data: schedules } = useQuery({
    queryKey: ["schedules", weekStart.toISOString(), user?.id],
    queryFn: async () => {
      const startDate = format(days[0], "yyyy-MM-dd");
      const endDate = format(days[4], "yyyy-MM-dd");
      let query = supabase.from("schedules").select("*, cases(case_number, address)").gte("date", startDate).lte("date", endDate);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const getScheduleForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules?.filter((s) => s.date === dateStr) || [];
  };

  return (
    <div>
      <PageHeader title="Kalender" description="Ugeplan og arbejdsplanlægning">
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-semibold text-foreground min-w-[180px] text-center px-2">
            Uge {weekNum} · {format(weekStart, "MMMM yyyy", { locale: da })}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight size={16} /></Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {days.map((day, i) => {
          const daySchedules = getScheduleForDay(day);
          const dayName = format(day, "EEEE", { locale: da });
          const dateLabel = format(day, "d. MMM", { locale: da });
          const hasSchedule = daySchedules.length > 0;
          const today = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
              className={`rounded-2xl border p-4 transition-all ${
                today ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10" :
                hasSchedule ? "border-border bg-card shadow-card" : "border-border/50 bg-card/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider capitalize">{dayName}</p>
                  <p className={`text-xs mt-0.5 ${today ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>{dateLabel}</p>
                </div>
                {today && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
              {hasSchedule ? (
                daySchedules.map((s) => (
                  <div key={s.id} className="mt-2 rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-2">
                    <p className="text-sm font-semibold text-card-foreground">
                      Sag {(s.cases as any)?.case_number || "–"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin size={12} className="text-muted-foreground/50" /> {(s.cases as any)?.address || "–"}
                    </p>
                    {s.start_time && s.end_time && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-card-foreground border border-border">
                        <Clock size={11} className="text-primary" />
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
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
    </div>
  );
}
