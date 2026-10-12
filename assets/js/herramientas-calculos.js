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

  var ETIQUETA_GRUPO = { mamifero: 'Mamífero', ave: 'Ave', reptil: 'Reptil', pediatrico: 'Pediátrico / geriátrico', mamiferos: 'Mamíferos', aves: 'Aves', reptiles: 'Reptiles', perro: 'Perro', gato: 'Gato' };
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

  /* ───── ANESTESIA ─────
     Una variante de protocolo trae dosis publicadas (mg/kg) para UNA especie. Las concentraciones de los frascos las
     escribe el usuario: sin concentración se muestra solo el total en mg. */
  // variante: { especie, componentes:[{nombre,min,max,via,f:{fuente,url}}] } · concs: lista de mg/ml (misma posición) o null
  function anestesia(variante, peso, concs) {
    var ep = errorPeso(peso); if (ep) return { error: ep };
    if (!variante || !variante.componentes) return { error: 'Selecciona un protocolo y una especie.' };
    var filas = variante.componentes.map(function (c, i) {
      var conc = concs && Number.isFinite(concs[i]) && concs[i] > 0 ? concs[i] : null;
      var mgMin = peso * c.min, mgMax = peso * c.max;
      return {
        nombre: c.nombre, via: c.via || '', fuente: c.f ? c.f.fuente : '', url: c.f ? c.f.url : '',
        min: c.min, max: c.max, mismoValor: c.min === c.max,
        mgMin: mgMin, mgMax: mgMax, conc: conc,
        mlMin: conc ? mgMin / conc : null, mlMax: conc ? mgMax / conc : null,
        volumenPequeno: conc ? (mgMax / conc) < 0.1 : false
      };
    });
    return { ok: true, especie: variante.especie, filas: filas };
  }

  /* ───── FLUIDOTERAPIA ─────
     Cifras de las guías AAHA 2024 de fluidoterapia para perros y gatos, del Manual Merck/MSD y de memorias de
     exóticos. Donde no hay un valor verificado (por ejemplo, bolo de shock en reptiles) no se calcula nada. */
  var MANTENIMIENTO = { perro: 60, gato: 40, aves: 50, reptiles: 20 };           // ml/kg/día (reptiles: punto medio de 10 a 30)
  var BOLO_SHOCK = { perro: [15, 20], gato: [5, 10], aves: [10, 10], reptiles: null }; // ml/kg en 15 min
  var INTRAOP = { perro: [5, 5], gato: [3, 5] };                                  // ml/kg/h al empezar
  var GRUPOS_FLUIDOS = { perro: 'Perro', gato: 'Gato', aves: 'Aves', reptiles: 'Reptiles' };
  var FUENTES_FLUIDOS = {
    aaha3: { texto: 'Guías AAHA 2024: reposición y mantenimiento', url: 'https://www.aaha.org/resources/2024-aaha-fluid-therapy-guidelines-for-dogs-and-cats/section-3-fluids-for-replacement-and-maintenance/' },
    aaha4: { texto: 'Guías AAHA 2024: fluidos y anestesia', url: 'https://www.aaha.org/resources/2024-aaha-fluid-therapy-guidelines-for-dogs-and-cats/section-4-fluid-therapy-and-anesthesia/' },
    parkland: { texto: 'Manual MSD: fórmula de Parkland', url: 'https://www.msdvetmanual.com/multimedia/table/the-parkland-formula' },
    aves: { texto: 'Manual Merck: aves de compañía', url: 'https://www.merckvetmanual.com/exotic-and-laboratory-animals/pet-birds/traumatic-injury-of-pet-birds' },
    avesBolo: { texto: 'dvm360: fluidoterapia en aves', url: 'https://www.dvm360.com/view/avian-fluid-therapy-proceedings' },
    reptiles: { texto: 'dvm360: fluidoterapia en reptiles', url: 'https://www.dvm360.com/view/fluid-therapy-reptiles-proceedings' }
  };

  // entrada: { grupo, peso, tipo, deshPct, perdidas, quemadoPct, equipo }
  function fluidos(e) {
    var ep = errorPeso(e.peso); if (ep) return { error: ep };
    var grupo = GRUPOS_FLUIDOS[e.grupo] ? e.grupo : null;
    if (!grupo) return { error: 'Elige la especie: perro, gato, aves o reptiles.' };
    var perdidas = Number.isFinite(e.perdidas) ? e.perdidas : 0;
    if (perdidas < 0) return { error: 'Las pérdidas extra no pueden ser negativas.' };
    if (perdidas > 100000) return { error: 'Las pérdidas extra parecen demasiado altas. Revisa que estén en ml por día.' };
    var equipo = Number.isFinite(e.equipo) && e.equipo > 0 ? e.equipo : 20;
    var peso = e.peso;
    var factor = MANTENIMIENTO[grupo];
    var mant = peso * factor;
    var fases = [], filas = [], titulo = '', nota = '', modo = 'mant', fuentes = [];
    var total = 0, totalMax = null;

    var fase = function (t, horas, ml, mlMax, alternativa) {
      var m2 = mlMax == null ? ml : mlMax;
      var porHora = horas > 0 ? ml / horas : 0, porHoraMax = horas > 0 ? m2 / horas : 0;
      var gotas = (porHora * equipo) / 60, gotasMax = (porHoraMax * equipo) / 60;
      fases.push({
        titulo: t, horas: horas, ml: ml, mlMax: m2, rango: m2 !== ml, alternativa: !!alternativa,
        mlPorHora: porHora, mlPorHoraMax: porHoraMax, gotasMin: gotas, gotasMinMax: gotasMax,
        segPorGota: gotas > 0 ? 60 / gotas : 0
      });
    };
    filas.push({ etiqueta: 'Mantenimiento (' + factor + ' ml/kg/día' + (grupo === 'reptiles' ? ', punto medio de 10 a 30' : '') + ')', valor: fmt(mant) + ' ml/día' });
    fuentes.push(grupo === 'perro' || grupo === 'gato' ? FUENTES_FLUIDOS.aaha3 : (grupo === 'aves' ? FUENTES_FLUIDOS.aves : FUENTES_FLUIDOS.reptiles));

    if (e.tipo === 'desh' || e.tipo === 'gastro') {
      var pct = e.deshPct;
      if (!Number.isFinite(pct) || pct <= 0 || pct > 20) return { error: 'Elige el porcentaje de deshidratación.' };
      var deficit = peso * 1000 * (pct / 100);
      var base = mant + perdidas;
      titulo = 'Deshidratación ' + pct + '% (' + (e.tipo === 'gastro' ? 'vómito o diarrea' : 'pérdidas') + ')';
      filas.unshift({ etiqueta: 'Déficit a reponer (' + pct + '% del peso)', valor: fmt(deficit) + ' ml' });
      fase('Reponer el déficit en 24 h (junto con el mantenimiento)', 24, deficit + base);
      fase('Si prefieres reponerlo en 12 h (el mantenimiento sigue aparte)', 12, deficit + base / 2, null, true);
      total = deficit + base;
      nota = 'Las guías AAHA indican reponer el déficit en 12 a 24 horas. Reevalúa la hidratación y el peso durante el tratamiento.';
      fuentes.push(FUENTES_FLUIDOS.aaha3);
    } else if (e.tipo === 'shock') {
      var bolo = BOLO_SHOCK[grupo];
      if (!bolo) return { error: 'No hay un bolo de shock verificado para reptiles (la fuente solo indica no pasar de 20 ml/kg por dosis, por vía intracelómica). Consulta un formulario específico de la especie.' };
      titulo = 'Shock hipovolémico';
      modo = 'shock';
      var bMin = peso * bolo[0], bMax = peso * bolo[1];
      filas.unshift({ etiqueta: 'Bolo de cristaloide isotónico (' + (bolo[0] === bolo[1] ? bolo[0] : bolo[0] + ' a ' + bolo[1]) + ' ml/kg)', valor: (bolo[0] === bolo[1] ? fmt(bMin) : fmt(bMin) + ' a ' + fmt(bMax)) + ' ml en 15 min', alerta: true });
      fase('Bolo inicial (15 min)', 0.25, bMin, bMax);
      fase('Después del bolo: mantenimiento (24 h)', 24, mant + perdidas);
      total = bMin + mant + perdidas; totalMax = bMax + mant + perdidas;
      nota = grupo === 'aves'
        ? 'En aves el bolo es de cristaloide tibio 10 ml/kg, con coloide (hetastarch) 5 ml/kg en incrementos. Reevalúa después de cada bolo.'
        : 'Bolo de fluido isotónico tamponado en 15 minutos. Reevalúa después de cada bolo antes de dar otro.';
      fuentes.push(grupo === 'aves' ? FUENTES_FLUIDOS.avesBolo : FUENTES_FLUIDOS.aaha3);
    } else if (e.tipo === 'cirugia') {
      var ro = INTRAOP[grupo];
      if (!ro) return { error: 'No hay una velocidad de fluidos intraoperatoria verificada para ' + GRUPOS_FLUIDOS[grupo].toLowerCase() + '. Consulta un formulario específico de la especie.' };
      titulo = 'Intraoperatorio';
      modo = 'cirugia';
      filas = [{ etiqueta: 'Velocidad inicial (' + (ro[0] === ro[1] ? ro[0] : ro[0] + ' a ' + ro[1]) + ' ml/kg/h)', valor: (ro[0] === ro[1] ? fmt(peso * ro[0]) : fmt(peso * ro[0]) + ' a ' + fmt(peso * ro[1])) + ' ml/h' }];
      fase('Por cada hora de cirugía', 1, peso * ro[0], peso * ro[1]);
      total = peso * ro[0]; totalMax = peso * ro[1];
      nota = 'Es la velocidad con la que se empieza (cristaloide balanceado). Hasta 10 ml/kg/h solo se justifica en una pérdida de sangre aguda; ajusta según presión arterial, temperatura y diuresis.';
      fuentes = [FUENTES_FLUIDOS.aaha4];
    } else if (e.tipo === 'quemado') {
      var q = e.quemadoPct;
      if (!Number.isFinite(q) || q <= 0) return { error: 'Escribe el % de superficie corporal quemada.' };
      if (q > 100) return { error: 'La superficie quemada no puede pasar de 100%.' };
      var parkland = 4 * peso * q;
      titulo = 'Quemado ' + q + '% de superficie (fórmula de Parkland)';
      modo = 'quemado';
      filas = [{ etiqueta: 'Parkland (4 ml × kg × %)', valor: fmt(parkland) + ' ml en 24 h' }];
      fase('Primeras 8 h desde la quemadura (la mitad)', 8, parkland / 2);
      fase('Siguientes 16 h (la otra mitad)', 16, parkland / 2);
      total = parkland;
      nota = 'Ringer lactato. La fuente la propone para quemaduras de más del 10% de la superficie corporal. Es un cálculo de reanimación: no incluye el mantenimiento.';
      fuentes = [FUENTES_FLUIDOS.parkland];
    } else {
      titulo = 'Mantenimiento';
      fase('Mantenimiento (24 h)', 24, mant + perdidas);
      total = mant + perdidas;
      nota = 'Solución isotónica a velocidad constante.';
    }

    if (perdidas > 0 && modo !== 'cirugia' && modo !== 'quemado') filas.push({ etiqueta: 'Pérdidas extra', valor: fmt(perdidas) + ' ml/día' });
    return {
      ok: true, titulo: titulo, grupo: grupo, peso: peso, equipo: equipo, fases: fases, filas: filas,
      total: total, totalMax: totalMax, nota: nota, modo: modo, mantenimiento: mant,
      fuentes: fuentes.filter(function (x, i) { return fuentes.findIndex(function (y) { return y.url === x.url; }) === i; })
    };
  }

  /* ───── BCS ─────
     Solo se muestra lo que respalda la fuente: cada punto por encima de 5 equivale a un 10 a 15% más de grasa corporal
     (Universidad de Guelph). La cifra "% de peso por punto" que había antes no tiene fuente y se retiró. */
  function bcs(puntaje) {
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 9) return { error: 'Selecciona un BCS del 1 al 9.' };
    var sobre = puntaje - 5;
    return {
      ok: true, puntaje: puntaje, puntosSobre5: sobre,
      grasaExtraMin: sobre > 0 ? sobre * 10 : null,
      grasaExtraMax: sobre > 0 ? sobre * 15 : null
    };
  }

  /* ───── URGENCIAS ─────
     Solo hay cifras que se leyeron en la fuente (Manual Merck, guías RECOVER 2024, AAHA, Clinician's Brief, VCA, dvm360...).
     Las dosis son de perro y gato; en aves y reptiles solo se muestra la dosis por kilo cuando la propia fuente la da. */
  var GRUPOS_URG = { perro: 1, gato: 1, aves: 1, reptiles: 1 };
  function urgencia(tipo, peso, grupo) {
    var g = GRUPOS_URG[grupo] ? grupo : 'perro';
    var canino = g === 'perro' || g === 'gato';
    var conPeso = Number.isFinite(peso) && peso >= PESO_MIN && peso <= PESO_MAX;
    var resaltar = function (t) { return '<strong style="color:#E8A317;">' + t + '</strong>'; };
    var rango = function (a, b) { return a === b ? fmt(a) : fmt(a) + ' a ' + fmt(b); };

    // Fármaco con rango por kilo (mg/kg): total solo en perro y gato con peso escrito
    var D = function (min, max, unidad) {
      var por = rango(min, max) + ' ' + unidad + '/kg';
      if (conPeso && canino) return resaltar(rango(peso * min, peso * max) + ' ' + unidad) + ' (' + por + ')';
      return por;
    };
    // Volumen de fluido con rango por kilo (ml/kg)
    var V = function (min, max) {
      var por = rango(min, max) + ' ml/kg';
      if (conPeso) return resaltar(rango(peso * min, peso * max) + ' ml') + ' (' + por + ')';
      return por;
    };
    var BOLO_G = { perro: [15, 20], gato: [5, 10], aves: [10, 10] };
    var boloTxt = function () {
      var b = BOLO_G[g];
      if (!b) return 'no hay un bolo verificado para reptiles (la fuente solo indica no pasar de 20 ml/kg por dosis, vía intracelómica)';
      return V(b[0], b[1]);
    };

    var P = {
      rcp: {
        title: 'Paro cardiorrespiratorio (RCP)',
        priority: 'CRÍTICO · Inicia de inmediato',
        steps: [
          '<strong>Compresiones torácicas</strong> sin demora: 100 a 120 por minuto, con el animal en decúbito lateral, comprimiendo de 1/3 a 1/2 del ancho del tórax.',
          '<strong>Ventilación</strong>: 10 ventilaciones por minuto; con un solo reanimador, relación 30 compresiones por 2 ventilaciones.',
          '<strong>Acceso IV o intraóseo</strong> lo antes posible.',
          '<strong>Epinefrina</strong>: ' + D(0.01, 0.01, 'mg') + ' IV o IO, cada dos ciclos de compresiones (aproximadamente cada 4 minutos) en ritmos no desfibrilables. Por vía intratraqueal se duplica la dosis. Las dosis altas (0.1 mg/kg) ya no se recomiendan.',
          '<strong>Atropina</strong>: ' + D(0.04, 0.04, 'mg') + ' IV o IO, una sola dosis, en ritmos no desfibrilables.',
          '<strong>Desfibrilación</strong> (ritmos desfibrilables): se prefiere bifásico; primer choque de 2 J/kg y después 4 J/kg.',
          '<strong>Reevalúa el ritmo</strong> al terminar cada ciclo de compresiones.'
        ]
      },
      shock: {
        title: 'Shock hipovolémico o séptico',
        priority: 'URGENTE · Actuar en minutos',
        steps: [
          '<strong>ABC y signos vitales</strong>: frecuencia cardiaca, pulso, color de mucosas, llenado capilar y estado mental.',
          '<strong>Acceso IV</strong> (o intraóseo) con el catéter de mayor calibre posible.',
          '<strong>Bolo de cristaloide isotónico tamponado</strong> en 15 minutos: ' + boloTxt() + '. Reevalúa después de cada bolo antes de dar otro.',
          g === 'aves' ? '<strong>En aves</strong> se añade coloide (hetastarch) 5 ml/kg en incrementos, con los fluidos tibios.' : '<strong>Si no responde</strong>, valora coloides y vasopresores con tu protocolo.',
          '<strong>Vasopresores</strong> (perro y gato): dobutamina 2 a 20 µg/kg/min IV en infusión continua (inicio 2 a 5); norepinefrina 0.05 a 2 µg/kg/min IV.',
          '<strong>Si hay hipoglucemia</strong>: dextrosa al 50%, ' + (conPeso && canino ? resaltar(rango(peso * 0.5, peso * 1) + ' ml') + ' (0.5 a 1 ml/kg)' : '0.5 a 1 ml/kg') + ', diluida 1:3 con solución salina 0.9% y aplicada IV lenta en 10 minutos.',
          '<strong>Si se sospecha sepsis</strong>: antibiótico de amplio espectro IV de inmediato, según tu protocolo y el antibiograma.'
        ]
      },
      convulsion: {
        title: 'Convulsiones y status epilepticus',
        priority: 'URGENTE · Controlar la crisis',
        steps: [
          '<strong>Protege la vía aérea</strong> y evita lesiones: no metas los dedos en la boca. Da oxígeno.',
          '<strong>Acceso IV</strong> rápido.',
          '<strong>Diazepam</strong>: ' + D(0.5, 1, 'mg') + ' IV (más de 2 mg/kg si el paciente recibe fenobarbital crónico). <strong>Alternativa:</strong> midazolam ' + D(0.2, 0.2, 'mg') + ' IV, IM o intranasal.',
          '<strong>Si no cede</strong>: propofol en bolo IV de ' + D(1, 4, 'mg') + ', seguido de infusión de 0.1 a 0.6 mg/kg/min a efecto.',
          '<strong>Fenobarbital</strong>: ' + D(2, 4, 'mg') + ' IV cada 20 a 30 minutos; máximo 16 mg/kg si ya lo recibía y 24 mg/kg si no.',
          '<strong>Levetiracetam</strong>: carga de ' + D(60, 60, 'mg') + ' IV, una vez en 24 horas.',
          '<strong>Si hay hipocalcemia</strong>: gluconato de calcio al 10%, ' + (conPeso && canino ? resaltar(rango(peso * 0.5, peso * 1.5) + ' ml') + ' (0.5 a 1.5 ml/kg)' : '0.5 a 1.5 ml/kg') + ' IV lento en 10 a 30 minutos, con auscultación o ECG.'
        ]
      },
      hipotermia: {
        title: 'Hipotermia',
        priority: 'URGENTE · Recalentar con control',
        steps: [
          '<strong>Mide la temperatura central</strong> (rectal).',
          '<strong>Recalienta de forma activa y controlada</strong>: al menos 1 a 2 °C por hora (puede requerirse más rápido).',
          '<strong>Fuentes de calor externas</strong> con protección para no quemar la piel y manipulación suave.',
          '<strong>Fluidos IV</strong> calentados.',
          '<strong>Monitoreo continuo</strong> del ritmo cardiaco y de la temperatura durante el recalentamiento.'
        ]
      },
      hipertermia: {
        title: 'Golpe de calor',
        priority: 'URGENTE · Enfriar sin pasarse',
        steps: [
          '<strong>Mide la temperatura rectal</strong> y retira al animal del calor.',
          '<strong>Enfriamiento activo</strong>: agua a temperatura ambiente o tibia sobre el cuerpo y ventilador. El hielo y el alcohol ya no se recomiendan.',
          '<strong>Detén el enfriamiento activo</strong> a 39.4 °C (algunas guías 39.7 °C) para evitar la hipotermia de rebote.',
          '<strong>Fluidos IV</strong> (perro): bolos de cristaloide de ' + V(20, 20) + ' en 15 minutos hasta resolver la hipovolemia.',
          '<strong>No uses corticoides</strong>: no hay beneficio demostrado y están contraindicados en el golpe de calor.',
          '<strong>Oxígeno y monitoreo</strong> continuo; vigila la coagulación y la función renal.'
        ]
      },
      anafilaxia: {
        title: 'Anafilaxia',
        priority: 'EXTREMA URGENCIA · Cuentan los minutos',
        steps: [
          '<strong>Epinefrina</strong>: ' + D(0.01, 0.01, 'mg') + ' IM (solución 1 mg/ml); puede repetirse cada 5 a 15 minutos.',
          '<strong>Oxígeno</strong>, acceso IV y fluidos isotónicos para sostener la presión.',
          '<strong>Dexametasona</strong>: ' + D(0.1, 0.2, 'mg') + ' IM o IV (no reemplaza a la epinefrina).',
          '<strong>Difenhidramina</strong>: ' + D(1, 2, 'mg') + ' IM o IV.',
          '<strong>Vigila al paciente</strong> varias horas después de que mejore.'
        ]
      },
      envenenamiento: {
        title: 'Envenenamiento (protocolo general)',
        priority: 'URGENTE · Importa el tiempo desde la exposición',
        steps: [
          '<strong>Estabiliza ABC</strong> primero: signos vitales y estado neurológico.',
          '<strong>Identifica el tóxico</strong> (envase, historia, síntomas) y consulta a un centro de toxicología.',
          '<strong>Si fue en la piel</strong>: lavado con agua y jabón suave, protegiendo al personal.',
          '<strong>Vómito inducido (solo perros)</strong>: apomorfina ' + D(0.03, 0.03, 'mg') + ' IV, o peróxido de hidrógeno al 3%, ' + (conPeso && canino ? resaltar(rango(peso * 1, Math.min(peso * 2, 45)) + ' ml') + ' (1 a 2 ml/kg, máximo 45 ml)' : '1 a 2 ml/kg, máximo 45 ml') + ' por vía oral, solo cuando no hay otra opción.',
          '<strong>Carbón activado</strong>: ' + D(1, 2, 'g') + ' por vía oral; puede repetirse cada 4 a 6 horas si hace falta.',
          '<strong>Antídoto específico</strong>: consulta cuál corresponde al tóxico con un centro de toxicología.',
          '<strong>Antiemético</strong>: maropitant ' + D(1, 1, 'mg') + ' SC o IV una vez al día, hasta 5 días.'
        ]
      },
      hemorragia: {
        title: 'Hemorragia masiva',
        priority: 'URGENTE · Controlar el sangrado',
        steps: [
          '<strong>Compresión directa</strong> inmediata con gasa estéril.',
          '<strong>Doble acceso IV</strong> con catéter de calibre grande.',
          '<strong>Fluidos</strong>: cristaloide isotónico en bolos según el protocolo de shock de la especie (' + boloTxt() + '), reevaluando después de cada bolo.',
          '<strong>Ácido tranexámico</strong>: ' + D(10, 10, 'mg') + ' IV lento (en perros; en estudios se han usado hasta 20 mg/kg).',
          '<strong>Transfusión</strong>: valora sangre total o paquete globular según el caso y tu protocolo.',
          '<strong>Identifica la fuente</strong> del sangrado (visible u oculta) y valora cirugía si no se controla.'
        ]
      }
    };

    var p = P[tipo];
    if (!p) return { error: 'Elige un protocolo.' };
    var avisos = [];
    if (!canino) avisos.push('Las dosis de este protocolo son de <strong>perro y gato</strong>. Para ' + (g === 'aves' ? 'aves' : 'reptiles') + ' se muestra solo la dosis por kilo cuando existe; consulta la dosis específica de la especie antes de aplicar nada.');
    if (!conPeso) avisos.push('Escribe el peso para ver las cantidades totales; mientras tanto se muestran las dosis por kilo.');
    return { ok: true, title: p.title, priority: p.priority, steps: p.steps, avisos: avisos, grupo: g };
  }

  return {
    PESO_MIN: PESO_MIN, PESO_MAX: PESO_MAX, MANTENIMIENTO: MANTENIMIENTO, BOLO_SHOCK: BOLO_SHOCK, INTRAOP: INTRAOP, GRUPOS_FLUIDOS: GRUPOS_FLUIDOS,
    leerNumero: leerNumero, errorPeso: errorPeso, errorConcentracion: errorConcentracion, fmt: fmt, etiquetaGrupo: etiquetaGrupo,
    esc: esc, sinAcentos: sinAcentos, dosisVerificadas: dosisVerificadas, anestesia: anestesia, fluidos: fluidos, bcs: bcs, urgencia: urgencia
  };
});
