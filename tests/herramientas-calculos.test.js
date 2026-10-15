'use strict';
// Cuentas de la referencia clínica (BCS, lectura de números) y de los módulos RETIRADOS de la interfaz
// (dosis, anestesia, fluidos, urgencias y hemograma): ya no se cargan en ninguna página, pero el código y los
// datos se conservan en el repositorio y sus pruebas siguen corriendo.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/herramientas-calculos.js');
const R = require('../assets/js/herramientas-clinica-retirada.js');

const PAGINA = fs.readFileSync(path.resolve(__dirname, '../pages/club-herramientas.html'), 'utf8');
const sinEtiquetas = s => s.replace(/<[^>]+>/g, '');
const cerca = (a, b, tol) => assert.ok(Math.abs(a - b) <= (tol || 1e-6), a + ' ≈ ' + b);

test('leerNumero: acepta coma y punto, rechaza texto y vacío', () => {
  assert.equal(C.leerNumero('12.5'), 12.5);
  assert.equal(C.leerNumero('12,5'), 12.5);
  assert.equal(C.leerNumero(' 7 '), 7);
  assert.ok(Number.isNaN(C.leerNumero('')));
  assert.ok(Number.isNaN(C.leerNumero('abc')));
  assert.ok(Number.isNaN(C.leerNumero('1e5')));
  assert.ok(Number.isNaN(C.leerNumero(null)));
});

test('peso: rango válido de 0.001 a 6000 kg', () => {
  assert.ok(C.errorPeso(NaN));
  assert.ok(C.errorPeso(0));
  assert.ok(C.errorPeso(-3));
  assert.ok(C.errorPeso(6001));
  assert.equal(C.errorPeso(0.02), '');
  assert.equal(C.errorPeso(4500), '');
});

test('fmt: nunca "0.00" para un número que no es cero', () => {
  assert.equal(C.fmt(0), '0');
  assert.notEqual(C.fmt(0.004), '0.00');
  assert.equal(C.fmt(0.004), '0.004');
  assert.equal(C.fmt(20), '20', 'sin ceros sobrantes');
  assert.equal(C.fmt(0.1), '0.1');
  assert.equal(C.fmt(12.345), '12.3');
  assert.equal(C.fmt(1.234), '1.23');
  assert.equal(C.fmt(1500.4), '1500');
  assert.equal(C.fmt(NaN), '—');
});

const ZD = require('../assets/js/herramientas-dosis.js');
const FARMACO = {
  nombre: 'X',
  entradas: [
    { grupo: 'mamifero', aplica: 'perro', min: 5, max: 15, via: 'IM', fuente: 'Fuente A', url: 'https://a.example/x' },
    { grupo: 'mamifero', aplica: 'gato', min: 1, max: 2, via: 'PO', fuente: 'Fuente B', url: 'https://b.example/y' },
    { grupo: 'ave', aplica: 'loro', min: null, max: 4, via: 'IM', fuente: 'Fuente C', url: 'https://c.example/z' },
    { grupo: 'reptil', aplica: 'lagarto', min: 2, max: 2, via: 'SC', fuente: 'Fuente D', url: 'https://d.example/w' }
  ],
  precauciones: [{ texto: 'Cuidado', fuente: 'F', url: 'https://p.example' }]
};

test('dosis verificadas: una fila por referencia con mg y ml bien calculados', () => {
  const r = R.dosisVerificadas(FARMACO, 'mamifero', 10, 100);
  assert.equal(r.ok, true);
  assert.equal(r.filas.length, 2);
  const perro = r.filas[0], gato = r.filas[1];
  assert.equal(perro.aplica, 'perro');
  assert.equal(perro.mgMin, 50); assert.equal(perro.mgMax, 150);
  cerca(perro.mlMin, 0.5); cerca(perro.mlMax, 1.5);
  assert.equal(gato.mgMin, 10); cerca(gato.mlMax, 0.2);
  assert.equal(perro.fuente, 'Fuente A');
  assert.equal(perro.url, 'https://a.example/x');
  assert.equal(r.precauciones.length, 1);
});

test('dosis verificadas: "hasta X" no inventa un mínimo y un valor único se marca como tal', () => {
  const loro = R.dosisVerificadas(FARMACO, 'ave', 2, 10).filas[0];
  assert.equal(loro.min, null);
  assert.equal(loro.mgMin, null);
  assert.equal(loro.mgMax, 8);
  const lagarto = R.dosisVerificadas(FARMACO, 'reptil', 1, 10).filas[0];
  assert.equal(lagarto.mismoValor, true);
});

test('dosis verificadas: sin referencia para ese grupo no devuelve ningún número', () => {
  const r = R.dosisVerificadas(FARMACO, 'pediatrico', 5, 10);
  assert.equal(r.ok, true);
  assert.equal(r.sinDatos, true);
  assert.equal(r.filas.length, 0);
});

test('dosis verificadas: avisa del volumen muy pequeño y valida peso y concentración', () => {
  const chico = R.dosisVerificadas(FARMACO, 'ave', 0.03, 100).filas[0];
  assert.equal(chico.volumenPequeno, true);
  assert.notEqual(C.fmt(chico.mlMax), '0.00');
  assert.match(R.dosisVerificadas(FARMACO, 'ave', 0, 10).error, /peso/i);
  assert.match(R.dosisVerificadas(FARMACO, 'ave', 5, 0).error, /concentración/i);
  assert.match(R.dosisVerificadas(FARMACO, 'ave', 5, NaN).error, /concentración/i);
  assert.match(R.dosisVerificadas(null, 'ave', 5, 10).error, /medicamento/i);
});

test('datos de dosis: todo rango trae fuente con enlace, sin números inventados ni vacíos', () => {
  const ids = Object.keys(ZD.FARMACOS);
  assert.ok(ids.length >= 35);
  let total = 0;
  for (const id of ids) {
    const f = ZD.FARMACOS[id];
    assert.ok(f.nombre && f.categoria in ZD.CATEGORIAS, id);
    for (const e of f.entradas) {
      total++;
      assert.ok(e.grupo in ZD.GRUPOS, id + ' grupo');
      assert.ok(Number.isFinite(e.max) && e.max > 0, id + ' max');
      assert.ok(e.min === null || (Number.isFinite(e.min) && e.min > 0 && e.min <= e.max), id + ' min');
      assert.ok(e.url.startsWith('https://'), id + ' sin enlace');
      assert.ok(e.fuente && e.aplica, id + ' sin fuente o a quién aplica');
    }
    for (const p of f.precauciones) assert.ok(p.url.startsWith('https://'), id + ' precaución sin enlace');
  }
  assert.ok(total >= 120, 'entradas verificadas: ' + total);
  // los valores que NO se pudieron verificar no deben volver a aparecer
  assert.equal(ZD.FARMACOS.ceftriaxona.entradas.length, 0);
  assert.equal(ZD.FARMACOS.hidrocortisona.entradas.length, 0);
});

const ZP = require('../assets/js/herramientas-protocolos.js');
const ZC = require('../assets/js/herramientas-constantes.js');
const ZH = require('../assets/js/herramientas-hemograma.js');

test('anestesia: mg totales siempre; ml solo si el usuario escribe la concentración', () => {
  const v = { especie: 'X', componentes: [
    { nombre: 'A', min: 3, max: 3, via: 'IM', f: { fuente: 'F', url: 'https://f.example' } },
    { nombre: 'B', min: 0.05, max: 0.1, via: 'IM', f: { fuente: 'F', url: 'https://f.example' } }] };
  const sin = R.anestesia(v, 20, null);
  cerca(sin.filas[0].mgMax, 60); assert.equal(sin.filas[0].mlMax, null);
  cerca(sin.filas[1].mgMin, 1); cerca(sin.filas[1].mgMax, 2);
  const con = R.anestesia(v, 20, [100, 1]);
  cerca(con.filas[0].mlMax, 0.6); cerca(con.filas[1].mlMin, 1); cerca(con.filas[1].mlMax, 2);
  assert.ok(R.anestesia(v, 0, null).error);
  assert.ok(R.anestesia(null, 10, null).error);
});

test('protocolos: cada dosis trae fuente con enlace y ninguna concentración supuesta', () => {
  const ids = Object.keys(ZP.PROTOCOLOS);
  assert.ok(ids.length >= 5);
  for (const id of ids) {
    const p = ZP.PROTOCOLOS[id];
    assert.ok(p.variantes.length >= 1 && p.reversion && p.reversionFuente.url.startsWith('https://'), id);
    for (const v of p.variantes) for (const c of v.componentes) {
      assert.ok(c.min > 0 && c.max >= c.min, id + ' ' + c.nombre);
      assert.ok(c.f && c.f.url.startsWith('https://') && c.f.fuente, id + ' ' + c.nombre + ' sin fuente');
      assert.ok(!('conc' in c), id + ' no debe traer una concentración supuesta');
    }
  }
  // la dosis de ketamina de carnívoros (5 mg/kg) no tiene respaldo: lo publicado es 2.5 a 3.3
  const ktm = ZP.PROTOCOLOS.ktm.variantes.flatMap(v => v.componentes).filter(c => c.nombre === 'Ketamina').map(c => c.max);
  assert.ok(ktm.every(x => x <= 3.5));
});

test('fluidos: mantenimiento por especie (perro 60, gato 40, aves 50, reptiles 20 ml/kg/día) y gotas por minuto', () => {
  const perro = R.fluidos({ grupo: 'perro', peso: 10, tipo: 'normal', perdidas: 0, equipo: 20 });
  assert.equal(perro.mantenimiento, 600);
  cerca(perro.fases[0].mlPorHora, 25, 1e-9);
  cerca(perro.fases[0].gotasMin, 25 * 20 / 60, 1e-9);
  assert.equal(R.fluidos({ grupo: 'gato', peso: 4, tipo: 'normal', equipo: 20 }).mantenimiento, 160);
  assert.equal(R.fluidos({ grupo: 'aves', peso: 1, tipo: 'normal', equipo: 20 }).mantenimiento, 50);
  assert.equal(R.fluidos({ grupo: 'reptiles', peso: 5, tipo: 'normal', equipo: 20 }).mantenimiento, 100);
  assert.ok(R.fluidos({ grupo: 'mamiferos', peso: 5, tipo: 'normal' }).error, 'ya no hay "mamíferos" genérico');
});

test('fluidos: deshidratación = peso × % × 1000 ml, en 24 h o en 12 h, sin el reparto 8 h + 16 h sin fuente', () => {
  const r = R.fluidos({ grupo: 'perro', peso: 10, tipo: 'desh', deshPct: 8, perdidas: 0, equipo: 20 });
  const deficit = 800;
  assert.equal(r.fases.length, 2);
  cerca(r.fases[0].ml, deficit + 600, 1e-6);
  assert.equal(r.fases[0].horas, 24);
  assert.equal(r.fases[1].horas, 12);
  assert.equal(r.fases[1].alternativa, true);
  cerca(r.fases[1].ml, deficit + 300, 1e-6);
  cerca(r.total, deficit + 600, 1e-6);
  assert.ok(R.fluidos({ grupo: 'perro', peso: 10, tipo: 'desh', deshPct: NaN }).error);
  assert.ok(R.fluidos({ grupo: 'perro', peso: 10, tipo: 'gastro', deshPct: 0 }).error);
});

test('fluidos: bolo de shock perro 15-20, gato 5-10, aves 10 ml/kg; reptiles sin dato', () => {
  const perro = R.fluidos({ grupo: 'perro', peso: 10, tipo: 'shock', equipo: 20 });
  assert.equal(perro.fases[0].ml, 150); assert.equal(perro.fases[0].mlMax, 200);
  cerca(perro.fases[0].mlPorHora, 600); cerca(perro.fases[0].mlPorHoraMax, 800);
  const gato = R.fluidos({ grupo: 'gato', peso: 4, tipo: 'shock', equipo: 20 });
  assert.equal(gato.fases[0].ml, 20); assert.equal(gato.fases[0].mlMax, 40);
  assert.equal(R.fluidos({ grupo: 'aves', peso: 1, tipo: 'shock', equipo: 20 }).fases[0].ml, 10);
  assert.match(R.fluidos({ grupo: 'reptiles', peso: 2, tipo: 'shock' }).error, /No hay un bolo/);
});

test('fluidos: cirugía solo da la velocidad inicial (perro 5, gato 3-5 ml/kg/h), sin horas inventadas', () => {
  const perro = R.fluidos({ grupo: 'perro', peso: 10, tipo: 'cirugia', equipo: 20 });
  assert.equal(perro.fases.length, 1);
  assert.equal(perro.fases[0].mlPorHora, 50);
  const gato = R.fluidos({ grupo: 'gato', peso: 4, tipo: 'cirugia', equipo: 20 });
  cerca(gato.fases[0].mlPorHora, 12); cerca(gato.fases[0].mlPorHoraMax, 20);
  assert.ok(R.fluidos({ grupo: 'aves', peso: 1, tipo: 'cirugia' }).error);
});

test('fluidos: Parkland 4 ml × kg × %, la mitad en 8 h y la otra en 16 h; pérdidas negativas se rechazan', () => {
  const r = R.fluidos({ grupo: 'perro', peso: 10, tipo: 'quemado', quemadoPct: 20, perdidas: 0, equipo: 20 });
  assert.equal(r.fases.length, 2);
  cerca(r.fases[0].ml, 400); cerca(r.fases[1].ml, 400);
  assert.equal(r.fases[0].horas, 8); assert.equal(r.fases[1].horas, 16);
  assert.ok(R.fluidos({ grupo: 'perro', peso: 10, tipo: 'quemado', quemadoPct: 0 }).error);
  assert.ok(R.fluidos({ grupo: 'perro', peso: 10, tipo: 'quemado', quemadoPct: 150 }).error);
  assert.ok(R.fluidos({ grupo: 'perro', peso: 10, tipo: 'normal', perdidas: -5 }).error);
});

test('BCS: solo la equivalencia en grasa de la fuente (10 a 15 % por punto sobre 5); sin peso ideal inventado', () => {
  const r = C.bcs(7);
  assert.equal(r.puntosSobre5, 2);
  assert.equal(r.grasaExtraMin, 20); assert.equal(r.grasaExtraMax, 30);
  assert.equal(C.bcs(5).grasaExtraMin, null);
  assert.equal(C.bcs(3).grasaExtraMin, null);
  assert.ok(!('pesoIdeal' in r));
  assert.ok(C.bcs(0).error); assert.ok(C.bcs(10).error); assert.ok(C.bcs(5.5).error);
});

test('urgencias: unidades y cifras con respaldo (perro, 10 kg)', () => {
  const tipos = ['rcp', 'shock', 'convulsion', 'hipotermia', 'hipertermia', 'anafilaxia', 'envenenamiento', 'hemorragia'];
  for (const t of tipos) {
    const r = R.urgencia(t, 10, 'perro');
    assert.ok(r.ok, t);
    assert.ok(!/NaN|undefined|Infinity/.test(sinEtiquetas(r.steps.join(' '))), t);
  }
  const rcp = sinEtiquetas(R.urgencia('rcp', 10, 'perro').steps.join(' '));
  assert.match(rcp, /0\.1 mg \(0\.01 mg\/kg\)/);
  assert.match(rcp, /0\.4 mg \(0\.04 mg\/kg\)/);
  assert.match(rcp, /100 a 120 por minuto/);
  assert.match(rcp, /2 J\/kg y después 4 J\/kg/);
  assert.match(rcp, /se duplica la dosis/);
  assert.doesNotMatch(rcp, /15:2|2-3 veces/);

  const shock = sinEtiquetas(R.urgencia('shock', 10, 'perro').steps.join(' '));
  assert.match(shock, /150 a 200 ml \(15 a 20 ml\/kg\)/);
  assert.match(sinEtiquetas(R.urgencia('shock', 4, 'gato').steps.join(' ')), /20 a 40 ml \(5 a 10 ml\/kg\)/);
  assert.match(sinEtiquetas(R.urgencia('shock', 1, 'aves').steps.join(' ')), /10 ml \(10 ml\/kg\)/);
  assert.match(sinEtiquetas(R.urgencia('shock', 2, 'reptiles').steps.join(' ')), /no hay un bolo verificado para reptiles/);
  assert.doesNotMatch(shock, /ceftriaxona/);
  assert.match(shock, /diluida 1:3/);

  const conv = sinEtiquetas(R.urgencia('convulsion', 10, 'perro').steps.join(' '));
  assert.match(conv, /5 a 10 mg \(0\.5 a 1 mg\/kg\)/);
  assert.match(conv, /2 mg \(0\.2 mg\/kg\)/);
  assert.match(conv, /10 a 40 mg \(1 a 4 mg\/kg\)/);
  assert.match(conv, /600 mg \(60 mg\/kg\)/);

  const anaf = sinEtiquetas(R.urgencia('anafilaxia', 10, 'perro').steps.join(' '));
  assert.match(anaf, /1 a 2 mg \(0\.1 a 0\.2 mg\/kg\)/);
  assert.match(anaf, /10 a 20 mg \(1 a 2 mg\/kg\)/);

  const calor = sinEtiquetas(R.urgencia('hipertermia', 10, 'perro').steps.join(' '));
  assert.match(calor, /No uses corticoides/);
  assert.match(calor, /39\.4 °C/);
  assert.doesNotMatch(calor, /alcohol isoprop|dexametasona/i);

  const env = sinEtiquetas(R.urgencia('envenenamiento', 10, 'perro').steps.join(' '));
  assert.match(env, /10 a 20 g \(1 a 2 g\/kg\)/);
});

test('urgencias: sin peso muestra dosis por kilo; aves y reptiles no calculan totales de fármacos', () => {
  const sinPeso = R.urgencia('rcp', NaN, 'perro');
  assert.ok(sinPeso.avisos.length >= 1);
  assert.match(sinEtiquetas(sinPeso.steps.join(' ')), /0\.01 mg\/kg/);
  const ave = R.urgencia('convulsion', 1, 'aves');
  assert.ok(ave.avisos.some(a => /perro y gato/.test(a)));
  assert.doesNotMatch(sinEtiquetas(ave.steps.join(' ')), /\d mg \(\d/);
  assert.ok(R.urgencia('nada', 5, 'perro').error);
});

test('urgencias: no queda ninguna cifra que la revisión no pudo respaldar', () => {
  const todo = ['rcp', 'shock', 'convulsion', 'hipotermia', 'hipertermia', 'anafilaxia', 'envenenamiento', 'hemorragia']
    .map(t => sinEtiquetas(R.urgencia(t, 10, 'perro').steps.join(' '))).join(' ');
  for (const sinRespaldo of ['café', 'ceftriaxona', 'terbutalina', 'vitamina K1', '15:2', 'lactato', 'hetastarch 100']) {
    assert.ok(!todo.includes(sinRespaldo), sinRespaldo + ' no tiene respaldo');
  }
});

test('constantes: cada dato trae su fuente con enlace y no se inventa nada donde no hubo', () => {
  assert.equal(ZC.ESPECIES.length, 50);
  let n = 0;
  for (const e of ZC.ESPECIES) for (const d of e.datos) {
    n++;
    assert.ok(d.campo && d.valor && d.fuente, e.esp + ' ' + d.campo);
    assert.ok(d.url.startsWith('http'), e.esp + ' ' + d.campo + ' sin enlace');
  }
  assert.ok(n > 80, 'datos verificados: ' + n);
  const jaguar = ZC.ESPECIES.find(e => /^Jaguar \(/.test(e.esp));
  assert.ok(jaguar.datos.every(d => !/^60-90/.test(d.valor)));
  assert.ok(jaguar.datos.some(d => d.nota && /anestesia/.test(d.nota)), 'los valores bajo anestesia se indican');
});

test('hemograma: solo valores con fuente enlazada; lo no encontrado se declara aparte', () => {
  assert.ok(ZH.ESPECIES.length >= 15, 'especies con dato: ' + ZH.ESPECIES.length);
  const nombres = new Set();
  let n = 0;
  for (const e of ZH.ESPECIES) {
    assert.ok(!nombres.has(e.esp), 'especie repetida: ' + e.esp);
    nombres.add(e.esp);
    assert.ok(e.datos.length >= 1, e.esp);
    for (const d of e.datos) {
      n++;
      assert.ok(d.campo && d.valor && d.fuente, e.esp + ' ' + d.campo);
      assert.match(d.url, /^https:\/\//, e.esp + ' ' + d.campo + ' sin enlace');
      assert.ok(['verificado', 'estudio'].includes(d.estado), e.esp + ' ' + d.campo);
      assert.doesNotMatch(d.valor, /undefined|NaN/);
    }
  }
  assert.ok(n >= 90, 'datos con fuente: ' + n);
  for (const sin of ZH.SIN_DATO) assert.ok(!nombres.has(sin), sin + ' no puede estar en ambas listas');
  // los rangos viejos sin respaldo no deben volver (gato: Hb 8-15, glucosa 70-150, creatinina 0.8-1.8)
  const gato = ZH.ESPECIES.find(e => /^Gato/.test(e.esp));
  const val = c => gato.datos.find(d => d.campo === c).valor;
  assert.match(val('Hemoglobina'), /9\.8-15\.4/);
  assert.match(val('Glucosa'), /60-120/);
  assert.match(val('Creatinina'), /0\.9-2\.2/);
  // las aves no llevan creatinina
  for (const e of ZH.ESPECIES.filter(x => x.clase === 'Aves')) assert.ok(!e.datos.some(d => d.campo === 'Creatinina'), e.esp);
});

test('hemograma (retirado): ninguna página carga el módulo ni lo muestra', () => {
  assert.doesNotMatch(PAGINA, /herramientas-hemograma\.js/);
  assert.doesNotMatch(PAGINA, /ZOO_HEMOGRAMA|hemoGrid|hemoFilter|panel-hemograma|data-tab="hemograma"/);
});

test('esc y sinAcentos', () => {
  assert.equal(C.esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(C.sinAcentos('  Ñandú Águila '), 'nandu aguila');
});

test('la página usa el módulo común: solo Constantes y BCS, sin las cuentas retiradas', () => {
  assert.match(PAGINA, /herramientas-calculos\.js\?v=\w+/);
  assert.match(PAGINA, /const C = ZOO_CALCULOS;[\s\S]*C\.sinAcentos/);
  assert.match(PAGINA, /Material de referencia para profesionales/);
  // la página no carga el módulo de cálculos retirados ni los datos de las pestañas retiradas
  for (const f of ['herramientas-clinica-retirada', 'herramientas-dosis', 'herramientas-protocolos', 'herramientas-hemograma']) {
    assert.ok(!PAGINA.includes(f), 'la página no debe cargar ' + f);
  }
  // los conteos salen de los datos de constantes
  assert.match(PAGINA, /id":"statEspecies"/);
  assert.match(PAGINA, /CONSTANTES\.reduce\(/);
  assert.doesNotMatch(PAGINA, /const DROGAS\b|Object\.keys\(DOSIS\)/);
});
