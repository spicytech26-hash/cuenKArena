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
const r3 = v => Math.round(v * 1000) / 1000;
// caída del daño con la distancia: [hasta acá pega completo, desde acá pega lo mínimo, mínimo]
const falloff = (W_, d) => { const f = W_.fall; if (!f) return 1; if (d <= f[0]) return 1; if (d >= f[1]) return f[2]; return 1 - (1 - f[2]) * (d - f[0]) / (f[1] - f[0]); };

/* ---------- Armas ---------- */
/* Daño pensado para combates cortos: 100 de salud cae en ~1 segundo de fuego sostenido.
   mag/reload: armas con cargador (la escopeta doble tira 2 y recarga).
   hip: dispersión del francotirador sin mira (con mira usa spread). */
const WEAPONS = [
  { name: 'Pistola',        ammo: 'bullets',  cost: 1, rate: .17, type: 'hit',  pel: 1,  spread: .005, dmg: 22, range: 300, mag: 12, reload: 1.3 },
  { name: 'Escopeta',       ammo: 'shells',   cost: 1, rate: .85, type: 'hit',  pel: 10, spread: .06,  dmg: 9, range: 120, mag: 6, reload: 1.8, fall: [4, 20, .45] },   // como la de TF2: 90 de cerca, baja hasta ~40 de lejos
  { name: 'Escopeta doble', ammo: 'shells',   cost: 1, rate: .28, type: 'hit',  pel: 12, spread: .085, dmg: 11, range: 100, mag: 2, reload: 1.7 },
  { name: 'Ametralladora',  ammo: 'bullets',  cost: 1, rate: .085, type: 'hit', pel: 1,  spread: .013, dmg: 16, range: 300, mag: 40, reload: 2 },
  // granada: explota al segundo; si le pega de lleno a alguien antes de rebotar, explota en el acto con daño extra y premio
  { name: 'Lanzagranadas',  ammo: 'grenades', cost: 1, rate: .75, type: 'proj', proj: 'grenade', speed: 26, dmg: 110, rad: 5.5, direct: 40, clean: 100, fuse: 1, mag: 4, reload: 2 },
  { name: 'Lanzacohetes',   ammo: 'rockets',  cost: 1, rate: .8,  type: 'proj', proj: 'rocket',  speed: 44, dmg: 60, rad: 4.5, sfall: .75, direct: 70, mag: 4, reload: 3.6 },   // como el del Soldier: 4 cohetes y ~2,7 s para recargar todo   // nerf: antes 100/105, después 80/85; ahora 70 directo y 60 de área (nunca más que el directo) que cae rápido con la distancia
  { name: 'Rifle de plasma', ammo: 'slugs',    cost: 1, rate: 1.4, type: 'rail', pel: 1,  dmg: 110, range: 400, mag: 4, reload: 2.2 },
  // cuchillo mariposa: el segundo tajo sobre la misma víctima (dentro de 4 s) mata siempre
  { name: 'Cuchillo',       ammo: null,       cost: 0, rate: .5,  type: 'hit',  pel: 1,  spread: 0, dmg: 55, back: 1.8, range: 1.9, melee: true },   // alcance corto como el cuchillo del espía de TF2 o el del CS:GO
  { name: 'Francotirador',  ammo: 'sniper',   cost: 1, rate: 1.25, type: 'hit', pel: 1,  spread: .002, hip: .045, dmg: 115, head: 2, range: 500, scope: true, mag: 5, reload: 2.2 },
  // rifle de caza: bala real con viaje y caída; cualquier impacto mata. Premia los tiros bien calculados
  { name: 'Rifle de caza',  ammo: 'caza',     cost: 1, rate: 1.6, type: 'proj', proj: 'bullet', speed: 260, drop: 9, dmg: 0, rad: 0, direct: 1000, scope: true, zoom: 58, mag: 3, reload: 2.2 },
  // bomba molotov: se rompe al primer golpe y deja el piso en llamas unos segundos
  { name: 'Bomba molotov',  ammo: 'molotov',  cost: 1, rate: .9,  type: 'proj', proj: 'molotov', speed: 17, dmg: 0, rad: 0, direct: 12, fire: { r: 5, dur: 6, hit: 5.5, every: .1 } }
];
const NW = WEAPONS.length;
// como en Counter-Strike: una sola arma principal a la vez (ranura 2); pistola en la 1, cuchillo en la 3, molotov en la 4
const PRIMARY = [1, 2, 3, 4, 5, 6, 8, 9];
const isPrimary = w => PRIMARY.includes(w);
const primaryOf = ow => { for (const w of PRIMARY) if (ow[w]) return w; return -1; };
function setPrimary(p, w) { for (const k of PRIMARY) if (k !== w) p.ow[k] = 0; p.ow[w] = 1; }
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
  quad:   { name: 'Daño triple', respawn: 60 },
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
  { id: 'w1', cat: 'Escopetas', name: 'Escopeta', w: 1, price: 0, free: 1, desc: 'Tu arma principal de base (gratis). Elegila para volver a la escopeta' },
  { id: 'w2', cat: 'Escopetas', name: 'Escopeta doble', w: 2, price: 500, pack: ['shells', 20], desc: '20 perdigones, gasta 2 cartuchos' },
  { id: 'w3', cat: 'Ametralladoras', name: 'Ametralladora', w: 3, price: 600, pack: ['bullets', 100], desc: 'Fuego continuo a media distancia' },
  { id: 'w4', cat: 'Bombas', name: 'Lanzagranadas', w: 4, price: 900, pack: ['grenades', 10], desc: 'Explotan al segundo. Un impacto directo explota en el acto y da premio' },
  // la molotov es de un solo uso: se compra estando vivo y si te matan la perdés
  { id: 'w10', cat: 'Bombas', name: 'Bomba molotov', w: 10, price: 300, once: 1, pack: ['molotov', 3], desc: 'Tecla G. 3 molotovs que dejan el piso en llamas 6 s. Si te matan, las perdés' },
  { id: 'w5', cat: 'Misiles', name: 'Lanzacohetes', w: 5, price: 1300, pack: ['rockets', 10], desc: 'Daño en área y rocket jump' },
  { id: 'w6', cat: 'Rifles', name: 'Rifle de plasma', w: 6, price: 1700, pack: ['slugs', 10], desc: 'Atraviesa a todos los que estén en línea' },
  { id: 'w8', cat: 'Rifles', name: 'Francotirador', w: 8, price: 1500, pack: ['sniper', 10], desc: 'Click derecho para apuntar con mira. Mata de un tiro a quien no tiene blindaje' },
  { id: 'w9', cat: 'Rifles', name: 'Rifle de caza', w: 9, price: 1400, pack: ['caza', 8], desc: 'La bala viaja y cae: cualquier impacto mata. Tiros largos o al aire dan premio' },
  { id: 'w7', cat: 'Cuerpo a cuerpo', name: 'Cuchillo', w: 7, price: 0, free: 1, desc: 'Cuchillo mariposa: dos puñaladas matan siempre. No lo frena el blindaje' },
  { id: 'a1', cat: 'Blindaje', name: 'Chaleco', price: 400, armor: 50, desc: 'Aparecés con 50 de blindaje' },
  { id: 'a2', cat: 'Blindaje', name: 'Armadura pesada', price: 900, armor: 100, desc: 'Aparecés con 100 de blindaje' },
  { id: 'am', cat: 'Suministros', name: 'Cartuchera doble', price: 500, desc: 'Aparecés con el doble de munición' },
  { id: 'rf', cat: 'Suministros', name: 'Recarga', price: 150, use: 1, desc: 'Llena la munición de tus armas ahora' }
];
/* ---------- Modos de juego ---------- */
const MODES = {
  arena:   { name: 'Arena', maps: ['represa', 'panymanteca', 'lacuenca', 'cuartotramo'], shop: true, timelimit: 300,
             desc: 'Todos contra todos. Cada frag da créditos para la tienda (B).' },
  gungame: { name: 'Gungame', maps: ['represa', 'panymanteca', 'lacuenca', 'cuartotramo'], shop: false, gg: true,
             desc: 'Cada baja te da la siguiente arma de la lista. Munición infinita, sin tienda. Si te matan con cuchillo bajás un nivel. Gana el primero en hacer las 20 bajas; la última es con cuchillo.' },
  tdm:     { name: 'Team Deathmatch', maps: ['lacuenca', 'represa', 'panymanteca', 'cuartotramo'], shop: true, teams: true, tdm: true, minPlayers: 4,
             desc: 'Rojo contra azul: cada baja suma para tu equipo hasta llegar al límite que elijan. Online arranca cuando hay 4 jugadores; mientras tanto, calentamiento.' },
  snipers: { name: 'Francotiradores', maps: ['fuertes'], shop: false, teams: true, tk: true, snipers: true, inf: true, timelimit: 360, teamLimit: 30,
             desc: 'Rojo contra azul con francotirador y cuchillo nomás: el francotirador mata de un tiro y con el cuchillo en la mano corrés más rápido. Racha de 6 bajas: escopeta doble. Sin tienda y sin mira hasta que apuntás.' },
  ctf:     { name: 'Captura la bandera', maps: ['puente'], shop: true, teams: true, ctf: true,
             desc: 'Rojo contra azul. Robá la bandera rival y llevala hasta tu base. Gana el primer equipo en capturarla 3 veces.' }
};
const MODE_IDS = Object.keys(MODES);
// sifón: mini escudos que suelta el que muere
// duran 10 s desde que caen al piso (a los 8 s empiezan a parpadear, eso lo hace el cliente)
const SHARD = { N: 5, AR: 5, CAP: 100, LIFE: 10.45, MAX: 80 };
// Gungame: arranca con armas fuertes y termina con las difíciles; la última baja es con machete
const GG = [3, 5, 2, 4, 1, 6, 8, 0, 3, 5, 2, 4, 1, 9, 8, 0, 5, 6, 9, 7];
const TEAMS = [{ name: 'Rojo', c: '#ff4a3a' }, { name: 'Azul', c: '#3a8bff' }];
/* ---------- Cuentas: experiencia, niveles y medallas (estilo Team Fortress 2) ----------
   Se gana jugando online: por terminar la partida, por minuto jugado, por cada baja, por aguantar vivo
   (la vida más larga de la partida), por ganar y por capturar. Una partida normal de 10 minutos da unos 200-300. */
const XP = { PLAY: 50, KILL: 12, WIN: 50, CAP: 40, PER_MIN: 5, MAX_MIN: 15, SURVIVE: 10, MAX_SURVIVE: 50, MAX_MATCH: 700 };
const MAX_LEVEL = 100;
// cada nivel pide 220 XP más 60 por nivel ya alcanzado (el 10 queda a ~25 partidas, el 20 a ~80)
// OJO: el nivel se calcula con la XP total guardada, así que cambiar esta curva le cambia el nivel a TODAS las cuentas
// que ya existen (pasó el 17/10/2026: al hacerla más lenta, quien era nivel 10-11 quedó en 4-6). No tocarla sin convertir la XP guardada.
const xpToNext = L => 220 + 60 * (L - 1);
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
const EMBLEMS = ['ancla', 'flecha', 'corazon', 'estrella', 'calavera', 'rayo', 'mira', 'corona', 'escudo', 'alas', 'espada', 'ninguno'];   // emblemas del pecho (el dibujo está en el cliente)
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

/* ---------- registro de mapas ----------
   Cada archivo de 02-mapas/ termina con  MAPDEFS.<id> = <función que arma el mapa>;
   El orden de los archivos es el orden de los mapas en el juego. */
const MAPDEFS = {};
/* Mapa en datos puros (lo exporta el editor: public/editor.html). Mismo resultado que armarlo a mano con mapKit:
   { id, name, bounds, theme, modos: ['arena', ...], brushes: [{ min, max, mat, ...extras }], items, spawns, pads, teles, lava, lights, deco } */
function mapFromData(d) {
  const k = mapKit();
  for (const b of d.brushes || []) {
    const { min, max, mat, ...ex } = b;
    k.add(min[0], min[1], min[2], max[0], max[1], max[2], mat, Object.keys(ex).length ? JSON.parse(JSON.stringify(ex)) : undefined);
  }
  for (const key of ['pads', 'teles', 'lava', 'items', 'spawns', 'lights']) for (const o of d[key] || []) k[key].push(JSON.parse(JSON.stringify(o)));
  const { brushes, pads, teles, lava, items, spawns, lights, ...rest } = d;
  return k.finish(Object.assign({ deco: [], bounds: { x0: -40, x1: 40, z0: -40, z1: 40 }, theme: { sky: 'day', fog: 0xbfd3e6, fogD: .006, amb: 0xc9d0da, ambI: .5, hemi: [0xbcd8ff, 0x8a7a62, .42], sun: true } }, JSON.parse(JSON.stringify(rest))));
}

/* ---------- dm1 · La Represa ---------- */
function buildRepresa() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();

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
  lava.push({ min: [-5, -6, -5], max: [5, -3.6, 5], dps: 25 });
  // salidas del pozo:
  // · géiser de magma en el centro: cada 3,6 s erupciona y te tira arriba, justo sobre el saltador del sur del atrio
  pads.push({ x: 0, y: -4, z: 0, r: 2.1, t: [0, 0, -9.5], apex: 3, geyser: { period: 3.6, on: .9, phase: 0 } });
  // · piedras de basalto que suben y bajan por turnos: abajo quedan a ras de la lava (se pisan caminando),
  //   te suben hasta casi el borde y de ahí saltás afuera. Siempre hay una subiendo.
  [[-3.5, -3.5, 0], [3.5, -3.5, 1], [3.5, 3.5, 2], [-3.5, 3.5, 3]].forEach(([x, z, k]) =>
    mover(x - .9, -4.7, z - .9, x + .9, -3.75, z + .9, 'basalt', 1, 3.2, 4.8, k * Math.PI / 2));
  // plataforma del daño triple y piedras para llegar
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
  // plataformas en espiral hasta la torre: más grandes, más juntas y con escalones más bajos (0,9 m, el salto da 1,4)
  // así sigue siendo un parkour pero se sube de corrido sin frenar la partida
  [[7.9, -27.1, .92], [9.4, -29.6, 1.85], [9.4, -32.3, 2.77], [8, -34.8, 3.69], [5.4, -36.7, 4.62], [1.9, -37.8, 5.54],
   [-1.9, -37.8, 6.46], [-5.4, -36.7, 7.38], [-8, -34.8, 8.31], [-9.4, -32.3, 9.23], [-9.4, -29.6, 10.15], [-7.9, -27.1, 11.08]]
    .forEach(([x, z, t]) => { add(x - 1.3, t - .4, z - 1.3, x + 1.3, t, z + 1.3, 'metal'); add(x - 1.32, t - .02, z - 1.32, x + 1.32, t + .02, z - 1.22, 'neonC', { nc: 1 }); });
  // cajas
  add(14.5, 0, -23.5, 17.5, 2, -20.5, 'crate');
  add(-17.5, 0, -27, -14.5, 1.5, -23, 'crate');
  add(-21, 0, -37, -19, 2.5, -35, 'crate'); add(-19, 0, -37, -17, 1.25, -35, 'crate');
  // vagoneta de carga: va y viene sobre rieles cruzando el patio (cobertura que se mueve y te lleva encima)
  add(-26, 0, -22.2, 12, .06, -21.9, 'rail', { nc: 1 }); add(-26, 0, -21.1, 12, .06, -20.8, 'rail', { nc: 1 });
  add(-27, 0, -23, -26, 1, -20, 'metal'); add(12, 0, -23, 13, 1, -20, 'metal');        // topes de los rieles
  mover(-25, 0, -22.5, -22, 1.3, -20.5, 'crate', 0, 33, 28, 0);
  // ascensor exterior de la torre: atajo al riel (la espiral sigue estando, pero esto es más rápido si lo agarrás a tiempo)
  mover(-1.5, -.1, -27, 1.5, .3, -24, 'lift', 1, 11.7, 9, 0);
  add(-1.6, 0, -27.1, -1.5, 12, -26.9, 'neonC', { nc: 1 }); add(1.5, 0, -27.1, 1.6, 12, -26.9, 'neonC', { nc: 1 });
  // subestación: dos transformadores en la parte este del patio, con sus aisladores
  [[19, -29], [23.5, -29]].forEach(([x, z]) => { add(x, 0, z, x + 3, 2.6, z + 3, 'metal'); add(x - .1, 2.6, z - .1, x + 3.1, 2.9, z + 3.1, 'trim');
    [.6, 1.5, 2.4].forEach(d => add(x + d - .15, 2.9, z + 1.35, x + d + .15, 4, z + 1.65, 'pillar', { nc: 1 })); });
  add(18.5, 0, -24.6, 27.5, .8, -24, 'concrete');                                  // murito bajo

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
  pads.push({ x: -29.5, y: 0, z: -4, r: 1, t: [-21, 6, -8], apex: 2.5 });
  add(-39.9, 9, -12, -39.7, 9.4, 12, 'light', { nc: 1 });
  // sala de compuertas: la compuerta gigante de la represa en la pared, con sus vigas
  add(-40, 3, -7, -39.5, 8.6, 7, 'metal');
  [-7.4, -2.6, 2.2, 6.6].forEach(z => add(-40, 3, z, -39.2, 8.6, z + .8, 'trim'));
  add(-40, 8.6, -7.6, -39, 9, 7.6, 'trim');
  // pasarela de la grúa a 9,5 m: se sube por la escalera del nivel alto o con el ascensor del medio
  add(-39, 9.1, 3, -21, 9.5, 6, 'grate');
  add(-39, 9.1, -1, -35, 9.5, 3, 'grate');                                         // ensanche sobre el entrepiso
  // puente grúa: sale del ensanche y cruza la sala a 9,5 m (la compuerta queda abajo)
  mover(-38, 9.1, -4, -35, 9.5, -1, 'grate', 0, 9, 10, 0);
  add(-38, 12, -2.6, -26, 12.2, -2.4, 'metal', { nc: 1 });
  stairs(-24, 6, -21, 13, 6, .5, 7, 'z', -1);
  add(-39, 9.5, 2.9, -21, 10.4, 3, 'rail', { nc: 1 }); add(-39, 9.5, 6, -24, 10.4, 6.1, 'rail', { nc: 1 });
  mover(-29.5, -.1, 0, -26.5, .3, 3, 'lift', 1, 9.2, 9, 0);                         // ascensor hasta la pasarela
  // cajas para cubrirse en el pasillo del medio y en el nivel alto
  add(-31, 0, -9, -28, 1.5, -6.5, 'crate'); add(-30.5, 1.5, -8.5, -28.5, 2.6, -7, 'crate');
  add(-32.5, 0, 13, -30.5, 2, 15.5, 'crate'); add(-28, 0, 13.5, -26.5, 1.2, 15, 'crate');
  add(-20, 6, 7.5, -17.5, 7.3, 9.5, 'crate');

  /* ---- ALA ESTE: sala de lava con pasarelas ---- */
  add(17, -4, -16, 21, 0, 16, 'floor');                 // andén de entrada
  add(21, -5, -16, 40, -3, 16, 'rock');                 // fondo de la pileta
  lava.push({ min: [21, -5, -16], max: [40, -2.2, 16], dps: 40 });
  wall(17, -17, 40, -16, -6, 14, [D(18, 21, 0, 4)], 'wall');
  wall(17, 16, 40, 17, -6, 14, [D(18, 21, 0, 3)], 'wall');
  add(17, 5.6, -1.5, 30, 6, 1.5, 'grate');              // pasarela alta
  add(33, -4, -6, 40, 4, 6, 'metal');                   // plataforma de la megasalud
  // columnas sobre la lava hasta la megasalud: más anchas y más seguidas (escalones de 0,7 m, huecos de menos de un metro)
  for (const s of [-1, 1]) [[23.5, 9, .4], [26.5, 10.5, 1.1], [29.5, 11, 1.8], [32.5, 10.3, 2.5], [35.5, 8.8, 3.2]]
    .forEach(([x, z, t]) => add(x - 1.5, -4, s * z - 1.5, x + 1.5, t, s * z + 1.5, 'pillar'));
  add(23, -4, 13, 25, -2, 16, 'step'); add(21, -4, 13, 23, -1, 16, 'step');
  add(23, -4, -16, 25, -2, -13, 'step'); add(21, -4, -16, 23, -1, -13, 'step');
  pads.push({ x: 35, y: 4, z: -3, r: 1, t: [13, 6, 0], apex: 1.5 });
  // barcaza que cruza la lava por debajo de la pasarela, una repisa al fondo con saltador a la megasalud
  mover(21, -1.4, -2.5, 24, -1, 2.5, 'metal', 0, 7, 12, 0);
  add(31, -4, -2.5, 33, -1, 2.5, 'metal'); add(30.9, -1, -2.5, 31, -.6, 2.5, 'trim', { nc: 1 });
  pads.push({ x: 31.9, y: -1, z: 0, r: .9, t: [34.6, 4, 0], apex: 2.2 });
  // géiseres de lava: si caés en la pileta, cada tanto te tiran a la pasarela alta o al andén
  pads.push({ x: 27, y: -3, z: 5, r: 1.6, t: [24, 6, 0], apex: 2.5, geyser: { period: 4.2, on: .9, phase: .3 } });
  pads.push({ x: 27, y: -3, z: -5, r: 1.6, t: [19, 0, -6], apex: 2.5, geyser: { period: 4.2, on: .9, phase: .65 } });

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
  // turbinas: carcasas contra la pared del fondo y dos pistones que suben y bajan por turnos (cobertura que cambia)
  add(-16, -3, 36.2, -11, 1, 38, 'pillar'); add(-16.2, 1, 36, -10.8, 1.4, 38, 'trim');
  add(-9.5, -3, 36.6, -6.5, -.5, 38, 'pillar'); add(-9.7, -.5, 36.4, -6.3, -.1, 38, 'trim');
  mover(-7, -3.6, 30.5, -4, -2.5, 33.5, 'metal', 1, 3, 5, 0);
  mover(4, -3.6, 30.5, 7, -2.5, 33.5, 'metal', 1, 3, 5, Math.PI);
  add(-16, 3.2, 26, 16, 3.6, 26.5, 'metal', { nc: 1 }); add(-16, 3.2, 34.5, 16, 3.6, 35, 'metal', { nc: 1 });   // caños del techo
  add(10.5, -3, 36.5, 11, 1, 37, 'metal'); add(13, -3, 36.5, 13.5, 1, 37, 'metal'); add(10.5, 1, 36.5, 13.5, 1.5, 37, 'metal');
  teles.push({ x: 12, y: -3, z: 35, r: .9, to: [0, 12, -29.5], yaw: 0 });
  // pasillo al ala este
  add(17, -6, 17, 18, 14, 33, 'block'); add(21, -6, 17, 40, 14, 38, 'block'); add(17, -6, 36, 21, 14, 38, 'block');
  add(16, -4, 33, 21, -3, 36, 'floor');
  add(18, -4, 23, 21, -3, 33, 'floor');
  stairs(18, 17, 21, 23, -3, .5, 6, 'z', -1);
  add(17, 1, 33, 21, 14, 36, 'block'); add(18, 3, 17, 21, 14, 33, 'block');
  add(-15.9, 3.5, 37.8, 15.9, 3.8, 38, 'light', { nc: 1 });

  /* ---- MIRADOR en el techo del sótano (antes era una terraza vacía) ---- */
  // puesto de vigía del francotirador: plataforma a 9 m con escalera al frente y barandas
  add(-3, 8.6, 31, 3, 9, 37, 'grate');
  [[-3, 31], [2.5, 31], [-3, 36.5], [2.5, 36.5]].forEach(([x, z]) => add(x, 5, z, x + .5, 8.6, z + .5, 'metal'));
  stairs(-1.5, 25, 1.5, 31, 5, .5, 8, 'z', 1);
  add(-3, 9, 36.9, 3, 10, 37, 'rail', { nc: 1 }); add(-3, 9, 31, -2.9, 10, 37, 'rail', { nc: 1 }); add(2.9, 9, 31, 3, 10, 37, 'rail', { nc: 1 });
  // equipos de refrigeración (cobertura alta) y pretiles bajos
  add(-12, 5, 23.5, -8, 7, 27, 'metal'); add(-12.2, 7, 23.3, -7.8, 7.3, 27.2, 'trim');
  add(8, 5, 23.5, 12, 7, 27, 'metal'); add(7.8, 7, 23.3, 12.2, 7.3, 27.2, 'trim');
  add(-14, 5, 32.5, -6, 6.2, 33.1, 'concrete'); add(6, 5, 32.5, 14, 6.2, 33.1, 'concrete');
  add(-6, 5, 19, -3, 6.3, 21, 'crate'); add(4, 5, 20, 6.5, 6.6, 22.5, 'crate'); add(4.5, 6.6, 20.5, 6, 7.6, 22, 'crate');
  // tanque de agua sobre patas en la esquina, con un saltador para subir
  add(-15.5, 8, 34, -11.5, 10.6, 37.5, 'pillar'); add(-15.7, 10.6, 33.8, -11.3, 10.9, 37.7, 'trim');
  [[-15.5, 34], [-12, 34], [-15.5, 37], [-12, 37]].forEach(([x, z]) => add(x, 5, z, x + .5, 8, z + .5, 'metal'));
  pads.push({ x: -13.5, y: 5, z: 30, r: 1, t: [-13.5, 10.9, 35.6], apex: 2 });
  // antena
  add(13.3, 5, 36.3, 13.7, 14, 36.7, 'metal'); add(12.6, 13.2, 36.4, 14.4, 13.4, 36.6, 'metal', { nc: 1 });

  /* ---- Ítems ---- */
  I('quad', 0, 7, 0);
  I('health', -8, 0, 10); I('health', 8, 0, -10); I('shells', 14, 6, -14); I('bullets', -14, 6, 14); I('armor', 14, 6, 14);
  I('w6', 0, 12, -31); I('slugs', 3, 12, -32.5); I('armor', -20, 2.5, -36); I('health', 20, 0, -36);
  I('w4', -16, 1.5, -25); I('grenades', 16, 2, -22); I('shells', 0, 0, -24);
  I('w2', -37, 3, 0); I('w3', -29, 0, 12); I('bullets', -37, 3, -12); I('armorH', -21, 6, -12); I('health', -19, 6, 12.5); I('shells', -37, 0, 13);
  I('mega', 37, 4, 0); I('rockets', 37, 4, 4); I('health', 29.5, 1.8, -11); I('shells', 19, 0, 12); I('bullets', 19, 0, -12); I('grenades', 29.5, 1.8, 11);
  I('w5', 0, -2.5, 32); I('rockets', -13, -3, 30); I('armor', 12, -3, 28); I('health', -10, -1, 28); I('w1', -8, -3, 35);
  I('health', 10, 5, 30); I('bullets', -10, 5, 30); I('w8', 0, 9, 34); I('rockets', -10, 5, 20);
  I('armor', -37, 9.5, 4.5); I('slugs', -30, 9.5, 4.5); I('health', -2.5, -3, 27);
  // más curación repartida
  I('health', -13.5, 10.9, 35.6); I('health', -14, 5, 20); I('health', 14, 5, 20); I('health', -24, 0, -30); I('health', 24, 0, -36.5);
  I('health', 19, 0, 0); I('health', -29.5, 0, 9.5); I('health', -37, 3, 0); I('health', 0, 0, 13);

  /* ---- Puntos de aparición ---- */
  [[6, 0, -13], [-6, 0, 13], [-14, 6, 4], [14, 6, -4], [-12, 0, -26], [-33, 9.5, 4.5], [22, 0, -34], [-30, 0, -12], [-37, 3, 8], [-21, 6, -2],
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
    { x: 0, y: -2, z: 0, c: 0xff4a10, i: 1.4, d: 12 },
    { x: -32, y: 11, z: 4.5, c: 0x6fd8ff, i: 1.1, d: 16 },
    { x: -38, y: 6, z: 0, c: 0xffa040, i: 1.0, d: 14 },
    { x: 0, y: 11, z: 34, c: 0x6fd8ff, i: 1.0, d: 18 },
    { x: 23, y: 5, z: -27.5, c: 0x8fe0ff, i: 1.0, d: 12 }
  );

  return finish({ id: 'represa', name: 'dm1 · La Represa', bounds: { x0: -41, x1: 41, z0: -41, z1: 39 },
    theme: { sky: 'dusk', fog: 0x1c1310, fogD: .0105, amb: 0x55453a, ambI: .85, hemi: [0x5a4a6a, 0x1a100a, .55], sun: true } });
}
MAPDEFS.represa = buildRepresa;

/* ---------- dm2 · Humita — un boliche (homenaje a la noche de Posadas; el id interno sigue siendo 'panymanteca') ---------- */
function buildPanYManteca() {
  const { pads, spawns, lights, add, wall, stairs, D, face, I, mover, finish } = mapKit();
  /* ---- cáscara: salón principal x[-20,20] z[-18,18], techo a 16 ---- */
  // pared del fondo con tres puertas al backstage: una desde el escenario y dos desde arriba de las torres de parlantes
  wall(-21, -19, 21, -18, -2, 17, [D(-3, 3, 2, 6), D(-20, -17, 5, 9), D(17, 20, 5, 9)], 'black');
  /* ---- BACKSTAGE (ala nueva detrás del escenario): camarines, micro de la gira, pasarelas y montacargas ---- */
  add(-22, -2, -45, 22, 17, -44, 'black'); add(-22, -2, -44, -21, 17, -19, 'black'); add(21, -2, -44, 22, 17, -19, 'black');
  add(-21, -1, -44, 21, 0, -19, 'club'); add(-21, 13, -44, 21, 14, -19, 'roof');
  add(-3, 0, -23, 3, 2, -19, 'stage'); stairs(-3, -29, 3, -23, 0, .5, 4, 'z', 1, 'stage');
  add(-21, 4.6, -44, -15, 5, -19, 'truss'); add(15, 4.6, -44, 21, 5, -19, 'truss'); add(-15, 4.6, -44, 15, 5, -39, 'truss');
  add(-15, 5, -39, -14.9, 6, -19, 'rail', { nc: 1 }); add(14.9, 5, -39, 15, 6, -19, 'rail', { nc: 1 });
  // camarines debajo de las pasarelas, con espejo y sillón
  for (const s of [-1, 1]) {
    const X = (a, b) => s < 0 ? [a, b] : [-b, -a];
    let [a, b] = X(-15.4, -15); wall(a, -44, b, -30, 0, 4.6, [D(-37, -34, 0, 3.4)], 'velvet');
    [a, b] = X(-21, -15.4); add(a, 0, -30.4, b, 4.6, -30, 'velvet');
    [a, b] = X(-20.8, -20.5); add(a, .8, -42, b, 3.4, -32, 'mirror');
    [a, b] = X(-20, -17.5); add(a, 0, -43.5, b, .7, -38, 'velvet');
  }
  // el micro de la gira en el medio (se sube por las cajas) y cajas de equipos
  add(-6, 0, -40, 6, 3.6, -33, 'navy'); add(-6.05, 1.8, -40, 6.05, 2.8, -33, 'glass', { nc: 1 });
  add(-9, 0, -36, -7, 1.3, -34, 'speaker'); add(-8.5, 1.3, -35.6, -7.2, 2.5, -34.4, 'speaker');
  add(8, 0, -30, 10.5, 1.5, -27.5, 'black'); add(-11, 0, -27, -8.5, 1.2, -24.5, 'black'); add(9, 0, -42, 12, 2.2, -39.5, 'speaker');
  // pasarela móvil que cruza entre las dos pasarelas laterales, montacargas y saltador
  mover(-15, 4.6, -33, -12, 5, -30, 'lift', 0, 27, 11, 0);
  mover(-15, -.1, -27, -12, .3, -24, 'lift', 1, 4.7, 7, Math.PI);
  pads.push({ x: 12, y: 0, z: -35, r: 1, t: [12, 5, -41.5], apex: 1.4 });
  add(-20.9, 9, -43.9, 20.9, 9.3, -43.7, 'neonP', { nc: 1 }); add(-20.9, 4.3, -44, -20.7, 4.5, -19, 'neonC', { nc: 1 }); add(20.7, 4.3, -44, 20.9, 4.5, -19, 'neonP', { nc: 1 });
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
  /* ---- cabina flotante con el daño triple ---- */
  add(-2.5, 10.6, -2.5, 2.5, 11, 2.5, 'chrome');
  /* ---- partes móviles ---- */
  mover(-14.5, 6.6, -7.5, -11.5, 7, -4.5, 'lift', 0, 26, 10, 0);              // plataforma que cruza el salón
  mover(-14.5, 6.6, 4.5, -11.5, 7, 7.5, 'lift', 0, 26, 10, Math.PI);
  mover(-14, -.1, 10, -11, .3, 13, 'lift', 1, 6.7, 8, 0);                    // ascensores al VIP sur
  mover(11, -.1, 10, 14, .3, 13, 'lift', 1, 6.7, 8, Math.PI);
  // tarimas LED que suben y bajan en la pista por turnos: cobertura que cambia al ritmo de la música
  [[-6, -6.5, 0], [6, -6.5, 1], [6, 6.5, 2], [-6, 6.5, 3]].forEach(([x, z, k]) =>
    mover(x - 1, -1.6, z - 1, x + 1, -.5, z + 1, 'led', 1, 2.6, 6.4, k * Math.PI / 2));
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
  /* ---- TERRAZA (techo del lobby, a 5 m) — antes estaba vacía ---- */
  stairs(-3, 19, 3, 22, 5, .5, 4, 'z', -1, 'stage');                             // escalera a la puerta del VIP
  add(-15, 5, 26, -13.5, 6.3, 31, 'glass'); add(-15.2, 6.3, 25.8, -13.3, 6.45, 31.2, 'chrome');   // barra
  add(-15.9, 5, 25.5, -15.6, 9, 31.5, 'mirror');
  add(10, 5, 30.6, 15, 5.6, 31.8, 'velvet'); add(10, 5.6, 31.4, 15, 6.4, 31.8, 'velvet');          // sillones
  add(-9.5, 5, 22.5, -7, 6.3, 25, 'black'); add(7, 5, 22.5, 9.5, 6.3, 25, 'black');                // macetones / cobertura
  add(-9.5, 6.3, 22.5, -7, 6.4, 25, 'neonP', { nc: 1 }); add(7, 6.3, 22.5, 9.5, 6.4, 25, 'neonC', { nc: 1 });
  add(-6, 5, 28, -4, 6.6, 30, 'speaker'); add(4, 5, 28, 6, 6.6, 30, 'speaker');
  // torre del DJ de la terraza: ascensor hasta un mirador a 10 m con el rifle de caza
  add(-2.5, 9.6, 27, 2.5, 10, 31, 'truss');
  [[-2.5, 27], [2, 27], [-2.5, 30.5], [2, 30.5]].forEach(([x, z]) => add(x, 5, z, x + .5, 9.6, z + .5, 'chrome'));
  mover(-1.25, 4.9, 24.6, 1.25, 5.3, 27, 'lift', 1, 4.7, 7, 0);
  add(-2.5, 10, 30.9, 2.5, 11, 31, 'rail', { nc: 1 });
  add(-2.6, 10, 27, -2.5, 11, 31, 'neonP', { nc: 1 }); add(2.5, 10, 27, 2.6, 11, 31, 'neonC', { nc: 1 });
  // arco de neón sobre la terraza
  add(-16, 13.8, 21.5, 16, 14, 21.7, 'neonP', { nc: 1 }); add(-16, 13.8, 29.5, 16, 14, 29.7, 'neonC', { nc: 1 });
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
  I('rockets', 0, 3.6, -36.5); I('armor', -18, 5, -41); I('health', 18, 5, -41); I('health', -18, 0, -36); I('shells', 18, 0, -36); I('bullets', -10, 0, -22); I('grenades', 10, 1.5, -28.75); I('health', 0, 5, -41.5);
  I('armorH', -4.5, 5, 24); I('w9', 0, 10, 29.5); I('health', 12.5, 5, 26); I('health', -12, 5, 28.5); I('shells', 0, 0, -6.5); I('health', -18.5, 0, 0); I('health', 18.5, 0, 0); I('health', -12, 0, 22); I('health', 12, 0, 22); I('w1', -6, 2, -15.5);
  /* ---- apariciones ---- */
  [[-14, 0, -6], [14, 0, 6], [-8, 0, 15], [8, 0, 15.5], [4, 2, -16.5], [-17.5, 7, 1], [17.5, 7, -2], [-5, 7, 15.5], [5, 7, 15.5],
   [-10, 0, 21], [10, 0, 21], [-10, 0, -31], [10, 0, -33], [-18, 5, -28], [18, 5, -28], [0, 3.6, -38], [-17.5, 0, -40], [17.5, 0, -40], [-6, 0, 30], [6, 0, 30], [-12, 5, 24], [12, 5, 24], [0, 1, 0]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push(
    { x: -12, y: 9, z: 0, c: 0xff2bd6, i: 1.6, d: 30 },
    { x: 12, y: 9, z: 0, c: 0x2be6ff, i: 1.6, d: 30 },
    { x: 0, y: 14, z: 0, c: 0x8a4bff, i: 1.5, d: 34 },
    { x: 0, y: 6, z: -14, c: 0xffb040, i: 1.4, d: 22 },
    { x: 0, y: 3.5, z: 25, c: 0xff3050, i: 1.3, d: 22 },
    { x: 0, y: 10, z: 26, c: 0x6a7bff, i: 1.1, d: 26 },
    { x: -10, y: 10, z: -32, c: 0xff3050, i: 1.6, d: 28 }, { x: 10, y: 10, z: -32, c: 0x8a4bff, i: 1.6, d: 28 }
  );
  return finish({ id: 'panymanteca', name: 'dm2 · Humita', bounds: { x0: -22, x1: 22, z0: -45, z1: 34 },
    theme: { sky: 'night', fog: 0x0d0716, fogD: .013, amb: 0x3a2a55, ambI: .9, hemi: [0x6040a0, 0x10081a, .55], sun: false, club: true } });
}
MAPDEFS.panymanteca = buildPanYManteca;

/* ---------- dm3 · La Cuenca — Universidad de la Cuenca del Plata, Posadas ----------
   La plaza de baldosas frente al edificio blanco: cantero con la palmera, escaleras al acceso
   de columnas oscuras, terraza a la derecha, rampa larga con baranda, rampa lateral con alambrado
   y la vereda de ladrillo. El edificio se recorre por dentro: planta baja, dos pisos de aulas,
   biblioteca con balcón y terraza en el techo. Norte = -z (el edificio), sur = +z (la calle). */
function buildLaCuenca() {
  const { pads, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  /* ---- suelo, vecinos y límites ---- */
  add(-30, -2, -30, 30, 0, 29, 'brick');
  // pared oeste con dos pasos al polideportivo: desde la calle y desde la azotea de las casas (a 5 m)
  add(-31, -2, -31, -30, 10, -14, 'block'); add(-31, -2, -14, -30, 5, -8, 'block'); add(-31, 9, -14, -30, 10, -8, 'block');
  add(-31, -2, -8, -30, 10, 14, 'block'); add(-31, -2, 14, -30, 0, 24, 'block'); add(-31, 6, 14, -30, 10, 24, 'block'); add(-31, -2, 24, -30, 10, 30, 'block');
  add(30, -2, -31, 31, 10, 30, 'block');
  /* ---- POLIDEPORTIVO (ala nueva al oeste): cancha, tribuna, vestuarios y balcón ---- */
  add(-67, -2, -31, -31, 16, -30, 'block'); add(-67, -2, 28, -31, 16, 29, 'block'); add(-67, -2, -30, -66, 16, 28, 'block');
  add(-66, -2, -30, -31, 0, 28, 'concrete'); add(-66, 14, -30, -31, 15, 28, 'roof');
  // cancha de fútbol de césped sintético: las líneas van pintadas en el deco 'pitch'; un arco en cada punta (5 x 2,4 m) con red
  deco.push({ t: 'pitch', x0: -61, x1: -37, z0: -18, z1: 17.9, y: .02, lx0: -60, lx1: -38, lz0: -16, lz1: 16 });
  for (const s of [-1, 1]) {
    const z = s * 16, zb = s * 17.3, zl = Math.min(z, zb), zh = Math.max(z, zb);
    add(-51.7, 0, z - .1, -51.5, 2.6, z + .1, 'whitewall'); add(-46.5, 0, z - .1, -46.3, 2.6, z + .1, 'whitewall');   // palos
    add(-51.7, 2.4, z - .1, -46.3, 2.6, z + .1, 'whitewall');                                                            // travesaño
    add(-51.7, 0, zb - .05, -46.3, 2.5, zb + .05, 'fence');                                                            // red del fondo
    add(-51.7, 0, zl, -51.6, 2.5, zh, 'fence'); add(-46.4, 0, zl, -46.3, 2.5, zh, 'fence');                         // redes de los costados
    add(-51.7, 2.45, zl, -46.3, 2.5, zh, 'fence', { nc: 1 });                                                            // red de arriba
  }
  stairs(-60, 18, -38, 28, 0, .5, 10, 'z', 1, 'board');                            // tribuna
  // vestuarios bajo la cubierta del norte
  wall(-66, -20, -31, -19.5, 0, 5.1, [D(-62, -58, 0, 3.5), D(-44, -40, 0, 3.5)], 'whitewall');
  wall(-49.5, -30, -49, -20, 0, 5.1, [D(-27, -24, 0, 3.5)], 'whitewall');
  add(-66, 5.1, -30, -31, 5.5, -19.5, 'tiles');                                    // cubierta (se camina arriba)
  for (const x of [-64, -58, -53]) add(x, 0, -29.5, x + 3, 2.4, -28.8, 'metal');   // casilleros
  for (const x of [-46, -40, -35]) add(x, 0, -29.5, x + 3, 2.4, -28.8, 'metal');
  add(-63, 0, -24, -57, .5, -23, 'wood'); add(-45, 0, -24, -38, .5, -23, 'wood');  // bancos
  // balcón del este (5,5 m) con la puerta a la azotea de las casas y escalera a la cancha
  add(-37, 5.1, -19.5, -31, 5.5, 8, 'wood');
  stairs(-37, 8, -31, 14, 0, .5, 11, 'z', -1, 'step');
  add(-37.1, 5.5, -19.5, -37, 6.5, 8, 'rail', { nc: 1 }); add(-66, 5.5, -19.6, -37, 6.5, -19.5, 'rail', { nc: 1 });
  // plataforma que cruza la cancha a 5,5 m y saltador a la cubierta
  mover(-40, 5.1, -2, -37, 5.5, 1, 'lift', 0, -20, 12, 0);
  pads.push({ x: -49, y: 0, z: -12, r: 1, t: [-49, 5.5, -24.5], apex: 2 });
  // tablero y luces del techo
  add(-65.9, 7, -6, -65.7, 10, 6, 'led', { nc: 1 });
  for (const z of [-12, 0, 12]) add(-62, 13.6, z - .2, -36, 13.9, z + .2, 'light', { nc: 1 });
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
  /* ---- azoteas de los vecinos: se sube con saltadores desde la calle ---- */
  // derecha (7 m): tanque de agua, equipos de aire, parapeto y un saltador al techo del edificio
  pads.push({ x: 27, y: 0, z: 13, r: 1, t: [27, 7, 5], apex: 1.6 });
  add(25, 7, -25, 29, 10, -20, 'metal'); add(24.8, 10, -25.2, 29.2, 10.4, -19.8, 'trim');
  add(24.6, 7, -8, 26.6, 8.3, -6, 'metal'); add(27.6, 7, -2, 29.6, 8.3, 0, 'metal');
  add(24, 7, -12, 24.4, 7.8, 8, 'whitewall');
  add(26, 7, -15, 28.5, 8.2, -13.5, 'crate');
  pads.push({ x: 27, y: 7, z: -17, r: 1, t: [12, 15, -13], apex: 4.5 });
  // izquierda (5 m): chimeneas de ladrillo, antena y cajas
  pads.push({ x: -27, y: 0, z: 13, r: 1, t: [-27, 5, 5], apex: 1.6 });
  add(-28.5, 5, -6, -26.5, 7.5, -4, 'brick'); add(-26, 5, -20, -24.5, 6.8, -18.5, 'brick');
  add(-29, 5, -14, -27, 6.2, -11.5, 'crate'); add(-27, 5, -13.6, -25.6, 5.8, -12, 'crate');
  add(-24.4, 5, -30, -24, 5.8, 10, 'whitewall');
  add(-27.6, 5, 2, -27.3, 9, 2.3, 'metal'); add(-28.5, 8.6, 2, -26.4, 8.8, 2.3, 'metal', { nc: 1 });
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
  // segunda escalera de emergencia, del lado este: el que viene por el pasillo derecho ya no choca con la pared, sube hasta la biblioteca
  stairs(6, -30, 22, -28, 0, .25, 44, 'x', -1, 'step');
  add(6, 0, -30.05, 22, 1, -30, 'rail');
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
  // polideportivo
  I('health', -49, 0, 0); I('armorH', -49, 0, -16.7); I('w2', -58, 0, -26); I('health', -63, 0, -25); I('health', -41, 0, -25.5); I('health', -55, 5, 27.5); I('rockets', -34, 5.5, -10);
  I('shells', -60, 5.5, -25); I('bullets', -35, 0, 20); I('health', -34, 5.5, 4); I('grenades', -64, 0, 20);
  I('armor', 27, 7, -4); I('health', 25.5, 7, 6); I('bullets', 28, 7, -10.5); I('grenades', 27, 10.4, -22.5);
  I('armor', -27, 5, -9); I('health', -25.5, 5, 6); I('shells', -28, 5, -16); I('health', 14, 0, -29);
  I('shells', -14, 3.05, -14); I('bullets', 6, 3, -4); I('rockets', 10, 15, -10); I('grenades', -10, 7, -9); I('slugs', 0, 7, -26); I('caza', -20, 0, 20);
  /* ---- apariciones ---- */
  [[-8, 1.5, 8], [6, 1.5, 6], [0, 1.5, 11], [13, 1.5, 11.5], [-20, 0, 22], [0, 0, 21], [18, 0, 24], [10, 3, -3.5], [-19, 3, -10],
   [-10, 3.05, -14], [8, 3.05, -14], [27, 7, -9], [-27, 5, -2], [-45, 0, -8], [-53, 0, 8], [-63, 0, -27], [-40, 0, -27], [-34, 5.5, -5], [-50, 5, 27.5], [-63, 0, 10], [-10, 7, -9], [8, 7, -9], [1, 7, -13.2], [-8, 11, -12], [10, 11, -12]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: -2, y: 5.8, z: -13, c: 0xfff2dc, i: .55, d: 18 }, { x: 6, y: 9.8, z: -9, c: 0xfff2dc, i: .5, d: 20 },
    { x: 0, y: 13.6, z: -18, c: 0xffe6c0, i: .55, d: 22 }, { x: 19, y: 9, z: -20, c: 0xfff2dc, i: .45, d: 16 },
    { x: -49, y: 12, z: 2, c: 0xfff6e6, i: .9, d: 42 }, { x: -50, y: 4, z: -25, c: 0xffe6c0, i: .6, d: 16 });
  return finish({ id: 'lacuenca', name: 'dm3 · La Cuenca', bounds: { x0: -67, x1: 27, z0: -30, z1: 28 }, deco,
    theme: { sky: 'day', fog: 0xbfd3e6, fogD: .0045, amb: 0xc9d0da, ambI: .48, hemi: [0xbcd8ff, 0x8a7a62, .42], sun: true, sunC: 0xfff1d6, sunI: .72 } });
}
MAPDEFS.lacuenca = buildLaCuenca;

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
MAPDEFS.puente = buildPuente;

/* ---------- snp1 · Fuertes del Cañón ----------
   Dos establos, uno de cada lado de un cañón de roca roja con un río abajo, unidos por un puente de madera
   techado en el medio y dos puentes de tablones a los costados. Rojo al norte, azul al sur (simétrico respecto de z = 0). */
function buildFuertes() {
  const { pads, lava, spawns, lights, add, wall, stairs, D, face, I, finish } = mapKit();
  const tspawns = [[], []];
  /* ---- cañón: paredes altas, río y cascada ---- */
  add(-47, -16, -49, 47, 30, -48, 'canyon'); add(-47, -16, 48, 47, 30, 49, 'canyon');
  add(-47, -16, -48, -46, 30, 48, 'canyon'); add(46, -16, -48, 47, 30, 48, 'canyon');
  add(-46, -16, -14, 46, -12, 14, 'rock');                                          // lecho del río
  lava.push({ min: [-46, -16, -14], max: [46, -6, 14], dps: 999, water: 1 });
  add(40, -12, -14, 46, 26, -6, 'canyon'); add(40, -12, 6, 46, 26, 14, 'canyon');    // fondo del cañón con la cascada
  add(-46, -12, -14, -40, 26, 14, 'canyon');
  add(43.6, -6, -6, 44.6, 26, 6, 'falls', { nc: 1 }); add(44.6, -12, -6, 46, 26, 6, 'canyon');
  add(36, -6.1, -6.5, 44, -5.9, 6.5, 'whitewall', { nc: 1 });                       // espuma
  for (const [x, z, r, h] of [[-22, 3, 2.2, -3], [16, -4, 1.8, -4.5], [31, 6, 2.5, -2]]) add(x - r, -12, z - r, x + r, h, z + r, 'canyon');
  /* ---- el único puente: tablones, baranda de postes y pérgola en el medio ---- */
  add(-3, -.4, -15, 3, 0, 15, 'wood');
  for (const x of [-3.1, 2.95]) { add(x, 0, -14, x + .15, 1.2, 14, 'wood', { nc: 0 }); }
  for (let z = -14; z <= 14; z += 3.5) for (const x of [-3.2, 2.9]) add(x, 0, z - .15, x + .3, 1.4, z + .15, 'wood');
  for (let z = -9; z <= 9; z += 1.2) add(-3.4, 3.3, z - .25, 3.4, 3.55, z + .25, 'wood', { nc: 1 });      // pérgola
  for (const z of [-9, 9]) for (const x of [-3.2, 2.9]) add(x, 1.4, z - .15, x + .3, 3.3, z + .15, 'wood');
  for (const z of [-10, -4, 4, 10]) { add(-2.6, -12, z - .3, -2, -.4, z + .3, 'wood', { nc: 1 }); add(2, -12, z - .3, 2.6, -.4, z + .3, 'wood', { nc: 1 });
    add(-2.6, -4, z - .2, 2.6, -3.6, z + .2, 'wood', { nc: 1 }); add(-.3, -12, z - .3, .3, -3.6, z + .3, 'wood', { nc: 1 }); }
  /* ---- cada lado: meseta, establo grande de tres pisos, galpón, mirador y cobertura ---- */
  for (const s of [-1, 1]) {
    const team = s < 0 ? 0 : 1, flag = s < 0 ? 'neonR' : 'neonB', barn = s < 0 ? 'barn' : 'barnB';
    const Z = (a, b) => s < 0 ? [a, b] : [-b, -a];
    const A = (x0, y0, z0, x1, y1, z1, mat, ex) => { const [a, b] = Z(z0, z1); return add(x0, y0, a, x1, y1, b, mat, ex); };
    const SZ = (x0, z0, x1, z1, yb, rise, n, dir, mat) => { const [a, b] = Z(z0, z1); return stairs(x0, a, x1, b, yb, rise, n, 'z', dir * -s, mat); };
    const WX = (x0, z0, x1, z1, y0, y1, doors, mat) => { const [a, b] = Z(z0, z1); wall(x0, a, x1, b, y0, y1, doors, mat); };
    // meseta y mesas del fondo
    A(-46, -16, -48, 46, -.2, -14, 'canyon'); A(-46, -.2, -48, 46, 0, -14, 'grass');
    A(-46, 0, -48, 46, 20, -43, 'canyon'); A(-46, 0, -43, -34, 10, -39, 'canyon'); A(28, 0, -43, 46, 13, -40, 'canyon'); A(-46, 0, -39, -40, 5, -14, 'canyon');
    A(40, 0, -40, 46, 7, -14, 'canyon');
    // ESTABLO: 28 x 15 m, fachada de 12 m con tres filas de ventanas al cañón y techo a la holandesa
    WX(-14, -20.4, 14, -20, 0, 12, [D(-3, 3, 0, 4), D(-10, -7, 1.2, 2.8), D(7, 10, 1.2, 2.8),
      D(-12, -9.5, 5.3, 7), D(-6.5, -4, 5.3, 7), D(-1.25, 1.25, 5.3, 7), D(4, 6.5, 5.3, 7), D(9.5, 12, 5.3, 7),
      D(-9, -6, 9.3, 10.8), D(-1.5, 1.5, 9.3, 10.8), D(6, 9, 9.3, 10.8)], barn);
    WX(-14, -36, 14, -35.6, 0, 12, [D(-2, 2, 0, 3.5), D(-10, -7, 5.3, 7), D(7, 10, 5.3, 7)], barn);
    A(-14, 0, -35.6, -13.6, 12, -20.4, barn); A(13.6, 0, -35.6, 14, 12, -20.4, barn);
    // pisos: primer piso entero (con el hueco de la escalera) y pajar al frente
    A(-13.6, 4.1, -35.6, 10.8, 4.5, -20.4, 'wood'); A(10.8, 4.1, -26, 13.6, 4.5, -20.4, 'wood');
    A(-13.6, 8.1, -28, 13.6, 8.5, -20.4, 'wood');
    A(-13.6, 8.5, -28.1, 13.6, 9.5, -28, 'rail', { nc: 1 });
    SZ(11, -35.4, 13.4, -26, 0, .5, 9, 1, 'wood');                                   // planta baja → primer piso
    SZ(-13.4, -34.2, -11, -28, 4.5, .5, 8, 1, 'wood');                              // primer piso → pajar
    // techo a la holandesa como en los establos de verdad: frente rojo escalonado, tejas oscuras en cada escalón
    // (con alero adelante y atrás) y una moldura blanca que dibuja el contorno
    let prev = 14;
    for (const [hw, y0, y1] of [[14.6, 12, 12.6], [12.8, 12.6, 13.5], [11, 13.5, 14.4], [9, 14.4, 15.2], [6.8, 15.2, 15.9], [4.4, 15.9, 16.5], [2, 16.5, 17]]) {
      A(-hw + .3, y0, -35.8, hw - .3, y1 - .3, -20, barn);
      A(-hw, y1 - .3, -36.6, hw, y1 + .1, -20.3, 'roofTiles');
      A(-hw + .3, y1 - .55, -19.98, hw - .3, y1 - .3, -19.85, 'whitewall', { nc: 1 });
      for (const sx of [-1, 1]) A(sx > 0 ? hw - .55 : -hw + .3, y0, -19.98, sx > 0 ? hw - .3 : -hw + .55, y1 - .3, -19.85, 'whitewall', { nc: 1 });
      prev = hw;
    }
    // puerta del pajar arriba con su marco
    A(-1.3, 13.6, -19.9, 1.3, 15.6, -19.8, 'wood', { nc: 1 });
    for (const [x0, y0, x1, y1] of [[-1.5, 13.4, 1.5, 13.6], [-1.5, 15.6, 1.5, 15.8], [-1.5, 13.4, -1.3, 15.8], [1.3, 13.4, 1.5, 15.8], [-.08, 13.6, .08, 15.6]]) A(x0, y0, -19.82, x1, y1, -19.72, 'whitewall', { nc: 1 });
    // marcos blancos de todas las ventanas y la puerta, y molduras entre pisos
    for (const [a, b, y0, y1] of [[-3, 3, 0, 4], [-10, -7, 1.2, 2.8], [7, 10, 1.2, 2.8], [-12, -9.5, 5.3, 7], [-6.5, -4, 5.3, 7], [-1.25, 1.25, 5.3, 7], [4, 6.5, 5.3, 7], [9.5, 12, 5.3, 7], [-9, -6, 9.3, 10.8], [-1.5, 1.5, 9.3, 10.8], [6, 9, 9.3, 10.8]]) {
      const t = .2;
      A(a - t, y1, -19.98, b + t, y1 + t, -19.84, 'whitewall', { nc: 1 }); if (y0 > 0) A(a - t, y0 - t, -19.98, b + t, y0, -19.84, 'whitewall', { nc: 1 });
      A(a - t, y0, -19.98, a, y1, -19.84, 'whitewall', { nc: 1 }); A(b, y0, -19.98, b + t, y1, -19.84, 'whitewall', { nc: 1 });
    }
    for (const y of [4.05, 8.05, 11.85]) A(-14, y, -19.96, 14, y + .2, -19.86, 'whitewall', { nc: 1 });
    A(-14, 0, -19.96, -13.75, 12, -19.86, 'whitewall', { nc: 1 }); A(13.75, 0, -19.96, 14, 12, -19.86, 'whitewall', { nc: 1 });
    // portones corredizos a los costados de la puerta, con la cruz blanca hecha de cubitos
    for (const [a, b] of [[-6.4, -3.3], [3.3, 6.4]]) {
      A(a, 0, -19.84, b, 3.9, -19.7, barn, { nc: 1 });
      A(a, 3.7, -19.7, b, 3.9, -19.6, 'whitewall', { nc: 1 }); A(a, 0, -19.7, b, .2, -19.6, 'whitewall', { nc: 1 }); A(a, 0, -19.7, a + .2, 3.9, -19.6, 'whitewall', { nc: 1 }); A(b - .2, 0, -19.7, b, 3.9, -19.6, 'whitewall', { nc: 1 });
      for (let k = 0; k <= 11; k++) { const t = k / 11, x1 = a + .2 + t * (b - a - .6), x2 = b - .4 - t * (b - a - .6), y = .2 + t * 3.3; A(x1, y, -19.7, x1 + .22, y + .24, -19.6, 'whitewall', { nc: 1 }); A(x2, y, -19.7, x2 + .22, y + .24, -19.6, 'whitewall', { nc: 1 }); }
    }
    A(-14.3, 0, -20.5, 14.3, .5, -19.7, 'concrete');                                // zócalo de piedra
    // adentro: boxes, fardos y cajas para cubrirse en cada piso
    for (const x of [-9, -4, 1, 6]) A(x - .1, 0, -35.6, x + .1, 1.4, -30, 'wood');
    A(-12, 0, -24.5, -9.5, 1.2, -22.5, 'hay'); A(5.5, 0, -25, 8.5, 1.2, -23, 'hay'); A(6, 1.2, -24.6, 8, 2.3, -23.4, 'hay');
    A(-8, 4.5, -24.5, -5.5, 5.6, -23, 'hay'); A(2.5, 4.5, -25, 5, 5.6, -23.5, 'hay'); A(-2, 4.5, -33, 2, 5.7, -31, 'crate');
    A(-6, 8.5, -24, -3.5, 9.5, -22.8, 'hay'); A(3.5, 8.5, -24, 6, 9.5, -22.8, 'hay');
    // galpón blanco al costado, con terraza arriba
    WX(-25, -20.4, -14, -20, 0, 4.5, [D(-22, -19, 1.2, 3), D(-17.5, -15.5, 0, 3.4)], 'whitewall');
    WX(-25, -31, -14, -30.6, 0, 4.5, [D(-21, -19, 0, 3.4)], 'whitewall');
    A(-25, 0, -30.6, -24.6, 4.5, -20.4, 'whitewall');
    A(-25.2, 4.5, -31.2, -14, 4.9, -19.8, 'board'); A(-25.2, 4.9, -20, -14, 5.9, -19.8, 'wood');
    SZ(-26.8, -30.5, -25.2, -22, 0, .49, 10, -1, 'wood');                            // escalera de afuera a la terraza
    A(-23, 0, -29.5, -20, 1.2, -27.5, 'crate'); A(-18, 4.9, -24, -16, 6, -22, 'hay');
    // mirador con estandarte del equipo
    SZ(16.5, -40, 20.5, -31, 0, .5, 22, 1, 'wood');
    for (const [x, z] of [[16, -31], [20.6, -31], [16, -26], [20.6, -26]]) A(x, 0, z, x + .4, 14, z + .4, 'wood');
    A(15.6, 10.6, -31, 21.4, 11, -25.6, 'board');
    A(15.6, 11, -25.9, 21.4, 12.1, -25.6, 'whitewall'); A(15.6, 11, -31, 15.9, 12.1, -25.6, 'whitewall'); A(21.1, 11, -31, 21.4, 12.1, -25.6, 'whitewall');
    A(15.2, 14, -31.4, 21.8, 14.4, -25.2, 'roofTiles');
    A(17, 4, -25.65, 19.6, 10, -25.55, flag, { nc: 1 }); A(16, 0, -26, 21, 10.6, -25.6, 'whitewall');
    // cobertura en el patio y cerca al borde (con hueco en el puente)
    A(-12, 0, -17.5, -9.5, 1.2, -16, 'hay'); A(9.5, 0, -18, 12, 1.2, -16.5, 'hay'); A(20, 0, -17, 22.5, 1.2, -15.5, 'hay'); A(-22, 0, -18.2, -19.5, 1.2, -16.8, 'hay');
    A(-36, 0, -33, -32, 2.4, -29, 'canyon'); A(26, 0, -36, 29, 3, -33, 'canyon'); A(30, 0, -24, 34, 1.6, -21.5, 'crate');
    for (const [a, b] of [[-40, -4], [4, 40]]) A(a, 0, -14.7, b, 1.1, -14.5, 'fence');
    // apariciones, ítems y luces
    for (const [x, y, z] of [[1.5, 0, -32.5], [-6, 0, -26], [8, 0, -27.5], [-9, 4.5, -26], [9, 4.5, -23], [-10, 8.5, -24.5], [10, 8.5, -24.5],
      [18.5, 11, -28.5], [-20, 4.9, -25], [-22, 0, -24], [-34, 0, -24], [33, 0, -30]])
      tspawns[team].push({ x, y, z: s * z, yaw: face(x, s * z, x, 0) });
    I('health', 0, 0, s * 27); I('health', 0, 4.5, s * 26); I('health', -12, 8.5, s * 22); I('armor', 18.5, 11, s * 27.5); I('health', -21, 0, s * 23); I('armor', 0, 8.5, s * 22);
    lights.push({ x: 0, y: 6, z: s * 28, c: 0xffd9a0, i: .9, d: 22 });
  }
  spawns.push(...tspawns[0], ...tspawns[1]);
  return finish({ id: 'fuertes', name: 'snp1 · Fuertes del Cañón', bounds: { x0: -47, x1: 47, z0: -49, z1: 49 }, tspawns,
    theme: { sky: 'day', fog: 0xd8c8b0, fogD: .0042, amb: 0xd8c8b8, ambI: .5, hemi: [0xbcd8ff, 0x9a6a42, .45], sun: true, sunC: 0xfff0d0, sunI: .8 } });
}
MAPDEFS.fuertes = buildFuertes;

/* ---------- El Cuarto Tramo — Costanera de Posadas, Misiones ----------
   La vieja estación de ladrillo al atardecer, frente al Paraná. Norte = -z (el edificio), sur = +z (el río).
   · Un solo edificio largo de dos plantas, con galería cubierta abajo y balcón corrido arriba (6 m) con barandas.
     Adentro: hall central con escaleras y dos alas con habitaciones en planta baja y alta.
   · Al balcón se sube por escaleras de reja frente a la fachada (a los costados de la locomotora), por el andamio
     del oeste (plataforma a 3 m con la megasalud) y por la torre del este: plataforma a 3 m, pasarela a 6 m con puerta al piso alto
     y mirador a 9 m. Un saltador por lado sube de golpe al balcón.
   · Andén con vías y la locomotora «La Posadeña» (la cabina se atraviesa), vereda, la costanera con gradas
     y dos muelles. Al sur y al este, solo agua hasta el horizonte: mata al instante. Al oeste, una valla
     transparente: del otro lado la costanera sigue (solo se ve). Farolas, canteros, banderines y árboles dan vida.
   · Dos portales enfrentados: amarillo en el andén oeste y azul en el andén este (a campo abierto); cada uno te deja delante del otro. */
function buildCuartoTramo() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();
  const deco = [];
  // farola de hierro con farol, como las de la costanera
  const farola = (x, z, y) => {
    add(x - .1, y, z - .1, x + .1, y + 4.6, z + .1, 'metal'); add(x - .22, y, z - .22, x + .22, y + .5, z + .22, 'metal', { nc: 1 });
    add(x - .3, y + 4.6, z - .3, x + .3, y + 5.2, z + .3, 'light', { nc: 1 }); add(x - .4, y + 5.2, z - .4, x + .4, y + 5.35, z + .4, 'black', { nc: 1 }); add(x - .2, y + 5.35, z - .2, x + .2, y + 5.55, z + .2, 'black', { nc: 1 });
    deco.push({ t: 'glow', x, y: y + 4.9, z, c: 0xffcf8a });
  };
  // baranda física de 1 m (se puede saltar, pero no se atraviesa): tramos sueltos para dejar entradas donde llegan las escaleras
  const bar = (x0, y, z0, x1, z1) => add(Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1), y + 1, Math.max(z0, z1), 'rail');
  // escalera de andamio: peldaños de reja; abajo es un bloque cerrado de metal (visible) y arriba queda abierta, con vigas y pilares cada dos peldaños
  const andamio = (x0, z0, x1, z1, yb, rise, n, axis, dir) => {
    const lo = axis === 'x' ? x0 : z0, hi = axis === 'x' ? x1 : z1, L = (hi - lo) / n, X = axis === 'x';
    for (let i = 1; i <= n; i++) {
      const a = dir > 0 ? lo + (i - 1) * L : hi - i * L, b = a + L, top = yb + rise * i, bajo = top - .2;
      if (X) add(a, bajo, z0, b, top, z1, 'grate'); else add(x0, bajo, a, x1, top, b, 'grate');
      if (bajo < 2.2) { if (X) add(a, 0, z0, b, bajo, z1, 'metal'); else add(x0, 0, a, x1, bajo, b, 'metal'); }
      else if (X) { add(a, bajo - .45, z0, b, bajo, z0 + .14, 'metal'); add(a, bajo - .45, z1 - .14, b, bajo, z1, 'metal'); if (i % 2 === 0) { add(a, 0, z0, a + .14, bajo - .45, z0 + .14, 'metal'); add(a, 0, z1 - .14, a + .14, bajo - .45, z1, 'metal'); } }
      else { add(x0, bajo - .45, a, x0 + .14, bajo, b, 'metal'); add(x1 - .14, bajo - .45, a, x1, bajo, b, 'metal'); if (i % 2 === 0) { add(x0, 0, a, x0 + .14, bajo - .45, a + .14, 'metal'); add(x1 - .14, 0, a, x1, bajo - .45, a + .14, 'metal'); } }
    }
  };
  // plataforma de andamio: reja, marco de vigas por debajo y pilares hasta el suelo cada ~5 m
  const cubierta = (x0, z0, x1, z1, yt) => {
    add(x0, yt - .3, z0, x1, yt, z1, 'grate');
    add(x0, yt - .65, z0, x1, yt - .3, z0 + .16, 'metal'); add(x0, yt - .65, z1 - .16, x1, yt - .3, z1, 'metal'); add(x0, yt - .65, z0, x0 + .16, yt - .3, z1, 'metal'); add(x1 - .16, yt - .65, z0, x1, yt - .3, z1, 'metal');
    const nx = Math.max(1, Math.round((x1 - x0) / 5)), nz = Math.max(1, Math.round((z1 - z0) / 5));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const px = Math.min(Math.max(x0 + (x1 - x0) * i / nx - .1, x0), x1 - .2), pz = Math.min(Math.max(z0 + (z1 - z0) * j / nz - .1, z0), z1 - .2);
      add(px, 0, pz, px + .2, yt - .65, pz + .2, 'metal');
    }
  };
  const escalera = (x0, x1, z0, z1, n, dir) => { andamio(x0, z0, x1, z1, 0, .5, n, 'x', dir); for (let i = 1; i <= n; i++) { const L = (x1 - x0) / n, a = dir > 0 ? x0 + (i - 1) * L : x1 - i * L; add(a, .5 * i, z1 - .08, a + L, .5 * i + 1, z1, 'rail'); } };
  /* ---- suelo, río y límites ---- */
  add(-62, -2, -40, 62, -.03, 24, 'grass');                              // pasto base (patios laterales)
  add(-50, -2, -26, 50, 0, 8, 'concrete');                               // andén / explanada
  add(-62, -2, 8, 62, 1, 20, 'tiles');                                   // costanera: paseo elevado 1 m
  add(-22, -2, -40, 22, 0, -26, 'tiles');                              // piso del hall
  add(-50, -2, -40, -22, 0, -26, 'concrete'); add(22, -2, -40, 50, 0, -26, 'concrete');   // pisos de las alas
  add(-50, 0, -26, 50, .2, -23.6, 'brick');                              // vereda de ladrillo bajo la galería
  stairs(-62, 20, 62, 24, 0, .25, 4, 'z', -1, 'step');                   // gradas de la costanera hasta el río
  lava.push({ min: [-420, -4, 24], max: [200, 0, 150], water: true, dps: 0 });   // el Paraná al sur: agua que mata, hasta el horizonte
  lava.push({ min: [62, -4, -43], max: [200, 0, 24], water: true, dps: 0 });     // y al este
  add(-62, -6, 24, 62, -4, 42, 'rock');
  // límites: el fondo es la pared del edificio, al este una loma, al oeste una valla transparente
  add(50.4, -4, -43, 62, 10, -40, 'grass'); add(-50.4, -4, -43, 50.4, 12, -40, 'brick');
  deco.push({ t: 'palm', x: 56, y: 10, z: -41.5, h: 9 });
  add(-62.2, -4, -43, -62, 4, 42, 'fence'); add(-62.2, -4, -40.2, -50.4, 4, -40, 'fence');
  for (let z = -43; z <= 42; z += 6) add(-62.34, 0, z, -62.1, 4.3, z + .3, 'metal'); add(-62.34, 4, -43, -62.1, 4.3, 42, 'metal');
  for (let x = -62; x <= -50.4; x += 6) add(x, 0, -40.34, x + .3, 4.3, -40.1, 'metal');

  // del otro lado de la valla la costanera sigue (solo se ve, no se puede ir): suelo continuo, paseo, vías y galpones de la estación hasta perderse en la niebla
  add(-420, -.5, -150, -62.5, -.03, 24, 'grass', { nc: 1 }); add(-420, -.03, -26, -62.5, 0, 8, 'concrete', { nc: 1 });
  add(-420, -.2, 8, -62.5, 1, 20, 'tiles', { nc: 1 }); add(-420, 1, 11.8, -62.5, 1.02, 12.2, 'brick', { nc: 1 }); add(-420, 1, 16.8, -62.5, 1.02, 17.2, 'brick', { nc: 1 });
  for (let i = 0; i < 4; i++) add(-420, -1, 23 - i, -62.5, .25 + i * .25, 24 - i, 'step', { nc: 1 });
  add(-420, 0, -16.4, -62.5, .05, -11.6, 'rock', { nc: 1 }); add(-420, 0, -15.1, -62.5, .14, -14.95, 'metal', { nc: 1 }); add(-420, 0, -13.05, -62.5, .14, -12.9, 'metal', { nc: 1 });
  for (let x = -64; x > -300; x -= 2) add(x - .4, 0, -15.8, x, .07, -12.2, 'wood', { nc: 1 });
  for (let k = 0; k < 7; k++) {   // galpones de ladrillo con alero, ventanas y puertas a lo largo del norte
    const x1 = -64 - k * 40, x0 = x1 - 36, h = k % 2 ? 8 : 7;
    add(x0, 0, -40, x1, h, -26, 'brick', { nc: 1 }); add(x0 - .6, h, -40.6, x1 + .6, h + .5, -25.4, 'roof', { nc: 1 }); add(x0, h - .6, -26.1, x1, h, -25.9, 'whitewall', { nc: 1 });
    for (let w = x0 + 3; w < x1 - 2; w += 6) { add(w, 1.2, -26.1, w + 2.2, 3.6, -25.95, 'navy', { nc: 1 }); add(w - .25, 1, -26.15, w + 2.45, 1.2, -25.9, 'whitewall', { nc: 1 }); add(w - .25, 3.6, -26.15, w + 2.45, 3.85, -25.9, 'whitewall', { nc: 1 }); }
    for (let w = x0 + 6; w < x1 - 4; w += 12) { add(w, 0, -26.1, w + 2.4, 3.2, -25.95, 'black', { nc: 1 }); add(w - .3, 0, -26.15, w + 2.7, 3.5, -25.9, 'whitewall', { nc: 1 }); }
    add(x0, 3.9, -26, x1, 4.1, -22, 'roof', { nc: 1 }); for (let w = x0 + 2; w < x1; w += 6) add(w, 0, -22.2, w + .2, 3.9, -22, 'metal', { nc: 1 });
    add(x0, 0, -26, x1, .2, -22, 'brick', { nc: 1 });
  }
  add(-420, 0, -150, -64, 26, -110, 'grass', { nc: 1 }); add(-420, 0, -112, -64, 14, -70, 'grass', { nc: 1 });   // lomas del fondo
  for (let x = -76; x >= -300; x -= 16) { farola(x, 19.6, 1); deco.push({ t: 'palm', x: x + 5, y: 1, z: 10.2, h: 8 }); }
  for (let x = -70; x >= -290; x -= 20) { add(x, 1, 12, x + 3.4, 1.45, 12.6, 'wood', { nc: 1 }); add(x, 1.45, 12.5, x + 3.4, 2, 12.6, 'wood', { nc: 1 }); }
  for (let x = -80; x >= -300; x -= 24) farola(x, 6, 0);
  for (const [x, z] of [[-72, -60], [-90, -64], [-110, -58], [-128, -66], [-150, -60], [-172, -64], [-196, -58], [-220, -66], [-246, -60]]) deco.push({ t: 'tree', x, y: -.03, z, h: 7, r: 3 });
  // rampas anchas desde el andén a la costanera
  for (const x of [-42, -6, 32]) ramp(x, 2, x + 10, 8, 0, 0, 1, 'z', 1, 'concrete');
  // franjas rojas de la costanera (solo pintura)
  add(-62, 1, 11.8, 62, 1.02, 12.2, 'brick', { nc: 1 }); add(-62, 1, 16.8, 62, 1.02, 17.2, 'brick', { nc: 1 });
  /* ---- edificio: fachada de dos plantas con arcadas, puertas y ventanas al balcón ---- */
  const puertas = [D(-9.3, -5.7, 0, 4.2), D(-4.3, -.7, 0, 4.2), D(.7, 4.3, 0, 4.2), D(5.7, 9.3, 0, 4.2), D(-32, -28, 0, 3.6), D(28, 32, 0, 3.6), D(-26.6, -24.2, 1, 3), D(24.2, 26.6, 1, 3), D(-36.4, -34, 1, 3), D(34, 36.4, 1, 3)];
  const salidas = [-34, -20, 0, 20, 34];
  for (const c of salidas) puertas.push(D(c - 1.5, c + 1.5, 6, 9.2));                       // puertas al balcón
  for (let c = -46; c <= 46; c += 6) if (salidas.every(d => Math.abs(c - d) >= 3.6)) puertas.push(D(c - 1.2, c + 1.2, 7.2, 9.6));   // ventanas
  wall(-50, -26.4, 50, -26, 0, 12, puertas, 'brick');
  wall(-50.4, -40, -50, -26.4, 0, 12, [D(-35, -31, 0, 3.4)], 'brick');                      // fondo del ala oeste, con puerta al patio
  wall(50, -40, 50.4, -26.4, 0, 12, [D(-35, -31, 0, 3.4), D(-39, -35, 6, 9.4)], 'brick');   // ala este: puerta al patio y puerta de la pasarela a 6 m
  wall(-22.4, -40, -22, -26.4, 0, 12, [D(-39.5, -30.5, 0, 3.8), D(-38, -31, 6, 9.4)], 'brick'); // paredes del hall con paso a las alas, abajo y arriba
  wall(22, -40, 22.4, -26.4, 0, 12, [D(-39.5, -30.5, 0, 3.8), D(-38, -31, 6, 9.4)], 'brick');
  add(-50.4, 12, -40, 50.4, 12.4, -25.8, 'roof');                        // techo
  add(-8, 12.4, -26.4, 8, 13.4, -26, 'brick'); add(-5, 13.4, -26.4, 5, 14.2, -26, 'brick');   // frontis
  add(-50.5, 11.4, -26.6, 50.5, 12.05, -25.8, 'whitewall', { nc: 1 });      // cornisa
  for (let x = -48; x <= 48; x += 12) if (puertas.every(d => x + .3 < d[0] - .5 || x - .3 > d[1] + .5)) add(x - .3, 0, -26, x + .3, 11.4, -25.72, 'whitewall', { nc: 1 });   // pilastras (nunca dentro de una puerta o ventana)
  // piso alto: losa con huecos para las dos escaleras del hall
  add(-50, 5.6, -40, 50, 6, -38, 'tiles'); add(-50, 5.6, -38, -8, 6, -30, 'tiles'); add(8, 5.6, -38, 50, 6, -30, 'tiles');   // piso alto con un atrio abierto en el medio del hall (x -8..8)
  // barandas físicas del atrio, con entradas donde llegan los saltadores
  bar(-8, 6, -38.1, 8, -38); bar(-8.1, 6, -38, -8, -35); bar(-8.1, 6, -31, -8, -30); bar(8, 6, -38, 8.1, -35); bar(8, 6, -31, 8.1, -30); bar(-8, 6, -30.1, 8, -30);
  add(-38, 5.6, -30, -22, 6, -26.4, 'tiles'); add(-10, 5.6, -30, 10, 6, -26.4, 'tiles'); add(22, 5.6, -30, 38, 6, -26.4, 'tiles');
  stairs(10, -30, 22, -26.4, 0, .5, 12, 'x', -1, 'step'); stairs(-22, -30, -10, -26.4, 0, .5, 12, 'x', 1, 'step');
  stairs(38, -30, 50, -26.4, 0, .5, 12, 'x', -1, 'step'); stairs(-50, -30, -38, -26.4, 0, .5, 12, 'x', 1, 'step');   // escaleras internas de las alas
  /* ---- galería cubierta (abajo) y balcón corrido a 6 m con barandas ---- */
  add(-50, 5.6, -26, 50, 6, -22.4, 'wood');
  for (const [a, b] of [[-50, -41.5], [-38.5, -36], [-32, 32], [36, 38.5], [41.5, 50]]) bar(a, 6, -22.5, b, -22.4);   // baranda del balcón: entradas en las escaleras y en los saltadores
  for (let x = -48; x <= 48; x += 8) add(x - .25, 0, -22.9, x + .25, 5.6, -22.4, 'whitewall');
  for (const x of [-40, -24, -8, 8, 24, 40]) { add(x - .2, 5.2, -24.3, x + .2, 5.6, -23.9, 'light', { nc: 1 }); deco.push({ t: 'glow', x, y: 5.15, z: -24.1, c: 0xffb868 }); }
  add(-50, 5.2, -22.6, 50, 5.6, -22.4, 'metal', { nc: 1 });   // viga bajo el borde del balcón
  // escaleras de reja frente a la fachada, del andén al balcón (a los dos lados de la locomotora)
  escalera(20, 32, -22.4, -19, 12, 1); escalera(-32, -20, -22.4, -19, 12, -1);
  // rellano al final de cada escalera, pegado al balcón
  cubierta(32, -22.4, 36, -19, 6); cubierta(-36, -22.4, -32, -19, 6);

  bar(32, 6, -19.1, 36, -19); bar(35.9, 6, -22.4, 36, -19); bar(-36, 6, -19.1, -32, -19); bar(-36, 6, -22.4, -35.9, -19);
  // saltador desde el andén hasta el balcón
  for (const s of [-1, 1]) pads.push({ x: s * 40, y: 0, z: -8, r: 1.1, t: [s * 40, 6, -24.2], apex: 2 });
  // hall: columnas, boletería y cajones
  for (const [x, z] of [[-8, -38], [8, -38], [-8, -30.3], [8, -30.3]]) add(x - .4, 0, z - .4, x + .4, 12, z + .4, 'whitewall');   // columnas del atrio (hasta el techo)
  for (const s of [-1, 1]) pads.push({ x: s * 4.5, y: 0, z: -34, r: 1.1, t: [s * 10, 6, -34], apex: 1.5 });   // saltadores del atrio al corredor alto (la trayectoria pasa libre por el hueco)
  add(-4, 0, -39.4, 4, 1.1, -38.2, 'wood'); add(-4, 1.1, -39.4, 4, 1.2, -38.2, 'navy');
  add(-19, 0, -39, -15, 1.25, -36.6, 'crate'); add(15, 0, -39, 19, 1.25, -36.6, 'crate');
  add(-7, 0, -36.4, -4, .45, -35.8, 'wood'); add(4, 0, -36.4, 7, .45, -35.8, 'wood'); add(-7, 0, -32.2, -4, .45, -31.6, 'wood'); add(4, 0, -32.2, 7, .45, -31.6, 'wood'); add(-1.6, 0, -35.6, 1.6, .8, -32.4, 'smooth');   // bancos y altar del arma central
  add(-14, 0, -39.6, -10, 2.4, -37.4, 'wood'); add(10, 0, -39.6, 14, 2.4, -37.4, 'wood'); add(-14, 2.4, -39.6, -10, 2.6, -37.4, 'navy'); add(10, 2.4, -39.6, 14, 2.6, -37.4, 'navy');   // boleterías
  add(-18, 6, -36.6, -12, 7.2, -35.4, 'crate'); add(12, 6, -36.6, 18, 7.2, -35.4, 'crate');
  /* ---- por lado (oeste s=-1, este s=1): habitaciones, costanera y muelle ---- */
  for (const s of [-1, 1]) {
    const ax = (x0, y0, z0, x1, y1, z1, m, e) => add(s * x0, y0, z0, s * x1, y1, z1, m, e);
    for (const x of [30, 42]) ax(x - .4, 0, -33.4, x + .4, 5.6, -32.6, 'whitewall');   // columnas
    /* planta baja del ala: entrepiso de madera a 3 m al fondo (columnas de hierro, baranda, escalera y un saltador), mostradores, bancos y muros bajos como cobertura */
    ax(24, 2.8, -40, 48, 3, -36.4, 'wood'); ax(24, 2.5, -36.6, 48, 2.8, -36.4, 'metal', { nc: 1 }); ax(26, 3, -36.5, 43.5, 4, -36.4, 'rail');
    for (const x of [26, 32, 38, 44]) ax(x - .15, 0, -36.7, x + .15, 2.8, -36.4, 'metal');
    if (s > 0) stairs(24, -36.4, 30, -34.6, 0, .5, 6, 'x', -1, 'step'); else stairs(-30, -36.4, -24, -34.6, 0, .5, 6, 'x', 1, 'step');
    ax(24, 0, -33.8, 28.5, 1.1, -33, 'wood'); ax(24, 1.1, -33.8, 28.5, 1.2, -33, 'navy'); ax(43, 0, -32.9, 47.5, 1.1, -32.1, 'wood'); ax(43, 1.1, -32.9, 47.5, 1.2, -32.1, 'navy');
    ax(23.4, 0, -28.2, 27, .45, -27.6, 'wood'); ax(23.4, .45, -27.7, 27, 1, -27.6, 'wood'); ax(34, 0, -28.2, 37, .45, -27.6, 'wood'); ax(34, .45, -27.7, 37, 1, -27.6, 'wood');
    ax(33, 0, -31.6, 37, 1.2, -31.2, 'whitewall'); ax(35, 0, -36, 38, 1.2, -35.6, 'whitewall');
    ax(26, 0, -39.6, 29.5, 1.25, -38.4, 'crate'); ax(34, 0, -39.6, 38, 1.25, -38.4, 'crate'); ax(46, 0, -39.6, 49, 1.25, -38.4, 'crate');
    /* planta alta del ala: columnas, mesa larga, estantes y cajones de cobertura; baranda en el hueco de la escalera */
    for (const x of [30, 42]) ax(x - .4, 6, -33.4, x + .4, 12, -32.6, 'whitewall');
    ax(28, 6, -35, 36, 6.9, -33.6, 'wood'); ax(28, 6.9, -35, 36, 7, -33.6, 'navy');
    ax(24, 6, -39.8, 31, 8.2, -38.9, 'wood'); ax(39, 6, -39.8, 47, 8.2, -38.9, 'wood');
    ax(46, 6, -36.6, 48.5, 7.2, -35, 'crate'); ax(36, 6, -38, 40, 7.2, -36.6, 'crate'); ax(26, 6, -33.4, 30, 7.2, -32, 'crate');
    ax(39, 6, -30.1, 50, 7, -30, 'rail');
    // barandas bajas (se saltan) en los muelles: frenan al que viene corriendo
    ax(36, .25, 24, 36.2, 1.35, 36, 'rail'); ax(45.8, .25, 24, 46, 1.35, 36, 'rail'); ax(36, .25, 35.8, 46, 1.35, 36, 'rail');
    // costanera: bancos, glorieta, farolas
    ax(14, 1, 12, 18, 1.45, 12.6, 'wood'); ax(14, 1.45, 12.5, 18, 2, 12.6, 'wood'); ax(42, 1, 12, 46, 1.45, 12.6, 'wood'); ax(42, 1.45, 12.5, 46, 2, 12.6, 'wood');
    for (const [x, z] of [[28, 11], [36, 11], [28, 17], [36, 17]]) ax(x, 1, z, x + .3, 4.4, z + .3, 'wood');
    ax(27.6, 4.4, 10.6, 36.4, 4.7, 17.4, 'roof');
    for (const x of [-8, 8, 20, 44, 56]) { const x0 = Math.min(s * x, s * x + 2); add(x0, 1, 9.2, x0 + 2, 1.6, 11.2, 'smooth'); deco.push({ t: 'palm', x: x0 + 1, y: 1.6, z: 10.2, h: 8 }); }
    for (const x of [12, 30, 48, 60]) farola(s * x, 19.6, 1);
    ax(2, 1, 19.9, 8, 2, 20, 'rail'); ax(14, 1, 19.9, 32, 2, 20, 'rail'); ax(38, 1, 19.9, 62, 2, 20, 'rail');
    // muelle sobre el río
    add(Math.min(s * 36, s * 46), -.15, 24, Math.max(s * 36, s * 46), .25, 36, 'wood');
    for (const [x, z] of [[36, 24.2], [45.7, 24.2], [36, 35.7], [45.7, 35.7]]) ax(x, -4, z, x + .3, -.15, z + .3, 'wood');
    deco.push({ t: 'bush', x: s * 55, y: -.03, z: -4, r: 1.1 }, { t: 'bush', x: s * 58, y: -.03, z: -8, r: 1 }, { t: 'palm', x: s * 56, y: -.03, z: -2, h: 9 });
  }
  /* ---- andamio del oeste: tramo de abajo, plataforma a 3 m (megasalud) y tramo que entra al balcón ---- */
  stairs(-61, -18, -57, -12, 0, .5, 6, 'z', -1, 'step');
  cubierta(-61, -26, -56, -18, 3);
  andamio(-56, -26, -50, -22.4, 3, .5, 6, 'x', 1);

  bar(-61.1, 3, -26, -61, -18); bar(-61, 3, -26.1, -56, -26); bar(-56.1, 3, -22.4, -56, -18); bar(-57, 3, -18.1, -56, -18);
  /* ---- torre del este: plataforma a 3 m, pasarela a 6 m (puerta al piso alto) y mirador a 9 m ---- */
  stairs(57, -18, 61, -12, 0, .5, 6, 'z', -1, 'step');                  // tramo de abajo
  cubierta(56, -26, 61, -18, 3);                                        // plataforma baja
  andamio(50, -26, 56, -22.4, 3, .5, 6, 'x', -1);                       // de la plataforma al balcón
  andamio(57, -34, 61, -26, 3, .5, 6, 'z', -1);                         // de la plataforma a la pasarela
  cubierta(50.4, -40, 61, -34, 6);                                      // pasarela a 6 m, pegada a la puerta del ala
  andamio(51, -34, 55, -26, 6, .5, 6, 'z', 1);                          // de la pasarela al mirador
  cubierta(50.4, -26, 61, -18, 9);                                      // mirador a 9 m



  bar(61, 3, -26, 61.1, -18); bar(56, 3, -26.1, 57, -26); bar(55.9, 3, -22.4, 56, -18); bar(56, 3, -18.1, 57, -18);
  bar(61, 6, -40, 61.1, -34); bar(55, 6, -34.1, 57, -34); bar(50.4, 6, -34.1, 51, -34);
  bar(61, 9, -26, 61.1, -18); bar(50.4, 9, -18.1, 61, -18); bar(55, 9, -26.1, 61, -26); bar(50.4, 9, -22.4, 50.5, -18);
  /* ---- grúa del patio oeste (solo se ve) ---- */
  add(-59, 0, -39, -57, 24, -37, 'truss', { nc: 1 }); add(-59, 24, -38.4, -38, 25, -37.6, 'truss', { nc: 1 }); add(-64, 24, -38.4, -59, 25, -37.6, 'truss', { nc: 1 });
  add(-59.4, 22.2, -39.4, -56.6, 24, -36.6, 'metal', { nc: 1 }); add(-65, 23, -38.8, -62.5, 25, -37.2, 'black', { nc: 1 });
  add(-45.1, 15, -38.1, -45, 24, -37.9, 'metal', { nc: 1 }); add(-45.4, 14, -38.4, -44.7, 15, -37.6, 'barn', { nc: 1 });
  // cajones y cobertura en el andén (1,25 m: se saltan)
  add(-9, 0, -6, -6.5, 1.25, -3.5, 'crate'); add(-6.5, 0, -6, -4, 1.25, -3.5, 'crate'); add(-9, 0, -3.5, -6.5, 2.5, -1, 'crate'); add(-6.5, 0, -3.5, -4, 1.25, -1, 'crate'); add(-9, 2.5, -3.5, -7.75, 3.75, -2.25, 'crate');
  add(4, 0, 0, 6.5, 1.25, 2.5, 'crate'); add(6.5, 0, 0, 8, 2.5, 1.5, 'crate');
  add(-30, 0, -6, -27.5, 1.25, -3.5, 'crate'); add(28, 0, -6, 30.5, 1.25, -3.5, 'crate'); add(-30, 0, 2, -27.5, 1.25, 4.5, 'crate'); add(28, 0, 2, 30.5, 1.25, 4.5, 'crate');
  /* ---- vías y locomotora «La Posadeña»: elevada sobre el chasis y las ruedas, con la cabina enterable ---- */
  add(-62, 0, -15.1, 62, .14, -14.95, 'metal', { nc: 1 }); add(-62, 0, -13.05, 62, .14, -12.9, 'metal', { nc: 1 });
  for (let x = -62; x < 62; x += 1.6) add(x, 0, -15.8, x + .4, .07, -12.2, 'wood', { nc: 1 });
  add(-17, .7, -15.2, 17, 1.6, -12.8, 'black');                            // chasis (el hueco de abajo no se pasa)
  add(-16.4, 1.6, -15.3, 0, 4.2, -12.7, 'clip');                           // caldera: la forma redonda es visual, esto es la colisión
  add(8.9, 1.6, -15.5, 17, 3.8, -12.5, 'black');                           // ténder
  add(9.3, 3.8, -15.2, 16.6, 4.2, -12.8, 'rock', { nc: 1 });               // carbón
  add(0, 1.4, -15.8, 8.6, 1.63, -12.2, 'metal');                            // cabina a 1,6 m: se sube por escalones y se cruza por las dos puertas
  wall(0, -15.8, 8.6, -15.5, 1.6, 4.6, [D(3.3, 5.3, 1.6, 4), D(1, 2.6, 2.8, 4), D(6.2, 7.8, 2.8, 4)], 'black');
  wall(0, -12.5, 8.6, -12.2, 1.6, 4.6, [D(3.3, 5.3, 1.6, 4), D(1, 2.6, 2.8, 4), D(6.2, 7.8, 2.8, 4)], 'black');
  add(0, 1.6, -15.5, .3, 4.6, -12.5, 'black'); add(8.3, 1.6, -15.5, 8.6, 4.6, -12.5, 'black');
  add(-.3, 4.6, -16.1, 8.9, 5, -11.9, 'black');
  add(5.6, 1.6, -15.5, 7.6, 2.4, -14.6, 'metal'); add(.3, 1.6, -14.4, 1.3, 2.8, -13.6, 'metal');
  stairs(3.3, -12.2, 5.3, -9.8, 0, .4, 4, 'z', -1, 'step'); stairs(3.3, -18.2, 5.3, -15.8, 0, .4, 4, 'z', 1, 'step');
  deco.push({ t: 'tren' });
  deco.push({ t: 'cartel', x: 13, y: 2.7, z: -12.47, w: 4.6, h: .9, txt: 'LA POSADEÑA', bg: '#111', fg: '#f4f4f4' }, { t: 'cartel', x: 13, y: 2.7, z: -15.53, w: 4.6, h: .9, txt: 'LA POSADEÑA', bg: '#111', fg: '#f4f4f4', ry: Math.PI });
  add(-12, 0, -12.7, -10.4, 1.2, -11.1, 'crate'); add(-10.4, 0, -12.7, -8.8, 2.4, -11.1, 'crate'); add(-8.8, 0, -12.7, -7.2, 3.6, -11.1, 'crate');   // cajones escalonados hasta la caldera
  /* ---- marcos blancos, farolas, canteros, banderines, alero y detalles de la estación real ---- */
  for (const [a0, a1, y0, y1] of puertas) {
    add(a0 - .4, y0, -26, a0, y1 + .4, -25.8, 'whitewall', { nc: 1 }); add(a1, y0, -26, a1 + .4, y1 + .4, -25.8, 'whitewall', { nc: 1 }); add(a0 - .4, y1, -26, a1 + .4, y1 + .4, -25.8, 'whitewall', { nc: 1 });
    if (y0 > 6.5) add(a0 - .3, y0 - .2, -26, a1 + .3, y0, -25.7, 'whitewall', { nc: 1 });
  }
  for (const [a0, a1] of puertas.slice(0, 4)) add(a0 + .5, 4.6, -26, a1 - .5, 4.9, -25.85, 'whitewall', { nc: 1 });          // remate de las arcadas
  for (const x of [-9, -3, 3, 9]) add(x - 1, 3.2, -26.05, x + 1, 4.2, -26, 'navy', { nc: 1 });                              // vidrio sobre las puertas
  for (const x of [-34, -14, 14, 34]) { add(x - .15, 3, -26, x + .15, 3.5, -25.8, 'light', { nc: 1 }); deco.push({ t: 'glow', x, y: 3.25, z: -25.6, c: 0xffb060 }); }                         // faroles de pared
  add(-39.4, 1.2, -26, -38.8, 1.9, -25.75, 'barn', { nc: 1 });                                                               // buzón rojo
  // alero de chapa sobre el balcón, con columnas finas de hierro
  for (const x of [-46, -34, -26, -14, -6, 6, 14, 26, 34, 46]) add(x - .1, 6, -22.8, x + .1, 9.9, -22.6, 'metal');
  add(-50.5, 9.9, -26.6, 50.6, 10.15, -22.3, 'roof'); add(-50.5, 9.6, -22.4, 50.6, 9.9, -22.3, 'metal', { nc: 1 }); add(-50.5, 10.15, -22.4, 50.6, 11.15, -22.3, 'rail');   // el alero se pisa: pasarela alta sobre el balcón
  add(51.6, 8.7, -26, 52.6, 9.5, -22.4, 'grate'); add(50.6, 8.7, -26, 51.6, 10, -22.4, 'grate');   // dos escalones del mirador al alero
  // enredaderas colgando del alero (ambiente)
  for (let x = -48; x <= 48; x += 2.7) deco.push({ t: 'enredadera', x, y: 9.62, z: -22.34, len: 1.1 + Math.abs(Math.sin(x * 3.1)) * 1.8, ry: 0 });
  // canteros blancos con plantas bajo la galería
  for (const x of [-44, -28, -12, 12, 28, 44]) { add(x - .45, 0, -25.05, x + .45, .55, -24.15, 'whitewall'); deco.push({ t: 'bush', x, y: .55, z: -24.6, r: .5 }); }
  // banderines colgados bajo el balcón
  const banderin = ['barn', 'navy', 'light'];
  for (let x = -24; x <= 24; x++) add(x - .14, 5.1 - .35 * (1 - Math.abs(((x + 48) % 8) - 4) / 4), -23.4, x + .14, 5.45 - .35 * (1 - Math.abs(((x + 48) % 8) - 4) / 4), -23.38, banderin[(x + 24) % 3], { nc: 1 });
  // farolas, bancos y tachos en el andén
  for (const [x, z] of [[-46, -1], [-34, -10], [-18, -9], [18, -9], [34, -10], [46, -1], [-20, 6], [20, 6]]) farola(x, z, 0);
  add(-28, 0, -10.6, -25, .45, -10, 'wood'); add(-28, .45, -10.1, -25, 1, -10, 'wood'); add(25, 0, -10.6, 28, .45, -10, 'wood'); add(25, .45, -10.1, 28, 1, -10, 'wood');
  for (const [x, z] of [[-18, -8], [18, -8], [-32, -10], [32, -10], [0, 6.5], [-46, 6]]) add(x - .25, 0, z - .25, x + .25, .9, z + .25, 'metal');
  // balasto de las vías y cartel del andén
  add(-62, 0, -16.4, 62, .05, -11.6, 'rock', { nc: 1 });
  add(-48.9, 0, -10.2, -48.7, 2, -10, 'metal'); add(-45.3, 0, -10.2, -45.1, 2, -10, 'metal');
  deco.push({ t: 'cartel', x: -47, y: 1.55, z: -9.95, w: 3.6, h: .9, txt: 'POSADAS', bg: '#111', fg: '#fff', ry: Math.PI });
  deco.push({ t: 'pole', x: -13, y: 0, z: -21, h: 9, flag: 'ar' }, { t: 'pole', x: 13, y: 0, z: -21, h: 9, flag: 'mis' });
  deco.push({ t: 'tree', x: -54, y: -.03, z: -36, h: 6, r: 2.6 }, { t: 'tree', x: -58, y: -.03, z: -33, h: 5.5, r: 2.3 });
  // lanchas sobre el río (solo se ven)
  for (const [x, z, r] of [[-22, 62, 0], [30, 80, 1], [75, 55, 0]]) {
    add(x, -.3, z, x + 3, .5, z + 9, 'wood', { nc: 1 }); add(x + .4, .5, z + 2, x + 2.6, 1.8, z + 5.5, 'whitewall', { nc: 1 }); add(x + .3, 1.8, z + 1.8, x + 2.7, 2, z + 5.7, 'barn', { nc: 1 });
    if (r) add(x + 1.4, 2, z + 3, x + 1.6, 4.3, z + 3.2, 'metal', { nc: 1 });
  }
  /* ---- muros invisibles (nadie sale por arriba de la valla ni de las paredes) y barandas bajas en la orilla ---- */
  add(-62.5, -4, -43, -62, 40, 43, 'clip'); add(-62.5, -4, -40.5, -50.4, 40, -40, 'clip');
  add(-63, 12, -43, 63, 40, -40, 'clip'); add(50.4, 10, -43, 62, 40, -40, 'clip');
  add(-50.6, 12.4, -40, 50.7, 60, -25.4, 'clip');   // el techo del edificio es inalcanzable (ni con rocket jump): todo el volumen de arriba es sólido
  add(-62, .25, 23.8, -46, 1.35, 24, 'rail'); add(-36, .25, 23.8, 36, 1.35, 24, 'rail'); add(46, .25, 23.8, 62, 1.35, 24, 'rail');   // sobre el último escalón de la costanera
  add(61.5, 0, -40, 62, 1, 8, 'rail'); add(61.5, 1, 8, 62, 2, 20, 'rail'); add(61.5, -1, 20, 62, 1.6, 24, 'rail');             // borde este
  for (const x of [-30, 30]) { add(x - .07, .25, 23.45, x + .07, 1.95, 23.59, 'wood'); deco.push({ t: 'aviso', x, y: 2.3, z: 23.52, ry: 0 }); }
  for (const [z, y] of [[-4, 0]]) { add(61.1, y, z - .07, 61.24, y + 1.75, z + .07, 'wood'); deco.push({ t: 'aviso', x: 61.17, y: y + 2.1, z, ry: -Math.PI / 2 }); }
  /* ---- carteles ---- */
  deco.push({ t: 'cartel', x: 0, y: 10.9, z: -25.97, w: 10, h: 1.4, txt: 'ESTACIÓN POSADAS', bg: '#5a2a1c', fg: '#f3d9a8' });
  add(-3.6, 0, 8.9, -3.4, 3.4, 9.1, 'metal'); add(3.4, 0, 8.9, 3.6, 3.4, 9.1, 'metal');
  add(-3.6, 2.25, 8.8, 3.6, 3.35, 8.92, 'clip');                                     // el panel del cartel es sólido (colisión invisible)
  deco.push({ t: 'cartel', x: 0, y: 2.8, z: 8.85, w: 7.4, h: 1.1, txt: 'COSTANERA · POSADAS', bg: '#1f3a2e', fg: '#f3d9a8', ry: Math.PI });
  /* ---- portales enfrentados: el amarillo en el andén oeste, el azul en el andén este (a campo abierto); cada uno te deja delante del otro ---- */
    teles.push({ x: -44, y: 0, z: -6, r: 1, to: [37.5, 0, -6], yaw: face(37.5, -6, 0, 0), color: 'yellow' });
  teles.push({ x: 44, y: 0, z: -6, r: 1, to: [-37.5, 0, -6], yaw: face(-37.5, -6, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -44, y: 0, z: -6, r: 1, color: 'yellow' }, { t: 'portal', x: 44, y: 0, z: -6, r: 1, color: 'blue' });
  /* ---- ítems: todo lo que ya existe, repartido por zonas ---- */
  // hall y piso alto
  I('w2', 0, .8, -34); I('w3', 7, 0, -37); I('health', -6, 0, -38.6); I('health', 6, 0, -38.6); I('armor', -8, 0, -29.5); I('shells', 8, 0, -29.5);
  I('bullets', 0, 6, -39); I('armor', -30, 3, -38.2); I('armor', 30, 3, -38.2); I('armorH', -17, 6, -38); I('health', 17, 6, -38); I('slugs', 0, 6, -28);
  // ala oeste: planta baja y habitación alta
  I('w1', -36, 0, -34); I('armor', -47, 0, -35.5); I('health', -30, 0, -30); I('bullets', -40, 0, -31); I('armor', -41, 0, -37.2);
  I('w2', -36, 6, -32); I('health', -28, 6, -30); I('grenades', -44, 6, -32); I('shells', -44, 6, -37.5);
  // ala este
  I('w4', 36, 0, -34); I('armor', 47, 0, -35.5); I('armor', 41, 0, -37.2); I('health', 30, 0, -30); I('rockets', 40, 0, -31);
  I('w9', 36, 6, -32); I('armor', 28, 6, -30); I('rockets', 44, 6, -32); I('health', 44, 6, -37.5);
  // balcón
  I('health', 0, 6, -24.2); I('armor', -30, 6, -24.2); I('armor', 30, 6, -24.2); I('health', 20, 10.15, -24.4); I('health', -44, 3, -38.2); I('health', 44, 3, -38.2); I('armor', 44, 10.15, -24.4);
  // locomotora: daño triple en la cabina, botiquín arriba de la caldera
  I('quad', 4, 1.63, -14); I('health', -8, 4.2, -14);
  // andén
  I('health', -19, 0, -20); I('health', 19, 0, -20); I('armor', -24, 0, 3); I('armor', 24, 0, 5); I('w1', 4, 0, -2); I('shells', -12, 0, -7); I('bullets', 12, 0, -7);
  I('bullets', -34, 0, -19); I('shells', 34, 0, -19); I('health', 0, 0, -3);
  // costanera
  I('health', -32, 1, 14); I('health', 32, 1, 14); I('health', 0, 1, 16); I('w3', -14, 1, 15); I('caza', 14, 1, 15); I('grenades', -48, 1, 12); I('rockets', 48, 1, 16); I('slugs', -8, 1, 13);
  // patios, andamios y muelles (premios con riesgo: el agua mata)
  I('health', -56, 0, -6); I('health', 56, 0, -6); I('armor', -56, 0, -1); I('slugs', 56, 0, -1);
  I('armorH', -41, .25, 32); I('armorH', 41, .25, 32);
  I('mega', -58.5, 3, -22); I('health', -58.5, 3, -19.5);
  I('w6', 58.5, 3, -24); I('w6', 58.5, 3, -20); I('health', 55, 6, -37); I('w8', 58.5, 9, -22); I('w5', 54.5, 9, -20.5);
  /* ---- apariciones: andén, balcón, costanera, patios, hall, alas y habitaciones ---- */
  [[-36, 0, -17], [-12, 0, -20], [12, 0, -20], [36, 0, -17], [-20, 0, -8], [0, 0, -6], [20, 0, -8], [-40, 0, 0], [40, 0, 0], [-10, 0, 5], [10, 0, 5],
   [-50, 1, 14], [-25, 1, 16], [0, 1, 12], [25, 1, 16], [50, 1, 14], [-56, 0, -10], [56, 0, -10],
   [-14, 0, -34], [14, 0, -34], [0, 0, -30], [-14, 6, -33], [14, 6, -33], [-32, 0, -37], [32, 0, -37], [-34, 6, -30], [34, 6, -30],
   [-30, 6, -24.2], [-10, 6, -24.2], [10, 6, -24.2], [30, 6, -24.2]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: 0, y: 5, z: -33, c: 0xffa860, i: .8, d: 26 }, { x: 0, y: 10, z: -34, c: 0xffa860, i: .6, d: 22 },
    { x: -36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 }, { x: 36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 },
    { x: -36, y: 9, z: -32, c: 0xffb070, i: .6, d: 22 }, { x: 36, y: 9, z: -32, c: 0xffb070, i: .6, d: 22 },
    { x: -24, y: 5, z: -24, c: 0xffb070, i: .6, d: 22 }, { x: 24, y: 5, z: -24, c: 0xffb070, i: .6, d: 22 },
    { x: -20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 0, y: 5, z: -8, c: 0xffa060, i: .5, d: 28 },
    { x: -30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 }, { x: 30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 },
    { x: -44, y: 3, z: -6, c: 0xffc840, i: .9, d: 14 }, { x: 44, y: 3, z: -6, c: 0x4aa0ff, i: .9, d: 14 });
  {   // juntas: los bloques sólidos del mismo material que se tocan se solapan 6 mm (sin grietas de un píxel entre ellos)
    const S = B.filter(b => !b.nc && !b.mover && !b.ramp && b.mat !== 'clip'), g = S.map(() => [[0, 0], [0, 0], [0, 0]]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j]; if (a.mat !== b.mat) continue;
      for (let ax = 0; ax < 3; ax++) {
        const u = (ax + 1) % 3, v = (ax + 2) % 3;
        if (Math.min(a.max[u], b.max[u]) - Math.max(a.min[u], b.min[u]) < .01 || Math.min(a.max[v], b.max[v]) - Math.max(a.min[v], b.min[v]) < .01) continue;
        if (Math.abs(a.max[ax] - b.min[ax]) < 1e-6) { g[i][ax][1] = 1; g[j][ax][0] = 1; } else if (Math.abs(b.max[ax] - a.min[ax]) < 1e-6) { g[j][ax][1] = 1; g[i][ax][0] = 1; }
      }
    }
    S.forEach((b, i) => { for (let ax = 0; ax < 3; ax++) { if (g[i][ax][0]) b.min[ax] -= .006; if (g[i][ax][1]) b.max[ax] += .006; } });
  }
  for (const b of B) if (b.nc && b.mat !== 'clip') for (let k = 0; k < 3; k++) { b.min[k] -= .012; b.max[k] += .012; }   // evita caras coplanares (z-fighting)
  return finish({ id: 'cuartotramo', name: 'El Cuarto Tramo', bounds: { x0: -62, x1: 62, z0: -42, z1: 42 }, deco,
    theme: { sky: 'sunset', tex: 'ut', fog: 0x8a5262, fogD: .0042, amb: 0xb88a80, ambI: .78, hemi: [0xff9a84, 0x34364e, .7], sun: true, sunC: 0xff8a40, sunI: .85, sunPos: [-46, 21, -30], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.cuartotramo = buildCuartoTramo;
/* ---------- Skatenight — el skatepark de la Costanera de Posadas, de noche ----------
   Norte = -z (el río y la tribuna), sur = +z (la calle). Mapa de noche: en el cliente (theme.noche) cada arma lleva linterna
   y los rivales casi no se ven hasta que los alumbrás o te alumbran.
   · Plaza de concreto a nivel 0 con un pozo en L al oeste (-3 m), un pozo en L grande al sureste (-3,2 m), pirámides/hips, un spine, una caja
     de «bank to ledge», bancos con terraza contra las vallas y una escalera con terraza.
   · Tribuna de 10 gradas al norte (sube hasta 5 m, con pasillo y baranda sobre el río).
   · Tres torres de andamio (oeste-norte, sur-oeste y este) con piso a 2,5 y a 5 m, unidas por pasarelas a 5 m con la tribuna.
   · Cuatro saltadores y dos portales (uno en el rincón sur-oeste y otro arriba de la tribuna: lejísimos entre sí).
   · Casi todos los reflectores están apagados: solo algunos pozos de luz, la linterna y la luna. */
function buildSkatenight() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  // baranda: la colisión es un bloque de 1 m (se salta, no se atraviesa) y lo que se ve son dos rieles, postes cada ~2 m y una malla de alambre vieja
  const bar = (x0, z0, x1, z1, y) => {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1) + (x0 === x1 ? .1 : 0), az = Math.min(z0, z1), bz = Math.max(z0, z1) + (z0 === z1 ? .1 : 0);
    add(ax, y, az, bx, y + 1, bz, 'clip');
    const alongX = (bx - ax) >= (bz - az), a0 = alongX ? ax : az, a1 = alongX ? bx : bz, c = alongX ? (az + bz) / 2 : (ax + bx) / 2, n = Math.max(1, Math.round((a1 - a0) / 2));
    const seg = (a, b, y0, y1, t, m) => alongX ? add(a, y0, c - t, b, y1, c + t, m, { nc: 1 }) : add(c - t, y0, a, c + t, y1, b, m, { nc: 1 });
    seg(a0, a1, y + .93, y + 1.01, .035, 'metal'); seg(a0, a1, y + .46, y + .5, .03, 'metal'); seg(a0, a1, y + .04, y + .92, .01, 'fence');
    for (let i = 0; i <= n; i++) { const q = a0 + (a1 - a0) * i / n; seg(Math.max(a0, q - .04), Math.min(a1, q + .04), y, y + 1.02, .045, 'metal'); }
  };
  // pilar de hierro con base de hormigón y capitel (centro x, z; y1 = altura de arriba)
  const pilar = (x, z, y1) => { add(x - .27, 0, z - .27, x + .27, .22, z + .27, 'concrete'); add(x - .12, .22, z - .12, x + .12, y1 - .12, z + .12, 'metal'); add(x - .24, y1 - .12, z - .24, x + .24, y1, z + .24, 'metal'); };
  // muro de cobertura de 3 m con remate liso arriba y zócalo abajo
  const muro = (x0, z0, x1, z1) => { add(x0, 0, z0, x1, 3, z1, 'concrete'); add(x0 - .09, 3, z0 - .09, x1 + .09, 3.14, z1 + .09, 'smooth'); add(x0 - .06, 0, z0 - .06, x1 + .06, .22, z1 + .06, 'concrete', { nc: 1 }); };
  // borde metálico (coping) de la boca de un pozo: solo se ve
  const lipX = (x0, x1, z) => add(x0 - .07, 0, z - .08, x1 + .07, .08, z + .08, 'metal', { nc: 1 });
  const lipZ = (z0, z1, x) => add(x - .08, 0, z0 - .07, x + .08, .08, z1 + .07, 'metal', { nc: 1 });
  const graf = (x, y, z, w, h, txt, fg, bg, ry) => deco.push({ t: 'cartel', x, y, z, w, h, txt, fg, bg: bg || '#1d1d22', ry: ry || 0 });
  // reflector de estadio (4 cabezales): base de hormigón con bulones, tramo grueso y fino, travesaño, viseras; apagado casi siempre; y0 = piso donde apoya
  const poste = (x, z, on, y0) => {
    y0 = y0 || 0;
    add(x - .32, y0, z - .32, x + .32, y0 + .3, z + .32, 'concrete'); add(x - .15, y0 + .3, z - .15, x + .15, y0 + 3.5, z + .15, 'metal'); add(x - .1, y0 + 3.5, z - .1, x + .1, y0 + 6.8, z + .1, 'metal');
    for (const [qx, qz] of [[.22, .22], [-.22, .22], [.22, -.22], [-.22, -.22]]) add(x + qx - .03, y0 + .3, z + qz - .03, x + qx + .03, y0 + .5, z + qz + .03, 'metal', { nc: 1 });
    add(x - 1.05, y0 + 6.8, z - .12, x + 1.05, y0 + 6.97, z + .12, 'metal', { nc: 1 });
    for (const dx of [-.7, -.23, .23, .7]) {
      add(x + dx - .18, y0 + 6.97, z - .24, x + dx + .18, y0 + 7.42, z + .24, 'black', { nc: 1 }); add(x + dx - .2, y0 + 7.1, z + .22, x + dx + .2, y0 + 7.42, z + .27, 'metal', { nc: 1 });
      if (on) add(x + dx - .14, y0 + 6.92, z - .17, x + dx + .14, y0 + 6.97, z + .17, 'light', { nc: 1 });
    }
    if (on) deco.push({ t: 'glow', x, y: y0 + 6.7, z, c: 0xffc070 });
  };
  // graffitis (deco 'graf'): cada pieza es un cuadro del atlas de aerosol (64 diseños, ver 03-decoracion.js) apoyado sobre una superficie.
  // cover() cubre un rectángulo de una pared, rampa o piso con piezas superpuestas; el azar es fijo, así que el mapa sale siempre igual
  let gs = 7; const rnd = () => { gs = (gs * 1664525 + 1013904223) >>> 0; return gs / 4294967296; };
  const piece = (cx, cy, cz, rx, ry, u, v, w, h, k) => {
    const cr = Math.cos(ry), sr = Math.sin(ry), sx = Math.sin(rx), cxr = Math.cos(rx);
    deco.push({ t: 'graf', x: cx + u * cr + v * sx * sr, y: cy + v * cxr, z: cz - u * sr + v * sx * cr, w, h, k, rx, ry, fl: k >= 28 && rnd() < .5 });
  };
  // (cx, cy, cz) = centro de la superficie · ry = hacia dónde mira · alpha = inclinación (0 piso, PI/2 pared) · W ancho · H alto (largo de la pendiente)
  // GD: cuánto del mapa está pintado (menos graffitis = más abandono); los decals de abandono (dpiece) van en las mismas superficies
  const GD = .3;
  const dpiece = (cx, cy, cz, rx, ry, u, v, w, k) => {
    const cr = Math.cos(ry), sr = Math.sin(ry), sx = Math.sin(rx), cxr = Math.cos(rx);
    deco.push({ t: 'decal', x: cx + u * cr + v * sx * sr, y: cy + v * cxr, z: cz - u * sr + v * sx * cr, w, h: w, k, rx, ry, rz: 0 });
  };
  const cover = (cx, cy, cz, ry, alpha, W, H, dens) => {
    const rx = alpha - Math.PI / 2, nx = Math.sin(ry) * Math.sin(alpha), ny = Math.cos(alpha), nz = Math.cos(ry) * Math.sin(alpha);
    if (alpha > .05) for (let n = Math.round(W * H / 16), i = 0; i < n; i++) {   // grietas, manchas, óxido, musgo y sangre sobre pared o rampa
      const k = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 26, 27, 28, 29][Math.floor(rnd() * 22)];
      const sz = Math.min(1.8 + rnd() * 2.6, W * .9, H * .95);   // nunca más grande que la superficie ni fuera de ella
      dpiece(cx + nx * .035, cy + ny * .035, cz + nz * .035, rx, ry, (rnd() - .5) * (W - sz), (rnd() - .5) * (H - sz), sz, k);
    }
    cx += nx * .05; cy += ny * .05; cz += nz * .05;
    const cols = Math.max(1, Math.round(W / 4.8)), rows = Math.max(1, Math.round(H / 2.7));
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      if (rnd() > (dens || 1) * GD) continue;
      const w = Math.min(4.4 + rnd() * 2, W), h = Math.min(w * .52, H * 1.06), clp = (v, m) => m <= 0 ? 0 : Math.max(-m / 2, Math.min(m / 2, v));   // la pieza queda dentro de la superficie
      piece(cx, cy, cz, rx, ry, clp((a + .5 + (rnd() - .5) * .5) * W / cols - W / 2, W - w), clp((b + .5 + (rnd() - .5) * .4) * H / rows - H / 2, H - h), w, h, Math.floor(rnd() * 64));
    }
  };
  // las dos caras de un muro fino (ry: hacia dónde mira cada cara)
  const wallArt = (x0, z0, x1, z1, h) => {
    if (x1 - x0 >= z1 - z0) { const cx = (x0 + x1) / 2, W = x1 - x0; cover(cx, h / 2, z0, Math.PI, Math.PI / 2, W, h, .95); cover(cx, h / 2, z1, 0, Math.PI / 2, W, h, .95); }
    else { const cz = (z0 + z1) / 2, W = z1 - z0; cover(x0, h / 2, cz, -Math.PI / 2, Math.PI / 2, W, h, .95); cover(x1, h / 2, cz, Math.PI / 2, Math.PI / 2, W, h, .95); }
  };
  // palmera con tronco sólido (el tronco es invisible, la copa la dibuja la decoración)
  const palma = (x, z, h) => { deco.push({ t: 'palm', x, y: 0, z, h }); add(x - .25, 0, z - .25, x + .25, 4, z + .25, 'clip'); };
  // coronamiento (borde liso) de la boca de un bowl
  const coping = (x0, z0, x1, z1) => { add(x0, 0, z0, x1, .09, z0 + .22, 'smooth', { nc: 1 }); add(x0, 0, z1 - .22, x1, .09, z1, 'smooth', { nc: 1 }); add(x0, 0, z0, x0 + .22, .09, z1, 'smooth', { nc: 1 }); add(x1 - .22, 0, z0, x1, .09, z1, 'smooth', { nc: 1 }); };
  // pirámide (hip): tope liso a altura h y cuatro rampas de w metros
  const hip = (cx, cz, hx, hz, h, w) => {
    add(cx - hx, 0, cz - hz, cx + hx, h, cz + hz, 'smooth');
    ramp(cx - hx, cz - hz - w, cx + hx, cz - hz, 0, 0, h, 'z', 1, 'concrete'); ramp(cx - hx, cz + hz, cx + hx, cz + hz + w, 0, 0, h, 'z', -1, 'concrete');
    ramp(cx - hx - w, cz - hz, cx - hx, cz + hz, 0, 0, h, 'x', 1, 'concrete'); ramp(cx + hx, cz - hz, cx + hx + w, cz + hz, 0, 0, h, 'x', -1, 'concrete');
    add(cx - hx, h, cz - hz, cx + hx, h + .07, cz - hz + .1, 'metal', { nc: 1 }); add(cx - hx, h, cz + hz - .1, cx + hx, h + .07, cz + hz, 'metal', { nc: 1 });   // coping de los bordes del tope
    add(cx - hx, h, cz - hz, cx - hx + .1, h + .07, cz + hz, 'metal', { nc: 1 }); add(cx + hx - .1, h, cz - hz, cx + hx, h + .07, cz + hz, 'metal', { nc: 1 });
  };
  // torre de andamio de 6x6: piso a 2,5 (escalera desde el sur) y piso a 5 en la mitad este (escalera interna); rail=sin baranda en esa cara del piso alto
  const torre = (x0, z0, abierto) => {
    add(x0, 2.2, z0, x0 + 6, 2.5, z0 + 6, 'grate'); add(x0 + 3, 4.7, z0, x0 + 6, 5, z0 + 6, 'grate');
    for (const [px, pz] of [[x0, z0], [x0 + 5.8, z0], [x0, z0 + 5.8], [x0 + 5.8, z0 + 5.8]]) pilar(px + .1, pz + .1, px > x0 ? 4.7 : 2.2);
    // marcos de vigas bajo cada piso (sólidos, por encima de la cabeza) y nervios que se ven desde abajo
    for (const [ax, az, bx, bz, y1, y2] of [[x0, z0, x0 + 6, z0 + .16, 1.95, 2.2], [x0, z0 + 5.84, x0 + 6, z0 + 6, 1.95, 2.2], [x0, z0, x0 + .16, z0 + 6, 1.95, 2.2], [x0 + 5.84, z0, x0 + 6, z0 + 6, 1.95, 2.2],
      [x0 + 3, z0, x0 + 6, z0 + .16, 4.45, 4.7], [x0 + 3, z0 + 5.84, x0 + 6, z0 + 6, 4.45, 4.7], [x0 + 3, z0, x0 + 3.16, z0 + 6, 4.45, 4.7], [x0 + 5.84, z0, x0 + 6, z0 + 6, 4.45, 4.7]]) add(ax, y1, az, bx, y2, bz, 'metal');
    for (const i of [2, 4]) add(x0 + i, 2.05, z0, x0 + i + .1, 2.2, z0 + 6, 'metal', { nc: 1 });
    add(x0 + 4.5, 4.55, z0, x0 + 4.6, 4.7, z0 + 6, 'metal', { nc: 1 });
    add(x0 + 2.9, 2.5, z0 + 5.8, x0 + 3.1, 4.7, z0 + 6, 'metal');                   // apoyo del piso alto (sobre la baranda sur)
    stairs(x0, z0 + 6, x0 + 2, z0 + 11, 0, .5, 5, 'z', -1, 'metal');                 // subida al piso bajo
    stairs(x0, z0, x0 + 3, z0 + 2, 2.5, .5, 5, 'x', 1, 'metal');                     // del piso bajo al alto
    bar(x0, z0, x0 + 6, z0, 2.5); bar(x0, z0 + 2, x0, z0 + 6, 2.5); bar(x0 + 2, z0 + 6, x0 + 6, z0 + 6, 2.5); bar(x0 + 6, z0, x0 + 6, z0 + 6, 2.5);   // piso bajo
    // piso alto: el hueco de la baranda es donde sale la pasarela (norte: x0+4..x0+6 · este: z0+2..z0+4)
    if (abierto === 'n') bar(x0 + 3, z0, x0 + 4, z0, 5); else bar(x0 + 3, z0, x0 + 6, z0, 5);
    if (abierto === 'e') { bar(x0 + 6, z0, x0 + 6, z0 + 2, 5); bar(x0 + 6, z0 + 4, x0 + 6, z0 + 6, 5); } else bar(x0 + 6, z0, x0 + 6, z0 + 6, 5);
    bar(x0 + 3, z0 + 6, x0 + 6, z0 + 6, 5);
    // farol del piso alto
    add(x0 + 5.4, 5, z0 + .4, x0 + 5.6, 6.6, z0 + .6, 'metal'); add(x0 + 5.1, 6.6, z0 + .1, x0 + 5.9, 6.8, z0 + .9, 'black', { nc: 1 });
    deco.push({ t: 'glow', x: x0 + 5.5, y: 6.45, z: z0 + .5, c: 0x9ac0ff });
  };

  /* ---- suelo: subsuelo de roca, plaza con dos huecos (bowls) y borde ---- */
  add(-70, -8, -60, 70, -3.5, 60, 'rock');
  const slab = (x0, z0, x1, z1) => add(x0, -3.5, z0, x1, 0, z1, 'concrete');
  slab(-26, -32, 55.8, -10); slab(-34, -10, 55.8, -4); slab(-55.8, -10, -52, -4); slab(-34, -4, 55.8, 12); slab(-55.8, 12, 55.8, 22);
  slab(-55.8, 22, 20, 52); slab(46, 22, 55.8, 52); slab(20, 38, 28, 52); slab(28, 50, 46, 52);   // al sureste queda el hueco del pozo en L grande
  slab(-55.8, -36, 55.8, -32); slab(-55.8, -32, -52, -10); slab(-55.8, -4, -52, 12);
  // pozo en L del oeste (como el del render): el bowl grande, un canal y el bowl chico forman un solo pozo con piso a -3
  add(-52, -3.5, -32, -26, -3, -10, 'concrete'); add(-52, -3.5, -10, -34, -3, 12, 'concrete');
  ramp(-52, -32, -47.5, 12, -3, -3, 0, 'x', -1, 'concrete'); ramp(-31, -32, -26, -10, -3, -3, 0, 'x', 1, 'concrete');
  ramp(-52, -32, -26, -27, -3, -3, 0, 'z', -1, 'concrete'); ramp(-34, -15, -26, -10, -3, -3, 0, 'z', 1, 'concrete');
  ramp(-38.5, -10, -34, 12, -3, -3, 0, 'x', 1, 'concrete'); ramp(-52, 8, -34, 12, -3, -3, 0, 'z', 1, 'concrete');
  // pozo en L grande del sureste (3,2 m de profundidad): un bloque adentro para saltar y una vuelta al fondo
  add(20, -3.5, 22, 46, -3.2, 38, 'concrete'); add(28, -3.5, 38, 46, -3.2, 50, 'concrete'); add(29, -3.2, 28, 35, -1.6, 32, 'smooth');
  ramp(20, 22, 25, 38, -3.2, -3.2, 0, 'x', -1, 'concrete'); ramp(20, 22, 46, 27, -3.2, -3.2, 0, 'z', -1, 'concrete'); ramp(41, 22, 46, 50, -3.2, -3.2, 0, 'x', 1, 'concrete');
  ramp(20, 33, 28, 38, -3.2, -3.2, 0, 'z', 1, 'concrete'); ramp(28, 38, 33, 50, -3.2, -3.2, 0, 'x', -1, 'concrete'); ramp(28, 45, 46, 50, -3.2, -3.2, 0, 'z', 1, 'concrete');

  lipX(-52, -26, -32); lipZ(-32, -10, -26); lipX(-34, -26, -10); lipZ(-10, 12, -34); lipX(-52, -34, 12); lipZ(-32, 12, -52);
  lipX(20, 46, 22); lipZ(22, 50, 46); lipX(28, 46, 50); lipZ(38, 50, 28); lipX(20, 28, 38); lipZ(22, 38, 20);
  /* ---- límites: valla al oeste y al este, mural al sur y al norte-oeste, río al norte; todo cerrado por arriba y por los costados ---- */
  // vallas de alambre con tramos rotos (huecos): detrás hay muro invisible, así que nadie sale, pero se ve la calle y el río por los agujeros
  const fenceZ = (xa, xb, z0, z1, gaps) => { let a = z0; for (const [g0, g1] of [...gaps, [z1, z1]]) { if (g0 > a) add(xa, 0, a, xb, 4.2, g0, 'fence'); a = Math.max(a, g1); } };
  const fenceX = (za, zb, x0, x1, gaps) => { let a = x0; for (const [g0, g1] of [...gaps, [x1, x1]]) { if (g0 > a) add(a, 0, za, g0, 4.2, zb, 'fence'); a = Math.max(a, g1); } };
  fenceZ(-56, -55.8, -36, 52, [[4, 9], [36, 41]]); fenceZ(55.8, 56, -32, 52, [[10, 14], [30, 35]]);
  add(-56.2, 0, -36, -55.6, .25, 52, 'concrete', { nc: 1 }); add(55.6, 0, -32, 56.2, .25, 52, 'concrete', { nc: 1 }); add(-56.1, 1.9, -36, -55.8, 1.98, 52, 'metal', { nc: 1 }); add(55.8, 1.9, -32, 56.1, 1.98, 52, 'metal', { nc: 1 });
  for (let z = -36; z <= 52; z += 6) { add(-56.1, 0, z, -55.8, 4.4, z + .3, 'metal'); if (z >= -32) add(55.8, 0, z, 56.1, 4.4, z + .3, 'metal'); }
  add(-56.1, 4.2, -36, -55.8, 4.4, 52, 'metal'); add(55.8, 4.2, -32, 56.1, 4.4, 52, 'metal');
  fenceX(51.7, 51.9, -55.8, 55.8, [[-30, -24], [16, 22]]); add(-55.8, 4.2, 51.6, 55.8, 4.4, 52, 'metal'); fenceX(-36.2, -36, -55.8, -2, [[-40, -35]]); add(-55.8, 4.2, -36.3, -2, 4.4, -35.9, 'metal');
  add(-55.8, 0, 51.5, 55.8, .25, 52.1, 'concrete', { nc: 1 }); add(-55.8, 1.9, 51.6, 55.8, 1.98, 52, 'metal', { nc: 1 }); add(-55.8, 0, -36.4, -2, .25, -35.8, 'concrete', { nc: 1 }); add(-55.8, 1.9, -36.3, -2, 1.98, -35.9, 'metal', { nc: 1 });   // vallas de alambre: al norte se ve el río, al sur la calle
  for (let x = -55.8; x <= 55; x += 6) add(x, 0, 51.5, x + .3, 4.4, 52.1, 'metal'); for (let x = -55.8; x <= -2; x += 6) add(x, 0, -36.4, x + .3, 4.4, -35.8, 'metal');
  add(-60, -8, -44, -55.8, 60, 58, 'clip'); add(55.8, -8, -44, 60, 60, 58, 'clip'); add(-60, -8, -44, 60, 60, -36.2, 'clip');
  add(-60, -8, 52, 60, 60, 58, 'clip'); add(-60, 24, -44, 60, 60, 58, 'clip');     // techo del mapa: inalcanzable ni con rocket jump
  lava.push({ min: [-420, -4, -260], max: [420, 0, -36.6], water: true, dps: 0 });   // el Paraná, al otro lado del muro: solo se ve
  // afuera: pasto oscuro y la calle con autos estacionados (solo se ven)
  add(-420, -.5, -36.6, -56.5, -.05, 400, 'grass', { nc: 1 }); add(56.5, -.5, -36.6, 420, -.05, 400, 'grass', { nc: 1 }); add(-56.5, -.5, 52, 56.5, -.05, 400, 'grass', { nc: 1 });
  add(-56.5, -.05, 57, 56.5, 0, 66, 'rock', { nc: 1 });
  for (const [x, z, c] of [[-34, 60.5, 'barn'], [8, 61.5, 'navy'], [38, 60.5, 'barn']]) { add(x, 0, z, x + 4.4, 1, z + 1.9, c, { nc: 1 }); add(x + 1, 1, z + .1, x + 3.2, 1.7, z + 1.8, 'black', { nc: 1 }); }
  palma(-53.5, -34, 9); palma(-53.5, 35, 8); palma(53.5, 35, 9); palma(-53.5, 10, 8); palma(53.5, -2, 8); palma(-10, 35.5, 7);
  palma(-60, 20, 8); palma(62, 14, 9); palma(-30, 55, 8); palma(24, 55, 9); palma(-53.5, 49, 8); palma(53.5, 49, 9);

  /* ---- tribuna al norte: 10 gradas hasta 5 m, pasillo de arriba con baranda sobre el río ---- */
  // las 4 primeras gradas son macizas (con dos entradas de 3 m en x 14..17 y 36..39); de la 5 en adelante están huecas por debajo (a 2 m):
  // abajo queda una galería oscura de 7 m de fondo, abierta al oeste, con pilares y botín: el escondite del mapa
  for (let i = 1; i <= 10; i++) {
    const za = -20 - 1.2 * i, zb = za + 1.2, top = .5 * i;
    if (i <= 4) { for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) add(a, 0, za, b, top, zb, 'concrete'); }
    else add(-2, 2, za, 54, top, zb, 'concrete');
  }
  for (const x of [6, 22, 30, 46]) { add(x, .25, -29.3, x + .6, 1.75, -28.7, 'concrete'); add(x - .1, 0, -29.4, x + .7, .25, -28.6, 'concrete'); add(x - .1, 1.75, -29.4, x + .7, 2, -28.6, 'concrete'); }
  for (let x = 0; x <= 54; x += 6) add(x, 1.82, -32, x + .35, 2, -24.8, 'concrete', { nc: 1 });   // nervios del techo de la galería
  // muro bajo (1,1 m, se salta) al pie de la tribuna, con los dos pasos a la galería: es el lienzo de graffitis largo que se ve en el render
  for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) add(a, 0, -19.8, b, 1.1, -19.4, 'concrete');
  add(-2, 0, -36, 54, 5, -32, 'concrete');
  bar(-2, -36, 54, -36, 5);
  add(54, 0, -36, 55.8, 5, -20, 'concrete');                                       // cabecera este de la tribuna
  /* ---- andamios, pasarelas y plataforma sur ---- */
  torre(-22, -24, 'e'); torre(-30, 18, ''); torre(40, 10, 'n');
  // pasarela 1: de la torre norte-oeste a la tribuna, a 5 m (L: 12 m al este y 16 m al norte)
  add(-16, 4.7, -22, -4, 5, -20, 'grate'); add(-4, 4.7, -36, -2, 5, -20, 'grate');
  bar(-16, -22, -4, -22, 5); bar(-16, -20, -4, -20, 5); bar(-4, -36, -4, -30, 5); bar(-4, -26.6, -4, -22, 5); bar(-2.1, -32, -2.1, -20, 5); bar(-4, -36, -2, -36, 5);
  for (const [x, z] of [[-10.1, -22], [-10.1, -20.2], [-3.1, -26], [-3.1, -22.4]]) pilar(x + .1, z + .1, 4.7);
  add(-16, 4.35, -22, -4, 4.7, -21.86, 'metal'); add(-16, 4.35, -20.14, -4, 4.7, -20, 'metal'); add(-4, 4.35, -36, -3.86, 4.7, -20, 'metal'); add(-2.14, 4.35, -36, -2, 4.7, -20, 'metal');   // vigas de borde
  for (let x = -14; x < -4; x += 2) add(x, 4.5, -22, x + .08, 4.7, -20, 'metal', { nc: 1 }); for (let z = -34; z < -22; z += 2) add(-4, 4.5, z, -2, 4.7, z + .08, 'metal', { nc: 1 });   // nervios
  // pasarela 2: de la tribuna a la torre este, a 5 m (2 m de ancho sobre la plaza)
  add(44, 4.7, -30.8, 46, 5, 10, 'grate');
  bar(44, -30.8, 44, 10, 5); bar(46, -30.8, 46, 10, 5);
  for (const z of [-14, -4, 6]) { pilar(44, z + .1, 4.7); pilar(46, z + .1, 4.7); }
  add(44, 4.35, -30.8, 44.14, 4.7, 10, 'metal'); add(45.86, 4.35, -30.8, 46, 4.7, 10, 'metal'); for (let z = -28; z < 10; z += 2) add(44, 4.5, z, 46, 4.7, z + .08, 'metal', { nc: 1 });
  /* ---- pirámides, bank con cartel, billboard y terraza contra la valla ---- */
  hip(-12, 2, 3, 2.5, 1.5, 4); hip(14, 2, 4, 3, 2.4, 5);
  ramp(-6, 24, 0, 30, 0, 0, 1, 'x', 1, 'concrete'); add(0, 0, 24, 8, 1, 30, 'smooth'); ramp(8, 24, 14, 30, 0, 0, 1, 'x', -1, 'concrete');   // bank to ledge
  add(0, 1, 24, 8, 1.08, 24.2, 'rail', { nc: 1 });
  ramp(46, 20, 52, 31, 0, 0, 2.6, 'x', 1, 'concrete'); add(52, 0, 20, 55.8, 2.6, 31, 'smooth'); bar(46, 20, 55.8, 20, 2.6); bar(46, 31, 55.8, 31, 2.6);
  // poste de luz con transformador, como el de la foto
  add(-46.3, 0, 29.7, -45.7, 11, 30.3, 'concrete'); add(-48.2, 9.6, 29.85, -43.8, 9.8, 30.15, 'metal', { nc: 1 }); add(-47.4, 7.6, 29.5, -46.6, 8.8, 30.5, 'metal', { nc: 1 }); add(-45.4, 7.6, 29.5, -44.6, 8.8, 30.5, 'metal', { nc: 1 });
  // cajones, muretes y cobertura baja
  for (const [x, z, s] of [[-6, -16, 1.5], [30, -6, 1.2], [-20, 14, 1.2], [4, 20, 1.2], [-42, 20, 1.2], [22, -14, 1.2], [8, -12, 1.2]]) add(x, 0, z, x + s * 1.4, s, z + s, 'crate');
  add(-28, 0, 8, -22, .9, 8.6, 'smooth'); 
  // zona sur nueva (z 38..51): media caña (mini ramp) al oeste, escalera con terraza al medio, muros de cobertura y salida con saltador
  ramp(-34, 42, -29, 50, 0, 0, 1.8, 'x', -1, 'concrete'); add(-38, 0, 42, -34, 1.8, 50, 'smooth'); ramp(-21, 42, -16, 50, 0, 0, 1.8, 'x', 1, 'concrete'); add(-16, 0, 42, -12, 1.8, 50, 'smooth');
  stairs(8, 40, 20, 46, 0, .5, 4, 'x', 1, 'concrete'); add(20, 0, 40, 28, 2, 46, 'smooth'); bar(20, 40, 28, 40, 2); bar(20, 46, 28, 46, 2);
  for (const [x0, z0, x1, z1] of [[-8, 40, -7.6, 48], [0, 38.6, 6, 39], [-45, 42, -44.6, 49], [8, 48, 16, 48.4]]) muro(x0, z0, x1, z1);
  add(-4, 0, 47, -1, 1.2, 48.6, 'crate'); add(-48, 0, 41, -46.4, 1.2, 44, 'crate');
  pads.push({ x: -24, y: 0, z: 46, r: 1.1, t: [-25.5, 5, 21], apex: 3 });          // media caña -> piso alto de la torre sur-oeste
  I('health', -36, 1.8, 46); I('armor', -14, 1.8, 46); I('shells', 25, 2, 43); I('rockets', 0, 0, 44); I('bullets', 50, 0, 44); I('health', 14, 0, 49); I('slugs', -42, 0, 46); I('grenades', 48, 0, 48); I('armor', 6, 0, 42);
  [[-24, 0, 48], [0, 0, 44], [14, 0, 49.8], [50, 0, 44], [25, 2, 43], [-42, 0, 46], [38, -3.2, 29], [38, -3.2, 40], [-54, 1.8, 19], [54, 1.8, -11]].forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  // más estructura (como en el render): spine en el centro, hip este, dos bancos con terraza contra las vallas y una escalera con terraza
  ramp(-4.5, -2, -.5, 6, 0, 0, 1.4, 'x', 1, 'concrete'); add(-.5, 0, -2, .5, 1.4, 6, 'smooth'); ramp(.5, -2, 4.5, 6, 0, 0, 1.4, 'x', -1, 'concrete');
  hip(32, 7, 4, 1.2, 1.8, 4);
  ramp(-52, 14, -46, 24, 0, 0, 1.8, 'x', -1, 'concrete'); add(-55.8, 0, 14, -52, 1.8, 24, 'smooth'); bar(-55.8, 14, -46, 14, 1.8); bar(-55.8, 24, -46, 24, 1.8);
  ramp(46, -16, 52, -6, 0, 0, 1.8, 'x', 1, 'concrete'); add(52, 0, -16, 55.8, 1.8, -6, 'smooth'); bar(46, -16, 55.8, -16, 1.8); bar(46, -6, 55.8, -6, 1.8);
  stairs(26, -18, 34, -12, 0, .5, 3, 'x', 1, 'concrete'); add(34, 0, -18, 40, 1.5, -12, 'smooth'); bar(34, -18, 40, -18, 1.5);
  pads.push({ x: 27, y: -3.2, z: 30, r: 1.1, t: [44.5, 5, 13], apex: 3 });          // pozo grande -> piso alto de la torre este
  // ascensor rápido: sube del piso de la plaza a la pasarela de la tribuna (5 m) cada 10 s; el costado cyan se enciende solo
  mover(-7.6, -.36, -30, -4, .04, -26.6, 'metal', 1, 5, 10, -Math.PI / 2);
  add(-7.95, 0, -30.2, -7.75, 6.4, -30, 'metal'); add(-7.95, 0, -26.6, -7.75, 6.4, -26.4, 'metal'); add(-7.95, 6.2, -30.2, -7.75, 6.4, -26.4, 'metal'); add(-8.05, 0, -30.3, -7.65, .25, -26.3, 'concrete');   // marco del hueco
  deco.push({ t: 'glow', x: -7.85, y: 6.0, z: -28.3, c: 0x6ae0ff });
  // muros de cobertura (3 m): cortan la línea de tiro de la plaza y dejan esquinas para esperar a oscuras
  for (const [x0, z0, x1, z1] of [[-12, -18, -11.6, -10], [22, -9, 30, -8.6], [41, -4, 41.4, 6], [-26, 28, -18, 28.4], [10, 18, 18, 18.4], [-8, 9, -7.6, 16]]) muro(x0, z0, x1, z1);
  // kiosko con techo: dos puertas al norte y al sur, una al este; se sube al techo (3 m) por una escalera de afuera
  wall(-31, -1, -22, -.6, 0, 2.8, [D(-28, -25, 0, 2.2), D(-30.4, -29, 1, 2), D(-24, -22.6, 1, 2)], 'brick'); wall(-31, 5.6, -22, 6, 0, 2.8, [D(-30, -27, 0, 2.2), D(-26, -23.4, 1, 2)], 'brick');
  wall(-31, -.6, -30.6, 5.6, 0, 2.8, [D(1.4, 3.8, 1, 2)], 'brick'); wall(-22.4, -.6, -22, 5.6, 0, 2.8, [D(1, 3.4, 0, 2.2)], 'brick');
  add(-31.4, 2.55, -1.4, -21.6, 2.7, 6.4, 'concrete');                                                     // cornisa
  for (const [x0, z0, x1, z1] of [[-30.5, -1.05, -29, -.55], [-24.1, -1.05, -22.5, -.55], [-26.1, 5.55, -23.3, 6.05]]) add(x0 - .08, .94, z0, x1 + .08, 1, z1, 'metal', { nc: 1 });   // antepechos
  add(-26.6, 0, 4.7, -22.6, 1.05, 5.4, 'wood'); add(-26.7, 1.05, 4.65, -22.5, 1.12, 5.45, 'metal');       // mostrador
  add(-30.6, .3, .6, -30.1, .36, 5.2, 'wood'); add(-30.6, .9, .6, -30.1, .96, 5.2, 'wood');               // estantes
  add(-31.2, 2.7, -1.2, -21.8, 3, 6.2, 'roof'); stairs(-31, -6, -29, -1, 0, .5, 6, 'z', 1, 'concrete');
  bar(-29, -1.2, -21.8, -1.2, 3); bar(-31.2, -1.2, -31.2, 6.2, 3); bar(-31.2, 6.2, -21.8, 6.2, 3); bar(-21.8, -1.2, -21.8, 6.2, 3);
  deco.push({ t: 'cartel', x: -26.5, y: 2.4, z: -1.03, w: 3.2, h: .3, txt: 'KIOSCO 24 HS', bg: '#2a1c14', fg: '#a8844a', ry: Math.PI });
  /* ---- graffitis: todo el mapa está pintado, como en el render (paredes de los pozos, rampas, muros, tribuna y algo de piso) ---- */
  const P = Math.PI, al = (d, w) => Math.atan2(d, w);
  // pozo en L del oeste (3 m): pared oeste (44 m de largo), norte, este del bowl grande, sur, este del canal y sur del bowl chico
  cover(-49.75, -1.5, -10, P / 2, al(3, 4.5), 44, 5.4, 1); cover(-39, -1.5, -29.5, 0, al(3, 5), 26, 5.8, 1); cover(-28.5, -1.5, -21, -P / 2, al(3, 5), 22, 5.8, 1);
  cover(-30, -1.5, -12.5, P, al(3, 5), 8, 5.8, 1); cover(-36.25, -1.5, 1, -P / 2, al(3, 4.5), 22, 5.4, 1); cover(-43, -1.5, 10, P, al(3, 4), 18, 5, 1);
  // pozo en L grande del sureste (3,2 m)
  cover(22.5, -1.6, 30, P / 2, al(3.2, 5), 16, 5.9, 1); cover(33, -1.6, 24.5, 0, al(3.2, 5), 26, 5.9, 1); cover(43.5, -1.6, 36, -P / 2, al(3.2, 5), 28, 5.9, 1);
  cover(24, -1.6, 35.5, P, al(3.2, 5), 8, 5.9, 1); cover(30.5, -1.6, 44, P / 2, al(3.2, 5), 12, 5.9, 1); cover(37, -1.6, 47.5, P, al(3.2, 5), 18, 5.9, 1);
  // pirámides, spine, hip, bancos, bank to ledge y media caña (las cuatro rampas de cada una)
  cover(-12, .75, -2.5, P, al(1.5, 4), 6, 4.3, 1); cover(-12, .75, 6.5, 0, al(1.5, 4), 6, 4.3, 1); cover(-17, .75, 2, -P / 2, al(1.5, 4), 5, 4.3, 1); cover(-7, .75, 2, P / 2, al(1.5, 4), 5, 4.3, 1);
  cover(14, 1.2, -3.5, P, al(2.4, 5), 8, 5.5, 1); cover(14, 1.2, 7.5, 0, al(2.4, 5), 8, 5.5, 1); cover(7.5, 1.2, 2, -P / 2, al(2.4, 5), 6, 5.5, 1); cover(20.5, 1.2, 2, P / 2, al(2.4, 5), 6, 5.5, 1);
  cover(32, .9, 3.8, P, al(1.8, 4), 8, 4.4, 1); cover(32, .9, 10.2, 0, al(1.8, 4), 8, 4.4, 1); cover(-2.5, .7, 2, -P / 2, al(1.4, 4), 8, 4.2, 1); cover(2.5, .7, 2, P / 2, al(1.4, 4), 8, 4.2, 1);
  cover(-49, .9, 19, P / 2, al(1.8, 6), 10, 6.3, 1); cover(49, .9, -11, -P / 2, al(1.8, 6), 10, 6.3, 1); cover(49, 1.3, 25.5, -P / 2, al(2.6, 6), 11, 6.5, 1);
  cover(-3, .5, 27, -P / 2, al(1, 6), 6, 6.1, 1); cover(11, .5, 27, P / 2, al(1, 6), 6, 6.1, 1); cover(-31.5, .9, 46, P / 2, al(1.8, 5), 8, 5.3, 1); cover(-18.5, .9, 46, -P / 2, al(1.8, 5), 8, 5.3, 1);
  // muros de cobertura (las dos caras) y el muro bajo al pie de la tribuna
  for (const [x0, z0, x1, z1] of [[-12, -18, -11.6, -10], [22, -9, 30, -8.6], [41, -4, 41.4, 6], [-26, 28, -18, 28.4], [10, 18, 18, 18.4], [-8, 9, -7.6, 16], [0, 38.6, 6, 39], [-8, 40, -7.6, 48], [-45, 42, -44.6, 49], [8, 48, 16, 48.4]]) wallArt(x0, z0, x1, z1, 3);
  for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) cover((a + b) / 2, .55, -19.37, 0, P / 2, b - a, 1.1, 1);
  // piso: manchones y firmas sueltas (pocas, como en el render)
  for (const [x, z] of [[-14, -26], [8, -5], [18, 16], [-30, 38], [0, 34], [36, -8], [52, 10], [-24, 16], [-10, 20], [50, 40], [12, 36], [-40, 24], [26, 20], [-4, -20]]) cover(x, 0, z, rnd() * 6.28, 0, 5, 3.4, 1);
  // basura y escombros afuera de las vallas (solo se ven): palets y rocas
  for (const [x, z] of [[-60, -20], [-61, 6], [-59, 30], [-26, 56], [14, 57], [44, 56], [60, 20], [61, -4]]) { add(x, 0, z, x + 1.4, .14, z + 1.1, 'wood', { nc: 1 }); add(x + .1, .14, z + .1, x + 1.3, .28, z + 1, 'wood', { nc: 1 }); add(x + 1.9, 0, z + .4, x + 2.6, .5, z + 1.1, 'rock', { nc: 1 }); }
  // orilla del río al norte: banco de pasto con juncos
  add(-58, -1, -44, -2, .3, -37.2, 'grass', { nc: 1 }); for (let x = -56; x <= -4; x += 5) deco.push({ t: 'bush', x, y: .3, z: -39.5 + (x % 3), r: .8 });
  // reflectores: casi todos apagados
  for (const [x, z, on] of [[-54.2, -26, 0], [-54.2, -6, 0], [-54.2, 28, 1], [-54.2, 46, 0], [-40, 50.6, 0], [-20, 50.6, 0], [2, 50.6, 1], [24, 50.6, 0], [46, 50.6, 0], [54.6, -19, 0], [54.6, 6, 1], [54.6, 34, 0], [54.6, 46, 0], [0, -8, 0], [36, 18, 0], [-20, 34, 0], [30, -18, 0]]) poste(x, z, on);
  for (const [x, on] of [[8, 0], [28, 1], [48, 0]]) poste(x, -35.5, on, 5);   // sobre el pasillo de la tribuna

  /* ---- portales: uno en el rincón sur-oeste y otro arriba de la tribuna ---- */
  teles.push({ x: -46, y: 0, z: 34, r: 1, to: [46.5, 5, -33.7], yaw: face(46.5, -33.7, 0, 0), color: 'yellow' });
  teles.push({ x: 51, y: 5, z: -33.8, r: 1, to: [-42, 0, 31], yaw: face(-42, 31, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -46, y: 0, z: 34, r: 1, color: 'yellow' }, { t: 'portal', x: 51, y: 5, z: -33.8, r: 1, color: 'blue' });
  /* ---- saltadores ---- */
  pads.push({ x: -36, y: -3, z: -21, r: 1.1, t: [-17.2, 5, -21], apex: 3 });       // bowl grande -> piso alto de la torre norte-oeste
  pads.push({ x: -45, y: -3, z: 6.5, r: 1.1, t: [-25.5, 5, 21], apex: 3 });        // bowl chico -> piso alto de la torre sur-oeste
  pads.push({ x: 0, y: 0, z: -12, r: 1.1, t: [10, 5, -34], apex: 2.5 });           // plaza -> pasillo de la tribuna
  pads.push({ x: 32, y: 0, z: 19, r: 1.1, t: [44.5, 5, 13], apex: 2.5 });          // plaza este -> piso alto de la torre este

  /* ---- ítems (todo lo que ya existe) ---- */
  // armaduras amarillas: pasillo de la tribuna, bowl chico y debajo del cartel
  I('armorH', 1, 5, -34); I('armorH', -41, -3, 2); I('armorH', 0, 0, 14);
  I('quad', 45, 5, -8); I('mega', -25.5, 5, 21);
  // armas
  I('w1', -12, 1.5, 2); I('w2', 0, 0, 12.5); I('w3', -39, -3, -24); I('w4', 37, -3.2, 42); I('w5', 41.5, 2.5, 14.5); I('w6', 24, 4.5, -30.2); I('w8', 45, 5, -27); I('w9', -17.5, 5, -22);
  // munición
  I('shells', 14, 2.4, 2); I('shells', -30, 0, -34); I('bullets', 52, 2.6, 25); I('bullets', -24, 0, -7); I('rockets', 22, 0, 20); I('rockets', 41, 5, -34); I('grenades', -50, 0, 30); I('grenades', 4, 0, -8);
  I('slugs', 14, 5, -34); I('slugs', -47, -3, 2); I('caza', 38, -3.2, 30); I('caza', -21, 2.5, -20);
  // chalecos y botiquines
  I('armor', -14, 1.5, 2); I('armor', 32, 0, -10); I('armor', -34, -3, -17); I('armor', 24, 5, -34); I('armor', 35, 0, 16); I('armor', -6, 0, 33);
  I('health', -40, -3, -18); I('health', -43, -3, 4); I('health', 14, 2.4, 0); I('health', 6, 5, -34); I('health', 36, 5, -34); I('health', -18, 2.5, -19.5); I('health', -27, 2.5, 21);
  I('health', 42.5, 2.5, 12.5); I('health', 54, 2.6, 22); I('health', -3, 0, -6); I('health', 32, 1.8, 7); I('health', -8, 0, 24); I('health', 50, 0, 36); I('health', -50, 0, -34); I('health', 8, 0, -17);

  I('armor', -54, 1.8, 19); I('health', 54, 1.8, -11); I('armor', 40, -3.2, 43); I('health', 34, -3.2, 36); I('shells', 30, -3.2, 35);
  // galería bajo la tribuna y kiosko: botín en la oscuridad
  I('armor', 10, 0, -28.2); I('bullets', 44, 0, -28); I('health', 26, 0, -29); I('shells', 34, 0, -27); I('rockets', 2, 0, -27);
  I('armor', -26, 0, 2); I('rockets', -29, 0, 4); I('slugs', -26, 3, 2); I('health', -24, 3, 5);
  /* ---- apariciones: repartidas por todos los niveles ---- */
  [[-12, 0, -34], [-8, 0, -14], [4, 0, -8], [22, 0, -10], [42, 0, -9], [50, 0, -2], [50, 0, 6], [30, 0, -1], [38, 0, 18], [8, 0, 34], [-20, 0, 32], [-36, 0, 22], [-50, 0, 28], [-48, 0, -34], [-20, 0, -33], [-24, 0, -6],
   [-40, -3, -20], [-34, -3, -24], [-43, -3, 3], [6, 5, -34], [20, 5, -34], [34, 5, -34], [26, 3, -26.6], [-17, 5, -21], [-25.5, 5, 21], [44.5, 5, 13], [45, 5, -10], [14, 2.4, 2], [-12, 1.5, 2], [42, 2.5, 13], [-20, 2.5, -21], [20, 0, -28], [44, 0, -28], [8, 0, -27], [-26, 0, 3], [-26, 3, 4]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces: unos pocos pozos de luz en la oscuridad (la linterna hace el resto) ---- */
  lights.push({ x: -53, y: 7, z: 28, c: 0xffa860, i: .2, d: 20 }, { x: 53.6, y: 7, z: 6, c: 0xffa860, i: .2, d: 20 }, { x: 2, y: 7, z: 49.6, c: 0xffa860, i: .2, d: 20 }, { x: 28, y: 12, z: -34.6, c: 0xffa860, i: .2, d: 20 },
    { x: -16.5, y: 6.3, z: -23.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: -24.5, y: 6.3, z: 18.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: 45.5, y: 6.3, z: 10.5, c: 0x6aa0ff, i: .4, d: 14 },
    { x: -46, y: 3, z: 34, c: 0xffc840, i: .9, d: 13 }, { x: 51, y: 8, z: -33.8, c: 0x4aa0ff, i: .9, d: 13 },
    { x: -24, y: 3, z: 46, c: 0x4a8a6a, i: .35, d: 14 }, { x: 36, y: 6, z: 48, c: 0xffa860, i: .5, d: 18 }, { x: -39, y: -1, z: -21, c: 0x4a8a6a, i: .35, d: 14 }, { x: -43, y: 0, z: 4, c: 0x8a4a8a, i: .35, d: 12 });
  /* ---- niebla baja: muchas nubes chicas de borde difuminado a distintas alturas (no una lámina con bordes), y más densa dentro de los pozos ---- */
  for (let i = 0; i < 16; i++) { const cx = -50 + rnd() * 100, cz = -32 + rnd() * 82, w = 18 + rnd() * 16, dd = 14 + rnd() * 14; deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - dd / 2, z1: cz + dd / 2, y: .25 + rnd() * .75, o: .1 + rnd() * .08, dir: rnd() < .5 ? 1 : -1 }); }
  for (const [x0, x1, z0, z1, y] of [[-56, -22, -36, -6, -2.55], [-56, -30, -12, 16, -2.55], [16, 50, 18, 54, -2.65]]) for (let k = 0; k < 2; k++) deco.push({ t: 'bruma', soft: 1, x0: x0 + k * 2, x1: x1 - k * 2, z0: z0 + k * 2, z1: z1 - k * 2, y: y + k * .45, o: .14, dir: k % 2 ? 1 : -1 });
  /* ---- abandono: grietas, manchas, musgo, sangre seca, basura, charcos y yuyos sobre el piso; escombros sólidos en los rincones ---- */
  // altura del piso plano en (x, z) si en las cinco muestras es el mismo y no es rampa, rejilla, techo ni baranda (si no, null: ahí no se pega nada)
  const NOPISO = ['grate', 'roof', 'rail', 'fence', 'metal'];
  const flatTop = (x, z, r) => {
    let t0 = null;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      let top = -99, tb = null;
      for (const b of B) { if (b.nc || b.mat === 'clip' || !(b.min[0] < x + dx && b.max[0] > x + dx && b.min[2] < z + dz && b.max[2] > z + dz)) continue; if (b.max[1] > top) { top = b.max[1]; tb = b; } }
      if (!tb || tb.ramp || tb.mover || NOPISO.includes(tb.mat)) return null;
      if (t0 == null) t0 = top; else if (Math.abs(top - t0) > .03) return null;
    }
    return t0;
  };
  const scatter = (ks, count, smin, smax) => {
    for (let n = 0, tries = 0; n < count && tries < count * 12; tries++) {
      const x = -54 + rnd() * 108, z = -34 + rnd() * 84, w = smin + rnd() * (smax - smin), t = flatTop(x, z, w * .5);
      if (t == null) continue;
      deco.push({ t: 'decal', x, y: t + .025, z, w, h: w, k: ks[Math.floor(rnd() * ks.length)], rx: -Math.PI / 2, ry: rnd() * 6.28, rz: 0 }); n++;
    }
  };
  scatter([0, 1, 2, 3, 4, 5], 110, 3.5, 7); scatter([6, 7, 8, 9], 26, 2, 4); scatter([14, 15, 16, 17], 20, 1.8, 3.4); scatter([22, 23, 24, 25], 80, 1.5, 2.6);
  scatter([26, 27, 28, 29], 16, 2.2, 4); scatter([30, 31], 12, 2, 3.4);
  // yuyos: matas cruzadas (4 cuadros) que se cuelan por las grietas, pegadas a las vallas y a los bordes; no estorban (son bajitos)
  const tuft = (x, z) => {
    const h = .5 + rnd() * .85, w = h * (1.2 + rnd() * .5), k = 18 + Math.floor(rnd() * 4), ry = rnd() * 3.14, t = flatTop(x, z, w * .55); if (t == null) return;
    for (const a of [0, Math.PI / 2]) for (const f of [0, Math.PI]) deco.push({ t: 'decal', x, y: t + h / 2 - .02, z, w, h, k, rx: 0, ry: ry + a + f, rz: 0, lib: 1 });
  };
  for (let x = -54; x <= 54; x += 3.4) { tuft(x + rnd() * 2, 50.4 - rnd() * .9); tuft(x + rnd() * 2, -35.2 + rnd() * .9); }
  for (let z = -34; z <= 50; z += 3.4) { tuft(-54.4 + rnd() * .8, z + rnd() * 2); tuft(54.6 - rnd() * .8, z + rnd() * 2); }
  for (let n = 0; n < 110; n++) tuft(-54 + rnd() * 108, -34 + rnd() * 84);
  // escombros: pilas de roca rota (sólidas) en los rincones y contra las vallas
  for (const [x, z] of [[-51, -33.4], [-49, 47], [50, 47], [51, -24.4], [-24, -34.2], [12, -34], [16, 50], [-28, 50], [-52, 24.5], [52, 36]]) { add(x, 0, z, x + 1.6, .6, z + 1.1, 'rock'); add(x + .4, .6, z + .2, x + 1.2, 1.1, z + .8, 'rock'); }
  {   // juntas: los bloques sólidos del mismo material que se tocan se solapan 6 mm (sin grietas de un píxel entre ellos)
    const S = B.filter(b => !b.nc && !b.mover && !b.ramp && b.mat !== 'clip'), g = S.map(() => [[0, 0], [0, 0], [0, 0]]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j]; if (a.mat !== b.mat) continue;
      for (let ax = 0; ax < 3; ax++) {
        const u = (ax + 1) % 3, v = (ax + 2) % 3;
        if (Math.min(a.max[u], b.max[u]) - Math.max(a.min[u], b.min[u]) < .01 || Math.min(a.max[v], b.max[v]) - Math.max(a.min[v], b.min[v]) < .01) continue;
        if (Math.abs(a.max[ax] - b.min[ax]) < 1e-6) { g[i][ax][1] = 1; g[j][ax][0] = 1; } else if (Math.abs(b.max[ax] - a.min[ax]) < 1e-6) { g[j][ax][1] = 1; g[i][ax][0] = 1; }
      }
    }
    S.forEach((b, i) => { for (let ax = 0; ax < 3; ax++) { if (g[i][ax][0]) b.min[ax] -= .006; if (g[i][ax][1]) b.max[ax] += .006; } });
  }
  for (const b of B) if (b.nc && b.mat !== 'clip') for (let k = 0; k < 3; k++) { b.min[k] -= .012; b.max[k] += .012; }   // evita caras coplanares (z-fighting)
  // revisión de grafitis, manchas y carteles: cada pieza tiene que apoyar entera sobre algo sólido y no quedar tapada ni colgando en el aire (si no, se saca)
  const sobre = (x, y, z) => { for (const b of B) { if (b.mat === 'clip' || x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2] || y < b.min[1]) continue; if (y <= topAt(b, x - .001, z - .001, x + .001, z + .001) + .002) return true; } return false; };
  for (let i = deco.length - 1; i >= 0; i--) {
    const d = deco[i]; if ((d.t !== 'graf' && d.t !== 'decal') || d.lib) continue;   // lib: pilas de escombro, que se paran solas sobre el piso
    const rx = d.rx || 0, ry = d.ry || 0, cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    const n = [sy * cx, -sx, cy * cx], u = [cy, 0, -sy], v = [sx * sy, cx, sx * cy];
    let atras = 0, libre = 0;
    for (const [a, c] of [[0, 0], [.4, .4], [-.4, .4], [.4, -.4], [-.4, -.4]]) {
      const x = d.x + u[0] * a * d.w + v[0] * c * d.h, y = d.y + u[1] * a * d.w + v[1] * c * d.h, z = d.z + u[2] * a * d.w + v[2] * c * d.h;
      if (sobre(x - n[0] * .06, y - n[1] * .06, z - n[2] * .06)) atras++;
      if (!sobre(x + n[0] * .03, y + n[1] * .03, z + n[2] * .03)) libre++;
    }
    if (atras < 4 || libre < (d.t === 'graf' ? 4 : 2)) deco.splice(i, 1);
  }
  return finish({ id: 'skatenight', name: 'Skatenight', bounds: { x0: -56, x1: 56, z0: -40, z1: 54 }, deco, modos: ['arena', 'gungame', 'tdm'],
    theme: { sky: 'night', tex: 'ruina', noche: true, skyDim: .035, fog: 0x020409, fogD: .06, amb: 0x1a2440, ambI: .004, hemi: [0x20345c, 0x01020a, .004], sun: true, sunC: 0x5a78c0, sunI: .01, sunPos: [34, 60, -46], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.skatenight = buildSkatenight;
/* ---------- Pyramid — la pirámide de gravedad, noche de Halloween lovecraftiana ----------
   Inspirado en dm-pyramid de Unreal Tournament. Cinco niveles de piedra apilados (cada 4,8 m) que se achican hacia arriba: el de abajo es el
   más grande, así que si te caés de un borde aterrizás en el nivel de abajo. Pisos chicos para que el juego sea rápido.
   · Pozo central de 6x6 m que atraviesa TODOS los niveles, también el de abajo (queda abierto al vacío) y es una ZONA DE GRAVEDAD CERO
     (W.zerog, ver pmove en 04-fisica.js): al entrar flotás y te vas yendo despacio hacia abajo; Espacio sube, agacharse baja y W mirando arriba
     o abajo te lleva para ahí. Para salir en un nivel, te movés de costado por encima del borde del piso. Si te quedás sin subir, salís por
     abajo y te caés al vacío. No hay escaleras: el pozo es la única forma de cambiar de nivel (los bots también lo usan, ver 7-bots.js).
   · Nada de ítems en el pozo: armas, escudos y curación están en los pisos.
   · La punta y las 4 patas son sólidos (se choca y se pisa); las patas no cuentan para la navegación de los bots (nonav). Los obeliscos y los
     escombros también. El pozo está libre: nada adentro.
   · Cada nivel tiene su color (material y luces) y adorno lovecraftiano: obeliscos con ojos y un ojo en el vacío (los tentáculos se ven solo a lo lejos, en el cielo).
   · SIN linterna (no es theme.noche, eso es solo de Skatenight). Música y ambiente propios (theme.ambiente = 'piramide'). */
function buildPyramid() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  const Y = [0, 4.8, 9.6, 14.4, 19.2];          // altura del piso de cada nivel
  const S = [19, 16, 13, 9.5, 6];               // mitad del lado de cada nivel (las patas pasan justo por las esquinas)
  const F = [19 / 24, 16 / 19.5, 13 / 15, 9.5 / 10.5, 1];   // cuánto se achicó cada nivel respecto del diseño anterior: las posiciones de ítems, apariciones y cobertura se escalan con esto
  const H = 3;                                  // mitad del pozo central
  // cada nivel tiene su identidad: material del cuerpo y color de las luces
  const BODY = ['basalt', 'velvet', 'barnB', 'canyon', 'board'];   // lava, magenta, azul, naranja, verde
  const TOP = ['concrete', 'club', 'tower', 'wall', 'step'];
  const LCOL = [0x30ff90, 0xa040ff, 0xffa030, 0xff40c0, 0xb8ff30];
  let gs = 11; const rnd = () => { gs = (gs * 1664525 + 1013904223) >>> 0; return gs / 4294967296; };   // azar fijo: el mapa sale siempre igual

  /* ---- niveles: cuerpo de color + piso de baldosa; todos son un anillo alrededor del pozo (también el de abajo) ---- */
  const slab = (x0, z0, x1, z1, y, th, body, top) => { add(x0, y - th, z0, x1, y - .15, z1, body); add(x0, y - .15, z0, x1, y, z1, top); };
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], th = k ? 1.2 : 3, bd = BODY[k], tp = TOP[k];
    slab(-s, -s, s, -H, y, th, bd, tp); slab(-s, H, s, s, y, th, bd, tp); slab(-s, -H, -H, H, y, th, bd, tp); slab(H, -H, s, H, y, th, bd, tp);
  }
  // cordón del borde de cada nivel: roto, con tramos de distinto alto y huecos (solo se ve, se pisa)
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k];
    for (const side of [0, 1, 2, 3]) {
      for (let q = -s; q < s - .5;) {
        const len = .8 + rnd() * 2.2, e = Math.min(s, q + len), h = .12 + rnd() * .5;
        if (rnd() > .28) { const sg = side % 2 ? 1 : 0;
          if (side < 2) add(q, y, sg ? s - .3 : -s, e, y + h, sg ? s : -s + .3, 'concrete', { nc: 1 }); else add(sg ? s - .3 : -s, y, q, sg ? s : -s + .3, y + h, e, 'concrete', { nc: 1 }); }
        q = e + (rnd() < .3 ? .6 : 0);
      }
    }
  }

  /* ---- pozo de gravedad cero: zona física (baja hasta debajo del nivel 0: ahí salís y te caés al vacío) + efectos casi transparentes ---- */
  const zerog = [{ min: [-H, -3.2, -H], max: [H, Y[4] + 6, H] }];
  for (let i = 0; i < 90; i++) {                                       // espiral de brillos muy tenues (puntos con halo)
    const a = i * .55, y = -.5 + i * .27;
    deco.push({ t: 'glow', x: Math.cos(a) * 1.7, y, z: Math.sin(a) * 1.7, c: 0x0b3548, s: .55 });
  }

  /* ---- patas (sólidas, fuera de la navegación de los bots) y la punta: sólida ---- */
  const slope = (S[0] - S[4]) / Y[4];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let y = -3; y < 24.4; y += .5) {
      const c = S[0] - slope * y;   // la viga pasa justo por la esquina de cada nivel
      add(sx * (c - .9), y, sz * (c - .9), sx * (c + .9), y + .56, sz * (c + .9), 'metal', { nonav: 1 });
    }
  }
  add(-1.8, 24.4, -1.8, 1.8, 25.2, 1.8, 'trim'); add(-1.1, 25.2, -1.1, 1.1, 26, 1.1, 'trim'); add(-.5, 26, -.5, .5, 26.7, .5, 'trim');
  deco.push({ t: 'glow', x: 0, y: 27.3, z: 0, c: 0xc060ff, s: 1.6 });

  /* ---- lovecraft: obeliscos con ojo en los primeros tres niveles y un ojo gigante en el vacío ---- */
  const obelisco = (k, x, z, h) => {
    const y = Y[k], c = LCOL[k];
    add(x - .7, y, z - .7, x + .7, y + .5, z + .7, 'basalt'); add(x - .45, y + .5, z - .45, x + .45, y + h * .72, z + .45, 'basalt'); add(x - .25, y + h * .72, z - .25, x + .25, y + h, z + .25, 'basalt');
    deco.push({ t: 'glow', x, y: y + h + .35, z, c, s: 1.3 }, { t: 'glow', x, y: y + h * .45, z, c, s: .7 });
  };
  for (const k of [0, 1, 2]) { const o = S[k] - (k ? 1.8 : 2); for (const [x, z] of [[o, 0], [-o, 0], [0, o], [0, -o]]) obelisco(k, x, z, 3.6); }
  deco.push({ t: 'glow', x: 0, y: -9, z: 0, c: 0x6a1a8a, s: 18 }, { t: 'glow', x: 0, y: -9.5, z: 0, c: 0xb040ff, s: 7 }, { t: 'glow', x: 0, y: -9.8, z: 0, c: 0xfff0c0, s: 2 });   // el ojo
  lava.push({ min: [-500, -40, -500], max: [500, -14, 500], water: true, dps: 0 });
  for (const [x, z, w] of [[-34, -22, 5], [30, 28, 6], [-30, 32, 4], [36, -18, 4], [0, -44, 7], [-44, 4, 5]]) add(x, -15, z, x + w, -12.6, z + w * .8, 'rock', { nc: 1 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 30 + (i % 4) * 9, cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = 20 + (i % 3) * 8;
    deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 3, z1: cz + w / 3, y: -12 + (i % 4) * 1.8, o: .09, dir: i % 2 ? 1 : -1 });
  }
  add(-80, 45, -80, 80, 55, 80, 'clip');                                                       // techo: inalcanzable

  /* ---- cobertura: cajones y muretes en cada nivel (para pelear, no para encerrarse) ---- */
  const cajon = (x, y, z, s) => add(x - s * .7, y, z - s * .7, x + s * .7, y + s, z + s * .7, 'crate');
  const muro = (x0, z0, x1, z1, y) => { add(x0, y, z0, x1, y + 1.5, z1, 'concrete'); add(x0 - .06, y + 1.5, z0 - .06, x1 + .06, y + 1.62, z1 + .06, 'smooth'); };
  for (const [x, z] of [[-12, -17], [12, 17]]) muro(x * F[0] - 2.5, z * F[0] - .2, x * F[0] + 2.5, z * F[0] + .2, 0);
  for (const [x, z] of [[-17, 12], [17, -12]]) muro(x * F[0] - .2, z * F[0] - 2.5, x * F[0] + .2, z * F[0] + 2.5, 0);
  for (const [x, z] of [[-6, 16], [6, -16], [-16, -6], [16, 6], [-20, -20], [20, 20]]) cajon(x * F[0], 0, z * F[0], 1.4);
  for (const [x, z] of [[-10, -16], [10, 16], [-16, 10], [16, -10]]) cajon(x * F[1], Y[1], z * F[1], 1.3);
  for (const [x, z] of [[-6, -12], [6, 12], [-12, 6], [12, -6]]) cajon(x * F[2], Y[2], z * F[2], 1.3);
  for (const [x, z] of [[-4.5, -9], [4.5, 9]]) cajon(x * F[3], Y[3], z * F[3], 1.2);

  /* ---- ítems: todo en los pisos, en esquinas, laterales y cerca del pozo (ninguno flota en la gravedad cero) ---- */
  const it = (k, list) => list.forEach(([t, x, z]) => I(t, x * F[k], Y[k], z * F[k]));
  it(0, [['w1', -14, 14], ['w2', -14, -14], ['w3', 14, 14], ['armor', 14, -14], ['armor', -21, 21], ['health', -19, 0], ['health', 19, 0], ['health', -10, -21], ['health', 10, 21],
    ['shells', -8, 5], ['bullets', 8, -5], ['rockets', 6, 8], ['grenades', -6, -8], ['slugs', 22, 16], ['caza', -22, -16]]);
  it(1, [['w4', -14, -14], ['w9', 14, 14], ['armor', 14, -14], ['health', -14, 14], ['health', 0, 14.5], ['shells', 0, -14.5], ['rockets', 12, 0], ['bullets', -12, 0], ['health', 7, -7]]);
  it(2, [['w5', -10, -10], ['armor', 10, -10], ['health', -10, 10], ['health', 10, 10], ['grenades', -9, -12], ['slugs', 9, 12], ['mega', 0, -10.5], ['bullets', 0, 10.5]]);
  it(3, [['w6', -7, -7], ['armor', 7, -7], ['health', -7, 7], ['quad', 7, 7], ['rockets', 0, -8], ['caza', 0, 8], ['health', -7, 0]]);
  it(4, [['w8', -3.9, -3.9], ['armor', 3.9, 3.9], ['health', 3.9, -3.9], ['health', -3.9, 3.9], ['armorH', 0, -4.5], ['slugs', -4.5, 0], ['shells', 4.5, 0]]);

  /* ---- apariciones: repartidas por todos los niveles ---- */
  const sp = (k, list) => list.forEach(([x, z]) => { x *= F[k]; z *= F[k]; spawns.push({ x, y: Y[k], z, yaw: face(x, z, 0, 0) }); });
  sp(0, [[-20, -18], [18, -20], [20, 18], [-18, 20], [-20, 6], [20, -6], [6, 20], [-6, -20], [-9, -9], [9, 9], [9, -9], [-9, 9]]);
  sp(1, [[-12, -17], [12, 17], [17, -12], [-17, 12], [-8, -16], [8, 16], [16, 8], [-16, -8]]);
  sp(2, [[-14, -3], [14, 3], [3, -14], [-3, 14], [-5, 12], [5, -12]]);
  sp(3, [[-8.5, -5], [8.5, 5], [5, -8.5], [-5, 8.5]]);
  sp(4, [[0, 4.5], [-4.5, 2], [4.5, -2], [2, -4.5]]);

  /* ---- deterioro: parches de roca, tierra y musgo sobre las caras de cada nivel, varillas y cadenas colgando, enredaderas, escombros y bruma baja ---- */
  const PARCHE = ['rock', 'soil', 'grass', 'concrete', 'metal', 'rock'];
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], th = k ? 1.2 : 3, n = Math.round(s * 1.4);
    for (let i = 0; i < n; i++) for (const side of [0, 1, 2, 3]) {
      const q = -s + rnd() * (s * 2 - 3), w = 1 + rnd() * 2.4, h = th * (.35 + rnd() * .6), y0 = y - .15 - h - rnd() * (th - h - .15), m = PARCHE[Math.floor(rnd() * PARCHE.length)];
      if (rnd() > .45) continue;
      if (side < 2) add(q, y0, side ? s : -s - .05, q + w, y0 + h, side ? s + .05 : -s, m, { nc: 1 }); else add(side === 3 ? s : -s - .05, y0, q, side === 3 ? s + .05 : -s, y0 + h, q + w, m, { nc: 1 });
    }
    for (let i = 0; i < 10; i++) {                                     // varillas de hierro que sobresalen del borde roto
      const side = i % 4, q = -s + 1 + rnd() * (s * 2 - 2), yy = y - .3 - rnd() * (th - .5), L = .7 + rnd() * 1.1;
      if (side < 2) add(q, yy, side ? s : -s - L, q + .07, yy + .07, side ? s + L : -s, 'metal', { nc: 1 }); else add(side === 3 ? s : -s - L, yy, q, side === 3 ? s + L : -s, yy + .07, q + .07, 'metal', { nc: 1 });
    }
    for (let i = 0; i < 7; i++) {                                      // cadenas que cuelgan bajo el borde
      const side = i % 4, q = -s + 2 + rnd() * (s * 2 - 4), n2 = 3 + Math.floor(rnd() * 4), yy = y - th;
      const cx = side < 2 ? q : (side === 3 ? s + .15 : -s - .15), cz = side < 2 ? (side ? s + .15 : -s - .15) : q;
      for (let j = 0; j < n2; j++) add(cx - .05 + (j % 2) * .04, yy - (j + 1) * .42, cz - .05 + (j % 2) * .04, cx + .05 + (j % 2) * .04, yy - j * .42, cz + .05 + (j % 2) * .04, 'metal', { nc: 1 });
    }
    for (let q = -s + 1; q < s; q += 2.2 + rnd() * 1.4) {              // enredaderas colgando de los cuatro lados
      const len = 1.2 + rnd() * 2.4, yv = y - .3 - rnd() * .5;
      deco.push({ t: 'enredadera', x: q, y: yv, z: -s - .06, len, ry: Math.PI }, { t: 'enredadera', x: q, y: yv, z: s + .06, len: len * .9, ry: 0 },
        { t: 'enredadera', x: -s - .06, y: yv, z: q, len: len * .8, ry: -Math.PI / 2 }, { t: 'enredadera', x: s + .06, y: yv, z: q, len, ry: Math.PI / 2 });
    }
    for (const [x0, z0, x1, z1] of [[-s, -s, s, -H], [-s, H, s, s], [-s, -H, -H, H], [H, -H, s, H]]) deco.push({ t: 'bruma', soft: 1, x0, x1, z0, z1, y: y + .35, o: .1, dir: k % 2 ? 1 : -1 });   // bruma pegada al piso
  }
  for (let [k, x, z] of [[0, 21, -21], [0, -21, -21], [0, 22.5, 6], [0, -22.5, -6], [1, 16.5, -16.5], [1, -16.5, -16.5], [2, 12.5, -12.5], [2, -12.5, 12.5]]) {   // montones de escombros (sólidos, sirven de cobertura)
    const y = Y[k]; x *= F[k]; z *= F[k];
    add(x - .9, y, z - .7, x + .9, y + .7, z + .7, 'rock'); add(x - .5, y + .7, z - .4, x + .5, y + 1.2, z + .4, 'rock'); add(x + .7, y, z - 1.4, x + 1.5, y + .4, z - .7, 'rock'); add(x - 1.5, y, z + .3, x - .9, y + .35, z + 1, 'rock');
  }

  /* ---- decals: grietas, musgo, sangre y charcos sobre los pisos (solo donde el piso es plano) ---- */
  const NOPISO = ['grate', 'roof', 'rail', 'fence', 'metal', 'tube'];
  const flatTop = (x, z, r) => {
    let t0 = null;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      let top = -99, tb = null;
      for (const b of B) { if (b.nc || b.mat === 'clip' || !(b.min[0] < x + dx && b.max[0] > x + dx && b.min[2] < z + dz && b.max[2] > z + dz)) continue; if (b.max[1] > top) { top = b.max[1]; tb = b; } }
      if (!tb || tb.ramp || tb.mover || NOPISO.includes(tb.mat) || tb.mat === 'basalt') return null;
      if (t0 == null) t0 = top; else if (Math.abs(top - t0) > .03) return null;
    }
    return t0;
  };
  const scatter = (ks, count, smin, smax) => {
    for (let n = 0, tries = 0; n < count && tries < count * 14; tries++) {
      const x = -S[0] + rnd() * S[0] * 2, z = -S[0] + rnd() * S[0] * 2, w = smin + rnd() * (smax - smin), t = flatTop(x, z, w * .5);
      if (t == null) continue;
      deco.push({ t: 'decal', x, y: t + .025, z, w, h: w, k: ks[Math.floor(rnd() * ks.length)], rx: -Math.PI / 2, ry: rnd() * 6.28, rz: 0 }); n++;
    }
  };
  scatter([0, 1, 2, 3, 4, 5], 110, 2.5, 5.5); scatter([14, 15, 16, 17], 46, 1.8, 3.6); scatter([26, 27, 28, 29], 34, 2.2, 4); scatter([30, 31], 14, 2, 3.6); scatter([6, 7, 8, 9], 26, 2, 3.8); scatter([22, 23, 24, 25], 40, 1.5, 2.6);

  /* ---- luces de color: cada nivel con su tono (el pozo, apenas un resplandor celeste) ---- */
  for (let k = 0; k <= 4; k++) { const o = S[k] * .55; lights.push({ x: o, y: Y[k] + 2.6, z: -o, c: LCOL[k], i: .6, d: 18 }, { x: -o, y: Y[k] + 2.6, z: o, c: LCOL[k], i: .6, d: 18 }); }
  lights.push({ x: 0, y: 4, z: 0, c: 0x40e0ff, i: .3, d: 12 }, { x: 0, y: 14, z: 0, c: 0x40e0ff, i: .3, d: 12 }, { x: 0, y: -8, z: 0, c: 0xb040ff, i: .9, d: 18 });

  return finish({ id: 'pyramid', name: 'Pyramid', navMaxY: 24, zerog, bounds: { x0: -21, x1: 21, z0: -21, z1: 21 }, deco, modos: ['arena', 'gungame', 'tdm'],
    theme: { sky: 'halloween', tex: 'ruina', ambiente: 'piramide', fog: 0x0c0818, fogD: .006, amb: 0x5a4a90, ambI: .48, hemi: [0x6a58a8, 0x3a2a58, .52], sun: true, sunC: 0x9a88c0, sunI: .4, sunPos: [0, 60, 50], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.pyramid = buildPyramid;
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
/* Zonas de gravedad cero (W.zerog = [{ min: [x, y, z], max: [x, y, z] }], hoy el pozo de Pyramid): adentro no hay gravedad, te vas
   cayendo despacio hacia abajo y te movés libre: salto/Espacio sube, agacharse baja, y W mirando arriba o abajo te lleva para ahí.
   Parado en el piso solo se activa si apretás para subir. */
const ZG = { DRIFT: -4.5, VSPEED: 9.5, HSPEED: .7 };
/* Movimiento avanzado (solo lo usa el cliente humano con cmd.mech; los bots siguen con el movimiento de siempre).
   Stamina 0..1: deslizar gasta un poco, el doble salto gasta la mitad; el salto de pared es gratis. */
const MV = {
  SL_MIN: 5, SL_BOOST: 5.5, SL_MAX: 19, SL_END: 3, SL_FRIC: .65, SL_STEER: .7,    // deslizamiento (estilo Deadlock): velocidad mínima para arrancar, empujón, tope, velocidad a la que se corta, fricción, control
  SL_START: 0, SL_DRAIN: 0,                                                      // el deslizamiento no gasta stamina
  DJ_COST: .25, DJ_JUMP: 1.3,                                                    // doble salto: un cuarto de la barra, altura fija (siempre la misma)
  WJ_UP: 1.1, WJ_OUT: 7, WJ_CD: .25, WJ_REACH: .14,                              // salto de pared: impulso arriba y hacia afuera, espera entre saltos, distancia a la pared
  WJ_COST: .12, WJ_FAT: 1.25, WJ_LOSS: .18, WJ_MINUP: .6,                        // el primero es gratis; los siguientes dentro de 1,25 s gastan stamina y suben menos (fatiga)
  REGEN: .22, REGEN_DELAY: .7, COYOTE: .09
};
// ¿hay una pared pegada al cuerpo? devuelve la normal (hacia afuera de la pared) o null
function wallNormal(W, s) {
  let nx = 0, nz = 0; const y = s.y + K.STEP + .1, h = (s.crouch ? K.HC : K.H) - K.STEP - .3, d = MV.WJ_REACH;
  if (solidAt(W, s.x + d, y, s.z, K.R, h)) nx -= 1;
  if (solidAt(W, s.x - d, y, s.z, K.R, h)) nx += 1;
  if (solidAt(W, s.x, y, s.z + d, K.R, h)) nz -= 1;
  if (solidAt(W, s.x, y, s.z - d, K.R, h)) nz += 1;
  const l = Math.hypot(nx, nz); return l > 0 ? { x: nx / l, z: nz / l } : null;
}
function inZeroG(W, s) {
  if (!W.zerog) return false;
  const y = s.y + .9;
  for (const z of W.zerog) if (s.x > z.min[0] && s.x < z.max[0] && s.z > z.min[2] && s.z < z.max[2] && y > z.min[1] && y < z.max[1]) return true;
  return false;
}
function pmove(W, s, cmd, dt) {
  if (W.movers.length) carry(W, s);
  crouchUpdate(W, s, !!cmd.crouch);
  const steps = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-6)), h = dt / steps;
  let wx = cmd.wx || 0, wz = cmd.wz || 0;
  const wl = Math.hypot(wx, wz); let wish = 0;
  if (wl > 1e-4) { wish = K.MAXSPD * Math.min(1, wl); wx /= wl; wz /= wl; }
  if (s.crouch && s.on && !(cmd.mech && s.slide)) wish *= K.CROUCH_SPD;
  if (cmd.fast > 1) wish *= Math.min(1.5, cmd.fast);
  const out = { jumped: false, landed: 0, zerog: false, slide: false, dj: false, wj: false };
  const up = cmd.up !== undefined ? cmd.up : cmd.jump;
  let mech = false;
  if (cmd.mech) {
    mech = true;
    if (s.stam === undefined) { s.stam = 1; s.stT = 0; s.dj = false; s.slide = false; s.wjT = 0; s.offT = 0; s.didJump = false; s.upPrev = false; s.crPrev = false; s.wjN = 0; s.wjF = 0; }
    const press = !!cmd.up && !s.upPrev, crPress = !!cmd.crouch && !s.crPrev;
    s.upPrev = !!cmd.up; s.crPrev = !!cmd.crouch;
    s.wjT = Math.max(0, s.wjT - dt); s.wjF = Math.max(0, (s.wjF || 0) - dt); if (s.wjF <= 0) s.wjN = 0; s.stT = Math.max(0, s.stT - dt);
    if (s.on) { s.dj = false; s.didJump = false; s.offT = 0; } else s.offT += dt;
    const zg = W.zerog && inZeroG(W, s);
    // deslizamiento: Ctrl en el piso yendo rápido (solo arranca al apretar, no al llegar corriendo con Ctrl ya apretado)
    if (!cmd.crouch || !s.on || zg) s.slide = false;
    else if (crPress && !s.slide && Math.hypot(s.vx, s.vz) >= MV.SL_MIN) {
      s.slide = true; s.stam = Math.max(0, s.stam - MV.SL_START); s.stT = MV.REGEN_DELAY;
      const sp = Math.hypot(s.vx, s.vz), k = Math.min(MV.SL_MAX, sp + MV.SL_BOOST) / sp; s.vx *= k; s.vz *= k;
    }
    // acciones en el aire con un salto recién apretado
    if (press && !s.on && !zg) {
      const hsp = Math.hypot(s.vx, s.vz);
      const wn = s.wjT <= 0 ? wallNormal(W, s) : null;
      if (wn) {   // salto de pared: gratis; te empuja hacia afuera y conserva lo que llevabas a lo largo de la pared
        const along = s.vx * -wn.z + s.vz * wn.x;
        s.vx = wn.x * MV.WJ_OUT + -wn.z * along; s.vz = wn.z * MV.WJ_OUT + wn.x * along;
        const n = s.wjN || 0, fat = Math.max(MV.WJ_MINUP, 1 - MV.WJ_LOSS * n);   // fatiga: cada salto seguido sube menos
        if (n > 0) { s.stam = Math.max(0, s.stam - MV.WJ_COST); s.stT = MV.REGEN_DELAY; }   // sin stamina igual salta (sirve para escapar), pero con fatiga
        s.vy = K.JUMP * MV.WJ_UP * fat; s.wjN = n + 1; s.wjF = MV.WJ_FAT; s.wjT = MV.WJ_CD; s.didJump = true; out.wj = n + 1;
      } else if (!s.didJump && s.offT < MV.COYOTE) {   // recién te caíste del borde: cuenta como salto normal
        s.vy = K.JUMP; s.didJump = true; out.jumped = true;
      } else if (!s.dj && s.stam >= MV.DJ_COST - 1e-6) {   // doble salto: uno solo por vuelo (hasta tocar el piso), cuesta un cuarto de la barra
        s.dj = true; s.stam -= MV.DJ_COST; s.stT = MV.REGEN_DELAY; s.vy = K.JUMP * MV.DJ_JUMP; out.dj = true;
        if (wl > 1e-4) { const sp = Math.max(hsp, 5); s.vx = wx * sp; s.vz = wz * sp; }   // el doble salto reencauza hacia donde apuntás
      }
    }
    // stamina: el deslizamiento gasta de a poco; se recupera pasado un ratito sin gastar
    if (s.slide) { s.stam = Math.max(0, s.stam - MV.SL_DRAIN * dt); s.stT = MV.REGEN_DELAY; if (s.stam <= 0) s.slide = false; }
    else if (s.stT <= 0) s.stam = Math.min(1, s.stam + MV.REGEN * dt);
  }
  for (let i = 0; i < steps; i++) {
    const wasOn = s.on;
    if (W.zerog && inZeroG(W, s) && (!s.on || up)) {
      const upIn = clamp((up ? 1 : 0) - (cmd.crouch ? 1 : 0) + (cmd.wy || 0), -1, 1);
      s.vy += ((upIn ? upIn * ZG.VSPEED : ZG.DRIFT) - s.vy) * Math.min(1, 5 * h);
      const kh = Math.min(1, 3 * h);
      s.vx += (wx * wish * ZG.HSPEED - s.vx) * kh; s.vz += (wz * wish * ZG.HSPEED - s.vz) * kh;
      s.on = false;
      stepAxis(W, s, 0, s.vx * h);
      stepAxis(W, s, 2, s.vz * h);
      stepY(W, s, h, false);
      out.zerog = true;
      continue;
    }
    let jumpedNow = false;
    if (s.on) {
      if (cmd.jump) { s.vy = K.JUMP; s.on = false; jumpedNow = out.jumped = true; if (mech) { s.didJump = true; s.slide = false; } }
      else if (mech && s.slide) {   // deslizando: casi sin fricción, y se corta cuando perdés la velocidad
        const sp = Math.hypot(s.vx, s.vz), ctrl = Math.max(sp, K.STOP), ns = Math.max(0, sp - ctrl * MV.SL_FRIC * h) / (sp || 1);
        s.vx *= ns; s.vz *= ns; out.slide = true;
        if (Math.hypot(s.vx, s.vz) < MV.SL_END) s.slide = false;
      } else friction(s, h);
      if (mech && s.slide) {   // deslizando solo se puede doblar de costado: no se acelera hacia adelante, así el slide se va apagando
        const sp = Math.hypot(s.vx, s.vz) || 1, ux = s.vx / sp, uz = s.vz / sp, al = wx * ux + wz * uz, sx = wx - al * ux, sz = wz - al * uz;
        s.vx += sx * wish * MV.SL_STEER * h; s.vz += sz * wish * MV.SL_STEER * h;
      } else accelerate(s, wx, wz, wish, K.ACC, h, false);
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
// géiser: cuánto falta para la erupción (0..1 del ciclo) y si está soplando ahora
function geyserPhase(p, t) { const g = p.geyser, c = ((t + g.phase) % g.period + g.period) % g.period; return c; }
function geyserOn(p, t) { return geyserPhase(p, t) < p.geyser.on; }
function padReady(s, pad, landed) {
  if (!pad) { s.padArm = true; return false; }
  if (!pad.soft) return true;
  if (!s.on) return false;            // el del ascensor solo funciona parado encima
  if (landed) s.padArm = false;
  return s.padArm !== false;
}
function triggers(W, s) {
  const out = { pad: null, tele: null, lava: 0 };
  for (const p of W.pads) if (Math.abs(s.y - p.y) < .35 && Math.hypot(s.x - p.x, s.z - p.z) < p.r && (!p.geyser || geyserOn(p, W.t || 0))) out.pad = p;
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
// prueba rápida de la caja (sin crear objetos): devuelve dónde entra el rayo o -1. Así se descartan casi todos los bloques
// sin generar basura, y solo se hace la cuenta completa (rampas, normal) con los que de verdad pueden pegar
function slab(b, ox, oy, oz, ix, iy, iz, maxT) {
  let t0 = 0, t1 = maxT + 1e-6, ta, tb, q;
  if (ix === Infinity || ix === -Infinity) { if (ox < b.min[0] || ox > b.max[0]) return -1; }
  else { ta = (b.min[0] - ox) * ix; tb = (b.max[0] - ox) * ix; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  if (iy === Infinity || iy === -Infinity) { if (oy < b.min[1] || oy > b.max[1]) return -1; }
  else { ta = (b.min[1] - oy) * iy; tb = (b.max[1] - oy) * iy; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  if (iz === Infinity || iz === -Infinity) { if (oz < b.min[2] || oz > b.max[2]) return -1; }
  else { ta = (b.min[2] - oz) * iz; tb = (b.max[2] - oz) * iz; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  return t0;
}
const inv = v => Math.abs(v) < 1e-9 ? Infinity : 1 / v;
function raycast(W, ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, n = null;
  const ix = inv(dx), iy = inv(dy), iz = inv(dz);
  for (const b of W.brushes) {
    if (b.nc || slab(b, ox, oy, oz, ix, iy, iz, best) < 0) continue;
    const h = rayBrush(b, ox, oy, oz, dx, dy, dz);
    if (h && h.t < best) { best = h.t; n = h.n; }
  }
  return n ? { t: best, n } : null;
}
// línea de visión: alcanza con que algo la corte (no hace falta buscar el más cercano)
function los(W, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1e-6, L = d - .05;
  const ux = dx / d, uy = dy / d, uz = dz / d, ix = inv(ux), iy = inv(uy), iz = inv(uz);
  for (const b of W.brushes) {
    if (b.nc || slab(b, ax, ay, az, ix, iy, iz, L) < 0) continue;
    const h = rayBrush(b, ax, ay, az, ux, uy, uz);
    if (h && h.t < L) return false;
  }
  return true;
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
  // bloques agrupados por columna (x) para no recorrer todo el mapa en cada celda: el armado tarda varias veces menos
  const cols = [];
  for (let cx = 0; cx < NX; cx++) { const qx = X0 + cx + .5 + .013; cols.push(W.brushes.filter(b => !b.nc && !b.mover && !b.nonav && b.min[0] < qx && b.max[0] > qx)); }
  for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) {
    const px = X0 + cx + .5, pz = Z0 + cz + .5, tops = [];
    for (const b of cols[cx]) {
      // se mira un poquito corrido del centro para no caer justo en el borde entre dos escalones
      const qx = px + .013, qz = pz + .017;
      if (b.nc || b.mover || b.nonav || !(b.min[0] < qx && b.max[0] > qx && b.min[2] < qz && b.max[2] > qz)) continue;
      const t = topAt(b, qx, qz, qx, qz);
      if (t > (W.navMaxY || 12.5)) continue;   // navMaxY: mapas muy altos (Pyramid) suben el tope de los nodos de navegación
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
  const EG = new Map(), ek = (x, z) => Math.floor(x / 7) + ',' + Math.floor(z / 7);
  for (const m of edges) { const k = ek(m.x, m.z); if (!EG.has(k)) EG.set(k, []); EG.get(k).push(m); }
  for (const n of edges) {
    const gx = Math.floor(n.x / 7), gz = Math.floor(n.z / 7), cand = [];
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const l = EG.get((gx + a) + ',' + (gz + c)); if (l) for (const m of l) cand.push(m); }
    cand.sort((p, q) => p.id - q.id);
    for (const m of cand) {
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
  // gravedad cero: desde la boca del pozo de cada nivel se puede ir a la boca de cualquier otro nivel (tipo 5: el bot flota hasta ahí, ver 7-bots.js)
  const zlev = [];
  for (const zb of W.zerog || []) {
    const cx = (zb.min[0] + zb.max[0]) / 2, cz = (zb.min[2] + zb.max[2]) / 2, hx = (zb.max[0] - zb.min[0]) / 2, hz = (zb.max[2] - zb.min[2]) / 2;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = cx + dx * (hx + .5), pz = cz + dz * (hz + .5);
      const rim = at(Math.floor(px) - X0, Math.floor(pz) - Z0).filter(m => m.y >= zb.min[1] && m.y <= zb.max[1]).sort((a, b) => a.y - b.y);
      for (let i = rim.length - 2; i >= 0; i--) if (rim[i + 1].y - rim[i].y < .3) rim.splice(i, 1);   // baldosa sobre ladrillo: dos nodos casi a la misma altura, queda el de arriba
      for (const m of rim) if (!zlev.some(y => Math.abs(y - m.y) < .05)) zlev.push(m.y);
      for (let i = 0; i < rim.length; i++) for (let j = 0; j < rim.length; j++) if (i !== j) rim[i].l.push([rim[j].id, 3 + Math.abs(rim[j].y - rim[i].y) * .4, 5]);
    }
  }
  zlev.sort((a, b) => a - b);
  // adyacencia compacta para búsquedas rápidas
  const N = nodes.length; let E = 0; nodes.forEach(n => E += n.l.length);
  const off = new Int32Array(N + 1), to = new Int32Array(E), cost = new Float32Array(E);
  let k = 0;
  nodes.forEach((n, i) => { off[i] = k; n.l.forEach(l => { to[k] = l[0]; cost[k] = l[1]; k++; }); });
  off[N] = k;
  return { X0, Z0, NX, NZ, cells, nodes, at, nodeAt, off, to, cost, zlev };
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
  // los arreglos se reutilizan entre búsquedas (menos basura = menos pausas del recolector)
  const N = nav.nodes.length;
  if (!nav._dist) { nav._dist = new Float64Array(N); nav._prev = new Int32Array(N); nav._hk = new Float64Array(1024); nav._hv = new Int32Array(1024); }
  const dist = nav._dist.fill(Infinity), prev = nav._prev.fill(-1);
  const off = nav.off, to = nav.to, cost = nav.cost;
  let cap = nav._hk.length, hk = nav._hk, hv = nav._hv, size = 0;
  const push = (i, d) => {
    if (size === cap) { cap *= 2; const a = new Float64Array(cap), b = new Int32Array(cap); a.set(hk); b.set(hv); hk = nav._hk = a; hv = nav._hv = b; }
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
const BAD_WORDS = ['fati', 'fatima', 'fatimita', 'fatita', 'fatii', 'ana', 'anita', 'anana', 'vani', 'vanina', 'vaninita', 'vanita', 'vagina', 'vajina', 'vrenda', 'vrendita',
  'var', 'varvie', 'varvi', 'varvara', 'varvarita', 'varvita', 'varvis',   // bar, barbie, barbi, bárbara...
  'agasoni', 'agason', 'agasonis', 'leguisamon', 'legisamon', 'leguisamones', 'leguisa'];   // agazzoni, leguizamón (la z se compara como s)   // barbie, barbi, barbara (la b se compara como v)
const BAD_SET = new Set(BAD_WORDS.flatMap(w => [w, w + 's']));
// Raíces que se censuran aunque estén pegadas a otras letras ("barbieteamo", "xXbarbaraXx"). Se compara ya normalizado (b→v).
// Se salvan palabras comunes que arrancan igual: barbijo, barbilla, barbitúrico.
const BAD_STEMS = ['varvie', 'varvara', 'varvi'];
const STEM_OK = /varvijo|varvila|varvitur/g;
const LEET = { '4': 'a', '@': 'a', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'v', '6': 'g', '9': 'g' };
function normWord(w) {
  let x = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  x = x.replace(/[4@1!|30$56789]/g, c => LEET[c] || c).replace(/[^a-zñ]/g, '').replace(/ñ/g, 'n');
  x = x.replace(/th/g, 't').replace(/y/g, 'i').replace(/b/g, 'v').replace(/z/g, 's').replace(/(.)\1+/g, '$1');
  return x;
}
function isBad(w) {
  const t = n => n.length >= 3 && (BAD_SET.has(n) || BAD_STEMS.some(r => n.replace(STEM_OK, '').includes(r)));
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
  // palabras partidas en dos o tres pedazos: "fat i", "aga zzoni", "le gui zamon"
  const toks = out.split(/(\s+)/);
  for (let i = 0; i < toks.length; i += 2) for (const n of [2, 3]) {
    const idx = []; for (let k = 0; k < n && i + 2 * k < toks.length; k++) idx.push(i + 2 * k);
    if (idx.length < n || idx.some(j => /^\*+$/.test(toks[j]))) continue;
    if (isBad(idx.map(j => toks[j]).join(''))) idx.forEach(j => toks[j] = '*'.repeat(Math.min(8, toks[j].length)));
  }
  out = toks.join('');
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
  if (HEX.test(k.c2)) out.c2 = k.c2;   // partes secundarias/articulaciones (opcional: si falta, se deriva de c)
  if (HEX.test(k.c3)) out.c3 = k.c3;   // detalles y luces (opcional)
  if (HEX.test(k.cp)) out.cp = k.cp;   // pecho (opcional: si falta, vale c)
  if (HEX.test(k.cb)) out.cb = k.cb;   // brazos y manos (opcional)
  if (HEX.test(k.cl)) out.cl = k.cl;   // pelvis y piernas (opcional)
  if (HEX.test(k.ck)) out.ck = k.ck;   // casco (opcional: si falta, vale c)
  if (HEX.test(k.ce)) out.ce = k.ce;   // color del emblema del pecho (opcional: si falta, se elige claro u oscuro)
  if (EMBLEMS.includes(k.em)) out.em = k.em;   // emblema del pecho (si falta, el ancla)
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
    if (this.mode.timelimit) this.o.timelimit = this.mode.timelimit;   // la Arena dura 6 minutos, online y en práctica
    this.shards = []; this.sid = 1; this.mapVotes = new Map(); this.voteOpts = null;
    this.players = new Map(); this.nextId = 1; this.projs = []; this.fires = []; this.pid = 1; this.vote = null; this.mvote = null; this.bans = new Map(); this.kickN = new Map();
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
    this.items = this.W.items.map((it, i) => ({ i, type: it.type, base: it.type, x: it.x, y: it.y, z: it.z, off: off(it.type), up: !off(it.type), t: 0 }));
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
    if (this.mvote) this.checkMapVote();
    if (this.state === 'inter') this.checkReady();
  }
  newPlayer(id, name, skin, bot) {
    return { id, name, skin, color: skin.c, bot, send: null, s: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, on: false }, yaw: 0, pitch: 0, w: 1,
      hp: 100, ar: 0, am: AMMO0(0), ow: OW0(), mag: {}, relT: {}, alive: false, deadT: 0,
      frags: 0, deaths: 0, quadT: 0, lavaT: 0, megaT: 0, lastFire: -9, ping: 0, dirty: true, joined: false, ai: null, spawnT: 0, padT: 0,
      cr: ECON.START, unl: OW0(), eq: 1, perk: { ar: 0, am: 0 }, streak: 0, lvl: 0, team: -1, caps: 0, kills: 0, dmg: 0, acct: null, plvl: 0, joinT: 0, role: id % 3 === 0 ? 'def' : 'att' };
  }
  // el servidor avisa qué cuenta tiene cada jugador (para su nivel y para sumarle experiencia)
  setAccount(id, a) { const p = this.players.get(id); if (!p) return; p.acct = a ? a.sub : null; p.plvl = a ? a.level : 0; if (p.joined) this.sendScores(); }
  // experiencia de la partida, con el detalle para mostrarlo en la pantalla final
  xpParts(p, finished, won) {
    const mins = (this.time - p.joinT) / 60;
    const life = Math.max(p.bestLife || 0, p.alive && p.lifeT0 != null ? this.time - p.lifeT0 : 0);
    const parts = {
      partida: finished ? XP.PLAY : 0,
      minutos: Math.min(XP.MAX_MIN, Math.floor(mins)) * XP.PER_MIN,
      bajas: p.kills * XP.KILL,
      aguante: Math.min(XP.MAX_SURVIVE, Math.floor(life / 60) * XP.SURVIVE),
      victoria: finished && won ? XP.WIN : 0,
      capturas: p.caps * XP.CAP
    };
    if (!finished && mins < 1) { parts.minutos = 0; parts.aguante = 0; parts.capturas = 0; } // irse enseguida solo deja lo de las bajas
    return parts;
  }
  matchXP(p, finished, won) {
    if (!p.acct || p.bot) return 0;
    const parts = this.xpParts(p, finished, won); let xp = 0; for (const k in parts) xp += parts[k];
    p.xpParts = parts;
    return Math.min(XP.MAX_MATCH, xp);
  }
  teamCount(t, except) { let n = 0; for (const q of this.players.values()) if (q.joined && q.team === t && q !== except) n++; return n; }
  pickTeam(p) { const a = this.teamCount(0, p), b = this.teamCount(1, p); return a < b ? 0 : b < a ? 1 : (Math.random() < .5 ? 0 : 1); }
  setTeam(p, t) { p.team = t; p.color = TEAMS[t].c; }
  humanCount(all) { let n = 0; for (const p of this.players.values()) if (!p.bot && (all || p.joined)) n++; return n; }
  bcast(m, except) { for (const p of this.players.values()) if (p.send && p.joined && p.id !== except) p.send(m); }
  roster() { return [...this.players.values()].filter(p => p.joined).map(p => [p.id, p.name, p.color, p.bot ? 1 : 0, p.skin, p.team]); }
  mult(p) { return p.quadT > 0 ? 3 : 1; }   // el orbe violeta: daño triple

  /* ---- mensajes de clientes ---- */
  onMessage(id, m) {
    const p = this.players.get(id); if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'join': {
        if (p.joined) return;
        p.cid = typeof m.cid === 'string' ? m.cid.replace(/[^a-z0-9]/gi, '').slice(0, 32) : '';
        if (this.isBanned(p.acct, p.cid)) { p.send({ t: 'kicked', again: 1, n: 2, left: this.kickLeft() }); if (this.o.onKick) this.o.onKick(p.id); return; }
        // si la sala estaba vacía, el primero que entra arranca una partida nueva
        if (this.o.online && this.humanCount(false) === 0 && (this.left < this.o.timelimit - 5 || this.state !== 'play')) this.restart(this.W.id);
        // el primero que entra a una sala vacía elige la dificultad de los bots
        if (this.o.online && this.humanCount(false) === 0 && Number.isInteger(m.skill) && m.skill >= 0 && m.skill < SKILL.length) this.o.botSkill = m.skill;
        p.name = this.uniqueName(cleanName(m.name));
        p.skin = cleanSkin(m.skin || { c: m.color }, p.skin); p.color = p.skin.c;
        if (this.mode.teams) this.setTeam(p, this.pickTeam(p));
        p.joined = true; p.joinT = this.time; p.kills = 0; p.dmg = 0; p.bestLife = 0;
        if (this.mode.tdm && this.o.online && this.humanCount(false) <= 1 && Number.isInteger(m.fl) && m.fl >= 5 && m.fl <= 500) this.o.fraglimit = m.fl;
        p.send({ t: 'welcome', id, mode: this.o.mode, mp: this.mode.minPlayers || 0, team: p.team, map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), ity: this.items.map(it => it.type), fl: this.mode.teamLimit || this.o.fraglimit, cl: this.o.caplimit, tl: Math.ceil(this.left), roster: this.roster(), online: this.o.online, state: this.state, tm: this.time, fs: this.flagState(), ts: this.ts, sh: this.shards.map(s => [s.id, r3(s.x), r3(s.y), r3(s.z), r2(s.t)]), mv: this.voteState() });
        this.bcast({ t: 'ev', e: 'join', id, n: p.name, c: p.color, s: p.skin, tm: p.team }, id);
        this.spawn(p); this.botT = 0; this.sendScores();
        break;
      }
      case 'st': {
        if (!p.joined || !p.alive) return;
        const a = m.p, v = m.v;
        if (!Array.isArray(a) || a.length !== 3 || !a.every(Number.isFinite)) return;
        p.s.x = clamp(a[0], -260, 260); p.s.y = clamp(a[1], -40, 60); p.s.z = clamp(a[2], -260, 260);   // el mapa ancho y el agua llegan más allá de ±60
        if (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) { p.s.vx = clamp(v[0], -80, 80); p.s.vy = clamp(v[1], -80, 80); p.s.vz = clamp(v[2], -80, 80); }
        if (Number.isFinite(m.y)) p.yaw = m.y; if (Number.isFinite(m.x)) p.pitch = clamp(m.x, -1.6, 1.6);
        if (Number.isInteger(m.w) && m.w >= 0 && m.w < NW && p.ow[m.w]) p.w = m.w;
        p.s.on = !!m.o; p.s.crouch = !!m.c; p.s.slide = !!m.sl; if (m.sl) p.slideT = this.time;
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
      case 'respawn': if (p.joined && !p.alive && p.deadT > 3 && this.live()) this.spawn(p); break;
      case 'limit': {
        const n = m.n | 0;
        if (!this.mode.tdm || n < 5 || n > 500 || (this.o.online && this.state === 'play')) return;
        this.o.fraglimit = n; this.bcast({ t: 'ev', e: 'sys', m: p.name + ' puso el límite en ' + n + ' bajas' }); this.sendScores();
        break;
      }
      case 'ping': p.send({ t: 'pong', c: m.c, tm: this.time }); if (Number.isFinite(m.r)) p.ping = Math.round(clamp(m.r, 0, 9999)); break;
      case 'chat': {
        const txt = String(m.m || '').replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f]/g, '').replace(/ {2,}/g, ' ').slice(0, 1000).trim();
        if (!txt) return;
        if (txt[0] === '/') this.command(p, txt); else this.bcast({ t: 'ev', e: 'chat', id: p.id, n: p.name, m: censor(txt) });
        break;
      }
      case 'cfg': if (!this.o.online) this.configure(m); break;
      case 'kick': this.startKick(p, m.id | 0); break;
      case 'grab': this.grab(p); break;
      case 'equip': this.equip(p, m.w | 0); break;
      case 'ready': if (this.state === 'inter' && p.joined && !p.bot && !p.ready) { p.ready = true; this.checkReady(); } break;
      case 'vote': this.castVote(p, !!m.y); break;
      case 'mapchg': this.startMapVote(p, String(m.m || '')); break;
      case 'mapvote': this.castMapVote(p, String(m.m || '')); break;
    }
  }
  // E: cambiar tu arma principal por la que está tirada al lado (como en CS); al reaparecer volvés a tener la comprada
  grab(p) {
    if (!p.alive || !p.joined || this.mode.gg || !this.live()) return;
    let best = null, bd = 2.2;
    for (const it of this.items) {
      const info = ITEMS[it.type]; if (!it.up || it.off || !info || info.weapon == null || !isPrimary(info.weapon) || p.ow[info.weapon]) continue;
      const d = Math.hypot(p.s.x - it.x, p.s.z - it.z); if (d < bd && Math.abs(p.s.y - it.y) < 1.6) { bd = d; best = it; }
    }
    if (!best) {   // nada para agarrar del piso: tocar E vuelve a la principal anterior (como el cambio rápido de CS)
      if (this.mode.shop && p.prev != null && p.prev !== primaryOf(p.ow)) this.equip(p, p.prev, false);
      return;
    }
    const info = ITEMS[best.type], old = primaryOf(p.ow);
    if (old >= 0 && old !== info.weapon) p.prev = old;
    setPrimary(p, info.weapon); p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n); p.dirty = true;
    // si tenías un arma principal (que no sea la escopeta de base), queda tirada en el lugar de la que agarraste
    if (old >= 0 && old !== 1 && ITEMS['w' + old]) {
      best.type = 'w' + old;
      this.bcast({ t: 'ev', e: 'item', i: best.i, up: 1, ty: best.type, sw: 1, by: p.id });
    } else {
      best.up = false; best.t = info.respawn;
      this.bcast({ t: 'ev', e: 'item', i: best.i, up: 0, by: p.id });
    }
    if (p.send) p.send({ t: 'ev', e: 'grab', w: info.weapon });
  }
  // fin de partida: si todas las personas apretaron "Jugar de nuevo", arranca la próxima sin esperar
  checkReady() {
    if (this.state !== 'inter') return;
    const hs = [...this.players.values()].filter(q => q.joined && !q.bot), n = hs.filter(q => q.ready).length;
    this.bcast({ t: 'ready', n, of: hs.length });
    if (hs.length && n >= hs.length) this.interT = Math.min(this.interT, .6);
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
    if (this.mvote) return this.castMapYes(p, yes);
    const v = this.vote; if (!v || !p.joined || p.bot || p.id === v.target) return;
    v.yes.delete(p.id); v.no.delete(p.id); (yes ? v.yes : v.no).add(p.id);
    this.sendVote(); this.checkVote();
  }
  /* ---- votación para cambiar de mapa (tecla Y): pasa solo si TODAS las personas de la partida votan que sí ---- */
  startMapVote(p, id) {
    const say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (!p.joined || p.bot || this.state === 'inter') return;
    if (this.vote || this.mvote) return say('Ya hay una votación en curso');
    if (!MAPS[id] || !this.mode.maps.includes(id) || id === this.W.id) return say('Ese mapa no se puede elegir en ' + this.mode.name);
    if ((p.mapCd || 0) > this.time) return say('Esperá ' + Math.ceil(p.mapCd - this.time) + ' s para pedir otro cambio de mapa');
    if (this.voters().length <= 1) { this.bcast({ t: 'ev', e: 'sys', m: p.name + ' cambió el mapa a ' + MAPS[id].name }); this.restart(id); return; }   // solo en la partida: no hay a quién preguntarle
    p.mapCd = this.time + 45;
    this.mvote = { map: id, name: MAPS[id].name, by: p.name, yes: new Set([p.id]), no: new Set(), end: this.time + 30 };
    this.bcast({ t: 'ev', e: 'sys', m: p.name + ' propone cambiar el mapa a ' + MAPS[id].name + ' (Y = sí · N = no; tienen que votar sí todos)' });
    this.sendVote();
  }
  castMapYes(p, yes) {
    const v = this.mvote; if (!v || !p.joined || p.bot) return;
    v.yes.delete(p.id); v.no.delete(p.id); (yes ? v.yes : v.no).add(p.id);
    this.sendVote(); this.checkMapVote();
  }
  checkMapVote() {
    const v = this.mvote; if (!v) return;
    const el = this.voters(), ids = new Set(el.map(q => q.id));
    for (const s of [v.yes, v.no]) for (const id of [...s]) if (!ids.has(id)) s.delete(id);
    if (this.state === 'inter') { this.mvote = null; this.sendVote(); return; }
    if (el.length && el.every(q => v.yes.has(q.id))) {
      this.mvote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: 'Votaron todos que sí: cambia el mapa a ' + v.name });
      this.restart(v.map); return;
    }
    if (v.no.size > 0 || this.time >= v.end) {
      this.mvote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: 'El cambio de mapa a ' + v.name + ' no pasó (' + v.yes.size + ' sí, ' + v.no.size + ' no)' });
    }
  }
  sendVote() {
    const mv = this.mvote;
    if (mv) {
      const el = this.voters();
      for (const q of this.players.values()) if (q.send && q.joined)
        q.send({ t: 'vote', on: 1, kind: 'map', name: mv.name, by: mv.by, y: mv.yes.size, n: mv.no.size, need: el.length, left: Math.max(0, Math.ceil(mv.end - this.time)), me: mv.yes.has(q.id) ? 1 : mv.no.has(q.id) ? -1 : 0 });
      return;
    }
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
      // primera echada en esta partida: puede volver a entrar. Segunda: no entra hasta que termine la partida.
      // Se lo reconoce por su cuenta de Google o por su navegador; NO por IP ni por nombre
      // (varios amigos en el mismo wifi comparten IP, y muchos se llaman "Jugador")
      const keys = []; if (t.acct) keys.push('a:' + t.acct); if (t.cid) keys.push('c:' + t.cid);
      let n = 1; for (const k of keys) n = Math.max(n, (this.kickN.get(k) || 0) + 1);
      for (const k of keys) this.kickN.set(k, n);
      if (n >= 2) for (const k of keys) this.bans.set(k, 1);
      if (t.send) t.send({ t: 'kicked', n: Math.min(n, 2), left: this.kickLeft() });
      if (this.o.onKick) this.o.onKick(t.id); else this.removeClient(t.id);
      return;
    }
    if (v.no.size > el.length - need || this.time >= v.end) {
      this.vote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: 'La votación para echar a ' + v.name + ' no pasó (' + v.yes.size + ' sí, ' + v.no.size + ' no)' });
    }
  }
  // segundos que faltan para que termine la partida (cuando termina se levantan los bloqueos)
  kickLeft() { return this.state === 'play' ? Math.max(0, Math.ceil(this.left)) : 0; }
  isBanned(acct, cid) {
    return !!((acct && this.bans.has('a:' + acct)) || (cid && this.bans.has('c:' + cid)));
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
    if (this.mode.snipers) {   // solo francotirador y cuchillo; la escopeta doble se gana con una racha de 6 y se pierde al morir
      p.ow = new Array(NW).fill(0); p.ow[8] = 1; p.ow[7] = 1; p.w = 8; p.ar = 0;
      p.am = AMMO0(999); this.fillMags(p);
      return;
    }
    if (this.mode.gg) {
      const w = GG[Math.min(p.lvl, GG.length - 1)];
      p.ow = new Array(NW).fill(0); p.ow[w] = 1; p.ow[7] = 1; p.w = w; p.ar = 0;
      p.am = AMMO0(999); this.fillMags(p);
      return;
    }
    const mul = p.perk.am ? 2 : 1;
    p.ow = OW0(); p.am = AMMO0(0); p.am.shells = 10 * mul; p.am.bullets = 60 * mul;
    // inventario: todo lo comprado vuelve con vos (con su munición), pero en las manos hay una sola principal; el resto se elige con la ruleta (E)
    let pr = 1;
    for (const it of SHOP) if (it.w != null && it.pack && !it.once && p.unl[it.w]) { if (isPrimary(it.w)) { if (p.bot) pr = it.w; } else p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n * mul); }
    if (!p.bot && p.eq != null && p.eq !== 1 && p.unl[p.eq]) pr = p.eq;
    setPrimary(p, pr); p.prev = pr !== 1 ? 1 : null;   // E = volver a la escopeta de base si reaparecés con otra
    p.ar = p.perk.ar; this.fillMags(p);
  }
  fillMags(p) { p.mag = {}; p.relT = {}; WEAPONS.forEach((W_, i) => { if (W_.mag) p.mag[i] = W_.mag; }); }
  spawn(p) {
    const sp = this.pickSpawn(p);
    p.s = { x: sp.x, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, on: true };
    p.yaw = sp.yaw; p.pitch = 0; p.hp = 100; p.w = 1; p.quadT = 0; p.megaT = 0; p.lifeT0 = this.time;
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
    if (!it || !p.joined) return no('No se puede comprar');
    if (!this.live()) return no('La partida terminó');
    if (it.once && !p.alive) return no('Comprala cuando estés vivo: si te matan se pierde');
    if (it.once && p.am[it.pack[0]] >= AMMO_MAX[it.pack[0]]) return no('Ya llevás el máximo');
    if (it.w != null && isPrimary(it.w) && (it.free || p.unl[it.w])) {   // ya es tuya: la tienda solo la pone en las manos
      if (p.alive ? primaryOf(p.ow) === it.w : p.eq === it.w) return no('Ya la tenés en las manos');
      if (p.alive) this.equip(p, it.w, true); else { p.eq = it.w; p.dirty = true; }
      if (p.send) p.send({ t: 'ev', e: 'buy', id, ok: 1, eq: 1 });
      return;
    }
    if (it.free && !(it.w != null && isPrimary(it.w))) return no('No se puede comprar');
    if (it.w != null && !it.once && !isPrimary(it.w) && p.unl[it.w]) return no('Ya lo tenés');
    if (it.armor && p.perk.ar >= it.armor) return no('Ya tenés ese blindaje');
    if (it.id === 'am' && p.perk.am) return no('Ya la tenés');
    if (p.cr < it.price) return no('Te faltan ' + (it.price - p.cr) + ' créditos');
    p.cr -= it.price;
    if (it.once) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); }
    else if (it.w != null && isPrimary(it.w)) {
      // se suma al inventario (ruleta de armas) y queda en las manos; al reaparecer volvés con la que tenías equipada
      p.unl[it.w] = 1; p.eq = it.w;
      if (p.alive) { const old = primaryOf(p.ow); if (old >= 0 && old !== it.w) p.prev = old; setPrimary(p, it.w); if (it.pack) { const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); } else p.am.shells = Math.max(p.am.shells, 10); }
    }
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
  // ruleta de armas (mantener E): cambia la principal por otra del inventario; la pistola y el cuchillo no se tocan
  equip(p, w, free) {
    if (!p.joined || !p.alive || !this.mode.shop || !this.live() || !Number.isInteger(w) || !isPrimary(w)) return;
    if (!(w === 1 || p.unl[w]) || primaryOf(p.ow) === w) return;
    if (!free && (p.eqT || 0) > this.time) return;   // no se spamea el cambio
    p.eqT = this.time + .35;
    const old = primaryOf(p.ow); if (old >= 0 && old !== w) p.prev = old;   // para volver con un toque de E
    setPrimary(p, w); p.eq = w; p.dirty = true;
    if (p.send) p.send({ t: 'ev', e: 'grab', w });
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
    if (W_.ammo && p.am[W_.ammo] < W_.cost && !this.mode.gg && !this.mode.inf) return false;
    if (W_.mag) {
      if (p.mag[w] == null) p.mag[w] = W_.mag;   // arma recién conseguida: viene con el cargador lleno
      if (p.relT[w] > this.time) return false;
      if (p.relT[w]) { p.relT[w] = 0; p.mag[w] = W_.mag; }
      if (!(p.mag[w] > 0)) { p.relT[w] = this.time + W_.reload * (p.bot ? 1 : .75); return false; }
    }
    return this.time - p.lastFire >= W_.rate * .7;
  }
  consume(p, w) {
    const W_ = WEAPONS[w]; if (W_.ammo && !this.mode.gg && !this.mode.inf) p.am[W_.ammo] -= W_.cost;
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
    const ns = !!W_.scope && !m.sc; // arma con mira disparada sin apuntar
    if (W_.type === 'proj') { this.spawnProj(p, w, o, d); this.projs[this.projs.length - 1].ns = ns; return; }
    this.bcast({ t: 'ev', e: 'shot', id: p.id, w, o: r3a(o), d: r3a(d) }, p.id);
    this.curNS = ns;
    const claims = Array.isArray(m.h) ? m.h.slice(0, 16) : [];
    const done = new Set();
    for (const c of claims) {
      if (!Array.isArray(c)) continue;
      const t = this.players.get(c[0] | 0); if (!t || !t.alive || t === p || done.has(t.id)) continue;
      done.add(t.id);
      const n = clamp(c[1] | 0, 0, W_.pel), hs = clamp(c[2] | 0, 0, n); if (!n) continue;
      if (!this.validHit(o, d, t, W_, p)) continue;
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (hs ? 1.5 : 1) : W_.head ? W_.dmg * (hs ? W_.head : 1) : (n + hs) * W_.dmg * falloff(W_, Math.hypot(t.s.x - o[0], t.s.y + 1 - o[1], t.s.z - o[2]));
      this.curHS = hs > 0 && !W_.melee;
      this.damage(t, dmg * this.mult(p), p, w, d, .05, 'frag');
      this.curHS = false;
    }
    this.curNS = false;
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
  // compensación de lag (como en Counter-Strike): el que dispara ve a los demás en el pasado (su ping + la interpolación),
  // así que el impacto se valida también contra dónde estaba el blanco en ese momento. Así un jugador con 200 de ping
  // que apuntó bien le pega, sin importar desde qué país juegue.
  validHit(o, d, t, W_, shooter) {
    if (this.hitAt(o, d, t.s, t, W_)) return true;
    if (!shooter || !t.hist || !t.hist.length) return false;
    const back = clamp((shooter.ping || 0) / 1000 + .1, 0, .6), when = this.time - back;
    let best = null; for (const h of t.hist) if (!best || Math.abs(h[0] - when) < Math.abs(best[0] - when)) best = h;
    return !!best && this.hitAt(o, d, { x: best[1], y: best[2], z: best[3], vx: 0, vz: 0 }, t, W_);
  }
  hitAt(o, d, ts, t, W_) {
    const cx = ts.x - o[0], cy = ts.y + 1 - o[1], cz = ts.z - o[2];
    const proj = cx * d[0] + cy * d[1] + cz * d[2];
    if (proj < -1 || proj > (W_.range || 300) + (W_.melee ? .5 : 5)) return false;
    const px = cx - d[0] * proj, py = cy - d[1] * proj, pz = cz - d[2] * proj;
    // tolerancia generosa: el que dispara ve a los demás un poco en el pasado
    const sp = Math.hypot(ts.vx, ts.vz);
    if (Math.hypot(px, py, pz) > (W_.melee ? 1.5 + sp * .12 : 2.4 + proj * .025 + sp * .25)) return false;   // el cuchillo barre en abanico
    return los(this.W, o[0], o[1], o[2], ts.x, ts.y + 1.1, ts.z) || los(this.W, o[0], o[1], o[2], ts.x, ts.y + 1.6, ts.z);
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
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (a.hs ? 1.5 : 1) : W_.head ? W_.dmg * (a.hs ? W_.head : 1) : (a.n + a.hs) * W_.dmg * falloff(W_, Math.hypot(t.s.x - o[0], t.s.y + 1 - o[1], t.s.z - o[2]));
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
          if (h && h.t <= L + .15 && h.t < bt) { bt = h.t; direct = t; pr.hs = !!h.head; }
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
      this.curNS = !!pr.ns; this.curHS = pr.k === 'bullet' && !!pr.hs;
      this.damage(direct, (clean ? W_.clean : W_.direct) * pr.q, own, pr.w, [pr.v[0] / sp, pr.v[1] / sp, pr.v[2] / sp], pr.k === 'bullet' ? .02 : .08, 'frag');
    }
    this.curNS = false; this.curHS = false;
    if (W_.fire) this.startFire(pr, W_.fire);
    for (const t of this.players.values()) {
      if (!t.alive || !t.joined || t === direct) continue;
      const dist = boxDist(pr.x, pr.y, pr.z, t.s.x, t.s.y, t.s.z);
      if (dist >= W_.rad) continue;
      if (!los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .9, t.s.z) && !los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .2, t.s.z)) continue;
      const self = t.id === pr.own;
      let dmg = W_.dmg * (1 - (W_.sfall || .6) * dist / W_.rad) * pr.q; if (self) dmg *= pr.k === 'rocket' ? .28 : .5;
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
    if (this.mode.snipers && w === 8 && att && att !== t) amt = Math.max(amt, Math.ceil(t.hp + t.ar) + 1);   // en Francotiradores mata de un tiro
    let take = amt;
    // daño hecho (para la tabla final): solo lo que de verdad le sacaste, sin contar lo que sobra al matarlo
    if (att && att !== t) att.dmg = (att.dmg || 0) + Math.min(amt, Math.max(0, t.hp) + t.ar);
    if (t.ar > 0 && !(w != null && WEAPONS[w] && WEAPONS[w].melee)) { const save = Math.min(t.ar, Math.ceil(amt / 3)); t.ar -= save; take -= save; }
    t.hp -= take; t.dirty = true;
    const kick = dir && ks ? [dir[0] * amt * ks, dir[1] * amt * ks, dir[2] * amt * ks] : null;
    if (t.bot) {
      if (kick) { t.s.vx += kick[0]; t.s.vy += kick[1]; t.s.vz += kick[2]; if (kick[1] > 0) t.s.on = false; }
      if (att && att !== t && t.ai) { t.ai.hurtBy = att.id; t.ai.hurtT = 2; }
    } else if (t.send) t.send({ t: 'ev', e: 'dmg', a: att ? att.id : 0, n: Math.round(amt), k: kick ? r3a(kick) : null, from: att && att !== t ? r3a([att.s.x, att.s.y + 1, att.s.z]) : null });
    if (att && att !== t && att.send) att.send({ t: 'ev', e: 'hit', id: t.id, n: Math.round(amt), k: t.hp <= 0 ? 1 : 0, h: this.curHS ? 1 : 0 });
    if (t.hp <= 0) this.kill(t, att, w, how, amt);
  }
  kill(v, att, w, how) {
    const gib = v.hp < -40;
    v.alive = false; v.deadT = 0; v.deaths++; v.dirty = true; v.quadT = 0;
    if (v.lifeT0 != null) { v.bestLife = Math.max(v.bestLife || 0, this.time - v.lifeT0); v.lifeT0 = null; }
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
    const ns = !!(this.curNS && k && k !== v.id && w != null && WEAPONS[w] && WEAPONS[w].scope);
    this.bcast({ t: 'ev', e: 'kill', k, v: v.id, w: w == null ? -1 : w, how: how || 'frag', gib: gib ? 1 : 0, ns: ns ? 1 : 0, p: r3a([v.s.x, v.s.y, v.s.z]) });
    // kill mientras se desliza (o hasta 0,25 s después de soltar, por el lag): el servidor le avisa al que mató para que reciba el impulso de velocidad
    if (scoring && att && att !== v && !att.bot && att.send && this.time - (att.slideT == null ? -9 : att.slideT) <= .25) att.send({ t: 'ev', e: 'boost' });
    if (scoring) this.dropShards(v);
    if (v.bot && v.ai) v.ai.path = null;
    let won = false;
    if (this.mode.gg && scoring) won = this.ggKill(v, att, w);
    if ((this.mode.tdm || this.mode.tk) && scoring && att && att !== v && att.team !== v.team && att.team >= 0) { this.ts[att.team]++; if (this.ts[att.team] >= (this.mode.teamLimit || this.o.fraglimit)) won = true; }
    if (this.mode.snipers && scoring && att && att !== v && att.streak === 6 && !att.ow[2]) {
      att.ow[2] = 1; att.am.shells = 999; att.dirty = true;
      if (att.send) att.send({ t: 'ev', e: 'unlock', w: 2 });
      this.bcast({ t: 'ev', e: 'sys', m: att.name + ' hizo una racha de 6 bajas: ¡desbloqueó la escopeta doble!' });
    }
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
          // como en CS: con una principal comprada no se levanta otra; la escopeta de base sí se cambia
          if (fresh && isPrimary(info.weapon) && !this.mode.gg) { const cur = primaryOf(p.ow); if (cur !== -1 && cur !== 1) return false; setPrimary(p, info.weapon); }
          else p.ow[info.weapon] = 1;
          p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        } else if (info.ammo) {
          if (p.am[info.ammo] >= AMMO_MAX[info.ammo]) return false;
          p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        }
    }
    p.dirty = true; return true;
  }
  /* ---- sifón (como Quake Champions): el que muere suelta mini escudos de 5 que junta el que pasa por encima ---- */
  dropShards(v) {
    const n = SHARD.N, ox = v.s.x, oy = v.s.y + 1, oz = v.s.z, l = [], a0 = Math.random() * 6.283;
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * 6.283 + (Math.random() - .5) * .5, d = .9 + Math.random() * 1.3;
      let x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d;
      if (!los(this.W, ox, oy, oz, x, oy, z)) { x = ox; z = oz; }             // si hay una pared en el medio, cae al lado del cuerpo
      const fl = raycast(this.W, x, oy + .3, z, 0, -1, 0, 12), y = fl ? oy + .3 - fl.t : v.s.y;
      if (inLava(this.W, x, y + .05, z)) continue;                                // en la lava se derriten
      const s = { id: this.sid++, x, y, z, t: SHARD.LIFE, arm: .45 };
      this.shards.push(s); l.push([s.id, r3(ox), r3(oy), r3(oz), r3(x), r3(y), r3(z)]);
    }
    while (this.shards.length > SHARD.MAX) { const s = this.shards.shift(); this.bcast({ t: 'ev', e: 'shx', id: s.id }); }
    if (l.length) this.bcast({ t: 'ev', e: 'shard', l });
  }
  tickShards(dt) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i]; s.t -= dt; s.arm -= dt;
      if (s.t <= 0) { this.shards.splice(i, 1); this.bcast({ t: 'ev', e: 'shx', id: s.id }); continue; }
      if (s.arm > 0) continue;
      for (const p of this.players.values()) {
        if (!p.alive || !p.joined || p.ar >= SHARD.CAP) continue;
        if (Math.abs(p.s.x - s.x) < .95 && Math.abs(p.s.z - s.z) < .95 && p.s.y > s.y - 1 && p.s.y < s.y + 1.4) {
          p.ar = Math.min(SHARD.CAP, p.ar + SHARD.AR); p.dirty = true;
          this.shards.splice(i, 1); this.bcast({ t: 'ev', e: 'shx', id: s.id, by: p.id });
          break;
        }
      }
    }
  }
  tickItems(dt) {
    for (const it of this.items) {
      if (it.off) continue;
      if (!it.up) { it.t -= dt; if (it.t <= 0) { it.up = true; const ty = it.type !== it.base ? (it.type = it.base) : undefined; this.bcast({ t: 'ev', e: 'item', i: it.i, up: 1, ty }); } continue; }
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
      .map(p => [p.id, p.name, p.frags, p.deaths, p.bot ? 0 : p.ping, p.bot ? 1 : 0, p.color, p.cr, p.lvl, p.team, p.caps, p.plvl, Math.round(p.dmg || 0)]);
  }
  sendScores() { this.bcast({ t: 'sc', l: this.scores(), tl: Math.max(0, Math.ceil(this.left)), fl: this.mode.teamLimit || this.o.fraglimit, cl: this.o.caplimit, st: this.state, map: this.W.id, mode: this.o.mode, ts: this.ts, fs: this.flagState(), cd: Math.ceil(this.countT), hn: this.humanCount(false), mp: this.mode.minPlayers || 0 }); }
  endMatch() {
    if (this.state !== 'play') return;
    this.state = 'inter'; this.interT = 25;
    this.bans.clear(); this.kickN.clear(); // la partida terminó: los echados pueden volver y se empieza la cuenta de cero
    const l = this.scores(), ms = this.mode.maps;
    // el próximo mapa se vota en la pantalla final; si nadie vota, sale uno al azar
    this.mapVotes.clear();
    this.voteOpts = this.o.rotate && ms.length > 1 ? ms.slice() : null;
    const next = this.voteOpts ? null : this.W.id;
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
    this.bcast({ t: 'end', l, w, wt: this.mode.teams ? (this.ts[0] === this.ts[1] ? -1 : this.ts[0] > this.ts[1] ? 0 : 1) : -1, ts: this.ts, next, nextName: next ? MAPS[next].name : '', mv: this.voteState(), secs: this.interT });
    this.projs.length = 0;
  }
  // resultado de la votación: el más votado; empate entre los más votados o sin votos → al azar
  voteWinner() {
    const o = this.voteOpts; if (!o) return null;
    const c = this.voteCounts(); let best = 0; for (const id of o) best = Math.max(best, c[id]);
    const pool = best ? o.filter(id => c[id] === best) : o;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  voteCounts() { const c = {}; for (const id of this.voteOpts || []) c[id] = 0; for (const [pid, id] of this.mapVotes) if (this.players.has(pid) && c[id] != null) c[id]++; return c; }
  voteState() { return this.voteOpts && this.state === 'inter' ? { o: this.voteOpts.map(id => [id, MAPS[id].name]), c: this.voteCounts() } : null; }
  castMapVote(p, id) {
    if (this.state !== 'inter' || !this.voteOpts || !this.voteOpts.includes(id) || !p.joined || p.bot) return;
    this.mapVotes.set(p.id, id);
    const st = this.voteState();
    for (const q of this.players.values()) if (q.send && q.joined) q.send({ t: 'mv', o: st.o, c: st.c, me: this.mapVotes.get(q.id) || null });
  }
  restart(mapId) {
    if (this.mvote) { this.mvote = null; this.sendVote(); }
    this.bans.clear(); this.kickN.clear();
    if (!mapId && !this.nextMap && this.voteOpts) this.nextMap = this.voteWinner();
    this.voteOpts = null; this.mapVotes.clear();
    for (const s of this.shards) this.bcast({ t: 'ev', e: 'shx', id: s.id }); this.shards.length = 0;
    const id = mapId || this.nextMap || this.W.id; this.nextMap = null;
    if (id !== this.W.id) this.setMap(id); else this.resetFlags();
    this.state = 'play'; this.left = this.o.timelimit; this.projs.length = 0;
    if (this.mode.minPlayers && this.o.online && this.humanCount(false) < this.mode.minPlayers) this.state = 'lobby';
    for (const it of this.items) { it.up = !it.off; it.t = 0; it.type = it.base; }
    this.bcast({ t: 'start', map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), ity: this.items.map(it => it.type), tm: this.time, fs: this.flagState(), ts: this.ts });
    for (const p of this.players.values()) if (p.joined) {
      p.ready = false; p.frags = 0; p.deaths = 0; p.cr = ECON.START; p.unl = OW0(); p.eq = 1; p.perk = { ar: 0, am: 0 }; p.streak = 0; p.lvl = 0; p.caps = 0; p.kills = 0; p.dmg = 0; p.bestLife = 0; p.lifeT0 = p.alive ? this.time : null; p.joinT = this.time; p.dirty = true;
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
    this.time += dt; this.planBudget = 1;
    // historial de posiciones del último 0,7 s para la compensación de lag (cada 2 ticks)
    if (this.o.online && (this.histN = (this.histN || 0) + 1) % 2 === 0)
      for (const q of this.players.values()) { if (!q.alive) { if (q.hist) q.hist.length = 0; continue; } const h = q.hist || (q.hist = []); h.push([this.time, q.s.x, q.s.y, q.s.z]); if (h.length > 14) h.shift(); }
    updateMovers(this.W, this.time);
    if (this.state === 'inter') {
      this.interT -= dt;
      // se prepara la navegación de los mapas candidatos de a uno mientras se ve la tabla final
      if (this.interT < 23) { const c = (this.voteOpts || [this.nextMap]).find(id => id && !NAVS[id]); if (c) getNav(MAPS[c]); }
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
        else if (!p.bot && p.deadT > (this.state === 'play' ? 4.5 : 2) && this.live()) this.spawn(p);
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
    if (this.mvote) { this.mvT = (this.mvT || 0) - dt; if (this.mvT <= 0) { this.mvT = 1; this.checkMapVote(); if (this.mvote) this.sendVote(); } }
    if (this.vote) { this.voteT = (this.voteT || 0) - dt; if (this.voteT <= 0) { this.voteT = 1; this.checkVote(); if (this.vote) this.sendVote(); } }
    if (this.live()) { this.tickProjs(dt); this.tickFires(dt); this.tickItems(dt); this.tickShards(dt); if (this.flags.length && this.state === 'play') this.tickFlags(dt); }
    this.snapT -= dt;
    if (this.snapT <= 1e-6) { this.snapT += .05; if (this.snapT < 0) this.snapT = 0; this.snapshot(); }
    this.scT -= dt;
    if (this.scT <= 0) { this.scT = 1; this.sendScores(); }
  }
  snapshot() {
    const ps = [];
    for (const p of this.players.values()) {
      if (!p.joined) continue;
      ps.push([p.id, r2(p.s.x), r2(p.s.y), r2(p.s.z), r2(p.yaw), r2(p.pitch), p.w, (p.alive ? 1 : 0) | (p.quadT > 0 ? 2 : 0) | (p.s.on ? 4 : 0) | (p.s.crouch ? 8 : 0) | (p.s.slide ? 16 : 0), r2(p.s.vx), r2(p.s.vy), r2(p.s.vz)]);
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
  // gravedad cero: lleva al bot a la altura yb del borde de un nivel (piso en yb) y, ya a esa altura, hacia (tx, tz). Antes de llegar se queda dentro del pozo.
  zgSteer(s, yb, tx, tz) {
    const zb = this.W.zerog[0], cx = (zb.min[0] + zb.max[0]) / 2, cz = (zb.min[2] + zb.max[2]) / 2, inZ = inZeroG(this.W, s);
    const dy = s.y - yb;
    let up = false, cr = false, gx = cx, gz = cz;
    if (inZ) {
      if (dy > 1.4) cr = true;                 // más arriba del borde: bajar
      else { up = dy < .9; if (dy >= .35) { gx = tx; gz = tz; } }   // a la altura justa: salir de costado
    }
    const ax = gx - s.x, az = gz - s.z, al = Math.hypot(ax, az) || 1;
    return { wx: ax / al, wz: az / al, up, cr };
  }
  newAI() { return { think: 0, replan: 0, path: null, pi: 0, tgt: 0, seeT: 0, lostT: 0, last: null, strafe: Math.random() < .5 ? 1 : -1, strafeT: 1, stuckT: 0, bestD: 1e9, hurtBy: 0, hurtT: 0, aimErrX: 0, aimErrY: 0, errT: 0, hopT: 0, goal: null, flyT: 0, noLook: 0 }; }
  skill() { return SKILL[this.o.botSkill] || SKILL[1]; }
  findTarget(p) {
    let best = null, bd = 1e9; const sk = this.skill();
    const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z;
    for (const t of this.players.values()) {
      if (t === p || !t.alive || !t.joined || (this.mode.teams && t.team === p.team)) continue;
      const d = Math.hypot(t.s.x - ex, t.s.y + 1 - ey, t.s.z - ez);
      const hurt = p.ai.hurtT > 0 && p.ai.hurtBy === t.id;
      if (d > (this.W.theme.noche ? Math.min(sk.range, 30) : sk.range) && !hurt) continue;   // de noche los bots tampoco ven de lejos
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
        if (this.W.zerog && inZeroG(this.W, { x: it.x, y: it.y, z: it.z })) continue;   // los ítems que flotan en gravedad cero no los buscan
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
    if (ai.replan <= 0 && s.on) { if (this.planBudget > 0) { this.planBudget--; ai.replan = .7 + Math.random() * .5; this.planBot(p); } else ai.replan = .03; }
    const tgt = ai.tgt ? this.players.get(ai.tgt) : null;
    if (tgt) ai.seeT += dt;
    // --- movimiento ---
    let wx = 0, wz = 0, jump = false, zg = null;   // zg: {up, cr} cuando el bot flota en el pozo de gravedad cero
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
        if (nextLink === 5) { zg = this.zgSteer(s, n.y, n.x, n.z); wx = zg.wx; wz = zg.wz; ai.stuckT = 0; ai.bestD = 1e9; }   // gravedad cero: flota hasta el nivel del próximo nodo
        if (nextLink === 2 && s.on) {
          const prev = nav.nodes[ai.path[ai.pi - 1]];
          if (Math.hypot(prev.x - s.x, prev.z - s.z) < 1.1 || d < 4.5) { jump = true; ai.flyT = .05; }
        }
        if (nextLink === 5) { /* flotando: no cuenta como trabado */ } else if (d < ai.bestD - .2) { ai.bestD = d; ai.stuckT = 0; } else ai.stuckT += dt;
        if (ai.stuckT > 1.2) { jump = true; ai.replan = 0; ai.stuckT = 0; ai.noLook = 1.5; }
      } else ai.path = null;
    } else if (!ai.path && !findNode(nav, s.x, s.y, s.z)) { jump = true; }
    if (!zg && this.W.zerog && inZeroG(this.W, s)) {   // cayó al pozo sin querer: sube hasta el borde del nivel de arriba y sale de costado
      const lv = nav.zlev || [0]; let yb = lv[lv.length - 1];
      for (const y of lv) if (y >= s.y - 1.4) { yb = y; break; }
      const zb = this.W.zerog[0], dx = s.x - (zb.min[0] + zb.max[0]) / 2, dz = s.z - (zb.min[2] + zb.max[2]) / 2;
      const ex = Math.abs(dx) > Math.abs(dz) ? s.x + Math.sign(dx || 1) * 6 : s.x, ez = Math.abs(dx) > Math.abs(dz) ? s.z : s.z + Math.sign(dz || 1) * 6;
      zg = this.zgSteer(s, yb, ex, ez); wx = zg.wx; wz = zg.wz;
    }
    // combate: esquivar de costado y acercarse/alejarse
    if (tgt && !zg) {
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
    pmove(this.W, s, zg ? { wx, wz, jump: false, up: zg.up, crouch: zg.cr } : { wx, wz, jump }, dt);
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

return { PRIMARY, primaryOf, censor, isBad, okChestImg, geyserPhase, geyserOn, K, padReady, XP, levelInfo, xpToNext, MEDALS, medalOf, MAX_LEVEL, WEAPONS, NW, AMMO0, MODES, MODE_IDS, GG, TEAMS, AMMO_MAX, AMMO_NAME, ITEMS, COLORS, WORLD, MAPS, MAP_IDS, SHOP, ECON, ACCESSORIES, EMBLEMS, SKILL, topAt, pmove, inZeroG, triggers, launchPad, padVel, raycast, los, rayPlayer, boxDist, dirFromAngles, projLaunch, projStep, updateMovers, Game, getNav };
});
