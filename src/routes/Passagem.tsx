import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  diaDeInternacao,
  iniciais,
  usePassagem,
  useSetores,
  useStatusViver,
  type PacientePassagem,
} from "@/data/passagem";
import { cn } from "@/lib/utils";

function Itens({ itens, vazio = "—" }: { itens: string[]; vazio?: string }) {
  if (itens.length === 0) return <span className="text-muted-foreground print:text-neutral-400">{vazio}</span>;
  return (
    <ul className="space-y-0.5">
      {itens.map((item, i) => (
        <li key={i} className="leading-snug">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Linha({ p }: { p: PacientePassagem }) {
  const dih = diaDeInternacao(p.dataInternacao);
  return (
    <tr className="break-inside-avoid border-b border-border align-top print:border-neutral-400">
      <td className="px-2 py-2 text-center text-base font-semibold tabular-nums">{p.leito || "—"}</td>
      <td className="px-2 py-2">
        <div className="text-base font-semibold tracking-wide">{iniciais(p.nome)}</div>
        <div className="text-xs text-muted-foreground print:text-neutral-600">
          {p.idade && `${p.idade.replace(/\D+$/, "")} anos`}
          {dih !== null && ` · D${dih} int.`}
        </div>
        {p.dataInternacao && (
          <div className="text-[11px] text-muted-foreground print:text-neutral-600">DI {p.dataInternacao}</div>
        )}
      </td>
      <td className="px-2 py-2">
        <div className="font-medium leading-snug">{p.diagnostico || "—"}</div>
        {p.comorbidades && <div className="mt-1 text-xs">Comorb.: {p.comorbidades}</div>}
        {p.alergias && <div className="mt-1 text-xs font-semibold text-destructive print:text-black">Alergia: {p.alergias}</div>}
        {p.observacoes && <div className="mt-1 text-xs italic">{p.observacoes}</div>}
      </td>
      <td className="px-2 py-2 text-xs">
        <Itens itens={p.dispositivos} />
      </td>
      <td className="px-2 py-2 text-xs">
        <Itens itens={p.antibioticos} vazio="Sem ATB" />
        {p.culturas.length > 0 && (
          <div className="mt-1.5 border-t border-dashed border-border pt-1 print:border-neutral-400">
            <Itens itens={p.culturas} />
          </div>
        )}
      </td>
      <td className="px-2 py-2 text-xs">
        <Itens itens={p.pendencias} />
      </td>
      {/* Em branco de propósito: espaço para escrever à mão na folha impressa. */}
      <td className="px-2 py-2" />
    </tr>
  );
}

export function Passagem() {
  const [params, setParams] = useSearchParams();
  const status = useStatusViver();
  const origem = status.data ? (status.data.configurado ? "viver" : "demonstracao") : undefined;
  const setores = useSetores(origem);

  const setorId = params.get("setor") ?? undefined;
  const setorAtivo = setorId ?? setores.data?.[0]?.id;
  const setorNome = setores.data?.find((s) => s.id === setorAtivo)?.nome ?? setorAtivo ?? "";

  const passagem = usePassagem(origem, setorAtivo, status.data?.minutos ?? 5);

  useEffect(() => {
    document.title = setorNome ? `Passagem de plantão — ${setorNome}` : "Passagem de plantão";
  }, [setorNome]);

  const atualizado = useMemo(() => {
    if (!passagem.data) return null;
    return new Date(passagem.data.atualizadoEm).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [passagem.data]);

  const escolherSetor = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("setor", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* Controles — não saem na impressão */}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Passagem de plantão</h1>
          <p className="text-sm text-muted-foreground">
            {origem === "viver" && "Puxando direto do Viver, atualiza sozinha."}
            {origem === "demonstracao" && "Modo demonstração — pacientes fictícios."}
            {atualizado && ` Última leitura: ${atualizado}.`}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Setor
          <select
            className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={setorAtivo ?? ""}
            onChange={(e) => escolherSetor(e.target.value)}
            disabled={!setores.data}
          >
            {(setores.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>

        <Button variant="outline" onClick={() => passagem.atualizarAgora()} disabled={passagem.isFetching}>
          <RefreshCw className={cn(passagem.isFetching && "animate-spin")} />
          Atualizar agora
        </Button>
        <Button onClick={() => window.print()} disabled={!passagem.data}>
          <Printer />
          Imprimir
        </Button>
      </div>

      {origem === "demonstracao" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm print:hidden">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            O Viver ainda não está ligado. Para puxar os pacientes de verdade, preencha o arquivo{" "}
            <code>.env</code> e abra o site com <code>npm run local</code> (passo a passo no README).
          </span>
        </div>
      )}

      {(setores.error || passagem.error) && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive print:hidden">
          {(setores.error ?? passagem.error)?.message}
        </div>
      )}

      {/* A folha da passagem — é isto que sai na impressão */}
      <section className="folha-passagem rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-foreground pb-2 print:border-black">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide">Passagem de plantão — {setorNome}</h2>
            <p className="text-xs text-muted-foreground print:text-neutral-700">
              {atualizado ? `Dados de ${atualizado}` : "—"} · {passagem.data?.pacientes.length ?? 0} pacientes
            </p>
          </div>
          <div className="grid gap-1 text-xs sm:grid-cols-2 sm:gap-6">
            <span>Passa: ______________________</span>
            <span>Recebe: ______________________</span>
          </div>
        </header>

        {passagem.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:text-[10.5px]">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[10%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-border bg-secondary text-left text-[11px] uppercase tracking-wide text-muted-foreground print:border-black print:bg-neutral-200 print:text-black">
                  <th className="px-2 py-1.5 text-center">Leito</th>
                  <th className="px-2 py-1.5">Paciente</th>
                  <th className="px-2 py-1.5">Diagnóstico</th>
                  <th className="px-2 py-1.5">Dispositivos</th>
                  <th className="px-2 py-1.5">ATB / Culturas</th>
                  <th className="px-2 py-1.5">Pendências</th>
                  <th className="px-2 py-1.5">Intercorrências</th>
                </tr>
              </thead>
              <tbody>
                {passagem.data?.pacientes.map((p, i) => <Linha key={`${p.leito}-${i}`} p={p} />)}
                {passagem.data?.pacientes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhum paciente internado neste setor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
