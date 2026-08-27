<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Report Spec — report-YYYYMMDD-HHmmss.html

> 单文件报告（`file://` 直接打开），内联所有 CSS/JS，无外部依赖。

## 生成方式

1. Agent 基于 `assets/report.html` 模板生成 `report-<ts>.html`。
2. 将 `report-<ts>.json` 全量内容内联到：
   ```html
   <script id="__COOLTEST_DATA__" type="application/json">{ ... }</script>
   ```
   避免 `file://` 下 `fetch` 跨域失败。`report.json` 仍需落盘，供回写。

## 展示内容

- 顶部统计：总数 / passed / failed / preview / pending（进度条）。
- 筛选：按 `status` / `type` 过滤；搜索：按 `id` / `title`。
- 表格列：`ID | 标题 | 类型 | 步骤数 | 期望 | 状态 | 原因/证据 | 操作`。
- `preview` 行高亮（琥珀色），`failed` 高亮（红色）。

## 可编辑与回写

用户可在表格中直接修改每行 `status`（下拉：`passed/failed/preview/pending`）和 `reason`。

### 回写策略

1. **优先**：`File System Access API`（`showSaveFilePicker`）→ 直接写回 `report-<ts>.json` 同目录文件。
2. **降级**：触发浏览器下载 `report-<ts>.json`（文件名保持不变），并提示：
   > “浏览器不支持直接写回，已下载最新 JSON，请手动覆盖 .cooltest/report-xxx.json”
3. **暂存**：同时写入 `localStorage: cooltest:<ts>`，刷新不丢失；提供「导出 CSV」按钮。

> 由于报告以 `file://` 打开，无法直接 `fetch PUT` 到本地文件系统，上述“下载覆盖”是 `file://` 场景的标准做法。若用户通过 `http://localhost` 打开（可选），可改为直接 `fetch` 写回。

## 文件对照

```
.cooltest/
├── suite-20260827-153000.json   # 转化结果（只读快照）
├── report-20260827-153000.json  # 执行+编辑后的真相源
└── report-20260827-153000.html  # 内联 report.json 的可视化
```

`suite-*.json` 保留转化快照；`report-*.json` 为可编辑的最终结果；HTML 仅为视图。

## 打开方式

```bash
# macOS
open .cooltest/report-*.html
# Linux
xdg-open .cooltest/report-*.html
# Windows
start .cooltest/report-*.html
```

## 可选增强

- 若需 `http://localhost` 模式，可执行：`python3 -m http.server 9321 --directory .cooltest` 再打开 `http://localhost:9321/report-xxx.html`。
