import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X, Clock, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
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
  cases?: { case_number: string; customer?: string | null } | null;
}

interface TimeEntriesTableProps {
  entries: Entry[];
  profileMap: Record<string, string>;
  isAdmin: boolean;
  currentUserId?: string;
  selectedDate: Date | null;
  onClearDate?: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { start_time: string; end_time: string; notes: string | null; lunch_break: boolean }) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function TimeEntriesTable({
  entries, profileMap, isAdmin, currentUserId, selectedDate, onClearDate,
  onDelete, onUpdate, isDeleting, isUpdating
}: TimeEntriesTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ start_time: "", end_time: "", notes: "", lunch_break: true });

  const filtered = useMemo(() => {
    const list = selectedDate
      ? entries.filter((e) => e.date === format(selectedDate, "yyyy-MM-dd"))
      : entries;
    return [...list].sort((a, b) => {
      const nameA = profileMap[a.user_id] || "";
      const nameB = profileMap[b.user_id] || "";
      return nameA.localeCompare(nameB, "da") || a.date.localeCompare(b.date);
    });
  }, [entries, selectedDate, profileMap]);

  const startEdit = (entry: Entry) => {
    setEditId(entry.id);
    const hasBreakNote = entry.notes?.includes("pause fratrukket") || false;
    setEditData({
      start_time: entry.start_time?.slice(0, 5) || "",
      end_time: entry.end_time?.slice(0, 5) || "",
      notes: (entry.notes || "").replace(/\s*\|?\s*30 min pause fratrukket/g, "").trim(),
      lunch_break: hasBreakNote,
    });
  };

  const saveEdit = () => {
    if (!editId) return;
    onUpdate(editId, { start_time: editData.start_time, end_time: editData.end_time, notes: editData.notes || null, lunch_break: editData.lunch_break });
    setEditId(null);
  };

  const title = selectedDate
    ? format(selectedDate, "EEEE d. MMMM yyyy", { locale: da })
    : "Alle registreringer";

  const totalHours = filtered.reduce((s, e) => s + Number(e.hours), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Clock size={15} className="text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-card-foreground text-[15px] capitalize">{title}</h3>
            {selectedDate && filtered.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} registrering{filtered.length !== 1 ? "er" : ""} · <span className="font-bold text-primary">{Math.round(totalHours * 10) / 10}t</span>
              </p>
            )}
          </div>
        </div>
        {selectedDate && onClearDate && (
          <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7" onClick={onClearDate}>
            Vis alle
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {!selectedDate && <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dato</th>}
              {isAdmin && <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Medarbejder</th>}
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sag</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tid</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timer</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Frokost</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Note</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
              {filtered.map((e) => (
                <motion.tr
                  key={e.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-muted/20 transition-colors group"
                >
                  {!selectedDate && (
                    <td className="px-4 py-3 text-card-foreground text-xs tabular-nums">
                      {format(new Date(e.date + "T00:00"), "d. MMM", { locale: da })}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-4 py-3 font-medium text-card-foreground">
                      {profileMap[e.user_id] || "–"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold text-card-foreground">
                        {e.cases?.customer ? `${e.cases.case_number} (${e.cases.customer})` : (e.cases as any)?.case_number || "–"}
                      </span>
                  </td>

                  {editId === e.id ? (
                    <>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Input value={editData.start_time} onChange={(ev) => setEditData({ ...editData, start_time: ev.target.value })} className="h-7 w-16 rounded-lg text-xs tabular-nums px-2" placeholder="08:00" />
                          <span className="text-muted-foreground text-xs">–</span>
                          <Input value={editData.end_time} onChange={(ev) => setEditData({ ...editData, end_time: ev.target.value })} className="h-7 w-16 rounded-lg text-xs tabular-nums px-2" placeholder="16:00" />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-[10px] text-muted-foreground italic">auto</span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setEditData({ ...editData, lunch_break: !editData.lunch_break })}
                          className={cn(
                            "h-7 rounded-lg border flex items-center justify-center gap-1 text-[10px] font-medium transition-all px-2",
                            editData.lunch_break
                              ? "bg-warning/10 border-warning/30 text-warning"
                              : "bg-muted/30 border-border text-muted-foreground"
                          )}
                        >
                          <Coffee size={10} />
                          {editData.lunch_break ? "30 min" : "Ingen"}
                        </button>
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <Input value={editData.notes} onChange={(ev) => setEditData({ ...editData, notes: ev.target.value })} className="h-7 rounded-lg text-xs px-2" placeholder="Note..." />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-primary hover:text-primary" onClick={saveEdit} disabled={isUpdating}>
                            <Check size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setEditId(null)}>
                            <X size={13} />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">
                        {e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-card-foreground tabular-nums text-xs">{e.hours}t</span>
                      </td>
                      <td className="px-4 py-3">
                        {e.notes?.includes("pause fratrukket") ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 border border-warning/25 px-2 py-0.5 text-[11px] font-medium text-warning">
                            <Coffee size={10} /> 30 min
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Ingen</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[180px] truncate">
                        {e.notes?.replace(/\s*\|?\s*30 min pause fratrukket/g, "").trim() || "–"}
                      </td>
                      {(isAdmin || e.user_id === currentUserId) ? (
                        <td className="px-4 py-3">
                          {deleteConfirm === e.id ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="destructive" className="rounded-lg h-6 text-[10px] px-2" onClick={() => { onDelete(e.id); setDeleteConfirm(null); }} disabled={isDeleting}>Slet</Button>
                              <Button size="sm" variant="ghost" className="rounded-lg h-6 text-[10px] px-2" onClick={() => setDeleteConfirm(null)}>Nej</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(e)} className="rounded-lg p-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"><Pencil size={12} /></button>
                              <button onClick={() => setDeleteConfirm(e.id)} className="rounded-lg p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 size={12} /></button>
                            </div>
                          )}
                        </td>
                      ) : (
                        <td className="px-4 py-3" />
                      )}
                    </>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {selectedDate ? "Ingen registreringer denne dag" : "Ingen registreringer endnu"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
