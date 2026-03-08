import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Timer, Trash2, TrendingUp, Calendar, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function TimeTrackingPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const [form, setForm] = useState({ case_id: "", user_id: "", date: new Date().toISOString().split("T")[0], start_time: "08:00", end_time: "16:00", notes: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: cases } = useQuery({
    queryKey: ["cases_active_time"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number").eq("status", "Aktiv");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees_time"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["time_entries", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("time_entries").select("*, cases(case_number)").order("date", { ascending: false }).limit(50);
      if (!isAdmin) query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // Resolve names for admin view
  const { data: profileMap } = useQuery({
    queryKey: ["profiles_map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: isAdmin,
  });

  const weekStats = (() => {
    if (!entries) return { thisWeek: 0, lastWeek: 0, today: 0 };
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.getDay() || 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek + 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisWeek = entries.filter(e => e.date >= weekStart.toISOString().split("T")[0]).reduce((s, e) => s + Number(e.hours), 0);
    const lastWeek = entries.filter(e => e.date >= lastWeekStart.toISOString().split("T")[0] && e.date < weekStart.toISOString().split("T")[0]).reduce((s, e) => s + Number(e.hours), 0);
    const todayHours = entries.filter(e => e.date === today).reduce((s, e) => s + Number(e.hours), 0);
    return { thisWeek: Math.round(thisWeek * 10) / 10, lastWeek: Math.round(lastWeek * 10) / 10, today: Math.round(todayHours * 10) / 10 };
  })();

  const createEntry = useMutation({
    mutationFn: async () => {
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      const hours = (eh + em / 60) - (sh + sm / 60);
      if (hours <= 0) throw new Error("Sluttid skal være efter starttid");
      const targetUserId = isAdmin && form.user_id ? form.user_id : user!.id;
      const { error } = await supabase.from("time_entries").insert({
        user_id: targetUserId,
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
      setForm({ ...form, notes: "", user_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      setDeleteConfirm(null);
      toast.success("Registrering slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Timeregistrering" description="Registrer og se arbejdstimer" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "I dag", value: `${weekStats.today}t`, icon: Clock, color: "bg-primary/10 text-primary" },
          { label: "Denne uge", value: `${weekStats.thisWeek}t`, icon: Calendar, color: "bg-success/10 text-success" },
          { label: "Sidste uge", value: `${weekStats.lastWeek}t`, icon: TrendingUp, color: "bg-muted text-muted-foreground" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon size={17} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-card-foreground">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick entry */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
        <h3 className="font-heading font-bold text-card-foreground mb-5 flex items-center gap-2.5 text-[15px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Timer size={15} className="text-primary" /></div>
          {isAdmin ? "Registrer timer (admin)" : "Hurtig registrering"}
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-7" : "lg:grid-cols-6"} gap-4`}>
          {isAdmin && (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Medarbejder</Label>
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all" required>
                <option value="">Vælg medarbejder...</option>
                {employees?.map((e) => <option key={e.user_id} value={e.user_id}>{e.full_name}</option>)}
              </select>
            </div>
          )}
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
          <div className="flex items-end"><Button type="submit" className="w-full rounded-xl h-11 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={createEntry.isPending}>{createEntry.isPending ? "Gemmer..." : "Registrer"}</Button></div>
        </form>
      </motion.div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted"><Clock size={15} className="text-muted-foreground" /></div>
            <h3 className="font-heading font-bold text-card-foreground text-[15px]">
              {isAdmin ? "Alle registreringer" : "Seneste registreringer"}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">{entries?.length || 0} poster</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dato</th>
                {isAdmin && <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Medarbejder</th>}
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sag</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tid</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timer</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Note</th>
                <th className="px-6 py-3.5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && [1, 2, 3].map(i => (
                <tr key={i}><td colSpan={isAdmin ? 7 : 6} className="px-6 py-4"><div className="h-4 w-full rounded bg-muted animate-pulse" /></td></tr>
              ))}
              {(entries || []).map((e) => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4 text-card-foreground">{e.date}</td>
                  {isAdmin && <td className="px-6 py-4 text-card-foreground font-medium">{profileMap?.[e.user_id] || "–"}</td>}
                  <td className="px-6 py-4 font-semibold text-card-foreground">{(e.cases as any)?.case_number || "–"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{e.hours}t</span></td>
                  <td className="px-6 py-4 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{e.notes || "–"}</td>
                  <td className="px-6 py-4">
                    {deleteConfirm === e.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" className="rounded-lg h-7 text-[11px] px-2" onClick={() => deleteEntry.mutate(e.id)}>Slet</Button>
                        <Button size="sm" variant="ghost" className="rounded-lg h-7 text-[11px] px-2" onClick={() => setDeleteConfirm(null)}>Nej</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(e.id)}
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && (!entries || entries.length === 0) && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-sm text-muted-foreground">Ingen registreringer endnu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
