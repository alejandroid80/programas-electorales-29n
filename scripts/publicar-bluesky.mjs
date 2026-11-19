#!/usr/bin/env node
/**
 * Publica en Bluesky.
 *
 *   node scripts/publicar-bluesky.mjs
 *
 * Elige una pieza de contenido cada dia (siempre la misma para cada fecha,
 * para que se pueda repetir sin duplicar), dibuja la tarjeta y la sube.
 *
 * Variables de entorno:
 *   BSKY_HANDLE        el identificador, por ejemplo programas29n.bsky.social
 *   BSKY_APP_PASSWORD  la contrasena de aplicacion (no la de la cuenta)
 *
 * Si faltan, no hace nada y lo dice: es lo normal hasta que se configuren.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { tarjetaEje, tarjetaDistribucion, tarjetaCifras, aPNG, TARJETA } from './tarjetas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = 'https://alejandroid80.github.io/programas-electorales-29n/';
const XRPC = 'https://bsky.social/xrpc';

/* --------------------------------------------------------------- datos */
const src = readFileSync(resolve(RAIZ, 'assets/js/data.js'), 'utf8');
const mod = {};
new Function('exports', src + '\nObject.assign(exports,{PARTIES,THEMES});')(mod);
const { PARTIES, THEMES } = mod;

const CAL = JSON.parse(readFileSync(resolve(RAIZ, 'data/elecciones.json'), 'utf8'));

function enProhibicion(fecha) {
  const t = fecha.getTime();
  return t >= new Date(CAL.prohibicionPublicacion.inicio).getTime()
      && t < new Date(CAL.prohibicionPublicacion.fin).getTime();
}

/* ---------------------------------------------------------------- texto */
const COMO = 'Los 22 programas electorales del 29N de 2026, leídos y comparados punto por punto.';

/* Une una lista: a, b y c. */
function enumerar(lista) {
  if (lista.length === 1) return lista[0];
  return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
}

/* El nombre de una posicion. En una frase vale el completo ("Más suelo y
   oferta"); si el texto se pasa de largo, el corto ("Oferta"). */
function etiquetaPos(pos) {
  return String(pos.label || pos.short || '').trim();
}
function etiquetaPosCorta(pos) {
  return String(pos.short || pos.label || '').trim();
}

/* El enlace va al final: se marca como facet para que sea pulsable. */
function conEnlace(texto, url) {
  const i = texto.indexOf(url);
  if (i < 0) return { texto, facets: [] };
  const inicio = Buffer.byteLength(texto.slice(0, i), 'utf8');
  const largo = Buffer.byteLength(url, 'utf8');
  return {
    texto,
    facets: [{
      index: { byteStart: inicio, byteEnd: inicio + largo },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }]
    }]
  };
}

/* --------------------------------------------------------- las piezas */
/* Cada pieza es una funcion que devuelve { texto, url, svg, alt } o null. */
function piezas() {
  const lista = [];

  // 1. Un eje y como se reparten los 22 partidos.
  for (const tema of THEMES) {
    const reparto = {};
    for (const p of PARTIES) {
      const k = p.axes[tema.id];
      if (k) reparto[k] = (reparto[k] || 0) + 1;
    }
    const conPartidos = tema.scale
      .map((clave) => ({ clave, pos: tema.positions[clave], n: reparto[clave] || 0 }))
      .filter((f) => f.n > 0)
      .sort((a, b) => b.n - a.n);

    const partes = conPartidos.map((f) => `${f.n} en «${etiquetaPos(f.pos)}»`);
    let texto = `${tema.name}: ${enumerar(partes)}.\n\n${COMO}\n\n${WEB}#t-${tema.id}`;
    // Si no cabe, se prueban los rotulos cortos.
    if (texto.length > 300) {
      const partesCortas = conPartidos.map((f) => `${f.n} en «${etiquetaPosCorta(f.pos)}»`);
      texto = `${tema.name}: ${enumerar(partesCortas)}.\n\n${COMO}\n\n${WEB}#t-${tema.id}`;
    }

    lista.push({
      id: 'eje-' + tema.id,
      texto,
      url: WEB + '#t-' + tema.id,
      alt: `Tarjeta del eje ${tema.name}: ${conPartidos.map((f) => `${f.n} partidos en ${etiquetaPos(f.pos)}`).join(', ')}.`,
      svg: () => tarjetaDistribucion(tema, reparto, WEB)
    });
  }

  // 2. Un partido en la posicion en la que menos gente esta: las minorias.
  for (const tema of THEMES) {
    const reparto = {};
    for (const p of PARTIES) {
      const k = p.axes[tema.id];
      if (k) reparto[k] = (reparto[k] || 0) + 1;
    }
    const minimo = Math.min(...Object.values(reparto));
    const clavesMinimas = tema.scale.filter((k) => reparto[k] === minimo);
    if (!clavesMinimas.length || minimo > 3) continue;   // solo las minorias de verdad
    const clave = clavesMinimas[0];
    const enEsa = PARTIES.filter((p) => p.axes[tema.id] === clave);
    const partido = enEsa[0];
    const pos = tema.positions[clave];

    const quien = enEsa.length === 1
      ? `${partido.name} es el único partido que se sitúa en «${etiquetaPos(pos)}»`
      : `${enumerar(enEsa.map((p) => p.name))} se sitúan en «${etiquetaPos(pos)}»`;
    let texto = `${quien} en el eje de ${tema.name.toLowerCase()}.\n\n${COMO}\n\n${WEB}#t-${tema.id}`;
    if (texto.length > 300) {
      const quienCorto = enEsa.length === 1
        ? `${partido.name} es el único partido que se sitúa en «${etiquetaPosCorta(pos)}»`
        : `${enumerar(enEsa.map((p) => p.name))} se sitúan en «${etiquetaPosCorta(pos)}»`;
      texto = `${quienCorto} en el eje de ${tema.name.toLowerCase()}.\n\n${COMO}\n\n${WEB}#t-${tema.id}`;
    }

    lista.push({
      id: 'minoria-' + tema.id,
      texto,
      url: WEB + '#t-' + tema.id,
      alt: `Tarjeta: ${partido.name} en la posición ${pos.short || pos.label} del eje ${tema.name}.`,
      svg: () => tarjetaEje(
        tema,
        partido,
        pos,
        PARTIES.filter((p) => p.axes[tema.id]).map((p) => ({ id: p.id, clave: p.axes[tema.id], color: p.color })),
        WEB
      )
    });
  }

  // 3. La estimacion de voto. Solo fuera del periodo prohibido.
  const FICHERO = resolve(RAIZ, 'data/voting-intention.json');
  if (existsSync(FICHERO)) {
    try {
      const d = JSON.parse(readFileSync(FICHERO, 'utf8'));
      const cis = d.cis;
      if (cis && cis.estimaciones && cis.estimaciones.length) {
        const top = cis.estimaciones.slice(0, 3);
        const listaTop = top.map((e) => `${e.etiqueta} ${String(e.valor).replace('.', ',')} %`);
        const mes = cis.actualizado ? cis.actualizado : '';
        const texto = `Estimación de voto del CIS${mes ? ' de ' + mes : ''}: ${enumerar(listaTop)}.\n\n${COMO}\n\n${WEB}#voto-sec`;
        lista.push({
          id: 'cifras',
          texto,
          url: WEB + '#voto-sec',
          alt: `Tarjeta de la estimación del CIS: ${listaTop.join(', ')}.`,
          soloFueraDelPeriodo: true,
          svg: () => tarjetaCifras(
            cis.titulo || 'Estimación de voto del CIS',
            top.map((e) => ({ nombre: e.etiqueta, v: e.valor, texto: String(e.valor).replace('.', ',') + ' %' })),
            WEB,
            'La última estimación'
          )
        });
      }
    } catch { /* el bot lo regenera */ }
  }

  return lista;
}

/* --------------------------------------------------------------- API */
async function sesion(handle, password) {
  const r = await fetch(XRPC + '/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password })
  });
  if (!r.ok) throw new Error('no se pudo iniciar sesion (' + r.status + '): ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function subirImagen(jwt, bytes) {
  const r = await fetch(XRPC + '/com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + jwt, 'content-type': 'image/png' },
    body: bytes
  });
  if (!r.ok) throw new Error('no se pudo subir la imagen (' + r.status + '): ' + (await r.text()).slice(0, 200));
  return (await r.json()).blob;
}

async function crearRegistro(jwt, did, record) {
  const r = await fetch(XRPC + '/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + jwt, 'content-type': 'application/json' },
    body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record })
  });
  if (!r.ok) throw new Error('no se pudo publicar (' + r.status + '): ' + (await r.text()).slice(0, 200));
  return r.json();
}

/* Ya se publico este texto? Se mira el registro propio en el PDS.
   Se usa listRecords y no getAuthorFeed por dos motivos: el feed de la
   appview necesita autorizacion (sin ella devuelve 401 y la comprobacion
   fallaria en silencio, publicando siempre dos veces) y ademas tarde en
   indexar, mientras que los registros del propio repositorio se leen al
   momento. */
async function yaPublicado(did, jwt, texto) {
  if (process.env.FORZAR === '1') return false;
  const r = await fetch(XRPC + '/com.atproto.repo.listRecords?repo=' + encodeURIComponent(did)
    + '&collection=app.bsky.feed.post&limit=100&reverse=true',
  { headers: { authorization: 'Bearer ' + jwt } });
  // Si la comprobacion falla, mejor no publicar a arriesgarse a duplicar.
  if (!r.ok) throw new Error('no se pudo comprobar el feed (' + r.status + '): ' + (await r.text()).slice(0, 200));
  const datos = await r.json();
  return (datos.records || []).some((x) => x.value && x.value.text === texto);
}

/* ------------------------------------------------------------ programa */
const handle = process.env.BSKY_HANDLE;
const password = process.env.BSKY_APP_PASSWORD;
const vistaPrevia = process.argv.includes('--preview') || process.env.PREVIEW === '1';
const listar = process.argv.includes('--listar');

const hoy = new Date();
const prohibido = enProhibicion(hoy);

const catalogo = piezas().filter((p) => !p.soloFueraDelPeriodo || !prohibido);
if (!catalogo.length) {
  console.log('No hay piezas disponibles.');
  process.exit(0);
}

/* --listar: el calendario de contenidos, sin publicar nada. */
if (listar) {
  console.log('Piezas: ' + catalogo.length + ' (elige una por dia, rotando)');
  console.log('');
  for (const p of catalogo) {
    console.log('### ' + p.id + '  (' + p.texto.length + ' caracteres, limite 300)');
    console.log(p.texto);
    console.log('');
  }
  process.exit(0);
}

// Una pieza por dia, siempre la misma: asi, si el workflow se repite, no
// duplica nada y el calendario de contenidos es predecible.
const indice = Math.floor(hoy.getTime() / 86400000) % catalogo.length;
const pieza = catalogo[indice];

const { texto, facets } = conEnlace(pieza.texto, pieza.url);

console.log('Pieza de hoy: ' + pieza.id + ' (' + (indice + 1) + ' de ' + catalogo.length + ')');
console.log('Periodo de prohibicion de publicar sondeos: ' + (prohibido ? 'SI, no se publicaria lo de las encuestas' : 'no'));
console.log('---');
console.log(texto);
console.log('---');
console.log('Caracteres: ' + texto.length + ' (el limite de Bluesky son 300)');

/* La tarjeta */
const TMP = resolve(RAIZ, '.tmp-tarjeta');
mkdirSync(TMP, { recursive: true });
const png = resolve(TMP, 'tarjeta.png');
await aPNG(pieza.svg(), png);
const bytes = readFileSync(png);
console.log('Tarjeta: ' + png + ' (' + Math.round(bytes.length / 1024) + ' KB)');

if (vistaPrevia) {
  console.log('Vista previa: no se publica nada.');
  process.exit(0);
}

if (!handle || !password) {
  console.log('Faltan BSKY_HANDLE o BSKY_APP_PASSWORD: no se publica nada.');
  console.log('  Se guardan como secretos del repositorio:');
  console.log('    gh secret set BSKY_APP_PASSWORD --repo alejandroid80/programas-electorales-29n');
  process.exit(0);
}

for (const f of readdirSync(TMP)) { try { unlinkSync(resolve(TMP, f)); } catch { } }

const s = await sesion(handle, password);
console.log('Sesion iniciada: ' + s.handle + ' (' + s.did + ')');

if (await yaPublicado(s.did, s.accessJwt, texto)) {
  console.log('Esta pieza ya estaba publicada hoy: no se duplica.');
  process.exit(0);
}

const blob = await subirImagen(s.accessJwt, bytes);
console.log('Imagen subida (' + Math.round(bytes.length / 1024) + ' KB)');

const registro = {
  $type: 'app.bsky.feed.post',
  text: texto,
  createdAt: new Date().toISOString(),
  langs: ['es'],
  facets,
  embed: {
    $type: 'app.bsky.embed.images',
    images: [{ image: blob, alt: pieza.alt, aspectRatio: { width: TARJETA.ancho, height: TARJETA.alto } }]
  }
};

const creado = await crearRegistro(s.accessJwt, s.did, registro);
console.log('Publicado: https://bsky.app/profile/' + s.handle + '/post/' + creado.uri.split('/').pop());
