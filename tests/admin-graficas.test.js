'use strict';

// Gráficas propias del panel (SVG y HTML, sin librerías): escala del eje, series, anillo, barras, mapa de calor, embudo
// y reglas de diseño (sin degradados, sin CDN, texto accesible, colores sólidos en día y noche).
// Ejecutar: node --test tests/admin-graficas.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const G = require(path.join(RAIZ, 'assets', 'js', 'admin-graficas.js'));

const etiquetas = n => Array.from({ length: n }, (_, i) => 'd' + (i + 1));
const valores = n => Array.from({ length: n }, (_, i) => (i * 7) % 5);

test('escalaY: tope redondo, marcas enteras para cuentas de personas y decimales cuando se piden', () => {
  assert.deepEqual(G.escalaY(9).ticks, [0, 5, 10]);
  assert.deepEqual(G.escalaY(13).ticks, [0, 5, 10, 15]);
  assert.deepEqual(G.escalaY(99).ticks, [0, 25, 50, 75, 100]);
  assert.deepEqual(G.escalaY(1).ticks, [0, 1]);
  assert.deepEqual(G.escalaY(0).ticks, [0, 1]);
  assert.ok(G.escalaY(8989).max >= 8989);
  for (const m of [1, 2, 3, 5, 9, 13, 41, 99, 101, 250, 8989]) assert.ok(G.escalaY(m).ticks.every(Number.isInteger), 'enteras para ' + m);
  const dec = G.escalaY(0.7, { entero: false });
  assert.ok(dec.max >= 0.7 && dec.ticks.length >= 3);
});

test('formatos y abreviaturas del eje', () => {
  assert.equal(G.formatear(1234, 'num'), (1234).toLocaleString('es-MX'));
  assert.equal(G.formatear(1234, 'mxn'), '$' + (1234).toLocaleString('es-MX'));
  assert.equal(G.formatear(41.6, 'pct'), '42 %');
  assert.equal(G.formatear('x', 'num'), '—');
  assert.equal(G.abreviar(10000, 'mxn'), '$10 mil');
  assert.equal(G.abreviar(2500000, 'num'), (2.5).toLocaleString('es-MX') + ' M');
  assert.equal(G.abreviar(7, 'num'), '7');
});

test('etiquetas del eje horizontal: todas si son pocas; si no, unas 6 con la primera y la última', () => {
  assert.deepEqual(G.indicesEtiquetas(6), [0, 1, 2, 3, 4, 5]);
  const l30 = G.indicesEtiquetas(30);
  assert.ok(l30.length <= 7 && l30[0] === 0 && l30[l30.length - 1] === 29);
  const l90 = G.indicesEtiquetas(90);
  assert.ok(l90.length <= 7 && l90[l90.length - 1] === 89);
  assert.deepEqual(G.indicesEtiquetas(0), []);
});

test('serie de barras: eje con rótulos, descripción, tabla alternativa oculta y datos para el tooltip', () => {
  const h = G.serie({ titulo: 'Cuentas nuevas', tipo: 'barras', unidad: 'cuentas nuevas', etiquetas: etiquetas(30), series: [{ nombre: 'Cuentas nuevas', valores: valores(30), color: 1 }] });
  assert.match(h, /<figure class="zg zg--barras/);
  assert.equal((h.match(/class="zg__bar zg-c1"/g) || []).length, 30);
  assert.match(h, /class="zg__y" aria-hidden="true"><span/);
  assert.match(h, /<div class="zg__plot" tabindex="0" role="img" aria-label="Cuentas nuevas\. /);
  assert.match(h, /<div class="sr-only"><table><caption>Cuentas nuevas<\/caption>/);
  assert.equal((h.match(/<tr><th scope="row">/g) || []).length, 30);
  assert.match(h, /data-zg="/);
  assert.match(h, /<figcaption class="zg__pie"><span><strong>/);
  assert.doesNotMatch(h, /gradient|<script|<text|<foreignObject|<image/i);
});

test('serie de línea y área: SVG solo con formas, relleno de baja opacidad en CSS, periodo anterior punteado y leyenda con varias series', () => {
  const h = G.serie({
    titulo: 'Actividad', tipo: 'area', etiquetas: etiquetas(10),
    series: [{ nombre: 'Cuentas', valores: valores(10), color: 1 }, { nombre: 'Periodo anterior', valores: valores(10), color: 8, punteada: true }]
  });
  assert.match(h, /<svg class="zg__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"/);
  assert.match(h, /class="zg__area zg-c1"/);
  assert.match(h, /zg__trazo--punteada zg-c8/);
  assert.match(h, /<ul class="zg__leyenda">/);
  assert.match(h, /zg__sw--punteada/);
  assert.doesNotMatch(h, /<text|gradient/i);
  // con pocos puntos se marcan siempre
  assert.ok((h.match(/class="zg__punto zg-c1"/g) || []).length === 10);
  // una sola serie no lleva leyenda
  assert.doesNotMatch(G.serie({ titulo: 'x', etiquetas: etiquetas(3), series: [{ nombre: 'A', valores: [1, 2, 3] }] }), /zg__leyenda/);
});

test('serie: sin datos (todo en cero o vacía) da un estado vacío amable, no una gráfica plana', () => {
  const v = G.serie({ titulo: 'x', etiquetas: etiquetas(5), series: [{ nombre: 'A', valores: [0, 0, 0, 0, 0] }], vacio: { titulo: 'Sin altas', texto: 'Cuando haya aparecerán aquí.' } });
  assert.match(v, /zg-vacio/);
  assert.match(v, /Sin altas/);
  assert.doesNotMatch(v, /zg__plot/);
  assert.match(G.serie({}), /zg-vacio/);
  assert.match(G.serie({ etiquetas: [], series: [] }), /Todavía no hay datos/);
});

test('serie: todo texto que llega de los datos se escapa', () => {
  const h = G.serie({ titulo: '<img onerror=1>', etiquetas: ['<b>a</b>', 'b'], titulos: ['"><script>x</script>', 'b'], series: [{ nombre: '<i>n</i>', valores: [3, 1] }] });
  assert.doesNotMatch(h, /<img|<script|<b>a|<i>n/);
  assert.match(h, /&lt;/);
});

test('serie: valores raros (negativos, texto, NaN) no rompen nada', () => {
  assert.doesNotThrow(() => G.serie({ titulo: 'x', etiquetas: ['a', 'b', 'c'], series: [{ nombre: 'A', valores: [-4, 'x', NaN] }] }));
  assert.doesNotThrow(() => G.serie({ titulo: 'x', etiquetas: ['a', 'b', 'c'], series: [{ nombre: 'A', valores: [5, 1] }], tipo: 'lineas' }));
});

test('anillo: segmentos con color, leyenda con valor y porcentaje, centro con el total, descripción y tabla alternativa', () => {
  const h = G.anillo({ titulo: 'Estado', partes: [{ etiqueta: 'Activos', valor: 3, color: 1 }, { etiqueta: 'Vencidos', valor: 1, color: 8 }, { etiqueta: 'Nadie', valor: 0, color: 4 }] });
  assert.equal((h.match(/class="zg-anillo__seg zg-c/g) || []).length, 2, 'las partes en cero no se dibujan');
  assert.match(h, /75 %/);
  assert.match(h, /<div class="zg-anillo__centro"[^>]*><strong>4<\/strong>/);
  assert.match(h, /role="img" aria-label="Estado: Activos 3 \(75 %\)/);
  assert.match(h, /<li tabindex="0" data-i="0">/);
  assert.match(h, /<div class="sr-only"><table>/);
  assert.match(G.anillo({ partes: [{ etiqueta: 'a', valor: 0 }] }), /zg-vacio/);
  assert.doesNotMatch(h, /gradient/i);
});

test('barras horizontales: ancho proporcional, valor visible, porcentaje opcional, vacío amable', () => {
  const h = G.barrasH({ titulo: 'Cursos', filas: [{ etiqueta: 'Fototrampeo <x>', valor: 8 }, { etiqueta: 'Mariposarios', valor: 4, nota: 'nota' }], color: 2 });
  assert.match(h, /width:100%/);
  assert.match(h, /width:50%/);
  assert.match(h, /Fototrampeo &lt;x&gt;/);
  assert.match(h, /zg-c2/);
  assert.match(h, /67 %/);
  assert.doesNotMatch(G.barrasH({ filas: [{ etiqueta: 'a', valor: 2 }], porcentaje: false }), /zg-bh__pct/);
  assert.match(G.barrasH({ filas: [] }), /zg-vacio/);
});

test('mapa de calor: niveles por intensidad, etiquetas de hora cada 3 y descripción del momento más fuerte', () => {
  assert.equal(G.nivelCalor(0, 10), 0);
  assert.equal(G.nivelCalor(1, 10), 1);
  assert.equal(G.nivelCalor(5, 10), 3);
  assert.equal(G.nivelCalor(10, 10), 5);
  const filas = ['Lun', 'Mar'].map((e, i) => ({ etiqueta: e, valores: Array.from({ length: 24 }, (_, h) => (i === 1 && h === 17 ? 9 : 0)) }));
  const h = G.mapaCalor({ titulo: 'Actividad', filas, columnas: Array.from({ length: 24 }, (_, i) => i + 'h') });
  assert.equal((h.match(/class="zg-hm__c zg-hm--/g) || []).length, 48 + 6, '48 celdas más los 6 niveles de la escala');
  assert.match(h, /zg-hm--5" data-tip="Mar 17h · 9/);
  assert.match(h, /El momento con más actividad es Mar a las 17h con 9/);
  assert.match(G.mapaCalor({ filas: [{ etiqueta: 'Lun', valores: [0, 0] }], columnas: ['0h', '1h'] }), /zg-vacio/);
});

test('embudo: porcentaje del inicio y de la etapa anterior; sin inicio no hay embudo', () => {
  const h = G.embudo({ titulo: 'Embudo', etapas: [{ etiqueta: 'Se registraron', valor: 20 }, { etiqueta: 'Eligieron', valor: 10 }, { etiqueta: 'Pagaron', valor: 2 }] });
  assert.match(h, /50 % del inicio · 50 % de la etapa anterior/);
  assert.match(h, /10 % del inicio · 20 % de la etapa anterior/);
  assert.match(h, /width:100%/);
  assert.match(G.embudo({ etapas: [{ etiqueta: 'a', valor: 0 }] }), /zg-vacio/);
});

test('sparkline: solo con dos o más puntos y algo que mostrar; sin texto ni degradados', () => {
  const s = G.sparkline([1, 3, 2, 5], { color: 2 });
  assert.match(s, /class="zg-spark zg-c2"/);
  assert.match(s, /aria-hidden="true"/);
  assert.doesNotMatch(s, /<text|gradient/i);
  assert.equal(G.sparkline([0, 0, 0]), '');
  assert.equal(G.sparkline([4]), '');
  assert.equal(G.sparkline(null), '');
});

test('activar() no falla sin DOM y es seguro llamarlo con nada', () => {
  assert.doesNotThrow(() => G.activar(null));
  assert.doesNotThrow(() => G.activar({}));
});

/* ───────── diseño: colores sólidos, sin CDN, día y noche ───────── */

const css = leer('assets/css/admin-club.css');
const bloque = css.slice(css.indexOf('Gráficas (admin-graficas.js)'));

test('estilos de las gráficas: sin degradados, con ocho colores distintos en día y en noche', () => {
  assert.doesNotMatch(bloque, /gradient/i);
  for (const modo of ['claro', 'oscuro']) {
    const b = bloque.match(new RegExp(':root\\[data-tema\\]\\[data-modo="' + modo + '"\\] \\{([^}]*)\\}'));
    assert.ok(b, 'falta la paleta ' + modo);
    const cols = [...b[1].matchAll(/--zg-([1-8]):\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[2].toUpperCase());
    assert.equal(cols.length, 8, modo + ': ocho colores');
    assert.equal(new Set(cols).size, 8, modo + ': todos distintos');
  }
});

const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('cada color de gráfica se distingue de la tarjeta (contraste de 3:1 como mínimo para gráficos)', () => {
  const fondo = { claro: '#FFFFFF', oscuro: '#171B20' };
  for (const modo of ['claro', 'oscuro']) {
    const b = bloque.match(new RegExp(':root\\[data-tema\\]\\[data-modo="' + modo + '"\\] \\{([^}]*)\\}'))[1];
    for (const m of b.matchAll(/--zg-([1-8]):\s*(#[0-9A-Fa-f]{6})/g)) {
      assert.ok(contraste(m[2], fondo[modo]) >= 3, `${modo} --zg-${m[1]} ${m[2]}: ${contraste(m[2], fondo[modo]).toFixed(2)}:1`);
    }
  }
});

test('las gráficas no cargan librerías externas ni CDN y el panel las incluye antes de las vistas', () => {
  const js = leer('assets/js/admin-graficas.js');
  assert.doesNotMatch(js, /https?:\/\/|import\s|require\((?!'\.\/admin-panel\.js')/);
  const html = leer('pages/admin-club.html');
  assert.doesNotMatch(html, /chart\.js|chartjs|d3js|cdn\.jsdelivr/i);
  const iG = html.indexOf('admin-graficas.js'), iV = html.indexOf('admin-vistas.js'), iM = html.indexOf('admin-marketing.js'), iP = html.indexOf('admin-panel.js');
  assert.ok(iP > 0 && iG > iP && iV > iG && iM > iG, 'orden: panel, gráficas, vistas y marketing');
});

test('las gráficas respetan el movimiento reducido y no usan emojis', () => {
  assert.match(bloque, /prefers-reduced-motion: reduce/);
  const js = leer('assets/js/admin-graficas.js') + bloque;
  assert.doesNotMatch(js, /[\p{Extended_Pictographic}]/u);
});

test('el Resumen, Suscripciones, Comunidad y Métricas usan la nueva librería (no las gráficas viejas)', () => {
  for (const f of ['assets/js/admin-vistas.js', 'assets/js/admin-marketing.js']) {
    const t = leer(f);
    assert.doesNotMatch(t, /graficaBarras|graficaLinea|graficaSerie|barraReparto|barrasHorizontales/, f);
    assert.match(t, /G\.activar\(/, f + ' debe activar los tooltips');
  }
  assert.match(leer('assets/js/admin-vistas.js'), /G\.serie\(/);
  assert.match(leer('assets/js/admin-vistas.js'), /G\.anillo\(/);
});
