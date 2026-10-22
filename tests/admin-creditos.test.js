'use strict';

// Sección «Créditos» del panel: cifras, cuentas con el botón de regalar, historial de regalos y gráfica de materiales más canjeados.
// Ejecutar: node --test tests/admin-creditos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-creditos.js'));

const cuenta = (uid, nombre, extra) => Object.assign({ uid, nombre, correo: uid + '@x.test', registro: '2026-10-10T15:30:00Z', estado: 'sin-plan', conAcceso: false, planTipo: null, saldo: 0, regalados: 0, canjeados: 0, ultimoRegalo: null }, extra);
const regalo = (id, extra) => Object.assign({ id, uid: 'a', nombre: 'Ana Pérez', correo: 'ana@x.test', cantidad: 100, en: '2026-10-20T16:00:00Z', regaladoPor: 'admin@x.test', estado: 'pendiente', canje: null }, extra);
const datos = () => ({
  miembros: { ok: true, truncado: false, miembros: [cuenta('a', 'Ana Pérez', { saldo: 100, ultimoRegalo: '2026-10-20T16:00:00Z', estado: 'activo', planTipo: 'mensual', conAcceso: true }), cuenta('b', 'Beto <b>'), cuenta('c', 'Cecilia Núñez')] },
  historial: {
    total: 2, hayMas: false, totales: { todos: 2, pendientes: 1, canjeados: 1 },
    regalos: [regalo('r1'), regalo('r2', { uid: 'b', nombre: 'Beto', estado: 'canjeado', canje: { materialId: 'pdf:guia-1', titulo: 'Guía de bioseguridad completa', en: '2026-10-21T10:00:00Z' } })]
  },
  metricas: { regalados: 200, canjeados: 100, pendientes: 100, regalos: 2, canjes: 1, materiales: [{ clave: 'pdf:guia-1', titulo: 'Guía de bioseguridad completa', canjes: 1 }] }
});

test('la sección existe en el menú (Comunidad), con ícono y se dibuja desde renderSection', () => {
  const s = P.seccion('creditos');
  assert.ok(s); assert.equal(s.grupo, 'Comunidad'); assert.equal(s.titulo, 'Créditos');
  const html = leer('pages/admin-club.html');
  assert.match(html, /data-sec="creditos"><svg class="zi"/);
  assert.match(html, /sec === 'creditos'\) window\.ZOO_ADMIN_CREDITOS\.creditos\(\)/);
  assert.ok(html.indexOf('admin-creditos.js') > html.indexOf('admin-vistas.js'), 'después de las vistas (usa sus ventanas)');
  assert.ok(html.indexOf('admin-creditos.js') > html.indexOf('admin-graficas.js'));
});

test('arriba, tres cifras reales: créditos regalados, canjeados y pendientes de canjear', () => {
  assert.deepEqual(A.cifras({ regalados: 300, canjeados: 100, pendientes: 200 }).map(c => c.rotulo), ['créditos regalados', 'créditos canjeados', 'pendientes de canjear']);
  assert.deepEqual(A.cifras({ regalados: 300, canjeados: 100, pendientes: 200 }).map(c => c.valor), ['300', '100', '200']);
  assert.deepEqual(A.cifras(null).map(c => c.valor), ['0', '0', '0'], 'sin datos, ceros: nada inventado');
  const h = A.vistaHTML(datos());
  for (const t of ['créditos regalados', 'créditos canjeados', 'pendientes de canjear']) assert.ok(h.includes(t), t);
  assert.match(h, /zs-seccion/);
});

test('cuentas: nombre, correo y fecha de registro en renglones separados, estado, saldo y el botón «Regalar 100 créditos» al costado', () => {
  const h = A.filaMiembro(datos().miembros.miembros[0]);
  assert.match(h, /class="ap-cr__nombre">Ana Pérez</);
  assert.match(h, /ap-mi__linea ap-mi__correo[^>]*>.*a@x\.test/s);
  assert.match(h, /ap-mi__linea ap-mi__reg[^>]*>.*Se registró/s);
  assert.ok(h.indexOf('a@x.test') < h.indexOf('Se registró'), 'el correo y la fecha no comparten renglón');
  assert.match(h, /<strong>100<\/strong><span>créditos<\/span>/);
  assert.match(h, /data-accion="regalar" data-uid="a"[^>]*>.*Regalar 100 créditos/s);
  assert.match(h, /Último regalo/);
  assert.match(h, /Mensual|Activo/);
});

test('cuentas: de la más reciente a la más antigua tal como las manda el servidor, búsqueda sin acentos y «mostrar más»', () => {
  const m = Array.from({ length: 30 }, (_, i) => cuenta('u' + i, 'Persona ' + i));
  const h = A.listaMiembrosHTML(m, 25, '');
  assert.equal((h.match(/class="ap-mi ap-cr/g) || []).length, 25);
  assert.match(h, /Mostrando 25 de 30/);
  assert.match(h, /data-accion="mas-miembros"[^>]*>Mostrar 5 más/);
  assert.ok(h.indexOf('Persona 0<') < h.indexOf('Persona 24<'), 'respeta el orden recibido');
  assert.deepEqual(A.filtrarMiembros([cuenta('a', 'Núñez Pérez'), cuenta('b', 'Otra')], 'NUNEZ').map(x => x.uid), ['a']);
  assert.match(A.listaMiembrosHTML([], 25, 'zzz'), /Nadie coincide con esa búsqueda/);
  assert.match(A.listaMiembrosHTML([], 25, ''), /Todavía no hay cuentas/);
});

test('texto de confirmación: «Vas a regalar 100 créditos a NOMBRE. Alcanzan para canjear 1 material.», con el nombre escapado', () => {
  assert.equal(A.textoConfirmacion('Ana Pérez'), 'Vas a regalar 100 créditos a <strong>Ana Pérez</strong>. Alcanzan para canjear 1 material.');
  assert.ok(!A.textoConfirmacion('<img src=x onerror=1>').includes('<img'));
  assert.equal(A.REGALO, 100);
});

test('el botón de regalar se bloquea mientras se procesa, pide confirmación, manda una clave de operación y avisa con un aviso', () => {
  const js = leer('assets/js/admin-creditos.js');
  assert.match(js, /V\.confirmar\(\{ titulo: 'Regalar '/);
  assert.match(js, /est\.ocupado/);
  assert.match(js, /\.disabled = true/);
  assert.match(js, /'\/api\/admin\/creditos\/regalar', \{ method: 'POST', body: \{ uid: uid, clave: nuevaClave\(\) \}/);
  assert.match(js, /ctx\.toast\('Listo: regalaste '/);
  assert.match(js, /getRandomValues/);
  assert.doesNotMatch(js, /cantidad:/, 'la cantidad no se manda: el servidor siempre regala 100');
});

test('historial de regalos: a quién, fecha, quién lo regaló y Pendiente o Canjeado con el material y la fecha de canje', () => {
  const h = A.historialHTML(datos().historial, { filtro: 'todos' });
  assert.match(h, /Ana Pérez/);
  assert.match(h, /Por admin@x\.test/);
  assert.match(h, /Pendiente de canjear/);
  assert.match(h, /Todavía no lo canjea/);
  assert.match(h, /Canjeado<\/span>/);
  assert.match(h, /Guía de bioseguridad completa/);
  assert.match(h, /Canjeado 21 oct 2026|Canjeado .*oct/);
  assert.match(h, /data-filtro-regalo="todos" aria-pressed="true">Todos · 2/);
  assert.match(h, /data-filtro-regalo="pendientes" aria-pressed="false">Pendientes · 1/);
  assert.match(h, /data-filtro-regalo="canjeados" aria-pressed="false">Canjeados · 1/);
  assert.match(h, /id="apCrBuscarHistorial"/);
  assert.match(A.historialHTML({ regalos: [], totales: { todos: 0, pendientes: 0, canjeados: 0 }, total: 0 }, {}), /Todavía no has regalado créditos/);
  assert.match(A.historialHTML({ regalos: [], totales: { todos: 3, pendientes: 1, canjeados: 2 }, total: 0 }, { filtro: 'pendientes' }), /Ningún regalo coincide/);
  assert.match(A.historialHTML({ regalos: [regalo('x')], totales: { todos: 40, pendientes: 40, canjeados: 0 }, total: 40, hayMas: true }, {}), /data-accion="mas-regalos"/);
  assert.match(A.historialHTML(null, {}), /Todavía no has regalado créditos/);
});

test('gráfica «Materiales más canjeados»: barras horizontales ordenadas, nombre completo, valor y porcentaje, con «Cómo leerlo» y vacío amable', () => {
  const m = { materiales: [{ clave: 'pdf:a', titulo: 'Material con un nombre bastante largo que no debe recortarse nunca', canjes: 3 }, { clave: 'pdf:b', titulo: 'Otro material', canjes: 1 }] };
  const h = A.graficaHTML(m);
  assert.match(h, /zg-rk/);
  assert.match(h, /Material con un nombre bastante largo que no debe recortarse nunca/);
  assert.match(h, /75 %/);
  assert.ok(h.indexOf('nombre bastante largo') < h.indexOf('Otro material'));
  assert.match(h, /Cómo leerlo:<\/strong> El material más canjeado es «Material con un nombre bastante largo que no debe recortarse nunca»: 3 canjes de 4 en total \(75 %\)/);
  assert.match(A.fraseGrafica({ materiales: [{ titulo: 'A', canjes: 2 }, { titulo: 'B', canjes: 2 }] }), /Hay empate arriba/);
  const vacio = A.graficaHTML({ materiales: [] });
  assert.match(vacio, /Aún nadie ha canjeado créditos/);
  assert.doesNotMatch(vacio, /Cómo leerlo/);
  assert.match(A.graficaHTML(null), /Aún nadie ha canjeado créditos/);
});

test('la vista completa: título, cuentas, historial y gráfica, y sin datos no se rompe ni inventa nada', () => {
  const h = A.vistaHTML(datos());
  assert.deepEqual([...h.matchAll(/<h2>([^<]+)<\/h2>/g)].map(x => x[1]), ['Cuentas', 'Historial de regalos', 'Materiales más canjeados']);
  assert.match(h, /Beto &lt;b&gt;/, 'texto de las cuentas escapado');
  assert.ok(!h.includes('Beto <b>'));
  assert.doesNotThrow(() => A.vistaHTML(undefined));
  const vacio = A.vistaHTML({ miembros: { miembros: [] }, historial: null, metricas: null });
  assert.match(vacio, /Todavía no hay cuentas/);
  assert.match(vacio, /Aún nadie ha canjeado créditos/);
});

test('el módulo solo habla con los endpoints de créditos del servidor y no lee Firestore directo', () => {
  const js = leer('assets/js/admin-creditos.js');
  for (const r of ['/api/admin/creditos/miembros', '/api/admin/creditos/historial', '/api/admin/creditos/metricas', '/api/admin/creditos/regalar']) assert.ok(js.includes(r), r);
  assert.ok(!/\bdb\.collection|getDocs|firebase\.firestore/.test(js));
});

test('Retos y XP ya no tiene el espacio reservado de créditos', () => {
  assert.doesNotMatch(leer('assets/js/admin-vistas.js'), /Créditos por retos|ap-reserva/);
});

test('sin degradados ni emojis en el módulo ni en los estilos nuevos, y letra mínima de 12 px', () => {
  const js = leer('assets/js/admin-creditos.js');
  assert.doesNotMatch(js, /gradient\(/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js));
  const css = leer('assets/css/admin-club.css');
  const b = css.slice(css.indexOf('Créditos: cuentas con el botón'));
  assert.ok(b.length > 500);
  assert.doesNotMatch(b, /gradient/i);
  for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
});
