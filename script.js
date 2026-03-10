
const data = window.ZOORIGEN_DATA;
const areasGrid = document.getElementById('areasGrid');
const coursesGrid = document.getElementById('coursesGrid');
const toolbar = document.querySelector('.course-toolbar');
const galleryGrid = document.getElementById('galleryGrid');
const reviewsGrid = document.getElementById('reviewsGrid');
const modal = document.getElementById('courseModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const backToTop = document.getElementById('backToTop');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
let activeFilter = 'all';

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderAreas() {
  areasGrid.innerHTML = data.areas.map(area => `
    <article class="area-card ${activeFilter === area.name ? 'is-active' : ''}" data-area="${area.name}">
      <img src="${area.cover}" alt="${area.name}">
      <div class="area-card__body">
        <h3>${area.name}</h3>
        <p>${area.desc}</p>
      </div>
    </article>
  `).join('');

  areasGrid.querySelectorAll('.area-card').forEach(card => {
    card.addEventListener('click', () => {
      activeFilter = card.dataset.area;
      updateFilterButtons();
      renderAreas();
      renderCourses();
      document.getElementById('cursos').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderToolbar() {
  const buttons = ['all', ...data.areas.map(area => area.name)];
  toolbar.innerHTML = buttons.map(item => `
    <button class="filter-chip ${activeFilter === item ? 'is-active' : ''}" data-filter="${item}">${item === 'all' ? 'Todos' : item}</button>
  `).join('');

  toolbar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      updateFilterButtons();
      renderAreas();
      renderCourses();
    });
  });
}

function updateFilterButtons() {
  toolbar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.filter === activeFilter);
  });
}

function renderCourses() {
  const filtered = activeFilter === 'all'
    ? data.courses
    : data.courses.filter(course => course.area === activeFilter);

  coursesGrid.innerHTML = filtered.map(course => `
    <article class="course-card">
      <div class="course-card__image">
        <img src="${course.image}" alt="${course.name}">
      </div>
      <div class="course-card__body">
        <div class="course-card__meta">
          <span class="badge">${course.area}</span>
        </div>
        <h3>${course.name}</h3>
        <p>${course.summary}</p>
        <div class="course-card__actions">
          <button class="link-button" data-course="${course.id}">Ver detalles</button>
          <a class="btn btn--primary" href="https://wa.me/5212361113237?text=${encodeURIComponent('Hola, me interesa el curso: ' + course.name)}" target="_blank" rel="noopener">Informes</a>
        </div>
      </div>
    </article>
  `).join('');

  coursesGrid.querySelectorAll('[data-course]').forEach(button => {
    button.addEventListener('click', () => openCourseModal(button.dataset.course));
  });
}

function openCourseModal(courseId) {
  const course = data.courses.find(item => item.id === courseId);
  if (!course) return;

  modalContent.innerHTML = `
    <div class="modal__hero">
      <img src="${course.image}" alt="${course.name}">
      <div>
        <span class="badge">${course.area}</span>
        <h2 style="margin-top:12px;">${course.name}</h2>
        <p>${course.summary}</p>
        <p><strong>Dirigido a:</strong> ${course.audience}</p>
        <h3>Incluye</h3>
        <ul class="modal__list">
          ${course.benefits.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <div class="hero__actions" style="margin-top:20px;">
          <a class="btn btn--primary" href="https://wa.me/5212361113237?text=${encodeURIComponent('Hola, me interesa el curso: ' + course.name)}" target="_blank" rel="noopener">Solicitar informes</a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderGallery() {
  galleryGrid.innerHTML = data.students.map(src => `<img src="${src}" alt="Alumno Zoorigen">`).join('');
  reviewsGrid.innerHTML = data.reviews.map(src => `<img src="${src}" alt="Reseña Zoorigen">`).join('');
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.counter);
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          el.textContent = target + (target === 100 ? '%' : '+');
          clearInterval(timer);
        } else {
          el.textContent = current;
        }
      }, 20);
      observer.unobserve(el);
    });
  }, { threshold: .5 });
  counters.forEach(counter => observer.observe(counter));
}

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('is-visible', window.scrollY > 500);
});
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('is-open')));
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target.dataset.close) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

renderToolbar();
renderAreas();
renderCourses();
renderGallery();
initCounters();
