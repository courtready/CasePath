# CSP inline script & handler inventory

Roadmap input for Content-Security-Policy hardening (`script-src` without `'unsafe-inline'`, and removal of inline event handlers). **No CSP headers and no HTML/JS were modified** to produce this document.

**Scope:** All `*.html` files under the CasePath repository root, **excluding** `deploy-staging-temp/` (duplicate/staging tree).

**Scan date:** 2026-05-13

---

## Methodology

| Category | Detection |
|----------|------------|
| **Inline `<script>`** | Opening `<script` … `>` where the opening tag does **not** contain `src=` (includes JSON-LD, IIFEs, and page-local functions). Multiline opening tags are folded before the `src=` check. |
| **Inline handlers** | Attributes matching `(?<![\w-])on[a-zA-Z]+\s*=` (PowerShell/.NET regex). The negative lookbehind avoids false positives such as `data-onetime="…"` (which would otherwise match `onetime=`). |
| **`onsubmit=` / `onload=`** | Plain-text search for `onsubmit=` and `onload=` across the same HTML scope: **no occurrences** in HTML attributes (handlers may still exist on dynamically created nodes in external JS; that is out of scope for this HTML-only pass). |

---

## Executive summary

| Metric | Count |
|--------|------:|
| HTML files with any inline script **or** inline handler (excl. `deploy-staging-temp`) | 37 |
| Inline `<script>` blocks (no `src`) | 31 |
| Inline `onclick` | 3,229 |
| `onmouseover` / `onmouseout` | 59 / 59 |
| `onchange` | 13 |
| `onblur` / `onfocus` | 6 / 6 |
| `oninput` | 6 |
| `onkeydown` | 3 |

**Largest concentrations**

- **`index.html`** — ~1,618 `onclick` plus analytics inline scripts, large auth/doc-helper/floating-bot blocks, and form controls using `onchange` / `onfocus` / `onblur` / `oninput` / `onkeydown`.
- **`glossary.html`** — ~1,281 `onclick` (term UI) plus small `openAuth` shim and hover handlers.

---

## 1. Inline `<script>` blocks (no `src`)

Each row is the **opening line** of a block. **Recommended replacement:** move the block body into a **hashed or nonce-covered** external script under `/assets/js/` (or `/auth/` where appropriate), load with `<script src="…" defer>` (or `type="module"` if you standardise on modules), and expose any required globals via `window.*` only if unavoidable for legacy callers.

| File | Line | Type / role (short) | Context (opening tag or first line) | Recommended externalised JS |
|------|-----:|----------------------|----------------------------------------|------------------------------|
| `index.html` | 44 | JSON-LD (`application/ld+json`) | `<script type="application/ld+json">` | Non-executable for `script-src`: serve from small static `.json` fetched at runtime, **or** keep inline with **`script-src` nonce/hash** for this block only, **or** inject via trusted server template with nonce. |
| `index.html` | 3698 | Plausible bootstrap | `<script>` → `plausible.init` | e.g. `/assets/js/analytics-plausible.js` (fixed version; align with Plausible loader CSP). |
| `index.html` | 3702 | `window.casepathTrack` | `<script>` wrapper for `plausible` | Same bundle or `/assets/js/analytics-casepath.js`. |
| `index.html` | 13296 | Financial Statement live totals | `<script>` IIFE, `input` listener, `fsCalc` | `/assets/js/fs-live-totals.js` (bind inside `DOMContentLoaded`). |
| `index.html` | 14780 | Pricing component loader | `loadLatestPricingComponent` | `/assets/js/pricing-component-loader.js`. |
| `index.html` | 15488 | Signup / Stripe / auth surface (large) | `<script>` after Supabase/argon2 `src` scripts | Split by concern: e.g. `/assets/js/checkout-signup.js`, `/assets/js/auth-ui-helpers.js` (keep load order documented). |
| `index.html` | 15532 | Auth state helpers (`currentUser`, flags, DEV bypass) | `// ── Auth state ──` | `/assets/js/auth-state.js` (or merge with prior block if dependencies require). |
| `index.html` | 18503 | Document export / OOXML (`cleanNotes`, `esc`, builders) | `function cleanNotes` | `/assets/js/doc-export-ooxml.js` (large; consider submodules). |
| `index.html` | 19805 | Floating bot (`toggleBot`, limits, history) | `// ── FLOATING BOT` | `/assets/js/floating-bot.js`. |
| `index.html` | 21724 | Doc helper / forms centre (tabs, search, etc.) | `// ── DOC HELPER / FORMS CENTRE JS` | `/assets/js/doc-helper-forms.js`. |
| `index.html` | 23099 | Nav underline (desktop grid) | `(() => { const navGrid = …` | `/assets/js/nav-underline.js` (dedupe with `components/nav` if identical). |
| `index.html` | 23133 | Mobile nav toggle (`matchMedia`, scrim) | `(function () { var mq = …` | `/assets/js/nav-mobile.js`. |
| `index.html` | 23237 | `cpIsAuthed` / `cpRequireAuth` helpers | `function cpIsAuthed` | `/assets/js/auth-guards.js`. |
| `index.html` | 23405 | Google Translate init | `googleTranslateElementInit` | `/assets/js/google-translate-init.js` (keep `cb=` reference in external `src` script tag). |
| `index.html` | 23422 | Lang selector + `LANGUAGE_SWITCH_ENABLED` | `DOMContentLoaded` listener | `/assets/js/lang-selector-bootstrap.js`. |
| `index.html` | 23467 | `normalizeHiddenPageHeadings` | `function normalizeHiddenPageHeadings` | `/assets/js/page-headings-a11y.js`. |
| `glossary.html` | 6278 | `window.openAuth` shim | Same pattern as static pages | `/assets/js/open-auth-shim.js` (shared single bundle used by glossary + static pages). |
| `mission.html` | 192 | `window.openAuth` shim | `window.openAuth = function` | Shared `/assets/js/open-auth-shim.js`. |
| `your-team.html` | 80 | `window.openAuth` shim | same | Shared shim. |
| `kids.html` | 83 | `window.openAuth` shim | same | Shared shim. |
| `mental-health.html` | 622 | `window.openAuth` shim | same | Shared shim. |
| `support-tools.html` | 148 | `window.openAuth` shim | same | Shared shim. |
| `share.html` | 126 | Share URL token stripper (privacy) | IIFE removes `token` query param via `history.replaceState` | `/assets/js/share-page-sanitize.js` (load after nav scripts). |
| `self-exclusion.html` | 633 | Self-exclusion form generator (large) | `const data = { participant: …` through print/output logic | `/assets/js/self-exclusion-forms.js` (single deferred bundle; preserve DOM ids). |
| `pricing.html` | 10 | Redirect helper | `window.location.replace("/index.html?goto=pricing")` | `/assets/js/pricing-redirect.js` or rely on meta refresh only + remove script. |
| `avo.html` | 8 | Page bootstrap | `<script>` | `/assets/js/avo-page.js`. |
| `avo-centre.html` | 8 | Page bootstrap | `<script>` | `/assets/js/avo-centre-page.js` (or merge with `avo` if shared). |
| `document-centre.html` | 8 | Page bootstrap | `<script>` | `/assets/js/document-centre-page.js`. |
| `components/nav.html` | 39 | Nav underline + scroll | Same IIFE pattern as `nav/index` | `/assets/js/nav-chrome.js` included from component consumers. |
| `components/nav/index.html` | 61 | Nav underline + scroll | `(() => { const navGrid` | Same `/assets/js/nav-chrome.js`. |
| `components/pricing.html` | 771 | Pricing FAQ toggle | `function togglePricingFaq` | `/assets/js/pricing-faq.js` + remove inline once `onclick` on FAQ controls is migrated. |

**Note:** `components/pricing.backup.pre-replace.20260501-0532.html` also contains **13×** `onclick` (backup snapshot). Treat as non-production artefact: delete or exclude from deployment scans to avoid duplicate CSP work.

---

## 2. Inline event handlers — counts by file

Sorted by total handler volume (`onclick` + other `on*` attributes).

| File | `onclick` | `onmouseover` | `onmouseout` | `onchange` | `onfocus` | `onblur` | `oninput` | `onkeydown` |
|------|----------:|--------------:|---------------:|-----------:|----------:|---------:|----------:|--------------:|
| `index.html` | 1,618 | 42 | 42 | 11 | 6 | 6 | 3 | 3 |
| `glossary.html` | 1,281 | 5 | 5 | — | — | — | — | — |
| `components/glossary.html` | 37 | — | — | — | — | — | — | — |
| `components/glossary/index.html` | 37 | — | — | — | — | — | — | — |
| `components/nav/index.html` | 35 | — | — | — | — | — | — | — |
| `components/pricing.html` | 26 | — | — | — | — | — | — | — |
| `mental-health.html` | 20 | — | — | — | — | — | — | — |
| `mission.html` | 20 | — | — | — | — | — | — | — |
| `self-exclusion.html` | 20 | — | — | — | — | — | — | — |
| `share.html` | 20 | — | — | — | — | — | — | — |
| `revenue-model.html` | 20 | 4 | 4 | — | — | — | — | — |
| `support-tools.html` | 20 | — | — | — | — | — | — | — |
| `components/nav.html` | 15 | — | — | — | — | — | — | — |
| `components/home/hero/index.html` | 8 | — | — | — | — | — | — | — |
| `components/home/situation/index.html` | 7 | — | — | — | — | — | — | — |
| `components/hero-home-static.html` | 6 | — | — | — | — | — | — | — |
| `components/dashboard.html` | 5 | — | — | — | — | — | — | — |
| `components/dashboard/index.html` | 5 | 2 | — | — | — | — | — | — |
| `components/auth/modal/index.html` | 5 | — | — | — | — | — | — | — |
| `components/auth-modal.html` | 5 | — | — | — | — | — | — | — |
| `components/ai-assistant/index.html` | 3 | — | — | — | — | — | — | — |
| `components/ai-assistant.html` | 3 | — | — | — | — | — | — | — |
| `components/pricing.backup.pre-replace.20260501-0532.html` | 13 | — | — | — | — | — | — | — |

*(Files with only external `<script src>` and no inline handlers/scripts are omitted.)*

---

## 3. Handler patterns & recommended external JS (by behaviour)

These are **migration patterns** — keep behaviour identical by binding the same functions from external files during `DOMContentLoaded` (or a single `type="module"` entry).

### 3.1 `onclick` — SPA nav (`showPage`, `cdBuildDashboard`, etc.)

**Where:** `index.html` nav links (e.g. lines ~3739–3756), many similar `href` + `onclick` guards.

**Context example:** `onclick="if(typeof showPage==='function'){showPage('avo');return false;}"`

**Replacement:** In `/assets/js/app.js` (or `casepath-spa-nav.js`), `document.querySelectorAll('[data-spa-page]')` + `click` listener; set `data-spa-page="avo"` on anchors; call existing `showPage` from the listener. Preserve `href` for no-JS fallback.

### 3.2 `onclick` — language UI (`toggleLangDropdown`, `setLang`)

**Where:** `index.html` (~3765–3784), mirrored in `glossary.html` (~65+).

**Replacement:** Extend `/assets/js/casepath-lang-switch.js` (or companion) to bind by `id="lang-btn"` / `.lang-option` classes; remove inline handlers.

### 3.3 `onclick` — auth CTAs (`openAuth`)

**Where:** `index.html` nav; multiple components.

**Replacement:** `/assets/js/auth-ui-bindings.js` using `data-auth-mode="signin|signup"` on elements; handlers call existing `openAuth`.

### 3.4 `onclick` — situation chooser (`scSelectOpt`)

**Where:** `index.html` (large grid of `.sc-opt-btn` buttons, lines ~3820–3856 and follow-on steps).

**Replacement:** Event delegation on a stable container (`#situation-chooser` or similar): `container.addEventListener('click', (e) => { const btn = e.target.closest('[data-sc-q][data-sc-value]'); … })`; store `data-sc-q`, `data-sc-value` instead of stringified calls.

### 3.5 `onclick` — glossary term tiles (~1,281 in `glossary.html`)

**Where:** Per-term buttons/links opening detail UI.

**Replacement:** Event delegation in `/assets/js/glossary-maintenance.js` (or `glossary-ui.js`): one listener on `#glossary-wrap` / `.glossary-list`, read `data-term-id` / slug from `event.target.closest(...)`, invoke existing handler function.

### 3.6 `onmouseover` / `onmouseout`

**Where:** `index.html` (42+42) and `revenue-model.html` (4+4); `glossary.html` (5+5).

**Replacement:** `mouseenter` / `mouseleave` on the same elements from JS; prefer CSS `:hover` where styling-only.

### 3.7 `onchange` (no `onsubmit` / `onload` in HTML)

**Representative lines (`index.html`):**

- ~11330 / ~11793 — `setAvoState` / `setAvoDefState` on `<select>`.
- ~12376 — checkbox → `poRenderCompareResults`.
- ~12632 — `selectDocTypeByValue` on doc-helper `<select>`.
- ~13673–13977 — radio toggles showing/hiding detail `<div>`s via `style.display`.
- ~15473 — signup terms `crTermsCheck()`.

**Replacement:** In the relevant feature modules (`assets/js/…`), `querySelector` + `addEventListener('change', …)`; use `data-toggle-target="rr-facts-detail"` instead of inline `document.getElementById` strings where practical.

### 3.8 `onfocus` / `onblur` / `oninput` / `onkeydown`

**Where:** Concentrated in `index.html` (forms, vault, doc flows).

**Replacement:** Same as `onchange`: bind in the owning feature script; consider a tiny helper `bindFormControl(id, { input, keydown, focus, blur })` to avoid repetition.

---

## 4. CSP rollout notes (roadmap only)

1. **Phase A — Externalise inline `<script>` blocks**  
   Easiest win for `script-src` hashes: fewer large inline blobs. JSON-LD needs explicit policy (nonce per request, hash of static JSON, or move off inline).

2. **Phase B — Event delegation for high-volume `onclick`**  
   Start with `glossary.html` and `index.html` nav / situation chooser (biggest line noise, clear delegation targets).

3. **Phase C — Form controls**  
   Migrate `onchange` / `onfocus` / `onblur` / `oninput` / `onkeydown` in `index.html` in batches by feature region (AVO, doc-helper, referrals, signup).

4. **Phase D — Tighten CSP**  
   After above, enable `script-src 'self'` + nonces or per-file hashes; **avoid** broad `'unsafe-inline'` except short-lived transitional nonces for legacy fragments.

5. **Third-party scripts**  
   `index.html` already loads Plausible, Google Translate, jsDelivr, etc.; CSP must list allowed `script-src` hosts and ideally **hashes/SRI** (already started for some CDN scripts elsewhere).

---

## 5. Files touched to produce this report

| Action |
|--------|
| Created **`auth/CSP_INLINE_SCRIPT_INVENTORY.md`** only. |

No HTML, headers, or runtime behaviour were changed.
