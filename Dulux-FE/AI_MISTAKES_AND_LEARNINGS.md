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
- Type Radix / shadcn-style wrappers with `React.forwardRef<React.ElementRef<typeof Primitive.*>,
  React.ComponentPropsWithoutRef<typeof Primitive.*>>` (or intrinsic HTML element equivalents for tables).
- Import `cn` from `#/utils`, not `#/utils/utils`.
- Add new files with `git add` before running pre-commit hooks so lint-staged stash restore cannot fail on “untracked
  file would be overwritten”.

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

### 2026-04-03 12:05 - ESLint import-order crash on new dashboard files

- Issue: `eslint-plugin-import` crashed with `sourceCode.getTokenOrCommentAfter is not a function` on newly added
  dashboard files.
- Fix: Added narrow file-level overrides `/* eslint import/order: off */` only on impacted files (e.g.
  `dashboardFlowConfigs.ts`, `dashboardService.ts`, `DashboardFlowGrid.tsx`, `DashboardPage.tsx`) to unblock lint.
- Rule: When this toolchain crash appears, apply the smallest possible file-level override and keep import structure
  otherwise clean; track upgrading `@eslint-community/eslint-plugin-import` or ESLint alignment separately.

### 2026-04-03 14:10 - Endpoint/query-key ownership drifted into data-layer

- Issue: Added registration endpoint/query-key resolver files under `src/data-layer/registrations/` instead of keeping
  ownership in constants.
- Fix: Moved all registration endpoint and query-key definitions/aliases into `src/constants/apiEndpoints.ts` and
  `src/constants/queryKeys.ts`; removed data-layer resolver files.
- Rule: Data-layer can consume constants only; endpoint and query-key definitions must stay in constants files.

### 2026-04-03 18:00 - Detail route config embedded in `createBrowserRouter.tsx`

- Issue: `DETAIL_ROUTE_CONFIGS` and `DetailRouteConfig` lived next to router setup, bloating the router module and
  mixing concerns.
- Fix: Moved configs to `src/constants/detailRouteConfigs.ts` and `DetailRouteConfig` to `src/types/routes.types.ts`;
  re-exported via the constants barrel; router imports `DETAIL_ROUTE_CONFIGS` only.
- Rule: Shared route metadata and arrays belong in `src/constants/**` with shapes in `src/types/**`, not in the router
  file.

### 2026-04-03 18:05 - Untyped `forwardRef` on Radix UI wrappers

- Issue: `Dialog`, `Select`, and similar components used `React.forwardRef` without generics, producing
  `ForwardedRef<unknown>`, missing `className`/`children`/`position` on props, and ref mismatches vs Radix.
- Fix: Applied `React.ElementRef<typeof DialogPrimitive.*>` and `React.ComponentPropsWithoutRef<typeof DialogPrimitive.*>`
  (same pattern for `@radix-ui/react-select` primitives).
- Rule: Every Radix primitive wrapper must use the ElementRef + ComponentPropsWithoutRef pattern so refs and DOM props
  match the underlying component.

### 2026-04-03 18:10 - Table and pagination components implicitly typed as `{}`

- Issue: `Table` section components and `Pagination` used untyped `forwardRef`/props, so `className` was invalid and
  `PaginationLink` treated `isActive` as required for children like `PaginationPrevious`.
- Fix: Table: `forwardRef` with `HTMLTableElement`, `HTMLTableSectionElement`, `ThHTMLAttributes`/`TdHTMLAttributes`, etc.
  Pagination: exported `PaginationLinkProps` with `isActive?: boolean` defaulting to `false`; nav links omit fixed
  `size`/`children` via `Omit<…>`.
- Rule: Intrinsic table/pagination elements need explicit HTML prop types; optional props with defaults must be marked
  optional in the interface when callers do not pass them.

### 2026-04-03 18:12 - `cn` imported from deep util path

- Issue: Several UI files used `import { cn } from '#/utils/utils'` instead of the project barrel.
- Fix: Switched imports to `#/utils`.
- Rule: Use `#/utils` for `cn` and shared helpers so paths stay consistent with the rest of the codebase.

### 2026-04-03 18:15 - lint-staged stash restore blocked by untracked duplicate path

- Issue: `lint-staged` stashed work, then Git refused to restore because an untracked `src/components/ui/index.ts` would
  be overwritten by the stash pop; working tree looked “empty” for new components until stash was applied manually.
- Fix: Removed or moved the conflicting untracked file, then `git stash apply` on `lint-staged automatic backup`.
- Rule: `git add` new files (or avoid duplicate untracked paths) before hooks run; if restore fails, recover from
  `git stash list` and apply the lint-staged backup stash after resolving the path conflict.

### 2026-04-03 15:30 - ESLint import-order crash on product catalog module files

- Issue: `eslint-plugin-import` crashed with `sourceCode.getTokenOrCommentBefore is not a function` on newly added
  product catalog files (for example `ProductCreatePage.tsx`), causing lint to exit before reporting normal findings.
- Fix: Added narrow file-level overrides `/* eslint import/order: off */` on the new product module files only, then
  ran Prettier and lint again to keep formatting and rules clean.
- Rule: When this toolchain crash appears on new feature files, isolate the workaround at file scope only for the
  impacted files and keep all other lint rules active.

### 2026-04-03 15:40 - Maximum update depth loop from unstable fallback arrays

- Issue: In `ProductsListPage`, `products` used `query.data?.results ?? []`, creating a new array each render when
  data was empty/loading. A `useEffect([products])` then called `setSelectedProductIds`, causing repeated updates and
  React's "Maximum update depth exceeded".
- Fix: Replaced inline fallback arrays with stable module-level constants and added an equality guard in the setter to
  return previous state when filtered ids are unchanged.
- Rule: Never use inline `?? []`/`?? {}` fallbacks as effect dependencies when those effects call state setters;
  always use stable constants or memoized values and skip no-op state updates.

### 2026-04-03 16:20 - Product admin actions hidden due role-value mismatch

- Issue: Product catalog management buttons used strict role equality against a single format, so Add/Edit/Delete
  controls could disappear when role casing/format differed (for example `admin` vs `ADMIN`).
- Fix: Centralized role check for product admin access with normalized lowercase matching and safe fallback handling.
- Rule: Always normalize role values before permission checks; never rely on one hardcoded case variant in UI gating.

## Final Check (Before Submit)

- PRD + standards aligned.
- Correct folder placement.
- No `any`, explicit exported return types.
- No inline JSX handlers/styles.
- Lint/build/tests run with `yarn`.
- Generic PR comments logged in this file.
