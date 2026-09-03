---
name: cool-teach
version: 0.3.6
description: A teaching skill for multi-course learning workspaces (.coolteach) — creates courses, generates bite-sized lessons with validated tasks, and opens a local web preview using a fixed HTML template. Use when the user expresses a course-learning intent in natural language (e.g. "I want to learn SEO", "continue SEO", "list my courses", "open SEO"); a /cool-teach prefix is also accepted but not required.
---

# Cool Teach — Multi-Course Learning Workspace

> Trigger: natural language expressing a course-learning intent — no prefix required (a `/cool-teach` prefix is also accepted and means the same). Use LLM to classify the free-form intent. Examples: `I want to learn SEO` · `continue SEO` · `list my courses` · `open SEO course`

## Workspace Structure (Simplified)

All teaching state lives under the **user project root** (confirm with `pwd`, never the skill checkout path) in `.coolteach`:

```
.coolteach/
├── courses.json                 # global index
├── assets/
│   ├── style.css                # shared fixed stylesheet (from skills/cool-teach/assets/style.css)
│   └── app.js                   # shared fixed script (from skills/cool-teach/assets/app.js)
└── courses/<slug>/
    ├── course.json              # course metadata + mission (why/success/constraints)
    ├── preview.html             # light shell that references ../../assets/* + lessons/*.js (file:// open)
    └── lessons/
        ├── 0001-overview.js     # lesson JS (window.__LESSONS__.push({...title/summary/tags/body/tasks}))
        └── 0002-keywords.js
```

> `course.json:mission` is the single source of truth for the learning goal (see Workflow §3). Legacy `MISSION.md` files are tolerated if present but no longer created.

See `references/course-schema.md` and `references/lesson-format.md` for JSON/Markdown schemas.

## Workflow

### 1. Trigger & Parse

1. Trigger is **free-form natural language** expressing a course-learning intent — no prefix required. An optional `/cool-teach` prefix is accepted and equivalent (strip it before parsing). Use LLM to classify the intent:
   - **list** — e.g. `查看我有哪些课程` / `list my courses` / `有哪些课` → list all courses from `.coolteach/courses.json`.
   - **new** — e.g. `我想学习 SEO` / `I want to learn SEO` → create a new course (then run mission interview).
   - **continue / add-lesson** — e.g. `继续学习 SEO` / `continue SEO` → add a lesson to the matched existing course.
   - **preview / open** — e.g. `打开SEO课程` / `open SEO` → regenerate and open `preview.html` for the matched course.
   - **ambiguous / bare greeting** (no clear intent) → interactive: list courses, ask which to continue or whether to create a new one.
2. Extract the course topic/slug from the natural language via LLM (e.g. "SEO" → `seo`, "Rust CLI" → `rust-cli`). Confirm the derived slug with the user if ambiguous.
3. Only trigger on genuine course-learning intents (creating, continuing, listing, or opening courses). Unrelated chatter must not activate this skill.

### 2. Initialize `.coolteach`

At user project root (`pwd`):

```bash
mkdir -p .coolteach/courses .coolteach/assets
# ensure shared fixed assets exist (copy once)
cp skills/cool-teach/assets/style.css .coolteach/assets/style.css 2>/dev/null || true
cp skills/cool-teach/assets/app.js     .coolteach/assets/app.js     2>/dev/null || true
```

If `.coolteach/courses.json` does not exist, create:

```json
{ "version": 1, "generatedAt": "ISO-8601", "courses": [] }
```

Rules:
- Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 2–40 chars, lowercase kebab-case.
- Course dir: `.coolteach/courses/<slug>/`
- If index and course dir diverge, index is source of truth; repair missing dirs on next `list`.

### 3. Course Management

#### List

Read `.coolteach/courses.json` and print a table: `slug | title | lessons | status | updatedAt`.

#### New Course

> **Do not create a course without a mission interview.** The mission grounds all teaching; a bad mission produces abstract lessons with no zone of proximal development.

1. **Mission interview (blocking, must complete before any file write)** — Collect the mission via **sequential interactive interview, one question at a time**. If the user already stated a topic (e.g. `我想学习 SEO`), still interview before writing. For **each** question, call `ask_user_question` once with **3 default options plus custom input** (allow the user to pick an option or type their own answer). Wait for the answer before asking the next question.
   - **Q1 Why** — 1–3 sentences: the concrete real-world outcome when they have this skill (push for "so that …" not "to learn …"). Example options: `Bring sustainable organic traffic to my site and reduce paid-ads dependency` / `Ship a usable feature to my project` / `Solve a concrete bottleneck at work` + custom input.
   - **Q2 Success** — 2–3 observable things they will be able to do (e.g. "independently run keyword research → rewrite 1 page → get top-20"). Example options: `Independently complete a small real task end-to-end` / `Review and improve an existing page/project with a checklist` / `Read data and iterate continuously` + custom input.
   - **Q3 Constraints** — time budget (e.g. 1h/week), prior knowledge, preferences, scope limits. Example options: `1h/week, prefer hands-on over theory` / `2h/week, some basics, want quick wins` / `4h/week, want systematic depth` + custom input.
   - After the 3 answers, propose `title` (required), `description` (one-line summary of Why), and `slug` (derive from the natural-language topic/title) and confirm the 3 with the user (one more `ask_user_question`).
   - If any answer is vague, push back interactively: "What changes in your work/life when you can do this?" Do not accept "just want to understand X" as a mission.
2. Validate slug uniqueness against `courses.json` and format `^[a-z0-9]+(?:-[a-z0-9]+)*$` (2–40 chars).
3. Write `courses/<slug>/course.json` with embedded mission (no separate `MISSION.md`):
   ```json
   {
     "version": 1,
     "slug": "seo",
     "title": "SEO 实战：让独立站自然流量翻倍",
     "description": "从搜索引擎原理到关键词、内容与技术优化",
     "status": "active",
     "createdAt": "ISO-8601",
     "updatedAt": "ISO-8601",
     "mission": {
       "why": "为独立站带来可持续自然流量，降低付费依赖",
       "success": [
         "能独立完成关键词研究并筛选高价值词",
         "能完成1-2个页面的实战优化并进入前20"
       ],
       "constraints": [
         "每周1小时，偏实战少理论"
       ]
     }
   }
   ```
4. Ensure `courses/<slug>/lessons/` exists.
5. Append to `courses.json` and update `generatedAt`.
6. **Immediately generate the first lesson and preview (do not leave an empty course)** — continue to §4 and §5 in the same run: create `lessons/0001-*.json` (20–30 min, one tangible win, grounded in `course.json:mission`), validate against `references/lesson-format.md`, then generate `data.js` + `preview.html` from the fixed template and open it. The preview must show the real `course.title` and the first lesson, never `Untitled Course` or `0 / 0` with `No lessons yet`. If generation fails, do not write `preview.html` with placeholder data.

#### Resume / Select

When the intent is ambiguous and multiple courses exist, list courses and ask which to continue, or to create a new one.

### 4. Lesson Generation

Lessons are the unit of teaching: **20–30 minutes**, one tangible win, scoped to the course `mission` and `description` — re-read `course.json:mission` before authoring.

#### File Naming

`lessons/NNNN-<kebab>.js` where `NNNN` is zero-padded increment: scan existing `lessons/*.js`, take max number + 1. Example: `0001-seo-overview.js`.

#### JS Format (see `references/lesson-format.md`)

Each lesson is a JS file that pushes a lesson object to `window.__LESSONS__`:

```js
window.__LESSONS__ = window.__LESSONS__ || [];
window.__LESSONS__.push({
  "id": "0001",
  "slug": "seo-overview",
  "title": "第1课：SEO 全景图",
  "summary": "用 20 分钟建立 SEO 的正确心智模型",
  "tags": ["seo", "入门"],
  "body": "## 为什么先学这个？\n正文（Markdown，支持标题、列表、表格、代码块、引用、链接）",
  "bodyHtml": "",
  "tasks": [
    {"id":"0001-task-1","type":"choice","question":"...","options":["A","B","C","D"],"answer":0,"explain":"..."}
  ]
});
```

Rules:
- `title`/`summary` required; `tags` optional; `body` is Markdown (supports headings/lists/tables/code/blockquote/links); `tasks` is 2–5 items.
- Body: knowledge first (concise, cited if from external resource), then practice. Body must be Markdown string, not HTML, unless `bodyHtml` is pre-rendered.
- Tasks: array of **frozen task JSON objects** (see below). No free-form quizzes. Each task must validate against the frozen schema. Generate 2–5 tasks per lesson.
- Do **not** inline `<style>` or `<script>` in lessons. All rendering is done by the fixed template.

#### Frozen Task Schema (4 types only)

To eliminate interaction bugs, the template JS implements **exactly** these four types; the agent must not invent new types.

| type | required fields | validation |
|------|----------------|------------|
| `choice` | `question: string`, `options: string[2-6]`, `answer: number` (0-based index), `explain: string` | `answer` in `[0, options.length)`; options equal-length hint: keep same word count when possible |
| `multi` | `question: string`, `options: string[3-6]`, `answer: number[]` (sorted, unique), `explain: string` | `answer` non-empty, every index in range; at least 2 correct |
| `truefalse` | `question: string`, `answer: boolean`, `explain: string` | — |
| `steps` | `question: string`, `steps: {text:string, check:string}[2-6]`, `explain: string` | `steps` non-empty; `check` is the completion criterion |

Common fields: `id: string` (`NNNN-task-K` format), `type`, `question`, `explain`.

Example:
```json
{"id":"0001-task-1","type":"choice","question":"抓取→索引→排名的正确顺序是？","options":["抓取→索引→排名","索引→抓取→排名","排名→抓取→索引","抓取→排名→索引"],"answer":0,"explain":"爬虫先发现，再入库，才有资格排名。"}
```

Validation before write:
- JSON parses.
- `type` is one of the 4.
- Required fields present and types correct.
- If invalid, fix and re-validate; never write broken tasks.

### 5. Preview Generation (Fixed Template)

**No per-lesson ad-hoc HTML.** All previews are rendered by the single fixed template at `skills/cool-teach/assets/template.html`.

#### 5.0 Version Check (mandatory before every generation)

`skills/cool-teach/VERSION` is the single source of truth (e.g. `0.1.0`):

1. Read `skills/cool-teach/VERSION` → `SKILL_VER`.
2. Check `.coolteach/assets/app.js` contains `TEMPLATE_VERSION = '<SKILL_VER>'`. If the file is missing or the version differs, re-copy **all** shared assets (`style.css`, `app.js`, `marked.min.js`, `template.html`) from `skills/cool-teach/assets/` before generating — never generate a preview against stale assets.
3. When generating `preview.html`, replace `{{COOLTEACH_VERSION}}` with `SKILL_VER` and `{{GENERATED_AT}}` with the current ISO-8601 timestamp (this fills the header brand `vX.Y.Z` and `window.__COOLTEACH_META__`).
4. Bump rule: any change to `assets/` must bump `VERSION`, the `version:` frontmatter above, and `TEMPLATE_VERSION` in `app.js` together.

At runtime `app.js` compares `window.__COOLTEACH_META__.templateVersion` against `TEMPLATE_VERSION`; on mismatch the header version badge turns red and a `console.warn` is emitted — regenerate the preview to fix.

#### Build Steps

1. Read `course.json` + all `lessons/*.js` (sorted by filename). Each `*.js` is `window.__LESSONS__.push({...})` — validate the pushed object against `references/lesson-format.md`.
2. Optionally pre-render `body` Markdown to `bodyHtml` using a deterministic converter so the template can be pure HTML+JS. If not pre-rendered, the template's tiny parser will render `body` as fallback.
3. Generate `preview.html` from `assets/template.html`:
   - Inline course data once: `<script>window.__COURSE__ = <JSON>;</script>` (use `JSON.stringify(course, null, 2)` and escape `</script>`).
   - Inline generator meta: `<script>window.__COOLTEACH_META__ = {"templateVersion":"<SKILL_VER>","generatedAt":"<ISO-8601>"};</script>`.
   - Ensure `preview.html` loads lessons in order: one `<script src="./lessons/NNNN-*.js"></script>` per lesson (sorted), then `../../assets/marked.min.js` and `../../assets/app.js`. No `data.js` aggregation — each lesson JS is directly embedded.
   - Keep `course.json` / `lessons/*.js` as source of truth on disk; `preview.html` is derived.

#### Template Guarantees

- `preview.html` is light (~7KB) + shared assets `../../assets/style.css` (~14KB) and `../../assets/app.js` (~21KB) — no duplication across courses, still `file://` safe via relative `link`/`script` (see `references/template-spec.md`).
- Dark mode default, Nuxt design tokens (`#00DC82` / `#020420` / slate), consistent typography.
- Tasks JS is **frozen**: handles only the 4 types with strict validation, `localStorage` progress (`coolteach:<slug>`), idempotent check, shows `explain` after answering.
- If a task JSON is malformed, the template shows a non-breaking error card (`Invalid task: <reason>`) and continues rendering other tasks — no full-page crash.

### 6. Open Preview

After generation, open `preview.html`:

```bash
open .coolteach/courses/<slug>/preview.html        # macOS
# xdg-open / start for Linux/Windows
```

Report the absolute path (`pwd` + `.coolteach/courses/<slug>/preview.html`) so the user can double-click if `open` fails.

### 7. Progress Tracking

- Progress is tracked purely in `localStorage: coolteach:<slug>` (survives `file://` refresh) — no `progress.json` on disk.
- Each lesson's completion is derived as `completedTasks / totalTasks`. The preview shows a progress bar and sidebar checkmarks.
- Legacy `progress.json` files are tolerated if present but are no longer created or required.

## References

- `references/course-schema.md` — `courses.json` / `course.json` schemas
- `references/lesson-format.md` — Lesson markdown + frozen task JSON schema
- `references/template-spec.md` — Fixed template behavior, file mapping, how to regenerate

## Notes

- Always use `pwd` as working directory, never the skill checkout path.
- Slug validation and task JSON validation are mandatory before write — they are the root causes of the previous inconsistency/bug reports.
- Template is the only HTML author. Do not hand-write per-lesson HTML or inline styles in Markdown.
