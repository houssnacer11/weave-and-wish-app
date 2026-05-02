import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({
  component: AdminServicesPage,
});

type Service = { id?: string; name: string; description: string; price: number; duration_minutes: number; category: string; active: boolean; sort_order: number };
const empty: Service = { name: "", description: "", price: 0, duration_minutes: 30, category: "", active: true, sort_order: 0 };

function AdminServicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Service>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-services"] });

  const save = async () => {
    if (!form.name || form.price < 0 || form.duration_minutes <= 0) { toast.error("Champs invalides"); return; }
    const payload = { ...form, description: form.description || null, category: form.category || null };
    if (editId) {
      const { error } = await supabase.from("services").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { id: _i, ...insertPayload } = payload;
      const { error } = await supabase.from("services").insert(insertPayload as never);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Enregistré");
    setOpen(false);
    setEditId(null);
    setForm(empty);
    refresh();
  };

  const startEdit = (s: any) => {
    setForm({
      name: s.name, description: s.description ?? "", price: Number(s.price),
      duration_minutes: s.duration_minutes, category: s.category ?? "", active: s.active, sort_order: s.sort_order,
    });
    setEditId(s.id);
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette prestation ?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    refresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Prestations</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouvelle prestation"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix (€)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><span className="text-sm">Actif</span></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {services?.map((s) => (
          <Card key={s.id} className={`p-4 bg-card border-border flex items-center justify-between gap-3 flex-wrap ${!s.active ? "opacity-50" : ""}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg">{s.name}</span>
                {s.category && <span className="text-xs bg-muted px-2 py-0.5 rounded">{s.category}</span>}
                {!s.active && <span className="text-xs text-muted-foreground">(masqué)</span>}
              </div>
              {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
              <div className="text-sm text-primary">{Number(s.price).toFixed(2)} € · {s.duration_minutes} min</div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
