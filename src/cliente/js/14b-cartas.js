/* =================== CARTAS DE MEJORA (estilo roguelike) ===================
   A las 3, 7 y 10 bajas el servidor manda 3 cartas (`cof`) y el jugador elige una con 1-2-3
   (o con un clic, cuando el mouse está libre). Mientras elige puede seguir jugando: el cartel
   no traba el movimiento ni la mira, y si deja pasar los 12 s se queda con la primera.
   Las que ya tiene quedan de muestra abajo a la izquierda. El servidor es el que decide todo. */
const CU = { open: false, list: [], t: 0, max: 0, n: 1, of: 3 };
const BURN = new Map();       // id del jugador → segundos que le queda de fuego (carta Toque ígneo)
let burnT = 0;

// Los íconos se guardan como caminos sueltos (`d`) porque se dibujan en dos lados: en SVG para el mazo
// del HUD y en un canvas para la textura de las cartas en 3D.
const disco = (cx, cy, R) => 'M' + (cx - R) + ' ' + cy + 'a' + R + ' ' + R + ' 0 1 0 ' + (2 * R) + ' 0a' + R + ' ' + R + ' 0 1 0 ' + (-2 * R) + ' 0Z';
const anillo = (cx, cy, R, r) => disco(cx, cy, R) + disco(cx, cy, r);
const CARD_ICO = {
  gota:     [['M12 2c0 0-6.5 7.8-6.5 12A6.5 6.5 0 0 0 18.5 14C18.5 9.8 12 2 12 2z', 1]],
  cohete:   [['M12 1.5c2.6 2.4 4 5.6 4 9.2v5.1l-2 2.2h-4l-2-2.2v-5.1c0-3.6 1.4-6.8 4-9.2z', 1],
             ['M6 12.5 3.2 17.6 7 15.8zm12 0 2.8 5.1L17 15.8z', 1], ['M10.4 20.4h3.2L12 23z', 1]],
  bomba:    [[disco(11, 14, 7), 1], ['M15.2 6.3 17 8.1l1.6-1.6 1.6 1.6L22 6.5 19.9 4.4 18.3 6 16.9 4.6z', 1]],
  llama:    [['M12 1.5c3.2 4.3 5.2 6.6 5.2 10A5.2 5.2 0 0 1 6.8 11.5c0-3.4 2-5.7 5.2-10z', 1],
             ['M12 11.6c1.1 1.7 2.1 2.7 2.1 4.1a2.1 2.1 0 0 1-4.2 0c0-1.4 1-2.4 2.1-4.1z', .55]],
  colmillo: [['M5.5 2.5h13l-2.2 7.2L12 22 8 9.7z', 1]],
  escudo:   [['M12 1.8 20.5 5v6.2c0 5.2-3.5 9.4-8.5 11.4-5-2-8.5-6.2-8.5-11.4V5z', 1]],
  moneda:   [[anillo(12, 12, 9.4, 7.4), 1], [anillo(12, 12, 4.4, 2.4), 1],
             ['M6.4 5 9 7.6 7.6 9zm11.2 0L15 7.6 16.4 9zM6.4 19 9 16.4 7.6 15zm11.2 0L15 16.4 16.4 15z', 1]],
  placa:    [['M12 1.6 21 7l-9 5-9-5z', 1], ['M12 12.4 21 17.6l-9 4.8-9-4.8z', .6]],
  corazon:  [['M12 21.6S3.6 16.2 3.6 10.6A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.4 3.6c0 5.6-8.4 11-8.4 11z', 1]]
};
const cardIcon = ic => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" fill-rule="evenodd">' +
  (CARD_ICO[ic] || []).map(([d, op]) => '<path d="' + d + '"' + (op < 1 ? ' opacity="' + op + '"' : '') + '/>').join('') + '</svg>';
const cardsOpen = () => CU.open;
function resetCards() { me.cards = []; me.kills = 0; CU.list = []; closeCards(); BURN.clear(); renderMyCards(); }

/* ---- la mano en 3D: el robot del jugador saca las cartas y las sostiene ----
   Va en la escena del arma (`wScene`), con la misma mano robótica y los mismos materiales que las
   manos de primera persona (`vHand`, `vMkArm`, `mGlove`), así que se ve igual que el resto del
   personaje y queda bien en perspectiva. No toca el arma ni la cámara: se sigue disparando igual.
   Si estás muerto o en tercera persona (no se dibuja esa escena), se cae a las cartas planas del HUD. */
const ROM = ['I', 'II', 'III'];
const CD = { g: null, arm: null, cards: [], t: 0, out: 0, sel: -1, tex: [] };
const CD_ANCLA = new THREE.Vector3(.40, -.52, .1);   // de dónde sale el antebrazo (abajo a la derecha)
const CD_POS = new THREE.Vector3(.15, -.14, -.34), CD_BAJO = new THREE.Vector3(.2, -.48, -.32);

/* ---- textura de cada carta: papel viejo dibujado en un canvas ---- */
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hexA = (h, a) => { const [r, g, b] = hexRGB(h); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
const mezcla = (h1, h2, k) => { const a = hexRGB(h1), b = hexRGB(h2); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')'; };
function cortar(g, txt, maxW) {
  const ps = txt.split(' '), l = []; let cur = '';
  for (const w of ps) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { l.push(cur); cur = w; } else cur = t; }
  if (cur) l.push(cur);
  return l;
}
function cardCanvas(id, i) {
  const W = 256, H = 358, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), card = C.CARD_BY[id];
  if (!card) return null;
  g.fillStyle = '#e2d1aa'; g.fillRect(0, 0, W, H);
  const mancha = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  mancha(W * .22, H * .16, 155, 'rgba(120,94,52,.32)');
  mancha(W * .85, H * .8, 165, 'rgba(96,70,36,.3)');
  mancha(W * .62, H * .46, 125, 'rgba(146,118,70,.18)');
  g.fillStyle = 'rgba(84,64,34,.15)';
  for (let k = 0; k < 110; k++) { const x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.arc(x, y, Math.random() * 1.7 + .4, 0, 6.283); g.fill(); }
  g.strokeStyle = '#6d5733'; g.lineWidth = 5; g.strokeRect(2.5, 2.5, W - 5, H - 5);
  g.strokeStyle = 'rgba(74,56,28,.5)'; g.lineWidth = 2; g.strokeRect(13, 13, W - 26, H - 26);
  g.strokeStyle = 'rgba(74,56,28,.2)'; g.lineWidth = 1.5; g.strokeRect(19, 19, W - 38, H - 38);
  // numeral estampado, torcido como un sello
  g.save(); g.translate(36, 44); g.rotate(-.13);
  g.strokeStyle = 'rgba(122,35,24,.6)'; g.lineWidth = 2.5; g.strokeRect(-15, -17, 30, 34);
  g.fillStyle = '#7a2318'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 0, 1);
  g.restore();
  // sigilo con el color de la carta
  const cx = W / 2, cy = 132, R = 52;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, hexA(card.c, .38)); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(60,45,22,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.stroke();
  g.strokeStyle = 'rgba(60,45,22,.16)'; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, R + 7, 0, 6.283); g.stroke();
  g.save(); g.translate(cx - 31, cy - 31); g.scale(62 / 24, 62 / 24); g.fillStyle = mezcla(card.c, '#2b1d10', .42);
  for (const [d, op] of (CARD_ICO[card.ic] || [])) { g.globalAlpha = op; g.fill(new Path2D(d), 'evenodd'); }
  g.globalAlpha = 1; g.restore();
  // nombre y descripción
  g.textAlign = 'center'; g.fillStyle = '#3a2714'; g.font = '23px Georgia, serif';
  try { g.letterSpacing = '2px'; } catch (e) { }
  let y = 228;
  const nl = cortar(g, card.name.toUpperCase(), W - 46);
  for (const ln of nl) { g.fillText(ln, cx, y); y += 27; }
  try { g.letterSpacing = '0px'; } catch (e) { }
  g.strokeStyle = 'rgba(74,56,28,.45)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(34, y - 12); g.lineTo(W - 34, y - 12); g.stroke();
  g.fillStyle = '#51391f'; g.font = 'italic 16px Georgia, serif'; y += 12;
  for (const ln of cortar(g, card.desc, W - 52)) { g.fillText(ln, cx, y); y += 20; }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
/* ---- armado de la mano (una sola vez) ---- */
function cdInit() {
  if (CD.g) return;
  const g = new THREE.Group(); g.visible = false;
  const mano = vHand(mGlove, .03); mano.rotation.set(0, Math.PI / 2, .12); mano.position.set(0, -.012, 0);
  g.add(mano);
  for (let i = 0; i < 3; i++) {
    const pv = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.132, .185), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(0, .082, 0); m.renderOrder = 4;
    pv.add(m); pv.rotation.set(-.05, 0, (i - 1) * .2); pv.position.set((i - 1) * .098, .004 - Math.abs(i - 1) * .010, i * .005);
    g.add(pv); CD.cards.push({ pv, m });
  }
  CD.arm = vMkArm(); CD.arm.visible = false;
  wScene.add(g, CD.arm);
  CD.g = g;
}
function cdTexturas() {
  CD.tex.forEach(t => t.dispose()); CD.tex = [];
  CD.cards.forEach((c, i) => {
    const id = CU.list[i];
    c.pv.visible = !!id;
    if (!id) return;
    const t = cardCanvas(id, i);
    if (!t) { c.pv.visible = false; return; }
    CD.tex.push(t);
    c.m.material.map = t; c.m.material.opacity = 1; c.m.material.needsUpdate = true;
    c.m.scale.setScalar(1); c.m.position.set(0, .082, 0);
  });
}
// ¿se puede mostrar la mano en 3D? (la escena del arma solo se dibuja estando vivo y en primera persona)
const cd3D = () => inGame && me.alive && TP.blend < .5 && !G.shopOn;
const cdPos = new THREE.Vector3(), cdTmp = new THREE.Vector3();
function updCard3D(dt) {
  if (!CD.g) return;
  const quiere = CU.open && cd3D();
  if (quiere) { CD.t = Math.min(1, CD.t + dt / .42); CD.out = 0; }
  else if (CD.t > 0) { CD.out += dt; CD.t = Math.max(0, CD.t - dt / .36); }
  if (CD.t <= 0 && !quiere) { CD.g.visible = false; CD.arm.visible = false; return; }
  const k = CD.t < 1 ? 1 - Math.pow(1 - CD.t, 3) : 1, T = G.time;
  CD.g.visible = true;
  cdPos.copy(CD_BAJO).lerp(CD_POS, k);
  CD.g.position.set(cdPos.x, cdPos.y + Math.sin(T * 1.5) * .006, cdPos.z);
  CD.g.rotation.set(-.12 + (1 - k) * .7 + Math.sin(T * 1.1) * .018, -.26 + (1 - k) * .28, .05 + Math.sin(T * .9) * .025);
  // la carta elegida sale hacia la cámara y las otras se apagan
  if (CD.sel >= 0) {
    const e = Math.min(1, CD.out / .4);
    CD.cards.forEach((c, i) => {
      if (i === CD.sel) { c.m.scale.setScalar(1 + e * .8); c.m.position.set(0, .082 + e * .05, e * .18); c.m.material.opacity = 1 - e * e; }
      else c.m.material.opacity = Math.max(0, 1 - e * 1.8);
    });
  }
  // antebrazo: va desde la mano hasta el borde de abajo a la derecha
  CD.g.updateMatrixWorld(true);
  cdTmp.set(0, -.02, .06).applyMatrix4(CD.g.matrixWorld);
  CD.arm.position.copy(cdTmp); CD.arm.lookAt(CD_ANCLA);
  vArmLen(CD.arm, Math.max(.05, cdTmp.distanceTo(CD_ANCLA) + .12));
  CD.arm.visible = true;
}

function openCards(m) {
  CU.open = true; CU.list = m.l.slice(); CU.t = CU.max = m.d || 12; CU.n = m.n || 1; CU.of = m.of || 3;
  const box = $('cards'), n = CU.list.length, mid = (n - 1) / 2;
  cdInit(); CD.sel = -1; CD.out = 0; cdTexturas();
  box.innerHTML = '<div class="chead"><div class="ctitle">Carta <b>' + (ROM[CU.n - 1] || CU.n) + '</b> de ' + (ROM[CU.of - 1] || CU.of) + ' · elegí una</div>' +
    '<div class="cbar"><i></i></div><div class="chint">1 · 2 · 3 · seguís disparando igual</div></div>' +
    '<div class="chand"><div class="crow">' + CU.list.map((id, i) => {
      const c = C.CARD_BY[id], rot = ((i - mid) * 7).toFixed(1), dy = (Math.abs(i - mid) * 13).toFixed(0);
      return '<div class="ccard" data-i="' + i + '" style="--cc:' + c.c + ';--rot:' + rot + 'deg;--dy:' + dy + 'px;z-index:' + (10 - Math.abs(i - mid)) + '">' +
        '<div class="cin" style="animation-delay:' + (i * .1).toFixed(2) + 's">' +
        '<i class="ck">' + (i + 1) + '</i><div class="cic">' + cardIcon(c.ic) + '</div>' +
        '<div class="cn">' + esc(c.name) + '</div><div class="cd">' + esc(c.desc) + '</div></div></div>';
    }).join('') + '</div></div>';
  box.hidden = false;
  box.classList.remove('in', 'sale'); void box.offsetWidth; box.classList.add('in');
  $('hud').classList.add('cartas');   // mientras elegís, las ranuras y los carteles de teclas se corren de la vista
  [...box.querySelectorAll('.ccard')].forEach(e => e.addEventListener('click', () => pickCard(+e.dataset.i)));
  announce('EL MAZO TE ELIGIÓ', 'Carta ' + (ROM[CU.n - 1] || CU.n) + ' de ' + (ROM[CU.of - 1] || CU.of) + ' · elegí con 1, 2 o 3');
  SFX.hunt();
}
function closeCards() { CU.open = false; $('cards').hidden = true; $('cards').classList.remove('in', 'sale'); $('hud').classList.remove('cartas'); }
function pickCard(i) {
  if (!CU.open || !CU.list[i]) return;
  CU.open = false; CD.sel = i; CD.out = 0;
  const box = $('cards');
  [...box.querySelectorAll('.ccard')].forEach((e, k) => e.classList.add(k === i ? 'taken' : 'gone'));
  box.classList.add('sale');
  const h = box.querySelector('.chead'); if (h) h.hidden = true;
  $('hud').classList.remove('cartas');
  setTimeout(() => { if (!CU.open) box.hidden = true; }, 620);
  if (net) net.send({ t: 'card', i });
  SFX.quad();
}
// el servidor confirma la carta: queda en la muestra de abajo
function onCardTaken(m) {
  me.cards = (m.l || []).slice();
  const c = C.CARD_BY[m.id];
  if (c) announce(c.name.toUpperCase(), c.desc);
  renderMyCards();
  updateHUD();
}
/* ---- las que ya tiene, abajo a la izquierda ---- */
function renderMyCards() {
  const box = $('myCards'), l = me.cards || [];
  const hay = inGame && !!(C.MODES[MODE] && C.MODES[MODE].cards);
  if (!hay) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const falta = C.CARD_AT[l.length];
  const prog = falta != null ? '<div class="cnext">PRÓXIMA CARTA EN <b>' + Math.max(0, falta - (me.kills || 0)) + '</b></div>' : '<div class="cnext full">MAZO COMPLETO</div>';
  box.innerHTML = l.map((id, i) => {
    const c = C.CARD_BY[id]; if (!c) return '';
    return '<div class="mcard' + (i === l.length - 1 ? ' nueva' : '') + '" style="--cc:' + c.c + '" title="' + esc(c.desc) + '"><span class="mic">' + cardIcon(c.ic) + '</span><b>' + esc(c.name) + '</b></div>';
  }).join('') + prog;
}

/* ---- fuego de la carta Toque ígneo: unas chispas naranjas sobre el que se quema ---- */
function addBurn(id, d) { BURN.set(id, d); if (id === myId) SFX.sizzle && SFX.sizzle(); }
function updCards(dt) {
  updCard3D(dt);
  if (CU.open) {
    $('cards').classList.toggle('solo3d', cd3D());   // con la mano en 3D, las cartas planas se esconden
    CU.t -= dt;
    const bar = document.querySelector('#cards .cbar i');
    if (bar) bar.style.transform = 'scaleX(' + Math.max(0, CU.t / CU.max).toFixed(3) + ')';
    if (CU.t <= 0) closeCards();   // el servidor ya se queda con la primera
  }
  if (!BURN.size) return;
  burnT -= dt;
  const emitir = burnT <= 0; if (emitir) burnT = .11;
  for (const [id, t] of BURN) {
    const n = t - dt;
    if (n <= 0) { BURN.delete(id); continue; }
    BURN.set(id, n);
    if (!emitir) continue;
    let x, y, z;
    if (id === myId) { if (!me.alive) continue; x = me.s.x; y = me.s.y; z = me.s.z; }
    else { const p = players.get(id); if (!p || !p.alive) continue; x = p.x; y = p.y; z = p.z; }
    fxAire(x, y + .9, z, 1, .45, .1);
  }
}
