/* Abre y cierra el menu lateral en pantallas estrechas. */
(function () {
  'use strict';

  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('menuNav');
  var body = document.body;
  if (!toggle || !nav) return;

  var desktop = window.matchMedia('(min-width: 1024px)');

  function setOpen(open, restoreFocus) {
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(!body.classList.contains('nav-open'), false);
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false, false);
  });

  document.addEventListener('click', function (e) {
    if (body.classList.contains('nav-open') && !e.target.closest('.topbar')) setOpen(false, false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('nav-open')) setOpen(false, true);
  });

  function onBreakpoint(e) {
    if (e.matches) setOpen(false, false);
  }
  if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  else if (desktop.addListener) desktop.addListener(onBreakpoint);
})();
