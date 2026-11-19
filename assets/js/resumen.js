/* ===================================================================
   Seccion "En un vistazo": los 22 en una linea y los 8 ejes resumidos.
   =================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // Etiquetas cortas: en la lista resumida el perfil largo repetido 22 veces
  // (cuatro parties comparten "Programa por capitulos") hacia ruido.
  const PROFILE_LABEL = {
    manifiesto: 'Manifiesto',
    contrato: 'Contrato',
    capitulos: 'Capítulos',
    areas: 'Áreas',
    plan: 'Plan'
  };

  /* ------------------------------------------- Los 22 en una línea */
  // Solo los partidos activos (la selección es global).
  const activos = function () {
    return PARTIES.filter(function (p) {
      return window.SELECCION ? window.SELECCION.isOn(p.id) : true;
    });
  };

  function resumenPartidos() {
    const box = $('#resumenPartidos');
    if (!box) return;

    const orden = activos().sort(function (a, b) {
      // Primero los tres nacionales grandes por proporción, luego el resto.
      return (b.words || 0) - (a.words || 0);
    });

    if (!orden.length) {
      box.innerHTML = '<p class="voto-vacio">No hay partidos activos. Activa alguno con los botones de arriba.</p>';
      return;
    }

    box.innerHTML = orden.map(function (p) {
      return '<a class="resumen-fila" href="#p-' + p.id + '">' +
        '<span class="dot" style="background:' + p.color + '"></span>' +
        '<span class="resumen-nom">' + esc(p.name) + '</span>' +
        '<span class="resumen-tit">' + esc(p.title) + '</span>' +
        '<span class="resumen-txt">' + esc(p.tagline) + '</span>' +
        '<span class="resumen-per">' + esc(PROFILE_LABEL[p.profile] || '') + '</span>' +
        '</a>';
    }).join('');
  }

  /* ------------------------------------------ Los 8 ejes en un vistazo */
  function resumenEjes() {
    const box = $('#resumenEjes');
    if (!box) return;

    box.innerHTML = THEMES.map(function (th) {
      // Partidos de cada posicion, en el orden de la escala.
      const posiciones = th.scale.map(function (clave) {
        const pos = th.positions[clave];
        const miembros = activos().filter(function (p) { return p.axes[th.id] === clave; });
        if (!miembros.length) return '';
        const pips = miembros.map(function (p) {
          return '<span class="resumen-pip" title="' + esc(p.name + ' — ' + p.tagline) + '">' +
            '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.short) + '</span>';
        }).join('');
        return '<span class="resumen-grupo"><span class="resumen-pos">' + esc(pos.short || pos.label) + '</span>' + pips + '</span>';
      }).join('');

      return '<a class="resumen-eje" href="#t-' + th.id + '">' +
        '<span class="resumen-eje-nom">' + esc(th.name) + '</span>' +
        '<span class="resumen-eje-grupos">' + posiciones + '</span>' +
        '</a>';
    }).join('');
  }

  function render() {
    resumenPartidos();
    resumenEjes();
  }

  // Si cambia la selección global, esta sección se redibuja.
  if (window.SELECCION) window.SELECCION.subscribe(render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
