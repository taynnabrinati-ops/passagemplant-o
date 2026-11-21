/**
 * O robô que entra no Vivver e lê os pacientes de um setor.
 *
 * Cada pessoa entra com o PRÓPRIO usuário e senha do Vivver: o robô abre um
 * navegador separado para ela (um "contexto"), e é com esse login que lê os
 * prontuários. A senha é usada só no momento do login e não é guardada; os
 * dados dos pacientes ficam só na memória, enquanto a página está aberta.
 */
import { randomBytes } from "node:crypto";
import config from "./viver.config.mjs";

export function viverConfigurado() {
  return Boolean(process.env.VIVER_URL);
}

function urlCompleta(caminho) {
  const base = process.env.VIVER_URL;
  if (!caminho) return base;
  return new URL(caminho, base.endsWith("/") ? base : `${base}/`).toString();
}

export class SessaoExpirada extends Error {
  constructor() {
    super("Sua sessão no Vivver expirou. Entre de novo.");
  }
}

/** Sessão some depois de tanto tempo sem uso. */
const INATIVIDADE_MS = Number(process.env.SESSAO_INATIVIDADE_MIN ?? 120) * 60_000;
const sessoes = new Map();
let navegador = null;

async function abrirNavegador() {
  if (navegador?.isConnected()) return navegador;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error('O Playwright não está instalado. Rode "npm install" e "npm run viver:instalar-navegador".');
  }
  navegador = await chromium.launch({
    headless: process.env.VIVER_MOSTRAR_NAVEGADOR !== "1",
    // Opcional: usar um Chrome/Chromium já instalado em vez do baixado pelo Playwright.
    executablePath: process.env.VIVER_CHROMIUM || undefined,
  });
  return navegador;
}

export async function fecharNavegador() {
  for (const token of sessoes.keys()) await sair(token);
  await navegador?.close().catch(() => {});
  navegador = null;
}

/** Faz login no Vivver com o usuário e a senha da pessoa. Devolve o token da sessão. */
export async function entrar(usuario, senha) {
  const nav = await abrirNavegador();
  const contexto = await nav.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await contexto.newPage();
  try {
    await page.goto(urlCompleta(config.login.url), { waitUntil: "domcontentloaded" });
    await page.locator(config.login.usuario).first().fill(usuario);
    await page.locator(config.login.senha).first().fill(senha);
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      page.locator(config.login.entrar).first().click(),
    ]);
    const aindaNoLogin = await page
      .locator(config.login.senha)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (aindaNoLogin) throw new Error("Usuário ou senha do Vivver não conferem.");
  } catch (erro) {
    await contexto.close().catch(() => {});
    throw erro;
  } finally {
    await page.close().catch(() => {});
  }
  const token = randomBytes(32).toString("base64url");
  sessoes.set(token, { contexto, usuario, ultimoUso: Date.now() });
  return token;
}

export async function sair(token) {
  const sessao = sessoes.get(token);
  sessoes.delete(token);
  await sessao?.contexto.close().catch(() => {});
}

/** A sessão desse token, ou null. Renova o prazo de inatividade. */
export function sessao(token) {
  const s = token ? sessoes.get(token) : undefined;
  if (!s) return null;
  s.ultimoUso = Date.now();
  return s;
}

setInterval(() => {
  for (const [token, s] of sessoes) if (Date.now() - s.ultimoUso > INATIVIDADE_MS) void sair(token);
}, 60_000).unref();

/** Abre uma página já logada; se o Vivver tiver derrubado a sessão, avisa. */
async function paginaLogada(s, url) {
  const page = await s.contexto.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const voltouProLogin = await page.locator(config.login.senha).first().isVisible({ timeout: 1500 }).catch(() => false);
  if (voltouProLogin) {
    await page.close();
    throw new SessaoExpirada();
  }
  return page;
}

/** Para o modo explorar: uma página logada qualquer. */
export async function paginaInicial(s) {
  return paginaLogada(s, urlCompleta(config.login.url));
}

async function textoDe(raiz, onde) {
  if (onde === "" || onde === undefined || onde === null) return "";
  try {
    if (typeof onde === "number") {
      const celula = raiz.locator("td, th").nth(onde);
      return ((await celula.innerText({ timeout: 2000 })) ?? "").trim();
    }
    const alvo = raiz.locator(onde);
    const textos = await alvo.allInnerTexts();
    return textos.map((t) => t.trim()).filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

function lista(texto) {
  return texto
    .split(/\n|;|•/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function listarSetores(s) {
  const page = await paginaLogada(s, urlCompleta(config.setores.url));
  try {
    const itens = page.locator(config.setores.item);
    const total = await itens.count();
    const setores = [];
    for (let i = 0; i < total; i++) {
      const item = itens.nth(i);
      const nome = ((await item.innerText()) ?? "").trim();
      if (!nome) continue;
      const id = config.setores.atributoId
        ? ((await item.getAttribute(config.setores.atributoId)) ?? nome)
        : nome;
      if (!id) continue;
      setores.push({ id, nome });
    }
    return setores;
  } finally {
    await page.close();
  }
}

export async function lerPacientesDoSetor(s, setorId) {
  const url = urlCompleta(config.pacientes.url.replace("{setor}", encodeURIComponent(setorId)));
  const page = await paginaLogada(s, url);
  const { campos, detalhe, abrirProntuario } = config.pacientes;
  try {

    if (config.pacientes.escolherSetor) {
      const caixa = page.locator(config.pacientes.escolherSetor).first();
      const ehSelect = await caixa.evaluate((el) => el.tagName === "SELECT").catch(() => false);
      if (ehSelect) {
        await caixa.selectOption(setorId).catch(() => caixa.selectOption({ label: setorId }));
      } else {
        await caixa.click();
        await page.getByText(setorId, { exact: false }).first().click();
      }
      await page.waitForLoadState("networkidle").catch(() => {});
    }

    const linhas = page.locator(config.pacientes.linha);
    const total = await linhas.count();
    const pacientes = [];

    for (let i = 0; i < total; i++) {
      const linha = linhas.nth(i);
      const nome = await textoDe(linha, campos.nome);
      if (!nome) continue; // leito vago

      const p = {
        leito: await textoDe(linha, campos.leito),
        nome,
        idade: await textoDe(linha, campos.idade),
        dataInternacao: await textoDe(linha, campos.dataInternacao),
        diagnostico: await textoDe(linha, campos.diagnostico),
        comorbidades: await textoDe(linha, campos.comorbidades),
        alergias: await textoDe(linha, campos.alergias),
        dispositivos: lista(await textoDe(linha, campos.dispositivos)),
        curativos: lista(await textoDe(linha, campos.curativos)),
        antibioticos: lista(await textoDe(linha, campos.antibioticos)),
        culturas: lista(await textoDe(linha, campos.culturas)),
        pendencias: lista(await textoDe(linha, campos.pendencias)),
        observacoes: await textoDe(linha, campos.observacoes),
        evolucaoEnfermagem: await textoDe(linha, campos.evolucaoEnfermagem),
      };

      const href = abrirProntuario
        ? await linha.locator(abrirProntuario).first().getAttribute("href").catch(() => null)
        : null;
      if (href) {
        const ficha = await page.context().newPage();
        try {
          await ficha.goto(new URL(href, page.url()).toString(), { waitUntil: "networkidle" });
          const corpo = ficha.locator("body");
          p.comorbidades ||= await textoDe(corpo, detalhe.comorbidades);
          p.alergias ||= await textoDe(corpo, detalhe.alergias);
          p.observacoes ||= await textoDe(corpo, detalhe.observacoes);
          for (const chave of ["dispositivos", "curativos", "antibioticos", "culturas", "pendencias"]) {
            if (p[chave].length === 0) p[chave] = lista(await textoDe(corpo, detalhe[chave]));
          }
          if (!p.evolucaoEnfermagem && detalhe.evolucaoEnfermagem) {
            if (detalhe.abaEvolucaoEnfermagem) {
              await ficha.locator(detalhe.abaEvolucaoEnfermagem).first().click().catch(() => {});
              await ficha.waitForLoadState("networkidle").catch(() => {});
            }
            // Só a evolução mais recente (o primeiro bloco encontrado).
            const bloco = ficha.locator(detalhe.evolucaoEnfermagem).first();
            p.evolucaoEnfermagem = ((await bloco.innerText({ timeout: 3000 }).catch(() => "")) ?? "").trim();
          }
        } finally {
          await ficha.close().catch(() => {});
        }
      }
      pacientes.push(p);
    }
    return pacientes;
  } finally {
    await page.close();
  }
}
