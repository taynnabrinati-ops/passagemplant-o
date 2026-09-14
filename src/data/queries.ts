import { useQuery } from "@tanstack/react-query";
import * as provider from "./provider";
import type { Unit } from "./types";

/** Query keys match the reference build so cache behaviour is comparable. */

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: provider.fetchUnits,
    staleTime: 300_000,
  });
}

export function useBedsWithPatients(unit: Unit | undefined) {
  return useQuery({
    queryKey: ["beds-with-patients", unit?.id ?? "pending"],
    enabled: !!unit,
    queryFn: () => provider.fetchBedsWithPatients(unit!.id),
  });
}

export function useOpenConducts() {
  return useQuery({ queryKey: ["conducts-open"], queryFn: provider.fetchOpenConducts });
}

export function usePositiveCultures() {
  return useQuery({
    queryKey: ["positive-cultures-by-patient"],
    queryFn: provider.fetchPositiveCultures,
  });
}

export function usePendingCultures() {
  return useQuery({
    queryKey: ["pending-cultures-by-patient"],
    queryFn: provider.fetchPendingCultures,
  });
}

export function useWardVisitsToday(unit: Unit | undefined) {
  const isWard = unit?.kind === "ward";
  return useQuery({
    queryKey: ["ward-visits-today", unit?.id ?? "pending"],
    enabled: !!unit && isWard,
    queryFn: provider.fetchWardVisitsToday,
  });
}

export function usePendingConsults(unit: Unit | undefined) {
  const isWard = unit?.kind === "ward";
  return useQuery({
    queryKey: ["consults-pending"],
    enabled: !!unit && isWard,
    queryFn: provider.fetchPendingConsults,
  });
}

export function usePatientDetail(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-detail", patientId ?? "pending"],
    enabled: !!patientId,
    queryFn: async () => {
      const [invasions, medications, cultures, conducts] = await Promise.all([
        provider.fetchInvasions(patientId!),
        provider.fetchMedications(patientId!),
        provider.fetchPatientCultures(patientId!),
        provider.fetchPatientConducts(patientId!),
      ]);
      return { invasions, medications, cultures, conducts };
    },
  });
}
