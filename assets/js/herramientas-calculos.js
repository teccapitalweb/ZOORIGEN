/* ============================================================ */
/* HERRAMIENTAS CLÍNICAS · CÁLCULOS (parte pura, probada en Node) */
/* Aquí viven las cuentas de dosis, anestesia, fluidos, BCS y    */
/* los pasos de urgencia. La página solo toma los datos del      */
/* formulario y dibuja lo que esta parte devuelve.               */
/* IMPORTANTE: los rangos de dosis y los protocolos son de        */
/* referencia; este archivo NO cambia ningún valor clínico, solo  */
/* hace las cuentas y escribe las unidades correctamente.         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CALCULOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PESO_MIN = 0.001;     // kg
  var PESO_MAX = 6000;      // kg (un elefante grande)
  var CONC_MAX = 10000;     // mg/ml

  /* ───── lectura y validación ───── */
  // Acepta "12.5" y "12,5". Devuelve NaN si no es un número.
  function leerNumero(texto) {
    var s = String(texto == null ? '' : texto).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  function errorPeso(p) {
    if (!Number.isFinite(p)) return 'Escribe el peso en kilogramos (por ejemplo 12.5).';
    if (p < PESO_MIN) return 'El peso debe ser mayor a 0 kg.';
    if (p > PESO_MAX) return 'El peso parece demasiado alto (máximo ' + PESO_MAX.toLocaleString('es-MX') + ' kg). Revisa que esté en kilogramos.';
    return '';
  }

  function errorConcentracion(c) {
    if (!Number.isFinite(c) || c <= 0) return 'Escribe la concentración del frasco en mg/ml (por ejemplo 100).';
    if (c > CONC_MAX) return 'La concentración parece demasiado alta. Revisa que esté en mg/ml.';
    return '';
  }

  /* ───── formato ───── */
  // Cantidad con los decimales justos: nunca "0.00" para algo que no es cero y sin ceros sobrantes (20 en vez de 20.0).
  function fmt(x) {
    if (!Number.isFinite(x)) return '—';
    var a = Math.abs(x), t;
    if (a === 0) return '0';
    if (a >= 1000) return x.toFixed(0);
    if (a >= 1) t = x.toFixed(a >= 10 ? 1 : 2);
    else if (a >= 0.1) t = x.toFixed(2);
    else if (a >= 0.01) t = x.toFixed(3);
    else if (a >= 0.001) t = x.toFixed(4);
    else return x.toExponential(1);
    return t.indexOf('.') >= 0 ? t.replace(/0+$/, '').replace(/\.$/, '') : t;
  }

  var ETIQUETA_GRUPO = { mamifero: 'Mamífero', ave: 'Ave', reptil: 'Reptil', pediatrico: 'Pediátrico / geriátrico', mamiferos: 'Mamíferos', aves: 'Aves', reptiles: 'Reptiles' };
  function etiquetaGrupo(g) { return ETIQUETA_GRUPO[g] || String(g || ''); }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sinAcentos(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  /* ───── DOSIS ─────
     Solo trabaja con rangos que tienen fuente (assets/js/herramientas-dosis.js). Para el fármaco y el grupo elegidos
     devuelve UNA fila por cada referencia verificada: la fuente puede dar un rango para perro, otro para gato, etc. */
  // farmaco: { nombre, entradas:[{grupo, aplica, min, max, via, fuente, url}], precauciones:[...] }
  function dosisVerificadas(farmaco, grupo, peso, conc) {
    var ep = errorPeso(peso); if (ep) return { error: ep };
    var ec = errorConcentracion(conc); if (ec) return { error: ec };
    if (!farmaco) return { error: 'Selecciona un medicamento.' };
    var filas = (farmaco.entradas || []).filter(function (e) { return e.grupo === grupo && Number.isFinite(e.max) && e.max > 0; }).map(function (e) {
      var min = Number.isFinite(e.min) ? e.min : null;
      var mgMax = peso * e.max, mgMin = min == null ? null : peso * min;
      return {
        aplica: e.aplica || '', via: e.via || '', fuente: e.fuente || '', url: e.url || '',
        min: min, max: e.max, mismoValor: min != null && min === e.max,
        mgMin: mgMin, mgMax: mgMax,
        mlMin: mgMin == null ? null : mgMin / conc, mlMax: mgMax / conc,
        volumenPequeno: (mgMax / conc) < 0.1
      };
    });
    return {
      ok: true, sinDatos: filas.length === 0, filas: filas,
      precauciones: farmaco.precauciones || [], nombre: farmaco.nombre || '', grupo: grupo
    };
  }

  /* ───── ANESTESIA ───── */
  // protocolo: { componentes:[{nombre,dosis,conc,via}] } · devuelve filas con mg y ml
  function anestesia(protocolo, peso) {
    var ep = errorPeso(peso); if (ep) return { error: ep };
    var filas = (protocolo.componentes || []).map(function (c) {
      if (c.conc > 0) {
        var mg = peso * c.dosis, ml = mg / c.conc;
        return { nombre: c.nombre, via: c.via, dosisPorKg: c.dosis, conc: c.conc, mg: mg, ml: ml, volumenPequeno: ml < 0.1, calculada: true };
      }
      return { nombre: c.nombre, via: c.via, texto: c.dosis, calculada: false };
    });
    return { ok: true, filas: filas };
  }

  /* ───── FLUIDOTERAPIA ───── */
  var MANTENIMIENTO = { mamiferos: 50, aves: 50, reptiles: 20 };   // ml/kg/día
  var BOLO_SHOCK = { mamiferos: 20, aves: 10, reptiles: 5 };       // ml/kg

  // entrada: { grupo, peso, tipo, deshPct, perdidas, quemadoPct, equipo }
  // salida: { ok, titulo, fases:[{titulo, horas, ml, mlPorHora, gotasMin, segPorGota}], filas:[{etiqueta, valor}], nota, modo }
  function fluidos(e) {
    var ep = errorPeso(e.peso); if (ep) return { error: ep };
    var grupo = MANTENIMIENTO[e.grupo] ? e.grupo : 'mamiferos';
    var perdidas = Number.isFinite(e.perdidas) ? e.perdidas : 0;
    if (perdidas < 0) return { error: 'Las pérdidas extra no pueden ser negativas.' };
    if (perdidas > 100000) return { error: 'Las pérdidas extra parecen demasiado altas. Revisa que estén en ml por día.' };
    var equipo = Number.isFinite(e.equipo) && e.equipo > 0 ? e.equipo : 20;
    var peso = e.peso;
    var factor = MANTENIMIENTO[grupo];
    var mant = peso * factor;
    var fases = [], filas = [], titulo = '', nota = '', modo = 'mant';

    var fase = function (t, horas, ml) {
      var porHora = horas > 0 ? ml / horas : 0, gotas = (porHora * equipo) / 60;
      fases.push({ titulo: t, horas: horas, ml: ml, mlPorHora: porHora, gotasMin: gotas, segPorGota: gotas > 0 ? 60 / gotas : 0 });
    };

    if (e.tipo === 'desh' || e.tipo === 'gastro') {
      var pct = e.deshPct;
      if (!Number.isFinite(pct) || pct <= 0 || pct > 20) return { error: 'Elige el porcentaje de deshidratación.' };
      var deficit = peso * 1000 * (pct / 100);
      var base = mant + perdidas;
      titulo = 'Deshidratación ' + pct + '% (' + (e.tipo === 'gastro' ? 'vómito/diarrea' : 'pérdidas') + ')';
      filas.push({ etiqueta: 'Déficit a reponer (' + pct + '% del peso)', valor: fmt(deficit) + ' ml' });
      fase('Primeras 8 h (la mitad del déficit + su parte del mantenimiento)', 8, deficit / 2 + base * 8 / 24);
      fase('Siguientes 16 h (la otra mitad + su parte del mantenimiento)', 16, deficit / 2 + base * 16 / 24);
      nota = 'Reponer la mitad del déficit en las primeras 8 h y el resto en las siguientes 16 h. Reevaluar la hidratación cada 4-6 h (turgor, mucosas, peso). Si hay vómito o diarrea, considerar coloides y suplemento de potasio según el caso.';
    } else if (e.tipo === 'shock') {
      var bolo = peso * BOLO_SHOCK[grupo];
      titulo = 'Shock hipovolémico';
      modo = 'shock';
      filas.push({ etiqueta: 'BOLO inicial (' + BOLO_SHOCK[grupo] + ' ml/kg)', valor: fmt(bolo) + ' ml en 15-20 min', alerta: true });
      fase('Bolo inicial (15 min)', 0.25, bolo);
      fase('Después del bolo: mantenimiento (24 h)', 24, mant + perdidas);
      nota = 'Dar el bolo en 15-20 min, reevaluar y repetir hasta 3 bolos si persiste el shock. Después, mantenimiento con cristaloides. Si no responde, valorar coloides y soporte vasopresor con el médico veterinario responsable.';
    } else if (e.tipo === 'cirugia') {
      titulo = 'Intraoperatorio';
      modo = 'cirugia';
      filas.push({ etiqueta: 'Velocidad usada (5 ml/kg/h; el rango habitual es 5-10)', valor: fmt(peso * 5) + ' ml/h' });
      filas.push({ etiqueta: 'Mantenimiento fuera de cirugía (' + factor + ' ml/kg/día)', valor: fmt(mant) + ' ml/día' });
      fase('Durante la cirugía (3 h estimadas)', 3, peso * 5 * 3);
      nota = 'Velocidad 5-10 ml/kg/h durante la cirugía (aquí se calcula con 5 ml/kg/h y 3 h; ajusta a la duración real). Ringer lactato de elección. Reducir a 2-3 ml/kg/h si la cirugía pasa de 3 h. Vigilar presión arterial media, temperatura y diuresis.';
    } else if (e.tipo === 'quemado') {
      var q = e.quemadoPct;
      if (!Number.isFinite(q) || q <= 0) return { error: 'Escribe el % de superficie corporal quemada.' };
      if (q > 100) return { error: 'La superficie quemada no puede pasar de 100%.' };
      var parkland = 4 * peso * q;
      titulo = 'Quemado ' + q + '% de superficie (fórmula Parkland)';
      modo = 'quemado';
      filas.push({ etiqueta: 'Parkland (4 ml × kg × %)', valor: fmt(parkland) + ' ml en 24 h' });
      fase('Primeras 8 h desde la quemadura (la mitad de Parkland + mantenimiento)', 8, parkland / 2 + (mant + perdidas) * 8 / 24);
      fase('Siguientes 16 h (la otra mitad + mantenimiento)', 16, parkland / 2 + (mant + perdidas) * 16 / 24);
      nota = 'La mitad del volumen de Parkland en las primeras 8 h desde la quemadura y la otra mitad en las siguientes 16 h. Ringer lactato. Vigilar diuresis (más de 1 ml/kg/h) como señal de buena reposición.';
    } else {
      titulo = 'Mantenimiento normal';
      fase('Mantenimiento (24 h)', 24, mant + perdidas);
      nota = 'Ringer lactato o solución salina 0.9% a velocidad constante.';
    }

    if (modo !== 'cirugia') filas.push({ etiqueta: 'Mantenimiento (' + factor + ' ml/kg/día)', valor: fmt(mant) + ' ml/día' });
    if (perdidas > 0) filas.push({ etiqueta: 'Pérdidas extra', valor: fmt(perdidas) + ' ml/día' });
    var total = fases.reduce(function (s, f) { return s + f.ml; }, 0);
    return { ok: true, titulo: titulo, grupo: grupo, peso: peso, equipo: equipo, fases: fases, filas: filas, total: total, nota: nota, modo: modo, mantenimiento: mant };
  }

  /* ───── BCS ───── */
  // Regla habitual: cada punto de BCS por encima (o por debajo) de 5 equivale a ~10% más (o menos) de peso que el ideal.
  function bcs(peso, puntaje) {
    var ep = errorPeso(peso); if (ep) return { error: ep };
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 9) return { error: 'Selecciona un BCS del 1 al 9.' };
    var factor = puntaje > 5 ? 1 + 0.1 * (puntaje - 5) : (puntaje < 5 ? 1 - 0.1 * (5 - puntaje) : 1);
    var ideal = peso / factor;
    return { ok: true, pesoIdeal: ideal, diferencia: ideal - peso, porcentaje: (ideal / peso - 1) * 100, puntos: puntaje - 5 };
  }

  /* ───── URGENCIAS ───── */
  // grupo: mamiferos | aves | reptiles. Si no es mamífero, NO se calculan totales de fármacos (solo "por kg"),
  // porque las dosis de estos protocolos son de referencia para perro y gato. Los volúmenes de fluidos se escalan
  // con la misma regla del shock (mamíferos 20, aves 10, reptiles 5 ml/kg).
  function urgencia(tipo, peso, grupo) {
    var g = ({ mamiferos: 1, aves: 1, reptiles: 1 })[grupo] ? grupo : 'mamiferos';
    var mam = g === 'mamiferos';
    var conPeso = Number.isFinite(peso) && peso >= PESO_MIN && peso <= PESO_MAX;
    var factorFluido = g === 'aves' ? 0.5 : (g === 'reptiles' ? 0.25 : 1);
    var resaltar = function (t) { return '<strong style="color:#E8A317;">' + t + '</strong>'; };

    // Fármaco: total + (dosis por kg); sin peso o fuera de mamíferos, solo "por kg".
    var D = function (porKg, unidad, dec) {
      var por = fmt(porKg) + ' ' + unidad + '/kg';
      if (conPeso && mam) return resaltar(fmt(peso * porKg) + ' ' + unidad) + ' (' + por + ')';
      return por;
    };
    // Fármaco con volumen de la presentación: "X mg (Y ml de C mg/ml)"
    var DV = function (porKg, unidad, concMgMl) {
      var por = fmt(porKg) + ' ' + unidad + '/kg';
      if (conPeso && mam) return resaltar(fmt(peso * porKg) + ' ' + unidad + ' = ' + fmt(peso * porKg / concMgMl) + ' ml de ' + concMgMl + ' mg/ml') + ' (' + por + ')';
      return por;
    };
    // Volumen de fluido (se ajusta por grupo)
    var F = function (mlPorKgMamifero) {
      var k = mlPorKgMamifero * factorFluido;
      var por = fmt(k) + ' ml/kg';
      if (conPeso) return resaltar(fmt(peso * k) + ' ml') + ' (' + por + ')';
      return por;
    };
    var T = function (v) { return fmt(v); };

    var P = {
      rcp: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-heart-pulse"/></svg> RCP · Paro cardiorrespiratorio',
        priority: 'CRÍTICO · Iniciar en menos de 60 segundos desde la detección',
        steps: [
          '<strong>Verificar inconsciencia y ausencia de pulso</strong> (femoral/auricular). Tiempo máximo 10 segundos.',
          '<strong>Asegurar vía aérea</strong>: extender el cuello, retirar cuerpos extraños, intubar si es posible.',
          '<strong>Compresiones torácicas</strong>: 100-120 por minuto, a 1/3 del diámetro del tórax. Animal de menos de 10 kg: con la punta de los dedos sobre el corazón; más de 10 kg: con las dos manos sobre las costillas.',
          '<strong>Ventilación</strong>: 10 respiraciones por minuto con Ambú o ventilación a presión positiva. Relación compresiones:ventilaciones 30:2 si hay un reanimador y 15:2 si hay dos.' + (conPeso ? ' Volumen corriente aproximado: ' + resaltar(T(peso * 10) + ' ml') + ' (10 ml/kg).' : ' Volumen corriente aproximado: 10 ml/kg.'),
          '<strong>Acceso IV/IO</strong> inmediato (catéter 18-22G; intraóseo en fémur proximal si no hay vena).',
          '<strong>Epinefrina</strong> IV/IO cada 3-5 min: ' + DV(0.01, 'mg', 1) + ' (presentación 1:1000 = 1 mg/ml). Por vía intratraqueal, 2-3 veces la dosis.',
          '<strong>Atropina</strong> si hay bradicardia o asistolia: ' + D(0.04, 'mg') + ' IV/IO.',
          '<strong>Desfibrilación</strong> si hay fibrilación ventricular: 4-6 J/kg con monofásico o 2-4 J/kg con bifásico.',
          '<strong>Reevaluar el ritmo cada 2 minutos</strong>. Máximo 20-30 min antes de declarar el paro irreversible.',
          '<strong>Después de la RCP</strong>: oxígeno al 100%, soporte cardiovascular (fluidos + vasopresores) y monitoreo intensivo 24-72 h.'
        ]
      },
      shock: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-heart-crack"/></svg> Shock hipovolémico / séptico',
        priority: 'URGENTE · Actuar en minutos',
        steps: [
          '<strong>ABC y signos vitales</strong>: frecuencia cardiaca, presión arterial, tiempo de llenado capilar, color de mucosas, estado mental.',
          '<strong>Triage</strong>: palidez, taquicardia, pulsos débiles y llenado capilar mayor a 2 segundos indican shock descompensado.',
          '<strong>Doble acceso IV/IO</strong> con el catéter de mayor calibre posible.',
          '<strong>BOLO de cristaloides</strong> (Ringer lactato): ' + F(20) + ' en 15-20 minutos. Reevaluar y repetir hasta 3 bolos.',
          '<strong>Si no responde a 3 bolos</strong>: coloides (hetastarch ' + F(10) + ') y vasopresores.',
          '<strong>Vasopresores</strong>: dobutamina 2.5-10 μg/kg/min en infusión continua, o norepinefrina 0.05-1 μg/kg/min.',
          '<strong>Oxígeno al 100%</strong> por cánula o máscara.',
          '<strong>Si hay hipoglucemia</strong>: dextrosa al 50% diluida 1:2, ' + (conPeso && mam ? resaltar(T(peso * 0.5) + ' ml') + ' (0.5 ml/kg)' : '0.5 ml/kg') + ' IV lento.',
          '<strong>Si se sospecha sepsis</strong>: antibiótico de amplio espectro IV de inmediato (por ejemplo ceftriaxona ' + D(25, 'mg', 0) + ' + metronidazol ' + D(15, 'mg', 0) + ').',
          '<strong>Monitoreo</strong>: presión arterial cada 15 min, diuresis mayor a 1 ml/kg/h y lactato (objetivo menor a 2 mmol/L).'
        ]
      },
      convulsion: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-zap"/></svg> Convulsiones / Status epilepticus',
        priority: 'URGENTE · Riesgo de daño cerebral después de 5 minutos de actividad',
        steps: [
          '<strong>Proteger la vía aérea</strong>. No meter los dedos en la boca. Acolchonar el entorno y evitar caídas.',
          '<strong>Canalizar IV</strong> con rapidez y dar oxígeno.',
          '<strong>Primera línea</strong>: diazepam ' + DV(0.5, 'mg', 5) + ' IV lento. Repetir a los 5 min si persiste (máximo 3 dosis).',
          '<strong>Alternativa</strong>: midazolam ' + D(0.2, 'mg') + ' IV/IM/intranasal.',
          '<strong>Si no cede en 15 min</strong>: propofol en bolo ' + D(2, 'mg', 1) + ' IV + infusión continua de 0.1-0.6 mg/kg/min.',
          '<strong>Carga de fenobarbital</strong> en status: 16 mg/kg IV en total, dividido en 4 dosis de 4 mg/kg cada 20 min.',
          '<strong>Levetiracetam</strong>: 60 mg/kg IV como alternativa segura.',
          '<strong>Corregir causas</strong>: hipoglucemia (glucosa), hipocalcemia (gluconato de calcio al 10%, 0.5-1.5 ml/kg lento) y toxinas.',
          '<strong>Después de la crisis</strong>: mantener temperatura, oxígeno, monitoreo neurológico y fluidos de mantenimiento.',
          '<strong>Estudio de la causa</strong>: química sanguínea, perfil hepático, toxicología e imagen cerebral si se repite.'
        ]
      },
      hipotermia: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-snowflake"/></svg> Hipotermia severa',
        priority: 'URGENTE · Menos de 32 °C = riesgo cardiaco grave',
        steps: [
          '<strong>Medir la temperatura central</strong> (rectal). Leve 32-37 °C, moderada 28-32 °C, severa menor a 28 °C.',
          '<strong>Recalentamiento PASIVO</strong> primero (32-37 °C): ambiente cálido (25 °C), cobertor térmico y evitar manipulación brusca.',
          '<strong>Recalentamiento ACTIVO EXTERNO</strong> (menos de 32 °C): mantas eléctricas o almohadillas calientes con protección para no quemar, y aire caliente forzado.',
          '<strong>Recalentamiento ACTIVO INTERNO</strong> (menos de 28 °C): fluidos IV tibios (39-40 °C) y lavados de cavidades con solución salina tibia.',
          '<strong>Fluidos IV TIBIOS</strong>: bolo de Ringer lactato a 38-40 °C, ' + F(10) + '.',
          '<strong>Oxígeno tibio y húmedo</strong> por tubo endotraqueal.',
          '<strong>Monitoreo cardiaco</strong> continuo: riesgo de fibrilación ventricular, sobre todo durante el recalentamiento.',
          '<strong>Velocidad de recalentamiento</strong>: 1-2 °C por hora. Más rápido favorece arritmias.',
          '<strong>Evitar</strong>: movilización innecesaria y fricción vigorosa.',
          '<strong>Vigilar hipoglucemia y acidosis</strong>: glucosa y gasometría.'
        ]
      },
      hipertermia: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-flame"/></svg> Golpe de calor / Hipertermia',
        priority: 'URGENTE · Más de 41 °C = daño en varios órganos',
        steps: [
          '<strong>Medir la temperatura rectal</strong>. Golpe de calor: más de 40.5 °C con signos neurológicos.',
          '<strong>Enfriamiento ACTIVO inmediato</strong>: agua tibia (NO fría ni hielo) sobre el cuerpo y ventilador potente.',
          '<strong>Enfriar zonas muy irrigadas</strong>: cuello, axilas e ingle con paños húmedos.',
          '<strong>Alcohol isopropílico en las almohadillas plantares</strong> (evaporación). Aplica solo en especies con almohadillas.',
          '<strong>DETENER el enfriamiento a 39.5 °C</strong> para evitar hipotermia de rebote.',
          '<strong>Fluidos IV frescos</strong>: bolo de Ringer lactato, ' + F(20) + ', y mantenimiento agresivo.',
          '<strong>Oxígeno al 100%</strong>.',
          '<strong>Corticoide si hay shock</strong>: dexametasona ' + D(0.25, 'mg') + ' IV.',
          '<strong>Monitoreo</strong>: coagulación (la CID es frecuente), función renal y hepática, sistema nervioso y arritmias cada 2-4 h.',
          '<strong>Complicaciones frecuentes</strong>: CID, insuficiencia renal aguda, rabdomiólisis y SDRA. Pronóstico reservado si pasa de 42 °C por más de 30 minutos.'
        ]
      },
      anafilaxia: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-bug"/></svg> Anafilaxia',
        priority: 'EXTREMA URGENCIA · Cuentan los minutos',
        steps: [
          '<strong>Identificar signos</strong>: urticaria, angioedema, broncoconstricción, colapso cardiovascular, vómito y diarrea.',
          '<strong>EPINEFRINA inmediata</strong>: ' + DV(0.01, 'mg', 1) + ' (1:1000) IM en el muslo, o IV con 1:10,000 diluida.',
          '<strong>Repetir la epinefrina cada 5-15 min</strong> si persisten la hipotensión o el broncoespasmo.',
          '<strong>Oxígeno al 100%</strong>. Intubar si hay compromiso de la vía aérea.',
          '<strong>Fluidos IV agresivos</strong>: bolo de cristaloides, ' + F(20) + '.',
          '<strong>Dexametasona</strong>: ' + D(0.25, 'mg') + ' IV (no reemplaza a la epinefrina).',
          '<strong>Difenhidramina</strong>: ' + D(2, 'mg', 1) + ' IM profundo o IV lento.',
          '<strong>Broncodilatador</strong>: salbutamol en aerosol o terbutalina 0.01 mg/kg SC.',
          '<strong>Monitoreo mínimo 24 h</strong>: puede haber una segunda reacción 4-12 h después.',
          '<strong>Identificar el alérgeno</strong> (medicamento, veneno, alimento) para evitar nueva exposición.'
        ]
      },
      envenenamiento: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-skull"/></svg> Envenenamiento (protocolo general)',
        priority: 'URGENTE · Es crítico el tiempo desde la exposición',
        steps: [
          '<strong>Estabilizar ABC</strong> primero: signos vitales y estado neurológico.',
          '<strong>Identificar el tóxico</strong>: historia, envase, testigos y síntomas. Llamar a un centro de toxicología si hay uno disponible.',
          '<strong>Descontaminación de la piel</strong> si fue tópico: agua tibia con jabón suave 15-30 min. Proteger al personal.',
          '<strong>Si fue ingesta de menos de 2 h y el animal está consciente</strong>: inducir el vómito con apomorfina 0.03 mg/kg IV o agua oxigenada al 3% 1-2 ml/kg VO (solo en perros).',
          '<strong>Contraindicaciones del vómito</strong>: corrosivos, hidrocarburos, animal inconsciente, con convulsiones o gatos.',
          '<strong>Carbón activado</strong>: 1-3 g/kg VO después de vomitar' + (conPeso && mam ? ' (con 2 g/kg: ' + resaltar(T(peso * 2) + ' g') + ')' : '') + '. Repetir la mitad de la dosis cada 4-6 h si el tóxico tiene circulación enterohepática.',
          '<strong>Lavado gástrico</strong>: solo con el animal intubado y bajo anestesia, y si el tóxico puede ser mortal.',
          '<strong>Antídotos específicos</strong>: N-acetilcisteína (acetaminofén), vitamina K1 (anticoagulantes), atropina + pralidoxima (organofosforados) y naloxona (opioides).',
          '<strong>Soporte sintomático</strong>: fluidos, antieméticos (maropitant 1 mg/kg), protectores gástricos (omeprazol) y anticonvulsivos si convulsiona.',
          '<strong>Monitoreo 24-48 h</strong>: función hepática, renal y gasometría según el tóxico.'
        ]
      },
      hemorragia: {
        title: '<svg class="zi" aria-hidden="true"><use href="#zi-droplet"/></svg> Hemorragia masiva',
        priority: 'URGENTE · Más de 20% de la volemia = shock',
        steps: [
          '<strong>Compresión directa</strong> inmediata con gasa estéril. Elevar el miembro si aplica.',
          '<strong>Torniquete SOLO como último recurso</strong>: anotar la hora, máximo 2 h.',
          '<strong>Doble acceso IV</strong> con catéter de calibre grande.',
          '<strong>Bolo de cristaloides</strong>: Ringer lactato rápido, ' + F(20) + '.',
          '<strong>Si el sangrado persiste y hay shock</strong>: transfusión de sangre total ' + F(20) + ' o paquete globular ' + F(10) + '.',
          '<strong>Ácido tranexámico</strong>: 10-20 mg/kg IV lento (carga) + infusión continua si la hemorragia sigue.',
          '<strong>Identificar la fuente</strong>: visible (externa) u oculta (abdominal o torácica). Ultrasonido abdominal (FAST) y radiografía de tórax.',
          '<strong>Cirugía urgente</strong> si el sangrado activo no se controla (hemoperitoneo, esplenectomía).',
          '<strong>Vitamina K1</strong> 1-5 mg/kg SC si se sospecha intoxicación por rodenticidas.',
          '<strong>Monitoreo</strong>: hematocrito cada 2-4 h (se espera que caiga 4-6 h después), coagulación (TP, TTP, plaquetas) y lactato.'
        ]
      }
    };

    var p = P[tipo];
    if (!p) return { error: 'Elige un protocolo.' };
    var avisos = [];
    if (!mam) avisos.push('Las dosis de fármacos de este protocolo son de referencia para <strong>perro y gato</strong>. Para ' + etiquetaGrupo(g).toLowerCase() + ' no se calculan totales: consulta la dosis específica de la especie. Los volúmenes de fluidos sí se ajustaron a ' + etiquetaGrupo(g).toLowerCase() + ' (' + fmt(20 * factorFluido) + ' ml/kg en bolo).');
    if (!conPeso) avisos.push('Escribe el peso para ver las cantidades totales; mientras tanto se muestran las dosis por kilo.');
    return { ok: true, title: p.title, priority: p.priority, steps: p.steps, avisos: avisos, grupo: g };
  }

  return {
    PESO_MIN: PESO_MIN, PESO_MAX: PESO_MAX, MANTENIMIENTO: MANTENIMIENTO, BOLO_SHOCK: BOLO_SHOCK,
    leerNumero: leerNumero, errorPeso: errorPeso, errorConcentracion: errorConcentracion, fmt: fmt, etiquetaGrupo: etiquetaGrupo,
    esc: esc, sinAcentos: sinAcentos, dosisVerificadas: dosisVerificadas, anestesia: anestesia, fluidos: fluidos, bcs: bcs, urgencia: urgencia
  };
});
