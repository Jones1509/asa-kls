import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Timer } from "lucide-react";
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

      {/* Quick entry card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
        <h3 className="font-heading font-bold text-card-foreground mb-5 flex items-center gap-2.5 text-[15px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Timer size={15} className="text-primary" />
          </div>
          Hurtig registrering
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag</Label>
            <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
              <option value="">Vælg sag...</option>
              {cases?.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
            </select>
          </div>
          <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dato</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5 rounded-xl h-11" required /></div>
          <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1.5 rounded-xl h-11" required /></div>
          <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Slut</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="mt-1.5 rounded-xl h-11" required /></div>
          <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Note</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Valgfrit" className="mt-1.5 rounded-xl h-11" /></div>
          <div className="flex items-end"><Button type="submit" className="w-full rounded-xl h-11 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={createEntry.isPending}>Gem</Button></div>
        </form>
      </motion.div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
            <Clock size={15} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-bold text-card-foreground text-[15px]">Seneste registreringer</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dato</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sag</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tid</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timer</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(entries || []).map((e) => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 text-card-foreground">{e.date}</td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">{(e.cases as any)?.case_number || "–"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{e.hours}t</span></td>
                  <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{e.notes || "–"}</td>
                </tr>
              ))}
              {(!entries || entries.length === 0) && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">Ingen registreringer endnu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
