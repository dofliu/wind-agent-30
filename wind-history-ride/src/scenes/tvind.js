// src/scenes/tvind.js
// 《乘風騎行》 #14 石油危機與特溫風機 · 1973–1978 — Oil Crisis & the Tvind Turbine.
//
// Medium: a 1970s screen-printed community / protest poster. Four flat inks on cream
// stock (yellow, orange, green, and a deep aubergine "key"), each plate printed with a
// slight misregistration; halftone dots for tones; dry-screen speckle; fat rounded
// display lettering in Danish (era-native) — no real logos, just a plain sun.
//
// Machine: the Tvind turbine ("Tvindkraft", Ulfborg, Denmark; built 1975–78 by the
// teachers and students of the Tvind schools, opened 26 March 1978, still running).
// Slender reinforced-concrete tower flaring into a concrete cone at the foot, steel
// top, THREE fibreglass blades on a 54 m DOWNWIND rotor (the rotor sits on the lee
// side of the tower; the westerly wind arrives from the left). Hub ~50 m. Rotor speed
// is limited to ~21 rpm — here 20 rpm, so one blade passes the top every beat-pair.
//
// Story: 1973 oil crisis. A petrol station with a "售完 · SOLD OUT" board and a queue of
// boxy 70s cars at a standstill; the spoonbill simply pedals past on the cycle path.
// Gag: the price digits on the pylon roll upward on every beat of bars 2–3; the queue
// honks ("DYT!") and a waiting driver rattles his newspaper; on bar 4 the volunteers
// at the foot of the turbine cheer the rider.

const P = 1000;
const TAU = Math.PI * 2;

const PAPER = '#f4e3c1';
const INK = {
  yellow: '#f2b134',
  orange: '#e85d2a',
  green: '#2a7f62',
  key: '#3b1f47',
};
// fixed plate misregistration (px)
const OFF = {
  yellow: [-2, 2],
  orange: [3, -2],
  green: [-2, 3],
  key: [0, 0],
};

const HORIZON = 586;
const LANE_TOP = 624;
const LANE_BOT = 690;
const PATH_TOP = 694;
const FOOT_TOP = 712;

const TB = { x: 728, base: 598, hubY: 252, R: 184, k: 0.5, hubDX: 50 };
const OMEGA = TAU / 3; // 20 rpm

const SUN = { x: 470, y: 592, r: 205 };
const PYLON = { x: 402, box: { x0: 346, x1: 458, y0: 326, y1: 470 } };

// Warm the CJK glyphs used on the sold-out board (the engine preloads the film's text,
// these two characters are not in it).
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  try {
    document.fonts.load('700 40px "Noto Sans TC"', '售完').catch(() => {});
  } catch (e) {
    /* offline: system fallback */
  }
}

// -----------------------------------------------------------------------------
// utils
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Run fn with one ink plate: colour, misregistration offset, multiply. */
function ink(g, name, fn, mode = 'multiply') {
  g.save();
  g.globalCompositeOperation = mode;
  g.translate(OFF[name][0], OFF[name][1]);
  g.fillStyle = INK[name];
  g.strokeStyle = INK[name];
  g.lineJoin = 'round';
  g.lineCap = 'round';
  fn(g);
  g.restore();
}
/** Paper knock-out (the area no ink should print under). */
function knock(g, fn) {
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = PAPER;
  g.strokeStyle = PAPER;
  fn(g);
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** Halftone dots inside the current clip; tone(x,y) in [0,1]. */
function halftone(g, x0, y0, x1, y1, tone, cell = 8, angle = 0.26) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + cell;
  g.beginPath();
  for (let j = -half; j <= half; j += cell) {
    for (let i = -half; i <= half; i += cell) {
      const x = cx + i * ca - j * sa;
      const y = cy + i * sa + j * ca;
      if (x < x0 - cell || x > x1 + cell || y < y0 - cell || y > y1 + cell) continue;
      const t = tone(x, y);
      if (t <= 0.02) continue;
      const r = cell * 0.56 * Math.sqrt(Math.min(1, t));
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fill();
}

/** Fat, rounded 70s display lettering: fattened glyph + optional inline. */
function fatText(g, text, x, y, size, opts = {}) {
  const { fill = INK.orange, shadow = INK.key, sx = 6, sy = 6, inline = PAPER, fat = 0.11, spacing = 2, font = null } = opts;
  g.save();
  g.font = font || `${size}px "Bebas Neue", "Oswald", Impact, sans-serif`;
  try {
    g.letterSpacing = `${spacing}px`;
  } catch (e) {
    /* older canvas */
  }
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.textBaseline = 'alphabetic';
  const w = size * fat;
  if (shadow) {
    g.fillStyle = shadow;
    g.strokeStyle = shadow;
    g.lineWidth = w;
    g.strokeText(text, x + sx, y + sy);
    g.fillText(text, x + sx, y + sy);
  }
  g.fillStyle = fill;
  g.strokeStyle = fill;
  g.lineWidth = w;
  g.strokeText(text, x, y);
  g.fillText(text, x, y);
  if (inline) {
    g.strokeStyle = inline;
    g.lineWidth = Math.max(1.2, size * 0.018);
    g.strokeText(text, x, y);
  }
  g.restore();
}

function dryScreen(g, kit, rng, w, h, n = 9000) {
  // ink drop-outs: paper specks only where ink was printed
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 0.4 + rng() * 1.3;
    g.fillStyle = `rgba(244,227,193,${0.35 + rng() * 0.5})`;
    g.fillRect(x, y, r, r * (0.6 + rng()));
  }
  g.restore();
}

// -----------------------------------------------------------------------------
// Background plate group: paper, sky, sun, headline, horizon, schools, fields
// -----------------------------------------------------------------------------
function bakeBack(kit) {
  return kit.bake('tvind_back', P, P, (g, rng) => {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, P, P);

    // sky: yellow halftone thickening to the horizon
    ink(g, 'yellow', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, 0, P, HORIZON);
      q.clip();
      halftone(q, 0, 0, P, HORIZON, (x, y) => sstep(150, HORIZON, y) * 0.62 + 0.03, 9, 0.26);
      q.restore();
    });
    // orange glow-dots around the sun
    ink(g, 'orange', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, 0, P, HORIZON);
      q.clip();
      halftone(
        q,
        SUN.x - SUN.r - 220,
        SUN.y - SUN.r - 220,
        SUN.x + SUN.r + 220,
        HORIZON,
        (x, y) => {
          const d = Math.hypot(x - SUN.x, y - SUN.y) - SUN.r;
          return d < 0 ? 0 : Math.max(0, 1 - d / 190) * 0.55;
        },
        9,
        1.05,
      );
      q.restore();
    });

    // the sun: plain disc, yellow ring + orange core, with 70s stripe cuts
    g.save();
    g.beginPath();
    g.rect(0, 0, P, HORIZON);
    g.clip();
    knock(g, (q) => {
      q.beginPath();
      q.arc(SUN.x, SUN.y, SUN.r, 0, TAU);
      q.fill();
    });
    ink(g, 'yellow', (q) => {
      q.beginPath();
      q.arc(SUN.x, SUN.y, SUN.r, 0, TAU);
      q.fill();
    });
    ink(g, 'orange', (q) => {
      q.beginPath();
      q.arc(SUN.x, SUN.y, SUN.r * 0.66, 0, TAU);
      q.fill();
    });
    knock(g, (q) => {
      let y = SUN.y - SUN.r * 0.38;
      let h = 3;
      while (y < HORIZON) {
        q.fillRect(SUN.x - SUN.r - 10, y, SUN.r * 2 + 20, h);
        y += 20 - h * 0.4;
        h += 2.2;
      }
    });
    g.restore();

    // --- headline ---
    g.save();
    ink(g, 'key', (q) => {
      q.font = `34px "Bebas Neue", Impact, sans-serif`;
      try {
        q.letterSpacing = '3px';
      } catch (e) {
        /* */
      }
      q.fillText('OLIEKRISE 1973 ?', 58, 78);
      q.fillRect(58, 88, 214, 4);
    });
    g.restore();
    knock(g, (q) => fatText(q, 'VINDKRAFT!', 52, 232, 168, { fill: PAPER, shadow: null, inline: null, fat: 0.16 }));
    fatText(g, 'VINDKRAFT!', 52, 232, 168, { fill: INK.orange, shadow: INK.key, sx: 7, sy: 6, inline: PAPER, fat: 0.11 });
    ink(g, 'green', (q) => {
      q.font = `40px "Bebas Neue", Impact, sans-serif`;
      try {
        q.letterSpacing = '2px';
      } catch (e) {
        /* */
      }
      q.fillText('TVINDSKOLERNE · ULFBORG · 1975–78', 58, 282);
    });
    ink(g, 'key', (q) => {
      q.font = `28px "Bebas Neue", Impact, sans-serif`;
      try {
        q.letterSpacing = '2px';
      } catch (e) {
        /* */
      }
      q.fillText('BYGGET AF LÆRERE OG ELEVER', 60, 314);
    });

    // --- horizon: hedge, schools, trees ---
    // fields
    ink(g, 'green', (q) => {
      q.fillRect(0, HORIZON - 2, P, LANE_TOP - HORIZON + 4);
    });
    ink(g, 'yellow', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, HORIZON, P, LANE_TOP - HORIZON);
      q.clip();
      // furrow stripes
      for (let k = 0; k < 6; k++) {
        const y = HORIZON + 4 + k * k * 1.6 + k * 3;
        q.fillRect(0, y, P, 1.2 + k * 0.7);
      }
      q.restore();
    });
    // Tvind school buildings: long white walls under red-tile roofs
    const bld = [
      { x0: 500, x1: 690, wall: 548, roof: 522, win: 7 },
      { x0: 790, x1: 958, wall: 530, roof: 500, win: 6, two: true },
    ];
    for (const b of bld) {
      knock(g, (q) => q.fillRect(b.x0, b.roof, b.x1 - b.x0, HORIZON - b.roof));
      ink(g, 'yellow', (q) => q.fillRect(b.x0, b.wall, b.x1 - b.x0, HORIZON - b.wall));
      ink(g, 'orange', (q) => {
        q.beginPath();
        q.moveTo(b.x0 - 6, b.wall);
        q.lineTo(b.x0 + 18, b.roof);
        q.lineTo(b.x1 - 18, b.roof);
        q.lineTo(b.x1 + 6, b.wall);
        q.closePath();
        q.fill();
      });
      ink(g, 'key', (q) => {
        q.lineWidth = 2.4;
        q.beginPath();
        q.moveTo(b.x0 - 6, b.wall);
        q.lineTo(b.x0 + 18, b.roof);
        q.lineTo(b.x1 - 18, b.roof);
        q.lineTo(b.x1 + 6, b.wall);
        q.closePath();
        q.stroke();
        q.strokeRect(b.x0, b.wall, b.x1 - b.x0, HORIZON - b.wall);
        const n = b.win;
        const ww = (b.x1 - b.x0) / n;
        for (let i = 0; i < n; i++) {
          const x = b.x0 + i * ww + ww * 0.3;
          q.fillRect(x, b.wall + 9, ww * 0.42, 12);
          if (b.two) q.fillRect(x, b.wall + 32, ww * 0.42, 12);
        }
        // roof tiles hint
        q.lineWidth = 1;
        for (let x = b.x0 + 26; x < b.x1 - 18; x += 9) {
          q.beginPath();
          q.moveTo(x, b.roof + 3);
          q.lineTo(x - 3, b.wall - 3);
          q.stroke();
        }
      });
    }
    // trees: poplars and round crowns
    const trees = [
      [478, 'pop', 70],
      [700, 'round', 44],
      [770, 'pop', 64],
      [968, 'round', 50],
      [30, 'round', 40],
    ];
    for (const [x, kind, h] of trees) {
      const path = (q) => {
        q.beginPath();
        if (kind === 'pop') q.ellipse(x, HORIZON - h * 0.55, h * 0.18, h * 0.55, 0, 0, TAU);
        else q.arc(x, HORIZON - h * 0.6, h * 0.42, 0, TAU);
      };
      ink(g, 'green', (q) => {
        path(q);
        q.fill();
      });
      ink(g, 'key', (q) => {
        path(q);
        q.lineWidth = 2;
        q.stroke();
        q.fillRect(x - 1.5, HORIZON - h * 0.2, 3, h * 0.2);
      });
    }
    // horizon rule
    ink(g, 'key', (q) => {
      q.fillRect(0, HORIZON - 1, P, 2.4);
    });

    dryScreen(g, kit, rng, P, P, 14000);
  });
}

// -----------------------------------------------------------------------------
// Tower + nacelle sprite (over the rotor)
// -----------------------------------------------------------------------------
function towerPath(q) {
  const { x, base, hubY } = TB;
  const top = hubY + 12;
  q.beginPath();
  q.moveTo(x - 31, base);
  q.quadraticCurveTo(x - 20, base - 30, x - 16, base - 82);
  q.lineTo(x - 10, top);
  q.lineTo(x + 10, top);
  q.lineTo(x + 16, base - 82);
  q.quadraticCurveTo(x + 20, base - 30, x + 31, base);
  q.closePath();
}
function nacellePath(q) {
  const { x, hubY } = TB;
  q.beginPath();
  q.moveTo(x - 44, hubY - 2);
  q.quadraticCurveTo(x - 40, hubY - 13, x - 22, hubY - 14);
  q.lineTo(x + TB.hubDX - 8, hubY - 12);
  q.lineTo(x + TB.hubDX - 8, hubY + 12);
  q.lineTo(x - 22, hubY + 14);
  q.quadraticCurveTo(x - 40, hubY + 13, x - 44, hubY + 2);
  q.closePath();
}

function bakeTower(kit) {
  return kit.bake('tvind_tower', P, P, (g, rng) => {
    knock(g, (q) => {
      towerPath(q);
      q.fill();
      nacellePath(q);
      q.fill();
    });
    // shade side (lee, right) in green halftone; concrete pour joints
    ink(g, 'key', (q) => {
      q.save();
      towerPath(q);
      q.clip();
      halftone(q, TB.x - 40, TB.hubY, TB.x + 40, TB.base, (x, y) => sstep(TB.x - 8, TB.x + 16, x) * 0.42 + 0.05, 4.5, 0.78);
      q.restore();
    });
    ink(g, 'yellow', (q) => {
      q.save();
      towerPath(q);
      q.clip();
      halftone(q, TB.x - 40, TB.hubY, TB.x + 40, TB.base, (x, y) => (1 - sstep(TB.x - 30, TB.x + 4, x)) * 0.35 * sstep(TB.hubY + 40, TB.base, y), 5, 0.26);
      q.restore();
    });
    // steel top: yellow nacelle with green underside
    ink(g, 'yellow', (q) => {
      nacellePath(q);
      q.fill();
    });
    ink(g, 'green', (q) => {
      q.save();
      nacellePath(q);
      q.clip();
      q.fillRect(TB.x - 50, TB.hubY + 4, 120, 14);
      q.restore();
    });
    ink(g, 'key', (q) => {
      q.lineWidth = 2.6;
      towerPath(q);
      q.stroke();
      nacellePath(q);
      q.stroke();
      q.lineWidth = 1.2;
      q.beginPath();
      for (let y = TB.base - 92; y > TB.hubY + 30; y -= 30) {
        const f = (TB.base - y) / (TB.base - TB.hubY);
        const hw = lerp(16, 10, clamp((TB.base - 82 - y) / (TB.base - 82 - TB.hubY - 12), 0, 1));
        q.moveTo(TB.x - hw, y);
        q.lineTo(TB.x + hw, y);
        void f;
      }
      q.stroke();
      // door + vents
      roundRect(q, TB.x - 7, TB.base - 24, 14, 22, 5);
      q.fill();
      q.fillRect(TB.x - 2, TB.hubY + 60, 4, 6);
      q.fillRect(TB.x - 2, TB.hubY + 150, 4, 6);
      // nacelle seam + tail vane-less cone line
      q.beginPath();
      q.moveTo(TB.x - 22, TB.hubY - 14);
      q.lineTo(TB.x - 22, TB.hubY + 14);
      q.moveTo(TB.x + 14, TB.hubY - 13);
      q.lineTo(TB.x + 14, TB.hubY + 13);
      q.stroke();
    });
    dryScreen(g, kit, rng, P, P, 2500);
  });
}

// -----------------------------------------------------------------------------
// Rotor (per frame, behind the tower: downwind)
// -----------------------------------------------------------------------------
function drawRotor(g, T) {
  const hub = { x: TB.x + TB.hubDX, y: TB.hubY };
  const th = T * OMEGA + 0.4;
  const k = TB.k;
  const R = TB.R;
  const blades = [];
  for (let i = 0; i < 3; i++) {
    const a = th + (i * TAU) / 3;
    const ax = k * Math.sin(a);
    const ay = -Math.cos(a);
    const wx = k * Math.cos(a);
    const wy = Math.sin(a);
    const pts = [];
    const n = 9;
    // leading edge out, trailing edge back
    for (let j = 0; j <= n; j++) {
      const s = lerp(0.07, 1, j / n);
      const w = lerp(12, 3.6, Math.pow(j / n, 0.85)) * (j === n ? 0.6 : 1);
      pts.push([hub.x + ax * R * s + wx * w * 0.9, hub.y + ay * R * s + wy * w * 0.9]);
    }
    for (let j = n; j >= 0; j--) {
      const s = lerp(0.07, 1, j / n);
      const w = lerp(15, 4.2, Math.pow(j / n, 0.7)) * (j === n ? 0.6 : 1);
      pts.push([hub.x + ax * R * s - wx * w, hub.y + ay * R * s - wy * w]);
    }
    blades.push(pts);
  }
  const bladePath = (q, pts) => {
    q.beginPath();
    pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])));
    q.closePath();
  };
  // shadow/yellow plate under the blades (misregistered), then paper, then key line
  for (const pts of blades) {
    ink(g, 'yellow', (q) => {
      q.translate(3, 3);
      bladePath(q, pts);
      q.fill();
    }, 'source-over');
  }
  for (const pts of blades) {
    knock(g, (q) => {
      bladePath(q, pts);
      q.fill();
    });
  }
  ink(g, 'key', (q) => {
    q.lineWidth = 2.4;
    for (const pts of blades) {
      bladePath(q, pts);
      q.stroke();
    }
  }, 'source-over');
  // hub + spinner (nose pointing downwind)
  knock(g, (q) => {
    q.beginPath();
    q.ellipse(hub.x + 6, hub.y, 14, 13, 0, 0, TAU);
    q.fill();
  });
  ink(g, 'orange', (q) => {
    q.beginPath();
    q.moveTo(hub.x - 2, hub.y - 12);
    q.quadraticCurveTo(hub.x + 22, hub.y - 10, hub.x + 26, hub.y);
    q.quadraticCurveTo(hub.x + 22, hub.y + 10, hub.x - 2, hub.y + 12);
    q.closePath();
    q.fill();
  }, 'source-over');
  ink(g, 'key', (q) => {
    q.lineWidth = 2.4;
    q.beginPath();
    q.moveTo(hub.x - 2, hub.y - 12);
    q.quadraticCurveTo(hub.x + 22, hub.y - 10, hub.x + 26, hub.y);
    q.quadraticCurveTo(hub.x + 22, hub.y + 10, hub.x - 2, hub.y + 12);
    q.closePath();
    q.stroke();
  }, 'source-over');
}

// -----------------------------------------------------------------------------
// Foreground plate group: petrol station, pylon, queue of cars, road, footer
// -----------------------------------------------------------------------------
const CARS = [
  { type: 'sedan', x: 392, col: 'orange' },
  { type: 'beetle', x: 590, col: 'green' },
  { type: 'estate', x: 728, col: 'yellow' },
  { type: 'mini', x: 892, col: 'key' },
];
const CAR_GROUND = LANE_BOT - 2;

function carGeom(type) {
  // facing left; x from the front bumper, y up from the ground (negative)
  switch (type) {
    case 'beetle':
      return {
        len: 124,
        wheels: [27, 97],
        wr: 14,
        body: (q, x, y) => {
          q.beginPath();
          q.moveTo(x + 2, y - 14);
          q.quadraticCurveTo(x + 2, y - 30, x + 14, y - 32);
          q.quadraticCurveTo(x + 30, y - 34, x + 38, y - 40);
          q.bezierCurveTo(x + 52, y - 66, x + 92, y - 66, x + 108, y - 40);
          q.quadraticCurveTo(x + 124, y - 30, x + 124, y - 14);
          q.lineTo(x + 2, y - 14);
          q.closePath();
        },
        windows: (q, x, y) => {
          q.beginPath();
          q.moveTo(x + 46, y - 40);
          q.bezierCurveTo(x + 56, y - 58, x + 72, y - 60, x + 74, y - 58);
          q.lineTo(x + 74, y - 40);
          q.closePath();
          q.moveTo(x + 79, y - 40);
          q.lineTo(x + 79, y - 58);
          q.bezierCurveTo(x + 90, y - 56, x + 98, y - 50, x + 102, y - 40);
          q.closePath();
        },
        head: [62, -46],
      };
    case 'estate':
      return {
        len: 152,
        wheels: [28, 124],
        wr: 14,
        body: (q, x, y) => {
          q.beginPath();
          q.moveTo(x, y - 12);
          q.lineTo(x, y - 34);
          q.lineTo(x + 34, y - 37);
          q.lineTo(x + 46, y - 58);
          q.lineTo(x + 150, y - 59);
          q.lineTo(x + 152, y - 36);
          q.lineTo(x + 152, y - 12);
          q.closePath();
        },
        windows: (q, x, y) => {
          q.beginPath();
          q.moveTo(x + 39, y - 38);
          q.lineTo(x + 49, y - 54);
          q.lineTo(x + 78, y - 54);
          q.lineTo(x + 78, y - 38);
          q.closePath();
          q.rect(x + 83, y - 54, 30, 16);
          q.rect(x + 118, y - 54, 27, 16);
        },
        head: [62, -44],
      };
    case 'mini':
      return {
        len: 108,
        wheels: [21, 86],
        wr: 12,
        body: (q, x, y) => {
          q.beginPath();
          q.moveTo(x, y - 12);
          q.lineTo(x + 1, y - 32);
          q.lineTo(x + 24, y - 35);
          q.lineTo(x + 34, y - 58);
          q.lineTo(x + 100, y - 58);
          q.lineTo(x + 107, y - 34);
          q.lineTo(x + 108, y - 12);
          q.closePath();
        },
        windows: (q, x, y) => {
          q.beginPath();
          q.moveTo(x + 28, y - 37);
          q.lineTo(x + 37, y - 53);
          q.lineTo(x + 64, y - 53);
          q.lineTo(x + 64, y - 37);
          q.closePath();
          q.rect(x + 69, y - 53, 28, 16);
        },
        head: [52, -44],
      };
    default:
      // boxy 70s sedan
      return {
        len: 156,
        wheels: [30, 124],
        wr: 14,
        body: (q, x, y) => {
          q.beginPath();
          q.moveTo(x, y - 12);
          q.lineTo(x, y - 34);
          q.lineTo(x + 38, y - 37);
          q.lineTo(x + 52, y - 60);
          q.lineTo(x + 112, y - 60);
          q.lineTo(x + 124, y - 38);
          q.lineTo(x + 156, y - 35);
          q.lineTo(x + 156, y - 12);
          q.closePath();
        },
        windows: (q, x, y) => {
          q.beginPath();
          q.moveTo(x + 44, y - 39);
          q.lineTo(x + 55, y - 56);
          q.lineTo(x + 82, y - 56);
          q.lineTo(x + 82, y - 39);
          q.closePath();
          q.moveTo(x + 87, y - 39);
          q.lineTo(x + 87, y - 56);
          q.lineTo(x + 109, y - 56);
          q.lineTo(x + 118, y - 39);
          q.closePath();
        },
        head: [66, -46],
      };
  }
}

function drawCar(g, c) {
  const G = carGeom(c.type);
  const x = c.x;
  const y = CAR_GROUND;
  knock(g, (q) => {
    G.body(q, x, y);
    q.fill();
  });
  if (c.col === 'key') {
    ink(g, 'key', (q) => {
      G.body(q, x, y);
      q.fill();
    });
  } else {
    ink(g, c.col, (q) => {
      G.body(q, x, y);
      q.fill();
    });
    // a darker halftone along the sill
    ink(g, c.col === 'yellow' ? 'orange' : 'key', (q) => {
      q.save();
      G.body(q, x, y);
      q.clip();
      halftone(q, x, y - 30, x + G.len, y - 10, (xx, yy) => sstep(y - 30, y - 12, yy) * 0.55, 4.5, 0.78);
      q.restore();
    });
  }
  // windows (paper) + chrome line
  knock(g, (q) => {
    G.windows(q, x, y);
    q.fill();
  });
  ink(g, 'key', (q) => {
    q.lineWidth = 2.4;
    G.body(q, x, y);
    q.stroke();
    q.lineWidth = 1.8;
    G.windows(q, x, y);
    q.stroke();
    // the waiting driver
    q.beginPath();
    q.arc(x + G.head[0], y + G.head[1], 7.5, 0, TAU);
    q.fill();
    q.fillRect(x + G.head[0] - 6, y + G.head[1] + 4, 13, 9);
    // bumpers
    q.lineWidth = 3.2;
    q.beginPath();
    q.moveTo(x - 3, y - 17);
    q.lineTo(x + 10, y - 17);
    q.moveTo(x + G.len - 10, y - 17);
    q.lineTo(x + G.len + 3, y - 17);
    q.stroke();
    // wheels
    for (const wx of G.wheels) {
      q.beginPath();
      q.arc(x + wx, y - G.wr, G.wr, 0, TAU);
      q.fill();
    }
  });
  knock(g, (q) => {
    for (const wx of G.wheels) {
      q.beginPath();
      q.arc(x + wx, y - G.wr, G.wr * 0.42, 0, TAU);
      q.fill();
    }
    // headlamp
    q.beginPath();
    q.arc(x + 6, y - 27, 4.4, 0, TAU);
    q.fill();
  });
  ink(g, 'key', (q) => {
    q.lineWidth = 1.6;
    q.beginPath();
    q.arc(x + 6, y - 27, 4.4, 0, TAU);
    q.stroke();
  });
  ink(g, c.col === 'orange' ? 'yellow' : 'orange', (q) => {
    q.fillRect(x + G.len - 5, y - 30, 4, 8);
  });
}

function bakeFront(kit) {
  return kit.bake('tvind_front', P, P, (g, rng) => {
    // --- road with the queue lane ---
    knock(g, (q) => q.fillRect(0, LANE_TOP, P, FOOT_TOP - LANE_TOP));
    ink(g, 'key', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, LANE_TOP, P, LANE_BOT - LANE_TOP);
      q.clip();
      halftone(q, 0, LANE_TOP, P, LANE_BOT, (x, y) => 0.22 + 0.12 * sstep(LANE_TOP, LANE_BOT, y), 6, 0.78);
      q.restore();
      q.fillRect(0, LANE_TOP - 1, P, 2.2);
    });
    ink(g, 'yellow', (q) => {
      for (let x = 20; x < P; x += 70) q.fillRect(x, LANE_TOP + 9, 36, 4);
    });
    // kerb + cycle path
    ink(g, 'key', (q) => {
      q.fillRect(0, LANE_BOT, P, PATH_TOP - LANE_BOT);
      q.fillRect(0, FOOT_TOP - 2, P, 2);
    });
    ink(g, 'green', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, PATH_TOP, P, FOOT_TOP - PATH_TOP - 2);
      q.clip();
      halftone(q, 0, PATH_TOP, P, FOOT_TOP, () => 0.32, 5, 0.26);
      q.restore();
    });

    // --- petrol station ---
    // kiosk
    knock(g, (q) => q.fillRect(44, 540, 150, LANE_BOT - 540));
    ink(g, 'yellow', (q) => q.fillRect(44, 540, 150, LANE_BOT - 540));
    knock(g, (q) => {
      q.fillRect(58, 566, 76, 52);
      q.fillRect(146, 572, 32, LANE_BOT - 572);
    });
    ink(g, 'green', (q) => {
      q.save();
      q.beginPath();
      q.rect(58, 566, 76, 52);
      q.clip();
      halftone(q, 58, 566, 134, 618, (x, y) => 0.15 + 0.5 * sstep(566, 618, y), 4, 0.78);
      q.restore();
    });
    ink(g, 'key', (q) => {
      q.lineWidth = 2.4;
      q.strokeRect(44, 540, 150, LANE_BOT - 540);
      q.strokeRect(58, 566, 76, 52);
      q.strokeRect(146, 572, 32, LANE_BOT - 572);
      q.beginPath();
      q.moveTo(96, 566);
      q.lineTo(96, 618);
      q.stroke();
      q.font = `22px "Bebas Neue", Impact, sans-serif`;
      q.fillText('KIOSK', 70, 604);
      q.beginPath();
      q.arc(171, 634, 2.4, 0, TAU);
      q.fill();
    });
    // canopy on two slim columns
    ink(g, 'key', (q) => {
      q.fillRect(104, 508, 8, LANE_BOT - 508);
      q.fillRect(318, 508, 8, LANE_BOT - 508);
    });
    knock(g, (q) => roundRect(q, 34, 476, 312, 34, 6));
    ink(g, 'orange', (q) => {
      roundRect(q, 34, 476, 312, 34, 6);
      q.fill();
    });
    ink(g, 'key', (q) => {
      q.lineWidth = 2.6;
      roundRect(q, 34, 476, 312, 34, 6);
      q.stroke();
      q.fillRect(38, 510, 304, 5);
    });
    fatText(g, 'BENZIN · SERVICE', 74, 503, 30, { fill: PAPER, shadow: INK.key, sx: 2, sy: 2, inline: null, fat: 0.06, spacing: 3 });
    // pump island + two pumps
    knock(g, (q) => q.fillRect(176, LANE_BOT - 8, 120, 8));
    ink(g, 'key', (q) => {
      q.lineWidth = 2;
      q.strokeRect(176, LANE_BOT - 8, 120, 8);
    });
    for (const px of [196, 250]) {
      knock(g, (q) => roundRect(q, px, 616, 34, LANE_BOT - 8 - 616, 5));
      ink(g, 'yellow', (q) => {
        roundRect(q, px, 616, 34, LANE_BOT - 8 - 616, 5);
        q.fill();
      });
      ink(g, 'orange', (q) => q.fillRect(px + 2, 650, 30, 6));
      knock(g, (q) => q.fillRect(px + 6, 624, 22, 16));
      ink(g, 'key', (q) => {
        q.lineWidth = 2.2;
        roundRect(q, px, 616, 34, LANE_BOT - 8 - 616, 5);
        q.stroke();
        q.strokeRect(px + 6, 624, 22, 16);
        q.font = `11px "Bebas Neue", Impact, sans-serif`;
        q.fillText('0000', px + 8, 636);
        // hose + holstered nozzle
        q.lineWidth = 2.6;
        q.beginPath();
        q.moveTo(px + 34, 660);
        q.bezierCurveTo(px + 52, 668, px + 50, 632, px + 38, 628);
        q.stroke();
        q.fillRect(px + 33, 624, 8, 10);
      });
    }

    // --- the price pylon ---
    const bx = PYLON.box;
    ink(g, 'key', (q) => q.fillRect(PYLON.x - 5, bx.y1, 10, LANE_BOT - bx.y1));
    knock(g, (q) => roundRect(q, bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0, 8));
    ink(g, 'orange', (q) => {
      roundRect(q, bx.x0, bx.y0, bx.x1 - bx.x0, 38, 8);
      q.fill();
      q.fillRect(bx.x0, bx.y0 + 20, bx.x1 - bx.x0, 18);
    });
    ink(g, 'yellow', (q) => {
      q.fillRect(bx.x0 + 8, bx.y0 + 46, bx.x1 - bx.x0 - 16, bx.y1 - bx.y0 - 56);
    });
    ink(g, 'key', (q) => {
      q.lineWidth = 3;
      roundRect(q, bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0, 8);
      q.stroke();
      q.lineWidth = 2;
      q.strokeRect(bx.x0 + 8, bx.y0 + 46, bx.x1 - bx.x0 - 16, bx.y1 - bx.y0 - 56);
      q.font = `17px "Bebas Neue", Impact, sans-serif`;
      try {
        q.letterSpacing = '1px';
      } catch (e) {
        /* */
      }
      q.fillText('KR. PR. LITER', bx.x0 + 16, bx.y1 - 18);
    });
    fatText(g, 'BENZIN', bx.x0 + 14, bx.y0 + 31, 30, { fill: PAPER, shadow: null, inline: null, fat: 0.05, spacing: 4 });

    // --- the queue ---
    for (const c of CARS) drawCar(g, c);

    // --- footer band ---
    knock(g, (q) => q.fillRect(0, FOOT_TOP, P, P - FOOT_TOP));
    ink(g, 'orange', (q) => q.fillRect(0, FOOT_TOP, P, P - FOOT_TOP));
    ink(g, 'yellow', (q) => {
      q.save();
      q.beginPath();
      q.rect(0, FOOT_TOP, P, P - FOOT_TOP);
      q.clip();
      halftone(q, 0, FOOT_TOP, P, P, (x, y) => sstep(FOOT_TOP + 60, P - 20, y) * 0.8, 10, 0.26);
      q.restore();
    });
    ink(g, 'key', (q) => q.fillRect(0, FOOT_TOP, P, 6));
    knock(g, (q) => fatText(q, 'VI BYGGER SELV!', 54, 838, 118, { fill: PAPER, shadow: null, inline: null, fat: 0.05, spacing: 6 }));
    fatText(g, 'VI BYGGER SELV!', 54, 838, 118, { fill: PAPER, shadow: INK.key, sx: 6, sy: 5, inline: null, fat: 0.03, spacing: 6 });
    ink(g, 'key', (q) => {
      q.font = `31px "Bebas Neue", Impact, sans-serif`;
      try {
        q.letterSpacing = '2px';
      } catch (e) {
        /* */
      }
      q.fillText('3 VINGER · ROTOR Ø 54 M · NAV 50 M · BETONTÅRN · 2 MW', 58, 888);
      q.font = `22px "Bebas Neue", Impact, sans-serif`;
      q.fillText('OLIEKRISE · BILFRI SØNDAG 25.11.1973 · TVINDKRAFT INDVIET 26.3.1978', 60, 925);
      q.font = `14px "Bebas Neue", Impact, sans-serif`;
      q.fillText('SERIGRAFI · 4 FARVER', 852, 958);
    });
    // a plain little sun emblem in the footer
    const ex = 902;
    const ey = 800;
    ink(g, 'yellow', (q) => {
      q.beginPath();
      q.arc(ex, ey, 30, 0, TAU);
      q.fill();
      q.lineWidth = 6;
      q.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        q.moveTo(ex + Math.cos(a) * 38, ey + Math.sin(a) * 38);
        q.lineTo(ex + Math.cos(a) * 52, ey + Math.sin(a) * 52);
      }
      q.stroke();
    }, 'source-over');
    ink(g, 'key', (q) => {
      q.lineWidth = 2.4;
      q.beginPath();
      q.arc(ex, ey, 30, 0, TAU);
      q.stroke();
    });

    dryScreen(g, kit, rng, P, P, 16000);
  });
}

/** Paper fibre / mottle overlay printed over everything. */
function bakePaper(kit) {
  return kit.bake('tvind_paper', P, P, (g, rng) => {
    const im = g.createImageData(P, P);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = rng();
      if (r < 0.05) {
        d[i] = 120;
        d[i + 1] = 90;
        d[i + 2] = 60;
        d[i + 3] = 20 + rng() * 26;
      } else if (r > 0.955) {
        d[i] = 255;
        d[i + 1] = 250;
        d[i + 2] = 235;
        d[i + 3] = 30 + rng() * 40;
      }
    }
    g.putImageData(im, 0, 0);
    // fibres
    for (let i = 0; i < 900; i++) {
      const x = rng() * P;
      const y = rng() * P;
      const a = rng() * TAU;
      const l = 3 + rng() * 9;
      g.strokeStyle = rng() < 0.5 ? 'rgba(120,90,60,0.12)' : 'rgba(255,250,235,0.25)';
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    kit.addBlotches(g, P, P, rng, 'rgba(150,110,60,0.05)', 18, 80, 260);
    // a faint fold: posters were folded for the mail
    g.fillStyle = 'rgba(255,250,235,0.16)';
    g.fillRect(0, 499, P, 1.4);
    g.fillStyle = 'rgba(80,50,30,0.08)';
    g.fillRect(0, 500.4, P, 1.4);
  });
}

// -----------------------------------------------------------------------------
// Animated pieces
// -----------------------------------------------------------------------------
const PRICES = ['1,42', '1,48', '1,55', '1,63', '1,74', '1,86', '1,98', '2,15', '2,38'];

/** Price board: digits roll upward on every beat of bars 2–3 (localT 2.0 … 5.5). */
function drawPrice(g, T) {
  const beat = Math.floor((T - 2) / 0.5); // 0 at T=2.0
  const idx = clamp(beat + 1, 0, PRICES.length - 1);
  const prev = clamp(idx - 1, 0, PRICES.length - 1);
  const since = T - (2 + beat * 0.5);
  const rolling = beat >= 0 && beat < PRICES.length - 1 && since < 0.2;
  const p = rolling ? sstep(0, 0.2, since) : 1;
  const cur = T < 2 ? PRICES[0] : PRICES[idx];
  const old = T < 2 ? PRICES[0] : PRICES[prev];
  const bx = PYLON.box;
  const x0 = bx.x0 + 14;
  const y0 = bx.y0 + 52;
  const cw = 22;
  const ch = 50;
  g.save();
  g.font = `56px "Bebas Neue", Impact, sans-serif`;
  g.textBaseline = 'alphabetic';
  for (let i = 0; i < 4; i++) {
    const cx = x0 + i * cw + (i > 1 ? 2 : 0);
    if (i === 1) {
      // the decimal comma
      g.fillStyle = INK.key;
      g.fillText(',', cx + 4, y0 + ch - 4);
      continue;
    }
    const a = old[i];
    const b = cur[i];
    // tile
    g.fillStyle = PAPER;
    g.fillRect(cx, y0, cw - 3, ch);
    g.strokeStyle = INK.key;
    g.lineWidth = 1.6;
    g.strokeRect(cx, y0, cw - 3, ch);
    g.save();
    g.beginPath();
    g.rect(cx, y0, cw - 3, ch);
    g.clip();
    g.fillStyle = INK.key;
    if (a !== b && rolling) {
      g.fillText(a, cx + 1, y0 + ch - 4 - p * ch);
      g.fillStyle = INK.orange;
      g.fillText(b, cx + 1, y0 + ch - 4 + (1 - p) * ch);
    } else {
      // freshly changed digits stay orange for a moment
      g.fillStyle = beat >= 0 && beat < PRICES.length - 1 && since < 0.42 && old[i] !== cur[i] ? INK.orange : INK.key;
      g.fillText(b, cx + 1, y0 + ch - 4);
    }
    g.restore();
  }
  g.restore();
}

/** The sold-out board hanging under the canopy (swings a little). */
function drawSoldOut(g, T, kick) {
  const ax = 238;
  const ay = 515;
  const ang = 0.05 * Math.sin(T * 2.4) + 0.06 * kick;
  g.save();
  g.translate(ax, ay);
  g.rotate(ang);
  g.strokeStyle = INK.key;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-40, 0);
  g.lineTo(-38, 14);
  g.moveTo(40, 0);
  g.lineTo(38, 14);
  g.stroke();
  // board: paper, yellow plate (offset), key frame
  g.fillStyle = PAPER;
  roundRect(g, -58, 14, 116, 66, 6);
  g.fill();
  g.fillStyle = INK.yellow;
  roundRect(g, -58 + OFF.yellow[0], 14 + OFF.yellow[1], 116, 66, 6);
  g.fill();
  g.strokeStyle = INK.key;
  g.lineWidth = 2.6;
  roundRect(g, -58, 14, 116, 66, 6);
  g.stroke();
  g.fillStyle = INK.orange;
  g.fillRect(-52, 20, 104, 4);
  g.fillStyle = INK.key;
  g.font = `700 34px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "WenQuanYi Zen Hei", sans-serif`;
  g.textAlign = 'center';
  g.fillText('售完', 0, 58);
  g.font = `17px "Bebas Neue", Impact, sans-serif`;
  try {
    g.letterSpacing = '3px';
  } catch (e) {
    /* */
  }
  g.fillText('SOLD OUT', 2, 75);
  g.restore();
}

/** A waiting driver who stepped out to read the news; rattles on each price flip. */
function drawReader(g, T, shake) {
  const x = 562;
  const y = CAR_GROUND;
  const j = shake * Math.sin(T * 60) * 2;
  g.save();
  // flared trousers (green), shirt (yellow), long 70s hair (key)
  g.fillStyle = PAPER;
  g.fillRect(x - 10, y - 74, 22, 74);
  ink(g, 'green', (q) => {
    q.beginPath();
    q.moveTo(x - 8, y - 38);
    q.lineTo(x - 13, y - 2);
    q.lineTo(x - 2, y - 2);
    q.lineTo(x + 1, y - 26);
    q.lineTo(x + 4, y - 2);
    q.lineTo(x + 15, y - 2);
    q.lineTo(x + 9, y - 38);
    q.closePath();
    q.fill();
  }, 'source-over');
  ink(g, 'yellow', (q) => {
    roundRect(q, x - 10, y - 70, 20, 34, 6);
    q.fill();
  }, 'source-over');
  ink(g, 'key', (q) => {
    q.lineWidth = 2;
    q.beginPath();
    q.moveTo(x - 8, y - 38);
    q.lineTo(x - 13, y - 2);
    q.lineTo(x - 2, y - 2);
    q.lineTo(x + 1, y - 26);
    q.lineTo(x + 4, y - 2);
    q.lineTo(x + 15, y - 2);
    q.lineTo(x + 9, y - 38);
    q.stroke();
    roundRect(q, x - 10, y - 70, 20, 34, 6);
    q.stroke();
    q.beginPath();
    q.arc(x + 1, y - 80, 9, 0, TAU);
    q.fill();
    q.fillRect(x - 8, y - 82, 7, 18);
  }, 'source-over');
  // the open newspaper in front of him
  g.translate(x - 8 + j, y - 86 + Math.abs(j) * 0.5);
  g.rotate(-0.06 + shake * 0.05 * Math.sin(T * 40));
  g.fillStyle = PAPER;
  g.fillRect(-26, 0, 40, 30);
  g.strokeStyle = INK.key;
  g.lineWidth = 1.8;
  g.strokeRect(-26, 0, 40, 30);
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(-6, 30);
  g.stroke();
  g.fillStyle = INK.key;
  g.font = `9px "Bebas Neue", Impact, sans-serif`;
  g.fillText('OLIEKRISE!', -24, 10);
  g.fillRect(-24, 14, 15, 1.4);
  g.fillRect(-24, 18, 15, 1.4);
  g.fillRect(-24, 22, 12, 1.4);
  g.fillRect(-3, 6, 14, 10);
  g.fillRect(-3, 19, 14, 1.4);
  g.fillRect(-3, 23, 12, 1.4);
  g.restore();
}

/** Poster "burst" balloon for the honking queue. */
function drawBurst(g, x, y, s, text, t) {
  if (t <= 0) return;
  const k = Math.min(1, t) * (1 + 0.2 * Math.sin(Math.min(1, t) * Math.PI));
  g.save();
  g.translate(x, y);
  g.scale(s * k, s * k);
  const star = () => {
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const r = i % 2 ? 26 : 40;
      g.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.85);
    }
    g.closePath();
  };
  g.fillStyle = PAPER;
  star();
  g.fill();
  g.translate(OFF.yellow[0], OFF.yellow[1]);
  g.fillStyle = INK.yellow;
  star();
  g.fill();
  g.translate(-OFF.yellow[0], -OFF.yellow[1]);
  g.strokeStyle = INK.key;
  g.lineWidth = 2.4;
  star();
  g.stroke();
  g.fillStyle = INK.orange;
  g.strokeStyle = INK.key;
  g.font = `30px "Bebas Neue", Impact, sans-serif`;
  g.textAlign = 'center';
  g.lineWidth = 4;
  g.lineJoin = 'round';
  g.strokeText(text, 0, 10);
  g.fillText(text, 0, 10);
  g.restore();
}

/** Volunteers (teachers & students) under the turbine, holding a banner; cheer on bar 4. */
function drawVolunteers(g, T, thumb) {
  const ppl = [
    { x: 606, shirt: 'orange', hair: 1 },
    { x: 628, shirt: 'yellow', hair: 0 },
    { x: 652, shirt: 'green', hair: 1 },
    { x: 676, shirt: 'orange', hair: 0, beard: 1 },
    { x: 698, shirt: 'yellow', hair: 1 },
  ];
  const feet = 616;
  const cheer = thumb ? 0 : sstep(6.0, 6.2, T) * (1 - sstep(9.5, 10, T));
  // wave at the rider as he passes (bar 3)
  ppl.forEach((p, i) => {
    const ph = T * TAU * 2 + i * 1.3;
    const jump = cheer * Math.max(0, Math.sin(ph)) * 7;
    const y = feet - jump;
    // legs
    ink(g, 'key', (q) => {
      q.lineWidth = 3.4;
      q.beginPath();
      q.moveTo(p.x - 3, y - 18);
      q.lineTo(p.x - 5, y);
      q.moveTo(p.x + 3, y - 18);
      q.lineTo(p.x + 5, y);
      q.stroke();
    }, 'source-over');
    // body
    knock(g, (q) => {
      roundRect(q, p.x - 6, y - 36, 12, 20, 4);
      q.fill();
    });
    ink(g, p.shirt, (q) => {
      roundRect(q, p.x - 6, y - 36, 12, 20, 4);
      q.fill();
    }, 'source-over');
    ink(g, 'key', (q) => {
      q.lineWidth = 1.6;
      roundRect(q, p.x - 6, y - 36, 12, 20, 4);
      q.stroke();
      q.beginPath();
      q.arc(p.x, y - 42, 5.2, 0, TAU);
      q.fill();
      if (p.hair) q.fillRect(p.x - 6, y - 45, 4, 12);
      // arms: up when cheering, otherwise holding the banner poles / waving
      q.lineWidth = 2.6;
      q.beginPath();
      const up = cheer > 0.5 ? 1 : 0;
      const wave = i === 2 ? Math.sin(T * 14) * (sstep(4.6, 4.8, T) * (1 - sstep(6.0, 6.1, T))) : 0;
      if (up) {
        q.moveTo(p.x - 5, y - 33);
        q.lineTo(p.x - 11, y - 50 + Math.sin(ph) * 2);
        q.moveTo(p.x + 5, y - 33);
        q.lineTo(p.x + 11, y - 50 + Math.cos(ph) * 2);
      } else {
        q.moveTo(p.x - 5, y - 33);
        q.lineTo(p.x - 9, y - 22);
        q.moveTo(p.x + 5, y - 33);
        if (wave) q.lineTo(p.x + 11 + wave * 3, y - 48);
        else q.lineTo(p.x + 9, y - 22);
      }
      q.stroke();
    }, 'source-over');
  });
  // banner between two poles (hoisted while cheering)
  const by = lerp(544, 528, cheer);
  knock(g, (q) => q.fillRect(600, by, 104, 18));
  ink(g, 'green', (q) => q.fillRect(600, by, 104, 18), 'source-over');
  ink(g, 'key', (q) => {
    q.lineWidth = 2;
    q.strokeRect(600, by, 104, 18);
    q.fillRect(597, by - 4, 3, feet - by + 4 - 18);
    q.fillRect(704, by - 4, 3, feet - by + 4 - 18);
  }, 'source-over');
  g.save();
  g.fillStyle = PAPER;
  g.font = `16px "Bebas Neue", Impact, sans-serif`;
  try {
    g.letterSpacing = '2px';
  } catch (e) {
    /* */
  }
  g.fillText('TVINDKRAFT', 614, by + 15);
  g.restore();
}

/** Westerly wind: poster swooshes travelling left -> right towards the rotor. */
function drawWind(g, T) {
  const tracks = [
    { y: 96, x0: 700, x1: 990, v: 150, ph: 0 },
    { y: 330, x0: 600, x1: 990, v: 130, ph: 0.45 },
    { y: 452, x0: 640, x1: 990, v: 170, ph: 0.2 },
  ];
  for (const tr of tracks) {
    const span = tr.x1 - tr.x0 + 160;
    const head = tr.x0 + ((((T * tr.v + tr.ph * span) % span) + span) % span) - 60;
    const len = 120;
    const fade = sstep(tr.x0 - 60, tr.x0 + 40, head) * (1 - sstep(tr.x1 - 40, tr.x1 + 40, head));
    if (fade <= 0) continue;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const x = head - len + (i / 16) * len;
      pts.push([x, tr.y + Math.sin(x * 0.035 + T * 2) * 5]);
    }
    const draw = (q, dx, dy) => {
      q.beginPath();
      pts.forEach((p, i) => (i ? q.lineTo(p[0] + dx, p[1] + dy) : q.moveTo(p[0] + dx, p[1] + dy)));
      // the curl at the head
      const hx = pts[16][0] + dx;
      const hy = pts[16][1] + dy;
      q.quadraticCurveTo(hx + 18, hy - 2, hx + 16, hy - 12);
      q.quadraticCurveTo(hx + 12, hy - 20, hx + 5, hy - 13);
      q.stroke();
    };
    g.save();
    g.beginPath();
    g.rect(tr.x0 - 10, 0, P, P);
    g.clip();
    g.globalAlpha = fade;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = INK.orange;
    g.lineWidth = 6;
    draw(g, OFF.orange[0], OFF.orange[1]);
    g.strokeStyle = INK.key;
    g.lineWidth = 2;
    draw(g, 0, 0);
    g.restore();
  }
}

function drawCloud(g, x, y, s) {
  const path = (q, dx, dy) => {
    q.beginPath();
    q.moveTo(x - 60 * s + dx, y + 14 * s + dy);
    q.bezierCurveTo(x - 76 * s + dx, y - 6 * s + dy, x - 46 * s + dx, y - 24 * s + dy, x - 28 * s + dx, y - 14 * s + dy);
    q.bezierCurveTo(x - 20 * s + dx, y - 44 * s + dy, x + 22 * s + dx, y - 44 * s + dy, x + 26 * s + dx, y - 16 * s + dy);
    q.bezierCurveTo(x + 52 * s + dx, y - 26 * s + dy, x + 76 * s + dx, y + 0 * s + dy, x + 62 * s + dx, y + 14 * s + dy);
    q.closePath();
  };
  g.save();
  g.fillStyle = INK.yellow;
  path(g, -3, 3);
  g.fill();
  g.fillStyle = PAPER;
  path(g, 0, 0);
  g.fill();
  g.strokeStyle = INK.key;
  g.lineWidth = 2.4;
  g.lineJoin = 'round';
  path(g, 2, -1);
  g.stroke();
  g.restore();
}

// -----------------------------------------------------------------------------
// Rider in poster inks: paper-white bird, key mask & bill, misregistered key line
// -----------------------------------------------------------------------------
const RIDER_FILL = {
  plumage: PAPER,
  plumageShade: '#efcf96',
  mask: INK.key,
  bill: INK.key,
  eyeRing: INK.yellow,
  legs: INK.key,
  crest: INK.yellow,
  breast: INK.yellow,
  frame: INK.yellow,
  frameShade: INK.orange,
  metal: INK.key,
  tire: INK.key,
  rim: INK.orange,
  saddle: INK.key,
  outline: INK.key,
  outlineWidth: 0,
  shading: false,
  spokes: 8,
};

function drawPosterRider(kit, g, params, scene) {
  const rig = kit.riderRig(params);
  const pin = { ...(scene.pinwheel || { type: 'three' }), type: 'three', colors: [PAPER, INK.orange] };
  // key plate: a bold silhouette that becomes the outline
  kit.drawRider(g, rig, { ...RIDER_FILL, silhouette: INK.key, lineScale: 1.9, pinwheel: { ...pin } });
  // colour plates, printed a few px off register
  g.save();
  g.translate(-2.5, 2);
  kit.drawRider(g, rig, { ...RIDER_FILL, pinwheel: { ...pin, stroke: INK.key, lineWidth: 0.6 } });
  g.restore();
  // a crisp key eye + bill line on top so the face stays sharp
  g.save();
  g.fillStyle = INK.yellow;
  g.beginPath();
  g.arc(rig.eye.x, rig.eye.y, 3.2, 0, TAU);
  g.fill();
  g.fillStyle = INK.key;
  g.beginPath();
  g.arc(rig.eye.x + 0.4, rig.eye.y, 1.7, 0, TAU);
  g.fill();
  g.restore();
}

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 4.6 : params.rawLocalT;

  const back = bakeBack(kit);
  const tower = bakeTower(kit);
  const front = bakeFront(kit);
  const paper = bakePaper(kit);

  ctx.save();
  ctx.drawImage(back, 0, 0);

  // clouds and the westerly wind, then the downwind rotor behind its tower
  drawCloud(ctx, 905 + ((T * 4) % 200) - 100, 404, 0.8);
  drawWind(ctx, T);
  drawRotor(ctx, T);
  ctx.drawImage(tower, 0, 0);
  drawVolunteers(ctx, T, thumb);

  ctx.drawImage(front, 0, 0);

  // price gag + queue reactions
  drawPrice(ctx, thumb ? 3.2 : T);
  const flipKick = !thumb && T > 2 && T < 6 ? Math.exp(-((T - 2) % 0.5) * 8) : 0;
  drawSoldOut(ctx, T, flipKick);
  drawReader(ctx, T, flipKick);
  if (!thumb) {
    drawBurst(ctx, 806, 598, 1.0, 'DYT!', (T - 4.0) * 6 * (T < 4.7 ? 1 : 0));
    drawBurst(ctx, 470, 598, 0.95, 'DYT DYT!', (T - 5.0) * 6 * (T < 5.8 ? 1 : 0));
  }

  if (kit.riderVisible(params)) drawPosterRider(kit, ctx, params, scene);

  ctx.drawImage(paper, 0, 0);
  ctx.restore();
}
