/* =====================================================================
   MAPAS
   Todo el nivel son cajas (brushes), igual que en Quake.
   x: oeste(-) / este(+) · z: norte(-) / sur(+) · y: altura
   ===================================================================== */
function mapKit() {
  const B = [], pads = [], teles = [], lava = [], items = [], spawns = [], lights = [];
  function add(x0, y0, z0, x1, y1, z1, mat, ex) {
    const b = { min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], mat: mat || 'wall' };
    if (ex) Object.assign(b, ex);
    B.push(b); return b;
  }
  // rampa: sube a lo largo de axis ('x'|'z') hacia dir (+1|-1); arriba va de lo a hi, base en yb
  function ramp(x0, z0, x1, z1, yb, lo, hi, axis, dir, mat) { return add(x0, yb, z0, x1, hi, z1, mat, { ramp: { axis, dir, lo, hi } }); }
  // pared con aberturas: doors = [[a0,a1,yb,yt]] medidas sobre el eje largo
  function wall(x0, z0, x1, z1, y0, y1, doors, mat) {
    const alongX = (x1 - x0) >= (z1 - z0);
    const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
    const cuts = [a0, a1];
    doors.forEach(d => { cuts.push(d[0], d[1]); });
    const cs = [...new Set(cuts)].filter(c => c >= a0 && c <= a1).sort((a, b) => a - b);
    for (let i = 0; i < cs.length - 1; i++) {
      const s = cs[i], e = cs[i + 1], mid = (s + e) / 2;
      const segs = [];
      const ds = doors.filter(d => d[0] <= mid && mid <= d[1]).sort((a, b) => a[2] - b[2]);
      if (!ds.length) segs.push([y0, y1]);
      else {
        let y = y0;
        ds.forEach(d => { if (d[2] > y) segs.push([y, d[2]]); y = Math.max(y, d[3]); });
        if (y < y1) segs.push([y, y1]);
      }
      segs.forEach(sg => {
        if (alongX) add(s, sg[0], z0, e, sg[1], z1, mat);
        else add(x0, sg[0], s, x1, sg[1], e, mat);
      });
    }
  }
  function stairs(x0, z0, x1, z1, yb, rise, n, axis, dir, mat) {
    const lo = axis === 'x' ? x0 : z0, hi = axis === 'x' ? x1 : z1, L = (hi - lo) / n;
    for (let i = 1; i <= n; i++) {
      const a = dir > 0 ? lo + (i - 1) * L : hi - i * L, b = dir > 0 ? lo + i * L : hi - (i - 1) * L;
      const top = yb + rise * i;
      if (axis === 'x') add(a, yb, z0, b, top, z1, mat || 'step'); else add(x0, yb, a, x1, top, b, mat || 'step');
    }
  }
  const D = (a0, a1, y0, y1) => [a0, a1, y0, y1];
  const face = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
  const I = (type, x, y, z) => items.push({ type, x, y, z });
  // plataforma móvil: se desplaza amp metros sobre axis (0=x, 1=y, 2=z) ida y vuelta cada period segundos
  const mover = (x0, y0, z0, x1, y1, z1, mat, axis, amp, period, phase) => add(x0, y0, z0, x1, y1, z1, mat, { mover: { axis, amp, period, phase: phase || 0 } });
  function finish(o) {
    const movers = B.filter(b => b.mover);
    movers.forEach(b => { b.mover.min0 = b.min.slice(); b.mover.max0 = b.max.slice(); b.off = 0; });
    B.forEach((b, i) => b.id = i);
    return Object.assign({ brushes: B, pads, teles, lava, items, spawns, lights, movers }, o);
  }
  return { B, pads, teles, lava, items, spawns, lights, add, ramp, wall, stairs, D, face, I, mover, finish };
}

/* ---------- registro de mapas ----------
   Cada archivo de 02-mapas/ termina con  MAPDEFS.<id> = <función que arma el mapa>;
   El orden de los archivos es el orden de los mapas en el juego. */
const MAPDEFS = {};
/* Mapa en datos puros (lo exporta el editor: public/editor.html). Mismo resultado que armarlo a mano con mapKit:
   { id, name, bounds, theme, modos: ['arena', ...], brushes: [{ min, max, mat, ...extras }], items, spawns, pads, teles, lava, lights, deco } */
function mapFromData(d) {
  const k = mapKit();
  for (const b of d.brushes || []) {
    const { min, max, mat, ...ex } = b;
    k.add(min[0], min[1], min[2], max[0], max[1], max[2], mat, Object.keys(ex).length ? JSON.parse(JSON.stringify(ex)) : undefined);
  }
  for (const key of ['pads', 'teles', 'lava', 'items', 'spawns', 'lights']) for (const o of d[key] || []) k[key].push(JSON.parse(JSON.stringify(o)));
  const { brushes, pads, teles, lava, items, spawns, lights, ...rest } = d;
  return k.finish(Object.assign({ deco: [], bounds: { x0: -40, x1: 40, z0: -40, z1: 40 }, theme: { sky: 'day', fog: 0xbfd3e6, fogD: .006, amb: 0xc9d0da, ambI: .5, hemi: [0xbcd8ff, 0x8a7a62, .42], sun: true } }, JSON.parse(JSON.stringify(rest))));
}

