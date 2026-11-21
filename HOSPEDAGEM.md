# Hospedagem — guia para a TI

O site da passagem de plantão é **um container só** (site + robô que lê o
Vivver). Quem usa só precisa do link: nada é instalado nos computadores.

## Como funciona

1. A pessoa abre o link e entra com **o próprio usuário e senha do Vivver**.
2. O servidor abre, para essa pessoa, uma sessão separada de navegador sem tela
   (Chromium/Playwright), faz o login em `macae-rj.vivver.com` e lê os
   pacientes do setor escolhido com o acesso **dela** — o registro de acesso
   do Vivver continua apontando para quem de fato consultou.
3. A folha da passagem é montada no navegador da pessoa e impressa.

O que o servidor **não** faz:

- não guarda senhas (usadas só no login, descartadas em seguida);
- não tem banco de dados: os dados dos pacientes ficam só na memória da
  sessão, por no máximo 1 minuto de cache, e somem ao sair ou após 2 h sem uso;
- não registra dados de pacientes nem senhas no log.

## Subindo

```bash
docker build -t passagem-plantao .
docker run -d --name passagem -p 8080:8080 --restart unless-stopped passagem-plantao
```

Coloque na frente um proxy reverso com **HTTPS** (nginx, Caddy, Traefik ou o
balanceador do hospital) apontando para a porta 8080. O cookie de sessão é
marcado como `Secure`, então **sem HTTPS o login não se mantém**.

Variáveis (todas opcionais — os valores padrão já estão no Dockerfile):

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `VIVER_URL` | `https://macae-rj.vivver.com/login` | página de login do Vivver |
| `VIVER_SETOR_PADRAO` | `Politrauma 3` | setor que abre selecionado |
| `ATUALIZAR_A_CADA_MIN` | `5` | atualização automática da passagem |
| `SESSAO_INATIVIDADE_MIN` | `120` | encerra sessões paradas |
| `PORT` | `8080` | porta do container |

Recursos: cada pessoa conectada usa um contexto de navegador (~50–100 MB de
RAM). Para 20 pessoas ao mesmo tempo, 2 GB de RAM e 1–2 vCPU sobram.

## Recomendações

- Hospedar **na rede do hospital** ou em nuvem com região no Brasil.
- Se possível, restringir o acesso (VPN, rede interna ou lista de IPs).
- A conexão com o Vivver sai do servidor: libere a saída HTTPS para
  `macae-rj.vivver.com`.
- Se o Vivver oferecer **API de integração** ou um **ambiente de homologação**
  com pacientes fictícios, ela é preferível à leitura das telas — e o
  ambiente de homologação permite mapear as telas sem expor dados reais.
