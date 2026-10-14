'use strict';
// Tarjeta de título de sección (componente único), tipografía, modo noche neutro y clases en vivo = Próximamente.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const S = require('../assets/js/club-seccion.js');
const CONFIG = require('../assets/js/club-config.js');
const O = require('../assets/js/club-onboarding.js');

const PANEL = ['club-dashboard', 'club-biblioteca', 'club-pdfs', 'club-herramientas', 'club-infusiones', 'club-legal', 'club-inventario',
  'club-sesiones', 'club-videos', 'club-foro', 'club-directorio', 'club-retos', 'club-logros', 'club-certificados', 'club-referidos',
  'club-perfil', 'club-suscripcion', 'club-canal'];

/* ───────── contraste ───────── */
function luminancia(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('el acento del título de Inicio y Cursos (#9BD9AE) se lee sobre el verde de día y la superficie de noche (AA, 4.5:1)', () => {
  assert.ok(contraste('#9BD9AE', '#1F5F3A') >= 4.5, 'día: ' + contraste('#9BD9AE', '#1F5F3A'));
  assert.ok(contraste('#9BD9AE', '#1E2329') >= 4.5, 'noche: ' + contraste('#9BD9AE', '#1E2329'));
  const css = leer('assets/css/club-seccion.css');
  assert.match(css, /--zs-acento:\s*var\(--zs-claro, #9BD9AE\)/i);
  assert.match(css, /\.zs-acento\s*\{\s*color:\s*var\(--zs-acento\)/);
});

test('modo noche: texto y botón principal cumplen AA sobre sus superficies neutras', () => {
  const sup = ['#0F1215', '#171B20', '#1E2329'];
  for (const s of sup) {
    assert.ok(contraste('#E7EAEE', s) >= 7, 'texto sobre ' + s);
    assert.ok(contraste('#A3ABB5', s) >= 4.5, 'secundario sobre ' + s);
    assert.ok(contraste('#868F99', s) >= 4.5, 'tenue sobre ' + s);
  }
  assert.ok(contraste('#FFFFFF', '#2A7A4E') >= 4.5, 'botón principal verde con texto blanco');
  assert.ok(contraste('#E7EAEE', '#1E2329') >= 7, 'texto en la tarjeta de título de noche');
});

/* ───────── componente ───────── */
test('html(): píldora con ícono, título con la parte final en acento, subtítulo y cifras', () => {
  const h = S.html({ id: 'zsX', seccion: 'x', icono: 'library', eyebrow: 'Catálogo Zoorigen', titulo: 'Cursos grabados,', acento: 'a tu ritmo.', sub: 'Texto.',
    cifras: [{ clave: 'cursos', valor: 13, rotulo: 'cursos' }, { id: 'xx', valor: '—', rotulo: 'clases' }] });
  assert.match(h, /class="zs-seccion__pildora"><svg class="zi" aria-hidden="true"><use href="#zi-library"\/><\/svg><span>Catálogo Zoorigen<\/span>/);
  assert.match(h, /<h1 class="zs-seccion__titulo">Cursos grabados, <span class="zs-acento">a tu ritmo\.<\/span><\/h1>/);
  assert.match(h, /data-cifra="cursos">13</);
  assert.match(h, /id="xx" data-cifra="xx"/);
  assert.equal((h.match(/<h1/g) || []).length, 1);
});

test('html(): escapa el texto y construye el control segmentado con la opción activa', () => {
  const h = S.html({ titulo: '<b>x</b>', acento: '"y"', eyebrow: '<i>', segmentos: { etiqueta: 'Mostrar', activo: 'b', opciones: [{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }] } });
  assert.ok(!h.includes('<b>x</b>') && !h.includes('<i>'));
  assert.match(h, /role="group" aria-label="Mostrar"/);
  assert.match(h, /data-segmento="a" aria-pressed="false"/);
  assert.match(h, /data-segmento="b" aria-pressed="true"/);
});

test('prontoHTML(): sin cuenta regresiva ni enlaces', () => {
  const h = S.prontoHTML({});
  assert.match(h, /Próximamente/);
  assert.match(h, /Muy pronto tendrás clases en vivo/);
  assert.doesNotMatch(h, /<a |countdown/);
});

test('sin degradados ni emojis en el componente', () => {
  for (const f of ['assets/css/club-seccion.css', 'assets/js/club-seccion.js', 'assets/js/club-cola.js', 'assets/js/club-config.js']) {
    const t = leer(f);
    assert.doesNotMatch(t, /gradient\(/, f);
    assert.doesNotMatch(t, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, f);
  }
});

test('las dieciocho pantallas del panel usan la tarjeta de título única', () => {
  for (const p of PANEL) {
    const h = leer('pages/' + p + '.html');
    assert.match(h, /assets\/css\/club-seccion\.css\?v=[\w.-]+/, p + ' carga la hoja');
    assert.match(h, /assets\/js\/club-seccion\.js\?v=[\w.-]+/, p + ' carga el componente');
    assert.ok(h.indexOf('club-seccion.js') < h.indexOf('assets/js/club.js'), p + ': el componente va antes de club.js');
    assert.doesNotMatch(h, /<div class="page-header">/, p + ' ya no tiene el encabezado anterior');
    assert.doesNotMatch(h, /class="(tools-hero|legal-hero|foro-hero)"/, p + ' ya no tiene su héroe propio');
  }
  // las que arman su tarjeta desde JS
  assert.match(leer('assets/js/club-inicio.js'), /SECCION\.html\(/);
  assert.match(leer('assets/js/club-materiales.js'), /SEC\.html\(/);
  // el resto monta la tarjeta con ZOO_SECCION.montar
  for (const p of PANEL.filter(x => !['club-dashboard', 'club-pdfs'].includes(x))) {
    assert.match(leer('pages/' + p + '.html'), /ZOO_SECCION\.montar\('#zsSeccion'/, p);
    assert.match(leer('pages/' + p + '.html'), /id="zsSeccion"/, p);
  }
});

test('Cursos: el control Todos / En progreso / Completados filtra con el avance real', () => {
  const h = leer('pages/club-biblioteca.html');
  assert.match(h, /opciones: \[\{ id: 'todos', etiqueta: 'Todos' \}, \{ id: 'progreso', etiqueta: 'En progreso' \}, \{ id: 'completados', etiqueta: 'Completados' \}\]/);
  assert.match(h, /ZOO_SECCION\.segmentos\(/);
  assert.match(h, /seg === 'completados' \? pr\.isCompleted === true/);
});

/* ───────── tipografía ───────── */
test('tipografía: Outfit para titulares e Inter para texto, con tokens y alojadas en el propio sitio (sin Google Fonts)', () => {
  const css = leer('assets/css/club.css');
  assert.match(css, /--zoo-font-display:\s*'Outfit', 'Outfit Fallback'/);
  assert.match(css, /--zoo-font-body:\s*'Inter', 'Inter Fallback'/);
  assert.match(css, /--zoo-font-heading:\s*var\(--zoo-font-display\)/);
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^(club-.*|admin-club|verificar-correo)\.html$/.test(f) && !['club-noticias.html', 'club.html'].includes(f));
  for (const f of paginas) {
    const h = leer('pages/' + f);
    assert.doesNotMatch(h, /fonts\.googleapis\.com|fonts\.gstatic\.com/, f + ': sin Google Fonts');
    assert.match(h, /<link rel="preload" href="\.\.\/assets\/fonts\/inter-latin\.woff2" as="font" type="font\/woff2" crossorigin>/, f + ': precarga Inter');
    assert.match(h, /<link rel="preload" href="\.\.\/assets\/fonts\/outfit-latin\.woff2" as="font" type="font\/woff2" crossorigin>/, f + ': precarga Outfit');
    assert.match(h, /<link rel="stylesheet" href="\.\.\/assets\/css\/fuentes\.css\?v=[\w.-]+">/, f + ': fuentes.css');
    assert.doesNotMatch(h, /Poppins|Open Sans|Open\+Sans/, f + ': sin familias anteriores');
  }
  const fuentes = leer('assets/css/fuentes.css');
  for (const fam of ['Inter', 'Outfit', 'Playfair Display']) assert.match(fuentes, new RegExp("font-family: '" + fam + "';"), fam);
  assert.equal((fuentes.match(/font-display: swap/g) || []).length, 6, 'las seis caras con font-display: swap');
  for (const arch of ['inter-latin', 'inter-latin-ext', 'outfit-latin', 'outfit-latin-ext', 'playfair-latin', 'playfair-latin-ext']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'assets/fonts/' + arch + '.woff2')), arch);
    assert.ok(fuentes.includes('../fonts/' + arch + '.woff2'), arch + ' en fuentes.css');
  }
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets/fonts/LICENSE-OFL.txt')), 'licencia OFL junto a las fuentes');
  const bytes = fs.readdirSync(path.join(RAIZ, 'assets/fonts')).filter(f => f.endsWith('.woff2')).reduce((a, f) => a + fs.statSync(path.join(RAIZ, 'assets/fonts', f)).size, 0);
  assert.ok(bytes < 250 * 1024, 'las fuentes pesan ' + bytes + ' bytes (límite 250 KB)');
});

test('tipografía: el panel ya no escribe familias fijas (usa los tokens)', () => {
  const archivos = fs.readdirSync(path.join(RAIZ, 'assets/css')).filter(f => /^club.*\.css$/.test(f) && f !== 'club-extra.css').map(f => 'assets/css/' + f)
    .concat(['assets/css/auth-redesign.css', 'assets/js/club.js']);
  for (const f of archivos) assert.doesNotMatch(leer(f), /Poppins|Open Sans/, f);
});

test('tipografía: el titular de la tarjeta usa Outfit 800 con interletrado cerrado y tamaño fluido', () => {
  const css = leer('assets/css/club-seccion.css');
  const bloque = css.match(/\.zs-seccion__titulo\s*\{[\s\S]*?\}/)[0];
  assert.match(bloque, /font-family:\s*var\(--zoo-font-display\)/);
  assert.match(bloque, /font-weight:\s*800/);
  assert.match(bloque, /letter-spacing:\s*-0\.02em/);
  assert.match(bloque, /clamp\(/);
});

/* ───────── modo noche ───────── */
test('modo noche: paleta neutra definida y sin verde oscuro de superficie', () => {
  const css = leer('assets/css/club.css');
  const raiz = css.slice(css.indexOf(':root {'), css.indexOf('[data-theme="light"] {'));
  const val = (k) => (raiz.match(new RegExp(k + ':\\s*(#[0-9A-Fa-f]{6})')) || [])[1];
  assert.equal(val('--zoo-bg-dark').toUpperCase(), '#0F1215');
  assert.equal(val('--zoo-bg-card').toUpperCase(), '#171B20');
  assert.equal(val('--zoo-bg-card-2').toUpperCase(), '#1E2329');
  assert.equal(val('--zoo-border').toUpperCase(), '#2A3038');
  assert.equal(val('--zoo-text').toUpperCase(), '#E7EAEE');
  assert.equal(val('--zoo-text-muted').toUpperCase(), '#A3ABB5');
  assert.equal(val('--zoo-hero').toUpperCase(), '#1E2329');
  assert.equal(val('--zoo-hero-borde').toUpperCase(), '#2A3038');
  // el verde de marca vuelve en modo día
  const dia = css.slice(css.indexOf('[data-theme="light"] {'), css.indexOf('[data-theme="light"] {') + 600);
  assert.match(dia, /--zoo-hero:\s*#1F5F3A/i);
  assert.match(dia, /--zoo-panel:\s*#1F5F3A/i);
  // ningún verde oscuro de fondo escrito a mano en los estilos del panel
  const prohibidos = /#0E1F14|#0A1710|#14281B|#1A3423|#1B3A28|#234A33|#131816/i;
  for (const f of fs.readdirSync(path.join(RAIZ, 'assets/css')).filter(x => /^club.*\.css$/.test(x) && x !== 'club-extra.css')) {
    assert.doesNotMatch(leer('assets/css/' + f), prohibidos, f);
  }
});

/* ───────── clases en vivo = Próximamente ───────── */
test('clases en vivo: una sola bandera global, activada', () => {
  assert.equal(CONFIG.clasesEnVivoPronto, true);
  assert.equal(CONFIG.enVivoPronto(), true);
  // solo se define en un lugar
  const definiciones = ['assets/js/club.js', 'assets/js/club-shell.js', 'assets/js/club-avisos.js', 'assets/js/club-onboarding.js', 'pages/club-sesiones.html', 'pages/club-dashboard.html']
    .filter(f => /clasesEnVivoPronto\s*:\s*(true|false)/.test(leer(f)));
  assert.deepEqual(definiciones, []);
});

test('clases en vivo: la página de Webinars dice Próximamente y no consulta webinars', () => {
  const h = leer('pages/club-sesiones.html');
  assert.match(h, /ZOO_CONFIG\.clasesEnVivoPronto/);
  assert.match(h, /prontoHTML/);
  const i = h.indexOf('ZOO_CONFIG.clasesEnVivoPronto) {');
  const j = h.indexOf('ZOORIGEN_CLUB.getSesiones()');
  assert.ok(i > 0 && j > i, 'la bandera se revisa antes de pedir los webinars');
  assert.match(h, /Muy pronto tendrás clases en vivo/);
  assert.match(h, /valor: 'Pronto'/);
});

test('clases en vivo: inicio, menú, avisos y bienvenida respetan la bandera', () => {
  const dash = leer('pages/club-dashboard.html');
  assert.match(dash, /vivoHTML\(sesionVisible\)/);
  assert.match(dash, /!enVivoPronto && ZOORIGEN_CLUB\.hasActiveMembership/);
  assert.match(leer('assets/js/club-shell.js'), /badge badge--pronto">Pronto/);
  assert.match(leer('assets/js/club.js'), /zooEnVivoPronto\(\) \? \{ docs: \[\] \}/);
  assert.match(leer('assets/js/club-avisos.js'), /clasesEnVivoPronto === true\) lista = lista\.filter/);
  assert.match(leer('assets/js/club-inicio.js'), /Estamos preparando las clases en vivo/);
});

test('clases en vivo: el recorrido y la bienvenida no prometen webinars con fecha', () => {
  const pasos = O.pasosTour({ planActivo: true, enVivoPronto: true });
  const vivo = pasos.find(p => p.id === 'sesiones');
  assert.match(vivo.titulo, /muy pronto/i);
  assert.match(vivo.texto, /Estamos preparando/);
  const real = O.pasosTour({ planActivo: true, enVivoPronto: false }).find(p => p.id === 'sesiones');
  assert.match(real.titulo, /Webinars en vivo/);
  const ultima = O.diapositivas({ enVivoPronto: true }).pop();
  assert.match(ultima.texto, /muy pronto/);
});

test('recorrido: el texto explica qué puede hacer cada tipo de persona', () => {
  const prueba = O.pasosTour({ planActivo: false });
  const miembro = O.pasosTour({ planActivo: true });
  for (const id of ['biblioteca', 'retos', 'pdfs', 'herramientas', 'foro']) {
    assert.notEqual(prueba.find(p => p.id === id).texto, miembro.find(p => p.id === id).texto, id);
  }
  assert.match(prueba.find(p => p.id === 'biblioteca').texto, /prueba gratuita/);
  assert.match(miembro.find(p => p.id === 'biblioteca').texto, /todos tus cursos/);
  assert.match(prueba.find(p => p.id === 'retos').texto, /membresía/);
});
