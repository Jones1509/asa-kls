import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, AlertTriangle, AlertCircle, Info, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const typeConfig: Record<string, { color: string; icon: any; bg: string }> = {
  Fejl: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle, bg: "bg-destructive/10" },
  Mangel: { color: "bg-warning/10 text-warning border border-warning/20", icon: AlertTriangle, bg: "bg-warning/10" },
  "Farligt forhold": { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertTriangle, bg: "bg-destructive/10" },
  Note: { color: "bg-info/10 text-info border border-info/20", icon: Info, bg: "bg-info/10" },
};

const typeOptions = ["Fejl", "Mangel", "Farligt forhold", "Note"];

export default function DocumentationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("alle");
  const [form, setForm] = useState({ case_id: "", type: "Fejl", title: "", description: "" });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: docs, isLoading } = useQuery({
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

  const filtered = docs?.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.cases as any)?.case_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "alle" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const counts = {
    alle: docs?.length || 0,
    ...Object.fromEntries(typeOptions.map(t => [t, docs?.filter(d => d.type === t).length || 0])),
  };

  return (
    <div>
      <PageHeader title="Dokumentation" description={`${counts.alle} dokumenter`}>
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
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 rounded-xl" required /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" rows={4} /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createDoc.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createDoc.isPending ? "Opretter..." : "Gem"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg dokumentation..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {["alle", ...typeOptions].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                typeFilter === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "alle" ? "Alle" : t} ({(counts as any)[t] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((d, i) => {
          const config = typeConfig[d.type] || typeConfig.Note;
          const TypeIcon = config.icon;
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0 ${config.bg}`}>
                    <TypeIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sag {(d.cases as any)?.case_number || "–"} · {d.created_at?.split("T")[0]}</p>
                    {d.description && <p className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-2 leading-relaxed">{d.description}</p>}
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold flex-shrink-0 ml-3 ${config.color}`}>{d.type}</span>
              </div>
            </motion.div>
          );
        })}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="text-center py-16">
            <FolderOpen size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Ingen dokumentation fundet</p>
          </div>
        )}
      </div>
    </div>
  );
}
