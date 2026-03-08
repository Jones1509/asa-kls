import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock } from "lucide-react";
import { motion } from "framer-motion";

const mockEntries = [
  { id: 1, case: "2026-014", date: "2026-03-07", start: "08:00", end: "16:00", hours: 8, note: "Brandtætning etape 2" },
  { id: 2, case: "2026-018", date: "2026-03-06", start: "07:30", end: "15:30", hours: 8, note: "Gennemgang af ventilation" },
  { id: 3, case: "2026-014", date: "2026-03-05", start: "08:00", end: "14:00", hours: 6, note: "Kontrolbesøg" },
  { id: 4, case: "2026-011", date: "2026-03-04", start: "09:00", end: "17:00", hours: 8, note: "Installation af brandspjæld" },
];

export default function TimeTrackingPage() {
  return (
    <div>
      <PageHeader title="Timeregistrering" description="Registrer og se arbejdstimer">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Registrer timer
        </Button>
      </PageHeader>

      {/* Quick entry form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 shadow-card mb-6"
      >
        <h3 className="font-heading font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Clock size={18} className="text-primary" /> Hurtig registrering
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">Sag</Label>
            <Input placeholder="Vælg sag..." className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Dato</Label>
            <Input type="date" defaultValue="2026-03-08" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Start</Label>
            <Input type="time" defaultValue="08:00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Slut</Label>
            <Input type="time" defaultValue="16:00" className="mt-1" />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Gem</Button>
          </div>
        </div>
      </motion.div>

      {/* History */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-card-foreground">Seneste registreringer</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Dato</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sag</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tid</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Timer</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockEntries.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-card-foreground">{e.date}</td>
                  <td className="px-5 py-3.5 font-medium text-card-foreground">{e.case}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{e.start} – {e.end}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {e.hours}t
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
