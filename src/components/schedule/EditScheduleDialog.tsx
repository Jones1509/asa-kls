import { useState, useMemo } from "react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, Check, ChevronDown, Search, User, Briefcase } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { formatCaseLabel } from "@/lib/case-format";

interface Employee { user_id: string; full_name: string; avatar_url?: string }
interface Case { id: string; case_number: string; customer?: string; case_description?: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: any;
  employees: Employee[];
  cases: Case[];
  onSave: (entry: any) => void;
  isSaving: boolean;
}

export function EditScheduleDialog({ open, onOpenChange, entry, employees, cases, onSave, isSaving }: Props) {
  const [local, setLocal] = useState<any>(entry);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

  // Sync when entry changes
  if (entry && local?.id !== entry?.id) {
    setLocal(entry);
  }

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    return employees.filter((e) => 
      e.full_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return cases;
    const q = caseSearch.toLowerCase();
    return cases.filter((c) => 
      c.case_number.toLowerCase().includes(q) || 
      c.customer?.toLowerCase().includes(q)
    );
  }, [cases, caseSearch]);

  if (!local) return null;

  const selectedEmployee = employees.find((e) => e.user_id === local.user_id);
  const selectedCase = cases.find((c) => c.id === local.case_id);
  const selectedDate = local.date ? new Date(local.date + "T12:00:00") : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden border shadow-xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-lg font-heading font-bold text-foreground">Rediger opgave</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Employee Selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Medarbejder
            </p>
            <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 bg-background transition-all text-left"
                >
                  {selectedEmployee ? (
                    <>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={selectedEmployee.avatar_url || ""} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {selectedEmployee.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground flex-1">
                        {selectedEmployee.full_name}
                      </span>
                    </>
                  ) : (
                    <>
                      <User size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground flex-1">Vælg medarbejder</span>
                    </>
                  )}
                  <ChevronDown size={16} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Søg medarbejder..."
                      className="h-9 pl-8 rounded-lg border-0 bg-muted/50 focus-visible:ring-1"
                    />
                  </div>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filteredEmployees.map((emp) => {
                      const isSelected = local.user_id === emp.user_id;
                      return (
                        <button
                          key={emp.user_id}
                          type="button"
                          onClick={() => {
                            setLocal({ ...local, user_id: emp.user_id });
                            setEmployeeOpen(false);
                            setEmployeeSearch("");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            isSelected ? "bg-primary/10" : "hover:bg-muted/70"
                          )}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={emp.avatar_url || ""} />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {emp.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "text-sm flex-1",
                            isSelected ? "font-semibold text-primary" : "text-foreground"
                          )}>
                            {emp.full_name}
                          </span>
                          {isSelected && <Check size={16} className="text-primary" />}
                        </button>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Ingen resultater</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {/* Case Selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sag
            </p>
            <Popover open={caseOpen} onOpenChange={setCaseOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 bg-background transition-all text-left"
                >
                  {selectedCase ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1 truncate">
                        {selectedCase.case_number}{selectedCase.customer ? ` – ${selectedCase.customer}` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <Briefcase size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground flex-1">Ingen sag valgt</span>
                    </>
                  )}
                  <ChevronDown size={16} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      placeholder="Søg sag eller kunde..."
                      className="h-9 pl-8 rounded-lg border-0 bg-muted/50 focus-visible:ring-1"
                    />
                  </div>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {/* No case option */}
                    <button
                      type="button"
                      onClick={() => {
                        setLocal({ ...local, case_id: "" });
                        setCaseOpen(false);
                        setCaseSearch("");
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                        !local.case_id ? "bg-primary/10" : "hover:bg-muted/70"
                      )}
                    >
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      <span className={cn(
                        "text-sm flex-1",
                        !local.case_id ? "font-semibold text-primary" : "text-muted-foreground"
                      )}>
                        Ingen sag
                      </span>
                      {!local.case_id && <Check size={16} className="text-primary" />}
                    </button>
                    {filteredCases.map((c) => {
                      const isSelected = local.case_id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setLocal({ ...local, case_id: c.id });
                            setCaseOpen(false);
                            setCaseSearch("");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            isSelected ? "bg-primary/10" : "hover:bg-muted/70"
                          )}
                        >
                          <div className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0",
                            isSelected ? "bg-primary" : "bg-muted-foreground/30"
                          )} />
                          <span className={cn(
                            "text-sm flex-1 truncate",
                            isSelected ? "font-semibold text-primary" : "text-foreground"
                          )}>
                            {c.case_number}{c.customer ? ` – ${c.customer}` : ""}
                          </span>
                          {isSelected && <Check size={16} className="text-primary" />}
                        </button>
                      );
                    })}
                    {filteredCases.length === 0 && caseSearch && (
                      <p className="text-sm text-muted-foreground text-center py-4">Ingen resultater</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Dato
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 bg-background transition-all text-left"
                >
                  <span className="text-sm font-medium text-foreground">
                    {selectedDate
                      ? format(selectedDate, "EEEE d. MMM yyyy", { locale: da })
                      : "Vælg dato"}
                  </span>
                  <CalendarIcon size={16} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 rounded-xl" align="start">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setLocal({ ...local, date: format(d, "yyyy-MM-dd") });
                  }}
                  locale={da}
                  weekStartsOn={1}
                  classNames={{
                    caption: "flex items-center justify-between mb-3",
                    caption_label: "text-sm font-semibold",
                    nav_button: "h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center",
                    head_cell: "w-8 text-xs font-medium text-muted-foreground",
                    cell: "p-0",
                    day: "h-8 w-8 rounded-lg text-sm hover:bg-primary/10 transition-colors",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                    day_today: "font-bold text-primary",
                    day_outside: "text-muted-foreground/40",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Times - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <TimePicker
              label="Start"
              value={local.start_time}
              onChange={(v) => setLocal({ ...local, start_time: v })}
            />
            <TimePicker
              label="Slut"
              value={local.end_time}
              onChange={(v) => setLocal({ ...local, end_time: v })}
            />
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Note
            </p>
            <Input
              value={local.notes || ""}
              onChange={(e) => setLocal({ ...local, notes: e.target.value })}
              placeholder="Valgfrit..."
              className="rounded-xl h-10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuller
          </Button>
          <Button
            onClick={() => onSave(local)}
            disabled={isSaving}
            className="rounded-xl shadow-sm"
          >
            {isSaving ? "Gemmer..." : "Gem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
