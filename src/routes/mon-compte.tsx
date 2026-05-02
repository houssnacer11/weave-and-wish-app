import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/mon-compte")({
  head: () => ({ meta: [{ title: "Mon compte — Maison Barbier" }] }),
  component: AccountPage,
});

const STATUS_LABEL: Record<string, { label: string; variant: string }> = {
  pending: { label: "En attente", variant: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmé", variant: "bg-green-500/15 text-green-400 border-green-500/30" },
  refused: { label: "Refusé", variant: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancelled: { label: "Annulé", variant: "bg-muted text-muted-foreground border-border" },
  completed: { label: "Terminé", variant: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: appts } = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name, price, duration_minutes)")
        .eq("client_user_id", user!.id)
        .order("start_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rendez-vous annulé");
    qc.invalidateQueries({ queryKey: ["my-appointments"] });
  };

  if (!user) return null;

  const upcoming = appts?.filter((a) => new Date(a.start_at) >= new Date() && !["cancelled", "refused"].includes(a.status));
  const past = appts?.filter((a) => new Date(a.start_at) < new Date() || ["cancelled", "refused"].includes(a.status));

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Mon espace</p>
          <h1 className="font-display text-4xl mt-1">Mes rendez-vous</h1>
        </div>
        <Link to="/reservation"><Button>Nouveau RDV</Button></Link>
      </div>

      <h2 className="font-display text-xl mb-3 text-primary">À venir</h2>
      {(upcoming?.length ?? 0) === 0 && (
        <Card className="p-6 text-center text-muted-foreground border-dashed mb-8">
          Aucun rendez-vous à venir.
        </Card>
      )}
      <div className="space-y-3 mb-10">
        {upcoming?.map((a) => (
          <ApptCard key={a.id} a={a} onCancel={cancel} />
        ))}
      </div>

      <h2 className="font-display text-xl mb-3 text-muted-foreground">Historique</h2>
      <div className="space-y-3">
        {past?.map((a) => <ApptCard key={a.id} a={a} />)}
        {(past?.length ?? 0) === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed">Pas encore d'historique.</Card>
        )}
      </div>
    </div>
  );
}

function ApptCard({ a, onCancel }: { a: any; onCancel?: (id: string) => void }) {
  const status = STATUS_LABEL[a.status] ?? { label: a.status, variant: "" };
  const start = new Date(a.start_at);
  const canCancel = onCancel && ["pending", "confirmed"].includes(a.status);
  return (
    <Card className="p-4 bg-card border-border flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="flex items-center gap-2">
          <div className="font-display text-lg">{a.services?.name}</div>
          <Badge className={status.variant + " border"}>{status.label}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.services?.price} €
        </div>
        {a.refusal_reason && <div className="text-sm text-red-400 mt-1">Motif : {a.refusal_reason}</div>}
      </div>
      {canCancel && (
        <Button variant="outline" size="sm" onClick={() => onCancel!(a.id)}>Annuler</Button>
      )}
    </Card>
  );
}
