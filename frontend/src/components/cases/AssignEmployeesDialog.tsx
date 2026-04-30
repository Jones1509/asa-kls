import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type EmployeeLite = {
  user_id: string;
  full_name: string;
  email: string;
};

export function AssignEmployeesDialog({
  open,
  onOpenChange,
  employees,
  assignedUserIds,
  selectedUserIds,
  onSelectedUserIdsChange,
  onConfirm,
  confirmLoading,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeLite[];
  assignedUserIds: string[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (next: string[]) => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");

  const assigned = useMemo(() => new Set(assignedUserIds), [assignedUserIds]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((e) => {
      const name = (e.full_name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [employees, q]);

  const toggle = (userId: string) => {
    if (assigned.has(userId)) return;
    const exists = selectedUserIds.includes(userId);
    onSelectedUserIdsChange(exists ? selectedUserIds.filter((x) => x !== userId) : [...selectedUserIds, userId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-lg">Tilknyt medarbejdere</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg medarbejder..."
            className="h-11 rounded-xl"
          />

          <ScrollArea className="h-72 rounded-xl border border-border">
            <div className="p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Ingen match</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Prøv et andet navn eller email</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((e) => {
                    const isAssigned = assigned.has(e.user_id);
                    const isSelected = selectedUserIds.includes(e.user_id);

                    return (
                      <button
                        key={e.user_id}
                        type="button"
                        onClick={() => toggle(e.user_id)}
                        disabled={isAssigned}
                        className={cn(
                          "w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          "hover:bg-muted/50",
                          isAssigned && "opacity-60 cursor-not-allowed",
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggle(e.user_id)}
                          disabled={isAssigned}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground truncate">{(e.full_name || "").trim() || "(uden navn)"}</p>
                            {isAssigned && (
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                Tilknyttet
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Valgt: <span className="font-semibold text-foreground">{selectedUserIds.length}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={confirmLoading}
              >
                Annuller
              </Button>
              <Button
                className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                disabled={disabled || selectedUserIds.length === 0 || confirmLoading}
                onClick={onConfirm}
              >
                {confirmLoading ? "Tilknytter..." : `Tilknyt (${selectedUserIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
