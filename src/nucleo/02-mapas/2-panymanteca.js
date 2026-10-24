/* ---------- dm2 · Humita — un boliche (homenaje a la noche de Posadas; el id interno sigue siendo 'panymanteca') ---------- */
function buildPanYManteca() {
  const { pads, spawns, lights, add, wall, stairs, D, face, I, mover, finish } = mapKit();
  /* ---- cáscara: salón principal x[-20,20] z[-18,18], techo a 16 ---- */
  // pared del fondo con tres puertas al backstage: una desde el escenario y dos desde arriba de las torres de parlantes
  wall(-21, -19, 21, -18, -2, 17, [D(-3, 3, 2, 6), D(-20, -17, 5, 9), D(17, 20, 5, 9)], 'black');
  /* ---- BACKSTAGE (ala nueva detrás del escenario): camarines, micro de la gira, pasarelas y montacargas ---- */
  add(-22, -2, -45, 22, 17, -44, 'black'); add(-22, -2, -44, -21, 17, -19, 'black'); add(21, -2, -44, 22, 17, -19, 'black');
  add(-21, -1, -44, 21, 0, -19, 'club'); add(-21, 13, -44, 21, 14, -19, 'roof');
  add(-3, 0, -23, 3, 2, -19, 'stage'); stairs(-3, -29, 3, -23, 0, .5, 4, 'z', 1, 'stage');
  add(-21, 4.6, -44, -15, 5, -19, 'truss'); add(15, 4.6, -44, 21, 5, -19, 'truss'); add(-15, 4.6, -44, 15, 5, -39, 'truss');
  add(-15, 5, -39, -14.9, 6, -19, 'rail', { nc: 1 }); add(14.9, 5, -39, 15, 6, -19, 'rail', { nc: 1 });
  // camarines debajo de las pasarelas, con espejo y sillón
  for (const s of [-1, 1]) {
    const X = (a, b) => s < 0 ? [a, b] : [-b, -a];
    let [a, b] = X(-15.4, -15); wall(a, -44, b, -30, 0, 4.6, [D(-37, -34, 0, 3.4)], 'velvet');
    [a, b] = X(-21, -15.4); add(a, 0, -30.4, b, 4.6, -30, 'velvet');
    [a, b] = X(-20.8, -20.5); add(a, .8, -42, b, 3.4, -32, 'mirror');
    [a, b] = X(-20, -17.5); add(a, 0, -43.5, b, .7, -38, 'velvet');
  }
  // el micro de la gira en el medio (se sube por las cajas) y cajas de equipos
  add(-6, 0, -40, 6, 3.6, -33, 'navy'); add(-6.05, 1.8, -40, 6.05, 2.8, -33, 'glass', { nc: 1 });
  add(-9, 0, -36, -7, 1.3, -34, 'speaker'); add(-8.5, 1.3, -35.6, -7.2, 2.5, -34.4, 'speaker');
  add(8, 0, -30, 10.5, 1.5, -27.5, 'black'); add(-11, 0, -27, -8.5, 1.2, -24.5, 'black'); add(9, 0, -42, 12, 2.2, -39.5, 'speaker');
  // pasarela móvil que cruza entre las dos pasarelas laterales, montacargas y saltador
  mover(-15, 4.6, -33, -12, 5, -30, 'lift', 0, 27, 11, 0);
  mover(-15, -.1, -27, -12, .3, -24, 'lift', 1, 4.7, 7, Math.PI);
  pads.push({ x: 12, y: 0, z: -35, r: 1, t: [12, 5, -41.5], apex: 1.4 });
  add(-20.9, 9, -43.9, 20.9, 9.3, -43.7, 'neonP', { nc: 1 }); add(-20.9, 4.3, -44, -20.7, 4.5, -19, 'neonC', { nc: 1 }); add(20.7, 4.3, -44, 20.9, 4.5, -19, 'neonP', { nc: 1 });
  wall(-21, 18, 21, 19, -2, 17, [D(-12, -8, 0, 4), D(-2, 2, 0, 4), D(8, 12, 0, 4), D(-3, 3, 7, 10), D(16, 20, 7, 10), D(-20, -16, 7, 10)], 'black');
  add(-21, -2, -18, -20, 17, 18, 'black'); add(20, -2, -18, 21, 17, 18, 'black');
  add(-21, 16, -19, 21, 17, 19, 'roof');
  // piso: pista LED en el centro y baldosas alrededor
  add(-12, -1, -10, 12, 0, 10, 'led');
  add(-20, -1, -18, 20, 0, -10, 'club'); add(-20, -1, 10, 20, 0, 18, 'club');
  add(-20, -1, -10, -12, 0, 10, 'club'); add(12, -1, -10, 20, 0, 10, 'club');
  add(-4, 0, -4, 4, 1, 4, 'led');                                  // podio central
  /* ---- escenario y cabina del DJ ---- */
  add(-10, 0, -18, 10, 2, -12, 'stage');
  stairs(-6, -12, 6, -10.5, 0, .5, 3, 'z', -1, 'stage');
  add(-3, 2, -15, 3, 3.1, -13.5, 'chrome');
  /* ---- torres de parlantes: escalones hasta el VIP ---- */
  for (const sx of [-1, 1]) {
    const X = (a, b) => sx < 0 ? [a, b] : [-b, -a];
    let [a, b] = X(-14, -10); add(a, 0, -18, b, 2.6, -14.5, 'speaker');
    [a, b] = X(-17, -14); add(a, 0, -18, b, 3.8, -14.5, 'speaker');
    [a, b] = X(-20, -17); add(a, 0, -18, b, 5.0, -14.5, 'speaker');
    [a, b] = X(-20, -17); add(a, 0, -14.5, b, 6.2, -12, 'speaker');
  }
  /* ---- VIP: balcones en U a 7 m ---- */
  add(-20, 6.5, -12, -15, 7, 18, 'velvet'); add(15, 6.5, -12, 20, 7, 18, 'velvet'); add(-15, 6.5, 13, 15, 7, 18, 'velvet');
  [-6, 6].forEach(z => { add(-15.5, 0, z - .25, -15, 6.5, z + .25, 'chrome'); add(15, 0, z - .25, 15.5, 6.5, z + .25, 'chrome'); });
  [-8, 8].forEach(x => add(x - .25, 0, 13, x + .25, 6.5, 13.5, 'chrome'));
  // barras debajo del VIP
  add(-17, 0, -8, -16, 1.1, 8, 'glass'); add(16, 0, -8, 17, 1.1, 8, 'glass');
  /* ---- estructura de luces (truss) a 12 m ---- */
  add(-14, 11.6, -9.5, 14, 12, -8, 'truss'); add(-14, 11.6, 8, 14, 12, 9.5, 'truss');
  add(-14, 11.6, -8, -12.5, 12, 8, 'truss'); add(12.5, 11.6, -8, 14, 12, 8, 'truss');
  /* ---- cabina flotante con el cuádruple ---- */
  add(-2.5, 10.6, -2.5, 2.5, 11, 2.5, 'chrome');
  /* ---- partes móviles ---- */
  mover(-14.5, 6.6, -7.5, -11.5, 7, -4.5, 'lift', 0, 26, 10, 0);              // plataforma que cruza el salón
  mover(-14.5, 6.6, 4.5, -11.5, 7, 7.5, 'lift', 0, 26, 10, Math.PI);
  mover(-14, -.1, 10, -11, .3, 13, 'lift', 1, 6.7, 8, 0);                    // ascensores al VIP sur
  mover(11, -.1, 10, 14, .3, 13, 'lift', 1, 6.7, 8, Math.PI);
  // tarimas LED que suben y bajan en la pista por turnos: cobertura que cambia al ritmo de la música
  [[-6, -6.5, 0], [6, -6.5, 1], [6, 6.5, 2], [-6, 6.5, 3]].forEach(([x, z, k]) =>
    mover(x - 1, -1.6, z - 1, x + 1, -.5, z + 1, 'led', 1, 2.6, 6.4, k * Math.PI / 2));
  /* ---- subwoofers (plataformas de salto) ---- */
  pads.push({ x: 9, y: 0, z: 0, r: 1, t: [1, 11, 0], apex: 1.5 });
  pads.push({ x: -9, y: 0, z: 0, r: 1, t: [-1, 11, 0], apex: 1.5 });
  pads.push({ x: 0, y: 0, z: 10.6, r: 1, t: [0, 7, 15.5], apex: 1.2 });
  pads.push({ x: -17.5, y: 7, z: -3, r: 1, t: [-13.25, 12, -3], apex: 1.5 });
  pads.push({ x: 17.5, y: 7, z: 3, r: 1, t: [13.25, 12, 3], apex: 1.5 });
  /* ---- lobby / baños y terraza ---- */
  add(-21, -1, 19, 21, 0, 32, 'club');
  add(-21, -2, 19, -20, 17, 32, 'black'); add(20, -2, 19, 21, 17, 32, 'black'); add(-21, -2, 32, 21, 17, 33, 'black');
  add(-16, 4.5, 19, 16, 5, 32, 'roof');                                         // techo del lobby = terraza
  add(-20, 12, 19, -16, 13, 32, 'roof'); add(16, 12, 19, 20, 13, 32, 'roof');   // techos de las escaleras
  stairs(17, 19, 20, 31, 0, .5, 14, 'z', -1, 'stage');
  stairs(-20, 19, -17, 31, 0, .5, 14, 'z', -1, 'stage');
  add(-14, 0, 26, -4, 4.5, 26.6, 'mirror'); add(4, 0, 26, 14, 4.5, 26.6, 'mirror');
  [-8, 8].forEach(x => add(x - .5, 0, 24, x + .5, 4.5, 25, 'chrome'));
  add(-1, 0, 28.5, 1, .4, 30.5, 'chrome');
  add(-14, 0, 30.5, -8, .6, 32, 'velvet'); add(8, 0, 30.5, 14, .6, 32, 'velvet');
  /* ---- TERRAZA (techo del lobby, a 5 m) — antes estaba vacía ---- */
  stairs(-3, 19, 3, 22, 5, .5, 4, 'z', -1, 'stage');                             // escalera a la puerta del VIP
  add(-15, 5, 26, -13.5, 6.3, 31, 'glass'); add(-15.2, 6.3, 25.8, -13.3, 6.45, 31.2, 'chrome');   // barra
  add(-15.9, 5, 25.5, -15.6, 9, 31.5, 'mirror');
  add(10, 5, 30.6, 15, 5.6, 31.8, 'velvet'); add(10, 5.6, 31.4, 15, 6.4, 31.8, 'velvet');          // sillones
  add(-9.5, 5, 22.5, -7, 6.3, 25, 'black'); add(7, 5, 22.5, 9.5, 6.3, 25, 'black');                // macetones / cobertura
  add(-9.5, 6.3, 22.5, -7, 6.4, 25, 'neonP', { nc: 1 }); add(7, 6.3, 22.5, 9.5, 6.4, 25, 'neonC', { nc: 1 });
  add(-6, 5, 28, -4, 6.6, 30, 'speaker'); add(4, 5, 28, 6, 6.6, 30, 'speaker');
  // torre del DJ de la terraza: ascensor hasta un mirador a 10 m con el rifle de caza
  add(-2.5, 9.6, 27, 2.5, 10, 31, 'truss');
  [[-2.5, 27], [2, 27], [-2.5, 30.5], [2, 30.5]].forEach(([x, z]) => add(x, 5, z, x + .5, 9.6, z + .5, 'chrome'));
  mover(-1.25, 4.9, 24.6, 1.25, 5.3, 27, 'lift', 1, 4.7, 7, 0);
  add(-2.5, 10, 30.9, 2.5, 11, 31, 'rail', { nc: 1 });
  add(-2.6, 10, 27, -2.5, 11, 31, 'neonP', { nc: 1 }); add(2.5, 10, 27, 2.6, 11, 31, 'neonC', { nc: 1 });
  // arco de neón sobre la terraza
  add(-16, 13.8, 21.5, 16, 14, 21.7, 'neonP', { nc: 1 }); add(-16, 13.8, 29.5, 16, 14, 29.7, 'neonC', { nc: 1 });
  /* ---- neón ---- */
  add(-15.1, 6.3, -12, -14.9, 6.5, 13, 'neonP', { nc: 1 }); add(14.9, 6.3, -12, 15.1, 6.5, 13, 'neonC', { nc: 1 });
  add(-15, 6.3, 12.9, 15, 6.5, 13.1, 'neonP', { nc: 1 });
  add(-19.9, 14.8, -18, -19.7, 15.1, 18, 'neonC', { nc: 1 }); add(19.7, 14.8, -18, 19.9, 15.1, 18, 'neonP', { nc: 1 });
  add(-10, 2.05, -11.9, 10, 2.2, -11.7, 'neonC', { nc: 1 });
  add(-16, 4.1, 31.8, 16, 4.3, 32, 'neonP', { nc: 1 });
  /* ---- ítems ---- */
  I('quad', 0, 11, 0); I('mega', 0, 12, 8.75); I('w6', 0, 12, -8.75); I('w8', 13.25, 12, -4); I('grenades', -13.25, 12, 4);
  I('w5', 0, .4, 29.5); I('rockets', -11, 0, 28.5); I('rockets', 11, 5, 28); I('w2', 6, 2, -15.5); I('w3', -17.5, 7, -7); I('w4', 17.5, 7, 7);
  I('shells', -8, 0, -8); I('shells', 8, 0, 8); I('bullets', 8, 0, -8); I('bullets', -17.5, 7, 15); I('armor', 17.5, 7, -10); I('armor', -17.5, 7, 10);
  I('rockets', 0, 3.6, -36.5); I('armor', -18, 5, -41); I('health', 18, 5, -41); I('health', -18, 0, -36); I('shells', 18, 0, -36); I('bullets', -10, 0, -22); I('grenades', 10, 1.5, -28.75); I('health', 0, 5, -41.5);
  I('armorH', -4.5, 5, 24); I('w9', 0, 10, 29.5); I('health', 12.5, 5, 26); I('health', -12, 5, 28.5); I('shells', 0, 0, -6.5); I('health', -18.5, 0, 0); I('health', 18.5, 0, 0); I('health', -12, 0, 22); I('health', 12, 0, 22); I('w1', -6, 2, -15.5);
  /* ---- apariciones ---- */
  [[-14, 0, -6], [14, 0, 6], [-8, 0, 15], [8, 0, 15.5], [4, 2, -16.5], [-17.5, 7, 1], [17.5, 7, -2], [-5, 7, 15.5], [5, 7, 15.5],
   [-10, 0, 21], [10, 0, 21], [-10, 0, -31], [10, 0, -33], [-18, 5, -28], [18, 5, -28], [0, 3.6, -38], [-17.5, 0, -40], [17.5, 0, -40], [-6, 0, 30], [6, 0, 30], [-12, 5, 24], [12, 5, 24], [0, 1, 0]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push(
    { x: -12, y: 9, z: 0, c: 0xff2bd6, i: 1.6, d: 30 },
    { x: 12, y: 9, z: 0, c: 0x2be6ff, i: 1.6, d: 30 },
    { x: 0, y: 14, z: 0, c: 0x8a4bff, i: 1.5, d: 34 },
    { x: 0, y: 6, z: -14, c: 0xffb040, i: 1.4, d: 22 },
    { x: 0, y: 3.5, z: 25, c: 0xff3050, i: 1.3, d: 22 },
    { x: 0, y: 10, z: 26, c: 0x6a7bff, i: 1.1, d: 26 },
    { x: -10, y: 10, z: -32, c: 0xff3050, i: 1.6, d: 28 }, { x: 10, y: 10, z: -32, c: 0x8a4bff, i: 1.6, d: 28 }
  );
  return finish({ id: 'panymanteca', name: 'dm2 · Humita', bounds: { x0: -22, x1: 22, z0: -45, z1: 34 },
    theme: { sky: 'night', fog: 0x0d0716, fogD: .013, amb: 0x3a2a55, ambI: .9, hemi: [0x6040a0, 0x10081a, .55], sun: false, club: true } });
}
MAPDEFS.panymanteca = buildPanYManteca;

