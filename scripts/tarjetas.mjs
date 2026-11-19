#!/usr/bin/env node
/**
 * Tarjetas para las redes: SVG que se convierte en PNG.
 *
 *   node scripts/tarjetas.mjs                 # escribe las de ejemplo en /tmp
 *
 * Las tarjetas se dibujan con los mismos colores que la pagina y con los
 * datos de verdad: no hay ni un numero escrito a mano. El texto se pinta con
 * Liberation Serif y Liberation Sans, que estan en cualquier instalacion de
 * Linux (el CI las instala con fonts-liberation).
 */
import { execFile } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* Los mismos tokens que assets/css/style.css */
export const COLOR = {
  bg: '#faf7f2',
  bgSoft: '#f2ede4',
  bgCard: '#fffdf9',
  ink: '#191b1e',
  ink2: '#4a4f56',
  ink3: '#646a72',
  line: '#e2dbd0',
  line2: '#cfc6b7',
  accent: '#a41f33',
  accentSoft: '#f4e4e6',
  gold: '#8a6a1c',
  goldSoft: '#f6efdc'
};

const SERIF = 'Liberation Serif';
const SANS = 'Liberation Sans';
const ANCHO = 1200;
const ALTO = 630;

/* Las medidas de la tarjeta, para que el publicador pueda decirselas a
   Bluesky (sin el aspectRatio, la red enmarca la imagen en un cuadrado). */
export const TARJETA = { ancho: ANCHO, alto: ALTO };

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Recorta un texto para que no se salga de la caja. */
function recortar(s, max) {
  const t = String(s == null ? '' : s);
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
}

/* --------------------------------------------------------------------
 * Pie: la marca y la direccion
 * ------------------------------------------------------------------ */
function pie(url) {
  return `
  <rect x="0" y="${ALTO - 6}" width="${ANCHO}" height="6" fill="${COLOR.accent}"/>
  <text x="60" y="${ALTO - 42}" font-family="${SANS}" font-size="24" font-weight="bold" fill="${COLOR.accent}">29N · 2026</text>
  <text x="60" y="${ALTO - 14}" font-family="${SANS}" font-size="19" fill="${COLOR.ink3}">Los 22 programas electorales, punto por punto</text>
  <text x="${ANCHO - 60}" y="${ALTO - 28}" font-family="${SANS}" font-size="19" fill="${COLOR.ink3}" text-anchor="end">${esc(url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</text>`;
}

/* Cabecera pequena: la marca a la izquierda, el tipo de dato a la derecha */
function cabecera(tipo) {
  return `
  <text x="60" y="86" font-family="${SANS}" font-size="26" font-weight="bold" fill="${COLOR.accent}">29N · 2026</text>
  <text x="${ANCHO - 60}" y="86" font-family="${SANS}" font-size="22" fill="${COLOR.ink3}" text-anchor="end">${esc(tipo)}</text>
  <line x1="60" y1="108" x2="${ANCHO - 60}" y2="108" stroke="${COLOR.line2}" stroke-width="2"/>`;
}

/* ====================================================================
 * Tarjeta 1: un partido en un eje
 * ==================================================================== */
export function tarjetaEje(tema, partido, posicion, enElEje, url) {
  const n = tema.scale.length;
  const x0 = 90;
  const x1 = ANCHO - 90;
  const yEje = 400;
  const paso = (x1 - x0) / (n - 1);
  const xDe = (clave) => {
    const i = Math.max(0, tema.scale.indexOf(clave));
    return x0 + i * paso;
  };

  // Los puntos de cada partido en el eje.
  const puntos = enElEje.map((p) => {
    const x = xDe(p.clave);
    const suyo = p.id === partido.id;
    const r = suyo ? 17 : 9;
    return `<circle cx="${x.toFixed(1)}" cy="${yEje}" r="${r}" fill="${suyo ? COLOR.accent : p.color}" opacity="${suyo ? 1 : 0.55}"/>`;
  }).join('');

  // Las etiquetas de las posiciones, alternadas para que no se pisen.
  const etiquetas = tema.scale.map((clave, i) => {
    const pos = tema.positions[clave];
    const x = x0 + i * paso;
    const arriba = i % 2 === 0;
    const y = arriba ? yEje - 46 : yEje + 58;
    return `<text x="${x.toFixed(1)}" y="${y}" font-family="${SANS}" font-size="20" fill="${COLOR.ink2}" text-anchor="middle">${esc(pos.short || pos.label)}</text>`;
  }).join('');

  const ticks = tema.scale.map((clave, i) => {
    const x = x0 + i * paso;
    return `<line x1="${x.toFixed(1)}" y1="${yEje - 26}" x2="${x.toFixed(1)}" y2="${yEje + 26}" stroke="${COLOR.line2}" stroke-width="2"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLOR.bg}"/>
  ${cabecera('Un partido, un eje')}

  <circle cx="86" cy="205" r="34" fill="${partido.color}"/>
  <text x="86" y="220" font-family="${SANS}" font-size="30" font-weight="bold" fill="${esc(partido.badgeFg || '#fff')}" text-anchor="middle">${esc(partido.abbr || partido.short)}</text>
  <text x="146" y="200" font-family="${SERIF}" font-size="52" fill="${COLOR.ink}">${esc(recortar(partido.name, 26))}</text>
  <text x="146" y="240" font-family="${SANS}" font-size="25" fill="${COLOR.ink3}">${esc(recortar(partido.tagline, 78))}</text>

  <rect x="60" y="278" width="${(ANCHO - 120).toFixed(0)}" height="66" rx="12" fill="${COLOR.bgSoft}"/>
  <text x="90" y="306" font-family="${SANS}" font-size="20" fill="${COLOR.ink3}">En el eje ${esc(tema.name.toLowerCase())}</text>
  <text x="90" y="332" font-family="${SANS}" font-size="24" font-weight="bold" fill="${COLOR.ink}">${esc(posicion.label || posicion.short)}</text>

  ${ticks}
  <line x1="${x0}" y1="${yEje}" x2="${x1}" y2="${yEje}" stroke="${COLOR.line2}" stroke-width="4"/>
  ${etiquetas}
  ${puntos}

  <text x="90" y="${yEje + 112}" font-family="${SANS}" font-size="21" fill="${COLOR.ink3}">${esc(tema.axisLeft)}</text>
  <text x="${ANCHO - 90}" y="${yEje + 112}" font-family="${SANS}" font-size="21" fill="${COLOR.ink3}" text-anchor="end">${esc(tema.axisRight)}</text>

  ${pie(url)}
</svg>`;
}

/* ====================================================================
 * Tarjeta 2: como se reparten los partidos en un eje
 * ==================================================================== */
export function tarjetaDistribucion(tema, reparto, url) {
  // Las posiciones con al menos un partido, de mas a menos.
  const filas = tema.scale
    .map((clave) => ({ clave, pos: tema.positions[clave], n: reparto[clave] || 0 }))
    .filter((f) => f.n > 0)
    .sort((a, b) => b.n - a.n);

  const max = Math.max(1, ...filas.map((f) => f.n));
  const y0 = 250;
  const altoFila = 46;
  const xBarra = 330;
  const anchoMax = ANCHO - xBarra - 180;

  const barras = filas.map((f, i) => {
    const y = y0 + i * altoFila;
    const w = Math.max(6, Math.round((f.n / max) * anchoMax));
    return `
  <text x="90" y="${y + 24}" font-family="${SANS}" font-size="25" fill="${COLOR.ink}">${esc(f.pos.short || f.pos.label)}</text>
  <rect x="${xBarra}" y="${y}" width="${w}" height="32" rx="6" fill="${COLOR.accent}" opacity="${(0.95 - i * 0.12).toFixed(2)}"/>
  <text x="${xBarra + w + 18}" y="${y + 24}" font-family="${SANS}" font-size="25" font-weight="bold" fill="${COLOR.ink2}">${f.n}</text>`;
  }).join('');

  const total = filas.reduce((a, f) => a + f.n, 0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLOR.bg}"/>
  ${cabecera('Un eje, todos los partidos')}

  <text x="60" y="185" font-family="${SERIF}" font-size="62" fill="${COLOR.ink}">${esc(tema.name)}</text>
  <text x="60" y="222" font-family="${SANS}" font-size="25" fill="${COLOR.ink3}">${esc(tema.axisLeft)} · ${esc(tema.axisRight)}</text>

  ${barras}

  <text x="90" y="${y0 + filas.length * altoFila + 44}" font-family="${SANS}" font-size="22" fill="${COLOR.ink3}">${total} partidos repartidos en ${filas.length} posiciones</text>

  ${pie(url)}
</svg>`;
}

/* ====================================================================
 * Tarjeta 3: la estimacion de voto (solo fuera del periodo prohibido)
 * ==================================================================== */
export function tarjetaCifras(titulo, lineas, url, pieTexto) {
  const y0 = 215;
  const altoFila = 62;
  const xBarra = 300;
  const anchoMax = ANCHO - xBarra - 200;
  const max = Math.max(1, ...lineas.map((l) => l.v));

  const barras = lineas.map((l, i) => {
    const y = y0 + i * altoFila;
    const w = Math.max(6, Math.round((l.v / max) * anchoMax));
    return `
  <text x="90" y="${y + 30}" font-family="${SANS}" font-size="30" font-weight="bold" fill="${COLOR.ink}">${esc(l.nombre)}</text>
  <rect x="${xBarra}" y="${y}" width="${w}" height="40" rx="8" fill="${l.color || COLOR.accent}"/>
  <text x="${xBarra + w + 20}" y="${y + 31}" font-family="${SANS}" font-size="30" font-weight="bold" fill="${COLOR.ink2}">${esc(l.texto)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLOR.bg}"/>
  ${cabecera(pieTexto || 'La última estimación')}

  <text x="60" y="180" font-family="${SERIF}" font-size="54" fill="${COLOR.ink}">${esc(titulo)}</text>

  ${barras}

  ${pie(url)}
</svg>`;
}

/* ====================================================================
 * Avatar y banner
 * ==================================================================== */
export function avatar() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="${COLOR.accent}"/>
  <g fill="#ffffff">
    <rect x="220" y="360" width="560" height="58" rx="29"/>
    <rect x="220" y="470" width="560" height="58" rx="29"/>
    <rect x="220" y="580" width="340" height="58" rx="29"/>
  </g>
</svg>`;
}

export function banner() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="1000" viewBox="0 0 3000 1000">
  <rect width="3000" height="1000" fill="${COLOR.accent}"/>
  <g fill="#ffffff">
    <rect x="180" y="380" width="180" height="30" rx="15"/>
    <rect x="180" y="440" width="180" height="30" rx="15"/>
    <rect x="180" y="500" width="110" height="30" rx="15"/>
  </g>
  <text x="450" y="470" font-family="${SERIF}" font-size="150" fill="#ffffff">29N · 2026</text>
  <text x="455" y="560" font-family="${SANS}" font-size="58" fill="#f0d9dc">Los 22 programas electorales, punto por punto</text>
</svg>`;
}

/* --------------------------------------------------------------------
 * De SVG a PNG
 *
 * ImageMagick se queda colgado si el SVG le llega por la entrada estandar,
 * asi que se escribe a un fichero temporal y se convierte desde ahi.
 * ------------------------------------------------------------------ */
export async function aPNG(svg, destino) {
  const tmp = destino + '.svg';
  writeFileSync(tmp, svg, 'utf8');
  try {
    await execFileAsync('magick', ['-background', 'none', tmp, destino], {
      maxBuffer: 32 * 1024 * 1024
    });
  } finally {
    try { unlinkSync(tmp); } catch { /* ya no esta */ }
  }
  return destino;
}
