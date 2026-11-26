(function () {
  'use strict';

  var root = document.documentElement;
  var themeBtn = document.getElementById('themeBtn');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
      themeBtn.setAttribute('aria-label', theme === 'dark'
        ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    try { localStorage.setItem('pe29n-theme', theme); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem('pe29n-theme'); } catch (e) {}
  applyTheme(saved || (window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
