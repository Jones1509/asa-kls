import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const statusConfig: Record<string, { className: string; icon: any; variant: "secondary" | "destructive" | "outline" | "default" }> = {
  Udkast: { className: "bg-muted text-muted-foreground", icon: Clock, variant: "secondary" },
  Sendt: { className: "bg-info/10 text-info border border-info/20", icon: Receipt, variant: "outline" },
  Betalt: { className: "bg-success/10 text-success border border-success/20", icon: CheckCircle2, variant: "outline" },
  Forfalden: { className: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle, variant: "destructive" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
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

function formatDanishDate(dateString?: string | null) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return danishDateFormatter.format(date);
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-elevated text-xs">
      <p className="mb-1.5 font-semibold text-card-foreground">{label}</p>
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2">
          <div className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold text-card-foreground">{Number(item.value).toLocaleString("da-DK")} kr</span>
        </div>
      ))}
    </div>
  );
};

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
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

  const monthlyData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const monthInvoices = (invoices || []).filter((invoice) => {
        const date = new Date(invoice.created_at);
        return date.getFullYear() === selectedYear && date.getMonth() === index;
      });

      const betalt = monthInvoices.filter((invoice) => invoice.status === "Betalt").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
      const udestående = monthInvoices.filter((invoice) => invoice.status !== "Betalt").reduce((sum, invoice) => sum + Number(invoice.amount), 0);

      return { month, Betalt: betalt, Udestående: udestående };
    });
  }, [invoices, selectedYear]);

  const yearTotals = useMemo(() => {
    const yearInvoices = (invoices || []).filter((invoice) => new Date(invoice.created_at).getFullYear() === selectedYear);
    const total = yearInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const betalt = yearInvoices.filter((invoice) => invoice.status === "Betalt").reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    return {
      total,
      betalt,
      udestående: total - betalt,
      count: yearInvoices.length,
    };
  }, [invoices, selectedYear]);

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
    const searchValue = search.toLowerCase().trim();

    return (invoices || []).filter((invoice) => {
      const caseData = (invoice.cases as CaseOption | null) || casesById.get(invoice.case_id);
      const caseLabel = formatCaseLabel(caseData, "").toLowerCase();
      const matchSearch =
        !searchValue ||
        (invoice.invoice_number || "").toLowerCase().includes(searchValue) ||
        (invoice.customer || "").toLowerCase().includes(searchValue) ||
        caseLabel.includes(searchValue) ||
        (invoice.description || "").toLowerCase().includes(searchValue);
      const matchStatus = statusFilter === "alle" || invoice.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [casesById, invoices, search, statusFilter]);

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

  const totals = useMemo(() => {
    const totalAmount = (invoices || []).reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const paidAmount = (invoices || []).filter((invoice) => invoice.status === "Betalt").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    return { totalAmount, paidAmount, pendingAmount: totalAmount - paidAmount };
  }, [invoices]);

  const hasSearch = search.trim().length > 0;

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
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
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
                <Button type="submit" disabled={createInvoice.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
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
                <Button type="submit" disabled={updateInvoice.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {updateInvoice.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total faktureret", value: `${totals.totalAmount.toLocaleString("da-DK")} kr`, icon: Receipt, bg: "bg-primary/10", color: "text-primary" },
          { label: "Betalt", value: `${totals.paidAmount.toLocaleString("da-DK")} kr`, icon: CheckCircle2, bg: "bg-success/10", color: "text-success" },
          { label: "Udestående", value: `${totals.pendingAmount.toLocaleString("da-DK")} kr`, icon: Clock, bg: "bg-warning/10", color: "text-warning" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
            <p className="font-heading text-xl font-bold text-card-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-card-foreground">Omsætningsanalyse</p>
              <p className="text-xs text-muted-foreground">{yearTotals.count} fakturaer · {yearTotals.betalt.toLocaleString("da-DK")} kr betalt</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${selectedYear === year ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Faktureret", value: yearTotals.total, color: "text-card-foreground" },
            { label: "Betalt ind", value: yearTotals.betalt, color: "text-success" },
            { label: "Udestående", value: yearTotals.udestående, color: "text-warning" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-muted/30 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className={`font-heading text-base font-bold ${stat.color}`}>{stat.value.toLocaleString("da-DK")} kr</p>
            </div>
          ))}
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barSize={14} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 6 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Bar dataKey="Betalt" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Udestående" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg på fakturanummer, kunde eller sag..." className="h-11 rounded-xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {["alle", ...statuses].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === status ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {status === "alle" ? "Alle" : status}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <p className="text-sm font-medium text-card-foreground">Fakturaer vises nu i rækkefølgen kunde → sagsnummer → faktura.</p>
        <p className="mt-1 text-xs text-muted-foreground">Vælg først kunde, derefter sag, og se til sidst kun de fakturaer der hører til den specifikke sag.</p>
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

        {groupedInvoices.map((customerGroup, customerIndex) => {
          const customerInvoiceCount = customerGroup.cases.reduce((sum, caseGroup) => sum + caseGroup.invoices.length, 0);
          const isCustomerExpanded = hasSearch || !!expandedCustomers[customerGroup.customerKey];

          return (
            <motion.div
              key={customerGroup.customerKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: customerIndex * 0.03 }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="border-b border-border bg-muted/20 px-5 py-2.5">
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

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {customerGroup.cases.length} {customerGroup.cases.length === 1 ? "sag" : "sager"}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCustomerExpanded ? "secondary" : "default"}
                      className="gap-2 rounded-xl"
                      onClick={() => toggleCustomer(customerGroup.customerKey)}
                    >
                      <Briefcase size={14} />
                      {isCustomerExpanded ? "Skjul sager" : "Vis sager"}
                    </Button>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">Først kunde, derefter sag og til sidst fakturaer.</p>
                </div>
              </div>

              {isCustomerExpanded && (
                <div className="border-t border-border bg-muted/10 px-5 py-4">
                  <div className="space-y-3">
                    {customerGroup.cases.map((caseGroup) => {
                      const caseAmount = caseGroup.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
                      const isCaseExpanded = hasSearch || !!expandedCases[caseGroup.caseId];

                      return (
                        <div key={caseGroup.caseId} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                          <div className="border-b border-border bg-muted/20 px-4 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sag</p>
                          </div>

                          <div className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                  <div className="text-right">
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
                            </div>
                          </div>

                          {isCaseExpanded && (
                            <div className="border-t border-border bg-muted/10 p-3">
                              <div className="mb-3 rounded-xl border border-border bg-card px-4 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fakturaer</p>
                                <p className="mt-1 text-xs text-muted-foreground">Her vises kun fakturaer knyttet til den valgte sag.</p>
                              </div>

                              <div className="space-y-3">
                                {caseGroup.invoices.map((invoice) => {
                                  const config = statusConfig[invoice.status] || statusConfig.Udkast;
                                  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== "Betalt";

                                  return (
                                    <div key={invoice.id} className={`rounded-xl border bg-card p-4 transition-all ${isOverdue ? "border-destructive/30" : "border-border"}`}>
                                      <div className="flex items-start justify-between gap-4">
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
                                            {invoice.due_date && <p className="mt-1 text-[11px] text-muted-foreground">Forfald: {formatDanishDate(invoice.due_date)}</p>}
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                          <div className="text-right">
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
            <p className="text-sm font-medium text-muted-foreground">Ingen fakturaer fundet</p>
          </div>
        )}
      </div>
    </div>
  );
}
