import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Search, ChevronLeft, Plus, FileText, ClipboardCheck, Download, Trash2, Upload, ImagePlus, X, CheckCircle2, File } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DocumentationPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", type: "Andet" });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [docFile, setDocFile] = useState<File | null>(null);

  // Cases with document counts
  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["cases_for_docs"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("id, case_number, customer, status").order("case_number");
      return data || [];
    },
  });

  // Approved verification forms for selected case
  const { data: verificationForms } = useQuery({
    queryKey: ["verification_docs", selectedCase?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_forms")
        .select("*, profiles!verification_forms_user_id_fkey(full_name)")
        .eq("case_id", selectedCase!.id)
        .eq("status", "Godkendt")
        .order("approved_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedCase,
  });

  // Other documents for selected case
  const { data: otherDocs } = useQuery({
    queryKey: ["documentation", selectedCase?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentation")
        .select("*, profiles:user_id(full_name)")
        .eq("case_id", selectedCase!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedCase,
  });

  // Count documents per case
  const { data: docCounts } = useQuery({
    queryKey: ["doc_counts"],
    queryFn: async () => {
      const [vfRes, docRes] = await Promise.all([
        supabase.from("verification_forms").select("case_id").eq("status", "Godkendt"),
        supabase.from("documentation").select("case_id"),
      ]);
      const counts: Record<string, number> = {};
      (vfRes.data || []).forEach(r => { counts[r.case_id] = (counts[r.case_id] || 0) + 1; });
      (docRes.data || []).forEach(r => { counts[r.case_id] = (counts[r.case_id] || 0) + 1; });
      return counts;
    },
  });

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
    files.forEach(f => setUploadPreviews(prev => [...prev, URL.createObjectURL(f)]));
  };

  const removeImage = (idx: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
    setUploadPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadDoc = useMutation({
    mutationFn: async () => {
      let image_urls: string[] = [];
      for (const file of uploadFiles) {
        const path = `documentation/${user!.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        image_urls.push(data.publicUrl);
      }

      let file_url: string | null = null;
      if (docFile) {
        const path = `documentation/${user!.id}/${Date.now()}-${docFile.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, docFile);
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        file_url = data.publicUrl;
      }

      const { error } = await supabase.from("documentation").insert({
        user_id: user!.id,
        case_id: selectedCase!.id,
        type: uploadForm.type,
        title: uploadForm.title || docFile?.name || "Dokument",
        description: uploadForm.description || null,
        image_urls: image_urls.length > 0 ? image_urls : null,
        file_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation", selectedCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["doc_counts"] });
      setUploadOpen(false);
      setUploadForm({ title: "", description: "", type: "Andet" });
      setUploadFiles([]);
      setUploadPreviews([]);
      setDocFile(null);
      toast.success("Dokument uploadet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("documentation").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation", selectedCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["doc_counts"] });
      toast.success("Dokument slettet");
    },
  });

  const filteredCases = cases?.filter(c => {
    if (c.customer === "ASA ApS") return false;

    return (
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.customer.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Case folder view
  if (selectedCase) {
    return (
      <div>
        <button onClick={() => setSelectedCase(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> Tilbage til sager
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">{formatCaseLabel(selectedCase)}</h2>
            <p className="text-sm text-muted-foreground">Sagsmappe</p>
          </div>
          {role === "admin" && (
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
              <Upload size={14} /> Upload dokument
            </Button>
          )}
        </div>

        {/* Verification forms section */}
        <div className="mb-8">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Verifikationsskemaer (KLS)</h3>
          {verificationForms && verificationForms.length > 0 ? (
            <div className="space-y-2">
              {verificationForms.map((vf, i) => (
                <motion.div key={vf.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-success/20 bg-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 flex-shrink-0">
                      <ClipboardCheck size={16} className="text-success" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-card-foreground truncate">{vf.form_type}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[9px] font-bold">
                          <CheckCircle2 size={8} /> GODKENDT
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{(vf.profiles as any)?.full_name} · {vf.form_date}</p>
                    </div>
                  </div>
                  {vf.image_urls && (vf.image_urls as string[]).length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {(vf.image_urls as string[]).slice(0, 3).map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block h-8 w-8 rounded-lg overflow-hidden border border-border">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <ClipboardCheck size={24} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">Ingen godkendte verifikationsskemaer for denne sag</p>
            </div>
          )}
        </div>

        {/* Other documents section */}
        <div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Andre dokumenter</h3>
          {otherDocs && otherDocs.length > 0 ? (
            <div className="space-y-2">
              {otherDocs.map((doc, i) => (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
                      {doc.file_url ? <File size={16} className="text-muted-foreground" /> : <FileText size={16} className="text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.profiles as any)?.full_name || "–"} · {doc.created_at?.split("T")[0]}
                        {doc.type && doc.type !== "Andet" && ` · ${doc.type}`}
                      </p>
                      {doc.description && <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{doc.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.image_urls && (doc.image_urls as string[]).length > 0 && (
                      <div className="flex gap-1 mr-2">
                        {(doc.image_urls as string[]).slice(0, 2).map((url, j) => (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block h-8 w-8 rounded-lg overflow-hidden border border-border">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Download size={14} />
                      </a>
                    )}
                    {role === "admin" && (
                      <button onClick={() => deleteDoc.mutate(doc.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <FileText size={24} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">Ingen dokumenter uploadet endnu</p>
              {role === "admin" && (
                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="mt-3 rounded-xl gap-1.5">
                  <Upload size={12} /> Upload
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Upload dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Upload dokument til {selectedCase.case_number}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); uploadDoc.mutate(); }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</Label>
                <Input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Dokumenttitel..." className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Noter</Label>
                <Textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Eventuelle noter..." className="mt-1.5 rounded-xl" rows={3} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fil (valgfrit)</Label>
                <div className="mt-1.5">
                  {docFile ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                      <File size={16} className="text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{docFile.name}</span>
                      <button type="button" onClick={() => setDocFile(null)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => docFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload size={16} /> Vælg fil
                    </button>
                  )}
                  <input ref={docFileRef} type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="hidden" />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Billeder (valgfrit)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {uploadPreviews.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={10} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus size={18} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} className="rounded-xl">Annuller</Button>
                <Button type="submit" disabled={uploadDoc.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {uploadDoc.isPending ? "Uploader..." : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Case list view
  return (
    <div>
      <PageHeader title="Dokumentation" description="Centralt arkiv for al sagsdokumentation" />

      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg sager..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {casesLoading && [1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="space-y-2"><div className="h-5 w-32 rounded bg-muted" /><div className="h-4 w-24 rounded bg-muted" /><div className="h-3 w-16 rounded bg-muted mt-3" /></div>
          </div>
        ))}
        {(filteredCases || []).map((c, i) => {
          const count = docCounts?.[c.id] || 0;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedCase(c)}
              className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <FolderOpen size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-card-foreground">{c.case_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.customer}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">
                    {count} {count === 1 ? "dokument" : "dokumenter"}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!casesLoading && (!filteredCases || filteredCases.length === 0) && (
        <div className="text-center py-16">
          <FolderOpen size={40} className="mx-auto text-muted-foreground/15 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Ingen sager fundet</p>
        </div>
      )}
    </div>
  );
}
