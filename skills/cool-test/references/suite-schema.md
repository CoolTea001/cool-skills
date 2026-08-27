<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Suite JSON Schema

> Fixed-format test suite with flat timestamp naming: `suite-YYYYMMDD-HHmmss.json` and `report-YYYYMMDD-HHmmss.json` share the same structure; report additionally contains execution results.

## JSON Schema (Draft 07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CoolTestSuite",
  "type": "object",
  "required": ["suiteName", "createdAt", "source", "cases"],
  "properties": {
    "suiteName": { "type": "string", "description": "Suite name, extracted by LLM from source content" },
    "createdAt": { "type": "string", "format": "date-time" },
    "source": {
      "type": "object",
      "required": ["type", "summary"],
      "properties": {
        "type": { "type": "string", "enum": ["file", "url", "paste", "mixed"] },
        "summary": { "type": "string", "description": "Summary of original input, ≤200 chars" },
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
        "id": { "type": "string", "pattern": "^TC-\\d{3,}$", "description": "e.g. TC-001" },
        "title": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ["web"] },
        "preconditions": { "type": "string", "description": "Preconditions, may be empty" },
        "steps": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/Step" }
        },
        "expected": { "type": "string", "description": "Expected result" },
        "status": { "type": "string", "enum": ["pending", "passed", "failed", "preview"] },
        "reason": { "type": "string", "description": "Required when preview/failed, explains the reason" },
        "evidence": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Evidence paths, e.g. tmp/screenshot-TC-001.png / har"
        },
        "durationMs": { "type": "number", "description": "Execution time, filled after run" }
      }
    },
    "Step": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": { "type": "string", "enum": ["open", "click", "input", "assert", "custom"] },
        "target": { "type": "string", "description": "Selector / URL / assertion target" },
        "value": { "type": "string", "description": "Input value / request body / expected value" },
        "description": { "type": "string", "description": "Human-readable step description" }
      }
    }
  }
}
```

## Field Description

| Field | Required | Description |
|------|----------|-------------|
| `suiteName` | ✓ | Extracted from source, e.g. "Login Regression" |
| `source` | ✓ | Original input type and summary for traceability |
| `cases[].type` | ✓ | Currently only `web` is supported |
| `cases[].status` | ✓ | Initial `pending`, updated after execution; 4 values only |
| `cases[].reason` | Required when preview/failed | Basis for manual review |

## Example

```json
{
  "suiteName": "CoolShop Login Regression",
  "createdAt": "2026-08-27T07:15:00.000Z",
  "source": { "type": "file", "summary": "From docs/prd.md and src/login", "paths": ["docs/prd.md"] },
  "cases": [
    {
      "id": "TC-001",
      "title": "Valid credentials should login and redirect to home",
      "type": "web",
      "preconditions": "User not logged in",
      "steps": [
        { "action": "open", "target": "https://example.com/login", "description": "Open login page" },
        { "action": "input", "target": "#username", "value": "test_user", "description": "Input username" },
        { "action": "input", "target": "#password", "value": "123456", "description": "Input password" },
        { "action": "click", "target": "#login-btn", "description": "Click login" },
        { "action": "assert", "target": "url", "value": "https://example.com/home", "description": "Assert redirect to home" }
      ],
      "expected": "Redirect to /home and show username",
      "status": "pending"
    },
    {
      "id": "TC-002",
      "title": "Empty password should show validation error",
      "type": "web",
      "steps": [
        { "action": "open", "target": "https://example.com/login", "description": "Open login page" },
        { "action": "input", "target": "#username", "value": "test_user", "description": "Input username" },
        { "action": "click", "target": "#login-btn", "description": "Click login without password" },
        { "action": "assert", "target": "#error-msg", "value": "Password is required", "description": "Assert validation message" }
      ],
      "expected": "Show 'Password is required'",
      "status": "pending"
    },
    {
      "id": "TC-003",
      "title": "QR login requires manual review",
      "type": "web",
      "steps": [
        { "action": "open", "target": "https://example.com/qr-login", "description": "Open QR login page" },
        { "action": "custom", "target": "qr-code", "description": "Requires physical device scan" }
      ],
      "expected": "Login succeeds after scan",
      "status": "preview",
      "reason": "Requires physical QR scan, cannot be automated, needs manual review"
    }
  ]
}
```

## Conversion Guide (for LLM)

1. No input format restriction — Excel/Markdown/PDF/source/URL all accepted.
2. Group `cases` by feature module, number `id` sequentially.
3. When `target/value` cannot be determined, do not hallucinate — use `custom` + `description` and mark as `preview`.
4. `type` is `web` only; `steps[].action` must be one of `open`/`click`/`input`/`assert`/`custom`.
