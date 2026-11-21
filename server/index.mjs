/**
 * Servidor local da passagem de plantão. Fica no computador do plantonista e
 * só atende o próprio computador (127.0.0.1). O site pergunta aqui; daqui o
 * robô entra no Viver.
 *
 *   GET /api/viver/status              → { configurado, minutos }
 *   GET /api/viver/setores             → [{ id, nome }]
 *   GET /api/viver/passagem?setor=ID   → { setor, atualizadoEm, pacientes }
 */
import http from "node:http";
import {
  fecharNavegador,
  lerPacientesDoSetor,
  listarSetores,
  viverConfigurado,
} from "./viver.mjs";

const PORTA = Number(process.env.PORTA_SERVIDOR ?? 5174);
/** Evita abrir o Viver de novo se alguém recarregar a página em seguida. */
const CACHE_MS = 60_000;
const cache = new Map();

/** Uma leitura por vez — o Viver é um site só, e o robô é um navegador só. */
let fila = Promise.resolve();
function emFila(tarefa) {
  const proxima = fila.then(tarefa, tarefa);
  fila = proxima.catch(() => {});
  return proxima;
}

async function comCache(chave, tarefa) {
  const guardado = cache.get(chave);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.valor;
  const valor = await emFila(tarefa);
  cache.set(chave, { em: Date.now(), valor });
  return valor;
}

function responder(res, status, corpo) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corpo));
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  try {
    if (url.pathname === "/api/viver/status") {
      return responder(res, 200, {
        configurado: viverConfigurado(),
        minutos: Number(process.env.ATUALIZAR_A_CADA_MIN) || 5,
      });
    }
    if (!viverConfigurado()) {
      return responder(res, 503, {
        erro: "O Viver ainda não está configurado. Preencha o arquivo .env (veja o README).",
      });
    }
    if (url.pathname === "/api/viver/setores") {
      return responder(res, 200, await comCache("setores", listarSetores));
    }
    if (url.pathname === "/api/viver/passagem") {
      const setor = url.searchParams.get("setor");
      if (!setor) return responder(res, 400, { erro: "Faltou escolher o setor." });
      const forcar = url.searchParams.get("forcar") === "1";
      if (forcar) cache.delete(`passagem:${setor}`);
      const pacientes = await comCache(`passagem:${setor}`, () => lerPacientesDoSetor(setor));
      return responder(res, 200, {
        setor,
        atualizadoEm: new Date(cache.get(`passagem:${setor}`)?.em ?? Date.now()).toISOString(),
        pacientes,
      });
    }
    responder(res, 404, { erro: "Endereço desconhecido." });
  } catch (erro) {
    console.error("[viver]", erro);
    responder(res, 502, { erro: erro instanceof Error ? erro.message : String(erro) });
  }
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`Servidor da passagem de plantão em http://127.0.0.1:${PORTA}`);
  console.log(viverConfigurado() ? "Viver configurado." : "Viver NÃO configurado — preencha o .env.");
});

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, async () => {
    await fecharNavegador();
    process.exit(0);
  });
}
