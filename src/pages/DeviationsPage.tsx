import { PageHeader } from "@/components/PageHeader";
import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCaseOptions } from "@/lib/case-options";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertOctagon, Plus, Pencil, CheckCircle2, AlertTriangle, Calendar, User, Briefcase } from "lucide-react";
import { formatCaseLabel } from "@/lib/case-format";
import { format, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DeviationsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editDev, setEditDev] = useState<any>(null);
  const [form, setForm] = useState({ deviation_date: new Date().toISOString().split("T")[0], description: "", case_id: "", corrective_action: "", responsible_user_id: "", status: "Åben" });

  const { data: deviations, isLoading } = useQuery({
    queryKey: ["deviations"],
    queryFn: async () => {
      const { data } = await supabase.from("deviations").select("*, cases(case_number, customer, case_description)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          customer,
          customer_id,
          case_description,
          customers (
            customer_number
          )
        `)
        .eq("status", "Aktiv")
        .order("case_number");
      return normalizeCaseOptions(data as any[]);
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const saveDev = useMutation({
    mutationFn: async () => {
      const payload = {
        deviation_date: form.deviation_date,
        description: form.description,
        case_id: form.case_id || null,
        corrective_action: form.corrective_action || null,
        responsible_user_id: form.responsible_user_id || null,
        status: form.status,
        created_by: user!.id,
      };
      if (editDev) {
        const { error } = await supabase.from("deviations").update(payload).eq("id", editDev.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deviations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deviations"] });
      setShowForm(false);
      setEditDev(null);
      toast.success(editDev ? "Afvigelse opdateret" : "Afvigelse oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCount = deviations?.filter(d => d.status === "Åben").length || 0;
  const closedCount = deviations?.filter(d => d.status === "Lukket").length || 0;

  const openNew = (dev?: any) => {
    if (dev) {
      setEditDev(dev);
      setForm({ deviation_date: dev.deviation_date, description: dev.description, case_id: dev.case_id || "", corrective_action: dev.corrective_action || "", responsible_user_id: dev.responsible_user_id || "", status: dev.status });
    } else {
      setEditDev(null);
      setForm({ deviation_date: new Date().toISOString().split("T")[0], description: "", case_id: "", corrective_action: "", responsible_user_id: "", status: "Åben" });
    }
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader title="Afvigelser" description={`${openCount} åbne · ${closedCount} lukkede`} />

      <div className="mb-5 flex justify-between items-center">
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> {openCount} åbne
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> {closedCount} lukkede
          </div>
        </div>
        <Button onClick={() => openNew()} className="rounded-xl gap-2">
          <Plus size={15} /> Ny afvigelse
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-24" />
        ))}
        {deviations?.map((dev, i) => {
          const isOpen = dev.status === "Åben";
          const daysOld = differenceInDays(new Date(), new Date(dev.deviation_date));
          const overdue = isOpen && daysOld > 30;
          const responsible = profiles?.find(p => p.user_id === dev.responsible_user_id);
          return (
            <motion.div key={dev.id} variants={item} initial="hidden" animate="show" transition={{ delay: i * 0.03 }}
              className={`rounded-2xl border bg-card p-5 shadow-card transition-all ${overdue ? "border-destructive/30 bg-destructive/[0.02]" : isOpen ? "border-warning/30" : "border-success/30"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`h-3 w-3 rounded-full mt-1.5 flex-shrink-0 ${isOpen ? "bg-warning" : "bg-success"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dev.description.length > 120 ? dev.description.slice(0, 120) + "..." : dev.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(dev.deviation_date), "d. MMM yyyy", { locale: da })}</span>
                      {(dev.cases as any)?.case_number && <span className="flex items-center gap-1"><Briefcase size={11} /> {formatCaseLabel(dev.cases as any)}</span>}
                      {responsible && <span className="flex items-center gap-1"><User size={11} /> {responsible.full_name}</span>}
                    </div>
                    {overdue && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-destructive">
                        <AlertTriangle size={12} /> Åben i over 30 dage — kræver handling
                      </div>
                    )}
                    {dev.corrective_action && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                        <strong className="text-foreground">Korrigerende handling:</strong> {dev.corrective_action}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isOpen ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                    {isOpen ? <AlertOctagon size={11} /> : <CheckCircle2 size={11} />} {dev.status}
                  </span>
                  {role === "admin" && (
                    <button onClick={() => openNew(dev)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {!isLoading && (!deviations || deviations.length === 0) && (
          <div className="text-center py-16">
            <AlertOctagon size={28} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen afvigelser registreret</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Det er godt — det betyder at alt kører som det skal!</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditDev(null); } }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
              <AlertOctagon size={18} className="text-warning" /> {editDev ? "Rediger afvigelse" : "Ny afvigelse"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveDev.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dato</Label>
              <Input type="date" value={form.deviation_date} onChange={e => setForm({ ...form, deviation_date: e.target.value })} className="mt-1.5 rounded-xl h-11" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hvad skete der?</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Beskriv hvad der gik galt — fx en fejl i arbejdet, en kundeklage, eller en procedure der ikke blev fulgt..." className="mt-1.5 rounded-xl min-h-[100px]" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tilknyt sag (valgfrit)</Label>
              <select value={form.case_id} onChange={e => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option value="">Ingen sag</option>
                {cases?.map(c => <option key={c.id} value={c.id}>{formatCaseLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hvad blev gjort for at rette det?</Label>
              <Textarea value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} placeholder="Beskriv hvad der blev gjort for at løse problemet..." className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ansvarlig person</Label>
                <select value={form.responsible_user_id} onChange={e => setForm({ ...form, responsible_user_id: e.target.value })} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="">Vælg person</option>
                  {profiles?.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="Åben">Åben</option>
                  <option value="Lukket">Lukket</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditDev(null); }} className="rounded-xl">Annuller</Button>
              <Button type="submit" disabled={saveDev.isPending} className="rounded-xl">
                {saveDev.isPending ? "Gemmer..." : editDev ? "Gem ændringer" : "Opret afvigelse"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
