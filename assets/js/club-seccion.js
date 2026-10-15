/* ============================================================ */
/* CLUB VIP ZOORIGEN · TARJETA DE TÍTULO DE SECCIÓN              */
/* Un solo componente para el encabezado de TODOS los apartados: */
/* píldora con ícono, título con la parte final en acento,       */
/* subtítulo, cifras y segmentos/acciones a la derecha.          */
/* Cada apartado puede llevar una capa decorativa (íconos Lucide */
/* en línea, muy tenues) y un personaje animado a la derecha,    */
/* con una burbuja de diálogo que rota mensajes cortos y, si hay */
/* cuadros extra (FRAMES), parpadeo y habla.                     */
/* html() es puro y se prueba en Node; montar() corre en el      */
/* navegador. Estilos: assets/css/club-seccion.css               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_SECCION = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function ico(nombre) {
    return nombre ? '<svg class="zi" aria-hidden="true"><use href="#zi-' + esc(nombre) + '"/></svg>' : '';
  }
  function idSeguro(v) { return String(v == null ? '' : v).replace(/[^\w-]/g, ''); }

  /* ------------------------------------------------------------ */
  /* DECORACIÓN POR APARTADO                                       */
  /* ------------------------------------------------------------ */
  /* Trazos Lucide (https://lucide.dev, licencia ISC), los mismos de herramientas-iconos.js más algunos
     propios. Van en línea (no dependen del sprite): cada tarjeta se dibuja sola, sin descargar nada. */
  var ICONOS_DECOR = {
    'award': '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    'badge-check': '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12"/>',
    'beaker': '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>',
    'bell': '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    'book-open': '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    'briefcase': '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    'building-2': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    'calculator': '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    'calendar': '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
    'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'clapperboard': '<path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/>',
    'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'contact': '<path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><circle cx="12" cy="11" r="3"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    'credit-card': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    'crown': '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'droplets': '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
    'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    'file-pen': '<path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'files': '<path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>',
    'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'flask-conical': '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
    'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    'gavel': '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
    'gem': '<path d="M10.5 3 8 9l4 13 4-13-2.5-6"/><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/><path d="M2 9h20"/>',
    'gift': '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    'hash': '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    'hourglass': '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    'library': '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'mail': '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
    'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    'message-circle': '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'messages-square': '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
    'mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    'notebook': '<path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M16 2v20"/>',
    'palette': '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    'party-popper': '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
    'pen-line': '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    'pipette': '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>',
    'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
    'printer': '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    'radio': '<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/>',
    'rocket': '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
    'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    'scroll-text': '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
    'search': '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    'sparkles': '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    'stamp': '<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"/>',
    'star': '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    'stethoscope': '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
    'syringe': '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>',
    'tag': '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'thermometer': '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    'timer': '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    'trophy': '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
    'video': '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'
  };

  /* Carpeta y extensión de los personajes. El dueño los entrega como seccion-<clave>.webp. */
  var RUTA_PERSONAJES = 'assets/img/guia/secciones/';
  var EXT_PERSONAJE = '.webp';

  /* Animaciones del personaje (keyframes en club-seccion.css) y de la capa de íconos. */
  var ANIMACIONES = ['asiente', 'camina', 'balanceo', 'burbujea', 'balanza', 'anota', 'cabecea', 'claqueta', 'burbuja', 'saluda', 'tictac', 'brillo', 'cabeceo', 'revolotea', 'ajusta', 'zumba', 'salta'];
  var ANIMACIONES_DECOR = ['flota', 'gira', 'parpadea', 'sube'];
  var ACENTOS = ['verde', 'oro', 'azul', 'naranja'];

  /* Mapa único: clave del apartado (cfg.seccion) -> personaje, animación, íconos y acento.
     personaje: nombre de archivo SIN extensión (assets/img/guia/secciones/<personaje>.webp).
     animacion: movimiento del personaje · deco: movimiento lento de los íconos · acento: color de borde y píldora.
     "Inicio" no está aquí a propósito: su tarjeta tiene a Jaguarito y su propia decoración. */
  var DECORACION = {
    cursos:       { personaje: 'seccion-cursos',       etiqueta: 'Profe Búho',            animacion: 'asiente',   deco: 'flota',    acento: 'verde',   iconos: ['library', 'graduation-cap', 'play', 'book-open', 'lightbulb', 'sparkles', 'pencil'] },
    pdfs:         { personaje: 'seccion-pdfs',         etiqueta: 'Tortuga mochilera',     animacion: 'camina',    deco: 'gira',     acento: 'azul',    iconos: ['files', 'file-text', 'folder', 'download', 'file-pen', 'printer'] },
    herramientas: { personaje: 'seccion-herramientas', etiqueta: 'Coatí veterinario',     animacion: 'balanceo',  deco: 'parpadea', acento: 'oro',     iconos: ['stethoscope', 'thermometer', 'clipboard-list', 'heart-pulse', 'file-text', 'book-open', 'search', 'hash'] },
    infusiones:   { personaje: 'seccion-infusiones',   etiqueta: 'Ajolote científico',    animacion: 'burbujea',  deco: 'sube',     acento: 'azul',    iconos: ['pipette', 'flask-conical', 'droplet', 'beaker', 'droplets', 'syringe', 'timer'] },
    legal:        { personaje: 'seccion-legal',        etiqueta: 'Águila legal',          animacion: 'balanza',   deco: 'gira',     acento: 'oro',     iconos: ['scale', 'gavel', 'stamp', 'scroll-text', 'shield-check', 'file-text', 'building-2'] },
    registro:     { personaje: 'seccion-inventario',   etiqueta: 'Tlacuache anotador',    animacion: 'anota',     deco: 'flota',    acento: 'naranja', iconos: ['notebook', 'pencil', 'tag', 'clipboard-list', 'pen-line', 'search', 'hash'] },
    sesiones:     { personaje: 'seccion-webinars',     etiqueta: 'Guacamaya locutora',    animacion: 'cabecea',   deco: 'parpadea', acento: 'naranja', iconos: ['hourglass', 'mic', 'radio', 'clock', 'video', 'calendar', 'users'] },
    videos:       { personaje: 'seccion-videos',       etiqueta: 'Mapache director',      animacion: 'claqueta',  deco: 'gira',     acento: 'azul',    iconos: ['video', 'play', 'clapperboard', 'camera', 'image', 'eye'] },
    foro:         { personaje: 'seccion-foro',         etiqueta: 'Cotorra conversadora',  animacion: 'burbuja',   deco: 'sube',     acento: 'verde',   iconos: ['message-circle', 'messages-square', 'message-square', 'users', 'heart', 'hash'] },
    directorio:   { personaje: 'seccion-directorio',   etiqueta: 'Lobo anfitrión',        animacion: 'saluda',    deco: 'flota',    acento: 'azul',    iconos: ['users', 'user', 'contact', 'map-pin', 'mail', 'briefcase', 'search'] },
    retos:        { personaje: 'seccion-retos',        etiqueta: 'Zorra retadora',        animacion: 'tictac',    deco: 'gira',     acento: 'naranja', iconos: ['timer', 'target', 'zap', 'rocket', 'flame', 'trophy'] },
    logros:       { personaje: 'seccion-logros',       etiqueta: 'Quetzal campeón',       animacion: 'brillo',    deco: 'parpadea', acento: 'oro',     iconos: ['trophy', 'award', 'star', 'badge-check', 'sparkles', 'party-popper'] },
    certificados: { personaje: 'seccion-certificados', etiqueta: 'Tucán graduado',        animacion: 'cabeceo',   deco: 'flota',    acento: 'oro',     iconos: ['stamp', 'award', 'scroll-text', 'badge-check', 'graduation-cap', 'shield-check'] },
    referidos:    { personaje: 'seccion-referidos',    etiqueta: 'Colibrí mensajero',     animacion: 'revolotea', deco: 'sube',     acento: 'naranja', iconos: ['gift', 'mail', 'heart', 'users', 'party-popper', 'sparkles', 'link'] },
    perfil:       { personaje: 'seccion-perfil',       etiqueta: 'Camaleón de perfil',    animacion: 'ajusta',    deco: 'gira',     acento: 'verde',   iconos: ['user', 'settings', 'palette', 'pencil', 'shield-check', 'badge-check'] },
    suscripcion:  { personaje: 'seccion-suscripcion',  etiqueta: 'Abeja reina',           animacion: 'zumba',     deco: 'parpadea', acento: 'oro',     iconos: ['crown', 'star', 'gem', 'credit-card', 'sparkles', 'badge-check', 'calendar'] },
    canal:        { personaje: 'seccion-canal',        etiqueta: 'Delfín comunicador',    animacion: 'salta',     deco: 'sube',     acento: 'verde',   iconos: ['smartphone', 'megaphone', 'bell', 'message-circle', 'radio', 'mail', 'send'] }
  };
  /* Nombres alternos que usa el menú del Club para el mismo apartado. */
  var ALIAS = { biblioteca: 'cursos', inventario: 'registro', webinars: 'sesiones', invitar: 'referidos', logro: 'logros' };

  function claveDeco(seccion) {
    var k = String(seccion == null ? '' : seccion).toLowerCase().replace(/[^a-z0-9-]/g, '');
    k = ALIAS[k] || k;
    return Object.prototype.hasOwnProperty.call(DECORACION, k) ? k : '';
  }
  /* Clave de paleta de la página (la que lleva <body data-zoo>): las del mapa de DECORACION más 'inicio'. Vacía si no se conoce. */
  function claveApartado(seccion) {
    var k = String(seccion == null ? '' : seccion).toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (k === 'inicio' || k === 'dashboard') return 'inicio';
    return claveDeco(k);
  }
  function decoracionDe(seccion) { var k = claveDeco(seccion); return k ? DECORACION[k] : null; }
  function trazo(nombre) { return Object.prototype.hasOwnProperty.call(ICONOS_DECOR, nombre) ? ICONOS_DECOR[nombre] : ''; }

  /* Ruta de la imagen del personaje: <base>assets/img/guia/secciones/<archivo>.webp */
  function rutaPersonaje(archivo, base) {
    var f = String(archivo == null ? '' : archivo).replace(/[^a-z0-9-]/gi, '');
    if (!f) return '';
    return (typeof base === 'string' ? base : '../') + RUTA_PERSONAJES + f + EXT_PERSONAJE;
  }

  /* Lógica de respaldo (pura): ¿se pinta el personaje?
     noDisponibles: arreglo o conjunto con los archivos que ya se sabe que no existen (404 / error).
     Sin personaje definido, o con la imagen conocida como faltante, la tarjeta se pinta solo con la capa decorativa. */
  function debePintarPersonaje(dec, noDisponibles) {
    if (!dec || !dec.personaje) return false;
    if (!noDisponibles) return true;
    if (typeof noDisponibles.has === 'function') return !noDisponibles.has(dec.personaje);
    if (typeof noDisponibles.indexOf === 'function') return noDisponibles.indexOf(dec.personaje) === -1;
    return true;
  }

  var NO_DISPONIBLES = {};   // archivo -> true (se llena en el navegador al fallar la carga)
  var noDispSet = { has: function (k) { return NO_DISPONIBLES[k] === true; } };

  /* ------------------------------------------------------------ */
  /* BURBUJA DE DIÁLOGO Y CUADROS DEL PERSONAJE (lógica pura)       */
  /* ------------------------------------------------------------ */
  /* Mensajes cortos que rotan en la burbuja de cada personaje. Un solo mapa por clave de apartado (la de DECORACION).
     Reglas: máximo MENSAJE_MAX caracteres, sin emojis ni HTML, y NINGUNO promete algo que el sitio no hace.
     Cada afirmación se comprobó contra el texto que ya muestra la página del apartado (dónde, entre paréntesis):
       cursos        clase a clase con preguntas y un juego al final; "Aprende a tu ritmo" (club-biblioteca.html, onboarding)
       pdfs          "guías y plantillas para descargar" y "los libros se desbloquean con tus retos" (club-materiales.js)
       herramientas  "cada valor trae el enlace a la fuente" y "no sustituyen el criterio del médico veterinario" (Referencia clínica: constantes y BCS)
       infusiones    "Tú escribes la dosis: la herramienta solo hace la aritmética y te muestra la fórmula con tus números"
       legal         "Material de apoyo, no es asesoría legal" (club-legal.html)
       registro      "Anota tus ejemplares y lo que les pasa (nacimientos, bajas, muertes, traslados)", "arma tu inventario" y
                     "el borrador de tu informe anual" (club-inventario.html)
       sesiones      con la bandera ZOO_CONFIG.clasesEnVivoPronto solo "Próximamente"; sin ella, lo que dice la página (Google Meet)
       videos        "Videos prácticos, paso a paso. Técnicas de campo"
       foro          "Conecta, pregunta y comparte con profesionales en fauna silvestre de toda Latinoamérica"
       directorio    "Crea tu tarjeta para que te encuentren"
       retos         "Cada reto superado suma XP y abre libros"
       logros        "abre cursos antes de tiempo con tus premios"
       certificados  "certificados descargables que cualquiera puede verificar" (folio verificable)
       referidos     "Comparte tu enlace... cuando tus amigos se unan y confirmen su correo, ganas cursos antes de tiempo"
       perfil        "Editar nombre" y "como aparecerá en certificados" (club-perfil.html)
       suscripcion   "Cancela cuando quieras" (club-suscripcion.html)
       canal         "Novedades oficiales de Zoorigen directo en tu teléfono"
     Quitados o cambiados por no poder comprobarse: "Lleva tus guías contigo"; "Calcula con respaldo y fuente" (la página es de
     referencia, no una calculadora de dosis); "Diluciones sin prisa y sin errores" (no se puede prometer cero errores);
     "Registra cada ingreso y movimiento" (la página habla de nacimientos, bajas y traslados); "Cada acierto suma XP" (suma el reto
     superado); "Comparte tu código" (la página habla de enlace); "Entérate primero" (no hay garantía de orden); "Únete al canal de
     WhatsApp" (hoy el botón abre el chat de Zoorigen para pedir entrada); "Lo anotado hoy te ahorra problemas" y "Es material de
     apoyo: valida con tu criterio" (la página de herramientas dice que no sustituye el criterio del veterinario). */
  var MENSAJE_MAX = 56;
  var MENSAJES = {
    cursos:       ['¿Qué aprenderemos hoy?', 'Una clase a la vez, a tu ritmo.', 'Al terminar cada clase hay un juego.'],
    pdfs:         ['Guías y plantillas para descargar.', 'Aquí están tus libros, guías y plantillas.', 'Los libros se desbloquean con retos.'],
    herramientas: ['Cada dato trae el enlace a su fuente.', 'Revisa siempre la fuente.', 'No sustituye el criterio del veterinario.'],
    infusiones:   ['Tú escribes la dosis y yo hago la aritmética.', 'Te muestro la fórmula con tus números.', 'Revisa las unidades antes de calcular.'],
    legal:        ['La norma vigente manda.', 'Consulta siempre el texto oficial.', 'Esto es material de apoyo, no asesoría legal.'],
    registro:     ['Anota nacimientos, bajas y traslados.', 'Tu inventario se arma con lo que anotas.', 'También armo el borrador de tu informe anual.'],
    sesiones:     ['Muy pronto, clases en vivo.', 'Estamos preparando todo.'],
    videos:       ['¡Luces, cámara, aprende!', 'Elige un video y dale play.', 'Técnicas de campo, paso a paso.'],
    foro:         ['¿Qué quieres preguntar?', 'Aquí se aprende conversando.', 'Conecta con colegas de toda Latinoamérica.'],
    directorio:   ['Conoce a la manada.', 'Tu tarjeta ayuda a que te encuentren.'],
    retos:        ['¿Aceptas el reto?', 'Cada reto superado suma XP.', 'Los retos superados abren libros.'],
    logros:       ['¡Cada paso cuenta!', 'Mira lo que has logrado.', 'Tus premios abren cursos antes de tiempo.'],
    certificados: ['Tu esfuerzo, certificado.', 'Cualquiera puede verificar tu folio.'],
    referidos:    ['Invita y gana cursos antes.', 'Comparte tu enlace de invitación.', 'Tus amigos deben confirmar su correo.'],
    perfil:       ['Puedes editar tu nombre aquí.', 'Tu nombre saldrá en tu certificado.'],
    suscripcion:  ['Elige tu plan.', 'Puedes cancelar cuando quieras.'],
    canal:        ['Novedades directo en tu teléfono.', 'Aquí está el canal oficial de Zoorigen.']
  };
  /* Webinars sin la bandera clasesEnVivoPronto (clases en vivo ya activas): lo que la página dice de ellos. */
  var MENSAJES_SESIONES_EN_VIVO = ['Masterclasses con especialistas invitados.', 'Se transmiten por Google Meet.'];

  /* Tiempos (ms). La burbuja aparece "aparicion" tras entrar la tarjeta; cada mensaje está "visible" en total (con "fundido" al
     entrar y al salir) y entre mensajes hay una "pausa". El parpadeo cierra los ojos de cierreMin a cierreMax; 1 de cada dobleCada es doble. */
  var TIEMPOS = {
    aparicion: 1200, visible: 5500, fundido: 500, pausa: 2000,
    hablaMs: 1400, hablaIntervalo: 220,
    parpadeoMin: 3000, parpadeoMax: 6500, cierreMin: 130, cierreMax: 160, dobleCada: 5, entreDoble: 90
  };

  /* CUADROS EXTRA DE CADA PERSONAJE (ojos cerrados y gesto con la boca abierta).
     Manifiesto { 'seccion-cursos': ['ojos', 'gesto'], ... }: por defecto VACÍO, así no hay 404 mientras no existan los archivos.
     Cuando lleguen las imágenes (assets/img/guia/secciones/<personaje>-ojos.webp y <personaje>-gesto.webp), declara aquí el
     personaje. tests/club-personaje-anim.test.js falla si se declara un archivo que no existe. */
  var FRAMES = {};
  var FRAMES_VALIDOS = ['ojos', 'gesto'];

  function aleatorio(rand) {
    var r = typeof rand === 'number' && isFinite(rand) ? rand : Math.random();
    return r < 0 ? 0 : (r >= 1 ? 0.999999 : r);
  }
  /* Lista de mensajes del apartado (copia). Clave o alias; con "pronto" === false, Webinars usa los mensajes de clases en vivo. */
  function mensajesDe(clave, pronto) {
    var k = claveDeco(clave);
    if (!k) return [];
    if (k === 'sesiones' && pronto === false) return MENSAJES_SESIONES_EN_VIVO.slice();
    return (MENSAJES[k] || []).slice();
  }
  /* Índice del siguiente mensaje (vuelve al primero al terminar). */
  function ciclarMensaje(indice, total) {
    var n = Math.floor(Number(total));
    if (!(n > 1)) return 0;
    var i = Math.floor(Number(indice));
    if (!isFinite(i) || i < 0) return 0;
    return (i + 1) % n;
  }
  /* Espera (ms) hasta el próximo parpadeo: aleatoria entre parpadeoMin y parpadeoMax. rand en [0, 1). */
  function siguienteParpadeo(rand) {
    return Math.round(TIEMPOS.parpadeoMin + aleatorio(rand) * (TIEMPOS.parpadeoMax - TIEMPOS.parpadeoMin));
  }
  /* Cuánto dura el ojo cerrado (ms). */
  function duracionParpadeo(rand) {
    return Math.round(TIEMPOS.cierreMin + aleatorio(rand) * (TIEMPOS.cierreMax - TIEMPOS.cierreMin));
  }
  /* ¿Este parpadeo es doble? (1 de cada dobleCada) */
  function esDobleParpadeo(rand) { return aleatorio(rand) < 1 / TIEMPOS.dobleCada; }
  /* Cuadros del habla: alterna 'gesto' y 'base' cada intervaloMs durante ~duracionMs y SIEMPRE termina en 'base'. */
  function secuenciaHabla(duracionMs, intervaloMs) {
    var d = Number(duracionMs), i = Number(intervaloMs);
    if (!(d > 0) || !(i > 0)) return ['base'];
    var pares = Math.max(1, Math.round(d / i / 2));
    var seq = [];
    for (var n = 0; n < pares; n++) { seq.push('gesto'); seq.push('base'); }
    return seq;
  }
  /* Cuadros extra declarados para el personaje en el manifiesto (solo 'ojos' y 'gesto', sin repetir). */
  function framesDisponibles(personaje, manifiesto) {
    var m = manifiesto;
    if (!m || typeof m !== 'object' || !personaje || !Object.prototype.hasOwnProperty.call(m, personaje)) return [];
    var lista = Array.isArray(m[personaje]) ? m[personaje] : [];
    return FRAMES_VALIDOS.filter(function (f) { return lista.indexOf(f) !== -1; });
  }
  /* Ruta del cuadro a partir de la de la imagen base: .../seccion-cursos.webp -> .../seccion-cursos-ojos.webp */
  function rutaFrame(rutaBase, frame) {
    var r = String(rutaBase == null ? '' : rutaBase);
    var f = String(frame == null ? '' : frame).replace(/[^a-z0-9-]/gi, '');
    if (!r || !f) return '';
    return r.replace(/(\.[a-z0-9]+)(\?.*)?$/i, '-' + f + '$1$2');
  }

  function iconoSVG(nombre) {
    var d = trazo(nombre);
    if (!d) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  }
  function decorHTML(dec) {
    var s = '';
    var n = 0;
    (dec.iconos || []).slice(0, 8).forEach(function (nombre) {
      var svg = iconoSVG(nombre);
      if (!svg) return;
      n++;
      s += '<span class="zs-deco__i zs-deco__i--' + n + '">' + svg + '</span>';
    });
    return s ? '<div class="zs-deco" aria-hidden="true">' + s + '</div>' : '';
  }
  /* Burbuja de diálogo: decorativa (aria-hidden), nunca lleva información única. Trae ya el primer mensaje: sin movimiento
     (o sin script) es el que se queda fijo. El motor del navegador lo rota. */
  function burbujaHTML(clave, pronto) {
    var m = mensajesDe(clave, pronto);
    if (!m.length) return '';
    return '<div class="zs-burbuja" aria-hidden="true"><span class="zs-burbuja__txt">' + esc(m[0]) + '</span></div>';
  }
  function personajeHTML(dec, base, clave, pronto) {
    return '<div class="zs-personaje" aria-hidden="true" data-personaje="' + esc(dec.personaje) + '">' +
      '<span class="zs-personaje__halo"></span>' +
      '<img class="zs-personaje__img" src="' + esc(rutaPersonaje(dec.personaje, base)) + '" alt="" width="240" height="240" loading="eager" fetchpriority="high" decoding="async">' +
      burbujaHTML(clave, pronto) +
      '</div>';
  }

  function pildora(cfg) {
    return cfg.eyebrow ? '<span class="zs-seccion__pildora">' + ico(cfg.icono) + '<span>' + esc(cfg.eyebrow) + '</span></span>' : '';
  }
  /* Píldora del apartado; con cfg.pronto lleva a su lado la etiqueta "Próximamente" con reloj de arena. */
  function marcas(cfg) {
    if (!cfg.pronto) return pildora(cfg);
    return '<div class="zs-seccion__marcas">' + pildora(cfg) +
      '<span class="zs-seccion__pronto">' + ico('hourglass') + '<span>Próximamente</span></span></div>';
  }

  /* Firma corta (djb2) de la configuración de la tarjeta. La página puede traer la tarjeta ya escrita en su HTML (para que
     exista desde el primer pintado); montar() compara firmas y, si coinciden, la conserva en vez de volver a pintarla. */
  function firmaCfg(cfg) {
    var t = '';
    try { t = JSON.stringify(cfg || {}); } catch (e) { t = ''; }
    var h = 5381;
    for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* cfg: { id, seccion, icono, eyebrow, titulo, acento, sub, cifras:[{id, clave, valor, rotulo}],
            segmentos:{ etiqueta, activo, opciones:[{id, etiqueta}] }, acciones:[{href, id, etiqueta, icono, tono}],
            pronto: true (etiqueta "Próximamente" y personaje más lento), decoracion: false (sin capa ni personaje),
            base: '../' (prefijo de las imágenes) } */
  function html(cfg) {
    cfg = cfg || {};
    var titulo = esc(cfg.titulo || '');
    var acento = cfg.acento ? '<span class="zs-acento">' + esc(cfg.acento) + '</span>' : '';
    var dec = cfg.decoracion === false ? null : decoracionDe(cfg.seccion);
    var cifras = Array.isArray(cfg.cifras) ? cfg.cifras : [];
    var pintaPj = !!dec && debePintarPersonaje(dec, noDispSet);
    var clases = 'zs-seccion';
    var attrs = '';
    if (dec) {
      clases += ' zs-seccion--deco' + (pintaPj ? ' zs-seccion--con-personaje' : '') + (cifras.length ? '' : ' zs-seccion--sin-cifras');
      attrs = ' data-anim="' + esc(dec.animacion) + '" data-deco="' + esc(dec.deco) + '" data-acento="' + esc(dec.acento) + '"' + (cfg.pronto ? ' data-pronto="1"' : '');
    }
    var h = '<header class="' + clases + '"' + (cfg.id ? ' id="' + idSeguro(cfg.id) + '"' : '') + ' data-seccion="' + idSeguro(cfg.seccion || cfg.id || '') + '"' + attrs + ' data-zs-firma="' + firmaCfg(cfg) + '">' +
      (dec ? decorHTML(dec) + (pintaPj ? personajeHTML(dec, cfg.base, claveDeco(cfg.seccion), cfg.pronto === true) : '') : '') +
      '<div class="zs-seccion__cuerpo"><div class="zs-seccion__texto">' +
      marcas(cfg) +
      '<h1 class="zs-seccion__titulo">' + titulo + (titulo && acento ? ' ' : '') + acento + '</h1>' +
      (cfg.sub ? '<p class="zs-seccion__sub">' + esc(cfg.sub) + '</p>' : '') +
      '</div>';
    var lado = '';
    var seg = cfg.segmentos;
    if (seg && Array.isArray(seg.opciones) && seg.opciones.length) {
      lado += '<div class="zs-segmentos" role="group" aria-label="' + esc(seg.etiqueta || 'Filtrar') + '">' + seg.opciones.map(function (o) {
        return '<button type="button" class="zs-segmento" data-segmento="' + esc(o.id) + '" aria-pressed="' + (o.id === seg.activo ? 'true' : 'false') + '">' + esc(o.etiqueta) + '</button>';
      }).join('') + '</div>';
    }
    (cfg.acciones || []).forEach(function (a) {
      var clase = 'zs-seccion__btn' + (a.tono === 'oro' ? ' zs-seccion__btn--oro' : '');
      var idA = a.id ? ' id="' + idSeguro(a.id) + '"' : '';
      lado += a.href
        ? '<a class="' + clase + '"' + idA + ' href="' + esc(a.href) + '"' + (a.externo ? ' target="_blank" rel="noopener"' : '') + '>' + ico(a.icono) + esc(a.etiqueta) + '</a>'
        : '<button type="button" class="' + clase + '"' + idA + '>' + ico(a.icono) + esc(a.etiqueta) + '</button>';
    });
    if (lado) h += '<div class="zs-seccion__lado">' + lado + '</div>';
    h += '</div>';
    if (cifras.length) {
      h += '<div class="zs-seccion__cifras" role="list">' + cifras.map(function (c) {
        return '<div class="zs-cifra" role="listitem"><strong class="zs-cifra__v"' + (c.id ? ' id="' + idSeguro(c.id) + '"' : '') +
          ' data-cifra="' + idSeguro(c.clave || c.id || '') + '">' + esc(c.valor == null ? '—' : c.valor) +
          /* c.ancho: texto típico del valor que llegará; reserva su ancho (sin alto ni a la vista) para que la tarjeta no cambie de forma al llegar */
          /* c.anchoLibre: lo mismo para quien no es miembro (el CSS muestra una u otra según <html data-plan>) */
          (c.ancho ? '<span class="zs-cifra__res' + (c.anchoLibre ? ' zs-cifra__res--vip' : '') + '" aria-hidden="true">' + esc(c.ancho) + '</span>' : '') +
          (c.anchoLibre ? '<span class="zs-cifra__res zs-cifra__res--libre" aria-hidden="true">' + esc(c.anchoLibre) + '</span>' : '') + '</strong>' +
          '<span class="zs-cifra__r">' + esc(c.rotulo || '') + '</span></div>';
      }).join('') + '</div>';
    }
    return h + '</header>';
  }

  /* Bloque "Próximamente" (sin cuenta regresiva ni enlaces). */
  function prontoHTML(o) {
    o = o || {};
    return '<section class="zs-pronto" aria-live="polite"><span class="zs-pronto__ico">' + ico(o.icono || 'radio') + '</span>' +
      '<span class="zs-pronto__chip">Próximamente</span>' +
      '<h2 class="zs-pronto__titulo">' + esc(o.titulo || 'Muy pronto tendrás clases en vivo') + '</h2>' +
      '<p class="zs-pronto__texto">' + esc(o.texto || 'Estamos preparando las transmisiones en vivo con especialistas. Cuando estén listas aparecerán aquí.') + '</p></section>';
  }

  var API = {
    esc: esc, html: html, prontoHTML: prontoHTML, firmaCfg: firmaCfg,
    DECORACION: DECORACION, ALIAS: ALIAS, ANIMACIONES: ANIMACIONES, ANIMACIONES_DECOR: ANIMACIONES_DECOR, ACENTOS: ACENTOS,
    ICONOS_DECOR: ICONOS_DECOR, RUTA_PERSONAJES: RUTA_PERSONAJES, EXT_PERSONAJE: EXT_PERSONAJE,
    claveDeco: claveDeco, claveApartado: claveApartado, decoracionDe: decoracionDe, trazo: trazo, rutaPersonaje: rutaPersonaje, debePintarPersonaje: debePintarPersonaje,
    MENSAJES: MENSAJES, MENSAJES_SESIONES_EN_VIVO: MENSAJES_SESIONES_EN_VIVO, MENSAJE_MAX: MENSAJE_MAX, TIEMPOS: TIEMPOS,
    FRAMES: FRAMES, FRAMES_VALIDOS: FRAMES_VALIDOS,
    mensajesDe: mensajesDe, ciclarMensaje: ciclarMensaje, siguienteParpadeo: siguienteParpadeo, duracionParpadeo: duracionParpadeo,
    esDobleParpadeo: esDobleParpadeo, secuenciaHabla: secuenciaHabla, framesDisponibles: framesDisponibles, rutaFrame: rutaFrame
  };
  if (typeof document === 'undefined') return API;

  /* ------------------------------------------------------------ */
  /* NAVEGADOR: respaldo sin imagen y pausa de la animación         */
  /* ------------------------------------------------------------ */
  var estado = { pestanaVisible: !document.hidden };
  var io = null;
  try {
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { e.target.__zsVisible = e.isIntersecting; pausar(e.target); });
      }, { threshold: 0.02 });
    }
  } catch (e) { io = null; }

  function pausar(tarjeta) {
    var visible = tarjeta.__zsVisible !== false;
    tarjeta.classList.toggle('is-pausa', !visible || !estado.pestanaVisible);
    sincronizarMotor(tarjeta);
  }
  function tarjetas() { return document.querySelectorAll('.zs-seccion--deco'); }

  /* ------------------------------------------------------------ */
  /* MOTOR DE LA BURBUJA Y DE LOS CUADROS (un solo temporizador     */
  /* por tarjeta, encadenado con setTimeout)                        */
  /* ------------------------------------------------------------ */
  var mqReducir = null;
  try { if (typeof window.matchMedia === 'function') mqReducir = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { mqReducir = null; }
  function movimientoReducido() { return !!(mqReducir && mqReducir.matches); }
  function ahora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  /* Estado de una tarjeta (se crea una vez): caja del personaje, imagen, burbuja, mensajes y cuadros precargados. */
  function estadoMotor(t) {
    if (t.__zsAnim) return t.__zsAnim;
    var caja = t.querySelector('.zs-personaje');
    var img = caja && caja.querySelector('.zs-personaje__img');
    if (!caja || !img) return null;
    var pronto = t.hasAttribute('data-pronto');
    var st = {
      tarjeta: t, caja: caja, img: img,
      burbuja: caja.querySelector('.zs-burbuja'), txt: caja.querySelector('.zs-burbuja__txt'),
      personaje: caja.getAttribute('data-personaje') || '',
      mensajes: mensajesDe(t.getAttribute('data-seccion'), pronto),
      indice: 0, activo: false, timer: 0, eventos: [],
      srcBase: img.getAttribute('src') || '', cuadros: {}, refs: {}, precargado: false, hablando: false, cuadro: 'base'
    };
    caja.setAttribute('data-cuadro', 'base');
    t.__zsAnim = st;
    return st;
  }

  /* Un solo temporizador por tarjeta: los eventos se guardan con su hora y el timer apunta al más próximo. */
  function rearmar(st) {
    if (st.timer) { clearTimeout(st.timer); st.timer = 0; }
    if (!st.activo || !st.eventos.length) return;
    var prox = st.eventos[0].en;
    for (var i = 1; i < st.eventos.length; i++) if (st.eventos[i].en < prox) prox = st.eventos[i].en;
    st.timer = setTimeout(function () { st.timer = 0; correr(st); }, Math.max(0, prox - ahora()));
  }
  function agendar(st, ms, fn, tipo) {
    if (!st.activo) return;
    st.eventos.push({ en: ahora() + ms, fn: fn, tipo: tipo || '' });
    rearmar(st);
  }
  function cancelar(st, tipo) {
    st.eventos = st.eventos.filter(function (e) { return e.tipo !== tipo; });
  }
  function correr(st) {
    if (!st.activo) return;
    if (!st.tarjeta.isConnected) { detenerMotor(st); return; }   // la página volvió a pintar la tarjeta: este estado ya no sirve
    var limite = ahora() + 3;
    var listos = st.eventos.filter(function (e) { return e.en <= limite; }).sort(function (a, b) { return a.en - b.en; });
    st.eventos = st.eventos.filter(function (e) { return e.en > limite; });
    listos.forEach(function (e) { try { e.fn(); } catch (err) { /* un cuadro fallido no detiene el resto */ } });
    rearmar(st);
  }

  /* Cuadro visible: 'base' | 'ojos' | 'gesto'. Solo cambia a uno ya decodificado (si no, se queda en la base). */
  function ponerCuadro(st, nombre) {
    var src = nombre === 'base' ? st.srcBase : st.cuadros[nombre];
    if (!src) { nombre = 'base'; src = st.srcBase; }
    if (st.cuadro === nombre) return;
    st.cuadro = nombre;
    st.caja.setAttribute('data-cuadro', nombre);
    if (src && st.img.getAttribute('src') !== src) st.img.setAttribute('src', src);
  }

  /* Precarga y decodifica los cuadros declarados; los que fallan se ignoran sin ruido. */
  function precargar(st) {
    if (st.precargado) return;
    st.precargado = true;
    framesDisponibles(st.personaje, API.FRAMES).forEach(function (nombre) {
      var url = rutaFrame(st.srcBase, nombre);
      if (!url) return;
      try {
        var im = new Image();
        im.decoding = 'async';
        im.src = url;
        st.refs[nombre] = im;   // la referencia mantiene la imagen decodificada en memoria
        var listo = function () { st.cuadros[nombre] = url; };
        if (typeof im.decode === 'function') im.decode().then(listo, function () { delete st.refs[nombre]; });
        else { im.onload = listo; im.onerror = function () { delete st.refs[nombre]; }; }
      } catch (e) { delete st.refs[nombre]; }
    });
  }

  function declarados(st) { return framesDisponibles(st.personaje, API.FRAMES); }

  /* ¿Cabe la burbuja sin tapar texto ni salirse de la tarjeta? Primero encima de la cabeza del personaje; si no cabe (tarjetas
     bajas), a su izquierda; y si tampoco, se oculta (is-sin-sitio). */
  function rectsDeTexto(t) {
    var r = [];
    var sel = '.zs-seccion__pildora, .zs-seccion__pronto, .zs-seccion__titulo, .zs-seccion__sub, .zs-segmentos, .zs-seccion__btn, .zs-cifra';
    Array.prototype.forEach.call(t.querySelectorAll(sel), function (n) {
      var esTexto = n.classList.contains('zs-seccion__titulo') || n.classList.contains('zs-seccion__sub');
      if (esTexto && document.createRange) {
        var rg = document.createRange();
        rg.selectNodeContents(n);
        Array.prototype.forEach.call(rg.getClientRects(), function (c) { if (c.width > 0 && c.height > 0) r.push(c); });
      } else {
        var c2 = n.getBoundingClientRect();
        if (c2.width > 0 && c2.height > 0) r.push(c2);
      }
    });
    return r;
  }
  function cabe(st, textos) {
    var rb = st.burbuja.getBoundingClientRect();
    if (!rb.width || !rb.height) return false;
    var rt = st.tarjeta.getBoundingClientRect();
    var margen = 4;
    if (rb.left < rt.left + 2 || rb.top < rt.top + 2 || rb.right > rt.right - 2 || rb.bottom > rt.bottom - 2) return false;
    for (var i = 0; i < textos.length; i++) {
      var c = textos[i];
      if (!(c.right + margen <= rb.left || c.left - margen >= rb.right || c.bottom + margen <= rb.top || c.top - margen >= rb.bottom)) return false;
    }
    return true;
  }
  function evaluarSitio(st) {
    var b = st.burbuja;
    if (!b) return;
    var VARIANTES = ['zs-burbuja--izq', 'zs-burbuja--estrecha'];
    b.classList.remove('is-sin-sitio', VARIANTES[0], VARIANTES[1]);
    if (getComputedStyle(st.caja).display === 'none') { b.classList.add('is-sin-sitio'); return; }
    var textos = rectsDeTexto(st.tarjeta);
    if (cabe(st, textos)) return;
    var angosto = false;
    try { angosto = window.matchMedia('(max-width: 640px)').matches; } catch (e) { angosto = false; }
    // Pantallas medianas: a la izquierda de la cabeza. Celular: más estrecha (más líneas), siempre encima del personaje.
    var variante = angosto ? VARIANTES[1] : VARIANTES[0];
    b.classList.add(variante);
    if (cabe(st, textos)) return;
    b.classList.remove(variante);
    b.classList.add('is-sin-sitio');
  }

  /* Con "reducir movimiento" no rota: queda fijo el primer mensaje que quepa (normalmente el primero). */
  function ajustarFijo(st) {
    if (!st.burbuja || !st.txt || !st.mensajes.length) return;
    for (var i = 0; i < st.mensajes.length; i++) {
      st.txt.textContent = st.mensajes[i];
      evaluarSitio(st);
      if (!st.burbuja.classList.contains('is-sin-sitio')) return;
    }
    st.txt.textContent = st.mensajes[0];
    evaluarSitio(st);
  }

  /* Habla: alterna base y gesto durante ~1.4 s y vuelve a la base (solo si el cuadro de gesto está listo). */
  function hablar(st) {
    cancelar(st, 'habla');
    cancelar(st, 'parpadeo');
    st.hablando = false;
    if (!st.cuadros.gesto) { ponerCuadro(st, 'base'); programarParpadeo(st); return; }
    var seq = secuenciaHabla(TIEMPOS.hablaMs, TIEMPOS.hablaIntervalo);
    st.hablando = true;
    seq.forEach(function (c, i) {
      var fn = function () { ponerCuadro(st, c === 'gesto' ? 'gesto' : 'base'); };
      if (i === 0) fn(); else agendar(st, i * TIEMPOS.hablaIntervalo, fn, 'habla');
    });
    agendar(st, seq.length * TIEMPOS.hablaIntervalo, function () {
      st.hablando = false;
      ponerCuadro(st, 'base');
      programarParpadeo(st);
    }, 'habla');
  }

  /* Parpadeo: cada 3 a 6.5 s cierra los ojos 130-160 ms; 1 de cada 5 es doble. */
  function programarParpadeo(st) {
    if (!declarados(st).length) return;
    cancelar(st, 'parpadeo');
    agendar(st, siguienteParpadeo(Math.random()), function () { parpadear(st); }, 'parpadeo');
  }
  function parpadear(st) {
    if (!st.cuadros.ojos || st.hablando) { programarParpadeo(st); return; }
    ponerCuadro(st, 'ojos');
    agendar(st, duracionParpadeo(Math.random()), function () {
      ponerCuadro(st, 'base');
      if (esDobleParpadeo(Math.random())) {
        agendar(st, TIEMPOS.entreDoble, function () {
          if (st.hablando) { programarParpadeo(st); return; }
          ponerCuadro(st, 'ojos');
          agendar(st, duracionParpadeo(Math.random()), function () { ponerCuadro(st, 'base'); programarParpadeo(st); }, 'parpadeo');
        }, 'parpadeo');
      } else programarParpadeo(st);
    }, 'parpadeo');
  }

  /* Mensaje: aparece (fundido), se queda y se va (fundido); tras la pausa sigue el siguiente. */
  function mostrarMensaje(st) {
    if (!st.activo || !st.burbuja || !st.mensajes.length) return;
    cancelar(st, 'msg');
    st.txt.textContent = st.mensajes[st.indice % st.mensajes.length];
    evaluarSitio(st);
    st.burbuja.classList.add('is-visible');
    hablar(st);
    agendar(st, Math.max(0, TIEMPOS.visible - TIEMPOS.fundido), function () {
      st.burbuja.classList.remove('is-visible');
      agendar(st, TIEMPOS.fundido + TIEMPOS.pausa, function () {
        st.indice = ciclarMensaje(st.indice, st.mensajes.length);
        mostrarMensaje(st);
      }, 'msg');
    }, 'msg');
  }

  function iniciarMotor(st) {
    if (st.activo) return;
    st.activo = true;
    st.eventos = [];
    precargar(st);
    programarParpadeo(st);
    if (st.burbuja && st.mensajes.length) agendar(st, TIEMPOS.aparicion, function () { mostrarMensaje(st); }, 'msg');
  }
  function detenerMotor(st) {
    if (st.timer) { clearTimeout(st.timer); st.timer = 0; }
    st.eventos = [];
    st.activo = false;
    st.hablando = false;
    if (st.burbuja) st.burbuja.classList.remove('is-visible');
    try { ponerCuadro(st, 'base'); } catch (e) { /* imagen ya quitada */ }
  }
  /* Arranca o detiene según la tarjeta esté a la vista y el movimiento esté permitido. */
  function sincronizarMotor(t) {
    var st = t.__zsAnim;
    if (!st) return;
    var debeCorrer = !t.classList.contains('is-pausa') && !movimientoReducido() && t.isConnected;
    if (debeCorrer) iniciarMotor(st); else if (st.activo) detenerMotor(st);
  }

  /* Tocar o hacer clic en el personaje: siguiente mensaje de inmediato (sin interferir con enlaces ni botones). */
  function siguienteAhora(st) {
    if (!st.activo || !st.burbuja || !st.mensajes.length) return;
    cancelar(st, 'msg');
    st.indice = ciclarMensaje(st.indice, st.mensajes.length);
    mostrarMensaje(st);
  }
  document.addEventListener('click', function (e) {
    var n = e.target;
    if (!n || !n.closest) return;
    if (n.closest('a, button, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]')) return;
    var t = n.closest('.zs-seccion--deco');
    var st = t && t.__zsAnim;
    if (!st || !st.activo || !st.caja.isConnected) return;
    var r = st.caja.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) siguienteAhora(st);
  });
  // Cambia el tamaño o el ajuste de movimiento: se vuelve a medir el sitio y se arranca o detiene.
  var temporizadorTamano = 0;
  window.addEventListener('resize', function () {
    if (temporizadorTamano) clearTimeout(temporizadorTamano);
    temporizadorTamano = setTimeout(function () {
      temporizadorTamano = 0;
      Array.prototype.forEach.call(tarjetas(), function (t) {
        var st = t.__zsAnim;
        if (st) { if (movimientoReducido()) ajustarFijo(st); else evaluarSitio(st); }
      });
    }, 150);
  });
  window.addEventListener('load', function () {
    Array.prototype.forEach.call(tarjetas(), function (t) {
      var st = t.__zsAnim;
      if (st) { if (movimientoReducido()) ajustarFijo(st); else evaluarSitio(st); }
    });
  });
  try {
    if (mqReducir) {
      var alCambiarMovimiento = function () { Array.prototype.forEach.call(tarjetas(), sincronizarMotor); };
      if (typeof mqReducir.addEventListener === 'function') mqReducir.addEventListener('change', alCambiarMovimiento);
      else if (typeof mqReducir.addListener === 'function') mqReducir.addListener(alCambiarMovimiento);
    }
  } catch (e) { /* sin matchMedia */ }

  /* Quita el personaje (imagen que no existe o no carga) sin dejar hueco ni ícono roto. */
  function quitarPersonaje(img) {
    var caja = img.closest ? img.closest('.zs-personaje') : img.parentNode;
    var tarjeta = img.closest ? img.closest('.zs-seccion') : null;
    var archivo = caja && caja.getAttribute('data-personaje');
    if (tarjeta && tarjeta.__zsAnim) { detenerMotor(tarjeta.__zsAnim); tarjeta.__zsAnim = null; }
    if (archivo) NO_DISPONIBLES[archivo] = true;
    if (caja && caja.parentNode) caja.parentNode.removeChild(caja);
    else if (img.parentNode) img.parentNode.removeChild(img);
    if (tarjeta) tarjeta.classList.remove('zs-seccion--con-personaje');
  }

  /* Prepara las tarjetas nuevas: observa su visibilidad y revisa imágenes que ya fallaron. */
  function activar(raiz) {
    var lista = (raiz && raiz.querySelectorAll ? raiz : document).querySelectorAll('.zs-seccion--deco');
    Array.prototype.forEach.call(lista, function (t) {
      var img = t.querySelector('.zs-personaje__img');
      if (img && img.complete && img.naturalWidth === 0 && img.getAttribute('src')) quitarPersonaje(img);
      if (t.__zsVivo) return;
      t.__zsVivo = true;
      t.__zsVisible = true;
      var st = estadoMotor(t);
      // Con "reducir movimiento" la burbuja queda fija con el primer mensaje: solo se revisa que quepa.
      if (st && movimientoReducido()) {
        var medir = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : function (f) { return setTimeout(f, 16); };
        medir(function () { ajustarFijo(st); });
      }
      if (io) io.observe(t);
      pausar(t);
    });
  }

  // error no burbujea: se escucha en la fase de captura, una sola vez para toda la página.
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.classList && t.classList.contains('zs-personaje__img')) quitarPersonaje(t);
  }, true);
  document.addEventListener('visibilitychange', function () {
    estado.pestanaVisible = !document.hidden;
    Array.prototype.forEach.call(tarjetas(), pausar);
  });
  // Tarjetas que otro script arma con html() y asigna con innerHTML (p. ej. PDFs y materiales).
  try {
    if (typeof MutationObserver === 'function') {
      var pendiente = false;
      new MutationObserver(function () {
        if (pendiente) return;
        pendiente = true;
        var luego = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : function (f) { return setTimeout(f, 16); };
        luego(function () { pendiente = false; activar(document); });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) { /* sin MutationObserver: montar() activa por su cuenta */ }

  /* destino: selector o elemento; reemplaza su contenido y devuelve la tarjeta */
  API.montar = function (destino, cfg) {
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (!el) return null;
    /* Si el HTML de la página ya trae esta misma tarjeta (misma firma) se conserva tal cual: no se vuelve a pintar, así que no
       parpadea ni se recarga el personaje. Con otra configuración (p. ej. Webinars con "Pronto" distinto) se pinta de nuevo. */
    var previa = el.firstElementChild;
    var firma = firmaCfg(cfg);
    if (!(previa && previa.classList && previa.classList.contains('zs-seccion') && previa.getAttribute('data-zs-firma') === firma)) el.innerHTML = html(cfg);
    /* respaldo: la página ya trae <body data-zoo>; si no, se pone aquí para que tome el color de su apartado */
    try {
      var clave = claveApartado(cfg && cfg.seccion);
      if (clave && document.body && !document.body.hasAttribute('data-zoo')) document.body.setAttribute('data-zoo', clave);
    } catch (e) { /* sin body */ }
    activar(el);
    return el.firstElementChild;
  };
  API.activar = activar;

  /* Actualiza cifras por su clave (data-cifra) o por id: { cursos: 13, clases: 51 } */
  API.cifras = function (valores, raiz) {
    var base = raiz || document;
    Object.keys(valores || {}).forEach(function (k) {
      var n = base.querySelector('[data-cifra="' + idSeguro(k) + '"]') || base.querySelector('#' + idSeguro(k));
      if (n) n.textContent = String(valores[k]);
    });
  };

  /* Conecta el control segmentado: alCambiar(idOpcion). Devuelve { fijar(id) }. */
  API.segmentos = function (alCambiar, raiz) {
    var base = raiz || document;
    var cont = base.querySelector('.zs-segmentos');
    if (!cont) return { fijar: function () {} };
    function fijar(id, avisar) {
      Array.prototype.forEach.call(cont.querySelectorAll('.zs-segmento'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-segmento') === id ? 'true' : 'false');
      });
      if (avisar && typeof alCambiar === 'function') alCambiar(id);
    }
    cont.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.zs-segmento');
      if (b) fijar(b.getAttribute('data-segmento'), true);
    });
    return { fijar: function (id) { fijar(id, false); } };
  };

  return API;
});
