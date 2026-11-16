// src/scenes/outro.js
// 166.0 -> 178.0 s: all 20 eras gather on one horizontal time axis (thumbnails
// alternating above / below), the spoonbill rides the axis once more while its
// pinwheel morphs through every era's rotor, then the closing line.

import { VIEW_W, VIEW_H } from '../beat/camera.js';
import { SCENES, NUM_SCENES, PANEL_SIZE, clamp, smoothstep, envelope, lerp, pedalAngleAt, pinwheelAngleAt } from '../beat/timeline.js';
import { FONT } from '../kit/fonts.js';
import { createCanvas } from '../kit/kit.js';

const AXIS_Y = 600;
const AXIS_X0 = 110;
const AXIS_X1 = VIEW_W - 110;
const THUMB = 150;

export function tickX(i) {
  return AXIS_X0 + ((i + 0.5) / NUM_SCENES) * (AXIS_X1 - AXIS_X0);
}

/** Cached 300x300 thumbnail of an era (rendered once at localT = 4 with the rider centred). */
export function getThumbnail(kit, scene, renderScenePanel) {
  if (kit.thumbCache.has(scene.id)) return kit.thumbCache.get(scene.id);
  const slot = kit.getSlot(3);
  slot.ctx.setTransform(1, 0, 0, 1, 0, 0);
  slot.ctx.clearRect(0, 0, PANEL_SIZE, PANEL_SIZE);
  const t = scene.t0 + 4;
  renderScenePanel(kit, slot, scene, {
    t,
    localT: 4,
    rawLocalT: 4,
    riderLocalX: 500,
    riderWorldX: scene.worldX0 + 500,
    pedalAngle: pedalAngleAt(t),
    speedScale: 1,
    pinwheelAngle: pinwheelAngleAt(t),
    isThumbnail: true,
  });
  const c = createCanvas(300, 300);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(slot.canvas, 0, 0, 300, 300);
  kit.thumbCache.set(scene.id, c);
  return c;
}

export function renderOutro(ctx, kit, localT, renderScenePanel) {
  const T = localT; // 0 .. 12
  ctx.save();
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0d141b');
  bg.addColorStop(1, '#16110d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // headline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = envelope(T, 0.3, 1.2, 99, 100);
  ctx.fillStyle = '#f3efe4';
  ctx.font = `900 64px ${FONT.serif}`;
  ctx.fillText('風，一直都在。', VIEW_W / 2, 118);
  ctx.globalAlpha = envelope(T, 0.8, 1.8, 99, 100);
  ctx.font = `500 28px ${FONT.sans}`;
  ctx.fillStyle = '#b9d7e2';
  ctx.fillText('從尼羅河的帆、磨坊的風車，到百萬瓦級的離岸巨人與走進機艙的 AI Agent', VIEW_W / 2, 170);
  ctx.globalAlpha = 1;

  // axis (draws itself left -> right)
  const axisP = smoothstep(0.4, 3.2, T);
  const ax1 = lerp(AXIS_X0, AXIS_X1, axisP);
  ctx.strokeStyle = 'rgba(233, 226, 207, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(AXIS_X0, AXIS_Y);
  ctx.lineTo(ax1, AXIS_Y);
  ctx.stroke();
  // arrow head
  if (axisP > 0.98) {
    ctx.fillStyle = 'rgba(233, 226, 207, 0.7)';
    ctx.beginPath();
    ctx.moveTo(AXIS_X1 + 18, AXIS_Y);
    ctx.lineTo(AXIS_X1, AXIS_Y - 9);
    ctx.lineTo(AXIS_X1, AXIS_Y + 9);
    ctx.closePath();
    ctx.fill();
  }

  // thumbnails
  for (let i = 0; i < NUM_SCENES; i++) {
    const s = SCENES[i];
    const appear = smoothstep(0.5 + i * 0.13, 1.1 + i * 0.13, T);
    if (appear <= 0.001) continue;
    const x = tickX(i);
    const up = i % 2 === 0;
    const ty = up ? AXIS_Y - 70 - THUMB : AXIS_Y + 70;
    const pop = lerp(12, 0, appear);
    ctx.globalAlpha = appear;
    // stem + tick
    ctx.strokeStyle = 'rgba(233, 226, 207, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, AXIS_Y);
    ctx.lineTo(x, up ? ty + THUMB : ty);
    ctx.stroke();
    const accent = (s.frame && s.frame.accent) || '#c9a45c';
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, AXIS_Y, 6, 0, Math.PI * 2);
    ctx.fill();
    // frame + image
    const img = getThumbnail(kit, s, renderScenePanel);
    const ix = x - THUMB / 2;
    const iy = ty + (up ? -pop : pop);
    ctx.fillStyle = '#e9e2cf';
    ctx.fillRect(ix - 5, iy - 5, THUMB + 10, THUMB + 10);
    ctx.drawImage(img, ix, iy, THUMB, THUMB);
    // labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3efe4';
    ctx.font = `700 19px ${FONT.sans}`;
    const labelY = up ? iy - 14 : iy + THUMB + 30;
    ctx.fillText(s.ruler, x, labelY);
    ctx.font = `500 15px ${FONT.sans}`;
    ctx.fillStyle = '#b8b0a0';
    const short = s.zh.length > 9 ? s.zh.slice(0, 9) + '…' : s.zh;
    ctx.fillText(short, x, labelY + (up ? -22 : 22));
  }
  ctx.globalAlpha = 1;

  // rider on the axis: its pinwheel morphs into the rotor of the era it passes
  const rideP = smoothstep(1.0, 10.2, T);
  const rx = lerp(AXIS_X0 - 120, AXIS_X1 + 40, rideP);
  let idx = 0;
  for (let i = 0; i < NUM_SCENES; i++) if (rx >= tickX(i) - 40) idx = i;
  const t = 166 + T;
  const rig = kit.computeRiderRig({
    x: rx,
    y: AXIS_Y - 2,
    pedalAngle: pedalAngleAt(t) * 1.4,
    scale: 0.62,
    time: t,
    worldX: rx * 1.6,
    pinwheelAngle: pinwheelAngleAt(t),
  });
  const riderA = envelope(T, 0.9, 1.4, 10.4, 10.9);
  if (riderA > 0.01) {
    ctx.globalAlpha = riderA;
    kit.drawRider(ctx, rig, { pinwheel: SCENES[idx].pinwheel });
    ctx.globalAlpha = 1;
  }

  // closing credits
  const credA = smoothstep(8.4, 9.4, T);
  if (credA > 0) {
    ctx.globalAlpha = credA;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9e2cf';
    ctx.font = `400 30px ${FONT.kai}`;
    ctx.fillText('下一站，換你騎上風。', VIEW_W / 2, 985);
    ctx.font = `500 19px ${FONT.sans}`;
    ctx.fillStyle = '#8fa3ad';
    ctx.fillText('《乘風騎行》· 100% 程式即時生成的動畫時間軸 · wind-agent-30 · 史料出處見畫廊頁', VIEW_W / 2, 1030);
  }
  ctx.restore();
}

export { clamp };
