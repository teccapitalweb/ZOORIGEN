/* ============================================================ */
/* CLUB VIP ZOORIGEN - Lógica con Firebase Auth + Firestore     */
/* Requiere: firebase-config.js cargado ANTES de este archivo   */
/* ============================================================ */

// ═══════════════ CONFIGURACIÓN CHECKOUT STRIPE ═══════════════
// Migrado de Shopify a Stripe Checkout Sessions
const STRIPE_CONFIG = {
  API_URL: 'https://zoorigen-webhook-production.up.railway.app/create-checkout-session',
  PUBLIC_KEY: 'pk_live_51TMAcSA7If2CqXs9NuKsM1cVT9n5agProkMR8HFiT6QTXzS0g9PtiokZ4cpT1Qo3rk9bbsrZHx9sOUbE9UEOjgGs00n1OM3Y9b',
  PRICE_MENSUAL: 'price_1TRcJnA7If2CqXs9dMBGRmDF',
  PRICE_ANUAL: 'price_1TRcJlA7If2CqXs97WQNmKFq',
};

// Función global para iniciar pago con Stripe (redirect)
async function iniciarPagoStripe(planType, email) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión primero');
    window.location.href = 'club-registro.html';
    return;
  }
  // Mostrar overlay de carga
  const overlay = document.createElement('div');
  const isAnual = planType === 'anual';
  const price = isAnual ? '$1,899 MXN' : '$199 MXN';
  const planLabel = isAnual ? 'Plan Anual' : 'Plan Mensual';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,18,21,0.74);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:440px;width:100%;background:var(--zoo-solid, #1F5F3A);border:2px solid rgba(232,163,23,0.4);border-radius:18px;padding:36px 26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:3.5rem;margin-bottom:12px;animation:zooPulse 1.2s ease-in-out infinite;"><svg class="zi" aria-hidden="true"><use href="#zi-credit-card"/></svg></div>
      <h2 style="font-family:var(--zoo-font-display);color:#fff;font-size:1.4rem;margin:0 0 6px;">Llevándote al pago seguro</h2>
      <div style="color:#E8A317;font-weight:700;font-size:1rem;margin-bottom:14px;">${planLabel} · ${price}</div>
      <p style="color:rgba(255,255,255,0.85);font-size:.9rem;margin:0 0 10px;line-height:1.5;">Completa tu pago con <strong style="color:#fff;">Stripe (seguro)</strong> y te regresamos automáticamente al club.</p>
      <div style="color:rgba(255,255,255,0.6);font-size:.78rem;">Redirigiendo...</div>
    </div>
    <style>@keyframes zooPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }</style>
  `;
  document.body.appendChild(overlay);

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(STRIPE_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        planType: planType,
      }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Error al crear sesión de pago');
    }
  } catch (error) {
    console.error('Error Stripe:', error);
    overlay.remove();
    alert('Error al procesar el pago. Intenta de nuevo.');
  }
}

// Función para Stripe Embedded Checkout (pago dentro de la página)
async function iniciarPagoEmbedded(planType, email, containerId) {
  const user = firebase.auth().currentUser;
  if (!user) { alert('Debes iniciar sesión primero'); return; }
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--zoo-text-muted);">Cargando formulario de pago...</div>';
  const turno = (window.__zooTurnoPago = (window.__zooTurnoPago || 0) + 1);

  try {
    const idToken = await user.getIdToken();
    const response = await fetch(STRIPE_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        planType, embedded: true,
      }),
    });
    const data = await response.json();
    if (!data.clientSecret) throw new Error(data.error || 'Error al crear sesión');
    if (turno !== window.__zooTurnoPago) return;   // se eligió otro plan mientras cargaba este

    // Stripe solo permite un pago embebido a la vez: se destruye el anterior (por ejemplo, al cambiar de plan).
    try { if (window.__zooCheckoutEmbebido && window.__zooCheckoutEmbebido.destroy) window.__zooCheckoutEmbebido.destroy(); } catch (e) { /* ya no existía */ }
    window.__zooCheckoutEmbebido = null;
    const stripe = Stripe(STRIPE_CONFIG.PUBLIC_KEY);
    const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
    container.innerHTML = '';
    checkout.mount('#' + containerId);
    window.__zooCheckoutEmbebido = checkout;
  } catch (error) {
    console.error('Error Embedded Checkout:', error);
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6b6b;">Error al cargar el pago. <button onclick="location.reload()" style="color:var(--zoo-amber);background:none;border:1px solid var(--zoo-amber);padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:10px;">Reintentar</button></div>';
  }
}

// ============== ÍCONOS SVG (reemplazan emojis en toda la membresía) ==============
const ZOORIGEN_ICONS = {
  home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/>',
  book: '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13"/><path d="M12 6v13"/><path d="M21 6v13"/>',
  messages: '<path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10"/><path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2"/>',
  video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/>',
  broadcast: '<circle cx="12" cy="12" r="1"/><path d="M16.243 16.243a6 6 0 1 0 -8.486 0"/><path d="M19.071 19.071a10 10 0 1 0 -14.142 0"/>',
  filetext: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 9l1 0"/><path d="M9 13l6 0"/><path d="M9 17l6 0"/>',
  flask: '<path d="M9 3l6 0"/><path d="M10 3v5.5a3.5 3.5 0 0 1 -.5 1.8l-3.5 5.8a3.5 3.5 0 0 0 3 5.4h6a3.5 3.5 0 0 0 3 -5.4l-3.5 -5.8a3.5 3.5 0 0 1 -.5 -1.8v-5.5"/><path d="M6 14l12 0"/>',
  scale: '<path d="M12 3v18"/><path d="M9 21h6"/><path d="M5 6h14"/><path d="M5 6l-2 6a3 3 0 0 0 6 0l-2 -6"/><path d="M19 6l-2 6a3 3 0 0 0 6 0l-2 -6"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v8a5 5 0 0 1 -10 0z"/><path d="M17 4h4v2a3 3 0 0 1 -3 3h-1"/><path d="M7 4h-4v2a3 3 0 0 0 3 3h1"/>',
  certificate: '<circle cx="15" cy="15" r="3"/><path d="M13 17.5v4.5l2 -1.5l2 1.5v-4.5"/><path d="M10 19h-5a2 2 0 0 1 -2 -2v-10c0 -1.1 .9 -2 2 -2h14a2 2 0 0 1 2 2v6"/><path d="M6 9h12"/>',
  gift: '<path d="M3 8m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z"/><path d="M12 8l0 13"/><path d="M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0 -5c1.5 0 3 1.5 4.5 5c1.5 -3.5 3 -5 4.5 -5a2.5 2.5 0 0 1 0 5"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  creditcard: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>',
  moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
  bell: '<path d="M10 5a2 2 0 0 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
  list: '<path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/>',
  heartpulse: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/><path d="M3.5 12h3l1.5 -3l2 6l1 -3h2.5"/>',
  hand: '<path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5"/><path d="M11 11.5v-2a1.5 1.5 0 1 1 3 0v2.5"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -5 -2.7l-3.3 -5.7a1.5 1.5 0 0 1 .5 -2l.2 -.1a1.9 1.9 0 0 1 2.3 .3l1.5 1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35 -4.35"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  helpcircle: '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2 -3 3 -3 3"/><path d="M12 17l0 .01"/>',
  target: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  brandwhatsapp: '<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>'
};
// Clases en vivo = PRÓXIMAMENTE (interruptor único: ZOO_CONFIG.clasesEnVivoPronto en club-config.js)
function zooEnVivoPronto() {
  try { return typeof ZOO_CONFIG !== 'undefined' && ZOO_CONFIG.clasesEnVivoPronto === true; } catch (e) { return false; }
}

function zooEsc(valor) {
  return String(valor == null ? '' : valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function zooIcon(name, size) {
  size = size || 17;
  const d = ZOORIGEN_ICONS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex-shrink:0;">${d}</svg>`;
}

const ZOORIGEN_CLUB = {

  icon: zooIcon,

  // ============== LECTURA DE CONTENIDO DESDE FIRESTORE ==============
  async getCursos() {
    try {
      const snap = await db.collection('cursos').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('Error cargando cursos:', err); return []; }
  },

  async getVideos() {
    try {
      const snap = await db.collection('videos').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('Error cargando videos:', err); return []; }
  },

  async getPdfs() {
    try {
      const snap = await db.collection('pdfs').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('Error cargando pdfs:', err); return []; }
  },

  async getSesiones() {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const snap = await db.collection('sesiones').where('date', '>=', hoy).orderBy('date', 'asc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('Error cargando sesiones:', err); return []; }
  },

  async getProximaSesion() {
    const lista = await this.getSesiones();
    return lista.length > 0 ? lista[0] : null;
  },

  async getNoticias(limit = 10) {
    try {
      const snap = await db.collection('noticias').orderBy('createdAt', 'desc').limit(Math.max(limit * 4, 20)).get();
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const bySource = {};
      all.forEach(n => {
        const src = (n.source || 'Zoorigen').trim();
        if (!bySource[src]) bySource[src] = [];
        bySource[src].push(n);
      });
      const sources = Object.keys(bySource);
      const mixed = [];
      let i = 0;
      while (mixed.length < limit && sources.some(s => bySource[s].length > 0)) {
        const src = sources[i % sources.length];
        if (bySource[src].length > 0) mixed.push(bySource[src].shift());
        i++;
        if (i > limit * sources.length * 2) break;
      }
      return mixed.slice(0, limit);
    } catch (err) { console.error('Error cargando noticias:', err); return []; }
  },

  sourceColorClass(source) {
    const s = (source || '').toLowerCase();
    if (s.includes('mongabay'))      return 'amber';
    if (s.includes('dw'))            return 'blue';
    if (s.includes('bbc'))           return 'orange';
    if (s.includes('scidev'))        return 'blue';
    return '';
  },

  // ============== NOTIFICACIONES ==============
  // Sistema real de notificaciones: revisa webinars nuevos, logros, etc.
  async getNotificaciones(session) {
    if (!session || !session.uid) return [];
    const notificaciones = [];
    const ahora = new Date();

    try {
      // 1. Webinars próximos (próximos 14 días) - si no ha pasado aún
      const hoy = ahora.toISOString().slice(0, 10);
      // Con las clases en vivo en "Próximamente" no se generan avisos de webinar.
      const webSnap = zooEnVivoPronto() ? { docs: [] } : await db.collection('sesiones')
        .where('date', '>=', hoy)
        .orderBy('date', 'asc')
        .limit(5)
        .get();
      webSnap.docs.forEach(doc => {
        const w = { id: doc.id, ...doc.data() };
        const fecha = new Date(w.date);
        const diasHasta = Math.ceil((fecha - ahora) / (1000*60*60*24));
        if (diasHasta >= 0 && diasHasta <= 14) {
          const leido = localStorage.getItem(`zoo_notif_webinar_${session.uid}_${w.id}`);
          notificaciones.push({
            id: 'webinar_' + w.id,
            type: 'webinar',
            icon: diasHasta <= 1 ? '<svg class="zi" aria-hidden="true"><use href="#zi-bell"/></svg>' : '<svg class="zi" aria-hidden="true"><use href="#zi-video"/></svg>',
            title: diasHasta === 0 ? '¡Hoy en vivo!' :
                   diasHasta === 1 ? '¡Mañana en vivo!' :
                   `Nuevo webinar en ${diasHasta} días`,
            message: w.title,
            time: fecha,
            href: 'club-sesiones.html',
            read: !!leido,
            priority: diasHasta <= 1 ? 1 : 2
          });
        }
      });

      // 2. Cursos nuevos (últimos 30 días)
      try {
        const cursosSnap = await db.collection('cursos')
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get();
        cursosSnap.docs.forEach(doc => {
          const c = { id: doc.id, ...doc.data() };
          if (!c.createdAt) return;
          const creado = new Date(c.createdAt);
          const diasDesde = Math.floor((ahora - creado) / (1000*60*60*24));
          if (diasDesde <= 30 && diasDesde >= 0) {
            const leido = localStorage.getItem(`zoo_notif_curso_${session.uid}_${c.id}`);
            notificaciones.push({
              id: 'curso_' + c.id,
              type: 'curso',
              icon: '<svg class="zi" aria-hidden="true"><use href="#zi-library"/></svg>',
              title: 'Nuevo curso disponible',
              message: c.title,
              time: creado,
              href: 'club-biblioteca.html',
              read: !!leido,
              priority: 3
            });
          }
        });
      } catch (err) {}

      // 3. Notificación de bienvenida si es nuevo
      if (session.planStatus === 'active' && session.planInicio) {
        const inicio = new Date(session.planInicio);
        const diasComoMiembro = Math.floor((ahora - inicio) / (1000*60*60*24));
        if (diasComoMiembro <= 7) {
          const leido = localStorage.getItem(`zoo_notif_bienvenida_${session.uid}`);
          notificaciones.push({
            id: 'bienvenida_' + session.uid,
            type: 'welcome',
            icon: '<svg class="zi" aria-hidden="true"><use href="#zi-party-popper"/></svg>',
            title: '¡Bienvenido al Club VIP!',
            message: `Acceso hasta ${this.formatShort(session.planVence)}`,
            time: inicio,
            href: 'club-dashboard.html',
            read: !!leido,
            priority: 4
          });
        }
      }

    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }

    // Ordenar: no leídas primero, después por prioridad, después por tiempo
    notificaciones.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.time - a.time;
    });

    return notificaciones;
  },

  markNotificationRead(session, notifId) {
    if (!session) return;
    // notifId viene como "webinar_XXX" o "curso_XXX"
    const [tipo, ...rest] = notifId.split('_');
    const id = rest.join('_');
    const key = `zoo_notif_${tipo}_${session.uid}_${id}`;
    localStorage.setItem(key, '1');
  },

  markAllNotificationsRead(session, notificaciones) {
    if (!session) return;
    notificaciones.forEach(n => this.markNotificationRead(session, n.id));
  },

  // ============== INICIALIZAR PANEL DE NOTIFICACIONES (reutilizable) ==============
  // Se usa en todas las páginas: dashboard, biblioteca, foro, etc.
  async initNotifications(session) {
    if (!session) return;
    // Con la estructura nueva la campana la monta club-avisos.js; esta versión queda de respaldo.
    if (typeof ZOO_AVISOS !== 'undefined' && ZOO_AVISOS.activo && ZOO_AVISOS.activo()) return;
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    if (!notifBtn || !notifPanel) return; // página no tiene campana

    const notifPanelClose = document.getElementById('notifPanelClose');
    const notifMarkAll = document.getElementById('notifMarkAll');
    const self = this;

    async function cargarNotificaciones() {
      const notificaciones = await self.getNotificaciones(session);
      const noLeidas = notificaciones.filter(n => !n.read).length;
      const badge = document.getElementById('notifBadge');
      if (badge) {
        if (noLeidas > 0) {
          badge.textContent = noLeidas > 9 ? '9+' : noLeidas;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
      return notificaciones;
    }

    function renderNotifPanel(notificaciones) {
      const list = document.getElementById('notifList');
      const actions = document.getElementById('notifPanelActions');
      if (!list) return;

      if (notificaciones.length === 0) {
        list.innerHTML = `
          <div class="notif-empty">
            <div class="notif-empty__icon"><svg class="zi" aria-hidden="true"><use href="#zi-bell"/></svg></div>
            <div class="notif-empty__title">Sin notificaciones</div>
            <div class="notif-empty__text">Te avisaremos de cursos nuevos y logros.</div>
          </div>`;
        if (actions) actions.style.display = 'none';
        return;
      }

      const noLeidas = notificaciones.filter(n => !n.read).length;
      if (actions) actions.style.display = noLeidas > 0 ? 'flex' : 'none';

      list.innerHTML = notificaciones.map(n => `
        <a href="${n.href}" class="notif-item ${n.read ? 'is-read' : 'is-unread'}" data-id="${n.id}">
          <div class="notif-item__icon">${n.icon}</div>
          <div class="notif-item__body">
            <div class="notif-item__title">${n.title}</div>
            <div class="notif-item__msg">${n.message}</div>
            <div class="notif-item__time">${self.timeAgo(n.time)}</div>
          </div>
          ${!n.read ? '<span class="notif-item__dot"></span>' : ''}
        </a>
      `).join('');

      list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => {
          self.markNotificationRead(session, el.dataset.id);
        });
      });
    }

    let notificacionesActuales = await cargarNotificaciones();
    renderNotifPanel(notificacionesActuales);

    const abrirPanel = async () => {
      notificacionesActuales = await cargarNotificaciones();
      renderNotifPanel(notificacionesActuales);
      notifPanel.style.display = 'block';
      setTimeout(() => notifPanel.classList.add('is-open'), 10);
    };
    const cerrarPanel = () => {
      notifPanel.classList.remove('is-open');
      setTimeout(() => { notifPanel.style.display = 'none'; }, 200);
    };

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (notifPanel.classList.contains('is-open')) cerrarPanel();
      else abrirPanel();
    });
    if (notifPanelClose) notifPanelClose.addEventListener('click', cerrarPanel);

    document.addEventListener('click', (e) => {
      if (notifPanel.classList.contains('is-open') &&
          !notifPanel.contains(e.target) &&
          !notifBtn.contains(e.target)) {
        cerrarPanel();
      }
    });

    if (notifMarkAll) {
      notifMarkAll.addEventListener('click', async () => {
        self.markAllNotificationsRead(session, notificacionesActuales);
        notificacionesActuales = await cargarNotificaciones();
        renderNotifPanel(notificacionesActuales);
      });
    }

    // Recargar cada 60s si el panel está cerrado
    setInterval(async () => {
      if (!notifPanel.classList.contains('is-open')) {
        await cargarNotificaciones();
      }
    }, 60000);
  },

  // ============== CHECKOUT STRIPE ==============
  openCheckoutModal(plan, email) {
    iniciarPagoStripe(plan, email);
  },

  _showPaymentWaitingScreen(plan) {
    const price = window.__zooPrice || '$199 MXN';
    const planLabel = window.__zooPlanLabel || 'Plan Mensual';

    const existing = document.getElementById('zoo-pay-waiting');
    if (existing) existing.remove();

    const screen = document.createElement('div');
    screen.id = 'zoo-pay-waiting';
    screen.innerHTML = `
      <div class="zoo-pay-backdrop"></div>
      <div class="zoo-pay-box">
        <div class="zoo-pay-icon-wrap">
          <div class="zoo-pay-icon"><svg class="zi" aria-hidden="true"><use href="#zi-credit-card"/></svg></div>
          <div class="zoo-pay-pulse"></div>
        </div>
        <div class="zoo-pay-eyebrow">${planLabel} · Club VIP Zoorigen</div>
        <h2 class="zoo-pay-title">Completa tu pago de ${price}</h2>
        <p class="zoo-pay-desc">
          Se abrió una ventana nueva con el pago seguro de Stripe.
          Sigue los pasos ahí y regresa cuando termines.
        </p>
        <ul class="zoo-pay-steps">
          <li>Elige tu método de pago (tarjeta, OXXO, PayPal)</li>
          <li>Confirma tu membresía de ${price}</li>
          <li>Regresa aquí y haz clic en "Ya pagué"</li>
        </ul>
        <div class="zoo-pay-actions">
          <button class="zoo-pay-reopen" onclick="ZOORIGEN_CLUB._reopenCheckoutWindow()">
            Abrir ventana de nuevo
          </button>
          <button class="zoo-pay-done" onclick="ZOORIGEN_CLUB._confirmPayment()">
            Ya pagué — Entrar al Club
          </button>
        </div>
        <button class="zoo-pay-cancel" onclick="ZOORIGEN_CLUB._cancelPayment()">
          Cancelar
        </button>
      </div>
    `;
    document.body.appendChild(screen);
    document.body.style.overflow = 'hidden';
  },

  _reopenCheckoutWindow() {
    const url = window.__zooCheckoutURL;
    if (!url) return;
    const w = 500, h = 720;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);
    window.__zooPopup = window.open(
      url, 'zooCheckout',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
    if (!window.__zooPopup) {
      alert('Tu navegador bloqueó la ventana. Permite pop-ups para zoorigen.com.');
    }
  },

  _confirmPayment() {
    try { if (window.__zooPopup && !window.__zooPopup.closed) window.__zooPopup.close(); } catch {}
    if (auth.currentUser) {
      localStorage.removeItem('zoo_welcome_shown_' + auth.currentUser.uid);
    }
    window.location.href = 'club-dashboard.html';
  },

  _cancelPayment() {
    if (!confirm('¿Seguro que quieres cancelar? Tu membresía no se activará.')) return;
    try { if (window.__zooPopup && !window.__zooPopup.closed) window.__zooPopup.close(); } catch {}
    const screen = document.getElementById('zoo-pay-waiting');
    if (screen) screen.remove();
    document.body.style.overflow = '';
  },

  // ============== PROGRESO DE CURSOS: LO GUARDA Y LO VALIDA EL SERVIDOR ==============
  // El avance, el orden de las clases, las preguntas y el certificado los valida el servidor
  // (GET /api/cursos/progreso, POST /api/cursos/:id/progreso y POST /api/cursos/:id/quiz), igual que en alintecfood.
  // Antes el navegador escribía courseProgress en Firestore y creaba los certificados: eso ya no existe.
  // Aquí solo se piden y se traducen a la forma que usa la biblioteca:
  //   { [cursoId]: { completedLessons: [...], isCompleted, certificateFolio } }
  // La lógica pura vive en club-progreso.js (ZOO_PROGRESO). localStorage guarda lo ÚLTIMO que respondió el servidor
  // y solo se usa para MOSTRAR si el servidor no responde; nunca para certificar.
  _clienteProgreso() {
    if (this.__clienteProgreso) return this.__clienteProgreso;
    const modulo = typeof window !== 'undefined' ? window.ZOO_PROGRESO : null;
    if (!modulo || typeof modulo.crear !== 'function') return null;
    const club = this;
    const clave = uid => 'zoo_course_progress_' + uid;
    this.__clienteProgreso = modulo.crear({
      apiFetch: (ruta, op) => club.apiFetch(ruta, op),
      uid: () => { try { return (typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.uid) || ''; } catch (e) { return ''; } },
      leerCache: uid => { try { return JSON.parse(localStorage.getItem(clave(uid)) || '{}'); } catch (e) { return {}; } },
      guardarCache: (uid, obj) => { try { localStorage.setItem(clave(uid), JSON.stringify(obj)); } catch (e) { /* sin almacenamiento */ } },
      // Fecha en que se terminó cada curso certificado (el servidor no la manda en el avance): la ruta de 8 días la usa.
      fechasCertificados: async uid => {
        const snap = await db.collection('certificados').where('memberUid', '==', uid).get();
        const fechas = {};
        snap.docs.forEach(doc => {
          const c = doc.data() || {};
          const id = String(c.courseId || '');
          const t = Date.parse(c.issuedAt || '');
          if (id && Number.isFinite(t) && (!fechas[id] || t < Date.parse(fechas[id]))) fechas[id] = new Date(t).toISOString();
        });
        return fechas;
      }
    });
    return this.__clienteProgreso;
  },

  // Avance de todos los cursos del miembro. Si el servidor no responde devuelve lo último que se vio
  // (la propiedad no enumerable __desdeCache vale true): solo sirve para mostrar, nunca para certificar.
  async getCourseProgress(uid) {
    if (!uid) return {};
    const cliente = this._clienteProgreso();
    if (cliente) return cliente.cargar(uid);
    try { return JSON.parse(localStorage.getItem('zoo_course_progress_' + uid) || '{}'); } catch (e) { return {}; }
  },

  // POST /api/cursos/:cursoId/progreso. Devuelve { entrada, completado, nuevoCompletado, certificado, bono }
  // o lanza un Error con .status y .mensajeUsuario (texto en español).
  registrarClaseVista(cursoId, indice, ctx) {
    const cliente = this._clienteProgreso();
    if (!cliente) return Promise.reject(Object.assign(new Error('Recarga la página para continuar.'), { status: 0, mensajeUsuario: 'Recarga la página para continuar.' }));
    return cliente.registrarClaseVista(cursoId, indice, ctx);
  },

  // POST /api/cursos/:cursoId/quiz. Devuelve { aprobado, correctas, total, detalle:[{ correcta, acertada }] }
  validarQuizClase(cursoId, indice, respuestas, ctx) {
    const cliente = this._clienteProgreso();
    if (!cliente) return Promise.reject(Object.assign(new Error('Recarga la página para continuar.'), { status: 0, mensajeUsuario: 'Recarga la página para continuar.' }));
    return cliente.validarQuiz(cursoId, indice, respuestas, ctx);
  },

  // ============== NIVEL, XP Y LOGROS: AHORA VIENEN DEL SERVIDOR ==============
  // Antes el navegador calculaba XP y logros en localStorage (zoo_progress_<uid>), lo que se podía alterar
  // desde la consola. Ahora el servidor los calcula (GET /api/premios) y aquí solo se dibujan.
  // Las funciones viejas se quedan con la misma firma pero ya NO guardan ni muestran XP falso:
  // así ninguna página que todavía las llame se rompe.
  NIVELES: [
    { id: 1, nombre: 'Aprendiz',    color: '#6FBF73' },
    { id: 2, nombre: 'Técnico',     color: '#2AA4D5' },
    { id: 3, nombre: 'Profesional', color: '#F5C62E' },
    { id: 4, nombre: 'Líder',       color: '#E8A317' },
    { id: 5, nombre: 'Maestro',     color: '#D55A28' }
  ],
  ACHIEVEMENTS: [],   // el catálogo real de logros lo manda el servidor (GET /api/premios)

  getProgress(session) {
    // Respuesta neutra y segura (sin XP inventado). La pantalla debe pedir los datos reales con fetchPremios().
    return {
      xp: 0, coursesCompleted: 0, sessionsAttended: 0, pdfsDownloaded: 0, streak: 0,
      unlockedAchievements: [], weeklyMinutes: 0,
      joinedAt: (session && session.createdAt) || null,
      level: { level: 1, name: 'Aprendiz', icon: '', minXP: 0, color: '#6FBF73' },
      nextLevel: { level: 2, name: 'Técnico', icon: '', minXP: 300, color: '#2AA4D5' },
      progressPercent: 0, xpToNext: 0, isMaxLevel: false, delServidor: true
    };
  },

  awardAchievement() { return false; },   // sin efecto: los logros los otorga el servidor
  showAchievementToast() {},
  showLevelUpModal() {},

  // GET /api/premios con el ID token. Guarda la respuesta unos segundos para no repetir llamadas dentro de la misma pantalla.
  async fetchPremios(forzar) {
    const ahora = Date.now();
    if (!forzar && this._premiosCache && ahora - this._premiosCache.t < 20000) return this._premiosCache.datos;
    const datos = await this.apiFetch('/api/premios');
    this._premiosCache = { t: ahora, datos };
    return datos;
  },

  // Convierte la respuesta del servidor en lo que necesita la tarjeta (con valores seguros si falta algo).
  resumenNivel(datos) {
    if (!datos || typeof datos !== 'object' || !datos.nivel || typeof datos.nivel !== 'object') return null;
    const n = datos.nivel;
    const id = Math.min(5, Math.max(1, Math.round(Number(n.id) || 1)));
    const def = this.NIVELES[id - 1];
    const xpTotal = Math.max(0, Math.round(Number((datos.xp && datos.xp.total != null) ? datos.xp.total : n.xp) || 0));
    const desde = Math.max(0, Number(n.desde) || 0);
    const hasta = Number(n.hasta) > desde ? Number(n.hasta) : desde;
    const esMaximo = id >= 5;
    const faltan = esMaximo ? 0 : Math.max(0, Math.round(Number(n.faltan != null ? n.faltan : hasta - xpTotal) || 0));
    const pct = esMaximo || hasta <= desde ? 100 : Math.max(0, Math.min(100, Math.round(((xpTotal - desde) / (hasta - desde)) * 100)));
    return {
      id, nombre: String(n.nombre || def.nombre), color: def.color,
      siguiente: esMaximo ? null : this.NIVELES[id],
      xp: xpTotal, faltan, pct, esMaximo,
      racha: Math.max(0, Math.round(Number(datos.racha) || 0)),
      diasActivos: Math.max(0, Math.round(Number(datos.diasActivos) || 0)),
      premiosDisponibles: Math.max(0, Math.round(Number(datos.disponibles) || 0)),
      logrosGanados: Array.isArray(datos.logros) ? datos.logros.filter(l => l && l.ganado).length : 0
    };
  },

  // Tarjeta de nivel del panel. Recibe la respuesta de GET /api/premios (ya no el progreso local).
  renderLevelCard(datos) {
    const r = this.resumenNivel(datos);
    if (!r) {
      return `
      <div class="gami-level-card" role="status">
        <div class="gami-level-card__center">
          <div class="gami-level-badge">Mi nivel</div>
          <div class="gami-level-name">No pudimos cargar tu nivel</div>
          <div class="gami-level-xp"><span class="gami-xp-next">Revisa tu conexión e inténtalo de nuevo.</span></div>
          <button type="button" class="card-resume__action" data-nivel-reintentar>Reintentar</button>
        </div>
      </div>`;
    }
    return `
      <div class="gami-level-card">
        <div class="gami-level-card__left">
          <div class="gami-level-icon" style="background:${r.color};color:#fff;">
            ${zooIcon('trophy', 34)}
          </div>
        </div>
        <div class="gami-level-card__center">
          <div class="gami-level-badge">NIVEL ${r.id} DE 5</div>
          <div class="gami-level-name">${zooEsc(r.nombre)}</div>
          <div class="gami-level-xp">
            <span class="gami-xp-count">${r.xp.toLocaleString('es-MX')} XP</span>
            ${r.esMaximo ? '<span class="gami-xp-next">· Nivel máximo</span>' : `<span class="gami-xp-next">· ${r.faltan.toLocaleString('es-MX')} XP para ${zooEsc(r.siguiente.nombre)}</span>`}
          </div>
          <div class="gami-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}">
            <div class="gami-progress-bar__fill" style="width: ${r.pct}%; background:${r.color};"></div>
          </div>
        </div>
        <div class="gami-level-card__right">
          <a class="gami-streak" href="club-logros.html" style="display:block;text-decoration:none;">
            <div class="gami-streak__num">${r.racha}</div>
            <div class="gami-streak__label">días seguidos</div>
          </a>
        </div>
      </div>`;
  },

  // Recuadro "Mi progreso" del panel, con números reales del servidor.
  renderMyStats(datos) {
    const r = this.resumenNivel(datos);
    if (!r) return '';
    const celda = (icono, valor, texto) => `
          <div class="gami-stat">
            <div class="gami-stat__icon">${zooIcon(icono, 20)}</div>
            <div class="gami-stat__val">${valor}</div>
            <div class="gami-stat__lbl">${texto}</div>
          </div>`;
    return `
      <div class="card gami-stats-card">
        <div class="gami-stats-header">Mi progreso</div>
        <div class="gami-stats-grid">
          ${celda('trophy', r.xp.toLocaleString('es-MX'), 'Puntos XP')}
          ${celda('sun', r.racha, 'Racha (días)')}
          ${celda('certificate', r.logrosGanados, 'Logros')}
          ${celda('gift', r.premiosDisponibles, 'Premios listos')}
        </div>
      </div>`;
  },

  // ============== SERVIDOR: LLAMADAS CON ID TOKEN ==============
  apiBase() {
    return (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) ? WEBHOOK_SERVER_URL : 'https://zoorigen-webhook-production.up.railway.app';
  },

  // Llama a un endpoint del servidor con el ID token del usuario. Devuelve el JSON; si falla lanza un Error
  // con .status (0 = sin red) y .data (el cuerpo si lo hubo). Los errores del servidor vienen como { error }.
  async apiFetch(ruta, op) {
    op = op || {};
    let user = null;
    try { user = (typeof auth !== 'undefined' && auth.currentUser) || (window.firebase && window.firebase.auth().currentUser); } catch (e) { user = null; }
    if (!user) { const e = new Error('Inicia sesión para continuar.'); e.status = 401; throw e; }
    const token = await user.getIdToken();
    const headers = Object.assign({ 'Authorization': 'Bearer ' + token }, op.headers || {});
    const conCuerpo = op.body !== undefined && op.body !== null;
    if (conCuerpo) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(this.apiBase() + ruta, { method: op.method || 'GET', headers, body: conCuerpo ? JSON.stringify(op.body) : undefined, cache: 'no-store' });
    } catch (err) {
      const e = new Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'); e.status = 0; throw e;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const e = new Error((data && data.error) || 'No se pudo completar la solicitud. Inténtalo de nuevo.');
      e.status = res.status; e.data = data; throw e;
    }
    return data;
  },

  // Igual que apiFetch pero devuelve un archivo (Blob), por ejemplo un PDF. El navegador no puede mandar el token en un
  // <iframe src>, por eso se pide con fetch y se muestra con una URL de blob.
  async apiBlob(ruta) {
    let user = null;
    try { user = (typeof auth !== 'undefined' && auth.currentUser) || (window.firebase && window.firebase.auth().currentUser); } catch (e) { user = null; }
    if (!user) { const e = new Error('Inicia sesión para continuar.'); e.status = 401; throw e; }
    const token = await user.getIdToken();
    let res;
    try {
      res = await fetch(this.apiBase() + ruta, { headers: { 'Authorization': 'Bearer ' + token }, cache: 'no-store' });
    } catch (err) {
      const e = new Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'); e.status = 0; throw e;
    }
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      const e = new Error((data && data.error) || 'No se pudo abrir el documento. Inténtalo de nuevo.');
      e.status = res.status; e.data = data; throw e;
    }
    return await res.blob();
  },

  // ============== DISPOSITIVO (para que los referidos cuenten solo si vienen de dispositivos distintos) ==============
  // deviceId: UUID que se guarda en este navegador. huella: resumen (hash) de navegador + idioma + zona horaria + pantalla.
  // Ninguno es infalible (modo incógnito u otro navegador dan valores nuevos); el servidor los usa junto con la IP.
  _uuid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const b = new Uint8Array(16); crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
        const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      }
    } catch (e) { /* cae al respaldo */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  getDeviceId() {
    const valido = s => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    try {
      let id = localStorage.getItem('zoo_device_id');
      if (!valido(id)) { id = this._uuid(); localStorage.setItem('zoo_device_id', id); }
      return id;
    } catch (e) {
      return this._uuid();   // sin almacenamiento: sirve para esta visita
    }
  },

  // Hash corto y estable (cyrb53) en hexadecimal.
  _hash(texto) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  },

  getHuella() {
    let ua = '', idioma = '', zona = '', pantalla = '';
    try { ua = navigator.userAgent || ''; idioma = navigator.language || ''; } catch (e) { /* sin navigator */ }
    try { zona = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { zona = ''; }
    try { pantalla = screen.width + 'x' + screen.height + 'x' + screen.colorDepth; } catch (e) { pantalla = ''; }
    return this._hash([ua, idioma, zona, pantalla].join('|'));
  },

  // ============== REFERIDOS: REGISTRO DEL INVITADO EN EL SERVIDOR ==============
  // Lo que el navegador escriba en miembros.referredBy ya NO cuenta. El invitado se registra con
  // POST /api/referidos/registrar usando su ID token. Si falla, NO bloquea el registro: queda pendiente
  // (localStorage zoo_ref_pendiente) y el panel lo reintenta una vez.
  async registrarReferido(user) {
    let codigo = null;
    try { codigo = localStorage.getItem('zoo_refCode'); } catch (e) { codigo = null; }
    codigo = (codigo || '').trim().toUpperCase().slice(0, 40);
    if (!codigo || !user) return { ok: false, motivo: 'sin-codigo' };
    const marcar = v => { try { if (v === null) localStorage.removeItem('zoo_ref_pendiente'); else localStorage.setItem('zoo_ref_pendiente', v); } catch (e) { /* sin almacenamiento */ } };
    marcar('1');
    try {
      const token = await user.getIdToken();
      const res = await fetch(this.apiBase() + '/api/referidos/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ codigo, deviceId: this.getDeviceId(), huella: this.getHuella() }),
        cache: 'no-store'
      });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && data.ok !== false) {
        marcar(null);
        try { localStorage.removeItem('zoo_refCode'); } catch (e) { /* nada */ }
        return { ok: true, estado: data.estado || null, motivo: data.motivo || null };
      }
      return { ok: false, motivo: (data && data.error) || 'error-servidor', status: res.status };
    } catch (err) {
      return { ok: false, motivo: 'sin-red' };
    }
  },

  // Reintento ÚNICO desde el panel si el registro del referido no alcanzó a llegar al servidor.
  async reintentarReferidoPendiente(user) {
    let pendiente = null;
    try { pendiente = localStorage.getItem('zoo_ref_pendiente'); } catch (e) { pendiente = null; }
    if (pendiente !== '1') return { ok: false, motivo: 'nada-pendiente' };
    try { localStorage.setItem('zoo_ref_pendiente', '0'); } catch (e) { /* nada */ }   // se consume: solo un reintento
    const r = await this.registrarReferido(user);
    try {
      if (r.ok) localStorage.removeItem('zoo_ref_pendiente');
      else { localStorage.setItem('zoo_ref_pendiente', '0'); localStorage.removeItem('zoo_refCode'); }   // segundo intento fallido: se descarta
    } catch (e) { /* nada */ }
    return r;
  },

  // Las cuentas creadas a partir de esta fecha deben confirmar su correo para entrar. Las anteriores (incluidas las de
  // los miembros que ya pagan) conservan el aviso discreto de siempre.
  VERIFICACION_OBLIGATORIA_DESDE: '2026-10-13T00:00:00Z',

  // ¿Esta cuenta tiene que confirmar el correo antes de usar el club?
  verificacionObligatoria(user, sesion) {
    if (!this.necesitaConfirmarCorreo(user)) return false;
    if (sesion && (sesion.planStatus === 'active' || sesion.planStatus === 'cancelled_active')) return false;
    if (sesion && sesion.role === 'admin') return false;
    let creada = null;
    try { creada = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : null; } catch (e) { creada = null; }
    if (!creada || isNaN(creada.getTime())) return false;
    return creada.getTime() >= new Date(this.VERIFICACION_OBLIGATORIA_DESDE).getTime();
  },

  // Pide al servidor el correo de verificación con la plantilla de Zoorigen; si el servidor no puede (sin configurar,
  // sin red), usa el correo estándar de Firebase. Devuelve { ok, via, esperar }.
  async enviarCorreoVerificacion(user) {
    const u = user || (typeof auth !== 'undefined' ? auth.currentUser : null);
    if (!u) return { ok: false, motivo: 'sin-sesion' };
    try {
      const r = await this.apiFetch('/api/auth/send-verification', { method: 'POST', body: {} });
      return { ok: true, via: 'zoorigen', yaVerificado: !!(r && r.yaVerificado) };
    } catch (err) {
      if (err && err.status === 429) return { ok: false, motivo: 'espera', esperar: true, msg: err.message };
    }
    try {
      try { auth.languageCode = 'es'; } catch (e) { /* nada */ }
      await u.sendEmailVerification();
      return { ok: true, via: 'firebase' };
    } catch (err) {
      return { ok: false, motivo: err && err.code === 'auth/too-many-requests' ? 'demasiados' : 'error' };
    }
  },

  // Pantalla completa "Confirma tu correo": reenviar, "ya lo confirmé" y cerrar sesión. Comprueba sola cada pocos segundos.
  mostrarPantallaVerificacion(user) {
    if (document.getElementById('zv-pantalla')) return;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const caja = document.createElement('div');
    caja.id = 'zv-pantalla';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.innerHTML = `
      <style>
        #zv-pantalla{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px 16px;background:#F5F2EA;font-family:var(--zoo-font-body);color:#16241B;overflow:auto}
        #zv-pantalla .zv-logo{width:56px;height:56px;border-radius:50%;object-fit:cover}
        #zv-pantalla .zv-card{width:100%;max-width:440px;padding:34px 28px 26px;text-align:center;background:#fff;border:1px solid #E3DDCF;border-radius:24px;box-shadow:0 24px 60px rgba(35, 35, 35,.14)}
        #zv-pantalla .zv-icono{width:80px;height:80px;margin:0 auto 18px;display:grid;place-items:center;border-radius:50%;background:#FBF1D6;color:#B27A06}
        #zv-pantalla .zv-icono svg{width:38px;height:38px}
        #zv-pantalla .zv-k{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#1F5F3A;margin-bottom:8px}
        #zv-pantalla h1{margin:0 0 10px;font-family:var(--zoo-font-display);font-size:24px;line-height:1.2;color:#16241B}
        #zv-pantalla p{margin:0;font-size:14.5px;line-height:1.6;color:#4B5A50}
        #zv-pantalla .zv-correo{display:inline-block;margin:10px 0 2px;padding:6px 12px;border-radius:999px;background:#F1EEE4;font-weight:700;font-size:13.5px;color:#16241B;word-break:break-all}
        #zv-pantalla .zv-pasos{margin-top:18px;padding:14px 16px;text-align:left;font-size:13px;line-height:1.55;color:#4B5A50;background:#F4F9F5;border-radius:14px}
        #zv-pantalla .zv-btn{display:block;width:100%;margin-top:12px;padding:14px 16px;border:0;border-radius:12px;font:700 15px var(--zoo-font-display);cursor:pointer}
        #zv-pantalla .zv-btn--p{background:#E8A317;color:#1F1D17}
        #zv-pantalla .zv-btn--s{background:transparent;color:#1F5F3A;border:1.5px solid #cfe0d4}
        #zv-pantalla .zv-btn:disabled{opacity:.6;cursor:default}
        #zv-pantalla .zv-estado{min-height:20px;margin-top:12px;font-size:13px;color:#4B5A50}
        #zv-pantalla .zv-salir{margin-top:6px;background:none;border:0;color:#5E6A60;font-size:13px;text-decoration:underline;cursor:pointer}
        #zv-pantalla footer{font-size:12px;color:#5E6A60}
        #zv-pantalla footer a{color:#1F5F3A;font-weight:700;text-decoration:none}
      </style>
      <img class="zv-logo" src="../assets/img/logo/logo.jpg" alt="Zoorigen">
      <main class="zv-card" aria-live="polite">
        <div class="zv-icono"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg></div>
        <div class="zv-k">Un paso más</div>
        <h1>Confirma tu correo</h1>
        <p>Te enviamos un mensaje a</p>
        <span class="zv-correo">${esc(user.email)}</span>
        <p style="margin-top:8px;">Abre el enlace del correo para activar tu cuenta y entrar al club.</p>
        <div class="zv-pasos"><strong>¿No lo ves?</strong><br>1. Revisa la carpeta de spam o correo no deseado.<br>2. Toca «Reenviar correo» para recibir uno nuevo.</div>
        <button type="button" class="zv-btn zv-btn--p" id="zv-reenviar">Reenviar correo</button>
        <button type="button" class="zv-btn zv-btn--s" id="zv-listo">Ya lo confirmé</button>
        <p class="zv-estado" id="zv-estado" role="status"></p>
        <button type="button" class="zv-salir" id="zv-salir">Cerrar sesión</button>
      </main>
      <footer>¿Necesitas ayuda? <a href="https://wa.me/5212361113237" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></footer>`;
    document.body.appendChild(caja);
    document.body.style.overflow = 'hidden';

    const estado = caja.querySelector('#zv-estado');
    const btnRe = caja.querySelector('#zv-reenviar');
    const decir = (txt) => { estado.textContent = txt; };
    const yaVerificado = async () => {
      try { await user.reload(); } catch (e) { return false; }
      if (!user.emailVerified) return false;
      try { await user.getIdToken(true); } catch (e) { /* nada */ }
      return true;
    };
    const continuar = () => { window.location.reload(); };
    let enfriar = null;
    const cuentaAtras = (seg) => {
      clearInterval(enfriar);
      btnRe.disabled = true;
      enfriar = setInterval(() => {
        seg -= 1;
        if (seg <= 0) { clearInterval(enfriar); btnRe.disabled = false; btnRe.textContent = 'Reenviar correo'; }
        else btnRe.textContent = 'Reenviar en ' + seg + ' s';
      }, 1000);
    };
    btnRe.addEventListener('click', async () => {
      btnRe.disabled = true;
      const r = await this.enviarCorreoVerificacion(user);
      if (r.ok) { decir('Listo, te enviamos otro correo. Revisa tu bandeja y la carpeta de spam.'); cuentaAtras(60); }
      else if (r.esperar) { decir(r.msg || 'Espera un minuto antes de pedir otro correo.'); cuentaAtras(60); }
      else if (r.motivo === 'demasiados') { decir('Ya pediste varios correos. Espera unos minutos antes de intentar de nuevo.'); cuentaAtras(120); }
      else { decir('No pudimos enviar el correo ahora. Inténtalo en un momento.'); btnRe.disabled = false; }
    });
    caja.querySelector('#zv-listo').addEventListener('click', async () => {
      decir('Comprobando…');
      if (await yaVerificado()) continuar();
      else decir('Todavía no aparece como confirmado. Abre el enlace del correo y vuelve a pulsar este botón.');
    });
    caja.querySelector('#zv-salir').addEventListener('click', () => this.logout());
    // Comprueba sola: si abre el enlace en otra pestaña o en el celular, aquí entra sin hacer nada.
    const sondeo = setInterval(async () => { if (await yaVerificado()) { clearInterval(sondeo); continuar(); } }, 5000);
    try {
      const canal = new BroadcastChannel('zoo_verificacion');
      canal.onmessage = async () => { if (await yaVerificado()) { clearInterval(sondeo); continuar(); } };
    } catch (e) { /* sin BroadcastChannel */ }
  },

  // ¿Hay que invitar a esta persona a confirmar su correo? (cuentas de correo y contraseña; Google ya viene confirmado)
  necesitaConfirmarCorreo(user) {
    if (!user || user.emailVerified !== false) return false;
    const prov = Array.isArray(user.providerData) ? user.providerData : [];
    if (prov.length && prov.every(p => p && p.providerId === 'google.com')) return false;
    return true;
  },

  showWelcomeModal(session) {
    const firstName = (session.name || 'Miembro').split(' ')[0];
    const planLabel = session.planTipo === 'anual' ? 'Plan Anual' : 'Plan Mensual';
    const venceLabel = session.planVence ? this.formatShort(session.planVence) : '';

    const modal = document.createElement('div');
    modal.id = 'zoo-welcome-modal';
    modal.innerHTML = `
      <div class="zoo-welcome-backdrop"></div>
      <div class="zoo-welcome-confetti">
        ${Array.from({length: 40}, (_, i) =>
          `<div class="zoo-confetti-piece" style="
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 2}s;
            animation-duration: ${3 + Math.random() * 2}s;
            background: ${['#E8A317','#6FBF73','#D55A28','#F5C62E','#2AA4D5'][Math.floor(Math.random() * 5)]};
          "></div>`
        ).join('')}
      </div>
      <div class="zoo-welcome-box">
        <button class="zoo-welcome-close" aria-label="Cerrar">×</button>
        <div class="zoo-welcome-emoji-wrap">
          <div class="zoo-welcome-emoji"><img class="zi-logo" src="../assets/img/logo/logo.jpg" alt="Zoorigen" width="64" height="64"></div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-1"><svg class="zi" aria-hidden="true"><use href="#zi-sparkles"/></svg></div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-2"><svg class="zi" aria-hidden="true"><use href="#zi-star"/></svg></div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-3"><svg class="zi" aria-hidden="true"><use href="#zi-sparkles"/></svg></div>
        </div>
        <div class="zoo-welcome-badge"><svg class="zi" aria-hidden="true"><use href="#zi-party-popper"/></svg> ¡BIENVENIDO AL CLUB VIP!</div>
        <h1 class="zoo-welcome-title">¡Felicidades <span>${firstName}</span>!</h1>
        <p class="zoo-welcome-desc">Eres parte oficial de <strong>Zoorigen</strong>, la comunidad científica de fauna más completa de México.</p>
        <div class="zoo-welcome-plan">
          <div class="zoo-welcome-plan-icon"><svg class="zi" aria-hidden="true"><use href="#zi-trophy"/></svg></div>
          <div>
            <div class="zoo-welcome-plan-label">${planLabel} activo</div>
            <div class="zoo-welcome-plan-sub">Acceso hasta ${venceLabel}</div>
          </div>
        </div>
        <div class="zoo-welcome-benefits">
          <div class="zoo-welcome-benefit"><span><svg class="zi" aria-hidden="true"><use href="#zi-library"/></svg></span><div><strong>Todos los cursos</strong><small>Desbloqueados para ti</small></div></div>
          <div class="zoo-welcome-benefit"><span><svg class="zi" aria-hidden="true"><use href="#zi-radio"/></svg></span><div><strong>Clases en vivo</strong><small>${zooEnVivoPronto() ? 'Próximamente, con especialistas' : 'Masterclasses mensuales con especialistas'}</small></div></div>
          <div class="zoo-welcome-benefit"><span><svg class="zi" aria-hidden="true"><use href="#zi-banknote"/></svg></span><div><strong>20% OFF permanente</strong><small>En todas las capacitaciones Zoorigen</small></div></div>
        </div>
        <button class="zoo-welcome-cta" id="zoo-welcome-cta-btn"><svg class="zi" aria-hidden="true"><use href="#zi-rocket"/></svg> Empezar a explorar</button>
        <div class="zoo-welcome-footer">¿Necesitas ayuda? Contáctanos por <a href="https://wa.me/5212361113237" target="_blank">WhatsApp</a></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    return new Promise((resolver) => {
      let cerrado = false;
      const close = () => {
        if (cerrado) return;
        cerrado = true;
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', alTeclear, true);
        resolver();
      };
      const alTeclear = (ev) => { if (ev.key === 'Escape') close(); };
      document.addEventListener('keydown', alTeclear, true);
      modal.querySelector('.zoo-welcome-close').addEventListener('click', close);
      modal.querySelector('#zoo-welcome-cta-btn').addEventListener('click', close);
      modal.querySelector('.zoo-welcome-backdrop').addEventListener('click', close);
    });
  },

  timeAgo(isoDate) {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return '';
      const diff = Date.now() - d.getTime();
      const min = Math.floor(diff / 60000);
      const hrs = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (min < 1) return 'Ahora mismo';
      if (min < 60) return `Hace ${min} min`;
      if (hrs < 24) return `Hace ${hrs} h`;
      if (days === 0) return 'Hoy';
      if (days === 1) return 'Ayer';
      if (days < 7) return `Hace ${days} días`;
      return this.formatShort(isoDate);
    } catch { return ''; }
  },

  renderNewsCard(n) {
    const hasImage = n.image && n.image.startsWith('http');
    const sourceColor = this.sourceColorClass(n.source);
    const linkAttr = n.link ? `href="${n.link}" target="_blank" rel="noopener"` : '';
    const tag = n.link ? 'a' : 'div';
    const dateText = this.timeAgo(n.pubDate || n.createdAt);
    const source = n.source || 'Zoorigen';

    return `
      <${tag} class="news-card" ${linkAttr}>
        <div class="news-card__img ${hasImage ? '' : 'no-image'}" ${hasImage ? `style="background-image:url('${n.image}');"` : ''}>
          ${!hasImage ? (n.icon || '<svg class="zi" aria-hidden="true"><use href="#zi-newspaper"/></svg>') : ''}
        </div>
        <div class="news-card__body">
          <span class="news-card__source ${sourceColor}">${n.icon || '●'} ${source}</span>
          <h4 class="news-card__title">${n.title || ''}</h4>
          ${n.summary ? `<p class="news-card__summary">${n.summary}</p>` : ''}
          <div class="news-card__footer">
            ${dateText ? `<span>${dateText}</span>` : ''}
            ${n.link ? `<span class="read-more">Leer <svg class="zi" aria-hidden="true"><use href="#zi-arrow-up-right"/></svg></span>` : ''}
          </div>
        </div>
      </${tag}>`;
  },

  buildDriveEmbed(driveId) {
    if (!driveId) return null;
    return `https://drive.google.com/file/d/${driveId}/preview`;
  },

  buildDrivePdfView(driveId) {
    if (!driveId) return null;
    return `https://drive.google.com/file/d/${driveId}/view`;
  },

  // ============== AUTH CON FIREBASE ==============
  async register(data) {
    if (!data.email || !data.password || !data.name) return { ok: false, msg: 'Todos los campos son obligatorios' };
    if (data.password.length < 6) return { ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' };
    try {
      const cred = await auth.createUserWithEmailAndPassword(data.email.toLowerCase().trim(), data.password);
      await cred.user.updateProfile({ displayName: data.name });

      const docData = {
        uid: cred.user.uid,
        email: data.email.toLowerCase().trim(),
        name: data.name,
        phone: data.phone || '',
        role: 'member',
        planActivo: false,
        planCancelado: false,
        planTipo: null,
        planInicio: null,
        planVence: null,
        ultimoPago: null,
        streak: 0,
        createdAt: new Date().toISOString()
      };

      // Ya NO se escribe referredBy desde el navegador (no cuenta): el referido se registra en el servidor.
      await db.collection('miembros').doc(cred.user.uid).set(docData);

      // Ambas cosas son "de cortesía": si fallan, la cuenta ya quedó creada y el registro NO se bloquea.
      try { auth.languageCode = 'es'; } catch (e) { /* nada */ }
      const [correoEnviado, referido] = await Promise.all([
        this.enviarCorreoVerificacion(cred.user).then(r => !!(r && r.ok)).catch(() => false),
        this._conTiempo(this.registrarReferido(cred.user), 7000)
      ]);
      return { ok: true, uid: cred.user.uid, correoEnviado, referido };
    } catch (err) {
      console.error('Register error:', err);
      const map = {
        'auth/email-already-in-use': 'Este correo ya está registrado. Intenta iniciar sesión.',
        'auth/invalid-email': 'El correo no es válido',
        'auth/weak-password': 'La contraseña es muy débil',
        'auth/network-request-failed': 'Error de conexión. Revisa tu internet.'
      };
      return { ok: false, msg: map[err.code] || err.message };
    }
  },

  async login(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email.toLowerCase().trim(), password);
      return { ok: true };
    } catch (err) {
      const map = {
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/user-not-found': 'No existe cuenta con ese correo',
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
        'auth/too-many-requests': 'Demasiados intentos. Intenta en unos minutos.',
        'auth/network-request-failed': 'Error de conexión.'
      };
      return { ok: false, msg: map[err.code] || err.message };
    }
  },

  // modo 'entrar' (pantalla de iniciar sesión): solo entra quien YA tiene cuenta; si Google la acaba de crear, se deshace.
  // modo 'crear' (pantalla de crear cuenta): solo crea cuentas nuevas; si el correo ya existe, no entra y se le pide iniciar sesión.
  async loginWithGoogle(opciones) {
    const modo = opciones && opciones.modo === 'crear' ? 'crear' : 'entrar';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      try { provider.setCustomParameters({ prompt: 'select_account' }); } catch (e) { /* nada */ }
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      const esNuevaEnAuth = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
      if (modo === 'entrar' && esNuevaEnAuth) {
        // La persona solo quería entrar y no tenía cuenta: se deshace la cuenta que Google acaba de crear.
        try { await user.delete(); }
        catch (errBorrar) { try { await auth.signOut(); } catch (errSalir) { /* sin sesión de todos modos */ } }
        return { ok: false, codigo: 'sin-cuenta', msg: 'Ese correo de Google todavía no tiene una cuenta en Zoorigen. Primero crea tu cuenta.' };
      }
      if (modo === 'crear' && !esNuevaEnAuth) {
        try { await auth.signOut(); } catch (errSalir) { /* nada */ }
        return { ok: false, codigo: 'ya-existe', msg: 'Ya existe una cuenta con ese correo. Inicia sesión.' };
      }
      const docRef = db.collection('miembros').doc(user.uid);
      const doc = await docRef.get();
      let nuevo = false;
      if (!doc.exists) {
        nuevo = true;
        await docRef.set({
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          phone: user.phoneNumber || '',
          role: 'member',
          planActivo: false,
          planCancelado: false,
          planTipo: null,
          planInicio: null,
          planVence: null,
          ultimoPago: null,
          streak: 0,
          createdAt: new Date().toISOString(),
          authProvider: 'google'
        });
      }
      // Solo una cuenta NUEVA puede contar como invitada (Google ya trae el correo confirmado).
      const referido = nuevo ? await this._conTiempo(this.registrarReferido(user), 7000) : null;
      return { ok: true, nuevo, referido };
    } catch (err) {
      console.error('Google login error:', err);
      let msg = 'No se pudo iniciar sesión con Google';
      if (err.code === 'auth/popup-blocked') msg = 'Tu navegador bloqueó el popup de Google. Permite popups para zoorigen.com.';
      if (err.code === 'auth/popup-closed-by-user') msg = 'Cerraste la ventana de Google antes de iniciar sesión.';
      if (err.code === 'auth/cancelled-popup-request') msg = 'Solo puede haber un popup de Google a la vez.';
      if (err.code === 'auth/unauthorized-domain') msg = 'Este dominio no está autorizado para iniciar sesión con Google. Avisa al administrador.';
      if (err.code === 'auth/network-request-failed') msg = 'Error de conexión. Revisa tu internet.';
      return { ok: false, msg, cancelado: err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request' };
    }
  },

  // Espera una promesa como máximo `ms` milisegundos; si tarda más, responde que se agotó el tiempo (la promesa sigue su curso).
  _conTiempo(promesa, ms) {
    return new Promise(resolver => {
      const t = setTimeout(() => resolver({ ok: false, motivo: 'tiempo' }), ms);
      Promise.resolve(promesa).then(v => { clearTimeout(t); resolver(v); }, () => { clearTimeout(t); resolver({ ok: false, motivo: 'error' }); });
    });
  },

  async resetPassword(email) {
    try {
      await auth.sendPasswordResetEmail(email.toLowerCase().trim());
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: 'No se pudo enviar el correo.' };
    }
  },

  logout() {
    // El estado de la membresía que se guardó para pintar la barra lateral al instante no debe quedar para quien entre después.
    try { localStorage.removeItem('zoo_plan'); document.documentElement.removeAttribute('data-plan'); } catch (e) { /* sin almacenamiento */ }
    auth.signOut().then(() => { window.location.href = 'club-login.html'; });
  },

  requireAuth() {
    return new Promise((resolve) => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = 'club-login.html'; return resolve(null); }
        try {
          const doc = await db.collection('miembros').doc(user.uid).get();
          const data = doc.exists ? doc.data() : {};
          const sesion = {
            uid: user.uid,
            email: user.email,
            name: data.name || user.displayName || user.email.split('@')[0],
            phone: data.phone || '',
            role: data.role || 'member',
            planActivo: data.planActivo || false,
            planCancelado: data.planCancelado || false,
            planTipo: data.planTipo || null,
            planInicio: data.planInicio || null,
            planVence: data.planVence || null,
            ultimoPago: data.ultimoPago || null,
            stripeSubscriptionId: data.stripeSubscriptionId || null,
            stripeSubscriptionStatus: data.stripeSubscriptionStatus || null,
            createdAt: data.createdAt || null,
            streak: data.streak || 0,
            planStatus: this.calculateStatus(data)
          };
          // Cuentas nuevas con correo y contraseña: no entran al club hasta confirmar el correo.
          // (Google ya viene confirmado; las cuentas anteriores a la fecha de corte y las que ya pagan siguen como siempre.)
          if (this.verificacionObligatoria(user, sesion)) {
            this.mostrarPantallaVerificacion(user);
            return;
          }
          resolve(sesion);
        } catch (err) {
          console.error('Error loading profile:', err);
          resolve({ uid: user.uid, email: user.email, name: user.displayName || user.email.split('@')[0], planStatus: 'pending_payment' });
        }
      });
    });
  },

  calculateStatus(data) {
    if (!data) return 'pending_payment';
    const vence = this.toDate(data.planVence || data.fechaExpiracion);
    const vigente = Boolean(vence && vence.getTime() > Date.now());
    const estadoCobro = data.stripeSubscriptionStatus || data.planStatus;
    if (['past_due', 'unpaid', 'incomplete'].includes(estadoCobro)) return 'past_due';
    if (data.planStatus === 'cancelled_active' && vigente) return 'cancelled_active';
    if (data.planCancelado && vigente && data.planActivo !== false) return 'cancelled_active';
    if (data.planActivo === true && vigente) return 'active';
    if (vence && !vigente) return 'expired';
    return 'pending_payment';
  },

  hasActiveMembership(session) {
    if (!session) return false;
    const status = this.calculateStatus(session);
    return status === 'active' || status === 'cancelled_active';
  },

  toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    if (Number.isFinite(value._seconds)) return new Date(value._seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  async cancelSubscription() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No hay sesión');
      const idToken = await user.getIdToken();
      const res = await fetch(`${WEBHOOK_SERVER_URL}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar');
      return { ok: true, msg: data.message, accesoHasta: data.accesoHasta || null };
    } catch (err) {
      console.error('Cancel error:', err);
      return { ok: false, msg: 'No se pudo cancelar. Escríbenos por WhatsApp.' };
    }
  },

  // ============== HELPERS UI ==============
  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  },

  formatDate(date = new Date()) {
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  },

  formatShort(isoDate) {
    if (!isoDate) return '—';
    try {
      const d = this.toDate(isoDate);
      if (!d) return '—';
      const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return '—'; }
  },

  getInitials(name) {
    if (!name) return 'V';
    return name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  },

  renderSidebar(activeId, session) {
    const planLabel = session?.planStatus === 'active' ? 'Membresía activa' :
                      session?.planStatus === 'cancelled_active' ? 'Acceso vigente' :
                      session?.planStatus === 'past_due' ? 'Pago no confirmado' :
                      session?.planStatus === 'expired' ? 'Membresía vencida' :
                      'Cuenta gratuita';
    const renewText = session?.planVence
      ? `${session.planStatus === 'active' ? 'Renueva' : session.planStatus === 'cancelled_active' ? 'Acceso hasta' : 'Venció'} ${this.formatShort(session.planVence)}`
      : 'Acceso gratuito';
    const isActivePlan = this.hasActiveMembership(session);
    const planDotColor = session?.planStatus === 'active' ? '#6FBF73' : session?.planStatus === 'cancelled_active' ? '#E8A317' : !isActivePlan ? '#E8A317' : '#a0a8a4';
    const planLabelColor = isActivePlan ? 'var(--zoo-ok-txt)' : 'var(--zoo-amber, #E8A317)';

    // Con la estructura nueva (club-shell.js) el menú sale agrupado de una sola fuente; sin ella queda el listado plano de antes.
    this._shellActivo = activeId;
    this._shellSesion = session;
    this._guardarEstadoPlan(session);
    const items = [
      { id: 'inicio', label: 'Inicio', icon: 'home', href: 'club-dashboard.html' },
      { id: 'biblioteca', label: 'Cursos', icon: 'book', href: 'club-biblioteca.html' },
      { id: 'retos', label: 'Retos', icon: 'target', href: 'club-retos.html' },
      { id: 'foro', label: 'Foro VIP', icon: 'messages', href: 'club-foro.html' },
      { id: 'directorio', label: 'Directorio VIP', icon: 'users', href: 'club-directorio.html' },
      { id: 'canal', label: 'Canal de WhatsApp', icon: 'brandwhatsapp', href: 'club-canal.html' },
      { id: 'videos', label: 'Videos', icon: 'video', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Webinars en vivo', icon: 'broadcast', href: 'club-sesiones.html' },
      { id: 'pdfs', label: 'PDFs', icon: 'filetext', href: 'club-pdfs.html' },
      { id: 'herramientas', label: 'Herramientas clínicas', icon: 'flask', href: 'club-herramientas.html' },
      { id: 'legal', label: 'Herramientas legales', icon: 'scale', href: 'club-legal.html' }
    ];
    const itemsCuenta = [
      { id: 'logros', label: 'Mis logros', icon: 'trophy', href: 'club-logros.html' },
      { id: 'certificados', label: 'Mis certificados', icon: 'certificate', href: 'club-certificados.html' },
      { id: 'referidos', label: 'Invitar amigos', icon: 'gift', href: 'club-referidos.html' },
      { id: 'perfil', label: 'Mi perfil', icon: 'user', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: 'creditcard', href: 'club-suscripcion.html' }
    ];

    // Auto-activar paywall en TODAS las páginas (se ejecuta después de renderizar)
    // Excepto en suscripción y perfil (ahí es donde el usuario va a pagar / editar datos)
    setTimeout(() => {
      if (activeId !== 'suscripcion' && activeId !== 'perfil') {
        this.enablePaywallOnPage(session);
      }
    }, 150);

    return `
      <button class="club-sidebar__close" id="sidebarCloseBtn" aria-label="Cerrar menú"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button>
      <div class="club-sidebar__brand">
        <img src="../assets/img/logo/logo-96.webp" alt="Zoorigen" width="44" height="44">
        <div class="club-sidebar__brand-text">
          <h3>Zoorigen</h3>
          <small>${isActivePlan ? 'Club VIP' : 'Acceso gratuito'}</small>
        </div>
      </div>
      ${(typeof ZOO_SHELL !== 'undefined' && ZOO_SHELL.menuHTML) ? ZOO_SHELL.menuHTML(activeId, '') : `
      <div class="club-sidebar__section">Principal</div>
      ${items.map(i => `
        <a href="${i.href}" class="${i.id === activeId ? 'is-active' : ''}">
          <span class="icon">${zooIcon(i.icon)}</span>${i.label}
          ${i.badge ? `<span class="badge">${i.badge}</span>` : ''}
        </a>
      `).join('')}
      <div class="club-sidebar__section">Mi cuenta</div>
      ${itemsCuenta.map(i => `
        <a href="${i.href}" class="${i.id === activeId ? 'is-active' : ''}">
          <span class="icon">${zooIcon(i.icon)}</span>${i.label}
        </a>
      `).join('')}`}
      <div class="club-sidebar__plan" style="padding:10px 12px;text-align:center;">
        <div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="width:7px;height:7px;border-radius:50%;background:${planDotColor};"></span>
          <span class="plan-label" style="margin:0;font-size:.75rem;letter-spacing:.06em;color:${planLabelColor};">${planLabel.toUpperCase()}</span>
        </div>
        <div class="plan-meta" style="font-size:.75rem;margin-bottom:8px;opacity:.75;">${renewText}</div>
        ${!isActivePlan ? `
        <a href="club-suscripcion.html" style="display:block;font-size:.78rem;background:rgba(232,163,23,0.12);border:1px solid rgba(232,163,23,0.4);color:var(--zoo-amber,#E8A317);padding:7px 10px;border-radius:8px;margin-bottom:8px;font-weight:700;text-decoration:none;">
          Activar membresía
        </a>` : ''}
        <a href="#" class="plan-logout" style="display:inline-block;font-size:.8rem;" onclick="ZOORIGEN_CLUB.logout(); return false;">Cerrar sesión</a>
      </div>
    `;
  },

  // Guarda el ESTADO de la membresía (solo eso: ni nombre ni correo) para que la barra lateral de la página siguiente pinte su
  // bloque de plan desde el primer cuadro, sin esperar a Firebase (el script del <head> lo lee y lo pone en <html data-plan>).
  _guardarEstadoPlan(session) {
    const validos = ['active', 'cancelled_active', 'past_due', 'expired'];
    let estado = validos.includes(session && session.planStatus) ? session.planStatus : 'free';
    // El administrador ve el Club completo: cuenta como miembro para la barra inferior y el bloque de plan.
    if (session && session.role === 'admin' && estado !== 'active' && estado !== 'cancelled_active') estado = 'active';
    try {
      localStorage.setItem('zoo_plan', estado);
      document.documentElement.setAttribute('data-plan', estado);
    } catch (e) { /* sin almacenamiento */ }
  },

  // Helper interno para mostrar guía desde el sidebar
  async _showGuideFromSidebar() {
    // Recorrido guiado único (club-onboarding.js): en el Inicio se abre aquí; en las demás páginas se va al Inicio y se abre allá.
    if (typeof window !== 'undefined' && window.ZOO_ONBOARDING && typeof window.ZOO_ONBOARDING.repetirRecorrido === 'function') {
      const s = window.__zooSession || null;
      window.ZOO_ONBOARDING.repetirRecorrido(s);
      return;
    }
    if (!/club-dashboard\.html/.test(window.location.pathname)) { window.location.href = 'club-dashboard.html?guia=1'; return; }
    const session = await this.requireAuth();
    if (session) this.showOnboardingForced(session);
  },

  // ============== TEMA CLARO/OSCURO ==============
  // Aplica el tema guardado al cargar la página
  initTheme() {
    const saved = localStorage.getItem('zoo_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this._updateThemeIcons(saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zoo_theme', next);
    this._updateThemeIcons(next);
  },

  _updateThemeIcons(theme) {
    const btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(btn => {
      btn.innerHTML = zooIcon(theme === 'dark' ? 'sun' : 'moon', 16);
      btn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    });
  },

  // ============== GUÍA DE BIENVENIDA (onboarding profesional) ==============
  showOnboarding(session) {
    if (!session) return;
    const key = 'zoo_onboard_done_' + session.uid;
    if (localStorage.getItem(key)) return;

    const nombre = (session.name || session.email.split('@')[0]).split(' ')[0];

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,18,21,0.74);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:zooFadeIn .4s ease;';
    overlay.innerHTML = `
      <style>
        @keyframes zooFadeIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes zooFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes confettiFall { 0%{transform:translateY(-100vh) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        .zoo-confetti { position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100000;overflow:hidden; }
        .zoo-confetti-piece { position:absolute;width:10px;height:10px;top:-20px;animation:confettiFall linear forwards; }
        .zoo-welcome-box { max-width:520px;width:100%;max-height:92vh;overflow-y:auto;background:var(--zoo-panel, #1F5F3A);border:2px solid rgba(232,163,23,0.3);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,0.45);position:relative;z-index:100001; }
        .zoo-welcome-close { position:absolute;top:14px;right:14px;z-index:5;width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s; }
        .zoo-welcome-close:hover { background:rgba(0,0,0,0.55);transform:scale(1.08); }
        .zoo-welcome-top { background:rgba(255,255,255,0.06);padding:40px 30px 20px;text-align:center;position:relative; }
        .zoo-welcome-logo { width:80px;height:80px;border-radius:50%;border:3px solid rgba(232,163,23,0.4);margin:0 auto 16px;animation:zooFloat 3s ease-in-out infinite;object-fit:cover; }
        .zoo-welcome-confetti { font-size:2rem;margin-bottom:8px; }
        .zoo-welcome-title { color:#fff;font-family:var(--zoo-font-display);font-size:1.6rem;font-weight:800;margin:0 0 4px;line-height:1.2; }
        .zoo-welcome-name { color:#E8A317;font-size:1.8rem;font-weight:800;font-family:var(--zoo-font-display); }
        .zoo-welcome-sub { color:rgba(255,255,255,0.7);font-size:.92rem;margin-top:8px; }
        .zoo-welcome-body { padding:24px 30px 30px; }
        .zoo-welcome-features { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px; }
        .zoo-welcome-feat { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center; }
        .zoo-welcome-feat-icon { font-size:1.5rem;margin-bottom:6px; }
        .zoo-welcome-feat-text { color:rgba(255,255,255,0.85);font-size:.82rem;font-weight:600; }
        .zoo-welcome-cta { display:block;width:100%;padding:16px;background:var(--zoo-amber, #E8A317);color:#1f1d17;border:0;border-radius:14px;font-family:var(--zoo-font-display);font-size:1.05rem;font-weight:700;cursor:pointer;letter-spacing:.02em;transition:all .2s; }
        .zoo-welcome-cta:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,18,21,0.16); }
        .zoo-welcome-skip { display:block;text-align:center;margin-top:12px;color:rgba(255,255,255,0.4);font-size:.8rem;cursor:pointer;border:0;background:0; }
        @media(max-width:500px) { .zoo-welcome-features{grid-template-columns:1fr;} .zoo-welcome-title{font-size:1.3rem;} .zoo-welcome-name{font-size:1.5rem;} .zoo-welcome-top{padding:30px 20px 16px;} .zoo-welcome-body{padding:20px;} }
      </style>
      <div class="zoo-welcome-box">
        <button class="zoo-welcome-close" id="zooWelcomeClose" aria-label="Cerrar"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button>
        <div class="zoo-welcome-top">
          <div class="zoo-welcome-confetti"><svg class="zi" aria-hidden="true"><use href="#zi-party-popper"/></svg></div>
          <img src="../assets/img/logo/logo.jpg" class="zoo-welcome-logo" alt="Zoorigen">
          <div class="zoo-welcome-title">¡Bienvenido al Club VIP!</div>
          <div class="zoo-welcome-name">${nombre}</div>
          <div class="zoo-welcome-sub">Ya eres parte de la comunidad científica de fauna más completa de México</div>
        </div>
        <div class="zoo-welcome-body">
          <div class="zoo-welcome-features">
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-library"/></svg></div><div class="zoo-welcome-feat-text">Cursos completos</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-video"/></svg></div><div class="zoo-welcome-feat-text">${zooEnVivoPronto() ? 'Clases en vivo (pronto)' : 'Webinars en vivo'}</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-dna"/></svg></div><div class="zoo-welcome-feat-text">Herramientas clínicas</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-scale"/></svg></div><div class="zoo-welcome-feat-text">Herramientas legales</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-trophy"/></svg></div><div class="zoo-welcome-feat-text">Logros y recompensas</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon"><svg class="zi" aria-hidden="true"><use href="#zi-message-circle"/></svg></div><div class="zoo-welcome-feat-text">Foro VIP exclusivo</div></div>
          </div>
          <button class="zoo-welcome-cta" id="zooWelcomeStart">Explorar mi Club VIP <svg class="zi" aria-hidden="true"><use href="#zi-rocket"/></svg></button>
          <button class="zoo-welcome-skip" id="zooWelcomeSkip">Saltar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Generar confetti
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'zoo-confetti';
    const colors = ['#E8A317','#6FBF73','#D55A28','#2AA4D5','#fff','#F5C62E','#ff6b9d'];
    const shapes = ['circle','square'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'zoo-confetti-piece';
      const color = colors[Math.floor(Math.random()*colors.length)];
      const shape = shapes[Math.floor(Math.random()*shapes.length)];
      const size = 6 + Math.random()*8;
      piece.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;background:${color};border-radius:${shape==='circle'?'50%':'2px'};animation-duration:${2+Math.random()*3}s;animation-delay:${Math.random()*1.5}s;`;
      confettiContainer.appendChild(piece);
    }
    document.body.appendChild(confettiContainer);
    setTimeout(() => confettiContainer.remove(), 5000);

    const close = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .3s';
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 300);
      localStorage.setItem(key, new Date().toISOString());
    };

    document.getElementById('zooWelcomeStart').addEventListener('click', close);
    document.getElementById('zooWelcomeSkip').addEventListener('click', close);
    document.getElementById('zooWelcomeClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  },

  // Forzar mostrar la guía (para ponerla en un botón "Ver guía" después)
  showOnboardingForced(session) {
    localStorage.removeItem('zoo_onboard_done_' + session.uid);
    this.showOnboarding(session);
  },

  // ============== MOBILE MENU TOGGLE ==============
  initMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Barra superior, barra inferior del celular y cajón "Más" (club-shell.js)
    try {
      if (typeof ZOO_SHELL !== 'undefined' && ZOO_SHELL.montar) ZOO_SHELL.montar({ sesion: this._shellSesion, activo: this._shellActivo });
    } catch (e) { console.warn('Estructura del panel no disponible:', e); }

    // Cerrar sidebar
    const closeSidebar = () => {
      sidebar.classList.remove('is-open');
      document.body.classList.remove('sidebar-open');
      const overlay = document.getElementById('sidebarOverlay');
      if (overlay) overlay.classList.remove('is-visible');
    };

    // Abrir sidebar (para botón hamburguesa en header)
    const openSidebar = () => {
      sidebar.classList.add('is-open');
      document.body.classList.add('sidebar-open');
      let overlay = document.getElementById('sidebarOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'club-sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
      }
      setTimeout(() => overlay.classList.add('is-visible'), 10);
    };

    // Botón de cerrar dentro del sidebar
    const closeBtn = document.getElementById('sidebarCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    // Botón hamburguesa (si existe)
    const hamburger = document.getElementById('mobileMenuBtn');
    if (hamburger) hamburger.addEventListener('click', openSidebar);

    // Exponer globalmente
    window.__zooCloseSidebar = closeSidebar;
    window.__zooOpenSidebar = openSidebar;
  },

  startCountdown(elId, targetIso) {
    const el = document.getElementById(elId);
    if (!el) return;
    const target = new Date(targetIso + 'T19:00:00').getTime();
    const render = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.innerHTML = `
        <div><strong>${String(d).padStart(2,'0')}</strong><span>DÍAS</span></div>
        <div><strong>${String(h).padStart(2,'0')}</strong><span>HRS</span></div>
        <div><strong>${String(m).padStart(2,'0')}</strong><span>MIN</span></div>
        <div><strong>${String(s).padStart(2,'0')}</strong><span>SEG</span></div>
      `;
    };
    render();
    setInterval(render, 1000);
  },

  // ═══════════════ SISTEMA DE PAYWALL (Usuario sin pagar) ═══════════════
  // Verifica si el usuario es VIP activo; si NO lo es, muestra modal de paywall.
  // Retorna true si tiene acceso, false si se mostró el paywall.
  requireVIP(session, accionLabel) {
    if (!session) return false;
    const isActive = this.hasActiveMembership(session);
    if (isActive) return true;
    this.showPaywall(session, accionLabel);
    return false;
  },

  showPaywall(session, accionLabel) {
    // Si ya hay un paywall abierto, no duplicar
    if (document.getElementById('zooPaywall')) return;

    const label = accionLabel || 'acceder a esta función';
    const overlay = document.createElement('div');
    overlay.id = 'zooPaywall';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,18,21,0.74);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:zooPaywallFade .25s ease-out;';
    overlay.innerHTML = `
      <div style="max-width:500px;width:100%;background:var(--zoo-solid, #1F5F3A);border:2px solid rgba(232,163,23,0.5);border-radius:22px;padding:36px 30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.45);position:relative;overflow:hidden;">
        <button id="zooPaywallClose" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.3);border:0;color:#fff;font-size:1rem;cursor:pointer;"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button>
        <div style="font-size:3.8rem;margin-bottom:14px;"><svg class="zi" aria-hidden="true"><use href="#zi-lock"/></svg></div>
        <div style="display:inline-block;background:rgba(232,163,23,0.2);color:#E8A317;padding:5px 14px;border-radius:20px;font-size:.75rem;font-weight:700;letter-spacing:.12em;margin-bottom:14px;">ACCESO EXCLUSIVO VIP</div>
        <h2 style="font-family:var(--zoo-font-display);color:#fff;font-size:1.6rem;margin:0 0 10px;line-height:1.2;">Necesitas ser Miembro VIP para ${label}</h2>
        <p style="color:rgba(255,255,255,0.88);font-size:.95rem;margin:0 0 22px;line-height:1.55;">Suscríbete y desbloquea toda la plataforma: cursos, ${zooEnVivoPronto() ? 'foro' : 'webinars, foro'}, herramientas profesionales y certificados con validez.</p>

        <div style="background:rgba(0,0,0,0.25);border-radius:14px;padding:18px;margin-bottom:20px;text-align:left;">
          <div style="color:#E8A317;font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;"><svg class="zi" aria-hidden="true"><use href="#zi-sparkles"/></svg> Beneficios VIP</div>
          <div style="color:#fff;font-size:.9rem;line-height:1.85;">
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> <strong>Todos los cursos</strong> completos<br>
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> ${zooEnVivoPronto() ? '<strong>Clases en vivo</strong> (próximamente)' : '<strong>Webinars</strong> en vivo cada mes'}<br>
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> <strong>Foro VIP</strong> con expertos<br>
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> <strong>Certificados</strong> con validez<br>
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> <strong>Herramientas</strong> clínicas y legales<br>
            <svg class="zi" aria-hidden="true"><use href="#zi-circle-check"/></svg> <strong>20% descuento</strong> en cursos Zoorigen<br>
            Videos y PDFs descargables
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <button id="zooPaywallMens" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:14px 10px;border-radius:12px;cursor:pointer;font-family:var(--zoo-font-display);transition:all .15s;">
            <div style="font-weight:700;font-size:.78rem;opacity:.8;">MENSUAL</div>
            <div style="font-weight:800;font-size:1.3rem;margin:2px 0;">$199<span style="font-size:.75rem;opacity:.7;">/mes</span></div>
            <div style="font-size:.75rem;opacity:.7;">Cancela cuando quieras</div>
          </button>
          <button id="zooPaywallAnual" style="background:var(--zoo-amber, #E8A317);border:0;color:#1f1d17;padding:14px 10px;border-radius:12px;cursor:pointer;font-family:var(--zoo-font-display);font-weight:800;position:relative;box-shadow:0 6px 18px rgba(15,18,21,0.16);">
            <div style="position:absolute;top:-8px;right:6px;background:#D55A28;color:#fff;font-size:.75rem;padding:2px 8px;border-radius:10px;font-weight:800;">-20% OFF</div>
            <div style="font-weight:700;font-size:.78rem;">ANUAL</div>
            <div style="font-weight:800;font-size:1.3rem;margin:2px 0;">$1,899<span style="font-size:.75rem;">/año</span></div>
            <div style="font-size:.75rem;">Ahorra $489</div>
          </button>
        </div>

        <button id="zooPaywallLater" style="background:transparent;border:0;color:rgba(255,255,255,0.6);font-size:.82rem;cursor:pointer;padding:8px;">Seguir explorando</button>
      </div>
      <style>
        @keyframes zooPaywallFade { from{opacity:0} to{opacity:1} }
        #zooPaywallMens:hover { background:rgba(255,255,255,0.15) !important; }
        #zooPaywallAnual:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(15,18,21,0.16) !important; }
      </style>
    `;
    document.body.appendChild(overlay);

    const email = session.email || '';
    const goCheckout = (plan) => {
      iniciarPagoStripe(plan, email);
    };
    document.getElementById('zooPaywallMens').addEventListener('click', () => goCheckout('mensual'));
    document.getElementById('zooPaywallAnual').addEventListener('click', () => goCheckout('anual'));
    const close = () => overlay.remove();
    document.getElementById('zooPaywallClose').addEventListener('click', close);
    document.getElementById('zooPaywallLater').addEventListener('click', close);
  },

  // Intercepta clicks en elementos con data-vip-required para mostrar paywall
  enablePaywallOnPage(session) {
    const isActive = this.hasActiveMembership(session);
    if (isActive) return; // Miembro activo o cancelado con tiempo, no hace falta bloquear

    // Buscar todos los elementos con data-vip-required y bloquearlos
    document.querySelectorAll('[data-vip-required]').forEach(el => {
      el.style.position = 'relative';
      // Cuando hace click, mostrar paywall
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const label = el.dataset.vipLabel || 'acceder a esta función';
        this.showPaywall(session, label);
      }, true);
      // Overlay visual "candado" suave
      if (!el.querySelector('.zoo-vip-lock')) {
        const lock = document.createElement('div');
        lock.className = 'zoo-vip-lock';
        lock.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(232,163,23,0.9);color:#1f1d17;padding:4px 10px;border-radius:14px;font-size:.75rem;font-weight:800;letter-spacing:.06em;pointer-events:none;z-index:5;';
        lock.textContent = 'VIP';
        el.appendChild(lock);
      }
    });

    // Banner global arriba del main
    const main = document.querySelector('.club-main');
    if (main && !document.getElementById('zooPayBanner')) {
      const banner = document.createElement('div');
      banner.id = 'zooPayBanner';
      banner.style.cssText = 'background:#E8B431;color:#2B2000;padding:12px 18px;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;cursor:pointer;';
      banner.innerHTML = `
        <div style="font-size:1.8rem;line-height:1;"><svg class="zi" aria-hidden="true"><use href="#zi-lock"/></svg></div>
        <div style="flex:1;min-width:200px;">
          <div style="font-family:var(--zoo-font-display);font-weight:800;font-size:.98rem;margin-bottom:2px;">Acceso gratuito</div>
          <div style="font-size:.82rem;opacity:.9;">Activa tu membresía para abrir todos los cursos.</div>
        </div>
        <div class="zoo-pay-banner__btn" style="background:#24384F;color:#fff;padding:8px 18px;border-radius:10px;font-family:var(--zoo-font-display);font-weight:800;font-size:.88rem;white-space:nowrap;">Suscribirme</div>
      `;
      banner.addEventListener('click', () => this.showPaywall(session, 'desbloquear todo el contenido'));
      // La página trae un hueco (zsAvisoReserva) con la altura del aviso para quien no es miembro: el aviso entra ahí y nada se mueve.
      const reserva = document.getElementById('zsAvisoReserva');
      const barra = document.getElementById('zsTopbar');
      if (reserva) reserva.replaceWith(banner);
      else if (barra && barra.parentNode === main) barra.insertAdjacentElement('afterend', banner);
      else main.insertBefore(banner, main.firstChild);
    }
  }
};

// ═══ AUTO-APLICAR TEMA AL CARGAR ═══
// Se ejecuta inmediatamente para evitar "flash" de tema incorrecto
(function() {
  try {
    const saved = localStorage.getItem('zoo_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  } catch {}
})();
