(function () {
  /**
   * Active CasePath production Supabase: ref zcjpqsekucmmjdnykcuu (host below). Edge Functions use
   * the same project via Supabase dashboard secrets (SUPABASE_URL / keys). Other Supabase projects
   * may exist for history or testing elsewhere in the org; this file is the browser runtime source of truth.
   */
  var CANONICAL_ACTIVE_SUPABASE_REF = "zcjpqsekucmmjdnykcuu";
  var supabaseUrl = "https://zcjpqsekucmmjdnykcuu.supabase.co";
  var supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanBxc2VrdWNtbWpkbnlrY3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzgzODIsImV4cCI6MjA4NzkxNDM4Mn0.WP0DfVYLZHaKmAvEMh9VOshfprJ3cTtYUJAGvPfGyL8";

  function parseSupabaseProjectRefFromUrl(url) {
    try {
      var m = String(url || "").match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
      return m ? String(m[1]).toLowerCase() : null;
    } catch (_e) {
      return null;
    }
  }

  var activeRefFromUrl = parseSupabaseProjectRefFromUrl(supabaseUrl);
  console.log("[AUTH] Active Supabase Project Ref: " + (activeRefFromUrl || "(unparsed)"));
  if (activeRefFromUrl && activeRefFromUrl !== String(CANONICAL_ACTIVE_SUPABASE_REF).toLowerCase()) {
    console.error(
      "[AUTH] Supabase project ref mismatch: CasePath active runtime must use ref " +
        CANONICAL_ACTIVE_SUPABASE_REF +
        " but SUPABASE URL hostname resolves to " +
        activeRefFromUrl +
        ". Fix assets/js/supabase.js before shipping."
    );
  } else if (supabaseUrl && !activeRefFromUrl) {
    console.error(
      "[AUTH] Supabase URL is set but not a valid https://<ref>.supabase.co URL; expected ref " +
        CANONICAL_ACTIVE_SUPABASE_REF +
        "."
    );
  }

  console.log("[AUTH] Supabase bootstrap starting");

  try {
    var _cspMeta =
      typeof document !== "undefined" &&
      document.querySelector &&
      document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    console.log("[AUTH] startup config", {
      SUPABASE_URL_present: !!supabaseUrl,
      SUPABASE_ANON_KEY_present: !!supabaseKey,
      origin: typeof window !== "undefined" && window.location ? window.location.origin : "(n/a)",
      cspMetaPresent: !!_cspMeta,
      cspNote: _cspMeta
        ? "meta CSP tag present (may combine with server headers)"
        : "no meta CSP in DOM (server Header CSP only)",
    });
  } catch (_cfgErr) {
    console.warn("[AUTH] startup config log failed", _cfgErr && _cfgErr.message ? _cfgErr.message : _cfgErr);
  }

  function probeAuthSettingsConnectivity() {
    if (window.__casepathAuthConnectivityProbed) return;
    window.__casepathAuthConnectivityProbed = true;
    var base = String(supabaseUrl || "").replace(/\/$/, "");
    if (!base) return;
    var url = base + "/auth/v1/settings";
    fetch(url, { method: "GET", credentials: "omit", cache: "no-store" })
      .then(function (res) {
        if (res && res.ok) console.log("[AUTH] Supabase URL OK");
        else console.warn("[AUTH] Supabase connectivity FAILED", { status: res ? res.status : "no response" });
      })
      .catch(function (e) {
        console.warn("[AUTH] Supabase connectivity FAILED", e && e.message ? e.message : e);
      });
  }

  function getCreateClient() {
    var lib = typeof window !== "undefined" ? window.supabase : null;
    if (!lib) return null;
    if (typeof lib.createClient === "function") return lib.createClient;
    if (lib.default && typeof lib.default.createClient === "function") return lib.default.createClient;
    return null;
  }

  function initSupabaseClient() {
    if (window.supabaseClient) return true;
    var createClient = getCreateClient();
    if (!createClient) {
      console.error(
        "[AUTH] Supabase client not created: library did not load (no createClient on window.supabase). Is the CDN script blocked?"
      );
      return false;
    }
    var client;
    try {
      client = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error("[AUTH] Supabase client not created: createClient() failed", e);
      return false;
    }
    window.SUPABASE_PROJECT_URL = supabaseUrl;
    window.SUPABASE_ANON_KEY = supabaseKey;
    window.supabaseClient = client;
    window.casepathSupabase = client;
    console.log("[AUTH] Supabase client created");
    probeAuthSettingsConnectivity();
    return true;
  }

  function logAuthStripeAndEnvironment() {
    try {
      var pk =
        typeof window !== "undefined" && window.CASEPATH_STRIPE_PUBLISHABLE_KEY
          ? String(window.CASEPATH_STRIPE_PUBLISHABLE_KEY).trim()
          : "";
      var stripeMode = "unknown";
      if (/^pk_live_/.test(pk)) stripeMode = "live";
      else if (/^pk_test_/.test(pk)) stripeMode = "test";
      console.log("[AUTH] Stripe mode: " + stripeMode);

      var h =
        typeof window !== "undefined" && window.location && window.location.hostname
          ? String(window.location.hostname)
          : "";
      var envLabel = "unknown";
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(h)) envLabel = "local";
      else if (h) envLabel = "production";
      console.log("[AUTH] Environment: " + envLabel);
    } catch (e) {
      console.warn("[AUTH] Stripe/environment log failed", e && e.message ? e.message : e);
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", logAuthStripeAndEnvironment);
    } else {
      logAuthStripeAndEnvironment();
    }
  }

  window.initSupabaseClient = initSupabaseClient;
  initSupabaseClient();
})();
