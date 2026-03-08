import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, Clock, FileText, Users, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { role, profile } = useAuth();

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
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        title={`Godmorgen, ${firstName} 👋`}
        description={role === "admin" ? "Her er din oversigt for i dag" : "Din personlige oversigt"}
      />

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <StatCard title="Aktive sager" value={activeCases} icon={<Briefcase size={22} />} trend="up" trendValue="Aktive lige nu" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Medarbejdere" value={profiles?.length || 0} icon={<Users size={22} />} description="Registrerede" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Timer denne uge" value={`${totalHours}t`} icon={<Clock size={22} />} trend="neutral" trendValue="Denne uge" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Nye rapporter" value={newReports} icon={<FileText size={22} />} trend={newReports > 0 ? "up" : "neutral"} trendValue={newReports > 0 ? "Afventer gennemgang" : "Ingen nye"} />
        </motion.div>
      </motion.div>

      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <motion.div variants={item} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <FileText size={15} className="text-primary" />
              </div>
              <h2 className="font-heading font-bold text-card-foreground text-[15px]">Seneste rapporter</h2>
            </div>
            <Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Se alle <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(reports || []).slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.created_at?.split("T")[0]}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  r.status === "Ny" ? "bg-primary/10 text-primary" : r.status === "Godkendt" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
            {(!reports || reports.length === 0) && (
              <div className="px-6 py-8 text-center">
                <FileText size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Ingen rapporter endnu</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Cases */}
        <motion.div variants={item} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10">
                <Briefcase size={15} className="text-success" />
              </div>
              <h2 className="font-heading font-bold text-card-foreground text-[15px]">Aktive sager</h2>
            </div>
            <Link to="/cases" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Se alle <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(cases || []).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{c.case_number} – {c.customer}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  c.status === "Aktiv" ? "bg-success/10 text-success" : c.status === "Planlagt" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
            {(!cases || cases.length === 0) && (
              <div className="px-6 py-8 text-center">
                <Briefcase size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Ingen sager endnu</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
