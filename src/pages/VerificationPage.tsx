import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download } from "lucide-react";
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
            <Button size="sm" className="gap-2"><Plus size={16} /> Nyt skema</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Opret kontrolskema</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createForm.mutate(); }} className="space-y-3">
              <div>
                <Label className="text-xs">Sag</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Vælg sag...</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Kontroltype</Label><Input value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} placeholder="Brandtætning" className="mt-1" required /></div>

              <div>
                <Label className="text-xs">Kontrolpunkter</Label>
                <div className="mt-1 space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.checked} onChange={(e) => updateItem(idx, "checked", e.target.checked)} className="rounded" />
                      <Input value={item.label} onChange={(e) => updateItem(idx, "label", e.target.value)} placeholder="Kontrolpunkt..." className="flex-1" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Tilføj punkt</Button>
                </div>
              </div>

              <div><Label className="text-xs">Kommentarer</Label><Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} className="mt-1" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuller</Button>
                <Button type="submit" disabled={createForm.isPending}>{createForm.isPending ? "Opretter..." : "Gem skema"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-4">
        {(forms || []).map((f, i) => {
          const items = (Array.isArray(f.items) ? f.items : []) as CheckItem[];
          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-heading font-semibold text-card-foreground">{f.form_type}</h3>
                  <p className="text-xs text-muted-foreground">Sag {(f.cases as any)?.case_number || "–"} · {f.created_at?.split("T")[0]}</p>
                </div>
              </div>
              <div className="space-y-2">
                {items.map((item, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${item.checked ? "bg-success border-success text-success-foreground" : "border-border bg-card"}`}>
                      {item.checked && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-card-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              {f.comments && <p className="mt-3 text-xs text-muted-foreground">{f.comments}</p>}
            </motion.div>
          );
        })}
        {(!forms || forms.length === 0) && (
          <p className="text-center py-8 text-sm text-muted-foreground">Ingen kontrolskemaer endnu</p>
        )}
      </div>
    </div>
  );
}
