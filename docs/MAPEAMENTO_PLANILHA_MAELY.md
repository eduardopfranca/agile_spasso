# Mapeamento da Planilha da Maely — `Controle_Derivativos.xlsx`

> **Objetivo:** a planilha é o alvo funcional. Tudo que ela **registra** e **reporta** o app precisa passar a fazer, mantendo **log** (quem/quando/o quê) e **histórico** (estado ao longo do tempo).
> Status: `[E]` existe · `[A]` a adaptar · `[N]` novo · `(!)` pendência externa. · Revisão: 13/jul/2026, lida diretamente do arquivo.

---

## 1. O que a planilha é

Controle completo de hedge da **Intergrãos** (grupo Spasso), operando via **StoneX**, em **Soja e Milho** (CBOT e BMF) com **perna de dólar/NDF**. Cobre:

- **Registro** de cada operação de bolsa (futuros e opções) e de cada operação física de Long Basis, com vínculo entre elas.
- **Cálculo** de MTM diário decomposto em **físico + bolsa + dólar**, custos de carrego, exposição, stress e margem.
- **Reporte** de posição consolidada, resultado de liquidações, caixa da corretora, variação cambial, fluxo de caixa e gestão de limite/margem.

As 16 abas se dividem em **domínio/referência**, **registro (captura)**, **cálculo** e **reporte**.

---

## 2. As 16 abas e seus papéis

| Aba | Papel | Camada no app | Registro/Reporte | Status |
|---|---|---|---|---|
| `dms` | Listas de domínio: commodity+bolsa (com volume/lote), calendário, tipos de movimento de caixa, tipos de liquidação | Entidades primárias + enums | Registro | A |
| `Preços_MTM` | Preços de fechamento (bolsa), FX (dólar) e preço físico por praça | Lançamento (captura de preços) | Registro | A |
| `Analítico_Deriv` | Livro de derivativos: cada operação de bolsa (futuro/dólar), imutável, com vínculo de offset | Entidade secundária (Derivativo) + cálculo MTM | Registro + cálculo | A/N |
| `Analítico_Deriv_Op` | Livro de opções (Call), vinculado ao derivativo | Entidade secundária (Opção) + cálculo MTM | Registro + cálculo | N |
| `Op. Long_Basis_Vig` | Operações físicas de Long Basis **vigentes**, ligadas a derivativo + NDF | Entidade secundária (Operação física) + cálculo | Registro + cálculo | A |
| `Op. Long_Basis_Liq` | Operações de Long Basis **liquidadas** (Entrada/Saída) | Idem, estado liquidado | Registro + cálculo | A |
| `Liquidações.Derivativos` | Registro de liquidações (offset), resultado em USD/BRL | Entidade secundária (Liquidação) | Registro | N |
| `Caixa_Corretoras` | Caixa da corretora: saldo + livro de movimentos (IRRF, etc.) | Entidade secundária (Movimento de caixa) | Registro + cálculo | N |
| `MTM_LB-Milho-26` / `Din.MTM_LB` | MTM parcial de uma operação Long Basis, por praça e por componente | Relatório de MTM por operação | Reporte | N |
| `Reporte_Liq` | Resultado de uma liquidação por componente (físico/bolsa/dólar), basis e R$/sc | Relatório de liquidação | Reporte | N |
| `Resumo_Derivativos` | Exposição (tons), exposição cambial (USD), exposição a basis, MTM consolidado (R$) | Dashboard de posição/exposição | Reporte | N |
| `Evolução_MTM` | Série diária do MTM Total | Histórico (snapshot temporal) | Reporte + histórico | N |
| `Var_Cambial` | Movimentações de caixa por tipo, caixa inicial/final, variação cambial | Relatório de caixa e variação cambial | Reporte | N |
| `Fluxo_Caixa` | Projeção de fluxo de caixa por empresa/corretora/commodity/mês | Relatório de fluxo de caixa | Reporte | N |
| `Gestão_Stonex` | Caixa, MTM, net de liquidação, margem inicial/variação, consumo, saldo, stress | Gestão de limite e margem (risco) | Reporte | N |

---

## 3. Entidades primárias (dados mestres)

Confirmadas pela planilha, alimentam os cadastros da Fundação:

- **Empresa** `[A]` — multi-empresa confirmado: aparecem filiais/CNPJs distintos ("Intergrãos MT", "Intergrãos MG", "Intergran MG", "Intergran GO").
- **Corretora** `[N]` — StoneX (com conta associada à empresa).
- **Commodity + Bolsa** `[A]` — Soja/CBOT, Milho/BMF, Milho/CBOT, Dólar/BMF; cada par tem **volume por lote** (ex.: Soja CBOT ≈ 136.078 kg, Milho BMF = 27.000 kg). Vira registry (agnóstico).
- **Praça/Unidade** `[A]` — Confresa e Matupa (MT), Sacramento (MG).
- **Contraparte** `[A]` — produtores (pessoa física/jurídica) na compra e tradings (ex.: LDC) na venda. Estender o cadastro de Produtor para "Contraparte".
- **Safra** `[A]` — Safra Atual / Safra Próxima (vira dimensão).
- **Calendário** `[A]` — dimensão de datas (dia/mês/ano) usada para agrupar comissão, fluxo e liquidação.

**Enums** (listas de `dms`): tipos de movimento de caixa (envio de recurso próprio, juros de limite, prêmio de opção, reversão, saque, selldown, transferência interna, IRRF); tipos de liquidação (offset antecipado / por vencimento).

---

## 4. Entidades secundárias (transacionais)

- **Derivativo** (`Analítico_Deriv`, IDs `F1…F24`) `[A]` — campos-chave: Data Hedge, Status Extrato (Vigente/Liquidado), Commodity, Safra, **Movimento (Entrada/Saída)**, **Vínculo** (IDs que a saída zera), **Trade ID** e **Contrato** (chaves únicas StoneX), Empresa, Corretora, Operação (Compra/Venda), Estratégia (Futuro/Opção), N° Lotes, Bolsa, Referência (ticker), Strike, Data Expiração/Vencimento, Notional USD, Operação Vinculada (ex.: LB-Soja-26).
  - **Modelo idêntico ao do app:** operação imutável; a Saída referencia as Entradas que liquida (ex.: `F8` zera `F2;F3;F4;F5;F6`). Reaproveita a imutabilidade + vínculo já existentes em ordens.
- **Opção** (`Analítico_Deriv_Op`, `O#`) `[N]` — Call, com Strike, Data de Expiração, Preço, FV, MTM; vinculada ao derivativo.
- **Operação física / Long Basis** (`Op. Long_Basis_*`, `LB#`) `[A]` — liga contraparte + praça + volume + preço negociado ao derivativo (`ID Derivativo Commo`) e ao NDF; carrega o MTM decomposto e os custos.
- **Liquidação** (`Liquidações.Derivativos`) `[N]` — volume, data, taxa BRL/USD, liquidação USD/BRL, IDs vinculados, tipo de liquidação.
- **Movimento de caixa da corretora** (`Caixa_Corretoras`) `[N]` — data, empresa, corretora, valor USD/BRL, tipo de movimentação, origem/destino.

---

## 5. Lançamentos (captura que popula bases, não são entidades)

- **Preços de MTM** (`Preços_MTM`) `[A]` — três origens num mesmo lançamento: (a) cotação de bolsa por ticker (FV), (b) FX/dólar, (c) **preço físico por praça** (commodity × safra × praça → preço, com vencimento). Alimenta todo o cálculo de MTM.

---

## 6. Cálculos (viram engines Python — nunca no front, P07)

As fórmulas da planilha são a especificação. Principais motores a extrair:

- **MTM decomposto** `[A/N]` — Físico + Bolsa + Dólar → Total; e MTM por saca. Regras diferem por bolsa (CBOT vs BMF) e moeda (BRL vs USD).
- **Custos de carrego** `[A]` — custo financeiro (juros do período sobre o preço) + outros custos (custos por saca). Já existe modelo de custo/carrego na precificação; reconciliar.
- **Exposição** `[N]` — em tons, cambial (USD, CBOT + NDF) e a basis, por empresa/safra/natureza.
- **Conversões** `[A]` — kg ↔ sacas (÷60) ↔ lotes ↔ tons; notional; exposição em kg.
- **Basis** `[A]` — basis de entrada, basis atual e evolução do basis (liga ao histórico de basis que o app já tem).
- **Stress / risco** `[N]` — choque por chave commodity+bolsa; MTM sob stress; base para VaR.
- **Margem** `[N]` — margem inicial/variação, consumo, saldo disponível, margeamento (gestão de limite StoneX).

---

## 7. Relatórios (o "reportar tudo")

Cada um vira uma visão consolidada no app, calculada a partir dos registros:

- **Posição e exposição** (`Resumo_Derivativos`): exposição em tons, cambial e a basis; MTM em R$ por produto/safra.
- **MTM por operação** (`MTM_LB-*`, `Din.MTM_LB`): MTM e custo por saca, por praça e por componente.
- **Resultado de liquidação** (`Reporte_Liq`): resultado por componente, basis entrada/saída, R$/sc.
- **Caixa e variação cambial** (`Var_Cambial`, `Caixa_Corretoras`): movimentos por tipo, caixa inicial/final, variação passiva/ativa.
- **Fluxo de caixa** (`Fluxo_Caixa`): projeção por empresa/commodity/mês.
- **Gestão de limite/margem** (`Gestão_Stonex`): net de liquidação, margem, saldo, stress.

---

## 8. Log e histórico — requisito central

Hoje a planilha **não tem trilha** e tem só um histórico manual e parcial (`Evolução_MTM`, snapshot diário do MTM Total). No app, separam-se em duas coisas:

- **Log (auditoria)** `[E/A]` — quem/quando/o quê em cada registro e alteração. O app já tem o padrão `ActivityLog`; estender a todas as tabelas transacionais desta planilha.
- **Histórico (snapshots temporais)** `[N]` — para reconstruir qualquer data, o app precisa **fotografar diariamente** posição, MTM (por componente), preços de MTM, caixa e margem. `Evolução_MTM` é o embrião disso, feito à mão; no app vira captura automática/versionada. Implica tabelas temporais (snapshot por data) para posição, MTM, preços e caixa.
- **Imutabilidade** `[E]` — operações não são editadas; correção/zeragem cria nova operação vinculada. A planilha já opera assim (Entrada/Saída + Vínculo), e o app também — preserva histórico por design.

---

## 9. Como encaixa no backlog

| Seção do backlog | O que a planilha detalha |
|---|---|
| Fundação / Cadastros | Empresa (multi-CNPJ), Corretora, Conta, Commodity+Bolsa (com lote), Praça, Contraparte, Safra |
| Captura | Livros de derivativo/opção/Long Basis, liquidações, caixa, lançamento de preços de MTM |
| Registro de hedge | `Analítico_Deriv` (boletagem, chaves StoneX, Entrada/Saída+Vínculo); conciliação = Status Extrato vs. extrato StoneX |
| Posição/MTM | `Resumo_Derivativos`, engines de MTM, `Evolução_MTM` (histórico) |
| Risco/contábil | `Gestão_Stonex` (margem/stress), exposição, VaR; `Var_Cambial` |
| Caixa | `Caixa_Corretoras`, `Fluxo_Caixa` |

---

## 10. Pendências externas `(!)`

- **Parâmetros de risco/margem/stress** — margem inicial/variação (hoje fixas em USD 250.000), choques de stress por commodity, limites: dependem da área de risco (Maely).
- **Regras de custo de carrego** — os coeficientes por saca e a taxa de juros usados nos custos precisam ser confirmados como política (Maely).
- **Integração Sankhya** — posição física e contrapartes podem vir do ERP; depende de decisão/ação da Spasso.
- **Contábil** — tratamento contábil das liquidações e do IRRF, e reporte à Fato: depende da contabilidade.
