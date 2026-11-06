'use strict';

// Una sola cifra de «con acceso»: las cuentas de administración tienen acceso pero NO cuentan como membresías.
// Resumen (servidor), Miembros, Suscripciones > Usuarios activos y Métricas > Negocio dicen lo mismo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-suscripciones.js'));

test('Miembros: «con acceso hoy» no cuenta a los administradores y lo dice en su rótulo', () => {
  const vistas = leer('assets/js/admin-vistas.js');
  assert.match(vistas, /m\.conAcceso === true && !m\.esAdmin/);
  assert.match(vistas, /rotulo: 'con acceso hoy \(sin administradores\)'/);
  assert.doesNotMatch(vistas, /conteo\.activo \+ conteo\['cancelado-vigente'\]/);
});

test('Suscripciones > Usuarios activos cuenta lo mismo: con acceso vigente y sin administración', () => {
  const lista = [
    { uid: 'a', conAcceso: true, esAdmin: false, estado: 'activo', planTipo: 'mensual', origen: 'stripe', vence: new Date(Date.now() + 20 * 86400000).toISOString() },
    { uid: 'c', conAcceso: true, esAdmin: false, estado: 'cancelado-vigente', planTipo: 'mensual', origen: 'stripe', vence: new Date(Date.now() + 5 * 86400000).toISOString() },
    { uid: 'adm', conAcceso: true, esAdmin: true, estado: 'activo', planTipo: 'anual', origen: 'manual', vence: new Date(Date.now() + 200 * 86400000).toISOString() },
    { uid: 'v', conAcceso: false, esAdmin: false, estado: 'vencido' }
  ];
  const conAcceso = lista.filter(m => m.conAcceso === true && !m.esAdmin).length;
  assert.equal(conAcceso, 2);
  assert.equal(A.resumenActivos(lista).total, conAcceso);
});
