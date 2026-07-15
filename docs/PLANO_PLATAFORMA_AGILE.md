# Plano — Plataforma de Acompanhamento Ágil (deploy)

> Transformar o documento interativo (backlog + mapa) numa página web compartilhada, com persistência real e autoria por nome. Sem login, sem senha, sem over-engineering.

---

## 1. Objetivo e escopo

**É:** o backlog + mapa que já existem, agora **compartilhados** (todos veem o mesmo estado), com **nome do autor** carimbado em cada nota/ação, mais **pendências** e **sprints**. Acompanhamento ágil interno.

**Não é:** login/senha, papéis/permissões, tempo real, notificações, kanban sofisticado. Nome digitado = confiança do time.

**Stack:** hospedagem no **Cloudflare Pages**, persistência em **Cloudflare Worker + KV**. Tudo no plano grátis, isolado do Supabase (que está lotado).

---

## 2. Arquitetura

```
Navegador (o HTML de hoje, ajustado)
   │  GET  /doc  → lê o JSON do documento
   │  POST /doc  → grava (com checagem de versão)
   ▼
Cloudflare Worker  ──►  KV  (1 chave: "documento" = { version, data })
Cloudflare Pages   ──►  serve o HTML estático
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
    "docTitle": "...", "docSub": "...", "activeView": "backlog",
    "lastEditedBy": "Edu", "lastEditedTs": "2026-07-14T10:30:00Z",
    "sections": [
      { "id": "...", "title": "...", "subtitle": "...", "intro": "...",
        "items": [
          { "id": "...", "status": "N", "confirm": false, "done": false,
            "text": "...",
            "sprintId": null,                       // Fase 2: a qual sprint foi levado
            "notes": [                              // Fase 1: notas autoradas
              { "author": "Maely", "ts": "...", "text": "..." }
            ] }
        ] }
    ],
    "abas": [ { "id": "...", "name": "...", "status": "...", "tipo": "...",
               "coveredBy": ["sec-id"], "papel": "..." } ],
    "footNote": "...",
    "pendencias": [                                 // Fase 1
      { "id": "...", "title": "...", "desc": "...", "author": "...",
        "ts": "...", "status": "aberta" }
    ],
    "sprints": [                                    // Fase 2
      { "id": "...", "name": "Sprint 1", "goal": "...", "start": "...",
        "end": "...", "status": "ativo" }
    ]
  }
}
```

**Mudança em relação ao doc atual:** `notes` deixa de ser texto e vira **lista de entradas autoradas**. Na primeira carga, uma nota antiga (string) é convertida em uma entrada `{author:"—", ts:now, text:<string>}`. Os campos `pendencias`, `sprints` e `sprintId` entram nas Fases 1–2; até lá, ficam vazios.

Guardar o documento inteiro como **um JSON** (em vez de normalizar em tabelas) é a escolha certa para um time de 3–5 pessoas. Normalizar só se a edição simultânea doer de verdade — não antes.

---

## 4. O Worker (persistência + concorrência)

Código completo, pronto pra colar. Binding do KV chamado `DOC`.

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

**Concorrência (otimista):** quem grava manda a versão que tinha. Se o servidor já está numa versão mais nova (alguém salvou antes), retorna **409**. O cliente então avisa: *"O [Fulano] salvou antes de você — recarregue para pegar a versão atual."* Simples e suficiente.

---

## 5. Ajuste no HTML (Fase 0 — obrigatório)

O HTML atual salva via `window.storage`, que **só existe no ambiente de artifact do Claude**. Numa página real, isso não existe. Troca-se por `fetch` ao Worker + `localStorage` para o nome.

```js
const API = "https://SEU-WORKER.SEU-SUBDOMINIO.workers.dev";
let docVersion = 0;

// nome do autor (uma vez por navegador)
let author = localStorage.getItem("autor");
if (!author) { author = (prompt("Seu nome:") || "").trim(); localStorage.setItem("autor", author); }

async function loadRemote() {
  const { version, data } = await (await fetch(API + "/doc")).json();
  docVersion = version;
  state = data || defaultState();
}

async function saveRemote() {
  state.lastEditedBy = author; state.lastEditedTs = new Date().toISOString();
  const r = await fetch(API + "/doc", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: docVersion, data: state }),
  });
  if (r.status === 409) { alert("Alguém salvou antes de você. Recarregue a página."); return; }
  docVersion = (await r.json()).version;
}
```

`saveRemote()` entra no lugar do `save()` atual (mantendo o debounce). O resto do app — render, drag, tudo — não muda.

---

## 6. Passo a passo de setup (Cloudflare)

1. **Conta Cloudflare** (grátis).
2. **KV namespace:** painel → *Workers & Pages* → *KV* → *Create a namespace* (ex.: `documento-kv`).
3. **Worker:** *Workers & Pages* → *Create* → *Worker* → colar o código da seção 4 → *Deploy*. Anotar a URL (`...workers.dev`).
4. **Ligar o KV ao Worker:** no Worker → *Settings* → *Variables and Secrets* → *KV Namespace Bindings* → adicionar binding com nome **`DOC`** apontando para `documento-kv`. Re-deploy.
5. **Testar:** abrir `SUA-URL/doc` no navegador → deve retornar `{"version":0,"data":null}`.
6. **Ajustar o HTML:** aplicar a seção 5 (colar a URL do Worker no `API`).
7. **Publicar no Cloudflare Pages:** *Workers & Pages* → *Create* → *Pages* → conectar o repositório do GitHub (ou upload direto do arquivo). Cada push publica automaticamente. Sai um link `...pages.dev`.
8. **Pronto.** Compartilhar o link com o time. Cada pessoa digita o nome uma vez.

---

## 7. Fases

**Fase 0 — Base no ar.** Worker + KV + Pages; troca de `window.storage` por `fetch`; nome do autor. Ao fim disto, o app já é compartilhado e multiusuário. *(O grosso é wiring; a lógica do app não muda.)*

**Fase 1 — Notas autoradas + Pendências.** `notes` vira lista de entradas `{autor, data, texto}` (pequeno histórico por item). Nova visão simples de **Pendências** (título, descrição, autor, aberta/resolvida).

**Fase 2 — Sprints.** Criar sprints (nome, objetivo, datas, status). Botão **"levar pro sprint"** em cada item (define `sprintId`). Visão *Sprint* que agrupa os itens levados e mostra progresso (X/Y concluídos) — reaproveitando o `✓ concluído` que já existe.

**Fase 3 — Só se precisar.** Feed de atividade "quem fez o quê" consolidado; **Cloudflare Access** (login por e-mail) se quiser trancar o acesso; normalizar dados em tabelas se a concorrência doer. Nada disto de forma preventiva.

---

## 8. Segurança e limites (honesto)

- Sem login, **qualquer um com o link edita**, e os nomes são autodeclarados. Para uso interno, tudo bem.
- O endpoint do Worker é público. Se um dia precisar trancar: **Cloudflare Access** protege tanto o Pages quanto o Worker por e-mail, sem reescrever nada.
- Concorrência é otimista (aviso de versão), não colaboração em tempo real. Para poucos editores, é o suficiente.
- CORS está aberto (`*`) para simplificar; depois dá para restringir ao domínio do Pages.

---

## 9. Checklist de execução

- [ ] Conta Cloudflare criada
- [ ] KV namespace `documento-kv`
- [ ] Worker publicado + binding `DOC`
- [ ] `GET /doc` respondendo
- [ ] HTML ajustado (persistência + nome) com a URL do Worker
- [ ] Repositório conectado ao Cloudflare Pages
- [ ] Link publicado e testado com 2 pessoas
