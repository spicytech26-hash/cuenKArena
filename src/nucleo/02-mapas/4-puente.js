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

