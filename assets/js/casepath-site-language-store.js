/**
 * Persists header / Google Translate language choice.
 * On localhost (and loopback), uses sessionStorage so a production or stale
 * localStorage value does not keep forcing German (or another language) while
 * developing. Production continues to use localStorage.
 */
(function (g) {
  if (g.casepathSiteLanguageGet) return;

  function isDevHost() {
    var h = (location.hostname || "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  }

  g.casepathSiteLanguageGet = function () {
    try {
      return isDevHost() ? sessionStorage.getItem("siteLanguage") : localStorage.getItem("siteLanguage");
    } catch (e) {
      return null;
    }
  };

  g.casepathSiteLanguageSet = function (code) {
    try {
      (isDevHost() ? sessionStorage : localStorage).setItem("siteLanguage", code);
    } catch (e) {}
  };

  if (isDevHost()) {
    try {
      var expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "googtrans=;" + expire + ";path=/";
      document.cookie = "googtrans=;" + expire + ";path=/;domain=" + location.hostname;
    } catch (e2) {}
  }
})(window);
