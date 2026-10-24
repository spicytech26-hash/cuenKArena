class Game {
  constructor(o) {
    this.o = Object.assign({ fraglimit: 20, timelimit: 600, caplimit: 3, bots: null, botFill: 0, botSkill: 1, online: false, maxPlayers: 16, map: null, rotate: true, mode: 'arena' }, o || {});
    if (!MODES[this.o.mode]) this.o.mode = 'arena';
    this.mode = MODES[this.o.mode];
    if (this.mode.timelimit) this.o.timelimit = this.mode.timelimit;   // la Arena dura 6 minutos, online y en práctica
    this.shards = []; this.sid = 1; this.mapVotes = new Map(); this.voteOpts = null;
    this.players = new Map(); this.nextId = 1; this.projs = []; this.fires = []; this.pid = 1; this.vote = null; this.bans = new Map(); this.kickN = new Map();
    this.time = 0; this.snapT = 0; this.scT = 0; this.botT = 0; this.state = 'play'; this.left = this.o.timelimit; this.interT = 0;
    this.ts = [0, 0]; this.flags = []; this.countT = 0;
    if (this.mode.minPlayers && this.o.online) this.state = 'lobby';
    this.o.map = mapId(this.o.map);
    this.setMap(this.mode.maps.includes(this.o.map) ? this.o.map : this.mode.maps[0]);
  }
  setMap(id) {
    this.W = MAPS[id]; this.nav = getNav(this.W); safeSpawns(this.W);
    // en gungame no hay armas ni munición tiradas: cada uno tiene la de su nivel
    const off = t => !!this.mode.gg; // en gungame no hay nada tirado: cada arma se gana con bajas
    this.items = this.W.items.map((it, i) => ({ i, type: it.type, base: it.type, x: it.x, y: it.y, z: it.z, off: off(it.type), up: !off(it.type), t: 0 }));
    this.projs.length = 0; this.fires = [];
    this.resetFlags();
    updateMovers(this.W, this.time);
  }
  resetFlags() {
    this.ts = [0, 0];
    this.flags = this.mode.ctf && this.W.flags ? this.W.flags.map((f, i) => ({ team: i, st: 0, by: 0, x: f.x, y: f.y, z: f.z, t: 0 })) : [];
  }
  // 'lobby' y 'count' = calentamiento antes de que arranque el Team Deathmatch: se juega pero no se cuenta
  live() { return this.state === 'play' || this.state === 'lobby' || this.state === 'count'; }
  flagState() { return this.flags.map(f => [f.st, f.by, r2(f.x), r2(f.y), r2(f.z)]); }
  /* ---- conexiones ---- */
  addClient(send) {
    if (this.humanCount(true) >= this.o.maxPlayers) { send({ t: 'full' }); return 0; }
    const id = this.nextId++;
    const p = this.newPlayer(id, 'Jugador', { c: COLORS[id % COLORS.length], v: '#ffffff', a: 0 }, false);
    p.send = send; this.players.set(id, p); return id;
  }
  removeClient(id) {
    const p = this.players.get(id); if (!p) return;
    this.players.delete(id);
    this.dropCarried(p);
    if (p.acct && this.state === 'play' && this.o.onXP) { const xp = this.matchXP(p, false, false); if (xp > 0) this.o.onXP(p, xp, { kills: p.kills, partida: 0, victoria: 0 }); }
    if (p.joined) { this.bcast({ t: 'ev', e: 'leave', id, n: p.name }); this.botT = 0; }
    if (this.vote) this.checkVote();
    if (this.state === 'inter') this.checkReady();
  }
  newPlayer(id, name, skin, bot) {
    return { id, name, skin, color: skin.c, bot, send: null, s: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, on: false }, yaw: 0, pitch: 0, w: 1,
      hp: 100, ar: 0, am: AMMO0(0), ow: OW0(), mag: {}, relT: {}, alive: false, deadT: 0,
      frags: 0, deaths: 0, quadT: 0, lavaT: 0, megaT: 0, lastFire: -9, ping: 0, dirty: true, joined: false, ai: null, spawnT: 0, padT: 0,
      cr: ECON.START, unl: OW0(), perk: { ar: 0, am: 0 }, streak: 0, lvl: 0, team: -1, caps: 0, kills: 0, dmg: 0, acct: null, plvl: 0, joinT: 0, role: id % 3 === 0 ? 'def' : 'att' };
  }
  // el servidor avisa qué cuenta tiene cada jugador (para su nivel y para sumarle experiencia)
  setAccount(id, a) { const p = this.players.get(id); if (!p) return; p.acct = a ? a.sub : null; p.plvl = a ? a.level : 0; if (p.joined) this.sendScores(); }
  // experiencia de la partida, con el detalle para mostrarlo en la pantalla final
  xpParts(p, finished, won) {
    const mins = (this.time - p.joinT) / 60;
    const life = Math.max(p.bestLife || 0, p.alive && p.lifeT0 != null ? this.time - p.lifeT0 : 0);
    const parts = {
      partida: finished ? XP.PLAY : 0,
      minutos: Math.min(XP.MAX_MIN, Math.floor(mins)) * XP.PER_MIN,
      bajas: p.kills * XP.KILL,
      aguante: Math.min(XP.MAX_SURVIVE, Math.floor(life / 60) * XP.SURVIVE),
      victoria: finished && won ? XP.WIN : 0,
      capturas: p.caps * XP.CAP
    };
    if (!finished && mins < 1) { parts.minutos = 0; parts.aguante = 0; parts.capturas = 0; } // irse enseguida solo deja lo de las bajas
    return parts;
  }
  matchXP(p, finished, won) {
    if (!p.acct || p.bot) return 0;
    const parts = this.xpParts(p, finished, won); let xp = 0; for (const k in parts) xp += parts[k];
    p.xpParts = parts;
    return Math.min(XP.MAX_MATCH, xp);
  }
  teamCount(t, except) { let n = 0; for (const q of this.players.values()) if (q.joined && q.team === t && q !== except) n++; return n; }
  pickTeam(p) { const a = this.teamCount(0, p), b = this.teamCount(1, p); return a < b ? 0 : b < a ? 1 : (Math.random() < .5 ? 0 : 1); }
  setTeam(p, t) { p.team = t; p.color = TEAMS[t].c; }
  humanCount(all) { let n = 0; for (const p of this.players.values()) if (!p.bot && (all || p.joined)) n++; return n; }
  bcast(m, except) { for (const p of this.players.values()) if (p.send && p.joined && p.id !== except) p.send(m); }
  roster() { return [...this.players.values()].filter(p => p.joined).map(p => [p.id, p.name, p.color, p.bot ? 1 : 0, p.skin, p.team]); }
  mult(p) { return p.quadT > 0 ? 4 : 1; }

  /* ---- mensajes de clientes ---- */
  onMessage(id, m) {
    const p = this.players.get(id); if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'join': {
        if (p.joined) return;
        p.cid = typeof m.cid === 'string' ? m.cid.replace(/[^a-z0-9]/gi, '').slice(0, 32) : '';
        if (this.isBanned(p.acct, p.cid)) { p.send({ t: 'kicked', again: 1, n: 2, left: this.kickLeft() }); if (this.o.onKick) this.o.onKick(p.id); return; }
        // si la sala estaba vacía, el primero que entra arranca una partida nueva
        if (this.o.online && this.humanCount(false) === 0 && (this.left < this.o.timelimit - 5 || this.state !== 'play')) this.restart(this.W.id);
        // el primero que entra a una sala vacía elige la dificultad de los bots
        if (this.o.online && this.humanCount(false) === 0 && Number.isInteger(m.skill) && m.skill >= 0 && m.skill < SKILL.length) this.o.botSkill = m.skill;
        p.name = this.uniqueName(cleanName(m.name));
        p.skin = cleanSkin(m.skin || { c: m.color }, p.skin); p.color = p.skin.c;
        if (this.mode.teams) this.setTeam(p, this.pickTeam(p));
        p.joined = true; p.joinT = this.time; p.kills = 0; p.dmg = 0; p.bestLife = 0;
        if (this.mode.tdm && this.o.online && this.humanCount(false) <= 1 && Number.isInteger(m.fl) && m.fl >= 5 && m.fl <= 500) this.o.fraglimit = m.fl;
        p.send({ t: 'welcome', id, mode: this.o.mode, mp: this.mode.minPlayers || 0, team: p.team, map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), ity: this.items.map(it => it.type), fl: this.mode.teamLimit || this.o.fraglimit, cl: this.o.caplimit, tl: Math.ceil(this.left), roster: this.roster(), online: this.o.online, state: this.state, tm: this.time, fs: this.flagState(), ts: this.ts, sh: this.shards.map(s => [s.id, r3(s.x), r3(s.y), r3(s.z), r2(s.t)]), mv: this.voteState() });
        this.bcast({ t: 'ev', e: 'join', id, n: p.name, c: p.color, s: p.skin, tm: p.team }, id);
        this.spawn(p); this.botT = 0; this.sendScores();
        break;
      }
      case 'st': {
        if (!p.joined || !p.alive) return;
        const a = m.p, v = m.v;
        if (!Array.isArray(a) || a.length !== 3 || !a.every(Number.isFinite)) return;
        p.s.x = clamp(a[0], -60, 60); p.s.y = clamp(a[1], -40, 60); p.s.z = clamp(a[2], -60, 60);
        if (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) { p.s.vx = clamp(v[0], -80, 80); p.s.vy = clamp(v[1], -80, 80); p.s.vz = clamp(v[2], -80, 80); }
        if (Number.isFinite(m.y)) p.yaw = m.y; if (Number.isFinite(m.x)) p.pitch = clamp(m.x, -1.6, 1.6);
        if (Number.isInteger(m.w) && m.w >= 0 && m.w < NW && p.ow[m.w]) p.w = m.w;
        p.s.on = !!m.o; p.s.crouch = !!m.c;
        break;
      }
      case 'fire': this.humanFire(p, m); break;
      case 'reload': { const w = m.w | 0, W_ = WEAPONS[w]; if (W_ && W_.mag && p.alive && p.mag[w] < W_.mag && !(p.relT[w] > this.time)) p.relT[w] = this.time + W_.reload * .75; break; }
      case 'buy': this.buy(p, String(m.id || '')); break;
      case 'skin': {
        if (!p.joined) return;
        p.skin = cleanSkin(m.s, p.skin); if (!this.mode.teams) p.color = p.skin.c;
        this.bcast({ t: 'ev', e: 'skin', id: p.id, s: p.skin });
        break;
      }
      case 'respawn': if (p.joined && !p.alive && p.deadT > 3 && this.live()) this.spawn(p); break;
      case 'limit': {
        const n = m.n | 0;
        if (!this.mode.tdm || n < 5 || n > 500 || (this.o.online && this.state === 'play')) return;
        this.o.fraglimit = n; this.bcast({ t: 'ev', e: 'sys', m: p.name + ' puso el límite en ' + n + ' bajas' }); this.sendScores();
        break;
      }
      case 'ping': p.send({ t: 'pong', c: m.c, tm: this.time }); if (Number.isFinite(m.r)) p.ping = Math.round(clamp(m.r, 0, 9999)); break;
      case 'chat': {
        const txt = String(m.m || '').replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f]/g, '').replace(/ {2,}/g, ' ').slice(0, 1000).trim();
        if (!txt) return;
        if (txt[0] === '/') this.command(p, txt); else this.bcast({ t: 'ev', e: 'chat', id: p.id, n: p.name, m: censor(txt) });
        break;
      }
      case 'cfg': if (!this.o.online) this.configure(m); break;
      case 'kick': this.startKick(p, m.id | 0); break;
      case 'grab': this.grab(p); break;
      case 'ready': if (this.state === 'inter' && p.joined && !p.bot && !p.ready) { p.ready = true; this.checkReady(); } break;
      case 'vote': this.castVote(p, !!m.y); break;
      case 'mapvote': this.castMapVote(p, String(m.m || '')); break;
    }
  }
  // E: cambiar tu arma principal por la que está tirada al lado (como en CS); al reaparecer volvés a tener la comprada
  grab(p) {
    if (!p.alive || !p.joined || this.mode.gg || !this.live()) return;
    let best = null, bd = 2.2;
    for (const it of this.items) {
      const info = ITEMS[it.type]; if (!it.up || it.off || !info || info.weapon == null || !isPrimary(info.weapon) || p.ow[info.weapon]) continue;
      const d = Math.hypot(p.s.x - it.x, p.s.z - it.z); if (d < bd && Math.abs(p.s.y - it.y) < 1.6) { bd = d; best = it; }
    }
    if (!best) return;
    const info = ITEMS[best.type], old = primaryOf(p.ow);
    setPrimary(p, info.weapon); p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n); p.dirty = true;
    // si tenías un arma principal (que no sea la escopeta de base), queda tirada en el lugar de la que agarraste
    if (old >= 0 && old !== 1 && ITEMS['w' + old]) {
      best.type = 'w' + old;
      this.bcast({ t: 'ev', e: 'item', i: best.i, up: 1, ty: best.type, sw: 1, by: p.id });
    } else {
      best.up = false; best.t = info.respawn;
      this.bcast({ t: 'ev', e: 'item', i: best.i, up: 0, by: p.id });
    }
    if (p.send) p.send({ t: 'ev', e: 'grab', w: info.weapon });
  }
  // fin de partida: si todas las personas apretaron "Jugar de nuevo", arranca la próxima sin esperar
  checkReady() {
    if (this.state !== 'inter') return;
    const hs = [...this.players.values()].filter(q => q.joined && !q.bot), n = hs.filter(q => q.ready).length;
    this.bcast({ t: 'ready', n, of: hs.length });
    if (hs.length && n >= hs.length) this.interT = Math.min(this.interT, .6);
  }
  /* ---- votación para echar a un jugador (solo online, entre personas) ---- */
  voters(except) { return [...this.players.values()].filter(q => q.joined && !q.bot && q !== except); }
  startKick(p, id) {
    const say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (!this.o.online) return say('La votación es solo en partidas online');
    if (this.vote) return say('Ya hay una votación en curso');
    const t = this.players.get(id);
    if (!t || !t.joined || t.bot || t === p) return say('Elegí a otro jugador (los bots se sacan con /bots)');
    if (this.voters(t).length < 2) return say('Hacen falta al menos 3 jugadores para votar');
    if ((p.voteCd || 0) > this.time) return say('Esperá ' + Math.ceil(p.voteCd - this.time) + ' s para iniciar otra votación');
    p.voteCd = this.time + 90;
    this.vote = { target: t.id, name: t.name, by: p.name, yes: new Set([p.id]), no: new Set(), end: this.time + 30 };
    this.bcast({ t: 'ev', e: 'sys', m: p.name + ' inició una votación para echar a ' + t.name + ' (Y = sí · N = no)' });
    this.sendVote();
  }
  castVote(p, yes) {
    const v = this.vote; if (!v || !p.joined || p.bot || p.id === v.target) return;
    v.yes.delete(p.id); v.no.delete(p.id); (yes ? v.yes : v.no).add(p.id);
    this.sendVote(); this.checkVote();
  }
  sendVote() {
    const v = this.vote;
    if (!v) { this.bcast({ t: 'vote', on: 0 }); return; }
    const el = this.voters(this.players.get(v.target)).length, need = Math.floor(el / 2) + 1;
    for (const q of this.players.values()) if (q.send && q.joined)
      q.send({ t: 'vote', on: 1, target: v.target, name: v.name, by: v.by, y: v.yes.size, n: v.no.size, need, left: Math.max(0, Math.ceil(v.end - this.time)), me: q.id === v.target ? 2 : v.yes.has(q.id) ? 1 : v.no.has(q.id) ? -1 : 0 });
  }
  checkVote() {
    const v = this.vote; if (!v) return;
    const t = this.players.get(v.target);
    if (!t) { this.vote = null; this.bcast({ t: 'ev', e: 'sys', m: v.name + ' se fue: votación cancelada' }); this.sendVote(); return; }
    const el = this.voters(t), ids = new Set(el.map(q => q.id));
    for (const s of [v.yes, v.no]) for (const id of [...s]) if (!ids.has(id)) s.delete(id);
    const need = Math.floor(el.length / 2) + 1;
    if (v.yes.size >= need) {
      this.vote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: t.name + ' fue echado de la partida por votación' });
      // primera echada en esta partida: puede volver a entrar. Segunda: no entra hasta que termine la partida.
      // Se lo reconoce por su cuenta de Google o por su navegador; NO por IP ni por nombre
      // (varios amigos en el mismo wifi comparten IP, y muchos se llaman "Jugador")
      const keys = []; if (t.acct) keys.push('a:' + t.acct); if (t.cid) keys.push('c:' + t.cid);
      let n = 1; for (const k of keys) n = Math.max(n, (this.kickN.get(k) || 0) + 1);
      for (const k of keys) this.kickN.set(k, n);
      if (n >= 2) for (const k of keys) this.bans.set(k, 1);
      if (t.send) t.send({ t: 'kicked', n: Math.min(n, 2), left: this.kickLeft() });
      if (this.o.onKick) this.o.onKick(t.id); else this.removeClient(t.id);
      return;
    }
    if (v.no.size > el.length - need || this.time >= v.end) {
      this.vote = null; this.sendVote();
      this.bcast({ t: 'ev', e: 'sys', m: 'La votación para echar a ' + v.name + ' no pasó (' + v.yes.size + ' sí, ' + v.no.size + ' no)' });
    }
  }
  // segundos que faltan para que termine la partida (cuando termina se levantan los bloqueos)
  kickLeft() { return this.state === 'play' ? Math.max(0, Math.ceil(this.left)) : 0; }
  isBanned(acct, cid) {
    return !!((acct && this.bans.has('a:' + acct)) || (cid && this.bans.has('c:' + cid)));
  }
  uniqueName(n) { let name = n, k = 2; const used = new Set([...this.players.values()].filter(p => p.joined).map(p => p.name)); while (used.has(name)) name = n.slice(0, 13) + ' ' + (k++); return name; }
  configure(m) {
    if (m.bots !== undefined) this.o.bots = m.bots === null ? null : clamp(m.bots | 0, 0, 15);
    if (m.skill !== undefined) this.o.botSkill = clamp(m.skill | 0, 0, 3);
    if (m.fl !== undefined) { this.o.fraglimit = clamp(m.fl | 0, 1, 200); this.sendScores(); }
    if (m.map !== undefined) m.map = mapId(m.map);
    if (m.map !== undefined && this.mode.maps.includes(m.map) && m.map !== this.W.id) { this.o.map = m.map; this.restart(m.map); }
    this.botT = 0;
  }
  command(p, txt) {
    const parts = txt.slice(1).split(/\s+/), cmd = parts[0], arg = cmd === 'map' ? mapId(parts[1]) : parts[1];
    const say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (cmd === 'kick' || cmd === 'echar') {
      const q = parts.slice(1).join(' ').toLowerCase(), t = [...this.players.values()].find(x => x.joined && !x.bot && x.name.toLowerCase() === q) || [...this.players.values()].find(x => x.joined && !x.bot && q && x.name.toLowerCase().startsWith(q));
      if (!t) return say('Uso: /echar NOMBRE (o desde el menú de pausa)');
      return this.startKick(p, t.id);
    }
    if (cmd === 'si' || cmd === 'sí' || cmd === 'no') return this.castVote(p, cmd !== 'no');
    if (cmd === 'bots') {
      if (arg === 'auto') { this.o.bots = null; this.bcast({ t: 'ev', e: 'sys', m: p.name + ' activó el relleno automático de bots' }); }
      else if (/^\d+$/.test(arg || '')) { this.o.bots = clamp(+arg, 0, 15); this.bcast({ t: 'ev', e: 'sys', m: p.name + ' puso ' + this.o.bots + ' bots' }); }
      else say('Uso: /bots 0-15 o /bots auto');
      this.botT = 0;
    } else if (cmd === 'skill' && /^[0-3]$/.test(arg || '')) { this.o.botSkill = +arg; this.bcast({ t: 'ev', e: 'sys', m: 'Dificultad de bots: ' + SKILL[+arg].name }); }
    else if (cmd === 'fraglimit' && /^\d+$/.test(arg || '')) { this.o.fraglimit = clamp(+arg, 1, 200); this.sendScores(); this.bcast({ t: 'ev', e: 'sys', m: 'Límite de frags: ' + this.o.fraglimit }); }
    else if (cmd === 'caplimit' && this.mode.ctf && /^\d+$/.test(arg || '')) { this.o.caplimit = clamp(+arg, 1, 50); this.sendScores(); this.bcast({ t: 'ev', e: 'sys', m: 'Capturas para ganar: ' + this.o.caplimit }); }
    else if (cmd === 'map') {
      if (this.mode.maps.includes(arg)) { this.bcast({ t: 'ev', e: 'sys', m: p.name + ' cambió el mapa a ' + MAPS[arg].name }); this.restart(arg); }
      else say('Mapas de ' + this.mode.name + ': ' + this.mode.maps.join(', '));
    }
    else if (cmd === 'restart') { this.bcast({ t: 'ev', e: 'sys', m: p.name + ' reinició la partida' }); this.restart(); }
    else say('Comandos: /echar NOMBRE · /bots N · /bots auto · /skill 0-3 · ' + (this.mode.ctf ? '/caplimit N' : '/fraglimit N') + ' · /map ' + this.mode.maps.join('|') + ' · /restart');
  }

