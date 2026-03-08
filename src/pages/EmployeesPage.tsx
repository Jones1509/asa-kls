import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const mockEmployees = [
  { id: 1, name: "Martin Sørensen", email: "martin@asakls.dk", role: "Tekniker", currentCase: "2026-014", location: "Aarhusvej 12", status: "På arbejde" },
  { id: 2, name: "Anne Larsen", email: "anne@asakls.dk", role: "Inspektør", currentCase: "2026-018", location: "Kongensgade 45", status: "På arbejde" },
  { id: 3, name: "Peter Hansen", email: "peter@asakls.dk", role: "Tekniker", currentCase: "2026-011", location: "Industrivej 8", status: "På arbejde" },
  { id: 4, name: "Lise Pedersen", email: "lise@asakls.dk", role: "Inspektør", currentCase: null, location: null, status: "Fri" },
  { id: 5, name: "Thomas Nielsen", email: "thomas@asakls.dk", role: "Tekniker", currentCase: null, location: null, status: "Syg" },
];

const statusColors: Record<string, string> = {
  "På arbejde": "bg-success/10 text-success",
  Fri: "bg-muted text-muted-foreground",
  Syg: "bg-warning/10 text-warning",
};

export default function EmployeesPage() {
  return (
    <div>
      <PageHeader title="Medarbejdere" description="Oversigt over alle medarbejdere">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Ny medarbejder
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockEmployees.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {e.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-card-foreground">{e.name}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[e.status]}`}>
                    {e.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{e.role} · {e.email}</p>
                {e.currentCase && (
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs font-medium text-card-foreground">Sag {e.currentCase}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {e.location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
