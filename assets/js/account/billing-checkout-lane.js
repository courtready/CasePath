/**
 * Billing + Stripe checkout client lane (extracted from app.js Phase 3).
 * Depends: crLocalDevHost, DEV_MODE, showPage, openAuth, supabaseClient, CasePathAuth.
 *
 * Navigate to the pricing page and apply highlight for a plan / pack (hero CTAs, deep links).
 * Does not start Stripe — use openPricingCheckout for that.
 */
function openPricing(highlightContext) {
  var ctx = String(highlightContext || "").trim() || "parenting_orders";
  try {
    window.__pricingHighlightPending = ctx;
  } catch (e) {
    /* ignore */
  }
  try {
    sessionStorage.setItem("cr_pricing_highlight", ctx);
  } catch (e2) {
    /* ignore */
  }
  if (typeof showPage === "function") {
    showPage("pricing");
    return;
  }
  if (
    window.CasePathAuth &&
    window.CasePathAuth.redirect &&
    typeof window.CasePathAuth.redirect.safeAssignHref === "function"
  ) {
    if (window.CasePathAuth.redirect.safeAssignHref("/pricing.html")) return;
  }
  window.location.href = "/pricing.html";
}
window.openPricing = openPricing;

var CASEPATH_CHECKOUT_SKUS = [
  "au_individual_1m",
  "au_individual_3m",
  "au_individual_6m",
  "au_individual_12m",
  "uk_individual_1m",
  "uk_individual_3m",
  "uk_individual_6m",
  "uk_individual_12m",
  "starter_monthly",
  "pro_monthly",
  "essential",
  "credits_1",
  "credits_5",
  "credits_10",
  "parenting_pack",
  "lawyer_portal",
];

function casepathIsStripeHostedCheckoutUrl(u) {
  try {
    var x = new URL(String(u || "").trim());
    if (x.protocol !== "https:") return false;
    var h = x.hostname.toLowerCase();
    return h === "stripe.com" || h.slice(-11) === ".stripe.com";
  } catch (e) {
    return false;
  }
}

function casepathShowCheckoutErrorToast(message) {
  var text = String(message || "Checkout could not start.").trim() || "Checkout could not start.";
  var id = "casepath-checkout-error-toast";
  try {
    var prev = document.getElementById(id);
    if (prev) prev.remove();
  } catch (e0) {}
  var wrap = document.createElement("div");
  wrap.id = id;
  wrap.setAttribute("role", "alert");
  wrap.style.cssText =
    "position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);max-width:min(28rem,calc(100% - 2rem));z-index:2147483647;" +
    "background:#1e2420;color:#fffef9;padding:1rem 1.15rem 0.85rem;border-radius:12px;" +
    "box-shadow:0 12px 40px rgba(0,0,0,0.35);font-family:var(--cp-font-ui),system-ui,sans-serif;font-size: var(--cp-type-body);line-height:1.5;";
  var p = document.createElement("p");
  p.style.margin = "0 0 0.65rem";
  p.textContent = text;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Dismiss";
  btn.style.cssText =
    "display:block;width:100%;background:#4a7c59;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.6rem;font:inherit;font-weight:600;cursor:pointer;";
  btn.addEventListener("click", function () {
    try {
      wrap.remove();
    } catch (e1) {}
  });
  wrap.appendChild(p);
  wrap.appendChild(btn);
  var host = document.body || document.documentElement;
  host.appendChild(wrap);
  setTimeout(function () {
    try {
      if (wrap.parentNode) wrap.remove();
    } catch (e2) {}
  }, 14000);
}

function casepathCheckoutFailLogged(dataSnapshot, userMessage) {
  try {
    console.error(
      "[CasePath checkout] request failed",
      dataSnapshot != null ? JSON.stringify(dataSnapshot) : "{}"
    );
  } catch (e) {
    console.error("[CasePath checkout] request failed", dataSnapshot);
  }
  casepathShowCheckoutErrorToast(userMessage);
}

function casepathAlertCheckout(msg) {
  try {
    casepathShowCheckoutErrorToast(msg);
  } catch (e) {
    try {
      console.error("[checkout]", msg);
    } catch (e2) {}
    try {
      alert(String(msg || "Checkout could not start."));
    } catch (e3) {}
  }
}

function casepathCheckoutDiagnosticsEnabled() {
  try {
    var pin = window.CasePathProductionInvariant;
    if (pin && pin.isProductionOrigin && pin.isProductionOrigin()) return false;
  } catch (ePin) {}
  try {
    return crLocalDevHost() || DEV_MODE;
  } catch (e) {
    return false;
  }
}

/**
 * Checkout is available for genuine Stripe testing.
 * Paid-access enforcement is a separate server flag (BILLING_ENFORCEMENT_ENABLED)
 * and remains off unless explicitly enabled. This client gate no longer blocks
 * checkout by default.
 *
 * To temporarily disable checkout clicks, set
 * `window.CASEPATH_BETA_PAYMENTS_DISABLED = true` before this script loads.
 */
function casepathBetaPaymentsDisabled() {
  try {
    if (typeof window !== "undefined" && window.CASEPATH_BETA_PAYMENTS_DISABLED === true) {
      return true;
    }
  } catch (e) {
    /* ignore */
  }
  return false;
}

function casepathShowBetaPaymentsNotice() {
  var text =
    "Checkout is temporarily unavailable. Please try again shortly.";
  var id = "casepath-beta-payments-notice";
  try {
    var prev = document.getElementById(id);
    if (prev) prev.remove();
  } catch (e0) {}
  var wrap = document.createElement("div");
  wrap.id = id;
  wrap.setAttribute("role", "status");
  wrap.setAttribute("aria-live", "polite");
  wrap.style.cssText =
    "position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);max-width:min(28rem,calc(100% - 2rem));z-index:2147483647;" +
    "background:#1e2420;color:#fffef9;padding:1rem 1.15rem 0.85rem;border-radius:12px;" +
    "box-shadow:0 12px 40px rgba(0,0,0,0.35);font-family:var(--cp-font-ui),system-ui,sans-serif;font-size: var(--cp-type-body);line-height:1.5;";
  var p = document.createElement("p");
  p.style.margin = "0 0 0.65rem";
  p.textContent = text;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "OK, got it";
  btn.style.cssText =
    "display:block;width:100%;background:#4a7c59;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.6rem;font:inherit;font-weight:600;cursor:pointer;";
  btn.addEventListener("click", function () {
    try {
      wrap.remove();
    } catch (e1) {}
  });
  wrap.appendChild(p);
  wrap.appendChild(btn);
  var host = document.body || document.documentElement;
  host.appendChild(wrap);
  setTimeout(function () {
    try {
      if (wrap.parentNode) wrap.remove();
    } catch (e2) {}
  }, 14000);
}

function casepathBindPricingCheckoutDelegation() {
  if (window.__casepathPricingCheckoutDelegationBound) return;
  window.__casepathPricingCheckoutDelegationBound = true;
  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || typeof t.closest !== "function") return;
      var btn = t.closest("[data-cp-checkout-sku]");
      if (!btn) return;
      if (btn.getAttribute("data-casepath-maintenance-disabled") === "1") return;
      if (btn.disabled === true || btn.getAttribute("aria-disabled") === "true") return;
      var sku = btn.getAttribute("data-cp-checkout-sku");
      if (!sku) return;
      sku = String(sku).trim();
      if (!sku) return;
      ev.preventDefault();
      if (casepathBetaPaymentsDisabled()) {
        if (typeof window.casepathBillingSmokeLog === "function") {
          window.casepathBillingSmokeLog("checkout_click_beta_disabled", { sku: sku });
        }
        casepathShowBetaPaymentsNotice();
        return;
      }
      if (typeof window.casepathBillingSmokeLog === "function") {
        window.casepathBillingSmokeLog("checkout_click", { sku: sku });
      }
      if (typeof window.openPricingCheckout !== "function") {
        casepathCheckoutFailLogged(
          { code: "CLIENT_CHECKOUT_UNAVAILABLE" },
          "Checkout is not ready yet. Refresh the page and try again."
        );
        return;
      }
      void window.openPricingCheckout(sku);
    },
    false
  );
}

function casepathCheckoutMessageForResponse(status, data, requestedSku) {
  var code = data && data.code ? String(data.code) : "";
  var err = data && data.error ? String(data.error) : "";
  var errLower = err.toLowerCase();
  if (status === 401 || code === "UNAUTHORIZED") {
    return "Please sign in to continue to checkout.";
  }
  if (status === 403 || code === "CORS_FORBIDDEN") {
    return (
      "This page origin is not allowed to start checkout (CORS). Ask the site operator to add your origin to Supabase Edge secrets CASEPATH_ALLOWED_ORIGINS (or set SITE_URL to your https site)."
    );
  }
  if (code === "PRICE_NOT_CONFIGURED" || code === "UNKNOWN_SKU") {
    var diag = casepathCheckoutDiagnosticsEnabled();
    var sk = String((data && data.sku) || requestedSku || "").trim();
    if (diag && sk) {
      if (code === "UNKNOWN_SKU") {
        return (
          "Stripe plan mapping missing for: " +
          sk +
          " (SKU not in server whitelist). Allowed: " +
          CASEPATH_CHECKOUT_SKUS.join(", ") +
          "."
        );
      }
      var missDiag = data && data.missing_env;
      if (missDiag && missDiag.length) {
        return (
          "Stripe plan mapping missing for: " +
          sk +
          ". Set one of these Supabase Edge secrets to a live Stripe price_… ID: " +
          missDiag.join(", ") +
          "."
        );
      }
      return "Stripe plan mapping missing for: " + sk + ".";
    }
    var miss = data && data.missing_env;
    if (miss && miss.length) {
      return (
        "That plan is not available for checkout yet (Stripe price IDs not set on the server). Configure these Supabase Edge secrets: " +
        miss.join(", ") +
        "."
      );
    }
    return "That plan is not available for checkout yet. Choose another option or contact support.";
  }
  if (
    status === 400 &&
    (errLower.indexOf("missing priceid") !== -1 || errLower.indexOf("missing price_id") !== -1)
  ) {
    return (
      "Checkout server returned an outdated error (missing price). Deploy the latest create-checkout-session Edge function from the repo (SKU-based checkout) and set STRIPE_PRICE_* secrets for each plan in Supabase."
    );
  }
  if (code === "MISSING_CONFIGURATION" || code === "INVALID_SITE_URL") {
    var miss2 = data && data.missing_env;
    if (miss2 && miss2.length) {
      return (
        "Payments are not fully configured on the server yet. Missing: " +
        miss2.join(", ") +
        ". Add these in Supabase → Edge Functions → Secrets, then try again."
      );
    }
    return "Payments are not fully configured on the server yet. Please try again later.";
  }
  if (code === "STRIPE_ERROR" || status === 502) {
    return "Stripe is temporarily unavailable. Please wait a moment and try again.";
  }
  if (status === 500) {
    return "The checkout server hit an error. Please try again shortly.";
  }
  if (status === 400) {
    if (code === "CLIENT_PRICE_FORBIDDEN") {
      return "Invalid checkout request (client price fields are not accepted). Refresh the page and try again.";
    }
    if (code === "MALFORMED_JSON") {
      return "The checkout server returned an unreadable response. Please refresh and try again.";
    }
    return err || "Checkout could not start (invalid request).";
  }
  if (err) return err;
  return "Checkout could not start (" + status + ").";
}

async function openPricingCheckout(plan) {
  if (casepathBetaPaymentsDisabled()) {
    if (typeof window.casepathBillingSmokeLog === "function") {
      window.casepathBillingSmokeLog("checkout_beta_disabled", { sku: String(plan || "") });
    }
    casepathShowBetaPaymentsNotice();
    return;
  }
  if (typeof window.ensureSupabaseLoaded === "function") {
    try {
      await window.ensureSupabaseLoaded();
    } catch (eSb) {
      console.warn("openPricingCheckout: supabase load failed", eSb);
    }
  }
  if (typeof window.ensureStripeLoaded === "function") {
    try {
      await window.ensureStripeLoaded();
    } catch (eSt) {
      console.warn("openPricingCheckout: stripe load failed", eSt);
    }
  }

  var planAliases = {
    doconce: "credits_1",
    doc_single: "credits_1",
    doc_five: "credits_5",
    full: "pro_monthly",
    full_access: "pro_monthly",
    pro: "pro_monthly",
    starter: "starter_monthly",
    essential_monthly: "essential",
    casepack: "parenting_pack",
    lawyer: "lawyer_portal",
    lawyer_portal_access: "lawyer_portal",
  };
  var planKey = planAliases[plan] || plan;

  var baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  if (!baseUrl || !window.supabaseClient) {
    console.error("openPricingCheckout: missing Supabase client / URL");
    casepathCheckoutFailLogged(
      { code: "MISSING_SUPABASE_CLIENT", sku: planKey },
      "Payments are not connected yet (missing Supabase client). Check that supabase.js loaded and refresh."
    );
    return;
  }

  var checkoutEndpoint =
    String(baseUrl).replace(/\/$/, "") + "/functions/v1/create-checkout-session";

  var sess = null;
  try {
    var sessRes = await window.supabaseClient.auth.getSession();
    sess = sessRes && sessRes.data ? sessRes.data.session : null;
  } catch (e) {
    console.warn("openPricingCheckout: getSession failed", e);
  }
  var token = sess && sess.access_token ? sess.access_token : "";
  if (!token && !DEV_MODE) {
    console.warn("openPricingCheckout: sign in required");
    casepathShowCheckoutErrorToast("Please create an account or sign in to continue to checkout.");
    if (typeof openAuth === "function") openAuth("signup");
    return;
  }

  var sessionUser = sess && sess.user ? sess.user : null;
  if (
    !DEV_MODE &&
    sessionUser &&
    !(sessionUser.email_confirmed_at || sessionUser.new_email_confirmed_at)
  ) {
    console.warn("openPricingCheckout: email not verified");
    casepathShowCheckoutErrorToast(
      "Please verify your email before purchasing. Check your inbox and spam folder, then try again."
    );
    if (typeof openAuth === "function") openAuth("signin");
    return;
  }

  var anon = typeof window !== "undefined" ? window.SUPABASE_ANON_KEY : "";
  var returnPath =
    typeof window !== "undefined" && window.location && window.location.pathname
      ? window.location.pathname
      : "/";

  console.info("[CasePath checkout] request start");
  if (typeof window.casepathBillingSmokeLog === "function") {
    window.casepathBillingSmokeLog("checkout_request_start", { sku: planKey, return_path: returnPath });
  }

  if (casepathCheckoutDiagnosticsEnabled()) {
    try {
      console.log("[CasePath checkout] payload", { sku: planKey });
    } catch (eLog) {}
  }

  var res;
  try {
    res = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: anon || "",
      },
      body: JSON.stringify({
        sku: planKey,
        return_path: returnPath,
      }),
    });
  } catch (err) {
    console.error("openPricingCheckout fetch:", err);
    try {
      window.__casepathLastCheckout = {
        at: new Date().toISOString(),
        sku: planKey,
        status: 0,
        error: "network",
      };
    } catch (e2) {}
    casepathCheckoutFailLogged(
      { error: "network", sku: planKey, message: String(err && err.message ? err.message : err) },
      "Could not reach the checkout server. Check your connection, disable strict blockers for this site, and try again."
    );
    return;
  }

  var rawText = "";
  try {
    rawText = await res.text();
  } catch (e3) {
    rawText = "";
  }
  var data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (e4) {
      data = { error: "Malformed JSON from checkout server", code: "MALFORMED_JSON" };
    }
  }

  try {
    window.__casepathLastCheckout = {
      at: new Date().toISOString(),
      sku: planKey,
      status: res.status,
      code: data && data.code,
      error: data && data.error,
    };
  } catch (e5) {}

  if (res.ok && data && data.code === "MALFORMED_JSON") {
    console.error("Checkout: 200 with unreadable JSON body");
    casepathCheckoutFailLogged(
      data,
      "Checkout could not start: the payment server returned an unexpected response. Please refresh and try again."
    );
    return;
  }

  if (!res.ok) {
    if (typeof window.casepathBillingSmokeLog === "function") {
      window.casepathBillingSmokeLog("checkout_request_failed", {
        sku: planKey,
        status: res.status,
        code: data && data.code,
      });
    }
    casepathCheckoutFailLogged(data, casepathCheckoutMessageForResponse(res.status, data, planKey));
    return;
  }

  var checkoutUrl = data && data.url ? String(data.url).trim() : "";

  if (!casepathIsStripeHostedCheckoutUrl(checkoutUrl)) {
    console.error("Checkout returned unexpected URL (rejecting redirect):", checkoutUrl);
    casepathCheckoutFailLogged(
      Object.assign({}, data, { rejected_url: checkoutUrl }),
      "Checkout could not start: the payment server returned an invalid redirect. Please try again or contact support."
    );
    return;
  }

  console.info("[CasePath checkout] request success");
  if (typeof window.casepathBillingSmokeLog === "function") {
    window.casepathBillingSmokeLog("checkout_redirect_stripe", { sku: planKey });
  }
  window.location.href = checkoutUrl;
}
window.openPricingCheckout = openPricingCheckout;
window.casepathBetaPaymentsDisabled = casepathBetaPaymentsDisabled;
casepathBindPricingCheckoutDelegation();

async function openBillingPortal() {
  var baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  if (!baseUrl || !window.supabaseClient) {
    casepathAlertCheckout("Billing management is not connected yet.");
    return;
  }
  var sess = null;
  try {
    var sessRes = await window.supabaseClient.auth.getSession();
    sess = sessRes && sessRes.data ? sessRes.data.session : null;
  } catch (e) {
    sess = null;
  }
  var token = sess && sess.access_token ? sess.access_token : "";
  if (!token) {
    casepathAlertCheckout("Please sign in to manage a recurring subscription.");
    if (typeof openAuth === "function") openAuth("signin");
    return;
  }
  var anon = window.SUPABASE_ANON_KEY || "";
  var returnPath = window.location && window.location.pathname ? window.location.pathname : "/pricing.html";
  var res;
  try {
    res = await fetch(String(baseUrl).replace(/\/$/, "") + "/functions/v1/create-billing-portal-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: anon,
      },
      body: JSON.stringify({ jurisdiction: "au", return_path: returnPath }),
    });
  } catch (err) {
    casepathAlertCheckout("Could not open the billing portal. Please try again.");
    return;
  }
  var data = {};
  try {
    data = await res.json();
  } catch (e2) {
    data = {};
  }
  if (!res.ok || !data || !data.url) {
    casepathAlertCheckout((data && data.error) || "There is no recurring subscription to manage.");
    return;
  }
  try {
    var portal = new URL(String(data.url));
    if (portal.protocol !== "https:" || portal.hostname.indexOf("stripe.com") === -1) {
      casepathAlertCheckout("Billing portal returned an invalid redirect.");
      return;
    }
  } catch (e3) {
    casepathAlertCheckout("Billing portal returned an invalid redirect.");
    return;
  }
  window.location.href = data.url;
}
window.openBillingPortal = openBillingPortal;

window.casepathStripeDebug = function casepathStripeDebug() {
  var origin = "";
  try {
    origin = window.location.origin;
  } catch (e) {
    origin = "";
  }
  var siteUrlHint =
    "Set Supabase Edge secret SITE_URL to your canonical https origin (production default: https://casepath.com.au). Current browser origin: " +
    origin;
  var auth = {
    hasSession: false,
    userId: null,
    emailVerified: null,
  };
  try {
    if (window.__crAuthHydrated && window.authState) {
      auth.hasSession = !!window.authState.isAuthenticated;
    }
  } catch (e2) {}
  try {
    if (typeof crSupabaseAuthed === "function") {
      auth.hasSession = !!crSupabaseAuthed();
    }
  } catch (e3) {}
  try {
    if (window.currentUser) {
      auth.userId = window.currentUser.id || null;
      auth.emailVerified = window.currentUser.emailVerified;
    }
  } catch (e4) {}
  var baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  var checkoutEp = baseUrl
    ? String(baseUrl).replace(/\/$/, "") + "/functions/v1/create-checkout-session"
    : "(missing SUPABASE_PROJECT_URL)";
  var last = window.__casepathLastCheckout || null;
  var out = {
    currentOrigin: origin,
    siteUrlExpectation: siteUrlHint,
    auth: auth,
    enabledCheckoutSkus: CASEPATH_CHECKOUT_SKUS,
    checkoutEndpointUrl: checkoutEp,
    lastCheckoutAttempt: last,
    stripeRedirectRule: "https only; hostname must be stripe.com or *.stripe.com",
  };
  console.log("[casepathStripeDebug]", out);
  return out;
};

window.casepathStripeDebugAsync = async function casepathStripeDebugAsync() {
  var base = window.casepathStripeDebug();
  try {
    if (window.supabaseClient && window.supabaseClient.auth) {
      var r = await window.supabaseClient.auth.getSession();
      var s = r && r.data ? r.data.session : null;
      var u = s && s.user ? s.user : null;
      base.auth = base.auth || {};
      base.auth.hasSession = !!(s && s.access_token);
      base.auth.userId = u && u.id ? u.id : base.auth.userId;
      base.auth.emailVerified = u
        ? !!(u.email_confirmed_at || u.new_email_confirmed_at)
        : base.auth.emailVerified;
      base.auth.email = u && u.email ? u.email : null;
    }
  } catch (e) {
    base.authSessionError = String(e && e.message ? e.message : e);
  }
  console.log("[casepathStripeDebugAsync]", base);
  return base;
};

window.highlightPlan = function highlightPlan(feature) {
  let targetPlan = null;
  let oneTime = null;

  document.querySelectorAll(".pricing-plan-card").forEach(function (el) {
    el.classList.remove("highlight-plan");
  });
  var lawyerTeaserPre = document.getElementById("pricing-lawyer-teaser");
  if (lawyerTeaserPre) lawyerTeaserPre.classList.remove("highlight-plan");

  switch (feature) {
    case "casepack":
    case "parenting_orders":
      oneTime = "parenting_pack";
      break;

    case "document_builder":
      oneTime = "credits_1";
      targetPlan = "starter";
      break;

    case "ai_assistant":
      targetPlan = "essential";
      break;

    case "vault":
    case "case_management":
    case "vault_basic":
      targetPlan = "pro";
      break;

    case "lawyer_portal": {
      var lawyerEl = document.getElementById("pricing-lawyer-teaser");
      if (lawyerEl) {
        lawyerEl.classList.add("highlight-plan");
        lawyerEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    default:
      break;
  }

  if (targetPlan) {
    const planEl = document.querySelector('[data-plan="' + targetPlan + '"]');
    if (planEl) planEl.classList.add("highlight-plan");
  }

  if (oneTime) {
    const oneTimeEl = document.querySelector('[data-onetime="' + oneTime + '"]');
    if (oneTimeEl) {
      oneTimeEl.classList.add("highlight-plan");
      oneTimeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
};

/** After /components/pricing.html is injected (async), scroll/highlight pending plan from openPricing(). */
window.__flushPricingHighlightPending = function __flushPricingHighlightPending() {
  var ctx = window.__pricingHighlightPending;
  if (!ctx || typeof window.highlightPlan !== "function") return false;
  var root =
    document.getElementById("page-pricing") ||
    document.getElementById("page-pricing-static");
  var mount = document.getElementById("pricing-static-mount");
  var hasCards =
    (root && root.querySelector(".pricing-plan-card")) ||
    (mount && mount.querySelector(".pricing-plan-card"));
  if (!hasCards) return false;
  window.highlightPlan(ctx);
  try {
    delete window.__pricingHighlightPending;
  } catch (e) {
    window.__pricingHighlightPending = undefined;
  }
  return true;
};

try {
  var __cpRtBilling = window.CasePathRuntimeTelemetry;
  if (__cpRtBilling && typeof __cpRtBilling.track === "function") {
    __cpRtBilling.track("billing_surface_loaded", { source: "billing-checkout-lane" });
  }
} catch (_eCpBillingRt) {}

function casepathEnsureCheckoutLegalNotice() {
  try {
    if (document.getElementById("casepath-checkout-legal-notice")) return;
    var anchor =
      document.querySelector("[data-cp-checkout-sku]") ||
      document.querySelector(".plans-grid-main") ||
      document.querySelector(".pricing-root");
    if (!anchor) return;
    var host = anchor.closest(".pricing-root") || anchor.parentElement || document.body;
    var note = document.createElement("p");
    note.id = "casepath-checkout-legal-notice";
    note.className = "ppc-cancel-note";
    note.setAttribute("role", "note");
    note.style.cssText = "text-align:center;margin:0.75rem auto 1rem;max-width:40rem;";
    note.innerHTML =
      'Checkout is processed by Stripe. By continuing you agree to our ' +
      '<a href="/terms.html">Terms</a>, <a href="/privacy.html">Privacy Policy</a>, and ' +
      '<a href="/refund-policy.html">Refund Policy</a>.';
    if (host.firstChild) host.insertBefore(note, host.firstChild);
    else host.appendChild(note);
  } catch (eLegal) {}
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", casepathEnsureCheckoutLegalNotice);
  } else {
    casepathEnsureCheckoutLegalNotice();
  }
}
window.casepathEnsureCheckoutLegalNotice = casepathEnsureCheckoutLegalNotice;

/**
 * Lazy-load Stripe.js before legacy Elements UI or hosted checkout handoff.
 */
async function ensureStripeLoaded() {
  if (window.Stripe && typeof window.Stripe === "function") return;
  if (typeof window.ensureStripeLoaded === "function" && window.ensureStripeLoaded !== ensureStripeLoaded) {
    await window.ensureStripeLoaded();
    return;
  }
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src*="js.stripe.com/v3"]')) {
      var wait = function (n) {
        if (window.Stripe) {
          resolve();
          return;
        }
        if (n <= 0) {
          reject(new Error("Stripe failed to initialize"));
          return;
        }
        setTimeout(function () {
          wait(n - 1);
        }, 50);
      };
      wait(40);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = function () {
      resolve();
    };
    s.onerror = function () {
      reject(new Error("Stripe.js failed to load"));
    };
    document.head.appendChild(s);
  });
}
if (typeof window.ensureStripeLoaded !== "function") {
  window.ensureStripeLoaded = ensureStripeLoaded;
}
