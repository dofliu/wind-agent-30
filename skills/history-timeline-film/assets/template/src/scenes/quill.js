// src/scenes/quill.js
// Chapter "quill" · 約 6–19 世紀 · 鵝毛筆與手抄本 — Quill & Parchment.
//
// Medium: a Gothic illuminated manuscript page. Parchment with ruling, a framed miniature
// (gold-leaf border, diapered blue/vermilion background with gold dots, a trefoil arch),
// flat mineral colours with black contour lines, a gilded historiated initial and two
// lines of textura (blackletter) below, a vine-and-ivy border with gold bezants, and a
// snail drollery creeping along the lower margin.
//
// Scene: a tonsured monk-scribe at a slanted desk writes with a goose quill — a line of
// text grows on his page with every beat, the quill nodding as he writes; a goose (the
// source of the quill) waddles at the left. The road is the bottom rule of the miniature,
// so the rider "stands on the frame line" as marginal figures do.
//
// Story beat (bar 3): the nib is worn — the scribe lifts his penknife and re-cuts the
// quill in two strokes on the beat (a shaving curls away), then writes on. Meanwhile the
// goose drops a feather that floats down past the rider.

const S = 1000;
const ROAD = 700;
const BOX = { x: 64, y: 64, w: 872, h: 636 }; // the miniature; its bottom rule is the road
const PARCH = '#f1e4c3';
const INK = '#2a2017';
const RED = '#b32d2a';
const BLUE = '#1f3f8f';
const BLUE_D = '#162d66';
const GOLD = '#c99a2e';
const GOLD_L = '#efcf6a';
const GREEN = '#3f6b3a';
const HABIT = '#6b4a2e';
const TAU = Math.PI * 2;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function outlineFill(ctx, path, fill, lw = 2) {
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke(path);
}

// -----------------------------------------------------------------------------
// baked page
// -----------------------------------------------------------------------------
function paintPage(kit, g, rng) {
  // parchment
  g.fillStyle = PARCH;
  g.fillRect(0, 0, S, S);
  kit.addBlotches(g, S, S, rng, 'rgba(150, 110, 60, 0.06)', 40, 60, 220);
  kit.addBlotches(g, S, S, rng, 'rgba(255, 250, 235, 0.08)', 20, 40, 160);
  // follicle speckle of the skin
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(120, 90, 50, ${0.05 + rng() * 0.08})`;
    g.fillRect(rng() * S, rng() * S, 1.2, 1.2);
  }

  // ---- the miniature -------------------------------------------------------
  const { x, y, w, h } = BOX;
  // diapered background: blue lozenges with red, gold dots at the crossings
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = BLUE;
  g.fillRect(x, y, w, h);
  const d = 44;
  for (let j = -1; j < h / d + 1; j++) {
    for (let i = -1; i < w / d + 1; i++) {
      const cx = x + i * d + (j % 2 ? d / 2 : 0);
      const cy = y + j * (d / 2);
      if ((i + j) % 3 === 0) {
        g.fillStyle = RED;
        g.beginPath();
        g.moveTo(cx, cy - d / 2);
        g.lineTo(cx + d / 2, cy);
        g.lineTo(cx, cy + d / 2);
        g.lineTo(cx - d / 2, cy);
        g.closePath();
        g.fill();
      }
    }
  }
  g.strokeStyle = 'rgba(20, 20, 40, 0.45)';
  g.lineWidth = 1;
  for (let k = -h; k < w + h; k += d / 2) {
    g.beginPath();
    g.moveTo(x + k, y);
    g.lineTo(x + k - h, y + h);
    g.moveTo(x + k, y);
    g.lineTo(x + k + h, y + h);
    g.stroke();
  }
  for (let j = 0; j < h / (d / 2) + 1; j++) {
    for (let i = 0; i < w / d + 1; i++) {
      g.fillStyle = GOLD_L;
      g.beginPath();
      g.arc(x + i * d + (j % 2 ? d / 2 : 0), y + j * (d / 2), 2.2, 0, TAU);
      g.fill();
    }
  }
  // tiled floor band
  const fy = ROAD - 92;
  g.fillStyle = '#d9c39a';
  g.fillRect(x, fy, w, ROAD - fy);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 40; c++) {
      if ((r + c) % 2) continue;
      g.fillStyle = r % 2 ? '#a0503a' : '#8a3d2c';
      g.fillRect(x + c * 23 + (r % 2) * 11, fy + r * 23, 23, 23);
    }
  }
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, fy);
  g.lineTo(x + w, fy);
  g.stroke();

  // trefoil arcade (architectural canopy) across the top
  g.fillStyle = '#e8d9b8';
  g.strokeStyle = INK;
  g.lineWidth = 2.5;
  const arch = new Path2D();
  arch.rect(x, y, w, 70);
  for (const [ax, aw] of [[x + 40, 360], [x + 440, 400]]) {
    arch.moveTo(ax, y + 70);
    arch.arc(ax + aw * 0.22, y + 92, aw * 0.22, Math.PI, 1.5 * Math.PI + 0.2);
    arch.arc(ax + aw * 0.5, y + 70, aw * 0.16, Math.PI * 1.05, TAU * 0.98);
    arch.arc(ax + aw * 0.78, y + 92, aw * 0.22, 1.5 * Math.PI - 0.2, TAU);
    arch.lineTo(ax + aw, y + 70);
  }
  g.fill(arch);
  g.stroke(arch);
  // pinnacles + crockets
  for (const px of [x + 20, x + 420, x + 860]) {
    const pin = new Path2D();
    pin.moveTo(px - 12, y + 70);
    pin.lineTo(px, y + 6);
    pin.lineTo(px + 12, y + 70);
    pin.closePath();
    outlineFill(g, pin, '#e8d9b8', 2);
    for (let k = 1; k < 4; k++) {
      g.fillStyle = GOLD;
      g.beginPath();
      g.arc(px - 10 + k * 1.5, y + 70 - k * 16, 3, 0, TAU);
      g.fill();
    }
  }
  // columns at the sides of the arcade
  for (const cx of [x + 22, x + 432, x + 850]) {
    const col = new Path2D();
    col.rect(cx - 8, y + 70, 16, fy - y - 70);
    outlineFill(g, col, '#d8c6a0', 1.8);
  }
  // the scribe's desk (slanted lectern) and bench — static furniture
  const desk = new Path2D();
  desk.moveTo(610, 470);
  desk.lineTo(720, 430);
  desk.lineTo(730, 452);
  desk.lineTo(622, 494);
  desk.closePath();
  outlineFill(g, desk, '#8a5a30', 2);
  const deskPost = new Path2D();
  deskPost.rect(662, 470, 14, ROAD - 470 - 4);
  deskPost.rect(630, ROAD - 16, 80, 12);
  outlineFill(g, deskPost, '#7a4e28', 2);
  const bench = new Path2D();
  bench.rect(770, 560, 120, 16);
  bench.rect(780, 576, 12, ROAD - 580);
  bench.rect(868, 576, 12, ROAD - 580);
  outlineFill(g, bench, '#8a5a30', 2);
  // inkhorn on the desk
  const horn = new Path2D();
  horn.moveTo(716, 432);
  horn.quadraticCurveTo(706, 400, 720, 388);
  horn.lineTo(732, 392);
  horn.quadraticCurveTo(724, 410, 730, 428);
  horn.closePath();
  outlineFill(g, horn, '#d9c08a', 1.6);
  g.restore();

  // gold-leaf frame of the miniature (double rule, red + blue)
  g.lineWidth = 9;
  g.strokeStyle = GOLD;
  g.strokeRect(x - 5, y - 5, w + 10, h + 5);
  g.lineWidth = 3;
  g.strokeStyle = RED;
  g.strokeRect(x - 12, y - 12, w + 24, h + 12);
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.strokeRect(x, y, w, h);
  g.strokeRect(x - 9.5, y - 9.5, w + 19, h + 9.5);

  // ---- text column below ------------------------------------------------------
  // ruling
  g.strokeStyle = 'rgba(150, 90, 70, 0.22)';
  g.lineWidth = 1;
  for (let ly = 790; ly < 960; ly += 44) {
    g.beginPath();
    g.moveTo(60, ly);
    g.lineTo(940, ly);
    g.stroke();
  }
  // historiated initial: gilded square with a blue "I" and vine scroll
  const ix = 74;
  const iy = 728;
  g.fillStyle = GOLD;
  g.fillRect(ix, iy, 118, 118);
  g.fillStyle = BLUE;
  g.fillRect(ix + 8, iy + 8, 102, 102);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(ix, iy, 118, 118);
  g.fillStyle = '#f4ead0';
  g.font = `400 112px ${kit.FONT.blackletter}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText('I', ix + 59, iy + 100);
  for (let k = 0; k < 5; k++) {
    g.fillStyle = k % 2 ? RED : '#f4ead0';
    g.beginPath();
    g.arc(ix + 22 + k * 18, iy + 104, 4, 0, TAU);
    g.fill();
  }
  g.textAlign = 'left';
  g.fillStyle = RED;
  g.font = `400 40px ${kit.FONT.blackletter}`;
  g.fillText('n principio erat verbum', 210, 778);
  g.fillStyle = INK;
  g.fillText('et verbum erat apud deum', 210, 822);
  g.fillText('et deus erat verbum · hoc erat', 76, 878);
  g.fillText('in principio apud deum', 76, 922);

  // ---- vine border (right margin + bottom) with ivy and gold bezants -----------
  g.strokeStyle = GREEN;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(968, 60);
  for (let yy = 60; yy <= 960; yy += 10) g.lineTo(968 + Math.sin(yy * 0.05) * 9, yy);
  g.stroke();
  for (let yy = 80; yy < 960; yy += 46) {
    const vx = 968 + Math.sin(yy * 0.05) * 9;
    const side = (yy / 46) % 2 ? 1 : -1;
    const leaf = new Path2D();
    leaf.moveTo(vx, yy);
    leaf.quadraticCurveTo(vx + side * 18, yy - 14, vx + side * 22, yy + 4);
    leaf.quadraticCurveTo(vx + side * 10, yy + 8, vx, yy);
    outlineFill(g, leaf, (yy / 46) % 3 ? GREEN : RED, 1.2);
    g.fillStyle = GOLD;
    g.beginPath();
    g.arc(vx - side * 14, yy + 18, 5, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.stroke();
  }
  g.strokeStyle = GREEN;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(40, 966);
  for (let xx = 40; xx <= 968; xx += 10) g.lineTo(xx, 966 + Math.sin(xx * 0.05) * 7);
  g.stroke();
}

// -----------------------------------------------------------------------------
// animated figures
// -----------------------------------------------------------------------------
function drawGoose(ctx, T, beatSec) {
  const bx = 240 + Math.sin(T * 0.5) * 40;
  const dir = Math.cos(T * 0.5) >= 0 ? 1 : -1;
  const bob = Math.abs(Math.sin(T * 5)) * 3;
  const honk = Math.max(0, 1 - ((T / beatSec) % 4) / 0.5); // neck stretch on beat 1 of each bar
  ctx.save();
  ctx.translate(bx, ROAD - 12 - bob);
  ctx.scale(dir, 1);
  // legs
  ctx.strokeStyle = '#d9822b';
  ctx.lineWidth = 4;
  const st = Math.sin(T * 10);
  ctx.beginPath();
  ctx.moveTo(-6, -16);
  ctx.lineTo(-10 + st * 6, 10);
  ctx.moveTo(8, -16);
  ctx.lineTo(10 - st * 6, 10);
  ctx.stroke();
  const body = new Path2D();
  body.moveTo(-58, -40);
  body.quadraticCurveTo(-40, -82, 10, -74);
  body.quadraticCurveTo(46, -66, 44, -36);
  body.quadraticCurveTo(30, -10, -20, -14);
  body.quadraticCurveTo(-52, -18, -58, -40);
  body.closePath();
  outlineFill(ctx, body, '#fbf8ef', 2);
  // wing feathers
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-36 + k * 12, -56);
    ctx.quadraticCurveTo(-24 + k * 12, -40, -42 + k * 10, -30);
    ctx.stroke();
  }
  const neck = new Path2D();
  const nx = 40 + honk * 10;
  const ny = -118 - honk * 12;
  neck.moveTo(30, -60);
  neck.quadraticCurveTo(52, -90, nx - 8, ny + 14);
  neck.lineTo(nx + 6, ny + 12);
  neck.quadraticCurveTo(62, -88, 42, -46);
  neck.closePath();
  outlineFill(ctx, neck, '#fbf8ef', 2);
  const head = new Path2D();
  head.ellipse(nx, ny, 13, 10, -0.2, 0, TAU);
  outlineFill(ctx, head, '#fbf8ef', 2);
  const beak = new Path2D();
  beak.moveTo(nx + 10, ny - 4);
  beak.lineTo(nx + 30 + honk * 4, ny + 1);
  beak.lineTo(nx + 10, ny + 5);
  beak.closePath();
  outlineFill(ctx, beak, '#e0892c', 1.5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(nx + 3, ny - 3, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
  return { x: bx, y: ROAD - 70 };
}

function drawFeather(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const f = new Path2D();
  f.moveTo(0, -30);
  f.quadraticCurveTo(12, -8, 2, 28);
  f.quadraticCurveTo(-10, -2, 0, -30);
  outlineFill(ctx, f, '#fbf8ef', 1.4);
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(1, 34);
  ctx.stroke();
  ctx.restore();
}

/** Monk at the desk. writeU in [0,1] = progress of the current writing stroke; trim = penknife. */
function drawScribe(ctx, T, beatSec, trim, linesDone, curLine) {
  // the open book on the desk with growing text
  const book = new Path2D();
  book.moveTo(616, 466);
  book.lineTo(718, 428);
  book.lineTo(724, 440);
  book.lineTo(622, 478);
  book.closePath();
  ctx.save();
  // pages (drawn in the desk's slant)
  ctx.translate(618, 470);
  ctx.rotate(-0.36);
  ctx.fillStyle = '#fbf3dc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.fillRect(0, -64, 112, 62);
  ctx.strokeRect(0, -64, 112, 62);
  ctx.beginPath();
  ctx.moveTo(56, -64);
  ctx.lineTo(56, -2);
  ctx.stroke();
  // text lines: left page full, right page grows
  ctx.fillStyle = INK;
  for (let l = 0; l < 6; l++) ctx.fillRect(6, -56 + l * 9, 44, 2.2);
  ctx.fillStyle = RED;
  ctx.fillRect(6, -58, 8, 6);
  ctx.fillStyle = INK;
  for (let l = 0; l < Math.min(6, linesDone); l++) ctx.fillRect(62, -56 + l * 9, 44, 2.2);
  if (linesDone < 6) ctx.fillRect(62, -56 + linesDone * 9, 44 * curLine, 2.2);
  const nibX = 62 + 44 * (linesDone < 6 ? curLine : 1);
  const nibY = -56 + Math.min(5, linesDone) * 9;
  ctx.restore();
  // nib position in panel space
  const ca = Math.cos(-0.36);
  const sa = Math.sin(-0.36);
  const nib = { x: 618 + nibX * ca - nibY * sa, y: 470 + nibX * sa + nibY * ca };

  // monk: seated on the bench, facing left toward the desk
  const mx = 820;
  const my = 560;
  const habit = new Path2D();
  habit.moveTo(mx - 40, my + 4);
  habit.quadraticCurveTo(mx - 52, my - 70, mx - 22, my - 118);
  habit.quadraticCurveTo(mx + 6, my - 136, mx + 34, my - 112);
  habit.quadraticCurveTo(mx + 54, my - 50, mx + 50, my + 8);
  habit.closePath();
  outlineFill(ctx, habit, HABIT, 2.2);
  // lap / legs to the ground
  const legs = new Path2D();
  legs.moveTo(mx - 40, my - 6);
  legs.lineTo(mx - 96, my - 2);
  legs.lineTo(mx - 100, ROAD - 6);
  legs.lineTo(mx - 76, ROAD - 6);
  legs.lineTo(mx - 72, my + 18);
  legs.lineTo(mx + 30, my + 16);
  legs.closePath();
  outlineFill(ctx, legs, '#5a3d25', 2);
  // fold lines
  ctx.strokeStyle = 'rgba(30, 20, 10, 0.6)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(mx - 20 + k * 16, my - 100);
    ctx.quadraticCurveTo(mx - 26 + k * 18, my - 50, mx - 16 + k * 18, my);
    ctx.stroke();
  }
  // head with tonsure
  const hx = mx - 18;
  const hy = my - 146;
  const head = new Path2D();
  head.ellipse(hx, hy, 20, 23, 0, 0, TAU);
  outlineFill(ctx, head, '#f0c9a0', 2);
  // tonsure: a ring of hair around a shaven crown
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = '#6b4a2e';
  ctx.fillRect(hx - 30, hy - 30, 60, 22);
  ctx.fillRect(hx + 4, hy - 30, 30, 44);
  ctx.fillStyle = '#f0c9a0';
  ctx.beginPath();
  ctx.ellipse(hx + 3, hy - 22, 13, 7, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke(head);
  // ear
  ctx.fillStyle = '#e8b98c';
  ctx.beginPath();
  ctx.ellipse(hx + 6, hy + 2, 4, 6, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx - 11, hy - 2, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx - 20, hy + 2);
  ctx.lineTo(hx - 24, hy + 8);
  ctx.lineTo(hx - 18, hy + 9);
  ctx.stroke();

  // writing hand (right) follows the nib; knife hand (left) rises during the trim
  const shoulder = { x: mx - 22, y: my - 104 };
  const hand = trim > 0.01 ? { x: 700 + trim * 20, y: 380 - trim * 24 } : { x: nib.x + 8, y: nib.y - 6 };
  // sleeve: a thick outlined stroke from shoulder to wrist
  ctx.lineCap = 'round';
  const elbow = { x: (shoulder.x + hand.x) / 2 + 14, y: Math.max(shoulder.y, hand.y) + 40 };
  for (const [col, w] of [[INK, 22], [HABIT, 18]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.quadraticCurveTo(elbow.x, elbow.y, hand.x + 4, hand.y + 4);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillStyle = '#f0c9a0';
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 6, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // the quill: white goose feather, nib at the hand; nods with the writing strokes
  const nod = trim > 0.01 ? 0 : Math.sin((T / beatSec) * Math.PI * 2) * 0.12;
  const qa = -1.05 + nod - (trim > 0.01 ? 0.5 * trim : 0); // feather leans back toward the writer
  ctx.save();
  ctx.translate(hand.x - 6, hand.y + 6);
  ctx.rotate(qa);
  const vane = new Path2D();
  vane.moveTo(20, 0);
  vane.quadraticCurveTo(70, -14, 112, -4);
  vane.quadraticCurveTo(70, 12, 30, 4);
  vane.closePath();
  outlineFill(ctx, vane, '#fbf8ef', 1.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(112, -2);
  ctx.stroke();
  ctx.restore();
  if (trim > 0.01) {
    // penknife in the other hand, two cuts on the beat
    const cut = Math.abs(Math.sin((T / beatSec) * Math.PI)); // one cut per beat
    const kx = hand.x - 52 + cut * 30;
    const ky = hand.y + 30 - cut * 18;
    ctx.fillStyle = '#d5d8de';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(kx + 40, ky - 14);
    ctx.lineTo(kx + 6, ky + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(kx - 24, ky, 26, 9);
    ctx.strokeRect(kx - 24, ky, 26, 9);
    ctx.fillStyle = '#f0c9a0';
    ctx.beginPath();
    ctx.arc(kx - 14, ky + 4, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

const RIDER_STYLE = {
  plumage: '#fbf6ea',
  plumageShade: '#e6dcc6',
  mask: INK,
  bill: INK,
  eyeRing: GOLD,
  crest: GOLD_L,
  breast: '#efcf6a',
  frame: RED,
  frameShade: '#8c1f1c',
  metal: INK,
  tire: INK,
  rim: GOLD,
  saddle: '#5a3a22',
  outline: INK,
  outlineWidth: 2.2,
  shading: false,
  spokes: 8,
};

export const meta = { stages: ['gallery-ride', 'easel'] };

export function render(kit, ctx, p) {
  const thumb = p.isThumbnail;
  const T = thumb ? p.chapterSec * 0.4 : p.rawLocalT;
  const beatSec = p.beat.beatSec;
  const barSec = p.beat.barSec;
  ctx.save();
  // wide stages: the page margins are stretched out to the canvas edges, the page design sits
  // in p.layout (identity on gallery-ride)
  const L = kit.layout(p);
  const page = kit.bake('quill_page_v1', S, S, (g, rng) => paintPage(kit, g, rng));
  ctx.drawImage(kit.wideBackdrop('quill_page_v1', page, p, { mode: 'edge', fill: 'corner', inset: 12 }), 0, 0);
  ctx.translate(L.x, L.y);
  ctx.scale(L.s, L.s);

  // ---- writing schedule: one line per bar, except bar 3 (index 2) = trim the quill ----
  const bar = Math.floor(T / barSec);
  const inBar = T - bar * barSec;
  const trimBar = 2;
  let linesDone = 0;
  for (let b = 0; b < bar; b++) if (b !== trimBar) linesDone++;
  linesDone = Math.max(0, Math.min(6, linesDone));
  const isTrim = !thumb && bar === trimBar;
  const trim = isTrim ? ss(0, 0.25 * barSec, inBar) * (1 - ss(0.8 * barSec, barSec, inBar)) : 0;
  const curLine = isTrim || thumb ? (thumb ? 0.6 : 0) : ss(0, barSec, inBar);

  ctx.save();
  ctx.beginPath();
  ctx.rect(BOX.x, BOX.y, BOX.w, BOX.h);
  ctx.clip();
  const goose = drawGoose(ctx, T, beatSec);
  drawScribe(ctx, T, beatSec, trim, bar < 0 ? 0 : linesDone, Math.max(0, curLine));
  // the shaving from the re-cut nib curls down
  if (isTrim) {
    const k = ss(0.3 * barSec, barSec, inBar);
    ctx.strokeStyle = '#efe6cf';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(690 - k * 10, 400 + k * 260, 5 + k * 2, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();

  // ---- gold glint sweeping across the gilding ----------------------------------
  if (!thumb) {
    const gx = ((T * 160) % 1600) - 300;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0);
    gr.addColorStop(0, 'rgba(255, 230, 150, 0)');
    gr.addColorStop(0.5, 'rgba(255, 230, 150, 0.55)');
    gr.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.rect(BOX.x - 10, BOX.y - 10, BOX.w + 20, 9);
    ctx.rect(BOX.x - 10, BOX.y - 10, 9, BOX.h + 10);
    ctx.rect(BOX.x + BOX.w + 1, BOX.y - 10, 9, BOX.h + 10);
    ctx.rect(74, 728, 118, 8);
    ctx.rect(74, 838, 118, 8);
    ctx.rect(74, 728, 8, 118);
    ctx.rect(184, 728, 8, 118);
    ctx.fill();
    ctx.restore();
  }

  // ---- marginal snail creeping along the bottom vine --------------------------------
  {
    const sx = 120 + ((T * 9) % 900);
    const sy = 966 + Math.sin(sx * 0.05) * 7;
    const shell = new Path2D();
    shell.arc(sx, sy - 16, 13, 0, TAU);
    const bodyS = new Path2D();
    bodyS.moveTo(sx - 16, sy - 2);
    bodyS.quadraticCurveTo(sx + 10, sy - 6, sx + 26, sy - 4);
    bodyS.lineTo(sx + 30, sy - 18);
    bodyS.lineTo(sx + 32, sy - 4);
    bodyS.quadraticCurveTo(sx + 10, sy + 2, sx - 16, sy - 2);
    outlineFill(ctx, bodyS, '#d8c39a', 1.4);
    outlineFill(ctx, shell, '#c97a3a', 1.6);
    ctx.beginPath();
    ctx.arc(sx, sy - 16, 6, 0, Math.PI * 1.6);
    ctx.stroke();
  }

  // ---- rider on the miniature's bottom rule ------------------------------------------
  if (p.actor && p.actor.visible) p.actor.draw(ctx, p.actor.rig(), RIDER_STYLE);

  // ---- the goose's lost feather (bar 2 -> 4) drifts down in front -----------------
  if (!thumb) {
    const f0 = 1 * barSec;
    const u = (T - f0) / (2.6 * barSec);
    if (u > 0 && u < 1) {
      const fx = goose.x + 40 + u * 330 + Math.sin(u * 9) * 30;
      const fy = goose.y - 60 + u * 360;
      drawFeather(ctx, fx, Math.min(fy, ROAD + 40), Math.sin(u * 7) * 0.9);
    }
  }
  ctx.restore();
}
