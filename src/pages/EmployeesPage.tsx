import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Mail, Phone, Shield, UserPlus, MoreHorizontal, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function EmployeesPage() {
  const { role } = useAuth();

  // Only admin can access this page
  if (role !== "admin") return <Navigate to="/" replace />;

  const { data: profiles } = useQuery({
    queryKey: ["profiles_with_roles"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
      if (!profs) return [];
      const [{ data: assignments }, { data: roles }] = await Promise.all([
        supabase.from("case_assignments").select("user_id, cases(case_number, address)"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return profs.map((p) => ({
        ...p,
        assignments: assignments?.filter((a) => a.user_id === p.user_id) || [],
        isAdmin: roles?.some((r) => r.user_id === p.user_id && r.role === "admin") || false,
      }));
    },
  });

  const activeCount = profiles?.length || 0;
  const adminCount = profiles?.filter((p) => p.isAdmin).length || 0;

  return (
    <div>
      <PageHeader title="Medarbejdere" description={`${activeCount} medarbejdere · ${adminCount} administratorer`} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(profiles || []).map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                {e.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-card-foreground truncate">{e.full_name || "Unavngivet"}</p>
                  {e.isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Shield size={10} /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.role_label || "Medarbejder"}</p>
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <Mail size={11} className="text-muted-foreground/40" /> {e.email}
                  </p>
                  {e.phone && (
                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                      <Phone size={11} className="text-muted-foreground/40" /> {e.phone}
                    </p>
                  )}
                </div>

                {e.assignments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Tilknyttede sager</p>
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
              </div>
            </div>
          </motion.div>
        ))}
        {(!profiles || profiles.length === 0) && (
          <div className="col-span-full text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
              <UserPlus size={24} className="text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Ingen medarbejdere endnu</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Opret en bruger for at starte</p>
          </div>
        )}
      </div>
    </div>
  );
}
