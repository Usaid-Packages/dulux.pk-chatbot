# Dulux FE Code Quality Audit Plan

Date: 2026-04-15
Scope: `/Dulux-FE` full frontend audit against:
- `AGENTS_ENGINEERING_STANDARDS.md`
- `AI_MISTAKES_AND_LEARNINGS.md`

## 1) Diagnostics Run (Yarn)

Executed from `/Dulux-FE`:
- `yarn install` -> success
- `yarn lint` -> success (0 errors)
- `yarn build` -> success

Build output highlights:
- Main JS chunk: `dist/assets/index-*.js` = **~1,490 KB** (gzip ~436 KB)
- Vite warning: chunk size > 500 KB

Implication:
- Lint/build are green, but bundle-size standard target (`< 200KB main bundle`) is not met.
 
## 2) Priority Findings (Standards + Past Mistakes)

## P0 - Security & Policy

1. Sensitive tokens are persisted in localStorage (policy violation)
- Standards reference: `SECURITY -> Secure Storage: Never store sensitive data in localStorage`
- Evidence:
  - `src/context/AuthContext.tsx`
  - `src/services/axiosInstance.ts`
  - `src/services/refreshTokenService.ts`
  - `src/utils/localStorage.ts`
- Plan: migrate auth storage to secure cookie strategy (httpOnly), keep frontend state token-agnostic.

## P1 - Architecture/Standards Drift

2. Oversized component/page files (violates 300-line component rule)
- Standards reference: `REACT COMPONENT RULES -> File Size Limit <= 300`
- Largest files:
  - `src/components/auditLogs/AuditTimelinePanel.tsx` (~1021)
  - `src/components/registrations/ResubmitUpdateModal.tsx` (~694)
  - `src/components/products/ProductForm.tsx` (~657)
  - `src/pages/products/ProductsListPage.tsx` (~627)
  - `src/components/claims/AddClaimModal.tsx` (~556)
  - `src/components/auditLogs/AuditLogDetailDialog.tsx` (~463)
  - `src/components/manualRegistration/ProductsStep.tsx` (~439)
  - `src/pages/registrations/RegistrationDetailPage.tsx` (~354)

3. Route-level code splitting is not implemented
- Standards reference: `ROUTING -> Lazy Route Loading`
- Evidence: router imports all pages eagerly in `src/routes/createBrowserRouter.tsx`.
- Plan: convert route pages to `React.lazy` boundaries by module.

4. Named-export preference violated in multiple files
- Standards reference: `CODE QUALITY -> Prefer named exports`
- Evidence:
  - `src/App.tsx`
  - `src/services/axiosInstance.ts`
  - `src/hooks/useSentry.ts`
  - `src/components/errorFallback/ErrorFallback.tsx`
- Plan:
  - convert default exports to named exports for app/service/hook/component modules (keep ambient/module declaration exceptions only).
- Status: DONE (2026-04-22) for this ticket scope (`App`, `axiosInstance`, `useSentry`, `ErrorFallback`; declaration-file exceptions retained).

## P1 - Mistakes File Rule Drift

5. `import/order` file-level disables exist despite strict rule
- Mistakes reference: `Never add file-level import/order disable comments`
- Evidence:
  - `src/data-layer/products/queries/useGetProductImagesQuery.ts`
  - `src/data-layer/products/mutations/useRemoveProductImageMutation.ts`
  - `src/data-layer/products/mutations/useAttachProductImageMutation.ts`
- Plan: remove disable comments after import-shape stabilization and plugin alignment.

6. Sidebar Manual Registration item rule mismatch
- Mistakes reference: `Sidebar must include Manual Registration`
- Evidence:
  - Present in `APP_NAVIGATION_ITEMS`
  - Missing in `SIDEBAR_NAV_ITEMS`
  - File: `src/constants/layout/navigation.ts`

## P2 - Maintainability & DRY Opportunities (Less Code, More Output)

7. Repeated list-page scaffolding across modules
- Pattern duplicated in claims/registrations/quality/audit/products:
  - tab/filter shell
  - stats cards
  - empty/loading/error handling
  - pagination controls
- Evidence:
  - `src/pages/claims/ClaimsListPage.tsx`
  - `src/pages/registrations/RegistrationsListPage.tsx`
  - `src/pages/quality/QualityListPage.tsx`
  - `src/pages/auditLogs/AuditLogsPage.tsx`
  - `src/pages/products/ProductsListPage.tsx`
- Plan: create reusable primitives:
  - `ListPageShell`
  - `ListPageStateBlock` (loading/error/empty)
  - `PaginationFooter`
  - `StatsCardGrid`
- Status: DONE (2026-04-22) for DRY-002 via shared `ListStateBlock` (`src/components/shared/ListStateBlock.tsx`) integrated into claims, quality, and audit logs list pages.
- Status: DONE (2026-04-22) for DRY-003 via shared `StatsCardGrid` (`src/components/shared/StatsCardGrid.tsx`) integrated into claims, quality, audit logs, and registrations list pages.

8. Repeated detail-page modal orchestration
- Similar open/close/submit modal patterns in:
  - `src/pages/claims/ClaimDetailPage.tsx`
  - `src/pages/registrations/RegistrationDetailPage.tsx`
  - `src/pages/quality/QualityDetailPage.tsx`
- Plan: introduce reusable `useModalStateMap` helper and common action-panel interfaces.

9. Heavy normalization/util logic concentrated in monolithic helper file
- Evidence: `src/utils/helperFunctions.ts` (~932 lines)
- Plan: split by bounded contexts:
  - `utils/normalizers/registrations.ts`
  - `utils/normalizers/claims.ts`
  - `utils/normalizers/complaints.ts`
  - `utils/normalizers/auditLogs.ts`

10. Explicit return type standard partially violated in exported functions/hooks
- Standards reference: `Explicit Exported Return Types`
- Evidence examples:
  - `src/context/AuthContext.tsx` (`AuthProvider`, `useAuthContext`)
  - `src/routes/PrivateRoute.tsx` (`PrivateRoute`)
  - `src/hooks/auth/useLogin.ts`, `useLogout.ts`, `useForgotPassword.ts`, `useResetPassword.ts`
- Plan: add explicit return types on exported API surface first (hooks/components/routes).

11. Inline arrow handlers in JSX are widespread
- Standards reference: `JAVASCRIPT RULES -> No Arrow Functions in JSX`
- Evidence across multiple modules:
  - claims, registrations, products, complaints, quality, image gallery
- Plan: enforce via lint rule + gradual refactor in touched files.

12. Data Router advanced patterns are not used
- Standards reference: `ROUTING -> React Router v7 Data Routers with loaders/actions`
- Evidence:
  - no `loader`, `action`, `useLoaderData`, `useActionData` usage found in `src/routes` / `src/pages`
- Plan: introduce loader/action usage for route-critical data screens incrementally (start with list pages).

13. Mutations callback convention drift in product pages
- Mistakes reference: prefer `onSuccess` / `onError` callback-driven mutation flow over pervasive `mutateAsync` patterns
- Evidence:
  - `src/pages/products/ProductCreatePage.tsx`
  - `src/pages/products/ProductEditPage.tsx`
- Plan: refactor image upload/attach sequence into callback-oriented mutation orchestration helper.

14. Required project-file compliance gap in FE package root
- Standards reference: `REQUIRED PROJECT FILES -> .github/pull_request_template.md`
- Evidence:
  - missing at `Dulux-FE/.github/pull_request_template.md`
  - exists only at repository root `/.github/pull_request_template.md`
- Plan: add FE-local PR template or formally document monorepo-root template policy exception.

15. One-component-per-file rule drift in shared UI primitives
- Standards reference: `REACT COMPONENT RULES -> One Component Per File`
- Evidence:
  - `src/components/ui/Table.tsx` exports multiple components
  - `src/components/ui/Pagination.tsx` exports multiple components
- Plan: choose one of:
  - split into per-component files, or
  - define explicit standards exception for atomic UI primitive bundles.

16. Page-layer boundary drift (pages importing data-layer directly)
- Standards reference: `ARCHITECTURE -> /src/pages should be page-level composition only`
- Evidence:
  - `src/pages/products/ProductsListPage.tsx`
  - `src/pages/products/ProductCreatePage.tsx`
  - `src/pages/products/ProductEditPage.tsx`
- Plan: move data orchestration into dedicated `src/hooks/products/*` hooks and keep pages as composition-only.

17. Component-layer server-state drift (component using React Query directly)
- Standards reference: `STATE MANAGEMENT / ARCHITECTURE -> server state should be owned in hooks/data-layer, keep components presentation-focused`
- Evidence:
  - `src/components/claims/CsrResubmissionModal.tsx` uses `useQuery` directly.
- Plan: extract query orchestration into `src/hooks/claims/useClaimCsrResubmission.ts` and pass state/handlers into component props.

18. JSDoc coverage is incomplete for exported components
- Standards reference: `REACT COMPONENT RULES -> JSDoc Required for every component`
- Evidence (missing file-level component JSDoc blocks on exported components):
  - `src/pages/products/ProductsListPage.tsx`
  - `src/pages/products/ProductCreatePage.tsx`
  - `src/pages/products/ProductEditPage.tsx`
  - `src/components/products/ProductForm.tsx`
  - `src/components/products/SurfaceTypeTable.tsx`
  - `src/components/products/SurfaceTypeModal.tsx`
  - `src/components/products/ProductTable.tsx`
  - `src/components/products/DeleteConfirmModal.tsx`
  - `src/components/auth/AuthCard.tsx`
- Plan: add concise JSDoc purpose/props comments for all exported components; enforce via lint rule/convention check.
- Status: DONE (2026-04-22) for this ticket scope (products/auth files listed above).

19. Dead/unwired code paths violate clean-code expectations
- Standards reference: `CLEAN CODE -> No dead code`
- Evidence:
  - `src/pages/home/HomePage.tsx` and `src/pages/home/index.ts` (not route-wired)
  - `src/pages/PlaceholderPage.tsx` (not route-wired)
  - `src/components/registrations/RegistrationFilters.tsx` (exported, not consumed)
  - `src/routes/AdminRoute.tsx` (exported, not consumed by router)
  - `src/hooks/useSentry.ts` (exported, not called)
- Plan: either wire these into active flows immediately or remove/archive them to reduce maintenance noise.

20. URL filter state logic is duplicated across multiple hooks/pages
- Standards reference: `DRY`, `Single Responsibility`
- Evidence:
  - `src/hooks/claims/useClaims.ts`
  - `src/hooks/registrations/useRegistrations.ts`
  - `src/hooks/quality/useQualityQueue.ts`
  - `src/hooks/auditLogs/useAuditLogs.ts`
  - `src/pages/products/ProductsListPage.tsx`
- Pattern repeated:
  - `new URLSearchParams(previous)` cloning
  - set/reset page to `1`
  - set/delete search/status/type params
- Plan: introduce shared `useUrlFilters` + `setQueryParam` helpers to centralize query-param mutation rules.
- Status: DONE (2026-04-22) for DRY-004 via shared `useUrlFilters` (`src/hooks/common/useUrlFilters.ts`) integrated into claims, registrations, quality, audit logs, and products filter modules.

21. Mutation toast orchestration is repeated and can be standardized
- Standards reference: `DRY`, `Error handling consistency`
- Evidence:
  - `src/hooks/claims/useClaimDetail.ts`
  - `src/hooks/registrations/useRegistrationDetail.ts`
  - `src/hooks/quality/useQualityDetail.ts`
  - `src/pages/products/ProductsListPage.tsx`
  - `src/pages/products/ProductCreatePage.tsx`
  - `src/pages/products/ProductEditPage.tsx`
- Pattern repeated:
  - mutate + `onSuccess` toast
  - mutate + `onError` toast via `getApiErrorMessage`
- Plan: create reusable mutation wrapper (`withMutationFeedback` / `useMutationFeedback`) to reduce boilerplate.

22. Detail action hooks share near-identical orchestration patterns
- Standards reference: `DRY`, `Single Responsibility`
- Evidence:
  - `src/hooks/claims/useClaimDetail.ts`
  - `src/hooks/quality/useQualityDetail.ts`
  - `src/hooks/registrations/useRegistrationDetail.ts`
- Pattern repeated:
  - guard when detail data missing
  - action mutation execution
  - success/error toast
  - pending aggregation
- Plan: extract shared action-controller helpers for guarded action execution and pending aggregation.

23. Date formatting wrappers are duplicated between claims/quality helpers
- Standards reference: `DRY`, `Avoid unnecessary wrappers`
- Evidence:
  - `src/components/claims/helpers.ts` (`formatDate`, `formatDateTime`)
  - `src/components/quality/helpers.ts` (`formatDate`, `formatDateTime`)
  - both wrap the same `src/utils/date.ts` functions
- Plan: remove duplicate wrappers and import `formatDisplayDate` / `formatDisplayDateTime` directly.

24. Complex monolithic form components contain mixed responsibilities
- Standards reference: `Single Responsibility`, `Break nested JSX`, `Reusability`
- Evidence:
  - `src/components/registrations/ResubmitUpdateModal.tsx`
  - `src/components/claims/AddClaimModal.tsx`
  - `src/components/products/ProductForm.tsx`
- Complexity drivers:
  - schema wiring + field rendering + option derivation + normalization + UI composition in one file
- Plan: split into:
  - container hook (`use*FormController`)
  - declarative section components (`*Section.tsx`)
  - shared field adapters for repeated Select/Input + error rendering.

25. UI layer reuse inconsistency (mixed barrel vs deep imports)
- Standards reference: `Code organization consistency`, `Reusable component usage`
- Evidence:
  - mixed patterns across codebase:
    - `from '#/components/ui'`
    - `from '#/components/ui/Button'`
    - `from '#/components/ui/Input'`
    - `from '#/components/ui/Table'`
- Impact:
  - harder refactors and weaker UI abstraction boundaries.
- Plan:
  - enforce one import convention (prefer `#/components/ui` barrel for consumers),
  - keep deep imports internal to UI package only when necessary.

26. Styling token usage is partial; many hardcoded style values remain in TSX
- Standards reference: `No hardcoded style values`, `Design tokens`
- Evidence examples:
  - hardcoded hex/colors in components:
    - `src/components/dashboard/DashboardTrendChart.tsx`
    - `src/components/dashboard/DashboardWorkloadChart.tsx`
    - `src/components/auth/AuthCard.tsx`
    - `src/components/auth/AuthShell.tsx`
    - `src/pages/products/ProductsListPage.tsx`
  - repeated gradient/shadow utilities inline:
    - `bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)]`
    - `shadow-[0_12px_24px_rgba(...)]`
- Plan:
  - move repeated gradients/shadows/button treatments to `index.css` component classes via `@apply`,
  - reference CSS vars/tokens from those classes instead of inline literals.

27. Large inline className strings create readability and maintenance overhead
- Standards reference: `Cleaner component code`, `Reusability`
- Evidence:
  - high-density inline class strings in:
    - `src/components/layout/Sidebar.tsx`
    - `src/components/auth/AuthCard.tsx`
    - `src/components/auth/AuthShell.tsx`
    - `src/components/complaints/ConversationInfoPanel.tsx`
    - `src/components/complaints/ChatThreadPanel.tsx`
    - `src/components/auditLogs/AuditLogDetailDialog.tsx`
- Plan:
  - extract repeated style groups into semantic utility classes (`.btn-primary-gradient`, `.panel-elevated`, `.hero-bg-*`) in `index.css`,
  - keep `className` short and composable.

28. Re-render/performance hotspots in large forms and list pages
- Standards reference: `Performance`, `Avoid unnecessary rerenders`
- Evidence:
  - `ProductsListPage.tsx`: many local states + multiple effects syncing URL params and pagination guards.
  - `ResubmitUpdateModal.tsx`: heavy `watch/useMemo` + per-row option derivation inside render path.
  - `AddClaimModal.tsx`: multiple `useEffect` chains resetting dependent fields.
- Plan:
  - move complex derived state into memoized hook-level selectors,
  - precompute row-dependent option maps once per render,
  - unify dependent-field reset logic into small reusable field-sync helpers.

29. Repeated primary button visual styles across modules
- Standards reference: `DRY`, `Reusable design system`
- Evidence:
  - repeated primary gradient button classes in claims/quality/registrations/auth/complaints/components.
- Plan:
  - add shared `Button` variant (`variant='primaryGradient'`) in UI layer and replace repeated inline classes.

30. Data-flow complexity from duplicated query-param mutation logic
- Standards reference: `Single source of truth`, `Avoid extra checks`
- Evidence:
  - repeated query-param mutations in hooks/pages:
    - `useClaims`, `useRegistrations`, `useQualityQueue`, `useAuditLogs`, `ProductsListPage`
- Risk:
  - drift in subtle behaviors (trimming, reset-to-page-1, deleting empty params).
- Plan:
  - centralize into one query-param adapter utility and remove duplicated `new URLSearchParams` blocks.
- Status: DONE (2026-04-22) under DRY-004 by migrating duplicated URL param mutation code to `useUrlFilters`.

31. Conversation list has avoidable per-item rerender overhead
- Standards reference: `Performance`, `Avoid unnecessary rerenders`
- Evidence:
  - `src/components/complaints/ConversationListPanel.tsx`
  - `openUnseenThreadIds.includes(item.id)` inside mapped row render introduces repeated linear lookups.
  - per-item `handleItemClick` closures are recreated inside `items.map(...)`.
- Plan:
  - pass a `Set<string>` for opened/unseen lookup (`O(1)` check),
  - move row-click identity handling to stable handler/data-attribute pattern.

32. Date formatter instances are recreated per render path in complaints panels
- Standards reference: `Performance`, `DRY`
- Evidence:
  - `src/components/complaints/ConversationListPanel.tsx` (`formatConversationTime`)
  - `src/components/complaints/ChatThreadPanel.tsx` (`formatTime`)
  - both instantiate `new Intl.DateTimeFormat(...)` inside formatter functions.
- Plan:
  - hoist shared `Intl.DateTimeFormat` instances to module constants and reuse.

33. Audit timeline detail rendering does heavy transformations on each render
- Standards reference: `Performance`, `Single Responsibility`
- Evidence:
  - `src/components/auditLogs/AuditTimelinePanel.tsx`
  - repeated `Object.entries(...).filter(...).map(...)`, date parsing, and stringify/format paths inside `timelineItems.map(...)`.
- Plan:
  - precompute row view-models with `useMemo` (or helper normalizer) before JSX rendering,
  - keep render pass focused on presentation-only mapping.

34. Audit log event counters use repeated filtering passes
- Standards reference: `Performance`, `Less code more output`
- Evidence:
  - `src/pages/auditLogs/AuditLogsPage.tsx`
  - `totalCreate`, `totalUpdate`, `totalDelete` each call `.filter(...).length` separately on same array.
- Plan:
  - replace with one memoized single-pass reducer for event totals.

35. Form input sanitization logic is duplicated across manual-registration and resubmission flows
- Standards reference: `DRY`, `Single responsibility for validation/sanitization`
- Evidence:
  - `src/components/manualRegistration/PersonalInfoStep.tsx` (letters-only + PK phone normalization)
  - `src/components/manualRegistration/PurchaseDealerStep.tsx` (letters-only helpers)
  - `src/components/registrations/ResubmitUpdateModal.tsx` (same letter/phone rules repeated)
- Plan:
  - extract shared sanitizers to `src/utils/formSanitizers.ts` (or `src/utils/inputNormalization.ts`),
  - keep component handlers as thin adapters only.

36. Modal lifecycle handling is repeated across many dialog components
- Standards reference: `DRY`, `Reusable UI behavior`
- Evidence:
  - repeated `handleOpenChange`/`handleModalClose` patterns in claims/quality/registrations/products/audit modals
  - examples:
    - `src/components/claims/RejectClaimModal.tsx`
    - `src/components/quality/RejectClaimQAModal.tsx`
    - `src/components/products/SurfaceTypeModal.tsx`
    - `src/components/registrations/ResubmissionModal.tsx`
- Plan:
  - create shared modal lifecycle helper hook (e.g., `useDialogLifecycle`) for reset + close semantics,
  - reduce duplicated open/close/reset boilerplate.

37. Detail hooks repeat the same guarded mutation orchestration pattern
- Standards reference: `DRY`, `Single responsibility`
- Evidence:
  - `src/hooks/claims/useClaimDetail.ts`
  - `src/hooks/quality/useQualityDetail.ts`
  - `src/hooks/registrations/useRegistrationDetail.ts`
- Pattern repeated:
  - guard for missing detail,
  - execute mutation,
  - success/error toast handling,
  - pending-state aggregation.
- Plan:
  - introduce shared `createGuardedDetailAction` helper to normalize guard + toast + mutation wiring.

38. Registration detail hook carries multiple responsibilities in one module
- Standards reference: `Single responsibility`, `Maintainability`
- Evidence:
  - `src/hooks/registrations/useRegistrationDetail.ts`
  - currently owns:
    - query state,
    - approval/rejection/resubmission action orchestration,
    - resubmission payload-building rules (`buildResubmitUpdatePayload`),
    - validation guards and toast policy.
- Plan:
  - split into:
    - `useRegistrationDetailQuery`,
    - `useRegistrationDetailActions`,
    - `registrationResubmitPayloadBuilder.ts`.

39. Repeated success/error toast strings should be centralized into domain message constants
- Standards reference: `DRY`, `Maintainability`, `Consistency`
- Evidence:
  - repeated messages in hooks/pages:
    - `src/hooks/claims/useClaimDetail.ts`
    - `src/hooks/quality/useQualityDetail.ts`
    - `src/hooks/registrations/useRegistrationDetail.ts`
    - `src/pages/products/ProductCreatePage.tsx`
    - `src/pages/products/ProductEditPage.tsx`
- Plan:
  - define domain message maps in `src/constants/messages.ts` (or `src/constants/toastMessages.ts`),
  - consume constants from hooks/pages instead of inline literals.

40. Reusable UI copy/placeholder strings are repeated across form modules
- Standards reference: `DRY`, `Single source of truth for UI text`
- Evidence:
  - `'92XXXXXXXXXX'` appears in:
    - `src/components/manualRegistration/PersonalInfoStep.tsx`
    - `src/components/registrations/ResubmitUpdateModal.tsx`
  - `'No basecoat available for selected topcoat'` appears in:
    - `src/components/manualRegistration/ProductsStep.tsx`
    - `src/components/registrations/ResubmitUpdateModal.tsx`
  - `'Select topcoat first'` variants appear in claim/registration/manual flows.
- Plan:
  - add shared UI text constants for placeholders/select guidance in `src/constants/uiText.ts`,
  - reference them from all related form/select components.

41. Inline JSX handler patterns remain in hot UI paths and should be moved to stable handlers
- Standards reference: `Code cleanliness`, `Rerender hygiene`, `Separation of concerns`
- Evidence:
  - `src/pages/products/ProductsListPage.tsx` (`onClick={() => setTab(...)}`)
  - `src/components/products/ProductForm.tsx` (`onClick={() => handleRemoveCurrentImage(...)}`)
  - `src/components/ui/ImagePreviewGallery.tsx` (`onClick={() => openImageModal(...)}`)
  - `src/components/manualRegistration/InvoicesStep.tsx` (`onClick={() => handleRemoveInvoice(...)}`)
- Plan:
  - extract item-specific handlers to component-scope callbacks with `data-*` attributes where appropriate,
  - reduce inline closures in mapped/list contexts.
- Status: DONE (2026-04-22) for this ticket scope.

42. Date/time formatter and wrapper utilities are fragmented across domain components
- Standards reference: `DRY`, `Utility reuse`
- Evidence:
  - complaints local formatters:
    - `src/components/complaints/ChatThreadPanel.tsx`
    - `src/components/complaints/ConversationInfoPanel.tsx`
    - `src/components/complaints/ConversationListPanel.tsx`
  - separate claims/quality date wrappers already exist in:
    - `src/components/claims/helpers.ts`
    - `src/components/quality/helpers.ts`
  - shared utility exists: `src/utils/date.ts`
- Plan:
  - consolidate date/time formatting through shared utility-level formatters (with optional presets),
  - remove per-component formatter duplication.

## 3) Enhancement Roadmap (Phased)

## Phase 1 (High impact, low risk) - 1 week

1. Add bundle control baselines
- Set bundle budget checks in CI (`build + analyzer + fail threshold`).
- Target first reduction: split router by module.

2. Clean policy drifts
- Restore Manual Registration sidebar item.
- Remove or isolate `import/order` disables with stable import shape.
- Add explicit return types on exported hooks/routes/components.

3. Introduce common list-page primitives
- Replace duplicate pagination/state/toolbar blocks in 2 pilot pages (Claims + Quality).

Deliverables:
- Reduced duplicate code in pilot pages
- Bundle report checked into CI artifacts
- Security migration RFC draft (token storage)

## Phase 2 (Security + architecture) - 1 to 2 weeks

1. Auth hardening
- Move from localStorage tokens to secure cookie-compatible flow.
- Keep refresh handling centralized in transport layer.

2. Split oversized files
- Prioritize top 5 biggest components/pages.
- Rule: no file > 300 lines after refactor unless temporary exception documented.

3. Route-level lazy loading
- Apply `React.lazy` + suspense boundaries for route modules.

Deliverables:
- No token persistence in localStorage
- Top oversized files split
- First meaningful JS chunk reduction

## Phase 3 (Systemic maintainability) - 2 weeks

1. Normalize module boundaries
- Enforce `pages = composition only`, move business logic to hooks/services.

2. Data-layer consistency
- Align query/mutation style to mistakes-file convention (`performRequest` inside queryFn/mutationFn when applicable).

3. Test foundation
- Add critical-path RTL + MSW tests for:
  - auth login flow
  - registration detail actions
  - claim detail transitions
  - complaint thread rendering/fallback

Deliverables:
- Baseline test suite for critical paths
- Reduced logic in page components
- Stable architecture documentation

## 4) Concrete Refactor Backlog (Master Ticket List)

1. `SEC-001`: Replace localStorage token persistence with secure session flow. (Covers Findings: #1)
2. `PERF-001`: Implement route-level lazy loading in router. (Covers Findings: #3)
3. `PERF-002`: Add bundle analyzer and budget gates. (Related to Findings: #3, #28)
4. `ARCH-001`: Split `AuditTimelinePanel.tsx` into renderer subcomponents. (Covers Findings: #2, #33) ✅ Done (2026-04-17)
5. `ARCH-002` [✅ DONE 2026-04-17]: Split `ResubmitUpdateModal.tsx` by field groups + hooks. (Covers Findings: #2, #24, #28)
6. `ARCH-003` [✅ DONE 2026-04-20]: Split `ProductForm.tsx` into sections + adapter hook. (Covers Findings: #2, #24)
7. `ARCH-004` [✅ DONE 2026-04-20]: Split `ProductsListPage.tsx` into tab containers. (Covers Findings: #2, #28)
8. `ARCH-005` [✅ DONE 2026-04-20]: Split `AddClaimModal.tsx` into structured sub-forms. (Covers Findings: #2, #24, #28)
9. `DRY-001` [✅ DONE 2026-04-22]: Create shared `PaginationFooter` component. (Covers Findings: #7)
10. `DRY-002`: Create shared `ListStateBlock` component. (Covers Findings: #7)
11. `DRY-003`: Create shared `StatsCardGrid` component. (Covers Findings: #7)
12. `RULE-001` [✅ DONE 2026-04-22]: Remove `import/order` file-level disables. (Covers Findings: #5)
13. `RULE-002` [✅ DONE 2026-04-22]: Restore sidebar Manual Registration item. (Covers Findings: #6)
14. `RULE-003` [✅ DONE 2026-04-22]: Add explicit return types to exported hooks. (Covers Findings: #10)
15. `RULE-004` [✅ DONE 2026-04-22]: Add explicit return types to exported route components. (Covers Findings: #10)
16. `RULE-005` [✅ DONE 2026-04-22]: Replace inline JSX arrows in top touched files. (Covers Findings: #11, #41)
17. `UTIL-001`: Split `helperFunctions.ts` into domain normalizers. (Covers Findings: #9)
18. `TEST-001`: Add auth critical-flow RTL/MSW tests. (Cross-cutting regression safety for Findings: #1, #13, #21)
19. `TEST-002`: Add claim + registration action flow tests. (Cross-cutting regression safety for Findings: #17, #22, #38)
20. `TEST-003`: Add complaint thread resilience tests. (Cross-cutting regression safety for Findings: #31, #33, #34)
21. `ROUTE-001`: Introduce loader/action usage on priority routes (claims/quality lists). (Covers Findings: #12)
22. `RULE-006` [✅ DONE 2026-04-22]: Replace `mutateAsync` sequence in product create/edit with callback orchestration helper. (Covers Findings: #13)
23. `DOC-001`: Add FE-local `.github/pull_request_template.md` (or approved exception note). (Covers Findings: #14)
24. `RULE-007` [✅ DONE 2026-04-22]: Resolve one-component-per-file drift in `src/components/ui/*` (split or documented exception). (Covers Findings: #15)
25. `ARCH-006` [✅ DONE 2026-04-20]: Move product page data-layer imports into product hooks (`pages` composition-only refactor). (Covers Findings: #16)
26. `ARCH-007` [✅ DONE 2026-04-20]: Extract `CsrResubmissionModal` query logic into a dedicated claims hook. (Covers Findings: #17)
27. `RULE-008`: Add missing component JSDoc blocks for all exported components (start with products/auth files listed above). (Covers Findings: #18)
28. `CLEAN-001`: Remove or wire dead modules (`HomePage`, `PlaceholderPage`, `RegistrationFilters`, `AdminRoute`, `useSentry`). (Covers Findings: #19)
29. `DRY-004` [✅ DONE 2026-04-22]: Implement shared URL query-param filter helper (`useUrlFilters`) and migrate claims/registrations/quality/audit/products. (Covers Findings: #20, #30)
30. `DRY-005`: Implement shared mutation-feedback wrapper for toast + error mapping. (Covers Findings: #21, #39)
31. `ARCH-008` [✅ DONE 2026-04-20]: Introduce shared detail-action controller helpers used by claims/quality/registrations detail hooks. (Covers Findings: #8, #22, #37)
32. `DRY-006`: Remove duplicate `formatDate`/`formatDateTime` wrappers from claims/quality helpers. (Covers Findings: #23)
33. `ARCH-009` [✅ DONE 2026-04-20]: Split `ResubmitUpdateModal`, `AddClaimModal`, and `ProductForm` into hook + section component architecture. (Covers Findings: #2, #24)
34. `UI-001`: Standardize UI imports to barrel usage and disallow mixed deep imports outside UI package. (Covers Findings: #25)
35. `STYLE-001`: Extract repeated gradients/shadows/hero surfaces into `index.css` semantic classes with `@apply`. (Covers Findings: #26, #27)
36. `STYLE-002`: Introduce token-driven `Button` visual variants (e.g., `primaryGradient`) and migrate repeated inline classes. (Covers Findings: #26, #29)
37. `PERF-003`: Refactor `ProductsListPage` query-param + pagination state into a dedicated controller hook. (Covers Findings: #28, #30)
38. `PERF-004`: Refactor `ResubmitUpdateModal` option derivation to precomputed maps and lighter row rendering. (Covers Findings: #28)
39. `PERF-005`: Consolidate dependent field-reset effects in `AddClaimModal` into reusable field-sync utility. (Covers Findings: #28)
40. `DRY-007`: Centralize query-param set/delete/reset-page behavior into shared adapter used by all list hooks. (Covers Findings: #20, #30)
41. `PERF-006`: Optimize `ConversationListPanel` row rendering with `Set`-based unseen lookup and stable click handlers. (Covers Findings: #31)
42. `PERF-007`: Hoist and reuse complaints date-time formatters instead of creating `Intl.DateTimeFormat` in formatter calls. (Covers Findings: #32, #42)
43. `PERF-008`: Build memoized timeline row view-models for `AuditTimelinePanel` to reduce per-render transform cost. (Covers Findings: #33)
44. `PERF-009`: Replace repeated action `.filter(...).length` counters in `AuditLogsPage` with a single memoized reducer. (Covers Findings: #34)
45. `DRY-008`: Extract shared input sanitizers (letters-only + PK phone normalization) into `src/utils/*` and migrate manual/registration forms. (Covers Findings: #35)
46. `DRY-009`: Create shared dialog lifecycle helper (`useDialogLifecycle`) and migrate modal open/close/reset patterns. (Covers Findings: #36)
47. `DRY-010`: Implement shared guarded detail-action orchestration helper for claims/quality/registration hooks. (Covers Findings: #22, #37)
48. `ARCH-010` [✅ DONE 2026-04-20]: Split `useRegistrationDetail` into query/actions/payload-builder modules for single-responsibility compliance. (Covers Findings: #2, #38)
49. `DRY-011`: Introduce centralized toast/message constants (`src/constants/messages.ts`) and migrate repeated literals. (Covers Findings: #21, #39)
50. `DRY-012`: Create shared UI text constants (`src/constants/uiText.ts`) for placeholders/select hint copy. (Covers Findings: #40)
51. `RULE-009` [✅ DONE 2026-04-22]: Replace inline JSX closures in list/hot paths with stable handlers + `data-*` identity pattern. (Covers Findings: #11, #41)
52. `DRY-013`: Unify domain date/time wrappers through `src/utils/date.ts` presets and remove duplicate local formatters. (Covers Findings: #23, #32, #42)
53. `RULE-010` [✅ DONE 2026-04-22]: Convert default exports to named exports for `App`, `axiosInstance`, `useSentry`, and `ErrorFallback` (excluding declaration-file exceptions). (Covers Findings: #4)

## 5) Finding-to-Ticket Coverage (Detailed)

1. Finding #1 -> `SEC-001`:
- Scope: remove auth token persistence from localStorage and move to secure session/cookie-aligned flow.
- Done when: no token reads/writes remain in auth context, refresh service, or axios auth headers from localStorage.

2. Finding #2 -> `ARCH-001`, `ARCH-002`, `ARCH-003`, `ARCH-004`, `ARCH-005`, `ARCH-009`, `ARCH-010`:
- Scope: break oversized modules into hooks + sections + smaller presentational units.
- Done when: target files are <= 300 lines (or exception documented) and behavior unchanged.

3. Finding #3 -> `PERF-001`:
- Scope: route-level lazy loading in router.
- Done when: page modules load via lazy boundaries and initial chunk size drops.

4. Finding #4 -> `RULE-010`:
- Scope: replace default exports in flagged modules with named exports.
- Done when: imports are updated and no default export drift remains (except declaration-file constraints).

5. Finding #5 -> `RULE-001`:
- Scope: remove `import/order` disable comments and stabilize imports.
- Done when: source files have zero file-level import-order disables.
- Status: ✅ Done (2026-04-22)

6. Finding #6 -> `RULE-002`:
- Scope: restore manual registration sidebar item.
- Done when: nav includes Manual Registration route consistently.
- Status: ✅ Done (2026-04-22)

7. Finding #7 -> `DRY-001`, `DRY-002`, `DRY-003`:
- Scope: common list-page primitives for pagination/state/stats.
- Done when: at least pilot pages use shared primitives and duplicate blocks are removed.
- Status: `DRY-001` ✅ Done (2026-04-22).

8. Finding #8 -> `DRY-009`, `ARCH-008`:
- Scope: shared modal lifecycle and action orchestration for detail pages.
- Done when: open/close/reset action modal boilerplate is centralized.

9. Finding #9 -> `UTIL-001`:
- Scope: split `helperFunctions.ts` into domain normalizers.
- Done when: helper monolith is decomposed and imports migrated.

10. Finding #10 -> `RULE-003`, `RULE-004`:
- Scope: explicit return types on exported hooks/routes/components.
- Done when: exported API surfaces have explicit return types.
- Status: `RULE-003` ✅ Done (2026-04-22), `RULE-004` ✅ Done (2026-04-22).

11. Finding #11 -> `RULE-005`, `RULE-009`:
- Scope: reduce/remove inline JSX arrow handlers in priority files.
- Done when: hot-path list/table handlers are stable and extracted.
- Status: `RULE-005` ✅ Done (2026-04-22).

12. Finding #12 -> `ROUTE-001`:
- Scope: introduce Data Router loaders/actions on priority routes.
- Done when: claims/quality list flows use loader/action pattern.

13. Finding #13 -> `RULE-006`:
- Scope: replace product `mutateAsync` orchestration with callback style.
- Done when: create/edit product action flows use callback mutation orchestration helper.
- Status: `RULE-006` ✅ Done (2026-04-22).

14. Finding #14 -> `DOC-001`:
- Scope: FE-local PR template presence or documented exception.
- Done when: template exists under FE package or policy exception is documented.

15. Finding #15 -> `RULE-007`:
- Scope: resolve one-component-per-file drift in UI primitives.
- Done when: primitives are split or standards exception is documented.
- Status: `RULE-007` ✅ Done (2026-04-22).
- Note: `Table` primitives were split into single-component files. `Pagination` remains bundled as a documented temporary exception due reproducible `eslint-plugin-import` (`import/order`) crashes when split into separate files under current lint toolchain.

16. Finding #16 -> `ARCH-006`:
- Scope: remove page-level direct data-layer ownership in products module.
- Done when: pages become composition-only and product hooks own orchestration.

17. Finding #17 -> `ARCH-007`:
- Scope: move component-level query logic out of `CsrResubmissionModal`.
- Done when: dedicated claims hook supplies state/handlers.

18. Finding #18 -> `RULE-008`:
- Scope: add JSDoc for exported components.
- Done when: missing exported components have concise JSDoc blocks.

19. Finding #19 -> `CLEAN-001`:
- Scope: remove or properly wire dead/unreachable modules.
- Done when: dead code list is either deleted or route/usage wired.

20. Finding #20 -> `DRY-004`, `DRY-007`:
- Scope: shared URL query-param mutation utilities.
- Done when: list hooks/pages use shared adapter and duplicate blocks are removed.
- Status: `DRY-004` ✅ Done (2026-04-22).

21. Finding #21 -> `DRY-005`, `DRY-011`:
- Scope: central mutation feedback/toast behavior.
- Done when: success/error mapping is standardized and message literals reduced.

22. Finding #22 -> `ARCH-008`, `DRY-010`:
- Scope: shared guarded detail-action orchestration helpers.
- Done when: claim/quality/registration detail hooks reuse common action helpers.

23. Finding #23 -> `DRY-006`, `DRY-013`:
- Scope: remove duplicated claims/quality date wrappers.
- Done when: formatters resolve through shared date utility presets.

24. Finding #24 -> `ARCH-002`, `ARCH-003`, `ARCH-005`, `ARCH-009`:
- Scope: split complex forms into controller hooks + section components.
- Done when: each form has clear container vs presentation separation.

25. Finding #25 -> `UI-001`:
- Scope: standardize UI import convention.
- Done when: consumers use barrel imports consistently.

26. Finding #26 -> `STYLE-001`, `STYLE-002`:
- Scope: remove hardcoded style literals and use tokenized/shared styles.
- Done when: repeated gradients/shadows/buttons use token-driven classes/variants.

27. Finding #27 -> `STYLE-001`:
- Scope: reduce oversized inline className strings.
- Done when: repeated utility groups move to semantic classes.

28. Finding #28 -> `PERF-003`, `PERF-004`, `PERF-005`:
- Scope: optimize rerender hotspots in products/registration/claim forms.
- Done when: derived state and reset logic are centralized/memoized with lower render churn.

29. Finding #29 -> `STYLE-002`:
- Scope: shared primary action button variant.
- Done when: repeated gradient primary button classes are replaced.

30. Finding #30 -> `DRY-007`:
- Scope: unify query-param mutation behavior.
- Done when: one adapter handles set/delete/reset-page rules.

31. Finding #31 -> `PERF-006`:
- Scope: optimize conversation list row rendering.
- Done when: unseen lookup uses Set and item handlers are stable.

32. Finding #32 -> `PERF-007`, `DRY-013`:
- Scope: stop recreating formatter instances in complaints views.
- Done when: formatter instances/presets are shared and reused.

33. Finding #33 -> `PERF-008`:
- Scope: precompute audit timeline row view-models.
- Done when: heavy transforms are outside render JSX mapping path.

34. Finding #34 -> `PERF-009`:
- Scope: single-pass action counters in audit logs page.
- Done when: one reducer replaces repeated filter passes.

35. Finding #35 -> `DRY-008`:
- Scope: shared text/phone sanitizers for forms.
- Done when: manual/registration forms consume shared sanitizer helpers.

36. Finding #36 -> `DRY-009`:
- Scope: shared dialog lifecycle hook.
- Done when: modal reset/close semantics are centralized.

37. Finding #37 -> `DRY-010`, `ARCH-008`:
- Scope: guard+mutation+toast orchestration reuse.
- Done when: detail hooks no longer duplicate this pattern.

38. Finding #38 -> `ARCH-010`:
- Scope: split registration detail hook by responsibility.
- Done when: query/actions/payload builder live in separate modules.

39. Finding #39 -> `DRY-011`:
- Scope: centralized toast/message constants.
- Done when: repeated domain message literals are replaced with constants.

40. Finding #40 -> `DRY-012`:
- Scope: centralized UI text placeholders/hints.
- Done when: repeated text strings use `uiText` constants.

41. Finding #41 -> `RULE-005`, `RULE-009`:
- Scope: remove inline closures in hot list/render paths.
- Done when: stable callbacks/data-attribute identity are used.
- Status: `RULE-005` ✅ Done (2026-04-22).

42. Finding #42 -> `DRY-013`:
- Scope: unify date/time wrappers via shared presets/utilities.
- Done when: local duplicate wrappers are removed from domain components.

## 6) Audit Commands (Repeatable)

Run from `/Dulux-FE`:

```bash
yarn install
yarn lint
yarn build
rg -n "eslint import/order: off|eslint-disable.*import/order" src
rg -n "localStorage|ACCESS_TOKEN|REFRESH_TOKEN" src
find src -name '*.tsx' -o -name '*.ts' | while read -r f; do lc=$(wc -l < "$f"); if [ "$lc" -gt 300 ]; then echo "$f:$lc"; fi; done
```

## 7) Success Metrics

- Security: 0 token writes to localStorage.
- Bundle: main entry chunk reduced by >= 40% in phase-1/2.
- Maintainability: 0 component/page files > 300 lines (or documented exceptions).
- Standards: 0 `import/order` disable comments in source files.
- Reliability: critical-path tests added and passing in CI.
