const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const value = btn.dataset.filter;
    document.querySelectorAll('.course-card[data-category]').forEach(card => {
      card.style.display = (value === 'all' || card.dataset.category === value) ? '' : 'none';
    });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ============================================================
   CARRUSEL CURSOS DESTACADOS — index.html
   MODIFICADO: carrusel con flechas y dots
   ============================================================ */
(function () {
  const track    = document.getElementById('coursesTrack');
  const dotsWrap = document.getElementById('coursesDots');
  if (!track) return;

  const cards    = Array.from(track.querySelectorAll('.course-card'));
  const prevBtn  = document.querySelector('.courses-arrow--prev');
  const nextBtn  = document.querySelector('.courses-arrow--next');

  function getVisible() {
    const w = track.parentElement.offsetWidth;
    if (w <= 580) return 1;
    if (w <= 900) return 2;
    return 3;
  }

  let current = 0;

  function totalPages() { return Math.ceil(cards.length / getVisible()); }

  function buildDots() {
    dotsWrap.innerHTML = '';
    for (let i = 0; i < totalPages(); i++) {
      const d = document.createElement('button');
      d.className = 'dot' + (i === current ? ' active' : '');
      d.setAttribute('aria-label', 'Ir a página ' + (i + 1));
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
    }
  }

  function goTo(page) {
    const vis   = getVisible();
    const pages = totalPages();
    current     = Math.max(0, Math.min(page, pages - 1));
    const gap   = 24; // 1.5rem in px — matches CSS gap: 1.5rem
    const cardW = track.parentElement.offsetWidth;
    const step  = (cardW + gap) / vis * vis;  // width of one "page"
    track.style.transform = `translateX(-${current * (cardW + gap)}px)`;

    // Actually compute offset per card width
    const firstCard = cards[0];
    const cardOuter = firstCard.offsetWidth + gap;
    track.style.transform = `translateX(-${current * vis * cardOuter}px)`;

    // update dots
    Array.from(dotsWrap.querySelectorAll('.dot')).forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });

    // update arrows
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current >= pages - 1;
  }

  prevBtn && prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn && nextBtn.addEventListener('click', () => goTo(current + 1));

  // Touch / swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  }, { passive: true });

  // Init
  buildDots();
  goTo(0);

  // Rebuild on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildDots(); goTo(0); }, 150);
  });
})();
