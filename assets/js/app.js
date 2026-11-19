/* ===================================================================
   Programas electorales 29N 2026 — lógica de la página
   =================================================================== */
(function () {
  'use strict';

  const state = {
    // La selección es global: gobierna las fichas, la matriz, las diferencias
    // por tema, el mapa, el resumen y el pactómetro. Por defecto están los 22.
    selected: new Set(PARTIES.map(function (p) { return p.id; })),
    blocs: new Set(),
    query: '',
    theme: 'light'
  };

  /* --- API compartida: otras secciones escuchan los cambios --- */
  var oyentes = [];
  window.SELECCION = {
    get selected() { return state.selected; },
    toggle: function (id, origen) { toggleParty(id, origen); },
    isOn: function (id) { return state.selected.has(id); },
    subscribe: function (fn) { oyentes.push(fn); },
    emit: function () {
      oyentes.forEach(function (fn) { try { fn(state.selected); } catch (e) { console.error(e); } });
    }
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const byId = (id) => PARTIES.find(p => p.id === id);

  /* ------------------------------------------------------------- iconos */
  // Un solo trazo, un solo grosor, 16x16. Sin glifos Unicode.
  const ICONS = {
    fiscal: '<path d="M2.5 5h11M2.5 9h11M2.5 13h6"/>',
    vivienda: '<path d="M2 7.2 8 2.5l6 4.7"/><path d="M3.8 6.6v6.9h8.4V6.6"/><path d="M6.6 13.5V9.6h2.8v3.9"/>',
    migracion: '<path d="M2 5.4h9.6M9.2 2.9 11.7 5.4 9.2 7.9"/><path d="M14 10.6H4.4M6.8 8.1 4.3 10.6l2.5 2.5"/>',
    energia: '<path d="M9.4 1.8 4.2 9.1h3.3L6.6 14.2 11.8 6.8H8.5l.9-5Z"/>',
    estado: '<path d="M1.8 5.6h12.4"/><path d="M3.4 5.6v7.2M6.4 5.6v7.2M9.6 5.6v7.2M12.6 5.6v7.2"/><path d="M1.8 14.4h12.4"/>',
    militar: '<path d="M3.8 14.4V1.6"/><path d="M3.8 2.8h8.6l-2.3 2.7 2.3 2.7H3.8"/>',
    ue: '<circle cx="8" cy="8" r="6.2"/><circle cx="8" cy="1.8" r="1.15"/><circle cx="8" cy="14.2" r="1.15"/><circle cx="1.8" cy="8" r="1.15"/><circle cx="14.2" cy="8" r="1.15"/>',
    servicios: '<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2.6"/><path d="M8 4.9v6.2M4.9 8h6.2"/>',
    arrow: '<path d="M9.2 3.2H13v3.8"/><path d="M13 3.2 7.4 8.8"/><path d="M12.4 9.6v3.2H3.4V4.2h3.2"/>',
    copy: '<rect x="5.6" y="5.6" width="7.9" height="7.9" rx="1.6"/><path d="M10.4 5.6V4.1a1.5 1.5 0 0 0-1.5-1.5H4.1a1.5 1.5 0 0 0-1.5 1.5v4.8a1.5 1.5 0 0 0 1.5 1.5h1.5"/>',
    share: '<circle cx="12" cy="3.8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="12" cy="12.2" r="2"/><path d="M5.8 7l4.4-2.4M5.8 9l4.4 2.4"/>',
    eye: '<path d="M1.6 8s2.7-5.2 6.4-5.2S14.4 8 14.4 8s-2.7 5.2-6.4 5.2S1.6 8 1.6 8Z"/><circle cx="8" cy="8" r="1.8"/>'
  };
  const ICON = {
    fiscal: 'fiscal', vivienda: 'vivienda', migracion: 'migracion', energia: 'energia',
    estado: 'estado', militar: 'militar', ue: 'ue', servicios: 'servicios'
  };
  const svg = (name, size) => '<svg width="' + (size || 16) + '" height="' + (size || 16) +
    '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';

  /* --------------------------------------------------------- idioma */
  const LANG_CODE = {
    'castellano': 'ES', 'gallego': 'GL', 'catalán': 'CA',
    'euskera / castellano': 'EU', 'castellano / euskera': 'EU'
  };
  const LANG_NAME = {
    'ES': 'en castellano', 'GL': 'en gallego',
    'CA': 'en catalán', 'EU': 'en euskera'
  };
  const langCode = (p) => LANG_CODE[p.lang] || 'ES';

  const PROFILE_LABEL = {
    manifiesto: 'Manifiesto',
    contrato: 'Contrato electoral',
    capitulos: 'Programa por capítulos',
    areas: 'Programa por áreas',
    plan: 'Plan con fuentes citadas'
  };

  const BLOC_LABEL = {
    nacional: 'Nacional',
    nacionalista: 'Nacionalista',
    regionalista: 'Regional'
  };

  /* ----------------------------------------------------------- estado */
  function readUrl() {
    const q = new URLSearchParams(location.search);
    if (q.has('sel')) {
      const ids = q.get('sel').split(',').filter(Boolean).filter(id => byId(id));
      state.selected = new Set(ids);
    }
    // Sin parametro: todos los partidos activados.
    if (q.has('q')) state.query = q.get('q');
    if (q.has('bloc')) state.blocs = new Set(q.get('bloc').split(',').filter(Boolean));
  }

  function writeUrl() {
    const q = new URLSearchParams();
    if (state.selected.size) q.set('sel', Array.from(state.selected).join(','));
    if (state.query) q.set('q', state.query);
    if (state.blocs.size) q.set('bloc', Array.from(state.blocs).join(','));
    const s = q.toString();
    history.replaceState(null, '', s ? '?' + s : location.pathname);
  }

  /* ----------------------------------------------------------- tema */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const btn = $('#themeBtn');
    btn.setAttribute('aria-pressed', String(state.theme === 'dark'));
    btn.setAttribute('aria-label', state.theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    try { localStorage.setItem('pe29n-theme', state.theme); } catch (e) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('pe29n-theme'); } catch (e) {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    state.theme = saved;
    applyTheme();
    $('#themeBtn').addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
    });
  }

  /* ------------------------------------------------------- helpers */
  function matchQuery(p) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const hay = [
      p.name, p.short, p.title, p.tagline, p.lang, p.doc, PROFILE_LABEL[p.profile],
      p.keys.map(k => k.t + ' ' + k.d).join(' '),
      p.highlights.map(h => h.k + ' ' + h.v).join(' ')
    ].join(' ').toLowerCase();
    return q.split(/\s+/).every(w => hay.indexOf(w) !== -1);
  }

  function visibleParties() {
    return PARTIES.filter(p => {
      if (state.blocs.size && !state.blocs.has(p.bloc)) return false;
      return matchQuery(p);
    });
  }

  /* ------------------------------------------------------- stats */
  function renderStats() {
    const totalWords = PARTIES.reduce((a, p) => a + p.words, 0);
    const totalPages = PARTIES.reduce((a, p) => a + p.pages, 0);
    const items = [
      { b: String(PARTIES.length), s: 'programas analizados' },
      { b: String(THEMES.length), s: 'ejes de comparación' },
      { b: (totalWords / 1000).toFixed(0) + 'k', s: 'palabras leídas' },
      { b: String(totalPages), s: 'páginas de programa' },
      { b: '617', s: 'el más breve' },
      { b: '51k', s: 'el más extenso' }
    ];
    $('#stats').innerHTML = items.map(i =>
      '<div class="stat"><b>' + esc(i.b) + '</b><span>' + esc(i.s) + '</span></div>').join('');
  }

  /* ----------------------------------------------------- el mapa 0-100 */
  function renderSpectrum() {
    $('#spectrum').innerHTML = THEMES.map(function (th) {
      const n = th.scale.length;
      const xOf = (key) => n === 1 ? 50 : (th.scale.indexOf(key) / (n - 1)) * 100;

      // agrupar los partidos por posicion
      const groups = th.scale.map(function (key) {
        return { key: key, pos: th.positions[key], members: [] };
      });
      PARTIES.forEach(function (p) {
        if (!state.selected.has(p.id)) return;   // solo los partidos activos
        const g = groups.find(g => g.key === p.axes[th.id]);
        if (g) g.members.push(p);
      });
      const maxRows = Math.max.apply(null, groups.map(g => g.members.length).concat([1]));

      // marcas de la escala
      const ticks = th.scale.map(function (key, i) {
        const x = n === 1 ? 50 : (i / (n - 1)) * 100;
        return '<span class="scale-tick" style="left:' + x + '%" data-label="' +
          esc(th.positions[key].short || th.positions[key].label) + '" title="' +
          esc(th.positions[key].label) + '"></span>';
      }).join('');

      // puntos: uno por partido, apilados si comparten posicion
      const dots = [];
      groups.forEach(function (g) {
        g.members.forEach(function (p, row) {
          dots.push('<button type="button" class="scale-dot" data-pick="' + p.id + '"' +
            ' aria-pressed="' + state.selected.has(p.id) + '"' +
            ' style="left:' + xOf(g.key) + '%; top:' + (row * 19 + 8) + 'px; background:' + p.color + '"' +
            ' title="' + esc(p.name + ' — ' + g.pos.label) + '"' +
            ' aria-label="' + esc(p.name + ' — ' + g.pos.label + ' en ' + th.name) + '"></button>');
        });
      });

      // leyenda agrupada (solo las posiciones con partidos activos)
      const groupHtml = groups.filter(function (g) { return g.members.length; }).map(function (g) {
        const items = g.members.map(function (p) {
          return '<li><button type="button" class="pip" data-pick="' + p.id + '"' +
            ' aria-pressed="' + state.selected.has(p.id) + '"' +
            ' title="' + esc(p.name) + '">' +
            '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.short) + '</button></li>';
        }).join('');
        return '<section class="sgroup">' +
          '<h4 class="sgroup-label">' + esc(g.pos.label) + '</h4>' +
          '<p class="sgroup-desc">' + esc(g.pos.desc) + '</p>' +
          '<ul class="sgroup-parties">' + items + '</ul></section>';
      }).join('');

      return '<article class="axis" id="axis-' + th.id + '">' +
        '<div class="axis-head"><span class="axis-icon">' + svg(ICON[th.id], 17) + '</span>' +
        '<h3>' + esc(th.name) + '</h3>' +
        '<span class="axis-share">' + shareMarkup(
          SHARE_BASE + '?sel=' + Array.from(state.selected).join(',') + '#t-' + th.id,
          'Cómo se posicionan los partidos en ' + th.name.toLowerCase() + ': ' + th.axisLeft + ' — ' + th.axisRight,
          'el eje ' + th.name.toLowerCase(), 'left') + '</span>' +
        '</div>' +
        '<p class="axis-intro">' + esc(th.intro) + '</p>' +
        '<div class="scale">' +
          '<div class="scale-ends"><span>' + esc(th.axisLeft) + '</span><span>' + esc(th.axisRight) + '</span></div>' +
          '<div class="scale-track" style="--track-h:' + (maxRows * 19 + 46) + 'px">' +
            '<div class="scale-line"></div>' + ticks + dots.join('') +
          '</div>' +
        '</div>' +
        '<div class="scale-groups" style="--cols:' + n + '">' + groupHtml + '</div>' +
        '</article>';
    }).join('');
  }

  /* -------------------------------------------------------- cards */
  function renderParties() {
    const todos = visibleParties();
    const list = todos.filter(function (p) { return state.selected.has(p.id); });
    $('#emptyState').classList.toggle('hidden', list.length > 0);
    $('#live').textContent = list.length === PARTIES.length
      ? 'Mostrando los ' + list.length + ' partidos.'
      : 'Mostrando ' + list.length + ' de ' + PARTIES.length + ' partidos activados.';

    // El estado vacio dice la causa real: los partidos desactivados o el filtro.
    const sinActivos = state.selected.size === 0;
    const porFiltro = todos.length < PARTIES.length;
    $('#emptyState').innerHTML = sinActivos
      ? '<p>No hay ningún partido activo.</p>' +
        '<button class="chip" id="emptyReset" type="button">Activar los 22 partidos</button>'
      : porFiltro
        ? '<p>Ningún partido coincide con la búsqueda ni con el filtro de bloque.</p>' +
          '<button class="chip" id="emptyReset" type="button">Quitar el filtro de bloque y la búsqueda</button>'
        : '<p>Ningún partido coincide con la búsqueda.</p>' +
          '<button class="chip" id="emptyReset" type="button">Borrar la búsqueda</button>';

    $('#parties').innerHTML = list.map(function (p) {
      const on = state.selected.has(p.id);
      const hl = p.highlights.map(h =>
        '<div><b>' + esc(h.k) + '</b><span>' + esc(h.v) + '</span></div>').join('');
      const keys = p.keys.map(k => '<li><b>' + esc(k.t) + '</b>' + esc(k.d) + '</li>').join('');

      return '<article class="card" id="p-' + p.id + '" style="--pc:' + p.color +
        ';--pc-fg:' + p.badgeFg + ';--pc-text-light:' + p.pcText.light +
        ';--pc-text-dark:' + p.pcText.dark + '">' +
        '<div class="card-top">' +
          '<div class="card-head">' +
            '<div class="badge">' + esc(p.abbr) + '</div>' +
            '<div><h3>' + esc(p.name) + '</h3>' +
            '<div class="role">' + esc(BLOC_LABEL[p.bloc]) + ' · programa original en ' + esc(p.lang) + '</div></div>' +
          '</div>' +
          '<span class="profile">' + esc(PROFILE_LABEL[p.profile]) + '</span>' +
          '<div class="card-title">«' + esc(p.title) + '»</div>' +
          (p.titleOrig ? '<div class="card-title-orig">Original: «' + esc(p.titleOrig) + '»</div>' : '') +
          '<p class="card-tag">' + esc(p.tagline) + '</p>' +
        '</div>' +
        '<div class="hl">' + hl + '</div>' +
        '<ul class="keys">' + keys + '</ul>' +
        '<div class="card-foot">' +
          '<span class="meta"><span><b>' + p.pages + '</b> págs.</span>' +
          '<span><b>' + p.words.toLocaleString('es-ES') + '</b> palabras</span></span>' +
          '<a class="src-link" href="' + REPO_RAW + p.doc + '" target="_blank" rel="noopener">' +
          'Leer el original' + svg('arrow', 13) + '</a>' +
          shareMarkup(
            SHARE_BASE + '?sel=' + p.id + '#p-' + p.id,
            p.name + ' — ' + p.title + ': ' + p.tagline,
            'la ficha de ' + p.short) +
          '<button type="button" class="chip pick" data-pick="' + p.id + '" aria-pressed="' + on + '">' +
            (on ? 'En la comparación' : 'Añadir a la comparación') + '</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* -------------------------------------------------------- chips */
  function renderBlocChips() {
    const counts = {};
    BLOCS.forEach(b => { counts[b.id] = PARTIES.filter(p => p.bloc === b.id).length; });
    $('#blocChips').innerHTML = BLOCS.map(b =>
      '<button type="button" class="chip" data-bloc="' + b.id + '" aria-pressed="' + state.blocs.has(b.id) + '">' +
      esc(b.label) + '<span class="n">' + counts[b.id] + '</span></button>').join('');
  }

  function renderSelectChips() {
    // --pc y --pc-fg viajan en linea: el boton encendido se pinta con el
    // color del partido y el texto con el tono que contrasta con el.
    $('#selectChips').innerHTML = PARTIES.map(p =>
      '<button type="button" class="chip" data-pick="' + p.id + '" aria-pressed="' + state.selected.has(p.id) + '"' +
      ' style="--pc:' + p.color + ';--pc-fg:' + p.badgeFg + '"' +
      ' title="' + esc(p.name) + '">' +
      '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.short) + '</button>').join('');
  }

  /* ------------------------------------------------------- matrix */
  function renderMatrix() {
    const sel = PARTIES.filter(p => state.selected.has(p.id));

    $('#matrixHead').innerHTML = '<th scope="col">Tema</th>' + sel.map(p =>
      '<th scope="col"><span class="th-party"><span class="dot" style="background:' + p.color + '"></span>' +
      esc(p.short) + '</span></th>').join('');

    $('#matrixBody').innerHTML = THEMES.map(function (th) {
      const cells = sel.map(function (p) {
        const key = p.axes[th.id];
        const pos = th.positions[key];
        const txt = (DETAIL[p.id] && DETAIL[p.id][th.id]) ? DETAIL[p.id][th.id] : '—';
        const tag = '<span class="cell-pos"><span class="dot" style="background:' + p.color + '"></span>' +
          esc(pos ? pos.label : '—') + '</span>';
        return '<td>' + tag + '<span class="cell-txt">' + esc(txt) + '</span></td>';
      }).join('');
      return '<tr><th scope="row"><span class="axis-icon" style="display:inline-grid;vertical-align:-5px;margin-right:7px">' +
        svg(ICON[th.id], 14) + '</span>' + esc(th.name) + '</th>' + cells + '</tr>';
    }).join('');

    $('#matrixCount').textContent = sel.length
      ? 'Mostrando ' + sel.length + ' de ' + PARTIES.length + ' partidos' +
        (sel.length > 4 ? '. Desplaza la tabla en horizontal para ver el resto.' : '.')
      : 'No hay partidos seleccionados: elige arriba al menos uno para ver la tabla.';

    // El ancho mínimo se ajusta al número de columnas: con pocos partidos
    // la tabla cabe entera y no hace falta desplazar en horizontal.
    var table = $('#matrix');
    table.style.setProperty('--matrix-min-w', (170 + sel.length * 205) + 'px');

    // Botón de compartir la comparación actual (la url ya lleva la selección).
    var shareBox = $('#matrixShare');
    if (shareBox) {
      shareBox.innerHTML = sel.length ? shareMarkup(
        currentUrl(),
        'Comparando ' + sel.map(function (p) { return p.short; }).join(', ') + ' en los ocho ejes del 29N',
        'esta comparación', 'left') : '';
    }
  }

  /* -------------------------------------------------------- themes */
  function renderThemeIndex() {
    $('#themeIndex').innerHTML = THEMES.map(th =>
      '<a href="#t-' + th.id + '">' + svg(ICON[th.id], 14) + esc(th.name) + '</a>').join('');
  }

  function renderThemes() {
    $('#themeBlocks').innerHTML = THEMES.map(function (th) {
      const cards = PARTIES.filter(function (p) { return state.selected.has(p.id); }).map(function (p) {
        const key = p.axes[th.id];
        const pos = th.positions[key];
        const txt = (DETAIL[p.id] && DETAIL[p.id][th.id]) ? DETAIL[p.id][th.id] : '—';
        return '<div class="tcard">' +
          '<div class="who"><span class="dot" style="background:' + p.color + '"></span>' +
          '<b>' + esc(p.short) + '</b>' +
          '<span class="pos-tag">' + esc(pos ? pos.label : '—') + '</span></div>' +
          '<p>' + esc(txt) + '</p></div>';
      }).join('');

      return '<div class="theme-block" id="t-' + th.id + '">' +
        '<header>' +
        '<div class="theme-head">' +
        '<h3><span class="axis-icon">' + svg(ICON[th.id], 17) + '</span>' + esc(th.name) + '</h3>' +
        '<span class="theme-share">' + shareMarkup(
          SHARE_BASE + '?sel=' + Array.from(state.selected).join(',') + '#t-' + th.id,
          th.name + ': ' + th.axisLeft + ' — ' + th.axisRight + '. Los 22 programas del 29N, lado a lado.',
          'el tema ' + th.name.toLowerCase(), 'left') + '</span>' +
        '</div>' +
        '<p>' + esc(th.intro) + '</p></header>' +
        '<div class="theme-cards">' + cards + '</div></div>';
    }).join('');
  }

  /* ----------------------------------------------------------- compartir */
  const SHARE_BASE = 'https://alejandroid80.github.io/programas-electorales-29n/';

  function currentUrl() {
    return location.origin + location.pathname + location.search;
  }

  function shareLinks(url, text) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(text);
    return [
      { label: 'WhatsApp', href: 'https://wa.me/?text=' + t + '%20' + u },
      { label: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + u },
      { label: 'X', href: 'https://twitter.com/intent/tweet?url=' + u + '&text=' + t },
      { label: 'Bluesky', href: 'https://bsky.app/intent/compose?text=' + t + '%20' + u },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u },
      { label: 'Telegram', href: 'https://t.me/share/url?url=' + u + '&text=' + t },
      { label: 'Correo', href: 'mailto:?subject=' + encodeURIComponent(text) + '&body=' + encodeURIComponent(url + '\n\n' + text) }
    ];
  }

  /* Boton de compartir con su menu. El texto y la url viajan en los
     data-attributes, para que el menu se actualice al cambiar la seleccion. */
  function shareMarkup(url, text, label, align) {
    const canNative = typeof navigator !== 'undefined' && !!navigator.share;
    const items = shareLinks(url, text).map(l =>
      '<a href="' + esc(l.href) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="swatch"></span>' + esc(l.label) + '</a>').join('');

    return '<div class="share' + (align === 'left' ? ' left' : '') + '"' +
      ' data-share-url="' + esc(url) + '" data-share-text="' + esc(text) + '">' +
      '<button type="button" class="share-btn" data-share-toggle aria-expanded="false" aria-haspopup="true"' +
      ' aria-label="' + esc('Compartir ' + label) + '">' + svg('share', 14) +
      '<span>Compartir</span></button>' +
      '<div class="share-menu" hidden role="menu">' +
      (canNative
        ? '<button type="button" class="native" data-share-native>' + svg('share', 14) + 'Compartir con…</button><div class="sep"></div>'
        : '') +
      '<div class="share-grid">' + items + '</div>' +
      '<div class="sep"></div>' +
      '<button type="button" data-share-copy>' + svg('copy', 14) + 'Copiar el enlace</button>' +
      (canNative ? '' : '<p class="hint">Instagram solo se comparte desde su app.</p>') +
      '</div></div>';
  }

  function closeAllMenus() {
    $$('.share-menu').forEach(m => { m.hidden = true; });
    $$('[data-share-toggle]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  /* ------------------------------------------------------- contador */
  /* El total que se ve es la base historica (data/visit-counter.json, que
     vive en el repositorio y nunca se borra) mas el valor que hay ahora
     mismo en el servicio. Asi, aunque el servicio se reinicie, el
     contador no vuelve a cero. */
  const COUNTER_SERVICE = 'https://countapi.mileshilliard.com/api/v1';
  const COUNTER_KEY = 'pe29n-alejandroid80';
  const COUNTER_WINDOW = 12 * 60 * 60 * 1000;

  function initCounter() {
    const box = $('#visits');
    const out = $('#visitsN');
    if (!box) return;

    const paint = (n) => {
      out.textContent = n.toLocaleString('es-ES');
      $('#visitsWord').textContent = n === 1 ? 'visita' : 'visitas';
      box.hidden = false;
    };

    // ¿esta visita ya se contó?
    var counted = false;
    try {
      var last = parseInt(localStorage.getItem('pv_' + COUNTER_KEY) || '0', 10);
      counted = Date.now() - last < COUNTER_WINDOW;
      if (!counted) localStorage.setItem('pv_' + COUNTER_KEY, String(Date.now()));
    } catch (e) { /* sin localStorage: se cuenta siempre */ }

    // La base historica vive en el repo: se lee siempre, sin cache.
    const base = fetch('data/visit-counter.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && Number.isFinite(Number(j.base)) ? Number(j.base) : 0; })
      .catch(function () { return 0; });

    // El valor en vivo, del servicio.
    const url = COUNTER_SERVICE + (counted ? '/get/' : '/hit/') + COUNTER_KEY;
    const vivo = fetch(url, { mode: 'cors', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && Number.isFinite(Number(d.value)) ? Number(d.value) : null; })
      .catch(function () { return null; });

    Promise.all([base, vivo]).then(function (valores) {
      const b = valores[0], v = valores[1];
      if (v == null) return;      // si no se puede medir, no se muestra nada
      paint(b + v);
    });
  }

  /* ------------------------------------------------- botonera de filtro */
  function renderFiltro() {
    const n = state.selected.size;
    $('#filtro-cuenta').textContent = n === PARTIES.length
      ? 'Los ' + n + ' partidos activados'
      : n === 1 ? '1 partido activado' : n + ' partidos activados';

    ['#selTodos', '#selNinguno'].forEach(function (sel) {
      const b = $(sel);
      if (!b) return;
      const activo = (sel === '#selTodos' && n === PARTIES.length) || (sel === '#selNinguno' && n === 0);
      b.setAttribute('aria-pressed', String(activo));
    });
  }

  function fijar(ids) {
    state.selected = new Set(ids.filter(function (id) { return byId(id); }));
    renderAll();
  }

  /* --------------------------------------------------------- render */
  function renderAll() {
    renderSpectrum();
    renderParties();
    renderBlocChips();
    renderSelectChips();
    renderMatrix();
    renderThemes();
    renderFiltro();
    writeUrl();
    window.SELECCION.emit();
  }

  /* Mantiene el foco donde estaba tras reconstruir el DOM. */
  function toggleParty(id, origin) {
    const wasOn = state.selected.has(id);
    if (wasOn) state.selected.delete(id); else state.selected.add(id);
    renderAll();
    // devolver el foco al control que se pulsó
    const sel = '[data-pick="' + id + '"]';
    const cands = $$(sel);
    let target = null;
    if (origin && origin.classList.contains('chip') && origin.classList.contains('pick')) {
      target = $('#parties [data-pick="' + id + '"]');
    } else if (cands.length) {
      target = cands[0];
    }
    if (target) target.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------- copiar */
  function copyText(text, btn) {
    const done = () => {
      const old = btn.textContent;
      btn.textContent = 'Copiado';
      setTimeout(() => { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function tableAsText() {
    const sel = PARTIES.filter(p => state.selected.has(p.id));
    const lines = [];
    lines.push('Programas electorales 29N 2026 — comparación');
    lines.push('');
    lines.push(['Tema'].concat(sel.map(p => p.short)).join(' | '));
    THEMES.forEach(function (th) {
      lines.push([th.name].concat(sel.map(p => th.positions[p.axes[th.id]].label)).join(' | '));
    });
    lines.push('');
    lines.push('Fuente: github.com/jynus/programas-electorales-29n-generales-2026');
    return lines.join('\n');
  }

  /* ------------------------------------------------------- eventos */
  function bind() {
    document.addEventListener('click', function (e) {
      // --- menus de compartir ---
      const toggle = e.target.closest('[data-share-toggle]');
      if (toggle) {
        const menu = toggle.nextElementSibling;
        const wasOpen = !menu.hidden;
        closeAllMenus();
        if (!wasOpen) {
          menu.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
          // Si el menu no cabe por abajo, se abre hacia arriba.
          var box = toggle.closest('.share');
          box.classList.remove('up');
          var r = menu.getBoundingClientRect();
          if (r.bottom > window.innerHeight - 8 && r.top > r.height + 16) {
            box.classList.add('up');
          }
        }
        return;
      }

      const native = e.target.closest('[data-share-native]');
      if (native) {
        const box = native.closest('.share');
        if (navigator.share) {
          navigator.share({
            title: box.getAttribute('data-share-text'),
            url: box.getAttribute('data-share-url')
          }).catch(function () {});
        }
        closeAllMenus();
        return;
      }

      const copy = e.target.closest('[data-share-copy]');
      if (copy) {
        const box = copy.closest('.share');
        copyText(box.getAttribute('data-share-url'), copy);
        closeAllMenus();
        return;
      }

      if (!e.target.closest('.share')) closeAllMenus();

      const pick = e.target.closest('[data-pick]');
      if (pick) { toggleParty(pick.getAttribute('data-pick'), pick); return; }

      const bloc = e.target.closest('[data-bloc]');
      if (bloc) {
        const id = bloc.getAttribute('data-bloc');
        if (state.blocs.has(id)) state.blocs.delete(id); else state.blocs.add(id);
        renderBlocChips();
        renderParties();
        writeUrl();
        return;
      }

      if (e.target.closest('#emptyReset')) {
        if (state.selected.size === 0) {
          fijar(PARTIES.map(function (p) { return p.id; }));
        } else {
          clearFilters();
        }
        return;
      }
      if (e.target.closest('#copyLinkBtn')) {
        copyText(location.href, $('#copyLinkBtn')); return;
      }
      if (e.target.closest('#copyTableBtn')) {
        copyText(tableAsText(), $('#copyTableBtn')); return;
      }
    });

    $('#search').addEventListener('input', function (e) {
      state.query = e.target.value.trim();
      renderParties();
      writeUrl();
    });

    $('#resetBtn').addEventListener('click', clearFilters);

    /* Botonera global, junto a la cabecera. */
    $('#selTodos').addEventListener('click', function () {
      fijar(PARTIES.map(function (p) { return p.id; }));
    });
    $('#selNinguno').addEventListener('click', function () {
      fijar([]);
    });

    // atajos: "/" enfoca el buscador, "Esc" limpia la comparacion
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAllMenus(); }
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
      if (e.key === 'Escape' && state.selected.size) {
        state.selected.clear();
        renderAll();
      }
    });
  }

  function clearFilters() {
    state.blocs.clear();
    state.query = '';
    $('#search').value = '';
    renderBlocChips();
    renderParties();
    writeUrl();
  }

  /* ----------------------------------------------------------- init */
  function init() {
    initTheme();
    readUrl();
    $('#search').value = state.query;
    $('#year').textContent = new Date().getFullYear();
    renderStats();
    renderThemeIndex();
    renderAll();
    bind();
    initCounter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
