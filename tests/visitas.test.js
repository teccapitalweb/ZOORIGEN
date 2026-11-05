'use strict';

// Contador anónimo de visitas (assets/js/visitas.js): sin cookies, respeta «No rastrear», solo el dominio oficial (y localhost contra el servidor local),
// una visita por página y pestaña cada 30 minutos, el origen solo vive en la pestaña y los miembros se cuentan solo con sesión.
// Y el lugar de la privacidad: aviso, páginas que lo incluyen y que el administrador no cuenta.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const codigo = leer('assets/js/visitas.js');

// Navegador falso mínimo: dónde estamos, de dónde venimos, almacenamiento y la sesión de Firebase
function correr({ pagina = 'landing', host = 'www.zoorigen.com', search = '', referrer = '', nav = {}, sesion = null, almacenamiento = {}, local = {} } = {}) {
  const llamadas = [];
  const sessionStorage = { datos: { ...almacenamiento }, getItem(k) { return k in this.datos ? this.datos[k] : null; }, setItem(k, v) { this.datos[k] = String(v); } };
  const localStorage = { datos: { ...local }, getItem(k) { return k in this.datos ? this.datos[k] : null; }, setItem(k, v) { this.datos[k] = String(v); } };
  const intervalos = [];
  const contexto = {
    document: { currentScript: { getAttribute: n => (n === 'data-pagina' ? pagina : null) }, referrer, cookie: '' },
    location: { hostname: host, search, origin: host === 'localhost' ? 'http://localhost:5500' : 'http://127.0.0.1:8765' },
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile', ...nav },
    window: {}, sessionStorage, localStorage, URLSearchParams, URL, JSON, Date, Number, String, Promise, console,
    fetch: (url, opciones) => { llamadas.push({ url, opciones, cuerpo: JSON.parse(opciones.body) }); return Promise.resolve({}); },
    setInterval: fn => { intervalos.push(fn); return intervalos.length; }, clearInterval: () => {}
  };
  contexto.window = { firebase: sesion ? { auth: () => ({ currentUser: sesion }) } : undefined, doNotTrack: nav.windowDnt };
  vm.createContext(contexto);
  vm.runInContext(codigo, contexto);
  return { llamadas, sessionStorage, localStorage, intervalos, contexto };
}

test('portada: una petición anónima por carga, a la API de producción y sin credenciales ni cookies', () => {
  const r = correr();
  assert.equal(r.llamadas.length, 1);
  assert.equal(r.llamadas[0].url, 'https://zoorigen-webhook-production.up.railway.app/api/metricas/visita');
  assert.equal(r.llamadas[0].opciones.credentials, 'omit');
  assert.equal(r.llamadas[0].opciones.keepalive, true);
  assert.equal(r.llamadas[0].opciones.headers.Authorization, undefined, 'sin sesión no manda token');
  assert.deepEqual(r.llamadas[0].cuerpo, { pagina: 'landing', ref: '', utm: '' });
  // recargar en la misma pestaña no la cuenta otra vez
  const otra = correr({ almacenamiento: r.sessionStorage.datos });
  assert.equal(otra.llamadas.length, 0);
});

test('lo que manda: página, de dónde viene, etiqueta y marcas de Meta; nunca IP, navegador ni la dirección completa de la página', () => {
  const r = correr({ search: '?utm_source=facebook&fbclid=abc123&igsh=zz', referrer: 'https://l.facebook.com/l.php?u=x' });
  assert.deepEqual(r.llamadas[0].cuerpo, { pagina: 'landing', ref: 'https://l.facebook.com/l.php?u=x', utm: 'facebook', fbclid: true, igshid: true });
  const texto = JSON.stringify(r.llamadas[0]);
  assert.equal(/Mozilla|iPhone|userAgent|ua"/.test(texto), false);
  assert.equal(/ip|uid|email/i.test(Object.keys(r.llamadas[0].cuerpo).join(',')), false);
});

test('respeta «No rastrear» y «Control global de privacidad»: no manda nada', () => {
  for (const nav of [{ doNotTrack: '1' }, { globalPrivacyControl: true }, { msDoNotTrack: '1' }]) assert.equal(correr({ nav }).llamadas.length, 0, JSON.stringify(nav));
  assert.equal(correr({ nav: { windowDnt: '1' } }).llamadas.length, 0);
  assert.equal(correr({ nav: { doNotTrack: '0' } }).llamadas.length, 1);
});

test('solo cuenta en zoorigen.com; github.io, copias y previsualizaciones no; localhost cuenta pero contra el servidor local, nunca producción', () => {
  assert.equal(correr({ host: 'zoorigen.com' }).llamadas.length, 1);
  assert.equal(correr({ host: 'www.zoorigen.com' }).llamadas.length, 1);
  for (const host of ['teccapitalweb.github.io', 'zoorigen.com.malo.example', 'ejemplo.com']) assert.equal(correr({ host }).llamadas.length, 0, host);
  const l = correr({ host: '127.0.0.1' });
  assert.equal(l.llamadas[0].url, 'http://127.0.0.1:8765/api/metricas/visita');
  const lh = correr({ host: 'localhost' });
  assert.equal(lh.llamadas[0].url, 'http://localhost:5500/api/metricas/visita');
});

test('páginas válidas: portada (landing), acceso, panel y avisos legales; cualquier otra o sin etiqueta no cuenta', () => {
  for (const pagina of ['landing', 'acceso', 'legal']) assert.equal(correr({ pagina }).llamadas[0].cuerpo.pagina, pagina);
  for (const pagina of ['demo', 'admin', '', null, 'otra']) assert.equal(correr({ pagina }).llamadas.length, 0, String(pagina));
});

test('panel de miembros: espera la sesión (hasta ~12 s), manda el token y no cuenta si nunca hay sesión', async () => {
  // con sesión desde el principio: el primer intento la encuentra
  const usuario = { getIdToken: () => Promise.resolve('token-de-ana') };
  const r = correr({ pagina: 'panel', sesion: usuario });
  assert.equal(r.llamadas.length, 0, 'todavía no: espera al intervalo');
  assert.equal(r.intervalos.length, 1);
  r.intervalos[0]();
  await new Promise(res => setTimeout(res, 5));
  assert.equal(r.llamadas.length, 1);
  assert.equal(r.llamadas[0].opciones.headers.Authorization, 'Bearer token-de-ana');
  assert.equal(r.llamadas[0].cuerpo.pagina, 'panel');
  // sin sesión: tras 24 intentos se rinde y no manda nada
  const sin = correr({ pagina: 'panel' });
  for (let i = 0; i < 30; i++) sin.intervalos[0]();
  assert.equal(sin.llamadas.length, 0);
  // si el token falla, cuenta como anónima
  const malo = correr({ pagina: 'panel', sesion: { getIdToken: () => Promise.reject(new Error('x')) } });
  malo.intervalos[0]();
  await new Promise(res => setTimeout(res, 5));
  assert.equal(malo.llamadas.length, 1);
  assert.equal(malo.llamadas[0].opciones.headers.Authorization, undefined);
});

test('origen del primer contacto: se guarda solo en la pestaña (sessionStorage), no se pisa, no cuenta venir de otra página del sitio y solo viaja con sesión', async () => {
  const a = correr({ referrer: 'https://l.instagram.com/', search: '?igsh=1' });
  const guardado = JSON.parse(a.sessionStorage.datos.zoorigen_origen_v1);
  assert.equal(guardado.ref, 'https://l.instagram.com/');
  assert.equal(guardado.ig, true);
  assert.ok(guardado.t > 0 && typeof guardado.ua === 'string');
  assert.deepEqual(a.localStorage.datos, {}, 'nada en localStorage: sin consentimiento no se guarda en el dispositivo');
  assert.equal(JSON.stringify(a.llamadas[0].cuerpo).includes('origen'), false, 'lo anónimo no manda el origen');
  // segunda página de la misma pestaña: no se pisa
  const b = correr({ pagina: 'acceso', referrer: 'https://www.google.com/', almacenamiento: a.sessionStorage.datos });
  assert.equal(JSON.parse(b.sessionStorage.datos.zoorigen_origen_v1).ref, 'https://l.instagram.com/');
  // venir de otra página del propio sitio no es un origen
  const c = correr({ referrer: 'https://www.zoorigen.com/pages/club-login.html' });
  assert.equal(c.sessionStorage.datos.zoorigen_origen_v1, undefined);
  // con sesión en el panel, el origen viaja
  const usuario = { getIdToken: () => Promise.resolve('t') };
  const p = correr({ pagina: 'panel', sesion: usuario, almacenamiento: { zoorigen_origen_v1: a.sessionStorage.datos.zoorigen_origen_v1 } });
  p.intervalos[0]();
  await new Promise(res => setTimeout(res, 5));
  assert.equal(p.llamadas[0].cuerpo.origen.ref, 'https://l.instagram.com/');
});

test('el archivo no usa cookies, ni rastreadores de terceros, ni guarda nada en localStorage mientras PERSISTIR_ORIGEN sea false', () => {
  const sinComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(/document\.cookie/.test(sinComentarios), false);
  assert.equal(/google-analytics|gtag|fbq\(|facebook\.net|hotjar|clarity\.ms|plausible|matomo/i.test(codigo), false);
  assert.match(codigo, /var PERSISTIR_ORIGEN = false;/);
  assert.equal((sinComentarios.match(/https?:\/\/[^'" )]+/g) || []).filter(u => !/zoorigen/.test(u)).length, 0, 'solo habla con Zoorigen');
});

test('las páginas que cuentan llevan el contador con su etiqueta y versión; el panel de administración NO', () => {
  const v = leer('index.html').match(/visitas\.js\?v=([\w-]+)/)[1];
  const con = (rel, etiqueta) => {
    const h = leer(rel);
    assert.match(h, new RegExp(`<script src="(\\.\\./)?assets/js/visitas\\.js\\?v=${v}" data-pagina="${etiqueta}" defer></script>`), rel);
  };
  con('index.html', 'landing');
  con('aviso-de-privacidad.html', 'legal');
  con('terminos-y-condiciones.html', 'legal');
  for (const n of ['club-login', 'club-registro']) con(`pages/${n}.html`, 'acceso');
  for (const n of ['club-dashboard', 'club-biblioteca', 'club-retos', 'club-logros', 'club-pdfs', 'club-videos', 'club-perfil', 'club-referidos', 'club-suscripcion']) con(`pages/${n}.html`, 'panel');
  assert.equal(/assets\/js\/visitas\.js/.test(leer('pages/admin-club.html')), false, 'quien administra no cuenta como visita');
});
