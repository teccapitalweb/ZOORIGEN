'use strict';
// Cola única de ventanas: un solo overlay a la vez, por prioridad, sin mostrar lo que ya no aplica.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const COLA = require('../assets/js/club-cola.js');

const RAIZ = path.resolve(__dirname, '..');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const nueva = (o) => COLA.crear(Object.assign({ pausaMs: 1, ocupadoMs: 3 }, o || {}));

// Ventana de mentira: queda "abierta" hasta que el test la cierra.
function ventana(registro, id) {
  let cerrar;
  const abierta = new Promise(r => { cerrar = r; });
  return {
    cerrar: (v) => cerrar(v),
    mostrar: () => { registro.push('abre:' + id); return abierta.then(v => { registro.push('cierra:' + id); return v; }); }
  };
}

test('el orden de prioridad es bienvenida, nombre, premio, recorrido, prueba, avisos, paywall', () => {
  const P = COLA.PRIORIDADES;
  const orden = ['bienvenida', 'nombre', 'premio', 'recorrido', 'prueba', 'avisos', 'paywall'];
  for (let i = 1; i < orden.length; i++) assert.ok(P[orden[i - 1]] < P[orden[i]], orden[i - 1] + ' antes que ' + orden[i]);
});

test('una sola ventana visible a la vez, aunque lleguen juntas', async () => {
  const c = nueva();
  const reg = [];
  const w = {};
  for (const id of ['paywall', 'bienvenida', 'avisos', 'nombre']) { w[id] = ventana(reg, id); c.encolar({ id, tipo: id, mostrar: w[id].mostrar }); }
  await pausa(20);
  assert.deepEqual(reg, ['abre:bienvenida'], 'solo la de mayor prioridad se abre');
  w.bienvenida.cerrar();
  await pausa(20);
  assert.deepEqual(reg.slice(-2), ['cierra:bienvenida', 'abre:nombre']);
  w.nombre.cerrar(); await pausa(20);
  assert.equal(reg[reg.length - 1], 'abre:avisos');
  w.avisos.cerrar(); await pausa(20);
  assert.equal(reg[reg.length - 1], 'abre:paywall');
  w.paywall.cerrar(); await pausa(20);
  // nunca hubo dos abiertas a la vez
  let abiertas = 0, max = 0;
  for (const e of reg) { abiertas += e.startsWith('abre') ? 1 : -1; max = Math.max(max, abiertas); }
  assert.equal(max, 1);
});

test('una ventana de menor prioridad no se adelanta mientras un módulo retiene la cola', async () => {
  const c = nueva();
  const reg = [];
  const aviso = ventana(reg, 'webinar');
  c.retener('onboarding');
  c.encolar({ id: 'webinar', tipo: 'webinar', mostrar: aviso.mostrar });
  await pausa(20);
  assert.deepEqual(reg, [], 'retenida: no se abre');
  const bien = ventana(reg, 'bienvenida');
  c.encolar({ id: 'bienvenida', tipo: 'bienvenida', mostrar: bien.mostrar });
  c.liberar('onboarding');
  await pausa(20);
  assert.deepEqual(reg, ['abre:bienvenida'], 'al liberar sale primero la bienvenida, no el aviso de webinar');
  bien.cerrar(); await pausa(20);
  assert.equal(reg[reg.length - 1], 'abre:webinar');
});

test('una retención caduca sola para no dejar el panel trabado', async () => {
  const c = nueva({ retencionMs: 15 });
  const reg = [];
  const w = ventana(reg, 'avisos');
  c.retener('x');
  c.encolar({ id: 'avisos', tipo: 'avisos', mostrar: w.mostrar });
  await pausa(5);
  assert.deepEqual(reg, []);
  await pausa(40);
  assert.deepEqual(reg, ['abre:avisos']);
  w.cerrar();
});

test('lo que ya no aplica se descarta sin mostrarse', async () => {
  const c = nueva();
  const reg = [];
  const bien = ventana(reg, 'bienvenida');
  let sigueVigente = true;
  const aviso = ventana(reg, 'avisos');
  c.encolar({ id: 'bienvenida', tipo: 'bienvenida', mostrar: bien.mostrar });
  const r = c.encolar({ id: 'avisos', tipo: 'avisos', vigente: () => sigueVigente, mostrar: aviso.mostrar });
  await pausa(10);
  sigueVigente = false;   // por ejemplo, el aviso del webinar ya se leyó en otra pestaña
  bien.cerrar();
  const res = await r;
  assert.equal(res.estado, 'descartado');
  assert.deepEqual(reg, ['abre:bienvenida', 'cierra:bienvenida']);
});

test('un id repetido no se encola dos veces', async () => {
  const c = nueva();
  const reg = [];
  const w = ventana(reg, 'nombre');
  c.encolar({ id: 'nombre', tipo: 'nombre', mostrar: w.mostrar });
  const r2 = await c.encolar({ id: 'nombre', tipo: 'nombre', mostrar: () => { reg.push('duplicada'); } });
  assert.equal(r2.estado, 'descartado');
  w.cerrar(); await pausa(10);
  assert.ok(!reg.includes('duplicada'));
});

test('una ventana que falla no traba a las demás', async () => {
  const c = nueva();
  const reg = [];
  const a = c.encolar({ id: 'a', tipo: 'bienvenida', mostrar: () => { throw new Error('falló'); } });
  c.encolar({ id: 'b', tipo: 'nombre', mostrar: () => { reg.push('b'); } });
  const ra = await a;
  assert.equal(ra.estado, 'error');
  await pausa(20);
  assert.deepEqual(reg, ['b']);
});

test('detener cancela el resto del grupo (por ejemplo, al irse a elegir curso)', async () => {
  const c = nueva();
  const reg = [];
  c.encolar({ id: 'prueba', tipo: 'prueba', grupo: 'onb', mostrar: () => ({ detener: true }) });
  const r = c.encolar({ id: 'avisos-del-grupo', tipo: 'avisos', grupo: 'onb', mostrar: () => { reg.push('no debía'); } });
  assert.equal((await r).estado, 'cancelado');
  assert.deepEqual(reg, []);
});

test('si hay una ventana ajena abierta, espera a que se cierre', async () => {
  let ajena = true;
  const c = nueva({ ocupado: () => ajena });
  const reg = [];
  c.encolar({ id: 'bienvenida', tipo: 'bienvenida', mostrar: () => { reg.push('abre'); } });
  await pausa(25);
  assert.deepEqual(reg, []);
  ajena = false;
  await pausa(25);
  assert.deepEqual(reg, ['abre']);
});

test('el panel carga la cola antes de club.js y la usan la bienvenida, el recorrido y el aviso', () => {
  const dash = fs.readFileSync(path.join(RAIZ, 'pages/club-dashboard.html'), 'utf8');
  assert.match(dash, /assets\/js\/club-cola\.js\?v=\d+/);
  assert.ok(dash.indexOf('club-cola.js') < dash.indexOf('assets/js/club.js'), 'la cola va antes de club.js');
  const onb = fs.readFileSync(path.join(RAIZ, 'assets/js/club-onboarding.js'), 'utf8');
  assert.match(onb, /ZOO_COLA/);
  assert.match(dash, /window\.ZOO_COLA/);
  for (const id of ['bienvenida-vip', "id: 'webinar-'", "tipo: 'avisos'", "tipo: 'recorrido'"]) assert.ok(dash.includes(id), 'el Inicio encola: ' + id);
  // con las clases en vivo en "Próximamente" no se muestra el aviso de webinar
  assert.match(dash, /enVivoPronto[\s\S]{0,80}hasActiveMembership\(session\)[\s\S]{0,60}todosLosWebinars/);
});
