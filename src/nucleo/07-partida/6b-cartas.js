
  /* =====================================================================
     CARTAS DE MEJORA (estilo roguelike) — Arena, Team Deathmatch y Captura la bandera
     A las 3, 6 y 9 bajas le aparecen 3 cartas al azar (de 9) y elige una con 1-2-3.
     Son del servidor: el cliente solo las dibuja. Máximo 3 por partida y duran hasta el final.
     ===================================================================== */

  // se llama desde kill() cada vez que alguien sube una baja
  checkCard(p) {
    if (!this.mode.cards || p.cof || p.cards.length >= CARD_MAX) return;
    if (p.kills < CARD_AT[p.cards.length]) return;
    this.offerCards(p);
  }
  // tres al azar entre las que todavía no tiene
  offerCards(p) {
    const pool = [];
    for (const c of CARDS) if (!hasCard(p, c.id)) pool.push(c.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0, t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const l = pool.slice(0, CARD_PICK);
    if (!l.length) return;
    p.cof = l; p.cofT = CARD_TIME;
    if (p.bot) { this.takeCard(p, (Math.random() * l.length) | 0); return; }   // los bots eligen al azar y al toque, así no quedan en desventaja
    if (p.send) p.send({ t: 'ev', e: 'cof', l, n: p.cards.length + 1, of: CARD_MAX, d: CARD_TIME });
  }
  takeCard(p, i) {
    if (!p.cof || !p.cof.length) return;
    const id = p.cof[clamp(i | 0, 0, p.cof.length - 1)];
    p.cof = null; p.cofT = 0;
    p.cards.push(id); p.dirty = true;
    if (hasCard(p, 'trofeo') && p.alive) { p.ar = Math.min(100, p.ar + CARD_FX.KILL_AR); }   // la que da blindaje arranca cobrando la baja que la destrabó
    if (p.send) p.send({ t: 'ev', e: 'card', id, l: p.cards.slice() });
    if (!p.bot) this.bcast({ t: 'ev', e: 'sys', m: p.name + ' tomó la carta ' + CARD_BY[id].name });
  }
  // cuenta para atrás de la elección: si se le acaba el tiempo se queda con la primera
  tickCards(dt) {
    for (const p of this.players.values()) {
      if (!p.cof) continue;
      p.cofT -= dt;
      if (p.cofT <= 0) this.takeCard(p, 0);
    }
  }

  /* ---- toque ígneo: el golpeado queda prendido fuego y se va quemando ---- */
  ignite(t, att) {
    t.burnT = CARD_FX.BURN_T; t.burnBy = att.id; t.burnTick = CARD_FX.BURN_EVERY;
    this.bcast({ t: 'ev', e: 'burn', id: t.id, d: CARD_FX.BURN_T });
  }
  tickBurn(dt) {
    for (const t of this.players.values()) {
      if (!(t.burnT > 0)) continue;
      if (!t.alive || !t.joined) { t.burnT = 0; continue; }
      t.burnT -= dt; t.burnTick -= dt;
      if (t.burnTick > 0) continue;
      t.burnTick = CARD_FX.BURN_EVERY;
      this.damage(t, CARD_FX.BURN_DMG, this.players.get(t.burnBy) || null, null, null, 0, 'fire');
      if (!this.live()) return;
    }
  }

  /* ---- carga mortal: el que muere explota (se llama al final de kill()) ---- */
  deathBlast(v) {
    const R = CARD_FX.BLAST_R, D = CARD_FX.BLAST_DMG, ox = v.s.x, oy = v.s.y + .9, oz = v.s.z;
    this.bcast({ t: 'ev', e: 'cblast', p: r3a([ox, oy, oz]), r: R });
    for (const t of this.players.values()) {
      if (!t.alive || !t.joined || t === v) continue;
      if (this.mode.teams && t.team === v.team) continue;
      const d = boxDist(ox, oy, oz, t.s.x, t.s.y, t.s.z);
      if (d >= R) continue;
      if (!los(this.W, ox, oy, oz, t.s.x, t.s.y + .9, t.s.z) && !los(this.W, ox, oy, oz, t.s.x, t.s.y + .2, t.s.z)) continue;
      const cx = t.s.x - ox, cy = t.s.y + .9 - oy, cz = t.s.z - oz, cl = Math.hypot(cx, cy, cz) || 1;
      this.damage(t, D * (1 - .5 * d / R), v, null, [cx / cl, cy / cl, cz / cl], .16, 'cblast');
      if (!this.live()) return;
    }
  }
