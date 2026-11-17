// src/scenes/ballpoint.js
// Chapter "ballpoint" · 1938 · 原子筆 — The Ballpoint Pen.
//
// Medium: a mid-century modernist poster printed offset in four flat inks on off-white
// stock (paper, signal red, navy, mustard, charcoal): big geometric shapes, a grotesque
// headline, halftone dots, slight misregistration between the inks, paper grain.
//
// Scene: a giant cutaway ballpoint pen (hexagonal barrel with a window onto the ink tube)
// writes a looping cursive line across a tilted sheet of paper — the tip follows the end of
// the line, the line grows with the music. A magnifier inset in the navy ground shows the
// ball turning in its socket and carrying the ink film onto the paper.
//
// Story beat (bar 3): a propeller aircraft crosses high up, its contrail looping like the
// pen's handwriting (the pen was taken up by aircrews because it does not flood at
// altitude); on bar 4 the line ends in an underline flourish.

const S = 1000;
const ROAD = 700;
const PAPER = '#f2ebdc';
const RED = '#c8102e';
const NAVY = '#1d3557';
const MUSTARD = '#f1c40f';
const CHAR = '#2a2a2a';
const WHITE = '#fbf8f0';
const NAVY_T = '#8e99aa';
const TAU = Math.PI * 2;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// sheet of paper the pen writes on (rotated rectangle)
const SHEET = { x: 470, y: 372, w: 452, h: 260, rot: -0.07 };
const LINES = [74, 164]; // baselines in sheet space
const LOOP_R = 16;
const LOOP_V = 10.5; // forward advance per radian (< R gives loops)
const S_LINE = (SHEET.w - 70) / LOOP_V; // parameter length of one line

/** Cursive trochoid point in sheet space for parameter s on line `li`. */
function cursive(s, li) {
  // loops at the top (where the stroke runs backwards), rounded arches at the baseline
  const x = 34 + LOOP_V * s - LOOP_R * Math.sin(s);
  const y = LINES[li] - LOOP_R * (1 + Math.cos(s)) * (0.8 + 0.3 * Math.sin(s * 0.31 + li * 2));
  return { x, y };
}

function sheetToPanel(p) {
  const c = Math.cos(SHEET.rot);
  const s = Math.sin(SHEET.rot);
  return { x: SHEET.x + p.x * c - p.y * s, y: SHEET.y + p.x * s + p.y * c };
}

// -----------------------------------------------------------------------------
// baked poster background
// -----------------------------------------------------------------------------
function paintPoster(kit, g, rng) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S, S);
  // mustard sun with misregistered red ring
  g.fillStyle = MUSTARD;
  g.beginPath();
  g.arc(300, 330, 200, 0, TAU);
  g.fill();
  g.strokeStyle = RED;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(304, 327, 226, Math.PI * 0.9, Math.PI * 1.9);
  g.stroke();
  // red slab behind the sheet
  g.fillStyle = RED;
  g.save();
  g.translate(700, 520);
  g.rotate(-0.07);
  g.fillRect(-250, -170, 520, 300);
  g.restore();
  // navy ground with a mustard kerb line
  g.fillStyle = NAVY;
  g.fillRect(0, ROAD, S, S - ROAD);
  g.fillStyle = MUSTARD;
  g.fillRect(0, ROAD, S, 7);
  // road dashes
  g.fillStyle = 'rgba(242, 235, 220, 0.55)';
  for (let x = 20; x < S; x += 90) g.fillRect(x, ROAD + 40, 46, 6);

  // headline
  g.fillStyle = NAVY;
  g.font = `400 168px ${kit.FONT.poster}`;
  g.textBaseline = 'alphabetic';
  g.fillText('1938', 70, 236);
  g.fillStyle = RED;
  g.font = `900 70px ${kit.FONT.sans}`;
  g.fillText('原子筆', 76, 322);
  g.fillStyle = CHAR;
  g.font = `400 34px ${kit.FONT.poster}`;
  const tag = 'BALL · INK · PAPER';
  let x = 78;
  for (const ch of tag) {
    g.fillText(ch, x, 370);
    x += g.measureText(ch).width + 5;
  }
  g.fillRect(78, 384, 268, 4);

  // the sheet of paper (white, ruled), with a navy offset shadow
  g.save();
  g.translate(SHEET.x, SHEET.y);
  g.rotate(SHEET.rot);
  g.fillStyle = NAVY;
  g.fillRect(12, 14, SHEET.w, SHEET.h);
  g.fillStyle = WHITE;
  g.fillRect(0, 0, SHEET.w, SHEET.h);
  g.strokeStyle = NAVY_T;
  g.lineWidth = 1.5;
  for (const b of [...LINES, 236]) {
    g.beginPath();
    g.moveTo(16, b + 2);
    g.lineTo(SHEET.w - 16, b + 2);
    g.stroke();
  }
  g.strokeStyle = RED;
  g.beginPath();
  g.moveTo(26, 0);
  g.lineTo(26, SHEET.h);
  g.stroke();
  g.restore();

  // magnifier inset frame (in the navy ground)
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(822, 852, 118, 0, TAU);
  g.fill();
  g.strokeStyle = MUSTARD;
  g.lineWidth = 10;
  g.stroke();
  g.fillStyle = PAPER;
  g.font = `400 30px ${kit.FONT.poster}`;
  g.textAlign = 'right';
  g.fillText('× 40', 690, 846);
  g.textAlign = 'left';

  // halftone dots over the mustard sun and the navy ground (ink texture)
  for (let yy = 0; yy < S; yy += 7) {
    for (let xx = (yy / 7) % 2 ? 3.5 : 0; xx < S; xx += 7) {
      const inSun = (xx - 300) ** 2 + (yy - 330) ** 2 < 200 * 200;
      const inGround = yy > ROAD + 8;
      if (!inSun && !inGround) continue;
      const n = kit.fbm2(xx * 0.01, yy * 0.01, 2, 3);
      const r = inSun ? 1.1 + n * 1.3 : 0.6 + n * 1.0;
      g.fillStyle = inSun ? 'rgba(200, 120, 0, 0.35)' : 'rgba(255, 255, 255, 0.07)';
      g.beginPath();
      g.arc(xx, yy, r, 0, TAU);
      g.fill();
    }
  }
}

function paintGrain(kit, g, rng) {
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(60, 50, 30, 0.06)' : 'rgba(255, 255, 255, 0.07)';
    g.fillRect(rng() * S, rng() * S, 1.5, 1.5);
  }
  kit.vignette(g, S, S, 0.1, '60,40,20');
}

// -----------------------------------------------------------------------------
// animated pieces
// -----------------------------------------------------------------------------
function drawWriting(ctx, prog, flourish) {
  // prog in [0, 2]: line 0 then line 1
  ctx.save();
  ctx.translate(SHEET.x, SHEET.y);
  ctx.rotate(SHEET.rot);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let tip = cursive(0, 0);
  for (let li = 0; li < 2; li++) {
    const u = clamp01(prog - li);
    if (u <= 0) break;
    const sEnd = u * S_LINE;
    ctx.beginPath();
    for (let s = 0; s <= sEnd; s += 0.18) {
      const q = cursive(s, li);
      if (s === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    tip = cursive(sEnd, li);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  if (flourish > 0) {
    // underline swash under line 2
    ctx.beginPath();
    const n = Math.floor(40 * flourish);
    for (let i = 0; i <= n; i++) {
      const u = i / 40;
      const x = SHEET.w - 60 - u * (SHEET.w - 110);
      const y = 196 + Math.sin(u * Math.PI) * 14 - u * 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const u = n / 40;
    tip = { x: SHEET.w - 60 - u * (SHEET.w - 110), y: 196 + Math.sin(u * Math.PI) * 14 - u * 6 };
  }
  ctx.restore();
  return sheetToPanel(tip);
}

/** Giant cutaway ballpoint: tip at (tx, ty), barrel leaning up-right. */
function drawPen(ctx, tx, ty, T) {
  const ang = -1.02; // barrel direction (up-right)
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(ang);
  // along +x = up the barrel
  // shadow (offset print)
  ctx.fillStyle = 'rgba(29, 53, 87, 0.35)';
  ctx.fillRect(84, -12, 700, 46);
  // tip cone (brass) and the ball
  ctx.fillStyle = '#c9a43a';
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(86, -21);
  ctx.lineTo(86, 21);
  ctx.lineTo(4, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8cc6a';
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(86, -21);
  ctx.lineTo(86, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CHAR;
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, TAU);
  ctx.fill();
  // grip section
  ctx.fillStyle = CHAR;
  ctx.fillRect(86, -23, 64, 46);
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = k % 2 ? '#3d3d3d' : '#1f1f1f';
    ctx.fillRect(92 + k * 9, -23, 5, 46);
  }
  // red hexagonal barrel: three facets
  ctx.fillStyle = RED;
  ctx.fillRect(150, -25, 640, 50);
  ctx.fillStyle = '#e0364f';
  ctx.fillRect(150, -25, 640, 14);
  ctx.fillStyle = '#9c0c24';
  ctx.fillRect(150, 13, 640, 12);
  // cutaway window: the ink tube with the ink level dropping as it writes
  ctx.fillStyle = WHITE;
  ctx.fillRect(210, -12, 380, 24);
  ctx.fillStyle = '#d9dee6';
  ctx.fillRect(214, -6, 372, 12);
  const level = 560 - 20 * ss(0, 8, T);
  ctx.fillStyle = NAVY;
  ctx.fillRect(214, -6, level - 214, 12);
  ctx.strokeStyle = CHAR;
  ctx.lineWidth = 2;
  ctx.strokeRect(210, -12, 380, 24);
  // label on the barrel
  ctx.fillStyle = WHITE;
  ctx.font = `400 22px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText('INK', 600, 8);
  // misregistered outline (charcoal plate slightly off)
  ctx.strokeStyle = CHAR;
  ctx.lineWidth = 2;
  ctx.strokeRect(152, -23, 640, 50);
  ctx.restore();
}

function drawInset(ctx, spin, inking) {
  const cx = 822;
  const cy = 852;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, TAU);
  ctx.clip();
  // paper surface at the bottom of the inset, ink film laid down moving left
  ctx.fillStyle = WHITE;
  ctx.fillRect(cx - 120, cy + 56, 240, 70);
  ctx.fillStyle = NAVY;
  ctx.fillRect(cx - 120, cy + 56, 120, 6 * inking);
  // socket (brass) around the ball
  ctx.fillStyle = '#c9a43a';
  ctx.beginPath();
  ctx.moveTo(cx - 92, cy - 120);
  ctx.lineTo(cx - 70, cy + 8);
  ctx.quadraticCurveTo(cx, cy + 40, cx + 70, cy + 8);
  ctx.lineTo(cx + 92, cy - 120);
  ctx.closePath();
  ctx.fill();
  // ink reservoir above the ball
  ctx.fillStyle = NAVY;
  ctx.fillRect(cx - 30, cy - 130, 60, 80);
  // the ball, with markings that turn
  ctx.fillStyle = '#c3c8d0';
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-spin);
  ctx.strokeStyle = 'rgba(29, 53, 87, 0.75)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0.3, 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 40, Math.PI + 0.3, Math.PI + 1.5);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.ellipse(cx - 18, cy - 20, 12, 8, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  // caption
  ctx.fillStyle = PAPER;
  ctx.font = `400 26px "Bebas Neue", Impact, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('BALL ∅ 1 MM', cx - 132, cy - 40);
  ctx.textAlign = 'left';
}

function drawPlane(ctx, T, barSec) {
  const u = (T - 1.8 * barSec) / (1.9 * barSec);
  if (u < -0.05 || u > 1.3) return;
  // contrail: a looping line traced behind the plane (same handwriting as the pen)
  const px = 1080 - u * 1250;
  const py = 120 + Math.sin(u * 3) * 16;
  ctx.save();
  ctx.strokeStyle = 'rgba(251, 248, 240, 0.95)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  let first = true;
  for (let s = 0; s < 40; s += 0.25) {
    const x = px + 40 + s * 9.5 + 15 * Math.sin(s);
    if (x > 1060) break;
    const y = py + 6 - 15 * (1 - Math.cos(s)) * 0.6;
    if (first) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    first = false;
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29, 53, 87, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // generic twin-engine propeller aircraft, flat navy silhouette (no markings)
  ctx.translate(px, py);
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(-58, 0);
  ctx.quadraticCurveTo(-50, -10, -20, -9);
  ctx.lineTo(48, -6);
  ctx.lineTo(56, -24);
  ctx.lineTo(68, -24);
  ctx.lineTo(66, -2);
  ctx.lineTo(70, 4);
  ctx.lineTo(-40, 8);
  ctx.quadraticCurveTo(-56, 7, -58, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.lineTo(4, -2);
  ctx.lineTo(2, 26);
  ctx.lineTo(-14, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.fillRect(-24, 2, 16, 6);
  // spinning props
  const k = Math.abs(Math.sin(T * 40));
  ctx.fillStyle = 'rgba(29, 53, 87, 0.5)';
  ctx.fillRect(-28, -14 * k, 3, 28 * k);
  ctx.restore();
}

const RIDER_STYLE = {
  plumage: WHITE,
  plumageShade: '#e3ddd0',
  mask: CHAR,
  bill: CHAR,
  eyeRing: MUSTARD,
  legs: CHAR,
  crest: MUSTARD,
  breast: MUSTARD,
  frame: RED,
  frameShade: '#9c0c24',
  metal: CHAR,
  tire: CHAR,
  rim: PAPER,
  saddle: NAVY,
  outline: CHAR,
  outlineWidth: 1.3,
  shading: false,
  spokes: 0,
};

export const meta = { stages: ['gallery-ride', 'easel'] };

export function render(kit, ctx, p) {
  const thumb = p.isThumbnail;
  const T = thumb ? p.chapterSec * 0.62 : p.rawLocalT;
  const cs = p.chapterSec;
  const barSec = p.beat.barSec;
  ctx.save();
  // wide stages: the poster's colour fields (cream sky, navy band) continue to the canvas edges
  const L = kit.layout(p);
  const poster = kit.bake('ballpoint_poster_v1', S, S, (g, rng) => paintPoster(kit, g, rng));
  ctx.drawImage(kit.wideBackdrop('ballpoint_poster_v1', poster, p, { mode: 'edge', inset: 3 }), 0, 0);
  ctx.translate(L.x, L.y);
  ctx.scale(L.s, L.s);

  // writing progress: line 1 over bars 1–2, line 2 over bar 3 to mid bar 4, then the flourish
  const prog = 2 * ss(0.02 * cs, 0.86 * cs, T) ** 0.92;
  const flourish = thumb ? 0 : ss(0.86 * cs, 0.98 * cs, T);
  drawPlane(ctx, thumb ? -99 : T, barSec);
  const tip = drawWriting(ctx, prog, flourish);
  // pen hovers before the first stroke and lifts after the flourish
  const lift = (1 - ss(-0.6, 0.05 * cs, T)) * 40 + ss(0.99 * cs, 1.2 * cs, T) * 60;
  drawPen(ctx, tip.x + lift * 0.5, tip.y - lift, T);

  const speed = prog < 2 ? 1 : flourish < 1 ? 0.6 : 0;
  drawInset(ctx, T * 6 * speed + prog * 20, ss(0, 0.2, prog));

  if (p.actor && p.actor.visible) p.actor.draw(ctx, p.actor.rig(), RIDER_STYLE);

  ctx.drawImage(kit.bake('ballpoint_grain_v1', S, S, (g, rng) => paintGrain(kit, g, rng)), L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0);
  ctx.restore();
}
