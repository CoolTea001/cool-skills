---
name: cool-test
description: 将任意格式的测试用例/需求/源码转化为固定 JSON Web 测试套件，检测浏览器自动化能力并执行，最后生成可编辑的本地网页报告。Use when user triggers /cool-test or asks to run web automated tests, convert test cases, or generate test reports.
---

<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Cool Test — 自动化测试套件执行与报告

> 触发词：`/cool-test`（精确匹配）。自然语言不自动触发，避免误判。

## Workflow

### 1. 输入收集与校验

1. 检测用户消息是否包含可转化内容：文件路径、URL、粘贴的文本/代码/表格。
2. **不限制格式** — 全部交由 LLM 自行判断如何生成测试套件。
3. 若未提供任何内容，则要求用户提供。

### 2. 初始化 `.cooltest` 目录

在**用户当前项目的根目录**执行（用 `pwd` 确认，非本 skill 的 checkout 路径）：

```bash
mkdir -p .cooltest/tmp
```

命名约定 — **扁平时间戳**：

```
.cooltest/
├── suite-YYYYMMDD-HHmmss.json    # 转化的测试套件（本次）
├── report-YYYYMMDD-HHmmss.json   # 执行结果（状态已回写）
├── report-YYYYMMDD-HHmmss.html   # 可编辑单文件报告
└── tmp/                          # 截图、har、log
```

- 时间戳格式：`YYYYMMDD-HHmmss`（本地时间，24h）。
- 若 `.cooltest` 已存在且包含历史文件，**先询问用户**：`保留历史并新增 / 覆盖最新一次`，按用户意愿执行。

### 3. 能力检测（仅 Web）

1. 检测 Agent 是否具备 Web 网页测试工具：
   - `ego-browser` (ego lite) / `playwright` / `puppeteer` / `chrome-devtools` / `browser_*` MCP
2. **缺失则直接终止**（不降级为 preview），并指导配置：
   ```
   本次需要 Web 网页测试能力，但当前 Agent 缺少浏览器自动化工具。
   请配置其一：
   - ego-browser（https://lite.ego.app）、Playwright MCP 或 chrome-devtools
   配置后重新执行 /cool-test
   ```
   不要静默跳过。

### 4. 转化为固定 JSON 套件

1. 读取用户提供的原始内容（文件则 `read`，URL 则 `fetch`，大文件分段读）。
2. 调用 LLM 转化为固定 JSON，写入 `suite-<ts>.json`。Schema 见 `references/suite-schema.md`。
3. 关键规则：
   - 无 `priority` 字段。
   - 状态初始为 `pending`。
   - `steps[].action` 仅用：`open|click|input|assert|custom`。
   - 敏感信息（URL/账号/Token）：优先从用户输入提取；缺失则在执行前反问用户补充，不要臆造。

### 5. 执行套件

1. 逐条执行 `cases`。批次大小**由 LLM 自行决定**，但必须满足：
   - 每批结束后**立即回写** `report-<ts>.json`（与 `suite-<ts>.json` 同步状态），崩溃不丢进度。
   - 使用 `write`/`edit` 原子写入，不要缓存到最后。
2. 状态仅 4 种：`pending|passed|failed|preview`。
3. `preview` 判定：**只要 LLM 觉得不确定**即标 `preview`，并在 `reason` 中说明原因（如需真机/验证码/视觉判断/信息不足）。
4. 需要用户介入时（登录、验证码、敏感操作），暂停并提示用户操作，完成后再继续。

### 6. 生成并打开报告

1. 基于 `assets/report.html` 模板生成 `report-<ts>.html`：
   - 将 `report-<ts>.json` 内容以 `<script id="__COOLTEST_DATA__" type="application/json">` 内联嵌入，避免 `file://` 跨域问题。
   - 同时保留 `report-<ts>.json` 供回写。
2. 用系统命令打开（`file://` 单文件）：
   ```bash
   open .cooltest/report-<ts>.html        # macOS
   # xdg-open / start 对应 Linux/Windows
   ```
3. 报告能力（见 `references/report-spec.md`）：
   - 展示所有用例及 `passed/failed/preview/pending` 统计。
   - 每行可编辑状态（下拉），编辑后**自动回写**：
     - 优先尝试 File System Access API 写回 `report-<ts>.json`；
     - 不支持则触发下载 `report-<ts>.json` 并提示用户覆盖，同时 `localStorage` 暂存。
   - 提供筛选（按状态/类型）与导出 CSV。

## References

- `references/suite-schema.md` — JSON Schema 与示例
- `references/report-spec.md` — 报告 HTML 行为与回写细节
- `assets/report.html` — 单文件报告模板

## Notes

- 工作目录一律以 `pwd` 为准，勿用 skill 自身的 checkout 路径。
- 报告为单文件，内联所有 CSS/JS，无外部依赖，双击即可打开。
