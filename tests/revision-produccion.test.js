'use strict';
// Ajustes de la revisión de producción (22-oct-2026): sin mención de otras empresas, firebase-config sin error en páginas solo con Auth e ícono en páginas sin favicon.
// Ejecutar: node --test tests/revision-produccion.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const leer = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('Zoorigen es independiente: ninguna página pública ni el chatbot nombran a otra empresa', () => {
  for (const f of ['index.html', 'pages/verificar.html', 'pages/ver-certificado.html', 'aviso-de-privacidad.html', 'terminos-y-condiciones.html', 'assets/js/chatbot-dudas.js']) {
    assert.doesNotMatch(leer(f), /tec capital|teccapital/i, f);
  }
  assert.match(leer('pages/verificar.html'), /Zoorigen · Tehuacán, Puebla/);
});

test('firebase-config no llama a firebase.firestore() si el SDK de Firestore no está cargado', () => {
  const js = leer('assets/js/firebase-config.js');
  assert.match(js, /typeof firebase.firestore === 'function'/);
});

test('las páginas de verificación y administración traen su ícono (sin 404 de favicon.ico)', () => {
  for (const f of ['pages/verificar.html', 'pages/admin-club.html']) assert.match(leer(f), /rel="icon"/, f);
});
