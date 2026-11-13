/* ---------- Minions defensores (cliente) ----------
   Versiones chiquitas de los bosses: cuerpo blanco, núcleo y remates del color de su equipo. El servidor
   manda posición, giro, vida y estado (src/nucleo/07-partida/5c-minions.js) cada dos snapshots y acá se
   interpola. La geometría se arma una sola vez por equipo y tipo, y cada minion es un grupo de tres piezas,
   así treinta minions cuestan pocas mallas. A más de MLOD metros no se dibujan. */
const MN = { on: false, m: new Map(), geo: null, MLOD: 95 };
function mnGeos() {
  if (MN.geo) return MN.geo;
  const WH = 0xe9edf0, DK = 0x22252b, MT = 0x8b9098;
  const cuerpo = (kind) => {
    const p = [[dmBox(.62, .5, .42, 0, .95, 0), WH], [dmBox(.5, .22, .34, 0, 1.24, 0), DK],
      [dmBox(.46, .34, .4, 0, 1.5, 0), WH], [dmBox(.3, .1, .06, 0, 1.52, -.21), DK]];
    for (const s of [-1, 1]) {
      p.push([dmBox(.16, .52, .18, s * .2, .4, 0), DK], [dmBox(.22, .12, .3, s * .2, .08, -.04), MT]);
      if (kind) p.push([dmCyl(.07, .1, .5, 6, s * .42, 1.02, -.1, 1.5708), MT]);      // cañoncito
      else p.push([dmBox(.14, .44, .14, s * .42, .92, .04, .35), MT]);                 // garra
    }
    return dmGeo(p);
  };
  MN.geo = { cuerpo: [cuerpo(0), cuerpo(1), cuerpo(0)], nucMat: [0, 1].map(t => new THREE.MeshBasicMaterial({ color: DCOL[t], fog: false })), nucleo: new THREE.SphereGeometry(.13, 8, 6), halo: new THREE.SphereGeometry(.3, 8, 6) };
  return MN.geo;
}
function mnBuild(team, kind) {
  const G_ = mnGeos(), g = new THREE.Group();
  const cuerpo = new THREE.Mesh(G_.cuerpo[kind], dmMat());
  // dos mallas por minion y materiales compartidos por equipo: cien minions no cambian de shader ni de estado
  const nuc = new THREE.Mesh(G_.nucleo, G_.nucMat[team]);
  nuc.position.set(0, .95, -.2);
  const halo = { material: { opacity: 0 }, visible: false };   // el halo transparente se sacó: costaba una malla por minion
  if (kind === 2) g.scale.setScalar(1.55);                      // asedio: el grandote
  g.add(cuerpo, nuc);
  return { g, cuerpo, nuc, halo };
}
function mnClear() { for (const o of MN.m.values()) scene.remove(o.g); MN.m.clear(); MN.on = false; }
function mnSet(arr) {
  if (!DM.on) return;
  MN.on = true;
  if (!arr) return;
  for (let i = 0; i < arr.length; i += 6) {
    const id = arr[i], x = arr[i + 1], y = arr[i + 2], z = arr[i + 3], yaw = arr[i + 4] / 10, hs = arr[i + 5];
    const kind = hs & 3, team = (hs >> 2) & 1, st = (hs >> 3) & 3, hp = (hs >> 5) / 100;
    let o = MN.m.get(id);
    if (!o) { o = mnArma(id, team, kind, x, y, z); o.nace = 0; }   // entró a mitad de partida: lo arma sin efecto
    o.tx = x; o.ty = y; o.tz = z; o.tyaw = yaw; o.hp = hp; o.st = st;
  }
}
function mnArma(id, team, kind, x, y, z) {
  const o = mnBuild(team, kind);
  o.id = id; o.team = team; o.kind = kind; o.hp = 1; o.st = 0; o.ph = Math.random() * 6; o.t = 0; o.golpe = 0; o.nace = .5;
  o.x = o.tx = x; o.y = o.ty = y; o.z = o.tz = z; o.yaw = o.tyaw = 0;
  o.g.position.set(x, y, z); scene.add(o.g); MN.m.set(id, o);
  return o;
}
function mnEvent(m) {
  if (m.a === 'min+') {
    if (MN.m.has(m.i)) return;
    MN.on = true;
    const o = mnArma(m.i, m.b, m.k, m.p[0], m.p[1], m.p[2]);
    SFX.minUp(vAt(o.x, o.y + 1, o.z));
    for (let k = 0; k < 10; k++) emit(sparks, o.x + R(.5), o.y + .4 + Math.random(), o.z + R(.5), R(2), 2 + Math.random() * 2, R(2), .5, m.b ? .3 : 1, .7, m.b ? 1 : .3, 1);
  } else if (m.a === 'min-') {
    const o = MN.m.get(m.i); if (!o) return;
    MN.m.delete(m.i); scene.remove(o.g);
    if (m.off) { SFX.minOff(vAt(m.p[0], m.p[1], m.p[2])); for (let k = 0; k < 8; k++) emit(sparks, m.p[0] + R(.4), m.p[1] + .6, m.p[2] + R(.4), R(1), 1, R(1), 1.1, .3, .3, .3, -1); }
    else { fxSparks(m.p[0], m.p[1] + .8, m.p[2], [0, 1, 0], 12); SFX.minDie(vAt(m.p[0], m.p[1], m.p[2])); for (let k = 0; k < 14; k++) emit(sparks, m.p[0], m.p[1] + .7, m.p[2], R(5), 1 + Math.random() * 4, R(5), .8, .9, .9, .95, 3); }
  } else if (m.a === 'minfire') {
    const o = MN.m.get(m.i); if (!o) return;
    o.golpe = .25; fxTracer([o.x, o.y + 1.05, o.z], m.p); SFX.minShot(vAt(o.x, o.y + 1, o.z));
  } else if (m.a === 'minhit') {
    const o = MN.m.get(m.i); if (!o) return;
    o.golpe = .3; SFX.minMelee(vAt(o.x, o.y + 1, o.z));
  }
}
function updMins(dt) {
  if (!MN.on) return;
  const cx = camera.position.x, cz = camera.position.z;
  for (const o of MN.m.values()) {
    const vis = Math.hypot(o.x - cx, o.z - cz) < MN.MLOD;
    if (o.g.visible !== vis) o.g.visible = vis;
    const k = Math.min(1, dt * 12);
    o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.z += (o.tz - o.z) * k;
    let dy = o.tyaw - o.yaw; while (dy > Math.PI) dy -= 6.2832; while (dy < -Math.PI) dy += 6.2832;
    o.yaw += dy * Math.min(1, dt * 10);
    if (!vis) continue;
    o.t += dt; o.golpe = Math.max(0, o.golpe - dt); o.nace = Math.max(0, (o.nace || 0) - dt);
    const and = o.st === 1 || o.st === 3, bob = and ? Math.abs(Math.sin(o.t * 9)) * .09 : Math.sin(o.t * 1.6 + o.ph) * .025;
    o.g.position.set(o.x, o.y + bob, o.z);
    o.g.rotation.y = o.yaw + (o.st === 0 ? Math.sin(o.t * .5 + o.ph) * .5 : 0);   // en el puesto mira para los costados
    o.g.rotation.x = and ? .1 : 0 + (o.golpe > 0 ? -o.golpe * 1.2 : 0);
    o.g.scale.setScalar((o.kind === 2 ? 1.55 : 1) * (o.nace > 0 ? 1 - o.nace * 1.3 : 1));
    o.halo.material.opacity = (.14 + .1 * o.hp) + o.golpe * .4;
    o.nuc.scale.setScalar(o.hp < .4 && Math.sin(o.t * 16) > 0 ? 1.6 : 1);
  }
}
// el jugador les dispara: se cobra igual que a un rival, con id negativo (-1000 - id del minion)
function mnClaim(claims, ex, ey, ez, dd, wt) {
  if (!MN.on) return null;
  let best = null, bt = wt;
  for (const o of MN.m.values()) {
    if (o.team === myTeam) continue;
    const cx = o.x - ex, cy = o.y + .95 - ey, cz = o.z - ez, pr = cx * dd[0] + cy * dd[1] + cz * dd[2];
    if (pr < .3 || pr > bt) continue;
    if (Math.hypot(cx - dd[0] * pr, cy - dd[1] * pr, cz - dd[2] * pr) > .75) continue;
    bt = pr; best = o;
  }
  if (!best) return null;
  const id = -1000 - best.id, c = claims.get(id) || [id, 0, 0]; c[1]++; claims.set(id, c);
  fxSparks(best.x, best.y + .95, best.z, [0, 1, 0], 5);
  return best;
}
Object.assign(SFX, {
  minUp: v => { if (v <= 0) return; tn({ type: 'square', f0: 300, f1: 900, dur: .18, vol: .1 * v }); nz({ dur: .2, f0: 1200, f1: 400, vol: .18 * v }); },
  minOff: v => { if (v <= 0) return; tn({ type: 'sawtooth', f0: 500, f1: 60, dur: .5, vol: .14 * v }); },
  minDie: v => { if (v <= 0) return; nz({ dur: .35, f0: 2600, f1: 200, vol: .5 * v }); tn({ type: 'square', f0: 700, f1: 90, dur: .3, vol: .12 * v }); },
  minShot: v => { if (v <= 0) return; tn({ type: 'square', f0: 1100, f1: 520, dur: .09, vol: .09 * v }); },
  minMelee: v => { if (v <= 0) return; nz({ dur: .12, f0: 3000, f1: 700, type: 'bandpass', q: 1.5, vol: .3 * v }); }
});
