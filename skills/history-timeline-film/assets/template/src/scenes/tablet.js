// src/scenes/tablet.js
// Chapter "tablet" · 約前 3300–3000 · 泥板與蘆葦筆 — Clay & Reed.
//
// Medium: a Sumerian clay plaque in low relief (the whole panel is fired clay, lit from the
// upper left): raised figures with a bright upper-left lip and a soft lower-right shadow,
// incised detail, three horizontal registers like the Uruk-period reliefs.
//   top      a decorative wedge inscription + a pillow-shaped ACCOUNT TABLET (right) that a
//            reed stylus impresses as the sheep are counted: the proto-cuneiform sign for sheep
//            (UDU, a circled cross) followed by numerals (narrow impression = 1, round = 10)
//   middle   ziggurat and date palms; a flock walks along the road through a gate where a
//            scribe stands tallying; the rider overtakes the flock
//   bottom   the river: rows of relief waves, reeds (the stylus material) and fish
//
// Story beat: the flock walks toward the rider; one sheep passes the gate every 2 beats and
// one more "1" is pressed in; ten "1"s are smoothed out into a "10". On bar 3 the rider rolls
// through the gate and the puzzled scribe presses a brand-new sign — two circles and a bar.
//
// Contract: render(kit, ctx, p) — designed on the gallery-ride 1000x1000 canvas (road at y = 700);
// on the easel stage the design sits in p.layout, the plaque is mirror-tiled across the
// valley and the flock walks the full width (no rider: p.actor is null there).

const S = 1000;
const ROAD = 700;
const GATE_X = 568;
const SCRIBE_X = 470;
const START_COUNT = 20; // the account already holds two tens when the chapter begins
const CLAY = '#c9a274';
const CLAY_LT = '#e2c59a';
const CLAY_HI = 'rgba(255, 238, 205, 0.75)';
const CLAY_SH = 'rgba(70, 42, 22, 0.42)';
const CLAY_DK = '#7a5235';
const INCISE = 'rgba(64, 38, 20, 0.7)';
const TAU = Math.PI * 2;

let MIR = 1; // 1, or -1 while drawing a mirrored figure (keeps the light from the upper left)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// -----------------------------------------------------------------------------
// relief helpers
// -----------------------------------------------------------------------------
/** Fill a Path2D as a raised relief: shadow down-right, lit lip up-left, then the face. */
function relief(ctx, path, face = CLAY_LT, depth = 3) {
  ctx.save();
  ctx.translate(depth * 0.8 * MIR, depth);
  ctx.fillStyle = CLAY_SH;
  ctx.fill(path);
  ctx.translate((-depth * 0.8 - 1.4) * MIR, -depth - 1.4);
  ctx.fillStyle = CLAY_HI;
  ctx.fill(path);
  ctx.restore();
  ctx.fillStyle = face;
  ctx.fill(path);
}

/** Incised line: dark groove with a light lower lip. */
function incise(ctx, drawPath, w = 2) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.45)';
  ctx.lineWidth = w;
  ctx.translate(0.8 * MIR, 1.2);
  ctx.beginPath();
  drawPath(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INCISE;
  ctx.lineWidth = w;
  ctx.beginPath();
  drawPath(ctx);
  ctx.stroke();
  ctx.restore();
}

/** A wedge impression (reed corner pressed into clay) at (x, y), pointing along angle a. */
function wedge(ctx, x, y, size, a = 0, alpha = 1) {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(70, 40, 20, 0.62)';
  ctx.beginPath();
  let p = P(0, -size * 0.45);
  ctx.moveTo(p[0], p[1]);
  p = P(size * 0.55, 0);
  ctx.lineTo(p[0], p[1]);
  p = P(0, size * 0.45);
  ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
  // tail of the stroke
  ctx.strokeStyle = 'rgba(70, 40, 20, 0.5)';
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.beginPath();
  p = P(size * 0.5, 0);
  ctx.moveTo(p[0], p[1]);
  p = P(size * 1.5, 0);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  // lit edge of the impression
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  p = P(0.6, size * 0.47);
  ctx.moveTo(p[0], p[1]);
  p = P(size * 0.6, 0.6);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  ctx.restore();
}

/** Round impression (the end of a round stylus): "10" in proto-cuneiform numerals. */
function roundMark(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(60, 34, 16, 0.75)');
  g.addColorStop(0.75, 'rgba(90, 56, 30, 0.45)');
  g.addColorStop(1, 'rgba(255, 236, 200, 0.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Narrow D-shaped impression: "1". */
function oneMark(ctx, x, y, h, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(64, 36, 18, 0.66)';
  ctx.beginPath();
  ctx.ellipse(x, y, h * 0.2, h * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x + 0.8, y + 0.8, h * 0.2, h * 0.5, 0, 0.2, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// baked plaque
// -----------------------------------------------------------------------------
function paintPlaque(kit, g, rng) {
  // clay body with low-frequency mottling (rendered small, scaled up = soft)
  const n = 250;
  const small = kit.createCanvas(n, n);
  const sg = small.getContext('2d');
  const img = sg.createImageData(n, n);
  const base = kit.hexToRgb(CLAY);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const f = kit.fbm2(x * 0.03, y * 0.03, 4, 7) - 0.5;
      const light = 0.06 * (1 - (x + y) / (2 * n)); // lit from upper left
      const k = 1 + f * 0.22 + light;
      const i = (y * n + x) * 4;
      img.data[i] = Math.min(255, base.r * k);
      img.data[i + 1] = Math.min(255, base.g * k);
      img.data[i + 2] = Math.min(255, base.b * k * 0.98);
      img.data[i + 3] = 255;
    }
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, S, S);

  // grit: pits and grains
  for (let i = 0; i < 2600; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 0.6 + rng() * 1.6;
    g.fillStyle = rng() < 0.6 ? 'rgba(80, 50, 26, 0.35)' : 'rgba(255, 240, 210, 0.4)';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // hairline firing cracks
  for (let k = 0; k < 7; k++) {
    let x = rng() * S;
    let y = rng() * S;
    let a = rng() * TAU;
    g.strokeStyle = 'rgba(70, 42, 22, 0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 18; s++) {
      a += (rng() - 0.5) * 0.9;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // register dividers: raised bands
  const band = (y0, h) => {
    const p = new Path2D();
    p.rect(0, y0, S, h);
    relief(g, p, CLAY_LT, 3);
    g.fillStyle = 'rgba(255,240,210,0.25)';
    g.fillRect(0, y0, S, 2);
  };
  band(244, 12);

  // top register: decorative wedge inscription in ruled cases (left 60 %)
  g.strokeStyle = 'rgba(70, 42, 22, 0.35)';
  g.lineWidth = 1.5;
  for (const y of [92, 160, 228]) {
    g.beginPath();
    g.moveTo(48, y);
    g.lineTo(590, y);
    g.stroke();
  }
  for (let x = 48; x <= 590; x += 90.5) {
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x, 228);
    g.stroke();
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = 60 + col * 90.5;
      const cy = 52 + row * 66;
      const nW = 2 + Math.floor(rng() * 4);
      for (let w = 0; w < nW; w++) {
        const a = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(rng() * 4)];
        wedge(g, cx + 10 + rng() * 56, cy + 6 + rng() * 26, 9 + rng() * 5, a);
      }
    }
  }

  // middle register: ziggurat (far), palms
  const zig = new Path2D();
  const zx = 70;
  const tiers = [
    [zx, 692, 360, 92],
    [zx + 56, 600, 248, 74],
    [zx + 108, 526, 144, 60],
  ];
  for (const [x, y, w, h] of tiers) zig.rect(x, y - h, w, h);
  relief(g, zig, '#d9b98d', 2.5);
  for (const [x, y, w, h] of tiers) {
    // buttress recesses
    for (let k = 1; k < w / 26; k++) {
      g.fillStyle = 'rgba(80, 50, 26, 0.18)';
      g.fillRect(x + k * 26 - 3, y - h + 6, 6, h - 10);
    }
  }
  // central stairway
  const stair = new Path2D();
  stair.moveTo(zx + 160, 692);
  stair.lineTo(zx + 200, 692);
  stair.lineTo(zx + 196, 466);
  stair.lineTo(zx + 164, 466);
  stair.closePath();
  relief(g, stair, '#e6caa0', 2);
  g.strokeStyle = 'rgba(80, 50, 26, 0.35)';
  g.lineWidth = 1;
  for (let y = 688; y > 470; y -= 9) {
    g.beginPath();
    g.moveTo(zx + 161, y);
    g.lineTo(zx + 199, y);
    g.stroke();
  }
  // shrine on top
  const shrine = new Path2D();
  shrine.rect(zx + 150, 436, 60, 30);
  relief(g, shrine, '#e2c59a', 2);
  g.fillStyle = 'rgba(70, 42, 22, 0.5)';
  g.fillRect(zx + 172, 446, 16, 20);

  const palm = (x, h, lean) => {
    const top = { x: x + lean, y: ROAD - h };
    const trunk = new Path2D();
    trunk.moveTo(x - 9, ROAD - 6);
    trunk.quadraticCurveTo(x + lean * 0.3, ROAD - h * 0.5, top.x - 5, top.y);
    trunk.lineTo(top.x + 5, top.y);
    trunk.quadraticCurveTo(x + lean * 0.3 + 8, ROAD - h * 0.5, x + 9, ROAD - 6);
    trunk.closePath();
    relief(g, trunk, '#d6b487', 2.5);
    for (let k = 0; k < h / 14; k++) {
      const u = k / (h / 14);
      const px = x + (top.x - x) * u * u * 0.9;
      const py = ROAD - 10 - k * 14;
      incise(g, (c) => {
        c.moveTo(px - 7, py);
        c.lineTo(px + 7, py - 4);
      }, 1.4);
    }
    for (let f = 0; f < 9; f++) {
      const a = -Math.PI / 2 + (f - 4) * 0.36;
      const len = 70 + (f % 2) * 16;
      const fr = new Path2D();
      const ex = top.x + Math.cos(a) * len;
      const ey = top.y + Math.sin(a) * len * 0.75 + Math.abs(f - 4) * 9;
      fr.moveTo(top.x, top.y);
      fr.quadraticCurveTo((top.x + ex) / 2, Math.min(top.y, ey) - 26, ex, ey);
      fr.quadraticCurveTo((top.x + ex) / 2, Math.min(top.y, ey) - 14, top.x, top.y + 6);
      fr.closePath();
      relief(g, fr, '#dcbf93', 2);
      incise(g, (c) => {
        c.moveTo(top.x, top.y);
        c.quadraticCurveTo((top.x + ex) / 2, Math.min(top.y, ey) - 21, ex, ey);
      }, 1);
    }
    // dates
    for (let d = 0; d < 6; d++) {
      const p = new Path2D();
      p.arc(top.x - 12 + (d % 3) * 10, top.y + 14 + Math.floor(d / 3) * 9, 5, 0, TAU);
      relief(g, p, '#cfa877', 1.2);
    }
  };
  palm(500, 250, 10);
  palm(940, 210, -14);

  // the road = register ground line
  const road = new Path2D();
  road.rect(0, ROAD, S, 16);
  relief(g, road, CLAY_LT, 3);

  // bottom register: river bed
  g.fillStyle = 'rgba(90, 58, 32, 0.08)';
  g.fillRect(0, ROAD + 22, S, S - ROAD - 22);
  // reeds along the bank (background of the bottom register)
  for (let i = 0; i < 46; i++) {
    const x = 20 + i * 21.5 + rng() * 8;
    const h = 60 + rng() * 70;
    incise(g, (c) => {
      c.moveTo(x, 990);
      c.quadraticCurveTo(x + 4, 990 - h * 0.6, x + 8 + rng() * 6, 990 - h);
    }, 2);
    if (i % 3 === 0) {
      const p = new Path2D();
      p.ellipse(x + 10, 990 - h - 6, 4, 10, 0.2, 0, TAU);
      relief(g, p, '#cfa877', 1.2);
    }
  }
}

// -----------------------------------------------------------------------------
// animated pieces
// -----------------------------------------------------------------------------
function drawRiver(ctx, T) {
  for (let row = 0; row < 5; row++) {
    const y0 = 760 + row * 44;
    const ph = T * (0.9 + row * 0.15) + row * 1.7;
    incise(ctx, (c) => {
      for (let x = -10; x <= S + 10; x += 12) {
        const y = y0 + Math.sin(x * 0.045 - ph * 2.2) * 6;
        if (x === -10) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
    }, 2.6);
  }
  // two fish swimming against the current
  for (let k = 0; k < 2; k++) {
    const x = ((T * (38 + k * 12) + k * 520) % 1240) - 120;
    const y = 804 + k * 88 + Math.sin(T * 2 + k) * 6;
    const fish = new Path2D();
    fish.ellipse(x, y, 34, 12, 0, 0, TAU);
    fish.moveTo(x - 30, y);
    fish.lineTo(x - 52, y - 13 + Math.sin(T * 9 + k) * 4);
    fish.lineTo(x - 52, y + 13 + Math.sin(T * 9 + k) * 4);
    fish.closePath();
    relief(ctx, fish, '#dcbf93', 2);
    roundMark(ctx, x + 22, y - 3, 2.6);
    incise(ctx, (c) => {
      c.moveTo(x + 12, y - 10);
      c.quadraticCurveTo(x + 6, y, x + 12, y + 10);
    }, 1.2);
  }
}

/** Draw `fn` mirrored about x = cx (figure faces left instead of right). */
function mirrored(ctx, cx, fn) {
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-cx, 0);
  MIR = -1;
  try {
    fn();
  } finally {
    MIR = 1;
    ctx.restore();
  }
}

function drawSheep(ctx, x, T, k) {
  const y = ROAD;
  ctx.save();
  // a little smaller than life next to the rider, so the flock reads as a procession
  ctx.translate(x, y);
  ctx.scale(0.82, 0.82);
  ctx.translate(-x, -y);
  const step = Math.sin(T * 9 + k * 1.3);
  const body = new Path2D();
  // fleece: scalloped outline
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const r = 1 + 0.12 * Math.abs(Math.sin(i * 1.7));
    const px = x + Math.cos(a) * 46 * r;
    const py = y - 62 + Math.sin(a) * 30 * r;
    if (i === 0) body.moveTo(px, py);
    else body.lineTo(px, py);
  }
  body.quadraticCurveTo(x + 40, y - 30, x - 46, y - 42);
  body.closePath();
  // legs
  for (const [lx, ph] of [[-30, 0], [-18, Math.PI], [20, Math.PI], [32, 0]]) {
    const sw = Math.sin(T * 9 + k * 1.3 + ph) * 5;
    const leg = new Path2D();
    leg.rect(x + lx - 3 + sw * 0.3, y - 38, 6, 36);
    relief(ctx, leg, '#cfa877', 1.5);
  }
  relief(ctx, body, '#e8d0a8', 2.6);
  // fleece curls
  for (let i = 0; i < 9; i++) {
    roundMark(ctx, x - 32 + (i % 5) * 15 + (i > 4 ? 7 : 0), y - 76 + (i > 4 ? 18 : 0) + step * 0.5, 3.4, 0.7);
  }
  // head (dark-faced breed) with horn curl
  const head = new Path2D();
  head.ellipse(x + 52, y - 74 + step, 16, 11, 0.35, 0, TAU);
  relief(ctx, head, '#b98f62', 2);
  incise(ctx, (c) => {
    c.arc(x + 46, y - 80 + step, 7, 0.5, 5.2);
  }, 1.8);
  roundMark(ctx, x + 58, y - 77 + step, 2);
  ctx.restore();
}

/** Sheep k reaches the gate at T_k = 2 beats * k (k may be negative). */
function flock(T, beatSec) {
  const period = 2 * beatSec;
  const speed = 132 / period; // 132 px apart, one sheep through the gate every 2 beats
  return { period, speed };
}

function drawScribe(ctx, x, T, look, press) {
  const y = ROAD;
  // stool-less standing scribe in profile, facing left
  const skirt = new Path2D();
  skirt.moveTo(x - 30, y - 6);
  skirt.lineTo(x - 22, y - 92);
  skirt.lineTo(x + 26, y - 92);
  skirt.lineTo(x + 34, y - 6);
  skirt.closePath();
  relief(ctx, skirt, '#e6cda4', 3);
  // kaunakes tufts
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const tx = x - 22 + c * 12 + (r % 2) * 6;
      const ty = y - 82 + r * 20;
      incise(ctx, (cc) => {
        cc.moveTo(tx, ty);
        cc.quadraticCurveTo(tx + 3, ty + 10, tx, ty + 14);
      }, 1.6);
    }
  }
  const torso = new Path2D();
  torso.moveTo(x - 20, y - 92);
  torso.quadraticCurveTo(x - 28, y - 140, x - 14, y - 160);
  torso.lineTo(x + 16, y - 160);
  torso.quadraticCurveTo(x + 26, y - 130, x + 24, y - 92);
  torso.closePath();
  relief(ctx, torso, '#ddbf94', 3);
  // head: shaven, big almond eye, turns toward the rider on the gag
  const hx = x - 2 - look * 4;
  const head = new Path2D();
  head.ellipse(hx, y - 184, 20, 23, 0, 0, TAU);
  head.moveTo(hx - 19, y - 186);
  head.lineTo(hx - 30 + look * 4, y - 178);
  head.lineTo(hx - 18, y - 172);
  relief(ctx, head, '#e3c79e', 3);
  ctx.save();
  ctx.fillStyle = '#f2e1c0';
  ctx.beginPath();
  ctx.ellipse(hx - 10 + look * 2, y - 190, 7, 4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  roundMark(ctx, hx - 11 + look * 3, y - 190, 2.6);
  incise(ctx, (c) => {
    c.moveTo(hx - 12, y - 170);
    c.lineTo(hx - 4, y - 169);
  }, 1.4);
  // left arm holding the tally tablet at chest height
  const tab = new Path2D();
  tab.roundRect ? tab.roundRect(x - 54, y - 140, 36, 28, 8) : tab.rect(x - 54, y - 140, 36, 28);
  relief(ctx, tab, '#ead3ac', 2);
  incise(ctx, (c) => {
    c.moveTo(x - 8, y - 152);
    c.quadraticCurveTo(x - 30, y - 128, x - 40, y - 124);
  }, 6);
  // right arm with the reed: presses on every count
  const sx = x + 6;
  const sy = y - 150;
  const ang = -0.4 + press * 0.55;
  const ex = sx - 34 * Math.cos(ang);
  const ey = sy + 34 * Math.sin(ang) + 10;
  incise(ctx, (c) => {
    c.moveTo(sx, sy);
    c.lineTo(ex, ey);
  }, 6);
  incise(ctx, (c) => {
    c.moveTo(ex + 6, ey - 16);
    c.lineTo(ex - 10, ey + 14 * (0.4 + press));
  }, 3);
}

/** The big account tablet in the top register: UDU (sheep) + numerals for `count`. */
function drawAccount(ctx, kit, count, sinceLast, bike, pressReed) {
  const x0 = 640;
  const y0 = 44;
  const w = 300;
  const h = 186;
  const tab = kit.bake('tablet_account_v1', w + 20, h + 20, (g) => {
    const p = new Path2D();
    const r = 34;
    p.moveTo(10 + r, 10);
    p.quadraticCurveTo(10 + w / 2, 2, 10 + w - r, 10);
    p.quadraticCurveTo(10 + w, 10, 10 + w, 10 + r);
    p.quadraticCurveTo(10 + w + 8, 10 + h / 2, 10 + w, 10 + h - r);
    p.quadraticCurveTo(10 + w, 10 + h, 10 + w - r, 10 + h);
    p.quadraticCurveTo(10 + w / 2, 10 + h + 8, 10 + r, 10 + h);
    p.quadraticCurveTo(10, 10 + h, 10, 10 + h - r);
    p.quadraticCurveTo(2, 10 + h / 2, 10, 10 + r);
    p.quadraticCurveTo(10, 10, 10 + r, 10);
    p.closePath();
    relief(g, p, '#e7cfa6', 5);
    const gr = g.createRadialGradient(10 + w * 0.3, 10 + h * 0.3, 10, 10 + w / 2, 10 + h / 2, w * 0.7);
    gr.addColorStop(0, 'rgba(255, 244, 220, 0.35)');
    gr.addColorStop(1, 'rgba(120, 80, 40, 0.18)');
    g.fillStyle = gr;
    g.fill(p);
    // ruled case lines
    g.strokeStyle = 'rgba(80, 50, 26, 0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(26, 10 + h * 0.55);
    g.lineTo(w - 6, 10 + h * 0.55);
    g.moveTo(10 + w * 0.36, 22);
    g.lineTo(10 + w * 0.36, 10 + h * 0.55);
    g.stroke();
    // the sheep sign UDU: a circle with a cross
    g.save();
    g.strokeStyle = 'rgba(64, 36, 18, 0.7)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(10 + w * 0.18, 10 + h * 0.29, 26, 0, TAU);
    g.moveTo(10 + w * 0.18 - 18, 10 + h * 0.29 - 18);
    g.lineTo(10 + w * 0.18 + 18, 10 + h * 0.29 + 18);
    g.moveTo(10 + w * 0.18 + 18, 10 + h * 0.29 - 18);
    g.lineTo(10 + w * 0.18 - 18, 10 + h * 0.29 + 18);
    g.stroke();
    g.restore();
  });
  ctx.drawImage(tab, x0 - 10, y0 - 10);
  // numerals: tens as round marks, ones as narrow marks; the newest one fades in on impact
  const tens = Math.floor(count / 10);
  const ones = count % 10;
  const nx = x0 + w * 0.42;
  for (let i = 0; i < tens; i++) roundMark(ctx, nx + 14 + i * 26, y0 + 34, 10, i === tens - 1 && ones === 0 ? sinceLast : 1);
  for (let i = 0; i < ones; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    oneMark(ctx, nx + 14 + (tens ? tens * 26 + 6 : 0) + col * 16, y0 + 30 + row * 30, 22, i === ones - 1 ? sinceLast : 1);
  }
  // the new sign: two circles joined by a bar (the rider's bicycle, as the scribe saw it)
  if (bike > 0) {
    const bx = x0 + 70;
    const by = y0 + 140;
    roundMark(ctx, bx, by, 16, bike);
    roundMark(ctx, bx + 62, by, 16, bike);
    ctx.save();
    ctx.globalAlpha *= bike;
    wedge(ctx, bx + 8, by - 12, 12, 0);
    wedge(ctx, bx + 30, by - 12, 12, 0);
    wedge(ctx, bx + 44, by - 28, 10, Math.PI / 2);
    ctx.restore();
  }
  // the reed stylus hovering over the tablet, dipping on each count
  const rx = nx + 30 + Math.min(4, ones % 5) * 16 + (tens ? tens * 26 + 6 : 0);
  const ry = y0 + 28 - 34 * (1 - pressReed);
  const dx = 0.62;
  const dy = -0.78;
  const nxr = -dy * 5;
  const nyr = dx * 5;
  const reed = new Path2D();
  reed.moveTo(rx, ry);
  reed.lineTo(rx + nxr + dx * 16, ry + nyr + dy * 16);
  reed.lineTo(rx + nxr + dx * 150, ry + nyr + dy * 150);
  reed.lineTo(rx - nxr + dx * 150, ry - nyr + dy * 150);
  reed.lineTo(rx - nxr + dx * 16, ry - nyr + dy * 16);
  reed.closePath();
  relief(ctx, reed, '#efdcb4', 3);
  for (const k of [52, 104]) {
    incise(ctx, (c) => {
      c.moveTo(rx + nxr + dx * k, ry + nyr + dy * k);
      c.lineTo(rx - nxr + dx * k, ry - nyr + dy * k);
    }, 1.6);
  }
}

// -----------------------------------------------------------------------------
// rider: clay relief re-style
// -----------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: '#ead4ad',
  plumageShade: '#d1b386',
  mask: '#6e4a2c',
  bill: '#6e4a2c',
  eyeRing: '#a87b4b',
  legs: '#7a5235',
  crest: '#c99a5c',
  breast: '#d8b276',
  frame: '#a36f45',
  frameShade: '#8a5a3b',
  metal: '#7a5235',
  tire: '#6e4a2c',
  rim: '#d1b386',
  saddle: '#7a5235',
  outline: '#5b3b22',
  outlineWidth: 1.4,
  shading: false,
  spokes: 8,
};

export const meta = { stages: ['gallery-ride', 'easel'] };

export function render(kit, ctx, p) {
  const thumb = p.isThumbnail;
  const T = thumb ? p.chapterSec * 0.55 : p.rawLocalT;
  const beatSec = p.beat.beatSec;
  ctx.save();
  // layout: identity on gallery-ride; on wide stages (easel) the plaque is mirror-tiled to fill
  // the canvas and the 1000-unit design is placed in the stage's safe area (p.layout)
  const L = kit.layout(p);
  const plaque = kit.bake('tablet_plaque_v1', S, S, (g, rng) => paintPlaque(kit, g, rng));
  ctx.drawImage(kit.wideBackdrop('tablet_plaque_v1', plaque, p, { mode: 'mirror' }), 0, 0);
  ctx.translate(L.x, L.y);
  ctx.scale(L.s, L.s);

  drawRiver(ctx, T);

  // ---- the flock and the count ------------------------------------------------
  // the flock walks right -> left (toward the rider); sheep k reaches the gate at T = k * period
  const { period, speed } = flock(T, beatSec);
  const passed = Math.max(0, Math.floor(T / period + 1e-6) + 1);
  const count = START_COUNT + passed;
  const sinceLast = passed > 0 ? ss(0, 0.18, T - (passed - 1) * period) : 1;
  const sheep = [];
  // the flock spans the whole canvas (wider than the panel on wide stages)
  const xMin = Math.min(0, L.x0) - 90;
  const xMax = Math.max(S, L.x1) + 90;
  const kLo = Math.floor((T - (xMax + 10 - GATE_X) / speed) / period) - 1;
  const kHi = Math.ceil((T - (xMin - GATE_X) / speed) / period) + 1;
  for (let k = kLo; k <= kHi; k++) {
    const x = GATE_X - (T - k * period) * speed;
    if (x < xMin || x > xMax) continue;
    sheep.push({ x, k });
  }
  const riderX = p.riderLocalX ?? -1e4; // no rider in the scene on the easel stage
  const look = thumb ? 0 : ss(GATE_X - 260, GATE_X - 60, riderX) * (1 - ss(GATE_X + 160, GATE_X + 320, riderX));
  const press = thumb ? 0.3 : passed > 0 ? Math.max(0, 1 - (T - (passed - 1) * period) / (period * 0.35)) : 0;
  const bikeSign = thumb ? 0 : ss(GATE_X - 10, GATE_X + 80, riderX);

  // counted sheep (left of the gate) walk behind the scribe
  for (const s of sheep) if (s.x < SCRIBE_X + 40) mirrored(ctx, s.x, () => drawSheep(ctx, s.x, T, s.k));
  mirrored(ctx, SCRIBE_X, () => drawScribe(ctx, SCRIBE_X, T, look, press));
  // gate posts
  for (const gx of [GATE_X - 10, GATE_X + 10]) {
    const post = new Path2D();
    post.rect(gx - 5, ROAD - 128, 10, 128);
    relief(ctx, post, '#dcbf93', 2.5);
  }
  const lintel = new Path2D();
  lintel.rect(GATE_X - 22, ROAD - 136, 44, 10);
  relief(ctx, lintel, '#e2c59a', 2);
  for (const s of sheep) if (s.x >= SCRIBE_X + 40) mirrored(ctx, s.x, () => drawSheep(ctx, s.x, T, s.k));

  drawAccount(ctx, kit, thumb ? 27 : Math.min(count, 59), thumb ? 1 : sinceLast, bikeSign, press);

  // ---- rider in relief ---------------------------------------------------------------
  if (p.actor && p.actor.visible) {
    const rig = p.actor.rig();
    ctx.save();
    ctx.translate(2.4, 3);
    ctx.globalAlpha = 0.45;
    p.actor.draw(ctx, rig, { ...RIDER_STYLE, prop: p.prop, silhouette: '#5a3a22' });
    ctx.restore();
    p.actor.draw(ctx, rig, { ...RIDER_STYLE, prop: { ...p.prop, colors: ['#c79a62', '#7a5235'] } });
  }

  ctx.restore();
  // soft raking light over everything (keeps moving parts in the same clay); baked at canvas size
  // and blitted 1:1 (a scaled full-frame drawImage costs ~6 ms on the 1920x1080 easel canvas)
  ctx.drawImage(
    kit.bake('tablet_light_v1', p.W, p.H, (g, rng, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255, 240, 210, 0.10)');
      gr.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
      gr.addColorStop(1, 'rgba(60, 30, 10, 0.16)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }),
    0,
    0,
  );
}
