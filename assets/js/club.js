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
      // Traer más noticias de las que pedimos para poder filtrar por fuente
      const snap = await db.collection('noticias').orderBy('createdAt', 'desc').limit(Math.max(limit * 4, 20)).get();
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Algoritmo para mezclar fuentes: round-robin por fuente distinta
      // Garantiza que no se repita la misma fuente consecutivamente cuando hay variedad
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
        if (bySource[src].length > 0) {
          mixed.push(bySource[src].shift());
        }
        i++;
        // Evitar loop infinito
        if (i > limit * sources.length * 2) break;
      }

      return mixed.slice(0, limit);
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

  // ============== SISTEMA DE GAMIFICACIÓN ==============
  // Niveles, XP, logros y metas semanales basados en actividad del miembro

  // Definición de niveles con XP requerido
  LEVELS: [
    { level: 1, name: 'Aprendiz',        icon: '🌱', minXP: 0,    color: '#6FBF73' },
    { level: 2, name: 'Observador',      icon: '🔍', minXP: 100,  color: '#6FBF73' },
    { level: 3, name: 'Biólogo Jr',      icon: '🦎', minXP: 250,  color: '#F5C62E' },
    { level: 4, name: 'Biólogo',         icon: '🦒', minXP: 500,  color: '#F5C62E' },
    { level: 5, name: 'Explorador',      icon: '🧭', minXP: 900,  color: '#E8A317' },
    { level: 6, name: 'Investigador',    icon: '🔬', minXP: 1400, color: '#E8A317' },
    { level: 7, name: 'Experto Fauna',   icon: '🏆', minXP: 2000, color: '#D55A28' },
    { level: 8, name: 'Maestro Zoólogo', icon: '👑', minXP: 3000, color: '#D55A28' },
    { level: 9, name: 'Sabio Zoorigen',  icon: '🌟', minXP: 5000, color: '#2AA4D5' }
  ],

  // Definición de todos los logros posibles
  ACHIEVEMENTS: [
    // ═══ INICIO & ACCESO ═══
    { id: 'first_login',   icon: '🚪', name: 'Primer paso',        desc: 'Entrar al Club VIP',            xp: 20,  category: 'inicio' },
    { id: 'profile_done',  icon: '✨', name: 'Perfil completo',    desc: 'Completa tu perfil al 100%',    xp: 40,  category: 'inicio' },
    { id: 'vip_annual',    icon: '🏅', name: 'Compromiso anual',   desc: 'Adquiere plan anual',           xp: 300, category: 'inicio' },

    // ═══ CURSOS ═══
    { id: 'first_course',  icon: '🎓', name: 'Primer curso',       desc: 'Completa tu primer curso',      xp: 50,  category: 'cursos' },
    { id: 'three_courses', icon: '📗', name: 'Estudiante activo',  desc: 'Completa 3 cursos',             xp: 120, category: 'cursos' },
    { id: 'five_courses',  icon: '📚', name: 'Biblioteca activa',  desc: 'Completa 5 cursos',             xp: 200, category: 'cursos' },
    { id: 'ten_courses',   icon: '🏛️', name: 'Devorador de saber', desc: 'Completa 10 cursos',            xp: 400, category: 'cursos' },
    { id: 'all_areas',     icon: '🌎', name: 'Todoterreno',        desc: 'Completa cursos en 3 áreas distintas', xp: 250, category: 'cursos' },

    // ═══ SESIONES EN VIVO ═══
    { id: 'first_session', icon: '🎥', name: 'En vivo y directo',  desc: 'Asiste a tu primera sesión',    xp: 75,  category: 'sesiones' },
    { id: 'three_sessions',icon: '📡', name: 'Fiel seguidor',      desc: 'Asiste a 3 sesiones en vivo',   xp: 200, category: 'sesiones' },
    { id: 'ten_sessions',  icon: '🛰️', name: 'Espectador VIP',     desc: 'Asiste a 10 sesiones en vivo',  xp: 500, category: 'sesiones' },

    // ═══ RACHAS ═══
    { id: 'streak_3',      icon: '🔥', name: '3 días seguidos',    desc: 'Racha de 3 días activos',       xp: 30,  category: 'rachas' },
    { id: 'streak_7',      icon: '⚡', name: 'Semana completa',    desc: 'Racha de 7 días activos',       xp: 100, category: 'rachas' },
    { id: 'streak_14',     icon: '🌟', name: 'Dos semanas firme',  desc: 'Racha de 14 días activos',      xp: 250, category: 'rachas' },
    { id: 'streak_30',     icon: '💎', name: 'Mes perfecto',       desc: 'Racha de 30 días activos',      xp: 500, category: 'rachas' },

    // ═══ FORO & COMUNIDAD ═══
    { id: 'first_post',    icon: '📝', name: 'Primera discusión',  desc: 'Inicia tu primera discusión',   xp: 60,  category: 'comunidad' },
    { id: 'first_reply',   icon: '💬', name: 'Primera respuesta',  desc: 'Responde a un colega',          xp: 30,  category: 'comunidad' },
    { id: 'five_replies',  icon: '🗣️', name: 'Voz activa',         desc: 'Responde 5 veces en el foro',   xp: 150, category: 'comunidad' },
    { id: 'ten_posts',     icon: '🎤', name: 'Líder de opinión',   desc: 'Publica 10 discusiones',        xp: 350, category: 'comunidad' },

    // ═══ CONTENIDO ═══
    { id: 'first_pdf',     icon: '📄', name: 'Lector',             desc: 'Descarga tu primer PDF',        xp: 25,  category: 'contenido' },
    { id: 'ten_pdfs',      icon: '📕', name: 'Bibliotecario',      desc: 'Descarga 10 PDFs',              xp: 150, category: 'contenido' },

    // ═══ CERTIFICADOS ═══
    { id: 'first_cert',    icon: '📜', name: 'Certificado oro',    desc: 'Obtén tu primer certificado',   xp: 100, category: 'certificados' },
    { id: 'five_certs',    icon: '🏅', name: 'Coleccionista',      desc: 'Obtén 5 certificados',          xp: 350, category: 'certificados' },

    // ═══ SECRETOS (bloqueados hasta desbloquearse) ═══
    { id: 'early_bird',    icon: '🌅', name: 'Madrugador',         desc: 'Entra antes de las 7am',        xp: 15,  category: 'secretos', secret: true },
    { id: 'night_owl',     icon: '🌙', name: 'Nocturno',           desc: 'Estudia después de las 11pm',   xp: 15,  category: 'secretos', secret: true },
    { id: 'weekend_warrior',icon:'🏖️', name: 'Fin de semana',      desc: 'Estudia sábado y domingo',      xp: 50,  category: 'secretos', secret: true }
  ],

  // Recompensas reales desbloqueadas por nivel (códigos únicos)
  REWARDS: [
    { level: 2, icon: '🎁', title: 'Descuento 10%',    code: 'BIOLOGO10',   desc: 'En cualquier curso Zoorigen' },
    { level: 3, icon: '📘', title: 'PDF Premium',       code: 'PDF-FAUNA',   desc: 'Guía exclusiva de 80 páginas' },
    { level: 4, icon: '🦒', title: 'Sticker digital',   code: 'STICKER-BIO', desc: 'Pack de 5 stickers para WhatsApp' },
    { level: 5, icon: '💰', title: 'Descuento 30%',     code: 'EXPLORA30',   desc: 'En cualquier curso premium' },
    { level: 6, icon: '🎟️', title: 'Acceso anticipado', code: 'PRIORIDAD',   desc: 'A sesiones con cupo limitado' },
    { level: 7, icon: '🏆', title: 'Sesión privada',    code: 'EXPERTO1A1',  desc: '30 min gratis con un especialista' },
    { level: 8, icon: '👑', title: 'Descuento 50%',     code: 'MAESTRO50',   desc: 'En cualquier curso del catálogo' },
    { level: 9, icon: '🌟', title: 'Mes gratis',        code: 'SABIO-FREE',  desc: '1 mes extra de VIP sin costo' }
  ],

  // Calcula el progreso del usuario (XP, nivel, logros, etc)
  getProgress(session) {
    // Lee el progreso guardado en localStorage (o crea uno nuevo)
    const key = 'zoo_progress_' + session.uid;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}

    // Inicializar datos si es nuevo
    if (!data.xp) data.xp = 0;
    if (!data.coursesCompleted) data.coursesCompleted = 0;
    if (!data.sessionsAttended) data.sessionsAttended = 0;
    if (!data.pdfsDownloaded) data.pdfsDownloaded = 0;
    if (!data.streak) data.streak = 0;
    if (!data.unlockedAchievements) data.unlockedAchievements = [];
    if (!data.lastActive) data.lastActive = new Date().toISOString();
    if (!data.weeklyMinutes) data.weeklyMinutes = 0;
    if (!data.joinedAt) data.joinedAt = session.createdAt || new Date().toISOString();

    // Auto-otorgar "Primer paso" si es su primer login
    if (!data.unlockedAchievements.includes('first_login')) {
      data.unlockedAchievements.push('first_login');
      data.xp += 20;
    }

    // Auto-otorgar logro de plan anual
    if (session.planTipo === 'anual' && !data.unlockedAchievements.includes('vip_annual')) {
      data.unlockedAchievements.push('vip_annual');
      data.xp += 300;
    }

    // Calcular nivel actual
    let currentLevel = this.LEVELS[0];
    let nextLevel = this.LEVELS[1];
    for (let i = 0; i < this.LEVELS.length; i++) {
      if (data.xp >= this.LEVELS[i].minXP) {
        currentLevel = this.LEVELS[i];
        nextLevel = this.LEVELS[i + 1] || this.LEVELS[i];
      }
    }

    // Progreso hasta siguiente nivel (0-100)
    const xpInLevel = data.xp - currentLevel.minXP;
    const xpNeeded = nextLevel.minXP - currentLevel.minXP;
    const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
    const xpToNext = Math.max(0, nextLevel.minXP - data.xp);

    // Guardar
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

  // Renderiza la tarjeta grande de nivel arriba del dashboard
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

  // Renderiza las metas semanales
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

  // Renderiza galería de logros (desbloqueados y bloqueados)
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

  // Renderiza stats pequeñas en el sidebar derecho
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

  // Otorga XP y desbloquea logro si aplica + muestra toast celebratorio
  awardAchievement(userUid, achievementId) {
    const key = 'zoo_progress_' + userUid;
    let data = {};
    try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
    data.unlockedAchievements = data.unlockedAchievements || [];
    if (data.unlockedAchievements.includes(achievementId)) return false;
    const ach = this.ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return false;

    // Verificar si sube de nivel
    const prevLevel = this._calculateLevel(data.xp || 0);
    data.unlockedAchievements.push(achievementId);
    data.xp = (data.xp || 0) + ach.xp;
    const newLevel = this._calculateLevel(data.xp);

    localStorage.setItem(key, JSON.stringify(data));

    // Mostrar toast de logro
    this.showAchievementToast(ach);

    // Si subió de nivel, mostrar modal de level up
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

  // Toast celebratorio con confetti y sonido cuando desbloqueas logro
  showAchievementToast(achievement) {
    // Remover toast previo si existe
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

    // Sonido opcional (beep suave con Web Audio API)
    this._playAchievementSound();

    // Auto-desaparece después de 4.5s
    setTimeout(() => toast.classList.add('leaving'), 4200);
    setTimeout(() => toast.remove(), 4700);
  },

  // Modal grande cuando el usuario sube de nivel
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

  // Modal grande con todas las recompensas (canjeadas y pendientes)
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

  // Sonidos simples con Web Audio (sin archivos externos)
  _playAchievementSound() {
    if (localStorage.getItem('zoo_mute') === 'yes') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Secuencia de 3 notas ascendentes tipo "achievement unlocked"
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
      // Fanfarria de 4 notas
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

  // ============== MODAL DE BIENVENIDA VIP ==============
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

      // Sistema de referidos: guardar el código de quien lo invitó
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
      { id: 'foro', label: 'Foro VIP', icon: '💬', href: 'club-foro.html' },
      { id: 'videos', label: 'Videos', icon: '🎥', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Webinars en vivo', icon: '🎥', href: 'club-sesiones.html' },
      { id: 'pdfs', label: 'PDFs', icon: '📄', href: 'club-pdfs.html' }
    ];
    const itemsCuenta = [
      { id: 'logros', label: 'Mis logros', icon: '🏆', href: 'club-logros.html' },
      { id: 'certificados', label: 'Mis certificados', icon: '🎓', href: 'club-certificados.html' },
      { id: 'referidos', label: 'Invitar amigos', icon: '🎁', href: 'club-referidos.html' },
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
