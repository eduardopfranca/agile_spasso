# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Single-file agile tracking platform (`index.html`). No build step, no framework, no package
manager. SortableJS and marked.js are loaded from CDN. Shared state is one JSON document
persisted to a Cloudflare Worker (`GET/POST /doc`) with optimistic concurrency.

## Hard rules

- **Everything lives in `index.html`.** Do not split into modules, do not introduce a build
  step, do not add dependencies.
- **Never call `save()` without mutating state first**, and never mutate state without calling
  `save()`. Every change must persist.
- **Do not touch the persistence pipeline** (`save`, `doSave`, version handling) unless the
  task explicitly asks for it.
- **Browser storage is off limits** except for the author name already in `localStorage`.

## Conventions

- Identifiers, comments and commit messages in English. Interface text in Portuguese.
- Rendering follows one pattern: a `*HTML()` function builds the markup, a `render*()`
  function injects it and rewires listeners. Follow it.
- Event handling is delegated per container, and DOM lookups after a re-render must be scoped
  to `e.currentTarget` — never `document.querySelector`. Hidden tabs remain in the DOM, so a
  global lookup returns the wrong instance.
- Sortable instances carry a marker property (`_bl`, `_mc`, `_st`, `_si`, `_pd`) and are
  destroyed and recreated on every render.
- `normalize()` backfills missing fields on load. Any new field must be backfilled there,
  defensively, without overwriting existing data.
- Transient UI state (expanded, collapsed) lives in in-memory `Set`s, never in the document.

## Notes

Notes are centralized in `state.notes[]`, each carrying `target: {type, id, label}`. Any new
target type must be handled in `noteTargetLabel()`, which resolves labels live rather than
from the stored snapshot. Deleting an entity must also delete its notes.

## Purpose-specific files

### Retrospectives

`retrospectives/YYYYMMDD.md` — one per working day, in Portuguese, read by the app's
Retrospectivas tab through the GitHub API.

**Read `docs/RETROSPECTIVE_GUIDE.md` before writing or editing one.** The guide defines a closed
set of sections and a specific register. Two rules that are violated most often:

- The section list is fixed. Never add a section, never fill an empty one with filler — omit it.
- Feedback about length means compressing prose, never dropping facts. A day with six deliveries
  still has six deliveries after the edit.

Do not create a retrospective unless explicitly asked. Do not reconstruct past days.

### Documentation

`docs/` is in English, except `RETROSPECTIVE_GUIDE.md`, which is in Portuguese by design.
When a change alters architecture, update `PLANO_PLATAFORMA_AGILE.md` in the same task.

## Before finishing

- Check the JavaScript parses and no `el(...)` lookup points to a missing element.
- Confirm no duplicate element ids were introduced.
- State what changed and why. Do not commit.