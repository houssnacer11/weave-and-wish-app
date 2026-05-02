// Helpers pour générer les créneaux disponibles côté client.
// On lit business_hours, time_blocks et appointments via Supabase puis on calcule.
import { supabase } from "@/integrations/supabase/client";

export type Slot = { start: Date; end: Date };

const SLOT_STEP_MIN = 15; // pas de proposition: 15 min

function setTimeOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calcule les créneaux libres pour une date donnée et une durée de service.
 */
export async function getAvailableSlots(date: Date, durationMin: number): Promise<Slot[]> {
  const dayOfWeek = date.getDay(); // 0..6
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const [hoursRes, blocksRes, apptsRes] = await Promise.all([
    supabase.from("business_hours").select("*").eq("day_of_week", dayOfWeek).eq("active", true),
    supabase.from("time_blocks").select("*")
      .lte("start_at", dayEnd.toISOString())
      .gte("end_at", dayStart.toISOString()),
    supabase.from("appointments").select("start_at,end_at,status")
      .gte("start_at", dayStart.toISOString())
      .lte("start_at", dayEnd.toISOString())
      .in("status", ["pending", "confirmed"]),
  ]);

  const hours = hoursRes.data ?? [];
  const blocks = (blocksRes.data ?? []).map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) }));
  const appts = (apptsRes.data ?? []).map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) }));

  const now = new Date();
  const slots: Slot[] = [];

  for (const h of hours) {
    let cursor = setTimeOnDate(date, h.start_time as unknown as string);
    const end = setTimeOnDate(date, h.end_time as unknown as string);
    while (true) {
      const slotEnd = new Date(cursor.getTime() + durationMin * 60_000);
      if (slotEnd > end) break;

      const isPast = cursor <= now;
      const blockedByBlock = blocks.some((b) => overlaps(cursor, slotEnd, b.start, b.end));
      const blockedByAppt = appts.some((a) => overlaps(cursor, slotEnd, a.start, a.end));

      if (!isPast && !blockedByBlock && !blockedByAppt) {
        slots.push({ start: new Date(cursor), end: slotEnd });
      }
      cursor = new Date(cursor.getTime() + SLOT_STEP_MIN * 60_000);
    }
  }
  return slots;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
