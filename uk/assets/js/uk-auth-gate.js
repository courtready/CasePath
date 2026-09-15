/**
 * CasePath UK form/auth gate.
 * Public educational pages stay public. Form assistants and saved form work
 * require a signed-in CasePath account. Return URLs are allowlisted.
 */
(function (w) {
  "use strict";

  var RETURN_KEY = "casepath_uk_after_auth";
  var FORM_MESSAGE = "Create an account to use CasePath forms and save your progress.";
  var ASSISTANT_ID = /^[a-z0-9-]+$/i;
  var PROBLEM = /^[a-z0-9-]+$/i;

  function href(rel) {
    return w.CasePathUK && w.CasePathUK.href ? w.CasePathUK.href(rel) : rel;
  }

  function signedIn() {
    return !!(w.CasePathUK && w.CasePathUK.auth && w.CasePathUK.auth.isSignedIn());
  }

  function stripBase(pathname) {
    var path = String(pathname || "").replace(/\\/g, "/");
    var base = "";
    try {
      base = String((w.CasePathUK && w.CasePathUK.base && w.CasePathUK.base()) || "");
    } catch (_e) {
      base = "";
    }
    if (base && path.toLowerCase().indexOf(base.toLowerCase()) === 0) {
      path = path.slice(base.length);
    }
    return path.replace(/^\//, "");
  }

  function relFromLocation() {
    var loc = w.location || {};
    var path = stripBase(loc.pathname || "");
    var search = String(loc.search || "");
    return path + search;
  }

  function relFromHref(raw) {
    var value = String(raw || "").trim();
    if (!value) return "";
    if (/^[a-z]+:/i.test(value) || value.charAt(0) === "/" || value.indexOf("//") !== -1) {
      try {
        var abs = new URL(value, w.location.href);
        if (abs.origin !== w.location.origin) return "";
        return stripBase(abs.pathname) + abs.search;
      } catch (_e) {
        return "";
      }
    }
    return value.replace(/^\.\//, "");
  }

  function sanitiseReturn(raw) {
    var rel = relFromHref(raw).split("#")[0];
    if (!rel || /[:\\]|\/\//.test(rel) || rel.charAt(0) === "/" || rel.indexOf("..") !== -1) {
      return "";
    }
    var parts = rel.split("?");
    var path = parts[0];
    var query = parts[1] || "";
    if (path === "assistants/run.html") {
      var params;
      try {
        params = new URLSearchParams(query);
      } catch (_e2) {
        return "";
      }
      var id = String(params.get("id") || "");
      if (!ASSISTANT_ID.test(id)) return "";
      var out = "assistants/run.html?id=" + encodeURIComponent(id);
      var problem = String(params.get("problem") || "");
      if (problem) {
        if (!PROBLEM.test(problem)) return "";
        out += "&problem=" + encodeURIComponent(problem);
      }
      return out;
    }
    if (
      path === "my-case.html" ||
      path === "account.html" ||
      path === "prepare.html"
    ) {
      return path;
    }
    return "";
  }

  function rememberReturn(raw) {
    var safe = sanitiseReturn(raw);
    if (!safe) return "";
    try {
      w.sessionStorage.setItem(RETURN_KEY, safe);
    } catch (_e) { /* ignore */ }
    return safe;
  }

  function peekReturn() {
    try {
      return sanitiseReturn(w.sessionStorage.getItem(RETURN_KEY) || "");
    } catch (_e) {
      return "";
    }
  }

  function consumeReturn() {
    var safe = peekReturn();
    try {
      w.sessionStorage.removeItem(RETURN_KEY);
    } catch (_e) { /* ignore */ }
    return safe;
  }

  function isProtectedRel(raw) {
    var rel = relFromHref(raw).split("#")[0];
    var path = rel.split("?")[0];
    return path === "assistants/run.html";
  }

  function isProtectedPage() {
    return isProtectedRel(relFromLocation());
  }

  function formGateHtml() {
    return (
      '<div class="uk-auth-gate" id="uk-form-auth-gate">' +
      '<p class="uk-choice-card__kicker">Account required</p>' +
      "<h1>Sign in to continue</h1>" +
      "<p>" + FORM_MESSAGE + "</p>" +
      "<p>An account is required so your work stays with you.</p>" +
      '<p class="uk-auth-gate__actions">' +
      '<button type="button" class="cp-btn-primary" id="uk-gate-signup">Create an account</button>' +
      '<button type="button" class="cp-btn-secondary" id="uk-gate-signin">Sign in</button>' +
      "</p>" +
      '<p><a class="uk-help-link" href="' + href("get-help.html") + '">Back to Get Help</a></p>' +
      "</div>"
    );
  }

  function bindGateButtons(root) {
    if (!root) return;
    var signup = root.querySelector("#uk-gate-signup");
    var signin = root.querySelector("#uk-gate-signin");
    if (signup) {
      signup.addEventListener("click", function () {
        if (w.CasePathUK.openAuth) w.CasePathUK.openAuth("signup");
      });
    }
    if (signin) {
      signin.addEventListener("click", function () {
        if (w.CasePathUK.openAuth) w.CasePathUK.openAuth("signin");
      });
    }
  }

  function paintFormGate(root) {
    if (!root) return;
    rememberReturn(relFromLocation());
    root.innerHTML = formGateHtml();
    bindGateButtons(root);
    if (w.CasePathUK.openAuth) w.CasePathUK.openAuth("signup");
  }

  function afterAuthNavigate() {
    var next = consumeReturn();
    if (!next) return false;
    var here = relFromLocation();
    if (sanitiseReturn(here) === next) return false;
    w.location.href = href(next);
    return true;
  }

  function interceptProtectedClicks(d) {
    if (!d || d.documentElement.getAttribute("data-uk-form-gate") === "1") return;
    d.documentElement.setAttribute("data-uk-form-gate", "1");
    d.addEventListener("click", function (ev) {
      if (signedIn()) return;
      var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!a) return;
      var rel = relFromHref(a.getAttribute("href"));
      if (!isProtectedRel(rel)) return;
      ev.preventDefault();
      rememberReturn(rel);
      if (w.CasePathUK.openAuth) w.CasePathUK.openAuth("signup");
    });
  }

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.gate = {
    FORM_MESSAGE: FORM_MESSAGE,
    RETURN_KEY: RETURN_KEY,
    signedIn: signedIn,
    sanitiseReturn: sanitiseReturn,
    rememberReturn: rememberReturn,
    peekReturn: peekReturn,
    consumeReturn: consumeReturn,
    isProtectedRel: isProtectedRel,
    isProtectedPage: isProtectedPage,
    relFromLocation: relFromLocation,
    paintFormGate: paintFormGate,
    afterAuthNavigate: afterAuthNavigate,
    interceptProtectedClicks: interceptProtectedClicks,
  };
})(window);
