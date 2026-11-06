'use strict';

// Panel de administración · Métricas de visitas (assets/js/admin-visitas.js): periodos (semana, 30, 90, 12 meses, todo), comparación con el periodo
// anterior, KPIs, gráficas, «de dónde vienen tus miembros», quiénes entraron, visitas por periodo, CSV y estilos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const VZ = require(path.join(RAIZ, 'assets', 'js', 'admin-visitas.js'));
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));

const FUENTES = ['directo', 'interno', 'google', 'bing', 'duckduckgo', 'yahoo', 'facebook', 'instagram', 'meta', 'whatsapp', 'linkedin', 'x', 'youtube', 'tiktok', 'correo', 'otros'];
const HOY = '2026-11-05';   // jueves
const dia = (n, extra = {}) => {
  const clave = VZ.sumarDias(HOY, -n);
  const horas = {}; for (let h = 0; h < 24; h++) horas[('0' + h).slice(-2)] = 0;
  horas['09'] = 3; horas['15'] = 2;
  const fuentes = Object.fromEntries(FUENTES.map(k => [k, 0]));
  Object.assign(fuentes, { directo: 3, google: 2, facebook: 1, instagram: 1 });
  return { dia: clave, total: 12, unicos: 7, miembros: 1, dispositivos: { movil: 4, tablet: 1, computadora: 2 }, paises: { MX: 6, US: 1 }, paginas: { landing: 8, acceso: 2, panel: 2, legal: 0 }, fuentes, horas, actualizado: null, ...extra };
};
function datos({ n = 60, extra = {}, vacio = false } = {}) {
  const dias = Array.from({ length: n }, (_, i) => (vacio ? { ...dia(n - 1 - i), total: 0, unicos: 0, miembros: 0 } : dia(n - 1 - i)));
  return {
    ok: true, zona: 'America/Mexico_City', hoy: HOY, activo: true, ultimaVisita: '2026-11-05T21:24:00.000Z', dias,
    miembros: [
      { uid: 'ana', nombre: 'Ana <b>Prueba</b>', email: 'ana@example.com', ultima: '2026-11-05T20:00:00.000Z', visitas: 9, dias: { [HOY]: 3, [VZ.sumarDias(HOY, -1)]: 2 } },
      { uid: 'beto', nombre: 'Beto', email: 'beto@example.com', ultima: '2026-11-04T18:00:00.000Z', visitas: 4, dias: { [VZ.sumarDias(HOY, -1)]: 1 } },
      { uid: 'cata', nombre: '', email: 'cata@example.com', ultima: '2026-09-01T18:00:00.000Z', visitas: 1, dias: { '2026-09-01': 1 } }
    ],
    origenes: [
      { uid: 'ana', origen: 'google', creada: '2026-11-04T18:00:00.000Z', vip: true }, { uid: 'beto', origen: 'google', creada: '2026-11-03T18:00:00.000Z', vip: false },
      { uid: 'cata', origen: 'instagram', creada: '2026-11-02T18:00:00.000Z', vip: false }, { uid: 'dani', origen: 'directo', creada: '2026-09-01T18:00:00.000Z', vip: false }
    ],
    sinOrigen: 16, estado: { ultimoOk: null, errores: 0, ultimoError: null }, ...extra
  };
}
const ui = (extra = {}) => ({ ...VZ.uiInicial(), ...extra });

/* ───────────── Periodos ───────────── */

test('semana: de lunes a domingo; la semana en curso se corta en hoy y se compara con los mismos días de la anterior', () => {
  const r = VZ.rangoActual(datos(), { rango: 'semana', semana: 0 });
  assert.deepEqual(r.claves, ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'], 'lunes a jueves');
  assert.deepEqual(r.prev, ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']);
  assert.equal(r.semanaCompleta.length, 7);
  assert.equal(r.semanaCompleta[6], '2026-11-08');
  assert.equal(r.titulo, '2 nov – 8 nov');
  assert.equal(r.subtitulo, 'ESTA SEMANA');
  const pasada = VZ.rangoActual(datos(), { rango: 'semana', semana: 1 });
  assert.equal(pasada.claves.length, 7);
  assert.equal(pasada.claves[0], '2026-10-26');
  assert.equal(pasada.subtitulo, 'HACE 1 SEMANA');
  assert.equal(VZ.rangoActual(datos(), { rango: 'semana', semana: 3 }).subtitulo, 'HACE 3 SEMANAS');
  assert.equal(VZ.rangoActual(datos(), { rango: 'semana', semana: 999 }).semana, 51, 'tope de 51 semanas atrás');
});

test('30, 90 y 12 meses: los últimos N días terminando hoy, contra los N anteriores; «Todo» desde el primer día con visitas, sin comparación', () => {
  const d = datos({ n: 400 });
  const r30 = VZ.rangoActual(d, { rango: '30' });
  assert.equal(r30.claves.length, 30);
  assert.equal(r30.claves[29], HOY);
  assert.equal(r30.prev[29], VZ.sumarDias(HOY, -30));
  assert.equal(r30.titulo, 'Últimos 30 días');
  assert.equal(VZ.rangoActual(d, { rango: '90' }).claves.length, 90);
  const r365 = VZ.rangoActual(d, { rango: '365' });
  assert.equal(r365.claves.length, 365);
  assert.equal(r365.agrupar, 'mes');
  assert.equal(r365.titulo, 'Últimos 12 meses');
  const todo = VZ.rangoActual(datos({ n: 40 }), { rango: 'todo' });
  assert.equal(todo.claves.length, 40);
  assert.deepEqual(todo.prev, []);
  assert.equal(todo.titulo, 'Todo el historial');
  assert.equal(VZ.rangoActual(datos({ n: 40, vacio: true }), { rango: 'todo' }).claves.length, 30, 'sin visitas: los últimos 30 días');
});

test('comparación con el periodo anterior: sube, baja, igual, nuevo y sin dato', () => {
  assert.deepEqual(VZ.delta(120, 100, true), { clase: 'up', texto: '+20% vs periodo anterior' });
  assert.deepEqual(VZ.delta(35, 100, true), { clase: 'down', texto: '-65% vs periodo anterior' });
  assert.deepEqual(VZ.delta(100, 100, true), { clase: 'eq', texto: 'igual que antes' });
  assert.deepEqual(VZ.delta(5, 0, true), { clase: 'up', texto: 'nuevo' });
  assert.deepEqual(VZ.delta(0, 0, true), { clase: 'eq', texto: 'sin cambio' });
  assert.deepEqual(VZ.delta(5, 3, false), { clase: '', texto: '' });
});

/* ───────────── Modelo ───────────── */

test('KPIs: visitas, personas distintas (suma de únicos por día), cuentas nuevas con las que ya tienen plan, promedio por día y hora pico', () => {
  const m = VZ.construir(datos(), ui({ rango: '30' }));
  assert.equal(m.kpis.total, 360);
  assert.equal(m.kpis.unicos, 210);
  assert.equal(m.kpis.promedio, 12);
  assert.equal(m.kpis.horaPico, 9);
  assert.equal(m.kpis.nuevas, 3, 'ana, beto y cata crearon su cuenta en el periodo (dani no)');
  assert.equal(m.kpis.nuevasVip, 1);
  assert.equal(m.kpis.dTotal.clase, 'eq', 'mismo ritmo que el periodo anterior');
  assert.equal(m.hayPrev, true);
  assert.equal(m.kpis.spark.total.length, 30);
});

test('orígenes: una persona suma a cada origen; los totales por origen, aparato, país y página salen de los días del periodo', () => {
  const m = VZ.construir(datos(), ui({ rango: '30' }));
  assert.deepEqual(m.fuentes.map(x => [x.k, x.n]), [['directo', 90], ['google', 60], ['facebook', 30], ['instagram', 30]]);
  assert.deepEqual(m.dispositivos.map(x => [x.k, x.n]), [['movil', 120], ['tablet', 30], ['computadora', 60]]);
  assert.deepEqual(m.paises.map(x => [x.k, x.n]), [['MX', 180], ['US', 30]]);
  assert.deepEqual(m.paginas.map(x => [x.k, x.n]), [['landing', 240], ['acceso', 60], ['panel', 60]]);
});

test('redes sociales: «Meta sin identificar» va siempre al final y la «más fuerte» sale de las identificadas', () => {
  const d = datos();
  d.dias.forEach(x => { x.fuentes.meta = 5; x.fuentes.instagram = 4; x.fuentes.facebook = 1; });
  const m = VZ.construir(d, ui({ rango: '30' }));
  assert.deepEqual(m.sociales.map(x => x.k), ['instagram', 'facebook', 'meta']);
  assert.equal(m.identificadas[0].k, 'instagram');
  assert.equal(m.totalSocial, 30 * 10);
  assert.equal(m.serieRedes.length, 3);
  assert.equal(m.serieRedes[0].valores.length, 30);
});

test('mapa de calor: día de la semana × hora de México; el día de la semana de cada fecha es el correcto (5 nov 2026 = jueves)', () => {
  assert.equal(VZ.dow('2026-11-05'), 3);
  assert.equal(VZ.dow('2026-11-02'), 0);
  assert.equal(VZ.dow('2026-11-08'), 6);
  const m = VZ.construir(datos({ n: 14 }), ui({ rango: 'todo' }));
  assert.equal(m.calor.length, 7);
  assert.equal(m.calor[0].length, 24);
  const total = m.calor.reduce((t, f) => t + f.reduce((a, b) => a + b, 0), 0);
  assert.equal(total, 14 * 5, 'cada día aporta 3 + 2 visitas');
  assert.equal(m.calor.every(f => f[9] > 0 && f[15] > 0 && f[3] === 0), true);
  assert.equal(m.porSemana.every(v => v === 12), true, 'promedio por día de la semana');
});

test('atribución: cuentas creadas en el periodo por origen, con conversión a miembro con plan', () => {
  const m = VZ.construir(datos(), ui({ rango: '30' }));
  assert.deepEqual(m.atribucion.map(x => [x.k, x.n, x.vip]), [['google', 2, 1], ['instagram', 1, 0]]);
  assert.equal(m.sinOrigen, 16);
  const sin = VZ.construir(datos({ extra: { origenes: [] } }), ui({ rango: '30' }));
  assert.deepEqual(sin.atribucion, []);
});

test('quiénes entraron: solo los que tuvieron actividad en el periodo, por visitas; los anónimos son los únicos menos los miembros', () => {
  const m = VZ.construir(datos(), ui({ rango: 'semana' }));
  assert.deepEqual(m.miembros.map(x => [x.uid, x.enRango]), [['ana', 5], ['beto', 1]]);
  assert.equal(m.anonimos, Math.max(0, m.kpis.unicos - 2));
  const mes = VZ.construir(datos(), ui({ rango: '90' }));
  assert.deepEqual(mes.miembros.map(x => x.uid), ['ana', 'beto', 'cata'], 'en 90 días entra también quien visitó en septiembre');
});

/* ───────────── HTML ───────────── */

test('la pantalla trae todas las secciones de la referencia, en su orden, con los textos de Zoorigen', () => {
  const h = VZ.paginaHTML(datos(), ui({ rango: '30' }));
  const orden = ['Visitas', 'Personas distintas', 'Cuentas nuevas', 'Promedio por día', 'Visitas día a día', 'Visitas por periodo', '¿De dónde vienen tus miembros?',
    'Redes sociales · ¿cuánta gente llega de cada una?', 'Redes sociales a lo largo del tiempo', '¿Qué día entra más gente?', 'Mapa de calor · día y hora', 'Países', 'Páginas más vistas', 'Dispositivos', 'Cómo llegan al sitio', 'Quiénes entraron al panel'];
  let desde = 0;
  for (const t of orden) { const i = h.indexOf(t, desde); assert.ok(i >= 0, 'falta o está fuera de orden: ' + t); desde = i; }
  assert.match(h, /Cuánta gente visita Zoorigen, desde dónde llega y de qué red social salen tus miembros\. Conteo anónimo y sin cookies/);
  assert.match(h, /Contador activo · última visita/);
  assert.match(h, /Hora pico: 9 a\. m\./);
  assert.match(h, /Hubo <strong>30<\/strong> personas de fuera de México/);
  assert.match(h, /Por dónde entró cada persona en su primera visita del día/);
  assert.match(h, /Panel de miembros/);
  assert.match(h, /Página principal/);
  assert.match(h, /Inicio de sesión/);
  for (const [rango, texto] of VZ.RANGOS) assert.match(h, new RegExp(`data-rango="${rango}"[^>]*>${texto}<`));
  assert.equal(/alintec|alitec/i.test(h), false, 'ni rastro de otra marca');
});

test('semana: flechas de periodo (la siguiente desactivada en la semana actual), título del rango y «ESTA SEMANA»', () => {
  const h = VZ.controlesHTML(VZ.construir(datos(), ui()), ui());
  assert.match(h, /2 nov – 8 nov/);
  assert.match(h, /ESTA SEMANA/);
  assert.match(h, /aria-label="Semana siguiente" disabled/);
  assert.doesNotMatch(h, /aria-label="Semana anterior" disabled/);
  assert.match(h, /Descargar historial \(CSV\)/);
  const pasada = VZ.controlesHTML(VZ.construir(datos(), ui({ semana: 2 })), ui({ semana: 2 }));
  assert.match(pasada, /HACE 2 SEMANAS/);
  assert.doesNotMatch(pasada, /aria-label="Semana siguiente" disabled/);
  const mes = VZ.controlesHTML(VZ.construir(datos(), ui({ rango: '30' })), ui({ rango: '30' }));
  assert.doesNotMatch(mes, /Semana anterior/);
  assert.match(mes, /Últimos 30 días/);
});

test('cifras: la comparación sube en verde y baja en rojo con texto (nunca solo color)', () => {
  const d = datos();
  d.dias.slice(-30).forEach(x => { x.total = 50; });
  const h = VZ.kpisHTML(VZ.construir(d, ui({ rango: '30' })));
  assert.match(h, /vz-d--up">▲ \+\d+% vs periodo anterior/);
  const e = datos(); e.dias.slice(0, 30).forEach(x => { x.total = 50; x.unicos = 30; });
  assert.match(VZ.kpisHTML(VZ.construir(e, ui({ rango: '30' }))), /vz-d--down">▼ -\d+% vs periodo anterior/);
});

test('«de dónde vienen tus miembros»: ganador, barras, tabla con conversión y aviso de cuentas anteriores al contador; sin datos, estado vacío claro', () => {
  const h = VZ.atribucionHTML(VZ.construir(datos(), ui({ rango: '30' })));
  assert.match(h, /<strong>Google<\/strong> es de donde más miembros llegaron: <strong>2<\/strong> de 3 cuentas nuevas \(67%\)/);
  assert.match(h, /16 cuentas anteriores al contador no tienen origen/);
  assert.match(h, /<th scope="col" class="ap-col-num">Conversión<\/th>/);
  assert.match(h, /vz-conv">50%/);
  const vacio = VZ.atribucionHTML(VZ.construir(datos({ extra: { origenes: [] } }), ui({ rango: '30' })));
  assert.match(vacio, /Aún no hay cuentas con origen en este periodo/);
});

test('redes sociales: sin ninguna red, estado vacío con la sugerencia de ?utm_source; con Meta sin identificar, la nota para los anuncios', () => {
  const d = datos(); d.dias.forEach(x => { x.fuentes.facebook = 0; x.fuentes.instagram = 0; });
  assert.match(VZ.redesHTML(VZ.construir(d, ui({ rango: '30' }))), /Todavía nadie ha llegado desde una red social/);
  const m = datos(); m.dias.forEach(x => { x.fuentes.meta = 2; });
  const h = VZ.redesHTML(VZ.construir(m, ui({ rango: '30' })));
  assert.match(h, /Meta sin identificar \(60\)/);
  assert.match(h, /\?utm_source=\{\{site_source_name\}\}/);
});

test('quiénes entraron: nombre, correo, origen, con plan y fecha; el texto se escapa y los anónimos se cuentan aparte', () => {
  const m = VZ.construir(datos(), ui({ rango: 'semana' }));
  const h = VZ.quienesHTML(m);
  assert.match(h, /Ana &lt;b&gt;Prueba&lt;\/b&gt;/);
  assert.doesNotMatch(h, /<b>Prueba<\/b>/);
  assert.match(h, /ana@example\.com/);
  assert.match(h, /Con plan/);
  assert.match(h, /5 visitas/);
  assert.match(h, /visitantes anónimos que no se identifican/);
  assert.match(VZ.quienesHTML(VZ.construir(datos({ extra: { miembros: [] } }), ui())), /Ningún miembro entró al panel en este periodo\./);
});

test('visitas por periodo: filtros Hoy, Ayer, 7 y 30 días; cada fila con hora, origen, país, aparato, «primera del día» y de dónde viene', () => {
  const reg = { periodo: 'hoy', desde: HOY, hasta: HOY, total: 2, truncado: false, items: [
    { t: '2026-11-05T21:24:00.000Z', pagina: 'landing', fuente: 'interno', pais: 'MX', dispositivo: 'movil', nuevo: true, pistas: { ref: 'www.zoorigen.com', utm: '', app: '', fbclid: false, igshid: false } },
    { t: '2026-11-05T21:12:00.000Z', pagina: 'landing', fuente: 'facebook', pais: 'US', dispositivo: 'computadora', nuevo: false, pistas: { ref: 'l.facebook.com', utm: '', app: '', fbclid: true, igshid: false } }
  ] };
  const h = VZ.registroHTML(ui({ registro: reg, actualizado: '3:24 p. m.' }), null);
  for (const [, t] of [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7', '7 días'], ['30', '30 días']]) assert.match(h, new RegExp(`>${t}<`));
  assert.match(h, /3:24 p\. m\. · 5 nov/);
  assert.match(h, /Dentro del sitio/);
  assert.match(h, /viene de www\.zoorigen\.com/);
  assert.match(h, /México<\/strong> · Teléfono · primera del día/);
  assert.match(h, /Estados Unidos<\/strong> · Computadora/);
  assert.match(h, /viene de l\.facebook\.com · enlace con marca de Meta/);
  assert.equal(VZ.pistaTexto({}), 'sin pistas del origen');
  assert.equal(VZ.pistaTexto({ app: 'instagram', igshid: true }), 'app de Instagram · enlace compartido desde Instagram');
  assert.match(VZ.registroHTML(ui({ registro: { ...reg, items: [] } }), null), /Sin visitas registradas en este periodo\./);
  assert.match(VZ.registroHTML(ui({ errorRegistro: 'sin red' }), null), /No se pudo cargar el registro: sin red/);
  assert.match(VZ.registroHTML(ui(), null), /Cargando visitas…/);
  const muchas = { ...reg, items: Array.from({ length: 25 }, () => reg.items[0]) };
  assert.match(VZ.registroHTML(ui({ registro: muchas }), null), /Ver más \(15 restantes\)/);
});

test('estado global: apagado, con errores, esperando la primera visita y sin datos', () => {
  assert.match(VZ.pildoraEstado({ activo: false }), /El contador está apagado/);
  assert.match(VZ.pildoraEstado({ activo: true, estado: { errores: 2, ultimoOk: null, ultimoError: { mensaje: 'boom' } } }), /El contador tuvo errores/);
  assert.match(VZ.pildoraEstado({ activo: true, estado: {} }), /esperando la primera visita/);
  const vacia = VZ.paginaHTML(datos({ vacio: true, extra: { miembros: [], origenes: [], sinOrigen: 0, ultimaVisita: null } }), ui());
  assert.match(vacia, /Todavía no hay visitas registradas/);
  assert.match(vacia, /El contador ya está encendido/);
  const apagado = VZ.paginaHTML(datos({ vacio: true, extra: { miembros: [], origenes: [], activo: false } }), ui());
  assert.match(apagado, /El contador está apagado\. Enciéndelo en Configuración/);
});

/* ───────────── CSV ───────────── */

test('CSV: BOM, comillas, saltos \\r\\n, una fila por día con orígenes, aparatos, países y cuentas nuevas', () => {
  const csv = VZ.csvHistorial(datos({ n: 3 }));
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const filas = csv.slice(1).split('\r\n');
  assert.equal(filas.length, 4);
  const cab = filas[0].split(',').map(x => x.replace(/"/g, ''));
  assert.deepEqual(cab.slice(0, 7), ['fecha', 'visitas', 'personas_distintas', 'miembros_que_entraron', 'telefono', 'tableta', 'computadora']);
  assert.deepEqual(cab.slice(7, 23), FUENTES.map(k => 'origen_' + k));
  assert.deepEqual(cab.slice(23), ['paises', 'cuentas_nuevas']);
  assert.match(filas[3], /^"2026-11-05","12","7","1","4","1","2"/);
  assert.match(filas[3], /"MX:6\|US:1"/);
  assert.match(filas[1], /^"2026-11-03"/);
  assert.equal(/alintec/i.test(csv), false);
});

/* ───────────── Estilos, nombre y versión ───────────── */

test('estilos: colores sólidos, sin emojis; la sección está en Marketing con ícono Lucide y los archivos tienen su versión', () => {
  const css = leer('assets/css/admin-visitas.css');
  assert.doesNotMatch(css, /gradient/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(css));
  for (const rel of ['assets/js/admin-visitas.js', 'assets/css/admin-visitas.css']) assert.ok(!/alintec|alitec/i.test(leer(rel)), rel + ' sin marca de otra empresa');
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(leer('assets/js/admin-visitas.js').replace(/[▲▼]/g, '')));
  // Una sola «Métricas» (Marketing): el menú ya no tiene «Métricas de visitas» aparte; el enlace viejo #/visitas lleva a Métricas
  const s = P.seccion('metricas');
  assert.equal(s.grupo, 'Marketing');
  assert.equal(s.titulo, 'Métricas');
  assert.ok(I.existe(s.icono));
  assert.equal(P.seccion('visitas'), null);
  assert.equal(P.seccionDeHash('#/visitas'), 'metricas');
  const html = leer('pages/admin-club.html');
  assert.match(html, /data-sec="metricas"><svg class="zi"/);
  assert.doesNotMatch(html, /data-sec="visitas"/);
  assert.match(html, /sec === 'metricas'\) window\.ZOO_ADMIN_VISITAS\.metricas\(\)/);
  assert.doesNotMatch(html, /ZOO_ADMIN_MARKETING\.metricas\(\)/);
  assert.match(html, /replaceState\(null, '', '#\/metricas'\)/);
  const v = html.match(/admin-visitas\.js\?v=([\w-]+)/)[1];
  assert.equal(html.match(/admin-visitas\.css\?v=([\w-]+)/)[1], v);
  assert.ok(html.indexOf('admin-visitas.js') > html.indexOf('admin-vistas.js'), 'después de las vistas (usa sus piezas)');
  assert.ok(html.indexOf('admin-visitas.js') > html.indexOf('admin-graficas.js'));
});

test('la paleta de gráficas tiene un color sólido por cada origen de visita, en modo claro y oscuro', () => {
  const css = leer('assets/css/admin-club.css');
  for (let i = 9; i <= 25; i++) {
    assert.match(css, new RegExp(`--zg-${i}: #[0-9A-Fa-f]{6};`), 'color ' + i);
    assert.match(css, new RegExp(`\\.zg-c${i} \\{ --zg-c: var\\(--zg-${i}\\); \\}`));
  }
  assert.equal((css.match(/--zg-25: #/g) || []).length, 2, 'claro y oscuro');
  assert.equal(Object.keys(VZ.COLOR_FUENTE).length, 16);
  assert.deepEqual(Object.values(VZ.COLOR_FUENTE), Array.from({ length: 16 }, (_, i) => 9 + i));
});

/* ───────────── Una sola «Métricas»: pestañas Visitas | Negocio ───────────── */

test('«Métricas»: un solo título, dos pestañas (Visitas y Negocio) y el cuerpo donde se pinta cada una', () => {
  const v = VZ.cabeceraHTML('visitas');
  assert.equal((v.match(/<h1>/g) || []).length, 1);
  assert.match(v, /<h1>Métricas<\/h1>/);
  assert.match(v, /role="tablist"/);
  assert.match(v, /id="vzTab-visitas"[^>]*aria-selected="true"/);
  assert.match(v, /id="vzTab-negocio"[^>]*aria-selected="false"/);
  assert.match(v, /id="vzCuerpo" role="tabpanel"/);
  assert.match(VZ.cabeceraHTML('negocio'), /id="vzTab-negocio"[^>]*aria-selected="true"/);
  assert.deepEqual(VZ.PESTANAS.map(p => p[1]), ['Visitas', 'Negocio']);
  assert.doesNotMatch(v, /[\p{Extended_Pictographic}]/u);
  // La pestaña Visitas ya no trae su propio h1
  assert.doesNotMatch(VZ.paginaHTML(datos(), ui({ rango: '30' })), /<h1>/);
});

test('«Métricas»: las cuentas nuevas salen de «altas» del servidor (todas, con o sin origen) y las demás cifras no cambian', () => {
  const base = VZ.construir(datos(), ui({ rango: '30' }));
  assert.equal(base.kpis.nuevas, 3, 'sin «altas»: las que tienen origen');
  const altas = { [HOY]: { n: 2, vip: 1 }, [VZ.sumarDias(HOY, -5)]: { n: 4, vip: 0 }, [VZ.sumarDias(HOY, -40)]: { n: 5, vip: 2 } };
  const m = VZ.construir(datos({ extra: { altas } }), ui({ rango: '30' }));
  assert.equal(m.kpis.nuevas, 6, '30 días: 2 + 4 (las de hace 40 días caen en el periodo anterior)');
  assert.equal(m.kpis.nuevasVip, 1);
  assert.equal(m.kpis.dNuevas.clase, 'up');
  assert.equal(m.kpis.total, base.kpis.total);
  assert.equal(m.kpis.unicos, base.kpis.unicos);
  assert.match(VZ.kpisHTML(m), /Cuentas nuevas[\s\S]*?>6</);
});

test('«Métricas»: admin-vistas pinta dentro de #vzCuerpo cuando existe y la pestaña Negocio no repite el título de la página', () => {
  const vistas = leer('assets/js/admin-vistas.js');
  assert.match(vistas, /querySelector\('#vzCuerpo'\)/);
  const mk = leer('assets/js/admin-marketing.js');
  assert.match(mk, /<h2 class="zs-seccion__titulo"/);
  assert.doesNotMatch(mk, /visitas_a_la_portada.*Cuentas nuevas/);
  assert.match(leer('assets/js/admin-visitas.js'), /window\.ZOO_ADMIN_MARKETING\.metricas\(forzar\)/);
});
