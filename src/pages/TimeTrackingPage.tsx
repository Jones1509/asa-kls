import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function TimeTrackingPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ case_id: "", date: new Date().toISOString().split("T")[0], start_time: "08:00", end_time: "16:00", notes: "" });

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number").eq("status", "Aktiv");
      return data || [];
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["time_entries", user?.id],
    queryFn: async () => {
      let query = supabase.from("time_entries").select("*, cases(case_number)").order("date", { ascending: false }).limit(20);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      const hours = (eh + em / 60) - (sh + sm / 60);
      const { error } = await supabase.from("time_entries").insert({
        user_id: user!.id,
        case_id: form.case_id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        hours: Math.round(hours * 100) / 100,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Timer registreret");
      setForm({ ...form, notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Timeregistrering" description="Registrer og se arbejdstimer" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 shadow-card mb-6">
        <h3 className="font-heading font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Clock size={18} className="text-primary" /> Hurtig registrering
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs">Sag</Label>
            <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Vælg sag...</option>
              {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Dato</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" required /></div>
          <div><Label className="text-xs">Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1" required /></div>
          <div><Label className="text-xs">Slut</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="mt-1" required /></div>
          <div><Label className="text-xs">Note</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Valgfrit" className="mt-1" /></div>
          <div className="flex items-end"><Button type="submit" className="w-full" disabled={createEntry.isPending}>Gem</Button></div>
        </form>
      </motion.div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-card-foreground">Seneste registreringer</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Dato</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sag</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tid</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Timer</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(entries || []).map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-card-foreground">{e.date}</td>
                  <td className="px-5 py-3.5 font-medium text-card-foreground">{(e.cases as any)?.case_number || "–"}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)}</td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{e.hours}t</span></td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{e.notes || "–"}</td>
                </tr>
              ))}
              {(!entries || entries.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Ingen registreringer endnu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
