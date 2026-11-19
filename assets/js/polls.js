/* ===================================================================
   Intención de voto — carga data/voting-intention.json y lo dibuja.
   Los datos los genera el bot (scripts/update-polls.mjs). Si el fichero no
   existe o no se puede leer, la seccion lo dice: nunca muestra ceros.
   =================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  /* El color de un partido llega de una web de terceros (Onda Cero). No se
     escapa como texto: se comprueba que sea un color hexadecimal y, si no
     lo es, se usa el color por defecto. Asi no puede romper el atributo en
     el que se pinta. */
  const colorOk = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(String(c || '')) ? String(c) : '#6c737c');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const num = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? null : Number(v);
  /* Un numero que viene de un tercero se pinta como numero o no se pinta:
     nunca como texto suelto dentro del HTML. */
  const numTxt = (v, sufijo) => {
    const n = num(v);
    return n == null ? '' : String(n) + (sufijo || '');
  };
  /* Una URL de un tercero solo se sigue si es http o https. Un javascript:
     sobrevive al escapado y por eso no vale. */
  const urlSegura = (u) => {
    const s = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(s) ? s : null;
  };
  const pct = (v) => (v == null ? '—' : String(v).replace('.', ',') + ' %');
  const fechaES = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''));
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesES = (m) => {
    if (!m) return '';
    const [y, mm] = m.split('-');
    return MESES[Number(mm) - 1] + ' de ' + y;
  };
  const mesCorto = (m) => {
    if (!m) return '';
    const [y, mm] = m.split('-');
    return MESES[Number(mm) - 1].slice(0, 3) + ' ' + String(y).slice(2);
  };

  /* --------------------------------------------------------- estado */
  let D = null;

  /* ------------------------------------------------------ carga */
  async function cargar() {
    const box = $('#voto');
    if (!box) return;

    // En los cinco dias previos a la votacion no se pueden publicar
    // sondeos: no se baja el fichero ni se pinta nada.
    if (window.ELECCIONES && window.ELECCIONES.enProhibicion()) {
      box.innerHTML = '<div class="voto-vacio"><p><b>Los datos de las encuestas están cerrados</b></p>' +
        '<p>' + esc(window.ELECCIONES.aviso()) + '</p>' +
        '<p>Vuelven a estar visibles el domingo 29, con la última estimación publicada el lunes 23.</p></div>';
      return;
    }

    // Con file:// el navegador no deja hacer fetch: se avisa en vez de fallar.
    if (location.protocol === 'file:') {
      box.innerHTML = estadoError('Los datos de intención de voto necesitan un servidor',
        'Abre la página con <code>python3 -m http.server</code> desde la carpeta del proyecto y entra en http://localhost:8765.');
      return;
    }

    try {
      D = await window.DATOS_VOTO.get();
      render();
    } catch (e) {
      box.innerHTML = estadoError('No se han podido cargar los datos de intención de voto',
        'El fichero de datos no está disponible ahora mismo. Se regenera cada día de forma automática.');
    }
  }

  function estadoError(titulo, detalle) {
    return '<div class="voto-vacio"><p><b>' + esc(titulo) + '</b></p><p>' + esc(detalle) + '</p></div>';
  }

  /* ------------------------------------------------------ gráfico */
  /* Lineas del promedio mensual de los medios. SVG dibujado a mano, sin
     librerias externas. */
  function graficoMedia() {
    const m = D.media;
    if (!m || !m.promedios || m.promedios.length < 2) return '';

    const series = m.promedios.filter(p => p.mes);
    const partidos = m.partidos;
    // Un partido con algun hueco no se descarta: se dibuja por tramos y el
    // hueco se ve. Asi no desaparece de la grafica sin avisar.
    const conDatos = partidos.filter(p => series.some(s => num(s.v[p.id]) != null));
    if (!conDatos.length) return '';

    const W = 900, H = 330, PL = 44, PR = 16, PT = 14, PB = 46;
    const maxV = 40;
    const x = (i) => PL + (i * (W - PL - PR)) / Math.max(1, series.length - 1);
    const y = (v) => PT + (H - PT - PB) * (1 - v / maxV);

    let svg = '<svg class="voto-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Evolucion del promedio de las encuestas por mes">';

    // rejilla y eje vertical
    for (let v = 0; v <= maxV; v += 10) {
      svg += '<line x1="' + PL + '" y1="' + y(v) + '" x2="' + (W - PR) + '" y2="' + y(v) +
        '" class="voto-grid"/>';
      svg += '<text x="' + (PL - 10) + '" y="' + (y(v) + 4) + '" class="voto-ytick" text-anchor="end">' + v + '</text>';
    }
    // eje horizontal: uno de cada tres meses
    series.forEach((s, i) => {
      if (i % 3 !== 0 && i !== series.length - 1) return;
      svg += '<text x="' + x(i) + '" y="' + (H - PB + 18) + '" class="voto-xtick" text-anchor="middle">' +
        esc(mesCorto(s.mes)) + '</text>';
    });

    // lineas, por tramos cuando hay huecos
    conDatos.forEach(function (p) {
      let tramo = [];
      const cerrar = function () {
        if (tramo.length > 1) {
          svg += '<polyline points="' + tramo.join(' ') + '" fill="none" stroke="' + colorOk(p.color) +
            '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" class="voto-line"/>';
        }
        tramo = [];
      };
      series.forEach(function (s, i) {
        const v = num(s.v[p.id]);
        if (v == null) { cerrar(); return; }
        tramo.push(x(i) + ',' + y(v));
      });
      cerrar();

      // ultimo punto con dato, destacado
      for (let i = series.length - 1; i >= 0; i--) {
        const v = num(series[i].v[p.id]);
        if (v == null) continue;
        svg += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.4" fill="' + colorOk(p.color) +
          '" stroke="var(--bg-card)" stroke-width="1.6"/>';
        break;
      }
    });
    svg += '</svg>';

    // leyenda: ultimo valor disponible de cada partido
    const leyenda = conDatos.map(function (p) {
      let v = null, mes = null;
      for (let i = series.length - 1; i >= 0; i--) {
        const val = num(series[i].v[p.id]);
        if (val != null) { v = val; mes = series[i].mes; break; }
      }
      const nota = mes && mes !== series[series.length - 1].mes
        ? ' <span class="voto-leg-nota">(' + esc(mesES(mes)) + ')</span>' : '';
      return '<span class="voto-leg"><span class="dot" style="background:' + colorOk(p.color) + '"></span>' +
        esc(p.nombre) + ' <b>' + pct(v) + '</b>' + nota + '</span>';
    }).join('');

    return '<figure class="voto-chart">' + svg +
      '<figcaption>' + leyenda + '</figcaption></figure>';
  }

  /* ------------------------------------------------- tabla medios */
  function tablaMedia() {
    const m = D.media;
    if (!m) return '';
    const series = (m.promedios || []).filter(p => p.mes);
    if (!series.length) return '';
    const ultimo = series[series.length - 1];

    // Ultimas encuestas por partido: dispersion real entreENCODERS los medios.
    const recientes = (m.encuestas || []).slice(0, 8);
    const filas = m.partidos.map(function (p) {
      const vals = recientes.map(e => num(e.v[p.id])).filter(v => v != null);
      const prom = num(ultimo.v[p.id]);
      const min = vals.length ? Math.min.apply(null, vals) : null;
      const max = vals.length ? Math.max.apply(null, vals) : null;
      return '<tr>' +
        '<th scope="row"><span class="dot" style="background:' + colorOk(p.color) + '"></span>' + esc(p.nombre) + '</th>' +
        '<td class="num"><b>' + pct(prom) + '</b></td>' +
        '<td class="num">' + (min != null && max != null && min !== max ? pct(min) + ' – ' + pct(max) : '—') + '</td>' +
        '<td class="num">' + (numTxt(ultimo.n, ' #') || '—') + '</td>' +
        '</tr>';
    }).join('');

    return '<table class="voto-table">' +
      '<caption>Promedio de las encuestas de los medios en ' + esc(mesES(ultimo.mes)) + '</caption>' +
      '<thead><tr><th scope="col">Partido</th><th scope="col">Promedio</th>' +
      '<th scope="col">Rango en las ' + recientes.length + ' últimas</th><th scope="col">Encuestas del mes</th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table>';
  }

  /* Un enlace a una pagina de un tercero. Si la URL no es http o https no
     se pone enlace: el texto se queda plano. */
  function enlace(url, texto) {
    const href = urlSegura(url);
    const t = esc(texto);
    if (!href) return t;
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + t + '</a>';
  }

  /* --------------------------------------------------- tabla CIS */
  function tablaCis() {
    const c = D.cis;
    if (!c || !c.estimaciones) return '';
    const serie = c.serie || [];
    const anterior = serie.length > 1 ? serie[serie.length - 2] : null;

    const filas = c.estimaciones.map(function (e) {
      const prev = anterior ? num(anterior.v[e.etiqueta]) : null;
      const delta = prev != null ? num(e.valor) - prev : null;
      const signo = delta == null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
      const clase = delta == null ? '' : delta > 0 ? 'sube' : delta < 0 ? 'baja' : '';
      return '<tr><th scope="row">' + esc(e.etiqueta) + '</th>' +
        '<td class="num"><b>' + pct(e.valor) + '</b></td>' +
        '<td class="num ' + clase + '">' + (delta == null ? '—' : signo + ' ' + Math.abs(delta).toFixed(1).replace('.', ',')) + '</td>' +
        '</tr>';
    }).join('');

    return '<table class="voto-table">' +
      '<caption>Estimación de voto del CIS, ' + esc(c.titulo || '') + '</caption>' +
      '<thead><tr><th scope="col">Partido</th><th scope="col">% sobre voto válido</th>' +
      '<th scope="col">Variación</th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table>';
  }

  /* --------------------------------------------- tabla de encuestas */
  function tablaEncuestas() {
    const m = D.media;
    if (!m || !m.encuestas) return '';
    const listado = m.encuestas.slice(0, 14);
    const partidos = m.partidos;

    const cab = partidos.map(p => '<th scope="col">' + esc(p.nombre) + '</th>').join('');
    const filas = listado.map(function (e) {
      const celdas = partidos.map(p => {
        const v = num(e.v[p.id]);
        return '<td class="num">' + (v == null ? '—' : String(v).replace('.', ',')) + '</td>';
      }).join('');
      return '<tr>' +
        '<th scope="row">' + enlace(e.url, e.fuente) +
        '<span class="medio">' + esc(e.medio) + '</span></th>' +
        '<td class="fecha">' + esc(e.pub.split('-').reverse().join('/')) + '</td>' +
        celdas + '</tr>';
    }).join('');

    return '<details class="voto-details"><summary>Las ' + listado.length +
      ' últimas encuestas, una a una</summary>' +
      '<div class="voto-scroll"><table class="voto-table voto-table-full">' +
      '<caption>Encuestas publicadas en los medios</caption>' +
      '<thead><tr><th scope="col">Encuestadora</th><th scope="col">Fecha</th>' + cab + '</tr></thead>' +
      '<tbody>' + filas + '</tbody></table></div></details>';
  }

  /* ------------------------------------------------- efecto casa */
  function efectoCasa() {
    const m = D.media;
    if (!m || !m.efectoCasa || !m.efectoCasa.length) return '';
    const partidos = m.partidos;
    const filas = m.efectoCasa.map(function (e) {
      const celdas = partidos.map(p => {
        const v = num(e.d[p.id]);
        return '<td class="num">' + (v == null ? '—' : (v > 0 ? '+' : '') + String(v).replace('.', ',')) + '</td>';
      }).join('');
      return '<tr><th scope="row">' + esc(e.fuente) + '</th>' +
        '<td class="fecha">' + (numTxt(e.n) || '—') + '</td>' + celdas + '</tr>';
    }).join('');
    const cab = partidos.map(p => '<th scope="col">' + esc(p.nombre) + '</th>').join('');

    return '<details class="voto-details"><summary>Efecto casa: cuánto se desvía cada encuestadora</summary>' +
      '<div class="voto-scroll"><table class="voto-table voto-table-full">' +
      '<caption>Desviación de cada ADP respecto al promedio</caption>' +
      '<thead><tr><th scope="col">Encuestadora</th><th scope="col">Nº</th>' + cab + '</tr></thead>' +
      '<tbody>' + filas + '</tbody></table></div></details>';
  }

  /* ------------------------------------------------------ render */
  function render() {
    const box = $('#voto');
    if (!box) return;

    const generado = D.generado ? fechaES(D.generado) : '—';
    const avisos = (D.errores || []).length
      ? '<div class="voto-aviso"><b>Atualización parcial.</b><ul>' +
        D.errores.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>'
      : '';

    const m = D.media || {};
    const c = D.cis || {};

    // Antiguedad de los datos: si son viejos, se avisa.
    const viejo = c.actualizado && (Date.now() - new Date(c.actualizado + 'T12:00:00Z')) / 86400000 > 75;
    const avisoViejo = viejo
      ? '<div class="voto-aviso">La estimación del CIS es de <b>' + esc(mesES(c.actualizado)) +
        '</b>. El CIS publica un barómetro al mes, así que conviene tomarla con cautela si la fecha se aleja del día de hoy.</div>'
      : '';

    box.innerHTML =
      '<div class="voto-cabecera">' +
        '<div>' +
          '<p class="voto-meta">Datos generados el <b>' + esc(generado) + '</b> por un bot que los recoge cada día de forma automática.</p>' +
          '<p class="voto-meta">Agregado de medios: <b>' + esc(fechaES(m.actualizado)) + '</b> · ' +
            numTxt(m.total, ' encuestas') + ' de ' +
            (m.fuente || 'los medios') + '. CIS: <b>' + esc(mesES(c.actualizado)) + '</b> (estudio ' +
            esc(c.estudio || '—') + (c.n ? ', n = ' + c.n : '') + ').</p>' +
        '</div>' +
        '<div class="voto-fuentes">' +
          '<a href="https://www.ondacero.es/elecciones/generales/encuestas/" target="_blank" rel="noopener">Onda Cero</a>' +
          '<a href="https://www.cis.es/" target="_blank" rel="noopener">CIS</a>' +
          '<a href="https://electomania.es/" target="_blank" rel="noopener">Electomanía</a>' +
        '</div>' +
      '</div>' +
      avisos + avisoViejo +

      '<div class="voto-bloque">' +
        '<h3>Lo que dicen los medios</h3>' +
        '<p>Promedio de las encuestas publicadas en los principales medios españoles. Cuanto mayor es la horquilla entre las encuestas, más desacuerdo hay entre las casas: un dato alto no siempre significa un cambio real.</p>' +
        graficoMedia() +
        tablaMedia() +
        tablaEncuestas() +
        efectoCasa() +
      '</div>' +

      '<div class="voto-bloque">' +
        '<h3>Lo que dice el CIS</h3>' +
        '<p>Estimación oficial sobre el voto válido, con su modelo propio de escenarios. <b>No es comparable con el promedio de los medios:</b> ' +
        'el CIS estima sobre voto válido y corrige por escenarios; los medios publican intención de voto. Se muestran por separado a propósito.</p>' +
        tablaCis() +
      '</div>' +

      '<div class="voto-bloque">' +
        '<h3>Las fichas, una a una</h3>' +
        '<p>Las últimas encuestas con su reparto de fluctos, segun el recuento de Electomania (datos abiertos, CC BY 4.0).</p>' +
        fichasElectomania() +
      '</div>' +

      '<div class="voto-bloque voto-metodo">' +
        '<h3>Cómo leer esto</h3>' +
        '<ul>' +
          '<li><b>Una encuesta es una foto, no una tendencia.</b> Un cambio de un punto entre dos sondeos no significa nada por sí solo.</li>' +
          '<li><b>El efecto casa importa.</b> Cada ADP tiene un sesgo propio y constante; por eso una casa con un promedio alto puede estar sobrevalorado.</li>' +
          '<li><b>El CIS no es una encuesta más.</b> Pondera porscenario y estima sobre voto válido; por eso sus números no se suman con los de los medios.</li>' +
          '<li><b>Los datos tienen fecha.</b> La de la sección es la del último promedio de medios, no la de hoy.</li>' +
        '</ul>' +
      '</div>';
  }

  /* ------------------------------------------- fichas de Electomania */
  function fichasElectomania() {
    const lista = D.electomania;
    if (!lista || !lista.length) return '<p class="voto-vacio">Sin fichas disponibles ahora mismo.</p>';
    return '<div class="voto-fichas">' + lista.map(function (e) {
      const filas = Object.keys(e.v).map(function (partido) {
        const esc_ = e.esc ? e.esc[partido] : null;
        return '<li><span title="' + esc(partido) + '">' + esc(partido) + '</span><b>' + pct(e.v[partido]) + '</b>' +
          (esc_ != null ? '<i>' + esc_ + ' esc.</i>' : '') + '</li>';
      }).join('');
      return '<article class="voto-ficha">' +
        '<h4>' + enlace(e.url, e.ficha || e.titular) + '</h4>' +
        '<p class="voto-meta">' + esc(e.sondeante || '') + ' · ' + esc(fechaES(e.fecha)) + '</p>' +
        '<ul class="voto-ficha-vals">' + filas + '</ul>' +
        '</article>';
    }).join('') + '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar);
  } else {
    cargar();
  }
})();
