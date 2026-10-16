/* ============================================================ */
/* PANEL ADMIN · CERTIFICADOS EMITIDOS                           */
/* Lista, estadísticas, búsqueda, filtro por curso, enlaces de   */
/* verificación y exportación a CSV. La emisión manual NO escribe */
/* en Firestore: pide al servidor POST /api/admin/certificados    */
/* (folio único, validación y nombre del alumno los pone el       */
/* servidor). Se prueba en tests/admin-certificados.test.js       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'), require('./admin-filas.js'));
  else root.ZOO_ADMIN_CERTS = factory(root.ZOO_ICONOS, root.ZOO_ADMIN_FILAS);
})(typeof self !== 'undefined' ? self : this, function (iconos, filas) {
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
      duracion: texto(d.courseDuration) || (Number(d.horas) > 0 ? Number(d.horas) + ' h' : ''),
      clases: Number(d.totalClases) || Number(d.sesiones) || 0,
      fecha: aFecha(d.issuedAt || d.emitido),
      prueba: d._test === true || d.courseId === 'test',
      // true cuando lo emitió/validó el servidor; sin esto es un certificado anterior a la validación
      verificado: d.verificado === true
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

  // Fila compacta: alumno y correo, curso y fecha (en pantallas anchas), insignias y UN menú «…». Tocar la fila abre el certificado.
  function filaHTML(c, ahora) {
    const t = ahora == null ? Date.now() : ahora;
    const ver = urlVer(c.folio);
    const detalleCurso = [c.area, c.clases ? `${c.clases} clase${c.clases === 1 ? '' : 's'}` : '', c.duracion].filter(Boolean).map(esc).join(' · ');
    const estado = (c.prueba ? '<span class="ap-badge ap-badge--aviso">Prueba</span>' : '') +
      (!c.verificado && !c.prueba ? '<span class="ap-badge ap-badge--neutro" title="Anterior a la validación del servidor">En validación</span>' : '');
    return filas.fila({
      avatar: `<span class="ap-avatar" aria-hidden="true">${esc(iniciales(c.alumno))}</span>`,
      titulo: c.alumno || 'Sin nombre', accion: { h: ver },
      meta: `<span class="ap-fc__correo">${esc(c.correo || 'Sin correo')}</span>` + (estado ? ' ' + estado : '') + `<span class="ap-fc__folio"> · <code>${esc(c.folio)}</code></span>`,
      metaChico: `<span class="ap-fc__sep"> · </span>${esc(c.curso || 'Curso sin nombre')}`,
      cols: [
        { html: `<span class="ap-fc__v" title="${esc(c.curso || 'Curso sin nombre')}">${esc(c.curso || 'Curso sin nombre')}</span><span class="ap-fc__s">${detalleCurso || '—'}</span>` },
        { html: `<span class="ap-fc__v">${esc(formatoFecha(c.fecha))}</span><span class="ap-fc__s">${esc(relativo(c.fecha, t))}</span>` }
      ],
      acciones: [
        { t: 'Ver certificado', i: 'eye', h: ver },
        { t: 'Copiar enlace de verificación', i: 'copy', a: 'copiar' },
        { t: 'Verificar (vista pública)', i: 'shield-check', h: urlVerificar(c.folio) }
      ],
      etiquetaMenu: `Acciones del certificado ${c.folio} de ${c.alumno || 'sin nombre'}`, datos: { folio: c.folio }, atributos: { folio: c.folio }
    });
  }

  function listaHTML(lista, ahora) {
    if (!lista.length) return `<div class="no-data cc-vacio">${ico('award', { size: 28 })}<p>No hay certificados que coincidan con la búsqueda.</p></div>`;
    return filas.lista(lista.map(c => filaHTML(c, ahora)), { etiqueta: 'Certificados emitidos', cab: { principal: 'Alumno', cols: ['Curso', 'Emitido'] } });
  }

  /* ───────── Emisión manual (POST /api/admin/certificados) ───────── */

  // Revisa el formulario y arma el cuerpo que se manda al servidor: { uid, cursoId, nombre?, horas?, sesiones? }.
  // Devuelve { ok:true, cuerpo } o { ok:false, error } (texto para mostrar).
  function cuerpoEmision(form) {
    const f = form || {};
    const uid = texto(f.uid);
    const cursoId = texto(f.cursoId);
    if (!uid) return { ok: false, error: 'Elige al alumno.' };
    if (uid.length > 128) return { ok: false, error: 'El alumno elegido no es válido.' };
    if (!cursoId) return { ok: false, error: 'Elige el curso.' };
    if (cursoId.length > 120) return { ok: false, error: 'El curso elegido no es válido.' };
    const cuerpo = { uid, cursoId };
    const nombre = texto(f.nombre).replace(/\s+/g, ' ');
    if (nombre) {
      if (nombre.length > 60) return { ok: false, error: 'El nombre del certificado no puede pasar de 60 letras.' };
      cuerpo.nombre = nombre;
    }
    const horasTxt = texto(f.horas).replace(',', '.');
    if (horasTxt) {
      const h = Number(horasTxt);
      if (!Number.isFinite(h) || h <= 0 || h > 1000) return { ok: false, error: 'Las horas deben ser un número mayor que 0 (por ejemplo 6 o 7.5).' };
      cuerpo.horas = Math.round(h * 10) / 10;
    }
    const sesTxt = texto(f.sesiones);
    if (sesTxt) {
      const s = Number(sesTxt);
      if (!Number.isInteger(s) || s < 1 || s > 500) return { ok: false, error: 'Las clases deben ser un número entero entre 1 y 500.' };
      cuerpo.sesiones = s;
    }
    return { ok: true, cuerpo };
  }

  // Mensaje para el administrador según el error del servidor (err.status, err.message).
  function mensajeErrorEmision(err) {
    const e = err || {};
    const s = Number(e.status);
    if (s === 0) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    if (s === 401) return 'Tu sesión expiró. Vuelve a entrar al panel.';
    if (s === 403) return 'El servidor no te reconoce como administrador.';
    if (s === 404) return 'No se encontró al alumno o el curso en el servidor.';
    if (s === 409) return texto(e.message) || 'Ese alumno ya tiene un certificado de este curso.';
    if (s === 503) return 'Los certificados todavía no están configurados en el servidor.';
    return texto(e.message) || 'No se pudo emitir el certificado. Inténtalo de nuevo.';
  }

  // miembros: [{ id, name, email }], cursos: [{ id, title }]
  function modalEmitirHTML(miembros, cursos) {
    const nombreDe = m => texto(m.name || m.nombre) || texto(m.email) || m.id;
    const ms = (Array.isArray(miembros) ? miembros : []).slice().sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es', { sensitivity: 'base' }));
    const cs = (Array.isArray(cursos) ? cursos : []).slice().sort((a, b) => texto(a.title).localeCompare(texto(b.title), 'es', { sensitivity: 'base' }));
    const opM = ms.map(m => `<option value="${esc(m.id)}">${esc(nombreDe(m))}${m.email && nombreDe(m) !== texto(m.email) ? ' · ' + esc(m.email) : ''}</option>`).join('');
    const opC = cs.map(c => `<option value="${esc(c.id)}">${esc(texto(c.title) || 'Curso sin nombre')}</option>`).join('');
    return `
      <h3>Emitir certificado manualmente</h3>
      <p style="color:var(--zoo-text-muted);font-size:.9rem;margin-bottom:14px;">
        El servidor crea el certificado con folio único y lo deja verificado. Úsalo solo para casos especiales
        (por ejemplo, un alumno que terminó el curso por otra vía).
      </p>
      <div class="field">
        <label for="certEmUid">Alumno</label>
        <select id="certEmUid"><option value="">Elige un alumno…</option>${opM}</select>
      </div>
      <div class="field">
        <label for="certEmCurso">Curso</label>
        <select id="certEmCurso"><option value="">Elige un curso…</option>${opC}</select>
      </div>
      <div class="field">
        <label for="certEmNombre">Nombre en el certificado (opcional)</label>
        <input type="text" id="certEmNombre" maxlength="60" placeholder="Si lo dejas vacío se usa el nombre de la cuenta">
      </div>
      <div class="field">
        <label for="certEmHoras">Horas (opcional)</label>
        <input type="text" inputmode="decimal" id="certEmHoras" placeholder="Si lo dejas vacío se usa la duración del curso">
      </div>
      <div class="field">
        <label for="certEmSesiones">Clases (opcional)</label>
        <input type="text" inputmode="numeric" id="certEmSesiones" placeholder="Si lo dejas vacío se usan las clases del curso">
      </div>
      <p id="certEmError" class="error-msg" role="alert" style="display:none;"></p>
      <div class="modal-actions">
        <button class="btn-cancel" type="button" onclick="closeM()">Cancelar</button>
        <button class="btn-save" type="button" id="certEmEnviar">Emitir certificado</button>
      </div>`;
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
    urlVer, urlVerificar, iniciales, kpisHTML, opcionesCursoHTML, ordenHTML, filaHTML, listaHTML, celdaCSV, csv,
    cuerpoEmision, mensajeErrorEmision, modalEmitirHTML
  };
});
