import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Upload, Calendar, CheckCircle2, XCircle, AlertTriangle, Plus, Pencil, Trash2, FileText, Wrench, ClipboardCheck, BookOpen, Download } from "lucide-react";
import { format, differenceInDays, addMonths, differenceInMonths } from "date-fns";
import { da } from "date-fns/locale";

const AUDIT_QUESTIONS = [
  "Er verifikationsskemaer brugt på alle sager?",
  "Er alle medarbejdercertifikater gyldige?",
  "Er alle afvigelser håndteret og lukket?",
  "Er alt måleudstyr kalibreret?",
  "Er dokumentationen på alle sager opdateret?",
  "Er der sket ændringer i virksomhedens organisation eller arbejdsgange?",
];

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function CompanyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAudit, setShowAudit] = useState(false);
  const [auditAnswers, setAuditAnswers] = useState(AUDIT_QUESTIONS.map(q => ({ question: q, answer: false, comment: "" })));
  const [showInstrument, setShowInstrument] = useState(false);
  const [editInstrument, setEditInstrument] = useState<any>(null);
  const [instrForm, setInstrForm] = useState({ name: "", serial_number: "", last_calibrated: "", next_calibration: "", certificate_url: "" });

  // Company docs (authorization)
  const { data: companyDocs } = useQuery({
    queryKey: ["company_documents"],
    queryFn: async () => {
      const { data } = await supabase.from("company_documents").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Audit reports
  const { data: audits } = useQuery({
    queryKey: ["audit_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_reports").select("*").order("audit_date", { ascending: false });
      return data || [];
    },
  });

  // Instruments
  const { data: instruments } = useQuery({
    queryKey: ["instruments"],
    queryFn: async () => {
      const { data } = await supabase.from("instruments").select("*").order("next_calibration");
      return data || [];
    },
  });

  const lastAudit = audits?.[0];
  const lastAuditDate = lastAudit ? new Date(lastAudit.audit_date) : null;
  const nextAuditDate = lastAuditDate ? addMonths(lastAuditDate, 12) : null;
  const monthsSinceAudit = lastAuditDate ? differenceInMonths(new Date(), lastAuditDate) : 999;

  const authDoc = companyDocs?.find(d => d.document_type === "autorisation");
  const authExpiry = authDoc?.expiry_date ? new Date(authDoc.expiry_date) : null;
  const authDaysLeft = authExpiry ? differenceInDays(authExpiry, new Date()) : null;

  const klsDoc = companyDocs?.find(d => d.document_type === "kls_haandbog");

  // Upload KLS handbook
  const uploadKls = useMutation({
    mutationFn: async (file: File) => {
      const path = `company/kls_haandbog_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);

      if (klsDoc) {
        await supabase.from("company_documents").update({ file_url: urlData.publicUrl, document_name: file.name, uploaded_at: new Date().toISOString() }).eq("id", klsDoc.id);
      } else {
        await supabase.from("company_documents").insert({ document_type: "kls_haandbog", document_name: file.name, file_url: urlData.publicUrl, created_by: user!.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_documents"] }); toast.success("KLS-håndbog uploadet"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteKls = useMutation({
    mutationFn: async () => {
      if (!klsDoc) return;
      const { error } = await supabase.from("company_documents").delete().eq("id", klsDoc.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_documents"] }); toast.success("KLS-håndbog slettet"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Upload authorization doc
  const uploadAuth = useMutation({
    mutationFn: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const file = fd.get("file") as File;
      const expiryDate = fd.get("expiry_date") as string;
      if (!file?.size) throw new Error("Vælg en fil");

      const path = `company/autorisation_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);

      if (authDoc) {
        await supabase.from("company_documents").update({ file_url: urlData.publicUrl, document_name: file.name, expiry_date: expiryDate || null, uploaded_at: new Date().toISOString() }).eq("id", authDoc.id);
      } else {
        await supabase.from("company_documents").insert({ document_type: "autorisation", document_name: file.name, file_url: urlData.publicUrl, expiry_date: expiryDate || null, created_by: user!.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_documents"] }); toast.success("Autorisationsbevis uploadet"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Save audit
  const saveAudit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("audit_reports").insert({ audit_date: new Date().toISOString().split("T")[0], answers: auditAnswers as any, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit_reports"] }); setShowAudit(false); toast.success("Audit gemt"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Save instrument
  const saveInstrument = useMutation({
    mutationFn: async () => {
      const payload = { ...instrForm, created_by: user!.id, certificate_url: instrForm.certificate_url || null, last_calibrated: instrForm.last_calibrated || null, next_calibration: instrForm.next_calibration || null };
      if (editInstrument) {
        const { error } = await supabase.from("instruments").update(payload).eq("id", editInstrument.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("instruments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instruments"] }); setShowInstrument(false); setEditInstrument(null); toast.success("Instrument gemt"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInstrument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("instruments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instruments"] }); toast.success("Instrument slettet"); },
  });

  // Upload instrument certificate
  const uploadInstrCert = async (file: File) => {
    const path = `company/instrument_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload fejlede"); return; }
    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    setInstrForm(f => ({ ...f, certificate_url: data.publicUrl }));
    toast.success("Certifikat uploadet");
  };

  const getCalibrationStatus = (nextDate: string | null) => {
    if (!nextDate) return "gray";
    const days = differenceInDays(new Date(nextDate), new Date());
    if (days < 0) return "red";
    if (days <= 30) return "yellow";
    return "green";
  };

  return (
    <div>
      <PageHeader title="Virksomhed" description="Autorisation, KLS-audit og måleinstrumenter" />

      <div className="space-y-8">
        {/* Section A: Autorisation */}
        <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Shield size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground">Autorisation</h2>
              <p className="text-xs text-muted-foreground">Autorisationsbevis fra Sikkerhedsstyrelsen</p>
            </div>
          </div>

          {authDoc?.file_url && (
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{authDoc.document_name}</p>
                  <p className="text-xs text-muted-foreground">Uploadet {authDoc.uploaded_at ? format(new Date(authDoc.uploaded_at), "d. MMM yyyy", { locale: da }) : "–"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {authDaysLeft !== null && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${authDaysLeft < 0 ? "bg-destructive/10 text-destructive" : authDaysLeft < 90 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                    {authDaysLeft < 0 ? "Udløbet" : `${authDaysLeft} dage tilbage`}
                  </span>
                )}
                <a href={authDoc.file_url} target="_blank" rel="noopener" className="text-xs font-medium text-primary hover:underline">Se dokument →</a>
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); uploadAuth.mutate(e); }} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Autorisationsbevis (PDF/billede)</Label>
              <Input type="file" name="file" accept=".pdf,image/*" className="mt-1.5 rounded-xl" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Udløbsdato</Label>
              <Input type="date" name="expiry_date" defaultValue={authDoc?.expiry_date || ""} className="mt-1.5 rounded-xl" />
            </div>
            <Button type="submit" disabled={uploadAuth.isPending} className="rounded-xl gap-2">
              <Upload size={15} /> {uploadAuth.isPending ? "Uploader..." : "Upload"}
            </Button>
          </form>
        </motion.div>

        {/* Section: KLS-håndbog */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground">KLS-håndbog</h2>
              <p className="text-xs text-muted-foreground">Virksomhedens kvalitetsledelses-håndbog</p>
            </div>
          </div>

          {klsDoc?.file_url ? (
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{klsDoc.document_name}</p>
                  <p className="text-xs text-muted-foreground">Uploadet {klsDoc.uploaded_at ? format(new Date(klsDoc.uploaded_at), "d. MMM yyyy", { locale: da }) : "–"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={klsDoc.file_url} target="_blank" rel="noopener" download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Download size={13} /> Download
                </a>
                <button onClick={() => { if (confirm("Er du sikker på at du vil slette KLS-håndbogen?")) deleteKls.mutate(); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 size={13} /> Slet
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 mb-4">
              <BookOpen size={28} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen KLS-håndbog uploadet endnu</p>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{klsDoc ? "Erstat med nyt dokument" : "Upload KLS-håndbog"} (PDF/Word)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadKls.mutate(f); }}
                className="mt-1.5 rounded-xl"
              />
            </div>
            {uploadKls.isPending && <p className="text-xs text-muted-foreground pb-2">Uploader...</p>}
          </div>
        </motion.div>

        {/* Section B: KLS Audit */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10">
                <ClipboardCheck size={18} className="text-success" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground">KLS-audit</h2>
                <p className="text-xs text-muted-foreground">Årlig intern audit af kvalitetsstyringssystemet</p>
              </div>
            </div>
            <Button onClick={() => { setAuditAnswers(AUDIT_QUESTIONS.map(q => ({ question: q, answer: false, comment: "" }))); setShowAudit(true); }} className="rounded-xl gap-2">
              <ClipboardCheck size={15} /> Gennemfør årets audit
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Seneste audit</p>
              <p className="text-lg font-bold text-foreground">{lastAuditDate ? format(lastAuditDate, "d. MMM yyyy", { locale: da }) : "Ingen"}</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Næste audit</p>
              <p className="text-lg font-bold text-foreground">{nextAuditDate ? format(nextAuditDate, "d. MMM yyyy", { locale: da }) : "–"}</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${monthsSinceAudit >= 11 ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20"}`}>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className={`text-lg font-bold ${monthsSinceAudit >= 11 ? "text-destructive" : "text-success"}`}>
                {monthsSinceAudit >= 12 ? "Overskredet!" : monthsSinceAudit >= 11 ? "Snart forfald" : "OK"}
              </p>
            </div>
          </div>

          {(audits?.length || 0) > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tidligere audits</p>
              {audits?.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5 border border-border/50">
                  <span className="text-sm font-medium text-foreground">{format(new Date(a.audit_date), "d. MMM yyyy", { locale: da })}</span>
                  <span className="text-xs text-muted-foreground">{(a.answers as any[])?.filter((ans: any) => ans.answer).length}/{(a.answers as any[])?.length || 0} godkendt</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Section C: Instruments */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10">
                <Wrench size={18} className="text-warning" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground">Måleinstrumenter & kalibrering</h2>
                <p className="text-xs text-muted-foreground">Oversigt over virksomhedens måleinstrumenter</p>
              </div>
            </div>
            <Button onClick={() => { setEditInstrument(null); setInstrForm({ name: "", serial_number: "", last_calibrated: "", next_calibration: "", certificate_url: "" }); setShowInstrument(true); }} className="rounded-xl gap-2">
              <Plus size={15} /> Tilføj instrument
            </Button>
          </div>

          {(instruments?.length || 0) > 0 ? (
            <div className="space-y-3">
              {instruments?.map(inst => {
                const status = getCalibrationStatus(inst.next_calibration);
                return (
                  <div key={inst.id} className={`rounded-xl border p-4 flex items-center justify-between ${status === "red" ? "bg-destructive/5 border-destructive/20" : status === "yellow" ? "bg-warning/5 border-warning/20" : "bg-success/5 border-success/20"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${status === "red" ? "bg-destructive" : status === "yellow" ? "bg-warning" : "bg-success"}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">S/N: {inst.serial_number || "–"} · Næste kalibrering: {inst.next_calibration ? format(new Date(inst.next_calibration), "d. MMM yyyy", { locale: da }) : "–"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.certificate_url && <a href={inst.certificate_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">Certifikat</a>}
                      <button onClick={() => { setEditInstrument(inst); setInstrForm({ name: inst.name, serial_number: inst.serial_number || "", last_calibrated: inst.last_calibrated || "", next_calibration: inst.next_calibration || "", certificate_url: inst.certificate_url || "" }); setShowInstrument(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteInstrument.mutate(inst.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench size={28} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen instrumenter tilføjet endnu</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Audit Dialog */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
              <ClipboardCheck size={18} className="text-success" /> Gennemfør KLS-audit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {auditAnswers.map((a, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground mb-3">{a.question}</p>
                <div className="flex gap-3 mb-2">
                  <button type="button" onClick={() => { const n = [...auditAnswers]; n[i].answer = true; setAuditAnswers(n); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${a.answer ? "bg-success/15 text-success border border-success/30" : "bg-muted text-muted-foreground"}`}>
                    <CheckCircle2 size={14} /> Ja
                  </button>
                  <button type="button" onClick={() => { const n = [...auditAnswers]; n[i].answer = false; setAuditAnswers(n); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!a.answer ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-muted text-muted-foreground"}`}>
                    <XCircle size={14} /> Nej
                  </button>
                </div>
                <Input placeholder="Kommentar (valgfrit)" value={a.comment} onChange={(e) => { const n = [...auditAnswers]; n[i].comment = e.target.value; setAuditAnswers(n); }} className="rounded-xl h-9 text-xs" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAudit(false)} className="rounded-xl">Annuller</Button>
              <Button onClick={() => saveAudit.mutate()} disabled={saveAudit.isPending} className="rounded-xl gap-2">
                {saveAudit.isPending ? "Gemmer..." : "Gem audit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instrument Dialog */}
      <Dialog open={showInstrument} onOpenChange={(o) => { if (!o) { setShowInstrument(false); setEditInstrument(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">
              {editInstrument ? "Rediger instrument" : "Tilføj instrument"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveInstrument.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Navn</Label>
              <Input value={instrForm.name} onChange={e => setInstrForm({ ...instrForm, name: e.target.value })} placeholder="Fx Installationstester Fluke 1664" className="mt-1.5 rounded-xl h-11" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Serienummer</Label>
              <Input value={instrForm.serial_number} onChange={e => setInstrForm({ ...instrForm, serial_number: e.target.value })} className="mt-1.5 rounded-xl h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sidst kalibreret</Label>
                <Input type="date" value={instrForm.last_calibrated} onChange={e => setInstrForm({ ...instrForm, last_calibrated: e.target.value })} className="mt-1.5 rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Næste kalibrering</Label>
                <Input type="date" value={instrForm.next_calibration} onChange={e => setInstrForm({ ...instrForm, next_calibration: e.target.value })} className="mt-1.5 rounded-xl h-11" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kalibreringscertifikat</Label>
              <Input type="file" accept=".pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadInstrCert(f); }} className="mt-1.5 rounded-xl" />
              {instrForm.certificate_url && <p className="text-xs text-success mt-1">✓ Certifikat uploadet</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setShowInstrument(false); setEditInstrument(null); }} className="rounded-xl">Annuller</Button>
              <Button type="submit" disabled={saveInstrument.isPending} className="rounded-xl">
                {saveInstrument.isPending ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
