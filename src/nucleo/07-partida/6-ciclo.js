  /* ---- partida ---- */
  scores() {
    const gg = this.mode.gg;
    return [...this.players.values()].filter(p => p.joined)
      .sort((a, b) => (gg ? b.lvl - a.lvl : 0) || (this.mode.teams ? b.caps - a.caps : 0) || b.kills - a.kills || (this.mode.crown ? b.ctime - a.ctime : 0) || a.deaths - b.deaths)
      .map(p => [p.id, p.name, p.kills, p.deaths, p.bot ? 0 : p.ping, p.bot ? 1 : 0, p.color, p.cr, p.lvl, p.team, p.caps, p.plvl, Math.round(p.dmg || 0), p.cpts || 0, Math.round(p.ctime || 0)]);
  }
  sendScores() { this.bcast({ t: 'sc', l: this.scores(), tl: Math.max(0, Math.ceil(this.left)), fl: this.mode.teamLimit || this.o.fraglimit, cl: this.o.caplimit, st: this.state, map: this.W.id, mode: this.o.mode, ts: this.ts, fs: this.flagState(), cd: Math.ceil(this.countT), hn: this.humanCount(false), mp: this.mode.minPlayers || 0, cw: this.crownState(), dm: this.domState(), mn: this.domMinState(), iu: this.items.map(it => it.up ? 1 : 0).join('') }); }   // iu: qué ítems están en pie; el cliente se resincroniza cada segundo, así un botiquín nunca queda "desaparecido" por un aviso perdido
  endMatch() {
    if (this.state !== 'play') return;
    this.state = 'inter'; this.interT = 25;
    this.bans.clear(); this.kickN.clear(); // la partida terminó: los echados pueden volver y se empieza la cuenta de cero
    const l = this.scores(), ms = this.mode.maps;
    // el próximo mapa se vota en la pantalla final; si nadie vota, sale uno al azar
    this.mapVotes.clear();
    this.voteOpts = this.o.rotate && ms.length > 1 ? ms.slice() : null;
    const next = this.voteOpts ? null : this.W.id;
    this.nextMap = next;
    // equipo ganador: en Captura el dominio lo dicen los bosses; en el resto, el marcador
    const wt = !this.mode.teams ? -1 : this.dom ? this.domWinner() : this.ts[0] === this.ts[1] ? -1 : this.ts[0] > this.ts[1] ? 0 : 1;
    let w = l.length ? l[0][1] : '';
    if (this.mode.teams) w = wt < 0 ? '' : 'EQUIPO ' + TEAMS[wt].name.toUpperCase();
    // experiencia para los que tienen cuenta
    if (this.o.onXP) {
      for (const p of this.players.values()) {
        if (!p.joined || p.bot || !p.acct) continue;
        const won = this.mode.teams ? p.team === wt : !!(l.length && l[0][0] === p.id);
        const xp = this.matchXP(p, true, won);
        if (xp > 0) this.o.onXP(p, xp, { kills: p.rkills, partida: 1, victoria: won ? 1 : 0 });
      }
    }
    if (this.dom) { this.dom.orbs.length = 0; this.dom.zones.length = 0; }
    this.bcast({ t: 'end', l, w, wt, dw: this.domSummary(), dm: this.domState(), ts: this.ts, next, nextName: next ? MAPS[next].name : '', mv: this.voteState(), secs: this.interT });
    this.projs.length = 0;
  }
  // resultado de la votación: el más votado; empate entre los más votados o sin votos → al azar
  voteWinner() {
    const o = this.voteOpts; if (!o) return null;
    const c = this.voteCounts(); let best = 0; for (const id of o) best = Math.max(best, c[id]);
    const pool = best ? o.filter(id => c[id] === best) : o;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  voteCounts() { const c = {}; for (const id of this.voteOpts || []) c[id] = 0; for (const [pid, id] of this.mapVotes) if (this.players.has(pid) && c[id] != null) c[id]++; return c; }
  voteState() { return this.voteOpts && this.state === 'inter' ? { o: this.voteOpts.map(id => [id, MAPS[id].name]), c: this.voteCounts() } : null; }
  castMapVote(p, id) {
    if (this.state !== 'inter' || !this.voteOpts || !this.voteOpts.includes(id) || !p.joined || p.bot) return;
    this.mapVotes.set(p.id, id);
    const st = this.voteState();
    for (const q of this.players.values()) if (q.send && q.joined) q.send({ t: 'mv', o: st.o, c: st.c, me: this.mapVotes.get(q.id) || null });
  }
  restart(mapId) {
    if (this.mvote) { this.mvote = null; this.sendVote(); }
    this.bans.clear(); this.kickN.clear();
    if (!mapId && !this.nextMap && this.voteOpts) this.nextMap = this.voteWinner();
    this.voteOpts = null; this.mapVotes.clear();
    for (const s of this.shards) this.bcast({ t: 'ev', e: 'shx', id: s.id }); this.shards.length = 0;
    if (this.crown) { this.crown = null; this.bcast({ t: 'ev', e: 'crw', a: 'off' }); }
    if (this.storm) { this.storm = null; this.bcast({ t: 'ev', e: 'stm', a: 'off' }); }
    const id = mapId || this.nextMap || this.W.id; this.nextMap = null;
    if (id !== this.W.id) this.setMap(id); else { this.resetFlags(); this.domSetup(); this.domMinSetup(); }
    this.state = 'play'; this.left = this.o.timelimit; this.projs.length = 0;
    if (this.mode.minPlayers && this.o.online && this.humanCount(false) < this.mode.minPlayers) this.state = 'lobby';
    for (const it of this.items) { it.up = !it.off; it.t = 0; it.type = it.base; }
    this.bcast({ t: 'start', map: this.W.id, items: this.items.map(it => it.up ? 1 : 0), ity: this.items.map(it => it.type), tm: this.time, fs: this.flagState(), ts: this.ts, dm: this.domState(), mn: this.domMinState() });
    for (const p of this.players.values()) if (p.joined) {
      p.ready = false; p.kills = 0; p.deaths = 0; p.cr = ECON.START; p.unl = OW0(); p.eq = 1; p.perk = { ar: 0, am: 0 }; p.cards = []; p.cof = null; p.cofT = 0; p.burnT = 0; p.streak = 0; p.lvl = 0; p.caps = 0; p.rkills = 0; p.cpts = 0; p.ctime = 0; p.stormT = 0; p.dmg = 0; p.bestLife = 0; p.lifeT0 = p.alive ? this.time : null; p.joinT = this.time; p.dirty = true;
      this.spawn(p);
    }
    this.sendScores();
  }
  manageBots() {
    const want = this.o.bots != null ? this.o.bots : Math.max(0, this.o.botFill - this.humanCount(false));
    const bots = [...this.players.values()].filter(p => p.bot);
    if (bots.length < want && this.players.size < this.o.maxPlayers) {
      const used = new Set([...this.players.values()].map(p => p.name));
      const free = BOT_NAMES.filter(n => !used.has(n));
      const name = free.length ? free[Math.floor(Math.random() * free.length)] : 'Bot ' + this.nextId;
      const id = this.nextId++;
      const usedC = new Set([...this.players.values()].map(p => p.color));
      const freeC = COLORS.filter(c => !usedC.has(c));
      const skin = { c: freeC.length ? freeC[Math.floor(Math.random() * freeC.length)] : COLORS[id % COLORS.length], v: COLORS[Math.floor(Math.random() * COLORS.length)], a: Math.floor(Math.random() * ACCESSORIES.length) };
      const p = this.newPlayer(id, name, skin, true);
      if (this.mode.teams) this.setTeam(p, this.pickTeam(p));
      p.joined = true; this.players.set(id, p);
      this.bcast({ t: 'ev', e: 'join', id, n: name, c: p.color, s: skin, bot: 1, tm: p.team });
      this.spawn(p); this.sendScores();
    } else if (bots.length > want) {
      let b = bots[bots.length - 1];
      if (this.mode.teams) { const big = this.teamCount(0) >= this.teamCount(1) ? 0 : 1; b = bots.filter(q => q.team === big).pop() || b; }
      this.dropCarried(b);
      this.players.delete(b.id);
      this.bcast({ t: 'ev', e: 'leave', id: b.id, n: b.name, bot: 1 });
      this.sendScores();
    } else if (this.mode.teams) {
      // equilibrar equipos pasando un bot del equipo más grande
      const a = this.teamCount(0), b = this.teamCount(1);
      if (Math.abs(a - b) >= 2) {
        const big = a > b ? 0 : 1, bot = bots.find(q => q.team === big && !this.flags.some(f => f.st === 1 && f.by === q.id));
        if (bot) { this.setTeam(bot, 1 - big); this.bcast({ t: 'ev', e: 'team', id: bot.id, tm: bot.team, c: bot.color }); if (bot.alive) this.spawn(bot); this.sendScores(); }
      }
    }
  }
  tick(dt) {
    this.time += dt; this.planBudget = 1;
    // historial de posiciones del último 0,7 s para la compensación de lag (cada 2 ticks)
    if (this.o.online && (this.histN = (this.histN || 0) + 1) % 2 === 0)
      for (const q of this.players.values()) { if (!q.alive) { if (q.hist) q.hist.length = 0; continue; } const h = q.hist || (q.hist = []); h.push([this.time, q.s.x, q.s.y, q.s.z]); if (h.length > 14) h.shift(); }
    updateMovers(this.W, this.time);
    if (this.state === 'inter') {
      this.interT -= dt;
      // se prepara la navegación de los mapas candidatos de a uno mientras se ve la tabla final
      if (this.interT < 23) { const c = (this.voteOpts || [this.nextMap]).find(id => id && !NAVS[id]); if (c) getNav(MAPS[c]); }
      if (this.interT <= 0) this.restart();
    } else if (this.state === 'lobby') {
      if (this.humanCount(false) >= this.mode.minPlayers) { this.state = 'count'; this.countT = 6; this.bcast({ t: 'ev', e: 'sys', m: '¡Ya son ' + this.humanCount(false) + '! El Team Deathmatch arranca en 6 segundos' }); this.sendScores(); }
    } else if (this.state === 'count') {
      if (this.humanCount(false) < this.mode.minPlayers) { this.state = 'lobby'; this.countT = 0; this.sendScores(); }
      else { const before = Math.ceil(this.countT); this.countT -= dt; if (Math.ceil(this.countT) !== before) this.sendScores(); if (this.countT <= 0) { this.countT = 0; this.restart(this.W.id); } }
    } else {
      this.left -= dt;
      if (this.left <= 0) { this.left = 0; this.endMatch(); }
    }
    this.botT -= dt;
    if (this.botT <= 0) { this.botT = .5; this.manageBots(); }
    for (const p of this.players.values()) {
      if (!p.joined) continue;
      if (!p.alive) {
        p.deadT += dt;
        if (p.bot && p.deadT > 1.6 && this.live()) this.spawn(p);
        else if (!p.bot && p.deadT > (this.state === 'play' ? 4.5 : 2) && this.live()) this.spawn(p);
        continue;
      }
      if (!this.live()) continue;
      if (p.bot) this.botThink(p, dt);
      if (p.quadT > 0) { p.quadT -= dt; if (p.quadT <= 0) { p.quadT = 0; p.dirty = true; } }
      if (p.hp > 100) { p.megaT += dt; if (p.megaT >= .5) { p.megaT -= .5; p.hp--; p.dirty = true; } }
      const tr = triggers(this.W, p.s);
      if (tr.lava && !tr.water) { p.lavaT -= dt; if (p.lavaT <= 0) { p.lavaT = .25; this.damage(p, tr.lava * .25, null, null, null, 0, 'lava'); } }
      else p.lavaT = 0;
      if (tr.water) this.damage(p, 999, null, null, null, 0, 'water');
      if (p.alive && p.s.y < K.KILLY) this.damage(p, 999, null, null, null, 0, 'void');
    }
    if (this.mvote) { this.mvT = (this.mvT || 0) - dt; if (this.mvT <= 0) { this.mvT = 1; this.checkMapVote(); if (this.mvote) this.sendVote(); } }
    if (this.vote) { this.voteT = (this.voteT || 0) - dt; if (this.voteT <= 0) { this.voteT = 1; this.checkVote(); if (this.vote) this.sendVote(); } }
    if (this.live()) { this.tickProjs(dt); this.tickFires(dt); this.tickItems(dt); this.tickShards(dt); this.tickBurn(dt); if (this.mode.cards) this.tickCards(dt); if (this.mode.crown) this.tickCrown(dt); if (this.mode.storm) this.tickStorm(dt); if (this.flags.length && this.state === 'play') this.tickFlags(dt); if (this.dom) { this.tickDom(dt); this.tickMins(dt); } }
    this.snapT -= dt;
    if (this.snapT <= 1e-6) { this.snapT += .05; if (this.snapT < 0) this.snapT = 0; this.snapshot(); }
    this.scT -= dt;
    if (this.scT <= 0) { this.scT = 1; this.sendScores(); }
  }
  snapshot() {
    const ps = [];
    for (const p of this.players.values()) {
      if (!p.joined) continue;
      ps.push([p.id, r2(p.s.x), r2(p.s.y), r2(p.s.z), r2(p.yaw), r2(p.pitch), p.w, (p.alive ? 1 : 0) | (p.quadT > 0 ? 2 : 0) | (p.s.on ? 4 : 0) | (p.s.crouch ? 8 : 0) | (p.s.slide ? 16 : 0), r2(p.s.vx), r2(p.s.vy), r2(p.s.vz)]);
      if (p.bot && p.ai && this.flags.length && !p.alive) p.ai.path = null;
    }
    const sn = { t: 'sn', tm: Math.round(this.time * 1000) / 1000, ps };
    if (this.dom) {   // Captura el dominio: solo viaja lo que cambió (vida y giro de los bosses, vida de generadores, orbes)
      // bs por boss: vida, giro, ataque, etapa y lo que le queda a la etapa (en décimas). Se manda solo cuando
      // cambia algo que se note, así un boss quieto no gasta red
      const d = this.dom, bs = d.boss.map(b => [Math.ceil(b.hp), r2(b.yaw), b.atk, b.ph, Math.round(b.t * 10)]);
      const key = d.boss.map(b => Math.ceil(b.hp) + ',' + Math.round(b.yaw * 12) + ',' + b.atk + b.ph).join();
      if (key !== d.bsKey) { d.bsKey = key; sn.bs = bs; }
      if (d.dirtyG.size) { sn.gh = [...d.dirtyG].map(i => [i, Math.ceil(d.gens[i].hp)]); d.dirtyG.clear(); }
      if (d.orbs.length) sn.ob = d.orbs.map(o => [o.id, r2(o.x), r2(o.y), r2(o.z), o.team]);
      // minions: cada dos snapshots (10 por segundo) y solo si alguno se movió o cambió
      if (d.mins && d.mins.length) { d.minN = (d.minN || 0) + 1; if (d.minN % 2 === 0) { const mn = this.domMinState(true); if (mn) sn.mn = mn; } }
    }
    this.bcast(sn);
    for (const p of this.players.values()) {
      if (p.bot || !p.send || !p.joined || !p.dirty) continue;
      p.dirty = false;
      p.send({ t: 'you', hp: Math.ceil(p.hp), ar: Math.ceil(p.ar), am: Object.assign({}, p.am), ow: p.ow.slice(), q: Math.ceil(p.quadT), al: p.alive ? 1 : 0, cr: p.cr, unl: p.unl.slice(), perk: Object.assign({}, p.perk), lvl: p.lvl, ck: this.mode.cards ? p.rkills : 0 });
    }
  }

  /* =====================================================================
     BOTS
     ===================================================================== */
