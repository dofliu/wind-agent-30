// src/scenes/betz.js
// #11 · 1919–1931 · 空氣動力學登場 — The age of aerodynamics.
//
// Medium: an engineering BLUEPRINT (cyanotype): Prussian-blue paper with mottled
// exposure, fold creases and a faint drafting grid; the line work is the white
// negative of an ink tracing (slightly soft where the light crept under the
// lines); single-stroke technical lettering, a drawing border with zone marks,
// a title block in the lower-right corner, dimension lines, phantom lines,
// cutting-plane arrows and section hatching. Red-pencil / rubber-stamp mark-ups.
//
// Content
//  FIG. 1  Betz's actuator-disk (axial momentum) theory: a streamtube that EXPANDS
//          as the air slows through the rotor disk. At the optimum (a = 1/3) the
//          velocity is v1 far upstream, v = 2/3 v1 at the disk and v2 = 1/3 v1 in the
//          far wake, so the areas are A1 = 2/3 A and A2 = 2 A. Animated tracer
//          particles slow down (and bunch up) as they pass the disk.
//          C_P = 4a(1-a)^2, maximum 16/27 ≈ 59.3 % (A. Betz, 1919/1920).
//  FIG. 2  G. J. M. Darrieus' vertical-axis "egg-beater" turbine (U.S. Pat. 1,835,018,
//          1931): two curved troposkein blades fixed top and bottom to a vertical
//          shaft, patent-style elevation, rotating (hidden blade dashed).
//  FIG. 3  A C_P gauge whose needle is stopped at the 59.3 % red line.
//
// Gag: the spoonbill is drafted as a part (dimensioned, ballooned). Its rotor's
// efficiency read-out climbs through bar 1-2, tries to beat 59.3 % on bar 3 —
// and on beat 3 a red rubber stamp "REJECTED — 超過貝茲極限" thumps down.

const S = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const PAPER = '#163f73';
const INK = '#e8f1ff';
const INK2 = '#9cc3f0';
const GRID = '#5c8fd1';
const YEL = '#f2c94c';
const RED = '#ff5d4a';
const INK_RGB = '232,241,255';
const ink = (a) => `rgba(${INK_RGB},${a})`;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const pmod = (a, m) => ((a % m) + m) % m;
function sstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// sheet layout
const BORDER = { o: 40, i: 48 };
const TB = { x0: 576, y0: 764, x1: 952, y1: 952 }; // title block

// FIG. 1 — streamtube
const TUBE = { x0: 74, x1: 562, xd: 306, yc: 242, R: 86, a: 1 / 3 };
// FIG. 2 — Darrieus
const DAR = { x: 792, yTop: 162, yBot: 590, R: 138, chord: 15, hubTop: 144, base: 642 };
// FIG. 3 — gauge
const GAUGE = { x: 204, y: 884, r: 100 };
// section A–A detail
const SEC = { x: 372, y: 804, c: 150 };
// stamp
const STAMP = { x: 428, y: 524, rot: -7 * DEG, t: 5.0 };

// -----------------------------------------------------------------------------
// text helpers (technical lettering, subscripts with _{..})
// -----------------------------------------------------------------------------
let MONO = 'monospace';
let SANS = 'sans-serif';
function ttext(g, str, x, y, size, opts = {}) {
  const weight = opts.weight || 500;
  const font = opts.font || MONO;
  const parts = [];
  const re = /_\{([^}]*)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push([str.slice(last, m.index), false]);
    parts.push([m[1], true]);
    last = re.lastIndex;
  }
  if (last < str.length) parts.push([str.slice(last), false]);
  const sub = size * 0.66;
  g.save();
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  try {
    g.letterSpacing = opts.spacing !== undefined ? `${opts.spacing}px` : `${(size * 0.06).toFixed(2)}px`;
  } catch (e) {
    /* older canvas */
  }
  const ws = parts.map(([s, isSub]) => {
    g.font = `${weight} ${isSub ? sub : size}px ${font}`;
    return g.measureText(s).width;
  });
  const total = ws.reduce((a, b) => a + b, 0);
  let cx = opts.align === 'center' ? x - total / 2 : opts.align === 'right' ? x - total : x;
  if (opts.measure) {
    g.restore();
    return total;
  }
  g.fillStyle = opts.color || INK;
  for (let i = 0; i < parts.length; i++) {
    const [s, isSub] = parts[i];
    g.font = `${weight} ${isSub ? sub : size}px ${font}`;
    g.fillText(s, cx, isSub ? y + size * 0.26 : y);
    cx += ws[i];
  }
  g.restore();
  return total;
}

// -----------------------------------------------------------------------------
// drafting primitives
// -----------------------------------------------------------------------------
function line(g, x0, y0, x1, y1) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}
function arrowHead(g, x, y, ang, len = 9, w = 3) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x - ca * len - sa * w, y - sa * len + ca * w);
  g.lineTo(x - ca * len + sa * w, y - sa * len - ca * w);
  g.closePath();
  g.fill();
}
/** Dimension line between two points with arrowheads at both ends and a label. */
function dimLine(g, x0, y0, x1, y1, label, opts = {}) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  g.lineWidth = opts.lw || 1;
  line(g, x0, y0, x1, y1);
  arrowHead(g, x1, y1, ang, opts.ah || 9, 2.8);
  arrowHead(g, x0, y0, ang + Math.PI, opts.ah || 9, 2.8);
  if (label) {
    const f = opts.labelAt !== undefined ? opts.labelAt : 0.5;
    const mx = lerp(x0, x1, f);
    const my = lerp(y0, y1, f);
    g.save();
    g.translate(mx, my);
    let a = ang;
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
    g.rotate(a);
    const sz = opts.size || 12;
    // knock the line out behind the label
    if (opts.knock !== false) {
      g.font = `500 ${sz}px ${MONO}`;
      const w = g.measureText(label.replace(/_\{|\}/g, '')).width + 8;
      if (opts.inline) {
        g.fillStyle = opts.paper || PAPER;
        g.fillRect(-w / 2, -sz * 0.7, w, sz * 1.2);
      }
    }
    ttext(g, label, 0, opts.inline ? sz * 0.36 : -5, sz, { align: 'center', color: opts.color || INK });
    g.restore();
  }
}
function dashed(g, pattern, fn) {
  g.save();
  g.setLineDash(pattern);
  fn();
  g.restore();
}
const CENTER_DASH = [22, 4, 3, 4];
const PHANTOM_DASH = [20, 4, 3, 4, 3, 4];
const HIDDEN_DASH = [7, 4];

function hatchPath(g, pathFn, box, spacing = 5, ang = 45 * DEG, lw = 0.8, color = INK) {
  g.save();
  pathFn(g);
  g.clip();
  g.strokeStyle = color;
  g.lineWidth = lw;
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  g.beginPath();
  for (let o = -R; o <= R; o += spacing) {
    const px = cx - sa * o;
    const py = cy + ca * o;
    g.moveTo(px - ca * R, py - sa * R);
    g.lineTo(px + ca * R, py + sa * R);
  }
  g.stroke();
  g.restore();
}

// -----------------------------------------------------------------------------
// FIG. 1 — 1-D actuator-disk flow
// -----------------------------------------------------------------------------
function tubeU(x) {
  // axial velocity / v1 along the tube (induced velocity of a uniformly loaded disk)
  const s = (x - TUBE.xd) / (TUBE.R * 0.85);
  return 1 - TUBE.a * (1 + s / Math.sqrt(s * s + 1));
}
function tubeR(x) {
  return TUBE.R * Math.sqrt((1 - TUBE.a) / tubeU(x));
}
// travel-time table for the tracer particles (built once)
const FLOW_V = 175; // px/s far upstream
const TT = (() => {
  const n = 400;
  const xs = [];
  const ts = [];
  let t = 0;
  const x0 = TUBE.x0 - 40;
  const x1 = TUBE.x1 + 10;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    if (i > 0) {
      const xm = (x + xs[i - 1]) / 2;
      t += (x - xs[i - 1]) / (FLOW_V * tubeU(xm));
    }
    xs.push(x);
    ts.push(t);
  }
  return { xs, ts, total: t };
})();
function xAtTime(t) {
  const { xs, ts } = TT;
  let lo = 0;
  let hi = ts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid;
  }
  const u = (t - ts[lo]) / (ts[hi] - ts[lo] || 1);
  return lerp(xs[lo], xs[hi], u);
}

function paintFig1(g) {
  const { x0, x1, xd, yc, R } = TUBE;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  ttext(g, 'FIG. 1   ACTUATOR DISK — AXIAL MOMENTUM THEORY', 64, 80, 15, { weight: 700 });
  ttext(g, 'A. BETZ, GÖTTINGEN 1919–1920 · IDEAL ROTOR, INCOMPRESSIBLE FLOW', 64, 98, 10.5, { color: INK2 });
  // centre line
  g.lineWidth = 0.9;
  g.strokeStyle = INK2;
  dashed(g, CENTER_DASH, () => line(g, x0 - 14, yc, x1 + 10, yc));
  ttext(g, 'C', x1 + 8, yc + 4, 11, { color: INK2, weight: 700 });
  ttext(g, 'L', x1 + 11, yc + 7, 11, { color: INK2, weight: 700 });
  // streamtube boundary
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  for (const sgn of [-1, 1]) {
    g.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const y = yc + sgn * tubeR(x);
      if (x === x0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // two outer streamlines (dashed), bending a little round the tube
  g.lineWidth = 0.8;
  g.strokeStyle = INK2;
  dashed(g, [10, 5], () => {
    for (const sgn of [-1, 1]) {
      for (const extra of [30]) {
        g.beginPath();
        for (let x = x0; x <= x1; x += 4) {
          const bend = (tubeR(x) - tubeR(x0)) * 0.5;
          const y = yc + sgn * (tubeR(x0) + extra + bend);
          if (x === x0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  });
  // the actuator disk: thin hatched section
  const dw = 9;
  const disk = (gg) => {
    gg.beginPath();
    gg.rect(xd - dw / 2, yc - R, dw, 2 * R);
  };
  g.lineWidth = 1.6;
  g.strokeStyle = INK;
  disk(g);
  g.stroke();
  hatchPath(g, disk, [xd - dw, yc - R, xd + dw, yc + R], 4, 45 * DEG, 0.9);
  // stations 1 – 4
  const st = [
    [x0 + 22, '1'],
    [xd - 15, '2'],
    [xd + 15, '3'],
    [x1 - 20, '4'],
  ];
  g.lineWidth = 0.7;
  g.strokeStyle = INK2;
  for (const [x, n] of st) {
    const r = tubeR(x) + 26;
    dashed(g, [3, 3], () => line(g, x, yc - r, x, yc + r + 4));
    g.strokeStyle = INK2;
    g.beginPath();
    g.arc(x, yc + r + 13, 8, 0, TAU);
    g.stroke();
    ttext(g, n, x, yc + r + 17.5, 11, { align: 'center', color: INK2, weight: 700 });
  }
  // area dimensions (vertical) at stations 1, disk and 4
  g.strokeStyle = INK;
  g.fillStyle = INK;
  const areaDim = (x, label, dx) => {
    const r = tubeR(x);
    dimLine(g, x + dx, yc - r, x + dx, yc + r, null, { lw: 0.9, ah: 8 });
    g.save();
    g.translate(x + dx - 6, yc);
    g.rotate(-Math.PI / 2);
    ttext(g, label, 0, 0, 12, { align: 'center' });
    g.restore();
  };
  areaDim(x0 + 8, 'A_{1} = 2/3 A', 0);
  areaDim(x1 - 8, 'A_{2} = 2 A', 0);
  dimLine(g, xd - 16, yc - R, xd - 16, yc + R, null, { lw: 0.8, ah: 7 });
  g.fillStyle = PAPER;
  g.fillRect(xd - 23, yc + 30, 14, 18);
  g.fillStyle = INK;
  ttext(g, 'A', xd - 16, yc + 44, 13, { align: 'center', weight: 700 });
  // velocity-profile arrows: v1, 2/3 v1, 1/3 v1
  const prof = (x, len, label, lx) => {
    const r = tubeR(x);
    g.lineWidth = 1.1;
    for (let k = -2; k <= 2; k++) {
      const y = yc + (k / 2.6) * r * 0.9;
      line(g, x, y, x + len, y);
      arrowHead(g, x + len, y, 0, 8, 2.6);
    }
    g.lineWidth = 0.8;
    line(g, x, yc - r * 0.75, x, yc + r * 0.75);
    ttext(g, label, lx !== undefined ? lx : x + len / 2, yc - tubeR(lx !== undefined ? lx : x + len / 2) - 7, 12.5, { align: 'center', weight: 700 });
  };
  prof(x0 + 46, 66, 'v_{1}');
  prof(xd + 22, 44, 'v = 2/3 v_{1}', xd + 44);
  prof(x1 - 92, 22, 'v_{2} = 1/3 v_{1}', x1 - 82);
  // leader to the disk
  g.lineWidth = 0.8;
  line(g, xd + 4, yc + R - 14, xd + 46, yc + R + 26);
  line(g, xd + 46, yc + R + 26, xd + 86, yc + R + 26);
  ttext(g, 'ROTOR DISK', xd + 50, yc + R + 22, 10.5, { color: INK });
  // formulae
  ttext(g, 'P = 2ρAv_{1}³ a(1−a)²     C_{P} = P / (½ρAv_{1}³) = 4a(1−a)²', 64, 417, 12.5);
  ttext(g, 'dC_{P}/da = 0  →  a = 1/3  →  C_{P,MAX} = 16/27 ≈ 0.593', 64, 440, 12.5, { weight: 700 });
  g.strokeStyle = YEL;
  g.lineWidth = 1.2;
  g.strokeRect(58, 424, 452, 22);
}

// -----------------------------------------------------------------------------
// FIG. 2 — Darrieus elevation (static parts)
// -----------------------------------------------------------------------------
function darR(z) {
  // troposkein-like blade radius, z = 0 bottom fixing .. 1 top fixing
  return DAR.R * Math.pow(Math.sin(Math.PI * clamp(z, 0, 1)), 0.82);
}
function darY(z) {
  return lerp(DAR.yBot, DAR.yTop, z);
}
function paintFig2(g) {
  const { x, yTop, yBot, R, base } = DAR;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  ttext(g, 'FIG. 2   G. J. M. DARRIEUS — TURBINE', 600, 80, 15, { weight: 700 });
  ttext(g, 'ELEVATION · VERTICAL AXIS · 2 CURVED BLADES', 600, 98, 10.5, { color: INK2 });
  // phantom envelope of the blades (alternate positions)
  g.strokeStyle = INK2;
  g.lineWidth = 0.8;
  dashed(g, PHANTOM_DASH, () => {
    for (const sgn of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const z = i / 40;
        const px = x + sgn * darR(z);
        const py = darY(z);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
  });
  // centre line of the shaft
  dashed(g, CENTER_DASH, () => line(g, x, DAR.hubTop - 26, x, ROAD_Y + 46));
  // top bearing cap
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.strokeRect(x - 13, DAR.hubTop - 12, 26, 14);
  line(g, x - 9, DAR.hubTop - 16, x + 9, DAR.hubTop - 16);
  // blade fixings (clamps) top & bottom
  for (const y of [yTop, yBot]) {
    g.strokeRect(x - 15, y - 7, 30, 14);
    line(g, x - 15, y, x + 15, y);
  }
  // base: bearing housing + gearbox / generator, foundation (in section)
  g.lineWidth = 1.5;
  g.strokeRect(x - 20, base - 34, 40, 34);
  g.beginPath();
  g.moveTo(x - 46, ROAD_Y);
  g.lineTo(x - 36, base);
  g.lineTo(x + 36, base);
  g.lineTo(x + 46, ROAD_Y);
  g.stroke();
  // generator box
  g.strokeRect(x + 46, ROAD_Y - 34, 46, 34);
  g.beginPath();
  g.arc(x + 69, ROAD_Y - 17, 11, 0, TAU);
  g.stroke();
  line(g, x + 36, ROAD_Y - 17, x + 46, ROAD_Y - 17);
  ttext(g, 'GEN.', x + 69, ROAD_Y - 38, 9.5, { align: 'center', color: INK2 });
  // foundation block below ground, hatched section
  const fnd = (gg) => {
    gg.beginPath();
    gg.rect(x - 64, ROAD_Y, 128, 34);
  };
  g.lineWidth = 1.4;
  fnd(g);
  g.stroke();
  hatchPath(g, fnd, [x - 70, ROAD_Y, x + 70, ROAD_Y + 36], 6, 45 * DEG, 0.8);
  hatchPath(g, fnd, [x - 70, ROAD_Y, x + 70, ROAD_Y + 36], 12, -45 * DEG, 0.6, INK2);
  // anchor bolts
  for (const bx of [x - 44, x + 44]) dashed(g, HIDDEN_DASH, () => line(g, bx, ROAD_Y - 2, bx, ROAD_Y + 30));
  // dimensions: D across the envelope, H fixing to fixing
  g.strokeStyle = INK;
  g.fillStyle = INK;
  const yMid = darY(0.5);
  g.lineWidth = 0.7;
  dimLine(g, x - R + 1, yMid, x + R - 1, yMid, 'D', { size: 13, inline: true, lw: 0.8, labelAt: 0.3 });
  const hx = x - R - 22;
  line(g, x - 18, yTop, hx - 6, yTop);
  line(g, x - 18, yBot, hx - 6, yBot);
  dimLine(g, hx, yTop, hx, yBot, 'H ≈ 1.5 D', { size: 12 });
  // leaders
  const leader = (x0, y0, x1, y1, text, align = 'left') => {
    g.lineWidth = 0.8;
    line(g, x0, y0, x1, y1);
    line(g, x1, y1, x1 + (align === 'left' ? 16 : -16), y1);
    g.beginPath();
    g.arc(x0, y0, 2, 0, TAU);
    g.fill();
    ttext(g, text, x1 + (align === 'left' ? 19 : -19), y1 + 4, 9.5, { align, color: INK });
  };
  leader(x - 13, DAR.hubTop - 5, x - 54, DAR.hubTop - 20, 'TOP BEARING', 'right');
  leader(x + darR(0.86), darY(0.86), x + 104, 182, '', 'left');
  ttext(g, 'BLADE', 946, 178, 9.5, { align: 'right' });
  ttext(g, '(TROPOSKEIN)', 946, 192, 9, { align: 'right', color: INK2 });
  leader(x + 6, darY(0.08), x + 76, 608, '', 'left');
  ttext(g, 'VERTICAL', 946, 604, 9.5, { align: 'right' });
  ttext(g, 'SHAFT', 946, 617, 9.5, { align: 'right' });
  leader(x - 20, base - 18, x - 74, base - 2, 'BEARING', 'right');
  // cutting plane A–A across the left blade envelope
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  const cy = darY(0.7);
  const cx0 = x - darR(0.7);
  dashed(g, [16, 4, 3, 4], () => line(g, cx0 - 26, cy, cx0 + 18, cy));
  g.lineWidth = 1.2;
  for (const ax of [cx0 - 26, cx0 + 18]) {
    line(g, ax, cy, ax, cy + 16);
    arrowHead(g, ax, cy + 22, Math.PI / 2, 8, 3);
    ttext(g, 'A', ax, cy - 6, 12, { align: 'center', weight: 700 });
  }
}

// -----------------------------------------------------------------------------
// FIG. 3 — gauge face, section A–A, notes, title block, border, ground
// -----------------------------------------------------------------------------
const G_MAX = 100;
function gaugeAng(v) {
  return Math.PI + (clamp(v, 0, G_MAX) / G_MAX) * Math.PI;
}
const BETZ = (16 / 27) * 100;
function paintGauge(g) {
  const { x, y, r } = GAUGE;
  ttext(g, 'FIG. 3   C_{P} GAUGE', 64, 772, 13, { weight: 700 });
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, r, Math.PI, TAU);
  g.lineTo(x + r, y + 10);
  g.lineTo(x - r, y + 10);
  g.closePath();
  g.stroke();
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(x, y, r - 8, Math.PI, TAU);
  g.stroke();
  // forbidden zone above the Betz limit, hatched in red pencil
  const zone = (gg) => {
    gg.beginPath();
    gg.arc(x, y, r - 8, gaugeAng(BETZ), TAU);
    gg.arc(x, y, r - 30, TAU, gaugeAng(BETZ), true);
    gg.closePath();
  };
  hatchPath(g, zone, [x - r, y - r, x + r, y], 4, -45 * DEG, 1, RED);
  g.strokeStyle = RED;
  g.lineWidth = 1.2;
  zone(g);
  g.stroke();
  // ticks
  g.strokeStyle = INK;
  for (let v = 0; v <= 100; v += 2) {
    const a = gaugeAng(v);
    const major = v % 10 === 0;
    const r0 = r - 8;
    const r1 = r0 - (major ? 12 : 6);
    g.lineWidth = major ? 1.4 : 0.7;
    line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    if (major && v % 20 === 0) {
      ttext(g, `${v}`, x + Math.cos(a) * (r - 32), y + Math.sin(a) * (r - 32) + 4, 9.5, { align: 'center' });
    }
  }
  // the red line itself + stop pin
  const ab = gaugeAng(BETZ);
  g.strokeStyle = RED;
  g.lineWidth = 3;
  line(g, x + Math.cos(ab) * (r + 4), y + Math.sin(ab) * (r + 4), x + Math.cos(ab) * (r - 34), y + Math.sin(ab) * (r - 34));
  g.fillStyle = RED;
  ttext(g, '16/27', x + Math.cos(ab) * (r + 18) + 10, y + Math.sin(ab) * (r + 18), 11, { align: 'center', color: RED, weight: 700 });
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.beginPath();
  g.arc(x + Math.cos(ab - 0.035) * (r - 46), y + Math.sin(ab - 0.035) * (r - 46), 3.2, 0, TAU);
  g.stroke();
  ttext(g, 'C_{P}  %', x, y - 30, 14, { align: 'center', weight: 700 });
  ttext(g, 'C_{P,MAX} = 16/27 ≈ 59.3 %', x, y + 32, 13, { align: 'center', weight: 700 });
  ttext(g, 'BETZ LIMIT — NO ROTOR MAY EXCEED', x, y + 50, 9, { align: 'center', color: INK2 });
}

function paintSection(g) {
  const { x, y, c } = SEC;
  ttext(g, 'SECTION A–A', x + c / 2, y - 18, 12, { align: 'center', weight: 700 });
  // symmetrical aerofoil, t/c = 15 %
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const u = 1 - Math.cos((i / n) * Math.PI) * 0.5 - 0.5;
    const yt = 5 * 0.15 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    pts.push([u, yt]);
  }
  const path = (gg) => {
    gg.beginPath();
    pts.forEach(([u, t], i) => (i === 0 ? gg.moveTo(x + u * c, y - t * c) : gg.lineTo(x + u * c, y - t * c)));
    for (let i = pts.length - 1; i >= 0; i--) gg.lineTo(x + pts[i][0] * c, y + pts[i][1] * c);
    gg.closePath();
  };
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  path(g);
  g.stroke();
  hatchPath(g, path, [x - 4, y - 20, x + c + 4, y + 20], 4, 45 * DEG, 0.8);
  g.strokeStyle = INK2;
  g.lineWidth = 0.8;
  dashed(g, CENTER_DASH, () => line(g, x - 12, y, x + c + 14, y));
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 0.7;
  line(g, x, y + 8, x, y + 26);
  line(g, x + c, y + 4, x + c, y + 26);
  dimLine(g, x, y + 22, x + c, y + 22, 'c', { size: 11 });
  ttext(g, 'BLADE · SYMMETRICAL AEROFOIL', x + c / 2, y + 44, 9, { align: 'center', color: INK2 });
}

function paintNotes(g) {
  let y = 866;
  const x = 346;
  ttext(g, 'NOTES', x, y, 11.5, { weight: 700 });
  const notes = [
    '1. AXIAL INDUCTION a = 1 − v/v_{1}',
    '2. OPTIMUM a = 1/3 : v = 2/3 v_{1}',
    '   v_{2} = 1/3 v_{1} ,  A_{2} = 2A',
    '3. ITEMS: 1 BILL, SPATULATE',
    '   2 FACE MASK, BLACK (HATCHED)',
    '   3 ROTOR, DARRIEUS TYPE',
  ];
  for (const n of notes) {
    y += 13.6;
    ttext(g, n, x, y, 9.5, { color: INK });
  }
}

function paintTitleBlock(g) {
  const { x0, y0, x1, y1 } = TB;
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.lineWidth = 1;
  const rows = [y0 + 50, y0 + 98, y0 + 140];
  for (const y of rows) line(g, x0, y, x1, y);
  line(g, x0 + 198, rows[1], x0 + 198, rows[2]);
  const cols = [x0 + 64, x0 + 150, x0 + 236];
  for (const c of cols) line(g, c, rows[2], c, y1);
  // row 1 — inventor / object
  ttext(g, 'G. J. M. DARRIEUS · TURBINE', x0 + 12, y0 + 22, 15, { weight: 700 });
  ttext(g, 'U.S. PAT. 1,835,018 · 1931', x0 + 12, y0 + 42, 13, { color: INK });
  // row 2 — 貝茲極限
  ttext(g, '貝茲極限 16/27', x0 + 12, rows[0] + 34, 26, { font: SANS, weight: 900, spacing: 1 });
  ttext(g, 'C_{P,MAX} ≈ 59.3 %', x0 + 208, rows[0] + 22, 13, { weight: 700 });
  ttext(g, 'A. BETZ 1919–1920', x0 + 208, rows[0] + 40, 10, { color: INK2 });
  // row 3 — drawing data
  ttext(g, 'VERTICAL-AXIS WIND TURBINE', x0 + 12, rows[1] + 18, 10, { color: INK2 });
  ttext(g, '垂直軸「打蛋器」風機', x0 + 12, rows[1] + 36, 13, { font: SANS, weight: 700 });
  ttext(g, 'DWG. NO.', x0 + 206, rows[1] + 14, 8, { color: INK2 });
  ttext(g, 'WP-1931-11', x0 + 206, rows[1] + 33, 14, { weight: 700 });
  const cells = [
    ['DRN.', 'G.D.'],
    ['CHK.', 'A.B.'],
    ['SCALE', '1 : 20'],
    ['SHEET', '11 OF 20'],
  ];
  const cx = [x0, ...cols, x1];
  for (let i = 0; i < 4; i++) {
    ttext(g, cells[i][0], cx[i] + 6, rows[2] + 12, 7.5, { color: INK2 });
    ttext(g, cells[i][1], cx[i] + 6, rows[2] + 31, 12, { weight: 700 });
  }
}

function paintBorder(g) {
  const { o, i } = BORDER;
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.strokeRect(o, o, S - 2 * o, S - 2 * o);
  g.lineWidth = 0.9;
  g.strokeRect(i, i, S - 2 * i, S - 2 * i);
  // zone marks
  g.lineWidth = 1;
  const nums = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const lets = ['F', 'E', 'D', 'C', 'B', 'A'];
  for (let k = 1; k < 8; k++) {
    const x = o + (k * (S - 2 * o)) / 8;
    line(g, x, o, x, i);
    line(g, x, S - o, x, S - i);
  }
  for (let k = 1; k < 6; k++) {
    const y = o + (k * (S - 2 * o)) / 6;
    line(g, o, y, i, y);
    line(g, S - o, y, S - i, y);
  }
  for (let k = 0; k < 8; k++) {
    const x = o + ((k + 0.5) * (S - 2 * o)) / 8;
    ttext(g, nums[k], x, o - 3, 8, { align: 'center', color: INK2 });
    ttext(g, nums[k], x, S - o + 10, 8, { align: 'center', color: INK2 });
  }
  for (let k = 0; k < 6; k++) {
    const y = o + ((k + 0.5) * (S - 2 * o)) / 6;
    ttext(g, lets[k], o - 7, y + 3, 8, { align: 'center', color: INK2 });
    ttext(g, lets[k], S - o + 7, y + 3, 8, { align: 'center', color: INK2 });
  }
}

function paintGround(g) {
  // the ground line runs edge to edge (it is the match line to sheets 10 and 12)
  g.strokeStyle = INK;
  g.lineWidth = 2;
  line(g, 0, ROAD_Y, S, ROAD_Y);
  // earth symbol hatching below it
  g.save();
  g.beginPath();
  g.rect(BORDER.i, ROAD_Y, S - 2 * BORDER.i, 16);
  g.clip();
  g.lineWidth = 0.9;
  g.strokeStyle = INK2;
  g.beginPath();
  for (let x = BORDER.i - 20; x < S; x += 9) {
    g.moveTo(x, ROAD_Y + 16);
    g.lineTo(x + 14, ROAD_Y);
  }
  g.stroke();
  g.restore();
  ttext(g, 'GROUND LINE', 200, ROAD_Y - 6, 9, { color: INK2 });
  ttext(g, 'MATCH LINE — SHEET 10', BORDER.i + 4, ROAD_Y - 6, 8.5, { color: INK2 });
  ttext(g, 'MATCH LINE — SHEET 12', S - BORDER.i - 4, ROAD_Y - 6, 8.5, { align: 'right', color: INK2 });
}

// red-pencil mark-up on the print (crisp: drawn after printing)
function paintRedPencil(g, rng) {
  const pre = 'dC_{P}/da = 0  →  a = 1/3  →  C_{P,MAX} = ';
  const w0 = 64 + ttext(g, pre, 0, 0, 12.5, { weight: 700, measure: true });
  const w1 = ttext(g, '16/27 ≈ 0.593', 0, 0, 12.5, { weight: 700, measure: true });
  const cx = w0 + w1 / 2;
  const cy = 435;
  const rx = w1 / 2 + 12;
  const ry = 15;
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = pass === 2 ? 'rgba(255,120,95,0.55)' : 'rgba(255,93,74,0.8)';
    g.lineWidth = pass === 2 ? 0.8 : 1.5;
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = -2.6 + (i / 64) * (TAU + 0.5);
      const wob = 1 + 0.04 * Math.sin(a * 3 + pass) + (rng() - 0.5) * 0.015;
      const x = cx + Math.cos(a) * rx * wob + pass * 0.8;
      const y = cy + Math.sin(a) * ry * wob - (i / 64) * 4 + pass * 0.6;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // a tick and arrow towards the gauge
  g.strokeStyle = 'rgba(255,93,74,0.85)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx + rx + 8, cy + 2);
  g.lineTo(cx + rx + 14, cy + 9);
  g.lineTo(cx + rx + 28, cy - 10);
  g.stroke();
}

// -----------------------------------------------------------------------------
// paper
// -----------------------------------------------------------------------------
function paintPaper(kit, g, rng) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S, S);
  // uneven exposure / wash
  kit.addBlotches(g, S, S, rng, 'rgba(48,104,170,0.16)', 34, 80, 280);
  kit.addBlotches(g, S, S, rng, 'rgba(6,22,52,0.16)', 26, 60, 230);
  // the sheet edges got more light (paler) — a soft band
  const edge = g.createLinearGradient(0, 0, S, 0);
  edge.addColorStop(0, 'rgba(70,120,180,0.18)');
  edge.addColorStop(0.08, 'rgba(70,120,180,0)');
  edge.addColorStop(0.92, 'rgba(70,120,180,0)');
  edge.addColorStop(1, 'rgba(70,120,180,0.18)');
  g.fillStyle = edge;
  g.fillRect(0, 0, S, S);
  // paper fibres
  g.strokeStyle = 'rgba(160,200,245,0.06)';
  g.lineWidth = 0.7;
  g.beginPath();
  for (let i = 0; i < 2600; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const a = rng() * TAU;
    const l = 2 + rng() * 9;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  g.stroke();
  // grid (inside the border)
  g.save();
  g.beginPath();
  g.rect(BORDER.i, BORDER.i, S - 2 * BORDER.i, S - 2 * BORDER.i);
  g.clip();
  for (let k = 0; k <= S; k += 20) {
    const major = k % 100 === 0;
    g.strokeStyle = major ? 'rgba(92,143,209,0.30)' : 'rgba(92,143,209,0.13)';
    g.lineWidth = major ? 0.8 : 0.6;
    line(g, k + 0.5, 0, k + 0.5, S);
    line(g, 0, k + 0.5, S, k + 0.5);
  }
  g.restore();
  kit.addGrain(g, S, S, rng, 0.03);
}

function paintCreases(g) {
  // the print was folded in quarters: pale worn creases with a soft shadow
  for (const [x0, y0, x1, y1] of [
    [S / 2 + 3, 0, S / 2 - 2, S],
    [0, S / 2 - 30, S, S / 2 - 26],
  ]) {
    const nx = y1 - y0;
    const ny = -(x1 - x0);
    const l = Math.hypot(nx, ny);
    const ux = nx / l;
    const uy = ny / l;
    g.strokeStyle = 'rgba(190,220,255,0.10)';
    g.lineWidth = 5;
    line(g, x0, y0, x1, y1);
    g.strokeStyle = 'rgba(200,228,255,0.16)';
    g.lineWidth = 1.2;
    line(g, x0, y0, x1, y1);
    g.strokeStyle = 'rgba(4,16,40,0.18)';
    g.lineWidth = 2;
    line(g, x0 + ux * 2.5, y0 + uy * 2.5, x1 + ux * 2.5, y1 + uy * 2.5);
  }
  // drawing-pin holes at the corners
  for (const [x, y] of [
    [30, 30],
    [S - 30, 30],
    [30, S - 30],
    [S - 30, S - 30],
  ]) {
    g.fillStyle = 'rgba(4,14,36,0.6)';
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(190,220,255,0.25)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(x, y, 4.5, 0, TAU);
    g.stroke();
  }
}

// -----------------------------------------------------------------------------
// dynamic
// -----------------------------------------------------------------------------
function drawParticles(ctx, T) {
  const { yc } = TUBE;
  const fr = [-0.84, -0.56, -0.28, 0, 0.28, 0.56, 0.84];
  const per = 9;
  const total = TT.total;
  ctx.lineCap = 'round';
  for (let j = 0; j < fr.length; j++) {
    for (let k = 0; k < per; k++) {
      const tp = pmod(T + (k / per) * total + j * 0.173, total);
      const x = xAtTime(tp);
      if (x < TUBE.x0 + 2 || x > TUBE.x1 - 2) continue;
      const xb = xAtTime(Math.max(0, tp - 0.11));
      const y = yc + fr[j] * tubeR(x);
      const yb = yc + fr[j] * tubeR(xb);
      const fade = Math.min(1, (x - TUBE.x0) / 24, (TUBE.x1 - x) / 24);
      ctx.strokeStyle = `rgba(242,201,76,${0.32 * fade})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(Math.max(TUBE.x0, xb), yb);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,236,170,${0.95 * fade})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,248,220,${fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fill();
    }
  }
  // outer, undisturbed air keeps its speed
  for (const sgn of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const span = TUBE.x1 - TUBE.x0;
      const x = TUBE.x0 + pmod(T * FLOW_V + k * (span / 5) + (sgn > 0 ? 40 : 0), span);
      const bend = (tubeR(x) - tubeR(TUBE.x0)) * 0.5;
      const y = yc + sgn * (tubeR(TUBE.x0) + 30 + bend);
      const fade = Math.min(1, (x - TUBE.x0) / 24, (TUBE.x1 - x) / 24);
      ctx.strokeStyle = `rgba(156,195,240,${0.8 * fade})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(Math.max(TUBE.x0, x - 0.11 * FLOW_V), y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}

function drawDarrieus(ctx, T) {
  const { x, yTop, yBot, chord } = DAR;
  const th = TAU * 0.62 * T + 0.4;
  const blades = [th, th + Math.PI].map((a) => ({ a, z: Math.sin(a) }));
  blades.sort((p, q) => p.z - q.z);
  const ribbon = (a) => {
    const c = Math.cos(a);
    const s = Math.abs(Math.sin(a));
    const hc = (chord / 2) * s + 1.2;
    const L = [];
    const Rr = [];
    for (let i = 0; i <= 32; i++) {
      const z = i / 32;
      const cx = x + darR(z) * c;
      const y = darY(z);
      // the chord is foreshortened near the fixings (blade root twists into the clamp)
      const w = hc * Math.min(1, Math.sin(Math.PI * z) * 3 + 0.3);
      L.push([cx - w, y]);
      Rr.push([cx + w, y]);
    }
    return { L, R: Rr };
  };
  const path = (rb) => {
    ctx.beginPath();
    rb.L.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    for (let i = rb.R.length - 1; i >= 0; i--) ctx.lineTo(rb.R[i][0], rb.R[i][1]);
    ctx.closePath();
  };
  // back blade: hidden lines
  const back = ribbon(blades[0].a);
  ctx.save();
  ctx.setLineDash(HIDDEN_DASH);
  ctx.strokeStyle = ink(0.7);
  ctx.lineWidth = 1.1;
  path(back);
  ctx.stroke();
  ctx.restore();
  // shaft (tube) in front of the back blade
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - 6, DAR.hubTop + 2, 12, DAR.base - 34 - DAR.hubTop - 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  line(ctx, x - 6, DAR.hubTop + 2, x - 6, DAR.base - 34);
  line(ctx, x + 6, DAR.hubTop + 2, x + 6, DAR.base - 34);
  // clamps again (the blade roots sit in them)
  for (const y of [yTop, yBot]) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(x - 15, y - 7, 30, 14);
    ctx.strokeRect(x - 15, y - 7, 30, 14);
    line(ctx, x - 15, y, x + 15, y);
  }
  // shaft rotation mark (a key-way line that sweeps round)
  const kx = x + 5 * Math.cos(th * 1);
  if (Math.sin(th) > 0) {
    ctx.strokeStyle = INK2;
    ctx.lineWidth = 0.8;
    line(ctx, kx, yTop + 10, kx, yBot - 10);
  }
  // front blade: knocked-out ribbon with chord line
  const front = ribbon(blades[1].a);
  ctx.fillStyle = PAPER;
  path(front);
  ctx.fill();
  ctx.strokeStyle = 'rgba(156,195,240,0.35)';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // blade ribs (sections) to read the twist of the chord
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = INK2;
  ctx.beginPath();
  for (let i = 4; i < 32; i += 4) {
    ctx.moveTo(front.L[i][0], front.L[i][1]);
    ctx.lineTo(front.R[i][0], front.R[i][1]);
  }
  ctx.stroke();
  // rotation arrow at the top
  ctx.strokeStyle = YEL;
  ctx.fillStyle = YEL;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(x, DAR.hubTop - 27, 30, 7, 0, 0.25 * Math.PI, 1.65 * Math.PI);
  ctx.stroke();
  const ea = 1.65 * Math.PI;
  arrowHead(ctx, x + 30 * Math.cos(ea), DAR.hubTop - 27 + 7 * Math.sin(ea), ea + Math.PI / 2 + 0.25, 8, 3);
  ttext(ctx, 'ω', x + 40, DAR.hubTop - 31, 12, { color: YEL, weight: 700 });
}

// efficiency read-out of the rider's mini rotor (%), and the gauge needle
function readout(T) {
  if (T <= 0) return 0;
  if (T < 4.4) return (57.4 * (1 - Math.exp(-T / 1.4))) / (1 - Math.exp(-4.4 / 1.4));
  if (T < 5.0) return 57.4 + (61.2 - 57.4) * Math.pow((T - 4.4) / 0.6, 1.4);
  return lerp(61.2, BETZ, sstep(5.08, 5.4, T));
}
function needle(T) {
  const r = readout(T);
  const pinned = r > BETZ - 0.05 && T < 5.5;
  let v = Math.min(r, BETZ);
  if (pinned) v = BETZ - Math.abs(Math.sin(T * 47)) * 0.9;
  return v;
}
function drawNeedle(ctx, T) {
  const { x, y, r } = GAUGE;
  const v = needle(T);
  const a = gaugeAng(v);
  ctx.strokeStyle = 'rgba(156,195,240,0.4)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  line(ctx, x - Math.cos(a) * 14, y - Math.sin(a) * 14, x + Math.cos(a) * (r - 18), y + Math.sin(a) * (r - 18));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  line(ctx, x - Math.cos(a) * 14, y - Math.sin(a) * 14, x + Math.cos(a) * (r - 18), y + Math.sin(a) * (r - 18));
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, TAU);
  ctx.fill();
  // digital-ish value under the hub
  const shown = Math.min(readout(T), BETZ);
  ttext(ctx, `${shown.toFixed(1)}`, x + 22, y - 12, 10, { align: 'left', color: shown > BETZ - 0.6 ? RED : INK2, weight: 700 });
}

// --- rider: blueprint part ----------------------------------------------------
function drawMiniDarrieus(ctx, hub, angle) {
  const r = hub.r * 0.95;
  const h = r * 2.1;
  const top = hub.y - h / 2;
  const bot = hub.y + h / 2;
  const blades = [angle * 0.5, angle * 0.5 + Math.PI].map((a) => ({ c: Math.cos(a), z: Math.sin(a) }));
  blades.sort((p, q) => p.z - q.z);
  const blade = (b) => {
    ctx.beginPath();
    ctx.moveTo(hub.x, top + 2);
    ctx.bezierCurveTo(hub.x + b.c * r * 1.3, top + h * 0.12, hub.x + b.c * r * 1.3, bot - h * 0.12, hub.x, bot - 2);
    ctx.stroke();
  };
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = ink(0.75);
  ctx.save();
  ctx.setLineDash([4, 3]);
  blade(blades[0]);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  line(ctx, hub.x, top - 6, hub.x, bot + 4);
  ctx.lineWidth = 1.2;
  line(ctx, hub.x - 4, top + 2, hub.x + 4, top + 2);
  line(ctx, hub.x - 4, bot - 2, hub.x + 4, bot - 2);
  ctx.lineWidth = 1.7;
  blade(blades[1]);
}

function maskPath(ctx, h) {
  const s = h.r / 12.5;
  const ca = Math.cos(h.angle);
  const sa = Math.sin(h.angle);
  const R = (px, py) => ({ x: h.x + px * ca - py * sa, y: h.y + px * sa + py * ca });
  const m0 = R(-1, -h.r * 0.95);
  const m1 = R(h.r * 0.95, -h.r * 0.5);
  const m2 = R(h.r * 1.05, h.r * 0.55);
  const m3 = R(h.r * 0.1, h.r * 0.9);
  const m4 = R(-h.r * 0.15, 0);
  const c1 = R(h.r * 0.8, -h.r * 1.0);
  const c2 = R(h.r * 0.6, h.r * 1.0);
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.quadraticCurveTo(c1.x, c1.y, m1.x, m1.y);
  ctx.lineTo(m2.x, m2.y);
  ctx.quadraticCurveTo(c2.x, c2.y, m3.x, m3.y);
  ctx.quadraticCurveTo(m4.x - 2 * s, m4.y + 4 * s, m4.x, m4.y);
  ctx.quadraticCurveTo(m4.x - 1 * s, m4.y - 6 * s, m0.x, m0.y);
  ctx.closePath();
}
function billPath(ctx, rig) {
  const s = rig.root.scale;
  const bb0 = rig.billBase;
  const bt = rig.billTip;
  const d = rig.billDir;
  const nx = -Math.sin(d);
  const ny = Math.cos(d);
  const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
  const ux = (bt.x - bb0.x) / L;
  const uy = (bt.y - bb0.y) / L;
  const spoonC = { x: bt.x - ux * 8 * s, y: bt.y - uy * 8 * s };
  ctx.beginPath();
  ctx.moveTo(bb0.x + nx * -4.6 * s, bb0.y + ny * -4.6 * s);
  ctx.lineTo(spoonC.x - ux * 6 * s + nx * -2.2 * s, spoonC.y - uy * 6 * s + ny * -2.2 * s);
  ctx.quadraticCurveTo(bt.x + nx * -6.5 * s, bt.y + ny * -6.5 * s, bt.x + ux * 1.5 * s, bt.y + uy * 1.5 * s);
  ctx.quadraticCurveTo(bt.x + nx * 7.5 * s + ux * -1 * s, bt.y + ny * 7.5 * s + uy * -1 * s, spoonC.x - ux * 6 * s + nx * 2.4 * s, spoonC.y - uy * 6 * s + ny * 2.4 * s);
  ctx.lineTo(bb0.x + nx * 4.4 * s, bb0.y + ny * 4.4 * s);
  ctx.closePath();
}
function hatchQuick(ctx, pathFn, cx, cy, R, spacing, ang) {
  ctx.save();
  pathFn();
  ctx.clip();
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  ctx.beginPath();
  for (let o = -R; o <= R; o += spacing) {
    const px = cx - sa * o;
    const py = cy + ca * o;
    ctx.moveTo(px - ca * R, py - sa * R);
    ctx.lineTo(px + ca * R, py + sa * R);
  }
  ctx.stroke();
  ctx.restore();
}
function balloon(ctx, x, y, n, tx, ty) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 0.9;
  const a = Math.atan2(ty - y, tx - x);
  line(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 9, tx, ty);
  ctx.beginPath();
  ctx.arc(tx, ty, 1.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ttext(ctx, `${n}`, x, y + 4, 11, { align: 'center', weight: 700 });
}

function drawBlueprintRider(ctx, kit, params, scene, T) {
  const rig = kit.riderRig(params);
  const pin = { ...scene.pinwheel, colors: [INK, INK2] };
  // knock-out (the tracing was opaque where the part is drawn)
  kit.drawRider(ctx, rig, { silhouette: PAPER, outlineWidth: 0, showPinwheel: false });
  ctx.fillStyle = PAPER;
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r + 1, 0, TAU);
    ctx.fill();
  }
  // the white line-work
  ctx.save();
  kit.drawRider(ctx, rig, { wire: INK, lineScale: 1.05, spokes: 12, showPinwheel: false });
  ctx.restore();
  // rotor pole + a drafted miniature Darrieus rotor (hidden blade dashed)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  line(ctx, rig.poleBase.x, rig.poleBase.y, rig.poleTop.x, rig.poleTop.y);
  drawMiniDarrieus(ctx, rig.pinHub, rig.pinwheelAngle);
  // black parts as section hatching: face mask and bill
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  const h = rig.head;
  hatchQuick(ctx, () => maskPath(ctx, h), h.x, h.y, 18, 2.6, -45 * DEG);
  ctx.lineWidth = 1.2;
  maskPath(ctx, h);
  ctx.stroke();
  ctx.lineWidth = 0.9;
  hatchQuick(ctx, () => billPath(ctx, rig), (rig.billBase.x + rig.billTip.x) / 2, (rig.billBase.y + rig.billTip.y) / 2, 40, 2.6, -45 * DEG);
  // eye as a bright dot inside the hatched mask
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(rig.eye.x, rig.eye.y, 3.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(rig.eye.x + 0.4, rig.eye.y, 1.4, 0, TAU);
  ctx.fill();

  // --- drafting annotations that travel with the part ---
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  // wheelbase
  const rw = rig.rearWheel;
  const fw = rig.frontWheel;
  ctx.lineWidth = 0.7;
  ctx.save();
  ctx.setLineDash([5, 3]);
  line(ctx, rw.x, rw.y + 6, rw.x, 736);
  line(ctx, fw.x, fw.y + 6, fw.x, 736);
  ctx.restore();
  dimLine(ctx, rw.x, 730, fw.x, 730, '1 050', { size: 11 });
  ttext(ctx, 'PART 11-B · PLATALEA MINOR', (rw.x + fw.x) / 2, 748, 9.5, { align: 'center', color: INK2 });
  // overall height (ground to crown)
  const hx = fw.x + fw.r + 22;
  const topY = h.y - h.r;
  ctx.lineWidth = 0.7;
  line(ctx, h.x + 10, topY, hx + 6, topY);
  dimLine(ctx, hx, topY, hx, ROAD_Y, null, { lw: 0.8 });
  ctx.save();
  ctx.translate(hx + 12, (topY + ROAD_Y) / 2);
  ctx.rotate(-Math.PI / 2);
  ttext(ctx, '1 380', 0, 0, 11, { align: 'center' });
  ctx.restore();
  // bill angle
  const bb = rig.billBase;
  ctx.lineWidth = 0.7;
  line(ctx, bb.x, bb.y, bb.x + 64, bb.y);
  ctx.beginPath();
  ctx.arc(bb.x, bb.y, 48, 0, rig.billDir);
  ctx.stroke();
  ttext(ctx, '17°', bb.x + 56, bb.y + 13, 9.5, { color: INK2 });
  // balloons
  balloon(ctx, rig.billTip.x + 22, rig.billTip.y - 34, '1', rig.billTip.x - 6, rig.billTip.y - 1);
  balloon(ctx, h.x + 2, h.y - 46, '2', h.x + 6, h.y - 4);

  // --- ③ the rotor's efficiency read-out ---
  const hub = rig.pinHub;
  const r = readout(T);
  const over = r > BETZ + 0.05 && T < 5.2;
  const bx = hub.x - 178;
  const by = hub.y + 16;
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = INK;
  line(ctx, hub.x - 6, hub.y + 4, bx + 132, by + 8);
  ctx.beginPath();
  ctx.arc(hub.x - 6, hub.y + 4, 1.8, 0, TAU);
  ctx.fill();
  const warn = r > 57 && T < 5.4;
  const flash = warn && Math.sin(T * 30) > 0;
  ctx.fillStyle = PAPER;
  ctx.fillRect(bx, by, 132, 26);
  ctx.strokeStyle = over || flash ? RED : INK;
  ctx.lineWidth = over ? 2 : 1.2;
  ctx.strokeRect(bx, by, 132, 26);
  ctx.fillStyle = INK;
  balloon(ctx, bx - 14, by + 13, '3', bx - 14, by + 13);
  const txt = T > 5.4 ? `η = ${BETZ.toFixed(1)} % MAX` : `η = ${r.toFixed(1)} %`;
  ttext(ctx, txt, bx + 66, by + 18, 12.5, { align: 'center', weight: 700, color: over || flash ? RED : warn ? YEL : INK });
}

// --- the rubber stamp ---------------------------------------------------------
function paintStampSprite(g, rng, w, h, kit) {
  g.translate(w / 2, h / 2);
  g.strokeStyle = RED;
  g.fillStyle = RED;
  const bw = w - 24;
  const bh = h - 24;
  const rr = (x, y, ww, hh, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + ww, y, x + ww, y + hh, r);
    g.arcTo(x + ww, y + hh, x, y + hh, r);
    g.arcTo(x, y + hh, x, y, r);
    g.arcTo(x, y, x + ww, y, r);
    g.closePath();
  };
  g.lineWidth = 5;
  rr(-bw / 2, -bh / 2, bw, bh, 10);
  g.stroke();
  g.lineWidth = 1.6;
  rr(-bw / 2 + 8, -bh / 2 + 8, bw - 16, bh - 16, 6);
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `400 54px ${kit.FONT.poster}`;
  try {
    g.letterSpacing = '6px';
  } catch (e) {
    /* */
  }
  g.fillText('REJECTED', 0, 8);
  try {
    g.letterSpacing = '3px';
  } catch (e) {
    /* */
  }
  g.font = `900 22px ${kit.FONT.sans}`;
  g.fillText('— 超過貝茲極限 —', 0, 40);
  g.font = `700 10px ${kit.FONT.mono}`;
  g.fillText('η  >  16/27', 0, -36);
  // worn rubber: knock out speckles and a few streaks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    const x = (rng() - 0.5) * w;
    const y = (rng() - 0.5) * h;
    const r = 0.4 + rng() * 1.5;
    g.globalAlpha = 0.4 + rng() * 0.6;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 0.5;
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = (rng() - 0.5) * h;
    g.beginPath();
    g.moveTo(-w / 2, y);
    g.lineTo(w / 2, y + (rng() - 0.5) * 10);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}
function drawStamp(ctx, T, sprite) {
  if (T < STAMP.t) return;
  const dt = T - STAMP.t;
  const down = sstep(0, 0.08, dt);
  const scale = lerp(1.7, 1, down) + 0.04 * Math.sin(clamp((dt - 0.08) / 0.18, 0, 1) * Math.PI);
  const alpha = lerp(0.25, 0.9, down);
  ctx.save();
  ctx.translate(STAMP.x, STAMP.y);
  ctx.rotate(STAMP.rot);
  // impact ticks
  if (dt > 0.06 && dt < 0.4) {
    const k = (dt - 0.06) / 0.34;
    ctx.strokeStyle = `rgba(255,93,74,${0.8 * (1 - k)})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.2;
      const r0 = 150 + k * 30;
      const ex = Math.cos(a) * r0;
      const ey = Math.sin(a) * r0 * 0.42;
      ctx.beginPath();
      ctx.moveTo(ex * 0.92, ey * 0.92);
      ctx.lineTo(ex * 1.08, ey * 1.08);
      ctx.stroke();
    }
  }
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 6.6 : params.rawLocalT;
  MONO = kit.FONT.mono;
  SANS = kit.FONT.sans;
  ctx.save();

  const bg = kit.bake('betz_bg', S, S, (g, rng) => {
    paintPaper(kit, g, rng);
    // the line work is drawn on its own layer, then printed twice: a soft halo
    // (light creeping under the tracing) and the crisp line
    const lw = kit.createCanvas(S, S);
    const l = lw.getContext('2d');
    l.lineCap = 'round';
    l.lineJoin = 'round';
    paintBorder(l);
    paintFig1(l);
    paintFig2(l);
    paintGauge(l);
    paintSection(l);
    paintNotes(l);
    paintTitleBlock(l);
    paintGround(l);
    g.save();
    g.filter = 'blur(1.6px)';
    g.globalAlpha = 0.55;
    g.drawImage(lw, 0, 0);
    g.restore();
    g.globalAlpha = 0.92;
    g.drawImage(lw, 0, 0);
    g.globalAlpha = 1;
    paintCreases(g);
    paintRedPencil(g, rng);
  });
  const stamp = kit.bake('betz_stamp', 300, 120, (g, rng, w, h) => paintStampSprite(g, rng, w, h, kit));

  ctx.drawImage(bg, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawParticles(ctx, T);
  drawDarrieus(ctx, T);
  drawNeedle(ctx, T);
  if (kit.riderVisible(params)) drawBlueprintRider(ctx, kit, params, scene, T);
  drawStamp(ctx, T, stamp);
  ctx.restore();
}
