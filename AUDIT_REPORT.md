# Dulux.pk Chatbot — Backend Code Audit Report

**Date:** 2026-04-20
**Auditor:** Claude Opus 4.6 (automated), supervised by Talha Soman
**Audit branch:** `code-audit-2`
**Audit sessions:** 5 (April 17–20, 2026)

---

## 1. Scope

This audit covers the **Django backend only**: Python application code, WhatsApp Cloud API integration, data models and migrations, DRF REST API, Celery task processing, Django Channels WebSocket consumers, deployment configuration (Docker, Nginx, CI/CD), and operational infrastructure (Sentry, NewRelic, Infisical). The **React admin panel** (frontend) was explicitly **out of scope** and was not opened, read, or assessed. A production-ready verdict on the backend does not certify the end-to-end product — the frontend, its API consumption patterns, and client-side security would require a separate audit.

---

## 2. Executive Summary

### Verdict: READY WITH CONDITIONS

The backend is architecturally sound, well-organized, and demonstrates several genuinely strong engineering decisions — particularly the deferred side-effect pattern in the webhook dispatcher, the shared serializer path between WhatsApp and admin flows, and the comprehensive warranty state machine with audit logging. The developer has built a system that handles a complex multi-step warranty program with appropriate separation of concerns.

However, the backend is **not production-ready in its current state** due to the following gaps:

- **The webhook is open to forgery.** Any internet client can inject fake WhatsApp messages — creating bogus warranty registrations, impersonating customers, or triggering complaint flows. This is the single highest-priority fix. *(WA-01, Critical)*

- **Customer notification emails can carry injected HTML.** Admin panel users pass raw HTML that is sent directly to customers, creating a phishing and brand-reputation risk for Dulux Pakistan. *(SEC-06, High)*

- **Real-time complaint chat does not work in production.** The production deployment runs WSGI (Gunicorn), but WebSockets require ASGI. Stage has the correct Daphne setup; production does not. *(ARCH-01 + OPS-10, High)*

- **CORS allows all origins.** Any website can make authenticated API requests on behalf of logged-in admin users. *(SEC-01, High)*

- **Customer PII is sent to Sentry unredacted.** Names, phone numbers, addresses, and emails in request bodies are transmitted to a third-party cloud service. *(PII-01, High)*

**Estimated effort to close Critical + High gaps:** 2–3 person-days for a developer familiar with the codebase. The fixes are straightforward — the architecture doesn't need rearchitecting, just hardening.

---

## 3. Production-Readiness Scorecard

| # | Dimension | Rating | Justification |
|---|-----------|--------|---------------|
| 1 | **Correctness** | CONCERNS | QUAL-02: `validate_phone_number` on admin-panel create path references an unimported function — `NameError` at runtime. State machine transitions are well-defined but lack `select_for_update` on the admin API path (DATA-07). |
| 2 | **Security** | FAIL | WA-01 (Critical): no webhook signature verification. SEC-01 (High): CORS wildcard. SEC-02 (High): missing Django security settings in prod. SEC-06 (High): unsanitized HTML in customer emails. |
| 3 | **Data integrity** | CONCERNS | Deferred side-effect pattern and `@transaction.atomic` are well-applied. Gaps: no race protection on admin claim transitions (DATA-07), delete-then-recreate invoice sync (DATA-04), no self-approval guard (DATA-01). |
| 4 | **Failure handling** | CONCERNS | Email failure blocks WhatsApp delivery (ERR-01). Celery tasks have no retry/timeout (OPS-02). PDF generation has no error handling (ERR-02). WhatsApp client has retries — good. |
| 5 | **Observability** | CONCERNS | Sentry and NewRelic are integrated. However: Sentry SDK is 3+ years old (OBS-02), 100% trace sampling (OPS-01), no structured logging or correlation IDs, no application-level metrics. |
| 6 | **Performance** | PASS | Webhook handler is synchronous but appropriately designed for current scale. List endpoints are paginated. Dashboard queries are cached. Prefetch/select_related used consistently on detail views. One waste: list endpoint prefetches unused relations (DATA-06). |
| 7 | **Testing** | CONCERNS | Good happy-path coverage (49 warranty API tests, certificate tests, model tests). Gaps: invalid state transitions untested, no concurrent access tests, no `assertNumQueries`, audit log creation never verified (TEST-01). |
| 8 | **Deployability** | CONCERNS | Infisical secrets management is well-designed. Gaps: WebSockets broken in prod (ARCH-01/OPS-10), no migration step in entrypoint, GitHub Actions on deprecated versions (OPS-05), outdated Nginx (DEP-01). |
| 9 | **Maintainability** | PASS | Clean app boundaries, consistent patterns (DRF generics, separate serializers per action, Celery for async). Good code organization with `choices.py`, `constants.py`, `helpers.py` per app. Ruff linting configured. |
| 10 | **Compliance & privacy** | CONCERNS | PII sent to Sentry (PII-01). PII in response body logs (PII-02). No data deletion mechanism (COMP-01). Audit trail gaps on bot-created registrations and complaints (COMP-02). |

---

## 4. Critical & High Findings

### WA-01 — Missing Webhook Signature Verification [Critical]

- **Location:** [chatbot/api/v1/views.py:37](dulux_chatbot/chatbot/api/v1/views.py#L37)
- **Category:** WhatsApp Integration Security
- **Label:** FACT
- **TODO:** `WA-01`
- **Risk:** The `POST` handler processes any incoming payload without verifying Meta's `X-Hub-Signature-256` HMAC header. Any internet client can forge webhook payloads, injecting fake messages that trigger warranty registrations, claim flows, or complaint conversations under any phone number. This is the most exploitable vulnerability in the system — the webhook URL is publicly known (registered with Meta), and there is no authentication, rate limiting, or signature check.
- **Fix:** Before calling `parse_incoming_message()`, compute `HMAC-SHA256(app_secret, request.body)` and compare against the `X-Hub-Signature-256` header. Return 403 on mismatch. Meta documents this at [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests).

---

### SEC-01 — CORS Allows All Origins [High]

- **Location:** [config/settings/base.py:238](config/settings/base.py#L238)
- **Category:** Django Security
- **Label:** FACT
- **TODO:** `SEC-01`
- **Risk:** `CORS_ALLOW_ALL_ORIGINS = True` in base settings, not overridden in prod or stage. Any website can make cross-origin API requests with credentials. Combined with JWT httponly cookies (`JWT_AUTH_HTTPONLY=True`), a malicious site can refresh tokens and access admin endpoints on behalf of logged-in users.
- **Fix:** Set `CORS_ALLOWED_ORIGINS` to the React panel's actual origin(s) in prod/stage. Remove `CORS_ALLOW_ALL_ORIGINS` from base.

---

### SEC-02 — Missing Django Security Settings in Production [High]

- **Location:** [config/settings/prod.py:6](config/settings/prod.py#L6)
- **Category:** Django Security
- **Label:** FACT
- **TODO:** `SEC-02`
- **Risk:** Production is missing `SECURE_PROXY_SSL_HEADER` (stage has it), `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`. Django cannot detect HTTPS behind Nginx without `SECURE_PROXY_SSL_HEADER`, which causes CSRF failures and insecure `request.is_secure()` returns.
- **Fix:** Add all standard security settings to `prod.py`.

---

### SEC-04 — Flower Dashboard Exposed at /flower [High]

- **Location:** [config/nginx/prod.conf:31](config/nginx/prod.conf#L31)
- **Category:** Infrastructure Security
- **Label:** FACT (partially mitigated — Flower has app-level basic_auth via `flowerconfig.py`)
- **TODO:** `SEC-04`
- **Risk:** Flower is proxied through Nginx without Nginx-level auth. Flower's own `basic_auth` config is in `flowerconfig.py`, which does provide credentials. However, Flower exposes task arguments containing registration IDs, phone numbers, and notification HTML. If the Flower basic_auth credentials are weak or leaked, task arguments are fully visible.
- **Fix:** Add `auth_basic` at the Nginx level as defense-in-depth, or restrict `/flower` to VPN/internal IPs.

---

### SEC-06 — Unsanitized HTML in Customer Email Notifications [High]

- **Location:** [warranty/tasks.py:84](dulux_chatbot/warranty/tasks.py#L84), [warranty/tasks.py:146](dulux_chatbot/warranty/tasks.py#L146)
- **Category:** Application Security
- **Label:** FACT
- **TODO:** `SEC-06` (2 locations)
- **Risk:** `notification_template` is raw HTML passed from the frontend admin panel through the API, stored as a Celery task argument, and sent directly to customers via email. A compromised or malicious admin account can inject phishing links, tracking pixels, or JavaScript into emails sent under the Dulux brand. This is a **brand reputation risk** — a single phishing email from the official Dulux warranty system could damage customer trust.
- **Fix:** Sanitize HTML with `nh3` before sending, or switch to server-side Django templates with variable substitution only.

---

### PII-01 — Sentry Receives Full Customer PII [High]

- **Location:** [config/settings/sentry.py:24](config/settings/sentry.py#L24)
- **Category:** Privacy
- **Label:** FACT
- **TODO:** `PII-01`
- **Risk:** `send_default_pii=True` transmits user IPs, authenticated user emails, and full request bodies (containing customer names, phone numbers, addresses, emails) to Sentry's cloud service. This creates a PII storage location outside organizational control.
- **Fix:** Set `send_default_pii=False`. Use a `before_send` callback to scrub sensitive fields.

---

### ARCH-01 + OPS-10 — WebSockets Broken in Production [High]

- **Location:** [docker-compose.prod.yml:58](docker-compose.prod.yml#L58) (ARCH-01), [docker-compose.stage.yml:76](docker-compose.stage.yml#L76) vs prod (OPS-10)
- **Category:** Architecture / Deployment
- **Label:** FACT
- **TODO:** `ARCH-01`
- **Risk:** Production runs Gunicorn with `gthread` (WSGI). WebSockets require ASGI. The stage deployment has a working `daphne` service and Nginx `/ws/` location block — production has neither. The complaint live-chat feature (real-time messaging between CS agents and customers) does not function in production.
- **Fix:** Port the `daphne` service definition and `/ws/` Nginx location from `docker-compose.stage.yml` / `stage.conf` to `docker-compose.prod.yml` / `prod.conf`.

---

## 5. Medium Findings

### Security & Access Control

**SEC-03 — Image upload missing content-type validation.** Only file size is checked; Django's `ImageField` (Pillow) provides baseline protection but explicit MIME allowlisting is defense-in-depth. `SEC-03` in [core/api/v1/serializers.py:12](dulux_chatbot/core/api/v1/serializers.py#L12).

**SEC-05 — WhatsApp media download without size limit.** `_save_media_image()` downloads without checking Content-Length. Bounded by WhatsApp's own 16MB limit for images. `SEC-05` in [chatbot/flows/base.py:117](dulux_chatbot/chatbot/flows/base.py#L117).

**SEC-07 — Registration detail readable by any authenticated user.** `GET` on registration detail requires only `IsAuthenticated` — no role check. A `QUALITY_REVIEWER` can read full customer PII. `SEC-07` in [warranty/api/v1/views.py:166](dulux_chatbot/warranty/api/v1/views.py#L166).

**SEC-08 — No object-level permission on complaint chat WebSocket.** Any CS agent can connect to any complaint's chat, regardless of assignment. `SEC-08` in [complaints/consumers.py:75](dulux_chatbot/complaints/consumers.py#L75).

**SEC-10 — Dual WebSocket auth (AuthMiddlewareStack + manual JWT).** Confusing layered auth; JWT in query strings appears in access logs. `SEC-10` in [config/asgi.py:15](config/asgi.py#L15).

**ARCH-02 — Nginx missing WebSocket proxy config.** No `/ws/` location block in prod Nginx. `ARCH-02` in [config/nginx/prod.conf:47](config/nginx/prod.conf#L47).

### Data Integrity & Business Logic

**DATA-01 — No self-approval prevention.** An agent can create and approve their own registration. Audit trail records the actor but doesn't enforce separation. `DATA-01` in [warranty/api/v1/serializers.py:329](dulux_chatbot/warranty/api/v1/serializers.py#L329) (2 locations).

**DATA-02 — Resubmit notification overwrites active session.** Celery task replaces customer's WhatsApp session regardless of current flow, silently losing in-progress work. `DATA-02` in [warranty/tasks.py:203](dulux_chatbot/warranty/tasks.py#L203) (2 locations).

**DATA-03 — Audit snapshot functions fire unoptimized queries.** 6-10 extra queries per update inside transactions, re-querying relations already prefetched by views. `DATA-03` in [warranty/audit.py:5](dulux_chatbot/warranty/audit.py#L5) (2 locations).

**DATA-04 — Delete-then-recreate invoice sync.** Destroys PK references in audit logs on update. `DATA-04` in [warranty/api/v1/serializers.py:315](dulux_chatbot/warranty/api/v1/serializers.py#L315).

**DATA-06 — Unnecessary prefetches on list endpoint.** List serializer uses only scalar fields; 4 prefetches are wasted per page. `DATA-06` in [warranty/api/v1/views.py:142](dulux_chatbot/warranty/api/v1/views.py#L142).

**DATA-07 — No race condition protection on claim state transitions.** Admin API doesn't use `select_for_update` — TOCTOU race on concurrent approvals. No inline TODO (architectural).

**QUAL-02 — `validate_phone_number` calls unimported function.** `NameError` at runtime for admin-panel WEBFORM registrations. `QUAL-02` in [warranty/api/v1/serializers.py:278](dulux_chatbot/warranty/api/v1/serializers.py#L278).

### Error Handling & Reliability

**ERR-01 — Email failure blocks WhatsApp delivery.** If Brevo SMTP is down, customer gets neither email nor WhatsApp notification. `ERR-01` in [warranty/tasks.py:112](dulux_chatbot/warranty/tasks.py#L112).

**ERR-02 — No error handling on PDF generation.** ReportLab failure kills the entire Celery task. `ERR-02` in [warranty/services/certificate.py:279](dulux_chatbot/warranty/services/certificate.py#L279).

**OPS-02 — Celery tasks lack retry/timeout.** All `@shared_task` with no `max_retries`, `time_limit`, or `default_retry_delay`. `OPS-02` in [warranty/tasks.py:29](dulux_chatbot/warranty/tasks.py#L29).

### Observability & Operations

**OPS-01 — Sentry 100% trace sampling.** `traces_sample_rate=1.0` in production. `OPS-01` in [config/settings/sentry.py:18](config/settings/sentry.py#L18).

**OPS-05 — GitHub Actions on deprecated @v2.** Uses Node 12 runners. `OPS-05` in [.github/workflows/test-cases.yml:15](.github/workflows/test-cases.yml#L15).

**OPS-07 — Missing Nginx security headers.** No HSTS, X-Content-Type-Options, X-Frame-Options. `OPS-07` in [config/nginx/prod.conf:60](config/nginx/prod.conf#L60).

**PII-02 — Response bodies logged with PII.** Middleware logs truncated response JSON including customer data. `PII-02` in [core/middleware/logging.py:33](dulux_chatbot/core/middleware/logging.py#L33).

**COMP-01 — No data deletion mechanism.** PII stored indefinitely across 6+ tables with no deletion path. Report-only (no TODO).

**COMP-02 — Audit trail gaps.** Bot registrations and complaint transitions unlogged. Report-only (no TODO).

### Testing & Performance

**TEST-01 — Missing coverage on critical state machine paths.** Invalid transitions, concurrent access, audit verification untested. `TEST-01` in [warranty/tests/test_api.py:33](dulux_chatbot/warranty/tests/test_api.py#L33).

**PERF-01 — Webhook handler runs synchronously.** Acceptable at current scale; monitor P95 latency. `PERF-01` in [chatbot/api/v1/views.py:19](dulux_chatbot/chatbot/api/v1/views.py#L19).

---

## 6. Low Findings

- **WA-02** — WhatsApp access token loaded statically at startup; requires restart on rotation. Operational, no TODO.
- **SEC-09** — `random.choices` for registration codes instead of `secrets.choice`. Predictable but not exploitable without auth. `SEC-09` in [warranty/helpers.py:7](dulux_chatbot/warranty/helpers.py#L7).
- **DATA-05** — SSRF risk in historical import commands (admin-only, not API-exposed). `DATA-05` in [import_historical_warranty_registrations.py:301](dulux_chatbot/warranty/management/commands/import_historical_warranty_registrations.py#L301).
- **ERR-03** — Audit log silently skipped for bot-created registrations (actor is None). Report-only.
- **TEST-02** — No tests for management commands. Report-only.
- **QUAL-01** — Duplicated purchase date validation between mixin and create serializer. `QUAL-01` in [warranty/api/v1/serializers.py:266](dulux_chatbot/warranty/api/v1/serializers.py#L266).
- **QUAL-03** — Duplicated helper methods across management commands. Report-only.
- **OBS-03** — No application-level metrics. Report-only.
- **PERF-02** — Dashboard analytics fires many sequential queries (mitigated by cache). Report-only.
- **DEP-02** — Unused dependency `django-fsm` in requirements. Report-only.

---

## 7. Strengths

The developer deserves credit for several design decisions that are genuinely well-executed:

1. **Deferred side-effect pattern.** The `DeferredWhatsAppClient` + `collect_dispatch_side_effects` mechanism ensures WhatsApp API calls only fire after the database transaction commits. This prevents the common bug where a message is sent to the customer but the database write rolls back. This is a sophisticated pattern rarely seen in Django projects at this stage.

2. **Shared serializer path.** Bot-created and admin-created warranty registrations go through the same `WarrantyRegistrationCreateSerializer`, ensuring identical validation regardless of channel. This prevents divergent business rules between WhatsApp and the admin panel.

3. **Clean app boundaries.** Seven Django apps with well-separated responsibilities. No circular imports. The dependency graph flows logically: `chatbot` → `warranty` → `products`, with `core` providing shared infrastructure.

4. **State machine design.** Registration and claim state machines are implemented via explicit transition maps (`REGISTRATION_ACTION_ALLOWED_TRANSITIONS`, `CLAIM_ACTION_ALLOWED_TRANSITIONS`) with serializer-level enforcement. The transitions are well-documented in constants and thoroughly tested for happy paths.

5. **Dispatcher concurrency control.** `select_for_update()` on WhatsApp session in the dispatcher prevents concurrent message processing from corrupting session state. This is the right approach for the chatbot's single-threaded-per-user requirement.

6. **Audit logging via service abstraction.** The `audit_logs.services` module with `log_create` / `log_update` and JSON snapshot diffs provides a solid foundation for audit trails. The pattern is clean and reusable.

7. **Well-structured tests.** The warranty test suite (49 tests) covers create, approve, reject, resubmit, QA review, and edge cases (zero-warranty products, unlinked basecoats, duplicate claims). Test factories are clean and reusable.

8. **Historical data import commands.** The `import_historical_warranty_registrations` and `import_historical_warranty_claims` commands demonstrate care — they support `--dry-run`, batch processing with transactions, and detailed skip reporting.

9. **Constance for runtime configuration.** Business parameters (session timeout, purchase date limit, minimum claim photos) are in Constance rather than hardcoded, allowing runtime adjustment without deploys.

10. **DRF usage.** Consistent use of DRF generics (`ListCreateAPIView`, `RetrieveUpdateAPIView`) with separate serializers per action, proper pagination, filtering, and search. No unnecessary `APIView` overrides.

---

## 8. Questions for the Developer

These require developer/stakeholder input and cannot be determined from code alone:

1. **QUAL-02 / Phone validator import bug:** Does the admin panel actually create WEBFORM registrations via the API? If so, `WarrantyRegistrationCreateSerializer.validate_phone_number` will crash with `NameError` because `validate_pakistan_phone_number` is not imported. If only the chatbot creates registrations, this code path may never execute.

2. **Redis authentication:** Is Redis password-protected in production? The `.env.example` URL has no auth (`redis://redis:6379`). If Redis is network-accessible without a password, task queues, cached data, and session state are exposed.

3. **S3 media access control:** Are S3 URLs pre-signed (time-limited) or publicly accessible? Invoice images and warranty certificates contain customer PII. If the CloudFront distribution serves them without authentication, anyone with the URL can access them.

4. **Backup strategy:** Is PostgreSQL backed up (RDS snapshots, pg_dump, etc.)? Are S3 media files versioned? What's the RPO/RTO?

5. **Certificate reissuance limits:** Is there a limit on how many times a customer can request certificate reissuance via the chatbot? Without one, a user could flood the system.

6. **Deployment rollback procedure:** What's the documented rollback procedure? The volume-mount approach means rollback requires git revert + container restart, but there's no documented process.

---

## 9. Remediation Roadmap

### Tier 1: Must Fix Before Launch (or immediately if live)

| # | Item | Effort | TODO IDs |
|---|------|--------|----------|
| 1 | Add webhook signature verification (X-Hub-Signature-256) | 2–4 hours | WA-01 |
| 2 | Restrict CORS to actual React panel origin(s) | 1 hour | SEC-01 |
| 3 | Add Django security settings to prod.py (`SECURE_PROXY_SSL_HEADER`, HSTS, cookie flags) | 1 hour | SEC-02 |
| 4 | Sanitize notification_template HTML before emailing customers (use `nh3`) | 2–4 hours | SEC-06 |
| 5 | Set `send_default_pii=False` in Sentry config | 15 minutes | PII-01 |
| 6 | Port Daphne service + `/ws/` Nginx block from stage to prod | 2–4 hours | ARCH-01, ARCH-02, OPS-10 |
| 7 | Fix `validate_phone_number` import in `WarrantyRegistrationCreateSerializer` | 5 minutes | QUAL-02 |

**Estimated total: 1–2 person-days**

### Tier 2: Fix Within 30 Days

| # | Item | Effort | TODO IDs |
|---|------|--------|----------|
| 8 | Add retry/timeout config to all Celery tasks | 2–3 hours | OPS-02 |
| 9 | Separate email and WhatsApp notification into independent error blocks | 1–2 hours | ERR-01 |
| 10 | Add `select_for_update` on claim state-changing PATCH | 2 hours | DATA-07 |
| 11 | Add self-approval prevention to registration/claim update serializers | 1–2 hours | DATA-01 |
| 12 | Add Nginx security headers (HSTS, X-Content-Type-Options, etc.) | 30 minutes | OPS-07 |
| 13 | Update GitHub Actions to @v4 | 30 minutes | OPS-05 |
| 14 | Add role check to registration detail GET endpoint | 30 minutes | SEC-07 |
| 15 | Redact PII from response body logging | 2–3 hours | PII-02 |
| 16 | Reduce Sentry traces_sample_rate to 0.1 | 15 minutes | OPS-01 |
| 17 | Wrap PDF generation in try/except at task level | 1 hour | ERR-02 |
| 18 | Check session.flow before overwriting in resubmit tasks | 1–2 hours | DATA-02 |
| 19 | Add object-level permission check on complaint chat WebSocket | 1–2 hours | SEC-08 |
| 20 | Fix list endpoint to skip unnecessary prefetches | 1 hour | DATA-06 |
| 21 | Add missing state machine transition tests | 3–4 hours | TEST-01 |

**Estimated total: 2–3 person-weeks**

### Tier 3: Backlog / Nice-to-Have

| # | Item | Effort | TODO IDs |
|---|------|--------|----------|
| 22 | Optimize audit snapshot functions to use prefetched relations | 2–3 hours | DATA-03 |
| 23 | Diff invoices on update instead of delete-recreate | 2–3 hours | DATA-04 |
| 24 | Clean up dual WebSocket auth (remove AuthMiddlewareStack, use custom JWT middleware) | 2–3 hours | SEC-10 |
| 25 | Add MIME validation on image upload | 1 hour | SEC-03 |
| 26 | Add file size check on WhatsApp media download | 1 hour | SEC-05 |
| 27 | Use `secrets.choice` for registration codes | 15 minutes | SEC-09 |
| 28 | Implement data deletion management command | 1–2 days | COMP-01 |
| 29 | Add audit logging for bot registrations and complaint transitions | 3–4 hours | COMP-02, ERR-03 |
| 30 | Upgrade outdated dependencies (django, cryptography, nginx, sentry-sdk) | 1 day | DEP-01, OBS-02 |
| 31 | Remove unused `django-fsm` dependency | 5 minutes | DEP-02 |
| 32 | Deduplicate purchase date validation | 15 minutes | QUAL-01 |
| 33 | Add URL validation to import command downloads | 30 minutes | DATA-05 |

---

## 10. Inline TODO Inventory

### Summary

| Severity | Count |
|----------|-------|
| Critical | 1 (WA-01) |
| High | 6 (SEC-01, SEC-02, SEC-04, SEC-06 x2, PII-01, ARCH-01) |
| Medium | 22 (across 17 unique IDs) |
| Low | 4 (SEC-09, DATA-05, QUAL-01, QUAL-02) |
| **Total comment blocks** | **35** |
| **Unique finding IDs with TODOs** | **25** |

### Grep Commands

Find all audit TODOs:
```bash
grep -rn "TODO(audit" --include="*.py" --include="*.yml" --include="*.conf"
```

Find only Critical/High:
```bash
grep -rn "TODO(audit.*Critical\|TODO(audit.*High" --include="*.py" --include="*.yml" --include="*.conf"
```

Count remaining:
```bash
grep -rn "TODO(audit" --include="*.py" --include="*.yml" --include="*.conf" | wc -l
```

**Workflow:** The audit branch is "done" when the grep command returns nothing. Each TODO ID maps 1:1 to a finding in this report, enabling bidirectional navigation: read the report to find the code, or read the code to find the analysis.

### Pre-Existing TODO

One TODO exists from a prior audit pass (not part of this audit):
- `P1-7` in `dulux_chatbot/chatbot/tests/test_flows.py:79` — pre-existing, not covered by this report.

### Cross-Reference Validation

**Findings with inline TODOs (25 IDs, 35 comment blocks):**
WA-01, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06 (x2), SEC-07, SEC-08, SEC-09, SEC-10, PII-01, PII-02, ARCH-01, ARCH-02, OPS-01, OPS-02, OPS-05, OPS-07, PERF-01, DATA-01 (x2), DATA-02 (x2), DATA-03 (x2), DATA-04, DATA-05, DATA-06, ERR-01, ERR-02, TEST-01, QUAL-01, QUAL-02

**Findings without inline TODOs (report-only, 13 IDs):**
WA-02 (Low/inference), DATA-07 (architectural — no single code location), DATA-08 (resolved — confirmed as required flow), ERR-03 (Low), TEST-02 (Low), QUAL-03 (Low), OBS-02 (dependency version), OBS-03 (Low), OPS-08 (skipped by owner), OPS-09 (inference), OPS-10 (deployment topology), COMP-01 (missing feature), COMP-02 (missing feature), PII-03 (skipped by owner), DEP-01 (skipped by owner), DEP-02 (Low), PERF-02 (Low)

**Skipped by owner (TODOs removed at owner request):**
OPS-03, OPS-04, OPS-06, OPS-08, OBS-01, PII-03, DEP-01

**Reconciliation needed:** None. All TODOs in the codebase map to findings. All findings either have TODOs or are documented as report-only with justification.
