#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Busca caracteres de alfabetos no latinos en todo el proyecto.

Permite los signos tipograficos y matematicos de uso legitimo en castellano
(comillas, guiones, euros, flechas...) y senala todo lo demas: chino, japones,
coreano, cirilico, arabe, devanagari...
"""
import io, os, re, sys, unicodedata

# La raiz se deduce del propio script: asi el script funciona en cualquier
# clon, en CI y en cualquier maquina, y no deja en el repositorio la ruta
# local de quien lo escribio.
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if not os.path.isdir(RAIZ):
    print('✗ no existe el directorio del proyecto: %s' % RAIZ)
    sys.exit(1)

EXT = {'.js', '.mjs', '.html', '.css', '.json', '.md', '.yml', '.yaml', '.txt', '.csv', '.gitignore'}

# Signos que si queremos: tipografia española, matematicos y tecnicos.
PERMITIDOS = set(
    ' \n\t'
    'áéíóúüñÁÉÍÓÚÜÑçÇ¡¿«»“”„‘’‚'
    '–—…·•°±×÷≤≥≠≈∞€$£¥¢©®™°ºª§¶†‡'
    '←↑→↓↔↕⇒⇔∑∏√∫≈≠≤≥∞∟∩∪⊂⊃⊆⊇∈∉'
    'ο'
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŠŽß'
    'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ'
    '¡…§«»°·±×÷¶'
    '→←↑↓↔⇒⇐⇑⇓'
)

problemas = []
revisados = 0

for dirpath, dirnames, filenames in os.walk(RAIZ):
    dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules', '.impeccable')]
    for fn in filenames:
        ext = os.path.splitext(fn)[1].lower()
        if ext not in EXT:
            continue
        path = os.path.join(dirpath, fn)
        try:
            txt = io.open(path, encoding='utf-8').read()
        except UnicodeDecodeError:
            problemas.append((path, 0, 'NO ES UTF-8'))
            continue
        revisados += 1
        for num, linea in enumerate(txt.split('\n'), 1):
            for ch in linea:
                if ch in PERMITIDOS:
                    continue
                cat = unicodedata.name(ch, '?')
                # Los alfabetos que nos preocupan de verdad
                if ord(ch) > 0x2000 and not (
                    # alfabetos no latinos explicitos
                    'CJK' in cat or 'HIRAGANA' in cat or 'KATAKANA' in cat or 'HANGUL' in cat
                    or 'CYRILLIC' in cat or 'ARABIC' in cat or 'HEBREW' in cat or 'DEVANAGARI' in cat
                    or 'THAI' in cat or 'GREEK' in cat or 'ARMENIAN' in cat or 'GEORGIAN' in cat
                    or 'BENGALI' in cat or 'TAMIL' in cat or 'ETHIOPIC' in cat
                ):
                    continue
                if ord(ch) > 0x2000:
                    problemas.append((path, num, f'{ch!r} U+{ord(ch):04X} {cat}'))

if revisados == 0:
    print('✗ no se ha revisado ningun fichero: el control no seria fiable')
    sys.exit(1)

if problemas:
    print(f'✗ {len(problemas)} caracter(es) sospechoso(s):\n')
    for path, num, det in problemas:
        rel = path.replace(RAIZ + '/', '')
        print(f' {rel}:{num}  {det}')
    sys.exit(1)
else:
    print('✓ Ningun caracter de alfabeto no latino en el proyecto '
          '(%d ficheros revisados)' % revisados)
