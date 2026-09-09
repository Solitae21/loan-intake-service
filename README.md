# loan-intake-service

## API documentation

The hand-written OpenAPI specification is in `openapi.yaml`. With the API running,
open `http://localhost:<PORT>/docs` for Swagger UI. Use **Authorize** to enter an
access token, then requests to protected endpoints can be executed from the page.

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
