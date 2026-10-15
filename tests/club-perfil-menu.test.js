'use strict';
// Menú del avatar ("Tu espacio"): resumen de la cuenta, plan y accesos. Lógica y marcado puros; la interacción
// (Esc, clic fuera, foco) se comprueba en Chrome real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const S = require('../assets/js/club-shell.js');

test('plan en palabras: activa con renovación, acceso vigente, vencida, pago no confirmado, gratuita y administrador', () => {
  const vence = new Date('2026-11-04T12:00:00Z');
  assert.deepEqual(S.resumenPlan({ planStatus: 'active', planVence: vence }),
    { clave: 'active', miembro: true, etiqueta: 'Membresía activa', detalle: 'Se renueva el 4 nov 2026' });
  const c = S.resumenPlan({ planStatus: 'cancelled_active', planVence: { seconds: Math.floor(vence.getTime() / 1000) } });
  assert.equal(c.miembro, true);
  assert.equal(c.etiqueta, 'Acceso vigente');
  assert.match(c.detalle, /Sin renovación\. Conservas acceso hasta el 4 nov 2026/);
  assert.equal(S.resumenPlan({ planStatus: 'expired', planVence: vence }).miembro, false);
  assert.equal(S.resumenPlan({ planStatus: 'expired', planVence: vence }).etiqueta, 'Membresía vencida');
  assert.equal(S.resumenPlan({ planStatus: 'past_due' }).etiqueta, 'Pago no confirmado');
  assert.deepEqual(S.resumenPlan({ planStatus: 'pending_payment' }), { clave: 'free', miembro: false, etiqueta: 'Cuenta gratuita', detalle: '' });
  assert.deepEqual(S.resumenPlan(null), { clave: 'free', miembro: false, etiqueta: 'Cuenta gratuita', detalle: '' });
  assert.equal(S.resumenPlan({ role: 'admin', planStatus: 'free' }).etiqueta, 'Administrador');
});

test('panel de un miembro: nombre, correo, plan, cifras y los accesos pedidos', () => {
  const h = S.perfilMenuHTML({ name: 'Ana Pérez', email: 'ana@correo.com', planStatus: 'active', planVence: new Date('2026-12-01T12:00:00Z') }, { xp: 1250, nivel: 'Técnico', cursos: 3 });
  assert.match(h, /id="zsPmTitulo">Ana Pérez</);
  assert.match(h, /ana@correo\.com/);
  assert.match(h, /Membresía activa/);
  assert.match(h, /Se renueva el 1 dic 2026/);
  assert.match(h, /data-pm-xp>1,?250</);
  assert.match(h, /Técnico/);
  for (const href of ['club-perfil.html', 'club-suscripcion.html', 'club-referidos.html', 'club-certificados.html', 'club-logros.html']) {
    assert.ok(h.includes('href="' + href + '"'), href);
  }
  assert.match(h, /id="zsPmAyuda"/);
  assert.match(h, /id="zsPmTema"/);
  assert.match(h, /id="zsPmSalir"/);
  assert.doesNotMatch(h, /zs-pm__libre/, 'un miembro no ve el bloque de cuenta gratuita');
});

test('panel de una cuenta gratuita: aviso con botón Suscribirme y sin cifras inventadas', () => {
  const h = S.perfilMenuHTML({ name: 'Beto', email: 'beto@correo.com', planStatus: 'free' });
  assert.match(h, /Cuenta gratuita/);
  assert.match(h, /zs-pm__libre/);
  assert.match(h, /<a class="zs-pm__sus" href="club-suscripcion\.html">/);
  assert.match(h, />Suscribirme</);
  assert.doesNotMatch(h, /data-pm-xp/);
});

test('panel: escapa nombre y correo, y no promete nada de lo que no hay', () => {
  const h = S.perfilMenuHTML({ name: '<img src=x onerror=1>', email: 'a"b@c.d', planStatus: 'free' });
  assert.doesNotMatch(h, /<img src=x/);
  assert.match(h, /&lt;img src=x onerror=1&gt;/);
  assert.doesNotMatch(h, /a"b@c\.d/);
});

test('avatar estático: sigue siendo un enlace a Mi perfil (sin JavaScript) y avisa que abre un panel', () => {
  const h = S.barraSuperiorHTML(null);
  assert.match(h, /<a class="zs-avatar" id="zsAvatar" href="club-perfil\.html"[^>]*aria-haspopup="dialog" aria-expanded="false">/);
  const pagina = leer('pages/club-dashboard.html');
  assert.match(pagina, /id="zsAvatar" href="club-perfil\.html"[^>]*aria-haspopup="dialog" aria-expanded="false"/, 'la página generada lo trae escrito');
});

test('comportamiento: se crea al primer toque, cierra con Esc/clic fuera/X, devuelve el foco y respeta las ventanas de la cola', () => {
  const js = leer('assets/js/club-shell.js');
  assert.match(js, /function crearPanelPerfil\(\)/);
  assert.match(js, /document\.getElementById\('zsPm'\) \|\| crearPanelPerfil\(\)/, 'se crea solo al abrir');
  assert.match(js, /if \(e\.key === 'Escape'\) \{ abrirCajon\(false\); cerrarPerfil\(\); \}/);
  assert.match(js, /velo\.addEventListener\('click', function \(\) \{ cerrarPerfil\(\); \}\)/);
  assert.match(js, /aria-modal="true"\], \.zob:not\(\.zob-toast\), \.zc-ov, \.pw-modal__fondo/, 'no se abre encima de otra ventana');
  assert.match(js, /if \(pm\.abierto \|\| hayVentanaAjena\(\)\) return;/);
  assert.match(js, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(js, /e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey \|\| e\.button === 1/, 'abrir en otra pestaña sigue yendo a Mi perfil');
  assert.match(js, /role', 'dialog'\); panel\.setAttribute\('aria-modal', 'true'\)/);
});

test('estilos del panel: color sólido, tokens del Club, tamaños con clamp y una sola columna en 360 px', () => {
  const css = leer('assets/css/club-shell.css');
  const i = css.indexOf('"TU ESPACIO"');
  assert.ok(i > 0);
  const b = css.slice(i);
  assert.doesNotMatch(b, /gradient\(/);
  assert.match(b, /\.zs-pm__cab \{[^}]*background: var\(--zoo-solid/);
  assert.match(b, /clamp\(/);
  assert.match(b, /@media \(max-width: 360px\)/);
  assert.match(b, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(b, /[\u{1F300}-\u{1FAFF}☀-➿]/u);
});
