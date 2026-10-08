/* ============================================================ */
/* PANEL ADMIN · CERTIFICADOS EMITIDOS                           */
/* Lista, estadísticas, búsqueda, filtro por curso, enlaces de   */
/* verificación y exportación a CSV. Solo lectura: no emite ni   */
/* borra certificados. Se prueba en tests/admin-certificados.test.js */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_ADMIN_CERTS = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (iconos) {
  'use strict';

  const ico = (nombre, opciones) => (iconos && iconos.svg ? iconos.svg(nombre, opciones) : '');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  const BASE_PUBLICA = 'https://www.zoorigen.com/pages/';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function aFecha(v) {
    if (!v) return null;
    const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const texto = v => String(v == null ? '' : v).trim();
  const sin = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function formatoFecha(d) { return d ? `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}` : '—'; }

  function relativo(d, ahora) {
    if (!d) return '';
    const dias = Math.round((ahora - d.getTime()) / 86400000);
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias < 60) return `hace ${dias} días`;
    if (dias < 700) return `hace ${Math.round(dias / 30)} meses`;
    return `hace ${Math.round(dias / 365)} años`;
  }

  // Lleva el documento de Firestore a una forma estable (tolera campos que falten).
  function normalizar(doc) {
    const d = doc || {};
    return {
      id: texto(d.id || d.folio),
      folio: texto(d.folio || d.id),
      alumno: texto(d.memberName || d.nombre),
      correo: texto(d.memberEmail || d.email),
      uid: texto(d.memberUid || d.uid),
      curso: texto(d.courseTitle || d.curso),
      cursoId: texto(d.courseId),
      area: texto(d.courseArea),
      duracion: texto(d.courseDuration),
      clases: Number(d.totalClases) || 0,
      fecha: aFecha(d.issuedAt || d.emitido),
      prueba: d._test === true || d.courseId === 'test'
    };
  }

  function resumen(lista, ahora) {
    const t = ahora == null ? Date.now() : ahora;
    const alumnos = new Set(), cursos = new Set();
    let ultimos30 = 0;
    for (const c of lista) {
      alumnos.add(c.uid || c.correo || c.alumno || c.id);
      cursos.add(c.cursoId || c.curso || '—');
      if (c.fecha && t - c.fecha.getTime() <= 30 * 86400000 && c.fecha.getTime() <= t + 86400000) ultimos30++;
    }
    return { total: lista.length, alumnos: alumnos.size, cursos: cursos.size, ultimos30 };
  }

  function cursosConConteo(lista) {
    const m = new Map();
    for (const c of lista) {
      const k = c.cursoId || c.curso || '—';
      const actual = m.get(k) || { clave: k, nombre: c.curso || 'Curso sin nombre', cuenta: 0 };
      actual.cuenta++;
      m.set(k, actual);
    }
    return [...m.values()].sort((a, b) => b.cuenta - a.cuenta || a.nombre.localeCompare(b.nombre, 'es'));
  }

  function filtrar(lista, { texto: q = '', curso = 'todos', orden = 'recientes' } = {}) {
    const qn = sin(String(q).trim());
    const r = lista.filter(c => {
      if (curso !== 'todos' && (c.cursoId || c.curso || '—') !== curso) return false;
      if (!qn) return true;
      return [c.folio, c.alumno, c.correo, c.curso, c.area].some(v => sin(v).includes(qn));
    });
    const ms = c => (c.fecha ? c.fecha.getTime() : 0);
    if (orden === 'antiguos') return r.sort((a, b) => ms(a) - ms(b) || a.folio.localeCompare(b.folio));
    if (orden === 'alumno') return r.sort((a, b) => (a.alumno || '￿').localeCompare(b.alumno || '￿', 'es', { sensitivity: 'base' }) || ms(b) - ms(a));
    return r.sort((a, b) => ms(b) - ms(a) || a.folio.localeCompare(b.folio));
  }

  const urlVer = folio => 'ver-certificado.html?folio=' + encodeURIComponent(folio);
  const urlVerificar = folio => BASE_PUBLICA + 'verificar.html?folio=' + encodeURIComponent(folio);

  function iniciales(nombre) {
    const p = texto(nombre).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    return p || '?';
  }

  /* ───────── HTML ───────── */

  function kpisHTML(r) {
    return `
      <div class="admin-stats cols-4">
        <div class="stat-box green"><div class="stat-box__label">Certificados emitidos</div><div class="stat-box__value">${r.total}</div><div class="stat-box__note">en total</div></div>
        <div class="stat-box total"><div class="stat-box__label">Alumnos certificados</div><div class="stat-box__value">${r.alumnos}</div><div class="stat-box__note">personas distintas</div></div>
        <div class="stat-box amber"><div class="stat-box__label">Cursos con certificados</div><div class="stat-box__value">${r.cursos}</div><div class="stat-box__note">cursos distintos</div></div>
        <div class="stat-box review"><div class="stat-box__label">Últimos 30 días</div><div class="stat-box__value">${r.ultimos30}</div><div class="stat-box__note">emitidos recientemente</div></div>
      </div>`;
  }

  function opcionesCursoHTML(cursos, actual, total) {
    return `<option value="todos"${actual === 'todos' ? ' selected' : ''}>Todos los cursos (${total})</option>` +
      cursos.map(c => `<option value="${esc(c.clave)}"${actual === c.clave ? ' selected' : ''}>${esc(c.nombre)} (${c.cuenta})</option>`).join('');
  }

  function ordenHTML(actual) {
    const o = [['recientes', 'Recientes', 'clock'], ['antiguos', 'Antiguos', 'calendar'], ['alumno', 'Alumno A–Z', 'arrow-down-a-z']];
    return o.map(([id, nombre, icono]) => `<button type="button" class="zoo-chip${actual === id ? ' is-active' : ''}" data-orden="${id}" aria-pressed="${actual === id}">${ico(icono, { size: 14 })}${esc(nombre)}</button>`).join('');
  }

  function filaHTML(c, ahora) {
    const t = ahora == null ? Date.now() : ahora;
    const ver = urlVer(c.folio);
    return `<article class="cf-fila" data-folio="${esc(c.folio)}">
      <div class="cf-alumno">
        <span class="cf-av">${esc(iniciales(c.alumno))}</span>
        <div class="cf-alumno__txt">
          <div class="cf-nombre">${esc(c.alumno || 'Sin nombre')}${c.prueba ? ' <span class="cf-prueba">Prueba</span>' : ''}</div>
          <div class="cf-correo">${esc(c.correo || 'Sin correo')}</div>
        </div>
      </div>
      <div class="cf-curso">
        <div class="cf-curso__t">${esc(c.curso || 'Curso sin nombre')}</div>
        <div class="cf-curso__m">${[c.area, c.clases ? `${c.clases} clase${c.clases === 1 ? '' : 's'}` : '', c.duracion].filter(Boolean).map(esc).join(' · ') || '—'}</div>
      </div>
      <div class="cf-fecha">
        <div class="cf-fecha__d">${esc(formatoFecha(c.fecha))}</div>
        <div class="cf-fecha__r">${esc(relativo(c.fecha, t))}</div>
      </div>
      <div class="cf-folio"><code>${esc(c.folio)}</code></div>
      <div class="cf-acciones">
        <a class="cc-icono" href="${esc(ver)}" target="_blank" rel="noopener" aria-label="Ver certificado ${esc(c.folio)}" title="Ver certificado">${ico('eye', { size: 16 })}</a>
        <button type="button" class="cc-icono" data-accion="copiar" data-folio="${esc(c.folio)}" aria-label="Copiar enlace de verificación de ${esc(c.folio)}" title="Copiar enlace de verificación">${ico('copy', { size: 16 })}</button>
        <a class="cc-icono" href="${esc(urlVerificar(c.folio))}" target="_blank" rel="noopener" aria-label="Verificar ${esc(c.folio)} como lo vería el público" title="Verificar (vista pública)">${ico('shield-check', { size: 16 })}</a>
      </div>
    </article>`;
  }

  function listaHTML(lista, ahora) {
    if (!lista.length) return `<div class="no-data cc-vacio">${ico('award', { size: 28 })}<p>No hay certificados que coincidan con la búsqueda.</p></div>`;
    return `<div class="cf-lista">${lista.map(c => filaHTML(c, ahora)).join('')}</div>`;
  }

  /* ───────── CSV ───────── */

  // Evita que Excel interprete una celda como fórmula (=, +, -, @) si alguien escribió su nombre así.
  function celdaCSV(v) {
    let s = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function csv(lista) {
    const cab = ['Folio', 'Alumno', 'Correo', 'Curso', 'Área', 'Clases', 'Fecha de emisión'];
    const filas = lista.map(c => [c.folio, c.alumno, c.correo, c.curso, c.area, c.clases || '', c.fecha ? c.fecha.toISOString().slice(0, 10) : '']);
    return [cab, ...filas].map(f => f.map(celdaCSV).join(',')).join('\r\n');
  }

  return {
    esc, aFecha, formatoFecha, relativo, normalizar, resumen, cursosConConteo, filtrar,
    urlVer, urlVerificar, iniciales, kpisHTML, opcionesCursoHTML, ordenHTML, filaHTML, listaHTML, celdaCSV, csv
  };
});
