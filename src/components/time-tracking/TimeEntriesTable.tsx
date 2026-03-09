import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Entry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  notes: string | null;
  user_id: string;
  cases?: { case_number: string } | null;
}

interface TimeEntriesTableProps {
  entries: Entry[];
  profileMap: Record<string, string>;
  isAdmin: boolean;
  selectedDate: Date | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { start_time: string; end_time: string; notes: string | null }) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function TimeEntriesTable({
  entries, profileMap, isAdmin, selectedDate,
  onDelete, onUpdate, isDeleting, isUpdating
}: TimeEntriesTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ start_time: "", end_time: "", notes: "" });

  const filtered = selectedDate
    ? entries.filter((e) => e.date === format(selectedDate, "yyyy-MM-dd"))
    : entries;

  const startEdit = (entry: Entry) => {
    setEditId(entry.id);
    setEditData({
      start_time: entry.start_time?.slice(0, 5) || "",
      end_time: entry.end_time?.slice(0, 5) || "",
      notes: entry.notes || "",
    });
  };

  const saveEdit = () => {
    if (!editId) return;
    onUpdate(editId, { start_time: editData.start_time, end_time: editData.end_time, notes: editData.notes || null });
    setEditId(null);
  };

  const title = selectedDate
    ? format(selectedDate, "EEEE d. MMMM yyyy", { locale: da })
    : "Alle registreringer";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
            <Clock size={15} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-bold text-card-foreground text-[15px] capitalize">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} poster</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dato</th>
              {isAdmin && <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Medarbejder</th>}
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sag</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Slut</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timer</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Note</th>
              {isAdmin && <th className="px-5 py-3 w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence>
              {filtered.map((e) => (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-muted/20 transition-colors group"
                >
                  <td className="px-5 py-3.5 text-card-foreground">{e.date}</td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-card-foreground font-medium">
                      {profileMap[e.user_id] || "–"}
                    </td>
                  )}
                  <td className="px-5 py-3.5 font-semibold text-card-foreground">
                    {(e.cases as any)?.case_number || "–"}
                  </td>

                  {editId === e.id ? (
                    <>
                      <td className="px-5 py-2">
                        <Input
                          value={editData.start_time}
                          onChange={(ev) => setEditData({ ...editData, start_time: ev.target.value })}
                          className="h-8 w-20 rounded-lg text-xs"
                          placeholder="08:00"
                        />
                      </td>
                      <td className="px-5 py-2">
                        <Input
                          value={editData.end_time}
                          onChange={(ev) => setEditData({ ...editData, end_time: ev.target.value })}
                          className="h-8 w-20 rounded-lg text-xs"
                          placeholder="16:00"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-muted-foreground text-xs">auto</span>
                      </td>
                      <td className="px-5 py-2 hidden md:table-cell">
                        <Input
                          value={editData.notes}
                          onChange={(ev) => setEditData({ ...editData, notes: ev.target.value })}
                          className="h-8 rounded-lg text-xs"
                          placeholder="Note..."
                        />
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-primary" onClick={saveEdit} disabled={isUpdating}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setEditId(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3.5 text-muted-foreground">{e.start_time?.slice(0, 5)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{e.end_time?.slice(0, 5)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {e.hours}t
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {e.notes || "–"}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          {deleteConfirm === e.id ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="destructive" className="rounded-lg h-7 text-[11px] px-2" onClick={() => { onDelete(e.id); setDeleteConfirm(null); }} disabled={isDeleting}>
                                Slet
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-lg h-7 text-[11px] px-2" onClick={() => setDeleteConfirm(null)}>
                                Nej
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(e)} className="rounded-lg p-1.5 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteConfirm(e.id)} className="rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {selectedDate ? "Ingen registreringer på denne dato" : "Ingen registreringer endnu"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
