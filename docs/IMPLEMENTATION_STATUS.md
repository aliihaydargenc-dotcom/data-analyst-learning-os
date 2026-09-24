# Implementation status

## Current package: P2 real reviewer workflow

- Portfolio submissions now cross a real server-side boundary: the existing cloud-synced learner state is bridged into a Supabase `portfolio_reviews` queue.
- Reviewer identity is enforced from authenticated `profiles`: active `admin` and `reviewer` roles can decide a review; learners cannot self-approve.
- `/reviewer` provides a protected queue with submitted evidence, rubric-specific comments, an overall decision note, and approve/request-changes actions.
- Review decisions are written through a security-definer RPC and mirrored back into the learner's cloud state, so the existing Portfolio Review surface receives the real decision on the next sync/session.
- `portfolio_review_history` stores immutable submission/decision snapshots. Direct authenticated insert/update/delete access to review tables is revoked.
- Request-changes requires reviewer feedback. Approval is allowed without a mandatory prose note, while rubric comments remain available.
- Advanced mastery eligibility is explicit and conservative: only an approved record with a real reviewer identity and review timestamp can contribute. This package does not automatically award mastery or XP.
- Production Supabase migrations `portfolio_reviewer_workflow` and `portfolio_review_state_bridge` were applied successfully.
- Package version: 0.23.0.

## Working rule

Develop related work as one package. Run the full test suite at the package boundary. Push one PR, use PR CI as the quality gate, then verify main CI after merge. Avoid a deployment cycle for each small edit.

## Verification

The package adds reviewer-workflow unit coverage for decision validation, feedback requirements, rubric comment normalization, and advanced-mastery eligibility. Existing portfolio-review, XP, mastery, lesson, academy, and browser quality gates remain in the full CI chain.

## Next

Connect approved portfolio evidence to a dedicated advanced-mastery evidence ledger with provenance and weighting rules. Keep reviewer approval necessary but not sufficient by itself for mastery; define the exact evidence weight and retention/transfer requirements before awarding any mastery progression.
