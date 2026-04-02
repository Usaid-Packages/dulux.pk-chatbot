# AI Mistakes and Learnings

## Quick Rules

- Use `shadcn` UI primitives when available.
- Keep shared interfaces in `src/types/**`.
- Follow import order/grouping strictly.
- Use `yarn` for workspace checks.
- Add `ImportMetaEnv` typing before using `import.meta.env`.
- Prefer mutation `onSuccess/onError` callbacks in action hooks over `mutateAsync` + `try/catch`.
- Add every generic PR review comment to this file.

## Mistake Log (Short)

### 2026-04-02 12:40 - Import order + ImportMeta typing
- Issue: `import/order` violations and missing `ImportMetaEnv`.
- Fix: Reordered imports and added env typings in `src/types/env.d.ts`.
- Rule: Run import-order pass + env typing check before final output.

### 2026-04-02 12:58 - Raw input used
- Issue: Used native `<input>` in auth field.
- Fix: Replaced with `#/components/ui/Input`.
- Rule: Use `shadcn` controls by default.

### 2026-04-02 13:08 - Interface in helper file
- Issue: `ApiErrorShape` declared in `src/utils/helperFunctions.ts`.
- Fix: Moved to `src/types/common/error.types.ts`.
- Rule: Keep reusable interfaces in `src/types/**`.

### 2026-04-02 13:36 - Async mutation pattern in action hooks
- Issue: Used `mutateAsync` in auth action hooks where callback style was preferred.
- Fix: Switched to `mutate(values, { onSuccess, onError })`.
- Rule: For generic action hooks, default to mutation callbacks and avoid `mutateAsync` unless explicitly needed.

### 2026-04-02 13:37 - Missed logging PR generic comments
- Issue: Not all generic PR comments were recorded in this file.
- Fix: Added a persistent quick rule and this log entry.
- Rule: Every generic PR review comment must be appended here.

## Final Check (Before Submit)

- PRD + standards aligned.
- Correct folder placement.
- No `any`, explicit exported return types.
- No inline JSX handlers/styles.
- Lint/build/tests run with `yarn`.
- Generic PR comments logged in this file.
