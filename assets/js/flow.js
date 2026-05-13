function casepathNavigateRelative(path) {
  if (
    window.CasePathAuth &&
    window.CasePathAuth.redirect &&
    typeof window.CasePathAuth.redirect.safeAssignHref === "function"
  ) {
    window.CasePathAuth.redirect.safeAssignHref(path);
  } else {
    window.location.href = path;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".process-right");
  if (!container) return;
  const cards = container.querySelectorAll('[class*="card"]');

  cards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const text = (card.innerText || "").toLowerCase();

      if (text.includes("parenting")) {
        casepathNavigateRelative("/parenting-orders.html");
      } else if (text.includes("divorce")) {
        casepathNavigateRelative("/divorce.html");
      } else if (text.includes("property")) {
        casepathNavigateRelative("/property.html");
      } else if (text.includes("avo")) {
        casepathNavigateRelative("/avo-centre.html");
      } else if (text.includes("breach")) {
        casepathNavigateRelative("/breach.html");
      } else if (text.includes("respond")) {
        casepathNavigateRelative("/respond.html");
      } else if (text.includes("urgent")) {
        casepathNavigateRelative("/urgent.html");
      }
    });
  });
});
