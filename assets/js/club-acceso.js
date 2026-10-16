/* ============================================================ */
/* REGLAS DE ACCESO A CURSOS · Club VIP Zoorigen                 */
/*                                                                */
/* Decide, sin tocar la pantalla:                                 */
/*  - qué clases se pueden ver sin membresía (clases gratis)      */
/*  - cuándo se desbloquea cada curso (1 curso cada 8 días)       */
/*  - qué cursos están "disponibles siempre"                      */
/*                                                                */
/* IMPORTANTE: para un curso SIN las marcas nuevas                */
/* (cursoMuestraGratis, disponibleSiempre, lecciones[].gratis)    */
/* el resultado es idéntico al comportamiento anterior. Eso está  */
/* comprobado en tests/club-acceso.test.js para proteger a los    */
/* miembros que ya pagaron.                                       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ACCESO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Única clase gratis que existía antes de las marcas del panel (el servidor de videos también la conoce).
  const VIDEO_GRATIS_FIJO = 'befd1641-850a-4099-88a8-047a1badc703';
  const DIAS_POR_CURSO = 8;

  const siempreDisponible = curso => !!curso && curso.disponibleSiempre === true;

  // ¿Se puede ver esta clase sin membresía?
  //  - la clase gratis de siempre, o
  //  - una clase marcada "gratis" dentro de un curso marcado "con clases gratis de muestra".
  //  - dentro de la PRUEBA GRATUITA a elegir: todas las clases del curso elegido menos la última.
  //    Mientras la prueba aplica (nunca pagó o ya eligió), la clase gratis fija de siempre deja de ser gratis.
  // `prueba` es el resultado de estadoPrueba(); sin él (o si no aplica) todo funciona como antes.
  function esClaseGratis(leccion, curso, prueba, idx) {
    if (!leccion) return false;
    if (prueba && prueba.aplica) {
      if (prueba.elegida && curso && curso.id === prueba.elegida) {
        const lista = Array.isArray(curso.lecciones) ? curso.lecciones : [];
        let i = Number.isInteger(idx) ? idx : lista.findIndex(l => l === leccion || (!!leccion.videoId && l && l.videoId === leccion.videoId));
        if (i >= 0 && i < lista.length - 1) return true;
      }
      return !!curso && curso.cursoMuestraGratis === true && leccion.gratis === true;
    }
    if (String(leccion.videoId || '') === VIDEO_GRATIS_FIJO) return true;
    return !!curso && curso.cursoMuestraGratis === true && leccion.gratis === true;
  }

  function cursoTieneClaseGratis(curso) {
    const lecciones = curso && Array.isArray(curso.lecciones) ? curso.lecciones : [];
    return lecciones.some(l => esClaseGratis(l, curso));
  }

  // Lugar del curso en la fila de desbloqueo: los cursos "disponibles siempre" NO gastan turno.
  // Devuelve -1 para esos cursos (no forman parte de la fila).
  function posicionDesbloqueo(lista, i) {
    const cursos = Array.isArray(lista) ? lista : [];
    if (!Number.isInteger(i) || i < 0 || i >= cursos.length || siempreDisponible(cursos[i])) return -1;
    let pos = 0;
    for (let k = 0; k < i; k++) if (!siempreDisponible(cursos[k])) pos++;
    return pos;
  }

  // Cuántos cursos entran en la fila de desbloqueo
  const cursosEnFila = lista => (Array.isArray(lista) ? lista : []).filter(c => !siempreDisponible(c)).length;

  // Índice más alto desbloqueado por antigüedad (0 = solo el primero)
  const maxDesbloqueado = dias => Math.floor((Number(dias) || 0) / DIAS_POR_CURSO);

  function desbloqueadoPorTiempo(lista, i, dias) {
    const cursos = Array.isArray(lista) ? lista : [];
    if (siempreDisponible(cursos[i])) return true;
    const pos = posicionDesbloqueo(cursos, i);
    return pos >= 0 && pos <= maxDesbloqueado(dias);
  }

  // Días que faltan para que se desbloquee (0 si ya está disponible)
  function diasParaDesbloquear(lista, i, dias) {
    const pos = posicionDesbloqueo(lista, i);
    if (pos < 0) return 0;
    return Math.max(0, pos * DIAS_POR_CURSO - (Number(dias) || 0));
  }

  // Orden de los cursos para el desbloqueo.
  // Los cursos de siempre (sin "ordenVip") conservan EXACTAMENTE el orden que traen (más nuevo primero, como antes).
  // Los cursos nuevos llevan un número "ordenVip" y se acomodan DESPUÉS de todos los anteriores, en orden de llegada:
  // así un curso nuevo nunca empuja a los que ya existían.
  const tieneOrdenVip = c => !!c && typeof c.ordenVip === 'number' && Number.isFinite(c.ordenVip);
  function ordenarCursos(lista) {
    const cursos = Array.isArray(lista) ? lista : [];
    const antiguos = cursos.filter(c => !tieneOrdenVip(c));
    const nuevos = cursos.filter(tieneOrdenVip)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (a.c.ordenVip - b.c.ordenVip) || (a.i - b.i))
      .map(x => x.c);
    return antiguos.concat(nuevos);
  }

  /* ───────────── Prueba gratuita a elegir ───────────── */

  // Normaliza la respuesta del servidor (GET /api/prueba-gratuita). Si no hay respuesta, la prueba NO aplica
  // y todo se comporta como antes (así, si el servidor aún no la tiene, nadie pierde nada).
  //   elegible  puede elegir su curso ahora (nunca pagó y no ha elegido)
  //   elegida   id del curso de prueba (o null)
  //   aplica    rige el régimen de prueba para el acceso gratis (elegible o ya eligió)
  function estadoPrueba(resp) {
    const r = resp && typeof resp === 'object' ? resp : {};
    const crudo = r.elegida && typeof r.elegida === 'object' ? r.elegida.cursoId : r.elegida;
    const elegida = typeof crudo === 'string' && crudo.trim() ? crudo.trim() : null;
    const elegible = r.elegible === true && !elegida;
    return {
      elegible, elegida, aplica: elegible || !!elegida,
      cursosElegibles: Array.isArray(r.cursosElegibles) ? r.cursosElegibles.map(String) : [],
      cursoPorDefectoId: typeof r.cursoPorDefectoId === 'string' ? r.cursoPorDefectoId : null,
      motivo: typeof r.motivo === 'string' ? r.motivo : null
    };
  }

  const esUltimaClase = (curso, idx) => !!curso && Array.isArray(curso.lecciones) && idx === curso.lecciones.length - 1;

  // ¿Cuándo terminó el curso de prueba? (ms) o null si todavía no. Con membresía vigente.
  function terminoPruebaEn(progresoCurso) {
    if (!progresoCurso || progresoCurso.isCompleted !== true) return null;
    const t = Date.parse(progresoCurso.completedAt || progresoCurso.certificateIssuedAt || '');
    return Number.isFinite(t) ? t : 0;   // 0 = terminó pero sin fecha: cuenta desde "ya"
  }

  /* ───────────── Cursos adelantados con un premio ───────────── */

  // Deja solo ids de curso válidos (texto no vacío), sin repetir. Cualquier otra cosa se ignora.
  function normalizarAdelantados(a) {
    const fuera = [];
    (Array.isArray(a) ? a : []).forEach(x => {
      const id = typeof x === 'string' ? x.trim() : '';
      if (id && fuera.indexOf(id) < 0) fuera.push(id);
    });
    return fuera;
  }
  function esAdelantado(adelantados, cursoId) {
    if (!Array.isArray(adelantados) || typeof cursoId !== 'string' || !cursoId) return false;
    return adelantados.some(x => typeof x === 'string' && x.trim() === cursoId);
  }
  // Ids de los cursos que el miembro ya abrió con premio, según GET /api/premios (premios[].usado.cursoId).
  // Si la respuesta no es la esperada, no hay adelantados y todo funciona como siempre.
  function adelantadosDeRespuesta(resp) {
    const premios = resp && typeof resp === 'object' && Array.isArray(resp.premios) ? resp.premios : [];
    return normalizarAdelantados(premios.map(p => (p && p.usado && typeof p.usado === 'object' ? p.usado.cursoId : null)));
  }

  // Días como miembro (misma cuenta que usaba la biblioteca). `ahora` en ms (opcional, para pruebas).
  function diasComoMiembro(session, ahora) {
    const s = session || {};
    const t = Number.isFinite(ahora) ? ahora : Date.now();
    const desde = s.planActivadoEn || s.createdAt || new Date(t).toISOString();
    return Math.floor((t - new Date(desde).getTime()) / (1000 * 60 * 60 * 24));
  }

  // Cuándo empezó el plan de la persona (ms), según lo que guarda el servidor en su ficha (planInicio / planActivadoEn). Acepta
  // Timestamp de Firestore, texto ISO o milisegundos. null si no se sabe.
  function inicioPlanMs(session) {
    const s = session || {};
    for (const v of [s.planInicio, s.planActivadoEn]) {
      if (v === null || v === undefined || v === '') continue;
      let t = null;
      if (typeof v === 'number') t = v;
      else if (typeof v.toMillis === 'function') t = v.toMillis();
      else if (typeof v.toDate === 'function') t = v.toDate().getTime();
      else if (typeof v.seconds === 'number') t = v.seconds * 1000;
      else if (typeof v._seconds === 'number') t = v._seconds * 1000;
      else t = new Date(v).getTime();
      if (Number.isFinite(t)) return t;
    }
    return null;
  }

  // Desde cuándo cuenta el reloj de desbloqueo (ms): la fecha de activación o, si no hay, la de registro.
  function desdeMiembroMs(session) {
    const s = session || {};
    const t = new Date(s.planActivadoEn || s.createdAt || NaN).getTime();
    return Number.isFinite(t) ? t : null;
  }

  // Milisegundos que faltan para que se abra el curso i en la fila normal (0 si ya está abierto). Usa la misma regla de
  // siempre (1 curso cada 8 días desde que se hizo miembro), pero con la hora exacta en lugar de días enteros.
  function msParaDesbloquear(lista, i, desdeMs, ahoraMs) {
    const pos = posicionDesbloqueo(lista, i);
    if (pos < 0 || !Number.isFinite(desdeMs)) return null;
    const ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
    return Math.max(0, desdeMs + pos * DIAS_POR_CURSO * 86400000 - ahora);
  }

  // Orden de la fila de desbloqueo tal como la usa la biblioteca: primero el orden de los cursos de siempre / nuevos
  // (ordenarCursos) y después la clase gratis de siempre arriba (orden estable). Devuelve una lista NUEVA.
  function ordenParaDesbloqueo(cursosDeFirestore) {
    const cursos = ordenarCursos(cursosDeFirestore).slice();
    const gratisDeSiempre = c => (c.lecciones || []).some(l => esClaseGratis(l, c));
    cursos.sort((a, b) => (gratisDeSiempre(b) ? 1 : 0) - (gratisDeSiempre(a) ? 1 : 0));
    return cursos;
  }

  // Resumen de la ruta (sin prueba elegida): cuántos cursos están abiertos, cuántos siguen bloqueados y en cuántos días
  // se abre el próximo. Con `adelantados` vacío da lo mismo que la cuenta anterior de la biblioteca.
  function resumenDesbloqueo(opc) {
    const o = opc || {};
    const lista = Array.isArray(o.lista) ? o.lista : [];
    let disponibles = 0, bloqueados = 0, faltan = null;
    lista.forEach((c, i) => {
      const r = desbloqueoCurso({ lista, i, dias: o.dias, adelantados: o.adelantados });
      if (r.desbloqueado) { disponibles++; return; }
      bloqueados++;
      const f = Number(r.diasFalta);
      if (Number.isFinite(f) && (faltan === null || f < faltan)) faltan = f;
    });
    return { disponibles, bloqueados, faltan: faltan === null ? 0 : faltan, total: lista.length };
  }

  // Desbloqueo de un curso de la lista. Devuelve { desbloqueado, diasFalta, motivo }.
  //   motivo: null | 'tiempo' | 'termina-prueba'  (diasFalta = null cuando todavía no empieza el conteo)
  // Sin prueba elegida: exactamente la regla de siempre (1 curso cada 8 días desde que se hizo miembro).
  // Con prueba elegida (y ya con membresía): el curso de prueba y los "siempre disponibles" quedan fuera de la fila.
  // El curso de prueba cuenta como el primero (abierto): el primero de la fila se abre 8 días después de que la persona se hizo
  // miembro y cada siguiente 8 días más, AUNQUE la prueba todavía no esté terminada (el conteo es desde el inicio del plan,
  // `inicioMs`; el servidor calcula lo mismo en GET /api/calendario). Solo si no se conoce el inicio del plan se usa el respaldo
  // anterior: el conteo espera a que termine el curso de prueba ('termina-prueba').
  //
  // PREMIOS: `adelantados` es un arreglo de ids de curso que el miembro abrió con un premio. Esos cursos quedan ABIERTOS
  // (con porPremio:true) y NADA más cambia: los demás conservan su lugar en la fila (el adelanto no corre el turno de nadie).
  // Sin `adelantados` (o vacío) el resultado es exactamente el de siempre.
  function desbloqueoCurso(opc) {
    const o = opc || {};
    const lista = Array.isArray(o.lista) ? o.lista : [];
    const i = o.i;
    const curso = lista[i];
    if (curso && esAdelantado(o.adelantados, curso.id)) return { desbloqueado: true, diasFalta: 0, motivo: null, porPremio: true };
    const p = o.prueba;
    const elegida = p && p.elegida && lista.some(c => c && c.id === p.elegida) ? p.elegida : null;
    if (!elegida) {
      const dias = Number(o.dias) || 0;
      return { desbloqueado: desbloqueadoPorTiempo(lista, i, dias), diasFalta: diasParaDesbloquear(lista, i, dias), motivo: null };
    }
    if (!curso) return { desbloqueado: false, diasFalta: null, motivo: null };
    if (curso.id === elegida || siempreDisponible(curso)) return { desbloqueado: true, diasFalta: 0, motivo: null };
    const cola = lista.filter(c => c && c.id !== elegida && !siempreDisponible(c));
    const pos = cola.findIndex(c => c.id === curso.id);
    const ahora = Number.isFinite(o.ahora) ? o.ahora : Date.now();
    let base;
    if (Number.isFinite(o.inicioMs)) {
      // Desde que se hizo miembro (nunca más tarde que el conteo anterior, que esperaba al fin de la prueba)
      if (pos < 0) return { desbloqueado: false, diasFalta: null, motivo: null };
      base = o.inicioMs;
    } else {
      const fin = terminoPruebaEn(o.progreso && o.progreso[elegida]);
      if (fin === null) return { desbloqueado: false, diasFalta: null, motivo: 'termina-prueba' };
      if (pos < 0) return { desbloqueado: false, diasFalta: null, motivo: null };
      base = fin === 0 ? ahora : fin;
    }
    const faltaMs = (pos + 1) * DIAS_POR_CURSO * 86400000 - (ahora - base);
    if (faltaMs <= 0) return { desbloqueado: true, diasFalta: 0, motivo: null };
    return { desbloqueado: false, diasFalta: Math.ceil(faltaMs / 86400000), motivo: 'tiempo' };
  }

  return {
    estadoPrueba, esUltimaClase, terminoPruebaEn, desbloqueoCurso,
    VIDEO_GRATIS_FIJO, DIAS_POR_CURSO, ordenarCursos, tieneOrdenVip,
    siempreDisponible, esClaseGratis, cursoTieneClaseGratis,
    posicionDesbloqueo, cursosEnFila, maxDesbloqueado, desbloqueadoPorTiempo, diasParaDesbloquear,
    normalizarAdelantados, esAdelantado, adelantadosDeRespuesta, diasComoMiembro, ordenParaDesbloqueo, resumenDesbloqueo,
    desdeMiembroMs, msParaDesbloquear, inicioPlanMs
  };
});
