# Guia de Retrospectivas — agile_spasso

## Propósito

Registro de sessão de trabalho: o que foi feito, quais decisões foram tomadas, o que funcionou e o que precisa mudar. É o histórico de verdade do projeto, versionado no git — diferente do documento vivo (backlog/sprints), que muda o tempo todo.

## Onde e como

- Um arquivo por dia de trabalho, em `retrospectives/AAAAMMDD.md` (ex.: `20260713.md`).
- Escrito ao final de cada sessão (ou dia), por quem trabalhou no projeto — hoje, só o Edu.
- Adicionar uma retrospectiva é **só commitar o arquivo** — a plataforma não tem botão de criar, por design (garante que só quem tem acesso ao repositório escreve retrospectivas).
- Se o dia ainda está em andamento, **não** commitar ainda — rascunhar à parte e consolidar no fim do dia. A aba Retrospectivas assume que a mais recente é a mais completa.

## Template

```markdown
# [Título curto e descritivo do dia/sessão]

**Descrição rápida:** uma ou duas frases — o suficiente pra bater o olho e saber do que se trata sem ler tudo.

## Relato do dia

Narrativa em primeira pessoa, contando o que foi feito, em ordem, com contexto suficiente pra
alguém (inclusive você mesmo, meses depois) entender o que aconteceu e por quê.

## Reuniões e definições novas

- O que foi decidido, com quem, e por quê (quando relevante).

## O que funcionou bem

- ...

## O que precisa melhorar

- ...

## Próximos passos

- O que fica pendente pra próxima sessão (diferente de "nota solta" — é o que efetivamente
  precisa continuar).

## Notas gerais

Qualquer coisa que não se encaixa acima — observações, contexto, links.
```

## Convenções

- Primeira pessoa, tom direto — é um registro pessoal de trabalho, não um documento formal para terceiros.
- Seções vazias podem ser omitidas (ex.: um dia sem reunião não precisa de "Reuniões e definições novas" com "N/A" — só remova a seção).
- Honestidade acima de polish: "o que precisa melhorar" só tem valor se for sincero.
- Como todo o restante do projeto que não é para consumo do usuário final, o arquivo em si (nome, estrutura) segue convenção técnica em inglês, mas o **conteúdo é em português** — mesma regra do resto da documentação interna.
