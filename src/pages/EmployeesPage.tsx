import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Phone, Shield, UserPlus, Briefcase, Search, MoreVertical, UserX, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("alle");

  if (role !== "admin") return <Navigate to="/" replace />;

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles_with_roles"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
      if (!profs) return [];
      const [{ data: assignments }, { data: roles }, { data: timeData }] = await Promise.all([
        supabase.from("case_assignments").select("user_id, cases(case_number, address)"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("time_entries").select("user_id, hours"),
      ]);
      return profs.map((p) => ({
        ...p,
        assignments: assignments?.filter((a) => a.user_id === p.user_id) || [],
        isAdmin: roles?.some((r) => r.user_id === p.user_id && r.role === "admin") || false,
        totalHours: Math.round((timeData?.filter(t => t.user_id === p.user_id).reduce((s, t) => s + Number(t.hours), 0) || 0) * 10) / 10,
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
                <img src={e.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-card" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                  {e.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-card-foreground truncate">{e.full_name || "Unavngivet"}</p>
                    {e.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRole.mutate({ userId: e.user_id, makeAdmin: !e.isAdmin })}
                  >
                    {e.isAdmin ? "Fjern admin" : "Gør til admin"}
                  </Button>
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
                    {e.assignments.slice(0, 3).map((a: any, j: number) => (
                      <div key={j} className="rounded-xl bg-muted/50 px-3 py-2 border border-border/50">
                        <p className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                          <Briefcase size={11} className="text-primary" /> Sag {a.cases?.case_number}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-muted-foreground/50" /> {a.cases?.address || "–"}
                        </p>
                      </div>
                    ))}
                    {e.assignments.length > 3 && (
                      <p className="text-[11px] text-muted-foreground/50 pl-1">+{e.assignments.length - 3} mere</p>
                    )}
                  </div>
                )}
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
          </div>
        )}
      </div>
    </div>
  );
}
