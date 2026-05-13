/**
 * Shared navigation UX: account-required shell modal, coming-soon modal,
 * and static-page nav preflight (capture phase). Does not replace Supabase auth.
 */
(function () {
  function casepathSafeAssignHref(path) {
    if (
      window.CasePathAuth &&
      window.CasePathAuth.redirect &&
      typeof window.CasePathAuth.redirect.safeAssignHref === "function"
    ) {
      return window.CasePathAuth.redirect.safeAssignHref(path);
    }
    var p = String(path || "").trim();
    if (!p || p.charAt(0) !== "/") return false;
    if (/^https?:/i.test(p) || /^\/\//.test(p)) return false;
    var low = p.toLowerCase();
    if (low.indexOf("javascript:") === 0 || low.indexOf("data:") === 0 || low.indexOf("vbscript:") === 0) {
      return false;
    }
    window.location.href = p;
    return true;
  }

  var COMING_NAV_IDS = ["nav-parenting-orders", "nav-ai-assistant", "nav-referrals", "nav-lawyer-portal"];
  var ACCOUNT_NAV_IDS = ["nav-mental-health", "nav-kids", "nav-your-team", "nav-avo", "nav-new-item"];

  function clearNavRolloutAttrs(el) {
    if (!el || !el.removeAttribute) return;
    el.removeAttribute("data-cr-locked");
    el.removeAttribute("data-cr-nav-badge");
    el.removeAttribute("data-gate-feature");
    el.removeAttribute("data-cr-nav-tier");
    el.removeAttribute("title");
  }

  /** Static HTML shells: mirror index nav badges (stylesheet lives in styles.css). */
  function applyStaticNavRolloutBadges() {
    if (document.getElementById("page-home")) return;
    var grid = document.getElementById("nav-main-grid");
    if (!grid) return;
    COMING_NAV_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      clearNavRolloutAttrs(el);
      el.setAttribute("data-cr-nav-badge", "soon");
      el.setAttribute("title", "Coming soon — this section is under development.");
    });
    var aiAsstSoon = document.getElementById("nav-ai-assistant");
    if (aiAsstSoon) {
      aiAsstSoon.setAttribute(
        "title",
        "Case Assistant — chronology, evidence, and preparation tied to Your Case (preview, coming soon)."
      );
    }
    var parentingSoon = document.getElementById("nav-parenting-orders");
    if (parentingSoon) {
      parentingSoon.setAttribute("title", "Parenting Orders draft generator — coming soon.");
    }
    var signedIn = authedFromSupabaseSession();
    ACCOUNT_NAV_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      clearNavRolloutAttrs(el);
      if (!signedIn) {
        el.setAttribute("data-cr-nav-badge", "account");
        el.setAttribute("title", "Please create a free account to access this section.");
      }
    });
    var yc = document.getElementById("nav-your-case-pulse");
    if (yc) {
      clearNavRolloutAttrs(yc);
      if (!signedIn) {
        yc.setAttribute("data-cr-nav-badge", "account");
        yc.setAttribute("title", "Please create a free account to access this section.");
        yc.classList.remove("nav-mission-pulse");
      } else {
        yc.classList.add("nav-mission-pulse");
      }
    }
  }

  window.casepathApplyStaticNavRolloutBadges = applyStaticNavRolloutBadges;

  var supabaseSessionSeen = false;

  function authedFromSupabaseSession() {
    try {
      if (window.__crAuthHydrated && window.authState && window.authState.isAuthenticated) return true;
    } catch (e) {
      /* ignore */
    }
    return supabaseSessionSeen;
  }

  async function refreshSupabaseSessionGate() {
    try {
      if (window.__crAuthHydrated && window.authState && window.authState.isAuthenticated) {
        supabaseSessionSeen = true;
        return true;
      }
    } catch (e) {
      /* ignore */
    }
    if (!window.supabaseClient || !window.supabaseClient.auth) {
      supabaseSessionSeen = false;
      return false;
    }
    try {
      var r = await window.supabaseClient.auth.getSession();
      supabaseSessionSeen = !!(r && r.data && r.data.session);
    } catch (e2) {
      supabaseSessionSeen = false;
    }
    return supabaseSessionSeen;
  }

  function closeMobileNavMenu() {
    var wrap = document.querySelector(".nav-site-links");
    if (wrap) wrap.classList.remove("nav-mobile-open");
    document.body.classList.remove("nav-mobile-menu-open");
    var btn = document.getElementById("nav-mobile-toggle");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function ensureModals() {
    if (document.getElementById("casepath-access-modal")) return;
    var access = document.createElement("div");
    access.id = "casepath-access-modal";
    access.className = "modal-overlay";
    access.setAttribute("aria-hidden", "true");
    access.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="casepath-access-title">' +
      '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
      '<h2 id="casepath-access-title">Account required</h2>' +
      '<p class="modal-sub">Please create a free account to access this section.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;">' +
      '<button type="button" class="btn-full" data-casepath-auth="signin" style="flex:1;min-width:8rem;">Sign In</button>' +
      '<button type="button" class="btn-full" data-casepath-auth="signup" style="flex:1;min-width:8rem;background:#5f7f67;">Create Free Account</button>' +
      "</div>" +
      "</div>";

    var soon = document.createElement("div");
    soon.id = "casepath-coming-soon-modal";
    soon.className = "modal-overlay";
    soon.setAttribute("aria-hidden", "true");
    soon.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="casepath-soon-title">' +
      '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
      '<h2 id="casepath-soon-title">Coming Soon</h2>' +
      '<p class="modal-sub">This section is currently under development and will be released in a future production update.</p>' +
      '<p class="modal-sub" style="margin-top:-0.75rem;font-size:0.8rem;">CasePath is being rolled out in stages. For general family law questions in the meantime, use <strong>Ask a Question</strong> (the ⚖️ button on any page) or the <strong>Glossary</strong> — both stay free.</p>' +
      '<button type="button" class="btn-full" data-casepath-soon-close="1">OK</button>' +
      "</div>";

    document.body.appendChild(access);
    document.body.appendChild(soon);

    function wireClose(overlay) {
      overlay.addEventListener("click", function (ev) {
        if (ev.target === overlay) hideOverlay(overlay);
      });
      var closeBtn = overlay.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          hideOverlay(overlay);
        });
      }
    }
    wireClose(access);
    wireClose(soon);

    access.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.getAttribute) return;
      var mode = t.getAttribute("data-casepath-auth");
      if (!mode) return;
      ev.preventDefault();
      hideOverlay(access);
      casepathGoAuth(mode);
    });

    soon.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute("data-casepath-soon-close")) {
        ev.preventDefault();
        hideOverlay(soon);
      }
    });
  }

  function hideOverlay(el) {
    if (!el) return;
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    try {
      var accEl = document.getElementById("casepath-access-modal");
      var soonEl = document.getElementById("casepath-coming-soon-modal");
      var authEl = document.getElementById("auth-modal");
      if (
        (!accEl || !accEl.classList.contains("show")) &&
        (!soonEl || !soonEl.classList.contains("show")) &&
        (!authEl || !authEl.classList.contains("show"))
      ) {
        document.documentElement.style.overflow = "";
      }
    } catch (e) {
      try {
        document.documentElement.style.overflow = "";
      } catch (e2) {}
    }
  }

  function showOverlay(el) {
    ensureModals();
    closeMobileNavMenu();
    el = el || document.getElementById("casepath-access-modal");
    if (!el) return;
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    try {
      document.documentElement.style.overflow = "hidden";
    } catch (e) {}
  }

  function casepathGoAuth(mode) {
    var m = mode === "signin" ? "signin" : "signup";
    if (typeof window.openAuth === "function") {
      try {
        window.openAuth(m);
        return;
      } catch (e) {}
    }
    casepathSafeAssignHref("/index.html?auth=" + m);
  }

  window.casepathGoAuth = casepathGoAuth;

  window.casepathShowAccountRequiredModal = function () {
    ensureModals();
    var el = document.getElementById("casepath-access-modal");
    var soon = document.getElementById("casepath-coming-soon-modal");
    if (soon) hideOverlay(soon);
    showOverlay(el);
  };

  window.casepathShowComingSoonModal = function () {
    ensureModals();
    var el = document.getElementById("casepath-coming-soon-modal");
    var acc = document.getElementById("casepath-access-modal");
    if (acc) hideOverlay(acc);
    showOverlay(el);
  };

  window.casepathHideAccountRequiredModal = function () {
    hideOverlay(document.getElementById("casepath-access-modal"));
  };

  window.casepathHideComingSoonModal = function () {
    hideOverlay(document.getElementById("casepath-coming-soon-modal"));
  };

  window.casepathStripGotoFromUrl = function () {
    try {
      var u = new URL(window.location.href);
      if (!u.searchParams.has("goto")) return;
      u.searchParams.delete("goto");
      var qs = u.searchParams.toString();
      window.history.replaceState({}, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    } catch (e) {}
  };

  document.addEventListener(
    "click",
    function (ev) {
      if (document.getElementById("page-home")) return;
      var a = ev.target && ev.target.closest && ev.target.closest("#nav-main-grid a");
      if (!a) return;
      var grid = a.closest(".nav-grid");
      if (!grid || grid.id !== "nav-main-grid") return;
      var id = a.id || "";
      if (id === "nav-your-case-pulse") {
        if (!authedFromSupabaseSession()) {
          ev.preventDefault();
          ev.stopPropagation();
          window.casepathShowAccountRequiredModal();
        }
        return;
      }
      if (COMING_NAV_IDS.indexOf(id) !== -1) {
        ev.preventDefault();
        ev.stopPropagation();
        window.casepathShowComingSoonModal();
        return;
      }
      if (ACCOUNT_NAV_IDS.indexOf(id) !== -1) {
        var path = (window.location.pathname || "").toLowerCase();
        if (id === "nav-kids" && /kids\.html$/i.test(path)) return;
        if (id === "nav-your-team" && /your-team\.html$/i.test(path)) return;
        if (id === "nav-mental-health" && /mental-health\.html$/i.test(path)) return;
        if (id === "nav-new-item" && /support-tools\.html$/i.test(path)) return;
        if (!authedFromSupabaseSession()) {
          ev.preventDefault();
          ev.stopPropagation();
          window.casepathShowAccountRequiredModal();
        }
      }
    },
    true
  );

  function runAccountPageGate() {
    var gate = document.body.getAttribute("data-casepath-account-gate");
    if (!gate) return;
    void (async function () {
      var ok = await refreshSupabaseSessionGate();
      if (!ok) {
        window.casepathShowAccountRequiredModal();
        try {
          document.documentElement.style.overflow = "hidden";
        } catch (e2) {}
      }
    })();
  }

  async function boot() {
    ensureModals();
    await refreshSupabaseSessionGate();
    applyStaticNavRolloutBadges();
    runAccountPageGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    void boot();
  }

  document.addEventListener("keydown", function (ev) {
    if (!ev || ev.key !== "Escape") return;
    var acc = document.getElementById("casepath-access-modal");
    var soon = document.getElementById("casepath-coming-soon-modal");
    if (acc && acc.classList.contains("show")) {
      hideOverlay(acc);
      ev.preventDefault();
      return;
    }
    if (soon && soon.classList.contains("show")) {
      hideOverlay(soon);
      ev.preventDefault();
    }
  });
})();
