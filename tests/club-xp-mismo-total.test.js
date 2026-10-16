'use strict';

// El XP es UNO solo. Retos (GET /api/retos), Mis logros y el panel del perfil (GET /api/premios) y la tarjeta del premio de bienvenida
// (POST /api/premios/bienvenida) muestran el MISMO total y el MISMO nivel, con o sin membresía vigente. Quien no es miembro lo ve en
// solo lectura (antes Retos mostraba 0 XP aunque ya tuviera los +100 de bienvenida). Ejecutar: node --test tests/club-xp-mismo-total.test.js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const raiz = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(raiz, rel), 'utf8');
const P = require(path.join(raiz, 'assets', 'js', 'club-premios.js'));
const L = require(path.join(raiz, 'assets', 'js', 'club-logros-ui.js'));
const R = require(path.join(raiz, 'assets', 'js', 'club-retos.js'));
const C = require(path.join(raiz, 'assets', 'js', 'club-curso-premio.js'));

const NIVELES = [
  { id: 1, nombre: 'Aprendiz', desde: 0, hasta: 500 }, { id: 2, nombre: 'Técnico', desde: 500, hasta: 1700 },
  { id: 3, nombre: 'Profesional', desde: 1700, hasta: 3500 }, { id: 4, nombre: 'Líder', desde: 3500, hasta: 5100 },
  { id: 5, nombre: 'Maestro', desde: 5100, hasta: 99999 }
];
const nivelDe = xp => {
  const n = NIVELES.find(v => xp >= v.desde && xp < v.hasta) || NIVELES[4];
  return { ...n, xp, faltan: n.id === 5 ? 0 : n.hasta - xp };
};

// Lo que contestaría el servidor para una misma persona: GET /api/premios y GET /api/retos con el mismo total.
function respuestas({ membresia, total, partes = {}, terminados = 0 }) {
  const xp = { total, logros: 0, retos: 0, referidos: 0, cursos: 0, bienvenida: 0, ...partes };
  return {
    premios: { ok: true, membresia, nivel: nivelDe(total), niveles: NIVELES, xp, cursos: { terminados, lista: [] }, bienvenida: { disponible: false, xp: 100 },
      racha: 0, diasActivos: 0, logros: [{ id: 'l1', nombre: 'Bienvenido a la manada', descripcion: 'x', categoria: 'Inicio' }], premios: [], disponibles: 0 },
    retos: { ok: true, membresia, nivel: nivelDe(total), xp: total, superados: 0, porReto: {}, camino: { quiz: 0, detective: 0, orden: 0 },
      caminoHechos: { quiz: [], detective: [], orden: [] }, retosHoy: [], totales: { quiz: 22, detective: 13, orden: 18 } }
  };
}

// Lo que ve la persona en cada pantalla
function vistas(r) {
  const logros = P.normalizar(r.premios);
  const retos = R.resumenNivel(R.normalizarEstado(r.retos));
  const avisoPremio = C.calcularBienvenida({ ok: true, xp: 100, yaReclamado: false, xpTotal: r.retos.xp, nivel: r.retos.nivel });
  return {
    logros: logros.xp.total, logrosNivel: logros.nivel.id, retos: retos.xp, retosNivel: retos.id,
    panel: logros.xp.total, tarjeta: avisoPremio && avisoPremio.nivel ? avisoPremio.nivel.xp : null, logros_: logros
  };
}

const casos = [
  ['cuenta nueva SIN membresía con los +100', { membresia: false, total: 100, partes: { bienvenida: 100 } }],
  ['cuenta nueva CON membresía con los +100', { membresia: true, total: 120, partes: { bienvenida: 100, logros: 20 } }],
  ['después de jugar un reto', { membresia: true, total: 150, partes: { bienvenida: 100, logros: 20, retos: 30 } }],
  ['después de terminar un curso', { membresia: true, total: 160, partes: { bienvenida: 100, logros: 20, cursos: 20, retos: 20 }, terminados: 1 }],
  ['miembro vencido (sigue viendo lo que ganó)', { membresia: false, total: 182, partes: { bienvenida: 100, retos: 42, cursos: 20, logros: 20 }, terminados: 1 }],
  ['nivel 2 (Técnico)', { membresia: false, total: 620, partes: { bienvenida: 100, retos: 520 } }]
];

for (const [nombre, caso] of casos) {
  test('mismo total y nivel en Retos, Logros y el panel: ' + nombre, () => {
    const v = vistas(respuestas(caso));
    assert.equal(v.retos, caso.total, 'Retos');
    assert.equal(v.logros, caso.total, 'Mis logros');
    assert.equal(v.panel, caso.total, 'panel del perfil');
    assert.equal(v.retosNivel, v.logrosNivel, 'el mismo nivel');
    assert.equal(v.retosNivel, nivelDe(caso.total).id);
  });
}

test('Logros: quien no es miembro ve su XP, su desglose con la bienvenida y sus cursos (la lista de insignias sigue en vista previa)', () => {
  const d = P.normalizar(respuestas({ membresia: false, total: 140, partes: { bienvenida: 100, cursos: 20, logros: 20 }, terminados: 1 }).premios);
  assert.deepEqual([d.xp.total, d.xp.bienvenida, d.xp.cursos, d.cursos.terminados], [140, 100, 20, 1]);
  assert.ok(d.logros.every(l => l.ganado === false), 'ninguna insignia aparece como ganada sin membresía');
  const hero = L.heroHTML(d);
  assert.ok(hero.includes('140 XP en total'), 'el encabezado lo dice');
  assert.match(hero, /Bienvenida[^]*100 XP/, 'el desglose muestra los +100');
  assert.ok(hero.includes('1 terminado'));
  assert.ok(!hero.includes('Empieza a sumar XP'), 'ya no esconde su XP detrás de "Empieza a sumar"');
  const kpis = L.kpisHTML(d);
  assert.ok(kpis.includes('>140<'), 'el indicador de XP total');
  assert.ok(kpis.includes('—'), 'los días, la racha y los logros ganados siguen sin mostrarse');
});

test('Retos: sin membresía el encabezado muestra los 100 XP y la barra al siguiente nivel', () => {
  const e = R.normalizarEstado(respuestas({ membresia: false, total: 100, partes: { bienvenida: 100 } }).retos);
  assert.equal(e.membresia, false);
  const n = R.resumenNivel(e);
  assert.deepEqual([n.id, n.nombre, n.xp, n.faltan, n.pct], [1, 'Aprendiz', 100, 400, 20]);
});

test('la tarjeta del premio dice el mismo total que Retos (el que devuelve POST /api/premios/bienvenida)', () => {
  const info = C.calcularBienvenida({ ok: true, xp: 100, yaReclamado: false, xpTotal: 100, nivel: nivelDe(100) });
  assert.equal(info.xp, 100);
  assert.equal(info.nivel.xp, 100);
});

test('el panel del perfil pide las cifras a TODOS (ya no sale antes si la cuenta no es de miembro) y pinta lo que contesta el servidor', () => {
  const fuente = leer('assets/js/club-shell.js');
  const i = fuente.indexOf('function cargarCifrasPerfil');
  assert.ok(i > 0);
  const cuerpo = fuente.slice(i, fuente.indexOf('function abrirPerfil'));
  assert.doesNotMatch(cuerpo, /!plan\.miembro/, 'no se salta la petición a quien no es miembro');
  assert.doesNotMatch(cuerpo, /membresia === false/, 'no descarta la respuesta de solo lectura');
  assert.match(cuerpo, /\/api\/premios/);
  assert.match(cuerpo, /data-pm-xp/);
});

test('club-premios.js ya no pone en cero cursos ni bienvenida cuando la cuenta no es de miembro', () => {
  const fuente = leer('assets/js/club-premios.js');
  assert.doesNotMatch(fuente, /cursos: membresia \? Math\.max/);
  assert.doesNotMatch(fuente, /bienvenida: membresia \? Math\.max/);
});
