# loan-intake-service

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
