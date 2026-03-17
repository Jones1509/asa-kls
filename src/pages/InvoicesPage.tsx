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

type FilterMode = "all" | "year" | "month" | "week" | "recentWeeks";

type SearchFilters = {
  mode: FilterMode;
  year: string;
  month: string;
  week: string;
  recentWeeks: string;
  status: string;
  search: string;
};

const defaultFilters: SearchFilters = {
  mode: "all",
  year: String(new Date().getFullYear()),
  month: "all",
  week: "all",
  recentWeeks: "4",
  status: "alle",
  search: "",
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

function getWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getIsoWeekRange(year: number, week: number) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + (week - 1) * 7);

  const start = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekOptionLabel(year: number, week: number) {
  const { start, end } = getIsoWeekRange(year, week);
  return `Uge ${week} · ${danishDateFormatter.format(start)} – ${danishDateFormatter.format(end)}`;
}

function getMonthWeekOptions(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startWeek = getWeekNumber(firstDay);
  const endWeek = getWeekNumber(lastDay);
  const maxWeek = getWeekNumber(new Date(year, 11, 28));

  const weeks: { value: string; label: string }[] = [];
  for (let week = startWeek; week <= Math.min(endWeek, maxWeek); week += 1) {
    weeks.push({ value: String(week), label: getWeekOptionLabel(year, week) });
  }

  return weeks;
}

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(defaultFilters);
  const [hasSearched, setHasSearched] = useState(false);

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
      return ((data || []) as InvoiceWithCase[]).sort((a, b) => collator.compare(a.invoice_number ?? "", b.invoice_number ?? ""));
    },
  });

  const casesById = useMemo(() => new Map((cases || []).map((caseItem) => [caseItem.id, caseItem])), [cases]);

  const availableYears = useMemo(() => {
    if (!invoices?.length) return [new Date().getFullYear()];
    const years = [...new Set(invoices.map((invoice) => new Date(invoice.created_at).getFullYear()))].sort((a, b) => b - a);
    if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
    return years;
  }, [invoices]);

  const availableWeeksForMonth = useMemo(() => {
    if (draftFilters.month === "all") return [];
    return getMonthWeekOptions(Number(draftFilters.year), Number(draftFilters.month));
  }, [draftFilters.month, draftFilters.year]);

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
    if (!hasSearched) return [];

    const searchValue = appliedFilters.search.toLowerCase().trim();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return (invoices || []).filter((invoice) => {
      const createdAt = new Date(invoice.created_at);
      const invoiceYear = createdAt.getFullYear();
      const invoiceMonth = createdAt.getMonth();
      const invoiceWeek = getWeekNumber(createdAt);

      let matchesPeriod = true;

      if (appliedFilters.mode === "year") {
        matchesPeriod = invoiceYear === Number(appliedFilters.year);
      }

      if (appliedFilters.mode === "month") {
        matchesPeriod =
          invoiceYear === Number(appliedFilters.year) &&
          invoiceMonth === Number(appliedFilters.month) &&
          (appliedFilters.week === "all" || invoiceWeek === Number(appliedFilters.week));
      }

      if (appliedFilters.mode === "week") {
        matchesPeriod = invoiceYear === Number(appliedFilters.year) && invoiceWeek === Number(appliedFilters.week);
      }

      if (appliedFilters.mode === "recentWeeks") {
        const weeks = Number(appliedFilters.recentWeeks || "1");
        const startDate = new Date(startOfToday);
        startDate.setDate(startDate.getDate() - weeks * 7);
        matchesPeriod = createdAt >= startDate && createdAt <= now;
      }

      const caseData = (invoice.cases as CaseOption | null) || casesById.get(invoice.case_id);
      const caseLabel = formatCaseLabel(caseData, "").toLowerCase();
      const matchSearch =
        !searchValue ||
        (invoice.invoice_number || "").toLowerCase().includes(searchValue) ||
        (invoice.customer || "").toLowerCase().includes(searchValue) ||
        caseLabel.includes(searchValue) ||
        (invoice.description || "").toLowerCase().includes(searchValue);
      const matchStatus = appliedFilters.status === "alle" || invoice.status === appliedFilters.status;

      return matchesPeriod && matchSearch && matchStatus;
    });
  }, [appliedFilters, casesById, hasSearched, invoices]);

  const groupedInvoices = useMemo(() => {
    const grouped = new Map<string, { customerKey: string; customerLabel: string; customerNumberLabel: string; customerNumberValue: number; cases: Map<string, { caseId: string; caseNumber: string; caseLabel: string; invoices: InvoiceWithCase[] }> }>();

    filteredInvoices.forEach((invoice) => {
      const caseData = (invoice.cases as CaseOption | null) || casesById.get(invoice.case_id);
      const customerKey = getCustomerKey(caseData) || invoice.customer || invoice.case_id;
      const customerLabel = caseData?.customer || invoice.customer || "Ukendt kunde";
      const caseNumber = caseData?.case_number || "";
      const customerNumberLabel = caseNumber.split("-").slice(0, 2).join("-");
      const caseLabel = formatCaseLabel(caseData, invoice.customer || "Sag uden navn");

      if (!grouped.has(customerKey)) {
        grouped.set(customerKey, {
          customerKey,
          customerLabel,
          customerNumberLabel,
          customerNumberValue: getCustomerSortValue(caseNumber),
          cases: new Map(),
        });
      }

      const customerGroup = grouped.get(customerKey)!;
      if (!customerGroup.cases.has(invoice.case_id)) {
        customerGroup.cases.set(invoice.case_id, {
          caseId: invoice.case_id,
          caseNumber,
          caseLabel,
          invoices: [],
        });
      }

      customerGroup.cases.get(invoice.case_id)!.invoices.push(invoice);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        if (a.customerNumberValue !== b.customerNumberValue) return a.customerNumberValue - b.customerNumberValue;
        return collator.compare(a.customerLabel, b.customerLabel);
      })
      .map((customerGroup) => ({
        ...customerGroup,
        cases: Array.from(customerGroup.cases.values())
          .map((caseGroup) => ({
            ...caseGroup,
            invoices: caseGroup.invoices.sort((a, b) => collator.compare(a.invoice_number || "", b.invoice_number || "")),
          }))
          .sort((a, b) => getCaseSortValue(a.caseNumber) - getCaseSortValue(b.caseNumber)),
      }));
  }, [casesById, filteredInvoices]);

  const periodSummary = useMemo(() => {
    if (!hasSearched) return "Ingen søgning endnu";

    if (appliedFilters.mode === "all") return "Alle fakturaer";
    if (appliedFilters.mode === "year") return `Alle fakturaer fra ${appliedFilters.year}`;
    if (appliedFilters.mode === "month") {
      const monthLabel = appliedFilters.month === "all" ? "alle måneder" : MONTHS[Number(appliedFilters.month)];
      if (appliedFilters.week !== "all") return getWeekOptionLabel(Number(appliedFilters.year), Number(appliedFilters.week));
      return `${monthLabel} ${appliedFilters.year}`;
    }
    if (appliedFilters.mode === "week") return getWeekOptionLabel(Number(appliedFilters.year), Number(appliedFilters.week));
    return `Seneste ${appliedFilters.recentWeeks} uger`;
  }, [appliedFilters, hasSearched]);

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

    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    return {
      count: filteredInvoices.length,
      totalAmount,
      pendingAmount: totalAmount - byStatus.Betalt.amount,
      byStatus,
    };
  }, [filteredInvoices]);

  const hasSearchTerm = appliedFilters.search.trim().length > 0;

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

  const applySearch = () => {
    setAppliedFilters(draftFilters);
    setHasSearched(true);
    setExpandedCustomers({});
    setExpandedCases({});
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

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <CalendarDays size={18} />
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-card-foreground">Søg præcist på den periode du vil se</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Vælg år, måned, uge eller seneste 1-4 uger. Først når du trykker <span className="font-semibold text-foreground">Søg</span>, bliver fakturaerne vist.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Viser</p>
            <p className="mt-1 font-heading text-lg font-bold text-card-foreground">{periodSummary}</p>
            <p className="mt-1 text-xs text-muted-foreground">{periodTotals.count} fakturaer</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-muted/15 p-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Visning</Label>
            <Select
              value={draftFilters.mode}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  mode: value as FilterMode,
                  week: value === "month" ? current.week : value === "week" ? current.week : "all",
                }))
              }
            >
              <SelectTrigger className="rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle fakturaer</SelectItem>
                <SelectItem value="year">Kun år</SelectItem>
                <SelectItem value="month">År + måned</SelectItem>
                <SelectItem value="week">Specifik uge</SelectItem>
                <SelectItem value="recentWeeks">Seneste 1-4 uger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {draftFilters.mode !== "recentWeeks" && draftFilters.mode !== "all" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">År</Label>
              <Select value={draftFilters.year} onValueChange={(value) => setDraftFilters((current) => ({ ...current, year: value, week: "all" }))}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {draftFilters.mode === "month" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Måned</Label>
              <Select value={draftFilters.month} onValueChange={(value) => setDraftFilters((current) => ({ ...current, month: value, week: "all" }))}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={String(index)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {draftFilters.mode === "month" && draftFilters.month !== "all" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Uger i måneden</Label>
              <Select value={draftFilters.week} onValueChange={(value) => setDraftFilters((current) => ({ ...current, week: value }))}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle uger i måneden</SelectItem>
                  {availableWeeksForMonth.map((week) => (
                    <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {draftFilters.mode === "week" && (
            <div className="space-y-1.5 xl:col-span-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Uge</Label>
              <Select value={draftFilters.week === "all" ? String(getWeekNumber(new Date())) : draftFilters.week} onValueChange={(value) => setDraftFilters((current) => ({ ...current, week: value }))}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: getWeekNumber(new Date(Number(draftFilters.year), 11, 28)) }, (_, index) => {
                    const week = index + 1;
                    return (
                      <SelectItem key={week} value={String(week)}>{getWeekOptionLabel(Number(draftFilters.year), week)}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {draftFilters.mode === "recentWeeks" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Antal uger</Label>
              <Select value={draftFilters.recentWeeks} onValueChange={(value) => setDraftFilters((current) => ({ ...current, recentWeeks: value }))}>
                <SelectTrigger className="rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Seneste 1 uge</SelectItem>
                  <SelectItem value="2">Seneste 2 uger</SelectItem>
                  <SelectItem value="3">Seneste 3 uger</SelectItem>
                  <SelectItem value="4">Seneste 4 uger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={draftFilters.status} onValueChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}>
              <SelectTrigger className="rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle statusser</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Søgning</Label>
            <Search size={16} className="absolute left-3.5 top-[calc(50%+10px)] -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Fakturanummer, kunde eller sag"
              className="h-11 rounded-xl bg-background pl-10"
              value={draftFilters.search}
              onChange={(e) => setDraftFilters((current) => ({ ...current, search: e.target.value }))}
            />
          </div>
          <Button onClick={applySearch} className="h-11 rounded-xl px-6 shadow-card">
            Søg
          </Button>
        </div>
      </motion.section>

      {hasSearched && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Faktureret", value: formatCurrency(periodTotals.totalAmount), meta: `${periodTotals.count} fakturaer`, icon: Receipt, tone: "text-card-foreground" },
              { label: "Sendt", value: formatCurrency(periodTotals.byStatus.Sendt.amount), meta: `${periodTotals.byStatus.Sendt.count} fakturaer`, icon: TrendingUp, tone: "text-info" },
              { label: "Betalt", value: formatCurrency(periodTotals.byStatus.Betalt.amount), meta: `${periodTotals.byStatus.Betalt.count} fakturaer`, icon: CheckCircle2, tone: "text-success" },
              { label: "Mangler opfølgning", value: formatCurrency(periodTotals.pendingAmount), meta: `${periodTotals.byStatus.Forfalden.count} forfaldne`, icon: AlertCircle, tone: "text-warning" },
            ].map((card) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-muted ${card.tone}`}>
                    <card.icon size={18} />
                  </div>
                </div>
                <p className={`font-heading text-3xl font-bold tracking-tight ${card.tone}`}>{card.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{card.meta}</p>
              </motion.div>
            ))}
          </div>

          <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-sm font-medium text-card-foreground">Resultater for: {periodSummary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {appliedFilters.status !== "alle" ? `Status: ${appliedFilters.status}. ` : ""}
              {hasSearchTerm ? `Søgning: ${appliedFilters.search}.` : "Ingen ekstra søgetekst valgt."}
            </p>
          </div>
        </>
      )}

      {!hasSearched && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
          <CalendarDays size={28} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-heading text-lg font-bold text-card-foreground">Vælg dine filtre og tryk Søg</p>
          <p className="mt-2 text-sm text-muted-foreground">Så viser jeg kun de fakturaer der passer til den periode du vælger.</p>
        </div>
      )}

      {hasSearched && (
        <div className="space-y-3">
          {isLoading && [1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-5">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-56 rounded bg-muted" />
              </div>
            </div>
          ))}

          {groupedInvoices.map((customerGroup, customerIndex) => {
            const customerInvoiceCount = customerGroup.cases.reduce((sum, caseGroup) => sum + caseGroup.invoices.length, 0);
            const isCustomerExpanded = hasSearchTerm || !!expandedCustomers[customerGroup.customerKey];

            return (
              <motion.div
                key={customerGroup.customerKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: customerIndex * 0.03 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="border-b border-border bg-muted/20 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kunde</p>
                </div>

                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">{customerGroup.customerNumberLabel ? `${customerGroup.customerNumberLabel} · ${customerGroup.customerLabel}` : customerGroup.customerLabel}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{customerInvoiceCount} {customerInvoiceCount === 1 ? "faktura" : "fakturaer"} fordelt på {customerGroup.cases.length} {customerGroup.cases.length === 1 ? "sag" : "sager"}</p>
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
                  <div className="border-t border-border bg-muted/10 px-5 py-4">
                    <div className="space-y-3">
                      {customerGroup.cases.map((caseGroup) => {
                        const caseAmount = caseGroup.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
                        const isCaseExpanded = hasSearchTerm || !!expandedCases[caseGroup.caseId];

                        return (
                          <div key={caseGroup.caseId} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                  <Briefcase size={15} className="text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-card-foreground">{caseGroup.caseNumber || "Uden sagsnummer"}</p>
                                  <p className="mt-0.5 text-sm text-muted-foreground">{caseGroup.caseLabel}</p>
                                </div>
                              </div>

                              <div className="flex flex-col items-start gap-3 lg:items-end">
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
                                  <Receipt size={14} />
                                  {isCaseExpanded ? "Skjul fakturaer" : `Vis fakturaer (${caseGroup.invoices.length})`}
                                </Button>
                              </div>
                            </div>

                            {isCaseExpanded && (
                              <div className="border-t border-border bg-muted/10 p-3">
                                <div className="space-y-3">
                                  {caseGroup.invoices.map((invoice) => {
                                    const config = statusConfig[invoice.status] || statusConfig.Udkast;
                                    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== "Betalt";

                                    return (
                                      <div key={invoice.id} className={`rounded-xl border bg-card p-4 ${isOverdue ? "border-destructive/30" : "border-border"}`}>
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                              <Receipt size={16} className="text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-heading text-base font-bold text-card-foreground">{invoice.invoice_number}</p>
                                                {isOverdue && <span className="text-[10px] font-bold uppercase text-destructive">Forfalden</span>}
                                              </div>
                                              {invoice.description && <p className="mt-1 text-sm text-muted-foreground">{invoice.description}</p>}
                                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                <span>Oprettet: {formatDanishDate(invoice.created_at.split("T")[0])}</span>
                                                {invoice.due_date && <span>Forfald: {formatDanishDate(invoice.due_date)}</span>}
                                                {invoice.paid_date && <span>Betalt: {formatDanishDate(invoice.paid_date)}</span>}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-start gap-3">
                                            <div className="text-left lg:text-right">
                                              <p className="font-heading text-base font-bold text-card-foreground">{Number(invoice.amount).toLocaleString("da-DK")} kr</p>
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
                                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <p className="text-sm font-medium text-muted-foreground">Ingen fakturaer fundet for den valgte søgning</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
