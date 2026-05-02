import { Scissors } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-20">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Scissors className="h-5 w-5" />
            <span className="font-display text-xl font-bold">Maison Barbier</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            L'art de la coiffure masculine. Coupes, barbes et soins dans une ambiance feutrée.
          </p>
        </div>
        <div>
          <h4 className="font-display text-lg text-foreground">Horaires</h4>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>Lundi · Fermé</li>
            <li>Mardi – Vendredi · 9h–12h30 / 14h–19h</li>
            <li>Samedi · 9h–19h</li>
            <li>Dimanche · Fermé</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg text-foreground">Contact</h4>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>contact@maisonbarbier.fr</li>
            <li>+33 1 23 45 67 89</li>
            <li>12 rue des Artisans, Paris</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Maison Barbier. Tous droits réservés.
      </div>
    </footer>
  );
}
