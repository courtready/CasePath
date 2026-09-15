/**
 * CasePath UK How It Works FAQ accordion.
 * Exclusive open: only the clicked item stays open.
 * Keyboard: native buttons (Enter/Space). aria-expanded stays in sync.
 */
(function (d) {
  "use strict";

  var root = d.getElementById("uk-hiw-faq");
  if (!root) return;

  function panelOf(btn) {
    var id = btn.getAttribute("aria-controls");
    return id ? d.getElementById(id) : null;
  }

  function setOpen(btn, open) {
    var panel = panelOf(btn);
    var item = btn.closest(".uk-hiw-faq-item");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) panel.hidden = !open;
    if (item) item.classList.toggle("is-open", open);
  }

  function closeOthers(keep) {
    root.querySelectorAll(".uk-hiw-faq-q").forEach(function (btn) {
      if (btn !== keep) setOpen(btn, false);
    });
  }

  root.querySelectorAll(".uk-hiw-faq-q").forEach(function (btn) {
    setOpen(btn, btn.getAttribute("aria-expanded") === "true");
    btn.addEventListener("click", function () {
      var willOpen = btn.getAttribute("aria-expanded") !== "true";
      closeOthers(btn);
      setOpen(btn, willOpen);
    });
  });
})(document);
