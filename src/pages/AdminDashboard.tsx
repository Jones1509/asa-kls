import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, Clock, FileText, Users, ClipboardCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// Mock data
const recentReports = [
  { id: 1, case: "2026-014", employee: "Martin Sørensen", date: "2026-03-07", status: "Ny" },
  { id: 2, case: "2026-018", employee: "Anne Larsen", date: "2026-03-06", status: "Behandlet" },
  { id: 3, case: "2026-011", employee: "Peter Hansen", date: "2026-03-06", status: "Ny" },
];

const activeEmployees = [
  { name: "Martin Sørensen", case: "2026-014", location: "Aarhusvej 12" },
  { name: "Anne Larsen", case: "2026-018", location: "Kongensgade 45" },
  { name: "Peter Hansen", case: "2026-011", location: "Industrivej 8" },
];

export default function AdminDashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader title="Dashboard" description="Velkommen tilbage, Administrator" />

      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <StatCard title="Aktive sager" value={12} icon={<Briefcase size={20} />} description="3 nye denne uge" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Medarbejdere i dag" value={6} icon={<Users size={20} />} description="af 8 total" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Timer denne uge" value={184} icon={<Clock size={20} />} description="+12% fra sidste uge" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Nye rapporter" value={5} icon={<FileText size={20} />} description="2 afventer gennemgang" />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading font-semibold text-card-foreground">Seneste rapporter</h2>
            <FileText size={18} className="text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{r.employee}</p>
                  <p className="text-xs text-muted-foreground">Sag {r.case} · {r.date}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  r.status === "Ny" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active employees */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading font-semibold text-card-foreground">Medarbejdere på arbejde</h2>
            <Users size={18} className="text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {activeEmployees.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {e.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">Sag {e.case} · {e.location}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
