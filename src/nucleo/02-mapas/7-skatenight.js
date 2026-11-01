/* ---------- Skatenight — el skatepark de la Costanera de Posadas, de noche ----------
   Norte = -z (el río y la tribuna), sur = +z (la calle). Mapa de noche: en el cliente (theme.noche) cada arma lleva linterna
   y los rivales casi no se ven hasta que los alumbrás o te alumbran.
   · Plaza de concreto a nivel 0 con un pozo en L al oeste (-3 m), un pozo en L grande al sureste (-3,2 m), pirámides/hips, un spine, una caja
     de «bank to ledge», bancos con terraza contra las vallas y una escalera con terraza.
   · Tribuna de 10 gradas al norte (sube hasta 5 m, con pasillo y baranda sobre el río).
   · Tres torres de andamio (oeste-norte, sur-oeste y este) con piso a 2,5 y a 5 m, unidas por pasarelas a 5 m con la tribuna.
   · Cuatro saltadores y dos portales (uno en el rincón sur-oeste y otro arriba de la tribuna: lejísimos entre sí).
   · Casi todos los reflectores están apagados: solo algunos pozos de luz, la linterna y la luna. */
function buildSkatenight() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  // baranda: la colisión es un bloque de 1 m (se salta, no se atraviesa) y lo que se ve son dos rieles, postes cada ~2 m y una malla de alambre vieja
  const bar = (x0, z0, x1, z1, y) => {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1) + (x0 === x1 ? .1 : 0), az = Math.min(z0, z1), bz = Math.max(z0, z1) + (z0 === z1 ? .1 : 0);
    add(ax, y, az, bx, y + 1, bz, 'clip');
    const alongX = (bx - ax) >= (bz - az), a0 = alongX ? ax : az, a1 = alongX ? bx : bz, c = alongX ? (az + bz) / 2 : (ax + bx) / 2, n = Math.max(1, Math.round((a1 - a0) / 2));
    const seg = (a, b, y0, y1, t, m) => alongX ? add(a, y0, c - t, b, y1, c + t, m, { nc: 1 }) : add(c - t, y0, a, c + t, y1, b, m, { nc: 1 });
    seg(a0, a1, y + .93, y + 1.01, .035, 'metal'); seg(a0, a1, y + .46, y + .5, .03, 'metal'); seg(a0, a1, y + .04, y + .92, .01, 'fence');
    for (let i = 0; i <= n; i++) { const q = a0 + (a1 - a0) * i / n; seg(Math.max(a0, q - .04), Math.min(a1, q + .04), y, y + 1.02, .045, 'metal'); }
  };
  // pilar de hierro con base de hormigón y capitel (centro x, z; y1 = altura de arriba)
  const pilar = (x, z, y1) => { add(x - .27, 0, z - .27, x + .27, .22, z + .27, 'concrete'); add(x - .12, .22, z - .12, x + .12, y1 - .12, z + .12, 'metal'); add(x - .24, y1 - .12, z - .24, x + .24, y1, z + .24, 'metal'); };
  // muro de cobertura de 3 m con remate liso arriba y zócalo abajo
  const muro = (x0, z0, x1, z1) => { add(x0, 0, z0, x1, 3, z1, 'concrete'); add(x0 - .09, 3, z0 - .09, x1 + .09, 3.14, z1 + .09, 'smooth'); add(x0 - .06, 0, z0 - .06, x1 + .06, .22, z1 + .06, 'concrete', { nc: 1 }); };
  // borde metálico (coping) de la boca de un pozo: solo se ve
  const lipX = (x0, x1, z) => add(x0 - .07, 0, z - .08, x1 + .07, .08, z + .08, 'metal', { nc: 1 });
  const lipZ = (z0, z1, x) => add(x - .08, 0, z0 - .07, x + .08, .08, z1 + .07, 'metal', { nc: 1 });
  const graf = (x, y, z, w, h, txt, fg, bg, ry) => deco.push({ t: 'cartel', x, y, z, w, h, txt, fg, bg: bg || '#1d1d22', ry: ry || 0 });
  // reflector de estadio (4 cabezales): base de hormigón con bulones, tramo grueso y fino, travesaño, viseras; apagado casi siempre; y0 = piso donde apoya
  const poste = (x, z, on, y0) => {
    y0 = y0 || 0;
    add(x - .32, y0, z - .32, x + .32, y0 + .3, z + .32, 'concrete'); add(x - .15, y0 + .3, z - .15, x + .15, y0 + 3.5, z + .15, 'metal'); add(x - .1, y0 + 3.5, z - .1, x + .1, y0 + 6.8, z + .1, 'metal');
    for (const [qx, qz] of [[.22, .22], [-.22, .22], [.22, -.22], [-.22, -.22]]) add(x + qx - .03, y0 + .3, z + qz - .03, x + qx + .03, y0 + .5, z + qz + .03, 'metal', { nc: 1 });
    add(x - 1.05, y0 + 6.8, z - .12, x + 1.05, y0 + 6.97, z + .12, 'metal', { nc: 1 });
    for (const dx of [-.7, -.23, .23, .7]) {
      add(x + dx - .18, y0 + 6.97, z - .24, x + dx + .18, y0 + 7.42, z + .24, 'black', { nc: 1 }); add(x + dx - .2, y0 + 7.1, z + .22, x + dx + .2, y0 + 7.42, z + .27, 'metal', { nc: 1 });
      if (on) add(x + dx - .14, y0 + 6.92, z - .17, x + dx + .14, y0 + 6.97, z + .17, 'light', { nc: 1 });
    }
    if (on) deco.push({ t: 'glow', x, y: y0 + 6.7, z, c: 0xffc070 });
  };
  // graffitis (deco 'graf'): cada pieza es un cuadro del atlas de aerosol (64 diseños, ver 03-decoracion.js) apoyado sobre una superficie.
  // cover() cubre un rectángulo de una pared, rampa o piso con piezas superpuestas; el azar es fijo, así que el mapa sale siempre igual
  let gs = 7; const rnd = () => { gs = (gs * 1664525 + 1013904223) >>> 0; return gs / 4294967296; };
  const piece = (cx, cy, cz, rx, ry, u, v, w, h, k) => {
    const cr = Math.cos(ry), sr = Math.sin(ry), sx = Math.sin(rx), cxr = Math.cos(rx);
    deco.push({ t: 'graf', x: cx + u * cr + v * sx * sr, y: cy + v * cxr, z: cz - u * sr + v * sx * cr, w, h, k, rx, ry, fl: k >= 28 && rnd() < .5 });
  };
  // (cx, cy, cz) = centro de la superficie · ry = hacia dónde mira · alpha = inclinación (0 piso, PI/2 pared) · W ancho · H alto (largo de la pendiente)
  // GD: cuánto del mapa está pintado (menos graffitis = más abandono); los decals de abandono (dpiece) van en las mismas superficies
  const GD = .3;
  const dpiece = (cx, cy, cz, rx, ry, u, v, w, k) => {
    const cr = Math.cos(ry), sr = Math.sin(ry), sx = Math.sin(rx), cxr = Math.cos(rx);
    deco.push({ t: 'decal', x: cx + u * cr + v * sx * sr, y: cy + v * cxr, z: cz - u * sr + v * sx * cr, w, h: w, k, rx, ry, rz: 0 });
  };
  const cover = (cx, cy, cz, ry, alpha, W, H, dens) => {
    const rx = alpha - Math.PI / 2, nx = Math.sin(ry) * Math.sin(alpha), ny = Math.cos(alpha), nz = Math.cos(ry) * Math.sin(alpha);
    if (alpha > .05) for (let n = Math.round(W * H / 16), i = 0; i < n; i++) {   // grietas, manchas, óxido, musgo y sangre sobre pared o rampa
      const k = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 26, 27, 28, 29][Math.floor(rnd() * 22)];
      const sz = Math.min(1.8 + rnd() * 2.6, W * .9, H * .95);   // nunca más grande que la superficie ni fuera de ella
      dpiece(cx + nx * .035, cy + ny * .035, cz + nz * .035, rx, ry, (rnd() - .5) * (W - sz), (rnd() - .5) * (H - sz), sz, k);
    }
    cx += nx * .05; cy += ny * .05; cz += nz * .05;
    const cols = Math.max(1, Math.round(W / 4.8)), rows = Math.max(1, Math.round(H / 2.7));
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      if (rnd() > (dens || 1) * GD) continue;
      const w = Math.min(4.4 + rnd() * 2, W), h = Math.min(w * .52, H * 1.06), clp = (v, m) => m <= 0 ? 0 : Math.max(-m / 2, Math.min(m / 2, v));   // la pieza queda dentro de la superficie
      piece(cx, cy, cz, rx, ry, clp((a + .5 + (rnd() - .5) * .5) * W / cols - W / 2, W - w), clp((b + .5 + (rnd() - .5) * .4) * H / rows - H / 2, H - h), w, h, Math.floor(rnd() * 64));
    }
  };
  // las dos caras de un muro fino (ry: hacia dónde mira cada cara)
  const wallArt = (x0, z0, x1, z1, h) => {
    if (x1 - x0 >= z1 - z0) { const cx = (x0 + x1) / 2, W = x1 - x0; cover(cx, h / 2, z0, Math.PI, Math.PI / 2, W, h, .95); cover(cx, h / 2, z1, 0, Math.PI / 2, W, h, .95); }
    else { const cz = (z0 + z1) / 2, W = z1 - z0; cover(x0, h / 2, cz, -Math.PI / 2, Math.PI / 2, W, h, .95); cover(x1, h / 2, cz, Math.PI / 2, Math.PI / 2, W, h, .95); }
  };
  // palmera con tronco sólido (el tronco es invisible, la copa la dibuja la decoración)
  const palma = (x, z, h) => { deco.push({ t: 'palm', x, y: 0, z, h }); add(x - .25, 0, z - .25, x + .25, 4, z + .25, 'clip'); };
  // coronamiento (borde liso) de la boca de un bowl
  const coping = (x0, z0, x1, z1) => { add(x0, 0, z0, x1, .09, z0 + .22, 'smooth', { nc: 1 }); add(x0, 0, z1 - .22, x1, .09, z1, 'smooth', { nc: 1 }); add(x0, 0, z0, x0 + .22, .09, z1, 'smooth', { nc: 1 }); add(x1 - .22, 0, z0, x1, .09, z1, 'smooth', { nc: 1 }); };
  // pirámide (hip): tope liso a altura h y cuatro rampas de w metros
  const hip = (cx, cz, hx, hz, h, w) => {
    add(cx - hx, 0, cz - hz, cx + hx, h, cz + hz, 'smooth');
    ramp(cx - hx, cz - hz - w, cx + hx, cz - hz, 0, 0, h, 'z', 1, 'concrete'); ramp(cx - hx, cz + hz, cx + hx, cz + hz + w, 0, 0, h, 'z', -1, 'concrete');
    ramp(cx - hx - w, cz - hz, cx - hx, cz + hz, 0, 0, h, 'x', 1, 'concrete'); ramp(cx + hx, cz - hz, cx + hx + w, cz + hz, 0, 0, h, 'x', -1, 'concrete');
    add(cx - hx, h, cz - hz, cx + hx, h + .07, cz - hz + .1, 'metal', { nc: 1 }); add(cx - hx, h, cz + hz - .1, cx + hx, h + .07, cz + hz, 'metal', { nc: 1 });   // coping de los bordes del tope
    add(cx - hx, h, cz - hz, cx - hx + .1, h + .07, cz + hz, 'metal', { nc: 1 }); add(cx + hx - .1, h, cz - hz, cx + hx, h + .07, cz + hz, 'metal', { nc: 1 });
  };
  // torre de andamio de 6x6: piso a 2,5 (escalera desde el sur) y piso a 5 en la mitad este (escalera interna); rail=sin baranda en esa cara del piso alto
  const torre = (x0, z0, abierto) => {
    add(x0, 2.2, z0, x0 + 6, 2.5, z0 + 6, 'grate'); add(x0 + 3, 4.7, z0, x0 + 6, 5, z0 + 6, 'grate');
    for (const [px, pz] of [[x0, z0], [x0 + 5.8, z0], [x0, z0 + 5.8], [x0 + 5.8, z0 + 5.8]]) pilar(px + .1, pz + .1, px > x0 ? 4.7 : 2.2);
    // marcos de vigas bajo cada piso (sólidos, por encima de la cabeza) y nervios que se ven desde abajo
    for (const [ax, az, bx, bz, y1, y2] of [[x0, z0, x0 + 6, z0 + .16, 1.95, 2.2], [x0, z0 + 5.84, x0 + 6, z0 + 6, 1.95, 2.2], [x0, z0, x0 + .16, z0 + 6, 1.95, 2.2], [x0 + 5.84, z0, x0 + 6, z0 + 6, 1.95, 2.2],
      [x0 + 3, z0, x0 + 6, z0 + .16, 4.45, 4.7], [x0 + 3, z0 + 5.84, x0 + 6, z0 + 6, 4.45, 4.7], [x0 + 3, z0, x0 + 3.16, z0 + 6, 4.45, 4.7], [x0 + 5.84, z0, x0 + 6, z0 + 6, 4.45, 4.7]]) add(ax, y1, az, bx, y2, bz, 'metal');
    for (const i of [2, 4]) add(x0 + i, 2.05, z0, x0 + i + .1, 2.2, z0 + 6, 'metal', { nc: 1 });
    add(x0 + 4.5, 4.55, z0, x0 + 4.6, 4.7, z0 + 6, 'metal', { nc: 1 });
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
  slab(-26, -32, 55.8, -10); slab(-34, -10, 55.8, -4); slab(-55.8, -10, -52, -4); slab(-34, -4, 55.8, 12); slab(-55.8, 12, 55.8, 22);
  slab(-55.8, 22, 20, 52); slab(46, 22, 55.8, 52); slab(20, 38, 28, 52); slab(28, 50, 46, 52);   // al sureste queda el hueco del pozo en L grande
  slab(-55.8, -36, 55.8, -32); slab(-55.8, -32, -52, -10); slab(-55.8, -4, -52, 12);
  // pozo en L del oeste (como el del render): el bowl grande, un canal y el bowl chico forman un solo pozo con piso a -3
  add(-52, -3.5, -32, -26, -3, -10, 'concrete'); add(-52, -3.5, -10, -34, -3, 12, 'concrete');
  ramp(-52, -32, -47.5, 12, -3, -3, 0, 'x', -1, 'concrete'); ramp(-31, -32, -26, -10, -3, -3, 0, 'x', 1, 'concrete');
  ramp(-52, -32, -26, -27, -3, -3, 0, 'z', -1, 'concrete'); ramp(-34, -15, -26, -10, -3, -3, 0, 'z', 1, 'concrete');
  ramp(-38.5, -10, -34, 12, -3, -3, 0, 'x', 1, 'concrete'); ramp(-52, 8, -34, 12, -3, -3, 0, 'z', 1, 'concrete');
  // pozo en L grande del sureste (3,2 m de profundidad): un bloque adentro para saltar y una vuelta al fondo
  add(20, -3.5, 22, 46, -3.2, 38, 'concrete'); add(28, -3.5, 38, 46, -3.2, 50, 'concrete'); add(29, -3.2, 28, 35, -1.6, 32, 'smooth');
  ramp(20, 22, 25, 38, -3.2, -3.2, 0, 'x', -1, 'concrete'); ramp(20, 22, 46, 27, -3.2, -3.2, 0, 'z', -1, 'concrete'); ramp(41, 22, 46, 50, -3.2, -3.2, 0, 'x', 1, 'concrete');
  ramp(20, 33, 28, 38, -3.2, -3.2, 0, 'z', 1, 'concrete'); ramp(28, 38, 33, 50, -3.2, -3.2, 0, 'x', -1, 'concrete'); ramp(28, 45, 46, 50, -3.2, -3.2, 0, 'z', 1, 'concrete');

  lipX(-52, -26, -32); lipZ(-32, -10, -26); lipX(-34, -26, -10); lipZ(-10, 12, -34); lipX(-52, -34, 12); lipZ(-32, 12, -52);
  lipX(20, 46, 22); lipZ(22, 50, 46); lipX(28, 46, 50); lipZ(38, 50, 28); lipX(20, 28, 38); lipZ(22, 38, 20);
  /* ---- límites: valla al oeste y al este, mural al sur y al norte-oeste, río al norte; todo cerrado por arriba y por los costados ---- */
  // vallas de alambre con tramos rotos (huecos): detrás hay muro invisible, así que nadie sale, pero se ve la calle y el río por los agujeros
  const fenceZ = (xa, xb, z0, z1, gaps) => { let a = z0; for (const [g0, g1] of [...gaps, [z1, z1]]) { if (g0 > a) add(xa, 0, a, xb, 4.2, g0, 'fence'); a = Math.max(a, g1); } };
  const fenceX = (za, zb, x0, x1, gaps) => { let a = x0; for (const [g0, g1] of [...gaps, [x1, x1]]) { if (g0 > a) add(a, 0, za, g0, 4.2, zb, 'fence'); a = Math.max(a, g1); } };
  fenceZ(-56, -55.8, -36, 52, [[4, 9], [36, 41]]); fenceZ(55.8, 56, -32, 52, [[10, 14], [30, 35]]);
  add(-56.2, 0, -36, -55.6, .25, 52, 'concrete', { nc: 1 }); add(55.6, 0, -32, 56.2, .25, 52, 'concrete', { nc: 1 }); add(-56.1, 1.9, -36, -55.8, 1.98, 52, 'metal', { nc: 1 }); add(55.8, 1.9, -32, 56.1, 1.98, 52, 'metal', { nc: 1 });
  for (let z = -36; z <= 52; z += 6) { add(-56.1, 0, z, -55.8, 4.4, z + .3, 'metal'); if (z >= -32) add(55.8, 0, z, 56.1, 4.4, z + .3, 'metal'); }
  add(-56.1, 4.2, -36, -55.8, 4.4, 52, 'metal'); add(55.8, 4.2, -32, 56.1, 4.4, 52, 'metal');
  fenceX(51.7, 51.9, -55.8, 55.8, [[-30, -24], [16, 22]]); add(-55.8, 4.2, 51.6, 55.8, 4.4, 52, 'metal'); fenceX(-36.2, -36, -55.8, -2, [[-40, -35]]); add(-55.8, 4.2, -36.3, -2, 4.4, -35.9, 'metal');
  add(-55.8, 0, 51.5, 55.8, .25, 52.1, 'concrete', { nc: 1 }); add(-55.8, 1.9, 51.6, 55.8, 1.98, 52, 'metal', { nc: 1 }); add(-55.8, 0, -36.4, -2, .25, -35.8, 'concrete', { nc: 1 }); add(-55.8, 1.9, -36.3, -2, 1.98, -35.9, 'metal', { nc: 1 });   // vallas de alambre: al norte se ve el río, al sur la calle
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
  for (const x of [6, 22, 30, 46]) { add(x, .25, -29.3, x + .6, 1.75, -28.7, 'concrete'); add(x - .1, 0, -29.4, x + .7, .25, -28.6, 'concrete'); add(x - .1, 1.75, -29.4, x + .7, 2, -28.6, 'concrete'); }
  for (let x = 0; x <= 54; x += 6) add(x, 1.82, -32, x + .35, 2, -24.8, 'concrete', { nc: 1 });   // nervios del techo de la galería
  // muro bajo (1,1 m, se salta) al pie de la tribuna, con los dos pasos a la galería: es el lienzo de graffitis largo que se ve en el render
  for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) add(a, 0, -19.8, b, 1.1, -19.4, 'concrete');
  add(-2, 0, -36, 54, 5, -32, 'concrete');
  bar(-2, -36, 54, -36, 5);
  add(54, 0, -36, 55.8, 5, -20, 'concrete');                                       // cabecera este de la tribuna
  /* ---- andamios, pasarelas y plataforma sur ---- */
  torre(-22, -24, 'e'); torre(-30, 18, ''); torre(40, 10, 'n');
  // pasarela 1: de la torre norte-oeste a la tribuna, a 5 m (L: 12 m al este y 16 m al norte)
  add(-16, 4.7, -22, -4, 5, -20, 'grate'); add(-4, 4.7, -36, -2, 5, -20, 'grate');
  bar(-16, -22, -4, -22, 5); bar(-16, -20, -4, -20, 5); bar(-4, -36, -4, -30, 5); bar(-4, -26.6, -4, -22, 5); bar(-2.1, -32, -2.1, -20, 5); bar(-4, -36, -2, -36, 5);
  for (const [x, z] of [[-10.1, -22], [-10.1, -20.2], [-3.1, -26], [-3.1, -22.4]]) pilar(x + .1, z + .1, 4.7);
  add(-16, 4.35, -22, -4, 4.7, -21.86, 'metal'); add(-16, 4.35, -20.14, -4, 4.7, -20, 'metal'); add(-4, 4.35, -36, -3.86, 4.7, -20, 'metal'); add(-2.14, 4.35, -36, -2, 4.7, -20, 'metal');   // vigas de borde
  for (let x = -14; x < -4; x += 2) add(x, 4.5, -22, x + .08, 4.7, -20, 'metal', { nc: 1 }); for (let z = -34; z < -22; z += 2) add(-4, 4.5, z, -2, 4.7, z + .08, 'metal', { nc: 1 });   // nervios
  // pasarela 2: de la tribuna a la torre este, a 5 m (2 m de ancho sobre la plaza)
  add(44, 4.7, -30.8, 46, 5, 10, 'grate');
  bar(44, -30.8, 44, 10, 5); bar(46, -30.8, 46, 10, 5);
  for (const z of [-14, -4, 6]) { pilar(44, z + .1, 4.7); pilar(46, z + .1, 4.7); }
  add(44, 4.35, -30.8, 44.14, 4.7, 10, 'metal'); add(45.86, 4.35, -30.8, 46, 4.7, 10, 'metal'); for (let z = -28; z < 10; z += 2) add(44, 4.5, z, 46, 4.7, z + .08, 'metal', { nc: 1 });
  /* ---- pirámides, bank con cartel, billboard y terraza contra la valla ---- */
  hip(-12, 2, 3, 2.5, 1.5, 4); hip(14, 2, 4, 3, 2.4, 5);
  ramp(-6, 24, 0, 30, 0, 0, 1, 'x', 1, 'concrete'); add(0, 0, 24, 8, 1, 30, 'smooth'); ramp(8, 24, 14, 30, 0, 0, 1, 'x', -1, 'concrete');   // bank to ledge
  add(0, 1, 24, 8, 1.08, 24.2, 'rail', { nc: 1 });
  ramp(46, 20, 52, 31, 0, 0, 2.6, 'x', 1, 'concrete'); add(52, 0, 20, 55.8, 2.6, 31, 'smooth'); bar(46, 20, 55.8, 20, 2.6); bar(46, 31, 55.8, 31, 2.6);
  // poste de luz con transformador, como el de la foto
  add(-46.3, 0, 29.7, -45.7, 11, 30.3, 'concrete'); add(-48.2, 9.6, 29.85, -43.8, 9.8, 30.15, 'metal', { nc: 1 }); add(-47.4, 7.6, 29.5, -46.6, 8.8, 30.5, 'metal', { nc: 1 }); add(-45.4, 7.6, 29.5, -44.6, 8.8, 30.5, 'metal', { nc: 1 });
  // cajones, muretes y cobertura baja
  for (const [x, z, s] of [[-6, -16, 1.5], [30, -6, 1.2], [-20, 14, 1.2], [4, 20, 1.2], [-42, 20, 1.2], [22, -14, 1.2], [8, -12, 1.2]]) add(x, 0, z, x + s * 1.4, s, z + s, 'crate');
  add(-28, 0, 8, -22, .9, 8.6, 'smooth'); 
  // zona sur nueva (z 38..51): media caña (mini ramp) al oeste, escalera con terraza al medio, muros de cobertura y salida con saltador
  ramp(-34, 42, -29, 50, 0, 0, 1.8, 'x', -1, 'concrete'); add(-38, 0, 42, -34, 1.8, 50, 'smooth'); ramp(-21, 42, -16, 50, 0, 0, 1.8, 'x', 1, 'concrete'); add(-16, 0, 42, -12, 1.8, 50, 'smooth');
  stairs(8, 40, 20, 46, 0, .5, 4, 'x', 1, 'concrete'); add(20, 0, 40, 28, 2, 46, 'smooth'); bar(20, 40, 28, 40, 2); bar(20, 46, 28, 46, 2);
  for (const [x0, z0, x1, z1] of [[-8, 40, -7.6, 48], [0, 38.6, 6, 39], [-45, 42, -44.6, 49], [8, 48, 16, 48.4]]) muro(x0, z0, x1, z1);
  add(-4, 0, 47, -1, 1.2, 48.6, 'crate'); add(-48, 0, 41, -46.4, 1.2, 44, 'crate');
  pads.push({ x: -24, y: 0, z: 46, r: 1.1, t: [-25.5, 5, 21], apex: 3 });          // media caña -> piso alto de la torre sur-oeste
  I('health', -36, 1.8, 46); I('armor', -14, 1.8, 46); I('shells', 25, 2, 43); I('rockets', 0, 0, 44); I('bullets', 50, 0, 44); I('health', 14, 0, 49); I('slugs', -42, 0, 46); I('grenades', 48, 0, 48); I('armor', 6, 0, 42);
  [[-24, 0, 48], [0, 0, 44], [14, 0, 49.8], [50, 0, 44], [25, 2, 43], [-42, 0, 46], [38, -3.2, 29], [38, -3.2, 40], [-54, 1.8, 19], [54, 1.8, -11]].forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  // más estructura (como en el render): spine en el centro, hip este, dos bancos con terraza contra las vallas y una escalera con terraza
  ramp(-4.5, -2, -.5, 6, 0, 0, 1.4, 'x', 1, 'concrete'); add(-.5, 0, -2, .5, 1.4, 6, 'smooth'); ramp(.5, -2, 4.5, 6, 0, 0, 1.4, 'x', -1, 'concrete');
  hip(32, 7, 4, 1.2, 1.8, 4);
  ramp(-52, 14, -46, 24, 0, 0, 1.8, 'x', -1, 'concrete'); add(-55.8, 0, 14, -52, 1.8, 24, 'smooth'); bar(-55.8, 14, -46, 14, 1.8); bar(-55.8, 24, -46, 24, 1.8);
  ramp(46, -16, 52, -6, 0, 0, 1.8, 'x', 1, 'concrete'); add(52, 0, -16, 55.8, 1.8, -6, 'smooth'); bar(46, -16, 55.8, -16, 1.8); bar(46, -6, 55.8, -6, 1.8);
  stairs(26, -18, 34, -12, 0, .5, 3, 'x', 1, 'concrete'); add(34, 0, -18, 40, 1.5, -12, 'smooth'); bar(34, -18, 40, -18, 1.5);
  pads.push({ x: 27, y: -3.2, z: 30, r: 1.1, t: [44.5, 5, 13], apex: 3 });          // pozo grande -> piso alto de la torre este
  // ascensor rápido: sube del piso de la plaza a la pasarela de la tribuna (5 m) cada 10 s; el costado cyan se enciende solo
  mover(-7.6, -.36, -30, -4, .04, -26.6, 'metal', 1, 5, 10, -Math.PI / 2);
  add(-7.95, 0, -30.2, -7.75, 6.4, -30, 'metal'); add(-7.95, 0, -26.6, -7.75, 6.4, -26.4, 'metal'); add(-7.95, 6.2, -30.2, -7.75, 6.4, -26.4, 'metal'); add(-8.05, 0, -30.3, -7.65, .25, -26.3, 'concrete');   // marco del hueco
  deco.push({ t: 'glow', x: -7.85, y: 6.0, z: -28.3, c: 0x6ae0ff });
  // muros de cobertura (3 m): cortan la línea de tiro de la plaza y dejan esquinas para esperar a oscuras
  for (const [x0, z0, x1, z1] of [[-12, -18, -11.6, -10], [22, -9, 30, -8.6], [41, -4, 41.4, 6], [-26, 28, -18, 28.4], [10, 18, 18, 18.4], [-8, 9, -7.6, 16]]) muro(x0, z0, x1, z1);
  // kiosko con techo: dos puertas al norte y al sur, una al este; se sube al techo (3 m) por una escalera de afuera
  wall(-31, -1, -22, -.6, 0, 2.8, [D(-28, -25, 0, 2.2), D(-30.4, -29, 1, 2), D(-24, -22.6, 1, 2)], 'brick'); wall(-31, 5.6, -22, 6, 0, 2.8, [D(-30, -27, 0, 2.2), D(-26, -23.4, 1, 2)], 'brick');
  wall(-31, -.6, -30.6, 5.6, 0, 2.8, [D(1.4, 3.8, 1, 2)], 'brick'); wall(-22.4, -.6, -22, 5.6, 0, 2.8, [D(1, 3.4, 0, 2.2)], 'brick');
  add(-31.4, 2.55, -1.4, -21.6, 2.7, 6.4, 'concrete');                                                     // cornisa
  for (const [x0, z0, x1, z1] of [[-30.5, -1.05, -29, -.55], [-24.1, -1.05, -22.5, -.55], [-26.1, 5.55, -23.3, 6.05]]) add(x0 - .08, .94, z0, x1 + .08, 1, z1, 'metal', { nc: 1 });   // antepechos
  add(-26.6, 0, 4.7, -22.6, 1.05, 5.4, 'wood'); add(-26.7, 1.05, 4.65, -22.5, 1.12, 5.45, 'metal');       // mostrador
  add(-30.6, .3, .6, -30.1, .36, 5.2, 'wood'); add(-30.6, .9, .6, -30.1, .96, 5.2, 'wood');               // estantes
  add(-31.2, 2.7, -1.2, -21.8, 3, 6.2, 'roof'); stairs(-31, -6, -29, -1, 0, .5, 6, 'z', 1, 'concrete');
  bar(-29, -1.2, -21.8, -1.2, 3); bar(-31.2, -1.2, -31.2, 6.2, 3); bar(-31.2, 6.2, -21.8, 6.2, 3); bar(-21.8, -1.2, -21.8, 6.2, 3);
  deco.push({ t: 'cartel', x: -26.5, y: 2.5, z: -1.03, w: 3.2, h: .5, txt: 'KIOSCO 24 HS', bg: '#2a1c14', fg: '#a8844a', ry: Math.PI });
  /* ---- graffitis: todo el mapa está pintado, como en el render (paredes de los pozos, rampas, muros, tribuna y algo de piso) ---- */
  const P = Math.PI, al = (d, w) => Math.atan2(d, w);
  // pozo en L del oeste (3 m): pared oeste (44 m de largo), norte, este del bowl grande, sur, este del canal y sur del bowl chico
  cover(-49.75, -1.5, -10, P / 2, al(3, 4.5), 44, 5.4, 1); cover(-39, -1.5, -29.5, 0, al(3, 5), 26, 5.8, 1); cover(-28.5, -1.5, -21, -P / 2, al(3, 5), 22, 5.8, 1);
  cover(-30, -1.5, -12.5, P, al(3, 5), 8, 5.8, 1); cover(-36.25, -1.5, 1, -P / 2, al(3, 4.5), 22, 5.4, 1); cover(-43, -1.5, 10, P, al(3, 4), 18, 5, 1);
  // pozo en L grande del sureste (3,2 m)
  cover(22.5, -1.6, 30, P / 2, al(3.2, 5), 16, 5.9, 1); cover(33, -1.6, 24.5, 0, al(3.2, 5), 26, 5.9, 1); cover(43.5, -1.6, 36, -P / 2, al(3.2, 5), 28, 5.9, 1);
  cover(24, -1.6, 35.5, P, al(3.2, 5), 8, 5.9, 1); cover(30.5, -1.6, 44, P / 2, al(3.2, 5), 12, 5.9, 1); cover(37, -1.6, 47.5, P, al(3.2, 5), 18, 5.9, 1);
  // pirámides, spine, hip, bancos, bank to ledge y media caña (las cuatro rampas de cada una)
  cover(-12, .75, -2.5, P, al(1.5, 4), 6, 4.3, 1); cover(-12, .75, 6.5, 0, al(1.5, 4), 6, 4.3, 1); cover(-17, .75, 2, -P / 2, al(1.5, 4), 5, 4.3, 1); cover(-7, .75, 2, P / 2, al(1.5, 4), 5, 4.3, 1);
  cover(14, 1.2, -3.5, P, al(2.4, 5), 8, 5.5, 1); cover(14, 1.2, 7.5, 0, al(2.4, 5), 8, 5.5, 1); cover(7.5, 1.2, 2, -P / 2, al(2.4, 5), 6, 5.5, 1); cover(20.5, 1.2, 2, P / 2, al(2.4, 5), 6, 5.5, 1);
  cover(32, .9, 3.8, P, al(1.8, 4), 8, 4.4, 1); cover(32, .9, 10.2, 0, al(1.8, 4), 8, 4.4, 1); cover(-2.5, .7, 2, -P / 2, al(1.4, 4), 8, 4.2, 1); cover(2.5, .7, 2, P / 2, al(1.4, 4), 8, 4.2, 1);
  cover(-49, .9, 19, P / 2, al(1.8, 6), 10, 6.3, 1); cover(49, .9, -11, -P / 2, al(1.8, 6), 10, 6.3, 1); cover(49, 1.3, 25.5, -P / 2, al(2.6, 6), 11, 6.5, 1);
  cover(-3, .5, 27, -P / 2, al(1, 6), 6, 6.1, 1); cover(11, .5, 27, P / 2, al(1, 6), 6, 6.1, 1); cover(-31.5, .9, 46, P / 2, al(1.8, 5), 8, 5.3, 1); cover(-18.5, .9, 46, -P / 2, al(1.8, 5), 8, 5.3, 1);
  // muros de cobertura (las dos caras) y el muro bajo al pie de la tribuna
  for (const [x0, z0, x1, z1] of [[-12, -18, -11.6, -10], [22, -9, 30, -8.6], [41, -4, 41.4, 6], [-26, 28, -18, 28.4], [10, 18, 18, 18.4], [-8, 9, -7.6, 16], [0, 38.6, 6, 39], [-8, 40, -7.6, 48], [-45, 42, -44.6, 49], [8, 48, 16, 48.4]]) wallArt(x0, z0, x1, z1, 3);
  for (const [a, b] of [[-2, 14], [17, 36], [39, 54]]) cover((a + b) / 2, .55, -19.37, 0, P / 2, b - a, 1.1, 1);
  // piso: manchones y firmas sueltas (pocas, como en el render)
  for (const [x, z] of [[-14, -26], [8, -5], [18, 16], [-30, 38], [0, 34], [36, -8], [52, 10], [-24, 16], [-10, 20], [50, 40], [12, 36], [-40, 24], [26, 20], [-4, -20]]) cover(x, 0, z, rnd() * 6.28, 0, 5, 3.4, 1);
  // basura y escombros afuera de las vallas (solo se ven): palets y rocas
  for (const [x, z] of [[-60, -20], [-61, 6], [-59, 30], [-26, 56], [14, 57], [44, 56], [60, 20], [61, -4]]) { add(x, 0, z, x + 1.4, .14, z + 1.1, 'wood', { nc: 1 }); add(x + .1, .14, z + .1, x + 1.3, .28, z + 1, 'wood', { nc: 1 }); add(x + 1.9, 0, z + .4, x + 2.6, .5, z + 1.1, 'rock', { nc: 1 }); }
  // orilla del río al norte: banco de pasto con juncos
  add(-58, -1, -44, -2, .3, -37.2, 'grass', { nc: 1 }); for (let x = -56; x <= -4; x += 5) deco.push({ t: 'bush', x, y: .3, z: -39.5 + (x % 3), r: .8 });
  // reflectores: casi todos apagados
  for (const [x, z, on] of [[-54.2, -26, 0], [-54.2, -6, 0], [-54.2, 28, 1], [-54.2, 46, 0], [-40, 50.6, 0], [-20, 50.6, 0], [2, 50.6, 1], [24, 50.6, 0], [46, 50.6, 0], [54.6, -19, 0], [54.6, 6, 1], [54.6, 34, 0], [54.6, 46, 0], [0, -8, 0], [36, 18, 0], [-20, 34, 0], [30, -18, 0]]) poste(x, z, on);
  for (const [x, on] of [[8, 0], [28, 1], [48, 0]]) poste(x, -35.5, on, 5);   // sobre el pasillo de la tribuna

  /* ---- portales: uno en el rincón sur-oeste y otro arriba de la tribuna ---- */
  teles.push({ x: -46, y: 0, z: 34, r: 1, to: [46.5, 5, -33.7], yaw: face(46.5, -33.7, 0, 0), color: 'yellow' });
  teles.push({ x: 51, y: 5, z: -33.8, r: 1, to: [-42, 0, 31], yaw: face(-42, 31, 0, 0), color: 'blue' });
  deco.push({ t: 'portal', x: -46, y: 0, z: 34, r: 1, color: 'yellow' }, { t: 'portal', x: 51, y: 5, z: -33.8, r: 1, color: 'blue' });
  /* ---- saltadores ---- */
  pads.push({ x: -36, y: -3, z: -21, r: 1.1, t: [-17.2, 5, -21], apex: 3 });       // bowl grande -> piso alto de la torre norte-oeste
  pads.push({ x: -45, y: -3, z: 6.5, r: 1.1, t: [-25.5, 5, 21], apex: 3 });        // bowl chico -> piso alto de la torre sur-oeste
  pads.push({ x: 0, y: 0, z: -12, r: 1.1, t: [10, 5, -34], apex: 2.5 });           // plaza -> pasillo de la tribuna
  pads.push({ x: 32, y: 0, z: 19, r: 1.1, t: [44.5, 5, 13], apex: 2.5 });          // plaza este -> piso alto de la torre este

  /* ---- ítems (todo lo que ya existe) ---- */
  // armaduras amarillas: pasillo de la tribuna, bowl chico y debajo del cartel
  I('armorH', 1, 5, -34); I('armorH', -41, -3, 2); I('armorH', 0, 0, 14);
  I('quad', 45, 5, -8); I('mega', -25.5, 5, 21);
  // armas
  I('w1', -12, 1.5, 2); I('w2', 0, 0, 12.5); I('w3', -39, -3, -24); I('w4', 37, -3.2, 42); I('w5', 41.5, 2.5, 14.5); I('w6', 24, 4.5, -30.2); I('w8', 45, 5, -27); I('w9', -17.5, 5, -22);
  // munición
  I('shells', 14, 2.4, 2); I('shells', -30, 0, -34); I('bullets', 52, 2.6, 25); I('bullets', -24, 0, -7); I('rockets', 22, 0, 20); I('rockets', 41, 5, -34); I('grenades', -50, 0, 30); I('grenades', 4, 0, -8);
  I('slugs', 14, 5, -34); I('slugs', -47, -3, 2); I('caza', 38, -3.2, 30); I('caza', -21, 2.5, -20);
  // chalecos y botiquines
  I('armor', -14, 1.5, 2); I('armor', 32, 0, -10); I('armor', -34, -3, -17); I('armor', 24, 5, -34); I('armor', 35, 0, 16); I('armor', -6, 0, 33);
  I('health', -40, -3, -18); I('health', -43, -3, 4); I('health', 14, 2.4, 0); I('health', 6, 5, -34); I('health', 36, 5, -34); I('health', -18, 2.5, -19.5); I('health', -27, 2.5, 21);
  I('health', 42.5, 2.5, 12.5); I('health', 54, 2.6, 22); I('health', -3, 0, -6); I('health', 32, 1.8, 7); I('health', -8, 0, 24); I('health', 50, 0, 36); I('health', -50, 0, -34); I('health', 8, 0, -17);

  I('armor', -54, 1.8, 19); I('health', 54, 1.8, -11); I('armor', 40, -3.2, 43); I('health', 34, -3.2, 36); I('shells', 30, -3.2, 35);
  // galería bajo la tribuna y kiosko: botín en la oscuridad
  I('armor', 10, 0, -28.2); I('bullets', 44, 0, -28); I('health', 26, 0, -29); I('shells', 34, 0, -27); I('rockets', 2, 0, -27);
  I('armor', -26, 0, 2); I('rockets', -29, 0, 4); I('slugs', -26, 3, 2); I('health', -24, 3, 5);
  /* ---- apariciones: repartidas por todos los niveles ---- */
  [[-12, 0, -34], [-8, 0, -14], [4, 0, -8], [22, 0, -10], [42, 0, -9], [50, 0, -2], [50, 0, 6], [30, 0, -1], [38, 0, 18], [8, 0, 34], [-20, 0, 32], [-36, 0, 22], [-50, 0, 28], [-48, 0, -34], [-20, 0, -33], [-24, 0, -6],
   [-40, -3, -20], [-34, -3, -24], [-43, -3, 3], [6, 5, -34], [20, 5, -34], [34, 5, -34], [26, 3, -26.6], [-17, 5, -21], [-25.5, 5, 21], [44.5, 5, 13], [45, 5, -10], [14, 2.4, 2], [-12, 1.5, 2], [42, 2.5, 13], [-20, 2.5, -21], [20, 0, -28], [44, 0, -28], [8, 0, -27], [-26, 0, 3], [-26, 3, 4]]
    .forEach(([x, y, z]) => spawns.push({ x, y, z, yaw: face(x, z, 0, 0) }));
  /* ---- luces: unos pocos pozos de luz en la oscuridad (la linterna hace el resto) ---- */
  lights.push({ x: -53, y: 7, z: 28, c: 0xffa860, i: .2, d: 20 }, { x: 53.6, y: 7, z: 6, c: 0xffa860, i: .2, d: 20 }, { x: 2, y: 7, z: 49.6, c: 0xffa860, i: .2, d: 20 }, { x: 28, y: 12, z: -34.6, c: 0xffa860, i: .2, d: 20 },
    { x: -16.5, y: 6.3, z: -23.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: -24.5, y: 6.3, z: 18.5, c: 0x6aa0ff, i: .4, d: 14 }, { x: 45.5, y: 6.3, z: 10.5, c: 0x6aa0ff, i: .4, d: 14 },
    { x: -46, y: 3, z: 34, c: 0xffc840, i: .9, d: 13 }, { x: 51, y: 8, z: -33.8, c: 0x4aa0ff, i: .9, d: 13 },
    { x: -24, y: 3, z: 46, c: 0x4a8a6a, i: .35, d: 14 }, { x: 36, y: 6, z: 48, c: 0xffa860, i: .5, d: 18 }, { x: -39, y: -1, z: -21, c: 0x4a8a6a, i: .35, d: 14 }, { x: -43, y: 0, z: 4, c: 0x8a4a8a, i: .35, d: 12 });
  /* ---- niebla baja: muchas nubes chicas de borde difuminado a distintas alturas (no una lámina con bordes), y más densa dentro de los pozos ---- */
  for (let i = 0; i < 16; i++) { const cx = -50 + rnd() * 100, cz = -32 + rnd() * 82, w = 18 + rnd() * 16, dd = 14 + rnd() * 14; deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - dd / 2, z1: cz + dd / 2, y: .25 + rnd() * .75, o: .1 + rnd() * .08, dir: rnd() < .5 ? 1 : -1 }); }
  for (const [x0, x1, z0, z1, y] of [[-56, -22, -36, -6, -2.55], [-56, -30, -12, 16, -2.55], [16, 50, 18, 54, -2.65]]) for (let k = 0; k < 2; k++) deco.push({ t: 'bruma', soft: 1, x0: x0 + k * 2, x1: x1 - k * 2, z0: z0 + k * 2, z1: z1 - k * 2, y: y + k * .45, o: .14, dir: k % 2 ? 1 : -1 });
  /* ---- abandono: grietas, manchas, musgo, sangre seca, basura, charcos y yuyos sobre el piso; escombros sólidos en los rincones ---- */
  // altura del piso plano en (x, z) si en las cinco muestras es el mismo y no es rampa, rejilla, techo ni baranda (si no, null: ahí no se pega nada)
  const NOPISO = ['grate', 'roof', 'rail', 'fence', 'metal'];
  const flatTop = (x, z, r) => {
    let t0 = null;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      let top = -99, tb = null;
      for (const b of B) { if (b.nc || b.mat === 'clip' || !(b.min[0] < x + dx && b.max[0] > x + dx && b.min[2] < z + dz && b.max[2] > z + dz)) continue; if (b.max[1] > top) { top = b.max[1]; tb = b; } }
      if (!tb || tb.ramp || tb.mover || NOPISO.includes(tb.mat)) return null;
      if (t0 == null) t0 = top; else if (Math.abs(top - t0) > .03) return null;
    }
    return t0;
  };
  const scatter = (ks, count, smin, smax) => {
    for (let n = 0, tries = 0; n < count && tries < count * 12; tries++) {
      const x = -54 + rnd() * 108, z = -34 + rnd() * 84, w = smin + rnd() * (smax - smin), t = flatTop(x, z, w * .5);
      if (t == null) continue;
      deco.push({ t: 'decal', x, y: t + .025, z, w, h: w, k: ks[Math.floor(rnd() * ks.length)], rx: -Math.PI / 2, ry: rnd() * 6.28, rz: 0 }); n++;
    }
  };
  scatter([0, 1, 2, 3, 4, 5], 110, 3.5, 7); scatter([6, 7, 8, 9], 26, 2, 4); scatter([14, 15, 16, 17], 20, 1.8, 3.4); scatter([22, 23, 24, 25], 80, 1.5, 2.6);
  scatter([26, 27, 28, 29], 16, 2.2, 4); scatter([30, 31], 12, 2, 3.4);
  // yuyos: matas cruzadas (4 cuadros) que se cuelan por las grietas, pegadas a las vallas y a los bordes; no estorban (son bajitos)
  const tuft = (x, z) => {
    const h = .5 + rnd() * .85, w = h * (1.2 + rnd() * .5), k = 18 + Math.floor(rnd() * 4), ry = rnd() * 3.14, t = flatTop(x, z, w * .55); if (t == null) return;
    for (const a of [0, Math.PI / 2]) for (const f of [0, Math.PI]) deco.push({ t: 'decal', x, y: t + h / 2 - .02, z, w, h, k, rx: 0, ry: ry + a + f, rz: 0 });
  };
  for (let x = -54; x <= 54; x += 3.4) { tuft(x + rnd() * 2, 50.4 - rnd() * .9); tuft(x + rnd() * 2, -35.2 + rnd() * .9); }
  for (let z = -34; z <= 50; z += 3.4) { tuft(-54.4 + rnd() * .8, z + rnd() * 2); tuft(54.6 - rnd() * .8, z + rnd() * 2); }
  for (let n = 0; n < 110; n++) tuft(-54 + rnd() * 108, -34 + rnd() * 84);
  // escombros: pilas de roca rota (sólidas) en los rincones y contra las vallas
  for (const [x, z] of [[-51, -33.4], [-49, 47], [50, 47], [51, -24.4], [-24, -34.2], [12, -34], [16, 50], [-28, 50], [-52, 24.5], [52, 36]]) { add(x, 0, z, x + 1.6, .6, z + 1.1, 'rock'); add(x + .4, .6, z + .2, x + 1.2, 1.1, z + .8, 'rock'); }
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
    theme: { sky: 'night', tex: 'ruina', noche: true, skyDim: .035, fog: 0x020409, fogD: .06, amb: 0x1a2440, ambI: .004, hemi: [0x20345c, 0x01020a, .004], sun: true, sunC: 0x5a78c0, sunI: .01, sunPos: [34, 60, -46], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.skatenight = buildSkatenight;
