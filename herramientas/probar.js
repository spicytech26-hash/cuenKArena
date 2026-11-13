#!/usr/bin/env node
/* Prueba rápida, sin navegador (tarda unos segundos):
   1. public/ está armado con lo último de src/
   2. el código del cliente (index.html) y del editor no tiene errores de sintaxis
   3. cada mapa se arma, tiene apariciones y los bots encuentran caminos
   4. una partida corta con bots en cada modo y mapa no tira errores
   5. todos los botiquines y escudos se pueden agarrar
   6. Captura el dominio: barreras, bloqueo por equipo, núcleo del boss, fin de partida y desempates
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
    const corre = (p, x, dir) => { p.s = { x, y: 0, z: 0, vx: 0, vy: 0, vz: 0, on: true, tm: p.team }; for (let k = 0; k < 60; k++) C.pmove(g.W, p.s, { wx: dir, wz: 0 }, dt); return p.s.x; };
    let x = corre(azul, 108, 1); if (x > 112) return 'el rival atravesó la barrera (x = ' + x.toFixed(1) + ')';
    x = corre(rojo, 117, -1); if (x > 111) return 'el defensor no pudo salir por su barrera (x = ' + x.toFixed(1) + ')';
    x = corre(rojo, 108, 1); if (x < 115) return 'el defensor no pudo entrar por su barrera';
    while (d.gens[2].hp > 0) g.domHit(azul, 'g', 2, 200, false); while (d.gens[3].hp > 0) g.domHit(azul, 'g', 3, 200, false);
    x = corre(azul, 108, 1); return x > 115 || 'con la barrera caída el rival tendría que pasar (x = ' + x.toFixed(1) + ')';
  });

  prueba('la barrera frena los disparos y proyectiles del rival, no los del defensor', () => {
    const { g } = nueva();
    const rayo = eq => { const o = C.setPasa(eq); try { return C.raycast(g.W, 100, 1.5, 0, 1, 0, 0, 80); } finally { C.setPasa(o); } };
    const a = rayo(1), r = rayo(0);
    if (!a || !a.b.bar || !cerca(a.t, 12, .01)) return 'la bala rival no pegó en la barrera';
    if (!r || r.b.bar || r.t < 20) return 'la bala del defensor se frenó en su barrera';
    const cohete = eq => { const o = C.setPasa(eq), pr = { k: 'rocket', x: 100, y: 1.5, z: 0, v: [44, 0, 0], life: 6 }; try { for (let k = 0; k < 40; k++) if (C.projStep(g.W, pr, dt)) break; return pr.x; } finally { C.setPasa(o); } };
    if (cohete(1) > 112.1) return 'el cohete rival atravesó la barrera';
    if (cohete(0) < 120) return 'el cohete del defensor explotó en su barrera';
    const o = C.setPasa(1), ve = C.los(g.W, 100, 1.5, 0, 118, 1.5, 0); C.setPasa(o);
    return !ve || 'hay línea de visión a través de la barrera rival';
  });

  prueba('ni disparos ni explosiones dañan la barrera: solo los generadores', () => {
    const { g, d, azul } = nueva();
    g.domBlast(azul, 111.5, 2, 0, 4.5, 60, .75, null);   // explosión pegada a la barrera, lejos de los generadores
    return d.bars[1].st === 0 && d.gens.every(q => q.hp === D.GEN_HP) || 'la explosión contra la barrera cambió algo';
  });

  prueba('el núcleo del boss recibe más daño que el cuerpo', () => {
    const { g, d, azul } = nueva();
    const cuerpo = g.domHit(azul, 'b', 0, 100, false), nucleo = g.domHit(azul, 'b', 0, 100, true);
    if (!cerca(cuerpo, 100) || !cerca(nucleo, 100 * D.CORE_MULT)) return 'cuerpo ' + cuerpo + ', núcleo ' + nucleo;
    // geometría: de frente y a la altura del pecho es núcleo; a los pies o por la espalda, cuerpo
    const b = d.boss[0], f = C.dirFromAngles(b.yaw, 0), tiro = (ox, oy, oz) => { const dx = b.x - ox, dz = b.z - oz, l = Math.hypot(dx, dz), dir = [dx / l, 0, dz / l], o = C.setPasa(0); try { return g.domStruct([ox, oy, oz], dir, C.raycast(g.W, ox, oy, oz, dir[0], dir[1], dir[2], 60)); } finally { C.setPasa(o); } };
    const frente = tiro(b.x + f[0] * 12, b.y + D.CORE_Y, b.z + f[2] * 12), pies = tiro(b.x + f[0] * 12, b.y + 2, b.z + f[2] * 12), espalda = tiro(b.x - f[0] * 12, b.y + D.CORE_Y, b.z - f[2] * 12);
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
    const ini = C.MAPS.santuario.tspawns[1][0], meta = M.bossPts[0][0];
    const a = nav.nodeAt(ini.x, ini.y + .2, ini.z), b = nav.nodeAt(meta.x, meta.y + .2, meta.z);
    if (!a || !b) return 'faltan nodos de navegación';
    if (C.dijkstra(nav, a.id, g.domBan(1)).dist[b.id] < Infinity) return 'hay camino al boss rojo con las tres barreras cerradas';
    if (!(C.dijkstra(nav, C.MAPS.santuario.tspawns[0][0] && nav.nodeAt(M.tspawns[0][0].x, .2, M.tspawns[0][0].z).id, g.domBan(0)).dist[nav.nodeAt(0, .6, 6).id] < Infinity)) return 'el defensor no puede salir de su fortaleza';
    while (d.gens[0].hp > 0) g.domHit(azul, 'g', 0, 200, false); while (d.gens[1].hp > 0) g.domHit(azul, 'g', 1, 200, false);
    const dist = C.dijkstra(nav, a.id, g.domBan(1)).dist[b.id];
    if (!(dist < Infinity)) return 'con la ruta norte abierta no hay camino al boss';
    const seg = dist / C.K.MAXSPD;
    console.log('      de la aparición azul al boss rojo por el norte: ' + Math.round(dist) + ' m, ' + seg.toFixed(0) + ' s corriendo');
    return seg > 28 && seg < 45 || 'cruzar el mapa tarda ' + seg.toFixed(0) + ' s (tendría que andar entre 30 y 40)';
  });

  prueba('el mapa mide al menos 2,5 veces el más grande de los demás', () => {
    const area = W_ => (W_.bounds.x1 - W_.bounds.x0) * (W_.bounds.z1 - W_.bounds.z0), yo = area(C.MAPS.santuario);
    const otro = Math.max(...C.MAP_IDS.filter(k => k !== 'santuario').map(k => area(C.MAPS[k])));
    return yo >= otro * 2.5 || 'mide ' + (yo / otro).toFixed(2) + ' veces';
  });

  prueba('partida entera con bots: abren una ruta y se pegan con el boss sin errores', () => {
    const g = new C.Game({ mode: 'dominio', bots: 10, botSkill: 2 });
    for (let k = 0; k < 40 * 420 && g.state === 'play'; k++) g.tick(dt);
    const d = g.dom, s = d.stat[0].gens + d.stat[1].gens;
    return s > 0 || 'en 7 minutos los bots no rompieron ningún generador';
  });
} catch (e) { mal('Captura el dominio: ' + (e && e.stack || e)); }

console.log(fallas ? '\n' + fallas + ' problema(s).' : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
