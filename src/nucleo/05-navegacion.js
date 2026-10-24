/* =====================================================================
   NAVEGACIÓN DE BOTS (grilla de 1 m generada desde el mapa)
   ===================================================================== */
const NAVS = {};
function inLava(W, x, y, z) { for (const l of W.lava) if (x > l.min[0] && x < l.max[0] && z > l.min[2] && z < l.max[2] && y < l.max[1] + .05 && y > l.min[1] - .5) return true; return false; }
function airtime(dy) { const disc = K.JUMP * K.JUMP - 2 * K.GRAV * dy; if (disc < 0) return 0; return (K.JUMP + Math.sqrt(disc)) / K.GRAV; }
function buildNav(W) {
  const X0 = Math.floor(W.bounds.x0), Z0 = Math.floor(W.bounds.z0), NX = Math.ceil(W.bounds.x1) - X0, NZ = Math.ceil(W.bounds.z1) - Z0;
  const cells = new Array(NX * NZ), nodes = [];
  // bloques agrupados por columna (x) para no recorrer todo el mapa en cada celda: el armado tarda varias veces menos
  const cols = [];
  for (let cx = 0; cx < NX; cx++) { const qx = X0 + cx + .5 + .013; cols.push(W.brushes.filter(b => !b.nc && !b.mover && b.min[0] < qx && b.max[0] > qx)); }
  for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) {
    const px = X0 + cx + .5, pz = Z0 + cz + .5, tops = [];
    for (const b of cols[cx]) {
      // se mira un poquito corrido del centro para no caer justo en el borde entre dos escalones
      const qx = px + .013, qz = pz + .017;
      if (b.nc || b.mover || !(b.min[0] < qx && b.max[0] > qx && b.min[2] < qz && b.max[2] > qz)) continue;
      const t = topAt(b, qx, qz, qx, qz);
      if (t > 12.5) continue;
      if (!tops.some(q => Math.abs(q - t) < .05)) tops.push(t);
    }
    const list = [];
    for (const t of tops) {
      // lo que sobresale menos que un escalón no estorba (escaleras de huella corta)
      if (solidAt(W, px, t + K.STEP + .01, pz, .3, 1.75 - K.STEP)) continue;
      if (inLava(W, px, t, pz)) continue;
      const n = { id: nodes.length, x: px, y: t, z: pz, c: cx + cz * NX, l: [] };
      nodes.push(n); list.push(n);
    }
    cells[cx + cz * NX] = list;
  }
  const at = (cx, cz) => (cx < 0 || cz < 0 || cx >= NX || cz >= NZ) ? [] : cells[cx + cz * NX];
  const near = (list, y, tol) => { let best = null; for (const m of list) if (Math.abs(m.y - y) <= tol && (!best || Math.abs(m.y - y) < Math.abs(best.y - y))) best = m; return best; };
  const edges = [];
  for (const n of nodes) {
    const cx = n.c % NX, cz = (n.c / NX) | 0;
    let edge = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const m = near(at(cx + dx, cz + dz), n.y, .6);
      if (m) {
        if (dx && dz && (!near(at(cx + dx, cz), n.y, .6) || !near(at(cx, cz + dz), n.y, .6))) continue;
        // todos los nodos vecinos a menos de un escalón (en las escaleras puede haber dos en la misma celda)
        for (const q of at(cx + dx, cz + dz)) if (Math.abs(q.y - n.y) <= .6) n.l.push([q.id, dx && dz ? 1.414 : 1, 0]);
      } else if (!dx || !dz) {
        edge = true;
        let low = null;
        for (const q of at(cx + dx, cz + dz)) if (q.y < n.y - .6 && q.y > n.y - 14 && (!low || q.y > low.y)) low = q;
        // solo si el cuerpo entra en la columna de al lado a la altura de partida (no atravesar paredes sobre puertas)
        if (low && !solidAt(W, low.x, n.y + .05, low.z, .3, 1.7)) n.l.push([low.id, 1.5, 1]);
      }
    }
    if (edge) edges.push(n);
  }
  // saltos entre bordes (huecos y plataformas)
  const EG = new Map(), ek = (x, z) => Math.floor(x / 7) + ',' + Math.floor(z / 7);
  for (const m of edges) { const k = ek(m.x, m.z); if (!EG.has(k)) EG.set(k, []); EG.get(k).push(m); }
  for (const n of edges) {
    const gx = Math.floor(n.x / 7), gz = Math.floor(n.z / 7), cand = [];
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const l = EG.get((gx + a) + ',' + (gz + c)); if (l) for (const m of l) cand.push(m); }
    cand.sort((p, q) => p.id - q.id);
    for (const m of cand) {
      if (m === n) continue;
      const dx = m.x - n.x, dz = m.z - n.z, d = Math.hypot(dx, dz);
      if (d < 1.9 || d > 6.3) continue;
      const dy = m.y - n.y;
      if (dy > 1.25 || dy < -5) continue;
      if (d - 1 > 9.2 * airtime(dy)) continue;
      let bridged = true;
      for (const f of [.25, .5, .75]) {
        const qx = Math.floor(n.x + dx * f) - X0, qz = Math.floor(n.z + dz * f) - Z0, qy = n.y + dy * f;
        if (!near(at(qx, qz), qy, .7)) { bridged = false; break; }
      }
      if (bridged) continue;
      if (!los(W, n.x, n.y + 1, n.z, m.x, m.y + 1, m.z)) continue;
      if (!los(W, n.x, n.y + 1.7, n.z, m.x, m.y + 1.7, m.z)) continue;
      n.l.push([m.id, d + 1.5, 2]);
    }
  }
  const nodeAt = (x, y, z) => {
    const cx = Math.floor(x) - X0, cz = Math.floor(z) - Z0; let best = null;
    for (const m of at(cx, cz)) if (m.y <= y + .7 && (!best || m.y > best.y)) best = m;
    return best;
  };
  for (const p of W.pads) {
    const a = nodeAt(p.x, p.y + .1, p.z), b = nodeAt(p.t[0], p.t[1] + .1, p.t[2]);
    if (a && b) a.l.push([b.id, 4, 3]);
  }
  for (const t of W.teles) {
    const a = nodeAt(t.x, t.y + .1, t.z), b = nodeAt(t.to[0], t.to[1] + .1, t.to[2]);
    if (a && b) a.l.push([b.id, 3, 4]);
  }
  // adyacencia compacta para búsquedas rápidas
  const N = nodes.length; let E = 0; nodes.forEach(n => E += n.l.length);
  const off = new Int32Array(N + 1), to = new Int32Array(E), cost = new Float32Array(E);
  let k = 0;
  nodes.forEach((n, i) => { off[i] = k; n.l.forEach(l => { to[k] = l[0]; cost[k] = l[1]; k++; }); });
  off[N] = k;
  return { X0, Z0, NX, NZ, cells, nodes, at, nodeAt, off, to, cost };
}
function getNav(W) { W = W || WORLD; if (!NAVS[W.id]) NAVS[W.id] = buildNav(W); return NAVS[W.id]; }
function findNode(nav, x, y, z) {
  let n = nav.nodeAt(x, y, z);
  if (n) return n;
  const cx = Math.floor(x) - nav.X0, cz = Math.floor(z) - nav.Z0; let best = null, bd = 1e9;
  for (let r = 1; r <= 4 && !best; r++)
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      for (const m of nav.at(cx + dx, cz + dz)) {
        if (m.y > y + 1.3) continue;
        const d = Math.hypot(m.x - x, (m.y - y) * 2, m.z - z);
        if (d < bd) { bd = d; best = m; }
      }
    }
  return best;
}
function dijkstra(nav, start) {
  // los arreglos se reutilizan entre búsquedas (menos basura = menos pausas del recolector)
  const N = nav.nodes.length;
  if (!nav._dist) { nav._dist = new Float64Array(N); nav._prev = new Int32Array(N); nav._hk = new Float64Array(1024); nav._hv = new Int32Array(1024); }
  const dist = nav._dist.fill(Infinity), prev = nav._prev.fill(-1);
  const off = nav.off, to = nav.to, cost = nav.cost;
  let cap = nav._hk.length, hk = nav._hk, hv = nav._hv, size = 0;
  const push = (i, d) => {
    if (size === cap) { cap *= 2; const a = new Float64Array(cap), b = new Int32Array(cap); a.set(hk); b.set(hv); hk = nav._hk = a; hv = nav._hv = b; }
    let c = size++;
    while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= d) break; hk[c] = hk[p]; hv[c] = hv[p]; c = p; }
    hk[c] = d; hv[c] = i;
  };
  dist[start] = 0; push(start, 0);
  while (size) {
    const d = hk[0], i = hv[0];
    size--;
    if (size) {
      const kd = hk[size], kv = hv[size]; let c = 0;
      for (;;) { const l = 2 * c + 1; if (l >= size) break; const m = l + 1 < size && hk[l + 1] < hk[l] ? l + 1 : l; if (hk[m] >= kd) break; hk[c] = hk[m]; hv[c] = hv[m]; c = m; }
      hk[c] = kd; hv[c] = kv;
    }
    if (d > dist[i]) continue;
    for (let e = off[i], ee = off[i + 1]; e < ee; e++) { const nd = d + cost[e], j = to[e]; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(j, nd); } }
  }
  return { dist, prev };
}
function pathTo(dj, goal) { const out = []; let i = goal; while (i !== -1) { out.push(i); i = dj.prev[i]; } return out.reverse(); }
function linkType(nav, a, b) { for (const l of nav.nodes[a].l) if (l[0] === b) return l[2]; return 0; }

