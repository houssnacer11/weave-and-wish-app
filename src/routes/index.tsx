import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scissors, Sparkles, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maison Barbier — L'art de la coiffure masculine" },
      { name: "description", content: "Coupes signature, tailles de barbe et soins haut de gamme. Réservez votre rendez-vous en ligne." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: services } = useQuery({
    queryKey: ["featured-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").eq("active", true).order("sort_order").limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1600&q=80)" }}
        />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Salon de coiffure homme
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-tight">
            L'art de la <span className="text-primary">coiffure</span><br />masculine
          </h1>
          <p className="mt-6 mx-auto max-w-xl text-base md:text-lg text-muted-foreground">
            Coupes signature, tailles de barbe et soins haut de gamme.
            Une expérience pensée pour vous.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/reservation">
              <Button size="lg" className="bg-gradient-to-r from-[var(--gold)] to-[oklch(0.68_0.14_55)] text-primary-foreground shadow-[var(--shadow-gold)] hover:opacity-90">
                <Calendar className="mr-2 h-4 w-4" /> Prendre rendez-vous
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline">Voir les prestations</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Scissors, title: "Savoir-faire artisanal", text: "Des techniques maîtrisées et un sens du détail." },
            { icon: Clock, title: "Sur rendez-vous", text: "Pas d'attente, un créneau dédié rien que pour vous." },
            { icon: Sparkles, title: "Soins premium", text: "Produits sélectionnés pour vos cheveux et votre peau." },
          ].map((f) => (
            <Card key={f.title} className="bg-card border-border p-6">
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURED SERVICES */}
      <section className="container mx-auto px-4 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Nos prestations</p>
            <h2 className="font-display text-3xl md:text-4xl mt-2">Une gamme complète</h2>
          </div>
          <Link to="/services" className="text-sm text-primary hover:underline">
            Tout voir →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services?.map((s) => (
            <Card key={s.id} className="p-5 bg-card border-border flex flex-col">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.category}</div>
              <h3 className="mt-2 font-display text-xl">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-primary font-semibold">{Number(s.price).toFixed(2)} €</span>
                <span className="text-xs text-muted-foreground">{s.duration_minutes} min</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
