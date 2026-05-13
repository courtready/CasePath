# Phase 3 — Authentication hardening & security foundation (report)

Date: 2026-05-11  
Scope: production-safe stabilisation. **No UI redesign**, **no Stripe payment logic changes**, **no Supabase project configuration changes** in-repo.

---

## 1. Files added

| Path | Role |
|------|------|
| `auth/redirect.js` | `CasePathAuth.redirect.safe()` — same-origin relative redirects only; blocks `javascript:`, `data:`, absolute URLs, `//` protocol-relative. |
| `auth/rate-limit.js` | Client-side throttles for `login`, `password_reset`, `resend_verification` (localStorage timestamps). **Not** a substitute for server rate limits. |
| `auth/auth.js` | `window.authState` + `CasePathAuth.applySession` / `clearAuthState` / `isEmailVerified()`. |
| `auth/session.js` | Pending redirect cleanup, `hydrateFromGetSession()`, `hardLogout()`, refresh-failure hook. |
| `auth/routeGuard.js` | `guardDocumentGeneration()` and `requireVerifiedSessionForFeature()` for sensitive tools. |
| `auth/mfa-foundation.js` | TOTP hooks surface (`mfaEnrollTotp` / `mfaChallengeAndVerify`); **no enforcement**. |
| `auth/DEVICE_SESSION_ARCHITECTURE.md` | Placeholder for device/session listing (future). |
| `auth/PHASE3_AUTH_REPORT.md` | This document. |

---

## 2. Files modified

| Path | Changes |
|------|---------|
| `index.html` | Load `/auth/*.js` after `supabase.js`; bump cache-busters; **`casepathIsComingSoonPage`**: removed `doc-helper` (was blocking Document Centre post-login); **`crSupabaseAuthed`**: prefers hydrated `authState`; **`crConsumePostAuthUrl`**: uses `safeAssignHref`; **`loadAuth`**: hydrates `authState` via `getSession`, legacy `currentUser` fallback now includes `source: 'supabase'` + `emailVerified`; **sign-in / password reset** rate limits; **`runDocHelper`** gated; **resend confirmation** link + `doResendVerification()`; **`nav-link-fallback.js`** cache-busted. |
| `assets/js/app.js` | `initSessionBeforeRender` applies session to `authState`; **`onAuthStateChange`** updates `authState`, handles `TOKEN_REFRESHED` with missing session; **`syncUser`** sets `currentUser.emailVerified`; **`requireAuth`** blocks sensitive features if email not verified; **`openPricingCheckout`** blocks purchases if email not verified; **`navStripeSignedIn`** no longer trusts `cr_user` JSON for “signed in”; **`signOutFromSupabaseAndSync`** clears pending redirects, clears `authState`, `safeRedirect('/')`; **SPA post-login** `doSignIn` path uses `safeRedirect('/')`; **`isAuthenticated()`** prefers `authState`. |
| `assets/js/auth.js` | `logout()` uses `signOut({ scope: 'global' })` with fallback; **`resendSignupVerification()`** with rate limit; password reset `redirectTo` forced to same-origin path; cache buster in `index.html`. |
| `assets/js/casepath-nav-access.js` | `authedFromLocalStorage()` prefers hydrated `authState` when present; **`casepathSafeAssignHref`** fallback mirrors redirect rules; **`casepathGoAuth`** uses safe assign for `/index.html?auth=…`. |
| `assets/js/nav-link-fallback.js` | `/index.html` navigations use `CasePathAuth.redirect.safeAssignHref` when available. |
| `assets/js/satellite-navbar-bridge.js` | `showPage` / `openAuth` use same-origin navigation helper (safe when `CasePathAuth` present). |
| `assets/js/flow.js` | Card navigations use safe relative navigation when `CasePathAuth` present. |
| `assets/js/glossary-maintenance.js` | `goAppPage` uses safe assign for `/index.html` when `CasePathAuth` present. |
| `kids.html`, `your-team.html`, `mental-health.html`, `mission.html`, `glossary.html`, `support-tools.html` | Load **`/auth/redirect.js`** before `casepath-nav-access.js`; bump **`casepath-nav-access.js`** cache-buster; static-shell **`openAuth`** uses safe redirect (no circular call into `casepathGoAuth`). |

---

## 3. Legacy / unsafe patterns addressed

- **`navStripeSignedIn`** previously treated `localStorage` `cr_user` / `courtready_user` as proof of session. **Removed** for main app nav gates; SPA auth now follows **`getSession` / `onAuthStateChange`** mirror in `window.authState` after hydration, with `crSupabaseAuthed()` aligned.
- **`cr_after_auth_url`**: navigation now sanitised via `CasePathAuth.redirect.safeAssignHref` (falls back to relative `/` only).
- **Document Centre SPA navigation**: `doc-helper` removed from `casepathIsComingSoonPage` so `crFlushPendingPageAfterAuth` no longer dead-ends after login.

### Still present (by design or backlog)

- **`cr_has_account` / `cr_signed_in` flags** in `localStorage`: used only as **UX hints** for header chrome where `updateAuthUI` is absent; not used as authority for `crSupabaseAuthed` on the monolith after this pass. **Recommend** Phase 3.2: derive solely from `authState` and remove flags.
- **`hasAccess` / promo codes (`cr_unlock_all_code`, `cr_promo_essential`)** still exist for **product** gating (not auth proof). **Recommend** server-verified entitlements for anything legally sensitive.
- **Supabase anon key** remains in `assets/js/supabase.js` (expected for browser clients) — protect with **RLS**, **CSP**, and **Edge Functions** for privileged operations.
- **Inline `onclick` / large inline script in `index.html`**: CSP tightening still blocked; see Section 8.

---

## 4. Email verification enforcement (implemented)

Blocked until verified (via `email_confirmed_at` / `new_email_confirmed_at`):

- Vault / gated features through **`requireAuth`** (vault, document builder, parenting orders, lawyer portal, AI assistant).
- **Checkout** (`openPricingCheckout`) — token present but unverified email → blocked with message.
- **Document generation** (`runDocHelper` entry) via `CasePathAuth.guardDocumentGeneration()`.

UX: existing sign-in panel + **“Resend confirmation email”**; rate-limited resend.

---

## 5. Session lifecycle

- **Initial hydrate**: `getSession()` → `CasePathAuth.applySession` before `syncUser()`.
- **Listener**: existing `supabase.auth.onAuthStateChange` in `app.js` now updates `authState` first; **`TOKEN_REFRESHED` with falsy session** triggers `handleRefreshFailure()` → hard logout path.
- **Logout**: `signOut({ scope: 'global' })` in `assets/js/auth.js`; SPA wrapper clears pending redirects and uses `safeRedirect('/')`.

---

## 6. Rate limiting (client)

- Sign-in, password reset, resend verification: token-bucket style counters in `localStorage`.  
- **Risk**: cleared by user; bypassed by distributed attackers. **Must** be mirrored server-side (Supabase built-in + WAF / Cloudflare).

---

## 7. MFA (foundation only)

- `auth/mfa-foundation.js` exposes helpers; **`enforcementEnabled: false`**.
- Underlying `mfaEnrollTotp` / `mfaChallengeAndVerify` already exist in `assets/js/auth.js`.

---

## 8. CSP preparation

- New auth logic lives in **`/auth/*.js`** (external files), reducing future `unsafe-inline` dependency for **auth-specific** logic.
- **`index.html`** still contains large inline script and many `onclick` attributes — **high CSP risk** until incremental extraction (Phase 3.2).

---

## 9. Remaining security / redirect risks

| Item | Severity | Notes |
|------|----------|------|
| Other HTML pages not loading `/auth/*.js` | Low | Static shells still use `readLocalUser()` fallback; no `authState` until/if you add scripts. |
| `window.location` usage elsewhere in `index.html` / legacy | Medium | Only auth-critical paths migrated to `safeRedirect`; global audit still recommended. |
| Client-only entitlements | Medium | Plans/credits still read from `members` via anon client — **RLS must guarantee** users cannot write arbitrary plans. |
| Turnstile | N/A | Not wired in this pass; integrate on auth Edge Functions or login form when ready. |

---

## 10. Route protection gaps (recommended Phase 3.2)

- Centralise **all** `showPage` allow/deny rules in one module (today: split between `index.html` `showPage`, `app.js` `showPageWithVaultRefresh`, and `casepath-nav-access.js` for static HTML).
- Static HTML “workspace” URLs should load the same `/auth/*.js` + `supabase.js` + a thin `hydrate` bootstrap for consistent `authState`.

---

## 11. Manual review checklist

- [ ] Supabase **email confirmation** policy matches product (some projects auto-confirm email in dev).
- [ ] **Password recovery** redirect allow-list in Supabase dashboard includes production origins.
- [ ] **`signOut({ scope: 'global' })`** supported by your `@supabase/supabase-js` CDN major version (fallback to plain `signOut()` exists).
- [ ] Legal review: blocking document generation until email verified.

---

## 12. Recommendations before Phase 3.2

1. Add **server-side** rate limits on `signInWithPassword`, `resetPasswordForEmail`, and `resend` via Supabase hooks or Edge Functions.  
2. Move **promo / unlock** flags out of `localStorage` or treat as cosmetic only.  
3. Add **Content-Security-Policy** report-only mode, then tighten `script-src`.  
4. Optional: **refresh token rotation** monitoring in Supabase dashboard.  
5. Static pages: include `/auth/*.js` + `hydrateFromGetSession` for consistent behaviour.
