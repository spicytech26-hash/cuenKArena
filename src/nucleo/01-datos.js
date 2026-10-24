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
  { id: 'w1', cat: 'Escopetas', name: 'Escopeta', w: 1, price: 0, free: 1, desc: 'Tu arma principal de base (gratis). Elegila para volver a la escopeta' },
  { id: 'w2', cat: 'Escopetas', name: 'Escopeta doble', w: 2, price: 500, pack: ['shells', 20], desc: '20 perdigones, gasta 2 cartuchos' },
  { id: 'w3', cat: 'Automáticas', name: 'Ametralladora', w: 3, price: 600, pack: ['bullets', 100], desc: 'Fuego continuo a media distancia' },
  { id: 'w4', cat: 'Explosivas', name: 'Lanzagranadas', w: 4, price: 900, pack: ['grenades', 10], desc: 'Explotan al segundo. Un impacto directo explota en el acto y da premio' },
  // la molotov es de un solo uso: se compra estando vivo y si te matan la perdés
  { id: 'w10', cat: 'Explosivas', name: 'Bomba molotov', w: 10, price: 300, once: 1, pack: ['molotov', 3], desc: 'Tecla G. 3 molotovs que dejan el piso en llamas 6 s. Si te matan, las perdés' },
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
  arena:   { name: 'Arena', maps: ['represa', 'panymanteca', 'lacuenca'], shop: true, timelimit: 300,
             desc: 'Todos contra todos. Cada frag da créditos para la tienda (B).' },
  gungame: { name: 'Gungame', maps: ['represa', 'panymanteca', 'lacuenca'], shop: false, gg: true,
             desc: 'Cada baja te da la siguiente arma de la lista. Munición infinita, sin tienda. Si te matan con cuchillo bajás un nivel. Gana el primero en hacer las 20 bajas; la última es con cuchillo.' },
  tdm:     { name: 'Team Deathmatch', maps: ['lacuenca', 'represa', 'panymanteca'], shop: true, teams: true, tdm: true, minPlayers: 4,
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
const BOT_NAMES = ['Yacaré', 'Carpincho', 'Surubí', 'Tatú', 'Coatí', 'Aguará', 'Yaguareté', 'Pacú', 'Dorado', 'Tero', 'Hornero', 'Mbiguá', 'Urutaú', 'Tucán', 'Zorro', 'Lobito'];

