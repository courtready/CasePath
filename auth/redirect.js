/**
 * Same-origin safe navigation helper (Phase 3).
 * Blocks absolute URLs, protocol-relative URLs, and dangerous schemes.
 */
(function (global) {
  var NS = (global.CasePathAuth = global.CasePathAuth || {});

  function trimPath(s) {
    return String(s || "").trim();
  }

  /**
   * @param {string} path - Relative path only (e.g. "/", "/index.html", "/document-centre.html")
   * @returns {string|null} Sanitised path or null if unsafe
   */
  function sanitiseRelativePath(path) {
    var p = trimPath(path);
    if (!p) return null;
    var lower = p.toLowerCase();
    if (
      lower.indexOf("javascript:") === 0 ||
      lower.indexOf("data:") === 0 ||
      lower.indexOf("vbscript:") === 0
    ) {
      return null;
    }
    if (/^https?:\/\//i.test(p)) return null;
    if (/^\/\//.test(p)) return null;
    if (!p.startsWith("/")) return null;
    if (p.indexOf("//") !== -1 && p.indexOf("//") < 8) return null;
    return p;
  }

  function safeRedirect(path) {
    var safe = sanitiseRelativePath(path);
    if (!safe) {
      console.warn("CasePathAuth.safeRedirect: blocked unsafe path", path);
      safe = "/";
    }
    try {
      global.location.replace(safe);
    } catch (e) {
      try {
        global.location.href = safe;
      } catch (e2) {
        console.warn("CasePathAuth.safeRedirect: navigation failed", e2);
      }
    }
  }

  function safeAssignHref(path) {
    var safe = sanitiseRelativePath(path);
    if (!safe) {
      console.warn("CasePathAuth.safeAssignHref: blocked unsafe path", path);
      return false;
    }
    try {
      global.location.href = safe;
      return true;
    } catch (e) {
      console.warn("CasePathAuth.safeAssignHref: failed", e);
      return false;
    }
  }

  NS.redirect = NS.redirect || {};
  NS.redirect.safe = safeRedirect;
  NS.redirect.safeAssignHref = safeAssignHref;
  NS.redirect.sanitiseRelativePath = sanitiseRelativePath;
})(typeof window !== "undefined" ? window : this);
