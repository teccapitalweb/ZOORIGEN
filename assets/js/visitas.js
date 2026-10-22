(function () {
  'use strict';
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || window.__zooVisitaEnviada) return;
  window.__zooVisitaEnviada = true;
  fetch('https://zoorigen-webhook-production.up.railway.app/api/visita', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ pagina: 'portada' }),
    credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true
  }).catch(function () { /* La visita nunca interrumpe la portada. */ });
})();
