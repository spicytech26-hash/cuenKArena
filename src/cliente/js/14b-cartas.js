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

/* ---- el reparto: el Mercader del Umbral se materializa y despliega las tres cartas ----
   El mercader es 3D (`14c-mercader.js`); acá va solo el texto, en HTML por encima de esa escena,
   para que se lea nítido. Todo en el tercio derecho: ni la mira ni el HUD de abajo quedan tapados.
   `pointer-events: none` en todo el cartel, así el mouse y los clics siguen siendo del juego. */
const ROM = ['I', 'II', 'III'];
const MER_DICE = ['Tomá una. Las otras no eran para vos.',
  'El Umbral te debe un favor. Cobralo.',
  'Elegí rápido, mortal: tengo otros clientes.',
  'Tres destinos. Uno solo te va a seguir.',
  'No preguntes de dónde las saqué.',
  'Una nomás. Lo que sobra, vuelve conmigo.',
  'Barata no es. Ya la vas a pagar.'];
let merFrase = -1, merFraseT = 0;
function merDice() { let i; do { i = Math.random() * MER_DICE.length | 0; } while (i === merFrase && MER_DICE.length > 1); merFrase = i; return MER_DICE[i]; }

function openCards(m) {
  CU.open = true; CU.list = m.l.slice(); CU.t = CU.max = m.d || 12; CU.n = m.n || 1; CU.of = m.of || 3;
  const box = $('cards');
  merFraseT = MERC.FRASE;
  $('cardsBody').innerHTML =
    '<div class="drow">' + CU.list.map((id, i) => {
      const c = C.CARD_BY[id];
      return '<div class="ccard" data-i="' + i + '" style="--cc:' + c.c + ';animation-delay:' + (MERC.ENTRA * .55 + i * MERC.CARTA_PASO).toFixed(2) + 's">' +
        '<i class="ck">' + (i + 1) + '</i><div class="cic">' + cardIcon(c.ic) + '</div>' +
        '<div class="cn">' + esc(c.name) + '</div><div class="cd">' + esc(c.desc) + '</div>' +
        '<u class="cs">' + esc(c.stat || '') + '</u></div>';
    }).join('') + '</div>' +
    '<div class="cbar"><i></i></div>' +
    '<div class="ctitle">Carta <b>' + (ROM[CU.n - 1] || CU.n) + '</b> de ' + (ROM[CU.of - 1] || CU.of) + '<span>1 · 2 · 3 · el juego no se frena</span></div>' +
    '<div class="dsay" id="merSay">' + esc(merDice()) + '</div>';
  box.hidden = false;
  box.classList.remove('in', 'sale'); void box.offsetWidth; box.classList.add('in');
  box.classList.toggle('sinmerc', !mercVa());
  box.classList.toggle('quieto', !!S.mred);
  $('hud').classList.add('cartas');   // mientras elegís, las ranuras y los carteles de teclas se corren de la vista
  mercOpen();
  SFX.hunt();
  setTimeout(() => { if (CU.open && SFX.ui) SFX.ui(); }, MERC.ENTRA * 1000 | 0);
}
function closeCards() {
  CU.open = false; $('cards').hidden = true; $('cards').classList.remove('in', 'sale');
  $('hud').classList.remove('cartas'); mercClose();
}
function pickCard(i) {
  if (!CU.open || !CU.list[i]) return;
  CU.open = false;
  const box = $('cards'), el = box.querySelector('.ccard[data-i="' + i + '"]');
  if (el) el.classList.add('elegida');                       // primero se resalta...
  if (net) net.send({ t: 'card', i });                       // (el servidor se entera al toque, sin esperar la animación)
  SFX.quad();
  setTimeout(() => {                                         // ...y recién después vuela al HUD
    [...box.querySelectorAll('.ccard')].forEach((e, k) => { e.style.animationDelay = '0s'; e.classList.add(k === i ? 'taken' : 'gone'); });
    const bar = box.querySelector('.cbar'); if (bar) bar.hidden = true;
    const say = $('merSay'); if (say) say.textContent = 'Buena elección. Nos vemos, mortal.';
    box.classList.add('sale'); $('hud').classList.remove('cartas'); mercClose();
    setTimeout(() => { if (!CU.open) box.hidden = true; }, 620);
  }, MERC.RESALTA * 1000);
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
  updMerc(dt);
  if (CU.open) {
    if (MD.on && !me.alive) mercClose();            // muerto: el mercader se retira, la oferta sigue en pie
    else if (!MD.on && me.alive && mercVa()) mercOpen();
    merFraseT -= dt;
    if (merFraseT <= 0) { merFraseT = MERC.FRASE; const e = $('merSay'); if (e) { e.textContent = merDice(); e.classList.remove('cambia'); void e.offsetWidth; e.classList.add('cambia'); } }
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
