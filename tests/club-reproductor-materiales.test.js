'use strict';
// Ventana de la clase (reproductor como el visor de Alintec) y materiales por curso/clase: conexiones del sitio.
// El comportamiento completo se probó en Chrome real contra el demo local (1920, 1440, 1024, 768 y 390 px).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const pagina = leer('pages/club-biblioteca.html');
const entre = (desde, hasta) => {
  const i = pagina.indexOf(desde);
  assert.ok(i >= 0, 'no está: ' + desde);
  const j = pagina.indexOf(hasta, i);
  assert.ok(j >= 0, 'no está: ' + hasta);
  return pagina.slice(i, j);
};

test('la ventana de la clase tiene la estructura de Alintec: título, insignia "Ya vista", abrir en pestaña nueva, cerrar, video y pie', () => {
  const html = entre('<div class="player-overlay" id="playerOverlay"', '<script src="https://www.gstatic');
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="playerTitle"/);
  for (const id of ['playerTitle', 'playerEstado', 'playerAbrir', 'playerCerrar', 'playerVideo', 'playerDesc']) assert.match(html, new RegExp('id="' + id + '"'), id);
  assert.match(html, /id="playerEstado" hidden>[\s\S]*?Ya vista/);
  assert.match(html, /id="playerAbrir"[^>]*target="_blank" rel="noopener noreferrer"[^>]*hidden/);
  assert.match(html, /id="playerCerrar"[^>]*aria-label="Cerrar"/);
});

test('el pie ofrece "Marcar como vista" y, ya vista, "Ya vista" + "Siguiente clase"; la última pasa a "Ver certificado"', () => {
  const pie = entre('function pintarReproductor', 'function siguienteClase');
  assert.match(pie, /Marcar como vista/);
  assert.match(pie, /Ya vista/);
  assert.match(pie, /Siguiente clase/);
  assert.match(pie, /Ver certificado/);
  assert.match(pie, /Lista de clases/);
  assert.doesNotMatch(pagina, /Completada, siguiente/, 'ya no se avanza solo: la persona decide con "Siguiente clase"');
});

test('marcar la clase NO abre sola la siguiente: la deja "Ya vista" y ofrece "Siguiente clase"; el servidor sigue registrando el avance', () => {
  const cuerpo = entre('async function marcarYSiguiente', 'function cantidadPreguntas');
  assert.match(cuerpo, /pintarReproductor\(\{ enfocar: true \}\)/);
  assert.doesNotMatch(cuerpo, /openPlayer\(/, 'no salta a la clase siguiente por su cuenta');
  assert.match(cuerpo, /guardarClaseVista\(courseId, lessonIdx\)/);
  assert.match(cuerpo, /detenerVideo\(/, 'con preguntas o juego el video se quita para que no suene debajo');
  assert.match(cuerpo, /celebrarCursoCompletado\(courseId, r\)/, 'el certificado sale al terminar la última');
  const sig = entre('function siguienteClase', 'async function openPlayer');
  assert.match(sig, /openPlayer\(l, /);
});

test('el video lo sigue firmando el servidor (Bunny) y no se arma con texto del navegador sin escapar', () => {
  const v = entre('async function cargarVideo', 'function reintentarVideo');
  assert.match(v, /\/api\/bunny\/embed-token/);
  assert.match(v, /document\.createElement\('iframe'\)/);
  assert.match(v, /token !== pbToken/, 'una carga lenta no pisa a otra clase ni a una ventana cerrada');
  assert.match(v, /encodeURIComponent\(String\(lesson\.driveId\)\)/);
});

test('teclado y foco: Esc cierra sin confirmar (salvo que haya otra ventana encima), Tab se queda dentro y el foco vuelve a quien abrió', () => {
  const t = entre('Teclado: Esc cierra', '</script>');
  assert.match(t, /ev\.key === 'Escape'/);
  assert.match(t, /\.mt-visor, \.jg-overlay, \.zc-ov/);
  assert.match(t, /ev\.key !== 'Tab'/);
  const c = entre('function closePlayer', "document.getElementById('playerOverlay').addEventListener('click'");
  assert.match(c, /pbFocoPrevio/);
  assert.match(c, /pb-sin-scroll/);
  assert.doesNotMatch(c, /confirm\(/);
});

test('estilos de la ventana: 960 de ancho máximo, video 16:9, oscura siempre, solo colores sólidos y zona segura en celular', () => {
  assert.match(pagina, /\.player-box\.is-player \{[^}]*width: min\(100%, max\(520px, min\(960px,/);
  assert.match(pagina, /\.player-box__video \{[^}]*aspect-ratio: 16 \/ 9/);
  assert.match(pagina, /#playerOverlay\.player-overlay \{\s*padding: var\(--zoo-safe-t\) var\(--zoo-safe-r\) 0 var\(--zoo-safe-l\)/);
  const css = entre('Ventana de la clase (reproductor)', '/* Lista de clases');
  assert.doesNotMatch(css, /gradient/);
  assert.match(css, /\.pb-btn--main \{ background: var\(--pb-verde/);
});

test('celular: el video llega de orilla a orilla, de lado ocupa toda la altura y hay pantalla completa (la del navegador y una de respaldo para iPhone)', () => {
  // Sin marco ni esquinas redondeadas en el celular
  assert.match(pagina, /#playerOverlay \.player-box\.is-player \{\s*width: 100%; max-width: 100%; margin: 0; border-radius: 0; border: 0;/);
  // De lado: el video usa la altura de la pantalla
  assert.match(pagina, /orientation: landscape\) and \(max-height: 520px\)/);
  assert.match(pagina, /\.player-box__video \{ aspect-ratio: auto; height: calc\(var\(--zoo-vh\) - 52px\)/);
  // Botón y funciones
  assert.match(pagina, /id="playerPantalla" onclick="alternarPantallaCompleta\(\)"/);
  assert.match(pagina, /id="playerSalirPant" onclick="salirPantallaCompleta\(\)"/);
  const js = entre('function pbEnPantallaCompleta', 'function mensajeEnVideo');
  assert.match(js, /requestFullscreen \|\| cont\.webkitRequestFullscreen/);
  assert.match(js, /o\.lock\('landscape'\)/);
  assert.match(js, /catch\(pbEntrarPseudo\)/);
  // El respaldo gana al modo de lado y gira el video en vertical
  assert.match(pagina, /#playerOverlay\.pb-pseudo \.player-box\.is-player \.player-box__video/);
  assert.match(pagina, /transform: rotate\(90deg\)/);
  // Se sale al cerrar, al cambiar de pantalla y con Esc
  assert.match(entre('function salirDelReproductor', 'function closePlayer'), /salirPantallaCompleta\(\)/);
  assert.match(pagina, /classList\.contains\('pb-pseudo'\)\) salirPantallaCompleta\(\); else closePlayer\(\)/);
  assert.match(entre('function mensajeEnVideo', 'async function cargarVideo'), /salirPantallaCompleta\(\)/);
});

// ───────── materiales por curso y clase ─────────
test('el detalle del curso lista los materiales del curso con su estado y los abre con el visor (el servidor decide)', () => {
  assert.match(pagina, /club-materiales\.css\?v=/);
  assert.match(pagina, /club-materiales\.js\?v=/);
  assert.ok(pagina.indexOf('club-materiales.js') > pagina.indexOf('club-cursos-ui.js'));
  assert.match(pagina, /apiFetch\('\/api\/materiales\/cursos'\)/);
  assert.match(pagina, /materialesHTML: window\.ZOO_MATERIALES \? ZOO_MATERIALES\.seccionDetalleCursoHTML/);
  assert.match(pagina, /ZOO_MATERIALES\.abrirMaterial\(ZOORIGEN_CLUB, m, fuente\)/);
  assert.match(leer('assets/js/club-cursos-ui.js'), /\$\{d\.materialesHTML \|\| ''\}/);
  const mat = entre('function zcAbrirMaterial', 'window.zcAbrirMaterial');
  assert.match(mat, /m\.soloMiembros\) \{ mostrarPaywallCurso\(\)/);
  assert.match(mat, /!m\.desbloqueado\) \{ aviso\('Material bloqueado'/);
});

test('tras marcar una clase se vuelve a pedir la lista y se avisa de los materiales que se desbloquearon', () => {
  const f = entre('async function avisarMaterialesDesbloqueados', 'async function marcarYSiguiente');
  assert.match(f, /await cargarMaterialesCursos\(\)/);
  assert.match(f, /Se desbloque/);
});

test('"Ir al curso" desde PDFs y materiales abre el detalle del curso (?curso=)', () => {
  assert.match(pagina, /get\('curso'\)/);
  assert.match(leer('assets/js/club-materiales.js'), /\?curso=' \+ encodeURIComponent\(g\.cursoId\)/);
});

test('PDFs y materiales: bloque "De tus cursos", filas con candado y ninguna llamada a Firestore para los PDF de Drive', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /\['cursos', 'De tus cursos'\]/);
  assert.match(js, /Materiales de tus cursos/);
  assert.match(js, /abrirVisorMaterial\(club, m, fuente === 'drive' \? 'drive' : 'catalogo'\)/);
  assert.doesNotMatch(js, /getPdfs|collection\(/);
  const css = leer('assets/css/club-materiales.css');
  assert.match(css, /\.mt-fila \{/);
  assert.doesNotMatch(css.slice(css.indexOf('Materiales de tus cursos y materiales sueltos')), /gradient/);
});

test('versiones ?v= coherentes: la misma de club-materiales.js/.css y club-cursos-ui.js en todas las páginas que los cargan', () => {
  const versiones = {};
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    for (const m of leer('pages/' + f).matchAll(/assets\/(?:js|css)\/(club-materiales\.js|club-materiales\.css|club-cursos-ui\.js)\?v=([\w.-]+)/g)) {
      (versiones[m[1]] = versiones[m[1]] || new Set()).add(m[2]);
    }
  }
  for (const [archivo, set] of Object.entries(versiones)) assert.equal(set.size, 1, `${archivo}: ${[...set].join(', ')}`);
  assert.equal(Object.keys(versiones).length, 3);
});

test('panel de administración: el formulario de PDF tiene Curso, Clase y Retos, y al guardar limpia lo que se quita', () => {
  const a = leer('pages/admin-club.html');
  for (const id of ['f_curso', 'f_clase', 'f_retos']) assert.match(a, new RegExp('id="' + id + '"'), id);
  assert.match(a, /Clase que lo desbloquea/);
  assert.match(a, /Retos para abrirlo/);
  const guardar = a.slice(a.indexOf('window.savePdf'), a.indexOf('WEBINARS'));
  assert.match(guardar, /FieldValue\.delete\(\)/);
  assert.match(guardar, /data\.cursoId = cursoId \|\| borrar/);
  assert.match(a, /textoLigaPdf\(x, cursosPdf\)/, 'la lista de PDF muestra a qué curso y clase pertenece cada uno');
});

test('FIRESTORE-REGLAS-v6: los PDF solo los lee el administrador (el enlace de Drive lo entrega el servidor)', () => {
  const v6 = leer('FIRESTORE-REGLAS-v6.txt');
  const bloque = v6.slice(v6.indexOf('match /pdfs/{pdfId}'), v6.indexOf('match /sesiones/'));
  assert.match(bloque, /allow read, write: if isAdmin\(\)/);
  assert.doesNotMatch(bloque, /isAuthed/);
});
