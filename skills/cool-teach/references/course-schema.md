<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Course Schema

> Fixed schemas for `courses.json` / `course.json` / `progress.json`. Slug and file naming are validated before write.

## Global Index — `.coolteach/courses.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CoolTeachIndex",
  "type": "object",
  "required": ["version", "generatedAt", "courses"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "generatedAt": { "type": "string", "format": "date-time" },
    "courses": {
      "type": "array",
      "items": { "$ref": "#/definitions/CourseRef" }
    }
  },
  "definitions": {
    "CourseRef": {
      "type": "object",
      "required": ["slug", "title", "status"],
      "properties": {
        "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$", "minLength": 2, "maxLength": 40 },
        "title": { "type": "string", "minLength": 1, "maxLength": 120 },
        "status": { "type": "string", "enum": ["active", "archived"] }
      }
    }
  }
}
```

Example:

```json
{
  "version": 1,
  "generatedAt": "2026-09-01T15:10:00.000Z",
  "courses": [
    { "slug": "seo", "title": "SEO 实战：让独立站自然流量翻倍", "status": "active" },
    { "slug": "rust-cli", "title": "Rust CLI 实战", "status": "active" }
  ]
}
```

Rules:
- Slug is the sole filesystem identifier: `.coolteach/courses/<slug>/`.
- If `courses.json` and directories diverge, the index wins; missing dirs are repaired on next `list`.

## Course — `.coolteach/courses/<slug>/course.json` (mission embedded)

Mission is embedded in `course.json:mission` — no separate `MISSION.md` is created (legacy `MISSION.md` files are tolerated but not required).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CoolTeachCourse",
  "type": "object",
  "required": ["version", "slug", "title", "status", "createdAt", "updatedAt", "mission"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "title": { "type": "string", "minLength": 1, "maxLength": 120 },
    "description": { "type": "string", "maxLength": 500 },
    "status": { "type": "string", "enum": ["active", "archived"] },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "mission": {
      "type": "object",
      "required": ["why", "success", "constraints"],
      "properties": {
        "why": { "type": "string", "description": "1-3 sentences: concrete real-world outcome, not 'to learn X'" },
        "success": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 3 },
        "constraints": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

Rules:
- Interview is blocking: do not create the course directory until `mission.why` / `mission.success` / `mission.constraints` are filled. Push back on vagueness ("What changes when you can do this?").
- `mission` and `description` must be consistent (`description` is the one-line summary of `mission.why`).
- If the mission changes later, update `course.json:mission` and `course.json:updatedAt`; legacy `MISSION.md` if present should be removed or kept as deprecated.

Example:

```json
{
  "version": 1,
  "slug": "seo",
  "title": "SEO 实战：让独立站自然流量翻倍",
  "description": "从搜索引擎原理到关键词、内容与技术优化，用每周1小时为独立站带来可持续自然流量",
  "status": "active",
  "createdAt": "2026-09-01T15:10:00.000Z",
  "updatedAt": "2026-09-01T15:10:00.000Z",
  "mission": {
    "why": "为独立站带来可持续自然流量，降低对付费投放的依赖",
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


