import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checklistSections } from "./elinstallation-data";
import { formatCaseLabel } from "@/lib/case-format";
import type { KredsRow, RcdRow, KortslutRow, SpændingsfaldRow } from "./elinstallation-data";

type Answer = "ja" | "nej" | "irrelevant" | null;

export function generateVerificationPdf(form: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  const isElForm = form.form_type === "Elinstallation – Verifikation";
  const items = form.items as any;
  const checklist: Record<string, Answer> = items?.checklist || {};
  const installInfo = items?.installation_info || {};
  const kredsRows: KredsRow[] = items?.kreds || [];
  const rcdRows: RcdRow[] = items?.rcd || [];
  const kortslutRows: KortslutRow[] = items?.kortslut || [];
  const spaendingsfaldRows: SpændingsfaldRow[] = items?.spaendingsfald || [];
  const overgangsmodstand: string = items?.overgangsmodstand || "";

  const hasData = (rows: any[]) => rows.some(r => Object.values(r).some(v => v && String(v).trim()));

  const checkNewPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(form.form_type || "Verifikationsskema", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const caseLabel = formatCaseLabel(form.cases as any, "");
  doc.text(`${(form.profiles as any)?.full_name || "Ukendt"} | ${caseLabel} | ${form.form_date}`, margin, y);
  y += 4;

  const statusText = form.status === "Godkendt" ? "GODKENDT" : form.status === "Afvist" ? "AFVIST" : "AFVENTER";
  doc.text(`Status: ${statusText}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  // Line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Basic info
  const addField = (label: string, value: string | null | undefined) => {
    checkNewPage(12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const displayValue = value && value.trim() ? value : "Ikke udfyldt";
    if (!value || !value.trim()) {
      doc.setTextColor(180);
    } else {
      doc.setTextColor(30);
    }
    const lines = doc.splitTextToSize(displayValue, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
    doc.setTextColor(0);
  };

  addField("Beskrivelse af udfoert arbejde", form.description);
  addField("Installationstype", form.installation_type);
  if (isElForm) {
    addField("Identifikation af installationen", installInfo.identification);
    addField("Udfoert af", installInfo.performed_by);
    addField("Verificeret af", installInfo.verified_by);
  }
  addField("Maaleresultater", form.measurements);
  addField("Bemaerkninger", form.comments);

  // Always show checklist for el-forms — show ALL items
  if (isElForm) {
    checkNewPage(15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Tjekliste", margin, y);
    y += 7;

    for (const section of checklistSections) {
      checkNewPage(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text(section.title, margin, y);
      y += 5;

      const tableData = section.items.map(item => {
        const a = checklist[item.id];
        const answerText = a === "ja" ? "Ja" : a === "nej" ? "Nej" : a === "irrelevant" ? "Ikke relevant" : "Ikke udfyldt";
        return [item.question, answerText];
      });

      autoTable(doc, {
        startY: y,
        head: [["Kontrolpunkt", "Svar"]],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 82, 130], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: pageWidth - margin * 2 - 28 },
          1: { cellWidth: 25, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const val = data.cell.text[0];
            if (val === "Ja") data.cell.styles.textColor = [34, 139, 34];
            else if (val === "Nej") data.cell.styles.textColor = [200, 40, 40];
            else if (val === "Ikke relevant") data.cell.styles.textColor = [140, 140, 140];
            else if (val === "Ikke udfyldt") data.cell.styles.textColor = [200, 200, 200];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }
  }

  // Measurement tables — always show headers, indicate if no data
  const addMeasurementSection = (title: string, head: string[][], body: string[][], hasRows: boolean) => {
    checkNewPage(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(title, margin, y);
    y += 5;

    if (hasRows) {
      autoTable(doc, {
        startY: y,
        head,
        body,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 82, 130], textColor: 255, fontStyle: "bold" },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(180);
      doc.text("Ingen data udfyldt", margin, y);
      doc.setTextColor(0);
      y += 8;
    }
  };

  if (isElForm) {
    addMeasurementSection(
      "Kredsdetaljer",
      [["Gruppe", "OB A", "Karakt.", "mm2", "Maks OB", "ZS", "RA", "Isol."]],
      kredsRows.filter(r => Object.values(r).some(v => v)).map(r => [r.gruppe, r.ob, r.karakteristik, r.tvaersnit, r.maksOb, r.zs, r.ra, r.isolation]),
      hasData(kredsRows)
    );

    if (overgangsmodstand) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Overgangsmodstand for jordingsleder: ${overgangsmodstand} Ohm`, margin, y);
      y += 6;
    }

    addMeasurementSection(
      "Afproevning af RCD'er",
      [["RCD", "0deg 1x", "180deg 1x", "0deg 5x", "0deg 0.5x", "0deg 1x", "180deg 1x", "Proveknap"]],
      rcdRows.filter(r => Object.values(r).some(v => v)).map(r => [r.rcd, r.sinus0, r.sinus180, r.sinus5x, r.puls0half, r.puls0, r.puls180, r.proveknap]),
      hasData(rcdRows)
    );

    addMeasurementSection(
      "Kortslutningsstroem",
      [["Gruppe", "Ik (kA)", "Maalt i punkt"]],
      kortslutRows.filter(r => Object.values(r).some(v => v)).map(r => [r.gruppe, r.ik, r.maaltPunkt]),
      hasData(kortslutRows)
    );

    addMeasurementSection(
      "Spaendingsfald",
      [["Gruppe", "U (%)", "Maalt i punkt"]],
      spaendingsfaldRows.filter(r => Object.values(r).some(v => v)).map(r => [r.gruppe, r.u, r.maaltPunkt]),
      hasData(spaendingsfaldRows)
    );
  }

  // Admin comment
  if (form.admin_comment) {
    checkNewPage(15);
    addField("Kommentar fra admin", form.admin_comment);
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(
      `ASA El-Service | Kvalitetsledelsessystem | Side ${i} af ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  const fileName = `${form.form_type || "Verifikation"} - ${caseLabel} - ${form.form_date}.pdf`.replace(/[/\\:]/g, "-");
  doc.save(fileName);
}
