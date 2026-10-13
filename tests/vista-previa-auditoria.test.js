'use strict';
// Auditoría de la vista previa para quien NO es miembro (cursos, webinars, videos, retos, canal, perfil,
// certificados e inicio): ve todo, pero no puede usar. Para miembros y administradores nada cambia.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = rel => fs.existsSync(path.join(RAIZ, rel));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}]/u;

const PAGINAS_PAYWALL = ['club-biblioteca.html', 'club-sesiones.html', 'club-videos.html', 'club-canal.html'];

/* ───────── módulo común cargado en el orden correcto ───────── */
test('las páginas auditadas cargan el módulo de membresía después de club.js, con su hoja de estilos', () => {
  for (const p of PAGINAS_PAYWALL) {
    const h = leer('pages/' + p);
    const iClub = h.indexOf('assets/js/club.js?v=');
    const iPw = h.indexOf('assets/js/club-paywall.js?v=20261102-paywall');
    assert.ok(iPw > iClub && iClub > 0, p + ': club-paywall.js debe cargarse después de club.js');
    assert.match(h, /assets\/css\/club-paywall\.css\?v=20261102-paywall/, p + ': falta la hoja del módulo');
    assert.match(h, /(ZOO_PAYWALL|PW)\.iniciar\(\{ sesion: session, club: ZOORIGEN_CLUB \}\)/, p + ': hay que iniciar el módulo tras requireAuth');
  }
});

/* ───────── cursos / biblioteca ───────── */
test('biblioteca: el aviso de clase bloqueada usa la ventana común y conserva la propia como respaldo', () => {
  const h = leer('pages/club-biblioteca.html');
  const i = h.indexOf('function mostrarPaywallCurso()');
  assert.ok(i > 0);
  const cuerpo = h.slice(i, i + 3000);
  assert.match(cuerpo, /ZOO_PAYWALL\.modalPaywall\(/);
  assert.match(cuerpo, /zooCoursePaywall/, 'se conserva la ventana de siempre si el módulo no cargó');
  // La primera clase de la prueba gratuita no pasa por ese aviso: solo las que no son gratis
  assert.match(h, /if \(!tieneMembresiaActiva\(\) && !esClaseGratis\(lesson, window\.__currentCourse, lessonIdx\)\) \{\s*mostrarPaywallCurso\(\);/);
});

test('tarjeta de elegir prueba: chip "Prueba gratuita" si se puede elegir y "Solo miembros" con candado si no', () => {
  const U = require('../assets/js/club-cursos-ui.js');
  const c = { id: 'c1', title: 'Curso uno', area: 'Etología', level: 'Introductorio' };
  const si = U.tarjetaPendienteHTML(c, { elegible: true });
  assert.match(si, /zc-badge--free[^>]*>[\s\S]*Prueba gratuita<\/span>/);
  assert.match(si, /data-elegir="c1"/, 'sigue pudiéndose elegir');
  const no = U.tarjetaPendienteHTML(c, { elegible: false, motivoNo: 'No disponible como prueba' });
  assert.match(no, /zc-badge--soft[^>]*>[\s\S]*Solo miembros<\/span>/);
  assert.match(no, /<svg/, 'el chip lleva el candado en SVG');
  assert.match(no, /disabled/);
  assert.ok(!/data-elegir/.test(no));
  // La sugerida por la guía conserva su marca y no se duplica con el chip
  const pref = U.tarjetaPendienteHTML(c, { elegible: true, destacado: true });
  assert.match(pref, /Elegiste este curso en la guía/);
  for (const html of [si, no, pref]) assert.ok(!EMOJI.test(html), 'sin emojis');
});

test('versiones: club-cursos-ui.js y club-cursos.css cambiaron de versión en todas las páginas que los cargan', () => {
  for (const p of fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'))) {
    const h = leer('pages/' + p);
    for (const m of h.matchAll(/club-cursos-ui\.js\?v=([\w.-]+)/g)) assert.equal(m[1], '20261102-vistaprevia', p);
    for (const m of h.matchAll(/club-cursos\.css\?v=([\w.-]+)/g)) assert.equal(m[1], '20261102-vistaprevia', p);
  }
  assert.match(leer('assets/css/club-cursos.css'), /\.zc-badge--cuerpo \{ position: static;/);
});

/* ───────── webinars ───────── */
test('webinars: el botón del enlace avisa y lleva a Suscripción; el enlace de Meet solo existe para miembros', () => {
  const h = leer('pages/club-sesiones.html');
  assert.match(h, /id="btnLinkMiembros"/);
  assert.match(h, /PW\.requiereMembresia\('Entrar al webinar'\)/);
  assert.ok(!/<a href="club-suscripcion\.html" class="btn-meet"/.test(h), 'ya no es un enlace directo sin aviso');
  // Miembros: el enlace a Meet de siempre
  assert.match(h, /isActive && meetUrl\s*\?\s*`<a href="\$\{meetUrl\}" target="_blank" class="btn-meet">[\s\S]*Entrar al webinar<\/a>`/);
  // La lista de próximos webinars sigue visible y marca el enlace como de miembros
  assert.match(h, /PW\.chipCandadoHTML\('Enlace solo para miembros'\)/);
});

test('webinars: colores legibles en el tema claro y título del estado vacío sin blanco fijo', () => {
  const h = leer('pages/club-sesiones.html');
  assert.match(h, /\[data-theme="light"\] \.webinar-card__speaker \{ color: var\(--zoo-solid-mid/);
  assert.match(h, /\.webinars-empty__title \{ color: var\(--zoo-text\); \}/);
  assert.ok(!/color: #fff; font-family: 'Poppins', sans-serif;\s*font-size: 1\.2rem/.test(h));
});

/* ───────── videos ───────── */
test('videos: la lista se ve completa; reproducir sin membresía avisa y lleva a Suscripción', () => {
  const h = leer('pages/club-videos.html');
  assert.match(h, /data-video-bloqueado/);
  assert.match(h, /PW\.requiereMembresia\('Reproducir el video'\)/);
  assert.ok(!/<a href="club-suscripcion\.html" class="content-item__tag"/.test(h));
  // Miembros: el botón Ver y el reproductor siguen igual
  assert.match(h, /isActive && v\.driveId\s*\?\s*`<button class="content-item__tag"[\s\S]*onclick='openPlayer\("\$\{v\.driveId\}", \$\{JSON\.stringify\(v\.title\)\}\)'>/);
  assert.match(h, /\.coming-soon-card__sub \{ color: rgba\(255,255,255,0\.85\); \}/);
});

/* ───────── canal ───────── */
test('canal: "Abrir canal" se ve con candado; el enlace real solo se escribe para miembros', () => {
  const h = leer('pages/club-canal.html');
  assert.match(h, /id="zkAbrirBloqueado"/);
  assert.match(h, /ZOO_PAYWALL\.requiereMembresia\('Abrir el canal de WhatsApp'\)/);
  assert.match(h, /const abrir = membresia\s*\?\s*`<a class="zc-btn zk-btn-blanco" href="\$\{R\.esc\(ZOO_CANAL_URL\)\}"/);
  // El enlace del canal no aparece en la rama de quien no es miembro
  const rama = h.slice(h.indexOf(': `<a class="zc-btn zk-btn-blanco" href="club-suscripcion.html"'));
  assert.ok(!/ZOO_CANAL_URL/.test(rama.split('\n')[0]));
  // Compartir la invitación (crecer la comunidad) sigue abierto
  assert.match(h, /Compartir invitación/);
});

/* ───────── retos: sin imágenes que falten ───────── */
test('retos: todas las imágenes que pide la zona de retos al cargar existen en el sitio (sin errores 404)', () => {
  const js = leer('assets/js/club-retos.js');
  const tipos = js.slice(js.indexOf('const TIPOS = ['), js.indexOf('const IDS = TIPOS.map'));
  const rutas = [...tipos.matchAll(/imagen: '([^']+)'/g)].map(m => m[1]);
  assert.equal(rutas.length, 4, 'las cuatro tarjetas de reto');
  const mascotas = js.match(/const MASCOTAS = \{([^}]+)\}/)[1];
  rutas.push(...[...mascotas.matchAll(/'(assets\/img\/[^']+)'/g)].map(m => m[1]));
  assert.ok(rutas.length >= 7);
  for (const r of rutas) assert.ok(existe(r), 'falta el archivo ' + r);
  // El hero ya no pide la mascota que no existe
  assert.ok(!/mascota-jira\.png|reto-quiz-relampago\.jpg|reto-detective-campo\.jpg|reto-ordena-procedimiento\.jpg|reto-flashcards\.jpg/.test(js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  assert.match(leer('pages/club-retos.html'), /club-retos\.js\?v=20261102-vistaprevia/);
});

/* ───────── perfil y certificados ───────── */
test('perfil: sin plan activo no promete "Miembro VIP" y ofrece ver los planes', () => {
  const h = leer('pages/club-perfil.html');
  assert.match(h, /id="profilePlan"/);
  assert.match(h, /Sin plan activo · <a href="club-suscripcion\.html"/);
  assert.match(h, /if \(!ZOORIGEN_CLUB\.hasActiveMembership\(session\)\)/);
  // Editar el nombre es de la cuenta, no de la membresía: sigue abierto para todos
  assert.match(h, /db\.collection\('miembros'\)\.doc\(session\.uid\)\.update\(\{/);
  assert.match(h, /\[data-theme="light"\] \.pf-ambar/);
});

test('certificados: el título del estado vacío se lee en el tema claro y explica qué hacer sin membresía', () => {
  const h = leer('pages/club-certificados.html');
  assert.match(h, /\.certs-empty h2 \{ color: var\(--zoo-text\); \}/);
  assert.match(h, /const miembro = ZOORIGEN_CLUB\.hasActiveMembership\(session\);/);
  assert.match(h, /Ver planes de membresía/);
  assert.match(h, /Ir a la biblioteca/, 'el mensaje de siempre se conserva para miembros');
});

/* ───────── inicio y logros ───────── */
test('inicio: la cuenta regresiva del webinar se lee en el tema claro; logros: etiqueta de meta legible', () => {
  assert.match(leer('pages/club-dashboard.html'), /\[data-theme="light"\] \.countdown span \{ color: var\(--zoo-text-muted/);
  assert.match(leer('assets/css/club-logros.css'), /\[data-theme="light"\] \.lg-tier__txt > span \{/);
  assert.match(leer('pages/club-logros.html'), /club-logros\.css\?v=20261102-vistaprevia/);
});

/* ───────── generales ───────── */
test('los archivos tocados no llevan emojis ni degradados nuevos', () => {
  for (const rel of ['pages/club-biblioteca.html', 'pages/club-sesiones.html', 'pages/club-videos.html', 'pages/club-canal.html',
    'pages/club-perfil.html', 'pages/club-certificados.html', 'pages/club-retos.html', 'pages/club-logros.html',
    'assets/js/club-cursos-ui.js', 'assets/js/club-retos.js', 'assets/css/club-cursos.css', 'assets/css/club-logros.css']) {
    assert.ok(!EMOJI.test(leer(rel)), rel + ' tiene emojis');
  }
  assert.ok(!/gradient/i.test(leer('pages/club-certificados.html').split('<style>')[1].split('</style>')[0]));
});
