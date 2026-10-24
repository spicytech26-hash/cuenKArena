const MAPS = {};
for (const id in MAPDEFS) MAPS[id] = MAPDEFS[id]();
// "Probar en práctica" desde el editor: la página deja el mapa en self.CK_MAPA_EDITOR antes de cargar el juego
if (typeof self !== 'undefined' && self.CK_MAPA_EDITOR) {
  try { const d = self.CK_MAPA_EDITOR; MAPS[d.id] = mapFromData(d); if (!MAPS[d.id].modos) MAPS[d.id].modos = ['arena']; } catch (e) { if (typeof console !== 'undefined') console.warn('Mapa del editor con errores', e); }
}
// cada mapa dice en qué modos se juega (modos: [...]); los de siempre ya están en MODES
for (const id in MAPS) for (const m of MAPS[id].modos || []) if (MODES[m] && !MODES[m].maps.includes(id)) MODES[m].maps.push(id);
// ninguna aparición puede quedar dentro de un mueble o pared: si pasa, se sube encima o se descarta
function safeSpawns(W) {
  if (W._safe) return; W._safe = true;
  const fix = list => list.filter(sp => {
    for (let k = 0; k < 6 && solidAt(W, sp.x, sp.y + .02, sp.z, K.R, K.H); k++) {
      let top = sp.y;
      for (const b of W.brushes) if (!b.nc && !b.mover && overlapXZ(b, sp.x - K.R, sp.z - K.R, sp.x + K.R, sp.z + K.R) && b.min[1] < sp.y + K.H && b.max[1] > sp.y) top = Math.max(top, topAt(b, sp.x - K.R, sp.z - K.R, sp.x + K.R, sp.z + K.R));
      if (top - sp.y > 1.2) return false;
      sp.y = top;
    }
    return !solidAt(W, sp.x, sp.y + .02, sp.z, K.R, K.H);
  });
  W.spawns = fix(W.spawns);
  if (W.tspawns) W.tspawns = W.tspawns.map(fix);
}
const MAP_ALIAS = { sagrado: 'panymanteca', salvaje: 'panymanteca', pan: 'panymanteca', cuenca: 'lacuenca', ucp: 'lacuenca' }; // nombres viejos del boliche
const mapId = id => MAP_ALIAS[id] || id;
const MAP_IDS = Object.keys(MAPS);
const WORLD = MAPS.represa;

/* ---------- plataformas móviles: su posición depende solo del reloj de la partida ---------- */
function moverOff(m, t) {
  const u = clamp(.5 + .75 * Math.sin(2 * Math.PI * t / m.period + m.phase), 0, 1);
  return m.amp * u * u * (3 - 2 * u);
}
function updateMovers(W, t) {
  W.t = t;
  for (const b of W.movers) {
    const m = b.mover, o = moverOff(m, t);
    b.off = o;
    for (let k = 0; k < 3; k++) { b.min[k] = m.min0[k]; b.max[k] = m.max0[k]; }
    b.min[m.axis] += o; b.max[m.axis] += o;
  }
}

