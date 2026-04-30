import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "./SearchableSelect";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Entry {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  notes: string | null;
  user_id: string;
  case_id: string;
  cases?: { case_number: string } | null;
}

interface TimeTrackingPdfExportProps {
  entries: Entry[];
  cases: { id: string; case_number?: string | null; customer?: string | null }[];
  profileMap: Record<string, string>;
  isAdmin: boolean;
}

type ExportMode = "by_case" | "all";

export function TimeTrackingPdfExport({ entries, cases, profileMap, isAdmin }: TimeTrackingPdfExportProps) {
  const [open, setOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState("");
  const [mode, setMode] = useState<ExportMode>("all");

  const caseOptions = (cases || []).map(c => ({
    value: c.id,
    label: c.case_number,
    sublabel: c.customer,
  }));

  const filteredEntries = mode === "by_case" && selectedCase
    ? entries.filter(e => e.case_id === selectedCase)
    : entries;

  const cleanNote = (note: string | null) =>
    (note || "").replace(/\s*\|?\s*30 min pause fratrukket/g, "").trim() || "";

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const caseInfo = mode === "by_case" && selectedCase
      ? cases.find(c => c.id === selectedCase)
      : null;
    const title = caseInfo
      ? `Timeregistrering – Sag ${caseInfo.case_number}`
      : "Timeregistrering – Alle sager";
    doc.text(title, 14, 18);

    if (caseInfo?.customer) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Kunde: ${caseInfo.customer}`, 14, 25);
    }

    // Date range
    const sorted = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const from = format(new Date(sorted[0].date + "T00:00"), "d. MMMM yyyy", { locale: da });
      const to = format(new Date(sorted[sorted.length - 1].date + "T00:00"), "d. MMMM yyyy", { locale: da });
      doc.text(`Periode: ${from} – ${to}`, 14, caseInfo?.customer ? 31 : 25);
    }

    const startY = caseInfo?.customer ? 36 : 30;

    // Group by employee
    const byEmployee: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach(e => {
      const name = profileMap[e.user_id] || "Ukendt";
      if (!byEmployee[name]) byEmployee[name] = [];
      byEmployee[name].push(e);
    });

    const employeeNames = Object.keys(byEmployee).sort((a, b) => a.localeCompare(b, "da"));

    let currentY = startY;

    employeeNames.forEach((empName, idx) => {
      const empEntries = byEmployee[empName].sort((a, b) => a.date.localeCompare(b.date));
      const totalHours = empEntries.reduce((s, e) => s + Number(e.hours), 0);

      // Employee header
      if (currentY > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        currentY = 14;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${empName}`, 14, currentY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total: ${Math.round(totalHours * 10) / 10} timer`, pageW - 14, currentY, { align: "right" });
      currentY += 3;

      const headers = mode === "all"
        ? [["Dato", "Dag", "Sag", "Start", "Slut", "Timer", "Frokost", "Note"]]
        : [["Dato", "Dag", "Start", "Slut", "Timer", "Frokost", "Note"]];

      const body = empEntries.map(e => {
        const dateObj = new Date(e.date + "T00:00");
        const hasBreak = e.notes?.includes("pause fratrukket");
        const row = [
          format(dateObj, "dd.MM.yyyy"),
          format(dateObj, "EEEE", { locale: da }),
          ...(mode === "all" ? [(e.cases as any)?.case_number || "–"] : []),
          e.start_time?.slice(0, 5) || "",
          e.end_time?.slice(0, 5) || "",
          `${e.hours}`,
          hasBreak ? "30 min" : "Ingen",
          cleanNote(e.notes),
        ];
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: headers,
        body,
        theme: "grid",
        headStyles: {
          fillColor: [41, 98, 180],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: mode === "all"
          ? { 0: { cellWidth: 24 }, 1: { cellWidth: 22 }, 2: { cellWidth: 28 }, 5: { halign: "right", cellWidth: 16 }, 6: { cellWidth: 18 } }
          : { 0: { cellWidth: 24 }, 1: { cellWidth: 24 }, 4: { halign: "right", cellWidth: 16 }, 5: { cellWidth: 18 } },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {},
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    // Grand total footer
    const grandTotal = filteredEntries.reduce((s, e) => s + Number(e.hours), 0);
    if (currentY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      currentY = 14;
    }
    doc.setDrawColor(41, 98, 180);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageW - 14, currentY);
    currentY += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total", 14, currentY);
    doc.text(`${Math.round(grandTotal * 10) / 10} timer`, pageW - 14, currentY, { align: "right" });
    currentY += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${filteredEntries.length} registreringer · ${employeeNames.length} medarbejdere`, 14, currentY);

    // Footer with date
    doc.setFontSize(7);
    doc.text(`Genereret: ${format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text("ASA KLS", pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });

    const filename = caseInfo
      ? `timeregistrering-${caseInfo.case_number}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      : `timeregistrering-alle-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
  };

  const totalHours = Math.round(filteredEntries.reduce((s, e) => s + Number(e.hours), 0) * 10) / 10;
  const uniqueEmployees = new Set(filteredEntries.map(e => e.user_id)).size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl h-10 gap-2 text-sm font-medium">
          <Download size={14} />
          PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <FileText size={17} className="text-primary" />
            </div>
            Download timeregistrering
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Mode */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Vælg type</Label>
            <div className="flex gap-2">
              {([
                { value: "all" as ExportMode, label: "Alle sager" },
                { value: "by_case" as ExportMode, label: "Specifik sag" },
              ]).map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                    mode === m.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Case selector */}
          {mode === "by_case" && (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sag</Label>
              <SearchableSelect
                options={caseOptions}
                value={selectedCase}
                onSelect={setSelectedCase}
                placeholder="Søg sag..."
                searchPlaceholder="Søg sagsnummer..."
                className="w-full"
              />
            </div>
          )}

          {/* Preview */}
          {filteredEntries.length > 0 && (
            <div className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-sm font-medium text-card-foreground mb-1">Indhold</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div><span className="font-bold text-foreground">{filteredEntries.length}</span> poster</div>
                <div><span className="font-bold text-foreground">{uniqueEmployees}</span> medarbejdere</div>
                <div><span className="font-bold text-primary">{totalHours}t</span> total</div>
              </div>
            </div>
          )}

          <Button
            onClick={generatePdf}
            disabled={filteredEntries.length === 0}
            className="w-full rounded-xl font-semibold shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"
          >
            <Download size={14} className="mr-2" />
            Download PDF ({filteredEntries.length} poster)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return <label className={className} {...props}>{children}</label>;
}
