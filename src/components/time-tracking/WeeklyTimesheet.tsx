import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfWeek, addDays, addWeeks, subWeeks,
  format, isSameDay, isToday, getISOWeek
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  user_id: string;
  notes: string | null;
  cases?: { case_number: string; customer?: string | null } | null;
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

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 48;

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

  const weekNum = getISOWeek(currentWeekStart);

  const getPosition = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const clampedSh = Math.max(sh + sm / 60, START_HOUR);
    const clampedEh = Math.min(eh + em / 60, END_HOUR);
    const top = (clampedSh - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max((clampedEh - clampedSh) * HOUR_HEIGHT, 24);
    return { top, height };
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const gridHeight = hours.length * HOUR_HEIGHT;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
          <Button variant="ghost" size="icon" className="rounded-full h-7 w-7" onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft size={14} />
          </Button>
          <span className="px-3 text-sm font-medium text-foreground whitespace-nowrap">
            Uge {weekNum} · {format(currentWeekStart, "MMM yyyy", { locale: da })}
          </span>
          <Button variant="ghost" size="icon" className="rounded-full h-7 w-7" onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-full text-xs h-7" onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            I dag
          </Button>
          <span className="text-sm font-bold text-primary tabular-nums">{Math.round(weekTotal * 10) / 10}t</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
        <div className="border-r border-border/30" />
        {weekDays.map((day) => {
          const today = isToday(day);
          const dateStr = format(day, "yyyy-MM-dd");
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dayEntries = entriesByDate[dateStr] || [];
          const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "px-1 py-2.5 text-center border-r last:border-r-0 border-border/30 transition-colors",
                today && "bg-primary/5",
                selected && "bg-primary/10"
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  today ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(day, "EEE", { locale: da }).toUpperCase()}
                </span>
                <span className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                  today ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                )}>
                  {format(day, "d")}
                </span>
                {dayTotal > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold rounded-full px-1.5 py-0.5",
                    dayTotal >= 8 ? "bg-success/15 text-success" : dayTotal >= 4 ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"
                  )}>
                    {Math.round(dayTotal * 10) / 10}t
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] overflow-y-auto" style={{ height: '400px' }}>
        {/* Time labels */}
        <div className="border-r border-border/30 relative" style={{ height: `${gridHeight}px` }}>
          {hours.map((hour) => (
            <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="relative border-b border-transparent">
              <span className="absolute top-[-1px] left-0 right-0 text-center text-[10px] font-medium text-muted-foreground tabular-nums leading-none select-none pr-1 text-right">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDate[dateStr] || [];
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          const hasLunchBreak = dayEntries.some((e) => 
            e.notes?.includes("pause fratrukket")
          );

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r last:border-r-0 border-border/30 relative",
                today && "bg-primary/[0.02]",
                selected && "bg-primary/[0.04]",
                isWeekend && !today && !selected && "bg-muted/10"
              )}
              style={{ height: `${gridHeight}px` }}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div key={hour} className="border-b border-border/10" style={{ height: `${HOUR_HEIGHT}px` }} />
              ))}

              {/* Lunch break indicator */}
              {hasLunchBreak && (() => {
                const { top, height } = getPosition("12:00", "12:30");
                return (
                  <div
                    className="absolute left-0.5 right-0.5 rounded bg-warning/15 border border-warning/20 flex items-center justify-center z-20 pointer-events-none"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <span className="text-[7px] font-bold text-warning whitespace-nowrap">🍽 Frokost</span>
                  </div>
                );
              })()}

              {/* Time entry blocks */}
              {dayEntries.map((entry) => {
                if (!entry.start_time || !entry.end_time) return null;
                const { top, height } = getPosition(entry.start_time.slice(0, 5), entry.end_time.slice(0, 5));

                return (
                  <div
                    key={entry.id}
                    className="absolute left-0.5 right-0.5 rounded-md bg-gradient-to-br from-primary/15 to-primary/8 border border-primary/20 px-1.5 py-0.5 overflow-hidden z-10"
                    style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                  >
                    <p className="text-[9px] font-bold text-foreground truncate">
                      {entry.cases?.customer ? `${entry.cases.case_number} (${entry.cases.customer})` : (entry.cases as any)?.case_number || "–"}
                    </p>
                    {height > 32 && (
                      <div className="flex items-center gap-0.5">
                        <Clock size={7} className="text-primary shrink-0" />
                        <span className="text-[8px] font-semibold text-primary tabular-nums">
                          {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                        </span>
                      </div>
                    )}
                    {height > 50 && (
                      <span className="text-[8px] font-bold text-primary/70 tabular-nums">{entry.hours}t</span>
                    )}
                  </div>
                );
              })}

              {/* Current time indicator */}
              {today && (() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                if (h < START_HOUR || h >= END_HOUR) return null;
                const top = ((h + m / 60) - START_HOUR) * HOUR_HEIGHT;
                return (
                  <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${top}px` }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-destructive -ml-0.5" />
                      <div className="flex-1 h-[1.5px] bg-destructive/70" />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
