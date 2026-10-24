/* =====================================================================
   PARTIDA — lógica autoritativa (corre en el servidor o, en práctica,
   dentro del navegador)
   ===================================================================== */
/* Dificultad de los bots. Cada nivel cambia todo, no solo la puntería:
   react  segundos que tarda en empezar a disparar después de verte
   err    error de puntería (radianes)       turn   velocidad para girar (rad/s)
   track  qué tan rápido sigue tus movimientos (más bajo = apunta a donde estabas)
   lead   cuánto adelanta cohetes y granadas  fire   multiplica la cadencia (más alto = dispara más lento)
   dmg    multiplica el daño que hace         fov / range  qué tan lejos y hacia dónde te ve
   strafe cuánto esquiva de costado          hop    probabilidad de saltar en combate */
const SKILL = [
  { name: 'Fácil',     react: .9,  err: .14,  turn: 3,   track: 6,   lead: 0,   fire: 2.2, dmg: .55, fov: .5,  range: 38, strafe: .3,  hop: 0 },
  { name: 'Normal',    react: .6,  err: .09,  turn: 4.5, track: 8,   lead: .45, fire: 1.5, dmg: .8,  fov: .15, range: 52, strafe: .65, hop: .12 },
  { name: 'Difícil',   react: .3,  err: .05,  turn: 8.5, track: 14,  lead: .8,  fire: 1.1, dmg: 1,   fov: -.2, range: 68, strafe: 1,   hop: .3 },
  { name: 'Pesadilla', react: .14, err: .02,  turn: 15,  track: 28,  lead: 1,   fire: 1,   dmg: 1.1, fov: -.5, range: 80, strafe: 1.15, hop: .45 }
];
/* ---------- palabras censuradas (chat y nombres) ----------
   Se comparan palabras enteras después de normalizar: sin tildes, números y símbolos como letras (4→a, 1→i, 0→o…),
   y→i, b→v, th→t, letras repetidas juntas una sola vez y sin puntos ni guiones entre letras. "banana" o "mañana" no se tocan. */
const BAD_WORDS = ['fati', 'fatima', 'fatimita', 'fatita', 'fatii', 'ana', 'anita', 'anana', 'vani', 'vanina', 'vaninita', 'vanita', 'vagina', 'vajina', 'vrenda', 'vrendita',
  'varvie', 'varvi', 'varvara', 'varvarita', 'varvita', 'varvis',
  'agasoni', 'agason', 'agasonis', 'leguisamon', 'legisamon', 'leguisamones', 'leguisa'];   // agazzoni, leguizamón (la z se compara como s)   // barbie, barbi, barbara (la b se compara como v)
const BAD_SET = new Set(BAD_WORDS.flatMap(w => [w, w + 's']));
const LEET = { '4': 'a', '@': 'a', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'v', '6': 'g', '9': 'g' };
function normWord(w) {
  let x = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  x = x.replace(/[4@1!|30$56789]/g, c => LEET[c] || c).replace(/[^a-zñ]/g, '').replace(/ñ/g, 'n');
  x = x.replace(/th/g, 't').replace(/y/g, 'i').replace(/b/g, 'v').replace(/z/g, 's').replace(/(.)\1+/g, '$1');
  return x;
}
function isBad(w) {
  const t = n => n.length >= 3 && BAD_SET.has(n);
  // con y sin los signos de los bordes ("vanina!!", "¡ana!")
  const edge = String(w).replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
  return t(normWord(w)) || t(normWord(edge)) || t(normWord(edge.replace(/^\d+|\d+$/g, '')));
}
function censor(text) {
  text = String(text || '');
  // palabras separadas por espacios o signos
  let out = text.replace(/[^\s]+/g, tok => {
    if (isBad(tok)) return '*'.repeat(Math.min(8, tok.length));
    // dentro de un token con signos (fati_ana, ana-123): cada pedazo de letras por separado
    return tok.replace(/[a-zA-ZÀ-ÿñÑ0-9@$!|]+/g, part => isBad(part) ? '*'.repeat(Math.min(8, part.length)) : part);
  });
  // palabras partidas en dos o tres pedazos: "fat i", "aga zzoni", "le gui zamon"
  const toks = out.split(/(\s+)/);
  for (let i = 0; i < toks.length; i += 2) for (const n of [2, 3]) {
    const idx = []; for (let k = 0; k < n && i + 2 * k < toks.length; k++) idx.push(i + 2 * k);
    if (idx.length < n || idx.some(j => /^\*+$/.test(toks[j]))) continue;
    if (isBad(idx.map(j => toks[j]).join(''))) idx.forEach(j => toks[j] = '*'.repeat(Math.min(8, toks[j].length)));
  }
  out = toks.join('');
  // letras sueltas separadas por espacios: "a n a", "f a t i"
  out = out.replace(/(?:^|(?<=\s))((?:\S\s+){2,}\S)(?=\s|$)/g, seq => {
    const letters = seq.split(/\s+/);
    if (letters.every(l => l.length === 1) && isBad(letters.join(''))) return '*'.repeat(letters.length);
    return seq;
  });
  return out;
}
function cleanName(n) { n = censor(String(n || '').replace(/[\u0000-\u001f<>]/g, '')).replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); return n || 'Jugador'; }
const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanSkin(k, fallback) {
  const f = fallback || { c: COLORS[0], v: '#ffffff', a: 0 };
  if (!k || typeof k !== 'object') return Object.assign({}, f);
  const out = { c: HEX.test(k.c) ? k.c : f.c, v: HEX.test(k.v) ? k.v : f.v, a: Number.isInteger(k.a) && k.a >= 0 && k.a < ACCESSORIES.length ? k.a : 0 };
  if (okChestImg(k.img)) out.img = k.img;
  return out;
}
// imagen del pecho: JPEG cuadrado chico (el navegador la recorta y achica a 96×96 antes de mandarla)
const okChestImg = s => typeof s === 'string' && s.length <= 24000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s);
const SHOP_BY_ID = {}; SHOP.forEach(it => SHOP_BY_ID[it.id] = it);

