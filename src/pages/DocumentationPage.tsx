import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Image, FileText } from "lucide-react";
import { motion } from "framer-motion";

const mockDocs = [
  { id: 1, case: "2026-014", type: "Fejl", title: "Revne i brandtætning – etage 3", date: "2026-03-07", hasImage: true },
  { id: 2, case: "2026-018", type: "Mangel", title: "Manglende ventilationsklap", date: "2026-03-06", hasImage: false },
  { id: 3, case: "2026-011", type: "Farligt forhold", title: "Løse kabler ved tavle", date: "2026-03-05", hasImage: true },
  { id: 4, case: "2026-014", type: "Note", title: "Aftale med bygherre om adgang", date: "2026-03-04", hasImage: false },
];

const typeColors: Record<string, string> = {
  Fejl: "bg-destructive/10 text-destructive",
  Mangel: "bg-warning/10 text-warning",
  "Farligt forhold": "bg-destructive/10 text-destructive",
  Note: "bg-info/10 text-info",
};

export default function DocumentationPage() {
  return (
    <div>
      <PageHeader title="Dokumentation" description="Indsendte observationer og dokumenter">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Ny dokumentation
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {mockDocs.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                {d.hasImage ? <Image size={18} className="text-muted-foreground" /> : <FileText size={18} className="text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">Sag {d.case} · {d.date}</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[d.type]}`}>
              {d.type}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
