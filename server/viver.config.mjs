/**
 * Onde cada informação está dentro do Viver.
 *
 * Este é o ÚNICO arquivo que precisa mudar para o robô entender as telas do
 * Viver. Os valores abaixo são palpites genéricos — eles serão ajustados
 * quando a gente olhar a estrutura real das telas (veja "npm run viver:explorar"
 * no README).
 *
 * Seletores são "endereços" de elementos na página (seletores CSS do
 * Playwright). Vários seletores separados por vírgula = o primeiro que existir.
 */
export default {
  login: {
    /** Página de login. Se vazio, usa VIVER_URL do .env. */
    url: "",
    usuario:
      'input[name="usuario"], input[name="username"], input[name="login"], input[type="email"], input[type="text"]',
    senha: 'input[type="password"]',
    entrar: 'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")',
    /** Algo que só aparece depois de logado — confirma que o login deu certo. */
    logadoQuando: 'text=/sair|logout|bem-vindo/i',
  },

  setores: {
    /** Página que lista os setores/unidades (censo, mapa de leitos...). */
    url: "/censo",
    /** Cada setor na lista. O texto do elemento vira o nome do setor. */
    item: "select#setor option, .setor, [data-setor]",
    /** Atributo que identifica o setor (se vazio, usa o próprio texto). */
    atributoId: "value",
  },

  pacientes: {
    /** Página com os pacientes de UM setor. {setor} é trocado pelo id do setor. */
    url: "/censo?setor={setor}",
    /** Cada linha/cartão de paciente. */
    linha: "table tbody tr",
    /**
     * Onde está cada campo DENTRO da linha.
     * - número  → índice da coluna da tabela (0 = primeira coluna)
     * - texto   → seletor CSS dentro da linha
     * - vazio   → campo não disponível nessa tela
     */
    campos: {
      leito: 0,
      nome: 1,
      idade: 2,
      dataInternacao: 3,
      diagnostico: 4,
      comorbidades: "",
      alergias: "",
      dispositivos: "",
      antibioticos: "",
      culturas: "",
      pendencias: "",
      observacoes: "",
    },
    /**
     * Se os detalhes (dispositivos, antibióticos, pendências...) só aparecem
     * ao abrir o prontuário do paciente, indique aqui o link dentro da linha.
     * O robô abre cada prontuário e lê os campos de "detalhe".
     */
    abrirProntuario: "",
    detalhe: {
      comorbidades: "",
      alergias: "",
      dispositivos: "",
      antibioticos: "",
      culturas: "",
      pendencias: "",
      observacoes: "",
    },
  },
};
