/* ---------- El Cuarto Tramo — Costanera de Posadas, Misiones ----------
   La vieja estación al borde del Paraná, al atardecer. Al norte, la galería de ladrillo con sus puertas
   al andén; en el centro, las vías con la locomotora «La Posadeña» y la pila de cajones; al oeste, el andamio
   con el portal amarillo; al este, la torre de andamios (plataforma baja y alta) con el portal azul;
   al sureste, el río (el agua mata) y el muelle. Norte = -z (la galería), sur = +z (el río). */
function buildCuartoTramo() {
  const { pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  /* ---- suelo, río y límites ---- */
  add(-37, -2, -24, 20, -.03, 25, 'grass');                           // pasto de los costados y la costanera sur
  add(20, -2, -24, 37, -.03, 12, 'grass');
  add(-30, -2, -12, 37, 0, 12, 'concrete');                           // andén y explanada
  add(-30, -2, 12, 20, 0, 18, 'concrete');
  add(-30, -2, -24, 26, 0, -12, 'tiles');                             // piso a cuadros de la galería
  lava.push({ min: [20, -3, 12], max: [37, -.5, 25], water: true, dps: 0 });   // el Paraná: agua que mata
  add(20, -5, 12, 37, -3, 25, 'rock');
  add(-38, -4, -25, 38, 12, -24, 'brick');                            // límites: norte (fondo de la galería), sur, oeste y este
  add(-38, -4, 25, 38, 8, 26, 'block');
  add(-38, -4, -25, -37, 12, 25, 'block');
  add(37, -4, -25, 38, 12, 25, 'block');
  /* ---- galería de ladrillo (norte): seis puertas al andén y una a cada punta ---- */
  wall(-30, -12.4, 26, -12, 0, 6, [D(-27, -23, 0, 3.4), D(-17, -13, 0, 3.4), D(-7, -3, 0, 3.4), D(3, 7, 0, 3.4), D(13, 17, 0, 3.4), D(21, 25, 0, 3.4)], 'brick');
  wall(-30.4, -24, -30, -12, 0, 6, [D(-19, -15, 0, 3.4)], 'brick');
  wall(26, -24, 26.4, -12, 0, 6, [D(-19, -15, 0, 3.4)], 'brick');
  add(-30.4, 6, -24, 26.4, 6.4, -12, 'roof');                         // techo
  add(-30.4, 4.2, -12.4, 26.4, 4.5, -8.6, 'roof');                    // alero de chapa sobre el andén
  for (const x of [-26, -10, 10, 24]) add(x, 0, -9, x + .3, 4.2, -8.7, 'metal');
  for (const x of [-18, -6, 6, 18]) add(x, 0, -18.4, x + .8, 6, -17.6, 'whitewall');   // columnas del salón
  // cajones de cobertura dentro de la galería (1,25 m: se saltan)
  add(-24, 0, -23.2, -19, 1.25, -21.6, 'crate'); add(-24, 0, -21.6, -22.4, 2.5, -20, 'crate');
  add(-13, 0, -22, -8, 1.25, -20.4, 'crate'); add(-11, 1.25, -22, -9.4, 2.5, -20.4, 'crate');
  add(-3, 0, -16.6, 2, 1.25, -15, 'crate'); add(0, 1.25, -16.6, 1.6, 2.5, -15, 'crate');
  add(8, 0, -23, 13, 1.25, -21.4, 'crate'); add(8, 0, -21.4, 9.6, 2.5, -19.8, 'crate');
  add(15, 0, -17, 20, 1.25, -15.4, 'crate'); add(21, 0, -23.2, 25.4, 1.25, -21.6, 'crate');
  /* ---- vías y locomotora «La Posadeña» ---- */
  add(-36, 0, -3.95, 36, .14, -3.8, 'metal', { nc: 1 }); add(-36, 0, -3.2, 36, .14, -3.05, 'metal', { nc: 1 });
  for (let x = -36; x < 36; x += 1.2) add(x, 0, -4.4, x + .4, .07, -2.6, 'wood', { nc: 1 });
  add(-9, 0, -4.6, 4, 3.4, -2.4, 'black');                            // locomotora
  add(4.3, 0, -4.7, 12, 3.8, -2.3, 'black');                          // ténder
  add(-10.6, 0, -2.4, -9, 1.2, -.8, 'crate'); add(-9, 0, -2.4, -7.4, 2.4, -.8, 'crate');   // para subirse a la locomotora
  /* ---- andén: pila de cajones y cobertura ---- */
  add(-10, 0, 2, -7.5, 1.25, 4.5, 'crate'); add(-7.5, 0, 2, -5, 1.25, 4.5, 'crate');
  add(-10, 0, 4.5, -7.5, 2.5, 7, 'crate'); add(-7.5, 0, 4.5, -5, 1.25, 7, 'crate'); add(-10, 2.5, 4.5, -8.75, 3.75, 5.75, 'crate');
  add(3, 0, 7, 5.5, 1.25, 9.5, 'crate'); add(5.5, 0, 7, 7, 1.25, 8.5, 'crate');
  add(10, 0, 2, 12.5, 1.25, 4.5, 'crate'); add(12.5, 0, 2, 14, 2.5, 3.5, 'crate');
  add(-22, 0, 10, -19.5, 1.25, 12.5, 'crate'); add(-16, 0, 13, -13.5, 1.25, 15.5, 'crate');
  add(26, 0, -9, 28.5, 1.25, -6.5, 'crate'); add(29, 0, 2, 31.5, 1.25, 4.5, 'crate');
  /* ---- andamio del oeste (3 m): escalera desde el andén y bajada al sur ---- */
  add(-36, 2.7, 2, -28, 3, 8, 'grate');
  stairs(-28, 3, -22, 7, 0, .5, 6, 'x', -1, 'step');
  stairs(-35, 8, -31, 14, 0, .5, 6, 'z', -1, 'step');
  for (const [x, z] of [[-35.8, 2.2], [-28.2, 2.2], [-35.8, 7.8], [-28.2, 7.8]]) add(x, 0, z, x + .2, 2.7, z + .2, 'metal');
  add(-36, 3, 1.9, -28, 4, 2, 'rail', { nc: 1 }); add(-36, 3, 7.9, -28, 4, 8, 'rail', { nc: 1 }); add(-36, 3, 2, -35.9, 4, 8, 'rail', { nc: 1 });
  /* ---- torre del este: plataforma baja (3 m) y alta (6,5 m) ---- */
  stairs(14, 8, 20, 12, 0, .5, 6, 'x', 1, 'step');
  add(20, 2.7, 6, 30, 3, 12, 'grate');                                // plataforma baja
  stairs(26, -1, 29, 6, 3, .5, 7, 'z', -1, 'step');
  add(22, 6.2, -10, 32, 6.5, -1, 'grate');                            // plataforma alta
  for (const [x, z] of [[20.2, 6.2], [29.6, 6.2], [20.2, 11.6], [29.6, 11.6]]) add(x, 0, z, x + .2, 2.7, z + .2, 'metal');
  for (const [x, z] of [[22.2, -9.8], [31.6, -9.8], [22.2, -1.4], [31.6, -1.4]]) add(x, 0, z, x + .2, 6.2, z + .2, 'metal');
  add(20, 3, 11.9, 30, 4, 12, 'rail', { nc: 1 }); add(29.9, 3, 6, 30, 4, 12, 'rail', { nc: 1 });
  add(22, 6.5, -10, 32, 7.5, -9.9, 'rail', { nc: 1 }); add(31.9, 6.5, -10, 32, 7.5, -1, 'rail', { nc: 1 }); add(22, 6.5, -10, 22.1, 7.5, -1, 'rail', { nc: 1 });
  /* ---- muelle sobre el río ---- */
  add(20, -.3, 12, 28, 0, 16, 'wood');
  add(28, -.3, 13, 35, 0, 16, 'wood');
  for (const [x, z] of [[20.2, 15.6], [27.6, 15.6], [27.6, 12.2], [34.6, 13.2], [34.6, 15.6]]) add(x, -3, z, x + .25, 0, z + .25, 'wood');
  /* ---- portales: el amarillo (suelo, oeste) lleva a la plataforma baja del este; el azul (plataforma baja) vuelve al oeste ---- */
  teles.push({ x: -18, y: 0, z: 4.5, r: 1, to: [24.5, 3, 9], yaw: face(24.5, 9, 0, 0), color: 'yellow' });
  teles.push({ x: 28, y: 3, z: 9, r: .9, to: [-21, 0, 7.5], yaw: face(-21, 7.5, 0, 0), color: 'blue' });
  /* ---- ítems: todo lo que ya existe, repartido por zonas ---- */
  // armas: escopeta y ametralladora en la galería, doble en el andén, cohetes y francotirador arriba de la torre,
  // dos rifles de plasma en la plataforma baja, caza en la galería oeste, granadas en la explanada
  I('w1', -6, 0, -14); I('w3', 16, 0, -20); I('w9', -27, 0, -20); I('w2', -2, 0, 6);
  I('w5', 24, 6.5, -3); I('w8', 30, 6.5, -8); I('w6', 22.5, 3, 8.5); I('w6', 24.5, 3, 10.5); I('w4', 33, 0, 0);
  // premios y riesgos: megasalud en el andamio oeste, daño cuádruple sobre la locomotora, armadura pesada en la punta del muelle y en el andén
  I('mega', -33, 3, 5); I('quad', 4, 3.4, -3.5); I('armorH', 34, 0, 14.5); I('armorH', 6, 0, 5);
  I('armor', -10, 0, 12); I('armor', 22, 0, -14); I('armor', -27, 0, -14);
  I('health', 2, 0, 3); I('health', -20, 0, -14); I('health', 18, 0, -14); I('health', 27, 0, 3); I('health', -24, 0, 13);
  I('health', 13, 0, 15); I('health', -14, 0, -6); I('health', 26, 3, 7);
  I('shells', -26, 0, -22); I('shells', -12, 0, 10); I('bullets', 12, 0, -16); I('bullets', -16, 0, 2);
  I('grenades', 33, 0, 6); I('rockets', 28, 3, 7.5); I('slugs', 28, 3, 10.5); I('caza', -30, 3, 3);
  /* ---- apariciones: andén, galería, andamio oeste, plataforma baja y explanada este ---- */
  [[-18, 0, 7.5], [10, 0, 7], [0, 0, 11], [18, 0, 3], [-26, 0, 10], [6, 0, -7], [-14, 0, -7], [-24, 0, -16], [-10, 0, -16], [2, 0, -20],
   [16, 0, -19], [24, 0, -14], [-32, 3, 4], [22, 3, 8], [31, 0, -4], [14, 0, 14]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  lights.push({ x: 0, y: 5, z: -17, c: 0xffb070, i: .7, d: 24 }, { x: -6, y: 6, z: 2, c: 0xff9a60, i: .5, d: 26 }, { x: 26, y: 8, z: 2, c: 0xff9a60, i: .5, d: 22 });
  return finish({ id: 'cuartotramo', name: 'El Cuarto Tramo', bounds: { x0: -37, x1: 37, z0: -24, z1: 25 }, deco,
    theme: { sky: 'dusk', fog: 0x5a3a3a, fogD: .006, amb: 0x8a6a62, ambI: .6, hemi: [0xffb88a, 0x4a3a4a, .5], sun: true, sunC: 0xff9a52, sunI: .8 } });
}
MAPDEFS.cuartotramo = buildCuartoTramo;
