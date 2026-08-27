<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Suite JSON Schema

> 固定格式测试套件，扁平时间戳命名：`suite-YYYYMMDD-HHmmss.json` 与 `report-YYYYMMDD-HHmmss.json` 结构一致，report 额外包含执行结果。

## JSON Schema (Draft 07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CoolTestSuite",
  "type": "object",
  "required": ["suiteName", "createdAt", "source", "cases"],
  "properties": {
    "suiteName": { "type": "string", "description": "套件名，LLM 从原始内容提炼" },
    "createdAt": { "type": "string", "format": "date-time" },
    "source": {
      "type": "object",
      "required": ["type", "summary"],
      "properties": {
        "type": { "type": "string", "enum": ["file", "url", "paste", "mixed"] },
        "summary": { "type": "string", "description": "原始输入摘要，≤200字" },
        "paths": { "type": "array", "items": { "type": "string" } }
      }
    },
    "cases": {
      "type": "array",
      "items": { "$ref": "#/definitions/TestCase" }
    }
  },
  "definitions": {
    "TestCase": {
      "type": "object",
      "required": ["id", "title", "type", "steps", "expected", "status"],
      "properties": {
        "id": { "type": "string", "pattern": "^TC-\\d{3,}$", "description": "如 TC-001" },
        "title": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ["web"] },
        "preconditions": { "type": "string", "description": "前置条件，可为空" },
        "steps": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/Step" }
        },
        "expected": { "type": "string", "description": "期望结果" },
        "status": { "type": "string", "enum": ["pending", "passed", "failed", "preview"] },
        "reason": { "type": "string", "description": "preview/failed 时必填，说明原因" },
        "evidence": {
          "type": "array",
          "items": { "type": "string" },
          "description": "证据路径，如 tmp/screenshot-TC-001.png / har"
        },
        "durationMs": { "type": "number", "description": "执行耗时，执行后填充" }
      }
    },
    "Step": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": { "type": "string", "enum": ["open", "click", "input", "assert", "custom"] },
        "target": { "type": "string", "description": "选择器 / URL / 断言对象" },
        "value": { "type": "string", "description": "输入值 / 请求体 / 期望值" },
        "description": { "type": "string", "description": "人类可读步骤说明" }
      }
    }
  }
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `suiteName` | ✓ | 从原始内容提炼，如“登录模块回归” |
| `source` | ✓ | 记录原始输入类型与摘要，便于追溯 |
| `cases[].type` | ✓ | 当前仅支持 `web` |
| `cases[].status` | ✓ | 初始 `pending`，执行后更新；仅 4 种 |
| `cases[].reason` | preview/failed 时必填 | 人工审查依据 |

## 示例

```json
{
  "suiteName": "CoolShop 登录回归",
  "createdAt": "2026-08-27T07:15:00.000Z",
  "source": { "type": "file", "summary": "来源于 docs/prd.md 与 src/login", "paths": ["docs/prd.md"] },
  "cases": [
    {
      "id": "TC-001",
      "title": "正确账号密码应登录成功并跳转首页",
      "type": "web",
      "preconditions": "用户未登录",
      "steps": [
        { "action": "open", "target": "https://example.com/login", "description": "打开登录页" },
        { "action": "input", "target": "#username", "value": "test_user", "description": "输入用户名" },
        { "action": "input", "target": "#password", "value": "123456", "description": "输入密码" },
        { "action": "click", "target": "#login-btn", "description": "点击登录" },
        { "action": "assert", "target": "url", "value": "https://example.com/home", "description": "断言跳转首页" }
      ],
      "expected": "跳转到 /home 且显示用户名",
      "status": "pending"
    },
    {
      "id": "TC-002",
      "title": "空密码应提示校验错误",
      "type": "web",
      "steps": [
        { "action": "open", "target": "https://example.com/login", "description": "打开登录页" },
        { "action": "input", "target": "#username", "value": "test_user", "description": "输入用户名" },
        { "action": "click", "target": "#login-btn", "description": "未填密码直接点击登录" },
        { "action": "assert", "target": "#error-msg", "value": "Password is required", "description": "断言校验提示" }
      ],
      "expected": "显示“Password is required”",
      "status": "pending"
    },
    {
      "id": "TC-003",
      "title": "扫码登录需人工复核",
      "type": "web",
      "steps": [
        { "action": "open", "target": "https://example.com/qr-login", "description": "打开扫码页" },
        { "action": "custom", "target": "qr-code", "description": "需真机扫码" }
      ],
      "expected": "扫码后登录成功",
      "status": "preview",
      "reason": "需要真机扫码，自动化无法完成，需人工审查"
    }
  ]
}
```

## 转化指引（给 LLM）

1. 不限制输入格式，Excel/Markdown/PDF/源码/URL 均可。
2. 按功能模块聚类生成 `cases`，`id` 连续编号。
3. 无法确定 `target/value` 时不要臆造，用 `custom` + `description` 并标 `preview`。
4. `type` 仅为 `web`；`steps[].action` 仅可用 `open`/`click`/`input`/`assert`/`custom`。
