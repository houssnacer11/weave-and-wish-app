import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/services", label: "Prestations" },
  { to: "/vitrine", label: "Vitrine" },
  { to: "/reservation", label: "Réserver" },
];

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Scissors className="h-5 w-5" />
          <span className="font-display text-xl font-bold tracking-wide">Maison Barbier</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={`text-sm transition-colors hover:text-primary ${
                path === it.to ? "text-primary" : "text-foreground/80"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm">Admin</Button>
                </Link>
              )}
              <Link to="/mon-compte">
                <Button variant="ghost" size="sm">Mon compte</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>Déconnexion</Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">Connexion</Button>
            </Link>
          )}
          <Link to="/reservation">
            <Button size="sm" className="bg-gradient-to-r from-[var(--gold)] to-[oklch(0.68_0.14_55)] text-primary-foreground hover:opacity-90">
              Prendre RDV
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border md:hidden">
          <div className="container mx-auto flex flex-col gap-1 p-4">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`rounded px-3 py-2 text-sm ${
                  path === it.to ? "bg-accent text-primary" : "text-foreground/80"
                }`}
              >
                {it.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-2 flex flex-col gap-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">Admin</Button>
                    </Link>
                  )}
                  <Link to="/mon-compte" onClick={() => setOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">Mon compte</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => { signOut(); setOpen(false); }}>Déconnexion</Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">Connexion</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
