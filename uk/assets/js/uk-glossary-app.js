/**
 * CasePath UK glossary application chrome.
 * Keeps Tell Me More / SEO landings inside the glossary (search + state).
 */
(function (w, d) {
  "use strict";

  function href(rel) {
    return w.CasePathUK && w.CasePathUK.href ? w.CasePathUK.href(rel) : rel;
  }

  function bindSearchForm(form) {
    if (!form) return;
    form.setAttribute("action", href("glossary.html"));
    var input = form.querySelector('input[type="search"]');
    if (input && w.CasePathUK && typeof w.CasePathUK.loadGlossarySearch === "function") {
      if (!input.value) {
        var stored = w.CasePathUK.loadGlossarySearch();
        if (stored) input.value = stored;
      }
    }
    form.addEventListener("submit", function () {
      if (input && w.CasePathUK && typeof w.CasePathUK.saveGlossarySearch === "function") {
        w.CasePathUK.saveGlossarySearch(input.value);
      }
      try {
        if (input && w.CasePathAnalytics && typeof w.CasePathAnalytics.trackGlossarySearch === "function") {
          w.CasePathAnalytics.trackGlossarySearch(input.value);
        }
      } catch (_e) {
        /* ignore */
      }
    });
  }

  function bindTmmLinks() {
    d.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
      if (!a) return;
      var hrefVal = a.getAttribute("href") || "";
      if (!/tell-me-more\//i.test(hrefVal)) return;
      var search = d.getElementById("glossary-search");
      if (search && w.CasePathUK && typeof w.CasePathUK.saveGlossarySearch === "function") {
        w.CasePathUK.saveGlossarySearch(search.value);
      }
      if (d.body && d.body.classList && d.body.classList.contains("uk-glossary-app")) {
        try {
          if (w.CasePathAnalytics && typeof w.CasePathAnalytics.trackGlossaryResultClick === "function") {
            var label = (a.textContent || "").replace(/\s+/g, " ").trim();
            w.CasePathAnalytics.trackGlossaryResultClick(label);
          }
        } catch (_eClick) {
          /* ignore */
        }
      }
    });
  }

  function restoreGlossaryLanding() {
    var search = d.getElementById("glossary-search");
    if (!search) return;
    try {
      var params = new URLSearchParams(w.location.search || "");
      var q = (params.get("q") || "").trim();
      if (!q && w.CasePathUK && typeof w.CasePathUK.loadGlossarySearch === "function") {
        q = w.CasePathUK.loadGlossarySearch();
      }
      if (q && !search.value) search.value = q;
    } catch (_e) {
      /* ignore */
    }
  }

  function boot() {
    bindSearchForm(d.getElementById("uk-glossary-search-form"));
    bindSearchForm(d.getElementById("uk-landing-glossary-form"));
    bindTmmLinks();
    restoreGlossaryLanding();
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
