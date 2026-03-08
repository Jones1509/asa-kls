import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getISOWeek } from "date-fns";
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
            Uge {weekNum} · {format(weekStart, "MMMM yyyy", { locale: da })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight size={16} /></Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {days.map((day, i) => {
          const daySchedules = getScheduleForDay(day);
          const dayName = format(day, "EEEE", { locale: da });
          const dateLabel = format(day, "d. MMM", { locale: da });
          const hasSchedule = daySchedules.length > 0;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl border p-4 ${hasSchedule ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{dayName}</p>
              <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
              {hasSchedule ? (
                daySchedules.map((s) => (
                  <div key={s.id} className="mt-3 space-y-2">
                    <p className="text-sm font-semibold text-card-foreground">
                      Sag {(s.cases as any)?.case_number || "–"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} /> {(s.cases as any)?.address || "–"}
                    </p>
                    {s.start_time && s.end_time && (
                      <div className="rounded-md bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground border border-border">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="mt-3"><p className="text-sm text-muted-foreground italic">Fri</p></div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
