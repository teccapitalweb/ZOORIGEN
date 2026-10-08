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

  // club = ZOORIGEN_CLUB (calculateStatus y toDate); se inyecta para no duplicar la regla.
  function analizar(m, club) {
    const estado = club.calculateStatus(m);
    const vence = club.toDate(m.planVence || m.fechaExpiracion);
    const registro = club.toDate(m.createdAt);
    const conAcceso = estado === 'active' || estado === 'cancelled_active';
    const avisos = [];

    if (!m.createdAt) avisos.push({ id: 'sin-registro', texto: 'Sin fecha de registro (el panel anterior lo ocultaba)' });
    if (m.planActivo === true && estado === 'expired') avisos.push({ id: 'activo-vencido', texto: 'Marcado como activo, pero su periodo ya venció' });
    if (m.planActivo === true && !vence) avisos.push({ id: 'activo-sin-fecha', texto: 'Marcado como activo, pero sin fecha de vencimiento' });
    if (m.stripeSubscriptionId && !conAcceso) avisos.push({ id: 'revisar-stripe', texto: 'Tiene suscripción en Stripe: confirma allá que ya no le cobran' });
    if (conAcceso && typeof m.planVence === 'string') avisos.push({ id: 'fecha-texto', texto: 'Fecha guardada como texto: no podrá usar el foro' });

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

  function filaHTML(a, club) {
    const m = a.m;
    const etiqueta = ESTADO_ETIQUETA[a.estado] || ESTADO_ETIQUETA.pending_payment;
    const uid = esc(a.id);
    const aviso = a.avisos.length
      ? `<ul style="margin:0;padding-left:16px;font-size:.74rem;color:var(--zoo-amber);">${a.avisos.map(x => `<li>${esc(x.texto)}</li>`).join('')}</ul>`
      : '<span style="color:var(--zoo-text-dim);">—</span>';
    const stripeNota = a.origen === 'stripe'
      ? ' title="Solo marca cancelado aquí. La suscripción de Stripe se cancela desde el panel de Stripe."'
      : '';
    const acciones = a.conAcceso
      ? `<button class="btn-small activate" data-accion="activar" data-uid="${uid}" style="background:rgba(232,163,23,0.15);color:#E8A317;border-color:rgba(232,163,23,0.3);">Extender</button>
         <button class="btn-small cancel" data-accion="cancelar" data-uid="${uid}"${stripeNota}>Cancelar</button>`
      : `<button class="btn-small activate" data-accion="activar" data-uid="${uid}">Activar</button>`;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--zoo-green-900);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.78rem;color:var(--zoo-green-500);">${esc(club.getInitials(m.name))}</div>
          <div><div style="font-weight:600;">${esc(m.name || '—')}</div><div style="font-size:.74rem;color:var(--zoo-text-dim);">${m.role === 'admin' ? '⚙️ Admin' : 'Miembro'}</div></div>
        </div>
      </td>
      <td style="font-size:.82rem;">${esc(m.email || '—')}</td>
      <td><span class="status-pill ${etiqueta.clase}">${esc(etiqueta.texto)}</span></td>
      <td style="font-size:.82rem;">${esc(ORIGEN_ETIQUETA[a.origen])}</td>
      <td style="font-size:.82rem;">${m.planTipo ? (m.planTipo === 'anual' ? 'Anual' : 'Mensual') : '—'}</td>
      <td style="font-size:.82rem;">${a.vence ? esc(club.formatShort(a.vence)) : '—'}</td>
      <td>${aviso}</td>
      <td>${acciones}</td>
    </tr>`;
  }

  function filasHTML(analizados, club) {
    if (!analizados.length) {
      return '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--zoo-text-dim);">Sin resultados</td></tr>';
    }
    return analizados.map(a => filaHTML(a, club)).join('');
  }

  function tarjetasHTML(r) {
    const o = r.porOrigen;
    return `
      <div class="admin-stats">
        <div class="stat-box"><div class="stat-box__label">Total real</div><div class="stat-box__value">${r.total}</div></div>
        <div class="stat-box green"><div class="stat-box__label">Con acceso hoy</div><div class="stat-box__value">${r.conAcceso}</div>
          <div style="font-size:.72rem;color:var(--zoo-text-dim);margin-top:8px;">Stripe ${o.stripe} · Manual ${o.manual} · Heredado ${o.heredado}${o.otro ? ` · Otro ${o.otro}` : ''}</div></div>
        <div class="stat-box amber"><div class="stat-box__label">Sin pago</div><div class="stat-box__value">${r.sinPago}</div></div>
        <div class="stat-box orange"><div class="stat-box__label">Vencidos / pago pendiente</div><div class="stat-box__value">${r.vencidos + r.pagoPendiente}</div></div>
        <div class="stat-box orange"><div class="stat-box__label">A revisar</div><div class="stat-box__value">${r.aRevisar}</div>
          ${r.sinFechaRegistro ? `<div style="font-size:.72rem;color:var(--zoo-text-dim);margin-top:8px;">${r.sinFechaRegistro} sin fecha de registro</div>` : ''}</div>
      </div>`;
  }

  const CHIPS = [
    ['todos', 'Todos'], ['activos', 'Con acceso'], ['sin-pago', 'Sin pago'], ['vencidos', 'Vencidos'], ['revisar', 'A revisar']
  ];

  function chipsHTML(filtroActual, r) {
    const cuenta = { todos: r.total, activos: r.conAcceso, 'sin-pago': r.sinPago, vencidos: r.vencidos + r.pagoPendiente, revisar: r.aRevisar };
    return CHIPS.map(([id, nombre]) => {
      const activo = id === filtroActual;
      return `<button type="button" class="zoo-chip" data-filtro="${id}" style="padding:6px 12px;border-radius:999px;border:1px solid ${activo ? 'var(--zoo-green-500)' : 'var(--zoo-border)'};background:${activo ? 'rgba(76,175,80,.16)' : 'transparent'};color:${activo ? 'var(--zoo-green-500)' : '#fff'};font-size:.8rem;font-weight:600;cursor:pointer;">${nombre} · ${cuenta[id]}</button>`;
    }).join(' ');
  }

  return { esc, origenDe, analizar, resumen, resumenTexto, ordenar, filtrar, filaHTML, filasHTML, tarjetasHTML, chipsHTML };
});
