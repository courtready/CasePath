/**
 * Thin UK auth client against GLOBAL CasePath Auth (zcjpqsekucmmjdnykcuu).
 * Does not talk to UK Auth. Does not load AU billing, vault, cases, or MFA.
 */
(function (w) {
  "use strict";

  var GLOBAL_AUTH_URL = "https://zcjpqsekucmmjdnykcuu.supabase.co";
  var GLOBAL_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanBxc2VrdWNtbWpkbnlrY3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzgzODIsImV4cCI6MjA4NzkxNDM4Mn0.WP0DfVYLZHaKmAvEMh9VOshfprJ3cTtYUJAGvPfGyL8";
  var GLOBAL_PUBLISHABLE_KEY = "sb_publishable_0ZKJVGbPNnOWf5dsnerUjw_PplPjkY-";
  var UK_FUNCTIONS_URL = "https://fvxszjcocqcrymvejezc.supabase.co/functions/v1/uk-state";
  var UK_ADMIN_FUNCTIONS_URL = "https://fvxszjcocqcrymvejezc.supabase.co/functions/v1/uk-admin";
  var UK_INBOX_FUNCTIONS_URL = "https://fvxszjcocqcrymvejezc.supabase.co/functions/v1/uk-inbox";
  var UK_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eHN6amNvY3FjcnltdmVqZXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MDA3MDAsImV4cCI6MjEwMzM3NjcwMH0.tFZZm8lHW5rgjJFXRLFdW1772uCXoKUzVH4Ea7howMU";
  var TURNSTILE_SITE_KEY = "0x4AAAAAADUYDl4M5bsDNyNJ";
  var PASSWORD_MIN = 12;
  var SUPABASE_UMD =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.4/dist/umd/supabase.js";
  var SUPABASE_SRI = "sha384-7SfFUrg31wOnGWBLLniKFCNmCSguYA5wI1WPDOt7kP/mom4R9/0pwghVEnv0uwYP";

  var client = null;
  var session = null;
  var listeners = [];
  var initPromise = null;

  function href(rel) {
    return w.CasePathUK && w.CasePathUK.href ? w.CasePathUK.href(rel) : rel;
  }

  function callbackUrl() {
    var rel = href("auth-callback.html");
    if (!/^\//.test(rel)) rel = "/" + rel;
    return w.location.origin + rel;
  }

  function loadScript(src, integrity) {
    return new Promise(function (resolve, reject) {
      if (w.supabase && typeof w.supabase.createClient === "function") {
        resolve();
        return;
      }
      var existing = document.querySelector('script[data-uk-supabase-js="1"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () { reject(new Error("auth-library")); });
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.dataset.ukSupabaseJs = "1";
      if (integrity) {
        s.integrity = integrity;
        s.crossOrigin = "anonymous";
      }
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("auth-library")); };
      document.head.appendChild(s);
    });
  }

  function humanAuthError(err) {
    var msg = String((err && (err.message || err.error_description || err.error)) || "");
    var low = msg.toLowerCase();
    if (/captcha|turnstile/.test(low)) return "Please complete the security check and try again.";
    if (/invalid login|invalid credentials/.test(low)) return "That email or password is not recognised.";
    if (/email not confirmed|not confirmed/.test(low)) return "Please confirm your email, then sign in.";
    if (/already registered|already been registered/.test(low)) return "That email already has a CasePath account. Sign in instead.";
    if (/password/.test(low) && /least|character|weak/.test(low)) {
      return "Use at least 12 characters, including upper and lower case, a number, and a symbol.";
    }
    if (/rate limit|too many/.test(low)) return "Too many attempts. Please wait a minute and try again.";
    if (msg) return "We could not complete that just now. Please try again.";
    return "Something went wrong. Please try again.";
  }

  function passwordPolicyError(password) {
    var p = String(password || "");
    if (p.length < PASSWORD_MIN) {
      return "Use at least 12 characters, including upper and lower case, a number, and a symbol.";
    }
    if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
      return "Use at least 12 characters, including upper and lower case, a number, and a symbol.";
    }
    return "";
  }

  function emit() {
    var snapshot = api.getUser();
    listeners.forEach(function (fn) {
      try { fn(snapshot); } catch (_e) { /* ignore */ }
    });
    try {
      w.dispatchEvent(new CustomEvent("casepath-uk-auth", { detail: snapshot }));
    } catch (_e2) { /* ignore */ }
  }

  function applySession(next) {
    session = next || null;
    emit();
  }

  async function createClient() {
    await loadScript(SUPABASE_UMD, SUPABASE_SRI);
    var lib = w.supabase;
    if (!lib || typeof lib.createClient !== "function") throw new Error("auth-library");
    client = lib.createClient(GLOBAL_AUTH_URL, GLOBAL_PUBLISHABLE_KEY || GLOBAL_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
    client.auth.onAuthStateChange(function (event, next) {
      applySession(next);
      if (event === "PASSWORD_RECOVERY") {
        try { w.sessionStorage.setItem("casepath_uk_password_recovery", "1"); } catch (_e) {}
        var here = String((w.location && w.location.pathname) || "").toLowerCase();
        if (here.indexOf("auth-callback") === -1) {
          w.location.href = href("auth-callback.html") + "#recovery";
        }
      }
    });
    var current = await client.auth.getSession();
    applySession(current && current.data ? current.data.session : null);
    await ingestRecoveryHash();
    return client;
  }

  /**
   * PKCE detectSessionInUrl looks for ?code= and ignores implicit recovery
   * hashes from Auth verify redirects (access_token + type=recovery).
   * Without this ingest, the UK reset form shows but Save password fails.
   */
  async function ingestRecoveryHash() {
    if (!client) return;
    var hash = "";
    try {
      hash = String((w.location && w.location.hash) || "").replace(/^#/, "");
    } catch (_e) {
      return;
    }
    if (!hash) return;
    var params;
    try {
      params = new URLSearchParams(hash);
    } catch (_e2) {
      return;
    }
    if (String(params.get("type") || "").toLowerCase() !== "recovery") return;
    var access = params.get("access_token") || "";
    var refresh = params.get("refresh_token") || "";
    if (!access || !refresh) return;
    try {
      var recovered = await client.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (recovered && recovered.data && recovered.data.session) {
        applySession(recovered.data.session);
        try { w.sessionStorage.setItem("casepath_uk_password_recovery", "1"); } catch (_e3) {}
      }
    } catch (_e4) { /* form remains; updatePassword reports failure */ }
  }

  function captchaToken(mode) {
    if (!w.CasePathUK || !w.CasePathUK.turnstile) return Promise.resolve("");
    return w.CasePathUK.turnstile.token(mode || "signin");
  }

  var api = {
    GLOBAL_AUTH_URL: GLOBAL_AUTH_URL,
    GLOBAL_ANON_KEY: GLOBAL_ANON_KEY,
    UK_FUNCTIONS_URL: UK_FUNCTIONS_URL,
    UK_ADMIN_FUNCTIONS_URL: UK_ADMIN_FUNCTIONS_URL,
    UK_INBOX_FUNCTIONS_URL: UK_INBOX_FUNCTIONS_URL,
    UK_ANON_KEY: UK_ANON_KEY,
    TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY,
    PASSWORD_MIN: PASSWORD_MIN,
    callbackUrl: callbackUrl,
    humanError: humanAuthError,
    passwordPolicyError: passwordPolicyError,
    init: function () {
      if (initPromise) return initPromise;
      initPromise = createClient().catch(function (err) {
        initPromise = null;
        throw err;
      });
      return initPromise;
    },
    getClient: function () { return client; },
    getSession: function () { return session; },
    getAccessToken: function () {
      return session && session.access_token ? session.access_token : "";
    },
    getUser: function () {
      var user = session && session.user ? session.user : null;
      if (!user) return { signedIn: false, user: null, email: "", id: "" };
      return {
        signedIn: true,
        user: user,
        email: String(user.email || ""),
        id: String(user.id || ""),
        emailConfirmed: !!(user.email_confirmed_at || user.confirmed_at),
      };
    },
    isSignedIn: function () { return !!(session && session.user); },
    onChange: function (fn) {
      if (typeof fn === "function") listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (x) { return x !== fn; });
      };
    },
    signUp: async function (email, password, opts) {
      var policy = passwordPolicyError(password);
      if (policy) return { ok: false, error: policy };
      if (!opts || !opts.termsAccepted) {
        return { ok: false, error: "Please read and accept the Terms of Use to continue." };
      }
      await api.init();
      var token = await captchaToken("signup");
      var result = await client.auth.signUp({
        email: String(email || "").trim(),
        password: String(password || ""),
        options: {
          emailRedirectTo: callbackUrl(),
          captchaToken: token,
          data: { terms_accepted: true, terms_accepted_at: new Date().toISOString() },
        },
      });
      if (result.error) return { ok: false, error: humanAuthError(result.error) };
      applySession(result.data && result.data.session);
      return {
        ok: true,
        needsConfirmation: !(result.data && result.data.session),
        user: result.data && result.data.user,
      };
    },
    signIn: async function (email, password) {
      await api.init();
      var token = await captchaToken("signin");
      var result = await client.auth.signInWithPassword({
        email: String(email || "").trim(),
        password: String(password || ""),
        options: { captchaToken: token },
      });
      if (result.error) return { ok: false, error: humanAuthError(result.error) };
      applySession(result.data && result.data.session);
      return { ok: true, user: result.data && result.data.user };
    },
    signOut: async function () {
      await api.init();
      try { await client.auth.signOut(); } catch (_e) { /* still clear local session */ }
      applySession(null);
      return { ok: true };
    },
    forgotPassword: async function (email) {
      await api.init();
      var token = await captchaToken("recovery");
      var result = await client.auth.resetPasswordForEmail(String(email || "").trim(), {
        redirectTo: callbackUrl(),
        captchaToken: token,
      });
      if (result.error) return { ok: false, error: humanAuthError(result.error) };
      return { ok: true };
    },
    updatePassword: async function (password) {
      var policy = passwordPolicyError(password);
      if (policy) return { ok: false, error: policy };
      await api.init();
      var result = await client.auth.updateUser({ password: String(password || "") });
      if (result.error) return { ok: false, error: humanAuthError(result.error) };
      try { w.sessionStorage.removeItem("casepath_uk_password_recovery"); } catch (_e) {}
      return { ok: true };
    },
    resendConfirmation: async function (email) {
      await api.init();
      var token = await captchaToken("signup");
      var result = await client.auth.resend({
        type: "signup",
        email: String(email || "").trim(),
        options: { emailRedirectTo: callbackUrl(), captchaToken: token },
      });
      if (result.error) return { ok: false, error: humanAuthError(result.error) };
      return { ok: true };
    },
  };

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.auth = api;
})(window);
