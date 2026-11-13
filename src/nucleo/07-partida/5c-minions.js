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
    d.ola = 0; d.olaT = DOM.MIN.OLA_INI; d.rutas = {};
    for (const p of this.players.values()) p.minSent = null;
    d.gens.forEach((g, gi) => { for (let k = 0; k < DOM.MIN.POR_GEN; k++) this.domMinSpawn(gi, k); });
  }
  // cuánto crecieron los minions con el tiempo (vida y daño)
  domMinEscala() { return 1 + DOM.MIN.CRECE * Math.floor((DOM.TIME - this.left) / DOM.MIN.CRECE_CADA); }
  /* Ruta de una oleada: del frente de su propia muralla al frente de los generadores rivales del mismo
     carril, por la navegación de los bots (cruza puentes y túneles igual que un jugador). Se calcula una
     vez por partida y se guarda simplificada (un punto cada ~4 m). */
  domRuta(team, lane, haciaBoss) {
    const d = this.dom, key = team * 10 + lane + (haciaBoss ? 5 : 0);
    if (d.rutas[key]) return d.rutas[key];
    const media = gs => ({ x: gs.reduce((s, g) => s + g.atk.x, 0) / gs.length, y: gs.reduce((s, g) => s + g.atk.y, 0) / gs.length, z: gs.reduce((s, g) => s + g.atk.z, 0) / gs.length });
    const mias = d.gens.filter(g => g.team === team && g.lane === lane), suyas = d.gens.filter(g => g.team !== team && g.lane === lane);
    const a = media(mias), M = MAPS[this.W.id], bp = M.bossPts && M.bossPts[1 - team] && M.bossPts[1 - team][lane === 2 ? 1 : 0];
    const b = haciaBoss && bp ? { x: bp.x, y: bp.y || 0, z: bp.z } : media(suyas);
    const ini = haciaBoss ? media(suyas) : a;
    let ruta = [ini, b];
    try {
      const nav = getNav(this.W), s = findNode(nav, ini.x, ini.y, ini.z), e = findNode(nav, b.x, b.y, b.z);
      if (s && e) {
        const { prev } = dijkstra(nav, e.id, this.domBan(team));
        const pts = []; let i = s.id, n = 0;
        while (i >= 0 && n++ < 5000) { const q = nav.nodes[i]; pts.push({ x: q.x + .5, y: q.y, z: q.z + .5 }); if (i === e.id) break; i = prev[i]; }
        if (pts.length > 1 && i === e.id) ruta = pts.filter((p, k) => k % 4 === 0 || k === pts.length - 1);
      }
    } catch (er) { /* sin navegación: línea recta */ }
    return d.rutas[key] = ruta;
  }
  // sale una oleada: por cada carril, cuerpo a cuerpo y a distancia (y asedio cada tanto)
  domOla() {
    const d = this.dom, K2 = DOM.MIN; d.ola++;
    for (const team of [0, 1]) for (let lane = 0; lane < 3; lane++) {
      const ruta = this.domRuta(team, lane), ini = ruta[0];
      const tipos = []; for (let k = 0; k < K2.OLA_C; k++) tipos.push(0); for (let k = 0; k < K2.OLA_D; k++) tipos.push(1);
      if (d.ola % K2.ASEDIO_CADA === 0) tipos.push(2);
      tipos.forEach((kind, k) => {
        if (d.mins.filter(m => m.ola && m.team === team && m.hp > 0).length >= K2.MAX) return;
        // en fila detrás del primer punto de la ruta, siempre en un lugar libre (si no, quedaría encajado)
        let px = ini.x, pz = ini.z;
        for (const [ox, oz] of [[(k % 3 - 1) * 1.2, ((k / 3) | 0) * 1.4], [0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [2, 2], [-2, -2]]) {
          if (!solidAt(this.W, ini.x + ox, ini.y + .05, ini.z + oz, DOM.MIN.R, DOM.MIN.H)) { px = ini.x + ox; pz = ini.z + oz; break; }
        }
        const m = this.domMinNuevo(team, -1, kind, px, ini.y, pz);
        m.ola = 1; m.lane = lane; m.ruta = ruta; m.wp = 1;
      });
    }
    this.domEv({ a: 'ola', n: d.ola });
  }
  domMinNuevo(team, gi, kind, x, y, z) {
    const d = this.dom, K2 = DOM.MIN, es = this.domMinEscala(), hpMax = (kind === 2 ? K2.HP_AS : K2.HP) * es;
    const m = { id: d.mid++, team, gen: gi, kind, x, y, z, yaw: team ? Math.PI / 2 : -Math.PI / 2, hp: hpMax, hpMax, es,
      st: 0, t: 0, tgt: 0, tk: 0, cd: .5 + Math.random(), home: { x, y, z }, ph: Math.random() * 6, hist: [] };
    d.mins.push(m);
    this.domEv({ a: 'min+', i: m.id, p: r3a([m.x, m.y, m.z]), k: m.kind, b: m.team });
    return m;
  }
  domMinSpawn(gi, k) {
    const d = this.dom, g = d.gens[gi]; let hx2, hz2;
    if (!d || !g || g.hp <= 0) return null;

    // se plantan en el camino por el que entra el rival (entre el generador y su punto de ataque): son la
    // primera línea. Ese tramo siempre es terreno abierto y transitable, en cualquiera de los tres carriles.
    const lado = k % 3 === 0 ? 0 : k % 3 === 1 ? 1 : -1, f = .62 + (k >> 1) * .12;
    const ax = g.atk.x - g.x, az = g.atk.z - g.z, al = Math.hypot(ax, az) || 1;
    const hx = g.x + ax * f - az / al * lado * 2.3, hz = g.z + az * f + ax / al * lado * 2.3, y0 = g.y + (g.atk.y - g.y) * f;
    // si justo ahí hay una caja o una columna, prueba unos lugares cerca antes de rendirse
    // tiene que quedar parado en el PISO del carril, no arriba de un parapeto o una caja: si no, después
    // no se puede bajar y se queda clavado. Se busca el piso desde poco más arriba del suelo esperado.
    let px = hx, pz = hz, py = y0, ok = false;
    for (const [ox, oz] of [[0, 0], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [2.6, 2.6], [-2.6, -2.6], [-3.5, 0], [-5, 1.5], [-5, -1.5], [-7, 0]]) {
      const qx = hx + ox * Math.sign(g.x || 1), qz = hz + oz, h = raycast(this.W, qx, y0 + .9, qz, 0, -1, 0, 4);
      if (!h) continue;
      const qy = y0 + .9 - h.t;
      if (Math.abs(qy - y0) > .8) continue;
      if (solidAt(this.W, qx, qy + .05, qz, DOM.MIN.R, DOM.MIN.H)) continue;
      px = qx; pz = qz; py = qy; ok = true; break;
    }
    if (!ok) { px = g.atk.x; pz = g.atk.z; py = g.atk.y; }   // último recurso: el punto de ataque, que siempre es piso abierto
    const hy = py; hx2 = px; hz2 = pz;
    const m = this.domMinNuevo(g.team, gi, k % 2, hx2, hy, hz2);   // 0 cuerpo a cuerpo, 1 a distancia
    m.yaw = Math.atan2(-ax / al, -az / al); m.k = k;
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
      const v = [m.id, r1(m.x), r1(m.y), r1(m.z), Math.round(m.yaw * 10), ((Math.round(m.hp / m.hpMax * 100) * 4 + m.st) * 2 + m.team) * 4 + m.kind];
      if (delta) { const a = d.minSent.get(m.id); if (a && a[1] === v[1] && a[2] === v[2] && a[3] === v[3] && a[4] === v[4] && a[5] === v[5]) continue; d.minSent.set(m.id, v); }
      out.push(v[0], v[1], v[2], v[3], v[4], v[5]);
    }
    return out.length ? out : null;
  }
  // envío por jugador: los minions dentro de DOM.MIN.INTERES metros, con delta propio de cada uno
  domMinEnviar() {
    const d = this.dom, R2 = DOM.MIN.INTERES * DOM.MIN.INTERES;
    for (const p of this.players.values()) {
      if (p.bot || !p.send || !p.joined) continue;
      const vist = p.minSent || (p.minSent = new Map()), out = [];
      for (const m of d.mins) {
        if (m.hp <= 0) { vist.delete(m.id); continue; }
        const dx = m.x - p.s.x, dz = m.z - p.s.z;
        if (dx * dx + dz * dz > R2 && vist.has(m.id)) continue;   // lejos y ya lo conoce: no se manda
        const v = [m.id, r1(m.x), r1(m.y), r1(m.z), Math.round(m.yaw * 10), ((Math.round(m.hp / m.hpMax * 100) * 4 + m.st) * 2 + m.team) * 4 + m.kind];
        const a = vist.get(m.id);
        if (a && a[1] === v[1] && a[2] === v[2] && a[3] === v[3] && a[4] === v[4] && a[5] === v[5]) continue;
        vist.set(m.id, v); out.push(...v);
      }
      if (out.length) p.send({ t: 'mn', l: out });
    }
  }
  tickMins(dt) {
    const d = this.dom, K2 = DOM.MIN; if (!d || !d.mins || this.state !== 'play') return;
    d.minT -= dt; d.olaT -= dt;
    if (d.olaT <= 0) { d.olaT = K2.OLA_CADA; this.domOla(); }
    const reponer = d.minT <= 0; if (reponer) d.minT = 2;
    for (let i = d.mins.length - 1; i >= 0; i--) {
      const m = d.mins[i];
      if (m.hp <= 0) { if (m.ola || this.time - m.t > 1.5) { d.mins.splice(i, 1); d.minSent.delete(m.id); } continue; }
      if (!m.ola && d.gens[m.gen].hp <= 0) { this.domMinDown(m, null, true); continue; }   // sin generador no hay guardianes
      if (m.ola) this.tickOla(m, dt); else this.tickMin(m, dt);
      if (this.state !== 'play') return;
      const h = m.hist; h.push([this.time, m.x, m.y, m.z]); if (h.length > 28) h.shift();
    }
    if (reponer) for (let gi = 0; gi < d.gens.length; gi++) {
      if (d.gens[gi].hp <= 0) continue;
      // cada guardián caído vuelve a aparecer en su lugar pasados RESP segundos
      d.guardT = d.guardT || {};
      for (let k = 0; k < K2.POR_GEN; k++) {
        if (d.mins.some(m => !m.ola && m.gen === gi && m.k === k && m.hp > 0)) { d.guardT[gi * 10 + k] = 0; continue; }
        const key = gi * 10 + k; if (!d.guardT[key]) d.guardT[key] = this.time;
        if (this.time - d.guardT[key] > K2.RESP) { d.guardT[key] = 0; this.domMinSpawn(gi, k); }
      }
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
    const t = m.tgt > 0 ? this.players.get(m.tgt) : null;
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
          if (m.kind) this.domMinShoot(m, t); else { this.damage(t, K2.DMG_C * m.es, null, null, [dx / dl, .3, dz / dl], .04, 'minion'); this.domEv({ a: 'minhit', i: m.id }); }
          if (this.state !== 'play') return;
        }
      }
    } else {
      // patrulla: camina tranquilo entre puntos al azar cerca de su puesto, con pausas cortas
      m.patT = (m.patT || 0) - dt;
      if (!m.pat || m.patT <= 0) { const a = Math.random() * 6.283, r = 1 + Math.random() * K2.PATRULLA; m.pat = { x: m.home.x + Math.cos(a) * r, z: m.home.z + Math.sin(a) * r }; m.patT = 3 + Math.random() * 3; }
      const dx = m.pat.x - m.x, dz = m.pat.z - m.z, dl = Math.hypot(dx, dz);
      if (dl > .4) { m.st = 3; wx = dx / dl * .55; wz = dz / dl * .55; m.yaw = Math.atan2(-dx, -dz); }
      else m.st = 0;
    }
    // si choca con una caja o un parapeto, se corre de costado un momento y la rodea
    if (m.rodeoT > 0) { m.rodeoT -= dt; const px = -wz || 1, pz = wx; wx = (wx + px * m.rodeo * 1.6) * .6; wz = (wz + pz * m.rodeo * 1.6) * .6; }
    if (!this.domMinMove(m, wx, wz, dt) && (wx || wz) && m.rodeoT <= 0) { m.rodeo = Math.random() < .5 ? -1 : 1; m.rodeoT = .7; if (m.st === 3) m.patT = 0; }
    if (Math.hypot(m.x - m.home.x, m.z - m.home.z) > DOM.MIN.LEASH * 1.4) { m.x = m.home.x; m.y = m.home.y; m.z = m.home.z; m.st = 0; m.tgt = 0; m.hist.length = 0; }   // red de seguridad
  }
  /* Oleada: avanza por su ruta y se frena a pelear. Prioridad (como en el LoL): 1) minions rivales,
     2) jugadores rivales que dañaron a un aliado hace poco, 3) jugadores rivales, 4) generadores del carril
     (y el boss, si la barrera ya cayó). Si no hay nada al alcance, sigue marchando. */
  tickOla(m, dt) {
    const K2 = DOM.MIN, d = this.dom; m.cd -= dt; m.t2 = (m.t2 || 0) - dt;
    const alc = m.kind === 2 ? K2.RANGE_AS : m.kind ? K2.RANGE_D * .6 : K2.RANGE_C;
    if (m.t2 <= 0) {
      m.t2 = .3; m.tgt = 0; m.tk = 0; let md = K2.SEE_OLA, pri = 9;
      const ve = (x, y, z) => los(this.W, m.x, m.y + 1.1, m.z, x, y, z);
      const prev = setPasa(m.team);
      try {
        for (const o of d.mins) { if (o.hp <= 0 || o.team === m.team) continue; const dd = Math.hypot(o.x - m.x, o.z - m.z); if (dd < md && Math.abs(o.y - m.y) < 4 && ve(o.x, o.y + 1, o.z)) { md = dd; m.tgt = o.id; m.tk = 1; pri = 1; } }
        if (pri > 1) for (const p of this.players.values()) {
          if (!p.alive || !p.joined || p.team === m.team || p.team < 0) continue;
          const dd = Math.hypot(p.s.x - m.x, p.s.z - m.z), pr = this.time - (p.aggT || -99) < K2.AGGRO ? 2 : 3;
          if (dd > K2.SEE_OLA || Math.abs(p.s.y - m.y) > 5 || pr > pri || (pr === pri && dd >= md)) continue;
          if (!ve(p.s.x, p.s.y + 1.2, p.s.z)) continue;
          md = dd; pri = pr; m.tgt = p.id; m.tk = 2;
        }
        if (!m.tgt) {   // estructuras: generadores vivos de su carril, o el boss si la barrera ya cayó
          d.gens.forEach((g, gi) => { if (g.hp <= 0 || g.team === m.team || g.lane !== m.lane) return; const dd = Math.hypot(g.x - m.x, g.z - m.z); if (dd < Math.max(md, alc + 3)) { md = dd; m.tgt = gi + 1; m.tk = 3; } });
          const b = d.boss[1 - m.team];
          if (!m.tgt && b && b.hp > 0) { const dd = Math.hypot(b.x - m.x, b.z - m.z); if (dd < alc + 7) { m.tgt = 1; m.tk = 4; } }
        }
      } finally { setPasa(prev); }
    }
    // dónde está el objetivo
    let tx = 0, ty = 0, tz = 0, vivo = false, rad = 0;
    if (m.tk === 1) { const o = d.mins.find(q => q.id === m.tgt); if (o && o.hp > 0) { tx = o.x; ty = o.y + 1; tz = o.z; vivo = true; } }
    else if (m.tk === 2) { const p = this.players.get(m.tgt); if (p && p.alive) { tx = p.s.x; ty = p.s.y + 1; tz = p.s.z; vivo = true; } }
    else if (m.tk === 3) { const g = d.gens[m.tgt - 1]; if (g && g.hp > 0) { tx = g.x; ty = g.y + 1.5; tz = g.z; vivo = true; rad = 1.6; } }
    else if (m.tk === 4) { const b = d.boss[1 - m.team]; if (b && b.hp > 0) { tx = b.x; ty = 3; tz = b.z; vivo = true; rad = 4; } }
    let wx = 0, wz = 0, sp = 1;
    if (vivo) {
      const dx = tx - m.x, dz = tz - m.z, dl = Math.hypot(dx, dz) || 1e-6;
      m.yaw = Math.atan2(-dx, -dz);
      if (dl - rad > alc * .9) { m.st = 1; wx = dx / dl; wz = dz / dl; }
      else {
        m.st = 2;
        if (m.cd <= 0) {
          m.cd = m.kind === 2 ? K2.RATE_AS : m.kind ? K2.RATE_D : K2.RATE_C;
          const dmg = (m.kind === 2 ? K2.DMG_AS : m.kind ? K2.DMG_D : K2.DMG_C) * m.es;
          this.domEv(m.kind ? { a: 'minfire', i: m.id, p: r3a([tx, ty, tz]) } : { a: 'minhit', i: m.id });
          if (m.tk === 1) { const o = d.mins.find(q => q.id === m.tgt); if (o) this.domMinDamage(o, dmg, null); }
          else if (m.tk === 2) { const p = this.players.get(m.tgt); if (p) this.damage(p, dmg, null, null, [dx / dl, .2, dz / dl], .03, 'minion'); }
          else {
            const gd = (m.kind === 2 ? K2.GEN_AS : m.kind ? K2.GEN_D : K2.GEN_C) * m.es * (m.tk === 4 ? K2.BOSS_F : 1);
            const fake = { team: m.team, id: 0, name: 'Minions', caps: 0, cr: 0, dmg: 0, send: null };
            this.domHit(fake, m.tk === 3 ? 'g' : 'b', m.tk === 3 ? m.tgt - 1 : 1 - m.team, gd, false);
          }
          if (this.state !== 'play') return;
        }
      }
    } else {
      // sigue la ruta; al llegar al final y no tener nada, si la barrera del carril cayó, sigue hacia el boss
      const r = m.ruta; let w = r[Math.min(m.wp, r.length - 1)];
      if (Math.hypot(w.x - m.x, w.z - m.z) < 1.6) {
        if (m.wp < r.length - 1) m.wp++;
        else { const bar = d.bars.find(b => b.team !== m.team && b.lane === m.lane); if (bar && bar.st === 2 && !m.alBoss) { m.alBoss = 1; m.ruta = this.domRuta(m.team, m.lane, true); m.wp = 1; } }
        w = m.ruta[Math.min(m.wp, m.ruta.length - 1)];
      }
      const dx = w.x - m.x, dz = w.z - m.z, dl = Math.hypot(dx, dz);
      if (dl > .3) { m.st = 3; wx = dx / dl; wz = dz / dl; m.yaw = Math.atan2(-dx, -dz); sp = K2.SPD_OLA / K2.SPD; } else m.st = 0;
    }
    // separación simple de los compañeros: nadie se amontona
    for (const o of d.mins) { if (o === m || o.hp <= 0 || o.team !== m.team) continue; const ex = m.x - o.x, ez = m.z - o.z, e2 = ex * ex + ez * ez; if (e2 < K2.SEP * K2.SEP && e2 > 1e-6) { const e = Math.sqrt(e2), f = (K2.SEP - e) / K2.SEP * .8; wx += ex / e * f; wz += ez / e * f; } }
    if (m.rodeoT > 0) { m.rodeoT -= dt; const px = -wz || 1, pz = wx; wx = (wx + px * m.rodeo * 1.6) * .6; wz = (wz + pz * m.rodeo * 1.6) * .6; }
    const x0 = m.x, z0 = m.z;
    if (!this.domMinMove(m, wx * sp, wz * sp, dt) && (wx || wz) && m.rodeoT <= 0) { m.rodeo = Math.random() < .5 ? -1 : 1; m.rodeoT = .7; }
    // trabado: si en 2 s casi no se movió queriendo caminar, salta al punto siguiente; si sigue, se reubica en él
    if (m.st === 3 && Math.hypot(m.x - x0, m.z - z0) < .02) m.trab = (m.trab || 0) + dt; else m.trab = 0;
    if (m.trab > 2) { m.trab = 0; m.atasco = (m.atasco || 0) + 1; if (m.wp < m.ruta.length - 1) m.wp++; if (m.atasco > 2) { const w = m.ruta[Math.min(m.wp, m.ruta.length - 1)]; m.x = w.x; m.y = w.y; m.z = w.z; m.hist.length = 0; m.atasco = 0; } }
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
    this.damage(t, K2.DMG_D * (m.es || 1), null, null, [dx / dl, .2, dz / dl], .03, 'minion');
  }
  // un jugador dice que le pegó a un minion (id = -1000 - idMinion)
  domMinClaim(p, o, d, id, n, W_) {
    const dm = this.dom; if (!dm || !dm.mins) return;
    const m = dm.mins.find(q => q.id === -1000 - id);
    if (!m || m.hp <= 0 || m.team === p.team) return;
    const falso = { s: { x: m.x, y: m.y, z: m.z, vx: 0, vz: 0 }, hist: m.hist.map(h => [h[0], h[1], h[2], h[3]]) };
    if (!this.validHit(o, d, falso, W_, p)) return;
    const dist = Math.hypot(m.x - o[0], m.y + 1 - o[1], m.z - o[2]);
    const base = W_.carga ? this.cargaDmg(W_, p.carga || 0) : W_.dmg;
    const dmg = W_.melee ? base : W_.type === 'rail' ? base : n * base * falloff(W_, dist);
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
    if (att && att.id > 0) { this.credit(att, DOM.MIN.CRED + DOM.MIN.LAST_HIT, 'último golpe a un minion'); att.mins = (att.mins || 0) + 1; }
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

