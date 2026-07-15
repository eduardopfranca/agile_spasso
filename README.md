# agile_spasso

Internal agile tracker for the Spasso hedge project: backlog, sprints, pending items, and retrospectives, in a single shared, persisted page.

## Views

- **Sprints** (default view) — sprint cards with goal, dates, status, progress, and assigned backlog items
- **Backlog** — the task backlog, grouped by section, with status, external-pending flag, and sprint assignment
- **Mapa da Planilha** — mapping of the legacy spreadsheet tabs to backlog items/sections, tracking what can be retired
- **Itens Pendentes** — consolidated view of everything blocked on someone else: backlog items flagged as external-pending, plus standalone pending entries, each with an urgency tag
- **Retrospectivas** — read-only, renders Markdown files from `retrospectives/` (see below)

## Structure

- `index.html` — the platform (static frontend, no build step)
- `src/index.js` — Cloudflare Worker that persists the shared document in KV
- `wrangler.jsonc` — Worker configuration
- `docs/` — project documents (backlog mapping, spreadsheet mapping, platform plan)
- `retrospectives/` — one Markdown file per work session, named `YYYYMMDD.md`; read live by the Retrospectivas tab via the public GitHub API. Adding an entry means committing a new file here — there's no in-app "add" button by design.

## Deploy

- **Frontend:** Cloudflare Pages, connected to this repository (`main` branch auto-deploys)
- **Backend:** Cloudflare Worker (`agile-spasso-api`) + KV namespace (`agile-spasso-storage`)
- Persistence uses optimistic concurrency (a version number checked on every save) — no login, no real-time collaboration. Author identity is just a name typed once and stored in the browser.
