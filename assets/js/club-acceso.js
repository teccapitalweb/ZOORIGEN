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
  function esClaseGratis(leccion, curso) {
    if (!leccion) return false;
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

  return {
    VIDEO_GRATIS_FIJO, DIAS_POR_CURSO, ordenarCursos, tieneOrdenVip,
    siempreDisponible, esClaseGratis, cursoTieneClaseGratis,
    posicionDesbloqueo, cursosEnFila, maxDesbloqueado, desbloqueadoPorTiempo, diasParaDesbloquear
  };
});
