# Data Model

The entire application state is a single JSON document, persisted to the Cloudflare Worker
(`GET/POST /doc`) and guarded by optimistic concurrency. This file describes its shape.

**`normalize()` in `index.html` is the authority.** It runs on every load and backfills missing
fields. When this document and `normalize()` disagree, `normalize()` is right and this file is
stale — fix it.

## Root

```js
{
  docTitle: string,            // drives document.title
  docSub: string,
  activeView: string,          // id of the active tab, persisted across sessions
  footNote: string,            // free text under the Backlog
  sections: Section[],
  notes: Note[],
  sheetMappingDoc: string,     // markdown, rendered in the Mapa da Planilha tab
  sprints: Sprint[],
  pendingItems: PendingItem[],
  milestones: Milestone[],
  meetings: Meeting[],
  lastEditedBy: string,        // written by doSave()
  lastEditedTs: string         // ISO, written by doSave()
}
```

## Section

```js
{ id, title, subtitle, intro, items: Item[] }
```

Order is meaningful — sections and items are drag-reordered, and the array order is the display
order. `rebuildBacklogFromDOM()` rewrites both arrays from the DOM after a drag.

## Item

```js
{
  id: string,
  status: '' | 'E' | 'A' | 'N' | 'P',
  progressType: null | 'check' | 'subtasks' | 'percent',
  done: boolean,               // only meaningful when progressType === 'check'
  subtasks: Subtask[],         // only meaningful when progressType === 'subtasks'
  percent: number,             // 0–100, only meaningful when progressType === 'percent'
  text: string,
  sprintId: string | null,     // → Sprint.id
  sprintOrder: number | null,  // position within the sprint, independent of backlog order
  blockedBy: string[],         // → PendingItem.id
  estimatedHours: number | null
}
```

`progressType` is **immutable once set**, with a single exception: `'check'` → `'subtasks'`, and
only while the item is not done (`done === false`). It exists for the item registered early as a
generic checkbox and structured later; the conversion resets `done` to `false` and `subtasks` to
`[]`, and is one-way — nothing converts back, and no other pair of types converts at all. The
control (`canConvertToSubtasks()`) renders on the card only while the item is eligible.

`null` means the item was just created and is locked — every other control is disabled until a
type is chosen. Seeded items start as `'check'`; user-created items start as `null`.

```js
Subtask = { id, text, done }
```

## Note

Every note in the application lives in the single top-level `notes` array. Nothing is nested.

```js
{
  id, author, ts,              // ts is ISO
  text: string,
  target: { type, id, label }
}
```

`target.type` is one of:

| type | `target.id` |
|---|---|
| `item` | Item.id |
| `section` | Section.id |
| `sprint` | Sprint.id |
| `milestone` | Milestone.id |
| `pending` | PendingItem.id |
| `note` | Note.id (a reply) |
| `doc` | fixed string `'sheet-mapping-doc'` |

`target.label` is a snapshot taken at creation. It is **only a fallback for deleted targets** —
`noteTargetLabel()` resolves the label live from the current entity, so renaming a sprint updates
every note address that points at it.

**Any new target type must be handled in `noteTargetLabel()`**, or the note renders with a broken
address in the Notas tab.

Replies (`type: 'note'`) nest structurally at any depth but render flattened one level deep, sorted
chronologically. `noteDescendants()` collects the whole subtree.

## Sprint

```js
{
  id,
  number: string,              // free text: '4', '4b', '4c'
  name, goal,
  start: 'YYYY-MM-DD',
  end: 'YYYY-MM-DD',
  status: 'planned' | 'active' | 'done'
}
```

`number` is a **display label, never a sort key or identity** — the list is ordered by `start`.
It is free text so a sprint inserted mid-timeline can be `4b` without renumbering the ones after
it and breaking references written elsewhere.

Setting `status` to `'done'` completes every milestone pointing at the sprint. This is a one-time
side effect at the moment of the change, not a derived value: unchecking a milestone afterwards
sticks, and moving the sprint away from `'done'` uncompletes nothing.

## PendingItem

```js
{
  id, title, description,
  author: string,              // who created it
  responsible: string[],       // tags — people, teams, companies, vendors
  createdAt: string,           // ISO
  status: 'open' | 'resolved',
  urgency: 'baixa' | 'media' | 'alta'
}
```

A pending item is a **first-class entity**, created only in its own tab. Backlog items point at it
through `blockedBy`, so one pending item blocks many items and resolving it clears them all at
once. Array order is the display order (manual, drag-reordered — no automatic sort).

`responsible` is required by convention: an empty array renders a warning, but nothing blocks
saving.

## Milestone

```js
{ id, title, description, completed: boolean, sprintId: string | null }
```

`sprintId` is informational — it drives the completion cascade described under Sprint and renders
the milestone chip on the sprint card. Array order is the display order.

## Meeting

```js
{
  id, title,
  date: 'YYYY-MM-DD',
  agenda: Entry[],
  lessons: Entry[],
  decisions: Entry[],
  observations: Entry[]
}

Entry = { id, author, ts, text, done? }
```

The four block names are `MEETING_BLOCKS`, and they are rendered through one shared path
parameterized by kind — only labels and hints differ. `done` exists **only on `agenda` entries**.

Cards are sorted by `date` descending, so a meeting scheduled ahead floats to the top and carries
a "próxima" badge.

## Derived values — never stored

Computed on every render. Do not persist them, do not cache them in the document.

| Value | Function |
|---|---|
| Item progress (0–100) | `itemProgress(it)` |
| Item blocked state | `itemBlockState(it)` → `'none' \| 'open' \| 'resolved'` |
| Item's blockers, resolved | `itemBlockers(it)` — filters out dead ids |
| Sprint's tasks, ordered | `assignedItems(sprintId)` — sorted by `sprintOrder` |
| Sprint progress | average of `itemProgress()` across assigned items |
| Note address | `noteTargetLabel(target)` |

## Transient state — never persisted

In-memory only, reset on reload. Keeping any of this in the document would leak one user's UI
state to everyone else.

`collapsedSections`, `collapsedItems`, `expandedSprints`, `expandedMeetings`, `expandedRetros`
(all `Set`s), `replyingToNoteId`, `sheetDocEditing`, and the filter flags held as `body` classes
(`filtering`, `pendingShowAll`, `notesOnlyReplies`).

The author name is the one exception to "nothing in browser storage" — it lives in
`localStorage` under `autor`.

## Referential integrity

There are no foreign keys. Deletion cascades are manual, and each delete handler owns its cleanup.

| Deleting | Must also clear |
|---|---|
| Item | its notes |
| Section | notes of all its items |
| Milestone | its notes |
| PendingItem | its notes, and its id from every `item.blockedBy` |
| Sprint | `item.sprintId` on its items |

`normalize()` provides one defensive net: it prunes `blockedBy` entries pointing at pending items
that no longer exist. Nothing else is repaired on load.

**Known gap:** deleting a sprint does not clear `milestone.sprintId`, orphaned sprint notes, or
stale `sprintOrder`. Nothing crashes — `noteTargetLabel()` falls back to "(sprint removido)" and
the milestone dropdown shows "sem sprint" — but the dead id stays in the document.

## Adding a field

1. Add it to the entity's creation literal (`mkItems`, `addSprint`, `addPendingItem`, …).
2. Backfill it in `normalize()`, defensively, without overwriting existing values.
3. If it is a new note target, handle it in `noteTargetLabel()`.
4. If it should appear in the export, add it to `toMarkdown()`.
5. If deleting the entity should clean something up, add it to the delete handler.

Steps 2 and 5 are the ones that get forgotten.
