# Lesson Format — `lessons/NNNN-<slug>.js`

> Lessons are JS files that push to `window.__LESSONS__`. No Markdown files, no ` ```task` fences. The fixed template renders them directly via `<script src>`; no hand-written HTML.

## File Naming

`NNNN-<kebab>.js` — zero-padded increment. Scan `lessons/*.js`, take `max(NNNN)+1`.

```
0001-seo-overview.js
0002-keyword-research.js
0003-onpage-optimization.js
```

Slug part: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 2–40 chars.

## JSON Structure

```js
window.__LESSONS__ = window.__LESSONS__ || [];
window.__LESSONS__.push({
  "id": "0001",
  "slug": "seo-overview",
  "title": "第1课：SEO 全景图 — 搜索引擎如何决定排名",
  "summary": "用 20 分钟建立 SEO 的正确心智模型：抓取/索引/排名三步 + 技术/内容/权威三大支柱",
  "tags": ["seo", "入门", "搜索意图"],
  "body": "## 为什么先学这个？\n\n正文（Markdown，支持标题、列表、表格、代码块、引用、链接）...",
  "bodyHtml": "",
  "tasks": [
    {"id":"0001-task-1","type":"choice","question":"...","options":["A","B","C","D"],"answer":0,"explain":"..."}
  ]
});
```

| field | required | type | notes |
|-------|----------|------|-------|
| `id` | ✓ | string | `NNNN` prefix, matches filename number |
| `slug` | ✓ | string | kebab-case, matches filename slug |
| `title` | ✓ | string | Lesson title, shown in sidebar and card head |
| `summary` | ✓ | string | One sentence, ≤120 chars |
| `tags` | — | `string[]` | Rendered as pills |
| `body` | ✓ | string | Markdown string: headings (`##`/`###`), paragraphs, lists, tables, code blocks, inline code, blockquotes, links. No `<style>`/`<script>`. Images go to `courses/<slug>/assets/` and are referenced by relative path |
| `bodyHtml` | — | string | Optional pre-rendered HTML. If empty, template's tiny parser renders `body` |
| `tasks` | ✓ | `object[2-5]` | Frozen task objects (see below) |

## Tasks (Frozen 4 Types)

Each `tasks[]` entry is **exactly one JSON object**. The template's JS freezes 4 types — no other types may be written.

#### Common Fields

| field | required | type | description |
|-------|----------|------|-------------|
| `id` | ✓ | string | `NNNN-task-K` (lesson number + task index) |
| `type` | ✓ | string | `choice` \| `multi` \| `truefalse` \| `steps` |
| `question` | ✓ | string | Stem, ≤200 chars, no HTML |
| `explain` | ✓ | string | Shown after answer, explains correct/incorrect |

#### `choice` — single answer

```json
{
  "id": "0001-task-1",
  "type": "choice",
  "question": "一个全新的独立站页面想获得 Google 排名，必须依次经历哪三个阶段？",
  "options": ["抓取→索引→排名", "索引→抓取→排名", "排名→抓取→索引", "抓取→排名→索引"],
  "answer": 0,
  "explain": "正确是 抓取→索引→排名。爬虫先发现（抓取），再理解并存入索引库，最后才有资格参与排名。"
}
```

| field | type | validation |
|-------|------|------------|
| `options` | `string[2-6]` | Each non-empty; keep similar word count to avoid clue leakage |
| `answer` | `number` | Integer in `[0, options.length)` |

#### `multi` — multiple answers

```json
{
  "id": "0001-task-3",
  "type": "multi",
  "question": "以下哪些属于 SEO 三大支柱？",
  "options": ["技术SEO：可抓取与速度", "站内内容：意图匹配与质量", "站外权威：外链与品牌信任", "付费投放：SEM竞价排名"],
  "answer": [0, 1, 2],
  "explain": "前三项是 SEO 三大支柱：技术×内容×权威。付费投放（SEM）不属于 SEO。"
}
```

| field | type | validation |
|-------|------|------------|
| `options` | `string[3-6]` | — |
| `answer` | `number[]` | Sorted, unique, non-empty, each in range, at least 2 correct |

#### `truefalse` — true/false

```json
{
  "id": "0001-task-2",
  "type": "truefalse",
  "question": "只要在页面里堆砌更多关键词，排名就一定会上升。",
  "answer": false,
  "explain": "错。堆砌关键词是黑帽做法，会被判定为低质内容。"
}
```

| field | type | validation |
|-------|------|------------|
| `answer` | `boolean` | — |

#### `steps` — checklist

```json
{
  "id": "0001-task-4",
  "type": "steps",
  "question": "5 分钟完成你的站点索引快照（本课的小胜利）",
  "steps": [
    {"text": "在 Google 搜索框输入 site:你的域名并回车", "check": "能看到收录结果数及列表"},
    {"text": "随机点开 1-2 条结果，核对标题与页面是否正常", "check": "标题正确且页面可打开"},
    {"text": "把结果记到 NOTES.md", "check": "已有一行记录：日期 + 域名 + 收录数"}
  ],
  "explain": "完成即建立了流量翻倍的起点快照。"
}
```

| field | type | validation |
|-------|------|------------|
| `steps` | `{text:string, check:string}[2-6]` | Both non-empty; `check` is the completion criterion shown under the step |

## Validation (Agent Must Run Before Write)

1. **JS syntax check (mandatory, prevents Untitled Course bug):** the file must be valid JS that pushes to `window.__LESSONS__`. Run:
   ```bash
   node -e "global.window={}; eval(require('fs').readFileSync('lessons/0001-xxx.js','utf8')); console.log(window.__LESSONS__.length)"
   ```
   Must print `1` with no `SyntaxError: Invalid or unexpected token`. If it throws, the `body`/`tasks` strings were not escaped — regenerate with `JSON.stringify(lesson, null, 2)` and re-check. **Never hand-concatenate** `{"body": "${body}"}`.
2. Whole lesson JSON round-trips: `JSON.parse(JSON.stringify(lesson))` succeeds.
3. Required lesson fields present with correct types.
4. `tasks` length 2–5, each `type` ∈ 4, required task fields present, range/length checks pass per table above.
5. `</script>` inside `body` is escaped as `<\/script>` so `preview.html` does not break.

If any check fails → fix and re-validate; never write broken lessons. A broken lesson JS silently yields `Untitled Course` / `No lessons yet` and does **not** show the `Invalid task` card (that card only catches broken *task* JSON, not broken *file* syntax). The template will show a non-breaking error card (`Invalid task: <reason>`) for any task that fails validation, without crashing the page.

## Rendering

The fixed template loads `lessons/*.js` (`window.__LESSONS__`) directly via `<script src>`, validates each task again, and renders:
- `choice` → radio group
- `multi` → checkboxes
- `truefalse` → True / False radios
- `steps` → checklist

After `Check`, it shows `explain`, marks correct/wrong, persists to `localStorage: coolteach:<slug>`, and updates progress.
