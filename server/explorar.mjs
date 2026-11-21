/**
 * Modo explorar: abre o Viver na tela, entra com seu login e, a cada vez que
 * você apertar ENTER no terminal, salva a ESTRUTURA da página que está aberta
 * — com todos os textos embaralhados (letras viram "x", números viram "0").
 *
 * Assim dá para ver onde fica cada informação sem expor nenhum dado de
 * paciente. Os arquivos ficam em server/exploracao/.
 *
 *   npm run viver:explorar
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { fecharNavegador, paginaLogada, viverConfigurado } from "./viver.mjs";

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), "exploracao");

if (!viverConfigurado()) {
  console.error("Preencha VIVER_URL, VIVER_USUARIO e VIVER_SENHA no arquivo .env primeiro.");
  process.exit(1);
}

process.env.VIVER_MOSTRAR_NAVEGADOR = "1";
mkdirSync(PASTA, { recursive: true });

const page = await paginaLogada();
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(`
O Viver está aberto. Navegue até:
  1) a tela onde se escolhe o setor;
  2) a lista de pacientes de um setor;
  3) o prontuário de um paciente (a parte com dispositivos, antibióticos, pendências).
Em cada tela, volte aqui e aperte ENTER. Digite "sair" para terminar.
`);

let n = 0;
for (;;) {
  const resposta = (await terminal.question(`[tela ${n + 1}] ENTER para salvar, "sair" para terminar: `)).trim();
  if (resposta.toLowerCase() === "sair") break;

  const paginas = page.context().pages();
  const atual = paginas[paginas.length - 1];

  const html = await atual.evaluate(() => {
    const embaralhar = (s) => s.replace(/\p{Lu}/gu, "X").replace(/\p{Ll}/gu, "x").replace(/\d/g, "0");
    const copia = document.documentElement.cloneNode(true);
    copia.querySelectorAll("script, style, noscript, svg, img").forEach((el) => el.remove());
    const andar = document.createTreeWalker(copia, NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) no.nodeValue = embaralhar(no.nodeValue);
    copia.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        const estrutural = ["class", "id", "name", "type", "role", "for"].includes(attr.name);
        const dataCurto = attr.name.startsWith("data-") && attr.value.length < 40 && !/\d{3,}/.test(attr.value);
        if (estrutural || dataCurto) continue;
        el.setAttribute(attr.name, embaralhar(attr.value));
      }
    });
    return "<!-- textos embaralhados -->\n" + copia.outerHTML;
  });

  const caminhoUrl = new URL(atual.url());
  const urlSegura = `${caminhoUrl.origin}${caminhoUrl.pathname}${[...caminhoUrl.searchParams.keys()].map((k, i) => `${i ? "&" : "?"}${k}=…`).join("")}`;
  n++;
  writeFileSync(path.join(PASTA, `tela-${n}.html`), `<!-- endereço: ${urlSegura} -->\n${html}`);
  console.log(`  salvo: server/exploracao/tela-${n}.html  (${urlSegura})`);
}

terminal.close();
await fecharNavegador();
console.log(`\nPronto. Os arquivos estão em server/exploracao/. Abra um deles e confira que não há nomes antes de compartilhar.`);
