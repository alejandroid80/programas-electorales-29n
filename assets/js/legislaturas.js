(function () {
  'use strict';

  /* Tema y año, sin dependencias: esta página no necesita la selección
     de partidos ni el contador de visitas. */
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeBtn');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (!themeBtn) return;
    themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    themeBtn.setAttribute('aria-label', theme === 'dark'
      ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    try { localStorage.setItem('pe29n-theme', theme); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem('pe29n-theme'); } catch (e) {}
  var initial = saved || (window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initial);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* Compartir: botón nativo cuando el navegador lo ofrece y copia de enlace
     como alternativa universal. */
  var shareText = 'Leyes y reformas clave de las XIV y XV legislaturas del Gobierno de coalición, en una sola infografía.';
  var native = document.getElementById('shareNative');
  if (native && navigator.share) {
    native.hidden = false;
    native.addEventListener('click', function () {
      navigator.share({ title: document.title, text: shareText, url: location.href })
        .catch(function () {});
    });
  }

  function fallbackCopy(done) {
    var ta = document.createElement('textarea');
    ta.value = location.href;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  }

  var copy = document.getElementById('copyLink');
  if (copy) {
    var originalLabel = copy.textContent;
    var restoreTimer = null;
    function feedback(label) {
      copy.textContent = label;
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(function () {
        copy.textContent = originalLabel;
        restoreTimer = null;
      }, 1600);
    }
    copy.addEventListener('click', function () {
      function done(ok) {
        feedback(ok ? 'Enlace copiado' : 'No se pudo copiar');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(function () {
          done(true);
        }).catch(function () {
          fallbackCopy(done);
        });
      } else {
        fallbackCopy(done);
      }
    });
  }
})();
