/**
 * CasePath UK path helper.
 * Resolves the demo/product base when UK is:
 *   - site root (production: casepath.co.uk)
 *   - /UKdemo/ (local CasePath server on port 3333)
 *   - /uk/ (repository folder, not the public demo URL)
 */
(function (w) {
  "use strict";

  var SEARCH_KEY = "casepath_uk_glossary_q";
  var ASSET_V = "20260907ukfaq1";

  function pathname() {
    return String((w.location && w.location.pathname) || "/").replace(/\\/g, "/");
  }

  function base() {
    var path = pathname();
    var lower = path.toLowerCase();
    var markers = ["/ukdemo/", "/uk/"];
    var i;
    for (i = 0; i < markers.length; i++) {
      var idx = lower.indexOf(markers[i]);
      if (idx !== -1) return path.slice(0, idx + markers[i].length);
    }
    if (/\/ukdemo$/i.test(path)) return path + "/";
    if (/\/uk$/i.test(path)) return path + "/";
    if (/\/(assistants|checklists|legal|forms|tell-me-more|info|admin)\//i.test(path)) {
      return path.replace(/\/(assistants|checklists|legal|forms|tell-me-more|info|admin)\/.*$/i, "/");
    }
    return path.replace(/\/[^/]*$/, "/") || "/";
  }

  function join(rel) {
    var b = base();
    var r = String(rel || "").replace(/^\//, "");
    if (!b.endsWith("/")) b += "/";
    return b + r;
  }

  function home() {
    return join("");
  }

  function saveSearch(query) {
    try {
      var q = String(query || "").trim();
      if (q) w.sessionStorage.setItem(SEARCH_KEY, q);
      else w.sessionStorage.removeItem(SEARCH_KEY);
    } catch (_e) {
      /* ignore */
    }
  }

  function loadSearch() {
    try {
      return String(w.sessionStorage.getItem(SEARCH_KEY) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function asset(rel) {
    var url = join(rel);
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + ASSET_V;
  }

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.base = base;
  w.CasePathUK.href = join;
  w.CasePathUK.home = home;
  w.CasePathUK.asset = asset;
  w.CasePathUK.ASSET_V = ASSET_V;
  w.CasePathUK.saveGlossarySearch = saveSearch;
  w.CasePathUK.loadGlossarySearch = loadSearch;
  w.CasePathUK.GLOSSARY_SEARCH_KEY = SEARCH_KEY;
})(window);

(function (w, d) {
  "use strict";
  if (!w || w.CasePathAnalytics || !d || typeof d.write !== "function") return;
  if (d.readyState !== "loading") return;
  var src = w.CasePathUK && typeof w.CasePathUK.href === "function"
    ? w.CasePathUK.href("assets/js/casepath-analytics.js")
    : "assets/js/casepath-analytics.js";
  d.write('<script src="' + src + '"><\/script>');
})(window, document);
