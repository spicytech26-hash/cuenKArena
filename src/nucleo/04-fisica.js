/* =====================================================================
   COLISIÓN Y MOVIMIENTO
   ===================================================================== */
function topAt(b, x0, z0, x1, z1) {
  const r = b.ramp; if (!r) return b.max[1];
  let t;
  if (r.axis === 'x') { const L = b.max[0] - b.min[0]; t = r.dir > 0 ? (Math.min(x1, b.max[0]) - b.min[0]) / L : (b.max[0] - Math.max(x0, b.min[0])) / L; }
  else { const L = b.max[2] - b.min[2]; t = r.dir > 0 ? (Math.min(z1, b.max[2]) - b.min[2]) / L : (b.max[2] - Math.max(z0, b.min[2])) / L; }
  return r.lo + (r.hi - r.lo) * clamp(t, 0, 1);
}
const overlapXZ = (b, x0, z0, x1, z1) => b.min[0] < x1 && b.max[0] > x0 && b.min[2] < z1 && b.max[2] > z0;

function solidAt(W, x, y, z, r, h) {
  const x0 = x - r, x1 = x + r, z0 = z - r, z1 = z + r;
  for (const b of W.brushes) {
    if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
    if (b.min[1] >= y + h - EPS) continue;
    if (topAt(b, x0, z0, x1, z1) <= y + EPS) continue;
    return true;
  }
  return false;
}
function stepAxis(W, s, ax, d) {
  if (!d) return true;
  const nx = ax === 0 ? s.x + d : s.x, nz = ax === 2 ? s.z + d : s.z, r = K.R, H = hOf(s);
  const x0 = nx - r, x1 = nx + r, z0 = nz - r, z1 = nz + r;
  let rise = 0;
  for (const b of W.brushes) {
    if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
    if (b.min[1] >= s.y + H - EPS) continue;
    const top = topAt(b, x0, z0, x1, z1);
    if (top <= s.y + EPS) continue;
    const need = top - s.y;
    if (need <= K.STEP) { if (need > rise) rise = need; }
    else { if (ax === 0) s.vx = 0; else s.vz = 0; return false; }
  }
  if (rise > 0) {
    if (solidAt(W, nx, s.y + rise, nz, r, H)) { if (ax === 0) s.vx = 0; else s.vz = 0; return false; }
    s.y += rise; if (s.vy <= 0) { s.vy = 0; s.on = true; }
  }
  s.x = nx; s.z = nz; return true;
}
function stepY(W, s, h, wasOn) {
  const r = K.R, H = hOf(s), x0 = s.x - r, x1 = s.x + r, z0 = s.z - r, z1 = s.z + r;
  const ny = s.y + s.vy * h;
  if (s.vy <= 0) {
    let ground = -Infinity, gb = null;
    for (const b of W.brushes) {
      if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
      const top = topAt(b, x0, z0, x1, z1);
      if (top <= s.y + .02 && top > ground) { ground = top; gb = b; }
    }
    let land = false;
    if (ny <= ground) land = true;
    else if (wasOn && s.y - ground <= K.STEP + .05 && s.vy > -6) land = true;
    if (land) {
      s.y = ground; s.vy = 0; s.on = true;
      if (gb && gb.mover) { if (s.gb !== gb.id) { s.gb = gb.id; s.gbo = gb.off; } } else s.gb = null;
    } else { s.y = ny; s.on = false; s.gb = null; }
  } else {
    let ceil = Infinity;
    for (const b of W.brushes) {
      if (b.nc || !overlapXZ(b, x0, z0, x1, z1)) continue;
      if (b.min[1] >= s.y + H - .02 && b.min[1] < ceil) ceil = b.min[1];
    }
    if (ny + H > ceil) { s.y = ceil - H; s.vy = 0; } else s.y = ny;
    s.on = false;
  }
}
function friction(s, h) {
  const sp = Math.hypot(s.vx, s.vz);
  if (sp < 1e-4) { s.vx = s.vz = 0; return; }
  const ctrl = sp < K.STOP ? K.STOP : sp;
  const ns = Math.max(0, sp - ctrl * K.FRIC * h) / sp;
  s.vx *= ns; s.vz *= ns;
}
function accelerate(s, wx, wz, wishspeed, acc, h, air) {
  if (wishspeed <= 0) return;
  const ws = air ? Math.min(wishspeed, K.AIRCAP) : wishspeed;
  const add = ws - (s.vx * wx + s.vz * wz);
  if (add <= 0) return;
  let as = acc * wishspeed * h; if (as > add) as = add;
  s.vx += as * wx; s.vz += as * wz;
}
/* Movimiento estilo Quake: aceleración en el aire que permite strafe-jump y bunny hop.
   cmd = {wx, wz, jump}: dirección deseada en el mundo (largo ≤ 1). */
function carry(W, s) {
  // te lleva la plataforma sobre la que estás parado
  if (s.gb != null) {
    const b = W.brushes[s.gb];
    if (b && b.mover && s.on) {
      const d = b.off - (s.gbo == null ? b.off : s.gbo);
      if (d) { if (b.mover.axis === 0) s.x += d; else if (b.mover.axis === 1) s.y += d; else s.z += d; }
      s.gbo = b.off;
    } else s.gb = null;
  }
  // si una plataforma te atraviesa, quedás parado arriba
  for (const b of W.movers) {
    if (!overlapXZ(b, s.x - K.R, s.z - K.R, s.x + K.R, s.z + K.R)) continue;
    if (b.max[1] > s.y + EPS && b.min[1] < s.y + K.H && b.max[1] - s.y < 1.2) { s.y = b.max[1]; if (s.vy < 0) s.vy = 0; s.on = true; s.gb = b.id; s.gbo = b.off; }
  }
}
function crouchUpdate(W, s, want) {
  const dh = K.H - K.HC;
  if (want && !s.crouch) { s.crouch = true; if (!s.on) s.y += dh * .35; }           // en el aire encoge las piernas
  else if (!want && s.crouch) {
    if (!s.on && !solidAt(W, s.x, s.y - dh * .35, s.z, K.R, K.H) && s.y - dh * .35 > -100) { s.crouch = false; s.y -= dh * .35; }
    else if (!solidAt(W, s.x, s.y + .01, s.z, K.R, K.H)) s.crouch = false;           // no se para si no hay lugar arriba
  }
}
function pmove(W, s, cmd, dt) {
  if (W.movers.length) carry(W, s);
  crouchUpdate(W, s, !!cmd.crouch);
  const steps = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-6)), h = dt / steps;
  let wx = cmd.wx || 0, wz = cmd.wz || 0;
  const wl = Math.hypot(wx, wz); let wish = 0;
  if (wl > 1e-4) { wish = K.MAXSPD * Math.min(1, wl); wx /= wl; wz /= wl; }
  if (s.crouch && s.on) wish *= K.CROUCH_SPD;
  if (cmd.fast > 1) wish *= Math.min(1.5, cmd.fast);
  const out = { jumped: false, landed: 0 };
  for (let i = 0; i < steps; i++) {
    const wasOn = s.on;
    let jumpedNow = false;
    if (s.on) {
      if (cmd.jump) { s.vy = K.JUMP; s.on = false; jumpedNow = out.jumped = true; }
      else friction(s, h);
      accelerate(s, wx, wz, wish, K.ACC, h, false);
    } else accelerate(s, wx, wz, wish, K.AIRACC, h, true);
    s.vy -= K.GRAV * h;
    const preVy = s.vy;
    stepAxis(W, s, 0, s.vx * h);
    stepAxis(W, s, 2, s.vz * h);
    stepY(W, s, h, wasOn && !jumpedNow);
    if (!wasOn && s.on && preVy < out.landed) out.landed = preVy;
  }
  return out;
}
// géiser: cuánto falta para la erupción (0..1 del ciclo) y si está soplando ahora
function geyserPhase(p, t) { const g = p.geyser, c = ((t + g.phase) % g.period + g.period) % g.period; return c; }
function geyserOn(p, t) { return geyserPhase(p, t) < p.geyser.on; }
function padReady(s, pad, landed) {
  if (!pad) { s.padArm = true; return false; }
  if (!pad.soft) return true;
  if (!s.on) return false;            // el del ascensor solo funciona parado encima
  if (landed) s.padArm = false;
  return s.padArm !== false;
}
function triggers(W, s) {
  const out = { pad: null, tele: null, lava: 0 };
  for (const p of W.pads) if (Math.abs(s.y - p.y) < .35 && Math.hypot(s.x - p.x, s.z - p.z) < p.r && (!p.geyser || geyserOn(p, W.t || 0))) out.pad = p;
  for (const t of W.teles) if (Math.abs(s.y - t.y) < .6 && Math.hypot(s.x - t.x, s.z - t.z) < t.r) out.tele = t;
  for (const l of W.lava) if (s.x > l.min[0] && s.x < l.max[0] && s.z > l.min[2] && s.z < l.max[2] && s.y < l.max[1] && s.y > l.min[1] - 1) { out.lava = l.dps; if (l.water) out.water = 1; }
  return out;
}
function padVel(px, py, pz, tx, ty, tz, apex) {
  const g = K.GRAV, top = Math.max(py, ty) + apex;
  const vy = Math.sqrt(2 * g * (top - py)), T = vy / g + Math.sqrt(2 * (top - ty) / g);
  return [(tx - px) / T, vy, (tz - pz) / T];
}
function launchPad(s, p) { const v = padVel(s.x, s.y, s.z, p.t[0], p.t[1], p.t[2], p.apex); s.vx = v[0]; s.vy = v[1]; s.vz = v[2]; s.on = false; }

/* ---------- Raycast contra el mundo ---------- */
function rayBrush(b, ox, oy, oz, dx, dy, dz) {
  let t0 = -Infinity, t1 = Infinity, ax = -1, sg = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < b.min[a] || o[a] > b.max[a]) return null; continue; }
    let ta = (b.min[a] - o[a]) / d[a], tb = (b.max[a] - o[a]) / d[a], s = -1;
    if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; }
    if (ta > t0) { t0 = ta; ax = a; sg = s; }
    if (tb < t1) t1 = tb;
  }
  if (t0 > t1 || t1 < 0 || t0 < 0) return null;
  const n = [0, 0, 0]; n[ax] = sg;
  if (b.ramp) {
    const r = b.ramp, L = r.axis === 'x' ? b.max[0] - b.min[0] : b.max[2] - b.min[2];
    const k = (r.hi - r.lo) / L, sgn = r.dir > 0 ? 1 : -1, ai = r.axis === 'x' ? 0 : 2, u0 = r.dir > 0 ? b.min[ai] : b.max[ai];
    const hx = ox + dx * t0, hy = oy + dy * t0, hz = oz + dz * t0;
    const top = r.lo + k * sgn * ((ai === 0 ? hx : hz) - u0);
    if (hy > top + 1e-4) {
      const den = dy - k * sgn * d[ai];
      if (Math.abs(den) < 1e-9) return null;
      const tp = (r.lo + k * sgn * (o[ai] - u0) - oy) / den;
      if (tp < t0 - 1e-6 || tp > t1 + 1e-6) return null;
      const nn = [0, 1, 0]; nn[ai] = -k * sgn; const l = Math.hypot(nn[0], nn[1], nn[2]);
      return { t: Math.max(0, tp), n: [nn[0] / l, nn[1] / l, nn[2] / l] };
    }
  }
  return { t: t0, n };
}
// prueba rápida de la caja (sin crear objetos): devuelve dónde entra el rayo o -1. Así se descartan casi todos los bloques
// sin generar basura, y solo se hace la cuenta completa (rampas, normal) con los que de verdad pueden pegar
function slab(b, ox, oy, oz, ix, iy, iz, maxT) {
  let t0 = 0, t1 = maxT + 1e-6, ta, tb, q;
  if (ix === Infinity || ix === -Infinity) { if (ox < b.min[0] || ox > b.max[0]) return -1; }
  else { ta = (b.min[0] - ox) * ix; tb = (b.max[0] - ox) * ix; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  if (iy === Infinity || iy === -Infinity) { if (oy < b.min[1] || oy > b.max[1]) return -1; }
  else { ta = (b.min[1] - oy) * iy; tb = (b.max[1] - oy) * iy; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  if (iz === Infinity || iz === -Infinity) { if (oz < b.min[2] || oz > b.max[2]) return -1; }
  else { ta = (b.min[2] - oz) * iz; tb = (b.max[2] - oz) * iz; if (ta > tb) { q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1 + 1e-6) return -1; }
  return t0;
}
const inv = v => Math.abs(v) < 1e-9 ? Infinity : 1 / v;
function raycast(W, ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, n = null;
  const ix = inv(dx), iy = inv(dy), iz = inv(dz);
  for (const b of W.brushes) {
    if (b.nc || slab(b, ox, oy, oz, ix, iy, iz, best) < 0) continue;
    const h = rayBrush(b, ox, oy, oz, dx, dy, dz);
    if (h && h.t < best) { best = h.t; n = h.n; }
  }
  return n ? { t: best, n } : null;
}
// línea de visión: alcanza con que algo la corte (no hace falta buscar el más cercano)
function los(W, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1e-6, L = d - .05;
  const ux = dx / d, uy = dy / d, uz = dz / d, ix = inv(ux), iy = inv(uy), iz = inv(uz);
  for (const b of W.brushes) {
    if (b.nc || slab(b, ax, ay, az, ix, iy, iz, L) < 0) continue;
    const h = rayBrush(b, ax, ay, az, ux, uy, uz);
    if (h && h.t < L) return false;
  }
  return true;
}

/* ---------- Jugadores como objetivos ---------- */
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = ox - cx, ly = oy - cy, lz = oz - cz, b = lx * dx + ly * dy + lz * dz, c = lx * lx + ly * ly + lz * lz - r * r, disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc); let t = -b - s; if (t < 0) t = -b + s; return t < 0 ? -1 : t;
}
const SPH = [[.5, .42, 0], [1.1, .48, 0], [1.6, .26, 1]];
function rayPlayer(x, y, z, ox, oy, oz, dx, dy, dz, crouch) {
  let best = null; const k = crouch ? .62 : 1;
  for (const s of SPH) {
    const t = raySphere(ox, oy, oz, dx, dy, dz, x, y + s[0] * k, z, s[1]);
    if (t >= 0 && (!best || t < best.t)) best = { t, head: !!s[2] };
  }
  return best;
}
function boxDist(x, y, z, px, py, pz) {
  const dx = Math.max(px - K.R - x, 0, x - (px + K.R)), dy = Math.max(py - y, 0, y - (py + K.H)), dz = Math.max(pz - K.R - z, 0, z - (pz + K.R));
  return Math.hypot(dx, dy, dz);
}
function dirFromAngles(yaw, pitch) { const c = Math.cos(pitch); return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]; }

/* ---------- Proyectiles ---------- */
function projLaunch(w, d) {
  const W_ = WEAPONS[w];
  if (W_.proj === 'grenade') return [d[0] * W_.speed, d[1] * W_.speed + 3, d[2] * W_.speed];
  return [d[0] * W_.speed, d[1] * W_.speed, d[2] * W_.speed];
}
function projStep(W, p, dt) {
  p.life -= dt;
  if (p.k === 'grenade' || p.k === 'molotov') p.v[1] -= 18 * dt;
  else if (p.k === 'bullet') p.v[1] -= 9 * dt;
  const dx = p.v[0] * dt, dy = p.v[1] * dt, dz = p.v[2] * dt, L = Math.hypot(dx, dy, dz);
  if (L > 1e-6) {
    const h = raycast(W, p.x, p.y, p.z, dx / L, dy / L, dz / L, L);
    if (h) {
      const t = Math.max(0, h.t - .06);
      p.x += dx / L * t; p.y += dy / L * t; p.z += dz / L * t;
      if (p.k === 'rocket' || p.k === 'bullet' || p.k === 'molotov') return { boom: true, n: h.n };
      const n = h.n, dot = p.v[0] * n[0] + p.v[1] * n[1] + p.v[2] * n[2];
      p.v[0] -= 2 * dot * n[0]; p.v[1] -= 2 * dot * n[1]; p.v[2] -= 2 * dot * n[2];
      const damp = n[1] > .7 ? .45 : .6;
      p.v[0] *= damp; p.v[1] *= damp; p.v[2] *= damp;
      if (n[1] > .7 && Math.hypot(p.v[0], p.v[1], p.v[2]) < 1.2) { p.v[0] = p.v[1] = p.v[2] = 0; }
      p.bounced = true;
    } else { p.x += dx; p.y += dy; p.z += dz; }
  }
  return p.life <= 0 ? { boom: true, n: null } : null;
}

