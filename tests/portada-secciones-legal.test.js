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

test('botones flotantes: guía arriba y WhatsApp abajo, centrados, a 12 px, con zona segura de iOS', () => {
  assert.match(CSS, /\.floating-whatsapp\s*\{[^}]*right:\s*var\(--zs-flot-lado\)[^}]*bottom:\s*var\(--zs-flot-abajo\)/);
  assert.match(CSS, /\.zg-launcher\s*\{[^}]*bottom:\s*calc\(var\(--zs-flot-abajo\)\s*\+\s*var\(--zs-wa\)\s*\+\s*12px\)/);
  assert.match(CSS, /safe-area-inset-bottom/);
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

/* ---------------- Ronda 3: reseñas en muro, esquina que se expande, tarjetas que giran, campos que se revelan ---------------- */
const RESENAS = bloque(INDEX, '<section class="zs-sec zs-sec--verde-cl" id="resenas"', '</section>');

test('reseñas: muro de tarjetas con el texto transcrito de las capturas y sin las capturas', () => {
  // Textos tal cual aparecen en las capturas (sin los emojis de Facebook)
  const TEXTOS = [
    ['Josselyne Valdez', 'Cumplen con cada aspecto de los cursos, son muy confiables. Yo tomé un curso de arácnidos con el profe Nicolás Soria y explica muy bien, es muy atento y amable. Es muy fácil acceder a el curso y las diapositivas son muy claras y educativas. Sí volvería a tomar otro curso en Zoorigen'],
    ['Antonio LM', 'Cursos en vivo, resuelven todas tus dudas. Es un curso completo, definitivamente lo recomiendo al 100'],
    ['Fernanda Núñez', 'Excelente servicio, personal muy amable, aprendí mucho en estos cursos, y los recomiendo en su totalidad, 100% garantizado el aprendizaje.'],
    ['Karen Garcia', 'Me encantaron estos cursos, los súper recomiendo en su totalidad!!'],
    ['Anne Unu', 'me encantó tomar un curso con ellos aclaran al 100% todas tus dudas'],
    ['Marisol Cabrera', 'Muy buenos cursos, la información te imparten es relevante, además sus ponentes son muy buenos explicando,']
  ];
  for (const [nombre, texto] of TEXTOS) {
    assert.ok(RESENAS.includes('<h3>' + nombre + '</h3>'), 'falta ' + nombre);
    assert.ok(RESENAS.includes('<blockquote>' + texto + '</blockquote>'), 'texto distinto en ' + nombre);
  }
  assert.doesNotMatch(RESENAS, /<img\b/, 'el muro no usa imágenes');
  assert.doesNotMatch(INDEX + SCRIPT, /resena_captura|assets\/img\/resenas|Ver captura original|data-lightbox-group="reviews"/);
  assert.doesNotMatch(RESENAS, EMOJI);
  assert.match(RESENAS, /href="https:\/\/www\.facebook\.com\/p\/Zoorigen-61579624231627\/" target="_blank" rel="noopener noreferrer"/);
  assert.equal((RESENAS.match(/class="zs-resena zs-resena--/g) || []).length, 12, '6 reseñas y 6 copias para el bucle');
  assert.equal((RESENAS.match(/aria-hidden="true"><header/g) || []).length, 6, 'las copias del bucle van ocultas a lectores');
  assert.match(CSS, /\.zs-muro__plano\s*\{[^}]*rotate\(-9deg\)/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.zs-muro__pista\s*\{\s*animation:\s*none !important/);
});

test('Tu siguiente paso: tres columnas desde 900 px, una debajo, esquina que se expande con colores sólidos', () => {
  assert.match(CSS, /\.zs-pasos\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(CSS, /@media \(min-width: 900px\)\s*\{\s*\.zs-pasos\s*\{\s*grid-template-columns:\s*repeat\(3,/);
  // La esquina se llena con un tinte pálido (no verde fuerte) y el texto sigue oscuro
  assert.match(CSS, /\.zs-paso__fondo\s*\{[^}]*border-radius:\s*50%[^}]*background:\s*var\(--zs-salvia\)/);
  assert.match(CSS, /\.zs-paso:focus-within \.zs-paso__fondo[^{]*\{\s*transform:\s*scale\(var\(--zs-esc, 34\)\)/);
  assert.equal((INDEX.match(/class="zs-paso__esquina"/g) || []).length, 3);
  assert.doesNotMatch(CSS, /\.zs-paso:hover h3[^{]*\{\s*color:\s*#FFFFFF/);
  // Sin conector entre pasos
  assert.doesNotMatch(CSS, /\.zs-paso:not\(:last-child\)::(before|after)/);
  assert.doesNotMatch(INDEX, /class="zs-linea"/);
  // Compacta: relleno de 14 a 18 px
  assert.match(CSS, /\.zs-paso__tarjeta\s*\{[^}]*padding:\s*16px 18px/);
});

test('Confianza: tarjetas que giran en 3D con foco y toque, caja de logo fija y sin giro con reducir movimiento', () => {
  assert.match(CSS, /\.zs-logo\s*\{[^}]*perspective:\s*1000px/);
  assert.match(CSS, /\.zs-logo:hover \.zs-logo__giro[^{]*\{\s*transform:\s*rotateY\(180deg\)/);
  assert.match(CSS, /\.zs-logo:focus-visible \.zs-logo__giro/);
  assert.match(CSS, /backface-visibility:\s*hidden/);
  assert.match(CSS, /\.zs-logo__cara--frente img\s*\{[^}]*width:\s*136px;\s*height:\s*60px;[^}]*object-fit:\s*contain/);
  // Logos siempre a color y reverso en tinte pálido con texto oscuro
  assert.doesNotMatch(CSS, /grayscale/);
  assert.match(CSS, /\.zs-logo__cara--dorso\s*\{[^}]*background:\s*var\(--zs-salvia\)/);
  assert.match(CSS, /\.zs-logo__cara--dorso strong\s*\{[^}]*color:\s*var\(--zs-tinta\)/);
  assert.match(INDEX, /<h2 class="zs-title" id="empresas-title">Empresas que confían en nosotros<\/h2>/);
  assert.doesNotMatch(bloque(INDEX, '<section class="zs-sec zs-sec--blanco" id="empresas"', '</header>'), /zs-lead/);
  assert.match(CSS, /transition:\s*transform \.8s/);
  assert.match(SCRIPT, /zs-logo__cara--dorso/);
  assert.match(SCRIPT, /tabindex="0"/);
  const efectos = leer('assets/js/landing-efectos.js');
  assert.match(efectos, /is-girada/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.zs-logo__giro\s*\{\s*transform:\s*none !important/);
});

test('Del estudio a la práctica: 4 columnas, 2 x 2 en tableta, 1 en celular; el panel crema baja con hover y foco', () => {
  assert.match(CSS, /\.zs-campos\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(CSS, /@media \(min-width: 480px\)\s*\{\s*\.zs-campos\s*\{\s*grid-template-columns:\s*repeat\(2,/);
  assert.match(CSS, /@media \(min-width: 900px\)\s*\{\s*\.zs-campos\s*\{\s*grid-template-columns:\s*repeat\(4,/);
  assert.equal((INDEX.match(/class="zs-campo__ver"/g) || []).length, 4);
  // Imágenes propias con respaldo a las actuales mientras no existan los archivos nuevos
  for (const n of ['conservacion', 'comportamiento', 'campo', 'apicultura']) {
    assert.ok(INDEX.includes('src="assets/img/landing/estudio/estudio-' + n + '.webp" onerror="this.onerror=null;this.src=\'assets/img/landing/area-'), 'falta respaldo de ' + n);
  }
  // El efecto solo existe con puntero fino, hover y sin reducir movimiento; la tarjeta es compacta (236 px) y el panel,
  // solo del alto del texto, baja 100 % en 1 s
  const mejora = CSS.match(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\) \{\s*\.zs-campo \{[\s\S]*?\n\}\n/);
  assert.ok(mejora, 'falta la mejora progresiva de campos');
  assert.match(mejora[0], /height:\s*236px/);
  assert.doesNotMatch(mejora[0], /height:\s*70%/);
  assert.match(mejora[0], /border-radius:\s*16px 16px 0 0/);
  assert.match(mejora[0], /cubic-bezier\(\.645, \.045, \.355, 1\)/);
  assert.match(mejora[0], /:focus-within \.zs-campo__txt\s*\{\s*transform:\s*translateY\(100%\)/);
  assert.match(mejora[0], /box-shadow:\s*0 0 20px 8px/);
  // Fuera de la mejora el texto queda debajo de la imagen y sin esconderse
  assert.doesNotMatch(CSS.split('/* Mejora progresiva (puntero fino, con hover, sin reducir movimiento): la foto')[0].split('/* Base (táctil, sin hover o reducir movimiento): imagen arriba')[1], /display:\s*none|opacity:\s*0/);
});

test('Beneficios: tarjeta que gira el panel al hover y foco solo como mejora; descripción siempre en el DOM y visible sin hover', () => {
  const mejora = CSS.match(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\) \{\s*\.zs-beneficio \{[\s\S]*?\n\}\n/);
  assert.ok(mejora, 'falta la mejora progresiva de beneficios');
  assert.match(mejora[0], /transform:\s*rotate\(-3deg\) scale\(1\.05\)/);
  assert.match(mejora[0], /transform:\s*scale\(0\) rotate\(-45deg\)/);
  assert.match(mejora[0], /opacity:\s*0; transform:\s*rotate\(-45deg\)/);
  assert.match(mejora[0], /opacity:\s*1; transform:\s*rotate\(0\)/);
  assert.match(mejora[0], /\.6s var\(--ease\)/);
  assert.match(mejora[0], /--ease:\s*cubic-bezier\(\.23, 1, \.32, 1\)/);
  // Seis tarjetas con título y descripción en el DOM, y el título del frente oculto a lectores (no se lee dos veces)
  const lista = bloque(INDEX, '<ul class="zs-beneficios">', '</ul>');
  assert.equal((lista.match(/<div class="zs-beneficio__panel"><h3>[^<]+<\/h3><p>[^<]{10,}<\/p><\/div>/g) || []).length, 6);
  assert.equal((lista.match(/<p class="zs-beneficio__frente" aria-hidden="true">/g) || []).length, 6);
  // Fuera de la mejora no se esconde nada: el frente duplicado es lo único con display none
  const base = CSS.split('/* Base (táctil, sin hover o reducir movimiento): ícono, título y descripción siempre visibles y estáticos */')[1].split('/* Mejora progresiva (puntero fino, con hover y sin reducir movimiento): el frente')[0];
  assert.doesNotMatch(base.replace('.zs-beneficio__frente { display: none; }', ''), /display:\s*none|opacity:\s*0|visibility:\s*hidden/);
});

test('apartado Membresía Zoorigen quitado: sin marcado, sin CSS muerto y sin anclas rotas', () => {
  assert.doesNotMatch(INDEX, /club-vip|Membresía Zoorigen|Resumen de la membresía/);
  for (const f of ['styles.css', 'assets/css/landing-catalog.css', 'assets/css/landing-nature.css', 'assets/css/landing-premium.css', 'assets/css/landing-redesign.css', 'assets/css/landing-structure.css', 'assets/css/landing-secciones.css', 'assets/js/landing-polish.js']) {
    assert.doesNotMatch(leer(f), /club-vip-banner|club-vip-card|btn--club-cta/, f);
  }
  for (const [nombre, h] of [['index', INDEX], ['aviso', AVISO], ['terminos', TERMINOS]]) {
    assert.doesNotMatch(h, /#club-vip/, nombre);
    const ids = new Set([...INDEX.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).concat(['encuesta']));   // #encuesta lo crea encuesta-landing.js
    const propios = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of h.matchAll(/href="#([^"]+)"/g)) assert.ok(propios.has(m[1]) || ids.has(m[1]), nombre + ': ancla rota #' + m[1]);
    if (nombre !== 'index') for (const m of h.matchAll(/href="index\.html#([^"]+)"/g)) assert.ok(ids.has(m[1]), nombre + ': ancla a la portada rota #' + m[1]);
  }
  assert.match(INDEX, /<a href="#panel">Plataforma<\/a>/);
  assert.match(INDEX, /<a class="zs-enlace" href="#panel">Conocer el club/);
  assert.ok(INDEX.includes('id="panel"'));
});

test('íconos de redes: círculo de 48 a 56 px, color sólido de marca al hover y foco, rebote y sin degradados', () => {
  assert.match(CSS, /\.zs-pie__redes a \{[^}]*width:\s*52px;\s*height:\s*52px;\s*border-radius:\s*50%/);
  assert.match(CSS, /\.zs-red--instagram \{ --c: #DD2A7B; \}/);
  assert.match(CSS, /\.zs-red--facebook \{ --c: #1877F2; \}/);
  assert.match(CSS, /\.zs-red--whatsapp \{ --c: #128C7E; \}/);
  assert.match(CSS, /\.zs-pie__redes a:hover, \.zs-pie__redes a:focus-visible, \.zs-pie__redes a:active \{ background: var\(--c\)/);
  assert.match(CSS, /@keyframes zs-rebote \{ 40% \{ transform: scale\(1\.4\); \} 60% \{ transform: scale\(\.8\); \} 80% \{ transform: scale\(1\.2\); \} 100% \{ transform: scale\(1\); \} \}/);
  assert.match(CSS, /animation:\s*zs-rebote \.4s linear/);
  assert.equal((PIE.match(/class="zs-red zs-red--/g) || []).length, 3);
  assert.match(PIE, /aria-label="Instagram de Zoorigen"/);
  assert.match(AVISO, /zs-red--instagram/);
  // Con reducir movimiento solo cambia el color
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.zs-pie__redes a:hover \.zs-i[^{]*\{\s*animation:\s*none/);
});

/* ---------------- Ronda 5: tarjetas compactas, tonos pálidos, mascota que se asoma ---------------- */
test('beneficios compactos: 1, 2 y 3 columnas, frente que desaparece sin encimarse y colores pálidos', () => {
  assert.match(CSS, /@media \(min-width: 480px\)\s*\{\s*\.zs-beneficios\s*\{\s*grid-template-columns:\s*repeat\(2,/);
  assert.match(CSS, /@media \(min-width: 800px\)\s*\{\s*\.zs-beneficios\s*\{\s*grid-template-columns:\s*repeat\(3,/);
  const mejora = CSS.match(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\) \{\s*\.zs-beneficio \{[\s\S]*?\n\}\n/)[0];
  assert.match(mejora, /min-height:\s*132px/);
  assert.match(mejora, /background:\s*var\(--zs-salvia\)/);
  assert.doesNotMatch(mejora, /background:\s*var\(--zs-verde\)/);
  // El frente se desvanece por completo (.25 s) y el panel entra opaco después, sin que los textos convivan
  assert.match(mejora, /\.zs-beneficio__frente \{[^}]*opacity:\s*0;\s*transition:\s*opacity \.25s ease/);
  assert.match(mejora, /\.zs-beneficio__panel\s*\{[^}]*background:\s*#FFFFFF/);
  assert.match(mejora, /transition:\s*transform \.6s var\(--ease\), opacity \.3s ease \.15s/);
});

test('mascota: usa la imagen del guía existente, respeta reducir movimiento y limita apariciones', () => {
  const JS = leer('assets/js/landing-mascota.js');
  assert.match(JS, /assets\/img\/guia\/guia-saludo-1\.webp/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets/img/guia/guia-saludo-1.webp')), 'la imagen debe existir');
  assert.match(JS, /prefers-reduced-motion: reduce[\s\S]{0,120}return;/);
  assert.match(JS, /MAX_POR_VISITA = 4/);
  assert.match(JS, /ENFRIAMIENTO = 8000/);
  assert.match(JS, /PAUSA = 1200/);
  assert.match(JS, /VISIBLE_MIN = 0\.5/);
  assert.match(JS, /document\.hidden/);
  assert.match(JS, /\.zg-panel:not\(\[hidden\]\)/);
  assert.match(JS, /aria-hidden/);
  assert.doesNotMatch(JS, EMOJI);
  assert.match(INDEX, /<script src="assets\/js\/landing-mascota\.js\?v=[\w.-]+" defer><\/script>/);
  // Secciones elegibles configuradas en el marcado
  assert.equal((INDEX.match(/data-mascota="\.zs-[a-z]+"/g) || []).length, 4);
  assert.match(CSS, /\.zs-mascota\s*\{[^}]*pointer-events:\s*none/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{ \.zs-mascota \{ display: none; \} \}/);
});

test('tarjetas: sin grises ni verde fuerte de fondo en pasos, beneficios y confianza', () => {
  for (const sel of ['.zs-logo__cara--dorso', '.zs-paso__fondo', '.zs-paso__esquina']) {
    const m = CSS.match(new RegExp(sel.replace(/\./g, '\\.') + '\\s*\\{[^}]*\\}'));
    assert.ok(m, sel);
    assert.doesNotMatch(m[0], /background:\s*var\(--zs-verde\)/, sel);
  }
});

/* ---------------- Ronda 6: paleta variada ---------------- */
function luminancia(hex) {
  const v = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const VAR = n => { const m = CSS.match(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})')); assert.ok(m, 'falta --' + n); return m[1]; };

test('paleta variada: al menos 5 acentos distintos definidos como variables y usados', () => {
  const acentos = ['zs-cielo', 'zs-terracota', 'zs-ambar', 'zs-indigo', 'zs-teal', 'zs-rosa'];
  const valores = acentos.map(VAR);
  assert.equal(new Set(valores.map(v => v.toLowerCase())).size, acentos.length, 'acentos repetidos');
  for (const a of acentos) {
    VAR(a + '-t');
    assert.ok(new RegExp('var\\(--' + a + '\\)').test(CSS), a + ' no se usa');
  }
  VAR('zs-azul-prof'); VAR('zs-indigo-prof'); VAR('zs-noche'); VAR('zs-arena'); VAR('zs-cielo-p');
  // Sin rojo puro ni colores chillones: ninguno de los acentos supera 190 en un solo canal con los otros < 60
  for (const v of valores) {
    const [r, g, b] = v.replace('#', '').match(/../g).map(x => parseInt(x, 16));
    assert.ok(!(r > 190 && g < 60 && b < 60), 'rojo puro: ' + v);
  }
});

test('paleta variada: todos los pares de color pasan AA (4.5:1)', () => {
  const pares = [];
  for (const a of ['zs-cielo', 'zs-terracota', 'zs-ambar', 'zs-indigo', 'zs-teal', 'zs-rosa']) {
    pares.push([a + ' sobre su tinte', VAR(a), VAR(a + '-t')]);
    pares.push([a + ' sobre blanco', VAR(a), '#FFFFFF']);
    pares.push([a + ' sobre arena', VAR(a), VAR('zs-arena')]);
    pares.push(['blanco sobre ' + a + ' (botones, avatares)', '#FFFFFF', VAR(a)]);
    pares.push(['tinta sobre tinte de ' + a, '#1F2933', VAR(a + '-t')]);
  }
  pares.push(['texto gris sobre cielo pálido', '#52606D', VAR('zs-cielo-p')]);
  pares.push(['texto gris sobre arena', '#52606D', VAR('zs-arena')]);
  pares.push(['texto gris sobre crema', '#52606D', '#F6F4EF']);
  pares.push(['blanco sobre azul profundo (Tu plataforma)', '#FFFFFF', VAR('zs-azul-prof')]);
  pares.push(['lead claro sobre azul profundo', '#DCE6F0', VAR('zs-azul-prof')]);
  pares.push(['dorado pálido sobre azul profundo', '#F4D58D', VAR('zs-azul-prof')]);
  pares.push(['lead claro sobre índigo profundo (Contacto)', '#E1E3F4', VAR('zs-indigo-prof')]);
  pares.push(['dorado pálido sobre índigo profundo', '#F4D58D', VAR('zs-indigo-prof')]);
  pares.push(['enlaces del pie sobre azul noche', '#DCE6F0', VAR('zs-noche')]);
  pares.push(['texto del pie sobre azul noche', '#B9C8D8', VAR('zs-noche')]);
  pares.push(['títulos del pie (dorado pálido) sobre azul noche', '#F4D58D', VAR('zs-noche')]);
  pares.push(['insignia de Facebook', '#FFFFFF', '#1565C0']);
  pares.push(['botón principal verde de marca', '#FFFFFF', '#1F5F3A']);
  pares.push(['botón tinta', '#FFFFFF', '#1F2933']);
  pares.push(['etiqueta ámbar sobre su tinte', '#7A5200', '#FBF1D9']);
  const bajos = pares.filter(([, f, b]) => contraste(f, b) < 4.5).map(([n, f, b]) => n + ' ' + contraste(f, b).toFixed(2));
  assert.deepEqual(bajos, [], 'pares bajo 4.5:1');
});

test('en reposo la portada conserva su aspecto (crema, blanco y verde de marca); la paleta variada solo vive en estados de efecto', () => {
  const secciones = [...INDEX.matchAll(/<section class="([^"]*)"/g)].map(m => m[1]);
  const verdes = secciones.filter(c => /zs-sec--verde\b/.test(c));
  assert.equal(verdes.length, 2, 'Tu plataforma y Reseñas (verde pálido) como en la ronda 5');
  assert.match(INDEX, /<section class="zs-sec zs-sec--verde" id="panel"/);
  assert.doesNotMatch(INDEX, /zs-sec--(azul|cielo|arena)\b|zs-boton--tinta/, 'sin clases de la ronda 6');
  assert.doesNotMatch(CSS, /footer\.zs-pie \{ background: var\(--zs-noche\)/);
  assert.doesNotMatch(CSS, /\.zs-contacto \{ background: var\(--zs-indigo-prof\)/);
  assert.doesNotMatch(CSS, /\.zs-chip\.is-active, \.zs-chip\.is-active:hover \{ background: var\(--zs-tinta\)/);
  assert.match(CSS, /\.zs-pie \{[^}]*background: var\(--zs-pie\)/);
  assert.match(CSS, /\.zs-sec--verde \{ --zs-fondo: var\(--zs-verde\); \}/);
  assert.match(CSS, /\.zs-paso__fondo \{[^}]*background: var\(--zs-salvia\)/);
  // El estado de reposo de cada tarjeta usa verde o tintes de la ronda 5; el color por tarjeta se declara solo con :hover/:focus
  const bloqueEfectos = CSS.split('COLOR EN ESTADOS DE EFECTO (ronda 7)')[1];
  assert.ok(bloqueEfectos, 'falta el bloque de efectos');
  // Un acento distinto por área, paso, beneficio, tarjeta de campo, cifra, curso, reseña y logo
  assert.equal((bloqueEfectos.match(/#areas \.area-tw:nth-child\(\d\) \{ --acc:/g) || []).length, 6);
  assert.equal((bloqueEfectos.match(/\.zs-paso:nth-child\(\d\) \{ --acc:/g) || []).length, 3);
  assert.equal((bloqueEfectos.match(/\.zs-beneficio:nth-child\(\d\) \{ --acc:/g) || []).length, 6);
  assert.equal((bloqueEfectos.match(/\.zs-campo:nth-child\(\d\) \{ --acc:/g) || []).length, 4);
  assert.equal((bloqueEfectos.match(/\.zs-logo:nth-child\(6n \+ \d\) \{ --acc:/g) || []).length, 6);
  assert.equal((bloqueEfectos.match(/\.zs-curso:nth-child\(6n \+ \d\) \{ --acc:/g) || []).length, 6);
  // El reverso de Confianza toma el tinte de cada tarjeta (nunca un solo verde agua)
  assert.match(bloqueEfectos, /\.zs-logo__cara--dorso \{ background: var\(--tin, var\(--zs-salvia\)\)/);
  // La esquina que se expande y el panel de beneficios usan el tinte de su tarjeta
  assert.match(bloqueEfectos, /\.zs-paso__fondo \{ background: var\(--tin, var\(--zs-salvia\)\)/);
  assert.match(bloqueEfectos, /\.zs-beneficio:hover \.zs-beneficio__panel[^{]*\{ background: var\(--tin, #FFFFFF\)/);
  // Ninguna regla de color por tarjeta se aplica en reposo: las que usan var(--acc) van con :hover, :focus o :open, o definen --acc
  const reposo = bloqueEfectos.split('\n').filter(l => /var\(--(acc|tin)/.test(l) && !/:hover|:focus|\[open\]|\.is-active|--acc:|\.zs-paso__fondo \{|\.zs-logo__cara--dorso/.test(l));
  assert.deepEqual(reposo, [], 'reglas con color por tarjeta fuera de un estado de efecto');
  // Contraste de los textos que cambian de color en esos estados (acento sobre su tinte)
  for (const a of ['cielo', 'terracota', 'ambar', 'indigo', 'teal', 'rosa']) assert.ok(contraste(VAR('zs-' + a), VAR('zs-' + a + '-t')) >= 4.5, a);
});

test('portada sin el botón flotante "subir": marcado, CSS y JS fuera', () => {
  for (const [n, t] of [['index', INDEX], ['aviso', AVISO], ['terminos', TERMINOS], ['secciones.css', CSS], ['script.js', SCRIPT], ['efectos', leer('assets/js/landing-efectos.js')], ['styles.css', leer('styles.css')]]) {
    assert.doesNotMatch(t, /backToTop|Regresar arriba/, n);
  }
  assert.doesNotMatch(INDEX, /<button[^>]*>↑<\/button>/);
  assert.match(INDEX, /class="floating-whatsapp"/);
});

test('el botón flotante del guía muestra la imagen pensando', () => {
  const JS = leer('assets/js/chatbot-landing.js');
  assert.match(JS, /var EXPR_LANZADOR = 'thinking';/);
  assert.match(JS, /imagenExpresion\(EXPR_LANZADOR\)/);
  const G = leer('assets/js/guia-personaje.js');
  assert.match(G, /thinking: CARPETA \+ 'guia-pensando\.webp'/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets/img/guia/guia-pensando.webp')));
});
