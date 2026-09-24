# Implementation status

## Current package: P2 analyst artifact case expansion

- Revenue-decline case study now stores five separate reviewable evidence layers: verified SQL result, structured KPI definition, generated chart data, evidence-based interpretation, and an executive-summary draft.
- KPI and chart artifacts are derived directly from the validated SQL result instead of free-text claims.
- The learner must identify the correct KPI definition and choose the interpretation that distinguishes observed decline from an unproven cause.
- The executive summary remains a review draft. Presence of a draft is tracked, but the system does not claim that free text has been semantically verified.
- Case-study XP remains separate from mastery. Saving the evidence package does not award mastery by itself.
- Existing v1 local case drafts remain loadable; new saves use a versioned v2 payload inside the same storage key.

## Working rule

Develop related work locally as one package. Run tests once at the package boundary. Push once for a single PR; use PR CI and then main CI. Do not push each small change or trigger a deployment for every edit.

## Verification

Unit suite: run locally before PR when the repository can be materialized. Browser smoke: CI gate. In restricted environments where the repository cannot be cloned, rely on PR CI before merge and main CI after merge.

## Next

Connect the case-study evidence package to a project/portfolio review surface with explicit reviewer status and rubric dimensions. Keep human-reviewed business writing distinct from automatically verified computation.
