# loan-intake-service

Copy `.env.example` to `.env` for local development. In production,
`CORS_ORIGINS` is required and must contain the exact comma-separated browser origins
allowed to call the API. Set `TRUST_PROXY_HOPS` to the exact number of reverse proxies
in front of Express so IP-based authentication throttling cannot be bypassed or made to
group every client together.

## API documentation

The hand-written OpenAPI specification is in `openapi.yaml`. With the API running,
open `http://localhost:<PORT>/docs` for Swagger UI. Use **Authorize** to enter an
access token, then requests to protected endpoints can be executed from the page.
The UI defaults off in production because its inline assets require a relaxed content
security policy; set `API_DOCS_ENABLED=true` only when the deployment should expose it.

## Tests

Run `npm run test:unit` for the pure domain tests. These need no `.env.test`,
database, or queue. They cover each scoring rule around its boundaries, score
aggregation and decision thresholds, and every allowed and forbidden status transition.

Run `npm run test:integration` for the API tests, which load `.env.test` and require
the test PostgreSQL database. `npm test` runs both suites, starting with unit tests.
For unit watch mode, run `npm run test:unit -- --watch`; `npm run test:watch`
watches the integration tests.

Application integration tests cover accepted submissions and their persisted outbox
events, rejected validation (422), missing or invalid authentication (401), forbidden
status/decision changes (403), and owner-only access between applicants (403).
They exercise the Express app and real test database without starting the queue worker.

## Scoring

Scoring is a list of pure rules in `src/domain/applications/scoring.rules.ts`. Each rule
is `(application: ScoreInput) => { points, reason }`. `evaluate` maps every rule over the
application, sums the points onto a base of 50, clamps to 0-100, and bands the result into
`APPROVED` (>= 70), `NEEDS_REVIEW` (>= 40), or `REJECTED`.

Current rules: debt-to-income ratio, requested amount against annual income, absolute
amount ceiling, term length, and completeness of the stated purpose.

**Every threshold and weight here is invented for this exercise.** Nothing in this
repository reproduces, approximates, or is derived from any real lender's underwriting
model. It is a demonstration of the strategy pattern, not a credit policy.

### Adding a rule

Write a function of type `Rule` and append it to the `rules` array. Nothing else changes —
not `evaluate`, not the worker, not the repository.

## OWASP Top 10 security review

Reviewed against the OWASP Top 10 (2021) on 2026-09-11.

| Area | What was checked and found |
| --- | --- |
| A01 Broken Access Control | Every application read is authenticated. Applicant list queries are repository-filtered by `applicantId`; detail reads also check ownership. Status mutations enforce officer/admin roles in the service, with route-level enforcement on decisions. Integration tests cover cross-applicant reads and forbidden applicant mutations. |
| A02 Cryptographic Failures | Passwords use Argon2id; refresh tokens are random, stored only as SHA-256 hashes, rotated on use, and reuse revokes the user's sessions. Access tokens expire after 15 minutes and now pin HS256, issuer, audience, subject, and known role claims. Secrets are environment-only and `.env*` is denied by `.gitignore`. |
| A03 Injection | Request bodies, parameters, and queries are allow-listed with Zod. Database access uses Prisma parameters. The one raw SQL statement is a tagged `$queryRaw` template with only an internal numeric batch size; no request data reaches it. The test-only `$executeRawUnsafe` contains a fixed string. |
| A04 Insecure Design | Body size, money/term/string bounds, pagination limits, explicit status transitions, transactional outbox writes, idempotent event claims, and audit records constrain abuse and invalid workflow states. Authentication endpoints are IP-rate-limited. |
| A05 Security Misconfiguration | Helmet is enabled, CORS now uses an explicit allow-list, production refuses to start without `CORS_ORIGINS`, auth responses use `Cache-Control: no-store`, proxy trust is explicit, and API docs default off in production. Operational errors do not expose stack traces. |
| A06 Vulnerable and Outdated Components | Ran `npm audit` for the API and web app. Automatic safe updates removed the `fast-uri` and `qs` findings; the web production tree reports no advisories. See the accepted development-tool finding below. |
| A07 Identification and Authentication Failures | Login errors do not reveal whether an email exists and perform a dummy Argon2 verification for unknown users. Passwords are 12-128 characters. Login and registration have independent five-attempt/15-minute limits. JWT validation and refresh-token rotation are covered above. |
| A08 Software and Data Integrity Failures | Lockfiles are committed. Queue payloads are schema-validated, durable messages carry IDs, consumers claim IDs transactionally, and status updates plus audit records are atomic. |
| A09 Security Logging and Monitoring Failures | Requests carry correlation IDs; auth throttling, token reuse, server failures, AMQP failures, and stuck outbox messages are logged. Credentials, authorization headers, tokens, cookies, and password hashes are redacted. Every status transition has a durable audit record. |
| A10 Server-Side Request Forgery | The HTTP API accepts no user-controlled destination URLs. Database and RabbitMQ endpoints come only from startup configuration, and CORS origins are parsed as exact HTTP(S) origins. |

### Fixed in this pass

- Replaced permissive CORS behavior with a validated origin allow-list and fail-closed
  production configuration.
- Disabled Swagger UI by default in production, containing its relaxed CSP exception.
- Added explicit proxy-hop configuration for trustworthy IP rate limits.
- Pinned JWT algorithm, issuer, and audience; runtime-validates subject and role claims.
- Marked every authentication response `no-store` and added regression tests.
- Applied non-breaking dependency remediations and moved the Prisma CLI to development
  dependencies.

### Deliberately out of scope for this demo

- TLS termination, secret rotation/storage, database and RabbitMQ network isolation,
  backups, and container hardening belong to the deployment platform. The credentials in
  `compose.yaml` are local-development-only.
- The in-memory rate-limit store is per process. A multi-instance deployment needs a
  shared store such as Redis, plus broader API/gateway limits and alerting.
- MFA, email verification, account recovery/lockout, refresh-token cleanup, audit-log
  retention/export, and centralized monitoring/SIEM are not implemented.
- Full `npm audit` still reports Prisma CLI-only advisories through `deepmerge-ts` and
  the unused `mysql2` connector. npm's proposed fix is a breaking Prisma downgrade; the
  CLI is marked development-only, although npm's optional peer resolution still places
  it in the audited tree. Neither vulnerable path is invoked by this PostgreSQL service.
  Track upstream fixes rather than forcing untested major-version overrides.
- This was a code/configuration review with unit and integration coverage, not a
  penetration test, SAST/DAST run, infrastructure review, or formal threat model.
