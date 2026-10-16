/* =====================================================================
   CuenkArena — cuentas de jugador (inicio de sesión con Google)
   Sin dependencias: verifica el token de Google con la clave pública
   oficial, firma sesiones propias y guarda los perfiles en Supabase
   (o en un archivo local si Supabase no está configurado).
     GOOGLE_CLIENT_ID   id de cliente OAuth "Aplicación web" de Google
     SUPABASE_URL       https://xxxx.supabase.co
     SUPABASE_KEY       clave secreta del proyecto (nunca va al navegador)
     CUENTAS_URL        alternativa a SUPABASE_KEY: función intermediaria de Supabase
     CUENTAS_SECRET     clave del juego para hablar con esa función
     SESSION_SECRET     opcional: clave para firmar sesiones
   ===================================================================== */
'use strict';
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { levelInfo, ACCESSORIES, censor, okChestImg } = require('./public/game.js');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_KEY || '';
const FN_URL = process.env.CUENTAS_URL || '';
const FN_SECRET = process.env.CUENTAS_SECRET || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('cuenk:' + CLIENT_ID + ':' + SB_KEY + ':' + FN_SECRET).digest('hex');
const SESSION_DAYS = 30;

/* ---------- utilidades HTTP ---------- */
function request(url, opt, body, ms) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, Object.assign({ family: 4 }, opt), res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(ms || 15000, () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64u = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* ---------- verificación del token de Google ---------- */
let certs = null, certsUntil = 0;
async function googleKeys() {
  if (certs && Date.now() < certsUntil) return certs;
  const r = await request('https://www.googleapis.com/oauth2/v3/certs', { method: 'GET' });
  if (r.status !== 200) throw new Error('no se pudieron leer las claves de Google');
  certs = JSON.parse(r.body).keys;
  const m = /max-age=(\d+)/.exec(r.headers['cache-control'] || '');
  certsUntil = Date.now() + (m ? +m[1] : 3600) * 1000;
  return certs;
}
async function verifyGoogle(idToken) {
  if (!CLIENT_ID) throw new Error('el inicio de sesión no está configurado');
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('token inválido');
  const head = JSON.parse(unb64u(parts[0]).toString('utf8'));
  const pay = JSON.parse(unb64u(parts[1]).toString('utf8'));
  if (head.alg !== 'RS256') throw new Error('algoritmo inválido');
  const jwk = (await googleKeys()).find(k => k.kid === head.kid);
  if (!jwk) throw new Error('clave desconocida');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, unb64u(parts[2]));
  if (!ok) throw new Error('firma inválida');
  if (pay.aud !== CLIENT_ID) throw new Error('token para otra aplicación');
  if (pay.iss !== 'accounts.google.com' && pay.iss !== 'https://accounts.google.com') throw new Error('emisor inválido');
  if (!(pay.exp * 1000 > Date.now())) throw new Error('token vencido');
  if (!pay.sub) throw new Error('token sin usuario');
  return { sub: String(pay.sub), name: String(pay.given_name || pay.name || 'Jugador') };
}

/* ---------- sesiones propias firmadas (sin guardar nada) ---------- */
function makeSession(sub) {
  const body = b64u(JSON.stringify({ sub, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return body + '.' + b64u(crypto.createHmac('sha256', SECRET).update(body).digest());
}
function readSession(tok) {
  const [body, sig] = String(tok || '').split('.');
  if (!body || !sig) return null;
  const want = b64u(crypto.createHmac('sha256', SECRET).update(body).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const d = JSON.parse(unb64u(body).toString('utf8')); return d.exp > Date.now() && d.sub ? d.sub : null; } catch (e) { return null; }
}

/* ---------- almacenamiento: Supabase o archivo local ---------- */
const cache = new Map();
const FILE = path.join(__dirname, 'data', 'cuentas.json');
let fileDb = null;
function fileLoad() { if (fileDb) return fileDb; try { fileDb = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { fileDb = {}; } return fileDb; }
let fileTimer = null;
function fileFlush() { if (!fileDb) return; clearTimeout(fileTimer); try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(fileDb)); } catch (e) {} }
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { fileFlush(); process.exit(0); });
function fileSave() { clearTimeout(fileTimer); fileTimer = setTimeout(() => { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(fileDb)); } catch (e) { console.error('No se pudo guardar cuentas.json', e.message); } }, 500); }
const sbHeaders = extra => Object.assign({ apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, extra || {});
async function fnCall(body, tries = 2) {
  let r;
  for (let k = 0; ; k++) {
    try { r = await request(FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cuenk-secret': FN_SECRET } }, JSON.stringify(body), 20000); break; }
    catch (e) { if (k + 1 >= tries) throw e; await new Promise(res => setTimeout(res, 1500)); }
  }
  let j = null; try { j = JSON.parse(r.body); } catch (e) {}
  if (r.status !== 200 || !j) throw new Error('base de datos: ' + r.status + ' ' + r.body.slice(0, 120));
  return j;
}
async function dbGet(sub) {
  if (cache.has(sub)) return cache.get(sub);
  let row = null;
  if (FN_URL && FN_SECRET) row = (await fnCall({ op: 'get', sub })).row || null;
  else if (SB_URL && SB_KEY) {
    const r = await request(SB_URL + '/rest/v1/jugadores?sub=eq.' + encodeURIComponent(sub) + '&select=*', { method: 'GET', headers: sbHeaders() });
    if (r.status !== 200) throw new Error('base de datos: ' + r.status);
    row = JSON.parse(r.body)[0] || null;
  } else row = fileLoad()[sub] || null;
  if (row) cache.set(sub, row);
  return row;
}
async function dbPut(row) {
  row.visto = new Date().toISOString();
  cache.set(row.sub, row);
  if (FN_URL && FN_SECRET) await fnCall({ op: 'put', row });
  else if (SB_URL && SB_KEY) {
    const r = await request(SB_URL + '/rest/v1/jugadores', { method: 'POST', headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }) }, JSON.stringify(row));
    if (r.status >= 300) throw new Error('base de datos: ' + r.status + ' ' + r.body.slice(0, 120));
  } else { fileLoad()[row.sub] = row; fileSave(); }
}

/* ---------- perfil público ---------- */
const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanSkin(k) {
  k = k && typeof k === 'object' ? k : {};
  const out = { c: HEX.test(k.c) ? k.c : '#e8542a', v: HEX.test(k.v) ? k.v : '#ffffff', a: Number.isInteger(k.a) && k.a >= 0 && k.a < ACCESSORIES.length ? k.a : 0 };
  if (okChestImg(k.img)) out.img = k.img;
  return out;
}
const MIRAS = ['cruz', 'cruzgap', 'cruzpunto', 'punto', 'circulo', 'circulopunto', 'anillo', 'fina', 't', 'mas', 'x', 'cortes'];
function cleanMira(m) {
  m = m && typeof m === 'object' ? m : {};
  return { s: MIRAS.includes(m.s) ? m.s : 'cruz', c: HEX.test(m.c) ? m.c : '#ffffff', z: typeof m.z === 'number' && m.z >= .5 && m.z <= 2.5 ? Math.round(m.z * 100) / 100 : 1 };
}
const cleanName = n => censor(String(n || '').replace(/[\u0000-\u001f<>]/g, '')).replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Jugador';
function profile(row) {
  const L = levelInfo(row.xp);
  return { nombre: row.nombre, skin: row.skin, mira: row.mira, xp: row.xp, nivel: L.level, en: L.into, falta: L.need, kills: row.kills, partidas: row.partidas, victorias: row.victorias };
}

/* ---------- API ---------- */
const enabled = () => !!CLIENT_ID;
const persistent = () => !!((SB_URL && SB_KEY) || (FN_URL && FN_SECRET));
// al arrancar, prueba la base para que el log de Render diga si quedó bien conectada
if (FN_URL && FN_SECRET) {
  const t0 = Date.now();
  fnCall({ op: 'get', sub: '__prueba__' }, 4)
    .then(() => console.log('Base de datos de cuentas conectada (Supabase, ' + (Date.now() - t0) + ' ms)'))
    .catch(e => console.error('ERROR: no se pudo conectar con la base de cuentas (' + (Date.now() - t0) + ' ms):', e.message, '· URL:', FN_URL));
}
async function login(credential) {
  const g = await verifyGoogle(credential);
  let row = await dbGet(g.sub);
  if (!row) { row = { sub: g.sub, nombre: cleanName(g.name), skin: cleanSkin(null), mira: cleanMira(null), xp: 0, kills: 0, partidas: 0, victorias: 0 }; await dbPut(row); }
  return { token: makeSession(g.sub), perfil: profile(row) };
}
async function me(tok) { const sub = readSession(tok); if (!sub) return null; const row = await dbGet(sub); return row ? { sub, row, perfil: profile(row) } : null; }
async function update(tok, data) {
  const m = await me(tok); if (!m) return null;
  const row = m.row;
  if (data.nombre !== undefined) row.nombre = cleanName(data.nombre);
  if (data.skin !== undefined) row.skin = cleanSkin(data.skin);
  if (data.mira !== undefined) row.mira = cleanMira(data.mira);
  await dbPut(row);
  return profile(row);
}
// suma experiencia en cola por jugador para no pisar escrituras simultáneas
const queues = new Map();
function addXP(sub, gain, info) {
  const prev = queues.get(sub) || Promise.resolve();
  const next = prev.then(async () => {
    const row = await dbGet(sub); if (!row) return null;
    const before = levelInfo(row.xp).level;
    row.xp = Math.max(0, (row.xp | 0) + (gain | 0));
    row.kills = (row.kills | 0) + (info.kills | 0); row.partidas = (row.partidas | 0) + (info.partida | 0); row.victorias = (row.victorias | 0) + (info.victoria | 0);
    await dbPut(row);
    return { antes: before, perfil: profile(row) };
  }).catch(e => { console.error('No se pudo sumar experiencia:', e.message); return null; });
  queues.set(sub, next);
  return next;
}

module.exports = { _test: { makeSession, dbPut }, enabled, persistent, clientId: () => CLIENT_ID, login, me, update, addXP, readSession, levelInfo };
