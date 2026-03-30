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
 ├── manual-registration
 │   └── step/:stepId
 │
 ├── import
 │
 └── settings
```

### 1.4 Screen-to-Route Mapping

- `A1` Login -> `/login`
- `B1` Dashboard -> `/app/dashboard`
- `B2/B3` Registrations list/detail -> `/app/registrations`, `/app/registrations/:id`
- `B4/B5` Claims list/detail -> `/app/claims`, `/app/claims/:id`
- `B6` Quality module -> `/app/quality`, `/app/quality/:id`
- `B7` Complaints chat -> `/app/complaints`, `/app/complaints/:id`
- `B8/B9` Product catalog + add/edit -> `/app/products`, `/app/products/new`, `/app/products/:id/edit`
- `B10` Manual registration wizard -> `/app/manual-registration/step/:stepId`
- `B11` Data import -> `/app/import`
- `B12` Settings -> `/app/settings`

### 1.5 Route Behavior Requirements

- `/registrations` renders list, `/registrations/:id` renders detail (page/slide-over route).
- `/claims` renders list, `/claims/:id` renders detail.
- `/complaints` renders conversation list, `/complaints/:id` renders active thread.
- Manual registration wizard must support direct deep linking by step:
  - `/app/manual-registration/step/1`
  - `/app/manual-registration/step/2`
  - ...

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
            children: [{ path: "step/:stepId", element: <ManualStepPage /> }], // B10
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

- `src/components/auth/LoginForm.tsx`
- `src/context/AuthContext.tsx`
- `src/hooks/auth/useAuth.ts`
- `src/data/auth/mutations/login.ts`
- `src/pages/LoginPage.tsx`

#### Dashboard

- `src/components/dashboard/StatsCards.tsx`
- `src/components/dashboard/ActivityList.tsx`
- `src/components/dashboard/TicketsTable.tsx`
- `src/data/dashboard/queries/getDashboardStats.ts`
- `src/pages/DashboardPage.tsx`

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

- `src/components/products/ProductGrid.tsx`
- `src/components/products/ProductCard.tsx`
- `src/components/products/ProductForm.tsx`
- `src/data/products/queries/getProducts.ts`
- `src/data/products/mutations/createProduct.ts`
- `src/data/products/mutations/updateProduct.ts`
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
- `src/hooks/manualRegistration/useManualRegistration.ts`
- `src/pages/ManualRegistrationLayout.tsx`
- `src/pages/ManualStepPage.tsx`

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

#### B1 Dashboard

```tsx
<DashboardPage>
  <DashboardHeader />
  <StatsCards>
    <StatCard />
    <StatCard />
    <StatCard />
    <StatCard />
  </StatsCards>
  <DashboardContent>
    <TrendChart />
    <RecentActivity />
  </DashboardContent>
  <LatestTicketsTable>
    <Table />
  </LatestTicketsTable>
</DashboardPage>
```

Data flow:

- `DashboardPage` calls `useDashboardData`.
- Passes KPI/activity/tickets data into presentational components.

#### B2 Registrations List

```tsx
<RegistrationsListPage>
  <PageHeader />
  <RegistrationFilters>
    <SearchInput />
    <StatusFilter />
    <DateFilter />
  </RegistrationFilters>
  <RegistrationTable>
    <Table>
      <RegistrationRow />
      <RegistrationRow />
    </Table>
  </RegistrationTable>
  <Pagination />
</RegistrationsListPage>
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
  <PageHeader />
  <ClaimsFilters />
  <ClaimsTable>
    <ClaimRow />
  </ClaimsTable>
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
  <SplitLayout>
    <QualityQueue>
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
      <ChatHeader />
      <MessageList>
        <MessageBubble />
        <MessageBubble />
      </MessageList>
      <ChatInput />
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
  <ProductFilters />
  <ProductGrid>
    <ProductCard />
    <ProductCard />
  </ProductGrid>
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
- optional wizard shared draft state
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
| Manual Registration Wizard | Zustand (shared draft) + local form state |

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
- Persist wizard draft in localStorage and hydrate on mount.

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
  name: z.string().min(1),
  type: z.string().min(1),
  coverage: z.coerce.number().nonnegative(),
  surfaces: z.array(z.string()).min(1),
  image: z.any().optional(),
});
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
export const step4Schema = fileSchema;
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
        getMessages.ts
      mutations/
        sendMessage.ts

  hooks/
    complaints/
      useWebSocket.ts
      useChat.ts

  components/
    complaints/
      ChatWindow.tsx
      MessageBubble.tsx
      ChatInput.tsx
      ConversationList.tsx
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

Conversation state domain:
- `open`, `claimed`, `resolved`

Required additional chat mutations:
```text
src/data/complaints/mutations/claimConversation.ts
src/data/complaints/mutations/resolveConversation.ts
```

Required WS event contract:
```ts
type WSEvent =
  | { type: "message"; payload: ChatMessage }
  | { type: "conversation_status"; payload: { id: string; status: "open" | "claimed" | "resolved" } }
  | { type: "agent_typing"; payload: { conversationId: string } };
```

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
