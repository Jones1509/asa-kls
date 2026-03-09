import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  format, isSameMonth, isSameDay, addMonths, subMonths, isToday
} from "date-fns";
import { da } from "date-fns/locale";

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  user_id: string;
}

interface TimeCalendarProps {
  entries: TimeEntry[];
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export function TimeCalendar({ entries, currentMonth, selectedDate, onSelectDate, onMonthChange }: TimeCalendarProps) {
  const hoursByDate = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      map[e.date] = (map[e.date] || 0) + Number(e.hours);
    });
    return map;
  }, [entries]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [currentMonth]);

  const dayNames = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  const getHourColor = (hours: number) => {
    if (hours >= 8) return "bg-primary text-primary-foreground";
    if (hours >= 4) return "bg-primary/20 text-primary";
    if (hours > 0) return "bg-primary/10 text-primary";
    return "";
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft size={16} />
        </Button>
        <h3 className="font-heading font-bold text-card-foreground text-[15px] capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: da })}
        </h3>
        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((d) => (
          <div key={d} className="px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const hours = hoursByDate[dateStr] || 0;
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(day)}
                  className={`
                    relative flex flex-col items-center justify-center py-3 px-1 min-h-[56px] transition-all
                    hover:bg-muted/50
                    ${!inMonth ? "opacity-30" : ""}
                    ${selected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}
                  `}
                >
                  <span className={`
                    text-sm font-medium leading-none mb-1
                    ${today ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold" : "text-card-foreground"}
                  `}>
                    {format(day, "d")}
                  </span>
                  {hours > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${getHourColor(hours)}`}>
                      {Math.round(hours * 10) / 10}t
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
