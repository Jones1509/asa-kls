import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search, Users } from "lucide-react";
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
}

export function EmployeeFilter({ employees, selected, onSelect }: EmployeeFilterProps) {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[240px] justify-between rounded-xl h-10 border-border font-normal text-sm"
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
      <PopoverContent className="w-[240px] p-0 rounded-xl" align="end">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg medarbejder..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[260px]">
          <div className="p-1">
            <button
              onClick={() => { onSelect("all"); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/60",
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
                  "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/60",
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
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Ingen fundet</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
