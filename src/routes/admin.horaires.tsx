import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/horaires")({
  component: HoursPage,
});

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function HoursPage() {
  const qc = useQueryClient();

  const { data: hours } = useQuery({
    queryKey: ["business-hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_hours").select("*").order("day_of_week").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: blocks } = useQuery({
    queryKey: ["time-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_blocks").select("*").order("start_at");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["business-hours"] }); qc.invalidateQueries({ queryKey: ["time-blocks"] }); };

  const addSlot = async (day: number) => {
    const { error } = await supabase.from("business_hours").insert({ day_of_week: day, start_time: "09:00", end_time: "12:00" } as never);
    if (error) toast.error(error.message); else { refresh(); toast.success("Plage ajoutée"); }
  };

  const updateSlot = async (id: string, patch: any) => {
    const { error } = await supabase.from("business_hours").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("business_hours").delete().eq("id", id);
    if (error) toast.error(error.message); else { refresh(); toast.success("Supprimé"); }
  };

  // Block dialog state
  const [open, setOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ start: "", end: "", reason: "" });

  const addBlock = async () => {
    if (!blockForm.start || !blockForm.end) { toast.error("Renseignez début et fin"); return; }
    const { error } = await supabase.from("time_blocks").insert({
      start_at: new Date(blockForm.start).toISOString(),
      end_at: new Date(blockForm.end).toISOString(),
      reason: blockForm.reason || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Blocage ajouté");
    setOpen(false);
    setBlockForm({ start: "", end: "", reason: "" });
    refresh();
  };

  const deleteBlock = async (id: string) => {
    const { error } = await supabase.from("time_blocks").delete().eq("id", id);
    if (error) toast.error(error.message); else { refresh(); toast.success("Supprimé"); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <section>
        <h1 className="font-display text-3xl mb-2">Horaires d'ouverture</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Définissez les plages horaires pour chaque jour. Vous pouvez créer plusieurs plages par jour (ex. matin / après-midi).
        </p>
        <div className="space-y-3">
          {DAYS.map((label, day) => {
            const slots = hours?.filter((h) => h.day_of_week === day) ?? [];
            return (
              <Card key={day} className="p-4 bg-card border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display text-lg">{label}</div>
                  <Button size="sm" variant="outline" onClick={() => addSlot(day)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
                {slots.length === 0 && <div className="text-sm text-muted-foreground">Fermé</div>}
                <div className="space-y-2">
                  {slots.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Input type="time" defaultValue={(s.start_time as string).slice(0, 5)} onBlur={(e) => updateSlot(s.id, { start_time: e.target.value })} className="w-28" />
                      <span className="text-muted-foreground">→</span>
                      <Input type="time" defaultValue={(s.end_time as string).slice(0, 5)} onBlur={(e) => updateSlot(s.id, { end_time: e.target.value })} className="w-28" />
                      <div className="flex items-center gap-2 ml-2">
                        <Switch checked={s.active} onCheckedChange={(v) => updateSlot(s.id, { active: v })} />
                        <span className="text-xs text-muted-foreground">Actif</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteSlot(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-2xl">Blocages ponctuels</h2>
            <p className="text-sm text-muted-foreground">Vacances, formations, indisponibilités exceptionnelles.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajouter un blocage</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Nouveau blocage</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Début</Label><Input type="datetime-local" value={blockForm.start} onChange={(e) => setBlockForm({ ...blockForm, start: e.target.value })} /></div>
                <div><Label>Fin</Label><Input type="datetime-local" value={blockForm.end} onChange={(e) => setBlockForm({ ...blockForm, end: e.target.value })} /></div>
                <div><Label>Motif</Label><Input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} placeholder="Vacances, formation…" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={addBlock}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {(blocks?.length ?? 0) === 0 && <Card className="p-4 text-sm text-muted-foreground text-center border-dashed">Aucun blocage.</Card>}
          {blocks?.map((b) => (
            <Card key={b.id} className="p-4 bg-card border-border flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{b.reason || "Indisponible"}</div>
                <div className="text-muted-foreground">
                  Du {new Date(b.start_at).toLocaleString("fr-FR")} au {new Date(b.end_at).toLocaleString("fr-FR")}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteBlock(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
