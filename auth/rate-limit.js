/**
 * Lightweight client-side rate limiting for auth-adjacent UX (Phase 3).
 * Does not replace server-side enforcement.
 */
(function (global) {
  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  var DEFAULTS = {
    login: { max: 12, windowMs: 15 * 60 * 1000 },
    password_reset: { max: 5, windowMs: 60 * 60 * 1000 },
    resend_verification: { max: 4, windowMs: 60 * 60 * 1000 },
  };

  function storageKey(action) {
    return "cr_rl_" + String(action || "default");
  }

  function readTimestamps(action) {
    try {
      var raw = global.localStorage.getItem(storageKey(action));
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeTimestamps(action, ts) {
    try {
      global.localStorage.setItem(storageKey(action), JSON.stringify(ts));
    } catch (e) {
      /* ignore quota / private mode */
    }
  }

  /**
   * @returns {{ ok: boolean, retryAfterMs?: number }}
   */
  function allow(action, opts) {
    var cfg = opts || DEFAULTS[action] || { max: 10, windowMs: 10 * 60 * 1000 };
    var now = Date.now();
    var windowMs = cfg.windowMs || 10 * 60 * 1000;
    var max = cfg.max || 10;
    var ts = readTimestamps(action).filter(function (t) {
      return now - t < windowMs;
    });
    if (ts.length >= max) {
      var oldest = ts[0];
      return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
    }
    ts.push(now);
    writeTimestamps(action, ts);
    return { ok: true };
  }

  NS.rateLimit = NS.rateLimit || {};
  NS.rateLimit.allow = allow;
  NS.rateLimit.defaults = DEFAULTS;
})(typeof window !== "undefined" ? window : this);
