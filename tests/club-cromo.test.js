'use strict';
// Continuidad al cambiar de apartado: el HTML de cada página del Club ya trae el tema, las tipografías, la barra lateral, la
// barra superior, la inferior y la tarjeta de título, así que el primer pintado está completo y no hay parpadeo ni saltos.
// El marcado lo escribe tools/generar-cromo-club.js con las MISMAS funciones que usa el navegador (club-shell.js, club-seccion.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const GEN = require('../tools/generar-cromo-club.js');
const SHELL = require('../assets/js/club-shell.js');

const TODAS = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^(club-.*|admin-club|verificar-correo)\.html$/.test(f) && !['club.html', 'club-noticias.html'].includes(f));
const PANEL = TODAS.filter(f => /<aside class="club-sidebar" id="sidebar"/.test(leer('pages/' + f)));
const AUTH = TODAS.filter(f => !PANEL.includes(f));

test('hay páginas del panel y de acceso que revisar', () => {
  assert.ok(PANEL.length >= 18, 'páginas con barra lateral: ' + PANEL.length);
  assert.deepEqual(AUTH.sort(), ['admin-club.html', 'club-gracias.html', 'club-login.html', 'club-registro.html', 'verificar-correo.html']);
});

/* ───── A) Tema sin destello ───── */
test('el script de tema es el PRIMER elemento del <head> en panel, admin y acceso (no en portada ni certificado)', () => {
  for (const f of TODAS) {
    const h = leer('pages/' + f);
    assert.match(h, /<head>\s*<script>\/\*zs-tema\*\/[\s\S]*?<\/script>/, f + ': script de tema primero');
    assert.ok(h.indexOf('<meta charset') < 1024, f + ': <meta charset> dentro de los primeros 1024 bytes');
    assert.ok(h.indexOf('/*zs-tema*/') < h.indexOf('<link rel="stylesheet"'), f + ': antes que cualquier CSS');
  }
  for (const f of ['index.html', 'pages/ver-certificado.html', 'pages/verificar.html']) assert.doesNotMatch(leer(f), /\/\*zs-tema\*\//, f + ': la portada y el certificado no llevan el script');
});

test('el script de tema usa la misma clave y el mismo valor por defecto que club.js, y pone el estado de la membresía', () => {
  const h = leer('pages/club-canal.html');
  const codigo = /<script>\/\*zs-tema\*\/([\s\S]*?)<\/script>/.exec(h)[1];
  function correr(almacen, falla) {
    const attrs = {};
    const ctx = {
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
      localStorage: { getItem: (k) => { if (falla) throw new Error('bloqueado'); return Object.prototype.hasOwnProperty.call(almacen, k) ? almacen[k] : null; } }
    };
    vm.runInNewContext(codigo, ctx);
    return attrs;
  }
  assert.deepEqual(correr({}), { 'data-theme': 'light' }, 'sin nada guardado: claro (igual que club.js)');
  assert.deepEqual(correr({ zoo_theme: 'dark' }), { 'data-theme': 'dark' });
  assert.deepEqual(correr({ zoo_theme: 'light', zoo_plan: 'active' }), { 'data-theme': 'light', 'data-plan': 'active' });
  assert.deepEqual(correr({ zoo_theme: 'dark', zoo_plan: 'expired' }), { 'data-theme': 'dark', 'data-plan': 'expired' });
  assert.deepEqual(correr({ zoo_plan: '<script>' }), { 'data-theme': 'light' }, 'un valor raro de plan se ignora');
  assert.deepEqual(correr({}, true), { 'data-theme': 'light' }, 'sin acceso al almacenamiento sigue funcionando');
  assert.match(leer('assets/js/club.js'), /localStorage\.getItem\('zoo_theme'\) \|\| 'light'/);
});

test('el CSS pinta el lienzo y el color-scheme según <html data-theme> desde el primer cuadro', () => {
  const css = leer('assets/css/club-shell.css');
  assert.match(css, /html\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark;[^}]*background-color:\s*#0F1215/);
  assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light;[^}]*background-color:\s*#F6F4EF/);
});

/* ───── B) Barras desde el primer pintado ───── */
test('el generador deja todas las páginas al día (volver a correrlo no cambia nada)', () => {
  for (const f of TODAS) {
    const h = leer('pages/' + f);
    assert.equal(GEN.procesar(h, path.join(RAIZ, 'pages', f)), h, f + ': corre `node tools/generar-cromo-club.js`');
  }
});

test('la barra lateral estática trae el menú completo, el bloque de plan y SOLO marcado (sin nombre ni correo)', () => {
  const total = SHELL.GRUPOS.reduce((n, g) => n + g.items.length, 0);
  for (const f of PANEL) {
    const h = leer('pages/' + f);
    const aside = /<aside class="club-sidebar" id="sidebar" data-zs-estatico>([\s\S]*?)<\/aside>/.exec(h);
    assert.ok(aside, f + ': barra lateral estática');
    const enlaces = (aside[1].match(/<a href="club-[\w-]+\.html" class=""/g) || []).concat(aside[1].match(/<a href="club-[\w-]+\.html" class=" is-active"/g) || []);
    assert.equal(enlaces.length, total, f + ': los ' + total + ' apartados del menú');
    assert.equal((aside[1].match(/ is-active/g) || []).length, 1, f + ': exactamente un apartado activo');
    assert.match(aside[1], /data-instalar="1"/);
    assert.match(aside[1], /club-sidebar__plan zs-plan-esq/);
    assert.doesNotMatch(aside[1], /@|zoorigen-demo|Miembro Demo/, f + ': sin correo');
  }
  assert.match(leer('pages/club-pdfs.html'), /class=" is-active"><span class="icon">[\s\S]*?<\/span>PDFs y materiales/);
  assert.match(leer('pages/club-infusiones.html'), /class=" is-active"><span class="icon">[\s\S]*?<\/span>Herramientas clínicas/, 'infusiones marca lo mismo que marcará el JavaScript');
});

test('la barra superior, la inferior del celular y el botón de WhatsApp vienen escritos en el HTML', () => {
  for (const f of PANEL) {
    const h = leer('pages/' + f);
    assert.match(h, /<main class="club-main"[^>]*>\s*<header class="zs-topbar" id="zsTopbar">/, f + ': barra superior como primer hijo');
    assert.match(h, /<nav class="zs-bottom" id="zsBottom"/, f + ': barra inferior');
    assert.match(h, /<div class="zs-wa" id="zsWa" data-vip="0">/, f + ': WhatsApp');
    assert.equal((h.match(/id="zsTopbar"/g) || []).length, 1);
    assert.equal((h.match(/id="zsBottom"/g) || []).length, 1);
    // una pestaña marcada por cada juego de pestañas (miembro y cuenta gratuita comparten Inicio, Cursos, PDFs y Más)
    const marcadas = (h.match(/class="zs-tab[^"]*is-active"/g) || []).length;
    assert.ok(marcadas >= 1 && marcadas <= 2, f + ': pestaña activa por juego (' + marcadas + ')');
  }
});

test('el JavaScript completa lo estático (no lo duplica) y la sesión inválida sigue redirigiendo', () => {
  const shell = leer('assets/js/club-shell.js');
  assert.match(shell, /completarBarra\(barra, sesion\)/);
  assert.match(shell, /document\.getElementById\('zsBottom'\) \? ''/);
  assert.match(shell, /document\.getElementById\('zsWa'\) \? ''/);
  assert.doesNotMatch(shell, /document\.getElementById\('zsTopbar'\)\) return false/, 'ya no se rinde si la barra existe');
  const club = leer('assets/js/club.js');
  assert.match(club, /if \(!user\) \{ window\.location\.href = 'club-login\.html'; return resolve\(null\); \}/);
});

test('club.js guarda SOLO el estado de la membresía y lo borra al cerrar sesión', () => {
  const club = leer('assets/js/club.js');
  const g = /_guardarEstadoPlan\(session\) \{[\s\S]*?\n  \},/.exec(club)[0];
  assert.match(g, /localStorage\.setItem\('zoo_plan', estado\)/);
  assert.doesNotMatch(g, /email|name|uid|phone/);
  assert.match(club, /localStorage\.removeItem\('zoo_plan'\)/);
});

test('estadoPlan y las piezas de marcado puras', () => {
  assert.equal(SHELL.estadoPlan('active'), 'active');
  assert.equal(SHELL.estadoPlan('cancelled_active'), 'cancelled_active');
  assert.equal(SHELL.estadoPlan('pending_payment'), 'free');
  assert.equal(SHELL.estadoPlan(undefined), 'free');
  const lateral = SHELL.barraLateralHTML('foro');
  assert.equal((lateral.match(/ is-active/g) || []).length, 1);
  assert.match(lateral, /href="club-foro\.html" class=" is-active"/);
  assert.match(SHELL.barraInferiorHTML('foro'), /class="zs-tab is-active" id="zsMas"/, 'Foro cae en "Más"');
  assert.match(SHELL.barraInferiorHTML('biblioteca'), /class="zs-tab is-active" href="club-biblioteca\.html"/);
  assert.match(SHELL.barraSuperiorHTML(null), /class="zs-quien"/);
  assert.match(SHELL.barraSuperiorHTML({ name: 'Ana López' }), /class="zs-quien is-listo"[\s\S]*zs-quien__n">Ana</);
});

/* ───── C) Tarjeta de título estática ───── */
test('cada apartado trae su tarjeta zs-seccion ya escrita, con título, píldora y personaje precargado', () => {
  const conTarjeta = PANEL.filter(f => f !== 'club-dashboard.html');
  for (const f of conTarjeta) {
    const h = leer('pages/' + f);
    const m = /<header class="zs-seccion[^"]*"[^>]*>/.exec(h);
    assert.ok(m, f + ': tarjeta estática');
    assert.match(h, /<h1 class="zs-seccion__titulo">[^<]+/, f + ': título');
    assert.match(h, /class="zs-seccion__pildora"/, f + ': píldora');
    assert.doesNotMatch(h, /<use href="#zi-[\w-]+"\/><\/svg><span>/, f + ': íconos de la píldora en línea, sin esperar al sprite');
    if (/zs-personaje__img/.test(h)) {
      const src = /class="zs-personaje__img" src="([^"]+)"/.exec(h)[1];
      assert.ok(h.includes('<link rel="preload" href="' + src + '" as="image"'), f + ': precarga del personaje ' + src);
      assert.match(h, /class="zs-personaje__img"[^>]*width="\d+" height="\d+"/, f + ': personaje con ancho y alto');
    }
  }
  // la firma de la tarjeta estática es la de la configuración que la página le pasa a montar(): por eso no se vuelve a pintar
  GEN.prepararEntorno();
  const SECCION = require('../assets/js/club-seccion.js');
  let conFirma = 0;
  for (const f of conTarjeta) {
    const h = leer('pages/' + f);
    const cfg = GEN.extraerCfg(h);
    if (!cfg) continue;
    conFirma++;
    assert.ok(h.includes('data-zs-firma="' + SECCION.firmaCfg(cfg) + '"'), f + ': la firma de la tarjeta coincide con su configuración');
  }
  assert.ok(conFirma >= 14, 'tarjetas con configuración en la página: ' + conFirma);
  const dash = leer('pages/club-dashboard.html');
  assert.match(dash, /<div id="inicioSaludo"><header class="zs-seccion zs-inicio"/);
  assert.match(dash, /\/\*zs-saludo\*\//, 'el saludo por hora no espera a Firebase');
});

test('las zonas que se llenan con datos reservan su altura antes de que lleguen', () => {
  const css = leer('assets/css/club-inicio.css');
  assert.match(css, /#resumeCard:empty\s*\{\s*min-height:\s*\d+px/);
  assert.match(css, /#invitaCont:empty\s*\{\s*min-height:\s*\d+px/);
  assert.match(css, /@media \(max-width: 699px\)[^}]*#resumeCard:empty/);
  const shell = leer('assets/css/club-shell.css');
  assert.match(shell, /\.zs-aviso-reserva\s*\{\s*display:\s*none;/);
  assert.match(shell, /html\[data-plan="free"\] \.zs-aviso-reserva[\s\S]*?height:\s*62px/);
  for (const f of PANEL) assert.match(leer('pages/' + f), /<div class="zs-aviso-reserva" id="zsAvisoReserva" aria-hidden="true"><\/div>/, f);
  assert.match(leer('assets/js/club.js'), /reserva\.replaceWith\(banner\)/);
});

/* ───── D) Tipografías ───── */
test('Outfit e Inter se precargan y sus respaldos tienen las medidas de la fuente real', () => {
  const css = leer('assets/css/fuentes.css');
  for (const fam of ['Inter Fallback', 'Outfit Fallback', 'Playfair Fallback']) {
    const bloque = new RegExp("font-family: '" + fam + "';[^}]*size-adjust:[^}]*ascent-override:[^}]*descent-override:[^}]*line-gap-override: 0%").test(css);
    assert.ok(bloque, fam + ': size-adjust y overrides');
  }
  assert.match(css, /'Inter', 'Inter Fallback'|font-family: 'Inter';/);
  for (const f of TODAS) {
    const h = leer('pages/' + f);
    assert.ok(h.indexOf('inter-latin.woff2') < h.indexOf('club.css') || !h.includes('club.css'), f + ': las fuentes se piden antes que la hoja principal');
  }
});

test('el service worker precachea las fuentes críticas y su hoja', () => {
  const sw = leer('sw.js');
  for (const a of ['/assets/fonts/inter-latin.woff2', '/assets/fonts/outfit-latin.woff2']) {
    assert.ok(sw.includes("'" + a + "'"), a);
    assert.ok(fs.existsSync(path.join(RAIZ, a)), a + ' existe');
  }
  const v = /fuentes\.css\?v=([\w.-]+)/.exec(sw)[1];
  assert.equal(v, GEN.VERSION_FUENTES, 'sw.js y las páginas piden la misma versión de fuentes.css');
  assert.match(sw, /navigationPreload/);
});

/* ───── E) Transición entre páginas ───── */
test('View Transitions entre documentos: barras fijas, contenido con fundido corto y sin animación con "reducir movimiento"', () => {
  const css = leer('assets/css/club-shell.css');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*auto;\s*\}\s*\}/);
  for (const [sel, nombre] of [['.club-sidebar', 'zs-lateral'], ['.zs-topbar', 'zs-superior'], ['.zs-bottom', 'zs-inferior'], ['.zs-wa', 'zs-whatsapp']]) {
    assert.match(css, new RegExp(sel.replace('.', '\\.') + '\\s*\\{\\s*view-transition-name:\\s*' + nombre));
  }
  assert.match(css, /::view-transition-old\(root\)\s*\{\s*animation:\s*zsSale \.16s/);
  assert.match(css, /::view-transition-new\(root\)\s*\{\s*animation:\s*zsEntra \.16s/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none !important/);
  // el cajón móvil, los modales fijos y el aviso no llevan nombre de transición: se capturan dentro del contenido
  assert.doesNotMatch(css, /\.zs-drawer\s*\{[^}]*view-transition-name/);
});
