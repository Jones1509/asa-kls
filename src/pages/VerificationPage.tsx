import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, Download } from "lucide-react";
import { motion } from "framer-motion";

const mockForms = [
  {
    id: 1, case: "2026-014", employee: "Martin Sørensen", date: "2026-03-07", type: "Brandtætning",
    items: [
      { label: "Brandtætning kontrolleret", checked: true },
      { label: "Installation korrekt", checked: true },
      { label: "Fejl fundet", checked: false },
    ],
  },
  {
    id: 2, case: "2026-018", employee: "Anne Larsen", date: "2026-03-05", type: "Ventilationskontrol",
    items: [
      { label: "Kanaler rengjort", checked: true },
      { label: "Filter skiftet", checked: true },
      { label: "Lækage fundet", checked: true },
    ],
  },
];

export default function VerificationPage() {
  return (
    <div>
      <PageHeader title="Kontrolskemaer" description="Udfyld og gennemgå kontrolskemaer">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Nyt skema
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {mockForms.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-card-foreground">{f.type}</h3>
                <p className="text-xs text-muted-foreground">Sag {f.case} · {f.employee} · {f.date}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download size={15} />
              </Button>
            </div>
            <div className="space-y-2">
              {f.items.map((item, j) => (
                <div key={j} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                    item.checked ? "bg-success border-success text-success-foreground" : "border-border bg-card"
                  }`}>
                    {item.checked && <span className="text-xs">✓</span>}
                  </div>
                  <span className="text-sm text-card-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
