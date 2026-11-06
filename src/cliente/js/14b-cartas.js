/* =================== CARTAS DE MEJORA (estilo roguelike) ===================
   A las 3, 7 y 10 bajas el servidor manda 3 cartas (`cof`) y el jugador elige una con 1-2-3
   (o con un clic, cuando el mouse está libre). Mientras elige puede seguir jugando: el cartel
   no traba el movimiento ni la mira, y si deja pasar los 12 s se queda con la primera.
   Las que ya tiene quedan de muestra abajo a la izquierda. El servidor es el que decide todo. */
const CU = { open: false, list: [], t: 0, max: 0, n: 1, of: 3 };
const BURN = new Map();       // id del jugador → segundos que le queda de fuego (carta Toque ígneo)
let burnT = 0;

const CARD_SVG = {
  gota:    '<path d="M12 2c0 0-6.5 7.8-6.5 12A6.5 6.5 0 0 0 18.5 14C18.5 9.8 12 2 12 2z"/>',
  cohete:  '<path d="M12 1.5c2.6 2.4 4 5.6 4 9.2v5.1l-2 2.2h-4l-2-2.2v-5.1c0-3.6 1.4-6.8 4-9.2z"/><path d="M6 12.5 3.2 17.6 7 15.8zm12 0 2.8 5.1L17 15.8z"/><path d="M10.4 20.4h3.2L12 23z"/>',
  bomba:   '<circle cx="11" cy="14" r="7"/><path d="M15.2 6.3 17 8.1l1.6-1.6 1.6 1.6L22 6.5 19.9 4.4 18.3 6 16.9 4.6z"/>',
  llama:   '<path d="M12 1.5c3.2 4.3 5.2 6.6 5.2 10A5.2 5.2 0 0 1 6.8 11.5c0-3.4 2-5.7 5.2-10z"/><path d="M12 11.6c1.1 1.7 2.1 2.7 2.1 4.1a2.1 2.1 0 0 1-4.2 0c0-1.4 1-2.4 2.1-4.1z" opacity=".55"/>',
  colmillo:'<path d="M5.5 2.5h13l-2.2 7.2L12 22 8 9.7z"/>',
  escudo:  '<path d="M12 1.8 20.5 5v6.2c0 5.2-3.5 9.4-8.5 11.4-5-2-8.5-6.2-8.5-11.4V5z"/>',
  moneda:  '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.4 5 9 7.6 7.6 9zm11.2 0L15 7.6 16.4 9zM6.4 19 9 16.4 7.6 15zm11.2 0L15 16.4 16.4 15z"/>',
  placa:   '<path d="M12 1.6 21 7l-9 5-9-5z"/><path d="M12 12.4 21 17.6l-9 4.8-9-4.8z" opacity=".6"/>',
  corazon: '<path d="M12 21.6S3.6 16.2 3.6 10.6A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.4 3.6c0 5.6-8.4 11-8.4 11z"/>'
};
const cardIcon = ic => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' + (CARD_SVG[ic] || '') + '</svg>';
const cardsOpen = () => CU.open;
function resetCards() { me.cards = []; me.kills = 0; CU.list = []; closeCards(); BURN.clear(); renderMyCards(); }

/* ---- la mano de cartas (abajo a la derecha) ---- */
const ROM = ['I', 'II', 'III'];
function openCards(m) {
  CU.open = true; CU.list = m.l.slice(); CU.t = CU.max = m.d || 12; CU.n = m.n || 1; CU.of = m.of || 3;
  const box = $('cards'), n = CU.list.length, mid = (n - 1) / 2;
  box.innerHTML = '<div class="ctitle">Carta <b>' + (ROM[CU.n - 1] || CU.n) + '</b> de ' + (ROM[CU.of - 1] || CU.of) + ' · elegí una</div>' +
    '<div class="crow">' + CU.list.map((id, i) => {
      const c = C.CARD_BY[id], rot = ((i - mid) * 7).toFixed(1), dy = (Math.abs(i - mid) * 13).toFixed(0);
      return '<div class="ccard" data-i="' + i + '" style="--cc:' + c.c + ';--rot:' + rot + 'deg;--dy:' + dy + 'px;z-index:' + (10 - Math.abs(i - mid)) + '">' +
        '<div class="cin" style="animation-delay:' + (i * .1).toFixed(2) + 's">' +
        '<i class="ck">' + (i + 1) + '</i><div class="cic">' + cardIcon(c.ic) + '</div>' +
        '<div class="cn">' + esc(c.name) + '</div><div class="cd">' + esc(c.desc) + '</div></div></div>';
    }).join('') + '</div>' +
    '<div class="cbar"><i></i></div><div class="chint">1 · 2 · 3 o clic · dura toda la partida</div>';
  box.hidden = false;
  box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  $('hud').classList.add('cartas');   // mientras elegís, las ranuras y los carteles de teclas se corren de la vista
  [...box.querySelectorAll('.ccard')].forEach(e => e.addEventListener('click', () => pickCard(+e.dataset.i)));
  announce('EL MAZO TE ELIGIÓ', 'Carta ' + (ROM[CU.n - 1] || CU.n) + ' de ' + (ROM[CU.of - 1] || CU.of) + ' · elegí con 1, 2 o 3');
  SFX.hunt();
}
function closeCards() { CU.open = false; $('cards').hidden = true; $('hud').classList.remove('cartas'); }
function pickCard(i) {
  if (!CU.open || !CU.list[i]) return;
  CU.open = false;
  const box = $('cards');
  [...box.querySelectorAll('.ccard')].forEach((e, k) => e.classList.add(k === i ? 'taken' : 'gone'));
  const bar = box.querySelector('.cbar'); if (bar) bar.hidden = true;
  $('hud').classList.remove('cartas');
  setTimeout(() => { if (!CU.open) box.hidden = true; }, 560);
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
