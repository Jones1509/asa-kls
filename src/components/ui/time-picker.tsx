import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw.length > 4) raw = raw.slice(0, 4);
    
    if (raw.length <= 2) {
      onChange(raw);
    } else {
      const h = raw.slice(0, 2);
      const m = raw.slice(2, 4);
      onChange(`${h}:${m}`);
    }
  };

  const handleBlur = () => {
    const clean = (value || "").replace(/[^0-9]/g, "");
    let h = parseInt(clean.slice(0, 2)) || 0;
    let m = parseInt(clean.slice(2, 4)) || 0;
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="flex-1">
      {label && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value || ""}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="00:00"
        className="w-full h-12 rounded-xl border border-border bg-background px-4 text-xl font-bold tabular-nums text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
      />
    </div>
  );
}
