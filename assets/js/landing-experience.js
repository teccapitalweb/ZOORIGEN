/* Vista previa animada del registro. Solo muestra datos ficticios; no envía información. */
(function () {
  'use strict';
  var demo = document.querySelector('.registration-demo');
  if (!demo) return;
  var buttons = Array.from(document.querySelectorAll('[data-registration-step]'));
  var scenes = Array.from(demo.querySelectorAll('[data-registration-scene]'));
  var progress = Array.from(demo.querySelectorAll('.registration-progress span'));
  var toggle = document.getElementById('registrationMotionToggle');
  var description = document.getElementById('registrationStepDescription');
  var windowElement = demo.querySelector('.registration-window');
  var cursor = demo.querySelector('.registration-cursor');
  var fields = Array.from(demo.querySelectorAll('.registration-field'));
  var values = ['Alex Rivera', 'alex@ejemplo.com', '••••••••'];
  var valueElements = Array.from(demo.querySelectorAll('[data-demo-value]'));
  var captions = ['Escribe tus datos y crea tu acceso.', 'Tu cuenta está lista para entrar al club.', 'Elige el curso de prueba que más te interese.'];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var index = 0, paused = false, visible = false, timer = null, elapsed = 0, lastTick = 0, cursorTarget = '';
  function show(next) {
    index = next;
    demo.dataset.step = String(index);
    buttons.forEach(function (button, i) { button.classList.toggle('is-active', i === index); button.setAttribute('aria-pressed', String(i === index)); });
    scenes.forEach(function (scene, i) { scene.classList.toggle('is-active', i === index); scene.setAttribute('aria-hidden', String(i !== index)); });
    progress.forEach(function (item, i) { item.classList.toggle('is-active', i === index); });
    description.textContent = captions[index];
  }
  function moveCursor(key, target) {
    if (key === cursorTarget || !target) return;
    cursorTarget = key;
    var box = windowElement.getBoundingClientRect();
    var point = target.getBoundingClientRect();
    cursor.style.left = (point.left - box.left + point.width * .77) + 'px';
    cursor.style.top = (point.top - box.top + point.height * .55) + 'px';
  }
  function typed(value, time, start, duration) {
    return value.slice(0, Math.max(0, Math.min(value.length, Math.floor((time - start) / duration * value.length))));
  }
  function render(time, manualStep) {
    var manual = typeof manualStep === 'number';
    var step = manual ? manualStep : time < 8500 ? 0 : time < 11000 ? 1 : 2;
    show(step);
    var starts = [500, 2600, 4900], durations = [1500, 1700, 1100];
    valueElements.forEach(function (element, i) {
      element.textContent = manual ? values[i] : typed(values[i], time, starts[i], durations[i]);
      fields[i].classList.toggle('is-typing', !manual && step === 0 && time >= starts[i] && time < starts[i] + durations[i]);
    });
    var pressing = !manual && time >= 7800 && time < 8500;
    var selected = step === 2 && (manual || time >= 15000);
    demo.dataset.submitPressed = String(pressing);
    demo.dataset.courseSelected = String(selected);
    demo.dataset.cursorVisible = String(!manual && (step === 0 && time > 200 || step === 2 && time >= 13000 && time < 16300));
    if (!manual && step === 0) {
      var fieldIndex = time < 2500 ? 0 : time < 4800 ? 1 : time < 6500 ? 2 : -1;
      moveCursor(fieldIndex < 0 ? 'submit' : 'field' + fieldIndex, fieldIndex < 0 ? demo.querySelector('[data-demo-submit]') : fields[fieldIndex].querySelector('.registration-input'));
    } else if (!manual && step === 2 && time >= 13000) {
      moveCursor('course', demo.querySelector('.registration-demo-course--selected'));
    }
    if (time < 200) cursorTarget = '';
  }
  function schedule() {
    clearInterval(timer); timer = null;
    var running = visible && !paused && !reduced.matches && !document.hidden;
    demo.classList.toggle('registration-paused', !running);
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = reduced.matches ? 'Movimiento reducido' : paused ? 'Reproducir' : 'Pausar animación';
    if (reduced.matches) render(elapsed, index);
    if (running) {
      lastTick = performance.now();
      timer = setInterval(function () {
        var now = performance.now();
        elapsed = (elapsed + now - lastTick) % 19000;
        lastTick = now;
        render(elapsed);
      }, 80);
    }
  }
  buttons.forEach(function (button, i) {
    button.addEventListener('click', function () {
      paused = true; elapsed = [0, 9000, 15000][i]; render(elapsed, i); schedule();
    });
  });
  toggle.addEventListener('click', function () { paused = !paused; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('resize', function () { cursorTarget = ''; });
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  else reduced.addListener(schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      demo.classList.toggle('registration-out-of-view', !visible);
      schedule();
    }, {threshold:.15}).observe(demo);
  } else { visible = true; }
  render(0, reduced.matches ? 0 : undefined);
  schedule();
})();
