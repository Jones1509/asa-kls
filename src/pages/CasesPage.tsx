import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const mockCases = [
  { id: "2026-014", customer: "Dansk Bygge A/S", address: "Aarhusvej 12, 8000 Aarhus", status: "Aktiv", employees: 3, start: "2026-02-01", end: "2026-04-15" },
  { id: "2026-018", customer: "NCC Danmark", address: "Kongensgade 45, 5000 Odense", status: "Aktiv", employees: 2, start: "2026-02-15", end: "2026-05-01" },
  { id: "2026-011", customer: "MT Højgaard", address: "Industrivej 8, 2650 Hvidovre", status: "Aktiv", employees: 4, start: "2026-01-10", end: "2026-03-30" },
  { id: "2026-008", customer: "Per Aarsleff", address: "Havnevej 22, 6700 Esbjerg", status: "Afsluttet", employees: 2, start: "2025-11-01", end: "2026-01-15" },
  { id: "2026-021", customer: "Enemærke & Petersen", address: "Strandvej 110, 2900 Hellerup", status: "Planlagt", employees: 0, start: "2026-04-01", end: "2026-06-30" },
];

const statusColors: Record<string, string> = {
  Aktiv: "bg-success/10 text-success",
  Afsluttet: "bg-muted text-muted-foreground",
  Planlagt: "bg-warning/10 text-warning",
};

export default function CasesPage() {
  return (
    <div>
      <PageHeader title="Sager" description="Oversigt over alle sager">
        <Button size="sm" className="gap-2">
          <Plus size={16} /> Ny sag
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg sager..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sagsnr.</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Kunde</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Adresse</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Periode</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockCases.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 font-medium text-card-foreground">{c.id}</td>
                  <td className="px-5 py-3.5 text-card-foreground">{c.customer}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {c.address}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{c.start} → {c.end}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
