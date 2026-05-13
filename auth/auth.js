/**
 * Global auth view-model derived from Supabase session (Phase 3).
 * Entitlements (plan, credits) remain server-backed via members table — never trust localStorage.
 */
(function (global) {
  global.authState = global.authState || {
    user: null,
    session: null,
    isAuthenticated: false,
    emailVerified: false,
    loading: true,
    lastEvent: null,
    updatedAt: 0,
  };

  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  function userEmailVerified(user) {
    if (!user) return false;
    return !!(user.email_confirmed_at || user.new_email_confirmed_at);
  }

  NS.applySession = function (session, eventName) {
    var s = session || null;
    var u = s && s.user ? s.user : null;
    global.authState.session = s;
    global.authState.user = u;
    global.authState.isAuthenticated = !!u;
    global.authState.emailVerified = userEmailVerified(u);
    global.authState.loading = false;
    global.authState.lastEvent = eventName || null;
    global.authState.updatedAt = Date.now();
  };

  NS.clearAuthState = function (eventName) {
    global.authState.session = null;
    global.authState.user = null;
    global.authState.isAuthenticated = false;
    global.authState.emailVerified = false;
    global.authState.loading = false;
    global.authState.lastEvent = eventName || "SIGNED_OUT";
    global.authState.updatedAt = Date.now();
  };

  NS.isEmailVerified = function () {
    if (global.authState && global.authState.user) {
      return !!global.authState.emailVerified;
    }
    try {
      var cu = global.currentUser;
      if (cu && typeof cu.emailVerified === "boolean") return cu.emailVerified;
    } catch (e) {
      /* ignore */
    }
    return false;
  };
})(typeof window !== "undefined" ? window : this);
