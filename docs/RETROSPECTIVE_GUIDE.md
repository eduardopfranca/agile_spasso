# Guia de Retrospectivas

Retrospectiva diária do projeto. Um arquivo por dia trabalhado, em `retrospectives/AAAAMMDD.md`.
A aba Retrospectivas da plataforma lê esses arquivos direto do GitHub.

## Template

As seções abaixo, nesta ordem. **Nunca inventar seções novas.** Seção sem conteúdo é omitida,
não preenchida com "nada a relatar".

```markdown
# Título

**Descrição:** uma ou duas frases com o resultado do dia.

## Relato do dia

## Reuniões e definições novas

## O que funcionou bem

## O que precisa melhorar

## Próximos passos

## Notas gerais
```

**Título** — o resultado, não a atividade. "Refactor da plataforma de acompanhamento", não
"Trabalhei na plataforma".

**Descrição** — abre pelo que foi entregue. Se o dia teve duas ou três frentes, cita as três.

**Relato do dia** — o que foi feito. Prosa curta ou blocos com subtítulo em negrito quando o dia
teve frentes distintas. Listas numeradas quando há sequência de execução.

**Reuniões e definições novas** — decisões tomadas, com o *porquê* quando ele não for óbvio. É a
seção que se relê meses depois. Sem reunião no dia, entram só as definições.

**O que funcionou bem** / **O que precisa melhorar** — princípio, não desabafo. "Consultar o banco
antes de agir revelou o risco de auditoria" carrega método; "foi um dia produtivo" não carrega nada.

**Próximos passos** — o que fica em aberto. Não repetir o que já está no backlog da plataforma.

**Notas gerais** — só o que não coube nas outras seções e tem valor de registro. Quase sempre vazia.

## Registro

Verbo de ação técnica no particípio: **"Corrigido o acesso"**, **"Identificada a causa"**,
**"Revogados os tokens"**, **"Mapeadas as rotas"**.

Não: "aí eu fui e consertei", "resolvi mexer em", "acabei descobrindo que".

Diagnóstico é constatação, não aventura. O bug foi encontrado — não se narra a caçada.

Cada linha carrega informação. Se uma frase pode sair sem perda, ela sai.

O leitor é sênior. Não explicar o óbvio, não justificar decisões como se fosse preciso convencer,
não traduzir termo técnico.

Sem meta-comentário: nada sobre o processo de escrever a retrospectiva, nada sobre o que ficou
de fora dela, nada sobre a própria conversa que a originou.

## Erros recorrentes

**Prolixo.** Narrativa em vez de registro. Frase que descreve o dia em vez de descrever o que foi
feito. Explicação que trata o leitor como leigo.

**Raso.** O oposto, e pior: um dia denso vira quatro linhas e o registro passa a mentir sobre o
volume de trabalho.

**Confundir forma com conteúdo.** "Ficou longo demais" significa comprimir a prosa — nunca apagar
fatos. Um dia com seis entregas continua tendo seis entregas depois da revisão.

**Inventar seção.** O template é fechado.

**Nota de rodapé desnecessária.** Detalhe irrelevante ao projeto entra em meia linha ou não entra.

## Convenções

- Português. É o único conteúdo do repositório que não é em inglês, junto do texto de interface.
- Nome do arquivo: `AAAAMMDD.md`. A aba Retrospectivas depende desse formato para exibir a data.
- Uma retrospectiva por dia trabalhado. Dia sem trabalho não gera arquivo.
- Escrever no fim do dia, sobre o dia. Reconstruir dias depois custa fidelidade.
