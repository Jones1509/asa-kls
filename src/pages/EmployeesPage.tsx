import { PageHeader } from "@/components/PageHeader";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapPin, Mail, Phone, Shield, UserPlus, Briefcase, Search, Trash2, Clock, AlertTriangle, Pencil, Camera, Key, Eye, EyeOff, Upload, CheckCircle2, FileText, XCircle, Plus, GraduationCap, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { da } from "date-fns/locale";

async function callManageEmployee(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("manage-employee", { body });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function EmployeesPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("alle");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");

  // Edit state
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", role_label: "", education_plan: "" });
  const [customCertName, setCustomCertName] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editCropOpen, setEditCropOpen] = useState(false);
  const [editCropSrc, setEditCropSrc] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role_label: "",
    make_admin: false,
  });
  const [showCreatePw, setShowCreatePw] = useState(false);

  useEffect(() => {
    if (editEmployee) {
      setEditForm({
        full_name: editEmployee.full_name || "",
        phone: editEmployee.phone || "",
        role_label: editEmployee.role_label || "",
        education_plan: editEmployee.education_plan || "",
      });
      setEditAvatarPreview(editEmployee.avatar_url || null);
      setEditAvatarFile(null);
      setShowPasswordChange(false);
      setNewPassword("");
      setCustomCertName("");
    }
  }, [editEmployee]);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles_with_roles"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
      if (!profs) return [];
      const [{ data: assignments }, { data: roles }, { data: timeData }, { data: certs }] = await Promise.all([
        supabase.from("case_assignments").select("user_id, cases(case_number, address)"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("time_entries").select("user_id, hours"),
        supabase.from("employee_certificates").select("*"),
      ]);
      return profs.map((p) => ({
        ...p,
        assignments: assignments?.filter((a) => a.user_id === p.user_id) || [],
        isAdmin: roles?.some((r) => r.user_id === p.user_id && r.role === "admin") || false,
        totalHours: Math.round((timeData?.filter(t => t.user_id === p.user_id).reduce((s, t) => s + Number(t.hours), 0) || 0) * 10) / 10,
        certificates: certs?.filter(c => c.user_id === p.user_id) || [],
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
      toast.success("Rolle opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEmployee = useMutation({
    mutationFn: async () => {
      if (!editEmployee) return;
      let avatar_url = editEmployee.avatar_url || null;

      if (editAvatarFile) {
        const ext = editAvatarFile.name.split(".").pop();
        const path = `avatars/${editEmployee.user_id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, editAvatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase.from("profiles").update({
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        role_label: editForm.role_label || null,
        education_plan: editForm.education_plan || null,
        avatar_url,
      } as any).eq("user_id", editEmployee.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
      setEditEmployee(null);
      toast.success("Medarbejder opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!editEmployee || !newPassword) return;
      await callManageEmployee({ action: "change_password", user_id: editEmployee.user_id, new_password: newPassword });
    },
    onSuccess: () => {
      toast.success("Adgangskode ændret");
      setNewPassword("");
      setShowPasswordChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createEmployee = useMutation({
    mutationFn: async () => {
      await callManageEmployee({ action: "create", ...createForm });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
      setShowCreate(false);
      setCreateForm({ email: "", password: "", full_name: "", phone: "", role_label: "", make_admin: false });
      toast.success("Medarbejder oprettet og kan nu logge ind");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await callManageEmployee({ action: "delete", user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
      setDeleteUserId(null);
      toast.success("Medarbejder slettet fra systemet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") return <Navigate to="/" replace />;

  const filtered = profiles?.filter(p => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.role_label || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "alle" ||
      (roleFilter === "admin" && p.isAdmin) ||
      (roleFilter === "employee" && !p.isAdmin);
    return matchSearch && matchRole;
  });

  const activeCount = profiles?.length || 0;
  const adminCount = profiles?.filter((p) => p.isAdmin).length || 0;
  const editInitials = editForm.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div>
      <PageHeader title="Medarbejdere" description={`${activeCount} medarbejdere · ${adminCount} administratorer`} />

      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg medarbejdere..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {[
            { key: "alle", label: "Alle" },
            { key: "admin", label: "Admins" },
            { key: "employee", label: "Medarbejdere" },
          ].map(f => (
            <button key={f.key} onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)] ml-auto">
          <UserPlus size={15} /> Opret medarbejder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="flex items-start gap-3.5"><div className="h-12 w-12 rounded-2xl bg-muted" /><div className="space-y-2 flex-1"><div className="h-4 w-32 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted" /></div></div>
          </div>
        ))}
        {(filtered || []).map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all">
            <div className="flex items-start gap-3.5">
              {e.avatar_url ? (
                <img src={e.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-card flex-shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.25)] flex-shrink-0">
                  {e.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-card-foreground truncate">{e.full_name || "Unavngivet"}</p>
                    {e.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary flex-shrink-0">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditEmployee(e)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                    title="Rediger medarbejder"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.role_label || "Medarbejder"}</p>

                <div className="mt-2.5 space-y-1">
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <Mail size={11} className="text-muted-foreground/40" /> {e.email}
                  </p>
                  {e.phone && (
                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                      <Phone size={11} className="text-muted-foreground/40" /> {e.phone}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <Clock size={11} className="text-muted-foreground/40" /> {e.totalHours}t registreret
                  </p>
                </div>

                {e.assignments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Tilknyttede sager ({e.assignments.length})</p>
                    {e.assignments.slice(0, 2).map((a: any, j: number) => (
                      <div key={j} className="rounded-xl bg-muted/50 px-3 py-2 border border-border/50">
                        <p className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                          <Briefcase size={11} className="text-primary" /> Sag {a.cases?.case_number}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-muted-foreground/50" /> {a.cases?.address || "–"}
                        </p>
                      </div>
                    ))}
                    {e.assignments.length > 2 && (
                      <p className="text-[11px] text-muted-foreground/50 pl-1">+{e.assignments.length - 2} mere</p>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRole.mutate({ userId: e.user_id, makeAdmin: !e.isAdmin })}>
                    {e.isAdmin ? "Fjern admin" : "Gør til admin"}
                  </Button>
                  {e.user_id !== user?.id && (
                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { setDeleteUserId(e.user_id); setDeleteUserName(e.full_name); }}>
                      <Trash2 size={11} className="mr-1" /> Slet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="col-span-full text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
              <UserPlus size={24} className="text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Ingen medarbejdere fundet</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 rounded-xl gap-2">
              <UserPlus size={15} /> Opret første medarbejder
            </Button>
          </div>
        )}
      </div>

      {/* ── Create Employee Dialog ── */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setCreateForm({ email: "", password: "", full_name: "", phone: "", role_label: "", make_admin: false }); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
              <UserPlus size={18} className="text-primary" /> Opret ny medarbejder
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createEmployee.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fulde navn</Label>
              <Input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Fornavn Efternavn" className="mt-1.5 rounded-xl h-11" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telefon</Label>
                <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+45 12 34 56 78" className="mt-1.5 rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stilling / titel</Label>
                <Input value={createForm.role_label} onChange={(e) => setCreateForm({ ...createForm, role_label: e.target.value })}
                  placeholder="Tekniker, Leder..." className="mt-1.5 rounded-xl h-11" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Login oplysninger</p>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative mt-1.5">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="medarbejder@firma.dk" className="pl-10 rounded-xl h-11" required />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Adgangskode</Label>
                <div className="relative mt-1.5">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                  <Input type={showCreatePw ? "text" : "password"} value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min. 6 tegn" className="pl-10 pr-10 rounded-xl h-11" required minLength={6} />
                  <button type="button" onClick={() => setShowCreatePw(!showCreatePw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    {showCreatePw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-semibold text-card-foreground">Administrator</p>
                <p className="text-xs text-muted-foreground">Giver adgang til alle admin-funktioner</p>
              </div>
              <Switch checked={createForm.make_admin} onCheckedChange={(v) => setCreateForm({ ...createForm, make_admin: v })} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Annuller</Button>
              <Button type="submit" disabled={createEmployee.isPending} className="rounded-xl gap-2 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                <UserPlus size={15} /> {createEmployee.isPending ? "Opretter..." : "Opret medarbejder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <AvatarCropDialog
        open={editCropOpen}
        imageSrc={editCropSrc}
        onOpenChange={(open) => { setEditCropOpen(open); if (!open) setEditCropSrc(null); }}
        onCropped={(file, previewUrl) => {
          setEditAvatarFile(file);
          setEditAvatarPreview(previewUrl);
          setEditCropSrc(null);
          setEditCropOpen(false);
        }}
      />
      <Dialog open={!!editEmployee} onOpenChange={(o) => !o && setEditEmployee(null)}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Rediger medarbejder</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateEmployee.mutate(); }} className="space-y-5">
            {/* Avatar upload */}
            <div className="flex items-center gap-5">
              <div className="relative group flex-shrink-0">
                {editAvatarPreview ? (
                  <img src={editAvatarPreview} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover shadow-card" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary text-xl font-bold text-white shadow-[0_4px_16px_hsl(215_80%_56%/0.3)]">
                    {editInitials}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={20} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setEditCropSrc(String(reader.result));
                      setEditCropOpen(true);
                      e.target.value = "";
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{editEmployee?.full_name || "Unavngivet"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{editEmployee?.email}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-2">Klik på billedet for at skifte</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fulde navn</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="mt-1.5 rounded-xl h-11" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telefon</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+45 12 34 56 78" className="mt-1.5 rounded-xl h-11" />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stilling / titel</Label>
                  <Input value={editForm.role_label} onChange={(e) => setEditForm({ ...editForm, role_label: e.target.value })} placeholder="Tekniker, Leder..." className="mt-1.5 rounded-xl h-11" />
                </div>
              </div>
            </div>

            {/* Education plan */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={14} className="text-primary" />
                <p className="text-sm font-semibold text-card-foreground">Uddannelsesplaner</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Beskriv medarbejderens nuværende og fremtidige uddannelsesplaner</p>
              <textarea
                value={editForm.education_plan}
                onChange={(e) => setEditForm({ ...editForm, education_plan: e.target.value })}
                placeholder="Fx: Er i gang med svende-prøve forår 2026. Planlagt elinstallatør-uddannelse 2027..."
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
            </div>

            {/* Certificates section */}
            {editEmployee && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-card-foreground">Certifikater & beviser</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Upload uddannelsesbeviser, svendebevis, ansættelseskontrakt m.m.</p>

                {/* Existing certificates */}
                <div className="space-y-2 mb-3">
                  {(editEmployee.certificates?.length || 0) === 0 && (
                    <p className="text-xs text-muted-foreground/60 text-center py-3">Ingen dokumenter uploadet endnu</p>
                  )}
                  {editEmployee.certificates?.map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 border border-border/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{cert.certificate_name}</p>
                          {cert.uploaded_at && (
                            <p className="text-[10px] text-muted-foreground">Uploadet {format(new Date(cert.uploaded_at), "d. MMM yyyy", { locale: da })}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {cert.file_url && (
                          <a href={cert.file_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                            <Download size={11} /> Se
                          </a>
                        )}
                        <button type="button" onClick={async () => {
                          if (!confirm(`Slet "${cert.certificate_name}"?`)) return;
                          await supabase.from("employee_certificates").delete().eq("id", cert.id);
                          queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
                          toast.success("Dokument slettet");
                        }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick upload predefined types */}
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hurtig upload</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Svendebevis", "Uddannelsesbevis", "Ansættelseskontrakt", "Lærlingekontrakt", "Autorisationsprøve", "Elinstallatørbevis"].map(name => {
                      const exists = editEmployee.certificates?.some((c: any) => c.certificate_name === name);
                      return (
                        <label key={name} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors border ${exists ? "bg-success/10 border-success/30 text-success" : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
                          {exists ? <CheckCircle2 size={11} /> : <Upload size={11} />}
                          {name}
                          {!exists && (
                            <input type="file" accept=".pdf,image/*,.doc,.docx" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const path = `certificates/${editEmployee.user_id}/${name.replace(/\s/g, "_")}_${Date.now()}.${file.name.split(".").pop()}`;
                              const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
                              if (upErr) { toast.error("Upload fejlede"); return; }
                              const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
                              await supabase.from("employee_certificates").insert({ user_id: editEmployee.user_id, certificate_name: name, file_url: urlData.publicUrl, uploaded_at: new Date().toISOString() });
                              queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
                              toast.success(`${name} uploadet`);
                              e.target.value = "";
                            }} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Custom upload */}
                <div className="rounded-lg border border-dashed border-border p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload andet dokument</p>
                  <div className="flex gap-2">
                    <Input
                      value={customCertName}
                      onChange={(e) => setCustomCertName(e.target.value)}
                      placeholder="Dokumentnavn..."
                      className="rounded-lg h-9 text-xs flex-1"
                    />
                    <label className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${customCertName.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                      <Upload size={12} /> Upload
                      {customCertName.trim() && (
                        <input type="file" accept=".pdf,image/*,.doc,.docx" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !customCertName.trim()) return;
                          const cName = customCertName.trim();
                          const path = `certificates/${editEmployee.user_id}/${cName.replace(/\s/g, "_")}_${Date.now()}.${file.name.split(".").pop()}`;
                          const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
                          if (upErr) { toast.error("Upload fejlede"); return; }
                          const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
                          await supabase.from("employee_certificates").insert({ user_id: editEmployee.user_id, certificate_name: cName, file_url: urlData.publicUrl, uploaded_at: new Date().toISOString() });
                          queryClient.invalidateQueries({ queryKey: ["profiles_with_roles"] });
                          setCustomCertName("");
                          toast.success(`${cName} uploadet`);
                          e.target.value = "";
                        }} />
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Password change section */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-muted-foreground" />
                  <p className="text-sm font-semibold text-card-foreground">Adgangskode</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-[11px]"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}>
                  {showPasswordChange ? "Annuller" : "Skift adgangskode"}
                </Button>
              </div>
              {showPasswordChange && (
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Input type={showNewPw ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ny adgangskode (min. 6 tegn)" className="pr-10 rounded-xl h-10" minLength={6} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button type="button" size="sm" className="rounded-xl h-10" onClick={() => changePassword.mutate()}
                    disabled={changePassword.isPending || newPassword.length < 6}>
                    {changePassword.isPending ? "Gemmer..." : "Gem"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditEmployee(null)} className="rounded-xl">Annuller</Button>
              <Button type="submit" disabled={updateEmployee.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                {updateEmployee.isPending ? "Gemmer..." : "Gem ændringer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" /> Slet medarbejder
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Er du sikker på at du vil slette <strong className="text-card-foreground">{deleteUserName}</strong> fra systemet? Alle timer, vagtplaner og rolletildelinger slettes permanent og brugeren kan ikke længere logge ind.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteUserId(null)}>Annuller</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? "Sletter..." : "Slet permanent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
