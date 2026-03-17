import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Radio, Search, Eye, ImagePlus, X, ChevronLeft, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const severityConfig: Record<string, { color: string; dot: string; label: string }> = {
  Lav: { color: "bg-success/10 text-success border border-success/20", dot: "bg-success", label: "Lav" },
  Mellem: { color: "bg-warning/10 text-warning border border-warning/20", dot: "bg-warning", label: "Mellem" },
  Høj: { color: "bg-destructive/10 text-destructive border border-destructive/20", dot: "bg-destructive", label: "Høj" },
};

export default function FieldReportsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("alle");
  const [viewReport, setViewReport] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    case_id: "",
    location_text: "",
    priority: "Mellem",
    subject: "",
    message: "",
  });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number, customer");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
    enabled: role === "admin",
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["field_reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("field_reports")
        .select("*, cases(case_number, customer), profiles!field_reports_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("field_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "field_reports" }, () => {
        queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => setImagePreviews(prev => [...prev, URL.createObjectURL(f)]));
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const createReport = useMutation({
    mutationFn: async () => {
      let image_urls: string[] = [];
      for (const file of imageFiles) {
        const path = `field-reports/${user!.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        image_urls.push(data.publicUrl);
      }

      const { error } = await supabase.from("field_reports").insert({
        user_id: user!.id,
        case_id: form.case_id || null,
        priority: form.priority,
        subject: form.subject,
        message: form.message + (form.location_text ? `\n\nLokation: ${form.location_text}` : ""),
        image_urls: image_urls.length > 0 ? image_urls : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      setOpen(false);
      setForm({ case_id: "", location_text: "", priority: "Mellem", subject: "", message: "" });
      setImageFiles([]);
      setImagePreviews([]);
      toast.success("Feltrapport sendt til ledelsen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendNote = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.from("field_reports").update({
        admin_response: noteText,
        responded_at: new Date().toISOString(),
        is_read: true,
      }).eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field_reports"] });
      setNoteText("");
      toast.success("Note tilføjet");
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("field_reports").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field_reports"] }),
  });

  const severities = ["Lav", "Mellem", "Høj"];
  const unreadCount = reports?.filter(r => !r.is_read).length || 0;

  const [employeeFilter, setEmployeeFilter] = useState("alle");
  const [caseFilter, setCaseFilter] = useState("alle");

  const filtered = reports?.filter(r => {
    const matchSearch = r.subject.toLowerCase().includes(search.toLowerCase()) || r.message.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "alle" || r.priority === severityFilter;
    const matchEmployee = employeeFilter === "alle" || r.user_id === employeeFilter;
    const matchCase = caseFilter === "alle" || r.case_id === caseFilter;
    return matchSearch && matchSeverity && matchEmployee && matchCase;
  });

  // Detail view
  if (viewReport) {
    const r = viewReport;
    const cfg = severityConfig[r.priority] || severityConfig.Mellem;
    if (role === "admin" && !r.is_read) markRead.mutate(r.id);
    return (
      <div>
        <button onClick={() => { setViewReport(null); setNoteText(""); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> Tilbage til oversigt
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-heading font-bold text-card-foreground">{r.subject}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(r.profiles as any)?.full_name} · {r.cases ? formatCaseLabel(r.cases as any) : "Generel"} · {r.created_at?.split("T")[0]}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${cfg.color}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
          </div>
          <p className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap">{r.message}</p>

          {r.image_urls && (r.image_urls as string[]).length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billeder</p>
              <div className="flex flex-wrap gap-2">
                {(r.image_urls as string[]).map((url, j) => (
                  <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 rounded-xl overflow-hidden border border-border hover:border-primary transition-colors">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {r.admin_response && (
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-[11px] font-semibold text-primary mb-1">Note fra ledelsen</p>
              <p className="text-sm text-card-foreground leading-relaxed">{r.admin_response}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{r.responded_at?.split("T")[0]}</p>
            </div>
          )}

          {role === "admin" && !r.admin_response && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tilføj intern note</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Skriv en note..." className="rounded-xl" rows={3} />
              <Button size="sm" onClick={() => sendNote.mutate(r.id)} disabled={!noteText.trim() || sendNote.isPending} className="rounded-xl gap-1.5">
                <Send size={14} /> Send note
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Feltrapporter" description={role === "admin" ? `${unreadCount} ulæste rapporter` : "Rapportér observationer fra felten"}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny feltrapport</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Ny feltrapport</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Kort beskrivelse af observationen..." className="mt-1.5 rounded-xl" required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sag / Lokation (valgfrit)</Label>
                <select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 outline-none transition-all">
                  <option value="">Ingen specifik sag</option>
                  {cases?.map(c => <option key={c.id} value={c.id}>{formatCaseLabel(c)}</option>)}
                </select>
                {!form.case_id && (
                  <Input value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} placeholder="Angiv lokation hvis ikke tilknyttet en sag..." className="mt-2 rounded-xl" />
                )}
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alvorlighedsgrad</Label>
                <div className="mt-2 flex gap-2">
                  {severities.map(s => {
                    const cfg = severityConfig[s];
                    return (
                      <button key={s} type="button" onClick={() => setForm({ ...form, priority: s })}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.priority === s ? cfg.color : "bg-muted/50 text-muted-foreground border border-transparent"}`}>
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Detaljeret beskrivelse</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Beskriv detaljeret hvad du har observeret..." className="mt-1.5 rounded-xl" rows={5} required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Billeder</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={10} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus size={18} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handleImageAdd} className="hidden" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={createReport.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {createReport.isPending ? "Sender..." : "Indsend rapport"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Søg feltrapporter..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
            {["alle", ...severities].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${severityFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "alle" ? "Alle" : s}
              </button>
            ))}
          </div>
        </div>
        {role === "admin" && (
          <div className="flex flex-wrap gap-2">
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-ring outline-none">
              <option value="alle">Alle medarbejdere</option>
              {profiles?.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
            </select>
            <select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className="h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-ring outline-none">
              <option value="alle">Alle sager</option>
              {cases?.map(c => <option key={c.id} value={c.id}>{formatCaseLabel(c)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-32 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((r, i) => {
          const cfg = severityConfig[r.priority] || severityConfig.Mellem;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setViewReport(r)}
              className={`rounded-2xl border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer group ${!r.is_read && role === "admin" ? "border-primary/30" : "border-border"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0 ${!r.is_read && role === "admin" ? "bg-primary/10" : "bg-muted/50"}`}>
                    <Radio size={18} className={!r.is_read && role === "admin" ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-card-foreground">{r.subject}</p>
                      {!r.is_read && role === "admin" && <span className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(r.profiles as any)?.full_name || "Ukendt"} · {r.cases ? `Sag ${(r.cases as any)?.case_number}` : "Generel"} · {r.created_at?.split("T")[0]}
                    </p>
                  </div>
                </div>
                <Eye size={16} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          );
        })}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="text-center py-16">
            <Radio size={40} className="mx-auto text-muted-foreground/15 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {role === "admin" ? "Ingen feltrapporter modtaget" : "Ingen feltrapporter endnu"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {role !== "admin" && "Rapportér observationer fra felten med knappen ovenfor"}
            </p>
            {role !== "admin" && <Button size="sm" onClick={() => setOpen(true)} className="mt-4 rounded-xl gap-2"><Plus size={14} /> Ny feltrapport</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
