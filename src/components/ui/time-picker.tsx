import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [h, m] = (value || "08:00").split(":");
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  const ITEM_H = 44;

  const scrollTo = (ref: React.RefObject<HTMLDivElement>, idx: number) => {
    if (ref.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const hIdx = HOURS.indexOf(h.padStart(2, "0"));
    if (hIdx >= 0) scrollTo(hourRef, hIdx);
  }, [h]);

  useEffect(() => {
    // Find closest minute bucket
    const mInt = parseInt(m || "0");
    const buckets = [0, 15, 30, 45];
    const closest = buckets.reduce((prev, cur) =>
      Math.abs(cur - mInt) < Math.abs(prev - mInt) ? cur : prev
    );
    const mIdx = MINUTES.indexOf(String(closest).padStart(2, "0"));
    if (mIdx >= 0) scrollTo(minRef, mIdx);
  }, [m]);

  const setHour = (hour: string) => onChange(`${hour}:${m.padStart(2, "0")}`);
  const setMin = (min: string) => onChange(`${h.padStart(2, "0")}:${min}`);

  return (
    <div>
      {label && (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <div className="flex bg-muted/40 border border-border rounded-2xl overflow-hidden">
        {/* Hours */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center py-2 border-b border-border">
            Time
          </p>
          <div
            ref={hourRef}
            className="h-[176px] overflow-y-auto scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="py-1">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => { setHour(hour); scrollTo(hourRef, HOURS.indexOf(hour)); }}
                  className={cn(
                    "w-full h-11 text-sm font-semibold transition-all",
                    h.padStart(2, "0") === hour
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-px bg-border" />

        {/* Minutes */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center py-2 border-b border-border">
            Min
          </p>
          <div
            ref={minRef}
            className="h-[176px] overflow-y-auto scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="py-1">
              {MINUTES.map((min) => {
                const mInt = parseInt(m || "0");
                const buckets = [0, 15, 30, 45];
                const closest = String(buckets.reduce((prev, cur) =>
                  Math.abs(cur - mInt) < Math.abs(prev - mInt) ? cur : prev
                )).padStart(2, "0");
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => { setMin(min); scrollTo(minRef, MINUTES.indexOf(min)); }}
                    className={cn(
                      "w-full h-11 text-sm font-semibold transition-all",
                      closest === min
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {min}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="text-xl font-bold text-foreground tabular-nums">
          {h.padStart(2, "0")}:{m.padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
