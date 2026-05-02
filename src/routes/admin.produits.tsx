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

export const Route = createFileRoute("/admin/produits")({
  component: AdminProductsPage,
});

type Product = { name: string; brand: string; description: string; price: number; category: string; image_url: string; active: boolean; sort_order: number };
const empty: Product = { name: "", brand: "", description: "", price: 0, category: "", image_url: "", active: true, sort_order: 0 };

function AdminProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const save = async () => {
    if (!form.name) { toast.error("Nom requis"); return; }
    const payload = {
      ...form,
      brand: form.brand || null,
      description: form.description || null,
      category: form.category || null,
      image_url: form.image_url || null,
    };
    if (editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("products").insert(payload as never);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Enregistré");
    setOpen(false); setEditId(null); setForm(empty); refresh();
  };

  const startEdit = (p: any) => {
    setForm({
      name: p.name, brand: p.brand ?? "", description: p.description ?? "",
      price: Number(p.price), category: p.category ?? "", image_url: p.image_url ?? "",
      active: p.active, sort_order: p.sort_order,
    });
    setEditId(p.id); setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Produits</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouveau produit"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Marque</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              </div>
              <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Shampoing, Parfum…" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix (€)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div><Label>URL image</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><span className="text-sm">Visible en vitrine</span></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(products?.length ?? 0) === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed col-span-full">
            Aucun produit. Ajoutez-en pour les afficher dans la vitrine.
          </Card>
        )}
        {products?.map((p) => (
          <Card key={p.id} className={`p-4 bg-card border-border flex gap-3 ${!p.active ? "opacity-50" : ""}`}>
            <div className="w-20 h-20 bg-muted rounded shrink-0 bg-cover bg-center" style={p.image_url ? { backgroundImage: `url(${p.image_url})` } : undefined} />
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg truncate">{p.name}</div>
              {p.brand && <div className="text-xs text-muted-foreground">{p.brand}</div>}
              <div className="text-sm text-primary mt-1">{Number(p.price).toFixed(2)} €</div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
