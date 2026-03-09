import { PageHeader } from "@/components/PageHeader";
import { AssignEmployeesDialog } from "@/components/cases/AssignEmployeesDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Edit, MapPin, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Aktiv: "bg-success/10 text-success border border-success/20",
  Afsluttet: "bg-muted text-muted-foreground border border-border",
  Planlagt: "bg-warning/10 text-warning border border-warning/20",
};

const statusOptions = ["Aktiv", "Planlagt", "Afsluttet"];

// NOTE: This component must live at module-scope so React doesn't treat it as a new
// component type on every keystroke (which can cause a full re-mount + focus loss).
function CaseFormFields({
  f,
  setF,
}: {
  f: any;
  setF: (v: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sagsnummer</Label>
          <Input
            value={f.case_number}
            onChange={(e) => setF({ ...f, case_number: e.target.value })}
            placeholder="2026-025"
            className="mt-1.5 rounded-xl"
            required
          />
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
          <select
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
            className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kunde</Label>
        <Input
          value={f.customer}
          onChange={(e) => setF({ ...f, customer: e.target.value })}
          placeholder="Dansk Bygge A/S"
          className="mt-1.5 rounded-xl"
          required
        />
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Adresse</Label>
        <Input
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
          placeholder="Aarhusvej 12, 8000 Aarhus"
          className="mt-1.5 rounded-xl"
          required
        />
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label>
        <Textarea
          value={f.description || ""}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          className="mt-1.5 rounded-xl"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Startdato</Label>
          <Input
            type="date"
            value={f.start_date || ""}
            onChange={(e) => setF({ ...f, start_date: e.target.value })}
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Slutdato</Label>
          <Input
            type="date"
            value={f.end_date || ""}
            onChange={(e) => setF({ ...f, end_date: e.target.value })}
            className="mt-1.5 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("alle");

  const emptyForm = {
    case_number: "",
    customer: "",
    address: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Aktiv",
  };

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<any>(null);

  const [assignCaseId, setAssignCaseId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["case_assignments_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("case_assignments").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: role === "admin",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: role === "admin",
  });

  const getCaseAssignments = (caseId: string) => assignments?.filter((a: any) => a.case_id === caseId) || [];

  const employeeByUserId = useMemo(() => {
    const m = new Map<string, any>();
    (employees || []).forEach((e: any) => m.set(e.user_id, e));
    return m;
  }, [employees]);

  const createCase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cases").insert({
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setOpen(false);
      setForm(emptyForm);
      toast.success("Sag oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCase = useMutation({
    mutationFn: async () => {
      if (!editForm) return;
      const { error } = await supabase
        .from("cases")
        .update({
          case_number: editForm.case_number,
          customer: editForm.customer,
          address: editForm.address,
          description: editForm.description,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          status: editForm.status,
        })
        .eq("id", editForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setEditOpen(false);
      setEditForm(null);
      toast.success("Sag opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setDeleteConfirm(null);
      toast.success("Sag slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignEmployees = useMutation({
    mutationFn: async () => {
      if (!assignCaseId || selectedUserIds.length === 0) return;

      const existing = new Set(getCaseAssignments(assignCaseId).map((a: any) => a.user_id));
      const toInsert = selectedUserIds
        .filter((uid) => !existing.has(uid))
        .map((uid) => ({ case_id: assignCaseId, user_id: uid }));

      if (toInsert.length === 0) return;

      const { error } = await supabase.from("case_assignments").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_assignments_all"] });
      setSelectedUserIds([]);
      setAssignOpen(false);
      setAssignCaseId(null);
      toast.success("Medarbejdere tilknyttet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("case_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_assignments_all"] });
      toast.success("Tilknytning fjernet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = cases?.filter((c: any) => {
    const matchSearch =
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.customer.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "alle" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    alle: cases?.length || 0,
    Aktiv: cases?.filter((c: any) => c.status === "Aktiv").length || 0,
    Planlagt: cases?.filter((c: any) => c.status === "Planlagt").length || 0,
    Afsluttet: cases?.filter((c: any) => c.status === "Afsluttet").length || 0,
  };

  return (
    <div>
      <PageHeader title="Sager" description={`${counts.alle} sager i alt · ${counts.Aktiv} aktive`}>
        {role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                <Plus size={16} /> Ny sag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-lg">Opret ny sag</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createCase.mutate();
                }}
              >
                <CaseFormFields f={form} setF={setForm} />
                <div className="flex justify-end gap-2 pt-5">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                    Annuller
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCase.isPending}
                    className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                  >
                    {createCase.isPending ? "Opretter..." : "Opret sag"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søg sager..."
            className="pl-10 rounded-xl h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {(["alle", "Aktiv", "Planlagt", "Afsluttet"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "alle" ? "Alle" : s} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-5 w-24 rounded bg-muted" />
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted hidden md:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cases list */}
      {!isLoading && (
        <div className="space-y-3">
          {(filtered || []).map((c: any, i: number) => {
            const isExpanded = expandedId === c.id;
            const caseAssignments = role === "admin" ? getCaseAssignments(c.id) : [];

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-all overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="text-sm font-bold text-card-foreground whitespace-nowrap">{c.case_number}</span>
                    <span className="text-sm text-card-foreground truncate">{c.customer}</span>
                    <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-muted-foreground/50 flex-shrink-0" /> {c.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {role === "admin" && caseAssignments.length > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <Users size={10} /> {caseAssignments.length}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        statusColors[c.status] || ""
                      }`}
                    >
                      {c.status}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-border pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Adresse</p>
                            <p className="text-sm text-card-foreground flex items-center gap-1.5">
                              <MapPin size={13} className="text-muted-foreground/50" /> {c.address}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Periode</p>
                            <p className="text-sm text-card-foreground">
                              {c.start_date || "–"} → {c.end_date || "–"}
                            </p>
                          </div>
                        </div>

                        {c.description && (
                          <div className="mb-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Beskrivelse</p>
                            <p className="text-sm text-card-foreground leading-relaxed">{c.description}</p>
                          </div>
                        )}

                        {/* Assigned employees (admin only) */}
                        {role === "admin" && (
                          <div className="mb-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Tilknyttede medarbejdere</p>
                            <div className="flex flex-wrap gap-2">
                              {caseAssignments.map((a: any) => {
                                const emp = employeeByUserId.get(a.user_id);
                                const name = (emp?.full_name || "").trim() || "Ukendt";
                                return (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                                  >
                                    {name}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeAssignment.mutate(a.id);
                                      }}
                                      className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                );
                              })}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssignCaseId(c.id);
                                  setSelectedUserIds([]);
                                  setAssignOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                              >
                                <UserPlus size={12} /> Tilføj
                              </button>
                            </div>
                          </div>
                        )}

                        {role === "admin" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditForm({ ...c });
                                setEditOpen(true);
                              }}
                            >
                              <Edit size={13} /> Rediger
                            </Button>

                            {deleteConfirm === c.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-destructive font-medium">Er du sikker?</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-xl h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCase.mutate(c.id);
                                  }}
                                >
                                  Ja, slet
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(null);
                                  }}
                                >
                                  Nej
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(c.id);
                                }}
                              >
                                <Trash2 size={13} /> Slet
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filtered?.length === 0 && (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Ingen sager fundet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Prøv at justere dine filtre</p>
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditForm(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Rediger sag</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCase.mutate();
              }}
            >
              <CaseFormFields f={editForm} setF={setEditForm} />
              <div className="flex justify-end gap-2 pt-5">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                  Annuller
                </Button>
                <Button
                  type="submit"
                  disabled={updateCase.isPending}
                  className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                >
                  {updateCase.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign employees dialog */}
      <AssignEmployeesDialog
        open={assignOpen}
        onOpenChange={(v) => {
          setAssignOpen(v);
          if (!v) {
            setAssignCaseId(null);
            setSelectedUserIds([]);
          }
        }}
        employees={(employees as any) || []}
        assignedUserIds={getCaseAssignments(assignCaseId || "").map((a: any) => a.user_id)}
        selectedUserIds={selectedUserIds}
        onSelectedUserIdsChange={setSelectedUserIds}
        onConfirm={() => assignEmployees.mutate()}
        confirmLoading={assignEmployees.isPending}
        disabled={!assignCaseId}
      />
    </div>
  );
}
