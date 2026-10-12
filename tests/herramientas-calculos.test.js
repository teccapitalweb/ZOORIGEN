'use strict';
// Herramientas clínicas: dosis, anestesia, fluidos, BCS y urgencias (unidades y cuentas)
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/herramientas-calculos.js');

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

test('dosis: mg, ml y máximo con las unidades correctas', () => {
  const info = { nombre: 'X', dosisRef: { mamifero: [5, 15], reptil: [0, 0] }, max: 25 };
  const r = C.dosis(info, 'mamifero', 10, 100);
  assert.equal(r.mgMin, 50); assert.equal(r.mgMax, 150);
  cerca(r.mlMin, 0.5); cerca(r.mlMax, 1.5);
  assert.equal(r.maximoMg, 250);
  assert.equal(r.superaMaximo, false);
  assert.equal(r.volumenPequeno, false);
});

test('dosis: avisa si el extremo alto pasa el máximo y si el volumen es muy pequeño', () => {
  const sobre = C.dosis({ nombre: 'X', dosisRef: { ave: [10, 30] }, max: 20 }, 'ave', 1, 10);
  assert.equal(sobre.superaMaximo, true);
  const chico = C.dosis({ nombre: 'X', dosisRef: { ave: [1, 2] }, max: 20 }, 'ave', 0.03, 100);
  assert.equal(chico.volumenPequeno, true);
  assert.notEqual(C.fmt(chico.mlMax), '0.00');
});

test('dosis: grupo no recomendado, peso y concentración inválidos', () => {
  const info = { nombre: 'Ivermectina', dosisRef: { reptil: [0, 0] }, max: 1 };
  assert.match(C.dosis(info, 'reptil', 5, 10).error, /NO está recomendado/);
  assert.match(C.dosis({ nombre: 'X', dosisRef: { ave: [1, 2] }, max: 3 }, 'ave', 0, 10).error, /peso/i);
  assert.match(C.dosis({ nombre: 'X', dosisRef: { ave: [1, 2] }, max: 3 }, 'ave', 5, 0).error, /concentración/i);
  assert.match(C.dosis({ nombre: 'X', dosisRef: { ave: [1, 2] }, max: 3 }, 'ave', 5, NaN).error, /concentración/i);
});

test('anestesia: calcula mg y ml; los gases no se calculan por peso', () => {
  const r = C.anestesia({ componentes: [
    { nombre: 'Ketamina', dosis: 5, conc: 100, via: 'IM' },
    { nombre: 'Medetomidina', dosis: 0.05, conc: 1, via: 'IM' },
    { nombre: 'Inducción', dosis: 5, conc: 0, via: '% vaporizador' }
  ] }, 20);
  cerca(r.filas[0].mg, 100); cerca(r.filas[0].ml, 1);
  cerca(r.filas[1].mg, 1); cerca(r.filas[1].ml, 1);
  assert.equal(r.filas[2].calculada, false);
  assert.equal(r.filas[2].texto, 5);
  assert.ok(C.anestesia({ componentes: [] }, 0).error);
});

test('anestesia: todos los protocolos de la página tienen dosis y concentración utilizables', () => {
  const m = PAGINA.match(/const PROTOCOLOS = (\{[\s\S]*?\n\});/);
  assert.ok(m, 'no se encontró PROTOCOLOS');
  const PROT = new Function('return ' + m[1])();
  const ids = Object.keys(PROT);
  assert.ok(ids.length >= 10);
  for (const id of ids) {
    const r = C.anestesia(PROT[id], 12);
    assert.ok(r.ok, id);
    for (const f of r.filas) {
      if (f.calculada) assert.ok(f.mg > 0 && f.ml > 0 && Number.isFinite(f.ml), id + ' ' + f.nombre);
    }
  }
});

test('fluidos: mantenimiento normal 50 ml/kg/día y gotas por minuto', () => {
  const r = C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'normal', perdidas: 0, equipo: 20 });
  assert.equal(r.mantenimiento, 500);
  assert.equal(r.fases.length, 1);
  cerca(r.fases[0].mlPorHora, 500 / 24, 1e-9);
  cerca(r.fases[0].gotasMin, (500 / 24) * 20 / 60, 1e-9);
});

test('fluidos: reptiles usan 20 ml/kg/día y aves 50', () => {
  assert.equal(C.fluidos({ grupo: 'reptiles', peso: 5, tipo: 'normal', equipo: 60 }).mantenimiento, 100);
  assert.equal(C.fluidos({ grupo: 'aves', peso: 1, tipo: 'normal', equipo: 60 }).mantenimiento, 50);
});

test('fluidos: deshidratación 8 h + 16 h, el total coincide con déficit + mantenimiento', () => {
  const r = C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'desh', deshPct: 8, perdidas: 0, equipo: 20 });
  const deficit = 10 * 1000 * 0.08;     // 800 ml
  assert.equal(r.fases.length, 2);
  assert.equal(r.fases[0].horas, 8);
  assert.equal(r.fases[1].horas, 16);
  cerca(r.fases[0].ml, deficit / 2 + 500 * 8 / 24, 1e-6);
  cerca(r.fases[1].ml, deficit / 2 + 500 * 16 / 24, 1e-6);
  cerca(r.total, deficit + 500, 1e-6);
  assert.ok(r.fases[0].mlPorHora > r.fases[1].mlPorHora, 'las primeras 8 h van más rápido');
});

test('fluidos: deshidratación exige el porcentaje', () => {
  assert.ok(C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'desh', deshPct: NaN }).error);
  assert.ok(C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'gastro', deshPct: 0 }).error);
});

test('fluidos: shock = bolo en 15 min y después mantenimiento (no suma el bolo a 24 h)', () => {
  const r = C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'shock', perdidas: 0, equipo: 20 });
  assert.equal(r.fases[0].ml, 200);
  assert.equal(r.fases[0].horas, 0.25);
  cerca(r.fases[0].mlPorHora, 800);                 // 200 ml en 15 min = 800 ml/h
  cerca(r.fases[1].mlPorHora, 500 / 24, 1e-9);
  assert.equal(C.fluidos({ grupo: 'aves', peso: 1, tipo: 'shock', equipo: 20 }).fases[0].ml, 10);
  assert.equal(C.fluidos({ grupo: 'reptiles', peso: 2, tipo: 'shock', equipo: 20 }).fases[0].ml, 10);
});

test('fluidos: cirugía es 5 ml/kg/h × 3 h, separada del mantenimiento diario', () => {
  const r = C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'cirugia', perdidas: 0, equipo: 20 });
  assert.equal(r.fases.length, 1);
  assert.equal(r.fases[0].mlPorHora, 50);
  assert.equal(r.fases[0].ml, 150);
  assert.equal(r.total, 150);
});

test('fluidos: quemadura con Parkland y pérdidas negativas rechazadas', () => {
  const r = C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'quemado', quemadoPct: 20, perdidas: 0, equipo: 20 });
  assert.equal(r.fases.length, 2);
  cerca(r.fases[0].ml + r.fases[1].ml, 4 * 10 * 20 + 500, 1e-6);
  assert.ok(C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'quemado', quemadoPct: 0 }).error);
  assert.ok(C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'quemado', quemadoPct: 150 }).error);
  assert.ok(C.fluidos({ grupo: 'mamiferos', peso: 10, tipo: 'normal', perdidas: -5 }).error);
});

test('BCS: cada punto vale ~10% del peso; 5 es el ideal', () => {
  cerca(C.bcs(10, 5).pesoIdeal, 10);
  cerca(C.bcs(12, 7).pesoIdeal, 10, 1e-9);        // BCS 7 → 20% de más
  cerca(C.bcs(8, 3).pesoIdeal, 10, 1e-9);         // BCS 3 → 20% de menos
  assert.ok(C.bcs(12, 7).diferencia < 0, 'tiene que bajar');
  assert.ok(C.bcs(8, 3).diferencia > 0, 'tiene que subir');
  assert.ok(C.bcs(10, 0).error);
  assert.ok(C.bcs(10, 10).error);
  assert.ok(C.bcs(0, 5).error);
});

test('urgencias: unidades correctas en todos los protocolos (mamíferos, 10 kg)', () => {
  const tipos = ['rcp', 'shock', 'convulsion', 'hipotermia', 'hipertermia', 'anafilaxia', 'envenenamiento', 'hemorragia'];
  for (const t of tipos) {
    const r = C.urgencia(t, 10, 'mamiferos');
    assert.ok(r.ok, t);
    const texto = sinEtiquetas(r.steps.join(' '));
    assert.ok(!/NaN|undefined|Infinity/.test(texto), t);
  }
  const rcp = sinEtiquetas(C.urgencia('rcp', 10, 'mamiferos').steps.join(' '));
  assert.match(rcp, /0\.1 mg = 0\.1 ml de 1 mg\/ml \(0\.01 mg\/kg\)/);         // epinefrina 0.01 mg/kg
  assert.match(rcp, /0\.4 mg \(0\.04 mg\/kg\)/);                               // atropina
  assert.match(rcp, /100 ml \(10 ml\/kg\)/);                                   // volumen corriente

  const shock = sinEtiquetas(C.urgencia('shock', 10, 'mamiferos').steps.join(' '));
  assert.match(shock, /200 ml \(20 ml\/kg\)/);                                  // bolo cristaloide
  assert.match(shock, /100 ml \(10 ml\/kg\)/);                                  // hetastarch

  const conv = sinEtiquetas(C.urgencia('convulsion', 10, 'mamiferos').steps.join(' '));
  assert.match(conv, /5 mg = 1 ml de 5 mg\/ml \(0\.5 mg\/kg\)/);               // diazepam
  assert.match(conv, /2 mg \(0\.2 mg\/kg\)/);                                  // midazolam
  assert.match(conv, /20 mg \(2 mg\/kg\)/);                                    // propofol bolo

  const anaf = sinEtiquetas(C.urgencia('anafilaxia', 10, 'mamiferos').steps.join(' '));
  assert.match(anaf, /2\.5 mg \(0\.25 mg\/kg\)/);                              // dexametasona
  assert.match(anaf, /20 mg \(2 mg\/kg\)/);                                    // difenhidramina

  const env = sinEtiquetas(C.urgencia('envenenamiento', 10, 'mamiferos').steps.join(' '));
  assert.match(env, /\(con 2 g\/kg: 20 g\)/);                                  // carbón 2 g/kg
});

test('urgencias: sin peso muestra dosis por kilo; aves y reptiles no calculan totales de fármacos', () => {
  const sinPeso = C.urgencia('rcp', NaN, 'mamiferos');
  assert.ok(sinPeso.avisos.length >= 1);
  assert.match(sinEtiquetas(sinPeso.steps.join(' ')), /0\.01 mg\/kg/);
  const ave = C.urgencia('shock', 1, 'aves');
  const t = sinEtiquetas(ave.steps.join(' '));
  assert.match(t, /10 ml \(10 ml\/kg\)/);                                      // bolo reducido a la mitad
  assert.ok(!/20 ml\/kg/.test(t), 'no usa el bolo de mamífero en un ave');
  assert.ok(ave.avisos.some(a => /perro y gato/.test(a)));
  const rep = sinEtiquetas(C.urgencia('shock', 2, 'reptiles').steps.join(' '));
  assert.match(rep, /5 ml\/kg/);
  assert.ok(!/ceftriaxona <strong/.test(C.urgencia('shock', 2, 'reptiles').steps.join(' ')));
  assert.ok(C.urgencia('nada', 5, 'mamiferos').error);
});

test('urgencias: se quitó la recomendación peligrosa de café/alcohol', () => {
  for (const t of ['hipotermia']) {
    const texto = sinEtiquetas(C.urgencia(t, 10, 'mamiferos').steps.join(' ')).toLowerCase();
    assert.ok(!/café|cafe|alcohol/.test(texto.replace('alcohol isopropílico', '')), t);
  }
});

test('esc y sinAcentos', () => {
  assert.equal(C.esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(C.sinAcentos('  Ñandú Águila '), 'nandu aguila');
});

test('la página usa el módulo y ya no tiene las cuentas viejas', () => {
  assert.match(PAGINA, /herramientas-calculos\.js\?v=\w+/);
  assert.match(PAGINA, /const C = ZOO_CALCULOS;[\s\S]*C\.leerNumero/);
  assert.match(PAGINA, /id="urgGrupo"/);
  assert.match(PAGINA, /Material de referencia para profesionales/);
  // los campos numéricos ya aceptan coma
  for (const id of ['dosePeso', 'doseConc', 'anesPeso', 'fluidsPeso', 'bcsPesoActual', 'urgPeso']) {
    assert.match(PAGINA, new RegExp('<input type="text" inputmode="decimal"[^>]*id="' + id + '"'));
  }
  // el viejo ajuste de BCS de ±40%
  assert.doesNotMatch(PAGINA, /Dosis máxima segura global/);
  // los conteos salen de los datos
  assert.match(PAGINA, /id="statFarmacos"/);
  assert.match(PAGINA, /Object\.keys\(DROGAS\)\.length/);
});
