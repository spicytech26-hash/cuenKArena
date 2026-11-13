/* ---------- El Santuario Dual (Captura el dominio) ----------
   El mapa más grande del juego: 320 × 96 m, simétrico respecto de x = 0. Azul al oeste (x < 0), rojo al este (x > 0).
   De punta a punta: fortaleza · barreras y generadores · tierra de nadie (cañón con río) · barreras · fortaleza.
   Tres carriles: norte (terraza alta a 6 m y puente alto), centro (puente largo y plaza con el punto de poder)
   y sur (túnel bajo tierra a -6 m que cruza el cañón por un tubo).
   `u` es la distancia al centro: cada mitad se arma una vez y se espeja con sx. */
function buildSantuario() {
  const { lava, spawns, lights, add, wall, D, face, I, finish } = mapKit();
  const tspawns = [[], []], fspawns = [[], []], gens = [], bars = [], bosses = [], bossPts = [[], []], defPts = [[], []], deco = [];
  const GATES = [[-40, -30], [-5, 5], [31, 41]];   // portones norte, centro y sur (z0, z1)
  /* ---- bordes, cañón y río ---- */
  add(-161, -16, -49, 161, 13, -48, 'wall'); add(-161, -16, 48, 161, 13, 49, 'wall');
  add(-34, -16, -48, 34, -15, 48, 'rock');
  lava.push({ min: [-34, -15, -48], max: [34, -12.5, 48], dps: 999, water: 1 });
  /* ---- plaza neutral con el punto de poder ---- */
  add(-14, -16, -14, 14, 0, 14, 'floor');
  add(-2, 0, -2, 2, .4, 2, 'metal'); I('quad', 0, .4, 0);
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) add(x - 1, 0, z - 1, x + 1, 5, z + 1, 'wall');
  add(-3, 0, -11, 3, 1.3, -10, 'crate'); add(-3, 0, 10, 3, 1.3, 11, 'crate'); add(-12, 0, -5, -11, 1.3, -2, 'crate'); add(11, 0, 2, 12, 1.3, 5, 'crate');
  I('health', 0, 0, -12); I('health', 0, 0, 12);
  /* ---- los tres cruces del cañón ---- */
  add(-34, -1, -4, -14, 0, 4, 'floor'); add(14, -1, -4, 34, 0, 4, 'floor');   // centro: puente largo
  add(-40, 5, -40, 40, 6, -32, 'floor'); I('mega', 0, 6, -36);                  // norte: puente alto
  add(-34, -7, 30, 34, -6, 42, 'floor');                                        // sur: tubo
  add(-34, -6, 29, 34, -1.5, 30, 'metal'); add(-34, -6, 42, 34, -1.5, 43, 'metal'); add(-34, -1.5, 29, 34, -1, 43, 'metal');
  I('armorH', 0, -6, 36);
  lights.push({ x: 0, y: 5, z: 0, c: 0xfff0c0, i: 1.4, d: 30 }, { x: 0, y: -3, z: 36, c: 0xffb060, i: 1, d: 26 }, { x: 0, y: 9, z: -36, c: 0xc0d0ff, i: 1, d: 26 });
  for (const sx of [1, -1]) {
    const team = sx > 0 ? 0 : 1, col = team ? 0x3a8bff : 0xff7a20;
    const A = (u0, y0, z0, u1, y1, z1, mat, ex) => add(sx * u0, y0, z0, sx * u1, y1, z1, mat, ex);
    const P = (u, y, z) => ({ x: sx * u, y, z });
    /* ---- suelo ---- */
    A(34, -16, -48, 160, 0, 24, 'floor'); A(102, -16, 24, 160, 0, 48, 'floor');
    A(160, -16, -49, 161, 18, 49, 'wall');
    /* ---- carril sur: túnel (piso a -6) con la superficie arriba ---- */
    A(34, -16, 24, 90, -6, 48, 'concrete');
    A(34, -6, 24, 90, 0, 30, 'rock'); A(34, -6, 42, 90, 0, 48, 'rock'); A(34, -1.5, 30, 90, 0, 42, 'floor');
    A(90, -16, 24, 102, 0, 30, 'rock'); A(90, -16, 42, 102, 0, 48, 'rock');
    A(90, -16, 30, 102, 0, 42, 'floor', { ramp: { axis: 'x', dir: sx, lo: -6, hi: 0 } });   // sale a la superficie frente al portón sur
    A(60, -6, 35, 62, -1.5, 37, 'wall'); A(76, -6, 33, 77, -4.6, 36, 'crate'); A(46, -6, 36, 47, -4.6, 39, 'crate');
    A(56, 0, 34, 59, 3, 38, 'wall'); A(78, 0, 30, 81, 3, 34, 'wall'); A(68, 0, 43, 72, 1.3, 44, 'crate');
    lights.push({ x: sx * 50, y: -2.5, z: 36, c: 0xffb060, i: 1, d: 24 }, { x: sx * 75, y: -2.5, z: 36, c: col, i: 1, d: 24 });
    /* ---- carril norte: terraza a 6 m ---- */
    A(40, 0, -48, 100, 6, -24, 'rock');
    A(100, 0, -40, 110, 6, -30, 'floor', { ramp: { axis: 'x', dir: -sx, lo: 0, hi: 6 } });   // baja al portón norte
    A(56, 0, -24, 66, 6, -12, 'floor', { ramp: { axis: 'z', dir: -1, lo: 0, hi: 6 } });        // sube desde el carril del centro
    A(60, 6, -40, 63, 9, -36, 'wall'); A(82, 6, -34, 85, 8.5, -30, 'wall'); A(72, 6, -46, 76, 7.3, -45, 'crate'); A(48, 6, -31, 49, 7.3, -27, 'crate');
    /* ---- carril del centro ---- */
    A(44, 0, 22, 64, 5, 24, 'wall'); A(72, 0, 22, 96, 5, 24, 'wall');
    A(48, 0, -7, 51, 4, 1, 'wall'); A(74, 0, -1, 77, 4, 7, 'wall'); A(92, 0, -9, 95, 3, -4, 'wall');
    A(62, 0, 9, 66, 1.3, 10, 'crate'); A(84, 0, 13, 85, 1.3, 17, 'crate'); A(40, 0, 8, 41, 1.3, 12, 'crate');
    /* ---- frente de la fortaleza: tres portones con barrera y dos generadores cada uno ---- */
    wall(Math.min(sx * 112, sx * 114), -48, Math.max(sx * 112, sx * 114), 48, 0, 18, GATES.map(g => D(g[0], g[1], 0, 6)), 'wall');
    // campo permanente por encima del muro: nadie del equipo rival entra saltando, con cohetes o caminando por el borde del mapa.
    // La ÚNICA entrada es un portón con la barrera caída (este campo no tiene generadores y no cae nunca: i = 250)
    A(112, 6, -49, 114, 70, 49, 'clip', { bar: { team, lane: -1, i: 250, down: false }, nonav: 1 });
    GATES.forEach((g, lane) => {
      const i = bars.length, mid = (g[0] + g[1]) / 2;
      A(112, 0, g[0], 114, 6, g[1], 'clip', { bar: { team, lane, i, down: false } });
      bars.push({ team, lane, x: sx * 113, y: 0, z: mid, w: g[1] - g[0], h: 6 });
      defPts[team].push(P(118, 0, mid));
      for (const za of [g[0] - 3, g[1] + 1]) {
        A(107, 0, za, 109, 3.2, za + 2, 'clip', { gen: gens.length });
        // desde dónde se lo ataca: la terraza (norte), el carril (centro) o los costados de la rampa (sur)
        const atk = lane === 0 ? P(97, 6, za + 1 < mid ? -43 : -27) : lane === 1 ? P(94, 0, za + 1) : P(94, 0, za + 1 < mid ? 27 : 45);
        gens.push({ team, lane, x: sx * 108, y: 0, z: za + 1, atk });
        if (lane) A(102, 0, za - .5, 103, 1.2, za + 2.5, 'crate');   // algo de cobertura para el que lo defiende
      }
      lights.push({ x: sx * 110, y: 5, z: mid, c: col, i: 1.3, d: 26 });
    });
    /* ---- fortaleza: muro que tapa al boss, sala del boss y apariciones ---- */
    A(122, 0, -22, 124, 18, 22, 'wall');
    A(140, 0, -2, 144, DOM.BOSS_H, 2, 'clip', { boss: team });
    bosses[team] = { x: sx * 142, y: 0, z: 0, yaw: face(sx * 142, 0, 0, 0) };
    bossPts[team].push(P(130, 0, -28), P(130, 0, 28));
    A(148, 0, -46, 149, 5, -24, 'wall'); A(148, 0, 24, 149, 5, 46, 'wall');
    A(132, 0, -40, 135, 3, -36, 'wall'); A(132, 0, 36, 135, 3, 40, 'wall'); A(128, 0, -14, 129, 1.3, -10, 'crate'); A(128, 0, 10, 129, 1.3, 14, 'crate');
    for (const z of [-42, -37, -32, -27, 27, 32, 37, 42]) tspawns[team].push({ x: sx * 154, y: 0, z, yaw: face(sx * 154, z, 0, z) });
    // reaparición adelantada: a mitad del carril rival que tu equipo ya abrió (del lado del otro equipo)
    fspawns[1 - team] = [P(72, 6, -38), P(68, 0, 15), P(70, 0, 37)].map(p => ({ x: p.x, y: p.y, z: p.z, yaw: face(p.x, p.z, sx * 160, p.z) }));
    lights.push({ x: sx * 142, y: 10, z: 0, c: col, i: 1.6, d: 34 }, { x: sx * 154, y: 4, z: -34, c: 0xffe0b0, i: 1, d: 20 }, { x: sx * 154, y: 4, z: 34, c: 0xffe0b0, i: 1, d: 20 });
    /* ---- ítems ---- */
    I('health', sx * 100, 0, -20); I('health', sx * 100, 0, 18); I('health', sx * 118, 0, -14); I('health', sx * 118, 0, 14);
    I('armor', sx * 70, 6, -44); I('w8', sx * 90, 6, -45); I('w3', sx * 60, -6, 32); I('w5', sx * 80, 0, 3);
    I('bullets', sx * 150, 0, -22); I('shells', sx * 150, 0, 22); I('rockets', sx * 118, 0, 0); I('slugs', sx * 66, 0, 40);
    deco.push({ t: 'glow', x: sx * 142, y: 16, z: 0, c: col, s: 6 });
  }
  spawns.push(...tspawns[0], ...tspawns[1]);
  return finish({ id: 'santuario', name: 'dom1 · El Santuario Dual', bounds: { x0: -161, x1: 161, z0: -49, z1: 49 }, tspawns, fspawns, gens, bars, bosses, bossPts, defPts, deco,
    theme: { sky: 'halloween', tex: 'ruina', fog: 0x0e1420, fogD: .0038, amb: 0x7080a8, ambI: .62, hemi: [0x8aa0d8, 0x40301c, .6], sun: true, sunC: 0xc8d4ff, sunI: .5, sunPos: [10, 70, 40], shadowRes: 4096, shBias: -.0004, shNormal: .08, shFar: 320 } });
}
MAPDEFS.santuario = buildSantuario;
