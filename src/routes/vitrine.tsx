import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vitrine")({
  head: () => ({
    meta: [
      { title: "Vitrine produits — Maison Barbier" },
      { name: "description", content: "Notre sélection de shampoings, parfums et soins disponibles en boutique." },
    ],
  }),
  component: VitrinePage,
});

function VitrinePage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const categories = Array.from(new Set((products ?? []).map((p) => p.category).filter(Boolean))) as string[];
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? products?.filter((p) => p.category === filter) : products;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-widest text-primary">Boutique</p>
        <h1 className="font-display text-4xl md:text-5xl mt-2">Vitrine</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Notre sélection de produits, disponibles en salon. Pour toute question, demandez en boutique.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button size="sm" variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>
            Tous
          </Button>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} onClick={() => setFilter(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-center text-muted-foreground">Chargement…</p>}

      {!isLoading && (filtered?.length ?? 0) === 0 && (
        <Card className="p-12 text-center bg-card border-dashed border-border">
          <p className="text-muted-foreground">Aucun produit pour le moment. Revenez bientôt !</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((p) => (
          <Card key={p.id} className="overflow-hidden bg-card border-border">
            <div
              className="h-48 bg-muted bg-cover bg-center"
              style={p.image_url ? { backgroundImage: `url(${p.image_url})` } : undefined}
            />
            <div className="p-5">
              {p.category && <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.category}</div>}
              <h3 className="mt-1 font-display text-xl">{p.name}</h3>
              {p.brand && <div className="text-sm text-muted-foreground">{p.brand}</div>}
              {p.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="mt-3 text-primary font-semibold">{Number(p.price).toFixed(2)} €</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
