'use strict';
// Mis logros: constructores de HTML y estructura de la página.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../assets/js/club-premios.js');
const L = require('../assets/js/club-logros-ui.js');
const I = require('../assets/js/admin-iconos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}\u{1F000}-\u{1F2FF}]/u;

const resp = (extra) => Object.assign({
  ok: true, membresia: true,
  nivel: { id: 3, nombre: 'Profesional', xp: 1350, desde: 1200, hasta: 2500, faltan: 1150 },
  xp: { total: 1350, logros: 800, retos: 450, referidos: 100 }, racha: 4, diasActivos: 12,
  logros: [
    { id: 'l1', nombre: 'Primer paso', descripcion: 'Entra al club', categoria: 'Inicio', xp: 20, ganado: true },
    { id: 'l2', nombre: 'Curso terminado', descripcion: 'Termina un curso', categoria: 'Cursos', xp: 80, ganado: true },
    { id: 'l3', nombre: 'Constante', descripcion: '7 días seguidos', categoria: 'Constancia', xp: 60, ganado: false },
    { id: 'l4', nombre: 'Voz del club', descripcion: 'Publica en el foro', categoria: 'Comunidad', xp: 40, ganado: false },
    { id: 'r1', nombre: 'Primer reto', descripcion: 'Supera un reto', categoria: 'Retos', xp: 30, ganado: true },
    { id: 'm1', nombre: 'Maestro de campo', descripcion: 'Todo lo demás', categoria: 'Maestría', xp: 200, ganado: false },
    { id: 'x1', nombre: 'Otra cosa', descripcion: 'Algo nuevo', categoria: 'Temporada', xp: 10, ganado: false }
  ],
  premios: [
    { clave: 'profesional', ganado: true, usado: null, disponible: true },
    { clave: 'maestro', ganado: false, usado: null, disponible: false },
    { clave: 'referidos-1', ganado: true, usado: { cursoId: 'c2', fecha: '2026-10-01' }, disponible: false },
    { clave: 'referidos-2', ganado: false, usado: null, disponible: false }
  ],
  disponibles: 1
}, extra || {});
const norm = extra => P.normalizar(resp(extra));
const SIN_MEMBRESIA = () => P.normalizar({ ok: true, membresia: false, nivel: { id: 1, nombre: 'Aprendiz', xp: 0, desde: 0, hasta: 300, faltan: 300 },
  logros: resp().logros.map(l => ({ id: l.id, nombre: l.nombre, categoria: l.categoria })), premios: [], disponibles: 0 });

test('el encabezado dice "Nivel N de 5", el rango y cuántos XP faltan para el siguiente', () => {
  const h = L.heroHTML(norm());
  assert.ok(h.includes('Nivel 3 de 5'));
  assert.ok(h.includes('>Profesional<'));
  assert.ok(h.includes('1,350 XP en total'));
  assert.ok(h.includes('Te faltan <b>1,150 XP</b>'));
  assert.ok(h.includes('>Líder<'), 'el siguiente rango');
  assert.ok(h.includes('stroke-dasharray:'));
});

test('la ruta tiene 5 nodos: los anteriores hechos, el actual marcado y el resto pendiente', () => {
  const r = L.rutaHTML(norm().nivel, 50);
  assert.equal((r.match(/<li class="lg-nodo/g) || []).length, 5);
  assert.equal((r.match(/is-hecho/g) || []).length, 2);
  assert.equal((r.match(/is-actual/g) || []).length, 1);
  assert.equal((r.match(/is-sig/g) || []).length, 2);
  assert.equal((r.match(/aria-current="step"/g) || []).length, 1);
  for (const n of ['Aprendiz', 'Técnico', 'Profesional', 'Líder', 'Maestro']) assert.ok(r.includes(n));
});

test('porcentaje de nivel: dentro del rango, tope en el máximo y sin dividir entre cero', () => {
  assert.equal(L.porcentajeNivel({ id: 3, desde: 1200, hasta: 2500 }, 1850), 50);
  assert.equal(L.porcentajeNivel({ id: 2, desde: 300, hasta: 1200 }, 200), 0);
  assert.equal(L.porcentajeNivel({ id: 5, desde: 4500, hasta: 99999 }, 5000), 100);
  assert.equal(L.porcentajeNivel({ id: 1, desde: 0, hasta: 0 }, 5), 100);
  assert.equal(L.porcentajeNivel({ id: 1, desde: 0, hasta: 300 }, 999), 100);
});

test('en el nivel máximo no hay "te faltan" ni siguiente rango', () => {
  const h = L.heroHTML(norm({ nivel: { id: 5, nombre: 'Maestro', xp: 5000, desde: 4500, hasta: 99999, faltan: 0 }, xp: { total: 5000, logros: 3000, retos: 1500, referidos: 500 } }));
  assert.ok(h.includes('Nivel 5 de 5'));
  assert.ok(h.includes('Nivel máximo alcanzado'));
  assert.ok(!h.includes('Te faltan'));
});

test('cuatro indicadores: logros ganados, XP total, días activos y racha', () => {
  const k = L.kpisHTML(norm());
  assert.equal((k.match(/class="lg-kpi"/g) || []).length, 4);
  assert.ok(k.includes('Logros ganados') && k.includes('>3<small>/7</small>'));
  assert.ok(k.includes('XP total') && k.includes('1,350'));
  assert.ok(k.includes('Días activos') && k.includes('>12<'));
  assert.ok(k.includes('Racha'));
});

test('las insignias se agrupan por categoría en orden fijo y las categorías nuevas del servidor van al final', () => {
  const h = L.categoriasHTML(norm());
  const orden = ['Inicio', 'Cursos', 'Constancia', 'Comunidad', 'Retos', 'Maestría', 'Temporada'].map(n => h.indexOf('<h3>' + n + '</h3>'));
  assert.ok(orden.every(i => i >= 0), 'están todas');
  assert.deepEqual(orden.slice().sort((a, b) => a - b), orden, 'en el orden esperado');
  assert.equal((h.match(/class="lg-ins is-ganada/g) || []).length, 3);
  assert.equal((h.match(/class="lg-ins is-bloqueada/g) || []).length, 4);
  assert.ok(h.includes('1/1') && h.includes('0/1'));
  assert.ok(h.includes('Termina un curso') && h.includes('+80 XP'));
});

test('las categorías se reconocen aunque cambien mayúsculas o acentos', () => {
  const g = L.agruparPorCategoria([{ id: 'a', categoria: 'MAESTRIA' }, { id: 'b', categoria: 'maestría' }, { id: 'c', categoria: 'Inicio' }]);
  assert.deepEqual(g.map(x => [x.nombre, x.logros.length]), [['Inicio', 1], ['Maestría', 2]]);
});

test('tarjeta de premios: los 4 premios con su estado (Disponible, Usado: curso, Te faltan N XP / invitados)', () => {
  const h = L.premiosHTML(norm(), { titulosCursos: { c2: 'Manejo de reptiles' }, faltanInvitados: { 'referidos-2': 2 } });
  for (const t of ['Profesional', 'Maestro', 'Invita a 3 amigos', 'Invita a 6 amigos']) assert.ok(h.includes('<h3>' + t + '</h3>'), t);
  assert.ok(h.includes('lg-chip--disponible'));
  assert.ok(h.includes('>Disponible<'));
  assert.ok(h.includes('Usado: Manejo de reptiles'));
  assert.ok(h.includes('Te faltan 3,150 XP'), 'Maestro: 4,500 - 1,350');
  assert.ok(h.includes('Te faltan 2 invitados'));
  assert.ok(h.includes('data-accion="elegir"') && h.includes('Elegir mi curso'));
  assert.ok(h.includes('<b>1</b><span>premio disponible</span>'));
});

test('premios: sin dato de invitados dice qué se necesita; el curso usado sin nombre dice "un curso"', () => {
  const h = L.premiosHTML(norm(), {});
  assert.ok(h.includes('Usado: un curso'));
  assert.ok(h.includes('Requiere 6 invitados válidos'));
});

test('premios: sin premio disponible no hay botón "Elegir mi curso"', () => {
  const h = L.premiosHTML(norm({ disponibles: 0, premios: [{ clave: 'profesional', ganado: true, usado: { cursoId: 'c1' } }] }), {});
  assert.ok(!h.includes('Elegir mi curso') && !h.includes('data-accion'));
  assert.ok(h.includes('premios disponibles'));
});

test('premios: un premio ganado pero todavía sin usar ni disponible se muestra como "Ganado"; "Te faltan 1 invitado" en singular', () => {
  const v = L.premiosVista(norm({ premios: [{ clave: 'maestro', ganado: true, usado: null, disponible: false }] }), { faltanInvitados: { 'referidos-1': 1 } });
  assert.equal(v.find(x => x.clave === 'maestro').chip.texto, 'Ganado');
  assert.equal(v.find(x => x.clave === 'referidos-1').chip.texto, 'Te faltan 1 invitado');
  assert.equal(v.length, 4);
});

test('premios: el "faltan" que manda el servidor tiene prioridad', () => {
  const v = L.premiosVista(norm({ premios: [{ clave: 'profesional', ganado: false, faltan: 77 }, { clave: 'referidos-1', ganado: false, faltan: 3 }] }), { faltanInvitados: { 'referidos-1': 9 } });
  assert.equal(v[0].chip.texto, 'Te faltan 77 XP');
  assert.equal(v[2].chip.texto, 'Te faltan 3 invitados');
});

test('SIN membresía: vista previa con nivel y nombres de insignias, sin XP ni detalle, y con el aviso de suscripción', () => {
  const d = SIN_MEMBRESIA();
  const pag = L.paginaHTML(d, {});
  assert.ok(pag.includes('Vista previa.'));
  assert.ok(pag.includes('Para ver el detalle, sumar XP y ganar premios necesitas una suscripción activa.'));
  assert.ok(pag.includes('club-suscripcion.html'));
  assert.ok(pag.includes('Nivel 1 de 5') && pag.includes('>Aprendiz<'));
  assert.ok(pag.includes('Primer paso') && pag.includes('Maestro de campo'), 'los nombres de las insignias se ven');
  assert.ok(!pag.includes('Entra al club'), 'sin descripción');
  assert.ok(!/\+\d+ XP/.test(pag), 'sin XP por insignia');
  assert.equal((pag.match(/class="lg-ins is-ganada/g) || []).length, 0);
  assert.ok(!pag.includes('Elegir mi curso'));
  assert.ok(!pag.includes('Te faltan'), 'no se muestran avances de XP');
  assert.ok(pag.includes('Con suscripción'));
  assert.ok(pag.includes('—'), 'los indicadores no muestran números');
});

test('con membresía no aparece el aviso de vista previa', () => {
  assert.ok(!L.paginaHTML(norm(), {}).includes('Vista previa.'));
});

test('error del servidor: mensaje claro, botón "Reintentar" y ningún dato inventado', () => {
  const h = L.errorHTML();
  assert.ok(h.includes('No pudimos cargar tus logros'));
  assert.ok(h.includes('data-accion="reintentar"') && h.includes('Reintentar'));
  assert.ok(h.includes('role="alert"'));
  assert.ok(!/Nivel \d|XP/.test(h.replace('No mostramos tu nivel ni tus puntos', '')), 'sin niveles ni XP');
  assert.ok(L.errorHTML('Sesión <b>inválida</b>').includes('Sesión &lt;b&gt;inválida'));
});

test('todo texto que viene del servidor se escapa', () => {
  const sucio = '<img src=x onerror=alert(1)>';
  const d = norm({ nivel: { id: 2, nombre: sucio }, logros: [{ id: 'z', nombre: sucio, descripcion: sucio, categoria: sucio, xp: 1, ganado: true }] });
  const h = L.paginaHTML(d, { titulosCursos: { c2: sucio } });
  assert.ok(!h.includes('<img'), 'sin etiquetas sin escapar');
  assert.ok(h.includes('&lt;img'));
});

test('ninguna pantalla nueva usa emojis y todos los íconos que pide existen', () => {
  for (const f of ['pages/club-logros.html', 'assets/js/club-logros-ui.js', 'assets/js/club-premios.js', 'assets/css/club-logros.css']) assert.ok(!EMOJI.test(leer(f)), 'emoji en ' + f);
  const html = L.paginaHTML(norm(), { titulosCursos: {} }) + L.paginaHTML(SIN_MEMBRESIA(), {}) + L.errorHTML() + P.elegirHTML([{ id: 'a', titulo: 'A', diasFalta: 2 }], 1, I);
  assert.ok(!EMOJI.test(html));
  const fuente = leer('assets/js/club-logros-ui.js') + leer('assets/js/club-premios.js');
  const pedidos = new Set([...fuente.matchAll(/ico\('([a-z0-9-]+)'/g)].map(m => m[1]).concat([...fuente.matchAll(/icono: '([a-z0-9-]+)'/g)].map(m => m[1]), [...fuente.matchAll(/'([a-z0-9-]+)'\s*:\s*'(trophy|crown|user-plus|users)'/g)].map(m => m[2]), ['trophy', 'crown', 'user-plus', 'users', 'flame', 'door-open', 'graduation-cap', 'target', 'check', 'lock', 'award']));
  for (const n of pedidos) assert.ok(I.existe(n), 'falta el ícono ' + n);
  // cada ícono del HTML generado se pinta (no queda vacío)
  assert.ok(!norm().logros.length || L.categoriasHTML(norm()).includes('<svg'));
});

test('la página lee TODO del servidor: sin cálculos propios de XP ni logros de club.js', () => {
  const pag = leer('pages/club-logros.html');
  assert.ok(!/ACHIEVEMENTS|unlockedAchievements|getProgress\(/.test(pag), 'ya no usa los logros viejos de club.js');
  assert.match(pag, /ZOO_PREMIOS\.consultar\(/);
  assert.match(pag, /ZOO_PREMIOS\.canjear\(\)/);
  assert.match(pag, /renderSidebar\('logros'/);
  for (const s of ['admin-iconos.js', 'club-acceso.js', 'club-cursos-ui.js', 'club-premios.js', 'club-logros-ui.js']) assert.match(pag, new RegExp('assets/js/' + s.replace('.', '\\.') + '\\?v=\\d+'), s);
  for (const c of ['club-cursos.css', 'club-logros.css']) assert.match(pag, new RegExp('assets/css/' + c.replace('.', '\\.') + '\\?v=\\d+'), c);
  // el orden de carga importa: premios usa el acceso y los íconos; la interfaz usa premios
  const pos = f => pag.indexOf('assets/js/' + f);
  assert.ok(pos('admin-iconos.js') < pos('club-acceso.js') && pos('club-acceso.js') < pos('club-premios.js') && pos('club-cursos-ui.js') < pos('club-premios.js') && pos('club-premios.js') < pos('club-logros-ui.js'));
});

test('las versiones (?v=) de lo editado son iguales en todas las páginas que lo cargan', () => {
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
  for (const archivo of ['club-acceso.js', 'club-cursos-ui.js', 'club-premios.js', 'club-cursos.css']) {
    const vs = new Set();
    for (const f of paginas) for (const m of leer('pages/' + f).matchAll(new RegExp(archivo.replace('.', '\\.') + '\\?v=([\\w.-]+)', 'g'))) vs.add(m[1]);
    assert.ok(vs.size <= 1, `${archivo} con versiones distintas: ${[...vs].join(', ')}`);
  }
});
