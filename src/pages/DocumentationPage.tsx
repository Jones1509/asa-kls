import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, FileText, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const typeConfig: Record<string, { color: string; icon: any }> = {
  Fejl: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
  Mangel: { color: "bg-warning/10 text-warning border border-warning/20", icon: AlertTriangle },
  "Farligt forhold": { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertTriangle },
  Note: { color: "bg-info/10 text-info border border-info/20", icon: Info },
};

export default function DocumentationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ case_id: "", type: "Fejl", title: "", description: "" });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["documentation"],
    queryFn: async () => {
      const { data } = await supabase.from("documentation").select("*, cases(case_number)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("documentation").insert({
        user_id: user!.id,
        case_id: form.case_id,
        type: form.type,
        title: form.title,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation"] });
      setOpen(false);
      setForm({ case_id: "", type: "Fejl", title: "", description: "" });
      toast.success("Dokumentation oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Dokumentation" description="Indsendte observationer og dokumenter">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny dokumentation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Opret dokumentation</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createDoc.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                  <option value="Fejl">Fejl</option>
                  <option value="Mangel">Mangel</option>
                  <option value="Farligt forhold">Farligt forhold</option>
                  <option value="Note">Note</option>
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 rounded-xl" required /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createDoc.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createDoc.isPending ? "Opretter..." : "Gem"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-3">
        {(docs || []).map((d, i) => {
          const config = typeConfig[d.type] || typeConfig.Note;
          const TypeIcon = config.icon;
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                  <TypeIcon size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sag {(d.cases as any)?.case_number || "–"} · {d.created_at?.split("T")[0]}</p>
                  {d.description && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{d.description}</p>}
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.color}`}>{d.type}</span>
            </motion.div>
          );
        })}
        {(!docs || docs.length === 0) && (
          <div className="text-center py-12">
            <FolderOpen size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen dokumentation endnu</p>
          </div>
        )}
      </div>
    </div>
  );
}
