  /* =====================================================================
     CAPTURA EL DOMINIO — solo los modos con `dom` (constantes en DOM, 01-datos.js)
     Todo es del servidor: generadores, barreras, bosses, ataques y quién gana. El cliente solo dibuja.
     this.dom = { gens, bars, boss, orbs, zones, stat } ; stat[equipo] = lo que ESE equipo le rompió al rival.
     Estado de una barrera: 0 activa · 1 debilitada (cayó un generador) · 2 caída.
     Ataques del boss (b.atk): 1 latigazo · 2 agarre · 3 pulso · 4 orbes · 5 zona.
     ===================================================================== */
  domSetup() {
    this.dom = null;
    const M = MAPS[this.W.id];
    if (!this.mode.dom || !M.bars) return;
    // cada partida tiene su copia de las barreras: el estado no se comparte entre salas
    this.W = Object.assign({}, M, { brushes: M.brushes.map(b => b.bar ? Object.assign({}, b, { bar: Object.assign({}, b.bar, { down: false }) }) : b) });
    this.dom = {
      gens: M.gens.map(g => ({ team: g.team, lane: g.lane, x: g.x, y: g.y, z: g.z, atk: g.atk, hp: DOM.GEN_HP })),
      bars: M.bars.map(b => ({ team: b.team, lane: b.lane, st: 0, t: 0 })),
      boss: M.bosses.map((b, t) => ({ team: t, x: b.x, y: b.y, z: b.z, yaw: b.yaw, yaw0: b.yaw, hp: DOM.BOSS_HP, atk: 0, t: 0, cd: 4, tgt: 0, p: null, think: 0, seen: [], rage: -1, alertT: -99, hurtBy: 0 })),
      orbs: [], zones: [], oid: 1, stat: [{ bars: 0, gens: 0, dmg: 0 }, { bars: 0, gens: 0, dmg: 0 }], first: [false, false], dirtyG: new Set(), bsKey: '', win: null, why: '', ban: [null, null]
    };
  }
  domState() { const d = this.dom; return d ? { g: d.gens.map(g => Math.ceil(g.hp)), b: d.bars.map(b => b.st), h: d.boss.map(b => Math.ceil(b.hp)) } : null; }
  domEv(m) { m.t = 'ev'; m.e = 'dom'; this.bcast(m); }
  // qué barreras tiene cerradas un equipo (para la navegación de los bots)
  domBan(team) {
    const d = this.dom; if (!d) return null;
    if (!d.ban[team]) { const a = new Uint8Array(d.bars.length + 1); d.bars.forEach((b, i) => { if (b.team !== team && b.st < 2) a[i + 1] = 1; }); d.ban[team] = a; }
    return d.ban[team];
  }
  // daño a un generador ('g') o a un boss ('b'). Devuelve lo que de verdad le sacó
  domHit(att, kind, i, amt, core) {
    const d = this.dom; if (!d || this.state !== 'play' || !att || att.team < 0 || !(amt > 0)) return 0;
    amt = Math.min(amt, DOM.HIT_CAP * this.mult(att));
    if (hasCard(att, 'carnicero')) amt *= CARD_FX.DMG;
    if (kind === 'g') {
      const g = d.gens[i]; if (!g || g.hp <= 0 || g.team === att.team) return 0;
      const real = Math.min(g.hp, amt); g.hp -= real; d.dirtyG.add(i);
      this.domPay(att, real, false);
      if (att.send) att.send({ t: 'ev', e: 'hit', id: -1 - i, n: Math.round(real), k: g.hp <= 0 ? 1 : 0, h: 0 });
      if (g.hp <= 0) this.domGenDown(i, att);
      return real;
    }
    const b = d.boss[i]; if (!b || b.hp <= 0 || b.team === att.team) return 0;
    if (core) amt *= DOM.CORE_MULT;
    const real = Math.min(b.hp, amt); b.hp -= real; b.hurtBy = att.id;
    this.domPay(att, real, true);
    if (att.send) att.send({ t: 'ev', e: 'hit', id: -101 - i, n: Math.round(real), k: b.hp <= 0 ? 1 : 0, h: core ? 1 : 0 });
    if (this.time - b.alertT > DOM.ALERT_EVERY) { b.alertT = this.time; this.domEv({ a: 'alert', b: i }); }
    if (b.hp <= 0) this.domBossDown(i, att);
    return real;
  }
  domPay(att, real, boss) {
    this.dom.stat[att.team].dmg += real; att.dmg = (att.dmg || 0) + real;
    att.domAcc = (att.domAcc || 0) + real;
    if (att.domAcc >= DOM.PAY.STEP) { const n = Math.floor(att.domAcc / DOM.PAY.STEP); att.domAcc -= n * DOM.PAY.STEP; this.credit(att, n * (boss ? DOM.PAY.BOSS_HIT : DOM.PAY.GEN_HIT), boss ? 'daño al boss' : 'daño al generador'); }
  }
  domGenDown(i, att) {
    const d = this.dom, g = d.gens[i];
    g.hp = 0; d.stat[1 - g.team].gens++;
    if (att) { att.caps++; this.credit(att, DOM.PAY.GEN, 'generador destruido'); }
    this.domEv({ a: 'gen', i, id: att ? att.id : 0, n: att ? att.name : '', first: d.first[g.team] ? 0 : 1 });
    d.first[g.team] = true;
    const bi = d.bars.findIndex(b => b.team === g.team && b.lane === g.lane), bar = d.bars[bi];
    if (!bar || bar.st === 2) return;
    const dead = d.gens.filter(q => q.team === g.team && q.lane === g.lane && q.hp <= 0).length;
    this.domBarSet(bi, dead >= DOM.BAR_NEED ? 2 : 1, att);
    this.sendScores();
  }
  domBarSet(bi, st, att) {
    const d = this.dom, bar = d.bars[bi]; if (!bar || bar.st === st) return;
    const fell = st === 2 && bar.st !== 2;
    bar.st = st; bar.t = fell ? DOM.BAR_REARM : 0;
    for (const b of this.W.brushes) if (b.bar && b.bar.i === bi) b.bar.down = st === 2;
    d.ban = [null, null];
    if (fell) {
      d.stat[1 - bar.team].bars++;
      for (const q of this.players.values()) if (q.joined && q.team === 1 - bar.team) this.credit(q, q === att ? DOM.PAY.BAR : DOM.PAY.BAR_TEAM, 'ruta ' + DOM.LANES[bar.lane] + ' abierta');
      d.boss[bar.team].rage = bar.lane;
    }
    for (const q of this.players.values()) if (q.bot && q.ai) q.ai.replan = 0;
    this.domEv({ a: 'bar', i: bi, st, n: att ? att.name : '' });
  }
  domBossDown(t, att) {
    const d = this.dom, b = d.boss[t];
    b.hp = 0; b.atk = 0; d.win = 1 - t; d.why = 'boss';
    if (att) { att.caps += 3; this.credit(att, DOM.PAY.BOSS_KILL, 'mataste al boss'); }
    this.domEv({ a: 'bossdown', b: t, id: att ? att.id : 0, n: att ? att.name : '' });
    this.endMatch();
  }
  /* quién gana: el que mató al boss rival. Por tiempo: el que más vida porcentual le sacó al boss rival;
     después más barreras tiradas, más generadores rotos y más daño total. Si todo empata, -1. */
  domWinner() {
    const d = this.dom; if (!d) return -1;
    if (d.win != null) return d.win;
    const s = d.stat, cmp = [[d.boss[0].hp / DOM.BOSS_HP, d.boss[1].hp / DOM.BOSS_HP, 'vida del boss'], [s[1].bars, s[0].bars, 'barreras'], [s[1].gens, s[0].gens, 'generadores'], [Math.round(s[1].dmg), Math.round(s[0].dmg), 'daño']];
    // en cada fila: [valor del equipo 0, valor del equipo 1]; gana el que tiene MENOS (vida propia que le queda / lo que le rompieron)
    for (const [a, b, why] of cmp) if (Math.abs(a - b) > 1e-9) { d.why = why; return a < b ? 1 : 0; }
    d.why = 'empate'; return -1;
  }
  domSummary() { const d = this.dom; return d ? { why: d.why, hp: d.boss.map(b => Math.round(100 * b.hp / DOM.BOSS_HP)), bars: d.stat.map(s => s.bars), gens: d.stat.map(s => s.gens), dmg: d.stat.map(s => Math.round(s.dmg)) } : null; }
  // qué golpeó un disparo: un generador o un boss (con o sin núcleo). o/d: origen y dirección; h: resultado de raycast
  domStruct(o, d, h) {
    const dm = this.dom; if (!dm || !h || !h.b) return null;
    if (h.b.gen != null) return { kind: 'g', i: h.b.gen, core: false };
    if (h.b.boss != null) return { kind: 'b', i: h.b.boss, core: this.domCore(dm.boss[h.b.boss], o, d, h.t, 1) };
    return null;
  }
  // ¿el rayo pasa por el núcleo? Solo cuenta de frente (el núcleo está en el pecho)
  domCore(b, o, d, t, tol) {
    const f = dirFromAngles(b.yaw, 0);
    if (d[0] * f[0] + d[2] * f[2] > -.15) return false;
    const c = raySphere(o[0], o[1], o[2], d[0], d[1], d[2], b.x + f[0] * DOM.CORE_FWD, b.y + DOM.CORE_Y, b.z + f[2] * DOM.CORE_FWD, DOM.CORE_R * tol);
    return c >= 0 && c < t + 3;
  }
  // un jugador dice que le pegó a un generador (-1-i) o a un boss (-101-equipo): se valida con el mundo del servidor
  domClaim(p, o, d, id, n, hs, W_) {
    const dm = this.dom; if (!dm) return;
    const h = raycast(this.W, o[0], o[1], o[2], d[0], d[1], d[2], (W_.range || 300) + 3);
    const boss = id <= -101, i = boss ? -101 - id : -1 - id;
    // tolerancia: los perdigones se abren y el cliente apunta con su propio reloj; alcanza con que el tiro vaya a la estructura
    let ok = !!(h && h.b && (boss ? h.b.boss === i : h.b.gen === i));
    if (!ok) {
      const c = boss ? dm.boss[i] : dm.gens[i]; if (!c) return;
      const cy = c.y + (boss ? DOM.BOSS_H / 2 : 1.6), cx = c.x - o[0], cz = c.z - o[2], pr = cx * d[0] + (cy - o[1]) * d[1] + cz * d[2];
      if (pr < 0) return;
      const px = cx - d[0] * pr, py = (cy - o[1]) - d[1] * pr, pz = cz - d[2] * pr;
      if (Math.hypot(px, pz) > (boss ? DOM.BOSS_R : 1) + 1 + pr * .1 || Math.abs(py) > (boss ? DOM.BOSS_H / 2 : 1.6) + 1 + pr * .1) return;
      const far = h ? h.t : 1e9;   // nada macizo antes de llegar (una barrera rival frena el tiro)
      if (far < pr - (boss ? DOM.BOSS_R : 1) * 1.5 - 1) return;
      ok = true;
    }
    const core = boss && hs > 0 && this.domCore(dm.boss[i], o, d, h ? h.t : 1e9, 1.5);
    const dist = h ? h.t : 0;
    const dmg = W_.melee ? W_.dmg : W_.type === 'rail' ? W_.dmg : W_.head ? W_.dmg : n * W_.dmg * falloff(W_, dist);
    this.domHit(p, boss ? 'b' : 'g', i, dmg * this.mult(p), core);
  }
  // explosiones y fuego: daño de área a generadores y bosses rivales
  domBlast(own, x, y, z, rad, dmg, sfall, skip) {
    const dm = this.dom; if (!dm || !own || rad <= 0) return;
    const bd = (c, hx, hy) => Math.hypot(Math.max(0, Math.abs(x - c.x) - hx), Math.max(0, c.y - y, y - (c.y + hy)), Math.max(0, Math.abs(z - c.z) - hx));
    dm.gens.forEach((g, i) => { if (g.hp <= 0 || g.team === own.team || (skip && skip.kind === 'g' && skip.i === i)) return; const ds = bd(g, 1, 3.2); if (ds < rad) this.domHit(own, 'g', i, dmg * (1 - sfall * ds / rad), false); });
    dm.boss.forEach((b, i) => { if (b.hp <= 0 || b.team === own.team || (skip && skip.kind === 'b' && skip.i === i)) return; const ds = bd(b, DOM.BOSS_R, DOM.BOSS_H); if (ds < rad) this.domHit(own, 'b', i, dmg * (1 - sfall * ds / rad), false); });
  }
  /* ---- bosses ---- */
  domTargets(b) {
    const out = [];
    for (const t of this.players.values()) {
      if (!t.alive || !t.joined || t.team === b.team || t.team < 0) continue;
      if (Math.hypot(t.s.x - b.x, t.s.z - b.z) > DOM.BOSS_SEE) continue;
      if (!los(this.W, b.x, b.y + DOM.CORE_Y, b.z, t.s.x, t.s.y + 1, t.s.z) && !los(this.W, b.x, b.y + DOM.BOSS_H - 1, b.z, t.s.x, t.s.y + 1.6, t.s.z)) continue;
      out.push(t);
    }
    return out;
  }
  tickDom(dt) {
    const d = this.dom; if (!d || this.state !== 'play') return;
    for (const b of d.boss) { const prev = setPasa(b.team); try { this.tickBoss(b, dt); } finally { setPasa(prev); } if (this.state !== 'play') return; }
    this.tickOrbs(dt); if (this.state !== 'play') return;
    this.tickZones(dt);
    for (let i = 0; i < d.bars.length; i++) { const bar = d.bars[i]; if (bar.st === 2 && bar.t > 0) { bar.t -= dt; if (bar.t <= 0) { d.gens.forEach((g, k) => { if (g.team === bar.team && g.lane === bar.lane) { g.hp = DOM.GEN_HP; d.dirtyG.add(k); } }); this.domBarSet(i, 0, null); } } }
  }
  tickBoss(b, dt) {
    const d = this.dom; if (b.hp <= 0) return;
    b.think -= dt;
    if (b.think <= 0) { b.think = .25; b.seen = this.domTargets(b); }
    const ts = b.seen.filter(t => t.alive);
    if (b.atk) {   // avisando: no gira, así el ataque se puede esquivar
      b.t -= dt;
      if (b.t <= 0) { const k = b.atk; b.atk = 0; b.cd = (DOM.GCD[0] + Math.random() * (DOM.GCD[1] - DOM.GCD[0])) * (b.hp < DOM.ENRAGE * DOM.BOSS_HP ? DOM.ENRAGE_CD : 1); this.domResolve(b, k); }
      return;
    }
    if (b.rage >= 0) {   // se abrió un carril: castiga la entrada
      const g = MAPS[this.W.id].defPts[b.team][b.rage]; b.rage = -1;
      if (g) for (let k = 0; k < DOM.RAGE_ZONES; k++) this.domZone(b, g.x + (Math.random() - .5) * 8, g.y, g.z + (k - (DOM.RAGE_ZONES - 1) / 2) * 6, DOM.ZONE.warn + k * .5);
      this.domEv({ a: 'atk', b: b.team, k: 6, t: 1.5 });
    }
    let tg = ts.find(t => t.id === b.hurtBy) || ts.find(t => t.id === b.tgt) || null;
    if (!tg) for (const t of ts) if (!tg || Math.hypot(t.s.x - b.x, t.s.z - b.z) < Math.hypot(tg.s.x - b.x, tg.s.z - b.z)) tg = t;
    b.tgt = tg ? tg.id : 0;
    const want = tg ? Math.atan2(-(tg.s.x - b.x), -(tg.s.z - b.z)) : b.yaw0;
    let dy = want - b.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    b.yaw += clamp(dy, -DOM.BOSS_TURN * dt, DOM.BOSS_TURN * dt);
    b.cd -= dt;
    if (b.cd > 0 || !tg) return;
    const dist = Math.hypot(tg.s.x - b.x, tg.s.z - b.z), near = b.team === 0 ? 1 : 3, far = b.team === 0 ? 2 : 4, nr = b.team === 0 ? DOM.LASH.r : DOM.PULSE.r, r = Math.random();
    const k = dist < nr * .9 ? (r < .6 ? near : r < .8 ? 5 : far) : (r < .55 ? far : 5);
    b.atk = k; b.t = k === 5 ? .7 : DOM.WARN; b.p = [tg.s.x, tg.s.y, tg.s.z];
    if (k === 1) b.yaw = want;   // el latigazo sale hacia donde estaba el blanco al avisar
    if (k === 5) this.domZone(b, tg.s.x, tg.s.y, tg.s.z, DOM.ZONE.warn);
    this.domEv({ a: 'atk', b: b.team, k, t: r2(b.t), id: tg.id, y: r2(b.yaw) });
  }
  domZone(b, x, y, z, warn) {
    const fl = raycast(this.W, x, y + 1, z, 0, -1, 0, 12), fy = fl ? y + 1 - fl.t : y;
    this.dom.zones.push({ team: b.team, x, y: fy, z, r: DOM.ZONE.r, t: warn });
    this.domEv({ a: 'zone', b: b.team, p: r3a([x, fy, z]), r: DOM.ZONE.r, t: r2(warn) });
  }
  domHurt(b, t, amt, dir, kick) { this.damage(t, amt, null, null, dir, kick / amt, 'boss'); }
  domResolve(b, k) {
    const d = this.dom, hy = b.y + DOM.CORE_Y;
    const vis = t => los(this.W, b.x, hy, b.z, t.s.x, t.s.y + 1, t.s.z) || los(this.W, b.x, b.y + DOM.BOSS_H - 1, b.z, t.s.x, t.s.y + 1.6, t.s.z);
    const foes = [...this.players.values()].filter(t => t.alive && t.joined && t.team >= 0 && t.team !== b.team);
    if (k === 1 || k === 3) {
      const A = k === 1 ? DOM.LASH : DOM.PULSE, f = dirFromAngles(b.yaw, 0);
      for (const t of foes) {
        const dx = t.s.x - b.x, dz = t.s.z - b.z, dl = Math.hypot(dx, dz) || 1;
        if (dl > A.r || Math.abs(t.s.y - b.y) > 8) continue;
        if (k === 1 && (dx * f[0] + dz * f[2]) / dl < A.cos) continue;
        if (!vis(t)) continue;
        this.domHurt(b, t, A.dmg, [dx / dl * .8, .6, dz / dl * .8], A.kick);
        if (this.state !== 'play') return;
      }
    } else if (k === 2) {
      const t = this.players.get(b.tgt);
      if (t && t.alive && t.team !== b.team && Math.hypot(t.s.x - b.x, t.s.z - b.z) <= DOM.GRAB.range && vis(t)) {
        const dx = b.x - t.s.x, dz = b.z - t.s.z, dl = Math.hypot(dx, dz) || 1, pull = Math.min(DOM.GRAB.pull, 6 + dl * .9);
        this.domHurt(b, t, DOM.GRAB.dmg, [dx / dl * .93, .36, dz / dl * .93], pull);
        this.domEv({ a: 'grab', b: b.team, id: t.id });
      }
    } else if (k === 4) {
      const ts = foes.filter(t => Math.hypot(t.s.x - b.x, t.s.z - b.z) <= DOM.BOSS_SEE && vis(t));
      if (ts.length) for (let i = 0; i < DOM.ORBS.n; i++) {
        const a = b.yaw + (i - (DOM.ORBS.n - 1) / 2) * .9, f = dirFromAngles(a, .5);
        d.orbs.push({ id: d.oid++, team: b.team, x: b.x + f[0] * 2.5, y: b.y + DOM.BOSS_H - .5, z: b.z + f[2] * 2.5, vx: f[0] * DOM.ORBS.speed, vy: f[1] * DOM.ORBS.speed, vz: f[2] * DOM.ORBS.speed, tgt: ts[i % ts.length].id, life: DOM.ORBS.life });
      }
    }
    this.domEv({ a: 'fx', b: b.team, k });
  }
  tickOrbs(dt) {
    const d = this.dom, O = DOM.ORBS;
    for (let i = d.orbs.length - 1; i >= 0; i--) {
      const o = d.orbs[i], t = this.players.get(o.tgt); o.life -= dt;
      let gone = o.life <= 0, hit = null;
      if (!gone && t && t.alive) {
        const dx = t.s.x - o.x, dy = t.s.y + 1 - o.y, dz = t.s.z - o.z, dl = Math.hypot(dx, dy, dz) || 1;
        if (dl < O.r) hit = t;
        else { o.vx += dx / dl * O.turn * O.speed * dt; o.vy += dy / dl * O.turn * O.speed * dt; o.vz += dz / dl * O.turn * O.speed * dt; const vl = Math.hypot(o.vx, o.vy, o.vz) || 1; o.vx *= O.speed / vl; o.vy *= O.speed / vl; o.vz *= O.speed / vl; }
      }
      if (!gone && !hit) {
        const L = O.speed * dt, prev = setPasa(o.team), h = raycast(this.W, o.x, o.y, o.z, o.vx / O.speed, o.vy / O.speed, o.vz / O.speed, L + .3); setPasa(prev);
        if (h) gone = true; else { o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; }
      }
      if (hit || gone) {
        d.orbs.splice(i, 1);
        this.domEv({ a: 'orbx', id: o.id, p: r3a([o.x, o.y, o.z]) });
        if (hit) { this.damage(hit, O.dmg, null, null, [o.vx / O.speed, .2, o.vz / O.speed], .1, 'boss'); if (this.state !== 'play') return; }
      }
    }
  }
  tickZones(dt) {
    const d = this.dom, Z = DOM.ZONE;
    for (let i = d.zones.length - 1; i >= 0; i--) {
      const z = d.zones[i]; z.t -= dt; if (z.t > 0) continue;
      d.zones.splice(i, 1);
      this.domEv({ a: 'zx', p: r3a([z.x, z.y, z.z]), r: z.r, b: z.team });
      for (const t of this.players.values()) {
        if (!t.alive || !t.joined || t.team === z.team || t.team < 0) continue;
        const dx = t.s.x - z.x, dz = t.s.z - z.z, dl = Math.hypot(dx, dz);
        if (dl > z.r || Math.abs(t.s.y - z.y) > 3.5) continue;
        this.damage(t, Z.dmg, null, null, [dl ? dx / dl * .5 : 0, .85, dl ? dz / dl * .5 : 0], Z.kick / Z.dmg, 'boss');
        if (this.state !== 'play') return;
      }
    }
  }
  /* ---- bots ---- */
  // a qué estructura le puede tirar este bot ahora (la tiene que ver)
  domBotTarget(p) {
    const d = this.dom; if (!d || p.team < 0 || this.state !== 'play') return null;
    const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z, range = Math.max(40, this.skill().range);
    const prev = setPasa(p.team);
    try {
      const see = (x, y, z, test) => { const dx = x - ex, dy = y - ey, dz = z - ez, dl = Math.hypot(dx, dy, dz); if (dl > range || dl < .5) return false; const h = raycast(this.W, ex, ey, ez, dx / dl, dy / dl, dz / dl, dl + 3); return !!(h && h.b && test(h.b)); };
      const b = d.boss[1 - p.team];
      if (b.hp > 0) { const f = dirFromAngles(b.yaw, 0), cx = b.x + f[0] * DOM.CORE_FWD, cz = b.z + f[2] * DOM.CORE_FWD; for (const y of [DOM.CORE_Y, 5, 2]) if (see(y === DOM.CORE_Y ? cx : b.x, b.y + y, y === DOM.CORE_Y ? cz : b.z, q => q.boss === b.team)) return { x: y === DOM.CORE_Y ? cx : b.x, y: b.y + y, z: y === DOM.CORE_Y ? cz : b.z }; }
      let best = null, bd = 1e9;
      d.gens.forEach((g, i) => { if (g.hp <= 0 || g.team === p.team) return; const ds = Math.hypot(g.x - ex, g.z - ez); if (ds < bd && see(g.x, g.y + 1.8, g.z, q => q.gen === i)) { bd = ds; best = { x: g.x, y: g.y + 1.8, z: g.z }; } });
      return best;
    } finally { setPasa(prev); }
  }
  // de dónde hay que salir corriendo: zonas avisadas y el alcance del latigazo o del pulso mientras el boss avisa
  domDanger(p) {
    const d = this.dom; if (!d) return null;
    for (const z of d.zones) if (z.team !== p.team && Math.hypot(p.s.x - z.x, p.s.z - z.z) < z.r + 1.5) return z;
    const b = d.boss[1 - p.team];
    if (b.hp > 0 && (b.atk === 1 || b.atk === 3) && Math.hypot(p.s.x - b.x, p.s.z - b.z) < (b.atk === 1 ? DOM.LASH.r : DOM.PULSE.r) + 2) return b;
    return null;
  }
  // los atacantes se reparten por los tres carriles (id % 3); uno de cada DOM.BOT_DEF se queda a defender
  domObjective(p) {
    const d = this.dom, M = MAPS[this.W.id], me = p.team, en = 1 - me; if (!d || me < 0) return null;
    const lane = p.id % 3, far = (q, r) => Math.hypot(p.s.x - q.x, p.s.z - q.z) > r;
    if (p.id % DOM.BOT_DEF === DOM.BOT_DEF - 1) {
      // defiende el portón con el generador más lastimado; si ya no queda ninguno, la sala del boss
      let bi = -1, low = 1e9;
      d.gens.forEach(g => { if (g.team !== me || g.hp <= 0) return; const bar = d.bars.find(b => b.team === me && b.lane === g.lane); if (bar && bar.st < 2 && g.hp < low) { low = g.hp; bi = g.lane; } });
      const q = bi >= 0 ? M.defPts[me][bi] : M.bossPts[me][p.id % 2];
      return far(q, 9) ? { x: q.x, y: q.y, z: q.z, pri: 60 } : null;
    }
    const open = d.bars.filter(b => b.team === en && b.st === 2);
    if (open.length) { const q = M.bossPts[en][p.id % 2]; return far(q, 5) ? { x: q.x, y: q.y, z: q.z, pri: 100 } : null; }
    let gs = d.gens.filter(g => g.team === en && g.hp > 0 && g.lane === lane);
    if (!gs.length) gs = d.gens.filter(g => g.team === en && g.hp > 0);
    if (!gs.length) return null;
    const hurt = gs.find(g => g.hp < DOM.GEN_HP), g = hurt || gs[(p.id >> 2) % gs.length];   // todos al que ya está roto a medias
    return far(g.atk, 2.5) ? { x: g.atk.x, y: g.atk.y, z: g.atk.z, pri: 100 } : null;
  }
  /* ---- comandos de prueba (solo en práctica, o en un servidor arrancado con dev) ---- */
  domCommand(p, cmd, args) {
    const d = this.dom, say = s => p.send && p.send({ t: 'ev', e: 'sys', m: s });
    if (!d) return false;
    if (!['gen', 'barrera', 'boss', 'tiempo', 'dom'].includes(cmd)) return false;
    if (this.o.online && !this.o.dev) { say('Los comandos de prueba son solo para la práctica'); return true; }
    const n = parseInt(args[0], 10), fake = { team: 0, name: p.name, id: p.id, caps: 0, dmg: 0, send: null };
    if (cmd === 'gen' && n >= 1 && n <= d.gens.length) { const g = d.gens[n - 1]; if (g.hp > 0) { fake.team = 1 - g.team; d.dirtyG.add(n - 1); this.domGenDown(n - 1, fake); } }
    else if (cmd === 'barrera' && n >= 1 && n <= d.bars.length) { const bar = d.bars[n - 1]; fake.team = 1 - bar.team; d.gens.forEach((g, i) => { if (g.team === bar.team && g.lane === bar.lane && g.hp > 0) { d.dirtyG.add(i); this.domGenDown(i, fake); } }); }
    else if (cmd === 'boss' && /^(rojo|azul)$/.test(args[0] || '') && Number.isFinite(+args[1])) { const t = args[0] === 'rojo' ? 0 : 1, b = d.boss[t]; b.hp = clamp(+args[1], 0, 100) / 100 * DOM.BOSS_HP; if (b.hp <= 0) { fake.team = 1 - t; this.domBossDown(t, fake); } }
    else if (cmd === 'tiempo' && n >= 0) this.left = n;
    else say('Prueba: /gen 1-12 · /barrera 1-6 (1-3 rojas, 4-6 azules: norte, centro, sur) · /boss rojo|azul 0-100 · /tiempo SEGUNDOS');
    this.sendScores();
    return true;
  }

