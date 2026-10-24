  /* ---- disparos ---- */
  canFire(p, w) {
    const W_ = WEAPONS[w]; if (!W_ || !p.alive || !p.ow[w] || !this.live()) return false;
    if (W_.ammo && p.am[W_.ammo] < W_.cost && !this.mode.gg && !this.mode.inf) return false;
    if (W_.mag) {
      if (p.mag[w] == null) p.mag[w] = W_.mag;   // arma recién conseguida: viene con el cargador lleno
      if (p.relT[w] > this.time) return false;
      if (p.relT[w]) { p.relT[w] = 0; p.mag[w] = W_.mag; }
      if (!(p.mag[w] > 0)) { p.relT[w] = this.time + W_.reload * (p.bot ? 1 : .75); return false; }
    }
    return this.time - p.lastFire >= W_.rate * .7;
  }
  consume(p, w) {
    const W_ = WEAPONS[w]; if (W_.ammo && !this.mode.gg && !this.mode.inf) p.am[W_.ammo] -= W_.cost;
    if (W_.mag) { p.mag[w]--; if (p.mag[w] <= 0) p.relT[w] = this.time + W_.reload * (p.bot ? 1 : .75); } p.lastFire = this.time; p.w = w; p.dirty = true; }
  humanFire(p, m) {
    const w = m.w | 0; if (!this.canFire(p, w)) return;
    if (!Array.isArray(m.o) || !Array.isArray(m.d) || !m.o.every(Number.isFinite) || !m.d.every(Number.isFinite)) return;
    const dl = Math.hypot(m.d[0], m.d[1], m.d[2]); if (dl < .5) return;
    const d = [m.d[0] / dl, m.d[1] / dl, m.d[2] / dl];
    let o = m.o; const ex = p.s.x, ey = p.s.y + K.EYE, ez = p.s.z;
    if (Math.hypot(o[0] - ex, o[1] - ey, o[2] - ez) > 3) o = [ex, ey, ez];
    this.consume(p, w);
    const W_ = WEAPONS[w];
    const ns = !!W_.scope && !m.sc; // arma con mira disparada sin apuntar
    if (W_.type === 'proj') { this.spawnProj(p, w, o, d); this.projs[this.projs.length - 1].ns = ns; return; }
    this.bcast({ t: 'ev', e: 'shot', id: p.id, w, o: r3a(o), d: r3a(d) }, p.id);
    this.curNS = ns;
    const claims = Array.isArray(m.h) ? m.h.slice(0, 16) : [];
    const done = new Set();
    for (const c of claims) {
      if (!Array.isArray(c)) continue;
      const t = this.players.get(c[0] | 0); if (!t || !t.alive || t === p || done.has(t.id)) continue;
      done.add(t.id);
      const n = clamp(c[1] | 0, 0, W_.pel), hs = clamp(c[2] | 0, 0, n); if (!n) continue;
      if (!this.validHit(o, d, t, W_, p)) continue;
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (hs ? 1.5 : 1) : W_.head ? W_.dmg * (hs ? W_.head : 1) : (n + hs) * W_.dmg * falloff(W_, Math.hypot(t.s.x - o[0], t.s.y + 1 - o[1], t.s.z - o[2]));
      this.curHS = hs > 0 && !W_.melee;
      this.damage(t, dmg * this.mult(p), p, w, d, .05, 'frag');
      this.curHS = false;
    }
    this.curNS = false;
  }
  // cuchillo como en Counter-Strike: tajo de 40; por la espalda hace casi el doble, pero nunca mata de un golpe a alguien sano
  meleeDmg(p, t, W_) {
    // segundo tajo del mismo atacante dentro de 4 segundos: muerte segura (aunque tenga megasalud)
    if (t.knifeBy === p.id && this.time - t.knifeT < 4) { t.knifeBy = 0; return 999; }
    t.knifeBy = p.id; t.knifeT = this.time;
    const ax = p.s.x - t.s.x, az = p.s.z - t.s.z, al = Math.hypot(ax, az) || 1;
    const behind = (-Math.sin(t.yaw) * ax - Math.cos(t.yaw) * az) / al < -.4;
    return W_.dmg * (behind ? W_.back : 1);
  }
  // compensación de lag (como en Counter-Strike): el que dispara ve a los demás en el pasado (su ping + la interpolación),
  // así que el impacto se valida también contra dónde estaba el blanco en ese momento. Así un jugador con 200 de ping
  // que apuntó bien le pega, sin importar desde qué país juegue.
  validHit(o, d, t, W_, shooter) {
    if (this.hitAt(o, d, t.s, t, W_)) return true;
    if (!shooter || !t.hist || !t.hist.length) return false;
    const back = clamp((shooter.ping || 0) / 1000 + .1, 0, .6), when = this.time - back;
    let best = null; for (const h of t.hist) if (!best || Math.abs(h[0] - when) < Math.abs(best[0] - when)) best = h;
    return !!best && this.hitAt(o, d, { x: best[1], y: best[2], z: best[3], vx: 0, vz: 0 }, t, W_);
  }
  hitAt(o, d, ts, t, W_) {
    const cx = ts.x - o[0], cy = ts.y + 1 - o[1], cz = ts.z - o[2];
    const proj = cx * d[0] + cy * d[1] + cz * d[2];
    if (proj < -1 || proj > (W_.range || 300) + (W_.melee ? .5 : 5)) return false;
    const px = cx - d[0] * proj, py = cy - d[1] * proj, pz = cz - d[2] * proj;
    // tolerancia generosa: el que dispara ve a los demás un poco en el pasado
    const sp = Math.hypot(ts.vx, ts.vz);
    if (Math.hypot(px, py, pz) > (W_.melee ? 1.5 + sp * .12 : 2.4 + proj * .025 + sp * .25)) return false;   // el cuchillo barre en abanico
    return los(this.W, o[0], o[1], o[2], ts.x, ts.y + 1.1, ts.z) || los(this.W, o[0], o[1], o[2], ts.x, ts.y + 1.6, ts.z);
  }
  trace(o, d, range, shooter, pierce) {
    const wall = raycast(this.W, o[0], o[1], o[2], d[0], d[1], d[2], range);
    const wt = wall ? wall.t : range, hits = [];
    for (const t of this.players.values()) {
      if (!t.alive || t === shooter || !t.joined) continue;
      const h = rayPlayer(t.s.x, t.s.y, t.s.z, o[0], o[1], o[2], d[0], d[1], d[2], t.s.crouch);
      if (h && h.t < wt) hits.push({ p: t, t: h.t, head: h.head });
    }
    hits.sort((a, b) => a.t - b.t);
    return { wt, n: wall ? wall.n : null, hits: pierce ? hits : hits.slice(0, 1) };
  }
  botFire(p, w, o, d) {
    if (!this.canFire(p, w)) return;
    this.consume(p, w);
    const W_ = WEAPONS[w];
    if (W_.type === 'proj') { this.spawnProj(p, w, o, d); return; }
    this.bcast({ t: 'ev', e: 'shot', id: p.id, w, o: r3a(o), d: r3a(d) });
    const acc = new Map();
    for (let i = 0; i < W_.pel; i++) {
      let dd = d;
      if (W_.spread) {
        const sx = (Math.random() + Math.random() - 1) * W_.spread, sy = (Math.random() + Math.random() - 1) * W_.spread;
        const rl = Math.hypot(d[0], d[2]) || 1, rx = -d[2] / rl, rz = d[0] / rl;
        const ux = -d[0] * d[1] / rl, uy = (d[0] * d[0] + d[2] * d[2]) / rl, uz = -d[2] * d[1] / rl;
        dd = [d[0] + rx * sx + ux * sy, d[1] + uy * sy, d[2] + rz * sx + uz * sy];
        const l = Math.hypot(dd[0], dd[1], dd[2]); dd = [dd[0] / l, dd[1] / l, dd[2] / l];
      }
      const tr = this.trace(o, dd, W_.range || 300, p, W_.type === 'rail');
      for (const h of tr.hits) { const a = acc.get(h.p) || { n: 0, hs: 0 }; a.n++; if (h.head) a.hs++; acc.set(h.p, a); }
    }
    for (const [t, a] of acc) {
      const dmg = W_.melee ? this.meleeDmg(p, t, W_) : W_.type === 'rail' ? W_.dmg * (a.hs ? 1.5 : 1) : W_.head ? W_.dmg * (a.hs ? W_.head : 1) : (a.n + a.hs) * W_.dmg * falloff(W_, Math.hypot(t.s.x - o[0], t.s.y + 1 - o[1], t.s.z - o[2]));
      this.damage(t, dmg * this.mult(p) * this.skill().dmg, p, w, d, .05, 'frag');
    }
  }
  spawnProj(p, w, o, d) {
    const W_ = WEAPONS[w], v = projLaunch(w, d);
    const pr = { id: this.pid++, k: W_.proj, w, own: p.id, x: o[0], y: o[1], z: o[2], o0: o.slice(), v, life: W_.fuse || (W_.proj === 'bullet' ? 1.6 : 6), q: this.mult(p) * (p.bot ? this.skill().dmg : 1), age: 0 };
    this.projs.push(pr);
    this.bcast({ t: 'ev', e: 'proj', pid: pr.id, k: pr.k, own: p.id, p: r3a(o), v: r3a(v) });
  }
  tickProjs(dt) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      if (!this.live()) return; // la partida terminó por una explosión de este mismo tick
      const pr = this.projs[i]; if (!pr) continue;
      const ox = pr.x, oy = pr.y, oz = pr.z;
      pr.age += dt;
      const res = projStep(this.W, pr, dt);
      const dx = pr.x - ox, dy = pr.y - oy, dz = pr.z - oz, L = Math.hypot(dx, dy, dz);
      let direct = null, bt = Infinity;
      if (L > 1e-6) {
        for (const t of this.players.values()) {
          if (!t.alive || !t.joined || (t.id === pr.own && pr.age < .3)) continue;
          const h = rayPlayer(t.s.x, t.s.y, t.s.z, ox, oy, oz, dx / L, dy / L, dz / L, t.s.crouch);
          if (h && h.t <= L + .15 && h.t < bt) { bt = h.t; direct = t; pr.hs = !!h.head; }
        }
      }
      if (direct) { pr.x = ox + dx / L * bt; pr.y = oy + dy / L * bt; pr.z = oz + dz / L * bt; this.explode(pr, direct); this.projs.splice(i, 1); }
      else if (res && res.boom) { this.explode(pr, null); this.projs.splice(i, 1); }
    }
  }
  explode(pr, direct) {
    const W_ = WEAPONS[pr.w], own = this.players.get(pr.own);
    if (direct && W_.direct) {
      const sp = Math.hypot(pr.v[0], pr.v[1], pr.v[2]) || 1;
      if (pr.k === 'bullet' && own) this.huntReward(own, direct, pr);
      // granada de lleno, sin rebotar antes: más daño y premio para el que la tiró
      const clean = pr.k === 'grenade' && !pr.bounced && W_.clean && own && direct !== own && !(this.mode.teams && direct.team === own.team);
      if (clean) {
        this.credit(own, 150, 'granada directa');
        if (own.send) own.send({ t: 'ev', e: 'gdirect', n: this.mode.shop ? 150 : 0 });
        this.bcast({ t: 'ev', e: 'sys', m: own.name + ' le metió una granada directa a ' + direct.name });
      }
      this.curNS = !!pr.ns; this.curHS = pr.k === 'bullet' && !!pr.hs;
      this.damage(direct, (clean ? W_.clean : W_.direct) * pr.q, own, pr.w, [pr.v[0] / sp, pr.v[1] / sp, pr.v[2] / sp], pr.k === 'bullet' ? .02 : .08, 'frag');
    }
    this.curNS = false; this.curHS = false;
    if (W_.fire) this.startFire(pr, W_.fire);
    for (const t of this.players.values()) {
      if (!t.alive || !t.joined || t === direct) continue;
      const dist = boxDist(pr.x, pr.y, pr.z, t.s.x, t.s.y, t.s.z);
      if (dist >= W_.rad) continue;
      if (!los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .9, t.s.z) && !los(this.W, pr.x, pr.y + .1, pr.z, t.s.x, t.s.y + .2, t.s.z)) continue;
      const self = t.id === pr.own;
      let dmg = W_.dmg * (1 - (W_.sfall || .6) * dist / W_.rad) * pr.q; if (self) dmg *= pr.k === 'rocket' ? .28 : .5;
      const cx = t.s.x - pr.x, cy = t.s.y + .9 - pr.y, cz = t.s.z - pr.z, cl = Math.hypot(cx, cy, cz) || 1;
      const ks = self && !t.bot ? 0 : .16;
      this.damage(t, dmg, own, pr.w, [cx / cl, cy / cl, cz / cl], ks / (self ? 1 : pr.q), self ? 'self' : 'frag');
    }
    this.bcast({ t: 'ev', e: 'boom', pid: pr.id, own: pr.own, k: pr.k, hit: direct ? 1 : 0, p: r3a([pr.x, pr.y, pr.z]) });
  }

  // fuego de la molotov: busca el piso debajo del impacto y quema a todos los que estén dentro
  startFire(pr, F) {
    const fl = raycast(this.W, pr.x, pr.y + .3, pr.z, 0, -1, 0, 8);
    const y = fl ? pr.y + .3 - fl.t : pr.y;
    const f = { id: this.pid++, x: pr.x, y, z: pr.z, r: F.r, t: F.dur, hit: F.hit * pr.q, every: F.every, own: pr.own, w: pr.w, tick: 0 };
    this.fires.push(f);
    this.bcast({ t: 'ev', e: 'fire', id: f.id, p: r3a([f.x, f.y, f.z]), r: f.r, d: f.t });
  }
  tickFires(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt; f.tick -= dt;
      if (f.t <= 0) { this.fires.splice(i, 1); continue; }
      if (f.tick > 0) continue;
      f.tick = f.every;
      const own = this.players.get(f.own);
      for (const t of this.players.values()) {
        if (!t.alive || !t.joined) continue;
        if (Math.hypot(t.s.x - f.x, t.s.z - f.z) > f.r || t.s.y < f.y - 1 || t.s.y > f.y + 1.6) continue;
        const self = t.id === f.own;
        this.damage(t, f.hit * (self ? .5 : 1), own || null, f.w, null, 0, self ? 'self' : 'frag');
        if (!this.live()) return;
      }
    }
  }
  // premio del rifle de caza: cuanto más lejos, más tiempo de vuelo o si el blanco estaba en el aire
  huntReward(p, t, pr) {
    if (!t.alive || t === p || (this.mode.teams && t.team === p.team)) return;
    const d = Math.hypot(pr.x - pr.o0[0], pr.y - pr.o0[1], pr.z - pr.o0[2]), air = !t.s.on, flight = pr.age;
    if (d < 22 && !air) return;
    const n = Math.min(800, 100 + Math.round(d * 6) + (air ? 150 : 0) + (d > 60 ? 100 : 0));
    this.credit(p, n, 'tiro de cazador');
    if (p.send) p.send({ t: 'ev', e: 'hunt', d: Math.round(d), air: air ? 1 : 0, n: this.mode.shop ? n : 0 });
    this.bcast({ t: 'ev', e: 'sys', m: p.name + ' cazó a ' + t.name + ' a ' + Math.round(d) + ' m' + (air ? ' en pleno salto' : '') });
  }
