/* ---------- El Cuarto Tramo — Costanera de Posadas, Misiones ----------
   La vieja estación de ladrillo al atardecer, frente al Paraná. Norte = -z (el edificio), sur = +z (el río).
   · Edificio central de dos pisos con cuatro arcadas, hall, escaleras adentro y balcón sobre la fachada.
   · Dos alas bajas (oeste y este) con el techo transitable (6 m), unidas al piso alto del edificio y con
     escaleras de andamio por afuera. Un saltador en cada lado sube al techo del ala.
   · Andén con las vías y la locomotora «La Posadeña»: la cabina del maquinista se atraviesa por las dos puertas.
   · Vereda frente al edificio y, más al sur, la costanera: paseo elevado con baldosas, bancos, glorietas, palmeras,
     farolas, gradas hasta el agua y dos muelles. El Paraná mata al instante.
   · Portales escondidos y lejos: el amarillo adentro del ala oeste, el azul al fondo del techo del ala este. */
function buildCuartoTramo() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();
  const deco = [];
  /* ---- suelo, río y límites ---- */
  add(-62, -2, -40, 62, -.03, 24, 'grass');                              // pasto base (patios laterales y fondo)
  add(-50, -2, -26, 50, 0, 8, 'concrete');                               // andén / explanada
  add(-62, -2, 8, 62, 1, 20, 'tiles');                                   // costanera: paseo elevado 1 m
  add(-22, -2, -40, 22, 0, -26, 'tiles');                                // piso del hall
  add(-50, -2, -40, -22, 0, -26, 'concrete'); add(22, -2, -40, 50, 0, -26, 'concrete');   // pisos de las alas
  add(-50, 0, -26, 50, .2, -23.6, 'brick');                              // vereda de ladrillo frente al edificio
  stairs(-62, 20, 62, 24, -1, .5, 4, 'z', -1, 'step');                   // gradas de la costanera hasta el río
  lava.push({ min: [-62, -4, 24], max: [62, -1, 42], water: true, dps: 0 });   // el Paraná: agua que mata
  add(-62, -6, 24, 62, -4, 42, 'rock');
  add(-63, -4, -43, 63, 12, -40, 'brick');                               // límites: norte (fondo del edificio), oeste, este y sur
  add(-63, -4, -43, -62, 12, 42, 'block'); add(62, -4, -43, 63, 12, 42, 'block');
  add(-63, -4, 42, 63, 8, 43, 'fence');
  // rampas anchas desde el andén a la costanera
  for (const x of [-42, -6, 32]) ramp(x, 2, x + 10, 8, 0, 0, 1, 'z', 1, 'concrete');
  // franjas rojas y celestes de la costanera (solo pintura)
  add(-62, 1, 11.8, 62, 1.02, 12.2, 'brick', { nc: 1 }); add(-62, 1, 16.8, 62, 1.02, 17.2, 'brick', { nc: 1 });
  /* ---- edificio central: fachada con cuatro arcadas, ventanas y balcón ---- */
  wall(-22, -26.4, 22, -26, 0, 12, [D(-9.3, -5.7, 0, 4.2), D(-4.3, -.7, 0, 4.2), D(.7, 4.3, 0, 4.2), D(5.7, 9.3, 0, 4.2),
    D(-19, -16.6, 7.2, 9.6), D(-14.6, -12.2, 7.2, 9.6), D(-10, -7.6, 7.2, 9.6), D(-2, 2, 6, 9.8), D(7.6, 10, 7.2, 9.6), D(12.2, 14.6, 7.2, 9.6), D(16.6, 19, 7.2, 9.6)], 'brick');
  wall(-22.4, -40, -22, -26, 0, 12, [D(-37, -33, 0, 3.4), D(-38, -31, 6, 9.4)], 'brick');   // paredes laterales con paso al ala (abajo) y al techo del ala (arriba)
  wall(22, -40, 22.4, -26, 0, 12, [D(-37, -33, 0, 3.4), D(-38, -31, 6, 9.4)], 'brick');
  add(-22.4, 12, -40, 22.4, 12.4, -25.8, 'roof');                        // techo
  add(-8, 12.4, -26.4, 8, 13.4, -26, 'brick'); add(-5, 13.4, -26.4, 5, 14.2, -26, 'brick');   // frontis
  // piso alto: losa con dos huecos de escalera; balcón sobre las arcadas
  add(-22, 5.6, -40, 22, 6, -30, 'tiles'); add(-10, 5.6, -30, 10, 6, -26, 'tiles'); add(-4, 5.6, -26.4, 4, 6, -23, 'tiles');
  add(-4, 6, -23.1, 4, 7, -23, 'rail', { nc: 1 }); add(-4, 6, -26, -3.9, 7, -23, 'rail', { nc: 1 }); add(3.9, 6, -26, 4, 7, -23, 'rail', { nc: 1 });
  stairs(10, -30, 22, -26, 0, .5, 12, 'x', -1, 'step'); stairs(-22, -30, -10, -26, 0, .5, 12, 'x', 1, 'step');
  // hall: columnas, boletería y cajones
  for (const x of [-12, 12]) add(x - .4, 0, -34.4, x + .4, 5.6, -33.6, 'whitewall');
  add(-4, 0, -39.4, 4, 1.1, -38.2, 'wood'); add(-4, 1.1, -39.4, 4, 1.2, -38.2, 'navy');
  add(-19, 0, -39, -15, 1.25, -36.6, 'crate'); add(15, 0, -39, 19, 1.25, -36.6, 'crate'); add(-9, 0, -31.6, -6.4, 1.25, -30.6, 'crate'); add(6.4, 0, -31.6, 9, 1.25, -30.6, 'crate');
  // piso alto: estanterías y cajones de cobertura
  add(-18, 6, -36.6, -12, 7.2, -35.4, 'crate'); add(12, 6, -36.6, 18, 7.2, -35.4, 'crate'); add(-3, 6, -33, 3, 7.2, -31.8, 'crate');
  for (const s of [-1, 1]) {
    const ax = (x0, y0, z0, x1, y1, z1, m, e) => add(s * x0, y0, z0, s * x1, y1, z1, m, e);
    const mw = (x0, z0, x1, z1, y0, y1, doors, mat) => {
      const a = Math.min(s * x0, s * x1), b = Math.max(s * x0, s * x1), alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
      wall(a, z0, b, z1, y0, y1, alongX ? doors.map(d => { const p = [s * d[0], s * d[1]].sort((u, v) => u - v); return D(p[0], p[1], d[2], d[3]); }) : doors, mat);
    };
    /* ---- ala (oeste s=-1, este s=1): planta baja con puertas, techo transitable a 6 m ---- */
    mw(22.4, -26.4, 50.4, -26, 0, 5.6, [D(28, 32, 0, 3.6), D(40, 44, 0, 3.6)], 'brick');   // frente
    mw(50, -40, 50.4, -26, 0, 5.6, [D(-32, -28, 0, 3.4)], 'brick');                           // fondo, con puerta al patio
    ax(22.4, 5.6, -40, 50.4, 6, -25.8, 'roof');                                               // techo / pasarela
    ax(22.4, 6, -26.2, 50.4, 7, -26, 'rail', { nc: 1 });
    for (const x of [30, 42]) ax(x - .4, 0, -33.4, x + .4, 5.6, -32.6, 'whitewall');
    ax(25, 0, -39, 29, 1.25, -37, 'crate'); ax(33, 0, -30.8, 37, 1.25, -29.2, 'crate'); ax(32, 0, -39.2, 35.5, 1.25, -37.6, 'crate'); ax(36, 6, -38, 40, 7.2, -36.6, 'crate');
    // escalera de andamio por afuera hasta el techo del ala
    stairs(s * 57, -38, s * 61, -26, 0, .5, 12, 'z', -1, 'step');
    add(Math.min(s * 61, s * 50.4), 5.7, -41, Math.max(s * 61, s * 50.4), 6, -38, 'grate');
    ax(61, 6, -38, 61.1, 7, -26, 'rail', { nc: 1 }); ax(57, 6, -26.1, 61, 7, -26, 'rail', { nc: 1 }); ax(57, 6, -41, 61, 7, -40.9, 'rail', { nc: 1 });
    for (const z of [-40.6, -31, -26.4]) ax(60.7, 0, z, 61, z === -26.4 ? 1 : 5.7, z + .3, 'metal');
    // saltador desde el andén hasta el techo del ala
    pads.push({ x: s * 40, y: 0, z: -8, r: 1.1, t: [s * 40, 6, -30], apex: 3 });
    /* ---- patio lateral, grúa de fondo (solo se ve) ---- */
    ax(57.5, 0, -41.5, 59.5, 26, -39.5, 'truss', { nc: 1 }); ax(46, 26, -41, 59.5, 27, -40, 'truss', { nc: 1 });
    deco.push({ t: 'palm', x: s * 56, y: -.03, z: -14, h: 9 }, { t: 'bush', x: s * 55, y: -.03, z: -4, r: 1.1 }, { t: 'bush', x: s * 59, y: -.03, z: -22, r: 1 });
    /* ---- costanera: bancos, glorieta, farolas ---- */
    ax(14, 1, 12, 18, 1.45, 12.6, 'wood'); ax(14, 1.45, 12.5, 18, 2, 12.6, 'wood'); ax(42, 1, 12, 46, 1.45, 12.6, 'wood'); ax(42, 1.45, 12.5, 46, 2, 12.6, 'wood');
    for (const [x, z] of [[28, 11], [36, 11], [28, 17], [36, 17]]) ax(x, 1, z, x + .3, 4.4, z + .3, 'wood');
    ax(27.6, 4.4, 10.6, 36.4, 4.7, 17.4, 'roof');
    for (const x of [-8, 8, 20, 44, 56]) { const x0 = Math.min(s * x, s * x + 2); add(x0, 1, 9.2, x0 + 2, 1.6, 11.2, 'smooth'); deco.push({ t: 'palm', x: x0 + 1, y: 1.6, z: 10.2, h: 8 }); }
    for (const x of [12, 30, 48, 60]) { ax(x, 1, 19.5, x + .25, 5.6, 19.75, 'metal'); ax(x - .15, 5.6, 19.4, x + .4, 5.8, 19.85, 'light', { nc: 1 }); }
    for (const x of [15, 33, 52]) { ax(x, .2, -24.4, x + .25, 4.6, -24.15, 'metal'); ax(x - .15, 4.6, -24.5, x + .4, 4.8, -24.05, 'light', { nc: 1 }); }
    ax(2, 1, 19.9, 62, 2, 20, 'rail', { nc: 1 });
    /* ---- muelle sobre el río ---- */
    add(Math.min(s * 36, s * 46), -.9, 24, Math.max(s * 36, s * 46), -.5, 36, 'wood');
    for (const [x, z] of [[36, 24.2], [45.7, 24.2], [36, 35.7], [45.7, 35.7]]) ax(x, -4, z, x + .3, -.9, z + .3, 'wood');
  }
  // cajones y cobertura en el andén (1,25 m: se saltan)
  add(-9, 0, -6, -6.5, 1.25, -3.5, 'crate'); add(-6.5, 0, -6, -4, 1.25, -3.5, 'crate'); add(-9, 0, -3.5, -6.5, 2.5, -1, 'crate'); add(-6.5, 0, -3.5, -4, 1.25, -1, 'crate'); add(-9, 2.5, -3.5, -7.75, 3.75, -2.25, 'crate');
  add(4, 0, 0, 6.5, 1.25, 2.5, 'crate'); add(6.5, 0, 0, 8, 2.5, 1.5, 'crate');
  add(-26, 0, -10, -23.5, 1.25, -7.5, 'crate'); add(24, 0, -8, 26.5, 1.25, -5.5, 'crate'); add(-30, 0, 0, -27.5, 1.25, 2.5, 'crate'); add(28, 0, 2, 30.5, 1.25, 4.5, 'crate');
  add(-16, 0, -22, -14, 1.25, -20, 'crate'); add(14, 0, -22, 16, 1.25, -20, 'crate');
  /* ---- vías y locomotora «La Posadeña» (cabina enterable) ---- */
  add(-62, 0, -15.1, 62, .14, -14.95, 'metal', { nc: 1 }); add(-62, 0, -13.05, 62, .14, -12.9, 'metal', { nc: 1 });
  for (let x = -62; x < 62; x += 1.6) add(x, 0, -15.8, x + .4, .07, -12.2, 'wood', { nc: 1 });
  add(-16, 0, -15.8, 0, 4.4, -12.2, 'black');                              // caldera
  add(8.6, 0, -15.8, 16, 3.6, -12.2, 'black');                             // ténder
  // cabina: paredes con dos puertas enfrentadas (se entra por el sur y se sale por el norte), ventanillas y techo
  wall(0, -15.8, 8.6, -15.5, 0, 3.4, [D(3.3, 5.3, 0, 2.6), D(1, 2.6, 1.6, 2.8), D(6.2, 7.8, 1.6, 2.8)], 'black');
  wall(0, -12.5, 8.6, -12.2, 0, 3.4, [D(3.3, 5.3, 0, 2.6), D(1, 2.6, 1.6, 2.8), D(6.2, 7.8, 1.6, 2.8)], 'black');
  add(8.3, 0, -15.5, 8.6, 3.4, -12.5, 'black');                            // cierre trasero contra el ténder
  add(-.3, 3.4, -16.1, 8.9, 3.9, -11.9, 'black');                          // techo de la cabina
  add(5.6, 0, -15.5, 7.6, .8, -14.6, 'metal'); add(.3, 0, -14.4, 1.3, 1.2, -13.6, 'metal');   // asiento y válvulas
  // chimenea, domos, ruedas rojas, farol y carbón (solo se ven)
  add(-14.2, 4.4, -14.6, -12.8, 6.6, -13.4, 'black', { nc: 1 }); add(-14.8, 6.2, -15, -12.2, 6.7, -13, 'black', { nc: 1 });
  add(-9, 4.4, -14.7, -7.4, 5.4, -13.3, 'black', { nc: 1 }); add(-4.5, 4.4, -14.7, -3, 5.2, -13.3, 'black', { nc: 1 });
  for (const x of [-14, -11.2, -8.4, -5.6, -2.8]) { add(x, 0, -15.92, x + 2, 1.5, -15.8, 'barn', { nc: 1 }); add(x, 0, -12.2, x + 2, 1.5, -12.08, 'barn', { nc: 1 }); }
  for (const x of [9.2, 12.6]) { add(x, 0, -15.92, x + 2.4, 1.2, -15.8, 'barn', { nc: 1 }); add(x, 0, -12.2, x + 2.4, 1.2, -12.08, 'barn', { nc: 1 }); }
  add(-16.1, 1.8, -14.4, -16, 2.6, -13.6, 'light', { nc: 1 });
  add(9, 3.6, -15.2, 15.6, 4.1, -12.8, 'rock', { nc: 1 });
  // para subirse al techo de la caldera: tres cajones escalonados
  add(-12, 0, -12.2, -10.4, 1.2, -10.6, 'crate'); add(-10.4, 0, -12.2, -8.8, 2.4, -10.6, 'crate'); add(-8.8, 0, -12.2, -7.2, 3.6, -10.6, 'crate');
  /* ---- cartel de la estación, cartel de la costanera, tablero ---- */
  deco.push({ t: 'cartel', x: 0, y: 10.9, z: -25.98, w: 10, h: 1.4, txt: 'ESTACIÓN POSADAS', bg: '#5a2a1c', fg: '#f3d9a8' });
  add(-3.6, 1, 8.9, -3.4, 3.4, 9.1, 'metal'); add(3.4, 1, 8.9, 3.6, 3.4, 9.1, 'metal');
  deco.push({ t: 'cartel', x: 0, y: 2.8, z: 8.85, w: 7.4, h: 1.1, txt: 'COSTANERA · POSADAS', bg: '#1f3a2e', fg: '#f3d9a8', ry: Math.PI });
  for (const x of [-9, -3, 3, 9]) deco.push({ t: 'lamp', x, y: 4.6, z: -25.98 });
  /* ---- portales: el amarillo, escondido en el ala oeste; el azul, al fondo del techo del ala este ---- */
  wall(-50, -34.4, -42, -34, 0, 5.6, [D(-49, -46, 0, 3.4)], 'brick'); add(-42.4, 0, -40, -42, 5.6, -34, 'brick');   // rincón cerrado con una sola puerta
  teles.push({ x: -47, y: 0, z: -37, r: 1, to: [54, 1, 14], yaw: face(54, 14, 0, 0), color: 'yellow' });
  teles.push({ x: 45, y: 6, z: -36, r: .9, to: [-54, 1, 14], yaw: face(-54, 14, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -47, y: 0, z: -37, r: 1, color: 'yellow', ry: 0 }, { t: 'portal', x: 45, y: 6, z: -36, r: .9, color: 'blue', ry: Math.PI / 2 });
  /* ---- ítems: todo lo que ya existe, repartido por zonas ---- */
  // hall y piso alto
  I('w2', 0, 0, -34); I('w3', 7, 0, -36.5); I('health', -13, 0, -38); I('health', 13, 0, -38); I('armor', -8, 0, -29.5); I('shells', 8, 0, -29.5);
  I('w6', 0, 6, -36); I('armorH', -17, 6, -38); I('health', 17, 6, -38); I('slugs', 0, 6, -28);
  // ala oeste (planta baja y techo) y rincón del portal
  I('w1', -36, 0, -34); I('armor', -46, 0, -29); I('health', -30, 0, -30); I('bullets', -40, 0, -31); I('health', -44.5, 0, -38.5);
  I('w8', -36, 6, -34); I('health', -28, 6, -30); I('grenades', -44, 6, -30);
  // ala este
  I('w4', 36, 0, -34); I('armor', 46, 0, -29); I('health', 30, 0, -30); I('rockets', 40, 0, -31);
  I('w5', 36, 6, -34); I('armor', 28, 6, -30); I('rockets', 44, 6, -29);
  // locomotora: daño cuádruple en la cabina, botiquín arriba de la caldera
  I('quad', 4, 0, -14); I('health', -8, 4.4, -14);
  // andén
  I('health', -22, 0, -20); I('health', 22, 0, -20); I('armor', -24, 0, 3); I('armor', 24, 0, 5); I('w1', 4, 0, -2); I('shells', -12, 0, -7); I('bullets', 12, 0, -7);
  I('bullets', -34, 0, -19); I('shells', 34, 0, -19); I('health', 0, 0, -3);
  // costanera
  I('health', -32, 1, 14); I('health', 32, 1, 14); I('health', 0, 1, 16); I('w9', -14, 1, 15); I('caza', 14, 1, 15); I('grenades', -48, 1, 12); I('rockets', 48, 1, 16); I('slugs', -8, 1, 13);
  // patios y muelles (premios con riesgo: el agua mata)
  I('health', -58, 0, -20); I('health', 58, 0, -20); I('armor', -58, 0, -4); I('slugs', 58, 0, -4);
  I('mega', -41, -.5, 32); I('armorH', 41, -.5, 32);
  /* ---- apariciones: andén, costanera, patios, hall, alas y techos ---- */
  [[-30, 0, -20], [-12, 0, -20], [12, 0, -20], [30, 0, -20], [-20, 0, -8], [0, 0, -6], [20, 0, -8], [-40, 0, 0], [40, 0, 0], [-10, 0, 5], [10, 0, 5],
   [-50, 1, 14], [-25, 1, 16], [0, 1, 12], [25, 1, 16], [50, 1, 14], [-58, 0, -12], [58, 0, -12],
   [-14, 0, -34], [14, 0, -34], [0, 0, -30], [-14, 6, -36], [14, 6, -36], [-32, 0, -37], [32, 0, -37], [-34, 6, -30], [34, 6, -30]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: 0, y: 5, z: -33, c: 0xffa860, i: .8, d: 26 }, { x: 0, y: 10, z: -34, c: 0xffa860, i: .6, d: 22 },
    { x: -36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 }, { x: 36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 },
    { x: -36, y: 8, z: -32, c: 0xffb070, i: .5, d: 22 }, { x: 36, y: 8, z: -32, c: 0xffb070, i: .5, d: 22 },
    { x: -20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 0, y: 5, z: -8, c: 0xffa060, i: .5, d: 28 },
    { x: -30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 }, { x: 30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 },
    { x: -47, y: 2, z: -37, c: 0xffc840, i: .8, d: 12 }, { x: 45, y: 8, z: -36, c: 0x4aa0ff, i: .8, d: 12 });
  return finish({ id: 'cuartotramo', name: 'El Cuarto Tramo', bounds: { x0: -62, x1: 62, z0: -42, z1: 42 }, deco,
    theme: { sky: 'sunset', fog: 0x9a5a62, fogD: .0042, amb: 0xb07a6a, ambI: .55, hemi: [0xff9a78, 0x4a3050, .5], sun: true, sunC: 0xff8a40, sunI: .85, sunPos: [-52, 17, -34] } });
}
MAPDEFS.cuartotramo = buildCuartoTramo;
