/* =====================================================================
   CuenkArena — núcleo compartido
   Lo usan el servidor (Node) y el cliente (navegador):
   mapa, física de movimiento estilo Quake, disparos, proyectiles,
   ítems, reglas de deathmatch y bots.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CUENK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

