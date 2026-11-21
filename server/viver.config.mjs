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
    /**
     * Página que lista os BLOCOS do Vivver (Politrauma 1, 2, 3...). A lista
     * que aparece no site é lida daqui — com o login de quem está usando.
     */
    url: "/censo",
    /** Cada setor na lista. O texto do elemento vira o nome do setor. */
    item: "select#setor option, .setor, [data-setor]",
    /** Atributo que identifica o setor (se vazio, usa o próprio texto). */
    atributoId: "value",
  },

  pacientes: {
    /** Página com os pacientes de UM setor. {setor} é trocado pelo id do setor. */
    url: "/censo?setor={setor}",
    /**
     * Se o setor é escolhido NA PRÓPRIA tela (uma caixa de seleção), em vez de
     * ir no endereço: o seletor dessa caixa. O robô escolhe o setor pelo nome.
     */
    escolherSetor: "",
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
      curativos: "",
      antibioticos: "",
      culturas: "",
      pendencias: "",
      observacoes: "",
      evolucaoEnfermagem: "",
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
      curativos: "",
      antibioticos: "",
      culturas: "",
      pendencias: "",
      observacoes: "",
      /**
       * Evolução da enfermagem / dos técnicos (a mais recente). O site tira
       * dela as intercorrências e os curativos. Se ela fica numa aba
       * separada do prontuário, ponha em "abaEvolucaoEnfermagem" o botão/aba
       * que precisa ser clicado antes.
       */
      abaEvolucaoEnfermagem: "",
      evolucaoEnfermagem: "",
    },
  },
};
