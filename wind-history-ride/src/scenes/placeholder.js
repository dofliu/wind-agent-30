// src/scenes/placeholder.js
// Fallback "animatic" renderer used for any era whose module is missing or throws.
// Also documents the scene contract by example.

import { PANEL_SIZE, ROAD_Y } from '../beat/timeline.js';

export function renderPlaceholderPanel(kit, slot, scene, params) {
  const { ctx } = slot;
  const P = PANEL_SIZE;
  const [c0, c1, c2, c3, c4] = scene.palette || ['#ddd', '#333', '#777', '#999', '#111'];

  const bg = kit.bake(`placeholder_${scene.id}`, P, P, (g, rng) => {
    const sky = g.createLinearGradient(0, 0, 0, ROAD_Y);
    sky.addColorStop(0, c0);
    sky.addColorStop(1, kit.mixColor(c0, c3, 0.35));
    g.fillStyle = sky;
    g.fillRect(0, 0, P, P);
    g.fillStyle = kit.mixColor(c2, c0, 0.4);
    g.fillRect(0, ROAD_Y, P, P - ROAD_Y);
    g.strokeStyle = c1;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, ROAD_Y);
    g.lineTo(P, ROAD_Y);
    g.stroke();
    kit.addGrain(g, P, P, rng, 0.03);
    g.fillStyle = kit.rgba(c4, 0.75);
    g.font = `700 54px ${kit.FONT.serif}`;
    g.fillText(scene.zh, 60, 120);
    g.font = `500 26px ${kit.FONT.sans}`;
    g.fillText(`${scene.styleEn} · placeholder`, 62, 165);
  });
  ctx.drawImage(bg, 0, 0);

  // a generic machine matching the era's rotor type
  const hub = { x: 700, y: 360, r: 120 };
  ctx.strokeStyle = c1;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(hub.x, hub.y);
  ctx.lineTo(hub.x, ROAD_Y - 6);
  ctx.stroke();
  kit.drawPinwheel(ctx, hub, params.t * 2.2, {
    ...(scene.pinwheel || {}),
    stroke: c1,
    lineWidth: 2,
    time: params.t,
  });

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    kit.drawRider(ctx, rig, { pinwheel: scene.pinwheel });
  }
}
