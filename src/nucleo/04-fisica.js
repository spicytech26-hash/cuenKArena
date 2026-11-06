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
/* Zonas de gravedad cero (W.zerog = [{ min: [x, y, z], max: [x, y, z] }], hoy el pozo de Pyramid): adentro no hay gravedad, te vas
   cayendo despacio hacia abajo y te movés libre: salto/Espacio sube, agacharse baja, y W mirando arriba o abajo te lleva para ahí.
   Parado en el piso solo se activa si apretás para subir. */
const ZG = { DRIFT: -4.5, VSPEED: 9.5, HSPEED: .7 };
/* Movimiento avanzado (solo lo usa el cliente humano con cmd.mech; los bots siguen con el movimiento de siempre).
   Stamina 0..1: deslizar gasta un poco, el doble salto gasta la mitad; el salto de pared es gratis. */
const MV = {
  SL_MIN: 5, SL_BOOST: 5.5, SL_MAX: 19, SL_END: 3, SL_FRIC: .65, SL_STEER: .7,    // deslizamiento (estilo Deadlock): velocidad mínima para arrancar, empujón, tope, velocidad a la que se corta, fricción, control
  SL_START: 0, SL_DRAIN: 0,                                                      // el deslizamiento no gasta stamina
  DJ_COST: .25, DJ_JUMP: 1.3,                                                    // doble salto: un cuarto de la barra, altura fija (siempre la misma)
  WJ_UP: 1.1, WJ_OUT: 7, WJ_CD: .25, WJ_REACH: .14,                              // salto de pared: impulso arriba y hacia afuera, espera entre saltos, distancia a la pared
  WJ_COST: .12, WJ_FAT: 1.25, WJ_LOSS: .18, WJ_MINUP: .6,                        // el primero es gratis; los siguientes dentro de 1,25 s gastan stamina y suben menos (fatiga)
  REGEN: .22, REGEN_DELAY: .7, COYOTE: .09
};
// ¿hay una pared pegada al cuerpo? devuelve la normal (hacia afuera de la pared) o null
function wallNormal(W, s) {
  let nx = 0, nz = 0; const y = s.y + K.STEP + .1, h = (s.crouch ? K.HC : K.H) - K.STEP - .3, d = MV.WJ_REACH;
  if (solidAt(W, s.x + d, y, s.z, K.R, h)) nx -= 1;
  if (solidAt(W, s.x - d, y, s.z, K.R, h)) nx += 1;
  if (solidAt(W, s.x, y, s.z + d, K.R, h)) nz -= 1;
  if (solidAt(W, s.x, y, s.z - d, K.R, h)) nz += 1;
  const l = Math.hypot(nx, nz); return l > 0 ? { x: nx / l, z: nz / l } : null;
}
function inZeroG(W, s) {
  if (!W.zerog) return false;
  const y = s.y + .9;
  for (const z of W.zerog) if (s.x > z.min[0] && s.x < z.max[0] && s.z > z.min[2] && s.z < z.max[2] && y > z.min[1] && y < z.max[1]) return true;
  return false;
}
function pmove(W, s, cmd, dt) {
  if (W.movers.length) carry(W, s);
  crouchUpdate(W, s, !!cmd.crouch);
  const steps = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-6)), h = dt / steps;
  let wx = cmd.wx || 0, wz = cmd.wz || 0;
  const wl = Math.hypot(wx, wz); let wish = 0;
  if (wl > 1e-4) { wish = K.MAXSPD * Math.min(1, wl); wx /= wl; wz /= wl; }
  if (s.crouch && s.on && !(cmd.mech && s.slide)) wish *= K.CROUCH_SPD;
  if (cmd.fast > 1) wish *= Math.min(1.5, cmd.fast);
  const out = { jumped: false, landed: 0, zerog: false, slide: false, dj: false, wj: false };
  const up = cmd.up !== undefined ? cmd.up : cmd.jump;
  let mech = false;
  if (cmd.mech) {
    mech = true;
    if (s.stam === undefined) { s.stam = 1; s.stT = 0; s.dj = false; s.slide = false; s.wjT = 0; s.offT = 0; s.didJump = false; s.upPrev = false; s.crPrev = false; s.wjN = 0; s.wjF = 0; }
    const press = !!cmd.up && !s.upPrev, crPress = !!cmd.crouch && !s.crPrev;
    s.upPrev = !!cmd.up; s.crPrev = !!cmd.crouch;
    s.wjT = Math.max(0, s.wjT - dt); s.wjF = Math.max(0, (s.wjF || 0) - dt); if (s.wjF <= 0) s.wjN = 0; s.stT = Math.max(0, s.stT - dt);
    if (s.on) { s.dj = false; s.didJump = false; s.offT = 0; } else s.offT += dt;
    const zg = W.zerog && inZeroG(W, s);
    // deslizamiento: Ctrl en el piso yendo rápido (solo arranca al apretar, no al llegar corriendo con Ctrl ya apretado)
    if (!cmd.crouch || !s.on || zg) s.slide = false;
    else if (crPress && !s.slide && Math.hypot(s.vx, s.vz) >= MV.SL_MIN) {
      s.slide = true; s.stam = Math.max(0, s.stam - MV.SL_START); s.stT = MV.REGEN_DELAY;
      const sp = Math.hypot(s.vx, s.vz), k = Math.min(MV.SL_MAX, sp + MV.SL_BOOST) / sp; s.vx *= k; s.vz *= k;
    }
    // acciones en el aire con un salto recién apretado
    if (press && !s.on && !zg) {
      const hsp = Math.hypot(s.vx, s.vz);
      const wn = s.wjT <= 0 ? wallNormal(W, s) : null;
      if (wn) {   // salto de pared: gratis; te empuja hacia afuera y conserva lo que llevabas a lo largo de la pared
        const along = s.vx * -wn.z + s.vz * wn.x;
        s.vx = wn.x * MV.WJ_OUT + -wn.z * along; s.vz = wn.z * MV.WJ_OUT + wn.x * along;
        const n = s.wjN || 0, fat = Math.max(MV.WJ_MINUP, 1 - MV.WJ_LOSS * n);   // fatiga: cada salto seguido sube menos
        if (n > 0) { s.stam = Math.max(0, s.stam - MV.WJ_COST); s.stT = MV.REGEN_DELAY; }   // sin stamina igual salta (sirve para escapar), pero con fatiga
        s.vy = K.JUMP * MV.WJ_UP * fat; s.wjN = n + 1; s.wjF = MV.WJ_FAT; s.wjT = MV.WJ_CD; s.didJump = true; out.wj = n + 1;
      } else if (!s.didJump && s.offT < MV.COYOTE) {   // recién te caíste del borde: cuenta como salto normal
        s.vy = K.JUMP; s.didJump = true; out.jumped = true;
      } else if (!s.dj && s.stam >= MV.DJ_COST - 1e-6) {   // doble salto: uno solo por vuelo (hasta tocar el piso), cuesta un cuarto de la barra
        s.dj = true; s.stam -= MV.DJ_COST; s.stT = MV.REGEN_DELAY; s.vy = K.JUMP * MV.DJ_JUMP; out.dj = true;
        if (wl > 1e-4) { const sp = Math.max(hsp, 5); s.vx = wx * sp; s.vz = wz * sp; }   // el doble salto reencauza hacia donde apuntás
      }
    }
    // stamina: el deslizamiento gasta de a poco; se recupera pasado un ratito sin gastar
    if (s.slide) { s.stam = Math.max(0, s.stam - MV.SL_DRAIN * dt); s.stT = MV.REGEN_DELAY; if (s.stam <= 0) s.slide = false; }
    else if (s.stT <= 0) s.stam = Math.min(1, s.stam + MV.REGEN * dt);
  }
  for (let i = 0; i < steps; i++) {
    const wasOn = s.on;
    if (W.zerog && inZeroG(W, s) && (!s.on || up)) {
      const upIn = clamp((up ? 1 : 0) - (cmd.crouch ? 1 : 0) + (cmd.wy || 0), -1, 1);
      s.vy += ((upIn ? upIn * ZG.VSPEED : ZG.DRIFT) - s.vy) * Math.min(1, 5 * h);
      const kh = Math.min(1, 3 * h);
      s.vx += (wx * wish * ZG.HSPEED - s.vx) * kh; s.vz += (wz * wish * ZG.HSPEED - s.vz) * kh;
      s.on = false;
      stepAxis(W, s, 0, s.vx * h);
      stepAxis(W, s, 2, s.vz * h);
      stepY(W, s, h, false);
      out.zerog = true;
      continue;
    }
    let jumpedNow = false;
    if (s.on) {
      if (cmd.jump) { s.vy = K.JUMP; s.on = false; jumpedNow = out.jumped = true; if (mech) { s.didJump = true; s.slide = false; } }
      else if (mech && s.slide) {   // deslizando: casi sin fricción, y se corta cuando perdés la velocidad
        const sp = Math.hypot(s.vx, s.vz), ctrl = Math.max(sp, K.STOP), ns = Math.max(0, sp - ctrl * MV.SL_FRIC * h) / (sp || 1);
        s.vx *= ns; s.vz *= ns; out.slide = true;
        if (Math.hypot(s.vx, s.vz) < MV.SL_END) s.slide = false;
      } else friction(s, h);
      if (mech && s.slide) {   // deslizando solo se puede doblar de costado: no se acelera hacia adelante, así el slide se va apagando
        const sp = Math.hypot(s.vx, s.vz) || 1, ux = s.vx / sp, uz = s.vz / sp, al = wx * ux + wz * uz, sx = wx - al * ux, sz = wz - al * uz;
        s.vx += sx * wish * MV.SL_STEER * h; s.vz += sz * wish * MV.SL_STEER * h;
      } else accelerate(s, wx, wz, wish, K.ACC, h, false);
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

