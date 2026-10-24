  newAI() { return { think: 0, replan: 0, path: null, pi: 0, tgt: 0, seeT: 0, lostT: 0, last: null, strafe: Math.random() < .5 ? 1 : -1, strafeT: 1, stuckT: 0, bestD: 1e9, hurtBy: 0, hurtT: 0, aimErrX: 0, aimErrY: 0, errT: 0, hopT: 0, goal: null, flyT: 0, noLook: 0 }; }
  skill() { return SKILL[this.o.botSkill] || SKILL[1]; }
  findTarget(p) {
    let best = null, bd = 1e9; const sk = this.skill();
    const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z;
    for (const t of this.players.values()) {
      if (t === p || !t.alive || !t.joined || (this.mode.teams && t.team === p.team)) continue;
      const d = Math.hypot(t.s.x - ex, t.s.y + 1 - ey, t.s.z - ez);
      const hurt = p.ai.hurtT > 0 && p.ai.hurtBy === t.id;
      if (d > sk.range && !hurt) continue;
      // campo de visión según la dificultad, salvo que lo hayan atacado o estés encima
      const f = dirFromAngles(p.yaw, 0), dot = ((t.s.x - ex) * f[0] + (t.s.z - ez) * f[2]) / (Math.hypot(t.s.x - ex, t.s.z - ez) || 1);
      if (dot < sk.fov && !hurt && d > 4 && t.id !== p.ai.tgt) continue;
      if (!los(this.W, ex, ey, ez, t.s.x, t.s.y + 1.2, t.s.z)) continue;
      const score = d - (p.ai.hurtBy === t.id && p.ai.hurtT > 0 ? 15 : 0) - (t.id === p.ai.tgt ? 8 : 0);
      if (score < bd) { bd = score; best = t; }
    }
    return best;
  }
  chooseWeapon(p, dist) {
    if (this.mode.gg) return GG[Math.min(p.lvl, GG.length - 1)];
    const has = w => p.ow[w] && (!WEAPONS[w].ammo || p.am[WEAPONS[w].ammo] >= WEAPONS[w].cost);
    const order = dist < 2.2 ? [2, 1, 7] : dist < 7 ? [2, 1, 3, 5, 6, 0] : dist < 22 ? [5, 3, 2, 6, 8, 9, 1, 4, 0] : [8, 9, 6, 3, 5, 0, 1];
    for (const w of order) if (has(w) && !(WEAPONS[w].mag && p.relT[w] > this.time)) return w;
    return has(1) ? 1 : has(0) ? 0 : 7;
  }
  planBot(p) {
    const ai = p.ai, nav = this.nav;
    const start = findNode(nav, p.s.x, p.s.y, p.s.z);
    if (!start) { ai.path = null; return; }
    const dj = dijkstra(nav, start.id);
    let goal = null, best = -1;
    const t = ai.tgt ? this.players.get(ai.tgt) : null;
    const obj = this.objective(p);
    if (obj) {
      const n = findNode(nav, obj.x, obj.y + .2, obj.z);
      if (n && dj.dist[n.id] < Infinity && n.id !== start.id) { goal = n.id; best = obj.pri; }
    }
    if (best >= 99) { /* el objetivo de la bandera manda */ }
    else if (t && t.alive) {
      const n = findNode(nav, t.s.x, t.s.y, t.s.z);
      if (n && dj.dist[n.id] < Infinity) { goal = n.id; best = 99; }
    } else if (ai.last && ai.lostT > 0) {
      const n = findNode(nav, ai.last[0], ai.last[1], ai.last[2]);
      if (n && dj.dist[n.id] < Infinity) { goal = n.id; best = 6; }
    }
    if (best < 99) {
      for (const it of this.items) {
        if (!it.up) continue;
        const n = findNode(nav, it.x, it.y + .2, it.z); if (!n || dj.dist[n.id] === Infinity) continue;
        const info = ITEMS[it.type]; let v = 0;
        if (it.type === 'quad') v = 6;
        else if (it.type === 'mega') v = p.hp < 150 ? 5 : 0;
        else if (it.type === 'health') v = p.hp < 40 ? 5 : p.hp < 80 ? 2 : 0;
        else if (it.type === 'armorH') v = p.ar < 120 ? 4 : 0;
        else if (it.type === 'armor') v = p.ar < 80 ? 2.5 : 0;
        else if (info.weapon != null) v = !p.ow[info.weapon] ? 4 + info.weapon * .3 : p.am[info.ammo] < AMMO_MAX[info.ammo] * .4 ? 1 : 0;
        else if (info.ammo) { const owns = WEAPONS.some((W_, i) => W_.ammo === info.ammo && p.ow[i]); v = owns && p.am[info.ammo] < AMMO_MAX[info.ammo] * .5 ? 1.2 : 0; }
        if (!v) continue;
        const sc = v / (1 + dj.dist[n.id] / 25);
        if (sc > best) { best = sc; goal = n.id; }
      }
    }
    if (goal == null) {
      for (let k = 0; k < 8 && goal == null; k++) {
        const sp = this.W.spawns[Math.floor(Math.random() * this.W.spawns.length)];
        const n = findNode(nav, sp.x, sp.y + .2, sp.z);
        if (n && dj.dist[n.id] < Infinity && n.id !== start.id) goal = n.id;
      }
    }
    if (goal == null) { ai.path = null; return; }
    ai.path = pathTo(dj, goal); ai.pi = 1; ai.bestD = 1e9; ai.stuckT = 0; ai.goal = goal;
  }
  // CTF: qué hace cada bot según el estado de las banderas y su rol (ataque/defensa)
  objective(p) {
    if (!this.mode.teams || this.flags.length < 2 || p.team < 0) return null;
    const own = this.flags[p.team], enemy = this.flags[1 - p.team], home = this.W.flags[p.team];
    if (enemy.st === 1 && enemy.by === p.id) return { x: home.x, y: home.y, z: home.z, pri: 200 };
    if (own.st === 1) { const c = this.players.get(own.by); if (c && (p.role === 'def' || Math.hypot(c.s.x - p.s.x, c.s.z - p.s.z) < 25)) return { x: c.s.x, y: c.s.y, z: c.s.z, pri: 150 }; }
    if (own.st === 2) return { x: own.x, y: own.y, z: own.z, pri: p.role === 'def' ? 140 : 70 };
    if (p.role === 'att') {
      if (enemy.st !== 1) return { x: enemy.x, y: enemy.y, z: enemy.z, pri: 100 };
      const c = this.players.get(enemy.by); if (c) return { x: c.s.x, y: c.s.y, z: c.s.z, pri: 40 };
    }
    if (Math.hypot(p.s.x - home.x, p.s.z - home.z) > 14) return { x: home.x + (Math.random() - .5) * 16, y: 0, z: home.z - Math.sign(home.z) * (4 + Math.random() * 8), pri: 50 };
    return null;
  }
  botThink(p, dt) {
    const ai = p.ai, s = p.s, nav = this.nav, sk = SKILL[this.o.botSkill] || SKILL[1];
    ai.think -= dt; ai.replan -= dt; ai.hurtT -= dt; ai.lostT -= dt; ai.errT -= dt; ai.flyT -= dt; ai.noLook -= dt;
    if (ai.think <= 0) {
      ai.think = .1;
      const t = this.findTarget(p);
      if (t) { if (t.id !== ai.tgt) { ai.seeT = 0; ai.replan = Math.min(ai.replan, .2); } ai.tgt = t.id; ai.last = [t.s.x, t.s.y, t.s.z]; ai.lostT = 3; }
      else if (ai.tgt) { ai.tgt = 0; ai.replan = 0; }
    }
    if (ai.replan <= 0 && s.on) { if (this.planBudget > 0) { this.planBudget--; ai.replan = .7 + Math.random() * .5; this.planBot(p); } else ai.replan = .03; }
    const tgt = ai.tgt ? this.players.get(ai.tgt) : null;
    if (tgt) ai.seeT += dt;
    // --- movimiento ---
    let wx = 0, wz = 0, jump = false;
    let nextLink = 0;
    if (ai.path && ai.pi < ai.path.length && ai.flyT <= 0) {
      let n = nav.nodes[ai.path[ai.pi]];
      const dxn = n.x - s.x, dzn = n.z - s.z, dn = Math.hypot(dxn, dzn);
      if (dn < .65 && Math.abs(n.y - s.y) < 1.4) { ai.pi++; ai.bestD = 1e9; ai.stuckT = 0; }
      if (ai.pi < ai.path.length) {
        n = nav.nodes[ai.path[ai.pi]];
        nextLink = linkType(nav, ai.path[ai.pi - 1], ai.path[ai.pi]);
        // mirar más adelante en tramos caminables para suavizar
        let aim = n;
        if (nextLink === 0 && ai.noLook <= 0) for (let k = 1; k <= 3 && ai.pi + k < ai.path.length; k++) {
          if (linkType(nav, ai.path[ai.pi + k - 1], ai.path[ai.pi + k]) !== 0) break;
          const q = nav.nodes[ai.path[ai.pi + k]]; if (Math.abs(q.y - s.y) > .6) break;
          if (!los(this.W, s.x, s.y + .4, s.z, q.x, q.y + .4, q.z)) break;
          aim = q;
        }
        const ax = aim.x - s.x, az = aim.z - s.z, al = Math.hypot(ax, az) || 1;
        wx = ax / al; wz = az / al;
        const d = Math.hypot(n.x - s.x, n.z - s.z);
        if (nextLink === 2 && s.on) {
          const prev = nav.nodes[ai.path[ai.pi - 1]];
          if (Math.hypot(prev.x - s.x, prev.z - s.z) < 1.1 || d < 4.5) { jump = true; ai.flyT = .05; }
        }
        if (d < ai.bestD - .2) { ai.bestD = d; ai.stuckT = 0; } else ai.stuckT += dt;
        if (ai.stuckT > 1.2) { jump = true; ai.replan = 0; ai.stuckT = 0; ai.noLook = 1.5; }
      } else ai.path = null;
    } else if (!ai.path && !findNode(nav, s.x, s.y, s.z)) { jump = true; }
    // combate: esquivar de costado y acercarse/alejarse
    if (tgt) {
      const dx = tgt.s.x - s.x, dz = tgt.s.z - s.z, dist = Math.hypot(dx, dz) || 1;
      ai.strafeT -= dt; if (ai.strafeT <= 0) { ai.strafe *= -1; ai.strafeT = .5 + Math.random() * 1.2; }
      const melee = !!WEAPONS[p.w].melee;
      const pref = melee ? 0 : p.w === 2 || p.w === 1 ? 5 : p.w === 6 || p.w === 8 || p.w === 9 ? 20 : 11;
      const sm = (melee ? .3 : 1) * sk.strafe;
      const ix = dx / dist, iz = dz / dist, sx = -iz * ai.strafe * sm, sz = ix * ai.strafe * sm;
      const approach = melee ? 1.2 : dist > pref + 3 ? .6 : dist < pref - 3 ? -.6 : 0;
      if (dist < 25 || !ai.path) { wx = wx * .4 + sx * .8 + ix * approach; wz = wz * .4 + sz * .8 + iz * approach; }
      ai.hopT -= dt; if (ai.hopT <= 0) { ai.hopT = .6 + Math.random() * 1.5; if (Math.random() < sk.hop) jump = true; }
      // no caminar hacia la lava ni al vacío
      const fx = s.x + wx * 1.2, fz = s.z + wz * 1.2;
      if (s.on && !nav.nodeAt(fx, s.y, fz)) { wx = -wx * .3; wz = -wz * .3; }
    }
    const was = s.on;
    pmove(this.W, s, { wx, wz, jump }, dt);
    const landed = was !== s.on && s.on;
    if (landed) ai.flyT = 0;
    // plataformas de salto y teletransportadores
    p.padT -= dt;
    const tr = triggers(this.W, s);
    if (padReady(s, tr.pad, landed && Math.random() < .5) && tr.pad && p.padT <= 0) { launchPad(s, tr.pad); p.padT = .4; ai.flyT = 1.5; this.bcast({ t: 'ev', e: 'pad', p: r3a([s.x, s.y, s.z]) }); }
    if (tr.tele) { this.teleport(p, tr.tele); ai.replan = 0; }
    // --- puntería y disparo ---
    if (tgt && tgt.alive) {
      const dist = Math.hypot(tgt.s.x - s.x, tgt.s.y - s.y, tgt.s.z - s.z);
      const w = this.chooseWeapon(p, dist); if (w !== p.w) { p.w = w; p.lastFire = Math.max(p.lastFire, this.time - WEAPONS[w].rate * .5); }
      const W_ = WEAPONS[w];
      // el bot apunta a una posición "recordada" que persigue a la real según su dificultad
      if (!ai.trk || ai.trkId !== tgt.id) { ai.trk = [tgt.s.x - tgt.s.vx * .25, tgt.s.y, tgt.s.z - tgt.s.vz * .25]; ai.trkId = tgt.id; }
      const kt = Math.min(1, sk.track * dt);
      ai.trk[0] += (tgt.s.x - ai.trk[0]) * kt; ai.trk[1] += (tgt.s.y - ai.trk[1]) * kt; ai.trk[2] += (tgt.s.z - ai.trk[2]) * kt;
      let tx = ai.trk[0], ty = ai.trk[1] + (W_.proj === 'rocket' && tgt.s.on ? .2 : 1.15), tz = ai.trk[2];
      if (W_.type === 'proj') {
        const tt = dist / W_.speed; tx += tgt.s.vx * tt * .8 * sk.lead; tz += tgt.s.vz * tt * .8 * sk.lead;
        if (W_.proj === 'grenade') ty += dist * .06;
        if (W_.proj === 'bullet') ty += .5 * 9 * tt * tt * (.6 + .4 * sk.lead);
      }
      const ex = s.x, ey = s.y + K.EYE, ez = s.z;
      const wantYaw = Math.atan2(-(tx - ex), -(tz - ez)), wantPitch = Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez));
      if (ai.errT <= 0) { ai.errT = .3 + Math.random() * .4; ai.aimErrX = (Math.random() - .5) * 2 * sk.err; ai.aimErrY = (Math.random() - .5) * 2 * sk.err; }
      let dy = wantYaw + ai.aimErrX - p.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const mt = sk.turn * dt;
      p.yaw += clamp(dy, -mt, mt); p.pitch += clamp(wantPitch + ai.aimErrY - p.pitch, -mt, mt);
      if (ai.seeT > sk.react && Math.abs(dy) < .12 + 1 / (dist + 1) && this.canFire(p, w) && this.time - p.lastFire >= W_.rate * sk.fire) {
        if (W_.type !== 'proj' || dist > 3) this.botFire(p, w, [ex, ey, ez], dirFromAngles(p.yaw, p.pitch));
      }
    } else {
      const sp = Math.hypot(s.vx, s.vz);
      if (sp > 1) { const want = Math.atan2(-s.vx, -s.vz); let dy = want - p.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; p.yaw += clamp(dy, -6 * dt, 6 * dt); }
      p.pitch *= .9;
      p.w = this.chooseWeapon(p, 15);
    }
  }
  teleport(p, t) {
    this.bcast({ t: 'ev', e: 'tp', p: r3a([p.s.x, p.s.y, p.s.z]) });
    p.s.x = t.to[0]; p.s.y = t.to[1]; p.s.z = t.to[2]; p.s.vx = p.s.vz = 0; p.s.vy = 0; p.yaw = t.yaw;
    this.bcast({ t: 'ev', e: 'tp', p: r3a(t.to) });
  }
}
