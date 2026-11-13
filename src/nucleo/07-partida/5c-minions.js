  /* =====================================================================
     MINIONS DEFENSORES (Captura el dominio)
     Robotitos del color de su equipo que cuidan cada generador: patrullan alrededor, persiguen al que se
     acerca, lo atacan y vuelven al puesto si se aleja. Son entidades del servidor, distintas de los bots
     jugadores: no entran al marcador ni al tablero, dan créditos al matarlos y vuelven a aparecer cada
     DOM.MIN.RESP mientras su generador siga en pie. Al caer el generador, los suyos se apagan.
     Estados (m.st): 0 patrulla · 1 persigue · 2 ataca · 3 vuelve al puesto.
     Los disparos contra ellos se validan con el mismo rebobinado que contra los jugadores (m.hist).
     ===================================================================== */
  domMinSetup() {
    const d = this.dom; if (!d) return;
    d.mins = []; d.mid = 1; d.minT = 0; d.minSent = new Map();
    const M = MAPS[this.W.id];
    d.gens.forEach((g, gi) => { for (let k = 0; k < DOM.MIN.POR_GEN; k++) this.domMinSpawn(gi, k); });
  }
  domMinSpawn(gi, k) {
    const d = this.dom, g = d.gens[gi]; let hx2, hz2;
    if (!d || !g || g.hp <= 0) return null;
    if (d.mins.filter(m => m.team === g.team && m.hp > 0).length >= DOM.MIN.MAX) return null;
    // se plantan en el camino por el que entra el rival (entre el generador y su punto de ataque): son la
    // primera línea. Ese tramo siempre es terreno abierto y transitable, en cualquiera de los tres carriles.
    const lado = k % 2 ? 1 : -1, f = .45 + (k >> 1) * .15;
    const ax = g.atk.x - g.x, az = g.atk.z - g.z, al = Math.hypot(ax, az) || 1;
    const hx = g.x + ax * f - az / al * lado * 2.3, hz = g.z + az * f + ax / al * lado * 2.3, y0 = g.y + (g.atk.y - g.y) * f;
    // si justo ahí hay una caja o una columna, prueba unos lugares cerca antes de rendirse
    let px = hx, pz = hz, py = y0;
    for (const [ox, oz] of [[0, 0], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [2.6, 2.6], [-2.6, -2.6]]) {
      const qx = hx + ox, qz = hz + oz, h = raycast(this.W, qx, y0 + 2.2, qz, 0, -1, 0, 7);
      if (!h) continue;
      const qy = y0 + 2.2 - h.t;
      if (solidAt(this.W, qx, qy + .05, qz, DOM.MIN.R, DOM.MIN.H)) continue;
      px = qx; pz = qz; py = qy; break;
    }
    const hy = py; hx2 = px; hz2 = pz;
    const m = {
      id: d.mid++, team: g.team, gen: gi, kind: k % 2,   // 0 cuerpo a cuerpo, 1 a distancia
      x: hx2, y: hy, z: hz2, yaw: Math.atan2(-ax / al, -az / al),
      hp: DOM.MIN.HP, st: 0, t: 0, tgt: 0, cd: .5 + Math.random(), home: { x: hx2, y: hy, z: hz2 }, ph: Math.random() * 6, hist: []
    };
    d.mins.push(m);
    this.domEv({ a: 'min+', i: m.id, p: r3a([m.x, m.y, m.z]), k: m.kind, b: m.team });
    return m;
  }
  /* Estado de red: lista plana y cuantizada (id, x, y, z, giro, vida·8+estado). `delta` manda solo los que
     cambiaron desde la última vez; un minion en su puesto no gasta nada, porque quieto no cambia nada. */
  domMinState(delta) {
    const d = this.dom; if (!d || !d.mins) return null;
    const out = [];
    for (const m of d.mins) {
      if (m.hp <= 0) continue;
      // el último número lleva vida, estado, equipo y tipo juntos: así el que entra a mitad de partida
      // puede armar los minions que todavía no vio aparecer
      const v = [m.id, r1(m.x), r1(m.y), r1(m.z), Math.round(m.yaw * 10), ((Math.round(m.hp / DOM.MIN.HP * 100) * 4 + m.st) * 2 + m.team) * 2 + m.kind];
      if (delta) { const a = d.minSent.get(m.id); if (a && a[1] === v[1] && a[2] === v[2] && a[3] === v[3] && a[4] === v[4] && a[5] === v[5]) continue; d.minSent.set(m.id, v); }
      out.push(v[0], v[1], v[2], v[3], v[4], v[5]);
    }
    return out.length ? out : null;
  }
  tickMins(dt) {
    const d = this.dom, K2 = DOM.MIN; if (!d || !d.mins || this.state !== 'play') return;
    d.minT -= dt;
    const reponer = d.minT <= 0; if (reponer) d.minT = 2;
    for (let i = d.mins.length - 1; i >= 0; i--) {
      const m = d.mins[i];
      if (m.hp <= 0) { if (this.time - m.t > K2.RESP) { d.mins.splice(i, 1); this.domMinSpawn(m.gen, m.id % DOM.MIN.POR_GEN); } continue; }
      if (d.gens[m.gen].hp <= 0) { this.domMinDown(m, null, true); continue; }   // sin generador no hay minions
      this.tickMin(m, dt);
      if (this.state !== 'play') return;
      const h = m.hist; h.push([this.time, m.x, m.y, m.z]); if (h.length > 28) h.shift();
    }
    if (reponer) for (let gi = 0; gi < d.gens.length; gi++) {
      if (d.gens[gi].hp <= 0) continue;
      const vivos = d.mins.filter(m => m.gen === gi && m.hp > 0).length;
      if (vivos < K2.POR_GEN && !d.mins.some(m => m.gen === gi && m.hp <= 0)) this.domMinSpawn(gi, vivos);
    }
  }
  tickMin(m, dt) {
    const K2 = DOM.MIN, g = this.dom.gens[m.gen];
    m.cd -= dt;
    // a quién tiene cerca (lo recalcula cada 1/4 de segundo)
    m.t2 = (m.t2 || 0) - dt;
    if (m.t2 <= 0) {
      m.t2 = .25; let mejor = null, md = 1e9;
      for (const t of this.players.values()) {
        if (!t.alive || !t.joined || t.team === m.team || t.team < 0) continue;
        const dd = Math.hypot(t.s.x - m.x, t.s.z - m.z);
        if (dd > K2.SEE || Math.abs(t.s.y - m.y) > 7) continue;
        if (Math.hypot(t.s.x - m.home.x, t.s.z - m.home.z) > K2.LEASH) continue;
        if (dd > 11 && !los(this.W, m.x, m.y + 1.2, m.z, t.s.x, t.s.y + 1.2, t.s.z) && !los(this.W, m.x, m.y + 1.2, m.z, t.s.x, t.s.y + .3, t.s.z)) continue;   // a menos de 8 m lo tiene encima: no hace falta verlo
        if (dd < md) { md = dd; mejor = t; }
      }
      m.tgt = mejor ? mejor.id : 0;
    }
    const t = m.tgt ? this.players.get(m.tgt) : null;
    const alcance = m.kind ? K2.RANGE_D : K2.RANGE_C;
    let wx = 0, wz = 0;
    if (t && t.alive) {
      const dx = t.s.x - m.x, dz = t.s.z - m.z, dl = Math.hypot(dx, dz) || 1e-6;
      m.yaw = Math.atan2(-dx, -dz);
      if (dl > alcance * .85) { m.st = 1; wx = dx / dl; wz = dz / dl; }
      else {
        m.st = 2;
        if (dl < alcance * .5 && m.kind) { wx = -dx / dl * .6; wz = -dz / dl * .6; }   // el de lejos se despega
        if (m.cd <= 0) {
          m.cd = m.kind ? K2.RATE_D : K2.RATE_C;
          if (m.kind) this.domMinShoot(m, t); else { this.damage(t, K2.DMG_C, null, null, [dx / dl, .3, dz / dl], .04, 'minion'); this.domEv({ a: 'minhit', i: m.id }); }
          if (this.state !== 'play') return;
        }
      }
    } else {
      const dh = Math.hypot(m.x - m.home.x, m.z - m.home.z);
      if (dh > 1.2) { m.st = 3; wx = (m.home.x - m.x) / dh; wz = (m.home.z - m.z) / dh; }
      else m.st = 0;   // en su puesto: se queda quieto (el vaivén de mirar alrededor lo hace el cliente)
    }
    // si choca con una caja o un parapeto, se corre de costado un momento y la rodea
    if (m.rodeoT > 0) { m.rodeoT -= dt; const px = -wz || 1, pz = wx; wx = (wx + px * m.rodeo * 1.6) * .6; wz = (wz + pz * m.rodeo * 1.6) * .6; }
    if (!this.domMinMove(m, wx, wz, dt) && (wx || wz) && m.rodeoT <= 0) { m.rodeo = Math.random() < .5 ? -1 : 1; m.rodeoT = .7; }
    if (Math.hypot(m.x - m.home.x, m.z - m.home.z) > DOM.MIN.LEASH * 1.4) { m.x = m.home.x; m.y = m.home.y; m.z = m.home.z; m.st = 0; m.tgt = 0; m.hist.length = 0; }   // red de seguridad
  }
  // movimiento sencillo: avanza pegado al piso y no atraviesa paredes ni barreras de otros
  domMinMove(m, wx, wz, dt) {
    if (!wx && !wz) return true;
    const K2 = DOM.MIN, sp = K2.SPD * dt, prev = setPasa(m.team);
    try {
      for (const [ax, az] of [[wx * sp, wz * sp], [wx * sp, 0], [0, wz * sp]]) {
        if (!ax && !az) continue;
        const nx = m.x + ax, nz = m.z + az;
        // escalón: busca el piso un poco más arriba y se deja caer
        const h = raycast(this.W, nx, m.y + K.STEP + .4, nz, 0, -1, 0, 3.4);
        if (!h) continue;                                   // no hay piso: no se tira al vacío
        const ny = m.y + K.STEP + .4 - h.t;
        if (ny - m.y > K.STEP + .06) continue;
        if (solidAt(this.W, nx, ny + .05, nz, K2.R, K2.H)) continue;
        m.x = nx; m.z = nz; m.y = ny; return true;
      }
      return false;
    } finally { setPasa(prev); }
  }
  domMinShoot(m, t) {
    const K2 = DOM.MIN, dx = t.s.x - m.x, dy = t.s.y + 1 - (m.y + 1.1), dz = t.s.z - m.z, dl = Math.hypot(dx, dy, dz) || 1;
    this.domEv({ a: 'minfire', i: m.id, p: r3a([t.s.x, t.s.y + 1, t.s.z]) });
    const prev = setPasa(m.team), h = raycast(this.W, m.x, m.y + 1.1, m.z, dx / dl, dy / dl, dz / dl, dl); setPasa(prev);
    if (h) return;   // le pegó a una pared
    this.damage(t, K2.DMG_D, null, null, [dx / dl, .2, dz / dl], .03, 'minion');
  }
  // un jugador dice que le pegó a un minion (id = -1000 - idMinion)
  domMinClaim(p, o, d, id, n, W_) {
    const dm = this.dom; if (!dm || !dm.mins) return;
    const m = dm.mins.find(q => q.id === -1000 - id);
    if (!m || m.hp <= 0 || m.team === p.team) return;
    const falso = { s: { x: m.x, y: m.y, z: m.z, vx: 0, vz: 0 }, hist: m.hist.map(h => [h[0], h[1], h[2], h[3]]) };
    if (!this.validHit(o, d, falso, W_, p)) return;
    const dist = Math.hypot(m.x - o[0], m.y + 1 - o[1], m.z - o[2]);
    const dmg = W_.melee ? W_.dmg : W_.type === 'rail' ? W_.dmg : n * W_.dmg * falloff(W_, dist);
    this.domMinDamage(m, dmg * this.mult(p), p);
  }
  domMinDamage(m, amt, att) {
    if (m.hp <= 0 || !(amt > 0)) return 0;
    const real = Math.min(m.hp, amt); m.hp -= real;
    if (att && att.send) att.send({ t: 'ev', e: 'hit', id: -1000 - m.id, n: Math.round(real), k: m.hp <= 0 ? 1 : 0, h: 0 });
    if (m.hp <= 0) this.domMinDown(m, att, false);
    return real;
  }
  domMinDown(m, att, apagado) {
    m.hp = 0; m.t = this.time; m.st = 0; m.tgt = 0; m.hist.length = 0;
    if (att) { this.credit(att, DOM.MIN.CRED, 'minion'); att.mins = (att.mins || 0) + 1; }
    this.domEv({ a: 'min-', i: m.id, p: r3a([m.x, m.y, m.z]), off: apagado ? 1 : 0, b: m.team });
  }
  // daño de área (explosiones y fuego) a los minions del equipo rival
  domMinBlast(own, x, y, z, rad, dmg, sfall) {
    const dm = this.dom; if (!dm || !dm.mins || !own) return;
    for (const m of dm.mins) {
      if (m.hp <= 0 || m.team === own.team) continue;
      const ds = Math.hypot(x - m.x, Math.max(0, Math.abs(y - (m.y + .8)) - .8), z - m.z);
      if (ds < rad) this.domMinDamage(m, dmg * (1 - sfall * ds / rad), own);
    }
  }
  // para los bots: el minion rival más cercano que estorba y se puede ver
  domMinTarget(p, range) {
    const dm = this.dom; if (!dm || !dm.mins) return null;
    let best = null, bd = 1e9;
    const prev = setPasa(p.team);
    try {
      for (const m of dm.mins) {
        if (m.hp <= 0 || m.team === p.team) continue;
        const dd = Math.hypot(m.x - p.s.x, m.z - p.s.z);
        if (dd > range || dd > bd) continue;
        if (!los(this.W, p.s.x, p.s.y + K.EYE, p.s.z, m.x, m.y + 1, m.z)) continue;
        bd = dd; best = m;
      }
    } finally { setPasa(prev); }
    return best;
  }

