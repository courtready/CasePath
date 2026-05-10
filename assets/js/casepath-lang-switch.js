/**
 * Header language UI + Google Translate for static CasePath pages.
 * index.html uses the same Google pattern inline; this file mirrors that behaviour.
 */
(function () {
  var SELECT_HTML =
    '<option value="en">English</option>' +
    '<option value="zh-CN">Mandarin</option>' +
    '<option value="ar">Arabic</option>' +
    '<option value="vi">Vietnamese</option>' +
    '<option value="zh-TW">Cantonese</option>' +
    '<option value="pa">Punjabi</option>' +
    '<option value="el">Greek</option>' +
    '<option value="it">Italian</option>' +
    '<option value="de">German</option>' +
    '<option value="fr">French</option>' +
    '<option value="hi">Hindi</option>' +
    '<option value="es">Spanish</option>' +
    '<option value="tl">Filipino</option>' +
    '<option value="tr">Turkish</option>' +
    '<option value="ko">Korean</option>' +
    '<option value="ja">Japanese</option>' +
    '<option value="so">Somali</option>';

  function ensureGoogleTranslateShell() {
    if (!document.getElementById("languageSwitcher")) {
      var sel = document.createElement("select");
      sel.id = "languageSwitcher";
      sel.style.display = "none";
      sel.setAttribute("aria-label", "Language switcher");
      sel.innerHTML = SELECT_HTML;
      document.body.appendChild(sel);
    }
    if (!document.getElementById("google_translate_element")) {
      var ge = document.createElement("div");
      ge.id = "google_translate_element";
      ge.style.display = "none";
      document.body.appendChild(ge);
    }
  }

  window.toggleLangDropdown = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var dd = document.getElementById("lang-dropdown");
    if (dd) dd.classList.toggle("open");
  };

  window.setLang = function (langCode, flag, label) {
    var dd = document.getElementById("lang-dropdown");
    if (dd) dd.classList.remove("open");
    document.querySelectorAll(".lang-option").forEach(function (btn) {
      var oc = btn.getAttribute("onclick") || "";
      btn.classList.toggle("active", oc.indexOf("'" + langCode + "'") !== -1);
    });
    var f = document.getElementById("lang-current-flag");
    var l = document.getElementById("lang-current-label");
    if (f) f.textContent = flag;
    if (l) l.textContent = label;
    try {
      localStorage.setItem("siteLanguage", langCode);
    } catch (err) {}
    var langSelect = document.getElementById("languageSwitcher");
    if (langSelect) {
      if (langSelect.querySelector('option[value="' + langCode + '"]')) {
        langSelect.value = langCode;
      } else {
        langSelect.value = "en";
      }
      langSelect.dispatchEvent(new Event("change"));
    }
  };

  document.addEventListener("click", function () {
    var dd = document.getElementById("lang-dropdown");
    if (dd) dd.classList.remove("open");
  });

  if (typeof window.googleTranslateElementInit !== "function") {
    window.googleTranslateElementInit = function () {
      if (window.__casepathTranslateMounted) return;
      if (!window.google || !google.translate) return;
      var host = document.getElementById("google_translate_element");
      if (!host) return;
      window.__casepathTranslateMounted = true;
      try {
        new google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
      } catch (e) {}
    };
  }

  function loadTranslateScript() {
    if (document.querySelector('script[src*="translate.google.com/translate_a/element"]')) return;
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("page-home")) return;
    var wrap = document.getElementById("lang-selector-wrap");
    if (!wrap) return;
    wrap.style.removeProperty("display");
    var inlineRest = wrap.getAttribute("style");
    if (!inlineRest || !String(inlineRest).trim()) {
      wrap.removeAttribute("style");
    }
    var btn = document.getElementById("lang-btn");
    if (btn) {
      btn.removeAttribute("disabled");
      btn.style.removeProperty("opacity");
      btn.style.removeProperty("cursor");
    }

    ensureGoogleTranslateShell();
    var langSelect = document.getElementById("languageSwitcher");
    if (!langSelect) {
      loadTranslateScript();
      return;
    }

    langSelect.addEventListener("change", function () {
      var lang = this.value;
      try {
        localStorage.setItem("siteLanguage", lang);
      } catch (e) {}
      var tries = 0;
      var interval = setInterval(function () {
        tries++;
        var combo = document.querySelector(".goog-te-combo");
        if (combo) {
          combo.value = lang;
          combo.dispatchEvent(new Event("change"));
          clearInterval(interval);
        } else if (tries > 80) clearInterval(interval);
      }, 250);
    });

    loadTranslateScript();

    try {
      var savedLang = localStorage.getItem("siteLanguage");
      if (savedLang && langSelect.querySelector('option[value="' + savedLang + '"]')) {
        langSelect.value = savedLang;
        setTimeout(function () {
          langSelect.dispatchEvent(new Event("change"));
        }, 900);
      }
    } catch (e2) {}
  });
})();
