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

/* ---------- Constantes de física (1 unidad = 1 metro) ---------- */
const K = {
  GRAV: 25, JUMP: 8.4, MAXSPD: 10, ACC: 10, AIRACC: 10, AIRCAP: 0.94,
  FRIC: 6, STOP: 3, STEP: 0.55, R: 0.4, H: 1.8, EYE: 1.6, KILLY: -15,
  HC: 1.1, EYEC: 0.95, CROUCH_SPD: 0.5   // agachado: más bajo y más lento
};
const hOf = s => s.crouch ? K.HC : K.H;
const EPS = 1e-3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const r2 = v => Math.round(v * 100) / 100;
const r3a = a => [Math.round(a[0] * 1000) / 1000, Math.round(a[1] * 1000) / 1000, Math.round(a[2] * 1000) / 1000];

/* ---------- Armas ---------- */
/* Daño pensado para combates cortos: 100 de salud cae en ~1 segundo de fuego sostenido.
   mag/reload: armas con cargador (la escopeta doble tira 2 y recarga).
   hip: dispersión del francotirador sin mira (con mira usa spread). */
const WEAPONS = [
  { name: 'Pistola',        ammo: 'bullets',  cost: 1, rate: .17, type: 'hit',  pel: 1,  spread: .005, dmg: 22, range: 300 },
  { name: 'Escopeta',       ammo: 'shells',   cost: 1, rate: .85, type: 'hit',  pel: 10, spread: .06,  dmg: 11, range: 120 },
  { name: 'Escopeta doble', ammo: 'shells',   cost: 1, rate: .28, type: 'hit',  pel: 12, spread: .085, dmg: 11, range: 100, mag: 2, reload: 1.7 },
  { name: 'Ametralladora',  ammo: 'bullets',  cost: 1, rate: .085, type: 'hit', pel: 1,  spread: .013, dmg: 16, range: 300 },
  // granada: explota al segundo; si le pega de lleno a alguien antes de rebotar, explota en el acto con daño extra y premio
  { name: 'Lanzagranadas',  ammo: 'grenades', cost: 1, rate: .75, type: 'proj', proj: 'grenade', speed: 26, dmg: 110, rad: 5.5, direct: 40, clean: 100, fuse: 1 },
  { name: 'Lanzacohetes',   ammo: 'rockets',  cost: 1, rate: .8,  type: 'proj', proj: 'rocket',  speed: 44, dmg: 105, rad: 5, direct: 100 },
  { name: 'Rifle de plasma', ammo: 'slugs',    cost: 1, rate: 1.4, type: 'rail', pel: 1,  dmg: 110, range: 400 },
  // cuchillo mariposa: el segundo tajo sobre la misma víctima (dentro de 4 s) mata siempre
  { name: 'Cuchillo',       ammo: null,       cost: 0, rate: .5,  type: 'hit',  pel: 1,  spread: 0, dmg: 55, back: 1.8, range: 2.6, melee: true },
  { name: 'Francotirador',  ammo: 'sniper',   cost: 1, rate: 1.25, type: 'hit', pel: 1,  spread: .002, hip: .045, dmg: 115, head: 2, range: 500, scope: true },
  // rifle de caza: bala real con viaje y caída; cualquier impacto mata. Premia los tiros bien calculados
  { name: 'Rifle de caza',  ammo: 'caza',     cost: 1, rate: 1.6, type: 'proj', proj: 'bullet', speed: 260, drop: 9, dmg: 0, rad: 0, direct: 1000, scope: true, zoom: 58 },
  // bomba molotov: se rompe al primer golpe y deja el piso en llamas unos segundos
  { name: 'Bomba molotov',  ammo: 'molotov',  cost: 1, rate: .9,  type: 'proj', proj: 'molotov', speed: 17, dmg: 0, rad: 0, direct: 12, fire: { r: 3.4, dur: 6, hit: 5.5, every: .1 } }
];
const NW = WEAPONS.length;
// arrancás siempre con pistola, escopeta y cuchillo
const OW0 = () => { const a = new Array(NW).fill(0); a[0] = a[1] = a[7] = 1; return a; };
const AMMO_MAX = { shells: 50, bullets: 200, grenades: 25, rockets: 25, slugs: 25, sniper: 30, caza: 20, molotov: 6 };
const AMMO_NAME = { shells: 'Cartuchos', bullets: 'Balas', grenades: 'Granadas', rockets: 'Cohetes', slugs: 'Celdas de plasma', sniper: 'Balas de francotirador', caza: 'Cartuchos de caza', molotov: 'Molotovs' };
const AMMO0 = n => ({ shells: n, bullets: n, grenades: n, rockets: n, slugs: n, sniper: n, caza: n, molotov: n });

const ITEMS = {
  health: { name: 'Botiquín', respawn: 20 },
  mega:   { name: 'Megasalud', respawn: 35 },
  armor:  { name: 'Chaleco', respawn: 25 },
  armorH: { name: 'Armadura pesada', respawn: 30 },
  quad:   { name: 'Daño cuádruple', respawn: 60 },
  w1: { weapon: 1, ammo: 'shells', n: 10, respawn: 10 },
  w2: { weapon: 2, ammo: 'shells', n: 10, respawn: 10 },
  w3: { weapon: 3, ammo: 'bullets', n: 50, respawn: 10 },
  w4: { weapon: 4, ammo: 'grenades', n: 5, respawn: 10 },
  w5: { weapon: 5, ammo: 'rockets', n: 5, respawn: 10 },
  w6: { weapon: 6, ammo: 'slugs', n: 5, respawn: 10 },
  w8: { weapon: 8, ammo: 'sniper', n: 5, respawn: 15 },
  w9: { weapon: 9, ammo: 'caza', n: 5, respawn: 20 },
  caza: { ammo: 'caza', n: 5, respawn: 20 },
  shells:   { ammo: 'shells', n: 10, respawn: 15 },
  bullets:  { ammo: 'bullets', n: 50, respawn: 15 },
  grenades: { ammo: 'grenades', n: 5, respawn: 15 },
  rockets:  { ammo: 'rockets', n: 5, respawn: 15 },
  slugs:    { ammo: 'slugs', n: 5, respawn: 15 }
};
for (const k in ITEMS) if (ITEMS[k].weapon != null) ITEMS[k].name = WEAPONS[ITEMS[k].weapon].name;
for (const k in ITEMS) if (!ITEMS[k].name && ITEMS[k].ammo) ITEMS[k].name = AMMO_NAME[ITEMS[k].ammo];

const COLORS = ['#e8542a', '#3fa7ff', '#9ccc3c', '#ffcc33', '#c45cff', '#ff5c8a', '#38d6c4', '#f2efe6', '#ff8f1f', '#7a8cff'];
/* ---------- Economía: créditos por frag y tienda (tecla B) ---------- */
const ECON = { START: 300, KILL: 200, SHUTDOWN: 100, PISTOL: 100, MAX: 9999 };
// pack: munición con la que aparecés si desbloqueaste el arma
const SHOP = [
  { id: 'w0', cat: 'Pistolas', name: 'Pistola', w: 0, price: 0, free: 1, desc: 'Arrancás con 60 balas; comparte munición con la ametralladora' },
  { id: 'w1', cat: 'Escopetas', name: 'Escopeta', w: 1, price: 0, free: 1, desc: '10 perdigones, ideal de cerca' },
  { id: 'w2', cat: 'Escopetas', name: 'Escopeta doble', w: 2, price: 500, pack: ['shells', 20], desc: '20 perdigones, gasta 2 cartuchos' },
  { id: 'w3', cat: 'Automáticas', name: 'Ametralladora', w: 3, price: 600, pack: ['bullets', 100], desc: 'Fuego continuo a media distancia' },
  { id: 'w4', cat: 'Explosivas', name: 'Lanzagranadas', w: 4, price: 900, pack: ['grenades', 10], desc: 'Explotan al segundo. Un impacto directo explota en el acto y da premio' },
  // la molotov es de un solo uso: se compra estando vivo y si te matan la perdés
  { id: 'w10', cat: 'Explosivas', name: 'Bomba molotov', w: 10, price: 700, once: 1, pack: ['molotov', 3], desc: 'Tecla G. 3 molotovs que dejan el piso en llamas 6 s. Si te matan, las perdés' },
  { id: 'w5', cat: 'Explosivas', name: 'Lanzacohetes', w: 5, price: 1300, pack: ['rockets', 10], desc: 'Daño en área y rocket jump' },
  { id: 'w6', cat: 'Precisión', name: 'Rifle de plasma', w: 6, price: 1700, pack: ['slugs', 10], desc: 'Atraviesa a todos los que estén en línea' },
  { id: 'w8', cat: 'Precisión', name: 'Francotirador', w: 8, price: 1500, pack: ['sniper', 10], desc: 'Click derecho para apuntar con mira. Mata de un tiro a quien no tiene blindaje' },
  { id: 'w9', cat: 'Precisión', name: 'Rifle de caza', w: 9, price: 1400, pack: ['caza', 8], desc: 'La bala viaja y cae: cualquier impacto mata. Tiros largos o al aire dan premio' },
  { id: 'w7', cat: 'Pistolas', name: 'Cuchillo', w: 7, price: 0, free: 1, desc: 'Cuchillo mariposa: dos puñaladas matan siempre. No lo frena el blindaje' },
  { id: 'a1', cat: 'Blindaje', name: 'Chaleco', price: 400, armor: 50, desc: 'Aparecés con 50 de blindaje' },
  { id: 'a2', cat: 'Blindaje', name: 'Armadura pesada', price: 900, armor: 100, desc: 'Aparecés con 100 de blindaje' },
  { id: 'am', cat: 'Suministros', name: 'Cartuchera doble', price: 500, desc: 'Aparecés con el doble de munición' },
  { id: 'rf', cat: 'Suministros', name: 'Recarga', price: 150, use: 1, desc: 'Llena la munición de tus armas ahora' }
];
/* ---------- Modos de juego ---------- */
const MODES = {
  arena:   { name: 'Arena', maps: ['represa', 'panymanteca', 'lacuenca'], shop: true,
             desc: 'Todos contra todos. Cada frag da créditos para la tienda (B).' },
  gungame: { name: 'Gungame', maps: ['represa', 'panymanteca', 'lacuenca'], shop: false, gg: true,
             desc: 'Cada baja te da la siguiente arma de la lista. Munición infinita, sin tienda. Si te matan con cuchillo bajás un nivel. Gana el primero en hacer las 20 bajas; la última es con cuchillo.' },
  tdm:     { name: 'Team Deathmatch', maps: ['lacuenca', 'represa', 'panymanteca'], shop: true, teams: true, tdm: true, minPlayers: 4,
             desc: 'Rojo contra azul: cada baja suma para tu equipo hasta llegar al límite que elijan. Online arranca cuando hay 4 jugadores; mientras tanto, calentamiento.' },
  ctf:     { name: 'Captura la bandera', maps: ['puente'], shop: true, teams: true, ctf: true,
             desc: 'Rojo contra azul. Robá la bandera rival y llevala hasta tu base. Gana el primer equipo en capturarla 3 veces.' }
};
const MODE_IDS = Object.keys(MODES);
// Gungame: arranca con armas fuertes y termina con las difíciles; la última baja es con machete
const GG = [3, 5, 2, 4, 1, 6, 8, 0, 3, 5, 2, 4, 1, 9, 8, 0, 5, 6, 9, 7];
const TEAMS = [{ name: 'Rojo', c: '#ff4a3a' }, { name: 'Azul', c: '#3a8bff' }];
/* ---------- Cuentas: experiencia, niveles y medallas (estilo Team Fortress 2) ----------
   Se gana jugando online: por terminar la partida, por cada baja, por ganar y por capturar. */
const XP = { PLAY: 40, KILL: 10, WIN: 40, CAP: 30, PER_MIN: 4, MAX_MATCH: 600 };
const MAX_LEVEL = 100;
const xpToNext = L => 100 + 30 * (L - 1);
function levelInfo(xp) {
  let L = 1, rest = Math.max(0, xp | 0);
  while (L < MAX_LEVEL && rest >= xpToNext(L)) { rest -= xpToNext(L); L++; }
  return { level: L, into: rest, need: L < MAX_LEVEL ? xpToNext(L) : 0 };
}
const MEDALS = [
  { from: 1,  name: 'Recluta',  c: ['#8d8f93', '#5a5c60'] },
  { from: 5,  name: 'Bronce',   c: ['#d08a4a', '#7a4a20'] },
  { from: 10, name: 'Plata',    c: ['#e4e8ee', '#8a919b'] },
  { from: 20, name: 'Oro',      c: ['#ffd65a', '#a9771a'] },
  { from: 35, name: 'Platino',  c: ['#9ff3ea', '#2f8f88'] },
  { from: 50, name: 'Diamante', c: ['#b8a6ff', '#5532c8'] },
  { from: 75, name: 'Leyenda',  c: ['#ff6a4a', '#8f1a10'] }
];
const medalOf = L => MEDALS.reduce((a, m) => L >= m.from ? m : a, MEDALS[0]);
const ACCESSORIES = ['Ninguno', 'Cresta', 'Antena', 'Cuernos', 'Gorra'];
const BOT_NAMES = ['Yacaré', 'Carpincho', 'Surubí', 'Tatú', 'Coatí', 'Aguará', 'Yaguareté', 'Pacú', 'Dorado', 'Tero', 'Hornero', 'Mbiguá', 'Urutaú', 'Tucán', 'Zorro', 'Lobito'];

/* =====================================================================
   MAPAS
   Todo el nivel son cajas (brushes), igual que en Quake.
   x: oeste(-) / este(+) · z: norte(-) / sur(+) · y: altura
   ===================================================================== */
function mapKit() {
  const B = [], pads = [], teles = [], lava = [], items = [], spawns = [], lights = [];
  function add(x0, y0, z0, x1, y1, z1, mat, ex) {
    const b = { min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], mat: mat || 'wall' };
    if (ex) Object.assign(b, ex);
    B.push(b); return b;
  }
  // rampa: sube a lo largo de axis ('x'|'z') hacia dir (+1|-1); arriba va de lo a hi, base en yb
  function ramp(x0, z0, x1, z1, yb, lo, hi, axis, dir, mat) { return add(x0, yb, z0, x1, hi, z1, mat, { ramp: { axis, dir, lo, hi } }); }
  // pared con aberturas: doors = [[a0,a1,yb,yt]] medidas sobre el eje largo
  function wall(x0, z0, x1, z1, y0, y1, doors, mat) {
    const alongX = (x1 - x0) >= (z1 - z0);
    const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
    const cuts = [a0, a1];
    doors.forEach(d => { cuts.push(d[0], d[1]); });
    const cs = [...new Set(cuts)].filter(c => c >= a0 && c <= a1).sort((a, b) => a - b);
    for (let i = 0; i < cs.length - 1; i++) {
      const s = cs[i], e = cs[i + 1], mid = (s + e) / 2;
      const segs = [];
      const ds = doors.filter(d => d[0] <= mid && mid <= d[1]).sort((a, b) => a[2] - b[2]);
      if (!ds.length) segs.push([y0, y1]);
      else {
        let y = y0;
        ds.forEach(d => { if (d[2] > y) segs.push([y, d[2]]); y = Math.max(y, d[3]); });
        if (y < y1) segs.push([y, y1]);
      }
      segs.forEach(sg => {
        if (alongX) add(s, sg[0], z0, e, sg[1], z1, mat);
        else add(x0, sg[0], s, x1, sg[1], e, mat);
      });
    }
  }
  function stairs(x0, z0, x1, z1, yb, rise, n, axis, dir, mat) {
    const lo = axis === 'x' ? x0 : z0, hi = axis === 'x' ? x1 : z1, L = (hi - lo) / n;
    for (let i = 1; i <= n; i++) {
      const a = dir > 0 ? lo + (i - 1) * L : hi - i * L, b = dir > 0 ? lo + i * L : hi - (i - 1) * L;
      const top = yb + rise * i;
      if (axis === 'x') add(a, yb, z0, b, top, z1, mat || 'step'); else add(x0, yb, a, x1, top, b, mat || 'step');
    }
  }
  const D = (a0, a1, y0, y1) => [a0, a1, y0, y1];
  const face = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
  const I = (type, x, y, z) => items.push({ type, x, y, z });
  // plataforma móvil: se desplaza amp metros sobre axis (0=x, 1=y, 2=z) ida y vuelta cada period segundos
  const mover = (x0, y0, z0, x1, y1, z1, mat, axis, amp, period, phase) => add(x0, y0, z0, x1, y1, z1, mat, { mover: { axis, amp, period, phase: phase || 0 } });
  function finish(o) {
    const movers = B.filter(b => b.mover);
    movers.forEach(b => { b.mover.min0 = b.min.slice(); b.mover.max0 = b.max.slice(); b.off = 0; });
    B.forEach((b, i) => b.id = i);
    return Object.assign({ brushes: B, pads, teles, lava, items, spawns, lights, movers }, o);
  }
  return { B, pads, teles, lava, items, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish };
}

/* ---------- dm1 · La Represa ---------- */
function buildRepresa() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();

  /* ---- Límites del mundo ---- */
  add(-41, -6, -41, 41, 24, -40, 'block');
  add(-41, -6, 38, 41, 24, 39, 'block');
  add(-41, -6, -40, -40, 24, 38, 'block');
  add(40, -6, -40, 41, 24, 38, 'block');
  add(28, -6, -40, 40, 14, -17, 'block');   // bloque NE
  add(-40, -6, -40, -28, 14, -17, 'block'); // bloque NO

  /* ---- ATRIO central ---- */
  add(-16, -1, -16, 16, 0, -5, 'floor'); add(-16, -1, 5, 16, 0, 16, 'floor');
  add(-16, -1, -5, -5, 0, 5, 'floor');  add(5, -1, -5, 16, 0, 5, 'floor');
  // pozo de lava
  add(-5, -6, -5, 5, -4, 5, 'rock');
  add(-6, -6, -6, 6, -1, -5, 'trim'); add(-6, -6, 5, 6, -1, 6, 'trim');
  add(-6, -6, -5, -5, -1, 5, 'trim'); add(5, -6, -5, 6, -1, 5, 'trim');
  lava.push({ min: [-5, -6, -5], max: [5, -3.6, 5], dps: 40 });
  pads.push({ x: 3, y: -4, z: -3, r: 1, t: [14, 6, -6], apex: 1.5 });
  // plataforma del daño cuádruple y piedras para llegar
  add(-2, 6.6, -2, 2, 7, 2, 'metal');
  [[6.5, 0], [-6.5, 0], [0, 6.5], [0, -6.5]].forEach(([x, z]) => add(x - 1, 6.1, z - 1, x + 1, 6.5, z + 1, 'metal'));
  // balcón perimetral
  add(-16, 5.5, -16, 16, 6, -12, 'floor'); add(-16, 5.5, 12, 16, 6, 16, 'floor');
  add(-16, 5.5, -12, -12, 6, 12, 'floor'); add(12, 5.5, -12, 16, 6, 12, 'floor');
  add(12, 0, 12, 13, 5.5, 13, 'metal'); add(-13, 0, 12, -12, 5.5, 13, 'metal');
  add(12, 0, -13, 13, 5.5, -12, 'metal'); add(-13, 0, -13, -12, 5.5, -12, 'metal');
  // escaleras al balcón
  stairs(9, -2, 12, 10, 0, .5, 12, 'z', -1);
  stairs(-12, -10, -9, 2, 0, .5, 12, 'z', 1);
  add(9, 0, -4, 12, 6, -2, 'step'); add(-12, 0, 2, -9, 6, 4, 'step');   // descansos arriba
  pads.push({ x: 0, y: 0, z: -9, r: 1, t: [0, 6, -14], apex: 1.5 });
  pads.push({ x: 0, y: 0, z: 9, r: 1, t: [0, 6, 14], apex: 1.5 });
  // paredes del atrio con puerta abajo y puerta al balcón
  const atDoors = [D(-3, 3, 0, 4), D(-3, 3, 6, 10)];
  wall(-17, -17, 17, -16, -6, 14, atDoors, 'wall');
  wall(-17, 16, 17, 17, -6, 14, atDoors, 'wall');
  wall(-17, -16, -16, 16, -6, 14, atDoors, 'wall');
  wall(16, -16, 17, 16, -6, 14, atDoors, 'wall');
  // tiras de luz
  add(-15.9, 12.4, -16, 15.9, 12.7, -15.8, 'light', { nc: 1 });
  add(-15.9, 12.4, 15.8, 15.9, 12.7, 16, 'light', { nc: 1 });
  add(-16, 12.4, -15.9, -15.8, 12.7, 15.9, 'light', { nc: 1 });
  add(15.8, 12.4, -15.9, 16, 12.7, 15.9, 'light', { nc: 1 });

  /* ---- PATIO NORTE con la torre del riel ---- */
  add(-28, -1, -40, 28, 0, -17, 'concrete');
  add(-6, 5.5, -20, 6, 6, -17, 'floor');               // repisa del balcón norte
  add(-6, 0, -20, -5, 5.5, -19, 'metal'); add(5, 0, -20, 6, 5.5, -19, 'metal');
  add(-5, 0, -34, 5, 12, -27, 'tower');                 // torre
  add(-5.2, 11.6, -34.2, 5.2, 12, -26.8, 'trim');       // borde de la torre
  // plataformas en espiral hasta la torre
  [[9, -24, 1.2], [11.5, -28, 2.4], [11, -33, 3.6], [8, -37, 4.8], [3, -38.5, 6.0], [-2, -38.5, 7.2], [-7, -37, 8.4], [-10, -32.5, 9.6], [-7.5, -28.5, 10.8]]
    .forEach(([x, z, t]) => add(x - 1, t - .4, z - 1, x + 1, t, z + 1, 'metal'));
  // cajas
  add(14.5, 0, -23.5, 17.5, 2, -20.5, 'crate');
  add(-17.5, 0, -27, -14.5, 1.5, -23, 'crate');
  add(-21, 0, -37, -19, 2.5, -35, 'crate'); add(-19, 0, -37, -17, 1.25, -35, 'crate');

  /* ---- ALA OESTE: andén de tres niveles ---- */
  add(-40, -1, -16, -17, 0, 16, 'floor');
  wall(-40, -17, -17, -16, -6, 14, [D(-27, -23, 0, 4)], 'wall');
  add(-40, -6, 16, -17, 14, 38, 'block');               // bloque SO
  add(-40, 12, -16, -17, 13, 16, 'roof');
  add(-40, 2.5, -16, -33, 3, 16, 'floor');              // entrepiso
  add(-26, 5.5, -16, -17, 6, 16, 'floor');              // nivel alto
  stairs(-33, 4, -30, 10, 0, .5, 6, 'z', -1);
  ramp(-33, -14, -26, -11, 2.5, 3, 6, 'x', 1, 'grate');
  [-8, 0, 8].forEach(z => { add(-34, 0, z - .5, -33, 2.5, z + .5, 'metal'); add(-26, 0, z - .5, -25, 5.5, z + .5, 'metal'); });
  pads.push({ x: -29.5, y: 0, z: -4, r: 1, t: [-21, 6, -4], apex: 2.5 });
  add(-39.9, 9, -12, -39.7, 9.4, 12, 'light', { nc: 1 });

  /* ---- ALA ESTE: sala de lava con pasarelas ---- */
  add(17, -4, -16, 21, 0, 16, 'floor');                 // andén de entrada
  add(21, -5, -16, 40, -3, 16, 'rock');                 // fondo de la pileta
  lava.push({ min: [21, -5, -16], max: [40, -2.2, 16], dps: 40 });
  wall(17, -17, 40, -16, -6, 14, [D(18, 21, 0, 4)], 'wall');
  wall(17, 16, 40, 17, -6, 14, [D(18, 21, 0, 3)], 'wall');
  add(17, 5.6, -1.5, 30, 6, 1.5, 'grate');              // pasarela alta
  add(33, -4, -6, 40, 4, 6, 'metal');                   // plataforma de la megasalud
  [[24, -9, .5], [27.5, -12, 1.5], [31.5, -10.5, 2.5], [36, -9, 3.5], [24, 9, .5], [27.5, 12, 1.5], [31.5, 10.5, 2.5], [36, 9, 3.5]]
    .forEach(([x, z, t]) => add(x - 1, -4, z - 1, x + 1, t, z + 1, 'pillar'));
  add(23, -4, 13, 25, -2, 16, 'step'); add(21, -4, 13, 23, -1, 16, 'step');
  add(23, -4, -16, 25, -2, -13, 'step'); add(21, -4, -16, 23, -1, -13, 'step');
  pads.push({ x: 35, y: 4, z: -3, r: 1, t: [13, 6, 0], apex: 1.5 });

  /* ---- SUR: rampa al sótano de turbinas y terraza en el techo ---- */
  ramp(-3, 17, 3, 24, -4, -3, 0, 'z', -1, 'concrete');
  add(-4, -4, 17, -3, 4, 24, 'wall'); add(3, -4, 17, 4, 4, 24, 'wall');
  add(-4, 4, 17, 4, 5, 24, 'roof');
  add(-17, -6, 17, -4, 5, 23, 'block'); add(4, -6, 17, 17, 5, 23, 'block');
  add(-16, -4, 24, 16, -3, 38, 'floor');
  wall(-16, 23, 16, 24, -4, 5, [D(-3, 3, -3, 4)], 'wall');
  add(-17, -4, 23, -16, 5, 38, 'wall');
  wall(16, 23, 17, 38, -4, 5, [D(33, 36, -3, 1)], 'wall');
  add(-17, 4, 24, 17, 5, 38, 'roof');
  add(-1.5, -3, 30.5, 1.5, -2.5, 33.5, 'trim');          // pedestal
  add(-11.5, -3, 26.5, -8.5, -1, 29.5, 'crate');
  add(-14, -3, 33, -12, -2, 35, 'crate');
  add(10.5, -3, 36.5, 11, 1, 37, 'metal'); add(13, -3, 36.5, 13.5, 1, 37, 'metal'); add(10.5, 1, 36.5, 13.5, 1.5, 37, 'metal');
  teles.push({ x: 12, y: -3, z: 35, r: .9, to: [0, 12, -29.5], yaw: 0 });
  // pasillo al ala este
  add(17, -6, 17, 18, 14, 33, 'block'); add(21, -6, 17, 40, 14, 38, 'block'); add(17, -6, 36, 21, 14, 38, 'block');
  add(16, -4, 33, 21, -3, 36, 'floor');
  add(18, -4, 23, 21, -3, 33, 'floor');
  stairs(18, 17, 21, 23, -3, .5, 6, 'z', -1);
  add(17, 1, 33, 21, 14, 36, 'block'); add(18, 3, 17, 21, 14, 33, 'block');
  add(-15.9, 3.5, 37.8, 15.9, 3.8, 38, 'light', { nc: 1 });

  /* ---- Ítems ---- */
  I('quad', 0, 7, 0);
  I('health', -8, 0, 10); I('health', 8, 0, -10); I('shells', 14, 6, -14); I('bullets', -14, 6, 14); I('armor', 14, 6, 14);
  I('w6', 0, 12, -31); I('slugs', 3, 12, -32.5); I('armor', -20, 2.5, -36); I('health', 20, 0, -36);
  I('w4', -16, 1.5, -25); I('grenades', 16, 2, -22); I('shells', 0, 0, -24);
  I('w2', -37, 3, 0); I('w3', -29, 0, 12); I('bullets', -37, 3, -12); I('armorH', -21, 6, -12); I('health', -21, 6, 12); I('shells', -37, 0, 13);
  I('mega', 37, 4, 0); I('rockets', 37, 4, 4); I('health', 31.5, 2.5, -10.5); I('shells', 19, 0, 12); I('bullets', 19, 0, -12); I('grenades', 31.5, 2.5, 10.5);
  I('w5', 0, -2.5, 32); I('rockets', -13, -3, 30); I('armor', 12, -3, 28); I('health', -10, -1, 28); I('w1', -8, -3, 35);
  I('health', 10, 5, 30); I('bullets', -10, 5, 30); I('w8', 0, 5, 35); I('rockets', -10, 5, 20);

  /* ---- Puntos de aparición ---- */
  [[6, 0, -13], [-6, 0, 13], [-14, 6, 4], [14, 6, -4], [-12, 0, -22], [20, 0, -28], [-30, 0, -10], [-37, 3, 8], [-21, 6, 4],
   [19, 0, -6], [-6, -3, 35], [8, -3, 27], [0, 5, 28], [37, 4, -3], [-8, 0, -36], [12, 0, -36]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));

  /* ---- Luces ---- */
  lights.push(
    { x: 0, y: 11, z: 0, c: 0xffb070, i: 1.4, d: 40 },
    { x: 0, y: 9, z: 0, c: 0xa060ff, i: 1.2, d: 12 },
    { x: 0, y: 15, z: -30, c: 0x6fd8ff, i: 1.2, d: 26 },
    { x: -29, y: 10, z: 0, c: 0xffc080, i: 1.3, d: 34 },
    { x: 30, y: 1, z: 0, c: 0xff5a14, i: 2.0, d: 30 },
    { x: 0, y: 3, z: 31, c: 0xff4a3a, i: 1.4, d: 26 },
    { x: 0, y: -2, z: 0, c: 0xff4a10, i: 1.4, d: 12 }
  );

  return finish({ id: 'represa', name: 'dm1 · La Represa', bounds: { x0: -41, x1: 41, z0: -41, z1: 39 },
    theme: { sky: 'dusk', fog: 0x1c1310, fogD: .0105, amb: 0x55453a, ambI: .85, hemi: [0x5a4a6a, 0x1a100a, .55], sun: true } });
}

/* ---------- dm2 · Pan & Manteca — un boliche (homenaje a la noche de Posadas) ---------- */
function buildPanYManteca() {
  const { pads, spawns, lights, add, wall, stairs, D, face, I, mover, finish } = mapKit();
  /* ---- cáscara: salón principal x[-20,20] z[-18,18], techo a 16 ---- */
  wall(-21, -19, 21, -18, -2, 17, [], 'black');
  wall(-21, 18, 21, 19, -2, 17, [D(-12, -8, 0, 4), D(-2, 2, 0, 4), D(8, 12, 0, 4), D(-3, 3, 7, 10), D(16, 20, 7, 10), D(-20, -16, 7, 10)], 'black');
  add(-21, -2, -18, -20, 17, 18, 'black'); add(20, -2, -18, 21, 17, 18, 'black');
  add(-21, 16, -19, 21, 17, 19, 'roof');
  // piso: pista LED en el centro y baldosas alrededor
  add(-12, -1, -10, 12, 0, 10, 'led');
  add(-20, -1, -18, 20, 0, -10, 'club'); add(-20, -1, 10, 20, 0, 18, 'club');
  add(-20, -1, -10, -12, 0, 10, 'club'); add(12, -1, -10, 20, 0, 10, 'club');
  add(-4, 0, -4, 4, 1, 4, 'led');                                  // podio central
  /* ---- escenario y cabina del DJ ---- */
  add(-10, 0, -18, 10, 2, -12, 'stage');
  stairs(-6, -12, 6, -10.5, 0, .5, 3, 'z', -1, 'stage');
  add(-3, 2, -15, 3, 3.1, -13.5, 'chrome');
  /* ---- torres de parlantes: escalones hasta el VIP ---- */
  for (const sx of [-1, 1]) {
    const X = (a, b) => sx < 0 ? [a, b] : [-b, -a];
    let [a, b] = X(-14, -10); add(a, 0, -18, b, 2.6, -14.5, 'speaker');
    [a, b] = X(-17, -14); add(a, 0, -18, b, 3.8, -14.5, 'speaker');
    [a, b] = X(-20, -17); add(a, 0, -18, b, 5.0, -14.5, 'speaker');
    [a, b] = X(-20, -17); add(a, 0, -14.5, b, 6.2, -12, 'speaker');
  }
  /* ---- VIP: balcones en U a 7 m ---- */
  add(-20, 6.5, -12, -15, 7, 18, 'velvet'); add(15, 6.5, -12, 20, 7, 18, 'velvet'); add(-15, 6.5, 13, 15, 7, 18, 'velvet');
  [-6, 6].forEach(z => { add(-15.5, 0, z - .25, -15, 6.5, z + .25, 'chrome'); add(15, 0, z - .25, 15.5, 6.5, z + .25, 'chrome'); });
  [-8, 8].forEach(x => add(x - .25, 0, 13, x + .25, 6.5, 13.5, 'chrome'));
  // barras debajo del VIP
  add(-17, 0, -8, -16, 1.1, 8, 'glass'); add(16, 0, -8, 17, 1.1, 8, 'glass');
  /* ---- estructura de luces (truss) a 12 m ---- */
  add(-14, 11.6, -9.5, 14, 12, -8, 'truss'); add(-14, 11.6, 8, 14, 12, 9.5, 'truss');
  add(-14, 11.6, -8, -12.5, 12, 8, 'truss'); add(12.5, 11.6, -8, 14, 12, 8, 'truss');
  /* ---- cabina flotante con el cuádruple ---- */
  add(-2.5, 10.6, -2.5, 2.5, 11, 2.5, 'chrome');
  /* ---- partes móviles ---- */
  mover(-14.5, 6.6, -7.5, -11.5, 7, -4.5, 'lift', 0, 26, 10, 0);              // plataforma que cruza el salón
  mover(-14.5, 6.6, 4.5, -11.5, 7, 7.5, 'lift', 0, 26, 10, Math.PI);
  mover(-14, -.1, 10, -11, .3, 13, 'lift', 1, 6.7, 8, 0);                    // ascensores al VIP sur
  mover(11, -.1, 10, 14, .3, 13, 'lift', 1, 6.7, 8, Math.PI);
  /* ---- subwoofers (plataformas de salto) ---- */
  pads.push({ x: 9, y: 0, z: 0, r: 1, t: [1, 11, 0], apex: 1.5 });
  pads.push({ x: -9, y: 0, z: 0, r: 1, t: [-1, 11, 0], apex: 1.5 });
  pads.push({ x: 0, y: 0, z: 10.6, r: 1, t: [0, 7, 15.5], apex: 1.2 });
  pads.push({ x: -17.5, y: 7, z: -3, r: 1, t: [-13.25, 12, -3], apex: 1.5 });
  pads.push({ x: 17.5, y: 7, z: 3, r: 1, t: [13.25, 12, 3], apex: 1.5 });
  /* ---- lobby / baños y terraza ---- */
  add(-21, -1, 19, 21, 0, 32, 'club');
  add(-21, -2, 19, -20, 17, 32, 'black'); add(20, -2, 19, 21, 17, 32, 'black'); add(-21, -2, 32, 21, 17, 33, 'black');
  add(-16, 4.5, 19, 16, 5, 32, 'roof');                                         // techo del lobby = terraza
  add(-20, 12, 19, -16, 13, 32, 'roof'); add(16, 12, 19, 20, 13, 32, 'roof');   // techos de las escaleras
  stairs(17, 19, 20, 31, 0, .5, 14, 'z', -1, 'stage');
  stairs(-20, 19, -17, 31, 0, .5, 14, 'z', -1, 'stage');
  add(-14, 0, 26, -4, 4.5, 26.6, 'mirror'); add(4, 0, 26, 14, 4.5, 26.6, 'mirror');
  [-8, 8].forEach(x => add(x - .5, 0, 24, x + .5, 4.5, 25, 'chrome'));
  add(-1, 0, 28.5, 1, .4, 30.5, 'chrome');
  add(-14, 0, 30.5, -8, .6, 32, 'velvet'); add(8, 0, 30.5, 14, .6, 32, 'velvet');
  /* ---- neón ---- */
  add(-15.1, 6.3, -12, -14.9, 6.5, 13, 'neonP', { nc: 1 }); add(14.9, 6.3, -12, 15.1, 6.5, 13, 'neonC', { nc: 1 });
  add(-15, 6.3, 12.9, 15, 6.5, 13.1, 'neonP', { nc: 1 });
  add(-19.9, 14.8, -18, -19.7, 15.1, 18, 'neonC', { nc: 1 }); add(19.7, 14.8, -18, 19.9, 15.1, 18, 'neonP', { nc: 1 });
  add(-10, 2.05, -11.9, 10, 2.2, -11.7, 'neonC', { nc: 1 });
  add(-16, 4.1, 31.8, 16, 4.3, 32, 'neonP', { nc: 1 });
  /* ---- ítems ---- */
  I('quad', 0, 11, 0); I('mega', 0, 12, 8.75); I('w6', 0, 12, -8.75); I('w8', 13.25, 12, -4); I('grenades', -13.25, 12, 4);
  I('w5', 0, .4, 29.5); I('rockets', -11, 0, 28.5); I('rockets', 11, 5, 28); I('w2', 6, 2, -15.5); I('w3', -17.5, 7, -7); I('w4', 17.5, 7, 7);
  I('shells', -8, 0, -8); I('shells', 8, 0, 8); I('bullets', 8, 0, -8); I('bullets', -17.5, 7, 15); I('armor', 17.5, 7, -10); I('armor', -17.5, 7, 10);
  I('armorH', 0, 5, 22); I('health', -18.5, 0, 0); I('health', 18.5, 0, 0); I('health', -12, 0, 22); I('health', 12, 0, 22); I('w1', -6, 2, -15.5);
  /* ---- apariciones ---- */
  [[-14, 0, -6], [14, 0, 6], [-8, 0, 15], [8, 0, 15.5], [4, 2, -16.5], [-17.5, 7, 1], [17.5, 7, -2], [-5, 7, 15.5], [5, 7, 15.5],
   [-10, 0, 21], [10, 0, 21], [-6, 0, 30], [6, 0, 30], [-12, 5, 24], [12, 5, 24], [0, 1, 0]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push(
    { x: -12, y: 9, z: 0, c: 0xff2bd6, i: 1.6, d: 30 },
    { x: 12, y: 9, z: 0, c: 0x2be6ff, i: 1.6, d: 30 },
    { x: 0, y: 14, z: 0, c: 0x8a4bff, i: 1.5, d: 34 },
    { x: 0, y: 6, z: -14, c: 0xffb040, i: 1.4, d: 22 },
    { x: 0, y: 3.5, z: 25, c: 0xff3050, i: 1.3, d: 22 },
    { x: 0, y: 10, z: 26, c: 0x6a7bff, i: 1.1, d: 26 }
  );
  return finish({ id: 'panymanteca', name: 'dm2 · Pan & Manteca', bounds: { x0: -22, x1: 22, z0: -20, z1: 34 },
    theme: { sky: 'night', fog: 0x0d0716, fogD: .013, amb: 0x3a2a55, ambI: .9, hemi: [0x6040a0, 0x10081a, .55], sun: false, club: true } });
}
/* ---------- ctf1 · El Puente ----------
   Posadas (rojo, al norte) contra Encarnación (azul, al sur), con el río en el medio.
   Se cruza por el puente atirantado, por las lanchas que van y vienen o saltando
   a los bancos de arena con las plataformas. El mapa es simétrico respecto de z = 0. */
function buildPuente() {
  const { pads, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const lines = [], tspawns = [[], []];
  /* ---- límites y río ---- */
  add(-28, -14, -53, -26, 12, 53, 'block'); add(26, -14, -53, 28, 12, 53, 'block');
  lava.push({ min: [-26, -14, -12], max: [26, -1.5, 12], dps: 999, water: 1 });
  /* ---- puente: tablero a 4 m ---- */
  add(-3.5, 3.4, -14, 3.5, 4, 14, 'floor');
  for (const x of [-3.7, 3.5]) { add(x, 4, -14, x + .2, 5, -2, 'metal'); add(x, 4, 2, x + .2, 5, 14, 'metal'); }
  I('quad', 0, 4, 0);
  /* ---- lanchas que cruzan el río ---- */
  mover(-17, -1, -12, -11, 0, -8, 'crate', 2, 20, 12, 0);
  mover(11, -1, -12, 17, 0, -8, 'crate', 2, 20, 12, Math.PI);
  /* ---- bancos de arena con plataformas de salto ---- */
  for (const sx of [-1, 1]) {
    add(sx * 19, -14, -3.5, sx * 25, .5, 3.5, 'rock');
    pads.push({ x: sx * 22, y: .5, z: 2.4, r: .9, t: [sx * 22, 0, 18], apex: 1.5 });
    pads.push({ x: sx * 22, y: .5, z: -2.4, r: .9, t: [sx * 22, 0, -18], apex: 1.5 });
  }
  I('w5', -22, .5, 0); I('mega', 22, .5, 0);
  /* ---- cada orilla ---- */
  for (const s of [-1, 1]) {
    const team = s < 0 ? 0 : 1, nm = s < 0 ? 'neonR' : 'neonB';
    const Z = (a, b) => s > 0 ? [a, b] : [-b, -a];
    const A = (x0, y0, z0, x1, y1, z1, mat, ex) => { const [a, b] = Z(z0, z1); return add(x0, y0, a, x1, y1, b, mat, ex); };
    const RZ = (x0, z0, x1, z1, lo, hi, dir, mat) => { const [a, b] = Z(z0, z1); return ramp(x0, a, x1, b, 0, lo, hi, 'z', dir * s, mat); };
    const SZ = (x0, z0, x1, z1, rise, n, dir, mat) => { const [a, b] = Z(z0, z1); return stairs(x0, a, x1, b, 0, rise, n, 'z', dir * s, mat); };
    const WX = (x0, z0, x1, z1, y0, y1, doors, mat) => { const [a, b] = Z(z0, z1); wall(x0, a, x1, b, y0, y1, doors, mat); };
    /* costanera */
    A(-26, -1, 12, 26, 0, 52, 'concrete');
    A(-26, -14, 12, 26, -1, 13, 'block');
    A(-28, -14, 51, 28, 12, 53, 'block');
    WX(-26, 12, 26, 12.3, 0, 1, [D(-17, -11, 0, 1), D(11, 17, 0, 1), D(-25, -19, 0, 1), D(19, 25, 0, 1)], 'metal');
    /* subida al puente */
    RZ(-3.5, 14, 3.5, 22, 0, 4, -1, 'step');
    /* pilón del puente con travesaño a 10 m */
    for (const x of [-5.6, 4.4]) A(x, -14, 5.4, x + 1.2, 16, 6.6, 'tower');
    A(-5.6, 9.5, 4.6, 5.6, 10, 7.4, 'metal');
    A(-5.6, 15.2, 5.4, 5.6, 16, 6.6, 'tower');
    pads.push({ x: 0, y: 4, z: s * 10.5, r: .9, t: [0, 10, s * 6], apex: 1.2 });
    I('slugs', 0, 10, s * 6);
    for (const x of [-5, 5]) for (const z of [1, 3.5, 9.5, 13]) lines.push([x, 15.6, s * 6, Math.sign(x) * 3.6, 4.6, s * z]);
    /* contenedores y cajas en la orilla */
    A(-13, 0, 19, -7, 2.6, 21.5, 'metal'); A(-7, 0, 19.2, -5.8, 1.3, 20.4, 'crate');
    A(7, 0, 24, 13, 2.6, 26.5, 'metal'); A(5.8, 0, 24.2, 7, 1.3, 25.4, 'crate');
    A(-20, 0, 16.5, -18.8, 1.2, 17.7, 'crate'); A(18.8, 0, 16.5, 20, 1.2, 17.7, 'crate');
    I('rockets', -10, 2.6, 20.2); I('grenades', 10, 2.6, 25.2); I('w2', -9, 0, 15.5); I('w4', 9, 0, 15.5);
    pads.push({ x: -22, y: 0, z: s * 16, r: 1, t: [-22, .5, 0], apex: 1.5 });
    pads.push({ x: 22, y: 0, z: s * 16, r: 1, t: [22, .5, 0], apex: 1.5 });
    /* torres de vigía con escalera */
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -24 : 20, x1 = x0 + 4;
      A(x0, 0, 24, x1, 6, 28, 'block');
      SZ(x0 + .5, 28, x1 - .5, 40, .25, 24, -1, 'step');
    }
    I('w6', 22, 6, s * 26); I('w8', -22, 6, s * 26);
    /* fortín */
    WX(-15, 30, 15, 31, 0, 8, [D(-4, 4, 0, 4.5), D(-3, 3, 4.5, 8), D(-12, -6, 6.2, 7.4), D(6, 12, 6.2, 7.4), D(-13.5, -11.5, 0, 3), D(11.5, 13.5, 0, 3)], 'wall');
    A(-15, 0, 31, -14, 8, 51, 'wall'); A(14, 0, 31, 15, 8, 51, 'wall'); A(-15, 0, 50, 15, 8, 51, 'wall');
    A(-15, 8, 30, 15, 8.25, 31, nm, { nc: 1 });
    A(-7, 1, 29.8, -5, 4.4, 30, nm, { nc: 1 }); A(5, 1, 29.8, 7, 4.4, 30, nm, { nc: 1 });
    A(-14, 4.5, 31, 14, 5, 33, 'grate');                                       // pasarela del frente
    A(-14, 4.5, 33, -10, 5, 46, 'grate'); A(10, 4.5, 33, 14, 5, 46, 'grate');  // pasarelas laterales
    A(-14, 4.5, 46, 14, 5, 50, 'grate');                                       // pasarela del fondo
    RZ(-10, 34, -7, 42, 0, 5, 1, 'step'); A(-10, 4.5, 42, -7, 5, 46, 'grate');
    RZ(7, 34, 10, 42, 0, 5, 1, 'step'); A(7, 4.5, 42, 10, 5, 46, 'grate');
    A(-3, 0, 39, 3, .5, 45, 'metal');                                          // pedestal de la bandera
    for (const [x, z] of [[-3, 39], [2.8, 39], [-3, 44.8], [2.8, 44.8]]) A(x, .5, z, x + .2, 2.2, z + .2, nm, { nc: 1 });
    pads.push({ x: 0, y: 5, z: s * 32, r: .9, t: [0, 2, s * 18], apex: 4 });  // salida rápida para el que lleva la bandera
    I('health', -6, 0, s * 44); I('health', 6, 0, s * 44); I('armorH', 0, 5, s * 48); I('shells', -12, 5, s * 37); I('bullets', 12, 5, s * 37); I('w3', -5.5, 0, s * 34);
    // se aparece en los patios de los costados y en las torres, no al lado de la bandera
    [[-18, 0, 36], [18, 0, 36], [-23, 0, 42], [23, 0, 42], [-18, 0, 48], [18, 0, 48], [-22, 6, 26], [22, 6, 26]]
      .forEach(([x, y, z]) => tspawns[team].push({ x, y, z: s * z, yaw: face(x, s * z, 0, 0) }));
    lights.push({ x: 0, y: 6, z: s * 42, c: s < 0 ? 0xff4030 : 0x3070ff, i: 1.5, d: 28 }, { x: 0, y: 7, z: s * 20, c: 0xffc080, i: 1, d: 24 });
  }
  spawns.push(...tspawns[0], ...tspawns[1]);
  return finish({ id: 'puente', name: 'ctf1 · El Puente', bounds: { x0: -27, x1: 27, z0: -52, z1: 52 }, lines, tspawns,
    flags: [{ x: 0, y: .5, z: -42 }, { x: 0, y: .5, z: 42 }],
    theme: { sky: 'dusk', fog: 0x1c1416, fogD: .0085, amb: 0x5a4a48, ambI: .9, hemi: [0x6a5a7a, 0x1a120a, .55], sun: true } });
}
/* ---------- dm3 · La Cuenca — Universidad de la Cuenca del Plata, Posadas ----------
   La plaza de baldosas frente al edificio blanco: cantero con la palmera, escaleras al acceso
   de columnas oscuras, terraza a la derecha, rampa larga con baranda, rampa lateral con alambrado
   y la vereda de ladrillo. El edificio se recorre por dentro: planta baja, dos pisos de aulas,
   biblioteca con balcón y terraza en el techo. Norte = -z (el edificio), sur = +z (la calle). */
function buildLaCuenca() {
  const { pads, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();
  const deco = [];
  /* ---- suelo, vecinos y límites ---- */
  add(-30, -2, -30, 30, 0, 29, 'brick');
  add(-31, -2, -31, -30, 10, 30, 'block'); add(30, -2, -31, 31, 10, 30, 'block');
  add(-31, -2, -31, 31, 18, -30, 'block'); add(-31, -2, 29, 31, 9, 30, 'whitewall');
  add(-30, 0, -30, -24, 5, 10, 'roofTiles');                       // casas vecinas con techo de tejas
  add(24, 0, -30, 30, 7, 10, 'whitewall');
  add(-30, 0, 26, 30, 6, 29, 'block');                              // vereda de enfrente
  /* ---- plaza de baldosas (1,5 m sobre la calle) ---- */
  add(-16, 0, -4, 16, 1.5, 13, 'tiles');
  add(-2.5, 0, -6, 2.5, 1.5, -4, 'tiles');
  // borde sur: rampa larga con baranda, escalerita, muro y escalera a la vereda
  ramp(-16, 13, -4, 16, 0, 0, 1.5, 'x', 1, 'smooth');
  add(-16, 1.5, 12.85, -4, 2.5, 13, 'rail'); add(-16, 0, 15.85, -4, 1.4, 16, 'rail');
  stairs(-4, 13, -1, 16, 0, .25, 6, 'z', -1, 'step');
  add(-1, 0, 13, 9, 1.5, 16, 'smooth'); add(-1, 1.5, 15.85, 9, 2.5, 16, 'rail');
  stairs(9, 13, 13, 16, 0, .25, 6, 'z', -1, 'step');
  add(13, 0, 13, 16, 1.5, 16, 'smooth');
  // bancos de hormigón con asiento oscuro
  add(-2, 1.5, 5, 3, 2.05, 6.2, 'smooth'); add(-2, 2.05, 5, 3, 2.15, 6.2, 'navy');
  add(8, 1.5, 9, 11.5, 2.05, 10.2, 'smooth'); add(8, 2.05, 9, 11.5, 2.15, 10.2, 'navy');
  /* ---- cantero con la palmera ---- */
  add(-16, 1.5, -4, -7, 2.6, 3, 'smooth'); add(-15.6, 2.6, -3.6, -7.4, 2.65, 2.6, 'soil');
  deco.push({ t: 'palm', x: -12, y: 2.65, z: -.5, h: 10 }, { t: 'bush', x: -9, y: 2.65, z: 1, r: 1.1 }, { t: 'bush', x: -14.5, y: 2.65, z: 1.6, r: .9 },
    { t: 'bush', x: -9.5, y: 2.65, z: -2.6, r: .8 }, { t: 'bush', x: -14, y: 2.65, z: -2.8, r: 1 });
  /* ---- acceso: escaleras, descanso y columnas oscuras ---- */
  stairs(-7, -6, -2.5, -4, 1.5, .25, 6, 'z', -1, 'step');
  add(-16, 1.5, -6, -7, 3, -4, 'smooth');
  for (const x of [-10.3, -2.3]) add(x, 1.5, -5.9, x + .6, 6.6, -5.3, 'navy');
  add(-11, 6.6, -6, -1, 7.1, -4.6, 'whitewall');                   // alero sobre la entrada
  /* ---- terraza derecha con baranda ---- */
  add(2.5, 1.5, -6, 16, 3, -1, 'tiles');
  stairs(3, -1, 6.5, 3, 1.5, .25, 6, 'z', -1, 'step');
  add(6.5, 3, -1.15, 16, 4, -1, 'rail'); add(2.5, 3, -1.15, 3, 4, -1, 'rail');
  add(15.85, 3, -6, 16, 4, -1, 'rail');
  /* ---- rampa lateral derecha con alambrado ---- */
  add(16, 0, -6, 17, 2.6, 16, 'smooth');
  ramp(17, -6, 22, 16, 0, 0, 3, 'z', -1, 'smooth');
  add(22, 0, -6, 22.2, 4, 16, 'fence');
  deco.push({ t: 'bush', x: 23.2, y: 0, z: 2, r: 1 }, { t: 'bush', x: 23.2, y: 0, z: 10, r: 1.1 }, { t: 'bush', x: 23.2, y: 0, z: -3, r: .9 });
  /* ---- rampa y pasarela izquierda ---- */
  ramp(-22, -6, -16, 16, 0, 0, 3, 'z', -1, 'smooth');
  add(-16.3, 0, -2, -16, 2.5, 13, 'smooth');
  add(-24, 0, -28, -16, 3, -6, 'smooth');
  add(-22.2, 3, -14, -22, 4, -6, 'rail');
  deco.push({ t: 'bush', x: -23, y: 0, z: 4, r: 1 }, { t: 'bush', x: -23, y: 0, z: 11, r: .9 });
  /* ---- garita y mástiles ---- */
  add(10.5, 1.5, 2, 12.5, 3.9, 4, 'booth');
  deco.push({ t: 'roof', x: 11.5, y: 3.9, z: 3, w: 2.8, h: 1 });
  deco.push({ t: 'pole', x: 14, y: 1.5, z: 6, h: 8, flag: 'ar' }, { t: 'pole', x: 14, y: 1.5, z: 8, h: 8, flag: 'mis' }, { t: 'pole', x: 14, y: 1.5, z: 10, h: 8, flag: 'ucp' });
  /* ---- calle ---- */
  add(-10, 0, 20, -7, 1, 22, 'smooth'); add(6, 0, 22, 9, 1, 24, 'smooth');
  deco.push({ t: 'bush', x: -8.5, y: 1, z: 21, r: .8 }, { t: 'bush', x: 7.5, y: 1, z: 23, r: .8 });
  /* =========================== EDIFICIO =========================== */
  // base oscura (zócalo) y piso de baldosas de la planta baja
  add(-16, 0, -28, 22, 3, -6, 'navy');
  add(-15.6, 3, -27.6, 21.6, 3.05, -6.4, 'tiles');
  // fachada con la entrada, puerta lateral, ventanas de aulas, balcón de la biblioteca y ventanitas cuadradas
  wall(-16, -6.4, 22, -6, 3, 15, [D(-10, -2, 3, 6.6), D(17.5, 21, 3, 5.6),
    D(-14, -11, 7.8, 9.4), D(-7, -4, 7.8, 9.4), D(3, 6, 7.8, 9.4), D(9, 12, 7.8, 9.4), D(15, 15.8, 8.6, 9.4), D(16.6, 17.4, 8.6, 9.4),
    D(-14, -11, 11, 13.4), D(-7, -4, 11.8, 13.4), D(3, 6, 11.8, 13.4), D(9, 12, 11.8, 13.4), D(15, 15.8, 12.6, 13.4), D(16.6, 17.4, 12.6, 13.4)], 'whitewall');
  wall(-16, -28, 22, -27.6, 3, 15, [D(-8, -4, 7.8, 9.4), D(4, 8, 7.8, 9.4), D(-8, -4, 11.8, 13.4), D(2.5, 5.5, 11, 13.4)], 'whitewall');
  // escalera de emergencia por detrás: sube pegada al edificio desde el patio hasta la puerta de la biblioteca
  stairs(-20, -30, 2, -28, 0, .25, 44, 'x', 1, 'step');
  add(2, 0, -30, 6, 11, -28, 'metal');
  add(-20, 0, -30.05, 6, 1, -30, 'rail');
  wall(-16, -27.6, -15.6, -6.4, 3, 15, [D(-12, -9, 3, 5.6), D(-22, -18, 7.8, 9.4), D(-12, -9, 7.8, 9.4), D(-22, -18, 11.8, 13.4)], 'whitewall');
  add(21.6, 3, -27.6, 22, 15, -6.4, 'whitewall');
  // escalera: tres tramos en el lado este (planta baja → 1º → 2º → techo)
  // losa del primer piso con el hueco del ascensor (x 12.6–15.2, z -11.6…-9)
  add(-15.6, 6.6, -27.6, 12.6, 7, -6.4, 'tiles'); add(12.6, 6.6, -27.6, 15.2, 7, -11.6, 'tiles'); add(12.6, 6.6, -9, 15.2, 7, -6.4, 'tiles'); add(15.2, 6.6, -27.6, 19.3, 7, -6.4, 'tiles');
  add(19.3, 6.6, -27.6, 21.6, 7, -24, 'tiles'); add(19.3, 6.6, -16, 21.6, 7, -6.4, 'tiles');
  add(-15.6, 10.6, -27.6, 17, 11, -6.4, 'tiles'); add(17, 10.6, -27.6, 19.3, 11, -24, 'tiles'); add(17, 10.6, -16, 19.3, 11, -6.4, 'tiles'); add(19.3, 10.6, -27.6, 21.6, 11, -6.4, 'tiles');
  add(-16, 14.6, -28, 19.3, 15, -6, 'roof'); add(19.3, 14.6, -28, 22, 15, -24, 'roof'); add(19.3, 14.6, -16, 22, 15, -6, 'roof');
  stairs(19.3, -24, 21.6, -16, 3, .25, 16, 'z', -1, 'step');
  stairs(17, -24, 19.3, -16, 7, .25, 16, 'z', 1, 'step');
  stairs(19.3, -24, 21.6, -16, 11, .25, 16, 'z', -1, 'step');
  add(19.22, 3.05, -24, 19.38, 14.6, -16, 'whitewall');                  // tabique entre tramos (nadie queda encajado debajo)
  add(19.3, 7, -16.15, 21.6, 8, -16, 'rail'); add(17, 11, -24.15, 19.3, 12, -24, 'rail'); add(19.3, 15, -16.15, 22, 16, -16, 'rail');
  wall(16.6, -27.6, 17, -6.4, 3, 6.6, [D(-11, -8, 3, 5.6)], 'whitewall');
  wall(16.6, -27.6, 17, -6.4, 7, 10.6, [D(-27.2, -24.6, 7, 9.6)], 'whitewall');
  wall(16.6, -27.6, 17, -6.4, 11, 14.6, [D(-11, -8, 11, 13.6)], 'whitewall');
  // ascensor de salto: tubo de vidrio entre la planta baja y el primer piso, abierto hacia el oeste.
  // Pisá el saltador para subir; para bajar, tirate por el hueco (si caés encima no te vuelve a lanzar)
  add(12.6, 3.05, -11.6, 15.2, 10.6, -11.4, 'tube'); add(12.6, 3.05, -9.2, 15.2, 10.6, -9, 'tube'); add(15, 3.05, -11.4, 15.2, 10.6, -9.2, 'tube');
  add(12.55, 3.05, -11.65, 12.65, 10.6, -11.55, 'neonC', { nc: 1 }); add(12.55, 3.05, -9.05, 12.65, 10.6, -8.95, 'neonC', { nc: 1 });
  add(12.6, 6.98, -11.4, 12.8, 7.02, -9.2, 'neonC', { nc: 1 });
  pads.push({ x: 13.9, y: 3.05, z: -10.3, r: .75, t: [10.4, 7, -10.3], apex: 1.6, soft: 1 });
  // planta baja: hall con recepción y aulas al fondo
  add(-6, 3.05, -12, 0, 4.1, -11, 'wood');
  wall(-15.6, -18.2, 16.6, -17.8, 3.05, 6.6, [D(-12, -9, 3, 5.6), D(-1, 2, 3, 5.6), D(9, 12, 3, 5.6)], 'whitewall');
  add(-4.2, 3.05, -27.6, -3.8, 6.6, -18.2, 'whitewall'); add(5.8, 3.05, -27.6, 6.2, 6.6, -18.2, 'whitewall');
  for (const [x0, x1] of [[-14, -6], [-2, 4], [8, 15]]) for (const z of [-25, -22]) add(x0, 3.05, z, x1, 3.85, z + .8, 'wood');
  // primer piso: pasillo sobre la fachada y aulas
  wall(-15.6, -12.2, 16.6, -11.8, 7, 10.6, [D(-12, -9, 7, 9.6), D(-2, 1, 7, 9.6), D(8, 11, 7, 9.6)], 'whitewall');
  add(-4.2, 7, -27.6, -3.8, 10.6, -12.2, 'whitewall'); add(5.8, 7, -27.6, 6.2, 10.6, -12.2, 'whitewall');
  for (const [x0, x1] of [[-14, -6], [-2, 4], [8, 15]]) for (const z of [-24, -20, -16]) add(x0, 7, z, x1, 7.8, z + .8, 'wood');
  add(-14, 7, -27.5, -9, 9.4, -27.3, 'board'); add(-2, 7, -27.5, 4, 9.4, -27.3, 'board');
  // segundo piso: biblioteca abierta con estanterías y balcón
  for (const z of [-25, -21, -17]) { add(-13, 11, z, -3, 13, z + .6, 'wood'); add(1, 11, z, 12, 13, z + .6, 'wood'); }
  add(-15, 10.6, -6, -10, 11, -3.6, 'whitewall');
  add(-15, 11, -3.75, -10, 12, -3.6, 'rail'); add(-15, 11, -6, -14.85, 12, -3.6, 'rail'); add(-10.15, 11, -6, -10, 12, -3.6, 'rail');
  // terraza en el techo con parapeto
  add(-16, 15, -6.4, 22, 16, -6, 'whitewall'); add(-16, 15, -28, 22, 16, -27.6, 'whitewall');
  add(-16, 15, -27.6, -15.6, 16, -6.4, 'whitewall'); add(21.6, 15, -27.6, 22, 16, -6.4, 'whitewall');
  add(4, 15, -22, 10, 17, -18, 'metal');                            // sala de máquinas
  /* ---- cartel, logo y equipos de aire ---- */
  deco.push({ t: 'logo', x: 0, y: 5.4, z: -5.92, r: 1.15 });
  deco.push({ t: 'sign', x: 6.3, y: 5.4, z: -5.92, w: 9, h: 1.9 });
  for (const [x, y] of [[13.5, 8.8], [16.5, 10.2], [13.5, 12.6], [18.5, 12.2]]) deco.push({ t: 'ac', x, y, z: -5.75 });
  deco.push({ t: 'lamp', x: -5, y: 5.6, z: -5.92 }, { t: 'lamp', x: 12, y: 5.6, z: -5.92 }, { t: 'lamp', x: 18, y: 2.2, z: -5.92 });
  /* ---- ítems ---- */
  I('w2', 3, 1.5, 1); I('w3', 0, 0, 24); I('w4', 13, 3, -3.5); I('w9', -12.5, 11, -4.8); I('w8', 14, 15, -26); I('w5', 0, 15, -12);
  I('w6', -10, 7, -20); I('w1', -19, 3, -12); I('quad', 2, 11, -19); I('mega', -3, 3.05, -14.5); I('armorH', -12, 11, -26); I('armor', 19, 0, 8);
  I('health', -6, 1.5, 10); I('health', 15, 0, 20); I('health', 12, 3.05, -25); I('health', 12, 7, -9); I('health', -18, 3, -20);
  I('shells', -14, 3.05, -14); I('bullets', 6, 3, -4); I('rockets', 10, 15, -10); I('grenades', -10, 7, -9); I('slugs', 0, 7, -26); I('caza', -20, 0, 20);
  /* ---- apariciones ---- */
  [[-8, 1.5, 8], [6, 1.5, 6], [0, 1.5, 11], [13, 1.5, 11.5], [-20, 0, 22], [0, 0, 21], [18, 0, 24], [10, 3, -3.5], [-19, 3, -10],
   [-10, 3.05, -14], [8, 3.05, -14], [-10, 7, -9], [8, 7, -9], [1, 7, -13.2], [-8, 11, -12], [10, 11, -12]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: -2, y: 5.8, z: -13, c: 0xfff2dc, i: .55, d: 18 }, { x: 6, y: 9.8, z: -9, c: 0xfff2dc, i: .5, d: 20 },
    { x: 0, y: 13.6, z: -18, c: 0xffe6c0, i: .55, d: 22 }, { x: 19, y: 9, z: -20, c: 0xfff2dc, i: .45, d: 16 });
  return finish({ id: 'lacuenca', name: 'dm3 · La Cuenca', bounds: { x0: -27, x1: 27, z0: -30, z1: 28 }, deco,
    theme: { sky: 'day', fog: 0xbfd3e6, fogD: .0045, amb: 0xc9d0da, ambI: .48, hemi: [0xbcd8ff, 0x8a7a62, .42], sun: true, sunC: 0xfff1d6, sunI: .72 } });
}
const MAPS = { represa: buildRepresa(), panymanteca: buildPanYManteca(), lacuenca: buildLaCuenca(), puente: buildPuente() };
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
  for (const b of W.movers) {
    const m = b.mover, o = moverOff(m, t);
    b.off = o;
    for (let k = 0; k < 3; k++) { b.min[k] = m.min0[k]; b.max[k] = m.max0[k]; }
    b.min[m.axis] += o; b.max[m.axis] += o;
  }
}

/* =====================================================================
   COLISIÓN Y MOVIMIENTO
   ===================================================================== */
function topAt(b, x0, z0, x1, z1) {
  const r = b.ramp; if (!r) return b.max[1];
  let t;
  if (r.axis === 'x') { const L = b.max[0] - b.min[0]; t = r.dir > 0 ? (Math.min(x1, b.max[0]) - b.min[0]) / L : (b.max[0] - Math.max(x0, b.min[0])) / L; }
  else { const L = b.max[2] - b.min[2]; t = r.dir > 0 ? (Math.min(z1, b.max[2]) - b.min[2]) / L : (b.max[2] - Math.max(z0, b.min[2])) / L; }
  return r.lo + (r.hi - r.lo) * clamp(t, 0, 1);
}
const overlapXZ = (b, x0, z0, x1, z1) => b.min[0] < x1 && b.max[0] > x0 && b.min[2] < z1 && b.max[2] > z0;

function solidAt(W, x, y, z, r, h) {
  const x0 = x - r, x1 = x + r, z0 = z - r, z1 = z + r;
  for (const b of W.brushes) {
    if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
    if (b.min[1] >= y + h - EPS) continue;
    if (topAt(b, x0, z0, x1, z1) <= y + EPS) continue;
    return true;
  }
  return false;
}
function stepAxis(W, s, ax, d) {
  if (!d) return true;
  const nx = ax === 0 ? s.x + d : s.x, nz = ax === 2 ? s.z + d : s.z, r = K.R, H = hOf(s);
  const x0 = nx - r, x1 = nx + r, z0 = nz - r, z1 = nz + r;
  let rise = 0;
  for (const b of W.brushes) {
    if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
    if (b.min[1] >= s.y + H - EPS) continue;
    const top = topAt(b, x0, z0, x1, z1);
    if (top <= s.y + EPS) continue;
    const need = top - s.y;
    if (need <= K.STEP) { if (need > rise) rise = need; }
    else { if (ax === 0) s.vx = 0; else s.vz = 0; return false; }
  }
  if (rise > 0) {
    if (solidAt(W, nx, s.y + rise, nz, r, H)) { if (ax === 0) s.vx = 0; else s.vz = 0; return false; }
    s.y += rise; if (s.vy <= 0) { s.vy = 0; s.on = true; }
  }
  s.x = nx; s.z = nz; return true;
}
function stepY(W, s, h, wasOn) {
  const r = K.R, H = hOf(s), x0 = s.x - r, x1 = s.x + r, z0 = s.z - r, z1 = s.z + r;
  const ny = s.y + s.vy * h;
  if (s.vy <= 0) {
    let ground = -Infinity, gb = null;
    for (const b of W.brushes) {
      if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
      const top = topAt(b, x0, z0, x1, z1);
      if (top <= s.y + .02 && top > ground) { ground = top; gb = b; }
    }
    let land = false;
    if (ny <= ground) land = true;
    else if (wasOn && s.y - ground <= K.STEP + .05 && s.vy > -6) land = true;
    if (land) {
      s.y = ground; s.vy = 0; s.on = true;
      if (gb && gb.mover) { if (s.gb !== gb.id) { s.gb = gb.id; s.gbo = gb.off; } } else s.gb = null;
    } else { s.y = ny; s.on = false; s.gb = null; }
  } else {
    let ceil = Infinity;
    for (const b of W.brushes) {
      if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
      if (b.min[1] >= s.y + H - .02 && b.min[1] < ceil) ceil = b.min[1];
    }
    if (ny + H > ceil) { s.y = ceil - H; s.vy = 0; } else s.y = ny;
    s.on = false;
  }
}
function friction(s, h) {
  const sp = Math.hypot(s.vx, s.vz);
  if (sp < 1e-4) { s.vx = s.vz = 0; return; }
  const ctrl = sp < K.STOP ? K.STOP : sp;
  const ns = Math.max(0, sp - ctrl * K.FRIC * h) / sp;
  s.vx *= ns; s.vz *= ns;
}
function accelerate(s, wx, wz, wishspeed, acc, h, air) {
  if (wishspeed <= 0) return;
  const ws = air ? Math.min(wishspeed, K.AIRCAP) : wishspeed;
  const add = ws - (s.vx * wx + s.vz * wz);
  if (add <= 0) return;
  let as = acc * wishspeed * h; if (as > add) as = add;
  s.vx += as * wx; s.vz += as * wz;
}
/* Movimiento estilo Quake: aceleración en el aire que permite strafe-jump y bunny hop.
   cmd = {wx, wz, jump}: dirección deseada en el mundo (largo ≤ 1). */
function carry(W, s) {
  // te lleva la plataforma sobre la que estás parado
  if (s.gb != null) {
    const b = W.brushes[s.gb];
    if (b && b.mover && s.on) {
      const d = b.off - (s.gbo == null ? b.off : s.gbo);
      if (d) { if (b.mover.axis === 0) s.x += d; else if (b.mover.axis === 1) s.y += d; else s.z += d; }
      s.gbo = b.off;
    } else s.gb = null;
  }
  // si una plataforma te atraviesa, quedás parado arriba
  for (const b of W.movers) {
    if (!overlapXZ(b, s.x - K.R, s.z - K.R, s.x + K.R, s.z + K.R)) continue;
    if (b.max[1] > s.y + EPS && b.min[1] < s.y + K.H && b.max[1] - s.y < 1.2) { s.y = b.max[1]; if (s.vy < 0) s.vy = 0; s.on = true; s.gb = b.id; s.gbo = b.off; }
  }
}
function crouchUpdate(W, s, want) {
  const dh = K.H - K.HC;
  if (want && !s.crouch) { s.crouch = true; if (!s.on) s.y += dh * .35; }           // en el aire encoge las piernas
  else if (!want && s.crouch) {
    if (!s.on && !solidAt(W, s.x, s.y - dh * .35, s.z, K.R, K.H) && s.y - dh * .35 > -100) { s.crouch = false; s.y -= dh * .35; }
    else if (!solidAt(W, s.x, s.y + .01, s.z, K.R, K.H)) s.crouch = false;           // no se para si no hay lugar arriba
  }
}
function pmove(W, s, cmd, dt) {
  if (W.movers.length) carry(W, s);
  crouchUpdate(W, s, !!cmd.crouch);
  const steps = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-6)), h = dt / steps;
  let wx = cmd.wx || 0, wz = cmd.wz || 0;
  const wl = Math.hypot(wx, wz); let wish = 0;
  if (wl > 1e-4) { wish = K.MAXSPD * Math.min(1, wl); wx /= wl; wz /= wl; }
  if (s.crouch && s.on) wish *= K.CROUCH_SPD;
  const out = { jumped: false, landed: 0 };
  for (let i = 0; i < steps; i++) {
    const wasOn = s.on;
    let jumpedNow = false;
    if (s.on) {
      if (cmd.jump) { s.vy = K.JUMP; s.on = false; jumpedNow = out.jumped = true; }
      else friction(s, h);
      accelerate(s, wx, wz, wish, K.ACC, h, false);
    } else accelerate(s, wx, wz, wish, K.AIRACC, h, true);
    s.vy -= K.GRAV * h;
    const preVy = s.vy;
    stepAxis(W, s, 0, s.vx * h);
    stepAxis(W, s, 2, s.vz * h);
    stepY(W, s, h, wasOn && !jumpedNow);
    if (!wasOn && s.on && preVy < out.landed) out.landed = preVy;
  }
  return out;
}
function padReady(s, pad, landed) {
  if (!pad) { s.padArm = true; return false; }
  if (!pad.soft) return true;
  if (!s.on) return false;            // el del ascensor solo funciona parado encima
  if (landed) s.padArm = false;
  return s.padArm !== false;
}
function triggers(W, s) {
  const out = { pad: null, tele: null, lava: 0 };
  for (const p of W.pads) if (Math.abs(s.y - p.y) < .35 && Math.hypot(s.x - p.x, s.z - p.z) < p.r) out.pad = p;
  for (const t of W.teles) if (Math.abs(s.y - t.y) < .6 && Math.hypot(s.x - t.x, s.z - t.z) < t.r) out.tele = t;
  for (const l of W.lava) if (s.x > l.min[0] && s.x < l.max[0] && s.z > l.min[2] && s.z < l.max[2] && s.y < l.max[1] && s.y > l.min[1] - 1) { out.lava = l.dps; if (l.water) out.water = 1; }
  return out;
}
function padVel(px, py, pz, tx, ty, tz, apex) {
  const g = K.GRAV, top = Math.max(py, ty) + apex;
  const vy = Math.sqrt(2 * g * (top - py)), T = vy / g + Math.sqrt(2 * (top - ty) / g);
  return [(tx - px) / T, vy, (tz - pz) / T];
}
function launchPad(s, p) { const v = padVel(s.x, s.y, s.z, p.t[0], p.t[1], p.t[2], p.apex); s.vx = v[0]; s.vy = v[1]; s.vz = v[2]; s.on = false; }

/* ---------- Raycast contra el mundo ---------- */
function rayBrush(b, ox, oy, oz, dx, dy, dz) {
  let t0 = -Infinity, t1 = Infinity, ax = -1, sg = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < b.min[a] || o[a] > b.max[a]) return null; continue; }
    let ta = (b.min[a] - o[a]) / d[a], tb = (b.max[a] - o[a]) / d[a], s = -1;
    if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; }
    if (ta > t0) { t0 = ta; ax = a; sg = s; }
    if (tb < t1) t1 = tb;
  }
  if (t0 > t1 || t1 < 0 || t0 < 0) return null;
  const n = [0, 0, 0]; n[ax] = sg;
  if (b.ramp) {
    const r = b.ramp, L = r.axis === 'x' ? b.max[0] - b.min[0] : b.max[2] - b.min[2];
    const k = (r.hi - r.lo) / L, sgn = r.dir > 0 ? 1 : -1, ai = r.axis === 'x' ? 0 : 2, u0 = r.dir > 0 ? b.min[ai] : b.max[ai];
    const hx = ox + dx * t0, hy = oy + dy * t0, hz = oz + dz * t0;
    const top = r.lo + k * sgn * ((ai === 0 ? hx : hz) - u0);
    if (hy > top + 1e-4) {
      const den = dy - k * sgn * d[ai];
      if (Math.abs(den) < 1e-9) return null;
      const tp = (r.lo + k * sgn * (o[ai] - u0) - oy) / den;
      if (tp < t0 - 1e-6 || tp > t1 + 1e-6) return null;
      const nn = [0, 1, 0]; nn[ai] = -k * sgn; const l = Math.hypot(nn[0], nn[1], nn[2]);
      return { t: Math.max(0, tp), n: [nn[0] / l, nn[1] / l, nn[2] / l] };
    }
  }
  return { t: t0, n };
}
function raycast(W, ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, n = null;
  for (const b of W.brushes) {
    if (b.nc) continue;
    const h = rayBrush(b, ox, oy, oz, dx, dy, dz);
    if (h && h.t < best) { best = h.t; n = h.n; }
  }
  return n ? { t: best, n } : null;
}
function los(W, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1e-6;
  return !raycast(W, ax, ay, az, dx / d, dy / d, dz / d, d - .05);
}

/* ---------- Jugadores como objetivos ---------- */
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = ox - cx, ly = oy - cy, lz = oz - cz, b = lx * dx + ly * dy + lz * dz, c = lx * lx + ly * ly + lz * lz - r * r, disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc); let t = -b - s; if (t < 0) t = -b + s; return t < 0 ? -1 : t;
}
const SPH = [[.5, .42, 0], [1.1, .48, 0], [1.6, .26, 1]];
function rayPlayer(x, y, z, ox, oy, oz, dx, dy, dz, crouch) {
  let best = null; const k = crouch ? .62 : 1;
  for (const s of SPH) {
    const t = raySphere(ox, oy, oz, dx, dy, dz, x, y + s[0] * k, z, s[1]);
    if (t >= 0 && (!best || t < best.t)) best = { t, head: !!s[2] };
  }
  return best;
}
function boxDist(x, y, z, px, py, pz) {
  const dx = Math.max(px - K.R - x, 0, x - (px + K.R)), dy = Math.max(py - y, 0, y - (py + K.H)), dz = Math.max(pz - K.R - z, 0, z - (pz + K.R));
  return Math.hypot(dx, dy, dz);
}
function dirFromAngles(yaw, pitch) { const c = Math.cos(pitch); return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]; }

/* ---------- Proyectiles ---------- */
function projLaunch(w, d) {
  const W_ = WEAPONS[w];
  if (W_.proj === 'grenade') return [d[0] * W_.speed, d[1] * W_.speed + 3, d[2] * W_.speed];
  return [d[0] * W_.speed, d[1] * W_.speed, d[2] * W_.speed];
}
function projStep(W, p, dt) {
  p.life -= dt;
  if (p.k === 'grenade' || p.k === 'molotov') p.v[1] -= 18 * dt;
  else if (p.k === 'bullet') p.v[1] -= 9 * dt;
  const dx = p.v[0] * dt, dy = p.v[1] * dt, dz = p.v[2] * dt, L = Math.hypot(dx, dy, dz);
  if (L > 1e-6) {
    const h = raycast(W, p.x, p.y, p.z, dx / L, dy / L, dz / L, L);
    if (h) {
      const t = Math.max(0, h.t - .06);
      p.x += dx / L * t; p.y += dy / L * t; p.z += dz / L * t;
      if (p.k === 'rocket' || p.k === 'bullet' || p.k === 'molotov') return { boom: true, n: h.n };
      const n = h.n, dot = p.v[0] * n[0] + p.v[1] * n[1] + p.v[2] * n[2];
      p.v[0] -= 2 * dot * n[0]; p.v[1] -= 2 * dot * n[1]; p.v[2] -= 2 * dot * n[2];
      const damp = n[1] > .7 ? .45 : .6;
      p.v[0] *= damp; p.v[1] *= damp; p.v[2] *= damp;
      if (n[1] > .7 && Math.hypot(p.v[0], p.v[1], p.v[2]) < 1.2) { p.v[0] = p.v[1] = p.v[2] = 0; }
      p.bounced = true;
    } else { p.x += dx; p.y += dy; p.z += dz; }
  }
  return p.life <= 0 ? { boom: true, n: null } : null;
}

/* =====================================================================
   NAVEGACIÓN DE BOTS (grilla de 1 m generada desde el mapa)
   ===================================================================== */
const NAVS = {};
function inLava(W, x, y, z) { for (const l of W.lava) if (x > l.min[0] && x < l.max[0] && z > l.min[2] && z < l.max[2] && y < l.max[1] + .05 && y > l.min[1] - .5) return true; return false; }
function airtime(dy) { const disc = K.JUMP * K.JUMP - 2 * K.GRAV * dy; if (disc < 0) return 0; return (K.JUMP + Math.sqrt(disc)) / K.GRAV; }
function buildNav(W) {
  const X0 = Math.floor(W.bounds.x0), Z0 = Math.floor(W.bounds.z0), NX = Math.ceil(W.bounds.x1) - X0, NZ = Math.ceil(W.bounds.z1) - Z0;
  const cells = new Array(NX * NZ), nodes = [];
  for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) {
    const px = X0 + cx + .5, pz = Z0 + cz + .5, tops = [];
    for (const b of W.brushes) {
      // se mira un poquito corrido del centro para no caer justo en el borde entre dos escalones
      const qx = px + .013, qz = pz + .017;
      if (b.nc || b.mover || !(b.min[0] < qx && b.max[0] > qx && b.min[2] < qz && b.max[2] > qz)) continue;
      const t = topAt(b, qx, qz, qx, qz);
      if (t > 12.5) continue;
      if (!tops.some(q => Math.abs(q - t) < .05)) tops.push(t);
    }
    const list = [];
    for (const t of tops) {
      // lo que sobresale menos que un escalón no estorba (escaleras de huella corta)
      if (solidAt(W, px, t + K.STEP + .01, pz, .3, 1.75 - K.STEP)) continue;
      if (inLava(W, px, t, pz)) continue;
      const n = { id: nodes.length, x: px, y: t, z: pz, c: cx + cz * NX, l: [] };
      nodes.push(n); list.push(n);
    }
    cells[cx + cz * NX] = list;
  }
  const at = (cx, cz) => (cx < 0 || cz < 0 || cx >= NX || cz >= NZ) ? [] : cells[cx + cz * NX];
  const near = (list, y, tol) => { let best = null; for (const m of list) if (Math.abs(m.y - y) <= tol && (!best || Math.abs(m.y - y) < Math.abs(best.y - y))) best = m; return best; };
  const edges = [];
  for (const n of nodes) {
    const cx = n.c % NX, cz = (n.c / NX) | 0;
    let edge = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const m = near(at(cx + dx, cz + dz), n.y, .6);
      if (m) {
        if (dx && dz && (!near(at(cx + dx, cz), n.y, .6) || !near(at(cx, cz + dz), n.y, .6))) continue;
        // todos los nodos vecinos a menos de un escalón (en las escaleras puede haber dos en la misma celda)
        for (const q of at(cx + dx, cz + dz)) if (Math.abs(q.y - n.y) <= .6) n.l.push([q.id, dx && dz ? 1.414 : 1, 0]);
      } else if (!dx || !dz) {
        edge = true;
        let low = null;
        for (const q of at(cx + dx, cz + dz)) if (q.y < n.y - .6 && q.y > n.y - 14 && (!low || q.y > low.y)) low = q;
        // solo si el cuerpo entra en la columna de al lado a la altura de partida (no atravesar paredes sobre puertas)
        if (low && !solidAt(W, low.x, n.y + .05, low.z, .3, 1.7)) n.l.push([low.id, 1.5, 1]);
      }
    }
    if (edge) edges.push(n);
  }
  // saltos entre bordes (huecos y plataformas)
  for (const n of edges) {
    for (const m of edges) {
      if (m === n) continue;
      const dx = m.x - n.x, dz = m.z - n.z, d = Math.hypot(dx, dz);
      if (d < 1.9 || d > 6.3) continue;
      const dy = m.y - n.y;
      if (dy > 1.25 || dy < -5) continue;
      if (d - 1 > 9.2 * airtime(dy)) continue;
      let bridged = true;
      for (const f of [.25, .5, .75]) {
        const qx = Math.floor(n.x + dx * f) - X0, qz = Math.floor(n.z + dz * f) - Z0, qy = n.y + dy * f;
        if (!near(at(qx, qz), qy, .7)) { bridged = false; break; }
      }
      if (bridged) continue;
      if (!los(W, n.x, n.y + 1, n.z, m.x, m.y + 1, m.z)) continue;
      if (!los(W, n.x, n.y + 1.7, n.z, m.x, m.y + 1.7, m.z)) continue;
      n.l.push([m.id, d + 1.5, 2]);
    }
  }
  const nodeAt = (x, y, z) => {
    const cx = Math.floor(x) - X0, cz = Math.floor(z) - Z0; let best = null;
    for (const m of at(cx, cz)) if (m.y <= y + .7 && (!best || m.y > best.y)) best = m;
    return best;
  };
  for (const p of W.pads) {
    const a = nodeAt(p.x, p.y + .1, p.z), b = nodeAt(p.t[0], p.t[1] + .1, p.t[2]);
    if (a && b) a.l.push([b.id, 4, 3]);
  }
  for (const t of W.teles) {
    const a = nodeAt(t.x, t.y + .1, t.z), b = nodeAt(t.to[0], t.to[1] + .1, t.to[2]);
    if (a && b) a.l.push([b.id, 3, 4]);
  }
  // adyacencia compacta para búsquedas rápidas
  const N = nodes.length; let E = 0; nodes.forEach(n => E += n.l.length);
  const off = new Int32Array(N + 1), to = new Int32Array(E), cost = new Float32Array(E);
  let k = 0;
  nodes.forEach((n, i) => { off[i] = k; n.l.forEach(l => { to[k] = l[0]; cost[k] = l[1]; k++; }); });
  off[N] = k;
  return { X0, Z0, NX, NZ, cells, nodes, at, nodeAt, off, to, cost };
}
function getNav(W) { W = W || WORLD; if (!NAVS[W.id]) NAVS[W.id] = buildNav(W); return NAVS[W.id]; }
function findNode(nav, x, y, z) {
  let n = nav.nodeAt(x, y, z);
  if (n) return n;
  const cx = Math.floor(x) - nav.X0, cz = Math.floor(z) - nav.Z0; let best = null, bd = 1e9;
  for (let r = 1; r <= 4 && !best; r++)
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      for (const m of nav.at(cx + dx, cz + dz)) {
        if (m.y > y + 1.3) continue;
        const d = Math.hypot(m.x - x, (m.y - y) * 2, m.z - z);
        if (d < bd) { bd = d; best = m; }
      }
    }
  return best;
}
function dijkstra(nav, start) {
  const N = nav.nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const off = nav.off, to = nav.to, cost = nav.cost;
  let cap = 1024, hk = new Float64Array(cap), hv = new Int32Array(cap), size = 0;
  const push = (i, d) => {
    if (size === cap) { cap *= 2; const a = new Float64Array(cap), b = new Int32Array(cap); a.set(hk); b.set(hv); hk = a; hv = b; }
    let c = size++;
    while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= d) break; hk[c] = hk[p]; hv[c] = hv[p]; c = p; }
    hk[c] = d; hv[c] = i;
  };
  dist[start] = 0; push(start, 0);
  while (size) {
    const d = hk[0], i = hv[0];
    size--;
    if (size) {
      const kd = hk[size], kv = hv[size]; let c = 0;
      for (;;) { const l = 2 * c + 1; if (l >= size) break; const m = l + 1 < size && hk[l + 1] < hk[l] ? l + 1 : l; if (hk[m] >= kd) break; hk[c] = hk[m]; hv[c] = hv[m]; c = m; }
      hk[c] = kd; hv[c] = kv;
    }
    if (d > dist[i]) continue;
    for (let e = off[i], ee = off[i + 1]; e < ee; e++) { const nd = d + cost[e], j = to[e]; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(j, nd); } }
  }
  return { dist, prev };
}
function pathTo(dj, goal) { const out = []; let i = goal; while (i !== -1) { out.push(i); i = dj.prev[i]; } return out.reverse(); }
function linkType(nav, a, b) { for (const l of nav.nodes[a].l) if (l[0] === b) return l[2]; return 0; }

/* =====================================================================
   PARTIDA — lógica autoritativa (corre en el servidor o, en práctica,
   dentro del navegador)
   ===================================================================== */
/* Dificultad de los bots. Cada nivel cambia todo, no solo la puntería:
   react  segundos que tarda en empezar a disparar después de verte
   err    error de puntería (radianes)       turn   velocidad para girar (rad/s)
   track  qué tan rápido sigue tus movimientos (más bajo = apunta a donde estabas)
   lead   cuánto adelanta cohetes y granadas  fire   multiplica la cadencia (más alto = dispara más lento)
   dmg    multiplica el daño que hace         fov / range  qué tan lejos y hacia dónde te ve
   strafe cuánto esquiva de costado          hop    probabilidad de saltar en combate */
const SKILL = [
  { name: 'Fácil',     react: .9,  err: .14,  turn: 3,   track: 6,   lead: 0,   fire: 2.2, dmg: .55, fov: .5,  range: 38, strafe: .3,  hop: 0 },
  { name: 'Normal',    react: .6,  err: .09,  turn: 4.5, track: 8,   lead: .45, fire: 1.5, dmg: .8,  fov: .15, range: 52, strafe: .65, hop: .12 },
  { name: 'Difícil',   react: .3,  err: .05,  turn: 8.5, track: 14,  lead: .8,  fire: 1.1, dmg: 1,   fov: -.2, range: 68, strafe: 1,   hop: .3 },
  { name: 'Pesadilla', react: .14, err: .02,  turn: 15,  track: 28,  lead: 1,   fire: 1,   dmg: 1.1, fov: -.5, range: 80, strafe: 1.15, hop: .45 }
];
/* ---------- palabras censuradas (chat y nombres) ----------
   Se comparan palabras enteras después de normalizar: sin tildes, números y símbolos como letras (4→a, 1→i, 0→o…),
   y→i, b→v, th→t, letras repetidas juntas una sola vez y sin puntos ni guiones entre letras. "banana" o "mañana" no se tocan. */
const BAD_WORDS = ['fati', 'fatima', 'fatimita', 'fatita', 'fatii', 'ana', 'anita', 'anana', 'vani', 'vanina', 'vaninita', 'vanita', 'vagina', 'vajina', 'vrenda', 'vrendita'];
const BAD_SET = new Set(BAD_WORDS.flatMap(w => [w, w + 's']));
const LEET = { '4': 'a', '@': 'a', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'v', '6': 'g', '9': 'g' };
function normWord(w) {
  let x = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  x = x.replace(/[4@1!|30$56789]/g, c => LEET[c] || c).replace(/[^a-zñ]/g, '').replace(/ñ/g, 'n');
  x = x.replace(/th/g, 't').replace(/y/g, 'i').replace(/b/g, 'v').replace(/(.)\1+/g, '$1');
  return x;
}
function isBad(w) {
  const t = n => n.length >= 3 && BAD_SET.has(n);
  // con y sin los signos de los bordes ("vanina!!", "¡ana!")
  const edge = String(w).replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
  return t(normWord(w)) || t(normWord(edge)) || t(normWord(edge.replace(/^\d+|\d+$/g, '')));
}
function censor(text) {
  text = String(text || '');
  // palabras separadas por espacios o signos
  let out = text.replace(/[^\s]+/g, tok => {
    if (isBad(tok)) return '*'.repeat(Math.min(8, tok.length));
    // dentro de un token con signos (fati_ana, ana-123): cada pedazo de letras por separado
    return tok.replace(/[a-zA-ZÀ-ÿñÑ0-9@$!|]+/g, part => isBad(part) ? '*'.repeat(Math.min(8, part.length)) : part);
  });
  // letras sueltas separadas por espacios: "a n a", "f a t i"
  out = out.replace(/(?:^|(?<=\s))((?:\S\s+){2,}\S)(?=\s|$)/g, seq => {
    const letters = seq.split(/\s+/);
    if (letters.every(l => l.length === 1) && isBad(letters.join(''))) return '*'.repeat(letters.length);
    return seq;
  });
  return out;
}
function cleanName(n) { n = censor(String(n || '').replace(/[\u0000-\u001f<>]/g, '')).replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); return n || 'Jugador'; }
const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanSkin(k, fallback) {
  const f = fallback || { c: COLORS[0], v: '#ffffff', a: 0 };
  if (!k || typeof k !== 'object') return Object.assign({}, f);
  const out = { c: HEX.test(k.c) ? k.c : f.c, v: HEX.test(k.v) ? k.v : f.v, a: Number.isInteger(k.a) && k.a >= 0 && k.a < ACCESSORIES.length ? k.a : 0 };
  if (okChestImg(k.img)) out.img = k.img;
  return out;
}
// imagen del pecho: JPEG cuadrado chico (el navegador la recorta y achica a 96×96 antes de mandarla)
const okChestImg = s => typeof s === 'string' && s.length <= 24000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s);
const SHOP_BY_ID = {}; SHOP.forEach(it => SHOP_BY_ID[it.id] = it);

class Game {
  constructor(o) {
    this.o = Object.assign({ fraglimit: 20, timelimit: 600, caplimit: 3, bots: null, botFill: 0, botSkill: 1, online: false, maxPlayers: 16, map: null, rotate: true, mode: 'arena' }, o || {});
    if (!MODES[this.o.mode]) this.o.mode = 'arena';
    this.mode = MODES[this.o.mode];
    this.players = new Map(); this.nextId = 1; this.projs = []; this.fires = []; this.pid = 1; this.vote = null; this.bans = new Map();
    this.time = 0; this.snapT = 0; this.scT = 0; this.botT = 0; this.state = 'play'; this.left = this.o.timelimit; this.interT = 0;
    this.ts = [0, 0]; this.flags = []; this.countT = 0;
    if (this.mode.minPlayers && this.o.online) this.state = 'lobby';
    this.o.map = mapId(this.o.map);
    this.setMap(this.mode.maps.includes(this.o.map) ? this.o.map : this.mode.maps[0]);
  }
  setMap(id) {
    this.W = MAPS[id]; this.nav = getNav(this.W); safeSpawns(this.W);
    // en gungame no hay armas ni munición tiradas: cada uno tiene la de su nivel
    const off = t => !!this.mode.gg; // en gungame no hay nada tirado: cada arma se gana con bajas
    this.items = this.W.items.map((it, i) => ({ i, type: it.type, x: it.x, y: it.y, z: it.z, off: off(it.type), up: !off(it.type), t: 0 }));
    this.projs.length = 0; this.fires = [];
    this.resetFlags();
    updateMovers(this.W, this.time);
  }
  resetFlags() {
    this.ts = [0, 0];
    this.flags = this.mode.ctf && this.W.flags ? this.W.flags.map((f, i) => ({ team: i, st: 0, by: 0, x: f.x, y: f.y, z: f.z, t: 0 })) : [];
  }
  // 'lobby' y 'count' = calentamiento antes de que arranque el Team Deathmatch: se juega pero no se cuenta
  live() { return this.state === 'play' || this.state === 'lobby' || this.state === 'count'; }
  flagState() { return this.flags.map(f => [f.st, f.by, r2(f.x), r2(f.y), r2(f.z)]); }
  /* ---- conexiones ---- */
  addClient(send) {
    if (this.humanCount(true) >= this.o.maxPlayers) { send({ t: 'full' }); return 0; }
    const id = this.nextId++;
    const p = this.newPlayer(id, 'Jugador', { c: COLORS[id % COLORS.length], v: '#ffffff', a: 0 }, false);
    p.send = send; this.players.set(id, p); return id;
  }
  removeClient(id) {
    const p = this.players.get(id); if (!p) return;
    this.players.delete(id);
    this.dropCarried(p);
    if (p.acct && this.state === 'play' && this.o.onXP) { const xp = this.matchXP(p, false, false); if (xp > 0) this.o.onXP(p, xp, { kills: p.kills, partida: 0, victoria: 0 }); }
    if (p.joined) { this.bcast({ t: 'ev', e: 'leave', id, n: p.name }); this.botT = 0; }
    if (this.vote) this.checkVote();
  }
  newPlayer(id, name, skin, bot) {
    return { id, name, skin, color: skin.c, bot, send: null, s: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, on: false }, yaw: 0, pitch: 0, w: 1,
      hp: 100, ar: 0, am: AMMO0(0), ow: OW0(), mag: {}, relT: {}, alive: false, deadT: 0,
      frags: 0, deaths: 0, quadT: 0, lavaT: 0, megaT: 0, lastFire: -9, ping: 0, dirty: true, joined: false, ai: null, spawnT: 0, padT: 0,
      cr: ECON.START, unl: OW0(), perk: { ar: 0, am: 0 }, streak: 0, lvl: 0, team: -1, caps: 0, kills: 0, acct: null, plvl: 0, joinT: 0, role: id % 3 === 0 ? 'def' : 'att' };
  }
  // el servidor avisa qué cuenta tiene cada jugador (para su nivel y para sumarle experiencia)
  setAccount(id, a) { const p = this.players.get(id); if (!p) return; p.acct = a ? a.sub : null; p.plvl = a ? a.level : 0; if (p.joined) this.sendScores(); }
  matchXP(p, finished, won) {
    if (!p.acct || p.bot) return 0;
    const mins = (this.time - p.joinT) / 60;
    let xp = p.kills * XP.KILL + p.caps * XP.CAP + (finished ? XP.PLAY + (won ? XP.WIN : 0) : Math.min(XP.PLAY, Math.floor(mins) * XP.PER_MIN));
    if (!finished && mins < 1) xp = Math.min(xp, p.kills * XP.KILL);
    return Math.min(XP.MAX_MATCH, xp);
  }
  teamCount(t, except) { let n = 0; for (const q of this.players.values()) if (q.joined && q.team === t && q !== except) n++; return n; }
  pickTeam(p) { const a = this.teamCount(0, p), b = this.teamCount(1, p); return a < b ? 0 : b < a ? 1 : (Math.random() < .5 ? 0 : 1); }
  setTeam(p, t) { p.team = t; p.color = TEAMS[t].c; }
  humanCount(all) { let n = 0; for (const p of this.players.values()) if (!p.bot && (all || p.joined)) n++; return n; }
  bcast(m, except) { for (const p of this.players.values()) if (p.send && p.joined && p.id !== except) p.send(m); }
  roster() { return [...this.players.values()].filter(p => p.joined).map(p => [p.id, p.name, p.color, p.bot ? 1 : 0, p.skin, p.team]); }
  mult(p) { return p.quadT > 0 ? 4 : 1; }

  /* ---- mensajes de clientes ---- */
  onMessage(id, m) {
    const p = this.players.get(id); if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'join': {
        if (p.joined) return;
        if (this.isBanned(cleanName(m.name), p.acct, p.ip)) { p.send({ t: 'kicked', again: 1 }); if (this.o.onKick) this.o.onKick(p.id); return; }
        // si la sala estaba vacía, el primero que entra arranca una partida nueva
        if (this.o.online && this.humanCount(false) === 0 && (this.left < this.o.timelimit - 5 || this.state !== 'play')) this.restart(this.W.id);
        // el primero que entra a una sala vacía elige la dificultad de los bots
        if (this.o.online && this.humanCount(false) === 0 && Number.isInteger(m.skill) && m.skill >= 0 && m.skill < SKILL.length) this.o.botSkill = m.skill;
        p.name = this.uniqueName(cleanName(m.name));
        p.skin = cleanSkin(m.skin || { c: m.color }, p.skin); p.color = p.skin.c;
        if (this.mode.teams) this.setTeam(p, this.pickTeam(p));
        p.joined = true; p.joinT = this.time; p.kills = 0;
        if (this.mode.tdm && this.o.online && this.humanCount(false) <= 1 && Number.isInteger(m.fl) && m.fl >= 5 && m.fl <= 500) this.o.fraglimit = m.fl;
        p.send({ t: 'welcome', id, mode: this.o.mode, mp: this.mode.minPlayers || 0, team: p.team, map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), fl: this.o.fraglimit, cl: this.o.caplimit, tl: Math.ceil(this.left), roster: this.roster(), online: this.o.online, state: this.state, tm: this.time, fs: this.flagState(), ts: this.ts });
        this.bcast({ t: 'ev', e: 'join', id, n: p.name, c: p.color, s: p.skin, tm: p.team }, id);
        this.spawn(p); this.botT = 0; this.sendScores();
        break;
      }
      case 'st': {
        if (!p.joined || !p.alive) return;
        const a = m.p, v = m.v;
        if (!Array.isArray(a) || a.length !== 3 || !a.every(Number.isFinite)) return;
        p.s.x = clamp(a[0], -60, 60); p.s.y = clamp(a[1], -40, 60); p.s.z = clamp(a[2], -60, 60);
        if (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) { p.s.vx = clamp(v[0], -80, 80); p.s.vy = clamp(v[1], -80, 80); p.s.vz = clamp(v[2], -80, 80); }
        if (Number.isFinite(m.y)) p.yaw = m.y; if (Number.isFinite(m.x)) p.pitch = clamp(m.x, -1.6, 1.6);
        if (Number.isInteger(m.w) && m.w >= 0 && m.w < NW && p.ow[m.w]) p.w = m.w;
        p.s.on = !!m.o; p.s.crouch = !!m.c;
        break;
      }
      case 'fire': this.humanFire(p, m); break;
      case 'reload': { const w = m.w | 0, W_ = WEAPONS[w]; if (W_ && W_.mag && p.alive && p.mag[w] < W_.mag && !(p.relT[w] > this.time)) p.relT[w] = this.time + W_.reload * .75; break; }
      case 'buy': this.buy(p, String(m.id || '')); break;
      case 'skin': {
        if (!p.joined) return;
        p.skin = cleanSkin(m.s, p.skin); if (!this.mode.teams) p.color = p.skin.c;
        this.bcast({ t: 'ev', e: 'skin', id: p.id, s: p.skin });
        break;
      }
      case 'respawn': if (p.joined && !p.alive && p.deadT > 1 && this.live()) this.spawn(p); break;
      case 'limit': {
        const n = m.n | 0;
        if (!this.mode.tdm || n < 5 || n > 500 || (this.o.online && this.state === 'play')) return;
        this.o.fraglimit = n; this.bcast({ t: 'ev', e: 'sys', m: p.name + ' puso el límite en ' + n + ' bajas' }); this.sendScores();
        break;
      }
      case 'ping': p.send({ t: 'pong', c: m.c, tm: this.time }); if (Number.isFinite(m.r)) p.ping = Math.round(clamp(m.r, 0, 9999)); break;
      case 'chat': {
        const txt = String(m.m || '').replace(/[\u0000-\u001f]/g, '').slice(0, 120).trim();
        if (!txt) return;
        if (txt[0] === '/') this.command(p, txt); else this.bcast({ t: 'ev', e: 'chat', id: p.id, n: p.name, m: censor(txt) });
        break;
      }
      case 'cfg': if (!this.o.online) this.configure(m); break;
      case 'kick': this.startKick(p, m.id | 0); break;
      case 'vote': this.castVote(p, !!m.y); break;
    }
  }
  /* ---- votación para echar a un jugador (solo online, entre personas) ---- */
  voters(except) { return [...this.players.values()].filter(q => q.joined && !q.bot && q !== except); }
  startKick(p, id) {
    const say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (!this.o.online) return say('La votación es solo en partidas online');
    if (this.vote) return say('Ya hay una votación en curso');
    const t = this.players.get(id);
    if (!t || !t.joined || t.bot || t === p) return say('Elegí a otro jugador (los bots se sacan con /bots)');
    if (this.voters(t).length < 2) return say('Hacen falta al menos 3 jugadores para votar');
    if ((p.voteCd || 0) > this.time) return say('Esperá ' + Math.ceil(p.voteCd - this.time) + ' s para iniciar otra votación');
    p.voteCd = this.time + 90;
    this.vote = { target: t.id, name: t.name, by: p.name, yes: new Set([p.id]), no: new Set(), end: this.time + 30 };
    this.bcast({ t: 'ev', e: 'sys', m: p.name + ' inició una votación para echar a ' + t.name + ' (Y = sí · N = no)' });
    this.sendVote();
  }
  castVote(p, yes) {
    const v = this.vote; if (!v || !p.joined || p.bot || p.id === v.target) return;
    v.yes.delete(p.id); v.no.delete(p.id); (yes ? v.yes : v.no).add(p.id);
    this.sendVote(); this.checkVote();
  }
  sendVote() {
    const v = this.vote;
    if (!v) { this.bcast({ t: 'vote', on: 0 }); return; }
    const el = this.voters(this.players.get(v.target)).length, need = Math.floor(el / 2) + 1;
    for (const q of this.players.values()) if (q.send && q.joined)
      q.send({ t: 'vote', on: 1, target: v.target, name: v.name, by: v.by, y: v.yes.size, n: v.no.size, need, left: Math.max(0, Math.ceil(v.end - this.time)), me: q.id === v.target ? 2 : v.yes.has(q.id) ? 1 : v.no.has(q.id) ? -1 : 0 });
  }
  checkVote() {
    const v = this.vote; if (!v) return;
    const t = this.players.get(v.target);
    if (!t) { this.vote = null; this.bcast({ t: 'ev', e: 'sys', m: v.name + ' se fue: votación cancelada' }); this.sendVote(); return; }
    const el = this.voters(t), ids = new Set(el.map(q => q.id));
    for (const s of [v.yes, v.no]) for (const id of [...s]) if (!ids.has(id)) s.delete(id);
    const need = Math.floor(el.length / 2) + 1;
    if (v.yes.size >= need) {
      this.vote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: t.name + ' fue echado de la partida por votación' });
      // no puede volver a esta sala por 10 minutos (por cuenta y por nombre)
      const until = Date.now() + 10 * 60e3; this.bans.set('n:' + t.name.toLowerCase(), until); if (t.acct) this.bans.set('a:' + t.acct, until); if (t.ip) this.bans.set('i:' + t.ip, until);
      if (t.send) t.send({ t: 'kicked' });
      if (this.o.onKick) this.o.onKick(t.id); else this.removeClient(t.id);
      return;
    }
    if (v.no.size > el.length - need || this.time >= v.end) {
      this.vote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: 'La votación para echar a ' + v.name + ' no pasó (' + v.yes.size + ' sí, ' + v.no.size + ' no)' });
    }
  }
  isBanned(name, acct, ip) {
    const now = Date.now(), chk = k => { const u = this.bans.get(k); if (!u) return false; if (u < now) { this.bans.delete(k); return false; } return true; };
    return chk('n:' + String(name || '').toLowerCase()) || (acct && chk('a:' + acct)) || (ip && chk('i:' + ip));
  }
  uniqueName(n) { let name = n, k = 2; const used = new Set([...this.players.values()].filter(p => p.joined).map(p => p.name)); while (used.has(name)) name = n.slice(0, 13) + ' ' + (k++); return name; }
  configure(m) {
    if (m.bots !== undefined) this.o.bots = m.bots === null ? null : clamp(m.bots | 0, 0, 15);
    if (m.skill !== undefined) this.o.botSkill = clamp(m.skill | 0, 0, 3);
    if (m.fl !== undefined) { this.o.fraglimit = clamp(m.fl | 0, 1, 200); this.sendScores(); }
    if (m.map !== undefined) m.map = mapId(m.map);
    if (m.map !== undefined && this.mode.maps.includes(m.map) && m.map !== this.W.id) { this.o.map = m.map; this.restart(m.map); }
    this.botT = 0;
  }
  command(p, txt) {
    const parts = txt.slice(1).split(/\s+/), cmd = parts[0], arg = cmd === 'map' ? mapId(parts[1]) : parts[1];
    const say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (cmd === 'kick' || cmd === 'echar') {
      const q = parts.slice(1).join(' ').toLowerCase(), t = [...this.players.values()].find(x => x.joined && !x.bot && x.name.toLowerCase() === q) || [...this.players.values()].find(x => x.joined && !x.bot && q && x.name.toLowerCase().startsWith(q));
      if (!t) return say('Uso: /echar NOMBRE (o desde el menú de pausa)');
      return this.startKick(p, t.id);
    }
    if (cmd === 'si' || cmd === 'sí' || cmd === 'no') return this.castVote(p, cmd !== 'no');
    if (cmd === 'bots') {
      if (arg === 'auto') { this.o.bots = null; this.bcast({ t: 'ev', e: 'sys', m: p.name + ' activó el relleno automático de bots' }); }
      else if (/^\d+$/.test(arg || '')) { this.o.bots = clamp(+arg, 0, 15); this.bcast({ t: 'ev', e: 'sys', m: p.name + ' puso ' + this.o.bots + ' bots' }); }
      else say('Uso: /bots 0-15 o /bots auto');
      this.botT = 0;
    } else if (cmd === 'skill' && /^[0-3]$/.test(arg || '')) { this.o.botSkill = +arg; this.bcast({ t: 'ev', e: 'sys', m: 'Dificultad de bots: ' + SKILL[+arg].name }); }
    else if (cmd === 'fraglimit' && /^\d+$/.test(arg || '')) { this.o.fraglimit = clamp(+arg, 1, 200); this.sendScores(); this.bcast({ t: 'ev', e: 'sys', m: 'Límite de frags: ' + this.o.fraglimit }); }
    else if (cmd === 'caplimit' && this.mode.ctf && /^\d+$/.test(arg || '')) { this.o.caplimit = clamp(+arg, 1, 50); this.sendScores(); this.bcast({ t: 'ev', e: 'sys', m: 'Capturas para ganar: ' + this.o.caplimit }); }
    else if (cmd === 'map') {
      if (this.mode.maps.includes(arg)) { this.bcast({ t: 'ev', e: 'sys', m: p.name + ' cambió el mapa a ' + MAPS[arg].name }); this.restart(arg); }
      else say('Mapas de ' + this.mode.name + ': ' + this.mode.maps.join(', '));
    }
    else if (cmd === 'restart') { this.bcast({ t: 'ev', e: 'sys', m: p.name + ' reinició la partida' }); this.restart(); }
    else say('Comandos: /echar NOMBRE · /bots N · /bots auto · /skill 0-3 · ' + (this.mode.ctf ? '/caplimit N' : '/fraglimit N') + ' · /map ' + this.mode.maps.join('|') + ' · /restart');
  }

  /* ---- aparición ---- */
  pickSpawn(p) {
    const alive = [...this.players.values()].filter(q => q.alive && (!this.mode.teams || !p || q.team !== p.team));
    const list = this.mode.teams && p && p.team >= 0 && this.W.tspawns ? this.W.tspawns[p.team] : this.W.spawns;
    const scored = list.map(sp => {
      let d = 1e9; for (const q of alive) d = Math.min(d, Math.hypot(q.s.x - sp.x, q.s.y - sp.y, q.s.z - sp.z));
      return { sp, d: d + Math.random() * 6 };
    }).sort((a, b) => b.d - a.d);
    return scored[Math.floor(Math.random() * Math.min(3, scored.length))].sp;
  }
  loadout(p) {
    if (this.mode.gg) {
      const w = GG[Math.min(p.lvl, GG.length - 1)];
      p.ow = new Array(NW).fill(0); p.ow[w] = 1; p.ow[7] = 1; p.w = w; p.ar = 0;
      p.am = AMMO0(999); this.fillMags(p);
      return;
    }
    const mul = p.perk.am ? 2 : 1;
    p.ow = OW0(); p.am = AMMO0(0); p.am.shells = 10 * mul; p.am.bullets = 60 * mul;
    for (const it of SHOP) if (it.w != null && it.pack && p.unl[it.w]) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n * mul); }
    p.ar = p.perk.ar; this.fillMags(p);
  }
  fillMags(p) { p.mag = {}; p.relT = {}; WEAPONS.forEach((W_, i) => { if (W_.mag) p.mag[i] = W_.mag; }); }
  spawn(p) {
    const sp = this.pickSpawn(p);
    p.s = { x: sp.x, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, on: true };
    p.yaw = sp.yaw; p.pitch = 0; p.hp = 100; p.w = 1; p.quadT = 0; p.megaT = 0;
    if (p.bot && this.mode.shop) this.botShop(p);
    this.loadout(p);
    p.alive = true; p.dirty = true; p.spawnT = this.time; p.lavaT = 0;
    if (p.send) p.send({ t: 'spawn', p: [sp.x, sp.y, sp.z], yaw: sp.yaw, ow: p.ow, am: p.am, ar: p.ar, w: p.w });
    this.bcast({ t: 'ev', e: 'tp', p: [sp.x, sp.y, sp.z] });
    if (p.bot) { p.ai = this.newAI(); const best = [6, 8, 5, 3, 2, 4].find(w => p.ow[w]); if (best != null && !this.mode.gg) p.w = best; }
  }

  /* ---- tienda ---- */
  buy(p, id) {
    const it = SHOP_BY_ID[id];
    const no = why => p.send && p.send({ t: 'ev', e: 'buy', id, ok: 0, why });
    if (!this.mode.shop) return no('En ' + this.mode.name + ' no hay tienda');
    if (!it || it.free || !p.joined) return no('No se puede comprar');
    if (!this.live()) return no('La partida terminó');
    if (it.once && !p.alive) return no('Comprala cuando estés vivo: si te matan se pierde');
    if (it.once && p.am[it.pack[0]] >= AMMO_MAX[it.pack[0]]) return no('Ya llevás el máximo');
    if (it.w != null && !it.once && p.unl[it.w]) return no('Ya lo tenés');
    if (it.armor && p.perk.ar >= it.armor) return no('Ya tenés ese blindaje');
    if (it.id === 'am' && p.perk.am) return no('Ya la tenés');
    if (p.cr < it.price) return no('Te faltan ' + (it.price - p.cr) + ' créditos');
    p.cr -= it.price;
    if (it.once) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); }
    else if (it.w != null) {
      p.unl[it.w] = 1;
      if (p.alive) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); }
    } else if (it.armor) { p.perk.ar = it.armor; if (p.alive) p.ar = Math.max(p.ar, it.armor); }
    else if (it.id === 'am') { p.perk.am = 1; }
    else if (it.id === 'rf' && p.alive) {
      for (const s of SHOP) if (s.w != null && p.ow[s.w] && s.pack) { const [k, n] = s.pack; p.am[k] = Math.max(p.am[k], Math.min(AMMO_MAX[k], n * 2)); }
      p.am.shells = Math.max(p.am.shells, 20); p.am.bullets = Math.max(p.am.bullets, 100);
    }
    p.dirty = true;
    if (p.send) p.send({ t: 'ev', e: 'buy', id, ok: 1 });
    this.sendScores();
  }
  botShop(p) {
    for (const id of ['w5', 'w8', 'a1', 'w3', 'w9', 'w2', 'w6', 'a2', 'w4', 'am']) {
      const it = SHOP_BY_ID[id];
      if ((it.w != null && p.unl[it.w]) || (it.armor && p.perk.ar >= it.armor) || (id === 'am' && p.perk.am)) continue;
      if (p.cr >= it.price) { p.cr -= it.price; if (it.w != null) p.unl[it.w] = 1; else if (it.armor) p.perk.ar = it.armor; else p.perk.am = 1; }
      break;
    }
  }
  credit(p, n, why) {
    if (!this.mode.shop) return;
    p.cr = Math.min(ECON.MAX, p.cr + n); p.dirty = true;
    if (p.send) p.send({ t: 'ev', e: 'cr', n, why });
  }

  /* ---- disparos ---- */
  canFire(p, w) {
    const W_ = WEAPONS[w]; if (!W_ || !p.alive || !p.ow[w] || !this.live()) return false;
    if (W_.ammo && p.am[W_.ammo] < W_.cost && !this.mode.gg) return false;
    if (W_.mag) {
      if (p.relT[w] > this.time) return false;
      if (p.relT[w]) { p.relT[w] = 0; p.mag[w] = W_.mag; }
      if (!(p.mag[w] > 0)) { p.relT[w] = this.time + W_.reload * (p.bot ? 1 : .75); return false; }
    }
    return this.time - p.lastFire >= W_.rate * .7;
  }
  consume(p, w) {
    const W_ = WEAPONS[w]; if (W_.ammo && !this.mode.gg) p.am[W_.ammo] -= W_.cost;
    if (W_.mag) { p.mag[w]--; if (p.mag[w] <= 0) p.relT[w] = this.time + W_.reload * (p.bot ? 1 : .75); } p.lastFire = this.time; p.w = w; p.dirty = true; }
  humanFire(p, m) {
    const w = m.w | 0; if (!this.canFire(p, w)) return;
    if (!Array.isArray(m.o) || !Array.isArray(m.d) || !m.o.every(Number.isFinite) || !m.d.every(Number.isFinite)) return;
    const dl = Math.hypot(m.d[0], m.d[1], m.d[2]); if (dl < .5) return;
    const d = [m.d[0] / dl, m.d[1] / dl, m.d[2] / dl];
    let o = m.o; const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z;
    if (Math.hypot(o[0] - ex, o[1] - ey, o[2] - ez) > 3) o = [ex, ey, ez];
    this.consume(p, w);
    const W_ = WEAPONS[w];
    if (W_.type === 'proj') { this.spawnProj(p, w, o, d); return; }
    this.bcast({ t: 'ev', e: 'shot', id: p.id, w, o: r3a(o), d: r3a(d) }, p.id);
    const claims = Array.isArray(m.h) ? m.h.slice(0, 16) : [];
    const done = new Set();
    for (const c of claims) {
      if (!Array.isArray(c)) continue;
      const t = this.players.get(c[0] | 0); if (!t || !t.alive || t === p || done.has(t.id)) continue;
      done.add(t.id);
      const n = clamp(c[1] | 0, 0, W_.pel), hs = clamp(c[2] | 0, 0, n); if (!n) continue;
      if (!this.validHit(o, d, t, W_)) continue;
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (hs ? 1.5 : 1) : W_.head ? W_.dmg * (hs ? W_.head : 1) : (n + hs) * W_.dmg;
      this.damage(t, dmg * this.mult(p), p, w, d, .05, 'frag');
    }
  }
  // cuchillo como en Counter-Strike: tajo de 40; por la espalda hace casi el doble, pero nunca mata de un golpe a alguien sano
  meleeDmg(p, t, W_) {
    // segundo tajo del mismo atacante dentro de 4 segundos: muerte segura (aunque tenga megasalud)
    if (t.knifeBy === p.id && this.time - t.knifeT < 4) { t.knifeBy = 0; return 999; }
    t.knifeBy = p.id; t.knifeT = this.time;
    const ax = p.s.x - t.s.x, az = p.s.z - t.s.z, al = Math.hypot(ax, az) || 1;
    const behind = (-Math.sin(t.yaw) * ax - Math.cos(t.yaw) * az) / al < -.4;
    return W_.dmg * (behind ? W_.back : 1);
  }
  validHit(o, d, t, W_) {
    const cx = t.s.x - o[0], cy = t.s.y + 1 - o[1], cz = t.s.z - o[2];
    const proj = cx * d[0] + cy * d[1] + cz * d[2];
    if (proj < -1 || proj > (W_.range || 300) + (W_.melee ? 1.2 : 5)) return false;
    const px = cx - d[0] * proj, py = cy - d[1] * proj, pz = cz - d[2] * proj;
    // tolerancia generosa: el que dispara ve a los demás un poco en el pasado
    const sp = Math.hypot(t.s.vx, t.s.vz);
    if (Math.hypot(px, py, pz) > 2.4 + proj * .025 + sp * .25) return false;
    return los(this.W, o[0], o[1], o[2], t.s.x, t.s.y + 1.1, t.s.z) || los(this.W, o[0], o[1], o[2], t.s.x, t.s.y + 1.6, t.s.z);
  }
  trace(o, d, range, shooter, pierce) {
    const wall = raycast(this.W, o[0], o[1], o[2], d[0], d[1], d[2], range);
    const wt = wall ? wall.t : range, hits = [];
    for (const t of this.players.values()) {
      if (!t.alive || t === shooter || !t.joined) continue;
      const h = rayPlayer(t.s.x, t.s.y, t.s.z, o[0], o[1], o[2], d[0], d[1], d[2], t.s.crouch);
      if (h && h.t < wt) hits.push({ p: t, t: h.t, head: h.head });
    }
    hits.sort((a, b) => a.t - b.t);
    return { wt, n: wall ? wall.n : null, hits: pierce ? hits : hits.slice(0, 1) };
  }
  botFire(p, w, o, d) {
    if (!this.canFire(p, w)) return;
    this.consume(p, w);
    const W_ = WEAPONS[w];
    if (W_.type === 'proj') { this.spawnProj(p, w, o, d); return; }
    this.bcast({ t: 'ev', e: 'shot', id: p.id, w, o: r3a(o), d: r3a(d) });
    const acc = new Map();
    for (let i = 0; i < W_.pel; i++) {
      let dd = d;
      if (W_.spread) {
        const sx = (Math.random() + Math.random() - 1) * W_.spread, sy = (Math.random() + Math.random() - 1) * W_.spread;
        const rl = Math.hypot(d[0], d[2]) || 1, rx = -d[2] / rl, rz = d[0] / rl;
        const ux = -d[0] * d[1] / rl, uy = (d[0] * d[0] + d[2] * d[2]) / rl, uz = -d[2] * d[1] / rl;
        dd = [d[0] + rx * sx + ux * sy, d[1] + uy * sy, d[2] + rz * sx + uz * sy];
        const l = Math.hypot(dd[0], dd[1], dd[2]); dd = [dd[0] / l, dd[1] / l, dd[2] / l];
      }
      const tr = this.trace(o, dd, W_.range || 300, p, W_.type === 'rail');
      for (const h of tr.hits) { const a = acc.get(h.p) || { n: 0, hs: 0 }; a.n++; if (h.head) a.hs++; acc.set(h.p, a); }
    }
    for (const [t, a] of acc) {
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (a.hs ? 1.5 : 1) : W_.head ? W_.dmg * (a.hs ? W_.head : 1) : (a.n + a.hs) * W_.dmg;
      this.damage(t, dmg * this.mult(p) * this.skill().dmg, p, w, d, .05, 'frag');
    }
  }
  spawnProj(p, w, o, d) {
    const W_ = WEAPONS[w], v = projLaunch(w, d);
    const pr = { id: this.pid++, k: W_.proj, w, own: p.id, x: o[0], y: o[1], z: o[2], o0: o.slice(), v, life: W_.fuse || (W_.proj === 'bullet' ? 1.6 : 6), q: this.mult(p) * (p.bot ? this.skill().dmg : 1), age: 0 };
    this.projs.push(pr);
    this.bcast({ t: 'ev', e: 'proj', pid: pr.id, k: pr.k, own: p.id, p: r3a(o), v: r3a(v) });
  }
  tickProjs(dt) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      if (!this.live()) return; // la partida terminó por una explosión de este mismo tick
      const pr = this.projs[i]; if (!pr) continue;
      const ox = pr.x, oy = pr.y, oz = pr.z;
      pr.age += dt;
      const res = projStep(this.W, pr, dt);
      const dx = pr.x - ox, dy = pr.y - oy, dz = pr.z - oz, L = Math.hypot(dx, dy, dz);
      let direct = null, bt = Infinity;
      if (L > 1e-6) {
        for (const t of this.players.values()) {
          if (!t.alive || !t.joined || (t.id === pr.own && pr.age < .3)) continue;
          const h = rayPlayer(t.s.x, t.s.y, t.s.z, ox, oy, oz, dx / L, dy / L, dz / L, t.s.crouch);
          if (h && h.t <= L + .15 && h.t < bt) { bt = h.t; direct = t; }
        }
      }
      if (direct) { pr.x = ox + dx / L * bt; pr.y = oy + dy / L * bt; pr.z = oz + dz / L * bt; this.explode(pr, direct); this.projs.splice(i, 1); }
      else if (res && res.boom) { this.explode(pr, null); this.projs.splice(i, 1); }
    }
  }
  explode(pr, direct) {
    const W_ = WEAPONS[pr.w], own = this.players.get(pr.own);
    if (direct && W_.direct) {
      const sp = Math.hypot(pr.v[0], pr.v[1], pr.v[2]) || 1;
      if (pr.k === 'bullet' && own) this.huntReward(own, direct, pr);
      // granada de lleno, sin rebotar antes: más daño y premio para el que la tiró
      const clean = pr.k === 'grenade' && !pr.bounced && W_.clean && own && direct !== own && !(this.mode.teams && direct.team === own.team);
      if (clean) {
        this.credit(own, 150, 'granada directa');
        if (own.send) own.send({ t: 'ev', e: 'gdirect', n: this.mode.shop ? 150 : 0 });
        this.bcast({ t: 'ev', e: 'sys', m: own.name + ' le metió una granada directa a ' + direct.name });
      }
      this.damage(direct, (clean ? W_.clean : W_.direct) * pr.q, own, pr.w, [pr.v[0] / sp, pr.v[1] / sp, pr.v[2] / sp], pr.k === 'bullet' ? .02 : .08, 'frag');
    }
    if (W_.fire) this.startFire(pr, W_.fire);
    for (const t of this.players.values()) {
      if (!t.alive || !t.joined || t === direct) continue;
      const dist = boxDist(pr.x, pr.y, pr.z, t.s.x, t.s.y, t.s.z);
      if (dist >= W_.rad) continue;
      if (!los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .9, t.s.z) && !los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .2, t.s.z)) continue;
      const self = t.id === pr.own;
      let dmg = W_.dmg * (1 - .6 * dist / W_.rad) * pr.q; if (self) dmg *= .5;
      const cx = t.s.x - pr.x, cy = t.s.y + .9 - pr.y, cz = t.s.z - pr.z, cl = Math.hypot(cx, cy, cz) || 1;
      const ks = self && !t.bot ? 0 : .16;
      this.damage(t, dmg, own, pr.w, [cx / cl, cy / cl, cz / cl], ks / (self ? 1 : pr.q), self ? 'self' : 'frag');
    }
    this.bcast({ t: 'ev', e: 'boom', pid: pr.id, own: pr.own, k: pr.k, hit: direct ? 1 : 0, p: r3a([pr.x, pr.y, pr.z]) });
  }

  // fuego de la molotov: busca el piso debajo del impacto y quema a todos los que estén dentro
  startFire(pr, F) {
    const fl = raycast(this.W, pr.x, pr.y + .3, pr.z, 0, -1, 0, 8);
    const y = fl ? pr.y + .3 - fl.t : pr.y;
    const f = { id: this.pid++, x: pr.x, y, z: pr.z, r: F.r, t: F.dur, hit: F.hit * pr.q, every: F.every, own: pr.own, w: pr.w, tick: 0 };
    this.fires.push(f);
    this.bcast({ t: 'ev', e: 'fire', id: f.id, p: r3a([f.x, f.y, f.z]), r: f.r, d: f.t });
  }
  tickFires(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt; f.tick -= dt;
      if (f.t <= 0) { this.fires.splice(i, 1); continue; }
      if (f.tick > 0) continue;
      f.tick = f.every;
      const own = this.players.get(f.own);
      for (const t of this.players.values()) {
        if (!t.alive || !t.joined) continue;
        if (Math.hypot(t.s.x - f.x, t.s.z - f.z) > f.r || t.s.y < f.y - 1 || t.s.y > f.y + 1.6) continue;
        const self = t.id === f.own;
        this.damage(t, f.hit * (self ? .5 : 1), own || null, f.w, null, 0, self ? 'self' : 'frag');
        if (!this.live()) return;
      }
    }
  }
  // premio del rifle de caza: cuanto más lejos, más tiempo de vuelo o si el blanco estaba en el aire
  huntReward(p, t, pr) {
    if (!t.alive || t === p || (this.mode.teams && t.team === p.team)) return;
    const d = Math.hypot(pr.x - pr.o0[0], pr.y - pr.o0[1], pr.z - pr.o0[2]), air = !t.s.on, flight = pr.age;
    if (d < 22 && !air) return;
    const n = Math.min(800, 100 + Math.round(d * 6) + (air ? 150 : 0) + (d > 60 ? 100 : 0));
    this.credit(p, n, 'tiro de cazador');
    if (p.send) p.send({ t: 'ev', e: 'hunt', d: Math.round(d), air: air ? 1 : 0, n: this.mode.shop ? n : 0 });
    this.bcast({ t: 'ev', e: 'sys', m: p.name + ' cazó a ' + t.name + ' a ' + Math.round(d) + ' m' + (air ? ' en pleno salto' : '') });
  }
  /* ---- daño y muertes ---- */
  damage(t, amt, att, w, dir, ks, how) {
    if (!t.alive || !this.live() || amt <= 0) return;
    if (this.mode.teams && att && att !== t && att.team === t.team) return; // sin fuego amigo
    let take = amt;
    if (t.ar > 0 && !(w != null && WEAPONS[w] && WEAPONS[w].melee)) { const save = Math.min(t.ar, Math.ceil(amt / 3)); t.ar -= save; take -= save; }
    t.hp -= take; t.dirty = true;
    const kick = dir && ks ? [dir[0] * amt * ks, dir[1] * amt * ks, dir[2] * amt * ks] : null;
    if (t.bot) {
      if (kick) { t.s.vx += kick[0]; t.s.vy += kick[1]; t.s.vz += kick[2]; if (kick[1] > 0) t.s.on = false; }
      if (att && att !== t && t.ai) { t.ai.hurtBy = att.id; t.ai.hurtT = 2; }
    } else if (t.send) t.send({ t: 'ev', e: 'dmg', a: att ? att.id : 0, n: Math.round(amt), k: kick ? r3a(kick) : null, from: att && att !== t ? r3a([att.s.x, att.s.y + 1, att.s.z]) : null });
    if (att && att !== t && att.send) att.send({ t: 'ev', e: 'hit', id: t.id, n: Math.round(amt), k: t.hp <= 0 ? 1 : 0 });
    if (t.hp <= 0) this.kill(t, att, w, how, amt);
  }
  kill(v, att, w, how) {
    const gib = v.hp < -40;
    v.alive = false; v.deadT = 0; v.deaths++; v.dirty = true; v.quadT = 0;
    let k = 0;
    const carrier = this.flags.some(f => f.st === 1 && f.by === v.id), scoring = this.state === 'play';
    if (!scoring) { v.deaths--; k = att && att !== v ? att.id : 0; }
    else if (att && att !== v) {
      att.frags++; att.kills++; k = att.id; att.streak++;
      let n = ECON.KILL; const why = [];
      if (v.streak >= 3) { n += ECON.SHUTDOWN; why.push('cortaste una racha'); }
      if (w === 0) { n += ECON.PISTOL; why.push('con pistola'); }
      if (carrier) { n += 150; why.push('frenaste al de la bandera'); }
      this.credit(att, n, why.join(' · '));
    } else v.frags--;
    v.streak = 0;
    this.dropCarried(v);
    this.bcast({ t: 'ev', e: 'kill', k, v: v.id, w: w == null ? -1 : w, how: how || 'frag', gib: gib ? 1 : 0, p: r3a([v.s.x, v.s.y, v.s.z]) });
    if (v.bot && v.ai) v.ai.path = null;
    let won = false;
    if (this.mode.gg && scoring) won = this.ggKill(v, att, w);
    if (this.mode.tdm && scoring && att && att !== v && att.team !== v.team && att.team >= 0) { this.ts[att.team]++; if (this.ts[att.team] >= this.o.fraglimit) won = true; }
    this.sendScores();
    if (won || (scoring && !this.mode.gg && !this.mode.teams && att && att !== v && att.frags >= this.o.fraglimit)) this.endMatch();
  }
  /* ---- gungame: subir y bajar de nivel ---- */
  ggKill(v, att, w) {
    const down = (p, why) => {
      if (p.lvl <= 0) return;
      p.lvl--; p.dirty = true;
      if (p.send) p.send({ t: 'ev', e: 'lvl', n: p.lvl, w: GG[p.lvl], down: 1, why });
    };
    if (!att || att === v) { down(v, 'te mataste solo'); return false; }
    // el cuchillo siempre baja de nivel al que muere
    if (w === 7) { down(v, 'te mataron con cuchillo'); this.bcast({ t: 'ev', e: 'sys', m: att.name + ' acuchilló a ' + v.name + ' y le bajó un nivel' }); }
    if (w !== GG[att.lvl]) return false; // para subir hay que matar con el arma del nivel actual
    att.lvl++;
    if (att.lvl >= GG.length) return true;
    const nw = GG[att.lvl];
    if (att.alive) { att.ow = new Array(NW).fill(0); att.ow[nw] = 1; att.ow[7] = 1; att.w = nw; if (WEAPONS[nw].mag) { att.mag[nw] = WEAPONS[nw].mag; att.relT[nw] = 0; } att.lastFire = this.time - .5; att.dirty = true; }
    if (att.send) att.send({ t: 'ev', e: 'lvl', n: att.lvl, w: nw });
    if (att.lvl === GG.length - 1) this.bcast({ t: 'ev', e: 'sys', m: att.name + ' llegó al cuchillo: le falta una baja' });
    return false;
  }
  /* ---- captura la bandera ---- */
  flagEv(a, f, p) { this.bcast({ t: 'ev', e: 'flag', a, f: f.team, id: p ? p.id : 0, n: p ? p.name : '', fs: this.flagState(), ts: this.ts }); }
  dropCarried(p) {
    for (const f of this.flags) {
      if (f.st !== 1 || f.by !== p.id) continue;
      const hit = raycast(this.W, p.s.x, p.s.y + .5, p.s.z, 0, -1, 0, 30);
      const tr = triggers(this.W, p.s);
      if (!hit || tr.lava || p.s.y < K.KILLY + 2) { this.returnFlag(f, null); continue; }
      f.st = 2; f.by = 0; f.t = 20; f.x = p.s.x; f.y = p.s.y + .5 - hit.t; f.z = p.s.z;
      this.flagEv('drop', f, p);
    }
  }
  returnFlag(f, p) {
    const b = this.W.flags[f.team];
    f.st = 0; f.by = 0; f.t = 0; f.x = b.x; f.y = b.y; f.z = b.z;
    if (p) this.credit(p, 100, 'devolviste tu bandera');
    this.flagEv('return', f, p);
  }
  tickFlags(dt) {
    for (const f of this.flags) {
      if (f.st === 1) { const c = this.players.get(f.by); if (!c || !c.alive) { if (c) this.dropCarried(c); else this.returnFlag(f, null); } else { f.x = c.s.x; f.y = c.s.y; f.z = c.s.z; } }
      else if (f.st === 2) { f.t -= dt; if (f.t <= 0) this.returnFlag(f, null); }
    }
    for (const p of this.players.values()) {
      if (!p.alive || !p.joined || p.team < 0) continue;
      // capturar: llegar a la base propia con la bandera rival (aunque la tuya no esté)
      const e = this.flags.find(q => q.st === 1 && q.by === p.id), home = this.W.flags[p.team];
      if (e && Math.hypot(p.s.x - home.x, p.s.z - home.z) <= 1.6 && p.s.y > home.y - 1.2 && p.s.y < home.y + 2) {
        this.ts[p.team]++; p.caps++;
        const b = this.W.flags[e.team]; e.st = 0; e.by = 0; e.x = b.x; e.y = b.y; e.z = b.z;
        this.credit(p, 500, 'capturaste la bandera');
        this.flagEv('cap', e, p);
        this.sendScores();
        if (this.ts[p.team] >= this.o.caplimit) { this.endMatch(); return; }
        continue;
      }
      for (const f of this.flags) {
        if (f.st === 1) continue;
        if (Math.hypot(p.s.x - f.x, p.s.z - f.z) > 1.3 || p.s.y < f.y - 1.2 || p.s.y > f.y + 1.8) continue;
        if (f.team !== p.team) {
          f.st = 1; f.by = p.id; p.dirty = true;
          this.flagEv('take', f, p);
          if (p.bot && p.ai) p.ai.replan = 0;
        } else if (f.st === 2) this.returnFlag(f, p);
      }
    }
  }

  /* ---- ítems ---- */
  give(p, it) {
    const info = ITEMS[it.type]; if (!info) return false;
    switch (it.type) {
      case 'health': if (p.hp >= 100) return false; p.hp = Math.min(100, p.hp + 25); break;
      case 'mega': if (p.hp >= 150) return false; p.hp = Math.min(150, p.hp + 50); break;
      case 'armor': if (p.ar >= 100) return false; p.ar = Math.min(100, p.ar + 50); break;
      case 'armorH': if (p.ar >= 100) return false; p.ar = 100; break;
      case 'quad': p.quadT = 30; break;
      default:
        if (info.weapon != null) {
          const fresh = !p.ow[info.weapon];
          if (!fresh && p.am[info.ammo] >= AMMO_MAX[info.ammo]) return false;
          p.ow[info.weapon] = 1; p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        } else if (info.ammo) {
          if (p.am[info.ammo] >= AMMO_MAX[info.ammo]) return false;
          p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        }
    }
    p.dirty = true; return true;
  }
  tickItems(dt) {
    for (const it of this.items) {
      if (it.off) continue;
      if (!it.up) { it.t -= dt; if (it.t <= 0) { it.up = true; this.bcast({ t: 'ev', e: 'item', i: it.i, up: 1 }); } continue; }
      for (const p of this.players.values()) {
        if (!p.alive || !p.joined) continue;
        if (Math.abs(p.s.x - it.x) < 1 && Math.abs(p.s.z - it.z) < 1 && p.s.y > it.y - 1 && p.s.y < it.y + 1.3 && this.give(p, it)) {
          it.up = false; it.t = ITEMS[it.type].respawn;
          this.bcast({ t: 'ev', e: 'item', i: it.i, up: 0, by: p.id });
          if (p.bot && p.ai) p.ai.replan = 0;
          break;
        }
      }
    }
  }

  /* ---- partida ---- */
  scores() {
    const gg = this.mode.gg;
    return [...this.players.values()].filter(p => p.joined)
      .sort((a, b) => (gg ? b.lvl - a.lvl : 0) || (this.mode.teams ? b.caps - a.caps : 0) || b.frags - a.frags || a.deaths - b.deaths)
      .map(p => [p.id, p.name, p.frags, p.deaths, p.bot ? 0 : p.ping, p.bot ? 1 : 0, p.color, p.cr, p.lvl, p.team, p.caps, p.plvl]);
  }
  sendScores() { this.bcast({ t: 'sc', l: this.scores(), tl: Math.max(0, Math.ceil(this.left)), fl: this.o.fraglimit, cl: this.o.caplimit, st: this.state, map: this.W.id, mode: this.o.mode, ts: this.ts, fs: this.flagState(), cd: Math.ceil(this.countT), hn: this.humanCount(false), mp: this.mode.minPlayers || 0 }); }
  endMatch() {
    if (this.state !== 'play') return;
    this.state = 'inter'; this.interT = 25;
    const l = this.scores(), ms = this.mode.maps;
    const next = this.o.rotate ? ms[(ms.indexOf(this.W.id) + 1) % ms.length] : this.W.id;
    this.nextMap = next;
    let w = l.length ? l[0][1] : '';
    if (this.mode.teams) w = this.ts[0] === this.ts[1] ? '' : 'EQUIPO ' + TEAMS[this.ts[0] > this.ts[1] ? 0 : 1].name.toUpperCase();
    // experiencia para los que tienen cuenta
    if (this.o.onXP) {
      const wt = this.mode.teams ? (this.ts[0] === this.ts[1] ? -1 : this.ts[0] > this.ts[1] ? 0 : 1) : -1;
      for (const p of this.players.values()) {
        if (!p.joined || p.bot || !p.acct) continue;
        const won = this.mode.teams ? p.team === wt : !!(l.length && l[0][0] === p.id);
        const xp = this.matchXP(p, true, won);
        if (xp > 0) this.o.onXP(p, xp, { kills: p.kills, partida: 1, victoria: won ? 1 : 0 });
      }
    }
    this.bcast({ t: 'end', l, w, wt: this.mode.teams ? (this.ts[0] === this.ts[1] ? -1 : this.ts[0] > this.ts[1] ? 0 : 1) : -1, ts: this.ts, next, nextName: MAPS[next].name, secs: this.interT });
    this.projs.length = 0;
  }
  restart(mapId) {
    const id = mapId || this.nextMap || this.W.id; this.nextMap = null;
    if (id !== this.W.id) this.setMap(id); else this.resetFlags();
    this.state = 'play'; this.left = this.o.timelimit; this.projs.length = 0;
    if (this.mode.minPlayers && this.o.online && this.humanCount(false) < this.mode.minPlayers) this.state = 'lobby';
    for (const it of this.items) { it.up = !it.off; it.t = 0; }
    this.bcast({ t: 'start', map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), tm: this.time, fs: this.flagState(), ts: this.ts });
    for (const p of this.players.values()) if (p.joined) {
      p.frags = 0; p.deaths = 0; p.cr = ECON.START; p.unl = OW0(); p.perk = { ar: 0, am: 0 }; p.streak = 0; p.lvl = 0; p.caps = 0; p.kills = 0; p.joinT = this.time; p.dirty = true;
      this.spawn(p);
    }
    this.sendScores();
  }
  manageBots() {
    const want = this.o.bots != null ? this.o.bots : Math.max(0, this.o.botFill - this.humanCount(false));
    const bots = [...this.players.values()].filter(p => p.bot);
    if (bots.length < want && this.players.size < this.o.maxPlayers) {
      const used = new Set([...this.players.values()].map(p => p.name));
      const free = BOT_NAMES.filter(n => !used.has(n));
      const name = free.length ? free[Math.floor(Math.random() * free.length)] : 'Bot ' + this.nextId;
      const id = this.nextId++;
      const usedC = new Set([...this.players.values()].map(p => p.color));
      const freeC = COLORS.filter(c => !usedC.has(c));
      const skin = { c: freeC.length ? freeC[Math.floor(Math.random() * freeC.length)] : COLORS[id % COLORS.length], v: COLORS[Math.floor(Math.random() * COLORS.length)], a: Math.floor(Math.random() * ACCESSORIES.length) };
      const p = this.newPlayer(id, name, skin, true);
      if (this.mode.teams) this.setTeam(p, this.pickTeam(p));
      p.joined = true; this.players.set(id, p);
      this.bcast({ t: 'ev', e: 'join', id, n: name, c: p.color, s: skin, bot: 1, tm: p.team });
      this.spawn(p); this.sendScores();
    } else if (bots.length > want) {
      let b = bots[bots.length - 1];
      if (this.mode.teams) { const big = this.teamCount(0) >= this.teamCount(1) ? 0 : 1; b = bots.filter(q => q.team === big).pop() || b; }
      this.dropCarried(b);
      this.players.delete(b.id);
      this.bcast({ t: 'ev', e: 'leave', id: b.id, n: b.name, bot: 1 });
      this.sendScores();
    } else if (this.mode.teams) {
      // equilibrar equipos pasando un bot del equipo más grande
      const a = this.teamCount(0), b = this.teamCount(1);
      if (Math.abs(a - b) >= 2) {
        const big = a > b ? 0 : 1, bot = bots.find(q => q.team === big && !this.flags.some(f => f.st === 1 && f.by === q.id));
        if (bot) { this.setTeam(bot, 1 - big); this.bcast({ t: 'ev', e: 'team', id: bot.id, tm: bot.team, c: bot.color }); if (bot.alive) this.spawn(bot); this.sendScores(); }
      }
    }
  }
  tick(dt) {
    this.time += dt;
    updateMovers(this.W, this.time);
    if (this.state === 'inter') {
      this.interT -= dt;
      if (this.interT <= 0) this.restart();
    } else if (this.state === 'lobby') {
      if (this.humanCount(false) >= this.mode.minPlayers) { this.state = 'count'; this.countT = 6; this.bcast({ t: 'ev', e: 'sys', m: '¡Ya son ' + this.humanCount(false) + '! El Team Deathmatch arranca en 6 segundos' }); this.sendScores(); }
    } else if (this.state === 'count') {
      if (this.humanCount(false) < this.mode.minPlayers) { this.state = 'lobby'; this.countT = 0; this.sendScores(); }
      else { const before = Math.ceil(this.countT); this.countT -= dt; if (Math.ceil(this.countT) !== before) this.sendScores(); if (this.countT <= 0) { this.countT = 0; this.restart(this.W.id); } }
    } else {
      this.left -= dt;
      if (this.left <= 0) { this.left = 0; this.endMatch(); }
    }
    this.botT -= dt;
    if (this.botT <= 0) { this.botT = .5; this.manageBots(); }
    for (const p of this.players.values()) {
      if (!p.joined) continue;
      if (!p.alive) {
        p.deadT += dt;
        if (p.bot && p.deadT > 1.6 && this.live()) this.spawn(p);
        else if (!p.bot && p.deadT > (this.state === 'play' ? 6 : 2) && this.live()) this.spawn(p);
        continue;
      }
      if (!this.live()) continue;
      if (p.bot) this.botThink(p, dt);
      if (p.quadT > 0) { p.quadT -= dt; if (p.quadT <= 0) { p.quadT = 0; p.dirty = true; } }
      if (p.hp > 100) { p.megaT += dt; if (p.megaT >= .5) { p.megaT -= .5; p.hp--; p.dirty = true; } }
      const tr = triggers(this.W, p.s);
      if (tr.lava && !tr.water) { p.lavaT -= dt; if (p.lavaT <= 0) { p.lavaT = .25; this.damage(p, tr.lava * .25, null, null, null, 0, 'lava'); } }
      else p.lavaT = 0;
      if (tr.water) this.damage(p, 999, null, null, null, 0, 'water');
      if (p.alive && p.s.y < K.KILLY) this.damage(p, 999, null, null, null, 0, 'void');
    }
    if (this.vote) { this.voteT = (this.voteT || 0) - dt; if (this.voteT <= 0) { this.voteT = 1; this.checkVote(); if (this.vote) this.sendVote(); } }
    if (this.live()) { this.tickProjs(dt); this.tickFires(dt); this.tickItems(dt); if (this.flags.length && this.state === 'play') this.tickFlags(dt); }
    this.snapT -= dt;
    if (this.snapT <= 1e-6) { this.snapT += .05; if (this.snapT < 0) this.snapT = 0; this.snapshot(); }
    this.scT -= dt;
    if (this.scT <= 0) { this.scT = 1; this.sendScores(); }
  }
  snapshot() {
    const ps = [];
    for (const p of this.players.values()) {
      if (!p.joined) continue;
      ps.push([p.id, r2(p.s.x), r2(p.s.y), r2(p.s.z), r2(p.yaw), r2(p.pitch), p.w, (p.alive ? 1 : 0) | (p.quadT > 0 ? 2 : 0) | (p.s.on ? 4 : 0) | (p.s.crouch ? 8 : 0), r2(p.s.vx), r2(p.s.vy), r2(p.s.vz)]);
      if (p.bot && p.ai && this.flags.length && !p.alive) p.ai.path = null;
    }
    this.bcast({ t: 'sn', tm: Math.round(this.time * 1000) / 1000, ps });
    for (const p of this.players.values()) {
      if (p.bot || !p.send || !p.joined || !p.dirty) continue;
      p.dirty = false;
      p.send({ t: 'you', hp: Math.ceil(p.hp), ar: Math.ceil(p.ar), am: Object.assign({}, p.am), ow: p.ow.slice(), q: Math.ceil(p.quadT), al: p.alive ? 1 : 0, cr: p.cr, unl: p.unl.slice(), perk: Object.assign({}, p.perk), lvl: p.lvl });
    }
  }

  /* =====================================================================
     BOTS
     ===================================================================== */
  newAI() { return { think: 0, replan: 0, path: null, pi: 0, tgt: 0, seeT: 0, lostT: 0, last: null, strafe: Math.random() < .5 ? 1 : -1, strafeT: 1, stuckT: 0, bestD: 1e9, hurtBy: 0, hurtT: 0, aimErrX: 0, aimErrY: 0, errT: 0, hopT: 0, goal: null, flyT: 0, noLook: 0 }; }
  skill() { return SKILL[this.o.botSkill] || SKILL[1]; }
  findTarget(p) {
    let best = null, bd = 1e9; const sk = this.skill();
    const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z;
    for (const t of this.players.values()) {
      if (t === p || !t.alive || !t.joined || (this.mode.teams && t.team === p.team)) continue;
      const d = Math.hypot(t.s.x - ex, t.s.y + 1 - ey, t.s.z - ez);
      const hurt = p.ai.hurtT > 0 && p.ai.hurtBy === t.id;
      if (d > sk.range && !hurt) continue;
      // campo de visión según la dificultad, salvo que lo hayan atacado o estés encima
      const f = dirFromAngles(p.yaw, 0), dot = ((t.s.x - ex) * f[0] + (t.s.z - ez) * f[2]) / (Math.hypot(t.s.x - ex, t.s.z - ez) || 1);
      if (dot < sk.fov && !hurt && d > 4 && t.id !== p.ai.tgt) continue;
      if (!los(this.W, ex, ey, ez, t.s.x, t.s.y + 1.2, t.s.z)) continue;
      const score = d - (p.ai.hurtBy === t.id && p.ai.hurtT > 0 ? 15 : 0) - (t.id === p.ai.tgt ? 8 : 0);
      if (score < bd) { bd = score; best = t; }
    }
    return best;
  }
  chooseWeapon(p, dist) {
    if (this.mode.gg) return GG[Math.min(p.lvl, GG.length - 1)];
    const has = w => p.ow[w] && (!WEAPONS[w].ammo || p.am[WEAPONS[w].ammo] >= WEAPONS[w].cost);
    const order = dist < 2.2 ? [2, 1, 7] : dist < 7 ? [2, 1, 3, 5, 6, 0] : dist < 22 ? [5, 3, 2, 6, 8, 9, 1, 4, 0] : [8, 9, 6, 3, 5, 0, 1];
    for (const w of order) if (has(w) && !(WEAPONS[w].mag && p.relT[w] > this.time)) return w;
    return has(1) ? 1 : has(0) ? 0 : 7;
  }
  planBot(p) {
    const ai = p.ai, nav = this.nav;
    const start = findNode(nav, p.s.x, p.s.y, p.s.z);
    if (!start) { ai.path = null; return; }
    const dj = dijkstra(nav, start.id);
    let goal = null, best = -1;
    const t = ai.tgt ? this.players.get(ai.tgt) : null;
    const obj = this.objective(p);
    if (obj) {
      const n = findNode(nav, obj.x, obj.y + .2, obj.z);
      if (n && dj.dist[n.id] < Infinity && n.id !== start.id) { goal = n.id; best = obj.pri; }
    }
    if (best >= 99) { /* el objetivo de la bandera manda */ }
    else if (t && t.alive) {
      const n = findNode(nav, t.s.x, t.s.y, t.s.z);
      if (n && dj.dist[n.id] < Infinity) { goal = n.id; best = 99; }
    } else if (ai.last && ai.lostT > 0) {
      const n = findNode(nav, ai.last[0], ai.last[1], ai.last[2]);
      if (n && dj.dist[n.id] < Infinity) { goal = n.id; best = 6; }
    }
    if (best < 99) {
      for (const it of this.items) {
        if (!it.up) continue;
        const n = findNode(nav, it.x, it.y + .2, it.z); if (!n || dj.dist[n.id] === Infinity) continue;
        const info = ITEMS[it.type]; let v = 0;
        if (it.type === 'quad') v = 6;
        else if (it.type === 'mega') v = p.hp < 150 ? 5 : 0;
        else if (it.type === 'health') v = p.hp < 40 ? 5 : p.hp < 80 ? 2 : 0;
        else if (it.type === 'armorH') v = p.ar < 120 ? 4 : 0;
        else if (it.type === 'armor') v = p.ar < 80 ? 2.5 : 0;
        else if (info.weapon != null) v = !p.ow[info.weapon] ? 4 + info.weapon * .3 : p.am[info.ammo] < AMMO_MAX[info.ammo] * .4 ? 1 : 0;
        else if (info.ammo) { const owns = WEAPONS.some((W_, i) => W_.ammo === info.ammo && p.ow[i]); v = owns && p.am[info.ammo] < AMMO_MAX[info.ammo] * .5 ? 1.2 : 0; }
        if (!v) continue;
        const sc = v / (1 + dj.dist[n.id] / 25);
        if (sc > best) { best = sc; goal = n.id; }
      }
    }
    if (goal == null) {
      for (let k = 0; k < 8 && goal == null; k++) {
        const sp = this.W.spawns[Math.floor(Math.random() * this.W.spawns.length)];
        const n = findNode(nav, sp.x, sp.y + .2, sp.z);
        if (n && dj.dist[n.id] < Infinity && n.id !== start.id) goal = n.id;
      }
    }
    if (goal == null) { ai.path = null; return; }
    ai.path = pathTo(dj, goal); ai.pi = 1; ai.bestD = 1e9; ai.stuckT = 0; ai.goal = goal;
  }
  // CTF: qué hace cada bot según el estado de las banderas y su rol (ataque/defensa)
  objective(p) {
    if (!this.mode.teams || this.flags.length < 2 || p.team < 0) return null;
    const own = this.flags[p.team], enemy = this.flags[1 - p.team], home = this.W.flags[p.team];
    if (enemy.st === 1 && enemy.by === p.id) return { x: home.x, y: home.y, z: home.z, pri: 200 };
    if (own.st === 1) { const c = this.players.get(own.by); if (c && (p.role === 'def' || Math.hypot(c.s.x - p.s.x, c.s.z - p.s.z) < 25)) return { x: c.s.x, y: c.s.y, z: c.s.z, pri: 150 }; }
    if (own.st === 2) return { x: own.x, y: own.y, z: own.z, pri: p.role === 'def' ? 140 : 70 };
    if (p.role === 'att') {
      if (enemy.st !== 1) return { x: enemy.x, y: enemy.y, z: enemy.z, pri: 100 };
      const c = this.players.get(enemy.by); if (c) return { x: c.s.x, y: c.s.y, z: c.s.z, pri: 40 };
    }
    if (Math.hypot(p.s.x - home.x, p.s.z - home.z) > 14) return { x: home.x + (Math.random() - .5) * 16, y: 0, z: home.z - Math.sign(home.z) * (4 + Math.random() * 8), pri: 50 };
    return null;
  }
  botThink(p, dt) {
    const ai = p.ai, s = p.s, nav = this.nav, sk = SKILL[this.o.botSkill] || SKILL[1];
    ai.think -= dt; ai.replan -= dt; ai.hurtT -= dt; ai.lostT -= dt; ai.errT -= dt; ai.flyT -= dt; ai.noLook -= dt;
    if (ai.think <= 0) {
      ai.think = .1;
      const t = this.findTarget(p);
      if (t) { if (t.id !== ai.tgt) { ai.seeT = 0; ai.replan = Math.min(ai.replan, .2); } ai.tgt = t.id; ai.last = [t.s.x, t.s.y, t.s.z]; ai.lostT = 3; }
      else if (ai.tgt) { ai.tgt = 0; ai.replan = 0; }
    }
    if (ai.replan <= 0 && s.on) { ai.replan = .7 + Math.random() * .5; this.planBot(p); }
    const tgt = ai.tgt ? this.players.get(ai.tgt) : null;
    if (tgt) ai.seeT += dt;
    // --- movimiento ---
    let wx = 0, wz = 0, jump = false;
    let nextLink = 0;
    if (ai.path && ai.pi < ai.path.length && ai.flyT <= 0) {
      let n = nav.nodes[ai.path[ai.pi]];
      const dxn = n.x - s.x, dzn = n.z - s.z, dn = Math.hypot(dxn, dzn);
      if (dn < .65 && Math.abs(n.y - s.y) < 1.4) { ai.pi++; ai.bestD = 1e9; ai.stuckT = 0; }
      if (ai.pi < ai.path.length) {
        n = nav.nodes[ai.path[ai.pi]];
        nextLink = linkType(nav, ai.path[ai.pi - 1], ai.path[ai.pi]);
        // mirar más adelante en tramos caminables para suavizar
        let aim = n;
        if (nextLink === 0 && ai.noLook <= 0) for (let k = 1; k <= 3 && ai.pi + k < ai.path.length; k++) {
          if (linkType(nav, ai.path[ai.pi + k - 1], ai.path[ai.pi + k]) !== 0) break;
          const q = nav.nodes[ai.path[ai.pi + k]]; if (Math.abs(q.y - s.y) > .6) break;
          if (!los(this.W, s.x, s.y + .4, s.z, q.x, q.y + .4, q.z)) break;
          aim = q;
        }
        const ax = aim.x - s.x, az = aim.z - s.z, al = Math.hypot(ax, az) || 1;
        wx = ax / al; wz = az / al;
        const d = Math.hypot(n.x - s.x, n.z - s.z);
        if (nextLink === 2 && s.on) {
          const prev = nav.nodes[ai.path[ai.pi - 1]];
          if (Math.hypot(prev.x - s.x, prev.z - s.z) < 1.1 || d < 4.5) { jump = true; ai.flyT = .05; }
        }
        if (d < ai.bestD - .2) { ai.bestD = d; ai.stuckT = 0; } else ai.stuckT += dt;
        if (ai.stuckT > 1.2) { jump = true; ai.replan = 0; ai.stuckT = 0; ai.noLook = 1.5; }
      } else ai.path = null;
    } else if (!ai.path && !findNode(nav, s.x, s.y, s.z)) { jump = true; }
    // combate: esquivar de costado y acercarse/alejarse
    if (tgt) {
      const dx = tgt.s.x - s.x, dz = tgt.s.z - s.z, dist = Math.hypot(dx, dz) || 1;
      ai.strafeT -= dt; if (ai.strafeT <= 0) { ai.strafe *= -1; ai.strafeT = .5 + Math.random() * 1.2; }
      const melee = !!WEAPONS[p.w].melee;
      const pref = melee ? 0 : p.w === 2 || p.w === 1 ? 5 : p.w === 6 || p.w === 8 || p.w === 9 ? 20 : 11;
      const sm = (melee ? .3 : 1) * sk.strafe;
      const ix = dx / dist, iz = dz / dist, sx = -iz * ai.strafe * sm, sz = ix * ai.strafe * sm;
      const approach = melee ? 1.2 : dist > pref + 3 ? .6 : dist < pref - 3 ? -.6 : 0;
      if (dist < 25 || !ai.path) { wx = wx * .4 + sx * .8 + ix * approach; wz = wz * .4 + sz * .8 + iz * approach; }
      ai.hopT -= dt; if (ai.hopT <= 0) { ai.hopT = .6 + Math.random() * 1.5; if (Math.random() < sk.hop) jump = true; }
      // no caminar hacia la lava ni al vacío
      const fx = s.x + wx * 1.2, fz = s.z + wz * 1.2;
      if (s.on && !nav.nodeAt(fx, s.y, fz)) { wx = -wx * .3; wz = -wz * .3; }
    }
    const was = s.on;
    pmove(this.W, s, { wx, wz, jump }, dt);
    const landed = was !== s.on && s.on;
    if (landed) ai.flyT = 0;
    // plataformas de salto y teletransportadores
    p.padT -= dt;
    const tr = triggers(this.W, s);
    if (padReady(s, tr.pad, landed && Math.random() < .5) && tr.pad && p.padT <= 0) { launchPad(s, tr.pad); p.padT = .4; ai.flyT = 1.5; this.bcast({ t: 'ev', e: 'pad', p: r3a([s.x, s.y, s.z]) }); }
    if (tr.tele) { this.teleport(p, tr.tele); ai.replan = 0; }
    // --- puntería y disparo ---
    if (tgt && tgt.alive) {
      const dist = Math.hypot(tgt.s.x - s.x, tgt.s.y - s.y, tgt.s.z - s.z);
      const w = this.chooseWeapon(p, dist); if (w !== p.w) { p.w = w; p.lastFire = Math.max(p.lastFire, this.time - WEAPONS[w].rate * .5); }
      const W_ = WEAPONS[w];
      // el bot apunta a una posición "recordada" que persigue a la real según su dificultad
      if (!ai.trk || ai.trkId !== tgt.id) { ai.trk = [tgt.s.x - tgt.s.vx * .25, tgt.s.y, tgt.s.z - tgt.s.vz * .25]; ai.trkId = tgt.id; }
      const kt = Math.min(1, sk.track * dt);
      ai.trk[0] += (tgt.s.x - ai.trk[0]) * kt; ai.trk[1] += (tgt.s.y - ai.trk[1]) * kt; ai.trk[2] += (tgt.s.z - ai.trk[2]) * kt;
      let tx = ai.trk[0], ty = ai.trk[1] + (W_.proj === 'rocket' && tgt.s.on ? .2 : 1.15), tz = ai.trk[2];
      if (W_.type === 'proj') {
        const tt = dist / W_.speed; tx += tgt.s.vx * tt * .8 * sk.lead; tz += tgt.s.vz * tt * .8 * sk.lead;
        if (W_.proj === 'grenade') ty += dist * .06;
        if (W_.proj === 'bullet') ty += .5 * 9 * tt * tt * (.6 + .4 * sk.lead);
      }
      const ex = s.x, ey = s.y + K.EYE, ez = s.z;
      const wantYaw = Math.atan2(-(tx - ex), -(tz - ez)), wantPitch = Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez));
      if (ai.errT <= 0) { ai.errT = .3 + Math.random() * .4; ai.aimErrX = (Math.random() - .5) * 2 * sk.err; ai.aimErrY = (Math.random() - .5) * 2 * sk.err; }
      let dy = wantYaw + ai.aimErrX - p.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const mt = sk.turn * dt;
      p.yaw += clamp(dy, -mt, mt); p.pitch += clamp(wantPitch + ai.aimErrY - p.pitch, -mt, mt);
      if (ai.seeT > sk.react && Math.abs(dy) < .12 + 1 / (dist + 1) && this.canFire(p, w) && this.time - p.lastFire >= W_.rate * sk.fire) {
        if (W_.type !== 'proj' || dist > 3) this.botFire(p, w, [ex, ey, ez], dirFromAngles(p.yaw, p.pitch));
      }
    } else {
      const sp = Math.hypot(s.vx, s.vz);
      if (sp > 1) { const want = Math.atan2(-s.vx, -s.vz); let dy = want - p.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; p.yaw += clamp(dy, -6 * dt, 6 * dt); }
      p.pitch *= .9;
      p.w = this.chooseWeapon(p, 15);
    }
  }
  teleport(p, t) {
    this.bcast({ t: 'ev', e: 'tp', p: r3a([p.s.x, p.s.y, p.s.z]) });
    p.s.x = t.to[0]; p.s.y = t.to[1]; p.s.z = t.to[2]; p.s.vx = p.s.vz = 0; p.s.vy = 0; p.yaw = t.yaw;
    this.bcast({ t: 'ev', e: 'tp', p: r3a(t.to) });
  }
}

return { censor, isBad, okChestImg, K, padReady, XP, levelInfo, xpToNext, MEDALS, medalOf, MAX_LEVEL, WEAPONS, NW, AMMO0, MODES, MODE_IDS, GG, TEAMS, AMMO_MAX, AMMO_NAME, ITEMS, COLORS, WORLD, MAPS, MAP_IDS, SHOP, ECON, ACCESSORIES, SKILL, topAt, pmove, triggers, launchPad, padVel, raycast, los, rayPlayer, boxDist, dirFromAngles, projLaunch, projStep, updateMovers, Game, getNav };
});
