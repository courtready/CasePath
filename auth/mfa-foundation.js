/**
 * MFA (TOTP) foundation — hooks only; do not enable by default (Phase 3).
 * Uses existing window.mfaEnrollTotp / window.mfaChallengeAndVerify from assets/js/auth.js when present.
 */
(function (global) {
  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  NS.mfa = {
    /** Flip to true only when product enables MFA enforcement server-side. */
    enforcementEnabled: false,

    isSupported: function () {
      return !!(
        global.supabaseClient &&
        global.supabaseClient.auth &&
        global.supabaseClient.auth.mfa
      );
    },

    enrollTotp: function () {
      if (typeof global.mfaEnrollTotp === "function") {
        return global.mfaEnrollTotp();
      }
      return Promise.reject(new Error("MFA enroll is not available on this build."));
    },

    verifyTotp: function (factorId, code) {
      if (typeof global.mfaChallengeAndVerify === "function") {
        return global.mfaChallengeAndVerify(factorId, code);
      }
      return Promise.reject(new Error("MFA verify is not available on this build."));
    },
  };
})(typeof window !== "undefined" ? window : this);
