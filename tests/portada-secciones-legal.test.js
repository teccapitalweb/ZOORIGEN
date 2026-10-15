'use strict';
// Portada: secciones rediseñadas (cifras, confianza, cursos, siguiente paso, beneficios, plataforma,
// experiencia, dudas, contacto), pie de página y páginas legales (aviso de privacidad y términos).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const INDEX = leer('index.html');
const SCRIPT = leer('script.js');
const CSS = leer('assets/css/landing-secciones.css');
const AVISO = leer('aviso-de-privacidad.html');
const TERMINOS = leer('terminos-y-condiciones.html');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

// Solo el marcado de las secciones y el pie rediseñados (el resto de la portada es de otras capas)
function bloque(html, inicio, fin) {
  const i = html.indexOf(inicio);
  assert.ok(i >= 0, 'no se encontró ' + inicio);
  const f = html.indexOf(fin, i);
  assert.ok(f > i, 'no se encontró el fin de ' + inicio);
  return html.slice(i, f + fin.length);
}
const PIE = bloque(INDEX, '<footer class="zs-pie"', '</footer>');

test('las dos páginas legales existen y tienen título, descripción, versión y fecha', () => {
  for (const [nombre, h] of [['aviso-de-privacidad.html', AVISO], ['terminos-y-condiciones.html', TERMINOS]]) {
    assert.match(h, /<html lang="es">/, nombre);
    assert.match(h, /<title>[^<]{10,}<\/title>/, nombre);
    assert.match(h, /<meta name="description" content="[^"]{40,}"/, nombre);
    assert.match(h, /<h1>[^<]+<\/h1>/, nombre);
    assert.match(h, /Versión \d+\.\d+/, nombre);
    assert.match(h, /Última actualización: \d{1,2} de \w+ de 20\d\d/, nombre);
    assert.match(h, /REVISIÓN LEGAL PENDIENTE[\s\S]*abogado/, nombre + ': debe dejar el comentario de revisión legal');
    assert.match(h, /landing-secciones\.css\?v=/, nombre + ': comparte la hoja de la portada');
    assert.match(h, /class="zs-cab"/, nombre + ': cabecera compartida');
    assert.match(h, /class="zs-pie"/, nombre + ': pie compartido');
    assert.match(h, /class="zs-indice"/, nombre + ': índice con anclas');
  }
});

test('el índice de cada página legal apunta a secciones que existen', () => {
  for (const [nombre, h] of [['aviso', AVISO], ['terminos', TERMINOS]]) {
    const anclas = [...h.matchAll(/<li><a href="#([\w-]+)">/g)].map(m => m[1]);
    assert.ok(anclas.length >= 10, nombre + ': índice corto');
    for (const a of anclas) assert.ok(h.includes('id="' + a + '"'), nombre + ': falta la sección #' + a);
  }
});

test('el aviso cubre datos, finalidades, ARCO, proveedores, conservación, menores y cambios', () => {
  for (const clave of ['Stripe', 'Bunny', 'Firebase', 'ARCO', 'WhatsApp', 'certificado', 'Menores de edad', 'Cuánto tiempo conservamos', 'Cambios a este aviso', 'cookies', 'Tehuacán, Puebla, México', 'zooorigen@gmail.com', '5212361113237']) {
    assert.ok(AVISO.toLowerCase().includes(clave.toLowerCase()), 'el aviso no menciona: ' + clave);
  }
  assert.doesNotMatch(AVISO, /almacenamos (los )?datos de (tu )?tarjeta/i);
});

test('los términos cubren membresía, renovación, cancelación, prueba única y certificado sin valor oficial', () => {
  for (const clave of ['renovación automática', 'Cancelación', 'un solo curso de prueba', 'no puede cambiarse', 'No es un título', 'cédula profesional', 'no sustituyen tu criterio profesional', 'Propiedad intelectual', 'Ley aplicable', 'Stripe']) {
    assert.ok(TERMINOS.toLowerCase().includes(clave.toLowerCase()), 'los términos no mencionan: ' + clave);
  }
});

test('marcadores POR CONFIRMAR: solo los que realmente faltan (hoy no hay ninguno visible)', () => {
  const marcadores = [];
  for (const [nombre, h] of [['aviso', AVISO], ['terminos', TERMINOS]]) {
    // Fuera del comentario de revisión legal, que sí puede nombrarlos.
    const visible = h.replace(/<!--[\s\S]*?-->/g, '');
    for (const m of visible.matchAll(/\[[^\]]*POR CONFIRMAR[^\]]*\]/g)) marcadores.push(nombre + ': ' + m[0]);
    assert.doesNotMatch(visible, /\[\s*(?:TODO|XXX|\.\.\.|PENDIENTE|COMPLETAR)[^\]]*\]/i, nombre + ': marcador a medias sin listar');
    assert.doesNotMatch(visible, /lorem ipsum/i, nombre);
    assert.doesNotMatch(visible, /RAZÓN SOCIAL POR CONFIRMAR|DOMICILIO POR CONFIRMAR|RFC/, nombre + ': razón social, domicilio y RFC ya no son marcadores');
  }
  console.log('Marcadores POR CONFIRMAR visibles en las páginas legales: ' + marcadores.length + (marcadores.length ? ' -> ' + marcadores.join(' | ') : ''));
  assert.deepEqual(marcadores, [], 'si se agrega un marcador, hay que listarlo aquí y reportarlo al dueño');
});

test('Zoorigen es independiente: nada de TEC CAPITAL ni IPCI en portada, pie ni documentos legales', () => {
  for (const [nombre, t] of [['index', INDEX], ['aviso', AVISO], ['terminos', TERMINOS], ['css', CSS]]) {
    assert.doesNotMatch(t, /TEC\s*CAPITAL|\bIPCI\b/i, nombre);
  }
});

test('el pie enlaza a ambas páginas legales, a las redes oficiales y al contacto', () => {
  assert.match(PIE, /href="aviso-de-privacidad\.html"/);
  assert.match(PIE, /href="terminos-y-condiciones\.html"/);
  assert.match(PIE, /href="https:\/\/www\.instagram\.com\/zoorigen\.mexico1\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(PIE, /href="https:\/\/www\.facebook\.com\/p\/Zoorigen-61579624231627\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(PIE, /href="https:\/\/wa\.me\/5212361113237"/);
  assert.match(PIE, /href="mailto:zooorigen@gmail\.com"/);
  assert.match(PIE, /pages\/club-login\.html/);
  assert.match(PIE, /pages\/club-registro\.html/);
  assert.match(PIE, /id="zsAnio"/);
  assert.match(CSS, /\.zs-pie\s*\{[^}]*padding:[^;}]*--zs-flot-abajo[^;}]*--zs-wa[^;}]*--zs-guia/, 'el pie deja margen inferior para el WhatsApp y la guía');
});

test('registro, inicio de sesión, suscripción, encuesta y directorio enlazan a los documentos', () => {
  const REG = leer('pages/club-registro.html');
  assert.match(REG, /Al crear tu cuenta aceptas los[\s\S]{0,200}terminos-y-condiciones\.html[\s\S]{0,200}aviso-de-privacidad\.html/);
  assert.doesNotMatch(REG, /index\.html#terminos|index\.html#privacidad/);
  assert.match(leer('pages/club-login.html'), /terminos-y-condiciones\.html[\s\S]{0,200}aviso-de-privacidad\.html/);
  const SUB = leer('pages/club-suscripcion.html');
  assert.match(SUB, /Al suscribirte aceptas[\s\S]{0,260}renovación automática[\s\S]{0,260}aviso-de-privacidad\.html/);
  assert.match(leer('assets/js/encuesta-landing.js'), /enlace\.href = 'aviso-de-privacidad\.html'/);
  assert.match(leer('pages/club-directorio.html'), /aviso-de-privacidad\.html/);
});

test('la portada conserva lo funcional: contadores, búsqueda, filtros, carrusel, logos, chatbot y encuesta', () => {
  assert.equal((INDEX.match(/data-counter="/g) || []).length, 3);
  for (const [v, t] of [['data-counter="22"', '22'], ['data-counter="6"', '6'], ['data-counter="2000"', '2000']]) assert.ok(INDEX.includes(v), t);
  for (const id of ['courseSearch', 'coursesCount', 'coursesGrid', 'companiesGrid', 'areasGrid']) assert.ok(INDEX.includes('id="' + id + '"'), 'falta #' + id);
  assert.match(INDEX, /class="zs-chips"/);
  assert.match(SCRIPT, /document\.querySelector\('\.zs-chips'\)/);
  assert.match(SCRIPT, /querySelectorAll\('\.zs-chip'\)/);
  assert.equal((INDEX.match(/data-target="coursesGrid"/g) || []).length, 2);
  assert.match(INDEX, /chatbot-landing\.js/);
  assert.match(INDEX, /encuesta-landing\.js/);
  assert.match(INDEX, /pages\/club-login\.html/);
  assert.match(INDEX, /pages\/club-registro\.html/);
  assert.match(INDEX, /href="assets\/css\/landing-secciones\.css\?v=[\w.-]+"[\s\S]*<\/head>/);
  // Las tarjetas de áreas no se tocan
  assert.match(INDEX, /landing-areas-tarjeta\.css/);
});

test('las secciones rediseñadas no usan las clases de capas anteriores', () => {
  for (const id of ['empresas', 'cursos', 'como-empezar', 'beneficios', 'panel', 'experiencia', 'preguntas', 'contacto']) {
    const m = INDEX.match(new RegExp('<section class="([^"]*)" id="' + id + '"'));
    assert.ok(m, 'falta la sección #' + id);
    assert.match(m[1], /\bzs-sec\b/, '#' + id + ' debe usar zs-sec');
    assert.doesNotMatch(m[1], /\bsection\b|section--soft/, '#' + id + ' conserva clases viejas');
  }
});

test('hoja nueva y páginas legales: sin degradados, sin emojis y sin letra menor de 12 px', () => {
  for (const [nombre, t] of [['landing-secciones.css', CSS], ['aviso', AVISO], ['terminos', TERMINOS], ['pie', PIE]]) {
    assert.doesNotMatch(t, /gradient\s*\(/i, nombre + ': usa degradado');
    assert.doesNotMatch(t, EMOJI, nombre + ': tiene emoji');
  }
  const chicas = [];
  for (const m of CSS.matchAll(/font(?:-size)?\s*:\s*[^;{}]*?(\d+(?:\.\d+)?)px/g)) {
    // font: 800 12px/1.3 ... -> el primer tamaño en px es el de la letra
    const px = parseFloat(m[1]);
    if (px < 12) chicas.push(m[0]);
  }
  assert.deepEqual(chicas, [], 'hay letra menor de 12 px: ' + chicas.join(' | '));
});

test('la hoja usa la pareja del Club (Outfit + Inter) y colores de marca; los nombres viejos solo existen como alias', () => {
  const sinComentarios = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const sinAlias = sinComentarios.replace(/@font-face\s*\{\s*font-family:\s*'(Manrope|Poppins|Open Sans)'[^}]*\}/g, '');
  assert.doesNotMatch(sinAlias, /Poppins|Playfair|Open Sans|Manrope/, 'quedó una letra vieja fuera de los alias');
  assert.match(CSS, /--zs-titulo:\s*'Outfit'/);
  assert.match(CSS, /--zs-fuente:\s*'Inter'/);
  assert.match(CSS, /#1F5F3A/i);
  assert.match(CSS, /#E8A317/i);
  assert.match(CSS, /prefers-reduced-motion/);
});

test('letras autoalojadas: la portada y las páginas legales no piden nada a Google Fonts', () => {
  for (const [n, h] of [['index', INDEX], ['aviso', AVISO], ['terminos', TERMINOS]]) {
    assert.doesNotMatch(h, /fonts\.googleapis|fonts\.gstatic/, n);
    assert.match(h, /assets\/css\/fuentes\.css\?v=/, n);
    assert.match(h, /rel="preload" href="assets\/fonts\/inter-latin\.woff2" as="font" type="font\/woff2" crossorigin/, n);
    assert.match(h, /rel="preload" href="assets\/fonts\/outfit-latin\.woff2" as="font" type="font\/woff2" crossorigin/, n);
  }
  for (const f of ['inter-latin.woff2', 'outfit-latin.woff2', 'inter-latin-ext.woff2', 'outfit-latin-ext.woff2']) assert.ok(fs.existsSync(path.join(RAIZ, 'assets/fonts', f)), f);
});

test('ritmo vertical: relleno por lado entre 24 y 38 px (separación entre secciones de 48 a 76 px)', () => {
  const m = CSS.match(/--zs-pad:\s*clamp\((\d+)px,[^,]+,\s*(\d+)px\)/);
  assert.ok(m, 'falta --zs-pad');
  assert.ok(+m[1] >= 20 && +m[1] <= 28, 'mínimo por lado: ' + m[1]);
  assert.ok(+m[2] >= 32 && +m[2] <= 40, 'máximo por lado: ' + m[2]);
  assert.match(CSS, /main > section:where\(:not\(#inicio\)\)\s*\{[^}]*padding-block:\s*var\(--zs-pad\)\s*!important/);
});

test('botones flotantes: guía arriba, WhatsApp abajo, centrados, a 12 px, con zona segura de iOS; "subir" a la izquierda', () => {
  assert.match(CSS, /\.floating-whatsapp\s*\{[^}]*right:\s*var\(--zs-flot-lado\)[^}]*bottom:\s*var\(--zs-flot-abajo\)/);
  assert.match(CSS, /\.zg-launcher\s*\{[^}]*bottom:\s*calc\(var\(--zs-flot-abajo\)\s*\+\s*var\(--zs-wa\)\s*\+\s*12px\)/);
  assert.match(CSS, /safe-area-inset-bottom/);
  assert.match(CSS, /#backToTop\s*\{[^}]*left:/);
  const mov = CSS.match(/@media \(max-width: 560px\) \{\s*:root \{[^}]*\}/);
  assert.ok(mov && /--zs-wa:\s*4\dpx/.test(mov[0]) && /--zs-guia:\s*5\dpx/.test(mov[0]), 'tamaños en celular de 40 a 56 px');
});

test('efectos: archivo enlazado, un solo observador, un solo puntero delegado, sin temporizadores y respetando reducir movimiento', () => {
  const JS = leer('assets/js/landing-efectos.js');
  assert.match(INDEX, /<script src="assets\/js\/landing-efectos\.js\?v=[\w.-]+" defer><\/script>/);
  assert.match(INDEX, /<script>document\.documentElement\.classList\.add\("zs-js"\);<\/script>/);
  assert.equal((JS.match(/new IntersectionObserver\(/g) || []).length, 1, 'un solo IntersectionObserver');
  assert.equal((JS.match(/addEventListener\('pointermove'/g) || []).length, 1, 'un solo escuchador de puntero');
  assert.equal((JS.match(/addEventListener\('scroll', pedirScroll/g) || []).length, 1, 'un solo escuchador de scroll de página');
  assert.doesNotMatch(JS, /setInterval|alert\(|document\.write/);
  assert.match(JS, /prefers-reduced-motion: reduce/);
  assert.match(JS, /if \(reducir \|\| !unico\) return;/, 'con reducir movimiento no corre el movimiento');
  assert.match(JS, /hover: hover\) and \(pointer: fine\)/, 'inclinación solo con puntero fino');
  assert.match(JS, /requestAnimationFrame/);
  assert.doesNotMatch(JS, EMOJI);
  assert.match(CSS, /\.zs-js \[data-zs-r\]\s*\{[^}]*opacity:\s*0/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\[data-zs-r\]\s*\{\s*opacity:\s*1 !important/);
  assert.match(CSS, /perspective\(900px\)/);
  assert.equal((CSS.match(/will-change/g) || []).length, 1, 'will-change acotado a un solo lugar');
  assert.doesNotMatch(JS, /\.style\.(top|left|margin)\s*=/, 'el movimiento no anima propiedades de layout');
});
