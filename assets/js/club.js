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

  // ============== CHECKOUT MODAL POPUP ==============
  // Abre el checkout de Shopify en un modal dentro de la misma página.
  // Si Shopify bloquea el iframe (X-Frame-Options), automáticamente
  // muestra un botón de fallback que abre en la misma pestaña.
  openCheckoutModal(plan, email) {
    const checkoutURL = (typeof buildCheckoutURL === 'function')
      ? buildCheckoutURL(plan, email)
      : (plan === 'anual' ? SHOPIFY_ANNUAL_CHECKOUT_URL : SHOPIFY_CHECKOUT_URL) +
        (email ? `?checkout[email]=${encodeURIComponent(email)}` : '');

    const planLabel = plan === 'anual' ? 'Plan Anual · $1,899 MXN' : 'Plan Mensual · $199 MXN/mes';

    // Remover modal previo si existe
    const existing = document.getElementById('zoo-checkout-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'zoo-checkout-modal';
    modal.innerHTML = `
      <div class="zoo-modal-backdrop"></div>
      <div class="zoo-modal-box">
        <div class="zoo-modal-header">
          <div>
            <div class="zoo-modal-title">💳 Pago seguro</div>
            <div class="zoo-modal-subtitle">${planLabel} · Procesado por Shopify</div>
          </div>
          <button class="zoo-modal-close" aria-label="Cerrar">×</button>
        </div>
        <div class="zoo-modal-body">
          <div class="zoo-modal-loading" id="zoo-modal-loading">
            <div class="zoo-spinner"></div>
            <p>Cargando pago seguro...</p>
          </div>
          <iframe id="zoo-checkout-iframe" src="${checkoutURL}" style="display:none;"></iframe>
          <div class="zoo-modal-fallback" id="zoo-modal-fallback" style="display:none;">
            <div style="font-size:3rem;text-align:center;margin-bottom:14px;">🔒</div>
            <h3 style="color:#fff;text-align:center;margin-bottom:8px;font-size:1.2rem;">Redirigiéndote al pago seguro</h3>
            <p style="color:var(--zoo-text-muted);text-align:center;margin-bottom:22px;font-size:.92rem;line-height:1.5;">
              Shopify procesa los pagos en su plataforma segura por tu protección.
              Haz clic para continuar — regresarás automáticamente al terminar.
            </p>
            <a href="${checkoutURL}" class="zoo-modal-btn-continue">
              Continuar al pago seguro →
            </a>
            <p style="text-align:center;color:var(--zoo-text-dim);font-size:.78rem;margin-top:16px;">
              🔐 Pago encriptado · Sin compartir tu tarjeta con Zoorigen
            </p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Listeners para cerrar
    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('.zoo-modal-close').addEventListener('click', close);
    modal.querySelector('.zoo-modal-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });

    const iframe = document.getElementById('zoo-checkout-iframe');
    const loading = document.getElementById('zoo-modal-loading');
    const fallback = document.getElementById('zoo-modal-fallback');

    // Detectar si Shopify permitió el iframe (load event) o lo bloqueó
    let loaded = false;
    iframe.addEventListener('load', () => {
      loaded = true;
      loading.style.display = 'none';
      iframe.style.display = 'block';
    });
    // Si después de 4 segundos no cargó, mostrar fallback
    setTimeout(() => {
      if (!loaded) {
        loading.style.display = 'none';
        iframe.style.display = 'none';
        fallback.style.display = 'block';
      }
    }, 4000);
  },

  // Formatea fecha relativa (Hace X días / Hoy / Ayer)
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
