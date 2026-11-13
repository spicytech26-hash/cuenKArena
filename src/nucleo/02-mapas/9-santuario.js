/* ---------- El Santuario Dual (Captura el dominio) ----------
   184 × 136 m: el mapa más grande del juego, pero ancho y compacto (se cruza en 18-22 s, no es un pasillo).
   Simétrico respecto de x = 0: azul al oeste, rojo al este. De un extremo al otro:
     fortaleza · barreras y generadores · ruinas · cañón con el río · ruinas · barreras y generadores · fortaleza.
   Tres carriles, cada uno con su portón sellado por una barrera y un generador en cada extremo de la barrera:
     norte  z -44, terraza alta a 6 m, ruinas de catedral y puente alto sobre el cañón
     centro z   0, plaza con el punto de poder y dos puentes de piedra
     sur    z  44, túnel a -7 m por dentro del arco de roca, con canal y rejas

   Está armado con un kit de piezas que se repiten (columna, arco, muro roto, escalera, balcón, caño, caja,
   barril, engranaje, farola, reja, escombro). Las piezas que son solo adorno llevan `nc: 1`: no chocan, no
   entran al índice de colisión y no cuestan nada al servidor, pero el cliente las dibuja igual.
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

  /* ================= EL KIT ================= */
  const D_ = { nc: 1 };                                            // adorno: se ve, no choca
  const caja = (x, z, y, w, h, d, m) => add(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, m || 'crate');
  const barril = (x, z, y) => { add(x - .45, y, z - .45, x + .45, y + 1.1, z + .45, 'metal'); add(x - .5, y + .25, z - .5, x + .5, y + .38, z + .5, 'metal', D_); add(x - .5, y + .72, z - .5, x + .5, y + .85, z + .5, 'metal', D_); };
  // columna con base y capitel (el fuste choca, el resto es adorno)
  const columna = (x, z, y, h, r, m) => {
    add(x - r * 1.45, y, z - r * 1.45, x + r * 1.45, y + .45, z + r * 1.45, m || 'pillar', D_);
    add(x - r, y, z - r, x + r, y + h - .5, z + r, m || 'pillar');
    add(x - r * 1.45, y + h - .5, z - r * 1.45, x + r * 1.45, y + h, z + r * 1.45, m || 'pillar', D_);
  };
  // arco gótico: dos columnas y el vano escalonado entre ellas (eje = por dónde se pasa)
  const arco = (x, z, y, luz, h, eje, m) => {
    const q = luz / 2, mat = m || 'brick';
    if (eje === 'z') {
      columna(x, z - q, y, h, .5, mat); columna(x, z + q, y, h, .5, mat);
      for (let k = 0; k < 3; k++) { const o = q - .35 - k * .55, yy = y + h - .5 + k * .5; add(x - .5, yy, z - o, x + .5, yy + .5, z + o, mat, D_); }
      add(x - .55, y + h + 1, z - q - .5, x + .55, y + h + 1.5, z + q + .5, mat, D_);
    } else {
      columna(x - q, z, y, h, .5, mat); columna(x + q, z, y, h, .5, mat);
      for (let k = 0; k < 3; k++) { const o = q - .35 - k * .55, yy = y + h - .5 + k * .5; add(x - o, yy, z - .5, x + o, yy + .5, z + .5, mat, D_); }
      add(x - q - .5, y + h + 1, z - .55, x + q + .5, y + h + 1.5, z + .55, mat, D_);
    }
  };
  // muro derruido: altura irregular, con mordiscos arriba
  const muroRoto = (x0, z0, x1, z1, y, h, m) => {
    const ejeX = (x1 - x0) >= (z1 - z0), L = ejeX ? x1 - x0 : z1 - z0, n = Math.max(2, Math.round(L / 3.5));
    for (let i = 0; i < n; i++) {
      const a = (ejeX ? x0 : z0) + L * i / n, b = (ejeX ? x0 : z0) + L * (i + 1) / n, hh = h * vr(.45, 1.05);
      if (ejeX) add(a, y, z0, b, y + hh, z1, m || 'brick'); else add(x0, y, a, x1, y + hh, b, m || 'brick');
    }
  };
  // caño de bronce (adorno) de un punto a otro, sobre un eje
  const cano = (x, z, y, L, eje, r) => {
    r = r || .3;
    if (eje === 'x') { add(x, y - r, z - r, x + L, y + r, z + r, 'metal', D_); for (let k = 1; k < Math.abs(L) / 6; k++) { const q = x + L * k / Math.ceil(Math.abs(L) / 6); add(q - .2, y - r - .12, z - r - .12, q + .2, y + r + .12, z + r + .12, 'metal', D_); } }
    else if (eje === 'z') { add(x - r, y - r, z, x + r, y + r, z + L, 'metal', D_); for (let k = 1; k < Math.abs(L) / 6; k++) { const q = z + L * k / Math.ceil(Math.abs(L) / 6); add(x - r - .12, y - r - .12, q - .2, x + r + .12, y + r + .12, q + .2, 'metal', D_); } }
    else add(x - r, y, z - r, x + r, y + L, z + r, 'metal', D_);
  };
  const engranaje = (x, z, y, r) => { add(x - r, y - .2, z - .25, x + r, y + r * 2 - .2, z + .25, 'metal', D_); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832, cx = x + Math.cos(a) * r * .92, cy = y + r - .2 + Math.sin(a) * r * .92; add(cx - .22, cy - .22, z - .3, cx + .22, cy + .22, z + .3, 'metal', D_); } };
  const farola = (x, z, y, col) => { add(x - .16, y, z - .16, x + .16, y + 3.2, z + .16, 'metal', D_); add(x - .45, y + 3.2, z - .45, x + .45, y + 3.9, z + .45, col, D_); lights.push({ x, y: y + 3.5, z, c: col === 'neonR' ? 0xff7a20 : 0x3a8bff, i: .9, d: 17 }); };
  const reja = (x0, z0, x1, z1, y, h) => add(x0, y, z0, x1, y + h, z1, 'grate');
  const baranda = (x0, z0, x1, z1, y) => add(x0, y, z0, x1, y + .95, z1, 'rail');
  // escombro: dos o tres bloques apilados, sirven de cobertura baja
  const escombro = (x, z, y, r) => { add(x - r, y, z - r, x + r, y + r * vr(.7, 1.2), z + r, 'rock'); add(x - r * .6 + vr(-.4, .4), y, z - r * .6 + vr(-.4, .4), x + r * .55, y + r * vr(1, 1.7), z + r * .55, 'rock'); };
  // vitral: paño de vidrio de color con su marco (puro adorno)
  const vitral = (x, z, y, w, h, eje, col) => {
    if (eje === 'z') { add(x - .12, y, z - w / 2, x + .12, y + h, z + w / 2, col, D_); add(x - .3, y + h, z - w / 2 - .3, x + .3, y + h + .4, z + w / 2 + .3, 'brick', D_); add(x - .3, y - .4, z - w / 2 - .3, x + .3, y, z + w / 2 + .3, 'brick', D_); }
    else { add(x - w / 2, y, z - .12, x + w / 2, y + h, z + .12, col, D_); add(x - w / 2 - .3, y + h, z - .3, x + w / 2 + .3, y + h + .4, z + .3, 'brick', D_); }
  };
  // cúpula escalonada (adorno) sobre la arena del boss
  const cupula = (x, z, y, r, n, col) => {
    for (let k = 0; k < n; k++) {
      const t = k / n, rr2 = r * Math.cos(t * 1.45), yy = y + r * .62 * Math.sin(t * 1.45), gr = r * .1 + .35;
      for (let a = 0; a < 12; a++) { const an = a / 12 * 6.2832 + k * .13, cx = x + Math.cos(an) * rr2, cz = z + Math.sin(an) * rr2; add(cx - gr, yy, cz - gr, cx + gr, yy + r * .14, cz + gr, k % 2 ? 'brick' : 'pillar', D_); }
      if (k % 2 === 0) for (let a = 0; a < 6; a++) { const an = a / 6 * 6.2832 + .5, cx = x + Math.cos(an) * rr2, cz = z + Math.sin(an) * rr2; add(cx - .35, yy, cz - .35, cx + .35, yy + r * .13, cz + .35, col, D_); }
    }
    add(x - .5, y + r * .66, z - .5, x + .5, y + r * .66 + 1.6, z + .5, 'metal', D_);
    add(x - 1.1, y + r * .66 + 1.6, z - 1.1, x + 1.1, y + r * .66 + 2.3, z + 1.1, col, D_);
  };

  /* ================= EL CAÑÓN Y EL RÍO ================= */
  add(-CX, -18, -68, CX, CY, 68, 'canyon');                       // fondo
  lava.push({ min: [-CX, CY, -68], max: [CX, CY + 1.7, 68], dps: 999, water: 1 });
  for (const s of [-1, 1]) {                                       // paredes del cañón: cornisas y caños rotos
    for (let z = -64; z < 68; z += 8) { add(s * CX - s * 2.2, CY + vr(1, 4), z, s * CX, CY + vr(2, 5.5), z + vr(3, 6), 'rock', D_); if (rr() < .45) cano(s * CX - s * .4, z + 2, CY + vr(3, 8), s * 3, 'x', .25); }
    for (const z of [-56, -24, 10, 50]) { add(s * CX - s * 5, CY, z - 3, s * CX, CY + .6, z + 3, 'rock'); escombro(s * (CX - 3), z, CY + .6, 1.6); }
  }
  // puente alto del norte (carril norte, y = 6) con sus arcos
  add(-CX - 1, 5, -53, CX + 1, 6, -35, 'step');
  for (const x of [-20, -10, 0, 10, 20]) { add(x - 1.4, -2, -52, x + 1.4, 5, -36, 'pillar'); for (let k = 0; k < 3; k++) add(x - 2 - k * .5, 5 - 1 - k * .9, -52.5, x + 2 + k * .5, 5 - k * .9, -35.5, 'brick', D_); }
  baranda(-CX, -53.2, CX, -52.6, 6); baranda(-CX, 35.6 - 71, CX, 36.2 - 71, 6);
  for (let x = -24; x <= 24; x += 8) { farola(x, -52.2, 6, 'light'); }
  // puentes del centro (y = 0) y plaza con el punto de poder
  for (const zc of [-13, 13]) {
    add(-CX - 1, -1, zc - 4, CX + 1, 0, zc + 4, 'step');
    for (const x of [-18, -6, 6, 18]) { add(x - 1.2, -8, zc - 3.6, x + 1.2, -1, zc + 3.6, 'pillar'); add(x - 1.9, -1.9, zc - 4.2, x + 1.9, -1, zc + 4.2, 'brick', D_); }
    baranda(-CX, zc - 4.3, CX, zc - 3.75, 0); baranda(-CX, zc + 3.75, CX, zc + 4.3, 0);
  }
  // arco de roca del sur: por arriba se cruza a cielo abierto, por dentro sigue el túnel
  add(-CX - 1, -18, 30, CX + 1, -7, 58, 'rock');
  add(-CX - 1, -7, 30, CX + 1, 0, 36, 'rock'); add(-CX - 1, -7, 52, CX + 1, 0, 58, 'rock');
  add(-CX - 1, -2.2, 36, CX + 1, 0, 52, 'rock');
  for (const x of [-18, -6, 6, 18]) { add(x - 1.2, -14, 31, x + 1.2, -7, 34, 'pillar'); add(x - 1.2, -14, 54, x + 1.2, -7, 57, 'pillar'); }
  for (let x = -22; x <= 22; x += 11) { add(x - 2.5, -7, 36, x + 2.5, -6.6, 52, 'tiles', D_); lights.push({ x, y: -3, z: 44, c: 0xffb060, i: .8, d: 15 }); }
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
    A(CX, -7, 36, 58, -6.6, 52, 'tiles', D_);                      // piso embaldosado
    for (let u = CX + 4; u < 92; u += 7) {                         // arcos del túnel y farolas
      A(u - .4, -2.6, 36, u + .4, -2.2, 52, 'pillar', D_);
      A(u - .5, -7, 36, u + .5, -2.6, 36.6, 'pillar', D_); A(u - .5, -7, 51.4, u + .5, -2.6, 52, 'pillar', D_);
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
      A(u - .7, 13.5, -58.8, u + .7, 14.4, -39.2, 'brick', D_);
      if (rr() < .6) { A(u - 3, 6, -50, u + 3, 6.6, -46, 'tiles', D_); }
    }
    muroRoto(sx * CX + (sx > 0 ? 2 : -8), -66, sx * CX + (sx > 0 ? 8 : -2), -62, 6, 9);
    for (let u = CX + 6; u < XG; u += 11) { muroRoto(sx * u - 1, -67, sx * u + 1, -60, 6, 8); vit_(u, -63.5, 9, 3, 5, 'x'); }
    A(CX + 2, 6, -67, XG, 10, -64, 'brick');                       // balcón corrido sobre la nave
    A(CX + 2, 10, -67, XG, 10.6, -60, 'step'); baranda(sx * (CX + 2), -60.6, sx * XG, -60, 10.6);
    for (let u = CX + 8; u < XG; u += 14) { A(u - 3, 6, -60.5, u + 3, 10, -59.5, 'step', { ramp: { axis: 'z', dir: -1, lo: 0, hi: 4 } }); }
    for (let u = CX + 7; u < XG; u += 8) { esc_(u, vr(-56, -34), 6, vr(1, 2)); if (rr() < .5) caj_(u + 2, vr(-54, -36), 6, 1.8, 1.5, 1.8); }
    for (const u of [34, 48, 58]) { arc_(u, -44, 6, 7, 7, 'z'); far_(u, -36, 6); }
    A(CX, 6, -34, XG, 6.6, -31, 'step', D_);

    /* ---------- CARRIL CENTRO: ruinas abiertas ---------- */
    for (const [u, z] of [[34, -18], [34, 18], [46, -10], [46, 10], [56, -20], [56, 20], [40, 0], [52, 0]]) { col_(u, z, 0, 7, .6, 'pillar'); }
    for (const [u, z] of [[38, -8], [38, 8], [50, -16], [50, 16], [58, -6], [58, 6]]) { caj_(u, z, 0, 2.2, 1.5, 2.2); }
    for (const [u, z] of [[44, -22], [44, 22], [54, -12], [54, 12], [32, 0]]) esc_(u, z, 0, 1.8);
    muroRoto(sx * 42 - 1, -28, sx * 42 + 1, -16, 0, 5); muroRoto(sx * 42 - 1, 16, sx * 42 + 1, 28, 0, 5);
    A(30, 0, -14, 34, 4, 14, 'brick'); A(30, 4, -14, 34, 4.6, 14, 'step');   // plataforma baja frente al cañón
    stairs(sx * 34, -3, sx * 44, 3, 0, .55, 8, 'x', -sx);
    baranda(sx * 29.6, -14, sx * 30.2, 14, 4.6);
    for (const z of [-24, 24]) { arc_(36, z, 0, 8, 7, 'x'); }
    for (let u = CX + 8; u < XG; u += 10) { barril(sx * u, vr(-26, 26), 0); if (rr() < .5) barril(sx * u + sx, vr(-26, 26), 0); }
    for (const z of [-20, 0, 20]) far_(58, z, 0);

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
        A(XG - 4, L.y, zg - 4, XG + 3, L.y + .6, zg + 4, 'tiles');
        A(XG - 4.6, L.y + .6, zg - 4.6, XG - 3.4, L.y + 2, zg + 4.6, 'brick');
        A(XG - 4.6, L.y + .6, zg + s * 4, XG + 3, L.y + 2.2, zg + s * 4.6, 'brick');
        col_(XG + 2.5, zg - 3.5, L.y + .6, 3.4, .45, 'pillar'); col_(XG + 2.5, zg + 3.5, L.y + .6, 3.4, .45, 'pillar');
        A(XG - 8, L.y, zg - 1.2, XG - 6, L.y + 1.4, zg + 1.2, 'crate');
        esc_(XG - 7, zg + s * 3.5, L.y, 1.3);
        A(XG + 3, L.y, zg - .45, XW, L.y + .9, zg + .45, 'metal', D_);     // caño de alimentación hasta la barrera
        cano(sx * XG, zg + s * .9, L.y + 2.6, sx * (XW - XG), 'x', .25);
        engranaje(sx * (XG - 3.6), zg - s * 2.4, L.y + .6, 1.1);
        A(XG - 1.6, L.y, zg - 1.6, XG + 1.6, L.y + 3.2, zg + 1.6, 'clip', { gen: gens.length });
        // desde dónde lo ataca un bot: a cubierto, del lado de afuera
        const atk = lane === 0 ? P(XG - 9, 6, zg + s * 2) : lane === 1 ? P(XG - 9, 0, zg + s * 1.5) : P(XG - 7, -7, 44 - s * 4);
        gens.push({ team, lane, x: sx * XG, y: L.y, z: zg, atk });
        lights.push({ x: sx * XG, y: L.y + 4, z: zg, c: luz, i: 1.1, d: 15 });
      }
    });

    /* ---------- FORTALEZA ---------- */
    A(XW + 2, 0, -68, 92, .5, 68, 'tiles', D_);                    // piso embaldosado
    // bajada del portón norte (y 6) al patio (y 0)
    A(XW + 2, 0, -53, XW + 16, 6, -35, 'floor', { ramp: { axis: 'x', dir: -sx, lo: 0, hi: 6 } });
    A(XW + 2, 0, -68, 92, 6, -56, 'rock'); A(XW + 2, 0, -32, 92, 2.5, -24, 'rock', D_);
    // arena circular del boss: anillo de columnas, gradas y cúpula
    const bx = sx * XB;
    add(bx - 15, -18, -15, bx + 15, 0, 15, 'floor');
    add(bx - 13, 0, -13, bx + 13, .35, 13, 'tiles'); add(bx - 9, .35, -9, bx + 9, .7, 9, 'tiles');
    add(bx - 3.2, .7, -3.2, bx + 3.2, 1.4, 3.2, 'pillar');
    for (let a = 0; a < 10; a++) { const an = a / 10 * 6.2832 + .31, cx2 = bx + Math.cos(an) * 14.5, cz = Math.sin(an) * 14.5; if (Math.abs(cz) > 13.6 || Math.abs(cx2 - bx) > 13.6) continue; columna(cx2, cz, 0, 13, .75, 'pillar'); add(cx2 - 1, 13, cz - 1, cx2 + 1, 14.5, cz + 1, 'brick', D_); }
    cupula(bx, 0, 15, 15, 5, col);
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
      A(XS - 5, 6.5, s * 21, XS - 4, 8, s * 38, 'brick'); A(XS - 5.6, 8, s * 20, XS - 3.4, 8.6, s * 39, 'step', D_);
      A(XS - 4, 0, s * 20.6, 92, .5, s * 21, 'tiles', D_);
      A(XS - 4, 0, s * 24, XS - 3.4, 4.5, s * 35, 'brick', D_);
      for (const z of [26, 31, 36]) { A(XS + 2, 0, s * z, XS + 5, .45, s * z + s * 2, 'tiles', D_); tspawns[team].push({ x: sx * (XS + 3), y: 0, z: s * z, yaw: face(sx * (XS + 3), s * z, 0, s * z) }); }
      vit_(91.6, s * 30, 3, 6, 5, 'z');
      lights.push({ x: sx * XS, y: 5, z: s * 30, c: 0xffe0b0, i: 1, d: 20 });
      far_(XW + 6, s * 12, 0);
    }
    lights.push({ x: bx, y: 11, z: 0, c: luz, i: 1.8, d: 34 });
    deco.push({ t: 'glow', x: bx, y: 17, z: 0, c: team ? 0x3a8bff : 0xff7a20, s: 7 });
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
