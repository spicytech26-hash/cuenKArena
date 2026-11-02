/* ---------- Pyramid — la pirámide de gravedad, de noche de Halloween ----------
   Inspirado en dm-pyramid de Unreal Tournament. Cinco niveles de piedra apilados (cada 4,8 m) que se achican hacia arriba: el de abajo es el
   más grande, así que si te caés de un borde aterrizás en el nivel de abajo. Pisos chicos para que el juego sea rápido.
   · Pozo central de 6x6 m que atraviesa TODOS los niveles, también el de abajo (queda abierto al vacío) y es una ZONA DE GRAVEDAD CERO
     (W.zerog, ver pmove en 04-fisica.js): al entrar flotás y te vas yendo despacio hacia abajo; Espacio sube, agacharse baja y W mirando arriba
     o abajo te lleva para ahí. Para salir en un nivel, te movés de costado por encima del borde del piso. Si te quedás sin subir, salís por
     abajo y te caés al vacío. No hay escaleras: el pozo es la única forma de cambiar de nivel (los bots también lo usan, ver 7-bots.js).
   · Nada de ítems en el pozo: armas, escudos y curación están en los pisos.
   · Los 4 pilares de las esquinas del pozo y la punta son sólidos (se choca y se pisa); las patas inclinadas son solo decoración.
   · Mapa de noche (theme.noche): linternas en las armas y tecla T. Ambiente sonoro propio (theme.ambiente = 'piramide'). */
function buildPyramid() {
  const { B, pads, teles, lava, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish } = mapKit();
  const deco = [];
  const Y = [0, 4.8, 9.6, 14.4, 19.2];          // altura del piso de cada nivel
  const S = [24, 19.5, 15, 10.5, 6];            // mitad del lado de cada nivel (las patas pasan justo por las esquinas)
  const H = 3;                                  // mitad del pozo central

  /* ---- niveles: cuerpo de ladrillo + piso de baldosa; del 1 al 4 son un anillo alrededor del pozo ---- */
  const slab = (x0, z0, x1, z1, y, th) => { add(x0, y - th, z0, x1, y - .15, z1, 'brick'); add(x0, y - .15, z0, x1, y, z1, 'tiles'); };
  for (let k = 0; k <= 4; k++) {                  // anillos alrededor del pozo, también el de abajo: el pozo queda abierto al vacío
    const s = S[k], y = Y[k];
    slab(-s, -s, s, -H, y, k ? 1.2 : 3); slab(-s, H, s, s, y, k ? 1.2 : 3); slab(-s, -H, -H, H, y, k ? 1.2 : 3); slab(H, -H, s, H, y, k ? 1.2 : 3);
  }
  // cordón bajito en el borde de cada nivel (solo se ve, se pisa)
  for (let k = 0; k <= 4; k++) {
    const s = S[k], y = Y[k], t = .35;
    add(-s, y, -s, s, y + t, -s + .3, 'concrete', { nc: 1 }); add(-s, y, s - .3, s, y + t, s, 'concrete', { nc: 1 });
    add(-s, y, -s + .3, -s + .3, y + t, s - .3, 'concrete', { nc: 1 }); add(s - .3, y, -s + .3, s, y + t, s - .3, 'concrete', { nc: 1 });
  }

  /* ---- pozo de gravedad cero: zona física (baja hasta debajo del nivel 0: ahí salís y te caés al vacío) + efectos ---- */
  const zerog = [{ min: [-H, -3.2, -H], max: [H, Y[4] + 6, H] }];
  for (let i = 0; i < 150; i++) {                                      // espiral de brillos suaves celestes (puntos con halo, no cubos)
    const a = i * .38, y = -.5 + i * .17;
    deco.push({ t: 'glow', x: Math.cos(a) * 1.7, y, z: Math.sin(a) * 1.7, c: 0x2a9ad0, s: .8 });
  }
  for (let y = -1; y < Y[4] + 4; y += 1.6) deco.push({ t: 'glow', x: 0, y, z: 0, c: 0x1f6f98, s: .9 });   // rayo central suave (no se toca)
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) add(sx > 0 ? H - .5 : -H, -3, sz > 0 ? H - .5 : -H, sx > 0 ? H : -H + .5, Y[4] + 4, sz > 0 ? H : -H + .5, 'tube');   // 4 pilares en las esquinas del pozo: sólidos
  for (let k = 1; k <= 4; k++) deco.push({ t: 'glow', x: 0, y: Y[k] + 1.2, z: 0, c: 0x2f9fd0 });

  /* ---- patas: cuatro vigas inclinadas desde las esquinas de abajo hasta la punta (solo se ven, así no hay por dónde trepar a la punta) ---- */
  const slope = (S[0] - S[4]) / Y[4];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let y = -3; y < 24.4; y += .5) {
      const c = S[0] - slope * y;   // la viga pasa justo por la esquina de cada nivel
      add(sx * (c - .9), y, sz * (c - .9), sx * (c + .9), y + .56, sz * (c + .9), 'metal', { nc: 1 });
    }
  }
  add(-1.8, 24.4, -1.8, 1.8, 25.2, 1.8, 'trim'); add(-1.1, 25.2, -1.1, 1.1, 26, 1.1, 'trim'); add(-.5, 26, -.5, .5, 26.7, .5, 'trim');   // la punta: sólida
  deco.push({ t: 'glow', x: 0, y: 27.1, z: 0, c: 0xffa040, s: 1.4 });

  /* ---- abajo: el agua oscura (el pozo da al vacío) y bruma baja ---- */
  lava.push({ min: [-500, -40, -500], max: [500, -14, 500], water: true, dps: 0 });
  for (const [x, z, w] of [[-34, -22, 5], [30, 28, 6], [-30, 32, 4], [36, -18, 4], [0, -40, 7], [-42, 4, 5]]) add(x, -15, z, x + w, -12.6, z + w * .8, 'rock', { nc: 1 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 34 + (i % 4) * 9, cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = 20 + (i % 3) * 8;
    deco.push({ t: 'bruma', soft: 1, x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 3, z1: cz + w / 3, y: -12 + (i % 4) * 1.8, o: .07, dir: i % 2 ? 1 : -1 });
  }
  add(-80, 45, -80, 80, 55, 80, 'clip');                                                       // techo: inalcanzable

  /* ---- faroles rojos colgando del borde de cada nivel: chiquitos y tenues, para que no molesten a la vista ---- */
  for (let k = 0; k <= 4; k++) {
    const s = S[k] + .3, y = Y[k] - 1.7, n = Math.max(2, Math.round(s * 2 / 5));
    for (let i = 0; i <= n; i++) {
      const q = -s + 2 * s * i / n;
      deco.push({ t: 'glow', x: q, y, z: -s, c: 0x9a2214, s: .7 }, { t: 'glow', x: q, y, z: s, c: 0x9a2214, s: .7 });
      if (i > 0 && i < n) deco.push({ t: 'glow', x: -s, y, z: q, c: 0x9a2214, s: .7 }, { t: 'glow', x: s, y, z: q, c: 0x9a2214, s: .7 });
    }
  }

  /* ---- cobertura: cajones y muretes en cada nivel (para pelear, no para encerrarse) ---- */
  const cajon = (x, y, z, s) => add(x - s * .7, y, z - s * .7, x + s * .7, y + s, z + s * .7, 'crate');
  const muro = (x0, z0, x1, z1, y) => { add(x0, y, z0, x1, y + 1.5, z1, 'concrete'); add(x0 - .06, y + 1.5, z0 - .06, x1 + .06, y + 1.62, z1 + .06, 'smooth'); };
  for (const [x, z] of [[-12, -17], [12, 17]]) muro(x - 2.5, z - .2, x + 2.5, z + .2, 0);
  for (const [x, z] of [[-17, 12], [17, -12]]) muro(x - .2, z - 2.5, x + .2, z + 2.5, 0);
  for (const [x, z] of [[-6, 16], [6, -16], [-16, -6], [16, 6], [-20, -20], [20, 20]]) cajon(x, 0, z, 1.4);
  for (const [x, z] of [[-10, -16], [10, 16], [-16, 10], [16, -10]]) cajon(x, Y[1], z, 1.3);
  for (const [x, z] of [[-6, -12], [6, 12], [-12, 6], [12, -6]]) cajon(x, Y[2], z, 1.3);
  for (const [x, z] of [[-4.5, -9], [4.5, 9]]) cajon(x, Y[3], z, 1.2);

  /* ---- ítems: todo en los pisos, en esquinas, laterales y cerca del pozo (ninguno flota en la gravedad cero) ---- */
  const it = (k, list) => list.forEach(([t, x, z]) => I(t, x, Y[k], z));
  it(0, [['w1', -14, 14], ['w2', -14, -14], ['w3', 14, 14], ['armor', 14, -14], ['armor', -21, 21], ['health', -20, 0], ['health', 20, 0], ['health', -10, -21], ['health', 10, 21],
    ['shells', -8, 5], ['bullets', 8, -5], ['rockets', 6, 8], ['grenades', -6, -8], ['slugs', 22, 16], ['caza', -22, -16]]);
  it(1, [['w4', -14, -14], ['w9', 14, 14], ['armor', 14, -14], ['health', -14, 14], ['health', 0, 15], ['shells', 0, -15], ['rockets', 12, 0], ['bullets', -12, 0], ['health', 7, -7]]);
  it(2, [['w5', -10, -10], ['armor', 10, -10], ['health', -10, 10], ['health', 10, 10], ['grenades', -9, -12], ['slugs', 9, 12], ['mega', 0, -11.5], ['bullets', 0, 11.5]]);
  it(3, [['w6', -7, -7], ['armor', 7, -7], ['health', -7, 7], ['quad', 7, 7], ['rockets', 0, -8], ['caza', 0, 8], ['health', -7, 0]]);
  it(4, [['w8', -3.9, -3.9], ['armor', 3.9, 3.9], ['health', 3.9, -3.9], ['health', -3.9, 3.9], ['armorH', 0, -4.5], ['slugs', -4.5, 0], ['shells', 4.5, 0]]);

  /* ---- apariciones: repartidas por todos los niveles ---- */
  const sp = (k, list) => list.forEach(([x, z]) => spawns.push({ x, y: Y[k], z, yaw: face(x, z, 0, 0) }));
  sp(0, [[-20, -18], [18, -20], [20, 18], [-18, 20], [-20, 6], [20, -6], [6, 20], [-6, -20], [-9, -9], [9, 9], [9, -9], [-9, 9]]);
  sp(1, [[-17, -17], [17, 17], [17, -17], [-17, 17], [-8, -16], [8, 16], [16, 8], [-16, -8]]);
  sp(2, [[-12, -12], [12, 12], [12, -12], [-12, 12], [-5, 12], [5, -12]]);
  sp(3, [[-8.5, -5], [8.5, 5], [5, -8.5], [-5, 8.5]]);
  sp(4, [[0, 4.5], [-4.5, 2], [4.5, -2], [2, -4.5]]);

  /* ---- luces: unos pocos pozos rojos y la luz celeste del pozo (la luna y la linterna hacen el resto) ---- */
  lights.push({ x: 0, y: 1.2, z: 0, c: 0x40e0ff, i: .9, d: 14 }, { x: 0, y: Y[1] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 }, { x: 0, y: Y[2] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 }, { x: 0, y: Y[3] + 2.4, z: 0, c: 0x40e0ff, i: .8, d: 14 },
    { x: -18, y: 2, z: -18, c: 0xff3a2a, i: .5, d: 20 }, { x: 18, y: 2, z: 18, c: 0xff3a2a, i: .5, d: 20 }, { x: 18, y: 2, z: -18, c: 0xff3a2a, i: .5, d: 20 }, { x: -18, y: 2, z: 18, c: 0xff3a2a, i: .5, d: 20 },
    { x: -13, y: Y[1] + 2.4, z: -13, c: 0xff3a2a, i: .45, d: 16 }, { x: 13, y: Y[1] + 2.4, z: 13, c: 0xff3a2a, i: .45, d: 16 }, { x: -9, y: Y[2] + 2.4, z: 9, c: 0xff3a2a, i: .45, d: 14 }, { x: 7, y: Y[3] + 2.4, z: -7, c: 0xff3a2a, i: .45, d: 12 });

  return finish({ id: 'pyramid', name: 'Pyramid', navMaxY: 24, zerog, bounds: { x0: -26, x1: 26, z0: -26, z1: 26 }, deco, modos: ['arena', 'gungame'],
    theme: { sky: 'halloween', tex: 'ruina', noche: true, ambiente: 'piramide', skyDim: .95, fog: 0x1c0f30, fogD: .0065, amb: 0x5a4a96, ambI: .62, hemi: [0x7a68c0, 0x2a1438, .6], sun: true, sunC: 0xd8a0c0, sunI: .6, sunPos: [0, 60, 50], shadowRes: 4096, shBias: -.0004, shNormal: .08 } });
}
MAPDEFS.pyramid = buildPyramid;
