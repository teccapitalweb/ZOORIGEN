/* ============================================================ */
/* PANEL ADMIN · MIEMBROS — datos reales                         */
/* Lógica pura (sin Firebase): clasifica, resume y dibuja filas. */
/* Se prueba en tests/admin-miembros.test.js                     */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ADMIN_MIEMBROS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Todo texto que escribe un miembro (nombre, correo, teléfono) se escapa antes de
  // llegar a innerHTML: cualquiera puede registrarse con un nombre arbitrario.
  function esc(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  const ORIGEN_ETIQUETA = {
    stripe: 'Stripe', manual: 'Manual', heredado: 'Heredado (Shopify)', otro: 'Otro', ninguno: '—'
  };

  const ESTADO_ETIQUETA = {
    active: { texto: '● Activo', clase: 'active' },
    cancelled_active: { texto: '⏳ Acceso vigente (cancelado)', clase: 'active' },
    past_due: { texto: '⚠ Pago pendiente', clase: 'cancelled' },
    expired: { texto: '✕ Vencido', clase: 'cancelled' },
    pending_payment: { texto: '⏳ Sin pago', clase: 'pending' }
  };

  function origenDe(m) {
    if (m.stripeSubscriptionId) return 'stripe';
    if (m.activadoManualmente) return 'manual';
    if (m.shopifyOrderId || m.viaShopify || typeof m.planVence === 'string') return 'heredado';
    return (m.planVence || m.ultimoPago) ? 'otro' : 'ninguno';
  }

  // "en 8 días", "hace 4 meses": para ver de un vistazo quién vence pronto.
  function relativo(fecha, ahora = Date.now()) {
    if (!fecha) return '';
    const dias = Math.round((fecha.getTime() - ahora) / 86400000);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias === -1) return 'ayer';
    const n = Math.abs(dias);
    const lapso = n < 60 ? `${n} días` : n < 700 ? `${Math.round(n / 30)} meses` : `${Math.round(n / 365)} años`;
    return dias > 0 ? `en ${lapso}` : `hace ${lapso}`;
  }

  // club = ZOORIGEN_CLUB (calculateStatus y toDate); se inyecta para no duplicar la regla.
  function analizar(m, club) {
    const estado = club.calculateStatus(m);
    const vence = club.toDate(m.planVence || m.fechaExpiracion);
    const registro = club.toDate(m.createdAt);
    const conAcceso = estado === 'active' || estado === 'cancelled_active';
    const avisos = [];

    if (!m.createdAt) avisos.push({ id: 'sin-registro', texto: 'Sin fecha de registro', detalle: 'El panel anterior ocultaba a los miembros sin este campo.' });
    if (m.planActivo === true && estado === 'expired') avisos.push({ id: 'activo-vencido', texto: 'Marcado activo, ya venció', detalle: 'Quedó la etiqueta de activo, pero su periodo ya terminó. No tiene acceso.' });
    if (m.planActivo === true && !vence) avisos.push({ id: 'activo-sin-fecha', texto: 'Activo sin fecha', detalle: 'Está marcado como activo pero no tiene fecha de vencimiento.' });
    if (m.stripeSubscriptionId && !conAcceso) avisos.push({ id: 'revisar-stripe', texto: 'Revisar en Stripe', detalle: 'Tiene suscripción en Stripe: confirma allá que ya no le cobran.' });
    if (conAcceso && typeof m.planVence === 'string') avisos.push({ id: 'fecha-texto', texto: 'Fecha como texto', detalle: 'Fecha guardada como texto: no podrá usar el foro.' });

    return { id: m.id, m, estado, conAcceso, vence, registro, origen: origenDe(m), avisos };
  }

  function resumen(analizados) {
    const r = {
      total: analizados.length, conAcceso: 0, vigentesCancelados: 0, pagoPendiente: 0, vencidos: 0,
      sinPago: 0, aRevisar: 0, sinFechaRegistro: 0,
      porOrigen: { stripe: 0, manual: 0, heredado: 0, otro: 0 }
    };
    for (const a of analizados) {
      if (a.conAcceso) { r.conAcceso++; if (r.porOrigen[a.origen] !== undefined) r.porOrigen[a.origen]++; }
      if (a.estado === 'cancelled_active') r.vigentesCancelados++;
      if (a.estado === 'past_due') r.pagoPendiente++;
      if (a.estado === 'expired') r.vencidos++;
      if (a.estado === 'pending_payment') r.sinPago++;
      if (a.avisos.length) r.aRevisar++;
      if (a.avisos.some(x => x.id === 'sin-registro')) r.sinFechaRegistro++;
    }
    return r;
  }

  // Resumen sin datos personales: se puede copiar y compartir.
  function resumenTexto(r, ahora = new Date()) {
    return [
      `Resumen de miembros · ${ahora.toISOString().slice(0, 10)}`,
      `Total real: ${r.total}`,
      `Con acceso hoy: ${r.conAcceso} (Stripe ${r.porOrigen.stripe} · Manual ${r.porOrigen.manual} · Heredado ${r.porOrigen.heredado} · Otro ${r.porOrigen.otro})`,
      `  de ellos, cancelados con acceso vigente: ${r.vigentesCancelados}`,
      `Pago pendiente: ${r.pagoPendiente}`,
      `Vencidos: ${r.vencidos}`,
      `Sin pago (nunca pagaron): ${r.sinPago}`,
      `Casos a revisar: ${r.aRevisar}`,
      `Sin fecha de registro: ${r.sinFechaRegistro}`
    ].join('\n');
  }

  const PRIORIDAD = { active: 0, cancelled_active: 0, past_due: 1, expired: 2, pending_payment: 3 };
  const ms = d => (d ? d.getTime() : 0);

  // Primero lo que importa: quienes tienen acceso (los que vencen antes, arriba),
  // luego pago pendiente, vencidos recientes y, al final, quienes nunca pagaron.
  function ordenar(analizados) {
    return [...analizados].sort((a, b) => {
      const pa = PRIORIDAD[a.estado] ?? 4, pb = PRIORIDAD[b.estado] ?? 4;
      if (pa !== pb) return pa - pb;
      if (pa === 0) return ms(a.vence) - ms(b.vence);
      if (pa === 2) return ms(b.vence) - ms(a.vence);
      return ms(b.registro) - ms(a.registro);
    });
  }

  const FILTROS = {
    todos: () => true,
    activos: a => a.conAcceso,
    'sin-pago': a => a.estado === 'pending_payment',
    vencidos: a => a.estado === 'expired' || a.estado === 'past_due',
    revisar: a => a.avisos.length > 0
  };

  function filtrar(analizados, { filtro = 'todos', texto = '' } = {}) {
    const q = String(texto).trim().toLowerCase();
    const pasa = FILTROS[filtro] || FILTROS.todos;
    return analizados.filter(a => {
      if (!pasa(a)) return false;
      if (!q) return true;
      const m = a.m;
      return String(m.name || '').toLowerCase().includes(q)
        || String(m.email || '').toLowerCase().includes(q)
        || String(m.phone || '').includes(q);
    });
  }

  const CLASE_ESTADO = {
    active: 'st-active', cancelled_active: 'st-cancelled-active', past_due: 'st-past-due', expired: 'st-expired', pending_payment: 'st-pending'
  };

  function filaHTML(a, club, ahora = Date.now()) {
    const m = a.m;
    const etiqueta = ESTADO_ETIQUETA[a.estado] || ESTADO_ETIQUETA.pending_payment;
    const claseEstado = CLASE_ESTADO[a.estado] || 'st-pending';
    const uid = esc(a.id);
    const avisos = a.avisos.length
      ? `<ul class="mb-avisos">${a.avisos.map(x => `<li title="${esc(x.detalle || x.texto)}">${esc(x.texto)}</li>`).join('')}</ul>`
      : '';
    const plan = m.planTipo ? (m.planTipo === 'anual' ? 'Anual' : 'Mensual') : null;
    const sub = [plan, a.origen !== 'ninguno' ? ORIGEN_ETIQUETA[a.origen] : null].filter(Boolean).join(' · ');
    const stripeNota = a.origen === 'stripe'
      ? ' title="Solo marca cancelado aquí. La suscripción de Stripe se cancela desde el panel de Stripe."'
      : '';
    const acciones = a.conAcceso
      ? `<button type="button" class="btn-small extend" data-accion="activar" data-uid="${uid}">Extender</button>
         <button type="button" class="btn-small cancel" data-accion="cancelar" data-uid="${uid}"${stripeNota}>Cancelar</button>`
      : `<button type="button" class="btn-small activate" data-accion="activar" data-uid="${uid}">Activar</button>`;
    const dias = a.vence ? Math.round((a.vence.getTime() - ahora) / 86400000) : null;
    const pronto = a.conAcceso && dias !== null && dias <= 7 ? ' is-soon' : '';
    return `<tr class="mrow">
      <td class="mcell-member" data-label="Miembro">
        <div class="mb">
          <div class="mb-av ${claseEstado}">${esc(club.getInitials(m.name))}</div>
          <div class="mb-txt">
            <div class="mb-name">${esc(m.name || 'Sin nombre')}${m.role === 'admin' ? ' <span class="mb-tag">Admin</span>' : ''}</div>
            <div class="mb-mail">${esc(m.email || '—')}</div>
            ${avisos}
          </div>
        </div>
      </td>
      <td class="mcell-estado" data-label="Estado">
        <span class="status-pill ${etiqueta.clase} ${claseEstado}">${esc(etiqueta.texto)}</span>
        ${sub ? `<div class="mb-sub">${esc(sub)}</div>` : ''}
      </td>
      <td class="mcell-vence" data-label="Vence">
        ${a.vence ? `<div class="mb-date">${esc(club.formatShort(a.vence))}</div><div class="mb-rel${pronto}">${esc(relativo(a.vence, ahora))}</div>` : '<div class="mb-date mb-none">—</div>'}
      </td>
      <td class="mcell-actions">${acciones}</td>
    </tr>`;
  }

  function filasHTML(analizados, club) {
    if (!analizados.length) {
      return '<tr><td colspan="4" class="mb-empty">Sin resultados</td></tr>';
    }
    return analizados.map(a => filaHTML(a, club)).join('');
  }

  // La tarjeta grande es "Con acceso hoy": es el número que más importa.
  function tarjetasHTML(r) {
    const o = r.porOrigen;
    return `
      <div class="admin-stats">
        <div class="stat-box stat-hero green"><div class="stat-box__label">Con acceso hoy</div><div class="stat-box__value">${r.conAcceso}</div>
          <div class="stat-box__note">Stripe ${o.stripe} · Manual ${o.manual} · Heredado ${o.heredado}${o.otro ? ` · Otro ${o.otro}` : ''}</div></div>
        <div class="stat-box total"><div class="stat-box__label">Total real</div><div class="stat-box__value">${r.total}</div></div>
        <div class="stat-box amber"><div class="stat-box__label">Sin pago</div><div class="stat-box__value">${r.sinPago}</div></div>
        <div class="stat-box orange"><div class="stat-box__label">Vencidos / pago pendiente</div><div class="stat-box__value">${r.vencidos + r.pagoPendiente}</div></div>
        <div class="stat-box review"><div class="stat-box__label">A revisar</div><div class="stat-box__value">${r.aRevisar}</div>
          ${r.sinFechaRegistro ? `<div class="stat-box__note">${r.sinFechaRegistro} sin fecha de registro</div>` : ''}</div>
      </div>`;
  }

  const CHIPS = [
    ['todos', 'Todos'], ['activos', 'Con acceso'], ['sin-pago', 'Sin pago'], ['vencidos', 'Vencidos'], ['revisar', 'A revisar']
  ];

  function chipsHTML(filtroActual, r) {
    const cuenta = { todos: r.total, activos: r.conAcceso, 'sin-pago': r.sinPago, vencidos: r.vencidos + r.pagoPendiente, revisar: r.aRevisar };
    return CHIPS.map(([id, nombre]) => `<button type="button" class="zoo-chip${id === filtroActual ? ' is-active' : ''}" data-filtro="${id}" aria-pressed="${id === filtroActual}">${nombre} · ${cuenta[id]}</button>`).join('');
  }

  return { esc, relativo, origenDe, analizar, resumen, resumenTexto, ordenar, filtrar, filaHTML, filasHTML, tarjetasHTML, chipsHTML };
});
