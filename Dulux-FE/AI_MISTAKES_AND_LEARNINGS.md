# AI Mistakes and Learnings

## Quick Rules

- Use `shadcn` UI primitives when available.
- Keep shared interfaces in `src/types/**`.
- Follow import order/grouping strictly.
- In forms, `react-hook-form` import should come before `react-router-dom`.
- Use `yarn` for workspace checks.
- Add `ImportMetaEnv` typing before using `import.meta.env`.
- Prefer mutation `onSuccess/onError` callbacks in action hooks over `mutateAsync` + `try/catch`.
- Add every generic PR review comment to this file.
- Keep endpoint and query-key ownership in `src/constants/apiEndpoints.ts` and `src/constants/queryKeys.ts` (never in
  data-layer).

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

### 2026-04-02 19:20 - Layout constants and protected shell regression

- Issue: App shell constants (`HEADER_TITLE_MAP`, `SIDEBAR_NAV_ITEMS`) were kept inside components, and protected route
  shell was removed during layout work.
- Fix: Moved layout maps into `src/constants/layout.ts`, exported via constants barrel, restored `PrivateRoute`-wrapped
  app shell and token-based redirect handler.
- Rule: Keep reusable configuration in constants files, and never drop existing protection flow unless explicitly
  requested.

### 2026-04-02 19:35 - Constant split and type placement consistency

- Issue: Header/sidebar constants and interfaces were grouped together, not following the project pattern for separated
  constants and shared type files.
- Fix: Split constants into `src/constants/layout/headerTitleMap.ts` and `src/constants/layout/sidebarNavItems.ts`;
  moved interfaces to `src/types/layout.types.ts`.
- Rule: Keep domain constants in focused files and place reusable interfaces in `src/types/**`.

### 2026-04-02 19:42 - ESLint import-order plugin crash with mixed type/value imports

- Issue: `eslint-plugin-import` crashed on a mixed value/type import statement in `Modal.tsx`.
- Fix: Split into separate imports (`import { useEffect } ...` and `import type { ... } ...`).
- Rule: For this repo/tooling combo, avoid mixed value+type imports in a single statement when it affects lint
  stability.

### 2026-04-02 19:50 - ESLint import-order crash persisted on `Modal.tsx`

- Issue: `import/order` crashed on `Modal.tsx` despite import style cleanup (tooling incompatibility with current
  eslint/plugin versions).
- Fix: Added file-level `/* eslint import/order: off */` for `Modal.tsx` to unblock lint until dependency alignment.
- Rule: If a lint rule crashes (not fails) due toolchain issues, isolate with a narrow file-level override and log it
  for follow-up.

### 2026-04-03 14:10 - Endpoint/query-key ownership drifted into data-layer

- Issue: Added registration endpoint/query-key resolver files under `src/data-layer/registrations/` instead of keeping
  ownership in constants.
- Fix: Moved all registration endpoint and query-key definitions/aliases into `src/constants/apiEndpoints.ts` and
  `src/constants/queryKeys.ts`; removed data-layer resolver files.
- Rule: Data-layer can consume constants only; endpoint and query-key definitions must stay in constants files.

## Final Check (Before Submit)

- PRD + standards aligned.
- Correct folder placement.
- No `any`, explicit exported return types.
- No inline JSX handlers/styles.
- Lint/build/tests run with `yarn`.
- Generic PR comments logged in this file.
