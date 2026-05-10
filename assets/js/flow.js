document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".process-right");
  if (!container) return;
  const cards = container.querySelectorAll('[class*="card"]');

  cards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const text = (card.innerText || "").toLowerCase();

      if (text.includes("parenting")) {
        window.location.href = "/parenting-orders.html";
      } else if (text.includes("divorce")) {
        window.location.href = "/divorce.html";
      } else if (text.includes("property")) {
        window.location.href = "/property.html";
      } else if (text.includes("avo")) {
        window.location.href = "/avo-centre.html";
      } else if (text.includes("breach")) {
        window.location.href = "/breach.html";
      } else if (text.includes("respond")) {
        window.location.href = "/respond.html";
      } else if (text.includes("urgent")) {
        window.location.href = "/urgent.html";
      }
    });
  });
});
