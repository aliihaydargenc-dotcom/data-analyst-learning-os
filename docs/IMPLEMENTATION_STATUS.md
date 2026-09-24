# Implementation status

## Current package: P2 portfolio review surface

- The revenue-decline case now appears as a portfolio project with a dedicated review surface.
- Five rubric dimensions are visible: SQL correctness, KPI design, visualization accuracy, analytical reasoning, and executive communication.
- SQL, KPI, chart, and analytical interpretation are machine-verifiable from the case evidence package.
- Executive communication remains explicitly human-reviewed; a draft never becomes verified only because text exists.
- A complete evidence package can be marked ready for review. This records reviewer-pending state in the learner's existing cloud-synced `da-learning-os:*` state without awarding XP or mastery.
- Editing/resaving the case invalidates any previous reviewer-pending state so stale review status cannot survive changed artifacts.
- The surface already models future reviewer decisions (`approved` / `changes_requested`) without pretending that a reviewer workflow exists today.
- Package version: 0.22.0.

## Working rule

Develop related work as one package. Run the full test suite at the package boundary. Push one PR, use PR CI as the quality gate, then verify main CI after merge. Avoid a deployment cycle for each small edit.

## Verification

The package includes a dedicated portfolio-review unit test and browser-smoke coverage for draft → ready-for-review → reviewer-pending transitions. Existing case-study, XP, mastery, lesson, and academy quality gates remain in the full test chain.

## Next

Add a real reviewer workflow rather than a simulated decision: reviewer identity, project queue, rubric comments, approve/request-changes actions, immutable review history, and explicit rules for how reviewed project evidence can contribute to advanced mastery.
