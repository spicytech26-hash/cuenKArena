#!/usr/bin/env node
/* Prueba rápida, sin navegador (tarda unos segundos):
   1. public/ está armado con lo último de src/
   2. el código del cliente (index.html) y del editor no tiene errores de sintaxis
   3. cada mapa se arma, tiene apariciones y los bots encuentran caminos
   4. una partida corta con bots en cada modo y mapa no tira errores
   5. todos los botiquines y escudos se pueden agarrar
   6. Captura el dominio: barreras, bloqueo por equipo, núcleo del boss, fin de partida y desempates
   7. Rifle de plasma: curva de daño por carga, instakill solo al máximo, techo de carga y cooldown
   10. Oleadas de minions: salen a tiempo, marchan, se frenan en la barrera, dañan generadores y se pelean
   9. Colisiones: nada visible sin colisión; cada bloque frena al jugador y a los disparos
   8. Avisos del locutor, estadísticas de objetivos en el tablero y puestos de reabastecimiento
   Uso:  node herramientas/probar.js            (todo)
         node herramientas/probar.js lacuenca   (solo ese mapa) */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), os = require('os');
const RAIZ = path.join(__dirname, '..');
let fallas = 0;
const ok = m => console.log('  ok  ' + m), mal = m => { fallas++; console.log('  MAL ' + m); };

console.log('1. Armado');
try { execFileSync(process.execPath, [path.join(__dirname, 'armar.js'), '--revisar'], { stdio: 'pipe' }); ok('public/ al día con src/'); }
catch (e) { mal('public/ desactualizado: corré  node herramientas/armar.js'); }

console.log('2. Sintaxis del cliente');
for (const f of ['public/index.html', 'public/editor.html']) {
  const html = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  const tmp = path.join(os.tmpdir(), 'ck_' + path.basename(f) + '.js');
  fs.writeFileSync(tmp, js);
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok(f); }
  catch (e) { mal(f + '\n' + String(e.stderr).split('\n').slice(0, 6).join('\n')); }
}

console.log('3. Mapas');
const C = require(path.join(RAIZ, 'public/game.js'));
const solo = process.argv[2];
const ids = C.MAP_IDS.filter(id => !solo || id === solo);
for (const id of ids) {
  const W = C.MAPS[id], t0 = Date.now();
  try {
    const nav = C.getNav(W);
    if (!W.spawns.length) mal(id + ': sin apariciones');
    else ok(id + ': ' + W.brushes.length + ' bloques, ' + W.items.length + ' ítems, ' + W.spawns.length + ' apariciones, navegación en ' + (Date.now() - t0) + ' ms');
    if (!nav || !nav.nodes || !nav.nodes.length) mal(id + ': los bots no tienen por dónde caminar');
  } catch (e) { mal(id + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); }
}

console.log('4. Partidas con bots (60 s simulados)');
for (const mode of C.MODE_IDS) for (const map of C.MODES[mode].maps) {
  if (solo && map !== solo) continue;
  try {
    const g = new C.Game({ mode, map, bots: 6, botFill: 6, online: false });
    const id = g.addClient(() => {}); g.onMessage(id, { t: 'join', name: 'Prueba', skin: { c: '#ffffff', v: '#ffffff', a: 0 } });
    for (let i = 0; i < 40 * 60; i++) g.tick(1 / 40);
    const frags = [...g.players.values()].reduce((a, p) => a + p.frags, 0);
    ok(mode + ' en ' + map + ': ' + g.players.size + ' jugadores, ' + frags + ' bajas');
  } catch (e) { mal(mode + ' en ' + map + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); }
}

console.log('5. Ítems de curación y blindaje');
for (const id of ids) {
  const mode = C.MODE_IDS.find(m => C.MODES[m].maps.includes(id)); if (!mode) { mal(id + ': no está en ningún modo'); continue; }
  const g = new C.Game({ mode, map: id, bots: 0 }); if (g.W.id !== id) continue;
  const p = g.newPlayer(999, 'Prueba', { c: '#fff', v: '#fff', a: 0 }, false); p.joined = true; p.alive = true; g.players.set(999, p);
  const malos = [];
  for (const it of g.items) {
    if (!['health', 'mega', 'armor', 'armorH'].includes(it.type)) continue;
    p.hp = 30; p.ar = 0; p.s = { x: it.x, y: it.y + .5, z: it.z, vx: 0, vy: 0, vz: 0, on: false };
    for (let k = 0; k < 40 && it.up; k++) { C.pmove(g.W, p.s, {}, 1 / 40); g.tickItems(1 / 40); }
    if (it.up) malos.push(it.type + ' en (' + it.x + ', ' + it.y + ', ' + it.z + ')');
    it.up = true;
  }
  if (malos.length) mal(id + ': no se pueden agarrar: ' + malos.join(', ')); else ok(id + ': todos se agarran');
}

console.log('6. Captura el dominio');
if (!solo || solo === 'santuario') try {
  const D = C.DOM, dt = 1 / 40;
  // partida sin bots con un jugador por equipo; `fin` guarda el mensaje de fin de partida
  const nueva = () => {
    const g = new C.Game({ mode: 'dominio', bots: 0 }), fin = { m: null }, ps = [];
    for (let i = 0; i < 2; i++) { const id = g.addClient(m => { if (m.t === 'end') fin.m = m; }); g.onMessage(id, { t: 'join', name: 'p' + i }); ps.push(g.players.get(id)); }
    const rojo = ps.find(q => q.team === 0), azul = ps.find(q => q.team === 1);
    return { g, d: g.dom, fin, rojo, azul };
  };
  const cerca = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
  const MS = C.MAPS.santuario, BAR = MS.bars[1], XMURO = Math.abs(BAR.x), FUERA = XMURO - 4, DENTRO = XMURO + 6;   // barrera 1 = portón del centro rojo
  const prueba = (nombre, f) => { try { const r = f(); if (r === true) ok(nombre); else mal(nombre + (r ? ': ' + r : '')); } catch (e) { mal(nombre + ': ' + (e && e.stack || e)); } };

  prueba('equipos repartidos y 15 minutos de partida', () => { const { g, rojo, azul } = nueva(); return !!rojo && !!azul && g.left === D.TIME && C.MODES.dominio.timelimit === D.TIME || 'equipos o duración mal'; });

  prueba('la barrera se debilita con un generador y cae recién con los dos', () => {
    const { g, d, azul } = nueva();   // barrera 1 = centro del rojo; sus generadores son el 2 y el 3
    if (d.bars[1].team !== 0 || d.bars[1].lane !== 1) return 'la barrera 1 no es la del centro rojo';
    g.domHit(azul, 'g', 2, D.GEN_HP * 10, false);   // el tope por impacto no deja romperlo de un tiro
    if (d.gens[2].hp <= 0) return 'un solo impacto rompió el generador (no anda HIT_CAP)';
    while (d.gens[2].hp > 0) g.domHit(azul, 'g', 2, 200, false);
    if (d.bars[1].st !== 1) return 'con un generador roto la barrera tendría que estar debilitada (1), está en ' + d.bars[1].st;
    if (g.W.brushes.some(b => b.bar && b.bar.i === 1 && b.bar.down)) return 'la barrera debilitada dejó de frenar';
    while (d.gens[3].hp > 0) g.domHit(azul, 'g', 3, 200, false);
    if (d.bars[1].st !== 2) return 'con los dos generadores rotos la barrera tendría que caer';
    if (d.stat[1].bars !== 1 || d.stat[1].gens !== 2) return 'no se contaron bien las barreras y generadores del azul';
    return d.bars.filter(b => b.st !== 0).length === 1 || 'cambió otra barrera';
  });

  prueba('la barrera frena al rival y deja pasar al defensor', () => {
    const { g, d, azul, rojo } = nueva();
    // arranca un poco en el aire: adentro de la fortaleza el piso tiene gradas y si no queda clavado en una
    const corre = (p, x, dir) => { p.s = { x, y: BAR.y + 1.2, z: BAR.z, vx: 0, vy: 0, vz: 0, on: false, tm: p.team }; for (let k = 0; k < 120; k++) C.pmove(g.W, p.s, { wx: dir, wz: 0 }, dt); return p.s.x; };
    let x = corre(azul, FUERA, 1); if (x > XMURO) return 'el rival atravesó la barrera (x = ' + x.toFixed(1) + ')';
    x = corre(rojo, DENTRO, -1); if (x > XMURO - 1) return 'el defensor no pudo salir por su barrera (x = ' + x.toFixed(1) + ')';
    x = corre(rojo, FUERA, 1); if (x < XMURO + 2) return 'el defensor no pudo entrar por su barrera (x = ' + x.toFixed(1) + ')';
    while (d.gens[2].hp > 0) g.domHit(azul, 'g', 2, 200, false); while (d.gens[3].hp > 0) g.domHit(azul, 'g', 3, 200, false);
    x = corre(azul, FUERA, 1); return x > XMURO + 2 || 'con la barrera caída el rival tendría que pasar (x = ' + x.toFixed(1) + ')';
  });

  prueba('la barrera frena los disparos y proyectiles del rival, no los del defensor', () => {
    const { g } = nueva();
    const X0_ = XMURO - 10, Y_ = BAR.y + 1.5;
    const rayo = eq => { const o = C.setPasa(eq); try { return C.raycast(g.W, X0_, Y_, BAR.z, 1, 0, 0, 40); } finally { C.setPasa(o); } };
    const a = rayo(1), r = rayo(0);
    if (!a || !a.b.bar || a.b.bar.i !== 1 || a.t > 10.1) return 'la bala rival no pegó en la barrera';
    if (r && r.b.bar) return 'la bala del defensor se frenó en su barrera';
    const cohete = eq => { const o = C.setPasa(eq), pr = { k: 'rocket', x: X0_, y: Y_, z: BAR.z, v: [44, 0, 0], life: 6 }; try { for (let k = 0; k < 40; k++) if (C.projStep(g.W, pr, dt)) break; return pr.x; } finally { C.setPasa(o); } };
    if (cohete(1) > XMURO + .2) return 'el cohete rival atravesó la barrera';
    if (cohete(0) < XMURO + 4) return 'el cohete del defensor explotó en su barrera';
    const o = C.setPasa(1), ve = C.los(g.W, X0_, Y_, BAR.z, XMURO + 8, Y_, BAR.z); C.setPasa(o);
    return !ve || 'hay línea de visión a través de la barrera rival';
  });

  prueba('la única entrada a la fortaleza es un portón con la barrera caída (ni por arriba del muro)', () => {
    const { g, d, azul } = nueva(), M = MS;
    // a cualquier altura y en cualquier z, el rival se encuentra con algo macizo en el plano del muro
    for (let z = -66; z <= 66; z += 3) for (const y of [2, 8, 14, 20, 34, 60]) {
      const o = C.setPasa(1), h = C.raycast(g.W, XMURO - 12, y, z, 1, 0, 0, 24); C.setPasa(o);
      if (!h || h.t > 12.2) return 'un rival pasa el muro por y = ' + y + ', z = ' + z;
    }
    azul.s = { x: XMURO - 3, y: 20, z: 0, vx: 12, vy: 9, vz: 0, on: false, tm: 1 };
    for (let k = 0; k < 80; k++) C.pmove(g.W, azul.s, { wx: 1, wz: 0 }, dt);
    if (azul.s.x > XMURO) return 'un rival en el aire a 20 m cruzó el muro';
    // tirar todas las barreras abre los portones, pero no el campo de arriba
    d.gens.forEach((q, i) => { if (q.team === 0) while (q.hp > 0) g.domHit(azul, 'g', i, 200, false); });
    const o = C.setPasa(1), arriba = C.raycast(g.W, XMURO - 12, 34, 0, 1, 0, 0, 24), puerta = C.raycast(g.W, XMURO - 12, BAR.y + 2, BAR.z, 1, 0, 0, 14); C.setPasa(o);
    if (!arriba || !arriba.b.bar) return 'con las barreras caídas se abrió también el campo de arriba';
    if (puerta) return 'con la barrera del centro caída el portón sigue cerrado';
    // cada barrera tiene sus 2 generadores pegados a sus dos extremos, del lado de afuera
    for (const [i, b] of M.bars.entries()) {
      const gs = M.gens.filter(q => q.team === b.team && q.lane === b.lane), lados = gs.map(q => Math.sign(q.z - b.z));
      if (gs.length !== 2 || lados[0] === lados[1]) return 'la barrera ' + (i + 1) + ' no tiene un generador en cada extremo';
      for (const q of gs) if (Math.abs(Math.abs(q.z - b.z) - b.w / 2) > 4 || Math.abs(q.x) >= Math.abs(b.x)) return 'un generador de la barrera ' + (i + 1) + ' no está pegado a su extremo, del lado atacante';
    }
    return true;
  });

  prueba('ni disparos ni explosiones dañan la barrera: solo los generadores', () => {
    const { g, d, azul } = nueva();
    g.domBlast(azul, XMURO - .5, BAR.y + 2, BAR.z, 4.5, 60, .75, null);   // explosión pegada a la barrera, lejos de los generadores
    return d.bars[1].st === 0 && d.gens.every(q => q.hp === D.GEN_HP) || 'la explosión contra la barrera cambió algo';
  });

  prueba('el núcleo del boss recibe más daño que el cuerpo', () => {
    const { g, d, azul } = nueva();
    const cuerpo = g.domHit(azul, 'b', 0, 100, false), nucleo = g.domHit(azul, 'b', 0, 100, true);
    if (!cerca(cuerpo, 100) || !cerca(nucleo, 100 * D.CORE_MULT)) return 'cuerpo ' + cuerpo + ', núcleo ' + nucleo;
    // geometría: de frente y a la altura del pecho es núcleo; a los pies o por la espalda, cuerpo
    const b = d.boss[0], f = C.dirFromAngles(b.yaw, 0), tiro = (ox, oy, oz) => { const dx = b.x - ox, dz = b.z - oz, l = Math.hypot(dx, dz), dir = [dx / l, 0, dz / l], o = C.setPasa(0); try { return g.domStruct([ox, oy, oz], dir, C.raycast(g.W, ox, oy, oz, dir[0], dir[1], dir[2], 60)); } finally { C.setPasa(o); } };
    const frente = tiro(b.x + f[0] * 10, b.y + D.CORE_Y, b.z + f[2] * 10), pies = tiro(b.x + f[0] * 10, b.y + 2, b.z + f[2] * 10), espalda = tiro(b.x - f[0] * 10, b.y + D.CORE_Y, b.z - f[2] * 10);
    if (!frente || frente.kind !== 'b' || !frente.core) return 'el tiro al pecho de frente no contó como núcleo';
    if (!pies || pies.core) return 'el tiro a los pies contó como núcleo';
    return (espalda && !espalda.core) || 'el tiro por la espalda contó como núcleo';
  });

  prueba('la partida termina en el acto cuando muere un boss', () => {
    const { g, d, fin, azul } = nueva();
    const antes = g.left;
    while (d.boss[0].hp > 0 && g.state === 'play') g.domHit(azul, 'b', 0, 250, true);
    if (g.state !== 'inter') return 'la partida siguió después de morir el boss';
    if (!fin.m || fin.m.wt !== 1 || fin.m.dw.why !== 'boss') return 'no ganó el azul por matar al boss rojo';
    return g.left === antes && g.left > 800 || 'esperó a que se acabe el tiempo';
  });

  // fin por tiempo: se arma el estado a mano y se deja correr el último instante
  const porTiempo = prep => { const j = nueva(); prep(j.d); j.g.left = dt / 2; j.g.tick(dt); return j; };
  prueba('a los 15 minutos gana el que le sacó más vida porcentual al boss rival', () => {
    const j = porTiempo(d => { d.boss[0].hp = D.BOSS_HP * .40; d.boss[1].hp = D.BOSS_HP * .55; d.stat[0].bars = 3; d.stat[0].gens = 6; d.stat[0].dmg = 9e5; });
    return j.g.state === 'inter' && j.fin.m && j.fin.m.wt === 1 && j.fin.m.dw.why === 'vida del boss' || 'tenía que ganar el azul por vida del boss (ganó ' + (j.fin.m && j.fin.m.wt) + ')';
  });
  prueba('desempate 1: más barreras destruidas', () => {
    const j = porTiempo(d => { d.stat[0].bars = 2; d.stat[1].bars = 1; d.stat[1].gens = 6; d.stat[1].dmg = 9e5; });
    return j.fin.m && j.fin.m.wt === 0 && j.fin.m.dw.why === 'barreras' || 'tenía que ganar el rojo por barreras';
  });
  prueba('desempate 2: más generadores destruidos', () => {
    const j = porTiempo(d => { d.stat[0].bars = d.stat[1].bars = 1; d.stat[0].gens = 2; d.stat[1].gens = 3; d.stat[0].dmg = 9e5; });
    return j.fin.m && j.fin.m.wt === 1 && j.fin.m.dw.why === 'generadores' || 'tenía que ganar el azul por generadores';
  });
  prueba('desempate 3: más daño total a bosses y generadores', () => {
    const j = porTiempo(d => { d.stat[0].gens = d.stat[1].gens = 2; d.stat[0].dmg = 5001; d.stat[1].dmg = 5000; });
    return j.fin.m && j.fin.m.wt === 0 && j.fin.m.dw.why === 'daño' || 'tenía que ganar el rojo por daño';
  });
  prueba('empate total: no gana nadie y no hay tiempo extra', () => {
    const j = porTiempo(d => { d.stat[0].bars = d.stat[1].bars = 1; d.stat[0].gens = d.stat[1].gens = 2; d.stat[0].dmg = d.stat[1].dmg = 3000; });
    return j.g.state === 'inter' && j.fin.m && j.fin.m.wt === -1 && j.fin.m.w === '' && j.fin.m.dw.why === 'empate' || 'tenía que ser empate';
  });

  prueba('recién aparecido es invulnerable y el boss solo ataca a rivales', () => {
    const { g, d, rojo, azul } = nueva();
    g.damage(azul, 50, rojo, 1, null, 0, 'frag'); if (azul.hp !== 100) return 'le pegaron durante la invulnerabilidad';
    g.time += D.SPAWN_INV + .1; g.damage(azul, 50, rojo, 1, null, 0, 'frag'); if (azul.hp >= 100) return 'siguió invulnerable';
    const b = d.boss[0]; for (const q of [rojo, azul]) q.s = { x: b.x - 10, y: 0, z: q === rojo ? 2 : -2, vx: 0, vy: 0, vz: 0, on: true, tm: q.team };
    const o = C.setPasa(0); const ve = g.domTargets(b); C.setPasa(o);
    return ve.length === 1 && ve[0] === azul || 'el boss rojo tendría que ver solo al jugador azul';
  });

  prueba('los bots no cruzan una barrera rival cerrada y sí una abierta', () => {
    const { g, d, azul } = nueva(), nav = g.nav, M = C.MAPS.santuario;
    const ini = M.tspawns[1][1], meta = M.bossPts[0][0];
    const a = C.findNode(nav, ini.x, ini.y + .2, ini.z), b = C.findNode(nav, meta.x, meta.y + .3, meta.z);
    if (!a || !b) return 'faltan nodos de navegación';
    if (C.dijkstra(nav, a.id, g.domBan(1)).dist[b.id] < Infinity) return 'hay camino al boss rojo con las tres barreras cerradas';
    const ir = C.findNode(nav, M.tspawns[0][1].x, M.tspawns[0][1].y + .2, M.tspawns[0][1].z), plaza = C.findNode(nav, 0, 1.2, 6);
    if (!(C.dijkstra(nav, ir.id, g.domBan(0)).dist[plaza.id] < Infinity)) return 'el defensor no puede salir de su fortaleza';
    for (const i of [0, 1]) while (d.gens[i].hp > 0) g.domHit(azul, 'g', i, 200, false);
    const dist = C.dijkstra(nav, a.id, g.domBan(1)).dist[b.id];
    if (!(dist < Infinity)) return 'con la ruta norte abierta no hay camino al boss';
    const seg = dist / C.K.MAXSPD;
    console.log('      de la aparición azul al boss rojo por el norte: ' + Math.round(dist) + ' m, ' + seg.toFixed(1) + ' s corriendo');
    return seg > 16 && seg < 23 || 'cruzar el mapa tarda ' + seg.toFixed(1) + ' s (tendría que andar entre 18 y 22)';
  });

  prueba('los puntos de ataque, defensa y aparición caen en sitios alcanzables', () => {
    const g = new C.Game({ mode: 'dominio', bots: 0 }), nav = g.nav, M = MS;
    const base = C.findNode(nav, M.tspawns[0][1].x, M.tspawns[0][1].y + .2, M.tspawns[0][1].z);
    const dj = C.dijkstra(nav, base.id, null);
    const malo = (p, q) => { const n = C.findNode(nav, p.x, p.y + .3, p.z); if (!n) return q + ': sin nodo cerca'; if (!(dj.dist[n.id] < Infinity)) return q + ': nodo aislado'; return null; };
    for (const [i, q] of M.gens.entries()) { const r = malo(q.atk, 'punto de ataque del generador ' + (i + 1)); if (r) return r; }
    for (const t of [0, 1]) {
      for (const [i, q] of M.defPts[t].entries()) { const r = malo(q, 'punto de defensa ' + i + ' del equipo ' + t); if (r) return r; }
      for (const [i, q] of M.bossPts[t].entries()) { const r = malo(q, 'punto del boss ' + i + ' del equipo ' + t); if (r) return r; }
      for (const q of M.tspawns[t]) { const r = malo(q, 'aparición del equipo ' + t); if (r) return r; }
      for (const q of M.fspawns[t]) { const r = malo(q, 'aparición adelantada del equipo ' + t); if (r) return r; }
    }
    return true;
  });

  prueba('sigue siendo el mapa más grande, y es una arena ancha y no un pasillo', () => {
    const area = W_ => (W_.bounds.x1 - W_.bounds.x0) * (W_.bounds.z1 - W_.bounds.z0), B = MS.bounds, yo = area(MS);
    const otro = Math.max(...C.MAP_IDS.filter(k => k !== 'santuario').map(k => area(C.MAPS[k])));
    const largo = B.x1 - B.x0, ancho = B.z1 - B.z0;
    console.log('      ' + largo + ' x ' + ancho + ' m = ' + yo + ' m², ' + (yo / otro).toFixed(2) + ' veces el más grande de los otros, ' + MS.brushes.length + ' bloques');
    if (yo < otro * 2) return 'mide ' + (yo / otro).toFixed(2) + ' veces el más grande de los otros';
    return largo / ancho < 1.6 || 'es un pasillo: ' + (largo / ancho).toFixed(2) + ' de largo por ancho';
  });

  prueba('los minions cuidan su generador: dos por generador, solo atacan al rival y vuelven al puesto', () => {
    const { g, d, azul } = nueva(), K2 = D.MIN;
    if (d.mins.length !== d.gens.length * K2.POR_GEN) return 'hay ' + d.mins.length + ' minions y tendrían que ser ' + d.gens.length * K2.POR_GEN;
    for (let gi = 0; gi < d.gens.length; gi++) if (d.mins.filter(m => m.gen === gi).length !== K2.POR_GEN) return 'el generador ' + (gi + 1) + ' no tiene sus ' + K2.POR_GEN + ' minions';
    if (d.mins.some(m => m.team !== d.gens[m.gen].team)) return 'hay un minion del equipo equivocado';
    if (!d.mins.some(m => m.kind === 0) || !d.mins.some(m => m.kind === 1)) return 'faltan los dos tipos (cuerpo a cuerpo y a distancia)';
    // un compañero al lado no le interesa; un rival sí
    const m = d.mins.find(q => q.team === 0 && q.gen === 2), rojo = [...g.players.values()].find(q => q.team === 0);
    g.time += D.SPAWN_INV + .1;
    rojo.s = { x: m.x + 1.5, y: m.y, z: m.z, vx: 0, vy: 0, vz: 0, on: true, tm: 0 }; rojo.hp = 100;
    for (let k = 0; k < 120; k++) g.tick(dt);
    if (rojo.hp < 100) return 'le pegó a uno de su propio equipo';
    azul.s = { x: m.x + 2, y: m.y, z: m.z, vx: 0, vy: 0, vz: 0, on: true, tm: 1 }; azul.hp = 100; azul.armor = 0;
    for (let k = 0; k < 200; k++) g.tick(dt);
    if (azul.hp >= 100) return 'tuvo al rival encima 5 s y no lo atacó';
    // no se aleja del puesto más de lo que dice la correa
    for (const q of d.mins) if (Math.hypot(q.x - q.home.x, q.z - q.home.z) > K2.LEASH * 1.5) return 'un minion se fue lejísimos de su puesto';
    return true;
  });

  prueba('matar un minion da créditos pero no cuenta como baja; vuelve a aparecer mientras viva su generador', () => {
    const { g, d, azul } = nueva(), K2 = D.MIN;
    const m = d.mins.find(q => q.team === 0), cr0 = azul.cr, k0 = azul.kills;
    while (m.hp > 0) g.domMinDamage(m, 10, azul);
    if (azul.cr !== cr0 + K2.CRED + K2.LAST_HIT) return 'tendría que dar ' + (K2.CRED + K2.LAST_HIT) + ' créditos (dio ' + (azul.cr - cr0) + ')';
    if (azul.kills !== k0) return 'contó como baja en el marcador';
    if (azul.mins !== 1) return 'no se anotó el minion bajado';
    for (let k = 0; k < (K2.RESP + 3) * 40; k++) g.tick(dt);
    if (d.mins.filter(q => q.gen === m.gen && q.hp > 0).length !== K2.POR_GEN) return 'no volvió a aparecer a los ' + K2.RESP + ' s';
    return true;
  });

  prueba('al caer el generador se apagan sus minions y no vuelven', () => {
    const { g, d, azul } = nueva();
    const gi = 2, antes = d.mins.filter(m => m.gen === gi && m.hp > 0).length;
    if (!antes) return 'el generador no tenía minions';
    while (d.gens[gi].hp > 0) g.domHit(azul, 'g', gi, 200, false);
    for (let k = 0; k < 40; k++) g.tick(dt);
    if (d.mins.some(m => m.gen === gi && m.hp > 0)) return 'quedaron minions de un generador destruido';
    for (let k = 0; k < (D.MIN.RESP + 4) * 40; k++) g.tick(dt);
    if (d.mins.some(m => m.gen === gi && m.hp > 0)) return 'volvieron a aparecer sin generador';
    return d.mins.filter(m => m.gen === 3 && m.hp > 0).length === D.MIN.POR_GEN || 'se apagaron también los del generador de al lado';
  });

  prueba('partida entera con bots: abren una ruta y se pegan con el boss sin errores', () => {
    const g = new C.Game({ mode: 'dominio', bots: 10, botSkill: 2 });
    for (let k = 0; k < 40 * 420 && g.state === 'play'; k++) g.tick(dt);
    const d = g.dom, s = d.stat[0].gens + d.stat[1].gens;
    return s > 0 || 'en 7 minutos los bots no rompieron ningún generador';
  });
} catch (e) { mal('Captura el dominio: ' + (e && e.stack || e)); }

console.log('7. Rifle de plasma: carga y disparo');
if (!solo || solo === 'santuario') try {
  const G_ = C.CARGA, W6 = C.WEAPONS[6], dt = 1 / 40, D2 = C.DOM;
  const MS2 = C.MAPS.santuario, BAR2 = MS2.bars[1], XM = Math.abs(BAR2.x), Y2 = BAR2.y + 1.5;
  const prueba = (nombre, f) => { try { const r = f(); if (r === true) ok(nombre); else mal(nombre + (r ? ': ' + r : '')); } catch (e) { mal(nombre + ': ' + (e && e.stack || e)); } };
  // dos jugadores cara a cara en la ruta del centro, fuera de la barrera: el azul le tira al rojo
  const duelo = () => {
    const g = new C.Game({ mode: 'dominio', bots: 0 }), ps = [];
    for (let i = 0; i < 2; i++) { const id = g.addClient(() => {}); g.onMessage(id, { t: 'join', name: 'p' + i }); ps.push(g.players.get(id)); }
    const a = ps.find(q => q.team === 1), b = ps.find(q => q.team === 0);
    g.time += D2.SPAWN_INV + 1;   // se les pasa la invulnerabilidad de aparición
    const pos = (p, x) => { p.s = { x, y: Y2 - 1, z: BAR2.z, vx: 0, vy: 0, vz: 0, on: true, tm: p.team }; p.spawnT = -99; };
    pos(a, XM - 9); pos(b, XM - 3);
    a.ow[6] = true; a.w = 6; a.am.slugs = 40; a.mag[6] = W6.mag;
    b.hp = 1000; b.ar = 0;
    return { g, a, b };
  };
  // dispara con `carga` segundos de botón apretado y devuelve lo que le sacó al rival
  const tiro = (g, a, b, carga) => {
    const o = [a.s.x, a.s.y + C.K.EYE, a.s.z], c = [b.s.x, b.s.y + 1, b.s.z];
    const d = [c[0] - o[0], c[1] - o[1], c[2] - o[2]], L = Math.hypot(d[0], d[1], d[2]);
    a.chgT = carga > 0 ? g.time - carga : 0;
    const hp0 = b.hp + b.ar;
    g.onMessage(a.id, { t: 'fire', w: 6, o, d: [d[0] / L, d[1] / L, d[2] / L], h: [[b.id, 1, 0]] });
    return hp0 - (b.alive ? b.hp + b.ar : 0);
  };
  const libre = (g, a) => { a.lastFire = -99; a.mag[6] = W6.mag; };   // saltea el cooldown entre pruebas

  prueba('la curva de daño va del toque (' + G_.DMG_MIN + ') a la carga máxima (' + G_.DMG_MAX + ')', () => {
    const { g, a, b } = duelo();
    const casos = [[G_.MIN, G_.DMG_MIN], [G_.MAX, G_.DMG_MAX]];
    for (const [cg, esp] of casos) {
      libre(g, a); const dmg = tiro(g, a, b, cg);
      if (Math.abs(dmg - esp) > .5) return 'con ' + cg + ' s de carga sacó ' + dmg.toFixed(1) + ' y tendría que sacar ' + esp;
    }
    libre(g, a); const medio = tiro(g, a, b, .5);
    if (!(medio > 60 && medio < 100)) return 'media carga (.5 s) sacó ' + medio.toFixed(1) + ', fuera del rango medio';
    libre(g, a); const corto = tiro(g, a, b, .15);
    if (!(corto > G_.DMG_MIN && corto < medio)) return 'la curva no sube: .15 s sacó ' + corto.toFixed(1) + ' y .5 s ' + medio.toFixed(1);
    return true;
  });

  prueba('un toque más corto que ' + G_.MIN + ' s no saca el tiro ni gasta munición', () => {
    const { g, a, b } = duelo(), am0 = a.am.slugs;
    const dmg = tiro(g, a, b, G_.MIN * .4);
    if (dmg > 0) return 'salió un tiro de ' + dmg.toFixed(1) + ' de daño';
    return a.am.slugs === am0 || 'gastó munición sin disparar';
  });

  prueba('solo la carga máxima mata de un tiro a un jugador con vida y escudo llenos', () => {
    const { g, a, b } = duelo();
    const sano = () => { b.hp = 100; b.ar = 100; b.alive = true; };
    sano(); libre(g, a); tiro(g, a, b, .5);
    if (!b.alive) return 'media carga (.5 s) ya lo mató';
    sano(); libre(g, a); tiro(g, a, b, .8);
    if (!b.alive) return 'una carga de .8 s ya lo mató: con el escudo lleno tendría que aguantar';
    sano(); libre(g, a); tiro(g, a, b, G_.MAX);
    if (b.alive) return 'la carga máxima le dejó ' + b.hp.toFixed(0) + ' de vida y ' + b.ar.toFixed(0) + ' de escudo';
    b.hp = 100; b.ar = 0; b.alive = true;
    libre(g, a); tiro(g, a, b, .5);
    return b.alive || 'media carga mata a un jugador sin escudo: no tendría que alcanzar';
  });

  prueba('mantenerla de más no suma: el daño tiene techo', () => {
    const { g, a, b } = duelo();
    libre(g, a); const tope = tiro(g, a, b, G_.MAX);
    libre(g, a); const pasado = tiro(g, a, b, G_.MAX + G_.SOBRA + 5);
    return Math.abs(tope - pasado) < .5 || 'cargando de más sacó ' + pasado.toFixed(1) + ' contra ' + tope.toFixed(1);
  });

  prueba('entre tiro y tiro hay cooldown', () => {
    const { g, a, b } = duelo();
    libre(g, a);
    if (!(tiro(g, a, b, G_.MAX) > 0)) return 'no salió el primer tiro';
    const seguido = tiro(g, a, b, G_.MAX);
    if (seguido > 0) return 'disparó dos veces seguidas sin esperar';
    g.time += W6.rate;
    return tiro(g, a, b, G_.MAX) > 0 || 'después del cooldown no volvió a disparar';
  });

  prueba('si te pegan mientras cargás, perdés la carga', () => {
    const { g, a, b } = duelo();
    g.onMessage(a.id, { t: 'chg', w: 6 });
    if (!a.chgT) return 'el mensaje de carga no se registró';
    g.damage(a, 10, b, 0, [1, 0, 0], 0, 'frag');
    return !a.chgT || 'siguió cargando después del golpe';
  });

  prueba('los bots cargan el plasma dentro de los límites', () => {
    for (const sk of [0, 1, 2, 3]) {
      const g = new C.Game({ mode: 'dominio', bots: 0, botSkill: sk });
      for (let k = 0; k < 200; k++) { const c = g.botCarga(W6); if (!(c >= G_.MIN && c <= G_.MAX)) return 'con habilidad ' + sk + ' cargó ' + c; }
    }
    return true;
  });

  prueba('la barrera rival también frena el rayo cargado', () => {
    const g = new C.Game({ mode: 'dominio', bots: 0 });
    const o = C.setPasa(1);
    try { const h = C.raycast(g.W, XM - 10, Y2, BAR2.z, 1, 0, 0, W6.range); return !!(h && h.b.bar) || 'el rayo pasó la barrera'; }
    finally { C.setPasa(o); }
  });
} catch (e) { mal('Rifle de plasma: ' + (e && e.stack || e)); }

console.log('8. Avisos, estadísticas y puestos de reabastecimiento');
if (!solo || solo === 'santuario') try {
  const D3 = C.DOM, dt = 1 / 40, MS3 = C.MAPS.santuario;
  const prueba = (nombre, f) => { try { const r = f(); if (r === true) ok(nombre); else mal(nombre + (r ? ': ' + r : '')); } catch (e) { mal(nombre + ': ' + (e && e.stack || e)); } };
  // partida con los avisos ('ev' de tipo 'dom') guardados
  const conAvisos = () => {
    const g = new C.Game({ mode: 'dominio', bots: 0 }), avisos = [], ps = [];
    for (let i = 0; i < 2; i++) { const id = g.addClient(m => { if (m.t === 'ev' && m.e === 'dom' && !avisos.includes(m)) avisos.push(m); }); g.onMessage(id, { t: 'join', name: 'p' + i }); ps.push(g.players.get(id)); }
    return { g, d: g.dom, avisos, rojo: ps.find(q => q.team === 0), azul: ps.find(q => q.team === 1) };
  };

  prueba('cada carril tiene su puesto de reabastecimiento del lado del atacante', () => {
    for (const team of [0, 1]) for (const lane of [0, 1, 2]) {
      const gs = MS3.gens.filter(g => g.team === team && g.lane === lane);
      if (gs.length !== 2) return 'el carril ' + lane + ' no tiene sus dos generadores';
      const z = (gs[0].z + gs[1].z) / 2, fuera = Math.abs(gs[0].x) - 13;
      const cerca = MS3.items.filter(it => Math.abs(Math.abs(it.x) - fuera) < 3 && Math.abs(it.z - z) < 4 && Math.sign(it.x) === Math.sign(gs[0].x));
      if (!cerca.length) return 'al carril ' + C.DOM.LANES[lane] + ' del equipo ' + team + ' le falta el puesto';
      if (!cerca.some(it => it.type === 'health')) return 'el puesto del carril ' + C.DOM.LANES[lane] + ' no tiene botiquín';
      if (!cerca.some(it => C.ITEMS[it.type] && C.ITEMS[it.type].ammo)) return 'el puesto del carril ' + C.DOM.LANES[lane] + ' no tiene munición';
    }
    return true;
  });

  prueba('avisa cuando atacan un generador, y solo al equipo que lo defiende', () => {
    const { g, d, avisos, azul } = conAvisos();
    g.domHit(azul, 'g', 2, 100, false);
    const a = avisos.filter(m => m.a === 'genalert');
    if (a.length !== 1) return 'salieron ' + a.length + ' avisos y tendría que salir 1';
    if (a[0].b !== d.gens[2].team) return 'el aviso no dice de qué equipo es el generador';
    if (!(a[0].hp > 90 && a[0].hp < 100)) return 'el aviso trae mal la vida que le queda (' + a[0].hp + '%)';
    g.domHit(azul, 'g', 2, 100, false);
    if (avisos.filter(m => m.a === 'genalert').length !== 1) return 'repitió el aviso sin esperar';
    g.time += D3.ALERT_EVERY + .1; g.domHit(azul, 'g', 2, 100, false);
    return avisos.filter(m => m.a === 'genalert').length === 2 || 'no volvió a avisar pasado el intervalo';
  });

  prueba('avisa una sola vez que el boss entró en furia', () => {
    const { g, d, avisos, azul } = conAvisos();
    d.boss[0].hp = D3.BOSS_HP * D3.ENRAGE + D3.HIT_CAP / 2;
    for (let k = 0; k < 10; k++) g.tick(dt);
    if (avisos.some(m => m.a === 'furia')) return 'avisó antes de tiempo';
    g.domHit(azul, 'b', 0, D3.HIT_CAP, false);
    for (let k = 0; k < 40; k++) g.tick(dt);
    const n = avisos.filter(m => m.a === 'furia').length;
    if (n !== 1) return 'salieron ' + n + ' avisos de furia';
    for (let k = 0; k < 200; k++) g.tick(dt);
    return avisos.filter(m => m.a === 'furia').length === 1 || 'lo repitió en los cuadros siguientes';
  });

  prueba('el locutor canta los minutos que quedan', () => {
    const { g, avisos } = conAvisos();
    for (const n of D3.AVISOS) {
      g.left = n + .02;
      for (let k = 0; k < 4; k++) g.tick(dt);
      if (!avisos.some(m => m.a === 'tiempo' && m.n === n)) return 'no avisó que quedaban ' + n + ' s';
    }
    const rep = D3.AVISOS.map(n => avisos.filter(m => m.a === 'tiempo' && m.n === n).length);
    return rep.every(q => q === 1) || 'repitió algún aviso de tiempo: ' + rep.join(',');
  });

  prueba('el tablero muestra los objetivos de cada jugador: generadores, rutas, daño al boss y minions', () => {
    const { g, d, azul } = conAvisos();
    for (let k = 0; k < 2; k++) g.domHit(azul, 'b', 0, 250, false);   // el daño por golpe está topeado
    while (d.gens[2].hp > 0) g.domHit(azul, 'g', 2, 200, false);
    while (d.gens[3].hp > 0) g.domHit(azul, 'g', 3, 200, false);   // con los dos cae la barrera
    const m = d.mins.find(q => q.team === 0 && q.hp > 0);
    if (m) while (m.hp > 0) g.domMinDamage(m, 20, azul);
    const fila = g.scores().find(s => s[0] === azul.id), o = fila && fila[15];
    if (!o) return 'la fila del tablero no trae el detalle de objetivos';
    if (o[0] !== 2) return 'dice ' + o[0] + ' generadores y rompió 2';
    if (o[1] !== 1) return 'dice ' + o[1] + ' rutas abiertas y abrió 1';
    if (Math.abs(o[2] - 500) > 1) return 'dice ' + o[2] + ' de daño al boss y le hizo 500 en dos golpes';
    if (m && o[3] !== 1) return 'dice ' + o[3] + ' minions y bajó 1';
    const rojo2 = g.scores().find(s => s[0] !== azul.id);
    return rojo2[15][0] === 0 || 'le anotó objetivos al que no hizo nada';
  });
} catch (e) { mal('Avisos y estadísticas: ' + (e && e.stack || e)); }

console.log('9. Colisiones del Santuario: todo lo que se ve choca');
if (!solo || solo === 'santuario') try {
  const M = C.MAPS.santuario, W = { brushes: M.brushes.map(b => ({ ...b })), bounds: M.bounds };
  // ningún bloque visible sin colisión (solo se permite lo marcado a propósito como atravesable)
  const fantasma = M.brushes.filter(b => b.nc && !b.atravesable);
  if (fantasma.length) mal(fantasma.length + ' bloques se ven pero no chocan, por ejemplo en ' + fantasma.slice(0, 3).map(b => b.min.map(v => v.toFixed(0)).join(',')).join(' · '));
  else ok('no hay geometría visible sin colisión (' + M.brushes.length + ' bloques)');
  // cada bloque sólido existe en la colisión: un jugador metido adentro choca, y un tiro que lo cruza se frena
  let cuerpo = 0, tiro = 0, prob = 0; const malos = [];
  for (const b of W.brushes) {
    if (b.bar || b.nc || b.ramp) continue; prob++;   // las rampas chocan por su pendiente, no por la caja entera
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    const H = b.max[1] - b.min[1];
    if (!C.solidAt(W, cx, b.min[1] + H * .25, cz, .01, Math.min(1.7, H * .5))) { cuerpo++; if (malos.length < 3) malos.push('cuerpo ' + [cx, cy, cz].map(v => v.toFixed(1))); }
    // el tiro sale de afuera (si el punto de salida está metido en otro bloque, ese costado no se puede pisar ni disparar: se saltea)
    const ox = b.min[0] - 2.5;
    if (C.solidAt(W, ox, cy - .01, cz, .01, .02)) continue;
    const h = C.raycast(W, ox, cy, cz, 1, 0, 0, 6);
    if (!h || h.t > 2.5 + 1e-3) { tiro++; if (malos.length < 3) malos.push('tiro ' + [cx, cy, cz].map(v => v.toFixed(1))); }
  }
  if (cuerpo || tiro) mal('se atraviesan ' + cuerpo + ' bloques caminando y ' + tiro + ' con disparos (de ' + prob + '): ' + malos.join(' · '));
  else ok('los ' + prob + ' bloques sólidos frenan al jugador y a los disparos');
} catch (e) { mal('Colisiones: ' + (e && e.stack || e)); }

console.log('10. Oleadas de minions (estilo LoL)');
if (!solo || solo === 'santuario') try {
  const D4 = C.DOM, dt = 1 / 40;
  const prueba = (nombre, f) => { try { const r = f(); if (r === true) ok(nombre); else mal(nombre + (r ? ': ' + r : '')); } catch (e) { mal(nombre + ': ' + (e && e.stack || e)); } };
  const partida = () => { const g = new C.Game({ mode: 'dominio', bots: 0 }); const id = g.addClient(() => {}); g.onMessage(id, { t: 'join', name: 'x' }); const p = g.players.get(id); p.s.y = -500; p.alive = false; return g; };
  prueba('la primera oleada sale a los ' + D4.MIN.OLA_INI + ' s con ' + (D4.MIN.OLA_C + D4.MIN.OLA_D) + ' minions por carril y equipo', () => {
    const g = partida();
    for (let k = 0; k < 40 * (D4.MIN.OLA_INI - 1); k++) g.tick(dt);
    if (g.dom.mins.some(m => m.ola)) return 'salió antes de tiempo';
    for (let k = 0; k < 80; k++) g.tick(dt);
    for (const tm of [0, 1]) for (const l of [0, 1, 2]) { const n = g.dom.mins.filter(m => m.ola && m.team === tm && m.lane === l).length; if (n !== D4.MIN.OLA_C + D4.MIN.OLA_D) return 'equipo ' + tm + ' carril ' + l + ': ' + n; }
    return true;
  });
  prueba('sin rivales, cada oleada marcha por su carril, se frena en la barrera enemiga y daña los generadores', () => {
    const g = partida(), d = g.dom;
    g.domOla(); for (const m of d.mins) if (m.team === 1) m.hp = 0;   // solo el equipo rojo, sin guardianes azules
    const res = [];
    for (let k = 0; k < 40 * 70; k++) { g.tick(dt); for (const m of d.mins) if (m.team === 1 && m.hp > 0) { m.hp = 0; } }
    for (let l = 0; l < 3; l++) {
      const ms = d.mins.filter(m => m.ola && m.team === 0 && m.lane === l && m.hp > 0);
      const bar = C.MAPS.santuario.bars.find(b => b.team === 1 && b.lane === l);
      if (!ms.length) return 'el carril ' + l + ' se quedó sin minions';
      if (ms.some(m => m.x < bar.x - .5)) return 'un minion del carril ' + l + ' cruzó la barrera azul cerrada';
      const gs = d.gens.filter(q => q.team === 1 && q.lane === l), daño = gs.reduce((s, q) => s + D4.GEN_HP - q.hp, 0);
      if (!(daño > 0)) return 'el carril ' + l + ' no les sacó vida a los generadores (minions en x≈' + Math.round(ms[0].x) + ')';
      if (daño > D4.GEN_HP) return 'el carril ' + l + ' hizo demasiado daño (' + Math.round(daño) + ')';
      res.push(Math.round(daño));
    }
    return true;
  });
  prueba('dos oleadas que se cruzan se pelean', () => {
    const g = partida(), d = g.dom;
    for (const m of d.mins) m.hp = 0;
    g.domOla(); const n0 = d.mins.filter(m => m.ola && m.hp > 0).length;
    for (let k = 0; k < 40 * 30; k++) g.tick(dt);
    const n1 = d.mins.filter(m => m.ola && m.hp > 0).length;
    return n1 < n0 || 'no murió ninguno en 30 s (' + n0 + ' → ' + n1 + ')';
  });
  prueba('los guardianes son ' + D4.MIN.POR_GEN + ' por generador y el último golpe da créditos con bono', () => {
    const g = partida(), d = g.dom;
    for (let gi = 0; gi < d.gens.length; gi++) { const n = d.mins.filter(m => !m.ola && m.gen === gi && m.hp > 0).length; if (n !== D4.MIN.POR_GEN) return 'el generador ' + gi + ' tiene ' + n; }
    const id = g.addClient(() => {}); g.onMessage(id, { t: 'join', name: 'y' }); const p = g.players.get(id); const cr0 = p.cr;
    const m = d.mins.find(q => q.team !== p.team && q.hp > 0); g.domMinDamage(m, 1e4, p);
    return p.cr - cr0 === D4.MIN.CRED + D4.MIN.LAST_HIT || 'dio ' + (p.cr - cr0) + ' créditos';
  });
} catch (e) { mal('Oleadas: ' + (e && e.stack || e)); }

console.log(fallas ? '\n' + fallas + ' problema(s).' : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
