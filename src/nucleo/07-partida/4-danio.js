  /* ---- daño y muertes ---- */
  damage(t, amt, att, w, dir, ks, how) {
    if (!t.alive || !this.live() || amt <= 0) return;
    if (this.mode.teams && att && att !== t && att.team === t.team) return; // sin fuego amigo
    if (this.mode.snipers && w === 8 && att && att !== t) amt = Math.max(amt, Math.ceil(t.hp + t.ar) + 1);   // en Francotiradores mata de un tiro
    let take = amt;
    // daño hecho (para la tabla final): solo lo que de verdad le sacaste, sin contar lo que sobra al matarlo
    if (att && att !== t) att.dmg = (att.dmg || 0) + Math.min(amt, Math.max(0, t.hp) + t.ar);
    if (t.ar > 0 && !(w != null && WEAPONS[w] && WEAPONS[w].melee)) { const save = Math.min(t.ar, Math.ceil(amt / 3)); t.ar -= save; take -= save; }
    t.hp -= take; t.dirty = true;
    const kick = dir && ks ? [dir[0] * amt * ks, dir[1] * amt * ks, dir[2] * amt * ks] : null;
    if (t.bot) {
      if (kick) { t.s.vx += kick[0]; t.s.vy += kick[1]; t.s.vz += kick[2]; if (kick[1] > 0) t.s.on = false; }
      if (att && att !== t && t.ai) { t.ai.hurtBy = att.id; t.ai.hurtT = 2; }
    } else if (t.send) t.send({ t: 'ev', e: 'dmg', a: att ? att.id : 0, n: Math.round(amt), k: kick ? r3a(kick) : null, from: att && att !== t ? r3a([att.s.x, att.s.y + 1, att.s.z]) : null });
    if (att && att !== t && att.send) att.send({ t: 'ev', e: 'hit', id: t.id, n: Math.round(amt), k: t.hp <= 0 ? 1 : 0, h: this.curHS ? 1 : 0 });
    if (t.hp <= 0) this.kill(t, att, w, how, amt);
  }
  kill(v, att, w, how) {
    const gib = v.hp < -40;
    v.alive = false; v.deadT = 0; v.deaths++; v.dirty = true; v.quadT = 0;
    if (v.lifeT0 != null) { v.bestLife = Math.max(v.bestLife || 0, this.time - v.lifeT0); v.lifeT0 = null; }
    let k = 0;
    const carrier = this.flags.some(f => f.st === 1 && f.by === v.id), scoring = this.state === 'play';
    if (!scoring) { v.deaths--; k = att && att !== v ? att.id : 0; }
    else if (att && att !== v) {
      att.frags++; att.kills++; k = att.id; att.streak++;
      let n = ECON.KILL; const why = [];
      if (v.streak >= 3) { n += ECON.SHUTDOWN; why.push('cortaste una racha'); }
      if (w === 0) { n += ECON.PISTOL; why.push('con pistola'); }
      if (carrier) { n += 150; why.push('frenaste al de la bandera'); }
      this.credit(att, n, why.join(' · '));
    } else v.frags--;
    v.streak = 0;
    this.dropCarried(v);
    const ns = !!(this.curNS && k && k !== v.id && w != null && WEAPONS[w] && WEAPONS[w].scope);
    this.bcast({ t: 'ev', e: 'kill', k, v: v.id, w: w == null ? -1 : w, how: how || 'frag', gib: gib ? 1 : 0, ns: ns ? 1 : 0, p: r3a([v.s.x, v.s.y, v.s.z]) });
    if (scoring) this.dropShards(v);
    if (v.bot && v.ai) v.ai.path = null;
    let won = false;
    if (this.mode.gg && scoring) won = this.ggKill(v, att, w);
    if ((this.mode.tdm || this.mode.tk) && scoring && att && att !== v && att.team !== v.team && att.team >= 0) { this.ts[att.team]++; if (this.ts[att.team] >= (this.mode.teamLimit || this.o.fraglimit)) won = true; }
    if (this.mode.snipers && scoring && att && att !== v && att.streak === 6 && !att.ow[2]) {
      att.ow[2] = 1; att.am.shells = 999; att.dirty = true;
      if (att.send) att.send({ t: 'ev', e: 'unlock', w: 2 });
      this.bcast({ t: 'ev', e: 'sys', m: att.name + ' hizo una racha de 6 bajas: ¡desbloqueó la escopeta doble!' });
    }
    this.sendScores();
    if (won || (scoring && !this.mode.gg && !this.mode.teams && att && att !== v && att.frags >= this.o.fraglimit)) this.endMatch();
  }
  /* ---- gungame: subir y bajar de nivel ---- */
  ggKill(v, att, w) {
    const down = (p, why) => {
      if (p.lvl <= 0) return;
      p.lvl--; p.dirty = true;
      if (p.send) p.send({ t: 'ev', e: 'lvl', n: p.lvl, w: GG[p.lvl], down: 1, why });
    };
    if (!att || att === v) { down(v, 'te mataste solo'); return false; }
    // el cuchillo siempre baja de nivel al que muere
    if (w === 7) { down(v, 'te mataron con cuchillo'); this.bcast({ t: 'ev', e: 'sys', m: att.name + ' acuchilló a ' + v.name + ' y le bajó un nivel' }); }
    if (w !== GG[att.lvl]) return false; // para subir hay que matar con el arma del nivel actual
    att.lvl++;
    if (att.lvl >= GG.length) return true;
    const nw = GG[att.lvl];
    if (att.alive) { att.ow = new Array(NW).fill(0); att.ow[nw] = 1; att.ow[7] = 1; att.w = nw; if (WEAPONS[nw].mag) { att.mag[nw] = WEAPONS[nw].mag; att.relT[nw] = 0; } att.lastFire = this.time - .5; att.dirty = true; }
    if (att.send) att.send({ t: 'ev', e: 'lvl', n: att.lvl, w: nw });
    if (att.lvl === GG.length - 1) this.bcast({ t: 'ev', e: 'sys', m: att.name + ' llegó al cuchillo: le falta una baja' });
    return false;
  }
