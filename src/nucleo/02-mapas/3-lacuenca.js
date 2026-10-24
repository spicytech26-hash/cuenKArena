/* ---------- dm3 · La Cuenca — Universidad de la Cuenca del Plata, Posadas ----------
   La plaza de baldosas frente al edificio blanco: cantero con la palmera, escaleras al acceso
   de columnas oscuras, terraza a la derecha, rampa larga con baranda, rampa lateral con alambrado
   y la vereda de ladrillo. El edificio se recorre por dentro: planta baja, dos pisos de aulas,
   biblioteca con balcón y terraza en el techo. Norte = -z (el edificio), sur = +z (la calle). */
function buildLaCuenca() {
  const { pads, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  /* ---- suelo, vecinos y límites ---- */
  add(-30, -2, -30, 30, 0, 29, 'brick');
  // pared oeste con dos pasos al polideportivo: desde la calle y desde la azotea de las casas (a 5 m)
  add(-31, -2, -31, -30, 10, -14, 'block'); add(-31, -2, -14, -30, 5, -8, 'block'); add(-31, 9, -14, -30, 10, -8, 'block');
  add(-31, -2, -8, -30, 10, 14, 'block'); add(-31, -2, 14, -30, 0, 24, 'block'); add(-31, 6, 14, -30, 10, 24, 'block'); add(-31, -2, 24, -30, 10, 30, 'block');
  add(30, -2, -31, 31, 10, 30, 'block');
  /* ---- POLIDEPORTIVO (ala nueva al oeste): cancha, tribuna, vestuarios y balcón ---- */
  add(-67, -2, -31, -31, 16, -30, 'block'); add(-67, -2, 28, -31, 16, 29, 'block'); add(-67, -2, -30, -66, 16, 28, 'block');
  add(-66, -2, -30, -31, 0, 28, 'concrete'); add(-66, 14, -30, -31, 15, 28, 'roof');
  // cancha de fútbol de césped sintético: las líneas van pintadas en el deco 'pitch'; un arco en cada punta (5 x 2,4 m) con red
  deco.push({ t: 'pitch', x0: -61, x1: -37, z0: -18, z1: 17.9, y: .02, lx0: -60, lx1: -38, lz0: -16, lz1: 16 });
  for (const s of [-1, 1]) {
    const z = s * 16, zb = s * 17.3, zl = Math.min(z, zb), zh = Math.max(z, zb);
    add(-51.7, 0, z - .1, -51.5, 2.6, z + .1, 'whitewall'); add(-46.5, 0, z - .1, -46.3, 2.6, z + .1, 'whitewall');   // palos
    add(-51.7, 2.4, z - .1, -46.3, 2.6, z + .1, 'whitewall');                                                            // travesaño
    add(-51.7, 0, zb - .05, -46.3, 2.5, zb + .05, 'fence');                                                            // red del fondo
    add(-51.7, 0, zl, -51.6, 2.5, zh, 'fence'); add(-46.4, 0, zl, -46.3, 2.5, zh, 'fence');                         // redes de los costados
    add(-51.7, 2.45, zl, -46.3, 2.5, zh, 'fence', { nc: 1 });                                                            // red de arriba
  }
  stairs(-60, 18, -38, 28, 0, .5, 10, 'z', 1, 'board');                            // tribuna
  // vestuarios bajo la cubierta del norte
  wall(-66, -20, -31, -19.5, 0, 5.1, [D(-62, -58, 0, 3.5), D(-44, -40, 0, 3.5)], 'whitewall');
  wall(-49.5, -30, -49, -20, 0, 5.1, [D(-27, -24, 0, 3.5)], 'whitewall');
  add(-66, 5.1, -30, -31, 5.5, -19.5, 'tiles');                                    // cubierta (se camina arriba)
  for (const x of [-64, -58, -53]) add(x, 0, -29.5, x + 3, 2.4, -28.8, 'metal');   // casilleros
  for (const x of [-46, -40, -35]) add(x, 0, -29.5, x + 3, 2.4, -28.8, 'metal');
  add(-63, 0, -24, -57, .5, -23, 'wood'); add(-45, 0, -24, -38, .5, -23, 'wood');  // bancos
  // balcón del este (5,5 m) con la puerta a la azotea de las casas y escalera a la cancha
  add(-37, 5.1, -19.5, -31, 5.5, 8, 'wood');
  stairs(-37, 8, -31, 14, 0, .5, 11, 'z', -1, 'step');
  add(-37.1, 5.5, -19.5, -37, 6.5, 8, 'rail', { nc: 1 }); add(-66, 5.5, -19.6, -37, 6.5, -19.5, 'rail', { nc: 1 });
  // plataforma que cruza la cancha a 5,5 m y saltador a la cubierta
  mover(-40, 5.1, -2, -37, 5.5, 1, 'lift', 0, -20, 12, 0);
  pads.push({ x: -49, y: 0, z: -12, r: 1, t: [-49, 5.5, -24.5], apex: 2 });
  // tablero y luces del techo
  add(-65.9, 7, -6, -65.7, 10, 6, 'led', { nc: 1 });
  for (const z of [-12, 0, 12]) add(-62, 13.6, z - .2, -36, 13.9, z + .2, 'light', { nc: 1 });
  add(-31, -2, -31, 31, 18, -30, 'block'); add(-31, -2, 29, 31, 9, 30, 'whitewall');
  add(-30, 0, -30, -24, 5, 10, 'roofTiles');                       // casas vecinas con techo de tejas
  add(24, 0, -30, 30, 7, 10, 'whitewall');
  add(-30, 0, 26, 30, 6, 29, 'block');                              // vereda de enfrente
  /* ---- plaza de baldosas (1,5 m sobre la calle) ---- */
  add(-16, 0, -4, 16, 1.5, 13, 'tiles');
  add(-2.5, 0, -6, 2.5, 1.5, -4, 'tiles');
  // borde sur: rampa larga con baranda, escalerita, muro y escalera a la vereda
  ramp(-16, 13, -4, 16, 0, 0, 1.5, 'x', 1, 'smooth');
  add(-16, 1.5, 12.85, -4, 2.5, 13, 'rail'); add(-16, 0, 15.85, -4, 1.4, 16, 'rail');
  stairs(-4, 13, -1, 16, 0, .25, 6, 'z', -1, 'step');
  add(-1, 0, 13, 9, 1.5, 16, 'smooth'); add(-1, 1.5, 15.85, 9, 2.5, 16, 'rail');
  stairs(9, 13, 13, 16, 0, .25, 6, 'z', -1, 'step');
  add(13, 0, 13, 16, 1.5, 16, 'smooth');
  // bancos de hormigón con asiento oscuro
  add(-2, 1.5, 5, 3, 2.05, 6.2, 'smooth'); add(-2, 2.05, 5, 3, 2.15, 6.2, 'navy');
  add(8, 1.5, 9, 11.5, 2.05, 10.2, 'smooth'); add(8, 2.05, 9, 11.5, 2.15, 10.2, 'navy');
  /* ---- cantero con la palmera ---- */
  add(-16, 1.5, -4, -7, 2.6, 3, 'smooth'); add(-15.6, 2.6, -3.6, -7.4, 2.65, 2.6, 'soil');
  deco.push({ t: 'palm', x: -12, y: 2.65, z: -.5, h: 10 }, { t: 'bush', x: -9, y: 2.65, z: 1, r: 1.1 }, { t: 'bush', x: -14.5, y: 2.65, z: 1.6, r: .9 },
    { t: 'bush', x: -9.5, y: 2.65, z: -2.6, r: .8 }, { t: 'bush', x: -14, y: 2.65, z: -2.8, r: 1 });
  /* ---- acceso: escaleras, descanso y columnas oscuras ---- */
  stairs(-7, -6, -2.5, -4, 1.5, .25, 6, 'z', -1, 'step');
  add(-16, 1.5, -6, -7, 3, -4, 'smooth');
  for (const x of [-10.3, -2.3]) add(x, 1.5, -5.9, x + .6, 6.6, -5.3, 'navy');
  add(-11, 6.6, -6, -1, 7.1, -4.6, 'whitewall');                   // alero sobre la entrada
  /* ---- terraza derecha con baranda ---- */
  add(2.5, 1.5, -6, 16, 3, -1, 'tiles');
  stairs(3, -1, 6.5, 3, 1.5, .25, 6, 'z', -1, 'step');
  add(6.5, 3, -1.15, 16, 4, -1, 'rail'); add(2.5, 3, -1.15, 3, 4, -1, 'rail');
  add(15.85, 3, -6, 16, 4, -1, 'rail');
  /* ---- rampa lateral derecha con alambrado ---- */
  add(16, 0, -6, 17, 2.6, 16, 'smooth');
  ramp(17, -6, 22, 16, 0, 0, 3, 'z', -1, 'smooth');
  add(22, 0, -6, 22.2, 4, 16, 'fence');
  deco.push({ t: 'bush', x: 23.2, y: 0, z: 2, r: 1 }, { t: 'bush', x: 23.2, y: 0, z: 10, r: 1.1 }, { t: 'bush', x: 23.2, y: 0, z: -3, r: .9 });
  /* ---- rampa y pasarela izquierda ---- */
  ramp(-22, -6, -16, 16, 0, 0, 3, 'z', -1, 'smooth');
  add(-16.3, 0, -2, -16, 2.5, 13, 'smooth');
  add(-24, 0, -28, -16, 3, -6, 'smooth');
  add(-22.2, 3, -14, -22, 4, -6, 'rail');
  deco.push({ t: 'bush', x: -23, y: 0, z: 4, r: 1 }, { t: 'bush', x: -23, y: 0, z: 11, r: .9 });
  /* ---- garita y mástiles ---- */
  add(10.5, 1.5, 2, 12.5, 3.9, 4, 'booth');
  deco.push({ t: 'roof', x: 11.5, y: 3.9, z: 3, w: 2.8, h: 1 });
  deco.push({ t: 'pole', x: 14, y: 1.5, z: 6, h: 8, flag: 'ar' }, { t: 'pole', x: 14, y: 1.5, z: 8, h: 8, flag: 'mis' }, { t: 'pole', x: 14, y: 1.5, z: 10, h: 8, flag: 'ucp' });
  /* ---- azoteas de los vecinos: se sube con saltadores desde la calle ---- */
  // derecha (7 m): tanque de agua, equipos de aire, parapeto y un saltador al techo del edificio
  pads.push({ x: 27, y: 0, z: 13, r: 1, t: [27, 7, 5], apex: 1.6 });
  add(25, 7, -25, 29, 10, -20, 'metal'); add(24.8, 10, -25.2, 29.2, 10.4, -19.8, 'trim');
  add(24.6, 7, -8, 26.6, 8.3, -6, 'metal'); add(27.6, 7, -2, 29.6, 8.3, 0, 'metal');
  add(24, 7, -12, 24.4, 7.8, 8, 'whitewall');
  add(26, 7, -15, 28.5, 8.2, -13.5, 'crate');
  pads.push({ x: 27, y: 7, z: -17, r: 1, t: [12, 15, -13], apex: 4.5 });
  // izquierda (5 m): chimeneas de ladrillo, antena y cajas
  pads.push({ x: -27, y: 0, z: 13, r: 1, t: [-27, 5, 5], apex: 1.6 });
  add(-28.5, 5, -6, -26.5, 7.5, -4, 'brick'); add(-26, 5, -20, -24.5, 6.8, -18.5, 'brick');
  add(-29, 5, -14, -27, 6.2, -11.5, 'crate'); add(-27, 5, -13.6, -25.6, 5.8, -12, 'crate');
  add(-24.4, 5, -30, -24, 5.8, 10, 'whitewall');
  add(-27.6, 5, 2, -27.3, 9, 2.3, 'metal'); add(-28.5, 8.6, 2, -26.4, 8.8, 2.3, 'metal', { nc: 1 });
  /* ---- calle ---- */
  add(-10, 0, 20, -7, 1, 22, 'smooth'); add(6, 0, 22, 9, 1, 24, 'smooth');
  deco.push({ t: 'bush', x: -8.5, y: 1, z: 21, r: .8 }, { t: 'bush', x: 7.5, y: 1, z: 23, r: .8 });
  /* =========================== EDIFICIO =========================== */
  // base oscura (zócalo) y piso de baldosas de la planta baja
  add(-16, 0, -28, 22, 3, -6, 'navy');
  add(-15.6, 3, -27.6, 21.6, 3.05, -6.4, 'tiles');
  // fachada con la entrada, puerta lateral, ventanas de aulas, balcón de la biblioteca y ventanitas cuadradas
  wall(-16, -6.4, 22, -6, 3, 15, [D(-10, -2, 3, 6.6), D(17.5, 21, 3, 5.6),
    D(-14, -11, 7.8, 9.4), D(-7, -4, 7.8, 9.4), D(3, 6, 7.8, 9.4), D(9, 12, 7.8, 9.4), D(15, 15.8, 8.6, 9.4), D(16.6, 17.4, 8.6, 9.4),
    D(-14, -11, 11, 13.4), D(-7, -4, 11.8, 13.4), D(3, 6, 11.8, 13.4), D(9, 12, 11.8, 13.4), D(15, 15.8, 12.6, 13.4), D(16.6, 17.4, 12.6, 13.4)], 'whitewall');
  wall(-16, -28, 22, -27.6, 3, 15, [D(-8, -4, 7.8, 9.4), D(4, 8, 7.8, 9.4), D(-8, -4, 11.8, 13.4), D(2.5, 5.5, 11, 13.4)], 'whitewall');
  // escalera de emergencia por detrás: sube pegada al edificio desde el patio hasta la puerta de la biblioteca
  stairs(-20, -30, 2, -28, 0, .25, 44, 'x', 1, 'step');
  add(2, 0, -30, 6, 11, -28, 'metal');
  add(-20, 0, -30.05, 6, 1, -30, 'rail');
  // segunda escalera de emergencia, del lado este: el que viene por el pasillo derecho ya no choca con la pared, sube hasta la biblioteca
  stairs(6, -30, 22, -28, 0, .25, 44, 'x', -1, 'step');
  add(6, 0, -30.05, 22, 1, -30, 'rail');
  wall(-16, -27.6, -15.6, -6.4, 3, 15, [D(-12, -9, 3, 5.6), D(-22, -18, 7.8, 9.4), D(-12, -9, 7.8, 9.4), D(-22, -18, 11.8, 13.4)], 'whitewall');
  add(21.6, 3, -27.6, 22, 15, -6.4, 'whitewall');
  // escalera: tres tramos en el lado este (planta baja → 1º → 2º → techo)
  // losa del primer piso con el hueco del ascensor (x 12.6–15.2, z -11.6…-9)
  add(-15.6, 6.6, -27.6, 12.6, 7, -6.4, 'tiles'); add(12.6, 6.6, -27.6, 15.2, 7, -11.6, 'tiles'); add(12.6, 6.6, -9, 15.2, 7, -6.4, 'tiles'); add(15.2, 6.6, -27.6, 19.3, 7, -6.4, 'tiles');
  add(19.3, 6.6, -27.6, 21.6, 7, -24, 'tiles'); add(19.3, 6.6, -16, 21.6, 7, -6.4, 'tiles');
  add(-15.6, 10.6, -27.6, 17, 11, -6.4, 'tiles'); add(17, 10.6, -27.6, 19.3, 11, -24, 'tiles'); add(17, 10.6, -16, 19.3, 11, -6.4, 'tiles'); add(19.3, 10.6, -27.6, 21.6, 11, -6.4, 'tiles');
  add(-16, 14.6, -28, 19.3, 15, -6, 'roof'); add(19.3, 14.6, -28, 22, 15, -24, 'roof'); add(19.3, 14.6, -16, 22, 15, -6, 'roof');
  stairs(19.3, -24, 21.6, -16, 3, .25, 16, 'z', -1, 'step');
  stairs(17, -24, 19.3, -16, 7, .25, 16, 'z', 1, 'step');
  stairs(19.3, -24, 21.6, -16, 11, .25, 16, 'z', -1, 'step');
  add(19.22, 3.05, -24, 19.38, 14.6, -16, 'whitewall');                  // tabique entre tramos (nadie queda encajado debajo)
  add(19.3, 7, -16.15, 21.6, 8, -16, 'rail'); add(17, 11, -24.15, 19.3, 12, -24, 'rail'); add(19.3, 15, -16.15, 22, 16, -16, 'rail');
  wall(16.6, -27.6, 17, -6.4, 3, 6.6, [D(-11, -8, 3, 5.6)], 'whitewall');
  wall(16.6, -27.6, 17, -6.4, 7, 10.6, [D(-27.2, -24.6, 7, 9.6)], 'whitewall');
  wall(16.6, -27.6, 17, -6.4, 11, 14.6, [D(-11, -8, 11, 13.6)], 'whitewall');
  // ascensor de salto: tubo de vidrio entre la planta baja y el primer piso, abierto hacia el oeste.
  // Pisá el saltador para subir; para bajar, tirate por el hueco (si caés encima no te vuelve a lanzar)
  add(12.6, 3.05, -11.6, 15.2, 10.6, -11.4, 'tube'); add(12.6, 3.05, -9.2, 15.2, 10.6, -9, 'tube'); add(15, 3.05, -11.4, 15.2, 10.6, -9.2, 'tube');
  add(12.55, 3.05, -11.65, 12.65, 10.6, -11.55, 'neonC', { nc: 1 }); add(12.55, 3.05, -9.05, 12.65, 10.6, -8.95, 'neonC', { nc: 1 });
  add(12.6, 6.98, -11.4, 12.8, 7.02, -9.2, 'neonC', { nc: 1 });
  pads.push({ x: 13.9, y: 3.05, z: -10.3, r: .75, t: [10.4, 7, -10.3], apex: 1.6, soft: 1 });
  // planta baja: hall con recepción y aulas al fondo
  add(-6, 3.05, -12, 0, 4.1, -11, 'wood');
  wall(-15.6, -18.2, 16.6, -17.8, 3.05, 6.6, [D(-12, -9, 3, 5.6), D(-1, 2, 3, 5.6), D(9, 12, 3, 5.6)], 'whitewall');
  add(-4.2, 3.05, -27.6, -3.8, 6.6, -18.2, 'whitewall'); add(5.8, 3.05, -27.6, 6.2, 6.6, -18.2, 'whitewall');
  for (const [x0, x1] of [[-14, -6], [-2, 4], [8, 15]]) for (const z of [-25, -22]) add(x0, 3.05, z, x1, 3.85, z + .8, 'wood');
  // primer piso: pasillo sobre la fachada y aulas
  wall(-15.6, -12.2, 16.6, -11.8, 7, 10.6, [D(-12, -9, 7, 9.6), D(-2, 1, 7, 9.6), D(8, 11, 7, 9.6)], 'whitewall');
  add(-4.2, 7, -27.6, -3.8, 10.6, -12.2, 'whitewall'); add(5.8, 7, -27.6, 6.2, 10.6, -12.2, 'whitewall');
  for (const [x0, x1] of [[-14, -6], [-2, 4], [8, 15]]) for (const z of [-24, -20, -16]) add(x0, 7, z, x1, 7.8, z + .8, 'wood');
  add(-14, 7, -27.5, -9, 9.4, -27.3, 'board'); add(-2, 7, -27.5, 4, 9.4, -27.3, 'board');
  // segundo piso: biblioteca abierta con estanterías y balcón
  for (const z of [-25, -21, -17]) { add(-13, 11, z, -3, 13, z + .6, 'wood'); add(1, 11, z, 12, 13, z + .6, 'wood'); }
  add(-15, 10.6, -6, -10, 11, -3.6, 'whitewall');
  add(-15, 11, -3.75, -10, 12, -3.6, 'rail'); add(-15, 11, -6, -14.85, 12, -3.6, 'rail'); add(-10.15, 11, -6, -10, 12, -3.6, 'rail');
  // terraza en el techo con parapeto
  add(-16, 15, -6.4, 22, 16, -6, 'whitewall'); add(-16, 15, -28, 22, 16, -27.6, 'whitewall');
  add(-16, 15, -27.6, -15.6, 16, -6.4, 'whitewall'); add(21.6, 15, -27.6, 22, 16, -6.4, 'whitewall');
  add(4, 15, -22, 10, 17, -18, 'metal');                            // sala de máquinas
  /* ---- cartel, logo y equipos de aire ---- */
  deco.push({ t: 'logo', x: 0, y: 5.4, z: -5.92, r: 1.15 });
  deco.push({ t: 'sign', x: 6.3, y: 5.4, z: -5.92, w: 9, h: 1.9 });
  for (const [x, y] of [[13.5, 8.8], [16.5, 10.2], [13.5, 12.6], [18.5, 12.2]]) deco.push({ t: 'ac', x, y, z: -5.75 });
  deco.push({ t: 'lamp', x: -5, y: 5.6, z: -5.92 }, { t: 'lamp', x: 12, y: 5.6, z: -5.92 }, { t: 'lamp', x: 18, y: 2.2, z: -5.92 });
  /* ---- ítems ---- */
  I('w2', 3, 1.5, 1); I('w3', 0, 0, 24); I('w4', 13, 3, -3.5); I('w9', -12.5, 11, -4.8); I('w8', 14, 15, -26); I('w5', 0, 15, -12);
  I('w6', -10, 7, -20); I('w1', -19, 3, -12); I('quad', 2, 11, -19); I('mega', -3, 3.05, -14.5); I('armorH', -12, 11, -26); I('armor', 19, 0, 8);
  I('health', -6, 1.5, 10); I('health', 15, 0, 20); I('health', 12, 3.05, -25); I('health', 12, 7, -9); I('health', -18, 3, -20);
  // polideportivo
  I('health', -49, 0, 0); I('armorH', -49, 0, -16.7); I('w2', -58, 0, -26); I('health', -63, 0, -25); I('health', -41, 0, -25.5); I('health', -55, 5, 27.5); I('rockets', -34, 5.5, -10);
  I('shells', -60, 5.5, -25); I('bullets', -35, 0, 20); I('health', -34, 5.5, 4); I('grenades', -64, 0, 20);
  I('armor', 27, 7, -4); I('health', 25.5, 7, 6); I('bullets', 28, 7, -10.5); I('grenades', 27, 10.4, -22.5);
  I('armor', -27, 5, -9); I('health', -25.5, 5, 6); I('shells', -28, 5, -16); I('health', 14, 0, -29);
  I('shells', -14, 3.05, -14); I('bullets', 6, 3, -4); I('rockets', 10, 15, -10); I('grenades', -10, 7, -9); I('slugs', 0, 7, -26); I('caza', -20, 0, 20);
  /* ---- apariciones ---- */
  [[-8, 1.5, 8], [6, 1.5, 6], [0, 1.5, 11], [13, 1.5, 11.5], [-20, 0, 22], [0, 0, 21], [18, 0, 24], [10, 3, -3.5], [-19, 3, -10],
   [-10, 3.05, -14], [8, 3.05, -14], [27, 7, -9], [-27, 5, -2], [-45, 0, -8], [-53, 0, 8], [-63, 0, -27], [-40, 0, -27], [-34, 5.5, -5], [-50, 5, 27.5], [-63, 0, 10], [-10, 7, -9], [8, 7, -9], [1, 7, -13.2], [-8, 11, -12], [10, 11, -12]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces ---- */
  lights.push({ x: -2, y: 5.8, z: -13, c: 0xfff2dc, i: .55, d: 18 }, { x: 6, y: 9.8, z: -9, c: 0xfff2dc, i: .5, d: 20 },
    { x: 0, y: 13.6, z: -18, c: 0xffe6c0, i: .55, d: 22 }, { x: 19, y: 9, z: -20, c: 0xfff2dc, i: .45, d: 16 },
    { x: -49, y: 12, z: 2, c: 0xfff6e6, i: .9, d: 42 }, { x: -50, y: 4, z: -25, c: 0xffe6c0, i: .6, d: 16 });
  return finish({ id: 'lacuenca', name: 'dm3 · La Cuenca', bounds: { x0: -67, x1: 27, z0: -30, z1: 28 }, deco,
    theme: { sky: 'day', fog: 0xbfd3e6, fogD: .0045, amb: 0xc9d0da, ambI: .48, hemi: [0xbcd8ff, 0x8a7a62, .42], sun: true, sunC: 0xfff1d6, sunI: .72 } });
}
MAPDEFS.lacuenca = buildLaCuenca;

