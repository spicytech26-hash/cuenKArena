/* ---------- Pyramid — la pirámide de gravedad, noche de Halloween lovecraftiana ----------
   Inspirado en dm-pyramid de Unreal Tournament. Cinco niveles de piedra apilados (cada 4,8 m) que se achican hacia arriba: el de abajo es el
   más grande, así que si te caés de un borde aterrizás en el nivel de abajo. Pisos chicos para que el juego sea rápido.
   · Pozo central de 6x6 m que atraviesa TODOS los niveles, también el de abajo (queda abierto al vacío) y es una ZONA DE GRAVEDAD CERO
     (W.zerog, ver pmove en 04-fisica.js): al entrar flotás y te vas yendo despacio hacia abajo; Espacio sube, agacharse baja y W mirando arriba
     o abajo te lleva para ahí. Para salir en un nivel, te movés de costado por encima del borde del piso. Si te quedás sin subir, salís por
     abajo y te caés al vacío. No hay escaleras: el pozo es la única forma de cambiar de nivel (los bots también lo usan, ver 7-bots.js).
   · Nada de ítems en el pozo: armas, escudos y curación están en los pisos.
   · La punta y las 4 patas son sólidos (se choca y se pisa); las patas no cuentan para la navegación de los bots (nonav). Los obeliscos y los
     escombros también. El pozo está libre: nada adentro.
   · Cada nivel tiene su color (material y luces) y adorno lovecraftiano: obeliscos con ojos y un ojo en el vacío (los tentáculos se ven solo a lo lejos, en el cielo).
   · SIN linterna (no es theme.noche, eso es solo de Skatenight). Música y ambiente propios (theme.ambiente = 'piramide'). */
function buildPyramid() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  const Y = [0, 4.8, 9.6, 14.4, 19.2];          // altura del piso de cada nivel
  const S = [19, 16, 13, 9.5, 6];               // mitad del lado de cada nivel (las patas pasan justo por las esquinas)
  const F = [19 / 24, 16 / 19.5, 13 / 15, 9.5 / 10.5, 1];   // cuánto se achicó cada nivel respecto del diseño anterior: las posiciones de ítems, apariciones y cobertura se escalan con esto
  const H = 3;                                  // mitad del pozo central
  // cada nivel tiene su identidad: material del cuerpo y color de las luces
  const BODY = ['basalt', 'velvet', 'barnB', 'canyon', 'board'];   // lava, magenta, azul, naranja, verde
  const TOP = ['concrete', 'club', 'tower', 'wall', 'step'];
  const LCOL = [0x30ff90, 0xa040ff, 0xffa030, 0xff40c0, 0xb8ff30];
  let gs = 11; const rnd = () => { gs = (gs * 1664525 + 1013904223) >>> 0; return gs / 4294967296; };   // azar fijo: el mapa sale siempre igual

  /* ---- niveles: cuerpo de color + piso de baldosa; todos son un anillo alrededor del pozo (también el de abajo) ---- */
  const slab = (x0, z0, x1, z1, y, th, body, top) => { add(x0, y - th, z0, x1, y - .15, z1, body); add(x0, y - .15, z0, x1, y, z1, top); };
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], th = k ? 1.2 : 3, bd = BODY[k], tp = TOP[k];
    slab(-s, -s, s, -H, y, th, bd, tp); slab(-s, H, s, s, y, th, bd, tp); slab(-s, -H, -H, H, y, th, bd, tp); slab(H, -H, s, H, y, th, bd, tp);
  }
  // cordón del borde de cada nivel: roto, con tramos de distinto alto y huecos (solo se ve, se pisa)
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k];
    for (const side of [0, 1, 2, 3]) {
      for (let q = -s; q < s - .5;) {
        const len = .8 + rnd() * 2.2, e = Math.min(s, q + len), h = .12 + rnd() * .5;
        if (rnd() > .28) { const sg = side % 2 ? 1 : 0;
          if (side < 2) add(q, y, sg ? s - .3 : -s, e, y + h, sg ? s : -s + .3, 'concrete', { nc: 1 }); else add(sg ? s - .3 : -s, y, q, sg ? s : -s + .3, y + h, e, 'concrete', { nc: 1 }); }
        q = e + (rnd() < .3 ? .6 : 0);
      }
    }
  }

  /* ---- pozo de gravedad cero: zona física (baja hasta debajo del nivel 0: ahí salís y te caés al vacío) + efectos casi transparentes ---- */
  const zerog = [{ min: [-H, -3.2, -H], max: [H, Y[4] + 6, H] }];
  for (let i = 0; i < 90; i++) {                                       // espiral de brillos muy tenues (puntos con halo)
    const a = i * .55, y = -.5 + i * .27;
    deco.push({ t: 'glow', x: Math.cos(a) * 1.7, y, z: Math.sin(a) * 1.7, c: 0x0b3548, s: .55 });
  }

  /* ---- patas (sólidas, fuera de la navegación de los bots) y la punta: sólida ---- */
  const slope = (S[0] - S[4]) / Y[4];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let y = -3; y < 24.4; y += .5) {
      const c = S[0] - slope * y;   // la viga pasa justo por la esquina de cada nivel
      add(sx * (c - .9), y, sz * (c - .9), sx * (c + .9), y + .56, sz * (c + .9), 'metal', { nonav: 1 });
    }
  }
  add(-1.8, 24.4, -1.8, 1.8, 25.2, 1.8, 'trim'); add(-1.1, 25.2, -1.1, 1.1, 26, 1.1, 'trim'); add(-.5, 26, -.5, .5, 26.7, .5, 'trim');
  deco.push({ t: 'glow', x: 0, y: 27.3, z: 0, c: 0xc060ff, s: 1.6 });

  /* ---- lovecraft: obeliscos con ojo en los primeros tres niveles y un ojo gigante en el vacío ---- */
  const obelisco = (k, x, z, h) => {
    const y = Y[k], c = LCOL[k];
    add(x - .7, y, z - .7, x + .7, y + .5, z + .7, 'basalt'); add(x - .45, y + .5, z - .45, x + .45, y + h * .72, z + .45, 'basalt'); add(x - .25, y + h * .72, z - .25, x + .25, y + h, z + .25, 'basalt');
    deco.push({ t: 'glow', x, y: y + h + .35, z, c, s: 1.3 }, { t: 'glow', x, y: y + h * .45, z, c, s: .7 });
  };
  for (const k of [0, 1, 2]) { const o = S[k] - (k ? 1.8 : 2); for (const [x, z] of [[o, 0], [-o, 0], [0, o], [0, -o]]) obelisco(k, x, z, 3.6); }
  deco.push({ t: 'glow', x: 0, y: -9, z: 0, c: 0x6a1a8a, s: 18 }, { t: 'glow', x: 0, y: -9.5, z: 0, c: 0xb040ff, s: 7 }, { t: 'glow', x: 0, y: -9.8, z: 0, c: 0xfff0c0, s: 2 });   // el ojo
  lava.push({ min: [-500, -40, -500], max: [500, -14, 500], water: true, dps: 0 });
  for (const [x, z, w] of [[-34, -22, 5], [30, 28, 6], [-30, 32, 4], [36, -18, 4], [0, -44, 7], [-44, 4, 5]]) add(x, -15, z, x + w, -12.6, z + w * .8, 'rock', { nc: 1 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 30 + (i % 4) * 9, cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = 20 + (i % 3) * 8;
    deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 3, z1: cz + w / 3, y: -12 + (i % 4) * 1.8, o: .09, dir: i % 2 ? 1 : -1 });
  }
  add(-80, 45, -80, 80, 55, 80, 'clip');                                                       // techo: inalcanzable

  /* ---- cobertura: cajones y muretes en cada nivel (para pelear, no para encerrarse) ---- */
  const cajon = (x, y, z, s) => add(x - s * .7, y, z - s * .7, x + s * .7, y + s, z + s * .7, 'crate');
  const muro = (x0, z0, x1, z1, y) => { add(x0, y, z0, x1, y + 1.5, z1, 'concrete'); add(x0 - .06, y + 1.5, z0 - .06, x1 + .06, y + 1.62, z1 + .06, 'smooth'); };
  for (const [x, z] of [[-12, -17], [12, 17]]) muro(x * F[0] - 2.5, z * F[0] - .2, x * F[0] + 2.5, z * F[0] + .2, 0);
  for (const [x, z] of [[-17, 12], [17, -12]]) muro(x * F[0] - .2, z * F[0] - 2.5, x * F[0] + .2, z * F[0] + 2.5, 0);
  for (const [x, z] of [[-6, 16], [6, -16], [-16, -6], [16, 6], [-20, -20], [20, 20]]) cajon(x * F[0], 0, z * F[0], 1.4);
  for (const [x, z] of [[-10, -16], [10, 16], [-16, 10], [16, -10]]) cajon(x * F[1], Y[1], z * F[1], 1.3);
  for (const [x, z] of [[-6, -12], [6, 12], [-12, 6], [12, -6]]) cajon(x * F[2], Y[2], z * F[2], 1.3);
  for (const [x, z] of [[-4.5, -9], [4.5, 9]]) cajon(x * F[3], Y[3], z * F[3], 1.2);

  /* ---- ítems: todo en los pisos, en esquinas, laterales y cerca del pozo (ninguno flota en la gravedad cero) ---- */
  const it = (k, list) => list.forEach(([t, x, z]) => I(t, x * F[k], Y[k], z * F[k]));
  it(0, [['w1', -14, 14], ['w2', -14, -14], ['w3', 14, 14], ['armor', 14, -14], ['armor', -21, 21], ['health', -19, 0], ['health', 19, 0], ['health', -10, -21], ['health', 10, 21],
    ['shells', -8, 5], ['bullets', 8, -5], ['rockets', 6, 8], ['grenades', -6, -8], ['slugs', 22, 16], ['caza', -22, -16]]);
  it(1, [['w4', -14, -14], ['w9', 14, 14], ['armor', 14, -14], ['health', -14, 14], ['health', 0, 14.5], ['shells', 0, -14.5], ['rockets', 12, 0], ['bullets', -12, 0], ['health', 7, -7]]);
  it(2, [['w5', -10, -10], ['armor', 10, -10], ['health', -10, 10], ['health', 10, 10], ['grenades', -9, -12], ['slugs', 9, 12], ['mega', 0, -10.5], ['bullets', 0, 10.5]]);
  it(3, [['w6', -7, -7], ['armor', 7, -7], ['health', -7, 7], ['quad', 7, 7], ['rockets', 0, -8], ['caza', 0, 8], ['health', -7, 0]]);
  it(4, [['w8', -3.9, -3.9], ['armor', 3.9, 3.9], ['health', 3.9, -3.9], ['health', -3.9, 3.9], ['armorH', 0, -4.5], ['slugs', -4.5, 0], ['shells', 4.5, 0]]);

  /* ---- apariciones: repartidas por todos los niveles ---- */
  const sp = (k, list) => list.forEach(([x, z]) => { x *= F[k]; z *= F[k]; spawns.push({ x, y: Y[k], z, yaw: face(x, z, 0, 0) }); });
  sp(0, [[-20, -18], [18, -20], [20, 18], [-18, 20], [-20, 6], [20, -6], [6, 20], [-6, -20], [-9, -9], [9, 9], [9, -9], [-9, 9]]);
  sp(1, [[-12, -17], [12, 17], [17, -12], [-17, 12], [-8, -16], [8, 16], [16, 8], [-16, -8]]);
  sp(2, [[-14, -3], [14, 3], [3, -14], [-3, 14], [-5, 12], [5, -12]]);
  sp(3, [[-8.5, -5], [8.5, 5], [5, -8.5], [-5, 8.5]]);
  sp(4, [[0, 4.5], [-4.5, 2], [4.5, -2], [2, -4.5]]);

  /* ---- deterioro: parches de roca, tierra y musgo sobre las caras de cada nivel, varillas y cadenas colgando, enredaderas, escombros y bruma baja ---- */
  const PARCHE = ['rock', 'soil', 'grass', 'concrete', 'metal', 'rock'];
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], th = k ? 1.2 : 3, n = Math.round(s * 1.4);
    for (let i = 0; i < n; i++) for (const side of [0, 1, 2, 3]) {
      const q = -s + rnd() * (s * 2 - 3), w = 1 + rnd() * 2.4, h = th * (.35 + rnd() * .6), y0 = y - .15 - h - rnd() * (th - h - .15), m = PARCHE[Math.floor(rnd() * PARCHE.length)];
      if (rnd() > .45) continue;
      if (side < 2) add(q, y0, side ? s : -s - .05, q + w, y0 + h, side ? s + .05 : -s, m, { nc: 1 }); else add(side === 3 ? s : -s - .05, y0, q, side === 3 ? s + .05 : -s, y0 + h, q + w, m, { nc: 1 });
    }
    for (let i = 0; i < 10; i++) {                                     // varillas de hierro que sobresalen del borde roto
      const side = i % 4, q = -s + 1 + rnd() * (s * 2 - 2), yy = y - .3 - rnd() * (th - .5), L = .7 + rnd() * 1.1;
      if (side < 2) add(q, yy, side ? s : -s - L, q + .07, yy + .07, side ? s + L : -s, 'metal', { nc: 1 }); else add(side === 3 ? s : -s - L, yy, q, side === 3 ? s + L : -s, yy + .07, q + .07, 'metal', { nc: 1 });
    }
    for (let i = 0; i < 7; i++) {                                      // cadenas que cuelgan bajo el borde
      const side = i % 4, q = -s + 2 + rnd() * (s * 2 - 4), n2 = 3 + Math.floor(rnd() * 4), yy = y - th;
      const cx = side < 2 ? q : (side === 3 ? s + .15 : -s - .15), cz = side < 2 ? (side ? s + .15 : -s - .15) : q;
      for (let j = 0; j < n2; j++) add(cx - .05 + (j % 2) * .04, yy - (j + 1) * .42, cz - .05 + (j % 2) * .04, cx + .05 + (j % 2) * .04, yy - j * .42, cz + .05 + (j % 2) * .04, 'metal', { nc: 1 });
    }
    for (let q = -s + 1; q < s; q += 2.2 + rnd() * 1.4) {              // enredaderas colgando de los cuatro lados
      const len = 1.2 + rnd() * 2.4, yv = y - .3 - rnd() * .5;
      deco.push({ t: 'enredadera', x: q, y: yv, z: -s - .06, len, ry: Math.PI }, { t: 'enredadera', x: q, y: yv, z: s + .06, len: len * .9, ry: 0 },
        { t: 'enredadera', x: -s - .06, y: yv, z: q, len: len * .8, ry: -Math.PI / 2 }, { t: 'enredadera', x: s + .06, y: yv, z: q, len, ry: Math.PI / 2 });
    }
    for (const [x0, z0, x1, z1] of [[-s, -s, s, -H], [-s, H, s, s], [-s, -H, -H, H], [H, -H, s, H]]) deco.push({ t: 'bruma', soft: 1, x0, x1, z0, z1, y: y + .35, o: .1, dir: k % 2 ? 1 : -1 });   // bruma pegada al piso
  }
  for (let [k, x, z] of [[0, 21, -21], [0, -21, -21], [0, 22.5, 6], [0, -22.5, -6], [1, 16.5, -16.5], [1, -16.5, -16.5], [2, 12.5, -12.5], [2, -12.5, 12.5]]) {   // montones de escombros (sólidos, sirven de cobertura)
    const y = Y[k]; x *= F[k]; z *= F[k];
    add(x - .9, y, z - .7, x + .9, y + .7, z + .7, 'rock'); add(x - .5, y + .7, z - .4, x + .5, y + 1.2, z + .4, 'rock'); add(x + .7, y, z - 1.4, x + 1.5, y + .4, z - .7, 'rock'); add(x - 1.5, y, z + .3, x - .9, y + .35, z + 1, 'rock');
  }

  /* ---- decals: grietas, musgo, sangre y charcos sobre los pisos (solo donde el piso es plano) ---- */
  const NOPISO = ['grate', 'roof', 'rail', 'fence', 'metal', 'tube'];
  const flatTop = (x, z, r) => {
    let t0 = null;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      let top = -99, tb = null;
      for (const b of B) { if (b.nc || b.mat === 'clip' || !(b.min[0] < x + dx && b.max[0] > x + dx && b.min[2] < z + dz && b.max[2] > z + dz)) continue; if (b.max[1] > top) { top = b.max[1]; tb = b; } }
      if (!tb || tb.ramp || tb.mover || NOPISO.includes(tb.mat) || tb.mat === 'basalt') return null;
      if (t0 == null) t0 = top; else if (Math.abs(top - t0) > .03) return null;
    }
    return t0;
  };
  const scatter = (ks, count, smin, smax) => {
    for (let n = 0, tries = 0; n < count && tries < count * 14; tries++) {
      const x = -S[0] + rnd() * S[0] * 2, z = -S[0] + rnd() * S[0] * 2, w = smin + rnd() * (smax - smin), t = flatTop(x, z, w * .5);
      if (t == null) continue;
      deco.push({ t: 'decal', x, y: t + .025, z, w, h: w, k: ks[Math.floor(rnd() * ks.length)], rx: -Math.PI / 2, ry: rnd() * 6.28, rz: 0 }); n++;
    }
  };
  scatter([0, 1, 2, 3, 4, 5], 110, 2.5, 5.5); scatter([14, 15, 16, 17], 46, 1.8, 3.6); scatter([26, 27, 28, 29], 34, 2.2, 4); scatter([30, 31], 14, 2, 3.6); scatter([6, 7, 8, 9], 26, 2, 3.8); scatter([22, 23, 24, 25], 40, 1.5, 2.6);

  /* ---- luces de color: cada nivel con su tono (el pozo, apenas un resplandor celeste) ---- */
  for (let k = 0; k <= 4; k++) { const o = S[k] * .55; lights.push({ x: o, y: Y[k] + 2.6, z: -o, c: LCOL[k], i: .6, d: 18 }, { x: -o, y: Y[k] + 2.6, z: o, c: LCOL[k], i: .6, d: 18 }); }
  lights.push({ x: 0, y: 4, z: 0, c: 0x40e0ff, i: .3, d: 12 }, { x: 0, y: 14, z: 0, c: 0x40e0ff, i: .3, d: 12 }, { x: 0, y: -8, z: 0, c: 0xb040ff, i: .9, d: 18 });

  return finish({ id: 'pyramid', name: 'Pyramid', navMaxY: 24, zerog, bounds: { x0: -21, x1: 21, z0: -21, z1: 21 }, deco, modos: ['arena', 'gungame'],
    theme: { sky: 'halloween', tex: 'ruina', ambiente: 'piramide', fog: 0x0c0818, fogD: .006, amb: 0x5a4a90, ambI: .48, hemi: [0x6a58a8, 0x3a2a58, .52], sun: true, sunC: 0x9a88c0, sunI: .4, sunPos: [0, 60, 50], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.pyramid = buildPyramid;
