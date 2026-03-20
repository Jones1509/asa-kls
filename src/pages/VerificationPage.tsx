import { PageHeader } from "@/components/PageHeader";
import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardCheck, CheckCircle2, XCircle, Clock, Search, ImagePlus, X, ChevronLeft, Eye, Zap, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseLabel } from "@/lib/case-format";
import { normalizeCaseOptions } from "@/lib/case-options";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import ElInstallationForm, { type ElFormData } from "@/components/verification/ElInstallationForm";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  Afventer: { color: "bg-warning/10 text-warning border border-warning/20", icon: Clock, label: "Afventer godkendelse" },
  Godkendt: { color: "bg-success/10 text-success border border-success/20", icon: CheckCircle2, label: "Godkendt" },
  Afvist: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: XCircle, label: "Afvist" },
};

export default function VerificationPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showElForm, setShowElForm] = useState(false);
  const [genericOpen, setGenericOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewForm, setViewForm] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    case_id: "",
    form_type: "",
    description: "",
    installation_type: "",
    measurements: "",
    comments: "",
    form_date: new Date().toISOString().split("T")[0],
    form_time: new Date().toTimeString().slice(0, 5),
  });

  const { data: cases } = useQuery({
    queryKey: ["cases_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          customer,
          customer_id,
          case_description,
          customers (
            customer_number
          )
        `)
        .order("case_number");
      return normalizeCaseOptions(data as any[]);
    },
  });

  const { data: forms, isLoading } = useQuery({
    queryKey: ["verification_forms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_forms")
        .select("*, cases(case_number, customer, case_description), profiles!verification_forms_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => setImagePreviews(prev => [...prev, URL.createObjectURL(f)]));
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setForm({
      case_id: "", form_type: "", description: "", installation_type: "",
      measurements: "", comments: "",
      form_date: new Date().toISOString().split("T")[0],
      form_time: new Date().toTimeString().slice(0, 5),
    });
    setImageFiles([]);
    setImagePreviews([]);
  };

  const uploadImages = async (files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `verification/${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const createForm = useMutation({
    mutationFn: async () => {
      const image_urls = await uploadImages(imageFiles);
      const isAdmin = role === "admin";
      const { error } = await supabase.from("verification_forms").insert({
        user_id: user!.id,
        case_id: form.case_id,
        form_type: form.form_type,
        description: form.description || null,
        installation_type: form.installation_type || null,
        measurements: form.measurements || null,
        comments: form.comments || null,
        form_date: form.form_date,
        form_time: form.form_time || null,
        image_urls: image_urls.length > 0 ? image_urls : null,
        status: isAdmin ? "Godkendt" : "Afventer",
        approved_by: isAdmin ? user!.id : null,
        approved_at: isAdmin ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_forms"] });
      setOpen(false);
      resetForm();
      toast.success(role === "admin" ? "Skema oprettet og godkendt" : "Skema indsendt til godkendelse");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createElForm = useMutation({
    mutationFn: async (data: ElFormData) => {
      const image_urls = await uploadImages(data.imageFiles);
      const isAdmin = role === "admin";
      const { error } = await supabase.from("verification_forms").insert({
        user_id: user!.id,
        case_id: data.case_id,
        form_type: data.form_type,
        description: data.description || null,
        installation_type: data.installation_type || null,
        comments: data.comments || null,
        form_date: data.form_date,
        form_time: data.form_time || null,
        image_urls: image_urls.length > 0 ? image_urls : null,
        items: data.items as any,
        status: isAdmin ? "Godkendt" : "Afventer",
        approved_by: isAdmin ? user!.id : null,
        approved_at: isAdmin ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_forms"] });
      setShowElForm(false);
      toast.success(role === "admin" ? "Skema oprettet og godkendt" : "Skema indsendt til godkendelse");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveForm = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase.from("verification_forms").update({
        status: "Godkendt",
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
        admin_comment: adminComment || null,
      }).eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_forms"] });
      setViewForm(null);
      setAdminComment("");
      toast.success("Skema godkendt og overført til dokumentation");
    },
  });

  const rejectForm = useMutation({
    mutationFn: async (formId: string) => {
      if (!adminComment.trim()) throw new Error("Tilføj en kommentar ved afvisning");
      const { error } = await supabase.from("verification_forms").update({
        status: "Afvist",
        admin_comment: adminComment,
      }).eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_forms"] });
      setViewForm(null);
      setAdminComment("");
      toast.success("Skema afvist — medarbejderen er notificeret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = forms?.filter(f => f.status === "Afventer") || [];
  const approvedThisMonth = forms?.filter(f => {
    if (f.status !== "Godkendt") return false;
    const now = new Date();
    const approved = new Date(f.approved_at || f.created_at);
    return approved.getMonth() === now.getMonth() && approved.getFullYear() === now.getFullYear();
  }) || [];
  const rejected = forms?.filter(f => f.status === "Afvist") || [];

  const filtered = forms?.filter(f => {
    const matchSearch =
      f.form_type?.toLowerCase().includes(search.toLowerCase()) ||
      (f.cases as any)?.case_number?.toLowerCase().includes(search.toLowerCase()) ||
      (f.cases as any)?.customer?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // El-installation full-page form
  if (showElForm) {
    return (
      <div>
        <button onClick={() => setShowElForm(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> Tilbage til oversigt
        </button>
        <div className="max-w-3xl">
          <h1 className="text-xl font-heading font-bold text-foreground mb-1">Elinstallation – Verifikation</h1>
          <p className="text-sm text-muted-foreground mb-6">Udfyld tjekliste og måleresultater for den udførte elinstallation</p>
          <ElInstallationForm
            cases={(cases as any) || []}
            onSubmit={(data) => createElForm.mutate(data)}
            isPending={createElForm.isPending}
            isAdmin={role === "admin"}
            onCancel={() => setShowElForm(false)}
          />
        </div>
      </div>
    );
  }

  // Detail view
  if (viewForm) {
    const f = viewForm;
    const cfg = statusConfig[f.status] || statusConfig.Afventer;
    const StatusIcon = cfg.icon;
    return (
      <div>
        <button onClick={() => { setViewForm(null); setAdminComment(""); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> Tilbage til oversigt
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-heading font-bold text-card-foreground">{f.form_type}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                  {(f.profiles as any)?.full_name} · {formatCaseLabel(f.cases as any, "Sag –")} · {f.form_date}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${cfg.color}`}>
              <StatusIcon size={12} /> {cfg.label}
            </span>
          </div>

          <div className="space-y-4">
            {f.description && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Beskrivelse af udført arbejde</p>
                <p className="text-sm text-card-foreground leading-relaxed">{f.description}</p>
              </div>
            )}
            {f.installation_type && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Installationstype</p>
                <p className="text-sm text-card-foreground">{f.installation_type}</p>
              </div>
            )}
            {f.measurements && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Måleresultater</p>
                <p className="text-sm text-card-foreground whitespace-pre-wrap">{f.measurements}</p>
              </div>
            )}
            {f.comments && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bemærkninger</p>
                <p className="text-sm text-card-foreground">{f.comments}</p>
              </div>
            )}
            {f.image_urls && (f.image_urls as string[]).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billeder</p>
                <div className="flex flex-wrap gap-2">
                  {(f.image_urls as string[]).map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 rounded-xl overflow-hidden border border-border hover:border-primary transition-colors">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {f.admin_comment && (
              <div className="rounded-xl bg-muted/30 border border-border p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kommentar fra admin</p>
                <p className="text-sm text-card-foreground">{f.admin_comment}</p>
              </div>
            )}

            {role === "admin" && f.status === "Afventer" && (
              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kommentar (påkrævet ved afvisning)</Label>
                  <Textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Tilføj kommentar..." className="mt-1.5 rounded-xl" rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approveForm.mutate(f.id)} disabled={approveForm.isPending} className="rounded-xl gap-1.5">
                    <CheckCircle2 size={14} /> Godkend
                  </Button>
                  <Button variant="outline" onClick={() => rejectForm.mutate(f.id)} disabled={rejectForm.isPending} className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10">
                    <XCircle size={14} /> Afvis
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Verifikationsskemaer" description={role === "admin" ? `${pending.length} afventer godkendelse` : "Udfyld og indsend verifikationsskemaer"}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(var(--primary)/0.25)]"><Plus size={16} /> Nyt skema</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Vælg skematype</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setShowElForm(true); }}
                className="w-full flex items-center gap-4 rounded-2xl border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 flex-shrink-0">
                  <Zap size={20} className="text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-card-foreground">Elinstallation – Verifikation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tjekliste med 39 kontrolpunkter og måleresultater</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setGenericOpen(true); }}
                className="w-full flex items-center gap-4 rounded-2xl border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <FileText size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-card-foreground">Andet skema</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fritekst-skema til øvrige verifikationer</p>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Admin dashboard stats */}
      {role === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10"><Clock size={18} className="text-warning" /></div>
              <div>
                <p className="text-2xl font-heading font-bold text-card-foreground">{pending.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Afventer godkendelse</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><CheckCircle2 size={18} className="text-success" /></div>
              <div>
                <p className="text-2xl font-heading font-bold text-card-foreground">{approvedThisMonth.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Godkendt denne måned</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10"><XCircle size={18} className="text-destructive" /></div>
              <div>
                <p className="text-2xl font-heading font-bold text-card-foreground">{rejected.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Afvist</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg verifikationsskemaer..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-28 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((f, i) => {
          const cfg = statusConfig[f.status] || statusConfig.Afventer;
          const StatusIcon = cfg.icon;
          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setViewForm(f)}
              className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0 ${f.status === "Afventer" ? "bg-warning/10" : f.status === "Godkendt" ? "bg-success/10" : "bg-destructive/10"}`}>
                    <ClipboardCheck size={18} className={f.status === "Afventer" ? "text-warning" : f.status === "Godkendt" ? "text-success" : "text-destructive"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-card-foreground">{f.form_type}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                        <StatusIcon size={10} /> {f.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(f.profiles as any)?.full_name || "–"} · {formatCaseLabel(f.cases as any, "Sag –")} · {f.form_date}
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
            <ClipboardCheck size={40} className="mx-auto text-muted-foreground/15 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Ingen verifikationsskemaer endnu</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tryk på "Nyt skema" for at komme i gang</p>
            <Button size="sm" onClick={() => setOpen(true)} className="mt-4 rounded-xl gap-2"><Plus size={14} /> Nyt skema</Button>
          </div>
        )}
      </div>
    </div>
  );
}
