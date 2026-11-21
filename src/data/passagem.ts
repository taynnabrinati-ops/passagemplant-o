import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { daysSince, ageFromBirthDate, isOncePerDay, therapyDayLabel, parseDate } from "@/lib/days";
import { extrairDaEvolucao } from "@/lib/evolucao";
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
  curativos: string[];
  antibioticos: string[];
  culturas: string[];
  pendencias: string[];
  observacoes: string;
  /** Texto da evolução de enfermagem/técnicos, como veio do Viver. */
  evolucaoEnfermagem?: string;
  /** Preenchido pelo site a partir da evolução de enfermagem. */
  intercorrencias?: string[];
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

/** O servidor respondeu que a pessoa precisa (re)entrar no Vivver. */
export class PrecisaEntrar extends Error {}

async function pegarJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(url, { credentials: "same-origin", ...init });
  const corpo = await resposta.json().catch(() => ({}));
  if (resposta.status === 401) throw new PrecisaEntrar(corpo.erro ?? "Entre com seu usuário do Vivver.");
  if (!resposta.ok) throw new Error(corpo.erro ?? `Erro ${resposta.status}`);
  return corpo as T;
}

export interface StatusViver {
  configurado: boolean;
  logado: boolean;
  usuario: string | null;
  minutos: number;
  setorPadrao?: string;
}

/** O servidor está no ar, com o Vivver configurado, e a pessoa já entrou? */
export function useStatusViver() {
  return useQuery({
    queryKey: ["viver-status"],
    queryFn: async (): Promise<StatusViver> => {
      try {
        return await pegarJson<StatusViver>("/api/viver/status");
      } catch {
        return { configurado: false, logado: false, usuario: null, minutos: 5 };
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
      const extra = forcar.current ? "&forcar=1" : "";
      forcar.current = false;
      const bruta =
        origem === "viver"
          ? await pegarJson<PassagemSetor>(`/api/viver/passagem?setor=${encodeURIComponent(setor!)}${extra}`)
          : passagemDemonstracao(setor!);
      return { ...bruta, pacientes: bruta.pacientes.map(completarComEvolucao) };
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

/**
 * Junta o que a evolução de enfermagem traz: intercorrências viram uma lista
 * própria; curativos descritos nela entram na coluna de dispositivos quando o
 * Viver não tiver um campo próprio para eles.
 */
function completarComEvolucao(p: PacientePassagem): PacientePassagem {
  const { intercorrencias, curativos } = extrairDaEvolucao(p.evolucaoEnfermagem ?? "");
  return {
    ...p,
    intercorrencias,
    curativos: p.curativos.length > 0 ? p.curativos : curativos,
  };
}

/** Evoluções de enfermagem fictícias para o modo demonstração. */
const EVOLUCAO_DEMO: Record<string, string> = {
  "p-01":
    "Paciente sedado, RASS -3, em VM. Apresentou pico febril de 38,7 °C às 02h, comunicado plantonista e coletadas hemoculturas. Dieta enteral em BIC a 50 mL/h. Diurese por SVD, 1.200 mL em 12h.",
  "p-02":
    "Em VM, prona realizada às 22h sem intercorrências. Episódio de dessaturação até 84% durante aspiração, revertido com aumento da FiO2. Curativo do CVC subclávia D realizado com gaze, sem sinais flogísticos.",
  "p-05":
    "Paciente em cuidados de conforto, família presente. Recusou dieta via oral. Mudança de decúbito 2/2h mantida.",
  "p-06":
    "Agitação psicomotora às 04h, necessário contenção mecânica no MSD conforme prescrição. PIC entre 12 e 18 mmHg.",
  "p-09":
    "Glicemia capilar de 52 mg/dL às 05h, corrigida com glicose 50% conforme protocolo. Acesso periférico MSE perdido, puncionado novo acesso em MSD. Evacuou, fezes pastosas.",
};

/** Curativos fictícios para o modo demonstração. */
const CURATIVOS_DEMO: Record<string, string[]> = {
  "p-01": ["LPP sacral estágio 3 — hidrocoloide, troca a cada 72 h (D2)"],
  "p-03": ["FO esternotomia — limpa e seca, gaze estéril 1x/dia"],
  "p-05": ["LPP calcâneo D — AGE + gaze, troca diária"],
  "p-06": ["FO craniectomia — curativo oclusivo, avaliar exsudato"],
  "p-07": ["Traqueostomia — gaze + troca do cadarço 12/12 h"],
};

export function useEntrar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (dados: { usuario: string; senha: string }) =>
      pegarJson("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useSair() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => pegarJson("/api/sair", { method: "POST" }),
    onSettled: () => client.resetQueries(),
  });
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
        curativos: CURATIVOS_DEMO[id] ?? [],
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
        evolucaoEnfermagem: EVOLUCAO_DEMO[id] ?? "",
      };
    });
  return { setor: unitId, atualizadoEm: new Date().toISOString(), pacientes };
}
