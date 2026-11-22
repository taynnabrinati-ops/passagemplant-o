/*
 * Passagem de plantão — versão que roda DENTRO do Vivver (Console do navegador).
 *
 * Pré-requisito: Painel de Internação aberto, com o bloco escolhido e
 * "Pesquisar" já clicado. O código lê os pacientes da tabela de leitos e, para
 * cada um, busca no próprio Vivver (com o login de quem está usando):
 *   - prontuário da internação  → diagnóstico, data de internação, prescrição do dia
 *   - evoluções                 → resumo médico, pendências, intercorrências e
 *                                 curativos da enfermagem/técnicos
 *   - dispositivos invasivos
 * e mostra a folha da passagem por cima da tela, pronta para imprimir.
 * Só LÊ: não clica em salvar, não altera nada. Nenhum dado sai do computador.
 *
 * O mesmo código é usado pelo servidor do site (server/viver.mjs) dentro do
 * navegador do robô.
 */
(async () => {
  // ---------- utilidades ----------
  const PART = new Set(["de", "da", "do", "das", "dos", "e", "d", "di", "du"]);
  const iniciais = (nome) =>
    String(nome || "").trim().split(/\s+/).filter((p) => p && !PART.has(p.toLowerCase())).map((p) => p[0].toUpperCase() + ".").join("");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const hoje = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const dataBR = (s) => { const m = String(s || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const diasDesde = (d) => (d ? Math.floor((hoje() - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5) + 1 : null);

  /** Texto de um elemento mantendo as quebras de linha (<br>, parágrafos, itens). */
  function texto(el) {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll("script,style,button,.no-print,select").forEach((x) => x.remove());
    c.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
    c.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,h5,h6,section").forEach((b) => b.append("\n"));
    return c.textContent.replace(/[ \t ]+/g, " ").replace(/ *\n[ \n]*/g, "\n").trim();
  }

  /** Respostas do Vivver às vezes vêm como HTML, às vezes como JavaScript que injeta HTML. */
  function paraDocumento(resposta) {
    let html = resposta;
    if (!/^\s*</.test(resposta) && /\.(html|append|replaceWith)\(\s*["']/.test(resposta)) {
      const pedacos = [...resposta.matchAll(/\.(?:html|append|replaceWith)\(\s*(["'])((?:\\.|(?!\1).)*)\1\s*\)/gs)];
      html = pedacos.map((p) => p[2].replace(/\\n/g, "\n").replace(/\\(["'\/\\])/g, "$1")).join("\n");
    }
    return new DOMParser().parseFromString(html, "text/html");
  }

  async function buscar(caminho) {
    const r = await fetch(caminho, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!r.ok) throw new Error(`${r.status} em ${caminho.split("?")[0]}`);
    return paraDocumento(await r.text());
  }

  /** Procura janelas internas (iframes) do Vivver pelo caminho. */
  function janelas(win = window, achadas = []) {
    try {
      achadas.push(win);
      for (const f of win.document.querySelectorAll("iframe,frame")) if (f.contentWindow) janelas(f.contentWindow, achadas);
    } catch {}
    return achadas;
  }
  const janela = (caminho) => janelas().find((w) => { try { return w.location.pathname === caminho; } catch { return false; } });

  // ---------- 1. pacientes do bloco (tabela do Painel de Internação) ----------
  const painel = janela("/inh/painel_internacao");
  if (!painel?.jQuery) return alert("Abra o Painel de Internação, escolha o bloco e clique em Pesquisar. Depois rode de novo.");
  const linhas = (painel.jQuery("#hos-inh-leito-table").bootstrapTable("getData") || []).filter((l) => l.recepcao_id && l.usuario);
  if (!linhas.length) return alert("Nenhum paciente na tabela do painel. Clique em Pesquisar e rode de novo.");
  const bloco = painel.document.querySelector('[name="lookup_name[painel_internacao[hos_inh_bloco_id]]"] option:checked')?.textContent?.trim() || linhas[0].bloco || "";

  // Parâmetros que o Vivver usa ao abrir o prontuário (copiados de um prontuário aberto, se houver).
  const pront = janela("/inh/prontuario_eletronico");
  const extras = new URLSearchParams();
  if (pront) for (const k of ["workMode", "oldWorkMode"]) { const v = new URL(pront.location.href).searchParams.get(k); if (v) extras.set(k, v); }

  // ---------- 2. leitura de cada paciente ----------
  const ATB = /amoxicilina|clavulanato|ampicilina|sulbactam|oxacilina|penicilina|cefazolina|cefalotina|cefuroxima|ceftriaxona|cefotaxima|ceftazidima|cefepim|ceftarolina|avibactam|piperacilina|tazobactam|meropenem|imipenem|ertapenem|aztreonam|vancomicina|teicoplanina|linezolida|daptomicina|gentamicina|amicacina|tobramicina|ciprofloxacin|levofloxacin|moxifloxacin|azitromicina|claritromicina|clindamicina|metronidazol|sulfametoxazol|trimetoprim|polimixina|colistina|tigeciclina|doxiciclina|minociclina|rifampicina|fosfomicina|nitrofurantoina|fluconazol|voriconazol|anidulafungina|micafungina|caspofungina|anfotericina/i;
  const VIAS = /\b(ENDOVENOSA|INTRAVENOSA|ORAL|SUBCUT[ÂA]NEA|INTRAMUSCULAR|INALAT[ÓO]RIA|SONDA\w*|T[ÓO]PICA|RETAL|NASAL|OFT[ÁA]LMICA|SUBLINGUAL)\b/;
  const ETIQ = /\b(NOVO|MANTIDO|ALTERADO|SUSPENSO|IMEDIATO|SE NECESS[ÁA]RIO|ALTA VIGIL[ÂA]NCIA|ACM)\b/g;

  const INTERCORRENCIA = /intercorr[eê]ncia(?!s? n[aã]o)|febr|febril|hipertermia|pico t[eé]rmico|dessatur|queda|caiu|sangra|hemorrag|hemat[eê]mese|melena|agita|desorient|confus|rebaixa|v[oô]mit|[eê]mese|n[aá]usea|hipotens|hipertens|hipoglic|hiperglic|convuls|bradicard|taquicard|arritmi|\bpcr\b|parada|broncoaspir|engasg|diarr|evacua[çc][aã]o l[ií]quida|olig[uú]ri|an[uú]ri|recus|perd(a|eu|ido)|tracion|exterioriz|extuba|conten[çc][aã]o|queixa|dor (intensa|forte)|comunicad[oa] (ao |a )?(plantonista|m[eé]dic|enfermeir)|evadiu|evas[aã]o/i;
  const SEM_ALT = /sem intercorr[eê]ncias?|sem queixas|nega(ndo)? intercorr|n[aã]o houve intercorr/i;
  const CURATIVO = /curativo|cobertura|\blpp\b|les[aã]o por press|[uú]lcera|ferida|\bf\.?o\.?\b|incis[aã]o|deisc|hidrocol|\bage\b|alginato|carv[aã]o ativado|papa[ií]na|sulfadiazina|placa de prata|membrana|ostomia|estoma/i;
  const PENDENCIA = /pend[eê]n|aguard|solicit|programa|agendad|realizar|reavaliar|avaliar|checar|cobrar|resultado|parecer|interconsulta|\bcd[:\s]|conduta|plano|\bpo\b|alta prov/i;

  const frases = (t) => t.replace(/\n+/g, ". ").split(/[.;](?=\s|$)/).map((f) => f.trim().replace(/^[-•#>*\s]+/, "")).filter((f) => f.length > 3);
  const categoria = (cbo) => (/^3222/.test(cbo) ? "tecnico" : /^2235/.test(cbo) ? "enfermeiro" : /^225|^2231/.test(cbo) ? "medico" : "outro");

  async function lerEvolucoes(id) {
    const doc = await buscar(`/inh/prontuario_eletronico/historico_evolucoes_box?div_id=historico_inh_atendimento_exames_fisicos_box&prontuario_eletronico[hos_inh_recepcao_internacao_id]=${id}&_=${Date.now()}`);
    let itens = [...doc.querySelectorAll("li.timeline-item-container")];
    if (!itens.length) itens = [...doc.querySelectorAll(".timeline-item")];
    return itens.map((li) => {
      const t = texto(li).replace(/\bImprimir\b/g, "");
      const cab = t.match(/(\d{6})\s*-\s*([^\n]+?)\s*\n?\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
      const pega = (de, ate) => (t.match(new RegExp(`${de}:?\\s*([\\s\\S]*?)(?=${ate}|$)`, "i"))?.[1] || "").trim();
      const quando = cab ? dataBR(cab[3]) : null;
      if (quando && cab) quando.setHours(+cab[4].slice(0, 2), +cab[4].slice(3));
      return {
        cbo: cab?.[1] || "",
        cargo: (cab?.[2] || "").trim(),
        quando,
        tipo: categoria(cab?.[1] || ""),
        exame: pega("Exame F[íi]sico", "Observa[çc][ãa]o:|Procedimentos:"),
        obs: pega("Observa[çc][ãa]o", "Procedimentos:"),
      };
    }).sort((a, b) => (b.quando || 0) - (a.quando || 0));
  }

  async function lerDispositivos(id) {
    const doc = await buscar(`/inh/dispositivo_invasivo?hos_inh_recepcao_internacao_id=${id}&_=${Date.now()}`);
    if (/nenhum dispositivo/i.test(doc.body.textContent)) return [];
    const cands = [...doc.querySelectorAll("tr, li, .list-group-item, .card, .panel, [class*=dispositivo]")].filter((el) => /\bD\s?\d{1,3}\b/.test(el.textContent));
    const folhas = cands.filter((el) => !cands.some((o) => o !== el && el.contains(o)));
    return [...new Set(folhas.map((el) => texto(el).replace(/\n+/g, " · ").replace(/\s*(Retirar|Remover|Editar|Excluir)\s*/gi, " ").trim().slice(0, 120)))];
  }

  async function lerProntuario(id) {
    const q = new URLSearchParams(extras);
    q.set("prontuario_eletronico[hos_inh_recepcao_internacao_id]", id);
    const doc = await buscar(`/inh/prontuario_eletronico?${q}`);
    const val = (nome) => doc.querySelector(`[name="${nome}"]`)?.value?.trim() || doc.querySelector(`[name="${nome}"]`)?.textContent?.trim() || "";
    const opc = (nome) => doc.querySelector(`[name="lookup_name[${nome}]"] option:checked, [name="lookup_name[${nome}]"] option[selected]`)?.textContent?.trim() || "";

    // Prescrição do dia: cada item tem "Início: dd/mm/aaaa".
    const area = doc.querySelector("#tab_prescricao_dia") || doc.body;
    const cands = [...area.querySelectorAll("tr, li, div")].filter((el) => (el.textContent.match(/In[íi]cio:/g) || []).length === 1);
    // O item é o MAIOR elemento que ainda tem um único "Início:".
    const itens = cands.filter((el) => !cands.includes(el.parentElement));
    const prescricao = itens.map((el) => {
      const t = texto(el).replace(/\s+/g, " ").trim();
      const nome = (t.replace(/^\s*\d+\s+\d+\s*-\s*/, "").split(VIAS)[0] || "").replace(ETIQ, "").replace(/\s+/g, " ").trim();
      return { nome, suspenso: /\bSUSPENSO\b/.test(t), inicio: dataBR(t.match(/In[íi]cio:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]), uma: /\b24 ?EM ?24\b|1 ?x ?\/? ?dia|uma vez ao dia/i.test(t) };
    });

    return {
      dataInternacao: val("prontuario_eletronico[data]"),
      diagnostico: val("prontuario_eletronico[desdiagnosticoinicial]"),
      cid: opc("prontuario_eletronico[codcidprincipal]"),
      prescricao,
    };
  }

  function montar(linha, pr, evol, disp) {
    const medica = evol.find((e) => e.tipo === "medico");
    const desde = Date.now() - 24 * 36e5;
    const enfermagem = evol.filter((e) => (e.tipo === "tecnico" || e.tipo === "enfermeiro") && (!e.quando || e.quando >= desde));

    const problemas = (medica?.obs || "").split("\n").map((l) => l.trim()).filter((l) => /^#/.test(l) && !/admiss|evolu|hda|exame|conduta|plano|hist[óo]ria/i.test(l)).map((l) => l.replace(/#/g, "").trim()).slice(0, 4);
    const pendencias = (medica?.obs || "").split("\n").map((l) => l.trim().replace(/^[-•>*\s]+/, "")).filter((l) => l.length > 4 && l.length < 220 && PENDENCIA.test(l) && !/^#/.test(l)).slice(0, 5);

    const intercorrencias = [], curativos = [];
    for (const e of enfermagem) for (const f of frases(`${e.exame}\n${e.obs}`)) {
      if (CURATIVO.test(f)) curativos.push(f);
      else if (!SEM_ALT.test(f) && INTERCORRENCIA.test(f)) intercorrencias.push(`${f}${e.quando ? ` (${e.quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})` : ""}`);
    }

    const atb = pr.prescricao.filter((p) => !p.suspenso && ATB.test(p.nome)).map((p) => {
      let d = diasDesde(p.inicio);
      if (d !== null && !p.uma) d = Math.max(0, d - 1); // regra do D de antibiótico (ver README)
      return `${p.nome.split(/\s+\d/)[0].trim()}${d !== null ? ` D${d}` : ""}`;
    });

    const di = dataBR(pr.dataInternacao);
    return {
      leito: String(linha.leito || "").replace(/^LEITO\s*/i, "").replace(/\s*-\s*\w+$/, ""),
      iniciais: iniciais(linha.usuario),
      idade: linha.idade,
      dih: diasDesde(di),
      di: pr.dataInternacao || "",
      isolamento: /s/i.test(linha.indisolamento || ""),
      diagnostico: [pr.cid, pr.diagnostico].filter(Boolean).join(" — "),
      problemas,
      dispositivos: disp,
      curativos: [...new Set(curativos)].slice(0, 4),
      atb: [...new Set(atb)],
      pendencias,
      intercorrencias: [...new Set(intercorrencias)].slice(0, 6),
    };
  }

  // ---------- 3. tela de progresso + leitura ----------
  document.getElementById("passagem-vivver")?.remove();
  const tela = document.createElement("div");
  tela.id = "passagem-vivver";
  tela.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff;color:#000;overflow:auto;font:14px/1.35 -apple-system,Segoe UI,Roboto,sans-serif;padding:16px";
  tela.innerHTML = `<p>Lendo ${linhas.length} pacientes do Vivver… <span id="pv-prog">0</span>/${linhas.length}</p>`;
  document.body.appendChild(tela);

  const pacientes = [], problemas = [];
  for (const [i, l] of linhas.entries()) {
    const id = l.recepcao_id;
    const [pr, evol, disp] = await Promise.all([
      lerProntuario(id).catch((e) => (problemas.push(`leito ${i + 1}: prontuário (${e.message})`), { prescricao: [] })),
      lerEvolucoes(id).catch((e) => (problemas.push(`leito ${i + 1}: evoluções (${e.message})`), [])),
      lerDispositivos(id).catch((e) => (problemas.push(`leito ${i + 1}: dispositivos (${e.message})`), [])),
    ]);
    pacientes.push(montar(l, pr, evol, disp));
    tela.querySelector("#pv-prog").textContent = String(i + 1);
    // Diagnóstico sem dados de paciente: só contagens.
    console.log(`leito ${i + 1}: evoluções=${evol.length} (méd ${evol.filter((e) => e.tipo === "medico").length}, enf/téc ${evol.filter((e) => e.tipo !== "medico" && e.tipo !== "outro").length}), prescrição=${pr.prescricao.length} itens, dispositivos=${disp.length}, diagnóstico=${pr.diagnostico || pr.cid ? "sim" : "não"}`);
  }

  // ---------- 4. folha da passagem ----------
  const lista = (xs, vazio = "—", negrito = false) => (xs.length ? `<ul>${xs.map((x) => `<li${negrito ? ' class="b"' : ""}>${esc(x)}</li>`).join("")}</ul>` : `<span class="v">${vazio}</span>`);
  const agora = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  tela.innerHTML = `
<style>
  #passagem-vivver h2{margin:0;font-size:20px;text-transform:uppercase}
  #passagem-vivver .topo{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;gap:12px;flex-wrap:wrap}
  #passagem-vivver table{width:100%;border-collapse:collapse;font-size:14px}
  #passagem-vivver th{background:#e5e5e5;text-align:left;font-size:11px;text-transform:uppercase;padding:5px 6px;border-bottom:2px solid #000}
  #passagem-vivver td{vertical-align:top;padding:7px 6px;border-bottom:1px solid #999}
  #passagem-vivver tr{break-inside:avoid}
  #passagem-vivver ul{margin:0;padding:0;list-style:none} #passagem-vivver li{margin-bottom:2px}
  #passagem-vivver .b{font-weight:700} #passagem-vivver .v{color:#888}
  #passagem-vivver .sub{font-size:.85em;color:#444} #passagem-vivver .rot{font-size:.75em;font-weight:700;text-transform:uppercase;margin-top:4px;border-top:1px dashed #999;padding-top:3px}
  #passagem-vivver .ini{font-size:1.2em;font-weight:700} #passagem-vivver .lei{font-size:1.2em;font-weight:700;text-align:center}
  #passagem-vivver .bt{position:sticky;top:0;display:flex;gap:8px;justify-content:flex-end;margin-bottom:8px}
  #passagem-vivver .bt button{font-size:15px;padding:6px 14px;cursor:pointer}
  @media print{
    @page{size:A4 landscape;margin:8mm}
    body>*:not(#passagem-vivver){display:none!important}
    #passagem-vivver{position:static!important;padding:0!important;overflow:visible!important}
    #passagem-vivver .bt{display:none} #passagem-vivver table{font-size:12.5px} thead{display:table-header-group}
  }
</style>
<div class="bt"><button onclick="window.print()">Imprimir</button><button onclick="this.closest('#passagem-vivver').remove()">Fechar</button></div>
<div class="topo"><div><h2>Passagem de plantão — ${esc(bloco)}</h2><div class="sub">Dados do Vivver em ${agora} · ${pacientes.length} pacientes</div></div>
<div>Passa: ______________________ &nbsp; Recebe: ______________________</div></div>
<table><colgroup><col style="width:5%"><col style="width:10%"><col style="width:19%"><col style="width:20%"><col style="width:19%"><col style="width:27%"></colgroup>
<thead><tr><th>Leito</th><th>Paciente</th><th>Diagnóstico</th><th>Dispositivos / Curativos</th><th>ATB / Culturas</th><th>Pendências / Intercorrências</th></tr></thead>
<tbody>${pacientes.map((p) => `<tr>
  <td class="lei">${esc(p.leito)}</td>
  <td><div class="ini">${esc(p.iniciais)}</div><div class="sub">${p.idade != null ? esc(p.idade) + " anos" : ""}${p.dih ? ` · D${p.dih} int.` : ""}</div>${p.di ? `<div class="sub">DI ${esc(p.di)}</div>` : ""}${p.isolamento ? '<div class="b">ISOLAMENTO</div>' : ""}</td>
  <td><div class="b">${esc(p.diagnostico) || '<span class="v">—</span>'}</div>${p.problemas.length ? lista(p.problemas) : ""}</td>
  <td>${lista(p.dispositivos)}${p.curativos.length ? `<div class="rot">Curativos</div>${lista(p.curativos, "", true)}` : ""}</td>
  <td>${lista(p.atb, "Sem ATB")}</td>
  <td>${lista(p.pendencias)}${p.intercorrencias.length ? `<div class="rot">Intercorrências (enfermagem)</div>${lista(p.intercorrencias)}` : ""}</td>
</tr>`).join("")}</tbody></table>
${problemas.length ? `<p class="sub">Não consegui ler: ${esc(problemas.join("; "))}</p>` : ""}`;
  console.log(problemas.length ? `Avisos: ${problemas.join(" | ")}` : "Passagem montada sem erros.");
})();
