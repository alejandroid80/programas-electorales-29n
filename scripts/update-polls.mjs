#!/usr/bin/env node
/**
 * Bot de intención de voto.
 *
 *   node scripts/update-polls.mjs [--salida data/voting-intention.json]
 *
 * Recoge tres fuentes públicas y las normaliza en un único JSON que la web
 * lee de forma estática. Si una fuente falla, conserva el dato anterior de
 * esa fuente y anota el error: nunca inventa ni rellena con ceros.
 *
 * Fuentes
 *   - Onda Cero   : agregado de 122 encuestas de los principales medios
 *   - CIS         : estimación de voto oficial, en CSV abierto (CC BY 4.0)
 *   - Electomanía : ficha por encuesta conkerve- y license CC BY 4.0
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(RAIZ, 'data/voting-intention.json');

const UA = 'programas-electorales-29n/1.0 (+https://github.com/alejandroid80/programas-electorales-29n)';
const TIMEOUT = 45000;

/* ------------------------------------------------------------------ util */
async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/json,text/csv,*/*' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

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

  // Las encuestas no traen URL propia en el JSON: se enlaza al explorador.
  const encuestas = d.encuestas.map((e) => ({
    medio: e.medio,
    fuente: e.fuente,
    pub: e.pub,
    url: ONDA_URL,
    v: e.v
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

/* ------------------------------------------------------ 2. CIS (oficial) */
const CIS_CSV = 'https://raw.githubusercontent.com/gastiaso/barometros/main/estimacion/estimacion_cis.csv';
const CIS_META = 'https://gastiaso.github.io/barometros/datos/descargas/metadatos.json';

function parseCsv(txt) {
  const filas = [];
  let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (enComillas) {
      if (c === '"') {
        if (txt[i + 1] === '"') { campo += '"'; i++; } else enComillas = false;
      } else campo += c;
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
    partido: r.partido,
    etiqueta: r.etiqueta_cis,
    valor: Number(r.estimacion),
    url: r.url
  })).sort((a, b) => b.valor - a.valor);

  // Serie mensual: un objeto por mes con los valores por etiqueta del CIS.
  const serie = [];
  for (const mes of meses) {
    const delMes = filas.filter((r) => r.mes === mes);
    const v = {};
    for (const r of delMes) v[r.etiqueta_cis] = Number(r.estimacion);
    serie.push({ mes, estudio: delMes[0].estudio, v });
  }

  const infoEstudio = (meta.estudios || []).find((e) => e.estudio === estudio) || {};

  return {
    actualizado: ultimo,
    estudio,
    titulo: infoEstudio.titulo || `Estudio ${estudio}`,
    n: infoEstudio.n || null,
    fechaCampo: infoEstudio.fecha_campo_inicio || null,
    url: est.find((e) => e.url)?.url || 'https://www.cis.es/',
    estimaciones: est,
    serie,
    licencia: 'CC BY 4.0 (armonizacion de Guillermo Astiaso Llamazares sobre microdatos del CIS)'
  };
}

/* --------------------------------------------------- 3. Electomania (fichas) */
const EM_API = 'https://electomania.es/wp-json/wp/v2/posts';

async function fetchElectomania(limite = 14) {
  const url = `${EM_API}?per_page=${limite}&_fields=id,date,link,title,content`;
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

    const v = {}, esc = {};
    for (const f of filas.slice(1)) {
      const nombre = f[iPartido];
      const num = (s) => Number(String(s).replace(/[^\d.,-]/g, '').replace(',', '.'));
      const val = num(f[iVoto]);
      if (!Number.isFinite(val)) continue;
      v[nombre] = val;
      if (iEsc >= 0) {
        const e = num(f[iEsc]);
        if (Number.isFinite(e)) esc[nombre] = e;
      }
    }
    if (!Object.keys(v).length) continue;

    // Datos de contexto desde el JSON-LD.
    let ld = {};
    const jl = c.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
    if (jl) { try { ld = JSON.parse(jl[1]); } catch {} }

    // Electomania tambien publica encuestas de otros paises: solo interesan
    // las de Espana. El JSON-LD lo dice explicitamente en la descripcion.
    const desc = ld.description || '';
    const pais = (desc.match(/en ([A-Za-zÁÉÍÓÚÑáéíóúñ]+) para las pr/) || [])[1];
    if (pais && pais !== 'España') continue;

    salida.push({
      fecha: (p.date || '').slice(0, 10),
      titular: (p.title?.rendered || '').replace(/&#8221;|&#8220;|&quot;/g, '"').replace(/&[a-z]+;/g, ' ').trim(),
      ficha: ld.name || null,
      sondeante: (ld.creator && (ld.creator.name || ld.creator)) || null,
      licencia: ld.license || 'https://creativecommons.org/licenses/by/4.0/',
      url: p.link,
      muestra: null,
      v,
      esc
    });
  }
  if (!salida.length) throw new Error('no se ha extraido ninguna tabla de Electomania');
  return salida;
}

/* --------------------------------------------------------------- programa */
const anterior = leerPrevio();
const errores = [];
const out = {
  generado: iso(),
  elecciones: '2026-11-29',
  fuentes: [
    { id: 'media', nombre: 'Agregado de encuestas de los medios', url: ONDA_URL, home: 'https://www.ondacero.es/' },
    { id: 'cis', nombre: 'CIS, estimacion de voto', url: 'https://www.cis.es/', home: 'https://www.cis.es/' },
    { id: 'electomania', nombre: 'Electomania', url: 'https://electomania.es/', home: 'https://electomania.es/' }
  ]
};

async function guardia(nombre, fn, clave) {
  try {
    out[clave] = await fn();
    console.log(`  ok   ${nombre}`);
  } catch (e) {
    errores.push(`${nombre}: ${e.message}`);
    if (anterior[clave]) {
      out[clave] = anterior[clave];
      out[clave]._fallback = `No se pudo actualizar: ${e.message}. Se conserva el dato del ${anterior[clave].actualizado || 'anterior'}.`;
      console.log(`  FAIL ${nombre}: ${e.message} -> se conserva el dato anterior`);
    } else {
      console.log(`  FAIL ${nombre}: ${e.message} -> sin datos`);
    }
  }
}

console.log('Recogiendo la intencion de voto...');
await guardia('Onda Cero (medios)', fetchOndaCero, 'media');
await guardia('CIS (oficial)', fetchCis, 'cis');
await guardia('Electomania (fichas)', () => fetchElectomania(16), 'electomania');

out.errores = errores;

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, JSON.stringify(out, null, 1) + '\n', 'utf8');

console.log(`\nEscrito ${SALIDA}`);
if (out.media) console.log(`  medios: ${out.media.total} encuestas, promedio hasta ${out.media.actualizado}`);
if (out.cis) console.log(`  CIS: estudio ${out.cis.estudio} (${out.cis.actualizado}), ${out.cis.estimaciones.length} parties`);
if (out.electomania) console.log(`  Electomania: ${out.electomania.length} fichas`);
if (errores.length) {
  console.log('\nAvisos (la web los mostrara):');
  errores.forEach((e) => console.log('  · ' + e));
}
