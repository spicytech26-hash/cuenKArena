/* ---------- Pyramid — la pirámide de gravedad, de noche de Halloween ----------
   Inspirado en dm-pyramid de Unreal Tournament. Cinco niveles de piedra (cada 4,8 m, así los bots pueden bajar de uno al otro) apilados que se achican hacia arriba (el de abajo es el más grande,
   así que si te caés de un borde aterrizás en el nivel de abajo). Cielo estrellado violeta con luna roja y faroles rojos colgando de los bordes.
   · Pozo central de 7x7 m que atraviesa los niveles 1 a 4, con la columna de gravedad (negra, con la espiral celeste) en el medio.
   · En cada nivel sale un puente hasta la columna (N, E, S, O). Al final del puente hay un saltador que te manda al puente del nivel de arriba:
     subís de a un piso, o con los dos saltadores del piso de abajo salteás directo al nivel 1 o al nivel 3. Para bajar te tirás al pozo.
   · Cada nivel tiene arma, escudo y curación; arriba de todo, en la punta de la columna, está el escudo amarillo.
   · Mapa de noche (theme.noche): linternas en las armas, ambiente y tecla T. */
function buildPyramid() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  const Y = [0, 4.8, 9.6, 14.4, 19.2];                 // altura del piso de cada nivel
  const S = [34, 27.75, 21.5, 15.25, 9];            // mitad del lado de cada nivel (las patas pasan justo por las esquinas)
  const H = 3.5;                                // mitad del pozo central
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // puente del nivel 1 al norte, 2 al este, 3 al sur, 4 al oeste

  /* ---- niveles: cuerpo de ladrillo + piso de baldosa; del 1 al 4 son un anillo alrededor del pozo ---- */
  const slab = (x0, z0, x1, z1, y) => { add(x0, y - 1.2, z0, x1, y - .15, z1, 'brick'); add(x0, y - .15, z0, x1, y, z1, 'tiles'); };
  add(-S[0], -3, -S[0], S[0], -.15, S[0], 'brick'); add(-S[0], -.15, -S[0], S[0], 0, S[0], 'tiles');
  for (let k = 1; k <= 4; k++) {
    const s = S[k], y = Y[k];
    slab(-s, -s, s, -H, y); slab(-s, H, s, s, y); slab(-s, -H, -H, H, y); slab(H, -H, s, H, y);
  }
  // cordón bajito en el borde de cada nivel (solo se ve, se pisa)
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], t = .35;
    add(-s, y, -s, s, y + t, -s + .3, 'concrete', { nc: 1 }); add(-s, y, s - .3, s, y + t, s, 'concrete', { nc: 1 });
    add(-s, y, -s + .3, -s + .3, y + t, s - .3, 'concrete', { nc: 1 }); add(s - .3, y, -s + .3, s, y + t, s - .3, 'concrete', { nc: 1 });
  }

  /* ---- columna de gravedad: negra, con una espiral celeste que sube alrededor ---- */
  add(-.5, 0, -.5, .5, Y[4] + 3.2, .5, 'black');
  add(-1.2, Y[4] + 3.2, -1.2, 1.2, Y[4] + 3.6, 1.2, 'trim');                       // plataforma de la punta (escudo amarillo)
  add(-1.1, 0, -1.1, 1.1, .35, 1.1, 'metal', { nc: 1 });             // base
  for (let i = 0; i < 100; i++) {                                    // espiral de cubos celestes (un solo material: una sola llamada de dibujo)
    const a = i * .42, y = .5 + i * .23, r = .95;
    add(Math.cos(a) * r - .13, y, Math.sin(a) * r - .13, Math.cos(a) * r + .13, y + .26, Math.sin(a) * r + .13, 'tube', { nc: 1 });
  }
  deco.push({ t: 'glow', x: 0, y: .9, z: 0, c: 0x40e0ff }, { t: 'glow', x: 0, y: Y[4] + 4.4, z: 0, c: 0xffd040 });

  /* ---- puentes y saltadores: cada nivel (1 a 4) tiene un puente de la pared del pozo a la columna ---- */
  const at = (k, r, w) => [DIR[k - 1][0] * r + DIR[k - 1][1] * w, DIR[k - 1][1] * r + DIR[k - 1][0] * w];   // punto a r metros del centro (w al costado)
  for (let k = 1; k <= 4; k++) {
    const a = at(k, .5, -.7), b = at(k, H + .1, .7), y = Y[k];
    add(Math.min(a[0], b[0]), y - .5, Math.min(a[1], b[1]), Math.max(a[0], b[0]), y, Math.max(a[1], b[1]), 'metal');
    const g = at(k, 2, 0); deco.push({ t: 'glow', x: g[0], y: y + .3, z: g[1], c: 0x40e0ff });
  }
  for (let k = 1; k <= 3; k++) { const p = at(k, 2, 0), t = at(k + 1, 3.1, 0); pads.push({ x: p[0], y: Y[k], z: p[1], r: .7, t: [t[0], Y[k + 1], t[1]], apex: k === 3 ? 1.2 : 2.5 }); }
  { const p = at(4, 2.3, 0); pads.push({ x: p[0], y: Y[4], z: p[1], r: .7, t: [-.75, Y[4] + 3.6, 0], apex: 3 }); }   // nivel 4 -> punta de la columna
  pads.push({ x: 2, y: 0, z: 0, r: .7, t: [0, Y[1], -3.1], apex: 2.5 });          // base -> puente del nivel 1
  pads.push({ x: -2.6, y: 0, z: 0, r: .7, t: [0, Y[3], 3.1], apex: 2.5 });         // base -> puente del nivel 3 (directo)
  deco.push({ t: 'glow', x: 2, y: .3, z: 0, c: 0x40e0ff }, { t: 'glow', x: -2.6, y: .3, z: 0, c: 0x40e0ff });

  /* ---- patas: cuatro vigas inclinadas desde las esquinas de abajo hasta la punta (solo se ven) y el remate dorado ---- */
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let y = -3; y < 25; y += .5) {
      const c = 34 - 1.302 * y;   // la viga pasa justo por la esquina de cada nivel
      add(sx * (c - .95), y, sz * (c - .95), sx * (c + .95), y + .56, sz * (c + .95), 'metal', { nc: 1 });
    }
  }
  add(-2, 25, -2, 2, 25.8, 2, 'trim', { nc: 1 }); add(-1.2, 25.8, -1.2, 1.2, 26.6, 1.2, 'trim', { nc: 1 }); add(-.5, 26.6, -.5, .5, 27.3, .5, 'trim', { nc: 1 });
  deco.push({ t: 'glow', x: 0, y: 27.7, z: 0, c: 0xffa040 });

  /* ---- abajo: el pilar, el agua oscura y bruma baja ---- */
  add(-2.5, -14, -2.5, 2.5, -3, 2.5, 'black', { nc: 1 });
  lava.push({ min: [-500, -40, -500], max: [500, -14, 500], water: true, dps: 0 });
  for (const [x, z, w] of [[-44, -30, 5], [40, 38, 6], [-38, 44, 4], [48, -22, 4], [0, -52, 7], [-56, 6, 5]]) add(x, -15, z, x + w, -12.6, z + w * .8, 'rock', { nc: 1 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 30 + (i % 4) * 9, cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = 22 + (i % 3) * 8;
    deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 3, z1: cz + w / 3, y: -12 + (i % 4) * 1.8, o: .13, dir: i % 2 ? 1 : -1 });
  }
  add(-80, 45, -80, 80, 55, 80, 'clip');                                                       // techo: inalcanzable

  /* ---- faroles rojos colgando del borde de cada nivel (puro brillo, una sola malla de puntos) ---- */
  for (let k = 0; k <= 4; k++) {
    const s = S[k] + .3, y = Y[k] - 1.7, n = Math.round(s * 2 / 3.4);
    for (let i = 0; i <= n; i++) {
      const q = -s + 2 * s * i / n;
      deco.push({ t: 'glow', x: q, y, z: -s, c: 0xff2a1a }, { t: 'glow', x: q, y, z: s, c: 0xff2a1a });
      if (i > 0 && i < n) deco.push({ t: 'glow', x: -s, y, z: q, c: 0xff2a1a }, { t: 'glow', x: s, y, z: q, c: 0xff2a1a });
    }
  }

  /* ---- cobertura: cajones y muretes en cada nivel (para pelear, no para encerrarse) ---- */
  const cajon = (x, y, z, s) => add(x - s * .7, y, z - s * .7, x + s * .7, y + s, z + s * .7, 'crate');
  const muro = (x0, z0, x1, z1, y) => { add(x0, y, z0, x1, y + 1.5, z1, 'concrete'); add(x0 - .06, y + 1.5, z0 - .06, x1 + .06, y + 1.62, z1 + .06, 'smooth'); };
  for (const [x, z] of [[-14, -22], [14, 22], [-22, 14], [22, -14]]) { muro(x - 2.5, z - .2, x + 2.5, z + .2, 0); }
  for (const [x, z] of [[-6, 20], [6, -20], [-20, -6], [20, 6], [-26, -26], [26, 26]]) cajon(x, 0, z, 1.4);
  for (const [x, z] of [[-12, -22], [12, 22], [-22, 12], [22, -12]]) cajon(x, Y[1], z, 1.3);
  for (const [x, z] of [[-9, -16], [9, 16], [-16, 9], [16, -9]]) cajon(x, Y[2], z, 1.3);
  for (const [x, z] of [[-6, -11], [6, 11], [-11, 6], [11, -6]]) cajon(x, Y[3], z, 1.2);
  for (const [x, z] of [[-6.6, 0], [6.6, 0], [0, 6.6], [0, -6.6]]) cajon(x, Y[4], z, 1);

  /* ---- ítems: en cada nivel hay arma, escudo y curación ---- */
  const it = (k, list) => list.forEach(([t, x, z]) => I(t, x, Y[k], z));
  it(0, [['w1', -12, 12], ['w2', -12, -12], ['w3', 12, 12], ['armor', 12, -12], ['armor', -30, 30], ['health', -28, 0], ['health', 28, 0], ['health', 0, -28], ['health', 0, 28], ['health', 18, 18],
    ['shells', -20, 6], ['bullets', 20, -6], ['rockets', 6, 20], ['grenades', -6, -20], ['slugs', 30, 30], ['caza', -30, -30]]);
  it(1, [['w4', -20, -20], ['w9', 20, 20], ['armor', 20, -20], ['armorH', -22, 22], ['health', -20, 20], ['health', 20, -12], ['health', 0, 22], ['shells', 0, -22], ['rockets', 22, 0], ['bullets', -22, 0]]);
  it(2, [['w5', -14, -14], ['mega', 14, 14], ['armor', 14, -14], ['health', -14, 14], ['health', 0, -16], ['grenades', 16, 0], ['slugs', -16, 0], ['bullets', 0, 16]]);
  it(3, [['w6', -9, -9], ['quad', 9, 9], ['armor', 9, -9], ['health', -9, 9], ['rockets', 0, -11], ['caza', 0, 11]]);
  it(4, [['w8', -6.6, -6.6], ['armor', 6.6, 6.6], ['health', 6.6, -6.6], ['health', -6.6, 6.6], ['slugs', 3.5, -7.5], ['shells', -3.5, 7.5]]);
  I('armorH', 0, Y[4] + 3.6, 0);   // la punta de la columna

  /* ---- apariciones: repartidas por todos los niveles (las del pozo no, ahí se cae) ---- */
  const sp = (k, list) => list.forEach(([x, z]) => spawns.push({ x, y: Y[k], z, yaw: face(x, z, 0, 0) }));
  sp(0, [[-30, -20], [-20, -30], [30, -22], [22, -30], [-30, 22], [-22, 30], [30, 20], [22, 22], [0, -14], [14, 0], [0, 14], [-14, 0], [-26, 8], [26, -8]]);
  sp(1, [[-23, -23], [23, 23], [23, -23], [-23, 23], [-10, -22], [10, 22], [22, 10], [-22, -10]]);
  sp(2, [[-17, -17], [17, 17], [17, -17], [-17, 17], [-8, 17], [8, -17]]);
  sp(3, [[-12, -12], [12, 12], [12, -12], [-12, 12]]);
  sp(4, [[-7.5, -4.5], [7.5, 4.5], [4.5, -7.5], [-4.5, 7.5]]);

  /* ---- luces: unos pocos pozos rojos y la luz celeste del pozo (la luna y la linterna hacen el resto) ---- */
  lights.push({ x: 0, y: 2.4, z: 0, c: 0x40e0ff, i: .9, d: 14 }, { x: 0, y: Y[1] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 }, { x: 0, y: Y[2] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 }, { x: 0, y: Y[3] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 },
    { x: 0, y: Y[4] + 5.4, z: 0, c: 0xffc040, i: .9, d: 12 },
    { x: -28, y: 2, z: -28, c: 0xff3a2a, i: .5, d: 22 }, { x: 28, y: 2, z: 28, c: 0xff3a2a, i: .5, d: 22 }, { x: 28, y: 2, z: -28, c: 0xff3a2a, i: .5, d: 22 }, { x: -28, y: 2, z: 28, c: 0xff3a2a, i: .5, d: 22 },
    { x: -20, y: Y[1] + 2.4, z: -20, c: 0xff3a2a, i: .45, d: 18 }, { x: 20, y: Y[1] + 2.4, z: 20, c: 0xff3a2a, i: .45, d: 18 }, { x: -14, y: Y[2] + 2.4, z: 14, c: 0xff3a2a, i: .45, d: 16 }, { x: 14, y: Y[3] + 2.4, z: -10, c: 0xff3a2a, i: .45, d: 14 });

  return finish({ id: 'pyramid', name: 'Pyramid', navMaxY: 24, bounds: { x0: -36, x1: 36, z0: -36, z1: 36 }, deco, modos: ['arena', 'gungame'],
    theme: { sky: 'halloween', tex: 'ruina', noche: true, skyDim: .95, fog: 0x1c0f30, fogD: .0065, amb: 0x5a4a96, ambI: .62, hemi: [0x7a68c0, 0x2a1438, .6], sun: true, sunC: 0xd8a0c0, sunI: .6, sunPos: [0, 60, 50], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.pyramid = buildPyramid;
