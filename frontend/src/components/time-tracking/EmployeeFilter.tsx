import { useState, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Employee {
  user_id: string;
  full_name: string;
}

interface EmployeeFilterProps {
  employees: Employee[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

export function EmployeeFilter({ employees, selected, onSelect, className }: EmployeeFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(() =>
    [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name, "da")),
    [employees]
  );

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(e => e.full_name.toLowerCase().includes(q));
  }, [sorted, search]);

  const selectedName = selected === "all"
    ? "Alle medarbejdere"
    : employees.find(e => e.user_id === selected)?.full_name || "Vælg...";

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between rounded-xl border-border bg-background px-3 font-normal text-sm shadow-sm hover:bg-muted/40 sm:w-[240px]",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected === "all" ? (
              <Users size={14} className="text-muted-foreground shrink-0" />
            ) : (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                  {selectedName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            {selectedName}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground/50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(260px,calc(100vw-2rem))] p-0" align="end">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-3">
          <Search size={14} className="text-muted-foreground/70 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg medarbejder..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/50 transition-colors hover:text-muted-foreground">
              <X size={12} />
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[260px]">
          <div className="p-1.5">
            <button
              onClick={() => { onSelect("all"); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                selected === "all" && "bg-primary/5 text-primary"
              )}
            >
              <Users size={14} className="shrink-0" />
              <span className="font-medium">Alle medarbejdere</span>
              {selected === "all" && <Check size={14} className="ml-auto shrink-0" />}
            </button>
            {filtered.map((e) => (
              <button
                key={e.user_id}
                onClick={() => { onSelect(e.user_id); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                  selected === e.user_id && "bg-primary/5 text-primary"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                    {e.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{e.full_name}</span>
                {selected === e.user_id && <Check size={14} className="ml-auto shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground/70 text-center">Ingen fundet</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}