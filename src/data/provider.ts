import { todayInSaoPaulo } from "@/lib/days";
import * as demo from "./demo";
import type {
  Bed,
  ConductSummary,
  Invasion,
  Medication,
  PendingCultureSummary,
  PositiveCultureSummary,
  Unit,
} from "./types";

/**
 * Read side of the board. Every function mirrors one query the reference
 * system issues against Supabase; swapping this module for a real client is
 * the only change needed to put the board on live data — see README.
 */

/** Keeps the loading skeletons honest during development. */
const LATENCY_MS = 180;

function resolve<T>(value: T): Promise<T> {
  return new Promise((done) => setTimeout(() => done(value), LATENCY_MS));
}

export function fetchUnits(): Promise<Unit[]> {
  return resolve([...demo.units].sort((a, b) => a.sort_order - b.sort_order));
}

export function fetchBedsWithPatients(unitId: string): Promise<Bed[]> {
  const beds = demo.beds
    .filter((bed) => bed.unit_id === unitId)
    .sort((a, b) => a.sort_order - b.sort_order);
  return resolve(beds);
}

export function fetchOpenConducts(): Promise<Record<string, ConductSummary>> {
  const byPatient: Record<string, ConductSummary> = {};
  for (const conduct of demo.conducts) {
    if (conduct.done || conduct.deleted_at) continue;
    const entry = byPatient[conduct.patient_id] ?? { count: 0, items: [] };
    entry.count += 1;
    entry.items.push(conduct.text);
    byPatient[conduct.patient_id] = entry;
  }
  return resolve(byPatient);
}

export function fetchPositiveCultures(): Promise<Record<string, PositiveCultureSummary>> {
  const byPatient: Record<string, PositiveCultureSummary> = {};
  for (const culture of demo.cultures) {
    if (culture.status !== "positive" || culture.resolved_at || culture.deleted_at) continue;
    const entry = byPatient[culture.patient_id] ?? { count: 0, organisms: [] };
    entry.count += 1;
    if (culture.organism) entry.organisms.push(culture.organism);
    byPatient[culture.patient_id] = entry;
  }
  return resolve(byPatient);
}

export function fetchPendingCultures(): Promise<Record<string, PendingCultureSummary>> {
  const byPatient: Record<string, PendingCultureSummary> = {};
  for (const culture of demo.cultures) {
    if (culture.status !== "pending" || culture.resolved_at || culture.deleted_at) continue;
    const entry = byPatient[culture.patient_id] ?? { count: 0, items: [] };
    entry.count += 1;
    entry.items.push({
      material: culture.material,
      site: culture.site,
      collection_date: culture.collection_date,
    });
    byPatient[culture.patient_id] = entry;
  }
  return resolve(byPatient);
}

/** Patient ids visited today, in the unit's own timezone. */
export function fetchWardVisitsToday(): Promise<Set<string>> {
  const today = todayInSaoPaulo();
  const visited = new Set<string>();
  for (const visit of demo.wardVisits) {
    if (visit.deleted_at) continue;
    const day = new Date(visit.visited_at).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    if (day === today) visited.add(visit.patient_id);
  }
  return resolve(visited);
}

export function fetchPendingConsults(): Promise<Record<string, number>> {
  const byPatient: Record<string, number> = {};
  for (const consult of demo.consults) {
    if (consult.status !== "pending" || consult.deleted_at) continue;
    byPatient[consult.patient_id] = (byPatient[consult.patient_id] ?? 0) + 1;
  }
  return resolve(byPatient);
}

export function fetchInvasions(patientId: string): Promise<Invasion[]> {
  return resolve(
    demo.invasions.filter((item) => item.patient_id === patientId && !item.removed_at),
  );
}

export function fetchMedications(patientId: string): Promise<Medication[]> {
  return resolve(
    demo.medications.filter((item) => item.patient_id === patientId && !item.end_date),
  );
}

export function fetchPatientCultures(patientId: string) {
  return resolve(
    demo.cultures.filter((item) => item.patient_id === patientId && !item.deleted_at),
  );
}

export function fetchPatientConducts(patientId: string) {
  return resolve(
    demo.conducts.filter((item) => item.patient_id === patientId && !item.deleted_at),
  );
}

export const ORG_NAME = demo.ORG_NAME;
