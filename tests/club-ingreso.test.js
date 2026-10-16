'use strict';

// Pantalla única de ingreso (pages/club-login.html): pestañas "Iniciar sesión" / "Crear cuenta", términos obligatorios (correo y
// Google), sin WhatsApp en el registro, correo ya registrado, sesión abierta y referidos con solo el enlace.
// Ejecutar: node --test tests/club-ingreso.test.js

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const I = require('../assets/js/club-ingreso.js');

/* ───────────── el club.js real dentro de un contexto de prueba ───────────── */

function crearClub({ resultadoGoogle, docExiste = false, errorCrear, fetchImpl } = {}) {
  const registro = { creadas: 0, borrada: 0, salidas: 0, popups: 0, docs: [], perfiles: [] };
  const user = resultadoGoogle && resultadoGoogle.user;
  if (user) user.delete = async () => { registro.borrada++; };
  const auth = {
    currentUser: null,
    languageCode: 'en',
    createUserWithEmailAndPassword: async (email) => {
      registro.creadas++;
      if (errorCrear) { const e = new Error('x'); e.code = errorCrear; throw e; }
      return { user: { uid: 'u-nuevo', email, updateProfile: async (p) => { registro.perfiles.push(p); } } };
    },
    signInWithEmailAndPassword: async () => { const e = new Error('x'); e.code = errorCrear || 'auth/invalid-credential'; throw e; },
    signInWithPopup: async () => { registro.popups++; return resultadoGoogle; },
    signOut: async () => { registro.salidas++; }
  };
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: docExiste, data: () => ({}) }), set: async (d) => { registro.docs.push(d); } }) }) };
  const contexto = {
    result: null, window: {}, auth, db,
    firebase: { auth: { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { documentElement: { setAttribute() {}, getAttribute: () => 'light' }, querySelectorAll: () => [] },
    navigator: { userAgent: 'Prueba', language: 'es-MX' }, screen: { width: 1, height: 1, colorDepth: 24 },
    console: { log() {}, warn() {}, error() {} }, setTimeout, setInterval, clearTimeout, clearInterval, Date, Intl, Math, Promise,
    fetch: fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }))
  };
  const fuente = leer('assets/js/club.js').replace('const ZOORIGEN_CLUB =', 'result =');
  vm.runInNewContext(fuente, contexto, { filename: 'club.js' });
  contexto.result.registrarReferido = async () => ({ ok: false, motivo: 'omitido' });
  contexto.result.enviarCorreoVerificacion = async () => ({ ok: true, via: 'zoorigen' });
  return { club: contexto.result, registro };
}
const cuentaGoogle = (esNueva) => ({ user: { uid: 'g1', email: 'ana@example.com', displayName: 'Ana' }, additionalUserInfo: { isNewUser: esNueva } });
const DATOS = { name: 'Ana Pérez', email: 'Ana@Example.com', password: 'clave-segura-1', terminos: true };

/* ───────────── reglas puras (club-ingreso.js) ───────────── */

test('pestaña inicial: invitación, #crear y ?tab=crear abren "Crear cuenta"; lo demás abre "Iniciar sesión"', () => {
  assert.equal(I.tabInicial('', ''), 'entrar');
  assert.equal(I.tabInicial('?tab=crear', ''), 'crear');
  assert.equal(I.tabInicial('?tab=registro', ''), 'crear');
  assert.equal(I.tabInicial('?tab=entrar', ''), 'entrar');
  assert.equal(I.tabInicial('', '#crear'), 'crear');
  assert.equal(I.tabInicial('', '#entrar'), 'entrar');
  assert.equal(I.tabInicial('?ref=ZOO-ABC123', ''), 'crear', 'un enlace de invitación es para crear cuenta');
  assert.equal(I.tabInicial('?ref=ZOO-ABC123&curso=c-abejas', ''), 'crear');
  assert.equal(I.tabInicial('?ref=ZOO-ABC123&tab=entrar', ''), 'entrar', 'el parámetro tab manda');
  assert.equal(I.tabInicial('?curso=c-abejas', ''), 'entrar', 'la guía y la encuesta mandan ?curso= al inicio de sesión salvo que pidan crear');
  assert.equal(I.tabInicial('?verificado=1&email=a%40b.com', ''), 'entrar');
  assert.equal(I.tabInicial('?ref=', ''), 'entrar', 'un ?ref= vacío no cuenta');
});

test('el script del <head> (primera pintura) y tabInicial() deciden lo mismo, así no hay parpadeo de pestaña', () => {
  const html = leer('pages/club-login.html');
  const codigo = /<script>\/\*zs-tab\*\/([\s\S]*?)<\/script>/.exec(html)[1];
  const casos = [
    ['', ''], ['?tab=crear', ''], ['?tab=registro', ''], ['?tab=entrar', ''], ['?tab=login', ''], ['', '#crear'], ['', '#registro'], ['', '#entrar'], ['', '#login'],
    ['?ref=ZOO-ABC123', ''], ['?ref=ZOO-ABC123&curso=x', ''], ['?ref=ZOO-ABC123&tab=entrar', ''], ['?curso=x', ''], ['?verificado=1', ''],
    ['?verificado=1&ref=ZOO-ABC123', ''], ['?ref=', ''], ['?TAB=crear', ''], ['?tab=CREAR', ''], ['?tab=otra', '#crear'], ['?email=a%40b.com&ref=ZOO-AAAAAA', '']
  ];
  for (const [search, hash] of casos) {
    const attrs = {};
    const d = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } };
    vm.runInNewContext(codigo, { document: d, location: { search, hash } });
    assert.equal(attrs['data-tab'], I.tabInicial(search, hash), `search=${search} hash=${hash}`);
  }
});

test('el código de invitación de la URL se sanea: solo letras, números y guion, en mayúsculas y con tope', () => {
  assert.equal(I.refDeUrl('?ref=zoo-abc123'), 'ZOO-ABC123');
  assert.equal(I.refDeUrl('?curso=x&ref=ZOO-ABC123&y=1'), 'ZOO-ABC123');
  assert.equal(I.refDeUrl('?ref=%3Cscript%3Ealert(1)%3C%2Fscript%3E'), 'SCRIPTALERT1SCRIPT');
  assert.equal(I.refDeUrl('?ref=' + 'A'.repeat(100)).length, 40);
  assert.equal(I.refDeUrl('?curso=x'), '');
  assert.equal(I.refDeUrl(''), '');
});

test('urlConTab conserva ?ref= y ?curso= y solo cambia tab', () => {
  assert.equal(I.urlConTab('?ref=ZOO-ABC123&curso=x', 'entrar'), '?ref=ZOO-ABC123&curso=x&tab=entrar');
  assert.equal(I.urlConTab('?tab=crear&curso=x', 'entrar'), '?curso=x&tab=entrar');
  assert.equal(I.urlConTab('', 'crear'), '?tab=crear');
});

test('validar registro: nombre, correo, contraseña de 8+ y términos marcados (los términos son OBLIGATORIOS)', () => {
  const bien = { name: 'Ana', email: 'ana@example.com', password: '12345678', terminos: true };
  assert.deepEqual(I.validarRegistro(bien), { ok: true });
  assert.equal(I.validarRegistro({ ...bien, name: ' ' }).campo, 'name');
  assert.equal(I.validarRegistro({ ...bien, email: '' }).campo, 'email');
  assert.equal(I.validarRegistro({ ...bien, email: 'no-es-correo' }).campo, 'email');
  assert.equal(I.validarRegistro({ ...bien, password: '1234567' }).campo, 'password');
  const sin = I.validarRegistro({ ...bien, terminos: false });
  assert.equal(sin.ok, false);
  assert.equal(sin.campo, 'terminos');
  assert.match(sin.msg, /Términos y condiciones y el Aviso de privacidad/);
  assert.equal(I.validarRegistro({ ...bien, terminos: 'true' }).ok, false, 'solo true de verdad');
  assert.equal(I.validarRegistro({ ...bien, terminos: undefined }).ok, false);
});

test('validar Google en "Crear cuenta": sin los términos marcados no se abre Google', () => {
  assert.equal(I.validarGoogleCrear({ terminos: false }).ok, false);
  assert.equal(I.validarGoogleCrear({}).ok, false);
  assert.equal(I.validarGoogleCrear().ok, false);
  assert.match(I.validarGoogleCrear({}).msg, /Marca primero la casilla/);
  assert.equal(I.validarGoogleCrear({ terminos: true }).ok, true);
});

test('validar iniciar sesión: pide correo y contraseña, y un correo con forma de correo', () => {
  assert.equal(I.validarLogin({ email: '', password: 'x' }).campo, 'email');
  assert.equal(I.validarLogin({ email: 'a@b.co', password: '' }).campo, 'password');
  assert.equal(I.validarLogin({ email: 'sin-arroba', password: 'x' }).campo, 'email');
  assert.equal(I.validarLogin({ email: 'a@b.co', password: 'x' }).ok, true);
});

/* ───────────── la pantalla ───────────── */

test('una sola pantalla con pestañas accesibles: tablist, dos tab, dos tabpanel enlazados y flechas del teclado', () => {
  const h = leer('pages/club-login.html');
  assert.match(h, /role="tablist"/);
  assert.match(h, /id="tab-entrar"[^>]*role="tab"|role="tab"[^>]*id="tab-entrar"/);
  assert.match(h, /id="tab-crear"[^>]*role="tab"|role="tab"[^>]*id="tab-crear"/);
  assert.match(h, /id="panel-entrar" role="tabpanel" aria-labelledby="tab-entrar"/);
  assert.match(h, /id="panel-crear" role="tabpanel" aria-labelledby="tab-crear" hidden/);
  assert.match(h, /aria-controls="panel-entrar"/);
  assert.match(h, /aria-controls="panel-crear"/);
  assert.match(h, /aria-selected="true"[^>]*data-tab="entrar"/);
  assert.match(h, /tabindex="-1"[^>]*data-tab="crear"/);
  for (const tecla of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(h.includes("'" + tecla + "'"), 'tecla ' + tecla);
  assert.match(h, /tabs\[n\]\.setAttribute\('aria-selected'/);
  // errores anunciados y el cambio de pestaña lleva el foco a la pestaña
  assert.match(h, /id="errorMsg" role="alert"/);
  assert.match(h, /id="successMsg" role="status"/);
  assert.match(h, /id="terminosError" role="alert"/);
  assert.match(h, /aria-invalid/);
  assert.match(h, /opciones\.foco/);
  assert.match(h, /<html lang="es">/);
});

test('"Crear cuenta" ya no pide WhatsApp ni teléfono (ni en la pantalla ni en lo que manda a club.js)', () => {
  const h = leer('pages/club-login.html');
  assert.doesNotMatch(h, /type="tel"|id="phone"|name="phone"|inputmode="tel"/);
  assert.doesNotMatch(h, /<label[^>]*>\s*WhatsApp\s*<\/label>/i);
  assert.doesNotMatch(h, /phone\s*:/);
  assert.doesNotMatch(h.replace(/<footer[\s\S]*<\/footer>/, ''), /placeholder="10 dígitos"/);
  // el orden de los campos como en Alintec: nombre, correo, contraseña, términos, botón, "o", Google
  const crear = h.slice(h.indexOf('id="panel-crear"'));
  const orden = ['id="reg-name"', 'id="reg-email"', 'id="reg-password"', 'id="reg-terminos"', 'id="registerBtn"', 'class="auth-divider"', 'id="googleBtnCrear"'].map(s => crear.indexOf(s));
  assert.ok(orden.every((n) => n > 0), 'faltan elementos: ' + orden.join(','));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'orden de los campos');
});

test('la casilla de términos y privacidad es obligatoria, enlaza a las dos páginas en pestaña nueva y gobierna al botón de Google', () => {
  const h = leer('pages/club-login.html');
  const fila = /<label class="auth-check"[\s\S]*?<\/label>/.exec(h)[0];
  assert.match(fila, /<input type="checkbox" id="reg-terminos"[^>]*aria-required="true"/);
  assert.match(fila, /href="\.\.\/terminos-y-condiciones\.html" target="_blank" rel="noopener">Términos y condiciones<\/a>/);
  assert.match(fila, /href="\.\.\/aviso-de-privacidad\.html" target="_blank" rel="noopener">Aviso de privacidad<\/a>/);
  assert.doesNotMatch(fila, /\bchecked\b/, 'la casilla empieza SIN marcar');
  // Google: atenuado hasta marcarla y validado al pulsar (no solo visual)
  assert.match(h, /id="googleBtnCrear" class="auth-google" aria-disabled="true"/);
  assert.match(h, /I\.validarGoogleCrear\(\{ terminos: campos\.terminos\.checked === true \}\)/);
  assert.match(h, /loginWithGoogle\(\{ modo: 'crear', terminos: true \}\)/);
  assert.match(h, /I\.validarRegistro\(datos\)/);
  assert.match(h, /terminos: campos\.terminos\.checked === true/);
  // "Registrarte con Google" en Crear cuenta y "Continuar con Google" en Iniciar sesión
  assert.match(h, /Registrarte con Google/);
  assert.match(h, /Continuar con Google/);
  assert.ok(h.indexOf('id="googleBtnEntrar"') < h.indexOf('id="panel-crear"'));
});

test('el registro con correo y el de Google no hacen nada si falla la validación de términos (el código revisa antes de llamar a Firebase)', () => {
  const h = leer('pages/club-login.html');
  const reg = h.slice(h.indexOf("$('registerForm').addEventListener('submit'"));
  assert.ok(reg.indexOf('I.validarRegistro(datos)') < reg.indexOf('ZOORIGEN_CLUB.register(datos)'));
  const goo = h.slice(h.indexOf("googleCrear.addEventListener('click'"));
  assert.ok(goo.indexOf('I.validarGoogleCrear(') < goo.indexOf("ZOORIGEN_CLUB.loginWithGoogle({ modo: 'crear'"));
});

test('sin cifras inventadas ni caras de alumnos en el panel izquierdo, y sin emojis', () => {
  const h = leer('pages/club-login.html');
  assert.doesNotMatch(h, /\+2,?000|2,000 alumnos|2000 alumnos/);
  assert.doesNotMatch(h, /auth-proof|assets\/img\/alumnos/);
  assert.doesNotMatch(leer('assets/css/auth-redesign.css'), /auth-proof/);
  for (const rel of ['pages/club-login.html', 'pages/club-registro.html', 'assets/js/club-ingreso.js']) {
    assert.ok(!/[\p{Extended_Pictographic}️]/u.test(leer(rel).replace(/©/g, '')), rel + ' sin emojis (el © del pie es un símbolo de texto)');
  }
  assert.match(h, /auth-brand__logo/, 'logo circular de Zoorigen');
  assert.match(leer('assets/css/auth-redesign.css'), /\.auth-brand__logo \{[^}]*border-radius: 50%/);
});

test('modo día/noche: botón con la misma clave que el resto del Club y estilos de noche para la tarjeta, los campos y los avisos', () => {
  const h = leer('pages/club-login.html');
  assert.match(h, /id="temaBtn"/);
  assert.match(h, /localStorage\.setItem\('zoo_theme', sig\)/);
  assert.match(h, /<head>\s*<script>\/\*zs-tema\*\//);
  const css = leer('assets/css/auth-redesign.css');
  for (const sel of ['\\.auth-card', '\\.auth-page \\.field input', '\\.auth-google', '\\.auth-submit', '\\.auth-page \\.error-msg\\.show', '\\.password-modal__card', '\\.referral-banner']) {
    assert.match(css, new RegExp('\\[data-theme="dark"\\] ' + sel), 'noche: ' + sel);
  }
});

/* ───────────── términos: se guardan con fecha y versión ───────────── */

test('registro con correo SIN términos: no crea nada en Firebase ni en Firestore', async () => {
  const { club, registro } = crearClub();
  for (const terminos of [false, undefined, 'true', 1, null]) {
    const r = await club.register({ ...DATOS, terminos });
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'sin-terminos');
    assert.match(r.msg, /debes aceptar los Términos y condiciones/);
  }
  assert.equal(registro.creadas, 0, 'no se crea la cuenta');
  assert.equal(registro.docs.length, 0, 'no se crea la ficha');
});

test('registro con correo CON términos: guarda la fecha y la versión aceptadas y no pide teléfono', async () => {
  const { club, registro } = crearClub();
  const antes = Date.now();
  const r = await club.register(DATOS);
  assert.equal(r.ok, true);
  assert.equal(r.correoEnviado, true);
  assert.equal(registro.creadas, 1);
  assert.equal(registro.docs.length, 1);
  const d = registro.docs[0];
  assert.equal(d.email, 'ana@example.com');
  assert.equal(d.terminosVersion, club.TERMINOS_VERSION);
  assert.match(d.terminosAceptadosEn, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Date.parse(d.terminosAceptadosEn) >= antes - 1000);
  assert.equal(d.role, 'member');
  assert.equal(d.planActivo, false);
  assert.equal(d.phone, '', 'sin teléfono: queda vacío y se puede añadir después');
});

test('registro: nombre, correo y contraseña son obligatorios; la contraseña pide 8 caracteres', async () => {
  const { club, registro } = crearClub();
  assert.equal((await club.register({ ...DATOS, name: '' })).codigo, 'faltan-datos');
  assert.equal((await club.register({ ...DATOS, email: '' })).codigo, 'faltan-datos');
  assert.equal((await club.register({ ...DATOS, password: '1234567' })).codigo, 'clave-corta');
  assert.equal((await club.register()).codigo, 'faltan-datos');
  assert.equal(registro.creadas, 0);
});

test('correo que ya tiene cuenta: no se crea otra y el mensaje dice qué hacer (iniciar sesión)', async () => {
  const { club, registro } = crearClub({ errorCrear: 'auth/email-already-in-use' });
  const r = await club.register(DATOS);
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'correo-existente');
  assert.match(r.msg, /ya tiene una cuenta/);
  assert.match(r.msg, /Inicia sesión/);
  assert.equal(registro.docs.length, 0);
});

test('Google en "Crear cuenta" SIN términos: ni siquiera abre Google y no crea nada', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  for (const opciones of [{ modo: 'crear' }, { modo: 'crear', terminos: false }, { modo: 'crear', terminos: 'si' }]) {
    const r = await club.loginWithGoogle(opciones);
    assert.equal(r.ok, false);
    assert.equal(r.codigo, 'sin-terminos');
  }
  assert.equal(registro.popups, 0, 'no se abrió la ventana de Google');
  assert.equal(registro.docs.length, 0);
  assert.equal(registro.borrada, 0);
});

test('Google en "Crear cuenta" CON términos: la ficha lleva fecha y versión de los términos', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  const r = await club.loginWithGoogle({ modo: 'crear', terminos: true });
  assert.equal(r.ok, true);
  assert.equal(registro.popups, 1);
  assert.equal(registro.docs.length, 1);
  assert.equal(registro.docs[0].terminosVersion, club.TERMINOS_VERSION);
  assert.match(registro.docs[0].terminosAceptadosEn, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(registro.docs[0].authProvider, 'google');
});

test('Google en "Crear cuenta" con un correo que YA tiene cuenta: no entra, cierra la sesión y pide iniciar sesión', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(false), docExiste: true });
  const r = await club.loginWithGoogle({ modo: 'crear', terminos: true });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'ya-existe');
  assert.match(r.msg, /Inicia sesión/);
  assert.equal(registro.salidas, 1);
  assert.equal(registro.docs.length, 0);
});

test('Google en "Iniciar sesión" sin cuenta no crea nada (se deshace la cuenta de Google) y no escribe términos', async () => {
  const { club, registro } = crearClub({ resultadoGoogle: cuentaGoogle(true) });
  const r = await club.loginWithGoogle({ modo: 'entrar' });
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'sin-cuenta');
  assert.match(r.msg, /Primero crea tu cuenta/);
  assert.equal(registro.borrada, 1);
  assert.equal(registro.docs.length, 0);
});

test('iniciar sesión con correo sin cuenta: el mensaje manda a crear la cuenta (con o sin protección de correos de Firebase)', async () => {
  for (const [codigoFirebase, esperado] of [['auth/user-not-found', 'sin-cuenta'], ['auth/invalid-credential', 'credenciales'], ['auth/wrong-password', 'clave']]) {
    const { club } = crearClub({ errorCrear: codigoFirebase });
    const r = await club.login('nadie@example.com', 'x');
    assert.equal(r.ok, false);
    assert.equal(r.codigo, esperado);
    if (esperado !== 'clave') assert.match(r.msg, /crea|créala/i);
  }
  const { club } = crearClub({ errorCrear: 'auth/algo-raro' });
  assert.equal((await club.login('a@b.co', 'x')).ok, false);
});

test('la versión de términos guardada es la que muestran los dos documentos legales', () => {
  const { club } = crearClub();
  for (const rel of ['terminos-y-condiciones.html', 'aviso-de-privacidad.html']) {
    const v = /zs-doc__version"><span>Versión ([\d.]+)<\/span>/.exec(leer(rel));
    assert.ok(v, rel + ' muestra su versión');
    assert.equal(v[1], club.TERMINOS_VERSION, rel + ': si cambia la versión del documento, cambia TERMINOS_VERSION en club.js');
  }
});

test('las reglas v6 de Firestore dejan que el titular escriba terminosAceptadosEn y terminosVersion al crear su ficha', () => {
  const reglas = leer('FIRESTORE-REGLAS-v6.txt');
  const crear = /allow create: if isAuthed\(\) && request\.auth\.uid == uid[\s\S]*?\]\);/.exec(reglas)[0];
  assert.doesNotMatch(crear, /terminos/);
  const actualizar = /allow update: if isAdmin\(\) \|\| \([\s\S]*?\]\)\s*\);/.exec(reglas)[0];
  assert.doesNotMatch(actualizar, /terminos/);
  assert.doesNotMatch(reglas, /hasOnly\(\[[^\]]*'name'/, 'la creación no limita los campos permitidos');
});

/* ───────────── sesión abierta y enlaces viejos ───────────── */

test('con una sesión ya abierta, la pantalla de acceso (también "Crear cuenta") pasa al Club en vez de crear otra cuenta', () => {
  const h = leer('pages/club-login.html');
  const bloque = /auth\.onAuthStateChanged\(function \(user\) \{[\s\S]*?\n      \}\);/.exec(h)[0];
  assert.match(bloque, /if \(!user \|\| estado\.googleEnCurso \|\| estado\.registrando\) return;/);
  assert.match(bloque, /Ya tienes una sesión abierta/);
  assert.match(bloque, /entrar\(\)/);
  assert.match(h, /ZOORIGEN_CLUB\.irTrasEntrar\(\)/, 'la administradora va al panel y el resto al Club (lo decide el servidor)');
  // la escucha no depende de la pestaña: se registra una sola vez, antes de abrir ninguna pestaña
  assert.equal((h.match(/auth\.onAuthStateChanged\(/g) || []).length, 1);
  assert.ok(h.indexOf('auth.onAuthStateChanged(') < h.indexOf('irATab(I.tabInicial('));
});

test('club-registro.html solo redirige a la pestaña "Crear cuenta" y conserva ?ref=, ?curso= y #crear', () => {
  const h = leer('pages/club-registro.html');
  assert.match(h, /<meta http-equiv="refresh" content="0; url=club-login\.html\?tab=crear">/);
  assert.match(h, /<meta name="robots" content="noindex">/);
  const codigo = /<script>([\s\S]*?)<\/script>/.exec(h)[1];
  function destino(search, hash) {
    let ir = null;
    vm.runInNewContext(codigo, { window: { location: { search, hash, replace: (u) => { ir = u; } } } });
    return ir;
  }
  assert.equal(destino('', ''), 'club-login.html?tab=crear');
  assert.equal(destino('?ref=ZOO-ABC123', ''), 'club-login.html?tab=crear&ref=ZOO-ABC123');
  assert.equal(destino('?curso=c-abejas', '#crear'), 'club-login.html?tab=crear&curso=c-abejas#crear');
  assert.equal(destino('?ref=ZOO-ABC123&curso=x&tab=entrar', ''), 'club-login.html?tab=crear&ref=ZOO-ABC123&curso=x');
  // y la pantalla de destino abre Crear cuenta con esos mismos parámetros
  assert.equal(I.tabInicial('?tab=crear&ref=ZOO-ABC123', ''), 'crear');
});

test('los enlaces que ya existen en el sitio, el chatbot, la encuesta y la invitación siguen llegando a una pantalla que funciona', () => {
  assert.ok(fs.existsSync(path.join(RAIZ, 'pages', 'club-registro.html')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'pages', 'club-login.html')));
  assert.match(leer('assets/js/club-referidos.js'), /URL_REGISTRO = 'https:\/\/www\.zoorigen\.com\/pages\/club-registro\.html'/);
  assert.match(leer('assets/js/club-inicio.js'), /club-registro\.html\?ref=/);
});

/* ───────────── referidos: solo el enlace ───────────── */

test('referidos: en la pantalla de registro llega el ?ref= y se guarda saneado; el aviso NO muestra ningún código', () => {
  const h = leer('pages/club-login.html');
  assert.match(h, /localStorage\.setItem\('zoo_refCode', refCode\)/);
  const banner = /<div class="referral-banner" id="refBanner" hidden>[\s\S]*?<\/div>\s*<\/div>/.exec(h)[0];
  assert.match(banner, /Vienes recomendado por un amigo/);
  assert.doesNotMatch(banner, /ZOO-|Código de invitación|código/);
  assert.doesNotMatch(h, /referral-banner__codigo|Código de invitación:/);
  // sigue registrándose la invitación en el servidor al crear la cuenta (correo o Google)
  const club = leer('assets/js/club.js');
  assert.match(club, /registrarReferido\(cred\.user\)/);
  assert.match(club, /nuevo \? await this\._conTiempo\(this\.registrarReferido\(user\)/);
});

test('referidos: ni el panel ni la pantalla de invitados enseñan un código aparte; solo el enlace con Copiar, WhatsApp, Facebook, X y Correo', () => {
  const pagina = leer('pages/club-referidos.html');
  assert.doesNotMatch(pagina, /refCodigo|Tu código|zc-codigo/);
  for (const id of ['refLink', 'copyBtn', 'shareWA', 'shareFB', 'shareTW', 'shareEmail']) assert.ok(pagina.includes('id="' + id + '"'), id);
  assert.match(pagina, /Copiar enlace/);
  const R = require('../assets/js/club-referidos.js');
  const textos = JSON.stringify(R.TEXTOS);
  assert.doesNotMatch(textos, /tu código|código de invitación|tu enlace y tu código/);
  assert.match(R.renderSoloMiembros(), /recibes tu enlace de invitación/);
  assert.doesNotMatch(R.renderSoloMiembros(), /código/);
  const inicio = require('../assets/js/club-inicio.js');
  assert.doesNotMatch(inicio.invitaSoloMiembrosHTML(), /código/);
  assert.doesNotMatch(inicio.invitaHTML({ codigo: 'ZOO-ABC123' }), /Tu código|Copiar<\/span>/);
  assert.doesNotMatch(inicio.mensajeCompartir('ZOO-ABC123'), /mi código/);
  assert.match(inicio.mensajeCompartir('ZOO-ABC123'), /https:\/\/www\.zoorigen\.com\/pages\/club-registro\.html\?ref=ZOO-ABC123$/);
  assert.match(leer('assets/js/chatbot-dudas.js'), /tienes tu enlace de invitación/);
});

test('privacidad: el aviso ya no dice que el registro pide el número de WhatsApp y menciona la aceptación guardada', () => {
  const a = leer('aviso-de-privacidad.html');
  assert.doesNotMatch(a, /correo electrónico, número de WhatsApp y contraseña/);
  assert.match(a, /el número de WhatsApp no se pide al crear la cuenta/);
  assert.match(a, /fecha y la versión de los Términos y del Aviso que aceptaste/);
});

test('versiones: la pantalla y el service worker apuntan a la misma versión de club.js y de las hojas nuevas', () => {
  const h = leer('pages/club-login.html');
  const v = /club\.js\?v=([\w.-]+)/.exec(h)[1];
  assert.ok(leer('sw.js').includes('/assets/js/club.js?v=' + v));
  assert.match(h, /club-ingreso\.js\?v=[\w.-]+/);
  assert.match(h, /auth-redesign\.css\?v=20261129-acceso/);
});
