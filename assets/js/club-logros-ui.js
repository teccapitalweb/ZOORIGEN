/* ============================================================ */
/* MIS LOGROS · constructores de HTML                             */
/*                                                                */
/* Reciben los datos YA normalizados de GET /api/premios          */
/* (ZOO_PREMIOS.normalizar) y devuelven texto HTML. Sin efectos y  */
/* sin datos propios: todo lo que se muestra viene del servidor.  */
/* Todo texto que viene de fuera se escapa. Sin emojis: íconos     */
/* Lucide de ZOO_ICONOS. Se prueba en Node: tests/club-logros.test.js */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'), require('./club-premios.js'));
  else root.ZOO_LOGROS_UI = factory(root.ZOO_ICONOS, root.ZOO_PREMIOS);
})(typeof self !== 'undefined' ? self : this, function (iconos, PREMIOS) {
  'use strict';

  const ico = (n, o) => (iconos && iconos.svg ? iconos.svg(n, o) : '');
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const plural = (n, uno, varios) => `${fmt(n)} ${n === 1 ? uno : varios}`;

  const TEXTO_VISTA_PREVIA = 'Para ver el detalle, sumar XP y ganar premios necesitas una suscripción activa.';

  /* ───────────── Categorías de insignias ───────────── */

  // Orden fijo de las conocidas; cualquier otra categoría que mande el servidor va después, en el orden en que llega.
  const CATEGORIAS = [
    { clave: 'inicio', nombre: 'Inicio', icono: 'door-open', color: '#2AA4D5' },
    { clave: 'cursos', nombre: 'Cursos', icono: 'graduation-cap', color: '#4FB86A' },
    { clave: 'constancia', nombre: 'Constancia', icono: 'flame', color: '#E0693A' },
    { clave: 'comunidad', nombre: 'Comunidad', icono: 'users', color: '#C8607E' },
    { clave: 'retos', nombre: 'Retos', icono: 'target', color: '#E8A317' },
    { clave: 'maestria', nombre: 'Maestría', icono: 'crown', color: '#2FB5A0' }
  ];
  const CAT_OTRA = { icono: 'award', color: '#8FA39A' };
  const sinAcentos = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  function agruparPorCategoria(logros) {
    const grupos = [];
    const porClave = {};
    (Array.isArray(logros) ? logros : []).forEach(l => {
      const k = sinAcentos(l.categoria) || 'otros';
      if (!porClave[k]) {
        const conocida = CATEGORIAS.find(c => c.clave === k);
        porClave[k] = { clave: k, nombre: conocida ? conocida.nombre : (l.categoria || 'Otros'), icono: conocida ? conocida.icono : CAT_OTRA.icono, color: conocida ? conocida.color : CAT_OTRA.color, logros: [] };
        grupos.push(porClave[k]);
      }
      porClave[k].logros.push(l);
    });
    const orden = k => { const i = CATEGORIAS.findIndex(c => c.clave === k); return i < 0 ? 999 : i; };
    return grupos.map((g, i) => ({ g, i })).sort((a, b) => (orden(a.g.clave) - orden(b.g.clave)) || (a.i - b.i)).map(x => x.g);
  }

  /* ───────────── Avisos ───────────── */

  function avisoVistaPreviaHTML() {
    return `<div class="lg-aviso" role="note">${ico('lock', { size: 20 })}
      <div><strong>Vista previa.</strong> Puedes ver tu nivel y los nombres de las insignias. ${esc(TEXTO_VISTA_PREVIA)}</div>
      <a class="lg-btn lg-btn--chico" href="club-suscripcion.html">Ver suscripción</a></div>`;
  }

  function cargandoHTML() {
    return `<div class="lg-cargando" role="status" aria-live="polite"><span class="lg-cargando__punto"></span>Cargando tus logros…</div>`;
  }

  // Si el servidor no responde: mensaje claro y reintentar. No se muestra ningún dato inventado.
  function errorHTML(mensaje) {
    return `<div class="lg-error" role="alert">
      <span class="lg-error__ico">${ico('cloud-off', { size: 34 })}</span>
      <h2>No pudimos cargar tus logros</h2>
      <p>${esc(mensaje || 'No hay respuesta del servidor por ahora. Revisa tu conexión e inténtalo de nuevo.')}</p>
      <p class="lg-error__nota">No mostramos tu nivel ni tus puntos si no podemos confirmarlos.</p>
      <button type="button" class="lg-btn" data-accion="reintentar">${ico('refresh-cw', { size: 16 })}Reintentar</button></div>`;
  }

  /* ───────────── Nivel: ruta de 5 nodos y medidor ───────────── */

  function porcentajeNivel(nivel, xpTotal, niveles) {
    if (nivel.id >= (niveles || PREMIOS.NIVELES).length) return 100;
    const rango = nivel.hasta - nivel.desde;
    if (!(rango > 0)) return 100;
    return Math.max(0, Math.min(100, Math.round(((xpTotal - nivel.desde) / rango) * 100)));
  }

  // Los niveles y sus umbrales los manda el servidor (d.niveles). PREMIOS.NIVELES solo es respaldo.
  const nivelesDe = d => (d && Array.isArray(d.niveles) && d.niveles.length >= 2 ? d.niveles : PREMIOS.NIVELES);

  function rutaHTML(nivel, pct, niveles) {
    const NIVELES = Array.isArray(niveles) && niveles.length >= 2 ? niveles : PREMIOS.NIVELES;
    const avance = nivel.id >= NIVELES.length ? 100 : Math.round((((nivel.id - 1) + pct / 100) / (NIVELES.length - 1)) * 100);
    return `<div class="lg-ruta" role="group" aria-label="Ruta de niveles: nivel ${nivel.id} de ${NIVELES.length}">
      <div class="lg-ruta__riel" aria-hidden="true"><i style="width:${avance}%"></i></div>
      <ol class="lg-ruta__nodos">${NIVELES.map(n => {
        const estado = n.id < nivel.id ? 'is-hecho' : (n.id === nivel.id ? 'is-actual' : 'is-sig');
        return `<li class="lg-nodo ${estado}"${n.id === nivel.id ? ' aria-current="step"' : ''}><b>${n.id < nivel.id ? ico('check', { size: 15, trazo: 3 }) : n.id}</b><small>${esc(n.nombre)}</small><em class="lg-nodo__xp">${fmt(n.desde)} XP</em></li>`;
      }).join('')}</ol></div>`;
  }

  function medidorHTML(d, pct) {
    const { nivel, xp } = d;
    const maximo = nivel.id >= nivelesDe(d).length;
    const siguiente = maximo ? null : nivelesDe(d)[nivel.id];
    const faltan = Math.max(0, nivel.faltan);
    return `<div class="lg-orbita">
      <div class="lg-medidor" role="img" aria-label="${pct}% de avance${siguiente ? ' hacia ' + esc(siguiente.nombre) : ''}">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="lg-medidor__pista" cx="60" cy="60" r="52" pathLength="100"></circle><circle class="lg-medidor__valor" cx="60" cy="60" r="52" pathLength="100" style="stroke-dasharray:${pct} 100"></circle></svg>
        <span><strong>${pct}%</strong><small>avance</small></span></div>
      <div class="lg-orbita__txt">
        <span class="lg-eyebrow">${maximo ? 'Rango máximo' : 'Siguiente rango'}</span>
        <strong>${maximo ? 'Nivel máximo alcanzado' : esc(siguiente.nombre)}</strong>
        <p>${maximo ? 'Completaste toda la ruta de niveles. Gracias por tu constancia.' : `Te faltan <b>${fmt(faltan)} XP</b> para el siguiente rango. Cada insignia, reto e invitado válido te acerca.`}</p>
        <div class="lg-cifras">
          <span><b>${fmt(xp.total)}</b> XP en total</span>
          <span>${maximo ? '<b>Nivel máximo</b>' : '<b>' + fmt(nivel.hasta) + '</b> XP para el siguiente nivel'}</span>
        </div></div></div>`;
  }

  // De dónde viene el XP: las cinco fuentes que cuenta el servidor, más el total. El segundo renglón es una nota corta bajo el nombre.
  function desgloseHTML(xp, cursos) {
    const terminados = cursos && Number.isFinite(Number(cursos.terminados)) ? Number(cursos.terminados) : null;
    const fila = (icono, nombre, valor, extra) => `<li>${ico(icono, { size: 16 })}<span>${nombre}${extra ? `<small>${extra}</small>` : ''}</span><b>${fmt(valor)} XP</b></li>`;
    return `<ul class="lg-desglose" aria-label="De dónde viene tu XP">${fila('award', 'Logros', xp.logros)}${fila('target', 'Retos', xp.retos)}${fila('user-plus', 'Invitados', xp.referidos)}${fila('graduation-cap', 'Cursos', xp.cursos, terminados === null ? '' : plural(terminados, 'terminado', 'terminados'))}${fila('gift', 'Bienvenida', xp.bienvenida)}${fila('zap', 'Total', xp.total)}</ul>`;
  }

  function heroHTML(d) {
    const { nivel } = d;
    const pct = porcentajeNivel(nivel, d.xp.total, nivelesDe(d));
    const racha = d.membresia ? `<div class="lg-racha" title="Días seguidos con actividad">${ico('flame', { size: 18 })}<b>${fmt(d.racha)}</b><small>${d.racha === 1 ? 'día de racha' : 'días de racha'}</small></div>` : '';
    // El nivel y el XP se ven SIEMPRE (también sin membresía, en solo lectura): son el mismo total que muestran Retos y el panel del perfil.
    const cuerpo = medidorHTML(d, pct) + desgloseHTML(d.xp, d.cursos);
    return `<section class="lg-hero" aria-label="Tu nivel">
      <div class="lg-hero__cab">
        <div class="lg-hero__medalla">${ico('trophy', { size: 34 })}</div>
        <div class="lg-hero__tit"><span class="lg-eyebrow">Nivel ${nivel.id} de ${nivelesDe(d).length}</span><h2>${esc(nivel.nombre)}</h2><p>${fmt(d.xp.total)} XP en total</p></div>
        ${racha}
      </div>
      ${rutaHTML(nivel, pct, nivelesDe(d))}
      ${cuerpo}</section>`;
  }

  /* ───────────── Indicadores ───────────── */

  function kpisHTML(d) {
    const ganados = d.logros.filter(l => l.ganado).length;
    const v = valor => (d.membresia ? valor : '—');
    const kpi = (icono, rotulo, valor, sub) => `<div class="lg-kpi"><span class="lg-kpi__ico">${ico(icono, { size: 20 })}</span><div><div class="lg-kpi__val">${valor}${sub ? `<small>${sub}</small>` : ''}</div><div class="lg-kpi__rot">${rotulo}</div></div></div>`;
    return `<div class="lg-kpis">
      ${kpi('award', 'Logros ganados', v(fmt(ganados)), d.membresia ? '/' + fmt(d.logros.length) : '')}
      ${kpi('zap', 'XP total', fmt(d.xp.total))}
      ${kpi('calendar', 'Días activos', v(fmt(d.diasActivos)))}
      ${kpi('flame', 'Racha', v(fmt(d.racha)), d.membresia ? (d.racha === 1 ? 'día' : 'días') : '')}
      ${kpi('graduation-cap', 'Cursos terminados', fmt(d.cursos ? d.cursos.terminados : 0))}</div>`;
  }

  /* ───────────── Insignias por categoría ───────────── */

  function insigniaHTML(l, miembro, color, icono) {
    const ganada = miembro && l.ganado;
    return `<article class="lg-ins ${ganada ? 'is-ganada' : 'is-bloqueada'}" style="--cat:${color}">
      <span class="lg-ins__ico">${ico(ganada ? icono : 'lock', { size: 26 })}</span>
      <h4>${esc(l.nombre)}</h4>
      ${miembro && l.descripcion ? `<p>${esc(l.descripcion)}</p>` : ''}
      ${miembro ? `<span class="lg-ins__xp">${ganada ? ico('check', { size: 13, trazo: 3 }) + 'Ganada · ' : ''}+${fmt(l.xp)} XP</span>` : ''}</article>`;
  }

  function categoriasHTML(d) {
    if (!d.logros.length) return `<p class="lg-vacio">Todavía no hay insignias para mostrar.</p>`;
    return agruparPorCategoria(d.logros).map(g => {
      const hechos = g.logros.filter(l => l.ganado).length;
      return `<section class="lg-cat" style="--cat:${g.color}">
        <header><span class="lg-cat__ico">${ico(g.icono, { size: 20 })}</span><h3>${esc(g.nombre)}</h3>
        <span class="lg-cat__cuenta">${d.membresia ? `${fmt(hechos)}/${fmt(g.logros.length)}` : plural(g.logros.length, 'insignia', 'insignias')}</span></header>
        <div class="lg-ins-grid">${g.logros.map(l => insigniaHTML(l, d.membresia, g.color, g.icono)).join('')}</div></section>`;
    }).join('');
  }

  /* ───────────── Premios ───────────── */

  // Los tres premios, en orden, con su estado visible. ctx: { titulosCursos:{id:titulo}, faltanInvitados:{clave:n} }
  function premiosVista(d, ctx) {
    const x = ctx || {};
    const titulos = x.titulosCursos || {};
    const faltanInv = x.faltanInvitados || {};
    const delServidor = {};
    d.premios.forEach(p => { delServidor[p.clave] = p; });
    const claves = PREMIOS.PREMIOS_INFO.map(i => i.clave);
    const extras = d.premios.filter(p => claves.indexOf(p.clave) < 0 && p.clave !== 'referidos-2').map(p => ({ clave: p.clave, titulo: p.titulo || p.clave, tipo: 'otro', umbral: 0, descripcion: p.descripcion, requisito: p.requisito }));
    return PREMIOS.PREMIOS_INFO.concat(extras).map(info => {
      const s = delServidor[info.clave] || null;
      const usado = s && s.usado ? s.usado : null;
      const ganado = !!(s && (s.ganado || s.usado));
      const disponible = !!(s && s.disponible && !usado);
      let faltan = null, unidad = '';
      if (!ganado) {
        if (info.tipo === 'xp') { unidad = 'XP'; faltan = s && s.faltan != null ? s.faltan : Math.max(0, info.umbral - d.xp.total); }
        else if (info.tipo === 'invitados') { unidad = 'invitados'; faltan = s && s.faltan != null ? s.faltan : (Number.isFinite(Number(faltanInv[info.clave])) ? Number(faltanInv[info.clave]) : null); }
      }
      let estado, chip;
      if (!d.membresia) { estado = 'bloqueado'; chip = { icono: 'lock', texto: 'Con suscripción' }; }
      else if (usado) { estado = 'usado'; chip = { icono: 'check', texto: 'Usado: ' + (titulos[usado.cursoId] || 'un curso') }; }
      else if (disponible) { estado = 'disponible'; chip = { icono: 'circle-check', texto: 'Disponible' }; }
      else if (ganado) { estado = 'ganado'; chip = { icono: 'circle-check', texto: 'Ganado' }; }
      else {
        estado = 'bloqueado';
        chip = faltan === null
          ? { icono: 'lock', texto: 'Requiere ' + (info.requisito || 'más avance') }
          : { icono: 'lock', texto: 'Te faltan ' + fmt(faltan) + ' ' + (unidad === 'invitados' && faltan === 1 ? 'invitado' : unidad) };
      }
            // Invitar amigos es solo para miembros: a quien no lo es no se le promete un premio que no puede ganar invitando.
      const soloMiembros = !d.membresia && info.tipo === 'invitados';
      const descripcion = soloMiembros ? 'Invitar amigos es para miembros. Con tu membresía, 4 invitados válidos abren un curso antes de su fecha.' : (info.descripcion || '');
      return { clave: info.clave, titulo: info.titulo, tipo: info.tipo, descripcion, requisito: soloMiembros ? '' : (info.requisito || ''), estado, chip, faltan, soloMiembros };
    });
  }

  const ICONO_PREMIO = { profesional: 'trophy', maestro: 'crown', 'referidos-1': 'user-plus' };

  function premiosHTML(d, ctx) {
    const tiers = premiosVista(d, ctx);
    const disp = d.membresia ? d.disponibles : 0;
    const boton = d.membresia && disp > 0
      ? `<button type="button" class="lg-btn" data-accion="elegir">${ico('trophy', { size: 17 })}Elegir mi curso</button>` : '';
    return `<section class="lg-premios" aria-label="Premios">
      <div class="lg-premios__cab">
        <div class="lg-premios__copa">${ico('trophy', { size: 38 })}</div>
        <div class="lg-premios__intro"><span class="lg-eyebrow">Premios · Recompensas de trayectoria</span><h2>Tu progreso también <em>abre puertas.</em></h2>
          <p>Cada premio abre <strong>un curso</strong> antes de su fecha, el que tú elijas. ${d.membresia ? 'Se ganan al subir de nivel o al invitar amigos que de verdad se unan.' : 'Se ganan al subir de nivel; con tu membresía también al invitar amigos.'}</p></div>
        <div class="lg-premios__cuenta"><b>${fmt(disp)}</b><span>${disp === 1 ? 'premio disponible' : 'premios disponibles'}</span></div>
      </div>
      <div class="lg-premios__cuerpo"><div class="lg-tiers">${tiers.map((t, i) => `
        <article class="lg-tier lg-tier--${t.estado}" data-premio="${esc(t.clave)}">
          <div class="lg-tier__medalla">${ico(ICONO_PREMIO[t.clave] || 'award', { size: 24 })}<small>${String(i + 1).padStart(2, '0')}</small></div>
          <div class="lg-tier__txt"><span>${t.tipo === 'invitados' ? 'Invitaciones' : 'Meta de trayectoria'}</span><h3>${esc(t.titulo)}</h3>
            <p>${esc(t.descripcion)}${t.requisito ? ` <b>· ${esc(t.requisito)}</b>` : ''}</p></div>
          <div class="lg-tier__estado"><span class="lg-chip lg-chip--${t.estado}">${ico(t.chip.icono, { size: 14 })}<span>${esc(t.chip.texto)}</span></span></div>
        </article>`).join('')}</div>${boton ? `<div class="lg-premios__acc">${boton}</div>` : ''}</div></section>`;
  }

  /* ───────────── Página completa ───────────── */

  function paginaHTML(d, ctx) {
    return (d.membresia ? '' : avisoVistaPreviaHTML()) + heroHTML(d) + premiosHTML(d, ctx) + kpisHTML(d) + categoriasHTML(d);
  }

  return {
    TEXTO_VISTA_PREVIA, CATEGORIAS, esc, fmt, agruparPorCategoria, porcentajeNivel,
    avisoVistaPreviaHTML, cargandoHTML, errorHTML, rutaHTML, medidorHTML, desgloseHTML, heroHTML, kpisHTML, insigniaHTML, categoriasHTML,
    premiosVista, premiosHTML, paginaHTML
  };
});
