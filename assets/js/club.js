/* ============================================================ */
/* CLUB VIP ZOORIGEN - Lógica con Firebase Auth + Firestore     */
/* Requiere: firebase-config.js cargado ANTES de este archivo   */
/* ============================================================ */

const ZOORIGEN_CLUB = {
  // --- Biblioteca del Club (curada con criterio - 8 estrella) ---
  LIBRARY: [
    { id: 'fototrampeo', title: 'Fototrampeo: monitoreo de mamíferos', area: 'Fauna silvestre', image: '../assets/img/cursos/fototrampeo_monitoreo_mamiferos.jpg', duration: '6 h', level: 'Intermedio', tag: 'Más visto' },
    { id: 'tortugas', title: 'Manejo de tortugas marinas', area: 'Fauna silvestre', image: '../assets/img/cursos/manejo_tortugas_marinas.jpg', duration: '5 h', level: 'Intermedio', tag: 'Popular' },
    { id: 'rescate', title: 'Rescate de fauna silvestre', area: 'Fauna silvestre', image: '../assets/img/cursos/rescate_fauna_silvestre.jpg', duration: '7 h', level: 'Avanzado', tag: 'Nuevo' },
    { id: 'colmenas', title: 'Manejo integral de colmenas', area: 'Apicultura', image: '../assets/img/cursos/manejo_integral_colmenas.jpg', duration: '8 h', level: 'Básico', tag: 'Estrella' },
    { id: 'sanidad', title: 'Sanidad apícola', area: 'Apicultura', image: '../assets/img/cursos/sanidad_apicola.jpg', duration: '6 h', level: 'Intermedio' },
    { id: 'aracnidos', title: 'Arácnidos de importancia médica', area: 'Fauna ponzoñosa', image: '../assets/img/cursos/identificacion_aracnidos_mexico.jpg', duration: '4 h', level: 'Básico' },
    { id: 'serpientes', title: 'Manejo de picaduras de serpientes y escorpiones', area: 'Fauna ponzoñosa', image: '../assets/img/cursos/manejo_picaduras_serpientes_escorpiones.jpg', duration: '5 h', level: 'Intermedio', tag: 'Destacado' },
    { id: 'etologia', title: 'Etología y manejo animal', area: 'Etología', image: '../assets/img/cursos/etologia_fauna_silvestre.jpg', duration: '6 h', level: 'Intermedio' }
  ],
  VIDEOS: [
    { id: 'v1', title: 'Cómo colocar una cámara trampa en campo', area: 'Fauna silvestre', duration: '12 min', thumb: '🎥' },
    { id: 'v2', title: 'Identificación rápida de abejas vs avispas', area: 'Apicultura', duration: '8 min', thumb: '🎥' },
    { id: 'v3', title: 'Primeros auxilios tras mordedura de serpiente', area: 'Fauna ponzoñosa', duration: '15 min', thumb: '🎥' },
    { id: 'v4', title: 'Manejo seguro de tarántulas en cautiverio', area: 'Manejo en cautiverio', duration: '10 min', thumb: '🎥' },
    { id: 'v5', title: 'Técnica de pitfall para herpetofauna', area: 'Investigación', duration: '14 min', thumb: '🎥' },
    { id: 'v6', title: 'Enriquecimiento ambiental para mamíferos', area: 'Etología', duration: '11 min', thumb: '🎥' }
  ],
  PDFS: [
    { id: 'p1', title: 'Guía de identificación de serpientes mexicanas', area: 'Fauna ponzoñosa', pages: 48, thumb: '📄' },
    { id: 'p2', title: 'Protocolo de rescate de fauna silvestre', area: 'Conservación', pages: 32, thumb: '📄' },
    { id: 'p3', title: 'Manual básico de apicultura', area: 'Apicultura', pages: 64, thumb: '📄' },
    { id: 'p4', title: 'Fichas técnicas de mamíferos mexicanos', area: 'Fauna silvestre', pages: 120, thumb: '📄' },
    { id: 'p5', title: 'Calendario de reproducción de fauna endémica', area: 'Conservación', pages: 24, thumb: '📄' }
  ],
  SESSIONS: [
    { id: 's1', title: 'Fauna ponzoñosa: atención inicial en campo', speaker: 'Dr. Alberto Vargas', date: '2026-04-20', time: '19:00', status: 'upcoming' },
    { id: 's2', title: 'Apicultura y cambio climático', speaker: 'Biól. Marta Rodríguez', date: '2026-04-27', time: '19:00', status: 'upcoming' },
    { id: 's3', title: 'Fototrampeo y conservación de jaguares', speaker: 'Dr. Iván Coronel', date: '2026-05-04', time: '19:00', status: 'upcoming' }
  ],
  NEWS: [
    { title: 'Nueva especie de rana descubierta en Oaxaca', source: 'Conservation International', date: '17 abril 2026', summary: 'Biólogos del IPN registraron una nueva especie de anuro endémico en la Sierra Mazateca.' },
    { title: 'Temporada de nidificación de tortugas marinas', source: 'CONANP', date: '17 abril 2026', summary: 'Inicia la temporada de arribada en playas de Oaxaca y Guerrero con récord de nidos.' },
    { title: 'Programa de recuperación del lobo mexicano cumple 10 años', source: 'SEMARNAT', date: '16 abril 2026', summary: 'Se han reintroducido 45 ejemplares en la Sierra de San Luis, Sonora.' }
  ],

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
      { id: 'biblioteca', label: 'Biblioteca', icon: '📚', href: 'club-biblioteca.html', badge: this.LIBRARY.length },
      { id: 'videos', label: 'Videos', icon: '🎥', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Sesiones en vivo', icon: '🔴', href: 'club-sesiones.html' },
      { id: 'pdfs', label: 'PDFs', icon: '📄', href: 'club-pdfs.html' }
    ];
    const itemsCuenta = [
      { id: 'perfil', label: 'Mi perfil', icon: '👤', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: '💳', href: 'club-suscripcion.html' }
    ];
    if (session?.role === 'admin') {
      itemsCuenta.push({ id: 'admin', label: 'Panel admin', icon: '⚙️', href: 'club-admin.html' });
    }
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
