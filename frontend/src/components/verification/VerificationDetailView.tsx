import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CheckCircle2, XCircle, Clock, Download, Pencil, Check, X, Minus } from "lucide-react";
import { formatCaseLabel } from "@/lib/case-format";
import { checklistSections } from "./elinstallation-data";
import type { KredsRow, RcdRow, KortslutRow, SpændingsfaldRow } from "./elinstallation-data";
import { generateVerificationPdf } from "./VerificationPdfExport";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  Afventer: { color: "bg-warning/10 text-warning border border-warning/20", icon: Clock, label: "Afventer godkendelse" },
  Godkendt: { color: "bg-success/10 text-success border border-success/20", icon: CheckCircle2, label: "Godkendt" },
  Afvist: { color: "bg-destructive/10 text-destructive border border-destructive/20", icon: XCircle, label: "Afvist" },
};

type Answer = "ja" | "nej" | "irrelevant" | null;

interface Props {
  form: any;
  role: string | null;
  adminComment: string;
  setAdminComment: (v: string) => void;
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (form: any) => void;
  approveLoading: boolean;
  rejectLoading: boolean;
}

export default function VerificationDetailView({
  form: f,
  role,
  adminComment,
  setAdminComment,
  onBack,
  onApprove,
  onReject,
  onEdit,
  approveLoading,
  rejectLoading,
}: Props) {
  const cfg = statusConfig[f.status] || statusConfig.Afventer;
  const StatusIcon = cfg.icon;
  const isElForm = f.form_type === "Elinstallation – Verifikation";
  const items = f.items as any;
  const checklist: Record<string, Answer> = items?.checklist || {};
  const installInfo = items?.installation_info || {};
  const kredsRows: KredsRow[] = items?.kreds || [];
  const rcdRows: RcdRow[] = items?.rcd || [];
  const kortslutRows: KortslutRow[] = items?.kortslut || [];
  const spaendingsfaldRows: SpændingsfaldRow[] = items?.spaendingsfald || [];
  const overgangsmodstand: string = items?.overgangsmodstand || "";

  const answerIcon = (a: Answer) => {
    if (a === "ja") return <span className="inline-flex items-center gap-1 text-success text-xs font-semibold"><Check size={12} /> Ja</span>;
    if (a === "nej") return <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold"><X size={12} /> Nej</span>;
    if (a === "irrelevant") return <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-semibold"><Minus size={12} /> Ikke relevant</span>;
    return <span className="text-xs text-muted-foreground/50">–</span>;
  };

  const hasTableData = (rows: any[]) => rows.some(r => Object.values(r).some(v => v && String(v).trim()));

  const handleDownloadPdf = () => {
    generateVerificationPdf(f);
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft size={16} /> Tilbage til oversigt
      </button>

      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-heading font-bold text-card-foreground">{f.form_type}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(f.profiles as any)?.full_name} · {formatCaseLabel(f.cases as any, "Sag –")} · {f.form_date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${cfg.color}`}>
                <StatusIcon size={12} /> {cfg.label}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="rounded-xl gap-1.5">
              <Download size={14} /> Download PDF
            </Button>
            {(role === "admin" || f.status !== "Godkendt") && (
              <Button size="sm" variant="outline" onClick={() => onEdit(f)} className="rounded-xl gap-1.5">
                <Pencil size={14} /> Rediger
              </Button>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
          {f.description && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Beskrivelse af udført arbejde</p>
              <p className="text-sm text-card-foreground leading-relaxed">{f.description}</p>
            </div>
          )}
          {f.installation_type && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Installationstype</p>
              <p className="text-sm text-card-foreground">{f.installation_type}</p>
            </div>
          )}
          {isElForm && installInfo.identification && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Identifikation af installationen</p>
              <p className="text-sm text-card-foreground">{installInfo.identification}</p>
            </div>
          )}
          {isElForm && (installInfo.performed_by || installInfo.verified_by) && (
            <div className="grid grid-cols-2 gap-4">
              {installInfo.performed_by && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Udført af</p>
                  <p className="text-sm text-card-foreground">{installInfo.performed_by}</p>
                </div>
              )}
              {installInfo.verified_by && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Verificeret af</p>
                  <p className="text-sm text-card-foreground">{installInfo.verified_by}</p>
                </div>
              )}
            </div>
          )}
          {f.measurements && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Måleresultater</p>
              <p className="text-sm text-card-foreground whitespace-pre-wrap">{f.measurements}</p>
            </div>
          )}
          {f.comments && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bemærkninger</p>
              <p className="text-sm text-card-foreground">{f.comments}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        {isElForm && Object.keys(checklist).length > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="text-sm font-heading font-bold text-card-foreground mb-4">Tjekliste – Kontrolpunkter</h3>
            </div>
            {checklistSections.map(section => {
              const sectionAnswers = section.items.filter(i => checklist[i.id] != null);
              if (sectionAnswers.length === 0) return null;
              return (
                <div key={section.id} className="border-t border-border">
                  <div className="px-5 py-3 bg-muted/20">
                    <p className="text-xs font-semibold text-card-foreground">{section.title}</p>
                  </div>
                  {section.items.map((item, idx) => (
                    <div key={item.id} className={`flex items-start justify-between gap-4 px-5 py-2.5 ${idx !== section.items.length - 1 ? "border-b border-border/30" : ""}`}>
                      <p className="text-[13px] text-card-foreground leading-snug flex-1">{item.question}</p>
                      <div className="flex-shrink-0">{answerIcon(checklist[item.id])}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Measurement tables */}
        {isElForm && hasTableData(kredsRows) && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-heading font-bold text-card-foreground mb-3">Kredsdetaljer</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Gruppe</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">OB (In) A</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Karakt.</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Tvær. mm²</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Maks OB A</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">ZS Ω</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">RA Ω</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Isol. MΩ</th>
                  </tr>
                </thead>
                <tbody>
                  {kredsRows.filter(r => Object.values(r).some(v => v)).map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.gruppe}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.ob}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.karakteristik}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.tvaersnit}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.maksOb}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.zs}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.ra}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.isolation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {overgangsmodstand && (
              <p className="text-xs text-muted-foreground mt-3">Overgangsmodstand for jordingsleder: <span className="text-card-foreground font-medium">{overgangsmodstand} Ω</span></p>
            )}
          </div>
        )}

        {isElForm && hasTableData(rcdRows) && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-heading font-bold text-card-foreground mb-3">Afprøvning af RCD'er</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] min-w-[550px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">RCD</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">0° 1×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">180° 1×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">0° 5×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">0° ½×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">0° 1×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">180° 1×IΔn</th>
                    <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Prøveknap</th>
                  </tr>
                </thead>
                <tbody>
                  {rcdRows.filter(r => Object.values(r).some(v => v)).map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.rcd}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.sinus0}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.sinus180}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.sinus5x}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.puls0half}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.puls0}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.puls180}</td>
                      <td className="py-1.5 px-1.5 text-card-foreground">{row.proveknap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isElForm && (hasTableData(kortslutRows) || hasTableData(spaendingsfaldRows)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hasTableData(kortslutRows) && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-heading font-bold text-card-foreground mb-3">Kortslutningsstrøm</h3>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Gruppe</th>
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Ik (kA)</th>
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Målt i punkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kortslutRows.filter(r => Object.values(r).some(v => v)).map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.gruppe}</td>
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.ik}</td>
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.maaltPunkt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasTableData(spaendingsfaldRows) && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-heading font-bold text-card-foreground mb-3">Spændingsfald</h3>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Gruppe</th>
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">U (%)</th>
                      <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Målt i punkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spaendingsfaldRows.filter(r => Object.values(r).some(v => v)).map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.gruppe}</td>
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.u}</td>
                        <td className="py-1.5 px-1.5 text-card-foreground">{row.maaltPunkt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Images */}
        {f.image_urls && (f.image_urls as string[]).length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Billeder</p>
            <div className="flex flex-wrap gap-2">
              {(f.image_urls as string[]).map((url: string, j: number) => (
                <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 rounded-xl overflow-hidden border border-border hover:border-primary transition-colors">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Admin comment */}
        {f.admin_comment && (
          <div className="rounded-2xl border border-border bg-muted/20 p-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kommentar fra admin</p>
            <p className="text-sm text-card-foreground">{f.admin_comment}</p>
          </div>
        )}

        {/* Admin actions */}
        {role === "admin" && f.status === "Afventer" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kommentar (påkrævet ved afvisning)</Label>
              <Textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Tilføj kommentar..." className="mt-1.5 rounded-xl" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onApprove(f.id)} disabled={approveLoading} className="rounded-xl gap-1.5">
                <CheckCircle2 size={14} /> Godkend
              </Button>
              <Button variant="outline" onClick={() => onReject(f.id)} disabled={rejectLoading} className="rounded-xl gap-1.5 text-destructive hover:bg-destructive/10">
                <XCircle size={14} /> Afvis
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
