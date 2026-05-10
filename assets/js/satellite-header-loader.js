(function () {
  async function loadSharedNav() {
    var mount = document.getElementById("satellite-nav");
    if (!mount) return;
    try {
      var res = await fetch("/components/nav.html", { cache: "no-store" });
      if (!res.ok) return;
      var html = await res.text();
      mount.innerHTML = html;
    } catch (err) {
      console.warn("satellite header load failed", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      void loadSharedNav();
    });
  } else {
    void loadSharedNav();
  }
})();
