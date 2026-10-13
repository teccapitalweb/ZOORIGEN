'use strict';

// Jaguarito, personaje guía de la portada (encuesta y Guía Zoorigen).
// Ejecutar: node --test tests/guia-personaje.test.js

const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const G = require(path.join(RAIZ, 'assets', 'js', 'guia-personaje.js'));
const M = require(path.join(RAIZ, 'assets', 'js', 'encuesta-motor.js'));

const KB = 1024;

// Lee el ancho y el alto de un WebP (VP8X con alfa, VP8 con pérdida o VP8L sin pérdida).
function dimensionesWebp(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF', 'no es RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP', 'no es WebP');
  const tipo = buf.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { ancho: 1 + buf.readUIntLE(24, 3), alto: 1 + buf.readUIntLE(27, 3), alfa: !!(buf[20] & 0x10) };
  if (tipo === 'VP8 ') return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff, alfa: false };
  if (tipo === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { ancho: (b & 0x3fff) + 1, alto: ((b >> 14) & 0x3fff) + 1, alfa: true };
  }
  throw new Error('tipo WebP desconocido: ' + tipo);
}

/* ───────────────────────── Mapa de expresiones ───────────────────────── */

// Todas las expresiones que el motor de la encuesta puede pedir.
function expresionesDelMotor() {
  const usadas = new Set(Object.keys(M.MENSAJES_EXPR));
  usadas.add(M.MENSAJE_INICIO.expr);
  const pasos = [];
  Object.keys(M.COMUNES).forEach(k => pasos.push({ clave: k, opts: M.COMUNES[k].opts }));
  Object.keys(M.RETOS).forEach(p => pasos.push({ clave: 'p2', opts: M.RETOS[p].opts }));
  Object.keys(M.PROFUNDIZACION).forEach(p => Object.keys(M.PROFUNDIZACION[p]).forEach(r => pasos.push({ clave: 'p2b', opts: M.PROFUNDIZACION[p][r].opts })));
  pasos.forEach(p => p.opts.forEach(o => usadas.add(M.reaccion(p.clave, o).expr)));
  ['origen', 'experiencia', 'urgencia', 'freno', 'tamano', 'meta', 'p1', 'grupo', 'interes'].forEach(c => usadas.add(M.reaccion(c, 'x').expr));
  ['urgencia', 'p2', 'freno', 'origen'].forEach(c => usadas.add(M.mensajePregunta({ clave: c }, false).expr));
  return usadas;
}

test('cada expresión que el motor puede pedir tiene su imagen del personaje', () => {
  const usadas = expresionesDelMotor();
  assert.ok(usadas.size >= 6, 'el motor usa varias expresiones');
  usadas.forEach(expr => {
    assert.ok(G.esExpresion(expr), 'falta la imagen de la expresión ' + expr);
    assert.match(G.imagenExpresion(expr), /^assets\/img\/guia\/guia-[a-z0-9-]+\.webp$/);
  });
});

test('el mapa cubre las 7 expresiones y apunta a las poses correctas', () => {
  assert.deepEqual(G.EXPRESIONES.slice().sort(), ['concerned', 'confused', 'excited', 'happy', 'neutral', 'surprised', 'thinking']);
  assert.equal(G.imagenExpresion('neutral'), 'assets/img/guia/guia-bienvenida.webp');
  assert.equal(G.imagenExpresion('thinking'), 'assets/img/guia/guia-pensando.webp');
  assert.equal(G.imagenExpresion('confused'), 'assets/img/guia/guia-confundido.webp');
  assert.equal(G.imagenExpresion('concerned'), 'assets/img/guia/guia-preocupado.webp');
  assert.equal(G.imagenExpresion('surprised'), 'assets/img/guia/guia-sorprendido.webp');
  assert.equal(G.imagenExpresion('happy'), 'assets/img/guia/guia-feliz.webp');
  assert.equal(G.imagenExpresion('excited'), 'assets/img/guia/guia-emocionado.webp');
});

test('una expresión desconocida cae en la pose de bienvenida y un mapa propio tiene prioridad', () => {
  assert.equal(G.imagenExpresion('enojado'), G.IMAGENES_EXPR.neutral);
  assert.equal(G.imagenExpresion(undefined), G.IMAGENES_EXPR.neutral);
  assert.equal(G.imagenExpresion('toString'), G.IMAGENES_EXPR.neutral, 'no hereda propiedades de Object');
  assert.equal(G.imagenExpresion('happy', { happy: 'x/otra.webp', neutral: 'x/n.webp' }), 'x/otra.webp');
  assert.equal(G.imagenExpresion('thinking', { neutral: 'x/n.webp' }), 'x/n.webp');
  assert.equal(G.expresionEfectiva('happy'), 'happy');
  assert.equal(G.expresionEfectiva('nada'), 'neutral');
});

test('precarga: sin repetidos, primero la bienvenida y luego los cuadros del saludo', () => {
  const r = G.rutasPrecarga();
  assert.equal(new Set(r).size, r.length);
  assert.equal(r[0], G.IMAGENES_EXPR.neutral);
  assert.equal(r[1], G.CUADROS.saludo1);
  assert.equal(r[2], G.CUADROS.saludo2);
  Object.values(G.IMAGENES_EXPR).forEach(x => assert.ok(r.includes(x), x));
  assert.ok(r.includes(G.CUADROS.parpadeo));
  // con un mapa que repite una imagen (como hace Alintec con feliz y emocionado) no se repite la precarga
  const repetido = G.rutasPrecarga(Object.assign({}, G.IMAGENES_EXPR, { excited: G.IMAGENES_EXPR.happy }));
  assert.equal(new Set(repetido).size, repetido.length);
  assert.equal(repetido.length, r.length - 1);
});

/* ───────────────────────── Saludo y parpadeo ───────────────────────── */

test('saludo: alterna saludo-1 y saludo-2 y termina en la pose de bienvenida', () => {
  const s = G.secuenciaSaludo();
  assert.deepEqual(s.map(c => c.clave), ['saludo1', 'saludo2', 'saludo1', 'saludo2', 'neutral']);
  assert.equal(s[0].ruta, G.CUADROS.saludo1);
  assert.equal(s[1].ruta, G.CUADROS.saludo2);
  assert.equal(s[s.length - 1].ruta, G.IMAGENES_EXPR.neutral);
  assert.equal(s[s.length - 1].ms, 0, 'el reposo no consume tiempo');
  s.slice(0, -1).forEach(c => assert.ok(c.ms >= 80 && c.ms <= 600));
  assert.ok(G.duracionSaludo() > 600 && G.duracionSaludo() < 2500, 'el saludo es corto');
});

test('saludo: las vueltas y la duración se acotan', () => {
  assert.equal(G.secuenciaSaludo(1).length, 3);
  assert.equal(G.secuenciaSaludo(99).length, 9);
  assert.equal(G.secuenciaSaludo(0).length, 5, 'valor inválido: 2 vueltas');
  assert.equal(G.secuenciaSaludo('x').length, 5);
  assert.equal(G.secuenciaSaludo(1, 5)[0].ms, 80);
  assert.equal(G.secuenciaSaludo(1, 99999)[0].ms, 600);
  // nunca dos cuadros iguales seguidos (se vería quieto)
  G.secuenciaSaludo(4).forEach((c, i, arr) => { if (i) assert.notEqual(c.clave, arr[i - 1].clave); });
});

test('parpadeo: espera entre 3.2 y 7 s y solo cuando conviene', () => {
  assert.equal(G.esperaParpadeo(0), 3200);
  assert.equal(G.esperaParpadeo(0.5), 5100);
  assert.ok(G.esperaParpadeo(1) <= 7000);
  assert.equal(G.esperaParpadeo(-3), 3200);
  assert.equal(G.esperaParpadeo(NaN), 3200);
  assert.ok(G.PARPADEO_DURA_MS >= 80 && G.PARPADEO_DURA_MS <= 250);
  const ok = { visible: true, pestanaVisible: true, reducido: false, saludando: false, expresion: 'neutral' };
  assert.equal(G.puedeParpadear(ok), true);
  assert.equal(G.puedeSaludar(ok), true);
  [{ visible: false }, { pestanaVisible: false }, { reducido: true }, { saludando: true }, { expresion: 'happy' }].forEach(c => {
    assert.equal(G.puedeParpadear(Object.assign({}, ok, c)), false, JSON.stringify(c));
    assert.equal(G.puedeSaludar(Object.assign({}, ok, c)), false, JSON.stringify(c));
  });
  assert.equal(G.puedeParpadear(), false);
});

/* ───────────────────────── Imágenes: existen y pesan poco ───────────────────────── */

const LIMITES = [
  { re: /guia-avatar-128\.webp$/, max: 20 * KB, ancho: 128, alto: 128 },
  { re: /guia-avatar\.webp$/, max: 20 * KB, ancho: 256, alto: 256 },
  { re: /guia-[a-z0-9-]+\.webp$/, max: 60 * KB, ancho: 640, alto: 640 }
];

test('cada imagen que usan la encuesta y la guía existe, es WebP con alfa y pesa dentro del límite', () => {
  const rutas = G.todasLasRutas();
  assert.ok(rutas.length >= 12);
  rutas.forEach(r => {
    const f = path.join(RAIZ, r);
    assert.ok(fs.existsSync(f), 'no existe ' + r);
    const buf = fs.readFileSync(f);
    const lim = LIMITES.find(l => l.re.test(r));
    assert.ok(lim, 'sin límite definido para ' + r);
    assert.ok(buf.length <= lim.max, r + ' pesa ' + buf.length + ' bytes (límite ' + lim.max + ')');
    const d = dimensionesWebp(buf);
    assert.equal(d.ancho, lim.ancho, r + ' ancho');
    assert.equal(d.alto, lim.alto, r + ' alto');
    assert.equal(d.alfa, true, r + ' debe conservar la transparencia');
  });
});

test('el cuerpo completo y la mascota del Club existen en WebP con peso razonable', () => {
  const cuerpo = fs.readFileSync(path.join(RAIZ, 'assets/img/guia/guia-cuerpo-saludo.webp'));
  assert.ok(cuerpo.length <= 90 * KB, 'cuerpo ' + cuerpo.length);
  const dc = dimensionesWebp(cuerpo);
  assert.deepEqual([dc.ancho, dc.alto], [512, 768]);
  const mascota = fs.readFileSync(path.join(RAIZ, 'assets/img/mascotas/mascota-jaguarito.webp'));
  assert.ok(mascota.length <= 60 * KB, 'mascota ' + mascota.length);
  assert.equal(dimensionesWebp(mascota).alfa, true);
});

test('la mascota de los retos (Jaguarito) resuelve a un archivo que existe', () => {
  const js = leer('assets/js/club-retos.js');
  const m = js.match(/jaguarito:\s*'(assets\/img\/mascotas\/[^']+)'/);
  assert.ok(m, 'falta la ruta de Jaguarito en club-retos.js');
  assert.ok(fs.existsSync(path.join(RAIZ, m[1])), 'no existe ' + m[1]);
  assert.match(m[1], /\.webp$/);
});

/* ───────────────────────── Los PNG pesados no salen al sitio ───────────────────────── */

function archivos(dir, exts, salida = []) {
  fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).forEach(e => {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) { if (!/^(node_modules|\.git|\.claude|output)$/.test(e.name)) archivos(rel, exts, salida); }
    else if (exts.some(x => e.name.endsWith(x))) salida.push(rel);
  });
  return salida;
}

test('ni pages/, ni assets/js, ni assets/css, ni index.html referencian los PNG pesados del personaje', () => {
  const candidatos = [].concat(archivos('pages', ['.html']), archivos('assets/js', ['.js']), archivos('assets/css', ['.css']), ['index.html', 'styles.css', 'script.js', 'data.js', 'manifest.json', 'sw.js']);
  const malas = [];
  candidatos.forEach(rel => {
    if (!fs.existsSync(path.join(RAIZ, rel))) return;
    leer(rel).split('\n').forEach((l, i) => {
      if (/guia-[a-z0-9-]+\.png|img\/guia\/[^'")\s]*\.png|mascota-jaguarito\.png/.test(l)) malas.push(rel + ':' + (i + 1));
    });
  });
  assert.deepEqual(malas, []);
});

test('el service worker no precarga las imágenes del personaje (se piden bajo demanda)', () => {
  assert.ok(!/img\/guia\//.test(leer('sw.js')));
});

/* ───────────────────────── Pantallas: carga, orden y movimiento ───────────────────────── */

test('index.html carga guia-personaje.js antes de la encuesta y de la guía', () => {
  const html = leer('index.html');
  const i = html.indexOf('src="assets/js/guia-personaje.js');
  assert.ok(i > -1, 'falta guia-personaje.js');
  ['encuesta-landing.js', 'chatbot-landing.js'].forEach(a => assert.ok(html.indexOf('src="assets/js/' + a) > i, a + ' debe cargar después'));
  assert.ok(html.indexOf('src="assets/js/guia-personaje.js') < html.indexOf('src="assets/js/encuesta-motor.js'));
});

test('la encuesta usa el mapa del personaje, mantiene el gancho opcional y anima con cuidado', () => {
  const js = leer('assets/js/encuesta-landing.js');
  assert.match(js, /ZOO_GUIA/);
  assert.match(js, /ZOO_ENCUESTA_IMAGENES/, 'el gancho opcional sigue');
  assert.match(js, /\.decode\(\)/, 'decodifica las imágenes de antemano');
  assert.match(js, /requestIdleCallback/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /secuenciaSaludo/);
  assert.match(js, /9000/, 'vuelve a saludar cada 9 s');
  assert.ok(!/\.png/.test(js), 'sin rutas a PNG');
  const css = leer('assets/css/encuesta.css');
  assert.match(css, /aspect-ratio: 1 \/ 1/, 'reserva el espacio del personaje');
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  ['.zenc__cara-img', '.zenc__cara.is-reacciona', '.zenc__cara.is-saluda'].forEach(sel => assert.ok(rm.includes(sel), 'reduced-motion apaga ' + sel));
  assert.match(css, /\.zenc--pausa/);
});

test('la guía usa el avatar y el busto, conserva el aviso de que no es una persona ni una IA', () => {
  const js = leer('assets/js/chatbot-landing.js');
  assert.match(js, /ZOO_GUIA/);
  assert.match(js, /AVATAR_CHICO/);
  assert.match(js, /Tu guía Zoorigen/);
  assert.match(js, /Guía virtual, no es una persona/);
  assert.match(js, /No hay una persona conectada/);
  assert.match(js, /\.floating-whatsapp/, 'sigue apilándose arriba del botón de WhatsApp');
  assert.ok(!/\.png/.test(js), 'sin rutas a PNG');
  const css = leer('assets/css/chatbot.css');
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(rm.includes('.zg-launcher__pj'), 'reduced-motion apaga la animación del busto');
});

test('sin emojis en el módulo del personaje ni en sus pantallas y estilos', () => {
  const emoji = /[\p{Extended_Pictographic}️]/u;
  ['assets/js/guia-personaje.js', 'assets/js/encuesta-landing.js', 'assets/js/chatbot-landing.js', 'assets/css/encuesta.css', 'assets/css/chatbot.css'].forEach(rel => {
    const malas = leer(rel).split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => emoji.test(l));
    assert.deepEqual(malas.map(([n, l]) => rel + ':' + n + ' ' + l.trim().slice(0, 60)), []);
  });
});
