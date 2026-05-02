import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Check, X, Clock, User, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const STATUS = {
  pending: { label: "En attente", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmé", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  refused: { label: "Refusé", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancelled: { label: "Annulé", cls: "bg-muted text-muted-foreground border-border" },
  completed: { label: "Terminé", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
} as const;

function AdminDashboard() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");

  const { data: appts, isLoading } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name, price, duration_minutes)")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const pending = appts?.filter((a) => a.status === "pending") ?? [];
  const upcoming = appts?.filter((a) => a.status === "confirmed" && new Date(a.start_at) >= new Date()) ?? [];
  const todays = appts?.filter((a) => {
    const d = new Date(a.start_at);
    const t = new Date();
    return d.toDateString() === t.toDateString() && a.status === "confirmed";
  }) ?? [];
  const all = appts ?? [];

  const updateStatus = async (id: string, status: string, refusal_reason?: string) => {
    const payload: any = { status };
    if (refusal_reason) payload.refusal_reason = refusal_reason;
    const { error } = await supabase.from("appointments").update(payload).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    setSelected(null);
    setRefuseOpen(false);
    setRefuseReason("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl mb-6">Tableau de bord</h1>

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <StatCard label="En attente de validation" value={pending.length} accent />
        <StatCard label="RDV aujourd'hui" value={todays.length} />
        <StatCard label="RDV confirmés à venir" value={upcoming.length} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            En attente {pending.length > 0 && <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">À venir</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {isLoading && <p className="text-muted-foreground">Chargement…</p>}
          {!isLoading && pending.length === 0 && <Empty>Aucune demande en attente.</Empty>}
          {pending.map((a) => <Row key={a.id} a={a} onClick={() => setSelected(a)} />)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4 space-y-2">
          {upcoming.length === 0 && <Empty>Pas de RDV confirmé à venir.</Empty>}
          {upcoming.map((a) => <Row key={a.id} a={a} onClick={() => setSelected(a)} />)}
        </TabsContent>
        <TabsContent value="all" className="mt-4 space-y-2">
          {all.map((a) => <Row key={a.id} a={a} onClick={() => setSelected(a)} />)}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Détails du rendez-vous</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={STATUS[selected.status as keyof typeof STATUS]?.cls + " border"}>
                  {STATUS[selected.status as keyof typeof STATUS]?.label}
                </Badge>
              </div>
              <div className="space-y-2">
                <Field icon={Calendar} label="Date">
                  {new Date(selected.start_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                </Field>
                <Field icon={Clock} label="Durée">{selected.services?.duration_minutes} min</Field>
                <Field icon={Tag} label="Prestation">{selected.services?.name} — {selected.services?.price} €</Field>
                <Field icon={User} label="Client">
                  {selected.guest_first_name} {selected.guest_last_name}
                  {!selected.client_user_id && <span className="text-muted-foreground"> (invité)</span>}
                </Field>
                <Field icon={Mail} label="Email">{selected.guest_email}</Field>
                <Field icon={Phone} label="Téléphone">{selected.guest_phone}</Field>
                {selected.notes && (
                  <div className="pt-2">
                    <div className="text-muted-foreground text-xs">Note du client</div>
                    <div className="bg-muted/40 rounded p-2 mt-1">{selected.notes}</div>
                  </div>
                )}
                {selected.refusal_reason && (
                  <div className="pt-2">
                    <div className="text-muted-foreground text-xs">Motif de refus</div>
                    <div className="bg-red-500/10 text-red-300 rounded p-2 mt-1">{selected.refusal_reason}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selected?.status === "pending" && (
              <>
                <Button variant="outline" onClick={() => setRefuseOpen(true)}>
                  <X className="h-4 w-4 mr-1" /> Refuser
                </Button>
                <Button onClick={() => updateStatus(selected.id, "confirmed")} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="h-4 w-4 mr-1" /> Valider
                </Button>
              </>
            )}
            {selected?.status === "confirmed" && (
              <>
                <Button variant="outline" onClick={() => updateStatus(selected.id, "cancelled")}>Annuler</Button>
                <Button onClick={() => updateStatus(selected.id, "completed")}>Marquer terminé</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuse with reason */}
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Motif du refus (optionnel)</DialogTitle>
          </DialogHeader>
          <Textarea value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)} placeholder="Ex : créneau finalement indisponible…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(false)}>Annuler</Button>
            <Button onClick={() => selected && updateStatus(selected.id, "refused", refuseReason)} className="bg-destructive text-destructive-foreground">
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "border-primary/40 bg-primary/5" : "bg-card border-border"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-display ${accent ? "text-primary" : ""}`}>{value}</div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="p-6 text-center text-muted-foreground border-dashed">{children}</Card>;
}

function Row({ a, onClick }: { a: any; onClick: () => void }) {
  const start = new Date(a.start_at);
  const status = STATUS[a.status as keyof typeof STATUS];
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="p-4 bg-card border-border hover:border-primary/40 transition-colors flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg">{a.services?.name}</span>
            <Badge className={status?.cls + " border"}>{status?.label}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {start.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            {" · "}
            {a.guest_first_name} {a.guest_last_name}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground hidden sm:block">
          {a.guest_phone}
        </div>
      </Card>
    </button>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// Local Tag icon import workaround
import { Tag } from "lucide-react";
