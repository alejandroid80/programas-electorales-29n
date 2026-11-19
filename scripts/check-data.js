#!/usr/bin/env node
/**
 * Control de calidad de los datos de la comparativa.
 *
 *   node scripts/check-data.js
 *
 * Falla (codigo de salida 1) si encuentra texto corrupto, campos que faltan
 * o referencias rotas entre ejes, escalas y partidos. Pensado para correrse
 * antes de cada publicacion.
 *
 * Revisa SOLO los campos de prosa (lo que el lector ve), no el codigo.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'assets', 'js', 'data.js');
const src = fs.readFileSync(DATA, 'utf8');

const mod = {};
new Function('exports', src + '\nObject.assign(exports,{PARTIES,THEMES,DETAIL,CIS_LABELS,CIS_EXTRA});')(mod);
const { PARTIES, THEMES, DETAIL, CIS_LABELS, CIS_EXTRA } = mod;

const errors = [];
const fail = (m) => errors.push(m);

/* ------------------------------------------------------------------ *
 * 1. Recolectar SOLO los campos de prosa
 * ------------------------------------------------------------------ */
const prose = [];   // { donde, texto }
const add = (donde, texto) => {
  if (typeof texto === 'string' && texto.trim()) prose.push({ donde, texto });
};

for (const th of THEMES) {
  add(`eje ${th.id}.name`, th.name);
  add(`eje ${th.id}.intro`, th.intro);
  add(`eje ${th.id}.axisLeft`, th.axisLeft);
  add(`eje ${th.id}.axisRight`, th.axisRight);
  for (const k of Object.keys(th.positions || {})) {
    add(`eje ${th.id}.positions.${k}.label`, th.positions[k].label);
    add(`eje ${th.id}.positions.${k}.desc`, th.positions[k].desc);
  }
}
for (const p of PARTIES) {
  add(`partido ${p.id}.name`, p.name);
  add(`partido ${p.id}.title`, p.title);
  add(`partido ${p.id}.tagline`, p.tagline);
  (p.keys || []).forEach((k, i) => {
    add(`partido ${p.id}.keys[${i}].t`, k.t);
    add(`partido ${p.id}.keys[${i}].d`, k.d);
  });
  (p.highlights || []).forEach((h, i) => {
    add(`partido ${p.id}.highlights[${i}].k`, h.k);
    add(`partido ${p.id}.highlights[${i}].v`, h.v);
  });
  for (const th of THEMES) {
    add(`detalle ${p.id}.${th.id}`, (DETAIL[p.id] || {})[th.id]);
  }
}

/* ------------------------------------------------------------------ *
 * 2. Reglas de texto
 * ------------------------------------------------------------------ */

// 2a. Caracteres permitidos en la prosa.
//     Se admiten acentos, eñes, signos de puntuacion, signos
//     tipograficos (apostrophe ’), unidades (€, %, ≈) y operadores (=, <, >).
// La apostrofe tipografica (U+2019) es legitima en catalan y gallego.
const ALLOWED = /^[A-Za-zÀ-ÿ0-9\s.,;:!¡?¿'"’«»()\[\]\/–—·%€$+=<>~≈…&_-]$/;
// Pistas por rango de codepoint: sin meter letras de otros alfabetos en
// el propio fichero del checker.
function pista(cp) {
  if (cp >= 0x0600 && cp <= 0x06ff) return 'alfabeto arabe (desordena el texto de derecha a izquierda)';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'alfabeto cirilico';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'alfabeto griego';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'alfabeto chino';
  if (cp >= 0x3040 && cp <= 0x30ff) return 'alfabeto japones';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'alfabeto coreano';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'alfabeto hebreo';
  if (cp >= 0x0530 && cp <= 0x058f) return 'alfabeto armenio';
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'alfabeto tailandés';
  if (cp === 0x3000) return 'espacio ideografico';
  if (cp === 0xfeff) return 'byte order mark';
  if (cp >= 0x2000 && cp <= 0x206f) return 'signo tipografico no permitido';
  return 'caracter no permitido';
}

for (const { donde, texto } of prose) {
  for (const ch of texto) {
    if (ALLOWED.test(ch)) continue;
    const cp = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    const hint = pista(ch.codePointAt(0));
    fail(`${donde}: ${cp} (${ch}) — ${hint}  en "${trunc(texto)}"`);
    break;
  }
}

// 2b. Palabras pegadas en camelCase dentro de una frase
const CAMEL = /\b[a-zà-ÿ]{2,}[A-ZÁÉÍÓÚÑ][a-zà-ÿ]{1,}\b/g;
for (const { donde, texto } of prose) {
  let hit;
  CAMEL.lastIndex = 0;
  while ((hit = CAMEL.exec(texto))) {
    fail(`${donde}: palabra pegada en camelCase ("${hit[0]}")  en "${trunc(texto)}"`);
  }
}

// 2c. Palabras que no son castellanas (typos manuales frecuentes)
const NOT_SPANISH = [
  'storage', 'critique', 'structs', 'peace', 'qu', 'elrena', 'nuevolavoz',
  'vellido', 'ithmetic', 'Dimitréplica', 'laostar', 'institutions', 'timing'
];

// 2c-bis. Todo el resumen va en castellano: se detectan las formas
// catalanas y gallegas que se colaron en traducciones.
const NON_SPANISH_FORMS = [
  'Acollida', 'persoas', 'sanidade', 'calidade', 'Serveis', 'sanitat',
  'habitatge', 'Habitatge', 'salaris', 'autònomes', 'migració', 'drets',
  'Fiscalitat', 'na Galiza', 'da Galiza', 'bo goberno', 'enerxética',
  'coas persoas', 'Xerais', 'xerais', 'escola', 'infància', 'joventut',
  'famílies', 'ciutadania', 'treball', 'l’economia', 'la’economia'
];
for (const { donde, texto } of prose) {
  for (const w of NON_SPANISH_FORMS) {
    // por limites de palabra: "migracio" no puede casar con "migracion"
    const re = new RegExp(`(^|[^A-Za-z\u00C0-\u00FF])${w}([^A-Za-z\u00C0-\u00FF]|$)`, 'i');
    if (re.test(texto)) {
      fail(`${donde}: forma no castellana ("${w}")  en "${trunc(texto)}"`);
      break;
    }
  }
}

for (const { donde, texto } of prose) {
  for (const w of NOT_SPANISH) {
    const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])(${w})([^A-Za-zÀ-ÿ]|$)`, 'i');
    const m = texto.match(re);
    if (m) fail(`${donde}: palabra no castellana ("${m[2]}")  en "${trunc(texto)}"`);
  }
}

// 2d. Higiene tipografica
for (const { donde, texto } of prose) {
  if (/\s{2,}/.test(texto)) fail(`${donde}: espacio doble  en "${trunc(texto)}"`);
  if (/[ ]+[.,;:!?]/.test(texto)) fail(`${donde}: espacio antes de puntuacion  en "${trunc(texto)}"`);
  if (/[,;:]$/.test(texto.trim())) fail(`${donde}: puntuacion colgante al final  en "${trunc(texto)}"`);
  if (/[¿¡]/.test(texto) === false && /\?/.test(texto)) fail(`${donde}: interrogacion sin apertura  en "${trunc(texto)}"`);
  if (/[a-zà-ÿ][A-ZÁÉÍÓÚÑ]/.test(texto) && !CAMEL.test(texto)) {
    CAMEL.lastIndex = 0;
    if (!CAMEL.test(texto)) fail(`${donde}: mayuscula pegada a minuscula  en "${trunc(texto)}"`);
  }
}

/* ------------------------------------------------------------------ *
 * 1c. Ninguna letra de otro alfabeto en los ficheros del proyecto
 *
 * Los signos tipograficos y matematicos si se permiten; lo que no vale es
 * que se cuele una letra china, cirilica, arabe o coreana.
 * ------------------------------------------------------------------ */
const LETRAS_OTRAS = /[\u0370-\u03FF\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

const FICHEROS_REVISADOS = ['index.html', 'assets/js/app.js', 'assets/js/data.js',
  'assets/js/polls.js', 'assets/js/pacto.js', 'assets/js/resumen.js',
  'assets/js/datos-voto.js', 'assets/css/style.css'];

for (const rel of FICHEROS_REVISADOS) {
  const ruta = path.join(__dirname, '..', rel);
  if (!fs.existsSync(ruta)) continue;
  const txt = fs.readFileSync(ruta, 'utf8');
  txt.split('\n').forEach((linea, i) => {
    if (LETRAS_OTRAS.test(linea)) {
      const encontradas = (linea.match(LETRAS_OTRAS) || []).join('');
      fail(`${rel}:${i + 1}  letra(s) de otro alfabeto "${encontradas}"  en "${trunc(linea)}"`);
    }
  });
}

/* ------------------------------------------------------------------ *
 * 3. Estructura de los partidos
 * ------------------------------------------------------------------ */
const REQ = ['id', 'name', 'short', 'abbr', 'color', 'profile', 'bloc', 'lang',
  'doc', 'title', 'pages', 'words', 'tagline', 'pcText', 'badgeFg', 'axes', 'keys', 'highlights'];

const ids = new Set();
for (const p of PARTIES) {
  for (const f of REQ) {
    if (p[f] === undefined || p[f] === null) fail(`partido "${p.id}": falta el campo "${f}"`);
  }
  if (ids.has(p.id)) fail(`id de partido duplicado: "${p.id}"`);
  ids.add(p.id);

  for (const c of [p.color, p.pcText && p.pcText.light, p.pcText && p.pcText.dark, p.badgeFg]) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(c || '')) fail(`partido "${p.id}": color invalido "${c}"`);
  }
  if (!p.keys || p.keys.length < 2) fail(`partido "${p.id}": menos de 2 puntos fuertes`);
  if (!p.highlights || p.highlights.length !== 4) fail(`partido "${p.id}": se esperan 4 cifras destacadas`);
  if ((p.abbr || '').length > 5) fail(`partido "${p.id}": abreviatura demasiado larga ("${p.abbr}")`);
}

/* ------------------------------------------------------------------ *
 * 4. Ejes, escalas y posiciones
 * ------------------------------------------------------------------ */
const themeIds = new Set();
for (const th of THEMES) {
  if (themeIds.has(th.id)) fail(`id de eje duplicado: "${th.id}"`);
  themeIds.add(th.id);

  for (const f of ['name', 'intro', 'scale', 'axisLeft', 'axisRight']) {
    if (!th[f]) fail(`eje "${th.id}": falta "${f}"`);
  }
  for (const k of Object.keys(th.positions || {})) {
    if (!th.positions[k].label || !th.positions[k].desc) fail(`eje "${th.id}" posicion "${k}": falta label o desc`);
    if (!th.positions[k].short) fail(`eje "${th.id}" posicion "${k}": falta la etiqueta corta`);
    else if (th.positions[k].short.length > 16) fail(`eje "${th.id}" posicion "${k}": etiqueta corta demasiado larga ("${th.positions[k].short}")`);
  }
  for (const k of Object.keys(th.positions || {})) {
    if (!th.scale.includes(k)) fail(`eje "${th.id}": la posicion "${k}" no esta en la escala`);
  }
  for (const k of th.scale) {
    if (!th.positions[k]) fail(`eje "${th.id}": la escala usa "${k}", que no es una posicion`);
  }
  if (th.scale.length !== Object.keys(th.positions || {}).length) {
    fail(`eje "${th.id}": la escala y las posiciones no coinciden`);
  }
  if (new Set(th.scale).size !== th.scale.length) fail(`eje "${th.id}": la escala tiene posiciones repetidas`);
}

for (const p of PARTIES) {
  for (const th of THEMES) {
    const k = p.axes[th.id];
    if (!k) { fail(`partido "${p.id}": sin posicion en el eje "${th.id}"`); continue; }
    if (!th.positions[k]) fail(`partido "${p.id}": posicion "${k}" inexistente en el eje "${th.id}"`);
    if (!th.scale.includes(k)) fail(`partido "${p.id}": posicion "${k}" fuera de la escala del eje "${th.id}"`);
  }
  for (const e of Object.keys(p.axes).filter((k) => !themeIds.has(k))) {
    fail(`partido "${p.id}": eje desconocido "${e}"`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Detalle por partido y tema
 * ------------------------------------------------------------------ */
for (const p of PARTIES) {
  if (!DETAIL[p.id]) { fail(`partido "${p.id}": sin DETAIL`); continue; }
  for (const th of THEMES) {
    if (!DETAIL[p.id][th.id]) fail(`partido "${p.id}": sin detalle para el eje "${th.id}"`);
  }
}

/* ------------------------------------------------------------------ *
 * 6. Coherencia con el repositorio de origen
 * ------------------------------------------------------------------ */
const REPO = {
  pp: [82, 23599], psoe: [114, 36163], podemos: [141, 51399], vox: [66, 6812],
  erc: [48, 25307], bng: [91, 25684], bildu: [30, 11817], pnv: [43, 11267],
  adelante: [134, 31800], compromis: [64, 16744], cc: [23, 9239],
  frente_amplio: [151, 48994], frente_obrero: [64, 12979], pacma: [82, 41387],
  humanista: [31, 7875], mj: [95, 19687], democracia21: [13, 2559],
  salf: [40, 8598], iustitia: [28, 4382], teruel: [15, 6016],
  soria: [1, 740], feministas: [2, 617]
};
for (const p of PARTIES) {
  const r = REPO[p.id];
  if (!r) { fail(`partido "${p.id}": sin referencia en el repositorio`); continue; }
  if (r[0] !== p.pages) fail(`partido "${p.id}": paginas ${p.pages}, el repo dice ${r[0]}`);
  if (r[1] !== p.words) fail(`partido "${p.id}": palabras ${p.words}, el repo dice ${r[1]}`);
}

/* ------------------------------------------------------------------ *
 * 7. Datos de intencion de voto (los genera el bot)
 * ------------------------------------------------------------------ */
const POLLS = path.join(__dirname, '..', 'data', 'voting-intention.json');
if (fs.existsSync(POLLS)) {
  const P = JSON.parse(fs.readFileSync(POLLS, 'utf8'));
  if (!P.generado) fail('voto: falta la marca de tiempo "generado"');
  if (!P.fuentes || !P.fuentes.length) fail('voto: no se declara ninguna fuente');
  if (P.errores && P.errores.length) {
    P.errores.forEach((e) => fail('voto: el bot avisa de un fallo -> ' + e));
  }
  const m = P.media;
  if (m) {
    if (!m.partidos || !m.partidos.length) fail('voto (medios): sin partidos');
    if (!m.promedios || m.promedios.length < 2) fail('voto (medios): la serie mensual esta vacia o es demasiado corta');
    if (!m.encuestas || !m.encuestas.length) fail('voto (medios): sin encuestas');
    (m.promedios || []).forEach((p) => {
      if (!/^\d{4}-\d{2}$/.test(p.mes)) fail(`voto (medios): mes con formato invalido "${p.mes}"`);
      Object.keys(p.v || {}).forEach((k) => {
        const v = p.v[k];
        if (v !== null && (typeof v !== 'number' || v < 0 || v > 100)) {
          fail(`voto (medios): valor fuera de rango en ${p.mes}/${k} = ${v}`);
        }
      });
    });
    (m.encuestas || []).forEach((e) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.pub)) fail(`voto (medios): fecha invalida "${e.pub}"`);
      if (!e.fuente || !e.medio) fail(`voto (medios): encuesta sin fuente ni medio`);
    });
  }
  const c = P.cis;
  if (c) {
    if (!c.actualizado || !/^\d{4}-\d{2}$/.test(c.actualizado)) fail('voto (CIS): fecha de actualizacion invalida');
    if (!c.estimaciones || !c.estimaciones.length) fail('voto (CIS): sin estimaciones');
    c.estimaciones.forEach((e) => {
      if (typeof e.valor !== 'number' || e.valor < 0 || e.valor > 100) {
        fail(`voto (CIS): estimacion fuera de rango: ${e.etiqueta} = ${e.valor}`);
      }
    });
  }
  const pre = P.preelectoral;
  if (pre) {
    if (!/^\d{4,5}$/.test(String(pre.estudio))) fail('voto (preelectoral): codigo de estudio invalido');
    if (pre.mayoria !== 176) fail('voto (preelectoral): la mayoria deberia ser 176, no ' + pre.mayoria);
    if (!pre.partidos || pre.partidos.length < 10) fail('voto (preelectoral): faltan partidos');
    (pre.partidos || []).forEach((p) => {
      if (typeof p.estimacion !== 'number' || p.estimacion <= 0 || p.estimacion > 100) {
        fail(`voto (preelectoral): estimacion invalida: ${p.etiqueta} = ${p.estimacion}`);
      }
      if (p.escaMin != null && p.escaMax != null && p.escaMin > p.escaMax) {
        fail(`voto (preelectoral): horquilla invertida en ${p.etiqueta} (${p.escaMin}-${p.escaMax})`);
      }
      if (p.escaMin != null && p.escaMax != null && (p.escaMin < 0 || p.escaMax > 350)) {
        fail(`voto (preelectoral): escanos fuera de rango en ${p.etiqueta}`);
      }
      // El pactometro busca la etiqueta del CIS en CIS_LABELS para saber a
      // que partido pertenece. Si el CIS cambia como escribe un nombre, la
      // etiqueta deja de resolver y el partido se queda fuera de la pagina
      // sin que se note. Aqui se avisa.
      const conocida = Object.keys(CIS_LABELS).some((id) => CIS_LABELS[id] === p.etiqueta)
        || CIS_EXTRA.some((x) => x.etiqueta === p.etiqueta);
      if (!conocida) {
        fail(`voto (preelectoral): etiqueta desconocida del CIS: "${p.etiqueta}" `
          + '(no coincide con CIS_LABELS ni con CIS_EXTRA: el pactometro no la podra asignar)');
      }
    });
  } else {
    console.warn('aviso: no hay datos preelectorales (el pactometro quedara sin datos)');
  }
  if (P.electomania) {
    P.electomania.forEach((e) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) fail(`voto (Electomania): fecha invalida "${e.fecha}"`);
      if (!e.url) fail('voto (Electomania): ficha sin enlace a la fuente');
      // Electomania publica tambien encuestas de otros paises: solo valen las de Espana.
      if (!/Espa[nñ]a/.test(e.ficha || '')) {
        fail(`voto (Electomania): ficha que no es de Espana -> "${e.ficha}"`);
      }
    });
  }
} else {
  console.warn('aviso: no existe data/voting-intention.json (el bot lo genera)');
}

/* ------------------------------------------------------------------ *
 * 8. Contador de visitas: la base historica no se puede perder
 * ------------------------------------------------------------------ */
const VC = path.join(__dirname, '..', 'data', 'visit-counter.json');
if (!fs.existsSync(VC)) {
  fail('contador: falta data/visit-counter.json (sin el, publicar puede poner el contador a cero)');
} else {
  const v = JSON.parse(fs.readFileSync(VC, 'utf8'));
  if (!Number.isInteger(v.base) || v.base < 0) {
    fail(`contador: la base debe ser un entero >= 0, no "${v.base}"`);
  }
  if (!v.clave) fail('contador: falta la clave del servicio');
  if (!v.nota) fail('contador: falta la nota que explica de donde sale la base');
  // El bot nunca debe tocar este fichero.
  const bot = fs.readFileSync(path.join(__dirname, 'update-polls.mjs'), 'utf8');
  if (/visit-counter/.test(bot) && !/visit-counter/.test(bot.split('\n').filter(l => /readFileSync|writeFileSync/.test(l)).join('\n'))) {
    fail('contador: el bot parece tocar visit-counter.json');
  }
}

/* ------------------------------------------------------------------ */
function trunc(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 76 ? t.slice(0, 76) + '…' : t;
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problema(s) en los datos:\n`);
  errors.forEach((e) => console.error(' · ' + e));
  console.error('');
  process.exit(1);
}

console.log(`✓ datos correctos: ${PARTIES.length} partidos, ${THEMES.length} ejes, ` +
  `${PARTIES.length * THEMES.length} posiciones, ${prose.length} campos de prosa sin texto corrupto`);
