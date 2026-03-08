import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, Clock, FileText, Users, ArrowRight, CalendarDays, ClipboardCheck, Receipt, Radio, Shield } from "lucide-react";
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

  const { data: timeEntries } = useQuery({
    queryKey: ["time_entries_week"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      let query = supabase.from("time_entries").select("hours").gte("date", weekAgo.toISOString().split("T")[0]);
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

  const { data: fieldReports } = useQuery({
    queryKey: ["field_reports_unread"],
    queryFn: async () => {
      const { data } = await supabase.from("field_reports").select("id, subject, priority, is_read, created_at, profiles!field_reports_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: role === "admin",
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("amount, status").limit(500);
      return data || [];
    },
    enabled: role === "admin",
  });

  const activeCases = cases?.filter((c) => c.status === "Aktiv").length || 0;
  const totalHours = timeEntries?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;
  const newReports = reports?.filter((r) => r.status === "Ny").length || 0;
  const unreadFieldReports = fieldReports?.filter(r => !r.is_read).length || 0;
  const pendingInvoices = invoices?.filter(i => i.status !== "Betalt").reduce((s, i) => s + Number(i.amount), 0) || 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Godmorgen";
    if (h < 18) return "God eftermiddag";
    return "Godaften";
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description={role === "admin" ? "Her er din oversigt over systemet" : "Din personlige oversigt"}
      />

      {/* KLS compliance banner for admin */}
      {role === "admin" && (
        <motion.div variants={item} className="rounded-2xl border border-success/20 bg-success/5 p-4 mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/15 flex-shrink-0">
            <Shield size={18} className="text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">KLS Sikkerhedsstyrelsen</p>
            <p className="text-xs text-muted-foreground">Dokumentation opbevares automatisk i 5 år · Alle ændringer logges</p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <StatCard title="Aktive sager" value={activeCases} icon={<Briefcase size={22} />} trend="up" trendValue="Aktive lige nu" />
        </motion.div>
        {role === "admin" && (
          <motion.div variants={item}>
            <StatCard title="Medarbejdere" value={profiles?.length || 0} icon={<Users size={22} />} description="Registrerede" />
          </motion.div>
        )}
        <motion.div variants={item}>
          <StatCard title="Timer denne uge" value={`${totalHours}t`} icon={<Clock size={22} />} trend="neutral" trendValue="Denne uge" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Nye rapporter" value={newReports} icon={<FileText size={22} />} trend={newReports > 0 ? "up" : "neutral"} trendValue={newReports > 0 ? "Afventer gennemgang" : "Ingen nye"} />
        </motion.div>
      </motion.div>

      {/* Admin extra stats row */}
      {role === "admin" && (
        <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.div variants={item}>
            <StatCard title="Ulæste feltrapporter" value={unreadFieldReports} icon={<Radio size={22} />} trend={unreadFieldReports > 0 ? "up" : "neutral"} trendValue={unreadFieldReports > 0 ? "Kræver opmærksomhed" : "Alt læst"} />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Udestående fakturaer" value={`${Math.round(pendingInvoices).toLocaleString("da-DK")} DKK`} icon={<Receipt size={22} />} trend={pendingInvoices > 0 ? "up" : "neutral"} trendValue="Ikke betalt endnu" />
          </motion.div>
        </motion.div>
      )}

      {/* Today's schedule */}
      {(todaySchedules?.length || 0) > 0 && (
        <motion.div variants={item} className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
              <CalendarDays size={15} className="text-primary" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-[15px]">I dag</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySchedules?.map((s) => (
              <div key={s.id} className="rounded-xl bg-card border border-border p-3">
                <p className="text-sm font-semibold text-card-foreground">Sag {(s.cases as any)?.case_number || "–"}</p>
                <p className="text-xs text-muted-foreground mt-1">{(s.cases as any)?.address || "–"}</p>
                {s.start_time && s.end_time && (
                  <p className="text-xs font-semibold text-primary mt-2">
                    {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field reports for admin */}
        {role === "admin" && (
          <motion.div variants={item} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10">
                  <Radio size={15} className="text-warning" />
                </div>
                <h2 className="font-heading font-bold text-card-foreground text-[15px]">Feltrapporter</h2>
                {unreadFieldReports > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadFieldReports}</span>
                )}
              </div>
              <Link to="/field-reports" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Se alle <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {(fieldReports || []).slice(0, 4).map((r) => (
                <div key={r.id} className={`flex items-center justify-between px-6 py-3.5 transition-colors ${!r.is_read ? "bg-primary/[0.02]" : "hover:bg-muted/20"}`}>
                  <div className="flex items-center gap-2.5">
                    {!r.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{r.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{(r.profiles as any)?.full_name || "–"} · {r.created_at?.split("T")[0]}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    r.priority === "Kritisk" ? "bg-destructive/10 text-destructive" :
                    r.priority === "Høj" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>{r.priority}</span>
                </div>
              ))}
              {(!fieldReports || fieldReports.length === 0) && (
                <div className="px-6 py-8 text-center">
                  <Radio size={24} className="mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">Ingen feltrapporter</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

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
              <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sag {(r.cases as any)?.case_number || "–"} · {r.created_at?.split("T")[0]}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  r.status === "Ny" ? "bg-primary/10 text-primary" : r.status === "Godkendt" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>{r.status}</span>
              </div>
            ))}
            {(!reports || reports.length === 0) && (
              <div className="px-6 py-8 text-center">
                <FileText size={24} className="mx-auto text-muted-foreground/20 mb-2" />
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
      </div>
    </motion.div>
  );
}
