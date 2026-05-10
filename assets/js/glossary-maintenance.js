/**
 * Standalone glossary: in-app links open the main SPA (index.html).
 */
function goAppPage(page) {
  var p = typeof page === "string" && page ? page : "home";
  try {
    localStorage.setItem("cr_target_page", p);
  } catch (e) {}
  window.location.href = "/index.html";
}
function showPage(page) {
  goAppPage(typeof page === "string" ? page : "home");
}
function selectDocTypeByValue(val) {
  try {
    if (val != null && String(val).length) {
      localStorage.setItem("cr_doc_type_pref", String(val));
    }
  } catch (e) {}
  goAppPage("doc-helper");
}
function cdBuildDashboard() {
  goAppPage("vault");
}

var activeCats = new Set();

function syncGlossaryCategoryCounts() {
  var bar = document.getElementById("glossary-cat-bar");
  if (!bar) return;

  var catCounts = Object.create(null);
  var keywordCounts = { divorce: 0, financial: 0, avo: 0 };

  var terms = document.querySelectorAll("#page-glossary .glossary-term");
  terms.forEach(function (term) {
    var catEl = term.querySelector(".term-cat");
    var cat = catEl ? catEl.getAttribute("data-cat") : "";
    if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;

    var nameEl = term.querySelector(".term-name");
    var defEl = term.querySelector(".term-def");
    var text = ((nameEl ? nameEl.textContent : "") + " " + (defEl ? defEl.textContent : "")).toLowerCase();

    if (text.includes("divorce")) keywordCounts.divorce += 1;
    if (text.includes("financial")) keywordCounts.financial += 1;
    if (text.includes("avo")) keywordCounts.avo += 1;
  });

  bar.querySelectorAll(".alpha-cat-chip").forEach(function (btn) {
    var cat = btn.dataset.cat || "";
    var count = 0;
    if (cat === "~divorce") count = keywordCounts.divorce;
    else if (cat === "~financial") count = keywordCounts.financial;
    else if (cat === "~avo") count = keywordCounts.avo;
    else count = catCounts[cat] || 0;

    var span = btn.querySelector("span");
    if (!span) {
      span = document.createElement("span");
      span.style.opacity = "0.6";
      span.style.fontSize = "0.6rem";
      btn.appendChild(document.createTextNode(" "));
      btn.appendChild(span);
    }
    span.textContent = String(count);

    var labelText = btn.cloneNode(true);
    labelText.querySelectorAll("span").forEach(function (node) {
      node.remove();
    });
    btn.dataset.baseLabel = (labelText.textContent || "").replace(/^✓\s*/, "").trim() + " " + count;
  });
}

function toggleCat(cat) {
  if (activeCats.has(cat)) activeCats.delete(cat);
  else activeCats.add(cat);
  updateCatBar();
  applyFilter();
}

function updateCatBar() {
  var hasSelection = activeCats.size > 0;
  document.querySelectorAll("#glossary-cat-bar .alpha-cat-chip").forEach(function (btn) {
    var isActive = activeCats.has(btn.dataset.cat);
    if (!btn.dataset.baseLabel) btn.dataset.baseLabel = btn.textContent;
    if (!hasSelection) {
      btn.style.opacity = "1";
      btn.style.filter = "";
      btn.classList.remove("cat-selected", "cat-dimmed");
      btn.textContent = btn.dataset.baseLabel;
    } else if (isActive) {
      btn.style.opacity = "1";
      btn.style.filter = "";
      btn.classList.add("cat-selected");
      btn.classList.remove("cat-dimmed");
      if (!btn.textContent.startsWith("✓")) btn.textContent = "✓ " + btn.dataset.baseLabel;
    } else {
      btn.style.opacity = "0.3";
      btn.style.filter = "grayscale(0.8)";
      btn.classList.remove("cat-selected");
      btn.classList.add("cat-dimmed");
      btn.textContent = btn.dataset.baseLabel;
    }
  });
  var resetBtn = document.getElementById("cat-reset-btn");
  if (resetBtn) resetBtn.style.display = hasSelection ? "" : "none";
  var resetBtn2 = document.getElementById("cat-reset-btn-row2");
  if (resetBtn2) resetBtn2.style.display = hasSelection ? "" : "none";
}

function resetCats() {
  activeCats.clear();
  updateCatBar();
  applyFilter();
}

function applyFilter() {
  var q = (document.getElementById("glossary-search") || { value: "" }).value.trim().toLowerCase();
  var hasSelection = activeCats.size > 0;

  var realCats = new Set();
  var keywordCats = [];
  activeCats.forEach(function (c) {
    if (c.charAt(0) === "~") keywordCats.push(c.slice(1));
    else realCats.add(c);
  });

  var total = 0;
  document.querySelectorAll(".alpha-group").forEach(function (group) {
    var shown = 0;
    group.querySelectorAll(".glossary-term").forEach(function (term) {
      var catEl = term.querySelector(".term-cat");
      var cat = catEl ? catEl.getAttribute("data-cat") : "";
      var nameEl = term.querySelector(".term-name");
      var defEl = term.querySelector(".term-def");
      var headingText = ((nameEl ? nameEl.textContent : "") + " " + (defEl ? defEl.textContent : "")).toLowerCase();

      var catMatch = true;
      if (hasSelection) {
        var realMatch = realCats.size > 0 && realCats.has(cat);
        var kwMatch = keywordCats.length > 0 && keywordCats.some(function (kw) {
          return headingText.includes(kw);
        });
        if (realCats.size > 0 && keywordCats.length > 0) catMatch = realMatch || kwMatch;
        else if (realCats.size > 0) catMatch = realMatch;
        else catMatch = kwMatch;
      }

      var textMatch = !q || headingText.includes(q);
      var show = catMatch && textMatch;
      term.style.display = show ? "" : "none";
      if (show) shown++;
    });
    group.style.display = shown > 0 ? "" : "none";
    total += shown;
  });

  var el = document.getElementById("glossary-results-count");
  if (el) {
    var suffix = activeCats.size > 0 ? " · " + activeCats.size + " filter" + (activeCats.size === 1 ? "" : "s") + " active" : "";
    el.textContent = q || activeCats.size > 0 ? total + " term" + (total === 1 ? "" : "s") + " shown" + suffix : "";
  }
}

function jumpTo(letter) {
  var el = document.getElementById("gletter-" + letter);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyGlossaryGate() {
  var existing = document.getElementById("glossary-login-wall");
  if (existing) existing.remove();
  document.querySelectorAll(".glossary-term").forEach(function (t) {
    t.style.filter = "";
    t.style.pointerEvents = "";
    t.style.userSelect = "";
  });
}

function filterGlossary() {
  applyFilter();
  applyGlossaryGate();
  syncGlossaryCategoryCounts();
}

function glossaryJump(el) {
  if (el.preventDefault) el.preventDefault();
  var href = el.getAttribute("href");
  var target = document.querySelector(href);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  var card = target.closest(".glossary-term");
  if (card) {
    card.style.transition = "background 0.3s";
    card.style.background = "rgba(74,124,89,0.12)";
    setTimeout(function () {
      card.style.background = "";
    }, 1800);
  }
}

function toggleGlossaryDetail(id, btn) {
  var detail = document.getElementById("gdetail-" + id);
  if (!detail) return;
  var expanded = detail.style.display !== "none";
  detail.style.display = expanded ? "none" : "";
  btn.textContent = expanded ? "📖 Tell me more about this" : "📖 Show less";
}

document.addEventListener("DOMContentLoaded", function () {
  syncGlossaryCategoryCounts();
});
