/* ---------- El Cuarto Tramo — Costanera de Posadas, Misiones ----------
   La vieja estación de ladrillo al atardecer, frente al Paraná. Norte = -z (el edificio), sur = +z (el río).
   · Un solo edificio largo de dos plantas, con galería cubierta abajo y balcón corrido arriba (6 m) con barandas.
     Adentro: hall central con escaleras y dos alas con habitaciones en planta baja y alta.
   · Al balcón se sube por escaleras de reja frente a la fachada (a los costados de la locomotora), por el andamio
     del oeste (plataforma a 3 m con la megasalud) y por la torre del este: plataforma a 3 m, pasarela a 6 m con puerta al piso alto
     y mirador a 9 m. Un saltador por lado sube de golpe al balcón.
   · Andén con vías y la locomotora «La Posadeña» (la cabina se atraviesa), vereda, la costanera con gradas
     y dos muelles. Al sur y al este, solo agua hasta el horizonte: mata al instante. Al oeste, una valla
     transparente: del otro lado la costanera sigue (solo se ve). Farolas, canteros, banderines y árboles dan vida.
   · Dos portales enfrentados: amarillo en el andén oeste y azul en el balcón este; cada uno te deja delante del otro. */
function buildCuartoTramo() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();
  const deco = [];
  // farola de hierro con farol, como las de la costanera
  const farola = (x, z, y) => {
    add(x - .1, y, z - .1, x + .1, y + 4.6, z + .1, 'metal'); add(x - .22, y, z - .22, x + .22, y + .5, z + .22, 'metal', { nc: 1 });
    add(x - .3, y + 4.6, z - .3, x + .3, y + 5.2, z + .3, 'light', { nc: 1 }); add(x - .4, y + 5.2, z - .4, x + .4, y + 5.35, z + .4, 'black', { nc: 1 }); add(x - .2, y + 5.35, z - .2, x + .2, y + 5.55, z + .2, 'black', { nc: 1 });
  };
  // escalera de reja: peldaños finos con pilares, vacía por debajo a la vista (la colisión de abajo es invisible) y baranda
  const escalera = (x0, x1, z0, z1, n, dir) => {
    const L = (x1 - x0) / n;
    for (let i = 1; i <= n; i++) {
      const a = dir > 0 ? x0 + (i - 1) * L : x1 - i * L, b = a + L, top = .5 * i;
      add(a, top - .2, z0, b, top, z1, 'grate'); add(a, 0, z0, b, top - .2, z1, 'clip');
      add(a, top, z1 - .06, b, top + 1, z1, 'rail', { nc: 1 });
      if (i % 2 === 0) { add(a, 0, z0, a + .12, top - .2, z0 + .12, 'metal', { nc: 1 }); add(a, 0, z1 - .12, a + .12, top - .2, z1, 'metal', { nc: 1 }); }
    }
  };
  /* ---- suelo, río y límites ---- */
  add(-62, -2, -40, 62, -.03, 24, 'grass');                              // pasto base (patios laterales)
  add(-50, -2, -26, 50, 0, 8, 'concrete');                               // andén / explanada
  add(-62, -2, 8, 62, 1, 20, 'tiles');                                   // costanera: paseo elevado 1 m
  add(-22, -2, -40, 22, 0, -26.4, 'tiles');                              // piso del hall
  add(-50, -2, -40, -22, 0, -26.4, 'concrete'); add(22, -2, -40, 50, 0, -26.4, 'concrete');   // pisos de las alas
  add(-50, 0, -26, 50, .2, -23.6, 'brick');                              // vereda de ladrillo bajo la galería
  stairs(-62, 20, 62, 24, 0, .25, 4, 'z', -1, 'step');                   // gradas de la costanera hasta el río
  lava.push({ min: [-200, -4, 24], max: [200, 0, 150], water: true, dps: 0 });   // el Paraná al sur: agua que mata, hasta el horizonte
  lava.push({ min: [62, -4, -43], max: [200, 0, 24], water: true, dps: 0 });     // y al este
  add(-62, -6, 24, 62, -4, 42, 'rock');
  // límites: el fondo es la pared del edificio, al este una loma, al oeste una valla transparente
  add(50.4, -4, -43, 62, 10, -40, 'grass'); add(-50.4, -4, -43, 50.4, 12, -40, 'brick');
  deco.push({ t: 'palm', x: 56, y: 10, z: -41.5, h: 9 });
  add(-62.2, -4, -43, -62, 4, 42, 'fence'); add(-62.2, -4, -40.2, -50.4, 4, -40, 'fence');
  for (let z = -43; z <= 42; z += 6) add(-62.3, 0, z, -62, 4.3, z + .3, 'metal'); add(-62.3, 4, -43, -62, 4.3, 42, 'metal');
  for (let x = -62; x <= -50.4; x += 6) add(x, 0, -40.3, x + .3, 4.3, -40, 'metal');
  add(-62.2, -1, -43, -50.4, 0, -40, 'metal', { nc: 1 });
  // del otro lado de la valla la costanera sigue (solo se ve, no se puede ir)
  add(-170, -.2, -40, -62, -.03, 8, 'grass', { nc: 1 }); add(-170, -.03, -26, -62, 0, 8, 'concrete', { nc: 1 });
  add(-170, -.2, 8, -62, 1, 20, 'tiles', { nc: 1 }); add(-170, 1, 11.8, -62, 1.02, 12.2, 'brick', { nc: 1 }); add(-170, 1, 16.8, -62, 1.02, 17.2, 'brick', { nc: 1 });
  for (let i = 0; i < 4; i++) add(-170, -1, 23 - i, -62, .25 + i * .25, 24 - i, 'step', { nc: 1 });
  for (let x = -76; x >= -160; x -= 14) { farola(x, 19.6, 1); deco.push({ t: 'palm', x: x + 4, y: 1, z: 10.2, h: 8 }); }
  for (let x = -70; x >= -150; x -= 16) { add(x, 1, 12, x + 3.4, 1.45, 12.6, 'wood', { nc: 1 }); add(x, 1.45, 12.5, x + 3.4, 2, 12.6, 'wood', { nc: 1 }); }
  for (const [x, z] of [[-70, -30], [-86, -33], [-104, -29], [-122, -34], [-140, -30]]) deco.push({ t: 'tree', x, y: -.03, z, h: 6, r: 2.6 });
  for (const [x0, x1, h] of [[-110, -94, 7], [-132, -116, 9], [-154, -138, 7]]) { add(x0, 0, -52, x1, h, -43, 'whitewall', { nc: 1 }); add(x0 - .6, h, -52.6, x1 + .6, h + 1.4, -42.4, 'roofTiles', { nc: 1 }); }
  // rampas anchas desde el andén a la costanera
  for (const x of [-42, -6, 32]) ramp(x, 2, x + 10, 8, 0, 0, 1, 'z', 1, 'concrete');
  // franjas rojas de la costanera (solo pintura)
  add(-62, 1, 11.8, 62, 1.02, 12.2, 'brick', { nc: 1 }); add(-62, 1, 16.8, 62, 1.02, 17.2, 'brick', { nc: 1 });
  /* ---- edificio: fachada de dos plantas con arcadas, puertas y ventanas al balcón ---- */
  const puertas = [D(-9.3, -5.7, 0, 4.2), D(-4.3, -.7, 0, 4.2), D(.7, 4.3, 0, 4.2), D(5.7, 9.3, 0, 4.2), D(-32, -28, 0, 3.6), D(28, 32, 0, 3.6), D(-26.6, -24.2, 1, 3), D(24.2, 26.6, 1, 3), D(-36.4, -34, 1, 3), D(34, 36.4, 1, 3)];
  const salidas = [-34, -20, 0, 20, 34];
  for (const c of salidas) puertas.push(D(c - 1.5, c + 1.5, 6, 9.2));                       // puertas al balcón
  for (let c = -46; c <= 46; c += 6) if (salidas.every(d => Math.abs(c - d) >= 3.6)) puertas.push(D(c - 1.2, c + 1.2, 7.2, 9.6));   // ventanas
  wall(-50, -26.4, 50, -26, 0, 12, puertas, 'brick');
  wall(-50.4, -40, -50, -26.4, 0, 12, [D(-35, -31, 0, 3.4)], 'brick');                      // fondo del ala oeste, con puerta al patio
  wall(50, -40, 50.4, -26.4, 0, 12, [D(-35, -31, 0, 3.4), D(-39, -35, 6, 9.4)], 'brick');   // ala este: puerta al patio y puerta de la pasarela a 6 m
  wall(-22.4, -40, -22, -26.4, 0, 12, [D(-39.5, -30.5, 0, 3.8), D(-38, -31, 6, 9.4)], 'brick'); // paredes del hall con paso a las alas, abajo y arriba
  wall(22, -40, 22.4, -26.4, 0, 12, [D(-39.5, -30.5, 0, 3.8), D(-38, -31, 6, 9.4)], 'brick');
  add(-50.4, 12, -40, 50.4, 12.4, -25.8, 'roof');                        // techo
  add(-8, 12.4, -26.4, 8, 13.4, -26, 'brick'); add(-5, 13.4, -26.4, 5, 14.2, -26, 'brick');   // frontis
  add(-50.5, 11.4, -26.6, 50.5, 12, -25.8, 'whitewall', { nc: 1 });      // cornisa
  for (let x = -48; x <= 48; x += 12) add(x - .3, 0, -26, x + .3, 11.4, -25.8, 'whitewall', { nc: 1 });   // pilastras
  // piso alto: losa con huecos para las dos escaleras del hall
  add(-50, 5.6, -40, 50, 6, -38, 'tiles'); add(-50, 5.6, -38, -8, 6, -30, 'tiles'); add(8, 5.6, -38, 50, 6, -30, 'tiles');   // piso alto con un atrio abierto en el medio del hall (x -8..8)
  add(-8, 6, -38.1, 8, 7, -38, 'rail', { nc: 1 }); add(-8.1, 6, -38, -8, 7, -30, 'rail', { nc: 1 }); add(8, 6, -38, 8.1, 7, -30, 'rail', { nc: 1 });
  add(-38, 5.6, -30, -22, 6, -26.4, 'tiles'); add(-10, 5.6, -30, 10, 6, -26.4, 'tiles'); add(22, 5.6, -30, 38, 6, -26.4, 'tiles');
  stairs(10, -30, 22, -26.4, 0, .5, 12, 'x', -1, 'step'); stairs(-22, -30, -10, -26.4, 0, .5, 12, 'x', 1, 'step');
  stairs(38, -30, 50, -26.4, 0, .5, 12, 'x', -1, 'step'); stairs(-50, -30, -38, -26.4, 0, .5, 12, 'x', 1, 'step');   // escaleras internas de las alas
  /* ---- galería cubierta (abajo) y balcón corrido a 6 m con barandas ---- */
  add(-50, 5.6, -26, 50, 6, -22.4, 'wood');
  add(-50, 6, -22.5, 50, 7, -22.4, 'rail', { nc: 1 });
  for (let x = -48; x <= 48; x += 8) add(x - .25, 0, -22.9, x + .25, 5.6, -22.4, 'whitewall');
  for (const x of [-40, -24, -8, 8, 24, 40]) add(x - .2, 5.2, -24.3, x + .2, 5.6, -23.9, 'light', { nc: 1 });
  // escaleras de reja frente a la fachada, del andén al balcón (a los dos lados de la locomotora)
  escalera(20, 32, -22.4, -19, 12, 1); escalera(-32, -20, -22.4, -19, 12, -1);
  // rellano al final de cada escalera, pegado al balcón
  add(32, 5.7, -22.4, 36, 6, -19, 'grate'); add(-36, 5.7, -22.4, -32, 6, -19, 'grate');
  for (const [x, z] of [[35.8, -19.2], [32, -19.2], [-36, -19.2], [-32.2, -19.2]]) add(x, 0, z, x + .2, 5.7, z + .2, 'metal');
  add(32, 6, -19.1, 36, 7, -19, 'rail', { nc: 1 }); add(35.9, 6, -22.4, 36, 7, -19, 'rail', { nc: 1 }); add(-36, 6, -19.1, -32, 7, -19, 'rail', { nc: 1 }); add(-36, 6, -22.4, -35.9, 7, -19, 'rail', { nc: 1 });
  // saltador desde el andén hasta el balcón
  for (const s of [-1, 1]) pads.push({ x: s * 40, y: 0, z: -8, r: 1.1, t: [s * 40, 6, -24.2], apex: 2 });
  // hall: columnas, boletería y cajones
  for (const [x, z] of [[-8, -38], [8, -38], [-8, -30.3], [8, -30.3]]) add(x - .4, 0, z - .4, x + .4, 5.6, z + .4, 'whitewall');   // columnas del atrio
  for (const s of [-1, 1]) pads.push({ x: s * 5.5, y: 0, z: -34, r: 1.1, t: [s * 15, 6, -33], apex: 1.5 });   // saltadores del atrio al corredor alto
  add(-4, 0, -39.4, 4, 1.1, -38.2, 'wood'); add(-4, 1.1, -39.4, 4, 1.2, -38.2, 'navy');
  add(-19, 0, -39, -15, 1.25, -36.6, 'crate'); add(15, 0, -39, 19, 1.25, -36.6, 'crate');
  add(-7, 0, -36.4, -4, .45, -35.8, 'wood'); add(4, 0, -36.4, 7, .45, -35.8, 'wood'); add(-7, 0, -32.2, -4, .45, -31.6, 'wood'); add(4, 0, -32.2, 7, .45, -31.6, 'wood'); add(-1.6, 0, -35.6, 1.6, .8, -32.4, 'smooth');   // bancos y altar del arma central
  add(-14, 0, -39.6, -10, 2.4, -37.4, 'wood'); add(10, 0, -39.6, 14, 2.4, -37.4, 'wood'); add(-14, 2.4, -39.6, -10, 2.6, -37.4, 'navy'); add(10, 2.4, -39.6, 14, 2.6, -37.4, 'navy');   // boleterías
  add(-18, 6, -36.6, -12, 7.2, -35.4, 'crate'); add(12, 6, -36.6, 18, 7.2, -35.4, 'crate');
  /* ---- por lado (oeste s=-1, este s=1): habitaciones, costanera y muelle ---- */
  for (const s of [-1, 1]) {
    const ax = (x0, y0, z0, x1, y1, z1, m, e) => add(s * x0, y0, z0, s * x1, y1, z1, m, e);
    for (const x of [30, 42]) ax(x - .4, 0, -33.4, x + .4, 5.6, -32.6, 'whitewall');   // columnas
    /* planta baja del ala: entrepiso de madera a 3 m al fondo (columnas de hierro, baranda, escalera y un saltador), mostradores, bancos y muros bajos como cobertura */
    ax(24, 2.8, -40, 48, 3, -36.4, 'wood'); ax(24, 3, -36.5, 48, 4, -36.4, 'rail', { nc: 1 });
    for (const x of [26, 32, 38, 44]) ax(x - .15, 0, -36.7, x + .15, 2.8, -36.4, 'metal');
    if (s > 0) stairs(24, -36.4, 30, -34.6, 0, .5, 6, 'x', -1, 'step'); else stairs(-30, -36.4, -24, -34.6, 0, .5, 6, 'x', 1, 'step');
    pads.push({ x: s * 44, y: 0, z: -31.5, r: 1.1, t: [s * 40, 3, -38.2], apex: 1.2 });
    ax(24, 0, -33.8, 28.5, 1.1, -33, 'wood'); ax(24, 1.1, -33.8, 28.5, 1.2, -33, 'navy'); ax(43, 0, -33.2, 47.5, 1.1, -32.4, 'wood'); ax(43, 1.1, -33.2, 47.5, 1.2, -32.4, 'navy');
    ax(23.4, 0, -28.2, 27, .45, -27.6, 'wood'); ax(23.4, .45, -27.7, 27, 1, -27.6, 'wood'); ax(34, 0, -28.2, 37, .45, -27.6, 'wood'); ax(34, .45, -27.7, 37, 1, -27.6, 'wood');
    ax(33, 0, -31.6, 37, 1.2, -31.2, 'whitewall'); ax(35, 0, -36, 38, 1.2, -35.6, 'whitewall');
    ax(26, 0, -39.6, 29.5, 1.25, -38.4, 'crate'); ax(34, 0, -39.6, 38, 1.25, -38.4, 'crate'); ax(46, 0, -39.6, 49, 1.25, -38.4, 'crate');
    /* planta alta del ala: columnas, mesa larga, estantes y cajones de cobertura; baranda en el hueco de la escalera */
    for (const x of [30, 42]) ax(x - .4, 6, -33.4, x + .4, 12, -32.6, 'whitewall');
    ax(28, 6, -35, 36, 6.9, -33.6, 'wood'); ax(28, 6.9, -35, 36, 7, -33.6, 'navy');
    ax(24, 6, -39.8, 31, 8.2, -38.9, 'wood'); ax(39, 6, -39.8, 47, 8.2, -38.9, 'wood');
    ax(46, 6, -36.6, 48.5, 7.2, -35, 'crate'); ax(36, 6, -38, 40, 7.2, -36.6, 'crate'); ax(26, 6, -33.4, 30, 7.2, -32, 'crate');
    ax(38, 6, -30.1, 50, 7, -30, 'rail', { nc: 1 });
    // barandas bajas (se saltan) en los muelles: frenan al que viene corriendo
    ax(36, .25, 24, 36.2, 1.35, 36, 'rail'); ax(45.8, .25, 24, 46, 1.35, 36, 'rail'); ax(36, .25, 35.8, 46, 1.35, 36, 'rail');
    // costanera: bancos, glorieta, farolas
    ax(14, 1, 12, 18, 1.45, 12.6, 'wood'); ax(14, 1.45, 12.5, 18, 2, 12.6, 'wood'); ax(42, 1, 12, 46, 1.45, 12.6, 'wood'); ax(42, 1.45, 12.5, 46, 2, 12.6, 'wood');
    for (const [x, z] of [[28, 11], [36, 11], [28, 17], [36, 17]]) ax(x, 1, z, x + .3, 4.4, z + .3, 'wood');
    ax(27.6, 4.4, 10.6, 36.4, 4.7, 17.4, 'roof');
    for (const x of [-8, 8, 20, 44, 56]) { const x0 = Math.min(s * x, s * x + 2); add(x0, 1, 9.2, x0 + 2, 1.6, 11.2, 'smooth'); deco.push({ t: 'palm', x: x0 + 1, y: 1.6, z: 10.2, h: 8 }); }
    for (const x of [12, 30, 48, 60]) farola(s * x, 19.6, 1);
    ax(2, 1, 19.9, 62, 2, 20, 'rail', { nc: 1 });
    // muelle sobre el río
    add(Math.min(s * 36, s * 46), -.15, 24, Math.max(s * 36, s * 46), .25, 36, 'wood');
    for (const [x, z] of [[36, 24.2], [45.7, 24.2], [36, 35.7], [45.7, 35.7]]) ax(x, -4, z, x + .3, -.15, z + .3, 'wood');
    deco.push({ t: 'bush', x: s * 55, y: -.03, z: -4, r: 1.1 }, { t: 'bush', x: s * 58, y: -.03, z: -8, r: 1 }, { t: 'palm', x: s * 56, y: -.03, z: -2, h: 9 });
  }
  /* ---- andamio del oeste: tramo de abajo, plataforma a 3 m (megasalud) y tramo que entra al balcón ---- */
  stairs(-61, -18, -57, -12, 0, .5, 6, 'z', -1, 'step');
  add(-61, 2.7, -26, -56, 3, -18, 'grate');
  stairs(-56, -26, -50, -22.4, 3, .5, 6, 'x', 1, 'step');
  for (const [x, z] of [[-61, -26], [-56.2, -26], [-61, -18.2], [-56.2, -18.2], [-53, -26], [-53, -22.6]]) add(x, 0, z, x + .2, 2.7, z + .2, 'metal');
  add(-61.1, 3, -26, -61, 4, -18, 'rail', { nc: 1 }); add(-61, 3, -26.1, -56, 4, -26, 'rail', { nc: 1 });
  /* ---- torre del este: plataforma a 3 m, pasarela a 6 m (puerta al piso alto) y mirador a 9 m ---- */
  stairs(57, -18, 61, -12, 0, .5, 6, 'z', -1, 'step');                  // tramo de abajo
  add(56, 2.7, -26, 61, 3, -18, 'grate');                               // plataforma baja
  stairs(50, -26, 56, -22.4, 3, .5, 6, 'x', -1, 'step');                // de la plataforma al balcón
  stairs(57, -34, 61, -26, 3, .5, 6, 'z', -1, 'step');                  // de la plataforma a la pasarela
  add(50.4, 5.7, -40, 61, 6, -34, 'grate');                             // pasarela a 6 m, pegada a la puerta del ala
  stairs(51, -34, 55, -26, 6, .5, 6, 'z', 1, 'step');                   // de la pasarela al mirador
  add(50.4, 8.7, -26, 61, 9, -18, 'grate');                             // mirador a 9 m
  for (const [x, z] of [[56, -26], [60.8, -26], [56, -18.2], [60.8, -18.2], [57, -34], [60.8, -30], [53, -25.9], [53, -22.6]]) add(x, 0, z, x + .2, 2.7, z + .2, 'metal');
  for (const [x, z] of [[60.8, -39.8], [60.8, -34.2], [50.6, -34.2]]) add(x, 0, z, x + .2, 5.7, z + .2, 'metal');
  for (const [x, z] of [[60.8, -25.8], [60.8, -18.2], [50.6, -18.2], [50.6, -25.8]]) add(x, 0, z, x + .2, 8.7, z + .2, 'metal');
  add(61, 3, -26, 61.1, 4, -18, 'rail', { nc: 1 }); add(56, 3, -18.1, 61, 4, -18, 'rail', { nc: 1 });
  add(61, 6, -40, 61.1, 7, -34, 'rail', { nc: 1 }); add(50.4, 6, -34.1, 56, 7, -34, 'rail', { nc: 1 });
  add(61, 9, -26, 61.1, 10, -18, 'rail', { nc: 1 }); add(50.4, 9, -18.1, 61, 10, -18, 'rail', { nc: 1 }); add(56, 9, -26.1, 61, 10, -26, 'rail', { nc: 1 });
  /* ---- grúa del patio oeste (solo se ve) ---- */
  add(-59, 0, -39, -57, 24, -37, 'truss', { nc: 1 }); add(-59, 24, -38.4, -38, 25, -37.6, 'truss', { nc: 1 }); add(-64, 24, -38.4, -59, 25, -37.6, 'truss', { nc: 1 });
  add(-59.4, 22.2, -39.4, -56.6, 24, -36.6, 'metal', { nc: 1 }); add(-65, 23, -38.8, -62.5, 25, -37.2, 'black', { nc: 1 });
  add(-45.1, 15, -38.1, -45, 24, -37.9, 'metal', { nc: 1 }); add(-45.4, 14, -38.4, -44.7, 15, -37.6, 'barn', { nc: 1 });
  // cajones y cobertura en el andén (1,25 m: se saltan)
  add(-9, 0, -6, -6.5, 1.25, -3.5, 'crate'); add(-6.5, 0, -6, -4, 1.25, -3.5, 'crate'); add(-9, 0, -3.5, -6.5, 2.5, -1, 'crate'); add(-6.5, 0, -3.5, -4, 1.25, -1, 'crate'); add(-9, 2.5, -3.5, -7.75, 3.75, -2.25, 'crate');
  add(4, 0, 0, 6.5, 1.25, 2.5, 'crate'); add(6.5, 0, 0, 8, 2.5, 1.5, 'crate');
  add(-30, 0, -6, -27.5, 1.25, -3.5, 'crate'); add(28, 0, -6, 30.5, 1.25, -3.5, 'crate'); add(-30, 0, 2, -27.5, 1.25, 4.5, 'crate'); add(28, 0, 2, 30.5, 1.25, 4.5, 'crate');
  /* ---- vías y locomotora «La Posadeña»: elevada sobre el chasis y las ruedas, con la cabina enterable ---- */
  add(-62, 0, -15.1, 62, .14, -14.95, 'metal', { nc: 1 }); add(-62, 0, -13.05, 62, .14, -12.9, 'metal', { nc: 1 });
  for (let x = -62; x < 62; x += 1.6) add(x, 0, -15.8, x + .4, .07, -12.2, 'wood', { nc: 1 });
  add(-17, .7, -15.2, 17, 1.6, -12.8, 'black');                            // chasis (el hueco de abajo no se pasa)
  add(-16.4, 1.6, -15.3, 0, 4.2, -12.7, 'clip');                           // caldera: la forma redonda es visual, esto es la colisión
  add(8.9, 1.6, -15.5, 17, 3.8, -12.5, 'black');                           // ténder
  add(9.3, 3.8, -15.2, 16.6, 4.2, -12.8, 'rock', { nc: 1 });               // carbón
  add(0, 1.4, -15.8, 8.6, 1.6, -12.2, 'metal');                            // cabina a 1,6 m: se sube por escalones y se cruza por las dos puertas
  wall(0, -15.8, 8.6, -15.5, 1.6, 4.6, [D(3.3, 5.3, 1.6, 4), D(1, 2.6, 2.8, 4), D(6.2, 7.8, 2.8, 4)], 'black');
  wall(0, -12.5, 8.6, -12.2, 1.6, 4.6, [D(3.3, 5.3, 1.6, 4), D(1, 2.6, 2.8, 4), D(6.2, 7.8, 2.8, 4)], 'black');
  add(0, 1.6, -15.5, .3, 4.6, -12.5, 'black'); add(8.3, 1.6, -15.5, 8.6, 4.6, -12.5, 'black');
  add(-.3, 4.6, -16.1, 8.9, 5, -11.9, 'black');
  add(5.6, 1.6, -15.5, 7.6, 2.4, -14.6, 'metal'); add(.3, 1.6, -14.4, 1.3, 2.8, -13.6, 'metal');
  stairs(3.3, -12.2, 5.3, -9.8, 0, .4, 4, 'z', -1, 'step'); stairs(3.3, -18.2, 5.3, -15.8, 0, .4, 4, 'z', 1, 'step');
  add(-17.3, .7, -15.3, -17, 1.5, -12.7, 'barn', { nc: 1 }); add(-17.4, 2.3, -14.4, -17.3, 3.3, -13.6, 'light', { nc: 1 });
  deco.push({ t: 'tren' });
  deco.push({ t: 'cartel', x: 13, y: 2.7, z: -12.47, w: 4.6, h: .9, txt: 'LA POSADEÑA', bg: '#111', fg: '#f4f4f4' }, { t: 'cartel', x: 13, y: 2.7, z: -15.53, w: 4.6, h: .9, txt: 'LA POSADEÑA', bg: '#111', fg: '#f4f4f4', ry: Math.PI });
  add(-12, 0, -12.7, -10.4, 1.2, -11.1, 'crate'); add(-10.4, 0, -12.7, -8.8, 2.4, -11.1, 'crate'); add(-8.8, 0, -12.7, -7.2, 3.6, -11.1, 'crate');   // cajones escalonados hasta la caldera
  /* ---- marcos blancos, farolas, canteros, banderines, alero y detalles de la estación real ---- */
  for (const [a0, a1, y0, y1] of puertas) {
    add(a0 - .4, y0, -26, a0, y1 + .4, -25.8, 'whitewall', { nc: 1 }); add(a1, y0, -26, a1 + .4, y1 + .4, -25.8, 'whitewall', { nc: 1 }); add(a0 - .4, y1, -26, a1 + .4, y1 + .4, -25.8, 'whitewall', { nc: 1 });
    if (y0 > 6.5) add(a0 - .3, y0 - .2, -26, a1 + .3, y0, -25.7, 'whitewall', { nc: 1 });
  }
  for (const [a0, a1] of puertas.slice(0, 4)) add(a0 + .5, 4.6, -26, a1 - .5, 4.9, -25.85, 'whitewall', { nc: 1 });          // remate de las arcadas
  for (const x of [-9, -3, 3, 9]) add(x - 1, 3.2, -26.05, x + 1, 4.2, -26, 'navy', { nc: 1 });                              // vidrio sobre las puertas
  for (const x of [-34, -14, 14, 34]) add(x - .15, 3, -26, x + .15, 3.5, -25.8, 'light', { nc: 1 });                         // faroles de pared
  add(-39.4, 1.2, -26, -38.8, 1.9, -25.75, 'barn', { nc: 1 });                                                               // buzón rojo
  // alero de chapa sobre el balcón, con columnas finas de hierro
  for (const x of [-46, -34, -26, -14, -6, 6, 14, 26, 34, 46]) add(x - .1, 6, -22.8, x + .1, 9.9, -22.6, 'metal');
  add(-50.5, 9.9, -26.6, 50.6, 10.15, -22.3, 'roof'); add(-50.5, 9.6, -22.4, 50.6, 9.9, -22.3, 'metal', { nc: 1 }); add(-50.5, 10.15, -22.4, 50.6, 11.1, -22.3, 'rail', { nc: 1 });   // el alero se pisa: pasarela alta sobre el balcón
  add(51.6, 8.7, -26, 52.6, 9.5, -22.4, 'grate'); add(50.6, 8.7, -26, 51.6, 10, -22.4, 'grate');   // dos escalones del mirador al alero
  // canteros blancos con plantas bajo la galería
  for (const x of [-44, -28, -12, 12, 28, 44]) { add(x - .45, 0, -25.05, x + .45, .55, -24.15, 'whitewall'); deco.push({ t: 'bush', x, y: .55, z: -24.6, r: .5 }); }
  // banderines colgados bajo el balcón
  const banderin = ['barn', 'navy', 'light'];
  for (let x = -24; x <= 24; x++) add(x - .14, 5.1 - .35 * (1 - Math.abs(((x + 48) % 8) - 4) / 4), -23.4, x + .14, 5.45 - .35 * (1 - Math.abs(((x + 48) % 8) - 4) / 4), -23.38, banderin[(x + 24) % 3], { nc: 1 });
  // farolas, bancos y tachos en el andén
  for (const [x, z] of [[-46, -1], [-34, -10], [-18, -9], [18, -9], [34, -10], [46, -1], [-20, 6], [20, 6]]) farola(x, z, 0);
  add(-28, 0, -10.6, -25, .45, -10, 'wood'); add(-28, .45, -10.1, -25, 1, -10, 'wood'); add(25, 0, -10.6, 28, .45, -10, 'wood'); add(25, .45, -10.1, 28, 1, -10, 'wood');
  for (const [x, z] of [[-18, -8], [18, -8], [-32, -10], [32, -10], [0, 6.5], [-46, 6]]) add(x - .25, 0, z - .25, x + .25, .9, z + .25, 'metal');
  // balasto de las vías y cartel del andén
  add(-62, 0, -16.4, 62, .05, -11.6, 'rock', { nc: 1 });
  add(-39.4, 0, -10.2, -39.2, 2, -10, 'metal'); add(-35.4, 0, -10.2, -35.2, 2, -10, 'metal');
  deco.push({ t: 'cartel', x: -37.3, y: 1.55, z: -9.95, w: 3.6, h: .9, txt: 'POSADAS', bg: '#111', fg: '#fff', ry: Math.PI });
  deco.push({ t: 'pole', x: -13, y: 0, z: -21, h: 9, flag: 'ar' }, { t: 'pole', x: 13, y: 0, z: -21, h: 9, flag: 'mis' });
  deco.push({ t: 'tree', x: -54, y: -.03, z: -36, h: 6, r: 2.6 }, { t: 'tree', x: -58, y: -.03, z: -33, h: 5.5, r: 2.3 });
  // lanchas sobre el río (solo se ven)
  for (const [x, z, r] of [[-22, 62, 0], [30, 80, 1], [75, 55, 0]]) {
    add(x, -.3, z, x + 3, .5, z + 9, 'wood', { nc: 1 }); add(x + .4, .5, z + 2, x + 2.6, 1.8, z + 5.5, 'whitewall', { nc: 1 }); add(x + .3, 1.8, z + 1.8, x + 2.7, 2, z + 5.7, 'barn', { nc: 1 });
    if (r) add(x + 1.4, 2, z + 3, x + 1.6, 4.3, z + 3.2, 'metal', { nc: 1 });
  }
  /* ---- muros invisibles (nadie sale por arriba de la valla ni de las paredes) y barandas bajas en la orilla ---- */
  add(-62.5, -4, -43, -62, 40, 43, 'clip'); add(-62.5, -4, -40.5, -50.4, 40, -40, 'clip');
  add(-63, 12, -43, 63, 40, -40, 'clip'); add(50.4, 10, -43, 62, 40, -40, 'clip');
  add(-62, .25, 23.8, -46, 1.35, 24, 'rail'); add(-36, .25, 23.8, 36, 1.35, 24, 'rail'); add(46, .25, 23.8, 62, 1.35, 24, 'rail');   // sobre el último escalón de la costanera
  add(61.5, 0, -40, 62, 1, 8, 'rail'); add(61.5, 1, 8, 62, 2, 20, 'rail'); add(61.5, -1, 20, 62, 1.6, 24, 'rail');             // borde este
  for (const x of [-30, 30]) { add(x - .07, .25, 23.45, x + .07, 1.95, 23.59, 'wood'); deco.push({ t: 'aviso', x, y: 2.3, z: 23.52, ry: 0 }); }
  for (const [z, y] of [[-4, 0]]) { add(61.1, y, z - .07, 61.24, y + 1.75, z + .07, 'wood'); deco.push({ t: 'aviso', x: 61.17, y: y + 2.1, z, ry: -Math.PI / 2 }); }
  /* ---- carteles ---- */
  deco.push({ t: 'cartel', x: 0, y: 10.9, z: -25.97, w: 10, h: 1.4, txt: 'ESTACIÓN POSADAS', bg: '#5a2a1c', fg: '#f3d9a8' });
  add(-3.6, 1, 8.9, -3.4, 3.4, 9.1, 'metal'); add(3.4, 1, 8.9, 3.6, 3.4, 9.1, 'metal');
  deco.push({ t: 'cartel', x: 0, y: 2.8, z: 8.85, w: 7.4, h: 1.1, txt: 'COSTANERA · POSADAS', bg: '#1f3a2e', fg: '#f3d9a8', ry: Math.PI });
  /* ---- portales enfrentados: el amarillo en el andén oeste, el azul en el balcón este; cada uno te deja delante del otro ---- */
  add(-46, 0, -8, -42, .12, -4, 'metal', { nc: 1 });                      // chapa de base del portal amarillo
  teles.push({ x: -44, y: 0, z: -6, r: 1, to: [43, 6, -24.2], yaw: face(43, -24.2, 0, 0), color: 'yellow' });
  teles.push({ x: 47.5, y: 6, z: -24.2, r: .9, to: [-37.5, 0, -6], yaw: face(-37.5, -6, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -44, y: 0, z: -6, r: 1, color: 'yellow' }, { t: 'portal', x: 47.5, y: 6, z: -24.2, r: .9, color: 'blue' });
  /* ---- ítems: todo lo que ya existe, repartido por zonas ---- */
  // hall y piso alto
  I('w2', 0, .8, -34); I('w3', 7, 0, -37); I('health', -6, 0, -38.6); I('health', 6, 0, -38.6); I('armor', -8, 0, -29.5); I('shells', 8, 0, -29.5);
  I('bullets', 0, 6, -39); I('armor', -30, 3, -38.2); I('armor', 30, 3, -38.2); I('armorH', -17, 6, -38); I('health', 17, 6, -38); I('slugs', 0, 6, -28);
  // ala oeste: planta baja y habitación alta
  I('w1', -36, 0, -34); I('armor', -47, 0, -35.5); I('health', -30, 0, -30); I('bullets', -40, 0, -31); I('armor', -41, 0, -37.2);
  I('w2', -36, 6, -32); I('health', -28, 6, -30); I('grenades', -44, 6, -32); I('shells', -44, 6, -37.5);
  // ala este
  I('w4', 36, 0, -34); I('armor', 47, 0, -35.5); I('armor', 41, 0, -37.2); I('health', 30, 0, -30); I('rockets', 40, 0, -31);
  I('w9', 36, 6, -32); I('armor', 28, 6, -30); I('rockets', 44, 6, -32); I('health', 44, 6, -37.5);
  // balcón
  I('health', 0, 6, -24.2); I('armor', -30, 6, -24.2); I('armor', 30, 6, -24.2); I('health', 20, 10.15, -24.4); I('health', -44, 3, -38.2); I('health', 44, 3, -38.2); I('armor', 44, 10.15, -24.4);
  // locomotora: daño triple en la cabina, botiquín arriba de la caldera
  I('quad', 4, 1.6, -14); I('health', -8, 4.2, -14);
  // andén
  I('health', -19, 0, -20); I('health', 19, 0, -20); I('armor', -24, 0, 3); I('armor', 24, 0, 5); I('w1', 4, 0, -2); I('shells', -12, 0, -7); I('bullets', 12, 0, -7);
  I('bullets', -34, 0, -19); I('shells', 34, 0, -19); I('health', 0, 0, -3);
  // costanera
  I('health', -32, 1, 14); I('health', 32, 1, 14); I('health', 0, 1, 16); I('w3', -14, 1, 15); I('caza', 14, 1, 15); I('grenades', -48, 1, 12); I('rockets', 48, 1, 16); I('slugs', -8, 1, 13);
  // patios, andamios y muelles (premios con riesgo: el agua mata)
  I('health', -56, 0, -6); I('health', 56, 0, -6); I('armor', -56, 0, -1); I('slugs', 56, 0, -1);
  I('armorH', -41, .25, 32); I('armorH', 41, .25, 32);
  I('mega', -58.5, 3, -22); I('health', -58.5, 3, -19.5);
  I('w6', 58.5, 3, -24); I('w6', 58.5, 3, -20); I('health', 55, 6, -37); I('w8', 58.5, 9, -22); I('w5', 54.5, 9, -20.5);
  /* ---- apariciones: andén, balcón, costanera, patios, hall, alas y habitaciones ---- */
  [[-36, 0, -17], [-12, 0, -20], [12, 0, -20], [36, 0, -17], [-20, 0, -8], [0, 0, -6], [20, 0, -8], [-40, 0, 0], [40, 0, 0], [-10, 0, 5], [10, 0, 5],
   [-50, 1, 14], [-25, 1, 16], [0, 1, 12], [25, 1, 16], [50, 1, 14], [-56, 0, -10], [56, 0, -10],
   [-14, 0, -34], [14, 0, -34], [0, 0, -30], [-14, 6, -33], [14, 6, -33], [-32, 0, -37], [32, 0, -37], [-34, 6, -30], [34, 6, -30],
   [-30, 6, -24.2], [-10, 6, -24.2], [10, 6, -24.2], [30, 6, -24.2]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: 0, y: 5, z: -33, c: 0xffa860, i: .8, d: 26 }, { x: 0, y: 10, z: -34, c: 0xffa860, i: .6, d: 22 },
    { x: -36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 }, { x: 36, y: 4, z: -33, c: 0xff9a60, i: .6, d: 22 },
    { x: -36, y: 9, z: -32, c: 0xffb070, i: .6, d: 22 }, { x: 36, y: 9, z: -32, c: 0xffb070, i: .6, d: 22 },
    { x: -24, y: 5, z: -24, c: 0xffb070, i: .6, d: 22 }, { x: 24, y: 5, z: -24, c: 0xffb070, i: .6, d: 22 },
    { x: -20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 20, y: 6, z: -10, c: 0xff9a60, i: .5, d: 28 }, { x: 0, y: 5, z: -8, c: 0xffa060, i: .5, d: 28 },
    { x: -30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 }, { x: 30, y: 5, z: 14, c: 0xffa060, i: .6, d: 24 },
    { x: -44, y: 3, z: -6, c: 0xffc840, i: .9, d: 14 }, { x: 47.5, y: 8, z: -24.2, c: 0x4aa0ff, i: .9, d: 14 });
  return finish({ id: 'cuartotramo', name: 'El Cuarto Tramo', bounds: { x0: -62, x1: 62, z0: -42, z1: 42 }, deco,
    theme: { sky: 'sunset', fog: 0x9a5a62, fogD: .0038, amb: 0xc08a78, ambI: .8, hemi: [0xffa888, 0x5a3a58, .7], sun: true, sunC: 0xff8a40, sunI: .85, sunPos: [-52, 17, -34] } });
}
MAPDEFS.cuartotramo = buildCuartoTramo;
