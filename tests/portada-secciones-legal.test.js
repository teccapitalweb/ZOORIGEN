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

test('Del estudio a la práctica: 4 / 2 x 2 / 1 columnas; primero la imagen y después el texto (hover en escritorio, bucle en celular)', () => {
  assert.match(CSS, /\.zs-campos \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(CSS, /@media \(min-width: 480px\) \{ \.zs-campos \{ grid-template-columns: repeat\(2,/);
  assert.match(CSS, /@media \(min-width: 900px\) \{ \.zs-campos \{ grid-template-columns: repeat\(4,/);
  assert.equal((INDEX.match(/class="zs-campo__ver"/g) || []).length, 4);
  for (const n of ['conservacion', 'comportamiento', 'campo', 'apicultura']) {
    assert.ok(INDEX.includes('src="assets/img/landing/estudio/estudio-' + n + '.webp" onerror="this.onerror=null;this.src=\'assets/img/landing/area-'), 'falta respaldo de ' + n);
  }
  // Base (reducir movimiento): imagen arriba y texto debajo, nada escondido
  const base = CSS.split('/* Base (reducir movimiento): imagen arriba y texto debajo, todo visible y estático */')[1].split('/* Con movimiento permitido: la foto ocupa toda la tarjeta')[0];
  assert.doesNotMatch(base, /display:\s*none|opacity:\s*0|translateY/);
  // Tarjeta compacta de 236 px con el panel sobre la foto
  const capa = CSS.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.zs-campo \{ height: 236px;[\s\S]*?\n\}\n/);
  assert.ok(capa, 'falta la capa de movimiento');
  assert.match(capa[0], /transform:\s*translateY\(100%\)/);
  // Escritorio: franja de título en reposo, panel sube al hover/foco en 0.7 s, intro con 0.8 s de espera
  const esc = CSS.match(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\) \{\s*\.zs-campo \{ --tira: 60px;[\s\S]*?\n\}\n/);
  assert.ok(esc, 'falta el efecto de escritorio');
  assert.match(esc[0], /translateY\(calc\(100% - var\(--tira\)\)\)/);
  assert.match(esc[0], /transition: transform \.7s/);
  assert.match(esc[0], /:focus-within \.zs-campo__txt \{ transform: translateY\(0\)/);
  assert.match(esc[0], /\.zs-campos:not\(\.zs-visto\) \.zs-campo__txt \{ transform: translateY\(100%\)/);
  assert.match(esc[0], /transition-delay: \.8s/);
  // Celular / sin hover: bucle constante de 6.5 s, escalonado 0.9 s
  assert.match(CSS, /@media \(prefers-reduced-motion: no-preference\) and \(hover: none\), \(prefers-reduced-motion: no-preference\) and \(pointer: coarse\) \{\s*\.zs-campo__txt \{ animation: zs-panel-sube 6\.5s linear infinite; animation-delay: calc\(var\(--n, 0\) \* \.9s\)/);
  assert.match(CSS, /@keyframes zs-panel-sube \{\s*0%, 40% \{ transform: translateY\(100%\)/);
  assert.match(CSS, /\.zs-campos\.zs-fuera \.zs-campo__txt/);
  assert.match(CSS, /\.zs-pestana-oculta \.zs-campo__txt/);
  // La intro y la pausa las maneja el JS
  const JS = leer('assets/js/landing-efectos.js');
  assert.match(JS, /zs-intro-fin/);
  assert.match(JS, /zs-pestana-oculta/);
});

test('Beneficios: la tarjeta gira sobre su eje vertical (sin inclinarse); bucle constante en celular; estática con reducir movimiento', () => {
  // Marcado: dos caras por tarjeta, descripción siempre en el DOM y título del frente oculto a lectores
  const lista = bloque(INDEX, '<ul class="zs-beneficios">', '</ul>');
  assert.equal((lista.match(/<div class="zs-beneficio__giro"><div class="zs-beneficio__cara zs-beneficio__cara--frente">/g) || []).length, 6);
  assert.equal((lista.match(/<div class="zs-beneficio__cara zs-beneficio__cara--dorso"><h3>[^<]+<\/h3><p>[^<]{10,}<\/p><\/div>/g) || []).length, 6);
  assert.equal((lista.match(/<p class="zs-beneficio__frente" aria-hidden="true">/g) || []).length, 6);
  assert.doesNotMatch(lista, /zs-beneficio__panel/);
  // Columnas 1 / 2 / 3
  assert.match(CSS, /@media \(min-width: 480px\) \{ \.zs-beneficios \{ grid-template-columns: repeat\(2,/);
  assert.match(CSS, /@media \(min-width: 800px\) \{ \.zs-beneficios \{ grid-template-columns: repeat\(3,/);
  // Base estática: nada escondido salvo el frente duplicado
  const base = CSS.split('/* Base (reducir movimiento): ícono, título y descripción a la vista y quietos, en una fila */')[1].split('/* Con movimiento permitido: cada tarjeta es una carta de dos caras.')[0];
  assert.doesNotMatch(base.replace('.zs-beneficio__frente { display: none; }', ''), /display:\s*none|opacity:\s*0|visibility:\s*hidden|rotate/);
  // Con movimiento: perspectiva, caras con backface-visibility y reverso a 180 grados; sin inclinar la tarjeta
  const mov = CSS.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.zs-beneficio \{ min-height: 132px;[\s\S]*?\n\}\n/)[0];
  assert.match(mov, /perspective: 900px/);
  assert.match(mov, /backface-visibility: hidden/);
  assert.match(mov, /\.zs-beneficio__cara--dorso \{[^}]*transform: rotateY\(180deg\)/);
  assert.match(mov, /var\(--tin, #FFFFFF\)/);
  assert.doesNotMatch(CSS, /rotate\(-3deg\) scale\(1\.05\)/);
  assert.doesNotMatch(CSS, /\.zs-beneficio__panel/);
  // Escritorio: gira al hover/foco en 0.7 s
  const esc = CSS.match(/@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\) \{\s*\.zs-beneficio__giro \{ transition: transform \.7s[\s\S]*?\n\}\n/);
  assert.ok(esc, 'falta el giro de escritorio');
  assert.match(esc[0], /:hover \.zs-beneficio__giro, \.zs-beneficio:focus-visible \.zs-beneficio__giro \{ transform: rotateY\(180deg\)/);
  // Celular / sin hover: 6.6 s por ciclo (3 s + 0.8 + 2 s + 0.8), escalonado 0.7 s y con pausa fuera de pantalla
  assert.match(CSS, /\.zs-beneficio__giro \{ animation: zs-voltea 6\.6s linear infinite; animation-delay: calc\(var\(--n, 0\) \* \.7s\)/);
  assert.match(CSS, /@keyframes zs-voltea \{\s*0%, 45\.45% \{ transform: rotateY\(0deg\)/);
  assert.match(CSS, /\.zs-beneficios\.zs-fuera \.zs-beneficio__giro, \.zs-pestana-oculta \.zs-beneficio__giro \{ animation-play-state: paused; \}/);
  assert.equal((CSS.match(/\.zs-beneficio:nth-child\(\d\) \{ --n: \d; \}/g) || []).length, 6);
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

test('íconos de redes: círculo de 48 a 56 px, naranja y dorado al hover y foco con ícono legible, rebote y sin degradados', () => {
  assert.match(CSS, /\.zs-pie__redes a \{[^}]*width:\s*52px;\s*height:\s*52px;\s*border-radius:\s*50%/);
  assert.match(CSS, /\.zs-red--instagram \{ --c: var\(--zs-naranja\); --ic: #FFFFFF; \}/);
  assert.match(CSS, /\.zs-red--facebook \{ --c: var\(--zs-dorado\); --ic: var\(--zs-tinta\); \}/);
  assert.match(CSS, /\.zs-red--whatsapp \{ --c: var\(--zs-naranja\); --ic: #FFFFFF; \}/);
  assert.match(CSS, /\.zs-pie__redes a:hover, \.zs-pie__redes a:focus-visible, \.zs-pie__redes a:active \{ background: var\(--c\); color: var\(--ic/);
  assert.match(CSS, /@keyframes zs-rebote \{ 40% \{ transform: scale\(1\.4\); \} 60% \{ transform: scale\(\.8\); \} 80% \{ transform: scale\(1\.2\); \} 100% \{ transform: scale\(1\); \} \}/);
  assert.match(CSS, /animation:\s*zs-rebote \.4s linear/);
  assert.equal((PIE.match(/class="zs-red zs-red--/g) || []).length, 3);
  assert.match(PIE, /aria-label="Instagram de Zoorigen"/);
  assert.match(AVISO, /zs-red--instagram/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.zs-pie__redes a:hover \.zs-i[^{]*\{\s*animation:\s*none/);
});

/* ---------------- Ronda 5: tarjetas compactas, tonos pálidos, mascota que se asoma ---------------- */
test('beneficios compactos: 132 px de alto y reverso en tinte naranja o dorado con texto oscuro', () => {
  assert.match(CSS, /\.zs-beneficio \{ min-height: 132px;/);
  assert.match(CSS, /\.zs-beneficio__cara--frente \{ background: var\(--zs-salvia\)/);
  assert.match(CSS, /\.zs-beneficio__cara--dorso p \{[^}]*color: var\(--zs-tinta\)/);
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

const ACENTOS = {
  naranja: VAR('zs-naranja'), naranjaD: VAR('zs-naranja-d'), naranjaT: VAR('zs-naranja-t'),
  dorado: VAR('zs-dorado'), doradoTexto: VAR('zs-dorado-texto'), doradoT: VAR('zs-dorado-t')
};

test('paleta: la portada define solo dos acentos de efecto (naranja y dorado) además del verde de marca y la tinta', () => {
  const nombres = [...new Set([...CSS.matchAll(/--zs-(naranja|dorado|cielo|terracota|ambar|indigo|pizarra|cobre|teal|rosa|azul|arena|noche)[a-z-]*:/g)].map(m => m[0]))];
  for (const n of nombres) assert.match(n, /^--zs-(naranja|dorado)/, 'variable de acento ajena: ' + n);
  assert.doesNotMatch(CSS, /zs-(cielo|terracota|ambar|indigo|pizarra|cobre|teal|rosa|arena|azul-prof|noche)\b/);
  // Nada azul, morado ni rosa en las hojas de la portada (las únicas variables de color de acento son las dos)
  assert.ok(ACENTOS.naranja && ACENTOS.dorado);
  assert.notEqual(ACENTOS.naranja.toLowerCase(), ACENTOS.dorado.toLowerCase());
});

test('paleta: todos los pares de color naranja/dorado pasan AA (4.5:1)', () => {
  const A = ACENTOS;
  const pares = [
    ['naranja sobre su tinte', A.naranja, A.naranjaT],
    ['naranja sobre blanco', A.naranja, '#FFFFFF'],
    ['naranja sobre crema', A.naranja, '#F6F4EF'],
    ['blanco sobre naranja (botón, avatar, ícono de red)', '#FFFFFF', A.naranja],
    ['dorado oscuro sobre su tinte', A.doradoTexto, A.doradoT],
    ['dorado oscuro sobre blanco', A.doradoTexto, '#FFFFFF'],
    ['tinta sobre dorado (relleno, ícono de Facebook)', '#1F2933', A.dorado],
    ['tinta sobre tinte naranja', '#1F2933', A.naranjaT],
    ['tinta sobre tinte dorado', '#1F2933', A.doradoT],
    ['texto gris sobre tinte naranja', '#52606D', A.naranjaT],
    ['botón principal verde de marca', '#FFFFFF', '#1F5F3A']
  ];
  const bajos = pares.filter(([, f, b]) => contraste(f, b) < 4.5).map(([n, f, b]) => n + ' ' + contraste(f, b).toFixed(2));
  assert.deepEqual(bajos, [], 'pares bajo 4.5:1');
  // El naranja decorativo (sin texto encima) solo necesita 3:1 contra el fondo blanco
  assert.ok(contraste(A.naranjaD, '#FFFFFF') >= 2.5);
});

test('en reposo la portada conserva su aspecto (crema, blanco y verde de marca); naranja y dorado solo viven en estados de efecto', () => {
  const secciones = [...INDEX.matchAll(/<section class="([^"]*)"/g)].map(m => m[1]);
  assert.equal(secciones.filter(c => /zs-sec--verde\b/.test(c)).length, 2, 'Tu plataforma y Reseñas (verde pálido) como en la ronda 5');
  assert.match(INDEX, /<section class="zs-sec zs-sec--verde" id="panel"/);
  assert.doesNotMatch(INDEX, /zs-sec--(azul|cielo|arena)\b|zs-boton--tinta/);
  assert.match(CSS, /\.zs-pie \{[^}]*background: var\(--zs-pie\)/);
  assert.match(CSS, /\.zs-sec--verde \{ --zs-fondo: var\(--zs-verde\); \}/);
  assert.match(CSS, /\.zs-paso__fondo \{[^}]*background: var\(--zs-salvia\)/);
  const efectos = CSS.split('COLOR EN ESTADOS DE EFECTO (ronda 9)')[1];
  assert.ok(efectos, 'falta el bloque de efectos');
  // Alternan naranja (nones) y dorado (pares) en todas las tarjetas con efecto
  for (const sel of ['.zs-logo:nth-child(odd)', '.zs-paso:nth-child(odd)', '.zs-beneficio:nth-child(odd)', '.zs-campo:nth-child(odd)', '#areas .area-tw:nth-child(odd)', '.zs-curso:nth-child(odd)', '.zs-cifra:nth-child(odd)', '.zs-contacto__lista li:nth-child(odd)', '.zs-faq details:nth-child(odd)']) {
    assert.ok(efectos.includes(sel), 'falta ' + sel + ' entre los naranjas');
    assert.ok(efectos.includes(sel.replace('odd', 'even')) || sel.includes('--a'), 'falta el par dorado de ' + sel);
  }
  assert.match(efectos, /--acc: var\(--zs-naranja\); --tin: var\(--zs-naranja-t\); --fill: var\(--zs-naranja\); --on: #FFFFFF;/);
  assert.match(efectos, /--acc: var\(--zs-dorado-texto\); --tin: var\(--zs-dorado-t\); --fill: var\(--zs-dorado\); --on: var\(--zs-tinta\);/);
  assert.match(efectos, /\.zs-logo__cara--dorso \{ background: var\(--tin, var\(--zs-salvia\)\)/);
  assert.match(efectos, /\.zs-paso__fondo \{ background: var\(--tin, var\(--zs-salvia\)\)/);
  // Ninguna regla de color por tarjeta se aplica en reposo
  const reposo = efectos.split('\n').filter(l => /var\(--(acc|tin|fill)/.test(l) && !/:hover|:focus|\[open\]|\.is-active|--acc:|\.zs-paso__fondo \{|\.zs-logo__cara--dorso|bucle táctil/.test(l));
  assert.deepEqual(reposo, [], 'reglas con color por tarjeta fuera de un estado de efecto');
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

/* ---------------- Ronda 8: sin morado, violeta, lila ni índigo ---------------- */
function tono(hex) {
  const v = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
  const mx = Math.max(...v), mn = Math.min(...v), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0 };
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === v[0] ? (v[1] - v[2]) / d + (v[1] < v[2] ? 6 : 0) : mx === v[1] ? (v[2] - v[0]) / d + 2 : (v[0] - v[1]) / d + 4;
  return { h: h * 60, s: s * 100 };
}
test('sin morado: ningún color de la portada, las páginas legales ni el Club cae entre 255 y 310 de tono (HSL, saturación > 15 %)', () => {
  const dirs = ['assets/css', 'assets/js', 'pages', '.', 'css'];
  const hallazgos = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(RAIZ, d))) {
      if (!/\.(css|js|html)$/.test(f)) continue;
      const ruta = path.join(RAIZ, d, f);
      if (!fs.statSync(ruta).isFile()) continue;
      const texto = fs.readFileSync(ruta, 'utf8');
      for (const m of texto.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
        const { h, s } = tono(m[1]);
        if (h >= 255 && h <= 310 && s > 15) hallazgos.push(d + '/' + f + ' #' + m[1]);
      }
      for (const m of texto.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
        const hex = [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
        const { h, s } = tono(hex);
        if (h >= 255 && h <= 310 && s > 15) hallazgos.push(d + '/' + f + ' ' + m[0] + ')');
      }
    }
  }
  assert.deepEqual(hallazgos, [], 'tonos morados: ' + hallazgos.join(' | '));
});

test('sin índigo, cielo, terracota, pizarra, teal ni rosa en la portada, el aviso y los términos', () => {
  assert.doesNotMatch(INDEX + AVISO + TERMINOS, /indigo|índigo/i);
  assert.doesNotMatch(CSS, /--zs-(indigo|cielo|terracota|ambar|pizarra|teal|rosa)/);
  assert.doesNotMatch(CSS, /#(4B4E9E|ECECF8|2B2F6B|1E5A8A|E6F0F8|AE4310|0F766E|E1F2EF|A64550|F8E6E4|3C5A73|E7EDF2)\b/i);
});
