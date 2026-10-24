  /* ---- captura la bandera ---- */
  flagEv(a, f, p) { this.bcast({ t: 'ev', e: 'flag', a, f: f.team, id: p ? p.id : 0, n: p ? p.name : '', fs: this.flagState(), ts: this.ts }); }
  dropCarried(p) {
    for (const f of this.flags) {
      if (f.st !== 1 || f.by !== p.id) continue;
      const hit = raycast(this.W, p.s.x, p.s.y + .5, p.s.z, 0, -1, 0, 30);
      const tr = triggers(this.W, p.s);
      if (!hit || tr.lava || p.s.y < K.KILLY + 2) { this.returnFlag(f, null); continue; }
      f.st = 2; f.by = 0; f.t = 20; f.x = p.s.x; f.y = p.s.y + .5 - hit.t; f.z = p.s.z;
      this.flagEv('drop', f, p);
    }
  }
  returnFlag(f, p) {
    const b = this.W.flags[f.team];
    f.st = 0; f.by = 0; f.t = 0; f.x = b.x; f.y = b.y; f.z = b.z;
    if (p) this.credit(p, 100, 'devolviste tu bandera');
    this.flagEv('return', f, p);
  }
  tickFlags(dt) {
    for (const f of this.flags) {
      if (f.st === 1) { const c = this.players.get(f.by); if (!c || !c.alive) { if (c) this.dropCarried(c); else this.returnFlag(f, null); } else { f.x = c.s.x; f.y = c.s.y; f.z = c.s.z; } }
      else if (f.st === 2) { f.t -= dt; if (f.t <= 0) this.returnFlag(f, null); }
    }
    for (const p of this.players.values()) {
      if (!p.alive || !p.joined || p.team < 0) continue;
      // capturar: llegar a la base propia con la bandera rival (aunque la tuya no esté)
      const e = this.flags.find(q => q.st === 1 && q.by === p.id), home = this.W.flags[p.team];
      if (e && Math.hypot(p.s.x - home.x, p.s.z - home.z) <= 1.6 && p.s.y > home.y - 1.2 && p.s.y < home.y + 2) {
        this.ts[p.team]++; p.caps++;
        const b = this.W.flags[e.team]; e.st = 0; e.by = 0; e.x = b.x; e.y = b.y; e.z = b.z;
        this.credit(p, 500, 'capturaste la bandera');
        this.flagEv('cap', e, p);
        this.sendScores();
        if (this.ts[p.team] >= this.o.caplimit) { this.endMatch(); return; }
        continue;
      }
      for (const f of this.flags) {
        if (f.st === 1) continue;
        if (Math.hypot(p.s.x - f.x, p.s.z - f.z) > 1.3 || p.s.y < f.y - 1.2 || p.s.y > f.y + 1.8) continue;
        if (f.team !== p.team) {
          f.st = 1; f.by = p.id; p.dirty = true;
          this.flagEv('take', f, p);
          if (p.bot && p.ai) p.ai.replan = 0;
        } else if (f.st === 2) this.returnFlag(f, p);
      }
    }
  }

  /* ---- ítems ---- */
  give(p, it) {
    const info = ITEMS[it.type]; if (!info) return false;
    switch (it.type) {
      case 'health': if (p.hp >= 100) return false; p.hp = Math.min(100, p.hp + 25); break;
      case 'mega': if (p.hp >= 150) return false; p.hp = Math.min(150, p.hp + 50); break;
      case 'armor': if (p.ar >= 100) return false; p.ar = Math.min(100, p.ar + 50); break;
      case 'armorH': if (p.ar >= 100) return false; p.ar = 100; break;
      case 'quad': p.quadT = 30; break;
      default:
        if (info.weapon != null) {
          const fresh = !p.ow[info.weapon];
          if (!fresh && p.am[info.ammo] >= AMMO_MAX[info.ammo]) return false;
          // como en CS: con una principal comprada no se levanta otra; la escopeta de base sí se cambia
          if (fresh && isPrimary(info.weapon) && !this.mode.gg) { const cur = primaryOf(p.ow); if (cur !== -1 && cur !== 1) return false; setPrimary(p, info.weapon); }
          else p.ow[info.weapon] = 1;
          p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        } else if (info.ammo) {
          if (p.am[info.ammo] >= AMMO_MAX[info.ammo]) return false;
          p.am[info.ammo] = Math.min(AMMO_MAX[info.ammo], p.am[info.ammo] + info.n);
        }
    }
    p.dirty = true; return true;
  }
  /* ---- sifón (como Quake Champions): el que muere suelta mini escudos de 5 que junta el que pasa por encima ---- */
  dropShards(v) {
    const n = SHARD.N, ox = v.s.x, oy = v.s.y + 1, oz = v.s.z, l = [], a0 = Math.random() * 6.283;
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * 6.283 + (Math.random() - .5) * .5, d = .9 + Math.random() * 1.3;
      let x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d;
      if (!los(this.W, ox, oy, oz, x, oy, z)) { x = ox; z = oz; }             // si hay una pared en el medio, cae al lado del cuerpo
      const fl = raycast(this.W, x, oy + .3, z, 0, -1, 0, 12), y = fl ? oy + .3 - fl.t : v.s.y;
      if (inLava(this.W, x, y + .05, z)) continue;                                // en la lava se derriten
      const s = { id: this.sid++, x, y, z, t: SHARD.LIFE, arm: .45 };
      this.shards.push(s); l.push([s.id, r3(ox), r3(oy), r3(oz), r3(x), r3(y), r3(z)]);
    }
    while (this.shards.length > SHARD.MAX) { const s = this.shards.shift(); this.bcast({ t: 'ev', e: 'shx', id: s.id }); }
    if (l.length) this.bcast({ t: 'ev', e: 'shard', l });
  }
  tickShards(dt) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i]; s.t -= dt; s.arm -= dt;
      if (s.t <= 0) { this.shards.splice(i, 1); this.bcast({ t: 'ev', e: 'shx', id: s.id }); continue; }
      if (s.arm > 0) continue;
      for (const p of this.players.values()) {
        if (!p.alive || !p.joined || p.ar >= SHARD.CAP) continue;
        if (Math.abs(p.s.x - s.x) < .95 && Math.abs(p.s.z - s.z) < .95 && p.s.y > s.y - 1 && p.s.y < s.y + 1.4) {
          p.ar = Math.min(SHARD.CAP, p.ar + SHARD.AR); p.dirty = true;
          this.shards.splice(i, 1); this.bcast({ t: 'ev', e: 'shx', id: s.id, by: p.id });
          break;
        }
      }
    }
  }
  tickItems(dt) {
    for (const it of this.items) {
      if (it.off) continue;
      if (!it.up) { it.t -= dt; if (it.t <= 0) { it.up = true; const ty = it.type !== it.base ? (it.type = it.base) : undefined; this.bcast({ t: 'ev', e: 'item', i: it.i, up: 1, ty }); } continue; }
      for (const p of this.players.values()) {
        if (!p.alive || !p.joined) continue;
        if (Math.abs(p.s.x - it.x) < 1 && Math.abs(p.s.z - it.z) < 1 && p.s.y > it.y - 1 && p.s.y < it.y + 1.3 && this.give(p, it)) {
          it.up = false; it.t = ITEMS[it.type].respawn;
          this.bcast({ t: 'ev', e: 'item', i: it.i, up: 0, by: p.id });
          if (p.bot && p.ai) p.ai.replan = 0;
          break;
        }
      }
    }
  }

