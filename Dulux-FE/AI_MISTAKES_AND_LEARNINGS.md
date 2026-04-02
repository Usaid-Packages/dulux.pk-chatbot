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

### 2026-04-02 15:34 - Hook naming and scope

- Issue: Hook names were too verbose (`*Action`) and one hook mixed multiple concerns.
- Fix: Renamed to `useLogin`, `useForgotPassword`, `useLogout`; kept each hook focused.
- Rule: Use short hook names and keep each hook single-purpose.

### 2026-04-02 15:35 - Duplicate error surfaces

- Issue: Forgot-password error shown in both toast and inline component.
- Fix: Kept inline form error for this flow; removed duplicate toast error.
- Rule: Show one primary error surface per flow unless explicitly required.

### 2026-04-02 15:36 - Unnecessary wrapper handlers

- Issue: Added extra click wrapper functions where direct handler binding was enough.
- Fix: Bound handlers directly in JSX when signatures already match.
- Rule: Avoid wrapper functions unless argument shaping or extra logic is needed.

### 2026-04-02 15:37 - Context hook naming clarity

- Issue: Context hook name was ambiguous.
- Fix: Renamed to `useAuthContext` and updated all imports/usages.
- Rule: Context hooks should include `Context` in the name for clarity.

### 2026-04-02 15:44 - Refresh token flow missing

- Issue: Access token was not auto-refreshed on `401`.
- Fix: Added `refresh` endpoint and axios interceptor refresh+retry flow.
- Rule: Auth clients must include safe refresh-token retry and cleanup on refresh failure.

## Final Check (Before Submit)

- PRD + standards aligned.
- Correct folder placement.
- No `any`, explicit exported return types.
- No inline JSX handlers/styles.
- Lint/build/tests run with `yarn`.
- Generic PR comments logged in this file.
