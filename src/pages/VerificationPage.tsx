import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
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
  const [form, setForm] = useState({ case_id: "", form_type: "", comments: "", items: [{ label: "", checked: false }] as CheckItem[] });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: forms } = useQuery({
    queryKey: ["verification_forms"],
    queryFn: async () => {
      const { data } = await supabase.from("verification_forms").select("*, cases(case_number), profiles!verification_forms_user_id_fkey(full_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { label: "", checked: false }] });
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

  return (
    <div>
      <PageHeader title="Kontrolskemaer" description="Udfyld og gennemgå kontrolskemaer">
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
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kontroltype</Label><Input value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} placeholder="Brandtætning" className="mt-1.5 rounded-xl" required /></div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kontrolpunkter</Label>
                <div className="mt-2 space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.checked} onChange={(e) => updateItem(idx, "checked", e.target.checked)} className="rounded" />
                      <Input value={item.label} onChange={(e) => updateItem(idx, "label", e.target.value)} placeholder="Kontrolpunkt..." className="flex-1 rounded-xl" />
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

      <div className="space-y-4">
        {(forms || []).map((f, i) => {
          const items = (Array.isArray(f.items) ? f.items : []) as unknown as CheckItem[];
          const checkedCount = items.filter(i => i.checked).length;
          const totalCount = items.length;
          const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <ClipboardCheck size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-card-foreground">{f.form_type}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Sag {(f.cases as any)?.case_number || "–"} · {f.created_at?.split("T")[0]}</p>
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
                  className="h-full rounded-full gradient-primary"
                />
              </div>

              <div className="space-y-1.5">
                {items.map((item, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    {item.checked ? (
                      <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${item.checked ? "text-card-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              {f.comments && <p className="mt-4 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5">{f.comments}</p>}
            </motion.div>
          );
        })}
        {(!forms || forms.length === 0) && (
          <div className="text-center py-12">
            <ClipboardCheck size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen kontrolskemaer endnu</p>
          </div>
        )}
      </div>
    </div>
  );
}
