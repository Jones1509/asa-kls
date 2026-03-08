import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Eye, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Ny: "bg-primary/10 text-primary border border-primary/20",
  Godkendt: "bg-success/10 text-success border border-success/20",
  Afvist: "bg-destructive/10 text-destructive border border-destructive/20",
};

export default function ReportsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ case_id: "", title: "", description: "", observations: "", recommendations: "" });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      let query = supabase.from("reports").select("*, cases(case_number)").order("created_at", { ascending: false });
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Status opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reports").insert({
        user_id: user!.id,
        case_id: form.case_id,
        title: form.title,
        description: form.description || null,
        observations: form.observations || null,
        recommendations: form.recommendations || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setOpen(false);
      setForm({ case_id: "", title: "", description: "", observations: "", recommendations: "" });
      toast.success("Rapport oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Rapporter" description={`${reports?.length || 0} rapporter`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny rapport</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Opret rapport</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 rounded-xl" required /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observationer</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Anbefalinger</Label><Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createReport.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createReport.isPending ? "Opretter..." : "Opret rapport"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-3">
        {(reports || []).map((r, i) => {
          const isExpanded = expanded === r.id;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-all overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : r.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><FileText size={18} className="text-primary" /></div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sag {(r.cases as any)?.case_number || "–"} · {r.created_at?.split("T")[0]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[r.status] || ""}`}>{r.status}</span>
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
                    <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                      {r.description && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Beskrivelse</p>
                          <p className="text-sm text-card-foreground">{r.description}</p>
                        </div>
                      )}
                      {r.observations && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Observationer</p>
                          <p className="text-sm text-card-foreground">{r.observations}</p>
                        </div>
                      )}
                      {r.recommendations && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Anbefalinger</p>
                          <p className="text-sm text-card-foreground">{r.recommendations}</p>
                        </div>
                      )}
                      {role === "admin" && r.status === "Ny" && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="rounded-xl" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: r.id, status: "Godkendt" }); }}>Godkend</Button>
                          <Button size="sm" variant="outline" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: r.id, status: "Afvist" }); }}>Afvis</Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {(!reports || reports.length === 0) && (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen rapporter endnu</p>
          </div>
        )}
      </div>
    </div>
  );
}
