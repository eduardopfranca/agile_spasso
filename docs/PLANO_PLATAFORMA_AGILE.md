# Plano — Plataforma de Acompanhamento Ágil (deploy)

> Transformar o documento interativo (backlog + mapa) numa página web compartilhada, com persistência real e autoria por nome. Sem login, sem senha, sem over-engineering.

---

## 1. Objetivo e escopo

**É:** o backlog + mapa que já existem, agora **compartilhados** (todos veem o mesmo estado), com **nome do autor** carimbado em cada nota/ação, mais **pendências** e **sprints**. Acompanhamento ágil interno.

**Não é:** login/senha, papéis/permissões, tempo real, notificações, kanban sofisticado. Nome digitado = confiança do time.

**Stack:** hospedagem no **Cloudflare Pages**, persistência em **Cloudflare Worker + KV**. Tudo no plano grátis, isolado do Supabase (que está lotado).

**Status geral: Fases 0, 1 e 2 concluídas e no ar.** Este documento permanece como referência de arquitetura e como registro do planejamento original — as seções de fases abaixo foram atualizadas para refletir o que foi de fato entregue.

---

## 2. Arquitetura

```
Navegador (index.html)
   │  GET  /doc  → lê o JSON do documento
   │  POST /doc  → grava (com checagem de versão)
   ▼
Cloudflare Worker (agile-spasso-api)  ──►  KV agile-spasso-storage  (1 chave: "documento" = { version, data })
Cloudflare Pages (agile-spasso.pages.dev)  ──►  serve o HTML estático
```

- **Uma** peça de backend (o Worker, ~30 linhas), criada uma vez e esquecida.
- O nome do autor fica no navegador (`localStorage`); cada ação carimba autor + data/hora.
- Concorrência resolvida por **número de versão** (sem tempo real).

---

## 3. Modelo de dados (JSON)

O KV guarda **um envelope** com versão, e dentro dele o documento:

```json
{
  "version": 12,
  "data": {
    "docTitle": "...", "docSub": "...", "activeView": "sprints",
    "lastEditedBy": "Edu", "lastEditedTs": "2026-07-14T10:30:00Z",
    "sections": [
      { "id": "...", "title": "...", "subtitle": "...", "intro": "...",
        "items": [
          { "id": "...", "status": "N", "confirm": false, "done": false,
            "text": "...",
            "sprintId": null,
            "urgency": "media",
            "pendingResolved": false,
            "notes": [
              { "id": "...", "author": "Maely", "ts": "...", "text": "..." }
            ] }
        ] }
    ],
    "abas": [ { "id": "...", "name": "...", "status": "...", "tipo": "...",
               "coveredBy": ["sec-id"], "papel": "..." } ],
    "footNote": "...",
    "pendingItems": [
      { "id": "...", "origin": "standalone", "title": "...", "description": "...",
        "author": "...", "createdAt": "...", "status": "open", "urgency": "alta" }
    ],
    "sprints": [
      { "id": "...", "name": "Sprint 1", "goal": "...", "start": "...",
        "end": "...", "status": "active" }
    ]
  }
}
```

**Notas:** `notes` é lista de entradas autoradas (não mais texto solto). Notas antigas em formato texto migram automaticamente para uma entrada única no `normalize()`, com timestamp de época (para ordenar como as mais antigas).

**Pendências:** duas origens numa lista só. Itens do backlog com `confirm===true` aparecem derivados (não duplicados em `pendingItems`); resolver marca `pendingResolved=true` e limpa `confirm`, mas o item **continua no histórico** — só sai da visão padrão (que mostra apenas as abertas) até alguém pedir "mostrar tudo". Entradas avulsas vivem de fato em `pendingItems[]`. Urgência (`baixa`/`media`/`alta`) existe nas duas origens.

**Sprints:** `sprintId` no item aponta pro sprint; ao deletar um sprint, os itens ligados voltam a `sprintId: null` — nunca ficam com referência quebrada.

Guardar o documento inteiro como **um JSON** (em vez de normalizar em tabelas) continua sendo a escolha certa para um time de 3–5 pessoas. Normalizar só se a edição simultânea doer de verdade — não antes.

---

## 4. O Worker (persistência + concorrência)

Já implementado e publicado como `agile-spasso-api`, com o KV vinculado como `DOC` (namespace `agile-spasso-storage`).

```js
const KEY = "documento";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS });

    if (request.method === "GET") {
      const raw = await env.DOC.get(KEY);
      return json(raw || JSON.stringify({ version: 0, data: null }));
    }

    if (request.method === "POST") {
      const incoming = await request.json();            // { version, data }
      const cur = JSON.parse((await env.DOC.get(KEY)) || '{"version":0}');
      if (incoming.version !== cur.version)
        return json(JSON.stringify({ error: "conflict", current: cur }), 409);
      const next = { version: cur.version + 1, data: incoming.data };
      await env.DOC.put(KEY, JSON.stringify(next));
      return json(JSON.stringify(next));
    }

    return new Response("Method not allowed", { status: 405, headers: CORS });
  },
};

function json(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
```

**Concorrência (otimista):** quem grava manda a versão que tinha. Se o servidor já está numa versão mais nova (alguém salvou antes), retorna **409**. O cliente avisa e pede para recarregar. Simples e suficiente.

---

## 5. Ajuste no HTML (Fase 0 — concluída)

`index.html` salva via `fetch` no Worker (`https://agile-spasso.mesaagro.workers.dev`) e guarda o nome do autor em `localStorage`. O debounce de salvamento e a checagem de versão seguem a mesma lógica descrita originalmente:

```js
const API = "https://agile-spasso.mesaagro.workers.dev";
let docVersion = 0;

let author = localStorage.getItem("autor");
if (!author) { author = (prompt("Seu nome:") || "").trim(); localStorage.setItem("autor", author); }

async function load() {
  const { version, data } = await (await fetch(API + "/doc")).json();
  docVersion = version;
  state = data || defaultState();
}

async function save() {
  state.lastEditedBy = author; state.lastEditedTs = new Date().toISOString();
  const r = await fetch(API + "/doc", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: docVersion, data: state }),
  });
  if (r.status === 409) { alert("Alguém salvou antes de você. Recarregue a página."); return; }
  docVersion = (await r.json()).version;
}
```

---

## 6. Passo a passo de setup (Cloudflare) — já executado

1. Conta Cloudflare (Spasso).
2. **KV namespace:** `agile-spasso-storage`.
3. **Worker:** `agile-spasso-api`, código da seção 4.
4. **Binding:** `DOC` → `agile-spasso-storage`.
5. Testado: `GET /doc` retorna `{"version":0,"data":null}` antes do primeiro save.
6. HTML (`index.html`) ajustado com a URL real do Worker.
7. **Cloudflare Pages** conectado ao repositório GitHub `eduardopfranca/agile_spasso`, branch `main`. Cada push publica automaticamente.
8. Link publicado: **`agile-spasso.pages.dev`**.

---

## 7. Fases

**Fase 0 — Base no ar. ✅ Concluída.** Worker + KV + Pages; persistência real; nome do autor.

**Fase 1 — Notas autoradas + Pendências. ✅ Concluída.** `notes` é lista de entradas autoradas com histórico. Visão **Itens Pendentes** consolidando o `(!)` do backlog com entradas avulsas, com estado aberta/resolvida preservando histórico (visão padrão mostra só as abertas) e classificação de **urgência** (baixa/média/alta) — este último item não estava no escopo original desta fase e foi adicionado durante a implementação.

**Fase 2 — Sprints. ✅ Concluída.** Sprints com nome, objetivo, datas e status. Cada item do backlog pode ser levado a um sprint (`sprintId`), com badge clicável de volta e para a frente. A visão *Sprints* mostra os itens levados (os mesmos objetos do Backlog, não cópias) com progresso (X/Y concluídos).

**Adicional — Retrospectivas. ✅ Concluída (fora do escopo original das Fases 1–3).** Aba somente-leitura que renderiza arquivos Markdown de `retrospectives/YYYYMMDD.md` direto do GitHub (API pública, sem autenticação), com data em formato brasileiro por extenso e a entrada mais recente expandida por padrão. Adicionar uma retrospectiva é só commitar um novo arquivo — sem UI de criação no app, por design (garante que só quem tem acesso ao repositório escreve retrospectivas).

**Adicional — Visão Geral. ✅ Concluída (fora do escopo original das Fases 1–3).** Primeira aba, somente-leitura: KPIs do projeto, linha do tempo dos sprints (altura da barra proporcional às horas estimadas, cor por status, marcador de "hoje"), lista de marcos e esforço por frente. Não guarda nada — cada número é derivado do documento a cada render pelas funções já existentes (`itemProgress`, `assignedItems`), sem campo novo no JSON e sem `save()`. Sprints e seções sem estimativa de horas são sinalizados como tal em vez de aparecerem como zero.

**Fase 3 — Só se precisar.** Feed de atividade "quem fez o quê" consolidado; **Cloudflare Access** (login por e-mail) se quiser trancar o acesso; normalizar dados em tabelas se a concorrência doer. Nada disto de forma preventiva — segue não implementado, por decisão consciente.

---

## 8. Segurança e limites (honesto)

- Sem login, **qualquer um com o link edita**, e os nomes são autodeclarados. Para uso interno, tudo bem.
- O endpoint do Worker é público. Se um dia precisar trancar: **Cloudflare Access** protege tanto o Pages quanto o Worker por e-mail, sem reescrever nada.
- Concorrência é otimista (aviso de versão), não colaboração em tempo real. Para poucos editores, é o suficiente.
- CORS está aberto (`*`) para simplificar; depois dá para restringir ao domínio do Pages.
- Retrospectivas usa a API pública do GitHub sem autenticação (limite de 60 requisições/hora); o app busca uma vez por carregamento de página e mantém em cache na memória, evitando reconsultas a cada renderização.

---

## 9. Checklist de execução

- [x] Conta Cloudflare criada
- [x] KV namespace `agile-spasso-storage`
- [x] Worker `agile-spasso-api` publicado + binding `DOC`
- [x] `GET /doc` respondendo
- [x] HTML ajustado (persistência + nome) com a URL do Worker
- [x] Repositório conectado ao Cloudflare Pages
- [x] Link publicado (`agile-spasso.pages.dev`) e testado
- [x] Fase 1 — notas autoradas + pendências (com urgência)
- [x] Fase 2 — sprints
- [x] Retrospectivas (adicional)
- [x] Visão Geral (adicional)
- [ ] Fase 3 — não iniciada (por decisão consciente, não pendência)

## Future: AI assistant (not scheduled)

A chat panel inside the platform, able to answer questions about the document and,
eventually, to mutate it. Recorded here as a design intention — no implementation planned.

### Design constraints (agreed 2026-07-24)

- **The API key never reaches the client.** A new Worker endpoint (`POST /ai`) holds the
  Anthropic key as a secret, receives the question, attaches the current JSON document
  (small enough to fit whole in context) and calls the API. `index.html` only talks to
  the Worker.
- **The endpoint requires authentication.** The platform has no login, so `/ai` would
  otherwise be an open door to burning API credit. Minimum viable: a shared password,
  configured as a Worker secret, requested when the user opens the AI panel and sent
  with each `/ai` call. This authentication exists only for the AI feature; the rest of
  the platform stays login-free.
- **Read-only first.** Phase 1 answers questions ("what is today's priority in the
  active sprint?") and writes nothing. Mutation via chat only ships if phase 1 proves
  real usage.
- **The model never writes the document.** If mutation is ever built, the model returns
  structured commands (e.g. `{"op": "move_item", ...}`) that the app validates, previews
  to the user for confirmation, and applies through the existing state-mutation paths
  and `save()` — going through optimistic concurrency like any other edit. Same
  dry-run → approve → apply pattern used by the 2026-07-24 document reconciliation script.

### Deliberately out of scope

Chat as a substitute for operations the UI already does well (moving a task is a drag).
The value is reasoning over the document — prioritization, distribution of new backlog
across sprints — not command entry. A zero-cost alternative remains available meanwhile:
a "copy context" button exporting the document to the clipboard for use in any Claude.

## Future: decision links and traceability (not scheduled)

Meeting decisions (`meetings[].decisions`) become traceable entities. Recorded as a design
intention with the constraints agreed on 2026-07-24 — no implementation planned.

### Design constraints (agreed 2026-07-24)

- **Decisions gain `links: [{type, id}]`**, pointing at items, sprints, milestones, pending
  items or other decisions. Chips render with live-resolved labels, following the
  `noteTargetLabel()` pattern.
- **"Superseded" is derived, never manual.** If D2 links D1 with a "supersedes" relation,
  D1 renders a superseded badge automatically, naming its successor.
- **Completion is optional and preferably derived.** Not every decision requires completion.
  When a decision links a task or sprint whose conclusion fulfils it, the done state derives
  from that entity's progress; a manual check exists only for decisions with no such link.
- **History view:** from a decision, show outgoing links, incoming links (who references or
  superseded it, across all meetings) and the chronological chain of superseding decisions.
- **A dedicated Decisões tab** (aggregating all decisions across meetings, filterable by
  status, in the mould of the Notas tab) is the candidate surface for this — to be weighed
  against an inline expandable panel per decision card when implementation starts.
- **Deleted link targets are kept with a fallback label** ("(removido)"), never pruned in
  `normalize()` — pruning would erase exactly the trail this feature exists to preserve.
- Model changes follow the DATA_MODEL.md recipe: creation literal, defensive backfill in
  `normalize()`, `toMarkdown()`, delete-handler cascades.

### Companion workflow (no code)

Raw meeting transcripts live in `meetings/` at the repo root, gitignored (private to the
author's machine). Distilled points enter the platform through the Reuniões tab — decisions
into `decisions`, forward-looking items into `agenda` — and, when applicable, become backlog
tasks or pending items. The distillation is assisted by Claude from the transcript.