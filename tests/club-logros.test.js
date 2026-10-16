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
  niveles: [{ id: 1, nombre: 'Aprendiz', desde: 0, hasta: 300 }, { id: 2, nombre: 'Técnico', desde: 300, hasta: 1200 }, { id: 3, nombre: 'Profesional', desde: 1200, hasta: 2500 }, { id: 4, nombre: 'Líder', desde: 2500, hasta: 4500 }, { id: 5, nombre: 'Maestro', desde: 4500, hasta: 99999 }],
  xp: { total: 1350, logros: 500, retos: 400, referidos: 100, cursos: 290, bienvenida: 60 }, cursos: { terminados: 5, lista: [] },
  racha: 4, diasActivos: 12,
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
    { clave: 'referidos-1', ganado: true, usado: { cursoId: 'c2', fecha: '2026-10-01' }, disponible: false }
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
  const h = L.heroHTML(norm({ nivel: { id: 5, nombre: 'Maestro', xp: 5000, desde: 4500, hasta: 99999, faltan: 0 }, xp: { total: 5000, logros: 3000, retos: 1500, referidos: 500, cursos: 0, bienvenida: 0 } }));
  assert.ok(h.includes('Nivel 5 de 5'));
  assert.ok(h.includes('Nivel máximo alcanzado'));
  assert.ok(!h.includes('Te faltan'));
});

test('cinco indicadores: logros ganados, XP total, días activos, racha y cursos terminados', () => {
  const k = L.kpisHTML(norm());
  assert.equal((k.match(/class="lg-kpi"/g) || []).length, 5);
  assert.ok(k.includes('Cursos terminados') && k.includes('>5<'));
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

test('tarjeta de premios: los 3 premios con su estado (Disponible, Usado: curso, Te faltan N XP / invitados)', () => {
  const h = L.premiosHTML(norm({ premios: [{ clave: 'profesional', ganado: true, usado: null, disponible: true }, { clave: 'maestro', ganado: false }, { clave: 'referidos-1', ganado: false }] }), { titulosCursos: { c2: 'Manejo de reptiles' }, faltanInvitados: { 'referidos-1': 2 } });
  for (const t of ['Profesional', 'Maestro', 'Invita a 4 amigos']) assert.ok(h.includes('<h3>' + t + '</h3>'), t);
  assert.equal((h.match(/class="lg-tier /g) || []).length, 3, 'tres premios');
  assert.ok(!h.includes('Invita a 3 amigos') && !h.includes('Invita a 6 amigos'));
  assert.ok(h.includes('lg-chip--disponible'));
  assert.ok(h.includes('>Disponible<'));
  assert.ok(h.includes('Te faltan 3,150 XP'), 'Maestro: 4,500 - 1,350');
  assert.ok(h.includes('Te faltan 2 invitados'));
  assert.ok(h.includes('data-accion="elegir"') && h.includes('Elegir mi curso'));
  assert.ok(h.includes('<b>1</b><span>premio disponible</span>'));
});

test('premios: sin dato de invitados dice qué se necesita; el curso usado sin nombre dice "un curso"', () => {
  const h = L.premiosHTML(norm(), {});
  assert.ok(h.includes('Usado: un curso'));
  assert.ok(L.premiosHTML(norm({ premios: [] }), {}).includes('Requiere 4 invitados válidos'));
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
  assert.equal(v.length, 3);
});

test('premios: el "faltan" que manda el servidor tiene prioridad', () => {
  const v = L.premiosVista(norm({ premios: [{ clave: 'profesional', ganado: false, faltan: 77 }, { clave: 'referidos-1', ganado: false, faltan: 3 }] }), { faltanInvitados: { 'referidos-1': 9 } });
  assert.equal(v[0].chip.texto, 'Te faltan 77 XP');
  assert.equal(v[2].chip.texto, 'Te faltan 3 invitados');
  assert.equal(v.length, 3);
});

test('SIN membresía: vista previa con nivel y nombres de insignias, sin XP por insignia ni detalle, y con el aviso de suscripción', () => {
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
  assert.ok(pag.includes('Te faltan') && pag.includes('XP en total'), 'ven su nivel y su XP real (solo lectura), aunque no puedan sumar');
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

/* ───────────── Adenda 2: desglose de XP, niveles del servidor y tres premios ───────────── */

test('desglose de XP: logros, retos, invitados, cursos, bienvenida y total (con "N terminados")', () => {
  const h = L.desgloseHTML(norm().xp, norm().cursos);
  const filas = [...h.matchAll(/<li>[\s\S]*?<\/li>/g)].map(m => m[0]);
  assert.equal(filas.length, 6);
  const quita = s => s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.deepEqual(filas.map(quita), ['Logros 500 XP', 'Retos 400 XP', 'Invitados 100 XP', 'Cursos 5 terminados 290 XP', 'Bienvenida 60 XP', 'Total 1,350 XP']);
  assert.ok(L.desgloseHTML({ logros: 0, retos: 0, referidos: 0, cursos: 20, bienvenida: 0, total: 20 }, { terminados: 1 }).includes('1 terminado<'), 'singular');
  assert.ok(L.heroHTML(norm()).includes('class="lg-desglose"'));
});

test('el indicador de cursos terminados sale de cursos.terminados del servidor', () => {
  const k = L.kpisHTML(norm({ cursos: { terminados: 12, lista: [] } }));
  assert.ok(k.includes('>12<') && k.includes('Cursos terminados'));
  const sin = L.kpisHTML(SIN_MEMBRESIA());
  assert.ok(sin.includes('—'), 'sin membresía no se muestran los días, la racha ni los logros ganados');
  assert.ok(sin.includes('>0<') && sin.includes('XP total'), 'pero el XP total y los cursos sí se ven (solo lectura)');
});

test('los niveles y umbrales se dibujan con lo que manda el servidor (no los copia)', () => {
  const niveles = [{ id: 1, nombre: 'Novato', desde: 0, hasta: 500 }, { id: 2, nombre: 'Aficionado', desde: 500, hasta: 2000 }, { id: 3, nombre: 'Experto', desde: 2000, hasta: 4000 }];
  const d = norm({ niveles, nivel: { id: 2, nombre: 'Aficionado', xp: 1250, desde: 500, hasta: 2000, faltan: 750 }, xp: { total: 1250, logros: 1250 } });
  const h = L.heroHTML(d);
  assert.ok(h.includes('Nivel 2 de 3'), 'cuenta los niveles del servidor');
  for (const n of ['Novato', 'Aficionado', 'Experto']) assert.ok(h.includes('>' + n + '<'), n);
  assert.ok(!h.includes('>Profesional<') && !h.includes('>Maestro<'));
  assert.equal((h.match(/<li class="lg-nodo/g) || []).length, 3);
  assert.ok(h.includes('>500 XP<') && h.includes('>2,000 XP<'), 'umbral de cada nivel');
  assert.ok(h.includes('50%'), '(1250-500)/(2000-500)');
  assert.ok(h.includes('>Experto<'), 'siguiente rango');
  // el último nivel del servidor es el máximo aunque no sea el 5
  const max = L.heroHTML(norm({ niveles, nivel: { id: 3, nombre: 'Experto', xp: 4100, desde: 2000, hasta: 4000, faltan: 0 }, xp: { total: 4100 } }));
  assert.ok(max.includes('Nivel máximo alcanzado'));
});

test('sin niveles del servidor se usan los de respaldo (5) y la ruta muestra los umbrales', () => {
  const d = P.normalizar({ ok: true, membresia: true, nivel: { id: 2, nombre: 'Técnico', xp: 400, desde: 300, hasta: 1200, faltan: 800 }, xp: { total: 400 }, logros: [], premios: [] });
  const r = L.rutaHTML(d.nivel, 10, d.niveles);
  assert.equal((r.match(/<li class="lg-nodo/g) || []).length, 5);
  assert.ok(r.includes('>1,200 XP<') && r.includes('>4,500 XP<'));
});

test('premios: solo hay tres (Profesional, Maestro y un único premio de referidos con 4 invitados)', () => {
  const v = L.premiosVista(norm({ premios: [{ clave: 'referidos-2', ganado: true, disponible: true }] }), {});
  assert.deepEqual(v.map(x => x.clave), ['profesional', 'maestro', 'referidos-1'], 'un referidos-2 viejo del servidor no se muestra');
  assert.deepEqual(P.PREMIOS_INFO.map(p => p.clave), ['profesional', 'maestro', 'referidos-1']);
  const h = L.premiosHTML(norm({ premios: [{ clave: 'referidos-1', ganado: true, usado: { cursoId: 'c2' } }] }), { titulosCursos: { c2: 'Manejo de reptiles' } });
  assert.ok(h.includes('Usado: Manejo de reptiles'));
  assert.ok(h.includes('Invita a 4 amigos') && h.includes('4 invitados válidos'));
  assert.ok(!/Invita a (3|6) amigos|6 invitados|3 invitados/.test(h));
});
