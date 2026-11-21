/**
 * Servidor da passagem de plantão. Serve o site e, por trás dele, o robô que
 * lê o Vivver. Cada pessoa entra com o próprio login do Vivver.
 *
 *   GET  /api/viver/status              → { configurado, logado, usuario, minutos, setorPadrao }
 *   POST /api/entrar   { usuario, senha } → abre a sessão (cookie)
 *   POST /api/sair                       → encerra a sessão
 *   GET  /api/viver/setores             → [{ id, nome }]
 *   GET  /api/viver/passagem?setor=ID   → { setor, atualizadoEm, pacientes }
 *
 * Em produção, rode atrás de HTTPS (veja HOSPEDAGEM.md).
 */
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  entrar,
  fecharNavegador,
  lerPacientesDoSetor,
  listarSetores,
  sair,
  sessao,
  SessaoExpirada,
  viverConfigurado,
} from "./viver.mjs";

const PORTA = Number(process.env.PORT ?? process.env.PORTA_SERVIDOR ?? 5174);
const HOST = process.env.HOST ?? "127.0.0.1";
const HTTPS = process.env.COOKIE_SEGURO === "1"; // ligue em produção (site em https)
const PASTA_SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

/** Evita abrir o Vivver de novo se a pessoa recarregar a página em seguida. */
const CACHE_MS = 60_000;

function lerCookie(req, nome) {
  const m = (req.headers.cookie ?? "").match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function cookieSessao(valor, maxAge) {
  return `sessao=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${HTTPS ? "; Secure" : ""}`;
}

function responder(res, status, corpo, cabecalhos = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...cabecalhos,
  });
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req) {
  let texto = "";
  for await (const pedaco of req) {
    texto += pedaco;
    if (texto.length > 10_000) throw new Error("Pedido grande demais.");
  }
  return JSON.parse(texto || "{}");
}

/** Tentativas de login por IP — trava chutes de senha. */
const tentativas = new Map();
function podeTentar(ip) {
  const agora = Date.now();
  const t = (tentativas.get(ip) ?? []).filter((em) => agora - em < 15 * 60_000);
  tentativas.set(ip, t);
  return t.length < 10;
}

/** Uma leitura por vez por pessoa — evita abrir dez abas do Vivver ao mesmo tempo. */
function emFila(s, tarefa) {
  const proxima = (s.fila ?? Promise.resolve()).then(tarefa, tarefa);
  s.fila = proxima.catch(() => {});
  return proxima;
}

async function comCache(s, chave, forcar, tarefa) {
  s.cache ??= new Map();
  const guardado = s.cache.get(chave);
  if (!forcar && guardado && Date.now() - guardado.em < CACHE_MS) return guardado;
  const valor = await emFila(s, tarefa);
  const novo = { em: Date.now(), valor };
  s.cache.set(chave, novo);
  return novo;
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function servirSite(res, pathname) {
  if (!existsSync(PASTA_SITE)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end('Site não compilado. Rode "npm run build".');
  }
  let arquivo = path.resolve(PASTA_SITE, `.${path.posix.normalize(pathname)}`);
  if (!arquivo.startsWith(PASTA_SITE + path.sep) || !existsSync(arquivo) || statSync(arquivo).isDirectory()) {
    arquivo = path.join(PASTA_SITE, "index.html"); // rotas do React
  }
  const ext = path.extname(arquivo);
  res.writeHead(200, {
    "Content-Type": TIPOS[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  createReadStream(arquivo).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = lerCookie(req, "sessao");
  const s = sessao(token);

  if (!url.pathname.startsWith("/api/")) return servirSite(res, url.pathname);

  try {
    if (url.pathname === "/api/viver/status") {
      return responder(res, 200, {
        configurado: viverConfigurado(),
        logado: Boolean(s),
        usuario: s?.usuario ?? null,
        minutos: Number(process.env.ATUALIZAR_A_CADA_MIN) || 5,
        setorPadrao: process.env.VIVER_SETOR_PADRAO ?? "",
      });
    }

    if (url.pathname === "/api/entrar" && req.method === "POST") {
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress;
      if (!podeTentar(ip)) {
        return responder(res, 429, { erro: "Muitas tentativas. Espere alguns minutos e tente de novo." });
      }
      const { usuario, senha } = await lerCorpo(req);
      if (!usuario || !senha) return responder(res, 400, { erro: "Preencha usuário e senha." });
      tentativas.get(ip).push(Date.now());
      const novo = await entrar(String(usuario), String(senha));
      return responder(res, 200, { ok: true }, { "Set-Cookie": cookieSessao(novo, 12 * 3600) });
    }

    if (url.pathname === "/api/sair" && req.method === "POST") {
      if (token) await sair(token);
      return responder(res, 200, { ok: true }, { "Set-Cookie": cookieSessao("", 0) });
    }

    if (!viverConfigurado()) {
      return responder(res, 503, { erro: "O endereço do Vivver não está configurado (VIVER_URL)." });
    }
    if (!s) return responder(res, 401, { erro: "Entre com seu usuário do Vivver." });

    if (url.pathname === "/api/viver/setores") {
      const { valor } = await comCache(s, "setores", false, () => listarSetores(s));
      return responder(res, 200, valor);
    }

    if (url.pathname === "/api/viver/passagem") {
      const setor = url.searchParams.get("setor");
      if (!setor) return responder(res, 400, { erro: "Faltou escolher o bloco." });
      const forcar = url.searchParams.get("forcar") === "1";
      const { em, valor } = await comCache(s, `passagem:${setor}`, forcar, () => lerPacientesDoSetor(s, setor));
      return responder(res, 200, { setor, atualizadoEm: new Date(em).toISOString(), pacientes: valor });
    }

    responder(res, 404, { erro: "Endereço desconhecido." });
  } catch (erro) {
    if (erro instanceof SessaoExpirada) {
      if (token) await sair(token);
      return responder(res, 401, { erro: erro.message }, { "Set-Cookie": cookieSessao("", 0) });
    }
    // Nunca registra corpo de pedido (senha) nem dados de paciente — só a mensagem.
    console.error("[vivver]", erro instanceof Error ? erro.message : erro);
    const status = erro instanceof Error && /usuário ou senha/i.test(erro.message) ? 401 : 502;
    responder(res, status, { erro: erro instanceof Error ? erro.message : String(erro) });
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log(`Passagem de plantão em http://${HOST}:${PORTA}`);
  console.log(viverConfigurado() ? `Vivver: ${process.env.VIVER_URL}` : "VIVER_URL não configurado — modo demonstração.");
});

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, async () => {
    await fecharNavegador();
    process.exit(0);
  });
}
