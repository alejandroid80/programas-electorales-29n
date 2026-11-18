/* ===================================================================
   Programas electorales 29N 2026 — lógica de la página
   =================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------- estado */
  const CORE = ['pp', 'psoe', 'podemos', 'vox', 'erc', 'bng', 'bildu', 'pnv'];
  const state = {
    selected: new Set(CORE),
    blocs: new Set(),
    query: '',
    theme: 'light'
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const byId = (id) => PARTIES.find(p => p.id === id);
  const isDark = () => state.theme === 'dark';

  /* Código corto del idioma del programa: los resúmenes en gallego,
     catalán o euskera se citan en la lengua original del partido. */
  const LANG_CODE = {
    'castellano': 'ES', 'gallego': 'GL', 'catalán': 'CA',
    'euskera / castellano': 'EU', 'castellano / euskera': 'EU'
  };
  const LANG_NAME = {
    'ES': 'en castellano', 'GL': 'en gallego',
    'CA': 'en catalán', 'EU': 'en euskera'
  };
  const langCode = (p) => LANG_CODE[p.lang] || 'ES';

  /* --------------------------------------------------------- tema */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#themeBtn').textContent = state.theme === 'dark' ? '☀' : '◐';
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
  function blocLabel(id) {
    const b = BLOCS.find(x => x.id === id);
    return b ? b.label : id;
  }

  function matchQuery(p) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const hay = [
      p.name, p.short, p.title, p.tagline, p.lang, blocLabel(p.bloc),
      p.doc,
      p.keys.map(k => k.t + ' ' + k.d).join(' '),
      p.highlights.map(h => h.k + ' ' + h.v).join(' ')
    ].join(' ').toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function visibleParties() {
    return PARTIES.filter(function (p) {
      if (state.blocs.size && !state.blocs.has(p.bloc)) return false;
      return matchQuery(p);
    });
  }

  /* ------------------------------------------------------- stats */
  function renderStats() {
    const totalWords = PARTIES.reduce(function (a, p) { return a + p.words; }, 0);
    const totalPages = PARTIES.reduce(function (a, p) { return a + p.pages; }, 0);
    const maxWords = Math.max.apply(null, PARTIES.map(p => p.words));
    const minWords = Math.min.apply(null, PARTIES.map(p => p.words));
    const items = [
      { b: String(PARTIES.length), s: 'programas analizados' },
      { b: String(THEMES.length), s: 'ejes de comparación' },
      { b: (totalWords / 1000).toFixed(0) + 'k', s: 'palabras leídas' },
      { b: String(totalPages), s: 'páginas de programa' },
      { b: (maxWords / 1000).toFixed(1) + 'k', s: 'el más extenso (' + byId('podemos').short + ')' },
      { b: String(minWords), s: 'el más breve (' + byId('feministas').short + ')' }
    ];
    $('#stats').innerHTML = items.map(function (i) {
      return '<div class="stat"><b>' + esc(i.b) + '</b><span>' + esc(i.s) + '</span></div>';
    }).join('');
  }

  /* ----------------------------------------------------- spectrum */
  function renderSpectrum() {
    $('#spectrum').innerHTML = THEMES.map(function (th) {
      const keys = Object.keys(th.positions);
      const cols = keys.length;
      const posCells = keys.map(function (k) {
        const pos = th.positions[k];
        const users = PARTIES.filter(function (p) { return p.axes[th.id] === k; });
        const cls = users.length ? '' : ' empty';
        return '<div class="pos' + cls + '"><b>' + esc(pos.label) + '</b>' + esc(pos.desc) + '</div>';
      }).join('');

      const pips = PARTIES.map(function (p) {
        const k = p.axes[th.id];
        const on = state.selected.has(p.id);
        return '<button type="button" class="pip' + (on ? ' on' : ' off') + '" data-pick="' + p.id +
          '" title="' + esc(p.name + ' — ' + th.positions[k].label) + '" aria-pressed="' + on + '">' +
          '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.short) + '</button>';
      }).join('');

      return '<article class="axis" data-theme="' + th.id + '">' +
        '<div class="axis-head"><span class="icon">' + esc(th.icon) + '</span><h3>' + esc(th.name) + '</h3></div>' +
        '<p class="intro">' + esc(th.intro) + '</p>' +
        '<div class="positions" style="--cols:' + cols + '">' + posCells + '</div>' +
        '<div class="pips">' + pips + '</div>' +
        '</article>';
    }).join('');
  }

  /* -------------------------------------------------------- cards */
  function renderParties() {
    const list = visibleParties();
    $('#emptyState').classList.toggle('hidden', list.length > 0);

    $('#parties').innerHTML = list.map(function (p) {
      const on = state.selected.has(p.id);
      const hl = p.highlights.map(function (h) {
        return '<div><b>' + esc(h.k) + '</b><span>' + esc(h.v) + '</span></div>';
      }).join('');
      const keys = p.keys.map(function (k) {
        return '<li><b>' + esc(k.t) + '</b>' + esc(k.d) + '</li>';
      }).join('');

      return '<article class="card" id="p-' + p.id + '" style="--pc:' + p.color + '">' +
        '<div class="card-top">' +
          '<div class="card-head">' +
            '<div class="badge">' + esc(p.short.length > 7 ? p.short.slice(0, 6) : p.short) + '</div>' +
            '<div><h3>' + esc(p.name) + '</h3>' +
            '<div class="role">' + esc(blocLabel(p.bloc)) + ' · programa en ' + esc(p.lang) + '</div></div>' +
          '</div>' +
          '<div class="card-title">«' + esc(p.title) + '»</div>' +
          '<p class="card-tag">' + esc(p.tagline) + '</p>' +
        '</div>' +
        '<div class="hl">' + hl + '</div>' +
        '<ul class="keys">' + keys + '</ul>' +
        '<div class="card-foot">' +
          '<span class="meta"><span><b>' + p.pages + '</b> págs.</span><span><b>' + p.words.toLocaleString('es-ES') + '</b> palabras</span></span>' +
          '<a class="src-link" href="' + REPO_RAW + p.doc + '" target="_blank" rel="noopener">' + esc(p.doc) + ' ↗</a>' +
          '<button type="button" class="chip pick' + (on ? ' on' : '') + '" data-pick="' + p.id + '">' +
            (on ? '✓ En la comparación' : '+ Comparar') + '</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* -------------------------------------------------------- chips */
  function renderBlocChips() {
    const counts = {};
    BLOCS.forEach(function (b) {
      counts[b.id] = PARTIES.filter(function (p) { return p.bloc === b.id; }).length;
    });
    $('#blocChips').innerHTML = BLOCS.map(function (b) {
      const on = state.blocs.has(b.id);
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-bloc="' + b.id + '">' +
        esc(b.label) + '<span class="n">' + counts[b.id] + '</span></button>';
    }).join('');
  }

  function renderSelectChips() {
    $('#selectChips').innerHTML = PARTIES.map(function (p) {
      const on = state.selected.has(p.id);
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-pick="' + p.id + '">' +
        '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + p.color + ';margin-right:6px"></span>' +
        esc(p.short) + '</button>';
    }).join('');
  }

  /* ------------------------------------------------------- matrix */
  function renderMatrix() {
    const sel = PARTIES.filter(function (p) { return state.selected.has(p.id); });

    $('#matrixHead').innerHTML = '<th scope="col">Tema</th>' + sel.map(function (p) {
      return '<th scope="col"><span class="th-party"><span class="dot" style="background:' + p.color + '"></span>' +
        esc(p.short) + '</span></th>';
    }).join('');

    $('#matrixBody').innerHTML = THEMES.map(function (th) {
      const cells = sel.map(function (p) {
        const key = p.axes[th.id];
        const pos = th.positions[key];
        const txt = (DETAIL[p.id] && DETAIL[p.id][th.id]) ? DETAIL[p.id][th.id] : '—';
        const tag = pos
          ? '<span class="cell-pos" style="background:' + hexA(p.color, .14) + ';color:' + p.color + '">' + esc(pos.label) + '</span>'
          : '';
        const lang = langCode(p);
        const mark = lang === 'ES' ? '' :
          '<span class="lang-tag" title="Cita ' + LANG_NAME[lang] + '">' + lang + '</span>';
        return '<td>' + tag + mark + '<span class="cell-txt">' + esc(txt) + '</span></td>';
      }).join('');
      return '<tr><th scope="row"><span class="kicker">' + esc(th.icon) + '</span>' + esc(th.name) + '</th>' + cells + '</tr>';
    }).join('');
  }

  function hexA(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* -------------------------------------------------------- themes */
  function renderThemes() {
    $('#themeBlocks').innerHTML = THEMES.map(function (th) {
      const cards = PARTIES.map(function (p) {
        const key = p.axes[th.id];
        const pos = th.positions[key];
        const txt = (DETAIL[p.id] && DETAIL[p.id][th.id]) ? DETAIL[p.id][th.id] : '—';
        const lang = langCode(p);
        const mark = lang === 'ES' ? '' :
          '<span class="lang-tag" title="Cita ' + LANG_NAME[lang] + '">' + lang + '</span>';
        return '<div class="tcard" style="--pc:' + p.color + '">' +
          '<div class="who"><span class="dot" style="background:' + p.color + '"></span>' +
          '<b>' + esc(p.short) + '</b>' + mark +
          '<span class="pos-tag">' + esc(pos ? pos.label : '—') + '</span></div>' +
          '<p>' + esc(txt) + '</p></div>';
      }).join('');

      return '<div class="theme-block" id="t-' + th.id + '">' +
        '<header><h3><span class="icon">' + esc(th.icon) + '</span>' + esc(th.name) + '</h3>' +
        '<p>' + esc(th.intro) + '</p></header>' +
        '<div class="theme-cards">' + cards + '</div></div>';
    }).join('');
  }

  /* --------------------------------------------------------- render */
  function renderAll() {
    renderSpectrum();
    renderParties();
    renderBlocChips();
    renderSelectChips();
    renderMatrix();
    renderThemes();
  }

  function toggleParty(id) {
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.add(id);
    renderAll();
  }

  /* --------------------------------------------------------- eventos */
  function bind() {
    document.addEventListener('click', function (e) {
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        toggleParty(pick.getAttribute('data-pick'));
        return;
      }
      const bloc = e.target.closest('[data-bloc]');
      if (bloc) {
        const id = bloc.getAttribute('data-bloc');
        if (state.blocs.has(id)) state.blocs.delete(id); else state.blocs.add(id);
        renderBlocChips();
        renderParties();
      }
    });

    $('#search').addEventListener('input', function (e) {
      state.query = e.target.value.trim();
      renderParties();
    });

    $('#resetBtn').addEventListener('click', function () {
      state.blocs.clear();
      state.query = '';
      $('#search').value = '';
      renderBlocChips();
      renderParties();
    });

    $('#allBtn').addEventListener('click', function () {
      PARTIES.forEach(function (p) { state.selected.add(p.id); });
      renderAll();
    });

    $('#noneBtn').addEventListener('click', function () {
      state.selected.clear();
      renderAll();
    });

    $('#coreBtn').addEventListener('click', function () {
      state.selected = new Set(CORE);
      renderAll();
    });
  }

  /* ----------------------------------------------------------- init */
  function init() {
    initTheme();
    $('#year').textContent = new Date().getFullYear();
    renderStats();
    renderAll();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
