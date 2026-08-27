---
name: cool-test
description: Convert test cases/requirements/source in any format into a fixed JSON suite for web testing, detect browser automation capability, execute and generate an editable local HTML report. Use when user triggers /cool-test or asks to run web automated tests, convert test cases, or generate test reports.
---

<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Cool Test — Automated Test Suite Execution & Reporting

> Trigger: `/cool-test` (exact match). Not auto-triggered by natural language to avoid false positives.

## Workflow

### 1. Input Collection & Validation

1. Detect whether the user message contains convertible content: file paths, URLs, pasted text/code/tables.
2. **No format restriction** — LLM decides how to generate the suite.
3. If no content is provided, ask the user to provide it.

### 2. Initialize `.cooltest` Directory

Execute at the **user's current project root** (confirm with `pwd`, not the skill's checkout path):

```bash
mkdir -p .cooltest/tmp
```

Naming convention — **flat timestamp**:

```
.cooltest/
├── suite-YYYYMMDD-HHmmss.json    # converted suite (current run)
├── report-YYYYMMDD-HHmmss.json   # execution results (status written back)
├── report-YYYYMMDD-HHmmss.html   # editable single-file report
└── tmp/                          # screenshots, har, logs
```

- Timestamp format: `YYYYMMDD-HHmmss` (local time, 24h).
- If `.cooltest` already exists with history, **ask user first**: `Keep history and create new / Overwrite latest`, follow user choice.

### 3. Capability Detection (Web Only)

1. Detect whether the agent has web testing tools:
   - `ego-browser` (ego lite) / `playwright` / `puppeteer` / `chrome-devtools` / `browser_*` MCP
2. **Terminate directly if missing** (no fallback to preview), with setup guidance:
   ```
   This run requires web testing capability but current agent lacks browser automation tools.
   Please configure one of:
   - ego-browser (https://lite.ego.app), Playwright MCP or chrome-devtools
   Then re-run /cool-test
   ```
   Do not silently skip.

### 4. Convert to Fixed JSON Suite

1. Read user-provided source (use `read` for files, `fetch` for URLs, read large files in chunks).
2. Call LLM to convert to fixed JSON and write to `suite-<ts>.json`. See `references/suite-schema.md` for schema.
3. Key rules:
   - Initial status is `pending`.
   - `steps[].action` allowed values only: `open|click|input|assert|custom`.
   - Sensitive info (URL/credentials/Token): extract from user input first; if missing, ask user before execution, do not hallucinate.

### 5. Execute Suite

1. Execute `cases` one by one. Batch size is **decided by LLM**, but must satisfy:
   - **Immediately write back** `report-<ts>.json` after each batch (sync status with `suite-<ts>.json`), no progress loss on crash.
   - Use atomic `write`/`edit`, do not buffer to the end.
2. Only 4 statuses: `pending|passed|failed|preview`.
3. `preview` rule: mark as `preview` **whenever LLM is uncertain**, with `reason` explaining why (e.g. requires real device/captcha/visual judgment/insufficient info).
4. When user intervention is needed (login, captcha, sensitive ops), pause and prompt user, continue after completion.

### 6. Generate and Open Report

1. Generate `report-<ts>.html` from `assets/report.html` template:
   - Inline `report-<ts>.json` content via `<script id="__COOLTEST_DATA__" type="application/json">` to avoid `file://` CORS issues.
   - Keep `report-<ts>.json` on disk for write-back.
2. Open with system command (`file://` single file):
   ```bash
   open .cooltest/report-<ts>.html        # macOS
   # xdg-open / start for Linux/Windows
   ```
3. Report capabilities (see `references/report-spec.md`):
   - Show all cases with `passed/failed/preview/pending` stats.
   - Each row's status is editable (dropdown), with **auto write-back** after edit:
     - Prefer File System Access API to write back to `report-<ts>.json`;
     - Fallback to triggering download of `report-<ts>.json` with overlay prompt, plus `localStorage` cache.
   - Provide filtering (by status/type) and CSV export.

## References

- `references/suite-schema.md` — JSON Schema and examples
- `references/report-spec.md` — Report HTML behavior and write-back details
- `assets/report.html` — Single-file report template

## Notes

- Always use `pwd` as working directory, never the skill's checkout path.
- Report is a single file with inlined CSS/JS, no external dependencies, opens with double-click.
