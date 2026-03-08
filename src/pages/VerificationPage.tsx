import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardCheck, CheckCircle2, Circle, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface CheckItem {
  label: string;
  checked: boolean;
}

export default function VerificationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ case_id: "", form_type: "", comments: "", items: [{ label: "", checked: false }] as CheckItem[] });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: forms, isLoading } = useQuery({
    queryKey: ["verification_forms"],
    queryFn: async () => {
      const { data } = await supabase.from("verification_forms").select("*, cases(case_number), profiles!verification_forms_user_id_fkey(full_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { label: "", checked: false }] });
  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };
  const updateItem = (idx: number, key: keyof CheckItem, value: any) => {
    const items = [...form.items];
    (items[idx] as any)[key] = value;
    setForm({ ...form, items });
  };

  const createForm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("verification_forms").insert({
        user_id: user!.id,
        case_id: form.case_id,
        form_type: form.form_type,
        items: form.items as any,
        comments: form.comments || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_forms"] });
      setOpen(false);
      setForm({ case_id: "", form_type: "", comments: "", items: [{ label: "", checked: false }] });
      toast.success("Kontrolskema oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle check item inline
  const toggleItem = useMutation({
    mutationFn: async ({ formId, items, idx }: { formId: string; items: CheckItem[]; idx: number }) => {
      const updated = [...items];
      updated[idx] = { ...updated[idx], checked: !updated[idx].checked };
      const { error } = await supabase.from("verification_forms").update({ items: updated as any }).eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["verification_forms"] }),
  });

  const filtered = forms?.filter(f =>
    f.form_type.toLowerCase().includes(search.toLowerCase()) ||
    (f.cases as any)?.case_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalForms = forms?.length || 0;
  const completedForms = forms?.filter(f => {
    const items = (Array.isArray(f.items) ? f.items : []) as unknown as CheckItem[];
    return items.length > 0 && items.every(i => i.checked);
  }).length || 0;

  return (
    <div>
      <PageHeader title="Kontrolskemaer" description={`${totalForms} skemaer · ${completedForms} færdige`}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Nyt skema</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Opret kontrolskema</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createForm.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kontroltype</Label><Input value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} placeholder="Brandtætning, Isolering, EL-check..." className="mt-1.5 rounded-xl" required /></div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kontrolpunkter</Label>
                <div className="mt-2 space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.checked} onChange={(e) => updateItem(idx, "checked", e.target.checked)} className="rounded" />
                      <Input value={item.label} onChange={(e) => updateItem(idx, "label", e.target.value)} placeholder="Kontrolpunkt..." className="flex-1 rounded-xl" />
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-xl">+ Tilføj punkt</Button>
                </div>
              </div>

              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kommentarer</Label><Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createForm.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createForm.isPending ? "Opretter..." : "Gem skema"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg kontrolskemaer..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((f, i) => {
          const items = (Array.isArray(f.items) ? f.items : []) as unknown as CheckItem[];
          const checkedCount = items.filter(i => i.checked).length;
          const totalCount = items.length;
          const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
          const isComplete = totalCount > 0 && checkedCount === totalCount;

          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border bg-card p-6 shadow-card hover:shadow-elevated transition-all ${isComplete ? "border-success/30" : "border-border"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isComplete ? "bg-success/10" : "bg-primary/10"}`}>
                    {isComplete ? <CheckCircle2 size={18} className="text-success" /> : <ClipboardCheck size={18} className="text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-card-foreground">{f.form_type}</h3>
                      {isComplete && <span className="text-[10px] font-bold text-success uppercase bg-success/10 px-2 py-0.5 rounded-full">Færdig</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sag {(f.cases as any)?.case_number || "–"} · {(f.profiles as any)?.full_name || "–"} · {f.created_at?.split("T")[0]}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{checkedCount}/{totalCount}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted mb-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 + 0.2 }}
                  className={`h-full rounded-full ${isComplete ? "bg-success" : "gradient-primary"}`}
                />
              </div>

              <div className="space-y-1.5">
                {items.map((item, j) => (
                  <button key={j} onClick={() => toggleItem.mutate({ formId: f.id, items, idx: j })}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/30 transition-colors w-full text-left">
                    {item.checked ? (
                      <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${item.checked ? "text-card-foreground line-through opacity-60" : "text-card-foreground"}`}>{item.label}</span>
                  </button>
                ))}
              </div>
              {f.comments && <p className="mt-4 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5">{f.comments}</p>}
            </motion.div>
          );
        })}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="text-center py-12">
            <ClipboardCheck size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen kontrolskemaer endnu</p>
          </div>
        )}
      </div>
    </div>
  );
}
