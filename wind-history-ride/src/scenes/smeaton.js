// src/scenes/smeaton.js
// #07 · 1759 · 斯米頓的風車實驗 — Smeaton's windmill experiments.
//
// Medium: an 18th-century copperplate plate from the Philosophical Transactions:
// cream laid paper, plate-mark, fine parallel hatching / cross-hatching in one
// warm black ink, engraved italic figure labels and capital reference letters.
//
//   Fig. 1  Smeaton's whirling-arm apparatus (Phil. Trans. LI, 1759, Part III):
//           pyramidal frame ABC, upright axis DE, arm FG carrying the model sails I
//           round a circle (the motion makes the wind), barrel H turned by the cord Z,
//           scale P raised between the pillars QR by a line wound on the sail axle,
//           counter-weight W, pendulum VX on the perforated table Y.
//   Fig. 2  An English tower mill with a fan-tail (Edmund Lee's patent, 1745):
//           on bar 2 the wind veers (see the Plan), the fly spins and winds the cap
//           round until the sails face the wind again.
//   Fig. 3  "Platalea velocipedica" — the rider, engraved as a specimen figure whose
//           dimension lines and lettered parts follow it across the plate. On bar 4 the
//           burin cuts an N.B.: the bird, by its own motion, makes the wind that turns
//           its sails — exactly the principle of Smeaton's whirling arm.

const S = 1000;
const ROAD_Y = 700;
const INK = '#2b2620';
const INK_RGB = '43,38,32';
const PAPER = '#f0e9d8';
const ink = (a) => `rgba(${INK_RGB},${a})`;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// plate-mark (the copper plate's bevelled edge pressed into the paper)
const PL = { x0: 44, y0: 40, x1: 956, y1: 962 };

// -----------------------------------------------------------------------------
// tiny orthographic 3D (y up, z towards the viewer)
// -----------------------------------------------------------------------------
function makeView(cx, gy, yaw, pitch) {
  return { cx, gy, cyw: Math.cos(yaw), syw: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
}
function P(v, X, Y, Z) {
  const xp = X * v.cyw + Z * v.syw;
  const zp = -X * v.syw + Z * v.cyw;
  return { x: v.cx + xp, y: v.gy - Y * v.cp + zp * v.sp, d: zp * v.cp + Y * v.sp };
}
const v3 = (x, y, z) => ({ x, y, z });
const add3 = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul3 = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const comb3 = (o, a, sa, b, sb) => ({ x: o.x + a.x * sa + b.x * sb, y: o.y + a.y * sa + b.y * sb, z: o.z + a.z * sa + b.z * sb });
const PV = (v, p) => P(v, p.x, p.y, p.z);

// Fig. 1 — the whirling-arm apparatus
const V1 = makeView(300, 612, 0.38, 0.3);
const ARM_Y = 300;
const ARM_R = 175; // radius DI of the circle described by the sails' axis
const ARM_BACK = 78; // counter-weight end F
const SAIL1_R = 54;
const PILLAR_TOP = 448;
// Fig. 2 — the tower mill
const V2 = makeView(800, 630, 0, 0.14);
const TOWER = { rb: 56, rt: 34, h: 280 };
const STAGE_Y = 104;
const HUB2_Y = 300;
const SAIL2_R = 145;
// plan inset of the cap
const PLAN = { x: 604, y: 236, r: 36 };

// -----------------------------------------------------------------------------
// timing
// -----------------------------------------------------------------------------
/** integral of smoothstep(a,b,x) from a to T (closed form) */
function intSmooth(T, a, b) {
  const s = Math.max(0, Math.min(1, (T - a) / (b - a)));
  return (b - a) * (s * s * s - 0.5 * s * s * s * s) + Math.max(0, T - b);
}
function armAngle(T) {
  // at rest until the downbeat, the cord is pulled and the arm comes up to one turn per bar
  // (two vibrations of the pendulum per turn), the run ends after bar 4.
  const up = intSmooth(T, -0.6, 0.9);
  const down = intSmooth(T, 8.6, 10.4);
  return Math.PI * (up - down) + 0.35;
}
function windDir(T) {
  return (56 - 26 * smoothstepN(1.9, 2.5, T)) * DEG;
}
function capDir(T) {
  return (56 - 26 * smootherN(2.5, 5.7, T)) * DEG;
}
function smoothstepN(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function smootherN(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// -----------------------------------------------------------------------------
// drawing helpers
// -----------------------------------------------------------------------------
function poly(g, pts, close = true) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
}

/** Parallel hatching clipped to the current path set by `pathFn`. */
function hatch(g, pathFn, angle, spacing, lw, alpha, cx, cy, R, phase = 0) {
  g.save();
  pathFn(g);
  g.clip();
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  g.beginPath();
  for (let o = -R + (phase % spacing); o <= R; o += spacing) {
    const px = cx - sa * o;
    const py = cy + ca * o;
    g.moveTo(px - ca * R, py - sa * R);
    g.lineTo(px + ca * R, py + sa * R);
  }
  g.lineWidth = lw;
  g.strokeStyle = ink(alpha);
  g.stroke();
  g.restore();
}

/** An engraved line that swells in the middle and tapers at both ends. */
function swellLine(g, x0, y0, x1, y1, w, alpha = 0.95) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1);
  g.quadraticCurveTo(mx - nx * w, my - ny * w, x0, y0);
  g.fillStyle = ink(alpha);
  g.fill();
}

function text(g, str, x, y, size, opt = {}) {
  const { italic = false, align = 'left', alpha = 0.95, font = null, spacing = 0, baseline = 'alphabetic' } = opt;
  g.font = `${italic ? 'italic ' : ''}400 ${size}px ${font || '"IM Fell English", "Cormorant Garamond", Georgia, serif'}`;
  g.textAlign = align;
  g.textBaseline = baseline;
  g.fillStyle = ink(alpha);
  if (spacing) {
    try {
      g.letterSpacing = `${spacing}px`;
    } catch (e) {
      /* older canvas: ignore */
    }
  }
  g.fillText(str, x, y);
  if (spacing) {
    try {
      g.letterSpacing = '0px';
    } catch (e) {
      /* ignore */
    }
  }
}

/** Reference letter with a paper halo so it reads over hatching. */
function letter(g, str, x, y, size = 15, italic = true) {
  g.font = `${italic ? 'italic ' : ''}400 ${size}px "IM Fell English", Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(240,233,216,0.92)';
  g.lineWidth = 3.2;
  g.strokeText(str, x, y);
  g.fillStyle = ink(0.95);
  g.fillText(str, x, y);
}

/** Square-section timber between two projected points: paper body, ink edges, hatched shade side. */
function beam(g, a, b, w, shade = 0.5, hatchAngle = null) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * (w / 2);
  const ny = (dx / L) * (w / 2);
  const q = [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny },
  ];
  poly(g, q);
  g.fillStyle = PAPER;
  g.fill();
  // shade side: lines along the timber on the side facing right (away from the light)
  const side = nx > 0 ? 1 : -1;
  const n = Math.max(1, Math.round(shade * 4));
  g.beginPath();
  for (let k = 0; k < n; k++) {
    const f = side * (0.12 + (0.8 * k) / Math.max(1, n));
    g.moveTo(a.x + nx * f, a.y + ny * f);
    g.lineTo(b.x + nx * f, b.y + ny * f);
  }
  g.strokeStyle = ink(0.75);
  g.lineWidth = 0.7;
  g.stroke();
  if (hatchAngle !== null) {
    hatch(g, (h) => poly(h, q), hatchAngle, 2.6, 0.6, 0.55, (a.x + b.x) / 2, (a.y + b.y) / 2, L / 2 + w);
  }
  poly(g, q);
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.05;
  g.stroke();
}

// -----------------------------------------------------------------------------
// windmill sails (shared by the model in Fig. 1 and the tower mill in Fig. 2)
// -----------------------------------------------------------------------------
/**
 * hub: 3D point, ax/ay: in-plane unit vectors (ax ~ horizontal, ay ~ up), front: unit vector the
 * sails face (towards the wind), phi: rotation (increasing = anticlockwise seen from the front).
 * The lattice + cloth lie on the trailing side, twisted back by the angle of weather.
 */
function drawSails(g, view, hub, ax, ay, front, R, phi, opt = {}) {
  const { n = 4, lw = 1, bars = 9, cloth = true, light = v3(-0.6, 0.5, 0.62), detail = 1 } = opt;
  const sails = [];
  for (let k = 0; k < n; k++) {
    const a = phi + (k * TAU) / n;
    const e = comb3(v3(0, 0, 0), ax, Math.cos(a), ay, Math.sin(a));
    const w = comb3(v3(0, 0, 0), ax, -Math.sin(a), ay, Math.cos(a)); // direction of motion
    const tipP = PV(view, add3(hub, mul3(e, R)));
    sails.push({ e, w, depth: tipP.d });
  }
  sails.sort((A, B) => A.depth - B.depth);
  // stocks behind the sails
  const hubP = PV(view, hub);
  g.lineCap = 'round';
  for (const s of sails) {
    const { e, w } = s;
    const r0 = 0.2 * R;
    const lead = 0.05 * R;
    const trail = 0.24 * R;
    const pt = (r, side, f) => {
      // side: +1 leading (narrow board), -1 trailing (lattice); f: width fraction
      const wd = side > 0 ? lead * f : trail * f;
      const t = (r - r0) / (R - r0);
      const weather = (side > 0 ? 0 : 1) * Math.tan((22 - 14 * t) * DEG) * wd;
      return PV(view, add3(add3(hub, mul3(e, r)), add3(mul3(w, side * wd), mul3(front, -weather))));
    };
    // cloth / lattice outline
    const steps = 4;
    const outer = [];
    for (let i = 0; i <= steps; i++) outer.push(pt(r0 + ((R - r0) * i) / steps, -1, 1));
    const inner = [];
    for (let i = steps; i >= 0; i--) inner.push(pt(r0 + ((R - r0) * i) / steps, 1, 1));
    const quad = outer.concat(inner);
    poly(g, quad);
    g.fillStyle = PAPER;
    g.fill();
    // shading: how much the cloth faces the light (rough normal = front)
    const nrm = add3(front, mul3(w, 0.25));
    const lit = Math.max(0, nrm.x * light.x + nrm.y * light.y + nrm.z * light.z);
    // apparent width — sails seen edge-on get dense hatching
    const a0 = pt(R * 0.6, -1, 1);
    const a1 = pt(R * 0.6, 1, 1);
    const appW = Math.hypot(a0.x - a1.x, a0.y - a1.y) / ((0.29 * R) || 1);
    if (cloth) {
      const dens = 0.25 + 0.55 * (1 - lit) + 0.3 * (1 - Math.min(1, appW));
      const nl = Math.round((2 + 5 * dens) * detail);
      g.beginPath();
      for (let j = 1; j <= nl; j++) {
        const f = j / (nl + 1);
        const p0 = pt(r0 + 2, -1, f);
        const p1 = pt(R - 1, -1, f);
        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
      }
      g.strokeStyle = ink(0.35 + 0.35 * dens);
      g.lineWidth = 0.55 * lw;
      g.stroke();
    }
    // sail bars across the lattice
    g.beginPath();
    for (let j = 0; j <= bars; j++) {
      const r = r0 + ((R - r0) * j) / bars;
      const p0 = pt(r, 1, 1);
      const p1 = pt(r, -1, 1);
      g.moveTo(p0.x, p0.y);
      g.lineTo(p1.x, p1.y);
    }
    // hemlath + middle lath
    for (const f of [1, 0.5]) {
      const p0 = pt(r0, -1, f);
      const p1 = pt(R, -1, f);
      g.moveTo(p0.x, p0.y);
      g.lineTo(p1.x, p1.y);
    }
    g.strokeStyle = ink(0.85);
    g.lineWidth = 0.7 * lw;
    g.stroke();
    poly(g, quad);
    g.strokeStyle = ink(0.95);
    g.lineWidth = 0.9 * lw;
    g.stroke();
    // whip / stock
    const tip = PV(view, add3(hub, mul3(e, R * 1.02)));
    swellLine(g, hubP.x, hubP.y, tip.x, tip.y, 1.6 * lw, 0.95);
  }
}

// -----------------------------------------------------------------------------
// static layers (baked)
// -----------------------------------------------------------------------------
function paintPaper(kit, g, rng) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S, S);
  kit.addBlotches(g, S, S, rng, 'rgba(160,128,80,0.05)', 24, 90, 300);
  // laid lines (fine, horizontal) and chain lines (vertical, ~26 px apart)
  g.fillStyle = 'rgba(120,98,66,0.03)';
  for (let y = 0; y < S; y += 2) g.fillRect(0, y, S, 1);
  for (let x = 9; x < S; x += 26.3) {
    const gr = g.createLinearGradient(x - 3, 0, x + 3, 0);
    gr.addColorStop(0, 'rgba(120,98,66,0)');
    gr.addColorStop(0.5, 'rgba(120,98,66,0.06)');
    gr.addColorStop(1, 'rgba(120,98,66,0)');
    g.fillStyle = gr;
    g.fillRect(x - 3, 0, 6, S);
  }
  // foxing
  for (let i = 0; i < 46; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 1 + rng() * (rng() < 0.15 ? 9 : 3);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(150,105,55,${0.12 + rng() * 0.16})`);
    gr.addColorStop(1, 'rgba(150,105,55,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // plate tone inside the plate-mark, with faint wiping streaks
  g.fillStyle = 'rgba(110,92,62,0.045)';
  g.fillRect(PL.x0, PL.y0, PL.x1 - PL.x0, PL.y1 - PL.y0);
  g.save();
  g.beginPath();
  g.rect(PL.x0, PL.y0, PL.x1 - PL.x0, PL.y1 - PL.y0);
  g.clip();
  for (let i = 0; i < 70; i++) {
    const y = PL.y0 + rng() * (PL.y1 - PL.y0);
    g.strokeStyle = `rgba(90,75,50,${0.01 + rng() * 0.025})`;
    g.lineWidth = 1 + rng() * 6;
    g.beginPath();
    g.moveTo(PL.x0, y);
    g.bezierCurveTo(300, y + (rng() - 0.5) * 30, 700, y + (rng() - 0.5) * 30, PL.x1, y + (rng() - 0.5) * 20);
    g.stroke();
  }
  // ink build-up just inside the bevel
  const edge = 10;
  for (const [x, y, w, h, x2, y2] of [
    [PL.x0, PL.y0, PL.x1 - PL.x0, edge, 0, 1],
    [PL.x0, PL.y1 - edge, PL.x1 - PL.x0, edge, 0, -1],
    [PL.x0, PL.y0, edge, PL.y1 - PL.y0, 1, 0],
    [PL.x1 - edge, PL.y0, edge, PL.y1 - PL.y0, -1, 0],
  ]) {
    const gx0 = x2 === -1 ? x + w : x;
    const gy0 = y2 === -1 ? y + h : y;
    const gr = g.createLinearGradient(gx0, gy0, gx0 + x2 * edge, gy0 + y2 * edge);
    gr.addColorStop(0, 'rgba(70,58,40,0.10)');
    gr.addColorStop(1, 'rgba(70,58,40,0)');
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
  }
  g.restore();
  // plate-mark bevel: pressed-in ridge (shadow below/right, highlight above/left)
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255,252,240,0.85)';
  g.beginPath();
  g.moveTo(PL.x0 - 1.5, PL.y1);
  g.lineTo(PL.x0 - 1.5, PL.y0 - 1.5);
  g.lineTo(PL.x1, PL.y0 - 1.5);
  g.stroke();
  g.strokeStyle = 'rgba(80,66,44,0.28)';
  g.beginPath();
  g.moveTo(PL.x0 + 1, PL.y1 + 1);
  g.lineTo(PL.x1 + 1, PL.y1 + 1);
  g.lineTo(PL.x1 + 1, PL.y0);
  g.stroke();
  g.strokeStyle = 'rgba(80,66,44,0.22)';
  g.lineWidth = 1;
  g.strokeRect(PL.x0 + 0.5, PL.y0 + 0.5, PL.x1 - PL.x0 - 1, PL.y1 - PL.y0 - 1);
  kit.addGrain(g, S, S, rng, 0.02);
}

function paintTitles(g) {
  // running head
  text(g, 'Philoſ. Tranſ. Vol. LI.', PL.x0 + 22, 72, 17, { italic: true });
  text(g, 'TAB. VI.', PL.x1 - 22, 72, 17, { align: 'right', spacing: 1 });
  // title block
  text(g, 'An EXPERIMENTAL ENQUIRY concerning the NATURAL POWERS', 500, 100, 16, { align: 'center', spacing: 0.6 });
  text(g, 'of WATER and WIND to turn MILLS', 500, 121, 16, { align: 'center', spacing: 0.6 });
  text(g, 'Part III. Of the Conſtruction and Effects of Windmill-Sails.', 500, 141, 13.5, { italic: true, align: 'center', alpha: 0.85 });
  // flourish rule
  g.strokeStyle = ink(0.8);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(420, 152);
  g.lineTo(580, 152);
  g.stroke();
  swellLine(g, 470, 152, 530, 152, 1.3, 0.9);
  // figure labels
  text(g, 'Fig. 1.', 74, 196, 21, { italic: true });
  text(g, 'Fig. 2.', 868, 196, 21, { italic: true });
  // imprint lines below the work
  text(g, 'J. Smeaton delin.', PL.x0 + 22, PL.y1 - 14, 13, { italic: true, alpha: 0.8 });
  text(g, 'Lond. 1759.', PL.x1 - 22, PL.y1 - 14, 13, { italic: true, alpha: 0.8, align: 'right' });
}

/** A scale of feet (1 ft = 49 px, also used for Fig. 3's dimensions). */
const FOOT = 49;
function paintScale(g) {
  const x0 = 500 - 3 * FOOT;
  const y = 926;
  const h = 6;
  g.strokeStyle = ink(0.95);
  g.lineWidth = 0.9;
  g.strokeRect(x0 - FOOT, y, FOOT * 7, h);
  // first foot divided into inches (alternating, like a diagonal scale's head)
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      g.fillStyle = ink(0.92);
      g.fillRect(x0 - FOOT + (i * FOOT) / 12, y, FOOT / 12, h / 2);
    } else {
      g.fillStyle = ink(0.92);
      g.fillRect(x0 - FOOT + (i * FOOT) / 12, y + h / 2, FOOT / 12, h / 2);
    }
  }
  for (let i = 0; i < 6; i++) {
    if (i % 2 === 0) {
      g.fillStyle = ink(0.92);
      g.fillRect(x0 + i * FOOT, y, FOOT, h);
    }
  }
  g.beginPath();
  for (let i = -1; i <= 6; i++) {
    g.moveTo(x0 + i * FOOT, y - 3);
    g.lineTo(x0 + i * FOOT, y + h);
  }
  g.stroke();
  for (let i = 0; i <= 6; i++) text(g, String(i), x0 + i * FOOT, y - 6, 12, { align: 'center' });
  text(g, '12', x0 - FOOT, y - 6, 11, { align: 'center' });
  text(g, "A Scale of Feet.", 500, y + 24, 14, { italic: true, align: 'center' });
}

/** Ground hatch: horizontal engraved strokes fading at the ends. */
function groundHatch(g, cx, cy, rx, ry, rows, gap, alpha, rng) {
  g.beginPath();
  for (let i = 0; i < rows; i++) {
    const yy = cy + (i - rows / 2) * gap;
    const f = 1 - Math.pow((i - rows / 2) / (rows / 2 + 0.5), 2);
    const half = rx * Math.sqrt(Math.max(0, f)) * (0.82 + 0.3 * rng());
    const off = (rng() - 0.5) * rx * 0.2;
    // broken strokes
    let x = cx - half + off;
    while (x < cx + half + off) {
      const seg = 8 + rng() * 30;
      g.moveTo(x, yy);
      g.lineTo(Math.min(cx + half + off, x + seg), yy);
      x += seg + 2 + rng() * 5;
    }
  }
  g.strokeStyle = ink(alpha);
  g.lineWidth = 0.7;
  g.stroke();
}

// ----- Fig. 1 static parts -----
const LEG_ANG = [90, 210, 330].map((a) => (a + 8) * DEG);
const FOOT_R = 136;
const APEX_Y = 276;
function legFoot(i) {
  return v3(Math.cos(LEG_ANG[i]) * FOOT_R, 0, Math.sin(LEG_ANG[i]) * FOOT_R);
}
function legAt(i, Y) {
  const f = legFoot(i);
  const k = 1 - Y / APEX_Y;
  return v3(f.x * k * 0.92 + f.x * 0.0, Y, f.z * k * 0.92);
}

function paintFig1Ground(g, rng) {
  // floor hatch and cast shadows (light from the upper left -> shadows fall right/back)
  const c = P(V1, 0, 0, 0);
  groundHatch(g, c.x + 18, c.y + 8, 205, 50, 14, 4.2, 0.42, rng);
  // cast shadow of the frame: darker cross-strokes to the right
  g.save();
  g.beginPath();
  const pts = [legFoot(0), legFoot(1), legFoot(2)].map((p) => P(V1, p.x, 0, p.z));
  const apexS = P(V1, 150, 0, -40);
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(apexS.x, apexS.y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.closePath();
  g.clip();
  g.beginPath();
  for (let y = c.y - 60; y < c.y + 60; y += 2.6) {
    g.moveTo(c.x - 200, y);
    g.lineTo(c.x + 260, y + 4);
  }
  g.strokeStyle = ink(0.35);
  g.lineWidth = 0.6;
  g.stroke();
  g.restore();
  // dotted circle described by the sails' axis (radius DI)
  g.save();
  g.setLineDash([1.2, 4.2]);
  g.strokeStyle = ink(0.7);
  g.lineWidth = 1.1;
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU;
    const p = P(V1, Math.cos(a) * ARM_R, ARM_Y, Math.sin(a) * ARM_R);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  g.restore();
}

/** The pyramidal frame ABC, upright axis DE, barrel H with cord Z (transparent sprite). */
function paintFig1Frame(g) {
  const PP = (p) => P(V1, p.x, p.y, p.z);
  // sills joining the feet (drawn back to front)
  const feet = [0, 1, 2].map((i) => legFoot(i));
  const order = [0, 1, 2].sort((a, b) => P(V1, feet[a].x, 0, feet[a].z).d - P(V1, feet[b].x, 0, feet[b].z).d);
  // back legs first
  const center0 = v3(0, 0, 0);
  // cross sills from each foot to the centre (footstep of the axis)
  for (const i of order) {
    beam(g, PP(feet[i]), PP(center0), 7, 0.6);
  }
  const apex = v3(0, APEX_Y, 0);
  const braceYs = [92, 188];
  for (const i of order) {
    const f = feet[i];
    beam(g, PP(f), PP(apex), 9, 0.7);
  }
  // horizontal braces between legs at two heights
  for (const Y of braceYs) {
    for (let k = 0; k < 3; k++) {
      const a = legAt(k, Y);
      const b = legAt((k + 1) % 3, Y);
      const pa = PP(a);
      const pb = PP(b);
      beam(g, pa, pb, 5, 0.4);
    }
  }
  // re-draw the front leg on top so it reads as nearest
  const front = order[2];
  beam(g, PP(feet[front]), PP(apex), 9, 0.7);
  // upright axis DE
  const D = PP(v3(0, 0, 0));
  const E = PP(v3(0, ARM_Y + 8, 0));
  beam(g, D, E, 6, 0.8);
  // collar / bearing at the apex
  const ap = PP(apex);
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(ap.x, ap.y, 13, 5.5, 0, 0, TAU);
  g.fill();
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = PAPER;
  g.fillRect(ap.x - 13, ap.y, 26, 9);
  g.beginPath();
  g.moveTo(ap.x - 13, ap.y);
  g.lineTo(ap.x - 13, ap.y + 9);
  g.moveTo(ap.x + 13, ap.y);
  g.lineTo(ap.x + 13, ap.y + 9);
  g.stroke();
  g.beginPath();
  g.ellipse(ap.x, ap.y + 9, 13, 5.5, 0, 0, Math.PI);
  g.stroke();
  hatch(g, (h) => h.rect(ap.x + 2, ap.y + 1, 11, 12), Math.PI / 2, 2.2, 0.6, 0.7, ap.x + 7, ap.y + 7, 14);
  // barrel H on the axis with the wound cord
  const H0 = PP(v3(0, 128, 0));
  const H1 = PP(v3(0, 160, 0));
  const hr = 15;
  g.fillStyle = PAPER;
  g.fillRect(H1.x - hr, H1.y, hr * 2, H0.y - H1.y);
  g.beginPath();
  g.ellipse(H0.x, H0.y, hr, hr * 0.3, 0, 0, TAU);
  g.fill();
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(H0.x, H0.y, hr, hr * 0.3, 0, 0, Math.PI);
  g.stroke();
  g.beginPath();
  g.ellipse(H1.x, H1.y, hr, hr * 0.3, 0, 0, TAU);
  g.fillStyle = PAPER;
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(H1.x - hr, H1.y);
  g.lineTo(H0.x - hr, H0.y);
  g.moveTo(H1.x + hr, H1.y);
  g.lineTo(H0.x + hr, H0.y);
  g.stroke();
  // turns of cord (slanted arcs), darker on the right
  g.beginPath();
  for (let y = H1.y + 3; y < H0.y - 1; y += 2.4) {
    g.moveTo(H1.x - hr, y);
    g.quadraticCurveTo(H1.x, y + hr * 0.3 + 1.4, H1.x + hr, y + 0.8);
  }
  g.strokeStyle = ink(0.75);
  g.lineWidth = 0.6;
  g.stroke();
  hatch(g, (h) => h.rect(H1.x + 5, H1.y, hr - 5, H0.y - H1.y + 4), Math.PI / 2, 1.8, 0.6, 0.6, H1.x + 10, (H1.y + H0.y) / 2, 30);
  // cord Z leaving the barrel (to the hand of the experimenter), through a guide pulley L
  const cordY = (H0.y + H1.y) / 2 + 2;
  const guide = { x: 128, y: cordY + 30 };
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(H1.x - hr, cordY);
  g.lineTo(guide.x + 5, guide.y - 6);
  g.stroke();
  // guide pulley on a little bracket
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(guide.x, guide.y, 6, 0, TAU);
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(guide.x, guide.y, 1.6, 0, TAU);
  g.fillStyle = ink(0.95);
  g.fill();
  beam(g, { x: guide.x, y: guide.y + 4 }, { x: guide.x, y: P(V1, -140, 0, 30).y + 2 }, 4, 0.4);
}

function fig1StaticLetters(g) {
  const PP = (p) => P(V1, p.x, p.y, p.z);
  const feet = [0, 1, 2].map((i) => PP(legFoot(i)));
  const names = ['B', 'A', 'C'];
  for (let i = 0; i < 3; i++) letter(g, names[i], feet[i].x + (feet[i].x < 300 ? -14 : 14), feet[i].y + 10, 16, false);
  const D = PP(v3(0, 0, 0));
  letter(g, 'D', D.x + 14, D.y + 4, 16, false);
  const H = PP(v3(0, 144, 0));
  letter(g, 'H', H.x + 28, H.y, 16, false);
}

// pendulum table Y (static) — legs + perforated top
const TABLE = { X: 212, Z: -36, top: 70, w: 30 };
function tableTop() {
  return P(V1, TABLE.X, TABLE.top, TABLE.Z);
}
function paintTable(g) {
  const c = tableTop();
  const w = TABLE.w;
  const g0 = P(V1, TABLE.X, 0, TABLE.Z);
  // legs
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const a = P(V1, TABLE.X + dx * w * 0.8, TABLE.top, TABLE.Z + dz * w * 0.5);
    const b = P(V1, TABLE.X + dx * w * 0.85, 0, TABLE.Z + dz * w * 0.55);
    beam(g, a, b, 4, 0.5);
  }
  // top slab (ellipse-ish box)
  const tl = P(V1, TABLE.X - w, TABLE.top, TABLE.Z - w * 0.6);
  const tr = P(V1, TABLE.X + w, TABLE.top, TABLE.Z - w * 0.6);
  const br = P(V1, TABLE.X + w, TABLE.top, TABLE.Z + w * 0.6);
  const bl = P(V1, TABLE.X - w, TABLE.top, TABLE.Z + w * 0.6);
  poly(g, [tl, tr, br, bl]);
  g.fillStyle = PAPER;
  g.fill();
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1;
  g.stroke();
  // front edge thickness
  const th = 5;
  poly(g, [bl, br, { x: br.x, y: br.y + th }, { x: bl.x, y: bl.y + th }]);
  g.fillStyle = PAPER;
  g.fill();
  g.stroke();
  hatch(g, (h) => poly(h, [bl, br, { x: br.x, y: br.y + th }, { x: bl.x, y: bl.y + th }]), 0, 1.6, 0.55, 0.8, (bl.x + br.x) / 2, bl.y + 3, 40);
  poly(g, [tr, br, { x: br.x, y: br.y + th }, { x: tr.x, y: tr.y + th }]);
  g.fillStyle = PAPER;
  g.fill();
  g.stroke();
  // the perforation (slot) for the pendulum rod
  g.fillStyle = ink(0.9);
  g.beginPath();
  g.ellipse(c.x, c.y, 9, 2.6, 0, 0, TAU);
  g.fill();
  // little standards carrying the pendulum's axis
  for (const dx of [-12, 12]) {
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(c.x + dx, c.y + 1);
    g.lineTo(c.x + dx * 0.4, c.y - 9);
    g.stroke();
  }
  // shadow on the floor
  groundHatch(g, g0.x + 12, g0.y + 3, 36, 8, 4, 2.4, 0.5, () => 0.5);
  letter(g, 'Y', c.x - w - 14, c.y + 2, 16, false);
}

// ----- Fig. 2 static parts: the tower and the stage -----
function towerR(Y) {
  return TOWER.rb + (TOWER.rt - TOWER.rb) * (Y / TOWER.h);
}
function ringPt(Y, r, a) {
  // a = 0 -> front (towards viewer), +pi/2 -> right
  return P(V2, Math.sin(a) * r, Y, Math.cos(a) * r);
}

/** Ruled sky behind the mill: horizontal engraved lines in a vignetted oval, broken by clouds. */
function paintSky(g, rng) {
  const cx = 794;
  const cy = 420;
  const rx = 150;
  const ry = 250;
  const clouds = [
    { x: 700, y: 236, rx: 52, ry: 15 },
    { x: 742, y: 226, rx: 34, ry: 13 },
    { x: 902, y: 300, rx: 46, ry: 12 },
    { x: 880, y: 292, rx: 26, ry: 10 },
    { x: 690, y: 440, rx: 40, ry: 10 },
  ];
  const inCloud = (x, y) => {
    for (const c of clouds) {
      const dx = (x - c.x) / c.rx;
      const dy = (y - c.y) / c.ry;
      // flat-bottomed cumulus: rounder top, flatter base
      if (dx * dx + (dy < 0 ? dy * dy * 0.8 : dy * dy * 2.2) < 1) return c;
    }
    return null;
  };
  g.save();
  g.beginPath();
  g.rect(PL.x0 + 10, PL.y0 + 10, PL.x1 - PL.x0 - 20, PL.y1 - PL.y0 - 20);
  g.clip();
  g.lineWidth = 0.6;
  for (let y = cy - ry; y < 628; y += 3.3) {
    const f = (y - (cy - ry)) / (2 * ry);
    const dy = (y - cy) / ry;
    let half = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    if (y > cy) half = Math.max(half, rx * (0.92 + 0.12 * Math.sin(y * 0.05)));
    half *= 0.86 + 0.22 * rng();
    if (half < 6) continue;
    const a = 0.1 + 0.26 * Math.min(1, f * 1.3);
    g.strokeStyle = ink(a);
    g.beginPath();
    let x = cx - half;
    let pen = false;
    while (x < cx + half) {
      const c = inCloud(x, y);
      if (!c && !pen) {
        g.moveTo(x, y);
        pen = true;
      } else if (c && pen) {
        g.lineTo(x, y);
        pen = false;
      }
      x += 2;
    }
    if (pen) g.lineTo(cx + half, y);
    g.stroke();
  }
  g.restore();
  // cloud contours: soft broken scallops on top, shadowed lower edge
  for (const c of clouds) {
    g.strokeStyle = ink(0.45);
    g.lineWidth = 0.7;
    g.beginPath();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + (i / n) * Math.PI;
      const a1 = Math.PI + ((i + 0.8) / n) * Math.PI;
      g.moveTo(c.x + Math.cos(a0) * c.rx, c.y + Math.sin(a0) * c.ry * 1.1);
      g.quadraticCurveTo(
        c.x + Math.cos((a0 + a1) / 2) * c.rx * 1.12,
        c.y + Math.sin((a0 + a1) / 2) * c.ry * 1.35,
        c.x + Math.cos(a1) * c.rx,
        c.y + Math.sin(a1) * c.ry * 1.1,
      );
    }
    g.stroke();
    g.strokeStyle = ink(0.55);
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const yy = c.y + c.ry * 0.62 + k * 2.2;
      g.moveTo(c.x - c.rx * (0.75 - k * 0.15), yy);
      g.lineTo(c.x + c.rx * (0.8 - k * 0.15), yy);
    }
    g.stroke();
  }
}

function paintMound(g, rng) {
  const c = P(V2, 0, 0, 0);
  // little hillock under the mill + a few tufts and a distant horizon
  g.save();
  g.beginPath();
  g.moveTo(c.x - 150, c.y + 26);
  g.bezierCurveTo(c.x - 95, c.y - 6, c.x + 80, c.y - 10, c.x + 150, c.y + 22);
  g.strokeStyle = ink(0.9);
  g.lineWidth = 1.1;
  g.stroke();
  g.restore();
  groundHatch(g, c.x + 10, c.y + 14, 140, 20, 8, 3.2, 0.5, rng);
  // distant horizon with tiny hedges and a church spire (a landscape vignette)
  g.strokeStyle = ink(0.55);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(c.x - 175, c.y - 18);
  g.lineTo(c.x - 72, c.y - 20);
  g.moveTo(c.x + 70, c.y - 21);
  g.lineTo(c.x + 165, c.y - 18);
  g.stroke();
  for (let i = 0; i < 9; i++) {
    const x = c.x - 170 + i * 11 + rng() * 4;
    const y = c.y - 19;
    g.beginPath();
    g.arc(x, y - 2.5, 2.5 + rng() * 2, Math.PI, 0);
    g.stroke();
  }
  // spire on the right horizon
  const sx = c.x + 140;
  const sy = c.y - 19;
  g.beginPath();
  g.moveTo(sx - 4, sy);
  g.lineTo(sx - 4, sy - 10);
  g.lineTo(sx, sy - 24);
  g.lineTo(sx + 4, sy - 10);
  g.lineTo(sx + 4, sy);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const x = c.x + 92 + i * 8 + rng() * 3;
    g.beginPath();
    g.arc(x, sy - 2, 2 + rng() * 1.5, Math.PI, 0);
    g.stroke();
  }
  // tufts of grass in front: little fans of strokes
  g.strokeStyle = ink(0.75);
  g.lineWidth = 0.6;
  for (let i = 0; i < 18; i++) {
    const x = c.x - 135 + rng() * 270;
    const y = c.y + 8 + rng() * 20;
    if (Math.abs(x - c.x) < 60 && y < c.y + 12) continue;
    g.beginPath();
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.32 + (rng() - 0.5) * 0.2;
      const L = 4 + rng() * 4;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    g.stroke();
  }
}

function stageHalf(g, near) {
  const r0 = towerR(STAGE_Y);
  const r1 = r0 + 34;
  const a0 = near ? -Math.PI / 2 : Math.PI / 2;
  const a1 = near ? Math.PI / 2 : (3 * Math.PI) / 2;
  const N = 28;
  const railH = 22;
  // floor band (outer edge, with thickness)
  const outerTop = [];
  const outerBot = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    outerTop.push(ringPt(STAGE_Y, r1, a));
    outerBot.push(ringPt(STAGE_Y - 5, r1, a));
  }
  if (near) {
    // brackets (struts) from the stage to the tower
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / 7);
      const p0 = ringPt(STAGE_Y - 4, r1 - 4, a);
      const p1 = ringPt(STAGE_Y - 44, towerR(STAGE_Y - 44), a);
      beam(g, p0, p1, 3.2, 0.5);
    }
    poly(g, outerTop.concat(outerBot.slice().reverse()));
    g.fillStyle = PAPER;
    g.fill();
    hatch(g, (h) => poly(h, outerTop.concat(outerBot.slice().reverse())), 0, 1.7, 0.55, 0.75, V2.cx, outerTop[N / 2].y, 120);
    poly(g, outerTop.concat(outerBot.slice().reverse()));
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1;
    g.stroke();
  } else {
    g.strokeStyle = ink(0.75);
    g.lineWidth = 0.9;
    poly(g, outerTop, false);
    g.stroke();
  }
  // railing posts + top rail
  g.strokeStyle = ink(near ? 0.95 : 0.6);
  g.lineWidth = near ? 1.1 : 0.8;
  g.beginPath();
  const posts = 12;
  for (let i = 0; i <= posts; i++) {
    const a = a0 + ((a1 - a0) * i) / posts;
    const p0 = ringPt(STAGE_Y, r1 - 2, a);
    const p1 = ringPt(STAGE_Y + railH, r1 - 2, a);
    g.moveTo(p0.x, p0.y);
    g.lineTo(p1.x, p1.y);
  }
  g.stroke();
  const rail = [];
  const rail2 = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    rail.push(ringPt(STAGE_Y + railH, r1 - 2, a));
    rail2.push(ringPt(STAGE_Y + railH * 0.5, r1 - 2, a));
  }
  poly(g, rail, false);
  g.lineWidth = near ? 1.6 : 1;
  g.stroke();
  poly(g, rail2, false);
  g.lineWidth = 0.7;
  g.stroke();
}

function paintTower(g) {
  const { rb, rt, h } = TOWER;
  // silhouette
  const N = 40;
  const base = [];
  const top = [];
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / N;
    base.push(ringPt(0, rb, a));
    top.push(ringPt(h, rt, a));
  }
  const body = base.concat(top.slice().reverse());
  stageHalf(g, false);
  poly(g, body);
  g.fillStyle = PAPER;
  g.fill();
  // engraved shading: generatrix lines spaced evenly in angle (so they crowd at the edges),
  // swelling on the shadow (right) side
  g.save();
  poly(g, body);
  g.clip();
  const lines = 46;
  for (let i = 0; i <= lines; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / lines;
    const dark = Math.max(0, Math.min(1, 0.5 + 0.62 * Math.sin(a - 0.25)));
    if (dark < 0.12) continue;
    const p0 = ringPt(0, rb, a);
    const p1 = ringPt(h, rt, a);
    g.strokeStyle = ink(0.45 + 0.5 * dark);
    g.lineWidth = 0.35 + 1.05 * dark;
    g.beginPath();
    g.moveTo(p0.x, p0.y);
    g.lineTo(p1.x, p1.y);
    g.stroke();
  }
  // brick courses (cross-hatching) on the shadow side
  for (let Y = 3; Y < h; Y += 4.2) {
    const r = towerR(Y);
    g.beginPath();
    let started = false;
    for (let k = 0; k <= 12; k++) {
      const a = 0.35 + ((Math.PI / 2 - 0.35) * k) / 12;
      const p = ringPt(Y, r, a);
      if (!started) {
        g.moveTo(p.x, p.y);
        started = true;
      } else g.lineTo(p.x, p.y);
    }
    g.strokeStyle = ink(0.4);
    g.lineWidth = 0.55;
    g.stroke();
  }
  g.restore();
  // windows and door (dark hatched openings with a lit reveal)
  const opening = (Y, a, wA, hY, arch = false) => {
    const r = towerR(Y);
    const p = [ringPt(Y, r, a - wA), ringPt(Y, r, a + wA), ringPt(Y + hY, towerR(Y + hY), a + wA), ringPt(Y + hY, towerR(Y + hY), a - wA)];
    g.save();
    g.beginPath();
    g.moveTo(p[0].x, p[0].y);
    g.lineTo(p[1].x, p[1].y);
    g.lineTo(p[2].x, p[2].y);
    if (arch) {
      const m = ringPt(Y + hY + 6, towerR(Y + hY + 6), a);
      g.quadraticCurveTo(m.x, m.y - 4, p[3].x, p[3].y);
    } else g.lineTo(p[3].x, p[3].y);
    g.closePath();
    g.fillStyle = PAPER;
    g.fill();
    g.clip();
    const cx = (p[0].x + p[2].x) / 2;
    const cy = (p[0].y + p[2].y) / 2;
    g.beginPath();
    for (let o = -30; o < 30; o += 1.5) {
      g.moveTo(cx - 20, cy + o - 6);
      g.lineTo(cx + 20, cy + o + 6);
    }
    for (let o = -30; o < 30; o += 2.2) {
      g.moveTo(cx - 20, cy + o + 5);
      g.lineTo(cx + 20, cy + o - 5);
    }
    g.strokeStyle = ink(0.85);
    g.lineWidth = 0.6;
    g.stroke();
    g.restore();
    g.strokeStyle = ink(0.95);
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(p[0].x, p[0].y);
    g.lineTo(p[1].x, p[1].y);
    g.lineTo(p[2].x, p[2].y);
    g.lineTo(p[3].x, p[3].y);
    g.closePath();
    g.stroke();
  };
  opening(0, -0.12, 0.2, 34, true); // door
  opening(156, 0.32, 0.17, 18);
  opening(200, -0.42, 0.18, 16);
  opening(244, 0.15, 0.2, 15);
  opening(58, 0.55, 0.15, 16);
  // outlines
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.2;
  poly(g, base, false);
  g.stroke();
  g.beginPath();
  g.moveTo(base[0].x, base[0].y);
  g.lineTo(top[0].x, top[0].y);
  g.moveTo(base[N].x, base[N].y);
  g.lineTo(top[N].x, top[N].y);
  g.stroke();
  // curb at the top of the tower
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= N * 2; i++) {
    const a = (TAU * i) / (N * 2);
    const p = ringPt(h, rt + 2, a);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  stageHalf(g, true);
  // door steps
  const d0 = ringPt(0, rb + 10, -0.12);
  g.strokeStyle = ink(0.9);
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(d0.x - 14, d0.y + 2);
  g.lineTo(d0.x + 12, d0.y + 2);
  g.moveTo(d0.x - 16, d0.y + 6);
  g.lineTo(d0.x + 14, d0.y + 6);
  g.stroke();
}

/** Ogee cap (a body of revolution — its outline does not change when it turns). */
const CAP = { y0: TOWER.h + 2, r0: TOWER.rt + 7, hgt: 66 };
function capR(f) {
  // ogee profile: bell-shaped bulge, then a concave neck to the finial
  if (f < 0.12) return CAP.r0;
  const u = (f - 0.12) / 0.88;
  const bulge = Math.sin(Math.min(1, u / 0.55) * Math.PI * 0.5);
  const r = CAP.r0 * (1 + 0.1 * bulge) * (1 - Math.pow(u, 1.6));
  return Math.max(2.2, r + (u > 0.75 ? -3 * (u - 0.75) : 0));
}
function paintCap(g) {
  const N = 26;
  const right = [];
  const left = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const r = capR(f);
    const Y = CAP.y0 + f * CAP.hgt;
    right.push(ringPt(Y, r, Math.PI / 2));
    left.push(ringPt(Y, r, -Math.PI / 2));
  }
  // front bottom curve
  const bottom = [];
  for (let i = 0; i <= 20; i++) bottom.push(ringPt(CAP.y0, CAP.r0, -Math.PI / 2 + (Math.PI * i) / 20));
  const outline = bottom.concat(right.slice().reverse().slice(1)).concat(left.slice(1));
  // build closed silhouette: bottom (left->right), up the right, down the left
  const sil = bottom.concat(right.slice(1).reverse() .reverse()).concat(left.slice().reverse());
  // simpler, robust: right side up, left side down
  const shape = bottom.concat(right.slice(1)).concat(left.slice(1).reverse());
  void outline;
  void sil;
  poly(g, shape);
  g.fillStyle = PAPER;
  g.fill();
  g.save();
  poly(g, shape);
  g.clip();
  // meridian lines (boards) shading the right side
  const lines = 26;
  for (let i = 0; i <= lines; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / lines;
    const dark = Math.max(0, Math.min(1, 0.45 + 0.65 * Math.sin(a - 0.2)));
    if (dark < 0.15) continue;
    g.beginPath();
    for (let k = 0; k <= N; k++) {
      const f = k / N;
      const p = ringPt(CAP.y0 + f * CAP.hgt, capR(f), a);
      if (k === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.strokeStyle = ink(0.45 + 0.5 * dark);
    g.lineWidth = 0.35 + 0.9 * dark;
    g.stroke();
  }
  // petticoat band
  g.beginPath();
  for (let k = 0; k <= 20; k++) {
    const p = ringPt(CAP.y0 + CAP.hgt * 0.12, CAP.r0, -Math.PI / 2 + (Math.PI * k) / 20);
    if (k === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.strokeStyle = ink(0.9);
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();
  poly(g, shape);
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.15;
  g.stroke();
  // finial
  const fin = ringPt(CAP.y0 + CAP.hgt, 0, 0);
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(fin.x, fin.y - 5, 4.2, 0, TAU);
  g.fill();
  g.stroke();
  hatch(g, (h) => {
    h.beginPath();
    h.arc(fin.x, fin.y - 5, 4.2, -0.6, 1.9);
    h.closePath();
  }, 0.3, 1.3, 0.5, 0.9, fin.x, fin.y - 5, 6);
  g.beginPath();
  g.moveTo(fin.x, fin.y - 9);
  g.lineTo(fin.x, fin.y - 15);
  g.stroke();
}

// -----------------------------------------------------------------------------
// dynamic parts
// -----------------------------------------------------------------------------
function drawFig1Dynamic(g, kit, T, frameSprite, showLetters) {
  const th = armAngle(T);
  const r = v3(Math.cos(th), 0, Math.sin(th)); // radial (arm direction, towards G)
  const t = v3(-Math.sin(th), 0, Math.cos(th)); // tangent: direction of motion
  const up = v3(0, 1, 0);
  const at = (rad, Y, tan = 0) => add3(add3(mul3(r, rad), v3(0, Y, 0)), mul3(t, tan));
  const PP = (p) => PV(V1, p);
  const sailPhi = armAngle(T) * 3.4;
  const hub = at(ARM_R, ARM_Y + 2, 16);
  const hubP = PP(hub);
  const backP = PP(at(-ARM_BACK, ARM_Y));
  const sailsNear = hubP.d > -10;

  const drawSailUnit = () => {
    // little frame at G carrying the sail axle in bearings along the tangent
    const g0 = PP(at(ARM_R - 4, ARM_Y + 5, -8));
    const g1 = PP(at(ARM_R - 4, ARM_Y + 5, 14));
    beam(g, g0, g1, 4, 0.5);
    // the cord barrel on the axle
    const bar = PP(at(ARM_R, ARM_Y + 9, -2));
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(bar.x, bar.y, 4.2, 0, TAU);
    g.fill();
    g.strokeStyle = ink(0.95);
    g.lineWidth = 0.9;
    g.stroke();
    drawSails(g, V1, hub, r, up, t, SAIL1_R, sailPhi, { lw: 0.85, bars: 6, detail: 0.8 });
    // poll end
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(hubP.x, hubP.y, 3.2, 0, TAU);
    g.fill();
    g.stroke();
  };
  const drawWeight = () => {
    const top = PP(at(-ARM_BACK + 6, ARM_Y));
    const bot = PP(at(-ARM_BACK + 6, ARM_Y - 24));
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(top.x, top.y);
    g.lineTo(bot.x, bot.y);
    g.stroke();
    // a block of lead seen in perspective
    const s = 9;
    const c = bot;
    const q = [
      { x: c.x - s, y: c.y },
      { x: c.x + s, y: c.y },
      { x: c.x + s, y: c.y + s * 1.6 },
      { x: c.x - s, y: c.y + s * 1.6 },
    ];
    poly(g, q);
    g.fillStyle = PAPER;
    g.fill();
    hatch(g, (h) => poly(h, q), 0.9, 1.6, 0.6, 0.85, c.x, c.y + s, 20);
    hatch(g, (h) => poly(h, q), -0.6, 2.4, 0.5, 0.6, c.x, c.y + s, 20);
    poly(g, q);
    g.lineWidth = 1;
    g.stroke();
  };

  // far side first
  if (!sailsNear) drawSailUnit();
  if (backP.d <= 0) drawWeight();
  g.drawImage(frameSprite, 0, 0);
  // the arm FG (a timber) — always above the apex
  const F = PP(at(-ARM_BACK, ARM_Y));
  const G = PP(at(ARM_R, ARM_Y));
  beam(g, F, G, 7, 0.75);
  // pillars Q R straddling the axis + head with pulley O
  const qa = PP(at(0, ARM_Y + 4, -11));
  const qb = PP(at(0, PILLAR_TOP, -11));
  const ra = PP(at(0, ARM_Y + 4, 11));
  const rb = PP(at(0, PILLAR_TOP, 11));
  const farFirst = qa.d < ra.d;
  const pillar = (a, b) => beam(g, a, b, 5, 0.6);
  // scale P rising between the pillars as the line winds on the sail axle
  const wound = Math.max(0, sailPhi - armAngle(0.0) * 3.4);
  const rise = Math.min(1, wound / (TAU * 9.5));
  const Ys = ARM_Y + 24 + rise * (PILLAR_TOP - ARM_Y - 66);
  const O = PP(at(0, PILLAR_TOP + 6, 0));
  const pan = PP(at(0, Ys, 0));
  if (farFirst) pillar(qa, qb);
  else pillar(ra, rb);
  // cord: barrel on the sail axle -> pulley M on the arm -> pulley O on the head -> scale P
  const barrel = PP(at(ARM_R, ARM_Y + 9, -2));
  const M = PP(at(ARM_R - 30, ARM_Y + 8, 0));
  g.strokeStyle = ink(0.9);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(barrel.x, barrel.y);
  g.lineTo(M.x, M.y);
  g.lineTo(O.x + 3, O.y - 3);
  g.moveTo(O.x, O.y + 3);
  g.lineTo(pan.x, pan.y - 20);
  g.stroke();
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(M.x, M.y, 3, 0, TAU);
  g.fill();
  g.stroke();
  // the scale: ring, three strings, pan, weights
  g.beginPath();
  g.moveTo(pan.x, pan.y - 20);
  g.lineTo(pan.x - 12, pan.y);
  g.moveTo(pan.x, pan.y - 20);
  g.lineTo(pan.x + 12, pan.y);
  g.moveTo(pan.x, pan.y - 20);
  g.lineTo(pan.x + 3, pan.y + 2);
  g.lineWidth = 0.6;
  g.stroke();
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(pan.x, pan.y, 13, 3.6, 0, 0, TAU);
  g.fill();
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.ellipse(pan.x, pan.y + 1.2, 12, 3, 0, 0.1, Math.PI - 0.1);
  g.lineWidth = 1.4;
  g.stroke();
  // weights: a little pile of cylinders (darkly engraved)
  for (let k = 0; k < 3; k++) {
    const wy = pan.y - 1.5 - k * 4.2;
    const ww = 8 - k * 2;
    g.fillStyle = ink(0.88);
    g.fillRect(pan.x - ww, wy - 3.6, ww * 2, 3.6);
    g.fillStyle = PAPER;
    g.fillRect(pan.x - ww + 1.5, wy - 3.6, 1.6, 1.2);
  }
  if (farFirst) pillar(ra, rb);
  else pillar(qa, qb);
  // head piece + pulley O
  beam(g, PP(at(0, PILLAR_TOP, -14)), PP(at(0, PILLAR_TOP, 14)), 5, 0.5);
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(O.x, O.y, 4.5, 0, TAU);
  g.fill();
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.arc(O.x, O.y, 1.3, 0, TAU);
  g.fillStyle = ink(0.95);
  g.fill();

  if (backP.d > 0) drawWeight();
  if (sailsNear) drawSailUnit();

  // relative wind: short engraved strokes streaming past the sails, against the motion
  const sp = Math.max(0, Math.min(1, (armAngle(T + 0.05) - armAngle(T)) / (Math.PI * 0.05)));
  if (sp > 0.2) {
    g.strokeStyle = ink(0.45 * sp);
    g.lineWidth = 0.7;
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const off = (k - 2) * 14;
      const a0 = PP(add3(at(ARM_R + off * 0.4, ARM_Y + off, 46), v3(0, 0, 0)));
      const a1 = PP(add3(at(ARM_R + off * 0.4, ARM_Y + off, 26 + (k % 2) * 6), v3(0, 0, 0)));
      g.moveTo(a0.x, a0.y);
      g.lineTo(a1.x, a1.y);
    }
    g.stroke();
  }

  if (showLetters) {
    // letters on the arm fade while it points at (or away from) the viewer, so they never pile up
    const armLen = Math.hypot(G.x - F.x, G.y - F.y);
    const kA = smoothstepN(150, 205, armLen);
    const Ep = P(V1, 0, APEX_Y, 0);
    const wq = PP(at(-ARM_BACK + 6, ARM_Y - 34));
    if (kA > 0.01) {
      g.globalAlpha = kA;
      letter(g, 'F', F.x + (F.x < G.x ? -12 : 12), F.y - 8, 15, false);
      letter(g, 'I', hubP.x + 0, hubP.y - SAIL1_R - 10, 15, false);
      letter(g, 'W', wq.x + 16, wq.y + 8, 15, false);
      letter(g, 'M', M.x + 2, M.y - 11, 13, false);
      g.globalAlpha = 1;
    }
    letter(g, 'G', G.x + (G.x > F.x ? 4 : -4), G.y + 14, 15, false);
    // E (top of the upright axis) steps aside when the arm's end or the weight swings past it
    let ex = Ep.x - 24;
    const ey = Ep.y + 6;
    const near = (x, y, r) => Math.hypot(ex - x, ey - y) < r;
    if (near(wq.x + 16, wq.y + 8, 30) || near(F.x, F.y, 26) || near(G.x, G.y + 14, 26)) ex = Ep.x + 26;
    g.globalAlpha = 0.25 + 0.75 * kA;
    letter(g, 'E', ex, ey, 15, false);
    g.globalAlpha = 1;
    letter(g, 'P', pan.x + 18, pan.y - 2, 15, false);
    const qL = qb.x < rb.x ? qb : rb;
    const rR = qb.x < rb.x ? rb : qb;
    letter(g, 'Q', qL.x - 12, qL.y + 18, 14, false);
    letter(g, 'R', rR.x + 12, rR.y + 18, 14, false);
    letter(g, 'O', O.x, O.y - 13, 13, false);
  }
}

function drawPendulum(g, T, showLetters) {
  const c = tableTop();
  const ang = 0.24 * Math.sin(Math.PI * T + 0.4);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pt = (L) => ({ x: c.x + sa * L, y: c.y - 6 - ca * L });
  const top = pt(66);
  const bot = pt(-56);
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.lineTo(bot.x, bot.y);
  g.stroke();
  const ball = (p, r) => {
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(p.x, p.y, r, 0, TAU);
    g.fill();
    hatch(g, (h) => {
      h.beginPath();
      h.arc(p.x, p.y, r, -0.9, 2.2);
      h.closePath();
    }, 0.6, 1.4, 0.55, 0.9, p.x, p.y, r + 2);
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(p.x, p.y, r, 0, TAU);
    g.stroke();
  };
  const V = pt(52);
  const X = pt(-44);
  ball(V, 7);
  ball(X, 8.5);
  // pivot
  g.fillStyle = ink(0.95);
  g.beginPath();
  g.arc(c.x, c.y - 6, 1.8, 0, TAU);
  g.fill();
  if (showLetters) {
    letter(g, 'V', V.x + 16, V.y - 2, 15, false);
    letter(g, 'X', X.x + 18, X.y + 2, 15, false);
  }
}

function drawFig2Dynamic(g, T, capSprite, showLetters) {
  const beta = capDir(T);
  const d = v3(-Math.cos(beta), 0, Math.sin(beta)); // windshaft, pointing to the sails/wind
  const hAx = v3(Math.sin(beta), 0, Math.cos(beta)); // horizontal, in the plane of the sails
  const up = v3(0, 1, 0);
  const capTop = v3(0, HUB2_Y, 0);
  // fan-tail: fly on the end of a staging behind the cap
  const fanC = add3(add3(capTop, mul3(d, -92)), v3(0, 24, 0));
  const fanA = 0.25 * T - TAU * 3 * smootherN(2.5, 5.7, T) + 0.4;
  const drawFan = () => {
    const PP = (p) => PV(V2, p);
    // staging: two raking struts and a spindle
    const s0 = PP(add3(add3(capTop, mul3(d, -CAP.r0 + 4)), v3(0, -12, 0)));
    const s1 = PP(add3(add3(capTop, mul3(d, -CAP.r0 + 2)), v3(0, 14, 0)));
    const f0 = PP(add3(fanC, mul3(hAx, -7)));
    const f1 = PP(add3(fanC, mul3(hAx, 7)));
    const fc = PP(fanC);
    beam(g, s0, f0, 3, 0.4);
    beam(g, s0, f1, 3, 0.4);
    beam(g, s1, fc, 3, 0.4);
    // vanes (8), in the plane spanned by the windshaft and the vertical
    const R = 27;
    const vanes = [];
    for (let k = 0; k < 8; k++) {
      const a = fanA + (k * TAU) / 8;
      const e = comb3(v3(0, 0, 0), d, Math.cos(a), up, Math.sin(a));
      const w = comb3(v3(0, 0, 0), d, -Math.sin(a), up, Math.cos(a));
      vanes.push({ e, w, depth: PV(V2, add3(fanC, mul3(e, R))).d });
    }
    vanes.sort((A, B) => A.depth - B.depth);
    for (const vn of vanes) {
      const q = [
        PP(add3(add3(fanC, mul3(vn.e, R * 0.3)), add3(mul3(vn.w, -3), mul3(hAx, 2)))),
        PP(add3(add3(fanC, mul3(vn.e, R)), add3(mul3(vn.w, -5), mul3(hAx, 3)))),
        PP(add3(add3(fanC, mul3(vn.e, R)), add3(mul3(vn.w, 5), mul3(hAx, -3)))),
        PP(add3(add3(fanC, mul3(vn.e, R * 0.3)), add3(mul3(vn.w, 3), mul3(hAx, -2)))),
      ];
      poly(g, q);
      g.fillStyle = PAPER;
      g.fill();
      hatch(g, (h) => poly(h, q), Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x), 1.6, 0.5, 0.7, (q[0].x + q[2].x) / 2, (q[0].y + q[2].y) / 2, 20);
      poly(g, q);
      g.strokeStyle = ink(0.95);
      g.lineWidth = 0.8;
      g.stroke();
      const a0 = fc;
      const a1 = PP(add3(fanC, mul3(vn.e, R)));
      g.beginPath();
      g.moveTo(a0.x, a0.y);
      g.lineTo(a1.x, a1.y);
      g.stroke();
    }
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(fc.x, fc.y, 2.6, 0, TAU);
    g.fill();
    g.stroke();
    return fc;
  };
  const fanFar = PV(V2, fanC).d < 0;
  let fc = null;
  if (fanFar) fc = drawFan();
  g.drawImage(capSprite, 0, 0);
  if (!fanFar) fc = drawFan();
  // windshaft + poll end (canister)
  const shaft0 = PV(V2, add3(capTop, mul3(d, CAP.r0 - 10)));
  const hub = add3(add3(capTop, mul3(d, CAP.r0 + 14)), v3(0, 4, 0));
  const hubP = PV(V2, hub);
  beam(g, shaft0, hubP, 9, 0.6);
  const phi = 1.25 * T + 0.3;
  drawSails(g, V2, hub, hAx, up, d, SAIL2_R, phi, { lw: 1.05, bars: 11, detail: 1 });
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(hubP.x, hubP.y, 5.5, 0, TAU);
  g.fill();
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.1;
  g.stroke();
  hatch(g, (h) => {
    h.beginPath();
    h.arc(hubP.x, hubP.y, 5.5, -0.8, 2.3);
    h.closePath();
  }, 0.4, 1.4, 0.55, 0.9, hubP.x, hubP.y, 7);
  if (showLetters && fc) {
    letter(g, 'L', fc.x + 33, fc.y - 22, 16, false);
    const fin = ringPt(CAP.y0 + CAP.hgt, 0, 0);
    letter(g, 'K', fin.x - 18, fin.y - 12, 16, false);
  }
}

/** Plan of the cap: wind arrow veers on bar 2, the cap follows (bars 2–3). */
function drawPlan(g, T) {
  const { x, y, r } = PLAN;
  const wb = windDir(T);
  const cb = capDir(T);
  // tower top circle (double rule) and curb
  g.strokeStyle = ink(0.9);
  g.lineWidth = 0.9;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
  g.beginPath();
  g.arc(x, y, r - 3, 0, TAU);
  g.lineWidth = 0.6;
  g.stroke();
  // compass points
  g.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    const l = k % 4 === 0 ? 5 : 2.5;
    g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.lineTo(x + Math.cos(a) * (r + l), y + Math.sin(a) * (r + l));
  }
  g.stroke();
  // cap: plan direction of the windshaft = (-cos b, +sin b) (plan y = world z)
  const dx = -Math.cos(cb);
  const dy = Math.sin(cb);
  const nx = -dy;
  const ny = dx;
  const p = (u, v) => ({ x: x + dx * u + nx * v, y: y + dy * u + ny * v });
  const capQ = [p(16, -13), p(16, 13), p(-18, 11), p(-18, -11)];
  poly(g, capQ);
  g.fillStyle = PAPER;
  g.fill();
  hatch(g, (h) => poly(h, capQ), Math.atan2(dy, dx) + Math.PI / 2, 1.8, 0.5, 0.7, x, y, 30);
  poly(g, capQ);
  g.strokeStyle = ink(0.95);
  g.lineWidth = 0.9;
  g.stroke();
  // windshaft and the sails in plan (a line across the front)
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(p(16, 0).x, p(16, 0).y);
  g.lineTo(p(24, 0).x, p(24, 0).y);
  g.moveTo(p(24, -30).x, p(24, -30).y);
  g.lineTo(p(24, 30).x, p(24, 30).y);
  g.stroke();
  // fan-tail staging + fly (seen edge-on in plan)
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(p(-18, -8).x, p(-18, -8).y);
  g.lineTo(p(-36, 0).x, p(-36, 0).y);
  g.lineTo(p(-18, 8).x, p(-18, 8).y);
  g.stroke();
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(p(-44, 0).x, p(-44, 0).y);
  g.lineTo(p(-28, 0).x, p(-28, 0).y);
  g.stroke();
  // wind arrow (feathered), coming from the direction the wind blows from
  const wx = -Math.cos(wb);
  const wy = Math.sin(wb);
  const a0 = { x: x + wx * (r + 46), y: y + wy * (r + 46) };
  const a1 = { x: x + wx * (r + 12), y: y + wy * (r + 12) };
  g.strokeStyle = ink(0.95);
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(a0.x, a0.y);
  g.lineTo(a1.x, a1.y);
  g.stroke();
  const ux = -wx;
  const uy = -wy;
  const hx = -uy;
  const hy = ux;
  g.fillStyle = ink(0.95);
  g.beginPath();
  g.moveTo(a1.x + ux * 2, a1.y + uy * 2);
  g.lineTo(a1.x - ux * 7 + hx * 3.2, a1.y - uy * 7 + hy * 3.2);
  g.lineTo(a1.x - ux * 5, a1.y - uy * 5);
  g.lineTo(a1.x - ux * 7 - hx * 3.2, a1.y - uy * 7 - hy * 3.2);
  g.closePath();
  g.fill();
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const b = { x: a0.x + ux * (k * 3.5), y: a0.y + uy * (k * 3.5) };
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - ux * 4 + hx * 4, b.y - uy * 4 + hy * 4);
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - ux * 4 - hx * 4, b.y - uy * 4 - hy * 4);
  }
  g.lineWidth = 0.8;
  g.stroke();
  // label "Wind" along the arrow
  g.save();
  g.translate(a0.x + ux * 18 - hx * 8, a0.y + uy * 18 - hy * 8);
  let ang = Math.atan2(uy, ux);
  if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
  g.rotate(ang);
  text(g, 'Wind', 0, 0, 11, { italic: true, align: 'center', baseline: 'middle' });
  g.restore();
}

// -----------------------------------------------------------------------------
// Fig. 3 — the rider as an engraved specimen
// -----------------------------------------------------------------------------
function maskPath(g, h) {
  const ca = Math.cos(h.angle);
  const sa = Math.sin(h.angle);
  const R = (px, py) => ({ x: h.x + px * ca - py * sa, y: h.y + px * sa + py * ca });
  const m0 = R(-1, -h.r * 0.95);
  const m1 = R(h.r * 0.95, -h.r * 0.5);
  const m2 = R(h.r * 1.05, h.r * 0.55);
  const m3 = R(h.r * 0.1, h.r * 0.9);
  const m4 = R(-h.r * 0.15, 0);
  const c0 = R(h.r * 0.8, -h.r * 1.0);
  const c1 = R(h.r * 0.6, h.r * 1.0);
  g.beginPath();
  g.moveTo(m0.x, m0.y);
  g.quadraticCurveTo(c0.x, c0.y, m1.x, m1.y);
  g.lineTo(m2.x, m2.y);
  g.quadraticCurveTo(c1.x, c1.y, m3.x, m3.y);
  g.quadraticCurveTo(m4.x - 2, m4.y + 4, m4.x, m4.y);
  g.quadraticCurveTo(m4.x - 1, m4.y - 6, m0.x, m0.y);
  g.closePath();
}

function billPath(g, rig) {
  const bb0 = rig.billBase;
  const bt = rig.billTip;
  const d = rig.billDir;
  const nx = -Math.sin(d);
  const ny = Math.cos(d);
  const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
  const ux = (bt.x - bb0.x) / L;
  const uy = (bt.y - bb0.y) / L;
  const sc = { x: bt.x - ux * 8, y: bt.y - uy * 8 };
  g.beginPath();
  g.moveTo(bb0.x + nx * -4.6, bb0.y + ny * -4.6);
  g.lineTo(sc.x - ux * 6 + nx * -2.2, sc.y - uy * 6 + ny * -2.2);
  g.quadraticCurveTo(bt.x + nx * -6.5, bt.y + ny * -6.5, bt.x + ux * 1.5, bt.y + uy * 1.5);
  g.quadraticCurveTo(bt.x + nx * 7.5 - ux, bt.y + ny * 7.5 - uy, sc.x - ux * 6 + nx * 2.4, sc.y - uy * 6 + ny * 2.4);
  g.lineTo(bb0.x + nx * 4.4, bb0.y + ny * 4.4);
  g.closePath();
}

function drawEngravedRider(kit, g, rig, scene) {
  const pin = { ...(scene.pinwheel || { type: 'post' }), colors: [PAPER] };
  // cast shadow on the ground (horizontal strokes)
  const gy = rig.rearWheel.y + rig.rearWheel.r;
  g.strokeStyle = ink(0.55);
  g.lineWidth = 0.7;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const y = gy + 3 + k * 2.6;
    const x0 = rig.rearWheel.x - 40 + k * 8;
    const x1 = rig.frontWheel.x + 46 - k * 10;
    g.moveTo(x0, y);
    g.lineTo(x1, y);
  }
  g.stroke();
  // 1. knock-out (paper) so the figure sits in front of the hatching behind it
  kit.drawRider(g, rig, { silhouette: PAPER, pinwheel: pin, lineScale: 1.5, spokes: 0 });
  const legLine = (hip, knee, foot, a) => {
    g.strokeStyle = ink(a);
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(hip.x, hip.y);
    g.lineTo(knee.x, knee.y);
    g.lineTo(foot.x, foot.y);
    g.stroke();
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 12, foot.y + 2.5);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 9, foot.y + 5);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x - 5, foot.y + 2);
    g.stroke();
  };
  // far leg (black, as the bird's legs are), then the body is knocked out again over its top
  legLine(rig.farHip, rig.farKnee, rig.farFoot, 0.6);
  const b = rig.body;
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  g.fill();
  // 2. contour hatching on the body (shadow under the belly)
  g.save();
  g.beginPath();
  g.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  g.clip();
  g.strokeStyle = ink(0.62);
  g.lineWidth = 0.6;
  for (let k = 0; k < 4; k++) {
    const sx = 0.97 - k * 0.05;
    const sy = 0.9 - k * 0.13;
    const span = 0.85 - k * 0.17;
    g.beginPath();
    g.ellipse(b.x - 1, b.y - 1, b.rx * sx, b.ry * sy, b.tilt, Math.PI / 2 - span * 1.15 + 0.15, Math.PI / 2 + span * 0.95 + 0.15);
    g.stroke();
  }
  g.restore();
  // folded wing: fine strokes following the feathers
  const sh = rig.wingShoulder;
  const wingPath = (h) => {
    h.beginPath();
    h.moveTo(sh.x, sh.y);
    h.bezierCurveTo(sh.x - 24, sh.y - 8, sh.x - 58, sh.y + 2, rig.tailTip.x - 4, rig.tailTip.y + 3);
    h.bezierCurveTo(sh.x - 46, sh.y + 20, sh.x - 16, sh.y + 20, sh.x + 2, sh.y + 10);
    h.closePath();
  };
  hatch(g, wingPath, 0.22 + b.tilt, 2.3, 0.5, 0.5, sh.x - 30, sh.y + 6, 44);
  // 3. engraved outlines
  kit.drawRider(g, rig, { wire: INK, pinwheel: pin, lineScale: 0.95, spokes: 14 });
  // swelling contour along the shadowed belly
  g.strokeStyle = ink(0.9);
  g.lineWidth = 1.7;
  g.beginPath();
  g.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0.15, Math.PI * 0.92);
  g.stroke();
  legLine(rig.nearHip, rig.nearKnee, rig.nearFoot, 0.95);
  // neck as an engraved tube: knock out the wire centre-line, then draw both contours
  {
    const pts = kit.sampleCubic(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 16);
    g.strokeStyle = PAPER;
    g.lineWidth = 11.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
    const side = (sgn) => {
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const c = pts[Math.min(pts.length - 1, i + 1)];
        const tx = c.x - a.x;
        const ty = c.y - a.y;
        const L = Math.hypot(tx, ty) || 1;
        const w = 6.2 - 1.2 * (i / pts.length);
        const x = pts[i].x + (ty / L) * w * sgn;
        const y = pts[i].y - (tx / L) * w * sgn;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    };
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1.1;
    side(1);
    g.lineWidth = 1.5;
    side(-1);
    // head
    const h = rig.head;
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(h.x, h.y, h.r, 0, TAU);
    g.fill();
    g.lineWidth = 1.2;
    g.stroke();
  }
  // near wing reaching for the bar: paper body, feather strokes, firm contour
  {
    const el = rig.wingElbow;
    const hd = rig.wingHand;
    const wp = (h) => {
      h.beginPath();
      h.moveTo(sh.x - 12, sh.y - 5);
      h.bezierCurveTo(el.x - 6, el.y - 16, hd.x - 6, hd.y - 12, hd.x + 4, hd.y - 5);
      h.quadraticCurveTo(hd.x + 9, hd.y - 1, hd.x + 5, hd.y + 3.5);
      h.quadraticCurveTo(hd.x + 1, hd.y + 6, hd.x - 3, hd.y + 3);
      h.quadraticCurveTo(hd.x - 5, hd.y + 8, hd.x - 10, hd.y + 4);
      h.quadraticCurveTo(el.x - 2, el.y + 9, el.x - 9, el.y + 6);
      h.quadraticCurveTo(el.x - 14, el.y + 13, sh.x - 8, sh.y + 12);
      h.quadraticCurveTo(sh.x - 18, sh.y + 12, sh.x - 20, sh.y + 5);
      h.closePath();
    };
    wp(g);
    g.fillStyle = PAPER;
    g.fill();
    g.save();
    wp(g);
    g.clip();
    g.strokeStyle = ink(0.55);
    g.lineWidth = 0.55;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const f = k / 6;
      const x0 = sh.x - 14 + (hd.x - sh.x) * f;
      const y0 = sh.y + 12 + (hd.y - sh.y) * f;
      g.moveTo(x0, y0);
      g.lineTo(x0 + 6, y0 - 7);
    }
    g.stroke();
    g.restore();
    wp(g);
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1.15;
    g.stroke();
  }
  // tyre inner line
  g.strokeStyle = ink(0.8);
  g.lineWidth = 0.7;
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    g.beginPath();
    g.arc(w.x, w.y, w.r - 3.4, 0, TAU);
    g.stroke();
    // shade the lower-right of the tyre
    g.beginPath();
    g.arc(w.x, w.y, w.r - 1.6, -0.2, 1.9);
    g.lineWidth = 2;
    g.strokeStyle = ink(0.7);
    g.stroke();
    g.lineWidth = 0.7;
  }
  // neck shading on the back side
  const n0 = rig.neckBase;
  const n1 = rig.neckC1;
  const n2 = rig.neckC2;
  const n3 = rig.head;
  const pts = kit.sampleCubic(n0, n1, n2, n3, 12);
  g.strokeStyle = ink(0.7);
  g.lineWidth = 0.6;
  g.beginPath();
  for (let i = 2; i < pts.length - 2; i++) {
    const a = pts[i];
    const c = pts[i + 1];
    const tx = c.x - a.x;
    const ty = c.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    const nx = ty / L;
    const ny = -tx / L;
    // offset to the left (back) side of the neck
    const side = nx < 0 ? 1 : -1;
    const o = 5.5;
    g.moveTo(a.x + side * nx * o, a.y + side * ny * o);
    g.lineTo(a.x + side * nx * (o - 3.5), a.y + side * ny * (o - 3.5));
  }
  g.stroke();
  // 4. black face mask and bill: dense engraved cross-hatching (reads as solid black)
  const h = rig.head;
  g.save();
  maskPath(g, h);
  g.fillStyle = ink(0.9);
  g.fill();
  g.clip();
  g.strokeStyle = 'rgba(240,233,216,0.35)';
  g.lineWidth = 0.5;
  g.beginPath();
  for (let o = -20; o < 20; o += 2.2) {
    g.moveTo(h.x - 20, h.y + o - 8);
    g.lineTo(h.x + 20, h.y + o + 8);
  }
  g.stroke();
  g.restore();
  billPath(g, rig);
  g.fillStyle = ink(0.92);
  g.fill();
  g.strokeStyle = ink(1);
  g.lineWidth = 0.8;
  g.stroke();
  // bill ridge highlight
  const bb0 = rig.billBase;
  const bt = rig.billTip;
  g.strokeStyle = 'rgba(240,233,216,0.55)';
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(bb0.x + (bt.x - bb0.x) * 0.12, bb0.y + (bt.y - bb0.y) * 0.12 - 1);
  g.lineTo(bb0.x + (bt.x - bb0.x) * 0.8, bb0.y + (bt.y - bb0.y) * 0.8 - 1);
  g.stroke();
  // eye
  const e = rig.eye;
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(e.x, e.y, 2.6, 0, TAU);
  g.fill();
  g.fillStyle = ink(1);
  g.beginPath();
  g.arc(e.x + 0.4, e.y, 1.3, 0, TAU);
  g.fill();
}

function arrowHead(g, x, y, dir, s = 6) {
  const ca = Math.cos(dir);
  const sa = Math.sin(dir);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x - ca * s - sa * s * 0.35, y - sa * s + ca * s * 0.35);
  g.lineTo(x - ca * s * 0.7, y - sa * s * 0.7);
  g.lineTo(x - ca * s + sa * s * 0.35, y - sa * s - ca * s * 0.35);
  g.closePath();
  g.fill();
}

/** Dimension lines, reference letters and the caption that travel with the rider. */
function drawFig3Notes(g, rig, T, thumb) {
  const x = rig.root.x;
  const gy = rig.rearWheel.y + rig.rearWheel.r;
  g.save();
  // caption under the figure
  text(g, 'Fig. 3.', x, gy + 44, 20, { italic: true, align: 'center' });
  text(g, 'Platalea velocipedica.', x, gy + 64, 14, { italic: true, align: 'center', alpha: 0.85 });
  g.fillStyle = ink(0.95);
  g.strokeStyle = ink(0.9);
  // bar 2: wheel-base dimension grows outward from the centre
  const kW = thumb ? 1 : smootherN(2.0, 2.9, T);
  if (kW > 0.001) {
    const xa = rig.rearWheel.x;
    const xb = rig.frontWheel.x;
    const yd = gy + 16;
    const mid = (xa + xb) / 2;
    const half = ((xb - xa) / 2) * kW;
    g.lineWidth = 0.7;
    g.beginPath();
    // extension lines from the hubs
    g.moveTo(xa, rig.rearWheel.y + 6);
    g.lineTo(xa, yd + 5);
    g.moveTo(xb, rig.frontWheel.y + 6);
    g.lineTo(xb, yd + 5);
    g.moveTo(mid - half, yd);
    g.lineTo(mid + half, yd);
    g.stroke();
    arrowHead(g, mid - half, yd, Math.PI, 6);
    arrowHead(g, mid + half, yd, 0, 6);
    if (kW > 0.95) {
      g.fillStyle = PAPER;
      g.fillRect(mid - 26, yd - 7, 52, 13);
      text(g, '3 F. 5 I.', mid, yd + 4, 12.5, { italic: true, align: 'center' });
    }
  }
  // bar 2: height dimension (ground to crown)
  const kH = thumb ? 1 : smootherN(2.5, 3.4, T);
  if (kH > 0.001) {
    const xd = rig.frontWheel.x + 66;
    const top = rig.head.y - rig.head.r;
    const yb = gy;
    const yt = yb + (top - yb) * kH;
    g.lineWidth = 0.7;
    g.strokeStyle = ink(0.9);
    g.fillStyle = ink(0.95);
    g.beginPath();
    g.moveTo(xd, yb);
    g.lineTo(xd, yt);
    // extension from the crown
    if (kH > 0.98) {
      g.moveTo(rig.head.x + 6, top);
      g.lineTo(xd + 6, top);
    }
    g.moveTo(xd - 6, yb);
    g.lineTo(xd + 6, yb);
    g.stroke();
    arrowHead(g, xd, yb, Math.PI / 2, 6);
    arrowHead(g, xd, yt, -Math.PI / 2, 6);
    if (kH > 0.95) {
      g.save();
      g.translate(xd + 12, (yb + top) / 2);
      g.rotate(-Math.PI / 2);
      text(g, '4 F. 4 I.', 0, 0, 12.5, { italic: true, align: 'center', baseline: 'middle' });
      g.restore();
    }
  }
  // bar 3: lettered parts, one per beat
  const parts = [
    { t: 4.0, ch: 'a', p: rig.billTip, dx: 14, dy: 10 },
    { t: 4.5, ch: 'b', p: rig.head, dx: 4, dy: -26 },
    { t: 5.0, ch: 'c', p: rig.crestTip1, dx: -12, dy: -10 },
    { t: 5.5, ch: 'd', p: rig.pinHub, dx: -34, dy: -2 },
    { t: 6.0, ch: 'e', p: rig.bb, dx: -2, dy: 30 },
  ];
  for (const pr of parts) {
    const k = thumb ? 1 : smoothstepN(pr.t, pr.t + 0.12, T);
    if (k <= 0) continue;
    g.globalAlpha = k;
    const lx = pr.p.x + pr.dx;
    const ly = pr.p.y + pr.dy;
    g.strokeStyle = ink(0.7);
    g.lineWidth = 0.6;
    g.beginPath();
    const vx = pr.p.x - lx;
    const vy = pr.p.y - ly;
    const L = Math.hypot(vx, vy) || 1;
    g.moveTo(lx + (vx / L) * 7, ly + (vy / L) * 7);
    g.lineTo(pr.p.x - (vx / L) * 2, pr.p.y - (vy / L) * 2);
    g.stroke();
    letter(g, pr.ch, lx, ly, 16 + 3 * (1 - k), true);
    g.globalAlpha = 1;
  }
  // bar 4: the relative wind, drawn as engraved streamlines across the little sails
  const kWind = thumb ? 0 : smoothstepN(6.0, 6.5, T);
  if (kWind > 0) {
    const hub = rig.pinHub;
    g.strokeStyle = ink(0.8 * kWind);
    g.fillStyle = ink(0.8 * kWind);
    g.lineWidth = 0.7;
    for (let k = -1; k <= 1; k++) {
      const yy = hub.y + k * 15;
      const x1 = hub.x + 70;
      const ph = ((T * 90) % 30) | 0;
      g.beginPath();
      g.setLineDash([10, 5]);
      g.lineDashOffset = -ph;
      g.moveTo(x1, yy);
      g.bezierCurveTo(hub.x + 30, yy, hub.x + 10, yy + k * 6, hub.x - 40, yy + k * 8);
      g.stroke();
      g.setLineDash([]);
      arrowHead(g, hub.x - 40, yy + k * 8, Math.PI, 5);
    }
  }
  g.restore();
}

// ----- the lettered key under the figures -----
const KEY_FONT = '"IM Fell English", Georgia, serif';
/** items: [letters, words] pairs; letters in roman capitals / italic lower case, words italic. */
function keyRuns(g, items, size) {
  const runs = [];
  for (const [l, w] of items) {
    if (l) runs.push({ s: l, italic: l === l.toLowerCase(), size: size + 0.5, gap: 4 });
    runs.push({ s: w, italic: true, size, gap: 9 });
  }
  let total = 0;
  for (const r of runs) {
    g.font = `${r.italic ? 'italic ' : ''}400 ${r.size}px ${KEY_FONT}`;
    r.w = g.measureText(r.s).width;
    total += r.w + r.gap;
  }
  return { runs, total: total - 9 };
}
function drawKeyLine(g, items, x, y, size, alphaFn = null) {
  const { runs } = keyRuns(g, items, size);
  let cx = x;
  let idx = 0;
  for (const r of runs) {
    const a = alphaFn ? alphaFn(idx, r) : 1;
    if (a > 0) {
      g.globalAlpha = a;
      text(g, r.s, cx, y, r.size, { italic: r.italic, alpha: 0.92 });
      g.globalAlpha = 1;
    }
    cx += r.w + r.gap;
    idx++;
  }
}
const KEY1A = [
  ['Fig. 1.', ''],
  ['A B C', 'the pyramidal Frame;'],
  ['D E', 'the upright Axis;'],
  ['F G', 'the Arm;'],
  ['H', 'the Barrel;'],
  ['Z', 'the Cord drawn by the Hand;'],
];
const KEY1B = [
  ['I', 'the Sails;'],
  ['M O', 'Pulleys;'],
  ['P', 'the Scale;'],
  ['Q R', 'the Pillars;'],
  ['V X', 'the Pendulum;'],
  ['Y', 'the Table;'],
  ['W', 'the Weight.'],
];
const KEY2 = [
  ['Fig. 2.', ''],
  ['K', 'the Cap;'],
  ['L', 'the Fly, or Fan-tail, which turns the Cap into the Wind;'],
  ['N', 'the Stage.'],
];
const KEY_X = 96;
const KEY_Y = 792;
function paintKey(g) {
  drawKeyLine(g, KEY1A.map(([l, w]) => (l === 'Fig. 1.' ? ['', 'Fig. 1.'] : [l, w])), KEY_X, KEY_Y, 14);
  drawKeyLine(g, KEY1B, KEY_X + 52, KEY_Y + 19, 14);
  drawKeyLine(g, KEY2.map(([l, w]) => (l === 'Fig. 2.' ? ['', 'Fig. 2.'] : [l, w])), KEY_X, KEY_Y + 42, 14);
}

/** Fig. 3 key (appears letter by letter on bar 3) + the N.B. cut by a burin on bar 4. */
function drawLowerNotes(g, T, thumb) {
  const items = [
    ['', 'Fig. 3.'],
    ['a', 'the Spoon;'],
    ['b', 'the Maſk;'],
    ['c', 'the Creſt;'],
    ['d', 'the Sails;'],
    ['e', 'the Crank.'],
  ];
  const times = [3.8, 4.0, 4.0, 4.5, 4.5, 5.0, 5.0, 5.5, 5.5, 6.0, 6.0];
  drawKeyLine(g, items, KEY_X, KEY_Y + 61, 14, (idx) => (thumb ? 1 : smoothstepN(times[idx], times[idx] + 0.15, T)));
  // N.B. (bar 4), engraved letter by letter by a burin travelling along the line
  const lines = [
    'N.B. The Bird, by its own Motion, makes the Wind that turns its Sails;',
    'as the Arm FG carries the Sails I round, in Fig. 1.',
  ];
  const y0 = KEY_Y + 87;
  const prog = thumb ? 0 : smoothstepN(6.0, 7.7, T) * 1.0;
  if (prog <= 0) return;
  g.font = 'italic 400 15px "IM Fell English", Georgia, serif';
  const w0 = g.measureText(lines[0]).width;
  const w1 = g.measureText(lines[1]).width;
  const total = w0 + w1;
  let rem = prog * total;
  let tipX = 0;
  let tipY = 0;
  for (let i = 0; i < 2; i++) {
    const wl = i === 0 ? w0 : w1;
    const lx = 500 - (i === 0 ? w0 : w1) / 2;
    const ly = y0 + i * 20;
    const show = Math.max(0, Math.min(wl, rem));
    rem -= wl;
    if (show <= 0) continue;
    g.save();
    g.beginPath();
    g.rect(lx - 2, ly - 16, show + 2, 22);
    g.clip();
    text(g, lines[i], lx, ly, 15, { italic: true });
    g.restore();
    tipX = lx + show;
    tipY = ly - 4;
  }
  if (prog < 0.999) {
    // the burin: a lozenge-section steel with a mushroom handle, held at a low angle
    g.save();
    g.translate(tipX, tipY);
    g.rotate(-0.42);
    g.fillStyle = PAPER;
    g.strokeStyle = ink(0.95);
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(34, -3);
    g.lineTo(34, 3);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(44, 0, 11, 8, 0, 0, TAU);
    g.fill();
    g.stroke();
    hatch(g, (h) => {
      h.beginPath();
      h.ellipse(44, 0, 11, 8, 0, 0.2, Math.PI);
      h.closePath();
    }, 0.3, 1.5, 0.5, 0.85, 44, 3, 14);
    g.restore();
    // a curl of copper swarf
    g.strokeStyle = ink(0.8);
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(tipX - 3, tipY - 6, 3, 0.5, 5.2);
    g.stroke();
  }
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const { rawLocalT, isThumbnail } = params;
  const T = isThumbnail ? 4.4 : rawLocalT;
  ctx.save();

  const bg = kit.bake('smeaton_bg', S, S, (g, rng) => {
    paintPaper(kit, g, rng);
    paintTitles(g);
    paintScale(g);
    paintKey(g);
    paintFig1Ground(g, rng);
    paintTable(g);
    paintSky(g, rng);
    paintMound(g, rng);
    paintTower(g);
    // Fig. 2 letters on static parts
    const st = ringPt(STAGE_Y + 10, towerR(STAGE_Y) + 40, -1.25);
    letter(g, 'N', st.x - 16, st.y + 10, 16, false);
    // the road: Fig. 3's ground line, ruled edge to edge, with a strip of ground hatching
    g.strokeStyle = ink(0.95);
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(0, ROAD_Y);
    g.lineTo(S, ROAD_Y);
    g.stroke();
    g.save();
    g.beginPath();
    g.rect(PL.x0 + 4, ROAD_Y, PL.x1 - PL.x0 - 8, 22);
    g.clip();
    g.lineWidth = 0.6;
    for (let k = 0; k < 6; k++) {
      g.strokeStyle = ink(0.5 - k * 0.07);
      g.beginPath();
      let x = PL.x0 + rng() * 8;
      while (x < PL.x1) {
        const seg = 14 + rng() * 44;
        g.moveTo(x, ROAD_Y + 3 + k * 3);
        g.lineTo(x + seg * (1 - k * 0.1), ROAD_Y + 3 + k * 3);
        x += seg + 3 + rng() * (6 + k * 8);
      }
      g.stroke();
    }
    g.restore();
  });
  const frame1 = kit.bake('smeaton_frame1', S, S, (g) => {
    paintFig1Frame(g);
    fig1StaticLetters(g);
  });
  const cap = kit.bake('smeaton_cap', S, S, (g) => paintCap(g));

  ctx.drawImage(bg, 0, 0);

  // Fig. 2 — the tower mill (cap, fan-tail, sails) and its plan
  drawFig2Dynamic(ctx, T, cap, true);
  drawPlan(ctx, T);
  text(ctx, 'Plan of the Cap.', PLAN.x, PLAN.y - PLAN.r - 14, 12.5, { italic: true, align: 'center', alpha: 0.85 });

  // Fig. 1 — the whirling arm, pendulum
  drawPendulum(ctx, T, true);
  drawFig1Dynamic(ctx, kit, T, frame1, true);
  // cord Z: the toggle drifts as the cord is drawn off the barrel
  const pull = isThumbnail ? 0.4 : Math.max(0, Math.min(1, (armAngle(T) - 0.35) / (Math.PI * 8)));
  const zx = 98 - 26 * pull;
  const gd = { x: 128, y: P(V1, 0, 144, 0).y + 32 };
  ctx.strokeStyle = ink(0.95);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(gd.x - 5, gd.y + 3);
  ctx.lineTo(zx + 4, gd.y + 22);
  ctx.stroke();
  // toggle (a short wooden handle)
  beam(ctx, { x: zx - 2, y: gd.y + 14 }, { x: zx + 8, y: gd.y + 30 }, 5, 0.5);
  letter(ctx, 'Z', zx - 10, gd.y + 34, 16, false);

  // Fig. 3 — the rider
  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    drawEngravedRider(kit, ctx, rig, scene);
    drawFig3Notes(ctx, rig, T, isThumbnail);
  }
  drawLowerNotes(ctx, T, isThumbnail);

  ctx.restore();
}
