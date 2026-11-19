// Ejemplo: genera una tarjeta de cada tipo para ver como quedan.
//   node scripts/ejemplo-tarjetas.mjs [carpeta]
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { tarjetaEje, tarjetaDistribucion, tarjetaCifras, aPNG } from './tarjetas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(process.argv[2] || 'tarjetas');
mkdirSync(SALIDA, { recursive: true });

const src = readFileSync(resolve(RAIZ, 'assets/js/data.js'), 'utf8');
const mod = {};
new Function('exports', src + '\nObject.assign(exports,{PARTIES,THEMES});')(mod);
const { PARTIES, THEMES } = mod;

const WEB = 'https://alejandroid80.github.io/programas-electorales-29n/';

// 1. Un partido en un eje
const tema = THEMES.find((t) => t.id === 'energia');
const partido = PARTIES.find((p) => p.id === 'bildu');
const enElEje = PARTIES.filter((p) => p.axes[tema.id])
  .map((p) => ({ id: p.id, clave: p.axes[tema.id], color: p.color }));
await aPNG(tarjetaEje(tema, partido, tema.positions[partido.axes[tema.id]], enElEje, WEB),
  resolve(SALIDA, 'eje.png'));

// 2. Como se reparten los partidos en un eje
const tema2 = THEMES.find((t) => t.id === 'vivienda');
const reparto = {};
for (const p of PARTIES) {
  const k = p.axes[tema2.id];
  if (k) reparto[k] = (reparto[k] || 0) + 1;
}
await aPNG(tarjetaDistribucion(tema2, reparto, WEB), resolve(SALIDA, 'distribucion.png'));

// 3. Las cifras de la estimacion
await aPNG(tarjetaCifras('Estimación del CIS, octubre de 2026', [
  { nombre: 'PSOE', v: 34, texto: '34 %', color: '#a41f33' },
  { nombre: 'PP', v: 25, texto: '25 %', color: '#0B5FA5' },
  { nombre: 'VOX', v: 19, texto: '19 %', color: '#00913a' }
], WEB, 'La última estimación'), resolve(SALIDA, 'cifras.png'));

console.log('Tarjetas de ejemplo en ' + SALIDA);
