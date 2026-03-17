import { PageHeader } from "@/components/PageHeader";
import { AssignEmployeesDialog } from "@/components/cases/AssignEmployeesDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChevronDown, Edit, MapPin, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Aktiv: "bg-success/10 text-success border border-success/20",
  Afsluttet: "bg-muted text-muted-foreground border border-border",
  Planlagt: "bg-warning/10 text-warning border border-warning/20",
};

const statusOptions = ["Aktiv", "Planlagt", "Afsluttet"];

const emptyCaseForm = {
  case_number: "",
  customer: "",
  customer_id: "",
  address: "",
  description: "",
  start_date: "",
  end_date: "",
  status: "Aktiv",
};

const emptyCustomerForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  notes: "",
};

function CaseFormFields({
  f,
  setF,
  customers,
  onCreateCustomer,
}: {
  f: any;
  setF: (v: any) => void;
  customers: any[];
  onCreateCustomer: () => void;
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
            className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kunde</Label>
          <button type="button" onClick={onCreateCustomer} className="text-[11px] font-semibold text-primary hover:underline">
            + Ny kunde
          </button>
        </div>
        <select
          value={f.customer_id}
          onChange={(e) => {
            const selected = customers.find((customer) => customer.id === e.target.value);
            setF({
              ...f,
              customer_id: e.target.value,
              customer: selected?.name || f.customer,
            });
          }}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="">Ingen tilknyttet kunde</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kundenavn</Label>
        <Input
          value={f.customer}
          onChange={(e) => setF({ ...f, customer: e.target.value })}
          placeholder="Dansk Bygge A/S"
          className="mt-1.5 rounded-xl"
          required
          disabled={!!f.customer_id}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {f.customer_id ? "Kundenavn kommer fra den valgte kunde." : "Kan bruges til eksisterende eller manuelle sager uden kundeprofil."}
        </p>
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
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDialogTarget, setCustomerDialogTarget] = useState<"create" | "edit">("create");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("alle");

  const [form, setForm] = useState(emptyCaseForm);
  const [editForm, setEditForm] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);

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

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: role === "admin",
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

  useEffect(() => {
    const state = location.state as { newCaseForCustomer?: any; focusCaseId?: string } | null;
    if (!state) return;

    if (state.newCaseForCustomer) {
      const selectedCustomer = state.newCaseForCustomer;
      setForm((prev) => ({
        ...prev,
        customer_id: selectedCustomer.id,
        customer: selectedCustomer.name,
      }));
      setOpen(true);
    }

    if (state.focusCaseId) {
      setExpandedId(state.focusCaseId);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const getCaseAssignments = (caseId: string) => assignments?.filter((assignment: any) => assignment.case_id === caseId) || [];

  const employeeByUserId = useMemo(() => {
    const map = new Map<string, any>();
    (employees || []).forEach((employee: any) => map.set(employee.user_id, employee));
    return map;
  }, [employees]);

  const createCase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cases").insert({
        ...form,
        customer_id: form.customer_id || null,
        customer: form.customer,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setOpen(false);
      setForm(emptyCaseForm);
      toast.success("Sag oprettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateCase = useMutation({
    mutationFn: async () => {
      if (!editForm) return;
      const { error } = await supabase
        .from("cases")
        .update({
          case_number: editForm.case_number,
          customer: editForm.customer,
          customer_id: editForm.customer_id || null,
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
    onError: (error: any) => toast.error(error.message),
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
    onError: (error: any) => toast.error(error.message),
  });

  const assignEmployees = useMutation({
    mutationFn: async () => {
      if (!assignCaseId || selectedUserIds.length === 0) return;

      const existing = new Set(getCaseAssignments(assignCaseId).map((assignment: any) => assignment.user_id));
      const toInsert = selectedUserIds
        .filter((userId) => !existing.has(userId))
        .map((userId) => ({ case_id: assignCaseId, user_id: userId }));

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
    onError: (error: any) => toast.error(error.message),
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
    onError: (error: any) => toast.error(error.message),
  });

  const createCustomer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          ...customerForm,
          address: customerForm.address || null,
          phone: customerForm.phone || null,
          email: customerForm.email || null,
          notes: customerForm.notes || null,
          created_by: user!.id,
        })
        .select("id, name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (customerDialogTarget === "create") {
        setForm((prev) => ({ ...prev, customer_id: customer.id, customer: customer.name }));
      } else {
        setEditForm((prev: any) => (prev ? { ...prev, customer_id: customer.id, customer: customer.name } : prev));
      }
      setCustomerDialogOpen(false);
      setCustomerForm(emptyCustomerForm);
      toast.success("Kunde oprettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const filtered = cases?.filter((caseItem: any) => {
    const matchSearch =
      caseItem.case_number.toLowerCase().includes(search.toLowerCase()) ||
      caseItem.customer.toLowerCase().includes(search.toLowerCase()) ||
      caseItem.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "alle" || caseItem.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    alle: cases?.length || 0,
    Aktiv: cases?.filter((caseItem: any) => caseItem.status === "Aktiv").length || 0,
    Planlagt: cases?.filter((caseItem: any) => caseItem.status === "Planlagt").length || 0,
    Afsluttet: cases?.filter((caseItem: any) => caseItem.status === "Afsluttet").length || 0,
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
                <DialogTitle className="font-heading text-lg font-bold">Opret ny sag</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createCase.mutate();
                }}
              >
                <CaseFormFields f={form} setF={setForm} customers={customers || []} onCreateCustomer={() => {
                  setCustomerDialogTarget("create");
                  setCustomerDialogOpen(true);
                }} />
                <div className="flex justify-end gap-2 pt-5">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                    Annuller
                  </Button>
                  <Button type="submit" disabled={createCase.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                    {createCase.isPending ? "Opretter..." : "Opret sag"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg sager..." className="h-11 rounded-xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {(["alle", "Aktiv", "Planlagt", "Afsluttet"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === status ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {status === "alle" ? "Alle" : status} ({counts[status]})
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="h-5 w-24 rounded bg-muted" />
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="hidden h-4 w-32 rounded bg-muted md:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {(filtered || []).map((caseItem: any, index: number) => {
            const isExpanded = expandedId === caseItem.id;
            const caseAssignments = role === "admin" ? getCaseAssignments(caseItem.id) : [];

            return (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-elevated"
              >
                <div className="flex cursor-pointer items-center justify-between p-5" onClick={() => setExpandedId(isExpanded ? null : caseItem.id)}>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-bold text-card-foreground">{caseItem.case_number}</span>
                    <div className="min-w-0">
                      <span className="block truncate text-sm text-card-foreground">{caseItem.description || caseItem.address}</span>
                      {caseItem.customer && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{caseItem.customer}</span>
                      )}
                    </div>
                    <span className="hidden items-center gap-1.5 truncate text-xs text-muted-foreground md:flex">
                      <MapPin size={12} className="flex-shrink-0 text-muted-foreground/50" /> {caseItem.address}
                    </span>
                  </div>
                  <div className="ml-3 flex flex-shrink-0 items-center gap-3">
                    {role === "admin" && caseAssignments.length > 0 && (
                      <span className="hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                        <Users size={10} /> {caseAssignments.length}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[caseItem.status] || ""}`}>
                      {caseItem.status}
                    </span>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
                      <div className="border-t border-border px-5 pb-5 pt-4">
                        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Adresse</p>
                            <p className="flex items-center gap-1.5 text-sm text-card-foreground">
                              <MapPin size={13} className="text-muted-foreground/50" /> {caseItem.address}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Periode</p>
                            <p className="text-sm text-card-foreground">
                              {caseItem.start_date || "–"} → {caseItem.end_date || "–"}
                            </p>
                          </div>
                        </div>

                        {caseItem.customer && (
                          <div className="mb-4">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Kunde</p>
                            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-card-foreground">
                              <Building2 size={14} className="text-primary" />
                              {caseItem.customer}
                            </div>
                          </div>
                        )}

                        {caseItem.description && (
                          <div className="mb-4">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Beskrivelse</p>
                            <p className="text-sm leading-relaxed text-card-foreground">{caseItem.description}</p>
                          </div>
                        )}

                        {role === "admin" && (
                          <div className="mb-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Tilknyttede medarbejdere</p>
                            <div className="flex flex-wrap gap-2">
                              {caseAssignments.map((assignment: any) => {
                                const employee = employeeByUserId.get(assignment.user_id);
                                const name = (employee?.full_name || "").trim() || "Ukendt";
                                return (
                                  <span key={assignment.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                                    {name}
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeAssignment.mutate(assignment.id);
                                      }}
                                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                );
                              })}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAssignCaseId(caseItem.id);
                                  setSelectedUserIds([]);
                                  setAssignOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
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
                              className="gap-1.5 rounded-xl"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditForm({ ...caseItem, customer_id: caseItem.customer_id || "" });
                                setEditOpen(true);
                              }}
                            >
                              <Edit size={13} /> Rediger
                            </Button>

                            {deleteConfirm === caseItem.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-destructive">Er du sikker?</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 rounded-xl"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteCase.mutate(caseItem.id);
                                  }}
                                >
                                  Ja, slet
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-xl"
                                  onClick={(event) => {
                                    event.stopPropagation();
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
                                className="gap-1.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteConfirm(caseItem.id);
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
            <div className="py-16 text-center">
              <Search size={32} className="mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">Ingen sager fundet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Prøv at justere dine filtre</p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) setEditForm(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Rediger sag</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                updateCase.mutate();
              }}
            >
              <CaseFormFields f={editForm} setF={setEditForm} customers={customers || []} onCreateCustomer={() => {
                setCustomerDialogTarget("edit");
                setCustomerDialogOpen(true);
              }} />
              <div className="flex justify-end gap-2 pt-5">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                  Annuller
                </Button>
                <Button type="submit" disabled={updateCase.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {updateCase.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Opret ny kunde</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createCustomer.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navn</Label>
              <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="mt-1.5 rounded-xl" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adresse</Label>
              <Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefon</Label>
                <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Noter</Label>
              <Textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} className="mt-1.5 rounded-xl" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)} className="rounded-xl">
                Annuller
              </Button>
              <Button type="submit" disabled={createCustomer.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                {createCustomer.isPending ? "Opretter..." : "Opret kunde"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AssignEmployeesDialog
        open={assignOpen}
        onOpenChange={(value) => {
          setAssignOpen(value);
          if (!value) {
            setAssignCaseId(null);
            setSelectedUserIds([]);
          }
        }}
        employees={(employees as any) || []}
        assignedUserIds={getCaseAssignments(assignCaseId || "").map((assignment: any) => assignment.user_id)}
        selectedUserIds={selectedUserIds}
        onSelectedUserIdsChange={setSelectedUserIds}
        onConfirm={() => assignEmployees.mutate()}
        confirmLoading={assignEmployees.isPending}
        disabled={!assignCaseId}
      />
    </div>
  );
}
