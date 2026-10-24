  /* ---- aparición ---- */
  pickSpawn(p) {
    const alive = [...this.players.values()].filter(q => q.alive && (!this.mode.teams || !p || q.team !== p.team));
    const list = this.mode.teams && p && p.team >= 0 && this.W.tspawns ? this.W.tspawns[p.team] : this.W.spawns;
    const scored = list.map(sp => {
      let d = 1e9; for (const q of alive) d = Math.min(d, Math.hypot(q.s.x - sp.x, q.s.y - sp.y, q.s.z - sp.z));
      return { sp, d: d + Math.random() * 6 };
    }).sort((a, b) => b.d - a.d);
    return scored[Math.floor(Math.random() * Math.min(3, scored.length))].sp;
  }
  loadout(p) {
    if (this.mode.snipers) {   // solo francotirador y cuchillo; la escopeta doble se gana con una racha de 6 y se pierde al morir
      p.ow = new Array(NW).fill(0); p.ow[8] = 1; p.ow[7] = 1; p.w = 8; p.ar = 0;
      p.am = AMMO0(999); this.fillMags(p);
      return;
    }
    if (this.mode.gg) {
      const w = GG[Math.min(p.lvl, GG.length - 1)];
      p.ow = new Array(NW).fill(0); p.ow[w] = 1; p.ow[7] = 1; p.w = w; p.ar = 0;
      p.am = AMMO0(999); this.fillMags(p);
      return;
    }
    const mul = p.perk.am ? 2 : 1;
    p.ow = OW0(); p.am = AMMO0(0); p.am.shells = 10 * mul; p.am.bullets = 60 * mul;
    for (const it of SHOP) if (it.w != null && it.pack && !it.once && p.unl[it.w]) { if (isPrimary(it.w)) setPrimary(p, it.w); else p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n * mul); }
    if (primaryOf(p.ow) !== 1) p.ow[1] = 0;
    p.ar = p.perk.ar; this.fillMags(p);
  }
  fillMags(p) { p.mag = {}; p.relT = {}; WEAPONS.forEach((W_, i) => { if (W_.mag) p.mag[i] = W_.mag; }); }
  spawn(p) {
    const sp = this.pickSpawn(p);
    p.s = { x: sp.x, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, on: true };
    p.yaw = sp.yaw; p.pitch = 0; p.hp = 100; p.w = 1; p.quadT = 0; p.megaT = 0; p.lifeT0 = this.time;
    if (p.bot && this.mode.shop) this.botShop(p);
    this.loadout(p);
    p.alive = true; p.dirty = true; p.spawnT = this.time; p.lavaT = 0;
    if (p.send) p.send({ t: 'spawn', p: [sp.x, sp.y, sp.z], yaw: sp.yaw, ow: p.ow, am: p.am, ar: p.ar, w: p.w });
    this.bcast({ t: 'ev', e: 'tp', p: [sp.x, sp.y, sp.z] });
    if (p.bot) { p.ai = this.newAI(); const best = [6, 8, 5, 3, 2, 4].find(w => p.ow[w]); if (best != null && !this.mode.gg) p.w = best; }
  }

  /* ---- tienda ---- */
  buy(p, id) {
    const it = SHOP_BY_ID[id];
    const no = why => p.send && p.send({ t: 'ev', e: 'buy', id, ok: 0, why });
    if (!this.mode.shop) return no('En ' + this.mode.name + ' no hay tienda');
    if (!it || !p.joined) return no('No se puede comprar');
    if (!this.live()) return no('La partida terminó');
    if (it.once && !p.alive) return no('Comprala cuando estés vivo: si te matan se pierde');
    if (it.once && p.am[it.pack[0]] >= AMMO_MAX[it.pack[0]]) return no('Ya llevás el máximo');
    if (it.w != null && isPrimary(it.w) && primaryOf(p.ow) === it.w && (it.free || p.unl[it.w])) return no('Ya la tenés');
    if (it.free && !(it.w != null && isPrimary(it.w))) return no('No se puede comprar');
    if (it.w != null && !it.once && !isPrimary(it.w) && p.unl[it.w]) return no('Ya lo tenés');
    if (it.armor && p.perk.ar >= it.armor) return no('Ya tenés ese blindaje');
    if (it.id === 'am' && p.perk.am) return no('Ya la tenés');
    if (p.cr < it.price) return no('Te faltan ' + (it.price - p.cr) + ' créditos');
    p.cr -= it.price;
    if (it.once) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); }
    else if (it.w != null && isPrimary(it.w)) {
      // reemplaza a la principal que tenías (y es la que te toca al reaparecer)
      for (const k of PRIMARY) p.unl[k] = 0; if (!it.free) p.unl[it.w] = 1;
      if (p.alive) { setPrimary(p, it.w); if (it.pack) { const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); } else p.am.shells = Math.max(p.am.shells, 10); }
    }
    else if (it.w != null) {
      p.unl[it.w] = 1;
      if (p.alive) { p.ow[it.w] = 1; const [k, n] = it.pack; p.am[k] = Math.min(AMMO_MAX[k], p.am[k] + n); }
    } else if (it.armor) { p.perk.ar = it.armor; if (p.alive) p.ar = Math.max(p.ar, it.armor); }
    else if (it.id === 'am') { p.perk.am = 1; }
    else if (it.id === 'rf' && p.alive) {
      for (const s of SHOP) if (s.w != null && p.ow[s.w] && s.pack) { const [k, n] = s.pack; p.am[k] = Math.max(p.am[k], Math.min(AMMO_MAX[k], n * 2)); }
      p.am.shells = Math.max(p.am.shells, 20); p.am.bullets = Math.max(p.am.bullets, 100);
    }
    p.dirty = true;
    if (p.send) p.send({ t: 'ev', e: 'buy', id, ok: 1 });
    this.sendScores();
  }
  botShop(p) {
    for (const id of ['w5', 'w8', 'a1', 'w3', 'w9', 'w2', 'w6', 'a2', 'w4', 'am']) {
      const it = SHOP_BY_ID[id];
      if ((it.w != null && p.unl[it.w]) || (it.armor && p.perk.ar >= it.armor) || (id === 'am' && p.perk.am)) continue;
      if (p.cr >= it.price) { p.cr -= it.price; if (it.w != null) p.unl[it.w] = 1; else if (it.armor) p.perk.ar = it.armor; else p.perk.am = 1; }
      break;
    }
  }
  credit(p, n, why) {
    if (!this.mode.shop) return;
    p.cr = Math.min(ECON.MAX, p.cr + n); p.dirty = true;
    if (p.send) p.send({ t: 'ev', e: 'cr', n, why });
  }

