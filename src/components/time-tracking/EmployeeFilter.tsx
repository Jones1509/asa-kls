import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface Employee {
  user_id: string;
  full_name: string;
}

interface EmployeeFilterProps {
  employees: Employee[];
  selected: string; // "all" or user_id
  onSelect: (value: string) => void;
}

export function EmployeeFilter({ employees, selected, onSelect }: EmployeeFilterProps) {
  const sorted = [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name, "da"));

  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-[260px] h-11 rounded-xl">
        <SelectValue placeholder="Vælg medarbejder" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            Alle medarbejdere
          </span>
        </SelectItem>
        {sorted.map((e) => (
          <SelectItem key={e.user_id} value={e.user_id}>
            <span className="flex items-center gap-2">
              <Avatar className="h-5 w-5 text-[9px]">
                <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                  {e.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {e.full_name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
