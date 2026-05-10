document.addEventListener("DOMContentLoaded", function () {
  const steps = document.querySelectorAll(".process-step");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, index * 80);
      }
    });
  }, { threshold: 0.2 });

  steps.forEach(step => observer.observe(step));
});

document.getElementById("translatePreviewBtn")?.addEventListener("click", function () {
  const content = document.querySelector(".document-output")?.innerText;
  const lang = localStorage.getItem("siteLanguage") || "en";

  if (!content) return;

  const url = `https://translate.google.com/?sl=en&tl=${lang}&text=${encodeURIComponent(content)}&op=translate`;

  window.open(url, "_blank");
});

document.getElementById("closeTranslateModal")?.addEventListener("click", function () {
  document.getElementById("translateModal").style.display = "none";
});
