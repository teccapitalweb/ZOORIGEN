'use strict';
// Módulo compartido de la vista previa para quien no es miembro (assets/js/club-paywall.js).
// La parte pura se prueba aquí; la parte de pantalla (toast, ventana) se verifica con Chrome real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const P = require('../assets/js/club-paywall.js');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('se carga en Node sin document y expone solo la parte pura', () => {
  for (const f of ['esMiembro', 'textoAviso', 'bloqueoHTML', 'vistaBorrosaHTML', 'marcadorHTML', 'chipCandadoHTML', 'etiquetaEjemploHTML', 'avisoVistaPreviaHTML', 'modalHTML', 'esc']) {
    assert.equal(typeof P[f], 'function', f);
  }
  assert.equal(P.RUTA_SUSCRIPCION, 'club-suscripcion.html');
  assert.equal(P.requiereMembresia, undefined, 'requiereMembresia es parte de pantalla');
});

test('esMiembro: plan activo, cancelado con acceso vigente y administrador sí; el resto no', () => {
  assert.equal(P.esMiembro({ planStatus: 'active' }), true);
  assert.equal(P.esMiembro({ planStatus: 'cancelled_active' }), true);
  assert.equal(P.esMiembro({ role: 'admin', planStatus: 'pending_payment' }), true);
  for (const s of ['pending_payment', 'expired', 'past_due', undefined, '']) assert.equal(P.esMiembro({ planStatus: s }), false, String(s));
  assert.equal(P.esMiembro(null), false);
  assert.equal(P.esMiembro(undefined), false);
  assert.equal(P.esMiembro('active'), false);
});

test('esMiembro delega en hasActiveMembership del club cuando existe (misma regla que el resto del sitio)', () => {
  const club = { hasActiveMembership: s => s.uid === 'x' };
  assert.equal(P.esMiembro({ uid: 'x', planStatus: 'pending_payment' }, club), true);
  assert.equal(P.esMiembro({ uid: 'y', planStatus: 'pending_payment' }, club), false);
  // si el club falla, se usa el estado de la sesión
  const roto = { hasActiveMembership() { throw new Error('x'); } };
  assert.equal(P.esMiembro({ planStatus: 'active' }, roto), true);
});

test('la regla coincide con ZOORIGEN_CLUB.hasActiveMembership para todos los estados que calcula club.js', () => {
  const club = { hasActiveMembership(s) { const st = s && s.planStatus; return st === 'active' || st === 'cancelled_active'; } };
  for (const st of ['active', 'cancelled_active', 'past_due', 'expired', 'pending_payment']) {
    assert.equal(P.esMiembro({ planStatus: st }), club.hasActiveMembership({ planStatus: st }), st);
  }
});

test('textoAviso nombra la acción y siempre está en español, sin emojis', () => {
  assert.match(P.textoAviso('Calcular dosis'), /«Calcular dosis»/);
  assert.match(P.textoAviso('Calcular dosis'), /membresía/);
  assert.match(P.textoAviso(''), /membresía/);
  assert.equal(/\p{Extended_Pictographic}/u.test(P.textoAviso('X')), false);
});

test('bloqueoHTML trae el bloque .tool-paywall con candado, título y botón a Suscripción; escapa el texto', () => {
  const h = P.bloqueoHTML('Para ver el resultado <b>hazte</b> miembro');
  assert.match(h, /class="tool-paywall"/);
  assert.match(h, /Disponible para miembros/);
  assert.match(h, /Hazte miembro/);
  assert.match(h, /href="club-suscripcion\.html"/);
  assert.match(h, /<svg/);
  assert.equal(h.includes('<b>'), false);
  assert.match(h, /&lt;b&gt;/);
  assert.equal(/\p{Extended_Pictographic}/u.test(h), false);
  assert.match(P.bloqueoHTML(), /membresía activa/);
});

test('vistaBorrosaHTML difumina el contenido (aria-hidden) y pone la caja central con botón', () => {
  const h = P.vistaBorrosaHTML('<p>relleno</p>', { titulo: 'Conoce a los profesionales', texto: 'Con tu membresía', boton: 'Activar' });
  assert.match(h, /pw-vista__contenido" aria-hidden="true"/);
  assert.match(h, /Conoce a los profesionales/);
  assert.match(h, /Activar/);
  assert.match(h, /href="club-suscripcion\.html"/);
});

test('marcadorHTML no lleva texto: solo barras', () => {
  const h = P.marcadorHTML(4);
  assert.equal((h.match(/pw-barra"/g) || []).length, 4);
  assert.equal(h.replace(/<[^>]+>/g, '').trim(), '');
  assert.equal((P.marcadorHTML(500).match(/pw-barra"/g) || []).length, 12);
  assert.equal((P.marcadorHTML('x').match(/pw-barra"/g) || []).length, 3);
});

test('chip, etiqueta de ejemplo y aviso de vista previa', () => {
  assert.match(P.chipCandadoHTML('Solo miembros'), /Solo miembros/);
  assert.match(P.chipCandadoHTML(), /Solo miembros/);
  assert.match(P.etiquetaEjemploHTML(), />Ejemplo</);
  assert.match(P.avisoVistaPreviaHTML('Vista previa'), /role="note"/);
});

test('modalHTML es un diálogo accesible con "Ver planes" y "Seguir explorando"', () => {
  const h = P.modalHTML({ titulo: 'Contenido exclusivo', texto: 'Abrir «Libro» necesita membresía' });
  assert.match(h, /role="dialog"/);
  assert.match(h, /aria-modal="true"/);
  assert.match(h, /aria-labelledby="pwModalTitulo"/);
  assert.match(h, /Ver planes/);
  assert.match(h, /Seguir explorando/);
  assert.match(h, /href="club-suscripcion\.html"/);
});

test('el CSS del módulo usa tokens verdes y no trae degradados', () => {
  const css = leer('assets/css/club-paywall.css');
  assert.equal(/gradient\(/i.test(css), false);
  assert.match(css, /var\(--zoo-solid/);
  assert.equal(/\p{Extended_Pictographic}/u.test(css + leer('assets/js/club-paywall.js')), false);
});
