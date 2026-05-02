import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Nos prestations — Maison Barbier" },
      { name: "description", content: "Découvrez nos prestations : coiffure homme, taille de barbe, brushing, soins kératine et soins visage." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const navigate = useNavigate();
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const grouped = (services ?? []).reduce<Record<string, typeof services>>((acc, s) => {
    const k = s.category ?? "Autres";
    (acc[k] ||= [] as never).push(s as never);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-primary">Catalogue</p>
        <h1 className="font-display text-4xl md:text-5xl mt-2">Nos prestations</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Tarifs et durées indicatifs. Cliquez sur "Réserver" pour choisir un créneau.
        </p>
      </div>

      {isLoading && <p className="text-center text-muted-foreground">Chargement…</p>}

      <div className="space-y-12">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="font-display text-2xl text-primary mb-4">{cat}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items?.map((s) => (
                <Card key={s.id} className="p-6 bg-card border-border flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-display text-xl">{s.name}</h3>
                    {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} min</span>
                      <span className="text-primary font-semibold text-base">{Number(s.price).toFixed(2)} €</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: "/reservation", search: { service: s.id } })}
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Réserver
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
