# Dulux FE E2E Playwright Plan

## 1) Goal

Build a Playwright E2E suite that validates the implemented product behavior against `IMPLEMENTATION_PLAN.md`, with strong coverage of:

- Routing and deep-linking
- Auth + RBAC access control
- Core user flows (B1-B12)
- Error/loading/empty-state resilience
- Critical mutation flows and state transitions

This plan is designed for incremental rollout: `smoke` (PR gate) + `full` (nightly/release gate).

## 2) Current State (As-Is)

- Current automated tests are Vitest/RTL only (unit + integration-style).
- No E2E framework is currently configured in this repo.
- E2E must be added with Playwright and CI-friendly deterministic test data strategy.

## 3) Playwright Architecture

## 3.1 Folder Structure

```text
Dulux-FE/
  playwright.config.ts
  e2e/
    fixtures/
      auth.fixture.ts
      data.fixture.ts
    mocks/
      routes.ts
      handlers/
        auth.handlers.ts
        dashboard.handlers.ts
        registrations.handlers.ts
        claims.handlers.ts
        quality.handlers.ts
        complaints.handlers.ts
        products.handlers.ts
        import.handlers.ts
    pages/
      LoginPage.ts
      DashboardPage.ts
      RegistrationsPage.ts
      RegistrationDetailPage.ts
      ClaimsPage.ts
      ClaimDetailPage.ts
      QualityPage.ts
      LiveChatPage.ts
      ProductsPage.ts
      ManualRegistrationWizardPage.ts
    specs/
      smoke/
        routing-rbac.smoke.spec.ts
        dashboard.smoke.spec.ts
      full/
        auth.spec.ts
        routing-rbac.spec.ts
        dashboard.spec.ts
        registrations.spec.ts
        claims.spec.ts
        quality.spec.ts
        complaints.spec.ts
        products.spec.ts
        manual-registration.spec.ts
        import-settings-placeholder.spec.ts
        resilience.spec.ts
```

## 3.2 Test Strategy

- Use Page Objects for stable selectors and reusable actions.
- Use deterministic network stubbing (`page.route`) for PR runs.
- Add optional live-backend mode for staging validation (`E2E_MODE=live`).
- Use `storageState` per role (`admin`, `cs`, `quality`) to avoid repeated UI login.

## 3.3 Selector Strategy

- Prefer semantic role selectors (`getByRole`, `getByLabel`, `getByText`).
- Add `data-testid` only where semantics are unstable.
- No XPath.

## 4) Environments and Data

## 4.1 Execution Modes

1. `mocked` (default CI/PR):
- API routes mocked in browser.
- Fast and deterministic.

2. `live` (nightly/staging):
- Real API/staging backend.
- Contract/regression verification.

## 4.2 Test Accounts

- `admin_user`
- `cs_user`
- `quality_user`
- `unauthenticated_user`

## 4.3 Seed Data Requirements

- At least:
  - 3 registrations across workflow states
  - 3 claims across states (`SUBMITTED`, `IN_REVIEW`, `FORWARDED/QA_REVIEW`)
  - 2 quality queue items
  - 2 complaint threads with messages/images
  - 3 products + 2 surface types

## 5) Coverage Matrix Mapped to Implementation Plan

## 5.1 Step 1: Routing + Access Control

### RTE-001 Unauthenticated redirect
- Given no token
- When opening protected route (`/dashboard`, `/claims`, `/registrations`)
- Then redirect to `/login`

### RTE-002 Root redirect
- Given authenticated role
- When opening `/`
- Then redirect to role home

### RTE-003 Role guard (privileged areas)
- CS users cannot access import/settings privileged routes
- Quality users cannot access product create/edit/import/settings privileged routes
- Redirect to safe route

### RTE-004 Deep-linking detail routes
- Direct open for `/registrations/:id`, `/claims/:id`, `/complaints/:id`, `/quality/:id`
- Correct page loads and back-navigation works

### RTE-005 Manual wizard step route behavior
- `/manual-registration` redirects to step 1
- Invalid/non-sequential step access enforces guard behavior

### RTE-006 Catch-all routing
- Unknown route under app returns defined fallback/redirect behavior

## 5.2 Step 3 Screens (B1-B12)

### B1 Dashboard

### DASH-001 Cards + navigation
- Dashboard cards reflect role visibility rules for permitted roles (admin/cs: 5 cards in current implementation)
- Card click navigates to matching route

### DASH-002 Analytics sections
- Trend + workload charts render
- Fallback/mocked dataset displayed when analytics unavailable

### B2 Registrations List

### REG-LIST-001 Stats + tabs + table + pagination
- Validate stat cards, tab filter transitions, pagination controls

### REG-LIST-002 Add Manual Registration CTA
- CTA navigates to `/manual-registration/step/1`

### REG-LIST-003 Loading/empty/error states
- Skeleton/empty/error messages shown appropriately

### B3 Registration Detail

### REG-DET-001 Detail rendering + action center by role
- CS/Admin can use actions
- Quality role sees restricted behavior

### REG-DET-002 Approve/Reject/Resubmit happy paths
- Open modal, submit payload, observe success feedback and list refresh

### REG-DET-003 Resubmission field mapping contract
- Selected fields are correctly sent in payload

### REG-DET-004 Invoice/image lightbox behavior
- Open image preview, close lightbox

### B4 Claims List

### CLM-LIST-001 Stats/tabs/filters/table/pagination
- Issue type + search + status filters affect result list

### CLM-LIST-002 Create-claim modal flow
- Query-param open behavior
- Submit success closes modal and updates URL state

### B5 Claim Detail

### CLM-DET-001 Detail sections + timeline + images

### CLM-DET-002 Required workflow transition
- On opening SUBMITTED claim detail, backend transition to IN_REVIEW is triggered once

### CLM-DET-003 Approve/reject/send-to-quality/csr-resubmit flows
- Validate payload + success/error feedback

### B6 Quality Module

### QA-LIST-001 Queue summary cards + tab filters + split/list behavior

### QA-DET-001 Approve/reject/request-info actions

### QA-DET-002 Gated decisions by workflow state
- Actions unavailable outside `QA_REVIEW` state

### B7 Complaints Chat

### CHAT-001 Conversation list + thread deep-link
- No thread selected -> auto-select first thread behavior
- Direct thread URL loads target thread

### CHAT-002 Socket/live updates behavior (mocked stream)
- New incoming message appears without full page reload

### CHAT-003 Resolve flow chain
- OPEN -> IN_PROGRESS -> RESOLVED/CLOSED chain with closure note

### CHAT-004 Message send path
- Trim handling, disabled submit for empty message, transport error toast path

### B8/B9 Products

### PROD-LIST-001 Products tab + Surface Types tab
- Tab switch, table render, pagination/filter checks

### PROD-CRUD-001 Create/Edit/Delete product
- Form validations + submit + post-action list refresh

### PROD-SURFACE-001 Create/Edit/Delete surface type

### B10 Manual Registration Wizard

### MAN-001 Step navigation + per-step validation guard
- Cannot advance with invalid step inputs

### MAN-002 Full submit flow to success screen
- Submit at final step reaches success page

### MAN-003 Success actions
- View registration, create another, back to list

### MAN-004 Deep-link guard behavior
- Opening later step without prerequisites triggers expected guard/redirect

### B11 Import + B12 Settings

### IMP-001 Placeholder shell behavior
- Route reachable by allowed role
- Placeholder content shown (no upload business logic if intentionally pending)

### SET-001 Settings placeholder/admin restrictions

## 5.3 Step 4/5/6/7 Hardening Coverage

### HARD-001 Loading/empty/error contract on all list pages
- Registrations, claims, quality, products, complaints list

### HARD-002 Mutation error handling
- Toast + stable UI after failed mutation

### HARD-003 Form schema UX
- Required fields, min length, invalid format messaging
- Disable submit while pending

### HARD-004 Chat reliability
- Socket disconnect/reconnect behavior surfaces user feedback

### HARD-005 RBAC component-level protections
- Hidden/disabled actions for unauthorized roles

## 6) RBAC Test Matrix

## 6.1 CS Agent

- Allowed: dashboard, registrations, claims, complaints, manual registration, products (list/create/edit)
- Blocked: quality decisions (if restricted by route), import/settings routes/actions

## 6.2 Quality User

- Allowed: quality module, permitted detail cross-links
- Blocked: admin controls, unauthorized registration action center

## 6.3 Admin

- Full access including products/import/settings routes and actions

## 7) Playwright Config Plan

## 7.1 Projects

- `chromium-smoke` (CI PR required)
- `chromium-full`
- `firefox-full`
- `webkit-full` (optional if runtime budget allows)

## 7.2 Tags

- `@smoke`
- `@rbac`
- `@critical`
- `@chat`
- `@wizard`

## 7.3 Reporter Outputs

- HTML report artifact
- JUnit XML for CI
- Trace on retry
- Screenshot/video on failure

## 8) CI Pipeline Plan

## 8.1 PR Gate (fast)

- Lint
- Unit/integration tests
- Playwright `@smoke` + `@rbac` on mocked mode

## 8.2 Nightly/Release Gate

- Full Playwright suite on mocked mode
- Optional live mode subset against staging

## 9) Coverage Targets

- Route/RBAC cases: 100% of declared route guards and redirects
- Critical user journeys: 100% (auth, claims decisions, quality decisions, chat resolve, manual wizard submit)
- Module screen coverage: B1-B12 each has at least one happy path + one resilience path
- Mutation coverage: each critical mutation has success + failure scenario

## 10) Implementation Phases

## Phase 1 (Foundation, 1-2 days)

Status: `Completed` on `April 24, 2026`.

- Add `playwright.config.ts` with projects: `chromium-smoke`, `chromium-full`, `firefox-full` (webkit optional).
- Add npm scripts: `e2e`, `e2e:smoke`, `e2e:full`, `e2e:ui`, `e2e:report`.
- Create base structure: `e2e/fixtures`, `e2e/mocks`, `e2e/pages`, `e2e/specs/smoke`, `e2e/specs/full`.
- Implement auth fixtures with role-based `storageState`: `admin`, `cs`, `quality`, `anonymous`.
- Implement deterministic mocked transport with `page.route` handlers for auth, dashboard, registrations, claims, quality, complaints, products, import.
- Create base Page Objects: `LoginPage`, `DashboardPage`, shared `AppShellPage`.
- Implement smoke tests for case IDs: `RTE-001`, `RTE-002`, `RTE-003`, `DASH-001`, `DASH-002`.
- Add trace/screenshot/video policy: trace on retry, screenshot+video on failure.
- Add CI job for `@smoke @rbac` as initial non-blocking gate for rollout week.
- Phase 1 exit criteria: smoke suite stable in CI with deterministic results and failure artifacts.

## Phase 2 (Core workflows, 3-5 days)

- Implement Registrations specs with Page Objects and mocked contracts for case IDs: `REG-LIST-001`, `REG-LIST-002`, `REG-LIST-003`, `REG-DET-001`, `REG-DET-002`, `REG-DET-003`, `REG-DET-004`.
- Implement Claims specs for case IDs: `CLM-LIST-001`, `CLM-LIST-002`, `CLM-DET-001`, `CLM-DET-002`, `CLM-DET-003`.
- Implement Quality specs for case IDs: `QA-LIST-001`, `QA-DET-001`, `QA-DET-002`.
- Implement Products specs for case IDs: `PROD-LIST-001`, `PROD-CRUD-001`, `PROD-SURFACE-001`.
- Implement Manual Registration wizard specs for case IDs: `MAN-001`, `MAN-002`, `MAN-003`, `MAN-004`.
- Implement placeholder/access specs for case IDs: `IMP-001`, `SET-001`.
- Add resilience assertions across modules for case IDs: `HARD-001`, `HARD-002`, `HARD-003`, `HARD-005`.
- Tag critical tests with `@critical` and wizard tests with `@wizard`.
- Enforce deterministic waits using UI state assertions only (`expect(...).toBeVisible()`, URL assertions), no hard sleeps.
- Phase 2 exit criteria: B1-B12 core functional coverage complete in mocked mode with passing full chromium run.

## Phase 3 (Realtime + hardening, 2-3 days)

- Implement complaints realtime-focused specs for case IDs: `CHAT-001`, `CHAT-002`, `CHAT-003`, `CHAT-004`, `HARD-004`.
- Add controlled websocket simulation hooks in mocks for inbound message and status updates.
- Add cross-browser matrix execution for `chromium-full` + `firefox-full` (webkit optional by runtime budget).
- Add flake hardening: retry budget, strict selector review, and fixture-level reset guarantees between tests.
- Add route/deep-link regression pack for `RTE-004`, `RTE-005`, `RTE-006`.
- Add test diagnostics guidelines in README section: how to open traces, videos, and HTML report.
- Phase 3 exit criteria: cross-browser full suite meets stability target and chat flows are deterministic.

## Phase 4 (Live mode, optional)

- Add execution toggle `E2E_MODE=mocked|live` and environment-safe base URL handling.
- Build reduced live critical pack for nightly runs: `RTE-001`, `RTE-003`, `DASH-001`, `REG-DET-002`, `CLM-DET-003`, `QA-DET-001`, `CHAT-003`, `MAN-002`.
- Add live-data prerequisites document: required users, minimum seed records, and environment health checks.
- Add network/contract fail-fast checks at suite start for live mode.
- Run nightly live suite with report artifacts and failure notifications.
- Phase 4 exit criteria: nightly live pack runs reliably and catches environment-level regressions without blocking PR velocity.

## 11) Risks and Mitigations

- Risk: brittle selectors from frequent UI changes
  - Mitigation: page objects + semantic selectors + selective `data-testid`

- Risk: flaky network timing
  - Mitigation: deterministic route mocks + explicit waits on UI state, not timeouts

- Risk: suite runtime bloat
  - Mitigation: strict `smoke` subset for PR and full suite nightly

## 12) Definition of Done

E2E rollout is complete when:

- Playwright is configured and running in CI
- `@smoke` passes on all PRs
- Full suite covers all implementation-plan modules (B1-B12) and routing/RBAC
- Failing tests provide trace/screenshot artifacts
- Test docs include maintenance guidelines and ownership

## 13) Immediate Next Action (Recommended)

Implement Phase 1 first:

1. Add Playwright config and scripts.
2. Add auth fixtures + route mocks.
3. Add `routing-rbac` + `dashboard` smoke tests.
4. Wire into CI as non-blocking for first rollout week, then enforce.
