import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCaseLabel } from "@/lib/case-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const statusConfig: Record<string, { className: string; icon: any; variant: "secondary" | "destructive" | "outline" | "default" }> = {
  Udkast: { className: "bg-muted text-muted-foreground", icon: Clock, variant: "secondary" },
  Sendt: { className: "border border-info/20 bg-info/10 text-info", icon: Receipt, variant: "outline" },
  Betalt: { className: "border border-success/20 bg-success/10 text-success", icon: CheckCircle2, variant: "outline" },
  Forfalden: { className: "border border-destructive/20 bg-destructive/10 text-destructive", icon: AlertCircle, variant: "destructive" },
};

const MONTHS = ["Januar", "Februar", "Marts", "April", "Maj", "Juni", "Juli", "August", "September", "Oktober", "November", "December"];
const statuses = ["Udkast", "Sendt", "Betalt", "Forfalden"];
const emptyForm = { case_id: "", invoice_number: "", customer: "", description: "", amount: "", due_date: "", status: "Udkast" };
const collator = new Intl.Collator("da-DK", { numeric: true, sensitivity: "base" });
const danishDateFormatter = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" });
const chartDateFormatter = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short" });
const CURRENT_YEAR = new Date().getFullYear();

type CaseOption = {
  id: string;
  case_number?: string | null;
  customer?: string | null;
  customer_id?: string | null;
  case_description?: string | null;
};

type InvoiceWithCase = {
  id: string;
  invoice_number: string;
  case_id: string;
  customer: string;
  description?: string | null;
  amount: number;
  due_date?: string | null;
  status: string;
  created_at: string;
  paid_date?: string | null;
  cases?: CaseOption | null;
};

type SearchFilters = {
  year: string;
  month: string;
};

type SortOrder = "newest" | "oldest";

const defaultFilters: SearchFilters = {
  year: String(CURRENT_YEAR),
  month: "all",
};

function formatDanishDate(dateString?: string | null) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return danishDateFormatter.format(date);
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("da-DK")} kr`;
}

function getCreatedDate(invoice: InvoiceWithCase) {
  return invoice.created_at.split("T")[0];
}

function getInvoiceSortDate(invoice: InvoiceWithCase) {
  return invoice.due_date || getCreatedDate(invoice);
}

function getInvoiceSortTimestamp(invoice: InvoiceWithCase) {
  return new Date(`${getInvoiceSortDate(invoice)}T12:00:00`).getTime();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getCustomerKey(caseItem?: CaseOption | null) {
  return caseItem?.customer_id || caseItem?.customer || caseItem?.id || "";
}

function getCustomerSortValue(caseNumber?: string | null) {
  if (!caseNumber) return Number.MAX_SAFE_INTEGER;
  const match = caseNumber.match(/K-(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function getCaseSortValue(caseNumber?: string | null) {
  if (!caseNumber) return Number.MAX_SAFE_INTEGER;
  const match = caseNumber.match(/K-(\d+)-(\d+)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10) * 1000 + Number.parseInt(match[2], 10);
}

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(defaultFilters);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("id, case_number, customer, customer_id, case_description")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CaseOption[];
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, cases(id, case_number, customer, customer_id, case_description)");

      if (error) throw error;
      return (data || []) as InvoiceWithCase[];
    },
  });

  const casesById = useMemo(() => new Map((cases || []).map((caseItem) => [caseItem.id, caseItem])), [cases]);

  const availableYears = useMemo(() => {
    if (!invoices?.length) return [new Date().getFullYear()];
    const years = [...new Set(invoices.map((invoice) => new Date(invoice.created_at).getFullYear()))].sort((a, b) => b - a);
    if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
    return years;
  }, [invoices]);

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Du skal være logget ind");

      const { error } = await supabase.from("invoices").insert({
        created_by: user.id,
        case_id: form.case_id,
        invoice_number: "",
        customer: form.customer,
        description: form.description || null,
        amount: parseFloat(form.amount) || 0,
        due_date: form.due_date || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false);
      setForm(emptyForm);
      toast.success("Faktura oprettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editId) return;

      const updates: Record<string, any> = {
        case_id: editForm.case_id,
        customer: editForm.customer,
        description: editForm.description || null,
        amount: parseFloat(editForm.amount) || 0,
        due_date: editForm.due_date || null,
        status: editForm.status,
      };

      if (editForm.status === "Betalt") {
        updates.paid_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase.from("invoices").update(updates).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setEditOpen(false);
      setEditId(null);
      toast.success("Faktura opdateret");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Faktura slettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "Betalt") updates.paid_date = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status opdateret");
    },
  });

  const filteredInvoices = useMemo(() => {
    const result = (invoices || []).filter((invoice) => {
      const createdAt = new Date(invoice.created_at);
      const invoiceYear = createdAt.getFullYear();
      const invoiceMonth = createdAt.getMonth();

      const matchesYear = appliedFilters.year === "all" || invoiceYear === Number(appliedFilters.year);
      const matchesMonth = appliedFilters.month === "all" || invoiceMonth === Number(appliedFilters.month);

      return matchesYear && matchesMonth;
    });

    return result.sort((a, b) => {
      const first = getInvoiceSortTimestamp(a);
      const second = getInvoiceSortTimestamp(b);
      return sortOrder === "newest" ? second - first : first - second;
    });
  }, [appliedFilters, invoices, sortOrder]);

  const groupedInvoices = useMemo(() => {
    const grouped = new Map<
      string,
      {
        customerKey: string;
        customerLabel: string;
        customerNumberLabel: string;
        customerNumberValue: number;
        sortDate: number;
        cases: Map<
          string,
          {
            caseId: string;
            caseNumber: string;
            caseLabel: string;
            sortDate: number;
            invoices: InvoiceWithCase[];
          }
        >;
      }
    >();

    filteredInvoices.forEach((invoice) => {
      const caseData = (invoice.cases as CaseOption | null) || casesById.get(invoice.case_id);
      const customerKey = getCustomerKey(caseData) || invoice.customer || invoice.case_id;
      const customerLabel = caseData?.customer || invoice.customer || "Ukendt kunde";
      const caseNumber = caseData?.case_number || "";
      const customerNumberLabel = caseNumber.split("-").slice(0, 2).join("-");
      const caseLabel = formatCaseLabel(caseData, invoice.customer || "Sag uden navn");
      const invoiceSortDate = getInvoiceSortTimestamp(invoice);

      if (!grouped.has(customerKey)) {
        grouped.set(customerKey, {
          customerKey,
          customerLabel,
          customerNumberLabel,
          customerNumberValue: getCustomerSortValue(caseNumber),
          sortDate: invoiceSortDate,
          cases: new Map(),
        });
      }

      const customerGroup = grouped.get(customerKey)!;
      customerGroup.sortDate =
        sortOrder === "newest"
          ? Math.max(customerGroup.sortDate, invoiceSortDate)
          : Math.min(customerGroup.sortDate, invoiceSortDate);

      if (!customerGroup.cases.has(invoice.case_id)) {
        customerGroup.cases.set(invoice.case_id, {
          caseId: invoice.case_id,
          caseNumber,
          caseLabel,
          sortDate: invoiceSortDate,
          invoices: [],
        });
      }

      const caseGroup = customerGroup.cases.get(invoice.case_id)!;
      caseGroup.sortDate =
        sortOrder === "newest"
          ? Math.max(caseGroup.sortDate, invoiceSortDate)
          : Math.min(caseGroup.sortDate, invoiceSortDate);
      caseGroup.invoices.push(invoice);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        if (a.sortDate !== b.sortDate) {
          return sortOrder === "newest" ? b.sortDate - a.sortDate : a.sortDate - b.sortDate;
        }

        if (a.customerNumberValue !== b.customerNumberValue) return a.customerNumberValue - b.customerNumberValue;
        return collator.compare(a.customerLabel, b.customerLabel);
      })
      .map((customerGroup) => ({
        ...customerGroup,
        cases: Array.from(customerGroup.cases.values()).sort((a, b) => {
          if (a.sortDate !== b.sortDate) {
            return sortOrder === "newest" ? b.sortDate - a.sortDate : a.sortDate - b.sortDate;
          }

          return getCaseSortValue(a.caseNumber) - getCaseSortValue(b.caseNumber);
        }),
      }));
  }, [casesById, filteredInvoices, sortOrder]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { name: string; amount: number; sortValue: number }>();
    const selectedYear = appliedFilters.year !== "all" ? Number(appliedFilters.year) : null;
    const selectedMonth = appliedFilters.month !== "all" ? Number(appliedFilters.month) : null;

    if (selectedYear !== null && selectedMonth !== null) {
      const totalDays = getDaysInMonth(selectedYear, selectedMonth);

      for (let day = 1; day <= totalDays; day += 1) {
        const date = new Date(selectedYear, selectedMonth, day);
        const key = `${selectedYear}-${selectedMonth}-${day}`;
        grouped.set(key, {
          name: String(day),
          amount: 0,
          sortValue: date.getTime(),
        });
      }

      filteredInvoices.forEach((invoice) => {
        const sortDate = new Date(`${getInvoiceSortDate(invoice)}T12:00:00`);
        if (sortDate.getFullYear() !== selectedYear || sortDate.getMonth() !== selectedMonth) return;

        const key = `${selectedYear}-${selectedMonth}-${sortDate.getDate()}`;
        const current = grouped.get(key);
        if (!current) return;

        grouped.set(key, {
          ...current,
          amount: current.amount + (Number(invoice.amount) || 0),
        });
      });
    } else if (selectedYear !== null) {
      for (let month = 0; month < 12; month += 1) {
        const date = new Date(selectedYear, month, 1);
        const key = `${selectedYear}-${month}`;
        grouped.set(key, {
          name: MONTHS[month],
          amount: 0,
          sortValue: date.getTime(),
        });
      }

      filteredInvoices.forEach((invoice) => {
        const sortDate = new Date(`${getInvoiceSortDate(invoice)}T12:00:00`);
        if (sortDate.getFullYear() !== selectedYear) return;

        const key = `${selectedYear}-${sortDate.getMonth()}`;
        const current = grouped.get(key);
        if (!current) return;

        grouped.set(key, {
          ...current,
          amount: current.amount + (Number(invoice.amount) || 0),
        });
      });
    } else {
      filteredInvoices.forEach((invoice) => {
        const sortDate = new Date(`${getInvoiceSortDate(invoice)}T12:00:00`);
        const amount = Number(invoice.amount) || 0;
        const key = `${sortDate.getFullYear()}-${sortDate.getMonth()}`;
        const current = grouped.get(key);

        grouped.set(key, {
          name: `${MONTHS[sortDate.getMonth()]} ${sortDate.getFullYear()}`,
          amount: (current?.amount || 0) + amount,
          sortValue: new Date(sortDate.getFullYear(), sortDate.getMonth(), 1).getTime(),
        });
      });
    }

    return Array.from(grouped.values()).sort((a, b) => a.sortValue - b.sortValue);
  }, [appliedFilters.month, appliedFilters.year, filteredInvoices]);

  const periodSummary = useMemo(() => {
    if (appliedFilters.year === "all" && appliedFilters.month === "all") return "Alle fakturaer";
    if (appliedFilters.month !== "all" && appliedFilters.year === "all") return `${MONTHS[Number(appliedFilters.month)]} · alle år`;
    if (appliedFilters.month !== "all") return `${MONTHS[Number(appliedFilters.month)]} ${appliedFilters.year}`;
    return appliedFilters.year;
  }, [appliedFilters]);

  const periodTotals = useMemo(() => {
    const byStatus = statuses.reduce(
      (acc, status) => {
        const items = filteredInvoices.filter((invoice) => invoice.status === status);
        acc[status] = {
          count: items.length,
          amount: items.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
        };
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

    return {
      count: filteredInvoices.length,
      totalAmount: filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
      byStatus,
    };
  }, [filteredInvoices]);

  const hasPendingChanges = draftFilters.year !== appliedFilters.year || draftFilters.month !== appliedFilters.month;

  const applySearch = () => {
    setAppliedFilters(draftFilters);
    setExpandedCustomers({});
    setExpandedCases({});
  };

  const resetAllFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setExpandedCustomers({});
    setExpandedCases({});
  };

  const handleCaseSelect = (caseId: string, isEdit = false) => {
    const selectedCase = cases?.find((caseItem) => caseItem.id === caseId);
    const customer = selectedCase?.customer || "";

    if (isEdit) {
      setEditForm((current) => ({ ...current, case_id: caseId, customer }));
      return;
    }

    setForm((current) => ({ ...current, case_id: caseId, customer }));
  };

  const openEdit = (invoice: InvoiceWithCase) => {
    setEditId(invoice.id);
    setEditForm({
      case_id: invoice.case_id,
      invoice_number: invoice.invoice_number,
      customer: invoice.customer,
      description: invoice.description || "",
      amount: String(invoice.amount),
      due_date: invoice.due_date || "",
      status: invoice.status,
    });
    setEditOpen(true);
  };

  const toggleCustomer = (customerKey: string) => {
    setExpandedCustomers((prev) => ({ ...prev, [customerKey]: !prev[customerKey] }));
  };

  const toggleCase = (caseId: string) => {
    setExpandedCases((prev) => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  return (
    <div>
      <PageHeader title="Fakturaer & Ordrer" description={`${invoices?.length || 0} fakturaer`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-card">
              <Plus size={16} /> Ny faktura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">Opret faktura</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createInvoice.mutate(); }} className="space-y-4">
              <CustomerCaseSelect
                cases={cases || []}
                value={form.case_id}
                onChange={(caseId) => handleCaseSelect(caseId)}
                required
                customerPlaceholder="Vælg kunde..."
                casePlaceholder="Vælg sagsnummer..."
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fakturanummer</Label>
                  <Input value="Tildeles automatisk" readOnly className="mt-1.5 rounded-xl bg-muted/40 text-muted-foreground" />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beløb (DKK)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1.5 rounded-xl" required />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kunde</Label>
                <Input value={form.customer} readOnly className="mt-1.5 rounded-xl bg-muted/40 text-muted-foreground" required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forfaldsdato</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beskrivelse</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createInvoice.isPending} className="rounded-xl shadow-card">
                  {createInvoice.isPending ? "Opretter..." : "Gem faktura"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Rediger faktura</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateInvoice.mutate(); }} className="space-y-4">
            <CustomerCaseSelect
              cases={cases || []}
              value={editForm.case_id}
              onChange={(caseId) => handleCaseSelect(caseId, true)}
              required
              customerPlaceholder="Vælg kunde..."
              casePlaceholder="Vælg sagsnummer..."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fakturanummer</Label>
                <Input value={editForm.invoice_number} readOnly className="mt-1.5 rounded-xl bg-muted/40 text-muted-foreground" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1">
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beløb (DKK)</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} placeholder="0.00" className="mt-1.5 rounded-xl" required />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kunde</Label>
              <Input value={editForm.customer} readOnly className="mt-1.5 rounded-xl bg-muted/40 text-muted-foreground" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forfaldsdato</Label>
              <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beskrivelse</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1.5 rounded-xl" rows={3} />
            </div>
            <div className="flex justify-between pt-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => {
                  if (editId && confirm("Er du sikker på du vil slette denne faktura?")) {
                    deleteInvoice.mutate(editId);
                    setEditOpen(false);
                  }
                }}
              >
                <Trash2 size={14} /> Slet
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={updateInvoice.isPending} className="rounded-xl shadow-card">
                  {updateInvoice.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Graf</p>
            <h3 className="mt-1 font-heading text-lg font-bold text-card-foreground">Fakturakurve</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {appliedFilters.year !== "all" && appliedFilters.month !== "all"
                ? "Udvikling dag for dag i den valgte måned"
                : appliedFilters.year !== "all"
                  ? "Udvikling måned for måned i det valgte år"
                  : "Udvikling måned for måned for alle fakturaer"}
            </p>
          </div>
        </div>

        <div className="h-[220px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={appliedFilters.month !== "all" ? 10 : 20}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value) => `${Number(value).toLocaleString("da-DK")}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(Number(value)), "Beløb"]}
                  labelFormatter={(label) =>
                    appliedFilters.year !== "all" && appliedFilters.month !== "all"
                      ? `${label}. ${MONTHS[Number(appliedFilters.month)]} ${appliedFilters.year}`
                      : label
                  }
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  connectNulls
                  dot={{ r: 2, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl bg-muted/20 text-sm text-muted-foreground">
              Ingen data at vise i grafen endnu
            </div>
          )}
        </div>
      </motion.section>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Faktureret", value: formatCurrency(periodTotals.totalAmount), meta: `${periodTotals.count} fakturaer`, icon: Receipt, tone: "text-card-foreground" },
          { label: "Sendt", value: formatCurrency(periodTotals.byStatus.Sendt.amount), meta: `${periodTotals.byStatus.Sendt.count} fakturaer`, icon: TrendingUp, tone: "text-info" },
          { label: "Betalt", value: formatCurrency(periodTotals.byStatus.Betalt.amount), meta: `${periodTotals.byStatus.Betalt.count} fakturaer`, icon: CheckCircle2, tone: "text-success" },
          { label: "Aktiv visning", value: periodSummary, meta: sortOrder === "newest" ? "Nyeste først" : "Ældste først", icon: sortOrder === "newest" ? ArrowDownAZ : ArrowUpAZ, tone: "text-primary" },
        ].map((card) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-2xl bg-muted ${card.tone}`}>
                <card.icon size={15} />
              </div>
            </div>
            <p className={`font-heading text-2xl font-bold tracking-tight ${card.tone}`}>{card.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{card.meta}</p>
          </motion.div>
        ))}
      </div>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <CalendarDays size={16} />
            </div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-card-foreground">Søg enkelt i fakturaer</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Vælg år og måned, tryk på <span className="font-semibold text-foreground">Søg</span>, og behold sortering separat.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Viser</p>
            <p className="mt-1 font-heading text-base font-bold text-card-foreground">{periodSummary}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{periodTotals.count} fakturaer · {sortOrder === "newest" ? "nyeste først" : "ældste først"}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-2xl border border-border bg-muted/15 p-3.5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">År</Label>
                <Select value={draftFilters.year} onValueChange={(value) => setDraftFilters((current) => ({ ...current, year: value }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle år</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Måned</Label>
                <Select value={draftFilters.month} onValueChange={(value) => setDraftFilters((current) => ({ ...current, month: value }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle måneder</SelectItem>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">Resultatet opdateres først, når du trykker på Søg</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hasPendingChanges ? "Du har ændret filtrene." : "Du ser de aktive resultater."}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" size="sm" variant="outline" className="h-10 rounded-xl px-4" onClick={resetAllFilters}>
                  Nulstil
                </Button>
                <Button type="button" size="sm" className="h-10 rounded-xl px-4 shadow-card" onClick={applySearch}>
                  <Search size={15} /> Søg
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sortering</p>
            <div className="mt-2.5 flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                variant={sortOrder === "newest" ? "default" : "outline"}
                className="justify-start rounded-xl"
                onClick={() => setSortOrder("newest")}
              >
                <ArrowDownAZ size={15} /> Nyeste først
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortOrder === "oldest" ? "default" : "outline"}
                className="justify-start rounded-xl"
                onClick={() => setSortOrder("oldest")}
              >
                <ArrowUpAZ size={15} /> Ældste først
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="mb-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <p className="text-sm font-medium text-card-foreground">Resultater for: {periodSummary}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Sortering: {sortOrder === "newest" ? "nyeste først" : "ældste først"}.</p>
      </div>

      <div className="space-y-2.5">
        {isLoading && [1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-4">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-56 rounded bg-muted" />
            </div>
          </div>
        ))}

        {groupedInvoices.map((customerGroup, customerIndex) => {
          const customerInvoiceCount = customerGroup.cases.reduce((sum, caseGroup) => sum + caseGroup.invoices.length, 0);
          const isCustomerExpanded = !!expandedCustomers[customerGroup.customerKey];

          return (
            <motion.div
              key={customerGroup.customerKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: customerIndex * 0.02 }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
                    <Building2 size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">
                      {customerGroup.customerNumberLabel ? `${customerGroup.customerNumberLabel} · ${customerGroup.customerLabel}` : customerGroup.customerLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customerInvoiceCount} {customerInvoiceCount === 1 ? "faktura" : "fakturaer"} fordelt på {customerGroup.cases.length} {customerGroup.cases.length === 1 ? "sag" : "sager"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isCustomerExpanded ? "secondary" : "outline"}
                  className="gap-2 rounded-xl"
                  onClick={() => toggleCustomer(customerGroup.customerKey)}
                >
                  <Briefcase size={14} />
                  {isCustomerExpanded ? "Skjul sager" : "Vis sager"}
                </Button>
              </div>

              {isCustomerExpanded && (
                <div className="border-t border-border bg-muted/10 px-4 py-3">
                  <div className="space-y-2.5">
                    {customerGroup.cases.map((caseGroup) => {
                      const caseAmount = caseGroup.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
                      const isCaseExpanded = !!expandedCases[caseGroup.caseId];

                      return (
                        <div key={caseGroup.caseId} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                          <div className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                                <Briefcase size={14} className="text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-card-foreground">{caseGroup.caseNumber || "Uden sagsnummer"}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{caseGroup.caseLabel}</p>
                              </div>
                            </div>

                            <div className="flex flex-col items-start gap-2 lg:items-end">
                              <div className="text-left lg:text-right">
                                <p className="text-sm font-semibold text-card-foreground">{caseAmount.toLocaleString("da-DK")} kr</p>
                                <p className="text-[11px] text-muted-foreground">{caseGroup.invoices.length} {caseGroup.invoices.length === 1 ? "faktura" : "fakturaer"}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={isCaseExpanded ? "secondary" : "outline"}
                                className="gap-2 rounded-xl"
                                onClick={() => toggleCase(caseGroup.caseId)}
                              >
                                <Receipt size={13} />
                                {isCaseExpanded ? "Skjul fakturaer" : `Vis fakturaer (${caseGroup.invoices.length})`}
                              </Button>
                            </div>
                          </div>

                          {isCaseExpanded && (
                            <div className="border-t border-border bg-muted/10 p-2.5">
                              <div className="space-y-2">
                                {caseGroup.invoices.map((invoice) => {
                                  const config = statusConfig[invoice.status] || statusConfig.Udkast;
                                  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== "Betalt";

                                  return (
                                    <div key={invoice.id} className={`rounded-xl border bg-card p-3 ${isOverdue ? "border-destructive/30" : "border-border"}`}>
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                                            <Receipt size={14} className="text-primary" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="font-heading text-sm font-bold text-card-foreground">{invoice.invoice_number}</p>
                                              {isOverdue && <span className="text-[10px] font-bold uppercase text-destructive">Forfalden</span>}
                                            </div>
                                            {invoice.description && <p className="mt-1 text-xs text-muted-foreground">{invoice.description}</p>}
                                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                              <span>Oprettet: {formatDanishDate(getCreatedDate(invoice))}</span>
                                              {invoice.due_date && <span>Forfald: {formatDanishDate(invoice.due_date)}</span>}
                                              {invoice.paid_date && <span>Betalt: {formatDanishDate(invoice.paid_date)}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-2.5">
                                          <div className="text-left lg:text-right">
                                            <p className="font-heading text-sm font-bold text-card-foreground">{Number(invoice.amount).toLocaleString("da-DK")} kr</p>
                                          </div>
                                          {role === "admin" ? (
                                            <div className="flex items-center gap-2">
                                              <select
                                                value={invoice.status}
                                                onChange={(e) => updateStatus.mutate({ id: invoice.id, status: e.target.value })}
                                                className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none ${config.className}`}
                                              >
                                                {statuses.map((status) => (
                                                  <option key={status} value={status}>{status}</option>
                                                ))}
                                              </select>
                                              <button
                                                onClick={() => openEdit(invoice)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                              >
                                                <Pencil size={14} />
                                              </button>
                                            </div>
                                          ) : (
                                            <Badge variant={config.variant} className={config.className}>{invoice.status}</Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {!isLoading && groupedInvoices.length === 0 && (
          <div className="py-16 text-center">
            <Receipt size={32} className="mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">Ingen fakturaer fundet for den valgte periode</p>
          </div>
        )}
      </div>
    </div>
  );
}
