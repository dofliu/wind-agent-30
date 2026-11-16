// src/scenes/nile.js
// 《乘風騎行》 #01 尼羅河上的帆 · c. 3300–3100 BCE — Sails on the Nile.
//
// Medium: ancient Egyptian tomb painting on mud plaster. Flat mineral colours
// (yellow & red ochre, Egyptian blue, malachite green, carbon black, gypsum white)
// on a cream plaster ground; strict profile figures with a frontal eye; horizontal
// registers separated by ruled bands; a kheker frieze and a "granite" dado; cracks
// and flaked losses baked into the plaster.
//
// The subject is LATE PREDYNASTIC (c. 3300–3100 BCE), so the art carries no writing
// at all (hieroglyphic inscriptions are later) and no dynastic emblems (no winged sun
// disk, no wedjat eye): only a plain sun disk, and the Decorated-Ware repertoire —
// zig-zag water, papyrus, low desert hills, ibex, flamingos.
//
// Registers (top -> bottom)
//   kheker frieze · block border · star band · plain sun disk
//   I   The river going SOUTH: a papyriform wooden boat with ONE straight pole mast
//       stepped well forward near the bow, carrying one roughly square sail between
//       a yard and a lower boom; almost no rigging (a halyard and one sheet); two
//       steering oars at the stern; a small cabin with the owner; crew. The
//       prevailing north wind fills the sail from behind and pushes it upstream
//       while the current (zig-zags) runs north. Right: the desert edge with an
//       ibex, flamingos at the water.
//   II  The rider's bank (ground line y = 700): papyrus thickets and a sacred ibis
//       (the spoonbill's cousin, family Threskiornithidae) who does a double take.
//   III Threshing floor (winnowing — the other everyday use of the wind) under the
//       desert hills, and the river going NORTH: mast lowered, crew rowing with the
//       current.
//   dado (red / yellow / black lines + speckled "granite")
//
// Gag (bar 3): the ibis glances back at the rider, goes back to foraging, then
// snaps round with a hop and a wide eye (shaking a few feathers loose); on bar 4 it
// turns and raises its wings. A shared gust function makes the big sail, the
// rider's little sail, the papyrus and the winnowed chaff billow in sync.

const P = 1000;
const TAU = Math.PI * 2;

const C = {
  plaster: '#e9d6a8',
  plasterHi: '#f1e3bf',
  plasterLo: '#d8bf8c',
  mud: '#a98b5e',
  mudDeep: '#7b5f3e',
  ink: '#1c1815',
  red: '#c14928',
  redDeep: '#94371f',
  skin: '#a9472a',
  skinDeep: '#8e3a22',
  yellow: '#d4a024',
  yellowLt: '#e6c56a',
  wood: '#c98f3c',
  blue: '#2b6f97',
  blueDeep: '#1f5274',
  teal: '#1d6b73',
  turq: '#4f9c97',
  water: '#3f7f9a',
  green: '#4b8a4f',
  greenDeep: '#2e6638',
  greenLt: '#86ad72',
  white: '#f6efdd',
  linen: '#f1e8d0',
  linenShade: '#ddcba4',
  grain: '#e0b448',
  chaff: '#f3e3b0',
};

// Register geometry ----------------------------------------------------------
const Y_KHEKER0 = 27;
const Y_KHEKER1 = 57;
const Y_SKY0 = 68;
const Y_SKY1 = 94;
const R1_WATER0 = 430; // register I water band
const R1_WATER1 = 456;
const R1_WL = 436; // waterline of the sailing boat
const R2_TOP = 464;
const ROAD = 700;
const R3_TOP = 712;
const R3_WATER0 = 818;
const R3_WATER1 = 900;
const R3_WATER_X0 = 352;
const DADO = 900;

// -----------------------------------------------------------------------------
// tiny utils
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function path(g, pts, close = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}

function fillInk(g, fill, lw = 1.3, ink = C.ink) {
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (lw > 0) {
    g.strokeStyle = ink;
    g.lineWidth = lw;
    g.stroke();
  }
}

/** Two-bone IK; returns both elbow candidates and the (clamped) hand. */
function ik2(sx, sy, tx, ty, L1, L2) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy) || 1e-3;
  const maxD = L1 + L2 - 1e-3;
  if (d > maxD) {
    dx *= maxD / d;
    dy *= maxD / d;
    d = maxD;
  }
  const dd = Math.max(d, Math.abs(L1 - L2) + 1e-3);
  const a0 = Math.atan2(dy, dx);
  const A = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1));
  return [
    { x: sx + L1 * Math.cos(a0 + A), y: sy + L1 * Math.sin(a0 + A) },
    { x: sx + L1 * Math.cos(a0 - A), y: sy + L1 * Math.sin(a0 - A) },
    { x: sx + dx, y: sy + dy },
  ];
}

// -----------------------------------------------------------------------------
// The wind: one shared gust envelope (beat-synced) drives every sail and reed.
// -----------------------------------------------------------------------------
function gustAt(T) {
  const bar = Math.floor(T / 2);
  const ph = T - bar * 2;
  const b = ((bar % 4) + 4) % 4;
  const amp = [0.55, 0.72, 1.0, 0.85][b];
  let v = amp * (1 - Math.exp(-ph * 11)) * Math.exp(-ph * 1.35);
  // bar 3, beat 3: an extra puff right on the ibis' double take
  if (b === 2 && ph > 1) v += 0.5 * (1 - Math.exp(-(ph - 1) * 11)) * Math.exp(-(ph - 1) * 1.7);
  return clamp(v, 0, 1);
}

// -----------------------------------------------------------------------------
// Egyptian human figure (canon of proportions, composite view). Drawn in a local
// "u-space" (grid squares, y up). Head in profile with a frontal eye, shoulders
// frontal, hips and legs in profile, both feet seen from the inside.
// -----------------------------------------------------------------------------
const TORSO = [
  [-1.15, 0.0], [-1.25, 1.6], [-1.6, 3.6], [-2.3, 4.95], [-2.45, 5.45], [-2.0, 5.85], [-0.35, 5.95],
  [0.95, 5.95], [2.5, 5.85], [2.95, 5.45], [2.85, 4.9], [2.45, 4.1], [2.4, 3.6], [2.05, 3.15], [1.7, 1.6], [1.25, 0.0],
];
const HEAD = [
  [0.95, 6.15], [1.45, 6.35], [1.7, 6.8], [1.86, 6.98], [1.86, 7.12], [1.98, 7.25], [2.18, 7.45], [1.9, 7.95],
  [1.82, 8.2], [1.62, 8.75], [0.55, 9.25], [-0.6, 8.65], [-0.62, 7.0], [-0.25, 6.15],
];
const WIG_SHORT = [
  [1.6, 8.62], [1.3, 9.2], [0.45, 9.48], [-0.6, 9.2], [-0.98, 8.4], [-0.95, 7.3], [-0.62, 6.72], [0.42, 6.8],
  [0.72, 7.3], [0.95, 8.15], [1.28, 8.42],
];
const WIG_LONG = [
  [1.6, 8.62], [1.3, 9.25], [0.35, 9.55], [-0.8, 9.25], [-1.3, 8.2], [-1.35, 6.0], [-0.4, 5.75], [0.6, 6.0],
  [0.72, 7.2], [0.95, 8.15], [1.28, 8.42],
];
const KILT_SHORT = [[-1.2, 0.3], [-1.55, -3.35], [-1.25, -3.6], [2.05, -3.75], [2.45, -3.5], [1.35, 0.3]];
const KILT_LONG = [[-1.25, 0.3], [-1.5, -7.5], [-1.15, -7.7], [1.5, -7.7], [3.35, -6.2], [3.0, -5.3], [1.4, 0.3]];

function legPoly(hip, knee, ankle, heelX, toeX, wH, wK, wA) {
  const n = (a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  };
  const n1 = n(hip, knee);
  const n2 = n(knee, ankle);
  const nk = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
  const calf = [lerp(knee[0], ankle[0], 0.3), lerp(knee[1], ankle[1], 0.3)];
  return [
    [hip[0] + (n1[0] * wH) / 2, hip[1] + (n1[1] * wH) / 2],
    [knee[0] + (nk[0] * wK) / 2, knee[1] + (nk[1] * wK) / 2],
    [ankle[0] + (n2[0] * wA) / 2 + 0.15, ankle[1] + (n2[1] * wA) / 2],
    [ankle[0] + 1.0, 0.62],
    [toeX - 0.25, 0.32],
    [toeX, 0.0],
    [heelX, 0.0],
    [heelX + 0.05, 0.45],
    [ankle[0] - (n2[0] * wA) / 2, ankle[1] - (n2[1] * wA) / 2],
    [calf[0] - n2[0] * wK * 0.66, calf[1] - n2[1] * wK * 0.66],
    [knee[0] - (nk[0] * wK) / 2, knee[1] - (nk[1] * wK) / 2],
    [hip[0] - (n1[0] * wH) / 2, hip[1] - (n1[1] * wH) / 2],
  ];
}

/**
 * o: { x, y (feet), H (px to crown), dir, skin, kilt:'short'|'long', wig:'short'|'long',
 *      seated, lean (rad, + = forward), stride, hands:{f:[ux,uy], b:[ux,uy]} (u-space, feet origin),
 *      collar, lw }
 * returns global hand positions { f:{x,y}, b:{x,y} }.
 */
function drawMan(g, o) {
  const u = o.H / 19.5;
  const dir = o.dir || 1;
  const skin = o.skin || C.skin;
  const lw = (o.lw || 1.2) / u;
  const seated = !!o.seated;
  const lean = o.lean || 0;
  const s = o.stride === undefined ? 1 : o.stride;
  const W = seated ? { x: 0.1, y: 4.7 } : { x: 0.05, y: 10.0 };
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  const R = (p) => ({ x: W.x + p[0] * cl + p[1] * sl, y: W.y - p[0] * sl + p[1] * cl });
  const hands = o.hands || { f: [3.6, 11.2], b: [2.2, 10.0] };

  g.save();
  g.translate(o.x, o.y);
  g.scale(dir * u, -u);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const shapeR = (pts) => {
    g.beginPath();
    pts.forEach((p, i) => {
      const q = R(p);
      if (i) g.lineTo(q.x, q.y);
      else g.moveTo(q.x, q.y);
    });
    g.closePath();
  };
  const fill = (col) => fillInk(g, col, lw);

  const Sb = R([-1.8, 5.25]);
  const Sf = R([2.35, 5.25]);
  const armOut = [];
  const arm = (S, Ht, col) => {
    const [e1, e2, h] = ik2(S.x, S.y, Ht[0], Ht[1], 3.3, 3.55);
    const e = e1.y < e2.y ? e1 : e2;
    g.strokeStyle = C.ink;
    g.lineWidth = 1.12 + 2 * lw;
    g.beginPath();
    g.moveTo(S.x, S.y);
    g.lineTo(e.x, e.y);
    g.stroke();
    g.lineWidth = 0.86 + 2 * lw;
    g.beginPath();
    g.moveTo(e.x, e.y);
    g.lineTo(h.x, h.y);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 1.12;
    g.beginPath();
    g.moveTo(S.x, S.y);
    g.lineTo(e.x, e.y);
    g.stroke();
    g.lineWidth = 0.86;
    g.beginPath();
    g.moveTo(e.x, e.y);
    g.lineTo(h.x, h.y);
    g.stroke();
    g.beginPath();
    g.ellipse(h.x, h.y, 0.6, 0.5, 0, 0, TAU);
    fill(col);
    armOut.push(h);
  };

  // back arm (behind everything)
  arm(Sb, hands.b, skin);

  // legs
  if (seated) {
    const lb = legPoly([-0.15, 4.1], [2.6, 4.45], [2.5, 0.9], 1.85, 4.55, 1.9, 1.05, 0.55);
    path(g, lb);
    fill(skin);
    const lf = legPoly([0.35, 4.0], [3.05, 4.3], [3.0, 0.9], 2.35, 5.05, 1.9, 1.05, 0.55);
    path(g, lf);
    fill(skin);
  } else {
    const lb = legPoly([-0.25, 9.8], [-0.45, 5.5], [-0.75, 1.0], -1.5, 1.45, 1.75, 0.98, 0.52);
    path(g, lb);
    fill(skin);
    const ax = -0.75 + 3.4 * s;
    const lf = legPoly([0.75, 9.8], [0.6 + 1.25 * s, 5.5], [ax, 1.0], ax - 0.75, ax + 2.2, 1.75, 0.98, 0.52);
    path(g, lf);
    fill(skin);
  }

  // kilt
  if (seated) {
    path(g, [[-1.15, 5.2], [-1.4, 3.65], [-0.9, 3.3], [2.8, 3.55], [2.65, 4.75], [1.35, 5.2]]);
    fill(C.white);
  } else {
    const K = o.kilt === 'long' ? KILT_LONG : KILT_SHORT;
    g.beginPath();
    K.forEach((p, i) => (i ? g.lineTo(p[0] + W.x, p[1] + W.y) : g.moveTo(p[0] + W.x, p[1] + W.y)));
    g.closePath();
    fill(C.white);
    // pleated front panel of the shendyt
    g.strokeStyle = 'rgba(28,24,21,0.55)';
    g.lineWidth = lw * 0.8;
    g.beginPath();
    if (o.kilt === 'long') {
      g.moveTo(W.x + 1.0, W.y + 0.1);
      g.lineTo(W.x + 3.1, W.y - 5.9);
      g.moveTo(W.x + 0.6, W.y - 0.2);
      g.lineTo(W.x + 1.4, W.y - 7.6);
    } else {
      g.moveTo(W.x + 0.95, W.y + 0.1);
      g.lineTo(W.x + 2.2, W.y - 3.55);
      for (let k = 1; k < 4; k++) {
        g.moveTo(W.x + 0.95 + k * 0.3, W.y - 0.2 - k * 0.6);
        g.lineTo(W.x + 1.1 + k * 0.28, W.y - 3.6);
      }
    }
    g.stroke();
  }
  // belt
  shapeR([[-1.2, -0.15], [-1.18, 0.45], [1.32, 0.45], [1.3, -0.15]]);
  fill(o.belt || C.red);

  // torso
  shapeR(TORSO);
  fill(skin);
  const nip = R([2.3, 3.55]);
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(nip.x, nip.y, 0.13, 0, TAU);
  g.fill();

  // broad collar (wesekh) for the tomb owner
  if (o.collar) {
    const cols = [C.blue, C.red, C.green, C.yellow];
    for (let k = 0; k < 4; k++) {
      const r0 = 1.2 + k * 0.42;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI * (1.05 + (i / 14) * 0.9);
        const q = R([0.35 + Math.cos(a) * (r0 + 0.9), 5.95 + Math.sin(a) * r0 * 0.85]);
        if (i) g.lineTo(q.x, q.y);
        else g.moveTo(q.x, q.y);
      }
      g.strokeStyle = C.ink;
      g.lineWidth = 0.46 + lw * 2;
      g.stroke();
      g.strokeStyle = cols[k];
      g.lineWidth = 0.46;
      g.stroke();
    }
  }

  // head
  shapeR(HEAD);
  fill(skin);
  shapeR(o.wig === 'long' ? WIG_LONG : WIG_SHORT);
  fillInk(g, C.ink, lw);
  // frontal eye
  const ec = R([1.38, 7.95]);
  g.save();
  g.translate(ec.x, ec.y);
  g.rotate(-lean);
  if (u > 4.6) {
    g.beginPath();
    g.moveTo(-0.36, 0);
    g.quadraticCurveTo(0, 0.24, 0.34, 0.02);
    g.quadraticCurveTo(0, -0.2, -0.36, 0);
    g.closePath();
    g.fillStyle = C.white;
    g.fill();
    g.strokeStyle = C.ink;
    g.lineWidth = lw;
    g.stroke();
    g.beginPath();
    g.moveTo(-0.36, 0);
    g.lineTo(-0.72, 0.05);
    g.stroke();
    g.beginPath();
    g.arc(0.02, 0.02, 0.12, 0, TAU);
    g.fillStyle = C.ink;
    g.fill();
    g.beginPath();
    g.moveTo(-0.38, 0.3);
    g.quadraticCurveTo(0, 0.45, 0.34, 0.3);
    g.stroke();
  } else {
    g.beginPath();
    g.ellipse(0, 0, 0.36, 0.2, 0, 0, TAU);
    g.fillStyle = C.white;
    g.fill();
    g.beginPath();
    g.arc(0.03, 0, 0.16, 0, TAU);
    g.fillStyle = C.ink;
    g.fill();
  }
  g.restore();

  // front arm
  arm(Sf, hands.f, skin);
  g.restore();

  const toG = (h) => ({ x: o.x + dir * u * h.x, y: o.y - u * h.y });
  return { b: toG(armOut[0]), f: toG(armOut[1]), u };
}

// -----------------------------------------------------------------------------
// Papyrus thickets
// -----------------------------------------------------------------------------
function makeClump(rng, n, hMin, hMax, spread, umbelW) {
  const stems = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const ang = f * spread + (rng() - 0.5) * 0.07;
    const len = lerp(hMax, hMin, Math.pow(Math.abs(f) * 2, 1.3)) * (0.94 + rng() * 0.12);
    const kind = rng() < 0.28 ? 'bud' : 'umbel';
    stems.push({ ang, len, kind, ph: rng() * TAU, w: umbelW * (0.85 + rng() * 0.3), order: Math.abs(f) });
  }
  // outer stems first so the central fan sits on top
  stems.sort((a, b) => b.order - a.order);
  return stems;
}

function drawPapyrus(g, bx, by, stems, gust, T, scale = 1) {
  // stems
  const tips = [];
  for (const st of stems) {
    const sway = 0.16 * gust * (st.len / 200) + 0.018 * Math.sin(T * 1.7 + st.ph) + 0.03;
    const a = st.ang + sway;
    const L = st.len * scale;
    const tx = bx + Math.sin(a) * L;
    const ty = by - Math.cos(a) * L;
    const cx = bx + Math.sin(st.ang) * L * 0.5;
    const cy = by - Math.cos(st.ang) * L * 0.5;
    tips.push({ x: tx, y: ty, a, st });
    g.beginPath();
    g.moveTo(bx + st.ang * 6, by);
    g.quadraticCurveTo(cx, cy, tx, ty);
    g.strokeStyle = C.ink;
    g.lineWidth = 3.4 * scale;
    g.stroke();
    g.strokeStyle = C.green;
    g.lineWidth = 1.7 * scale;
    g.stroke();
  }
  // umbels / buds
  for (const tp of tips) {
    g.save();
    g.translate(tp.x, tp.y);
    g.rotate(tp.a);
    const w = tp.st.w * scale;
    if (tp.st.kind === 'umbel') {
      const h = w * 0.95;
      g.beginPath();
      g.moveTo(-1.4 * scale, 2);
      g.bezierCurveTo(-w * 0.18, -h * 0.35, -w * 0.5, -h * 0.75, -w * 0.52, -h * 0.92);
      g.quadraticCurveTo(0, -h * 1.22, w * 0.52, -h * 0.92);
      g.bezierCurveTo(w * 0.5, -h * 0.75, w * 0.18, -h * 0.35, 1.4 * scale, 2);
      g.closePath();
      fillInk(g, C.green, 1.1 * scale);
      // darker crown band and the fan of fibres
      g.save();
      g.clip();
      g.fillStyle = C.greenDeep;
      g.beginPath();
      g.ellipse(0, -h * 1.0, w * 0.62, h * 0.2, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(28,24,21,0.55)';
      g.lineWidth = 0.8 * scale;
      g.beginPath();
      for (let k = -3; k <= 3; k++) {
        g.moveTo(0, 0);
        g.lineTo(k * w * 0.15, -h * 0.98);
      }
      g.stroke();
      g.restore();
      // red-tipped fringe
      g.strokeStyle = C.red;
      g.lineWidth = 1.4 * scale;
      g.beginPath();
      g.moveTo(-w * 0.5, -h * 0.94);
      g.quadraticCurveTo(0, -h * 1.22, w * 0.5, -h * 0.94);
      g.stroke();
    } else {
      const h = w * 0.85;
      g.beginPath();
      g.moveTo(-1.3 * scale, 2);
      g.bezierCurveTo(-w * 0.32, -h * 0.3, -w * 0.22, -h * 0.8, 0, -h);
      g.bezierCurveTo(w * 0.22, -h * 0.8, w * 0.32, -h * 0.3, 1.3 * scale, 2);
      g.closePath();
      fillInk(g, C.greenLt, 1.1 * scale);
      g.strokeStyle = 'rgba(28,24,21,0.5)';
      g.lineWidth = 0.8 * scale;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -h * 0.9);
      g.stroke();
    }
    g.restore();
  }
  // sheath leaves at the base
  for (let k = -3; k <= 3; k++) {
    const x = bx + k * 7 * scale;
    const h = (22 - Math.abs(k) * 3) * scale;
    g.beginPath();
    g.moveTo(x - 5 * scale, by);
    g.quadraticCurveTo(x - 1 * scale + k * 1.5, by - h * 0.6, x + k * 2.5 * scale, by - h);
    g.quadraticCurveTo(x + 2 * scale + k, by - h * 0.4, x + 5 * scale, by);
    g.closePath();
    fillInk(g, k % 2 ? C.greenDeep : C.green, 1 * scale);
  }
}

// -----------------------------------------------------------------------------
// Animals
// -----------------------------------------------------------------------------
function drawDuck(g, x, y, s, flap, dir) {
  // pintail in flight, Egyptian manner: broad patterned wings, long pointed tail
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  g.lineJoin = 'round';
  const lw = 1.1 / s;
  const f = 0.5 + 0.5 * Math.sin(flap);
  const wing = (ang, far) => {
    g.save();
    g.translate(far ? 4 : -2, -5);
    g.rotate(ang);
    const shape = () => {
      g.beginPath();
      g.moveTo(-9, 2);
      g.bezierCurveTo(-14, -12, -22, -26, -30, -40);
      g.quadraticCurveTo(-24, -42, -18, -37);
      g.lineTo(-15, -40);
      g.lineTo(-10, -33);
      g.lineTo(-6, -35);
      g.lineTo(-2, -26);
      g.bezierCurveTo(3, -16, 8, -6, 10, 2);
      g.closePath();
    };
    shape();
    g.fillStyle = far ? '#e3d6b6' : C.white;
    g.fill();
    g.save();
    g.clip();
    // coverts (ochre with black dots), blue-green speculum, black primaries
    g.fillStyle = far ? '#b98a4a' : C.wood;
    g.beginPath();
    g.ellipse(0, -2, 13, 11, 0, 0, TAU);
    g.fill();
    g.fillStyle = C.ink;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.arc(-6 + (k % 3) * 5, -6 + Math.floor(k / 3) * 4, 0.9, 0, TAU);
      g.fill();
    }
    g.fillStyle = far ? C.teal : C.blue;
    g.beginPath();
    g.moveTo(-16, -16);
    g.lineTo(4, -12);
    g.lineTo(6, -6);
    g.lineTo(-13, -10);
    g.closePath();
    g.fill();
    g.fillStyle = C.ink;
    g.beginPath();
    g.moveTo(-34, -44);
    g.lineTo(-4, -30);
    g.lineTo(-8, -24);
    g.lineTo(-26, -30);
    g.closePath();
    g.fill();
    g.restore();
    shape();
    g.strokeStyle = C.ink;
    g.lineWidth = lw;
    g.stroke();
    g.restore();
  };
  wing(lerp(-0.75, 0.15, f), true);
  // body
  g.beginPath();
  g.moveTo(-40, 1);
  g.lineTo(-24, -3.5);
  g.bezierCurveTo(-10, -10, 14, -10, 22, -5);
  g.lineTo(30, -6);
  g.bezierCurveTo(33, -11, 39, -11, 40, -6);
  g.lineTo(47, -4);
  g.lineTo(40, -2);
  g.bezierCurveTo(37, 1, 30, 1, 24, 2);
  g.bezierCurveTo(12, 10, -10, 10, -24, 2);
  g.closePath();
  fillInk(g, '#c99a5c', lw);
  g.save();
  g.clip();
  g.fillStyle = C.white;
  g.beginPath();
  g.ellipse(2, 8, 22, 5.5, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#6b3a20';
  g.beginPath();
  g.ellipse(36, -5, 8, 7, 0, 0, TAU);
  g.fill();
  g.strokeStyle = C.white;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(31, 2);
  g.quadraticCurveTo(30, -4, 34, -9);
  g.stroke();
  g.fillStyle = C.ink;
  for (let k = 0; k < 8; k++) {
    g.beginPath();
    g.arc(-16 + k * 4.5, -4 + (k % 2) * 2.4, 0.95, 0, TAU);
    g.fill();
  }
  g.restore();
  g.fillStyle = C.white;
  g.beginPath();
  g.arc(37, -6.5, 1.4, 0, TAU);
  g.fill();
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(37.3, -6.5, 0.7, 0, TAU);
  g.fill();
  // feet tucked
  g.strokeStyle = C.red;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-6, 6);
  g.lineTo(-16, 9);
  g.stroke();
  wing(lerp(-0.45, 0.65, f), false);
  g.restore();
}

/** Swallow (G36 "wr") skimming with the wind. */
function drawSwallow(g, x, y, s, flap) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const f = Math.sin(flap);
  g.beginPath();
  g.moveTo(14, 0);
  g.quadraticCurveTo(8, -4, 0, -2);
  g.lineTo(-10, -1);
  g.lineTo(-22, -6);
  g.lineTo(-14, 0);
  g.lineTo(-22, 5);
  g.lineTo(-10, 2);
  g.quadraticCurveTo(6, 5, 14, 0);
  g.closePath();
  fillInk(g, C.blueDeep, 1 / s);
  g.fillStyle = C.red;
  g.beginPath();
  g.arc(11, 0.5, 2, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(4, -1);
  g.quadraticCurveTo(-2, -12 * f - 2, -14, -16 * f);
  g.quadraticCurveTo(-4, -6 * f, -4, 0);
  g.closePath();
  fillInk(g, C.blue, 1 / s);
  g.restore();
}

/** Butterfly, as in the marsh scenes. */
function drawButterfly(g, x, y, s, flap) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const w = 0.35 + 0.65 * Math.abs(Math.sin(flap));
  g.beginPath();
  g.ellipse(-5 * w, -4, 6 * w, 5, -0.3, 0, TAU);
  fillInk(g, C.yellow, 0.9 / s);
  g.beginPath();
  g.ellipse(4 * w, -4, 5 * w, 4.5, 0.3, 0, TAU);
  fillInk(g, C.red, 0.9 / s);
  g.beginPath();
  g.ellipse(-3 * w, 3, 4 * w, 3, 0.4, 0, TAU);
  fillInk(g, C.red, 0.9 / s);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6 / s;
  g.beginPath();
  g.moveTo(0, -6);
  g.lineTo(0, 5);
  g.stroke();
  g.restore();
}

function drawFish(g, x, y, s, dir, wag, col = '#6f9fa8') {
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  const lw = 1 / s;
  // tail
  g.beginPath();
  g.moveTo(-12, 0);
  g.lineTo(-21, -6 + wag);
  g.quadraticCurveTo(-18, 0, -21, 6 + wag);
  g.closePath();
  fillInk(g, C.red, lw);
  // dorsal + anal fin
  g.beginPath();
  g.moveTo(-9, -5);
  g.quadraticCurveTo(0, -12, 8, -5);
  g.closePath();
  fillInk(g, C.blueDeep, lw);
  g.beginPath();
  g.moveTo(-8, 5);
  g.quadraticCurveTo(-2, 10, 3, 5);
  g.closePath();
  fillInk(g, C.blueDeep, lw);
  // body
  g.beginPath();
  g.ellipse(0, 0, 14, 7.5, 0, 0, TAU);
  fillInk(g, col, lw);
  g.save();
  g.clip();
  g.fillStyle = 'rgba(246,239,221,0.55)';
  g.beginPath();
  g.ellipse(1, 5, 12, 3.5, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(28,24,21,0.55)';
  g.lineWidth = lw;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    g.moveTo(-8 + k * 4, -7);
    g.lineTo(-9 + k * 4, 3);
  }
  g.stroke();
  g.restore();
  g.strokeStyle = C.ink;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(8, -5);
  g.quadraticCurveTo(6, 0, 8, 5);
  g.stroke();
  g.fillStyle = C.white;
  g.beginPath();
  g.arc(10, -1.5, 1.6, 0, TAU);
  g.fill();
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(10.3, -1.5, 0.8, 0, TAU);
  g.fill();
  g.restore();
}

/** Sacred ibis (Threskiornis aethiopicus), Egyptian manner. */
function drawIbis(g, x, y, ps) {
  const { face, hx, hy, hd, bill, hop, eye, wing } = ps;
  g.save();
  g.translate(x, y);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // legs stay planted unless hopping
  const legCol = '#2a2420';
  const bodyY = -96 - hop;
  const legs = (dx, kneeDx, footDx) => {
    g.beginPath();
    g.moveTo(face * dx, bodyY + 16);
    g.lineTo(face * kneeDx, -44 - hop * 0.6);
    g.lineTo(face * footDx, -hop * 0.35);
    g.strokeStyle = C.ink;
    g.lineWidth = 4.4;
    g.stroke();
    g.strokeStyle = legCol;
    g.lineWidth = 2.6;
    g.stroke();
    g.lineWidth = 1.8;
    g.beginPath();
    const fx = face * footDx;
    const fy = -hop * 0.35;
    g.moveTo(fx, fy);
    g.lineTo(fx + face * 12, fy + 1);
    g.moveTo(fx, fy);
    g.lineTo(fx + face * 9, fy + 2.5);
    g.moveTo(fx, fy);
    g.lineTo(fx - face * 6, fy + 1);
    g.strokeStyle = legCol;
    g.stroke();
  };
  legs(-10, -15, -12);
  legs(4, 7, 12);

  g.translate(0, bodyY);
  g.scale(face, 1);
  const wingFan = (w, far) => {
    // folded along the back (w=0) -> spread up and out in adoration (w=1)
    const len = lerp(26, 84, w);
    const ang = far ? lerp(-1.75, -0.5, w) : lerp(-1.55, 0.38, w);
    g.save();
    g.translate(far ? -6 : 8, -12);
    g.rotate(ang);
    const shape = () => {
      g.beginPath();
      g.moveTo(-13, 6);
      g.lineTo(11, 4);
      g.quadraticCurveTo(17, -len * 0.55, 5, -len);
      const n = 6;
      let px = 5;
      let py = -len;
      for (let k = 1; k <= n; k++) {
        const f = k / n;
        const qx = lerp(5, -13, f) - Math.sin(f * Math.PI) * 16;
        const qy = lerp(-len, 6, f);
        g.quadraticCurveTo((px + qx) / 2 - 7, (py + qy) / 2 - 2, qx, qy);
        px = qx;
        py = qy;
      }
      g.closePath();
    };
    shape();
    g.fillStyle = far ? '#e2d8bf' : C.white;
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = C.ink;
    g.beginPath();
    g.ellipse(0, -len, 26, len * 0.26, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(28,24,21,0.5)';
    g.lineWidth = 0.9;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      g.moveTo(0, 2);
      g.lineTo(lerp(4, -24, k / 5), -len * lerp(0.95, 0.55, k / 5));
    }
    g.stroke();
    g.restore();
    shape();
    g.strokeStyle = C.ink;
    g.lineWidth = 1.3;
    g.stroke();
    g.restore();
  };
  if (wing > 0.04) wingFan(wing, true);
  // body
  g.beginPath();
  g.ellipse(-4, 0, 42, 20, -0.14, 0, TAU);
  fillInk(g, C.white, 1.4);
  // drooping black plumes over the tail
  g.beginPath();
  g.moveTo(-14, -12);
  g.bezierCurveTo(-34, -16, -52, -8, -60, 8);
  g.quadraticCurveTo(-55, 6, -54, 14);
  g.quadraticCurveTo(-48, 9, -45, 18);
  g.quadraticCurveTo(-40, 10, -34, 16);
  g.quadraticCurveTo(-28, 4, -18, 6);
  g.closePath();
  fillInk(g, C.ink, 1.2);
  g.strokeStyle = 'rgba(246,239,221,0.45)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(-20, -8);
  g.quadraticCurveTo(-40, -6, -52, 10);
  g.moveTo(-22, -2);
  g.quadraticCurveTo(-36, 0, -44, 14);
  g.stroke();
  if (wing <= 0.04) {
    // folded wing line
    g.strokeStyle = 'rgba(28,24,21,0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(24, -10);
    g.quadraticCurveTo(0, -16, -22, -8);
    g.stroke();
  } else {
    wingFan(wing, false);
  }
  // neck (bare black skin) + head
  const base = { x: 30, y: -8 };
  const head = { x: hx, y: hy + 96 };
  const c1 = head.y > base.y - 10 ? { x: base.x + 30, y: base.y - 14 } : { x: base.x + 16, y: base.y - 26 };
  const c2 = head.y > base.y - 10 ? { x: head.x - 4, y: head.y - 40 } : { x: head.x - 4 * hd, y: head.y + Math.max(22, (base.y - head.y) * 0.45) };
  g.beginPath();
  g.moveTo(base.x - 6, base.y + 4);
  g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, head.x, head.y);
  g.strokeStyle = C.ink;
  g.lineWidth = 8.5;
  g.stroke();
  g.save();
  g.translate(head.x, head.y);
  g.scale(hd, 1);
  g.beginPath();
  g.arc(0, 0, 8, 0, TAU);
  g.fillStyle = C.ink;
  g.fill();
  // long decurved bill
  const ca = Math.cos(bill);
  const sa = Math.sin(bill);
  const L = 54;
  const tip = { x: 5 + ca * L, y: 2 + sa * L };
  const bend = 12;
  g.beginPath();
  g.moveTo(4, -3.5);
  g.quadraticCurveTo(5 + ca * L * 0.55 - sa * bend * -0.2, 2 + sa * L * 0.55 - bend * 0.9 * ca, tip.x, tip.y);
  g.quadraticCurveTo(5 + ca * L * 0.5 + sa * 3, 2 + sa * L * 0.5 - bend * 0.55 * ca + 3, 3, 5);
  g.closePath();
  g.fill();
  // frontal eye
  const es = eye;
  g.beginPath();
  g.moveTo(-4.2 * es, -2);
  g.quadraticCurveTo(0, -5.2 * es, 4.0 * es, -2.2);
  g.quadraticCurveTo(0, 1.0 * es, -4.2 * es, -2);
  g.closePath();
  g.fillStyle = C.white;
  g.fill();
  g.beginPath();
  g.arc(0.6, -2.2, 1.5 * Math.min(1.3, es), 0, TAU);
  g.fillStyle = C.ink;
  g.fill();
  g.strokeStyle = C.yellow;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-4.2 * es, -2);
  g.lineTo(-8.5 * es, -1.4);
  g.stroke();
  if (es > 1.25) {
    // surprise ticks
    g.strokeStyle = C.ink;
    g.lineWidth = 2;
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = -2.2 + k * 0.5;
      g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
    }
    g.stroke();
  }
  g.restore();
  g.restore();
}

/** Ibis choreography (T = raw local time). */
function ibisPose(T, thumb) {
  const forage = (t) => ({
    face: -1,
    hx: 70,
    hy: -52 + 5 * Math.abs(Math.sin(t * Math.PI * 2)),
    hd: 1,
    bill: 1.25,
    hop: 0,
    eye: 1,
    wing: 0,
  });
  if (thumb) return { face: -1, hx: 18, hy: -168, hd: -1, bill: 0.55, hop: 0, eye: 1.1, wing: 0 };
  const glance = { face: -1, hx: 20, hy: -164, hd: -1, bill: 0.5, hop: 0, eye: 1.0, wing: 0 };
  const take = { face: -1, hx: 8, hy: -198, hd: -1, bill: 0.35, hop: 0, eye: 1.9, wing: 0 };
  const adore = { face: 1, hx: 34, hy: -176, hd: 1, bill: 0.5, hop: 0, eye: 1.15, wing: 1 };
  const mix = (a, b, k) => {
    const o = {};
    for (const key of Object.keys(a)) o[key] = key === 'hd' || key === 'face' ? (k < 0.5 ? a[key] : b[key]) : lerp(a[key], b[key], k);
    return o;
  };
  if (T < 3.9) return forage(T);
  if (T < 4.5) return mix(forage(T), glance, sstep(3.9, 4.12, T));
  if (T < 4.95) return mix(glance, forage(T), sstep(4.5, 4.72, T));
  if (T < 6.0) {
    const p = mix(forage(T), take, sstep(4.95, 5.08, T));
    p.hop = 16 * Math.sin(Math.PI * clamp((T - 5.0) / 0.42, 0, 1));
    p.eye = lerp(1, 1.9, sstep(4.95, 5.05, T)) - 0.5 * sstep(5.6, 6.0, T);
    p.hx += 4 * Math.sin((T - 5) * 9) * sstep(5.2, 5.4, T) * (1 - sstep(5.8, 6, T));
    return p;
  }
  if (T < 10.2) {
    const take2 = { ...take, eye: 1.4 };
    const p = mix(take2, adore, sstep(6.0, 6.45, T));
    // the body turns round (a flat, Egyptian flip); the head keeps watching the rider
    const k = sstep(6.0, 6.3, T);
    p.face = k < 0.5 ? -1 : 1;
    p.hd = k < 0.5 ? -1 : 1;
    p.wing = sstep(6.3, 6.9, T) * (1 - 0.18 * Math.abs(Math.sin((T - 7) * Math.PI * 2)) * sstep(6.9, 7.1, T)) * (1 - sstep(9.6, 10.2, T));
    p.hop = 6 * Math.max(0, Math.sin((T - 7) * Math.PI * 2)) * sstep(6.9, 7.0, T) * (1 - sstep(7.9, 8.0, T));
    return p;
  }
  const f = forage(T);
  f.face = 1;
  return mix({ ...adore, wing: 0 }, f, sstep(10.2, 10.8, T));
}

// -----------------------------------------------------------------------------
// Sail (face-on, Egyptian convention) — billow b in [0,1], wind from the left
// -----------------------------------------------------------------------------
function sailGeom(x0, x1, yT, yB, b) {
  const sw = 11 * b;
  return {
    tl: { x: x0, y: yT },
    tr: { x: x1, y: yT },
    bl: { x: x0 + sw, y: yB - 3 * b },
    br: { x: x1 + sw, y: yB - 3 * b },
    bulR: 2 + 19 * b,
    bulL: 0.5 + 15 * b,
  };
}
function sailPathEdge(s, f, right) {
  // point at fraction f down the left or right curved edge (quadratic)
  const a = right ? s.tr : s.tl;
  const c = right ? s.br : s.bl;
  const bul = right ? s.bulR : s.bulL;
  const m = { x: (a.x + c.x) / 2 + 2 * bul, y: (a.y + c.y) / 2 };
  const iu = 1 - f;
  return { x: iu * iu * a.x + 2 * iu * f * m.x + f * f * c.x, y: iu * iu * a.y + 2 * iu * f * m.y + f * f * c.y };
}
function drawSail(g, s, b, lwScale = 1, seams = 6) {
  const mR = { x: (s.tr.x + s.br.x) / 2 + 2 * s.bulR, y: (s.tr.y + s.br.y) / 2 };
  const mL = { x: (s.tl.x + s.bl.x) / 2 + 2 * s.bulL, y: (s.tl.y + s.bl.y) / 2 };
  g.beginPath();
  g.moveTo(s.tl.x, s.tl.y);
  g.lineTo(s.tr.x, s.tr.y);
  g.quadraticCurveTo(mR.x, mR.y, s.br.x, s.br.y);
  g.lineTo(s.bl.x, s.bl.y);
  g.quadraticCurveTo(mL.x, mL.y, s.tl.x, s.tl.y);
  g.closePath();
  g.fillStyle = C.linen;
  g.fill();
  g.save();
  g.clip();
  // flat second tone in the concave (windward) side
  g.fillStyle = C.linenShade;
  g.beginPath();
  g.moveTo(s.tl.x - 4, s.tl.y);
  g.quadraticCurveTo(mL.x + 10 + 10 * b, mL.y, s.bl.x - 4, s.bl.y);
  g.lineTo(s.bl.x - 20, s.bl.y);
  g.lineTo(s.tl.x - 20, s.tl.y);
  g.closePath();
  g.fill();
  // horizontal cloth seams sagging with the belly
  g.strokeStyle = 'rgba(28,24,21,0.42)';
  g.lineWidth = 0.9 * lwScale;
  g.beginPath();
  for (let k = 1; k < seams; k++) {
    const f = k / seams;
    const pl = sailPathEdge(s, f, false);
    const pr = sailPathEdge(s, f, true);
    g.moveTo(pl.x, pl.y);
    g.quadraticCurveTo((pl.x + pr.x) / 2 + 3 * b * lwScale, (pl.y + pr.y) / 2 + (2 + 5 * b) * lwScale, pr.x, pr.y);
  }
  g.stroke();
  g.restore();
  g.beginPath();
  g.moveTo(s.tl.x, s.tl.y);
  g.lineTo(s.tr.x, s.tr.y);
  g.quadraticCurveTo(mR.x, mR.y, s.br.x, s.br.y);
  g.lineTo(s.bl.x, s.bl.y);
  g.quadraticCurveTo(mL.x, mL.y, s.tl.x, s.tl.y);
  g.closePath();
  // red-ochre hem + black outline
  g.strokeStyle = C.red;
  g.lineWidth = 3 * lwScale;
  g.stroke();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.3 * lwScale;
  g.stroke();
}

// -----------------------------------------------------------------------------
// The sailing boat (register I). Local coords: x from stern (0) to bow (+480),
// y up negative, waterline 0.
// -----------------------------------------------------------------------------
const BOAT = {
  // ONE straight pole mast stepped well forward, close to the bow (as on the
  // Predynastic redware jar BM 35324 and the Naqada rock drawings) — not amidships.
  mast: { x: 410, foot: -30, top: -270 },
  // one roughly square sail between a yard and a lower boom
  yard: { x0: 348, x1: 472, y: -258 },
  boomY: -128,
  crew: {
    helm1: { x: 52, y: -33, H: 70 },
    helm2: { x: 84, y: -29, H: 70 },
    owner: { x: 158, y: -26, H: 98 },
    sheet1: { x: 236, y: -25, H: 70 },
    sheet2: { x: 268, y: -25, H: 70 },
    mast: { x: 376, y: -28, H: 70 },
    pilot: { x: 447, y: -36, H: 70 },
  },
};
const SPR_OX = 70;
const SPR_OY = 296;

function hullPath(g, L) {
  const k = L / 480;
  g.beginPath();
  g.moveTo(40 * k, 3);
  g.bezierCurveTo(140 * k, 14, 340 * k, 14, 440 * k, 3);
  g.quadraticCurveTo(470 * k, -8, 486 * k, -62 * k);
  g.quadraticCurveTo(472 * k, -50 * k, 452 * k, -40 * k);
  g.bezierCurveTo(400 * k, -26, 300 * k, -24, 240 * k, -24);
  g.bezierCurveTo(160 * k, -24, 100 * k, -26, 60 * k, -32 * k);
  g.bezierCurveTo(36 * k, -44 * k, 22 * k, -80 * k, 18 * k, -114 * k);
  g.quadraticCurveTo(10 * k, -116 * k, 4 * k, -110 * k);
  g.bezierCurveTo(2 * k, -70 * k, 6 * k, -26 * k, 40 * k, 3);
  g.closePath();
}

function drawHull(g, L) {
  const k = L / 480;
  hullPath(g, L);
  g.fillStyle = C.wood;
  g.fill();
  g.save();
  g.clip();
  // painted bands along the sheer
  g.lineWidth = 6 * k + 1;
  g.strokeStyle = C.green;
  g.beginPath();
  g.moveTo(-10, -20);
  g.bezierCurveTo(140 * k, -16, 340 * k, -16, 500 * k, -36 * k);
  g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = C.red;
  g.beginPath();
  g.moveTo(-10, -13);
  g.bezierCurveTo(140 * k, -9, 340 * k, -9, 500 * k, -28 * k);
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = C.blue;
  g.beginPath();
  g.moveTo(-10, -7);
  g.bezierCurveTo(140 * k, -3, 340 * k, -3, 500 * k, -20 * k);
  g.stroke();
  // papyriform lashings at both ends
  g.strokeStyle = C.ink;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = -30 * k - i * 9 * k;
    g.moveTo(0, y);
    g.lineTo(40 * k, y + 6 * k);
  }
  for (let i = 0; i < 5; i++) {
    const x = (448 + i * 7) * k;
    g.moveTo(x, -50 * k);
    g.lineTo(x - 5 * k, 6);
  }
  g.stroke();
  g.restore();
  hullPath(g, L);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.5;
  g.stroke();
  // finials: papyrus umbels at the stern post and the bow
  const umbel = (x, y, a, w) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(-1.5, 2);
    g.bezierCurveTo(-w * 0.2, -w * 0.3, -w * 0.5, -w * 0.7, -w * 0.5, -w * 0.9);
    g.quadraticCurveTo(0, -w * 1.15, w * 0.5, -w * 0.9);
    g.bezierCurveTo(w * 0.5, -w * 0.7, w * 0.2, -w * 0.3, 1.5, 2);
    g.closePath();
    fillInk(g, C.green, 1.2);
    g.strokeStyle = C.red;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-w * 0.48, -w * 0.92);
    g.quadraticCurveTo(0, -w * 1.15, w * 0.48, -w * 0.92);
    g.stroke();
    g.restore();
  };
  umbel(11 * k, -112 * k, 0.35, 20 * k);
  umbel(486 * k, -60 * k, 0.75, 15 * k);
}

function bakeBoat(kit) {
  return kit.bake('nile_sailboat', 600, 344, (g) => {
    g.translate(SPR_OX, SPR_OY);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const cr = BOAT.crew;
    // the single pole mast (no stays: the early images show little or no rigging)
    const mt = BOAT.mast;
    g.beginPath();
    g.moveTo(mt.x, mt.foot);
    g.lineTo(mt.x, mt.top);
    g.strokeStyle = C.ink;
    g.lineWidth = 7;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 4.2;
    g.stroke();
    g.beginPath();
    g.rect(mt.x - 5, mt.top - 8, 10, 9);
    fillInk(g, C.red, 1.2);

    // canopy (kiosk) of the owner
    const ow = cr.owner;
    g.beginPath();
    g.rect(ow.x - 34, -150, 70, 9);
    fillInk(g, C.yellow, 1.2);
    g.save();
    g.beginPath();
    g.rect(ow.x - 34, -150, 70, 9);
    g.clip();
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? C.blue : C.red;
      g.fillRect(ow.x - 34 + i * 6, -150 + (i % 2) * 4.5, 6, 4.5);
    }
    g.restore();
    g.beginPath();
    g.rect(ow.x - 34, -150, 70, 9);
    g.strokeStyle = C.ink;
    g.lineWidth = 1.2;
    g.stroke();
    for (const px of [ow.x - 30, ow.x + 32]) {
      g.beginPath();
      g.rect(px - 2, -141, 4, 115);
      fillInk(g, C.green, 1);
    }
    // hanging mat behind the owner
    g.beginPath();
    g.rect(ow.x - 28, -141, 22, 60);
    fillInk(g, C.yellowLt, 1);
    g.strokeStyle = 'rgba(28,24,21,0.5)';
    g.lineWidth = 0.8;
    g.beginPath();
    for (let i = 1; i < 8; i++) {
      g.moveTo(ow.x - 28, -141 + i * 7.5);
      g.lineTo(ow.x - 6, -141 + i * 7.5);
    }
    g.stroke();

    // steering oars (drawn before the helmsmen so their fists sit on top)
    const oar = (hx, hy, bx2, by2) => {
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(bx2, by2);
      g.strokeStyle = C.ink;
      g.lineWidth = 4.6;
      g.stroke();
      g.strokeStyle = C.wood;
      g.lineWidth = 2.6;
      g.stroke();
      const a = Math.atan2(by2 - hy, bx2 - hx);
      g.save();
      g.translate(bx2, by2);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-26, 0);
      g.quadraticCurveTo(-8, -7, 6, 0);
      g.quadraticCurveTo(-8, 7, -26, 0);
      g.closePath();
      fillInk(g, C.red, 1.2);
      g.restore();
    };
    oar(cr.helm1.x + 16, cr.helm1.y - 44, -38, 26);
    oar(cr.helm2.x + 16, cr.helm2.y - 46, -14, 30);

    // crew
    drawMan(g, { ...cr.helm1, dir: 1, hands: { f: [3.9, 12.6], b: [3.3, 12.1] } });
    drawMan(g, { ...cr.helm2, dir: 1, hands: { f: [3.9, 12.8], b: [3.3, 12.3] } });
    drawMan(g, { ...cr.owner, dir: 1, kilt: 'long', wig: 'long', collar: true, stride: 0.8, hands: { f: [4.0, 11.6], b: [1.4, 8.6] }, belt: C.yellow });
    // the owner's staff
    g.strokeStyle = C.ink;
    g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(ow.x + 22, ow.y);
    g.lineTo(ow.x + 21, ow.y - 106);
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 1.6;
    g.stroke();
    drawMan(g, { ...cr.sheet1, dir: 1, hands: { f: [5.2, 15.8], b: [4.4, 14.6] }, stride: 1.1 });
    drawMan(g, { ...cr.sheet2, dir: 1, hands: { f: [5.0, 16.0], b: [4.3, 14.8] }, stride: 1.1 });
    // pilot with sounding pole
    g.beginPath();
    g.moveTo(cr.pilot.x + 8, cr.pilot.y - 60);
    g.lineTo(cr.pilot.x + 70, 22);
    g.strokeStyle = C.ink;
    g.lineWidth = 3.6;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 1.8;
    g.stroke();
    drawMan(g, { ...cr.pilot, dir: 1, hands: { f: [4.0, 10.6], b: [2.6, 13.2] }, stride: 0.9 });

    drawHull(g, 480);
  });
}

// -----------------------------------------------------------------------------
// The rowing boat going north with the current (register III), mast lowered.
// Local: stern 0 -> bow 340 (+x), drawn mirrored (heading left).
// -----------------------------------------------------------------------------
const ROW_L = 340;
const ROWERS = [92, 128, 164, 200, 236, 272];
const RSPR_OX = 60;
const RSPR_OY = 140;

function bakeRowboat(kit) {
  return kit.bake('nile_rowboat', 440, 180, (g) => {
    g.translate(RSPR_OX, RSPR_OY);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // steering oar
    g.beginPath();
    g.moveTo(44, -60);
    g.lineTo(-28, 18);
    g.strokeStyle = C.ink;
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 2.2;
    g.stroke();
    g.save();
    g.translate(-28, 18);
    g.rotate(Math.atan2(78, -72));
    g.beginPath();
    g.moveTo(-22, 0);
    g.quadraticCurveTo(-6, -6, 5, 0);
    g.quadraticCurveTo(-6, 6, -22, 0);
    g.closePath();
    fillInk(g, C.red, 1.1);
    g.restore();
    // the lowered pole mast rests on a tall forked crutch aft and a post forward,
    // with the sail furled between yard and boom and lashed to it
    // (kept low: the bundle must stay under the register line / road at y = 712)
    for (const [x, h] of [[46, -100], [324, -70]]) {
      g.beginPath();
      g.moveTo(x, -18);
      g.lineTo(x, h);
      g.strokeStyle = C.ink;
      g.lineWidth = 4.6;
      g.stroke();
      g.strokeStyle = C.wood;
      g.lineWidth = 2.6;
      g.stroke();
      g.beginPath();
      g.moveTo(x - 7, h - 8);
      g.lineTo(x, h);
      g.lineTo(x + 7, h - 8);
      g.strokeStyle = C.ink;
      g.lineWidth = 2.4;
      g.stroke();
    }
    g.beginPath();
    g.moveTo(18, -105);
    g.lineTo(334, -66);
    g.strokeStyle = C.ink;
    g.lineWidth = 7;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 4.4;
    g.stroke();
    g.beginPath();
    const my = (x) => -105 + ((x - 18) / 316) * 39;
    g.beginPath();
    g.moveTo(66, my(66) - 9);
    g.bezierCurveTo(140, my(140) - 14, 230, my(230) - 12, 300, my(300) - 6);
    g.lineTo(302, my(302) + 1);
    g.bezierCurveTo(230, my(230) - 2, 140, my(140) - 3, 66, my(66) - 1);
    g.closePath();
    fillInk(g, C.linen, 1.2);
    g.strokeStyle = C.red;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let x = 80; x < 296; x += 22) {
      g.moveTo(x, my(x) - 12);
      g.lineTo(x + 4, my(x) + 1);
    }
    g.stroke();
    // steersman
    drawMan(g, { x: 30, y: -28, H: 56, dir: 1, hands: { f: [3.9, 11.4], b: [3.2, 10.8] } });
    drawHull(g, ROW_L);
  });
}

// -----------------------------------------------------------------------------
// Decorated-Ware motifs (Naqada II): desert hills, ibex, flamingos. No script.
// -----------------------------------------------------------------------------
function sandLine(g, x0, x1, y) {
  g.beginPath();
  g.moveTo(x0, y - 2);
  for (let x = x0; x <= x1; x += 6) g.lineTo(x, y - 2 - 1.2 * Math.sin(x * 0.21));
  g.lineTo(x1, y + 4);
  g.lineTo(x0, y + 4);
  g.closePath();
  fillInk(g, C.yellowLt, 1.1);
  g.fillStyle = C.red;
  for (let x = x0 + 5; x < x1 - 3; x += 9) g.fillRect(x, y + 0.5, 1.6, 1.6);
}

/** Rounded desert ridge (NOT pointed: pointed triangles would read as pyramids). */
function ridgeTop(x, humps, by) {
  let h = 0;
  for (const hp of humps) {
    const u = (x - hp.x) / (hp.w / 2);
    if (u > -1 && u < 1) h = Math.max(h, hp.h * Math.pow(1 - u * u, 1.35));
  }
  return by - h;
}

function ridgePath(g, x0, x1, humps, by, dy = 0) {
  g.beginPath();
  g.moveTo(x0, by + dy);
  for (let x = x0; x <= x1; x += 2) g.lineTo(x, ridgeTop(x, humps, by) + dy);
  g.lineTo(x1, by + dy);
}

function drawRidge(g, x0, x1, humps, by) {
  ridgePath(g, x0, x1, humps, by);
  g.closePath();
  g.fillStyle = C.yellowLt;
  g.fill();
  g.save();
  g.clip();
  // contour bands following the crest, and red-ochre speckle (rocky desert)
  g.strokeStyle = C.red;
  g.lineWidth = 1.4;
  for (let dy = 7; dy < 60; dy += 7) {
    ridgePath(g, x0, x1, humps, by, dy);
    g.stroke();
  }
  g.restore();
  ridgePath(g, x0, x1, humps, by);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.3;
  g.stroke();
}

/** Nubian ibex in profile, feet on y; dir -1 faces left. */
function drawIbex(g, x, y, s, dir) {
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // far legs (darker), then near legs
  const leg = (pts, col) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = C.ink;
    g.lineWidth = 4.6;
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 2.6;
    g.stroke();
  };
  leg([[-14, -30], [-19, -15], [-15, 0]], C.mud);
  leg([[18, -30], [19, -14], [21, 0]], C.mud);
  // horns: long, ridged, sweeping back
  g.beginPath();
  g.moveTo(30, -60);
  g.bezierCurveTo(28, -84, 10, -96, -2, -84);
  g.strokeStyle = C.ink;
  g.lineWidth = 5.6;
  g.stroke();
  g.strokeStyle = C.mud;
  g.lineWidth = 3.4;
  g.stroke();
  g.strokeStyle = C.ink;
  g.lineWidth = 1;
  g.beginPath();
  for (const t of [0.15, 0.3, 0.45, 0.6, 0.75]) {
    const it = 1 - t;
    const px = it * it * it * 30 + 3 * it * it * t * 28 + 3 * it * t * t * 10 + t * t * t * -2;
    const py = it * it * it * -60 + 3 * it * it * t * -84 + 3 * it * t * t * -96 + t * t * t * -84;
    g.moveTo(px - 2.6, py - 1);
    g.lineTo(px + 2.6, py + 1);
  }
  g.stroke();
  // body, neck and head in one outline
  g.beginPath();
  g.moveTo(-22, -38);
  g.quadraticCurveTo(-4, -46, 14, -42);
  g.lineTo(22, -47);
  g.lineTo(28, -60);
  g.quadraticCurveTo(33, -65, 37, -61);
  g.lineTo(43, -51);
  g.quadraticCurveTo(41, -46, 35, -48);
  g.lineTo(28, -44);
  g.lineTo(23, -32);
  g.quadraticCurveTo(2, -24, -18, -27);
  g.quadraticCurveTo(-27, -30, -22, -38);
  g.closePath();
  fillInk(g, C.wood, 1.4);
  // dark flank stripe and beard
  g.strokeStyle = C.mudDeep;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-16, -29);
  g.quadraticCurveTo(2, -26, 20, -33);
  g.stroke();
  g.beginPath();
  g.moveTo(37, -48);
  g.lineTo(36, -38);
  g.lineTo(33, -46);
  g.closePath();
  fillInk(g, C.mudDeep, 1);
  // near legs over the body
  leg([[-18, -32], [-22, -15], [-19, 0]], C.wood);
  leg([[14, -32], [15, -14], [16, 0]], C.wood);
  // tail, ear, eye
  g.beginPath();
  g.moveTo(-21, -38);
  g.lineTo(-27, -44);
  g.strokeStyle = C.ink;
  g.lineWidth = 2.4;
  g.stroke();
  g.beginPath();
  g.moveTo(29, -58);
  g.lineTo(24, -66);
  g.lineTo(31, -61);
  g.closePath();
  fillInk(g, C.wood, 1);
  g.beginPath();
  g.ellipse(35, -57, 2.4, 1.4, 0.3, 0, TAU);
  g.fillStyle = C.white;
  g.fill();
  g.beginPath();
  g.arc(35.6, -57, 0.9, 0, TAU);
  g.fillStyle = C.ink;
  g.fill();
  g.restore();
}

/** Greater flamingo in profile, feet on y; dir -1 faces left; `feed` = head down. */
function drawFlamingo(g, x, y, s, dir, feed) {
  const pink = '#e8a08a';
  const legCol = '#c9705a';
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // legs (one bent back at the knee)
  const leg = (pts) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = C.ink;
    g.lineWidth = 3.6;
    g.stroke();
    g.strokeStyle = legCol;
    g.lineWidth = 1.8;
    g.stroke();
  };
  leg([[-6, -66], [-9, -34], [-6, 0], [2, 0]]);
  leg([[2, -66], [5, -34], [3, 0], [11, 0]]);
  // neck (S-curve) drawn as a thick pink stroke with an ink edge
  g.beginPath();
  g.moveTo(10, -76);
  if (feed) g.bezierCurveTo(30, -96, 40, -70, 34, -40);
  else g.bezierCurveTo(28, -98, -4, -110, 8, -134);
  g.strokeStyle = C.ink;
  g.lineWidth = 7.4;
  g.stroke();
  g.strokeStyle = pink;
  g.lineWidth = 4.6;
  g.stroke();
  // body with red coverts and black flight feathers
  g.beginPath();
  g.moveTo(16, -78);
  g.quadraticCurveTo(10, -88, -8, -86);
  g.quadraticCurveTo(-24, -84, -30, -72);
  g.quadraticCurveTo(-14, -60, 6, -64);
  g.quadraticCurveTo(16, -68, 16, -78);
  g.closePath();
  fillInk(g, pink, 1.3);
  g.beginPath();
  g.moveTo(10, -78);
  g.quadraticCurveTo(-4, -84, -18, -78);
  g.quadraticCurveTo(-6, -70, 8, -72);
  g.closePath();
  fillInk(g, C.red, 1);
  g.beginPath();
  g.moveTo(-14, -77);
  g.lineTo(-34, -73);
  g.lineTo(-18, -70);
  g.closePath();
  fillInk(g, C.ink, 1);
  // head and the bent, black-tipped bill
  const hx = feed ? 34 : 8;
  const hy = feed ? -40 : -134;
  g.save();
  g.translate(hx, hy);
  if (feed) g.rotate(Math.PI * 0.62);
  g.beginPath();
  g.arc(0, 0, 4.6, 0, TAU);
  fillInk(g, pink, 1.2);
  g.beginPath();
  g.moveTo(3, -3.4);
  g.quadraticCurveTo(10, -3, 13, 2);
  g.lineTo(13.5, 9);
  g.quadraticCurveTo(9, 4, 3, 3);
  g.closePath();
  fillInk(g, C.white, 1.1);
  g.beginPath();
  g.moveTo(10.8, 0.8);
  g.lineTo(13, 2);
  g.lineTo(13.5, 9);
  g.quadraticCurveTo(11.5, 5, 9.8, 3.6);
  g.closePath();
  g.fillStyle = C.ink;
  g.fill();
  g.beginPath();
  g.arc(0.6, -1, 1.1, 0, TAU);
  g.fillStyle = C.ink;
  g.fill();
  g.restore();
  g.restore();
}

// -----------------------------------------------------------------------------
// Static wall: plaster, frieze, borders, sky, sun disk, desert motifs, dado.
// -----------------------------------------------------------------------------
function bakeWall(kit) {
  return kit.bake('nile_wall', P, P, (g, rng) => {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // plaster ground with soft mottling
    g.fillStyle = C.plaster;
    g.fillRect(0, 0, P, P);
    const mot = kit.createCanvas(125, 125);
    const mg = mot.getContext('2d');
    const im = mg.createImageData(125, 125);
    for (let y = 0; y < 125; y++) {
      for (let x = 0; x < 125; x++) {
        const n = kit.fbm2(x * 0.06, y * 0.06, 4, 11);
        const i = (y * 125 + x) * 4;
        const v = n - 0.5;
        if (v > 0) {
          im.data[i] = 250;
          im.data[i + 1] = 238;
          im.data[i + 2] = 205;
          im.data[i + 3] = Math.min(255, v * 230);
        } else {
          im.data[i] = 168;
          im.data[i + 1] = 132;
          im.data[i + 2] = 82;
          im.data[i + 3] = Math.min(255, -v * 200);
        }
      }
    }
    mg.putImageData(im, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(mot, 0, 0, P, P);

    // faint red-ochre guide lines of the draughtsman
    g.strokeStyle = 'rgba(193,73,40,0.18)';
    g.lineWidth = 1;
    g.beginPath();
    for (let y = R2_TOP + 24; y < ROAD; y += 42) {
      g.moveTo(40, y);
      g.lineTo(960, y + 0.5);
    }
    g.stroke();

    // --- kheker frieze (stylised bundles of reeds, tied, with a knob) ---
    const kh = [C.blue, C.red, C.green];
    const yb = Y_KHEKER1;
    for (let i = 0, x = 30; x < 966; i++, x += 13) {
      const cx = x + 6.5;
      const col = kh[i % 3];
      g.beginPath();
      g.moveTo(cx - 5.5, yb);
      g.quadraticCurveTo(cx - 2.2, yb - 4, cx - 2, yb - 11);
      g.lineTo(cx - 2, yb - 13);
      g.bezierCurveTo(cx - 6.2, yb - 15, cx - 6, yb - 22, cx - 1.6, yb - 24.5);
      g.quadraticCurveTo(cx - 3.2, yb - 28.5, cx, yb - 29.5);
      g.quadraticCurveTo(cx + 3.2, yb - 28.5, cx + 1.6, yb - 24.5);
      g.bezierCurveTo(cx + 6, yb - 22, cx + 6.2, yb - 15, cx + 2, yb - 13);
      g.lineTo(cx + 2, yb - 11);
      g.quadraticCurveTo(cx + 2.2, yb - 4, cx + 5.5, yb);
      g.closePath();
      fillInk(g, col, 1);
      g.strokeStyle = C.ink;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - 2.4, yb - 11);
      g.lineTo(cx + 2.4, yb - 11);
      g.moveTo(cx - 2.4, yb - 13);
      g.lineTo(cx + 2.4, yb - 13);
      g.moveTo(cx, yb - 15);
      g.lineTo(cx, yb - 23);
      g.stroke();
      g.fillStyle = C.yellow;
      g.beginPath();
      g.arc(cx, yb - 27.4, 1.4, 0, TAU);
      g.fill();
    }

    // --- block border (top + sides) ---
    const blockCols = [C.blue, C.red, C.green, C.yellow];
    const blockRow = (x0, x1, y, h) => {
      g.fillStyle = C.ink;
      g.fillRect(x0, y - 1, x1 - x0, h + 2);
      for (let i = 0, x = x0; x < x1; i++, x += 15) {
        g.fillStyle = blockCols[i % 4];
        g.fillRect(x + 1, y + 0.5, Math.min(13, x1 - x - 1), h - 1);
        g.fillStyle = C.white;
        g.fillRect(x + 14, y + 0.5, 1, h - 1);
      }
    };
    blockRow(26, 974, Y_KHEKER1 + 1, 8);
    const blockCol = (x, y0, y1, w) => {
      g.fillStyle = C.ink;
      g.fillRect(x - 1, y0, w + 2, y1 - y0);
      for (let i = 0, y = y0; y < y1; i++, y += 15) {
        g.fillStyle = blockCols[(i + 1) % 4];
        g.fillRect(x + 0.5, y + 1, w - 1, Math.min(13, y1 - y - 1));
        g.fillStyle = C.white;
        g.fillRect(x + 0.5, y + 14, w - 1, 1);
      }
    };
    blockCol(28, Y_KHEKER1 + 10, DADO, 8);
    blockCol(964, Y_KHEKER1 + 10, DADO, 8);

    // --- sky sign (pt) with stars, its ends hooked down ---
    g.beginPath();
    g.moveTo(42, Y_SKY0);
    g.lineTo(958, Y_SKY0);
    g.lineTo(958, 150);
    g.quadraticCurveTo(950, 156, 942, 150);
    g.lineTo(942, Y_SKY1);
    g.lineTo(58, Y_SKY1);
    g.lineTo(58, 150);
    g.quadraticCurveTo(50, 156, 42, 150);
    g.closePath();
    fillInk(g, C.blue, 1.4);
    const star = (x, y, r) => {
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * TAU) / 5;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.strokeStyle = C.yellowLt;
      g.lineWidth = 2.2;
      g.stroke();
    };
    for (let x = 80; x < 930; x += 36) star(x, (Y_SKY0 + Y_SKY1) / 2, 7);

    // --- plain sun disk (no wings / uraeus: those are dynastic iconography) ---
    const sx = 500;
    const sy = 126;
    g.beginPath();
    g.arc(sx, sy, 24, 0, TAU);
    fillInk(g, C.red, 1.5);
    g.beginPath();
    g.arc(sx, sy, 24, 0, TAU);
    g.strokeStyle = C.yellow;
    g.lineWidth = 3.2;
    g.stroke();
    g.beginPath();
    g.arc(sx, sy, 25.8, 0, TAU);
    g.strokeStyle = C.ink;
    g.lineWidth = 1.2;
    g.stroke();

    // --- register I, right: no inscription (writing is later than c. 3300-3100 BCE).
    // Decorated-Ware motifs instead: the low desert edge with an ibex, and
    // flamingos wading at the water's edge.
    sandLine(g, 826, 958, 300);
    drawRidge(g, 836, 958, [{ x: 862, w: 64, h: 30 }, { x: 912, w: 86, h: 52 }, { x: 948, w: 50, h: 34 }], 298);
    drawIbex(g, 878, 298, 1.0, -1);
    drawFlamingo(g, 922, 429, 0.8, -1, false);
    drawFlamingo(g, 866, 429, 0.78, -1, true);

    // --- register frames ---
    const rule = (y, cols) => {
      let yy = y;
      for (const [c, h] of cols) {
        g.fillStyle = c;
        g.fillRect(38, yy, 924, h);
        yy += h;
      }
    };
    rule(R1_WATER1, [[C.ink, 2], [C.yellow, 4], [C.ink, 2]]);
    rule(ROAD, [[C.ink, 2.5], [C.red, 7], [C.ink, 2.5]]);
    // the road band must run edge to edge (it joins the neighbouring panels)
    g.fillStyle = C.ink;
    g.fillRect(0, ROAD, P, 2.5);
    g.fillStyle = C.red;
    g.fillRect(0, ROAD + 2.5, P, 7);
    g.fillStyle = C.ink;
    g.fillRect(0, ROAD + 9.5, P, 2.5);

    // water bands (zigzags are animated per frame)
    g.fillStyle = C.water;
    g.fillRect(38, R1_WATER0, 924, R1_WATER1 - R1_WATER0);
    g.fillRect(R3_WATER_X0, R3_WATER0, 962 - R3_WATER_X0, R3_WATER1 - R3_WATER0);
    g.strokeStyle = C.ink;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(38, R1_WATER0);
    g.lineTo(962, R1_WATER0);
    g.moveTo(R3_WATER_X0, R3_WATER0);
    g.lineTo(962, R3_WATER0);
    g.moveTo(R3_WATER_X0, R3_WATER0);
    g.lineTo(R3_WATER_X0, R3_WATER1);
    g.stroke();

    // threshing floor + grain heap (register III, left)
    g.fillStyle = C.ink;
    g.fillRect(38, DADO - 4, R3_WATER_X0 - 38, 4);
    g.beginPath();
    g.moveTo(140, DADO - 4);
    g.bezierCurveTo(150, DADO - 46, 222, DADO - 46, 232, DADO - 4);
    g.closePath();
    fillInk(g, C.grain, 1.3);
    g.fillStyle = 'rgba(28,24,21,0.55)';
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI;
      const r = rng();
      const x = 186 + Math.cos(a) * 40 * r;
      const y = DADO - 6 - Math.sin(a) * 30 * r;
      g.fillRect(x, y, 1.2, 1.2);
    }

    // over the threshing floor: the low desert edge (Decorated-Ware hill row)
    sandLine(g, 150, 334, 754);
    drawRidge(g, 152, 332, [{ x: 172, w: 52, h: 18 }, { x: 214, w: 62, h: 30 }, { x: 258, w: 58, h: 20 }, { x: 300, w: 64, h: 27 }], 752);
    // a flamingo at the near bank of the river going north
    drawFlamingo(g, 394, 818, 0.66, 1, false);

    // --- dado: coloured lines over speckled "granite" ---
    let y = DADO;
    for (const [c, h] of [[C.ink, 3], [C.yellow, 8], [C.ink, 1.5], [C.red, 8], [C.ink, 2]]) {
      g.fillStyle = c;
      g.fillRect(26, y, 948, h);
      y += h;
    }
    g.fillStyle = '#b4604a';
    g.fillRect(26, y, 948, 974 - y);
    for (let i = 0; i < 2600; i++) {
      const x = 26 + rng() * 948;
      const yy = y + rng() * (974 - y);
      const r = rng();
      g.fillStyle = r < 0.45 ? 'rgba(28,24,21,0.8)' : r < 0.75 ? 'rgba(246,239,221,0.75)' : 'rgba(120,60,40,0.8)';
      const s = 0.8 + rng() * 2.2;
      g.fillRect(x, yy, s, s);
    }

    kit.addGrain(g, P, P, rng, 0.03);
  });
}

// Damage overlay (on top of everything, including the moving figures — they are
// painted on the same plaster): grain, stains, hairline cracks, flaked losses.
function bakeDamage(kit) {
  return kit.bake('nile_damage', P, P, (g, rng) => {
    // fine speckle
    const im = g.createImageData(P, P);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = rng();
      if (r < 0.06) {
        d[i] = 90;
        d[i + 1] = 66;
        d[i + 2] = 40;
        d[i + 3] = 34 + rng() * 30;
      } else if (r > 0.95) {
        d[i] = 255;
        d[i + 1] = 248;
        d[i + 2] = 228;
        d[i + 3] = 40 + rng() * 40;
      }
    }
    g.putImageData(im, 0, 0);
    kit.addBlotches(g, P, P, rng, 'rgba(140,100,50,0.07)', 26, 50, 190);
    kit.addBlotches(g, P, P, rng, 'rgba(255,246,222,0.08)', 18, 40, 140);

    // hairline cracks (random walks with occasional branches)
    const crack = (x, y, a, len, w) => {
      const pts = [[x, y]];
      for (let i = 0; i < len; i++) {
        a += (rng() - 0.5) * 0.7;
        x += Math.cos(a) * 6;
        y += Math.sin(a) * 6;
        pts.push([x, y]);
        if (rng() < 0.04 && len > 12) crack(x, y, a + (rng() < 0.5 ? 0.9 : -0.9), Math.floor(len * 0.35), w * 0.7);
      }
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0] + 0.9, p[1] + 0.9) : g.moveTo(p[0] + 0.9, p[1] + 0.9)));
      g.strokeStyle = 'rgba(255,247,226,0.45)';
      g.lineWidth = w;
      g.stroke();
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.strokeStyle = 'rgba(58,38,20,0.6)';
      g.lineWidth = w;
      g.stroke();
    };
    crack(30, 300, 0.25, 70, 1.3);
    crack(610, 27, 1.35, 40, 1.2);
    crack(972, 520, 2.8, 60, 1.2);
    crack(420, 974, -1.4, 34, 1.2);
    crack(30, 780, -0.15, 50, 1.1);
    crack(760, 974, -1.9, 26, 1.0);
    crack(250, 27, 1.6, 22, 1.0);

    // flaked losses: the paint layer is gone, showing the coarse mud plaster
    const loss = (x, y, r, n) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const rr = r * (0.55 + rng() * 0.6);
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]);
      }
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      g.fillStyle = '#b09166';
      g.fill();
      g.save();
      g.clip();
      for (let i = 0; i < r * r * 0.25; i++) {
        g.fillStyle = rng() < 0.5 ? 'rgba(90,64,36,0.5)' : 'rgba(214,190,146,0.6)';
        g.fillRect(x - r + rng() * r * 2, y - r + rng() * r * 2, 1.5, 1.5);
      }
      g.restore();
      g.strokeStyle = 'rgba(250,240,214,0.85)';
      g.lineWidth = 1.6;
      g.stroke();
      g.strokeStyle = 'rgba(70,48,26,0.5)';
      g.lineWidth = 0.8;
      g.stroke();
    };
    loss(940, 40, 34, 13);
    loss(70, 960, 40, 14);
    loss(880, 950, 22, 11);
    loss(36, 120, 20, 10);
    loss(610, 455, 9, 8);
    loss(300, 960, 14, 9);
    loss(960, 610, 14, 9);
    for (let i = 0; i < 30; i++) {
      const x = 30 + rng() * 940;
      const y = 30 + rng() * 940;
      if (y > 460 && y < 700 && x > 120 && x < 900) continue; // keep the rider's lane readable
      loss(x, y, 2 + rng() * 4, 6);
    }
  });
}

// -----------------------------------------------------------------------------
// Animated pieces
// -----------------------------------------------------------------------------
function drawZigzags(g, x0, x1, y0, y1, rows, T, speed, amp = 3.6, per = 16) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, x1 - x0, y1 - y0);
  g.clip();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.5;
  g.lineJoin = 'miter';
  g.beginPath();
  const h = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    const yc = y0 + h * (r + 0.5);
    const off = (((T * speed + r * per * 0.5) % per) + per) % per;
    let up = true;
    for (let x = x0 - per + off, i = 0; x <= x1 + per; x += per / 2, i++) {
      const y = yc + (up ? -amp : amp);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
      up = !up;
    }
  }
  g.stroke();
  g.restore();
}

/** Three ibis feathers popped loose on the hop (T = raw local time, 5.0 .. 9.6). */
function drawLooseFeathers(g, T) {
  for (let i = 0; i < 3; i++) {
    const t = T - 5.04 - i * 0.07;
    if (t <= 0) continue;
    const fall = Math.min(t, 3.4);
    const x = 168 + i * 12 + fall * (30 + 9 * i) + 9 * Math.sin(t * 2.6 + i * 2);
    let y = 590 - i * 10 - 62 * (1 - Math.exp(-t * 6)) + 36 * fall;
    y = Math.min(y, ROAD - 4);
    const landed = y >= ROAD - 4;
    const a = landed ? 0.1 + i * 0.2 : Math.sin(t * 3.4 + i * 1.7) * 0.9 + 0.4;
    const fade = 1 - sstep(8.8, 9.6, T);
    if (fade <= 0) continue;
    g.save();
    g.globalAlpha = fade;
    g.translate(x, y);
    g.rotate(a);
    g.scale(1.3, 1.3);
    g.beginPath();
    g.moveTo(-8, 0);
    g.quadraticCurveTo(-1, -4.2, 8, -0.6);
    g.quadraticCurveTo(0, 3.6, -8, 0);
    g.closePath();
    fillInk(g, C.white, 1);
    g.beginPath();
    g.moveTo(3, -2.4);
    g.quadraticCurveTo(6, -1.6, 8, -0.6);
    g.quadraticCurveTo(5.5, 1.4, 3, 1.8);
    g.closePath();
    g.fillStyle = C.ink;
    g.fill();
    g.strokeStyle = C.ink;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(-9.5, 0.3);
    g.lineTo(6, -0.6);
    g.stroke();
    g.restore();
  }
}

function drawLotus(g, x, y, h, a, open) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(Math.sin(a) * h * 0.2, -h * 0.5, Math.sin(a) * h, -h);
  g.strokeStyle = C.ink;
  g.lineWidth = 3;
  g.stroke();
  g.strokeStyle = C.green;
  g.lineWidth = 1.6;
  g.stroke();
  g.translate(Math.sin(a) * h, -h);
  g.rotate(a);
  if (open) {
    // blue lotus in profile: green sepals, fan of pointed blue petals
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(-2, 0);
      g.lineTo(k * 5.5 - 2.5, -20 + Math.abs(k) * 3);
      g.lineTo(k * 5.5 + 2.5, -19 + Math.abs(k) * 3);
      g.lineTo(2, 0);
      g.closePath();
      fillInk(g, C.blue, 1);
    }
    g.beginPath();
    g.moveTo(-5, 0);
    g.lineTo(-10, -12);
    g.lineTo(-2, -4);
    g.lineTo(2, -4);
    g.lineTo(10, -12);
    g.lineTo(5, 0);
    g.closePath();
    fillInk(g, C.green, 1);
  } else {
    g.beginPath();
    g.moveTo(-4, 0);
    g.quadraticCurveTo(-5, -10, 0, -16);
    g.quadraticCurveTo(5, -10, 4, 0);
    g.closePath();
    fillInk(g, C.green, 1);
    g.beginPath();
    g.moveTo(-1.5, -6);
    g.quadraticCurveTo(0, -12, 0, -15);
    g.strokeStyle = C.blue;
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
}

/** Winnowing: two men toss grain with wooden scoops; the wind carries the chaff. */
function drawWinnowers(g, T, gust, kit) {
  const men = [
    { x: 118, dir: 1, phase: 0 },
    { x: 262, dir: -1, phase: 0.5 },
  ];
  const ground = DADO - 4;
  for (const m of men) {
    const ph = (((T - m.phase) % 1) + 1) % 1; // one toss per second
    const up = ph < 0.22 ? sstep(0, 0.22, ph) : ph < 0.45 ? 1 : 1 - sstep(0.45, 0.95, ph);
    // hands: low over the heap -> high above the head
    const hf = [lerp(6.0, 3.0, up), lerp(9.5, 21.5, up)];
    const hb = [lerp(5.2, 2.2, up), lerp(9.0, 20.8, up)];
    const res = drawMan(g, { x: m.x, y: ground, H: 104, dir: m.dir, hands: { f: hf, b: hb }, stride: 0.8, lean: lerp(0.28, -0.05, up) });
    // wooden scoops, one in each hand
    for (const h of [res.b, res.f]) {
      g.save();
      g.translate(h.x, h.y);
      g.scale(m.dir, 1);
      g.rotate(lerp(0.5, -0.3, up));
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(9, -5);
      g.strokeStyle = C.ink;
      g.lineWidth = 3;
      g.stroke();
      g.beginPath();
      g.moveTo(6, -4);
      g.quadraticCurveTo(14, -14, 22, -8);
      g.quadraticCurveTo(18, 0, 6, -4);
      g.closePath();
      fillInk(g, C.wood, 1.1);
      g.restore();
    }
    // grain falling back onto the heap, chaff blown downwind (to the right)
    for (let back = 0; back < 2; back++) {
      const tk = Math.floor(T - m.phase) - back + m.phase + 0.22;
      const dt = T - tk;
      if (dt < 0 || dt > 1.8) continue;
      const sx = lerp(m.x + m.dir * 24, 186, 0.45);
      const sy = ground - 104 * 1.12;
      const seed = Math.floor(tk * 7 + m.x);
      for (let i = 0; i < 14; i++) {
        const j = kit.hash11(seed * 13.1 + i);
        const yy = sy + 260 * dt * dt + j * 6;
        if (yy > ground - 34 - Math.abs((sx - 186) * 0.2)) continue;
        g.fillStyle = C.grain;
        g.fillRect(sx + (j - 0.5) * 18, yy, 2.2, 2.6);
      }
      for (let i = 0; i < 26; i++) {
        const j = kit.hash11(seed * 7.7 + i * 3.1);
        const j2 = kit.hash11(seed * 3.3 + i * 5.7);
        const vx = 45 + 110 * gust + j * 50;
        const x = sx + vx * dt + (j2 - 0.5) * 14;
        const y = sy + (j - 0.4) * 18 + 22 * dt + Math.sin(dt * 5 + i) * 4;
        const a = clamp(1 - dt / 1.8, 0, 1) * 0.95;
        if (x > R3_WATER_X0 - 6) continue;
        g.fillStyle = `rgba(243,227,176,${a})`;
        g.fillRect(x, y, 3.2, 2);
        g.fillStyle = `rgba(28,24,21,${a * 0.7})`;
        g.fillRect(x, y + 2, 3.2, 0.8);
      }
    }
  }
}

function drawRowers(g, T, kit) {
  // stroke rate: one stroke per second (two beats), drive on the beat
  for (let i = 0; i < ROWERS.length; i++) {
    const xr = ROWERS[i];
    const ph = (((T + 0.04 * i) % 1) + 1) % 1;
    // hx: -12 (catch, hands reaching aft) -> +8 (finish, at the chest)
    const drive = ph < 0.45;
    const k = drive ? sstep(0, 0.45, ph) : 1 - sstep(0.45, 1, ph);
    const hx = lerp(-13, 7, k);
    const hy = drive ? -17 : -9;
    const pv = { x: xr - 12, y: -22 };
    const hand = { x: pv.x + hx, y: pv.y + hy };
    const blade = { x: pv.x - hx * 2.5, y: pv.y - hy * 2.6 };
    // oar
    g.beginPath();
    g.moveTo(hand.x, hand.y);
    g.lineTo(blade.x, blade.y);
    g.strokeStyle = C.ink;
    g.lineWidth = 3.4;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 1.8;
    g.stroke();
    g.save();
    g.translate(blade.x, blade.y);
    g.rotate(Math.atan2(blade.y - hand.y, blade.x - hand.x));
    g.beginPath();
    g.moveTo(-12, 0);
    g.quadraticCurveTo(-2, -4, 5, 0);
    g.quadraticCurveTo(-2, 4, -12, 0);
    g.closePath();
    fillInk(g, C.red, 1);
    g.restore();
    // the rower faces the stern (local -x)
    const H = 56;
    const u = H / 19.5;
    const lean = lerp(0.42, -0.22, k);
    const hu = [(xr - hand.x) / u, (-24 - hand.y) / u];
    drawMan(g, { x: xr, y: -24, H, dir: -1, seated: true, lean, hands: { f: hu, b: [hu[0] - 0.3, hu[1] - 0.3] } });
  }
}

// -----------------------------------------------------------------------------
// The rider, painted in the Egyptian manner
// -----------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: '#f6f0de',
  plumageShade: '#e9dfc4',
  mask: C.ink,
  bill: C.ink,
  eyeRing: C.yellow,
  legs: C.ink,
  crest: C.yellow,
  breast: C.yellow,
  frame: C.red,
  frameShade: C.redDeep,
  metal: C.ink,
  tire: C.ink,
  rim: C.yellow,
  saddle: C.green,
  outline: C.ink,
  outlineWidth: 1.6,
  shading: false,
  spokes: 6,
  showPinwheel: false,
};

function drawRider(kit, g, params, gust) {
  const rig = kit.riderRig(params);
  const b = 0.12 + 0.88 * gust;
  const h = rig.pinHub;
  // the rider's own little Nile sail: pole as mast, yard + boom, lifts from the masthead
  const mastTop = { x: h.x - 1.5, y: h.y - 29 };
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(rig.poleBase.x, rig.poleBase.y);
  g.lineTo(mastTop.x, mastTop.y);
  g.strokeStyle = C.ink;
  g.lineWidth = 4.8;
  g.stroke();
  g.strokeStyle = C.wood;
  g.lineWidth = 2.6;
  g.stroke();
  const s = sailGeom(h.x - 17, h.x + 17, h.y - 22, h.y + 28, b);
  s.bulR *= 0.6;
  s.bulL *= 0.6;
  s.bl.x -= 11 * b * 0.45;
  s.br.x -= 11 * b * 0.45;
  drawSail(g, s, b, 0.6, 5);
  const sparR = (x0, y0, x1, y1) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = C.ink;
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = C.wood;
    g.lineWidth = 2;
    g.stroke();
  };
  sparR(s.tl.x - 5, s.tl.y, s.tr.x + 5, s.tr.y);
  sparR(s.bl.x - 5, s.bl.y, s.br.x + 5, s.br.y);
  g.strokeStyle = 'rgba(28,24,21,0.8)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (const f of [0, 0.5, 1]) {
    g.moveTo(mastTop.x, mastTop.y);
    g.lineTo(lerp(s.bl.x - 5, s.br.x + 5, f), s.bl.y);
  }
  g.stroke();
  g.beginPath();
  g.rect(mastTop.x - 2.5, mastTop.y - 4, 5, 5);
  fillInk(g, C.red, 0.9);
  g.restore();

  // black outline pass, then the flat colour pass
  kit.drawRider(g, rig, { ...RIDER_STYLE, silhouette: C.ink, lineScale: 1.6 });
  kit.drawRider(g, rig, RIDER_STYLE);

  // painted feather pattern on the folded wing (rows of scale-like coverts)
  const sh = rig.wingShoulder;
  const tt = rig.tailTip;
  g.save();
  g.strokeStyle = 'rgba(28,24,21,0.55)';
  g.lineWidth = 0.9;
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 4 - r; k++) {
      const f = 0.18 + k * 0.17 + r * 0.06;
      const x = lerp(sh.x - 6, tt.x + 4, f);
      const y = lerp(sh.y + 2, tt.y + 4, f) + r * 4.2;
      g.beginPath();
      g.arc(x, y, 3.2, 0.15 * Math.PI, 0.95 * Math.PI);
      g.stroke();
    }
  }
  g.strokeStyle = C.yellow;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(sh.x - 8, sh.y - 1);
  g.quadraticCurveTo(lerp(sh.x, tt.x, 0.5), sh.y - 7, tt.x + 6, tt.y + 1);
  g.stroke();
  g.restore();

  // Egyptian frontal eye on the profile head
  const e = rig.eye;
  const a = rig.head.angle;
  g.save();
  g.translate(e.x + 0.5, e.y);
  g.rotate(a);
  g.beginPath();
  g.moveTo(-4.6, 0.2);
  g.quadraticCurveTo(0, -3.6, 4.4, 0);
  g.quadraticCurveTo(0, 2.8, -4.6, 0.2);
  g.closePath();
  g.fillStyle = C.white;
  g.fill();
  g.strokeStyle = C.yellow;
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.moveTo(-4.6, 0.2);
  g.lineTo(-10, 1.2);
  g.stroke();
  g.beginPath();
  g.arc(0.8, -0.2, 1.8, 0, TAU);
  g.fillStyle = C.ink;
  g.fill();
  g.restore();
}

// -----------------------------------------------------------------------------
// Module state (lazily built with the kit's deterministic PRNG)
// -----------------------------------------------------------------------------
let CLUMPS = null;
function initClumps(kit) {
  if (CLUMPS) return CLUMPS;
  const rng = kit.makePRNG(kit.hashSeed('nile_papyrus'));
  CLUMPS = {
    r1: makeClump(rng, 15, 120, 175, 1.25, 18),
    ibis: makeClump(rng, 13, 120, 185, 1.15, 18),
    right: makeClump(rng, 11, 110, 170, 1.0, 17),
    r3: makeClump(rng, 9, 70, 108, 0.9, 13),
    r3b: makeClump(rng, 7, 60, 92, 0.8, 12),
  };
  return CLUMPS;
}

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 3.3 : params.rawLocalT;
  const gust = thumb ? 0.6 : gustAt(T);
  const bill = 0.12 + 0.88 * gust;
  const clumps = initClumps(kit);

  const wall = bakeWall(kit);
  const boatSpr = bakeBoat(kit);
  const rowSpr = bakeRowboat(kit);
  const damage = bakeDamage(kit);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.drawImage(wall, 0, 0);

  // ===== Register I: the river going south =====
  // the Nile flows north (left) — the boat sails south against it
  drawZigzags(ctx, 38, 962, R1_WATER0 + 2, R1_WATER1, 2, T, -6, 3.2, 15);
  // fish under the keel
  for (let i = 0; i < 4; i++) {
    const fx = ((((100 + i * 247 - T * (10 + i * 3)) % 940) + 940) % 940) + 30;
    drawFish(ctx, fx, R1_WATER0 + 13 + (i % 2) * 2, 0.62, -1, Math.sin(T * 8 + i) * 1.5, i % 2 ? '#7aa5a0' : '#6f9fa8');
  }
  // papyrus thicket with wildfowl (left)
  drawPapyrus(ctx, 104, R1_WATER0 + 10, clumps.r1, gust, T, 1);
  const ducks = [
    { x: 96, y: 236, s: 1.0, ph: 0 },
    { x: 178, y: 190, s: 0.9, ph: 1.7 },
    { x: 80, y: 168, s: 0.82, ph: 3.1 },
  ];
  for (const d of ducks) {
    drawDuck(ctx, d.x + Math.sin(T * 0.9 + d.ph) * 6 + gust * 5, d.y + Math.sin(T * 1.7 + d.ph) * 4, d.s, T * 5 + d.ph, 1);
  }

  // the sailing boat
  const bx = 236 + T * 4; // slow drift upstream; stays clear of the ibex up to T = 16
  const by = R1_WL + Math.sin(T * 2.1) * 1.2;
  ctx.drawImage(boatSpr, bx - SPR_OX, by - SPR_OY);
  const mt = BOAT.mast;
  const mastX = bx + mt.x;
  const mastTopY = by + mt.top;
  const sg = sailGeom(bx + BOAT.yard.x0, bx + BOAT.yard.x1, by + BOAT.yard.y + 2, by + BOAT.boomY, bill);
  drawSail(ctx, sg, bill, 1, 6);
  // the pole mast reads through the sail (Egyptian convention), then yard + boom
  ctx.beginPath();
  ctx.moveTo(mastX, by + BOAT.boomY + 14);
  ctx.lineTo(mastX, mastTopY + 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6.4;
  ctx.stroke();
  ctx.strokeStyle = C.wood;
  ctx.lineWidth = 3.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mastX - 5, mastTopY - 8, 10, 9);
  fillInk(ctx, C.red, 1.2);
  const spar = (x0, y0, x1, y1) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = C.wood;
    ctx.lineWidth = 3.4;
    ctx.stroke();
  };
  spar(sg.tl.x - 8, sg.tl.y, sg.tr.x + 8, sg.tr.y);
  spar(sg.bl.x - 7, sg.bl.y, sg.br.x + 7, sg.br.y);
  // minimal rigging only: one sheet from the after end of the boom to the two hands
  // who tend it (the earliest images show little or no rigging)
  const cr = BOAT.crew;
  const u70 = 70 / 19.5;
  const hand = (m, hx, hy) => ({ x: bx + m.x + hx * u70, y: by + m.y - hy * u70 });
  const s1 = hand(cr.sheet1, 5.2, 15.8);
  const s2 = hand(cr.sheet2, 5.0, 16.0);
  ctx.strokeStyle = 'rgba(28,24,21,0.85)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(sg.bl.x - 6, sg.bl.y + 1);
  ctx.quadraticCurveTo((sg.bl.x + s2.x) / 2 - 2, (sg.bl.y + s2.y) / 2 + 5 * (1 - bill), s2.x, s2.y);
  ctx.quadraticCurveTo((s2.x + s1.x) / 2, (s2.y + s1.y) / 2 + 3, s1.x, s1.y);
  ctx.stroke();
  // the hand at the mast hauls on the halyard, on the beat
  const haul = Math.pow(Math.abs(Math.sin(T * Math.PI)), 0.7);
  const mh = cr.mast;
  const mres = drawMan(ctx, {
    x: bx + mh.x,
    y: by + mh.y,
    H: mh.H,
    dir: 1,
    stride: 0.9,
    lean: 0.1 - 0.12 * haul,
    hands: { f: [3.6, lerp(17.8, 14.2, haul)], b: [3.0, lerp(16.4, 13.0, haul)] },
  });
  ctx.strokeStyle = 'rgba(28,24,21,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mastX - 3, mastTopY + 2);
  ctx.lineTo(mres.f.x, mres.f.y);
  ctx.lineTo(mres.b.x, mres.b.y + 10);
  ctx.stroke();

  // ===== Register II: the rider's bank =====
  drawPapyrus(ctx, 150, ROAD, clumps.ibis, gust, T, 1);
  drawPapyrus(ctx, 912, ROAD, clumps.right, gust, T, 1);
  // little sedge tufts on the ground line
  for (const x of [330, 520, 690]) {
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * 3, ROAD);
      ctx.quadraticCurveTo(x + k * 5, ROAD - 10, x + k * 8 + gust * 3, ROAD - 18 + Math.abs(k) * 3);
      ctx.strokeStyle = C.greenDeep;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }
  // swallows skimming downwind; butterflies over the reeds (kept inside the border)
  ctx.save();
  ctx.beginPath();
  ctx.rect(38, R2_TOP, 924, ROAD - R2_TOP);
  ctx.clip();
  for (let i = 0; i < 2; i++) {
    const span = 1100;
    const sx = ((((T * (95 + 30 * gust) + i * 520) % span) + span) % span) - 50;
    const sy = 498 + i * 34 + Math.sin(T * 2.3 + i * 2) * 10;
    drawSwallow(ctx, sx, sy, 0.9, T * 11 + i);
  }
  drawButterfly(ctx, 330 + Math.sin(T * 0.8) * 22, 590 + Math.sin(T * 2.1) * 12, 0.9, T * 9);
  drawButterfly(ctx, 862 + Math.sin(T * 0.7 + 2) * 14, 520 + Math.sin(T * 1.8 + 1) * 8, 0.8, T * 10 + 1);
  ctx.restore();
  drawIbis(ctx, 160, ROAD, ibisPose(T, thumb));
  // the double take shakes a few black-tipped feathers loose; they drift downwind
  if (!thumb && T > 5.0 && T < 9.6) drawLooseFeathers(ctx, T);

  // ===== Register III: threshing floor and the river going north =====
  drawWinnowers(ctx, T, gust, kit);
  drawZigzags(ctx, R3_WATER_X0, 962, R3_WATER0 + 3, R3_WATER1, 4, T, -7, 3.4, 16);
  for (let i = 0; i < 6; i++) {
    const span = 962 - R3_WATER_X0 - 40;
    const fx = R3_WATER_X0 + 20 + ((((i * 131 + T * (9 + (i % 3) * 4)) % span) + span) % span);
    const fy = R3_WATER0 + 30 + (i % 3) * 18;
    drawFish(ctx, fx, fy, 0.9 + (i % 2) * 0.2, 1, Math.sin(T * 7 + i * 2) * 2, i % 3 === 1 ? '#8aa77d' : '#6f9fa8');
  }
  // lotus at the far bank
  const lot = [[862, 54, -0.25, true], [884, 70, 0.05, false], [904, 60, 0.2, true], [930, 46, 0.32, false], [946, 66, 0.12, true]];
  for (const [x, h, a, o] of lot) drawLotus(ctx, x, R3_WATER0 + 4, h, a + gust * 0.12, o);
  // the rowing boat drifting north
  const rs = 836 - T * 3; // stern x (heading left)
  const ry = R3_WATER0 + 4 + Math.sin(T * 2.4 + 1) * 0.8;
  ctx.save();
  ctx.translate(rs, ry);
  ctx.scale(-1, 1);
  ctx.drawImage(rowSpr, -RSPR_OX, -RSPR_OY);
  drawRowers(ctx, T, kit);
  ctx.restore();
  drawPapyrus(ctx, 330, DADO - 2, clumps.r3, gust, T, 0.95);

  // ===== The rider =====
  if (kit.riderVisible(params)) drawRider(kit, ctx, params, gust);

  // plaster damage over everything
  ctx.drawImage(damage, 0, 0);
  ctx.restore();
}
