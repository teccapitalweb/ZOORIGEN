'use strict';

// Cuentas: reglas de Google (entrar no crea cuentas, crear no entra a una cuenta existente) y confirmación de correo.
// Ejecutar: node --test tests/club-cuentas.test.js

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');

function crearClub({ resultadoGoogle, docExiste = false, fetchImpl, usuarioActual } = {}) {
  const registro = { borrada: 0, salidas: 0, docs: [] };
  const user = resultadoGoogle && resultadoGoogle.user;
  if (user) user.delete = async () => { registro.borrada++; };
  const auth = {
    currentUser: usuarioActual || null,
    languageCode: 'en',
    signInWithPopup: async () => resultadoGoogle,
    signOut: async () => { registro.salidas++; }
  };
  const db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: docExiste, data: () => ({}) }),
        set: async (d) => { registro.docs.push(d); }
      })
    })
  };
  const contexto = {
    result: null, window: {}, auth, db,
    firebase: { auth: { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { documentElement: { setAttribute() {}, getAttribute: () => 'light' }, querySelectorAll: () => [] },
    navigator: { userAgent: 'Prueba', language: 'es-MX' }, screen: { width: 1, height: 1, colorDepth: 24 },
    console: { log() {}, warn() {}, error() {} }, setTimeout, setInterval, clearTimeout, clearInterval, Date, Intl, Math, Promise,
    fetch: fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }))
  };
  const fuente = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club.js'), 'utf8').replace('const ZOORIGEN_CLUB =', 'result =');
  vm.runInNewContext(fuente, contexto, { filename: 'club.js' });
  // Los referidos no son el tema de estas pruebas
  contexto.result.registrarReferido = async () => ({ ok: false, motivo: 'omitido' });
  return { club: contexto.result, registro, auth };
}

const cuentaGoogle = (esNueva) => ({ user: { uid: 'g1', email: 'ana@example.com', displayName: 'Ana' }, additionalUserInfo: { isNewUser: esNueva } });

/* ───────────── Google ───────────── */

test('Google en "Iniciar sesión" con un correo SIN cuenta: no entra, se deshace la cuenta recién creada y no se guarda nada', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  const r = await club.loginWithGoogle({ modo: 'entrar' });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'sin-cuenta');
  assert.match(r.msg, /todavía no tiene una cuenta/);
  assert.equal(registro.borrada, 1, 'se borra la cuenta que Google acaba de crear');
  assert.equal(registro.docs.length, 0, 'no se crea el documento de miembro');
});

test('Google en "Iniciar sesión" con cuenta existente: entra', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(false), docExiste: true });
  const r = await club.loginWithGoogle({ modo: 'entrar' });
  assert.equal(r.ok, true);
  assert.equal(r.nuevo, false);
  assert.equal(registro.borrada, 0);
  assert.equal(registro.docs.length, 0);
});

test('Google en "Crear cuenta" con un correo que YA existe: no entra y pide iniciar sesión', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(false), docExiste: true });
  const r = await club.loginWithGoogle({ modo: 'crear' });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'ya-existe');
  assert.match(r.msg, /Ya existe una cuenta con ese correo/);
  assert.equal(registro.salidas, 1, 'se cierra la sesión');
  assert.equal(registro.docs.length, 0);
});

test('Google en "Crear cuenta" con un correo nuevo: crea la cuenta y el documento de miembro', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  const r = await club.loginWithGoogle({ modo: 'crear' });
  assert.equal(r.ok, true);
  assert.equal(r.nuevo, true);
  assert.equal(registro.docs.length, 1);
  assert.equal(registro.docs[0].email, 'ana@example.com');
  assert.equal(registro.docs[0].planActivo, false);
  assert.equal(registro.docs[0].authProvider, 'google');
});

test('Google sin indicar modo se comporta como "entrar" (nunca crea cuentas por accidente)', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  const r = await club.loginWithGoogle();
  assert.equal(r.ok, false);
  assert.equal(registro.borrada, 1);
});

/* ───────────── confirmar correo ───────────── */

const DESPUES = '2026-10-20T10:00:00Z';
const ANTES = '2026-09-01T10:00:00Z';
const conClave = (extra) => Object.assign({ emailVerified: false, providerData: [{ providerId: 'password' }], metadata: { creationTime: DESPUES } }, extra);

test('verificacionObligatoria: solo cuentas nuevas con correo y contraseña sin confirmar y sin membresía', () => {
  const { club } = crearClub();
  assert.equal(club.verificacionObligatoria(conClave(), { planStatus: 'pending_payment' }), true);
  assert.equal(club.verificacionObligatoria(conClave({ emailVerified: true }), { planStatus: 'pending_payment' }), false, 'ya confirmó');
  assert.equal(club.verificacionObligatoria(conClave({ providerData: [{ providerId: 'google.com' }] }), {}), false, 'Google ya viene confirmado');
  assert.equal(club.verificacionObligatoria(conClave({ metadata: { creationTime: ANTES } }), {}), false, 'cuenta anterior: sigue con el aviso discreto');
  assert.equal(club.verificacionObligatoria(conClave(), { planStatus: 'active' }), false, 'quien ya paga nunca queda fuera');
  assert.equal(club.verificacionObligatoria(conClave(), { planStatus: 'cancelled_active' }), false);
  assert.equal(club.verificacionObligatoria(conClave(), { role: 'admin' }), false);
  assert.equal(club.verificacionObligatoria(conClave({ metadata: {} }), {}), false, 'sin fecha de creación no bloquea');
  assert.equal(club.verificacionObligatoria(null, {}), false);
});

test('enviarCorreoVerificacion: usa el servidor (plantilla de Zoorigen) y, si no está configurado, el correo estándar de Firebase', async () => {
  const llamadas = [];
  let enviadosFirebase = 0;
  const usuario = { uid: 'u1', getIdToken: async () => 'TOKEN', sendEmailVerification: async () => { enviadosFirebase++; } };
  // 1) el servidor responde bien
  let t = crearClub({ usuarioActual: usuario, fetchImpl: async (url, op) => { llamadas.push({ url, op }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; } });
  let r = await t.club.enviarCorreoVerificacion(usuario);
  assert.equal(r.ok, true);
  assert.equal(r.via, 'zoorigen');
  assert.match(llamadas[0].url, /\/api\/auth\/send-verification$/);
  assert.equal(llamadas[0].op.headers.Authorization, 'Bearer TOKEN');
  assert.equal(enviadosFirebase, 0);
  // 2) servidor sin configurar (503): respaldo de Firebase
  t = crearClub({ usuarioActual: usuario, fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: 'no configurado', codigo: 'correo-no-configurado' }) }) });
  r = await t.club.enviarCorreoVerificacion(usuario);
  assert.equal(r.ok, true);
  assert.equal(r.via, 'firebase');
  assert.equal(enviadosFirebase, 1);
  // 3) demasiado pronto (429): pide esperar, no manda otro por Firebase
  t = crearClub({ usuarioActual: usuario, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'Espera un minuto antes de pedir otro correo' }) }) });
  r = await t.club.enviarCorreoVerificacion(usuario);
  assert.equal(r.ok, false);
  assert.equal(r.esperar, true);
  assert.equal(enviadosFirebase, 1);
});

test('las páginas usan los modos de Google y la pantalla de confirmación existe', () => {
  const login = fs.readFileSync(path.join(RAIZ, 'pages', 'club-login.html'), 'utf8');
  const registro = fs.readFileSync(path.join(RAIZ, 'pages', 'club-registro.html'), 'utf8');
  const verificar = fs.readFileSync(path.join(RAIZ, 'pages', 'verificar-correo.html'), 'utf8');
  assert.match(login, /loginWithGoogle\(\{ modo: 'entrar' \}\)/);
  assert.match(login, /googleEnCurso/);
  assert.match(registro, /loginWithGoogle\(\{ modo: 'crear' \}\)/);
  assert.match(verificar, /applyActionCode\(code\)/);
  assert.match(verificar, /¡Correo confirmado!/);
  assert.match(verificar, /Este enlace ya no sirve/);
});
