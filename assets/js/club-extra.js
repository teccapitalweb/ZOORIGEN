// ═══════════════════════════════════════════════════════════════════════
//  GLOBALVET MÉXICO — Club VIP — Core JS
// ═══════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Configuración Firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyB_OgAmyW7XNiLUyKp6Ih92A5qxm3LNCqg",
  authDomain: "globalvet-club.firebaseapp.com",
  projectId: "globalvet-club",
  storageBucket: "globalvet-club.firebasestorage.app",
  messagingSenderId: "880780506385",
  appId: "1:880780506385:web:be49dbc8886147a79048b0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ═══ AUTH WRAPPER ═══
/**
 * Espera a que Firebase reporte estado de auth, trae el documento del miembro
 * de Firestore y devuelve un objeto session con {uid, email, name, fechaRegistro}.
 * Si no hay usuario, redirige a club-login.html y retorna null.
 */
export async function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Evitar redirect si ya estamos en login o registro
        const path = window.location.pathname;
        if (!path.includes('club-login') && !path.includes('club-registro')) {
          window.location.href = 'club-login.html';
        }
        resolve(null);
        return;
      }
      // Intentar traer datos del miembro
      let memberData = {};
      try {
        const snap = await getDoc(doc(db, 'miembros', user.uid));
        if (snap.exists()) memberData = snap.data();
        else {
          // Crear documento básico si es la primera vez que entra
          await setDoc(doc(db, 'miembros', user.uid), {
            email: user.email,
            nombre: user.displayName || user.email.split('@')[0],
            fechaRegistro: serverTimestamp()
          });
          memberData = { email: user.email, nombre: user.displayName || user.email.split('@')[0] };
        }
      } catch(e) { console.warn('No se pudo leer el miembro:', e.message); }

      resolve({
        uid: user.uid,
        email: user.email,
        name: memberData.nombre || user.displayName || user.email.split('@')[0],
        fechaRegistro: memberData.fechaRegistro || null,
        photoURL: user.photoURL || null
      });
    });
  });
}

// ═══ SIDEBAR COMPARTIDO ═══
export function renderSidebar(activeKey = '') {
  const groups = [
    { label: 'Principal', items: [
      { key:'dashboard',    label:'Inicio',                 href:'club-dashboard.html',           icon:'🏠' },
      { key:'biblioteca',   label:'Biblioteca de cursos',   href:'club-dashboard.html#biblioteca', icon:'📚' },
      { key:'sesiones',     label:'Sesiones en vivo',       href:'club-dashboard.html#sesiones',   icon:'🔴' },
      { key:'pdfs',         label:'PDFs',                   href:'club-dashboard.html#pdfs',       icon:'📄' },
      { key:'herramientas', label:'Herramientas clínicas',  href:'club-herramientas.html',         icon:'🩺', badge:'NEW', badgeClass:'gold' }
    ]},
    { label: 'Contenido mensual', items: [
      { key:'noticias',     label:'Noticias veterinarias', href:'club-noticias.html', icon:'📰' }
    ]},
    { label: 'Comunidad', items: [
      { key:'foro',         label:'Foro',           href:'club-foro.html',         icon:'💬' },
      { key:'referidos',    label:'Referidos',      href:'club-referidos.html',    icon:'🎁' },
      { key:'certificados', label:'Mis constancias', href:'club-certificados.html', icon:'🏆' }
    ]},
    { label: 'Mi cuenta', items: [
      { key:'perfil',       label:'Mi perfil',       href:'club-dashboard.html#perfil',       icon:'👤' },
      { key:'suscripcion',  label:'Suscripción',     href:'club-suscripcion.html',             icon:'💳' },
      { key:'config',       label:'Configuración',   href:'club-dashboard.html#config',       icon:'⚙️' }
    ]}
  ];

  const renderItem = (it) => `
    <a href="${it.href}" class="nbtn ${it.key === activeKey ? 'active' : ''}">
      <span class="nbtn-icon">${it.icon}</span>
      <span>${it.label}</span>
      ${it.badge ? `<span class="nbadge ${it.badgeClass || ''}">${it.badge}</span>` : ''}
    </a>`;

  return groups.map(g => `
    <div class="slabel">${g.label}</div>
    ${g.items.map(renderItem).join('')}
  `).join('') + `
    <div style="margin-top:auto;padding-top:1rem;border-top:1px solid var(--gv-border);">
      <a href="../index.html" class="nbtn" style="color:var(--gv-text-dim);font-size:0.78rem;">← Volver al sitio</a>
    </div>`;
}

// ═══ TOP NAV ═══
export function renderTopNav(session) {
  const nom = session?.name || 'Usuario';
  return `
    <div class="tnav-l">
      <a href="club-dashboard.html" class="tnav-logo">
        <img src="../assets/logo/globalvet-logo.jpg" alt="GlobalVet">
        <span>Club GlobalVet</span>
      </a>
      <span class="tnav-badge">VIP</span>
    </div>
    <div class="tnav-r">
      <a href="club-dashboard.html" class="tnav-back">← Mi área</a>
      <span class="tnav-user-name">${nom}</span>
      <button class="tnav-back" id="btnLogout" style="cursor:pointer;background:none;border:none;">Salir</button>
    </div>`;
}

// ═══ LOGOUT ═══
export async function doLogout() {
  try {
    await signOut(auth);
    window.location.href = 'club-login.html';
  } catch(err) { console.error(err); }
}

// ═══ DRIP CONTENT (desbloqueo cada 8 días) ═══
export const DRIP_DIAS_POR_CURSO = 8;

export function getDiasDesdeRegistro(session) {
  if (!session?.fechaRegistro) return 0;
  const reg = session.fechaRegistro.toDate ? session.fechaRegistro.toDate() : new Date(session.fechaRegistro);
  const ahora = new Date();
  const diff = ahora - reg;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getUnlockStatus(index, session) {
  const dias = getDiasDesdeRegistro(session);
  const diasNecesarios = index * DRIP_DIAS_POR_CURSO;
  if (dias >= diasNecesarios) return { unlocked: true, unlockDate: null, daysLeft: 0 };
  const reg = session.fechaRegistro.toDate ? session.fechaRegistro.toDate() : new Date(session.fechaRegistro);
  const unlockDate = new Date(reg);
  unlockDate.setDate(unlockDate.getDate() + diasNecesarios);
  return { unlocked: false, unlockDate, daysLeft: diasNecesarios - dias };
}

export function formatUnlockDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ═══ TOAST ═══
export function toast(msg, isError = false) {
  let el = document.getElementById('_gvToast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_gvToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.className = 'toast ' + (isError ? 'error' : 'success');
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

// ═══ EMISOR DE CONSTANCIAS ═══
export async function emitirConstancia(session, curso) {
  if (!session || !session.uid) return null;

  // Verificar duplicados
  try {
    const existentes = await getDocs(query(
      collection(db, 'certificados'),
      where('uid', '==', session.uid),
      where('cursoId', '==', curso.cursoId)
    ));
    if (!existentes.empty) return existentes.docs[0].data().folio;
  } catch(e) {}

  // Generar folio
  const año = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const folio = `GV-${año}-${rand}`;

  try {
    await addDoc(collection(db, 'certificados'), {
      folio,
      uid: session.uid,
      nombre: session.name,
      email: session.email,
      cursoId: curso.cursoId,
      cursoTitulo: curso.cursoTitulo,
      cursoArea: curso.cursoArea || 'Medicina veterinaria',
      totalClases: curso.totalClases || null,
      completadoEn: serverTimestamp(),
      emisor: 'GlobalVet México',
      activo: true
    });
    return folio;
  } catch (err) {
    console.error('Error emitiendo constancia:', err);
    return null;
  }
}

// ═══ EXPORTS DE FIREBASE ═══
export { auth, db, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, serverTimestamp, where };
