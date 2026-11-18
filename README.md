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
├── scripts/
│   └── check-data.js       # control automático de calidad de los datos
└── README.md
```

- `data.js` es el único fichero que hay que tocar para actualizar el contenido. Contiene:
  - `THEMES`: los 8 ejes de comparación, las posiciones posibles de cada uno con su descripción,
    y la `scale` que los ordena de izquierda a derecha.
  - `PARTIES`: los 22 partidos, con color, variante de color legible sobre fondo claro y oscuro,
    perfil del programa, título traducido y original, páginas, palabras, cuatro cifras destacadas,
    los puntos fuertes y su posición en cada eje.
  - `DETAIL`: la propuesta literal de cada partido en cada eje (lo que alimenta la matriz y las
    tarjetas por tema).
- `app.js` no contiene datos: solo renderiza y gestiona el estado (selección, búsqueda, filtros,
  URL compartible y copiado).

## Control de calidad de los datos

```bash
node scripts/check-data.js
```

Falla con código de salida 1 si encuentra texto corrupto (caracteres de otro alfabeto, palabras
pegadas en camelCase, erratas de inglés o francés), formas no castellanas que se colaron en las
traducciones, campos que faltan, referencias rotas entre ejes y escalas, o cifras de páginas y
palabras que no cuadran con el README del repositorio de origen.

Conviene ejecutarlo **antes de cada publicación**: durante la revisión de diseño este control
destapó 20 textos corruptos que a simple vista no se veían.

## Qué contiene la página

```bash
cd "Documentos/Proyectos OpenCode/programas-electorales-29n"
python3 -m http.server 8765
# abrir http://localhost:8765/index.html
```

También funciona abriendo `index.html` directamente con doble clic (no usa módulos ES ni fetch).

## Desplegar cambios

```bash
# 1. bump del version de assets en index.html (invalida la cache de Pages)
#    assets/css/style.css?v=N   assets/js/data.js?v=N   assets/js/app.js?v=N
# 2. commit y push
git add -A && git commit -m "..." && git push origin main
```

GitHub Pages sirve `main` con `cache-control: max-age=600`, así que **hay que subir el `?v=N`**
en cada cambio de CSS o JS; si no, quien ya visited la página seguirá viendo la versión anterior
durante hasta 10 minutos. El HTML se refresca solo en cada push.

Para comprobar que el despliegue ha terminado antes de anunciarlo:

```bash
NEW=$(git rev-parse HEAD)
gh api repos/alejandroid80/programas-electorales-29n/pages -q '.status'          # built
gh api repos/alejandroid80/programas-electorales-29n/pages/builds/latest -q '.commit'  # == $NEW
```

## Qué contiene la página

1. **Fichas de partidos** — una por partido, con las cuatro cifras que mejor resumen su programa
   y sus principales propuestas, con enlace al `.rst` original.
3. **Matriz comparativa** — tabla de 8 temas × los partidos seleccionados, para leer las
   diferencias de un vistazo.
4. **Diferencias por tema** — los mismos ejes, con la posición y la propuesta concreta de cada partido.
5. **Mapa de posiciones** — los 8 ejes con las posiciones posibles y qué partido sostiene cada una.
   Va casi al final, como vista de conjunto de lo anterior.
6. **Método y fuentes** — qué se ha resumido, qué no, y los enlaces al repositorio.

## Notas de método

- Los resúmenes reproducen **propuestas concretas y verificables** de cada programa (cifras, plazos,
  trabas legales). No hay valoraciones ni predicciones.
- La clasificación por eje es una **lectura**, no una cita: agrupa programas que en ese tema
  concreto comparten enfoque.
- Cuando un partido no aborda un tema, la web lo dice explícitamente en lugar de inventar posición.
- Los programas tienen longitudes muy distintas (de 617 a 51.399 palabras), así que el detalle de
  cada uno no es directamente comparable. Por eso se resumen las propuestas y no las páginas.
