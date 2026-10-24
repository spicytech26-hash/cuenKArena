#!/usr/bin/env node
/* Prueba rápida, sin navegador (tarda unos segundos):
   1. public/ está armado con lo último de src/
   2. el código del cliente (index.html) y del editor no tiene errores de sintaxis
   3. cada mapa se arma, tiene apariciones y los bots encuentran caminos
   4. una partida corta con bots en cada modo y mapa no tira errores
   5. todos los botiquines y escudos se pueden agarrar
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

console.log(fallas ? '\n' + fallas + ' problema(s).' : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
