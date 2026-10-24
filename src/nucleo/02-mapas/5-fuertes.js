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

