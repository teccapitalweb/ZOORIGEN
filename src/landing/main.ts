import '../styles/landing.css';
import { Data } from '../core/data';
import type { Course } from '../core/types';

const app = document.querySelector<HTMLDivElement>('#landing-app')!;
if (!app) throw new Error('No se encontró #landing-app');

const iconByArea = ['⌁', '✦', '◌', '⬡', '⌖', '◇'];

function courseCard(course: Course): string {
  return `
    <article class="course-card">
      <div class="course-card__media">
        <img src="${course.image}" alt="" loading="lazy" />
        <span class="course-card__badge">${course.area}</span>
      </div>
      <div class="course-card__body">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-card__meta"><span>${course.lessons} lecciones</span><span>${course.duration}</span></div>
      </div>
    </article>`;
}

async function render(): Promise<void> {
  const catalog = await Data.catalog();
  const plan = catalog.plans.monthly;
  app.innerHTML = `
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brand" href="#inicio" aria-label="ZOORIGEN, inicio">
          <span class="brand__mark">Z</span>
          <span class="brand__text">ZOORIGEN<small>CIENCIA · FAUNA · CONSERVACIÓN</small></span>
        </a>
        <nav id="main-nav" aria-label="Navegación principal">
          <a href="#areas">Áreas</a><a href="#cursos">Cursos</a><a href="#club">Club VIP</a><a href="#como-funciona">Cómo funciona</a>
          <a class="btn btn--primary" href="/club/#/login">Entrar al club</a>
        </nav>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir menú">☰</button>
      </div>
    </header>
    <main id="inicio">
      <section class="hero">
        <div class="hero__inner">
          <div class="hero__copy">
            <span class="pill">✦ Formación científica que puedes llevar contigo</span>
            <h1>Aprende a mirar la fauna con <em>otros ojos.</em></h1>
            <p>Cursos, recursos y comunidad para estudiantes y profesionales que quieren comprender, cuidar y trabajar con la biodiversidad.</p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#cursos">Explorar cursos</a>
              <a class="btn btn--ghost" href="#club">Conocer el Club VIP</a>
            </div>
            <div class="hero__facts">
              <span><strong>22</strong> cursos públicos observados</span>
              <span><strong>6</strong> áreas de aprendizaje</span>
              <span><strong>Online</strong> desde cualquier lugar</span>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section" id="areas">
        <div class="section-title"><span class="eyebrow">Tu ruta de aprendizaje</span><h2>La naturaleza no cabe en una sola disciplina.</h2><p>Explora las áreas públicas de ZOORIGEN y encuentra el punto de partida que conecta con tu vocación.</p></div>
        <div class="areas">${catalog.areas.map((area, index) => `<article class="area-card"><span class="area-card__icon">${iconByArea[index] ?? '✦'}</span><h3>${area}</h3><p>Formación aplicada, recursos de consulta y una comunidad que aprende haciendo.</p></article>`).join('')}</div>
      </section>

      <section class="landing-section" id="cursos">
        <div class="section-title"><span class="eyebrow">Biblioteca destacada</span><h2>Conocimiento para llevar al campo.</h2><p>Selección basada en el catálogo público actual. El contenido final se validará con el equipo de ZOORIGEN.</p></div>
        <div class="course-grid">${catalog.courses.length ? catalog.courses.map(courseCard).join('') : '<div class="empty-state"><h3>Catálogo temporalmente no disponible</h3><p>No mostramos cursos de ejemplo cuando la API falla. Escríbenos para recibir atención humana.</p></div>'}</div>
      </section>

      <section class="landing-section" id="club">
        <div class="club-highlight">
          <div class="club-highlight__grid">
            <div class="club-highlight__copy">
              <span class="pill">Club VIP ZOORIGEN</span>
              <h2>Tu formación, reunida en un solo hábitat.</h2>
              <p>Una experiencia continua para aprender a tu ritmo, conversar con especialistas y documentar tu avance.</p>
              <ul class="benefit-list"><li>Biblioteca completa de cursos</li><li>Sesiones mensuales con especialistas</li><li>Recursos científicos y certificados</li><li>Comunidad privada y beneficios</li></ul>
              <a class="btn btn--primary" href="/club/#/login">Explorar el prototipo</a>
            </div>
            <div class="club-highlight__plan">
              <span class="eyebrow" style="color:var(--gold-soft)">Precio público observado</span>
              <div class="price">${plan ? `$${plan}` : '[por confirmar]'} <span>MXN / mes</span></div>
              <p>La interfaz muestra el precio publicado actualmente, pero ningún cobro está conectado en este prototipo.</p>
              <small>Precio, impuestos, renovación y condiciones pendientes de validación con el propietario y Stripe.</small>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section" id="como-funciona">
        <div class="section-title"><span class="eyebrow">Cómo funciona</span><h2>Aprender sin perderte en el camino.</h2></div>
        <div class="steps"><article class="step"><h3>Elige tu ruta</h3><p>Explora cursos por área, nivel e interés profesional.</p></article><article class="step"><h3>Avanza con claridad</h3><p>Clases secuenciales, recursos, notas y evaluaciones.</p></article><article class="step"><h3>Demuestra lo aprendido</h3><p>Registra progreso y obtén certificados cuando corresponda.</p></article></div>
      </section>
    </main>
    <footer class="landing-footer"><div class="landing-footer__inner"><div><a class="brand" href="#inicio"><span class="brand__mark">Z</span><span>ZOORIGEN</span></a><p>Capacitación científica orientada al estudio, manejo y conservación de la fauna y la biodiversidad.</p><div class="prototype-note">Prototipo local independiente · Datos comerciales pendientes de validación.</div></div><div class="footer-links"><a href="https://wa.me/5212361113237" rel="noreferrer">WhatsApp</a><a href="mailto:zooorigen@gmail.com">Correo</a><a href="#">Privacidad [por confirmar]</a></div></div></footer>`;

  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('#main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open') ?? false;
    toggle.setAttribute('aria-expanded', String(open));
  });
}

void render();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
