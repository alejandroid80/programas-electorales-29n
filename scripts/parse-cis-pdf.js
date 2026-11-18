#!/usr/bin/env node
/**
 * Lee la tabla nacional de la nota de estimacion de voto del CIS.
 *
 *   node scripts/parse-cis-pdf.js <fichero.pdf>
 *
 * Devuelve JSON con, por partido: voto directo, margen, estimacion sobre
 * voto valido y horquilla de escaños.
 *
 * El PDF se lee con pdftotext -layout (poppler-utils). El CIS coloca algunos
 * nombres de partido en dos lineas y los numeros en medio ("Compromis: Front"
 * / "1,2 +-0,1 1,6 4-6" / "Valencia"), asi que se resuelve con una maquina
 * de estados: texto -> numeros -> texto.
 */
import { execFileSync } from 'node:child_process';

const FICHERO = process.argv[2];
if (!FICHERO) {
  console.error('uso: node scripts/parse-cis-pdf.js <fichero.pdf>');
  process.exit(2);
}

const texto = execFileSync('pdftotext', ['-layout', FICHERO, '-'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const lineas = texto.split('\n');

const numES = (s) => {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Los numeros de una fila: directo, margen, estimacion y rango de favoured.
const CON_MARGEN = /^\s*([\d.,]+)\s*±\s*([\d.,]+)\s+([\d.,]+)\s+(\d+\s*[–\-—]\s*\d+|-)\s*$/;
const SIN_MARGEN = /^\s*([\d.,]+)\s+([\d.,]+)\s+(\d+\s*[–\-—]\s*\d+|-)\s*$/;

function rango(txt) {
  if (!txt || txt.trim() === '-') return null;
  const m = txt.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function parseNumeros(txt) {
  let m = CON_MARGEN.exec(txt);
  if (m) {
    const r = rango(m[4]);
    return {
      directo: numES(m[1]), margen: numES(m[2]), estimacion: numES(m[3]),
      escaMin: r ? r[0] : null, escaMax: r ? r[1] : null
    };
  }
  m = SIN_MARGEN.exec(txt);
  if (m) {
    const r = rango(m[3]);
    return {
      directo: numES(m[1]), margen: null, estimacion: numES(m[2]),
      escaMin: r ? r[0] : null, escaMax: r ? r[1] : null
    };
  }
  return null;
}

/* --------------------------------------------- localizar la tabla nacional */
const INICIO = /RESULTADOS PARA EL TOTAL NACIONAL/i;
const iIni = lineas.findIndex((l) => INICIO.test(l));
if (iIni < 0) { console.error('no se encuentra la tabla nacional'); process.exit(1); }

/* ------------------------------------------------------------- parseo */
const filas = [];
let pendienteNombre = null;   // nombre partido esperando sus numeros
let esperandoContinuacion = null;  // fila a la que anadir el final del nombre

for (let i = iIni + 1; i < lineas.length; i++) {
  const t = lineas[i].trim();
  if (!t) continue;

  // Cabecera de la tabla: lineas de texto sin numeros.
  const partes = t.match(/^(.*?)(\d.*)$/);
  if (!partes) {
    if (esperandoContinuacion) {
      esperandoContinuacion.nombre += ' ' + t;
      esperandoContinuacion = null;
    } else if (pendienteNombre) {
      pendienteNombre += ' ' + t;
    } else {
      // Un nombre de partido que ocupa su propia linea: espera los numeros.
      pendienteNombre = t;
    }
    continue;
  }

  const nombre = partes[1].trim().replace(/\s{2,}/g, ' ').replace(/\*+$/, '');
  const nums = parseNumeros(partes[2].trim());
  if (!nums) continue;

  if (nombre) {
    filas.push({ nombre, ...nums });
    pendienteNombre = null;
    esperandoContinuacion = null;
  } else if (pendienteNombre) {
    const fila = { nombre: pendienteNombre, ...nums };
    filas.push(fila);
    pendienteNombre = null;
    esperandoContinuacion = fila;   // el nombre puede continuar en la linea siguiente
  }
}

/* Los partidos sin invito a Representation (voto nulo, en blanco...) no
   sirven para un pactometro, pero se conservan con una marca. */
const PARTIDOS_SIN_ESCANOS = /^(En blanco|Otros partidos|Voto nulo|Abstenci|No sabe|No contesta)/i;

const salida = {
  partidos: filas.map((f) => ({
    partido: f.nombre,
    directo: f.directo,
    margen: f.margen,
    estimacion: f.estimacion,
    escaMin: f.escaMin,
    escaMax: f.escaMax,
    residual: PARTIDOS_SIN_ESCANOS.test(f.nombre)
  }))
};

console.log(JSON.stringify(salida, null, 1));
