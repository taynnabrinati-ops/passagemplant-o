import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { daysSince, ageFromBirthDate, isOncePerDay, therapyDayLabel, parseDate } from "@/lib/days";
import * as demo from "./demo";

/** Um paciente como ele aparece na passagem de plantão. */
export interface PacientePassagem {
  leito: string;
  nome: string;
  idade: string;
  dataInternacao: string;
  diagnostico: string;
  comorbidades: string;
  alergias: string;
  dispositivos: string[];
  antibioticos: string[];
  culturas: string[];
  pendencias: string[];
  observacoes: string;
}

export interface Setor {
  id: string;
  nome: string;
}

export interface PassagemSetor {
  setor: string;
  atualizadoEm: string;
  pacientes: PacientePassagem[];
}

export type Origem = "viver" | "demonstracao";

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "d", "di", "du"]);

/** "Antônio Carvalho de Lima" → "A.C.L." */
export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !PARTICULAS.has(parte.toLowerCase().replace(/[.']/g, "")))
    .map((parte) => `${parte[0]!.toUpperCase()}.`)
    .join("");
}

/** Aceita "dd/mm/aaaa" (como vem do Viver) ou "aaaa-mm-dd". */
export function diaDeInternacao(data: string): number | null {
  if (!data) return null;
  const br = data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : data.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!iso) return null;
  const dias = daysSince(iso);
  return Number.isFinite(dias) && dias > 0 ? dias : null;
}

async function pegarJson<T>(url: string): Promise<T> {
  const resposta = await fetch(url);
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro ?? `Erro ${resposta.status}`);
  return corpo as T;
}

/** O servidor local está rodando e com o Viver configurado? */
export function useStatusViver() {
  return useQuery({
    queryKey: ["viver-status"],
    queryFn: async () => {
      try {
        return await pegarJson<{ configurado: boolean; minutos: number }>("/api/viver/status");
      } catch {
        return { configurado: false, minutos: 5 };
      }
    },
    staleTime: 60_000,
  });
}

export function useSetores(origem: Origem | undefined) {
  return useQuery({
    queryKey: ["setores", origem],
    enabled: !!origem,
    queryFn: async (): Promise<Setor[]> =>
      origem === "viver"
        ? pegarJson<Setor[]>("/api/viver/setores")
        : demo.units.map((u) => ({ id: u.id, nome: u.name })),
    staleTime: 10 * 60_000,
  });
}

export function usePassagem(origem: Origem | undefined, setor: string | undefined, minutos: number) {
  const forcar = useRef(false);
  const query = useQuery({
    queryKey: ["passagem", origem, setor],
    enabled: !!origem && !!setor,
    queryFn: async (): Promise<PassagemSetor> => {
      if (origem !== "viver") return passagemDemonstracao(setor!);
      const extra = forcar.current ? "&forcar=1" : "";
      forcar.current = false;
      return pegarJson<PassagemSetor>(`/api/viver/passagem?setor=${encodeURIComponent(setor!)}${extra}`);
    },
    // Atualiza sozinha — ninguém precisa clicar em nada.
    refetchInterval: minutos * 60_000,
    refetchIntervalInBackground: true,
  });
  const { refetch } = query;
  /** O botão "Atualizar agora" pula o cache do servidor e relê o Viver. */
  const atualizarAgora = useCallback(() => {
    forcar.current = true;
    return refetch();
  }, [refetch]);
  return { ...query, atualizarAgora };
}

/** Mesmo formato do Viver, montado a partir dos pacientes fictícios. */
function passagemDemonstracao(unitId: string): PassagemSetor {
  const br = (iso: string) => parseDate(iso).toLocaleDateString("pt-BR");
  const pacientes = demo.beds
    .filter((bed) => bed.unit_id === unitId && bed.patients[0])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((bed): PacientePassagem => {
      const p = bed.patients[0]!;
      const id = p.id;
      return {
        leito: String(bed.bed_number).padStart(2, "0"),
        nome: p.name,
        idade: String(p.age_years ?? ageFromBirthDate(p.birth_date) ?? ""),
        dataInternacao: br(p.admission_date),
        diagnostico: [p.syndromic_dx, p.specific_dx].filter(Boolean).join(" — "),
        comorbidades: "",
        alergias: p.has_allergy ? "Sim (ver prontuário)" : "",
        dispositivos: demo.invasions
          .filter((i) => i.patient_id === id && !i.removed_at)
          .map((i) => `${i.kind}${i.site ? ` ${i.site}` : ""} D${daysSince(i.start_date)}`),
        antibioticos: demo.medications
          .filter((m) => m.patient_id === id && !m.end_date && m.kind === "Antibiótico")
          .map((m) => `${m.drug} ${therapyDayLabel(m.kind, m.start_date, undefined, isOncePerDay(m.note))}`),
        culturas: demo.cultures
          .filter((c) => c.patient_id === id && !c.deleted_at && !c.resolved_at)
          .map((c) =>
            `${c.material}${c.site ? ` (${c.site})` : ""} ${br(c.collection_date)}: ${
              c.status === "positive" ? (c.organism ?? "positiva") : c.status === "pending" ? "em andamento" : "negativa"
            }`,
          ),
        pendencias: demo.conducts.filter((c) => c.patient_id === id && !c.done && !c.deleted_at).map((c) => c.text),
        observacoes: [p.palliative_care ? "Cuidados paliativos" : "", p.terminality ? "Terminalidade" : ""]
          .filter(Boolean)
          .join(" · "),
      };
    });
  return { setor: unitId, atualizadoEm: new Date().toISOString(), pacientes };
}
