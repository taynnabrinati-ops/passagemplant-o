/*
 * Mapa do Vivver: anota só NOMES — endereços internos, nomes de campos, nomes
 * das colunas das tabelas e das abas. Nenhum valor (nome de paciente, número,
 * texto de evolução) entra no arquivo: valores viram só o tipo e o tamanho,
 * por exemplo "texto(23)" ou "número".
 *
 * Como usar: com a janela do Vivver aberta, abra o Console e cole este código
 * inteiro → Enter. Baixa "vivver-mapa-N.json" na pasta Transferências.
 */
(() => {
  const tipo = (v) => {
    if (v === null || v === undefined || v === "") return "vazio";
    if (typeof v === "number") return "número";
    if (typeof v === "boolean") return "sim/não";
    if (Array.isArray(v)) return `lista(${v.length})`;
    if (typeof v === "object") return `objeto{${Object.keys(v).join(",")}}`;
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) return "data";
    if (/^\d+$/.test(s)) return `número-texto(${s.length})`;
    if (/<[a-z]/i.test(s)) return `html(${s.length})`;
    return `texto(${s.length})`;
  };
  const so = (url) => {
    try {
      const u = new URL(url, location.href);
      return { caminho: u.pathname.replace(/\/\d+(?=\/|$)/g, "/:id"), parametros: [...u.searchParams.keys()] };
    } catch {
      return { caminho: "?", parametros: [] };
    }
  };

  function mapear(win, doc, onde) {
    const $ = win.jQuery;
    const quadro = { onde, ...so(win.location.href), formularios: [], tabelas: [], abas: [], atalhos: [], recolhidos: [] };

    doc.querySelectorAll("form").forEach((f) => {
      quadro.formularios.push({
        id: f.id || null,
        acao: so(f.getAttribute("action") || "").caminho,
        campos: [...new Set([...f.elements].map((e) => e.name).filter(Boolean))],
      });
    });

    doc.querySelectorAll("table").forEach((t) => {
      const info = {
        id: t.id || null,
        classes: t.className || null,
        colunas: [...t.querySelectorAll("thead th")].map((th) => th.textContent.trim()).filter(Boolean).slice(0, 40),
        linhas: t.querySelectorAll("tbody tr").length,
      };
      try {
        if ($ && $(t).data("bootstrap.table")) {
          const o = $(t).bootstrapTable("getOptions");
          info.bootstrap = {
            url: o.url ? so(o.url).caminho : null,
            metodo: o.method,
            paginacaoServidor: o.sidePagination,
            campos: (o.columns?.[0] ?? o.columns ?? []).map((c) => ({ campo: c.field, titulo: c.title })),
          };
          const dados = $(t).bootstrapTable("getData") || [];
          if (dados[0]) info.bootstrap.exemploDeLinha = Object.fromEntries(Object.entries(dados[0]).map(([k, v]) => [k, tipo(v)]));
        }
      } catch (e) {
        info.erro = String(e).slice(0, 80);
      }
      quadro.tabelas.push(info);
    });

    doc.querySelectorAll(".tab-pane[id]").forEach((p) => quadro.abas.push({ id: p.id, ativa: p.classList.contains("active") }));
    doc.querySelectorAll("figure[id^=shortcut_]").forEach((f) => quadro.atalhos.push(f.id));
    // Blocos "fechadinhos" (acordeão / collapse) — onde costumam ficar as evoluções.
    doc.querySelectorAll(".panel-collapse, .collapse, [data-toggle=collapse], details").forEach((el) => {
      quadro.recolhidos.push({ tag: el.tagName.toLowerCase(), id: el.id || null, classes: el.className || null, alvo: el.getAttribute("href") || el.getAttribute("data-target") || null });
    });
    quadro.recolhidos = quadro.recolhidos.slice(0, 60);

    // Endereços que ESTA janela chamou (sem as respostas).
    try {
      quadro.chamadas = [...new Set(win.performance.getEntriesByType("resource")
        .filter((r) => r.initiatorType === "xmlhttprequest" || r.initiatorType === "fetch")
        .map((r) => { const s = so(r.name); return `${s.caminho}${s.parametros.length ? "?" + s.parametros.join("&") : ""}`; }))];
    } catch { quadro.chamadas = []; }

    // Esqueleto das regiões que interessam (só tags e classes; textos viram tamanho).
    const ALVOS = /hist[óo]rico de evolu|dispositivo|prescri[çc][ãa]o do dia|cuidados gerais|medica[çc][õo]es|evolu[çc][ãa]o/i;
    const esqueleto = (el, nivel) => {
      if (nivel > 7) return "…";
      const filhos = [...el.children].slice(0, 12).map((c) => esqueleto(c, nivel + 1));
      const proprio = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(" ");
      const nome = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].join(".") : ""}`;
      const out = { el: nome };
      if (proprio) out.texto = ALVOS.test(proprio) && proprio.length < 40 ? proprio : `texto(${proprio.length})`;
      if (el.children.length) out.filhos = filhos.concat(el.children.length > 12 ? [`+${el.children.length - 12}`] : []);
      return out;
    };
    quadro.regioes = [];
    doc.querySelectorAll("h1,h2,h3,h4,h5,legend,.panel-title,.box-title,a,span,strong,label").forEach((h) => {
      const t = h.textContent.trim();
      if (t.length > 40 || !ALVOS.test(t) || quadro.regioes.length >= 8) return;
      const caixa = h.closest(".panel, .box, .card, fieldset, section, .tab-pane") || h.parentElement?.parentElement;
      if (caixa && !quadro.regioes.some((r) => r.titulo === t)) quadro.regioes.push({ titulo: t, esqueleto: esqueleto(caixa, 0) });
    });

    const resultado = [quadro];
    doc.querySelectorAll("iframe, frame").forEach((fr, i) => {
      try {
        if (fr.contentDocument) resultado.push(...mapear(fr.contentWindow, fr.contentDocument, `${onde} > quadro ${i}`));
      } catch {
        resultado.push({ onde: `${onde} > quadro ${i}`, bloqueado: true, ...so(fr.src) });
      }
    });
    return resultado;
  }

  // Também anota os endereços que a página já chamou (sem as respostas).
  const chamadas = [...new Set(performance.getEntriesByType("resource")
    .filter((r) => r.initiatorType === "xmlhttprequest" || r.initiatorType === "fetch")
    .map((r) => { const s = so(r.name); return `${s.caminho}${s.parametros.length ? "?" + s.parametros.join("&") : ""}`; }))];

  const mapa = { quando: new Date().toISOString(), quadros: mapear(window, document, "página"), chamadas };
  const n = (Number(sessionStorage.getItem("mapa-n")) || 0) + 1;
  sessionStorage.setItem("mapa-n", String(n));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(mapa, null, 1)], { type: "application/json" }));
  link.download = `vivver-mapa-${n}.json`;
  link.click();
  console.log(`Salvo vivver-mapa-${n}.json (só nomes de campos, nenhum dado).`);
})();
