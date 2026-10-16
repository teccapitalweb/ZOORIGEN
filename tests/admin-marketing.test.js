'use strict';

// Métricas y Pruebas gratuitas del panel de administración: ayudas puras (series, tendencias, CSV) y constructores de HTML.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const M = require(path.join(RAIZ, 'assets', 'js', 'admin-marketing.js'));

const dias = n => Array.from({ length: n }, (_, i) => ({ dia: P.sumarDiasClave('2026-09-17', i), n: i % 4 }));

test('agruparSerie: por día, por semana (lunes a domingo) y por mes', () => {
  const serie = [{ dia: '2026-10-05', n: 1 }, { dia: '2026-10-06', n: 2 }, { dia: '2026-10-12', n: 5 }, { dia: '2026-11-01', n: 4 }];
  assert.deepEqual(P.agruparSerie(serie, 'dia').map(x => x.valor), [1, 2, 5, 4]);
  const sem = P.agruparSerie(serie, 'semana');
  assert.deepEqual(sem.map(x => [x.clave, x.valor]), [['2026-10-05', 3], ['2026-10-12', 5], ['2026-10-26', 4]]);
  assert.equal(sem[0].etiqueta, '5 oct');
  const mes = P.agruparSerie(serie, 'mes');
  assert.deepEqual(mes.map(x => [x.clave, x.valor]), [['2026-10', 8], ['2026-11', 4]]);
  assert.equal(mes[0].etiqueta, 'oct 26');
  assert.deepEqual(P.agruparSerie(null, 'dia'), []);
});

test('lunesDe y sumarDiasClave cruzan mes y año', () => {
  assert.equal(P.lunesDe('2026-01-01'), '2025-12-29');
  assert.equal(P.sumarDiasClave('2026-02-27', 3), '2026-03-02');
});

test('variacion: sube, baja, igual y desde cero (sin dividir entre cero)', () => {
  assert.equal(P.variacion(0, 0).tono, 'neutro');
  assert.equal(P.variacion(5, 0).texto, 'Antes eran 0');
  assert.match(P.variacion(15, 10).texto, /^\+50 % frente a 10/);
  assert.equal(P.variacion(15, 10).icono, 'trending-up');
  assert.match(P.variacion(5, 10).texto, /^-50 %/);
  assert.equal(P.variacion(5, 10).tono, 'aviso');
  assert.equal(P.variacion(7, 7).tono, 'neutro');
  assert.doesNotThrow(() => P.variacion('x', undefined));
});

test('rangos rápidos: 7, 30, 90 y 365 días terminan hoy; «todo» lo decide el servidor', () => {
  assert.deepEqual(P.rangoRapido('7', '2026-10-16'), { desde: '2026-10-10', hasta: '2026-10-16' });
  assert.deepEqual(P.rangoRapido('30', '2026-10-16'), { desde: '2026-09-17', hasta: '2026-10-16' });
  assert.deepEqual(P.rangoRapido('todo', '2026-10-16'), { desde: 'todo', hasta: '2026-10-16' });
  assert.deepEqual(P.rangoRapido('raro', '2026-10-16'), P.rangoRapido('30', '2026-10-16'));
});

test('graficaSerie: SVG sin texto ni degradados, ejes y pico en HTML, valores escapados', () => {
  const g = P.graficaSerie(P.agruparSerie(dias(30), 'dia'), { titulo: 'Cuentas nuevas', unidad: 'cuentas' });
  assert.match(g, /<svg class="ap-grafica__svg"[^>]*role="img"/);
  assert.equal((g.match(/<rect class="ap-barra/g) || []).length, 30);
  assert.match(g, /ap-serie__ejes/);
  assert.doesNotMatch(g, /gradient|<script|<text/i);
  const l = P.graficaSerie(P.agruparSerie(dias(10), 'dia'), { tipo: 'linea', titulo: 'x' });
  assert.match(l, /class="ap-linea"/);
  assert.equal(P.graficaSerie([]), '');
  assert.doesNotMatch(P.graficaSerie([{ etiqueta: '<img onerror=1>', valor: 3 }]), /<img/);
  const vacia = P.graficaSerie(P.agruparSerie(dias(5).map(d => ({ dia: d.dia, n: 0 })), 'dia'), { titulo: 'x' });
  assert.match(vacia, /Máximo 0/);
});

test('barrasHorizontales y CSV: escapan texto y protegen contra fórmulas de hoja de cálculo', () => {
  assert.equal(P.barrasHorizontales([]), '');
  assert.match(P.barrasHorizontales([{ etiqueta: '<b>x</b>', valor: 3 }]), /&lt;b&gt;x/);
  assert.equal(P.celdaCsv('=SUMA(A1)'), "'=SUMA(A1)");
  assert.equal(P.celdaCsv('a,b'), '"a,b"');
  assert.equal(P.celdaCsv('di "hola"'), '"di ""hola"""');
  assert.equal(P.aCsv([{ clave: 'a', titulo: 'A' }], [{ a: 1 }, { a: '@x' }]), "A\r\n1\r\n'@x");
});

/* ───────── constructores de HTML ───────── */

const metricas = () => ({
  rango: { desde: '2026-09-17', hasta: '2026-10-16', dias: 30 },
  totales: { altas: 7, pruebas: 3, certificados: 2, pagos: 5 },
  anterior: { altas: 4, pruebas: 0, certificados: 2, pagos: 6 },
  series: { altas: dias(30), pruebas: dias(30), certificados: dias(30), pagos: dias(30) },
  cuentas: { total: 60, activos: 30, cancelados: 2, pagoPendiente: 1, vencidos: 8, sinMembresia: 19, conAccesoHoy: 32, conPlanAlgunaVez: 41, sinAccesoConPlan: 9, retencion: 78 },
  cohortes: [{ mes: '2026-09', registrados: 12, conPlanAlgunaVez: 7, conAccesoHoy: 6, conversion: 58, retencion: 86 }],
  conversion: { eligieronRango: 8, seHicieronMiembroRango: 2, tasaRango: 25, eligieronTotal: 20, seHicieronMiembroTotal: 6, tasaTotal: 30 },
  cursos: { masElegidos: [{ cursoId: 'c1', curso: 'Fototrampeo <x>', n: 5 }], masCompletados: [], masEmpezados: [{ cursoId: 'c2', curso: 'Mariposarios', n: 9 }] },
  retos: { personas: 40, conActividad: 30, retosSuperados: 150, xpTotal: 6000, xpPromedio: 200, bandas: [{ banda: '0', n: 10 }, { banda: '1 a 99', n: 5 }, { banda: '100 a 499', n: 20 }, { banda: '500 o más', n: 5 }], actividadPorDia: dias(30) },
  visitas: { activo: false, total: 0, porDia: [], porPagina: [] },
  notas: { pagos: 'Cuenta el último pago.', retencion: 'De quienes alguna vez tuvieron plan.', retos: 'Sin fecha por intento.' }
});

test('metricasHTML: tarjetas, tendencias, gráficas, cohortes, cursos y retos; texto del servidor escapado', () => {
  const h = M.metricasHTML(metricas(), { preset: '30' });
  assert.match(h, /Cómo va/);
  assert.match(h, /ap-kpi__tend/);
  assert.match(h, /\+75 % frente a 4/);
  assert.match(h, /data-rango="30" aria-pressed="true"/);
  assert.match(h, /id="apDesde" value="2026-09-17"/);
  assert.match(h, /data-agrupar="dia" aria-pressed="true"/);
  assert.match(h, /Cohortes por mes de registro/);
  assert.match(h, /sep 2026/);
  assert.match(h, /Fototrampeo &lt;x&gt;/);
  assert.doesNotMatch(h, /Fototrampeo <x>/);
  assert.match(h, /Cursos más completados/);
  assert.match(h, /Aún no hay cursos completados/);
  assert.match(h, /El contador de visitas está apagado/);
  assert.match(h, /href="#\/configuracion"/);
  assert.doesNotMatch(h, /gradient\(|[\p{Extended_Pictographic}]/u);
});

test('metricasHTML con el contador encendido muestra la gráfica y las páginas más vistas', () => {
  const d = metricas();
  d.visitas = { activo: true, total: 120, porDia: dias(30), porPagina: [{ pagina: 'portada', n: 100 }, { pagina: 'terminos', n: 20 }] };
  const h = M.metricasHTML(d, {});
  assert.match(h, /Visitas a la portada/);
  assert.match(h, /Páginas más vistas/);
  assert.doesNotMatch(h, /El contador de visitas está apagado/);
});

test('agrupación automática: día hasta 45 días, semana hasta 200 y mes después', () => {
  assert.equal(M.agruparAuto(30), 'dia');
  assert.equal(M.agruparAuto(90), 'semana');
  assert.equal(M.agruparAuto(365), 'mes');
  assert.equal(M.modoDe({ agrupar: 'semana' }, 30), 'semana');
  assert.equal(M.modoDe({ agrupar: 'raro' }, 30), 'dia');
});

const pruebas = () => ({
  totales: { elegidas: 3, terminaronGratis: 1, seHicieronMiembro: 1, conAcceso: 1, tasaMiembro: 33, tasaTerminaron: 33 },
  porCurso: [{ cursoId: 'c1', curso: 'Fototrampeo', elegidas: 2, terminaronGratis: 1, seHicieronMiembro: 1 }, { cursoId: 'c2', curso: 'Mariposarios', elegidas: 1, terminaronGratis: 0, seHicieronMiembro: 0 }],
  filas: [
    { uid: 'a', nombre: 'Claudia Gabriela Caballero Rodríguez', correo: 'claudia.gabriela.caballero.r@x.test', cursoId: 'c1', curso: 'Fototrampeo', elegidoEn: '2026-10-10T12:00:00Z', clases: 5, clasesGratis: 4, clasesVistas: 4, avance: 100, terminoGratis: true, completo: false, yaMiembro: true, conAcceso: true, cuentaExiste: true },
    { uid: 'b', nombre: 'Beto <b>', correo: 'beto@x.test', cursoId: 'c1', curso: 'Fototrampeo', elegidoEn: '2026-10-12T12:00:00Z', clases: 5, clasesGratis: 4, clasesVistas: 1, avance: 25, terminoGratis: false, completo: false, yaMiembro: false, conAcceso: false, cuentaExiste: true },
    { uid: 'c', nombre: '', correo: '', cursoId: 'c2', curso: 'Mariposarios', elegidoEn: '2026-10-01T12:00:00Z', clases: 3, clasesGratis: 2, clasesVistas: 0, avance: 0, terminoGratis: false, completo: false, yaMiembro: false, conAcceso: false, cuentaExiste: false }
  ],
  sinElegir: { total: 2, lista: [{ uid: 'z', nombre: 'Zoe', correo: 'zoe@x.test', registro: '2026-10-14T12:00:00Z' }] },
  truncado: false
});

test('filtrarPruebas: por estado, curso y texto sin acentos', () => {
  const f = pruebas().filas;
  assert.deepEqual(M.filtrarPruebas(f, { filtro: 'terminaron' }).map(x => x.uid), ['a']);
  assert.deepEqual(M.filtrarPruebas(f, { filtro: 'en-curso' }).map(x => x.uid), ['b', 'c']);
  assert.deepEqual(M.filtrarPruebas(f, { filtro: 'miembros' }).map(x => x.uid), ['a']);
  assert.deepEqual(M.filtrarPruebas(f, { curso: 'c2' }).map(x => x.uid), ['c']);
  assert.deepEqual(M.filtrarPruebas(f, { texto: 'RODRIGUEZ' }).map(x => x.uid), ['a']);
  assert.deepEqual(M.filtrarPruebas(f, { texto: 'mariposarios' }).map(x => x.uid), ['c']);
});

test('pruebasHTML: totales, por curso, tabla con avance y escapado; sin acción de reiniciar (el servidor no la tiene)', () => {
  const h = M.pruebasHTML(pruebas(), {});
  assert.match(h, /Pruebas/);
  assert.match(h, /ap-tabla-zona/);
  // filas compactas: nombre en el título, correo en la línea pequeña y tocar la fila abre la ficha
  assert.match(h, /class="ap-fc__titulo" data-accion="ficha" data-uid="[^"]*">Claudia Gabriela Caballero Rodríguez<\/button>/);
  assert.match(h, /class="ap-fc__correo">/);
  assert.match(h, /Beto &lt;b&gt;/);
  assert.match(h, /Terminó las clases gratis/);
  assert.match(h, /Cuenta eliminada/);
  assert.match(h, /data-pestana="sin"/);
  assert.doesNotMatch(h, /reiniciar|Reiniciar/);
  const sin = M.pruebasHTML(pruebas(), { pestana: 'sin' });
  assert.match(sin, /Zoe/);
  assert.match(sin, /Se muestran las 1 más recientes de 2|Cuentas que aún no eligen/);
  assert.match(M.pruebasHTML({ ...pruebas(), filas: [], porCurso: [], totales: { elegidas: 0, terminaronGratis: 0, seHicieronMiembro: 0, conAcceso: 0, tasaMiembro: null, tasaTerminaron: null } }, {}), /Nadie ha elegido todavía/);
});

test('admin-marketing.js solo habla con el servidor: nada de Firestore directo ni escrituras', () => {
  const js = leer('assets/js/admin-marketing.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(js, /db\.collection|getDocs|firebase\.firestore|method: 'POST'|method: 'DELETE'/);
  assert.match(js, /\/api\/admin\/metricas\?desde=/);
  assert.match(js, /\/api\/admin\/pruebas/);
});
