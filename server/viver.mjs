/**
 * O robô que entra no Viver com o login do próprio plantonista e lê os
 * pacientes de um setor. Roda só no computador de quem usa — nenhum dado de
 * paciente sai dessa máquina.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import config from "./viver.config.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_SESSAO = path.join(AQUI, ".sessao-viver.json");

export function viverConfigurado() {
  return Boolean(process.env.VIVER_URL && process.env.VIVER_USUARIO && process.env.VIVER_SENHA);
}

function urlCompleta(caminho) {
  const base = process.env.VIVER_URL;
  if (!caminho) return base;
  return new URL(caminho, base.endsWith("/") ? base : `${base}/`).toString();
}

let navegador = null;
let contexto = null;

async function abrirContexto() {
  if (contexto) return contexto;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      'O Playwright não está instalado. Rode "npm install" e depois "npx playwright install chromium".',
    );
  }
  navegador = await chromium.launch({
    headless: process.env.VIVER_MOSTRAR_NAVEGADOR !== "1",
    // Opcional: usar um Chrome/Chromium já instalado em vez do baixado pelo Playwright.
    executablePath: process.env.VIVER_CHROMIUM || undefined,
  });
  contexto = await navegador.newContext({
    storageState: existsSync(ARQUIVO_SESSAO) ? ARQUIVO_SESSAO : undefined,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  return contexto;
}

export async function fecharNavegador() {
  await navegador?.close().catch(() => {});
  navegador = null;
  contexto = null;
}

/** Garante uma página logada. Reaproveita a sessão salva quando ela ainda vale. */
export async function paginaLogada() {
  const ctx = await abrirContexto();
  const page = await ctx.newPage();
  await page.goto(urlCompleta(config.login.url), { waitUntil: "domcontentloaded" });

  const campoSenha = page.locator(config.login.senha).first();
  const precisaLogar = await campoSenha.isVisible({ timeout: 4000 }).catch(() => false);

  if (precisaLogar) {
    await page.locator(config.login.usuario).first().fill(process.env.VIVER_USUARIO);
    await campoSenha.fill(process.env.VIVER_SENHA);
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => {}),
      page.locator(config.login.entrar).first().click(),
    ]);
    const aindaNoLogin = await page
      .locator(config.login.senha)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (aindaNoLogin) {
      await page.close();
      throw new Error("Não consegui entrar no Viver. Confira usuário e senha no arquivo .env.");
    }
    await ctx.storageState({ path: ARQUIVO_SESSAO });
  }
  return page;
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

export async function listarSetores() {
  const page = await paginaLogada();
  try {
    await page.goto(urlCompleta(config.setores.url), { waitUntil: "networkidle" });
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

export async function lerPacientesDoSetor(setorId) {
  const page = await paginaLogada();
  const { campos, detalhe, abrirProntuario } = config.pacientes;
  try {
    const url = urlCompleta(config.pacientes.url.replace("{setor}", encodeURIComponent(setorId)));
    await page.goto(url, { waitUntil: "networkidle" });

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
