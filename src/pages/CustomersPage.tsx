import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Building2, Hash, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type CustomerType = "Privat" | "Erhverv";

const customerTypeOptions: CustomerType[] = ["Privat", "Erhverv"];
const customerFilters = ["Alle", "Privat", "Erhverv"] as const;

const emptyCustomerForm = {
  customer_type: "Privat" as CustomerType,
  customer_number: "",
  name: "",
  company_name: "",
  contact_person: "",
  address: "",
  phone: "",
  email: "",
  notes: "",
};

function getCustomerPayload(form: typeof emptyCustomerForm, userId: string) {
  const isBusiness = form.customer_type === "Erhverv";
  const displayName = isBusiness ? form.company_name.trim() : form.name.trim();

  return {
    created_by: userId,
    customer_type: form.customer_type,
    name: displayName,
    company_name: isBusiness ? form.company_name.trim() || null : null,
    contact_person: isBusiness ? form.contact_person.trim() || null : null,
    address: form.address.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function getCustomerNameLabel(customer: any) {
  return customer.customer_type === "Erhverv"
    ? customer.company_name || customer.name || "–"
    : customer.name || "–";
}

function getCustomerOptionLabel(customer: any) {
  const name = getCustomerNameLabel(customer);
  return customer.customer_number ? `${customer.customer_number} · ${name}` : name;
}

function getCustomerTypeBadgeVariant(type: string | null) {
  return type === "Erhverv" ? "default" : "secondary";
}

function getCustomerCaseStatus(caseItem: any) {
  return caseItem.status === "Afsluttet" ? "Afsluttet" : "Igangværende";
}

export default function CustomersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof customerFilters)[number]>("Alle");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyCustomerForm);
  const [editForm, setEditForm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("id, case_number, customer, customer_id, case_description, description, status, start_date, end_date, address")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const caseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (cases || []).forEach((item: any) => {
      if (!item.customer_id) return;
      counts[item.customer_id] = (counts[item.customer_id] || 0) + 1;
    });
    return counts;
  }, [cases]);

  const customerCases = useMemo(() => {
    if (!selectedCustomer) return [];
    return (cases || []).filter((item: any) => item.customer_id === selectedCustomer.id);
  }, [cases, selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase().trim();
    return (customers || []).filter((customer: any) => {
      const matchesType = typeFilter === "Alle" || customer.customer_type === typeFilter;
      const matchesSearch = !query || [
        customer.customer_number,
        customer.name,
        customer.company_name,
        customer.contact_person,
        customer.address,
        customer.phone,
        customer.email,
      ].some((value) => value?.toLowerCase().includes(query));

      return matchesType && matchesSearch;
    });
  }, [customers, search, typeFilter]);

  const createCustomer = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Du skal være logget ind");

      const payload = getCustomerPayload(form, user.id);
      if (!payload.name) throw new Error(form.customer_type === "Erhverv" ? "Indtast firmanavn" : "Indtast navn");
      if (form.customer_type === "Erhverv" && !payload.contact_person) throw new Error("Indtast kontaktperson");

      const { error } = await supabase.from("customers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
      setForm(emptyCustomerForm);
      toast.success("Kunde oprettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateCustomer = useMutation({
    mutationFn: async () => {
      if (!editForm) return;

      const isBusiness = editForm.customer_type === "Erhverv";
      const displayName = isBusiness ? editForm.company_name?.trim() : editForm.name?.trim();

      if (!displayName) throw new Error(isBusiness ? "Indtast firmanavn" : "Indtast navn");
      if (isBusiness && !editForm.contact_person?.trim()) throw new Error("Indtast kontaktperson");

      const { error } = await supabase
        .from("customers")
        .update({
          customer_type: editForm.customer_type,
          name: displayName,
          company_name: isBusiness ? editForm.company_name?.trim() || null : null,
          contact_person: isBusiness ? editForm.contact_person?.trim() || null : null,
          address: editForm.address?.trim() || null,
          phone: editForm.phone?.trim() || null,
          email: editForm.email?.trim() || null,
          notes: editForm.notes?.trim() || null,
        })
        .eq("id", editForm.id);

      if (error) throw error;

      const { error: caseError } = await supabase
        .from("cases")
        .update({ customer: displayName })
        .eq("customer_id", editForm.id);

      if (caseError) throw caseError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      if (selectedCustomer) {
        setSelectedCustomer((prev: any) =>
          prev
            ? {
                ...prev,
                ...editForm,
                name: editForm.customer_type === "Erhverv" ? editForm.company_name : editForm.name,
              }
            : prev,
        );
      }
      setEditOpen(false);
      setEditForm(null);
      toast.success("Kunde opdateret");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      if (selectedCustomer?.id === customerId) setSelectedCustomer(null);
      setDeleteConfirm(null);
      toast.success("Kunde slettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (selectedCustomer) {
    return (
      <div>
        <button
          onClick={() => setSelectedCustomer(null)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Tilbage til kunder
        </button>

        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-heading font-bold text-card-foreground">{getCustomerNameLabel(selectedCustomer)}</h2>
                    <Badge variant={getCustomerTypeBadgeVariant(selectedCustomer.customer_type)}>
                      {selectedCustomer.customer_type || "Privat"}
                    </Badge>
                    {selectedCustomer.customer_number && (
                      <Badge variant="outline">#{selectedCustomer.customer_number}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {caseCounts[selectedCustomer.id] || 0} {(caseCounts[selectedCustomer.id] || 0) === 1 ? "sag" : "sager"}
                  </p>
                  {selectedCustomer.customer_type === "Erhverv" && selectedCustomer.contact_person && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User size={12} /> Kontaktperson: {selectedCustomer.contact_person}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kundenummer</p>
                  <p className="flex items-center gap-2 text-sm text-card-foreground">
                    <Hash size={14} className="text-muted-foreground" />
                    {selectedCustomer.customer_number || "–"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adresse</p>
                  <p className="flex items-start gap-2 text-sm text-card-foreground">
                    <MapPin size={14} className="mt-0.5 text-muted-foreground" />
                    {selectedCustomer.address || "–"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2 lg:col-span-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kontakt</p>
                  <div className="space-y-1.5 text-sm text-card-foreground">
                    <p className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" />{selectedCustomer.phone || "–"}</p>
                    <p className="flex items-center gap-2 break-all"><Mail size={14} className="text-muted-foreground" />{selectedCustomer.email || "–"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Noter</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{selectedCustomer.notes || "Ingen noter endnu"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => {
                  setEditForm(selectedCustomer);
                  setEditOpen(true);
                }}
              >
                <Pencil size={14} /> Rediger
              </Button>
              <Button
                className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                onClick={() => navigate("/cases", { state: { newCaseForCustomer: selectedCustomer } })}
              >
                <Plus size={14} /> Ny sag til denne kunde
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tilknyttede sager</h3>
            <p className="text-sm text-muted-foreground">Fuldt historikoverblik for kunden</p>
          </div>
        </div>

        <div className="space-y-3">
          {customerCases.map((caseItem: any, index: number) => {
            const customerCaseStatus = getCustomerCaseStatus(caseItem);
            return (
              <motion.button
                key={caseItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate("/cases", { state: { focusCaseId: caseItem.id } })}
                className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Briefcase size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">{formatCaseLabel(caseItem)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{caseItem.description || caseItem.address || "Ingen ekstra beskrivelse"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Periode: {caseItem.start_date || "–"} → {caseItem.end_date || "–"}</span>
                      <span>{caseItem.address || "Ingen adresse"}</span>
                    </div>
                  </div>
                  <Badge variant={customerCaseStatus === "Afsluttet" ? "secondary" : "default"}>
                    {customerCaseStatus}
                  </Badge>
                </div>
              </motion.button>
            );
          })}

          {customerCases.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Briefcase size={36} className="mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">Ingen sager tilknyttet endnu</p>
              <Button
                className="mt-4 gap-2 rounded-xl"
                onClick={() => navigate("/cases", { state: { newCaseForCustomer: selectedCustomer } })}
              >
                <Plus size={14} /> Opret første sag
              </Button>
            </div>
          )}
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">Rediger kunde</DialogTitle>
            </DialogHeader>
            {editForm && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  updateCustomer.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kundetype</Label>
                  <div className="mt-1.5 flex gap-2 rounded-xl bg-muted/40 p-1">
                    {customerTypeOptions.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditForm({
                          ...editForm,
                          customer_type: type,
                          name: type === "Erhverv" ? editForm.company_name || editForm.name : editForm.name,
                        })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${editForm.customer_type === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {editForm.customer_type === "Erhverv" ? (
                  <>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Virksomhedsnavn</Label>
                      <Input value={editForm.company_name || ""} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value, name: e.target.value })} className="mt-1.5 rounded-xl" required />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kontaktperson</Label>
                      <Input value={editForm.contact_person || ""} onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} className="mt-1.5 rounded-xl" required />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navn</Label>
                    <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value, company_name: null, contact_person: null })} className="mt-1.5 rounded-xl" required />
                  </div>
                )}

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kundenummer</Label>
                  <Input value={editForm.customer_number || "Tildeles automatisk"} readOnly className="mt-1.5 rounded-xl text-muted-foreground" />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adresse</Label>
                  <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1.5 rounded-xl" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefon</Label>
                    <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Noter</Label>
                  <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1.5 rounded-xl" rows={4} />
                </div>
                <div className="flex justify-between pt-2">
                  {deleteConfirm === selectedCustomer.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-destructive">Slet kunde?</span>
                      <Button type="button" variant="destructive" size="sm" className="rounded-xl" onClick={() => deleteCustomer.mutate(selectedCustomer.id)}>
                        Ja, slet
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setDeleteConfirm(null)}>
                        Nej
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="ghost" className="gap-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteConfirm(selectedCustomer.id)}>
                      <Trash2 size={14} /> Slet
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Annuller</Button>
                    <Button type="submit" className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={updateCustomer.isPending}>
                      {updateCustomer.isPending ? "Gemmer..." : "Gem ændringer"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Kunder" description={`${customers?.length || 0} kunder i systemet`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
              <Plus size={16} /> Ny kunde
            </Button>
          </DialogTrigger>
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
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kundetype</Label>
                <div className="mt-1.5 flex gap-2 rounded-xl bg-muted/40 p-1">
                  {customerTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, customer_type: type }))}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${form.customer_type === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {form.customer_type === "Erhverv" ? (
                <>
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Virksomhedsnavn</Label>
                    <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5 rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kontaktperson</Label>
                    <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="mt-1.5 rounded-xl" required />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navn</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" required />
                </div>
              )}

              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kundenummer</Label>
                <Input value={selectedCustomer.customer_number || "Tildeles automatisk"} readOnly className="mt-1.5 rounded-xl text-muted-foreground" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Noter</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 rounded-xl" rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Annuller</Button>
                <Button type="submit" className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={createCustomer.isPending}>
                  {createCustomer.isPending ? "Opretter..." : "Opret kunde"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søg kunder eller kundenummer..." className="h-11 rounded-xl pl-10" />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {customerFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${typeFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && [1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-5">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-56 rounded bg-muted" />
            </div>
          </div>
        ))}

        {(filteredCustomers || []).map((customer: any, index: number) => (
          <motion.button
            key={customer.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => setSelectedCustomer(customer)}
            className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">
                      <span className="mr-2 text-xs font-medium text-muted-foreground">{customer.customer_number || "—"}</span>
                      {getCustomerNameLabel(customer)}
                    </p>
                    <Badge variant={getCustomerTypeBadgeVariant(customer.customer_type)}>{customer.customer_type || "Privat"}</Badge>
                  <p className="mt-0.5 text-xs text-muted-foreground">{customer.address || "Ingen adresse"}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {customer.customer_type === "Erhverv" && customer.contact_person ? `${customer.contact_person} · ` : ""}
                    {customer.phone || "–"} · {customer.email || "–"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  {caseCounts[customer.id] || 0} {(caseCounts[customer.id] || 0) === 1 ? "sag" : "sager"}
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">{getCustomerOptionLabel(customer)}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {!isLoading && filteredCustomers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Building2 size={40} className="mx-auto mb-4 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground">Ingen kunder fundet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Prøv et andet filter eller opret en ny kunde</p>
          <Button className="mt-4 gap-2 rounded-xl" onClick={() => setOpen(true)}>
            <Plus size={14} /> Ny kunde
          </Button>
        </div>
      )}
    </div>
  );
}
