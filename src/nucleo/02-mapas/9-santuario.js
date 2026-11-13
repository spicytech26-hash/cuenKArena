/* ---------- El Santuario Dual (Captura el dominio) ----------
   184 × 136 m: el mapa más grande del juego, pero ancho y compacto (se cruza en 18-22 s, no es un pasillo).
   Simétrico respecto de x = 0: azul al oeste, rojo al este. De un extremo al otro:
     fortaleza · barreras y generadores · ruinas · cañón con el río · ruinas · barreras y generadores · fortaleza.
   Tres carriles, cada uno con su portón sellado por una barrera y un generador en cada extremo de la barrera:
     norte  z -44, terraza alta a 6 m, ruinas de catedral y puente alto sobre el cañón
     centro z   0, plaza con el punto de poder y dos puentes de piedra
     sur    z  44, túnel a -7 m por dentro del arco de roca, con canal y rejas

   Está armado con un kit de piezas simples que se repiten (columna, arco, muro roto, escalera, caño, caja,
   barril, farola, reja, escombro, vitral, lápida). TODO lo que se ve choca: no hay adornos fantasma.
   Nada de Math.random acá: el mapa se arma igual en el cliente y en el servidor, así que el azar es con semilla. */
function buildSantuario() {
  const { lava, spawns, lights, add, ramp, wall, stairs, D, face, I, finish } = mapKit();
  const tspawns = [[], []], fspawns = [[], []], gens = [], bars = [], bosses = [], bossPts = [[], []], defPts = [[], []], deco = [];
  const LANES = [{ z: -44, y: 6 }, { z: 0, y: 0 }, { z: 44, y: -7 }];   // norte, centro, sur
  const GW = 18, GH = [6, 6, 4.8];        // ancho del portón y alto de cada barrera
  const XW = 66, XG = 62, XB = 80, XS = 86;   // muro de la fortaleza, generadores, boss, aparición
  const CX = 26, CY = -14;                // medio ancho del cañón y altura del fondo
  let SEED = 20261113;
  const rr = () => ((SEED = (SEED * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const vr = (a, b) => a + (b - a) * rr();

  /* ================= EL KIT =================
     Todo lo que se ve a la altura de un jugador CHOCA: nada de paredes, caños o columnas fantasma.
     Las piezas son simples (bloques grandes y pocos): se leen de lejos y no cuestan FPS. */
  const caja = (x, z, y, w, h, d, m) => add(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, m || 'crate');
  const barril = (x, z, y) => add(x - .45, y, z - .45, x + .45, y + 1.1, z + .45, 'metal');
  // columna: basa, fuste y capitel (la basa mide menos que un escalón: se camina por encima)
  const columna = (x, z, y, h, r, m) => {
    add(x - r * 1.4, y, z - r * 1.4, x + r * 1.4, y + .4, z + r * 1.4, m || 'pillar');
    add(x - r, y + .4, z - r, x + r, y + h - .5, z + r, m || 'pillar');
    add(x - r * 1.4, y + h - .5, z - r * 1.4, x + r * 1.4, y + h, z + r * 1.4, m || 'pillar');
  };
  // arco: dos columnas y un dintel macizo arriba (eje = por dónde se pasa)
  const arco = (x, z, y, luz, h, eje, m) => {
    const q = luz / 2, mat = m || 'brick';
    if (eje === 'z') { columna(x, z - q, y, h, .5, mat); columna(x, z + q, y, h, .5, mat); add(x - .6, y + h, z - q - .7, x + .6, y + h + .8, z + q + .7, mat); }
    else { columna(x - q, z, y, h, .5, mat); columna(x + q, z, y, h, .5, mat); add(x - q - .7, y + h, z - .6, x + q + .7, y + h + .8, z + .6, mat); }
  };
  // muro derruido: altura irregular, con mordiscos arriba
  const muroRoto = (x0, z0, x1, z1, y, h, m) => {
    const ejeX = (x1 - x0) >= (z1 - z0), L = ejeX ? x1 - x0 : z1 - z0, n = Math.max(2, Math.round(L / 3.5));
    for (let i = 0; i < n; i++) {
      const a = (ejeX ? x0 : z0) + L * i / n, b = (ejeX ? x0 : z0) + L * (i + 1) / n, hh = h * vr(.45, 1.05);
      if (ejeX) add(a, y, z0, b, y + hh, z1, m || 'brick'); else add(x0, y, a, x1, y + hh, b, m || 'brick');
    }
  };
  // caño de bronce de un punto a otro, sobre un eje (macizo)
  const cano = (x, z, y, L, eje, r) => {
    r = r || .3;
    if (eje === 'x') add(Math.min(x, x + L), y - r, z - r, Math.max(x, x + L), y + r, z + r, 'metal');
    else if (eje === 'z') add(x - r, y - r, Math.min(z, z + L), x + r, y + r, Math.max(z, z + L), 'metal');
    else add(x - r, y, z - r, x + r, y + L, z + r, 'metal');
  };
  const farola = (x, z, y, col) => { add(x - .18, y, z - .18, x + .18, y + 3.2, z + .18, 'metal'); add(x - .45, y + 3.2, z - .45, x + .45, y + 3.9, z + .45, col); lights.push({ x, y: y + 3.5, z, c: col === 'neonR' ? 0xff7a20 : 0x3a8bff, i: .9, d: 17 }); };
  const reja = (x0, z0, x1, z1, y, h) => add(x0, y, z0, x1, y + h, z1, 'grate');
  const baranda = (x0, z0, x1, z1, y) => add(x0, y, z0, x1, y + .95, z1, 'rail');
  // escombro: dos bloques apilados, sirven de cobertura baja
  const escombro = (x, z, y, r) => { add(x - r, y, z - r, x + r, y + r * vr(.7, 1.2), z + r, 'rock'); add(x - r * .6, y, z - r * .6, x + r * .55, y + r * vr(1, 1.6), z + r * .55, 'rock'); };
  // vitral: paño de vidrio de color con su marco (macizo)
  const vitral = (x, z, y, w, h, eje, col) => {
    if (eje === 'z') { add(x - .15, y, z - w / 2, x + .15, y + h, z + w / 2, col); add(x - .3, y + h, z - w / 2 - .3, x + .3, y + h + .4, z + w / 2 + .3, 'brick'); add(x - .3, y - .4, z - w / 2 - .3, x + .3, y, z + w / 2 + .3, 'brick'); }
    else { add(x - w / 2, y, z - .15, x + w / 2, y + h, z + .15, col); add(x - w / 2 - .3, y + h, z - .3, x + w / 2 + .3, y + h + .4, z + .3, 'brick'); }
  };
  // baldosa sobre el piso: lámina de 2 cm, así no te hundís en ella
  const lamina = (x0, y, z0, x1, z1, m) => add(Math.min(x0, x1), y, z0, Math.max(x0, x1), y + .02, z1, m || 'tiles');
  // lápida: cobertura baja
  const lapida = (x, z, y, eje) => eje === 'x' ? add(x - .7, y, z - .2, x + .7, y + 1.1, z + .2, 'rock') : add(x - .2, y, z - .7, x + .2, y + 1.1, z + .7, 'rock');

  /* ================= EL CAÑÓN Y EL RÍO ================= */
  add(-CX, -18, -68, CX, CY, 68, 'canyon');                       // fondo
  lava.push({ min: [-CX, CY, -68], max: [CX, CY + 1.7, 68], dps: 999, water: 1 });
  for (const s of [-1, 1]) {                                       // paredes del cañón: cornisas de roca
    for (let z = -64; z < 68; z += 16) add(Math.min(s * CX, s * (CX - 2.2)), CY + 1, z, Math.max(s * CX, s * (CX - 2.2)), CY + vr(2.5, 5), z + vr(4, 7), 'rock');
    for (const z of [-56, -24, 10, 50]) { add(s * CX - s * 5, CY, z - 3, s * CX, CY + .6, z + 3, 'rock'); escombro(s * (CX - 3), z, CY + .6, 1.6); }
  }
  // puente alto del norte (carril norte, y = 6) con sus arcos
  add(-CX - 1, 5, -53, CX + 1, 6, -35, 'step');
  for (const x of [-20, -10, 0, 10, 20]) add(x - 1.4, -2, -52, x + 1.4, 5, -36, 'pillar');
  baranda(-CX, -53.2, CX, -52.6, 6); baranda(-CX, 35.6 - 71, CX, 36.2 - 71, 6);
  for (let x = -24; x <= 24; x += 8) { farola(x, -52.2, 6, 'light'); }
  // puentes del centro (y = 0) y plaza con el punto de poder
  for (const zc of [-13, 13]) {
    add(-CX - 1, -1, zc - 4, CX + 1, 0, zc + 4, 'step');
    for (const x of [-18, -6, 6, 18]) add(x - 1.2, -8, zc - 3.6, x + 1.2, -1, zc + 3.6, 'pillar');
    baranda(-CX, zc - 4.3, CX, zc - 3.75, 0); baranda(-CX, zc + 3.75, CX, zc + 4.3, 0);
  }
  // arco de roca del sur: por arriba se cruza a cielo abierto, por dentro sigue el túnel
  add(-CX - 1, -18, 30, CX + 1, -7, 58, 'rock');
  add(-CX - 1, -7, 30, CX + 1, 0, 36, 'rock'); add(-CX - 1, -7, 52, CX + 1, 0, 58, 'rock');
  add(-CX - 1, -2.2, 36, CX + 1, 0, 52, 'rock');
  for (const x of [-18, -6, 6, 18]) { add(x - 1.2, -14, 31, x + 1.2, -7, 34, 'pillar'); add(x - 1.2, -14, 54, x + 1.2, -7, 57, 'pillar'); }
  for (let x = -22; x <= 22; x += 11) { lamina(x - 2.5, -7, 36, x + 2.5, 52); lights.push({ x, y: -3, z: 44, c: 0xffb060, i: .8, d: 15 }); }
  // arriba del arco de roca: ruinas de un puente caído, para no cruzar a campo pelado
  for (const s of [-1, 1]) {
    columna(s * 13, 35, 0, vr(3, 5), .7, 'pillar'); columna(s * 13, 53, 0, vr(3, 5), .7, 'pillar');
    escombro(s * 6, 40, 0, 1.4); escombro(s * 6, 48, 0, 1.2);
    muroRoto(s * 18 - 1, 41, s * 18 + 1, 47, 0, 3);
  }
  add(-2.5, 0, 42, 2.5, 1.3, 46, 'rock');
  add(-15, -18, -9, 15, 0, 9, 'rock');                             // la isla de la plaza
  add(-11, 0, -7, 11, .5, 7, 'tiles'); add(-5.5, .5, -5.5, 5.5, 1, 5.5, 'tiles');
  add(-2.2, 1, -2.2, 2.2, 2.2, 2.2, 'pillar'); I('quad', 0, 2.2, 0);
  for (const [a, b] of [[-9, -5], [9, -5], [-9, 5], [9, 5]]) columna(a, b, .5, 5.5, .55, 'pillar');
  for (const [a, b] of [[-12.5, 0], [12.5, 0], [0, -7.5], [0, 7.5]]) escombro(a, b, 0, 1.5);
  for (const [a, b] of [[-7, -2], [7, 2], [-3, 6], [3, -6]]) caja(a, b, .5, 1.6, 1.3, 1.6);
  lights.push({ x: 0, y: 6, z: 0, c: 0xffe0a8, i: 1.5, d: 26 });
  for (let z = -62; z < 62; z += 26) deco.push({ t: 'bruma', soft: 1, x0: -CX + 2, x1: CX - 2, z0: z, z1: z + 24, y: CY + 2.4, o: .1, dir: z % 2 ? 1 : -1 });   // bruma sobre el río

  for (const sx of [1, -1]) {
    const team = sx > 0 ? 0 : 1, col = team ? 'neonB' : 'neonR', luz = team ? 0x3a8bff : 0xff7a20, vid = team ? 'vitB' : 'vitR';
    const A = (u0, y0, z0, u1, y1, z1, m, ex) => add(sx * u0, y0, z0, sx * u1, y1, z1, m, ex);
    const P = (u, y, z) => ({ x: sx * u, y, z });
    const col_ = (u, z, y, h, r, m) => columna(sx * u, z, y, h, r, m);
    const arc_ = (u, z, y, l, h, e, m) => arco(sx * u, z, y, l, h, e, m);
    const caj_ = (u, z, y, w, h, d, m) => caja(sx * u, z, y, w, h, d, m);
    const esc_ = (u, z, y, r) => escombro(sx * u, z, y, r);
    const far_ = (u, z, y) => farola(sx * u, z, y, col);
    const vit_ = (u, z, y, w, h, e) => vitral(sx * u, z, y, w, h, e, vid);

    /* ---------- suelo general y borde del mapa ---------- */
    A(CX, -18, -68, 92, 0, 30, 'floor');
    A(CX, -18, 58, 92, 0, 68, 'floor');
    A(CX, -18, 30, 92, -7, 58, 'concrete');                        // banda del túnel sur: piso hundido
    A(92, -18, -68, 94, 26, 68, 'brick');                          // muro del fondo
    for (const z of [-68, 67]) add(-94, -18, z, 94, 26, z + 1, 'brick');

    /* ---------- CARRIL SUR: túnel por dentro de la roca ---------- */
    A(CX, -7, 30, 57, 0, 36, 'brick'); A(CX, -7, 52, 57, 0, 58, 'brick');   // paredes del túnel…
    A(XW, -7, 30, 92, 0, 36, 'brick'); A(XW, -7, 52, 92, 0, 58, 'brick');   // …cortadas donde están los fosos de los generadores
    A(CX, -2.2, 36, 42, 0, 52, 'brick'); A(42, -2.2, 43, XW + 2, 0, 52, 'brick');   // techo, con el hueco de la rampa
    A(CX, -7, 36, 58, -6.98, 52, 'tiles');                         // piso embaldosado (lámina)
    for (let u = CX + 4; u < 92; u += 7) {                         // arcos del túnel y farolas
      A(u - .4, -2.6, 36, u + .4, -2.2, 52, 'pillar');
      A(u - .5, -7, 36, u + .5, -2.6, 36.6, 'pillar'); A(u - .5, -7, 51.4, u + .5, -2.6, 52, 'pillar');
      if (u % 14 < 7) { lights.push({ x: sx * u, y: -3, z: 44, c: 0xffb060, i: .85, d: 15 }); }
    }
    A(CX, -7, 36.6, 92, -6.2, 38.4, 'grate');                      // canal inundado con reja a un costado
    for (let u = CX + 6; u < 90; u += 12) esc_(u, vr(40, 50), -7, 1.2);
    for (const u of [34, 46, 56]) { caj_(u, vr(39, 49), -7, 1.6, 1.4, 1.6); }
    // bocas del túnel: una rampa sale a la superficie en pleno campo y otra sube adentro de la fortaleza
    A(42, -7, 36, 56, 0, 43, 'floor', { ramp: { axis: 'x', dir: -sx, lo: -7, hi: 0 } });
    A(XW + 2, -7, 36, 82, 0, 52, 'floor', { ramp: { axis: 'x', dir: sx, lo: -7, hi: 0 } });
    A(82, -18, 30, 92, 0, 58, 'floor');
    baranda(sx * 42, 35.6, sx * 56, 36.2, 0); baranda(sx * 41.4, 36, sx * 42, 43, 0);   // baranda del hueco

    /* ---------- CARRIL NORTE: terraza alta y ruinas de catedral ---------- */
    A(CX, 0, -68, XW, 6, -30, 'rock');                             // terreno alto hasta el muro de la fortaleza
    A(38, 0, -30, 50, 6, -18, 'floor', { ramp: { axis: 'z', dir: -1, lo: 0, hi: 6 } });   // rampa al carril del centro
    stairs(sx * 28, -30, sx * 34, -14, 0, .55, 11, 'z', -1);        // y una escalera más cerca del cañón
    stairs(sx * 56, -30, sx * 62, -18, 0, .55, 11, 'z', -1);        // bajada de servicio del lado de la fortaleza
    for (let u = CX + 5; u < XG; u += 9) {                         // nave de la catedral: dos filas de columnas
      col_(u, -58, 6, 8, .65, 'pillar'); col_(u, -40, 6, 8, .65, 'pillar');
      A(u - .7, 13.5, -58.8, u + .7, 14.4, -39.2, 'brick');
    }
    muroRoto(sx * CX + (sx > 0 ? 2 : -8), -66, sx * CX + (sx > 0 ? 8 : -2), -62, 6, 9);
    for (let u = CX + 6; u < XG; u += 11) { muroRoto(sx * u - 1, -67, sx * u + 1, -60, 6, 8); vit_(u, -63.5, 9, 3, 5, 'x'); }
    A(CX + 2, 6, -67, XG, 10, -64, 'brick');                       // balcón corrido sobre la nave
    A(CX + 2, 10, -67, XG, 10.6, -60, 'step'); baranda(sx * (CX + 2), -60.6, sx * XG, -60, 10.6);
    for (let u = CX + 8; u < XG; u += 14) { A(u - 3, 6, -60.5, u + 3, 10, -59.5, 'step', { ramp: { axis: 'z', dir: -1, lo: 0, hi: 4 } }); }
    for (let u = CX + 9; u < XG - 6; u += 10) { esc_(u, vr(-54, -36), 6, vr(1.1, 1.8)); caj_(u + 4, vr(-52, -38), 6, 1.8, 1.5, 1.8); }
    for (const u of [34, 48, 58]) { arc_(u, -44, 6, 7, 7, 'z'); far_(u, -36, 6); }

    /* ---------- SUPERFICIE SUR: cementerio y cripta sobre el túnel ----------
       Arriba del túnel había un llano pelado. Ahora: una cripta con dos puertas, lápidas para cubrirse,
       un mirador al que se sube por escalera y un muro roto que tapa del carril del centro. */
    A(30, 0, 54, 32.6, 3.2, 54.8, 'brick'); A(34.6, 0, 54, 37, 3.2, 54.8, 'brick');      // cripta: frente con puerta
    A(30, 0, 61.2, 37, 3.2, 62, 'brick'); A(30, 0, 54, 30.8, 3.2, 62, 'brick');
    A(36.2, 0, 54, 37, 3.2, 57, 'brick'); A(36.2, 0, 59, 37, 3.2, 62, 'brick');           // costado con otra puerta
    A(29.6, 3.2, 53.6, 37.4, 3.7, 62.4, 'step');                                         // techo
    lamina(sx * 30.8, 0, 54.8, sx * 36.2, 61.2, 'tiles');
    lights.push({ x: sx * 33.5, y: 2.6, z: 58, c: luz, i: .8, d: 9 });
    for (const u of [40, 44.5, 49, 53.5]) for (const z of [56.5, 60.5, 64.5]) if (!(u === 53.5 && z === 56.5)) A(u - .7, 0, z - .2, u + .7, 1.1, z + .2, 'rock');   // lápidas
    A(46, 0, 45.5, 54, 2.5, 50.5, 'brick'); baranda(sx * 46, 45.5, sx * 54, 46.1, 2.5);   // mirador sobre la boca del túnel
    stairs(sx * 48, 50.5, sx * 52, 55.5, 0, .5, 5, 'z', -1);
    muroRoto(Math.min(sx * 28, sx * 39), 31, Math.max(sx * 28, sx * 39), 32, 0, 3.4);   // tapa del carril del centro
    col_(30, 45, 0, 5.5, .6, 'pillar'); col_(38, 49, 0, 4, .6, 'pillar');
    caj_(40, 46.5, 0, 1.6, 1.3, 1.6); esc_(32, 38.5, 0, 1.3);
    far_(34, 44, 0); far_(52, 63, 0);

    /* ---------- CARRIL CENTRO: ruinas abiertas ---------- */
    for (const [u, z] of [[34, -18], [34, 18], [46, -10], [46, 10], [56, -20], [56, 20], [40, 0], [52, 0]]) { col_(u, z, 0, 7, .6, 'pillar'); }
    for (const [u, z] of [[38, -8], [38, 8], [50, -16], [50, 16], [58, -6], [58, 6]]) { caj_(u, z, 0, 2.2, 1.5, 2.2); }
    for (const [u, z] of [[44, -22], [44, 22], [54, -12], [54, 12], [32, 0]]) esc_(u, z, 0, 1.8);
    muroRoto(sx * 42 - 1, -28, sx * 42 + 1, -16, 0, 5); muroRoto(sx * 42 - 1, 16, sx * 42 + 1, 28, 0, 5);
    A(30, 0, -14, 34, 4, 14, 'brick'); A(30, 4, -14, 34, 4.6, 14, 'step');   // plataforma baja frente al cañón
    stairs(sx * 34, -3, sx * 44, 3, 0, .55, 8, 'x', -sx);
    baranda(sx * 29.6, -14, sx * 30.2, 14, 4.6);
    for (const z of [-24, 24]) { arc_(36, z, 0, 8, 7, 'x'); }
    for (let u = CX + 8; u < XG - 6; u += 10) barril(sx * u, vr(-26, 26), 0);
    for (const z of [-20, 20]) far_(56, z, 0);   // a los costados: el medio del carril queda libre hasta el portón

    /* ---------- MURO DE LA FORTALEZA Y LAS TRES BARRERAS ---------- */
    const puertas = [D(LANES[0].z - GW / 2, LANES[0].z + GW / 2, 6, 12), D(-GW / 2, GW / 2, 0, 6), D(LANES[2].z - GW / 2, LANES[2].z + GW / 2, -7, -2.2)];
    wall(Math.min(sx * XW, sx * (XW + 2)), -68, Math.max(sx * XW, sx * (XW + 2)), 68, -18, 16, puertas, 'brick');
    // campo permanente por encima del muro: al rival no le sirve saltar, volar con cohetes ni bordear el mapa
    A(XW, 16, -68, XW + 2, 70, 68, 'clip', { bar: { team, lane: -1, i: 250, down: false }, nonav: 1 });
    LANES.forEach((L, lane) => {
      const i = bars.length, z0 = L.z - GW / 2, z1 = L.z + GW / 2, h = GH[lane];
      A(XW, L.y, z0, XW + 2, L.y + h, z1, 'clip', { bar: { team, lane, i, down: false } });
      bars.push({ team, lane, x: sx * (XW + 1), y: L.y, z: L.z, w: GW, h });
      defPts[team].push(P(XW + 6, L.y, L.z));
      // marco del portón: arco, vitrales y caños de energía que bajan a los dos generadores
      arc_(XW + 1, L.z, L.y, GW + 2, h + 1.5, 'z', 'pillar');
      vit_(XW - .2, L.z, L.y + h + 2.5, 5, 6, 'z');   // ventanal sobre el portón, del lado de afuera
      for (const s of [-1, 1]) {
        const zg = L.z + s * 11;
        // puesto fortificado del generador: plataforma, parapeto con huecos y cobertura alrededor
        A(XG - 4, L.y, zg - 4, XG + 3, L.y + .4, zg + 4, 'tiles');
        for (let q = -4.6; q < 4.5; q += 3.2) A(XG - 4.6, L.y + .4, zg + q, XG - 3.4, L.y + 1.8, zg + q + 1.6, 'brick');   // parapeto almenado: cubre, pero deja ver y tirar
        A(XG - 4.6, L.y + .4, zg + s * 4, XG + 3, L.y + 2.2, zg + s * 4.6, 'brick');
        col_(XG + 2.5, zg - 3.5, L.y + .4, 3.4, .45, 'pillar'); col_(XG + 2.5, zg + 3.5, L.y + .4, 3.4, .45, 'pillar');
        esc_(XG - 9, zg + s * 3.5, L.y, 1.2);
        cano(sx * XG, zg + s * .9, L.y + 2.6, sx * (XW - XG), 'x', .25);   // caño de energía hasta la barrera
        A(XG - 1.6, L.y, zg - 1.6, XG + 1.6, L.y + 3.2, zg + 1.6, 'clip', { gen: gens.length });
        // desde dónde lo ataca un bot: a cubierto, del lado de afuera
        const atk = lane === 0 ? P(XG - 9, 6, zg + s * 2) : lane === 1 ? P(XG - 9, 0, zg + s * 1.5) : P(XG - 7, -7, 44 - s * 4);
        gens.push({ team, lane, x: sx * XG, y: L.y, z: zg, atk });
        lights.push({ x: sx * XG, y: L.y + 4, z: zg, c: luz, i: 1.1, d: 15 });
      }
      /* puesto de reabastecimiento del carril, del lado del atacante: si gastaste todo rompiendo los
         generadores no tenés que volver hasta tu base. Tarima con respaldo que te cubre del portón. */
      const rx = XG - 13, muni = ['slugs', 'bullets', 'shells'][lane];
      A(rx - 3, L.y, L.z - 3.4, rx + 3, L.y + .4, L.z + 3.4, 'tiles');                  // tarima
      A(rx + 2, L.y + .4, L.z - 3.4, rx + 3.2, L.y + 2.2, L.z + 3.4, 'brick');          // parapeto que te tapa de los generadores
      A(rx - 3, L.y + .4, L.z - 3.6, rx + 3.2, L.y + 2.4, L.z - 3, 'brick'); A(rx - 3, L.y + .4, L.z + 3, rx + 3.2, L.y + 2.4, L.z + 3.6, 'brick');
      A(rx - 3.4, L.y + 2.4, L.z - 3.8, rx + 3.4, L.y + 2.8, L.z + 3.8, 'metal');   // techito (se puede subir)
      caj_(rx - 1.8, L.z + 2.2, L.y + .4, 1.4, 1, 1.4, 'crate');
      lights.push({ x: sx * rx, y: L.y + 2.3, z: L.z, c: 0x9fe8ff, i: .9, d: 11 });
      deco.push({ t: 'glow', x: sx * rx, y: L.y + 2.2, z: L.z, c: 0x8fe4ff, s: 1.1 });
      I('health', sx * rx, L.y + .5, L.z + 1.4);
      I(muni, sx * rx, L.y + .5, L.z - 1.4);
      if (lane === 1) I('armor', sx * (rx - .4), L.y + .5, L.z);
    });

    /* ---------- FORTALEZA ---------- */
    lamina(sx * (XW + 2), 0, -68, sx * 92, 36); lamina(sx * (XW + 2), 0, 52, sx * 92, 68); lamina(sx * 82, 0, 36, sx * 92, 52);   // piso embaldosado (sin tapar la rampa del túnel)
    // bajada del portón norte (y 6) al patio (y 0)
    A(XW + 2, 0, -53, XW + 16, 6, -35, 'floor', { ramp: { axis: 'x', dir: -sx, lo: 0, hi: 6 } });
    A(XW + 2, 0, -68, 92, 6, -56, 'rock'); esc_(XW + 9, -28, 0, 1.6); esc_(XW + 20, -27, 0, 1.4);
    // arena circular del boss: anillo de columnas, gradas y cúpula
    const bx = sx * XB;
    add(bx - 15, -18, -15, bx + 15, 0, 15, 'floor');
    add(bx - 13, 0, -13, bx + 13, .35, 13, 'tiles'); add(bx - 9, .35, -9, bx + 9, .7, 9, 'tiles');
    add(bx - 3.2, .7, -3.2, bx + 3.2, 1.4, 3.2, 'pillar');
    for (let a = 0; a < 10; a++) { const an = a / 10 * 6.2832 + .31, cx2 = bx + Math.cos(an) * 14.5, cz = Math.sin(an) * 14.5; if (Math.abs(cz) > 13.6 || Math.abs(cx2 - bx) > 13.6) continue; columna(cx2, cz, 0, 9, .75, 'pillar'); }
    for (const z of [-26, -16, 16, 26]) vitral(sx * 91.5, z, 4, 7, 10, 'z', vid);          // vitrales del fondo de la fortaleza
    for (const s of [-1, 1]) { add(bx - 8.9, 0, s * 11, bx - 7.4, 12, s * 17, 'brick'); vitral(bx - 9.05, s * 14, 3, 5, 7, 'z', vid); }   // y dos en los machones de la arena
    for (const [u, z] of [[XB - 11, -11], [XB - 11, 11], [XB + 11, -11], [XB + 11, 11]]) { caj_(u, z, 0, 2, 1.5, 2); }
    bosses[team] = { x: bx, y: 1.4, z: 0, yaw: face(bx, 0, 0, 0) };
    add(bx - 2, 1.4, -2, bx + 2, 1.4 + DOM.BOSS_H, 2, 'clip', { boss: team });
    bossPts[team].push(P(XB - 10, 0, -9), P(XB - 10, 0, 9));
    // salas de aparición, detrás del boss
    for (const s of [-1, 1]) {
      A(XS - 5, 0, s * 20, 92, 8, s * 21, 'brick'); A(XS - 5, 0, s * 38, 92, 8, s * 39, 'brick');
      // el frente es un claustro de arcos abierto al patio del boss, no una pared
      for (const z of [24, 29.5, 35]) { arco(sx * (XS - 4.5), s * z, 0, 4.6, 5, 'z', 'pillar'); }
      A(XS - 5, 6.5, s * 21, XS - 4, 8, s * 38, 'brick'); A(XS - 5.6, 8, s * 20, XS - 3.4, 8.6, s * 39, 'step');
      for (const z of [26, 31, 36]) { tspawns[team].push({ x: sx * (XS + 3), y: 0, z: s * z, yaw: face(sx * (XS + 3), s * z, 0, s * z) }); }
      vit_(91.6, s * 30, 3, 6, 5, 'z');
      lights.push({ x: sx * XS, y: 5, z: s * 30, c: 0xffe0b0, i: 1, d: 20 });
      far_(XW + 6, s * 12, 0);
    }
    lights.push({ x: bx, y: 11, z: 0, c: luz, i: 1.8, d: 34 });
    // reaparición adelantada: a mitad del carril que tu equipo ya abrió, del lado de afuera
    fspawns[1 - team] = [P(44, 6, -44), P(40, 0, 13), P(40, -7, 44)].map(p => ({ x: p.x, y: p.y, z: p.z, yaw: face(p.x, p.z, sx * 92, p.z) }));

    /* ---------- ítems ---------- */
    I('health', sx * 56, 6, -44); I('health', sx * 36, 0, 0); I('health', sx * 56, -7, 44); I('health', sx * (XW + 8), 0, 0);
    I('armor', sx * 30, 4.6, 0); I('armorH', sx * 44, 6, -62); I('mega', sx * 44, -7, 44);
    I('w8', sx * 58, 6, -50); I('w5', sx * 34, 0, 12); I('w3', sx * 50, -7, 40); I('w6', sx * 70, 0, -44);
    I('bullets', sx * 88, 0, -14); I('shells', sx * 88, 0, 14); I('rockets', sx * (XW + 7), 0, 44); I('slugs', sx * 48, 6, -38);
    I('bullets', sx * 40, 0, -22); I('shells', sx * 40, 0, 22); I('slugs', sx * 52, -7, 48);
  }
  spawns.push(...tspawns[0], ...tspawns[1]);
  return finish({
    id: 'santuario', name: 'dom1 · El Santuario Dual', bounds: { x0: -94, x1: 94, z0: -68, z1: 68 },
    tspawns, fspawns, gens, bars, bosses, bossPts, defPts, deco, navMaxY: 11,
    theme: { sky: 'halloween', tex: 'ruina', fog: 0x101722, fogD: .0042, amb: 0x7585ac, ambI: .62, hemi: [0x8aa0d8, 0x40301c, .6], sun: true, sunC: 0xc8d4ff, sunI: .5, sunPos: [10, 70, 40], shadowRes: 4096, shBias: -.0004, shNormal: .08, shFar: 230 }
  });
}
MAPDEFS.santuario = buildSantuario;
