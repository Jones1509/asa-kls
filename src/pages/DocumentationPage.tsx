import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FolderOpen,
  Search,
  ChevronLeft,
  FileText,
  ClipboardCheck,
  Download,
  Trash2,
  Upload,
  CheckCircle2,
  File,
  Plus,
  Clock,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { normalizeCaseOptions, type CustomerCaseOption } from "@/lib/case-options";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

type StatusTone = {
  label: string;
  icon: typeof Clock;
  className: string;
};

type CustomerFolder = {
  key: string;
  label: string;
  customerName: string;
  customerNumber: string | null;
  cases: CustomerCaseOption[];
  totalDocuments: number;
};

const verificationStatusConfig: Record<string, StatusTone> = {
  Afventer: {
    label: "Afventer",
    icon: Clock,
    className: "bg-warning/10 text-warning border border-warning/20",
  },
  Godkendt: {
    label: "Godkendt",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border border-success/20",
  },
  Afvist: {
    label: "Afvist",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

function getCustomerFolderKey(caseItem: CustomerCaseOption) {
  return caseItem.customer_id || caseItem.customer || caseItem.id;
}

function getCustomerFolderLabel(caseItem: CustomerCaseOption) {
  const customerName = caseItem.customer?.trim() || "Ukendt kunde";
  const customerNumber = caseItem.customer_number?.trim() || null;
  return customerNumber ? `${customerNumber} · ${customerName}` : customerName;
}

function isPdfFile(file: File | null) {
  if (!file) return false;
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default function DocumentationPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<CustomerCaseOption | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const verificationFileRef = useRef<HTMLInputElement>(null);
  const [verificationImageFiles, setVerificationImageFiles] = useState<File[]>([]);
  const [verificationImagePreviews, setVerificationImagePreviews] = useState<string[]>([]);
  const [verificationForm, setVerificationForm] = useState({
    form_type: "",
    description: "",
    installation_type: "",
    measurements: "",
    comments: "",
    form_date: new Date().toISOString().split("T")[0],
    form_time: new Date().toTimeString().slice(0, 5),
  });

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["cases_for_docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          customer,
          customer_id,
          case_description,
          status,
          customers (
            customer_number
          )
        `)
        .order("case_number");

      if (error) throw error;

      return normalizeCaseOptions(data as any[]).filter(
        (caseItem) => caseItem.customer?.trim() !== "ASA ApS",
      );
    },
  });

  const { data: caseVerificationForms } = useQuery({
    queryKey: ["case_verification_forms", selectedCase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_forms")
        .select("*, profiles!verification_forms_user_id_fkey(full_name)")
        .eq("case_id", selectedCase!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCase,
  });

  const { data: caseDocuments } = useQuery({
    queryKey: ["documentation_case_documents", selectedCase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation")
        .select("*, profiles:user_id(full_name)")
        .eq("case_id", selectedCase!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCase,
  });

  const { data: docCounts } = useQuery({
    queryKey: ["documentation_case_counts"],
    queryFn: async () => {
      const [verificationRes, docsRes] = await Promise.all([
        supabase.from("verification_forms").select("case_id"),
        supabase.from("documentation").select("case_id"),
      ]);

      const counts: Record<string, number> = {};
      (verificationRes.data || []).forEach((row) => {
        counts[row.case_id] = (counts[row.case_id] || 0) + 1;
      });
      (docsRes.data || []).forEach((row) => {
        counts[row.case_id] = (counts[row.case_id] || 0) + 1;
      });

      return counts;
    },
  });

  const customerFolders = useMemo(() => {
    const grouped = new Map<string, CustomerFolder>();

    (cases || []).forEach((caseItem) => {
      const key = getCustomerFolderKey(caseItem);
      const existing = grouped.get(key);

      if (existing) {
        existing.cases.push(caseItem);
        existing.totalDocuments += docCounts?.[caseItem.id] || 0;
        return;
      }

      grouped.set(key, {
        key,
        label: getCustomerFolderLabel(caseItem),
        customerName: caseItem.customer?.trim() || "Ukendt kunde",
        customerNumber: caseItem.customer_number?.trim() || null,
        cases: [caseItem],
        totalDocuments: docCounts?.[caseItem.id] || 0,
      });
    });

    return Array.from(grouped.values())
      .map((folder) => ({
        ...folder,
        cases: [...folder.cases].sort((a, b) => (a.case_number || "").localeCompare(b.case_number || "", "da-DK", { numeric: true })),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "da-DK", { numeric: true }));
  }, [cases, docCounts]);

  const selectedCustomer = useMemo(
    () => customerFolders.find((folder) => folder.key === selectedCustomerKey) || null,
    [customerFolders, selectedCustomerKey],
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customerFolders;

    return customerFolders.filter((folder) => {
      const matchesCustomer =
        folder.label.toLowerCase().includes(query) ||
        folder.customerName.toLowerCase().includes(query) ||
        (folder.customerNumber || "").toLowerCase().includes(query);

      const matchesCase = folder.cases.some(
        (caseItem) =>
          (caseItem.case_number || "").toLowerCase().includes(query) ||
          (caseItem.case_description || "").toLowerCase().includes(query),
      );

      return matchesCustomer || matchesCase;
    });
  }, [customerFolders, search]);

  const filteredCases = useMemo(() => {
    if (!selectedCustomer) return [];

    const query = search.trim().toLowerCase();
    if (!query) return selectedCustomer.cases;

    return selectedCustomer.cases.filter(
      (caseItem) =>
        (caseItem.case_number || "").toLowerCase().includes(query) ||
        (caseItem.case_description || "").toLowerCase().includes(query),
    );
  }, [search, selectedCustomer]);

  const resetVerificationForm = () => {
    setVerificationForm({
      form_type: "",
      description: "",
      installation_type: "",
      measurements: "",
      comments: "",
      form_date: new Date().toISOString().split("T")[0],
      form_time: new Date().toTimeString().slice(0, 5),
    });
    setVerificationImageFiles([]);
    setVerificationImagePreviews([]);
  };

  const handleVerificationImageAdd = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setVerificationImageFiles((prev) => [...prev, ...files]);
    setVerificationImagePreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removeVerificationImage = (index: number) => {
    setVerificationImageFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setVerificationImagePreviews((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const uploadPdf = useMutation({
    mutationFn: async () => {
      if (!user || !selectedCase) throw new Error("Vælg først en sag");
      if (!isPdfFile(docFile)) throw new Error("Upload kun PDF-filer til sagsmappen");

      const path = `documentation/${user.id}/${Date.now()}-${docFile!.name}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, docFile!);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      const { error: insertError } = await supabase.from("documentation").insert({
        user_id: user.id,
        case_id: selectedCase.id,
        type: "PDF",
        title: uploadForm.title.trim() || docFile!.name.replace(/\.pdf$/i, ""),
        description: uploadForm.description.trim() || null,
        file_url: data.publicUrl,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation_case_documents", selectedCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["documentation_case_counts"] });
      setUploadOpen(false);
      setUploadForm({ title: "", description: "" });
      setDocFile(null);
      toast.success("PDF uploadet til sagen");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createVerificationForm = useMutation({
    mutationFn: async () => {
      if (!user || !selectedCase) throw new Error("Vælg først en sag");

      const imageUrls: string[] = [];
      for (const imageFile of verificationImageFiles) {
        const path = `verification/${user.id}/${Date.now()}-${imageFile.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, imageFile);
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        imageUrls.push(data.publicUrl);
      }

      const isAdmin = role === "admin";
      const { error } = await supabase.from("verification_forms").insert({
        user_id: user.id,
        case_id: selectedCase.id,
        form_type: verificationForm.form_type,
        description: verificationForm.description || null,
        installation_type: verificationForm.installation_type || null,
        measurements: verificationForm.measurements || null,
        comments: verificationForm.comments || null,
        form_date: verificationForm.form_date,
        form_time: verificationForm.form_time || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        status: isAdmin ? "Godkendt" : "Afventer",
        approved_by: isAdmin ? user.id : null,
        approved_at: isAdmin ? new Date().toISOString() : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_verification_forms", selectedCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["documentation_case_counts"] });
      setVerificationOpen(false);
      resetVerificationForm();
      toast.success(role === "admin" ? "Verifikationsskema oprettet" : "Verifikationsskema sendt til godkendelse");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("documentation").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation_case_documents", selectedCase?.id] });
      queryClient.invalidateQueries({ queryKey: ["documentation_case_counts"] });
      toast.success("Dokument slettet");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (selectedCase) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedCase(null);
            setSearch("");
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={16} /> Tilbage til sager
        </button>

        <PageHeader
          title={formatCaseLabel(selectedCase)}
          description="Sagsmappe med verifikationsskemaer og PDF-dokumenter"
        >
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setVerificationOpen(true)} className="gap-2 rounded-xl">
              <Plus size={14} /> Nyt verifikationsskema
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
              <Upload size={14} /> Upload PDF
            </Button>
          </div>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Verifikationsskemaer</h2>
              <span className="text-xs text-muted-foreground">
                {(caseVerificationForms || []).length} {(caseVerificationForms || []).length === 1 ? "skema" : "skemaer"}
              </span>
            </div>

            {(caseVerificationForms || []).length > 0 ? (
              <div className="space-y-2">
                {(caseVerificationForms || []).map((formItem: any, index: number) => {
                  const status = verificationStatusConfig[formItem.status] || verificationStatusConfig.Afventer;
                  const StatusIcon = status.icon;

                  return (
                    <motion.div
                      key={formItem.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-2xl border border-border bg-card p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <ClipboardCheck size={18} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-card-foreground">{formItem.form_type}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {(formItem.profiles as any)?.full_name || "Ukendt"} · {formItem.form_date}
                            </p>
                            {formItem.description && (
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">{formItem.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>
                          <StatusIcon size={11} /> {status.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <ClipboardCheck size={26} className="mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">Ingen verifikationsskemaer endnu</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Opret det første skema direkte i denne sagsmappe.</p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PDF-dokumenter</h2>
              <span className="text-xs text-muted-foreground">
                {(caseDocuments || []).length} {(caseDocuments || []).length === 1 ? "fil" : "filer"}
              </span>
            </div>

            {(caseDocuments || []).length > 0 ? (
              <div className="space-y-2">
                {(caseDocuments || []).map((doc: any, index: number) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted/40">
                          <File size={18} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-card-foreground">{doc.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {(doc.profiles as any)?.full_name || "Ukendt"} · {doc.created_at?.split("T")[0]} · PDF
                          </p>
                          {doc.description && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            aria-label={`Åbn PDF ${doc.title}`}
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {role === "admin" && (
                          <button
                            onClick={() => deleteDoc.mutate(doc.id)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Slet dokument ${doc.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <FileText size={26} className="mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">Ingen PDF-dokumenter endnu</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Upload PDF-filer direkte til denne sag.</p>
              </div>
            )}
          </section>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">Upload PDF til {formatCaseLabel(selectedCase)}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(event) => {
              event.preventDefault();
              uploadPdf.mutate();
            }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Titel</Label>
                <Input
                  value={uploadForm.title}
                  onChange={(event) => setUploadForm({ ...uploadForm, title: event.target.value })}
                  placeholder="Fx installationsrapport"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beskrivelse</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(event) => setUploadForm({ ...uploadForm, description: event.target.value })}
                  placeholder="Kort note om dokumentet..."
                  className="mt-1.5 rounded-xl"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PDF-fil</Label>
                <div className="mt-1.5 space-y-2">
                  {docFile ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                      <File size={16} className="text-muted-foreground" />
                      <span className="flex-1 truncate text-sm text-foreground">{docFile.name}</span>
                      <button type="button" onClick={() => setDocFile(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Fjern
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => docFileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Upload size={16} /> Vælg PDF
                    </button>
                  )}
                  <input
                    ref={docFileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setDocFile(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">Kun PDF-format kan uploades i sagsmappen.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} className="rounded-xl">
                  Annuller
                </Button>
                <Button type="submit" disabled={uploadPdf.isPending || !isPdfFile(docFile)} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {uploadPdf.isPending ? "Uploader..." : "Upload PDF"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">Nyt verifikationsskema til {formatCaseLabel(selectedCase)}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(event) => {
              event.preventDefault();
              createVerificationForm.mutate();
            }} className="space-y-4">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Skematype</Label>
                <Input
                  value={verificationForm.form_type}
                  onChange={(event) => setVerificationForm({ ...verificationForm, form_type: event.target.value })}
                  placeholder="Brandtætning, EL-check, isolering..."
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beskrivelse af udført arbejde</Label>
                <Textarea
                  value={verificationForm.description}
                  onChange={(event) => setVerificationForm({ ...verificationForm, description: event.target.value })}
                  placeholder="Beskriv det udførte arbejde..."
                  className="mt-1.5 rounded-xl"
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Installationstype</Label>
                  <Input
                    value={verificationForm.installation_type}
                    onChange={(event) => setVerificationForm({ ...verificationForm, installation_type: event.target.value })}
                    placeholder="Type af installation"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dato</Label>
                  <Input
                    type="date"
                    value={verificationForm.form_date}
                    onChange={(event) => setVerificationForm({ ...verificationForm, form_date: event.target.value })}
                    className="mt-1.5 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tidspunkt</Label>
                  <Input
                    type="time"
                    value={verificationForm.form_time}
                    onChange={(event) => setVerificationForm({ ...verificationForm, form_time: event.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Måleresultater</Label>
                  <Input
                    value={verificationForm.measurements}
                    onChange={(event) => setVerificationForm({ ...verificationForm, measurements: event.target.value })}
                    placeholder="Evt. måleværdier"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bemærkninger</Label>
                <Textarea
                  value={verificationForm.comments}
                  onChange={(event) => setVerificationForm({ ...verificationForm, comments: event.target.value })}
                  placeholder="Eventuelle bemærkninger..."
                  className="mt-1.5 rounded-xl"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Billeder (valgfrit)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {verificationImagePreviews.map((src, index) => (
                    <div key={index} className="relative h-16 w-16 overflow-hidden rounded-xl border border-border">
                      <img src={src} alt={`Forhåndsvisning ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeVerificationImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => verificationFileRef.current?.click()}
                    className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Plus size={18} />
                  </button>
                  <input
                    ref={verificationFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handleVerificationImageAdd}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setVerificationOpen(false)} className="rounded-xl">
                  Annuller
                </Button>
                <Button type="submit" disabled={createVerificationForm.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {createVerificationForm.isPending ? "Gemmer..." : role === "admin" ? "Opret skema" : "Send til godkendelse"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedCustomerKey(null);
            setSearch("");
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={16} /> Tilbage til kunder
        </button>

        <PageHeader
          title={selectedCustomer.label}
          description="Vælg den sag du vil åbne dokumentation for"
        />

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søg sager..."
            className="h-11 rounded-xl pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCases.map((caseItem, index) => {
            const count = docCounts?.[caseItem.id] || 0;
            return (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedCase(caseItem)}
                className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <FolderOpen size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-card-foreground">{formatCaseLabel(caseItem)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">Sagsmappe</p>
                    <p className="mt-2 text-[11px] text-muted-foreground/60">
                      {count} {count === 1 ? "dokument/skema" : "dokumenter/skemaer"}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {!casesLoading && filteredCases.length === 0 && (
          <div className="py-16 text-center">
            <FolderOpen size={40} className="mx-auto mb-4 text-muted-foreground/15" />
            <p className="text-sm font-medium text-muted-foreground">Ingen sager fundet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dokumentation" description="Vælg først kunden og derefter den specifikke sag" />

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Søg kunder..."
          className="h-11 rounded-xl pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {casesLoading && [1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-36 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.map((customer, index) => (
          <motion.div
            key={customer.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => {
              setSelectedCustomerKey(customer.key);
              setSearch("");
            }}
            className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <FolderOpen size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-card-foreground">{customer.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Kundemappe</p>
                <p className="mt-2 text-[11px] text-muted-foreground/60">
                  {customer.cases.length} {customer.cases.length === 1 ? "sag" : "sager"} · {customer.totalDocuments} {customer.totalDocuments === 1 ? "dokument/skema" : "dokumenter/skemaer"}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!casesLoading && filteredCustomers.length === 0 && (
        <div className="py-16 text-center">
          <FolderOpen size={40} className="mx-auto mb-4 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground">Ingen kunder fundet</p>
        </div>
      )}
    </div>
  );
}
