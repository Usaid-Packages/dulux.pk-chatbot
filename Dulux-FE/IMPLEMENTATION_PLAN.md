# Dulux FE Implementation Plan

## 0. Standards Instruction (Mandatory for Entire Project)

- Before implementing or generating any code, read `Dulux-FE/AGENTS_ENGINEERING_STANDARDS.md`.
- All coding, refactoring, reviewing, and code generation in this project must strictly follow `Dulux-FE/AGENTS_ENGINEERING_STANDARDS.md`.
- This requirement applies to every step in this plan and all project modules.
- If any plan detail conflicts with standards, `AGENTS_ENGINEERING_STANDARDS.md` is the source of truth.
- Any code that violates standards is non-compliant and must be rejected or fixed before merge.

## Step 1: Routing Strategy and Access Control

### 1.1 Routing Approach

- Use **feature-based routing** (not page-based routing).
- Use nested routes under `/app` for scalability and shared layout.
- Enforce role-based access via reusable route guards.
- Preserve deep-linking for detail pages and chat threads.

### 1.2 Root Routes

```bash
/ (redirect)
/login
/app (protected layout)
```

After successful login, redirect to:

```bash
/app/dashboard
```

### 1.3 Core Route Map

```bash
/login

/app
 ├── dashboard
 │
 ├── registrations
 │   ├── /
 │   └── :id
 │
 ├── claims
 │   ├── /
 │   └── :id
 │
 ├── quality
 │   ├── /
 │   └── :id
 │
 ├── complaints
 │   ├── /
 │   └── :id
 │
 ├── products
 │   ├── /
 │   ├── new
 │   └── :id/edit
 │
 ├── manual-registration          ← sub-flow of Registrations (no sidebar nav item)
 │   ├── step/:stepId
 │   └── success
 │
 ├── import
 │
 └── settings
```

### 1.4 Screen-to-Route Mapping

- `A1` Login -> `/login` ⚠️ **No Login wireframe provided in Phase 1** — implement as standard email+password form; layout pending design approval
- `B1` Dashboard -> `/app/dashboard` — implements the **Wireframe Hub** view showing flow cards and section stats (6 flows, 31 screens). No complex analytics; just a summary landing page.
- `B2/B3` Registrations list/detail -> `/app/registrations`, `/app/registrations/:id`
- `B4/B5` Claims list/detail -> `/app/claims`, `/app/claims/:id`
- `B6` Quality module -> `/app/quality`, `/app/quality/:id`
- `B7` Complaints chat -> `/app/complaints`, `/app/complaints/:id`
- `B8/B9` Product catalog + add/edit -> `/app/products`, `/app/products/new`, `/app/products/:id/edit`
- `B10` Manual registration wizard -> `/app/manual-registration/step/:stepId` (entered via "Add Manual Registration" button on Registrations list — Registrations nav item stays active; breadcrumb shows `Registrations / Manual Entry`)
- `B11` Data import -> `/app/import` ⚠️ **No Data Import wireframe provided in Phase 1** — implement as placeholder route shell
- `B12` Settings -> `/app/settings` ⚠️ **No Settings wireframe provided in Phase 1** — implement as placeholder route shell

### 1.5 Route Behavior Requirements

- `/registrations` renders list, `/registrations/:id` renders detail (page/slide-over route).
- `/claims` renders list, `/claims/:id` renders detail.
- `/complaints` renders conversation list, `/complaints/:id` renders active thread.
- Manual registration wizard must support direct deep linking by step:
  - `/app/manual-registration/step/1`
  - `/app/manual-registration/step/2`
  - ...
- **Manual registration has NO sidebar nav item.** It is entered exclusively via the "Add Manual Registration" button on the Registrations list page. When inside the wizard, the `Registrations` nav item remains active in the sidebar and the breadcrumb reads `Registrations / Manual Entry`.

### 1.6 Role-Based Access Rules

#### CS Agent

- dashboard
- registrations
- claims
- complaints

#### Admin

- all modules
- explicitly includes products + import + settings

#### Quality

- quality module
- limited claim visibility/entry as defined by policy

Guard requirements:

- unauthenticated user -> redirect `/login`
- unauthorized role -> redirect to safe default (`/app/dashboard` or role-home)

### 1.7 User Stories Covered in Routing

- As a user, I want to log in securely so that I can access role-specific dashboard features.
- As a CS agent, I want to view dashboard metrics and recent activity so that I can quickly assess system status.
- As a CS agent, I want to browse/filter registrations and claims so that I can process work efficiently.
- As a CS agent, I want to request targeted resubmission on registration details.
- As an administrator, I want to upload historical CSV data so that legacy records can be migrated.
- As a CS agent, I want to manage multiple conversations via conversation list + deep-linked thread routes.

### 1.8 Implementation Decisions (Locked for this step)

- Detail views use route params (`:id`) for deep-linking and back navigation.
- Chat uses `/complaints/:id` to avoid local-state-only thread switching.
- Wizard uses route-driven step state (`/step/:stepId`) instead of local step only.
- Keep `/app` as protected shell layout with nested children.

### 1.9 Reference Route Config (React Router style)

```tsx
import { Navigate, Outlet } from "react-router-dom";

export const ROLES = {
  ADMIN: "admin",
  CS: "cs",
  QUALITY: "quality",
} as const;

type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_HOME: Record<Role, string> = {
  admin: "/app/dashboard",
  cs: "/app/dashboard",
  quality: "/app/quality",
};

const ProtectedRoute = ({ roles }: { roles?: Role[] }) => {
  const { user, isLoading } = useAuth(); // from auth store/context

  if (isLoading) return null; // replace with splash/loader if needed
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
};

export const routes = [
  {
    element: <PublicOnlyRoute />,
    children: [{ path: "/login", element: <LoginPage /> }], // A1
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> }, // B1
          {
            path: "registrations",
            children: [
              { index: true, element: <RegistrationsListPage /> }, // B2
              { path: ":id", element: <RegistrationDetailPage /> }, // B3
            ],
          },
          {
            path: "claims",
            children: [
              { index: true, element: <ClaimsListPage /> }, // B4
              { path: ":id", element: <ClaimDetailPage /> }, // B5
            ],
          },
          {
            path: "complaints",
            children: [
              { index: true, element: <ComplaintsListPage /> }, // B7 list
              { path: ":id", element: <ChatPage /> }, // B7 thread
            ],
          },
          {
            path: "manual-registration",
            element: <ManualRegistrationLayout />,
            children: [
              { index: true, element: <Navigate to="step/1" replace /> },
              { path: "step/:stepId", element: <ManualStepPage /> },       // B10 wizard
              { path: "success", element: <ManualRegistrationSuccessPage /> }, // B10 post-submit
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.QUALITY]} />,
            children: [
              { path: "quality", element: <QualityListPage /> }, // B6
              { path: "quality/:id", element: <QualityDetailPage /> }, // B6
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
            children: [
              {
                path: "products",
                children: [
                  { index: true, element: <ProductsListPage /> }, // B8
                  { path: "new", element: <ProductCreatePage /> }, // B9
                  { path: ":id/edit", element: <ProductEditPage /> }, // B9
                ],
              },
              { path: "import", element: <ImportPage /> }, // B11
            ],
          },
          { path: "settings", element: <SettingsPage /> }, // B12
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/app" replace /> },
];

function useAuth() {
  // replace with real auth implementation
  return { user: { role: "admin" as Role }, isLoading: false };
}
```

### 1.10 Output of Step 1

- Complete route hierarchy defined.
- Screen mapping aligned with wireframes and updated PRD.
- Role guard model defined.
- Deep-linking strategy locked for details/chat/wizard.

### 1.11 Hardening Updates
- `/app/manual-registration` redirects to `/app/manual-registration/step/1`.
- `step/:stepId` must enforce step-completion guard.
- `/app/settings` is `ADMIN` only.
- Add in-app `/app/*` not-found handling.
- **Dashboard** implements the Wireframe Hub view (flow cards + section stats). Do NOT build `TrendChart`, `RecentActivity`, or `LatestTicketsTable` — those are not in Phase 1.
- **Login has no wireframe** — implement as standard email+password form; layout pending design approval.
- **Data Import and Settings have no wireframes** — implement as empty placeholder route shells only (`<PlaceholderPage title="Coming Soon" />`). Do not implement CSV upload or settings management logic.
- Manual Registration has **no sidebar nav item** — do not add it to `Sidebar.tsx` nav config.



---

## Step 2: Frontend Structure and Module Ownership

### 2.1 Constraint (Locked)

- Follow the existing repository structure exactly.
- Do not create new top-level trees like `src/app`, `src/features`, `src/shared` in implementation.
- Use the requested architecture as an ownership model, mapped into current folders.

### 2.2 Repository Snapshot (Canonical)

Root:

- `AGENTS.MD`
- `CONTRIBUTION.md`
- `README.md`
- `PR_AGENT_SETUP.md`
- `eslint.config.ts`
- `tsconfig.json`
- `vite.config.ts`
- `package.json`
- `.env.example`
- `env.mjs`
- `src/**`

`src/` files:

- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/routes/createBrowserRouter.tsx`
- `src/routes/PrivateRoute.tsx`
- `src/routes/index.ts`
- `src/pages/Home.tsx`
- `src/pages/Unauthorized.tsx`
- `src/components/home/Home.tsx`
- `src/components/home/index.ts`
- `src/components/unauthorized/Unauthorized.tsx`
- `src/components/unauthorized/index.ts`
- `src/components/errorFallback/ErrorFallback.tsx`
- `src/components/forms/UserForm.tsx`
- `src/components/forms/index.ts`
- `src/components/ui/Button.tsx`
- `src/context/AuthContext.tsx`
- `src/context/index.ts`
- `src/hooks/useSentry.ts`
- `src/hooks/home/useHome.ts`
- `src/hooks/index.ts`
- `src/data/home/queries/getPosts.ts`
- `src/data/home/mutations/createPost.ts`
- `src/services/apiClient.ts`
- `src/services/axiosInstance.ts`
- `src/services/networkRequestService.ts`
- `src/services/index.ts`
- `src/constants/apiEndpoints.ts`
- `src/constants/queryKeys.ts`
- `src/constants/routes.ts`
- `src/constants/generic.ts`
- `src/constants/index.ts`
- `src/utils/localStorage.ts`
- `src/utils/helperFunctions.ts`
- `src/utils/utils.ts`
- `src/utils/index.ts`
- `src/schemas/userFormSchema.ts`
- `src/types/services.types.ts`
- `src/types/apiClient.types.ts`
- `src/types/routes.types.ts`
- `src/types/env.d.ts`
- `src/types/change-object-case.d.ts`
- `src/types/crypto-js.d.ts`
- `src/types/common/error.types.ts`
- `src/types/home/api.types.ts`
- `src/types/home/post.types.ts`

### 2.3 Requested Architecture Adapted to Current Structure

Global app-layer responsibilities (mapped):

- Router config -> `src/routes/createBrowserRouter.tsx`
- Guard logic -> `src/routes/PrivateRoute.tsx`
- Providers/bootstrap -> `src/main.tsx`, `src/App.tsx`, `src/context/*`
- Query singleton -> add under `src/services/` or `src/constants/` (project-consistent location)
- Layout shell -> `src/components/layout/*` (create as needed), routed via `src/pages/*` wrappers

Equivalent of requested `AppLayout/AuthLayout`:

- `AppLayout` component path (recommended): `src/components/layout/AppLayout.tsx`
- `AuthLayout` component path (recommended): `src/components/layout/AuthLayout.tsx`

Equivalent of requested `ProtectedRoute/RoleGuard`:

- Keep `ProtectedRoute` in `src/routes/PrivateRoute.tsx`
- Add role guard helper in same file or `src/routes/RoleGuard.tsx` (under `src/routes`)

### 2.4 Feature Ownership Model (Within Current Folders)

Use feature naming namespaces inside current folders:

- Components -> `src/components/<feature>/*`
- Hooks -> `src/hooks/<feature>/*` (and export from `src/hooks/index.ts`)
- Data layer -> `src/data/<feature>/queries/*` and `src/data/<feature>/mutations/*`
- Types -> `src/types/<feature>/*`
- Pages -> `src/pages/*` (thin route wrappers)

#### Auth

- `src/components/auth/LoginForm.tsx`   ⚠️ No Login wireframe provided — implement standard email+password form; exact layout pending design approval
- `src/context/AuthContext.tsx`
- `src/hooks/auth/useAuth.ts`
- `src/data/auth/mutations/login.ts`
- `src/pages/LoginPage.tsx`

#### Dashboard

- `src/components/dashboard/DashboardOverviewStats.tsx`   — 3 stat cards: Total Flows, Total Screens, Phase
- `src/components/dashboard/DashboardFlowCard.tsx`         — card per flow (title, icon, screen count, description)
- `src/components/dashboard/DashboardFlowGrid.tsx`         — grid container for 6 flow cards
- `src/pages/DashboardPage.tsx`   ← Wireframe Hub view (6 flows, 31 screens)

#### Registrations (B2/B3)

- `src/components/registrations/RegistrationTable.tsx`
- `src/components/registrations/RegistrationFilters.tsx`
- `src/components/registrations/RegistrationDetailPanel.tsx`
- `src/components/registrations/ResubmissionSelector.tsx`
- `src/hooks/registrations/useRegistrations.ts`
- `src/data/registrations/queries/getRegistrations.ts`
- `src/data/registrations/queries/getRegistrationById.ts`
- `src/data/registrations/mutations/approveRegistration.ts`
- `src/data/registrations/mutations/resubmitRegistration.ts`
- `src/pages/RegistrationsListPage.tsx`
- `src/pages/RegistrationDetailPage.tsx`

#### Claims (B4/B5)

- `src/components/claims/ClaimsTable.tsx`
- `src/components/claims/ClaimDetailPanel.tsx`
- `src/components/claims/ClaimTimeline.tsx`
- `src/components/claims/ClaimImages.tsx`
- `src/hooks/claims/useClaims.ts`
- `src/data/claims/queries/getClaims.ts`
- `src/data/claims/queries/getClaimById.ts`
- `src/data/claims/mutations/approveClaim.ts`
- `src/data/claims/mutations/sendToQuality.ts`
- `src/pages/ClaimsListPage.tsx`
- `src/pages/ClaimDetailPage.tsx`

#### Quality (B6)

- `src/components/quality/QualityQueueTable.tsx`
- `src/components/quality/QualityDecisionPanel.tsx`
- `src/data/quality/queries/getQualityQueue.ts`
- `src/data/quality/mutations/submitDecision.ts`
- `src/pages/QualityListPage.tsx`
- `src/pages/QualityDetailPage.tsx`

#### Complaints (B7)

- `src/components/complaints/ConversationList.tsx`
- `src/components/complaints/ChatWindow.tsx`
- `src/components/complaints/MessageBubble.tsx`
- `src/components/complaints/ChatInput.tsx`
- `src/hooks/complaints/useChat.ts`
- `src/hooks/complaints/useWebSocket.ts`
- `src/data/complaints/queries/getConversations.ts`
- `src/data/complaints/queries/getMessages.ts`
- `src/data/complaints/mutations/sendMessage.ts`
- `src/pages/ComplaintsListPage.tsx`
- `src/pages/ChatPage.tsx`

#### Products (B8/B9)

- `src/components/products/ProductTable.tsx`        ← replaces ProductGrid.tsx (table view not grid)
- `src/components/products/SurfaceTypeTable.tsx`    ← surface types tab table
- `src/components/products/SurfaceTypeModal.tsx`    ← add/edit surface type modal
- `src/components/products/DeleteConfirmModal.tsx`  ← shared delete confirmation modal
- `src/components/products/ProductForm.tsx`
- `src/data/products/queries/getProducts.ts`
- `src/data/products/queries/getSurfaceTypes.ts`
- `src/data/products/mutations/createProduct.ts`
- `src/data/products/mutations/updateProduct.ts`
- `src/data/products/mutations/deleteProduct.ts`
- `src/data/products/mutations/createSurfaceType.ts`
- `src/data/products/mutations/updateSurfaceType.ts`
- `src/data/products/mutations/deleteSurfaceType.ts`
- `src/pages/ProductsListPage.tsx`
- `src/pages/ProductCreatePage.tsx`
- `src/pages/ProductEditPage.tsx`

#### Manual Registration (B10)

- `src/components/manualRegistration/Stepper.tsx`
- `src/components/manualRegistration/CustomerForm.tsx`
- `src/components/manualRegistration/PurchaseForm.tsx`
- `src/components/manualRegistration/ProductForm.tsx`
- `src/components/manualRegistration/UploadForm.tsx`
- `src/components/manualRegistration/ReviewStep.tsx`
- `src/components/manualRegistration/SuccessScreen.tsx`
- `src/hooks/manualRegistration/useManualRegistration.ts`
- `src/pages/ManualRegistrationLayout.tsx`
- `src/pages/ManualStepPage.tsx`
- `src/pages/ManualRegistrationSuccessPage.tsx`   ← ADD: post-submit success screen (step 6)

#### Import (B11)

- `src/components/import/UploadZone.tsx`
- `src/components/import/ImportSummary.tsx`
- `src/components/import/ErrorTable.tsx`
- `src/data/import/mutations/uploadCSV.ts`
- `src/data/import/mutations/validateCSV.ts`
- `src/pages/ImportPage.tsx`

### 2.5 Shared/Reusables in Current Structure

- UI primitives remain in `src/components/ui/*` (expand with `Input`, `Modal`, `Table`, `Badge`).
- Shared hooks in `src/hooks/*` (`useDebounce`, `usePagination`).
- API client/system in `src/services/*`.
- Global constants in `src/constants/*`.
- Utilities in `src/utils/*`.
- Common typing in `src/types/common/*`.

### 2.6 Responsibilities Table (Current Paths)

| Area                                 | Purpose                   |
| ------------------------------------ | ------------------------- |
| `src/routes/createBrowserRouter.tsx` | full route tree           |
| `src/routes/PrivateRoute.tsx`        | auth and role gate        |
| `src/components/layout/*`            | sidebar/header/app shell  |
| `src/context/AuthContext.tsx`        | session + user role state |
| `src/data/*`                         | feature queries/mutations |
| `src/services/*`                     | networking and API client |
| `src/pages/*`                        | route entry wrappers      |

### 2.7 Rules (Must Follow)

Must:

- Keep feature business logic in `hooks` + `data`, not component JSX.
- Keep API calls inside `src/data/*` and/or `src/services/*`.
- Keep pages thin and composed from feature components.
- Keep route constants in `src/constants/routes.ts`.

Never:

- Mix feature code in generic folders without feature namespace.
- Put all logic under `src/components/`.
- Bypass `PrivateRoute` for protected modules.

### 2.8 Route Mapping to Feature Ownership

| Route                      | Ownership            |
| -------------------------- | -------------------- |
| `/login`                   | `auth`               |
| `/app/dashboard`           | `dashboard`          |
| `/app/registrations`       | `registrations`      |
| `/app/claims`              | `claims`             |
| `/app/quality`             | `quality`            |
| `/app/complaints`          | `complaints`         |
| `/app/products`            | `products`           |
| `/app/manual-registration` | `manualRegistration` |
| `/app/import`              | `import`             |
| `/app/settings`            | `settings/shared`    |

### 2.9 Output of Step 2

- Requested architecture content has been added and normalized.
- Implementation remains aligned to your exact current folder structure.
- Feature ownership, responsibilities, and route mapping are now explicit for the next steps.

### 2.10 Hardening Updates
- Ensure these quality mutations exist in the structure:
  - `src/data/quality/mutations/submitDecision.ts`
  - `src/data/quality/mutations/requestMoreInfo.ts`
- Layout breakdown is mandatory:
```text
src/components/layout/
  AppLayout.tsx
  AuthLayout.tsx
  Sidebar.tsx
  Header.tsx
  PageWrapper.tsx
```

---

## Step 3: Component Tree and Data Flow

### 3.1 How to Read This Step

- Each screen follows: `Layout -> Page -> Sections -> Components`.
- Page owns data fetching and state orchestration.
- Child components receive props and emit events upward.

### 3.2 Global Layout Tree

```tsx
<AppProviders>
  <Router>
    <AuthLayout /> or <AppLayout />
    <AppLayout>
      <Sidebar />
      <Header />
      <Outlet />
    </AppLayout>
  </Router>
</AppProviders>
```

### 3.3 Screen Trees

#### B1 Dashboard (Wireframe Hub)

```tsx
<DashboardPage>
  <PageHeader title="Dulux CS Dashboard - Wireframe Hub" />
  <DashboardOverviewStats>
    <StatCard label="Total Flows" value="6" />
    <StatCard label="Total Screens" value="31" />
    <StatCard label="Phase" value="Phase 1" />
  </DashboardOverviewStats>
  <DashboardFlowGrid>
    <DashboardFlowCard title="Registration Approvals" icon="check" screens={4}
      description="List, detail, resubmission & rejection modals" />
    <DashboardFlowCard title="Manual Registration" icon="edit" screens={6}
      description="5-step form wizard with review & success states" />
    <DashboardFlowCard title="Claims Approvals" icon="alert" screens={5}
      description="List, detail, forward, reject & request info modals" />
    <DashboardFlowCard title="Quality Review" icon="inspect" screens={5}
      description="Technical review, approve, reject & request info modals" />
    <DashboardFlowCard title="Live Chat" icon="chat" screens={6}
      description="3-panel chat with resolve, transfer & escalate modals" />
    <DashboardFlowCard title="Product Catalog" icon="box" screens={5}
      description="Products, surfaces, add/edit forms & delete modal" />
  </DashboardFlowGrid>
</DashboardPage>
```

#### B2 Registrations List

```tsx
<RegistrationsListPage>
  <StatsRow>                          {/* 3 stat cards */}
    <StatCard label="Total Registrations" />
    <StatCard label="Pending Review" highlight />    {/* amber left border */}
    <StatCard label="Approved" />
  </StatsRow>
  <StatusTabs>                        {/* All | Pending | Approved | Rejected | Resubmission */}
    <StatusTab label="All" />
    <StatusTab label="Pending" />
    <StatusTab label="Approved" />
    <StatusTab label="Rejected" />
    <StatusTab label="Resubmission" />
  </StatusTabs>
  <PageHeader />
  <RegistrationFilters>
    <SearchInput />
    <StatusFilter />
    <DateFilter />
    <AddManualRegistrationButton />   {/* navigates to /app/manual-registration/step/1 */}
  </RegistrationFilters>
  <RegistrationTable>
    {/* Columns: Reg. ID (chip-reg) | Customer | Phone | City | Source | Submitted | Status | Actions */}
    <Table>
      <RegistrationRow />
      <RegistrationRow />
    </Table>
  </RegistrationTable>
  <Pagination />
</RegistrationsListPage>
```

Reference constant for filter tabs:
```ts
export const REGISTRATION_FILTER_TABS = ["All", "Pending", "Approved", "Rejected", "Resubmission"] as const;
```

#### B3 Registration Detail

```tsx
<RegistrationDetailPage>
  <DetailLayout>
    <CustomerInfo />
    <PurchaseInfo />
    <ProductList>
      <ProductItem />
    </ProductList>
    <InvoiceGallery>
      <ImagePreview />
    </InvoiceGallery>
    <ResubmissionSection>
      <ResubmissionSelector />
      <CommentBox />
    </ResubmissionSection>
    <ActionBar>
      <ApproveButton />
      <RejectButton />
      <ResubmitButton />
    </ActionBar>
  </DetailLayout>
</RegistrationDetailPage>
```

Important:

- `ResubmissionSelector` is dynamic and must support field-level selection + payload mapping.

#### B4 Claims List

```tsx
<ClaimsListPage>
  <StatsRow>                          {/* 4 stat cards */}
    <StatCard label="Total Claims" />
    <StatCard label="Pending CS Review" highlight />   {/* amber left border */}
    <StatCard label="Forwarded to Quality" />
    <StatCard label="Resolved" />
  </StatsRow>
  <StatusTabs>                        {/* All | Pending | Forwarded | Approved | Rejected | Info Requested */}
    <StatusTab label="All" />
    <StatusTab label="Pending" />
    <StatusTab label="Forwarded" />
    <StatusTab label="Approved" />
    <StatusTab label="Rejected" />
    <StatusTab label="Info Requested" />
  </StatusTabs>
  <PageHeader />
  <ClaimsFilters>
    <DateRangeFilter />
    <IssueTypeFilter />
  </ClaimsFilters>
  <ClaimsTable>
    {/* Columns: Claim ID (chip-claim) | Customer | Reg. ID (chip-reg, clickable) | Issue Type | Photos | Submitted | Status | Actions */}
    <ClaimRow />
  </ClaimsTable>
  <Pagination />
</ClaimsListPage>
```

#### B5 Claim Detail

```tsx
<ClaimDetailPage>
  <ClaimHeader />
  <ClaimInfo />
  <ClaimImages>
    <ImagePreview />
  </ClaimImages>
  <ClaimTimeline />
  <AgentNotes />
  <ActionBar>
    <SendToQualityButton />
    <CloseButton />
  </ActionBar>
</ClaimDetailPage>
```

#### B6 Quality View

```tsx
<QualityPage>
  <StatsRow>                              {/* 3 stat cards — NO Avg Review Time card */}
    <StatCard label="Awaiting Review" highlight />   {/* amber left border */}
    <StatCard label="Approved" />
    <StatCard label="Rejected" />
  </StatsRow>
  <StatusTabs>                            {/* Awaiting Review | Approved | Rejected | More Info Needed */}
    <StatusTab label="Awaiting Review" active />
    <StatusTab label="Approved" />
    <StatusTab label="Rejected" />
    <StatusTab label="More Info Needed" />
  </StatusTabs>
  <Toolbar>
    <FilterSelect label="Issue Type: All" />
    <FilterSelect label="Priority: All" />
  </Toolbar>
  <SplitLayout>
    <QualityQueue>
      {/* Columns: Claim ID | Customer | Issue Type | Product | Forwarded By | Priority | Forwarded On | Actions */}
      <QueueTable />
    </QualityQueue>
    <QualityDetailPanel>
      <ClaimInfo />
      <Images />
      <AgentNotes />
      <DecisionActions>
        <ApproveButton />
        <RejectButton />
        <NeedInfoButton />
      </DecisionActions>
    </QualityDetailPanel>
  </SplitLayout>
</QualityPage>
```

#### B7 Complaints Chat

```tsx
<ChatPage>
  <ChatLayout>
    <ConversationList>
      <ConversationItem />
    </ConversationList>
    <ChatWindow>
      <ChatHeader>
        <ChatHeaderAvatar />
        <div>
          <ChatHeaderName />
          <OnlineStatus label="Online on WhatsApp" status="online" />  {/* green dot */}
        </div>
        <ChatHeaderActions>
          <AssignButton />   {/* ⚙ gear icon */}
          <MoreButton />     {/* ⋯ ellipsis icon */}
        </ChatHeaderActions>
      </ChatHeader>
      <MessageList>
        <MessageBubble />
        <MessageBubble />
      </MessageList>
      <ChatInput>
        <InputActionButton icon="attach" title="Attach Image" />
        <InputActionButton icon="templates" title="Templates" />
        <MessageTextField />
        <SendButton />
      </ChatInput>
    </ChatWindow>
  </ChatLayout>
</ChatPage>
```

Critical data flow:

- `useChat()` manages message query/cache state.
- `useWebSocket()` streams inbound updates.
- `ChatInput` dispatches `sendMessage` action/mutation.

#### B8 Products

```tsx
<ProductsListPage>
  <PageHeader />
  <Tabs>
    <Tab label="Products" />
    <Tab label="Surface Types" />
  </Tabs>
  <ProductFilters />
  <ProductTable>      {/* table view — NOT grid */}
    <ProductRow />
    <ProductRow />
  </ProductTable>
  <Pagination />
</ProductsListPage>
```

#### B9 Product Form

```tsx
<ProductFormPage>
  <ProductForm>
    <Input name="name" />
    <Select name="type" />
    <Input name="coverage" />
    <SurfaceSelector />
    <FeaturesInput />
    <ImageUpload />
    <StatusToggle />
    <FormActions>
      <SaveButton />
      <CancelButton />
    </FormActions>
  </ProductForm>
</ProductFormPage>
```

#### B10 Manual Registration Wizard

```tsx
<ManualRegistrationLayout>
  <Stepper />
  <ManualStepPage>
    {step === 1 && <CustomerForm />}
    {step === 2 && <PurchaseForm />}
    {step === 3 && <ProductForm />}
    {step === 4 && <UploadForm />}
    {step === 5 && <ReviewStep />}
  </ManualStepPage>
  <StepActions>
    <BackButton />
    <NextButton />
  </StepActions>
</ManualRegistrationLayout>
```

Key logic:

- Shared wizard state across steps.
- Step-scoped validation and guarded navigation.

#### B11 Import

```tsx
<ImportPage>
  <PageHeader />
  <UploadSection>
    <UploadZone />
    <UploadButton />
  </UploadSection>
  <ValidationSummary />
  <ErrorTable />
  <ImportActions>
    <ValidateButton />
    <ImportButton />
  </ImportActions>
</ImportPage>
```

### 3.4 Global Composition Patterns

Pattern: Page

```tsx
Page
 ├── Header
 ├── Filters
 ├── Content (Table/Grid)
 └── Actions
```

Pattern: Detail

```tsx
DetailPage
 ├── Info Section
 ├── Media Section
 ├── Notes
 └── ActionBar
```

Pattern: Split

```tsx
SplitLayout
 ├── Left (List)
 └── Right (Detail)
```

Used in:

- Complaints chat
- Quality review

### 3.5 Data Ownership Principle (Mandatory)

Rule:

- **Page handles data; child components receive props.**

Good:

```tsx
const { data } = useRegistrations();
return <RegistrationTable data={data} />;
```

Bad:

```tsx
// inside RegistrationTable (avoid)
useRegistrations();
```

### 3.6 Output of Step 3

- Screen-by-screen component hierarchy defined.
- Data ownership and flow boundaries locked.
- Complex modules (chat, wizard, resubmission) explicitly structured for implementation.

### 3.7 Hardening Updates
Resubmission payload contract:
```ts
type ResubmissionField =
  | "topcoat_invoice"
  | "basecoat_invoice"
  | "product_details"
  | "dealer_info"
  | "purchase_date";

type ResubmissionPayload = {
  registrationId: string;
  fields: ResubmissionField[];
  note?: string;
};
```

Invoice/image inspection must include lightbox:
```tsx
<InvoiceGallery>
  <ImageThumb onClick={() => openLightbox(src)} />
  <Lightbox isOpen={isOpen} src={activeSrc} onClose={closeLightbox} />
</InvoiceGallery>
```

All list pages must include loading/empty states:
```tsx
{isLoading && <TableSkeleton />}
{!isLoading && data.length === 0 && <EmptyState message="No records found" />}
{!isLoading && data.length > 0 && <DataTable data={data} />}
```

---

## Step 4: State Management Strategy

### 4.1 State Types in This System

#### Server State (Primary)

Comes from backend APIs:

- registrations list/detail
- claims list/detail
- products
- dashboard stats
- import validation/result
- chat initial message history

#### UI/Local State

Only for UI behavior:

- modal/drawer visibility
- filter input values
- pagination controls
- active tabs
- stepper position
- transient form state

#### Real-Time State (Special)

Live updates:

- incoming chat messages
- notifications
- status update pushes

### 4.2 Final Tooling Decision

- **React Query (TanStack Query)** for server state (main state system)
- **Zustand** for lightweight global app UI/session state
- **React local state (`useState`, `useReducer`)** for component-local UI state
- **WebSocket** for real-time event streams

### 4.3 Why This Fits This Project

React Query handles most screens:

- dashboard
- registrations
- claims
- products
- import
- detail pages and mutations

Benefits used in this app:

- cache and invalidation
- background refetch
- mutation handling (approve/reject/resubmit/send-to-quality)
- pagination support

Zustand stays minimal:

- authenticated user/session snapshot
- sidebar collapsed state
- currently selected chat id
- optional wizard shared draft state (in-memory only)
- notification counters

Local component state:

- one-off UI interactions
- input controls and temporary UX state not shared globally

### 4.4 Chat State Strategy (Critical)

Use hybrid strategy:

- initial load -> React Query
- real-time events -> WebSocket
- merge incoming events into local view state and/or query cache

Reference pattern:

```tsx
const [messages, setMessages] = useState<Message[]>([]);

useEffect(() => {
  socket.on("message", (msg) => {
    setMessages((prev) => [...prev, msg]);
  });
  return () => socket.off("message");
}, [socket]);
```

Implementation note:

- prefer query cache update (`queryClient.setQueryData`) for consistency when possible.

### 4.5 Feature-wise State Distribution

| Feature                    | State Approach                            |
| -------------------------- | ----------------------------------------- |
| Dashboard                  | React Query                               |
| Registrations list/detail  | React Query + mutations                   |
| Claims list/detail         | React Query + mutations                   |
| Quality                    | React Query + mutations                   |
| Products                   | React Query + mutations                   |
| Import                     | React Query mutation + result state       |
| Complaints Chat            | React Query + WebSocket + local merge     |
| Manual Registration Wizard | Zustand (in-memory shared draft) + local form state |

### 4.6 Clean Architecture View

```text
React Query -> Server Data (Main)
Zustand -> Global UI/Session State
useState/useReducer -> Local UI State
WebSocket -> Real-time Event Stream
```

### 4.7 Anti-Patterns to Avoid

- Do not use Redux for this project baseline (overhead not justified).
- Do not fetch server data directly inside presentational components.
- Do not duplicate server data in Zustand.
- Do not mix chat real-time transport logic into generic UI components.

### 4.8 Example Patterns

React Query query:

```tsx
const { data } = useQuery({
  queryKey: ["registrations", filters],
  queryFn: () => getRegistrations(filters),
});
```

Zustand store:

```tsx
const useAppStore = create<{
  user: User | null;
  setUser: (user: User | null) => void;
}>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### 4.9 Output of Step 4

- State ownership is explicitly defined by type.
- Tooling decisions are locked (React Query + Zustand + local state + WebSocket).
- Chat real-time strategy is defined.
- Feature-by-feature state handling is implementation-ready.

### 4.10 Hardening Updates
Canonical Zustand shape:
```ts
type AppStore = {
  user: User | null;
  setUser: (user: User | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  wizardDraft: Partial<ManualRegistrationFormValues> | null;
  setWizardDraft: (draft: Partial<ManualRegistrationFormValues>) => void;
  clearWizardDraft: () => void;
};
```
- Do not persist manual registration draft data in `localStorage`/`sessionStorage`.
- Keep wizard draft state in-memory only (Zustand + form state); clear on tab close/refresh/logout/submit.
- If draft recovery is required, use a backend draft endpoint with proper auth and server-side controls instead of browser storage.

---

## Step 5: API Layer + React Query Hooks (Repository-Aligned)

### 5.1 Locked Rules

From project constraints:
- `/data` -> React Query queries + mutations
- `/services` -> Axios transport only
- `/constants` -> API endpoints + query keys
- `/hooks` -> logic composition only (no direct transport calls)
- keep and use:
  - `src/services/apiClient.ts`
  - `src/services/axiosInstance.ts`
  - `src/services/networkRequestService.ts`

### 5.2 Final API Layer Architecture (Current Structure)

```text
src/
  constants/
    apiEndpoints.ts
    queryKeys.ts

  services/
    axiosInstance.ts
    apiClient.ts
    networkRequestService.ts

  data/
    registrations/
      queries/
        getRegistrations.ts
        getRegistrationById.ts
      mutations/
        approveRegistration.ts
        resubmitRegistration.ts

    claims/
      queries/
        getClaims.ts
        getClaimById.ts
      mutations/
        approveClaim.ts
        sendToQuality.ts

    complaints/
      queries/
        getConversations.ts
        getMessages.ts
      mutations/
        sendMessage.ts

    products/
      queries/
        getProducts.ts
      mutations/
        createProduct.ts
        updateProduct.ts

    dashboard/
      queries/
        getDashboardStats.ts
```

### 5.3 Constants Layer

`src/constants/apiEndpoints.ts`
```ts
export const API_ENDPOINTS = {
  REGISTRATIONS: "/registrations",
  CLAIMS: "/claims",
  PRODUCTS: "/products",
  COMPLAINTS: "/complaints",
  DASHBOARD: "/dashboard",
} as const;
```

`src/constants/queryKeys.ts`
```ts
export const QUERY_KEYS = {
  REGISTRATIONS: ["registrations"] as const,
  REGISTRATION_DETAIL: (id: string) => ["registration", id] as const,

  CLAIMS: ["claims"] as const,
  CLAIM_DETAIL: (id: string) => ["claim", id] as const,

  PRODUCTS: ["products"] as const,

  CONVERSATIONS: ["conversations"] as const,
  MESSAGES: (id: string) => ["messages", id] as const,

  DASHBOARD: ["dashboard"] as const,
} as const;
```

### 5.4 Services Layer (Use Provided Transport)

`src/services/apiClient.ts` (canonical)
```ts
import type { AxiosRequestConfig, Method } from "axios";
import axiosInstance from "./axiosInstance";

export const performRequest = async <
  TResponse,
  TPayload extends Record<string, unknown> | undefined = undefined,
  TParams extends Record<string, unknown> = Record<string, unknown>
>({
  method,
  url,
  payload,
  params,
  config,
}: {
  method: Method;
  url: string;
  payload?: TPayload;
  params?: TParams;
  config?: AxiosRequestConfig;
}): Promise<TResponse> => {
  const res = await axiosInstance.request<TResponse>({
    method,
    url,
    params,
    data: payload,
    ...config,
  });
  return res.data;
};
```

`src/services/axiosInstance.ts` (canonical behavior)
- base URL from env
- auth token injection
- request snake_case conversion
- response camelCase conversion
- normalized error payload conversion

`src/services/networkRequestService.ts`
- keep as orchestration utility if already used in project flows
- do not bypass interceptors/normalization in `axiosInstance`

### 5.5 Data Layer Examples (React Query)

#### Registrations Query
`src/data/registrations/queries/getRegistrations.ts`
```ts
import { useQuery } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";
import { QUERY_KEYS } from "#/constants/queryKeys";

type RegistrationsParams = Record<string, unknown> | undefined;
type RegistrationListResponse = unknown; // replace with real type

export const fetchRegistrations = (params?: RegistrationsParams) =>
  performRequest<RegistrationListResponse, undefined, Record<string, unknown>>({
    method: "GET",
    url: API_ENDPOINTS.REGISTRATIONS,
    params: params ?? {},
  });

export const useGetRegistrations = (params?: RegistrationsParams) =>
  useQuery({
    queryKey: [...QUERY_KEYS.REGISTRATIONS, params] as const,
    queryFn: () => fetchRegistrations(params),
    staleTime: 1000 * 60 * 5,
  });
```

#### Registration Detail Query
`src/data/registrations/queries/getRegistrationById.ts`
```ts
import { useQuery } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";
import { QUERY_KEYS } from "#/constants/queryKeys";

type RegistrationDetailResponse = unknown; // replace with real type

export const useGetRegistrationById = (id: string) =>
  useQuery({
    queryKey: QUERY_KEYS.REGISTRATION_DETAIL(id),
    queryFn: () =>
      performRequest<RegistrationDetailResponse>({
        method: "GET",
        url: `${API_ENDPOINTS.REGISTRATIONS}/${id}`,
      }),
    enabled: !!id,
  });
```

### 5.6 Mutation Examples (Cache Invalidation)

`src/data/registrations/mutations/approveRegistration.ts`
```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";
import { QUERY_KEYS } from "#/constants/queryKeys";

export const useApproveRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      performRequest<void>({
        method: "POST",
        url: `${API_ENDPOINTS.REGISTRATIONS}/${id}/approve`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REGISTRATIONS });
    },
  });
};
```

`src/data/registrations/mutations/resubmitRegistration.ts`
```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";
import { QUERY_KEYS } from "#/constants/queryKeys";

export const useResubmitRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: string[] }) =>
      performRequest<void, { fields: string[] }>({
        method: "POST",
        url: `${API_ENDPOINTS.REGISTRATIONS}/${id}/resubmit`,
        payload: { fields },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REGISTRATIONS });
    },
  });
};
```

### 5.7 Chat API Examples

`src/data/complaints/queries/getMessages.ts`
```ts
import { useQuery } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";
import { QUERY_KEYS } from "#/constants/queryKeys";

type MessagesResponse = unknown; // replace with real type

export const useGetMessages = (conversationId: string) =>
  useQuery({
    queryKey: QUERY_KEYS.MESSAGES(conversationId),
    queryFn: () =>
      performRequest<MessagesResponse>({
        method: "GET",
        url: `${API_ENDPOINTS.COMPLAINTS}/${conversationId}/messages`,
      }),
    enabled: !!conversationId,
  });
```

`src/data/complaints/mutations/sendMessage.ts`
```ts
import { useMutation } from "@tanstack/react-query";
import { performRequest } from "#/services/apiClient";
import { API_ENDPOINTS } from "#/constants/apiEndpoints";

export const useSendMessage = () =>
  useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      performRequest<void, { message: string }>({
        method: "POST",
        url: `${API_ENDPOINTS.COMPLAINTS}/${id}/messages`,
        payload: { message },
      }),
  });
```

### 5.8 Usage Rules in UI

Correct (page/container level):
```tsx
const { data, isLoading } = useGetRegistrations(filters);
```

Never:
```tsx
// do not call transport directly in components
axios.get(...)
performRequest(...)
```

### 5.9 Optional Validation Layer

Use schema parse on response in data layer where needed:
```ts
import { z } from "zod";

const registrationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// registrationSchema.array().parse(data)
```

### 5.10 Final Request Flow

```text
Page/Container
  -> Hook (logic only)
    -> Data layer (/data queries/mutations)
      -> Service transport (performRequest)
        -> axiosInstance interceptors
          -> Backend
```

### 5.11 Output of Step 5
- API layer boundaries are locked and aligned to your repository.
- Query/mutation pattern is standardized with React Query.
- `performRequest` is the canonical transport entry.
- Cache invalidation strategy is defined for mutation flows.

### 5.12 Hardening Updates
Expanded endpoints must include auth/quality/import + sub-actions:
```ts
export const API_ENDPOINTS = {
  REGISTRATIONS: "/registrations",
  CLAIMS: "/claims",
  PRODUCTS: "/products",
  COMPLAINTS: "/complaints",
  DASHBOARD: "/dashboard",
  QUALITY: "/quality",
  IMPORT: "/import",
  AUTH: { LOGIN: "/auth/login", LOGOUT: "/auth/logout", ME: "/auth/me" },
  REGISTRATION_APPROVE: (id: string) => `/registrations/${id}/approve`,
  REGISTRATION_REJECT: (id: string) => `/registrations/${id}/reject`,
  REGISTRATION_RESUBMIT: (id: string) => `/registrations/${id}/resubmit`,
  CLAIM_APPROVE: (id: string) => `/claims/${id}/approve`,
  CLAIM_SEND_TO_QUALITY: (id: string) => `/claims/${id}/send-to-quality`,
  PRODUCT_DELETE: (id: string) => `/products/${id}`,
} as const;
```

Mutation error handling standard:
```ts
onError: (error) => {
  toast.error("Something went wrong. Please try again.");
  captureException(error);
}
```

---

## Step 6: Form Architecture and Validation

### 6.1 Locked Form Rules

Use this strict separation:
- `src/components/forms/*` -> UI form components only
- `src/schemas/*` -> Zod schemas and form value types
- React Hook Form -> form state and field wiring
- pages/containers -> submission logic + React Query mutations

### 6.2 Form Flow

```text
Zod Schema (/schemas)
        ↓
React Hook Form (logic)
        ↓
Form Component (/components/forms)
        ↓
Page (integration + mutation)
```

### 6.3 Folder Structure (Current-Repo Aligned)

```text
src/
  components/
    forms/
      RegistrationForm.tsx
      ProductForm.tsx
      ClaimForm.tsx

  schemas/
    registration.schema.ts
    product.schema.ts
    claim.schema.ts
```

### 6.4 Example: Registration Form

`src/schemas/registration.schema.ts`
```ts
import { z } from "zod";

export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  city: z.string().min(1, "City is required"),
  dealer: z.string().min(1, "Dealer is required"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
});

export type RegistrationFormValues = z.infer<typeof registrationSchema>;
```

`src/components/forms/RegistrationForm.tsx` (UI only)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationFormValues } from "#/schemas/registration.schema";

type Props = {
  defaultValues?: Partial<RegistrationFormValues>;
  onSubmit: (data: RegistrationFormValues) => void;
};

export const RegistrationForm = ({ defaultValues, onSubmit }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} placeholder="Name" />
      {errors.name && <p>{errors.name.message}</p>}

      <input {...register("phone")} placeholder="Phone" />
      {errors.phone && <p>{errors.phone.message}</p>}

      <input {...register("city")} placeholder="City" />
      {errors.city && <p>{errors.city.message}</p>}

      <button type="submit">Submit</button>
    </form>
  );
};
```

Page integration pattern:
```tsx
const RegistrationPage = () => {
  const { mutate } = useCreateRegistration(); // from /data

  return <RegistrationForm onSubmit={(data) => mutate(data)} />;
};
```

### 6.5 Product Form (B9)

Schema baseline:
```ts
import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  type: z.string().min(1, "Product type is required"),
  coverage: z.coerce.number().nonnegative().optional(),
  productUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  keyFeatures: z.string().optional(),
  surfaces: z.array(z.string()).min(1, "Select at least one surface"),
  status: z.enum(["active", "inactive"]).default("active"),
  image: z.any().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
```

Component composition:
```tsx
<ProductForm>
  <Input />
  <Select />
  <MultiSelect />   // surfaces
  <FileUpload />
  <Textarea />
</ProductForm>
```

### 6.6 Manual Registration Wizard (B10)

This is a multi-step form, not a single-submit form.

Structure:
```tsx
<ManualRegistrationLayout>
  <Stepper />
  {step === 1 && <CustomerForm />}
  {step === 2 && <PurchaseForm />}
  {step === 3 && <ProductForm />}
  {step === 4 && <UploadForm />}
  {step === 5 && <Review />}
</ManualRegistrationLayout>
```

State strategy:
- use `useForm` + `FormProvider` at wizard root
- use `useFormContext` inside each step
- enforce per-step validation before navigation
- do not store sensitive wizard draft fields in browser storage (`localStorage`/`sessionStorage`)

Example:
```tsx
const methods = useForm({
  resolver: zodResolver(fullSchema),
});

<FormProvider {...methods}>
  <StepComponent />
</FormProvider>
```

Step usage:
```tsx
const { register } = useFormContext();
```

### 6.7 Chat Input Form

Pattern:
```tsx
const { register, handleSubmit, reset } = useForm<{ message: string }>();

<form
  onSubmit={handleSubmit((data) => {
    sendMessage(data.message);
    reset();
  })}
>
  <input {...register("message")} />
</form>
```

### 6.8 Import CSV Form

Schema:
```ts
import { z } from "zod";

export const importSchema = z.object({
  file: z.instanceof(File),
});
```

Form field:
```tsx
<input type="file" {...register("file")} />
```

### 6.9 Form Patterns (Mandatory)

Pattern 1: Smart vs Dumb
- Form component -> UI only
- Page/container -> submit logic + API integration

Pattern 2: Validation
- always schema-driven via Zod
- no ad-hoc inline manual validation logic

Pattern 3: Default Values
- use for edit and prefill scenarios

### 6.10 Anti-Patterns to Avoid

- API calls inside form components
- validation logic embedded in UI components
- mixing transport/business logic into render-only form controls
- multi-step wizard without `FormProvider` state sharing

### 6.11 Final Form Stack

```text
React Hook Form -> form state
Zod -> validation
FormProvider -> multi-step state continuity
React Query -> API submission and mutation lifecycle
```

### 6.12 Output of Step 6
- Form architecture is locked to your rules and folder structure.
- Schema-first validation is defined for all core form types.
- Multi-step wizard form strategy is implementation-ready.

### 6.13 Hardening Updates
File constraints:
```ts
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, "Max 5MB")
    .refine(
      (f) => ["image/jpeg", "image/png", "application/pdf"].includes(f.type),
      "JPG, PNG or PDF only"
    ),
});

export const claimPhotosSchema = z.object({
  photos: z.array(z.instanceof(File)).length(3, "Exactly 3 photos required"),
});
```

Wizard per-step schemas:
```ts
export const step1Schema = registrationSchema.pick({
  name: true, phone: true, email: true, city: true, address: true,
});
export const step2Schema = registrationSchema.pick({
  purchaseDate: true, dealerName: true, dealerCity: true,
});
export const step3Schema = registrationSchema.pick({
  topcoat: true, topcoatQty: true, basecoat: true, basecoatQty: true,
});
export const step4Schema = z.object({
  topcoatInvoice: z
    .instanceof(File, { message: "Topcoat invoice is required" })
    .refine((f) => f.size <= 5 * 1024 * 1024, "Max 5MB")
    .refine(
      (f) => ["image/jpeg", "image/png", "application/pdf"].includes(f.type),
      "JPG, PNG or PDF only"
    ),
  basecoatInvoice: z
    .instanceof(File, { message: "Basecoat invoice is required" })
    .refine((f) => f.size <= 5 * 1024 * 1024, "Max 5MB")
    .refine(
      (f) => ["image/jpeg", "image/png", "application/pdf"].includes(f.type),
      "JPG, PNG or PDF only"
    ),
});
```

---

## Step 7: Real-time Chat Architecture (Complaints B7)

### 7.1 System Context

This chat is agent-side real-time complaints handling:
- WhatsApp user -> backend -> CS dashboard
- frontend scope = agent conversation management and thread interaction

### 7.2 Core Chat Data Flow

```text
Initial Load -> React Query (API)
Incoming Messages -> WebSocket
Send Message -> Mutation + Optimistic UI
```

### 7.3 Folder Structure (Current Repo Aligned)

```text
src/
  data/
    complaints/
      queries/
        getConversations.ts
        getConversationById.ts
        getMessages.ts
      mutations/
        sendMessage.ts
        claimConversation.ts
        resolveConversation.ts
        transferConversation.ts
        escalateConversation.ts

  hooks/
    complaints/
      useWebSocket.ts
      useChat.ts

  components/
    complaints/
      ChatWindow.tsx
      MessageBubble.tsx
      ChatInput.tsx
      InputActionButton.tsx     ← NEW: Attach Image + Templates action buttons
      OnlineStatus.tsx          ← NEW: "Online on WhatsApp" status indicator
      ConversationList.tsx
      InfoPanel.tsx
      ClaimBanner.tsx
      ChatEmptyState.tsx
      SystemMessage.tsx
      DateDivider.tsx
      ResolveModal.tsx
      TransferModal.tsx
      EscalateModal.tsx
```

### 7.4 WebSocket Layer (Low-Level Hook)

`src/hooks/complaints/useWebSocket.ts`:
- owns socket connect/disconnect lifecycle only
- receives callback for message events
- no UI logic

Reference shape:
```tsx
import { useEffect, useRef } from "react";

export const useWebSocket = (url: string, onMessage: (data: unknown) => void) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => socket.close();
  }, [url, onMessage]);

  return socketRef;
};
```

### 7.5 Chat Hook (Main Orchestration)

`src/hooks/complaints/useChat.ts` combines:
- query (`useGetMessages`)
- mutation (`useSendMessage`)
- local merged message state
- websocket subscription

Reference shape:
```tsx
import { useEffect, useState, useCallback } from "react";
import { useGetMessages } from "#/data/complaints/queries/getMessages";
import { useSendMessage } from "#/data/complaints/mutations/sendMessage";
import { useWebSocket } from "./useWebSocket";

type ChatMessage = { id: string | number; message: string; sender: string };

export const useChat = (conversationId: string) => {
  const { data } = useGetMessages(conversationId);
  const { mutate: sendMessage } = useSendMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (data) setMessages(data as ChatMessage[]);
  }, [data]);

  const handleIncoming = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
    );
  }, []);

  useWebSocket(`wss://api/chat/${conversationId}`, handleIncoming);

  const handleSend = (text: string) => {
    const tempMessage: ChatMessage = {
      id: `tmp-${Date.now()}`,
      message: text,
      sender: "agent",
    };

    // optimistic append
    setMessages((prev) => [...prev, tempMessage]);
    sendMessage({ id: conversationId, message: text });
  };

  return { messages, handleSend };
};
```

### 7.6 Component Tree

```tsx
<ChatPage>
  <ConversationList />
  <ChatWindow>
    <ChatHeader />
    <MessageList>
      <MessageBubble />
    </MessageList>
    <ChatInput />
  </ChatWindow>
</ChatPage>
```

### 7.7 Component Responsibilities

`ConversationList`
- lists conversations
- controls active conversation id (route-driven `/app/complaints/:id`)

`ChatWindow`
- consumes `useChat(conversationId)`
- renders message list + input

`MessageBubble`
- pure presentational message rendering
- style by sender (`agent` vs `customer`)

`ChatInput`
- captures text input
- calls `onSend`
- resets input on submit

### 7.8 Required Reliability Features

1. Optimistic UI
- show outgoing message immediately

2. Deduplication
```tsx
setMessages((prev) =>
  prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
);
```

3. Auto-scroll to latest
```tsx
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

4. Reconnect strategy (next hardening pass)
- retry on disconnect with backoff
- connection status badge (`connected`, `reconnecting`, `disconnected`)

### 7.9 State Responsibility Matrix

| Chat Concern | Owner |
| --- | --- |
| initial messages | React Query |
| live inbound updates | WebSocket + local merge |
| send action | React Query mutation |
| socket lifecycle | `useWebSocket` |
| rendered thread | `useChat` local state |

### 7.10 Anti-Patterns to Avoid

- storing full real-time thread only in React Query cache without merge control
- no optimistic append on send
- missing dedupe guard
- embedding socket connection code in UI components

### 7.11 Final Chat Flow

```text
Component
  -> useChat
    -> React Query (initial fetch)
    -> WebSocket (real-time events)
    -> Local merged state
```

### 7.12 Output of Step 7
- B7 real-time architecture is defined and implementable.
- transport, state, and UI responsibilities are separated cleanly.
- critical chat reliability constraints (optimistic, dedupe, reconnect-ready) are documented.

### 7.13 Hardening Updates
WebSocket reconnect/status is mandatory:
```ts
type ConnectionStatus = "connected" | "reconnecting" | "disconnected";
```

Conversation state domain (canonical — use these terms everywhere):
- `unassigned` — new ticket, not yet claimed by any agent
- `active` — claimed/assigned to an agent, conversation in progress
- `resolved` — closed/resolved

Required WS event contract:
```ts
type WSEvent =
  | { type: "message"; payload: ChatMessage }
  | { type: "conversation_status"; payload: { id: string; status: "unassigned" | "active" | "resolved" } }
  | { type: "conversation_claimed"; payload: { id: string; agentId: string; agentName: string } }
  | { type: "conversation_transferred"; payload: { id: string; newAgentId: string } }
  | { type: "conversation_escalated"; payload: { id: string; level: string } }
  | { type: "agent_typing"; payload: { conversationId: string } }
  | { type: "new_conversation"; payload: { conversation: Conversation } }
  | { type: "unread_count"; payload: { count: number } };
```

**Note:** "claimed" is an **action** (`claimConversation` mutation), but the resulting **status** is `"active"`. Never use `"open"` or `"claimed"` as status values — only `"unassigned" | "active" | "resolved"`.

---

## Step 8: UI Component Library Setup

Create/standardize shared UI primitives:
```text
src/components/ui/
  Button.tsx
  Input.tsx
  Select.tsx
  Badge.tsx
  Modal.tsx
  Table.tsx
  Skeleton.tsx
  EmptyState.tsx
  Toast.tsx
  Pagination.tsx
  FileUpload.tsx
  Lightbox.tsx
```

Rule:
- feature pages must compose these primitives; no duplicate custom copies per feature.

## Step 9: Environment Configuration

Required env keys:
```env
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
VITE_SENTRY_DSN=
VITE_APP_ENV=development|staging|production
```

Mode files:
- `.env.development`
- `.env.staging`
- `.env.production`

`vite.config.ts` must use mode-based environment loading.

## Step 10: Notification/Toast System

Add standard mutation feedback pattern:
```ts
onSuccess: () => {
  toast.success("Action completed successfully.");
  queryClient.invalidateQueries(...);
},
onError: () => {
  toast.error("Something went wrong. Please try again.");
}
```

Wire to existing error fallback for global failures.

## Step 11: Component-Level RBAC

Add:
`src/hooks/auth/usePermissions.ts`

Reference:
```ts
export const usePermissions = () => {
  const { user } = useAuth();
  return {
    canApproveRegistrations: user?.role === "admin" || user?.role === "cs",
    canSubmitQualityDecision: user?.role === "quality",
    canManageProducts: user?.role === "admin",
    canImportData: user?.role === "admin",
  };
};
```

Use for conditional action rendering inside pages/components (beyond route-level guards).

## Step 12: Standards Compliance Gates for Implementation and PRs

- This step applies to all previous steps (1-11).
- The implementation team (human or AI) must read `Dulux-FE/AGENTS_ENGINEERING_STANDARDS.md` before starting work on any task.
- Every code change, PR, and review must strictly follow `Dulux-FE/AGENTS_ENGINEERING_STANDARDS.md`.
- Any violation of standards blocks merge until fixed.
- This instruction is mandatory across the full project scope (routing, UI, state, API, forms, chat, testing, CI/CD, deployment).

- The plan now includes hardening for routing, state, API, forms, and chat.
- Missing foundational layers (UI kit, env, toast, component RBAC) are now defined as explicit implementation steps.
- Engineering standards are enforced by mandatory reference to `AGENTS_ENGINEERING_STANDARDS.md` throughout the project lifecycle.

---

## Step 13: Tailwind CSS Setup and Design System

> This step defines the complete Tailwind CSS configuration, design tokens, and component theming derived directly from the approved wireframes (dulux-claims-approvals.html, dulux-live-chat.html, dulux-manual-registration.html, dulux-product-catalog-wireframes.html, dulux-quality-review.html, dulux-registration-approvals.html, dulux-wireframe-hub.html). Every color, spacing, radius, font, and semantic token is sourced from those files.

### 13.1 Installation and Configuration

Install Tailwind CSS v3 with the project's Vite setup:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Required packages alongside Tailwind:
```bash
npm install -D @tailwindcss/forms @tailwindcss/typography
npm install clsx tailwind-merge
```

`clsx` + `tailwind-merge` are used together as `cn()` for conditional class composition throughout all components. Add to `src/utils/cn.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

### 13.2 tailwind.config.ts — Full Project Config

```ts
import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // ─── Colors ─────────────────────────────────────────────
      colors: {
        // Primary brand blue — used for CTAs, active nav, send button, avatar
        // Source: sidebar logo-box, nav-item.active border-left, btn-primary, avatar-circle, page-btn.active
        primary: {
          DEFAULT: "#4a90d9",
          hover:   "#3a7bc8",
          light:   "#f0f6ff",  // eff6ff / f0f6ff — used in info boxes, reg-id chip bg
          border:  "#bfdbfe",  // info box border
        },

        // Sidebar shell
        // Source: .sidebar background, .sidebar-logo border, .nav-item.active background
        sidebar: {
          bg:          "#1a1a2e",
          activeBg:    "#22223a",
          borderColor: "#2a2a4a",
          navGroup:    "#666666",  // nav-group-label color
          navText:     "#999999",  // inactive nav item text
          badge:       {
            bg:   "#2a4a6a",
            text: "#6ab0ff",
          },
        },

        // Page / layout backgrounds
        // Source: .main background, .page-content background, .screen-frame bg
        page: {
          body:   "#f5f5f5",
          canvas: "#f0f0f0",
        },

        // Surface (card / panel)
        // Source: .stat-card, .detail-card, .form-card, .data-table, .action-card backgrounds
        surface: {
          DEFAULT: "#ffffff",
          muted:   "#fafafa",
          subtle:  "#fafbfc",
        },

        // Borders
        // Source: .data-table thead border, .stat-card border, .detail-card border
        border: {
          DEFAULT: "#e0e0e0",
          light:   "#f0f0f0",
          muted:   "#eeeeee",
          strong:  "#dddddd",
        },

        // Text
        // Source: .page-title color, .stat-value color, .field-value color, .avatar-name color
        text: {
          primary:   "#222222",
          secondary: "#444444",
          muted:     "#888888",
          hint:      "#aaaaaa",
          faint:     "#bbbbbb",
          label:     "#555555",
          nav:       "#999999",
          tableHead: "#888888",
        },

        // ─── Semantic Status Colors ─────────────────────────────
        // Source: .status-pending, .status-approved, .status-rejected,
        //         .status-forwarded, .status-info-req, .cs-resolved
        status: {
          pending: {
            bg:   "#fef3c7",
            text: "#b45309",
          },
          approved: {
            bg:   "#e6f9e6",
            text: "#2e7d32",
          },
          rejected: {
            bg:   "#fef2f2",
            text: "#dc2626",
          },
          forwarded: {
            bg:   "#f3e8ff",
            text: "#7c3aed",
          },
          infoReq: {
            bg:   "#eff6ff",
            text: "#2563eb",
          },
          resolved: {
            bg:   "#f0f0f0",
            text: "#888888",
          },
        },

        // ─── Action Button Colors ────────────────────────────────
        // Source: .btn-approve, .btn-reject, .btn-primary, .btn-outline
        action: {
          approve: {
            bg:   "#16a34a",
            text: "#ffffff",
          },
          reject: {
            bg:      "#ffffff",
            text:    "#dc2626",
            border:  "#fca5a5",
          },
          rejectHover: {
            bg: "#fef2f2",
          },
          deleteHover: {
            bg:     "#fef2f2",
            border: "#fca5a5",
            text:   "#dc2626",
          },
        },

        // ─── Semantic / Notification ──────────────────────────────
        // Source: .header-notif .dot, .nav-item .badge background
        danger: {
          DEFAULT: "#e74c3c",
          light:   "#fef2f2",
        },

        // ─── Claim / Issue Tags ──────────────────────────────────
        // Source: .issue-tag
        issue: {
          bg:   "#fef2f2",
          text: "#b91c1c",
        },

        // ─── Surface Type / Product Tags ────────────────────────
        // Source: .surface-tag
        surfaceTag: {
          bg:   "#f0f4ff",
          text: "#4a6fa5",
        },

        // ─── Product Type Badges ─────────────────────────────────
        // Source: inline styles on product type cells in registration approvals
        productType: {
          topcoat: {
            bg:   "#f0f4ff",
            text: "#4a6fa5",
          },
          basecoat: {
            bg:   "#f5f0ff",
            text: "#7c5caa",
          },
        },

        // ─── Monospace IDs (claim-id / reg-id chips) ─────────────
        // Source: .claim-id, .reg-id
        chipId: {
          claim: {
            bg:   "#fff3e0",
            text: "#e65100",
          },
          reg: {
            bg:   "#f0f6ff",
            text: "#4a90d9",
          },
        },

        // ─── Chat ────────────────────────────────────────────────
        // Source: .msg-row.customer .msg-bubble, .msg-row.agent .msg-bubble
        // .chat-panel background, .conv-item.active, .msg-system
        chat: {
          panelBg:         "#f8f9fa",
          convActiveBg:    "#f0f6ff",
          convActiveBorder:"#4a90d9",
          customerBubble:  "#ffffff",
          agentBubble:     "#4a90d9",
          agentText:       "#ffffff",
          agentTimeColor:  "rgba(255,255,255,0.6)",
          systemBg:        "#eff6ff",
          systemText:      "#2563eb",
          unreadDot:       "#f59e0b",
          unreadTime:      "#f59e0b",
        },

        // ─── Step Wizard ─────────────────────────────────────────
        // Source: .step.active .step-circle, .step.done .step-circle
        stepper: {
          activeBg:     "#4a90d9",
          activeBorder: "#4a90d9",
          activeText:   "#ffffff",
          doneBg:       "#16a34a",
          doneBorder:   "#16a34a",
          doneText:     "#ffffff",
          doneLabel:    "#16a34a",
          inactiveLine: "#dddddd",
          doneLine:     "#16a34a",
        },

        // ─── Quality Team specifics ──────────────────────────────
        // Source: .avatar-circle in quality-review (green avatar for QA role)
        // .cs-notes background, .stat-card.highlight border-left in quality screen
        quality: {
          avatarBg:  "#16a34a",
          notesBg:   "#faf5ff",
          notesBorder: "#e9d5ff",
          highlight:   "#7c3aed",
        },

        // ─── Info / notification boxes ───────────────────────────
        // Source: .info-box in manual registration success state
        info: {
          bg:     "#eff6ff",
          border: "#bfdbfe",
          text:   "#1e40af",
        },

        // ─── Success state ────────────────────────────────────────
        // Source: .success-icon background, .success-title color
        success: {
          iconBg:    "#dcfce7",
          iconText:  "#16a34a",
          regIdBg:   "#f0f6ff",
          regIdText: "#4a90d9",
        },

        // ─── Amber / warning (unread badge, stat highlight border) ──
        // Source: .stat-card.highlight border-left in claims/registrations
        amber: {
          DEFAULT:   "#f59e0b",
          highlight: "#f59e0b",
        },
      },

      // ─── Font Family ─────────────────────────────────────────────
      // Source: body font-family from every wireframe HTML: Arial, Helvetica, sans-serif
      // In production, replace with Inter or your brand font and keep Arial as fallback.
      fontFamily: {
        sans: ["Inter", "Arial", "Helvetica", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },

      // ─── Font Sizes ───────────────────────────────────────────────
      // Source: all wireframe CSS font-size values mapped to Tailwind scale
      // 10px nav-group-label, breadcrumb sub-texts
      // 11px stat-label, table thead, badge text, field-label uppercase
      // 12px form-label, filter-btn, conv-time, page-btn
      // 13px nav-item, data-table td, btn-primary, form-input, chat bubble
      // 14px sidebar-logo text, page-title (16px), detail-card-title
      // 16px page-title
      // 28px stat-value
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:    ["11px", { lineHeight: "16px" }],
        sm:    ["12px", { lineHeight: "18px" }],
        base:  ["13px", { lineHeight: "20px" }],
        md:    ["14px", { lineHeight: "20px" }],
        lg:    ["16px", { lineHeight: "24px" }],
        xl:    ["18px", { lineHeight: "28px" }],
        "2xl": ["20px", { lineHeight: "28px" }],
        "3xl": ["28px", { lineHeight: "36px" }],
      },

      // ─── Border Radius ────────────────────────────────────────────
      // Source: .stat-card border-radius: 8px, .data-table border-radius: 8px,
      //         .status-badge border-radius: 12px, .sidebar-logo .logo-box: 6px
      //         .nav-item .badge: 10px, .avatar-circle: 50%
      borderRadius: {
        none: "0px",
        sm:   "4px",
        DEFAULT: "6px",
        md:   "6px",
        lg:   "8px",
        xl:   "10px",
        "2xl":"12px",
        full: "9999px",
      },

      // ─── Spacing / Layout ──────────────────────────────────────────
      // Source: sidebar width 240px, header height 56px, conv-panel width 300px,
      //         info-panel width 280px, detail sidebar width 340px,
      //         page-content padding 24px, form-card padding 24px
      spacing: {
        sidebar: "240px",
        header:  "56px",
        convPanel: "300px",
        infoPanel: "280px",
        detailSide: "340px",
      },

      // ─── Box Shadow ────────────────────────────────────────────────
      // Wireframes use no box shadows — keep flat, border-only design.
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [forms],
};

export default config;
```

### 13.3 Global CSS Entry Point

`src/index.css` — replace content with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Match wireframe body defaults exactly */
  body {
    @apply font-sans text-base text-[#333] bg-page-canvas;
  }

  /* Monospace reset for ID chips */
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
}

@layer components {
  /* ── Sidebar ─────────────────────────────────────── */
  .nav-item {
    @apply flex items-center gap-[10px] px-5 py-[10px] text-base
           text-sidebar-navText cursor-pointer border-l-[3px]
           border-transparent transition-all duration-150;
  }
  .nav-item-active {
    @apply bg-sidebar-activeBg text-white border-l-primary;
  }
  .nav-group-label {
    @apply text-[10px] font-bold tracking-[1.5px] uppercase
           text-sidebar-navGroup px-5 pt-4 pb-1.5;
  }

  /* ── Status Badges ───────────────────────────────── */
  .badge {
    @apply inline-block px-[10px] py-[3px] rounded-2xl text-xs font-semibold;
  }
  .badge-pending   { @apply bg-status-pending-bg   text-status-pending-text; }
  .badge-approved  { @apply bg-status-approved-bg  text-status-approved-text; }
  .badge-rejected  { @apply bg-status-rejected-bg  text-status-rejected-text; }
  .badge-forwarded { @apply bg-status-forwarded-bg text-status-forwarded-text; }
  .badge-info-req  { @apply bg-status-infoReq-bg   text-status-infoReq-text; }
  .badge-resolved  { @apply bg-status-resolved-bg  text-status-resolved-text; }

  /* ── ID Chips (monospace) ────────────────────────── */
  .chip-claim {
    @apply font-mono text-base font-semibold
           bg-chipId-claim-bg text-chipId-claim-text
           px-2 py-0.5 rounded;
  }
  .chip-reg {
    @apply font-mono text-sm
           bg-chipId-reg-bg text-chipId-reg-text
           px-1.5 py-0.5 rounded;
  }

  /* ── Buttons ─────────────────────────────────────── */
  .btn {
    @apply inline-flex items-center gap-1.5 rounded-md px-[18px] py-[9px]
           text-base font-semibold cursor-pointer transition-colors duration-150;
  }
  .btn-primary {
    @apply btn bg-primary text-white border-0 hover:bg-primary-hover;
  }
  .btn-outline {
    @apply btn bg-surface text-text-label border border-border hover:bg-page-body;
  }
  .btn-approve {
    @apply btn w-full justify-center bg-action-approve-bg text-white border-0
           hover:brightness-95;
  }
  .btn-reject {
    @apply btn w-full justify-center bg-action-reject-bg text-action-reject-text
           border border-action-reject-border hover:bg-action-rejectHover-bg;
  }
  .btn-icon {
    @apply w-[30px] h-[30px] border border-border rounded-[5px]
           flex items-center justify-center cursor-pointer bg-surface
           text-xs text-text-muted hover:border-border-strong;
  }

  /* ── Form Controls ───────────────────────────────── */
  .form-input {
    @apply border border-border-strong rounded-md px-3 py-[9px]
           text-base text-text-hint bg-surface-muted
           focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
           w-full;
  }
  .form-label {
    @apply text-sm font-semibold text-text-label;
  }
  .form-label-required::after {
    content: " *";
    @apply text-danger;
  }

  /* ── Table ───────────────────────────────────────── */
  .data-table {
    @apply w-full border-collapse bg-surface border border-border rounded-lg overflow-hidden;
  }
  .data-table th {
    @apply bg-surface-muted text-xs font-bold uppercase tracking-[0.5px]
           text-text-tableHead px-[14px] py-3 text-left border-b border-border;
  }
  .data-table td {
    @apply px-[14px] py-[13px] text-base text-text-secondary
           border-b border-border-light align-middle;
  }
  .data-table tbody tr:last-child td {
    @apply border-b-0;
  }

  /* ── Cards ───────────────────────────────────────── */
  .card {
    @apply bg-surface border border-border rounded-lg p-5;
  }
  .card-title {
    @apply text-md font-bold text-text-primary;
  }

  /* ── Stat Card ───────────────────────────────────── */
  .stat-card {
    @apply bg-surface border border-border rounded-lg px-5 py-[18px];
  }
  .stat-card-highlight-amber {
    @apply border-l-[3px] border-l-amber;
  }
  .stat-card-highlight-purple {
    @apply border-l-[3px] border-l-quality-highlight;
  }
  .stat-label {
    @apply text-xs font-semibold uppercase tracking-[0.5px] text-text-muted mb-1.5;
  }
  .stat-value {
    @apply text-3xl font-bold text-text-primary;
  }

  /* ── Image Upload Zone ───────────────────────────── */
  .upload-zone {
    @apply border-2 border-dashed border-[#d0d0d0] rounded-lg
           p-7 text-center bg-surface-muted;
  }

  /* ── Issue Tag ───────────────────────────────────── */
  .issue-tag {
    @apply inline-block px-2 py-0.5 rounded text-xs bg-issue-bg text-issue-text;
  }

  /* ── Surface Tag ─────────────────────────────────── */
  .surface-tag {
    @apply inline-block px-2 py-0.5 rounded text-xs
           bg-surfaceTag-bg text-surfaceTag-text mx-0.5 my-px;
  }
}
```

### 13.4 Layout Dimensions (from Wireframes)

These are exact pixel values extracted from the wireframe HTML and must be used consistently:

| Element | Value | Source |
|---|---|---|
| Sidebar width | `240px` | `.sidebar { width: 240px }` |
| Top header height | `56px` | `.top-header { height: 56px }` |
| Conversation panel width | `300px` | `.conv-panel { width: 300px }` |
| Info/right panel width | `280px` | `.info-panel { width: 280px }` |
| Detail sidebar width | `340px` | `.detail-layout grid: 1fr 340px` |
| Page content padding | `24px` | `.page-content { padding: 24px }` |
| Form card padding | `24px` | `.form-card { padding: 24px }` |
| Avatar size | `32px` | `.avatar-circle { width/height: 32px }` |
| Logo box size | `32px` | `.logo-box { width/height: 32px }` |
| Stat card value font | `28px` | `.stat-value { font-size: 28px }` |
| Evidence preview height | `180px` (claims), `200px` (quality) | `.ev-preview` |
| Screen min-height | `780px` (most), `820px` (manual reg) | `.screen-frame` |

### 13.5 Tailwind Equivalents for Wireframe CSS Patterns

These are direct mappings for developers — use these instead of inline styles:

```
.sidebar background #1a1a2e     → bg-sidebar-bg
.nav-item.active bg #22223a     → bg-sidebar-activeBg
.nav-item.active border #4a90d9 → border-l-primary
.logo-box bg #4a90d9            → bg-primary
.top-header bg #fff             → bg-surface
.page-content bg #f5f5f5        → bg-page-body
body bg #f0f0f0                 → bg-page-canvas
.stat-card bg #fff              → bg-surface
.data-table thead bg #fafafa    → bg-surface-muted
.detail-field .field-label      → text-xs font-semibold uppercase tracking-[0.3px] text-text-muted
.detail-field .field-value      → text-base text-text-secondary font-medium
.btn-primary bg #4a90d9         → bg-primary
.btn-approve bg #16a34a         → bg-action-approve-bg
.btn-reject border #fca5a5      → border-action-reject-border
.step.active bg #4a90d9         → bg-stepper-activeBg
.step.done bg #16a34a           → bg-stepper-doneBg
.conv-item.active bg #f0f6ff    → bg-chat-convActiveBg
.msg-row.agent .msg-bubble      → bg-chat-agentBubble text-white
.msg-row.customer .msg-bubble   → bg-surface border border-border
```

### 13.6 Status Badge Tailwind Components

All status badges must use the pre-defined component classes. Never use arbitrary color values inline:

```tsx
// ✅ Correct
<span className="badge badge-pending">Pending</span>
<span className="badge badge-approved">Approved</span>
<span className="badge badge-rejected">Rejected</span>
<span className="badge badge-forwarded">Sent to Quality</span>
<span className="badge badge-info-req">Info Requested</span>
<span className="badge badge-resolved">Resolved</span>

// ❌ Wrong — never do this
<span style={{ background: '#fef3c7', color: '#b45309' }}>Pending</span>
```

Complete status-to-badge mapping for the system:

| Registration Status | Badge Class |
|---|---|
| Pending | `badge-pending` |
| Approved | `badge-approved` |
| Rejected | `badge-rejected` |
| Resubmission Requested | `badge-pending` |
| Resubmitted | `badge-info-req` |

| Claim Status | Badge Class |
|---|---|
| Pending Review | `badge-pending` |
| Sent to Quality | `badge-forwarded` |
| More Info Needed | `badge-info-req` |
| Approved | `badge-approved` |
| Rejected | `badge-rejected` |

| Complaint Status | Badge Class |
|---|---|
| Open | `badge-pending` |
| Claimed | `badge-info-req` |
| Resolved | `badge-resolved` |

### 13.7 Typography Rules (Derived from Wireframes)

```
Page title (top header)    → text-lg font-bold text-text-primary          (16px, #222)
Section/card title         → text-md font-bold text-text-primary           (14px, #222)
Table header               → text-xs font-bold uppercase tracking-[0.5px] text-text-tableHead
Table cell                 → text-base text-text-secondary                 (13px, #444)
Field label (detail view)  → text-xs font-semibold uppercase tracking-[0.3px] text-text-muted
Field value (detail view)  → text-base font-medium text-text-secondary
Form label                 → text-sm font-semibold text-text-label         (12px, #555)
Form input placeholder     → text-base text-text-hint bg-surface-muted     (13px, #aaa)
Nav item text              → text-base text-sidebar-navText                 (13px, #999)
Nav group label            → text-[10px] font-bold uppercase tracking-[1.5px] text-sidebar-navGroup
Stat label                 → text-xs font-semibold uppercase tracking-[0.5px] text-text-muted
Stat value                 → text-3xl font-bold text-text-primary
Breadcrumb                 → text-sm text-text-muted                       (12px, #999)
Badge text                 → text-xs font-semibold                          (11px)
Pagination info            → text-sm text-text-muted
Avatar initials            → text-sm font-bold text-white
```

### 13.8 AppLayout Tailwind Structure

Direct Tailwind translation of the wireframe layout shell:

```tsx
// AppLayout.tsx
<div className="flex h-screen overflow-hidden">
  {/* Sidebar: width 240px, dark bg */}
  <aside className="w-[240px] flex-shrink-0 bg-sidebar-bg flex flex-col overflow-y-auto">
    {/* Logo area */}
    <div className="px-5 py-5 pb-4 border-b border-sidebar-borderColor flex items-center gap-[10px]">
      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold text-white text-sm">
        DLX
      </div>
      <span className="text-md font-bold text-white">Dulux Assurance</span>
    </div>
    {/* Nav */}
    <nav className="flex-1 py-0">
      <p className="nav-group-label">Overview</p>
      <NavItem to="/app/dashboard" label="Dashboard" />
      {/* ... */}
    </nav>
  </aside>

  {/* Main area */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Top header: height 56px, white bg */}
    <header className="h-[56px] flex-shrink-0 bg-surface border-b border-border flex items-center px-6 gap-4">
      <h1 className="text-lg font-bold text-text-primary">Page Title</h1>
      {/* global search, notif, avatar */}
    </header>

    {/* Page content: gray bg, padded */}
    <main className="flex-1 overflow-y-auto bg-page-body p-6">
      <Outlet />
    </main>
  </div>
</div>
```

### 13.9 Chat Layout Tailwind Structure

```tsx
// ChatPage.tsx — matches wireframe conv-panel + chat-panel + info-panel layout
<div className="flex h-full bg-surface">
  {/* Conversation list: 300px fixed width */}
  <div className="w-[300px] flex-shrink-0 border-r border-border flex flex-col">
    <ConversationList />
  </div>

  {/* Chat window: fills remaining space */}
  <div className="flex-1 flex flex-col bg-chat-panelBg">
    <ChatHeader />
    <MessageList />
    <ChatInput />
  </div>

  {/* Info panel: 280px fixed width */}
  <div className="w-[280px] flex-shrink-0 border-l border-border overflow-y-auto">
    <ContactInfo />
  </div>
</div>
```

### 13.10 Detail Page Tailwind Layout (Registrations / Claims / Quality)

```tsx
// DetailLayout.tsx — matches wireframe grid: 1fr 340px
<div className="grid grid-cols-[1fr_340px] gap-6">
  {/* Left: main content */}
  <div>
    <div className="card mb-5">...</div>
    <div className="card mb-5">...</div>
  </div>

  {/* Right: action panel, 340px */}
  <div>
    <div className="card mb-4">...</div>
  </div>
</div>
```

### 13.11 Step Wizard Tailwind (Manual Registration)

```tsx
// Stepper.tsx — matches .step, .step.active, .step.done, .step-line
<div className="flex items-center">
  {steps.map((step, i) => (
    <Fragment key={step.id}>
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 border-border-strong text-text-muted bg-surface",
          isActive(i) && "bg-stepper-activeBg border-stepper-activeBorder text-white",
          isDone(i)   && "bg-stepper-doneBg   border-stepper-doneBorder   text-white",
        )}>
          {isDone(i) ? "✓" : step.id}
        </div>
        <span className={cn(
          "text-xs font-semibold text-text-muted whitespace-nowrap",
          isActive(i) && "text-text-primary",
          isDone(i)   && "text-stepper-doneLabel",
        )}>
          {step.label}
        </span>
      </div>
      {i < steps.length - 1 && (
        <div className={cn(
          "w-10 h-0.5 mx-1.5 flex-shrink-0 bg-stepper-inactiveLine",
          isDone(i) && "bg-stepper-doneLine",
        )} />
      )}
    </Fragment>
  ))}
</div>
```

### 13.12 Shared UI Component Tailwind Reference

#### Button
```tsx
// src/components/ui/Button.tsx
type Variant = "primary" | "outline" | "approve" | "reject" | "icon";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  approve: "btn-approve",
  reject:  "btn-reject",
  icon:    "btn-icon",
};
```

#### Badge
```tsx
// src/components/ui/Badge.tsx
type StatusVariant = "pending" | "approved" | "rejected" | "forwarded" | "infoReq" | "resolved";

const badgeClass: Record<StatusVariant, string> = {
  pending:   "badge badge-pending",
  approved:  "badge badge-approved",
  rejected:  "badge badge-rejected",
  forwarded: "badge badge-forwarded",
  infoReq:   "badge badge-info-req",
  resolved:  "badge badge-resolved",
};
```

#### Input
```tsx
// src/components/ui/Input.tsx
<input className="form-input" {...props} />
```

#### Table
```tsx
// src/components/ui/Table.tsx
<table className="data-table">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

#### ID Chip
```tsx
// src/components/ui/IdChip.tsx
type ChipType = "claim" | "reg";
<span className={type === "claim" ? "chip-claim" : "chip-reg"}>{id}</span>
```

### 13.13 Wireframe-to-Tailwind Mapping Reference (Complete)

| Wireframe CSS Pattern | Tailwind Class |
|---|---|
| `background: #1a1a2e` | `bg-sidebar-bg` |
| `background: #22223a` | `bg-sidebar-activeBg` |
| `border-left: 3px solid #4a90d9` | `border-l-[3px] border-l-primary` |
| `background: #4a90d9` | `bg-primary` |
| `background: #f5f5f5` | `bg-page-body` |
| `background: #f0f0f0` | `bg-page-canvas` |
| `background: #fff` | `bg-surface` |
| `background: #fafafa` | `bg-surface-muted` |
| `border: 1px solid #e0e0e0` | `border border-border` |
| `border-bottom: 1px solid #f0f0f0` | `border-b border-border-light` |
| `color: #222` | `text-text-primary` |
| `color: #444` | `text-text-secondary` |
| `color: #888` | `text-text-muted` |
| `color: #aaa` | `text-text-hint` |
| `color: #555` | `text-text-label` |
| `font-size: 10px` | `text-2xs` |
| `font-size: 11px` | `text-xs` |
| `font-size: 12px` | `text-sm` |
| `font-size: 13px` | `text-base` |
| `font-size: 14px` | `text-md` |
| `font-size: 16px` | `text-lg` |
| `font-size: 28px` | `text-3xl` |
| `border-radius: 4px` | `rounded-sm` |
| `border-radius: 6px` | `rounded-md` |
| `border-radius: 8px` | `rounded-lg` |
| `border-radius: 10px` | `rounded-xl` |
| `border-radius: 12px` | `rounded-2xl` |
| `border-radius: 50%` | `rounded-full` |
| `padding: 24px` | `p-6` |
| `padding: 20px` | `p-5` |
| `gap: 16px` | `gap-4` |
| `gap: 24px` | `gap-6` |
| `background: #fef3c7; color: #b45309` | `badge-pending` |
| `background: #e6f9e6; color: #2e7d32` | `badge-approved` |
| `background: #fef2f2; color: #dc2626` | `badge-rejected` |
| `background: #f3e8ff; color: #7c3aed` | `badge-forwarded` |
| `background: #eff6ff; color: #2563eb` | `badge-info-req` |
| `background: #f0f0f0; color: #888` | `badge-resolved` |
| `background: #fff3e0; color: #e65100` (monospace) | `chip-claim` |
| `background: #f0f6ff; color: #4a90d9` (monospace) | `chip-reg` |
| `background: #16a34a; color: #fff` | `btn-approve` |
| `border: 1px solid #fca5a5; color: #dc2626` | `btn-reject` |
| `background: #4a90d9; color: #fff` | `btn-primary` |

### 13.14 Anti-Patterns to Avoid (Tailwind-Specific)

- Never use inline `style={{ color: '#4a90d9' }}` — use `text-primary` from the config.
- Never use Tailwind arbitrary values like `bg-[#4a90d9]` — every hex from the wireframes is tokenized in the config.
- Never use `text-blue-500` or other default Tailwind palette colors — use only project tokens.
- Never duplicate badge colors per-feature — always import from `src/components/ui/Badge.tsx`.
- Never apply status colors directly in page components — always via the `badge-*` component classes.
- Never use `font-weight: 600` or `font-weight: 700` for body/label text — wireframes use 600 only for specific UI labels; map to Tailwind `font-semibold` and `font-bold`.

### 13.15 Output of Step 13

- Tailwind config is complete and sourced from all 7 wireframe HTML files.
- All colors, radii, font sizes, spacing, and layout dimensions are tokenized — no magic numbers in component files.
- Global CSS layer defines reusable component classes aligned to wireframe patterns.
- Status badge system is centralized and mapping is documented for all screen types.
- Developer reference table maps every wireframe CSS pattern to its Tailwind equivalent.
- UI component Tailwind reference is provided for Button, Badge, Input, Table, IdChip, AppLayout, ChatLayout, DetailLayout, and Stepper.

---

## Step 14: Wireframe Audit — Gap Analysis and Plan Updates

> This step documents every structural, component, data-flow, routing, state, API, WebSocket, and design pattern discovered by reading all 7 updated wireframe files in full. Nothing is assumed — every update is sourced from a specific wireframe screen.

---

### 14.1 Summary of What Changed vs Previous Plan

The updated wireframes introduce **31 screens across 6 flows** that are significantly more detailed than the previous plan assumed. The key changes are:

| Area | Previous Plan | Wireframe Reality |
|---|---|---|
| Modals | Not specified | 13 distinct modal types across all flows |
| Registration list | Simple table | + Source column (WhatsApp / Manual) + Priority dot |
| Registration statuses | 4 statuses | 5 statuses: Pending, Approved, Rejected, Resubmission (badge = `status-resubmission` = blue), also shown as tab |
| Resubmission modal | Inline panel | Dedicated modal with 6 checkbox fields + note field |
| Reject registration | Not specified | Dedicated modal: reason dropdown + notes textarea |
| Claim list | Simple table | + 4-stat header row + 6 status tabs + "Info Requested" tab |
| Claim detail | Basic | + Linked Registration summary card + Claim Workflow steps card |
| Claims: forward modal | Brief mention | Full modal with CS notes field + priority dropdown + verification pack summary |
| Claims: reject modal | Not specified | Reason dropdown + notes |
| Claims: request info modal | Not specified | 6 checkbox items + "Other" free-text + note + priority |
| Quality: list | Simple table | + Priority badge (High/Normal) + "Forwarded By" column + 4-stat header |
| Quality: role banner | Not specified | Sticky `role-banner` bar above header |
| Quality: detail | Basic | CS Agent Notes shown first, larger evidence photos (200px), "Click to enlarge" hint |
| Quality: approve modal | Not specified | Technical assessment dropdown + notes + outcome summary box |
| Quality: reject modal | Not specified | Technical rejection reason dropdown + mandatory technical notes |
| Quality: request info modal | Not specified | Checkbox list + "Request From" dropdown (CS/Customer) |
| Chat: 3 panels | 2 panels | Left (conv list) + Center (chat) + Right (info panel = 280px) |
| Chat: conversation states | 3 states | + Unassigned (amber) + Active (green) + Resolved (gray) — visual distinctions |
| Chat: Unassigned ticket | Not specified | `claim-banner` overlay + "Claim & Reply" button + disabled input |
| Chat: empty state | Not specified | Full empty state screen when no conversation selected |
| Chat: resolve modal | Not specified | Resolution type radio + summary textarea + notification checkbox |
| Chat: transfer modal | Not specified | Transfer to (Agent/Queue) + agent select + reason + internal note + CC checkbox |
| Chat: escalate modal | Not specified | Escalation level radio + reason dropdown + urgency radio + description |
| Chat: info panel | Not specified | Avatar (56px) + phone + WA status + complaint details + images + customer history + action buttons |
| Manual reg: wizard step labels | "Documents" | Steps: Personal Info → Purchase & Dealer → Products → **Invoices** → Review |
| Manual reg: Step 5 | Review only | "Save as Draft" button added on review step |
| Manual reg: Success screen | Not specified | Full success state with reg ID chip + info box + 3 action buttons |
| Product catalog | Grid view | **Table view** (not grid) with checkbox column + image column + surface tags |
| Product form | Basic | Interior/Exterior **grouped** surface checkboxes + URL field + Key Features textarea |
| Surface types | Mentioned | Dedicated tab in Product Catalog with own CRUD table (Name, Category, Linked Products count) |
| Surface type modal | Not specified | Add/Edit surface type in-page modal |
| Delete confirmation | Not specified | Standard delete modal with warning icon |
| Navigation labels | "Complaints Chat" | Sidebar shows "Live Chat" and "Complaints" as **two separate nav items** |

---

### 14.2 Routing Updates Required

#### 14.2.1 Navigation — Two Separate Items

The wireframe sidebar consistently shows **both** "Live Chat" and "Complaints" as separate nav items:

```
Support
  ├── Live Chat      → /app/complaints/:id   (active chat interface)
  └── Complaints     → /app/complaints       (list/landing — currently same route)
```

**Update to Step 1.3 route map:** The sidebar nav labels differ from route names. Implement as:
- `Live Chat` nav item → navigates to `/app/complaints` (the 3-panel chat interface)
- `Complaints` nav item → currently shown as a placeholder (disabled in hub, no screens built yet)

For now, treat "Complaints" nav item as disabled/coming-soon. "Live Chat" is the active B7 route.

#### 14.2.2 New Modal Routes — No Separate Routes Needed

All 13 modals in the wireframes are **overlay modals on existing pages**, not separate routes. They are triggered by button clicks and managed with local `useState`. They do NOT require new route entries:

```
/app/registrations/:id  → hosts: ResubmissionModal, RejectModal
/app/claims/:id         → hosts: ForwardToQualityModal, RejectClaimModal, RequestInfoModal
/app/quality/:id        → hosts: ApproveClaimModal, RejectClaimModal (QA), RequestInfoModal (QA)
/app/complaints/:id     → hosts: ResolveModal, TransferModal, EscalateModal
/app/products           → hosts: DeleteConfirmModal
/app/products/new       → dedicated page (not modal)
/app/products/:id/edit  → dedicated page (not modal)
/app/products (surface tab) → hosts: AddSurfaceTypeModal, DeleteConfirmModal
```

#### 14.2.3 Product Catalog — Tab-Based Sub-navigation

The Product Catalog screen has **two tabs** (`Products` | `Surface Types`) within the same `/app/products` route. This is tab-driven UI state, not separate routes. The active tab is managed via local state or query param:

```
/app/products?tab=products        → Products table
/app/products?tab=surface-types   → Surface Types table
```

Use `useSearchParams` to persist tab state and allow deep-linking.

#### 14.2.4 Manual Registration — Step 4 is "Invoices" not "Documents"

Update the route label in `src/constants/routes.ts`:
```ts
// Step labels (displayed in Stepper component)
WIZARD_STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Purchase & Dealer" },
  { id: 3, label: "Products" },
  { id: 4, label: "Invoices" },   // ← was "Documents" in previous plan
  { id: 5, label: "Review" },
]
```

---

### 14.3 Component Tree Updates

#### 14.3.1 Registrations — New Components

Add to `src/components/registrations/`:

```
SourceTag.tsx              ← "WhatsApp" (green) / "Manual" (blue) badge
ResubmissionModal.tsx      ← checkbox list modal (6 fields + note)
RejectRegistrationModal.tsx ← reason dropdown + notes modal
```

Updated B3 component tree:
```tsx
<RegistrationDetailPage>
  <BackLink />
  <DetailLayout>           {/* grid: 1fr 340px */}
    <div>                  {/* left column */}
      <CustomerInfoCard />
      <PurchaseInfoCard />
      <ProductMiniTable />
      <InvoiceGallery>
        <InvoicePreview label="Topcoat Invoice" />   {/* Zoom In + Download + Open Full */}
        <InvoicePreview label="Basecoat Invoice" />
      </InvoiceGallery>
    </div>
    <div>                  {/* right column — 340px */}
      <ActionCard>
        <ApproveButton />
        <ResubmitButton />   {/* opens ResubmissionModal */}
        <RejectButton />     {/* opens RejectRegistrationModal */}
      </ActionCard>
      <QuickInfoCard />      {/* submitted, source, time in queue, assigned to */}
    </div>
  </DetailLayout>

  {/* Modals */}
  <ResubmissionModal isOpen={...} onClose={...} onSend={...} />
  <RejectRegistrationModal isOpen={...} onClose={...} onReject={...} />
</RegistrationDetailPage>
```

**ResubmissionModal checkbox fields (exact from wireframe):**
```ts
const RESUBMISSION_FIELDS = [
  { id: "personal_info",    label: "Personal Information",  hint: "Name, Email, City, Address" },
  { id: "purchase_date",    label: "Purchase Date",         hint: "Date of purchase" },
  { id: "dealer_info",      label: "Dealer Information",    hint: "Dealer name & location" },
  { id: "product_details",  label: "Product Details",       hint: "Topcoat/Basecoat & quantities" },
  { id: "topcoat_invoice",  label: "Topcoat Invoice",       hint: "Invoice image" },
  { id: "basecoat_invoice", label: "Basecoat Invoice",      hint: "Invoice image" },
] as const;
```

This replaces the partial `ResubmissionField` type from Step 3.7. Add `personal_info` and `purchase_date` to the type — they were missing.

Updated `ResubmissionField` type:
```ts
type ResubmissionField =
  | "personal_info"
  | "purchase_date"
  | "dealer_info"
  | "product_details"
  | "topcoat_invoice"
  | "basecoat_invoice";
```

#### 14.3.2 Claims — New Components

Add to `src/components/claims/`:
```
ForwardToQualityModal.tsx      ← CS notes + priority + verification pack summary
RejectClaimModal.tsx           ← reason dropdown + notes
RequestMoreInfoModal.tsx       ← checkbox list (6 items + Other free-text) + note + priority
LinkedRegistrationCard.tsx     ← summary card linking claim → registration
ClaimWorkflowCard.tsx          ← 3-step workflow progress (CS → Quality → Resolution)
```

Updated B5 component tree:
```tsx
<ClaimDetailPage>
  <BackLink />
  <DetailLayout>           {/* grid: 1fr 340px */}
    <div>                  {/* left column */}
      <ClaimInfoCard />    {/* customer, phone, linked reg, topcoat, issue type, area */}
      <EvidencePhotos>     {/* 3 photos, each with Zoom + Download buttons */}
        <EvidenceItem label="Long Shot" />
        <EvidenceItem label="Close Shot" />
        <EvidenceItem label="Alternate Angle" />
      </EvidencePhotos>
      <LinkedRegistrationCard />   {/* ← NEW: linked reg summary */}
    </div>
    <div>                  {/* right column — 340px */}
      <ActionCard>
        <ForwardButton />   {/* opens ForwardToQualityModal */}
        <RequestInfoButton /> {/* opens RequestMoreInfoModal */}
        <RejectButton />    {/* opens RejectClaimModal */}
      </ActionCard>
      <ClaimWorkflowCard />  {/* ← NEW: 3-step workflow indicator */}
      <QuickInfoCard />
    </div>
  </DetailLayout>

  {/* Modals */}
  <ForwardToQualityModal isOpen={...} />
  <RejectClaimModal isOpen={...} />
  <RequestMoreInfoModal isOpen={...} />
</ClaimDetailPage>
```

**RequestMoreInfo checkbox items (exact from wireframe):**
```ts
const REQUEST_INFO_ITEMS = [
  "Additional photos (different angles)",
  "Proof of purchase / Invoice",
  "Product batch number",
  "Application details (method, coats, surface prep)",
  "Timeline of issue occurrence",
  "Other",  // free-text input shown when selected
] as const;
```

#### 14.3.3 Quality — New Components + Role Banner

Add to `src/components/quality/`:
```
RoleBanner.tsx             ← sticky purple banner: "Quality Team View" with dot
ApproveClaimModal.tsx      ← technical assessment dropdown + notes + outcome summary
RejectClaimQAModal.tsx     ← technical rejection reason (required) + technical notes (required)
RequestInfoQAModal.tsx     ← checkbox list + "Request From" dropdown (CS/Customer) + notes
ClaimWorkflowCard.tsx      ← same as claims, reused (step 1 done, step 2 current)
```

Updated B6 component tree:
```tsx
<QualityDetailPage>
  <RoleBanner />           {/* ← NEW: sticky purple "Quality Team View" banner */}
  <BackLink />
  <DetailLayout>           {/* grid: 1fr 340px */}
    <div>
      <ClaimInfoCard />
      <AgentNotesCard />   {/* CS agent notes shown FIRST before photos — important order */}
      <EvidencePhotos enlarged />  {/* 200px height, "Click to enlarge" hint */}
      <LinkedRegistrationCard />
    </div>
    <div>
      <ActionCard title="Technical Assessment">
        <ApproveButton />
        <RequestInfoButton />
        <RejectButton />
      </ActionCard>
      <ClaimWorkflowCard step={2} />
      <QuickInfoCard />    {/* forwarded on, forwarded by, time in queue, priority */}
    </div>
  </DetailLayout>

  {/* Modals */}
  <ApproveClaimModal isOpen={...} />
  <RejectClaimQAModal isOpen={...} />
  <RequestInfoQAModal isOpen={...} />
</QualityDetailPage>
```

**Key: CS Agent Notes are shown BEFORE evidence photos** in the Quality view. This is intentional — gives the QA reviewer context before inspecting photos.

#### 14.3.4 Chat — New Components (Major Update)

The chat is a **3-panel layout**, not 2-panel. Add right `InfoPanel` (280px).

Add to `src/components/complaints/`:
```
InfoPanel.tsx              ← RIGHT panel: avatar + phone + WA status + complaint details + images + customer history + action buttons
ClaimBanner.tsx            ← amber "Unassigned Ticket" bar with "Claim & Reply" CTA
ChatEmptyState.tsx         ← shown when no conversation selected
ResolveModal.tsx           ← resolution type + summary + notification checkbox
TransferModal.tsx          ← to agent/queue + agent select + reason + internal note + CC checkbox
EscalateModal.tsx          ← escalation level + reason + urgency + description
SystemMessage.tsx          ← centered system event bubbles (e.g. "Ahmed started a conversation")
DateDivider.tsx            ← "Today, 31 March 2026" divider between message groups
```

Updated B7 component tree:
```tsx
<ChatPage>
  {/* 3-panel layout */}
  <ConvPanel>              {/* 300px LEFT */}
    <ConvHeader>
      <ConvTitle />
      <UnreadCount />
    </ConvHeader>
    <ConvSearch />
    <ConvFilters>          {/* All | Unassigned | Mine | Resolved */}
      <ConvFilter />
    </ConvFilters>
    <ConvList>
      <ConvItem state="active" />     {/* blue left border, blue avatar */}
      <ConvItem state="unread" />     {/* amber avatar, amber time, unread dot */}
      <ConvItem state="default" />
      <ConvItem state="resolved" />   {/* gray status badge */}
    </ConvList>
  </ConvPanel>

  <ChatPanel>              {/* flex:1 CENTER */}
    {!selectedConversation && <ChatEmptyState />}
    {selectedConversation && (
      <>
        <ChatHeader>
          <ChatHeaderAvatar />
          <ChatHeaderInfo>
            <ChatHeaderName />
            <OnlineStatus />         {/* "Online on WhatsApp" with green dot */}
          </ChatHeaderInfo>
          <ChatHeaderActions>
            <AssignButton />
            <MoreButton />
          </ChatHeaderActions>
        </ChatHeader>

        {isUnassigned && <ClaimBanner onClaim={handleClaim} />}

        <ChatMessages>
          <DateDivider />
          <SystemMessage />          {/* "Ahmed started a complaint conversation" */}
          <MessageBubble role="customer" />
          <MessageBubble role="agent" />  {/* blue bubble, double tick */}
        </ChatMessages>

        <ChatInput disabled={isUnassigned} />
      </>
    )}
  </ChatPanel>

  <InfoPanel>              {/* 280px RIGHT */}
    <InfoProfile>
      <InfoAvatar size={56} />
      <InfoName />
      <InfoPhone />
      <WhatsAppBadge />    {/* green "WhatsApp Connected" pill */}
    </InfoProfile>
    <InfoSection title="Complaint Details">
      {/* Ticket ID (monospace #CMP-XXXX), submitted, status, assigned to, city */}
    </InfoSection>
    <InfoSection title="Attached Images">
      <ImageGrid cols={3} />   {/* up to 3 image thumbs */}
    </InfoSection>
    <InfoSection title="Customer History">
      {/* Registrations count + link, Claims count + link, Past Complaints count */}
    </InfoSection>
    <InfoActions>
      <ResolveButton />    {/* opens ResolveModal */}
      <TransferButton />   {/* opens TransferModal */}
      <EscalateButton />   {/* opens EscalateModal */}
    </InfoActions>
  </InfoPanel>

  {/* Modals */}
  <ResolveModal isOpen={...} />
  <TransferModal isOpen={...} />
  <EscalateModal isOpen={...} />
</ChatPage>
```

#### 14.3.5 Product Catalog — Table View, Not Grid (Major Correction)

The wireframe shows products in a **data table**, not a card grid. Previous plan assumed grid. Correct this:

```tsx
<ProductsListPage>
  <PageHeader title="Product Catalog" />
  <Tabs active="products">
    <Tab label="Products" count={24} />
    <Tab label="Surface Types" count={8} />
  </Tabs>

  {activeTab === "products" && (
    <>
      <Toolbar>
        <SearchInput />
        <FilterButton label="Filters" />
        <FilterSelect label="Type: All" />
        <FilterSelect label="Status: All" />
        <ExportButton />
        <AddProductButton />   {/* navigates to /app/products/new */}
      </Toolbar>
      <DataTable checkboxColumn imageColumn>  {/* ← checkbox + image columns */}
        {/* columns: checkbox, Image, Product Name, Type, Surface Types, Coverage, Status, Actions */}
        <ProductRow />
      </DataTable>
      <Pagination />
    </>
  )}

  {activeTab === "surface-types" && (
    <>
      <Toolbar>
        <SearchInput />
        <FilterSelect label="Category: All" />
        <AddSurfaceTypeButton />   {/* opens AddSurfaceTypeModal */}
      </Toolbar>
      <DataTable>
        {/* columns: Surface Name, Category, Linked Products count, Status, Actions */}
        <SurfaceTypeRow />
      </DataTable>
      <AddSurfaceTypeModal isOpen={...} />
      <DeleteConfirmModal isOpen={...} type="surface-type" />
    </>
  )}

  <DeleteConfirmModal isOpen={...} type="product" />
</ProductsListPage>
```

Remove `src/components/products/ProductGrid.tsx` and `ProductCard.tsx` from the file tree — replace with table-based rendering. Add:
```
src/components/products/ProductTable.tsx       ← replaces ProductGrid.tsx
src/components/products/SurfaceTypeTable.tsx   ← new
src/components/products/SurfaceTypeModal.tsx   ← add/edit surface type modal
src/components/products/DeleteConfirmModal.tsx ← shared delete confirmation
```

Updated product form surface checkbox layout (Interior/Exterior grouped):
```tsx
<ProductForm>
  {/* ... name, type, coverage, status, URL, key features ... */}
  <SurfaceMappingSection>
    <SurfaceGroup label="Interior Surfaces">
      {["Wood", "Brick", "Metal", "Masonry", "Concrete", "Plaster"].map(s => (
        <SurfaceCheckbox key={s} surface={s} category="interior" />
      ))}
    </SurfaceGroup>
    <SurfaceGroup label="Exterior Surfaces">
      {["Wood", "Brick", "Metal", "Masonry", "Concrete"].map(s => (
        <SurfaceCheckbox key={s} surface={s} category="exterior" />
      ))}
    </SurfaceGroup>
  </SurfaceMappingSection>
</ProductForm>
```

#### 14.3.6 Manual Registration — Corrected Step 4 Label + Save as Draft + Success Screen

Step 4 label fix: "Invoices" (not "Documents").

Add `SaveAsDraftButton` to Step 5 form actions:
```tsx
{/* Step 5 form actions */}
<FormActions>
  <PreviousButton />
  <div style={{ flex: 1 }} />
  <SaveAsDraftButton />     {/* ← NEW: saves wizard state, navigates away */}
  <SubmitButton />          {/* green, larger */}
</FormActions>
```

Add success screen as Step 6 (post-submit):
```tsx
<SuccessScreen>
  <SuccessIcon />           {/* green circle checkmark */}
  <SuccessTitle>Registration Submitted Successfully</SuccessTitle>
  <SuccessDesc />
  <RegIdChip id="REG-0149" />   {/* monospace chip */}
  <InfoBox>                 {/* blue info box with workflow note */}
    This registration will now follow the standard approval workflow...
  </InfoBox>
  <SuccessActions>
    <ViewRegistrationButton />   {/* navigates to /app/registrations/:newId */}
    <CreateAnotherButton />      {/* resets wizard, navigates to /step/1 */}
    <BackToListButton />         {/* navigates to /app/registrations */}
  </SuccessActions>
</SuccessScreen>
```

Route addition for success screen:
```
/app/manual-registration/success   ← new route, shown after submit
```

Add to `src/routes/createBrowserRouter.tsx`:
```tsx
{
  path: "manual-registration",
  element: <ManualRegistrationLayout />,
  children: [
    { index: true, element: <Navigate to="step/1" replace /> },
    { path: "step/:stepId", element: <ManualStepPage /> },
    { path: "success", element: <ManualRegistrationSuccessPage /> },  // ← NEW
  ],
}
```

---

### 14.4 State Management Updates

#### 14.4.1 Modal State — Local useState Only

All 13 modals are managed with local `useState` in their parent page. Do NOT put modal open/close state in Zustand:

```ts
// In RegistrationDetailPage.tsx
const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
const [rejectModalOpen, setRejectModalOpen] = useState(false);

// In ClaimDetailPage.tsx
const [forwardModalOpen, setForwardModalOpen] = useState(false);
const [rejectModalOpen, setRejectModalOpen] = useState(false);
const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
```

#### 14.4.2 Chat — Conversation Assignment State

The wireframe introduces conversation assignment as a first-class state. Add to Zustand store:

```ts
// Add to AppStore (Step 4.10)
conversationAssignmentMap: Record<string, "unassigned" | "mine" | "other">;
setConversationAssignment: (id: string, state: "unassigned" | "mine" | "other") => void;
```

The "Claim & Reply" action on an unassigned ticket triggers `claimConversation` mutation AND updates Zustand `conversationAssignmentMap` to `"mine"`, which unlocks the `ChatInput`.

#### 14.4.3 Chat — Active Tab Filter State

Conversation list has 4 filter tabs (All / Unassigned / Mine / Resolved). This is local state:

```ts
// In ConversationList.tsx or ChatPage.tsx
const [activeFilter, setActiveFilter] = useState<"all" | "unassigned" | "mine" | "resolved">("all");
```

Filter is applied client-side to the conversations React Query cache.

#### 14.4.4 Product Catalog — Tab State

```ts
// In ProductsListPage.tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get("tab") ?? "products";
```

#### 14.4.5 Manual Registration — Save as Draft

When agent clicks "Save as Draft":
1. Current wizard form values are saved to Zustand `wizardDraft`
2. Navigate away (to list page)
3. On returning to `/app/manual-registration/step/1`, check `wizardDraft` in Zustand — if exists, offer "Resume draft?" prompt
4. On submit or explicit cancel, call `clearWizardDraft()`

---

### 14.5 API Layer Updates

#### 14.5.1 New Mutations Required

Add to `src/data/`:

```
registrations/mutations/
  rejectRegistration.ts         ← POST /registrations/:id/reject
                                   payload: { reason: string, notes?: string }

claims/mutations/
  requestMoreInfoClaim.ts       ← POST /claims/:id/request-info
                                   payload: { items: string[], note?: string, priority: string }

quality/mutations/
  approveClaim.ts               ← POST /quality/:id/approve
                                   payload: { assessment: string, notes: string }
  rejectClaim.ts                ← POST /quality/:id/reject
                                   payload: { reason: string, technicalNotes: string }
  requestMoreInfoQA.ts          ← POST /quality/:id/request-info
                                   payload: { items: string[], notes: string, requestFrom: string }

complaints/mutations/
  claimConversation.ts          ← POST /complaints/:id/claim
  resolveConversation.ts        ← POST /complaints/:id/resolve
                                   payload: { resolutionType: string, summary: string, notifyCustomer: boolean }
  transferConversation.ts       ← POST /complaints/:id/transfer
                                   payload: { toType: "agent"|"queue", agentId?: string, reason: string, internalNote: string, keepCC: boolean }
  escalateConversation.ts       ← POST /complaints/:id/escalate
                                   payload: { level: string, reason: string, urgency: string, description: string }

products/mutations/
  deleteProduct.ts              ← DELETE /products/:id
  createSurfaceType.ts          ← POST /products/surface-types
  updateSurfaceType.ts          ← PUT /products/surface-types/:id
  deleteSurfaceType.ts          ← DELETE /products/surface-types/:id

manualRegistration/mutations/
  createRegistration.ts         ← POST /registrations (manual source)
```

#### 14.5.2 New Queries Required

```
products/queries/
  getSurfaceTypes.ts            ← GET /products/surface-types

complaints/queries/
  getConversationById.ts        ← GET /complaints/:id (full conversation with info panel data)
```

#### 14.5.3 Expanded API_ENDPOINTS

Add to `src/constants/apiEndpoints.ts`:
```ts
export const API_ENDPOINTS = {
  // ... existing ...
  REGISTRATION_REJECT: (id: string) => `/registrations/${id}/reject`,

  CLAIM_REQUEST_INFO: (id: string) => `/claims/${id}/request-info`,

  QUALITY: "/quality",
  QUALITY_APPROVE: (id: string) => `/quality/${id}/approve`,
  QUALITY_REJECT: (id: string) => `/quality/${id}/reject`,
  QUALITY_REQUEST_INFO: (id: string) => `/quality/${id}/request-info`,

  SURFACE_TYPES: "/products/surface-types",
  SURFACE_TYPE_BY_ID: (id: string) => `/products/surface-types/${id}`,

  COMPLAINT_CLAIM: (id: string) => `/complaints/${id}/claim`,
  COMPLAINT_RESOLVE: (id: string) => `/complaints/${id}/resolve`,
  COMPLAINT_TRANSFER: (id: string) => `/complaints/${id}/transfer`,
  COMPLAINT_ESCALATE: (id: string) => `/complaints/${id}/escalate`,
} as const;
```

Add to `src/constants/queryKeys.ts`:
```ts
SURFACE_TYPES: ["surface-types"] as const,
SURFACE_TYPE_DETAIL: (id: string) => ["surface-type", id] as const,
QUALITY_QUEUE: ["quality-queue"] as const,
QUALITY_DETAIL: (id: string) => ["quality", id] as const,
```

---

### 14.6 WebSocket Updates

#### 14.6.1 New WS Event Types from Chat Wireframe

The wireframe introduces conversation states (unassigned/active/resolved) that update in real time. Expand `WSEvent`:

```ts
type WSEvent =
  | { type: "message"; payload: ChatMessage }
  | { type: "conversation_status"; payload: { id: string; status: "unassigned" | "active" | "resolved" } }
  | { type: "conversation_claimed"; payload: { id: string; agentId: string; agentName: string } }
  | { type: "conversation_transferred"; payload: { id: string; newAgentId: string } }
  | { type: "conversation_escalated"; payload: { id: string; level: string } }
  | { type: "agent_typing"; payload: { conversationId: string } }
  | { type: "new_conversation"; payload: { conversation: Conversation } }   // ← new unassigned ticket arrives
  | { type: "unread_count"; payload: { count: number } };                   // ← updates nav badge
```

The `new_conversation` event is critical — when a new WhatsApp complaint comes in, the left panel must update with the new unassigned conversation in real time without page refresh.

#### 14.6.2 useChat Update for Conversation Claims

`useChat` must handle the `conversation_claimed` event to update the local conversation's assignment state:

```ts
// In useChat.ts — add handler
const handleClaim = useCallback(() => {
  claimConversation({ id: conversationId });
  // optimistically update local state so input unlocks immediately
  setIsAssignedToMe(true);
}, [conversationId]);
```

---

### 14.7 Form Architecture Updates

#### 14.7.1 New Schemas Required

Add to `src/schemas/`:

```ts
// resubmission.schema.ts
export const resubmissionSchema = z.object({
  fields: z.array(z.enum([
    "personal_info", "purchase_date", "dealer_info",
    "product_details", "topcoat_invoice", "basecoat_invoice"
  ])).min(1, "Select at least one field"),
  note: z.string().optional(),
});

// reject.schema.ts (shared for reg + claim CS reject)
export const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
  notes: z.string().optional(),
});

// forwardToQuality.schema.ts
export const forwardToQualitySchema = z.object({
  notes: z.string().optional(),
  priority: z.enum(["normal", "high"]).default("normal"),
});

// requestMoreInfo.schema.ts
export const requestMoreInfoSchema = z.object({
  items: z.array(z.string()).min(1, "Select at least one item"),
  otherText: z.string().optional(),
  note: z.string().optional(),
  priority: z.enum(["normal", "high"]).default("normal"),
});

// quality.schema.ts
export const qualityApproveSchema = z.object({
  assessment: z.string().min(1, "Technical assessment is required"),
  notes: z.string().optional(),
});
export const qualityRejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
  technicalNotes: z.string().min(1, "Technical notes are required"),
});
export const qualityRequestInfoSchema = z.object({
  items: z.array(z.string()).min(1),
  notes: z.string().optional(),
  requestFrom: z.enum(["cs_agent", "customer"]).default("cs_agent"),
});

// resolve.schema.ts
export const resolveSchema = z.object({
  resolutionType: z.enum(["issue_resolved", "customer_satisfied", "duplicate", "spam"]),
  summary: z.string().optional(),
  notifyCustomer: z.boolean().default(true),
});

// transfer.schema.ts
export const transferSchema = z.object({
  toType: z.enum(["agent", "queue"]),
  agentId: z.string().optional(),
  reason: z.string().min(1),
  internalNote: z.string().optional(),
  keepCC: z.boolean().default(true),
});

// escalate.schema.ts
export const escalateSchema = z.object({
  level: z.enum(["team_lead", "supervisor", "manager"]),
  reason: z.string().min(1),
  urgency: z.enum(["normal", "high", "critical"]),
  description: z.string().min(1),
});

// surfaceType.schema.ts
export const surfaceTypeSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["interior", "exterior"]),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});
```

---

### 14.8 UI Component Library Updates (Step 8 additions)

Add to `src/components/ui/`:

```
Modal.tsx                  ← base modal wrapper (overlay + box + header + body + footer)
ModalIcon.tsx              ← icon with semantic variants: warning (amber), info (blue), success (green), purple
RoleBanner.tsx             ← sticky role identity banner (purple for Quality team)
SourceTag.tsx              ← WhatsApp (green) / Manual (blue) source indicator
PriorityBadge.tsx          ← High (red bg) / Normal (gray bg)
ConvStatusBadge.tsx        ← Unassigned (amber) / Active (green) / Resolved (gray)
WorkflowSteps.tsx          ← 1-2-3 step progress indicator (done/current/pending)
Tabs.tsx                   ← tab bar component with count badges
SystemMessage.tsx          ← centered chat system event bubble
DateDivider.tsx            ← date separator in chat message list
InfoPanel.tsx              ← right chat panel layout component
```

#### Tailwind additions for Step 13 (new tokens from wireframe):

```ts
// Add to colors in tailwind.config.ts
source: {
  whatsapp: { bg: "#ecfdf5", text: "#16a34a" },
  manual:   { bg: "#f0f4ff", text: "#4a6fa5" },
},
priority: {
  high:   { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  normal: { bg: "#f0f0f0", text: "#666666", dot: "#22c55e" },
  medium: { dot: "#f59e0b" },
},
convStatus: {
  unassigned: { bg: "#fef3c7", text: "#b45309" },  // = cs-unassigned
  active:     { bg: "#e6f9e6", text: "#2e7d32" },  // = cs-active
  resolved:   { bg: "#f0f0f0", text: "#888888" },  // = cs-resolved
},
modal: {
  warning: { bg: "#fef3c7", text: "#d97706" },
  info:    { bg: "#dbeafe", text: "#2563eb" },
  success: { bg: "#dcfce7", text: "#16a34a" },
  purple:  { bg: "#f3e8ff", text: "#7c3aed" },
},
quality: {
  roleBannerBg:     "#faf5ff",
  roleBannerBorder: "#e9d5ff",
  roleBannerText:   "#7c3aed",
  roleBannerDot:    "#7c3aed",
},
```

New Tailwind component classes for `src/index.css`:
```css
@layer components {
  /* Source tags */
  .source-whatsapp { @apply inline-block px-2 py-0.5 rounded text-xs bg-source-whatsapp-bg text-source-whatsapp-text; }
  .source-manual   { @apply inline-block px-2 py-0.5 rounded text-xs bg-source-manual-bg   text-source-manual-text; }

  /* Priority badges */
  .priority-high   { @apply inline-block px-2 py-0.5 rounded text-xs font-semibold bg-priority-high-bg   text-priority-high-text; }
  .priority-normal { @apply inline-block px-2 py-0.5 rounded text-xs font-semibold bg-priority-normal-bg text-priority-normal-text; }

  /* Conversation status */
  .conv-status-unassigned { @apply text-[10px] font-semibold px-1.5 py-px rounded bg-convStatus-unassigned-bg text-convStatus-unassigned-text; }
  .conv-status-active     { @apply text-[10px] font-semibold px-1.5 py-px rounded bg-convStatus-active-bg     text-convStatus-active-text; }
  .conv-status-resolved   { @apply text-[10px] font-semibold px-1.5 py-px rounded bg-convStatus-resolved-bg   text-convStatus-resolved-text; }

  /* Role banner (Quality team) */
  .role-banner {
    @apply bg-quality-roleBannerBg border-b-2 border-quality-roleBannerBorder
           px-6 py-2 flex items-center gap-2 text-sm text-quality-roleBannerText font-semibold;
  }

  /* Forward / Info Request / Purple action buttons */
  .btn-forward {
    @apply btn w-full justify-center bg-[#7c3aed] text-white border-0 hover:brightness-95;
  }
  .btn-info-req {
    @apply btn w-full justify-center bg-surface text-[#2563eb]
           border border-[#93c5fd] hover:bg-[#eff6ff];
  }
  .btn-resubmit {
    @apply btn w-full justify-center bg-surface text-[#2563eb]
           border border-[#93c5fd] hover:bg-[#eff6ff];
  }
  .btn-claim    { @apply btn bg-amber text-white border-0 hover:brightness-95; }
  .btn-resolve  { @apply btn w-full justify-center bg-action-approve-bg text-white; }
  .btn-transfer { @apply btn w-full justify-center bg-surface text-text-label border border-border; }
  .btn-escalate { @apply btn w-full justify-center bg-surface text-action-reject-text border border-action-reject-border; }
}
```

---

### 14.9 RBAC / Permissions Updates (Step 11 additions)

Update `usePermissions` to cover all new actions found in wireframes:

```ts
export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role;
  return {
    // Registrations
    canApproveRegistrations:    role === "admin" || role === "cs",
    canRejectRegistrations:     role === "admin" || role === "cs",
    canRequestResubmission:     role === "admin" || role === "cs",

    // Claims (CS layer)
    canForwardToQuality:        role === "admin" || role === "cs",
    canRejectClaims:            role === "admin" || role === "cs",
    canRequestMoreInfoCS:       role === "admin" || role === "cs",

    // Quality (QA layer — separate from CS)
    canSubmitQualityDecision:   role === "quality",
    canApproveClaimQA:          role === "quality",
    canRejectClaimQA:           role === "quality",
    canRequestMoreInfoQA:       role === "quality",
    canSeeRoleBanner:           role === "quality",

    // Chat
    canClaimConversation:       role === "admin" || role === "cs",
    canResolveConversation:     role === "admin" || role === "cs",
    canTransferConversation:    role === "admin" || role === "cs",
    canEscalateConversation:    role === "admin" || role === "cs",

    // Admin
    canManageProducts:          role === "admin",
    canManageSurfaceTypes:      role === "admin",
    canImportData:              role === "admin",
    canManualRegister:          role === "admin" || role === "cs",
    // canManualRegister gates the "Add Manual Registration" button visibility
    // on the Registrations list page only — it is NOT a separate route guard.
  };
};
```

---

### 14.10 Navigation Labels — Exact Sidebar Text (from Wireframes)

The sidebar navigation labels must match the wireframe exactly:

```
Main
  Dashboard

Warranty
  Registrations    [badge: pending count — red (#e74c3c)]
  Claims           [badge: pending count — red (#e74c3c)]
  Quality Review   [NO badge — no count badge shown for Quality Review]

Support
  Live Chat        [badge: unassigned count — red (#e74c3c)]
  Complaints       [disabled / coming soon in Phase 1]

Admin
  Product Catalog
  Data Import
  Settings
```

**"Complaints" is disabled in Phase 1.** The hub wireframe explicitly marks it with `disabled` class and `—` dash. Do not implement the Complaints list page in Phase 1. Show as disabled nav item.

"Quality Review" has **no sidebar badge**. The route `/app/quality` is restricted to `QUALITY` role per Step 1.6. All sidebar badges that do appear use red (`#e74c3c`) background — matching `danger.DEFAULT` in the Tailwind config. The blue badge style (`#2a4a6a`/`#6ab0ff`) seen in the wireframe hub HTML is hub-only UI and must NOT be used in the real application sidebar.

---

### 14.11 Output of Step 14

- All 31 wireframe screens across 6 flows reviewed in full.
- 13 modal types identified and mapped to their parent pages.
- Component trees updated for Registrations, Claims, Quality, Chat, Products, and Manual Registration.
- `ResubmissionField` type expanded to 6 fields (was missing `personal_info` and `purchase_date`).
- Product catalog corrected from grid to table; surface types management added as separate tab.
- Chat updated to 3-panel layout with full `InfoPanel` component defined.
- `ChatEmptyState`, `ClaimBanner`, `SystemMessage`, `DateDivider` identified as missing components.
- Manual registration Step 4 label corrected to "Invoices"; success screen and `/success` route added.
- 15 new API mutations and 2 new queries identified and mapped to data layer files.
- All new `API_ENDPOINTS` and `QUERY_KEYS` defined.
- `WSEvent` type expanded with 3 new event types from chat wireframe.
- 12 new Zod schemas defined for all modal forms.
- 10 new UI component primitives identified.
- Tailwind config extended with source, priority, convStatus, modal, and quality token groups.
- `usePermissions` hook expanded to cover all 17 action types across all roles.
- "Complaints" nav item confirmed disabled in Phase 1.
