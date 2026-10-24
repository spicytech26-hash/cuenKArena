/* ---------- dm1 · La Represa ---------- */
function buildRepresa() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();

  /* ---- Límites del mundo ---- */
  add(-41, -6, -41, 41, 24, -40, 'block');
  add(-41, -6, 38, 41, 24, 39, 'block');
  add(-41, -6, -40, -40, 24, 38, 'block');
  add(40, -6, -40, 41, 24, 38, 'block');
  add(28, -6, -40, 40, 14, -17, 'block');   // bloque NE
  add(-40, -6, -40, -28, 14, -17, 'block'); // bloque NO

  /* ---- ATRIO central ---- */
  add(-16, -1, -16, 16, 0, -5, 'floor'); add(-16, -1, 5, 16, 0, 16, 'floor');
  add(-16, -1, -5, -5, 0, 5, 'floor');  add(5, -1, -5, 16, 0, 5, 'floor');
  // pozo de lava
  add(-5, -6, -5, 5, -4, 5, 'rock');
  add(-6, -6, -6, 6, -1, -5, 'trim'); add(-6, -6, 5, 6, -1, 6, 'trim');
  add(-6, -6, -5, -5, -1, 5, 'trim'); add(5, -6, -5, 6, -1, 5, 'trim');
  lava.push({ min: [-5, -6, -5], max: [5, -3.6, 5], dps: 25 });
  // salidas del pozo:
  // · géiser de magma en el centro: cada 3,6 s erupciona y te tira arriba, justo sobre el saltador del sur del atrio
  pads.push({ x: 0, y: -4, z: 0, r: 2.1, t: [0, 0, -9.5], apex: 3, geyser: { period: 3.6, on: .9, phase: 0 } });
  // · piedras de basalto que suben y bajan por turnos: abajo quedan a ras de la lava (se pisan caminando),
  //   te suben hasta casi el borde y de ahí saltás afuera. Siempre hay una subiendo.
  [[-3.5, -3.5, 0], [3.5, -3.5, 1], [3.5, 3.5, 2], [-3.5, 3.5, 3]].forEach(([x, z, k]) =>
    mover(x - .9, -4.7, z - .9, x + .9, -3.75, z + .9, 'basalt', 1, 3.2, 4.8, k * Math.PI / 2));
  // plataforma del daño cuádruple y piedras para llegar
  add(-2, 6.6, -2, 2, 7, 2, 'metal');
  [[6.5, 0], [-6.5, 0], [0, 6.5], [0, -6.5]].forEach(([x, z]) => add(x - 1, 6.1, z - 1, x + 1, 6.5, z + 1, 'metal'));
  // balcón perimetral
  add(-16, 5.5, -16, 16, 6, -12, 'floor'); add(-16, 5.5, 12, 16, 6, 16, 'floor');
  add(-16, 5.5, -12, -12, 6, 12, 'floor'); add(12, 5.5, -12, 16, 6, 12, 'floor');
  add(12, 0, 12, 13, 5.5, 13, 'metal'); add(-13, 0, 12, -12, 5.5, 13, 'metal');
  add(12, 0, -13, 13, 5.5, -12, 'metal'); add(-13, 0, -13, -12, 5.5, -12, 'metal');
  // escaleras al balcón
  stairs(9, -2, 12, 10, 0, .5, 12, 'z', -1);
  stairs(-12, -10, -9, 2, 0, .5, 12, 'z', 1);
  add(9, 0, -4, 12, 6, -2, 'step'); add(-12, 0, 2, -9, 6, 4, 'step');   // descansos arriba
  pads.push({ x: 0, y: 0, z: -9, r: 1, t: [0, 6, -14], apex: 1.5 });
  pads.push({ x: 0, y: 0, z: 9, r: 1, t: [0, 6, 14], apex: 1.5 });
  // paredes del atrio con puerta abajo y puerta al balcón
  const atDoors = [D(-3, 3, 0, 4), D(-3, 3, 6, 10)];
  wall(-17, -17, 17, -16, -6, 14, atDoors, 'wall');
  wall(-17, 16, 17, 17, -6, 14, atDoors, 'wall');
  wall(-17, -16, -16, 16, -6, 14, atDoors, 'wall');
  wall(16, -16, 17, 16, -6, 14, atDoors, 'wall');
  // tiras de luz
  add(-15.9, 12.4, -16, 15.9, 12.7, -15.8, 'light', { nc: 1 });
  add(-15.9, 12.4, 15.8, 15.9, 12.7, 16, 'light', { nc: 1 });
  add(-16, 12.4, -15.9, -15.8, 12.7, 15.9, 'light', { nc: 1 });
  add(15.8, 12.4, -15.9, 16, 12.7, 15.9, 'light', { nc: 1 });

  /* ---- PATIO NORTE con la torre del riel ---- */
  add(-28, -1, -40, 28, 0, -17, 'concrete');
  add(-6, 5.5, -20, 6, 6, -17, 'floor');               // repisa del balcón norte
  add(-6, 0, -20, -5, 5.5, -19, 'metal'); add(5, 0, -20, 6, 5.5, -19, 'metal');
  add(-5, 0, -34, 5, 12, -27, 'tower');                 // torre
  add(-5.2, 11.6, -34.2, 5.2, 12, -26.8, 'trim');       // borde de la torre
  // plataformas en espiral hasta la torre: más grandes, más juntas y con escalones más bajos (0,9 m, el salto da 1,4)
  // así sigue siendo un parkour pero se sube de corrido sin frenar la partida
  [[7.9, -27.1, .92], [9.4, -29.6, 1.85], [9.4, -32.3, 2.77], [8, -34.8, 3.69], [5.4, -36.7, 4.62], [1.9, -37.8, 5.54],
   [-1.9, -37.8, 6.46], [-5.4, -36.7, 7.38], [-8, -34.8, 8.31], [-9.4, -32.3, 9.23], [-9.4, -29.6, 10.15], [-7.9, -27.1, 11.08]]
    .forEach(([x, z, t]) => { add(x - 1.3, t - .4, z - 1.3, x + 1.3, t, z + 1.3, 'metal'); add(x - 1.32, t - .02, z - 1.32, x + 1.32, t + .02, z - 1.22, 'neonC', { nc: 1 }); });
  // cajas
  add(14.5, 0, -23.5, 17.5, 2, -20.5, 'crate');
  add(-17.5, 0, -27, -14.5, 1.5, -23, 'crate');
  add(-21, 0, -37, -19, 2.5, -35, 'crate'); add(-19, 0, -37, -17, 1.25, -35, 'crate');
  // vagoneta de carga: va y viene sobre rieles cruzando el patio (cobertura que se mueve y te lleva encima)
  add(-26, 0, -22.2, 12, .06, -21.9, 'rail', { nc: 1 }); add(-26, 0, -21.1, 12, .06, -20.8, 'rail', { nc: 1 });
  add(-27, 0, -23, -26, 1, -20, 'metal'); add(12, 0, -23, 13, 1, -20, 'metal');        // topes de los rieles
  mover(-25, 0, -22.5, -22, 1.3, -20.5, 'crate', 0, 33, 28, 0);
  // ascensor exterior de la torre: atajo al riel (la espiral sigue estando, pero esto es más rápido si lo agarrás a tiempo)
  mover(-1.5, -.1, -27, 1.5, .3, -24, 'lift', 1, 11.7, 9, 0);
  add(-1.6, 0, -27.1, -1.5, 12, -26.9, 'neonC', { nc: 1 }); add(1.5, 0, -27.1, 1.6, 12, -26.9, 'neonC', { nc: 1 });
  // subestación: dos transformadores en la parte este del patio, con sus aisladores
  [[19, -29], [23.5, -29]].forEach(([x, z]) => { add(x, 0, z, x + 3, 2.6, z + 3, 'metal'); add(x - .1, 2.6, z - .1, x + 3.1, 2.9, z + 3.1, 'trim');
    [.6, 1.5, 2.4].forEach(d => add(x + d - .15, 2.9, z + 1.35, x + d + .15, 4, z + 1.65, 'pillar', { nc: 1 })); });
  add(18.5, 0, -24.6, 27.5, .8, -24, 'concrete');                                  // murito bajo

  /* ---- ALA OESTE: andén de tres niveles ---- */
  add(-40, -1, -16, -17, 0, 16, 'floor');
  wall(-40, -17, -17, -16, -6, 14, [D(-27, -23, 0, 4)], 'wall');
  add(-40, -6, 16, -17, 14, 38, 'block');               // bloque SO
  add(-40, 12, -16, -17, 13, 16, 'roof');
  add(-40, 2.5, -16, -33, 3, 16, 'floor');              // entrepiso
  add(-26, 5.5, -16, -17, 6, 16, 'floor');              // nivel alto
  stairs(-33, 4, -30, 10, 0, .5, 6, 'z', -1);
  ramp(-33, -14, -26, -11, 2.5, 3, 6, 'x', 1, 'grate');
  [-8, 0, 8].forEach(z => { add(-34, 0, z - .5, -33, 2.5, z + .5, 'metal'); add(-26, 0, z - .5, -25, 5.5, z + .5, 'metal'); });
  pads.push({ x: -29.5, y: 0, z: -4, r: 1, t: [-21, 6, -8], apex: 2.5 });
  add(-39.9, 9, -12, -39.7, 9.4, 12, 'light', { nc: 1 });
  // sala de compuertas: la compuerta gigante de la represa en la pared, con sus vigas
  add(-40, 3, -7, -39.5, 8.6, 7, 'metal');
  [-7.4, -2.6, 2.2, 6.6].forEach(z => add(-40, 3, z, -39.2, 8.6, z + .8, 'trim'));
  add(-40, 8.6, -7.6, -39, 9, 7.6, 'trim');
  // pasarela de la grúa a 9,5 m: se sube por la escalera del nivel alto o con el ascensor del medio
  add(-39, 9.1, 3, -21, 9.5, 6, 'grate');
  add(-39, 9.1, -1, -35, 9.5, 3, 'grate');                                         // ensanche sobre el entrepiso
  // puente grúa: sale del ensanche y cruza la sala a 9,5 m (la compuerta queda abajo)
  mover(-38, 9.1, -4, -35, 9.5, -1, 'grate', 0, 9, 10, 0);
  add(-38, 12, -2.6, -26, 12.2, -2.4, 'metal', { nc: 1 });
  stairs(-24, 6, -21, 13, 6, .5, 7, 'z', -1);
  add(-39, 9.5, 2.9, -21, 10.4, 3, 'rail', { nc: 1 }); add(-39, 9.5, 6, -24, 10.4, 6.1, 'rail', { nc: 1 });
  mover(-29.5, -.1, 0, -26.5, .3, 3, 'lift', 1, 9.2, 9, 0);                         // ascensor hasta la pasarela
  // cajas para cubrirse en el pasillo del medio y en el nivel alto
  add(-31, 0, -9, -28, 1.5, -6.5, 'crate'); add(-30.5, 1.5, -8.5, -28.5, 2.6, -7, 'crate');
  add(-32.5, 0, 13, -30.5, 2, 15.5, 'crate'); add(-28, 0, 13.5, -26.5, 1.2, 15, 'crate');
  add(-20, 6, 7.5, -17.5, 7.3, 9.5, 'crate');

  /* ---- ALA ESTE: sala de lava con pasarelas ---- */
  add(17, -4, -16, 21, 0, 16, 'floor');                 // andén de entrada
  add(21, -5, -16, 40, -3, 16, 'rock');                 // fondo de la pileta
  lava.push({ min: [21, -5, -16], max: [40, -2.2, 16], dps: 40 });
  wall(17, -17, 40, -16, -6, 14, [D(18, 21, 0, 4)], 'wall');
  wall(17, 16, 40, 17, -6, 14, [D(18, 21, 0, 3)], 'wall');
  add(17, 5.6, -1.5, 30, 6, 1.5, 'grate');              // pasarela alta
  add(33, -4, -6, 40, 4, 6, 'metal');                   // plataforma de la megasalud
  // columnas sobre la lava hasta la megasalud: más anchas y más seguidas (escalones de 0,7 m, huecos de menos de un metro)
  for (const s of [-1, 1]) [[23.5, 9, .4], [26.5, 10.5, 1.1], [29.5, 11, 1.8], [32.5, 10.3, 2.5], [35.5, 8.8, 3.2]]
    .forEach(([x, z, t]) => add(x - 1.5, -4, s * z - 1.5, x + 1.5, t, s * z + 1.5, 'pillar'));
  add(23, -4, 13, 25, -2, 16, 'step'); add(21, -4, 13, 23, -1, 16, 'step');
  add(23, -4, -16, 25, -2, -13, 'step'); add(21, -4, -16, 23, -1, -13, 'step');
  pads.push({ x: 35, y: 4, z: -3, r: 1, t: [13, 6, 0], apex: 1.5 });
  // barcaza que cruza la lava por debajo de la pasarela, una repisa al fondo con saltador a la megasalud
  mover(21, -1.4, -2.5, 24, -1, 2.5, 'metal', 0, 7, 12, 0);
  add(31, -4, -2.5, 33, -1, 2.5, 'metal'); add(30.9, -1, -2.5, 31, -.6, 2.5, 'trim', { nc: 1 });
  pads.push({ x: 31.9, y: -1, z: 0, r: .9, t: [34.6, 4, 0], apex: 2.2 });
  // géiseres de lava: si caés en la pileta, cada tanto te tiran a la pasarela alta o al andén
  pads.push({ x: 27, y: -3, z: 5, r: 1.6, t: [24, 6, 0], apex: 2.5, geyser: { period: 4.2, on: .9, phase: .3 } });
  pads.push({ x: 27, y: -3, z: -5, r: 1.6, t: [19, 0, -6], apex: 2.5, geyser: { period: 4.2, on: .9, phase: .65 } });

  /* ---- SUR: rampa al sótano de turbinas y terraza en el techo ---- */
  ramp(-3, 17, 3, 24, -4, -3, 0, 'z', -1, 'concrete');
  add(-4, -4, 17, -3, 4, 24, 'wall'); add(3, -4, 17, 4, 4, 24, 'wall');
  add(-4, 4, 17, 4, 5, 24, 'roof');
  add(-17, -6, 17, -4, 5, 23, 'block'); add(4, -6, 17, 17, 5, 23, 'block');
  add(-16, -4, 24, 16, -3, 38, 'floor');
  wall(-16, 23, 16, 24, -4, 5, [D(-3, 3, -3, 4)], 'wall');
  add(-17, -4, 23, -16, 5, 38, 'wall');
  wall(16, 23, 17, 38, -4, 5, [D(33, 36, -3, 1)], 'wall');
  add(-17, 4, 24, 17, 5, 38, 'roof');
  add(-1.5, -3, 30.5, 1.5, -2.5, 33.5, 'trim');          // pedestal
  add(-11.5, -3, 26.5, -8.5, -1, 29.5, 'crate');
  add(-14, -3, 33, -12, -2, 35, 'crate');
  // turbinas: carcasas contra la pared del fondo y dos pistones que suben y bajan por turnos (cobertura que cambia)
  add(-16, -3, 36.2, -11, 1, 38, 'pillar'); add(-16.2, 1, 36, -10.8, 1.4, 38, 'trim');
  add(-9.5, -3, 36.6, -6.5, -.5, 38, 'pillar'); add(-9.7, -.5, 36.4, -6.3, -.1, 38, 'trim');
  mover(-7, -3.6, 30.5, -4, -2.5, 33.5, 'metal', 1, 3, 5, 0);
  mover(4, -3.6, 30.5, 7, -2.5, 33.5, 'metal', 1, 3, 5, Math.PI);
  add(-16, 3.2, 26, 16, 3.6, 26.5, 'metal', { nc: 1 }); add(-16, 3.2, 34.5, 16, 3.6, 35, 'metal', { nc: 1 });   // caños del techo
  add(10.5, -3, 36.5, 11, 1, 37, 'metal'); add(13, -3, 36.5, 13.5, 1, 37, 'metal'); add(10.5, 1, 36.5, 13.5, 1.5, 37, 'metal');
  teles.push({ x: 12, y: -3, z: 35, r: .9, to: [0, 12, -29.5], yaw: 0 });
  // pasillo al ala este
  add(17, -6, 17, 18, 14, 33, 'block'); add(21, -6, 17, 40, 14, 38, 'block'); add(17, -6, 36, 21, 14, 38, 'block');
  add(16, -4, 33, 21, -3, 36, 'floor');
  add(18, -4, 23, 21, -3, 33, 'floor');
  stairs(18, 17, 21, 23, -3, .5, 6, 'z', -1);
  add(17, 1, 33, 21, 14, 36, 'block'); add(18, 3, 17, 21, 14, 33, 'block');
  add(-15.9, 3.5, 37.8, 15.9, 3.8, 38, 'light', { nc: 1 });

  /* ---- MIRADOR en el techo del sótano (antes era una terraza vacía) ---- */
  // puesto de vigía del francotirador: plataforma a 9 m con escalera al frente y barandas
  add(-3, 8.6, 31, 3, 9, 37, 'grate');
  [[-3, 31], [2.5, 31], [-3, 36.5], [2.5, 36.5]].forEach(([x, z]) => add(x, 5, z, x + .5, 8.6, z + .5, 'metal'));
  stairs(-1.5, 25, 1.5, 31, 5, .5, 8, 'z', 1);
  add(-3, 9, 36.9, 3, 10, 37, 'rail', { nc: 1 }); add(-3, 9, 31, -2.9, 10, 37, 'rail', { nc: 1 }); add(2.9, 9, 31, 3, 10, 37, 'rail', { nc: 1 });
  // equipos de refrigeración (cobertura alta) y pretiles bajos
  add(-12, 5, 23.5, -8, 7, 27, 'metal'); add(-12.2, 7, 23.3, -7.8, 7.3, 27.2, 'trim');
  add(8, 5, 23.5, 12, 7, 27, 'metal'); add(7.8, 7, 23.3, 12.2, 7.3, 27.2, 'trim');
  add(-14, 5, 32.5, -6, 6.2, 33.1, 'concrete'); add(6, 5, 32.5, 14, 6.2, 33.1, 'concrete');
  add(-6, 5, 19, -3, 6.3, 21, 'crate'); add(4, 5, 20, 6.5, 6.6, 22.5, 'crate'); add(4.5, 6.6, 20.5, 6, 7.6, 22, 'crate');
  // tanque de agua sobre patas en la esquina, con un saltador para subir
  add(-15.5, 8, 34, -11.5, 10.6, 37.5, 'pillar'); add(-15.7, 10.6, 33.8, -11.3, 10.9, 37.7, 'trim');
  [[-15.5, 34], [-12, 34], [-15.5, 37], [-12, 37]].forEach(([x, z]) => add(x, 5, z, x + .5, 8, z + .5, 'metal'));
  pads.push({ x: -13.5, y: 5, z: 30, r: 1, t: [-13.5, 10.9, 35.6], apex: 2 });
  // antena
  add(13.3, 5, 36.3, 13.7, 14, 36.7, 'metal'); add(12.6, 13.2, 36.4, 14.4, 13.4, 36.6, 'metal', { nc: 1 });

  /* ---- Ítems ---- */
  I('quad', 0, 7, 0);
  I('health', -8, 0, 10); I('health', 8, 0, -10); I('shells', 14, 6, -14); I('bullets', -14, 6, 14); I('armor', 14, 6, 14);
  I('w6', 0, 12, -31); I('slugs', 3, 12, -32.5); I('armor', -20, 2.5, -36); I('health', 20, 0, -36);
  I('w4', -16, 1.5, -25); I('grenades', 16, 2, -22); I('shells', 0, 0, -24);
  I('w2', -37, 3, 0); I('w3', -29, 0, 12); I('bullets', -37, 3, -12); I('armorH', -21, 6, -12); I('health', -19, 6, 12.5); I('shells', -37, 0, 13);
  I('mega', 37, 4, 0); I('rockets', 37, 4, 4); I('health', 29.5, 1.8, -11); I('shells', 19, 0, 12); I('bullets', 19, 0, -12); I('grenades', 29.5, 1.8, 11);
  I('w5', 0, -2.5, 32); I('rockets', -13, -3, 30); I('armor', 12, -3, 28); I('health', -10, -1, 28); I('w1', -8, -3, 35);
  I('health', 10, 5, 30); I('bullets', -10, 5, 30); I('w8', 0, 9, 34); I('rockets', -10, 5, 20);
  I('armor', -37, 9.5, 4.5); I('slugs', -30, 9.5, 4.5); I('health', -2.5, -3, 27);
  // más curación repartida
  I('health', -13.5, 10.9, 35.6); I('health', -14, 5, 20); I('health', 14, 5, 20); I('health', -24, 0, -30); I('health', 24, 0, -36.5);
  I('health', 19, 0, 0); I('health', -29.5, 0, 9.5); I('health', -37, 3, 0); I('health', 0, 0, 13);

  /* ---- Puntos de aparición ---- */
  [[6, 0, -13], [-6, 0, 13], [-14, 6, 4], [14, 6, -4], [-12, 0, -26], [-33, 9.5, 4.5], [22, 0, -34], [-30, 0, -12], [-37, 3, 8], [-21, 6, -2],
   [19, 0, -6], [-6, -3, 35], [8, -3, 27], [0, 5, 28], [37, 4, -3], [-8, 0, -36], [12, 0, -36]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));

  /* ---- Luces ---- */
  lights.push(
    { x: 0, y: 11, z: 0, c: 0xffb070, i: 1.4, d: 40 },
    { x: 0, y: 9, z: 0, c: 0xa060ff, i: 1.2, d: 12 },
    { x: 0, y: 15, z: -30, c: 0x6fd8ff, i: 1.2, d: 26 },
    { x: -29, y: 10, z: 0, c: 0xffc080, i: 1.3, d: 34 },
    { x: 30, y: 1, z: 0, c: 0xff5a14, i: 2.0, d: 30 },
    { x: 0, y: 3, z: 31, c: 0xff4a3a, i: 1.4, d: 26 },
    { x: 0, y: -2, z: 0, c: 0xff4a10, i: 1.4, d: 12 },
    { x: -32, y: 11, z: 4.5, c: 0x6fd8ff, i: 1.1, d: 16 },
    { x: -38, y: 6, z: 0, c: 0xffa040, i: 1.0, d: 14 },
    { x: 0, y: 11, z: 34, c: 0x6fd8ff, i: 1.0, d: 18 },
    { x: 23, y: 5, z: -27.5, c: 0x8fe0ff, i: 1.0, d: 12 }
  );

  return finish({ id: 'represa', name: 'dm1 · La Represa', bounds: { x0: -41, x1: 41, z0: -41, z1: 39 },
    theme: { sky: 'dusk', fog: 0x1c1310, fogD: .0105, amb: 0x55453a, ambI: .85, hemi: [0x5a4a6a, 0x1a100a, .55], sun: true } });
}
MAPDEFS.represa = buildRepresa;

