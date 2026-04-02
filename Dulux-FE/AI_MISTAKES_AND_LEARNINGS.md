# AI Mistakes and Learnings

This file tracks mistakes made during development/review, why they happened, and the prevention rule to avoid repeating them.

## Operating Baseline (Read and Follow Every Task)

- Source of truth:
  - `docs/PRD.md`
  - `Dulux-FE/AGENTS.MD`
  - `Dulux-FE/AGENTS_ENGINEERING_STANDARDS.md`
- Frontend stack: Vite + React + TypeScript.
- Architecture constraints:
  - `src/components/ui`: atomic UI only, no business logic.
  - `src/components/forms`: form UIs typed by Zod schemas in `src/schemas`.
  - `src/pages`: composition only, no business logic.
  - `src/hooks`: logic only, no JSX, names start with `use`.
  - `src/services`: API clients only via `axiosInstance.ts`.
  - `src/schemas`: Zod schemas.
  - `src/types`: shared and API types.
  - `src/utils`: pure helpers only.

- Code quality constraints:
  - No `any`.
  - Explicit return types for exported functions/components.
  - Destructure props and values where appropriate.
  - No inline arrow functions in JSX; define named handlers.
  - No inline styles; use Tailwind/CSS.
  - No magic numbers/strings; extract constants/enums.
  - Function components only; one component per file; keep file size focused.
  - Add concise JSDoc for components and brief comments for non-trivial logic.
- Testing and validation:
  - Add/update tests for reusable components/hooks.
  - Run lint/tests/build checks for touched scope before finalizing.

## Mistake Log

Use this format for every new mistake:

### YYYY-MM-DD - <Short title>

- Context:
- Mistake:
- Root cause:
- Impact:
- Prevention rule:
- Checklist update:
- Verification performed:

---

### 2026-04-02 - Import order and import.meta typing gaps

- Context: Auth flow implementation (`components/auth/*`, `services/authService.ts`).
- Mistake: Broke `import/order` rules (internal import order and grouping) and used `import.meta.env` without global `ImportMeta` typings.
- Root cause: I validated build output but did not perform a strict pass for import-order conventions and missing TS ambient declarations for Vite env access.
- Impact: ESLint violations and TypeScript error `Property 'env' does not exist on type 'ImportMeta'`.
- Prevention rule: Before finalizing, enforce import grouping/order in every touched file (external -> internal -> relative, no empty lines inside a group) and ensure new `import.meta.env` usage is backed by `ImportMetaEnv` declaration.
- Checklist update: Added explicit pre-final checks for import ordering and `ImportMeta` typings when using Vite env variables.
- Verification performed: Reordered imports in auth forms and added `ImportMetaEnv`/`ImportMeta` declarations in `src/types/env.d.ts`.
- not the npm run build instead yarn run build

---

### 2026-04-02 - Raw input used instead of shadcn Input

- Context: Auth UI field abstraction in `src/components/auth/AuthInputField.tsx`.
- Mistake: Implemented form input with native `<input>` instead of using the `shadcn` `Input` component.
- Root cause: I did not first check existing UI primitives in `src/components/ui`.
- Impact: Inconsistent design system usage and styling drift risk.
- Prevention rule: Always use `shadcn` UI components from `src/components/ui` when an equivalent component exists; use raw HTML controls only when there is no shared UI primitive.
- Checklist update: Added a mandatory design-system check before finalizing UI/form work.
- Verification performed: Replaced native `<input>` with `#/components/ui/Input` in auth form field component.

---

### 2026-04-02 13:25 - Use one-line function when suitable

- Context: Small handlers and helper wrappers.
- Mistake: Wrote multi-line functions where one-line arrow functions were sufficient.
- Root cause: Inconsistent function-style decisions during quick edits.
- Impact: Unnecessary verbosity and less readable compact handlers.
- Prevention rule: Use one-line arrow functions for simple single-action handlers/helpers; use block body only when needed.
- Checklist update: Added function-style check before final output.
- Verification performed: Applied this style preference in follow-up edits.

---

## Preventive Checklist (Run Before Final Output)

- Confirm solution aligns with `docs/PRD.md` business flow.
- Confirm folder placement and architecture rules.
- Confirm no `any`, no unsafe null usage, and explicit exported return types.
- Confirm no inline JSX arrow handlers and no inline styles.
- Confirm constants are extracted for magic values.
- Confirm accessibility basics (labels, semantics, keyboard, alt/aria where relevant).
- Confirm API calls are only in service layer via `axiosInstance.ts`.
- Confirm tests are added/updated for reusable logic and pass for touched scope.
- Confirm lint passes for touched files.
- Confirm import order/grouping follows ESLint rules in all touched files.
- Confirm `ImportMetaEnv` typing exists for any new `import.meta.env` usage.
- Confirm `shadcn` UI primitives are used for controls (Input, Button, etc.) when available.
- Confirm one-line functions are used where suitable.
