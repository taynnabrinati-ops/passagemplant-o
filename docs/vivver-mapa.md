# O que já se sabe das telas do Vivver (Macaé)

Levantado a partir das telas copiadas com textos embaralhados — sem nenhum
dado de paciente.

## Caminho
1. `/login` → escolher a conta → senha → **Entrar**.
2. `/desktop` — área de trabalho com janelas internas (cada janela é um
   `iframe`).
3. Menu → **Painel de Internação** (`/inh/painel_internacao`). Aparece um
   aviso de consultorias pendentes (OK).
4. Parâmetros: Município, Unidade de saúde, Setor (INTERNAÇÃO), Convênio,
   Clínica, **Bloco** (`painel_internacao[hos_inh_bloco_id]`), Tipo de
   acomodação, Acomodação → **Pesquisar**.

## Lista de leitos
- Tabela `#hos-inh-leito-table` (bootstrap-table), dados carregados por
  `data-url` em `/inh/painel_internacao/<ação>.json`, 1 linha por leito.
- Colunas visíveis: Leito, Extra, Bloco, Acomodação, Laudo (lupa → abre o
  prontuário), Prontuário, Usuário (paciente), Sexo, Idade, Tempo alocado,
  Previsão de Alta, Consultoria.

## Prontuário eletrônico
- Janela `/inh/prontuario_eletronico?...&prontuario_eletronico[hos_inh_recepcao_internacao_id]=<id>`.
- É uma tela de **escrever** evolução: o robô só lê, nunca salva.
- Abas: `tab_anamnese`, `tab_dados_gerais` (diagnóstico inicial e CID
  principal), `tab_prescricao_dia`, `tab_pd_prescricao`, `tab_pd_cuidado`,
  `tab_dispositivo_invasivo`, `tab_solicitacao_exame`, `tab_historico_exame`,
  `tab_balanco_hidrico`, `tab_consultoria`, `tab_historico_consultoria`,
  `tab_escala` (Fugulin, AVD, Braden, Morse, Glasgow)…
- Prescrição do dia: itens com campos
  `.amx-prescricao-dia-grid-item-prescricao-principio-*` (princípio ativo,
  intervalo, data-hora-início, uso contínuo, via, observação).
- Janela de prescrição: `/amx/prescricao_medicamento`.

## Confirmado pelos mapas (só nomes)
- Leitos: `GET /inh/painel_internacao/atualizar_leitos.json`. Campos por linha:
  `leito`, `bloco`, `acomodacao`, `situacao`, `usuario` (paciente),
  `idade`, `sexo`, `prontuario`, `recepcao_id` (id da internação),
  `tempo_alocado`, `dia_previsao_alta`, `indisolamento`, `total_evolucoes_nao_lidas`.
- Prontuário: `/inh/prontuario_eletronico?prontuario_eletronico[hos_inh_recepcao_internacao_id]=<recepcao_id>&workMode=…&oldWorkMode=…`.
- Prescrição do dia: campos `prontuario_eletronico[item_prescricao[N]][…]`
  (`data_hora_inicio`, `intervalo_desc`, `obsprincipio`, `codviaadministracao`,
  `numdiaduracao`…); cuidados em `item_cuidado[N]`.
- Prescrição de medicamento (`/amx/prescricao_medicamento`) tem
  `dat_inicio_uso_antibiotico` → dia de antibiótico.
- Diagnóstico: `desdiagnosticoinicial`, `codcidprincipal`, `codcidsecundario`.

## Falta
- **Histórico de evolução** (atalho `shortcut_inh_historico_evolucao`): onde
  ficam as evoluções médica e de enfermagem, "fechadinhas".
- Nomes exatos dos campos do JSON da lista de leitos e dos parâmetros das
  janelas → `server/mapear-vivver.js`.
