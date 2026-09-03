---
name: cool-teach
version: 0.3.7
description: 多课程学习工作区技能（.coolteach）—— 创建课程、生成带校验任务的小课、并用固定 HTML 模板打开本地预览。当用户用自然语言表达课程学习意图时使用，例如“我想学习 SEO”“继续学习 SEO”“查看我有哪些课程”“打开 SEO 课程”；/cool-teach 前缀也可接受，但不是必须的。
---

# Cool Teach — 多课程学习工作区

> 触发：表达课程学习意图的自然语言——无需前缀（`/cool-teach` 前缀同样接受，含义相同）。用 LLM 判别自由意图。示例：`我想学习 SEO` · `继续学习 SEO` · `查看我有哪些课程` · `打开 SEO 课程`

## 目录结构（简化版）

所有教学状态存于**用户项目根目录**（以 `pwd` 为准，而非技能安装目录）的 `.coolteach`：

```
.coolteach/
├── courses.json                 # 全局索引
├── assets/
│   ├── style.css                # 共享固定样式（来自 skills/cool-teach/assets/style.css）
│   └── app.js                   # 共享固定脚本（来自 skills/cool-teach/assets/app.js）
└── courses/<slug>/
    ├── course.json              # 课程元数据 + 学习目标 why/success/constraints
    ├── preview.html             # 轻量壳，引用 ../../assets/* + lessons/*.js（file:// 可打开）
    ├── lessons                  # 聚合后的课程数据（供 file:// 预览，无需 http）
    └── lessons/
        ├── 0001-overview.js   # 课程 JSON（title/summary/tags/body/tasks）
        └── 0002-keywords.js
```

> `course.json:mission` 为学习目标的唯一真相源（见工作流 §3），旧的 `MISSION.md` 兼容保留但不再新建。

详见 `references/course-schema.md` 与 `references/lesson-format.md`。

## 工作流

### 1. 触发与解析

1. 触发为表达课程学习意图的**自然语言**，无需前缀。可选的 `/cool-teach` 前缀同样接受且等价（解析前先剥离）。用 LLM 判别意图：
   - **查看** — 如 `查看我有哪些课程` / `有哪些课` → 列出 `.coolteach/courses.json` 全部课程。
   - **新建** — 如 `我想学习 SEO` / `想学 Rust CLI` → 新建课程（随后进入学习目标访谈）。
   - **继续/新增课件** — 如 `继续学习 SEO` / `给 SEO 加一课` → 为已匹配课程新增一课。
   - **打开/预览** — 如 `打开 SEO 课程` / `预览 SEO` → 重新生成并打开该课程的 `preview.html`。
   - **意图不明/仅打招呼** → 交互式：列出课程，询问继续哪一门或是否新建。
2. 从自然语言中用 LLM 抽取课程主题/slug（如“SEO”→`seo`，“Rust CLI”→`rust-cli`），含糊时向用户确认推导的 slug。
3. 仅在真正的课程学习意图（新建、继续、查看、打开课程）时触发，无关闲聊不得激活本技能。

### 2. 初始化 `.coolteach`

在用户项目根目录执行：

```bash
mkdir -p .coolteach/courses .coolteach/assets
# 确保共享固定资源存在（仅需拷贝一次）
cp skills/cool-teach/assets/style.css .coolteach/assets/style.css 2>/dev/null || true
cp skills/cool-teach/assets/app.js     .coolteach/assets/app.js     2>/dev/null || true
```

若 `.coolteach/courses.json` 不存在则创建：

```json
{ "version": 1, "generatedAt": "ISO-8601", "courses": [] }
```

规则：
- Slug：`^[a-z0-9]+(?:-[a-z0-9]+)*$`，2–40 字符，小写 kebab-case。
- 课程目录：`.coolteach/courses/<slug>/`
- 若索引与目录不一致，以索引为准，下次 `list` 时自动修复。

### 3. 课程管理

#### 查看

读取 `.coolteach/courses.json` 并打印：`slug | 标题 | 课时数 | 状态 | 更新时间`。

#### 新建

> **未完成学习目标访谈前不得创建课程。** 目标是所有教学的罗盘，目标不清会导致课件空泛、无法判断 ZPD。

1. **学习目标访谈（阻塞式，写任何文件前必须完成）** — 采用**一次一问的交互式访谈**。即使用户已通过 `我想学习 SEO` 给出主题，仍需先访谈再写入。**每题单独调用一次 `ask_user_question`**，**默认提供 3 个选项并允许用户自定义输入**（可直接选或自己输入答案），答完一题再问下一题：
   - **第1问 为什么学** — 1–3 句：掌握后在工作/生活中具体会发生什么变化（逼问“以便……”而非“想了解……”）。示例选项：`为独立站带来可持续自然流量，降低付费依赖` / `能独立交付一个可用成果到项目中` / `解决当前工作中的具体瓶颈` + 自定义输入。
   - **第2问 成功是什么样** — 2–3 个可观察的能力（例“能独立完成关键词研究 → 重写 1 个页面 → 拿到前 20 排名”）。示例选项：`能独立端到端完成一次小实战` / `能用清单复盘并优化现有页面/项目` / `会看数据并持续迭代` + 自定义输入。
   - **第3问 约束** — 时间投入（例 1h/周）、已有基础、偏好、范围边界。示例选项：`每周1小时，偏实战少理论` / `每周2小时，有一点基础想快速见效` / `每周4小时，想系统深入` + 自定义输入。
   - 答完 3 题后，提出 `title`（必填）、`description`（Why 的一句话摘要）、`slug`（由自然语言主题/标题推导），并再通过一次 `ask_user_question` 请用户确认三者。
   - 若某项回答含糊，需再次交互式追问：“掌握后你的工作/生活会有什么具体变化？” 不接受“就想了解 X”作为目标。
2. 校验 slug 唯一且符合 `^[a-z0-9]+(?:-[a-z0-9]+)*$`（2–40 字符）。
3. 写入 `courses/<slug>/course.json`：
   ```json
   {
     "version": 1,
     "slug": "seo",
     "title": "SEO 实战：让独立站自然流量翻倍",
     "description": "从搜索引擎原理到关键词、内容与技术优化",
     "status": "active",
     "createdAt": "ISO-8601",
     "updatedAt": "ISO-8601"
   }
   ```
4. 写入 `courses/<slug>/MISSION.md`（访谈结果，一屏内可读完）：
   ```md
   # Mission: {title}

   ## Why
   {具体成果}

   ## Success looks like
   - {可观察 1}
   - {可观察 2}

   ## Constraints
   - {时间 / 基础 / 偏好}
   ```
5. 写入 `courses/<slug>/progress.json`：
   ```json
   { "version": 1, "courseSlug": "seo", "lessons": {}, "updatedAt": "ISO-8601" }
   ```
6. 确保 `courses/<slug>/lessons/` 存在。
7. 追加到 `courses.json` 并更新 `generatedAt`。
8. **立即生成首课并预览（不允许留下空课程）** — 同一次运行中继续执行 §4 与 §5：创建 `lessons/0001-*.json`（20–30 分钟、一次一个小胜利、紧扣 `course.json:mission`），按 `references/lesson-format.md` 校验，随后生成 `data.js` + `preview.html` 并打开。预览必须展示真实的 `course.title` 与首课内容，不得出现 `Untitled Course` 或 `0 / 0` 且提示 `No lessons yet`。若首课生成失败，不得用占位数据写入 `preview.html`。

#### 继续/选择

意图含糊且存在多门课程时，列出课程并让用户选择继续哪一门或新建。

### 4. 生成课件

课件是教学的最小单元：**20–30 分钟**、一次一个小胜利，紧扣课程 `mission` 与 `description`——动笔前先重读 `course.json:mission`。

#### 命名

`lessons/NNNN-<kebab>.js`，`NNNN` 为零填充递增序号：扫描现有 `lessons/*.js` 取最大序号 +1，如 `0001-seo-overview.js`。

#### JS 格式（见 `references/lesson-format.md`）

每个课件为直接可嵌入的 JS 文件：

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

规则：
- `title`/`summary` 必填；`tags` 可选；`body` 为 Markdown 字符串（支持标题/列表/表格/代码块/引用/链接）；`tasks` 为 2–5 题。
- 正文先讲知识（简洁，必要时带外部资源引用），再练技能。正文须为 Markdown 字符串，`bodyHtml` 仅在预渲染后填充。
- 习题：`tasks` 数组内为冻结任务 JSON 对象（见下）。不得手写自由格式测验。每题必须通过冻结 Schema 校验，生成 2–5 题。
- 不得在课件中内联 `<style>` 或 `<script>`，所有渲染由固定模板完成。

#### 生成规则（关键 — 防止 `Untitled Course` / `No lessons yet`）

> **严禁手写拼接课件 JS 字符串。** `body` Markdown 中必然包含 `"`、`'`、`` ` ``、`\n`、`</script>` 等，手写拼接会直接语法报错，预览静默回退为 `Untitled Course` 且无课时（v0.3.7 修复的正是此 BUG）。

**必须这样做：**
```js
const lesson = { id, slug, title, summary, tags, body, bodyHtml: "", tasks };
const out = 'window.__LESSONS__ = window.__LESSONS__ || [];\n'
        + 'window.__LESSONS__.push(' + JSON.stringify(lesson, null, 2) + ');\n';
const safe = out.replace(/<\/script>/gi, '<\\/script>');
fs.writeFileSync(`lessons/${id}-${slug}.js`, safe, 'utf8');
```

**禁止：**
```js
// ❌ body 中任意 " 都会导致 SyntaxError
fs.writeFileSync(`lessons/${id}-${slug}.js`,
  `window.__LESSONS__.push({"body": "${body}"})`);
```

**写入前必须校验：**
```bash
node -e "global.window={}; eval(require('fs').readFileSync('lessons/0001-xxx.js','utf8')); console.log('lessons', window.__LESSONS__.length)"
# 必须输出 1 且不抛 Invalid or unexpected token
```

#### 冻结的习题 Schema（仅 4 种）

为杜绝交互 BUG，模板 JS 仅实现以下 4 种，Agent 不得自创类型。

| type | 必填字段 | 校验 |
|------|----------|------|
| `choice` | `question: string`、`options: string[2-6]`、`answer: number`（0 基）、`explain: string` | `answer` 在 `[0, options.length)`；选项尽量等长等词数 |
| `multi` | `question: string`、`options: string[3-6]`、`answer: number[]`（已排序、去重）、`explain: string` | `answer` 非空，每项在范围内；至少 2 个正确项 |
| `truefalse` | `question: string`、`answer: boolean`、`explain: string` | — |
| `steps` | `question: string`、`steps: {text:string, check:string}[2-6]`、`explain: string` | `steps` 非空；`check` 为完成判定 |

公共字段：`id: string`（`NNNN-task-K`）、`type`、`question`、`explain`。

示例：
```json
{"id":"0001-task-1","type":"choice","question":"抓取→索引→排名的正确顺序？","options":["抓取→索引→排名","索引→抓取→排名","排名→抓取→索引","抓取→排名→索引"],"answer":0,"explain":"先被爬虫发现，再入库，才有资格参与排名。"}
```

写入前校验（全部必须通过）：
- 上述 `node -e` 能正常执行且 `window.__LESSONS__` 非空（捕获未转义 `"` / `</script>` 的语法错误）。
- 课件 JSON 可解析（`JSON.parse(JSON.stringify(lesson))` 往返通过）。
- `type` 为 4 种之一。
- 必填字段齐全且类型正确，`answer` 范围、`steps` 等按表格校验。
- 任一项失败则修复后重验，绝不写入破损课件。破损课件会静默导致 `Untitled Course` / `No lessons yet`，视为阻塞性错误。

### 5. 预览生成（固定模板）

**不再逐课手写 HTML。** 所有预览由唯一的固定模板 `skills/cool-teach/assets/template.html` 渲染。

#### 5.0 版本校验（每次生成前必须执行）

`skills/cool-teach/VERSION` 是唯一的版本权威来源（如 `0.1.0`）：

1. 读取 `skills/cool-teach/VERSION` → `SKILL_VER`。
2. 检查 `.coolteach/assets/app.js` 是否包含 `TEMPLATE_VERSION = '<SKILL_VER>'`。若文件缺失或版本不一致，先从 `skills/cool-teach/assets/` 重拷全部共享资源（`style.css`、`app.js`、`marked.min.js`、`template.html`），再生成预览——绝不拿过期资源生成预览。
3. 生成 `preview.html` 时，将 `{{COOLTEACH_VERSION}}` 替换为 `SKILL_VER`、`{{GENERATED_AT}}` 替换为当前 ISO-8601 时间（用于填充页头品牌 `vX.Y.Z` 与 `window.__COOLTEACH_META__`）。
4. 升级规则：任何 `assets/` 改动必须同步 bump `VERSION`、上方的 `version:` frontmatter 与 `app.js` 中的 `TEMPLATE_VERSION`。

运行时 `app.js` 会对比 `window.__COOLTEACH_META__.templateVersion` 与 `TEMPLATE_VERSION`；不一致时页头版本号标红并输出 `console.warn`——重新生成预览即可修复。

#### 构建步骤

1. 读取 `course.json` 与全部 `lessons/*.js`（按文件名排序），每课为 `window.__LESSONS__.push({...})`，校验推送对象是否符合 `references/lesson-format.md`。
2. （可选）将 `body` Markdown 预渲染为 `bodyHtml`，使模板可为纯 HTML+JS；若未预渲染，模板微型解析器会以降级渲染 `body`。
3. 从固定模板生成 `preview.html`：
   - 内联课程数据一次：`<script>window.__COURSE__ = <JSON>;</script>`（`JSON.stringify` 并转义 `</script>`）
   - 内联生成器元信息：`<script>window.__COOLTEACH_META__ = {"templateVersion":"<SKILL_VER>","generatedAt":"<ISO-8601>"};</script>`
   - 按序为每课生成 `<script src="./lessons/NNNN-*.js"></script>`（已排序），最后加载 `../../assets/marked.min.js` 与 `../../assets/app.js`。不再生成 `data.js` 聚合文件——每课 JS 直接被引用。
   - `course.json` / `lessons/*.js` 仍为磁盘上的权威来源；`preview.html` 为派生。

#### 模板保证

- `preview.html` 为轻量文件（~7KB）+ 共享资源 `../../assets/style.css`（~14KB）与 `../../assets/app.js`（~21KB），多课程无重复，仍通过相对 `link`/`script` 保持 `file://` 可用（见 `references/template-spec.md`）。
- 默认深色模式，Nuxt 设计 Token（`#00DC82` / `#020420` / slate），排版一致。
- 习题 JS 已冻结：仅处理 4 种题型，严格校验、幂等判定、作答后展示 `explain`，`localStorage: coolteach:<slug>` 持久化进度。
- 若某任务 JSON 损坏，模板以错误卡片提示（`Invalid task: <原因>`）并继续渲染其余任务，不会整页崩溃。

### 6. 打开预览

生成后打开 `preview.html`：

```bash
open .coolteach/courses/<slug>/preview.html        # macOS
# Linux: xdg-open / Windows: start
```

同时报告绝对路径（`pwd` + `.coolteach/courses/<slug>/preview.html`），`open` 失败时用户可双击打开。

### 7. 进度跟踪

- 进度完全由 `localStorage: coolteach:<slug>` 跟踪（`file://` 刷新不丢失），磁盘上不再创建 `progress.json`。
- 每课完成度 = `已完成任务数 / 总任务数`，预览页展示进度条与侧边勾选状态。
- 旧的 `progress.json` 兼容保留但不再新建或依赖。

## 参考

- `references/course-schema.md` — `courses.json` / `course.json` 结构
- `references/lesson-format.md` — 课件 Markdown + 冻结任务 Schema
- `references/template-spec.md` — 固定模板行为、文件映射、重新生成方法

## 备注

- 始终以 `pwd` 为工作目录，绝不使用技能安装目录。
- Slug 与任务 JSON 的写入前校验为强制项——这正是此前样式不一致与交互 BUG 的根因。
- 模板是唯一的 HTML 作者，禁止在 Markdown 中手写 HTML 或内联样式。
