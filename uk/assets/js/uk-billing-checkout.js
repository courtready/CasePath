/**
 * UK checkout client. Sends only a known SKU to the AU Stripe Edge function
 * using the global CasePath Auth JWT. Does not grant entitlement on success URL.
 */
(function (w) {
  "use strict";

  var CHECKOUT_URL = "https://zcjpqsekucmmjdnykcuu.supabase.co/functions/v1/create-checkout-session";
  var PORTAL_URL = "https://zcjpqsekucmmjdnykcuu.supabase.co/functions/v1/create-billing-portal-session";
  var STATUS_URL = "https://zcjpqsekucmmjdnykcuu.supabase.co/functions/v1/billing-status";
  var ALLOWED = {
    uk_individual_1m: true,
    uk_individual_3m: true,
    uk_individual_6m: true,
    uk_individual_12m: true
  };

  function toast(message) {
    var text = String(message || "Checkout could not start.");
    var id = "casepath-uk-checkout-toast";
    try {
      var prev = document.getElementById(id);
      if (prev) prev.remove();
    } catch (_e) {}
    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.setAttribute("role", "alert");
    wrap.style.cssText =
      "position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);max-width:min(28rem,calc(100% - 2rem));z-index:2147483647;" +
      "background:#1e2420;color:#fffef9;padding:1rem 1.15rem;border-radius:12px;font:16px/1.5 system-ui,sans-serif;";
    wrap.textContent = text;
    (document.body || document.documentElement).appendChild(wrap);
    setTimeout(function () {
      try { wrap.remove(); } catch (_e2) {}
    }, 12000);
  }

  function stripeHosted(url) {
    try {
      var u = new URL(String(url || ""));
      return u.protocol === "https:" && (u.hostname === "stripe.com" || u.hostname.slice(-11) === ".stripe.com");
    } catch (_e) {
      return false;
    }
  }

  async function openPricingCheckout(sku) {
    sku = String(sku || "").trim();
    if (!ALLOWED[sku]) {
      toast("That plan is not available for UK checkout.");
      return;
    }
    var auth = w.CasePathUK && w.CasePathUK.auth;
    if (!auth) {
      toast("Sign-in is not ready yet. Refresh and try again.");
      return;
    }
    if (typeof auth.init === "function") {
      try { await auth.init(); } catch (_e) {}
    }
    if (!auth.isSignedIn || !auth.isSignedIn()) {
      toast("Please sign in to continue to checkout.");
      if (w.CasePathUK.openAuth) w.CasePathUK.openAuth("signin");
      return;
    }
    var user = auth.getUser ? auth.getUser() : {};
    if (user && user.signedIn && user.emailConfirmed === false) {
      toast("Please verify your email before purchasing, then try again.");
      return;
    }
    var token = auth.getAccessToken ? auth.getAccessToken() : "";
    if (!token) {
      toast("Please sign in to continue to checkout.");
      return;
    }
    var returnPath = (w.location && w.location.pathname) || "/pricing.html";
    var res;
    try {
      res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: auth.GLOBAL_ANON_KEY || "",
        },
        body: JSON.stringify({ sku: sku, return_path: returnPath }),
      });
    } catch (_err) {
      toast("Could not reach the checkout server. Please try again.");
      return;
    }
    var data = {};
    try { data = await res.json(); } catch (_e2) { data = {}; }
    if (!res.ok || !data.url || !stripeHosted(data.url)) {
      toast((data && data.error) || "Checkout could not start.");
      return;
    }
    w.location.href = data.url;
  }

  async function openBillingPortal() {
    var auth = w.CasePathUK && w.CasePathUK.auth;
    if (!auth || !auth.getAccessToken) return;
    if (typeof auth.init === "function") {
      try { await auth.init(); } catch (_e) {}
    }
    var token = auth.getAccessToken();
    if (!token) {
      toast("Please sign in to manage a recurring subscription.");
      return;
    }
    var res;
    try {
      res = await fetch(PORTAL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: auth.GLOBAL_ANON_KEY || "",
        },
        body: JSON.stringify({
          jurisdiction: "uk",
          return_path: (w.location && w.location.pathname) || "/account.html",
        }),
      });
    } catch (_err) {
      toast("Could not open the billing portal.");
      return;
    }
    var data = {};
    try { data = await res.json(); } catch (_e2) { data = {}; }
    if (!res.ok || !data.url || !stripeHosted(data.url)) {
      toast((data && data.error) || "There is no recurring subscription to manage.");
      return;
    }
    w.location.href = data.url;
  }

  async function loadBillingStatus(host) {
    if (!host) return;
    var auth = w.CasePathUK && w.CasePathUK.auth;
    if (!auth || !auth.isSignedIn || !auth.isSignedIn()) {
      host.hidden = true;
      return;
    }
    var token = auth.getAccessToken ? auth.getAccessToken() : "";
    if (!token) return;
    var res;
    try {
      res = await fetch(STATUS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: auth.GLOBAL_ANON_KEY || "",
        },
        body: JSON.stringify({ jurisdiction: "uk" }),
      });
    } catch (_e) {
      return;
    }
    var data = {};
    try { data = await res.json(); } catch (_e2) { return; }
    if (!res.ok || !data || !data.ok) return;
    var ent = data.entitlement;
    var manage = "";
    if (ent && ent.billing_model === "subscription") {
      manage = "<p><button type='button' class='cp-btn-secondary' data-uk-billing-portal='1'>Manage or cancel recurring subscription</button></p>";
    } else if (ent && ent.billing_model === "one_off") {
      manage = "<p>This recorded access is not a recurring subscription, so there is no subscription to cancel here.</p>";
    }
    host.hidden = false;
    host.innerHTML =
      "<h2>Your billing</h2>" +
      "<p><strong>" + String(data.message || "") + "</strong></p>" +
      "<p>Recorded plan: " + (ent && ent.plan ? ent.plan : "None yet") + "</p>" +
      "<p>Status: " + (ent && ent.status ? ent.status : "None recorded") + "</p>" +
      manage;
  }

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.openPricingCheckout = openPricingCheckout;
  w.CasePathUK.openBillingPortal = openBillingPortal;
  w.CasePathUK.loadBillingStatus = loadBillingStatus;
})(window);
