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

## La selección global de partidos

Justo antes de "En un vistazo" hay una botonera que decide **qué partidos aparecen en toda
la página**. La selección es una sola y gobierna todas las vistas a la vez:

| Vista | Qué hace la selección |
|---|---|
| Fichas | Solo se muestran las fichas de los partidos activos |
| En un vistazo | La lista de los 22 y los grupos de los 8 ejes se filtran |
| Matriz comparativa | Las columnas son los partidos activos |
| Diferencias por tema | Las tarjetas de cada tema son solo de los activos |
| Mapa de posiciones | Los puntos de la escala son solo de los activos |
| Pactómetro | Las fichas encendidas son las de los partidos activos |

Al pulsar un partido **en cualquier sitio** (ficha, punto del mapa, chip del pactómetro) se
altera la selección global y la página entera se redibuja.

- La selección vive en la URL (`?sel=pp,psoe,…`), así que se puede compartir y sobrevive
  a la recarga.
- Por defecto están los 22 partidos. "Activar todos" y "Desactivar todos" los encienden y
  apagan de golpe.
- `window.SELECCION` es la API compartida entre secciones: `isOn(id)`, `toggle(id)`,
  `set(id, on)` y `subscribe(fn)`. Quien añada una sección nueva solo tiene que suscribirse.

## Pactómetro

Una herramienta interactiva dentro de la sección de intención de voto: se marcan los partidos
que se pusieran de acuerdo y la pagina calcula que pasando habría.

- **Por defecto** se prueban los dos partidos con más accentuación, que es la combinación que
  más se discute. La coalición la elige quien la prueba: la selección global de la página no
  la impone, porque con los 22 partidos activos se abriría con todos los del CIS encendidos y
  un veredicto de mayoría absoluta que nadie ha pedido. Lo que sí hace la selección global
  es quitar: un partido apagado en la página no puede formar parte de la coalición.
- **Al marcar un chip** se enciende también en toda la página; al desmarcarlo, se apaga.
  Los tres partidos que solo estima el CIS (Junts, UPC y Ara Més) no tienen ficha propia y
  se activan solo aquí.
- **"Desactivar todos"** vacía también el pactómetro, y "Activar todos" lo devuelve a la
  coalición de por defecto.

- **Fuente**: la encuesta **preelectoral del CIS** (estudio 3584), la unica que reparte
  escanos por partido. Su PDF se lee con `pdftotext -layout` (`poppler-utils`) y se
  parsea con `scripts/parse-cis-pdf.js`.
- **Descubrimiento**: el bot no fija el número de estudio, lo busca sondeando una ventana de
  códigos alrededor del último barómetro conocido (con pausas para no castigar al CIS) y se
  queda con el PDF que sea preelectoral y traiga repartos de escanos.
- **Cálculo**: suma de los **puntos medios** de las horquillas de escaños, contra los 176
  necesarios para la mayoría absoluta de 350. El CIS dice de su propia estimación que las
  horquillas **no se suman** (son percentiles de su modelo, no intervalos de confianza), así que
  la web lo dice en un aviso: se suman los puntos medios y el rango se enseña solo como
  referencia.
- **Mayoría simple**: cuando el bloque no llega a 176 pero es el más numeroso, la web lo indica
  y nombra al rival más fuerte.

## Intención de voto (bot)

```bash
node scripts/update-polls.mjs
```

Recoge tres fuentes públicas y las normaliza en `data/voting-intention.json`, que la web
lee de forma estática:

| Fuente | Qué aporta | Cómo se accede |
|---|---|---|
| **Onda Cero** | El agregado de las encuestas de los principales medios (122 en el momento de escribir esto), con el promedio mensual y el efecto casa de cada ADP | JSON incrustado en su página de explorador |
| **CIS** | La estimación de voto oficial de los barómetros mensuales, 64 estudios desde 2021 | Serie abierta en CSV (CC BY 4.0) |
| **Electomanía** | La ficha de cada encuesta con su reparto de escaños, encuestadora y licencia | API pública de WordPress, con JSON-LD `schema.org/Dataset` (CC BY 4.0) |

El bot **nunca inventa datos**: si una fuente falla, conserva el dato anterior de esa fuente
y anota el error en `errores`, que la web muestra como aviso. Los huecos se muestran como «—».

El workflow `.github/workflows/update-polls.yml` lo ejecuta cada día a las **23:00 UTC**
(la hora más cercana a medianoche en Madrid todo el año) y también se puede lanzar a mano.
Solo hace commit si el fichero ha cambiado.

### Verificar los datos

`scripts/check-data.js` comprueba los datos de los programas. Para los datos de las
encuestas, `update-polls.mjs` valida que cada fuente traiga lo mínimo esperado (partidos,
meses, encuestas) y avisa si alguna falla.

## El contador de visitas

El total que ve el lector es **la base histórica + el valor en vivo del servicio**:

- `data/visit-counter.json` guarda la base. **Vive en el repositorio y no la regenera nadie**:
  el bot solo escribe `data/voting-intention.json`. Es lo que impide que una publicación
  (o un reinicio manual) deje el contador a cero.
- El valor en vivo lo da CountAPI, que solo almacena un número: ni IP, ni cookies, ni perfiles.
- Se cuenta **una visita cada 12 horas por navegador**, así que recargar no infla el número.

**Si alguna vez hay que reiniciar el servicio**, el valor antiguo se suma a la base *antes* de
reiniciarlo, y el total sigue intacto:

```bash
curl -s "https://countapi.mileshilliard.com/api/v1/get/pe29n-alejandroid80"   # valor actual
# sumar ese valor a "base" en data/visit-counter.json
curl -s "https://countapi.mileshilliard.com/api/v1/set/pe29n-alejandroid80?value=0"
```

`scripts/check-data.js` comprueba que la base sea un entero válido y que el bot no toque ese
fichero.

## Estructura

```
programas-electorales-29n/
├── index.html              # estructura de la página
├── assets/
│   ├── css/style.css       # estilos (tema claro/oscuro, responsive)
│   └── js/
│       ├── data.js         # DATOS: temas, partidos, detalle por tema
│       ├── app.js          # LÓGICA: render, filtros, comparador
│       ├── resumen.js      # Sección "En un vistazo"
│       ├── datos-voto.js   # Cargador único de los datos de encuestas
│       ├── polls.js        # Sección de intención de voto
│       └── pacto.js       # Pactómetro
├── data/
│   ├── voting-intention.json   # datos de las encuestas (los genera el bot)
│   └── visit-counter.json      # base historica del contador (nadie la regenera)
├── scripts/
│   ├── check-data.js       # control automático de calidad de los datos
│   └── update-polls.mjs    # bot que recoge las encuestas
├── .github/workflows/
│   └── update-polls.yml    # el bot, cada día a las 23:00 UTC
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

1. **En un vistazo** — lo esencial antes del detalle: la guía de los seis destinos, los 22
   partidos en una línea, los 8 ejes con los partidos agrupados por posición, y el pactómetro.
2. **Fichas de partidos** — una por partido, con las cuatro cifras que mejor resumen su programa
   y sus principales propuestas, con enlace al `.rst` original.
3. **Matriz comparativa** — tabla de 8 temas × los partidos seleccionados, para leer las
   diferencias de un vistazo.
4. **Diferencias por tema** — los mismos ejes, con la posición y la propuesta concreta de cada partido.
5. **Intención de voto** — el promedio de las encuestas de los medios, la estimación del CIS,
   el efecto casa y las fichas de cada sondeo. Enlaza al pactómetro, que está al principio.
6. **Mapa de posiciones** — los 8 ejes con las posiciones posibles y qué partido sostiene cada una.
   Va casi al final, como vista de conjunto de lo anterior.
7. **Método y fuentes** — qué se ha resumido, qué no, y los enlaces al repositorio.

## Notas de método

- Los resúmenes reproducen **propuestas concretas y verificables** de cada programa (cifras, plazos,
  trabas legales). No hay valoraciones ni predicciones.
- La clasificación por eje es una **lectura**, no una cita: agrupa programas que en ese tema
  concreto comparten enfoque.
- Cuando un partido no aborda un tema, la web lo dice explícitamente en lugar de inventar posición.
- Los programas tienen longitudes muy distintas (de 617 a 51.399 palabras), así que el detalle de
  cada uno no es directamente comparable. Por eso se resumen las propuestas y no las páginas.
