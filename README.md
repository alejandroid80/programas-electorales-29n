# Programas electorales 29N 2026 — comparativa web

Pequeña página web (HTML/CSS/JS sin dependencias ni build) que resume los **22 programas
electorales** de las elecciones generales del 29 de noviembre de 2026 y muestra, lado a lado,
las diferencias entre ellos.

## 🌐 Publicada

**https://alejandroid80.github.io/programas-electorales-29n/**

Alojada en GitHub Pages desde el repositorio
[alejandroid80/programas-electorales-29n](https://github.com/alejandroid80/programas-electorales-29n)
(branch `main`, raíz). Cada `git push` a `main` redespliega la web automáticamente.

## Fuente de los datos

Todo el contenido procede del repositorio de
[jynus/programas-electorales-29n-generales-2026](https://github.com/jynus/programas-electorales-29n-generales-2026),
que convierte a reStructuredText los programas originales de cada partido (PDF o web) y verifica
el texto carácter a carácter contra el original, con sumas SHA-256 de cada PDF.

Cada tarjeta de la web enlaza al fichero `.rst` correspondiente dentro del repositorio.

## Estructura

```
programas-electorales-29n/
├── index.html              # estructura de la página
├── assets/
│   ├── css/style.css       # estilos (tema claro/oscuro, responsive)
│   └── js/
│       ├── data.js         # DATOS: temas, partidos, detalle por tema
│       └── app.js          # LÓGICA: render, filtros, comparador
└── README.md
```

- `data.js` es el único fichero que hay que tocar para actualizar el contenido. Contiene:
  - `THEMES`: los 8 ejes de comparación y, para cada eje, las posiciones posibles con su descripción.
  - `PARTIES`: los 22 partidos, con color, bloque, idioma, título del programa, páginas, palabras,
    cuatro cifras destacadas, los puntos fuertes y su posición en cada eje.
  - `DETAIL`: la propuesta literal de cada partido en cada eje (lo que alimenta la matriz y las
    tarjetas por tema).
- `app.js` no contiene datos: solo renderiza y gestiona el estado (selección, búsqueda, filtros).

## Cómo abrirla

```bash
cd "Documentos/Proyectos OpenCode/programas-electorales-29n"
python3 -m http.server 8765
# abrir http://localhost:8765/index.html
```

También funciona abriendo `index.html` directamente con doble clic (no usa módulos ES ni fetch).

## Qué contiene la página

1. **Mapa de posiciones** — 8 ejes (fiscalidad, vivienda, migración, energía, forma del Estado,
   paz/militarismo, Unión Europea, servicios públicos). En cada eje se ven las posiciones posibles
   y qué partido sostiene cada una.
2. **Fichas de partidos** — una por partido, con las cuatro cifras que mejor resumen su programa
   y sus principales propuestas, con enlace al `.rst` original.
3. **Matriz comparativa** — tabla de 8 temas × los partidos seleccionados, para leer las
   diferencias de un vistazo.
4. **Diferencias por tema** — los mismos ejes, con la posición y la propuesta concreta de cada partido.
5. **Método y fuentes** — qué se ha resumido, qué no, y los enlaces al repositorio.

## Notas de método

- Los resúmenes reproducen **propuestas concretas y verificables** de cada programa (cifras, plazos,
  trabas legales). No hay valoraciones ni predicciones.
- La clasificación por eje es una **lectura**, no una cita: agrupa programas que en ese tema
  concreto comparten enfoque.
- Cuando un partido no aborda un tema, la web lo dice explícitamente en lugar de inventar posición.
- Los programas tienen longitudes muy distintas (de 617 a 51.399 palabras), así que el detalle de
  cada uno no es directamente comparable. Por eso se resumen las propuestas y no las páginas.
