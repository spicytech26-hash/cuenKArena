/* =================== EL MERCADER DEL UMBRAL EN 3D ===================
   Cuando te toca carta, el mercader se materializa en el tercio derecho de la pantalla, en una
   escena aparte que se dibuja encima del juego (igual que la del arma). Está hecho con primitivas
   por código, sin archivos: manto, capucha, ojos, barba de tentáculos, manos, farol y neblina.
   El texto de las cartas NO va acá: va en HTML por encima (`14b-cartas.js`), para que se lea nítido.

   Nada de esto toca el juego: no pausa, no agarra el mouse ni los clics, no mueve la cámara y no
   manda nada por la red. Se apaga solo en calidad Liviana o si lo desactivás en Ajustes → Video.
   ==================================================================== */

// Todos los números en un solo lugar, para poder manotearlos sin buscar.
const MERC = {
  ENTRA: .7,          // cuánto tarda en materializarse
  SALE: .5,           // cuánto tarda en desvanecerse
  CARTA_PASO: .16,    // retraso entre carta y carta al desplegarlas
  RESALTA: .18,       // cuánto se resalta la carta elegida antes de volar al HUD
  FRASE: 5.5,         // cada cuánto cambia de frase
  X: 2.3, Y: -1.95, Z: -7,  // dónde se para, en la escena de la neblina
  ALTO: 4.1,          // alto del mercader en unidades de esa escena
  OPACO: .93,         // opacidad cuando está quieto (deja ver el juego atrás)
  BOB: .055,          // cuánto flota el cuerpo
  TENT: 7,            // tentáculos de la barba
  NIEBLA: 5           // planos de neblina
};

const MD = { sc: null, cam: null, g: null, mats: [], ojos: [], tent: [], farol: null, luz: null,
             niebla: [], t: 0, on: false, listo: false, geos: [] };

// ¿se puede mostrar el mercader? (en Liviana y con el ajuste apagado, no)
const mercVa = () => S.merc !== false && !!S.q;

function mercTexNiebla() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(90,190,140,.5)'); gr.addColorStop(.45, 'rgba(40,110,80,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
// ayuda: material que se va a desvanecer todo junto
function mMat(opts, basico) {
  const m = basico ? new THREE.MeshBasicMaterial(opts) : new THREE.MeshLambertMaterial(opts);
  m.transparent = true; m.depthWrite = false; MD.mats.push(m); return m;
}
function mGeo(g) { MD.geos.push(g); return g; }

function mercBuild() {
  if (MD.listo) return;
  MD.sc = new THREE.Scene();
  MD.cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 60);
  MD.sc.add(new THREE.HemisphereLight(0x4ea37c, 0x0a1412, 1.35));
  const g = new THREE.Group(); g.position.set(MERC.X, MERC.Y, MERC.Z);
  const H = MERC.ALTO;

  const manto = mMat({ color: 0x1f3a2f }), piel = mMat({ color: 0x0c1714 }),
        borde = mMat({ color: 0x47735f }), verde = mMat({ color: 0x8dff3a }, true),
        oro = mMat({ color: 0xffc24a }, true);

  // manto: cono ancho abajo, y una capucha arriba
  const cuerpo = new THREE.Mesh(mGeo(new THREE.ConeGeometry(H * .34, H * .78, 9)), manto);
  cuerpo.position.y = H * .39; g.add(cuerpo);
  const capucha = new THREE.Mesh(mGeo(new THREE.ConeGeometry(H * .19, H * .3, 9)), manto);
  capucha.position.y = H * .86; g.add(capucha);
  const faja = new THREE.Mesh(mGeo(new THREE.TorusGeometry(H * .2, H * .018, 5, 12)), borde);
  faja.rotation.x = Math.PI / 2; faja.position.y = H * .5; g.add(faja);

  // cabeza oscura metida en la capucha
  const cabeza = new THREE.Mesh(mGeo(new THREE.SphereGeometry(H * .135, 10, 8)), piel);
  cabeza.position.set(0, H * .76, H * .04); g.add(cabeza);

  // seis ojos verdes: dos grandes, cuatro chicos
  const ojoG = mGeo(new THREE.SphereGeometry(H * .022, 6, 5));
  [[-.055, .785, .13], [.055, .785, .13], [0, .815, .12], [-.085, .745, .11], [.085, .745, .11], [0, .745, .135]]
    .forEach(([x, y, z], i) => {
      const o = new THREE.Mesh(ojoG, verde);
      o.position.set(x * H, y * H, z * H); o.scale.setScalar(i < 2 ? 1.5 : i === 2 ? 1 : .8);
      g.add(o); MD.ojos.push(o);
    });

  // barba de tentáculos: cada uno es una cadena de tres tramos que se mecen
  const tGeo = mGeo(new THREE.CylinderGeometry(H * .016, H * .01, H * .11, 5));
  for (let i = 0; i < MERC.TENT; i++) {
    const base = new THREE.Group();
    base.position.set((i / (MERC.TENT - 1) - .5) * H * .19, H * .7, H * .1);
    let padre = base;
    const tramos = [];
    for (let k = 0; k < 3; k++) {
      const n = new THREE.Group(); n.position.y = k ? -H * .105 : 0;
      const m = new THREE.Mesh(tGeo, k ? borde : piel); m.position.y = -H * .055;
      n.add(m); padre.add(n); padre = n; tramos.push(n);
    }
    g.add(base); MD.tent.push({ tramos, f: .6 + i * .17 });
  }

  // manos y mostrador
  const manoG = mGeo(new THREE.BoxGeometry(H * .07, H * .05, H * .09));
  [-1, 1].forEach(s => { const m = new THREE.Mesh(manoG, borde); m.position.set(s * H * .21, H * .41, H * .16); m.rotation.z = -s * .35; g.add(m); });
  const mostrador = new THREE.Mesh(mGeo(new THREE.BoxGeometry(H * .72, H * .05, H * .22)), borde);
  mostrador.position.set(0, H * .33, H * .2); g.add(mostrador);

  // farol: cajita dorada colgando a la derecha, con su luz que titila
  MD.farol = new THREE.Mesh(mGeo(new THREE.BoxGeometry(H * .055, H * .08, H * .055)), oro);
  MD.farol.position.set(H * .3, H * .46, H * .18); g.add(MD.farol);
  MD.luz = new THREE.PointLight(0xffb347, 1.6, H * 1.5, 2);
  MD.luz.position.copy(MD.farol.position); g.add(MD.luz);

  // neblina: unos pocos planos sueltos que giran despacio
  const nTex = mercTexNiebla(); MD.geos.push(nTex);
  const nGeo = mGeo(new THREE.PlaneGeometry(H * .95, H * .95));
  const nMat = mMat({ map: nTex, blending: THREE.AdditiveBlending, depthTest: false }, true);
  for (let i = 0; i < MERC.NIEBLA; i++) {
    const p = new THREE.Mesh(nGeo, nMat);
    p.position.set((Math.random() - .5) * H * .5, H * (.15 + Math.random() * .6), -H * .1 + Math.random() * H * .3);
    p.rotation.z = Math.random() * 6.28; p.renderOrder = -1;
    g.add(p); MD.niebla.push({ p, v: (Math.random() - .5) * .4, s: .8 + Math.random() * .6 });
  }

  MD.sc.add(g); MD.g = g; MD.listo = true;
}

function mercFree() {
  if (!MD.listo) return;
  MD.geos.forEach(o => o.dispose && o.dispose());
  MD.mats.forEach(m => m.dispose());
  MD.sc = MD.cam = MD.g = MD.farol = MD.luz = null;
  MD.mats = []; MD.ojos = []; MD.tent = []; MD.niebla = []; MD.geos = [];
  MD.listo = false;
}

function mercOpen() { if (!mercVa()) return; mercBuild(); MD.on = true; MD.t = 0; }
function mercClose() { MD.on = false; }

// se llama una vez por cuadro desde `updCards`
function updMerc(dt) {
  if (!MD.listo) return;
  const quieto = !!S.mred;   // "reducir movimiento": sin flotar, sin mecerse, sin titilar
  if (MD.on) MD.t = Math.min(1, MD.t + dt / MERC.ENTRA);
  else MD.t -= dt / MERC.SALE;
  if (MD.t <= 0) { MD.t = 0; mercFree(); return; }
  const k = MD.t < 1 ? 1 - Math.pow(1 - MD.t, 3) : 1, T = G.time;
  const a = MERC.OPACO * k;
  for (const m of MD.mats) m.opacity = m.blending === THREE.AdditiveBlending ? a * (quieto ? .35 : .55) : a;
  MD.g.position.y = MERC.Y - (1 - k) * MERC.ALTO * .35 + (quieto ? 0 : Math.sin(T * 1.1) * MERC.BOB);
  MD.g.rotation.y = -.22 + (1 - k) * .5 + (quieto ? 0 : Math.sin(T * .6) * .05);
  MD.g.scale.setScalar(.88 + k * .12);
  // ojos: brillan y de vez en cuando parpadean todos juntos
  const parp = !quieto && (T % 4.3) < .13 ? .12 : 1;
  MD.ojos.forEach((o, i) => { const p = quieto ? 1 : .85 + Math.sin(T * 2.4 + i) * .15; o.scale.y = (i < 2 ? 1.5 : i === 2 ? 1 : .8) * p * parp; });
  // tentáculos de la barba
  if (!quieto) for (let i = 0; i < MD.tent.length; i++) {
    const t = MD.tent[i];
    for (let k2 = 0; k2 < t.tramos.length; k2++) {
      const s = Math.sin(T * t.f + k2 * .8 + i) * .12 * (k2 + 1);
      t.tramos[k2].rotation.z = s; t.tramos[k2].rotation.x = Math.cos(T * t.f * .7 + i) * .07 * (k2 + 1);
    }
  }
  // farol
  if (MD.luz) MD.luz.intensity = (quieto ? 1.5 : 1.2 + Math.abs(Math.sin(T * 7.3)) * .7 + (Math.random() < .04 ? -.6 : 0)) * k;
  // neblina
  if (!quieto) for (const n of MD.niebla) { n.p.rotation.z += n.v * dt; n.p.scale.setScalar(n.s * (1 + Math.sin(T * .8 + n.s) * .08)); }
}

// se dibuja al final del cuadro, encima de todo
function drawMerc() {
  if (!MD.listo || MD.t <= 0) return;
  if (MD.cam.aspect !== innerWidth / innerHeight) { MD.cam.aspect = innerWidth / innerHeight; MD.cam.updateProjectionMatrix(); }
  renderer.clearDepth();
  renderer.render(MD.sc, MD.cam);
}
