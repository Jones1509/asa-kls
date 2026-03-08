import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Radio, Search, AlertTriangle, CheckCircle2, Circle, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const priorityConfig: Record<string, { color: string; dot: string }> = {
  Lav: { color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  Normal: { color: "bg-info/10 text-info border border-info/20", dot: "bg-info" },
  Høj: { color: "bg-warning/10 text-warning border border-warning/20", dot: "bg-warning" },
  Kritisk: { color: "bg-destructive/10 text-destructive border border-destructive/20", dot: "bg-destructive" },
};

export default function FieldReportsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [form, setForm] = useState({ case_id: "", priority: "Normal", subject: "", message: "" });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number");
      return data || [];
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["field_reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("field_reports")
        .select("*, cases(case_number), profiles!field_reports_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("field_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "field_reports" }, () => {
        queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("field_reports").insert({
        user_id: user!.id,
        case_id: form.case_id || null,
        priority: form.priority,
        subject: form.subject,
        message: form.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      setOpen(false);
      setForm({ case_id: "", priority: "Normal", subject: "", message: "" });
      toast.success("Feltrapport sendt til ledelsen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("field_reports").update({
        admin_response: replyText,
        responded_at: new Date().toISOString(),
        is_read: true,
      }).eq("id", replyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      setReplyId(null);
      setReplyText("");
      toast.success("Svar sendt");
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("field_reports").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field_reports"] }),
  });

  const priorities = ["Lav", "Normal", "Høj", "Kritisk"];
  const unreadCount = reports?.filter(r => !r.is_read).length || 0;
  const filtered = reports?.filter(r =>
    r.subject.toLowerCase().includes(search.toLowerCase()) ||
    r.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Feltrapporter" description={role === "admin" ? `${unreadCount} ulæste rapporter` : "Send besked direkte til ledelsen"}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny feltrapport</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Send feltrapport</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prioritet</Label>
                <div className="mt-2 flex gap-2">
                  {priorities.map(p => (
                    <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.priority === p ? priorityConfig[p].color : "bg-muted/50 text-muted-foreground"}`}>
                      <span className={`h-2 w-2 rounded-full ${priorityConfig[p].dot}`} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag (valgfrit)</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all">
                  <option value="">Ingen specifik sag</option>
                  {cases?.map(c => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                </select>
              </div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Emne</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Kort beskrivelse..." className="mt-1.5 rounded-xl" required /></div>
              <div><Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Besked</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Beskriv hvad du har observeret i felten..." className="mt-1.5 rounded-xl" rows={5} required /></div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createReport.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createReport.isPending ? "Sender..." : "Send rapport"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg i feltrapporter..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-32 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((r, i) => {
          const config = priorityConfig[r.priority] || priorityConfig.Normal;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border bg-card p-5 shadow-card transition-all ${!r.is_read && role === "admin" ? "border-primary/30 bg-primary/[0.02]" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0 ${!r.is_read ? "bg-primary/10" : "bg-muted/50"}`}>
                    <Radio size={18} className={!r.is_read ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-card-foreground">{r.subject}</p>
                      {!r.is_read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(r.profiles as any)?.full_name || "Ukendt"} · {r.cases ? `Sag ${(r.cases as any)?.case_number}` : "Generel"} · {r.created_at?.split("T")[0]}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.message}</p>

                    {/* Admin response */}
                    {r.admin_response && (
                      <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
                        <p className="text-[11px] font-semibold text-primary mb-1">Svar fra ledelsen</p>
                        <p className="text-sm text-card-foreground leading-relaxed">{r.admin_response}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{r.responded_at?.split("T")[0]}</p>
                      </div>
                    )}

                    {/* Reply form for admins */}
                    {role === "admin" && replyId === r.id && (
                      <div className="mt-3 flex gap-2">
                        <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Skriv svar..." className="rounded-xl text-sm flex-1" rows={2} />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={() => sendReply.mutate()} disabled={!replyText.trim() || sendReply.isPending} className="rounded-xl"><Send size={14} /></Button>
                          <Button size="sm" variant="outline" onClick={() => { setReplyId(null); setReplyText(""); }} className="rounded-xl text-xs">Luk</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {role === "admin" && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!r.is_read && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(r.id)} className="rounded-xl text-xs gap-1">
                        <CheckCircle2 size={12} /> Læst
                      </Button>
                    )}
                    {!r.admin_response && (
                      <Button size="sm" variant="outline" onClick={() => setReplyId(r.id)} className="rounded-xl text-xs gap-1">
                        <MessageCircle size={12} /> Svar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="text-center py-16">
            <Radio size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {role === "admin" ? "Ingen feltrapporter modtaget" : "Ingen feltrapporter sendt endnu"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {role !== "admin" && "Brug knappen ovenfor til at rapportere observationer fra felten"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
