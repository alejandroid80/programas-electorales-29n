#!/usr/bin/env node
/**
 * Prepara el material de la cuenta de Bluesky.
 *
 *   node scripts/perfil-bluesky.mjs [carpeta]
 *
 * Escribe el avatar, el banner y un fichero con los datos del perfil (nombre,
 * identificador, biografia y enlaces) para copiar y pegar. No hace falta
 * ningun secreto.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { avatar, banner, aPNG } from './tarjetas.mjs';

const DESTINO = resolve(process.argv[2] || 'perfil');
mkdirSync(DESTINO, { recursive: true });

const WEB = 'https://alejandroid80.github.io/programas-electorales-29n/';
const HANDLE = 'programas29n.bsky.social';
const NOMBRE = '29N · 2026 · Programas electorales';
const BIO = 'Comparamos los 22 programas electorales del 29N de 2026: ocho ejes, una ficha por partido y una matriz para verlos lado a lado.\n' + WEB;

await aPNG(avatar(), resolve(DESTINO, 'avatar.png'));
await aPNG(banner(), resolve(DESTINO, 'banner.png'));

const datos = `
Material para la cuenta de Bluesky
==================================

Identificador
-------------
${HANDLE}

  Comprueba que este libre antes de crear la cuenta:
    curl -s "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${HANDLE}"

Nombre visible
--------------
${NOMBRE}

  (hasta 64 caracteres)

Biografia
---------
${BIO}

  (hasta 256 caracteres, con la cuenta de los caracteres)

  El enlace de la biografia se pone con el boton de "Añadir enlace" de la
  propia web: no hace falta escribirlo a mano.

Avatar
------
${DESTINO}/avatar.png
  1000 x 1000 px. La web lo recorta en circulo: la marca va centrada.

Banner
------
${DESTINO}/banner.png
  3000 x 1000 px. La web lo recorta por los lados: el texto esta a la izquierda.

Enlaces
-------
Web        ${WEB}
Repositorio https://github.com/alejandroid80/programas-electorales-29n
Fuente     https://github.com/jynus/programas-electorales-29n-generales-2026
`.trim();

writeFileSync(resolve(DESTINO, 'datos.txt'), datos + '\n', 'utf8');

console.log('Material del perfil en ' + DESTINO);
console.log('  avatar.png  (1000 x 1000)');
console.log('  banner.png  (3000 x 1000)');
console.log('  datos.txt   (nombre, bio y enlaces)');
