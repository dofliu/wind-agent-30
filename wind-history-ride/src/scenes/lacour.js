// src/scenes/lacour.js
// #10 · 1891 · 拉庫爾的風洞 — Poul la Cour's wind laboratory at Askov, Denmark.
//
// Medium: a Danish Golden Age oil painting (Købke / Lundbye lineage): pale luminous
// Nordic sky, low late-afternoon sun from the left, warm-cool harmony, delicate visible
// brushwork (baked brush strokes with bristle streaks), canvas weave, fine craquelure and
// a warm varnish, all inside the gilt frame supplied by the engine.
//
//   * The 1891 experimental mill built for la Cour by millwright N. J. Poulsen: the
//     standard four-sailed Danish/Dutch rotor on a slim tapering timber trestle tower that
//     rises out of a tarred plank shed (vertical spindle down to the DC dynamo inside), a
//     gallery with railing half way up, a ladder, a small cap with a fan-tail, and sails
//     with wooden shutters (the canvas sails were soon replaced by shutters). The sails turn
//     anticlockwise seen from the front, the lattice on the trailing side.
//   * The larger building beside it held the electrolysis vessels; two gas holders sunk in
//     the ground stored hydrogen and oxygen (2 : 1 by volume), piped 300 m to the folk high
//     school (the thatched, whitewashed buildings on the left) to light its lamps.
//   * Foreground: a teaching table with a small wooden wind-tunnel box (fan at the back,
//     tiny four-sailed model rotor inside its mouth), a water voltameter (H and O tubes) and
//     a hydrogen lamp; a student of the "wind electricians" takes notes.
//
// Story beat (bar 3, localT 4–6 s): a gust. The sails speed up, the bubbles in the
// electrolysis jar surge, the hydrogen bell rises, the lamp flares brighter, the school
// windows glow — and the student's notebook pages flutter while he grabs his cap.

const S = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;
const HORIZON = 600;

// -----------------------------------------------------------------------------
// colour helpers (rgb arrays)
// -----------------------------------------------------------------------------
const HEXC = new Map();
function hx(h) {
  if (HEXC.has(h)) return HEXC.get(h);
  const v = parseInt(h.slice(1), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  HEXC.set(h, c);
  return c;
}
function mixc(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function cl255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}
function css(c, a = 1) {
  return `rgba(${cl255(c[0])},${cl255(c[1])},${cl255(c[2])},${a})`;
}
function jit(c, rng, amt) {
  const k = (rng() - 0.5) * 2 * amt;
  return [c[0] + k + (rng() - 0.5) * amt * 0.6, c[1] + k + (rng() - 0.5) * amt * 0.6, c[2] + k + (rng() - 0.5) * amt * 0.6];
}
function scale3(c, k) {
  return [c[0] * k, c[1] * k, c[2] * k];
}
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function sstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
/** integral of smoothstep(a,b,x) dx from a to T (0 before a) */
function intSmooth(T, a, b) {
  const s = clamp01((T - a) / (b - a));
  return (b - a) * (s * s * s - 0.5 * s * s * s * s) + Math.max(0, T - b);
}

const C = {
  skyTop: hx('#9cb8cc'),
  skyDeep: hx('#7f9fb8'),
  skyMid: hx('#c3d2d5'),
  skyLow: hx('#ebe2c9'),
  glow: hx('#f4d5a6'),
  cloudLit: hx('#fbf4e4'),
  cloudWarm: hx('#f7dcb6'),
  cloudShade: hx('#a9abb9'),
  cloudDeep: hx('#8c8ea0'),
  farBlue: hx('#93a4a3'),
  farGreen: hx('#9ea67c'),
  field: hx('#c6b37a'),
  fieldG: hx('#899656'),
  treeDark: hx('#29331f'),
  treeMid: hx('#46552f'),
  treeLit: hx('#7f8c46'),
  treeWarm: hx('#aaa45a'),
  treeCool: hx('#3d4b48'),
  thatch: hx('#94805a'),
  thatchShade: hx('#62553d'),
  thatchLit: hx('#c3aa72'),
  moss: hx('#6f7444'),
  wall: hx('#f1e8d2'),
  wallShade: hx('#b8b6ab'),
  tar: hx('#2a2622'),
  tile: hx('#b2603d'),
  tileShade: hx('#78402d'),
  ochreWall: hx('#e3c27f'),
  ochreShade: hx('#a88a58'),
  timber: hx('#7a6750'),
  timberLit: hx('#c2a77d'),
  timberDark: hx('#3c3229'),
  shed: hx('#3b322a'),
  shedLit: hx('#7a5f45'),
  stone: hx('#8f8a7e'),
  stoneLit: hx('#cfc3a8'),
  stoneDark: hx('#565249'),
  grass: hx('#717c3f'),
  grassLit: hx('#aaa653'),
  grassDark: hx('#3a4524'),
  grassCool: hx('#55654b'),
  road: hx('#c2a679'),
  roadLit: hx('#e0c99e'),
  roadShade: hx('#8d7656'),
  shutter: hx('#e8dfcc'),
  shutterShade: hx('#a29a8b'),
  iron: hx('#3f4441'),
  ironLit: hx('#7d847c'),
  brass: hx('#b88c45'),
  brassLit: hx('#ecc77e'),
  deal: hx('#c9aa7e'),
  dealLit: hx('#e6cda0'),
  dealDark: hx('#7a5a3a'),
  jacket: hx('#353b49'),
  jacketLit: hx('#6b7180'),
  skin: hx('#d8a47c'),
  skinLit: hx('#efc39a'),
  hair: hx('#caa462'),
  paper: hx('#efe6cf'),
  paperShade: hx('#c8bc9f'),
  water: hx('#b9d0c8'),
};

// -----------------------------------------------------------------------------
// timing
// -----------------------------------------------------------------------------
const G0 = 3.75;
const G1 = 4.35;
const G2 = 5.9;
const G3 = 6.9;
function gust(T) {
  return sstep(G0, G1, T) - sstep(G2, G3, T);
}
function gustInt(T) {
  return intSmooth(T, G0, G1) - intSmooth(T, G2, G3);
}
/** sail angle: anticlockwise seen from the front (canvas angle decreasing) */
function sailAngle(T) {
  return -(0.4 + 1.3 * T + 1.05 * gustInt(T));
}
function lampLevel(T, thumb) {
  if (thumb) return 0.4;
  const g = gust(T);
  const flick = 0.04 * Math.sin(T * 23.0) + 0.03 * Math.sin(T * 37.3 + 1.2);
  return 0.38 + 0.08 * sstep(-2, 8, T) + 0.55 * g + flick * (0.4 + g);
}

// -----------------------------------------------------------------------------
// painting primitives (bake time)
// -----------------------------------------------------------------------------
function brush(g, rng, x, y, ang, len, w, col, a) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const hxl = ca * len * 0.5;
  const hyl = sa * len * 0.5;
  g.lineWidth = w;
  g.strokeStyle = css(col, a);
  g.beginPath();
  g.moveTo(x - hxl, y - hyl);
  g.lineTo(x + hxl, y + hyl);
  g.stroke();
  if (w > 2.6 && rng() < 0.55) {
    const o = (rng() - 0.5) * w * 0.7;
    const nx = -sa * o;
    const ny = ca * o;
    const k = rng() < 0.55 ? 1.09 : 0.9;
    g.lineWidth = Math.max(0.5, w * 0.2);
    g.strokeStyle = css(scale3(col, k), a * 0.75);
    g.beginPath();
    g.moveTo(x - hxl * 0.85 + nx, y - hyl * 0.85 + ny);
    g.lineTo(x + hxl * 0.7 + nx, y + hyl * 0.7 + ny);
    g.stroke();
  }
}

/** Collects strokes and draws them grouped by quantised colour / width / alpha (fast bakes). */
function makeBatch() {
  const buckets = new Map();
  const add = (x0, y0, x1, y1, w, col, a) => {
    const r = cl255(col[0]) >> 3;
    const gg = cl255(col[1]) >> 3;
    const b = cl255(col[2]) >> 3;
    const wb = Math.max(1, Math.min(99, Math.round(w * 2)));
    const ab = Math.max(1, Math.min(9, Math.round(a * 9)));
    const key = ((r * 32 + gg) * 32 + b) * 1000 + wb * 10 + ab;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(x0, y0, x1, y1);
  };
  const brushB = (rng, x, y, ang, len, w, col, a) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const hxl = ca * len * 0.5;
    const hyl = sa * len * 0.5;
    add(x - hxl, y - hyl, x + hxl, y + hyl, w, col, a);
    if (w > 2.6 && rng() < 0.55) {
      const o = (rng() - 0.5) * w * 0.7;
      const k = rng() < 0.55 ? 1.09 : 0.9;
      add(x - hxl * 0.85 - sa * o, y - hyl * 0.85 + ca * o, x + hxl * 0.7 - sa * o, y + hyl * 0.7 + ca * o, Math.max(0.5, w * 0.2), scale3(col, k), a * 0.75);
    }
  };
  const flush = (g, rng) => {
    const keys = [...buckets.keys()];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = keys[i];
      keys[i] = keys[j];
      keys[j] = t;
    }
    for (const key of keys) {
      const ab = key % 10;
      const wb = Math.floor(key / 10) % 100;
      const rgb = Math.floor(key / 1000);
      const b = rgb % 32;
      const gg = Math.floor(rgb / 32) % 32;
      const r = Math.floor(rgb / 1024);
      g.strokeStyle = `rgba(${r * 8 + 4},${gg * 8 + 4},${b * 8 + 4},${ab / 9})`;
      g.lineWidth = wb / 2;
      const arr = buckets.get(key);
      g.beginPath();
      for (let k = 0; k < arr.length; k += 4) {
        g.moveTo(arr[k], arr[k + 1]);
        g.lineTo(arr[k + 2], arr[k + 3]);
      }
      g.stroke();
    }
    buckets.clear();
  };
  return { add, brushB, flush };
}

/** sample a scalar field once on a grid, return a bilinear sampler */
function gridField(fn, x0, y0, x1, y1, step) {
  const pad = 10;
  const gx0 = x0 - pad;
  const gy0 = y0 - pad;
  const nx = Math.ceil((x1 - x0 + 2 * pad) / step) + 2;
  const ny = Math.ceil((y1 - y0 + 2 * pad) / step) + 2;
  const a = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) a[j * nx + i] = fn(gx0 + i * step, gy0 + j * step);
  return (x, y) => {
    let fx = (x - gx0) / step;
    let fy = (y - gy0) / step;
    if (fx < 0) fx = 0;
    if (fy < 0) fy = 0;
    if (fx > nx - 1.001) fx = nx - 1.001;
    if (fy > ny - 1.001) fy = ny - 1.001;
    const i = fx | 0;
    const j = fy | 0;
    const u = fx - i;
    const v = fy - j;
    const k = j * nx + i;
    return (a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + nx] * (1 - u) + a[k + nx + 1] * u) * v;
  };
}

function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}

/** fill polygon with a flat colour, then lay strokes clipped inside it. */
function paintPoly(g, rng, pts, base, n, opt) {
  poly(g, pts);
  g.fillStyle = css(base);
  g.fill();
  if (!n) return;
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const p of pts) {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  }
  g.save();
  poly(g, pts);
  g.clip();
  const B = makeBatch();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rng());
    const y = lerp(y0, y1, rng());
    const col = opt.color(x, y, rng);
    const ang = (opt.angle ? opt.angle(x, y) : 0) + (rng() - 0.5) * (opt.angJit ?? 0.3);
    B.brushB(rng, x, y, ang, lerp(opt.len[0], opt.len[1], rng()), lerp(opt.w[0], opt.w[1], rng()), col, lerp(opt.alpha[0], opt.alpha[1], rng()));
  }
  B.flush(g, rng);
  g.restore();
}

/** foliage / cloud style "puff" painting with a directional light. */
function paintPuffs(g, rng, puffs, opt) {
  const L = opt.light || [-0.82, -0.57];
  for (const p of puffs) {
    const [cx, cy, r] = p;
    const n = Math.round(r * r * (opt.density || 0.5));
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const d = Math.sqrt(rng());
      const nx = Math.cos(a) * d;
      const ny = Math.sin(a) * d;
      const x = cx + nx * r;
      const y = cy + ny * r;
      if (opt.clipY !== undefined && y > opt.clipY + 3 * rng()) continue;
      const dot = nx * L[0] + ny * L[1];
      const lit = clamp01(0.5 + 0.5 * dot + (opt.vgrad ? opt.vgrad(y) : 0) + (rng() - 0.5) * 0.18);
      const col = opt.color(lit, x, y, rng);
      const edge = 1 - sstep(0.72, 1.0, d);
      const alpha = lerp(opt.alpha[0], opt.alpha[1], rng()) * (opt.softEdge ? edge : 1);
      if (alpha < 0.02) continue;
      const ang = opt.tangent ? a + Math.PI / 2 + (rng() - 0.5) * 0.9 : rng() * TAU;
      brush(g, rng, x, y, ang, lerp(opt.len[0], opt.len[1], rng()), lerp(opt.w[0], opt.w[1], rng()), col, alpha);
    }
  }
}

// -----------------------------------------------------------------------------
// geometry shared by bake + frame
// -----------------------------------------------------------------------------
// trestle tower (tiny 3D: X right, Z towards the viewer, perspective from eye level = horizon)
const TWR = { cx: 690, yb: 592, yt: 256, hb: 48, ht: 16, yaw: 0.42 };
const CYAW = Math.cos(TWR.yaw);
const SYAW = Math.sin(TWR.yaw);
function proj(cx, y, X, Z, yaw = true) {
  const xp = yaw ? X * CYAW + Z * SYAW : X;
  const zp = yaw ? -X * SYAW + Z * CYAW : Z;
  return { x: cx + xp, y: y - (zp * (HORIZON - y)) / 1200, z: zp };
}
function tp(u, sx, sz) {
  const y = TWR.yb + (TWR.yt - TWR.yb) * u;
  const h = TWR.hb + (TWR.ht - TWR.hb) * u;
  return proj(TWR.cx, y, sx * h, sz * h);
}
const GAL_U = 0.355;
const GAL_Y = TWR.yb + (TWR.yt - TWR.yb) * GAL_U;
const GAL_H = 64;
function galPt(sx, sz, up = 0) {
  const p = proj(TWR.cx, GAL_Y, sx * GAL_H, sz * GAL_H);
  return { x: p.x, y: p.y - up, z: p.z };
}

// cap & rotor: wind shaft points to the front-left
const AX = { fx: -0.57, fz: 0.82, rx: 0.82, rz: 0.57 };
const CAP_C = { x: TWR.cx, y: 257 };
function capPt(f, r, up) {
  // f along the shaft (towards the sails), r sideways, up in px
  const X = AX.fx * f + AX.rx * r;
  const Z = AX.fz * f + AX.rz * r;
  return proj(CAP_C.x, CAP_C.y - up, X, Z, false);
}
const HUB = capPt(40, 0, 15);
const SAIL_R = 172;
const SAIL_SHEAR = -(AX.rz * (HORIZON - HUB.y)) / 1200; // vertical shift per unit sideways

// school windows (for the evening glow)
const SCHOOL_WIN = [];
for (let i = 0; i < 7; i++) {
  const x = 196 + i * 33;
  if (i === 3) continue;
  SCHOOL_WIN.push([x, 607, 15, 20]);
}

// gas holders
const GH = [
  { cx: 851, cy: 653, rr: 32, rb: 27, top: 619, rise: 9, post: 596 },
  { cx: 925, cy: 655, rr: 22, rb: 18, top: 631, rise: 4.5, post: 607 },
];

// foreground still life
const FG_Y = 610;
const TUN = { fx0: 160, fx1: 222, fy0: 732, fy1: 794, dx: -70, dy: -12, rot: { x: 191, y: 763, r: 20 } };
const JAR = { cx: 273, top: 716, bot: 800, rx: 33, ry: 6, water: 723 };
const TUBES = [
  { cx: 260, top: 664, mouth: 772, w: 15, label: 'H', el: 788 },
  { cx: 287, top: 664, mouth: 772, w: 15, label: 'O', el: 788 },
];
const LAMP = { cx: 340, base: 801, burner: 744, top: 696, mantle: [716, 735] };
const BOOK = { spineB: [401, 789], spineF: [404, 808], pw: 38 };
const STU = {
  shoulder: [495, 751],
  restHand: [470, 830],
  capHand: [488, 698],
  head: [482, 716],
};

// -----------------------------------------------------------------------------
// BACKGROUND (sky, land, school, mill, buildings, road) — baked once
// -----------------------------------------------------------------------------
function skyCol(x, y) {
  const v = clamp01(y / (HORIZON + 20));
  let c = v < 0.5 ? mixc(C.skyTop, C.skyMid, v / 0.5) : mixc(C.skyMid, C.skyLow, (v - 0.5) / 0.5);
  const gx = x / 540;
  const gy = (y - 620) / 300;
  c = mixc(c, C.glow, Math.exp(-(gx * gx + gy * gy)) * 0.6);
  const br = Math.max(0, (x - 480) / 520) * Math.max(0, 1 - y / 470);
  c = mixc(c, C.skyDeep, br * 0.45);
  return c;
}

function paintSky(g, rng) {
  for (let y = 0; y < HORIZON + 40; y += 4) {
    for (let x = 0; x < S; x += 50) {
      g.fillStyle = css(skyCol(x + 25, y + 2));
      g.fillRect(x, y, 50, 4);
    }
  }
  const B = makeBatch();
  for (let i = 0; i < 4500; i++) {
    const x = rng() * S;
    const y = rng() * (HORIZON + 20);
    const col = jit(skyCol(x, y), rng, 7);
    B.brushB(rng, x, y, -0.07 + (rng() - 0.5) * 0.28, lerp(16, 48, rng()), lerp(4, 10, rng()), col, lerp(0.22, 0.48, rng()));
  }
  B.flush(g, rng);
}

function cloudColor(lit, x, y, rng) {
  let c = mixc(C.cloudDeep, C.cloudShade, clamp01(lit * 2));
  if (lit > 0.5) c = mixc(C.cloudShade, C.cloudLit, clamp01((lit - 0.5) * 2.1));
  if (lit > 0.74) c = mixc(c, C.cloudWarm, clamp01((lit - 0.74) * 2.4));
  // sky reflection on the shadow side
  c = mixc(c, skyCol(x, y), 0.16 + 0.1 * (1 - lit));
  return jit(c, rng, 5);
}

/** gaussian blobs + fbm: a density field for clouds and foliage (>0 inside). */
function blobField(kit, x, y, blobs, nScale, nAmp, seed, base) {
  let v = 0;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const dx = (x - b[0]) / b[2];
    const dy = (y - b[1]) / (b[3] || b[2]);
    const q = dx * dx + dy * dy;
    if (q < 7) v += Math.exp(-q * 1.25);
  }
  const n = kit.fbm2(x * nScale, y * nScale * 1.15, 4, seed) - 0.5;
  let d = Math.min(v, 1.35) - 0.5 + n * nAmp;
  if (base !== undefined) d -= sstep(base - 24, base + 3, y) * 1.3;
  return d;
}

/** paint a density field with strokes lit from the low sun on the left. */
function paintField(g, rng, bbox, DfnRaw, opt) {
  const [x0, y0, x1, y1] = bbox;
  const Dfn = gridField(DfnRaw, x0, y0, x1, y1, 2);
  const N = Math.round((x1 - x0) * (y1 - y0) * opt.density);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const x = lerp(x0, x1, rng());
    const y = lerp(y0, y1, rng());
    const d = Dfn(x, y);
    if (d < -0.04) continue;
    pts.push([x, y, d]);
  }
  const L = opt.light || [-0.86, -0.5];
  const B = makeBatch();
  const e = opt.eps || 4;
  const LF = opt.lightField ? gridField(opt.lightField, x0, y0, x1, y1, 2) : Dfn;
  for (const [x, y, d] of pts) {
    const gx = LF(x + e, y) - LF(x - e, y);
    const gy = LF(x, y + e) - LF(x, y - e);
    const gm = Math.hypot(gx, gy) + 1e-6;
    const facing = (-gx / gm) * L[0] + (-gy / gm) * L[1];
    const edgeK = clamp01(gm * (opt.gk || 4));
    const lit = clamp01(0.5 + 0.46 * facing * edgeK + (opt.vgrad ? opt.vgrad(x, y) : 0) + (rng() - 0.5) * 0.12);
    const col = opt.color(lit, x, y, rng, d);
    const a = sstep(-0.04, opt.soft || 0.12, d) * lerp(opt.alpha[0], opt.alpha[1], rng());
    if (a < 0.02) continue;
    const ang = opt.alongContour ? Math.atan2(gy, gx) + Math.PI / 2 + (rng() - 0.5) * (opt.angJit ?? 0.6) : opt.angle ? opt.angle(x, y) + (rng() - 0.5) * (opt.angJit ?? 0.6) : rng() * TAU;
    B.brushB(rng, x, y, ang, lerp(opt.len[0], opt.len[1], rng()), lerp(opt.w[0], opt.w[1], rng()), col, a);
  }
  B.flush(g, rng);
}

const CLOUD_A = [
  [150, 336, 36], [206, 308, 46], [270, 276, 54], [348, 252, 62], [428, 266, 52], [492, 302, 42],
  [540, 338, 30], [300, 338, 46], [404, 336, 44], [232, 352, 32], [466, 350, 32], [334, 200, 40],
  [394, 188, 34], [284, 224, 38], [448, 222, 30], [364, 342, 36], [250, 252, 26], [312, 206, 26],
  [372, 162, 26], [424, 178, 24], [474, 232, 24], [522, 292, 22], [196, 282, 24], [356, 290, 34],
];
function lumpField(x, y, blobs, kit, seed) {
  let v = 0;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const dx = (x - b[0]) / b[2];
    const dy = (y - b[1]) / (b[3] || b[2]);
    const q = dx * dx + dy * dy;
    if (q < 7) v += Math.exp(-q * 1.6);
  }
  return v + 0.35 * kit.fbm2(x * 0.035, y * 0.035, 3, seed);
}
const CLOUD_B = [[96, 112, 24], [134, 100, 30], [176, 108, 24], [214, 120, 18], [248, 124, 12]];

function paintClouds(g, rng, kit) {
  const baseA = 374;
  paintField(g, rng, [96, 120, 600, 382], (x, y) => blobField(kit, x, y, CLOUD_A, 0.016, 0.62, 5, baseA), {
    density: 0.36, alpha: [0.45, 0.85], len: [5, 14], w: [3, 6.5], alongContour: true, angJit: 0.8, gk: 7, soft: 0.16, eps: 5,
    lightField: (x, y) => lumpField(x, y, CLOUD_A, kit, 6),
    vgrad: (x, y) => -0.3 + 0.55 * clamp01((baseA - y) / 210),
    color: (lit, x, y, r) => cloudColor(lit, x, y, r),
  });
  paintField(g, rng, [60, 80, 280, 134], (x, y) => blobField(kit, x, y, CLOUD_B, 0.03, 0.5, 8, 130), {
    density: 0.4, alpha: [0.3, 0.65], len: [5, 12], w: [2.5, 5], alongContour: true, gk: 5, soft: 0.18,
    vgrad: (x, y) => -0.1 + 0.3 * clamp01((130 - y) / 50),
    color: (lit, x, y, r) => cloudColor(lit, x, y, r),
  });
  // long warm stratus streaks low on the right and wisps upper right
  for (let i = 0; i < 1100; i++) {
    const x = lerp(470, 990, rng());
    const band = Math.floor(rng() * 4);
    const y = 466 + band * 19 + (rng() - 0.5) * 8 + Math.sin(x * 0.01 + band) * 4;
    const c = mixc(C.cloudWarm, C.cloudShade, rng() * 0.55);
    brush(g, rng, x, y, -0.02 + (rng() - 0.5) * 0.06, lerp(20, 60, rng()), lerp(2, 5, rng()), jit(c, rng, 6), lerp(0.1, 0.28, rng()));
  }
  for (let i = 0; i < 300; i++) {
    const x = lerp(740, 990, rng());
    const y = 120 + (x - 740) * 0.12 + (rng() - 0.5) * 22;
    brush(g, rng, x, y, -0.12 + (rng() - 0.5) * 0.1, lerp(20, 50, rng()), lerp(2, 4, rng()), jit(C.cloudLit, rng, 5), lerp(0.08, 0.2, rng()));
  }
}

function foliageColor(lit, x, y, r, warmK = 1) {
  let c;
  if (lit > 0.66) c = mixc(C.treeLit, C.treeWarm, clamp01((lit - 0.66) * 2.6) * warmK);
  else if (lit > 0.4) c = mixc(C.treeMid, C.treeLit, (lit - 0.4) / 0.26);
  else c = mixc(C.treeDark, C.treeMid, lit / 0.4);
  if (lit < 0.3) c = mixc(c, C.treeCool, 0.35);
  return jit(c, r, 9);
}

function horizonY(x) {
  return HORIZON - 4 + 7 * (Math.sin(x * 0.011) * 0.5 + Math.sin(x * 0.029 + 1.3) * 0.3);
}

function paintFarLand(g, rng, kit) {
  const pts = [];
  for (let x = 0; x <= S; x += 20) pts.push([x, horizonY(x)]);
  pts.push([S, 700], [0, 700]);
  paintPoly(g, rng, pts, mixc(C.farGreen, C.farBlue, 0.4), 3000, {
    color: (x, y, r) => {
      const dist = clamp01(1 - (y - HORIZON) / 70);
      const band = Math.floor((y - 590) * 0.23 + kit.noise1(x * 0.006, 9) * 3.2) % 3;
      const base = band === 0 ? C.farGreen : band === 1 ? C.field : C.fieldG;
      let c = mixc(base, C.farBlue, dist * 0.6);
      c = mixc(c, C.glow, 0.12 * clamp01(1 - x / 600));
      return jit(c, r, 8);
    },
    angle: () => 0,
    angJit: 0.06,
    len: [16, 52],
    w: [2, 4.5],
    alpha: [0.45, 0.85],
  });
  // distant shelter belts and farms on the horizon
  const belts = [[30, 150], [236, 330], [560, 700], [740, 900], [930, 990]];
  for (const [a, b] of belts) {
    for (let i = 0; i < (b - a) * 1.6; i++) {
      const x = lerp(a, b, rng());
      const u = (x - a) / (b - a);
      const hgt = 8 + 9 * Math.sin(Math.PI * u) * (0.6 + 0.4 * kit.noise1(x * 0.08, 4));
      const y = horizonY(x) + 2 - rng() * hgt;
      const c = mixc(C.farBlue, C.treeCool, 0.45 + 0.25 * rng());
      brush(g, rng, x, y, Math.PI / 2 + (rng() - 0.5) * 0.6, lerp(3, 7, rng()), lerp(2, 4, rng()), jit(c, rng, 6), 0.75);
    }
  }
  // a tiny farm with red roof far left
  g.fillStyle = css(mixc(C.wall, C.farBlue, 0.35));
  g.fillRect(168, HORIZON - 6, 22, 6);
  g.fillStyle = css(mixc(C.tile, C.farBlue, 0.4));
  poly(g, [[166, HORIZON - 6], [192, HORIZON - 6], [186, HORIZON - 12], [172, HORIZON - 12]]);
  g.fill();
}

function paintHedge(g, rng, kit) {
  const top = (x) => 566 - 14 * kit.noise1(x * 0.045, 3) - 8 * kit.noise1(x * 0.12, 7) + 6 * Math.max(0, (x - 620) / 30);
  poly(g, [[440, 618], [444, 586], [652, 584], [654, 618]]);
  g.fillStyle = css(mixc(C.treeDark, C.farBlue, 0.15));
  g.fill();
  const D = (x, y) => (y - top(x)) / 16 - 0.25 + (kit.fbm2(x * 0.07, y * 0.07, 3, 21) - 0.5) * 0.9 - sstep(438, 446, 878 - x) * 0 - (x < 446 ? (446 - x) / 6 : 0) - (x > 650 ? (x - 650) / 6 : 0);
  paintField(g, rng, [436, 530, 660, 620], D, {
    density: 0.9, alpha: [0.6, 0.95], len: [3.5, 8], w: [2.2, 4.5], gk: 3, eps: 3,
    vgrad: (x) => 0.1 * clamp01((520 - x) / 80),
    color: (lit, x, y, r) => jit(mixc(foliageColor(lit, x, y, r), C.farBlue, 0.2), r, 5),
  });
}
function paintSchool(g, rng) {
  // walls
  const wall = [[182, 596], [440, 596], [440, 652], [182, 652]];
  paintPoly(g, rng, wall, C.wall, 900, {
    color: (x, y, r) => jit(mixc(C.wall, C.wallShade, 0.12 + 0.3 * clamp01((x - 182) / 260) + 0.25 * clamp01((y - 596) / 50) * 0.5), r, 6),
    angle: () => Math.PI / 2,
    len: [5, 14],
    w: [2, 4],
    alpha: [0.35, 0.7],
  });
  // thatched roof (half-hipped long roof)
  const roof = [[170, 600], [452, 600], [416, 548], [206, 548]];
  paintPoly(g, rng, roof, C.thatch, 1800, {
    color: (x, y, r) => {
      const leftHip = clamp01((240 - x) / 60 + (y - 548) / 200);
      const rightHip = clamp01((x - 400) / 50);
      let c = mixc(C.thatch, C.thatchLit, 0.25 + 0.55 * leftHip);
      c = mixc(c, C.thatchShade, 0.5 * rightHip + 0.15 * clamp01((y - 580) / 20));
      if (r() < 0.06) c = mixc(c, C.moss, 0.6);
      return jit(c, r, 9);
    },
    angle: (x) => Math.PI / 2 + (x < 220 ? -0.55 : x > 405 ? 0.55 : (x - 311) * 0.0008),
    angJit: 0.2,
    len: [6, 16],
    w: [1.5, 3.5],
    alpha: [0.45, 0.85],
  });
  // thick rounded eaves edge
  g.strokeStyle = css(C.thatchShade, 0.85);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(171, 600);
  g.lineTo(451, 600);
  g.stroke();
  g.strokeStyle = css(C.thatchLit, 0.5);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(171, 597);
  g.lineTo(380, 597);
  g.stroke();
}

function paintSchoolDetails(g) {
  // shadow under the eaves
  const sh = g.createLinearGradient(0, 596, 0, 612);
  sh.addColorStop(0, 'rgba(70,72,88,0.45)');
  sh.addColorStop(1, 'rgba(70,72,88,0)');
  g.fillStyle = sh;
  g.fillRect(182, 596, 258, 16);
  // tarred plinth
  g.fillStyle = css(C.tar, 0.9);
  g.fillRect(182, 642, 258, 10);
  // windows
  for (const [x, y, w, h] of SCHOOL_WIN) {
    g.fillStyle = css(mixc(C.wall, [255, 255, 255], 0.3));
    g.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    const pane = g.createLinearGradient(x, y, x + w, y + h);
    pane.addColorStop(0, css(mixc(C.skyMid, C.treeCool, 0.55)));
    pane.addColorStop(1, css(mixc(C.treeCool, C.tar, 0.4)));
    g.fillStyle = pane;
    g.fillRect(x, y, w, h);
    g.strokeStyle = css(C.wall, 0.95);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    g.stroke();
    g.fillStyle = 'rgba(255,246,225,0.35)';
    g.fillRect(x + 1, y + 1, 3, h / 2 - 2);
  }
  // door (green, Danish)
  g.fillStyle = css(hx('#4d6a55'));
  g.fillRect(296, 606, 20, 38);
  g.fillStyle = css(hx('#7d9a7f'), 0.6);
  g.fillRect(296, 606, 4, 38);
  g.fillStyle = css(C.wall);
  g.fillRect(294, 603, 24, 3);
  // ridge with crossed ridge-sticks (kragtræer)
  g.fillStyle = css(mixc(C.thatchShade, C.tar, 0.4));
  g.fillRect(206, 544, 210, 6);
  g.strokeStyle = css(C.timberDark, 0.85);
  g.lineWidth = 1.5;
  g.lineWidth = 1.1;
  for (let x = 214; x < 412; x += 11) {
    g.beginPath();
    g.moveTo(x - 2, 548);
    g.lineTo(x + 2, 540);
    g.moveTo(x + 2, 548);
    g.lineTo(x - 2, 540);
    g.stroke();
  }
  // whitewashed chimneys
  for (const cx of [262, 364]) {
    g.fillStyle = css(C.wall);
    g.fillRect(cx - 6, 528, 12, 20);
    g.fillStyle = css(C.wallShade, 0.8);
    g.fillRect(cx + 2, 528, 4, 20);
    g.fillStyle = css(C.tar, 0.85);
    g.fillRect(cx - 7, 526, 14, 3);
  }
  // two students by the door (staffage)
  figureSmall(g, 330, 650, 26, C.jacket, hx('#5a4a3a'), true);
  figureSmall(g, 343, 650, 25, hx('#5b4636'), hx('#3e3a36'), false);
}

/** tiny staffage figure (feet at x,y, height h) */
function figureSmall(g, x, y, h, coat, trousers, hat) {
  g.fillStyle = css(trousers);
  g.fillRect(x - 2.5, y - h * 0.42, 2.2, h * 0.42);
  g.fillRect(x + 0.6, y - h * 0.42, 2.2, h * 0.42);
  g.fillStyle = css(coat);
  poly(g, [[x - 4.5, y - h * 0.38], [x + 4.5, y - h * 0.38], [x + 3.5, y - h * 0.78], [x - 3.5, y - h * 0.78]]);
  g.fill();
  g.fillStyle = css(mixc(coat, C.glow, 0.35));
  g.fillRect(x - 4.2, y - h * 0.76, 1.6, h * 0.36);
  g.fillStyle = css(C.skin);
  g.beginPath();
  g.arc(x, y - h * 0.86, h * 0.09, 0, TAU);
  g.fill();
  if (hat) {
    g.fillStyle = css(C.tar);
    g.fillRect(x - 3, y - h * 0.97, 6, h * 0.07);
  }
}

function paintBigTree(g, rng, kit) {
  // trunk + limbs (beech)
  const bark = hx('#8b867a');
  const trunk = [[84, 664], [118, 664], [114, 600], [120, 470], [106, 470], [96, 600]];
  paintPoly(g, rng, trunk, bark, 300, {
    color: (x, y, r) => jit(mixc(hx('#cfc4aa'), hx('#4c4840'), clamp01((x - 90) / 26)), r, 8),
    angle: () => Math.PI / 2,
    len: [6, 16],
    w: [2, 4],
    alpha: [0.5, 0.9],
  });
  g.strokeStyle = css(hx('#58534a'));
  g.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [
    [114, 480, 66, 384, 7], [114, 486, 178, 376, 8], [110, 470, 130, 330, 7], [118, 520, 210, 446, 5], [100, 520, 44, 470, 4],
  ]) {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + 8, (y0 + y1) / 2 + 6, x1, y1);
    g.stroke();
  }
  const blobs = [
    [118, 266, 62, 52], [184, 252, 56, 46], [66, 324, 52], [156, 330, 70, 58], [230, 312, 50], [100, 408, 64, 52],
    [194, 410, 60, 50], [254, 386, 36], [60, 466, 46, 38], [146, 474, 56, 40], [222, 466, 42, 36], [130, 206, 40],
    [200, 200, 32], [264, 434, 28], [42, 384, 38],
  ];
  const D = (x, y) => blobField(kit, x, y, blobs, 0.034, 1.0, 13);
  paintField(g, rng, [20, 150, 300, 520], D, {
    density: 0.42, alpha: [0.7, 0.98], len: [4, 10], w: [2.8, 5.4], gk: 3.2, eps: 5, soft: 0.1,
    vgrad: (x, y) => 0.12 * clamp01((150 - x) / 120) - 0.12 * clamp01((y - 420) / 100),
    color: (lit, x, y, r) => foliageColor(lit, x, y, r),
  });
  // the trunk shows again below the crown
  paintPoly(g, rng, [[96, 664], [118, 664], [116, 540], [104, 540]], bark, 90, {
    color: (x, y, r) => jit(mixc(hx('#d2c7ad'), hx('#4c4840'), clamp01((x - 96) / 22)), r, 8),
    angle: () => Math.PI / 2,
    len: [6, 14],
    w: [2, 3.5],
    alpha: [0.5, 0.9],
  });
}
function paintTower(g, rng) {
  const levels = [0, 0.18, GAL_U, 0.53, 0.7, 0.85, 1];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const nX = (a[0] + b[0]) / 2;
    const nZ = (a[1] + b[1]) / 2;
    const wx = nX * CYAW + nZ * SYAW;
    const wz = -nX * SYAW + nZ * CYAW;
    faces.push({ a, b, wx, wz });
  }
  faces.sort((p, q) => p.wz - q.wz);
  const timberCol = (f) => {
    const lit = clamp01(-f.wx * 0.9 + f.wz * 0.35);
    let c = mixc(C.timber, C.timberLit, lit);
    if (f.wz < 0) c = mixc(c, C.timberDark, 0.55);
    return c;
  };
  const line = (p, q, w, col, a = 1) => {
    g.strokeStyle = css(col, a);
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(q.x, q.y);
    g.stroke();
  };
  g.lineCap = 'butt';
  const drawFace = (f) => {
    const col = timberCol(f);
    const back = f.wz < 0;
    for (let k = 0; k < levels.length - 1; k++) {
      const u0 = levels[k];
      const u1 = levels[k + 1];
      const A0 = tp(u0, f.a[0], f.a[1]);
      const B0 = tp(u0, f.b[0], f.b[1]);
      const A1 = tp(u1, f.a[0], f.a[1]);
      const B1 = tp(u1, f.b[0], f.b[1]);
      const w = back ? 1.6 : 2.4 - u0 * 0.8;
      line(A0, B1, w, col, back ? 0.8 : 1);
      line(B0, A1, w, col, back ? 0.8 : 1);
      line(A1, B1, w + 0.6, col, back ? 0.85 : 1);
      if (!back) {
        // sunlit edge on the braces
        g.lineWidth = 0.7;
        g.strokeStyle = css(mixc(col, C.glow, 0.5), 0.5);
        g.beginPath();
        g.moveTo(A0.x - 0.8, A0.y - 0.8);
        g.lineTo(B1.x - 0.8, B1.y - 0.8);
        g.stroke();
      }
    }
  };
  for (const f of faces) if (f.wz < 0) drawFace(f);
  // legs (tapered)
  const legs = corners
    .map((c) => ({ c, z: tp(0, c[0], c[1]).z }))
    .sort((p, q) => p.z - q.z);
  for (const { c, z } of legs) {
    const p0 = tp(0, c[0], c[1]);
    const p1 = tp(1, c[0], c[1]);
    const wx = c[0] * CYAW + c[1] * SYAW;
    const lit = clamp01(-wx * 0.6 + 0.3);
    let col = mixc(C.timber, C.timberLit, lit);
    if (z < 0) col = mixc(col, C.timberDark, 0.5);
    const w0 = z < 0 ? 4.5 : 6.5;
    const w1 = z < 0 ? 3 : 4;
    poly(g, [[p0.x - w0 / 2, p0.y], [p0.x + w0 / 2, p0.y], [p1.x + w1 / 2, p1.y], [p1.x - w1 / 2, p1.y]]);
    g.fillStyle = css(col);
    g.fill();
    if (z > 0) {
      // shaded right side of the post + sunlit left edge, painted
      g.strokeStyle = css(mixc(col, C.timberDark, 0.55), 0.7);
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(p0.x + w0 / 2 - 0.8, p0.y);
      g.lineTo(p1.x + w1 / 2 - 0.8, p1.y);
      g.stroke();
      g.strokeStyle = css(mixc(col, C.glow, 0.6), 0.75);
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(p0.x - w0 / 2 + 0.7, p0.y);
      g.lineTo(p1.x - w1 / 2 + 0.6, p1.y);
      g.stroke();
    }
    if (z < 0) continue;
  }
  for (const f of faces) if (f.wz >= 0) drawFace(f);
  // vertical spindle down the middle (to the dynamo)
  const s0 = tp(0, 0, 0);
  const s1 = tp(1, 0, 0);
  g.strokeStyle = css(C.iron, 0.75);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(s0.x, s0.y);
  g.lineTo(s1.x, s1.y);
  g.stroke();

  // gallery: underside planks + back railing (front railing is drawn per frame)
  // corners in screen: (-1,-1) left, (-1,1) front, (1,1) right, (1,-1) back
  const Lc = galPt(-1, -1);
  const Fc = galPt(-1, 1);
  const Rc = galPt(1, 1);
  const Bc = galPt(1, -1);
  // posts + rails on the two back edges
  const railBack = (p, q) => {
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      const x = lerp(p.x, q.x, u);
      const y = lerp(p.y, q.y, u);
      line({ x, y }, { x, y: y - 16 }, 1.4, mixc(C.timberDark, C.timber, 0.3), 0.9);
    }
    line({ x: p.x, y: p.y - 16 }, { x: q.x, y: q.y - 16 }, 1.6, mixc(C.timberDark, C.timber, 0.35), 0.9);
    line({ x: p.x, y: p.y - 8 }, { x: q.x, y: q.y - 8 }, 1.0, mixc(C.timberDark, C.timber, 0.3), 0.7);
  };
  railBack(Lc, Bc);
  railBack(Bc, Rc);
  // floor underside
  poly(g, [[Lc.x, Lc.y], [Fc.x, Fc.y], [Rc.x, Rc.y], [Bc.x, Bc.y]]);
  g.fillStyle = css(mixc(C.timberDark, C.timber, 0.25));
  g.fill();
  // planks seen from below
  g.strokeStyle = css(C.timberDark, 0.6);
  g.lineWidth = 0.8;
  for (let k = 1; k < 8; k++) {
    const u = k / 8;
    g.beginPath();
    g.moveTo(lerp(Lc.x, Fc.x, u), lerp(Lc.y, Fc.y, u));
    g.lineTo(lerp(Bc.x, Rc.x, u), lerp(Bc.y, Rc.y, u));
    g.stroke();
  }
  // sunlit front fascia
  g.strokeStyle = css(mixc(C.timberLit, C.glow, 0.3));
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(Lc.x, Lc.y);
  g.lineTo(Fc.x, Fc.y);
  g.stroke();
  g.strokeStyle = css(C.timber);
  g.beginPath();
  g.moveTo(Fc.x, Fc.y);
  g.lineTo(Rc.x, Rc.y);
  g.stroke();
  // knee braces under the gallery
  for (const c of [[-1, 1], [1, 1], [-1, -1]]) {
    const top = galPt(c[0] * 0.95, c[1] * 0.95);
    const low = tp(GAL_U - 0.07, c[0], c[1]);
    line(top, low, 1.6, C.timberDark, 0.85);
  }
}

/** the cap sprite (drawn per frame, in front of the fan-tail) */
function bakeCap(kit) {
  return kit.bake('lacour_cap_v3', 120, 90, (g, rng) => {
    g.translate(-CAP_C.x + 60, -CAP_C.y + 60);
    const Lf = 26;
    const Lr = 19;
    const H = 26;
    const P = (f, r, up) => {
      const p = capPt(f, r, up);
      return [p.x, p.y];
    };
    // left side face (faces the sun: f>0 is front-left)
    const front = [P(Lf, -Lr, 0), P(Lf, Lr, 0), P(Lf, Lr, H), P(Lf, -Lr, H)];
    const sideR = [P(Lf, Lr, 0), P(-Lf, Lr, 0), P(-Lf, Lr, H), P(Lf, Lr, H)];
    // visible: front (towards viewer-left) and right side (r>0 is towards the viewer-right)
    paintPoly(g, rng, sideR, mixc(C.shed, C.shedLit, 0.25), 60, {
      color: (x, y, r) => jit(mixc(C.shed, C.shedLit, 0.25), r, 8), angle: () => Math.PI / 2, len: [4, 8], w: [1.5, 2.5], alpha: [0.4, 0.8],
    });
    paintPoly(g, rng, front, mixc(C.shed, C.shedLit, 0.75), 60, {
      color: (x, y, r) => jit(mixc(C.shedLit, C.glow, 0.25), r, 8), angle: () => Math.PI / 2, len: [4, 8], w: [1.5, 2.5], alpha: [0.4, 0.8],
    });
    // pitched roof, ridge along the shaft
    const roofR = [P(Lf + 3, Lr + 3, H), P(-Lf - 3, Lr + 3, H), P(-Lf - 3, 0, H + 15), P(Lf + 3, 0, H + 15)];
    const gable = [P(Lf + 3, -Lr - 3, H), P(Lf + 3, Lr + 3, H), P(Lf + 3, 0, H + 15)];
    paintPoly(g, rng, roofR, mixc(C.shed, C.timberDark, 0.3), 40, {
      color: (x, y, r) => jit(mixc(C.shed, C.shedLit, 0.2), r, 8), angle: () => 0.3, len: [4, 8], w: [1.5, 2.5], alpha: [0.4, 0.8],
    });
    paintPoly(g, rng, gable, mixc(C.shedLit, C.glow, 0.35), 30, {
      color: (x, y, r) => jit(mixc(C.shedLit, C.glow, 0.4), r, 8), angle: () => Math.PI / 2, len: [3, 6], w: [1.5, 2.5], alpha: [0.4, 0.8],
    });
    g.strokeStyle = css(C.timberDark, 0.8);
    g.lineWidth = 1.2;
    poly(g, roofR);
    g.stroke();
    // shaft bearing collar
    const b = capPt(Lf, 0, 15);
    g.fillStyle = css(C.iron);
    g.beginPath();
    g.ellipse(b.x, b.y, 4.5, 6, 0, 0, TAU);
    g.fill();
  });
}

function paintShed(g, rng) {
  // left gable end (sunlit)
  const gable = [[576, 653], [590, 657], [590, 601], [583, 557], [576, 598]];
  paintPoly(g, rng, gable, mixc(C.shedLit, C.glow, 0.25), 120, {
    color: (x, y, r) => jit(mixc(C.shedLit, C.glow, 0.3), r, 10), angle: () => Math.PI / 2, len: [6, 14], w: [1.5, 3], alpha: [0.5, 0.9],
  });
  // front wall: vertical tarred boards
  const wall = [[590, 601], [794, 601], [794, 657], [590, 657]];
  paintPoly(g, rng, wall, C.shed, 700, {
    color: (x, y, r) => jit(mixc(C.shed, C.shedLit, 0.35 * clamp01((660 - x) / 70) + 0.1), r, 8),
    angle: () => Math.PI / 2,
    angJit: 0.05,
    len: [8, 20],
    w: [1.5, 3.5],
    alpha: [0.4, 0.8],
  });
  // roof
  const roof = [[583, 557], [790, 557], [800, 603], [584, 603]];
  paintPoly(g, rng, roof, mixc(C.shed, C.timberDark, 0.3), 900, {
    color: (x, y, r) => jit(mixc(mixc(C.shed, C.cloudShade, 0.32), C.glow, 0.15 * clamp01((640 - x) / 60)), r, 8),
    angle: () => 0.02,
    len: [10, 26],
    w: [1.5, 3],
    alpha: [0.35, 0.75],
  });
}

function paintShedDetails(g) {
  g.strokeStyle = 'rgba(20,16,12,0.55)';
  g.lineWidth = 1;
  for (let x = 596; x < 794; x += 9) {
    g.beginPath();
    g.moveTo(x, 603);
    g.lineTo(x, 656);
    g.stroke();
  }
  g.strokeStyle = css(mixc(C.cloudLit, C.glow, 0.4), 0.55);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(584, 557);
  g.lineTo(790, 557);
  g.stroke();
  // eave shadow
  g.fillStyle = 'rgba(15,12,10,0.45)';
  g.fillRect(590, 601, 204, 5);
  // small window reflecting the sky
  const wx = 612;
  const wy = 614;
  g.fillStyle = css(mixc(C.wall, C.shedLit, 0.4));
  g.fillRect(wx - 2, wy - 2, 30, 24);
  const pane = g.createLinearGradient(wx, wy, wx + 26, wy + 20);
  pane.addColorStop(0, css(C.skyMid));
  pane.addColorStop(1, css(mixc(C.skyTop, C.shed, 0.5)));
  g.fillStyle = pane;
  g.fillRect(wx, wy, 26, 20);
  g.strokeStyle = css(mixc(C.wall, C.shedLit, 0.4));
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(wx + 13, wy);
  g.lineTo(wx + 13, wy + 20);
  g.moveTo(wx, wy + 10);
  g.lineTo(wx + 26, wy + 10);
  g.stroke();
  // open door: the DC dynamo inside, belt from the spindle
  const dx = 676;
  g.fillStyle = css(hx('#17130f'));
  g.fillRect(dx, 612, 30, 45);
  const glow = g.createRadialGradient(dx + 16, 645, 2, dx + 16, 645, 22);
  glow.addColorStop(0, 'rgba(160,110,60,0.35)');
  glow.addColorStop(1, 'rgba(160,110,60,0)');
  g.fillStyle = glow;
  g.fillRect(dx, 612, 30, 45);
  g.fillStyle = css(hx('#3b3a34'));
  g.beginPath();
  g.ellipse(dx + 16, 646, 9, 8, 0, 0, TAU);
  g.fill();
  g.strokeStyle = css(hx('#b5713a'), 0.9);
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(dx + 16, 646, 6, -2.4, 0.5);
  g.stroke();
  g.strokeStyle = css(hx('#8a7a60'), 0.6);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(dx + 12, 640);
  g.lineTo(dx + 14, 614);
  g.moveTo(dx + 20, 640);
  g.lineTo(dx + 18, 614);
  g.stroke();
  // door leaves (open outward)
  g.fillStyle = css(mixc(C.shed, C.shedLit, 0.5));
  poly(g, [[dx - 12, 610], [dx, 612], [dx, 657], [dx - 12, 659]]);
  g.fill();
  g.fillStyle = css(C.shed);
  poly(g, [[dx + 30, 612], [dx + 40, 610], [dx + 40, 659], [dx + 30, 657]]);
  g.fill();

}

function paintLadder(g) {
  // ladder from the ground up to the gallery
  const l0 = { x: 566, y: 660 };
  const l1 = galPt(-1, -0.2);
  const ang = Math.atan2(l1.y - l0.y, l1.x - l0.x);
  const nx = -Math.sin(ang) * 5;
  const ny = Math.cos(ang) * 5;
  g.strokeStyle = css(mixc(C.timber, C.glow, 0.25));
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(l0.x + nx, l0.y + ny);
  g.lineTo(l1.x + nx, l1.y + ny);
  g.moveTo(l0.x - nx, l0.y - ny);
  g.lineTo(l1.x - nx, l1.y - ny);
  g.stroke();
  g.lineWidth = 1.2;
  const len = Math.hypot(l1.x - l0.x, l1.y - l0.y);
  for (let d = 8; d < len; d += 9) {
    const u = d / len;
    const x = lerp(l0.x, l1.x, u);
    const y = lerp(l0.y, l1.y, u);
    g.beginPath();
    g.moveTo(x + nx, y + ny);
    g.lineTo(x - nx, y - ny);
    g.stroke();
  }
}

function paintLabHouse(g, rng) {
  // background trees behind the house
  paintPuffs(g, rng, [[905, 560, 30], [948, 552, 28], [870, 572, 20], [975, 570, 24]], {
    density: 0.8, alpha: [0.6, 0.95], len: [4, 9], w: [2.5, 5],
    color: (lit, x, y, r) => jit(mixc(lit > 0.5 ? C.treeLit : C.treeMid, C.farBlue, 0.25), r, 8),
  });
  // gable end (faces left, sunlit)
  const gable = [[796, 655], [808, 657], [808, 602], [802, 566], [796, 600]];
  paintPoly(g, rng, gable, mixc(C.ochreWall, C.glow, 0.3), 120, {
    color: (x, y, r) => jit(mixc(C.ochreWall, C.glow, 0.35), r, 8), angle: () => Math.PI / 2, len: [5, 12], w: [1.5, 3], alpha: [0.5, 0.9],
  });
  const wall = [[808, 602], [966, 602], [966, 658], [808, 658]];
  paintPoly(g, rng, wall, C.ochreWall, 700, {
    color: (x, y, r) => jit(mixc(C.ochreWall, C.ochreShade, 0.15 + 0.35 * clamp01((x - 808) / 160)), r, 8),
    angle: () => Math.PI / 2,
    len: [5, 14],
    w: [2, 4],
    alpha: [0.35, 0.75],
  });
  g.fillStyle = 'rgba(80,60,40,0.35)';
  g.fillRect(808, 602, 158, 7);
  g.fillStyle = css(C.tar, 0.85);
  g.fillRect(808, 650, 158, 8);
  // windows with glass jars glinting inside
  for (const x of [826, 868, 910]) {
    g.fillStyle = css(mixc(C.wall, C.ochreWall, 0.2));
    g.fillRect(x - 2, 612, 22, 32);
    g.fillStyle = css(hx('#3e3c36'));
    g.fillRect(x, 614, 18, 28);
    g.fillStyle = 'rgba(190,215,205,0.45)';
    for (let k = 0; k < 3; k++) g.fillRect(x + 2 + k * 5.5, 630, 3.5, 10);
    g.fillStyle = 'rgba(255,250,230,0.5)';
    g.fillRect(x + 2, 616, 2, 12);
    g.strokeStyle = css(C.wall, 0.9);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x + 9, 614);
    g.lineTo(x + 9, 642);
    g.moveTo(x, 628);
    g.lineTo(x + 18, 628);
    g.stroke();
  }
  // tiled roof
  const roof = [[802, 566], [956, 566], [972, 604], [796, 604]];
  paintPoly(g, rng, roof, C.tile, 900, {
    color: (x, y, r) => jit(mixc(mixc(C.tile, C.tileShade, 0.2 + 0.3 * clamp01((x - 800) / 170)), C.glow, 0.12), r, 10),
    angle: () => 0,
    angJit: 0.1,
    len: [5, 12],
    w: [2, 3.5],
    alpha: [0.45, 0.85],
  });
  g.strokeStyle = 'rgba(90,40,25,0.45)';
  g.lineWidth = 1;
  for (let y = 571; y < 604; y += 5) {
    const u = (y - 566) / 38;
    g.beginPath();
    g.moveTo(lerp(802, 796, u), y);
    g.lineTo(lerp(956, 972, u), y);
    g.stroke();
  }
  g.fillStyle = css(C.tileShade);
  g.fillRect(802, 563, 154, 4);
  // brick chimney
  g.fillStyle = css(mixc(C.tile, C.tileShade, 0.4));
  g.fillRect(930, 546, 11, 20);
  g.fillStyle = css(C.tar);
  g.fillRect(929, 544, 13, 3);
  // lead gas pipes from the house down into the holders
  g.strokeStyle = css(hx('#6d7270'));
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(818, 640);
  g.lineTo(818, 652);
  g.lineTo(830, 652);
  g.moveTo(958, 638);
  g.lineTo(958, 655);
  g.lineTo(946, 655);
  g.stroke();
  // gas holder tanks: back half of the rims, water, back posts
  for (const h of GH) {
    g.fillStyle = css(hx('#2c3330'));
    g.beginPath();
    g.ellipse(h.cx, h.cy, h.rr, h.rr * 0.22, 0, 0, TAU);
    g.fill();
    g.strokeStyle = css(mixc(C.tile, C.stone, 0.4));
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(h.cx, h.cy, h.rr, h.rr * 0.22, 0, Math.PI, TAU);
    g.stroke();
    g.strokeStyle = css(C.iron, 0.9);
    g.lineWidth = 2;
    for (const s of [-0.62, 0.62]) {
      g.beginPath();
      g.moveTo(h.cx + s * h.rr, h.cy - 4);
      g.lineTo(h.cx + s * h.rr, h.post + 2);
      g.stroke();
    }
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(h.cx, h.post, h.rr * 1.02, h.rr * 0.2, 0, Math.PI, TAU);
    g.stroke();
  }
}

function paintMeadowDikeRoad(g, rng) {
  // meadow behind the road
  const meadow = [[0, 646], [S, 646], [S, 690], [0, 690]];
  paintPoly(g, rng, meadow, C.grass, 1500, {
    color: (x, y, r) => jit(mixc(mixc(C.grass, C.grassLit, 0.35 + 0.3 * clamp01((500 - x) / 500)), C.farBlue, 0.1), r, 10),
    angle: () => -Math.PI / 2,
    angJit: 0.5,
    len: [4, 10],
    w: [1.5, 3],
    alpha: [0.5, 0.9],
  });
  // stone dike (stendige) in front of the school
  for (let row = 0; row < 3; row++) {
    for (let x = 22 + row * 7; x < 560 - row * 10; x += 14 + rng() * 8) {
      const w = 13 + rng() * 11 - row * 2;
      const h = 9 + rng() * 6 - row;
      const y = 680 - row * 10 - h * 0.4 + (rng() - 0.5) * 3;
      const base = mixc(C.stone, rng() < 0.3 ? C.ochreShade : C.stoneDark, rng() * 0.4);
      g.fillStyle = css(mixc(base, C.stoneDark, 0.3));
      g.beginPath();
      g.ellipse(x, y, w / 2, h / 2, (rng() - 0.5) * 0.4, 0, TAU);
      g.fill();
      g.fillStyle = css(mixc(base, C.stoneLit, 0.55), 0.85);
      g.beginPath();
      g.ellipse(x - w * 0.14, y - h * 0.16, w * 0.33, h * 0.3, -0.3, 0, TAU);
      g.fill();
      g.fillStyle = css(mixc(C.stoneLit, C.glow, 0.5), 0.6);
      g.beginPath();
      g.ellipse(x - w * 0.24, y - h * 0.24, w * 0.12, h * 0.1, -0.3, 0, TAU);
      g.fill();
    }
  }
  // grass tufts on and in the dike
  for (let i = 0; i < 700; i++) {
    const x = 22 + rng() * 540;
    const y = 652 + rng() * 34;
    const c = mixc(C.grass, rng() < 0.5 ? C.grassLit : C.grassDark, rng() * 0.6);
    brush(g, rng, x, y, -Math.PI / 2 + (rng() - 0.5) * 0.9, 3 + rng() * 7, 1 + rng() * 1.6, jit(c, rng, 8), 0.75);
  }
  // road
  const road = [[0, 687], [S, 687], [S, 723], [0, 723]];
  paintPoly(g, rng, road, C.road, 2000, {
    color: (x, y, r) => {
      let c = mixc(C.roadShade, C.roadLit, clamp01((y - 684) / 34) * 0.8 + 0.15);
      const rut = Math.exp(-(((y - 694) / 2.5) ** 2)) + Math.exp(-(((y - 712) / 2.8) ** 2));
      c = mixc(c, C.roadShade, rut * 0.55);
      return jit(c, r, 10);
    },
    angle: () => 0,
    angJit: 0.08,
    len: [10, 34],
    w: [1.5, 4],
    alpha: [0.35, 0.75],
  });
  // pebbles + highlights on the rut ridges
  for (let i = 0; i < 260; i++) {
    const x = rng() * S;
    const y = 689 + rng() * 32;
    g.fillStyle = css(rng() < 0.5 ? mixc(C.roadLit, C.glow, 0.4) : C.roadShade, 0.7);
    g.fillRect(x, y, 1.5 + rng() * 2, 1 + rng());
  }
  // grassy verges
  for (let i = 0; i < 1100; i++) {
    const back = rng() < 0.5;
    const x = rng() * S;
    const y = back ? 686 + rng() * 5 : 718 + rng() * 9;
    const c = mixc(C.grass, rng() < 0.5 ? C.grassLit : C.grassDark, rng() * 0.6);
    brush(g, rng, x, y, -Math.PI / 2 + (rng() - 0.5) * 0.9, 3 + rng() * 8, 1 + rng() * 1.5, jit(c, rng, 8), 0.8);
  }
}

function paintForegroundGround(g, rng, kit) {
  const ground = [[0, 722], [S, 722], [S, S], [0, S]];
  paintPoly(g, rng, ground, C.grass, 5200, {
    color: (x, y, r) => {
      const v = clamp01((y - 722) / 260);
      let c = mixc(C.grassLit, C.grass, v * 0.75 + 0.1);
      const straw = kit.fbm2(x * 0.012, y * 0.02, 3, 31);
      c = mixc(c, mixc(C.field, C.thatchLit, 0.3), clamp01((straw - 0.52) * 2.2) * 0.55);
      c = mixc(c, C.glow, 0.14 * clamp01((320 - x) / 320) * (1 - v));
      return jit(c, r, 12);
    },
    angle: () => -Math.PI / 2,
    angJit: 0.9,
    len: [7, 22],
    w: [1.8, 4.5],
    alpha: [0.45, 0.85],
  });
  // sandy footpath winding from the road down past the student
  const L = (u) => [lerp(556, 640, u) + Math.sin(u * 3.0) * 26, lerp(722, S, u)];
  const R = (u) => [lerp(606, 836, u) + Math.sin(u * 3.0) * 30, lerp(722, S, u)];
  const path = [];
  for (let k = 0; k <= 12; k++) path.push(L(k / 12));
  for (let k = 12; k >= 0; k--) path.push(R(k / 12));
  paintPoly(g, rng, path, C.road, 2600, {
    color: (x, y, r) => {
      let c = mixc(C.roadLit, C.road, 0.3 + 0.4 * clamp01((y - 722) / 278));
      c = mixc(c, C.roadShade, 0.3 * Math.exp(-(((x - lerp(600, 720, (y - 722) / 278)) / 10) ** 2)));
      return jit(c, r, 10);
    },
    angle: () => 0.15,
    angJit: 0.25,
    len: [8, 26],
    w: [2, 4.5],
    alpha: [0.4, 0.8],
  });
  // grass encroaching on the path edges
  for (let i = 0; i < 900; i++) {
    const u = rng();
    const side = rng() < 0.5 ? L(u) : R(u);
    const x = side[0] + (rng() - 0.5) * 14;
    const y = side[1] + (rng() - 0.5) * 4;
    const c = mixc(C.grass, rng() < 0.5 ? C.grassLit : C.grassDark, rng() * 0.6);
    brush(g, rng, x, y, -Math.PI / 2 + (rng() - 0.5) * 0.9, 4 + rng() * 9 * (0.5 + u), 1.2 + rng() * 1.8, jit(c, rng, 8), 0.8);
  }
  // long cool shadow of trees outside the picture across the bottom
  g.save();
  const sg = g.createLinearGradient(0, 880, 0, 990);
  sg.addColorStop(0, 'rgba(36,52,48,0)');
  sg.addColorStop(0.3, 'rgba(36,52,48,0.4)');
  sg.addColorStop(1, 'rgba(28,38,40,0.62)');
  g.fillStyle = sg;
  g.beginPath();
  g.moveTo(0, 900);
  for (let x = 0; x <= S; x += 25) g.lineTo(x, 915 + 18 * Math.sin(x * 0.012) + 10 * kit.noise1(x * 0.05, 4) + x * 0.03);
  g.lineTo(S, S);
  g.lineTo(0, S);
  g.closePath();
  g.fill();
  const lg = g.createLinearGradient(0, 0, 90, 0);
  lg.addColorStop(0, 'rgba(30,40,36,0.35)');
  lg.addColorStop(1, 'rgba(30,40,36,0)');
  g.fillStyle = lg;
  g.fillRect(0, 722, 90, 278);
  g.restore();
}

function paintDockLeaves(g, rng) {
  // broad dock leaves in the shaded corners (Golden Age foreground botany)
  const leaf = (x, y, len, ang, wid, lit) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const tx = x + ca * len;
    const ty = y + sa * len;
    const nx = -sa * wid;
    const ny = ca * wid;
    const base = lit ? mixc(C.grass, C.grassLit, 0.35) : mixc(C.grassDark, C.grass, 0.45);
    g.fillStyle = css(jit(base, rng, 8));
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + ca * len * 0.15 + nx * 1.1, y + sa * len * 0.15 + ny * 1.1, x + ca * len * 0.75 + nx * 0.8, y + sa * len * 0.75 + ny * 0.8, tx, ty);
    g.bezierCurveTo(x + ca * len * 0.75 - nx * 0.8, y + sa * len * 0.75 - ny * 0.8, x + ca * len * 0.15 - nx * 1.1, y + sa * len * 0.15 - ny * 1.1, x, y);
    g.fill();
    // sunlit half + midrib + veins
    g.fillStyle = css(mixc(base, C.grassLit, 0.5), 0.6);
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + ca * len * 0.15 - nx * 1.1, y + sa * len * 0.15 - ny * 1.1, x + ca * len * 0.75 - nx * 0.8, y + sa * len * 0.75 - ny * 0.8, tx, ty);
    g.closePath();
    g.fill();
    g.strokeStyle = css(mixc(base, C.glow, 0.45), 0.55);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + ca * len * 0.92, y + sa * len * 0.92);
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      const mx = x + ca * len * u;
      const my = y + sa * len * u;
      g.moveTo(mx, my);
      g.lineTo(mx + ca * len * 0.12 + nx * 0.6 * (1 - u * 0.6), my + sa * len * 0.12 + ny * 0.6 * (1 - u * 0.6));
      g.moveTo(mx, my);
      g.lineTo(mx + ca * len * 0.12 - nx * 0.6 * (1 - u * 0.6), my + sa * len * 0.12 - ny * 0.6 * (1 - u * 0.6));
    }
    g.lineWidth = 0.7;
    g.stroke();
  };
  for (const [x, y, n] of [[930, 1004, 6], [40, 1008, 4], [556, 1010, 4]]) {
    for (let k = 0; k < n; k++) {
      const ang = -Math.PI / 2 + (k - (n - 1) / 2) * 0.62 + (rng() - 0.5) * 0.25;
      leaf(x + (rng() - 0.5) * 24, y, 58 + rng() * 34, ang, 17 + rng() * 7, k % 2 === 0);
    }
  }
}

function paintForegroundDetails(g, rng, kit) {
  // wildflowers in drifts (chamomile, buttercups, a few poppies & cornflowers)
  for (let i = 0; i < 150; i++) {
    const drift = Math.floor(rng() * 5);
    const cx = [130, 360, 530, 760, 905][drift];
    const cy = [870, 850, 760, 760, 800][drift];
    const x = cx + (rng() - 0.5) * 120 * (0.4 + rng());
    const y = cy + (rng() - 0.5) * 70 * (0.4 + rng());
    if (y < 730) continue;
    const sz = 1.1 + ((y - 730) / 245) * 2.2;
    const k = rng();
    const shade = y > 905 ? 0.6 : 1;
    if (k < 0.5) {
      g.fillStyle = `rgba(${248 * shade | 0},${244 * shade | 0},${232 * shade | 0},0.85)`;
      g.beginPath();
      g.ellipse(x, y, sz * 1.2, sz * 0.8, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(214,170,60,0.9)';
      g.beginPath();
      g.arc(x, y, sz * 0.4, 0, TAU);
      g.fill();
    } else if (k < 0.82) {
      g.fillStyle = 'rgba(232,196,64,0.8)';
      g.beginPath();
      g.arc(x, y, sz * 0.75, 0, TAU);
      g.fill();
    } else if (k < 0.95) {
      g.fillStyle = 'rgba(184,64,44,0.7)';
      g.beginPath();
      g.ellipse(x, y, sz * 1.1, sz * 0.9, 0, 0, TAU);
      g.fill();
    } else {
      g.fillStyle = 'rgba(104,124,170,0.6)';
      g.beginPath();
      g.arc(x, y, sz * 0.8, 0, TAU);
      g.fill();
    }
  }
  // cow parsley umbels on the right
  for (let k = 0; k < 4; k++) {
    const x = 872 + k * 26 + (rng() - 0.5) * 8;
    const top = 818 + rng() * 40;
    g.strokeStyle = css(mixc(C.grass, C.grassDark, 0.4));
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x + 4, 990);
    g.quadraticCurveTo(x + 6, (990 + top) / 2, x, top);
    g.stroke();
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI + (j / 6) * Math.PI;
      const ex = x + Math.cos(a) * 12;
      const ey = top - 4 + Math.sin(a) * 6;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(ex, ey);
      g.stroke();
      g.fillStyle = 'rgba(244,240,226,0.9)';
      for (let q = 0; q < 5; q++) {
        g.beginPath();
        g.arc(ex + (rng() - 0.5) * 6, ey + (rng() - 0.5) * 3, 1.3, 0, TAU);
        g.fill();
      }
    }
  }
}
/**
 * Painterly re-rendering of a baked layer (Hertzmann-style): sample the colour under
 * each stroke, lay it along the local edge direction (or a default flow), coarse strokes
 * on flat areas, fine strokes on the edges.
 */
function painterlyPass(g, rng, w, h, angleFn, layers) {
  const src = g.getImageData(0, 0, w, h).data;
  const lum = (x, y) => {
    const i = (y * w + x) * 4;
    return src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
  };
  const B = makeBatch();
  for (const ly of layers) {
    const pts = [];
    for (let y = ly.y0 || 0; y < (ly.y1 || h); y += ly.step) {
      for (let x = 0; x < w; x += ly.step) pts.push(x + rng() * ly.step, y + rng() * ly.step);
    }
    const n = pts.length / 2;
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    for (let k = 0; k < n; k++) {
      const o = order[k] * 2;
      const ix = pts[o] | 0;
      const iy = pts[o + 1] | 0;
      if (ix < 3 || iy < 3 || ix >= w - 3 || iy >= h - 3) continue;
      const i = (iy * w + ix) * 4;
      if (src[i + 3] < 200) continue;
      const gx = lum(ix + 2, iy) - lum(ix - 2, iy);
      const gy = lum(ix, iy + 2) - lum(ix, iy - 2);
      const gm = Math.hypot(gx, gy);
      if (ly.maxGrad !== undefined && gm > ly.maxGrad) continue;
      if (ly.minGrad !== undefined && gm < ly.minGrad) continue;
      const ang = gm > 6 ? Math.atan2(gy, gx) + Math.PI / 2 + (rng() - 0.5) * 0.25 : angleFn(ix, iy) + (rng() - 0.5) * (ly.angJit ?? 0.5);
      const j = ly.jit;
      const warm = (rng() - 0.5) * j * 0.5;
      const col = [src[i] + (rng() - 0.5) * j + warm, src[i + 1] + (rng() - 0.5) * j, src[i + 2] + (rng() - 0.5) * j - warm];
      B.brushB(rng, ix + 0.5, iy + 0.5, ang, lerp(ly.len[0], ly.len[1], rng()), lerp(ly.w[0], ly.w[1], rng()), col, lerp(ly.alpha[0], ly.alpha[1], rng()));
    }
    B.flush(g, rng);
  }
}

const SHED_POLY = [[576, 653], [590, 657], [794, 657], [794, 601], [800, 603], [790, 557], [583, 557], [576, 598]];

function getBackground(kit) {
  return kit.bake('lacour_bg_v13', S, S, (g, rng) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // 1. masses
    paintSky(g, rng);
    paintClouds(g, rng, kit);
    paintFarLand(g, rng, kit);
    paintHedge(g, rng, kit);
    paintSchool(g, rng);
    paintBigTree(g, rng, kit);
    g.lineCap = 'round';
    paintShed(g, rng);
    paintLabHouse(g, rng);
    paintMeadowDikeRoad(g, rng);
    paintForegroundGround(g, rng, kit);
    paintDockLeaves(g, rng);
    // 2. the brush goes over everything once more
    g.lineCap = 'round';
    painterlyPass(g, rng, S, S, (x, y) => (y < HORIZON ? -0.06 : y < 728 ? 0 : -Math.PI / 2 + 0.2 * Math.sin(x * 0.05)), [
      { step: 5, len: [8, 17], w: [2.2, 4.4], alpha: [0.45, 0.8], jit: 11, maxGrad: 24, angJit: 0.45 },
      { step: 3, len: [3, 7], w: [1.2, 2.4], alpha: [0.55, 0.85], jit: 8, minGrad: 22 },
    ]);
    // 3. details with a fine brush: the timber trestle (it disappears into the shed roof), ladder, flowers
    g.save();
    g.beginPath();
    g.rect(0, 0, S, S);
    g.moveTo(SHED_POLY[0][0], SHED_POLY[0][1]);
    for (const q of SHED_POLY) g.lineTo(q[0], q[1]);
    g.closePath();
    g.clip('evenodd');
    g.lineCap = 'round';
    paintTower(g, rng);
    g.restore();
    g.lineCap = 'round';
    paintSchoolDetails(g);
    paintShedDetails(g);
    paintLadder(g);
    paintForegroundDetails(g, rng, kit);
  });
}

// -----------------------------------------------------------------------------
// SAIL sprite (one shutter sail pointing up, hub at (HXS, HYS))
// -----------------------------------------------------------------------------
const HXS = 16;
const HYS = 184;
function bakeSail(kit) {
  return kit.bake('lacour_sail_v2', 64, 190, (g, rng) => {
    const r0 = 36;
    const r1 = SAIL_R;
    const W = 34;
    const y = (r) => HYS - r;
    // shutters in bays: two columns per bay
    const bays = 14;
    const bh = (r1 - r0) / bays;
    for (let b = 0; b < bays; b++) {
      const yb = y(r0 + b * bh);
      for (let col = 0; col < 2; col++) {
        const x0 = HXS + 4 + col * (W / 2);
        const w = W / 2 - 1.6;
        const h = bh - 1.8;
        const top = yb - bh + 0.9;
        const lit = mixc(C.shutter, C.glow, 0.15 + 0.1 * rng());
        g.fillStyle = css(jit(lit, rng, 6));
        g.fillRect(x0, top, w, h * 0.62);
        g.fillStyle = css(jit(C.shutterShade, rng, 6));
        g.fillRect(x0, top + h * 0.62, w, h * 0.38);
        // painted texture
        for (let k = 0; k < 3; k++) {
          brush(g, rng, x0 + rng() * w, top + rng() * h * 0.6, 0, 3 + rng() * 5, 1 + rng(), jit(mixc(C.shutter, C.cloudShade, rng() * 0.4), rng, 6), 0.5);
        }
      }
      // sail bar
      g.fillStyle = css(mixc(C.timber, C.timberDark, 0.3));
      g.fillRect(HXS + 2, yb - 1, W + 4, 1.8);
    }
    // longitudinal rails (hemlath at the trailing edge, middle rail)
    g.fillStyle = css(mixc(C.timber, C.timberLit, 0.3));
    g.fillRect(HXS + W + 3.5, y(r1) - 2, 2.6, r1 - r0 + 2);
    g.fillStyle = css(mixc(C.timber, C.timberDark, 0.2));
    g.fillRect(HXS + 3 + W / 2, y(r1), 1.4, r1 - r0);
    // leading board
    g.fillStyle = css(mixc(C.shutterShade, C.timber, 0.4));
    g.fillRect(HXS - 9, y(r1) + 2, 5, r1 - r0 - 4);
    g.fillStyle = css(mixc(C.shutter, C.glow, 0.2), 0.6);
    g.fillRect(HXS - 9, y(r1) + 2, 1.5, r1 - r0 - 4);
    // stock (whip), tapered
    poly(g, [[HXS - 3.8, HYS + 4], [HXS + 3.8, HYS + 4], [HXS + 2.2, y(r1 + 4)], [HXS - 2.2, y(r1 + 4)]]);
    g.fillStyle = css(mixc(C.timber, C.timberDark, 0.15));
    g.fill();
    g.fillStyle = css(mixc(C.timberLit, C.glow, 0.3), 0.7);
    poly(g, [[HXS - 3.8, HYS + 4], [HXS - 1.6, HYS + 4], [HXS - 1.2, y(r1 + 4)], [HXS - 2.2, y(r1 + 4)]]);
    g.fill();
    // short stays from the stock to the lattice
    g.strokeStyle = css(C.timberDark, 0.6);
    g.lineWidth = 1;
    for (let r = r0 + 14; r < r1; r += 34) {
      g.beginPath();
      g.moveTo(HXS, y(r));
      g.lineTo(HXS + W + 4, y(r + 10));
      g.stroke();
    }
  });
}

// -----------------------------------------------------------------------------
// FOREGROUND still life (table, wind tunnel, jar, lamp, notebook, student) — baked
// -----------------------------------------------------------------------------
function paintStudentBody(g, rng) {
  // stool
  g.strokeStyle = css(C.dealDark);
  g.lineWidth = 4;
  g.lineCap = 'round';
  for (const [x0, x1] of [[486, 479], [522, 531]]) {
    g.beginPath();
    g.moveTo(x0, 850);
    g.lineTo(x1, 938);
    g.stroke();
  }
  g.strokeStyle = css(mixc(C.dealDark, C.tar, 0.4));
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(504, 852);
  g.lineTo(506, 930);
  g.stroke();
  g.fillStyle = css(C.deal);
  g.beginPath();
  g.ellipse(504, 846, 27, 5.5, 0, 0, TAU);
  g.fill();
  g.fillStyle = css(C.dealLit, 0.7);
  g.beginPath();
  g.ellipse(498, 845, 18, 2.5, 0, 0, TAU);
  g.fill();
  // trousers: thigh + shin + boot (near leg)
  const trou = hx('#5c5246');
  const trouLit = hx('#8e826e');
  paintPoly(g, rng, [[514, 830], [520, 848], [466, 852], [452, 846], [452, 830], [470, 826]], trou, 120, {
    color: (x, y, r) => jit(mixc(trou, trouLit, clamp01((846 - y) / 20) * 0.6), r, 8), angle: () => 0, len: [6, 14], w: [2, 4], alpha: [0.5, 0.9],
  });
  paintPoly(g, rng, [[452, 838], [470, 842], [462, 920], [448, 920]], trou, 100, {
    color: (x, y, r) => jit(mixc(trou, trouLit, clamp01((458 - x) / 12) * 0.7), r, 8), angle: () => Math.PI / 2, len: [6, 14], w: [2, 4], alpha: [0.5, 0.9],
  });
  // boot
  g.fillStyle = css(hx('#231e1a'));
  poly(g, [[447, 916], [464, 916], [466, 934], [430, 936], [430, 930], [446, 926]]);
  g.fill();
  g.fillStyle = 'rgba(200,180,150,0.35)';
  g.fillRect(432, 929, 16, 1.6);
  // torso: jacket leaning forward, lit from the front-left
  const torso = [[522, 842], [490, 848], [476, 800], [474, 768], [482, 744], [494, 734], [508, 738], [520, 772], [526, 812]];
  paintPoly(g, rng, torso, C.jacket, 420, {
    color: (x, y, r) => jit(mixc(C.jacket, C.jacketLit, clamp01((492 - x) / 20) * 0.9 + 0.05), r, 8),
    angle: (x, y) => Math.PI / 2 - 0.25,
    len: [6, 16],
    w: [2, 4.5],
    alpha: [0.5, 0.9],
  });
  // buttons + lapel
  g.fillStyle = css(hx('#1b1d22'));
  for (const y of [776, 796, 816]) {
    g.beginPath();
    g.arc(480 + (y - 776) * 0.12, y, 1.4, 0, TAU);
    g.fill();
  }
  g.strokeStyle = css(hx('#22252c'), 0.8);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(490, 738);
  g.lineTo(482, 772);
  g.stroke();
  // shirt collar + neck
  g.fillStyle = css(C.skin);
  poly(g, [[480, 724], [494, 724], [494, 738], [482, 740]]);
  g.fill();
  g.fillStyle = css(hx('#f2ede0'));
  poly(g, [[479, 735], [496, 732], [497, 740], [480, 744]]);
  g.fill();
  // head (profile, facing left)
  const [hx0, hy0] = STU.head;
  g.fillStyle = css(C.skin);
  g.beginPath();
  g.ellipse(hx0 + 1, hy0, 12.5, 15, 0, 0, TAU);
  g.fill();
  // face profile: brow, nose, lips, chin
  poly(g, [[471, 703], [467, 709], [470, 712], [464, 719], [469, 721], [468, 724], [471, 726], [473, 731], [482, 731]]);
  g.fill();
  // light on the face (towards the low sun on the left)
  g.fillStyle = css(C.skinLit, 0.75);
  g.beginPath();
  g.ellipse(473, 713, 5, 9, 0.2, 0, TAU);
  g.fill();
  // shadow at the back of the head/jaw
  g.fillStyle = 'rgba(120,70,50,0.35)';
  g.beginPath();
  g.ellipse(489, 722, 6, 9, 0, 0, TAU);
  g.fill();
  // hair
  g.fillStyle = css(C.hair);
  poly(g, [[478, 702], [494, 701], [497, 714], [493, 726], [488, 716], [484, 706]]);
  g.fill();
  for (let i = 0; i < 18; i++) {
    brush(g, rng, 486 + rng() * 10, 704 + rng() * 18, Math.PI / 2 + 0.3, 3 + rng() * 5, 1, jit(mixc(C.hair, C.glow, rng() * 0.5), rng, 8), 0.6);
  }
  // ear
  g.fillStyle = css(mixc(C.skin, hx('#b0705a'), 0.3));
  g.beginPath();
  g.ellipse(486, 716, 3, 4.5, 0, 0, TAU);
  g.fill();
  // eye + brow
  g.fillStyle = css(hx('#2a1f1a'));
  g.beginPath();
  g.arc(472.5, 712, 1.2, 0, TAU);
  g.fill();
  g.strokeStyle = css(hx('#8a6a40'), 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(469, 708.5);
  g.lineTo(476, 708);
  g.stroke();
}

function paintTable(g, rng) {
  // cast shadow on the grass (sun low on the left)
  g.fillStyle = 'rgba(30,45,30,0.32)';
  poly(g, [[70, 938], [462, 938], [612, 956], [205, 966]]);
  g.fill();
  g.fillStyle = 'rgba(30,45,30,0.25)';
  poly(g, [[478, 937], [534, 937], [598, 948], [520, 952]]);
  g.fill();
  // back legs
  g.fillStyle = css(mixc(C.dealDark, C.tar, 0.4));
  g.fillRect(92, 822, 8, 104);
  g.fillRect(432, 822, 8, 104);
  // stretcher
  g.fillRect(96, 896, 340, 5);
  // front legs
  for (const x of [64, 444]) {
    paintPoly(g, rng, [[x, 822], [x + 12, 822], [x + 11, 940], [x + 1, 940]], C.dealDark, 40, {
      color: (xx, y, r) => jit(mixc(C.dealDark, C.dealLit, clamp01((x + 6 - xx) / 6) * 0.7 + 0.1), r, 8),
      angle: () => Math.PI / 2,
      len: [8, 16],
      w: [1.5, 3],
      alpha: [0.5, 0.9],
    });
  }
  // apron
  paintPoly(g, rng, [[56, 811], [464, 811], [464, 826], [56, 826]], mixc(C.deal, C.dealDark, 0.45), 160, {
    color: (x, y, r) => jit(mixc(C.deal, C.dealDark, 0.35 + 0.2 * clamp01(x / 460)), r, 8), angle: () => 0, len: [10, 26], w: [1.5, 3], alpha: [0.5, 0.85],
  });
  // top (scrubbed deal boards)
  paintPoly(g, rng, [[80, 776], [452, 776], [464, 812], [56, 812]], C.deal, 700, {
    color: (x, y, r) => jit(mixc(mixc(C.deal, C.dealLit, 0.5 * clamp01((300 - x) / 300) + 0.2), C.dealDark, 0.12 * clamp01((x - 200) / 260)), r, 8),
    angle: () => 0,
    angJit: 0.05,
    len: [14, 40],
    w: [1.5, 3.5],
    alpha: [0.4, 0.8],
  });
  g.strokeStyle = 'rgba(110,80,50,0.35)';
  g.lineWidth = 0.8;
  for (let k = 1; k < 4; k++) {
    const y = 776 + k * 9;
    const u = (y - 776) / 36;
    g.beginPath();
    g.moveTo(lerp(80, 56, u), y);
    g.lineTo(lerp(452, 464, u), y);
    g.stroke();
  }
  g.strokeStyle = css(mixc(C.dealLit, C.glow, 0.4), 0.8);
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(57, 811.5);
  g.lineTo(463, 811.5);
  g.stroke();
}

function paintTunnel(g, rng) {
  const { fx0, fx1, fy0, fy1, dx, dy } = TUN;
  // little electromotor + belt at the back
  g.fillStyle = css(hx('#3e4a40'));
  g.beginPath();
  g.ellipse(84, 794, 16, 9, 0, 0, TAU);
  g.fill();
  g.fillStyle = css(C.brass);
  g.beginPath();
  g.ellipse(70, 794, 4, 9, 0, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,240,200,0.35)';
  g.fillRect(74, 787, 20, 2);
  // fan drum behind the box
  g.fillStyle = css(mixc(C.dealDark, C.tar, 0.25));
  g.beginPath();
  g.ellipse(fx0 + dx + 6, (fy0 + fy1) / 2 + dy + 2, 10, 38, 0, 0, TAU);
  g.fill();
  // left side face (lit) and top
  const side = [[fx0, fy0], [fx0 + dx, fy0 + dy], [fx0 + dx, fy1 + dy], [fx0, fy1]];
  paintPoly(g, rng, side, mixc(C.deal, C.dealLit, 0.3), 260, {
    color: (x, y, r) => jit(mixc(C.deal, C.dealLit, 0.45), r, 9), angle: () => Math.atan2(dy, dx), angJit: 0.06, len: [10, 28], w: [1.5, 3.5], alpha: [0.45, 0.85],
  });
  g.strokeStyle = 'rgba(110,80,50,0.45)';
  g.lineWidth = 0.9;
  for (let k = 1; k < 5; k++) {
    const y0 = lerp(fy0, fy1, k / 5);
    g.beginPath();
    g.moveTo(fx0, y0);
    g.lineTo(fx0 + dx, y0 + dy);
    g.stroke();
  }
  const top = [[fx0, fy0], [fx1, fy0], [fx1 + dx, fy0 + dy], [fx0 + dx, fy0 + dy]];
  paintPoly(g, rng, top, mixc(C.dealLit, C.glow, 0.3), 120, {
    color: (x, y, r) => jit(mixc(C.dealLit, C.glow, 0.3), r, 8), angle: () => Math.atan2(dy, dx), angJit: 0.05, len: [10, 24], w: [1.5, 3], alpha: [0.45, 0.85],
  });
  // front frame (the mouth)
  const frame = [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]];
  paintPoly(g, rng, frame, mixc(C.deal, C.dealDark, 0.35), 120, {
    color: (x, y, r) => jit(mixc(C.deal, C.dealDark, 0.3), r, 8), angle: () => Math.PI / 2, len: [6, 14], w: [1.5, 3], alpha: [0.45, 0.85],
  });
  // dark interior with the fan glimpsed at the back
  const ix0 = fx0 + 6;
  const iy0 = fy0 + 6;
  const iw = fx1 - fx0 - 12;
  const ih = fy1 - fy0 - 12;
  const ig = g.createLinearGradient(ix0, iy0, ix0 + iw, iy0 + ih);
  ig.addColorStop(0, '#1d1611');
  ig.addColorStop(1, '#3a2a1d');
  g.fillStyle = ig;
  g.fillRect(ix0, iy0, iw, ih);
  g.strokeStyle = 'rgba(150,120,80,0.25)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(ix0, iy0);
  g.lineTo(ix0 + dx * 0.35 + 6, iy0 + dy * 0.35 + 4);
  g.moveTo(ix0, iy0 + ih);
  g.lineTo(ix0 + dx * 0.35 + 6, iy0 + ih + dy * 0.35 - 4);
  g.stroke();
  // model stand (rod to the rotor hub)
  g.strokeStyle = css(C.brass);
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(TUN.rot.x, TUN.rot.y);
  g.lineTo(TUN.rot.x, iy0 + ih);
  g.stroke();
  // brass dial on the side (friction dynamometer)
  g.fillStyle = css(C.brass);
  g.beginPath();
  g.ellipse(124, 752, 9, 10, 0, 0, TAU);
  g.fill();
  g.fillStyle = css(hx('#f2ead6'));
  g.beginPath();
  g.ellipse(124, 752, 6.5, 7.5, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(60,40,20,0.6)';
  g.lineWidth = 0.6;
  for (let k = 0; k < 7; k++) {
    const a = -2.4 + (k / 6) * 1.8;
    g.beginPath();
    g.moveTo(124 + Math.cos(a) * 5, 752 + Math.sin(a) * 6);
    g.lineTo(124 + Math.cos(a) * 6.3, 752 + Math.sin(a) * 7.3);
    g.stroke();
  }
}

function paintJar(g, rng) {
  const { cx, top, bot, rx, ry, water } = JAR;
  // table light pool under the lamp
  const pool = g.createRadialGradient(LAMP.cx, 800, 4, LAMP.cx, 800, 70);
  pool.addColorStop(0, 'rgba(255,214,140,0.28)');
  pool.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = pool;
  g.fillRect(LAMP.cx - 80, 770, 160, 45);
  // jar back wall & water
  g.fillStyle = 'rgba(160,190,180,0.35)';
  g.beginPath();
  g.ellipse(cx, top, rx, ry, 0, Math.PI, TAU);
  g.lineTo(cx + rx, bot);
  g.ellipse(cx, bot, rx, ry, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  const wg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  wg.addColorStop(0, 'rgba(205,228,218,0.55)');
  wg.addColorStop(0.5, 'rgba(160,196,186,0.5)');
  wg.addColorStop(1, 'rgba(110,140,132,0.6)');
  g.fillStyle = wg;
  g.beginPath();
  g.moveTo(cx - rx, water);
  g.lineTo(cx - rx, bot);
  g.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true);
  g.lineTo(cx + rx, water);
  g.ellipse(cx, water, rx, ry, 0, 0, Math.PI, true);
  g.closePath();
  g.fill();
  // water surface
  g.fillStyle = 'rgba(225,240,232,0.55)';
  g.beginPath();
  g.ellipse(cx, water, rx - 1, ry - 1, 0, 0, TAU);
  g.fill();
  // electrodes (lead strips) under each tube + their wires
  for (const t of TUBES) {
    g.fillStyle = css(hx('#55595a'));
    g.fillRect(t.cx - 4, t.mouth + 4, 8, 16);
    g.fillStyle = 'rgba(220,225,225,0.45)';
    g.fillRect(t.cx - 4, t.mouth + 4, 2, 16);
  }
  g.strokeStyle = css(hx('#7a4a2a'));
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(TUBES[0].cx - 2, TUBES[0].mouth + 20);
  g.quadraticCurveTo(cx - rx + 4, bot - 2, cx - rx + 3, top + 4);
  g.quadraticCurveTo(cx - rx - 2, top - 8, cx - rx - 8, top + 6);
  g.lineTo(cx - rx - 10, 800);
  g.moveTo(TUBES[1].cx + 2, TUBES[1].mouth + 20);
  g.quadraticCurveTo(cx + rx - 4, bot - 2, cx + rx - 3, top + 4);
  g.quadraticCurveTo(cx + rx + 2, top - 8, cx + rx + 6, top + 4);
  g.lineTo(cx + rx + 8, 788);
  g.stroke();
  // brass binding posts on the table
  for (const x of [cx - rx - 10, cx + rx + 8]) {
    g.fillStyle = css(C.brass);
    g.fillRect(x - 3, 798 - (x > cx ? 10 : 0), 6, 7);
    g.fillStyle = css(C.brassLit, 0.8);
    g.fillRect(x - 3, 798 - (x > cx ? 10 : 0), 2, 7);
  }
  // cloth cable to the mill: along the table and down the leg
  g.strokeStyle = css(hx('#5a4632'));
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx + rx + 8, 795);
  g.quadraticCurveTo(cx + rx + 30, 808, 330, 809);
  g.moveTo(cx - rx - 10, 805);
  g.quadraticCurveTo(cx - rx - 4, 810, 250, 811);
  g.stroke();
  // wooden bridge across the rim holding the tubes
  g.fillStyle = css(C.dealDark);
  g.fillRect(cx - rx - 3, top - 3, rx * 2 + 6, 5);
  g.fillStyle = css(C.dealLit, 0.6);
  g.fillRect(cx - rx - 3, top - 3, rx * 2 + 6, 1.5);
  // tubes (water-filled; the gas columns are drawn per frame)
  for (const t of TUBES) {
    const x0 = t.cx - t.w / 2;
    g.fillStyle = 'rgba(175,205,195,0.55)';
    g.fillRect(x0, t.top + 6, t.w, t.mouth - t.top - 6);
    g.beginPath();
    g.ellipse(t.cx, t.top + 6, t.w / 2, 6, 0, Math.PI, TAU);
    g.fill();
    // stopcock + nozzle
    g.fillStyle = css(C.brass);
    g.fillRect(t.cx - 2.5, t.top - 8, 5, 9);
    g.fillRect(t.cx - 6, t.top - 4, 12, 3);
    g.fillStyle = css(C.brassLit, 0.8);
    g.fillRect(t.cx - 2.5, t.top - 8, 1.5, 9);
    // graduations
    g.strokeStyle = 'rgba(60,50,40,0.5)';
    g.lineWidth = 0.6;
    for (let y = t.top + 12; y < t.mouth - 6; y += 6) {
      g.beginPath();
      g.moveTo(x0 + 1, y);
      g.lineTo(x0 + ((y - t.top) % 18 < 1 ? 7 : 4), y);
      g.stroke();
    }
  }
  // rubber hose from the hydrogen tube to the lamp
  g.strokeStyle = css(hx('#7d3f2a'));
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(TUBES[0].cx, TUBES[0].top - 8);
  g.bezierCurveTo(TUBES[0].cx - 4, 628, 336, 630, LAMP.cx + 9, LAMP.burner + 10);
  g.stroke();
  g.strokeStyle = 'rgba(230,150,110,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(TUBES[0].cx - 1, TUBES[0].top - 9);
  g.bezierCurveTo(TUBES[0].cx - 5, 627, 335, 629, LAMP.cx + 8, LAMP.burner + 9);
  g.stroke();
}

function paintLamp(g) {
  const { cx, base, burner, top } = LAMP;
  g.fillStyle = css(C.brass);
  g.beginPath();
  g.ellipse(cx, base, 15, 4, 0, 0, TAU);
  g.fill();
  g.fillStyle = css(C.brassLit, 0.7);
  g.beginPath();
  g.ellipse(cx - 4, base - 1, 7, 1.6, 0, 0, TAU);
  g.fill();
  // stem
  const sg = g.createLinearGradient(cx - 3, 0, cx + 3, 0);
  sg.addColorStop(0, css(C.brassLit));
  sg.addColorStop(1, css(hx('#6a4a22')));
  g.fillStyle = sg;
  g.fillRect(cx - 2.5, burner, 5, base - burner);
  g.fillRect(cx - 6, burner + 18, 12, 4);
  // burner gallery
  g.fillStyle = css(C.brass);
  g.fillRect(cx - 9, burner - 3, 18, 6);
  // glass chimney
  g.fillStyle = 'rgba(235,240,232,0.18)';
  poly(g, [[cx - 8, burner - 3], [cx + 8, burner - 3], [cx + 9, LAMP.mantle[1] - 4], [cx + 6, top + 8], [cx + 5, top], [cx - 5, top], [cx - 6, top + 8], [cx - 9, LAMP.mantle[1] - 4]]);
  g.fill();
  g.strokeStyle = 'rgba(250,250,240,0.55)';
  g.lineWidth = 1;
  g.stroke();
}

function paintNotebookBase(g) {
  const [sbx, sby] = BOOK.spineB;
  const [sfx, sfy] = BOOK.spineF;
  const pw = BOOK.pw;
  // stack of pages (thickness)
  g.fillStyle = css(C.paperShade);
  poly(g, [[sbx - pw, sby + 2], [sfx - pw - 2, sfy + 3], [sfx + pw + 2, sfy + 3], [sbx + pw, sby + 2]]);
  g.fill();
  // cover edges
  g.fillStyle = css(hx('#3d2c22'));
  poly(g, [[sbx - pw - 2, sby + 1], [sfx - pw - 4, sfy + 4], [sfx + pw + 4, sfy + 4], [sbx + pw + 2, sby + 1]]);
  g.fill();
  // left & right pages
  const pages = [
    [[sbx, sby], [sbx - pw, sby + 1], [sfx - pw - 2, sfy + 1], [sfx, sfy]],
    [[sbx, sby], [sbx + pw, sby + 1], [sfx + pw + 2, sfy + 1], [sfx, sfy]],
  ];
  for (const p of pages) {
    poly(g, p);
    g.fillStyle = css(C.paper);
    g.fill();
  }
  // pencil notes + a little sketch of a four-sailed rotor
  g.strokeStyle = 'rgba(70,60,55,0.55)';
  g.lineWidth = 0.6;
  for (let k = 0; k < 5; k++) {
    const y = sby + 3 + k * 3.2;
    g.beginPath();
    g.moveTo(sbx - pw + 6 - k * 0.3, y);
    g.lineTo(sbx - 4, y);
    g.stroke();
  }
  g.beginPath();
  const scx = sbx + 18;
  const scy = sby + 9;
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2) + 0.4;
    g.moveTo(scx, scy);
    g.lineTo(scx + Math.cos(a) * 9, scy + Math.sin(a) * 4.5);
  }
  g.stroke();
  // pencil
  g.strokeStyle = css(hx('#7a6a3a'));
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(sfx + 8, sfy + 6);
  g.lineTo(sfx + 34, sfy + 2);
  g.stroke();
}

function getForeground(kit) {
  return kit.bake('lacour_fg_v7', S, S - FG_Y, (g, rng) => {
    g.translate(0, -FG_Y);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paintStudentBody(g, rng);
    paintTable(g, rng);
    paintTunnel(g, rng);
    g.setTransform(1, 0, 0, 1, 0, 0);
    painterlyPass(g, rng, S, S - FG_Y, () => 0, [
      { step: 3, len: [5, 12], w: [1.6, 3.4], alpha: [0.5, 0.8], jit: 11, maxGrad: 28, angJit: 0.4 },
      { step: 2, len: [2.5, 5.5], w: [1, 2], alpha: [0.55, 0.85], jit: 7, minGrad: 22 },
    ]);
    g.translate(0, -FG_Y);
    g.lineCap = 'round';
    paintJar(g, rng);
    paintLamp(g);
    paintNotebookBase(g);
    // signature, lower right, in thin brown paint
    g.font = `italic 500 19px "IM Fell English", "Cormorant Garamond", Georgia, serif`;
    g.fillStyle = 'rgba(70,45,25,0.8)';
    g.textAlign = 'right';
    g.fillText('Askov 1891', 858, 966);
  });
}

/** jar glass front: rim + highlights (drawn over the bubbles) */
function bakeJarFront(kit) {
  return kit.bake('lacour_jarfront_v3', 90, 160, (g) => {
    g.translate(-228, -660);
    const { cx, top, bot, rx, ry } = JAR;
    g.strokeStyle = 'rgba(245,250,245,0.7)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.ellipse(cx, top, rx, ry, 0, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(cx - rx, top);
    g.lineTo(cx - rx, bot);
    g.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true);
    g.lineTo(cx + rx, top);
    g.strokeStyle = 'rgba(230,240,235,0.45)';
    g.stroke();
    g.fillStyle = 'rgba(255,255,250,0.45)';
    g.fillRect(cx - rx + 4, top + 8, 3, bot - top - 16);
    g.fillStyle = 'rgba(255,255,250,0.22)';
    g.fillRect(cx - rx + 9, top + 12, 2, bot - top - 26);
    g.fillStyle = 'rgba(255,240,210,0.3)';
    g.fillRect(cx + rx - 7, top + 10, 2.5, bot - top - 20);
    // tube glass edges
    for (const t of TUBES) {
      g.strokeStyle = 'rgba(245,250,248,0.6)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(t.cx - t.w / 2, t.mouth);
      g.lineTo(t.cx - t.w / 2, t.top + 6);
      g.ellipse(t.cx, t.top + 6, t.w / 2, 6, 0, Math.PI, TAU);
      g.lineTo(t.cx + t.w / 2, t.mouth);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.fillRect(t.cx - t.w / 2 + 2, t.top + 8, 1.6, t.mouth - t.top - 14);
    }
    // paper labels on the tubes
    g.font = `italic 600 10px "IM Fell English", "Cormorant Garamond", Georgia, serif`;
    g.textAlign = 'center';
    for (const t of TUBES) {
      g.fillStyle = 'rgba(240,232,210,0.92)';
      g.fillRect(t.cx - 5, t.mouth - 22, 10, 11);
      g.fillStyle = 'rgba(40,30,20,0.85)';
      g.fillText(t.label, t.cx, t.mouth - 13);
    }
  });
}

// -----------------------------------------------------------------------------
// final varnish: canvas weave + craquelure + warm vignette (drawn over everything)
// -----------------------------------------------------------------------------
function bakeVarnish(kit) {
  return kit.bake('lacour_varnish_v5', S, S, (g, rng) => {
    const img = g.createImageData(S, S);
    const d = img.data;
    // thread thickness irregularities (slubs), one value per 4 px cell along each thread
    const slubH = new Float32Array(251 * 251);
    const slubV = new Float32Array(251 * 251);
    for (let a = 0; a < 251; a++) {
      for (let b = 0; b < 251; b++) {
        slubH[a * 251 + b] = kit.noise2(b * 0.24, a * 3.1, 3);
        slubV[a * 251 + b] = kit.noise2(b * 0.24, a * 3.1 + 77, 3);
      }
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const over = ((x >> 2) + (y >> 2)) & 1;
        const t = over ? (y & 3) : (x & 3);
        const prof = Math.sin((Math.PI * (t + 0.5)) / 4);
        const slub = (over ? slubH[(y >> 2) * 251 + (x >> 2)] : slubV[(x >> 2) * 251 + (y >> 2)]) - 0.5;
        const v = (prof - 0.66) * 0.62 + slub * 0.18 + (rng() - 0.5) * 0.2;
        const i = (y * S + x) * 4;
        if (v > 0) {
          d[i] = 255;
          d[i + 1] = 247;
          d[i + 2] = 228;
          d[i + 3] = v * 40;
        } else {
          d[i] = 62;
          d[i + 1] = 46;
          d[i + 2] = 30;
          d[i + 3] = -v * 46;
        }
      }
    }
    g.putImageData(img, 0, 0);
    // craquelure
    g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      let x = rng() * S;
      let y = rng() * S;
      let a = rng() * TAU;
      g.strokeStyle = `rgba(48,34,20,${0.05 + rng() * 0.07})`;
      g.lineWidth = 0.5 + rng() * 0.4;
      g.beginPath();
      g.moveTo(x, y);
      const n = 3 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        a += (rng() - 0.5) * 1.6;
        x += Math.cos(a) * (6 + rng() * 12);
        y += Math.sin(a) * (6 + rng() * 12);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // warm varnish + soft vignette
    g.fillStyle = 'rgba(255,226,170,0.035)';
    g.fillRect(0, 0, S, S);
    const vg = g.createRadialGradient(S / 2, S * 0.48, S * 0.32, S / 2, S * 0.5, S * 0.76);
    vg.addColorStop(0, 'rgba(60,40,20,0)');
    vg.addColorStop(1, 'rgba(60,40,20,0.24)');
    g.fillStyle = vg;
    g.fillRect(0, 0, S, S);
  });
}

// -----------------------------------------------------------------------------
// per-frame elements
// -----------------------------------------------------------------------------
function puffSprite(kit) {
  return kit.bake('lacour_puff', 64, 64, (g) => {
    const rg = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    rg.addColorStop(0, 'rgba(214,208,200,0.85)');
    rg.addColorStop(0.6, 'rgba(206,200,194,0.4)');
    rg.addColorStop(1, 'rgba(200,196,190,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
  });
}

function drawSmoke(ctx, kit, T, gst) {
  const spr = puffSprite(kit);
  for (let k = 0; k < 9; k++) {
    const age = (((T * 0.22 + k / 9) % 1) + 1) % 1;
    const drift = 120 + 60 * gst;
    const x = 364 + age * drift + Math.sin(T * 0.9 + k) * 4;
    const y = 524 - age * 64 + age * age * 10;
    const r = 6 + age * 22;
    ctx.globalAlpha = 0.42 * (1 - age) * sstep(0, 0.12, age);
    ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function drawSwallows(ctx, T) {
  ctx.strokeStyle = 'rgba(40,36,40,0.8)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ph = T * 0.35 + k * 0.37;
    const x = 300 + ((ph * 260 + k * 140) % 560);
    const y = 150 + k * 40 + Math.sin(ph * 4.0 + k) * 22;
    const flap = Math.sin(T * 9 + k * 2);
    const s = 5 + k;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.3 * flap);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - s * 0.3 * flap);
    ctx.stroke();
  }
}

function drawSchoolGlow(ctx, lamp) {
  const a = clamp01((lamp - 0.3) * 0.5);
  if (a <= 0.01) return;
  ctx.fillStyle = `rgba(255,196,110,${a})`;
  for (const [x, y, w, h] of SCHOOL_WIN) ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

function drawFantail(ctx, T, gst) {
  // fan-tail (vindrose) on a trestle at the back of the cap
  const c = capPt(-50, 0, 30);
  const stA = capPt(-24, -10, 4);
  const stB = capPt(-24, 10, 4);
  ctx.strokeStyle = css(C.timberDark, 0.9);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(stA.x, stA.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(stB.x, stB.y);
  const b2 = capPt(-26, 0, 26);
  ctx.moveTo(b2.x, b2.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
  const ang = T * 0.5 + 3.0 * intSmooth(T, G0, G1 + 0.4) - 3.0 * intSmooth(T, G2, G3 + 0.5);
  const R = 19;
  for (let i = 0; i < 8; i++) {
    const a = ang + (i * TAU) / 8;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // vane plane = (shaft, up): screen dx = fx*sa, dy = -ca - perspective
    const tip = { x: c.x + AX.fx * sa * R, y: c.y - ca * R - (AX.fz * sa * R * (HORIZON - c.y)) / 1200 };
    const mid = { x: c.x + AX.fx * sa * R * 0.45, y: c.y - ca * R * 0.45 };
    ctx.strokeStyle = css(mixc(C.shutter, C.timber, 0.35), 0.95);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(mid.x, mid.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = css(C.timberDark, 0.8);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  ctx.fillStyle = css(C.iron);
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2, 0, TAU);
  ctx.fill();
}

function drawSails(ctx, kit, T) {
  const spr = bakeSail(kit);
  const th = sailAngle(T);
  ctx.save();
  ctx.translate(HUB.x, HUB.y);
  ctx.transform(AX.rx, SAIL_SHEAR * 1.0, 0, 1, 0, 0);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(th + (i * Math.PI) / 2);
    ctx.drawImage(spr, -HXS, -HYS);
    ctx.restore();
  }
  // poll end / cross at the hub
  ctx.rotate(th);
  ctx.fillStyle = css(mixc(C.timber, C.timberDark, 0.3));
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
  // hub boss
  ctx.fillStyle = css(C.iron);
  ctx.beginPath();
  ctx.ellipse(HUB.x, HUB.y, 5.5, 6.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = css(C.ironLit, 0.8);
  ctx.beginPath();
  ctx.ellipse(HUB.x - 1.6, HUB.y - 1.6, 2, 2.4, 0, 0, TAU);
  ctx.fill();
}

function drawGasholders(ctx, T, thumb) {
  const k = thumb ? 0.3 : clamp01(0.15 + 0.04 * (T + 8) * 0.5) * 0.4 + 0.6 * sstep(G0 + 0.2, G2 + 0.3, T);
  for (const h of GH) {
    const top = h.top - h.rise * k;
    // bell
    const bg = ctx.createLinearGradient(h.cx - h.rb, 0, h.cx + h.rb, 0);
    bg.addColorStop(0, css(hx('#7f8a80')));
    bg.addColorStop(0.35, css(hx('#596258')));
    bg.addColorStop(1, css(hx('#2d332e')));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(h.cx - h.rb, h.cy);
    ctx.lineTo(h.cx - h.rb, top + 4);
    ctx.ellipse(h.cx, top + 4, h.rb, h.rb * 0.24, 0, Math.PI, TAU);
    ctx.lineTo(h.cx + h.rb, h.cy);
    ctx.closePath();
    ctx.fill();
    // domed crown + rivet bands
    ctx.fillStyle = 'rgba(200,205,190,0.35)';
    ctx.beginPath();
    ctx.ellipse(h.cx - h.rb * 0.25, top + 3, h.rb * 0.55, h.rb * 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,28,26,0.5)';
    ctx.lineWidth = 0.8;
    for (let y = top + 10; y < h.cy - 2; y += 7) {
      ctx.beginPath();
      ctx.ellipse(h.cx, y, h.rb, h.rb * 0.2, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    // front rim of the sunk tank
    ctx.strokeStyle = css(mixc(C.tile, C.stoneLit, 0.35));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(h.cx, h.cy, h.rr, h.rr * 0.22, 0, 0, Math.PI);
    ctx.stroke();
    // front guide posts + ring
    ctx.strokeStyle = css(C.iron);
    ctx.lineWidth = 2.2;
    for (const s of [-0.95, 0.95]) {
      ctx.beginPath();
      ctx.moveTo(h.cx + s * h.rr, h.cy + 2);
      ctx.lineTo(h.cx + s * h.rr * 1.02, h.post);
      ctx.stroke();
    }
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(h.cx, h.post, h.rr * 1.02, h.rr * 0.2, 0, 0, Math.PI);
    ctx.stroke();
    // guide rollers on the bell
    ctx.fillStyle = css(C.ironLit);
    ctx.fillRect(h.cx - h.rb - 2, top + 5, 3, 3);
    ctx.fillRect(h.cx + h.rb - 1, top + 5, 3, 3);
  }
}

function drawGallery(ctx, T, gst, thumb) {
  const Lc = galPt(-1, -1);
  const Fc = galPt(-1, 1);
  const Rc = galPt(1, 1);
  // la Cour (beard, dark coat, felt hat) near the front-left edge, pointing at the sails
  const P = (u, v) => ({ x: lerp(Lc.x, Fc.x, u) + (Rc.x - Fc.x) * v, y: lerp(Lc.y, Fc.y, u) + (Rc.y - Fc.y) * v });
  const f1 = P(0.55, 0.05);
  const point = thumb ? 0.6 : sstep(2.2, 2.8, T) * (1 - sstep(6.6, 7.4, T)) * 0.6 + gst * 0.4;
  drawGalleryMan(ctx, f1.x, f1.y - 1, 30, point, true);
  const f2 = P(0.92, 0.42);
  drawGalleryMan(ctx, f2.x, f2.y - 1, 27, thumb ? 0 : gst, false);
  // front railing
  const rail = (p, q) => {
    ctx.strokeStyle = css(mixc(C.timber, C.timberLit, 0.3));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k <= 5; k++) {
      const x = lerp(p.x, q.x, k / 5);
      const y = lerp(p.y, q.y, k / 5);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 16);
    }
    ctx.moveTo(p.x, p.y - 16);
    ctx.lineTo(q.x, q.y - 16);
    ctx.stroke();
    ctx.strokeStyle = css(mixc(C.timberLit, C.glow, 0.4), 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(q.x, q.y - 8);
    ctx.moveTo(p.x, p.y - 16.8);
    ctx.lineTo(q.x, q.y - 16.8);
    ctx.stroke();
  };
  rail(Lc, Fc);
  rail(Fc, Rc);
}

function drawGalleryMan(ctx, x, y, h, raise, beard) {
  const coat = beard ? hx('#24221f') : hx('#4a4f5c');
  ctx.fillStyle = css(hx('#2e2a26'));
  ctx.fillRect(x - 2.6, y - h * 0.42, 2.4, h * 0.42);
  ctx.fillRect(x + 0.4, y - h * 0.42, 2.4, h * 0.42);
  ctx.fillStyle = css(coat);
  ctx.beginPath();
  ctx.moveTo(x - 5, y - h * 0.3);
  ctx.lineTo(x + 5, y - h * 0.3);
  ctx.lineTo(x + 4, y - h * 0.78);
  ctx.lineTo(x - 4, y - h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(mixc(coat, C.glow, 0.45));
  ctx.fillRect(x - 4.6, y - h * 0.76, 1.6, h * 0.42);
  // arm: from shoulder, raised towards the sails (up-left)
  const sx = x - 2;
  const sy = y - h * 0.74;
  const a = lerp(Math.PI * 0.55, -Math.PI * 0.62, raise);
  const ex = sx + Math.cos(a) * h * 0.36;
  const ey = sy + Math.sin(a) * h * 0.36;
  ctx.strokeStyle = css(coat);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = css(C.skin);
  ctx.beginPath();
  ctx.arc(ex, ey, 1.4, 0, TAU);
  ctx.fill();
  // head
  ctx.fillStyle = css(C.skinLit);
  ctx.beginPath();
  ctx.arc(x, y - h * 0.86, h * 0.085, 0, TAU);
  ctx.fill();
  if (beard) {
    ctx.fillStyle = css(hx('#c9c2b4'));
    ctx.beginPath();
    ctx.ellipse(x - 0.6, y - h * 0.79, h * 0.07, h * 0.075, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = css(hx('#1c1a18'));
    ctx.fillRect(x - h * 0.11, y - h * 0.95, h * 0.22, h * 0.03);
    ctx.fillRect(x - h * 0.07, y - h * 1.02, h * 0.14, h * 0.08);
  } else {
    ctx.fillStyle = css(hx('#2a2622'));
    ctx.fillRect(x - h * 0.09, y - h * 0.96, h * 0.18, h * 0.05);
  }
}

// --- foreground animation --------------------------------------------------
function drawTunnelRotor(ctx, T, gst) {
  const { x, y, r } = TUN.rot;
  const ang = -(T * 7.5 + 6 * gustInt(T));
  ctx.save();
  ctx.translate(x, y);
  // faint motion disc
  ctx.fillStyle = `rgba(230,215,180,${0.06 + 0.06 * gst})`;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = ang + (i * Math.PI) / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = css(mixc(C.shutter, C.glow, 0.2));
    ctx.fillRect(1.5, -r, 6, r * 0.72);
    ctx.fillStyle = css(C.shutterShade);
    ctx.fillRect(5.5, -r, 2, r * 0.72);
    ctx.strokeStyle = css(C.dealDark);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = css(C.brass);
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  // dynamometer needle
  const na = -2.2 + 0.5 + 0.35 * Math.sin(T * 3) * 0.1 + 1.1 * gst;
  ctx.strokeStyle = 'rgba(40,20,10,0.9)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(124, 752);
  ctx.lineTo(124 + Math.cos(na) * 6, 752 + Math.sin(na) * 6.8);
  ctx.stroke();
  // motor pulley spokes + belt
  const pa = T * 9;
  ctx.strokeStyle = 'rgba(30,25,20,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = pa + (k * TAU) / 3;
    ctx.moveTo(70, 794);
    ctx.lineTo(70 + Math.cos(a) * 3.5, 794 + Math.sin(a) * 8);
  }
  ctx.stroke();
  ctx.strokeStyle = css(hx('#4a3020'));
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(70, 786);
  ctx.lineTo(TUN.fx0 + TUN.dx + 4, (TUN.fy0 + TUN.fy1) / 2 + TUN.dy - 14);
  ctx.moveTo(70, 802);
  ctx.lineTo(TUN.fx0 + TUN.dx + 4, (TUN.fy0 + TUN.fy1) / 2 + TUN.dy + 10);
  ctx.stroke();
}

function gasLen(T, idx, thumb) {
  const tau = thumb ? 2 : T + 1.6 * gustInt(T);
  const h = Math.max(12, Math.min(84, 26 + 2.5 * tau));
  return idx === 0 ? h : h * 0.5;
}

function drawElectrolysis(ctx, kit, T, gst, thumb) {
  // gas columns at the top of each tube
  for (let i = 0; i < 2; i++) {
    const t = TUBES[i];
    const gl = gasLen(T, i, thumb);
    const x0 = t.cx - t.w / 2;
    const yTop = t.top;
    const yMen = t.top + 6 + gl;
    ctx.fillStyle = 'rgba(236,242,236,0.92)';
    ctx.beginPath();
    ctx.ellipse(t.cx, yTop + 6, t.w / 2 - 0.5, 5.5, 0, Math.PI, TAU);
    ctx.lineTo(x0 + t.w - 0.5, yMen);
    ctx.lineTo(x0 + 0.5, yMen);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0 + 2, yTop + 4, 2, gl);
    // meniscus
    ctx.strokeStyle = 'rgba(90,120,112,0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, yMen - 1.5);
    ctx.quadraticCurveTo(t.cx, yMen + 1.5, x0 + t.w - 0.5, yMen - 1.5);
    ctx.stroke();
    // bubble stream: hydrogen twice as many
    const rate = (i === 0 ? 2.2 : 1.1) * (thumb ? 1 : 1 + 0.6 * sstep(-1, 3, T));
    const n = Math.round((i === 0 ? 9 : 5) + (i === 0 ? 16 : 8) * gst);
    const tau = thumb ? 2 : T + 1.8 * gustInt(T);
    ctx.fillStyle = 'rgba(250,252,250,0.85)';
    ctx.strokeStyle = 'rgba(80,110,100,0.55)';
    ctx.lineWidth = 0.6;
    const nMax = i === 0 ? 25 : 13;
    for (let k = 0; k < nMax; k++) {
      if (k >= n) break;
      const ph = (((tau * rate * 0.55 + k * 0.618034) % 1) + 1) % 1;
      const y = t.el - ph * (t.el - yMen - 2);
      const wob = Math.sin(ph * 14 + k * 2.1 + T * 3) * 1.6 * ph;
      const x = t.cx + (kit.hash11(k * 3.7 + i) - 0.5) * (t.w - 6) + wob;
      const r = 0.9 + kit.hash11(k * 1.3 + i * 9) * 1.4 + ph * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // fizz at the electrode during the gust
    if (gst > 0.05) {
      ctx.fillStyle = `rgba(250,252,250,${0.5 * gst})`;
      for (let k = 0; k < 8; k++) {
        const x = t.cx - 4 + kit.hash11(k * 5.1 + i + Math.floor(T * 12)) * 8;
        const y = t.el - 4 - kit.hash11(k * 2.3 + i * 3 + Math.floor(T * 12)) * 16;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
  }
  ctx.drawImage(bakeJarFront(kit), 228, 660);
}

function drawLampGlow(ctx, lamp) {
  const { cx, mantle } = LAMP;
  const my = (mantle[0] + mantle[1]) / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = 34 + 70 * lamp;
  const rg = ctx.createRadialGradient(cx, my, 2, cx, my, R);
  rg.addColorStop(0, `rgba(255,214,140,${0.55 * lamp})`);
  rg.addColorStop(0.25, `rgba(255,190,110,${0.28 * lamp})`);
  rg.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(cx - R, my - R, R * 2, R * 2);
  ctx.restore();
  // incandescent mantle
  const mg = ctx.createLinearGradient(0, mantle[0], 0, mantle[1]);
  mg.addColorStop(0, `rgba(255,250,225,${0.75 + 0.25 * lamp})`);
  mg.addColorStop(1, `rgba(255,${190 + 50 * lamp},${110 + 80 * lamp},0.95)`);
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(cx, my, 4 + lamp * 1.2, (mantle[1] - mantle[0]) / 2, 0, 0, TAU);
  ctx.fill();
  if (lamp > 0.6) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,236,190,${(lamp - 0.6) * 0.9})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8 + 0.2;
      ctx.moveTo(cx + Math.cos(a) * 9, my + Math.sin(a) * 9);
      ctx.lineTo(cx + Math.cos(a) * (14 + 26 * (lamp - 0.6)), my + Math.sin(a) * (14 + 26 * (lamp - 0.6)));
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawPages(ctx, T, thumb) {
  if (thumb) return;
  const [sbx, sby] = BOOK.spineB;
  const [sfx, sfy] = BOOK.spineF;
  const pw = BOOK.pw;
  const starts = [4.08, 4.26, 4.42, 4.6, 4.78, 4.96, 5.2, 5.42];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    let u = sstep(s, s + 0.42, T);
    // the last two pages are blown back half way, then settle
    if (i >= 5) u = sstep(s, s + 0.35, T) * (1 - 0.95 * sstep(s + 0.55, s + 1.2, T));
    if (u <= 0.001 || u >= 0.999) continue;
    const phi = u * Math.PI;
    const flutter = Math.sin(T * 30 + i * 1.7) * 0.12 * Math.sin(phi);
    const c = Math.cos(phi + flutter);
    const s2 = Math.sin(phi + flutter);
    const ex = pw * c;
    const ey = -pw * s2 * 1.2;
    const curl = 9 * Math.sin(phi) * (i % 2 ? 1 : -1);
    const shade = 0.85 + 0.15 * Math.abs(c);
    ctx.fillStyle = css(mixc(C.paperShade, C.paper, shade));
    ctx.beginPath();
    ctx.moveTo(sbx, sby);
    ctx.quadraticCurveTo(sbx + ex * 0.55 + curl, sby + ey * 0.55 - 3, sbx + ex, sby + ey + 1);
    ctx.lineTo(sfx + ex * 1.04, sfy + ey + 1);
    ctx.quadraticCurveTo(sfx + ex * 0.55 + curl, sfy + ey * 0.55 - 3, sfx, sfy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,70,0.5)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // pencil lines on the page
    ctx.strokeStyle = 'rgba(70,60,55,0.35)';
    ctx.beginPath();
    for (let k = 1; k < 4; k++) {
      const v = k / 4;
      ctx.moveTo(lerp(sbx, sfx, v) + ex * 0.15, lerp(sby, sfy, v) + ey * 0.15);
      ctx.lineTo(lerp(sbx, sfx, v) + ex * 0.85, lerp(sby, sfy, v) + ey * 0.85);
    }
    ctx.stroke();
  }
}

function solveIK(sx, sy, tx, ty, L1, L2, bend) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const maxD = L1 + L2 - 0.01;
  if (d > maxD) {
    dx *= maxD / d;
    dy *= maxD / d;
    d = maxD;
  }
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const a = Math.atan2(dy, dx) + bend * Math.acos(Math.max(-1, Math.min(1, cosA)));
  return { x: sx + L1 * Math.cos(a), y: sy + L1 * Math.sin(a), hx: sx + dx, hy: sy + dy };
}

function drawStudent(ctx, T, gst, thumb) {
  // writing hand (far arm, forearm emerging in front of the chest)
  const wr = thumb ? 0 : 1 - sstep(4.0, 4.3, T) + sstep(6.4, 7.0, T);
  const wig = Math.sin(T * 7.0) * 1.2 * clamp01(wr);
  const hand = { x: 444 + wig, y: 799 + Math.abs(Math.sin(T * 3.5)) * 0.8 };
  const handB = { x: 452, y: 790 };
  const hp = { x: lerp(handB.x, hand.x, clamp01(wr)), y: lerp(handB.y, hand.y, clamp01(wr)) };
  ctx.strokeStyle = css(mixc(C.jacket, C.jacketLit, 0.5));
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(478, 786);
  ctx.lineTo(hp.x + 6, hp.y - 2);
  ctx.stroke();
  ctx.fillStyle = css(C.skinLit);
  ctx.beginPath();
  ctx.ellipse(hp.x + 1, hp.y, 5, 3.6, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = css(hx('#3a3020'));
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hp.x - 3, hp.y + 2);
  ctx.lineTo(hp.x + 6, hp.y - 8);
  ctx.stroke();

  // cap: lifts in the gust until the hand clamps it
  const lift = thumb ? 0 : sstep(3.85, 4.2, T) * (1 - sstep(4.25, 4.5, T));
  const [hx0, hy0] = STU.head;
  ctx.save();
  ctx.translate(hx0 + 6, hy0 - 12);
  ctx.rotate(-0.08 - 0.35 * lift);
  ctx.translate(0, -5 * lift);
  ctx.fillStyle = css(hx('#2f2b27'));
  ctx.beginPath();
  ctx.moveTo(-16, 1);
  ctx.quadraticCurveTo(-12, -9, 2, -8);
  ctx.quadraticCurveTo(13, -7, 12, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(hx('#1d1a17'));
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-23, 3);
  ctx.lineTo(-13, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,170,120,0.35)';
  ctx.fillRect(-12, -7, 10, 1.6);
  ctx.restore();

  // near arm: rests on the thigh, flies up to hold the cap in the gust
  const up = thumb ? 0 : sstep(4.0, 4.35, T) * (1 - sstep(6.2, 6.9, T));
  const tx = lerp(STU.restHand[0], STU.capHand[0], up);
  const ty = lerp(STU.restHand[1], STU.capHand[1], up);
  const [sx, sy] = STU.shoulder;
  const el = solveIK(sx, sy, tx, ty, 46, 40, 1);
  const sleeve = mixc(C.jacket, C.jacketLit, 0.25);
  ctx.strokeStyle = css(sleeve);
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(el.x, el.y);
  ctx.lineTo(el.hx, el.hy);
  ctx.stroke();
  ctx.strokeStyle = css(mixc(C.jacketLit, C.glow, 0.25), 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy + 2);
  ctx.lineTo(el.x - 4, el.y);
  ctx.stroke();
  ctx.fillStyle = css(C.skin);
  ctx.beginPath();
  ctx.ellipse(el.hx, el.hy, 5.5, 4.2, up * -0.6, 0, TAU);
  ctx.fill();
}

function drawForegroundGrass(ctx, T, gst) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = 520 + ((i * 97.13) % 450);
    const base = 972;
    const h = 40 + ((i * 37.7) % 46);
    const sway = 0.1 * Math.sin(T * 1.7 + i * 0.9) + 0.32 * gst + 0.06 * Math.sin(T * 6 + i) * gst;
    const tipx = x + Math.sin(sway) * h + 4;
    const tipy = base - Math.cos(sway) * h;
    const shade = (i * 13) % 3;
    ctx.strokeStyle = shade === 0 ? 'rgba(176,168,96,0.75)' : shade === 1 ? 'rgba(110,124,70,0.75)' : 'rgba(76,92,56,0.75)';
    ctx.lineWidth = 1.8 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + (tipx - x) * 0.2, base - h * 0.55, tipx, tipy);
    ctx.stroke();
    if (i % 7 === 0) {
      ctx.fillStyle = 'rgba(246,240,226,0.95)';
      ctx.beginPath();
      ctx.arc(tipx, tipy, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(214,168,60,0.95)';
      ctx.beginPath();
      ctx.arc(tipx, tipy, 1.3, 0, TAU);
      ctx.fill();
    }
  }
}

// --- the rider, painted ------------------------------------------------------
let riderBuf = null;
const RBW = 330;
const RBH = 270;
function riderTexture(kit) {
  return kit.bake('lacour_ridertex_v2', RBW, RBH, (g, rng) => {
    // light from the upper left: warm on the lit side, cool blue-grey on the shadow side
    const lg = g.createLinearGradient(60, 30, 260, 250);
    lg.addColorStop(0, 'rgba(255,226,180,0.30)');
    lg.addColorStop(0.5, 'rgba(255,240,220,0)');
    lg.addColorStop(1, 'rgba(70,90,125,0.34)');
    g.fillStyle = lg;
    g.fillRect(0, 0, RBW, RBH);
    g.lineCap = 'round';
    for (let i = 0; i < 2200; i++) {
      const x = rng() * RBW;
      const y = rng() * RBH;
      const light = rng() < 0.5 + 0.3 * (1 - (x + y) / (RBW + RBH));
      g.strokeStyle = light ? `rgba(255,244,222,${0.14 + rng() * 0.2})` : `rgba(78,86,112,${0.1 + rng() * 0.16})`;
      g.lineWidth = 1 + rng() * 2.4;
      const a = -0.5 + (rng() - 0.5) * 0.9;
      const l = 3 + rng() * 7;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  });
}

const RIDER_STYLE = {
  plumage: '#f4efe3',
  plumageShade: '#b7bac6',
  mask: '#1d1a17',
  bill: '#2a2520',
  eyeRing: '#8f6d3a',
  legs: '#2c2723',
  crest: '#d8b46a',
  breast: '#e0c07c',
  frame: '#232629',
  frameShade: '#171a1d',
  metal: '#57534c',
  tire: '#2a2724',
  rim: '#bdb5a5',
  saddle: '#5b3b27',
  outline: '#5a4a38',
  outlineWidth: 0,
  shading: true,
};

function drawRider(ctx, kit, scene, params) {
  const rig = kit.riderRig(params, { arch: 0 });
  // soft cast shadow on the road (sun low on the left)
  ctx.fillStyle = 'rgba(60,45,30,0.22)';
  ctx.beginPath();
  ctx.ellipse(rig.root.x + 46, ROAD_Y + 2, 120, 6, 0, 0, TAU);
  ctx.fill();
  const K = 0.74;
  if (!riderBuf) riderBuf = kit.createCanvas(Math.ceil(RBW * K), Math.ceil(RBH * K));
  const bg = riderBuf.getContext('2d');
  const ox = Math.round(rig.root.x) - 165;
  const oy = Math.round(rig.root.y) - 255;
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.globalCompositeOperation = 'source-over';
  bg.globalAlpha = 1;
  bg.clearRect(0, 0, riderBuf.width, riderBuf.height);
  bg.scale(K, K);
  bg.translate(-ox, -oy);
  kit.drawRider(bg, rig, {
    ...RIDER_STYLE,
    pinwheel: { ...(scene.pinwheel || { type: 'post' }), colors: ['#ece2c8'], stroke: '#6a5640', lineWidth: 1.1 },
  });
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.globalCompositeOperation = 'source-atop';
  bg.drawImage(riderTexture(kit), 0, 0, riderBuf.width, riderBuf.height);
  bg.globalCompositeOperation = 'source-over';
  // soft painted edges: two faint offset passes, then the body (upscaled = soft brushed edges)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = 0.25;
  ctx.drawImage(riderBuf, ox - 1.4, oy + 0.5, RBW, RBH);
  ctx.drawImage(riderBuf, ox + 1.4, oy - 0.5, RBW, RBH);
  ctx.globalAlpha = 1;
  ctx.drawImage(riderBuf, ox, oy, RBW, RBH);
  // a few loaded-brush highlights on the sunlit plumage
  ctx.strokeStyle = 'rgba(255,248,232,0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const b = rig.body;
  ctx.moveTo(b.x - b.rx * 0.55, b.y - b.ry * 0.55);
  ctx.quadraticCurveTo(b.x - b.rx * 0.1, b.y - b.ry * 1.0, b.x + b.rx * 0.55, b.y - b.ry * 0.75);
  ctx.moveTo(rig.head.x - rig.head.r * 0.6, rig.head.y - rig.head.r * 0.6);
  ctx.quadraticCurveTo(rig.head.x - rig.head.r * 0.1, rig.head.y - rig.head.r * 1.05, rig.head.x + rig.head.r * 0.3, rig.head.y - rig.head.r * 0.9);
  ctx.stroke();
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 2.0 : params.rawLocalT;
  const gst = thumb ? 0 : gust(T);
  const lamp = lampLevel(T, thumb);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.drawImage(getBackground(kit), 0, 0);
  drawSmoke(ctx, kit, T, gst);
  drawSwallows(ctx, T);
  drawSchoolGlow(ctx, lamp);
  drawFantail(ctx, T, gst);
  ctx.drawImage(bakeCap(kit), CAP_C.x - 60, CAP_C.y - 60);
  drawSails(ctx, kit, T);
  drawGasholders(ctx, T, thumb);
  drawGallery(ctx, T, gst, thumb);

  if (kit.riderVisible(params)) drawRider(ctx, kit, scene, params);

  ctx.drawImage(getForeground(kit), 0, FG_Y);
  drawTunnelRotor(ctx, T, gst);
  drawElectrolysis(ctx, kit, T, gst, thumb);
  drawLampGlow(ctx, lamp);
  drawPages(ctx, T, thumb);
  drawStudent(ctx, T, gst, thumb);
  drawForegroundGrass(ctx, T, gst);

  ctx.drawImage(bakeVarnish(kit), 0, 0);
  ctx.restore();
}
