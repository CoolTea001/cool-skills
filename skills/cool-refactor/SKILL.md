---
name: cool-refactor
description: Use when the user asks to optimize, refactor, clean up, improve readability, unify code conventions, or fix code smells. Emphasizes understanding context first, preserving behavior, small steps, and verification-driven changes; avoids unrelated refactors, over-abstraction, and test cheating.
---

<!-- Copyright 2026 CoolTea. Licensed under MIT. -->

# Cool Refactor — Behavior-Preserving Code Optimization

## Goal

Without changing **externally observable behavior**, improve the code's conventions, logic, and readability so it becomes clearer, more consistent, more maintainable, and more verifiable.

Default optimization order:

1. Correctness & safety
2. Behavior preservation
3. Verifiability
4. Readability
5. Project consistency
6. Performance (only after measurement, handled separately)

## When to Use

- The user says "optimize this code", "refactor it", "clean up the smells"
- The user asks to improve readability or maintainability
- The user asks to unify naming, formatting, error handling, or types
- The user asks to reduce duplication, flatten nesting, or split long functions
- The user asks to make code match the project's existing style

## When Not to Use, or Confirm First

- The change touches a public API, database schema, config format, or response shape
- The change alters business rules, error semantics, or side-effect order
- The change upgrades dependencies, replaces frameworks, or does large-scale renaming
- There are no tests and behavior cannot be verified
- The user just says "optimize" without a scope

In these cases: state the risks, propose a small-scope plan, and ask the user when needed.

## Core Principles

1. **Read before editing**: read the README, config, neighboring code, tests, and callers.
2. **Behavior preservation first**: by default, change only internal quality, never external behavior.
3. **Small, atomic steps**: handle one topic at a time; keep the diff reviewable.
4. **Verification-driven**: run tests when you can; if you cannot, say so explicitly.
5. **Minimal change**: no unrelated formatting, renaming, or dependency upgrades.
6. **Follow project conventions**: naming, directories, imports, types, and error handling all start from existing code.
7. **Readability over cleverness**: explicit beats implicit, simple beats showy.
8. **Do not hide errors**: no empty catches, no `any` abuse, no disabling lint rules.
9. **No premature abstraction**: abstract only after three or more repetitions, when the concept is stable and nameable.
10. **Ask when unsure**: never guess business rules, compatibility requirements, or hidden callers.

## Workflow

### 1. Recon

Gather information first; do not start editing:

- Language, framework, version, package manager
- Formatting, lint, type-check, and test commands
- Directory structure and module boundaries
- Public APIs, exported interfaces, and callers
- Existing naming, error-handling, and logging styles
- Whether the current tests pass

If the project has tests, run the baseline first. If the baseline fails, record which failures are pre-existing.

### 2. Define Boundaries

Make explicit:

- What is being optimized in this pass?
- What is out of scope?
- What is the acceptance criterion?
- Must behavior stay exactly the same?
- Are internal interfaces allowed to change?

If the request is vague, propose a minimal scope and confirm it.

### 3. Make a Small-Step Plan

List 3–7 small steps in priority order, for example:

1. Extract magic values into constants
2. Use early returns to reduce nesting
3. Rename over-generic variables
4. Extract a duplicated validation function
5. Add error context
6. Run tests and type checks

Each step should be independently explainable and independently revertible.

### 4. Apply Changes One at a Time

While editing:

- Handle one smell per change
- Do not mix formatting with logic changes
- Do not touch unrelated files
- Preserve the original intent of comments; delete stale ones
- Search for references before deleting dead code
- When changing a public interface, update callers, tests, and docs together

### 5. Verify

Run whatever the project actually supports:

- Unit / integration tests
- Type checks
- Lint / format
- Build
- Manual verification of critical paths
- Review the diff to confirm it contains only intended changes

If you cannot run something, explain: why not, what the risk is, and what the user should run.

### 6. Report

Reports must be truthful, short, and actionable. Never write "done" without evidence.

## Optimization Checklist

### Code Conventions

- [ ] Naming follows project style and expresses business meaning
- [ ] No generic names like `data`, `temp`, `obj`, `flag`
- [ ] Imports have no unused entries, no wildcards, no circular dependencies
- [ ] Types are explicit; no `any` / `Any` / `# type: ignore` abuse
- [ ] Magic values are extracted into constants, enums, or config
- [ ] Comments explain "why", not repeat "what"
- [ ] Error handling carries context; no empty catches
- [ ] Functions and files have a single responsibility
- [ ] No unrelated formatting noise

### Code Logic

- [ ] Edge cases handled: null, zero, negative, oversized, timeout, concurrency, permissions
- [ ] Early returns or guard clauses avoid deep nesting
- [ ] Duplicated logic is extracted, but without over-abstraction
- [ ] Side effects are explicit; function names reveal DB writes, network calls, state changes
- [ ] Resources are released on exceptional paths too
- [ ] Async calls are awaited correctly and errors are handled
- [ ] `null` / `undefined` / empty string / `0` semantics are clear in data transforms
- [ ] No obvious issues like queries in loops or N+1 requests
- [ ] Business rules are not scattered across layers
- [ ] External input is validated

### Code Readability

- [ ] Functions are small and single-purpose
- [ ] Variable scope is narrow; no repeated reuse
- [ ] No premature abstraction
- [ ] No multiple statements per line, complex nested ternaries, or overlong call chains
- [ ] Module boundaries are clear; no catch-all utility module
- [ ] Error messages include the operation, object, and key parameters
- [ ] Dead code and commented-out code are removed
- [ ] Test names state behavior; tests verify core logic rather than being all mocks

## Code Smell → Fix Mapping

| Smell | Preferred fix |
|---|---|
| Long function | Extract meaningful sub-functions; keep a single responsibility |
| Deep nesting | Early return, guard clauses, extracted predicate functions |
| Duplicated code | Extract function / constant / strategy, but avoid premature abstraction |
| Generic naming | Rename to express clear business meaning |
| Magic values | Constants, enums, config |
| Empty catch | Handle it, add context, rethrow, or log |
| `any` abuse | Add types; isolate temporarily and annotate why |
| Hardcoding | Move to config, but do not over-configure |
| Queries in loops | Batch queries, preload, cache |
| Global state | Explicit parameters, dependency injection |
| Redundant comments | Delete; when needed, explain "why" |
| Large diff | Split into small commits; separate formatting from logic |

## Decision Rules

- **When to abstract**: repetition ≥ 3, stable concept, a good name exists, future changes move in the same direction.
- **When not to abstract**: appears once, hard to name, only "might be useful later".
- **When to change behavior**: the user explicitly asks, and tests, callers, and migration notes are updated.
- **When not to optimize**: no tests and no way to verify — add tests first or narrow the scope.
- **When to stop**: the diff starts growing, the goal gets vague, unrelated changes appear.

## Output Template

```markdown
## Optimization Report

### Goal
- Scope:
- Preserved:

### Changes
- File:
  - Type: conventions / logic / readability
  - Description:
- File:
  - Type:
  - Description:

### Verification
- Commands:
- Results:
- Not run, and why:

### Risks & Unverified
-

### Follow-ups
-
```

## Prohibited

- Claiming "done" or "tests pass" without running verification
- Deleting tests, weakening assertions, or adding skips just to make tests green
- Empty catches, swallowed exceptions, `any` used to escape the type system
- Large-scale formatting, renaming, and refactoring mixed into one change
- Changing a public interface without updating callers
- Adding a new dependency for a small problem
- Over-abstraction and over-engineering
- Touching unrelated files along the way
- Guessing business rules and implementing them directly
- Deleting code that looks unused but may be referenced dynamically

## Quick Self-Check

After every change, ask yourself:

1. Did I read the context?
2. Can I explain every change?
3. Does external behavior stay unchanged?
4. Do the names convey meaning?
5. Did I remove duplication, magic values, deep nesting, empty catches?
6. Did I run the available verification?
7. Is the diff minimal and focused?
8. Did I update tests, docs, or callers?
9. Did I introduce any new over-abstraction?
10. If I were the reviewer, would I approve this diff?
