import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, Clock, FileText, Users, ArrowRight, CalendarDays, Receipt, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { role, profile, user } = useAuth();

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
    enabled: role === "admin",
  });

  const { data: timeEntries } = useQuery({
    queryKey: ["time_entries_month"],
    queryFn: async () => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      let query = supabase.from("time_entries").select("hours, date").gte("date", monthAgo.toISOString().split("T")[0]);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: todaySchedules } = useQuery({
    queryKey: ["schedules_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase.from("schedules").select("*, cases(case_number, address)").eq("date", today);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount, status").limit(500);
      return data || [];
    },
    enabled: role === "admin",
  });

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      let query = supabase.from("reports").select("*, cases(case_number)").order("created_at", { ascending: false }).limit(5);
      if (role !== "admin") query = query.eq("user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const activeCases = cases?.filter((c) => c.status === "Aktiv").length || 0;
  const totalCases = cases?.length || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split("T")[0];
  const weeklyHours = timeEntries?.filter(e => e.date >= weekStr).reduce((sum, e) => sum + Number(e.hours), 0) || 0;
  const monthlyHours = timeEntries?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;

  const newReports = reports?.filter((r) => r.status === "Ny").length || 0;
  const pendingInvoices = invoices?.filter(i => i.status !== "Betalt").reduce((s, i) => s + Number(i.amount), 0) || 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  const chartData = (() => {
    const days: { name: string; timer: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("da-DK", { weekday: "short" });
      const dayHours = timeEntries?.filter(e => e.date === dateStr).reduce((s, e) => s + Number(e.hours), 0) || 0;
      days.push({ name: dayName, timer: Math.round(dayHours * 10) / 10 });
    }
    return days;
  })();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "God nat";
    if (h < 12) return "Godmorgen";
    if (h < 18) return "God eftermiddag";
    return "Godaften";
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description={role === "admin" ? "Her er din oversigt over hele KLS-systemet" : "Din personlige oversigt og opgaver"}
      />

      {/* Primary stats */}
      <motion.div variants={container} className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <motion.div variants={item}>
          <StatCard title="Aktive sager" value={`${activeCases}/${totalCases}`} icon={<Briefcase size={22} />} trend="up" trendValue={`${activeCases} aktive`} />
        </motion.div>
        {role === "admin" ? (
          <motion.div variants={item}>
            <StatCard title="Medarbejdere" value={profiles?.length || 0} icon={<Users size={22} />} description="Registrerede" />
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <StatCard title="Mine opgaver" value={todaySchedules?.length || 0} icon={<CalendarDays size={22} />} trend="neutral" trendValue="I dag" />
          </motion.div>
        )}
        <motion.div variants={item}>
          <StatCard title="Timer denne uge" value={`${Math.round(weeklyHours * 10) / 10}t`} icon={<Clock size={22} />} trend="neutral" trendValue={`${Math.round(monthlyHours)}t denne måned`} />
        </motion.div>
        {role === "admin" ? (
          <motion.div variants={item}>
            <StatCard title="Udestående" value={`${Math.round(pendingInvoices).toLocaleString("da-DK")} kr`} icon={<Receipt size={22} />} trend={pendingInvoices > 0 ? "down" : "neutral"} trendValue={pendingInvoices > 0 ? "Ikke betalt" : "Intet udestående"} />
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <StatCard title="Nye rapporter" value={newReports} icon={<FileText size={22} />} trend={newReports > 0 ? "up" : "neutral"} trendValue={newReports > 0 ? "Afventer gennemgang" : "Ingen nye"} />
          </motion.div>
        )}
      </motion.div>

      {/* Chart + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div variants={item} className="rounded-2xl border border-border bg-card shadow-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 size={15} className="text-primary" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-[15px]">Timer (sidste 7 dage)</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(220 14% 89%)",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [`${value}t`, "Timer"]}
                />
                <Bar dataKey="timer" fill="hsl(215 80% 48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border bg-card shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                <CalendarDays size={15} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-[15px]">I dag</h3>
            </div>
            <Link to="/schedule" className="text-xs font-medium text-primary hover:underline">Se kalender →</Link>
          </div>
          {(todaySchedules?.length || 0) > 0 ? (
            <div className="space-y-2.5">
              {todaySchedules?.map((s) => (
                <div key={s.id} className="rounded-xl bg-primary/5 border border-primary/10 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-card-foreground">Sag {(s.cases as any)?.case_number || "–"}</p>
                    {s.start_time && s.end_time && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 rounded-lg px-2 py-0.5">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{(s.cases as any)?.address || "–"}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <CalendarDays size={28} className="text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen opgaver planlagt i dag</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Active cases */}
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
          {(cases || []).filter(c => c.status === "Aktiv").slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium text-card-foreground">{c.case_number} – {c.customer}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>
              </div>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-success/10 text-success border border-success/20">
                {c.status}
              </span>
            </div>
          ))}
          {(!cases || cases.filter(c => c.status === "Aktiv").length === 0) && (
            <div className="px-6 py-8 text-center">
              <Briefcase size={24} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen aktive sager</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}