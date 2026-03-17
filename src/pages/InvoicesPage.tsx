import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, Search, CheckCircle2, Clock, AlertCircle, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const statusConfig: Record<string, { color: string; icon: any }> = {
  Udkast: { color: "bg-muted text-muted-foreground", icon: Clock },
  Sendt: { color: "bg-info/10 text-info border border-info/20", icon: Receipt },
  Betalt: { color: "bg-success/10 text-success border border-success/20", icon: CheckCircle2 },
  Forfalden: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-elevated text-xs">
      <p className="font-semibold text-card-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-card-foreground">{Number(p.value).toLocaleString("da-DK")} kr</span>
        </div>
      ))}
    </div>
  );
};

const emptyForm = { case_id: "", invoice_number: "", customer: "", description: "", amount: "", due_date: "", status: "Udkast" };

function getNextInvoiceNumber(invoices: any[]): string {
  if (!invoices?.length) return "1";
  const nums = invoices
    .map((inv) => {
      const match = inv.invoice_number.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
}

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number, customer");
      return data || [];
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, cases(case_number, customer)");
      return (data || []).sort((a, b) => {
        const numA = parseInt(a.invoice_number, 10);
        const numB = parseInt(b.invoice_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.invoice_number.localeCompare(b.invoice_number);
      });
    },
  });

  // Revenue analytics
  const availableYears = useMemo(() => {
    if (!invoices?.length) return [new Date().getFullYear()];
    const years = [...new Set(invoices.map(inv => new Date(inv.created_at).getFullYear()))].sort((a, b) => b - a);
    if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
    return years;
  }, [invoices]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthInvoices = (invoices || []).filter(inv => {
        const d = new Date(inv.created_at);
        return d.getFullYear() === selectedYear && d.getMonth() === idx;
      });
      const betalt = monthInvoices.filter(i => i.status === "Betalt").reduce((s, i) => s + Number(i.amount), 0);
      const udestående = monthInvoices.filter(i => i.status !== "Betalt").reduce((s, i) => s + Number(i.amount), 0);
      return { month, Betalt: betalt, Udestående: udestående };
    });
  }, [invoices, selectedYear]);

  const yearTotals = useMemo(() => {
    const yearInvoices = (invoices || []).filter(inv => new Date(inv.created_at).getFullYear() === selectedYear);
    const total = yearInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const betalt = yearInvoices.filter(i => i.status === "Betalt").reduce((s, i) => s + Number(i.amount), 0);
    return { total, betalt, udestående: total - betalt, count: yearInvoices.length };
  }, [invoices, selectedYear]);

  const createInvoice = useMutation({
    mutationFn: async () => {
      const invoiceNum = form.invoice_number.trim() || getNextInvoiceNumber(invoices || []);
      const { error } = await supabase.from("invoices").insert({
        created_by: user!.id,
        case_id: form.case_id,
        invoice_number: invoiceNum,
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
    onError: (e: any) => toast.error(e.message),
  });

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const updates: any = {
        case_id: editForm.case_id,
        invoice_number: editForm.invoice_number,
        customer: editForm.customer,
        description: editForm.description || null,
        amount: parseFloat(editForm.amount) || 0,
        due_date: editForm.due_date || null,
        status: editForm.status,
      };
      if (editForm.status === "Betalt") updates.paid_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").update(updates).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setEditOpen(false);
      setEditId(null);
      toast.success("Faktura opdateret");
    },
    onError: (e: any) => toast.error(e.message),
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
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "Betalt") updates.paid_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status opdateret");
    },
  });

  const statuses = ["Udkast", "Sendt", "Betalt", "Forfalden"];
  const filtered = invoices?.filter((inv) => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "alle" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = invoices?.reduce((s, i) => s + Number(i.amount), 0) || 0;
  const paidAmount = invoices?.filter(i => i.status === "Betalt").reduce((s, i) => s + Number(i.amount), 0) || 0;
  const pendingAmount = totalAmount - paidAmount;

  const handleCaseSelect = (caseId: string, isEdit = false) => {
    const c = cases?.find(c => c.id === caseId);
    if (isEdit) {
      setEditForm({ ...editForm, case_id: caseId, customer: c?.customer || editForm.customer });
    } else {
      setForm({ ...form, case_id: caseId, customer: c?.customer || form.customer });
    }
  };

  const openEdit = (inv: any) => {
    setEditId(inv.id);
    setEditForm({
      case_id: inv.case_id,
      invoice_number: inv.invoice_number,
      customer: inv.customer,
      description: inv.description || "",
      amount: String(inv.amount),
      due_date: inv.due_date || "",
      status: inv.status,
    });
    setEditOpen(true);
  };

  const nextNum = getNextInvoiceNumber(invoices || []);

  return (
    <div>
      <PageHeader title="Fakturaer & Ordrer" description={`${invoices?.length || 0} fakturaer`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny faktura</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Opret faktura</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createInvoice.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
                <select value={form.case_id} onChange={(e) => handleCaseSelect(e.target.value)} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{formatCaseLabel(c)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fakturanummer</Label>
                  <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder={nextNum} className="mt-1.5 rounded-xl" />
                </div>
                <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beløb (DKK)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1.5 rounded-xl" required /></div>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kunde</Label><Input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className="mt-1.5 rounded-xl" required /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Forfaldsdato</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" rows={3} /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createInvoice.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createInvoice.isPending ? "Opretter..." : "Gem faktura"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Rediger faktura</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateInvoice.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
              <select value={editForm.case_id} onChange={(e) => handleCaseSelect(e.target.value, true)} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                <option value="">Vælg sag...</option>
                {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number} – {c.customer}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fakturanummer</Label>
                <Input value={editForm.invoice_number} onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })} className="mt-1.5 rounded-xl" required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all">
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beløb (DKK)</Label><Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} placeholder="0.00" className="mt-1.5 rounded-xl" required /></div>
            </div>
            <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kunde</Label><Input value={editForm.customer} onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })} className="mt-1.5 rounded-xl" required /></div>
            <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Forfaldsdato</Label><Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1.5 rounded-xl" rows={3} /></div>
            <div className="flex justify-between pt-3">
              <Button type="button" variant="destructive" size="sm" className="rounded-xl gap-1.5" onClick={() => {
                if (editId && confirm("Er du sikker på du vil slette denne faktura?")) {
                  deleteInvoice.mutate(editId);
                  setEditOpen(false);
                }
              }}>
                <Trash2 size={14} /> Slet
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={updateInvoice.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{updateInvoice.isPending ? "Gemmer..." : "Gem ændringer"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total faktureret", value: `${totalAmount.toLocaleString("da-DK")} kr`, icon: Receipt, bg: "bg-primary/10", color: "text-primary" },
          { label: "Betalt", value: `${paidAmount.toLocaleString("da-DK")} kr`, icon: CheckCircle2, bg: "bg-success/10", color: "text-success" },
          { label: "Udestående", value: `${pendingAmount.toLocaleString("da-DK")} kr`, icon: Clock, bg: "bg-warning/10", color: "text-warning" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.bg}`}><s.icon size={18} className={s.color} /></div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
            <p className="text-xl font-heading font-bold text-card-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Analytics */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-card-foreground">Omsætningsanalyse</p>
              <p className="text-xs text-muted-foreground">{yearTotals.count} fakturaer · {yearTotals.betalt.toLocaleString("da-DK")} kr betalt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {availableYears.map(year => (
                <button key={year} onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedYear === year ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Year summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Faktureret", value: yearTotals.total, color: "text-card-foreground" },
            { label: "Betalt ind", value: yearTotals.betalt, color: "text-success" },
            { label: "Udestående", value: yearTotals.udestående, color: "text-warning" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-base font-heading font-bold ${s.color}`}>{s.value.toLocaleString("da-DK")} kr</p>
            </div>
          ))}
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barSize={14} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 6 }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Bar dataKey="Betalt" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Udestående" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg fakturaer..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {["alle", ...statuses].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "alle" ? "Alle" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice list */}
      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((inv, i) => {
          const config = statusConfig[inv.status] || statusConfig.Udkast;
          const StatusIcon = config.icon;
          const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "Betalt";

          return (
            <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border bg-card p-5 shadow-card hover:shadow-elevated transition-all ${isOverdue ? "border-destructive/30" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 flex-shrink-0">
                    <Receipt size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-card-foreground">Faktura #{inv.invoice_number}</p>
                      {isOverdue && <span className="text-[10px] font-bold text-destructive uppercase">Forfalden</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.customer} · Sag {(inv.cases as any)?.case_number || "–"}</p>
                    {inv.description && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{inv.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-heading font-bold text-card-foreground">{Number(inv.amount).toLocaleString("da-DK")} kr</p>
                    {inv.due_date && <p className="text-[11px] text-muted-foreground">Forfald: {inv.due_date}</p>}
                  </div>
                  {role === "admin" ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={inv.status}
                        onChange={(e) => updateStatus.mutate({ id: inv.id, status: e.target.value })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border-0 outline-none cursor-pointer ${config.color}`}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => openEdit(inv)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.color}`}>{inv.status}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="text-center py-16">
            <Receipt size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Ingen fakturaer fundet</p>
          </div>
        )}
      </div>
    </div>
  );
}
