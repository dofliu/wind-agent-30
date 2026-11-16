// src/scenes/halladay.js
// #08 · 1854 · 美國西部汲水風車 — The American windpump.
//
// Medium: a 19th-century American chromolithograph advertisement / trade card.
// Cream card stock, a handful of flat colour plates (red, Prussian blue, ochre,
// prairie green, sky tint) printed slightly off register against a dark-brown key
// plate, gradients and shading built from stipple dots, ornate Victorian lettering
// on a scroll ribbon, double-ruled border with corner rosettes.
//
// The machine: Daniel Halladay's self-governing farm windpump (Ellington, Conn.,
// patented 1854). A wheel of many narrow wooden slats grouped in hinged SECTIONS:
// in a strong wind the sections swing back like an umbrella closing (the wheel
// "furls"), holding the speed down; a long TAIL VANE keeps the wheel facing the
// wind; a tall four-legged wooden lattice tower; a direct-stroke crank drives a
// wooden pump rod down the tower to the pump at the base, which spouts into a
// round wooden stock tank. Longhorn and Hereford cattle; a railroad water stop on
// the horizon.
//
// Story (4 bars): bar 1 the longhorn lifts its head from the tank and watches the
// cyclist; it follows him round (full frontal stare as he passes). Bar 3 a gust:
// a tumbleweed bounces in on the beat and hops clean over the bicycle, the wheel's
// sections furl to regulate the speed, then open again in bar 4. Meanwhile the
// train takes water at the tank on the horizon and steams away.

const S = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const HORIZON = 520;

const C = {
  paper: '#f3e2b6',
  paperLt: '#f9eecf',
  red: '#a8322d',
  redDk: '#74201c',
  redLt: '#c8553f',
  blue: '#1f3a5f',
  blueMd: '#3d6590',
  skyTint: '#c3dae0',
  skyDot: '#4f7ead',
  ochre: '#d9a03f',
  ochreDk: '#a8742a',
  key: '#2c1f15',
  brown: '#3b2a1e',
  cream: '#fbf3dc',
  green: '#9aaa50',
  greenMd: '#768d3a',
  greenDk: '#4d6428',
  olive: '#bdb57c',
  wood: '#d6a35e',
  woodSh: '#a7733d',
  woodDk: '#7c5430',
  iron: '#3a3430',
  water: '#4f80a8',
  waterLt: '#a9cadb',
  dirt: '#ddb56c',
  dirtDk: '#b18646',
  hide: '#9c4a29',
  hideCream: '#eedcb2',
};
const KEY_RGB = '44,31,21';
const key = (a) => `rgba(${KEY_RGB},${a})`;
// colour plates printed slightly off register against the key plate
const REG = { x: 2.2, y: 1.5 };

// -----------------------------------------------------------------------------
// small math / drawing helpers
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function sstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
/** integral of smoothstep(a,b,x) dx from a to T */
function intSmooth(T, a, b) {
  const s = clamp((T - a) / (b - a), 0, 1);
  return (b - a) * (s * s * s - 0.5 * s * s * s * s) + Math.max(0, T - b);
}
const v3 = (x, y, z) => ({ x, y, z });
const add3 = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul3 = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
function norm3(a) {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

function poly(g, pts, close = true) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
}

/** Flat colour plate (offset = misregistration) + key line on top. */
function plate(g, pathFn, fill, keyW = 1.5, keyCol = C.key, reg = 1) {
  if (fill) {
    g.save();
    g.translate(REG.x * reg, REG.y * reg);
    pathFn(g);
    g.fillStyle = fill;
    g.fill();
    g.restore();
  }
  if (keyW > 0) {
    pathFn(g);
    g.lineWidth = keyW;
    g.strokeStyle = keyCol;
    g.stroke();
  }
}

/** Lithographic stipple: dots on a jittered grid, density(x,y) in 0..1. */
function stipple(g, rng, x0, y0, x1, y1, step, dens, color, r0 = 0.6, r1 = 1.2) {
  g.fillStyle = color;
  g.beginPath();
  let row = 0;
  for (let y = y0; y < y1; y += step, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      const jx = x + (rng() - 0.5) * step * 0.7;
      const jy = y + (rng() - 0.5) * step * 0.7;
      const d = dens(jx, jy);
      const p = rng();
      if (d <= 0 || p > d) continue;
      const r = r0 + rng() * (r1 - r0);
      g.moveTo(jx + r, jy);
      g.arc(jx, jy, r, 0, TAU);
    }
  }
  g.fill();
}

/** Stipple clipped to a path. */
function stippleIn(g, rng, pathFn, box, step, dens, color, r0, r1) {
  g.save();
  pathFn(g);
  g.clip();
  stipple(g, rng, box[0], box[1], box[2], box[3], step, dens, color, r0, r1);
  g.restore();
}

/** Wooden member (key outline + flat colour). */
function beam(g, a, b, w, col, keyW = 1.3) {
  g.lineCap = 'butt';
  g.strokeStyle = C.key;
  g.lineWidth = w + keyW * 2;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(a.x + REG.x * 0.5, a.y + REG.y * 0.5);
  g.lineTo(b.x + REG.x * 0.5, b.y + REG.y * 0.5);
  g.stroke();
}

function hull(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  up.pop();
  lo.pop();
  return lo.concat(up);
}

// -----------------------------------------------------------------------------
// windmill geometry (orthographic, y up, z towards the viewer)
// -----------------------------------------------------------------------------
const TW = { ox: 610, oy: 640, ps: 0.2, pc: 0.98 };
function P(x, y, z) {
  return { x: TW.ox + x, y: TW.oy - y * TW.pc + z * TW.ps, z };
}
const PV = (p) => P(p.x, p.y, p.z);
const TOWER = { B: 56, T: 15, H: 362, yaw: 28 * DEG };
function corner(k, y) {
  const r = lerp(TOWER.B, TOWER.T, y / TOWER.H) * Math.SQRT2;
  const a = TOWER.yaw + Math.PI / 4 + (k * Math.PI) / 2;
  return v3(r * Math.cos(a), y, r * Math.sin(a));
}
// the wind blows from the front-left; the wheel faces it, the tail streams behind
const UPW = norm3(v3(-0.5, 0, 0.866));
const E1 = v3(0, 1, 0);
const E2 = norm3(v3(0.866, 0, 0.5)); // in the wheel plane, horizontal (E2 x E1 = UPW)
const HEAD = v3(0, TOWER.H + 26, 0);
const HUB = add3(HEAD, mul3(UPW, 46));
const WR = 122; // wheel radius
const SECTIONS = 8;
const SLATS = 5;
const SLAT_STEP = 7.6 * DEG;
const R_HINGE = 0.3 * WR;
const R_IN = 0.36 * WR;
const SLAT_PITCH = 38 * DEG;
const PUMP = { x: TW.ox, top: 583 };
const SPOUT = { x: 546, y: 597 };

// stock tank
const TANK = { x: 478, y: 622, rx: 80, ry: 24, h: 40 };
const WATER_Y = TANK.y + 5;

// -----------------------------------------------------------------------------
// timing
// -----------------------------------------------------------------------------
function gust(T) {
  return sstep(3.7, 4.4, T) * (1 - sstep(5.9, 6.9, T));
}
function gustInt(T) {
  return intSmooth(T, 3.7, 4.4) - intSmooth(T, 5.9, 6.9);
}
/** wheel revolutions: 1 rev/s (one pump stroke every 2 beats), a little faster in the gust */
function wheelRev(T) {
  return T + 0.28 * gustInt(T);
}
/** self-regulation: the sections swing back (furl) in the gust */
function furlAngle(T) {
  return 58 * DEG * sstep(4.15, 4.9, T) * (1 - sstep(6.0, 7.1, T));
}
function rodLift(T) {
  return 7 * Math.sin(TAU * wheelRev(T));
}
function flow(T) {
  return Math.max(0, Math.cos(TAU * wheelRev(T) - 0.5));
}

// tumbleweed ground contacts (time, x); it bounces on the beats and hops the bicycle
const TUMBLE = [
  [3.1, -330],
  [3.55, -110],
  [4.0, 110],
  [4.5, 330],
  [5.5, 905],
  [5.95, 1085],
  [6.4, 1260],
];
const TUMBLE_G = 2000;
const TUMBLE_R = 31;
const TUMBLE_GROUND = 714;
function tumbleState(T) {
  if (T < TUMBLE[0][0] || T >= TUMBLE[TUMBLE.length - 1][0]) return null;
  let i = 0;
  while (i < TUMBLE.length - 2 && T >= TUMBLE[i + 1][0]) i++;
  const [t0, x0] = TUMBLE[i];
  const [t1, x1] = TUMBLE[i + 1];
  const dur = t1 - t0;
  const tau = T - t0;
  const u = tau / dur;
  const x = lerp(x0, x1, u);
  const h = 0.5 * TUMBLE_G * tau * (dur - tau);
  // squash right after / before a contact
  const sinceHit = Math.min(tau, dur - tau);
  const squash = 1 - 0.16 * Math.max(0, 1 - sinceHit / 0.06);
  return { x, y: TUMBLE_GROUND - TUMBLE_R - h, h, rot: x / TUMBLE_R, squash, i };
}

// train on the horizon: arrives, takes water, steams away
const TRAIN_STOP = 262;
function trainX(T) {
  if (T < -1) {
    const q = clamp((-1 - T) / 7, 0, 1);
    return TRAIN_STOP - 560 * q * q;
  }
  if (T < 3.6) return TRAIN_STOP;
  return TRAIN_STOP + 30 * (T - 3.6) * (T - 3.6);
}

// -----------------------------------------------------------------------------
// BACKGROUND: paper, sky, clouds, prairie, railway, ribbon, border
// -----------------------------------------------------------------------------
function paintPaper(kit, g, rng) {
  g.fillStyle = C.paper;
  g.fillRect(0, 0, S, S);
  kit.addBlotches(g, S, S, rng, 'rgba(160,110,40,0.05)', 26, 60, 220);
}

function paintSky(g, rng) {
  // flat sky tint plate
  g.save();
  g.beginPath();
  g.rect(0, 0, S, HORIZON + 2);
  g.clip();
  const tint = g.createLinearGradient(0, 40, 0, HORIZON);
  tint.addColorStop(0, '#a9c9d8');
  tint.addColorStop(0.55, C.skyTint);
  tint.addColorStop(0.85, '#e7e3bf');
  tint.addColorStop(1, '#f2dfa6');
  g.fillStyle = tint;
  g.fillRect(0, 0, S, HORIZON + 2);
  // blue stipple "blend" getting denser upwards (the lithographer's grain gradient)
  stipple(g, rng, 0, 30, S, HORIZON - 40, 3.4, (x, y) => 0.62 * Math.pow(clamp(1 - (y - 30) / (HORIZON - 90), 0, 1), 1.25), C.skyDot, 0.55, 1.2);
  // warm ochre plate near the horizon
  stipple(g, rng, 0, HORIZON - 120, S, HORIZON + 2, 3.2, (x, y) => 0.35 * Math.pow(clamp((y - (HORIZON - 120)) / 120, 0, 1), 1.6), C.ochre, 0.55, 1.1);
  // a few litho-crayon streaks
  g.strokeStyle = 'rgba(79,126,173,0.18)';
  g.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = 70 + rng() * 300;
    const x = rng() * S;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 40 + rng() * 120, y + (rng() - 0.5) * 2);
    g.stroke();
  }
  g.restore();
}

function cloudPath(blobs) {
  return (g) => {
    g.beginPath();
    for (const b of blobs) {
      g.moveTo(b[0] + b[2], b[1]);
      g.arc(b[0], b[1], b[2], 0, TAU);
    }
  };
}
function paintCloud(g, rng, cx, cy, w, h, n) {
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = cx - w / 2 + u * w;
    const hump = Math.sin(u * Math.PI);
    const r = h * (0.32 + 0.5 * hump) * (0.8 + rng() * 0.4);
    blobs.push([x, cy - r * 0.35 + (rng() - 0.5) * 6, r]);
  }
  // flat underside
  // cream plate (offset), then blue-grey stipple on the undersides
  g.save();
  g.translate(REG.x, REG.y);
  g.beginPath();
  g.rect(cx - w, cy - h * 2, w * 2, h * 2 + h * 0.28);
  g.clip();
  cloudPath(blobs)(g);
  g.fillStyle = '#fbf4de';
  g.fill();
  g.restore();
  g.save();
  g.beginPath();
  g.rect(cx - w, cy - h * 2, w * 2, h * 2 + h * 0.28);
  g.clip();
  cloudPath(blobs)(g);
  g.clip();
  stipple(g, rng, cx - w, cy - h * 1.6, cx + w, cy + h * 0.4, 2.8, (x, y) => 0.75 * sstep(cy - h * 0.9, cy + h * 0.25, y), '#7f97a8', 0.5, 1.1);
  stipple(g, rng, cx - w, cy - h * 1.6, cx + w, cy + h * 0.4, 3.2, (x, y) => 0.22 * sstep(cy - h * 0.2, cy + h * 0.3, y), C.ochre, 0.5, 1);
  g.restore();
  // a few scalloped key accents on the top edge
  g.strokeStyle = key(0.28);
  g.lineWidth = 0.9;
  for (const b of blobs) {
    g.beginPath();
    g.arc(b[0], b[1], b[2], Math.PI * 1.15, Math.PI * 1.7);
    g.stroke();
  }
}

function paintPrairie(g, rng) {
  // far haze band, mid prairie, near meadow (flat plates with stipple shading)
  const bands = [
    [HORIZON, 552, C.olive, '#8e8a55'],
    [552, 600, '#a9b05e', '#6d7c34'],
    [600, 700, C.green, C.greenDk],
  ];
  for (const [y0, y1, col, dotCol] of bands) {
    g.save();
    g.translate(REG.x, REG.y);
    g.fillStyle = col;
    g.fillRect(0, y0, S, y1 - y0 + 1);
    g.restore();
    stipple(g, rng, 0, y0, S, y1, 3.2, (x, y) => 0.12 + 0.18 * kitNoise(x * 0.012, y * 0.05), dotCol, 0.5, 1.0);
  }
  // horizon key line + far hills
  g.strokeStyle = key(0.75);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, HORIZON);
  for (let x = 0; x <= S; x += 10) g.lineTo(x, HORIZON - 3 * Math.sin(x * 0.011) - 2 * Math.sin(x * 0.037));
  g.stroke();
  // grass ticks, sparser in the distance
  g.strokeStyle = key(0.38);
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 0; i < 1500; i++) {
    const y = 556 + Math.pow(rng(), 0.8) * 140;
    const x = rng() * S;
    const l = 2 + (y - 550) * 0.05 * (0.6 + rng() * 0.8);
    g.moveTo(x, y);
    g.lineTo(x + (rng() - 0.3) * l * 0.5, y - l);
  }
  g.stroke();
  // dashed furrow lines in the far haze band
  g.strokeStyle = 'rgba(110,104,60,0.35)';
  g.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) {
    const y = 526 + k * 4.6;
    g.beginPath();
    let x = rng() * 20;
    while (x < S) {
      const seg = 10 + rng() * 40;
      g.moveTo(x, y);
      g.lineTo(x + seg, y);
      x += seg + 6 + rng() * 30;
    }
    g.stroke();
  }
}
// cheap value noise used by the stipple shaders (deterministic)
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function kitNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const h = (a, b) => hash(a * 57.1 + b * 113.3);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
}

function paintRailway(g, rng) {
  const ry = HORIZON + 9;
  // embankment + rails
  g.fillStyle = '#b39a66';
  g.fillRect(0, ry - 1, S, 4);
  g.strokeStyle = key(0.85);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, ry - 1);
  g.lineTo(S, ry - 1);
  g.moveTo(0, ry + 2.5);
  g.lineTo(S, ry + 2.5);
  g.stroke();
  // telegraph line
  const poles = [];
  for (let x = 18; x < S; x += 86) poles.push(x + (rng() - 0.5) * 6);
  g.strokeStyle = key(0.8);
  g.lineWidth = 1.1;
  for (const x of poles) {
    g.beginPath();
    g.moveTo(x, ry - 1);
    g.lineTo(x, ry - 30);
    g.moveTo(x - 4, ry - 27);
    g.lineTo(x + 4, ry - 27);
    g.stroke();
  }
  g.lineWidth = 0.5;
  g.strokeStyle = key(0.55);
  for (let i = 0; i < poles.length - 1; i++) {
    for (const dx of [-3.5, 3.5]) {
      g.beginPath();
      g.moveTo(poles[i] + dx, ry - 27);
      g.quadraticCurveTo((poles[i] + poles[i + 1]) / 2 + dx, ry - 23, poles[i + 1] + dx, ry - 27);
      g.stroke();
    }
  }
  // the water stop: a wooden tank on a trestle, with its spout swung over the track
  const wx = 214;
  const legTop = ry - 26;
  for (const [a, b] of [
    [wx - 15, wx - 11],
    [wx + 15, wx + 11],
    [wx - 5, wx - 4],
    [wx + 5, wx + 4],
  ]) {
    beam(g, { x: a, y: ry - 1 }, { x: b, y: legTop }, 1.6, C.woodSh, 0.6);
  }
  beam(g, { x: wx - 14, y: ry - 10 }, { x: wx + 14, y: ry - 10 }, 1.2, C.woodSh, 0.5);
  beam(g, { x: wx - 14, y: ry - 1 }, { x: wx + 12, y: ry - 22 }, 1, C.woodSh, 0.5);
  beam(g, { x: wx + 14, y: ry - 1 }, { x: wx - 12, y: ry - 22 }, 1, C.woodSh, 0.5);
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(wx - 17, legTop - 26, 34, 26);
  }, C.wood, 1);
  g.strokeStyle = key(0.6);
  g.lineWidth = 0.6;
  g.beginPath();
  for (let x = wx - 13; x < wx + 17; x += 4) {
    g.moveTo(x, legTop - 26);
    g.lineTo(x, legTop);
  }
  g.stroke();
  g.strokeStyle = C.key;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(wx - 17, legTop - 18);
  g.lineTo(wx + 17, legTop - 18);
  g.moveTo(wx - 17, legTop - 7);
  g.lineTo(wx + 17, legTop - 7);
  g.stroke();
  plate(g, (gg) => {
    gg.beginPath();
    gg.moveTo(wx - 21, legTop - 26);
    gg.lineTo(wx, legTop - 40);
    gg.lineTo(wx + 21, legTop - 26);
    gg.closePath();
  }, C.red, 1);
  // spout
  g.strokeStyle = C.key;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(wx + 15, legTop - 4);
  g.lineTo(wx + 32, legTop + 4);
  g.stroke();
  // depot shed
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(wx - 78, ry - 15, 36, 14);
  }, C.ochre, 1);
  plate(g, (gg) => {
    gg.beginPath();
    gg.moveTo(wx - 82, ry - 15);
    gg.lineTo(wx - 60, ry - 26);
    gg.lineTo(wx - 38, ry - 15);
    gg.closePath();
  }, C.redDk, 1);
  g.fillStyle = C.key;
  g.fillRect(wx - 66, ry - 11, 5, 10);
}

function paintDistantHerd(g, rng) {
  const cows = [
    [668, 545, 1],
    [690, 547, -1],
    [712, 544, 1],
    [744, 548, 1],
    [104, 552, -1],
    [132, 550, 1],
  ];
  for (const [x, y, d] of cows) {
    g.save();
    g.translate(x, y);
    g.scale(d, 1);
    g.fillStyle = rng() < 0.5 ? '#6e3420' : '#5a3a26';
    g.beginPath();
    g.ellipse(0, -4, 6.5, 3.2, 0, 0, TAU);
    g.fill();
    g.fillRect(-5, -2, 1.3, 5);
    g.fillRect(4, -2, 1.3, 5);
    g.beginPath();
    g.ellipse(7.5, -2 + rng() * 2, 2.2, 1.6, 0.5, 0, TAU);
    g.fill();
    g.restore();
  }
  // a cowhand on his pony far off
  g.save();
  g.translate(150, 548);
  g.fillStyle = '#4a3020';
  g.beginPath();
  g.ellipse(0, -5, 6, 3, 0, 0, TAU);
  g.fill();
  g.fillRect(-4, -3, 1.2, 6);
  g.fillRect(4, -3, 1.2, 6);
  g.beginPath();
  g.ellipse(7, -8, 2, 3.4, 0.4, 0, TAU);
  g.fill();
  g.fillStyle = C.blue;
  g.fillRect(-1.5, -14, 3, 7);
  g.fillStyle = '#4a3020';
  g.beginPath();
  g.ellipse(0, -15.5, 3.4, 1, 0, 0, TAU);
  g.fill();
  g.restore();
}

// the scroll ribbon
const RIB = { cx: 500, cy: 1112, R: 1010, half: 27, a0: 19.4 * DEG };
function ribPt(a, r) {
  return { x: RIB.cx + r * Math.sin(a), y: RIB.cy - r * Math.cos(a) };
}
function paintRibbon(g, rng, kit) {
  // tails (behind), local frame at each band end: t outward along the tangent, n "down"
  for (const side of [-1, 1]) {
    const a = side * RIB.a0;
    const e = ribPt(a, RIB.R);
    const tx = side * Math.cos(a);
    const ty = side * Math.sin(a);
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const L = (t, n) => ({ x: e.x + tx * t + nx * n, y: e.y + ty * t + ny * n });
    const tail = [L(-18, -6), L(104, -6), L(80, 22), L(104, 50), L(-18, 50)];
    plate(g, (gg) => poly(gg, tail), C.redDk, 1.6);
    stippleIn(g, rng, (gg) => poly(gg, tail), [e.x - 130, e.y - 60, e.x + 130, e.y + 90], 2.6, (x, y) => 0.35, C.key, 0.5, 0.9);
    // fold
    const fold = [L(0, RIB.half), L(-18, 50), L(0, 50)];
    plate(g, (gg) => poly(gg, fold), '#4f1714', 1.4);
    // little text on the tails
    g.save();
    const c = L(44, 22);
    g.translate(c.x, c.y);
    g.rotate(Math.atan2(ty, tx) + (side < 0 ? Math.PI : 0));
    g.font = `700 17px ${kit.FONT.didone}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = C.ochre;
    g.fillText(side < 0 ? 'PAT.' : '1854', 0, 1);
    g.restore();
  }
  // main band
  const band = (gg) => {
    gg.beginPath();
    gg.arc(RIB.cx, RIB.cy, RIB.R + RIB.half, -Math.PI / 2 - RIB.a0, -Math.PI / 2 + RIB.a0);
    gg.arc(RIB.cx, RIB.cy, RIB.R - RIB.half, -Math.PI / 2 + RIB.a0, -Math.PI / 2 - RIB.a0, true);
    gg.closePath();
  };
  plate(g, band, C.red, 1.8);
  // stipple modelling: darker towards the lower edge and the ends
  stippleIn(g, rng, band, [120, 50, 880, 190], 2.6, (x, y) => {
    const dx = Math.abs(x - RIB.cx) / 360;
    const r = Math.hypot(x - RIB.cx, y - RIB.cy);
    return 0.06 + 0.45 * sstep(RIB.R + 4, RIB.R - RIB.half, r) * 0.6 + 0.4 * sstep(0.75, 1, dx);
  }, C.redDk, 0.5, 1.0);
  // inner pinstripes
  g.strokeStyle = C.ochre;
  g.lineWidth = 1.3;
  for (const r of [RIB.R + RIB.half - 5, RIB.R - RIB.half + 5]) {
    g.beginPath();
    g.arc(RIB.cx, RIB.cy, r, -Math.PI / 2 - RIB.a0 + 0.004, -Math.PI / 2 + RIB.a0 - 0.004);
    g.stroke();
  }
  // lettering along the arc
  const text = 'SELF-REGULATING  WIND  MILL';
  const size = 33;
  g.font = `900 ${size}px ${kit.FONT.didone}`;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const sp = 2.2;
  const chars = [...text];
  const ws = chars.map((ch) => g.measureText(ch).width);
  const total = ws.reduce((s, w) => s + w + sp, -sp);
  let s = -total / 2;
  const rr = RIB.R + 1;
  for (let i = 0; i < chars.length; i++) {
    const w = ws[i];
    const a = (s + w / 2) / rr;
    const p = ribPt(a, rr);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(a);
    g.fillStyle = C.blue;
    g.fillText(chars[i], -w / 2 + 2.6, 3);
    g.fillStyle = C.cream;
    g.fillText(chars[i], -w / 2 + 0.6, 0.6);
    g.lineWidth = 1.1;
    g.strokeStyle = C.key;
    g.strokeText(chars[i], -w / 2, 0);
    g.restore();
    s += w + sp;
  }
}

// border: double rules with corner rosettes; the sides open where the road runs through
const BD = { o: 36, gapTop: 446, gapBot: 794 };
function rosette(g, x, y, r) {
  plate(g, (gg) => {
    gg.beginPath();
    gg.arc(x, y, r, 0, TAU);
  }, C.blue, 1.2);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    plate(g, (gg) => {
      gg.beginPath();
      gg.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.36, r * 0.17, a, 0, TAU);
    }, i % 2 ? C.ochre : C.red, 0.8, C.key, 0.4);
  }
  plate(g, (gg) => {
    gg.beginPath();
    gg.arc(x, y, r * 0.24, 0, TAU);
  }, C.cream, 0.9);
}
function scrollEnd(g, x, y, dir, side) {
  // a C-scroll terminal on the side rules
  g.strokeStyle = C.red;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x, y);
  g.bezierCurveTo(x, y + dir * 14, x + side * 14, y + dir * 18, x + side * 14, y + dir * 8);
  g.bezierCurveTo(x + side * 14, y + dir * 2, x + side * 6, y + dir * 2, x + side * 6, y + dir * 8);
  g.stroke();
  g.strokeStyle = C.key;
  g.lineWidth = 0.9;
  g.stroke();
}
function paintBorder(g, kit) {
  const o = BD.o;
  const sides = (gg, inset) => {
    const a = o + inset;
    const b = S - o - inset;
    gg.beginPath();
    gg.moveTo(a, BD.gapTop);
    gg.lineTo(a, a);
    gg.lineTo(b, a);
    gg.lineTo(b, BD.gapTop);
    gg.moveTo(a, BD.gapBot);
    gg.lineTo(a, b);
    gg.lineTo(b, b);
    gg.lineTo(b, BD.gapBot);
  };
  // paper margin outside the border (covers sky bleeding into it above the gap)
  g.fillStyle = C.paper;
  g.beginPath();
  g.rect(0, 0, S, o + 2);
  g.rect(0, S - o - 2, S, o + 2);
  g.rect(0, 0, o + 2, BD.gapTop);
  g.rect(S - o - 2, 0, o + 2, BD.gapTop);
  g.rect(0, BD.gapBot, o + 2, S - BD.gapBot);
  g.rect(S - o - 2, BD.gapBot, o + 2, S - BD.gapBot);
  g.fill();
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
  g.save();
  g.translate(REG.x * 0.6, REG.y * 0.6);
  sides(g, 2);
  g.strokeStyle = C.red;
  g.lineWidth = 6;
  g.stroke();
  sides(g, 12);
  g.strokeStyle = C.ochre;
  g.lineWidth = 2.4;
  g.stroke();
  g.restore();
  sides(g, -1.5);
  g.strokeStyle = C.key;
  g.lineWidth = 1;
  g.stroke();
  sides(g, 5.5);
  g.stroke();
  sides(g, 8);
  g.lineWidth = 1.2;
  g.stroke();
  sides(g, 15.5);
  g.lineWidth = 0.8;
  g.stroke();
  for (const [x, y] of [
    [o + 6, o + 6],
    [S - o - 6, o + 6],
    [o + 6, S - o - 6],
    [S - o - 6, S - o - 6],
  ]) rosette(g, x, y, 15);
  for (const side of [-1, 1]) {
    const x = side < 0 ? o + 2 : S - o - 2;
    scrollEnd(g, x, BD.gapTop, 1, -side);
    scrollEnd(g, x, BD.gapBot, -1, -side);
  }
}

// -----------------------------------------------------------------------------
// TOWER (baked in two layers around the moving pump rod)
// -----------------------------------------------------------------------------
const LEVELS = [0.02, 0.22, 0.43, 0.63, 0.81, 0.96].map((f) => f * TOWER.H);
function faceMembers(k) {
  const k2 = (k + 1) % 4;
  const out = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const y = LEVELS[i];
    out.push([corner(k, y), corner(k2, y), 3.2]);
    if (i < LEVELS.length - 1) {
      const y2 = LEVELS[i + 1];
      out.push([corner(k, y), corner(k2, y2), 2.2]);
      out.push([corner(k2, y), corner(k, y2), 2.2]);
    }
  }
  return out;
}
function paintTowerShadow(g, rng) {
  // cast shadow on the prairie, falling to the right and back (sun upper-left)
  const pts = [P(-70, 0, 20), P(30, 0, 80), P(260, 0, -60), P(200, 0, -110)];
  stippleIn(g, rng, (gg) => poly(gg, pts), [500, 560, 900, 700], 2.6, () => 0.45, C.greenDk, 0.6, 1.1);
}
function paintTowerBack(g, rng, kit) {
  // tail vane + booms (behind the head)
  paintTail(g, kit);
  // back faces (1, 2) and the back leg
  for (const k of [1, 2]) for (const [a, b, w] of faceMembers(k)) beam(g, PV(a), PV(b), w * 0.9, C.woodDk, 1.1);
  beam(g, PV(corner(2, 0)), PV(corner(2, TOWER.H)), 5.5, C.woodDk, 1.2);
  // the pump standard at the foot of the rod, spout turned to the tank
  const px = PUMP.x;
  g.lineCap = 'butt';
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(px - 6, PUMP.top + 4, 12, 640 - PUMP.top - 4);
  }, C.iron, 1.2);
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(px, 640, 12, 4, 0, 0, TAU);
  }, C.iron, 1.2);
  // air chamber / cylinder head
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(px, PUMP.top + 4, 8, 3, 0, 0, TAU);
    gg.rect(px - 8, PUMP.top + 4, 16, 12);
  }, C.red, 1.1);
  // spout pipe
  g.strokeStyle = C.key;
  g.lineWidth = 7.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(px - 4, PUMP.top + 14);
  g.lineTo(SPOUT.x + 4, SPOUT.y - 6);
  g.lineTo(SPOUT.x, SPOUT.y);
  g.stroke();
  g.strokeStyle = C.iron;
  g.lineWidth = 4.5;
  g.stroke();
  g.strokeStyle = 'rgba(255,240,210,0.35)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(px - 4, PUMP.top + 12);
  g.lineTo(SPOUT.x + 6, SPOUT.y - 8);
  g.stroke();
}
function paintTail(g, kit) {
  const D = mul3(UPW, -1);
  const at = (d, y) => PV(add3(v3(0, y, 0), mul3(D, d)));
  // two booms converging on the vane
  beam(g, at(4, TOWER.H + 30), at(214, TOWER.H + 50), 3.2, C.woodSh, 1.1);
  beam(g, at(4, TOWER.H + 14), at(150, TOWER.H - 4), 2.6, C.woodSh, 1.1);
  beam(g, at(70, TOWER.H + 37), at(70, TOWER.H + 7), 1.6, C.woodSh, 0.9);
  // the vane: a vertical board panel in the plane of the wind
  const v = [at(124, TOWER.H - 8), at(222, TOWER.H - 8), at(226, TOWER.H + 62), at(132, TOWER.H + 48)];
  plate(g, (gg) => poly(gg, v), C.cream, 1.6);
  const inner = [at(132, TOWER.H - 1), at(215, TOWER.H - 1), at(219, TOWER.H + 54), at(139, TOWER.H + 42)];
  plate(g, (gg) => poly(gg, inner), C.red, 1.1);
  // boards
  g.strokeStyle = key(0.45);
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 1; i < 5; i++) {
    const y = TOWER.H - 8 + i * 13;
    const a = at(126, y);
    const b = at(224, y + i * 2.8);
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
  }
  g.stroke();
  // painted lettering in the vane's own perspective
  const o = at(176, TOWER.H + 24);
  const ax = sub3(at(177, TOWER.H + 24), o); // per unit along D (screen dx, dy)
  const ay = { x: 0, y: TW.pc };
  g.save();
  g.setTransform(ax.x, ax.y, ay.x, ay.y, o.x, o.y);
  g.font = `900 22px ${kit.FONT.didone}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = C.cream;
  g.fillText('1854', 0, 0);
  g.restore();
}
function paintTowerFront(g, rng, kit) {
  // legs (left, right, front)
  for (const k of [1, 3, 0]) {
    const col = k === 3 ? C.woodSh : C.wood;
    beam(g, PV(corner(k, 0)), PV(corner(k, TOWER.H)), 6.2, col, 1.3);
    // foot block
    const f = PV(corner(k, 0));
    plate(g, (gg) => {
      gg.beginPath();
      gg.rect(f.x - 7, f.y - 4, 14, 7);
    }, C.woodDk, 1);
  }
  // front faces: 0 (front-left, sunlit) and 3 (front-right, in shade)
  for (const k of [3, 0]) {
    const col = k === 3 ? C.woodSh : C.wood;
    for (const [a, b, w] of faceMembers(k)) beam(g, PV(a), PV(b), w, col, 1.1);
  }
  // re-stroke the front leg over the braces
  beam(g, PV(corner(0, 0)), PV(corner(0, TOWER.H)), 6.4, C.wood, 1.3);
  // ladder cleats nailed up the front leg
  for (let y = 18; y < TOWER.H - 10; y += 15) {
    const c = corner(0, y);
    const a = PV(add3(c, v3(-7, 0, 2)));
    const b = PV(add3(c, v3(7, 0, -2)));
    beam(g, a, b, 1.8, C.woodSh, 0.8);
  }
  // platform below the head
  const py = TOWER.H - 4;
  const pr = 36;
  const pc = [0, 1, 2, 3].map((k) => {
    const a = TOWER.yaw + Math.PI / 4 + (k * Math.PI) / 2;
    return P(pr * Math.SQRT2 * Math.cos(a), py, pr * Math.SQRT2 * Math.sin(a));
  });
  // knee braces from the legs to the platform rim
  for (const k of [1, 3, 0]) {
    const lg = PV(corner(k, TOWER.H - 40));
    beam(g, lg, pc[k], 2, C.woodSh, 0.9);
  }
  plate(g, (gg) => poly(gg, pc), C.wood, 1.3);
  g.strokeStyle = key(0.5);
  g.lineWidth = 0.7;
  g.beginPath();
  for (let i = 1; i < 7; i++) {
    const u = i / 7;
    const a = { x: lerp(pc[1].x, pc[0].x, u), y: lerp(pc[1].y, pc[0].y, u) };
    const b = { x: lerp(pc[2].x, pc[3].x, u), y: lerp(pc[2].y, pc[3].y, u) };
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
  }
  g.stroke();
  // platform edge thickness (front)
  plate(g, (gg) => poly(gg, [pc[1], pc[0], pc[3], { x: pc[3].x, y: pc[3].y + 5 }, { x: pc[0].x, y: pc[0].y + 5 }, { x: pc[1].x, y: pc[1].y + 5 }]), C.woodSh, 1.1);
  // head: turntable ring + crank housing, shaft forward to the hub
  const tt = P(0, TOWER.H + 4, 0);
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(tt.x, tt.y, 17, 5.5, 0, 0, TAU);
    gg.rect(tt.x - 17, tt.y - 6, 34, 6);
    gg.ellipse(tt.x, tt.y - 6, 17, 5.5, 0, 0, TAU);
  }, C.iron, 1.1);
  // housing box along the shaft axis
  const box = (d, y, s) => PV(add3(add3(v3(0, y, 0), mul3(UPW, d)), mul3(E2, s)));
  const top = [box(-16, TOWER.H + 36, -8), box(22, TOWER.H + 36, -8), box(22, TOWER.H + 36, 8), box(-16, TOWER.H + 36, 8)];
  const side = [box(-16, TOWER.H + 36, 8), box(22, TOWER.H + 36, 8), box(22, TOWER.H + 8, 8), box(-16, TOWER.H + 8, 8)];
  const front = [box(22, TOWER.H + 36, -8), box(22, TOWER.H + 36, 8), box(22, TOWER.H + 8, 8), box(22, TOWER.H + 8, -8)];
  plate(g, (gg) => poly(gg, side), C.redDk, 1.2);
  plate(g, (gg) => poly(gg, front), C.red, 1.2);
  plate(g, (gg) => poly(gg, top), C.redLt, 1.2);
  // the shaft
  const s0 = PV(add3(HEAD, mul3(UPW, 20)));
  const s1 = PV(HUB);
  beam(g, s0, s1, 5, C.iron, 1);
}

// -----------------------------------------------------------------------------
// TANK + CATTLE (baked)
// -----------------------------------------------------------------------------
function paintTank(g, rng) {
  const { x, y, rx, ry, h } = TANK;
  // ground shadow
  stippleIn(g, rng, (gg) => {
    gg.beginPath();
    gg.ellipse(x + 22, y + h + 4, rx + 16, ry + 6, 0, 0, TAU);
  }, [x - 120, y, x + 140, y + h + 40], 2.4, () => 0.5, C.greenDk, 0.6, 1.1);
  // wall (staves)
  const wall = (gg) => {
    gg.beginPath();
    gg.ellipse(x, y, rx, ry, 0, 0, Math.PI);
    gg.lineTo(x - rx, y + h);
    gg.ellipse(x, y + h, rx, ry, 0, Math.PI, 0, true);
    gg.closePath();
  };
  plate(g, wall, C.wood, 1.5);
  // stipple modelling across the cylinder (light from the left)
  stippleIn(g, rng, wall, [x - rx - 4, y - 4, x + rx + 4, y + h + ry + 4], 2.3, (px) => {
    const u = (px - x) / rx;
    return 0.08 + 0.7 * sstep(-0.1, 1, u) + 0.35 * sstep(-0.7, -1, u);
  }, C.woodDk, 0.5, 1.05);
  // staves
  g.strokeStyle = key(0.55);
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 1; i < 22; i++) {
    const a = Math.PI * (i / 22);
    const sx = x + rx * Math.cos(a);
    const sy = y + ry * Math.sin(a);
    g.moveTo(sx, sy);
    g.lineTo(sx, sy + h);
  }
  g.stroke();
  // iron hoops
  for (const f of [0.22, 0.62, 0.92]) {
    g.strokeStyle = C.key;
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(x, y + h * f, rx + 0.5, ry, 0, 0.02, Math.PI - 0.02);
    g.stroke();
    g.strokeStyle = 'rgba(255,230,190,0.25)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(x, y + h * f - 1.2, rx + 0.5, ry, 0, 0.3, Math.PI * 0.6);
    g.stroke();
  }
  // rim + water
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(x, y, rx, ry, 0, 0, TAU);
  }, C.woodSh, 1.4);
  const water = (gg) => {
    gg.beginPath();
    gg.ellipse(x, y + 4, rx - 5, ry - 3.5, 0, 0, TAU);
  };
  plate(g, water, C.water, 1);
  stippleIn(g, rng, water, [x - rx, y - ry, x + rx, y + ry + 6], 2.4, (px, py) => 0.55 * sstep(y + 14, y - 14, py), C.blue, 0.5, 1.0);
  stippleIn(g, rng, water, [x - rx, y - ry, x + rx, y + ry + 6], 2.6, (px, py) => 0.4 * sstep(y - 2, y + 18, py) * sstep(x + 40, x - 40, px), C.waterLt, 0.6, 1.1);
  // inner wall visible at the back of the rim
  g.save();
  g.beginPath();
  g.ellipse(x, y, rx - 1, ry - 1, 0, Math.PI, TAU);
  g.ellipse(x, y + 4, rx - 5, ry - 3.5, 0, TAU, Math.PI, true);
  g.closePath();
  g.fillStyle = C.woodDk;
  g.fill();
  g.restore();
}

/** A cow's body in profile (local: origin between the hooves on the ground, facing +x). */
function paintCowBody(g, rng, o) {
  g.save();
  g.translate(o.x, o.y);
  g.scale(o.dir * o.s, o.s);
  const legs = (far) => {
    const col = far ? o.legFar : o.leg;
    const sets = far
      ? [
          [-50, -40, -46, 0],
          [36, -40, 40, 0],
        ]
      : [
          [-60, -42, -60, 0],
          [44, -42, 48, 0],
        ];
    for (const [x0, y0, x1, y1] of sets) {
      const hock = x0 < 0 ? -6 : 2;
      const p = [
        { x: x0 - 7, y: y0 },
        { x: x0 + 7, y: y0 },
        { x: lerp(x0, x1, 0.55) + 4 + hock, y: -18 },
        { x: x1 + 3.4, y: y1 - 4 },
        { x: x1 - 3.4, y: y1 - 4 },
        { x: lerp(x0, x1, 0.55) - 4 + hock, y: -18 },
      ];
      plate(g, (gg) => poly(gg, p), col, 1.3);
      plate(g, (gg) => {
        gg.beginPath();
        gg.moveTo(x1 - 4, y1 - 5);
        gg.lineTo(x1 + 4.5, y1 - 5);
        gg.lineTo(x1 + 5, y1);
        gg.lineTo(x1 - 4.5, y1);
        gg.closePath();
      }, C.key, 0);
    }
  };
  legs(true);
  const body = (gg) => {
    gg.beginPath();
    gg.moveTo(30, -84);
    gg.bezierCurveTo(8, -88, -30, -80, -54, -82);
    gg.bezierCurveTo(-66, -82, -72, -76, -72, -62);
    gg.bezierCurveTo(-72, -50, -68, -44, -62, -38);
    gg.bezierCurveTo(-40, -32, 10, -30, 40, -36);
    gg.bezierCurveTo(52, -38, 60, -46, 60, -56);
    gg.bezierCurveTo(58, -70, 46, -80, 30, -84);
    gg.closePath();
  };
  plate(g, body, o.coat, 1.6);
  // patches
  if (o.patches) {
    g.save();
    body(g);
    g.clip();
    for (const [px, py, pr, sq] of o.patches) {
      g.save();
      g.translate(REG.x, REG.y);
      g.fillStyle = o.patch;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * TAU;
        const rr = pr * (0.75 + 0.35 * hash(px * 3.1 + i * 1.7));
        const xx = px + Math.cos(a) * rr;
        const yy = py + Math.sin(a) * rr * sq;
        if (i === 0) g.moveTo(xx, yy);
        else g.lineTo(xx, yy);
      }
      g.fill();
      g.restore();
    }
    g.restore();
  }
  // belly stipple, back-line highlight
  stippleIn(g, rng, body, [-80, -95, 70, -25], 2.4, (x, y) => 0.6 * sstep(-58, -32, y) + 0.25 * sstep(-40, -72, x), o.shade, 0.5, 1.0);
  if (o.whiteBelly) {
    g.save();
    body(g);
    g.clip();
    g.fillStyle = o.whiteBelly;
    g.beginPath();
    g.ellipse(-10, -30, 46, 8, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  body(g);
  g.lineWidth = 1.6;
  g.strokeStyle = C.key;
  g.stroke();
  // ribs / hip bone accents
  g.strokeStyle = key(0.45);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-50, -78);
  g.quadraticCurveTo(-44, -70, -48, -60);
  g.moveTo(8, -70);
  g.quadraticCurveTo(14, -58, 10, -46);
  g.stroke();
  legs(false);
  g.restore();
}

function paintLonghorn(g, rng) {
  paintCowBody(g, rng, {
    x: 300,
    y: 668,
    s: 1,
    dir: 1,
    coat: C.hideCream,
    patch: C.hide,
    patches: [
      [-40, -64, 18, 0.9],
      [12, -76, 14, 0.7],
      [42, -60, 16, 1],
      [-66, -54, 10, 1.2],
    ],
    shade: '#8a6a44',
    leg: C.hideCream,
    legFar: '#c9b08a',
  });
  // ground shadow
  stippleIn(g, rng, (gg) => {
    gg.beginPath();
    gg.ellipse(304, 669, 70, 6, 0, 0, TAU);
  }, [220, 660, 390, 680], 2.2, () => 0.5, C.greenDk, 0.5, 1);
}

function paintHereford(g, rng) {
  const o = { x: 858, y: 676, s: 0.92, dir: -1 };
  stippleIn(g, rng, (gg) => {
    gg.beginPath();
    gg.ellipse(o.x - 4, o.y + 1, 66, 6, 0, 0, TAU);
  }, [780, 668, 940, 690], 2.2, () => 0.5, C.greenDk, 0.5, 1);
  paintCowBody(g, rng, {
    ...o,
    coat: '#93391f',
    patch: '#93391f',
    patches: null,
    shade: '#4c1a0f',
    whiteBelly: '#f1e6cc',
    leg: '#93391f',
    legFar: '#6d2a17',
  });
  // white-faced head down in the grass (static)
  drawCowHead(g, {
    anchor: { x: 792, y: 638 },
    yaw: 168 * DEG,
    pitch: 72 * DEG,
    scale: 0.88,
    coat: '#93391f',
    face: '#f3e9d0',
    muzzle: '#e6c2a2',
    horns: 'short',
    neckFrom: [
      { x: 832, y: 598 },
      { x: 806, y: 618 },
      { x: 812, y: 640 },
    ],
    neckCol: '#93391f',
    blink: 0,
  });
  // grass hiding the muzzle
  g.strokeStyle = C.greenDk;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 18; i++) {
    const x = 770 + i * 3.4 + (hash(i) - 0.5) * 3;
    g.moveTo(x, 676);
    g.lineTo(x + (hash(i + 9) - 0.5) * 6, 662 - hash(i + 3) * 8);
  }
  g.stroke();
}

// -----------------------------------------------------------------------------
// COW HEAD (2.5-D loft so it can turn to follow the rider)
// -----------------------------------------------------------------------------
// rings along the snout: [forward d, up c, half-width a, half-height b]
const HEAD_RINGS = [
  [-4, 1, 9.5, 9.5],
  [7, 0.5, 10.5, 9.5],
  [18, -3.5, 7.4, 7.6],
  [28, -6, 7, 6.4],
  [33, -6.5, 6, 5.2],
];
function headBasis(yaw, pitch) {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const F = v3(Math.cos(yaw) * cp, -sp, Math.sin(yaw) * cp);
  const U = v3(Math.cos(yaw) * sp, cp, Math.sin(yaw) * sp);
  const Sd = v3(-Math.sin(yaw), 0, Math.cos(yaw)); // the cow's own left when facing +x
  return { F, U, Sd };
}
function drawCowHead(g, o) {
  const { F, U, Sd } = headBasis(o.yaw, o.pitch);
  const k = o.scale || 1;
  const A = o.anchor;
  const pt = (d, c, s) => {
    const x = (F.x * d + U.x * c + Sd.x * s) * k;
    const y = (F.y * d + U.y * c + Sd.y * s) * k;
    const z = (F.z * d + U.z * c + Sd.z * s) * k;
    return { x: A.x + x, y: A.y - y * 0.954 + z * 0.3, z };
  };
  const rings = HEAD_RINGS.map(([d, c, a, b]) => {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * TAU;
      pts.push(pt(d, c + b * Math.sin(t), a * Math.cos(t)));
    }
    return pts;
  });
  const hulls = [];
  for (let i = 0; i < rings.length - 1; i++) hulls.push(hull(rings[i].concat(rings[i + 1])));
  const muzzleHull = hull(rings[3].concat(rings[4]));
  // horns & ears: which side is far?
  const nearSide = Sd.z >= 0 ? 1 : -1;
  const hornPts = (side) =>
    (o.horns === 'short'
      ? [
          [3, 7, 7],
          [3, 9, 13],
          [7, 11, 17],
          [12, 10, 18],
        ]
      : [
          [3, 7, 7],
          [2, 8.5, 18],
          [0, 11, 30],
          [3, 17, 41],
          [8, 23, 46],
        ]
    ).map(([d, c, s]) => pt(d, c, s * side));
  const ear = (side) => [pt(4, 3, 9 * side), pt(8, -1, 20 * side), pt(12, 1.5, 17 * side), pt(10, 4, 9 * side)];
  const drawHorn = (side) => {
    const p = hornPts(side);
    const n = p.length;
    g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n - 1; i++) {
        const w = lerp(5.6, 1.6, i / (n - 1)) * k;
        g.strokeStyle = pass === 0 ? C.key : i >= n - 2 ? '#6b5236' : '#efe3c0';
        g.lineWidth = pass === 0 ? w + 2.4 : w;
        g.beginPath();
        g.moveTo(p[i].x, p[i].y);
        g.lineTo(p[i + 1].x, p[i + 1].y);
        g.stroke();
      }
    }
  };
  const drawEar = (side) => {
    const e = ear(side);
    plate(g, (gg) => poly(gg, e), o.coat, 1.2, C.key, 0.5);
    g.fillStyle = '#d9a083';
    g.beginPath();
    const c = { x: (e[0].x + e[1].x + e[2].x) / 3, y: (e[0].y + e[1].y + e[2].y) / 3 };
    g.ellipse(c.x, c.y, 2.4 * k, 1.4 * k, Math.atan2(e[1].y - e[0].y, e[1].x - e[0].x), 0, TAU);
    g.fill();
  };
  drawHorn(-nearSide);
  drawEar(-nearSide);
  // neck (hull of the shoulder points + the back ring), then the head loft; key first, fill after
  const neck = o.neckFrom ? hull(o.neckFrom.concat(rings[0], rings[1].slice(0, 6))) : null;
  g.lineJoin = 'round';
  g.strokeStyle = C.key;
  g.lineWidth = 3.2;
  if (neck) {
    poly(g, neck);
    g.stroke();
  }
  for (const h of hulls) {
    poly(g, h);
    g.stroke();
  }
  g.save();
  g.translate(REG.x * 0.6, REG.y * 0.6);
  if (neck) {
    g.fillStyle = o.neckCol || o.coat;
    poly(g, neck);
    g.fill();
  }
  g.fillStyle = o.coat;
  for (const h of hulls) {
    poly(g, h);
    g.fill();
  }
  // white face (Hereford) or cream blaze
  if (o.face) {
    g.fillStyle = o.face;
    const f = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const d = lerp(0, 33, i / n);
      const w = lerp(8, 5.5, i / n);
      f.push(pt(d, lerp(9, -1, i / n), w));
    }
    for (let i = n; i >= 0; i--) {
      const d = lerp(0, 33, i / n);
      const w = lerp(8, 5.5, i / n);
      f.push(pt(d, lerp(9, -1, i / n), -w));
    }
    poly(g, hull(f.concat(rings[4])));
    g.fill();
  }
  g.fillStyle = o.muzzle;
  poly(g, muzzleHull);
  g.fill();
  g.restore();
  // muzzle key line
  g.strokeStyle = key(0.7);
  g.lineWidth = 1;
  poly(g, muzzleHull);
  g.stroke();
  // eyes
  for (const side of [-1, 1]) {
    const vis = Sd.z * side;
    if (vis < -0.3) continue;
    const e = pt(8.5, 2, 10.2 * side);
    const blink = o.blink || 0;
    g.fillStyle = C.key;
    g.beginPath();
    g.ellipse(e.x, e.y, 2.3 * k, 2.3 * k * (1 - blink * 0.85), 0, 0, TAU);
    g.fill();
    if (blink < 0.5) {
      g.fillStyle = '#fff6e0';
      g.beginPath();
      g.arc(e.x - 0.6, e.y - 0.7, 0.7, 0, TAU);
      g.fill();
    }
  }
  // nostrils
  if (F.z > -0.35) {
    for (const side of [-1, 1]) {
      const vis = F.z + Sd.z * side * 0.6;
      if (vis < -0.2) continue;
      const n = pt(33.5, -6.5, 2.6 * side);
      g.fillStyle = C.key;
      g.beginPath();
      g.ellipse(n.x, n.y, 1.4 * k, 1.0 * k, 0, 0, TAU);
      g.fill();
    }
  }
  drawEar(nearSide);
  drawHorn(nearSide);
}

// -----------------------------------------------------------------------------
// ROAD, FOREGROUND, BOTTOM BAND (baked)
// -----------------------------------------------------------------------------
function paintRoad(g, rng) {
  const y0 = 686;
  const y1 = 734;
  g.save();
  g.translate(REG.x, REG.y * 0.5);
  g.fillStyle = C.dirt;
  g.fillRect(0, y0, S, y1 - y0);
  g.restore();
  stipple(g, rng, 0, y0, S, y1, 2.6, (x, y) => 0.12 + 0.4 * sstep(y0 + 12, y0, y) + 0.3 * sstep(y1 - 10, y1, y) + 0.12 * kitNoise(x * 0.03, y * 0.2), C.dirtDk, 0.5, 1.05);
  // wheel ruts
  g.strokeStyle = key(0.5);
  g.lineWidth = 1.1;
  for (const ry of [697, 703, 716, 722]) {
    g.beginPath();
    let x = 0;
    g.moveTo(0, ry);
    while (x < S) {
      x += 20;
      g.lineTo(x, ry + (rng() - 0.5) * 1.2);
    }
    g.stroke();
  }
  // pebbles
  g.fillStyle = key(0.55);
  for (let i = 0; i < 90; i++) {
    g.beginPath();
    g.ellipse(rng() * S, y0 + 4 + rng() * (y1 - y0 - 8), 1 + rng() * 1.6, 0.6 + rng() * 0.6, 0, 0, TAU);
    g.fill();
  }
  // grass lip along the back edge of the road
  g.strokeStyle = C.greenDk;
  g.lineWidth = 1.1;
  g.beginPath();
  for (let x = 0; x < S; x += 2.5 + rng() * 3) {
    g.moveTo(x, y0 + 1);
    g.lineTo(x + (rng() - 0.4) * 4, y0 - 2 - rng() * 6);
  }
  g.stroke();
  g.strokeStyle = C.key;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, y0);
  g.lineTo(S, y0);
  g.moveTo(0, y1);
  g.lineTo(S, y1);
  g.stroke();
}

function paintForeground(g, rng, kit) {
  const y0 = 734;
  const y1 = BD.gapBot + 2;
  g.save();
  g.translate(REG.x, REG.y);
  g.fillStyle = C.greenMd;
  g.fillRect(0, y0, S, y1 - y0);
  g.restore();
  stipple(g, rng, 0, y0, S, y1, 2.6, (x, y) => 0.25 + 0.4 * sstep(y0 + 30, y1, y) + 0.2 * kitNoise(x * 0.02, y * 0.1), C.greenDk, 0.5, 1.1);
  // grass strokes
  g.lineWidth = 1.3;
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass === 0 ? C.greenDk : '#b9c467';
    g.beginPath();
    for (let i = 0; i < 520; i++) {
      const x = rng() * S;
      const y = y0 + 4 + rng() * (y1 - y0 - 4);
      const l = 6 + rng() * 14;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rng() - 0.3) * 6, y - l * 0.6, x + (rng() - 0.2) * 10, y - l);
    }
    g.stroke();
    g.lineWidth = 0.9;
  }
  // prairie wildflowers: blanket flowers (red/yellow) and coneflowers
  for (let i = 0; i < 26; i++) {
    const x = 60 + rng() * 880;
    const y = y0 + 12 + rng() * (y1 - y0 - 18);
    const r = 3 + rng() * 2.2;
    const red = rng() < 0.5;
    for (let p = 0; p < 8; p++) {
      const a = (p * TAU) / 8;
      g.fillStyle = red ? C.red : C.ochre;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * r + REG.x * 0.5, y + Math.sin(a) * r * 0.6 + REG.y * 0.5, r * 0.6, r * 0.32, a, 0, TAU);
      g.fill();
    }
    g.fillStyle = red ? C.ochre : C.brown;
    g.beginPath();
    g.arc(x, y, r * 0.42, 0, TAU);
    g.fill();
    g.strokeStyle = key(0.7);
    g.lineWidth = 0.6;
    g.stroke();
  }
}

function medallion(g, kit, x, y, l1, l2, zh) {
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(x, y, 74, 44, 0, 0, TAU);
  }, C.blue, 1.6);
  g.strokeStyle = C.ochre;
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y, 66, 37, 0, 0, TAU);
  g.stroke();
  g.strokeStyle = C.cream;
  g.lineWidth = 0.8;
  g.beginPath();
  g.ellipse(x, y, 62, 33.5, 0, 0, TAU);
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = C.cream;
  if (zh) {
    g.font = `900 21px ${kit.FONT.serif}`;
    g.fillText(l1, x, y - 11);
    g.fillText(l2, x, y + 13);
  } else {
    g.font = `700 15px ${kit.FONT.didone}`;
    g.fillText(l1, x, y - 12);
    g.font = `900 26px ${kit.FONT.didone}`;
    g.fillStyle = C.ochre;
    g.fillText(l2, x, y + 10);
  }
}

function paintBottomBand(g, rng, kit) {
  const y0 = BD.gapBot + 2;
  const y1 = S - BD.o - 16;
  const x0 = BD.o + 16;
  const x1 = S - BD.o - 16;
  // tablet
  g.fillStyle = C.paperLt;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  stipple(g, rng, x0, y0, x1, y1, 3, (x, y) => 0.1 + 0.18 * sstep(y0 + 60, y1, y), C.ochre, 0.5, 1);
  // separating rule with a centre ornament
  g.save();
  g.translate(REG.x * 0.6, REG.y * 0.6);
  g.fillStyle = C.red;
  g.fillRect(0, y0 - 3, S, 6);
  g.restore();
  g.strokeStyle = C.key;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, y0 - 4);
  g.lineTo(S, y0 - 4);
  g.moveTo(0, y0 + 4);
  g.lineTo(S, y0 + 4);
  g.stroke();
  // Chinese headline in fat Victorian manner: blue shadow, red face, key outline
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `900 64px ${kit.FONT.serif}`;
  const zh = '自調式汲水風車';
  const cy = y0 + 84;
  g.fillStyle = C.blue;
  g.fillText(zh, 500 + 4, cy + 4);
  g.fillStyle = C.red;
  g.fillText(zh, 500 + 1, cy + 1);
  g.lineWidth = 1.4;
  g.strokeStyle = C.key;
  g.strokeText(zh, 500, cy);
  // gold inline highlight
  g.save();
  g.beginPath();
  g.rect(0, cy - 60, S, 22);
  g.clip();
  g.fillStyle = 'rgba(217,160,63,0.55)';
  g.fillText(zh, 500 + 1, cy + 1);
  g.restore();
  // small lines
  g.font = `italic 700 17px ${kit.FONT.didone}`;
  g.fillStyle = C.blue;
  g.fillText('For Stock Ranches, Farms & Railroad Water Stations.', 500, cy + 34);
  g.font = `500 15px ${kit.FONT.serif}`;
  g.fillStyle = C.brown;
  g.fillText('強風自動收翼 · 尾舵永遠迎風 · 日夜汲水不息', 500, cy + 58);
  // flourishes
  g.strokeStyle = C.red;
  g.lineWidth = 2;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(500 + s * 250, cy + 28);
    g.bezierCurveTo(500 + s * 290, cy + 14, 500 + s * 300, cy + 44, 500 + s * 330, cy + 30);
    g.stroke();
  }
  medallion(g, kit, 160, y0 + 72, 'PATENTED', '1854', false);
  medallion(g, kit, 840, y0 + 72, '自動', '迎風', true);
}

// -----------------------------------------------------------------------------
// DYNAMIC PIECES
// -----------------------------------------------------------------------------
function drawDistantMill(ctx, T) {
  const x = 902;
  const by = HORIZON + 6;
  const hy = by - 54;
  ctx.strokeStyle = key(0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 7, by);
  ctx.lineTo(x - 1.5, hy + 4);
  ctx.moveTo(x + 7, by);
  ctx.lineTo(x + 1.5, hy + 4);
  for (let i = 1; i < 4; i++) {
    const y = by - i * 13;
    const w = 7 - i * 1.4;
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + w, y);
  }
  ctx.moveTo(x, hy);
  ctx.lineTo(x + 14, hy - 3);
  ctx.stroke();
  ctx.fillStyle = C.red;
  ctx.fillRect(x + 11, hy - 8, 6, 8);
  const a0 = -TAU * 0.9 * T;
  ctx.strokeStyle = key(0.85);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = a0 + (i * TAU) / 14;
    ctx.moveTo(x - 1 + Math.cos(a) * 3 * 0.6, hy + Math.sin(a) * 3);
    ctx.lineTo(x - 1 + Math.cos(a) * 12 * 0.6, hy + Math.sin(a) * 12);
  }
  ctx.stroke();
}

function drawTrain(ctx, T, sprite) {
  const x = trainX(T);
  const ry = HORIZON + 9;
  // smoke: puffs born every 0.32 s at the stack, drifting downwind
  const moving = T < -1 || T > 3.6;
  for (let k = Math.floor((T - 3.2) / 0.32); k <= Math.floor(T / 0.32); k++) {
    const tb = k * 0.32;
    const age = T - tb;
    if (age < 0 || age > 3.2) continue;
    const sx = trainX(tb) + 47;
    const rise = moving || tb > 3.6 || tb < -1 ? 34 : 18;
    const px = sx + age * 16 + Math.sin(k * 1.7) * 3;
    const py = ry - 25 - rise * Math.sqrt(age) - age * 3;
    const r = 2.5 + age * 4.2;
    const a = 0.85 * (1 - age / 3.2);
    if (px < -40 || px > S + 40) continue;
    ctx.fillStyle = `rgba(238,232,214,${a})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(${KEY_RGB},${a * 0.4})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  if (x > -200 && x < S + 20) ctx.drawImage(sprite, Math.round(x - 168), ry - 31);
}

function paintTrainSprite(g) {
  // facing right; sprite 176 x 34, rails at y = 31; loco front at x = 168
  const R = 31;
  const car = (x0, col) => {
    plate(g, (gg) => {
      gg.beginPath();
      gg.rect(x0, R - 19, 40, 14);
    }, col, 1);
    plate(g, (gg) => {
      gg.beginPath();
      gg.moveTo(x0 - 2, R - 19);
      gg.quadraticCurveTo(x0 + 20, R - 25, x0 + 42, R - 19);
      gg.closePath();
    }, C.redDk, 1);
    g.fillStyle = C.key;
    for (let i = 0; i < 6; i++) g.fillRect(x0 + 4 + i * 6, R - 16, 3, 4);
    g.beginPath();
    g.arc(x0 + 8, R - 3, 3, 0, TAU);
    g.arc(x0 + 32, R - 3, 3, 0, TAU);
    g.fill();
  };
  car(2, C.ochre);
  car(46, C.ochre);
  // tender
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(91, R - 15, 22, 11);
  }, C.red, 1);
  g.fillStyle = C.key;
  g.beginPath();
  g.arc(96, R - 3, 3, 0, TAU);
  g.arc(108, R - 3, 3, 0, TAU);
  g.fill();
  // locomotive: cab, boiler, dome, balloon stack, cowcatcher
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(115, R - 24, 14, 19);
  }, C.red, 1);
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(113, R - 26, 18, 3);
  }, C.key, 0);
  plate(g, (gg) => {
    gg.beginPath();
    gg.rect(129, R - 18, 32, 10);
  }, C.blue, 1);
  plate(g, (gg) => {
    gg.beginPath();
    gg.ellipse(143, R - 19, 4, 4, 0, Math.PI, 0);
  }, C.ochre, 0.8);
  plate(g, (gg) => {
    gg.beginPath();
    gg.moveTo(153, R - 18);
    gg.lineTo(151, R - 26);
    gg.lineTo(149, R - 30);
    gg.lineTo(161, R - 30);
    gg.lineTo(159, R - 26);
    gg.lineTo(157, R - 18);
    gg.closePath();
  }, C.key, 0.6);
  plate(g, (gg) => {
    gg.beginPath();
    gg.moveTo(161, R - 8);
    gg.lineTo(170, R - 1);
    gg.lineTo(161, R - 1);
    gg.closePath();
  }, C.red, 0.8);
  g.fillStyle = C.ochre;
  g.fillRect(161, R - 17, 3, 3);
  g.fillStyle = C.key;
  g.beginPath();
  g.arc(124, R - 5, 5, 0, TAU);
  g.arc(138, R - 5, 5, 0, TAU);
  g.arc(152, R - 3, 3, 0, TAU);
  g.arc(158, R - 3, 3, 0, TAU);
  g.fill();
  g.fillStyle = C.red;
  g.beginPath();
  g.arc(124, R - 5, 2.6, 0, TAU);
  g.arc(138, R - 5, 2.6, 0, TAU);
  g.fill();
}

function drawPumpRod(ctx, T) {
  const lift = rodLift(T);
  const x = PUMP.x;
  const yTop = TW.oy - (TOWER.H + 6) * TW.pc;
  const yBot = PUMP.top + 4;
  // wooden pump rod: it slides, so its joints move with it
  ctx.lineCap = 'butt';
  ctx.strokeStyle = C.key;
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBot - lift);
  ctx.stroke();
  ctx.strokeStyle = C.wood;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x + 0.8, yTop);
  ctx.lineTo(x + 0.8, yBot - lift);
  ctx.stroke();
  // iron couplings / guide straps
  ctx.fillStyle = C.iron;
  for (let i = 0; i < 4; i++) {
    const y = yTop + 50 + i * 78 - lift;
    ctx.fillRect(x - 3.6, y, 7.2, 5);
  }
  // polished rod + crosshead into the pump
  ctx.strokeStyle = C.iron;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, yBot - lift);
  ctx.lineTo(x, yBot + 3);
  ctx.stroke();
  ctx.fillStyle = C.iron;
  ctx.fillRect(x - 6, yBot - 3 - lift, 12, 3.5);
  // the hand lever on the pump head rocks with the stroke
  const piv = { x: x + 9, y: yBot + 4 };
  const ang = -0.35 + lift * 0.045;
  ctx.strokeStyle = C.key;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 1, yBot - 1 - lift);
  ctx.lineTo(piv.x, piv.y);
  ctx.lineTo(piv.x + Math.cos(ang) * 26, piv.y + Math.sin(ang) * 26);
  ctx.stroke();
  ctx.strokeStyle = C.redLt;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawWheel(ctx, T) {
  const th = -TAU * wheelRev(T);
  const phi = furlAngle(T);
  const cf = Math.cos(phi);
  const sf = Math.sin(phi);
  const hubS = PV(HUB);
  const sections = [];
  for (let s = 0; s < SECTIONS; s++) {
    const a = th + (s * TAU) / SECTIONS;
    const erA = add3(mul3(E2, Math.cos(a)), mul3(E1, Math.sin(a)));
    const etA = add3(mul3(E2, -Math.sin(a)), mul3(E1, Math.cos(a)));
    const hinge = add3(HUB, mul3(erA, R_HINGE));
    const swing = (p) => {
      const v = sub3(p, hinge);
      const ca = dot3(v, erA);
      const cb = dot3(v, etA);
      const cc = dot3(v, UPW);
      return add3(hinge, add3(add3(mul3(erA, ca * cf + cc * sf), mul3(etA, cb)), mul3(UPW, -ca * sf + cc * cf)));
    };
    const slats = [];
    for (let j = 0; j < SLATS; j++) {
      const b = a + (j - (SLATS - 1) / 2) * SLAT_STEP;
      const erB = add3(mul3(E2, Math.cos(b)), mul3(E1, Math.sin(b)));
      const etB = add3(mul3(E2, -Math.sin(b)), mul3(E1, Math.cos(b)));
      const w = add3(mul3(etB, Math.cos(SLAT_PITCH)), mul3(UPW, Math.sin(SLAT_PITCH)));
      const q = (r, hw) => [PV(swing(add3(add3(HUB, mul3(erB, r)), mul3(w, hw)))), PV(swing(add3(add3(HUB, mul3(erB, r)), mul3(w, -hw))))];
      const [a0, a1] = q(R_IN, 3.6);
      const [m0, m1] = q(WR * 0.76, 5.4);
      const [b0, b1] = q(WR, 6.2);
      slats.push({ inner: [a0, m0, m1, a1], tip: [m0, b0, b1, m1], z: (a0.z + b1.z) / 2 });
    }
    const strap = (r) => {
      const pts = [];
      for (let j = 0; j < SLATS; j++) {
        const b = a + (j - (SLATS - 1) / 2) * SLAT_STEP;
        const erB = add3(mul3(E2, Math.cos(b)), mul3(E1, Math.sin(b)));
        pts.push(PV(swing(add3(add3(HUB, mul3(erB, r)), mul3(UPW, -2)))));
      }
      return pts;
    };
    const arm0 = PV(add3(HUB, mul3(erA, 8)));
    const arm1 = PV(hinge);
    const armTip = PV(swing(add3(add3(HUB, mul3(erA, WR * 0.9)), mul3(UPW, -3))));
    const mid = PV(swing(add3(HUB, mul3(erA, WR * 0.62))));
    sections.push({ slats, strapO: strap(WR * 0.93), strapM: strap(WR * 0.58), arm0, arm1, armTip, mid, z: mid.z });
  }
  sections.sort((p, q) => p.z - q.z);
  ctx.lineJoin = 'round';
  const drawQuad = (pts, fill) => {
    ctx.save();
    ctx.translate(REG.x * 0.6, REG.y * 0.6);
    poly(ctx, pts);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    poly(ctx, pts);
    ctx.stroke();
  };
  for (const sec of sections) {
    // section arm (iron) behind the slats
    ctx.strokeStyle = C.key;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(sec.arm0.x, sec.arm0.y);
    ctx.lineTo(sec.arm1.x, sec.arm1.y);
    ctx.lineTo(sec.armTip.x, sec.armTip.y);
    ctx.stroke();
    sec.slats.sort((p, q) => p.z - q.z);
    ctx.strokeStyle = C.key;
    ctx.lineWidth = 0.9;
    for (const sl of sec.slats) {
      const p = sl.inner;
      const area = (p[1].x - p[0].x) * (p[3].y - p[0].y) - (p[1].y - p[0].y) * (p[3].x - p[0].x);
      const front = area < 0;
      drawQuad(sl.inner, front ? '#f6ead0' : '#c7a46c');
      drawQuad(sl.tip, front ? C.red : C.redDk);
    }
    // iron straps tying the section
    ctx.strokeStyle = C.key;
    ctx.lineWidth = 1.5;
    for (const st of [sec.strapO, sec.strapM]) {
      ctx.beginPath();
      ctx.moveTo(st[0].x, st[0].y);
      for (let i = 1; i < st.length; i++) ctx.lineTo(st[i].x, st[i].y);
      ctx.stroke();
    }
  }
  // hub casting + governor collar and links to every section
  const collar = PV(add3(HUB, mul3(UPW, 16 - 9 * (phi / (58 * DEG)))));
  ctx.strokeStyle = C.key;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const sec of sections) {
    ctx.moveTo(collar.x, collar.y);
    ctx.lineTo(sec.mid.x, sec.mid.y);
  }
  ctx.stroke();
  plate(ctx, (g) => {
    g.beginPath();
    g.ellipse(hubS.x, hubS.y, 10 * 0.62, 10, 0, 0, TAU);
  }, C.iron, 1.2, C.key, 0.6);
  plate(ctx, (g) => {
    g.beginPath();
    g.ellipse(collar.x, collar.y, 5 * 0.62, 5.5, 0, 0, TAU);
  }, C.red, 1.1, C.key, 0.6);
}

function drawWater(ctx, T) {
  const rev = wheelRev(T);
  const I = flow(T);
  // splash rings from each stroke
  const k0 = Math.floor(rev);
  for (let k = k0 - 1; k <= k0; k++) {
    const age = rev - k - 0.05;
    if (age < 0 || age > 1.6) continue;
    const r = 4 + age * 22;
    ctx.strokeStyle = `rgba(233,243,246,${0.8 * (1 - age / 1.6)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(SPOUT.x - 10, WATER_Y + 2, r, r * 0.3, 0, 0, TAU);
    ctx.stroke();
  }
  // the cow's drinking ripples are drawn with the head
  if (I < 0.03) return;
  const v0 = 24 + 26 * I;
  const g = 260;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * 0.42;
    const y = SPOUT.y + 0.5 * g * t * t * 2.2;
    pts.push({ x: SPOUT.x - v0 * t, y });
    if (y > WATER_Y + 2) break;
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.key;
  ctx.lineWidth = 2.2 + 4.2 * I;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.strokeStyle = C.waterLt;
  ctx.lineWidth = 0.8 + 3.4 * I;
  ctx.stroke();
  ctx.strokeStyle = '#f4fbfc';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(pts[0].x - 1, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x - 1, p.y - 0.5);
  ctx.stroke();
  // droplets
  const end = pts[pts.length - 1];
  ctx.fillStyle = '#eef7f9';
  for (let i = 0; i < 7; i++) {
    const ph = (T * 3.1 + i * 0.37) % 1;
    const ang = -Math.PI / 2 + (hash(i * 7.3) - 0.5) * 2.2;
    const sp = 10 + hash(i * 3.9) * 12;
    const dx = Math.cos(ang) * sp * ph * I;
    const dy = Math.sin(ang) * sp * ph * I + 30 * ph * ph;
    ctx.beginPath();
    ctx.arc(end.x + dx, end.y - 2 + dy, 1.2, 0, TAU);
    ctx.fill();
  }
}

/** pose of the gag cow: drinking <-> watching the rider */
function longhornPose(T, riderX, thumb) {
  const up = thumb ? 1 : sstep(0.15, 0.85, T) * (1 - sstep(7.35, 8.2, T));
  const lagX = riderX - 34;
  const target = Math.atan2(150, lagX - 380); // 0 = looking right, PI/2 = at us
  const yawLook = clamp(target, 12 * DEG, 128 * DEG);
  // little startle when the tumbleweed flies past
  const startle = Math.exp(-Math.pow((T - 5.0) / 0.25, 2));
  const yaw = lerp(16 * DEG, yawLook, up);
  const pitch = lerp(70 * DEG, 48 * DEG - startle * 14 * DEG, up) + Math.sin(T * 5.2) * 0.03 * (1 - up);
  const anchor = { x: lerp(398, 378, up), y: lerp(593, 571, up) - startle * 5 };
  // drinking bob
  anchor.y += (1 - up) * 1.5 * Math.sin(T * 4.4);
  // blink every so often
  const bt = (T + 10) % 2.7;
  const blink = bt < 0.12 ? Math.sin((bt / 0.12) * Math.PI) : 0;
  return { yaw, pitch, anchor, up, blink };
}

function drawLonghornHead(ctx, T, riderX, thumb) {
  const p = longhornPose(T, riderX, thumb);
  if (p.up < 0.5) {
    // drinking ripples round the muzzle
    const age = (T * 1.3) % 1;
    ctx.strokeStyle = `rgba(235,244,247,${0.7 * (1 - age)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(418, WATER_Y - 2, 5 + age * 16, (5 + age * 16) * 0.3, 0, 0, TAU);
    ctx.stroke();
  }
  drawCowHead(ctx, {
    anchor: p.anchor,
    yaw: p.yaw,
    pitch: p.pitch,
    scale: 1.12,
    coat: C.hide,
    face: null,
    muzzle: '#e9c9a2',
    horns: 'long',
    neckFrom: [
      { x: 330, y: 586 },
      { x: 358, y: 634 },
      { x: 348, y: 640 },
    ],
    neckCol: C.hideCream,
    blink: p.blink,
  });
}

function drawTails(ctx, T) {
  // longhorn tail swishes (rump at 228,594), hereford tail too
  const tail = (x, y, dir, phase, col) => {
    const sw = Math.sin(T * 2.3 + phase) * 7 + Math.sin(T * 5.1 + phase) * 2;
    const p1 = { x: x - dir * 4, y: y + 22 };
    const p2 = { x: x - dir * 2 + sw * dir * 0.6, y: y + 46 };
    ctx.strokeStyle = C.key;
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    plate(ctx, (g) => {
      g.beginPath();
      g.ellipse(p2.x, p2.y + 5, 3.2, 7, sw * 0.03, 0, TAU);
    }, col === C.hideCream ? C.hide : '#f1e6cc', 1);
  };
  tail(229, 596, 1, 0, C.hideCream);
  tail(925, 602, -1, 1.7, '#93391f');
}

function drawGrass(ctx, T) {
  const gst = gust(T);
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const x = 50 + i * 27.4 + (hash(i * 3.3) - 0.5) * 16;
    const y = 748 + hash(i * 1.7) * 40;
    const h = 22 + hash(i * 9.1) * 22;
    const lean = 0.18 + 0.07 * Math.sin(T * 2.4 + i * 0.7) + 0.38 * gst;
    const tx = x + Math.sin(lean) * h;
    const ty = y - Math.cos(lean) * h;
    ctx.strokeStyle = C.key;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(lean) * h * 0.25, y - h * 0.6, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = i % 3 ? '#b8c264' : C.ochre;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (i % 5 === 2) {
      // a prairie sunflower
      ctx.fillStyle = C.ochre;
      for (let p = 0; p < 10; p++) {
        const a = (p * TAU) / 10 + lean;
        ctx.beginPath();
        ctx.ellipse(tx + Math.cos(a) * 5.4, ty + Math.sin(a) * 5.4, 3.4, 1.6, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = C.brown;
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, TAU);
      ctx.fill();
    }
  }
}

function drawTumbleweed(ctx, T, sprite) {
  const st = tumbleState(T);
  if (!st) return;
  // ground shadow (stippled feel via dotted ellipse)
  const sh = clamp(1 - st.h / 320, 0.25, 1);
  ctx.fillStyle = `rgba(${KEY_RGB},${0.22 * sh})`;
  ctx.beginPath();
  ctx.ellipse(st.x, TUMBLE_GROUND - 1, 22 * sh + 6, 4 * sh + 1, 0, 0, TAU);
  ctx.fill();
  // dust puffs at the contacts
  for (let i = 1; i < TUMBLE.length - 1; i++) {
    const age = T - TUMBLE[i][0];
    if (age < 0 || age > 0.7) continue;
    const a = 1 - age / 0.7;
    for (let k = 0; k < 4; k++) {
      const dx = (k - 1.5) * 9 + age * 30;
      ctx.fillStyle = `rgba(214,180,112,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(TUMBLE[i][1] + dx, TUMBLE_GROUND - 4 - age * 14 - (k % 2) * 4, 4 + age * 10, 0, TAU);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(st.x, st.y + (1 - st.squash) * TUMBLE_R);
  ctx.scale(1 / Math.sqrt(st.squash), st.squash);
  ctx.rotate(st.rot);
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
  ctx.restore();
}

function paintTumbleSprite(g, rng, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = TUMBLE_R;
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = pass === 0 ? C.key : pass === 1 ? '#8f6331' : '#e3c57c';
    g.lineWidth = pass === 0 ? 2.8 : pass === 1 ? 1.6 : 0.9;
    const rr = makeLocalRng(17 + (pass === 2 ? 5 : 0));
    g.beginPath();
    for (let i = 0; i < 34; i++) {
      const a0 = rr() * TAU;
      const r0 = R * (0.3 + rr() * 0.7);
      const a1 = a0 + (rr() - 0.5) * 2.6;
      const r1 = R * (0.4 + rr() * 0.6);
      const x0 = cx + Math.cos(a0) * r0 + (pass === 1 ? REG.x * 0.4 : 0);
      const y0 = cy + Math.sin(a0) * r0;
      const x1 = cx + Math.cos(a1) * r1;
      const y1 = cy + Math.sin(a1) * r1;
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx + (rr() - 0.5) * R * 1.2, cy + (rr() - 0.5) * R * 1.2, x1, y1);
    }
    g.stroke();
  }
}
function makeLocalRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), s | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// rider in chromolithograph colours
function drawLithoRider(ctx, kit, params, scene, shadowSprite) {
  const rig = kit.riderRig(params);
  ctx.drawImage(shadowSprite, rig.root.x - shadowSprite.width / 2, ROAD_Y - 6);
  const style = {
    plumage: '#fbf5e3',
    plumageShade: '#e4d3ac',
    mask: '#1e150f',
    bill: '#1e150f',
    eyeRing: C.ochre,
    legs: '#2c1f15',
    crest: C.ochre,
    breast: '#e9b85a',
    frame: C.red,
    frameShade: C.redDk,
    metal: '#3b2a1e',
    tire: '#2c1f15',
    rim: C.ochre,
    saddle: '#5a3418',
    outline: C.key,
    outlineWidth: 1.8,
    spokes: 14,
    pinwheel: { ...scene.pinwheel, stroke: C.key },
  };
  // the buff tint plate printed a hair off register under the figure
  ctx.save();
  ctx.translate(REG.x + 1.2, REG.y + 0.8);
  kit.drawRider(ctx, rig, { ...style, silhouette: 'rgba(217,160,63,0.5)', showPinwheel: false });
  ctx.restore();
  kit.drawRider(ctx, rig, style);
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 2.6 : params.rawLocalT;
  ctx.save();

  const bg = kit.bake('halladay_bg', S, S, (g, rng) => {
    paintPaper(kit, g, rng);
    paintSky(g, rng);
    paintCloud(g, rng, 205, 262, 270, 66, 9);
    paintCloud(g, rng, 860, 372, 190, 46, 7);
    paintCloud(g, rng, 380, 452, 150, 26, 6);
    paintPrairie(g, rng);
    paintRailway(g, rng);
    paintDistantHerd(g, rng);
    paintTowerShadow(g, rng);
    paintRibbon(g, rng, kit);
  });
  const towerBack = kit.bake('halladay_towerBack', S, S, (g, rng) => paintTowerBack(g, rng, kit));
  const towerFront = kit.bake('halladay_towerFront', S, S, (g, rng) => paintTowerFront(g, rng, kit));
  const mid = kit.bake('halladay_mid', S, S, (g, rng) => {
    paintTank(g, rng);
    paintLonghorn(g, rng);
    paintHereford(g, rng);
  });
  const fg = kit.bake('halladay_fg', S, S, (g, rng) => {
    paintRoad(g, rng);
    paintForeground(g, rng, kit);
    paintBottomBand(g, rng, kit);
    paintBorder(g, kit);
  });
  const train = kit.bake('halladay_train', 176, 34, (g) => paintTrainSprite(g));
  const weed = kit.bake('halladay_tumble', 78, 78, (g, rng, w, h) => paintTumbleSprite(g, rng, w, h));
  const riderShadow = kit.bake('halladay_riderShadow', 240, 14, (g, rng, w, h) => {
    stippleIn(g, rng, (gg) => {
      gg.beginPath();
      gg.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 2, 0, 0, TAU);
    }, [0, 0, w, h], 2.2, (x) => 0.55 * (1 - Math.abs(x - w / 2) / (w / 2)), C.dirtDk, 0.5, 1.1);
  });
  const paper = kit.bake('halladay_paperGrain', S, S, (g, rng) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, S, S);
    // paper fibres and press specks (multiplied over everything)
    g.strokeStyle = 'rgba(150,120,80,0.10)';
    g.lineWidth = 0.6;
    g.beginPath();
    for (let i = 0; i < 1600; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const a = rng() * TAU;
      const l = 2 + rng() * 7;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    g.stroke();
    kit.addGrain(g, S, S, rng, 0.035);
  });

  ctx.drawImage(bg, 0, 0);
  drawDistantMill(ctx, T);
  drawTrain(ctx, T, train);
  ctx.drawImage(towerBack, 0, 0);
  drawPumpRod(ctx, T);
  ctx.drawImage(towerFront, 0, 0);
  drawWheel(ctx, T);
  ctx.drawImage(mid, 0, 0);
  drawWater(ctx, T);
  drawTails(ctx, T);
  const riderX = params.riderLocalX;
  drawLonghornHead(ctx, T, riderX, thumb);
  ctx.drawImage(fg, 0, 0);
  drawGrass(ctx, T);

  if (kit.riderVisible(params)) drawLithoRider(ctx, kit, params, scene, riderShadow);
  drawTumbleweed(ctx, T, weed);

  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(paper, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
