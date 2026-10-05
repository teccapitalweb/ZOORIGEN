import '../styles/landing.css';
import { Data } from '../core/data';
import type { Course } from '../core/types';

const app = document.querySelector<HTMLDivElement>('#landing-app')!;
if (!app) throw new Error('No se encontró #landing-app');

const iconByArea = ['⌁', '✦', '◌', '⬡', '⌖', '◇'];

function courseCard(course: Course, index: number): string {
  return `
    <article class="course-card" data-course-area="${course.area}">
      <div class="course-card__media">
        <img src="${course.image}" alt="" loading="lazy" />
        <span class="course-card__index">EXP—${String(index + 1).padStart(2, '0')}</span>
        <span class="course-card__badge">${course.area}</span>
      </div>
      <div class="course-card__body">
        <span class="course-card__level">${course.level} · ${course.duration}</span>
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-card__meta"><span>${course.lessons} estaciones</span><span>Explorar ruta ↗</span></div>
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
      <span class="site-header__progress" aria-hidden="true"><span></span></span>
    </header>
    <main id="inicio">
      <section class="hero">
        <div class="hero__inner">
          <div class="hero__copy">
            <span class="hero__kicker">Ciencia de campo · Aprendizaje en línea</span>
            <h1>Conoce la fauna.<br>Protege su <em>origen.</em></h1>
            <p>Aprende a observar, comprender y actuar con cursos prácticos de fauna, manejo y conservación.</p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#cursos">Explorar formación</a>
              <a class="hero__secondary" href="#club">Descubrir la membresía <span>↗</span></a>
            </div>
            <div class="hero__facts" aria-label="Resumen de la plataforma">
              <span><strong>22</strong><small>cursos</small></span>
              <span><strong>06</strong><small>áreas</small></span>
              <span><strong>100%</strong><small>en línea</small></span>
            </div>
          </div>
        </div>
        <a class="hero__scroll" href="#areas"><span>↓</span> Descubre la plataforma</a>
      </section>

      <section class="manifesto" aria-label="Manifiesto ZOORIGEN">
        <div class="manifesto__copy">
          <span class="eyebrow"><i></i>El club de ZOORIGEN</span>
          <h2>Aprender la naturaleza es otra forma de <em>protegerla.</em></h2>
          <p>Una plataforma para quienes no quieren memorizar especies, sino comprender cómo viven, cómo se relacionan y qué podemos hacer para conservarlas.</p>
          <div class="manifesto__actions">
            <a class="btn btn--dark" href="/club/#/login">Conocer el club <span>↗</span></a>
            <a class="text-link" href="#areas">Explorar territorios</a>
          </div>
          <ul class="manifesto__checks">
            <li><span>✓</span>Aprendizaje a tu ritmo</li>
            <li><span>✓</span>Recursos para llevar al campo</li>
            <li><span>✓</span>Progreso y evidencias de aprendizaje</li>
          </ul>
        </div>
        <div class="manifesto__art" aria-label="Monitoreo de campo y biodiversidad de ZOORIGEN">
          <figure class="nature-frame nature-frame--large"><img src="/assets/zoorigen-camera-trap-v2.png" alt="Cámara trampa instalada en un sendero de bosque húmedo" loading="lazy"></figure>
          <figure class="nature-frame nature-frame--small"><img src="/assets/zoorigen-fern-detail-v2.png" alt="Helecho joven creciendo sobre el suelo húmedo del bosque" loading="lazy"></figure>
          <span class="field-note">BITÁCORA / 001<br><strong>OBSERVAR · COMPRENDER · CONSERVAR</strong></span>
        </div>
      </section>

      <section class="impact-strip" aria-label="Resumen de ZOORIGEN">
        <div><strong>22</strong><span>Cursos publicados</span></div>
        <div><strong>06</strong><span>Territorios de estudio</span></div>
        <div><strong>100%</strong><span>Aprendizaje en línea</span></div>
        <div><strong>24/7</strong><span>Avance a tu propio ritmo</span></div>
      </section>

      <section class="area-marquee" aria-label="Áreas formativas de ZOORIGEN">
        <div class="area-marquee__track">${[...catalog.areas, ...catalog.areas].map((area) => `<span>${area}<i>✦</i></span>`).join('')}</div>
      </section>

      <section class="club-section" id="club">
        <svg class="club-section__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,0H1440V36C1190,83 967,8 718,43C467,80 226,12 0,48Z"/></svg>
        <div class="landing-shell club-intro">
          <div class="club-intro__copy">
            <span class="eyebrow eyebrow--light">01 / Dentro del hábitat</span>
            <h2>Todo lo que necesitas para seguir <em>explorando.</em></h2>
            <p>El conocimiento deja de estar disperso. Cursos, materiales, actividades y comunidad viven en una experiencia continua que recuerda por dónde vas.</p>
            <div class="club-features">
              <article><span>▶</span><div><strong>Expediciones guiadas</strong><small>Clases ordenadas para avanzar con claridad.</small></div></article>
              <article><span>⌑</span><div><strong>Archivo de campo</strong><small>Guías y fichas listas para consultar.</small></div></article>
              <article><span>◎</span><div><strong>Evaluaciones</strong><small>Actividades para comprobar lo aprendido.</small></div></article>
              <article><span>✦</span><div><strong>Evidencias</strong><small>Progreso y certificados cuando corresponda.</small></div></article>
              <article><span>◌</span><div><strong>Mesa de especialistas</strong><small>Conversaciones y sesiones de la comunidad.</small></div></article>
              <article><span>⌁</span><div><strong>Siempre contigo</strong><small>Disponible en computadora, tableta y celular.</small></div></article>
            </div>
          </div>
          <div class="platform-preview" aria-label="Vista previa de la plataforma ZOORIGEN">
            <div class="platform-preview__browser"><i></i><i></i><i></i><span>club.zoorigen.com</span></div>
            <div class="platform-preview__screen">
              <aside><b>Z</b><span class="is-active">⌂</span><span>▤</span><span>◉</span><span>♧</span></aside>
              <div class="platform-preview__content">
                <span class="mini-label">TU PRÓXIMA ESTACIÓN</span>
                <h3>Continúa tu expedición.</h3>
                <div class="mini-progress"><span></span></div>
                <small>Arácnidos de importancia médica · 64%</small>
                <div class="mini-courses">${catalog.courses.slice(0, 3).map((course) => `<span><img src="${course.image}" alt="" loading="lazy"><b>${course.title}</b></span>`).join('')}</div>
              </div>
            </div>
            <div class="platform-float platform-float--top"><b>+1</b><span>estación completada</span></div>
            <div class="platform-float platform-float--bottom"><span>Disponible como app</span><b>Aprende donde estés</b></div>
          </div>
        </div>
        <div class="landing-shell plans" id="planes">
          <article class="plan-card">
            <span class="plan-card__name">Membresía mensual</span>
            <div class="plan-card__price">${plan ? `$${plan}` : 'Por confirmar'}<small>${plan ? ' MXN / mes' : ''}</small></div>
            <p>Para comenzar y avanzar mes a mes dentro del club.</p>
            <a class="btn btn--ghost-light" href="/club/#/login?modo=registro">Elegir mensual</a>
          </article>
          <article class="plan-card plan-card--featured">
            <span class="plan-card__badge">Ruta recomendada</span>
            <span class="plan-card__name">Membresía anual</span>
            <div class="plan-card__price">${catalog.plans.annual ? `$${catalog.plans.annual}` : 'Por confirmar'}<small>${catalog.plans.annual ? ' MXN / año' : ''}</small></div>
            <p>Un año para construir una formación constante y documentar tu avance.</p>
            <a class="btn btn--primary" href="/club/#/login?modo=registro">Unirme al club <span>→</span></a>
          </article>
          <article class="plan-card plan-card--note">
            <span class="plan-card__symbol">Z/</span>
            <strong>Explora antes de decidir</strong>
            <p>Abre el prototipo, conoce el catálogo y revisa cómo se organiza una ruta de aprendizaje.</p>
            <a class="text-link text-link--light" href="/club/#/login">Entrar al prototipo ↗</a>
          </article>
        </div>
        <p class="commercial-note landing-shell">Precios observados en la información pública de ZOORIGEN. Cobro, impuestos, renovación y condiciones todavía requieren validación antes de conectar pagos reales.</p>
      </section>

      <section class="landing-section method-section" id="como-funciona">
        <div class="section-heading"><span class="eyebrow">02 / Cómo funciona</span><h2>Entra hoy. Aprende a tu ritmo.<br><em>Deja evidencia de lo aprendido.</em></h2></div>
        <div class="steps">
          <article class="step"><span class="step__number">01</span><i>⌖</i><h3>Elige un territorio</h3><p>Encuentra una ruta por tema, nivel o interés profesional.</p></article>
          <article class="step"><span class="step__number">02</span><i>▶</i><h3>Avanza por estaciones</h3><p>Continúa donde te quedaste y consulta cada recurso en orden.</p></article>
          <article class="step"><span class="step__number">03</span><i>◎</i><h3>Ponlo en práctica</h3><p>Responde actividades, conserva notas y refuerza conceptos clave.</p></article>
          <article class="step step--dark"><span class="step__number">04</span><i>✦</i><h3>Documenta tu avance</h3><p>Registra progreso y obtén evidencias cuando corresponda.</p></article>
        </div>
      </section>

      <section class="landing-section course-section" id="cursos">
        <div class="section-heading section-heading--row"><div><span class="eyebrow">03 / Catálogo del club</span><h2>Expediciones para llevar el conocimiento <em>al campo.</em></h2><p>Explora una muestra del catálogo público de ZOORIGEN.</p></div><a class="btn btn--ghost" href="/club/#/cursos">Ver catálogo completo ↗</a></div>
        <div class="course-filters" role="group" aria-label="Filtrar cursos por área"><button class="is-active" type="button" data-course-filter="Todos">Todos</button>${catalog.areas.map((area) => `<button type="button" data-course-filter="${area}">${area}</button>`).join('')}</div>
        <div class="course-grid">${catalog.courses.length ? catalog.courses.map(courseCard).join('') : '<div class="empty-state"><h3>Catálogo temporalmente no disponible</h3><p>No mostramos cursos de ejemplo cuando la API falla. Escríbenos para recibir atención humana.</p></div>'}</div>
      </section>

      <section class="landing-section certification-section" id="certificacion">
        <div class="certificate-visual" aria-label="Muestra visual de una evidencia de aprendizaje">
          <div class="certificate-sheet">
            <span class="certificate-brand"><b>Z</b> ZOORIGEN</span>
            <span class="eyebrow">Evidencia de aprendizaje</span>
            <p>Se reconoce la finalización de la expedición</p>
            <h3>Fauna silvestre y conservación</h3>
            <div class="certificate-line"></div>
            <div class="certificate-meta"><span>FOLIO DE MUESTRA<br><b>ZR-EXP-001</b></span><span class="certificate-qr">▦</span></div>
          </div>
          <span class="certificate-stamp">MUESTRA<br>VISUAL</span>
        </div>
        <div class="certification-copy"><span class="eyebrow">04 / Evidencias</span><h2>Que tu avance no se quede sólo en la pantalla.</h2><p>La arquitectura del club está preparada para registrar progreso y emitir certificados verificables cuando el propietario confirme las reglas académicas.</p><div class="cert-points"><article><span>✓</span><div><strong>Progreso visible</strong><small>Retoma exactamente desde donde te quedaste.</small></div></article><article><span>✓</span><div><strong>Folio verificable</strong><small>Preparado para validación pública desde el servidor.</small></div></article><article><span>✓</span><div><strong>Historial personal</strong><small>Conserva tus rutas, logros y evidencias en un perfil.</small></div></article></div></div>
      </section>

      <section class="landing-section" id="areas">
        <div class="section-heading section-heading--row"><div><span class="eyebrow">05 / Territorios de conocimiento</span><h2>La naturaleza no cabe en una sola disciplina.</h2></div><p>Seis puertas de entrada para conectar ciencia, práctica y conservación.</p></div>
        <div class="areas">${catalog.areas.map((area, index) => `<article class="area-card"><span class="area-card__number">0${index + 1}</span><span class="area-card__icon">${iconByArea[index] ?? '✦'}</span><h3>${area}</h3><p>Formación aplicada, recursos de consulta y una comunidad que aprende haciendo.</p><span class="area-card__link">Abrir territorio ↗</span></article>`).join('')}</div>
      </section>

      <section class="community-band">
        <div class="landing-shell"><div class="community-band__heading"><span class="eyebrow eyebrow--light">06 / Una experiencia continua</span><h2>Más que una biblioteca de videos.</h2><p>ZOORIGEN reúne las herramientas necesarias para convertir curiosidad en práctica constante.</p></div><div class="community-grid"><article><span>01</span><h3>Archivo científico</h3><p>Fichas, guías y materiales de apoyo organizados por territorio.</p></article><article><span>02</span><h3>Sesiones y comunidad</h3><p>Un lugar preparado para conversar con especialistas y compartir hallazgos.</p></article><article><span>03</span><h3>Misiones de campo</h3><p>Retos y casos para observar, tomar decisiones y reforzar criterios.</p></article></div></div>
      </section>

      <section class="landing-section faq-section" id="preguntas">
        <div class="faq-intro"><span class="eyebrow">07 / Preguntas frecuentes</span><h2>Todo claro antes de comenzar.</h2><p>Este proyecto sigue en modo local. Aquí separamos lo que ya puedes explorar de lo que aún requiere validación comercial.</p><a class="btn btn--dark" href="mailto:zooorigen@gmail.com">Escribir a ZOORIGEN ↗</a></div>
        <div class="faq-list">
          <details open><summary>¿Qué incluye el Club ZOORIGEN?<span>+</span></summary><p>Cursos organizados por rutas, recursos científicos, progreso, actividades, comunidad y arquitectura para certificados verificables.</p></details>
          <details><summary>¿Los cursos son en vivo o grabados?<span>+</span></summary><p>El prototipo contempla cursos a tu ritmo y sesiones programadas. Fechas, especialistas y condiciones de cada edición deben confirmarse antes de publicarse.</p></details>
          <details><summary>¿Puedo usarlo desde mi celular?<span>+</span></summary><p>Sí. La experiencia es responsive y está preparada como aplicación web instalable.</p></details>
          <details><summary>¿El pago ya está conectado?<span>+</span></summary><p>No. La integración segura con Stripe está contemplada, pero permanece desconectada hasta validar precios, impuestos, renovación y cuentas del propietario.</p></details>
          <details><summary>¿Los certificados ya tienen validez definida?<span>+</span></summary><p>La plataforma soporta folios y verificación; los criterios académicos y comerciales todavía deben ser confirmados por ZOORIGEN.</p></details>
        </div>
      </section>

      <section class="final-cta">
        <div class="final-cta__content"><span class="eyebrow eyebrow--light">Tu siguiente expedición</span><h2>Hay mucho por descubrir.<br><em>Empieza por entender.</em></h2><p>Explora el prototipo del club y encuentra el territorio que conecta con tu curiosidad.</p><div><a class="btn btn--primary" href="/club/#/login">Entrar al club <span>→</span></a><a class="btn btn--ghost-light" href="#cursos">Ver expediciones</a></div></div>
      </section>
    </main>
    <footer class="landing-footer"><div class="landing-footer__inner"><div class="footer-brand"><a class="brand" href="#inicio"><span class="brand__mark">Z</span><span class="brand__text">ZOORIGEN<small>CIENCIA · FAUNA · CONSERVACIÓN</small></span></a><p>Capacitación científica orientada al estudio, manejo y conservación de la fauna y la biodiversidad.</p><div class="prototype-note">Prototipo local independiente · Datos comerciales pendientes de validación.</div></div><div class="footer-column"><strong>Explora</strong><a href="#club">Qué incluye</a><a href="#cursos">Cursos</a><a href="#planes">Planes</a><a href="#certificacion">Evidencias</a></div><div class="footer-column"><strong>Club</strong><a href="/club/#/login">Iniciar sesión</a><a href="/club/#/login?modo=registro">Crear cuenta</a><a href="#preguntas">Preguntas</a></div><div class="footer-column"><strong>Contacto</strong><a href="https://wa.me/5212361113237" rel="noreferrer">WhatsApp</a><a href="mailto:zooorigen@gmail.com">Correo</a><a href="#">Privacidad [por confirmar]</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ZOORIGEN</span><span>HECHO PARA APRENDER · CREADO PARA CONSERVAR</span></div></footer>`;

  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('#main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open') ?? false;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    toggle.textContent = open ? '×' : '☰';
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Abrir menú');
    if (toggle) toggle.textContent = '☰';
  }));

  const header = document.querySelector<HTMLElement>('.site-header');
  const progress = document.querySelector<HTMLElement>('.site-header__progress span');
  const updateHeader = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 48);
    const available = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.site-header nav a[href^="#"]')];
  const observedSections = navLinks
    .map((link) => document.querySelector<HTMLElement>(link.hash))
    .filter((section): section is HTMLElement => Boolean(section));
  const sectionObserver = new IntersectionObserver((entries) => {
    const current = entries.find((entry) => entry.isIntersecting)?.target as HTMLElement | undefined;
    if (!current) return;
    navLinks.forEach((link) => {
      const active = link.hash === `#${current.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-28% 0px -62% 0px', threshold: 0 });
  observedSections.forEach((section) => sectionObserver.observe(section));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll<HTMLElement>([
    '.manifesto__copy', '.manifesto__art', '.impact-strip', '.club-intro__copy',
    '.platform-preview', '.plan-card', '.section-heading', '.step', '.course-card',
    '.certificate-visual', '.certification-copy', '.area-card', '.community-band__heading',
    '.community-grid article', '.faq-intro', '.faq-list details', '.final-cta__content',
  ].join(','));
  revealTargets.forEach((element, index) => {
    element.dataset.reveal = '';
    element.style.setProperty('--reveal-order', String(index % 4));
  });
  document.documentElement.classList.add('reveal-ready');
  if (reduceMotion) revealTargets.forEach((element) => element.classList.add('is-visible'));
  else {
    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealTargets.forEach((element) => revealObserver.observe(element));
  }

  const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-course-filter]');
  const courseCards = document.querySelectorAll<HTMLElement>('[data-course-area]');
  filterButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const selected = button.dataset.courseFilter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    courseCards.forEach((card) => { card.hidden = selected !== 'Todos' && card.dataset.courseArea !== selected; });
  }));
}

void render();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
