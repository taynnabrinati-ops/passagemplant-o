/*
 * Copia o "esqueleto" da página do Vivver que está aberta, com TODOS os textos
 * embaralhados (letras viram x/X, números viram 0), e baixa como arquivo.
 * Nenhum dado sai do computador: o arquivo só vai para a pasta Downloads.
 *
 * Como usar: com a tela do Vivver aberta, aperte F12 → aba "Console" → cole
 * este código inteiro → Enter. (Se o Chrome pedir, digite "allow pasting"
 * ou "permitir colar" e cole de novo.)
 */
(() => {
  const embaralhar = (s) =>
    s.replace(/\p{Lu}/gu, "X").replace(/\p{Ll}/gu, "x").replace(/\d/g, "0");

  // Endereços: mantém o caminho (ex.: /prontuario/evolucao), zera números e
  // apaga os valores depois do "?".
  const enderecoSeguro = (url) => {
    try {
      const u = new URL(url, location.href);
      const q = [...u.searchParams.keys()].map((k) => `${k}=…`).join("&");
      return `${u.origin}${u.pathname.replace(/\d/g, "0")}${q ? `?${q}` : ""}`;
    } catch {
      return embaralhar(url);
    }
  };

  const ESTRUTURA = new Set(["class", "id", "name", "type", "role", "for", "colspan", "rowspan"]);
  const ENDERECO = new Set(["href", "src", "action"]);

  function limpar(raiz) {
    raiz.querySelectorAll("script, style, noscript, svg, img, canvas, video").forEach((el) => el.remove());
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) no.nodeValue = embaralhar(no.nodeValue);
    raiz.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        if (ESTRUTURA.has(attr.name)) el.setAttribute(attr.name, attr.value.replace(/\d{3,}/g, "000"));
        else if (ENDERECO.has(attr.name)) el.setAttribute(attr.name, enderecoSeguro(attr.value));
        else if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
        else el.setAttribute(attr.name, embaralhar(attr.value));
      }
    });
    return raiz;
  }

  // Copia a página e também o conteúdo de quadros internos (iframes) do Vivver.
  function copiar(doc) {
    const copia = doc.documentElement.cloneNode(true);
    const originais = [...doc.querySelectorAll("iframe, frame")];
    [...copia.querySelectorAll("iframe, frame")].forEach((quadro, i) => {
      const bloco = document.createElement("section");
      bloco.setAttribute("data-quadro", enderecoSeguro(originais[i]?.src ?? ""));
      try {
        const interno = originais[i]?.contentDocument;
        if (interno) bloco.appendChild(copiar(interno));
      } catch {
        bloco.setAttribute("data-quadro-bloqueado", "sim");
      }
      quadro.replaceWith(bloco);
    });
    return copia;
  }

  const html = limpar(copiar(document)).outerHTML;
  const n = (Number(sessionStorage.getItem("explorar-n")) || 0) + 1;
  sessionStorage.setItem("explorar-n", String(n));

  const arquivo = new Blob([`<!-- endereço: ${enderecoSeguro(location.href)} -->\n${html}`], {
    type: "text/html",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = `vivver-tela-${n}.html`;
  link.click();
  console.log(`Salvo vivver-tela-${n}.html na pasta Downloads (textos embaralhados).`);
})();
