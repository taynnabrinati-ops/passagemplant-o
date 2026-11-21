/**
 * Lê a evolução de enfermagem (texto livre) e separa o que importa para a
 * passagem: intercorrências e curativos. É uma leitura por palavras-chave —
 * frase a frase — então nada é inventado: cada item é um trecho da evolução.
 */

const INTERCORRENCIA = [
  /intercorr[eê]ncia(?!s? n[aã]o)/i,
  /febr|febril|hipertermia|pico t[eé]rmico/i,
  /dessatur|satura[çc][aã]o (de |at[eé] )?[1-8]\d ?%/i,
  /queda (do leito|da (pr[oó]pria )?altura)|caiu/i,
  /sangra|hemorrag|hemat[eê]mese|melena|hematúria/i,
  /agita[çc][aã]o|agitad|desorient|confus[aã]o mental|rebaixamento/i,
  /v[oô]mit|[eê]mese|n[aá]usea/i,
  /hipotens|hipertens|pa (de )?\d{2,3}x\d{2,3}/i,
  /hipoglic|hiperglic|glicemia (capilar )?(de )?(\d{1,2}|[3-9]\d\d) ?mg/i,
  /convuls|crise convulsiva/i,
  /bradicard|taquicard|arritmi|fibrila/i,
  /\bpcr\b|parada card/i,
  /broncoaspir|engasg/i,
  /diarreia|evacua[çc][aã]o l[ií]quida|fezes l[ií]quidas/i,
  /olig[uú]ri|an[uú]ri/i,
  /recus(a|ou)/i,
  /(perd(a|eu|ido)|tracion|retir(ou|ada) (acidental|inadvertid))[^.]*(acesso|sonda|sne|svd|dreno|cateter|cvc|tot)/i,
  /(acesso|sonda|sne|svd|dreno|cateter|cvc|tot)[^.]*(perdid|tracionad|sacad|exteriorizad)/i,
  /extuba[çc][aã]o (acidental|n[aã]o programada)|auto ?extub/i,
  /conten[çc][aã]o/i,
  /dor (intensa|forte|importante)|queixa de dor|algia/i,
  /comunicad[oa] (ao |a )?(plantonista|m[eé]dic|enfermeir)/i,
];

const CURATIVO = /curativo|cobertura|\blpp\b|les[aã]o por press|úlcera|ferida|\bf\.?o\.?\b|incis[aã]o|deisc|hidrocol|\bage\b|alginato|carv[aã]o ativado|papa[ií]na|sulfadiazina|placa de prata|membrana/i;

const SEM_ALTERACAO = /sem intercorr[eê]ncias?|sem queixas|nega(ndo)? intercorr/i;

function frases(texto: string): string[] {
  return texto
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    // Divide em ponto final ou ponto e vírgula seguidos de espaço — "1.200 mL"
    // e "38,7" ficam inteiros.
    .split(/[.;](?=\s|$)/)
    .map((f) => f.trim().replace(/^[-•]\s*/, "").replace(/[.;\s]+$/, ""))
    .filter((f) => f.length > 3);
}

function capitalizar(f: string) {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function extrairDaEvolucao(texto: string): { intercorrencias: string[]; curativos: string[] } {
  const intercorrencias: string[] = [];
  const curativos: string[] = [];
  for (const frase of frases(texto)) {
    if (CURATIVO.test(frase)) curativos.push(capitalizar(frase));
    else if (!SEM_ALTERACAO.test(frase) && INTERCORRENCIA.some((re) => re.test(frase))) {
      intercorrencias.push(capitalizar(frase));
    }
  }
  return { intercorrencias, curativos };
}
