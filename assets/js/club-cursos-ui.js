/* ============================================================ */
/* BIBLIOTECA DE CURSOS · diseño de tarjetas y detalle           */
/* (mismo estilo que alintecfood, con la marca de Zoorigen)      */
/*                                                                */
/* Constructores de HTML SIN efectos: reciben datos ya calculados */
/* y devuelven texto HTML. Todo texto que viene de la base de     */
/* datos se escapa. Se prueba en Node: tests/club-cursos-ui.test.js */
/* La parte final (ventanas) solo corre en el navegador.          */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_CURSOS_UI = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (iconos) {
  'use strict';

  const ico = (n, o) => (iconos && iconos.svg ? iconos.svg(n, o) : '');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Solo http(s) o rutas del propio sitio; cualquier otra cosa (javascript:, data:) se descarta.
  function urlSegura(u) {
    const t = String(u == null ? '' : u).trim();
    if (!t || /[\s"'<>\\]/.test(t)) return '';
    if (/^https:\/\//i.test(t) || /^http:\/\//i.test(t)) return t;
    if (/^(\.\.\/|\.\/|\/(?!\/))[A-Za-z0-9_\-./%?=&]+$/.test(t)) return t;
    return '';
  }

  // Colores de área (todos permiten texto blanco con buen contraste)
  const COLOR_AREA = {
    'Fauna silvestre': '#1F7A4C', 'Fauna ponzoñosa': '#B3261E', 'Apicultura': '#9A5200', 'Etología': '#6445C8',
    'Investigación': '#05609F', 'Manejo en cautiverio': '#08777A', 'Conservación': '#4A5800'
  };
  const colorArea = a => (Object.prototype.hasOwnProperty.call(COLOR_AREA, a) ? COLOR_AREA[a] : '#8A3F02');

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const iniciales = nombre => String(nombre || '').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || 'ZO';
  const lecciones = c => (c && Array.isArray(c.lecciones) ? c.lecciones : []);

  /* ───────────────────────── Textos ───────────────────────── */

  // "Restan 3 días para su desbloqueo" / "Termina primero tu curso de prueba"
  function textoEspera(d) {
    if (!d || d.desbloqueado) return '';
    if (d.motivo === 'termina-prueba') return 'Termina primero tu curso de prueba';
    const n = Number(d.diasFalta);
    if (!Number.isFinite(n)) return 'Aún no disponible';
    return n === 1 ? 'Resta 1 día para su desbloqueo' : `Restan ${n} días para su desbloqueo`;
  }
  function textoFaltan(d) {
    if (!d || d.desbloqueado) return '';
    if (d.motivo === 'termina-prueba') return 'Termina primero tu curso de prueba';
    const n = Number(d.diasFalta);
    if (!Number.isFinite(n)) return 'Aún no disponible';
    return n === 1 ? 'Falta 1 día para su desbloqueo' : `Faltan ${n} días para su desbloqueo`;
  }

  /* ───────────────────────── Tarjetas ───────────────────────── */

  // ctx: { imagen, completadas, certificado, desbloqueo, modo, clasesGratis, esPrueba, abrible }
  //   modo: 'miembro' | 'prueba' | 'pendiente' | 'libre'
  function tarjetaHTML(c, ctx) {
    const x = ctx || {};
    const total = lecciones(c).length;
    const hechas = Number(x.completadas) || 0;
    const pct = total ? Math.round((hechas / total) * 100) : 0;
    const bloqueado = !!x.desbloqueo && !x.desbloqueo.desbloqueado && x.modo === 'miembro';
    const img = urlSegura(x.imagen);
    let insignia = '';
    if (bloqueado) insignia = `<span class="zc-badge zc-badge--lock">${ico('lock', { size: 13 })}${esc(textoEspera(x.desbloqueo))}</span>`;
    else if (x.esPrueba) insignia = `<span class="zc-badge zc-badge--free">${ico('gift', { size: 13 })}${x.clasesGratis ? esc(plural(x.clasesGratis, 'CLASE GRATIS', 'CLASES GRATIS')) : 'TU PRUEBA GRATUITA'}</span>`;
    else if (x.modo === 'libre' && x.clasesGratis) insignia = `<span class="zc-badge zc-badge--free">${ico('gift', { size: 13 })}${esc(plural(x.clasesGratis, 'CLASE GRATIS', 'CLASES GRATIS'))}</span>`;
    else if (c && c.disponibleSiempre === true) insignia = '<span class="zc-badge zc-badge--ok">DISPONIBLE</span>';
    else if (x.modo === 'prueba' || x.modo === 'libre') insignia = `<span class="zc-badge zc-badge--soft">${ico('lock', { size: 13 })}Con membresía</span>`;

    const meta = [
      c.instructor ? `<span>${ico('user', { size: 14 })}${esc(c.instructor)}</span>` : '',
      c.duration ? `<span>${ico('clock', { size: 14 })}${esc(c.duration)}</span>` : '',
      total ? `<span>${ico('book-open', { size: 14 })}${esc(plural(total, 'clase', 'clases'))}</span>` : ''
    ].join('');
    const barra = hechas > 0 && !bloqueado
      ? `<div class="zc-pbar" aria-label="${pct}% completado"><span style="width:${pct}%"></span></div><div class="zc-pinfo"><span>${pct}% completado</span><span>${hechas}/${total}</span></div>` : '';
    const cert = x.certificado ? `<span class="zc-cert">${ico('award', { size: 13 })}Certificado</span>` : '';
    const clases = ['zc-card'];
    if (bloqueado) clases.push('zc-card--locked');
    if (x.abrible !== false) clases.push('zc-card--click');
    return `<article class="${clases.join(' ')}" data-id="${esc(c.id)}"${x.abrible !== false ? ' role="button" tabindex="0"' : ''}>
      <div class="zc-cover${img ? '' : ' zc-cover--vacia'}"${img ? ` style="--zc-img:url('${esc(img)}')"` : ''}></div>
      <div class="zc-tags">${c.area ? `<span class="zc-tag zc-tag--area" style="--zc-area:${colorArea(c.area)}">${esc(c.area)}</span>` : ''}${c.level ? `<span class="zc-tag">${esc(c.level)}</span>` : ''}${c.tag ? `<span class="zc-tag zc-tag--tag">${esc(c.tag)}</span>` : ''}</div>
      <span class="zc-arrow" aria-hidden="true">↗</span>
      ${insignia}
      <div class="zc-body">
        <h3 class="zc-title">${esc(c.title)}</h3>
        <div class="zc-meta">${meta}</div>
        ${cert}${barra}
        <span class="zc-cta">Ver curso →</span>
      </div>
    </article>`;
  }

  // Tarjeta "solo título" para elegir la prueba gratuita
  //   elegible: true (se puede elegir) | false ; motivoNo: texto del botón deshabilitado
  function tarjetaPendienteHTML(c, ctx) {
    const x = ctx || {};
    const img = urlSegura(x.imagen);
    const boton = x.elegible
      ? `<button type="button" class="zc-elegir" data-elegir="${esc(c.id)}">Elegir como prueba gratuita</button>`
      : `<button type="button" class="zc-elegir zc-elegir--no" disabled>${esc(x.motivoNo || 'No disponible como prueba')}</button>`;
    return `<article class="zc-card zc-card--pend${x.elegible ? ' zc-card--click' : ' zc-card--locked'}" data-id="${esc(c.id)}">
      <div class="zc-cover${img ? '' : ' zc-cover--vacia'}"${img ? ` style="--zc-img:url('${esc(img)}')"` : ''}></div>
      <div class="zc-tags">${c.area ? `<span class="zc-tag zc-tag--area" style="--zc-area:${colorArea(c.area)}">${esc(c.area)}</span>` : ''}${c.level ? `<span class="zc-tag">${esc(c.level)}</span>` : ''}</div>
      <div class="zc-body"><h3 class="zc-title">${esc(c.title)}</h3>${boton}</div>
    </article>`;
  }

  function bannerPruebaHTML() {
    return `<div class="zc-banner" id="prueba-card" role="region" aria-label="Prueba gratuita">
      <span class="zc-banner__ico">${ico('gift', { size: 22 })}</span>
      <div><strong>Selecciona el curso de tu preferencia para obtener tu prueba gratuita</strong>
      <p>Solo puedes elegir <b>un</b> curso y después no se puede cambiar.</p></div>
    </div>`;
  }

  /* ───────────────────────── Detalle del curso ───────────────────────── */

  // Estado de una fila (clase) de la lista del detalle.
  // a: { hecha, anteriorHecha, esPrimera, esMiembro, gratis, espera (desbloqueo del curso), esSiguiente }
  // Devuelve { estado, texto, accion }  accion: 'abrir' | 'paywall' | 'aviso-orden' | 'aviso-espera'
  function estadoClase(a) {
    const x = a || {};
    if (x.espera && !x.espera.desbloqueado) return { estado: 'espera', texto: textoFaltan(x.espera), accion: 'aviso-espera' };
    if (!x.esMiembro) {
      if (!x.gratis) return { estado: 'paywall', texto: 'Activa tu membresía para ver esta clase', accion: 'paywall' };
      if (x.hecha) return { estado: 'hecha', texto: 'Vista · click para repasar', accion: 'abrir' };
      if (x.esPrimera || x.anteriorHecha) return { estado: 'gratis', texto: 'CLASE GRATIS · Click para verla', accion: 'abrir' };
      return { estado: 'orden', texto: 'Clase gratuita · marca como vista la anterior para desbloquear', accion: 'aviso-orden' };
    }
    if (x.hecha) return { estado: 'hecha', texto: 'Vista · click para repasar', accion: 'abrir' };
    if (x.esPrimera || x.anteriorHecha) return { estado: x.esSiguiente ? 'siguiente' : 'abierta', texto: x.esSiguiente ? 'Siguiente clase · click para verla' : 'Click para ver la clase', accion: 'abrir' };
    return { estado: 'orden', texto: 'Marca como vista la clase anterior para desbloquear', accion: 'aviso-orden' };
  }

  // fila: { i, titulo, duracion, estado, texto, accion, preguntas, juego }
  function filaClaseHTML(f, imagen) {
    const img = urlSegura(imagen);
    const num = f.estado === 'hecha' ? ico('check', { size: 16 })
      : (f.estado === 'paywall' || f.estado === 'orden' || f.estado === 'espera') ? ico('lock', { size: 16 })
      : esc(f.i + 1);
    const chips = [
      f.preguntas ? `<span class="zc-chip">${ico('circle-help', { size: 12 })}${esc(plural(f.preguntas, 'pregunta', 'preguntas'))}</span>` : '',
      f.juego ? `<span class="zc-chip zc-chip--juego">${ico('gamepad-2', { size: 12 })}${esc(f.juego)}</span>` : ''
    ].join('');
    return `<li class="zc-fila zc-fila--${esc(f.estado)}" data-i="${esc(f.i)}" data-accion="${esc(f.accion)}" role="button" tabindex="0">
      <span class="zc-num">${num}</span>
      <span class="zc-thumb"${img ? ` style="--zc-img:url('${esc(img)}')"` : ''}></span>
      <span class="zc-info"><strong>${esc(f.titulo)}</strong><small>${esc(f.texto)}${f.duracion ? ` · ${esc(f.duracion)}` : ''}</small>${chips ? `<span class="zc-chips">${chips}</span>` : ''}</span>
      <span class="zc-go" aria-hidden="true">→</span>
    </li>`;
  }

  // d: { curso, imagen, completadas, total, filas:[...], espera, accionPrincipal:{texto, onclick}|null, certificadoHTML, aviso:{html}|null, etiquetaPrueba }
  function detalleHTML(d) {
    const c = d.curso || {};
    const img = urlSegura(d.imagen);
    const total = Number(d.total) || lecciones(c).length;
    const hechas = Number(d.completadas) || 0;
    const pct = total ? Math.round((hechas / total) * 100) : 0;
    const autor = c.instructor || 'Equipo Zoorigen';
    const aviso = d.espera && !d.espera.desbloqueado
      ? `<div class="zc-aviso">${ico('lock', { size: 18 })}<span><b>${esc(textoFaltan(d.espera))}.</b> Mientras tanto puedes ver de qué trata y qué clases incluye.</span></div>`
      : (d.avisoHTML ? `<div class="zc-aviso zc-aviso--info"><span>${d.avisoHTML}</span></div>` : '');
    const principal = d.accionPrincipal
      ? `<button type="button" class="zc-continuar" data-zc="${esc(d.accionPrincipal.id)}">${esc(d.accionPrincipal.texto)}</button>` : '';
    return `<div class="zc-detail">
      <section class="zc-hero${img ? '' : ' zc-hero--vacia'}"${img ? ` style="--zc-img:url('${esc(img)}')"` : ''}>
        <div class="zc-hero__tags">${c.area ? `<span class="zc-tag zc-tag--area" style="--zc-area:${colorArea(c.area)}">${esc(c.area)}</span>` : ''}${c.level ? `<span class="zc-tag">${esc(c.level)}</span>` : ''}${d.etiquetaPrueba ? `<span class="zc-tag zc-tag--free">${esc(d.etiquetaPrueba)}</span>` : ''}</div>
        <h2 class="zc-hero__title">${esc(c.title)}</h2>
        <div class="zc-hero__meta">${c.instructor ? `<span>${ico('user', { size: 14 })}${esc(c.instructor)}</span>` : ''}${c.duration ? `<span>${ico('clock', { size: 14 })}${esc(c.duration)}</span>` : ''}<span>${ico('book-open', { size: 14 })}${esc(plural(total, 'clase', 'clases'))}</span></div>
        <div class="zc-hero__foot">
          <div class="zc-autor"><span class="zc-autor__ini">${esc(iniciales(autor))}</span><div><strong>${esc(autor)}</strong><small>Curso especializado · Zoorigen</small></div></div>
          <div class="zc-hero__acc">${d.certificadoHTML || ''}${principal}</div>
        </div>
      </section>
      ${c.description ? `<p class="zc-desc">${esc(c.description)}</p>` : ''}
      ${aviso}
      <div class="zc-sec"><h3>${ico('clapperboard', { size: 14 })}CLASES DEL CURSO</h3><span>${hechas}/${total} · ${pct}%</span></div>
      <div class="zc-bar"><span style="width:${pct}%"></span></div>
      <ol class="zc-lista">${(d.filas || []).map(f => filaClaseHTML(f, d.imagen)).join('')}</ol>
    </div>`;
  }

  /* ───────────────────────── Ventanas (solo navegador) ───────────────────────── */

  // Ventana sencilla: { titulo, subtitulo, cuerpoHTML, botones:[{texto, clase, alPulsar}], alCerrar }. Devuelve { cerrar() }.
  function ventana(o) {
    const ov = document.createElement('div');
    ov.className = 'zc-ov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="zc-modal" tabindex="-1">
      <header><div><h3>${esc(o.titulo)}</h3>${o.subtitulo ? `<p>${esc(o.subtitulo)}</p>` : ''}</div></header>
      <div class="zc-modal__cuerpo">${o.cuerpoHTML || ''}</div>
      <footer></footer></div>`;
    const pie = ov.querySelector('footer');
    let cerrado = false;
    const cerrar = () => { if (cerrado) return; cerrado = true; ov.remove(); document.removeEventListener('keydown', tecla, true); if (typeof o.alCerrar === 'function') o.alCerrar(); };
    const tecla = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } };
    (o.botones || []).forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'zc-btn ' + (b.clase || ''); btn.textContent = b.texto;
      btn.addEventListener('click', async () => { if (b.alPulsar) { const r = await b.alPulsar({ cerrar, boton: btn }); if (r === false) return; } cerrar(); });
      pie.appendChild(btn);
    });
    ov.addEventListener('click', ev => { if (ev.target === ov) cerrar(); });
    document.addEventListener('keydown', tecla, true);
    document.body.appendChild(ov);
    const primero = pie.querySelector('.zc-btn--main') || pie.querySelector('button');
    if (primero) primero.focus();
    return { cerrar, el: ov };
  }

  return {
    esc, urlSegura, colorArea, textoEspera, textoFaltan,
    tarjetaHTML, tarjetaPendienteHTML, bannerPruebaHTML,
    estadoClase, filaClaseHTML, detalleHTML, ventana
  };
});
