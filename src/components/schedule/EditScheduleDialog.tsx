import { useState } from "react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

interface Employee { user_id: string; full_name: string; avatar_url?: string }
interface Case { id: string; case_number: string; customer?: string }

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

  // Sync when entry changes (dialog opened)
  if (entry && local?.id !== entry?.id) {
    setLocal(entry);
  }

  if (!local) return null;

  const selectedEmployee = employees.find((e) => e.user_id === local.user_id);
  const selectedDate = local.date ? new Date(local.date + "T12:00:00") : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 rounded-3xl overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-6 pb-5 border-b border-border">
          <h2 className="text-xl font-heading font-bold text-foreground">Rediger opgave</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tilpas medarbejderens plan</p>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Employee */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Medarbejder</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {employees.map((emp) => {
                const isSel = local.user_id === emp.user_id;
                return (
                  <button
                    key={emp.user_id}
                    type="button"
                    onClick={() => setLocal({ ...local, user_id: emp.user_id })}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left",
                      isSel
                        ? "border-primary bg-primary/8 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={emp.avatar_url || ""} />
                      <AvatarFallback className={cn(
                        "text-xs font-bold",
                        isSel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {emp.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "text-sm font-medium",
                      isSel ? "text-primary" : "text-foreground"
                    )}>
                      {emp.full_name}
                    </span>
                    {isSel && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Case */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Sag</p>
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setLocal({ ...local, case_id: "" })}
                className={cn(
                  "flex items-center px-3 py-2 rounded-xl border-2 transition-all text-left text-sm",
                  !local.case_id
                    ? "border-primary bg-primary/8 text-primary font-medium"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                Ingen sag
              </button>
              {cases.map((c) => {
                const isSel = local.case_id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setLocal({ ...local, case_id: c.id })}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-left",
                      isSel
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full flex-shrink-0",
                      isSel ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                    <span className={cn(
                      "text-sm",
                      isSel ? "font-semibold text-primary" : "text-foreground"
                    )}>
                      {c.case_number}{c.customer ? ` – ${c.customer}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Dato</p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border hover:border-primary/40 bg-background transition-all text-left"
                >
                  <span className="text-sm font-medium text-foreground">
                    {selectedDate
                      ? format(selectedDate, "EEEE d. MMMM yyyy", { locale: da })
                      : "Vælg dato"}
                  </span>
                  <CalendarIcon size={16} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border shadow-xl" align="start">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setLocal({ ...local, date: format(d, "yyyy-MM-dd") });
                  }}
                  locale={da}
                  weekStartsOn={1}
                  classNames={{
                    root: "p-4",
                    caption: "flex items-center justify-between mb-4",
                    caption_label: "text-sm font-bold text-foreground",
                    nav: "flex items-center gap-1",
                    nav_button: "h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors",
                    nav_button_previous: "",
                    nav_button_next: "",
                    table: "w-full border-collapse",
                    head_row: "flex mb-1",
                    head_cell: "w-9 text-[11px] font-bold text-muted-foreground uppercase text-center",
                    row: "flex w-full",
                    cell: "p-0",
                    day: "h-9 w-9 rounded-xl text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "text-primary font-bold",
                    day_outside: "text-muted-foreground/40",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <TimePicker
              label="Starttid"
              value={local.start_time}
              onChange={(v) => setLocal({ ...local, start_time: v })}
            />
            <TimePicker
              label="Sluttid"
              value={local.end_time}
              onChange={(v) => setLocal({ ...local, end_time: v })}
            />
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Note</p>
            <Input
              value={local.notes || ""}
              onChange={(e) => setLocal({ ...local, notes: e.target.value })}
              placeholder="Valgfrit…"
              className="rounded-xl h-11 border-2 focus-visible:border-primary focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-5"
          >
            Annuller
          </Button>
          <Button
            onClick={() => onSave(local)}
            disabled={isSaving}
            className="rounded-xl px-6 shadow-md"
          >
            {isSaving ? "Gemmer…" : "Gem ændringer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
