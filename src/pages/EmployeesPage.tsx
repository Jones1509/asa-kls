import { PageHeader } from "@/components/PageHeader";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function EmployeesPage() {
  const { data: profiles } = useQuery({
    queryKey: ["profiles_with_roles"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
      if (!profs) return [];
      const { data: assignments } = await supabase.from("case_assignments").select("user_id, cases(case_number, address)");
      return profs.map((p) => ({
        ...p,
        assignments: assignments?.filter((a) => a.user_id === p.user_id) || [],
      }));
    },
  });

  return (
    <div>
      <PageHeader title="Medarbejdere" description="Oversigt over alle medarbejdere" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(profiles || []).map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">
                {e.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-card-foreground">{e.full_name || "Unavngivet"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{e.role_label || "Medarbejder"}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{e.email}</p>
                {e.assignments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {e.assignments.slice(0, 2).map((a: any, j: number) => (
                      <div key={j} className="rounded-xl bg-muted/50 px-3 py-2 border border-border/50">
                        <p className="text-xs font-semibold text-card-foreground">Sag {a.cases?.case_number}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-muted-foreground/50" /> {a.cases?.address || "–"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {(!profiles || profiles.length === 0) && (
          <p className="col-span-full text-center py-12 text-sm text-muted-foreground">Ingen medarbejdere endnu</p>
        )}
      </div>
    </div>
  );
}
