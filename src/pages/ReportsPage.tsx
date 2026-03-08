import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Ny: "bg-primary/10 text-primary",
  Godkendt: "bg-success/10 text-success",
  Afvist: "bg-destructive/10 text-destructive",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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
      const { data } = await supabase.from("reports").select("*, cases(case_number)").order("created_at", { ascending: false });
      return data || [];
    },
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
      <PageHeader title="Rapporter" description="Opret og gennemgå rapporter">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus size={16} /> Ny rapport</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Opret rapport</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(); }} className="space-y-3">
              <div>
                <Label className="text-xs">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required /></div>
              <div><Label className="text-xs">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Observationer</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Anbefalinger</Label><Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} className="mt-1" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuller</Button>
                <Button type="submit" disabled={createReport.isPending}>{createReport.isPending ? "Opretter..." : "Opret rapport"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-3">
        {(reports || []).map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elevated transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><FileText size={18} className="text-muted-foreground" /></div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">Sag {(r.cases as any)?.case_number || "–"} · {r.created_at?.split("T")[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || ""}`}>{r.status}</span>
            </div>
          </motion.div>
        ))}
        {(!reports || reports.length === 0) && (
          <p className="text-center py-8 text-sm text-muted-foreground">Ingen rapporter endnu</p>
        )}
      </div>
    </div>
  );
}
