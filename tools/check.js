// Chequeo rápido y barato (sin navegador): node tools/check.js
// 1) sintaxis de los <script> de index.html  2) game.js carga  3) cada mapa: navegación de bots,
// ítems apoyados en el piso y alcanzables, y 30 s de partida simulada con bots sin errores.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), os = require('os');
const root = path.join(__dirname, '..');
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('  ✗ ' + m); } };

const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const tmp = path.join(os.tmpdir(), 'cuenk_inline.js'); fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log('index.html: sintaxis ok'); }
catch (e) { bad++; console.log('index.html: ERROR de sintaxis\n' + String(e.stderr).slice(0, 800)); }

const C = require(path.join(root, 'public/game.js'));
console.log('game.js: carga ok · mapas:', C.MAP_IDS.join(', '));
for (const id of C.MAP_IDS) {
  const W = C.MAPS[id]; const t0 = Date.now();
  C.getNav(W);
  for (const it of W.items) {
    const h = C.raycast(W, it.x, it.y + 2, it.z, 0, -1, 0, 6), fy = h ? it.y + 2 - h.t : null;
    ok(fy != null && Math.abs(fy - it.y) < .3, `${id}: ítem ${it.type} en (${it.x}, ${it.y}, ${it.z}) no está apoyado en el piso (piso a ${fy == null ? '—' : fy.toFixed(2)})`);
  }
  const mode = Object.keys(C.MODES).find(m => C.MODES[m].maps.includes(id)) || 'arena';
  try {
    const g = new C.Game({ map: id, mode, bots: 6, botFill: 6 });
    for (let i = 0; i < 40 * 30; i++) g.tick(1 / 40);
  } catch (e) { bad++; console.log(`  ✗ ${id}: la simulación tiró error: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  console.log(`${id}: ${W.items.length} ítems, ${W.spawns.length} apariciones · ${Date.now() - t0} ms`);
}
console.log(bad ? `\n${bad} problema(s)` : '\nTodo ok');
process.exit(bad ? 1 : 0);
