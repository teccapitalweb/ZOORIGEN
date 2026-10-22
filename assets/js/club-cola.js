/* ============================================================ */
/* CLUB VIP ZOORIGEN · COLA ÚNICA DE VENTANAS                    */
/* Un solo overlay visible a la vez. Cada ventana que aparece    */
/* sola (bienvenida, nombre, recorrido, prueba gratuita, avisos, */
/* paywall) se "encola" con su tipo; la cola las muestra una a   */
/* una por prioridad y descarta las que ya no aplican.           */
/*                                                                */
/* Orden: bienvenida -> nombre -> premio -> recorrido -> prueba   */
/*        -> avisos del equipo -> paywall -> webinar -> otros      */
/*        -> créditos regalados (siempre al final).               */
/*                                                                */
/* retener(clave) pausa la cola mientras un módulo todavía está   */
/* decidiendo qué mostrará (así una ventana de menor prioridad no */
/* se adelanta); liberar(clave) la reanuda. Toda retención caduca */
/* sola (por defecto 12 s) para que nada deje el panel trabado.   */
/*                                                                */
/* La lógica no toca la pantalla y se prueba en Node:             */
/* tests/club-cola.test.js                                        */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_COLA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PRIORIDADES = {
    bienvenida: 10,
    nombre: 20,
    premio: 25,
    recorrido: 30,
    prueba: 40,
    avisos: 50,
    paywall: 60,
    webinar: 70,
    otro: 80,
    creditos: 90          // la felicitación por créditos regalados: sale cuando terminan todas las demás
  };

  var PAUSA_MS = 350;       // respiro entre una ventana y la siguiente
  var RETENCION_MS = 12000; // tope de una retención
  var OCUPADO_MS = 350;     // cada cuánto se revisa si hay una ventana ajena abierta

  function crear(opciones) {
    opciones = opciones || {};
    var pausaMs = opciones.pausaMs !== undefined ? opciones.pausaMs : PAUSA_MS;
    var ocupadoMs = opciones.ocupadoMs !== undefined ? opciones.ocupadoMs : OCUPADO_MS;
    var topeRetencion = opciones.retencionMs !== undefined ? opciones.retencionMs : RETENCION_MS;
    var estaOcupado = typeof opciones.ocupado === 'function' ? opciones.ocupado : null;  // ¿hay una ventana ajena a la cola abierta?
    var setT = opciones.setTimeout || setTimeout;
    var clearT = opciones.clearTimeout || clearTimeout;

    var pendientes = [];
    var retenciones = {};
    var corriendo = null;
    var contador = 0;
    var temporizador = null;
    var historial = [];

    function prioridadDe(item) {
      if (Number.isFinite(item.prioridad)) return item.prioridad;
      return Object.prototype.hasOwnProperty.call(PRIORIDADES, item.tipo) ? PRIORIDADES[item.tipo] : PRIORIDADES.otro;
    }

    function hayRetenciones() { return Object.keys(retenciones).length > 0; }

    function programar(ms) {
      if (temporizador) { clearT(temporizador); temporizador = null; }
      temporizador = setT(function () { temporizador = null; bombear(); }, ms);
    }

    function terminar(item, resultado) {
      var i = pendientes.indexOf(item);
      if (i !== -1) pendientes.splice(i, 1);
      historial.push({ id: item.id, tipo: item.tipo, estado: resultado.estado });
      item.resolver(resultado);
    }

    function bombear() {
      if (corriendo || hayRetenciones()) return;
      if (!pendientes.length) return;
      // Un solo recorrido por llamada: se descartan las que ya no aplican y se toma la primera por prioridad.
      var orden = pendientes.slice().sort(function (a, b) { return prioridadDe(a) - prioridadDe(b) || a.orden - b.orden; });
      var item = null;
      for (var k = 0; k < orden.length; k++) {
        var candidato = orden[k];
        var aplica = true;
        if (typeof candidato.vigente === 'function') { try { aplica = candidato.vigente() !== false; } catch (e) { aplica = false; } }
        if (!aplica) { terminar(candidato, { estado: 'descartado' }); continue; }
        item = candidato; break;
      }
      if (!item) return;
      if (estaOcupado && estaOcupado()) { programar(ocupadoMs); return; }
      corriendo = item;
      var salida;
      try { salida = Promise.resolve(item.mostrar()); } catch (e) { salida = Promise.reject(e); }
      salida.then(function (r) {
        corriendo = null;
        terminar(item, { estado: 'mostrado', resultado: r });
        if (r && r.detener && item.grupo) cancelarGrupo(item.grupo);
        programar(pausaMs);
      }, function (e) {
        corriendo = null;
        terminar(item, { estado: 'error', error: String((e && e.message) || e) });
        programar(pausaMs);
      });
    }

    /* item: { id, tipo, grupo?, prioridad?, vigente?: () => bool, mostrar: () => Promise|valor }
       Devuelve una promesa con { estado: 'mostrado' | 'descartado' | 'cancelado' | 'error', resultado? }. */
    function encolar(item) {
      if (!item || typeof item.mostrar !== 'function') return Promise.resolve({ estado: 'descartado' });
      return new Promise(function (resolver) {
        var it = { id: item.id || ('v' + (contador + 1)), tipo: item.tipo || 'otro', grupo: item.grupo || null, prioridad: item.prioridad,
          vigente: item.vigente, mostrar: item.mostrar, orden: ++contador, resolver: resolver };
        // Una ventana con el mismo id no se repite
        var repetida = pendientes.some(function (p) { return p.id === it.id; }) || (corriendo && corriendo.id === it.id);
        if (repetida) { resolver({ estado: 'descartado', motivo: 'repetida' }); return; }
        pendientes.push(it);
        programar(0);
      });
    }

    function cancelarGrupo(grupo) {
      pendientes.filter(function (p) { return p.grupo === grupo && p !== corriendo; }).forEach(function (p) { terminar(p, { estado: 'cancelado' }); });
    }

    function retener(clave, maxMs) {
      var k = String(clave);
      if (retenciones[k]) clearT(retenciones[k]);
      retenciones[k] = setT(function () { delete retenciones[k]; programar(0); }, maxMs > 0 ? maxMs : topeRetencion);
    }

    function liberar(clave) {
      var k = String(clave);
      if (!retenciones[k]) return;
      clearT(retenciones[k]);
      delete retenciones[k];
      programar(0);
    }

    function estado() {
      return {
        corriendo: corriendo ? corriendo.id : null,
        pendientes: pendientes.filter(function (p) { return p !== corriendo; }).sort(function (a, b) { return prioridadDe(a) - prioridadDe(b) || a.orden - b.orden; }).map(function (p) { return p.id; }),
        retenciones: Object.keys(retenciones),
        historial: historial.slice()
      };
    }

    return { encolar: encolar, cancelarGrupo: cancelarGrupo, retener: retener, liberar: liberar, estado: estado, PRIORIDADES: PRIORIDADES };
  }

  var API = { PRIORIDADES: PRIORIDADES, crear: crear };

  /* En el navegador hay una cola compartida por toda la página. */
  if (typeof document !== 'undefined') {
    var SELECTOR_AJENO = '#zoo-welcome-modal,#zoo-pay-waiting,.course-detail-modal,.webinar-popup-box,.zoo-guide-box';
    var unica = crear({
      ocupado: function () {
        // Pestaña oculta o una ventana ajena a la cola abierta: se espera.
        if (document.visibilityState === 'hidden') return true;
        return Array.prototype.some.call(document.querySelectorAll(SELECTOR_AJENO), function (el) {
          return !el.hasAttribute('data-zoo-cola') && el.getClientRects().length > 0;
        });
      }
    });
    API.encolar = unica.encolar;
    API.cancelarGrupo = unica.cancelarGrupo;
    API.retener = unica.retener;
    API.liberar = unica.liberar;
    API.estado = unica.estado;
  }

  return API;
});
