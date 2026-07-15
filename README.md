# agile-spasso

Internal agile tracker (backlog, sprints, and pending decisions) for the Spasso hedge project.

## Structure

- `docs/` — project documents (backlog, spreadsheet mapping, planning)
- `src/index.js` — Cloudflare Worker that persists the document in KV
- `documento_projeto.html` — the platform (static frontend)
- `wrangler.jsonc` — Worker configuration

## Deploy

- **Frontend:** Cloudflare Pages, connected to this repository
- **Backend:** Cloudflare Worker (`agile-spasso-api`) + KV (`agile-spasso-storage`)