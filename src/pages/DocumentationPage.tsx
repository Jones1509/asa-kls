import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Image, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const typeColors: Record<string, string> = {
  Fejl: "bg-destructive/10 text-destructive",
  Mangel: "bg-warning/10 text-warning",
  "Farligt forhold": "bg-destructive/10 text-destructive",
  Note: "bg-info/10 text-info",
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
            <Button size="sm" className="gap-2"><Plus size={16} /> Ny dokumentation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Opret dokumentation</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createDoc.mutate(); }} className="space-y-3">
              <div>
                <Label className="text-xs">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="Fejl">Fejl</option>
                  <option value="Mangel">Mangel</option>
                  <option value="Farligt forhold">Farligt forhold</option>
                  <option value="Note">Note</option>
                </select>
              </div>
              <div><Label className="text-xs">Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required /></div>
              <div><Label className="text-xs">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuller</Button>
                <Button type="submit" disabled={createDoc.isPending}>{createDoc.isPending ? "Opretter..." : "Gem"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-3">
        {(docs || []).map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elevated transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FileText size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">Sag {(d.cases as any)?.case_number || "–"} · {d.created_at?.split("T")[0]}</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[d.type] || ""}`}>{d.type}</span>
          </motion.div>
        ))}
        {(!docs || docs.length === 0) && (
          <p className="text-center py-8 text-sm text-muted-foreground">Ingen dokumentation endnu</p>
        )}
      </div>
    </div>
  );
}
