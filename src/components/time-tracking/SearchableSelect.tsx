import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function SearchableSelect({
  options, value, onSelect, placeholder = "Vælg...",
  searchPlaceholder = "Søg...", emptyText = "Ingen resultater", className
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal rounded-xl h-10 border-border bg-background hover:bg-muted/50 text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown size={14} className="ml-2 shrink-0 text-muted-foreground/50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-lg border border-border/80" align="start">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/60 rounded-t-xl">
          <Search size={14} className="text-muted-foreground/70 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[220px]">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground/70 text-center">{emptyText}</p>
          ) : (
            <div className="p-1.5">
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSelect(opt.value); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
                    "hover:bg-muted/50",
                    value === opt.value && "bg-primary/5 text-primary"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{opt.label}</p>
                    {opt.sublabel && (
                      <p className="text-[11px] text-muted-foreground truncate">{opt.sublabel}</p>
                    )}
                  </div>
                  {value === opt.value && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}