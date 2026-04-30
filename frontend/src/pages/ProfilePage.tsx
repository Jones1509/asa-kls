import { PageHeader } from "@/components/PageHeader";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Briefcase, Camera, Clock, FileText, Mail, Phone, Save, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role_label: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleCropOpenChange = (open: boolean) => {
    setCropOpen(open);
    if (!open) setCropSrc(null);
  };

  // Load profile data
  const { data: fullProfile } = useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["my_stats", user?.id],
    queryFn: async () => {
      const [{ count: caseCount }, { count: reportCount }, { data: timeData }] = await Promise.all([
        supabase.from("case_assignments").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("time_entries").select("hours").eq("user_id", user!.id),
      ]);
      const totalHours = timeData?.reduce((s, e) => s + Number(e.hours), 0) || 0;
      return { cases: caseCount || 0, reports: reportCount || 0, hours: Math.round(totalHours * 10) / 10 };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (fullProfile) {
      setForm({
        full_name: fullProfile.full_name || "",
        email: fullProfile.email || "",
        phone: fullProfile.phone || "",
        role_label: fullProfile.role_label || "",
      });
      if (fullProfile.avatar_url) setAvatarPreview(fullProfile.avatar_url);
    }
  }, [fullProfile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      let avatar_url = fullProfile?.avatar_url || null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user!.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        avatar_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone || null,
          role_label: form.role_label || null,
          avatar_url,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
      toast.success("Profil opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result));
      setCropOpen(true);
      // allow re-selecting the same file
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const initials = form.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title="Min profil" description="Administrer dine personlige oplysninger" />

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={handleCropOpenChange}
        onCropped={(file, previewUrl) => {
          if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
          setAvatarFile(file);
          setAvatarPreview(previewUrl);
          setCropSrc(null);
          setCropOpen(false);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            {/* Avatar section */}
            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-border">
              <div className="relative group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover shadow-elevated" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary text-xl font-bold text-white shadow-[0_4px_16px_hsl(215_80%_56%/0.3)]">
                    {initials}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={20} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold text-card-foreground">{form.full_name || "Unavngivet"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    <Shield size={10} /> {role === "admin" ? "Administrator" : "Medarbejder"}
                  </span>
                  {form.role_label && <span className="text-xs text-muted-foreground">{form.role_label}</span>}
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate();
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fulde navn</Label>
                  <div className="relative mt-1.5">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="pl-10 rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <Input value={form.email} disabled className="pl-10 rounded-xl h-11 opacity-60" />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telefon</Label>
                  <div className="relative mt-1.5">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+45 12 34 56 78"
                      className="pl-10 rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stilling</Label>
                  <Input
                    value={form.role_label}
                    onChange={(e) => setForm({ ...form, role_label: e.target.value })}
                    placeholder="Tekniker, Projektleder..."
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="rounded-xl gap-2 shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
                >
                  <Save size={15} /> {updateProfile.isPending ? "Gemmer..." : "Gem ændringer"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Stats sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {[
            { label: "Tilknyttede sager", value: stats?.cases || 0, icon: Briefcase, color: "bg-primary/10 text-primary" },
            { label: "Rapporter indsendt", value: stats?.reports || 0, icon: FileText, color: "bg-success/10 text-success" },
            { label: "Timer registreret", value: `${stats?.hours || 0}t`, icon: Clock, color: "bg-warning/10 text-warning" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-heading font-bold text-card-foreground">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Security info */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sikkerhed</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Sidst logget ind: {new Date().toLocaleDateString("da-DK")}</p>
              <p>Konto oprettet: {fullProfile?.created_at?.split("T")[0] || "–"}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
