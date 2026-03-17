import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Upload, CheckCircle2, XCircle, AlertTriangle, Plus, Pencil, Trash2, FileText, Wrench, ClipboardCheck, BookOpen, Download, CloudUpload } from "lucide-react";
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

/* ---------- Upload Drop Zone ---------- */
function UploadZone({ onFile, accept, label, loading }: { onFile: (f: File) => void; accept: string; label: string; loading?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <CloudUpload size={28} className="mx-auto text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{loading ? "Uploader..." : label}</p>
      <p className="text-[11px] text-muted-foreground/50 mt-1">Træk og slip eller klik for at vælge fil</p>
    </div>
  );
}

/* ---------- Status Indicator ---------- */
function StatusDot({ status }: { status: "ok" | "warning" | "error" | "none" }) {
  if (status === "ok") return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15"><CheckCircle2 size={16} className="text-success" /></div>;
  if (status === "warning") return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15"><AlertTriangle size={16} className="text-warning" /></div>;
  if (status === "error") return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15"><XCircle size={16} className="text-destructive" /></div>;
  return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /></div>;
}

export default function CompanyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAudit, setShowAudit] = useState(false);
  const [auditAnswers, setAuditAnswers] = useState(AUDIT_QUESTIONS.map(q => ({ question: q, answer: false, comment: "" })));
  const [showInstrument, setShowInstrument] = useState(false);
  const [editInstrument, setEditInstrument] = useState<any>(null);
  const [instrForm, setInstrForm] = useState({ name: "", serial_number: "", last_calibrated: "", next_calibration: "", certificate_url: "" });
  const [authExpiryInput, setAuthExpiryInput] = useState("");

  // Company docs
  const { data: companyDocs } = useQuery({
    queryKey: ["company_documents"],
    queryFn: async () => {
      const { data } = await supabase.from("company_documents").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: audits } = useQuery({
    queryKey: ["audit_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_reports").select("*").order("audit_date", { ascending: false });
      return data || [];
    },
  });

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

  // Statuses
  const authStatus: "ok" | "warning" | "error" | "none" = !authDoc?.file_url ? "error" : authDaysLeft !== null ? (authDaysLeft < 0 ? "error" : authDaysLeft < 60 ? "warning" : "ok") : "ok";
  const klsStatus: "ok" | "warning" | "error" | "none" = klsDoc?.file_url ? "ok" : "error";
  const auditStatus: "ok" | "warning" | "error" | "none" = monthsSinceAudit >= 12 ? "error" : monthsSinceAudit >= 11 ? "warning" : monthsSinceAudit === 999 ? "none" : "ok";

  const instrumentsExpiring = instruments?.filter(i => {
    if (!i.next_calibration) return false;
    return differenceInDays(new Date(i.next_calibration), new Date()) <= 30;
  }).length || 0;

  // Mutations
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

  const uploadAuth = useMutation({
    mutationFn: async (file: File) => {
      const path = `company/autorisation_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const expiryDate = authExpiryInput || null;
      if (authDoc) {
        await supabase.from("company_documents").update({ file_url: urlData.publicUrl, document_name: file.name, expiry_date: expiryDate, uploaded_at: new Date().toISOString() }).eq("id", authDoc.id);
      } else {
        await supabase.from("company_documents").insert({ document_type: "autorisation", document_name: file.name, file_url: urlData.publicUrl, expiry_date: expiryDate, created_by: user!.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_documents"] }); toast.success("Autorisationsbevis uploadet"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAudit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("audit_reports").insert({ audit_date: new Date().toISOString().split("T")[0], answers: auditAnswers as any, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["audit_reports"] }); setShowAudit(false); toast.success("Audit gemt"); },
    onError: (e: any) => toast.error(e.message),
  });

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

  // Sort instruments: expired first
  const sortedInstruments = [...(instruments || [])].sort((a, b) => {
    const sa = getCalibrationStatus(a.next_calibration);
    const sb = getCalibrationStatus(b.next_calibration);
    const order = { red: 0, yellow: 1, green: 2, gray: 3 };
    return (order[sa] ?? 3) - (order[sb] ?? 3);
  });

  return (
    <div>
      <PageHeader title="KLS Dokumentation" description="Autorisation, KLS-audit og måleinstrumenter" />

      {/* ========== STATUS BAR ========== */}
      <motion.div variants={item} initial="hidden" animate="show" className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Autorisation", status: authStatus, detail: authStatus === "ok" ? `${authDaysLeft}d tilbage` : authStatus === "warning" ? `${authDaysLeft}d tilbage` : !authDoc?.file_url ? "Mangler" : "Udløbet" },
          { label: "KLS-håndbog", status: klsStatus, detail: klsStatus === "ok" ? "Uploadet" : "Mangler" },
          { label: "KLS-audit", status: auditStatus, detail: auditStatus === "ok" ? "OK" : auditStatus === "warning" ? "Snart forfald" : monthsSinceAudit === 999 ? "Aldrig udført" : "Overskredet" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <StatusDot status={s.status} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold ${s.status === "ok" ? "text-success" : s.status === "warning" ? "text-warning" : s.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {s.detail}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="space-y-8">
        {/* ========== AUTORISATION ========== */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Shield size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground">Autorisation</h2>
              <p className="text-xs text-muted-foreground">Autorisationsbevis fra Sikkerhedsstyrelsen</p>
            </div>
          </div>

          {authDoc?.file_url ? (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{authDoc.document_name}</p>
                    <p className="text-[11px] text-muted-foreground">Uploadet {authDoc.uploaded_at ? format(new Date(authDoc.uploaded_at), "d. MMM yyyy", { locale: da }) : "–"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {authDaysLeft !== null && (
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${authDaysLeft < 0 ? "bg-destructive/10 text-destructive" : authDaysLeft < 60 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {authDaysLeft < 0 ? "Udløbet" : `${authDaysLeft} dage`}
                    </span>
                  )}
                  <a href={authDoc.file_url} target="_blank" rel="noopener" download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Download size={13} /> Download
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Udløbsdato</Label>
                  <Input type="date" value={authExpiryInput || authDoc.expiry_date || ""} onChange={(e) => setAuthExpiryInput(e.target.value)} className="mt-1.5" />
                </div>
                <UploadZone onFile={(f) => uploadAuth.mutate(f)} accept=".pdf,image/*" label="Erstat dokument" loading={uploadAuth.isPending} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end mb-2">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Udløbsdato</Label>
                  <Input type="date" value={authExpiryInput} onChange={(e) => setAuthExpiryInput(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <UploadZone onFile={(f) => uploadAuth.mutate(f)} accept=".pdf,image/*" label="Upload autorisationsbevis" loading={uploadAuth.isPending} />
            </div>
          )}
        </motion.div>

        {/* ========== KLS-HÅNDBOG ========== */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
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
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{klsDoc.document_name}</p>
                    <p className="text-[11px] text-muted-foreground">Uploadet {klsDoc.uploaded_at ? format(new Date(klsDoc.uploaded_at), "d. MMM yyyy", { locale: da }) : "–"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={klsDoc.file_url} target="_blank" rel="noopener" download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Download size={13} /> Download
                  </a>
                  <button onClick={() => deleteKls.mutate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Trash2 size={13} /> Slet
                  </button>
                </div>
              </div>
              <UploadZone onFile={(f) => uploadKls.mutate(f)} accept=".pdf,.doc,.docx" label="Erstat med nyt dokument" loading={uploadKls.isPending} />
            </>
          ) : (
            <UploadZone onFile={(f) => uploadKls.mutate(f)} accept=".pdf,.doc,.docx" label="Upload KLS-håndbog (PDF/Word)" loading={uploadKls.isPending} />
          )}
        </motion.div>

        {/* ========== KLS-AUDIT ========== */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${auditStatus === "ok" ? "bg-success/10" : auditStatus === "warning" ? "bg-warning/10" : "bg-destructive/10"}`}>
                <ClipboardCheck size={18} className={auditStatus === "ok" ? "text-success" : auditStatus === "warning" ? "text-warning" : "text-destructive"} />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground">KLS-audit</h2>
                <p className="text-xs text-muted-foreground">Årlig intern audit af kvalitetsstyringssystemet</p>
              </div>
            </div>
          </div>

          {/* Audit status card */}
          <div className={`rounded-xl border p-5 mb-5 ${auditStatus === "ok" ? "bg-success/5 border-success/20" : auditStatus === "warning" ? "bg-warning/5 border-warning/20" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Seneste audit</p>
                  <p className="text-lg font-bold font-heading text-foreground tabular-nums">{lastAuditDate ? format(lastAuditDate, "d. MMM yyyy", { locale: da }) : "Aldrig gennemført"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Næste audit</p>
                  <p className="text-lg font-bold font-heading text-foreground tabular-nums">{nextAuditDate ? format(nextAuditDate, "d. MMM yyyy", { locale: da }) : "–"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-extrabold font-heading ${auditStatus === "ok" ? "text-success" : auditStatus === "warning" ? "text-warning" : "text-destructive"}`}>
                  {monthsSinceAudit >= 12 ? "Overskredet!" : monthsSinceAudit >= 11 ? "Snart forfald" : monthsSinceAudit === 999 ? "Mangler" : "OK"}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => { setAuditAnswers(AUDIT_QUESTIONS.map(q => ({ question: q, answer: false, comment: "" }))); setShowAudit(true); }}
            variant={auditStatus === "ok" ? "outline" : "default"}
            className="rounded-xl gap-2 w-full sm:w-auto"
          >
            <ClipboardCheck size={15} /> Gennemfør årets audit
          </Button>

          {(audits?.length || 0) > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tidligere audits</p>
              {audits?.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5 border border-border/50">
                  <span className="text-sm font-medium text-foreground tabular-nums">{format(new Date(a.audit_date), "d. MMM yyyy", { locale: da })}</span>
                  <span className="text-xs text-muted-foreground">{(a.answers as any[])?.filter((ans: any) => ans.answer).length}/{(a.answers as any[])?.length || 0} godkendt</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ========== INSTRUMENTS ========== */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10">
                <Wrench size={18} className="text-warning" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground">Måleinstrumenter</h2>
                <p className="text-xs text-muted-foreground">
                  {instruments?.length ? `${instruments.length} instrumenter${instrumentsExpiring > 0 ? ` · ${instrumentsExpiring} kræver kalibrering` : ""}` : "Oversigt over virksomhedens måleinstrumenter"}
                </p>
              </div>
            </div>
            {(instruments?.length || 0) > 0 && (
              <Button onClick={() => { setEditInstrument(null); setInstrForm({ name: "", serial_number: "", last_calibrated: "", next_calibration: "", certificate_url: "" }); setShowInstrument(true); }} className="rounded-xl gap-2" size="sm">
                <Plus size={14} /> Tilføj
              </Button>
            )}
          </div>

          {(instruments?.length || 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedInstruments.map(inst => {
                const status = getCalibrationStatus(inst.next_calibration);
                return (
                  <div key={inst.id} className={`rounded-xl border p-4 transition-all ${status === "red" ? "bg-destructive/5 border-destructive/20" : status === "yellow" ? "bg-warning/5 border-warning/20" : "bg-card border-border"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1 ${status === "red" ? "bg-destructive" : status === "yellow" ? "bg-warning" : "bg-success"}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{inst.name}</p>
                          {inst.serial_number && <p className="text-[11px] text-muted-foreground">S/N: {inst.serial_number}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {inst.certificate_url && <a href={inst.certificate_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg hover:bg-muted text-primary transition-colors" title="Se certifikat"><FileText size={13} /></a>}
                        <button onClick={() => { setEditInstrument(inst); setInstrForm({ name: inst.name, serial_number: inst.serial_number || "", last_calibrated: inst.last_calibrated || "", next_calibration: inst.next_calibration || "", certificate_url: inst.certificate_url || "" }); setShowInstrument(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteInstrument.mutate(inst.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Næste: {inst.next_calibration ? format(new Date(inst.next_calibration), "d. MMM yyyy", { locale: da }) : "–"}</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full ${status === "red" ? "bg-destructive/10 text-destructive" : status === "yellow" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                        {status === "red" ? "Overskredet" : status === "yellow" ? "Snart" : "OK"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Wrench size={24} className="text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Ingen instrumenter registreret endnu</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Tilføj dit første måleinstrument for at holde styr på kalibreringer</p>
              <Button onClick={() => { setEditInstrument(null); setInstrForm({ name: "", serial_number: "", last_calibrated: "", next_calibration: "", certificate_url: "" }); setShowInstrument(true); }} className="rounded-xl gap-2">
                <Plus size={15} /> Tilføj instrument
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* ========== AUDIT DIALOG ========== */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-subtle">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
                <Input placeholder="Kommentar (valgfrit)" value={a.comment} onChange={(e) => { const n = [...auditAnswers]; n[i].comment = e.target.value; setAuditAnswers(n); }} className="h-9 text-xs" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAudit(false)}>Annuller</Button>
              <Button onClick={() => saveAudit.mutate()} disabled={saveAudit.isPending}>
                {saveAudit.isPending ? "Gemmer..." : "Gem audit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== INSTRUMENT DIALOG ========== */}
      <Dialog open={showInstrument} onOpenChange={(o) => { if (!o) { setShowInstrument(false); setEditInstrument(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editInstrument ? "Rediger instrument" : "Tilføj instrument"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveInstrument.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Navn</Label>
              <Input value={instrForm.name} onChange={e => setInstrForm({ ...instrForm, name: e.target.value })} placeholder="Fx Installationstester Fluke 1664" className="mt-1.5" required />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Serienummer</Label>
              <Input value={instrForm.serial_number} onChange={e => setInstrForm({ ...instrForm, serial_number: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sidst kalibreret</Label>
                <Input type="date" value={instrForm.last_calibrated} onChange={e => setInstrForm({ ...instrForm, last_calibrated: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Næste kalibrering</Label>
                <Input type="date" value={instrForm.next_calibration} onChange={e => setInstrForm({ ...instrForm, next_calibration: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kalibreringscertifikat</Label>
              <UploadZone onFile={uploadInstrCert} accept=".pdf,image/*" label="Upload certifikat" />
              {instrForm.certificate_url && <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> Certifikat uploadet</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setShowInstrument(false); setEditInstrument(null); }}>Annuller</Button>
              <Button type="submit" disabled={saveInstrument.isPending}>
                {saveInstrument.isPending ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
