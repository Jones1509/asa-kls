import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Aktiv: "bg-success/10 text-success border border-success/20",
  Afsluttet: "bg-muted text-muted-foreground border border-border",
  Planlagt: "bg-warning/10 text-warning border border-warning/20",
};

export default function CasesPage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ case_number: "", customer: "", address: "", description: "", start_date: "", end_date: "", status: "Aktiv" });

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createCase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cases").insert({
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setOpen(false);
      setForm({ case_number: "", customer: "", address: "", description: "", start_date: "", end_date: "", status: "Aktiv" });
      toast.success("Sag oprettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = cases?.filter(
    (c) =>
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.customer.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Sager" description="Oversigt over alle sager">
        {role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]"><Plus size={16} /> Ny sag</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader><DialogTitle className="font-heading font-bold text-lg">Opret ny sag</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createCase.mutate(); }} className="space-y-4">
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sagsnummer</Label><Input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="2026-025" className="mt-1.5 rounded-xl" required /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kunde</Label><Input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Dansk Bygge A/S" className="mt-1.5 rounded-xl" required /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Aarhusvej 12, 8000 Aarhus" className="mt-1.5 rounded-xl" required /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beskrivelse</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Startdato</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slutdato</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Annuller</Button>
                  <Button type="submit" disabled={createCase.isPending} className="rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]">{createCase.isPending ? "Opretter..." : "Opret sag"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Søg sager..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sagsnr.</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kunde</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Adresse</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Periode</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(filtered || []).map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-semibold text-card-foreground">{c.case_number}</td>
                  <td className="px-6 py-4 text-card-foreground">{c.customer}</td>
                  <td className="px-6 py-4 text-muted-foreground hidden md:table-cell"><span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground/50" /> {c.address}</span></td>
                  <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">{c.start_date || "–"} → {c.end_date || "–"}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[c.status] || ""}`}>{c.status}</span></td>
                </motion.tr>
              ))}
              {filtered?.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">Ingen sager fundet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
