/**
 * Supplies globals expected by the homepage navbar markup on standalone satellite pages:
 * showPage, cdBuildDashboard, openAuth, signOut, toggleLangDropdown, setLang.
 * Loads saved language UI from localStorage (matches main app behaviour).
 */
(function () {
  if (!window.translations) {
    window.translations = {
      en: { mission: 'Our Mission', pricing: 'Pricing' },
      ar: { mission: 'مهمتنا', pricing: 'التسعير' },
      zh: { mission: '我们的使命', pricing: '价格' }
    };
  }

  var ROUTES = {
    home: '/index.html',
    mission: '/casepath/our-mission',
    glossary: '/casepath/glossary',
    'mental-health': '/casepath/mental-health',
    'parenting-orders': '/casepath/parenting-orders',
    'doc-helper': '/document-centre.html',
    'ai-assistant': '/index.html?goto=ai-assistant',
    vault: '/casepath/your-case',
    kids: '/casepath/about-the-kids',
    'your-team': '/casepath/your-family-team',
    avo: '/casepath/avo-centre',
    pricing: '/casepath/pricing',
    referrals: '/casepath/referrals',
    'lawyer-portal': '/casepath/lawyer-portal'
  };

  function navigateSameOrigin(url) {
    var u = url || '/index.html';
    if (
      window.CasePathAuth &&
      window.CasePathAuth.redirect &&
      typeof window.CasePathAuth.redirect.safeAssignHref === 'function'
    ) {
      if (window.CasePathAuth.redirect.safeAssignHref(u)) return;
    }
    if (typeof u === 'string' && u.charAt(0) === '/') {
      window.location.href = u;
      return;
    }
    window.location.href = '/index.html';
  }

  window.showPage = function (pageId) {
    var url = ROUTES[pageId] || '/index.html';
    navigateSameOrigin(url);
  };

  window.cdBuildDashboard = function () {};

  window.openAuth = function () {
    navigateSameOrigin('/index.html');
  };

  window.signOut = function () {
    try {
      localStorage.removeItem('cr_user');
      localStorage.removeItem('courtready_user');
    } catch (e) {}
    window.location.reload();
  };

  window.toggleLangDropdown = function () {};

  document.addEventListener('click', function () {});

  window.setLang = function (langCode) {
    try {
      localStorage.setItem('lang', langCode);
      if (window.casepathSiteLanguageSet) window.casepathSiteLanguageSet(langCode);
      else localStorage.setItem('siteLanguage', langCode);
    } catch (err) {}
    applyLanguage(langCode);
  };

  function applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (window.translations && window.translations[lang] && window.translations[lang][key]) {
        el.textContent = window.translations[lang][key];
      }
    });
  }

  function ensureDataPages() {
    var map = {
      'nav-mission': 'mission',
      'nav-glossary': 'glossary',
      'nav-mental-health': 'mental-health',
      'nav-parenting-orders': 'parenting-orders',
      'nav-doc-helper': 'doc-helper',
      'nav-ai-assistant': 'ai-assistant',
      'nav-your-case-pulse': 'case',
      'nav-kids': 'kids',
      'nav-your-team': 'your-team',
      'nav-new-item': 'support-tools',
      'nav-avo': 'avo',
      'nav-pricing': 'pricing',
      'nav-referrals': 'referrals',
      'nav-lawyer-portal': 'lawyer-portal'
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('data-page', map[id]);
    });
    var mission = document.getElementById('nav-mission');
    if (mission && !mission.getAttribute('data-i18n')) mission.setAttribute('data-i18n', 'mission');
    var pricing = document.getElementById('nav-pricing');
    if (pricing && !pricing.getAttribute('data-i18n')) pricing.setAttribute('data-i18n', 'pricing');
  }

  async function readSupabaseNavState() {
    try {
      if (typeof window.syncUser === 'function') await window.syncUser();
    } catch (e) {}
    var current = window.currentUser || null;
    if (current && current.source === 'supabase' && current.id) {
      return {
        user: current,
        entitlements:
          typeof window.getCasePathEntitlements === 'function'
            ? window.getCasePathEntitlements()
            : { plan: null, docCredits: 0 }
      };
    }
    if (!window.supabaseClient || !window.supabaseClient.auth) return null;
    try {
      var sessionResult = await window.supabaseClient.auth.getSession();
      var session = sessionResult && sessionResult.data && sessionResult.data.session;
      if (!session || !session.user) return null;
      var memberResult = await window.supabaseClient
        .from('members')
        .select('plan, doc_credits')
        .eq('id', session.user.id)
        .single();
      var member = memberResult && memberResult.data;
      return {
        user: { id: session.user.id, email: session.user.email, source: 'supabase' },
        entitlements: {
          plan: member && typeof member.plan === 'string' ? member.plan : null,
          docCredits: member && Number.isFinite(Number(member.doc_credits)) ? Number(member.doc_credits) : 0
        }
      };
    } catch (e) {
      return null;
    }
  }

  function wireAuthArea() {
    var authArea = document.getElementById('auth-area');
    var navAuthArea = document.getElementById('nav-auth-area');
    if (!authArea && navAuthArea) {
      navAuthArea.innerHTML = '<div id="auth-area" class="header-actions" style="display:flex;align-items:center;gap:0.44rem;"></div>';
      authArea = document.getElementById('auth-area');
    }
    if (!authArea) return;

    void (async function () {
      var state = await readSupabaseNavState();
      if (!state || !state.user) {
        authArea.innerHTML =
          '<a href="/signin.shtml" onclick="if (typeof openAuth === \'function\') { event.preventDefault(); openAuth(\'signin\'); }">Sign in</a>' +
          '<a href="/signup.shtml" class="nav-cta cta-primary" onclick="if (typeof openAuth === \'function\') { event.preventDefault(); openAuth(\'signup\'); }">Create free account</a>';
        return;
      }

      var entitlements = state.entitlements || {};
      var plan = entitlements.plan || 'free';
      var credits = Number.isFinite(Number(entitlements.docCredits)) ? Number(entitlements.docCredits) : 0;
      authArea.innerHTML =
        '<span class="nav-plan">' + (plan === 'pro' ? 'Pro Plan' : ('Credits: ' + credits)) + '</span>' +
        '<a href="/your-case.shtml" onclick="if (typeof showPage === \'function\') { event.preventDefault(); showPage(\'vault\'); }">Your Case</a>' +
        '<a href="#" id="logout">Logout</a>';
      var logout = document.getElementById('logout');
      if (logout) {
        logout.addEventListener('click', function (event) {
          event.preventDefault();
          window.signOut();
        });
      }
    })();
  }

  function wireLanguageSwitcher() {
    var wrap = document.getElementById('lang-selector-wrap');
    if (!wrap) return;
    var switcher = document.getElementById('lang-switch');
    if (!switcher) {
      wrap.innerHTML =
        '<select id="lang-switch" aria-label="Language switcher">' +
        '<option value="en">EN</option>' +
        '<option value="ar">AR</option>' +
        '<option value="zh">中文</option>' +
        '</select>';
      switcher = document.getElementById('lang-switch');
    }
    var savedLang = localStorage.getItem('lang') || 'en';
    switcher.value = savedLang;
    switcher.addEventListener('change', function () {
      window.setLang(this.value);
    });
    applyLanguage(savedLang);
  }

  function wireNavUnderline() {
    var navGrid = document.querySelector('.nav-grid');
    var links = document.querySelectorAll('.nav-grid a');
    if (!navGrid || !links.length) return;

    var underline = navGrid.querySelector('.nav-underline');
    if (!underline) {
      underline = document.createElement('div');
      underline.className = 'nav-underline';
      navGrid.appendChild(underline);
    }

    function moveUnderline(el) {
      var rect = el.getBoundingClientRect();
      var navRect = navGrid.getBoundingClientRect();
      underline.style.width = rect.width + 'px';
      underline.style.left = rect.left - navRect.left + 'px';
      underline.style.top = rect.bottom - navRect.top + 'px';
    }

    var path = window.location.pathname.toLowerCase();
    links.forEach(function (link) {
      try {
        var pageKey = (link.getAttribute('data-page') || '').toLowerCase();
        var hrefValue = (link.getAttribute('href') || '').toLowerCase();
        if (
          (hrefValue && hrefValue !== '#' && path.indexOf(hrefValue.replace(/^\.\//, '/')) !== -1) ||
          (pageKey && (path.indexOf('/' + pageKey) !== -1 || path.indexOf(pageKey + '.shtml') !== -1 || path.indexOf(pageKey + '.html') !== -1))
        ) {
          link.classList.add('active');
          moveUnderline(link);
        }
      } catch (e) {}
      link.addEventListener('mouseenter', function () {
        moveUnderline(link);
      });
    });

    navGrid.addEventListener('mouseleave', function () {
      var active = navGrid.querySelector('a.active');
      if (active) moveUnderline(active);
    });
  }

  function initSatelliteNavWithRetry(attempt) {
    ensureDataPages();
    wireAuthArea();
    wireLanguageSwitcher();
    wireNavUnderline();
    if (!document.querySelector('.nav-grid') && attempt < 20) {
      setTimeout(function () {
        initSatelliteNavWithRetry(attempt + 1);
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSatelliteNavWithRetry(0);
    });
  } else {
    initSatelliteNavWithRetry(0);
  }
})();
