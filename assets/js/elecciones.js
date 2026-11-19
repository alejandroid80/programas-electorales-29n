/* ===================================================================
   Calendario electoral y periodo en el que no se pueden publicar sondeos.

   El artículo 69.7 de la Ley Orgánica 5/1985 (LOREG) dice: "Durante los
   cinco días anteriores al de la votación queda prohibida la publicación y
   difusión o reproducción de sondeos electorales por cualquier medio de
   comunicación".

   Para las generales del 29 de noviembre de 2026 ese periodo va del martes
   24 al sábado 28, ambos incluidos. El lunes 23 es el último día en el que
   se puede publicar.

   Estas fechas son copia de data/elecciones.json, que es la fuente. El
   script scripts/check-data.js comprueba que las dos cosas coincidan, así
   que no pueden divergir sin que salta el control.
   =================================================================== */
(function () {
  'use strict';

  var ELECCIONES = {
    dia: '2026-11-29',
    cierre: '2026-11-29T20:00:00+01:00',
    prohibicion: {
      inicio: '2026-11-24T00:00:00+01:00',
      fin: '2026-11-29T00:00:00+01:00',
      norma: 'Artículo 69.7 de la Ley Orgánica 5/1985, del Régimen Electoral General',
      motivo: 'Durante los cinco días anteriores al de la votación queda prohibida la publicación y difusión o reproducción de sondeos electorales por cualquier medio de comunicación.',
      ultimoDiaPublicacion: '2026-11-23'
    }
  };

  /* ¿Estamos en el periodo en el que no se pueden publicar sondeos? */
  function enProhibicion(ahora) {
    var t = (ahora || new Date()).getTime();
    var desde = new Date(ELECCIONES.prohibicion.inicio).getTime();
    var hasta = new Date(ELECCIONES.prohibicion.fin).getTime();
    return t >= desde && t < hasta;
  }

  /* El texto que explica por qué no hay datos. */
  function aviso() {
    var p = ELECCIONES.prohibicion;
    // El periodo acaba a medianoche del domingo 29: el ultimo dia en el que
    // no se puede publicar es el sabado 28.
    var ultimo = new Date(new Date(p.fin).getTime() - 1).toISOString();
    return 'Del ' + fechaLarga(p.inicio) + ' al ' + fechaLarga(ultimo) +
      ', ambos incluidos, no se pueden publicar sondeos electorales: ' +
      p.motivo.charAt(0).toLowerCase() + p.motivo.slice(1) +
      ' (' + p.norma + ').';
  }

  function fechaLarga(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var f = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  window.ELECCIONES = ELECCIONES;
  window.ELECCIONES.enProhibicion = enProhibicion;
  window.ELECCIONES.aviso = aviso;
})();
