// src/scenes/agent.js
// #20 · 2026 · AI Agent 走進風機現場 — the finale.
//
// Medium: an operator console — a dark industrial HMI / SCADA panel for turbine WTG-03 on the
// left, a terminal on the right in which the wind-agent-30 agent (Claude + MCP, read-only by
// default) types out its tool calls line by line, and between and behind the glass an offshore
// turbine at night, its nacelle aviation light flashing red in sync with the rest of the array.
//
// Story over the 4 bars:
//   bar 1  get_turbine_status("WTG-03")  -> live readings (the HMI tiles light up as they are read)
//   bar 2  search_sop("A-217")           -> [SOP-GBX-04 §3.2]
//   bar 3  explain_alarm("A-217")        -> likely root cause, with its citation (oil tile + trend lit)
//   bar 4  write_register(40021, 0)      -> ✗ DENIED · read-only by default — a red write packet is
//          stopped by the lock, the console flashes, the on-call engineer's avatar pops up with a
//          thumbs-up, the session timeline completes and first light rises over the sea.
// The spoonbill rides along the top edge of the status bar in neon line-art.

const S = 1000;
const ROAD_Y = 700;
const C = {
  bg: '#0d1117',
  panel: '#161b22',
  panel2: '#0b0f14',
  border: '#30363d',
  border2: '#21262d',
  text: '#e6edf3',
  muted: '#8b949e',
  dim: '#6e7681',
  blue: '#58a6ff',
  cyan: '#79c0ff',
  green: '#7ee787',
  red: '#ff7b72',
  orange: '#f78166',
  amber: '#e3b341',
  yellow: '#d29922',
};
const TAU = Math.PI * 2;

// layout
const TITLE = { x0: 38, y0: 36, x1: 962, y1: 70 };
const HMI = { x0: 38, y0: 82, x1: 394, y1: 472 };
const TERM = { x0: 570, y0: 82, x1: 962, y1: 488 };
const BAR = { y0: ROAD_Y, y1: 738 };
const TL = { x0: 38, y0: 756, x1: 962, y1: 948 };
const HORIZON = 566;
const HUB = { x: 472, y: 216 };
const BLADE_R = 212;

// -----------------------------------------------------------------------------
// text content (Traditional Chinese, Taiwan usage)
// -----------------------------------------------------------------------------
function oilAt(tm) {
  const u = Math.max(0, Math.min(1, (tm + 60) / 68));
  return 70.2 + 8.6 * Math.pow(u, 1.25);
}
const OIL_READ = oilAt(1.0).toFixed(1);

// terminal transcript: each line = { t, kind, segs:[[text, colour]], cps }
//   kind 'cmd' is typed by the agent at `cps`; others stream (high cps) or appear at once (cps 0)
const LINES = [
  { t: -6.5, cps: 0, segs: [['wind-agent-30', C.muted], [' · Claude + MCP · ', C.dim], ['預設唯讀', C.green]] },
  { t: -5.8, cps: 0, segs: [['● ', C.green], ['MCP  scada · sop-library · cmms', C.muted], ['  (read)', C.dim]] },
  { t: 0.05, cps: 42, kind: 'cmd', segs: [['get_turbine_status', C.cyan], ['(', C.text], ['"WTG-03"', C.orange], [')', C.text]] },
  { t: 0.95, cps: 140, segs: [['  → ', C.dim], ['風速 11.2 m/s · 轉速 10.4 rpm · 8.31 MW', C.text]] },
  { t: 1.3, cps: 140, segs: [['    ', C.dim], ['葉片角 2.1° · ', C.text], [`齒輪箱油溫 ${OIL_READ} °C ↑`, C.amber]] },
  { t: 2.05, cps: 42, kind: 'cmd', segs: [['search_sop', C.cyan], ['(', C.text], ['"A-217"', C.orange], [')', C.text]] },
  { t: 2.75, cps: 120, segs: [['  → ', C.dim], ['[SOP-GBX-04 §3.2]', C.blue], [' 齒輪箱油溫偏高：', C.text]] },
  { t: 3.05, cps: 120, segs: [['    ', C.dim], ['檢查冷卻風扇、油冷卻器壓差與濾芯', C.text]] },
  { t: 4.05, cps: 42, kind: 'cmd', segs: [['explain_alarm', C.cyan], ['(', C.text], ['"A-217"', C.orange], [')', C.text]] },
  { t: 4.75, cps: 34, segs: [['  → ', C.dim], ['可能根因：冷卻風扇故障或冷卻器積污', C.text]] },
  { t: 5.45, cps: 60, segs: [['    ', C.dim], ['(依據：', C.muted], ['SOP-GBX-04 §3.2', C.blue], ['，趨勢 +3.1 °C/h)', C.muted]] },
  { t: 6.0, cps: 48, kind: 'cmd', segs: [['write_register', C.cyan], ['(', C.text], ['40021', C.orange], [', ', C.text], ['0', C.orange], [')', C.text]] },
  { t: 6.62, cps: 0, kind: 'deny', segs: [['  ✗ DENIED', C.red], [' · read-only by default', C.red]] },
  { t: 6.95, cps: 60, segs: [['    ', C.dim], ['已升級給值班工程師 → 待人工確認', C.amber]] },
  { t: 7.38, cps: 60, segs: [['  ✓ ', C.green], ['工程師：收到，排程巡檢冷卻風扇', C.green]] },
];
const LINE_H = 21;
const TERM_TOP = TERM.y0 + 46;

const TL_NODES = [
  { t: 0.95, tool: 'get_turbine_status', zh: '讀取狀態', state: 'ok' },
  { t: 2.75, tool: 'search_sop', zh: '查 SOP', state: 'ok' },
  { t: 4.75, tool: 'explain_alarm', zh: '解釋警報 · 附依據', state: 'ok' },
  { t: 6.62, tool: 'write_register', zh: '寫入 · 已攔下', state: 'deny' },
  { t: 7.38, tool: 'handoff', zh: '交給工程師', state: 'human' },
];

const STATIC_TEXT = [
  '齒輪箱油溫偏高可能根因冷卻風扇故障或冷卻器積污依據趨勢已升級給值班工程師待人工確認收到排程巡檢',
  '風速轉速功率葉片角度偏航狀態發電中離岸風機即時監控趨勢分鐘警告跳機控制寫入鎖定唯讀預設',
  '讀取狀態查解釋警報附交給工程師寫入已攔下工作階段時間軸次引用升級最後一步交給人。值班',
  '檢查油冷卻器壓差與濾芯：，（）→↑✓✗●▲°§·',
].join('');

// Kick off loading of the CJK font slices this panel needs (the engine preloads only the
// placard text). Runs at module evaluation, i.e. before boot() awaits document.fonts.ready.
(function preloadFonts() {
  try {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
    for (const spec of ['400 13px "Noto Sans TC"', '500 13px "Noto Sans TC"', '700 13px "Noto Sans TC"', '400 13px "JetBrains Mono"', '700 13px "JetBrains Mono"']) {
      document.fonts.load(spec, STATIC_TEXT + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').catch(() => {});
    }
  } catch (e) {
    /* offline / no FontFaceSet: fall back silently */
  }
})();
function fontsReady() {
  try {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.check) return true;
    return document.fonts.check('500 13px "Noto Sans TC"', '齒輪箱油溫偏高值班工程師');
  } catch (e) {
    return true;
  }
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function sstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function rgbaHex(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}
function setFont(g, size, weight, family) {
  g.font = `${weight} ${size}px ${family}`;
}
function txt(g, s, x, y, size, color, opt = {}) {
  const { weight = 400, family, align = 'left', baseline = 'alphabetic', alpha = 1 } = opt;
  setFont(g, size, weight, family);
  g.textAlign = align;
  g.textBaseline = baseline;
  g.fillStyle = alpha < 1 ? rgbaHex(color, alpha) : color;
  g.fillText(s, x, y);
}
/** LED with a soft halo. */
function led(g, x, y, r, color, on = 1) {
  if (on > 0.01) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 4);
    gr.addColorStop(0, rgbaHex(color, 0.55 * on));
    gr.addColorStop(1, rgbaHex(color, 0));
    g.fillStyle = gr;
    g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  g.fillStyle = on > 0.5 ? color : rgbaHex(color, 0.25 + 0.5 * on);
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
/** typed prefix of `segs` after `n` code points */
function segsPrefix(segs, n) {
  const out = [];
  let rem = n;
  for (const [s, c] of segs) {
    if (rem <= 0) break;
    const cps = Array.from(s);
    if (cps.length <= rem) {
      out.push([s, c]);
      rem -= cps.length;
    } else {
      out.push([cps.slice(0, rem).join(''), c]);
      rem = 0;
    }
  }
  return out;
}
function segsLen(segs) {
  let n = 0;
  for (const [s] of segs) n += Array.from(s).length;
  return n;
}
function drawSegs(g, segs, x, y, size, family, weight = 400) {
  setFont(g, size, weight, family);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  let cx = x;
  for (const [s, c] of segs) {
    g.fillStyle = c;
    g.fillText(s, cx, y);
    cx += g.measureText(s).width;
  }
  return cx;
}

// -----------------------------------------------------------------------------
// live values
// -----------------------------------------------------------------------------
function live(T, kit) {
  const n = (k, sp) => kit.noise1(T * sp + k * 13.7, k) - 0.5;
  const wind = 11.2 + 0.5 * n(1, 0.9);
  const rpm = 10.4 + 0.12 * n(2, 0.6);
  const mw = 8.31 + 0.16 * n(3, 0.7);
  const pitch = 2.1 + 0.3 * n(4, 0.5);
  const oil = oilAt(T) + 0.05 * n(5, 1.3);
  const yaw = 238 + 0.6 * n(6, 0.2);
  return { wind, rpm, mw, pitch, oil, yaw };
}

// -----------------------------------------------------------------------------
// static layers
// -----------------------------------------------------------------------------
function paintNight(kit, g, rng) {
  // sky
  const sky = g.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#04070c');
  sky.addColorStop(0.55, '#081221');
  sky.addColorStop(1, '#14243a');
  g.fillStyle = sky;
  g.fillRect(0, 0, S, HORIZON + 1);
  // stars
  for (let i = 0; i < 260; i++) {
    const x = rng() * S;
    const y = Math.pow(rng(), 1.4) * (HORIZON - 30);
    const r = rng() < 0.06 ? 1.3 : 0.4 + rng() * 0.6;
    const a = (0.25 + rng() * 0.6) * (1 - y / HORIZON * 0.6);
    g.fillStyle = `rgba(220,232,255,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    if (r > 1.2) {
      g.strokeStyle = `rgba(220,232,255,${a * 0.35})`;
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(x - 5, y);
      g.lineTo(x + 5, y);
      g.moveTo(x, y - 5);
      g.lineTo(x, y + 5);
      g.stroke();
    }
  }
  // faint high cloud bands
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 70 + rng() * 30;
    const gr = g.createLinearGradient(0, y - 12, 0, y + 12);
    gr.addColorStop(0, 'rgba(120,150,190,0)');
    gr.addColorStop(0.5, `rgba(120,150,190,${0.025 + rng() * 0.03})`);
    gr.addColorStop(1, 'rgba(120,150,190,0)');
    g.fillStyle = gr;
    g.fillRect(0, y - 12, S, 24);
  }
  // waning gibbous moon low in the gap between the panels (the blades sweep across it)
  {
    const mx = 424;
    const my = 118;
    const halo = g.createRadialGradient(mx, my, 10, mx, my, 120);
    halo.addColorStop(0, 'rgba(200,220,255,0.22)');
    halo.addColorStop(1, 'rgba(200,220,255,0)');
    g.fillStyle = halo;
    g.fillRect(mx - 120, my - 120, 240, 240);
    g.save();
    g.beginPath();
    g.arc(mx, my, 15, 0, TAU);
    g.clip();
    g.fillStyle = '#e9eef6';
    g.fillRect(mx - 16, my - 16, 32, 32);
    // maria
    g.fillStyle = 'rgba(150,165,190,0.35)';
    for (const [dx, dy, r] of [
      [-4, -4, 4],
      [3, 2, 3.2],
      [-6, 5, 2.6],
      [5, -6, 2],
    ]) {
      g.beginPath();
      g.arc(mx + dx, my + dy, r, 0, TAU);
      g.fill();
    }
    // terminator: the dark limb on the right (waning)
    g.fillStyle = 'rgba(8,16,30,0.88)';
    g.beginPath();
    g.ellipse(mx + 17, my, 9, 16, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  // horizon haze
  const hz = g.createLinearGradient(0, HORIZON - 60, 0, HORIZON + 4);
  hz.addColorStop(0, 'rgba(60,90,130,0)');
  hz.addColorStop(1, 'rgba(60,90,130,0.25)');
  g.fillStyle = hz;
  g.fillRect(0, HORIZON - 60, S, 64);
  // sea
  const sea = g.createLinearGradient(0, HORIZON, 0, S);
  sea.addColorStop(0, '#0f1c2d');
  sea.addColorStop(0.3, '#0a1422');
  sea.addColorStop(1, '#04080d');
  g.fillStyle = sea;
  g.fillRect(0, HORIZON, S, S - HORIZON);
  // static swell lines
  for (let i = 0; i < 140; i++) {
    const y = HORIZON + 3 + Math.pow(rng(), 1.6) * (S - HORIZON);
    const len = 8 + (y - HORIZON) * 0.25 * rng();
    const x = rng() * S;
    g.strokeStyle = `rgba(120,160,210,${0.04 + rng() * 0.06})`;
    g.lineWidth = 0.6 + (y - HORIZON) / 400;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
  // moon path on the sea
  {
    for (let y = HORIZON + 4; y < 700; y += 2.6) {
      const f = (y - HORIZON) / (700 - HORIZON);
      const w = 4 + f * 26;
      for (let k = 0; k < 2; k++) {
        const x = 424 + (rng() - 0.5) * w * 2;
        const len = 2 + rng() * (4 + f * 10);
        g.fillStyle = `rgba(210,225,250,${(0.42 - f * 0.22) * (0.4 + 0.6 * rng())})`;
        g.fillRect(x, y, len, 1.2);
      }
    }
  }
  // distant array: small turbines along the horizon (towers only; rotors are animated)
  for (const d of DISTANT) {
    g.strokeStyle = 'rgba(150,170,195,0.45)';
    g.lineWidth = d.h > 40 ? 1.4 : 1;
    g.beginPath();
    g.moveTo(d.x, HORIZON + 1);
    g.lineTo(d.x, HORIZON - d.h);
    g.stroke();
    g.fillStyle = 'rgba(150,170,195,0.55)';
    g.fillRect(d.x - 1.5, HORIZON - d.h - 2, 5, 3);
  }
  // offshore substation on the horizon
  const ox = 776;
  g.fillStyle = 'rgba(120,140,165,0.5)';
  g.fillRect(ox - 24, HORIZON - 22, 48, 13);
  g.fillRect(ox - 18, HORIZON - 30, 22, 8);
  g.fillRect(ox - 20, HORIZON - 9, 3, 9);
  g.fillRect(ox + 16, HORIZON - 9, 3, 9);
  g.strokeStyle = 'rgba(120,140,165,0.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(ox + 10, HORIZON - 22);
  g.lineTo(ox + 26, HORIZON - 40);
  g.stroke();
  for (const [lx, ly] of [
    [ox - 20, HORIZON - 16],
    [ox - 6, HORIZON - 16],
    [ox + 8, HORIZON - 16],
    [ox + 20, HORIZON - 16],
  ]) {
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, 6);
    gr.addColorStop(0, 'rgba(255,236,200,0.8)');
    gr.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = gr;
    g.fillRect(lx - 6, ly - 6, 12, 12);
  }
  paintBigTurbineStatic(g);
}

const DISTANT = [
  { x: 64, h: 30 },
  { x: 132, h: 36 },
  { x: 205, h: 42 },
  { x: 282, h: 34 },
  { x: 352, h: 28 },
  { x: 628, h: 46 },
  { x: 690, h: 38 },
  { x: 858, h: 32 },
  { x: 918, h: 40 },
  { x: 976, h: 30 },
];

function paintBigTurbineStatic(g) {
  // monopile + transition piece (yellow) with platform, boat landing and the turbine ID
  const tx = 500;
  // reflection of the TP in the water (static part)
  const rf = g.createLinearGradient(0, 636, 0, 700);
  rf.addColorStop(0, 'rgba(210,170,60,0.22)');
  rf.addColorStop(1, 'rgba(210,170,60,0)');
  g.fillStyle = rf;
  for (let y = 638; y < 700; y += 3) {
    const w = 15 + Math.sin(y * 0.7) * 4;
    g.fillRect(tx - w + Math.sin(y * 1.3) * 3, y, w * 2, 1.6);
  }
  // monopile
  g.fillStyle = '#1b222b';
  g.fillRect(tx - 15, 624, 30, 14);
  // TP
  const tp = g.createLinearGradient(tx - 16, 0, tx + 16, 0);
  tp.addColorStop(0, '#b38f25');
  tp.addColorStop(0.35, '#d9ae35');
  tp.addColorStop(1, '#6e5714');
  g.fillStyle = tp;
  g.fillRect(tx - 16, 590, 32, 36);
  g.fillStyle = 'rgba(20,16,8,0.9)';
  g.font = '700 11px "JetBrains Mono", monospace';
  g.textAlign = 'center';
  g.fillText('03', tx - 4, 606);
  // boat landing tubes
  g.strokeStyle = '#c49b2c';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(tx + 6, 610);
  g.lineTo(tx + 6, 640);
  g.moveTo(tx + 13, 610);
  g.lineTo(tx + 13, 640);
  g.moveTo(tx + 6, 618);
  g.lineTo(tx + 13, 618);
  g.moveTo(tx + 6, 628);
  g.lineTo(tx + 13, 628);
  g.stroke();
  // platform + railing
  g.fillStyle = '#3a3f46';
  g.fillRect(tx - 30, 588, 60, 4);
  g.strokeStyle = '#d0a83a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(tx - 30, 580);
  g.lineTo(tx + 30, 580);
  for (let x = tx - 30; x <= tx + 30; x += 10) {
    g.moveTo(x, 580);
    g.lineTo(x, 588);
  }
  g.stroke();
  // davit crane
  g.strokeStyle = '#d0a83a';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(tx + 24, 588);
  g.lineTo(tx + 24, 566);
  g.lineTo(tx + 38, 570);
  g.stroke();
  // work lights on the platform
  for (const lx of [tx - 26, tx + 26]) {
    const gr = g.createRadialGradient(lx, 582, 0, lx, 582, 26);
    gr.addColorStop(0, 'rgba(255,220,150,0.55)');
    gr.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = gr;
    g.fillRect(lx - 26, 556, 52, 52);
    g.fillStyle = '#fff3d6';
    g.fillRect(lx - 1.5, 580, 3, 3);
  }
  // tower (moonlit on the left, warm uplight at the base)
  const yTop = 234;
  const yBot = 582;
  const wTop = 7;
  const wBot = 13;
  const tw = g.createLinearGradient(tx - wBot, 0, tx + wBot, 0);
  tw.addColorStop(0, '#9aa6b4');
  tw.addColorStop(0.4, '#6c7785');
  tw.addColorStop(1, '#2b323b');
  g.fillStyle = tw;
  g.beginPath();
  g.moveTo(tx - wTop, yTop);
  g.lineTo(tx + wTop, yTop);
  g.lineTo(tx + wBot, yBot);
  g.lineTo(tx - wBot, yBot);
  g.closePath();
  g.fill();
  const up = g.createLinearGradient(0, yBot - 120, 0, yBot);
  up.addColorStop(0, 'rgba(255,200,120,0)');
  up.addColorStop(1, 'rgba(255,200,120,0.28)');
  g.fillStyle = up;
  g.fill();
  // tower door + flange lines
  g.strokeStyle = 'rgba(20,24,30,0.5)';
  g.lineWidth = 1;
  g.beginPath();
  for (const y of [330, 430, 520]) {
    const f = (y - yTop) / (yBot - yTop);
    const w = wTop + (wBot - wTop) * f;
    g.moveTo(tx - w, y);
    g.lineTo(tx + w, y);
  }
  g.stroke();
  // nacelle (3/4 view: side, top and rear faces)
  const side = g.createLinearGradient(0, 196, 0, 238);
  side.addColorStop(0, '#8c97a4');
  side.addColorStop(1, '#4b5561');
  g.fillStyle = side;
  g.beginPath();
  g.moveTo(480, 198);
  g.lineTo(552, 202);
  g.lineTo(552, 234);
  g.lineTo(484, 238);
  g.quadraticCurveTo(476, 220, 480, 198);
  g.closePath();
  g.fill();
  g.fillStyle = '#a9b3bf';
  g.beginPath();
  g.moveTo(480, 198);
  g.lineTo(492, 190);
  g.lineTo(562, 194);
  g.lineTo(552, 202);
  g.closePath();
  g.fill();
  g.fillStyle = '#39414b';
  g.beginPath();
  g.moveTo(552, 202);
  g.lineTo(562, 194);
  g.lineTo(562, 226);
  g.lineTo(552, 234);
  g.closePath();
  g.fill();
  // cooler on top + helihoist railing at the rear
  g.fillStyle = '#5d6772';
  g.fillRect(506, 184, 22, 8);
  g.strokeStyle = '#7b8693';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let x = 507; x < 528; x += 3) {
    g.moveTo(x, 185);
    g.lineTo(x, 191);
  }
  g.moveTo(534, 186);
  g.lineTo(560, 188);
  for (let x = 536; x <= 558; x += 5.5) {
    g.moveTo(x, 186.2 + (x - 534) * 0.08);
    g.lineTo(x, 193 + (x - 534) * 0.06);
  }
  g.stroke();
  // light mast for the aviation lights
  g.strokeStyle = '#8a95a1';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(546, 192);
  g.lineTo(546, 182);
  g.stroke();
  // seam
  g.strokeStyle = 'rgba(20,24,30,0.45)';
  g.beginPath();
  g.moveTo(520, 200);
  g.lineTo(520, 236);
  g.stroke();
}

/** Static UI chrome: translucent panels, borders, labels. */
function paintChrome(kit, g) {
  const MONO = kit.FONT.mono;
  const SANS = kit.FONT.sans;
  // vignette on the outer margin to seat the console in the screen frame
  const vg = g.createRadialGradient(500, 470, 300, 500, 500, 760);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg;
  g.fillRect(0, 0, S, S);
  // title bar
  roundRect(g, TITLE.x0, TITLE.y0, TITLE.x1 - TITLE.x0, TITLE.y1 - TITLE.y0, 6);
  g.fillStyle = 'rgba(13,17,23,0.86)';
  g.fill();
  g.strokeStyle = C.border;
  g.lineWidth = 1;
  g.stroke();
  // logo glyph: a tiny three-blade rotor
  const lx = TITLE.x0 + 20;
  const ly = (TITLE.y0 + TITLE.y1) / 2;
  g.strokeStyle = C.blue;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * TAU) / 3;
    g.moveTo(lx, ly);
    g.lineTo(lx + Math.cos(a) * 9, ly + Math.sin(a) * 9);
  }
  g.stroke();
  txt(g, 'wind-agent-30', lx + 18, ly + 5, 14, C.text, { weight: 700, family: MONO });
  txt(g, '風機維運主控台 · O&M Console', lx + 142, ly + 5, 13, C.muted, { weight: 500, family: SANS });
  // read-only chip
  const cx = TITLE.x1 - 196;
  roundRect(g, cx, ly - 11, 110, 22, 11);
  g.fillStyle = 'rgba(46,160,67,0.15)';
  g.fill();
  g.strokeStyle = 'rgba(126,231,135,0.6)';
  g.stroke();
  txt(g, 'READ-ONLY', cx + 62, ly + 4.5, 11.5, C.green, { weight: 700, family: MONO, align: 'center' });
  roundRect(g, TITLE.x1 - 78, ly - 11, 64, 22, 11);
  g.fillStyle = 'rgba(88,166,255,0.12)';
  g.fill();
  g.strokeStyle = 'rgba(88,166,255,0.5)';
  g.stroke();
  txt(g, 'MCP 3', TITLE.x1 - 46, ly + 4.5, 11.5, C.blue, { weight: 700, family: MONO, align: 'center' });

  // --- HMI panel ---
  roundRect(g, HMI.x0, HMI.y0, HMI.x1 - HMI.x0, HMI.y1 - HMI.y0, 8);
  g.fillStyle = 'rgba(13,17,23,0.82)';
  g.fill();
  g.strokeStyle = C.border;
  g.stroke();
  // header strip
  g.save();
  roundRect(g, HMI.x0, HMI.y0, HMI.x1 - HMI.x0, HMI.y1 - HMI.y0, 8);
  g.clip();
  g.fillStyle = 'rgba(22,27,34,0.95)';
  g.fillRect(HMI.x0, HMI.y0, HMI.x1 - HMI.x0, 30);
  g.restore();
  g.strokeStyle = C.border2;
  g.beginPath();
  g.moveTo(HMI.x0, HMI.y0 + 30.5);
  g.lineTo(HMI.x1, HMI.y0 + 30.5);
  g.stroke();
  txt(g, 'WTG-03', HMI.x0 + 30, HMI.y0 + 20, 14, C.text, { weight: 700, family: MONO });
  txt(g, '離岸風機 · 即時監控', HMI.x0 + 92, HMI.y0 + 20, 12.5, C.muted, { weight: 500, family: SANS });
  txt(g, 'SCADA', HMI.x1 - 54, HMI.y0 + 20, 11, C.muted, { weight: 700, family: MONO });
  // tiles
  for (const tl of TILES) {
    roundRect(g, tl.x, tl.y, TILE_W, TILE_H, 5);
    g.fillStyle = 'rgba(22,27,34,0.85)';
    g.fill();
    g.strokeStyle = C.border2;
    g.stroke();
    txt(g, tl.zh, tl.x + 10, tl.y + 18, 12, C.muted, { weight: 500, family: SANS });
    setFont(g, 12, 500, SANS);
    const w = g.measureText(tl.zh).width;
    txt(g, tl.en, tl.x + 16 + w, tl.y + 18, 10, C.dim, { family: MONO });
  }
  // trend chart frame
  const ch = CHART;
  roundRect(g, ch.x0, ch.y0, ch.x1 - ch.x0, ch.y1 - ch.y0, 5);
  g.fillStyle = 'rgba(22,27,34,0.85)';
  g.fill();
  g.strokeStyle = C.border2;
  g.stroke();
  txt(g, '齒輪箱油溫 趨勢', ch.x0 + 10, ch.y0 + 17, 12, C.muted, { weight: 500, family: SANS });
  txt(g, 'GBX OIL · 60 min', ch.x0 + 110, ch.y0 + 17, 10, C.dim, { family: MONO });
  // grid + axis labels
  g.lineWidth = 1;
  for (const v of [70, 75, 80]) {
    const y = chartY(v);
    g.strokeStyle = v === 75 ? 'rgba(227,179,65,0.55)' : v === 80 ? 'rgba(255,123,114,0.5)' : 'rgba(110,118,129,0.25)';
    g.setLineDash(v === 70 ? [] : [4, 4]);
    g.beginPath();
    g.moveTo(ch.px0, y + 0.5);
    g.lineTo(ch.px1, y + 0.5);
    g.stroke();
    txt(g, String(v), ch.px0 - 6, y + 4, 10, v === 75 ? C.amber : v === 80 ? C.red : C.dim, { family: MONO, align: 'right' });
  }
  g.setLineDash([]);
  g.strokeStyle = 'rgba(110,118,129,0.18)';
  g.beginPath();
  for (let i = 1; i < 6; i++) {
    const x = ch.px0 + ((ch.px1 - ch.px0) * i) / 6;
    g.moveTo(x + 0.5, ch.py0);
    g.lineTo(x + 0.5, ch.py1);
  }
  g.stroke();
  txt(g, '警告', ch.px0 + 4, chartY(75) - 4, 10, C.amber, { family: SANS, alpha: 0.85 });
  txt(g, '跳機', ch.px0 + 4, chartY(80) - 4, 10, C.red, { family: SANS, alpha: 0.85 });

  // --- terminal ---
  roundRect(g, TERM.x0, TERM.y0, TERM.x1 - TERM.x0, TERM.y1 - TERM.y0, 8);
  g.fillStyle = 'rgba(8,11,16,0.86)';
  g.fill();
  g.strokeStyle = C.border;
  g.stroke();
  g.save();
  roundRect(g, TERM.x0, TERM.y0, TERM.x1 - TERM.x0, TERM.y1 - TERM.y0, 8);
  g.clip();
  g.fillStyle = 'rgba(22,27,34,0.95)';
  g.fillRect(TERM.x0, TERM.y0, TERM.x1 - TERM.x0, 28);
  g.restore();
  g.strokeStyle = C.border2;
  g.beginPath();
  g.moveTo(TERM.x0, TERM.y0 + 28.5);
  g.lineTo(TERM.x1, TERM.y0 + 28.5);
  g.stroke();
  for (const [i, col] of [
    [0, '#ff5f57'],
    [1, '#febc2e'],
    [2, '#28c840'],
  ]) {
    g.fillStyle = rgbaHex(col, 0.75);
    g.beginPath();
    g.arc(TERM.x0 + 16 + i * 16, TERM.y0 + 14, 5, 0, TAU);
    g.fill();
  }
  txt(g, 'claude — wind-agent-30 — 唯讀模式', (TERM.x0 + TERM.x1) / 2 + 20, TERM.y0 + 19, 12, C.muted, { weight: 500, family: MONO, align: 'center' });

  // --- status bar (its top edge is the road) ---
  g.fillStyle = 'rgba(8,11,16,0.94)';
  g.fillRect(0, BAR.y0, S, BAR.y1 - BAR.y0);
  g.fillStyle = 'rgba(88,166,255,0.08)';
  g.fillRect(0, BAR.y0, S, 3);
  g.strokeStyle = C.border;
  g.beginPath();
  g.moveTo(0, BAR.y1 - 0.5);
  g.lineTo(S, BAR.y1 - 0.5);
  g.stroke();
  const by = BAR.y0 + 24;
  txt(g, '唯讀 READ-ONLY', 66, by, 12, C.green, { weight: 700, family: MONO });
  txt(g, '│', 196, by, 12, C.border, { family: MONO });
  txt(g, 'MCP', 214, by, 12, C.muted, { weight: 700, family: MONO });
  txt(g, 'scada', 260, by, 12, C.text, { family: MONO });
  txt(g, 'sop-library', 328, by, 12, C.text, { family: MONO });
  txt(g, 'cmms', 438, by, 12, C.text, { family: MONO });
  txt(g, '│', 488, by, 12, C.border, { family: MONO });
  txt(g, 'WTG-03', 506, by, 12, C.text, { weight: 700, family: MONO });
  txt(g, '│', 774, by, 12, C.border, { family: MONO });
  txt(g, 'UTC+8', 930, by, 12, C.muted, { family: MONO, align: 'right' });

  // --- session timeline ---
  roundRect(g, TL.x0, TL.y0, TL.x1 - TL.x0, TL.y1 - TL.y0, 8);
  g.fillStyle = 'rgba(13,17,23,0.8)';
  g.fill();
  g.strokeStyle = C.border;
  g.stroke();
  txt(g, 'SESSION', TL.x0 + 18, TL.y0 + 26, 12, C.muted, { weight: 700, family: MONO });
  txt(g, '工作階段時間軸', TL.x0 + 84, TL.y0 + 26, 12.5, C.muted, { weight: 500, family: SANS });
  txt(g, 'read · cite · hand off', TL.x1 - 18, TL.y0 + 26, 11.5, C.dim, { family: MONO, align: 'right' });
  // rail
  g.strokeStyle = 'rgba(110,118,129,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(TL_X[0], TL_NODE_Y);
  g.lineTo(TL_X[TL_X.length - 1], TL_NODE_Y);
  g.stroke();
  for (let i = 0; i < TL_NODES.length; i++) {
    const nd = TL_NODES[i];
    g.fillStyle = C.bg;
    g.beginPath();
    g.arc(TL_X[i], TL_NODE_Y, 9, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(110,118,129,0.6)';
    g.lineWidth = 1.5;
    g.stroke();
    txt(g, nd.tool, TL_X[i], TL_NODE_Y + 32, 11.5, C.dim, { family: MONO, align: 'center' });
  }
}

// HMI tile geometry
const TILE_W = 167;
const TILE_H = 58;
const TILES = [
  { key: 'wind', zh: '風速', en: 'WIND', unit: 'm/s', x: 50, y: 124 },
  { key: 'rpm', zh: '轉子轉速', en: 'ROTOR', unit: 'rpm', x: 50 + TILE_W + 8, y: 124 },
  { key: 'mw', zh: '有效功率', en: 'POWER', unit: 'MW', x: 50, y: 124 + TILE_H + 8 },
  { key: 'pitch', zh: '葉片角度', en: 'PITCH', unit: '°', x: 50 + TILE_W + 8, y: 124 + TILE_H + 8 },
  { key: 'oil', zh: '齒輪箱油溫', en: 'GBX OIL', unit: '°C', x: 50, y: 124 + (TILE_H + 8) * 2 },
  { key: 'yaw', zh: '偏航 / 狀態', en: 'YAW', unit: '°', x: 50 + TILE_W + 8, y: 124 + (TILE_H + 8) * 2 },
];
const CHART = { x0: 50, y0: 324, x1: 382, y1: 410 };
CHART.px0 = CHART.x0 + 30;
CHART.px1 = CHART.x1 - 10;
CHART.py0 = CHART.y0 + 24;
CHART.py1 = CHART.y1 - 8;
function chartY(v) {
  const lo = 68;
  const hi = 82;
  return CHART.py1 - ((v - lo) / (hi - lo)) * (CHART.py1 - CHART.py0);
}
const ALARM = { x0: 50, y0: 418, x1: 382, y1: 440 };
const LOCK = { x0: 50, y0: 444, x1: 382, y1: 464 };
const TL_X = [140, 320, 500, 680, 860];
const TL_NODE_Y = TL.y0 + 74;

// -----------------------------------------------------------------------------
// dynamic drawing
// -----------------------------------------------------------------------------
function blink(T, period = 1, duty = 0.5, phase = 0) {
  const f = (((T + phase) / period) % 1 + 1) % 1;
  return f < duty ? 1 : 0;
}

function drawDistantRotors(g, T) {
  g.strokeStyle = 'rgba(170,188,210,0.55)';
  g.lineWidth = 0.9;
  g.beginPath();
  for (let i = 0; i < DISTANT.length; i++) {
    const d = DISTANT[i];
    const hx = d.x + 0.5;
    const hy = HORIZON - d.h - 1;
    const r = d.h * 0.48;
    const a0 = -T * (1.0 + 0.08 * (i % 3)) + i * 1.7;
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * TAU) / 3;
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.cos(a) * r * 0.6, hy + Math.sin(a) * r);
    }
  }
  g.stroke();
}

/** Aviation obstruction lights of the whole array flash in sync (beats 1 and 3 of each bar). */
function aviationOn(T) {
  const f = ((T % 1) + 1) % 1;
  return f < 0.38 ? 1 - f / 0.6 : 0;
}

function drawRedLights(g, T) {
  const on = aviationOn(T);
  if (on <= 0) return;
  for (const d of DISTANT) {
    const x = d.x + 1;
    const y = HORIZON - d.h - 3;
    const gr = g.createRadialGradient(x, y, 0, x, y, 9);
    gr.addColorStop(0, `rgba(255,70,60,${0.9 * on})`);
    gr.addColorStop(1, 'rgba(255,70,60,0)');
    g.fillStyle = gr;
    g.fillRect(x - 9, y - 9, 18, 18);
    // reflection streak
    g.fillStyle = `rgba(255,70,60,${0.18 * on})`;
    for (let k = 0; k < 6; k++) g.fillRect(x - 1.5 + Math.sin(k * 2.1 + T * 3) * 1.2, HORIZON + 4 + k * 5, 3, 2.2);
  }
}

function drawBigTurbine(g, T) {
  // rotor: clockwise seen from upwind, ~10.4 rpm
  const a0 = -T * 1.09 + 0.6;
  const hx = { x: 0.6, y: 0.07 };
  for (let k = 0; k < 3; k++) {
    const a = a0 + (k * TAU) / 3;
    const ex = Math.cos(a) * hx.x;
    const ey = Math.cos(a) * hx.y - Math.sin(a);
    const L = Math.hypot(ex, ey) || 1;
    const ux = ex / L;
    const uy = ey / L;
    const nx = -uy;
    const ny = ux;
    const len = BLADE_R * L;
    // chord profile (leading edge straight, trailing edge bellied near the root)
    const prof = [
      [0.05, 5],
      [0.12, 10],
      [0.22, 12.5],
      [0.4, 10],
      [0.6, 7.5],
      [0.8, 5],
      [0.95, 3],
      [1.0, 1.2],
    ];
    const pts = [];
    for (const [f, w] of prof) pts.push({ x: HUB.x + ux * len * f + nx * w * 0.35, y: HUB.y + uy * len * f + ny * w * 0.35 });
    for (let i = prof.length - 1; i >= 0; i--) {
      const [f, w] = prof[i];
      pts.push({ x: HUB.x + ux * len * f - nx * w, y: HUB.y + uy * len * f - ny * w });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    const shade = 0.55 + 0.35 * Math.max(0, -Math.sin(a + 0.6));
    g.fillStyle = `rgba(${Math.round(150 * shade + 40)},${Math.round(160 * shade + 40)},${Math.round(172 * shade + 42)},0.95)`;
    g.fill();
    g.strokeStyle = 'rgba(15,20,26,0.6)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  // spinner
  const sp = g.createRadialGradient(HUB.x - 4, HUB.y - 5, 1, HUB.x, HUB.y, 15);
  sp.addColorStop(0, '#c9d2dc');
  sp.addColorStop(1, '#5a6470');
  g.fillStyle = sp;
  g.beginPath();
  g.moveTo(HUB.x - 16, HUB.y + 2);
  g.quadraticCurveTo(HUB.x - 12, HUB.y - 13, HUB.x + 6, HUB.y - 15);
  g.lineTo(HUB.x + 9, HUB.y + 15);
  g.quadraticCurveTo(HUB.x - 10, HUB.y + 13, HUB.x - 16, HUB.y + 2);
  g.closePath();
  g.fill();
  // nacelle aviation light (red, flashing in sync with the array)
  const on = aviationOn(T);
  const lx = 546;
  const ly = 180;
  g.fillStyle = on > 0 ? '#ff5a4e' : '#5a2a28';
  g.beginPath();
  g.arc(lx, ly, 2.4, 0, TAU);
  g.fill();
  if (on > 0) {
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, 34);
    gr.addColorStop(0, `rgba(255,80,64,${0.75 * on})`);
    gr.addColorStop(0.3, `rgba(255,80,64,${0.25 * on})`);
    gr.addColorStop(1, 'rgba(255,80,64,0)');
    g.fillStyle = gr;
    g.fillRect(lx - 34, ly - 34, 68, 68);
    // faint red cast on the nacelle top
    g.fillStyle = `rgba(255,80,64,${0.12 * on})`;
    g.beginPath();
    g.moveTo(480, 198);
    g.lineTo(492, 190);
    g.lineTo(562, 194);
    g.lineTo(552, 202);
    g.closePath();
    g.fill();
  }
}

function drawSeaShimmer(g, T, kit) {
  g.lineWidth = 1;
  for (let i = 0; i < 46; i++) {
    const r1 = kit.hash11(i * 3.1);
    const r2 = kit.hash11(i * 7.7);
    const y = HORIZON + 6 + Math.pow(r1, 1.3) * (S - HORIZON - 10);
    const len = 10 + (y - HORIZON) * 0.22 * r2;
    const x = ((r2 * 1400 + T * (8 + 20 * r1)) % 1100) - 50;
    const a = 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(T * 2.2 + i));
    g.strokeStyle = `rgba(140,180,230,${a})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
}

function drawHMI(g, T, kit, MONO, SANS, thumb) {
  const v = live(T, kit);
  // header LED: RUN
  led(g, HMI.x0 + 16, HMI.y0 + 15, 4, C.green, 1);
  led(g, HMI.x1 - 66, HMI.y0 + 15, 3, C.green, blink(T, 1, 0.5));
  // tile "being read" highlight after get_turbine_status returns
  const readK = (i) => (thumb ? 0 : sstep(0.95 + i * 0.07, 1.05 + i * 0.07, T) * (1 - sstep(1.7, 2.3, T)));
  const citeK = thumb ? 0 : sstep(4.75, 4.95, T) * (1 - sstep(6.4, 6.8, T));
  const fmt = {
    wind: v.wind.toFixed(1),
    rpm: v.rpm.toFixed(1),
    mw: v.mw.toFixed(2),
    pitch: v.pitch.toFixed(1),
    oil: v.oil.toFixed(1),
    yaw: v.yaw.toFixed(0),
  };
  for (let i = 0; i < TILES.length; i++) {
    const tl = TILES[i];
    const isOil = tl.key === 'oil';
    const rk = readK(i);
    if (rk > 0.01) {
      roundRect(g, tl.x + 0.5, tl.y + 0.5, TILE_W - 1, TILE_H - 1, 5);
      g.strokeStyle = rgbaHex(C.blue, 0.85 * rk);
      g.lineWidth = 1.5;
      g.stroke();
      txt(g, 'READ', tl.x + TILE_W - 8, tl.y + 16, 9.5, C.blue, { weight: 700, family: MONO, align: 'right', alpha: rk });
    }
    if (isOil) {
      roundRect(g, tl.x + 0.5, tl.y + 0.5, TILE_W - 1, TILE_H - 1, 5);
      g.strokeStyle = rgbaHex(C.amber, 0.45 + 0.45 * citeK);
      g.lineWidth = 1 + citeK;
      g.stroke();
    }
    const col = isOil ? C.amber : C.text;
    const vx = tl.x + 10;
    const vy = tl.y + 46;
    txt(g, fmt[tl.key], vx, vy, 23, col, { weight: 700, family: MONO });
    setFont(g, 23, 700, MONO);
    const w = g.measureText(fmt[tl.key]).width;
    txt(g, tl.unit, vx + w + 5, vy, 12, C.muted, { family: MONO });
    if (isOil) txt(g, '↑', vx + w + 30, vy, 15, C.amber, { weight: 700, family: MONO });
    if (tl.key === 'yaw') {
      // status chip
      roundRect(g, tl.x + TILE_W - 70, tl.y + 30, 60, 20, 10);
      g.fillStyle = 'rgba(46,160,67,0.18)';
      g.fill();
      txt(g, '發電中', tl.x + TILE_W - 40, tl.y + 44.5, 11.5, C.green, { weight: 500, family: SANS, align: 'center' });
    }
    if (tl.key === 'mw') {
      // load bar against rated 9.5 MW
      const bx = tl.x + TILE_W - 58;
      const byy = tl.y + 38;
      g.fillStyle = 'rgba(110,118,129,0.25)';
      g.fillRect(bx, byy, 48, 5);
      g.fillStyle = C.blue;
      g.fillRect(bx, byy, 48 * (v.mw / 9.5), 5);
      txt(g, '/ 9.5', bx + 48, byy - 4, 9.5, C.dim, { family: MONO, align: 'right' });
    }
    if (tl.key === 'wind' || tl.key === 'rpm') {
      // tiny sparkline
      const bx = tl.x + TILE_W - 60;
      const byy = tl.y + 42;
      g.strokeStyle = rgbaHex(C.blue, 0.7);
      g.lineWidth = 1.2;
      g.beginPath();
      for (let k = 0; k <= 16; k++) {
        const tt = T - (16 - k) * 0.25;
        const val = tl.key === 'wind' ? kit.noise1(tt * 0.9 + 13.7, 1) : kit.noise1(tt * 0.6 + 27.4, 2);
        const x = bx + k * 3.2;
        const y = byy - val * 14;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  // trend chart: oil temperature, one sample per "minute", scrolling
  const ch = CHART;
  const n = 60;
  const dx = (ch.px1 - ch.px0) / n;
  const frac = T - Math.floor(T);
  g.save();
  g.beginPath();
  g.rect(ch.px0, ch.py0 - 4, ch.px1 - ch.px0, ch.py1 - ch.py0 + 8);
  g.clip();
  g.beginPath();
  let lastX = 0;
  let lastY = 0;
  const pts = [];
  for (let k = 0; k <= n + 1; k++) {
    const tm = Math.floor(T) - n + k;
    const val = oilAt(tm) + 0.25 * (kit.hash11(tm * 1.37) - 0.5);
    const x = ch.px0 + (k - frac) * dx;
    const y = chartY(val);
    pts.push({ x, y });
  }
  // area under the curve
  g.moveTo(pts[0].x, ch.py1);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.lineTo(pts[pts.length - 1].x, ch.py1);
  g.closePath();
  const ag = g.createLinearGradient(0, ch.py0, 0, ch.py1);
  ag.addColorStop(0, 'rgba(227,179,65,0.28)');
  ag.addColorStop(1, 'rgba(227,179,65,0.02)');
  g.fillStyle = ag;
  g.fill();
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) g.moveTo(pts[i].x, pts[i].y);
    else g.lineTo(pts[i].x, pts[i].y);
  }
  g.strokeStyle = C.amber;
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();
  // live point at the right edge
  const ly = chartY(v.oil);
  lastX = ch.px1;
  lastY = ly;
  led(g, lastX, lastY, 2.8, C.amber, 0.6 + 0.4 * blink(T, 0.5, 0.5));
  if (citeK > 0.01) {
    // the agent's citation tag pinned to the chart
    g.globalAlpha = citeK;
    roundRect(g, ch.x1 - 116, ch.y0 + 4, 106, 17, 8);
    g.fillStyle = 'rgba(88,166,255,0.16)';
    g.fill();
    g.strokeStyle = rgbaHex(C.blue, 0.7);
    g.lineWidth = 1;
    g.stroke();
    txt(g, '依據 SOP-GBX-04', ch.x1 - 63, ch.y0 + 16.5, 10, C.blue, { weight: 500, family: MONO, align: 'center' });
    g.globalAlpha = 1;
  }
  // alarm row (acknowledged by the on-call engineer once the agent has handed over)
  const al = ALARM;
  const ack = thumb || T >= 7.5;
  const ab = ack ? 1 : blink(T, 1, 0.5);
  roundRect(g, al.x0, al.y0, al.x1 - al.x0, al.y1 - al.y0, 4);
  g.fillStyle = `rgba(227,179,65,${ack ? 0.08 : 0.1 + 0.08 * ab})`;
  g.fill();
  g.strokeStyle = rgbaHex(C.amber, ack ? 0.45 : 0.55 + 0.3 * ab);
  g.lineWidth = 1;
  g.stroke();
  led(g, al.x0 + 12, (al.y0 + al.y1) / 2, 3.5, C.amber, ack ? 0.7 : ab);
  txt(g, 'A-217', al.x0 + 24, al.y0 + 15.5, 11.5, C.amber, { weight: 700, family: MONO });
  txt(g, '齒輪箱油溫偏高', al.x0 + 72, al.y0 + 15.5, 12, C.text, { weight: 500, family: SANS });
  if (ack) {
    roundRect(g, al.x1 - 108, al.y0 + 3, 100, 16, 8);
    g.fillStyle = 'rgba(46,160,67,0.2)';
    g.fill();
    txt(g, 'ACK · 值班工程師', al.x1 - 58, al.y0 + 15, 10, C.green, { weight: 700, family: SANS, align: 'center' });
  } else {
    txt(g, `${v.oil.toFixed(1)} > 75.0 °C`, al.x1 - 8, al.y0 + 15.5, 11, C.amber, { family: MONO, align: 'right' });
  }
  // control-write lock row: flashes red when the agent's write is denied
  const lk = LOCK;
  const denyK = thumb ? 0.85 : (T >= 6.62 ? (1 - sstep(7.6, 8.4, T)) * (0.55 + 0.45 * blink(T - 6.62, 0.25, 0.5)) : 0);
  roundRect(g, lk.x0, lk.y0, lk.x1 - lk.x0, lk.y1 - lk.y0, 4);
  g.fillStyle = denyK > 0 ? `rgba(255,123,114,${0.12 + 0.2 * denyK})` : 'rgba(22,27,34,0.85)';
  g.fill();
  g.strokeStyle = denyK > 0 ? rgbaHex(C.red, 0.5 + 0.5 * denyK) : C.border2;
  g.stroke();
  drawLock(g, lk.x0 + 13, (lk.y0 + lk.y1) / 2 + 1, denyK > 0 ? C.red : C.muted, 0.8);
  txt(g, '控制寫入', lk.x0 + 26, lk.y0 + 14.5, 11.5, denyK > 0 ? C.text : C.muted, { weight: 500, family: SANS });
  txt(g, 'CONTROL WRITE', lk.x0 + 82, lk.y0 + 14.5, 9.5, C.dim, { family: MONO });
  txt(g, denyK > 0 ? 'BLOCKED · 唯讀' : 'LOCKED · 唯讀', lk.x1 - 8, lk.y0 + 14.5, 10.5, denyK > 0 ? C.red : C.muted, { weight: 700, family: MONO, align: 'right' });
}

function drawLock(g, x, y, color, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(0, -4, 4, Math.PI, 0);
  g.lineTo(4, -1);
  g.moveTo(-4, -1);
  g.lineTo(-4, -4);
  g.stroke();
  roundRect(g, -6, -1, 12, 9, 2);
  g.fill();
  g.restore();
}

function drawTerminal(g, T, MONO, thumb) {
  const x0 = TERM.x0 + 14;
  let cursor = null;
  let lastVisible = -1;
  for (let i = 0; i < LINES.length; i++) {
    const ln = LINES[i];
    if (T < ln.t) break;
    lastVisible = i;
    const y = TERM_TOP + i * LINE_H;
    const total = segsLen(ln.segs);
    let shown = total;
    if (ln.cps > 0) shown = Math.min(total, Math.floor((T - ln.t) * ln.cps + 1e-6));
    let x = x0;
    if (ln.kind === 'cmd') {
      txt(g, '>', x, y, 13.5, C.green, { weight: 700, family: MONO });
      x += 14;
    }
    if (ln.kind === 'deny') {
      // flashing red block behind the DENIED line (3 flashes on the beat)
      const fl = thumb ? 1 : T < 7.4 ? blink(T - 6.62, 0.25, 0.55) : 0.35;
      g.fillStyle = `rgba(255,123,114,${0.1 + 0.22 * fl})`;
      g.fillRect(TERM.x0 + 6, y - 15, TERM.x1 - TERM.x0 - 12, 20);
      g.fillStyle = rgbaHex(C.red, 0.9);
      g.fillRect(TERM.x0 + 6, y - 15, 3, 20);
    }
    const segs = segsPrefix(ln.segs, shown);
    const xe = drawSegs(g, segs, x, y, 13.5, MONO, ln.kind === 'deny' ? 700 : 400);
    if (shown < total) cursor = { x: xe + 1, y, typing: true };
    else if (ln.kind === 'cmd' && i === LINES.length - 1) cursor = { x: xe + 1, y, typing: false };
  }
  // idle prompt + blinking cursor (blinks on the beat)
  if (!cursor) {
    const nextLine = lastVisible + 1;
    const y = TERM_TOP + nextLine * LINE_H;
    // the prompt sits on the next free row while waiting for the next command
    const nxt = LINES[nextLine];
    const waitingForCmd = !nxt || nxt.kind === 'cmd';
    if (lastVisible < 0) {
      // console just opened: a bare cursor waits on the first row
      cursor = { x: x0, y, typing: false };
    } else if (waitingForCmd && y < TERM.y1 - 6) {
      txt(g, '>', x0, y, 13.5, C.green, { weight: 700, family: MONO });
      cursor = { x: x0 + 14, y, typing: false };
    }
  }
  if (cursor) {
    const on = cursor.typing || thumb ? 1 : blink(T, 0.5, 0.5);
    if (on) {
      g.fillStyle = rgbaHex(C.text, 0.85);
      g.fillRect(cursor.x, cursor.y - 12, 7.5, 15);
    }
  }
  // "thinking" spinner between a command and its result
  for (let i = 0; i < LINES.length; i++) {
    const ln = LINES[i];
    const nx = LINES[i + 1];
    if (ln.kind !== 'cmd' || !nx) continue;
    const typedAt = ln.t + segsLen(ln.segs) / ln.cps;
    if (T > typedAt + 0.05 && T < nx.t && !thumb) {
      const y = TERM_TOP + (i + 1) * LINE_H;
      const fr = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
      const ch = Array.from(fr)[Math.floor(T * 12) % 10];
      txt(g, `  ${ch} 呼叫 MCP 工具…`, x0, y, 13, C.dim, { family: MONO });
    }
  }
}

/** Data link between the terminal and the turbine: read packets flow in, the write is stopped. */
function drawLink(g, T, thumb) {
  if (thumb) return;
  const A = { x: TERM.x0, y: TERM_TOP + 3 * LINE_H - 4 };
  const B = { x: 528, y: 206 };
  // only get_turbine_status touches the turbine (SCADA read); the SOP look-ups stay in the library
  const reads = [[0.5, 1.25, TERM_TOP + 2 * LINE_H - 4]];
  for (const [t0, t1, yy] of reads) {
    const k = clamp01((T - t0) / (t1 - t0));
    const vis = sstep(t0 - 0.1, t0, T) * (1 - sstep(t1, t1 + 0.4, T));
    if (vis <= 0) continue;
    const a = { x: A.x, y: yy };
    g.strokeStyle = rgbaHex(C.blue, 0.35 * vis);
    g.setLineDash([3, 5]);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(B.x, B.y);
    g.lineTo(a.x, a.y);
    g.stroke();
    g.setLineDash([]);
    // packets travelling from the turbine to the agent
    for (let p = 0; p < 3; p++) {
      const u = clamp01(k * 1.3 - p * 0.15);
      if (u <= 0 || u >= 1) continue;
      const x = B.x + (a.x - B.x) * u;
      const y = B.y + (a.y - B.y) * u;
      led(g, x, y, 2.4, C.cyan, vis);
    }
  }
  // the write attempt: a red packet heads for the turbine and is stopped by the lock
  if (T > 6.3 && T < 8.6) {
    const a = { x: A.x, y: TERM_TOP + 11 * LINE_H - 4 };
    const stop = 0.42;
    const u = Math.min(stop, ((T - 6.3) / 0.32) * stop);
    const mx = a.x + (B.x - a.x) * stop;
    const my = a.y + (B.y - a.y) * stop;
    const vis = 1 - sstep(7.8, 8.6, T);
    g.strokeStyle = rgbaHex(C.red, 0.4 * vis);
    g.setLineDash([3, 5]);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(mx, my);
    g.stroke();
    g.setLineDash([]);
    const x = a.x + (B.x - a.x) * u;
    const y = a.y + (B.y - a.y) * u;
    if (T < 6.62) led(g, x, y, 3, C.red, 1);
    if (T >= 6.55) {
      // shield with a lock where the packet stopped
      const k = sstep(6.55, 6.7, T) * vis;
      const fl = T < 7.4 ? 0.6 + 0.4 * blink(T - 6.62, 0.25, 0.5) : 0.7;
      g.save();
      g.translate(mx, my);
      g.globalAlpha = k;
      const r = 17 + 3 * (1 - sstep(6.62, 6.9, T));
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
      gr.addColorStop(0, `rgba(255,123,114,${0.35 * fl})`);
      gr.addColorStop(1, 'rgba(255,123,114,0)');
      g.fillStyle = gr;
      g.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
      g.beginPath();
      g.moveTo(0, -r);
      g.quadraticCurveTo(r * 0.9, -r * 0.8, r * 0.85, -r * 0.1);
      g.quadraticCurveTo(r * 0.7, r * 0.7, 0, r);
      g.quadraticCurveTo(-r * 0.7, r * 0.7, -r * 0.85, -r * 0.1);
      g.quadraticCurveTo(-r * 0.9, -r * 0.8, 0, -r);
      g.closePath();
      g.fillStyle = 'rgba(13,17,23,0.9)';
      g.fill();
      g.strokeStyle = C.red;
      g.lineWidth = 1.6;
      g.stroke();
      drawLock(g, 0, 1, C.red, 1);
      g.restore();
      g.globalAlpha = 1;
    }
  }
}

/** The on-call engineer pops up and gives a thumbs-up (bar 4, beat 3). */
function drawEngineer(g, T, SANS, MONO) {
  const k = sstep(7.3, 7.5, T);
  if (k <= 0) return;
  const pop = 1 + 0.12 * Math.sin(clamp01((T - 7.3) / 0.35) * Math.PI);
  const cx = 482;
  const cy = 520;
  g.save();
  g.translate(cx, cy);
  g.scale(pop * (0.85 + 0.15 * k), pop * (0.85 + 0.15 * k));
  g.globalAlpha = k;
  // card
  roundRect(g, -78, -26, 156, 52, 26);
  g.fillStyle = 'rgba(13,17,23,0.92)';
  g.fill();
  g.strokeStyle = rgbaHex(C.green, 0.8);
  g.lineWidth = 1.4;
  g.stroke();
  // avatar: face + hard hat
  const ax = -52;
  g.fillStyle = '#1f2a36';
  g.beginPath();
  g.arc(ax, 0, 20, 0, TAU);
  g.fill();
  g.fillStyle = '#e0b48c';
  g.beginPath();
  g.arc(ax, 3, 9.5, 0, TAU);
  g.fill();
  g.fillStyle = '#f2c230';
  g.beginPath();
  g.arc(ax, -2, 11, Math.PI, 0);
  g.closePath();
  g.fill();
  g.fillRect(ax - 13, -3, 26, 3);
  g.fillStyle = '#c99a17';
  g.fillRect(ax - 1.2, -12, 2.4, 9);
  g.fillStyle = '#2b2f36';
  g.fillRect(ax - 4.5, 3, 2, 2);
  g.fillRect(ax + 2.5, 3, 2, 2);
  g.strokeStyle = '#2b2f36';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(ax, 6, 3.5, 0.3, Math.PI - 0.3);
  g.stroke();
  // shoulders (hi-vis vest)
  g.save();
  g.beginPath();
  g.arc(ax, 0, 20, 0, TAU);
  g.clip();
  g.fillStyle = '#f07c1b';
  g.beginPath();
  g.ellipse(ax, 22, 15, 9, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#e8eef3';
  g.fillRect(ax - 9, 15, 3, 10);
  g.fillRect(ax + 6, 15, 3, 10);
  g.restore();
  // thumbs-up hand (the thumb rises on the beat at 7.5)
  const th = sstep(7.42, 7.6, T);
  g.save();
  g.translate(ax + 28, 6);
  g.fillStyle = '#e8bb92';
  g.strokeStyle = 'rgba(90,55,30,0.65)';
  g.lineWidth = 0.9;
  // fist
  roundRect(g, -7, -5, 14, 13, 4);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(-7, -0.5);
  g.lineTo(5, -0.5);
  g.moveTo(-7, 3.5);
  g.lineTo(5, 3.5);
  g.stroke();
  // thumb: folded along the fist, then up
  g.save();
  g.translate(-3, -4);
  g.rotate(-1.45 * (1 - th));
  roundRect(g, -3, -12, 6.5, 13, 3.2);
  g.fill();
  g.stroke();
  g.restore();
  // cuff (hi-vis sleeve)
  g.fillStyle = '#f07c1b';
  g.fillRect(-8, 8, 16, 6);
  g.restore();
  txt(g, '值班工程師', -12, -4, 12.5, C.text, { weight: 700, family: SANS });
  txt(g, '收到，我來處理', -12, 14, 11.5, C.green, { weight: 500, family: SANS });
  g.restore();
}

function drawStatusAndTimeline(g, T, kit, MONO, SANS, thumb) {
  const by = BAR.y0 + 24;
  led(g, 54, by - 4, 3.5, C.green, 1);
  for (const [x, ok] of [
    [252, 1],
    [320, 1],
    [430, 1],
  ]) led(g, x, by - 4, 2.6, C.green, ok);
  // alarm indicator
  const ab = blink(T, 1, 0.5);
  txt(g, '▲ A-217', 568, by, 12, C.amber, { weight: 700, family: MONO, alpha: 0.6 + 0.4 * ab });
  // session state
  const st = thumb || T >= 7.38 ? ['✓ 已交給工程師', C.green] : T >= 6.62 ? ['✗ 寫入已攔下', C.red] : T >= 0 ? ['● 分析中', C.blue] : ['○ 待命', C.muted];
  txt(g, st[0], 646, by, 12, st[1], { weight: 700, family: SANS });
  // clock 04:52:00 + T
  const secs = Math.max(0, Math.floor(4 * 3600 + 52 * 60 + 8 + T));
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  txt(g, `${hh}:${mm}:${ss}`, 868, by, 12, C.text, { family: MONO, align: 'right' });

  // session timeline: progress rail + nodes lighting up on the bars
  const tNow = thumb ? 9 : T;
  let prog = 0;
  for (let i = 0; i < TL_NODES.length; i++) if (tNow >= TL_NODES[i].t) prog = i;
  let px = TL_X[0];
  if (tNow >= TL_NODES[0].t) {
    const i = prog;
    const nextT = i + 1 < TL_NODES.length ? TL_NODES[i + 1].t : TL_NODES[i].t;
    const f = i + 1 < TL_NODES.length ? clamp01((tNow - TL_NODES[i].t) / (nextT - TL_NODES[i].t)) : 0;
    px = TL_X[i] + (i + 1 < TL_X.length ? (TL_X[i + 1] - TL_X[i]) * f * 0.92 : 0);
    const gr = g.createLinearGradient(TL_X[0], 0, px, 0);
    gr.addColorStop(0, rgbaHex(C.blue, 0.5));
    gr.addColorStop(1, C.blue);
    g.strokeStyle = gr;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(TL_X[0], TL_NODE_Y);
    g.lineTo(px, TL_NODE_Y);
    g.stroke();
    led(g, px, TL_NODE_Y, 2.5, C.cyan, 1);
  }
  for (let i = 0; i < TL_NODES.length; i++) {
    const nd = TL_NODES[i];
    const k = thumb ? 1 : sstep(nd.t, nd.t + 0.15, T);
    if (k <= 0) {
      txt(g, nd.zh, TL_X[i], TL_NODE_Y + 52, 12.5, C.dim, { weight: 500, family: SANS, align: 'center' });
      continue;
    }
    const col = nd.state === 'deny' ? C.red : nd.state === 'human' ? C.green : C.blue;
    const pulse = 1 + 0.5 * (1 - clamp01((T - nd.t) / 0.4)) * (thumb ? 0 : 1);
    g.fillStyle = rgbaHex(col, 0.2 * k);
    g.beginPath();
    g.arc(TL_X[i], TL_NODE_Y, 14 * pulse, 0, TAU);
    g.fill();
    g.fillStyle = col;
    g.globalAlpha = k;
    g.beginPath();
    g.arc(TL_X[i], TL_NODE_Y, 9, 0, TAU);
    g.fill();
    // glyph in the node
    g.strokeStyle = C.bg;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    const cx = TL_X[i];
    const cy = TL_NODE_Y;
    if (nd.state === 'deny') {
      g.moveTo(cx - 3.5, cy - 3.5);
      g.lineTo(cx + 3.5, cy + 3.5);
      g.moveTo(cx + 3.5, cy - 3.5);
      g.lineTo(cx - 3.5, cy + 3.5);
    } else {
      g.moveTo(cx - 4, cy);
      g.lineTo(cx - 1, cy + 3);
      g.lineTo(cx + 4.5, cy - 3.5);
    }
    g.stroke();
    txt(g, nd.tool, TL_X[i], TL_NODE_Y + 32, 11.5, col, { family: MONO, align: 'center' });
    txt(g, nd.zh, TL_X[i], TL_NODE_Y + 52, 12.5, C.text, { weight: 500, family: SANS, align: 'center' });
    g.globalAlpha = 1;
  }
  // the closing line
  const kEnd = thumb ? 1 : sstep(7.55, 7.9, T);
  if (kEnd > 0) {
    g.globalAlpha = kEnd;
    const y = TL.y1 - 22;
    setFont(g, 13, 500, SANS);
    const parts = [
      ['寫入 0 次', C.green],
      ['  ·  ', C.dim],
      ['引用 SOP 1 份', C.blue],
      ['  ·  ', C.dim],
      ['升級 1 次', C.amber],
      ['  ——  最後一步，交給人。', C.text],
    ];
    let w = 0;
    for (const [s] of parts) w += g.measureText(s).width;
    let x = 500 - w / 2;
    for (const [s, c] of parts) {
      txt(g, s, x, y, 13, c, { weight: 500, family: SANS });
      setFont(g, 13, 500, SANS);
      x += g.measureText(s).width;
    }
    g.globalAlpha = 1;
  }
}

// -----------------------------------------------------------------------------
// the rider: neon line-art with a soft glow
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

/** Outline paths of the bird (drawn as neon tubes, so the neck is a tube, not a centre line). */
function birdOutline(g, rig, kit) {
  const b = rig.body;
  // tail + body
  g.moveTo(b.x - b.rx * 0.6, b.y - b.ry * 0.35);
  g.lineTo(rig.tailTip.x, rig.tailTip.y);
  g.lineTo(b.x - b.rx * 0.55, b.y + b.ry * 0.45);
  g.moveTo(b.x + b.rx * Math.cos(b.tilt), b.y + b.rx * Math.sin(b.tilt));
  g.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  // folded wing + primaries
  const sh = rig.wingShoulder;
  g.moveTo(sh.x, sh.y);
  g.bezierCurveTo(sh.x - 24, sh.y - 8, sh.x - 58, sh.y + 2, rig.tailTip.x - 4, rig.tailTip.y + 3);
  g.bezierCurveTo(sh.x - 46, sh.y + 20, sh.x - 16, sh.y + 20, sh.x + 2, sh.y + 10);
  for (let k = 0; k < 4; k++) {
    const fx = sh.x - (24 + k * 9);
    g.moveTo(fx, sh.y + (6 + k * 1.5));
    g.lineTo(fx - 12, sh.y + (12 + k * 1.2));
  }
  // neck tube
  const pts = kit.sampleCubic(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 16);
  for (const sgn of [1, -1]) {
    for (let i = 0; i < pts.length - 2; i++) {
      const a = pts[Math.max(0, i - 1)];
      const c = pts[Math.min(pts.length - 1, i + 1)];
      const tx = c.x - a.x;
      const ty = c.y - a.y;
      const L = Math.hypot(tx, ty) || 1;
      const w = 6 - 1.2 * (i / pts.length);
      const x = pts[i].x + (ty / L) * w * sgn;
      const y = pts[i].y - (tx / L) * w * sgn;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
  }
  // head
  const h = rig.head;
  g.moveTo(h.x + h.r, h.y);
  g.arc(h.x, h.y, h.r, 0, TAU);
}
function legOutline(g, rig) {
  for (const [hip, knee, foot] of [
    [rig.farHip, rig.farKnee, rig.farFoot],
    [rig.nearHip, rig.nearKnee, rig.nearFoot],
  ]) {
    g.moveTo(hip.x, hip.y);
    g.lineTo(knee.x, knee.y);
    g.lineTo(foot.x, foot.y);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 12, foot.y + 2.5);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 9, foot.y + 5);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x - 5, foot.y + 2);
  }
}
function nearWingPath(g, rig) {
  const sh = rig.wingShoulder;
  const el = rig.wingElbow;
  const hd = rig.wingHand;
  g.beginPath();
  g.moveTo(sh.x - 12, sh.y - 5);
  g.bezierCurveTo(el.x - 6, el.y - 16, hd.x - 6, hd.y - 12, hd.x + 4, hd.y - 5);
  g.quadraticCurveTo(hd.x + 9, hd.y - 1, hd.x + 5, hd.y + 3.5);
  g.quadraticCurveTo(hd.x + 1, hd.y + 6, hd.x - 3, hd.y + 3);
  g.quadraticCurveTo(hd.x - 5, hd.y + 8, hd.x - 10, hd.y + 4);
  g.quadraticCurveTo(el.x - 2, el.y + 9, el.x - 9, el.y + 6);
  g.quadraticCurveTo(el.x - 14, el.y + 13, sh.x - 8, sh.y + 12);
  g.quadraticCurveTo(sh.x - 18, sh.y + 12, sh.x - 20, sh.y + 5);
  g.closePath();
}
/** Stroke the current path as a neon tube: wide soft glow, then a bright core. */
function neonStroke(g, core, glow, w = 1.3) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = glow;
  g.lineWidth = w * 5;
  g.globalAlpha = 0.18;
  g.stroke();
  g.lineWidth = w * 2.4;
  g.globalAlpha = 0.35;
  g.stroke();
  g.globalAlpha = 1;
  g.strokeStyle = core;
  g.lineWidth = w;
  g.stroke();
}

function drawNeonRider(kit, g, rig, scene) {
  const pin = { ...(scene.pinwheel || { type: 'three' }) };
  const BIRD = '#eef4ff';
  const x = rig.root.x;
  g.save();
  // light trail along the status bar and a glow pool under the wheels
  const tr = g.createLinearGradient(x - 260, 0, x - 60, 0);
  tr.addColorStop(0, 'rgba(88,166,255,0)');
  tr.addColorStop(1, 'rgba(88,166,255,0.55)');
  g.fillStyle = tr;
  g.fillRect(x - 260, ROAD_Y - 1.5, 200, 3);
  const pool = g.createRadialGradient(x, ROAD_Y + 2, 0, x, ROAD_Y + 2, 150);
  pool.addColorStop(0, 'rgba(88,166,255,0.22)');
  pool.addColorStop(1, 'rgba(88,166,255,0)');
  g.fillStyle = pool;
  g.fillRect(x - 150, ROAD_Y - 30, 300, 66);
  // dark backing so the line art reads over the busy console
  kit.drawRider(g, rig, { silhouette: 'rgba(5,8,13,0.62)', pinwheel: pin, lineScale: 1.5, spokes: 0 });
  // bicycle + pole rotor: blue neon (glow passes, then the crisp tube)
  kit.drawRider(g, rig, { wire: 'rgba(88,166,255,0.12)', pinwheel: pin, showRider: false, lineScale: 4.6, spokes: 8 });
  kit.drawRider(g, rig, { wire: 'rgba(121,192,255,0.28)', pinwheel: pin, showRider: false, lineScale: 2.3, spokes: 8 });
  kit.drawRider(g, rig, { wire: C.blue, pinwheel: pin, showRider: false, lineScale: 1.05, spokes: 12 });
  // the bird: frosted-glass fill (white plumage) ...
  const b = rig.body;
  g.fillStyle = 'rgba(225,235,250,0.17)';
  g.beginPath();
  g.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  g.moveTo(b.x - b.rx * 0.6, b.y - b.ry * 0.35);
  g.lineTo(rig.tailTip.x, rig.tailTip.y);
  g.lineTo(b.x - b.rx * 0.55, b.y + b.ry * 0.45);
  g.fill();
  const neck = kit.sampleCubic(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 14);
  g.strokeStyle = 'rgba(225,235,250,0.17)';
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(neck[0].x, neck[0].y);
  for (let i = 1; i < neck.length - 1; i++) g.lineTo(neck[i].x, neck[i].y);
  g.stroke();
  g.fillStyle = 'rgba(225,235,250,0.2)';
  g.beginPath();
  g.arc(rig.head.x, rig.head.y, rig.head.r, 0, TAU);
  g.fill();
  // ... white neon contours, black legs drawn as white-hot wire
  g.beginPath();
  birdOutline(g, rig, kit);
  neonStroke(g, BIRD, C.cyan, 1.3);
  g.beginPath();
  legOutline(g, rig);
  neonStroke(g, BIRD, C.cyan, 1.5);
  // near wing in front of the body (occludes the lines behind it)
  nearWingPath(g, rig);
  g.fillStyle = 'rgba(10,14,22,0.6)';
  g.fill();
  g.fillStyle = 'rgba(225,235,250,0.26)';
  g.fill();
  neonStroke(g, BIRD, C.cyan, 1.3);
  // black face mask + black spoon bill, with a neon rim
  maskPath(g, rig.head);
  g.fillStyle = '#020305';
  g.fill();
  g.strokeStyle = rgbaHex('#eef4ff', 0.75);
  g.lineWidth = 0.9;
  g.stroke();
  billPath(g, rig);
  g.fillStyle = '#020305';
  g.fill();
  neonStroke(g, BIRD, C.cyan, 1.1);
  // eye: amber ring
  const e = rig.eye;
  g.strokeStyle = C.amber;
  g.lineWidth = 1.3;
  g.beginPath();
  g.arc(e.x, e.y, 2.6, 0, TAU);
  g.stroke();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(e.x + 0.3, e.y, 1, 0, TAU);
  g.fill();
  // crest plumes glow amber (breeding plumage)
  g.beginPath();
  const cr = rig.crestRoot;
  g.moveTo(cr.x, cr.y);
  g.quadraticCurveTo((cr.x + rig.crestTip1.x) / 2, cr.y - 6, rig.crestTip1.x, rig.crestTip1.y);
  g.moveTo(cr.x, cr.y + 2);
  g.quadraticCurveTo((cr.x + rig.crestTip2.x) / 2, cr.y - 1, rig.crestTip2.x, rig.crestTip2.y);
  neonStroke(g, '#ffd27a', C.amber, 1.2);
  g.restore();
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const { rawLocalT, isThumbnail } = params;
  const thumb = Boolean(isThumbnail);
  const T = thumb ? 7.95 : rawLocalT;
  const MONO = kit.FONT.mono;
  const SANS = kit.FONT.sans;
  ctx.save();

  const night = kit.bake('agent_night', S, S, (g, rng) => paintNight(kit, g, rng));
  const dawn = kit.bake('agent_dawn', S, 420, (g) => {
    const gr = g.createRadialGradient(780, 420, 10, 780, 420, 520);
    gr.addColorStop(0, 'rgba(255,170,110,0.55)');
    gr.addColorStop(0.25, 'rgba(240,120,110,0.28)');
    gr.addColorStop(0.6, 'rgba(120,90,150,0.12)');
    gr.addColorStop(1, 'rgba(60,60,120,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, 420);
  });
  const dawnWash = kit.bake('agent_dawnwash', S, 720, (g) => {
    const sk = g.createLinearGradient(0, 0, 0, HORIZON);
    sk.addColorStop(0, 'rgba(40,60,110,0)');
    sk.addColorStop(0.7, 'rgba(70,80,130,0.10)');
    sk.addColorStop(1, 'rgba(150,110,140,0.22)');
    g.fillStyle = sk;
    g.fillRect(0, 0, S, HORIZON);
    const band = g.createRadialGradient(800, HORIZON + 4, 4, 800, HORIZON + 4, 360);
    band.addColorStop(0, 'rgba(255,170,120,0.35)');
    band.addColorStop(1, 'rgba(255,170,120,0)');
    g.save();
    g.translate(0, HORIZON + 4);
    g.scale(1, 0.18);
    g.translate(0, -(HORIZON + 4));
    g.fillStyle = band;
    g.fillRect(400, HORIZON + 4 - 360, 600, 720);
    g.restore();
  });
  const chrome = kit.bake(`agent_chrome_${fontsReady() ? 'ok' : 'fb'}`, S, S, (g) => paintChrome(kit, g));

  // --- back: night sea, the array, first light rising over the finale ---
  ctx.drawImage(night, 0, 0);
  const dawnK = thumb ? 0.6 : 0.12 + 0.88 * kit.smoothstep(1.5, 9, T);
  ctx.globalAlpha = dawnK;
  ctx.drawImage(dawn, 0, HORIZON - 420 + 6);
  // first light lifts the whole sky a little and lays a warm band on the sea
  ctx.drawImage(dawnWash, 0, 0);
  ctx.globalAlpha = 1;
  drawDistantRotors(ctx, T);
  drawRedLights(ctx, T);
  drawSeaShimmer(ctx, T, kit);
  // --- mid: the turbine (rotor turns, nacelle light flashes) ---
  drawBigTurbine(ctx, T);
  // --- fore: the console glass over it ---
  ctx.drawImage(chrome, 0, 0);
  drawHMI(ctx, T, kit, MONO, SANS, thumb);
  drawTerminal(ctx, T, MONO, thumb);
  drawLink(ctx, T, thumb);
  drawStatusAndTimeline(ctx, T, kit, MONO, SANS, thumb);
  // DENIED: the whole terminal border flashes red on bar 4
  if (!thumb && T >= 6.62 && T < 7.5) {
    const fl = blink(T - 6.62, 0.25, 0.5);
    roundRect(ctx, TERM.x0 - 1, TERM.y0 - 1, TERM.x1 - TERM.x0 + 2, TERM.y1 - TERM.y0 + 2, 9);
    ctx.strokeStyle = rgbaHex(C.red, 0.35 + 0.55 * fl);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (!thumb) drawEngineer(ctx, T, SANS, MONO);

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    drawNeonRider(kit, ctx, rig, scene);
  }
  ctx.restore();
}
