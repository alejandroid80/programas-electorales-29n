#!/usr/bin/env node
/**
 * Bot de intencion de voto.
 *
 *   node scripts/update-polls.mjs
 *
 * Recoge cuatro fuentes publicas y las normaliza en un unico JSON que la web
 * lee de forma estatica. Si una fuente falla, conserva el dato anterior de
 * esa fuente y anota el error: nunca inventa ni rellena con ceros.
 *
 * Fuentes
 *   - Onda Cero      : agregado de las encuestas de los principales medios
 *   - CIS barometros : estimacion de voto mensual, en CSV abierto (CC BY 4.0)
 *   - Electomania    : ficha por encuesta, con repartos de escanos (CC BY 4.0)
 *   - CIS preelectoral: la unica fuente que reparte escanos por partido
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(RAIZ, 'data/voting-intention.json');

const UA = 'programas-electorales-29n/1.0 (+https://github.com/alejandroid80/programas-electorales-29n)';
const TIMEOUT = 45000;
const ESPERA = 1500;   // pausa entre peticiones al CIS, para no castigar el servidor

/* ------------------------------------------------------------------ util */
async function get(url, binario = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/json,text/csv,*/*' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return binario ? Buffer.from(await r.arrayBuffer()) : await r.text();
  } finally {
    clearTimeout(t);
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = () => new Date().toISOString();

function leerPrevio() {
  if (!existsSync(SALIDA)) return {};
  try { return JSON.parse(readFileSync(SALIDA, 'utf8')); } catch { return {}; }
}

/* ------------------------------------------------- 1. Onda Cero (medios) */
const ONDA_URL = 'https://www.ondacero.es/elecciones/generales/encuestas/';

async function fetchOndaCero() {
  const html = await get(ONDA_URL);
  const m = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no se encuentra el bloque JSON en la pagina de Onda Cero');
  const d = JSON.parse(m[1]);

  if (!Array.isArray(d.encuestas) || !d.encuestas.length) throw new Error('la lista de encuestas viene vacia');

  const part = {};
  for (const p of d.partidos || []) part[p.id] = { id: p.id, nombre: p.nombre, color: p.color };

  const encuestas = d.encuestas.map((e) => ({
    medio: e.medio, fuente: e.fuente, pub: e.pub, url: ONDA_URL, v: e.v
  }));

  return {
    partidos: Object.values(part),
    actualizado: d.actualizado || null,
    elecciones: d.meta?.elecciones || null,
    total: d.total ?? encuestas.length,
    fuente: d.meta?.fuente || 'Onda Cero',
    promedios: (d.promedios || []).map((p) => ({ mes: p.mes, n: p.n, v: p.v })),
    encuestas,
    efectoCasa: (d.efectoCasa || []).map((e) => ({ fuente: e.fuente, medios: e.medios, n: e.n, d: e.d }))
  };
}

/* ------------------------------------------------------ 2. CIS (barometro) */
const CIS_CSV = 'https://raw.githubusercontent.com/gastiaso/barometros/main/estimacion/estimacion_cis.csv';
const CIS_META = 'https://gastiaso.github.io/barometros/datos/descargas/metadatos.json';

function parseCsv(txt) {
  const filas = [];
  let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (enComillas) {
      if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = filas.shift();
  return filas.filter((f) => f.length > 1).map((f) => Object.fromEntries(cab.map((k, i) => [k, f[i] ?? ''])));
}

async function fetchCis() {
  const [csv, meta] = await Promise.all([get(CIS_CSV), get(CIS_META).then((t) => JSON.parse(t))]);
  const filas = parseCsv(csv).filter((r) => r.estudio && r.partido && r.estimacion !== '');
  if (!filas.length) throw new Error('la serie del CIS viene vacia');

  const meses = [...new Set(filas.map((r) => r.mes))].sort();
  const ultimo = meses[meses.length - 1];
  const delUltimo = filas.filter((r) => r.mes === ultimo);
  const estudio = delUltimo[0].estudio;

  const est = delUltimo.map((r) => ({
    partido: r.partido, etiqueta: r.etiqueta_cis, valor: Number(r.estimacion), url: r.url
  })).sort((a, b) => b.valor - a.valor);

  const serie = [];
  for (const mes of meses) {
    const delMes = filas.filter((r) => r.mes === mes);
    const v = {};
    for (const r of delMes) v[r.etiqueta_cis] = Number(r.estimacion);
    serie.push({ mes, estudio: delMes[0].estudio, v });
  }

  const info = (meta.estudios || []).find((e) => e.estudio === estudio) || {};
  return {
    actualizado: ultimo, estudio, titulo: info.titulo || 'Estudio ' + estudio,
    n: info.n || null, fechaCampo: info.fecha_campo_inicio || null,
    url: est.find((e) => e.url)?.url || 'https://www.cis.es/',
    estimaciones: est, serie,
    licencia: 'CC BY 4.0 (armonizacion de Guillermo Astiaso Llamazares sobre microdatos del CIS)'
  };
}

/* --------------------------------------------------- 3. Electomania (fichas) */
const EM_API = 'https://electomania.es/wp-json/wp/v2/posts';

async function fetchElectomania(limite = 14) {
  // Se piden muchos mas posts porque entre las encuestas se cuelan noticias:
  // el filtro por pais y por tabla deja solo las encuestas de Espana.
  const url = EM_API + '?per_page=50&_fields=id,date,link,title,content';
  const posts = JSON.parse(await get(url));
  if (!Array.isArray(posts) || !posts.length) throw new Error('Electomania no devuelve posts');

  const salida = [];
  for (const p of posts) {
    const c = p.content?.rendered || '';
    const tabla = c.match(/<table[\s\S]*?<\/table>/);
    if (!tabla) continue;

    const filas = [...tabla[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) =>
      [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((x) =>
        x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    ).filter((f) => f.length >= 3);
    if (filas.length < 2) continue;

    const cab = filas[0].map((h) => h.toLowerCase());
    const iPartido = cab.findIndex((h) => h.includes('partido'));
    const iVoto = cab.findIndex((h) => h.includes('voto'));
    const iEsc = cab.findIndex((h) => h.includes('esca'));
    if (iPartido < 0 || iVoto < 0) continue;

    const num = (s) => Number(String(s).replace(/[^\d.,-]/g, '').replace(',', '.'));
    const v = {}, esc = {};
    for (const f of filas.slice(1)) {
      const nombre = f[iPartido];
      const val = num(f[iVoto]);
      if (!Number.isFinite(val)) continue;
      v[nombre] = val;
      if (iEsc >= 0) { const e = num(f[iEsc]); if (Number.isFinite(e)) esc[nombre] = e; }
    }
    if (!Object.keys(v).length) continue;

    let ld = {};
    const jl = c.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
    if (jl) { try { ld = JSON.parse(jl[1]); } catch {} }

    // Electomania tambien publica encuestas de otros paises: solo interesan
    // las de Espana. El JSON-LD lo dice explicitamente en la descripcion.
    // Si el pais no se reconoce, la ficha se descarta: es preferible perder
    // una encuesta a meter una de otro pais.
    const desc = ld.description || '';
    const pais = (desc.match(/en ([A-Za-zÁÉÍÓÚÑáéíóúñ ]{2,30}) para las pr/) || [])[1];
    if (!pais || pais.trim() !== 'España') continue;

    salida.push({
      fecha: (p.date || '').slice(0, 10),
      titular: (p.title?.rendered || '').replace(/&#8221;|&#8220;|&quot;/g, '"').replace(/&[a-z]+;/g, ' ').trim(),
      ficha: ld.name || null,
      sondeante: (ld.creator && (ld.creator.name || ld.creator)) || null,
      licencia: ld.license || 'https://creativecommons.org/licenses/by/4.0/',
      url: p.link, muestra: null, v, esc
    });
  }
  if (!salida.length) throw new Error('no se ha extraido ninguna tabla de Electomania');
  // Se ordenan por fecha y se acotan: el API intercala noticias con encuestas.
  salida.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return salida.slice(0, limite);
}

/* ------------------------------------ 4. CIS preelectoral (con repartos) */
/* La unica fuente que reparte escanos por partido es la encuesta
   preelectoral del CIS. Su PDF vive en una URL predecible:
     https://www.cis.es/documents/d/guest/<codigo>_estimacion-pdf
   Para no fijarla a mano, se sondea una ventana de codigos y se busca el
   PDF que sea preelectoral y ademas traiga la columna de escanos. */
const CIS_PDF = (code) => 'https://www.cis.es/documents/d/guest/' + code + '_estimacion-pdf';

async function pdftotext(buf, tmp) {
  writeFileSync(tmp, buf);
  try {
    const { stdout } = await execFileAsync('pdftotext', ['-layout', tmp, '-'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    throw new Error('no se puede ejecutar pdftotext (falta poppler-utils)');
  }
}

async function buscarPreelectoral(codigos) {
  for (const code of codigos) {
    let buf;
    try {
      buf = await get(CIS_PDF(code), true);
    } catch (e) {
      continue;
    }
    if (buf.slice(0, 4).toString('binary') !== '%PDF') continue;

    const tmp = resolve(RAIZ, '.tmp-cis-' + code + '.pdf');
    let txt;
    try {
      txt = await pdftotext(buf, tmp);
    } catch (e) {
      try { unlinkSync(tmp); } catch (e2) {}
      throw e;
    }
    try { unlinkSync(tmp); } catch (e) {}

    if (!/PREELECTORAL/i.test(txt)) continue;
    if (!/escaños/i.test(txt)) continue;

    // El parser esta en un script aparte, ya probado: se reutiliza.
    const tmp2 = resolve(RAIZ, '.tmp-cis-parse-' + code + '.pdf');
    writeFileSync(tmp2, buf);
    let datos;
    try {
      const { stdout } = await execFileAsync('node', [resolve(RAIZ, 'scripts', 'parse-cis-pdf.js'), tmp2],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, cwd: RAIZ });
      datos = JSON.parse(stdout);
    } finally {
      try { unlinkSync(tmp2); } catch (e) {}
    }
    return { code, datos };
  }
  return null;
}

/* --------------------------------------------------------------- programa */
const anterior = leerPrevio();
const errores = [];
const out = {
  generado: iso(),
  elecciones: '2026-11-29',
  fuentes: [
    { id: 'media', nombre: 'Agregado de encuestas de los medios', url: ONDA_URL },
    { id: 'cis', nombre: 'CIS, estimacion de voto', url: 'https://www.cis.es/' },
    { id: 'electomania', nombre: 'Electomania', url: 'https://electomania.es/' },
    { id: 'preelectoral', nombre: 'CIS, encuesta preelectoral', url: 'https://www.cis.es/' }
  ]
};

async function guardia(nombre, fn, clave) {
  try {
    out[clave] = await fn();
    console.log('  ok   ' + nombre);
  } catch (e) {
    errores.push(nombre + ': ' + e.message);
    if (anterior[clave]) {
      out[clave] = anterior[clave];
      out[clave]._fallback = 'No se pudo actualizar: ' + e.message + '. Se conserva el dato anterior.';
      console.log('  FAIL ' + nombre + ': ' + e.message + ' -> se conserva el dato anterior');
    } else {
      console.log('  FAIL ' + nombre + ': ' + e.message + ' -> sin datos');
    }
  }
}

console.log('Recogiendo la intencion de voto...');
await guardia('Onda Cero (medios)', fetchOndaCero, 'media');
await guardia('CIS (barometro)', fetchCis, 'cis');
await guardia('Electomania (fichas)', () => fetchElectomania(14), 'electomania');

/* Preelectoral: se sondea una ventana de codigos a partir del ultimo
   barometro conocido, con pausas para no castigar al CIS. */
await guardia('CIS preelectoral (repartos de escanos)', async () => {
  const ultimoBarometro = out.cis ? Number(out.cis.estudio) : 3582;
  const cacheado = anterior.preelectoral ? Number(anterior.preelectoral.estudio) : 0;
  const desde = Math.max(ultimoBarometro, cacheado) - 1;

  const codigos = [];
  for (let c = desde; c <= desde + 9; c++) if (c > 0) codigos.push(c);
  if (cacheado && codigos.indexOf(cacheado) === -1) codigos.unshift(cacheado);

  for (const code of codigos) {
    const r = await buscarPreelectoral([code]);
    if (!r) { await dormir(ESPERA); continue; }
    const partidos = r.datos.partidos.filter((p) => !p.residual && p.estimacion != null);
    if (!partidos.length) { await dormir(ESPERA); continue; }
    return {
      estudio: r.code,
      titulo: 'Preelectoral elecciones generales 2026',
      actualizado: new Date().toISOString().slice(0, 10),
      url: CIS_PDF(r.code),
      mayoria: 176,
      XL: 350,
      partidos: partidos.map((p) => ({
        etiqueta: p.partido,
        estimacion: p.estimacion,
        directo: p.directo,
        escaMin: p.escaMin,
        escaMax: p.escaMax,
        escaMedio: p.escaMin != null ? Math.round((p.escaMin + p.escaMax) / 2) : null
      }))
    };
  }
  throw new Error('no se encuentra ningun estudio preelectoral con repartos de escanos');
}, 'preelectoral');

out.errores = errores;

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, JSON.stringify(out, null, 1) + '\n', 'utf8');

console.log('\nEscrito ' + SALIDA);
if (out.media) console.log('  medios: ' + out.media.total + ' encuestas, promedio hasta ' + out.media.actualizado);
if (out.cis) console.log('  CIS: estudio ' + out.cis.estudio + ' (' + out.cis.actualizado + '), ' + out.cis.estimaciones.length + ' partidos');
if (out.electomania) console.log('  Electomania: ' + out.electomania.length + ' fichas');
if (out.preelectoral) console.log('  preelectoral: estudio ' + out.preelectoral.estudio + ', ' + out.preelectoral.partidos.length + ' partidos con repartos');
if (errores.length) {
  console.log('\nAvisos (la web los mostrara):');
  errores.forEach((e) => console.log('  - ' + e));
}
