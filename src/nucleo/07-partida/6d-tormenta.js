  /* =====================================================================
     LA TORMENTA DEL ÚLTIMO MINUTO — solo los modos con `storm` (hoy nomás Arena)
     Cuando quedan STORM.WARN segundos de partida (60, calculado sobre la duración real,
     no un número fijo) se avisa a todos y suena la alerta. STORM.DELAY después (10 s)
     arranca: la zona segura es un círculo que al principio contiene todo el área jugable
     (`bounds` del mapa, o `stormCenter` si el mapa lo declara) y se achica de forma lineal
     hacia el centro durante STORM.SHRINK segundos hasta STORM.MIN_R, y se queda así.
     Afuera se recibe daño continuo que sube con el tiempo y que el blindaje NO frena.
     Los parámetros van por red una sola vez: el cliente calcula el radio con `stormR()`
     y el reloj del servidor. Mientras dura, la corona paga cada STORM.CROWN_EVERY.
     ===================================================================== */

  stormOn() { return !!this.mode.storm; }

  // el círculo inicial: centro y radio que contienen el área jugable del mapa (se calcula una vez)
  stormCircle() {
    const W = this.W;
    if (W._storm) return W._storm;
    const b = W.bounds || { x0: -40, x1: 40, z0: -40, z1: 40 };
    const cx = W.stormCenter ? W.stormCenter[0] : (b.x0 + b.x1) / 2;
    const cz = W.stormCenter ? W.stormCenter[1] : (b.z0 + b.z1) / 2;
    // el radio tiene que llegar a la esquina más lejana, así al arrancar nadie está afuera
    let r = 0;
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) r = Math.max(r, Math.hypot(x - cx, z - cz));
    for (const sp of W.spawns) r = Math.max(r, Math.hypot(sp.x - cx, sp.z - cz));
    W._storm = { cx, cz, r0: Math.ceil(r + STORM.MARGIN), r1: W.stormR || STORM.MIN_R };
    return W._storm;
  }

  // lo que viaja al cliente, una sola vez: [arranque, centro x, centro z, radio inicial, radio final, achique, daño inicial, daño final]
  stormInfo() {
    const s = this.storm;
    return s ? [r2(s.t0), s.cx, s.cz, s.r0, s.r1, STORM.SHRINK, STORM.DMG0, STORM.DMG1] : null;
  }
  stormActive() { return !!(this.storm && this.time >= this.storm.t0); }
  stormRadius() { return this.storm ? stormR(this.stormInfo(), this.time) : 0; }
  // ¿está fuera de la zona segura?
  outStorm(x, z) {
    if (!this.stormActive()) return false;
    const s = this.storm, r = this.stormRadius();
    return Math.hypot(x - s.cx, z - s.cz) > r;
  }
  /* apariciones que quedan dentro de la zona; si no hay ninguna, la más cercana al centro
     (siempre un punto de aparición de verdad, para no dejar a nadie dentro de una pared) */
  stormSpawns(list) {
    if (!this.storm) return list;
    const s = this.storm, r = this.stormActive() ? this.stormRadius() : s.r0;
    const dentro = list.filter(sp => Math.hypot(sp.x - s.cx, sp.z - s.cz) <= r * .9);
    if (dentro.length) return dentro;
    let best = list[0], bd = 1e9;
    for (const sp of list) { const d = Math.hypot(sp.x - s.cx, sp.z - s.cz); if (d < bd) { bd = d; best = sp; } }
    return best ? [best] : list;
  }

  // a dónde corre un bot que quedó afuera: la aparición dentro del círculo que le quede más cerca
  stormRefuge(p) {
    const l = this.stormSpawns(this.W.spawns);
    let best = null, bd = 1e9;
    for (const sp of l) { const d = Math.hypot(sp.x - p.s.x, sp.z - p.s.z); if (d < bd) { bd = d; best = sp; } }
    return best;
  }

  tickStorm(dt) {
    if (!this.stormOn() || this.state !== 'play') return;
    const dur = this.o.timelimit;
    if (dur <= STORM.WARN + STORM.DELAY) return;        // partida muy corta: no da para la tormenta
    if (!this.storm) {
      if (this.left > STORM.WARN) return;
      const c = this.stormCircle();
      this.storm = { t0: this.time + STORM.DELAY, cx: c.cx, cz: c.cz, r0: c.r0, r1: c.r1 };
      this.bcast({ t: 'ev', e: 'stm', a: 'warn', i: this.stormInfo(), d: STORM.DELAY });
      return;
    }
    if (!this.stormActive()) return;
    if (!this.storm.on) { this.storm.on = 1; this.bcast({ t: 'ev', e: 'stm', a: 'go', i: this.stormInfo() }); }
    // daño a los que están afuera, en pasos de STORM.STEP, sin que el blindaje lo frene
    const dps = stormDmg(this.stormInfo(), this.time);
    for (const p of this.players.values()) {
      if (!p.joined || !p.alive) { if (p.stormT) p.stormT = 0; continue; }
      if (!this.outStorm(p.s.x, p.s.z)) { p.stormT = 0; continue; }
      p.stormT = (p.stormT || 0) - dt;
      if (p.stormT <= 0) { p.stormT = STORM.STEP; this.damage(p, dps * STORM.STEP, null, null, null, 0, 'storm'); }
    }
  }
