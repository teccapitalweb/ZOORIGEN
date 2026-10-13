/* ============================================================ */
/* CLUB VIP ZOORIGEN · CONFIGURACIÓN GLOBAL DEL PANEL            */
/* Un solo lugar para los interruptores que afectan a varias     */
/* pantallas. Cada interruptor se activa con un cambio de línea. */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONFIG = {
    /* Clases en vivo (webinars): mientras sea true, TODO el panel dice "Próximamente":
       la página de Webinars, el widget de próximo webinar, las cifras y la etiqueta del menú;
       no se muestra el aviso "Nuevo webinar agendado" ni se generan avisos de webinar.
       La lógica y los datos siguen intactos: para activar las clases en vivo, cambia a false. */
    clasesEnVivoPronto: true
  };

  CONFIG.enVivoPronto = function () { return CONFIG.clasesEnVivoPronto === true; };
  return CONFIG;
});
