/**
 * Central route / feature guards (Phase 3).
 * Authentication authority: Supabase session via window.authState + syncUser mirror.
 */
(function (global) {
  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  var EMAIL_GATED = {
    vault: true,
    document_builder: true,
    parenting_orders: true,
    lawyer_portal: true,
    ai_assistant: true, // TODO(production-gating): tie to paid Case Assistant entitlement when billing is enforced.
    document_generation: true,
  };

  function supabaseAuthedSync() {
    try {
      if (global.__crAuthHydrated && global.authState && global.authState.isAuthenticated) {
        return true;
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (typeof global.crSupabaseAuthed === "function") {
        return !!global.crSupabaseAuthed();
      }
    } catch (e2) {
      /* ignore */
    }
    return false;
  }

  function showVerifyEmailInline() {
    var err = global.document && global.document.getElementById("signin-error");
    var msg =
      "Please verify your email before using this part of CasePath. Check your inbox and spam folder, then use Resend if needed.";
    if (typeof global.openAuth === "function") {
      try {
        global.openAuth("signin");
      } catch (e) {
        /* ignore */
      }
    }
    if (err) {
      err.textContent = msg;
      err.style.display = "";
    } else {
      try {
        global.alert(msg);
      } catch (e2) {
        /* ignore */
      }
    }
  }

  /**
   * @param {string} feature - logical feature key (matches requireAuth / hasAccess names)
   * @returns {boolean}
   */
  NS.requireVerifiedSessionForFeature = function (feature) {
    if (!supabaseAuthedSync()) {
      if (typeof global.openAuth === "function") {
        try {
          global.openAuth("signin");
        } catch (e) {
          /* ignore */
        }
      }
      return false;
    }
    if (EMAIL_GATED[feature] && typeof NS.isEmailVerified === "function" && !NS.isEmailVerified()) {
      showVerifyEmailInline();
      return false;
    }
    return true;
  };

  /**
   * Document Helper generation entry (inline onclick).
   */
  NS.guardDocumentGeneration = function () {
    return NS.requireVerifiedSessionForFeature("document_generation");
  };

  NS.routeGuard = NS.routeGuard || {};
  NS.routeGuard.requireVerifiedSessionForFeature = NS.requireVerifiedSessionForFeature;
})(typeof window !== "undefined" ? window : this);
