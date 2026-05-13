/**
 * Session lifecycle helpers (Phase 3). Listeners are wired from assets/js/app.js
 * to avoid duplicate supabase.auth.onAuthStateChange subscriptions.
 */
(function (global) {
  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  NS.session = NS.session || {};

  NS.session.clearPendingRedirects = function () {
    try {
      global.sessionStorage.removeItem("cr_after_auth_url");
      global.sessionStorage.removeItem("cr_pending_page");
    } catch (e) {
      /* ignore */
    }
    try {
      global.sessionStorage.removeItem("cr_target_page");
    } catch (e2) {
      /* ignore */
    }
  };

  /**
   * Hard logout: clear client hints, sign out globally when supported, then same-origin home.
   */
  NS.session.hardLogout = async function () {
    NS.session.clearPendingRedirects();
    try {
      global.localStorage.removeItem("cr_user");
      global.localStorage.removeItem("courtready_user");
    } catch (e) {
      /* ignore */
    }
    if (typeof NS.clearAuthState === "function") {
      NS.clearAuthState("SIGNED_OUT");
    }
    try {
      if (global.supabaseClient && global.supabaseClient.auth) {
        if (typeof global.supabaseClient.auth.signOut === "function") {
          try {
            await global.supabaseClient.auth.signOut({ scope: "global" });
          } catch (e1) {
            await global.supabaseClient.auth.signOut();
          }
        }
      }
    } catch (e2) {
      console.warn("CasePathAuth.session.hardLogout: signOut failed", e2);
    }
    if (NS.redirect && typeof NS.redirect.safe === "function") {
      NS.redirect.safe("/");
    } else {
      try {
        global.location.replace("/");
      } catch (e3) {
        /* ignore */
      }
    }
  };

  NS.session.handleRefreshFailure = async function () {
    console.warn("CasePathAuth: session refresh failed — forcing hard logout");
    await NS.session.hardLogout();
  };

  NS.session.hydrateFromGetSession = async function () {
    if (!global.supabaseClient || !global.supabaseClient.auth) {
      if (typeof NS.clearAuthState === "function") NS.clearAuthState();
      try {
        global.__crAuthHydrated = true;
      } catch (e) {
        /* ignore */
      }
      return null;
    }
    try {
      var res = await global.supabaseClient.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (typeof NS.applySession === "function") {
        NS.applySession(session, "INITIAL_SESSION");
      }
      try {
        global.__crAuthHydrated = true;
      } catch (e2) {
        /* ignore */
      }
      return session;
    } catch (err) {
      console.warn("CasePathAuth.session.hydrateFromGetSession", err);
      if (typeof NS.clearAuthState === "function") NS.clearAuthState("SESSION_ERROR");
      try {
        global.__crAuthHydrated = true;
      } catch (e3) {
        /* ignore */
      }
      return null;
    }
  };
})(typeof window !== "undefined" ? window : this);
