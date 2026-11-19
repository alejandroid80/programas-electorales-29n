/* ===================================================================
   Cargador unico de los datos de las encuestas.

   Las dos secciones que los usan (la de intencion de voto y el
   pactometro) comparten la misma peticion: se pide una vez y se
   reutiliza. Si la peticion falla, cada seccion lo dice por su cuenta.
   =================================================================== */
(function () {
  'use strict';

  var promesa = null;

  window.DATOS_VOTO = {
    get: function () {
      if (!promesa) {
        promesa = fetch('data/voting-intention.json?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .catch(function (e) {
            promesa = null;   // se permite reintentar en la siguiente carga
            throw e;
          });
      }
      return promesa;
    }
  };
})();
