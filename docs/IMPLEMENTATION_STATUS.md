# Implementation status

## Current package: P1 engagement completion

- Streak: derived from verified XP events using the learner's local calendar; a missed day resets the active chain.
- SQL hints: two progressive hints, then reference solution. A verified SQL answer awards 100 / 80 / 60 / 0 XP based on revealed help; reward is unique per challenge.
- Case study pilot: hotel revenue decline investigation uses the third SQL challenge, checks result rows and an evidence based interpretation, and saves a written management summary as a draft. The summary is not automatically graded.
- Mastery remains separate from XP, Level, Streak, and the case study.

## Working rule

Develop related work locally as one package. Run tests once at the package boundary. Push once for a single PR; use PR CI and then main CI. Do not push each small change or trigger a deployment for every edit.

## Verification

Unit suite: run locally before PR. Browser smoke: CI gate; local Chromium download may be unavailable. Confirm PR and main CI before reporting a fully delivered package.

## Next

Expand the case study pilot to analyst artifacts with independently reviewable KPI, chart, interpretation, and executive summary evidence. Do not count free text length alone as verified business reasoning.
