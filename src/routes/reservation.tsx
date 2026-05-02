import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { getAvailableSlots, formatTime, type Slot } from "@/lib/availability";
import { Check, Clock, ChevronRight, ChevronLeft, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { fr } from "date-fns/locale";

type SearchParams = { service?: string; step?: number };

export const Route = createFileRoute("/reservation")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    service: typeof s.service === "string" ? s.service : undefined,
    step: typeof s.step === "number" ? s.step : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Réserver un rendez-vous — Maison Barbier" },
      { name: "description", content: "Réservez votre coupe en quelques clics : choisissez votre prestation, votre créneau, et confirmez." },
    ],
  }),
  component: ReservationPage,
});

const guestSchema = z.object({
  first_name: z.string().trim().min(1, "Prénom requis").max(50),
  last_name: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().email("Email invalide"),
  phone: z.string().trim().min(6, "Téléphone requis").max(20),
  notes: z.string().max(500).optional(),
});

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; category: string | null };

function Stepper({ current }: { current: number }) {
  const steps = ["Prestation", "Date & créneau", "Coordonnées", "Confirmation"];
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = num < current;
          const active = num === current;
          return (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold shrink-0 ${
                done ? "bg-primary text-primary-foreground border-primary" :
                active ? "bg-primary/15 text-primary border-primary" :
                "bg-card text-muted-foreground border-border"
              }`}>
                {done ? <Check className="h-4 w-4" /> : num}
              </div>
              <div className={`text-xs sm:text-sm hidden sm:block ${active ? "text-primary font-medium" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservationPage() {
  const { service: presetServiceId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string | undefined>(presetServiceId);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<Slot | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const [guestForm, setGuestForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", notes: "",
  });

  // Préremplir si connecté
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile && user) {
      setGuestForm((g) => ({
        ...g,
        first_name: g.first_name || profile.first_name || "",
        last_name: g.last_name || profile.last_name || "",
        email: g.email || user.email || "",
        phone: g.phone || profile.phone || "",
      }));
    }
  }, [profile, user]);

  const { data: services } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  const selectedService = useMemo(
    () => services?.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  // Pré-sélection venant de /services
  useEffect(() => {
    if (presetServiceId && services?.some((s) => s.id === presetServiceId)) {
      setServiceId(presetServiceId);
      setStep(2);
    }
  }, [presetServiceId, services]);

  // Slots
  const { data: slots, isFetching: loadingSlots } = useQuery({
    queryKey: ["slots", date?.toISOString().slice(0, 10), selectedService?.duration_minutes],
    enabled: !!date && !!selectedService,
    queryFn: () => getAvailableSlots(date!, selectedService!.duration_minutes),
  });

  const submit = async () => {
    if (!selectedService || !slot) return;

    let payload: Record<string, unknown> = {
      service_id: selectedService.id,
      start_at: slot.start.toISOString(),
      end_at: slot.end.toISOString(),
      status: "pending",
      notes: guestForm.notes || null,
    };

    if (user) {
      payload.client_user_id = user.id;
      payload.guest_first_name = guestForm.first_name || null;
      payload.guest_last_name = guestForm.last_name || null;
      payload.guest_email = guestForm.email || user.email;
      payload.guest_phone = guestForm.phone || null;
    } else {
      const parsed = guestSchema.safeParse(guestForm);
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
      payload = {
        ...payload,
        guest_first_name: parsed.data.first_name,
        guest_last_name: parsed.data.last_name,
        guest_email: parsed.data.email,
        guest_phone: parsed.data.phone,
      };
    }

    setSubmitting(true);
    const { data, error } = await supabase.from("appointments").insert(payload as never).select("id").single();
    setSubmitting(false);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setReferenceId(data.id);
    setStep(4);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-primary">Réservation</p>
        <h1 className="font-display text-4xl mt-2">Prenez votre rendez-vous</h1>
      </div>

      <Stepper current={step} />

      {/* STEP 1: SERVICE */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl">1. Choisissez votre prestation</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {services?.map((s) => {
              const active = serviceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`text-left rounded-lg border p-4 transition-all ${
                    active ? "border-primary bg-primary/10 shadow-[var(--shadow-gold)]" : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-display text-lg">{s.name}</div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-primary font-semibold">{Number(s.price).toFixed(2)} €</span>
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button disabled={!serviceId} onClick={() => setStep(2)}>
              Suivant <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: DATE & SLOT */}
      {step === 2 && selectedService && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl">2. Choisissez la date et l'heure</h2>
          <div className="text-sm text-muted-foreground">
            Prestation : <span className="text-foreground font-medium">{selectedService.name}</span> · {selectedService.duration_minutes} min
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-3 bg-card border-border">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d ?? undefined); setSlot(undefined); }}
                locale={fr}
                disabled={(d) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  return d < today;
                }}
                className="p-3 pointer-events-auto"
              />
            </Card>

            <div>
              <div className="text-sm text-muted-foreground mb-2 inline-flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {date ? date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sélectionnez un jour"}
              </div>

              {!date && (
                <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
                  Choisissez une date pour voir les créneaux.
                </Card>
              )}

              {date && loadingSlots && (
                <Card className="p-6 text-center text-sm text-muted-foreground">Chargement des créneaux…</Card>
              )}

              {date && !loadingSlots && (slots?.length ?? 0) === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
                  Aucun créneau disponible ce jour-là. Essayez un autre jour.
                </Card>
              )}

              {date && !loadingSlots && (slots?.length ?? 0) > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {slots!.map((s) => {
                    const active = slot?.start.getTime() === s.start.getTime();
                    return (
                      <button
                        key={s.start.toISOString()}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={`rounded-md border px-3 py-2 text-sm transition-all ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {formatTime(s.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Retour
            </Button>
            <Button disabled={!slot} onClick={() => setStep(3)}>
              Suivant <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: COORDONNÉES */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl">3. Vos coordonnées</h2>

          {!user && (
            <Card className="p-4 bg-card/60 border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-medium">Vous avez déjà un compte ?</div>
                <div className="text-muted-foreground">Connectez-vous pour préremplir vos infos.</div>
              </div>
              <Link to="/login"><Button size="sm" variant="outline">Se connecter</Button></Link>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Prénom *</Label>
              <Input value={guestForm.first_name} onChange={(e) => setGuestForm({ ...guestForm, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={guestForm.last_name} onChange={(e) => setGuestForm({ ...guestForm, last_name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone *</Label>
              <Input type="tel" value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Textarea
              maxLength={500}
              placeholder="Ex : préférences, demande particulière…"
              value={guestForm.notes}
              onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
            />
          </div>

          {/* Récapitulatif */}
          <Card className="p-4 bg-primary/5 border-primary/30">
            <div className="font-display text-lg mb-2">Récapitulatif</div>
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Prestation :</span> {selectedService?.name}</div>
              <div><span className="text-muted-foreground">Date :</span> {slot && slot.start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              <div><span className="text-muted-foreground">Heure :</span> {slot && `${formatTime(slot.start)} – ${formatTime(slot.end)}`}</div>
              <div><span className="text-muted-foreground">Prix :</span> <span className="text-primary font-semibold">{selectedService && Number(selectedService.price).toFixed(2)} €</span></div>
            </div>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Retour
            </Button>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-[var(--gold)] to-[oklch(0.68_0.14_55)] text-primary-foreground hover:opacity-90">
              {submitting ? "Envoi…" : "Demander la réservation"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && (
        <Card className="p-8 text-center bg-card border-border">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="font-display text-3xl">Demande envoyée !</h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Votre demande de réservation a bien été transmise. Le coiffeur la validera prochainement.
            Vous pouvez suivre son statut dans <Link to="/mon-compte" className="text-primary hover:underline">votre espace</Link>{!user && " (en vous créant un compte)"}.
          </p>
          {referenceId && (
            <p className="mt-4 text-xs text-muted-foreground">
              Référence : <span className="font-mono text-foreground">{referenceId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/"><Button variant="outline">Accueil</Button></Link>
            {user && <Link to="/mon-compte"><Button>Mes RDV</Button></Link>}
          </div>
        </Card>
      )}
    </div>
  );
}
