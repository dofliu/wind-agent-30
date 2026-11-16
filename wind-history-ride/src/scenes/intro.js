// src/scenes/intro.js
// 0.0 -> 6.0 s: title card over flowing wind streamlines, then the overlay
// dissolves to reveal the museum wall as the spoonbill rolls into era #01.

import { VIEW_W, VIEW_H } from '../beat/camera.js';
import { INTRO_SEC, clamp, envelope, smoothstep, lerp } from '../beat/timeline.js';
import { hash11 } from '../kit/kit.js';
import { FONT } from '../kit/fonts.js';

export const INTRO_FADE_START = 3.9;
export const INTRO_FADE_END = 5.1;

/** Streamline y for line k at screen x (deterministic flow field). */
function flowY(k, x, t) {
  const base = 120 + k * 34;
  return (
    base +
    18 * Math.sin(x * 0.0042 + k * 0.7 + t * 0.9) +
    9 * Math.sin(x * 0.011 - t * 1.7 + k * 1.3) +
    40 * Math.exp(-Math.pow((x - 960) / 520, 2)) * Math.sin(k * 0.45)
  );
}

export function renderIntroOverlay(ctx, t) {
  if (t >= INTRO_FADE_END) return;
  const alpha = 1 - smoothstep(INTRO_FADE_START, INTRO_FADE_END, t);
  ctx.save();
  ctx.globalAlpha = alpha;

  // deep night-blue backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#0b1620');
  bg.addColorStop(1, '#111c25');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // wind streamlines with travelling dashes
  ctx.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const a = 0.08 + 0.12 * hash11(k * 3.3);
    ctx.strokeStyle = `rgba(170, 214, 230, ${a})`;
    ctx.lineWidth = 1.2 + hash11(k * 9.1) * 1.6;
    ctx.beginPath();
    for (let x = -20; x <= VIEW_W + 20; x += 24) {
      const y = flowY(k, x, t);
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // bright gust streaks riding the line (comet dashes that follow the flow)
    const speed = 420 + 300 * hash11(k * 1.7);
    if (hash11(k * 4.4) < 0.55) {
      for (let j = 0; j < 2; j++) {
        const head = ((t * speed + j * 980 + hash11(k + j * 13) * 1900) % (VIEW_W + 400)) - 200;
        const len = 120 + 90 * hash11(k * 2.2 + j);
        const grad = ctx.createLinearGradient(head - len, 0, head, 0);
        grad.addColorStop(0, 'rgba(220, 245, 255, 0)');
        grad.addColorStop(1, 'rgba(220, 245, 255, 0.75)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let px = head - len; px <= head; px += 12) {
          const py = flowY(k, px, t);
          if (px === head - len) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  // title block
  const titleA = envelope(t, 0.3, 1.3, 99, 100);
  const subA = envelope(t, 0.9, 1.9, 99, 100);
  const quoteA = envelope(t, 1.9, 2.8, 99, 100);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = alpha * titleA;
  ctx.fillStyle = '#f3efe4';
  ctx.font = `900 132px ${FONT.serif}`;
  const rise = lerp(18, 0, smoothstep(0.3, 1.4, t));
  ctx.fillText('乘風騎行', VIEW_W / 2, 470 + rise);

  ctx.globalAlpha = alpha * subA;
  ctx.font = `500 40px ${FONT.sans}`;
  ctx.fillStyle = '#b9d7e2';
  ctx.fillText('風力發電五千年 · 二十站騎行時間軸', VIEW_W / 2, 548);
  ctx.font = `italic 500 30px ${FONT.garamond}`;
  ctx.fillStyle = '#8fb3c2';
  ctx.fillText('Riding the Wind — A Cycling History of Wind Power', VIEW_W / 2, 598);

  ctx.globalAlpha = alpha * quoteA;
  ctx.font = `400 34px ${FONT.kai}`;
  ctx.fillStyle = '#e9e2cf';
  ctx.fillText('「風一直都在；人類花了五千年，學會騎上它。」', VIEW_W / 2, 720);

  // thin rule
  ctx.globalAlpha = alpha * subA;
  ctx.fillStyle = 'rgba(185, 215, 226, 0.5)';
  const rw = 520 * smoothstep(0.9, 1.9, t);
  ctx.fillRect(VIEW_W / 2 - rw / 2, 625, rw, 2);

  ctx.restore();
}

export { INTRO_SEC, clamp };
