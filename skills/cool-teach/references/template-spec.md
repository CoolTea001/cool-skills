<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Template Spec — `assets/template.html` + `style.css` + `app.js` + `lessons/*.js` → `.coolteach/courses/<slug>/preview.html`

> Light HTML preview (open via `file://`) that references shared `../../assets/style.css` and `../../assets/app.js`, plus `window.__COURSE__` and `lessons/*.js` (`window.__LESSONS__`). The fixed template is the only HTML author.

## Source vs Generated

```
skills/cool-teach/assets/
├── template.html          # fixed HTML shell (single truth)
├── style.css              # shared fixed stylesheet
└── app.js                 # shared fixed script
  ↓  copy assets once + inline course + embed lessons
.coolteach/
├── assets/
│   ├── style.css          # copied from skills
│   └── app.js
└── courses/<slug>/
    ├── preview.html        # light shell that refs ../../assets/* + ./lessons/*.js (file:// open)
    └── lessons/*.js        # each pushes to window.__LESSONS__
```

- Never hand-edit `preview.html` or `.coolteach/assets/*`; regenerate from the skills template to keep styles consistent.
- `preview.html` is derived; `course.json` + `lessons/*.js` are the source of truth. Shared assets are copied once to `.coolteach/assets/` during init.

## Generation

1. Read `courses/<slug>/course.json` and all `lessons/*.js` (sorted). Each `*.js` is `window.__LESSONS__.push({...})` — validate the pushed object against `references/lesson-format.md`.
2. Optionally pre-render `body` Markdown to `bodyHtml` (recommended for fidelity). If `bodyHtml` is empty, the template's tiny parser renders `body` as fallback.
3. Generate `preview.html` from `assets/template.html`:
   - Inline course once: `<script>window.__COURSE__ = <JSON>;</script>` (use `JSON.stringify` and escape `</script>`).
   - Embed lessons in order: one `<script src="./lessons/NNNN-*.js"></script>` per lesson (sorted), then `../../assets/app.js`. No `data.js` aggregation — each lesson JS is directly referenced (still `file://` safe via `<script src>`).
   - Keep `course.json` / `lessons/*.js` as source of truth on disk; `preview.html` is derived.

## Display

- Header: course title + description + progress bar (`done / total` + fill).
- Sidebar: lesson nav (number, title, task count), active highlight via scroll-spy, checkmark when all tasks in that lesson are answered.
- Main: lesson cards in order — head (kicker/id/slug/title/summary/tags), body (`prose` with headings/lists/tables/code/blockquote), tasks.

## Task Interaction (Frozen 4 Types)

The template JS implements exactly `choice` / `multi` / `truefalse` / `steps`. Any other `type` renders as a non-breaking error card (`Invalid task: invalid type`) and does not crash the page.

- `choice`: single radio, one `answer` index.
- `multi`: checkboxes, `answer` is sorted `number[]` (all and only correct).
- `truefalse`: `True` / `False` radios, `answer` is `boolean`.
- `steps`: checklist; completed when **all** steps checked.

Behavior:
- Options are clickable rows with custom radio/checkbox visuals.
- `Check` validates selection, compares strictly, shows `correct` (green) or `wrong` (red) feedback with `explain`, highlights correct options, disables further changes until `Reset`.
- `Reset` clears `localStorage` for that task and re-renders it.
- Strict validation: out-of-range indices, empty arrays, wrong types → error card.
- Idempotent: re-checking does not double-count.

## Persistence

- In-memory `state.tasks: { [taskId]: { answered:boolean, correct:boolean, selected:number|number[]|boolean, at:string } }`.
- Synced to `localStorage: coolteach:<slug>` on every check/reset. Survives `file://` refresh.
- `progress.json` on disk is updated only by the agent; the HTML's local edits are not written back to disk automatically (no File System Access API required for `file://`).

## Styling

- Dark mode default: `<html class="dark">`, `theme-color #020420`.
- Design tokens from `DESIGN.md`: `--color-green-400 #00DC82`, `--ui-bg #020420`, slate neutrals, `Public Sans`, `--ui-radius 0.5rem`.
- CSS lives in `.coolteach/assets/style.css` (copied from `skills/cool-teach/assets/style.css`); no external font fetch (fallbacks to system fonts). `preview.html` loads it via `<link rel="stylesheet" href="../../assets/style.css">` — still `file://` safe.
- Responsive: sidebar collapses below 900px; print styles hide controls.

## Error Resilience

- Missing/invalid `window.__COURSE__` / `window.__LESSONS__` → fallback to `{course:{}, lessons:[]}` + empty state message.
- Invalid task → error card with reason, other tasks still render.
- No lessons → empty placeholder: `No lessons yet. Run /cool-teach add-lesson <slug>` (lessons are `*.js`).

## How to Open

```bash
# macOS
open .coolteach/courses/<slug>/preview.html
# Linux
xdg-open .coolteach/courses/<slug>/preview.html
# Windows
start .coolteach/courses/<slug>/preview.html
# Optional local server
python3 -m http.server 9321 --directory .coolteach/courses/<slug>
# then http://localhost:9321/preview.html
```

## Regeneration

Whenever a lesson is added/edited or `course.json` changes, regenerate:

```bash
# ensure shared assets exist (once)
mkdir -p .coolteach/assets
cp skills/cool-teach/assets/style.css .coolteach/assets/style.css
cp skills/cool-teach/assets/app.js     .coolteach/assets/app.js
# read course.json + lessons/*.js -> generate preview.html
# preview.html: inline window.__COURSE__ + <script src="./lessons/*.js"> per lesson + app.js
```

The agent does the generation atomically via `write` (full file replace), not `edit`.
