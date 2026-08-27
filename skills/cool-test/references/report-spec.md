<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Report Spec — report-YYYYMMDD-HHmmss.html

> Single-file report (open via `file://`), all CSS/JS inlined, no external dependencies.

## Generation

1. Agent generates `report-<ts>.html` from `assets/report.html` template.
2. Inline the full `report-<ts>.json` content into:
   ```html
   <script id="__COOLTEST_DATA__" type="application/json">{ ... }</script>
   ```
   Avoids `fetch` CORS failure under `file://`. `report.json` must still be written to disk for write-back.

## Display

- Header stats: total / passed / failed / preview / pending (progress bar).
- Filters: by `status` / `type`; Search: by `id` / `title`.
- Table columns: `ID | Title | Type | Steps | Expected | Status | Reason/Evidence | Actions`.
- `preview` rows highlighted (amber), `failed` highlighted (red).

## Editable & Write-back

Users can directly edit each row's `status` (dropdown: `passed/failed/preview/pending`) and `reason` in the table.

### Write-back Strategy

1. **Primary**: `File System Access API` (`showSaveFilePicker`) → write directly back to `report-<ts>.json`.
2. **Fallback**: Trigger browser download of `report-<ts>.json` (same filename) with prompt:
   > "Browser does not support direct write-back. Downloaded latest JSON, please manually overwrite .cooltest/report-xxx.json"
3. **Cache**: Also write to `localStorage: cooltest:<ts>`, survives refresh; provide "Export CSV" button.

> Since the report is opened via `file://`, direct `fetch PUT` to the local filesystem is not possible. The "download and overwrite" is the standard approach for `file://`. If opened via `http://localhost` (optional), it can directly write back via `fetch`.

## File Mapping

```
.cooltest/
├── suite-20260827-153000.json   # converted snapshot (read-only)
├── report-20260827-153000.json  # editable source of truth after execution
└── report-20260827-153000.html  # visualization with inlined report.json
```

`suite-*.json` keeps the conversion snapshot; `report-*.json` is the editable final result; HTML is view only.

## How to Open

```bash
# macOS
open .cooltest/report-*.html
# Linux
xdg-open .cooltest/report-*.html
# Windows
start .cooltest/report-*.html
```

## Optional Enhancement

- For `http://localhost` mode, run: `python3 -m http.server 9321 --directory .cooltest` then open `http://localhost:9321/report-xxx.html`.
