import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const days = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];

const schedule = [
  { day: "Mandag", case: "2026-014", address: "Aarhusvej 12", start: "08:00", end: "16:00" },
  { day: "Tirsdag", case: null, address: null, start: null, end: null },
  { day: "Onsdag", case: "2026-018", address: "Kongensgade 45", start: "07:30", end: "15:30" },
  { day: "Torsdag", case: "2026-014", address: "Aarhusvej 12", start: "08:00", end: "16:00" },
  { day: "Fredag", case: "2026-011", address: "Industrivej 8", start: "09:00", end: "14:00" },
];

export default function SchedulePage() {
  return (
    <div>
      <PageHeader title="Kalender" description="Ugeplan og arbejdsplanlægning">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><ChevronLeft size={16} /></Button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">Uge 10 · Marts 2026</span>
          <Button variant="outline" size="icon"><ChevronRight size={16} /></Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {schedule.map((s, i) => (
          <motion.div
            key={s.day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`rounded-xl border p-4 ${
              s.case
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.day}</p>
            {s.case ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-card-foreground">Sag {s.case}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={12} /> {s.address}
                </p>
                <div className="rounded-md bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground border border-border">
                  {s.start} – {s.end}
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground italic">Fri</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
