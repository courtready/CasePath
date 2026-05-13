/**
 * CasePath — Production Maintenance Mode (temporary).
 *
 * SINGLE SOURCE OF TRUTH for the in-app maintenance toggle.
 * To DISABLE maintenance mode, change the boolean below to `false`.
 * No other code edits are required to restore normal service.
 *
 * When enabled:
 *  - Public informational pages still render (see ALLOWED_PATHS below).
 *  - Authenticated tools are blocked: Stripe checkout, Vault uploads,
 *    document generation, useCredit consumption.
 *  - A centered maintenance notice is displayed on every allowed page.
 *  - Any non-allowlisted route is redirected to /index.html.
 *
 * Loaded as the first script in the <head> of every CasePath page so it
 * can preempt redirects, button wiring, and Stripe / Supabase calls.
 */
(function () {
  "use strict";

  // ── SINGLE TOGGLE ────────────────────────────────────────────────────────
  window.CASEPATH_MAINTENANCE_MODE = true;
  // ─────────────────────────────────────────────────────────────────────────

  if (!window.CASEPATH_MAINTENANCE_MODE) return;

  var ALLOWED_PATHS = [
    "/",
    "/index.html",
    "/mission.html",
    "/glossary.html",
    "/mental-health.html",
    "/kids.html",
    "/your-team.html",
    "/support-tools.html"
  ];

  var MAINTENANCE_MESSAGE =
    "CasePath is undergoing scheduled maintenance. Please check back shortly.";

  var REDIRECT_TARGET = "/index.html";

  function normalisePath(p) {
    if (!p) return "/";
    var clean = String(p).toLowerCase();
    // Apache may serve directory index without trailing /index.html
    if (clean === "" || clean === "/") return "/";
    return clean;
  }

  function isAllowedPath(path) {
    var p = normalisePath(path);
    for (var i = 0; i < ALLOWED_PATHS.length; i++) {
      if (p === ALLOWED_PATHS[i]) return true;
    }
    return false;
  }

  // 1. Hard redirect away from blocked routes before anything else paints.
  try {
    var loc = window.location || {};
    var currentPath = loc.pathname || "/";
    if (!isAllowedPath(currentPath)) {
      if (normalisePath(currentPath) !== REDIRECT_TARGET) {
        window.location.replace(REDIRECT_TARGET);
        return;
      }
    }
  } catch (e) { /* ignore */ }

  // 2. Block functional surfaces (Stripe / uploads / doc generation).
  function logBlocked(label) {
    try { console.warn("[CasePath maintenance] blocked:", label); } catch (e) {}
  }

  function syncBlocker(label) {
    return function () { logBlocked(label); return false; };
  }

  function asyncBlocker(label) {
    return function () {
      logBlocked(label);
      var err = new Error("CasePath is in maintenance mode");
      err.code = "MAINTENANCE_MODE";
      return Promise.reject(err);
    };
  }

  // Lock a window-level function so later scripts cannot replace it.
  function lockWindowFn(name, fn) {
    try {
      Object.defineProperty(window, name, {
        configurable: false,
        enumerable: true,
        get: function () { return fn; },
        set: function () { /* swallow overwrites while maintenance is on */ }
      });
    } catch (e) {
      try { window[name] = fn; } catch (e2) { /* ignore */ }
    }
  }

  lockWindowFn("openPricingCheckout", asyncBlocker("openPricingCheckout"));
  lockWindowFn("openCheckout", syncBlocker("openCheckout"));
  lockWindowFn("runDocHelper", asyncBlocker("runDocHelper"));
  lockWindowFn("useCredit", asyncBlocker("useCredit"));
  lockWindowFn("requestVaultSignedUpload", asyncBlocker("requestVaultSignedUpload"));
  lockWindowFn("saveToVault", asyncBlocker("saveToVault"));

  // CasePathAuth namespace is populated by /auth/*.js which load AFTER this
  // script, so re-apply guard stubs on a short interval to overwrite any
  // late-bound originals.
  function applyAuthGuardStubs() {
    try {
      var NS = (window.CasePathAuth = window.CasePathAuth || {});
      var stub = function () { logBlocked("CasePathAuth guard"); return false; };
      NS.requireVerifiedSessionForFeature = stub;
      NS.guardDocumentGeneration = stub;
      NS.routeGuard = NS.routeGuard || {};
      NS.routeGuard.requireVerifiedSessionForFeature = stub;
    } catch (e) { /* ignore */ }
  }
  applyAuthGuardStubs();

  // 3. DOM-level UI lockdown + centered maintenance notice.
  var NOTICE_ID = "casepath-maintenance-notice";
  var STYLE_ID = "casepath-maintenance-style";
  var DISABLED_ATTR = "data-casepath-maintenance-disabled";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      "#" + NOTICE_ID + "{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.55);z-index:2147483646;padding:1rem;}" +
      "#" + NOTICE_ID + " .cp-maint-card{background:#ffffff;color:#1e2420;max-width:420px;width:100%;border-radius:14px;padding:1.75rem;box-shadow:0 24px 60px rgba(0,0,0,0.24);text-align:center;font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;box-sizing:border-box;}" +
      "#" + NOTICE_ID + " .cp-maint-title{font-family:'Lora',Georgia,serif;font-size:1.2rem;font-weight:700;margin:0 0 0.65rem;color:#1e2420;}" +
      "#" + NOTICE_ID + " .cp-maint-body{font-size:0.95rem;color:#4a5548;margin:0 0 1.1rem;}" +
      "#" + NOTICE_ID + " .cp-maint-btn{display:inline-block;background:#4a7c59;color:#ffffff;border:none;border-radius:999px;padding:0.55rem 1.25rem;font:inherit;font-weight:600;font-size:0.9rem;cursor:pointer;}" +
      "#" + NOTICE_ID + " .cp-maint-btn:hover{background:#3f6a4c;}" +
      "[" + DISABLED_ATTR + "]{pointer-events:none !important;opacity:0.55 !important;cursor:not-allowed !important;}";
    (document.head || document.documentElement).appendChild(s);
  }

  function buildNotice() {
    if (document.getElementById(NOTICE_ID)) return;
    var overlay = document.createElement("div");
    overlay.id = NOTICE_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "Site maintenance notice");

    var card = document.createElement("div");
    card.className = "cp-maint-card";

    var title = document.createElement("h2");
    title.className = "cp-maint-title";
    title.textContent = "Scheduled maintenance";

    var body = document.createElement("p");
    body.className = "cp-maint-body";
    body.textContent = MAINTENANCE_MESSAGE;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp-maint-btn";
    btn.textContent = "OK, got it";
    btn.addEventListener("click", function () {
      overlay.style.display = "none";
    });

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(btn);
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  function showNotice() {
    injectStyle();
    buildNotice();
    var el = document.getElementById(NOTICE_ID);
    if (el) el.style.display = "flex";
  }

  // Selectors for every interactive surface that triggers a blocked
  // capability. Anything not on the homepage / static pages list will already
  // have been redirected above, so this only applies to allowed pages.
  var BLOCK_SELECTORS = [
    "[onclick*='openPricingCheckout']",
    "[onclick*='openCheckout']",
    "[onclick*='runDocHelper']",
    "[onclick*='useCredit']",
    "[onclick*='guardDocumentGeneration']",
    "[onclick*='requestVaultSignedUpload']",
    "[onclick*='saveToVault']",
    "[data-cp-checkout]",
    "[data-cp-pricing-cta]",
    "#vault-upload-btn",
    "#vault-file-input",
    "input[type='file']",
    "button[type='submit'][form='checkout-form']"
  ];

  function maintenanceClickInterceptor(ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === "function") {
        ev.stopImmediatePropagation();
      }
    } catch (e) { /* ignore */ }
    showNotice();
    return false;
  }

  function disableEl(el) {
    if (!el || el.getAttribute(DISABLED_ATTR) === "1") return;
    el.setAttribute(DISABLED_ATTR, "1");
    el.setAttribute("aria-disabled", "true");
    if ("disabled" in el) {
      try { el.disabled = true; } catch (e) { /* ignore */ }
    }
    if (el.tagName === "A") {
      var href = el.getAttribute("href");
      if (href) el.setAttribute("data-casepath-href-backup", href);
      el.setAttribute("href", "javascript:void(0)");
    }
    el.addEventListener("click", maintenanceClickInterceptor, true);
  }

  function disableBlockedSurfaces() {
    for (var i = 0; i < BLOCK_SELECTORS.length; i++) {
      try {
        var nodes = document.querySelectorAll(BLOCK_SELECTORS[i]);
        for (var j = 0; j < nodes.length; j++) disableEl(nodes[j]);
      } catch (e) { /* ignore */ }
    }
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    injectStyle();
    buildNotice();
    disableBlockedSurfaces();
    applyAuthGuardStubs();

    if (typeof MutationObserver === "function" && document.body) {
      var mo = new MutationObserver(function () {
        disableBlockedSurfaces();
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    // Beat any late-loading script (auth/*.js, app.js) that may install its
    // own implementations after DOMContentLoaded fires.
    var attempts = 0;
    var iv = setInterval(function () {
      applyAuthGuardStubs();
      disableBlockedSurfaces();
      attempts++;
      if (attempts >= 12) clearInterval(iv);
    }, 500);
  });
})();
