/* ---------- Skatenight — el skatepark de la Costanera de Posadas, de noche ----------
   Norte = -z (el río y la tribuna), sur = +z (la calle). Mapa de noche: en el cliente (theme.noche) cada arma lleva linterna
   y los rivales casi no se ven hasta que los alumbrás o te alumbran.
   · Plaza de concreto a nivel 0 con dos bowls hundidos al oeste (-3 y -2 m), tres pirámides/hips (1,5 · 2,4 m), una caja de
     «bank to ledge» con el cartel PROHIBIDO NIÑOS ZOMBIES, un bank con terraza contra la valla este y la plataforma sur con escalera.
   · Tribuna de 10 gradas al norte (sube hasta 5 m, con pasillo y baranda sobre el río).
   · Tres torres de andamio (oeste-norte, sur-oeste y este) con piso a 2,5 y a 5 m, unidas por pasarelas a 5 m con la tribuna.
   · Cuatro saltadores y dos portales (uno en el rincón sur-oeste y otro arriba de la tribuna: lejísimos entre sí).
   · Casi todos los reflectores están apagados: solo algunos pozos de luz, la linterna y la luna. */
function buildSkatenight() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  // baranda física de 1 m (se puede saltar, no se atraviesa); si es un tramo corto en x o en z se le da grosor solo
  const bar = (x0, z0, x1, z1, y) => add(Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1) + (x0 === x1 ? .1 : 0), y + 1, Math.max(z0, z1) + (z0 === z1 ? .1 : 0), 'rail');
  const graf = (x, y, z, w, h, txt, fg, bg, ry) => deco.push({ t: 'cartel', x, y, z, w, h, txt, fg, bg: bg || '#1d1d22', ry: ry || 0 });
  // reflector de estadio (4 cabezales): apagado casi siempre; y0 = altura del piso donde apoya
  const poste = (x, z, on, y0) => {
    y0 = y0 || 0; add(x - .12, y0, z - .12, x + .12, y0 + 6.8, z + .12, 'metal'); add(x - .95, y0 + 6.8, z - .1, x + .95, y0 + 6.95, z + .1, 'black', { nc: 1 });
    for (const dx of [-.66, -.22, .22, .66]) { add(x + dx - .17, y0 + 6.95, z - .22, x + dx + .17, y0 + 7.4, z + .22, 'black', { nc: 1 }); if (on) add(x + dx - .13, y0 + 6.9, z - .16, x + dx + .13, y0 + 6.95, z + .16, 'light', { nc: 1 }); }
    if (on) deco.push({ t: 'glow', x, y: y0 + 6.7, z, c: 0xffc070 });
  };
  // graffitis (deco 'graf'): sobre rampas, piso y muros; en colores de aerosol, se ven bien solo con la linterna
  const NEON = ['#ff3fd2', '#2be6ff', '#ffe03a', '#5dff7a', '#ff7a2a', '#b46cff', '#ff4a5a', '#4aa0ff']; let tn = 0;
  const tag = (x, y, z, w, h, txt, rx, ry) => deco.push({ t: 'graf', x, y, z, w, h, txt, fg: NEON[(tn++) % NEON.length], rx, ry });
  const flat = (x, z, y, w, h, txt, ry) => tag(x, y + .03, z, w, h, txt, -Math.PI / 2, ry || 0);                 // en el piso
  const wallTag = (x, y, z, w, h, txt, ry) => tag(x, y, z, w, h, txt, 0, ry);                                    // en un muro vertical (ry: hacia dónde mira)
  const slope = (cx, cy, cz, ry, alpha, w, h, txt) => { const hx = Math.sin(ry), hz = Math.cos(ry), sa = Math.sin(alpha), ca = Math.cos(alpha); tag(cx + hx * sa * .04, cy + ca * .04, cz + hz * sa * .04, w, h, txt, alpha - Math.PI / 2, ry); };   // sobre una rampa que mira hacia ry
  // palmera con tronco sólido (el tronco es invisible, la copa la dibuja la decoración)
  const palma = (x, z, h) => { deco.push({ t: 'palm', x, y: 0, z, h }); add(x - .25, 0, z - .25, x + .25, 4, z + .25, 'clip'); };
  // coronamiento (borde liso) de la boca de un bowl
  const coping = (x0, z0, x1, z1) => { add(x0, 0, z0, x1, .09, z0 + .22, 'smooth', { nc: 1 }); add(x0, 0, z1 - .22, x1, .09, z1, 'smooth', { nc: 1 }); add(x0, 0, z0, x0 + .22, .09, z1, 'smooth', { nc: 1 }); add(x1 - .22, 0, z0, x1, .09, z1, 'smooth', { nc: 1 }); };
  // pirámide (hip): tope liso a altura h y cuatro rampas de w metros
  const hip = (cx, cz, hx, hz, h, w) => {
    add(cx - hx, 0, cz - hz, cx + hx, h, cz + hz, 'smooth');
    ramp(cx - hx, cz - hz - w, cx + hx, cz - hz, 0, 0, h, 'z', 1, 'concrete'); ramp(cx - hx, cz + hz, cx + hx, cz + hz + w, 0, 0, h, 'z', -1, 'concrete');
    ramp(cx - hx - w, cz - hz, cx - hx, cz + hz, 0, 0, h, 'x', 1, 'concrete'); ramp(cx + hx, cz - hz, cx + hx + w, cz + hz, 0, 0, h, 'x', -1, 'concrete');
  };
  // torre de andamio de 6x6: piso a 2,5 (escalera desde el sur) y piso a 5 en la mitad este (escalera interna); rail=sin baranda en esa cara del piso alto
  const torre = (x0, z0, abierto) => {
    add(x0, 2.2, z0, x0 + 6, 2.5, z0 + 6, 'grate'); add(x0 + 3, 4.7, z0, x0 + 6, 5, z0 + 6, 'grate');
    for (const [px, pz] of [[x0, z0], [x0 + 5.8, z0], [x0, z0 + 5.8], [x0 + 5.8, z0 + 5.8]]) add(px, 0, pz, px + .2, px > x0 ? 4.7 : 2.2, pz + .2, 'metal');
    add(x0 + 2.9, 2.5, z0 + 5.8, x0 + 3.1, 4.7, z0 + 6, 'metal');                   // apoyo del piso alto (sobre la baranda sur)
    stairs(x0, z0 + 6, x0 + 2, z0 + 11, 0, .5, 5, 'z', -1, 'metal');                 // subida al piso bajo
    stairs(x0, z0, x0 + 3, z0 + 2, 2.5, .5, 5, 'x', 1, 'metal');                     // del piso bajo al alto
    bar(x0, z0, x0 + 6, z0, 2.5); bar(x0, z0 + 2, x0, z0 + 6, 2.5); bar(x0 + 2, z0 + 6, x0 + 6, z0 + 6, 2.5); bar(x0 + 6, z0, x0 + 6, z0 + 6, 2.5);   // piso bajo
    // piso alto: el hueco de la baranda es donde sale la pasarela (norte: x0+4..x0+6 · este: z0+2..z0+4)
    if (abierto === 'n') bar(x0 + 3, z0, x0 + 4, z0, 5); else bar(x0 + 3, z0, x0 + 6, z0, 5);
    if (abierto === 'e') { bar(x0 + 6, z0, x0 + 6, z0 + 2, 5); bar(x0 + 6, z0 + 4, x0 + 6, z0 + 6, 5); } else bar(x0 + 6, z0, x0 + 6, z0 + 6, 5);
    bar(x0 + 3, z0 + 6, x0 + 6, z0 + 6, 5);
    // farol del piso alto
    add(x0 + 5.4, 5, z0 + .4, x0 + 5.6, 6.6, z0 + .6, 'metal'); add(x0 + 5.1, 6.6, z0 + .1, x0 + 5.9, 6.8, z0 + .9, 'black', { nc: 1 });
    deco.push({ t: 'glow', x: x0 + 5.5, y: 6.45, z: z0 + .5, c: 0x9ac0ff });
  };

  /* ---- suelo: subsuelo de roca, plaza con dos huecos (bowls) y borde ---- */
  add(-70, -8, -60, 70, -3.5, 60, 'rock');
  const slab = (x0, z0, x1, z1) => add(x0, -3.5, z0, x1, 0, z1, 'concrete');
  slab(-26, -32, 55.8, -10); slab(-55.8, -10, 55.8, -4); slab(-34, -4, 55.8, 12); slab(-55.8, 12, 55.8, 52);
  slab(-55.8, -36, 55.8, -32); slab(-55.8, -32, -52, -10); slab(-55.8, -4, -52, 12);
  // bowl 1 (grande, oeste-norte): piso a -3
  add(-52, -3.5, -32, -26, -3, -10, 'concrete');
  ramp(-52, -32, -47, -10, -3, -3, 0, 'x', -1, 'concrete'); ramp(-31, -32, -26, -10, -3, -3, 0, 'x', 1, 'concrete');
  ramp(-52, -32, -26, -27, -3, -3, 0, 'z', -1, 'concrete'); ramp(-52, -15, -26, -10, -3, -3, 0, 'z', 1, 'concrete');
  coping(-52, -32, -26, -10);
  // bowl 2 (más chico, oeste-sur): piso a -2
  add(-52, -3.5, -4, -34, -2, 12, 'concrete');
  ramp(-52, -4, -48, 12, -2, -2, 0, 'x', -1, 'concrete'); ramp(-38, -4, -34, 12, -2, -2, 0, 'x', 1, 'concrete');
  ramp(-52, -4, -34, 0, -2, -2, 0, 'z', -1, 'concrete'); ramp(-52, 8, -34, 12, -2, -2, 0, 'z', 1, 'concrete');
  coping(-52, -4, -34, 12);
  deco.push({ t: 'bruma', x0: -56, x1: 56, z0: -36, z1: 52, y: .35, o: .3, dir: 1 });   // una sola capa baja (a la altura de las rodillas): más capas se ven como franjas
  deco.push({ t: 'bruma', x0: -52, x1: -26, z0: -32, z1: -10, y: -2.3, o: .5, dir: 1 }, { t: 'bruma', x0: -52, x1: -34, z0: -4, z1: 12, y: -1.3, o: .46, dir: -1 });

  /* ---- límites: valla al oeste y al este, mural al sur y al norte-oeste, río al norte; todo cerrado por arriba y por los costados ---- */
  add(-56, 0, -36, -55.8, 4.2, 52, 'fence'); add(55.8, 0, -32, 56, 4.2, 52, 'fence');
  for (let z = -36; z <= 52; z += 6) { add(-56.1, 0, z, -55.8, 4.4, z + .3, 'metal'); if (z >= -32) add(55.8, 0, z, 56.1, 4.4, z + .3, 'metal'); }
  add(-56.1, 4.2, -36, -55.8, 4.4, 52, 'metal'); add(55.8, 4.2, -32, 56.1, 4.4, 52, 'metal');
  add(-55.8, 0, 51.7, 55.8, 4.2, 51.9, 'fence'); add(-55.8, 4.2, 51.6, 55.8, 4.4, 52, 'metal'); add(-55.8, 0, -36.2, -2, 4.2, -36, 'fence'); add(-55.8, 4.2, -36.3, -2, 4.4, -35.9, 'metal');   // vallas de alambre: al norte se ve el río, al sur la calle
  for (let x = -55.8; x <= 55; x += 6) add(x, 0, 51.5, x + .3, 4.4, 52.1, 'metal'); for (let x = -55.8; x <= -2; x += 6) add(x, 0, -36.4, x + .3, 4.4, -35.8, 'metal');
  add(-60, -8, -44, -55.8, 60, 58, 'clip'); add(55.8, -8, -44, 60, 60, 58, 'clip'); add(-60, -8, -44, 60, 60, -36.2, 'clip');
  add(-60, -8, 52, 60, 60, 58, 'clip'); add(-60, 24, -44, 60, 60, 58, 'clip');     // techo del mapa: inalcanzable ni con rocket jump
  lava.push({ min: [-420, -4, -260], max: [420, 0, -36.6], water: true, dps: 0 });   // el Paraná, al otro lado del muro: solo se ve
  // afuera: pasto oscuro y la calle con autos estacionados (solo se ven)
  add(-420, -.5, -36.6, -56.5, -.05, 400, 'grass', { nc: 1 }); add(56.5, -.5, -36.6, 420, -.05, 400, 'grass', { nc: 1 }); add(-56.5, -.5, 52, 56.5, -.05, 400, 'grass', { nc: 1 });
  add(-56.5, -.05, 57, 56.5, 0, 66, 'rock', { nc: 1 });
  for (const [x, z, c] of [[-34, 60.5, 'barn'], [8, 61.5, 'navy'], [38, 60.5, 'barn']]) { add(x, 0, z, x + 4.4, 1, z + 1.9, c, { nc: 1 }); add(x + 1, 1, z + .1, x + 3.2, 1.7, z + 1.8, 'black', { nc: 1 }); }
  palma(-53.5, -34, 9); palma(-53.5, 35, 8); palma(53.5, 35, 9); palma(-53.5, 10, 8); palma(53.5, -2, 8); palma(-10, 35.5, 7);
  palma(-60, 20, 8); palma(62, 14, 9); palma(-30, 55, 8); palma(24, 55, 9); palma(-53.5, 49, 8); palma(53.5, 49, 9);

  /* ---- tribuna al norte: 10 gradas hasta 5 m, pasillo de arriba con baranda sobre el río ---- */
  // las 4 primeras gradas son macizas (con dos entradas de 3 m en x 14..17 y 36..39); de la 5 en adelante están huecas por debajo (a 2 m):
  // abajo queda una galería oscura de 7 m de fondo, abierta al oeste, con pilares y botín: el escondite del mapa
  for (let i = 1; i <= 10; i++) {
    const za = -20 - 1.2 * i, zb = za + 1.2, top = .5 * i;
    if (i <= 4) { for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) add(a, 0, za, b, top, zb, 'concrete'); }
    else add(-2, 2, za, 54, top, zb, 'concrete');
  }
  for (const x of [6, 22, 30, 46]) add(x, 0, -29.3, x + .6, 2, -28.7, 'concrete');
  add(-2, 0, -36, 54, 5, -32, 'concrete');
  bar(-2, -36, 54, -36, 5);
  add(54, 0, -36, 55.8, 5, -20, 'concrete');                                       // cabecera este de la tribuna
  /* ---- andamios, pasarelas y plataforma sur ---- */
  torre(-22, -24, 'e'); torre(-30, 18, ''); torre(40, 10, 'n');
  // pasarela 1: de la torre norte-oeste a la tribuna, a 5 m (L: 12 m al este y 16 m al norte)
  add(-16, 4.7, -22, -4, 5, -20, 'grate'); add(-4, 4.7, -36, -2, 5, -20, 'grate');
  bar(-16, -22, -4, -22, 5); bar(-16, -20, -4, -20, 5); bar(-4, -36, -4, -30, 5); bar(-4, -26.6, -4, -22, 5); bar(-2.1, -32, -2.1, -20, 5); bar(-4, -36, -2, -36, 5);
  for (const [x, z] of [[-10.1, -22], [-10.1, -20.2], [-3.1, -26], [-3.1, -22.4]]) add(x, 0, z, x + .2, 4.7, z + .2, 'metal');
  // pasarela 2: de la tribuna a la torre este, a 5 m (2 m de ancho sobre la plaza)
  add(44, 4.7, -30.8, 46, 5, 10, 'grate');
  bar(44, -30.8, 44, 10, 5); bar(46, -30.8, 46, 10, 5);
  for (const z of [-14, -4, 6]) { add(43.9, 0, z, 44.1, 4.7, z + .2, 'metal'); add(45.9, 0, z, 46.1, 4.7, z + .2, 'metal'); }
  // plataforma sur (2 m) con escalera al norte y rampa al este
  add(18, 0, 26, 34, 2, 37, 'concrete'); stairs(18, 22, 34, 26, 0, .5, 4, 'z', 1, 'concrete'); ramp(34, 26, 40, 37, 0, 0, 2, 'x', -1, 'concrete'); bar(18, 36.9, 34, 36.9, 2);
  /* ---- pirámides, bank con cartel, billboard y terraza contra la valla ---- */
  hip(-12, 2, 3, 2.5, 1.5, 4); hip(14, 2, 4, 3, 2.4, 5);
  ramp(-6, 24, 0, 30, 0, 0, 1, 'x', 1, 'concrete'); add(0, 0, 24, 8, 1, 30, 'smooth'); ramp(8, 24, 14, 30, 0, 0, 1, 'x', -1, 'concrete');   // bank to ledge
  add(0, 1, 24, 8, 1.08, 24.2, 'rail', { nc: 1 });
  graf(4, .5, 30.02, 7.6, .8, 'PROHIBIDO NIÑOS ZOMBIES', '#2a2a28', '#6e6c66');
  ramp(46, 20, 52, 31, 0, 0, 2.6, 'x', 1, 'concrete'); add(52, 0, 20, 55.8, 2.6, 31, 'smooth'); bar(46, 20, 55.8, 20, 2.6); bar(46, 31, 55.8, 31, 2.6);
  // poste de luz con transformador, como el de la foto
  add(-46.3, 0, 29.7, -45.7, 11, 30.3, 'concrete'); add(-48.2, 9.6, 29.85, -43.8, 9.8, 30.15, 'metal', { nc: 1 }); add(-47.4, 7.6, 29.5, -46.6, 8.8, 30.5, 'metal', { nc: 1 }); add(-45.4, 7.6, 29.5, -44.6, 8.8, 30.5, 'metal', { nc: 1 });
  // cajones, muretes y cobertura baja
  for (const [x, z, s] of [[-6, -16, 1.5], [30, -6, 1.2], [-20, 14, 1.2], [4, 20, 1.2], [38, 2, 1.5], [-42, 20, 1.2], [22, -14, 1.2], [8, -12, 1.2]]) add(x, 0, z, x + s * 1.4, s, z + s, 'crate');
  add(-28, 0, 8, -22, .9, 8.6, 'smooth'); add(34, 0, -14, 40, .9, -13.4, 'smooth');
  // zona sur nueva (z 38..51): media caña (mini ramp) al oeste, escalera con terraza al medio, muros de cobertura y salida con saltador
  ramp(-34, 42, -29, 50, 0, 0, 1.8, 'x', -1, 'concrete'); add(-38, 0, 42, -34, 1.8, 50, 'smooth'); ramp(-21, 42, -16, 50, 0, 0, 1.8, 'x', 1, 'concrete'); add(-16, 0, 42, -12, 1.8, 50, 'smooth');
  stairs(8, 40, 20, 46, 0, .5, 4, 'x', 1, 'concrete'); add(20, 0, 40, 30, 2, 46, 'smooth'); ramp(30, 40, 36, 46, 0, 0, 2, 'x', -1, 'concrete'); bar(20, 40, 30, 40, 2); bar(20, 46, 30, 46, 2);
  for (const [x0, z0, x1, z1] of [[-8, 40, -7.6, 48], [40, 46, 48, 46.4], [0, 38.6, 6, 39], [-45, 42, -44.6, 49], [46, 40, 46.4, 44]]) add(x0, 0, z0, x1, 3, z1, 'concrete');
  add(38, 0, 49, 42, 1.2, 50.6, 'crate'); add(-4, 0, 47, -1, 1.2, 48.6, 'crate'); add(-48, 0, 41, -46.4, 1.2, 44, 'crate');
  pads.push({ x: -24, y: 0, z: 46, r: 1.1, t: [-25.5, 5, 21], apex: 3 });          // media caña -> piso alto de la torre sur-oeste
  I('health', -36, 1.8, 46); I('armor', -14, 1.8, 46); I('shells', 25, 2, 43); I('rockets', 0, 0, 44); I('bullets', 44, 0, 44); I('health', 14, 0, 49); I('slugs', -42, 0, 46); I('grenades', 48, 0, 48); I('armor', 6, 0, 42);
  [[-24, 0, 48], [0, 0, 44], [14, 0, 48], [44, 0, 44], [25, 2, 43], [-42, 0, 46]].forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  // ascensor rápido: sube del piso de la plaza a la pasarela de la tribuna (5 m) cada 10 s; el costado cyan se enciende solo
  mover(-7.6, -.36, -30, -4, .04, -26.6, 'metal', 1, 5, 10, -Math.PI / 2);
  // muros de cobertura (3 m): cortan la línea de tiro de la plaza y dejan esquinas para esperar a oscuras
  for (const [x0, z0, x1, z1] of [[-12, -18, -11.6, -10], [22, -9, 30, -8.6], [41, -4, 41.4, 6], [-26, 28, -18, 28.4], [-2, -2, -1.6, 6], [10, 18, 18, 18.4], [44, 34, 52, 34.4], [-8, 9, -7.6, 16]]) add(x0, 0, z0, x1, 3, z1, 'concrete');
  // kiosko con techo: dos puertas al norte y al sur, una al este; se sube al techo (3 m) por una escalera de afuera
  wall(-31, -1, -22, -.6, 0, 2.8, [D(-28, -25, 0, 2.2)], 'brick'); wall(-31, 5.6, -22, 6, 0, 2.8, [D(-30, -27, 0, 2.2)], 'brick');
  wall(-31, -.6, -30.6, 5.6, 0, 2.8, [], 'brick'); wall(-22.4, -.6, -22, 5.6, 0, 2.8, [D(1, 3.4, 0, 2.2)], 'brick');
  add(-31.2, 2.7, -1.2, -21.8, 3, 6.2, 'roof'); stairs(-31, -6, -29, -1, 0, .5, 6, 'z', 1, 'concrete');
  bar(-29, -1.2, -21.8, -1.2, 3); bar(-31.2, -1.2, -31.2, 6.2, 3); bar(-31.2, 6.2, -21.8, 6.2, 3); bar(-21.8, -1.2, -21.8, 6.2, 3);
  deco.push({ t: 'cartel', x: -26.5, y: 2.5, z: -1.03, w: 3.2, h: .5, txt: 'KIOSCO 24 HS', bg: '#2a1c14', fg: '#a8844a', ry: Math.PI });
  /* ---- graffitis: bowls, pirámides, muros y piso ---- */
  const A1 = Math.atan2(3, 5), A2 = Math.atan2(2, 4), P = Math.PI;
  for (const [x, txt] of [[-44, 'OXIDE'], [-34, 'LOST']]) slope(x, -1.5, -29.5, 0, A1, 4.6, 2.4, txt);
  for (const [x, txt] of [[-42, 'FREE SKATE'], [-32, 'RISE']]) slope(x, -1.5, -12.5, P, A1, 4.6, 2.4, txt);
  for (const [z, txt] of [[-24, '720'], [-18, 'CRAZE']]) slope(-49.5, -1.5, z, P / 2, A1, 4.6, 2.4, txt);
  for (const [z, txt] of [[-24, 'DEAD'], [-18, 'SKATE']]) slope(-28.5, -1.5, z, -P / 2, A1, 4.6, 2.4, txt);
  flat(-39, -21, -3, 7, 3.2, 'CKATE HOME', .3); flat(-45, -28, -3, 4, 2, 'XX', -.4);
  slope(-43, -1, -2, 0, A2, 4.4, 2.2, 'LOST'); slope(-43, -1, 10, P, A2, 4.4, 2.2, 'OXIDE'); slope(-50, -1, 4, P / 2, A2, 4.4, 2.2, 'NOCHE'); slope(-36, -1, 4, -P / 2, A2, 3.6, 2, 'ZZ');
  flat(-43, 3.5, -2, 5.5, 2.6, 'SKATE DIE', -.5);
  slope(-12, .75, -2.5, P, Math.atan2(1.5, 4), 3.6, 1.6, 'RIDE'); slope(14, 1.2, -3.5, P, Math.atan2(2.4, 5), 5, 2.4, 'OXIDE'); slope(14, 1.2, 7.5, 0, Math.atan2(2.4, 5), 5, 2.4, 'LOST');
  flat(-14, -26, 0, 6, 3, 'OXIDE', .2); flat(20, -14, 0, 5, 2.5, 'LOST', -.3); flat(38, 22, 0, 5, 2.5, 'RISE', .6); flat(-10, 40, 0, 6, 3, 'SKATE', 0); flat(-40, 30, 0, 5, 2.5, '720', .9); flat(46, 46, 0, 5, 2.5, 'CRAZE', -.5); flat(0, 6, 0, 5, 2, 'NO DIE', 1.2);
  wallTag(-11.58, 1.5, -14, 5, 2, 'FREE SKATE', P / 2); wallTag(26, 1.5, -8.58, 5, 2, 'RISE', 0); wallTag(40.98, 1.5, 1, 5, 2, 'LOST', -P / 2); wallTag(-22, 1.5, 27.98, 5, 2, 'CRAZE', P);
  wallTag(14, 1.5, 18.42, 5, 2, 'DEAD', 0); wallTag(-8.02, 1.5, 12.5, 5, 2, '720', -P / 2); wallTag(-1.58, 1.5, 2, 5, 2, 'OXIDE', P / 2);
  // basura y escombros afuera de las vallas (solo se ven): palets y rocas
  for (const [x, z] of [[-60, -20], [-61, 6], [-59, 30], [-26, 56], [14, 57], [44, 56], [60, 20], [61, -4]]) { add(x, 0, z, x + 1.4, .14, z + 1.1, 'wood', { nc: 1 }); add(x + .1, .14, z + .1, x + 1.3, .28, z + 1, 'wood', { nc: 1 }); add(x + 1.9, 0, z + .4, x + 2.6, .5, z + 1.1, 'rock', { nc: 1 }); }
  // orilla del río al norte: banco de pasto con juncos
  add(-58, -1, -44, -2, .3, -37.2, 'grass', { nc: 1 }); for (let x = -56; x <= -4; x += 5) deco.push({ t: 'bush', x, y: .3, z: -39.5 + (x % 3), r: .8 });
  // reflectores: casi todos apagados
  for (const [x, z, on] of [[-54.2, -26, 0], [-54.2, -6, 0], [-54.2, 14, 0], [-54.2, 28, 1], [-54.2, 46, 0], [-40, 50.6, 0], [-20, 50.6, 0], [2, 50.6, 1], [24, 50.6, 0], [46, 50.6, 0], [54.6, -14, 0], [54.6, 6, 1], [54.6, 34, 0], [54.6, 46, 0], [0, -8, 0], [36, 18, 0], [-20, 34, 0], [30, -18, 0]]) poste(x, z, on);
  for (const [x, on] of [[8, 0], [28, 1], [48, 0]]) poste(x, -35.5, on, 5);   // sobre el pasillo de la tribuna

  /* ---- portales: uno en el rincón sur-oeste y otro arriba de la tribuna ---- */
  teles.push({ x: -46, y: 0, z: 34, r: 1, to: [46.5, 5, -33.7], yaw: face(46.5, -33.7, 0, 0), color: 'yellow' });
  teles.push({ x: 51, y: 5, z: -33.8, r: 1, to: [-42, 0, 31], yaw: face(-42, 31, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -46, y: 0, z: 34, r: 1, color: 'yellow' }, { t: 'portal', x: 51, y: 5, z: -33.8, r: 1, color: 'blue' });
  /* ---- saltadores ---- */
  pads.push({ x: -36, y: -3, z: -21, r: 1.1, t: [-17.2, 5, -21], apex: 3 });       // bowl grande -> piso alto de la torre norte-oeste
  pads.push({ x: -45, y: -2, z: 6.5, r: 1.1, t: [-25.5, 5, 21], apex: 3 });        // bowl chico -> piso alto de la torre sur-oeste
  pads.push({ x: 0, y: 0, z: -12, r: 1.1, t: [10, 5, -34], apex: 2.5 });           // plaza -> pasillo de la tribuna
  pads.push({ x: 32, y: 0, z: 22, r: 1.1, t: [44.5, 5, 13], apex: 2.5 });          // plaza este -> piso alto de la torre este

  /* ---- ítems (todo lo que ya existe) ---- */
  // armaduras amarillas: pasillo de la tribuna, bowl chico y debajo del cartel
  I('armorH', 1, 5, -34); I('armorH', -41, -2, 2); I('armorH', 0, 0, 14);
  I('quad', 45, 5, -8); I('mega', -25.5, 5, 21);
  // armas
  I('w1', -12, 1.5, 2); I('w2', 0, 0, 12.5); I('w3', -39, -3, -24); I('w4', 26, 2, 31); I('w5', 41.5, 2.5, 14.5); I('w6', 24, 4.5, -30.2); I('w8', 45, 5, -27); I('w9', -17.5, 5, -22);
  // munición
  I('shells', 14, 2.4, 2); I('shells', -30, 0, -34); I('bullets', 52, 2.6, 25); I('bullets', -24, 0, -7); I('rockets', 22, 0, 20); I('rockets', 41, 5, -34); I('grenades', -50, 0, 30); I('grenades', 4, 0, -8);
  I('slugs', 14, 5, -34); I('slugs', -47, -2, 2); I('caza', 30, 2, 31); I('caza', -21, 2.5, -20);
  // chalecos y botiquines
  I('armor', -14, 1.5, 2); I('armor', 30, 0, -14); I('armor', -34, -3, -17); I('armor', 24, 5, -34); I('armor', 42, 0, 28); I('armor', -6, 0, 33);
  I('health', -40, -3, -18); I('health', -43, -2, 4); I('health', 14, 2.4, 0); I('health', 6, 5, -34); I('health', 36, 5, -34); I('health', -18, 2.5, -19.5); I('health', -27, 2.5, 21);
  I('health', 42.5, 2.5, 12.5); I('health', 54, 2.6, 22); I('health', -3, 0, -2); I('health', 30, 0, 8); I('health', -8, 0, 24); I('health', 44, 0, 36); I('health', -50, 0, -34); I('health', 8, 0, -17);

  // galería bajo la tribuna y kiosko: botín en la oscuridad
  I('armor', 10, 0, -28.2); I('bullets', 44, 0, -28); I('health', 26, 0, -29); I('shells', 34, 0, -27); I('rockets', 2, 0, -27);
  I('armor', -26, 0, 2); I('rockets', -29, 0, 4); I('slugs', -26, 3, 2); I('health', -24, 3, 5);
  /* ---- apariciones: repartidas por todos los niveles ---- */
  [[-12, 0, -34], [-8, 0, -14], [4, 0, -8], [22, 0, -10], [38, 0, -12], [50, 0, -8], [50, 0, 6], [30, 0, 2], [38, 0, 18], [8, 0, 34], [-20, 0, 32], [-36, 0, 22], [-50, 0, 20], [-48, 0, -34], [-20, 0, -33], [-24, 0, -6],
   [-40, -3, -20], [-34, -3, -24], [-43, -2, 3], [6, 5, -34], [20, 5, -34], [34, 5, -34], [26, 3, -26.6], [-17, 5, -21], [-25.5, 5, 21], [44.5, 5, 13], [45, 5, -10], [26, 2, 31], [14, 2.4, 2], [-12, 1.5, 2], [42, 2.5, 13], [-20, 2.5, -21], [20, 0, -28], [44, 0, -28], [8, 0, -27], [-26, 0, 3], [-26, 3, 4]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces: unos pocos pozos de luz en la oscuridad (la linterna hace el resto) ---- */
  lights.push({ x: -53, y: 7, z: 28, c: 0xffa860, i: .6, d: 24 }, { x: 53.6, y: 7, z: 6, c: 0xffa860, i: .6, d: 24 }, { x: 2, y: 7, z: 49.6, c: 0xffa860, i: .6, d: 24 }, { x: 28, y: 12, z: -34.6, c: 0xffa860, i: .6, d: 24 },
    { x: -16.5, y: 6.3, z: -23.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: -24.5, y: 6.3, z: 18.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: 45.5, y: 6.3, z: 10.5, c: 0x6aa0ff, i: .4, d: 14 },
    { x: -46, y: 3, z: 34, c: 0xffc840, i: .9, d: 13 }, { x: 51, y: 8, z: -33.8, c: 0x4aa0ff, i: .9, d: 13 },
    { x: -24, y: 3, z: 46, c: 0x4a8a6a, i: .35, d: 14 }, { x: 36, y: 6, z: 48, c: 0xffa860, i: .5, d: 18 }, { x: -39, y: -1, z: -21, c: 0x4a8a6a, i: .35, d: 14 }, { x: -43, y: 0, z: 4, c: 0x8a4a8a, i: .35, d: 12 });
  {   // juntas: los bloques sólidos del mismo material que se tocan se solapan 6 mm (sin grietas de un píxel entre ellos)
    const S = B.filter(b => !b.nc && !b.mover && !b.ramp && b.mat !== 'clip'), g = S.map(() => [[0, 0], [0, 0], [0, 0]]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j]; if (a.mat !== b.mat) continue;
      for (let ax = 0; ax < 3; ax++) {
        const u = (ax + 1) % 3, v = (ax + 2) % 3;
        if (Math.min(a.max[u], b.max[u]) - Math.max(a.min[u], b.min[u]) < .01 || Math.min(a.max[v], b.max[v]) - Math.max(a.min[v], b.min[v]) < .01) continue;
        if (Math.abs(a.max[ax] - b.min[ax]) < 1e-6) { g[i][ax][1] = 1; g[j][ax][0] = 1; } else if (Math.abs(b.max[ax] - a.min[ax]) < 1e-6) { g[j][ax][1] = 1; g[i][ax][0] = 1; }
      }
    }
    S.forEach((b, i) => { for (let ax = 0; ax < 3; ax++) { if (g[i][ax][0]) b.min[ax] -= .006; if (g[i][ax][1]) b.max[ax] += .006; } });
  }
  for (const b of B) if (b.nc && b.mat !== 'clip') for (let k = 0; k < 3; k++) { b.min[k] -= .012; b.max[k] += .012; }   // evita caras coplanares (z-fighting)
  return finish({ id: 'skatenight', name: 'Skatenight', bounds: { x0: -56, x1: 56, z0: -40, z1: 54 }, deco, modos: ['arena', 'gungame'],
    theme: { sky: 'night', tex: 'ut', noche: true, skyDim: .3, fog: 0x0b1424, fogD: .042, amb: 0x1a2440, ambI: .09, hemi: [0x20345c, 0x04060a, .08], sun: true, sunC: 0x5a78c0, sunI: .14, sunPos: [34, 60, -46], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.skatenight = buildSkatenight;
