/**
 * Mobile nav toggle for static HTML pages (same behaviour as App/index.html).
 */
(function () {
  var mq = window.matchMedia("(max-width: 900px)");
  var btn = document.getElementById("nav-mobile-toggle");
  var wrap = document.querySelector(".nav-site-links");
  var grid = document.getElementById("nav-main-grid");
  if (!btn || !wrap || !grid) return;

  var scrim = document.getElementById("nav-mobile-scrim");
  if (!scrim) {
    scrim = document.createElement("div");
    scrim.id = "nav-mobile-scrim";
    scrim.className = "nav-mobile-scrim";
    scrim.setAttribute("aria-hidden", "true");
    document.body.appendChild(scrim);
  }

  function syncDropdownTop() {
    var hdr = document.querySelector("header.header");
    var y = hdr ? hdr.getBoundingClientRect().bottom : 100;
    document.documentElement.style.setProperty("--mobile-nav-dropdown-top", y + "px");
  }

  function closeMenu() {
    wrap.classList.remove("nav-mobile-open");
    document.body.classList.remove("nav-mobile-menu-open");
    btn.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    syncDropdownTop();
    wrap.classList.add("nav-mobile-open");
    document.body.classList.add("nav-mobile-menu-open");
    btn.setAttribute("aria-expanded", "true");
  }

  scrim.addEventListener("click", function () {
    if (mq.matches) closeMenu();
  });

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!mq.matches) return;
    if (wrap.classList.contains("nav-mobile-open")) closeMenu();
    else openMenu();
  });

  document.addEventListener("click", function (e) {
    if (!mq.matches || !wrap.classList.contains("nav-mobile-open")) return;
    if (!wrap.contains(e.target)) closeMenu();
  });

  grid.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (mq.matches) closeMenu();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener(
    "resize",
    function () {
      if (!mq.matches) closeMenu();
      else if (wrap.classList.contains("nav-mobile-open")) syncDropdownTop();
    },
    { passive: true }
  );

  mq.addEventListener("change", function () {
    if (!mq.matches) closeMenu();
  });
})();
