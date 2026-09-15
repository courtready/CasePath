/**
 * CasePath UK pricing page + signup plan picker.
 * Checkout buttons call CasePathUK.openPricingCheckout when that function exists.
 * Entitlement is not granted by this file.
 */
(function (w, d) {
  "use strict";

  var selectedId = "";
  var previousFocus = null;
  var trapHandler = null;
  var lastModalOpener = null;

  function cat() {
    return w.CasePathUK && w.CasePathUK.pricingCatalogue;
  }

  function href(rel) {
    return (w.CasePathUK && w.CasePathUK.href) ? w.CasePathUK.href(rel) : rel;
  }

  function signedIn() {
    return !!(w.CasePathUK && w.CasePathUK.auth && w.CasePathUK.auth.isSignedIn());
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function individualCard(plan, opts) {
    var compact = !!(opts && opts.compact);
    var selected = selectedId === plan.id;
    var featured = !!plan.featured;
    var cls = "pricing-plan-card" + (featured ? " ppc-featured" : "") + (selected ? " is-selected" : "");
    var save = plan.saveLabel
      ? '<p class="ppc-save">' + escapeHtml(plan.saveLabel) + "</p>"
      : '<p class="ppc-save ppc-save--empty">&nbsp;</p>';
    var btnLabel = compact ? "Select " + plan.name : "Choose " + plan.name + " →";
    var desc = "Recurring subscription for England &amp; Wales. Renews " + escapeHtml(plan.intervalLabel) + ".";
    var features =
      "<li>✓ Recurring " + escapeHtml(plan.intervalLabel) + "</li>" +
      "<li>✓ Full amount billed each period — not monthly instalments</li>" +
      "<li>✓ Cancel to stop the next renewal</li>" +
      "<li>✓ Access ordinarily continues through the period already paid for</li>";
    var checkoutBtn = compact
      ? ""
      : '<button type="button" class="ppc-btn ' + (featured ? "ppc-btn-primary" : "ppc-btn-secondary") + '" ' +
        'data-cp-checkout-sku="' + escapeHtml(plan.id) + '">' + escapeHtml(btnLabel) + "</button>";
    var selectBtn = compact
      ? '<button type="button" class="ppc-btn ' + (featured ? "ppc-btn-primary" : "ppc-btn-secondary") + '" ' +
        'data-uk-select-plan="' + escapeHtml(plan.id) + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
        escapeHtml(btnLabel) + "</button>"
      : "";
    return (
      '<div class="' + cls + '" data-plan="' + escapeHtml(plan.id) + '" data-cp-plan-id="' + escapeHtml(plan.id) + '">' +
      (featured ? '<div class="ppc-badge popular">Recurring</div>' : '<div class="ppc-badge account">Recurring</div>') +
      '<h3 class="ppc-name">' + escapeHtml(plan.name) + "</h3>" +
      '<p class="ppc-desc">' + desc + "</p>" +
      '<div class="ppc-price-wrap"><span class="ppc-amount">' + escapeHtml(plan.priceLabel) + '</span>' +
      '<span class="ppc-period">/ ' + escapeHtml(plan.periodLabel) + " · GBP</span></div>" +
      '<p class="ppc-effective">Effective monthly cost: ' + escapeHtml(plan.effectiveMonthlyLabel) + "</p>" +
      save +
      '<ul class="ppc-features">' + features + "</ul>" +
      '<div class="ppc-actions">' +
      checkoutBtn + selectBtn +
      '<p class="ppc-cancel-note">Recurring subscription</p>' +
      "</div></div>"
    );
  }

  function businessCard(plan) {
    var examples = (plan.examples || []).map(function (ex) {
      return "<li>" + escapeHtml(ex) + "</li>";
    }).join("");
    var min = plan.minimumLabel
      ? '<p class="ppc-minimum"><strong>Minimum:</strong> ' + escapeHtml(plan.minimumLabel) + "</p>"
      : "";
    return (
      '<div class="pricing-plan-card" data-plan="' + escapeHtml(plan.id) + '" data-cp-plan-id="' + escapeHtml(plan.id) + '">' +
      '<div class="ppc-badge account">Law firm</div>' +
      '<h3 class="ppc-name">' + escapeHtml(plan.name) + "</h3>" +
      '<p class="ppc-desc">' + escapeHtml(plan.seatsLabel) + ". " + escapeHtml(plan.intervalLabel) + ".</p>" +
      '<div class="ppc-price-wrap"><span class="ppc-amount">' + escapeHtml(plan.priceLabel) + '</span>' +
      '<span class="ppc-period">' + escapeHtml(plan.periodLabel) + " · GBP</span></div>" +
      min +
      '<ul class="ppc-features">' + examples + "</ul>" +
      '<div class="ppc-actions">' +
      '<a class="ppc-btn ppc-btn-secondary" href="' + href("contact.html") + '">Contact about firm pricing →</a>' +
      '<p class="ppc-cancel-note">Annual recurring</p>' +
      "</div></div>"
    );
  }

  function pageHtml() {
    var c = cat();
    if (!c) return "";
    var individuals = c.individual.map(function (p) { return individualCard(p, { compact: false }); }).join("");
    var firms = c.business.map(businessCard).join("");
    return (
      '<div class="uk-pricing-root pricing-root">' +
      '<div class="cp-page-hero"><div class="cp-page-hero__inner"><div class="cp-page-hero__content">' +
      '<div class="cp-page-hero__eyebrow">Plans &amp; pricing</div>' +
      "<h1>Pricing</h1>" +
      '<p class="cp-page-hero__statement">England &amp; Wales pricing for individuals and law firms.</p>' +
      '<p class="cp-page-hero__support">These amounts are in pounds sterling.</p>' +
      "</div></div></div>" +
      '<div class="pricing-early-access-banner"><div class="pricing-early-access-inner">' +
      "1, 3, 6 and 12 month options are recurring subscriptions. The 12 month option renews every 12 months. CasePath is not a law firm and does not provide legal advice." +
      "</div></div>" +
      '<div class="section-wrap">' +
      '<div class="ppc-launch-row"><p class="ppc-launch-head">Individual access — United Kingdom (GBP)</p>' +
      '<p class="ppc-launch-hint">1, 3, 6 and 12 month options renew at the same amount for the same period. The 12 month option renews every 12 months.</p></div>' +
      '<div class="plans-audience-labels"><p class="ppc-audience-label">Individuals<span class="ppc-audience-label-sub">For people preparing their own matter in England &amp; Wales</span></p></div>' +
      '<div class="plans-grid-main uk-pricing-individual" role="list">' + individuals + "</div>" +
      '<section class="ppc-secondary-section" aria-labelledby="uk-pricing-firms-heading">' +
      '<h2 id="uk-pricing-firms-heading" class="ppc-secondary-head">Law firms</h2>' +
      '<p class="ppc-secondary-lead">Annual seats for England &amp; Wales. Solo and small-firm pricing is subject to a £600 per firm minimum. Prices are not published for 50 or more seats.</p>' +
      '<div class="plans-grid-secondary uk-pricing-business" role="list">' + firms + "</div>" +
      "</section>" +
      '<h2 class="faq-header">Common questions</h2>' +
      '<div class="faq-wrap">' +
      faqItem(
        "Can I really cancel at any time?",
        "Yes. Recurring 1, 3, 6 and 12 month plans can be cancelled at any time. Cancellation is intended to stop the next renewal while ordinarily allowing access through the period already paid for. Sign in and use Manage or cancel recurring subscription on the Pricing page. See the <a href=\"" + href("legal/refund-policy.html") + "\">Refund Policy</a>."
      ) +
      faqItem(
        "What happens to my data if I cancel?",
        "Cancelling a recurring plan does not automatically delete your CasePath account or your UK saved work. Your England and Wales preparation remains available until you delete it. You can delete UK saved work from <a href=\"" + href("account.html") + "\">Account</a>. Whole-account deletion is not available in this UK version. See <a href=\"" + href("legal/your-data.html") + "\">Your Data</a>."
      ) +
      faqItem(
        "What is your refund policy?",
        "Subscription and purchase refunds, billing questions, and cancellation are explained in the <a href=\"" + href("legal/refund-policy.html") + "\">Refund Policy</a>. Related: <a href=\"" + href("legal/terms.html") + "\">Terms</a>."
      ) +
      faqItem(
        "Is this legal advice?",
        "No. CasePath provides legal information — plain-English explanations of family court processes in England and Wales, and tools to help you prepare paperwork. It is not a substitute for a solicitor. For complex matters or where your safety is at risk, please consult a qualified family solicitor."
      ) +
      faqItem(
        "What is Guided Document Preparation?",
        "<strong>Guided Document Preparation</strong> uses step-by-step preparation assistants to help organise the information you provide into structured document formats for England and Wales. CasePath asks each section in plain English and helps you prepare your paperwork. It does not provide legal advice or invent facts."
      ) +
      faqItem(
        "What is Ask a Question?",
        "<strong>Ask a Question</strong> is an information and learning tool. In this UK version, educational guidance is through the <a href=\"" + href("glossary.html") + "\">Glossary</a> and related Tell me more pages for England and Wales family court terms. There is no UK Ask a Question AI model in this version. CasePath remains educational software, not a law practice."
      ) +
      faqItem(
        "Can my lawyer access my account?",
        "Not through a CasePath UK login. This UK version does not currently provide a solicitor or lawyer invitation, or read-only access to your account. You can export or download your own preparation and share it yourself if you choose. CasePath is not a law firm."
      ) +
      faqItem(
        "Is my data secure?",
        "Signed-in UK preparation is stored in the United Kingdom and reached through a sign-in check. Connections use encrypted HTTPS. CasePath UK does not currently send your preparation to an AI model and does not use your case answers to train a model. See <a href=\"" + href("legal/privacy.html") + "\">Privacy</a> and <a href=\"" + href("legal/your-data.html") + "\">Your Data</a>."
      ) +
      "</div>" +
      '<div class="pricing-cta">' +
      "<h2>Create a CasePath account</h2>" +
      "<p>Create a CasePath account to use the product. Terms still apply.</p>" +
      '<button type="button" class="btn-primary" data-uk-pricing-signup>Create account →</button>' +
      "</div></div>" +
      '<div class="legal-disclaimer-bar">CasePath provides legal information and document assistance only — not legal advice, representation, or guaranteed outcomes. England and Wales only.</div>' +
      "</div>"
    );
  }

  function faqItem(q, a) {
    return (
      '<div class="pfaq-item"><button type="button" class="pfaq-q">' + escapeHtml(q) +
      '<span class="pfaq-icon" aria-hidden="true">+</span></button>' +
      '<div class="pfaq-a">' + a + "</div></div>"
    );
  }

  function modalInnerHtml() {
    var c = cat();
    if (!c) return "";
    var cards = c.individual.map(function (p) { return individualCard(p, { compact: true }); }).join("");
    return (
      '<button type="button" class="cp-btn-ghost" id="uk-pricing-modal-close" aria-label="Close pricing">Close</button>' +
      '<h2 id="uk-pricing-modal-title">Choose a plan</h2>' +
      '<p class="uk-pricing-modal-lead" id="uk-pricing-modal-lead">Create a CasePath account after choosing an England &amp; Wales option. 1, 3, 6 and 12 months are recurring subscriptions.</p>' +
      '<p class="uk-pricing-modal-error" id="uk-pricing-modal-error" hidden></p>' +
      '<div class="uk-pricing-modal-grid" role="radiogroup" aria-label="Individual subscription options">' +
      cards +
      "</div>" +
      '<p class="ppc-cancel-note uk-pricing-modal-note">£19.99 every 1 month · £49 every 3 months · £89 every 6 months · £149 every 12 months</p>' +
      '<button type="button" class="cp-btn-primary" id="uk-pricing-modal-continue">Continue to create account</button>'
    );
  }

  function focusable(root) {
    if (!root) return [];
    return Array.prototype.slice.call(
      root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return false;
      var style = w.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function releaseTrap() {
    if (trapHandler) {
      d.removeEventListener("keydown", trapHandler, true);
      trapHandler = null;
    }
    d.body.classList.remove("uk-modal-open");
    if (previousFocus && typeof previousFocus.focus === "function") {
      try { previousFocus.focus(); } catch (_e) {}
    }
    previousFocus = null;
  }

  function trap(modal) {
    releaseTrap();
    previousFocus = d.activeElement;
    d.body.classList.add("uk-modal-open");
    trapHandler = function (ev) {
      if (modal.hidden) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeModal();
        return;
      }
      if (ev.key !== "Tab") return;
      var nodes = focusable(modal);
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (ev.shiftKey && d.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && d.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    };
    d.addEventListener("keydown", trapHandler, true);
    var nodes = focusable(modal);
    var preferred = modal.querySelector("[data-uk-select-plan][aria-pressed='true']") || nodes[0];
    if (preferred) preferred.focus();
  }

  function setError(text) {
    var el = d.getElementById("uk-pricing-modal-error");
    if (!el) return;
    if (text) {
      el.hidden = false;
      el.textContent = text;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function paintSelection() {
    d.querySelectorAll("#uk-pricing-modal [data-cp-plan-id]").forEach(function (card) {
      var id = card.getAttribute("data-cp-plan-id");
      var on = id === selectedId;
      card.classList.toggle("is-selected", on);
      var btn = card.querySelector("[data-uk-select-plan]");
      if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function selectPlan(id, source) {
    var c = cat();
    if (!c || !c.isIndividual(id)) return false;
    selectedId = id;
    try {
      w.CasePathUK.selectedPlanId = id;
    } catch (_e) {}
    paintSelection();
    setError("");
    if (source === "page" && !signedIn()) {
      openSignupPicker(id);
    }
    return true;
  }

  function ensureModal() {
    var modal = d.getElementById("uk-pricing-modal");
    if (!modal) return null;
    var panel = modal.querySelector(".uk-pricing-modal-panel");
    if (panel && !panel.dataset.ukPricingReady) {
      panel.innerHTML = modalInnerHtml();
      panel.dataset.ukPricingReady = "1";
      bindModal(modal, panel);
    }
    paintSelection();
    return modal;
  }

  function bindModal(modal, panel) {
    var close = panel.querySelector("#uk-pricing-modal-close");
    var cont = panel.querySelector("#uk-pricing-modal-continue");
    if (close) close.addEventListener("click", closeModal);
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) closeModal();
    });
    panel.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-uk-select-plan]");
      if (btn) {
        selectPlan(btn.getAttribute("data-uk-select-plan"), "modal");
        return;
      }
      var card = ev.target.closest("[data-cp-plan-id]");
      if (card) selectPlan(card.getAttribute("data-cp-plan-id"), "modal");
    });
    if (cont) {
      cont.addEventListener("click", function () {
        if (!cat() || !cat().isIndividual(selectedId)) {
          setError("Please choose a subscription option to continue.");
          return;
        }
        closeModal({ keepSelection: true });
        if (signedIn()) return;
        if (typeof w.CasePathUK.openAuthForm === "function") {
          w.CasePathUK.openAuthForm("signup");
        }
      });
    }
  }

  function openSignupPicker(planId) {
    if (signedIn()) {
      setError("");
    }
    if (planId) selectPlan(planId, "modal");
    if (!selectedId && cat() && cat().individual.length) {
      var featured = cat().individual.filter(function (p) { return p.featured; })[0];
      selectedId = (featured && featured.id) || cat().individual[0].id;
      try { w.CasePathUK.selectedPlanId = selectedId; } catch (_e2) {}
    }
    var auth = d.getElementById("uk-auth-modal");
    if (auth) auth.hidden = true;
    var modal = ensureModal();
    if (!modal) {
      if (typeof w.CasePathUK.openAuthForm === "function") w.CasePathUK.openAuthForm("signup");
      return;
    }
    lastModalOpener = d.activeElement;
    modal.hidden = false;
    paintSelection();
    trap(modal);
  }

  function closeModal(opts) {
    var modal = d.getElementById("uk-pricing-modal");
    if (modal) modal.hidden = true;
    setError("");
    releaseTrap();
    if (opts && opts.keepSelection) return;
    if (lastModalOpener && typeof lastModalOpener.focus === "function") {
      try { lastModalOpener.focus(); } catch (_e) {}
    }
  }

  function mountPage() {
    var mount = d.getElementById("uk-pricing-mount");
    if (!mount) return;
    mount.innerHTML = pageHtml();
    var status = d.getElementById("uk-pricing-load-status");
    if (status) status.remove();
    var staticBlock = d.getElementById("uk-pricing-static");
    if (staticBlock) staticBlock.hidden = true;
    mount.addEventListener("click", function (ev) {
      var faq = ev.target.closest(".pfaq-q");
      if (faq) {
        var item = faq.closest(".pfaq-item");
        var wrap = faq.closest(".faq-wrap");
        if (!item || !wrap) return;
        var wasOpen = item.classList.contains("open");
        wrap.querySelectorAll(".pfaq-item.open").forEach(function (el) {
          el.classList.remove("open");
        });
        if (!wasOpen) item.classList.add("open");
        return;
      }
      var signup = ev.target.closest("[data-uk-pricing-signup]");
      if (signup) {
        openSignupPicker(selectedId);
        return;
      }
      var checkout = ev.target.closest("[data-cp-checkout-sku]");
      if (checkout) {
        ev.preventDefault();
        var sku = checkout.getAttribute("data-cp-checkout-sku");
        if (w.CasePathUK && typeof w.CasePathUK.openPricingCheckout === "function") {
          w.CasePathUK.openPricingCheckout(sku);
        }
        return;
      }
      var choose = ev.target.closest("[data-uk-select-plan]");
      if (choose) {
        selectPlan(choose.getAttribute("data-uk-select-plan"), "page");
      }
    });
  }

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.pricing = {
    openSignupPicker: openSignupPicker,
    closeModal: closeModal,
    getSelectedPlanId: function () { return selectedId; },
    selectPlan: function (id) { return selectPlan(id, "modal"); },
    billingEnforced: false
  };

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", mountPage);
  } else {
    mountPage();
  }
})(window, document);
