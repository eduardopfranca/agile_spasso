# Agile Mesa Spasso

Internal agile tracking platform for the Mesa Integrada de Hedge project (Grupo Spasso).

**Live:** https://agile-spasso.pages.dev

## What it is

A single-file web application — no build step, no framework. State lives in one shared JSON
document persisted to a Cloudflare Worker backed by KV. No authentication: users identify
themselves by typing a name, stored in `localStorage`. Concurrent edits are guarded by
optimistic concurrency (version number, HTTP 409 on conflict).

## Tabs

| Tab | Purpose |
|---|---|
| Visão Geral | Read-only overview: KPIs, sprint timeline, milestones and effort per backlog section, all derived per render |
| Sprints | Weekly sprints with assigned tasks, progress and estimated hours |
| Backlog | Project tasks grouped in sections, ordered by logical dependency |
| Marcos | Milestones that make progress legible to non-technical stakeholders |
| Mapa da Planilha | Markdown document mapping the spreadsheet the app replaces |
| Itens Pendentes | External blockers, each with responsibles, linked to backlog items |
| Notas | Every note in the document, with a live-resolved address |
| Reuniões | Weekly meetings: agenda, lessons, decisions, observations |
| Retrospectivas | Read-only, fetched from `retrospectives/` via the GitHub API |

## Structure

```
index.html              the entire application
src/index.js            Cloudflare Worker that persists the shared document in KV
wrangler.jsonc          Worker configuration
docs/
  RETROSPECTIVE_GUIDE.md   template and register for retrospectives
  PLANO_PLATAFORMA_AGILE.md architecture decisions
  DATA_MODEL.md            shape of the shared JSON document
retrospectives/
  YYYYMMDD.md              daily retrospectives, rendered in the app
```

## Infrastructure

- **Hosting:** Cloudflare Pages, auto-deploy on push to `main`
- **API:** Cloudflare Worker `agile-spasso-api` — `GET/POST /doc`
- **Storage:** KV namespace `agile-spasso-storage`, binding `DOC`, key `documento`
- **Repository:** `eduardopfranca/agile_spasso`

## Development

Edit `index.html` and open it locally — it reads from the production API, so local code
runs against live data. Push to `main` to deploy.

```bash
git add index.html
git commit -m "..."
git push origin main
```

## Conventions

- Code, identifiers, comments and documentation in English; interface text in Portuguese.
- No dependencies beyond SortableJS and marked.js, both via CDN.
- Browser storage is limited to the author's name; all shared state goes through the Worker.

## Purpose-specific files

### `retrospectives/YYYYMMDD.md`

One retrospective per working day, written in Portuguese, rendered read-only in the app's
Retrospectivas tab (fetched from GitHub at page load). The filename format is load-bearing —
the tab parses the date from it. Adding an entry means committing a new file here — there is
no in-app "add" button by design.

Writing follows `docs/RETROSPECTIVE_GUIDE.md`: a closed set of sections, terse register, past
participle for technical actions. Read the guide before writing one.

### `docs/`

| File | Purpose |
|---|---|
| `RETROSPECTIVE_GUIDE.md` | Template and register for retrospectives |
| `PLANO_PLATAFORMA_AGILE.md` | Architecture decisions and their rationale |
| `DATA_MODEL.md` | Shape and invariants of the shared JSON document |

Documentation is in English, with one deliberate exception: `RETROSPECTIVE_GUIDE.md` is in
Portuguese, since it governs Portuguese writing and its examples of register only work in the
language they describe.
