/* =====================================================================
   CuenkArena — servidor de juego
   Sin dependencias: solo Node.js (18 o más nuevo).
   Sirve el cliente web y maneja las partidas por WebSocket en /ws
     node server.js            → http://localhost:3000
   Variables de entorno opcionales:
     PORT=3000  BOTS=0 (si es mayor a 0, rellena hasta N jugadores con bots)
     BOT_SKILL=1 (0 fácil · 3 pesadilla)  FRAGLIMIT=20  TIMELIMIT=10 (minutos)
     MAX_PLAYERS=16  MAP=represa (mapa inicial de Arena)  CAPLIMIT=3
   Cuentas (opcional, ver cuentas.js): GOOGLE_CLIENT_ID  SUPABASE_URL  SUPABASE_KEY
   Hay una sala por modo de juego (Arena, Gungame, Captura la bandera);
   el cliente elige con /ws?mode=arena|gungame|ctf
   ===================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { Game, MODES, MODE_IDS, MAPS, MAP_IDS, getNav } = require('./public/game.js');
// la navegación de los bots de todos los mapas se arma al arrancar: si no, el servidor se congelaba
// un par de segundos (para todos) cada vez que una partida pasaba a un mapa nuevo
{ const t0 = Date.now(); for (const id of MAP_IDS) getNav(MAPS[id]); console.log('Mapas listos en ' + (Date.now() - t0) + ' ms'); }
const cuentas = require('./cuentas.js');

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const num = (v, d) => (v === undefined || v === '' || isNaN(+v)) ? d : +v;

const games = {};
const kickers = new Map(); // id de jugador → función que corta su conexión (para la votación)
for (const mode of MODE_IDS) games[mode] = new Game({
  onKick: id => { const k = kickers.get(mode + ':' + id); if (k) k(); },
  online: true, mode,
  map: mode === 'arena' ? (process.env.MAP || 'represa') : undefined,
  botFill: num(process.env.BOTS, 0),
  botSkill: num(process.env.BOT_SKILL, 1),
  fraglimit: num(process.env.FRAGLIMIT, 20),
  caplimit: num(process.env.CAPLIMIT, 3),
  timelimit: num(process.env.TIMELIMIT, 10) * 60,
  maxPlayers: num(process.env.MAX_PLAYERS, 16),
  // cuando un jugador con cuenta termina una partida (o se va), se le suma la experiencia
  onXP: (p, gain, info) => {
    if (!p.acct) return;
    cuentas.addXP(p.acct, gain, info).then(r => {
      if (!r) return;
      p.plvl = r.perfil.nivel;
      if (p.send) p.send({ t: 'xp', gain, antes: r.antes, perfil: r.perfil, parts: p.xpParts || null });
    }).catch(e => console.error('Error al mandar la experiencia:', e.message));
  }
});
if (cuentas.enabled()) console.log('Cuentas con Google activadas' + (cuentas.persistent() ? ' (Supabase)' : ' (archivo local: se borra en cada deploy de Render)'));

/* ---------- archivos estáticos ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/config') { json(res, 200, { googleClientId: cuentas.clientId(), cuentas: cuentas.enabled() }); return; }
  if (url === '/auth/google' && req.method === 'POST') { readBody(req, res, async b => { try { json(res, 200, await cuentas.login(b.credential)); } catch (e) { json(res, 401, { error: e.message }); } }); return; }
  if (url === '/me') {
    const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (req.method === 'GET') { cuentas.me(tok).then(m => m ? json(res, 200, { perfil: m.perfil }) : json(res, 401, { error: 'sesión vencida' })).catch(e => json(res, 500, { error: e.message })); return; }
    if (req.method === 'POST') { readBody(req, res, async b => { try { const pf = await cuentas.update(tok, b); pf ? json(res, 200, { perfil: pf }) : json(res, 401, { error: 'sesión vencida' }); } catch (e) { json(res, 500, { error: e.message }); } }); return; }
  }
  if (url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    const salas = {};
    for (const m of MODE_IDS) { const g = games[m]; salas[m] = { modo: MODES[m].name, mapa: g.W.name, humanos: g.humanCount(false), jugadores: g.scores().map(s => ({ nombre: s[1], frags: s[2], bot: !!s[5] })) }; }
    res.end(JSON.stringify({ juego: 'CuenkArena', salas }));
    return;
  }
  let file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  serveStatic(req, res, file);
});
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function readBody(req, res, fn) {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 65536) { req.destroy(); return; } chunks.push(c); });
  req.on('end', () => { let b = {}; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return json(res, 400, { error: 'JSON inválido' }); } fn(b); });
}
// archivos comprimidos con gzip y validados con ETag: el navegador solo baja de nuevo lo que cambió
const fileCache = new Map();
function serveStatic(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return; }
    let c = fileCache.get(file);
    if (!c || c.mtime !== st.mtimeMs) {
      let data = fs.readFileSync(file);
      if (path.extname(file) === '.html' && !/^\s*<!doctype/i.test(data.toString('utf8', 0, 64))) {
        data = Buffer.concat([Buffer.from('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n'), data, Buffer.from('\n</body></html>')]);
      }
      c = { mtime: st.mtimeMs, raw: data, gz: zlib.gzipSync(data, { level: 9 }), etag: '"' + crypto.createHash('sha1').update(data).digest('base64').slice(0, 20) + '"' };
      fileCache.set(file, c);
    }
    const head = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: c.etag, Vary: 'Accept-Encoding' };
    if (req.headers['if-none-match'] === c.etag) { res.writeHead(304, head); res.end(); return; }
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { head['Content-Encoding'] = 'gzip'; res.writeHead(200, head); res.end(c.gz); }
    else { res.writeHead(200, head); res.end(c.raw); }
  });
}

/* ---------- WebSocket mínimo (RFC 6455) ---------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
class Socket {
  constructor(sock) {
    this.sock = sock; this.buf = Buffer.alloc(0); this.frags = []; this.open = true;
    this.onmessage = null; this.onclose = null; this.alive = true;
    sock.setNoDelay(true);
    sock.on('data', d => this.data(d));
    sock.on('close', () => this.closed());
    sock.on('error', () => this.closed());
  }
  data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; const hi = this.buf.readUInt32BE(2); len = this.buf.readUInt32BE(6); if (hi) return this.close(); off = 10; }
      if (len > 65536) return this.close();
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) {
        const mask = this.buf.subarray(off, off + 4), out = Buffer.allocUnsafe(len);
        for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
        payload = out;
      }
      this.buf = this.buf.subarray(need);
      if (op === 0x8) return this.close();
      if (op === 0x9) { this.frame(0xA, payload); continue; }
      if (op === 0xA) { this.alive = true; continue; }
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        this.frags.push(payload);
        if (fin) {
          const msg = Buffer.concat(this.frags).toString('utf8'); this.frags = [];
          this.alive = true;
          if (this.onmessage) this.onmessage(msg);
        }
      }
    }
  }
  frame(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    let head;
    if (len < 126) { head = Buffer.from([0x80 | op, len]); }
    else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
    this.sock.write(Buffer.concat([head, payload]));
  }
  send(text) { this.frame(0x1, Buffer.from(text, 'utf8')); }
  get backlog() { return this.sock.writableLength; }
  close() { if (!this.open) return; try { this.frame(0x8, Buffer.alloc(0)); } catch (e) {} this.sock.end(); this.closed(); }
  closed() { if (!this.open) return; this.open = false; if (this.onclose) this.onclose(); }
}

let cacheObj = null, cacheStr = '';
const sockets = new Set();
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  const [route, query] = (req.url || '').split('?');
  if (route !== '/ws' || !key) { sock.destroy(); return; }
  const mode = (/(?:^|&)mode=([a-z]+)/.exec(query || '') || [])[1];
  const game = games[mode] || games.arena;
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const ws = new Socket(sock);
  sockets.add(ws);
  let count = 0, windowT = Date.now();
  const id = game.addClient(obj => {
    if (!ws.open) return;
    if (obj.t === 'sn' && ws.backlog > 256 * 1024) return; // cliente lento: saltear snapshots
    if (obj !== cacheObj) { cacheObj = obj; cacheStr = JSON.stringify(obj); }
    ws.send(cacheStr);
  });
  if (!id) { setTimeout(() => ws.close(), 200); return; }
  const gmode = Object.keys(games).find(k => games[k] === game);
  kickers.set(gmode + ':' + id, () => setTimeout(() => ws.close(), 300));
  ws.onmessage = text => {
    const now = Date.now();
    if (now - windowT > 1000) { windowT = now; count = 0; }
    if (++count > 120) return; // límite de mensajes por segundo
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    if (m && m.t === 'join' && m.tok && cuentas.enabled()) {
      const tok = m.tok; delete m.tok;
      cuentas.me(tok).then(acc => {
        if (acc) { m.name = acc.perfil.nombre; game.setAccount(id, { sub: acc.sub, level: acc.perfil.nivel }); }
        game.onMessage(id, m);
        if (acc) game.setAccount(id, { sub: acc.sub, level: acc.perfil.nivel });
      }).catch(() => game.onMessage(id, m));
      return;
    }
    game.onMessage(id, m);
  };
  ws.onclose = () => { sockets.delete(ws); kickers.delete(gmode + ':' + id); game.removeClient(id); };
});

/* ---------- bucle del juego a 40 Hz con paso fijo ----------
   Paso fijo = la simulación no depende de que el servidor se atrase.
   40 Hz alcanza (la física interna corre a 120 Hz) y consume menos CPU
   en planes chicos como el gratuito de Render. */
const TICK = 1 / 40;
let last = process.hrtime.bigint(), acc = 0;
setInterval(() => {
  const now = process.hrtime.bigint();
  acc += Number(now - last) / 1e9; last = now;
  if (acc > .25) acc = .25;
  while (acc >= TICK) {
    // las salas vacías no gastan CPU: solo avanzan las que tienen alguien conectado
    for (const m of MODE_IDS) { const g = games[m]; if (!g.humanCount(true)) continue; try { g.tick(TICK); } catch (e) { console.error('Error en tick (' + m + '):', e); } }
    acc -= TICK;
  }
}, 1000 / 80);

/* ---------- latidos para cortar conexiones muertas ---------- */
setInterval(() => {
  for (const ws of sockets) {
    if (!ws.alive) { ws.close(); continue; }
    ws.alive = false; ws.frame(0x9, Buffer.alloc(0));
  }
}, 20000);

// un error suelto nunca debe tirar el servidor (cortaría a todos los jugadores de golpe)
process.on('uncaughtException', e => console.error('Error no atrapado:', e));
process.on('unhandledRejection', e => console.error('Promesa rechazada sin atrapar:', e));

server.listen(PORT, () => {
  console.log('CuenkArena corriendo en http://localhost:' + PORT);
  const nets = require('os').networkInterfaces();
  for (const k in nets) for (const n of nets[k]) if (n.family === 'IPv4' && !n.internal) console.log('  En tu red local: http://' + n.address + ':' + PORT);
});
