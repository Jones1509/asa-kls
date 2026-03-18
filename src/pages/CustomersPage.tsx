import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CustomerType = "Privat" | "Erhverv";
type CaseStatus = "Aktiv" | "Planlagt" | "Afsluttet";

type CustomerWithCases = {
  customer: any;
  visibleCases: any[];
  totalCases: number;
  activeCases: number;
};

const customerTypeOptions: CustomerType[] = ["Privat", "Erhverv"];
const customerFilters = ["Alle", "Privat", "Erhverv"] as const;
const caseStatusOptions: CaseStatus[] = ["Aktiv", "Planlagt", "Afsluttet"];

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

const emptyCaseForm = {
  id: "",
  case_number: "",
  case_description: "",
  customer: "",
  customer_id: "",
  address: "",
  description: "",
  start_date: "",
  end_date: "",
  status: "Aktiv" as CaseStatus,
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

function getCustomerSortValue(customerNumber?: string | null) {
  if (!customerNumber) return Number.MAX_SAFE_INTEGER;
  const match = customerNumber.match(/K-(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function getCaseSortValue(caseNumber?: string | null) {
  if (!caseNumber) return Number.MAX_SAFE_INTEGER;
  const match = caseNumber.match(/K-(\d+)-(\d+)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10) * 1000 + Number.parseInt(match[2], 10);
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  return values.some((value) => value?.toLowerCase().includes(query));
}

const invoiceCollator = new Intl.Collator("da-DK", { numeric: true, sensitivity: "base" });
const invoiceDateFormatter = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" });

function formatInvoiceDate(dateString?: string | null) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return invoiceDateFormatter.format(date);
}

export default function CustomersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof customerFilters)[number]>("Alle");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [caseDialogMode, setCaseDialogMode] = useState<"create" | "edit">("edit");
  const [form, setForm] = useState(emptyCustomerForm);
  const [editForm, setEditForm] = useState<any>(null);
  const [caseForm, setCaseForm] = useState<any>(emptyCaseForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [caseDeleteConfirm, setCaseDeleteConfirm] = useState<string | null>(null);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedInvoiceCases, setExpandedInvoiceCases] = useState<Record<string, boolean>>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*");
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

  const { data: invoices } = useQuery({
    queryKey: ["customer-case-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, case_id, customer, amount, due_date, description, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const customerCasesMap = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    (cases || []).forEach((caseItem: any) => {
      if (!caseItem.customer_id) return;
      if (!grouped[caseItem.customer_id]) grouped[caseItem.customer_id] = [];
      grouped[caseItem.customer_id].push(caseItem);
    });

    Object.keys(grouped).forEach((customerId) => {
      grouped[customerId] = grouped[customerId].sort((a, b) => getCaseSortValue(a.case_number) - getCaseSortValue(b.case_number));
    });

    return grouped;
  }, [cases]);

  const invoicesByCaseMap = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    (invoices || []).forEach((invoice: any) => {
      if (!grouped[invoice.case_id]) grouped[invoice.case_id] = [];
      grouped[invoice.case_id].push(invoice);
    });

    Object.keys(grouped).forEach((caseId) => {
      grouped[caseId] = grouped[caseId].sort((a, b) => invoiceCollator.compare(a.invoice_number || "", b.invoice_number || ""));
    });

    return grouped;
  }, [invoices]);

  const filteredCustomers = useMemo<CustomerWithCases[]>(() => {
    const query = search.toLowerCase().trim();

    return [...(customers || [])]
      .sort((a: any, b: any) => getCustomerSortValue(a.customer_number) - getCustomerSortValue(b.customer_number))
      .flatMap((customer: any) => {
        const matchesType = typeFilter === "Alle" || customer.customer_type === typeFilter;
        if (!matchesType) return [];

        const allCases = customerCasesMap[customer.id] || [];
        const customerMatches = !query || matchesQuery(
          [
            customer.customer_number,
            customer.name,
            customer.company_name,
            customer.contact_person,
            customer.address,
            customer.phone,
            customer.email,
          ],
          query,
        );

        const matchingCases = !query
          ? allCases
          : allCases.filter((caseItem: any) =>
              matchesQuery(
                [
                  caseItem.case_number,
                  caseItem.customer,
                  caseItem.case_description,
                  caseItem.description,
                  caseItem.address,
                ],
                query,
              ),
            );

        if (!customerMatches && matchingCases.length === 0) return [];

        return [{
          customer,
          visibleCases: customerMatches ? allCases : matchingCases,
          totalCases: allCases.length,
          activeCases: allCases.filter((caseItem: any) => getCustomerCaseStatus(caseItem) === "Igangværende").length,
        }];
      });
  }, [customers, customerCasesMap, search, typeFilter]);

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
      setEditOpen(false);
      setEditForm(null);
      setDeleteConfirm(null);
      toast.success("Kunde opdateret");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setEditOpen(false);
      setEditForm(null);
      setDeleteConfirm(null);
      toast.success("Kunde slettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["customer-case-invoices"] });
      setCaseDialogOpen(false);
      setCaseForm(emptyCaseForm);
      setCaseDeleteConfirm(null);
      toast.success("Sag slettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createCase = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Du skal være logget ind");
      if (!caseForm.customer_id) throw new Error("Vælg kunde");
      if (!caseForm.case_description?.trim()) throw new Error("Indtast sagsbeskrivelse");
      if (!caseForm.address?.trim()) throw new Error("Indtast adresse");

      const { error } = await supabase.from("cases").insert([{
        case_number: caseForm.case_number || "",
        customer_id: caseForm.customer_id,
        customer: caseForm.customer,
        case_description: caseForm.case_description.trim(),
        address: caseForm.address.trim(),
        description: caseForm.description?.trim() || null,
        start_date: caseForm.start_date || null,
        end_date: caseForm.end_date || null,
        status: caseForm.status,
        created_by: user.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setCaseDialogOpen(false);
      setCaseForm(emptyCaseForm);
      setCaseDeleteConfirm(null);
      toast.success("Sag oprettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateCase = useMutation({
    mutationFn: async () => {
      if (!caseForm.id) return;
      if (!caseForm.customer_id) throw new Error("Vælg kunde");
      if (!caseForm.case_description?.trim()) throw new Error("Indtast sagsbeskrivelse");
      if (!caseForm.address?.trim()) throw new Error("Indtast adresse");

      const { error } = await supabase
        .from("cases")
        .update({
          customer_id: caseForm.customer_id,
          customer: caseForm.customer,
          case_description: caseForm.case_description.trim(),
          address: caseForm.address.trim(),
          description: caseForm.description?.trim() || null,
          start_date: caseForm.start_date || null,
          end_date: caseForm.end_date || null,
          status: caseForm.status,
        })
        .eq("id", caseForm.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setCaseDialogOpen(false);
      setCaseForm(emptyCaseForm);
      toast.success("Sag opdateret");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers((prev) => ({ ...prev, [customerId]: !prev[customerId] }));
  };

  const openCreateCase = (customer: any) => {
    setExpandedCustomers((prev) => ({ ...prev, [customer.id]: true }));
    setCaseDialogMode("create");
    setCaseForm({
      ...emptyCaseForm,
      customer_id: customer.id,
      customer: getCustomerNameLabel(customer),
    });
    setCaseDialogOpen(true);
  };

  const openEditCase = (caseItem: any) => {
    setCaseDialogMode("edit");
    setCaseForm({
      ...emptyCaseForm,
      ...caseItem,
      customer_id: caseItem.customer_id || "",
      description: caseItem.description || "",
      start_date: caseItem.start_date || "",
      end_date: caseItem.end_date || "",
      status: (caseItem.status || "Aktiv") as CaseStatus,
    });
    setCaseDialogOpen(true);
  };

  const handleCaseCustomerChange = (customerId: string) => {
    const selectedCustomer = (customers || []).find((customer: any) => customer.id === customerId);
    setCaseForm((prev: any) => ({
      ...prev,
      customer_id: customerId,
      customer: selectedCustomer ? getCustomerNameLabel(selectedCustomer) : "",
    }));
  };

  return (
    <div>
      <PageHeader title="Kunder" description={`${customers?.length || 0} kunder i systemet`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-card">
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
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        form.customer_type === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
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
                <Input value={form.customer_number || "Tildeles automatisk"} readOnly className="mt-1.5 rounded-xl text-muted-foreground" />
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
                <Button type="submit" className="rounded-xl shadow-card" disabled={createCustomer.isPending}>
                  {createCustomer.isPending ? "Opretter..." : "Opret kunde"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) {
            setEditForm(null);
            setDeleteConfirm(null);
          }
        }}
      >
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
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          customer_type: type,
                          name: type === "Erhverv" ? editForm.company_name || editForm.name : editForm.name,
                        })
                      }
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        editForm.customer_type === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
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
                {deleteConfirm === editForm.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-destructive">Slet kunde?</span>
                    <Button type="button" variant="destructive" size="sm" className="rounded-xl" onClick={() => deleteCustomer.mutate(editForm.id)}>
                      Ja, slet
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setDeleteConfirm(null)}>
                      Nej
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" className="gap-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteConfirm(editForm.id)}>
                    <Trash2 size={14} /> Slet
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Annuller</Button>
                  <Button type="submit" className="rounded-xl shadow-card" disabled={updateCustomer.isPending}>
                    {updateCustomer.isPending ? "Gemmer..." : "Gem ændringer"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={caseDialogOpen}
        onOpenChange={(value) => {
          setCaseDialogOpen(value);
          if (!value) setCaseForm(emptyCaseForm);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              {caseDialogMode === "edit" ? "Se og rediger sag" : "Opret ny sag"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (caseDialogMode === "edit") {
                updateCase.mutate();
              } else {
                createCase.mutate();
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sagsnummer</Label>
                <Input value={caseForm.case_number || "Tildeles automatisk"} readOnly className="mt-1.5 rounded-xl text-muted-foreground" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <select
                  value={caseForm.status}
                  onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value as CaseStatus })}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  {caseStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kunde</Label>
              <select
                value={caseForm.customer_id}
                onChange={(e) => handleCaseCustomerChange(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1"
                required
              >
                <option value="">Vælg kunde...</option>
                {(customers || [])
                  .slice()
                  .sort((a: any, b: any) => getCustomerSortValue(a.customer_number) - getCustomerSortValue(b.customer_number))
                  .map((customer: any) => (
                    <option key={customer.id} value={customer.id}>{getCustomerOptionLabel(customer)}</option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sagsbeskrivelse</Label>
              <Input
                value={caseForm.case_description}
                onChange={(e) => setCaseForm({ ...caseForm, case_description: e.target.value })}
                className="mt-1.5 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adresse</Label>
              <Input
                value={caseForm.address}
                onChange={(e) => setCaseForm({ ...caseForm, address: e.target.value })}
                className="mt-1.5 rounded-xl"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detaljer</Label>
              <Textarea
                value={caseForm.description || ""}
                onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                className="mt-1.5 rounded-xl"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Startdato</Label>
                <Input
                  type="date"
                  value={caseForm.start_date || ""}
                  onChange={(e) => setCaseForm({ ...caseForm, start_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Slutdato</Label>
                <Input
                  type="date"
                  value={caseForm.end_date || ""}
                  onChange={(e) => setCaseForm({ ...caseForm, end_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCaseDialogOpen(false)}>
                Luk
              </Button>
              <Button type="submit" className="rounded-xl shadow-card" disabled={createCase.isPending || updateCase.isPending}>
                {caseDialogMode === "edit"
                  ? updateCase.isPending
                    ? "Opdaterer..."
                    : "Opdater"
                  : createCase.isPending
                    ? "Opretter..."
                    : "Opret sag"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg kunde, kundenummer, sagsnummer eller sag..."
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {customerFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                typeFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <p className="text-sm font-medium text-card-foreground">Kunder vises nu i stigende kundenummer: K-001, K-002, K-003…</p>
        <p className="mt-1 text-xs text-muted-foreground">Klik først på kunden, derefter på sagen, og se til sidst kun fakturaerne der hører til den valgte sag.</p>
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

        {filteredCustomers.map(({ customer, visibleCases, totalCases, activeCases }, index) => {
          const isExpanded = search.trim().length > 0 || !!expandedCustomers[customer.id];

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <button
                type="button"
                onClick={() => toggleCustomer(customer.id)}
                className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/20"
              >
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
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{customer.address || "Ingen adresse"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                      {customer.customer_type === "Erhverv" && customer.contact_person ? (
                        <span className="flex items-center gap-1"><User size={12} /> {customer.contact_person}</span>
                      ) : null}
                      <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone || "–"}</span>
                      <span className="flex items-center gap-1 break-all"><Mail size={12} /> {customer.email || "–"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {totalCases} {totalCases === 1 ? "sag" : "sager"}
                    </div>
                    <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {activeCases} aktive
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">{getCustomerOptionLabel(customer)}</p>
                </div>
              </button>

              <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 rounded-xl shadow-card"
                  onClick={() => openCreateCase(customer)}
                >
                  <Plus size={14} /> Ny sag
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => {
                    setEditForm(customer);
                    setDeleteConfirm(null);
                    setEditOpen(true);
                  }}
                >
                  <Pencil size={14} /> Rediger kunde
                </Button>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/10 px-5 py-4">
                  {customer.notes && (
                    <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Noter</p>
                      <p className="whitespace-pre-wrap text-sm text-card-foreground">{customer.notes}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {visibleCases.length > 0 ? (
                      visibleCases.map((caseItem: any) => {
                        const customerCaseStatus = getCustomerCaseStatus(caseItem);
                        const caseInvoices = invoicesByCaseMap[caseItem.id] || [];
                        const isInvoicesExpanded = !!expandedInvoiceCases[caseItem.id];
                        const caseInvoiceTotal = caseInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amount), 0);

                        return (
                          <div key={caseItem.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                            <div className="border-b border-border bg-muted/20 px-4 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sag</p>
                            </div>

                            <div className="p-4">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                      <Briefcase size={16} className="text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-card-foreground">{caseItem.case_number || "–"}</p>
                                        <p className="text-sm text-card-foreground">{caseItem.case_description || caseItem.description || "Ingen sagsbeskrivelse"}</p>
                                      </div>
                                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Hash size={12} /> {customer.customer_number || "–"}</span>
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {caseItem.address || "Ingen adresse"}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-start gap-3 lg:items-end">
                                  <Badge variant={customerCaseStatus === "Afsluttet" ? "secondary" : "default"}>
                                    {customerCaseStatus}
                                  </Badge>
                                  <div className="flex flex-wrap gap-2 lg:justify-end">
                                    <Button type="button" size="sm" variant="outline" className="gap-2 rounded-xl" onClick={() => openEditCase(caseItem)}>
                                      <Pencil size={14} /> Rediger sag
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isInvoicesExpanded ? "secondary" : "default"}
                                      className="gap-2 rounded-xl"
                                      onClick={() => setExpandedInvoiceCases((prev) => ({ ...prev, [caseItem.id]: !prev[caseItem.id] }))}
                                    >
                                      <Receipt size={14} />
                                      {isInvoicesExpanded ? "Skjul fakturaer" : `Vis fakturaer (${caseInvoices.length})`}
                                    </Button>
                                  </div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {caseInvoices.length} {caseInvoices.length === 1 ? "faktura" : "fakturaer"}
                                    {caseInvoices.length > 0 ? ` · ${caseInvoiceTotal.toLocaleString("da-DK")} kr` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {isInvoicesExpanded && (
                              <div className="border-t border-border bg-muted/10 p-3">
                                <div className="mb-3 rounded-xl border border-border bg-card px-4 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fakturaer</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Kun fakturaer til denne sag vises her.</p>
                                </div>

                                {caseInvoices.length > 0 ? (
                                  <div className="space-y-3">
                                    {caseInvoices.map((invoice: any) => (
                                      <div key={invoice.id} className="rounded-xl border border-border bg-card p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3">
                                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                                <Receipt size={15} className="text-primary" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <p className="text-sm font-semibold text-card-foreground">{invoice.invoice_number}</p>
                                                  <Badge variant={invoice.status === "Betalt" ? "outline" : invoice.status === "Forfalden" ? "destructive" : "secondary"}>
                                                    {invoice.status}
                                                  </Badge>
                                                </div>
                                                {invoice.description && <p className="mt-1 text-sm text-muted-foreground">{invoice.description}</p>}
                                                {invoice.due_date && <p className="mt-1 text-xs text-muted-foreground">Forfald: {formatInvoiceDate(invoice.due_date)}</p>}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-semibold text-card-foreground">{Number(invoice.amount).toLocaleString("da-DK")} kr</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                                    <Receipt size={28} className="mx-auto mb-3 text-muted-foreground/20" />
                                    <p className="text-sm font-medium text-muted-foreground">Ingen fakturaer på denne sag</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                        <Briefcase size={32} className="mx-auto mb-3 text-muted-foreground/20" />
                        <p className="text-sm font-medium text-muted-foreground">Ingen sager fundet</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">Søg på et andet kundenavn eller sagsnummer, eller opret en ny sag.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!isLoading && filteredCustomers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Building2 size={40} className="mx-auto mb-4 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground">Ingen kunder eller sager fundet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Prøv et andet søgeord eller opret en ny kunde</p>
          <Button className="mt-4 gap-2 rounded-xl shadow-card" onClick={() => setOpen(true)}>
            <Plus size={14} /> Ny kunde
          </Button>
        </div>
      )}
    </div>
  );
}
