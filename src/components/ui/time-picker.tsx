import { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [h, m] = (value || "08:00").split(":");
  const hour = parseInt(h) || 0;
  const min = parseInt(m) || 0;

  const incrementHour = () => onChange(`${String((hour + 1) % 24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  const decrementHour = () => onChange(`${String((hour - 1 + 24) % 24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  const incrementMin = () => onChange(`${String(hour).padStart(2, "0")}:${String((min + 15) % 60).padStart(2, "0")}`);
  const decrementMin = () => onChange(`${String(hour).padStart(2, "0")}:${String((min - 15 + 60) % 60).padStart(2, "0")}`);

  return (
    <div>
      {label && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-xl p-2">
        {/* Hour */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementHour}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronUp size={16} />
          </button>
          <span className="text-2xl font-bold tabular-nums text-foreground w-10 text-center">
            {String(hour).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={decrementHour}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <span className="text-2xl font-bold text-muted-foreground">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementMin}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronUp size={16} />
          </button>
          <span className="text-2xl font-bold tabular-nums text-foreground w-10 text-center">
            {String(min).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={decrementMin}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
