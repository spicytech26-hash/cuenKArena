/* =================== CARTAS DE MEJORA (estilo roguelike) ===================
   A las 3, 7 y 12 bajas el servidor manda 3 cartas (`cof`) y el jugador elige una con 1-2-3
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

/* ---- el reparto: tu propia mano entra, abre las tres cartas y se retira ----
   La mano se dibuja con los colores de tu skin (los mismos que usa el robot) y solo está en pantalla
   el segundo del reparto: deja las cartas grandes y legibles arriba a la izquierda, lejos del arma,
   de la mira y del chat. No traba nada: se sigue corriendo y disparando mientras elegís. */
const ROM = ['I', 'II', 'III'];
function manoColores() {
  const sk = teamsMode() && myTeam >= 0 ? Object.assign({}, S.skin, { c: colorOf(myId), cb: null, c2: null, c3: null }) : S.skin;
  return skinParts(sk);
}
// guante robótico visto desde atrás: antebrazo, dorso con tira de visor, cuatro dedos y el pulgar
function svgMano(P) {
  const rect = (x, y, w, h, r, fill, op) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r +
    '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : ' stroke="rgba(0,0,0,.55)" stroke-width="2.5"') + '/>';
  let dedos = '';
  [[216, 50, 80, 26, -15], [222, 84, 88, 28, -5], [222, 118, 82, 27, 5], [216, 150, 70, 25, 14]].forEach(([x, y, w, h, rot]) => {
    dedos += '<g transform="rotate(' + rot + ' ' + x + ' ' + (y + h / 2) + ')">' +
      rect(x, y, w, h, h / 2, 'url(#mnGlove)') +
      rect(x + w - 25, y + 5, 21, h - 10, (h - 10) / 2, P.c3) +
      rect(x + 24, y + 4, 9, h - 8, 4, P.c3, '.4') + '</g>';
  });
  return '<svg class="dhand" viewBox="0 0 320 212" aria-hidden="true">' +
    '<defs><linearGradient id="mnArm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.c3 + '"/><stop offset=".42" stop-color="' + P.c2 + '"/><stop offset="1" stop-color="#0b0906"/></linearGradient>' +
    '<linearGradient id="mnGlove" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.c3 + '"/><stop offset=".38" stop-color="' + P.cb + '"/><stop offset="1" stop-color="#120d0a"/></linearGradient></defs>' +
    rect(-24, 70, 152, 90, 20, 'url(#mnArm)') +
    rect(4, 100, 88, 13, 6, P.v, '.5') +
    rect(104, 64, 26, 102, 12, P.c3) +
    rect(126, 48, 98, 130, 24, 'url(#mnGlove)') +
    rect(144, 68, 62, 15, 7, P.v, '.5') +
    rect(146, 136, 58, 10, 5, P.c3, '.35') +
    dedos +
    '<g transform="rotate(-40 178 178)">' + rect(152, 164, 88, 29, 14, 'url(#mnGlove)') + rect(216, 170, 20, 17, 8, P.c3) + '</g>' +
    '</svg>';
}

function openCards(m) {
  CU.open = true; CU.list = m.l.slice(); CU.t = CU.max = m.d || 12; CU.n = m.n || 1; CU.of = m.of || 3;
  const box = $('cards');
  $('cardsBody').innerHTML = svgMano(manoColores()) +
    '<div class="ctitle">Carta <b>' + (ROM[CU.n - 1] || CU.n) + '</b> de ' + (ROM[CU.of - 1] || CU.of) + ' · elegí una<span>1 · 2 · 3 · seguís disparando igual</span></div>' +
    '<div class="drow">' + CU.list.map((id, i) => {
      const c = C.CARD_BY[id];
      return '<div class="ccard" data-i="' + i + '" style="--cc:' + c.c + ';animation-delay:' + (.16 + i * .09).toFixed(2) + 's">' +
        '<i class="ck">' + (i + 1) + '</i><div class="cic">' + cardIcon(c.ic) + '</div>' +
        '<div class="cn">' + esc(c.name) + '</div><div class="cd">' + esc(c.desc) + '</div></div>';
    }).join('') + '</div>' +
    '<div class="cbar"><i></i></div>';
  box.hidden = false;
  box.classList.remove('in', 'sale'); void box.offsetWidth; box.classList.add('in');
  $('hud').classList.add('cartas');   // mientras elegís, las ranuras de armas y los carteles de teclas se corren de la vista
  [...box.querySelectorAll('.ccard')].forEach(e => e.addEventListener('click', () => pickCard(+e.dataset.i)));
  SFX.hunt();
}
function closeCards() { CU.open = false; $('cards').hidden = true; $('cards').classList.remove('in', 'sale'); $('hud').classList.remove('cartas'); }
function pickCard(i) {
  if (!CU.open || !CU.list[i]) return;
  CU.open = false;
  const box = $('cards');
  [...box.querySelectorAll('.ccard')].forEach((e, k) => { e.style.animationDelay = '0s'; e.classList.add(k === i ? 'taken' : 'gone'); });
  box.classList.add('sale');          // la mano vuelve a buscar las que no elegiste
  $('hud').classList.remove('cartas');
  const bar = box.querySelector('.cbar'); if (bar) bar.hidden = true;
  setTimeout(() => { if (!CU.open) box.hidden = true; }, 640);
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
  if (CU.open) {
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
