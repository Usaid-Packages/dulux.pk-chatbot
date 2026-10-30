# Session 1 — Orientation

**Date:** 2026-04-17
**Scope:** Backend only (Python/Django + WhatsApp integration + data layer + deployment)
**Auditor:** Claude Opus 4.6 (automated)

---

## 1. Architecture Summary

The backend is a Django 3.2+ application served via Daphne (ASGI) that implements a WhatsApp-based warranty management chatbot for Dulux Pakistan, backed by PostgreSQL and Redis. The WhatsApp Cloud API webhook (`POST /api/v1/chatbot/webhook/`) receives inbound messages, which a dispatcher routes through a state-machine architecture: each conversational flow (registration, claim, complaint, product finder, certificate reissuance) is a `BaseFlow` subclass whose `current_step` maps to `handle_<step>` / `prompt_<step>` methods stored in a `WhatsAppSession` model. Celery (Redis broker, django-db result backend) handles async work — email notifications via Django's `EmailMultiAlternatives`, PDF certificate generation via ReportLab, and WhatsApp document delivery. A separate REST API surface (`/api/v1/warranty/`, `/api/v1/complaints/`, `/api/v1/products/`, `/api/v1/users/`) authenticated with JWT (SimpleJWT + dj-rest-auth + allauth) serves a React admin panel for CS agents and quality reviewers to manage registrations, claims, and live complaints. Real-time complaint chat is implemented via Django Channels WebSockets (`ws/complaints/<id>/chat/`) with JWT auth from query-string tokens. Production deployment uses Docker Compose with Gunicorn, Celery worker + beat, Redis, PostgreSQL, Nginx (TLS via Certbot), Infisical for secrets, NewRelic for APM, and Sentry for error tracking; media is stored on AWS S3 with CloudFront.

---

## 2. Django App Map

| App | Responsibility |
|-----|----------------|
| **`dulux_chatbot.core`** | Shared `Image` model (media storage), custom pagination, permission classes (`IsCSAgent`, `IsQualityReviewer`, `IsAdminUser`, composites), logging middleware, health-check endpoint, image upload API. |
| **`dulux_chatbot.users`** | Custom `User(AbstractUser)` with email as username, role field (`CS_AGENT`, `QUALITY_REVIEWER`, `ADMIN`), custom password validator, user detail serializer for dj-rest-auth. |
| **`dulux_chatbot.products`** | `Product` (topcoat/basecoat with warranty years), `ProductImage`, `ProductBasecoat` (topcoat-to-basecoat compatibility M2M), `SurfaceType`, `ProductSurfaceMapping`. CRUD API with search/filter. |
| **`dulux_chatbot.warranty`** | Core domain: `WarrantyRegistration` (state machine: SUBMITTED -> IN_PROGRESS -> APPROVED/REJECTED/RESUBMIT), `RegistrationPaintPair`, `PaintPairInvoice`, `WarrantyClaim` (state machine: SUBMITTED -> IN_REVIEW -> QA_REVIEW -> QA_APPROVED/QA_REJECTED/APPROVED/REJECTED/RESUBMIT), `ClaimImage`, `ClaimQualityReview`, `ClaimResubmission`, `RejectionField`. PDF certificate generation service. Email + WhatsApp notification Celery tasks. Resubmission logic that maps rejected fields back to chatbot flow steps. |
| **`dulux_chatbot.complaints`** | `Complaint` (OPEN/IN_PROGRESS/RESOLVED/CLOSED), `ChatMessage` (CUSTOMER/CS_AGENT sender), `ComplaintImage`. REST API + WebSocket consumers for real-time chat. Bridges WhatsApp messages to CS agent chat via Channels. |
| **`dulux_chatbot.chatbot`** | WhatsApp webhook handler, message parser, dispatcher, session model (`WhatsAppSession`, `ProcessedMessage`), `BaseFlow` ABC + 6 flow subclasses (registration, claim, claim_resubmission, find_product, complaint, reissuance), `WhatsAppClient` HTTP service, deferred side-effect pattern, Celery tasks for async menu send and product result delivery. |
| **`dulux_chatbot.audit_logs`** | Generic `AuditLog` model (actor, action, content_type via GenericFK, JSON changes/before/after snapshots). Service functions `log_create` / `log_update` called from serializers. |

---

## 3. End-to-End Flow Trace: Warranty Registration

### Step-by-step trace

**1. Customer sends "1" on WhatsApp** (selects warranty registration from main menu)

- **WhatsApp Cloud API** delivers webhook payload to `POST /api/v1/chatbot/webhook/`
- **[`chatbot/api/v1/views.py:32`](dulux_chatbot/chatbot/api/v1/views.py#L32)** — `WhatsAppWebhookView.post()` receives the request
- **[`chatbot/handlers/message_parser.py`](dulux_chatbot/chatbot/handlers/message_parser.py)** — `parse_incoming_message(request.data)` extracts `{message_id, from, type, text: "1"}`
- **[`chatbot/api/v1/views.py:41`](dulux_chatbot/chatbot/api/v1/views.py#L41)** — `ProcessedMessage.objects.get_or_create(message_id=...)` deduplicates
- **[`chatbot/api/v1/views.py:49`](dulux_chatbot/chatbot/api/v1/views.py#L49)** — `WhatsAppSession.objects.get_or_create(phone_number=...)` loads/creates session
- **[`chatbot/api/v1/views.py:52`](dulux_chatbot/chatbot/api/v1/views.py#L52)** — `dispatch(session, message, client)` called

**2. Dispatcher selects the registration flow**

- **[`chatbot/handlers/dispatcher.py:54-61`](dulux_chatbot/chatbot/handlers/dispatcher.py#L54-L61)** — `dispatch()` opens `transaction.atomic()`, acquires `select_for_update()` lock on session, collects side effects
- **[`chatbot/handlers/dispatcher.py:119-129`](dulux_chatbot/chatbot/handlers/dispatcher.py#L119-L129)** — `session.flow is None`, so `MENU_OPTIONS["1"]` resolves to `FlowType.REGISTRATION`. Session updated: `flow=REGISTRATION`, `current_step="consent"`, `session_data={}`
- **[`chatbot/handlers/dispatcher.py:128`](dulux_chatbot/chatbot/handlers/dispatcher.py#L128)** — `RegistrationFlow(session, client).send_initial_prompt()` called
- **[`chatbot/flows/base.py`](dulux_chatbot/chatbot/flows/base.py)** — `send_initial_prompt()` calls `prompt_consent()` via dynamic method dispatch
- **[`chatbot/flows/registration.py:26`](dulux_chatbot/chatbot/flows/registration.py#L26)** — `prompt_consent()` sends "Reply YES to continue or NO to cancel." via `DeferredWhatsAppClient`
- Transaction commits -> deferred side effects execute -> WhatsApp API call fires

**3. Customer walks through all registration steps**

Each subsequent WhatsApp message follows the same webhook -> parse -> dispatch -> `RegistrationFlow.handle(message)` path. The `handle()` method in `BaseFlow` dynamically calls `handle_<current_step>(message)`:

- `consent` -> YES -> advance to `name`
- `name` -> "John Doe" -> save to session_data, advance to `email`
- `email` -> validated via `django.core.validators.validate_email`, advance to `city`
- `city` -> `province` -> `site_address` -> `purchase_date` (parsed with multiple date formats, validated against future date and `REGISTRATION_PURCHASE_DAYS_LIMIT` constance config)
- `dealer_name` -> `dealer_city` -> `dealer_address`
- `postal_code` -> **skipped in normal flow** (only prompted during resubmission), auto-advances to `topcoat_select`
- `topcoat_select` -> queries `Product.objects.filter(product_type=TOPCOAT, is_active=True, warranty_years__gt=MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS)`, presents numbered list
- `topcoat_quantity` -> parsed as `Decimal`, must be > 0
- `basecoat_select` -> linked basecoats for selected topcoat, or SKIP
- `basecoat_quantity` (if not skipped) -> `_append_current_paint_pair()` stores to `paint_pairs` list in session_data
- `add_more_pairs` -> YES loops back to topcoat, NO advances to `invoice_upload`
- `invoice_upload` -> accepts image media_id, downloads via `WhatsAppClient.download_media_with_metadata()`, saves to `Image` model via `_save_media_image()`, appends to `paint_pair_invoices` in session_data. Reply DONE to finalize.

**4. Registration is created**

- **[`chatbot/flows/registration.py:367-405`](dulux_chatbot/chatbot/flows/registration.py#L367-L405)** — `handle_complete()` wraps in `@transaction.atomic`:
  - Builds payload from `session_data`
  - **[`warranty/api/v1/serializers.py`](dulux_chatbot/warranty/api/v1/serializers.py)** — `WarrantyRegistrationCreateSerializer` validates all fields, generates `registration_code` via `generate_registration_code()`, creates `WarrantyRegistration` + `RegistrationPaintPair` + `PaintPairInvoice` records
  - Sends confirmation message with registration code via WhatsApp
  - `_reset()` clears session back to menu

- Registration is now in **`SUBMITTED`** state in the database.

**5. CS Agent reviews the registration (React admin panel)**

- CS Agent authenticates via JWT (`POST /api/v1/users/auth/login/`)
- Lists registrations via `GET /api/v1/warranty/registrations/?state=SUBMITTED`
- **[`warranty/api/v1/views.py`](dulux_chatbot/warranty/api/v1/views.py)** — `WarrantyRegistrationListCreateAPIView` returns paginated list
- Views detail via `GET /api/v1/warranty/registrations/<id>/`
- Approves via `PATCH /api/v1/warranty/registrations/<id>/` with `{"action": "approve", "notification_template": "<html>..."}`
- **[`warranty/api/v1/serializers.py`](dulux_chatbot/warranty/api/v1/serializers.py)** — `WarrantyRegistrationUpdateSerializer.update()`:
  - Validates state transition (SUBMITTED/IN_PROGRESS -> APPROVED)
  - Sets `state=APPROVED`, `approved_by=request.user`
  - Logs via `log_update()` to `AuditLog`
  - Enqueues `send_registration_status_notification.delay(registration_id, notification_template)`

**6. Certificate generated and delivered**

- **[`warranty/tasks.py:81-129`](dulux_chatbot/warranty/tasks.py#L81-L129)** — `send_registration_status_notification()` Celery task:
  - Calls `_ensure_registration_certificate(registration)` which invokes:
  - **[`warranty/services/certificate.py:279`](dulux_chatbot/warranty/services/certificate.py#L279)** — `generate_warranty_certificate()` builds a multi-page PDF via ReportLab with header/footer images, customer details, product table, registration code box
  - Saves PDF to `registration.warranty_certificate` (FileField -> S3 in prod)
  - Sends email with HTML body + attached PDF certificate via `EmailMultiAlternatives`
  - Resets WhatsApp session via `reset_whatsapp_session_to_main_menu()`
  - Sends WhatsApp text: "Your Warranty registration: {code} is approved."
  - Sends WhatsApp document: the certificate PDF via `client.send_document()`
  - Enqueues `send_whatsapp_main_menu.apply_async(countdown=2)` to send menu after a 2-second delay

**Flow complete.** Customer receives: approval text + PDF certificate on WhatsApp + email with PDF attachment.

---

## 4. External Integrations Inventory

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| **WhatsApp Cloud API (v20.0)** | Inbound webhook + outbound messages (text, image, document, interactive buttons/lists), media download | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, Constance: `WHATSAPP_API_BASE_URL` |
| **AWS S3 + CloudFront** | Media/static file storage (prod only) | `storages` library, configured in `config/settings/prod.py` |
| **PostgreSQL** | Primary relational database | `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` |
| **Redis** | Celery broker, Django cache, Channels layer (WebSocket), Constance backend | `REDIS_URL` |
| **Email (SMTP / Brevo)** | Registration/claim status notifications, resubmission notifications | `config/settings/brevo.py` (Brevo/Sendinblue SMTP) |
| **Sentry** | Error tracking | `config/settings/sentry.py` |
| **NewRelic** | APM and infrastructure monitoring | Container in `docker-compose.prod.yml` |
| **Infisical** | Secrets management | Agent container + entrypoint script in prod compose |
| **Certbot / Let's Encrypt** | TLS certificate auto-renewal | `init-letsencrypt.sh`, certbot container in prod compose |
| **ReportLab** | PDF warranty certificate generation | Pure Python, no external service |

---

## 5. Data Stores

| Store | Technology | Purpose |
|-------|-----------|---------|
| Primary DB | PostgreSQL | All models, sessions, audit logs, Celery results (`django-db`) |
| Cache | Redis (`/1`) | Django cache framework |
| Message Broker | Redis (default) | Celery task queue |
| Channel Layer | Redis (host:port) | Django Channels WebSocket pub/sub |
| Dynamic Config | Redis (`/0`) | Constance key-value store |
| File Storage | Local (dev) / S3 (prod) | Images, invoices, certificates, vouchers |

---

## 6. API Surface Serving the React Panel

**Authentication:** JWT via SimpleJWT + dj-rest-auth + django-allauth (including Google OAuth). Access/refresh token lifetimes configurable via env vars.

**Endpoints:**

| Prefix | Key Endpoints | Auth |
|--------|---------------|------|
| `/api/v1/users/` | Login, register, password reset, Google OAuth, user details, user list | JWT (some public) |
| `/api/v1/warranty/registrations/` | List, create, retrieve, update (approve/reject/resubmit) | JWT + role |
| `/api/v1/warranty/card-counts/registrations/` | Dashboard card counts | JWT + CS_AGENT/ADMIN |
| `/api/v1/warranty/claims/` | List, create, retrieve, update (approve/reject) | JWT + role |
| `/api/v1/warranty/claims/<id>/quality/approve\|reject\|request-info/` | QA review actions | JWT + QUALITY_REVIEWER/ADMIN |
| `/api/v1/warranty/claims/<id>/csr-resubmission/` | CSR resubmission | JWT + CS_AGENT/ADMIN |
| `/api/v1/warranty/card-counts/claims/` | Claim dashboard counts | JWT + role |
| `/api/v1/warranty/card-counts/quality/` | QA dashboard counts | JWT + QUALITY_REVIEWER/ADMIN |
| `/api/v1/complaints/` | List, create, retrieve, update | JWT + role |
| `/api/v1/complaints/<id>/messages/` | Chat message list + send | JWT + role |
| `/api/v1/complaints/card-counts/` | Live chat counts | JWT + role |
| `/api/v1/products/` | CRUD, basecoat lookups, warranty options, images | JWT + role |
| `/api/v1/audit-logs/` | Audit log listing | JWT + ADMIN |
| `/api/v1/core/health/` | Health check | Public |
| `/api/v1/core/images/` | Image upload | JWT |
| `/swagger/` | API documentation (Swagger UI) | Basic Auth |
| `ws/complaints/queue/` | Real-time complaint queue events | JWT (query string) |
| `ws/complaints/<id>/chat/` | Real-time complaint chat | JWT (query string) |

---

## 7. Deployment Topology (Production)

From `docker-compose.prod.yml`:

```
                  +-----------+
                  |  Certbot  |
                  +-----+-----+
                        |
            +-----------+-----------+
            |       Nginx (:80/:443)|
            +-----------+-----------+
                        |
            +-----------+-----------+
            |   Django/Gunicorn     |
            |   (Daphne for WS)    |
            +-----------+-----------+
                   |         |
        +----------+    +----+------+
        |  Redis   |    | PostgreSQL|
        +----------+    +-----------+
                   |
        +----------+----------+
        | Celery Worker       |
        | Celery Beat         |
        | Flower (monitoring) |
        +---------------------+
                   |
        +----------+----------+
        |   Infisical Agent   |
        |   NewRelic Agent    |
        +---------------------+
```

---

## 8. Open Questions for Session 2

These are ambiguities and unknowns I need clarified before the critique sessions:

1. **ASGI vs WSGI in prod:** `docker-compose.prod.yml` uses Gunicorn (`gunicorn config.wsgi:application`), but WebSockets require Daphne/ASGI. Is there a separate Daphne process for WebSocket connections, or is Gunicorn running with a Uvicorn worker? How are WebSocket connections actually served in production?

2. **Email provider details:** There's a `brevo.py` settings file. Is Brevo (Sendinblue) the production email backend, or is the default Django SMTP backend used? Is `DEFAULT_FROM_EMAIL` configured?

3. **Webhook signature verification:** The `POST` handler in `WhatsAppWebhookView` does not verify the `X-Hub-Signature-256` header from Meta. The `GET` handler verifies the challenge token. Is signature verification handled at a different layer (Nginx, middleware)?

4. **Rate limiting:** I see no rate limiting on the webhook endpoint or the REST API. Is this handled at the Nginx or infrastructure level?

5. **Database migrations in deployment:** Is there a migration step in the deployment pipeline? The `docker-entrypoint.sh` script likely handles this, but I haven't read it.

6. **Certificate PDF assets:** `generate_warranty_certificate()` references `CERTIFICATE_PAGE_ONE_HEADER_IMAGE` and `CERTIFICATE_PAGE_TWO_FOOTER_IMAGE` from the filesystem. How are these image assets deployed into the Docker container?

7. **Constance OTP settings:** There are OTP-related constance configs (`OTP_CODE_LENGTH`, `MAX_OTP_RETRIES`, `OTP_EXPIRY_MINUTES`) but I haven't found the OTP flow. Is OTP used anywhere, or are these leftover config?

8. **Flower exposure:** Flower (Celery monitoring) appears in the prod compose. Is it behind Nginx with authentication, or is it exposed directly?

9. **`CORS_ALLOW_ALL_ORIGINS = True`** in base settings. Is this overridden in prod? This allows any origin to make authenticated API requests.

10. **Claim approval voucher:** The claim notification task checks for `claim.voucher` but I didn't see where the voucher PDF is generated or uploaded. Is this uploaded manually by a CS agent/QA reviewer through the admin panel?

11. **WebSocket auth mechanism:** The `ComplaintChatConsumer` uses JWT from query string (`?token=...`). The ASGI config uses `AuthMiddlewareStack` (Django session auth), but the consumers manually parse JWT. Which auth path is actually used?

12. **CI/CD pipeline:** There's a `.github/` directory. What does the CI pipeline do? Is there automated testing, linting, deployment?

13. **`tasks.yml`** at the root — what is this for? Is it an Ansible playbook, GitHub Actions reusable workflow, or something else?

14. **Test coverage:** Tests exist for `chatbot/tests/`, `complaints/tests/`, `products/tests/`. What is the current coverage level? Are warranty tests present?

15. **Session data size:** `WhatsAppSession.session_data` is a `JSONField` that accumulates paint pairs, invoices, resubmission data. Is there a practical size limit concern for a single registration with many paint pairs and invoices?

---

# Session 2 — Architecture + Security

**Date:** 2026-04-17
**Scope:** Backend only — cross-cutting architecture and security review
**Auditor:** Claude Opus 4.6 (automated)

## Clarifications Applied from Session 1

- **WebSockets in prod:** Use Uvicorn/Daphne ASGI on stage. (Noted — prod compose still runs Gunicorn WSGI; see ARCH-01.)
- **Webhook signature verification:** Missing — confirmed as a finding (WA-01).
- **CORS_ALLOW_ALL_ORIGINS:** Confirmed as a problem — finding SEC-01.
- **Claim voucher PDFs:** Uploaded manually through admin panel (voucher FileField on claim, uploaded during approve action).

---

## Architecture Observations

### App Boundaries and Responsibilities

The seven Django apps have **well-defined boundaries**. The `warranty` app owns the core domain (registrations, claims, state machines, approvals), `chatbot` owns the WhatsApp integration layer (webhook, flows, session management), `complaints` owns the live-chat bridge, `products` owns the catalog, and `core` provides shared infrastructure. Cross-app imports follow a clean dependency graph: `chatbot` imports from `warranty` and `products` (to create registrations and look up products), `warranty.tasks` imports from `chatbot.services` (to send WhatsApp notifications), and `complaints` imports from `chatbot.services` (to bridge CS chat to WhatsApp). There is no circular dependency.

### Where Business Logic Lives

Business logic placement follows a consistent pattern: **validation lives in DRF serializers** (`validate_*` methods, cross-field `validate()`), **state transitions live in serializer `update()` / `create()` methods**, and **side effects (notifications, certificate generation) are dispatched via Celery tasks from serializers**. The chatbot flows contain input parsing and session orchestration but delegate final record creation to the same serializers used by the admin API. This is a strength — the warranty creation path is shared between WhatsApp and the admin panel, preventing divergent validation.

### Coupling Between Bot and Admin API

The coupling is **intentional and well-managed**. The `RegistrationFlow.handle_complete()` uses `WarrantyRegistrationCreateSerializer` directly, so bot-created registrations go through the same validation as admin-created ones. The resubmission flow is more tightly coupled: `warranty.tasks.send_registration_resubmit_notification` directly manipulates `WhatsAppSession` state (setting flow, current_step, session_data) — this is the tightest coupling point and could be fragile if session schema changes.

### API Contract Quality

The REST API uses DRF generics consistently (`ListCreateAPIView`, `RetrieveUpdateAPIView`), with separate serializers for list vs. detail vs. create vs. update — a clean pattern. Pagination uses a custom `PageNumberPagination`. Filtering uses `django_filters` with `filterset_fields` and `search_fields`. State transitions use an `action` field pattern (approve/reject/resubmit) rather than separate endpoints, which is reasonable for a small action set. Error shapes follow DRF defaults (400 with field-keyed errors). Versioning is URL-based (`/api/v1/`).

### Async Processing

Celery is used appropriately — email notifications, PDF generation, and WhatsApp follow-up messages are all async tasks. The `dispatch()` function uses a **deferred side-effect pattern** (`DeferredWhatsAppClient` + `collect_dispatch_side_effects`) to accumulate WhatsApp API calls during the transaction and execute them after commit. This is well-engineered and prevents partial side effects on rollback.

**One architectural concern:** The `dispatch()` function runs synchronously inside the webhook POST handler. If the dispatcher takes >5 seconds (e.g., slow DB, slow `select_for_update` lock contention), Meta will retry the webhook, and the `ProcessedMessage` deduplication will catch it — but the webhook response will be delayed. For high throughput, this should move to a Celery task, but at current scale this is likely fine.

### Production Deployment Gap (ARCH-01, ARCH-02)

The **most significant architectural issue** is that the production Docker Compose runs **Gunicorn with WSGI** (`config.wsgi:application` with `gthread` worker class), while the application defines ASGI routing for WebSockets. The Nginx config has no WebSocket upgrade headers. This means **real-time complaint chat via WebSockets does not work in production**. The stage environment reportedly uses Daphne/Uvicorn, but the prod compose does not reflect this.

---

## Security Findings

### WhatsApp Integration Security

#### WA-01 — Missing Webhook Signature Verification
- **Severity:** Critical
- **Category:** WhatsApp Integration
- **Label:** FACT
- **File:** [chatbot/api/v1/views.py:37](dulux_chatbot/chatbot/api/v1/views.py#L37) (POST handler)
- **Risk:** Any internet client can forge webhook payloads, injecting fake messages that trigger warranty registrations, claim flows, or complaint conversations. An attacker can impersonate any phone number.
- **Fix:** Verify `X-Hub-Signature-256` header using HMAC-SHA256 with your app secret before processing. Reject requests with invalid or missing signatures.

#### WA-02 — WhatsApp Access Token in Django Settings (Static)
- **Severity:** Low
- **Category:** WhatsApp Integration
- **Label:** INFERENCE
- **File:** [config/settings/base.py:208](config/settings/base.py#L208)
- **Risk:** The access token is loaded once at startup from env vars. If the token is rotated (Meta expires system user tokens), the application must be restarted. Infisical may handle rotation, but the app doesn't reload dynamically. Low risk — mostly operational.

### Django Security Posture

#### SEC-01 — CORS Allows All Origins
- **Severity:** High
- **Category:** Django Security
- **Label:** FACT
- **File:** [config/settings/base.py:242](config/settings/base.py#L242)
- **Risk:** `CORS_ALLOW_ALL_ORIGINS = True` is set in base settings and not overridden in prod or stage. Combined with JWT auth (where tokens are sent in `Authorization` header), any malicious website can make authenticated API requests on behalf of a logged-in admin user via CSRF-like attacks. With `JWT_AUTH_HTTPONLY=True`, refresh tokens are in httponly cookies — CORS bypass enables token refresh from any origin.
- **Fix:** Set `CORS_ALLOWED_ORIGINS` to the actual React panel URL(s) in prod/stage settings. Remove `CORS_ALLOW_ALL_ORIGINS` from base.

#### SEC-02 — Missing Security Headers in Production
- **Severity:** High
- **Category:** Django Security
- **Label:** FACT
- **File:** [config/settings/prod.py:6](config/settings/prod.py#L6)
- **Risk:** Production settings are missing `SECURE_PROXY_SSL_HEADER` (stage has it), `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`. Without `SECURE_PROXY_SSL_HEADER`, Django doesn't know it's behind HTTPS via Nginx, which can cause CSRF token mismatches and `request.is_secure()` returning False.
- **Fix:** Add all standard production security settings to `prod.py`.

#### SEC-03 — Image Upload Missing Content-Type Validation
- **Severity:** Medium
- **Category:** File Upload Security
- **Label:** FACT
- **File:** [core/api/v1/serializers.py:12](dulux_chatbot/core/api/v1/serializers.py#L12)
- **Risk:** The `ImageUploadAPIView` validates only file size. Django's `ImageField` does validate that the file is a valid image (via Pillow), which mitigates the worst cases. However, SVG files with embedded JavaScript would pass through if Pillow accepts them (it doesn't by default — so practical risk is low). The bigger gap is that filenames aren't sanitized.
- **Fix:** Add MIME type allowlist validation. Django's `ImageField` provides baseline protection, but explicit validation is defense-in-depth.

#### SEC-04 — Flower Dashboard Exposed Without Auth
- **Severity:** High
- **Category:** Infrastructure Security
- **Label:** FACT
- **File:** [config/nginx/prod.conf:31](config/nginx/prod.conf#L31)
- **Risk:** Flower is proxied at `/flower` without any authentication in Nginx. The `.env.example` has `FLOWER_USERNAME` and `FLOWER_PASSWORD`, suggesting Flower's built-in auth may be configured — but the Nginx config doesn't enforce it. Flower exposes task arguments (which contain registration IDs, phone numbers, email content), worker status, and task history.
- **Fix:** Add `auth_basic` in Nginx, or configure `--basic-auth` in Flower's command, or restrict to VPN.

#### SEC-05 — WhatsApp Media Download Without Size Limit
- **Severity:** Medium
- **Category:** WhatsApp Integration
- **Label:** FACT
- **File:** [chatbot/flows/base.py:122](dulux_chatbot/chatbot/flows/base.py#L122)
- **Risk:** `_save_media_image()` downloads media from WhatsApp without checking Content-Length. A very large file could exhaust memory. In practice, WhatsApp limits media to 16MB for images and 100MB for documents, so the realistic ceiling is bounded by WhatsApp's own limits.
- **Fix:** Check `metadata.get("file_size")` before downloading and reject files over the configured limit.

#### SEC-06 — Unsanitized HTML in Email Notifications
- **Severity:** High
- **Category:** Application Security
- **Label:** FACT
- **File:** [warranty/tasks.py:86](dulux_chatbot/warranty/tasks.py#L86) (registration) and [warranty/tasks.py:140](dulux_chatbot/warranty/tasks.py#L140) (claim)
- **Risk:** `notification_template` is raw HTML passed from the frontend admin panel through the API, stored in a Celery task argument, and sent directly to customers via email. A compromised or malicious admin account can inject arbitrary HTML — phishing links, tracking pixels, or JavaScript (in email clients that render it). The HTML is also stripped to plaintext via regex for the text alternative, but the HTML body is sent as-is.
- **Fix:** Sanitize HTML with `nh3` (recommended over deprecated `bleach`) before sending, or use server-side Jinja/Django templates with variable substitution only.

#### SEC-07 — Registration Detail Readable by Any Authenticated User
- **Severity:** Medium
- **Category:** Access Control
- **Label:** FACT
- **File:** [warranty/api/v1/views.py:167](dulux_chatbot/warranty/api/v1/views.py#L167)
- **Risk:** `WarrantyRegistrationRetrieveUpdateAPIView` GET requires only `IsAuthenticated` — no role check. A `QUALITY_REVIEWER` (who should only see claims) can read any registration's full customer PII. The list endpoint is protected by `IsCSAgentOrAdmin`, but the detail endpoint is not.
- **Fix:** Add `IsCSAgentOrAdmin` to the read path, or use `get_permissions()` to apply it for all methods.

#### SEC-08 — No Object-Level Permission on Complaint Chat WebSocket
- **Severity:** Medium
- **Category:** Access Control
- **Label:** FACT
- **File:** [complaints/consumers.py:75](dulux_chatbot/complaints/consumers.py#L75)
- **Risk:** Any authenticated user with `COMPLAINT_WEBSOCKET_ALLOWED_ROLES` can connect to any complaint's chat WebSocket and send messages. There's no check that the complaint is assigned to the connecting agent. In a multi-agent environment, this means agents can read/write each other's complaint conversations.
- **Fix:** Check `complaint.assigned_to == self.user` on connect (or allow ADMIN override).

#### SEC-09 — Predictable Registration Codes
- **Severity:** Low
- **Category:** Application Security
- **Label:** FACT
- **File:** [warranty/helpers.py:7](dulux_chatbot/warranty/helpers.py#L7)
- **Risk:** `random.choices(string.digits, k=10)` uses Python's Mersenne Twister PRNG. Registration codes are used in customer-facing communications and could serve as lookup tokens. An attacker who observes several codes could predict future ones. Practical exploitation risk is low since codes require authentication to act on.
- **Fix:** Use `secrets.choice()` for cryptographic randomness.

#### SEC-10 — Dual WebSocket Auth is Confusing
- **Severity:** Medium
- **Category:** WebSocket Security
- **Label:** FACT
- **File:** [config/asgi.py:15](config/asgi.py#L15)
- **Risk:** `AuthMiddlewareStack` (Django session auth) wraps the WebSocket router, but consumers manually parse JWT from query strings. The middleware and consumer auth are independent — neither knows about the other. JWT tokens in query strings are logged in server access logs and appear in browser history. This isn't a vulnerability per se, but it's a maintenance hazard.
- **Fix:** Remove `AuthMiddlewareStack` and use a custom `TokenAuthMiddleware` that parses JWT and sets `scope["user"]`, so consumers don't need manual auth logic.

### Customer PII

#### PII-01 — Sentry Receives Full PII
- **Severity:** High
- **Category:** Privacy
- **Label:** FACT
- **File:** [config/settings/sentry.py:21](config/settings/sentry.py#L21)
- **Risk:** `send_default_pii=True` sends user IPs, authenticated user emails, and full request bodies to Sentry. Request bodies on warranty endpoints contain customer names, phone numbers, addresses, purchase dates, and email addresses. This PII is stored in a third-party cloud service, potentially violating Pakistan's data protection expectations.
- **Fix:** Set `send_default_pii=False`. Use `before_send` callback to scrub sensitive fields if error context is needed.

#### PII-02 — Response Bodies Logged with PII
- **Severity:** Medium
- **Category:** Privacy
- **Label:** FACT
- **File:** [core/middleware/logging.py:34](dulux_chatbot/core/middleware/logging.py#L34)
- **Risk:** `LoggingMiddleware` logs truncated (2048 chars) JSON response bodies to the log file. API responses from warranty/complaint endpoints contain customer names, phone numbers, emails, and addresses. These are written to `debug.log` on the filesystem and console output (which may be captured by Docker/NewRelic).
- **Fix:** Exclude PII-heavy endpoints from body logging, or redact known sensitive fields before logging.

### Warranty / Claim Business Logic Integrity

#### DATA-01 — No Self-Approval Prevention
- **Severity:** Medium
- **Category:** Business Logic
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:318](dulux_chatbot/warranty/api/v1/serializers.py#L318) (registration), [warranty/api/v1/serializers.py:700](dulux_chatbot/warranty/api/v1/serializers.py#L700) (claim)
- **Risk:** A CS_AGENT or ADMIN can create a registration via the admin panel and then approve it themselves. There's no check that `approved_by != creator`. The audit log captures who approved, but there's no enforcement. For warranty programs with financial implications, this is a fraud vector.
- **Fix:** Add validation in the update serializer: `if action == APPROVE and instance was created by the same user, reject`.

#### DATA-02 — Resubmit Notification Overwrites Active Session
- **Severity:** Medium
- **Category:** Business Logic
- **Label:** FACT
- **File:** [warranty/tasks.py:196](dulux_chatbot/warranty/tasks.py#L196) (registration), [warranty/tasks.py:268](dulux_chatbot/warranty/tasks.py#L268) (claim)
- **Risk:** When a CS agent triggers resubmission, the Celery task overwrites the customer's `WhatsAppSession` (flow, current_step, session_data) regardless of what the customer is currently doing. If the customer is mid-way through a different flow (e.g., filing a claim), their progress is silently lost.
- **Fix:** Check `session.flow` before overwriting. If the session is active in another flow, queue the resubmit prompt or notify the customer that they need to complete/cancel their current flow first.

### Operational

#### OPS-01 — Sentry 100% Trace Sampling in Production
- **Severity:** Medium
- **Category:** Observability
- **Label:** LIKELY (depends on whether this config is used in prod)
- **File:** [config/settings/sentry.py:18](config/settings/sentry.py#L18)
- **Risk:** `traces_sample_rate=1.0` captures every transaction. Under load this creates significant network overhead, increases Sentry costs, and adds latency to every request. Sentry themselves recommend 0.1-0.2 for production.
- **Fix:** Set `traces_sample_rate` to 0.1 or make it configurable via env var.

#### OPS-02 — Celery Tasks Lack Retry and Timeout Configuration
- **Severity:** Medium
- **Category:** Reliability
- **Label:** FACT
- **File:** [warranty/tasks.py:30](dulux_chatbot/warranty/tasks.py#L30) and all `@shared_task` in the file
- **Risk:** All Celery tasks use bare `@shared_task` with no `max_retries`, `default_retry_delay`, or `time_limit`. If the WhatsApp API, email service, or database is temporarily down, tasks fail permanently with no retry. Certificate generation has no timeout — a malformed registration could cause ReportLab to hang indefinitely, blocking the worker.
- **Fix:** Add `bind=True, max_retries=3, default_retry_delay=60, time_limit=120` to all tasks. Add `self.retry(exc=exc)` in exception handlers.

### Architecture Findings

#### ARCH-01 — Production Runs WSGI, Not ASGI
- **Severity:** High
- **Category:** Architecture / Deployment
- **Label:** FACT
- **File:** [docker-compose.prod.yml:58](docker-compose.prod.yml#L58)
- **Risk:** Gunicorn with `gthread` runs WSGI. WebSocket connections require ASGI (Daphne/Uvicorn). The complaint live-chat feature (real-time WebSockets) does not work in the production deployment.
- **Fix:** Either add a separate Daphne service for WebSocket traffic, or switch Django to `uvicorn config.asgi:application --ws websockets` with appropriate worker configuration.

#### ARCH-02 — Nginx Missing WebSocket Proxy Config
- **Severity:** Medium
- **Category:** Architecture / Deployment
- **Label:** FACT
- **File:** [config/nginx/prod.conf:49](config/nginx/prod.conf#L49)
- **Risk:** No `location /ws/` block with `proxy_http_version 1.1`, `Upgrade`, and `Connection` headers. Even if an ASGI server were added, Nginx wouldn't proxy WebSocket upgrade requests correctly.
- **Fix:** Add a dedicated `/ws/` location block with WebSocket proxy headers pointing to the ASGI server.

---

## New Questions Raised

1. **Is the stage deployment actively using WebSockets?** If complaints/live chat is being tested on stage, how is the ASGI server configured there? The `docker-compose.stage.yml` may have the correct setup that prod is missing.

2. **Flower authentication:** The `.env.example` has `FLOWER_USERNAME` and `FLOWER_PASSWORD`. Is Flower's `--basic-auth` flag actually passed in the prod compose command? The current command does not include it.

3. **Admin site (`/admin/`):** The Django admin is mounted at `/admin/` with no additional hardening visible (no MFA, no IP restriction, no rate limiting). Is it intentionally exposed, or should it be restricted?

4. **Duplicate registration by same phone number:** A customer can submit multiple warranty registrations for the same phone number. There's no `unique_together` on `(phone_number, state=SUBMITTED)`. Is this intentional (e.g., different purchase dates)?

5. **Certificate reissuance abuse:** The reissuance flow lets a customer request a certificate reissue. Is there a limit on how many times they can request this? Could a malicious user flood the system with reissuance requests?

---

## Session 2 Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| WhatsApp Integration | 1 (WA-01) | — | 1 (SEC-05) | 1 (WA-02) |
| Django Security | — | 3 (SEC-01, SEC-02, SEC-04) | 1 (SEC-03) | — |
| Application Security | — | 1 (SEC-06) | 2 (SEC-07, SEC-08) | 1 (SEC-09) |
| WebSocket Security | — | — | 1 (SEC-10) | — |
| Privacy / PII | — | 1 (PII-01) | 1 (PII-02) | — |
| Business Logic | — | — | 2 (DATA-01, DATA-02) | — |
| Architecture | — | 1 (ARCH-01) | 1 (ARCH-02) | — |
| Operational | — | — | 2 (OPS-01, OPS-02) | — |
| **Total** | **1** | **6** | **11** | **2** |

---

## TODO Insertion Summary

**TODOs inserted this session:** 22 comment blocks across 15 unique finding IDs (SEC-06, DATA-01, DATA-02 each have 2 locations)

**Files modified (TODO insertions only):**
1. `dulux_chatbot/chatbot/api/v1/views.py` — WA-01
2. `config/settings/base.py` — SEC-01
3. `config/settings/sentry.py` — PII-01, OPS-01
4. `config/settings/prod.py` — SEC-02
5. `dulux_chatbot/core/api/v1/serializers.py` — SEC-03
6. `dulux_chatbot/core/middleware/logging.py` — PII-02
7. `config/nginx/prod.conf` — SEC-04, ARCH-02
8. `docker-compose.prod.yml` — ARCH-01
9. `dulux_chatbot/chatbot/flows/base.py` — SEC-05
10. `dulux_chatbot/warranty/tasks.py` — SEC-06 (x2), DATA-02 (x2), OPS-02
11. `dulux_chatbot/warranty/api/v1/serializers.py` — DATA-01 (x2)
12. `dulux_chatbot/warranty/api/v1/views.py` — SEC-07
13. `dulux_chatbot/complaints/consumers.py` — SEC-08
14. `dulux_chatbot/warranty/helpers.py` — SEC-09
15. `config/asgi.py` — SEC-10

**Confirmation: No logic was changed.** All modifications are comment-only TODO annotations.

**Findings with TODOs:** 15 unique IDs with 22 TODO comment blocks (3 IDs appear at 2 locations each)
**Findings without TODOs:** 1 (WA-02 is Low/inference — informational only; no specific code location warrants a TODO since it's about operational token rotation)

---

# Session 3 — App: warranty

**Date:** 2026-04-19
**Scope:** `dulux_chatbot.warranty` app deep dive — models, serializers, views, tasks, services, tests, management commands
**Auditor:** Claude Opus 4.6 (automated)

---

## Data Layer

### DATA-03 — Audit Snapshot Functions Fire Unoptimized Queries Inside Transactions
- **Severity:** Medium
- **Category:** Query Performance
- **Label:** FACT
- **File:** [warranty/audit.py:8](dulux_chatbot/warranty/audit.py#L8) (registration), [warranty/audit.py:31](dulux_chatbot/warranty/audit.py#L31) (claim)
- **Risk:** `build_registration_snapshot()` issues 3 queries (paint_pairs, invoices, rejection_fields). `build_claim_snapshot()` issues 4+ queries (images, quality_reviews, resubmissions with nested entries prefetch). Each is called **twice** per update (before_data + after_data) inside `@transaction.atomic`. That's 6-8 extra queries per registration update and 8-10 per claim update, all while holding a database transaction. The view querysets already prefetch these relations but the snapshot functions re-query from scratch.
- **Fix:** Accept the prefetched instance and iterate over cached relations instead of re-querying. Or defer `after_data` snapshot to after `super().update()` returns, using the already-prefetched instance.

### DATA-04 — Delete-Then-Recreate Pattern for Invoices
- **Severity:** Medium
- **Category:** Data Integrity
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:309](dulux_chatbot/warranty/api/v1/serializers.py#L309) (create), [warranty/api/v1/serializers.py:492](dulux_chatbot/warranty/api/v1/serializers.py#L492) (update)
- **Risk:** `_sync_paint_pair_invoices` does `registration.invoices.all().delete()` followed by `bulk_create`. On update, this destroys all existing `PaintPairInvoice` records and creates new ones with new PKs. Audit log snapshots that reference old invoice IDs become orphan references. The `Image` records are left intact (PROTECT on FK), but the `PaintPairInvoice` join records are lost. On create, the delete is a harmless no-op, but the same method is used for both create and update paths.
- **Fix:** For updates, diff incoming invoices against existing ones — only delete removed invoices and create new ones. For create, skip the delete call entirely.

### DATA-05 — SSRF Risk in Historical Import Commands
- **Severity:** Low
- **Category:** Data Import
- **Label:** FACT
- **File:** [warranty/management/commands/import_historical_warranty_registrations.py:301](dulux_chatbot/warranty/management/commands/import_historical_warranty_registrations.py#L301)
- **Risk:** The `--download-invoices` flag fetches URLs from CSV without host/scheme validation. A malicious CSV could target internal network addresses. Practical risk is low since this is an admin-only management command, not API-exposed.
- **Fix:** Validate URL scheme (https only) and reject private IP ranges if the command is reused.

### DATA-06 — Unnecessary Prefetches on List Endpoint
- **Severity:** Medium
- **Category:** Query Performance
- **Label:** FACT
- **File:** [warranty/api/v1/views.py:163](dulux_chatbot/warranty/api/v1/views.py#L163)
- **Risk:** `WarrantyRegistrationListCreateAPIView` prefetches `paint_pairs__topcoat`, `paint_pairs__basecoat`, `invoices__image`, and `rejection_fields` for every registration in the page. But `WarrantyRegistrationListSerializer` only uses top-level scalar fields — none of the prefetched relations. This wastes 3-4 additional queries per list page. At scale (thousands of registrations), this adds unnecessary database load.
- **Fix:** Override `get_queryset()` to conditionally prefetch only for POST (create) or use separate querysets for list vs create.

### DATA-07 — No Race Condition Protection on Claim State Transitions via PATCH
- **Severity:** Medium
- **Category:** Concurrency
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:721](dulux_chatbot/warranty/api/v1/serializers.py#L721) (WarrantyClaimUpdateSerializer.validate)
- **Risk:** The claim `validate()` method checks `current_state not in ALLOWED_TRANSITIONS[action]` but uses the state from the model instance loaded at request time. If two CS agents simultaneously approve a claim (one APPROVE from QA_APPROVED, one REJECT from QA_REJECTED), there is a TOCTOU race: both read the old state, both pass validation, and the last write wins. Unlike the chatbot dispatcher (which uses `select_for_update`), the admin API views do not lock the row.
- **Fix:** Use `select_for_update()` on `get_object()` for state-changing PATCH operations, or add a `state` field to the update payload and use `WarrantyClaim.objects.filter(pk=pk, state=expected_state).update(state=new_state)` with a row-count check.

### DATA-08 — Registration State Machine Allows Direct Approve from RESUBMIT
- **Severity:** Low
- **Category:** Business Logic
- **Label:** QUESTION
- **File:** [warranty/constants.py:44](dulux_chatbot/warranty/constants.py#L44)
- **Risk:** `REGISTRATION_ACTION_ALLOWED_TRANSITIONS[APPROVE]` includes `RegistrationState.RESUBMIT`. This means a CS agent can approve a registration that was flagged for resubmission without the customer actually resubmitting. This may be intentional (agent override), but it allows bypassing the resubmission review process. Worth confirming.

---

## Error Handling & Observability

### ERR-01 — Email Failure Blocks WhatsApp Notification Delivery
- **Severity:** Medium
- **Category:** Error Handling
- **Label:** FACT
- **File:** [warranty/tasks.py:109](dulux_chatbot/warranty/tasks.py#L109)
- **Risk:** `send_registration_status_notification` calls `email.send(fail_silently=False)` before the WhatsApp notification code. If Brevo SMTP is down, the exception kills the entire task — the customer never receives the WhatsApp message or certificate document either. Same pattern in `send_claim_status_notification`.
- **Fix:** Wrap email send in try/except, log the error, and continue with WhatsApp delivery. Or split into two separate Celery tasks (one for email, one for WhatsApp).

### ERR-02 — No Error Handling Around PDF Certificate Generation
- **Severity:** Medium
- **Category:** Error Handling
- **Label:** FACT
- **File:** [warranty/services/certificate.py:279](dulux_chatbot/warranty/services/certificate.py#L279)
- **Risk:** `generate_warranty_certificate()` uses ReportLab to build PDFs with external image assets (`CERTIFICATE_PAGE_ONE_HEADER_IMAGE`). If the image file is missing, corrupted, or if customer data causes a layout overflow, ReportLab raises an unhandled exception that kills the Celery task. The certificate has graceful fallbacks for missing images (checks `.exists()`), but other failures (e.g., extremely long customer names, invalid characters in PDF text) are not caught.
- **Fix:** Wrap the generation in try/except at the task level. On failure, log the error with registration context and either retry or create the registration without a certificate, notifying an admin.

### ERR-03 — Audit Log Creation Silently Skipped for Bot-Created Registrations
- **Severity:** Low
- **Category:** Observability
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:286](dulux_chatbot/warranty/api/v1/serializers.py#L286) (`get_optional_actor`)
- **Risk:** When registrations are created via the chatbot flow (no HTTP request context), `get_optional_actor()` returns `None` because there's no `request.user`. The `create_audit_log()` function short-circuits: `if actor is None: return None`. This means bot-created registrations have **no audit log entry**. The audit trail only starts when a CS agent first touches the registration.
- **Fix:** For bot-created registrations, either use a system user as the actor, or create a separate "system" audit action that doesn't require an authenticated user.

---

## Testing

### TEST-01 — Missing Coverage on Critical State Machine Paths
- **Severity:** Medium
- **Category:** Testing
- **Label:** FACT
- **File:** [warranty/tests/test_api.py:41](dulux_chatbot/warranty/tests/test_api.py#L41)
- **Risk:** The test suite covers the happy paths well (approve, reject, resubmit, QA decisions), but has significant gaps:

  **Not tested — Registration state machine:**
  - Invalid transitions are not tested (e.g., APPROVED -> APPROVE should fail; REJECTED -> APPROVE should fail)
  - Approving from RESUBMIT state (allowed by constants) is not tested
  - IN_PROGRESS -> REJECT/RESUBMIT transitions are not tested

  **Not tested — Claim state machine:**
  - SUBMITTED -> APPROVE (should fail — must go through QA first)
  - IN_REVIEW -> APPROVE (should fail)
  - APPROVED -> any action (should fail — terminal state)
  - Duplicate claim creation for rejected paint pairs (REJECTED is not in CLAIM_BLOCKING_STATES — is this intentional?)

  **Not tested — Cross-cutting:**
  - AuditLog creation is never asserted (all notification tasks are mocked)
  - No `assertNumQueries` on list endpoints
  - No concurrent access tests (two agents acting on same registration simultaneously)
  - Certificate generation integration with notification task (mocked away in all tests)

### TEST-02 — No Tests for Management Commands
- **Severity:** Low
- **Category:** Testing
- **Label:** FACT
- **File:** (missing — no test file for management commands)
- **Risk:** The `import_historical_warranty_registrations` and `import_historical_warranty_claims` commands have no tests. These commands create products, registrations, paint pairs, invoices, and certificates. A regression could corrupt production data during a data migration. Since these are one-time import commands, the practical risk is low going forward, but if they need to be rerun, there's no safety net.

---

## Code Quality

### QUAL-01 — Duplicated Purchase Date Validation
- **Severity:** Low
- **Category:** Code Quality
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:267](dulux_chatbot/warranty/api/v1/serializers.py#L267)
- **Risk:** `WarrantyRegistrationCreateSerializer` inherits `RegistrationValidationMixin` (which has `validate_purchase_date` delegating to `validate_registration_purchase_date`) but then overrides `validate_purchase_date` with nearly identical inline code. The mixin's version is never called on create. This means a future change to the shared validator won't affect the create path. Low risk since both implementations are identical today.

### QUAL-02 — Inconsistent `validate_phone_number` Reference
- **Severity:** Low
- **Category:** Code Quality
- **Label:** FACT
- **File:** [warranty/api/v1/serializers.py:274](dulux_chatbot/warranty/api/v1/serializers.py#L274)
- **Risk:** `WarrantyRegistrationCreateSerializer.validate_phone_number` calls `validate_pakistan_phone_number(value)` — but `validate_pakistan_phone_number` is not imported in this file. The import at the top is for `validate_registration_phone_number` (from `warranty.validators`), which itself delegates to `validate_pakistan_phone_number` (from `core.validators`). The create serializer bypasses the warranty-level indirection and calls the core function directly. This will cause a `NameError` at runtime if the create serializer's `validate_phone_number` is actually invoked.

  **UPDATE:** On closer inspection, `validate_pakistan_phone_number` is NOT imported in the serializers file. The only phone validator import is `validate_registration_phone_number`. This means `validate_phone_number` on the create serializer would raise `NameError: name 'validate_pakistan_phone_number' is not defined` at runtime if a phone number is submitted.

### QUAL-03 — Management Commands Share Duplicated Helper Methods
- **Severity:** Low
- **Category:** Code Quality
- **Label:** FACT
- **File:** Both management commands
- **Risk:** `_json_list`, `_parse_timestamp_ms`, `_read_rows`, `_build_product_lookup`, `_required`, `_download_*_image` are nearly identical between the two commands. Not a runtime risk, but a maintenance burden if the parsing logic needs to change.

---

## Cross-App Observations

1. **Chatbot → warranty coupling in resubmission:** `warranty.tasks.send_registration_resubmit_notification` directly manipulates `WhatsAppSession` fields (flow, current_step, session_data) and calls `RegistrationFlow.send_prompt()`. This creates tight coupling — if the chatbot session schema changes, the warranty task breaks silently.

2. **Audit log service pattern:** The `audit_logs.services` module provides a clean abstraction (`log_create`, `log_update`). However, the warranty serializers call snapshot builders that re-query relations already prefetched by views. The snapshot should accept an already-loaded instance rather than re-querying.

3. **`ClaimImage` unique constraint:** The `unique_together = [("claim", "photo_type")]` constraint limits each claim to exactly 3 images (one per PhotoType). This is enforced at DB level — good. But the serializer only validates `len(value) < MIN_CLAIM_PHOTOS`, not that exactly 3 unique types are provided. A user could submit 3 images all with `LONG_SHOT` and get a unique constraint violation at DB level instead of a clean validation error.

---

## Questions

1. **QUAL-02 / `validate_pakistan_phone_number` import:** Can you confirm whether the create serializer's `validate_phone_number` is actually called in production? If phone numbers are only submitted via WhatsApp (where `RegistrationFlow` handles validation), the serializer path may never trigger. But for WEBFORM-channel registrations created via the admin panel API, this would be a runtime error.

2. **DATA-08 / Approve from RESUBMIT:** Is it intentional that a CS agent can approve a registration directly from RESUBMIT state without waiting for the customer to resubmit? This allows bypassing the resubmission process entirely.

3. **`CLAIM_BLOCKING_STATES` does not include `REJECTED`:** A customer whose claim was REJECTED can immediately file a new claim for the same paint pair. Is this by design? It allows unlimited claim retries after rejection.

---

## Session 3 Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Data Layer | — | — | 4 (DATA-03, DATA-04, DATA-06, DATA-07) | 1 (DATA-05) |
| Error Handling | — | — | 2 (ERR-01, ERR-02) | 1 (ERR-03) |
| Testing | — | — | 1 (TEST-01) | 1 (TEST-02) |
| Code Quality | — | — | — | 3 (QUAL-01, QUAL-02, QUAL-03) |
| Business Logic | — | — | — | 1 (DATA-08 QUESTION) |
| **Total** | **0** | **0** | **7** | **7** |

---

## TODO Insertion Summary

**TODOs inserted this session:** 9 comment blocks across 8 unique finding IDs

**Files modified (TODO insertions only):**
1. `dulux_chatbot/warranty/audit.py` — DATA-03 (x2)
2. `dulux_chatbot/warranty/api/v1/serializers.py` — DATA-04, QUAL-01
3. `dulux_chatbot/warranty/api/v1/views.py` — DATA-06
4. `dulux_chatbot/warranty/tasks.py` — ERR-01
5. `dulux_chatbot/warranty/services/certificate.py` — ERR-02
6. `dulux_chatbot/warranty/tests/test_api.py` — TEST-01
7. `dulux_chatbot/warranty/management/commands/import_historical_warranty_registrations.py` — DATA-05

**Findings without TODOs:** 6 (DATA-07 is about missing `select_for_update` which is an architectural concern, not a specific line; DATA-08 is a QUESTION; ERR-03, TEST-02, QUAL-02, QUAL-03 are Low severity)

**Confirmation: No logic was changed.** All modifications are comment-only TODO annotations (Session 3).

---

# Session 4 — Operational Readiness

**Date:** 2026-04-20
**Scope:** Cross-cutting operational readiness — deployability, observability, compliance, performance
**Auditor:** Claude Opus 4.6 (automated)

## Clarifications Applied

- **DATA-08 (Approve from RESUBMIT):** Confirmed as required flow — resolved, not a finding.
- **CLAIM_BLOCKING_STATES excluding REJECTED:** By design — customers can re-file after rejection. Resolved.
- **Flower authentication:** `flowerconfig.py` does configure `basic_auth` via env vars (`FLOWER_USERNAME:FLOWER_PASSWORD`). Session 2 finding SEC-04 is partially mitigated — Flower itself requires credentials. Updated understanding.

---

## Deployability

### OPS-03 — Dockerfile Not Production-Hardened
- **Severity:** Medium
- **Category:** Deployment
- **Label:** FACT
- **File:** [Dockerfile:1](Dockerfile#L1)
- **Risk:** The Dockerfile runs as `root` (no `USER` directive), does not copy application code into the image (relies entirely on volume mounts — `./:/code`), has no `HEALTHCHECK`, no multi-stage build (dev dependencies in final image), and uses an unpinned base image (`python:3.10-bookworm`). Running as root means a container escape gives full host access. Volume-mount-only deployment means the image is not self-contained — it cannot be pushed to a registry and run on a different host without also deploying the source code.
- **Fix:** Add `USER`, `COPY . /code`, `HEALTHCHECK`, and pin the base image SHA.

### OPS-04 — NewRelic Agent Runs Privileged with Full Host Access
- **Severity:** High
- **Category:** Deployment Security
- **Label:** FACT
- **File:** [docker-compose.prod.yml:93](docker-compose.prod.yml#L93)
- **Risk:** `newrelic/infrastructure:latest` runs with `privileged: true`, `network_mode: host`, `pid: host`, and mounts the entire host filesystem (`/:/host:ro`) plus the Docker socket. This is the most privileged container in the stack. If the NewRelic image is compromised (pinned to `:latest` — no SHA), the attacker has immediate root access to the host, all other containers, and all secrets. The Docker socket mount allows spawning arbitrary containers.
- **Fix:** Pin to a specific image SHA. Consider the non-privileged agent mode. Or install the agent via host package instead of Docker.

### OPS-05 — GitHub Actions Pinned to Deprecated Versions
- **Severity:** Medium
- **Category:** CI/CD
- **Label:** FACT
- **File:** [.github/workflows/test-cases.yml:15](.github/workflows/test-cases.yml#L15)
- **Risk:** `actions/checkout@v2` and `actions/upload-artifact@v2` use Node 12, which GitHub has deprecated. Tests may silently stop running in CI.
- **Fix:** Update to `actions/checkout@v4` and `actions/upload-artifact@v4`.

### OPS-06 — PR Agent Pinned to @main
- **Severity:** Medium
- **Category:** CI/CD Supply Chain
- **Label:** FACT
- **File:** [.github/workflows/pr_agent.yml:22](.github/workflows/pr_agent.yml#L22)
- **Risk:** `qodo-ai/pr-agent@main` runs whatever is on the main branch of that external repo at invocation time, with `pull-requests: write` and `issues: write` permissions. A compromised upstream repo could modify PRs, post comments, or exfiltrate code.
- **Fix:** Pin to a specific commit SHA or release tag.

### OPS-07 — Missing Security Headers in Nginx
- **Severity:** Medium
- **Category:** Deployment
- **Label:** FACT
- **File:** [config/nginx/prod.conf:55](config/nginx/prod.conf#L55)
- **Risk:** No `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Strict-Transport-Security` headers.
- **Fix:** Add standard security headers to the Nginx `server` block.

### OPS-08 — No Migration Step in Production Deployment
- **Severity:** Medium
- **Category:** Deployment
- **Label:** FACT
- **File:** [scripts/docker-entrypoint.sh](scripts/docker-entrypoint.sh)
- **Risk:** The entrypoint only waits for Infisical secrets and runs `exec "$@"` — no `python manage.py migrate`. The Makefile has a `%.migrate` target suggesting manual execution. If forgotten, the app starts with an out-of-sync schema.
- **Fix:** Add `python manage.py migrate --noinput` to the entrypoint, or document the manual step clearly.

### OPS-09 — Prod Compose Missing Redis and PostgreSQL Services
- **Severity:** Medium
- **Category:** Deployment
- **Label:** INFERENCE
- **File:** [docker-compose.prod.yml](docker-compose.prod.yml)
- **Risk:** Unlike dev/stage, prod compose has no `postgres` or `redis` services — they're presumably external (RDS, ElastiCache). No documentation of external dependencies. No `depends_on` or wait-for-db logic. If external services are unreachable at startup, Gunicorn boots with failing DB connections.
- **Fix:** Document external service dependencies. Add wait-for-db startup logic.

### OPS-10 — Stage Has Daphne but Prod Does Not (Confirms ARCH-01)
- **Severity:** High
- **Category:** Deployment
- **Label:** FACT
- **File:** [docker-compose.stage.yml:76](docker-compose.stage.yml#L76) vs [docker-compose.prod.yml](docker-compose.prod.yml)
- **Risk:** Stage has a `daphne` service on port 8001 and Nginx routes `/ws/` to it with proper WebSocket upgrade headers. Prod has neither. WebSockets work on stage, broken in production. This is the known fix path for ARCH-01.
- **Fix:** Port the `daphne` service and `/ws/` Nginx location from stage to prod compose/nginx configs.

---

## Observability

### OBS-01 — No Structured Logging or Correlation IDs
- **Severity:** Medium
- **Category:** Observability
- **Label:** FACT
- **File:** [config/settings/base.py:165](config/settings/base.py#L165)
- **Risk:** Logging uses simple text format. No JSON structured logging, no correlation IDs. A WhatsApp message cannot be traced through webhook → dispatch → Celery task → WhatsApp send. In production with concurrent users, log lines interleave without grouping.
- **Fix:** Switch to JSON logging (`python-json-logger`). Add correlation ID middleware.

### OBS-02 — Sentry SDK Outdated (v1.6.0)
- **Severity:** Medium
- **Category:** Observability
- **Label:** FACT
- **File:** [config/requirements/prod.txt](config/requirements/prod.txt)
- **Risk:** `sentry-sdk==1.6.0` is from July 2022 (current: 2.x). Missing 3+ years of improvements, including better PII scrubbing controls and Django 4.2 compatibility.
- **Fix:** Upgrade to `sentry-sdk>=2.0`.

### OBS-03 — No Application-Level Metrics
- **Severity:** Low
- **Category:** Observability
- **Label:** FACT
- **Risk:** No Prometheus, StatsD, or custom metrics. Key operational signals (webhook latency, WhatsApp API success rate, queue depth, certificate generation time) are invisible. NewRelic provides infrastructure metrics but not application-specific business metrics.
- **Fix:** Add lightweight metrics instrumentation.

---

## Compliance & Privacy

### COMP-01 — No Data Deletion Mechanism
- **Severity:** Medium
- **Category:** Compliance
- **Label:** FACT
- **Risk:** Customer PII (names, phones, emails, addresses, purchase records, invoice photos, chat messages) is stored indefinitely with no retention policy or deletion path. Data is spread across `WarrantyRegistration`, `WarrantyClaim`, `Complaint`, `ChatMessage`, `WhatsAppSession`, `AuditLog`, plus S3 media. No management command, API, or admin action exists to delete a customer's data.
- **Fix:** Implement a data deletion management command that anonymizes/deletes all records for a given phone number, including cascaded records and S3 media.

### COMP-02 — Audit Trail Gaps
- **Severity:** Medium
- **Category:** Compliance
- **Label:** FACT
- **Risk:** Two audit trail gaps: (1) Bot-created registrations have no audit log (actor is None, see ERR-03). (2) Complaint status changes are not audit-logged — only warranty registrations and claims have audit logging. For a warranty program with potential disputes, complete audit trail coverage is important.
- **Fix:** Add audit logging to complaint status transitions. Use a system user for bot-initiated actions.

### PII-03 — Customer PII in Celery Task Arguments
- **Severity:** Medium
- **Category:** Privacy
- **Label:** FACT
- **Risk:** `notification_template` (raw HTML with customer name) is passed as a Celery task argument. Task arguments are stored in `django_celery_results` database table and visible in Flower. This creates a PII storage location outside the primary data model, not covered by any deletion mechanism.
- **Fix:** Pass only registration/claim ID to tasks. Construct notification content inside the task.

---

## Performance Risk Surface

### PERF-01 — Webhook Handler Runs Synchronously
- **Severity:** Medium
- **Category:** Performance
- **Label:** FACT
- **File:** [chatbot/api/v1/views.py:38](dulux_chatbot/chatbot/api/v1/views.py#L38)
- **Risk:** Webhook POST calls `dispatch()` synchronously — acquires `select_for_update` lock, runs flow handler, executes deferred WhatsApp API calls. If DB is slow or lock contention is high, Meta times out (20s) and retries. ProcessedMessage deduplication handles retries, but response is delayed.
- **Fix:** At current scale, acceptable. Monitor webhook response latency. If P95 exceeds 5s, defer to Celery.

### PERF-02 — Dashboard Analytics Fires Many Sequential Queries
- **Severity:** Low
- **Category:** Performance
- **Label:** FACT
- **File:** [users/api/v1/views.py:169](dulux_chatbot/users/api/v1/views.py#L169)
- **Risk:** 10+ separate COUNT queries for workload stats, mitigated by 60-second cache. Admin panel has few concurrent users.
- **Fix:** Already mitigated. Could consolidate if needed.

---

## Dependency Observations

### DEP-01 — Outdated Dependencies with Known Issues
- **Severity:** Medium
- **Category:** Dependencies
- **Label:** FACT
- **Risk:** Several significantly outdated dependencies:
  - `sentry-sdk==1.6.0` — 3+ years old
  - `gunicorn==20.1.0` — 3+ years old
  - `celery==5.2.7` — 2+ years old
  - `cryptography==41.0.7` — multiple CVEs fixed in later versions
  - `django==4.2.6` — LTS but not on latest security patch (4.2.21)
  - `nginx:1.20.1` in prod compose — 4 years old, EOL, known CVEs
- **Fix:** Prioritize `cryptography`, `django`, `nginx` updates. Create update schedule.

### DEP-02 — Unused Dependency: django-fsm
- **Severity:** Low
- **Category:** Dependencies
- **Label:** FACT
- **Risk:** `django-fsm==2.8.1` in requirements but never imported. State machines are implemented manually. Dead dependency adds to image size and attack surface.
- **Fix:** Remove from requirements.

---

## Questions

1. **Redis authentication:** Is Redis protected with a password in production? The `.env.example` URL is `redis://redis:6379` (no auth). If network-accessible, any client can read/write session data, cached content, and Celery task queues.

2. **Backup strategy:** Is PostgreSQL backed up? RPO/RTO? Are S3 media files versioned? Certificate PDFs and invoice images are customer artifacts that need recovery.

3. **Deployment rollback:** What's the rollback procedure for a bad deploy? Volume-mount approach means rollback = git revert + restart, but no documented procedure.

4. **Media URL access control:** In production, are S3 URLs pre-signed (time-limited) or publicly accessible? Invoice images and certificates contain PII and should not be publicly accessible via guessable URLs.

---

## Session 4 Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Deployment | — | 2 (OPS-04, OPS-10) | 5 (OPS-03, OPS-05, OPS-07, OPS-08, OPS-09) | — |
| CI/CD | — | — | 1 (OPS-06) | — |
| Observability | — | — | 2 (OBS-01, OBS-02) | 1 (OBS-03) |
| Compliance | — | — | 2 (COMP-01, COMP-02) | — |
| Privacy | — | — | 1 (PII-03) | — |
| Performance | — | — | 1 (PERF-01) | 1 (PERF-02) |
| Dependencies | — | — | 1 (DEP-01) | 1 (DEP-02) |
| **Total** | **0** | **2** | **13** | **3** |

---

## TODO Insertion Summary

**TODOs inserted this session:** 7 comment blocks across 7 unique finding IDs

**Files modified (TODO insertions only):**
1. `Dockerfile` — OPS-03
2. `docker-compose.prod.yml` — OPS-04
3. `.github/workflows/test-cases.yml` — OPS-05
4. `.github/workflows/pr_agent.yml` — OPS-06
5. `config/nginx/prod.conf` — OPS-07
6. `config/settings/base.py` — OBS-01
7. `dulux_chatbot/chatbot/api/v1/views.py` — PERF-01

**Findings without TODOs:** 11 (OPS-08, OPS-09, OPS-10 are deployment topology issues; OBS-02, OBS-03, DEP-01, DEP-02 are dependency/config-level; COMP-01, COMP-02 are missing features; PII-03 is task argument design; PERF-02 is Low)

**Confirmation: No logic was changed.** All modifications are comment-only TODO annotations (Session 4).
