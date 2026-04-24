/* ============================================================ */
/* CLUB VIP ZOORIGEN - Lógica con Firebase Auth + Firestore     */
/* Requiere: firebase-config.js cargado ANTES de este archivo   */
/* ============================================================ */

// ═══════════════ CONFIGURACIÓN CHECKOUT STRIPE ═══════════════
// Migrado de Shopify a Stripe Checkout Sessions
const STRIPE_CONFIG = {
  API_URL: 'https://zoorigen-webhook-production.up.railway.app/create-checkout-session',
  PUBLIC_KEY: 'pk_test_51TMAchPBgqsOPfUYtBbalhoOLnnGz6LymFleli7OxTDbiK4FNYX0K82ispYDb39zKJQXevyMtIPetxVAvq9hhb5P0B5VGgxu99',
  PRICE_MENSUAL: 'price_1TPVMWPBgqsOPfUYytgZtVTv',
  PRICE_ANUAL: 'price_1TPVNoPBgqsOPfUYV9awQMXq',
};

// Función global para iniciar pago con Stripe (redirect)
async function iniciarPagoStripe(planType, email) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión primero');
    window.location.href = 'club-registro.html';
    return;
  }
  const userEmail = email || user.email;
  const priceId = planType === 'anual' ? STRIPE_CONFIG.PRICE_ANUAL : STRIPE_CONFIG.PRICE_MENSUAL;

  // Mostrar overlay de carga
  const overlay = document.createElement('div');
  const isAnual = planType === 'anual';
  const price = isAnual ? '$1,899 MXN' : '$199 MXN';
  const planLabel = isAnual ? 'Plan Anual' : 'Plan Mensual';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,12,0.95);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:440px;width:100%;background:linear-gradient(135deg,#1F5F3A 0%,#0F3B22 100%);border:2px solid rgba(232,163,23,0.4);border-radius:18px;padding:36px 26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:3.5rem;margin-bottom:12px;animation:zooPulse 1.2s ease-in-out infinite;">💳</div>
      <h2 style="font-family:Poppins;color:#fff;font-size:1.4rem;margin:0 0 6px;">Llevándote al pago seguro</h2>
      <div style="color:#E8A317;font-weight:700;font-size:1rem;margin-bottom:14px;">${planLabel} · ${price}</div>
      <p style="color:rgba(255,255,255,0.85);font-size:.9rem;margin:0 0 10px;line-height:1.5;">Completa tu pago con <strong style="color:#fff;">Stripe (seguro)</strong> y te regresamos automáticamente al club.</p>
      <div style="color:rgba(255,255,255,0.6);font-size:.78rem;">Redirigiendo...</div>
    </div>
    <style>@keyframes zooPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }</style>
  `;
  document.body.appendChild(overlay);

  try {
    const response = await fetch(STRIPE_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: priceId,
        firebaseUID: user.uid,
        email: userEmail,
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
  const userEmail = email || user.email;
  const priceId = planType === 'anual' ? STRIPE_CONFIG.PRICE_ANUAL : STRIPE_CONFIG.PRICE_MENSUAL;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--zoo-text-muted);">Cargando formulario de pago...</div>';

  try {
    const response = await fetch(STRIPE_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId, firebaseUID: user.uid, email: userEmail, planType, embedded: true,
      }),
    });
    const data = await response.json();
    if (!data.clientSecret) throw new Error(data.error || 'Error al crear sesión');

    const stripe = Stripe(STRIPE_CONFIG.PUBLIC_KEY);
    const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
    container.innerHTML = '';
    checkout.mount('#' + containerId);
  } catch (error) {
    console.error('Error Embedded Checkout:', error);
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6b6b;">Error al cargar el pago. <button onclick="location.reload()" style="color:var(--zoo-amber);background:none;border:1px solid var(--zoo-amber);padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:10px;">Reintentar</button></div>';
  }
}

const ZOORIGEN_CLUB = {

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
      const webSnap = await db.collection('sesiones')
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
            icon: diasHasta <= 1 ? '🔔' : '🎥',
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
              icon: '📚',
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
            icon: '🎉',
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
            <div class="notif-empty__icon">🔔</div>
            <div class="notif-empty__title">Sin notificaciones</div>
            <div class="notif-empty__text">Te avisaremos de webinars, cursos nuevos y logros.</div>
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
          <div class="zoo-pay-icon">💳</div>
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
            🔄 Abrir ventana de nuevo
          </button>
          <button class="zoo-pay-done" onclick="ZOORIGEN_CLUB._confirmPayment()">
            ✓ Ya pagué — Entrar al Club
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
      alert('⚠️ Tu navegador bloqueó la ventana. Permite pop-ups para zoorigen.com.');
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

  // ============== PROGRESO DE CURSOS (Firestore + localStorage) ==============
  // Guarda progreso en Firestore para que NO se pierda entre dispositivos/navegadores
  async getCourseProgress(uid) {
    if (!uid) return {};
    try {
      const doc = await db.collection('miembros').doc(uid).get();
      const data = doc.data() || {};
      if (data.courseProgress && typeof data.courseProgress === 'object') {
        // Sincronizar a localStorage para lectura rápida
        localStorage.setItem('zoo_course_progress_' + uid, JSON.stringify(data.courseProgress));
        return data.courseProgress;
      }
      // Fallback: localStorage (y migrar a Firestore)
      const local = JSON.parse(localStorage.getItem('zoo_course_progress_' + uid) || '{}');
      if (Object.keys(local).length > 0) {
        await db.collection('miembros').doc(uid).set({ courseProgress: local }, { merge: true }).catch(() => {});
      }
      return local;
    } catch (err) {
      console.warn('Error cargando progreso de Firestore:', err);
      return JSON.parse(localStorage.getItem('zoo_course_progress_' + uid) || '{}');
    }
  },

  async saveCourseProgress(uid, progress) {
    if (!uid || !progress) return;
    // Guardar local primero (rápido)
    localStorage.setItem('zoo_course_progress_' + uid, JSON.stringify(progress));
    // Guardar en Firestore (persistente, sincronizado)
    try {
      await db.collection('miembros').doc(uid).set({ courseProgress: progress }, { merge: true });
    } catch (err) {
      console.warn('Error guardando progreso en Firestore:', err);
    }
  },

  // ============== SISTEMA DE GAMIFICACIÓN ==============
  LEVELS: [
    { level: 1, name: 'Aprendiz',        icon: '🌱', minXP: 0,    color: '#6FBF73' },
    { level: 2, name: 'Observador',      icon: '🔍', minXP: 150,  color: '#6FBF73' },
    { level: 3, name: 'Biólogo Jr',      icon: '🦎', minXP: 400,  color: '#F5C62E' },
    { level: 4, name: 'Biólogo',         icon: '🦒', minXP: 800,  color: '#F5C62E' },
    { level: 5, name: 'Explorador',      icon: '🧭', minXP: 1500, color: '#E8A317' },
    { level: 6, name: 'Investigador',    icon: '🔬', minXP: 2500, color: '#E8A317' },
    { level: 7, name: 'Experto Fauna',   icon: '🏆', minXP: 4000, color: '#D55A28' },
    { level: 8, name: 'Maestro Zoólogo', icon: '👑', minXP: 6000, color: '#D55A28' },
    { level: 9, name: 'Sabio Zoorigen',  icon: '🌟', minXP: 9000, color: '#2AA4D5' }
  ],

  ACHIEVEMENTS: [
    { id: 'first_login',   icon: '🚪', name: 'Primer paso',        desc: 'Entrar al Club VIP',            xp: 20,  category: 'inicio' },
    { id: 'profile_done',  icon: '✨', name: 'Perfil completo',    desc: 'Completa tu perfil al 100%',    xp: 40,  category: 'inicio' },
    { id: 'vip_annual',    icon: '🏅', name: 'Compromiso anual',   desc: 'Adquiere plan anual',           xp: 300, category: 'inicio' },
    { id: 'first_course',  icon: '🎓', name: 'Primer curso',       desc: 'Completa tu primer curso',      xp: 50,  category: 'cursos' },
    { id: 'three_courses', icon: '📗', name: 'Estudiante activo',  desc: 'Completa 3 cursos',             xp: 120, category: 'cursos' },
    { id: 'five_courses',  icon: '📚', name: 'Biblioteca activa',  desc: 'Completa 5 cursos',             xp: 200, category: 'cursos' },
    { id: 'ten_courses',   icon: '🏛️', name: 'Devorador de saber', desc: 'Completa 10 cursos',            xp: 400, category: 'cursos' },
    { id: 'all_areas',     icon: '🌎', name: 'Todoterreno',        desc: 'Completa cursos en 3 áreas distintas', xp: 250, category: 'cursos' },
    { id: 'first_session', icon: '🎥', name: 'En vivo y directo',  desc: 'Asiste a tu primera sesión',    xp: 75,  category: 'sesiones' },
    { id: 'three_sessions',icon: '📡', name: 'Fiel seguidor',      desc: 'Asiste a 3 sesiones en vivo',   xp: 200, category: 'sesiones' },
    { id: 'ten_sessions',  icon: '🛰️', name: 'Espectador VIP',     desc: 'Asiste a 10 sesiones en vivo',  xp: 500, category: 'sesiones' },
    { id: 'streak_3',      icon: '🔥', name: '3 días seguidos',    desc: 'Racha de 3 días activos',       xp: 30,  category: 'rachas' },
    { id: 'streak_7',      icon: '⚡', name: 'Semana completa',    desc: 'Racha de 7 días activos',       xp: 100, category: 'rachas' },
    { id: 'streak_14',     icon: '🌟', name: 'Dos semanas firme',  desc: 'Racha de 14 días activos',      xp: 250, category: 'rachas' },
    { id: 'streak_30',     icon: '💎', name: 'Mes perfecto',       desc: 'Racha de 30 días activos',      xp: 500, category: 'rachas' },
    { id: 'first_post',    icon: '📝', name: 'Primera discusión',  desc: 'Inicia tu primera discusión',   xp: 60,  category: 'comunidad' },
    { id: 'first_reply',   icon: '💬', name: 'Primera respuesta',  desc: 'Responde a un colega',          xp: 30,  category: 'comunidad' },
    { id: 'five_replies',  icon: '🗣️', name: 'Voz activa',         desc: 'Responde 5 veces en el foro',   xp: 150, category: 'comunidad' },
    { id: 'ten_posts',     icon: '🎤', name: 'Líder de opinión',   desc: 'Publica 10 discusiones',        xp: 350, category: 'comunidad' },
    { id: 'first_pdf',     icon: '📄', name: 'Lector',             desc: 'Descarga tu primer PDF',        xp: 25,  category: 'contenido' },
    { id: 'ten_pdfs',      icon: '📕', name: 'Bibliotecario',      desc: 'Descarga 10 PDFs',              xp: 150, category: 'contenido' },
    { id: 'first_cert',    icon: '📜', name: 'Certificado oro',    desc: 'Obtén tu primer certificado',   xp: 100, category: 'certificados' },
    { id: 'five_certs',    icon: '🏅', name: 'Coleccionista',      desc: 'Obtén 5 certificados',          xp: 350, category: 'certificados' },
    { id: 'early_bird',    icon: '🌅', name: 'Madrugador',         desc: 'Entra antes de las 7am',        xp: 15,  category: 'secretos', secret: true },
    { id: 'night_owl',     icon: '🌙', name: 'Nocturno',           desc: 'Estudia después de las 11pm',   xp: 15,  category: 'secretos', secret: true },
    { id: 'weekend_warrior',icon:'🏖️', name: 'Fin de semana',      desc: 'Estudia sábado y domingo',      xp: 50,  category: 'secretos', secret: true }
  ],

  REWARDS: [
    { level: 3, icon: '🎁', title: 'Descuento 10%',       code: 'BIOLOGO10',   desc: 'En cualquier curso Zoorigen' },
    { level: 5, icon: '💰', title: 'Descuento 20%',        code: 'EXPLORA20',   desc: 'En cualquier curso Zoorigen' },
    { level: 6, icon: '🔥', title: 'Descuento 30%',        code: 'AVANZA30',    desc: 'En cualquier curso premium' },
    { level: 7, icon: '🎟️', title: 'Acceso anticipado',    code: 'PRIORIDAD',   desc: 'Prioridad en sesiones con cupo limitado' },
    { level: 8, icon: '👑', title: 'Descuento 40%',        code: 'MAESTRO40',   desc: 'En cualquier curso del catálogo' },
    { level: 9, icon: '🌟', title: 'Mes gratis VIP',       code: 'SABIO-FREE',  desc: 'Solo si completas TODOS los logros' }
  ],

  getProgress(session) {
    const key = 'zoo_progress_' + session.uid;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}

    if (!data.xp) data.xp = 0;
    if (!data.coursesCompleted) data.coursesCompleted = 0;
    if (!data.sessionsAttended) data.sessionsAttended = 0;
    if (!data.pdfsDownloaded) data.pdfsDownloaded = 0;
    if (!data.streak) data.streak = 0;
    if (!data.unlockedAchievements) data.unlockedAchievements = [];
    if (!data.lastActive) data.lastActive = new Date().toISOString();
    if (!data.weeklyMinutes) data.weeklyMinutes = 0;
    if (!data.joinedAt) data.joinedAt = session.createdAt || new Date().toISOString();

    if (!data.unlockedAchievements.includes('first_login')) {
      data.unlockedAchievements.push('first_login');
      data.xp += 20;
    }

    if (session.planTipo === 'anual' && !data.unlockedAchievements.includes('vip_annual')) {
      data.unlockedAchievements.push('vip_annual');
      data.xp += 300;
    }

    let currentLevel = this.LEVELS[0];
    let nextLevel = this.LEVELS[1];
    for (let i = 0; i < this.LEVELS.length; i++) {
      if (data.xp >= this.LEVELS[i].minXP) {
        currentLevel = this.LEVELS[i];
        nextLevel = this.LEVELS[i + 1] || this.LEVELS[i];
      }
    }

    const xpInLevel = data.xp - currentLevel.minXP;
    const xpNeeded = nextLevel.minXP - currentLevel.minXP;
    const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
    const xpToNext = Math.max(0, nextLevel.minXP - data.xp);

    localStorage.setItem(key, JSON.stringify(data));

    return {
      ...data,
      level: currentLevel,
      nextLevel: nextLevel,
      progressPercent,
      xpToNext,
      isMaxLevel: currentLevel.level === this.LEVELS[this.LEVELS.length - 1].level
    };
  },

  renderLevelCard(progress, session) {
    const isMax = progress.isMaxLevel;
    const unlockedRewards = this.REWARDS.filter(r => progress.level.level >= r.level).length;
    return `
      <div class="gami-level-card">
        <div class="gami-level-card__left">
          <div class="gami-level-icon" style="background:linear-gradient(135deg, ${progress.level.color}, ${progress.level.color}dd);">
            ${progress.level.icon}
          </div>
        </div>
        <div class="gami-level-card__center">
          <div class="gami-level-badge">NIVEL ${progress.level.level}</div>
          <div class="gami-level-name">${progress.level.name}</div>
          <div class="gami-level-xp">
            <span class="gami-xp-count">${progress.xp.toLocaleString()} XP</span>
            ${!isMax ? `<span class="gami-xp-next">· ${progress.xpToNext} XP para ${progress.nextLevel.name}</span>` : '<span class="gami-xp-next">· ¡Nivel máximo! 🌟</span>'}
          </div>
          <div class="gami-progress-bar">
            <div class="gami-progress-bar__fill" style="width: ${progress.progressPercent}%; background:linear-gradient(90deg, ${progress.level.color}, ${progress.nextLevel.color});"></div>
          </div>
        </div>
        <div class="gami-level-card__right">
          <button class="gami-rewards-btn" onclick='ZOORIGEN_CLUB.showRewardsModal(ZOORIGEN_CLUB.getProgress(${JSON.stringify(session).replace(/'/g, "&#39;")}))'>
            🎁 <span>${unlockedRewards}</span>
          </button>
          <div class="gami-streak">
            <div class="gami-streak__num">${progress.streak}</div>
            <div class="gami-streak__label">🔥 días</div>
          </div>
        </div>
      </div>`;
  },

  renderWeeklyGoals(progress) {
    const goals = [
      { icon: '📚', label: 'Ver 3 cursos esta semana', current: Math.min(3, progress.coursesCompleted % 10), target: 3 },
      { icon: '🔴', label: 'Asistir a 1 sesión en vivo',  current: Math.min(1, progress.sessionsAttended), target: 1 },
      { icon: '📄', label: 'Descargar 2 PDFs',            current: Math.min(2, progress.pdfsDownloaded), target: 2 }
    ];

    return `
      <div class="gami-goals-card">
        <div class="gami-goals-header">
          <div class="gami-goals-title">🎯 Metas de la semana</div>
          <div class="gami-goals-sub">Completa para ganar XP extra</div>
        </div>
        <div class="gami-goals-list">
          ${goals.map(g => {
            const percent = Math.min(100, (g.current / g.target) * 100);
            const done = g.current >= g.target;
            return `
              <div class="gami-goal ${done ? 'is-done' : ''}">
                <div class="gami-goal__icon">${done ? '✅' : g.icon}</div>
                <div class="gami-goal__info">
                  <div class="gami-goal__label">${g.label}</div>
                  <div class="gami-goal__progress-wrap">
                    <div class="gami-goal__progress">
                      <div class="gami-goal__fill" style="width: ${percent}%;"></div>
                    </div>
                    <div class="gami-goal__count">${g.current}/${g.target}</div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  renderAchievements(progress) {
    const unlockedCount = progress.unlockedAchievements.length;
    const totalCount = this.ACHIEVEMENTS.length;

    return `
      <div class="gami-achievements-card">
        <div class="gami-achievements-header">
          <div>
            <div class="gami-achievements-title">🏆 Logros</div>
            <div class="gami-achievements-sub">${unlockedCount} de ${totalCount} desbloqueados</div>
          </div>
          <div class="gami-achievements-count">
            <span class="gami-big-num">${unlockedCount}</span>
            <span class="gami-small-num">/${totalCount}</span>
          </div>
        </div>
        <div class="gami-achievements-grid">
          ${this.ACHIEVEMENTS.map(a => {
            const unlocked = progress.unlockedAchievements.includes(a.id);
            return `
              <div class="gami-achievement ${unlocked ? 'is-unlocked' : 'is-locked'}" title="${a.desc}">
                <div class="gami-achievement__icon">${unlocked ? a.icon : '🔒'}</div>
                <div class="gami-achievement__name">${a.name}</div>
                <div class="gami-achievement__xp">+${a.xp} XP</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  renderMyStats(progress, session) {
    const daysAsMember = Math.floor((Date.now() - new Date(progress.joinedAt).getTime()) / 86400000);
    return `
      <div class="card gami-stats-card">
        <div class="gami-stats-header">Mi progreso</div>
        <div class="gami-stats-grid">
          <div class="gami-stat">
            <div class="gami-stat__icon">📚</div>
            <div class="gami-stat__val">${progress.coursesCompleted}</div>
            <div class="gami-stat__lbl">Cursos</div>
          </div>
          <div class="gami-stat">
            <div class="gami-stat__icon">🔴</div>
            <div class="gami-stat__val">${progress.sessionsAttended}</div>
            <div class="gami-stat__lbl">Sesiones</div>
          </div>
          <div class="gami-stat">
            <div class="gami-stat__icon">📄</div>
            <div class="gami-stat__val">${progress.pdfsDownloaded}</div>
            <div class="gami-stat__lbl">PDFs</div>
          </div>
          <div class="gami-stat">
            <div class="gami-stat__icon">🗓️</div>
            <div class="gami-stat__val">${daysAsMember}</div>
            <div class="gami-stat__lbl">Días VIP</div>
          </div>
        </div>
      </div>`;
  },

  awardAchievement(userUid, achievementId) {
    const key = 'zoo_progress_' + userUid;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
    data.unlockedAchievements = data.unlockedAchievements || [];
    if (data.unlockedAchievements.includes(achievementId)) return false;
    const ach = this.ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return false;

    const prevLevel = this._calculateLevel(data.xp || 0);
    data.unlockedAchievements.push(achievementId);
    data.xp = (data.xp || 0) + ach.xp;
    const newLevel = this._calculateLevel(data.xp);

    localStorage.setItem(key, JSON.stringify(data));

    this.showAchievementToast(ach);

    if (newLevel.level > prevLevel.level) {
      setTimeout(() => this.showLevelUpModal(newLevel), 3200);
    }
    return true;
  },

  _calculateLevel(xp) {
    let current = this.LEVELS[0];
    for (const lvl of this.LEVELS) {
      if (xp >= lvl.minXP) current = lvl;
    }
    return current;
  },

  showAchievementToast(achievement) {
    const existing = document.getElementById('zoo-ach-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'zoo-ach-toast';
    toast.innerHTML = `
      <div class="zoo-ach-toast-confetti">
        ${Array.from({length: 20}, () =>
          `<div class="zoo-ach-confetti-piece" style="
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 0.8}s;
            background: ${['#E8A317','#6FBF73','#D55A28','#F5C62E'][Math.floor(Math.random() * 4)]};
          "></div>`
        ).join('')}
      </div>
      <div class="zoo-ach-toast__icon">${achievement.icon}</div>
      <div class="zoo-ach-toast__content">
        <div class="zoo-ach-toast__label">🏆 ¡Logro desbloqueado!</div>
        <div class="zoo-ach-toast__name">${achievement.name}</div>
        <div class="zoo-ach-toast__xp">+${achievement.xp} XP</div>
      </div>
    `;
    document.body.appendChild(toast);

    this._playAchievementSound();

    setTimeout(() => toast.classList.add('leaving'), 4200);
    setTimeout(() => toast.remove(), 4700);
  },

  showLevelUpModal(newLevel) {
    const reward = this.REWARDS.find(r => r.level === newLevel.level);

    const modal = document.createElement('div');
    modal.id = 'zoo-levelup-modal';
    modal.innerHTML = `
      <div class="zoo-levelup-backdrop"></div>
      <div class="zoo-levelup-confetti">
        ${Array.from({length: 50}, () =>
          `<div class="zoo-confetti-piece" style="
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 2.5}s;
            animation-duration: ${3 + Math.random() * 2.5}s;
            background: ${['#E8A317','#6FBF73','#D55A28','#F5C62E','#2AA4D5'][Math.floor(Math.random() * 5)]};
          "></div>`
        ).join('')}
      </div>
      <div class="zoo-levelup-box">
        <button class="zoo-welcome-close" aria-label="Cerrar">×</button>
        <div class="zoo-levelup-badge">🎉 ¡SUBISTE DE NIVEL!</div>
        <div class="zoo-levelup-icon" style="background:linear-gradient(135deg, ${newLevel.color}, ${newLevel.color}dd);">
          ${newLevel.icon}
        </div>
        <div class="zoo-levelup-level">Nivel ${newLevel.level}</div>
        <h2 class="zoo-levelup-name">${newLevel.name}</h2>
        ${reward ? `
          <div class="zoo-levelup-reward">
            <div class="zoo-levelup-reward-title">🎁 Desbloqueaste una recompensa</div>
            <div class="zoo-levelup-reward-icon">${reward.icon}</div>
            <div class="zoo-levelup-reward-name">${reward.title}</div>
            <div class="zoo-levelup-reward-desc">${reward.desc}</div>
            <div class="zoo-levelup-reward-code">
              <span>Código:</span>
              <code>${reward.code}</code>
            </div>
            <div class="zoo-levelup-reward-note">Úsalo por WhatsApp para canjearlo</div>
          </div>
        ` : ''}
        <button class="zoo-welcome-cta" id="zoo-levelup-close-btn">🚀 Continuar</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('.zoo-welcome-close').addEventListener('click', close);
    modal.querySelector('#zoo-levelup-close-btn').addEventListener('click', close);
    modal.querySelector('.zoo-levelup-backdrop').addEventListener('click', close);

    this._playLevelUpSound();
  },

  showRewardsModal(progress) {
    const modal = document.createElement('div');
    modal.id = 'zoo-rewards-modal';
    modal.innerHTML = `
      <div class="zoo-welcome-backdrop"></div>
      <div class="zoo-rewards-box">
        <button class="zoo-welcome-close" aria-label="Cerrar">×</button>
        <div class="zoo-rewards-header">
          <div class="zoo-rewards-emoji">🎁</div>
          <h2>Mis recompensas</h2>
          <p>Desbloquea recompensas reales al subir de nivel</p>
        </div>
        <div class="zoo-rewards-list">
          ${this.REWARDS.map(r => {
            const unlocked = progress.level.level >= r.level;
            return `
              <div class="zoo-reward-item ${unlocked ? 'is-unlocked' : 'is-locked'}">
                <div class="zoo-reward-icon">${unlocked ? r.icon : '🔒'}</div>
                <div class="zoo-reward-info">
                  <div class="zoo-reward-title">${r.title}</div>
                  <div class="zoo-reward-desc">${r.desc}</div>
                  ${unlocked
                    ? `<div class="zoo-reward-code-wrap">
                        <code>${r.code}</code>
                        <button class="zoo-reward-copy" onclick="ZOORIGEN_CLUB._copyCode('${r.code}', this)">Copiar</button>
                      </div>`
                    : `<div class="zoo-reward-need">Nivel ${r.level} requerido</div>`
                  }
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="zoo-rewards-footer">
          💬 Canjea tus códigos con nosotros por <a href="https://wa.me/5212361113237?text=Hola%2C%20quiero%20canjear%20mi%20c%C3%B3digo%20de%20recompensa%20VIP" target="_blank">WhatsApp</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    const close = () => { modal.remove(); document.body.style.overflow = ''; };
    modal.querySelector('.zoo-welcome-close').addEventListener('click', close);
    modal.querySelector('.zoo-welcome-backdrop').addEventListener('click', close);
  },

  _copyCode(code, btn) {
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = '✓ Copiado';
      btn.classList.add('is-copied');
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('is-copied'); }, 1800);
    });
  },

  _playAchievementSound() {
    if (localStorage.getItem('zoo_mute') === 'yes') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.25);
      });
    } catch {}
  },

  _playLevelUpSound() {
    if (localStorage.getItem('zoo_mute') === 'yes') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.45);
      });
    } catch {}
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
          <div class="zoo-welcome-emoji">🦒</div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-1">✨</div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-2">⭐</div>
          <div class="zoo-welcome-sparkle zoo-welcome-sparkle-3">✨</div>
        </div>
        <div class="zoo-welcome-badge">🎉 ¡BIENVENIDO AL CLUB VIP!</div>
        <h1 class="zoo-welcome-title">¡Felicidades <span>${firstName}</span>!</h1>
        <p class="zoo-welcome-desc">Eres parte oficial de <strong>Zoorigen</strong>, la comunidad científica de fauna más completa de México.</p>
        <div class="zoo-welcome-plan">
          <div class="zoo-welcome-plan-icon">🏆</div>
          <div>
            <div class="zoo-welcome-plan-label">${planLabel} activo</div>
            <div class="zoo-welcome-plan-sub">Acceso hasta ${venceLabel}</div>
          </div>
        </div>
        <div class="zoo-welcome-benefits">
          <div class="zoo-welcome-benefit"><span>📚</span><div><strong>Biblioteca completa</strong><small>Todos los cursos desbloqueados</small></div></div>
          <div class="zoo-welcome-benefit"><span>🔴</span><div><strong>Sesiones en vivo</strong><small>Masterclasses mensuales con especialistas</small></div></div>
          <div class="zoo-welcome-benefit"><span>💰</span><div><strong>20% OFF permanente</strong><small>En todas las capacitaciones Zoorigen</small></div></div>
        </div>
        <button class="zoo-welcome-cta" id="zoo-welcome-cta-btn">🚀 Empezar a explorar</button>
        <div class="zoo-welcome-footer">¿Necesitas ayuda? Contáctanos por <a href="https://wa.me/5212361113237" target="_blank">WhatsApp</a></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('.zoo-welcome-close').addEventListener('click', close);
    modal.querySelector('#zoo-welcome-cta-btn').addEventListener('click', close);
    modal.querySelector('.zoo-welcome-backdrop').addEventListener('click', close);
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
          ${!hasImage ? (n.icon || '📰') : ''}
        </div>
        <div class="news-card__body">
          <span class="news-card__source ${sourceColor}">${n.icon || '●'} ${source}</span>
          <h4 class="news-card__title">${n.title || ''}</h4>
          ${n.summary ? `<p class="news-card__summary">${n.summary}</p>` : ''}
          <div class="news-card__footer">
            ${dateText ? `<span>${dateText}</span>` : ''}
            ${n.link ? `<span class="read-more">Leer ↗</span>` : ''}
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

      if (data.referredBy) {
        docData.referredBy = data.referredBy;
        docData.referredAt = new Date().toISOString();
      }

      await db.collection('miembros').doc(cred.user.uid).set(docData);
      return { ok: true, uid: cred.user.uid };
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

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      const docRef = db.collection('miembros').doc(user.uid);
      const doc = await docRef.get();
      if (!doc.exists) {
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
      return { ok: true };
    } catch (err) {
      console.error('Google login error:', err);
      let msg = 'No se pudo iniciar sesión con Google';
      if (err.code === 'auth/popup-blocked') msg = 'Tu navegador bloqueó el popup de Google. Permite popups para zoorigen.com.';
      if (err.code === 'auth/popup-closed-by-user') msg = 'Cerraste la ventana de Google antes de iniciar sesión.';
      if (err.code === 'auth/cancelled-popup-request') msg = 'Solo puede haber un popup de Google a la vez.';
      return { ok: false, msg };
    }
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
    auth.signOut().then(() => { window.location.href = 'club-login.html'; });
  },

  requireAuth() {
    return new Promise((resolve) => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = 'club-login.html'; return resolve(null); }
        try {
          const doc = await db.collection('miembros').doc(user.uid).get();
          const data = doc.exists ? doc.data() : {};
          resolve({
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
            createdAt: data.createdAt || null,
            streak: data.streak || 0,
            planStatus: this.calculateStatus(data)
          });
        } catch (err) {
          console.error('Error loading profile:', err);
          resolve({ uid: user.uid, email: user.email, name: user.displayName || user.email.split('@')[0], planStatus: 'pending_payment' });
        }
      });
    });
  },

  calculateStatus(data) {
    if (!data) return 'pending_payment';
    if (data.planActivo && !data.planCancelado) return 'active';
    if (data.planActivo && data.planCancelado) {
      // Cancelado pero todavía con tiempo → acceso hasta que venza
      const vence = data.planVence?.toDate ? data.planVence.toDate() : (data.planVence ? new Date(data.planVence) : null);
      if (vence && vence > new Date()) return 'cancelled_active'; // tiene acceso aún
      return 'expired'; // ya venció
    }
    // planActivo false pero tiene fecha de vencimiento futura (por si acaso)
    if (!data.planActivo && data.planVence) {
      const vence = data.planVence?.toDate ? data.planVence.toDate() : new Date(data.planVence);
      if (vence > new Date()) return 'cancelled_active';
    }
    return 'pending_payment';
  },

  async cancelSubscription() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No hay sesión');
      const res = await fetch(`${WEBHOOK_SERVER_URL}/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUID: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar');
      return { ok: true, msg: data.message };
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
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return '—';
      const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return '—'; }
  },

  getInitials(name) {
    if (!name) return 'V';
    return name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  },

  renderSidebar(activeId, session) {
    const planLabel = session?.planStatus === 'active' ? 'Plan activo' :
                      session?.planStatus === 'cancelled_active' ? 'Plan cancelado' :
                      session?.planStatus === 'pending_payment' ? 'Pago pendiente' :
                      session?.planStatus === 'expired' ? 'Plan vencido' :
                      session?.planStatus === 'cancelled' ? 'Plan cancelado' : 'Plan';
    const renewText = session?.planVence
      ? `${session.planStatus === 'cancelled_active' ? 'Acceso hasta' : session.planStatus === 'cancelled' || session.planStatus === 'expired' ? 'Venció' : 'Renueva'} ${this.formatShort(session.planVence)}`
      : 'Pendiente de activación';

    const items = [
      { id: 'inicio', label: 'Inicio', icon: '🏠', href: 'club-dashboard.html' },
      { id: 'biblioteca', label: 'Biblioteca', icon: '📚', href: 'club-biblioteca.html' },
      { id: 'foro', label: 'Foro VIP', icon: '💬', href: 'club-foro.html' },
      { id: 'videos', label: 'Videos', icon: '🎥', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Webinars en vivo', icon: '🎥', href: 'club-sesiones.html' },
      { id: 'pdfs', label: 'PDFs', icon: '📄', href: 'club-pdfs.html' },
      { id: 'herramientas', label: 'Herramientas clínicas', icon: '🧬', href: 'club-herramientas.html' },
      { id: 'legal', label: 'Herramientas legales', icon: '⚖️', href: 'club-legal.html' }
    ];
    const itemsCuenta = [
      { id: 'logros', label: 'Mis logros', icon: '🏆', href: 'club-logros.html' },
      { id: 'certificados', label: 'Mis certificados', icon: '🎓', href: 'club-certificados.html' },
      { id: 'referidos', label: 'Invitar amigos', icon: '🎁', href: 'club-referidos.html' },
      { id: 'perfil', label: 'Mi perfil', icon: '👤', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: '💳', href: 'club-suscripcion.html' }
    ];

    // Auto-activar paywall en TODAS las páginas (se ejecuta después de renderizar)
    // Excepto en suscripción y perfil (ahí es donde el usuario va a pagar / editar datos)
    setTimeout(() => {
      if (activeId !== 'suscripcion' && activeId !== 'perfil') {
        this.enablePaywallOnPage(session);
      }
    }, 150);

    return `
      <button class="club-sidebar__close" id="sidebarCloseBtn" aria-label="Cerrar menú">✕</button>
      <div class="club-sidebar__brand">
        <img src="../assets/img/logo/logo.jpg" alt="Zoorigen">
        <div class="club-sidebar__brand-text">
          <h3>Zoorigen</h3>
          <small>Club VIP</small>
        </div>
      </div>
      <div class="club-sidebar__section">Principal</div>
      ${items.map(i => `
        <a href="${i.href}" class="${i.id === activeId ? 'is-active' : ''}">
          <span class="icon">${i.icon}</span>${i.label}
          ${i.badge ? `<span class="badge">${i.badge}</span>` : ''}
        </a>
      `).join('')}
      <div class="club-sidebar__section">Mi cuenta</div>
      ${itemsCuenta.map(i => `
        <a href="${i.href}" class="${i.id === activeId ? 'is-active' : ''}">
          <span class="icon">${i.icon}</span>${i.label}
        </a>
      `).join('')}
      <div class="club-sidebar__plan" style="padding:10px 12px;text-align:center;">
        <div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="width:7px;height:7px;border-radius:50%;background:${session?.planStatus === 'active' ? '#6FBF73' : session?.planStatus === 'cancelled' ? '#E8A317' : '#a0a8a4'};"></span>
          <span class="plan-label" style="margin:0;font-size:.72rem;letter-spacing:.06em;">${planLabel.toUpperCase()}</span>
        </div>
        <div class="plan-meta" style="font-size:.75rem;margin-bottom:8px;opacity:.75;">${renewText}</div>
        <a href="#" class="plan-logout" style="display:inline-block;font-size:.8rem;" onclick="ZOORIGEN_CLUB.logout(); return false;">Cerrar sesión</a>
      </div>
    `;
  },

  // Helper interno para mostrar guía desde el sidebar
  async _showGuideFromSidebar() {
    const session = await this.requireAuth();
    if (session) this.showOnboardingForced(session);
  },

  // ============== TEMA CLARO/OSCURO ==============
  // Aplica el tema guardado al cargar la página
  initTheme() {
    const saved = localStorage.getItem('zoo_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this._updateThemeIcons(saved);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zoo_theme', next);
    this._updateThemeIcons(next);
  },

  _updateThemeIcons(theme) {
    const btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
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
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:zooFadeIn .4s ease;';
    overlay.innerHTML = `
      <style>
        @keyframes zooFadeIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes zooFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .zoo-welcome-box { max-width:520px;width:100%;background:linear-gradient(160deg,#0F3B22 0%,#1a4a2e 40%,#0d2f1a 100%);border:2px solid rgba(232,163,23,0.3);border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.6); }
        .zoo-welcome-top { background:linear-gradient(135deg,rgba(232,163,23,0.15),rgba(111,191,115,0.1));padding:40px 30px 20px;text-align:center;position:relative; }
        .zoo-welcome-logo { width:80px;height:80px;border-radius:50%;border:3px solid rgba(232,163,23,0.4);margin:0 auto 16px;animation:zooFloat 3s ease-in-out infinite;object-fit:cover; }
        .zoo-welcome-confetti { font-size:2rem;margin-bottom:8px; }
        .zoo-welcome-title { color:#fff;font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;margin:0 0 4px;line-height:1.2; }
        .zoo-welcome-name { color:#E8A317;font-size:1.8rem;font-weight:800;font-family:'Poppins',sans-serif; }
        .zoo-welcome-sub { color:rgba(255,255,255,0.7);font-size:.92rem;margin-top:8px; }
        .zoo-welcome-body { padding:24px 30px 30px; }
        .zoo-welcome-features { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px; }
        .zoo-welcome-feat { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center; }
        .zoo-welcome-feat-icon { font-size:1.5rem;margin-bottom:6px; }
        .zoo-welcome-feat-text { color:rgba(255,255,255,0.85);font-size:.82rem;font-weight:600; }
        .zoo-welcome-cta { display:block;width:100%;padding:16px;background:linear-gradient(135deg,#E8A317,#D55A28);color:#fff;border:0;border-radius:14px;font-family:'Poppins',sans-serif;font-size:1.05rem;font-weight:700;cursor:pointer;letter-spacing:.02em;transition:all .2s; }
        .zoo-welcome-cta:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(232,163,23,0.4); }
        .zoo-welcome-skip { display:block;text-align:center;margin-top:12px;color:rgba(255,255,255,0.4);font-size:.8rem;cursor:pointer;border:0;background:0; }
        @media(max-width:500px) { .zoo-welcome-features{grid-template-columns:1fr;} .zoo-welcome-title{font-size:1.3rem;} .zoo-welcome-name{font-size:1.5rem;} .zoo-welcome-top{padding:30px 20px 16px;} .zoo-welcome-body{padding:20px;} }
      </style>
      <div class="zoo-welcome-box">
        <div class="zoo-welcome-top">
          <div class="zoo-welcome-confetti">🎉</div>
          <img src="../assets/img/logo/logo.jpg" class="zoo-welcome-logo" alt="Zoorigen">
          <div class="zoo-welcome-title">¡Bienvenido al Club VIP!</div>
          <div class="zoo-welcome-name">${nombre}</div>
          <div class="zoo-welcome-sub">Ya eres parte de la comunidad científica de fauna más completa de México</div>
        </div>
        <div class="zoo-welcome-body">
          <div class="zoo-welcome-features">
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">📚</div><div class="zoo-welcome-feat-text">Cursos completos</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">🎥</div><div class="zoo-welcome-feat-text">Webinars en vivo</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">🧬</div><div class="zoo-welcome-feat-text">Herramientas clínicas</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">⚖️</div><div class="zoo-welcome-feat-text">Herramientas legales</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">🏆</div><div class="zoo-welcome-feat-text">Logros y recompensas</div></div>
            <div class="zoo-welcome-feat"><div class="zoo-welcome-feat-icon">💬</div><div class="zoo-welcome-feat-text">Foro VIP exclusivo</div></div>
          </div>
          <button class="zoo-welcome-cta" id="zooWelcomeStart">Explorar mi Club VIP 🚀</button>
          <button class="zoo-welcome-skip" id="zooWelcomeSkip">Saltar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .3s';
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 300);
      localStorage.setItem(key, new Date().toISOString());
    };

    document.getElementById('zooWelcomeStart').addEventListener('click', close);
    document.getElementById('zooWelcomeSkip').addEventListener('click', close);
  },
      } else {
        close();
      }
    });

    render();
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
    const isActive = session.planActivo === true || session.planStatus === 'active' || session.planStatus === 'cancelled_active';
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
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,12,0.92);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:zooPaywallFade .25s ease-out;';
    overlay.innerHTML = `
      <div style="max-width:500px;width:100%;background:linear-gradient(135deg,#1F5F3A 0%,#0F3B22 60%,#2AA4D5 120%);border:2px solid rgba(232,163,23,0.5);border-radius:22px;padding:36px 30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.6);position:relative;overflow:hidden;">
        <button id="zooPaywallClose" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.3);border:0;color:#fff;font-size:1rem;cursor:pointer;">✕</button>
        <div style="font-size:3.8rem;margin-bottom:14px;">🔒</div>
        <div style="display:inline-block;background:rgba(232,163,23,0.2);color:#E8A317;padding:5px 14px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.12em;margin-bottom:14px;">ACCESO EXCLUSIVO VIP</div>
        <h2 style="font-family:Poppins;color:#fff;font-size:1.6rem;margin:0 0 10px;line-height:1.2;">Necesitas ser Miembro VIP para ${label}</h2>
        <p style="color:rgba(255,255,255,0.88);font-size:.95rem;margin:0 0 22px;line-height:1.55;">Suscríbete y desbloquea toda la plataforma: cursos, webinars, biblioteca, foro, herramientas profesionales y certificados con validez.</p>

        <div style="background:rgba(0,0,0,0.25);border-radius:14px;padding:18px;margin-bottom:20px;text-align:left;">
          <div style="color:#E8A317;font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">✨ Beneficios VIP</div>
          <div style="color:#fff;font-size:.9rem;line-height:1.85;">
            ✅ <strong>Biblioteca</strong> completa de cursos<br>
            ✅ <strong>Webinars</strong> en vivo cada mes<br>
            ✅ <strong>Foro VIP</strong> con expertos<br>
            ✅ <strong>Certificados</strong> con validez<br>
            ✅ <strong>Herramientas</strong> clínicas y legales<br>
            ✅ <strong>20% descuento</strong> en cursos Zoorigen<br>
            ✅ Videos y PDFs descargables
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <button id="zooPaywallMens" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:14px 10px;border-radius:12px;cursor:pointer;font-family:Poppins;transition:all .15s;">
            <div style="font-weight:700;font-size:.78rem;opacity:.8;">MENSUAL</div>
            <div style="font-weight:800;font-size:1.3rem;margin:2px 0;">$199<span style="font-size:.7rem;opacity:.7;">/mes</span></div>
            <div style="font-size:.72rem;opacity:.7;">Cancela cuando quieras</div>
          </button>
          <button id="zooPaywallAnual" style="background:linear-gradient(135deg,#E8A317,#D68A0A);border:0;color:#1f1d17;padding:14px 10px;border-radius:12px;cursor:pointer;font-family:Poppins;font-weight:800;position:relative;box-shadow:0 6px 18px rgba(232,163,23,0.4);">
            <div style="position:absolute;top:-8px;right:6px;background:#D55A28;color:#fff;font-size:.62rem;padding:2px 8px;border-radius:10px;font-weight:800;">-20% OFF</div>
            <div style="font-weight:700;font-size:.78rem;">ANUAL</div>
            <div style="font-weight:800;font-size:1.3rem;margin:2px 0;">$1,899<span style="font-size:.7rem;">/año</span></div>
            <div style="font-size:.72rem;">Ahorra $489</div>
          </button>
        </div>

        <button id="zooPaywallLater" style="background:transparent;border:0;color:rgba(255,255,255,0.6);font-size:.82rem;cursor:pointer;padding:8px;">Seguir explorando</button>
      </div>
      <style>
        @keyframes zooPaywallFade { from{opacity:0} to{opacity:1} }
        #zooPaywallMens:hover { background:rgba(255,255,255,0.15) !important; }
        #zooPaywallAnual:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(232,163,23,0.5) !important; }
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
    const isActive = session && (session.planActivo === true || session.planStatus === 'active' || session.planStatus === 'cancelled_active');
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
        lock.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(232,163,23,0.9);color:#1f1d17;padding:4px 10px;border-radius:14px;font-size:.7rem;font-weight:800;letter-spacing:.06em;pointer-events:none;z-index:5;';
        lock.textContent = '🔒 VIP';
        el.appendChild(lock);
      }
    });

    // Banner global arriba del main
    const main = document.querySelector('.club-main');
    if (main && !document.getElementById('zooPayBanner')) {
      const banner = document.createElement('div');
      banner.id = 'zooPayBanner';
      banner.style.cssText = 'background:linear-gradient(135deg,#E8A317,#D55A28);color:#1f1d17;padding:12px 18px;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;cursor:pointer;box-shadow:0 6px 18px rgba(232,163,23,0.25);';
      banner.innerHTML = `
        <div style="font-size:1.8rem;line-height:1;">🔒</div>
        <div style="flex:1;min-width:200px;">
          <div style="font-family:Poppins;font-weight:800;font-size:.98rem;margin-bottom:2px;">Modo exploración · Suscríbete para desbloquear todo</div>
          <div style="font-size:.82rem;opacity:.88;">Puedes navegar pero no acceder a cursos, webinars, foro y herramientas sin membresía.</div>
        </div>
        <div style="background:#1f1d17;color:#E8A317;padding:8px 18px;border-radius:10px;font-family:Poppins;font-weight:800;font-size:.88rem;">Suscribirme</div>
      `;
      banner.addEventListener('click', () => this.showPaywall(session, 'desbloquear todo el contenido'));
      main.insertBefore(banner, main.firstChild);
    }
  }
};

// ═══ AUTO-APLICAR TEMA AL CARGAR ═══
// Se ejecuta inmediatamente para evitar "flash" de tema incorrecto
(function() {
  try {
    const saved = localStorage.getItem('zoo_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  } catch {}
})();
