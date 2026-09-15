/**
 * CasePath UK landing page helpers.
 */
(function (w, d) {
  "use strict";

  function href(rel) {
    return w.CasePathUK && w.CasePathUK.href ? w.CasePathUK.href(rel) : rel;
  }

  function bindGlossarySearch() {
    var form = d.getElementById("uk-landing-glossary-form");
    if (!form) return;
    form.setAttribute("action", href("glossary.html"));
    var input = d.getElementById("uk-landing-glossary-q");
    form.addEventListener("submit", function () {
      if (input && w.CasePathUK && typeof w.CasePathUK.saveGlossarySearch === "function") {
        w.CasePathUK.saveGlossarySearch(input.value);
      }
    });
  }

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", bindGlossarySearch);
  } else {
    bindGlossarySearch();
  }
})(window, document);
