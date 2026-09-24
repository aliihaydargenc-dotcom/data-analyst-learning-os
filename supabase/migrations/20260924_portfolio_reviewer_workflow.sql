-- Production migration applied to Supabase project mudlekwkoxbkkauxberv on 2026-09-24.
-- Canonical reviewer workflow objects: portfolio_reviews, portfolio_review_history,
-- is_learning_reviewer(), submit_portfolio_review(), decide_portfolio_review(),
-- review_contributes_to_advanced_mastery(), and learning_state_portfolio_review_sync.
--
-- This repository copy intentionally documents the deployed contract. Future schema
-- changes must be added as a new migration rather than rewriting review history.

comment on table public.portfolio_reviews is 'Human review queue for submitted portfolio evidence; decisions are reviewer-authenticated.';
comment on table public.portfolio_review_history is 'Append-only audit snapshots for portfolio submission and reviewer decisions.';
