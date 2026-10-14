'use strict';
// Burbuja de diálogo y cuadros animados (ojos y gesto) de los personajes de cada apartado del Club.
// Ejecutar: node --test tests/club-personaje-anim.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const SEC = require('../assets/js/club-seccion.js');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const DIR_IMG = path.join(RAIZ, 'assets', 'img', 'guia', 'secciones');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/u;
const CLAVES = Object.keys(SEC.DECORACION);

/* Ancho y alto de un WebP (VP8, VP8L o VP8X) sin dependencias. */
function dimensionesWebp(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tipo = buf.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (tipo === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: 1 + (b & 0x3FFF), h: 1 + ((b >> 14) & 0x3FFF) };
  }
  if (tipo === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3FFF, h: buf.readUInt16LE(28) & 0x3FFF };
  return null;
}

/* Revisa un manifiesto de cuadros: personaje conocido, archivos que existen, ligeros y del mismo tamaño que la base. */
function problemasDelManifiesto(manifiesto, carpeta) {
  const problemas = [];
  for (const [personaje, cuadros] of Object.entries(manifiesto || {})) {
    if (!CLAVES.some(k => SEC.DECORACION[k].personaje === personaje)) problemas.push(`personaje desconocido: ${personaje}`);
    if (!Array.isArray(cuadros) || !cuadros.length) { problemas.push(`${personaje}: lista vacía o no es un arreglo`); continue; }
    const base = path.join(carpeta, personaje + '.webp');
    const dimBase = fs.existsSync(base) ? dimensionesWebp(fs.readFileSync(base)) : null;
    for (const c of cuadros) {
      if (!SEC.FRAMES_VALIDOS.includes(c)) { problemas.push(`${personaje}: cuadro no válido "${c}"`); continue; }
      const f = path.join(carpeta, `${personaje}-${c}.webp`);
      if (!fs.existsSync(f)) { problemas.push(`falta ${personaje}-${c}.webp en assets/img/guia/secciones`); continue; }
      const buf = fs.readFileSync(f);
      if (buf.length > 70 * 1024) problemas.push(`${personaje}-${c}.webp pesa demasiado (${buf.length} bytes)`);
      const dim = dimensionesWebp(buf);
      if (!dim) problemas.push(`${personaje}-${c}.webp no es un WebP válido`);
      else if (dimBase && (dim.w !== dimBase.w || dim.h !== dimBase.h)) problemas.push(`${personaje}-${c}.webp mide ${dim.w}x${dim.h} y la base ${dimBase.w}x${dimBase.h}`);
    }
  }
  return problemas;
}

test('mensajes: hay al menos uno por cada uno de los 17 apartados, de 56 caracteres o menos, sin emojis ni HTML', () => {
  assert.equal(CLAVES.length, 17);
  assert.deepEqual(Object.keys(SEC.MENSAJES).sort(), CLAVES.slice().sort(), 'el mapa MENSAJES debe tener exactamente las claves de DECORACION');
  assert.equal(SEC.MENSAJE_MAX, 56);
  const todos = [].concat(...Object.values(SEC.MENSAJES), SEC.MENSAJES_SESIONES_EN_VIVO);
  for (const clave of CLAVES) {
    const lista = SEC.MENSAJES[clave];
    assert.ok(Array.isArray(lista) && lista.length >= 1, `${clave}: sin mensajes`);
    assert.equal(new Set(lista).size, lista.length, `${clave}: mensajes repetidos`);
  }
  for (const m of todos) {
    assert.equal(typeof m, 'string');
    assert.ok(m.trim().length > 0, 'mensaje vacío');
    assert.ok(m.length <= SEC.MENSAJE_MAX, `"${m}" tiene ${m.length} caracteres`);
    assert.doesNotMatch(m, EMOJI, `emoji en "${m}"`);
    assert.doesNotMatch(m, /[<>&]/, `HTML en "${m}"`);
    assert.equal(m, m.trim(), `espacios sobrantes en "${m}"`);
  }
});

test('mensajes: Webinars solo habla de "Próximamente" con la bandera de clases en vivo y de Meet sin ella', () => {
  const pronto = SEC.mensajesDe('sesiones', true).join(' ');
  assert.match(pronto, /pronto/i);
  assert.doesNotMatch(pronto, /Meet|masterclass/i);
  assert.deepEqual(SEC.mensajesDe('sesiones'), SEC.MENSAJES.sesiones, 'sin dato, el valor por omisión es el de Próximamente');
  const vivo = SEC.mensajesDe('sesiones', false);
  assert.deepEqual(vivo, SEC.MENSAJES_SESIONES_EN_VIVO);
  assert.doesNotMatch(vivo.join(' '), /pronto|preparando/i);
});

test('mensajesDe(): acepta alias, devuelve una copia y [] para claves desconocidas', () => {
  assert.deepEqual(SEC.mensajesDe('biblioteca'), SEC.MENSAJES.cursos);
  assert.deepEqual(SEC.mensajesDe('inventario'), SEC.MENSAJES.registro);
  assert.deepEqual(SEC.mensajesDe('webinars', true), SEC.MENSAJES.sesiones);
  assert.deepEqual(SEC.mensajesDe('no-existe'), []);
  assert.deepEqual(SEC.mensajesDe(''), []);
  assert.deepEqual(SEC.mensajesDe(null), []);
  const a = SEC.mensajesDe('cursos');
  a.push('x');
  assert.equal(SEC.MENSAJES.cursos.includes('x'), false, 'no debe exponer el arreglo original');
});

test('ciclarMensaje(): avanza y vuelve al primero al terminar', () => {
  assert.equal(SEC.ciclarMensaje(0, 3), 1);
  assert.equal(SEC.ciclarMensaje(1, 3), 2);
  assert.equal(SEC.ciclarMensaje(2, 3), 0);
  assert.equal(SEC.ciclarMensaje(0, 1), 0);
  assert.equal(SEC.ciclarMensaje(0, 0), 0);
  assert.equal(SEC.ciclarMensaje(-4, 3), 0);
  assert.equal(SEC.ciclarMensaje(NaN, 3), 0);
  assert.equal(SEC.ciclarMensaje(7, 3), 2, 'un índice fuera de rango sigue ciclando');
});

test('tiempos: aparece a ~1.2 s, cada mensaje ~5.5 s con 0.5 s de fundido y ~2 s de pausa', () => {
  const T = SEC.TIEMPOS;
  assert.equal(T.aparicion, 1200);
  assert.equal(T.visible, 5500);
  assert.equal(T.fundido, 500);
  assert.equal(T.pausa, 2000);
  assert.ok(T.visible > 2 * T.fundido, 'el mensaje debe quedarse más tiempo que sus dos fundidos');
});

test('parpadeo: la espera siempre cae entre 3000 y 6500 ms y el cierre dura 130 a 160 ms', () => {
  assert.equal(SEC.siguienteParpadeo(0), 3000);
  assert.ok(SEC.siguienteParpadeo(0.999999) <= 6500);
  assert.equal(SEC.siguienteParpadeo(0.5), 4750);
  for (const r of [-5, 1, 7, NaN, Infinity, 'x', null, undefined]) {
    const v = SEC.siguienteParpadeo(r);
    assert.ok(v >= 3000 && v <= 6500, `siguienteParpadeo(${String(r)}) = ${v}`);
  }
  for (let i = 0; i < 400; i++) {
    const v = SEC.siguienteParpadeo(Math.random());
    assert.ok(v >= 3000 && v <= 6500);
    const c = SEC.duracionParpadeo(Math.random());
    assert.ok(c >= 130 && c <= 160, `cierre ${c}`);
  }
  assert.equal(SEC.duracionParpadeo(0), 130);
  assert.ok(SEC.duracionParpadeo(0.999999) <= 160);
});

test('parpadeo doble: 1 de cada 5', () => {
  assert.equal(SEC.esDobleParpadeo(0), true);
  assert.equal(SEC.esDobleParpadeo(0.19), true);
  assert.equal(SEC.esDobleParpadeo(0.2), false);
  assert.equal(SEC.esDobleParpadeo(0.9), false);
  let dobles = 0;
  for (let i = 0; i < 5000; i++) if (SEC.esDobleParpadeo(i / 5000)) dobles++;
  assert.equal(dobles, 1000);
});

test('secuenciaHabla(): alterna gesto y base, empieza con gesto, termina en base y dura cerca de lo pedido', () => {
  const s = SEC.secuenciaHabla(1400, 220);
  assert.ok(s.length >= 2 && s.length % 2 === 0);
  assert.equal(s[0], 'gesto');
  assert.equal(s[s.length - 1], 'base');
  s.forEach((c, i) => assert.equal(c, i % 2 === 0 ? 'gesto' : 'base'));
  assert.ok(Math.abs(s.length * 220 - 1400) <= 220, 'la duración total debe quedar a un intervalo de lo pedido');
  assert.deepEqual(SEC.secuenciaHabla(0, 220), ['base']);
  assert.deepEqual(SEC.secuenciaHabla(1400, 0), ['base']);
  assert.deepEqual(SEC.secuenciaHabla(NaN, 220), ['base']);
  assert.deepEqual(SEC.secuenciaHabla(100, 220), ['gesto', 'base'], 'siempre al menos un movimiento de boca');
});

test('framesDisponibles(): manifiesto vacío = sin cuadros; solo ojos y gesto declarados', () => {
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', {}), []);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', null), []);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', undefined), []);
  assert.deepEqual(SEC.framesDisponibles('', { 'seccion-cursos': ['ojos'] }), []);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', { 'seccion-cursos': ['ojos', 'gesto'] }), ['ojos', 'gesto']);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', { 'seccion-cursos': ['gesto', 'ojos', 'ojos'] }), ['ojos', 'gesto'], 'sin repetir y en orden estable');
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', { 'seccion-cursos': ['gesto'] }), ['gesto']);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', { 'seccion-cursos': ['ojos', 'baila'] }), ['ojos']);
  assert.deepEqual(SEC.framesDisponibles('seccion-cursos', { 'seccion-cursos': 'ojos' }), []);
  assert.deepEqual(SEC.framesDisponibles('seccion-pdfs', { 'seccion-cursos': ['ojos'] }), []);
  assert.deepEqual(SEC.framesDisponibles('toString', {}), [], 'las claves heredadas del objeto no cuentan');
});

test('rutaFrame(): arma la ruta del cuadro con la misma carpeta y extensión que la imagen base', () => {
  assert.equal(SEC.rutaFrame('../assets/img/guia/secciones/seccion-cursos.webp', 'ojos'), '../assets/img/guia/secciones/seccion-cursos-ojos.webp');
  assert.equal(SEC.rutaFrame('assets/img/guia/secciones/seccion-foro.webp?v=3', 'gesto'), 'assets/img/guia/secciones/seccion-foro-gesto.webp?v=3');
  assert.equal(SEC.rutaFrame('', 'ojos'), '');
  assert.equal(SEC.rutaFrame('a.webp', ''), '');
  assert.equal(SEC.rutaFrame('a.webp', '../x'), 'a-x.webp', 'el nombre del cuadro se limpia');
});

test('manifiesto FRAMES: lo que se declare existe en assets/img/guia/secciones (así nadie declara cuadros inexistentes)', () => {
  assert.ok(SEC.FRAMES && typeof SEC.FRAMES === 'object' && !Array.isArray(SEC.FRAMES));
  assert.deepEqual(problemasDelManifiesto(SEC.FRAMES, DIR_IMG), []);
});

test('manifiesto FRAMES: el revisor detecta archivos inexistentes, cuadros no válidos y personajes desconocidos', () => {
  const p = problemasDelManifiesto({ 'seccion-cursos': ['ojos', 'gesto'], 'seccion-fantasma': ['ojos'], 'seccion-pdfs': ['baila'], 'seccion-foro': [] }, fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'zoo-frames-')));
  assert.ok(p.some(x => /falta seccion-cursos-ojos\.webp/.test(x)), p.join(' | '));
  assert.ok(p.some(x => /falta seccion-cursos-gesto\.webp/.test(x)));
  assert.ok(p.some(x => /personaje desconocido: seccion-fantasma/.test(x)));
  assert.ok(p.some(x => /cuadro no válido "baila"/.test(x)));
  assert.ok(p.some(x => /seccion-foro: lista vacía/.test(x)));
  assert.deepEqual(problemasDelManifiesto({}, DIR_IMG), []);
});

test('el lector de WebP lee las medidas de los personajes reales', () => {
  for (const k of CLAVES) {
    const d = dimensionesWebp(fs.readFileSync(path.join(DIR_IMG, SEC.DECORACION[k].personaje + '.webp')));
    assert.ok(d && d.w > 0 && d.h > 0, k);
  }
});

test('html(): la burbuja va dentro del personaje, decorativa, con el primer mensaje y sin HTML sin escapar', () => {
  for (const k of CLAVES) {
    const h = SEC.html({ seccion: k, titulo: 'T', pronto: k === 'sesiones' });
    const m = h.match(/<div class="zs-burbuja" aria-hidden="true"><span class="zs-burbuja__txt">([^<]*)<\/span><\/div>/);
    assert.ok(m, `${k}: sin burbuja`);
    assert.equal(m[1], SEC.esc(SEC.mensajesDe(k, k === 'sesiones')[0]));
    const iPj = h.indexOf('class="zs-personaje"');
    assert.ok(iPj >= 0 && h.indexOf('zs-burbuja') > iPj && h.indexOf('zs-burbuja') > h.indexOf('zs-personaje__img'), `${k}: la burbuja debe ir después de la imagen, dentro del personaje`);
    assert.doesNotMatch(h, /zs-burbuja[^>]*\btabindex|zs-burbuja[^>]*\brole=|<button[^>]*zs-burbuja/);
  }
});

test('html(): Webinars con pronto lleva el mensaje de Próximamente; sin pronto, el de las clases en vivo', () => {
  assert.match(SEC.html({ seccion: 'sesiones', titulo: 'T', pronto: true }), /Muy pronto, clases en vivo\./);
  assert.match(SEC.html({ seccion: 'webinars', titulo: 'T' }), /Masterclasses con especialistas invitados\./);
});

test('html(): sin personaje (decoracion:false o apartado desconocido) tampoco hay burbuja', () => {
  assert.doesNotMatch(SEC.html({ seccion: 'cursos', titulo: 'T', decoracion: false }), /zs-burbuja/);
  assert.doesNotMatch(SEC.html({ seccion: 'otra-cosa', titulo: 'T' }), /zs-burbuja/);
});

test('CSS de la burbuja: sólida, borde del apartado, radio de 14 px, letra de 12 px o más y sin degradados', () => {
  const css = leer('assets/css/club-seccion.css');
  const bloque = css.slice(css.indexOf('.zs-burbuja {'), css.indexOf('.zs-burbuja.is-visible'));
  assert.ok(bloque.length > 100, 'no se encontró el bloque .zs-burbuja');
  assert.match(bloque, /border-radius:\s*14px/);
  assert.match(bloque, /border:\s*2px solid var\(--zs-bur-borde\)/);
  assert.match(bloque, /--zs-bur-borde:\s*var\(--zs-claro/);
  assert.match(bloque, /background:\s*var\(--zs-bur-fondo\)/);
  assert.match(bloque, /--zs-bur-texto:\s*#1F2933/);
  assert.match(bloque, /pointer-events:\s*none/);
  const letra = bloque.match(/font:\s*\d+\s+([\d.]+)rem/);
  assert.ok(letra && parseFloat(letra[1]) * 16 >= 12, 'la letra de la burbuja debe ser de 12 px o más');
  assert.doesNotMatch(bloque, /gradient/i);
  assert.match(css, /\.zs-burbuja::after\s*\{[^}]*rotate\(45deg\)/, 'la cola es un cuadrito girado');
  assert.match(css, /\.zs-burbuja\.is-sin-sitio\s*\{\s*display:\s*none/);
});

test('CSS de la burbuja: con prefers-reduced-motion queda fija y visible, sin transición', () => {
  const css = leer('assets/css/club-seccion.css');
  const mq = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
  assert.ok(mq, 'falta el bloque de reducir movimiento');
  assert.match(mq[0], /\.zs-burbuja\s*\{\s*opacity:\s*1;\s*transform:\s*none/);
  assert.match(mq[0], /transition:\s*none !important/);
  // En celular: encima del personaje y con ancho máximo de ~170 px.
  const cel = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
  assert.match(cel, /\.zs-burbuja\s*\{[^}]*bottom:\s*calc\(100% \+ 9px\)[^}]*max-width:\s*170px/);
});

test('CSS y JS de la animación: sin degradados ni emojis', () => {
  const css = leer('assets/css/club-seccion.css');
  const js = leer('assets/js/club-seccion.js');
  assert.doesNotMatch(css, /gradient/i);
  assert.doesNotMatch(css + js, EMOJI);
});

test('motor: un solo temporizador encadenado por tarjeta, pausa con .is-pausa y sin movimiento con reducir movimiento', () => {
  const js = leer('assets/js/club-seccion.js');
  assert.doesNotMatch(js, /setInterval\s*\(/, 'se encadena con setTimeout, no con setInterval');
  assert.match(js, /function pausar\(tarjeta\)[\s\S]*?sincronizarMotor\(tarjeta\)/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /!t\.classList\.contains\('is-pausa'\) && !movimientoReducido\(\)/);
  assert.match(js, /isConnected/, 'una tarjeta que la página volvió a pintar no debe dejar un temporizador vivo');
  assert.match(js, /\.decode\(\)/, 'los cuadros se decodifican antes de usarse');
  assert.match(js, /clearTimeout\(st\.timer\)/);
});
