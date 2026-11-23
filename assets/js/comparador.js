/* ===================================================================
   Tabla para compartir — comparador.html

   Los datos vienen de data.js (THEMES y PARTIES). Este fichero solo
   selecciona partidos, pinta la tabla y dibuja un PNG en el navegador.
   No hay peticiones de red ni datos escritos a mano.
   =================================================================== */
(function () {
  'use strict';

  var POR_DEFECTO = ['psoe', 'pp', 'frente_amplio', 'vox'];
  var CLAVE_SEL = 'pe29n-selected';
  var SITIO = 'alejandroid80.github.io/programas-electorales-29n/';

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var byId = function (id) {
    for (var i = 0; i < PARTIES.length; i++) if (PARTIES[i].id === id) return PARTIES[i];
    return null;
  };

  var selected = [];
  var cacheImagen = null;

  /* ------------------------------------------------------------ estado */

  /* La seleccion es la misma que en el resto de paginas. El parametro ?sel=
     sigue mandando (es un enlace para compartir) y se guarda; si no viene,
     se recupera lo que el visitante eligio en otra pagina. */
  function leerGuardado() {
    try {
      var raw = localStorage.getItem(CLAVE_SEL);
      if (!raw) return null;
      var ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids : null;
    } catch (e) {
      return null;
    }
  }

  function guardarSeleccion() {
    try { localStorage.setItem(CLAVE_SEL, JSON.stringify(selected)); } catch (e) {}
  }

  function inicializar() {
    var q = new URLSearchParams(location.search);
    var ids = q.has('sel') ? q.get('sel').split(',').filter(Boolean)
                           : (leerGuardado() || POR_DEFECTO);
    var vistos = {};
    selected = ids.filter(function (id) {
      if (!byId(id) || vistos[id]) return false;
      vistos[id] = true;
      return true;
    });
    guardarSeleccion();
    $('#cmpYear').textContent = new Date().getFullYear();
    initTema();
    pintarChips();
    pintarTabla();
  }

  function mismoQue(lista) {
    return selected.length === lista.length && lista.every(function (id, i) {
      return selected[i] === id;
    });
  }

  function sincronizar() {
    var q = new URLSearchParams();
    if (selected.length) q.set('sel', selected.join(','));
    var s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    guardarSeleccion();
    actualizarPresets();
  }

  function alternar(id) {
    var i = selected.indexOf(id);
    if (i === -1) selected.push(id); else selected.splice(i, 1);
    sincronizar();
    pintarChips();
    pintarTabla();
    cerrarMenu();
    decir('');
  }

  function fijar(ids) {
    selected = ids.filter(byId);
    sincronizar();
    pintarChips();
    pintarTabla();
    cerrarMenu();
    decir('');
  }

  function decir(texto) { $('#cmpEstado').textContent = texto; }

  /* ------------------------------------------------------------- tema */

  function initTema() {
    var guardado = null;
    try { guardado = localStorage.getItem('pe29n-theme'); } catch (e) {}
    aplicarTema(guardado === 'dark' ? 'dark' : 'light');
    $('#temaBtn').addEventListener('click', function () {
      aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    var b = $('#temaBtn');
    b.setAttribute('aria-pressed', String(tema === 'dark'));
    b.setAttribute('aria-label', tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    try { localStorage.setItem('pe29n-theme', tema); } catch (e) {}
  }

  /* ----------------------------------------------------------- selectores */

  function pintarChips() {
    $('#cmpChips').innerHTML = PARTIES.map(function (p) {
      var on = selected.indexOf(p.id) !== -1;
      return '<button type="button" class="chip" data-party="' + esc(p.id) + '"' +
        ' aria-pressed="' + on + '" style="--party:' + esc(p.color) + '">' +
        '<span class="dot" aria-hidden="true"></span>' + esc(p.short) + '</button>';
    }).join('');
    $('#cmpCuenta').textContent = selected.length + ' de ' + PARTIES.length + ' partidos elegidos';
    actualizarPresets();
  }

  function actualizarPresets() {
    var todos = PARTIES.map(function (p) { return p.id; });
    $('#cmpCuatro').setAttribute('aria-pressed', String(mismoQue(POR_DEFECTO)));
    $('#cmpTodos').setAttribute('aria-pressed', String(mismoQue(todos)));
    $('#cmpNinguno').setAttribute('aria-pressed', String(selected.length === 0));
  }

  /* -------------------------------------------------------------- tabla */

  function elegidos() {
    return selected.map(byId).filter(Boolean);
  }

  function posicion(p, eje) {
    var clave = p.axes[eje.id];
    var obj = eje.positions[clave];
    return obj ? (obj.short || obj.label) : '—';
  }

  function pintarTabla() {
    var ps = elegidos();
    $('#cmpVacio').classList.toggle('hidden', ps.length > 0);
    $('.cmp-tabla-wrap').classList.toggle('hidden', ps.length === 0);
    $('#cmpHead').innerHTML = '<th scope="col">Eje</th>' + ps.map(function (p) {
      return '<th scope="col" style="--party:' + esc(p.color) + '">' +
        '<span class="cmp-party-head"><span class="dot" aria-hidden="true"></span>' +
        esc(p.short) + '</span></th>';
    }).join('');
    $('#cmpBody').innerHTML = THEMES.map(function (eje) {
      var celdas = ps.map(function (p) {
        return '<td style="--party:' + esc(p.color) + '"><span class="cmp-pos">' +
          '<span class="dot" aria-hidden="true"></span>' + esc(posicion(p, eje)) + '</span></td>';
      }).join('');
      return '<tr><th scope="row">' + esc(eje.name) + '</th>' + celdas + '</tr>';
    }).join('');
    // La imagen se prepara en segundo plano para que el boton de compartir
    // pueda usarla en el mismo gesto del usuario (lo exige Web Share API).
    prepararCache(ps).catch(function () {});
  }

  /* --------------------------------------------------------------- PNG */

  var SERIF = '"Newsreader", Georgia, serif';
  var SANS = '"Inter", system-ui, sans-serif';
  var INK = '#191b1e';
  var INK2 = '#4a4f56';
  var INK3 = '#646a72';
  var FONDO = '#faf7f2';
  var SUAVE = '#f2ede4';
  var CEBRA = '#f7f4ee';
  var LINEA = '#e2dbd0';
  var ACENTO = '#a41f33';
  var BLANCO = '#fffdf9';
  var ALTO = 630;
  var MARGEN = 48;
  var ETIQUETA = 290;
  var INICIO_TABLA = 140;
  var ALTO_CAB = 46;
  var ALTO_FILA = 48;

  function rgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [164, 31, 51];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mezclar(hex, otro, cantidad) {
    var a = rgb(hex), b = rgb(otro);
    return 'rgb(' + a.map(function (v, i) {
      return Math.round(v * (1 - cantidad) + b[i] * cantidad);
    }).join(',') + ')';
  }

  function recortar(ctx, texto, max) {
    var t = String(texto == null ? '' : texto);
    if (ctx.measureText(t).width <= max) return t;
    while (t.length && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function redondeado(ctx, x, y, w, h, r) {
    var radio = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radio, y);
    ctx.arcTo(x + w, y, x + w, y + h, radio);
    ctx.arcTo(x + w, y + h, x, y + h, radio);
    ctx.arcTo(x, y + h, x, y, radio);
    ctx.arcTo(x, y, x + w, y, radio);
    ctx.closePath();
  }

  function fuente(ctx, tam, peso, familia) {
    ctx.font = peso + ' ' + tam + 'px ' + familia;
  }

  function medidas(n) {
    var base = n <= 5 ? 150 : (n <= 9 ? 120 : 92);
    var minimo = Math.ceil((1200 - (MARGEN * 2 + ETIQUETA)) / n);
    var col = Math.max(base, minimo);
    return { col: col, ancho: MARGEN * 2 + ETIQUETA + n * col };
  }

  function dibujar(ps) {
    var m = medidas(ps.length);
    var canvas = document.createElement('canvas');
    canvas.width = m.ancho;
    canvas.height = ALTO;
    var ctx = canvas.getContext('2d');
    var xTabla = MARGEN + ETIQUETA;
    var fin = MARGEN + ETIQUETA + ps.length * m.col;

    ctx.fillStyle = FONDO;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Cabecera de marca */
    fuente(ctx, 22, 700, SANS);
    ctx.fillStyle = ACENTO;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText('29N · 2026', MARGEN, 52);
    fuente(ctx, 15, 600, SANS);
    ctx.fillStyle = INK3;
    ctx.textAlign = 'right';
    ctx.fillText('OCHO EJES, LADO A LADO', fin, 52);
    ctx.fillStyle = LINEA;
    ctx.fillRect(MARGEN, 66, fin - MARGEN, 1);

    fuente(ctx, 38, 600, SERIF);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText('Los ocho ejes, lado a lado', MARGEN, 112);
    fuente(ctx, 16, 400, SANS);
    ctx.fillStyle = INK2;
    var nombres = ps.map(function (p) { return p.short; }).join(' · ');
    ctx.fillText(recortar(ctx, nombres, fin - MARGEN), MARGEN, 132);

    /* Cabecera de la tabla */
    ctx.fillStyle = ACENTO;
    ctx.fillRect(MARGEN, INICIO_TABLA, fin - MARGEN, 4);
    ctx.fillStyle = SUAVE;
    ctx.fillRect(MARGEN, INICIO_TABLA + 4, fin - MARGEN, ALTO_CAB - 4);
    fuente(ctx, 13, 700, SANS);
    ctx.fillStyle = INK3;
    ctx.textAlign = 'left';
    ctx.fillText('EJE', MARGEN + 14, INICIO_TABLA + 31);

    ps.forEach(function (p, i) {
      var x = xTabla + i * m.col;
      var w = m.col - 12;
      ctx.fillStyle = p.color;
      redondeado(ctx, x + 6, INICIO_TABLA + 10, w, ALTO_CAB - 18, 7);
      ctx.fill();
      fuente(ctx, m.col < 110 ? 14 : 17, 700, SANS);
      ctx.fillStyle = p.badgeFg || '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(recortar(ctx, p.abbr || p.short, w - 12), x + 6 + w / 2, INICIO_TABLA + 32);
    });

    /* Filas */
    THEMES.forEach(function (eje, fila) {
      var y = INICIO_TABLA + ALTO_CAB + fila * ALTO_FILA;
      ctx.fillStyle = fila % 2 ? CEBRA : BLANCO;
      ctx.fillRect(MARGEN, y, fin - MARGEN, ALTO_FILA);
      ctx.fillStyle = LINEA;
      ctx.fillRect(MARGEN, y + ALTO_FILA - 1, fin - MARGEN, 1);

      fuente(ctx, m.col < 110 ? 15 : 17, 600, SANS);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText(recortar(ctx, eje.name, ETIQUETA - 24), MARGEN + 14, y + 31);

      ps.forEach(function (p, i) {
        var x = xTabla + i * m.col;
        var txt = posicion(p, eje);
        var compacta = m.col < 112;
        ctx.fillStyle = mezclar(p.color, BLANCO, 0.9);
        redondeado(ctx, x + 6, y + 9, m.col - 12, ALTO_FILA - 18, 8);
        ctx.fill();
        fuente(ctx, compacta ? 13 : 15, 600, SANS);
        ctx.fillStyle = INK;
        if (compacta) {
          ctx.textAlign = 'center';
          ctx.fillText(recortar(ctx, txt, m.col - 20), x + m.col / 2, y + 30);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x + 20, y + 24, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = INK;
          ctx.textAlign = 'left';
          ctx.fillText(recortar(ctx, txt, m.col - 44), x + 32, y + 30);
        }
      });
    });

    /* Pie */
    var pieY = INICIO_TABLA + ALTO_CAB + THEMES.length * ALTO_FILA;
    ctx.fillStyle = LINEA;
    ctx.fillRect(MARGEN, pieY + 8, fin - MARGEN, 1);
    fuente(ctx, 14, 400, SANS);
    ctx.fillStyle = INK3;
    ctx.textAlign = 'left';
    ctx.fillText('Programas electorales del 29N de 2026 · ocho ejes', MARGEN, pieY + 34);
    ctx.textAlign = 'right';
    ctx.fillText(SITIO, fin, pieY + 34);
    ctx.fillStyle = ACENTO;
    ctx.fillRect(0, ALTO - 6, canvas.width, 6);

    return canvas;
  }

  function nombreArchivo(ps) {
    var n = ps.map(function (p) {
      return p.short.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }).join('-');
    return '29n-ejes-' + (n || 'comparativa').slice(0, 90) + '.png';
  }

  function prepararLienzo(ps) {
    return new Promise(function (resolver, rechazar) {
      if (!document.fonts || !document.fonts.load) { resolver(dibujar(ps)); return; }
      Promise.all([
        document.fonts.load('600 38px "Newsreader"'),
        document.fonts.load('700 17px "Inter"')
      ]).then(function () {
        resolver(dibujar(ps));
      }).catch(function () {
        resolver(dibujar(ps));
      });
    });
  }

  function aBlob(canvas) {
    return new Promise(function (resolver, rechazar) {
      canvas.toBlob(function (blob) {
        if (blob) resolver(blob); else rechazar(new Error('No se pudo crear la imagen'));
      }, 'image/png');
    });
  }

  function descargar(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function (resolver, rechazar) {
      var t = document.createElement('textarea');
      t.value = texto;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      var ok = document.execCommand('copy');
      t.remove();
      if (ok) resolver(); else rechazar(new Error('No se pudo copiar'));
    });
  }

  function tablaComoTexto(ps) {
    var lineas = ['Comparativa 29N de 2026 — ocho ejes'];
    lineas.push(['Eje'].concat(ps.map(function (p) { return p.short; })).join('\t'));
    THEMES.forEach(function (eje) {
      lineas.push([eje.name].concat(ps.map(function (p) { return posicion(p, eje); })).join('\t'));
    });
    lineas.push('Fuente: programas electorales del 29N de 2026');
    return lineas.join('\n');
  }

  /* ----------------------------------------------------------- compartir */

  function claveDe(ps) {
    return ps.map(function (p) { return p.id; }).join(',');
  }

  function prepararCache(ps) {
    if (!ps.length) return Promise.resolve(null);
    var clave = claveDe(ps);
    if (cacheImagen && cacheImagen.clave === clave) return Promise.resolve(cacheImagen);
    return prepararLienzo(ps).then(aBlob).then(function (blob) {
      cacheImagen = { clave: clave, blob: blob, nombre: nombreArchivo(ps) };
      return cacheImagen;
    });
  }

  function textoCompartir(ps) {
    var nombres = ps.map(function (p) { return p.short; }).join(', ');
    var texto = 'Comparativa 29N: ' + nombres + ' en ocho ejes';
    return texto.length > 170 ? 'Comparativa 29N de 2026: ocho ejes, lado a lado' : texto;
  }

  function enlacesCompartir(ps) {
    var url = location.href;
    var titulo = textoCompartir(ps);
    var completo = titulo + '. ' + url;
    return [
      { nombre: 'Instagram (bajar PNG)', color: '#c13584', accion: 'descargar' },
      { nombre: 'Bluesky', color: '#0285ff', href: 'https://bsky.app/intent/compose?text=' + encodeURIComponent(completo) },
      { nombre: 'X (Twitter)', color: '#111111', href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(titulo) + '&url=' + encodeURIComponent(url) },
      { nombre: 'WhatsApp', color: '#25d366', href: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(completo) },
      { nombre: 'Telegram', color: '#229ed9', href: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(titulo) },
      { nombre: 'Facebook', color: '#1877f2', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) },
      { nombre: 'LinkedIn', color: '#0a66c2', href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) },
      { nombre: 'Correo', color: ACENTO, href: 'mailto:?subject=' + encodeURIComponent(titulo) + '&body=' + encodeURIComponent(completo) }
    ];
  }

  function abrirMenu(ps) {
    $('#cmpMenuOpciones').innerHTML = enlacesCompartir(ps).map(function (o) {
      var antes = '<span class="dot" aria-hidden="true" style="background:' + o.color + '"></span>' + esc(o.nombre);
      if (o.accion === 'descargar') {
        return '<button type="button" data-accion="descargar">' + antes + '</button>';
      }
      return '<a href="' + esc(o.href) + '" target="_blank" rel="noopener noreferrer">' +
        antes + '</a>';
    }).join('');
    $('#cmpMenuCompartir').hidden = false;
    $('#cmpCompartir').setAttribute('aria-expanded', 'true');
    decir('');
  }

  function cerrarMenu() {
    $('#cmpMenuCompartir').hidden = true;
    $('#cmpCompartir').setAttribute('aria-expanded', 'false');
  }

  function compartir(ps) {
    var basico = {
      title: 'Comparativa 29N de 2026',
      text: textoCompartir(ps),
      url: location.href
    };
    if (!navigator.share) { abrirMenu(ps); return; }

    // La imagen ya esta preparada en segundo plano, asi que se puede pasar
    // al compartir dentro del mismo gesto del usuario.
    var opciones = basico;
    if (cacheImagen && cacheImagen.clave === claveDe(ps)) {
      var archivo = new File([cacheImagen.blob], cacheImagen.nombre, { type: 'image/png' });
      var conImagen = { files: [archivo], title: basico.title, text: basico.text, url: basico.url };
      if (!navigator.canShare || navigator.canShare(conImagen)) opciones = conImagen;
    }
    var promesa;
    try { promesa = navigator.share(opciones); }
    catch (e) { promesa = Promise.reject(e); }
    promesa.then(function () {
      decir('Contenido enviado a la app de compartir.');
      cerrarMenu();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      if (opciones !== basico) {
        navigator.share(basico).catch(function () { abrirMenu(ps); });
      } else {
        abrirMenu(ps);
      }
    });
  }

  /* ------------------------------------------------------------ eventos */

  function conPartidos(fn) {
    var ps = elegidos();
    if (!ps.length) {
      decir('Elige al menos un partido para seguir.');
      return;
    }
    decir('');
    return fn(ps);
  }

  function instalarEventos() {
    $('#cmpChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-party]');
      if (b) alternar(b.getAttribute('data-party'));
    });
    $('#cmpCuatro').addEventListener('click', function () { fijar(POR_DEFECTO); });
    $('#cmpTodos').addEventListener('click', function () { fijar(PARTIES.map(function (p) { return p.id; })); });
    $('#cmpNinguno').addEventListener('click', function () { fijar([]); });

    $('#cmpDescargar').addEventListener('click', function () {
      conPartidos(function (ps) {
        decir('Dibujando la imagen…');
        prepararLienzo(ps).then(aBlob).then(function (blob) {
          descargar(blob, nombreArchivo(ps));
          decir('Imagen descargada: ' + nombreArchivo(ps));
        }).catch(function () { decir('No se pudo descargar la imagen. Prueba otra vez.'); });
      });
    });

    $('#cmpCompartir').addEventListener('click', function () {
      conPartidos(function (ps) {
        if (!$('#cmpMenuCompartir').hidden) { cerrarMenu(); return; }
        compartir(ps);
      });
    });
    $('#cmpMenuCompartir').addEventListener('click', function (e) {
      if (!e.target.closest('[data-accion="descargar"]')) return;
      var ps = elegidos();
      if (!ps.length) return;
      prepararCache(ps).then(function (c) {
        descargar(c.blob, c.nombre);
        decir('Imagen descargada para Instagram: ' + c.nombre);
      }).catch(function () { decir('No se pudo descargar la imagen. Prueba otra vez.'); });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#cmpCompartir, #cmpMenuCompartir')) cerrarMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });

    $('#cmpCopiarImagen').addEventListener('click', function () {
      conPartidos(function (ps) {
        if (!navigator.clipboard || !window.ClipboardItem) {
          decir('Tu navegador no permite copiar imágenes. Usa Descargar PNG.');
          return;
        }
        decir('Dibujando la imagen…');
        prepararLienzo(ps).then(aBlob).then(function (blob) {
          return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        }).then(function () {
          decir('Imagen copiada. Ya puedes pegarla donde quieras.');
        }).catch(function () {
          decir('No se pudo copiar la imagen. Usa Descargar PNG.');
        });
      });
    });

    $('#cmpCopiarTabla').addEventListener('click', function () {
      conPartidos(function (ps) {
        copiarTexto(tablaComoTexto(ps)).then(function () {
          decir('Tabla copiada como texto.');
        }).catch(function () { decir('No se pudo copiar la tabla.'); });
      });
    });

    $('#cmpCopiarEnlace').addEventListener('click', function () {
      copiarTexto(location.href).then(function () {
        decir('Enlace copiado: quien lo abra verá estos mismos partidos.');
      }).catch(function () { decir('No se pudo copiar el enlace.'); });
    });
  }

  inicializar();
  instalarEventos();
})();
