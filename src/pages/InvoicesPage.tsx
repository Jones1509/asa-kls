import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, Search, DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: any }> = {
  Udkast: { color: "bg-muted text-muted-foreground", icon: Clock },
  Sendt: { color: "bg-info/10 text-info border border-info/20", icon: Receipt },
  Betalt: { color: "bg-success/10 text-success border border-success/20", icon: CheckCircle2 },
  Forfalden: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
};

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [form, setForm] = useState({ case_id: "", invoice_number: "", customer: "", description: "", amount: "", due_date: "" });

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
      const { data } = await supabase.from("invoices").select("*, cases(case_number)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").insert({
        created_by: user!.id,
        case_id: form.case_id,
        invoice_number: form.invoice_number,
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
      setForm({ case_id: "", invoice_number: "", customer: "", description: "", amount: "", due_date: "" });
      toast.success("Faktura oprettet");
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

  const handleCaseSelect = (caseId: string) => {
    const c = cases?.find(c => c.id === caseId);
    setForm({ ...form, case_id: caseId, customer: c?.customer || form.customer });
  };

  return (
    <div>
      <PageHeader title="Fakturaer & Ordrer" description={`${invoices?.length || 0} fakturaer`}>
        {role === "admin" && (
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
                    {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number} – {c.customer}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fakturanummer</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="FA-001" className="mt-1.5 rounded-xl" required /></div>
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
        )}
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total faktureret", value: `${totalAmount.toLocaleString("da-DK")} DKK`, icon: Receipt, bg: "bg-primary/10", color: "text-primary" },
          { label: "Betalt", value: `${paidAmount.toLocaleString("da-DK")} DKK`, icon: CheckCircle2, bg: "bg-success/10", color: "text-success" },
          { label: "Udestående", value: `${pendingAmount.toLocaleString("da-DK")} DKK`, icon: Clock, bg: "bg-warning/10", color: "text-warning" },
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
                      <p className="text-sm font-semibold text-card-foreground">{inv.invoice_number}</p>
                      {isOverdue && <span className="text-[10px] font-bold text-destructive uppercase">Forfalden</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.customer} · Sag {(inv.cases as any)?.case_number || "–"}</p>
                    {inv.description && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{inv.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-heading font-bold text-card-foreground">{Number(inv.amount).toLocaleString("da-DK")} DKK</p>
                    {inv.due_date && <p className="text-[11px] text-muted-foreground">Forfald: {inv.due_date}</p>}
                  </div>
                  {role === "admin" ? (
                    <select
                      value={inv.status}
                      onChange={(e) => updateStatus.mutate({ id: inv.id, status: e.target.value })}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border-0 outline-none cursor-pointer ${config.color}`}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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
