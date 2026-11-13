  /* =====================================================================
     LA CORONA — solo los modos con `crown` (hoy nomás Arena)
     Hay una sola corona por partida y la lleva uno solo. Aparece a los 45 s de que arranca
     el reloj (CROWN.AT) en un punto de aparición seguro y se avisa a todos.
     Cada 15 s seguidos de tenerla (CROWN.EVERY) el portador suma 1 punto al tablero —el mismo
     contador de bajas que define al ganador— y 100 créditos. Si la pierde, el reloj vuelve a cero.
     Al que mata al portador le dan 2 puntos extra. Todo lo decide el servidor: el cliente dibuja.
     ===================================================================== */

  crownOn() { return !!this.mode.crown; }
  // cada cuánto paga: la mitad mientras la tormenta está activa
  crownEvery() { return this.stormOn() && this.stormActive() ? Math.min(CROWN.EVERY, STORM.CROWN_EVERY) : CROWN.EVERY; }

  // un punto de aparición seguro, lejos de donde se perdió la corona
  crownSpot(ax, az) {
    let list = this.W.spawns;
    if (!list || !list.length) return null;
    if (this.stormOn() && this.storm) list = this.stormSpawns(list);   // con la tormenta, siempre dentro del círculo
    const far = ax == null ? null : list.filter(sp => Math.hypot(sp.x - ax, sp.z - az) > CROWN.FAR);
    const pool = far && far.length ? far : list;
    return pool[(Math.random() * pool.length) | 0];
  }

  // cuánto lleva seguido el portador (el cliente lo calcula igual, con el reloj del servidor)
  crownProg() { const c = this.crown; return c && c.by ? Math.max(0, this.time - c.t0) : 0; }
  /* Estado completo, para el `welcome` y para resincronizar una vez por segundo en `sc`.
     Va `t0` (cuándo arrancó la cuenta de los 15 s) y no el progreso: así el cliente lo calcula
     solo con el reloj del servidor y el snapshot no tiene que llevar nada de la corona. */
  crownState() {
    if (!this.crownOn()) return null;
    const c = this.crown;
    if (!c) return [0, 0, 0, 0, 0, 0];
    return [r2(c.x), r2(c.y), r2(c.z), c.by, r2(c.t0), c.dead > 0 ? 1 : 0];
  }

  spawnCrown() {
    const sp = this.crownSpot(null, null); if (!sp) return;
    this.crown = { x: sp.x, y: sp.y + .8, z: sp.z, by: 0, arm: 0, idle: 0, t0: 0, dead: 0, lx: null, lz: null };
    this.bcast({ t: 'ev', e: 'crw', a: 'spawn', p: r3a([this.crown.x, this.crown.y, this.crown.z]) });
    this.bcast({ t: 'ev', e: 'sys', m: '¡Apareció La Corona! Cada ' + CROWN.EVERY + ' s con ella puesta valen ' + CROWN.PTS + ' punto y ' + CROWN.CASH + ' créditos' });
    this.sendScores();
  }

  // la muda a otro punto seguro (quedó sola mucho tiempo, o se cayó al vacío)
  moveCrown(ax, az) {
    const c = this.crown, sp = this.crownSpot(ax, az);
    if (!c || !sp) return;
    c.x = sp.x; c.y = sp.y + .8; c.z = sp.z;
    c.by = 0; c.t0 = 0; c.idle = 0; c.arm = 0; c.dead = 0;
    this.bcast({ t: 'ev', e: 'crw', a: 'move', p: r3a([c.x, c.y, c.z]) });
  }

  takeCrown(p) {
    const c = this.crown;
    if (!c || c.by || c.arm > 0 || c.dead > 0 || !p.alive || !p.joined) return false;
    c.by = p.id; c.t0 = this.time; c.idle = 0;
    c.x = p.s.x; c.y = p.s.y + CROWN.HEAD; c.z = p.s.z;
    this.bcast({ t: 'ev', e: 'crw', a: 'take', id: p.id, n: p.name, t0: r2(c.t0) });
    return true;
  }

  // se llama desde dropCarried(): vale para la muerte y para el que se desconecta
  dropCrown(p) {
    const c = this.crown;
    if (!c || c.by !== p.id) return;
    const oy = p.s.y + 1, hit = raycast(this.W, p.s.x, oy, p.s.z, 0, -1, 0, 16), tr = triggers(this.W, p.s);
    c.by = 0; c.t0 = 0; c.idle = 0; c.arm = CROWN.ARM; c.lx = p.s.x; c.lz = p.s.z;
    c.x = p.s.x; c.z = p.s.z; c.y = hit ? oy - hit.t + .8 : oy;
    // en la lava, en el agua, fuera del mapa o colgada en el aire: se pierde y vuelve sola a un punto seguro
    if (!hit || tr.lava || tr.water || p.s.y < K.KILLY + 2) c.dead = CROWN.VOID;
    this.bcast({ t: 'ev', e: 'crw', a: 'drop', p: r3a([c.x, c.y, c.z]), v: c.dead > 0 ? 1 : 0, id: p.id });
  }

  tickCrown(dt) {
    if (!this.crownOn() || this.state !== 'play') return;
    const c = this.crown;
    if (!c) { if (this.o.timelimit - this.left >= CROWN.AT) this.spawnCrown(); return; }

    if (c.dead > 0) {                                   // se cayó al vacío: vuelve en CROWN.VOID segundos
      c.dead -= dt;
      if (c.dead <= 0) { c.dead = 0; this.moveCrown(c.lx, c.lz); }
      return;
    }

    if (c.by) {                                         // la tiene alguien
      const h = this.players.get(c.by);
      if (!h || !h.joined) { c.by = 0; c.arm = CROWN.ARM; c.t0 = 0; c.idle = 0; return; }
      if (!h.alive) { this.dropCrown(h); return; }
      c.x = h.s.x; c.y = h.s.y + CROWN.HEAD; c.z = h.s.z;
      h.ctime += dt;
      const every = this.crownEvery();
      while (this.time - c.t0 >= every) {
        c.t0 += every;
        h.kills += CROWN.PTS; h.cpts += CROWN.PTS; h.dirty = true;
        this.credit(h, CROWN.CASH, 'la corona');
        this.bcast({ t: 'ev', e: 'crw', a: 'pay', id: h.id, n: h.name, pts: CROWN.PTS, cr: CROWN.CASH, t0: r2(c.t0) });
      }
      return;
    }

    // suelta en el piso
    if (c.arm > 0) c.arm -= dt;
    c.idle += dt;
    if (c.idle >= CROWN.IDLE) { this.moveCrown(c.lx, c.lz); return; }   // nadie la levanta: se muda lejos
    if (this.stormOn() && this.outStorm(c.x, c.z)) { this.moveCrown(c.lx, c.lz); return; }   // quedó fuera de la zona: vuelve adentro
    if (c.arm > 0) return;
    for (const p of this.players.values()) {
      if (!p.alive || !p.joined) continue;
      if (Math.abs(p.s.x - c.x) < CROWN.R && Math.abs(p.s.z - c.z) < CROWN.R && p.s.y > c.y - 2 && p.s.y < c.y + 1.4) { this.takeCrown(p); break; }
    }
  }

