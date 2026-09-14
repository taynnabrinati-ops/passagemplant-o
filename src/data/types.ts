export type UnitKind = "icu" | "ward";

export interface Unit {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  kind: UnitKind;
}

/**
 * The de-identified patient projection the board reads. The reference system
 * exposes it as the `patients_public` view so the bed grid never pulls the
 * full record.
 */
export interface PatientPublic {
  id: string;
  name: string;
  birth_date: string | null;
  age_years: number | null;
  admission_date: string;
  insurance: string | null;
  syndromic_dx: string | null;
  specific_dx: string | null;
  is_active: boolean;
  palliative_care: boolean;
  terminality: boolean;
  cfm_priority: string | null;
  has_allergy: boolean;
}

export interface Bed {
  id: string;
  bed_number: number;
  label: string | null;
  unit_id: string;
  sort_order: number;
  units: Unit | null;
  patients: PatientPublic[];
}

export interface Conduct {
  id: string;
  patient_id: string;
  text: string;
  done: boolean;
  deleted_at: string | null;
}

export type CultureStatus = "pending" | "positive" | "negative";

export interface Culture {
  id: string;
  patient_id: string;
  material: string;
  site: string | null;
  organism: string | null;
  collection_date: string;
  status: CultureStatus;
  resolved_at: string | null;
  deleted_at: string | null;
}

export interface WardVisit {
  id: string;
  patient_id: string;
  visited_at: string;
  deleted_at: string | null;
}

export interface Consult {
  id: string;
  patient_id: string;
  specialty: string;
  status: "pending" | "answered";
  deleted_at: string | null;
}

export interface Invasion {
  id: string;
  patient_id: string;
  kind: string;
  site: string | null;
  start_date: string;
  removed_at: string | null;
}

export interface Medication {
  id: string;
  patient_id: string;
  kind: string;
  drug: string;
  detail: string | null;
  start_date: string;
  end_date: string | null;
  note: string | null;
}

/** Aggregates the board overlays on each bed card. */
export interface ConductSummary {
  count: number;
  items: string[];
}

export interface PositiveCultureSummary {
  count: number;
  organisms: string[];
}

export interface PendingCultureSummary {
  count: number;
  items: { material: string; site: string | null; collection_date: string }[];
}

export interface UnitGroup {
  unitId: string;
  unitName: string;
  sort: number;
  kind: UnitKind;
  beds: Bed[];
}
