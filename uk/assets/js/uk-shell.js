/**
 * CasePath UK header + footer. Visual classes match AU shell; destinations are GB-EAW only.
 */
(function (w, d) {
  "use strict";

  function href(rel) {
    return (w.CasePathUK && w.CasePathUK.href) ? w.CasePathUK.href(rel) : rel;
  }

  function headerHtml(active) {
    function link(id, rel, label) {
      var current = active === id ? ' aria-current="page"' : "";
      return '<a href="' + href(rel) + '"' + current + ">" + label + "</a>";
    }
    return (
      '<a class="casepath-skip-link" href="#main-content">Skip to main content</a>' +
      '<div class="disclaimer-banner disclaimer-banner--trust" role="note" aria-label="Legal information notice">' +
      '<span class="disclaimer-banner__primary">CasePath helps you organise, prepare and understand family law processes &mdash; not replace a solicitor.</span>' +
      '<span class="disclaimer-banner__secondary">England and Wales only. For advice about your situation, contact a family solicitor or a local advice service.</span>' +
      "</div>" +
      '<div class="casepath-utility-bar casepath-utility-bar--refined" role="toolbar" aria-label="Jurisdiction">' +
      '<span id="cp-country-switch-slot"></span>' +
      "</div>" +
      '<header class="header cp-site-header uk-site-header">' +
      '<nav class="uk-header-bar" aria-label="Site">' +
      '<div class="uk-header-inner">' +
      '<a href="' + href("") + '" class="casepath-brand uk-brand" aria-label="CasePath Home">' +
      '<img src="' + href("assets/branding/casepath-logo-print.svg") + '" ' +
      'alt="CasePath" class="casepath-brand-logo uk-brand-logo" width="220" height="44">' +
      "</a>" +
      '<button type="button" class="uk-mobile-toggle" id="uk-mobile-toggle" aria-expanded="false" aria-controls="uk-nav-links">Menu</button>' +
      '<div class="uk-nav-links" id="uk-nav-links">' +
      link("how-it-works", "how-it-works.html", "How It Works") +
      link("get-help", "get-help.html", "Get Help") +
      link("glossary", "glossary.html", "Glossary") +
      link("about", "about.html", "About") +
      link("pricing", "pricing.html", "Pricing") +
      link("my-case", "my-case.html", "My Case") +
      '<div class="uk-account-slot" id="uk-account-slot"></div>' +
      "</div></div></nav>" +
      '<div class="uk-announcement" role="note">Family court preparation for England and Wales. Not Scotland or Northern Ireland.</div>' +
      "</header>"
    );
  }

  function footerHtml() {
    function a(rel, label) {
      return '<li><a href="' + href(rel) + '">' + label + "</a></li>";
    }
    function la(rel, label) {
      return '<a href="' + href(rel) + '">' + label + "</a>";
    }
    return (
      '<footer class="casepath-site-footer uk-footer-uk" aria-label="CasePath footer">' +
      '<div class="casepath-site-footer-inner">' +
      '<div class="casepath-site-footer__main">' +
      '<div class="casepath-site-footer__brand">' +
      '<div class="casepath-site-footer__brand-name"><a href="' + href("") + '">CasePath</a></div>' +
      '<p class="casepath-site-footer__tagline">England &amp; Wales. Helping people prepare for family court with clearer information alongside appropriate legal help.</p>' +
      "</div>" +
      '<nav class="casepath-site-footer__col" aria-label="Get help">' +
      '<p class="casepath-site-footer__col-label">Get Help</p>' +
      "<ul class=\"casepath-site-footer__links\">" +
      a("get-help.html", "Get Help") +
      a("get-help-children.html", "Children") +
      a("get-help-protection.html", "Protection") +
      a("get-help-money.html", "Money / property") +
      a("get-help-divorce.html", "Divorce / civil partnership") +
      a("get-help-parental-responsibility.html", "Parental responsibility") +
      a("get-help-service.html", "Service of documents") +
      a("get-help-unsure.html", "I'm not sure") +
      a("unsupported.html", "Something else") +
      "</ul></nav>" +
      '<nav class="casepath-site-footer__col" aria-label="Understand">' +
      '<p class="casepath-site-footer__col-label">Understand</p>' +
      "<ul class=\"casepath-site-footer__links\">" +
      a("glossary.html", "Glossary") +
      a("how-it-works.html", "How It Works") +
      a("tell-me-more/index.html", "Tell me more") +
      a("checklists/index.html", "Checklists") +
      "</ul></nav>" +
      '<nav class="casepath-site-footer__col" aria-label="About">' +
      '<p class="casepath-site-footer__col-label">About</p>' +
      "<ul class=\"casepath-site-footer__links\">" +
      a("about.html", "About CasePath") +
      a("pricing.html", "Pricing") +
      a("about-the-kids.html", "About the Kids") +
      a("mental-health.html", "Mental Health") +
      a("contact.html", "Contact") +
      a("legal/accessibility.html", "Accessibility") +
      a("", "England &amp; Wales") +
      '<li><a href="https://www.gov.uk/report-domestic-abuse" target="_blank" rel="noopener">Domestic abuse help</a></li>' +
      "</ul></nav>" +
      '<nav class="casepath-site-footer__col" aria-label="Official help">' +
      '<p class="casepath-site-footer__col-label">Official help</p>' +
      "<ul class=\"casepath-site-footer__links\">" +
      '<li><a href="https://www.gov.uk/looking-after-children-divorce" target="_blank" rel="noopener">Child arrangements</a></li>' +
      '<li><a href="https://www.gov.uk/injunction-domestic-violence" target="_blank" rel="noopener">Injunctions</a></li>' +
      '<li><a href="https://www.gov.uk/money-property-when-relationship-ends" target="_blank" rel="noopener">Money and property</a></li>' +
      '<li><a href="https://www.gov.uk/find-legal-advice" target="_blank" rel="noopener">Find legal advice</a></li>' +
      '<li><a href="https://www.nationaldahelpline.org.uk/" target="_blank" rel="noopener">National Domestic Abuse Helpline</a></li>' +
      "</ul></nav>" +
      "</div>" +
      '<div class="casepath-site-footer__meta">' +
      '<nav id="casepath-footer-legal-row" class="casepath-footer-legal" aria-label="Legal and site links">' +
      la("legal/terms.html", "Terms") +
      la("legal/privacy.html", "Privacy") +
      la("legal/your-data.html", "Your Data") +
      la("legal/refund-policy.html", "Refund Policy") +
      la("legal/ai-use-disclosure.html", "AI Use Disclosure") +
      la("legal/disclaimer.html", "Disclaimer") +
      la("legal/accessibility.html", "Accessibility") +
      la("about.html", "About") +
      la("pricing.html", "Pricing") +
      la("about-the-kids.html", "About the Kids") +
      la("mental-health.html", "Mental Health") +
      la("glossary.html", "Glossary") +
      la("checklists/index.html", "Checklists") +
      la("contact.html", "Contact") +
      "</nav>" +
      '<div class="casepath-site-footer__disclaimer">' +
      '<p class="casepath-site-footer__disclaimer-text"><strong>Disclaimer:</strong> CasePath provides general legal information only. It does not provide legal advice, recommend orders, predict outcomes, or create a solicitor-client relationship. CasePath is not HMCTS and is not a court. Official HMCTS forms remain authoritative. This product covers <strong>England and Wales</strong> only. It does not cover Scotland or Northern Ireland. Always check <a href="https://www.gov.uk" target="_blank" rel="noopener">GOV.UK</a> and <a href="https://www.legislation.gov.uk" target="_blank" rel="noopener">legislation.gov.uk</a> for current official information. If you need advice about your situation, contact a family solicitor, a regulated legal adviser, or a local advice service. In an emergency, call 999.</p>' +
      '<p class="casepath-site-footer__copy">&copy; 2026 CasePath. England and Wales family court preparation.</p>' +
      "</div></div></div></footer>" +
      '<div class="uk-modal" id="uk-glossary-modal" hidden role="dialog" aria-modal="true" aria-labelledby="uk-glossary-modal-title">' +
      '<div class="uk-modal__panel">' +
      '<button type="button" class="cp-btn-ghost" id="uk-glossary-modal-close">Close</button>' +
      '<h2 id="uk-glossary-modal-title">What this means</h2>' +
      '<div id="uk-glossary-modal-body"></div>' +
      "</div></div>" +
      '<div class="uk-modal" id="uk-auth-modal" hidden role="dialog" aria-modal="true" aria-labelledby="uk-auth-modal-title">' +
      '<div class="uk-modal__panel uk-auth-panel">' +
      '<button type="button" class="cp-btn-ghost" id="uk-auth-modal-close">Close</button>' +
      '<h2 id="uk-auth-modal-title">Sign in</h2>' +
      '<p class="uk-auth-lead" id="uk-auth-lead">Use your CasePath email. The same account works on casepath.com.au and casepath.co.uk.</p>' +
      '<p class="uk-auth-error" id="uk-auth-error" hidden></p>' +
      '<p class="uk-auth-ok" id="uk-auth-ok" hidden></p>' +
      '<form id="uk-auth-form" class="uk-auth-form">' +
      '<label for="uk-auth-email">Email</label>' +
      '<input id="uk-auth-email" name="email" type="email" autocomplete="username" required>' +
      '<label for="uk-auth-password" id="uk-auth-password-label">Password</label>' +
      '<input id="uk-auth-password" name="password" type="password" autocomplete="current-password" minlength="12">' +
      '<p class="uk-pass-hint" id="uk-auth-pass-hint" hidden>Must contain a lowercase letter, an uppercase letter, a number, and a symbol, and be at least 12 characters.</p>' +
      '<div id="uk-auth-confirm-wrap" hidden>' +
      '<label for="uk-auth-confirm">Confirm password</label>' +
      '<input id="uk-auth-confirm" name="confirmPassword" type="password" autocomplete="new-password" minlength="12">' +
      "</div>" +
      '<div id="uk-auth-terms-wrap" hidden>' +
      '<p id="uk-auth-terms-scroll-hint" class="uk-terms-hint">↓ Scroll to the bottom to accept</p>' +
      '<div id="signup-terms-box" class="uk-terms-box" tabindex="0">' +
      "<h3>Terms of use</h3>" +
      "<p>These notes explain how CasePath UK currently works. They apply to the England and Wales product at this website.</p>" +
      "<p>If you do not want to use the product on these terms, do not create an account or enter information.</p>" +
      "<p>CasePath UK is an educational preparation product for England and Wales only. It does not cover Scotland or Northern Ireland.</p>" +
      "<p>CasePath UK provides general information and self-help tools. Nothing on this website is legal advice, a legal opinion, legal representation, or a legal service.</p>" +
      "<p>Using CasePath UK does not create a solicitor-client relationship, or any other professional retainer, between you and the people who operate, develop, or contribute to CasePath.</p>" +
      "<p>You are responsible for checking that information you enter is accurate, reviewing every document or answer before you use or file it, and deciding whether the material is appropriate for your circumstances.</p>" +
      "<p>Published England and Wales subscription prices are shown during sign-up and on the Pricing page. Stripe Checkout can be started from those published options. An account is required to use CasePath forms.</p>" +
      "<p>Read the full <a href=\"" + href("legal/terms.html") + "\" target=\"_blank\" rel=\"noopener\">Terms</a> and <a href=\"" + href("legal/privacy.html") + "\" target=\"_blank\" rel=\"noopener\">Privacy</a> pages before you accept.</p>" +
      '<div id="signup-terms-bottom-sentinel" class="uk-terms-sentinel" aria-hidden="true"></div>' +
      "</div>" +
      '<label class="uk-terms-check-label" for="signup-terms-check">' +
      '<input type="checkbox" id="signup-terms-check" disabled> ' +
      'I have read and agree to the <a href="' + href("legal/terms.html") + '" target="_blank" rel="noopener">Terms</a> and <a href="' + href("legal/privacy.html") + '" target="_blank" rel="noopener">Privacy</a> notices.' +
      "</label>" +
      "</div>" +
      '<div class="uk-turnstile" id="uk-turnstile-signin"></div>' +
      '<div class="uk-turnstile" id="uk-turnstile-signup" hidden></div>' +
      '<div class="uk-turnstile" id="uk-turnstile-recovery" hidden></div>' +
      '<button type="submit" class="cp-btn-primary" id="uk-auth-submit">Sign in</button>' +
      "</form>" +
      '<p class="uk-auth-switch" id="uk-auth-switch"></p>' +
      "</div></div>" +
      '<div class="uk-modal" id="uk-pricing-modal" hidden role="dialog" aria-modal="true" aria-labelledby="uk-pricing-modal-title">' +
      '<div class="uk-modal__panel uk-pricing-modal-panel"></div>' +
      "</div>"
    );
  }

  var UK_QUICK_EXIT_URL = "https://www.google.com/";

  function suppressReferrerForExit() {
    try {
      var meta = d.querySelector('meta[name="referrer"]');
      if (!meta) {
        meta = d.createElement("meta");
        meta.setAttribute("name", "referrer");
        d.head.appendChild(meta);
      }
      meta.setAttribute("content", "no-referrer");
    } catch (_e) {}
  }

  function activateUkQuickExit() {
    suppressReferrerForExit();
    try {
      w.location.replace(UK_QUICK_EXIT_URL);
    } catch (_e) {
      try {
        w.location.href = UK_QUICK_EXIT_URL;
      } catch (_e2) {}
    }
  }

  function mountQuickExit() {
    if (d.getElementById("uk-quick-exit")) return;
    var a = d.createElement("a");
    a.id = "uk-quick-exit";
    a.className = "uk-quick-exit";
    a.href = UK_QUICK_EXIT_URL;
    a.setAttribute("referrerpolicy", "no-referrer");
    try {
      a.referrerPolicy = "no-referrer";
    } catch (_eRp) {}
    a.rel = "noreferrer";
    a.setAttribute("aria-label", "Quick Exit");
    a.textContent = "QUICK EXIT";
    a.addEventListener("click", function (ev) {
      if (ev) {
        if (typeof ev.preventDefault === "function") ev.preventDefault();
        if (typeof ev.stopPropagation === "function") ev.stopPropagation();
      }
      activateUkQuickExit();
    });
    var skip = d.querySelector(".casepath-skip-link");
    if (skip && skip.parentNode) {
      skip.parentNode.insertBefore(a, skip.nextSibling);
    } else if (d.body.firstChild) {
      d.body.insertBefore(a, d.body.firstChild);
    } else {
      d.body.appendChild(a);
    }
  }

  function bindNav() {
    var btn = d.getElementById("uk-mobile-toggle");
    var links = d.getElementById("uk-nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function resourceCardsHtml(spec) {
    var kinds = String(spec || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var parts = [];
    var i;
    for (i = 0; i < kinds.length; i++) {
      if (kinds[i] === "kids") {
        parts.push(
          '<aside class="uk-resource-card" data-uk-resource="about-the-kids">' +
          '<p class="uk-resource-card__kicker">About the Kids</p>' +
          "<p>Family proceedings can become focused on forms, evidence and disputes. Keep the child's experience in view.</p>" +
          '<p><a href="' + href("about-the-kids.html") + '">About the Kids</a></p>' +
          "</aside>"
        );
      } else if (kinds[i] === "mental-health") {
        parts.push(
          '<aside class="uk-resource-card" data-uk-resource="mental-health">' +
          '<p class="uk-resource-card__kicker">Mental Health</p>' +
          "<p>Separation and family court can be exhausting. Support is available if you need it.</p>" +
          '<p><a href="' + href("mental-health.html") + '">Mental Health</a></p>' +
          "</aside>"
        );
      }
    }
    return parts.join("");
  }

  function mountResourceCards() {
    var spec = d.body.getAttribute("data-uk-resources");
    if (!spec) return;
    var html = resourceCardsHtml(spec);
    if (!html) return;
    var existing = d.getElementById("uk-resource-cards");
    if (existing) {
      existing.innerHTML = html;
      return;
    }
    var host = d.createElement("div");
    host.id = "uk-resource-cards";
    host.innerHTML = html;
    var main = d.getElementById("main-content");
    if (!main) return;
    var tmm = main.querySelector(".uk-tmm");
    if (tmm) {
      var crumb = tmm.querySelector("p.uk-crumb");
      if (crumb) tmm.insertBefore(host, crumb);
      else tmm.appendChild(host);
      return;
    }
    var page = main.querySelector(".uk-page") || main;
    page.appendChild(host);
  }

  function assistantResources(id) {
    if (id === "c100" || id === "c1a" || id === "c2" || id === "c79" || id === "c7" || id === "c1" || id === "c78" || id === "c120" || id === "cpra1" || id === "cpra2" || id === "cpra3" || id === "c9" || id === "fm1") {
      return "kids,mental-health";
    }
    if (id === "fl401" || id === "fl401-statement" || id === "fl403" || id === "fl403a" || id === "fl407" || id === "fl415" || id === "c8" || id === "form-a" || id === "form-a1" || id === "form-b" || id === "form-e" || id === "form-e1" || id === "form-e2" || id === "form-p" || id === "form-p1" || id === "form-p2" || id === "form-ppf" || id === "form-ppf1" || id === "form-ppf2" || id === "es1" || id === "es2" || id === "fm5" || id === "d8" || id === "d84" || id === "d36" || id === "d81" || id === "d11") {
      return "mental-health";
    }
    return "";
  }

  function bindGlossaryModal() {
    var modal = d.getElementById("uk-glossary-modal");
    var close = d.getElementById("uk-glossary-modal-close");
    if (!modal || !close) return;
    close.addEventListener("click", function () {
      modal.hidden = true;
    });
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) modal.hidden = true;
    });
    d.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      var pricingModal = d.getElementById("uk-pricing-modal");
      if (pricingModal && !pricingModal.hidden) {
        if (w.CasePathUK.pricing && typeof w.CasePathUK.pricing.closeModal === "function") {
          w.CasePathUK.pricing.closeModal();
        } else {
          pricingModal.hidden = true;
        }
        return;
      }
      var authModal = d.getElementById("uk-auth-modal");
      if (authModal && !authModal.hidden) {
        authModal.hidden = true;
        return;
      }
      modal.hidden = true;
    });
  }

  function loadUkScript(src) {
    return new Promise(function (resolve, reject) {
      var abs = (w.CasePathUK && w.CasePathUK.asset) ? w.CasePathUK.asset(src) : src;
      if (d.querySelector('script[data-uk-src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = d.createElement("script");
      s.src = abs;
      s.async = false;
      s.dataset.ukSrc = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error(src)); };
      d.head.appendChild(s);
    });
  }

  var authMode = "signin";
  var ukTermsUnlocked = false;

  function setAuthMessage(kind, text) {
    var err = d.getElementById("uk-auth-error");
    var ok = d.getElementById("uk-auth-ok");
    if (err) {
      err.hidden = kind !== "error";
      err.textContent = kind === "error" ? text : "";
    }
    if (ok) {
      ok.hidden = kind !== "ok";
      ok.textContent = kind === "ok" ? text : "";
    }
  }

  function paintAuthMode(mode) {
    authMode = mode || "signin";
    var title = d.getElementById("uk-auth-modal-title");
    var lead = d.getElementById("uk-auth-lead");
    var submit = d.getElementById("uk-auth-submit");
    var password = d.getElementById("uk-auth-password");
    var passwordLabel = d.getElementById("uk-auth-password-label");
    var passHint = d.getElementById("uk-auth-pass-hint");
    var confirmWrap = d.getElementById("uk-auth-confirm-wrap");
    var termsWrap = d.getElementById("uk-auth-terms-wrap");
    var switchEl = d.getElementById("uk-auth-switch");
    var signinBox = d.getElementById("uk-turnstile-signin");
    var signupBox = d.getElementById("uk-turnstile-signup");
    var recoveryBox = d.getElementById("uk-turnstile-recovery");
    var termsCheck = d.getElementById("signup-terms-check");
    setAuthMessage("", "");
    if (signinBox) signinBox.hidden = authMode !== "signin";
    if (signupBox) signupBox.hidden = authMode !== "signup";
    if (recoveryBox) recoveryBox.hidden = authMode !== "recovery";
    if (password) {
      password.hidden = authMode === "recovery";
      password.required = authMode !== "recovery";
      password.autocomplete = authMode === "signup" ? "new-password" : "current-password";
    }
    if (passwordLabel) passwordLabel.hidden = authMode === "recovery";
    if (passHint) passHint.hidden = authMode !== "signup";
    if (confirmWrap) confirmWrap.hidden = authMode !== "signup";
    if (termsWrap) termsWrap.hidden = authMode !== "signup";
    var formEl = d.getElementById("uk-auth-form");
    if (formEl && authMode === "signup" && w.CasePathUK.pricing && typeof w.CasePathUK.pricing.getSelectedPlanId === "function") {
      formEl.setAttribute("data-uk-selected-plan", w.CasePathUK.pricing.getSelectedPlanId() || "");
    } else if (formEl) {
      formEl.removeAttribute("data-uk-selected-plan");
    }
    if (termsCheck && authMode === "signup") {
      ukTermsUnlocked = false;
      termsCheck.checked = false;
      termsCheck.disabled = true;
      setupUkTermsGate();
    }
    if (authMode === "signup") {
      if (title) title.textContent = "Create a CasePath account";
      if (lead) {
        var plan = w.CasePathUK.pricingCatalogue && w.CasePathUK.pricing && w.CasePathUK.pricing.getSelectedPlanId
          ? w.CasePathUK.pricingCatalogue.get(w.CasePathUK.pricing.getSelectedPlanId())
          : null;
        var baseLead = (w.CasePathUK.gate && w.CasePathUK.gate.FORM_MESSAGE)
          ? w.CasePathUK.gate.FORM_MESSAGE
          : "Create an account to use CasePath forms and save your progress.";
        if (plan && plan.priceLabel) {
          lead.textContent = baseLead + " Selected plan: " + plan.name + " — " + plan.priceLabel + " recurring " + plan.intervalLabel + ".";
        } else {
          lead.textContent = baseLead;
        }
      }
      if (submit) submit.textContent = "Create account";
      if (switchEl) {
        switchEl.innerHTML =
          '<button type="button" class="uk-text-btn" data-uk-auth-mode="signin">Already have an account? Sign in</button> · ' +
          '<button type="button" class="uk-text-btn" data-uk-auth-mode="recovery">Forgot password</button>';
      }
    } else if (authMode === "recovery") {
      if (title) title.textContent = "Reset password";
      if (lead) lead.textContent = "We will email a reset link that returns you to this UK site.";
      if (submit) submit.textContent = "Send reset link";
      if (switchEl) {
        switchEl.innerHTML =
          '<button type="button" class="uk-text-btn" data-uk-auth-mode="signin">Back to sign in</button>';
      }
    } else {
      if (title) title.textContent = "Sign in";
      if (lead) lead.textContent = "Use your existing CasePath email and password. The same account works on casepath.com.au and casepath.co.uk.";
      if (submit) submit.textContent = "Sign in";
      if (switchEl) {
        switchEl.innerHTML =
          '<button type="button" class="uk-text-btn" data-uk-auth-mode="signup">Create a CasePath account</button> · ' +
          '<button type="button" class="uk-text-btn" data-uk-auth-mode="recovery">Forgot password</button>';
      }
    }
    if (w.CasePathUK.turnstile) {
      w.CasePathUK.turnstile.mount(authMode === "signup" ? "signup" : authMode === "recovery" ? "recovery" : "signin");
    }
  }

  function openAuthForm(mode) {
    var pricingModal = d.getElementById("uk-pricing-modal");
    if (pricingModal) pricingModal.hidden = true;
    var modal = d.getElementById("uk-auth-modal");
    if (!modal) return;
    modal.hidden = false;
    paintAuthMode(mode || "signin");
    var email = d.getElementById("uk-auth-email");
    if (email) email.focus();
  }

  function openAuth(mode) {
    var next = mode || "signin";
    if (next === "signup" && w.CasePathUK.pricing && typeof w.CasePathUK.pricing.openSignupPicker === "function") {
      w.CasePathUK.pricing.openSignupPicker();
      return;
    }
    openAuthForm(next);
  }

  function closeAuth() {
    var modal = d.getElementById("uk-auth-modal");
    if (modal) modal.hidden = true;
  }

  function unlockUkTerms() {
    ukTermsUnlocked = true;
    var checkbox = d.getElementById("signup-terms-check");
    var hint = d.getElementById("uk-auth-terms-scroll-hint");
    if (checkbox) checkbox.disabled = false;
    if (hint) hint.hidden = true;
  }

  function setupUkTermsGate() {
    var box = d.getElementById("signup-terms-box");
    var checkbox = d.getElementById("signup-terms-check");
    var hint = d.getElementById("uk-auth-terms-scroll-hint");
    var sentinel = d.getElementById("signup-terms-bottom-sentinel");
    if (!box || !checkbox) return;
    ukTermsUnlocked = false;
    checkbox.checked = false;
    checkbox.disabled = true;
    if (hint) hint.hidden = false;
    function atBottom() {
      var max = Math.max(0, box.scrollHeight - box.clientHeight);
      if (max <= 2) return true;
      return box.scrollTop >= max - Math.max(8, Math.ceil(box.clientHeight * 0.04));
    }
    function check() {
      if (ukTermsUnlocked) return;
      if (atBottom()) unlockUkTerms();
    }
    if (box._ukTermsBound) {
      box.scrollTop = 0;
      setTimeout(check, 50);
      return;
    }
    box._ukTermsBound = true;
    box.addEventListener("scroll", check, { passive: true });
    var modal = d.getElementById("uk-auth-modal");
    if (modal && !modal._ukTermsScrollFwd) {
      modal._ukTermsScrollFwd = true;
      modal.addEventListener("wheel", function (e) {
        if (authMode !== "signup" || ukTermsUnlocked) return;
        var wrap = d.getElementById("uk-auth-terms-wrap");
        if (!wrap || wrap.hidden) return;
        var max = box.scrollHeight - box.clientHeight;
        if (max <= 0) return;
        box.scrollTop = Math.min(max, box.scrollTop + e.deltaY);
        check();
        e.preventDefault();
      }, { passive: false });
    }
    if (sentinel && typeof IntersectionObserver === "function") {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) unlockUkTerms();
        });
      }, { root: box, threshold: 0 });
      observer.observe(sentinel);
    }
    setTimeout(check, 50);
    setTimeout(check, 200);
  }

  function finishAuthSuccess() {
    closeAuth();
    paintAccountSlot();
    if (w.CasePathUK.gate && w.CasePathUK.gate.afterAuthNavigate()) return;
    if (w.CasePathUK.gate && w.CasePathUK.gate.isProtectedPage()) {
      w.dispatchEvent(new CustomEvent("casepath-uk-form-auth-ready"));
    }
  }

  function paintAccountSlot() {
    var slot = d.getElementById("uk-account-slot");
    if (!slot) return;
    var user = w.CasePathUK.auth ? w.CasePathUK.auth.getUser() : { signedIn: false };
    if (user.signedIn) {
      slot.innerHTML =
        '<span class="uk-account-email" title="' + String(user.email).replace(/"/g, "") + '">' +
        String(user.email || "Signed in").replace(/</g, "") +
        "</span>" +
        '<button type="button" class="uk-text-btn" id="uk-sign-out">Sign out</button>';
      var out = d.getElementById("uk-sign-out");
      if (out) {
        out.addEventListener("click", function () {
          w.CasePathUK.auth.signOut().then(function () {
            if (w.CasePathUK.store && w.CasePathUK.store.clearProtectedLocal) {
              w.CasePathUK.store.clearProtectedLocal();
            }
            paintAccountSlot();
            if (w.CasePathUK.gate && w.CasePathUK.gate.isProtectedPage()) {
              var root = d.getElementById("uk-wizard");
              if (root && w.CasePathUK.gate.paintFormGate) w.CasePathUK.gate.paintFormGate(root);
            }
          });
        });
      }
    } else {
      slot.innerHTML =
        '<button type="button" class="cp-btn-secondary uk-signin-btn" id="uk-sign-in">Sign in</button>';
      var inn = d.getElementById("uk-sign-in");
      if (inn) inn.addEventListener("click", function () { openAuth("signin"); });
    }
  }

  function bindAuthModal() {
    var modal = d.getElementById("uk-auth-modal");
    var close = d.getElementById("uk-auth-modal-close");
    var form = d.getElementById("uk-auth-form");
    var switchEl = d.getElementById("uk-auth-switch");
    if (!modal) return;
    if (close) close.addEventListener("click", closeAuth);
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) closeAuth();
    });
    if (switchEl) {
      switchEl.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-uk-auth-mode]");
        if (!btn) return;
        var next = btn.getAttribute("data-uk-auth-mode");
        if (next === "signup") {
          openAuth("signup");
          return;
        }
        paintAuthMode(next);
      });
    }
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var email = (d.getElementById("uk-auth-email") || {}).value || "";
        var password = (d.getElementById("uk-auth-password") || {}).value || "";
        var confirm = (d.getElementById("uk-auth-confirm") || {}).value || "";
        var termsEl = d.getElementById("signup-terms-check");
        var submit = d.getElementById("uk-auth-submit");
        if (submit) submit.disabled = true;
        setAuthMessage("", "");
        var auth = w.CasePathUK.auth;
        var job;
        if (authMode === "signup") {
          if (password !== confirm) {
            if (submit) submit.disabled = false;
            setAuthMessage("error", "Passwords do not match.");
            return;
          }
          if (!ukTermsUnlocked) {
            if (submit) submit.disabled = false;
            setAuthMessage("error", "Please scroll through the Terms of Use to the end before accepting.");
            return;
          }
          if (!termsEl || !termsEl.checked) {
            if (submit) submit.disabled = false;
            setAuthMessage("error", "Please read and accept the Terms of Use to continue.");
            return;
          }
          job = auth.signUp(email, password, { termsAccepted: true });
        } else if (authMode === "recovery") job = auth.forgotPassword(email);
        else job = auth.signIn(email, password);
        Promise.resolve(job).then(function (result) {
          if (submit) submit.disabled = false;
          if (!result || !result.ok) {
            setAuthMessage("error", (result && result.error) || "Please try again.");
            if (w.CasePathUK.turnstile) w.CasePathUK.turnstile.reset(authMode === "signup" ? "signup" : authMode === "recovery" ? "recovery" : "signin");
            return;
          }
          if (authMode === "signup" && result.needsConfirmation) {
            setAuthMessage("ok", "Check your email to confirm your CasePath account, then return here to sign in.");
            return;
          }
          if (authMode === "recovery") {
            setAuthMessage("ok", "If that email has a CasePath account, we have sent a reset link that returns to this UK site.");
            return;
          }
          finishAuthSuccess();
        }).catch(function (err) {
          if (submit) submit.disabled = false;
          setAuthMessage("error", (err && err.message) || "Please try again.");
        });
      });
    }
  }

  function bootAuthAndStore() {
    var store = w.CasePathUK.store;
    var lastId = "";
    return loadUkScript("assets/js/uk-pricing-catalogue.js")
      .then(function () { return loadUkScript("assets/js/uk-pricing.js"); })
      .then(function () { return loadUkScript("assets/js/uk-auth.js"); })
      .then(function () { return loadUkScript("assets/js/uk-billing-checkout.js"); })
      .then(function () { return loadUkScript("assets/js/uk-auth-gate.js"); })
      .then(function () { return loadUkScript("assets/js/uk-turnstile.js"); })
      .then(function () { return loadUkScript("assets/js/uk-state-client.js"); })
      .then(function () { return loadUkScript("assets/js/uk-inbox-client.js"); })
      .then(function () { return loadUkScript("assets/js/uk-feedback.js"); })
      .then(function () { return w.CasePathUK.auth.init(); })
      .then(function () {
        if (w.CasePathUK.gate && w.CasePathUK.gate.interceptProtectedClicks) {
          w.CasePathUK.gate.interceptProtectedClicks(d);
        }
        paintAccountSlot();
        if (w.CasePathUK.auth.onChange) {
          w.CasePathUK.auth.onChange(function (user) {
            paintAccountSlot();
            var id = user && user.id;
            if (id && id !== lastId && store && store.hydrateFromCloud) {
              lastId = id;
              store.hydrateFromCloud().catch(function () { /* keep local */ });
            }
            if (!id) {
              lastId = "";
              if (store && store.clearProtectedLocal) store.clearProtectedLocal();
            }
          });
        }
        if (w.CasePathUK.auth.isSignedIn() && store && store.hydrateFromCloud) {
          lastId = w.CasePathUK.auth.getUser().id;
          return store.hydrateFromCloud();
        }
        if (store && store.clearProtectedLocal) store.clearProtectedLocal();
        return { mode: "signed-out" };
      })
      .then(function () {
        if (store && store.markReady) store.markReady();
      })
      .catch(function () {
        paintAccountSlot();
        if (store && store.clearProtectedLocal) store.clearProtectedLocal();
        if (store && store.markReady) store.markReady();
      });
  }

  function loadCountrySwitch() {
    if (d.querySelector('script[src*="casepath-country-switch.js"]')) return;
    function add(src) {
      var s = d.createElement("script");
      s.src = href(src);
      s.async = false;
      (d.body || d.documentElement).appendChild(s);
    }
    add("assets/js/jurisdiction/casepath-country-routes.js?v=20260909countryswitch1");
    add("assets/js/jurisdiction/casepath-country-switch.js?v=20260909countryswitch1");
  }

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.mountShell = function (active) {
    var mountHead = d.getElementById("uk-header");
    var mountFoot = d.getElementById("uk-footer");
    if (mountHead) mountHead.outerHTML = headerHtml(active || d.body.getAttribute("data-uk-nav") || "home");
    if (mountFoot) mountFoot.outerHTML = footerHtml();
    mountQuickExit();
    bindNav();
    bindGlossaryModal();
    bindAuthModal();
    paintAccountSlot();
    mountResourceCards();
    bootAuthAndStore();
    loadCountrySwitch();
  };
  w.CasePathUK.openAuth = openAuth;
  w.CasePathUK.openAuthForm = openAuthForm;
  w.CasePathUK.resourceCardsHtml = resourceCardsHtml;
  w.CasePathUK.assistantResources = assistantResources;
  w.CasePathUK.activateQuickExit = activateUkQuickExit;
  w.CasePathUK.QUICK_EXIT_URL = UK_QUICK_EXIT_URL;

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", function () {
      w.CasePathUK.mountShell(d.body.getAttribute("data-uk-nav"));
    });
  } else {
    w.CasePathUK.mountShell(d.body.getAttribute("data-uk-nav"));
  }
})(window, document);
