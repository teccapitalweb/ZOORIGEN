'use strict';
// Panel de administración · sección «Recordatorios de pago» (interruptor, ensayo, límites, resultados, seguimiento, últimos envíos y pruebas).
// Ejecutar: node --test tests/admin-recordatorios.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const R = require(path.join(RAIZ, 'assets', 'js', 'admin-recordatorios.js'));
const html = leer('pages/admin-club.html');
const js = leer('assets/js/admin-recordatorios.js');
const css = leer('assets/css/admin-recordatorios.css');

const SERIE = [
  { paso: 1, monto: 0, esperaHoras: 12, desde: 'registro' }, { paso: 2, monto: 50, esperaHoras: 24, desde: 'envio' }, { paso: 3, monto: 100, esperaHoras: 12, desde: 'vencimiento' },
  { paso: 4, monto: 50, esperaHoras: 12, desde: 'vencimiento' }, { paso: 5, monto: 100, esperaHoras: 12, desde: 'vencimiento' }, { paso: 6, monto: 50, esperaHoras: 12, desde: 'vencimiento' },
  { paso: 7, monto: 100, esperaHoras: 12, desde: 'vencimiento' }
];
const estadisticas = {
  enviadosPaso: { p1: 10, p2: 8, p3: 6, p4: 5, p5: 4, p6: 3, p7: 2 },
  cuponesCreados: { m50: 16, m100: 12 }, pagosConCuponPaso: { p2: 2, p3: 1, p4: 0, p5: 1, p6: 0, p7: 0 }, pagosTrasCorreoPaso: { p0: 3, p1: 1, p2: 2, p3: 1, p4: 0, p5: 1, p6: 0, p7: 0 },
  convertidas: 4, pagosSinCupon: 3, bajas: 2
};
const resumen = (extra = {}) => ({
  configurado: true, modo: 'apagado', dentroDeHorario: true, topeDiario: 60, maxPorCorrida: 25, enviadosHoy: 0, faltanHoy: 60, cupoCorrida: 25, calificarian: 12,
  primerEnvioMs: Date.UTC(2026, 9, 23, 14, 0), serie: SERIE, maxCiclos: 3, descansoDias: 4, vigenciaHoras: 24, estadisticas, conteo: { baja: 2, 'cupon-vigente': 3 },
  recientes: [{ uid: 'a', nombre: 'Ana <b>', correo: 'ana@example.com', ciclo: 2, paso: 3, monto: 100, enviadoMs: Date.UTC(2026, 9, 22, 18, 0) }], ...extra
});
const item = (extra = {}) => ({ uid: 'u1', nombre: 'Ana Pérez', correo: 'ana@example.com', etapa: 'cupon-vigente', estado: 'Cupón vigente', ciclo: 2, paso: 4, enviados: 11, proximoMs: 0, proximoPaso: 0, proximoCiclo: 0, cuponVenceMs: Date.UTC(2026, 9, 23, 20, 0), cursoPrueba: 'Reptiles', ...extra });

test('la sección existe: menú, hash, carga del módulo y de la hoja, y aparece en el grupo Marketing', () => {
  const s = P.seccion('recordatorios');
  assert.deepEqual([s.grupo, s.titulo, s.icono, s.origen], ['Marketing', 'Recordatorios de pago', 'mail', 'servidor']);
  assert.equal(P.seccionDeHash('#/recordatorios'), 'recordatorios');
  assert.match(html, /data-sec="recordatorios"><svg class="zi"[\s\S]*?Recordatorios de pago/);
  assert.match(html, /sec === 'recordatorios'\) window\.ZOO_ADMIN_RECORDATORIOS\.recordatorios\(\)/);
  assert.match(html, /admin-recordatorios\.js\?v=[\w.-]+/); assert.match(html, /admin-recordatorios\.css\?v=[\w.-]+/);
  assert.ok(html.indexOf('admin-recordatorios.js') > html.indexOf('admin-vistas.js') && html.indexOf('admin-recordatorios.js') > html.indexOf('admin-graficas.js'));
});

test('estado: apagado, activo enviando, en pausa por horario, tope alcanzado y sin configurar', () => {
  assert.match(R.estadoGeneral(resumen()).titulo, /Apagado/);
  assert.equal(R.estadoGeneral(resumen({ modo: 'activo' })).titulo, 'Activo y enviando');
  assert.equal(R.estadoGeneral(resumen({ modo: 'activo', dentroDeHorario: false })).titulo, 'Activo, en pausa por horario');
  assert.match(R.estadoGeneral(resumen({ modo: 'activo', cupoCorrida: 0 })).titulo, /tope de hoy alcanzado/);
  assert.equal(R.estadoGeneral(resumen({ configurado: false })).titulo, 'Falta configurar el correo');
  assert.match(R.insigniaModo(resumen()), /APAGADO/); assert.match(R.insigniaModo(resumen({ modo: 'activo' })), /ACTIVO/);
});

test('control: Activar/Apagar, Ensayo, Actualizar y límites; sin configurar no deja activar', () => {
  const apagado = R.controlHTML(resumen());
  assert.match(apagado, /data-accion="activar"/); assert.match(apagado, /data-accion="ensayo"/); assert.match(apagado, /data-accion="recargar"/);
  assert.doesNotMatch(apagado, /data-accion="apagar"/);
  assert.match(apagado, /id="rpTope"[^>]*value="60"/); assert.match(apagado, /id="rpCorrida"[^>]*value="25"/);
  assert.match(apagado, /Próximo envío:/);
  assert.match(R.controlHTML(resumen({ modo: 'activo' })), /data-accion="apagar"/);
  assert.match(R.controlHTML(resumen({ configurado: false })), /data-accion="activar" disabled/);
});

test('«¿Cómo funciona cada vuelta?» se arma con la serie del servidor (7 correos, descanso y máximo de vueltas)', () => {
  const h = R.comoFuncionaHTML(resumen());
  assert.match(h, /<summary>¿Cómo funciona cada vuelta\?<\/summary>/);
  assert.equal((h.match(/<li><span class="rp-paso__n">/g) || []).length, 7);
  assert.match(h, /Beneficios, sin cupón<\/strong> · 12 horas después de registrarse/);
  assert.match(h, /Cupón de \$50<\/strong> · 1 día después del correo 1|Cupón de \$50<\/strong> · 24 horas después del correo 1/);
  assert.match(h, /12 horas después de que vence el cupón del correo 2/);
  assert.match(h, /descansa 4 días/); assert.match(h, /Máximo 3 vueltas/);
  assert.equal(R.comoFuncionaHTML({}), '');
});

test('resultados: tiles, gráfica de enviados y pagos por monto, y «Cómo leerlo» con cifras reales', () => {
  const filas = R.porMonto(resumen());
  assert.deepEqual(filas.map(f => [f.monto, f.enviados, f.pagaron]), [[50, 16, 2], [100, 12, 2]]);
  assert.equal(filas[0].tasa, 12.5);
  const tiles = R.resultadosTiles(resumen());
  for (const t of ['Correos enviados', 'Cupones creados', 'Pagaron con cupón', 'Pagaron sin cupón', 'Se dieron de baja']) assert.ok(tiles.includes(t), t);
  assert.match(R.fraseResultados(resumen()), /pagaron 4 personas con un cupón: con el cupón de \$50 pagaron 2 de 16 correos \(12,5 %\); con el cupón de \$100 pagaron 2 de 12 correos \(16,7 %\)/);
  const g = R.graficaMontos(resumen());
  assert.match(g, /Cómo leerlo:/); assert.match(g, /Correos enviados/); assert.match(g, /Pagaron con el cupón/);
  assert.match(R.graficaMontos(resumen({ estadisticas: {}, })), /Todavía no se envían cupones/);
  assert.match(R.graficaPasos(resumen()), /Correo 2 · cupón de \$50/);
  assert.match(R.graficaPasos(resumen()), /El correo que más pagos trae es «Correo 2 · cupón de \$50»: 2 pagos de 4 con cupón/);
  assert.match(R.graficaTrasCorreo(resumen()), /Antes de recibir un correo/);
  assert.match(R.graficaTrasCorreo(resumen()), /3 lo hicieron antes de recibir cualquier correo y 5 después/);
});

test('seguimiento: pestañas Todas / Listas ahora / Programadas, filtro por etapa, búsqueda, puntos de avance, vuelta y cuándo sale', () => {
  const lista = { total: 30, hayMas: true, items: [item(), item({ uid: 'u2', nombre: '<script>x</script>', correo: 'b@example.com', etapa: 'en-espera', estado: 'En espera de su primer correo', enviados: 0, paso: 0, ciclo: 1, cuponVenceMs: 0, proximoMs: Date.UTC(2026, 9, 23, 14, 0), proximoPaso: 1, proximoCiclo: 1 })] };
  const h = R.seguimientoHTML(lista, { etapa: 'todas', q: 'an' }, 3, { baja: 2 });
  for (const t of ['Todas', 'Listas ahora', 'Programadas']) assert.ok(h.includes('>' + t + '</button>'), t);
  assert.match(h, /data-etapa="todas" aria-pressed="true"/);
  assert.match(h, /id="rpBuscar"[^>]*value="an"/); assert.match(h, /<option value="baja">Baja \(2\)<\/option>/);
  assert.match(h, /Vuelta 2 de 3/); assert.match(h, /Correo 4/);
  assert.match(h, /aria-label="Vuelta 2 de 3, correo 4 de 7"/);
  assert.equal((R.puntos(item(), 7).match(/is-hecho/g) || []).length, 4);
  assert.match(R.puntos(item({ enviados: 0, paso: 0 }), 7), /Todavía no recibe su primer correo/);
  assert.match(h, /Cupón vence/); assert.match(h, /Vuelta 1 · correo 1/);
  assert.match(R.filaCuenta(item({ cuponVenceMs: 0, proximoMs: 1, vencida: true, proximoCiclo: 1, proximoPaso: 1 }), 3), /En la próxima revisión/);
  assert.doesNotMatch(h, /<script>x<\/script>/, 'los nombres se escapan'); assert.match(h, /&lt;script&gt;/);
  assert.match(h, /Mostrando 2 de 30/); assert.match(h, /data-accion="mas"/);
  assert.match(R.tablaHTML({ items: [], total: 0 }), /Nadie coincide/);
  assert.match(h, /data-label="Cuenta"/); assert.match(h, /data-label="Cuándo sale"/);
});

test('últimos correos enviados y probar los correos', () => {
  const r = R.recientesHTML(resumen());
  assert.match(r, /Vuelta 2 · correo 3/); assert.match(r, /Cupón de \$100/); assert.doesNotMatch(r, /<b>/); assert.match(r, /Ana &lt;b&gt;/);
  assert.match(R.recientesHTML({ recientes: [] }), /Todavía no se envía ningún correo/);
  const p = R.pruebaHTML(resumen(), 'jefe@zoorigen.com');
  assert.match(p, /solo a tu correo<\/strong> \(jefe@zoorigen\.com\), nunca a otra persona/);
  assert.equal((p.match(/<option value="\d">Correo/g) || []).length, 7);
  assert.equal((p.match(/<option value="\d">Vuelta/g) || []).length, 3);
  assert.match(p, /Enviarme una prueba/); assert.match(p, /data-accion="prueba-todos"[\s\S]*?Enviarme los 7/);
  assert.match(p, /cupón real de prueba que no cuenta en las estadísticas/);
});

test('ventanas: confirmar la activación (cuántas personas, primer envío, topes) y el resultado del ensayo (sin envío)', () => {
  const a = R.activarCuerpoHTML(resumen());
  assert.match(a, /<strong>12 personas<\/strong> están en la serie/); assert.match(a, /El primer envío sería <strong>/);
  assert.match(a, /Máximo 60 correos al día y 25 por revisión/); assert.match(a, /entre las 8:00 y las 22:00/); assert.match(a, /enlace para darse de baja/);
  assert.match(R.activarCuerpoHTML(resumen({ calificarian: 1, primerEnvioMs: 0 })), /<strong>1 persona<\/strong> está en la serie[\s\S]*nadie tiene un correo pendiente/);
  const e = R.ensayoCuerpoHTML({ dentroDeHorario: true, enviadosHoy: 3, topeDiario: 60, restantes: 2, recibirian: [{ nombre: 'Ana', correo: 'a@x.com', ciclo: 1, paso: 2, monto: 50 }] });
  assert.match(e, /saldrían <strong>1 correo<\/strong> y quedarían 2/); assert.match(e, /no se envió nada/); assert.match(e, /Vuelta 1 · correo 2 · \$50/);
  assert.match(R.ensayoCuerpoHTML({ dentroDeHorario: false, recibirian: [] }), /fuera de horario/);
});

test('pantalla completa: tarjeta de título zs-seccion, todas las tarjetas y las cifras de arriba', () => {
  const v = R.vistaHTML({ resumen: resumen({ enviadosHoy: 5, faltanHoy: 55 }), lista: { total: 1, items: [item()] } }, { correoAdmin: 'jefe@zoorigen.com' });
  assert.match(v, /class="zs-seccion ap-titulo"/); assert.match(v, /Recordatorios\s*<span class="zs-acento">de pago\.<\/span>/);
  for (const t of ['Estado y control', 'Resultados de los cupones', 'Pagos con cupón por correo', 'Quién pagó y qué había recibido', 'Seguimiento de cuentas', 'Últimos correos enviados', 'Probar los correos']) assert.ok(v.includes('<h2>' + t + '</h2>'), t);
  assert.match(v, /enviados hoy/); assert.match(v, /faltan hoy/); assert.match(v, /pagaron con cupón/);
  assert.doesNotMatch(v, /gradient|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('el módulo habla solo con las rutas del servidor y no escribe nada desde el navegador', () => {
  const rutas = new Set([...js.matchAll(/'(\/api\/admin\/recordatorios[a-z/?=&+ ]*)/g)].map(m => m[1].split('?')[0].replace(/\/$/, '')));
  for (const r of ['/api/admin/recordatorios', '/api/admin/recordatorios/lista', '/api/admin/recordatorios/modo', '/api/admin/recordatorios/limites', '/api/admin/recordatorios/ensayo', '/api/admin/recordatorios/prueba']) assert.ok(rutas.has(r), 'falta ' + r);
  assert.doesNotMatch(js, /firestore|collection\(|\.set\(|\.update\(/);
  assert.match(js, /confirmo: true/);
});

test('CSS: colores del panel, sin degradados, letra de 12 px o más, 40 px táctiles', () => {
  assert.doesNotMatch(css, /gradient\(/);
  for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])) >= 12, m[0]);
  assert.match(css, /\.rp-control__acciones \.ap-btn \{ min-height: 40px/);
  assert.match(css, /\.rp-como > summary \{[^}]*min-height: 40px/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}\b(?![^{]*\{)/, 'solo variables del panel en reglas de color, salvo los anillos de foco');
});
