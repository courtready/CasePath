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

  /**
   * Reload the SPA shell without using "/" alone. Many local static servers
   * (e.g. Live Server) serve the app at /index.html while "/" lists the folder
   * or returns 404 — after sign-in, replace("/") then looks like "can't sign in".
   */
  function stableShellPath() {
    try {
      var p = String(global.location.pathname || "/");
      var h = String(global.location.hostname || "").toLowerCase();
      var isLocal =
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "[::1]" ||
        h === "::1";
      if (/index\.html$/i.test(p)) return p;
      if (isLocal && (p === "/" || p === "")) {
        try {
          var port = String(global.location.port || "");
          /* Documented dev server (see app.js file:// gate): http://localhost:3000 — "/" usually serves the SPA */
          if (h === "localhost" && (port === "3000" || port === "3001")) return "/";
        } catch (e2) {
          /* ignore */
        }
        return "/index.html";
      }
      if (p === "/" || p === "") return "/";
      var slash = p.lastIndexOf("/");
      if (slash > 0) {
        return p.slice(0, slash + 1) + "index.html";
      }
    } catch (e) {
      /* ignore */
    }
    return "/index.html";
  }

  function safeStableShell() {
    safeRedirect(stableShellPath());
  }

  NS.redirect = NS.redirect || {};
  NS.redirect.safe = safeRedirect;
  NS.redirect.safeAssignHref = safeAssignHref;
  NS.redirect.sanitiseRelativePath = sanitiseRelativePath;
  NS.redirect.stableShellPath = stableShellPath;
  NS.redirect.safeStableShell = safeStableShell;
})(typeof window !== "undefined" ? window : this);
