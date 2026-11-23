# Programas electorales 29N 2026 — comparativa web

Web estática que compara los 22 programas electorales para las elecciones del 29N de 2026.
Todo el texto de la interfaz va en castellano y `scripts/check-encoding.py` rechaza cualquier
carácter de alfabeto no latino.

## Estructura de la web

Ahora cada sección tiene su propia página dedicada, en lugar de hacer scroll por una sola página.
Esto mejora la navegación y permite compartir enlaces directos a cada parte.

```
programas-electorales-29n/
├── index.html              # Página de entrada: menú y "En un vistazo"
├── fichas.html             # Fichas de los 22 programas electorales
├── matriz.html           # Tabla comparativa 8 ejes × partidos seleccionados
├── temas.html            # Diferencias por tema: posición literal de cada partido
├── voto.html             # Intención de voto: encuestas y estimación CIS
├── mapa.html             # Mapa de posiciones: ocho ejes con partidos colocados
├── metodo.html           # Método y fuentes: de dónde salen los datos
├── comparador.html        # Herramienta para elegir partidos y descargar PNG
├── assets/
│   ├── css/style.css       # Estilos base (tema claro/oscuro, responsive)
│   ├── css/comparador.css  # Estilos propios de comparador.html
│   ├── css/fonts.css       # Las dos tipografías, servidas desde aquí
│   ├── fonts/              # Inter y Newsreader (woff2, SIL OFL 1.1)
│   └── js/
│       ├── data.js         # DATOS: temas, partidos, detalle por tema
│       ├── app.js          # LÓGICA: render, filtros, selección (compartido)
│       ├── resumen.js      # Sección "En un vistazo" (compartido)
│       ├── datos-voto.js   # Cargador único de los datos de encuestas
│       ├── polls.js        # Sección de intención de voto
│       ├── pacto.js       # Pactómetro
│       └── comparador.js  # LÓGICA: selección, tabla y PNG en comparador.html
├── scripts/
│   ├── check-data.js       # control automático de calidad de los datos
│   ├── check-encoding.py   # busca caracteres de otros alfabetos
│   └── update-polls.mjs    # bot que recoge las encuestas
├── .github/workflows/
│   └── update-polls.yml    # el bot, cada día a las 23:00 UTC
└── README.md
```

### Cada página y su contenido

- **index.html**: página de entrada. Muestra el menú superior, el hero ("En un vistazo") con la guía de navegación y el pactómetro. Todas las secciones enlazan desde aquí.
- **fichas.html**: ficha individual por cada partido, con los puntos fuertes, cifra de páginas y palabras, y posición en cada eje.
- **matriz.html**: tabla comparativa de 8 temas × los partidos que tengas activados en la cabecera. Desactivar un partido lo quita de toda la página. Incluye botones Copiar enlace y Copiar tabla.
- **temas.html**: los mismos ocho ejes, ahora con la posición y la propuesta concreta de cada partido. Es la parte que mejor explica las diferencias.
- **voto.html**: intención de voto: promedio de encuestas de los medios, estimación del CIS, efecto casa y fichas de cada sondeo. Enlaza al pactómetro.
- **mapa.html**: los 8 ejes con las posiciones posibles y qué partido sostiene cada uno. Va casi al final, como vista de conjunto.
- **metodo.html**: qué se ha resumido, qué no, y los enlaces al repositorio. Incluye el control de calidad y los originales verificados.
- **comparador.html**: herramienta para elegir partidos y descargar una imagen PNG con la tabla de ocho ejes, lista para compartir en redes. El PNG se dibuja en el navegador: con los mismos datos verificados y sin enviar nada a ningún servidor.

## Flujo recomendado

1. Entra en `index.html` para ver el panorama general y acceder a cada sección.
2. Pulsa **Fichas** para ver el resumen de cada programa.
3. Pulsa **Matriz** para comparar los partidos lado a lado.
4. Pulsa **Diferencias** para ver la posición literal de cada partido en cada tema.
5. Pulsa **Voto** para ver las encuestas y la estimación del CIS.
6. Pulsa **Mapa** para ver la posición global de todos los partidos.
7. Pulsa **Método** para entender de dónde salen los datos y el control de calidad.
8. Pulsa **Tabla para compartir** para elegir partidos y descargar una imagen PNG.

## Control de calidad

```bash
node scripts/check-data.js        # 22 partidos, 8 ejes, 176 posiciones
python3 scripts/check-encoding.py # ningun carácter de alfabeto no latino
```

Conviene ejecutar `check-data.js` antes de cada publicación: durante la revisión de diseño este control
destapó 20 textos corruptos que a simple vista no se veían.

## Desplegar cambios

```bash
# 1. bump del version de assets en cada página HTML (invalida la cache de Pages)
#    assets/css/style.css?v=N   assets/js/data.js?v=N   assets/js/app.js?v=N
#    (también comparador.css y comparador.js si los tocaste)
# 2. commit y push
git add -A && git commit -m "..." && git push origin main
```

GitHub Pages sirve `main` con `cache-control: max-age=600`, así que **hay que subir el `?v=N`**
en cada cambio de CSS o JS; si no, quien ya visited la página seguirá viendo la versión anterior
durante hasta 10 minutos. El HTML se refresca solo en cada push.

Para comprobar que el despliegue ha terminado antes de anunciarlo:

```bash
NEW=$(git rev-parse HEAD)
gh api repos/alejandro80/programas-electorales-29n/pages -q '.status'          # built
gh api repos/alejandro80/programas-electorales-29n/pages/builds/latest -q '.commit'  # == $NEW
```

## Qué contiene cada sección

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

### Tabla para compartir

`comparador.html` es una página aparte que reutiliza `data.js`. Permite elegir cualquier
número de partidos, ver los ocho ejes en una tabla y descargar una imagen PNG (1200 px de ancho
como mínimo, más ancha cuantos más partidos) dibujada en el navegador con `canvas`. No hay
servidor ni dependencias: el botón «Copiar imagen» usa la API de portapapeles cuando el navegador
lo permite, y «Copiar tabla» entrega el mismo contenido en texto con tabuladores.

La selección viaja en la URL (`comparador.html?sel=psoe,pp,frente_amplio,vox`), así que el enlace
comparte exactamente la misma tabla. Por defecto aparecen esos cuatro partidos. La imagen siempre
se dibuja con la paleta clara, también con el tema oscuro activado, para que se lea bien en redes.