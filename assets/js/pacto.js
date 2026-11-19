/* ===================================================================
   Pactómetro — qué pasaría si estos partidos se pusieran de acuerdo.
   Usa la estimación preelectoral del CIS (voto y repartos de errands).
   =================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const num = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? null : Number(v);
  // Un decimal y sin errores de coma flotante: 82,09999999999998 no vale.
  const pct = (v) => (v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ',') + ' %');

  const mayoriaAbs = 176;   // 176 de 350 para la mayoria absoluta
  const XL = 350;

  let DATOS = null;         // bloque preelectoral
  let PARTIDOS = [];        // [{id, nombre, color, estimacion, escaMin, escaMax, escaMedio}]
  let sel = new Set();      // partidos elegidos en el pactómetro

  /* El pactómetro se sincroniza con la selección global: un partido
  marcado en la botonera de arriba aparece aquí, y al marcarlo aquí se marca
  en toda la pagina. Los tres partidoes que solo estima el CIS (Junts, UPC
  y Ara Més) no tienen ficha propia y solo se activan aqui. */
  function idDe(etiqueta) {
    if (typeof CIS_LABELS !== 'undefined') {
      for (const id in CIS_LABELS) if (CIS_LABELS[id] === etiqueta) return id;
    }
    return null;
  }
  function sincronizarSeleccion() {
    if (!PARTIDOS.length || !window.SELECCION) return;
    const nuevos = new Set();
    for (const p of PARTIDOS) {
      const id = idDe(p.etiqueta);
      if (id && window.SELECCION.isOn(id)) nuevos.add(p.etiqueta);
      else if (!id && sel.has(p.etiqueta)) nuevos.add(p.etiqueta);
    }
    sel = nuevos;
  }

  function colorDe(etiqueta) {
    if (typeof CIS_LABELS !== 'undefined') {
      for (const id in CIS_LABELS) {
        if (CIS_LABELS[id] === etiqueta) {
          const p = typeof PARTIES !== 'undefined' ? PARTIES.find((x) => x.id === id) : null;
          if (p) return p.color;
        }
      }
    }
    if (typeof CIS_EXTRA !== 'undefined') {
      const e = CIS_EXTRA.find((x) => x.etiqueta === etiqueta);
      if (e) return e.color;
    }
    return '#6c737c';
  }

  function nombreDe(etiqueta) {
    if (typeof CIS_LABELS !== 'undefined') {
      for (const id in CIS_LABELS) {
        if (CIS_LABELS[id] === etiqueta) {
          const p = typeof PARTIES !== 'undefined' ? PARTIES.find((x) => x.id === id) : null;
          if (p) return p.short;
        }
      }
    }
    if (typeof CIS_EXTRA !== 'undefined') {
      const e = CIS_EXTRA.find((x) => x.etiqueta === etiqueta);
      if (e) return e.nombre;
    }
    return etiqueta;
  }

  /* ------------------------------------------------------- carga */
  async function cargar() {
    const box = $('#pacto');
    if (!box) return;
    if (location.protocol === 'file:') {
      box.innerHTML = '<div class="voto-vacio"><p><b>El pactómetro necesita un servidor</b></p>' +
        '<p>Abre la página con <code>python3 -m http.server</code> y entra en http://localhost:8765.</p></div>';
      return;
    }
    try {
      const d = await window.DATOS_VOTO.get();
      DATOS = d.preelectoral;
      if (!DATOS || !DATOS.partidos || !DATOS.partidos.length) {
        box.innerHTML = '<div class="voto-vacio"><p><b>Todavía no hay reparto de escaños</b></p>' +
          '<p>El CIS publica el reparto de escaños en su encuesta preelectoral. El bot lo recoge en cuanto este disponible.</p></div>';
        return;
      }
      PARTIDOS = DATOS.partidos.map(function (p) {
        return {
          etiqueta: p.etiqueta,
          nombre: nombreDe(p.etiqueta),
          color: colorDe(p.etiqueta),
          estimacion: p.estimacion,
          escaMin: p.escaMin,
          escaMax: p.escaMax,
          escaMedio: p.escaMedio
        };
      }).filter(function (p) { return p.estimacion != null; });

      // Por defecto: los tres primeros, que es la combinacion que mas se discute.
      sel = new Set(PARTIDOS.slice(0, 2).map((p) => p.etiqueta));
      render();
    } catch (e) {
      console.error('pactómetro:', e);
      box.innerHTML = '<div class="voto-vacio"><p><b>No se han podido cargar los datos</b></p>' +
        '<p>El fichero de datos no está disponible ahora mismo.</p></div>';
    }
  }

  /* ------------------------------------------------------- calculos */
  function elegidos() {
    return PARTIDOS.filter((p) => sel.has(p.etiqueta));
  }

  function totales() {
    const els = elegidos();
    const votos = els.reduce((a, p) => a + (p.estimacion || 0), 0);
    const escMedio = els.reduce((a, p) => a + (p.escaMedio || 0), 0);
    const escMin = els.reduce((a, p) => a + (p.escaMin || 0), 0);
    const escMax = els.reduce((a, p) => a + (p.escaMax || 0), 0);
    // El bloque mas numeroso que no esta en la coalicion: para la mayoria simple.
    const otros = PARTIDOS.filter((p) => !sel.has(p.etiqueta));
    const rival = otros.reduce((a, p) => (p.escaMedio || 0) > (a.escaMedio || 0) ? p : a, { escaMedio: 0, nombre: '—' });
    return { els, votos, escMedio, escMin, escMax, rival };
  }

  /* ------------------------------------------------------- grafico */
  function barraEscanos(escaños) {
    const W = 640, H = 78, PL = 8, PR = 8;
    const escala = (v) => PL + (v * (W - PL - PR)) / XL;
    const yMayoria = 44;
    let svg = '<svg class="pacto-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Reparto de escanos y mayoría absoluta">';

    // barra de fondo
    svg += '<rect x="' + PL + '" y="18" width="' + (W - PL - PR) + '" height="16" rx="4" class="pacto-fondo"/>';

    // franjas de cada partido
    let x = PL;
    elegidos().forEach(function (p) {
      const ancho = ((p.escaMedio || 0) * (W - PL - PR)) / XL;
      svg += '<rect x="' + x.toFixed(1) + '" y="18" width="' + Math.max(0, ancho).toFixed(1) +
        '" height="16" fill="' + p.color + '"><title>' + esc(p.nombre) + ': ' + (p.escaMedio || 0) + ' escaños</title></rect>';
      x += ancho;
    });

    // linea de mayoria
    const xm = escala(mayoriaAbs);
    svg += '<line x1="' + xm + '" y1="8" x2="' + xm + '" y2="42" class="pacto-mayoria"/>';
    svg += '<text x="' + xm + '" y="58" class="pacto-mayoria-txt" text-anchor="middle">mayoría absoluta: 176</text>';
    svg += '<text x="' + (W - PR) + '" y="58" class="pacto-total-txt" text-anchor="end">350 diputados</text>';
    svg += '</svg>';
    return svg;
  }

  /* ------------------------------------------------------- render */
  function render() {
    const box = $('#pacto');
    if (!box) return;
    // Puede llegar un aviso de cambio de seleccion antes de que lleguen
    // los datos: en ese caso no hay nada que dibujar todavia.
    if (!DATOS) return;

    sincronizarSeleccion();
    const t = totales();
    const n = t.els.length;
    const absoluto = t.escMedio >= mayoriaAbs;
    const simple = t.escMedio > (t.rival.escaMedio || 0) && t.escMedio > 0;

    /* --- selector de partidos --- */
    const chips = PARTIDOS.map(function (p) {
      const on = sel.has(p.etiqueta);
      const escTxt = p.escaMin != null
        ? p.escaMin + '–' + p.escaMax + ' esc.'
        : 'sin reparto publicado';
      return '<button type="button" class="pacto-chip' + (on ? ' on' : '') + '" data-partido="' + esc(p.etiqueta) + '" ' +
        'aria-pressed="' + on + '">' +
        '<span class="dot" style="background:' + p.color + '"></span>' +
        '<span class="pacto-chip-nom">' + esc(p.nombre) + '</span>' +
        '<span class="pacto-chip-voto">' + pct(p.estimacion) + '</span>' +
        '<span class="pacto-chip-esc">' + esc(escTxt) + '</span>' +
        '</button>';
    }).join('');

    /* --- veredicto --- */
    let veredicto, clase, explicacion;
    if (!n) {
      veredicto = 'Elige algún partido';
      clase = 'neutro';
      explicacion = 'Marca uno o varios partidos para ver qué pasaría.';
    } else if (absoluto) {
      veredicto = 'Mayoría absoluta';
      clase = 'ok';
      explicacion = 'Con ' + t.escMedio + ' escaños supera los 176 necesarios. No necesita a nadie más.';
    } else if (simple) {
      veredicto = 'Mayoría simple';
      clase = 'aviso';
      explicacion = 'No llega a 176, pero es el bloque más numeroso: al resto le costaría más unirse. ' +
        'El rival más fuerte es ' + esc(t.rival.nombre) + ' con ' + (t.rival.escaMedio || 0) + ' escaños.';
    } else {
      veredicto = 'Sin mayoría';
      clase = 'mal';
      const falta = mayoriaAbs - t.escMedio;
      explicacion = 'Faltan ' + falta + ' diputados para la mayoría absoluta.';
    }

    const detalle = t.els.map(function (p) {
      return '<li><span class="dot" style="background:' + p.color + '"></span>' +
        esc(p.nombre) + '<b>' + (p.escaMedio != null ? p.escaMedio : '—') + ' esc.</b>' +
        '<i>' + pct(p.estimacion) + '</i></li>';
    }).join('');

    box.innerHTML =
      '<div class="pacto-panel">' +
        '<div class="pacto-izq">' +
          '<p class="pacto-instr">Marca los partidos que se pusieran de acuerdo para gobernar. ' +
            'Los datos son la estimación preelectoral del CIS (estudio ' + esc(DATOS.estudio) + ').</p>' +
          '<div class="pacto-chips">' + chips + '</div>' +
        '</div>' +
        '<div class="pacto-der">' +
          '<div class="pacto-veredicto ' + clase + '">' +
            '<b>' + esc(veredicto) + '</b>' +
            '<p>' + esc(explicacion) + '</p>' +
          '</div>' +
          '<div class="pacto-cifras">' +
            '<div><b>' + (n ? t.escMedio : '—') + '</b><span>escaños</span></div>' +
            '<div><b>' + (n ? pct(t.votos) : '—') + '</b><span>del voto</span></div>' +
            '<div><b>' + (n ? (t.escMin + '–' + t.escMax) : '—') + '</b><span>si se suman las horquillas</span></div>' +
          '</div>' +
          barraEscanos(t.escMedio) +
          (detalle ? '<ul class="pacto-lista">' + detalle + '</ul>' : '') +
        '</div>' +
      '</div>' +

      '<div class="voto-aviso">' +
        '<b>Dos advertencias sobre cómo leer esto.</b>' +
        '<ul>' +
          '<li>El CIS dice de su propia estimación que <b>las horquillas no se suman</b>: son percentiles de su modelo, no intervalos de confianza, y la suma de dos no da la horquilla del bloque. Aquí se suman los puntos medios y se enseña el rango solo como referencia.</li>' +
          '<li>Esto <b>no es una predicción</b>, sino un cálculo sobre la estimación del CIS de octubre de 2026. Y recordemos que el CIS cuenta a ERC y Podemos juntos en Cataluña y aparte en el resto.</li>' +
        '</ul>' +
      '</div>' +

      tablaParejas();
  }

  /* ------------------------------- que combinaciones llegan a mayoría */
  function tablaParejas() {
    const conEsca = PARTIDOS.filter((p) => p.escaMedio != null);
    const pares = [];
    for (let i = 0; i < conEsca.length; i++) {
      for (let j = i + 1; j < conEsca.length; j++) {
        const a = conEsca[i], b = conEsca[j];
        const suma = (a.escaMedio || 0) + (b.escaMedio || 0);
        pares.push({ a, b, suma, ok: suma >= mayoriaAbs });
      }
    }
    pares.sort((x, y) => y.suma - x.suma);
    const top = pares.filter((p) => p.ok).slice(0, 8);
    if (!top.length) return '';

    const filas = top.map(function (p) {
      return '<tr>' +
        '<th scope="row"><span class="dot" style="background:' + p.a.color + '"></span>' +
        esc(p.a.nombre) + ' <span class="mas">+</span> <span class="dot" style="background:' + p.b.color + '"></span>' +
        esc(p.b.nombre) + '</th>' +
        '<td class="num"><b>' + p.suma + '</b></td>' +
        '<td class="num">' + (p.suma - mayoriaAbs) + ' de sobra</td>' +
        '</tr>';
    }).join('');

    return '<details class="voto-details"><summary>Las parejas que sí llegarían a la mayoría</summary>' +
      '<div class="voto-scroll"><table class="voto-table">' +
      '<caption>Parejas de partidos que sumadas superan los 176 diputados</caption>' +
      '<thead><tr><th scope="col">Pareja</th><th scope="col">Escaños</th><th scope="col">Margen</th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table></div></details>';
  }

  /* ------------------------------------------------------- eventos */
  document.addEventListener('click', function (e) {
    const chip = e.target.closest('[data-partido]');
    if (!chip) return;
    const etiqueta = chip.getAttribute('data-partido');
    const id = idDe(etiqueta);
    if (id && window.SELECCION) {
      // Cambia la selección global: toda la página se redibuja.
      window.SELECCION.toggle(id, chip);
      return;
    }
    if (sel.has(etiqueta)) sel.delete(etiqueta); else sel.add(etiqueta);
    render();
  });

  // Cuando cambia la selección global, el pactómetro se redibuja.
  if (window.SELECCION) window.SELECCION.subscribe(function () { render(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar);
  } else {
    cargar();
  }
})();
