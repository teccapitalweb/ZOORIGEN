'use strict';
// Vista previa del FORO y del DIRECTORIO para quien no es miembro.
// Principio: ve todo (publicaciones y tarjetas de ejemplo, filtros, buscador, caja para escribir) pero no usa nada:
// cada acción pide membresía. El foro NO consulta Firestore (foroPosts, replies) si no hay membresía.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;

const PREVIA = require(path.join(RAIZ, 'assets', 'js', 'club-foro-previa.js'));
const D = require(path.join(RAIZ, 'assets', 'js', 'club-directorio.js'));

// Cuerpo de una función declarada como `function nombre(` o `async function nombre(` (hasta su llave de cierre).
function cuerpoDe(html, nombre) {
  const m = html.match(new RegExp('(?:async\\s+)?function\\s+' + nombre + '\\s*\\('));
  assert.ok(m, 'no existe la función ' + nombre);
  const ini = html.indexOf('{', m.index);
  let nivel = 0;
  for (let i = ini; i < html.length; i++) {
    if (html[i] === '{') nivel++;
    else if (html[i] === '}') { nivel--; if (nivel === 0) return html.slice(ini, i + 1); }
  }
  throw new Error('llaves sin cerrar en ' + nombre);
}

/* ───────────────────────── FORO: la página ───────────────────────── */

test('foro: carga el módulo compartido de membresía, el de la vista previa y sus estilos con ?v=', () => {
  const html = leer('pages/club-foro.html');
  assert.match(html, /assets\/css\/club-paywall\.css\?v=[\w.-]+/);
  assert.match(html, /assets\/js\/club-paywall\.js\?v=[\w.-]+/);
  assert.match(html, /assets\/js\/club-foro-previa\.js\?v=[\w.-]+/);
  // el módulo compartido va después de club.js y club-shell.js
  assert.ok(html.indexOf('club-paywall.js') > html.indexOf('club-shell.js'));
  assert.ok(html.indexOf('club-paywall.js') > html.indexOf('assets/js/club.js'));
});

test('foro: sin membresía NO se consulta Firestore (la comprobación va antes de foroPosts)', () => {
  const html = leer('pages/club-foro.html');
  const cuerpo = cuerpoDe(html, 'loadPosts');
  const guarda = cuerpo.indexOf('ZOO_PAYWALL.miembro()');
  const consulta = cuerpo.indexOf("collection('foroPosts')");
  assert.ok(guarda >= 0, 'loadPosts debe comprobar ZOO_PAYWALL.miembro()');
  assert.ok(consulta > guarda, 'la consulta a foroPosts debe ir DESPUÉS de la comprobación');
  assert.match(cuerpo.slice(guarda, consulta), /pintarVistaPrevia\(\);\s*return;/, 'sin membresía pinta la vista previa y sale');
});

test('foro: la vista previa no toca Firestore ni usa db en ningún punto', () => {
  const html = leer('pages/club-foro.html');
  for (const f of ['prepararVistaPrevia', 'pintarVistaPrevia']) {
    const c = cuerpoDe(html, f);
    assert.doesNotMatch(c, /\bdb\./, f + ' no debe usar db');
    assert.doesNotMatch(c, /foroPosts|replies|firebase\./, f + ' no debe nombrar Firestore');
  }
  assert.match(html, /ZOO_PAYWALL\.iniciar\(\{ sesion: session, club: ZOORIGEN_CLUB \}\)/);
});

test('foro: defensa en profundidad (todo lo que usa el foro exige membresía) y sin alert() de no miembros', () => {
  const html = leer('pages/club-foro.html');
  const esperados = {
    toggleLike: 'Reaccionar', sharePost: 'Compartir una discusión', openNewPostModal: 'Publicar en el foro',
    submitNewPost: 'Publicar en el foro', viewPost: 'Abrir una discusión'
  };
  for (const [fn, accion] of Object.entries(esperados)) {
    const c = cuerpoDe(html, fn);
    const guarda = c.indexOf("ZOO_PAYWALL.requiereMembresia('" + accion + "')");
    assert.ok(guarda >= 0, fn + ' debe pedir membresía (' + accion + ')');
    const primeraDb = c.search(/\bdb\.|navigator\.|document\.createElement/);
    assert.ok(primeraDb < 0 || guarda < primeraDb, fn + ': la membresía se pide antes de usar nada');
  }
  assert.match(html, /requiereMembresia\('Comentar'\)/, 'responder pide membresía');
  assert.doesNotMatch(html, /alert\('(Solo los miembros|Necesitas membres)/, 'sin alert() de membresía');
});

test('foro: la vista previa pide membresía en acciones, filtros y caja de escribir', () => {
  const c = cuerpoDe(leer('pages/club-foro.html'), 'prepararVistaPrevia');
  assert.match(c, /requiereMembresia\(P\.nombreAccion\('publicar'\)\)/);
  assert.match(c, /requiereMembresia\(P\.nombreAccion\('filtrar'\)\)/);
  assert.match(c, /requiereMembresia\(P\.nombreAccion\(t\.dataset\.accion\)\)/);
  assert.match(c, /avisoVistaPreviaHTML/);
  // las cifras reales no se muestran (ni ceros) a quien no es miembro
  assert.match(c, /\.zs-seccion__cifras[\s\S]*style\.display = 'none'/);
});

test('foro: miembros conservan los filtros y la carga de siempre (solo se enganchan si es miembro)', () => {
  const html = leer('pages/club-foro.html');
  assert.match(html, /if \(esMiembro\) \{\s*document\.querySelectorAll\('\.foro-cat'\)[\s\S]*renderPosts\(\);[\s\S]*\} else \{\s*prepararVistaPrevia\(\);/);
  assert.match(html, /const esMiembro = ZOO_PAYWALL\.iniciar/);
});

/* ───────────────────────── FORO: el módulo de ejemplo ───────────────────────── */

test('foro: 4 publicaciones de ejemplo en español, con autores genéricos y categorías del foro', () => {
  assert.equal(PREVIA.EJEMPLOS.length, 4);
  const autores = new Set(PREVIA.EJEMPLOS.map(p => p.autor));
  for (const a of ['Estudiante de Biología', 'Médica veterinaria · Centro de rescate', 'Técnico de UMA']) assert.ok(autores.has(a), 'falta el autor ' + a);
  assert.equal(new Set(PREVIA.EJEMPLOS.map(p => p.id)).size, 4);
  for (const p of PREVIA.EJEMPLOS) {
    assert.ok(PREVIA.CATEGORIAS[p.categoria], 'categoría desconocida: ' + p.categoria);
    assert.ok(p.titulo.length >= 15 && p.contenido.length >= 40);
    assert.match(p.hace, /^(Hace |Ayer)/);
    assert.ok(p.reacciones >= 0 && p.respuestas >= p.respuestasEjemplo.length);
    assert.ok(p.respuestasEjemplo.length <= 2, 'una o dos respuestas de ejemplo como máximo');
  }
  assert.ok(PREVIA.EJEMPLOS.some(p => p.respuestasEjemplo.length > 0));
});

test('foro: los ejemplos no llevan personas reales, contactos, enlaces ni emojis', () => {
  const todo = JSON.stringify(PREVIA.EJEMPLOS) + JSON.stringify(PREVIA.TEXTOS);
  assert.doesNotMatch(todo, /@|https?:|www\.|\d{8,}/, 'sin correos, enlaces ni teléfonos');
  assert.doesNotMatch(todo, EMOJI, 'sin emojis');
  assert.doesNotMatch(leer('assets/js/club-foro-previa.js'), EMOJI, 'el archivo no lleva emojis');
});

test('foro: cada publicación dibujada está marcada "Ejemplo" y usa la estructura de foro-post', () => {
  const html = PREVIA.renderLista(PREVIA.EJEMPLOS);
  assert.equal((html.match(/class="foro-post foro-post--ejemplo"/g) || []).length, 4);
  assert.equal((html.match(/<span class="pw-ejemplo">Ejemplo<\/span>/g) || []).length, 4);
  for (const clase of ['foro-post__top', 'foro-post__avatar', 'foro-post__meta', 'foro-post__cat', 'foro-post__title', 'foro-post__preview', 'foro-post__actions', 'foro-action', 'foro-post__replies', 'foro-reply-preview']) {
    assert.ok(html.includes(clase), 'falta la clase ' + clase);
  }
  assert.doesNotMatch(html, /onclick=/, 'sin onclick en línea: todo va por data-accion');
  assert.doesNotMatch(html, EMOJI);
  for (const a of ['abrir', 'reaccionar', 'comentar', 'compartir']) assert.ok(html.includes('data-accion="' + a + '"'), 'falta data-accion ' + a);
});

test('foro: el dibujo escapa el texto y se puede filtrar por categoría', () => {
  const malo = { id: 'x', categoria: 'casos', autor: '<img src=x>', hace: 'Hace 1 h', titulo: '<script>alert(1)</script>', contenido: 'a & b', reacciones: 1, respuestas: 0, respuestasEjemplo: [] };
  const html = PREVIA.renderPost(malo);
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(PREVIA.filtrar(PREVIA.EJEMPLOS, 'all').length, 4);
  assert.deepEqual(PREVIA.filtrar(PREVIA.EJEMPLOS, 'legal').map(p => p.id), ['ejemplo-3']);
  assert.deepEqual(PREVIA.filtrar(PREVIA.EJEMPLOS, 'empleo'), []);
});

test('foro: la caja para escribir es de solo lectura y los nombres de acción son claros', () => {
  const c = PREVIA.renderComposer('Ana');
  assert.match(c, /<textarea[^>]*readonly/);
  assert.match(c, /placeholder="[^"]{10,}"/);
  assert.match(c, /data-accion="publicar"/);
  assert.equal(PREVIA.nombreAccion('publicar'), 'Publicar en el foro');
  assert.equal(PREVIA.nombreAccion('reaccionar'), 'Reaccionar');
  assert.equal(PREVIA.nombreAccion('comentar'), 'Comentar');
  assert.match(PREVIA.TEXTOS.aviso, /^Vista previa con publicaciones de ejemplo\. Las conversaciones reales son solo para miembros\.$/);
});

/* ───────────────────────── DIRECTORIO ───────────────────────── */

test('directorio: 6 tarjetas de ejemplo con sectores de la lista, sin contacto ni emojis', () => {
  assert.equal(D.EJEMPLOS.length, 6);
  assert.equal(new Set(D.EJEMPLOS.map(t => t.uid)).size, 6);
  for (const t of D.EJEMPLOS) {
    assert.match(t.uid, /^ejemplo-\d$/);
    assert.ok(D.SECTORES.includes(t.sector), 'sector fuera de la lista: ' + t.sector);
    assert.notEqual(t.sector, 'Otro');
    assert.match(t.profesion, /ejemplo/i, 'la profesión dice que es de ejemplo');
    assert.equal(t.contacto, undefined, 'sin datos de contacto');
  }
  assert.doesNotMatch(JSON.stringify(D.EJEMPLOS), EMOJI);
  assert.doesNotMatch(JSON.stringify(D.EJEMPLOS), /@|https?:|\d{8,}/);
});

test('directorio: el sitio pinta sus propias tarjetas si el servidor no trae (o trae pocas)', () => {
  const propias = D.tarjetasDeEjemplo([]);
  assert.equal(propias.length, 6);
  assert.deepEqual(D.tarjetasDeEjemplo(undefined).map(t => t.uid), propias.map(t => t.uid));
  assert.deepEqual(D.tarjetasDeEjemplo(null).map(t => t.uid), propias.map(t => t.uid));
  // un servidor viejo con 3 tarjetas de sectores que no existen NO se pinta (saldrían como "Otro")
  const viejas = [
    { uid: 'ejemplo-1', nombre: 'A', sector: 'Medicina veterinaria' },
    { uid: 'ejemplo-2', nombre: 'B', sector: 'Educación ambiental' },
    { uid: 'ejemplo-3', nombre: 'C', sector: 'Conservación' }
  ];
  assert.deepEqual(D.tarjetasDeEjemplo(viejas).map(t => t.uid), propias.map(t => t.uid));
  for (const t of propias) {
    assert.ok(D.SECTORES.includes(t.sector));
    assert.deepEqual(t.contacto, { whatsapp: '', correo: '', linkedin: '' });
  }
});

test('directorio: si el servidor trae las 6 se usan, y su contacto (aunque llegara) se descarta', () => {
  const servidor = Array.from({ length: 6 }, (_, i) => ({
    uid: 'ejemplo-' + (i + 1), nombre: 'Persona ' + (i + 1), profesion: 'Prueba (tarjeta de ejemplo)', sector: 'Biología', ciudad: 'Mérida',
    contacto: { whatsapp: '5512345678', email: 'x@example.com', linkedin: 'https://linkedin.com/in/x' }
  }));
  const r = D.tarjetasDeEjemplo(servidor);
  assert.equal(r.length, 6);
  assert.equal(r[0].nombre, 'Persona 1');
  const html = D.renderVistaPrevia(r);
  assert.ok(!html.includes('5512345678') && !html.includes('example.com') && !html.includes('linkedin.com'));
});

test('directorio: la vista previa difumina la grilla (aria-hidden), trae la caja central y no lleva contactos', () => {
  const html = D.renderVistaPrevia(D.tarjetasDeEjemplo([]));
  assert.match(html, /class="zd-vista"/);
  assert.match(html, /class="zd-vista__rejilla" aria-hidden="true"/);
  assert.equal((html.match(/<article class="zd-tarjeta/g) || []).length, 6);
  assert.ok(html.includes('Conoce a los profesionales de la comunidad'));
  assert.match(html, /<a class="zc-btn zc-btn--primario" href="club-suscripcion\.html">Suscribirme<\/a>/);
  assert.ok(!html.includes('zd-contacto') && !html.includes('mailto:') && !html.includes('wa.me'));
  assert.doesNotMatch(html, EMOJI);
  const css = leer('assets/css/club-comunidad.css');
  assert.match(css, /\.zd-vista__rejilla \{[^}]*filter: blur\(\d+px\)[^}]*pointer-events: none/);
});

test('directorio: la página deja ver buscador y sectores, en solo lectura, y todo toque pide membresía', () => {
  const html = leer('pages/club-directorio.html');
  assert.match(html, /assets\/css\/club-paywall\.css\?v=[\w.-]+/);
  assert.match(html, /assets\/js\/club-paywall\.js\?v=[\w.-]+/);
  assert.ok(html.indexOf('club-paywall.js') > html.indexOf('club-shell.js'));
  assert.match(html, /ZOO_PAYWALL\.iniciar\(\{ sesion: session, club: ZOORIGEN_CLUB \}\)/);
  // ya no se ocultan buscador ni sectores a quien no es miembro
  assert.doesNotMatch(html, /\$\('zdBuscarCaja'\)\.style\.display = 'none'/);
  assert.doesNotMatch(html, /\$\('zdChips'\)\.style\.display = 'none'/);
  assert.match(html, /buscador\.readOnly = true/);
  for (const accion of ['Buscar en el directorio', 'Filtrar por sector', 'Crear tu tarjeta', 'Ver los perfiles de la comunidad']) {
    assert.ok(html.includes("requiereMembresia('" + accion + "'"), 'falta pedir membresía: ' + accion);
  }
  // miembros: abrir "Mi tarjeta" sigue igual y también exige membresía
  assert.match(html, /if \(!ZOO_PAYWALL\.requiereMembresia\('Crear tu tarjeta'\)\) return;\s*abrirModal\(\);/);
  // sin membresía la vista previa no depende del servidor
  assert.match(html, /if \(!esMiembroSesion\) \{[\s\S]*pintar\(\);[\s\S]*\}\s*cargar\(\);/);
});

test('directorio: el servidor manda los mismos ejemplos que el sitio (si la carpeta del servidor está al lado)', () => {
  const ruta = path.resolve(RAIZ, '..', 'zoorigen-webhook', 'services', 'directorio.js');
  if (!fs.existsSync(ruta)) return;
  const srv = require(ruta).EJEMPLOS;
  assert.equal(srv.length, D.EJEMPLOS.length);
  srv.forEach((s, i) => {
    assert.equal(s.uid, D.EJEMPLOS[i].uid);
    assert.equal(s.nombre, D.EJEMPLOS[i].nombre);
    assert.equal(s.sector, D.EJEMPLOS[i].sector);
    assert.ok(D.SECTORES.includes(s.sector));
  });
});

test('las versiones ?v= de los archivos tocados son consistentes entre páginas', () => {
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
  const versiones = new Map();
  for (const f of paginas) {
    for (const m of leer('pages/' + f).matchAll(/assets\/(?:css|js)\/(club-comunidad\.css|club-directorio\.js|club-foro-previa\.js)\?v=([\w.-]+)/g)) {
      if (!versiones.has(m[1])) versiones.set(m[1], new Set());
      versiones.get(m[1]).add(m[2]);
    }
  }
  for (const [archivo, v] of versiones) assert.equal(v.size, 1, archivo + ' con versiones distintas: ' + [...v].join(', '));
  assert.ok(versiones.has('club-comunidad.css') && versiones.has('club-directorio.js') && versiones.has('club-foro-previa.js'));
});
