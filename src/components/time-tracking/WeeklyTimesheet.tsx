import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  format, isSameDay, isToday
} from "date-fns";
import { da } from "date-fns/locale";
import { motion } from "framer-motion";

interface TimeEntry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  user_id: string;
  notes: string | null;
  cases?: { case_number: string } | null;
}

interface WeeklyTimesheetProps {
  entries: TimeEntry[];
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  profileMap: Record<string, string>;
  isAdmin: boolean;
}

export function WeeklyTimesheet({
  entries, currentWeekStart, onWeekChange,
  selectedDate, onSelectDate, profileMap, isAdmin
}: WeeklyTimesheetProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentWeekStart]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    entries.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [entries]);

  const weekTotal = useMemo(() => {
    return weekDays.reduce((total, day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayEntries = entriesByDate[dateStr] || [];
      return total + dayEntries.reduce((s, e) => s + Number(e.hours), 0);
    }, 0);
  }, [weekDays, entriesByDate]);

  const weekLabel = `${format(weekDays[0], "d. MMM", { locale: da })} – ${format(weekDays[6], "d. MMM yyyy", { locale: da })}`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card">
        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}>
          <ChevronLeft size={16} />
        </Button>
        <div className="text-center">
          <h3 className="font-heading font-bold text-card-foreground text-[15px]">{weekLabel}</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Total: <span className="text-primary font-bold">{Math.round(weekTotal * 10) / 10}t</span>
          </p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDate[dateStr] || [];
          const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={`
                flex flex-col min-h-[140px] p-2 transition-all text-left
                hover:bg-muted/30
                ${isWeekend ? "bg-muted/10" : ""}
                ${selected ? "ring-2 ring-inset ring-primary bg-primary/5" : ""}
              `}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isWeekend ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                  {format(day, "EEE", { locale: da })}
                </span>
                <span className={`
                  text-xs font-bold leading-none
                  ${today
                    ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                    : "text-card-foreground"
                  }
                `}>
                  {format(day, "d")}
                </span>
              </div>

              {/* Entries */}
              <div className="flex-1 space-y-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg bg-primary/8 border border-primary/15 px-1.5 py-1"
                  >
                    <p className="text-[10px] font-bold text-primary truncate">
                      {(entry.cases as any)?.case_number || "–"}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {entry.start_time?.slice(0, 5)}–{entry.end_time?.slice(0, 5)}
                    </p>
                  </motion.div>
                ))}
                {dayEntries.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayEntries.length - 3} mere</p>
                )}
              </div>

              {/* Day total */}
              {dayTotal > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-border/50">
                  <span className={`
                    text-[11px] font-bold tabular-nums
                    ${dayTotal >= 8 ? "text-primary" : dayTotal >= 4 ? "text-primary/70" : "text-muted-foreground"}
                  `}>
                    {Math.round(dayTotal * 10) / 10}t
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
