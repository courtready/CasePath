(function () {
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest("#navSignOutBtn");
    if (!t) return;
    if (ev.preventDefault) ev.preventDefault();
    void (async function () {
      try {
        if (typeof window.signOutFromSupabaseAndSync === "function") {
          await window.signOutFromSupabaseAndSync();
          return;
        }
      } catch (err) {
        console.warn("CasePath: sign out (full sync) failed", err);
      }
      try {
        safeRemove("cr_user");
        safeRemove("courtready_user");
        safeSet("cr_signed_in", "0");
      } catch (e) {}
      if (
        window.supabaseClient &&
        window.supabaseClient.auth &&
        typeof window.supabaseClient.auth.signOut === "function"
      ) {
        try {
          await window.supabaseClient.auth.signOut();
        } catch (e2) {}
      }
      try {
        if (typeof window.updateNav === "function") window.updateNav();
        if (typeof window.updateGates === "function") window.updateGates();
      } catch (e3) {}
      try {
        if (typeof window.updateAuthUI === "function") {
          await window.updateAuthUI();
        } else {
          var guest = document.getElementById("nav-guest-actions");
          var so = document.getElementById("navSignOutBtn");
          if (guest && so) {
            guest.style.display = "flex";
            so.style.display = "none";
          }
        }
      } catch (e3b) {}
      var isMainSpa =
        typeof window.showPage === "function" &&
        typeof document !== "undefined" &&
        document.getElementById &&
        document.getElementById("page-home");
      if (isMainSpa) {
        try {
          window.showPage("home");
        } catch (e4) {}
        window.location.reload();
        return;
      }
      window.location.href = "/index.html";
    })();
  });

  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function goToPage(page) {
    if (typeof window.showPage === "function") {
      window.showPage(page);
      return;
    }
    safeSet("cr_target_page", page);
    window.location.href = "/index.html";
  }

  function bindNavLink(id, page) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      goToPage(page);
    });
  }

  function bindAuthLink(id, mode) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function (ev) {
      if (typeof window.openAuth === "function") {
        ev.preventDefault();
        window.openAuth(mode);
        return;
      }
      ev.preventDefault();
      safeSet("cr_auth_action", mode);
      window.location.href = "/index.html";
    });
  }

  function applyPendingActions() {
    var target = safeGet("cr_target_page");
    if (target) {
      if (typeof window.showPage === "function") {
        window.showPage(target);
        safeRemove("cr_target_page");
      } else {
        setTimeout(applyPendingActions, 250);
      }
    }

    var auth = safeGet("cr_auth_action");
    if (auth) {
      if (typeof window.openAuth === "function") {
        window.openAuth(auth);
        safeRemove("cr_auth_action");
      } else {
        setTimeout(applyPendingActions, 250);
      }
    }
  }

  function applyHeaderAuthVisibility() {
    if (typeof window.updateAuthUI === "function") {
      void window.updateAuthUI();
      return;
    }
    var guest = document.getElementById("nav-guest-actions");
    var so = document.getElementById("navSignOutBtn");
    if (!guest || !so) return;
    var signedIn = safeGet("cr_signed_in") === "1";
    if (signedIn) {
      guest.style.display = "none";
      so.style.display = "inline-flex";
    } else {
      guest.style.display = "flex";
      so.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindNavLink("nav-mission", "mission");
    bindNavLink("nav-glossary", "glossary");
    bindNavLink("nav-mental-health", "mental-health");
    bindNavLink("nav-parenting-orders", "parenting-orders");
    bindNavLink("nav-doc-helper", "doc-helper");
    bindNavLink("nav-ai-assistant", "ai-assistant");
    bindNavLink("nav-your-case-pulse", "vault");
    bindNavLink("nav-kids", "kids");
    bindNavLink("nav-your-team", "your-team");
    bindNavLink("nav-avo", "avo");
    bindNavLink("nav-pricing", "pricing");
    bindNavLink("nav-referrals", "referrals");
    bindNavLink("nav-lawyer-portal", "lawyer-portal");

    bindAuthLink("nav-signin-btn", "signin");
    bindAuthLink("nav-signup-btn", "signup");

    void (async function () {
      try {
        if (typeof window.syncUser === "function") await window.syncUser();
      } catch (e) {}
      var pathPage =
        typeof window.resolvePageFromPathname === "function"
          ? window.resolvePageFromPathname(window.location.pathname)
          : "home";
      if (pathPage && pathPage !== "home") {
        if (typeof window.initCasepathRoutesFromUrl === "function") window.initCasepathRoutesFromUrl();
      } else {
        applyPendingActions();
      }
      applyHeaderAuthVisibility();
    })();

    // Keep header state in sync if auth flags change later.
    window.addEventListener("storage", function (ev) {
      if (!ev) return;
      if (ev.key === "cr_signed_in" || ev.key === "cr_has_account") {
        applyHeaderAuthVisibility();
      }
    });
    setTimeout(applyHeaderAuthVisibility, 400);
  });
})();
