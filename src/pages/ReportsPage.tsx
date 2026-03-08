import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download } from "lucide-react";
import { motion } from "framer-motion";

const mockReports = [
  { id: 1, case: "2026-014", employee: "Martin Sørensen", date: "2026-03-07", title: "Brandtætning – etape 2 kontrol", status: "Ny" },
  { id: 2, case: "2026-018", employee: "Anne Larsen", date: "2026-03-06", title: "Ventilationsgennemgang", status: "Godkendt" },
  { id: 3, case: "2026-011", employee: "Peter Hansen", date: "2026-03-06", title: "Fejlfinding brandspjæld", status: "Ny" },
  { id: 4, case: "2026-014", employee: "Martin Sørensen", date: "2026-03-04", title: "Månedlig inspektion", status: "Godkendt" },
];

const statusColors: Record<string, string> = {
  Ny: "bg-primary/10 text-primary",
  Godkendt: "bg-success/10 text-success",
  Afvist: "bg-destructive/10 text-destructive",
};

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Rapporter" description="Opret og gennemgå rapporter">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Ny rapport
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {mockReports.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FileText size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">Sag {r.case} · {r.employee} · {r.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status]}`}>
                {r.status}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download size={15} />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
