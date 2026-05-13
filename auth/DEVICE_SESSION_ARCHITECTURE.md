# Device & session architecture (Phase 3 groundwork)

This file documents **intended** production direction only. Advanced UI is not shipped in Phase 3.

## Goals (future Phase 3.2+)

- List active refresh-token sessions per user (requires Supabase or custom backend table).
- Per-device labels (browser + OS) derived from `navigator.userAgent` at sign-in.
- User-initiated **session revocation** (server must invalidate refresh tokens; client-only sign-out is not enough for all sessions).
- **Login history** (IP, country, timestamp) — must be written from a trusted backend (Edge Function or database trigger), not-only client.

## Current baseline (today)

- `supabase.auth.signOut({ scope: "global" })` invalidates refresh tokens for the current client session where supported; other devices may remain signed in until refresh expires or server-side revocation exists.
- `CasePathAuth.session.clearPendingRedirects()` prevents stale post-login navigation after logout.

## Manual review required

- Whether your Supabase project enables **multi-session** behaviour and how you want lawyer-portal / vault sessions to behave on password reset.
