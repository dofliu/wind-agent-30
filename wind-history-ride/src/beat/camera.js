// src/beat/camera.js
// Calm, C2-continuous dolly camera along the museum wall of 20 framed eras.
// No roll, no whip-pans, no zoom pumping. The rider stays near screen centre;
// a gentle harmonic lead makes the camera dwell while each panel is centred.

import {
  INTRO_SEC,
  SCENE_SEC,
  NUM_SCENES,
  OUTRO_START,
  PANEL_SIZE,
  RIDER_SPEED,
  clamp,
  lerp,
  smootherstep,
  getRiderWorldState,
} from './timeline.js';

export const VIEW_W = 1920;
export const VIEW_H = 1080;
/** 1000 world px panel -> 860 screen px. */
export const BASE_SCALE = 0.86;
/** World Y placed at screen centre: panel top lands at ~28 px, leaving room for placards + time ruler. */
export const CAM_Y = 595;

const LEAD_AMP = 46; // world px of harmonic framing lead

export function getCameraState(t) {
  const rider = getRiderWorldState(t);

  if (t < INTRO_SEC) {
    // Rest at camX = -100, then C2-accelerate (4.4 s -> 6.0 s) to meet the rider at x = 0
    // with matching velocity and zero acceleration.
    const tcStart = 4.4;
    const dur = INTRO_SEC - tcStart;
    const s = clamp((t - tcStart) / dur, 0, 1);
    const s3 = s * s * s;
    const ease = -0.5 + s3 - 0.5 * s3 * s;
    const camX = RIDER_SPEED * dur * ease; // -100 -> 0
    return { camX, camY: CAM_Y, scale: BASE_SCALE, rider };
  }

  const st = t - INTRO_SEC;
  // Harmonic lead: 0 at every frame crossing, slows the camera while a panel is centred.
  const leadEnv = smootherstep(INTRO_SEC, INTRO_SEC + 1.2, t) * (1 - smootherstep(OUTRO_START - 4.2, OUTRO_START - 2.6, t));
  let camX = rider.worldX + LEAD_AMP * Math.sin((2 * Math.PI * st) / SCENE_SEC) * leadEnv;

  // Settle onto the centre of the final panel before the outro cross-dissolve.
  const settle = smootherstep(OUTRO_START - 3.2, OUTRO_START - 0.4, t);
  if (settle > 0) {
    const lastCentre = (NUM_SCENES - 1) * PANEL_SIZE + PANEL_SIZE / 2;
    camX = lerp(camX, lastCentre, settle);
  }

  return { camX, camY: CAM_Y, scale: BASE_SCALE, rider };
}

/** World -> screen helpers. */
export function worldToScreen(cam, wx, wy) {
  return {
    x: VIEW_W / 2 + (wx - cam.camX) * cam.scale,
    y: VIEW_H / 2 + (wy - cam.camY) * cam.scale,
  };
}

/** Indices of panels whose framed bounds intersect the viewport. */
export function getVisiblePanelIndices(cam) {
  const halfW = VIEW_W / 2 / cam.scale + 60;
  const minX = cam.camX - halfW;
  const maxX = cam.camX + halfW;
  const list = [];
  for (let i = 0; i < NUM_SCENES; i++) {
    const x0 = i * PANEL_SIZE;
    if (x0 + PANEL_SIZE >= minX && x0 <= maxX) list.push(i);
  }
  return list;
}

export { SCENE_SEC };
