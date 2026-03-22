import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerCaseSelect } from "@/components/CustomerCaseSelect";
import { Check, X, Minus, ChevronDown, ChevronUp, Plus, Trash2, ImagePlus, Send } from "lucide-react";
import { useRef } from "react";
import {
  checklistSections,
  emptyKredsRow,
  emptyRcdRow,
  emptyKortslutRow,
  emptySpændingsfaldRow,
  type KredsRow,
  type RcdRow,
  type KortslutRow,
  type SpændingsfaldRow,
} from "./elinstallation-data";

type Answer = "ja" | "nej" | "irrelevant" | null;

interface Props {
  cases: any[];
  onSubmit: (data: ElFormData) => void;
  isPending: boolean;
  isAdmin: boolean;
  onCancel: () => void;
}

export interface ElFormData {
  case_id: string;
  form_type: string;
  description: string;
  installation_type: string;
  comments: string;
  form_date: string;
  form_time: string;
  items: {
    checklist: Record<string, Answer>;
    installation_info: {
      identification: string;
      performed_by: string;
      verified_by: string;
    };
    kreds: KredsRow[];
    rcd: RcdRow[];
    kortslut: KortslutRow[];
    spaendingsfald: SpændingsfaldRow[];
    overgangsmodstand: string;
  };
  imageFiles: File[];
}

export default function ElInstallationForm({ cases, onSubmit, isPending, isAdmin, onCancel }: Props) {
  const [caseId, setCaseId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState(new Date().toTimeString().slice(0, 5));
  const [identification, setIdentification] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [comments, setComments] = useState("");

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistSections.map(s => [s.id, true]))
  );

  const [kredsRows, setKredsRows] = useState<KredsRow[]>([emptyKredsRow(), emptyKredsRow(), emptyKredsRow()]);
  const [rcdRows, setRcdRows] = useState<RcdRow[]>([emptyRcdRow()]);
  const [kortslutRows, setKortslutRows] = useState<KortslutRow[]>([emptyKortslutRow(), emptyKortslutRow(), emptyKortslutRow()]);
  const [spaendingsfaldRows, setSpaendingsfaldRows] = useState<SpændingsfaldRow[]>([emptySpændingsfaldRow(), emptySpændingsfaldRow(), emptySpændingsfaldRow()]);
  const [overgangsmodstand, setOvergangsmodstand] = useState("");

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const setAnswer = (itemId: string, value: Answer) => {
    setAnswers(prev => ({ ...prev, [itemId]: prev[itemId] === value ? null : value }));
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => setImagePreviews(prev => [...prev, URL.createObjectURL(f)]));
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const totalQuestions = checklistSections.reduce((sum, s) => sum + s.items.length, 0);
  const answeredQuestions = Object.values(answers).filter(a => a !== null).length;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      case_id: caseId,
      form_type: "Elinstallation – Verifikation",
      description: `Verifikation af mindre elinstallation`,
      installation_type: "Elinstallation",
      comments,
      form_date: formDate,
      form_time: formTime,
      items: {
        checklist: answers,
        installation_info: { identification, performed_by: performedBy, verified_by: verifiedBy },
        kreds: kredsRows,
        rcd: rcdRows,
        kortslut: kortslutRows,
        spaendingsfald: spaendingsfaldRows,
        overgangsmodstand,
      },
      imageFiles,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">


      {/* Case + date selection */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Installationsoplysninger</h3>
        <CustomerCaseSelect
          cases={cases || []}
          value={caseId}
          onChange={setCaseId}
          customerLabel="Kunde"
          caseLabel="Sag"
          customerPlaceholder="Vælg kunde..."
          casePlaceholder="Vælg sag..."
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dato</Label>
            <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1.5 rounded-xl h-11" required />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tidspunkt</Label>
            <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="mt-1.5 rounded-xl h-11" />
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Identifikation af installationen</Label>
          <Input value={identification} onChange={e => setIdentification(e.target.value)} placeholder="F.eks. hovedtavle, undertavle..." className="mt-1.5 rounded-xl h-11" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Installationen er udført af</Label>
            <Input value={performedBy} onChange={e => setPerformedBy(e.target.value)} placeholder="Navn" className="mt-1.5 rounded-xl h-11" />
          </div>
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Verifikation udført af</Label>
            <Input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)} placeholder="Navn" className="mt-1.5 rounded-xl h-11" />
          </div>
        </div>
      </div>

      {/* Checklist sections */}
      {checklistSections.map(section => {
        const sectionAnswered = section.items.filter(i => answers[i.id] != null).length;
        const isExpanded = expandedSections[section.id];
        return (
          <div key={section.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-sm font-heading font-bold text-card-foreground text-left">{section.title}</h3>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                  sectionAnswered === section.items.length
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {sectionAnswered}/{section.items.length}
                </span>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
            </button>
            {isExpanded && (
              <div className="border-t border-border">
                {section.items.map((item, idx) => (
                  <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:px-5 sm:py-3 ${idx !== section.items.length - 1 ? "border-b border-border/50" : ""}`}>
                    <p className="text-[13px] text-card-foreground leading-snug flex-1 min-w-0">{item.question}</p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setAnswer(item.id, "ja")}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                          answers[item.id] === "ja"
                            ? "bg-success text-white shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-success/10 hover:text-success"
                        }`}
                      >
                        <Check size={12} /> Ja
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(item.id, "nej")}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                          answers[item.id] === "nej"
                            ? "bg-destructive text-white shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        }`}
                      >
                        <X size={12} /> Nej
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(item.id, "irrelevant")}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                          answers[item.id] === "irrelevant"
                            ? "bg-muted-foreground text-white shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Minus size={12} /> Ikke relevant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Measurement results */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Måleresultater – Kredsdetaljer</h3>
        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full text-[11px] min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Gruppe</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">OB (Iₙ) A</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Karakt.</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Tvær. mm²</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Maks OB A</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">ZS Ω</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">RA Ω</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Isol. MΩ</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {kredsRows.map((row, i) => (
                <tr key={i} className="border-b border-border/30">
                  {(Object.keys(row) as (keyof KredsRow)[]).map(key => (
                    <td key={key} className="py-1 px-0.5">
                      <Input
                        value={row[key]}
                        onChange={e => {
                          const updated = [...kredsRows];
                          updated[i] = { ...updated[i], [key]: e.target.value };
                          setKredsRows(updated);
                        }}
                        className="h-8 rounded-lg text-[11px] px-2 bg-transparent border-border/50 focus:border-primary"
                      />
                    </td>
                  ))}
                  <td className="py-1 px-0.5">
                    {kredsRows.length > 1 && (
                      <button type="button" onClick={() => setKredsRows(prev => prev.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setKredsRows(prev => [...prev, emptyKredsRow()])} className="rounded-xl gap-1.5 text-[11px]">
          <Plus size={12} /> Tilføj række
        </Button>

        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overgangsmodstand for jordingsleder (Ω)</Label>
          <Input value={overgangsmodstand} onChange={e => setOvergangsmodstand(e.target.value)} placeholder="Ω" className="mt-1.5 rounded-xl h-11 max-w-xs" />
        </div>
      </div>

      {/* RCD test */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Afprøvning af RCD'er</h3>
        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full text-[11px] min-w-[580px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">RCD</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">0° 1×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">180° 1×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">0° 5×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">0° ½×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">0° 1×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">180° 1×IΔn</th>
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Prøveknap</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rcdRows.map((row, i) => (
                <tr key={i} className="border-b border-border/30">
                  {(Object.keys(row) as (keyof RcdRow)[]).map(key => (
                    <td key={key} className="py-1 px-0.5">
                      <Input
                        value={row[key]}
                        onChange={e => {
                          const updated = [...rcdRows];
                          updated[i] = { ...updated[i], [key]: e.target.value };
                          setRcdRows(updated);
                        }}
                        className="h-8 rounded-lg text-[11px] px-2 bg-transparent border-border/50 focus:border-primary"
                      />
                    </td>
                  ))}
                  <td className="py-1 px-0.5">
                    {rcdRows.length > 1 && (
                      <button type="button" onClick={() => setRcdRows(prev => prev.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRcdRows(prev => [...prev, emptyRcdRow()])} className="rounded-xl gap-1.5 text-[11px]">
          <Plus size={12} /> Tilføj RCD
        </Button>
      </div>

      {/* Short circuit + voltage drop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-heading font-bold text-card-foreground">Kortslutningsstrøm</h3>
          <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Gruppe</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Iₖ (kA)</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Målt i punkt</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {kortslutRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {(Object.keys(row) as (keyof KortslutRow)[]).map(key => (
                      <td key={key} className="py-1 px-0.5">
                        <Input
                          value={row[key]}
                          onChange={e => {
                            const updated = [...kortslutRows];
                            updated[i] = { ...updated[i], [key]: e.target.value };
                            setKortslutRows(updated);
                          }}
                          className="h-8 rounded-lg text-[11px] px-2 bg-transparent border-border/50 focus:border-primary"
                        />
                      </td>
                    ))}
                    <td className="py-1 px-0.5">
                      {kortslutRows.length > 1 && (
                        <button type="button" onClick={() => setKortslutRows(prev => prev.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setKortslutRows(prev => [...prev, emptyKortslutRow()])} className="rounded-xl gap-1.5 text-[11px]">
            <Plus size={12} /> Tilføj
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-heading font-bold text-card-foreground">Spændingsfald</h3>
          <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Gruppe</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">U (%)</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Målt i punkt</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {spaendingsfaldRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {(Object.keys(row) as (keyof SpændingsfaldRow)[]).map(key => (
                      <td key={key} className="py-1 px-0.5">
                        <Input
                          value={row[key]}
                          onChange={e => {
                            const updated = [...spaendingsfaldRows];
                            updated[i] = { ...updated[i], [key]: e.target.value };
                            setSpaendingsfaldRows(updated);
                          }}
                          className="h-8 rounded-lg text-[11px] px-2 bg-transparent border-border/50 focus:border-primary"
                        />
                      </td>
                    ))}
                    <td className="py-1 px-0.5">
                      {spaendingsfaldRows.length > 1 && (
                        <button type="button" onClick={() => setSpaendingsfaldRows(prev => prev.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSpaendingsfaldRows(prev => [...prev, emptySpændingsfaldRow()])} className="rounded-xl gap-1.5 text-[11px]">
            <Plus size={12} /> Tilføj
          </Button>
        </div>
      </div>

      {/* Comments + Images */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-card-foreground">Bemærkninger & billeder</h3>
        <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Eventuelle bemærkninger til installationen..." className="rounded-xl" rows={3} />
        <div>
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Billeder</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-border">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={10} /></button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <ImagePlus size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handleImageAdd} className="hidden" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl sm:order-1">
          Annuller
        </Button>
        <Button type="submit" disabled={isPending || !caseId} className="rounded-xl gap-2 shadow-[0_2px_8px_hsl(var(--primary)/0.25)] sm:order-2">
          <Send size={14} />
          {isPending ? "Indsender..." : isAdmin ? "Opret & godkend" : "Indsend til godkendelse"}
        </Button>
      </div>
    </form>
  );
}
