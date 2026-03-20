import { useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DatePickerField({ value, onChange, placeholder, className, required }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start font-normal rounded-xl h-10 text-sm border-border",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon size={14} className="mr-2 text-muted-foreground shrink-0" />
          {value ? format(parseISO(value), "d. MMM yyyy", { locale: da }) : (placeholder || "Vælg dato...")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          locale={da}
          className="rounded-xl"
        />
      </PopoverContent>
    </Popover>
  );
}
