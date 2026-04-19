/* ============================================================ */
/* CLUB VIP ZOORIGEN - Lógica con Firebase Auth + Firestore     */
/* Requiere: firebase-config.js cargado ANTES de este archivo   */
/* ============================================================ */

const ZOORIGEN_CLUB = {

  // ============== LECTURA DE CONTENIDO DESDE FIRESTORE ==============
  // Estos métodos reemplazan los arrays estáticos anteriores
  // El admin sube contenido y automáticamente aparece en el club

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
      const snap = await db.collection('noticias').orderBy('createdAt', 'desc').limit(limit).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('Error cargando noticias:', err); return []; }
  },

  // Devuelve clase CSS para colorear la fuente según el medio
  sourceColorClass(source) {
    const s = (source || '').toLowerCase();
    if (s.includes('mongabay'))      return 'amber';
    if (s.includes('dw'))            return 'blue';
    if (s.includes('bbc'))           return 'orange';
    if (s.includes('scidev'))        return 'blue';
    if (s.includes('semarnat'))      return '';
    if (s.includes('conanp'))        return '';
    return ''; // default verde
  },

  // ============== CHECKOUT VENTANA EMERGENTE (estilo OdonTeck) ==============
  // Abre el checkout de Shopify en una VENTANA POP-UP del navegador.
  // El usuario original queda en Zoorigen con una pantalla de espera.
  // Puede volver a abrir la ventana si la cerró, o confirmar que pagó.
  openCheckoutModal(plan, email) {
    const checkoutURL = (typeof buildCheckoutURL === 'function')
      ? buildCheckoutURL(plan, email)
      : (plan === 'anual' ? SHOPIFY_ANNUAL_CHECKOUT_URL : SHOPIFY_CHECKOUT_URL) +
        (email ? `?checkout[email]=${encodeURIComponent(email)}` : '');

    const isAnual = plan === 'anual';
    const price = isAnual ? '$1,899 MXN' : '$199 MXN';
    const planLabel = isAnual ? 'Plan Anual' : 'Plan Mensual';

    // Guardar URL y plan para poder reabrir la ventana
    window.__zooCheckoutURL = checkoutURL;
    window.__zooPlanLabel = planLabel;
    window.__zooPrice = price;

    // Abrir ventana emergente (centrada, 500x720)
    const w = 500, h = 720;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);
    const popup = window.open(
      checkoutURL,
      'zooCheckout',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      // El navegador bloqueó el pop-up
      alert('⚠️ Tu navegador bloqueó la ventana de pago. Por favor permite pop-ups para zoorigen.com y vuelve a intentarlo.');
      return;
    }

    window.__zooPopup = popup;

    // Mostrar pantalla de espera en Zoorigen
    this._showPaymentWaitingScreen(plan);
  },

  // Pantalla de espera mientras el usuario paga en la ventana pop-up
  _showPaymentWaitingScreen(plan) {
    const price = window.__zooPrice || '$199 MXN';
    const planLabel = window.__zooPlanLabel || 'Plan Mensual';

    // Remover pantalla previa si existe
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
          Se abrió una ventana nueva con el pago seguro de Shopify.
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
    // Cerrar la ventana pop-up si sigue abierta
    try { if (window.__zooPopup && !window.__zooPopup.closed) window.__zooPopup.close(); } catch {}
    // Limpiar flag de bienvenida para que aparezca el modal celebratorio
    if (auth.currentUser) {
      localStorage.removeItem('zoo_welcome_shown_' + auth.currentUser.uid);
    }
    // Ir al dashboard — el webhook de Railway ya habrá activado el plan vía Shopify
    window.location.href = 'club-dashboard.html';
  },

  _cancelPayment() {
    if (!confirm('¿Seguro que quieres cancelar? Tu membresía no se activará.')) return;
    try { if (window.__zooPopup && !window.__zooPopup.closed) window.__zooPopup.close(); } catch {}
    const screen = document.getElementById('zoo-pay-waiting');
    if (screen) screen.remove();
    document.body.style.overflow = '';
  },

  // ============== MODAL DE BIENVENIDA VIP ==============
  // Aparece SOLO la primera vez después de pagar. Celebra al nuevo VIP con confetti.
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

        <h1 class="zoo-welcome-title">
          ¡Felicidades <span>${firstName}</span>!
        </h1>

        <p class="zoo-welcome-desc">
          Eres parte oficial de <strong>Zoorigen</strong>, la comunidad científica de fauna más completa de México.
        </p>

        <div class="zoo-welcome-plan">
          <div class="zoo-welcome-plan-icon">🏆</div>
          <div>
            <div class="zoo-welcome-plan-label">${planLabel} activo</div>
            <div class="zoo-welcome-plan-sub">Acceso hasta ${venceLabel}</div>
          </div>
        </div>

        <div class="zoo-welcome-benefits">
          <div class="zoo-welcome-benefit">
            <span>📚</span>
            <div>
              <strong>Biblioteca completa</strong>
              <small>Todos los cursos desbloqueados</small>
            </div>
          </div>
          <div class="zoo-welcome-benefit">
            <span>🔴</span>
            <div>
              <strong>Sesiones en vivo</strong>
              <small>Masterclasses mensuales con especialistas</small>
            </div>
          </div>
          <div class="zoo-welcome-benefit">
            <span>💰</span>
            <div>
              <strong>20% OFF permanente</strong>
              <small>En todas las capacitaciones Zoorigen</small>
            </div>
          </div>
        </div>

        <button class="zoo-welcome-cta" id="zoo-welcome-cta-btn">
          🚀 Empezar a explorar
        </button>

        <div class="zoo-welcome-footer">
          ¿Necesitas ayuda? Contáctanos por <a href="https://wa.me/5212361113237" target="_blank">WhatsApp</a>
        </div>
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

  // Renderiza una tarjeta de noticia bonita con imagen, fuente, resumen y fecha
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

  // Helper: genera URL embebida de Google Drive para videos
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
      await db.collection('miembros').doc(cred.user.uid).set({
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
      });
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
      return { ok: false, msg: 'No se pudo iniciar sesión con Google' };
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
    if (data.planActivo && data.planCancelado) return 'cancelled';
    return 'pending_payment';
  },

  async cancelSubscription() {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/cancel-subscription`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar');
      return { ok: true, accesoHasta: data.accesoHasta };
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
                      session?.planStatus === 'pending_payment' ? 'Pago pendiente' :
                      session?.planStatus === 'cancelled' ? 'Plan cancelado' : 'Plan';
    const renewText = session?.planVence
      ? `${session.planStatus === 'cancelled' ? 'Acceso hasta' : 'Renueva'} ${this.formatShort(session.planVence)}`
      : 'Pendiente de activación';

    const items = [
      { id: 'inicio', label: 'Inicio', icon: '🏠', href: 'club-dashboard.html' },
      { id: 'biblioteca', label: 'Biblioteca', icon: '📚', href: 'club-biblioteca.html' },
      { id: 'videos', label: 'Videos', icon: '🎥', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Sesiones en vivo', icon: '🔴', href: 'club-sesiones.html' },
      { id: 'pdfs', label: 'PDFs', icon: '📄', href: 'club-pdfs.html' }
    ];
    const itemsCuenta = [
      { id: 'perfil', label: 'Mi perfil', icon: '👤', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: '💳', href: 'club-suscripcion.html' }
    ];
    // Nota: el panel admin es URL oculta /pages/admin-club.html (con contraseña)
    return `
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
      <div class="club-sidebar__plan">
        <div class="plan-label">${planLabel}</div>
        <div class="plan-name">Miembro ${session?.planActivo ? 'VIP' : 'pendiente'}</div>
        <div class="plan-meta">${renewText}</div>
        <a href="#" class="plan-logout" onclick="ZOORIGEN_CLUB.logout(); return false;">Cerrar sesión</a>
      </div>
    `;
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
  }
};
