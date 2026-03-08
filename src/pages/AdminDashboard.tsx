import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, Clock, FileText, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { role } = useAuth();

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*, profiles!reports_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: timeEntries } = useQuery({
    queryKey: ["time_entries_week"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data } = await supabase.from("time_entries").select("hours").gte("date", weekAgo.toISOString().split("T")[0]);
      return data || [];
    },
  });

  const activeCases = cases?.filter((c) => c.status === "Aktiv").length || 0;
  const totalHours = timeEntries?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;
  const newReports = reports?.filter((r) => r.status === "Ny").length || 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        title="Dashboard"
        description={role === "admin" ? "Velkommen tilbage, Administrator" : "Din oversigt"}
      />

      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <StatCard title="Aktive sager" value={activeCases} icon={<Briefcase size={20} />} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Medarbejdere" value={profiles?.length || 0} icon={<Users size={20} />} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Timer denne uge" value={totalHours} icon={<Clock size={20} />} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Nye rapporter" value={newReports} icon={<FileText size={20} />} />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading font-semibold text-card-foreground">Seneste rapporter</h2>
            <FileText size={18} className="text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {(reports || []).slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.created_at?.split("T")[0]}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  r.status === "Ny" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
            {(!reports || reports.length === 0) && (
              <p className="px-5 py-4 text-sm text-muted-foreground">Ingen rapporter endnu</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading font-semibold text-card-foreground">Sager</h2>
            <Briefcase size={18} className="text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {(cases || []).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{c.case_number} – {c.customer}</p>
                  <p className="text-xs text-muted-foreground">{c.address}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  c.status === "Aktiv" ? "bg-success/10 text-success" : c.status === "Planlagt" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
            {(!cases || cases.length === 0) && (
              <p className="px-5 py-4 text-sm text-muted-foreground">Ingen sager endnu</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
