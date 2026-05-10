/**
 * Dev auth panel: toggle form vs dashboard (display only; markup/CSS unchanged).
 */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function showDashboard(user) {
    const form = el('dev-auth-form');
    const dashboard = el('dev-auth-dashboard');
    const display = el('dev-auth-email-display');
    if (form) form.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (display) display.textContent = user?.email ?? '';
  }

  function showLoginForm() {
    const form = el('dev-auth-form');
    const dashboard = el('dev-auth-dashboard');
    if (form) form.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
  }

  window.authUI = { showDashboard, showLoginForm };
})();
