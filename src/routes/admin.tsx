import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, LayoutDashboard, Clock, Package, Tag, LogOut, Home } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/horaires", label: "Horaires & blocages", icon: Clock },
  { to: "/admin/services", label: "Prestations", icon: Tag },
  { to: "/admin/produits", label: "Produits", icon: Package },
];

function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Vérification des accès…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar p-4 hidden md:flex flex-col">
        <Link to="/" className="flex items-center gap-2 text-primary mb-8">
          <Scissors className="h-5 w-5" />
          <span className="font-display text-lg font-bold">Maison Barbier</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {navItems.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-accent"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border pt-3 space-y-1">
          <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-accent">
            <Home className="h-4 w-4" /> Site public
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-accent">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-border flex justify-around p-2">
        {navItems.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return (
            <Link key={it.to} to={it.to} className={`flex flex-col items-center text-[10px] gap-0.5 px-2 py-1 rounded ${active ? "text-primary" : "text-muted-foreground"}`}>
              <it.icon className="h-4 w-4" />
              {it.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </div>
    </div>
  );
}
