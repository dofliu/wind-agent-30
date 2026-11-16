// src/beat/timeline.js
// 120 BPM musical clock, film structure and the rider's continuous world motion.
//
// Film layout (2:58 = 178.0 s):
//   Intro   3 bars  =   6.0 s   (0.0  ->   6.0)
//   Eras   20 x 4 bars = 160.0 s (6.0  -> 166.0), one 1000x1000 framed panel per era
//   Outro   6 bars  =  12.0 s   (166.0 -> 178.0)
//
// Everything here is a pure function of time `t` so any frame can be rendered
// in isolation (scrubbing, contact sheets, parallel offline rendering).

import { ERAS } from '../data/eras.js';

export const BPM = 120;
export const BEAT_SEC = 60 / BPM; // 0.5 s
export const BAR_BEATS = 4;
export const BAR_SEC = BEAT_SEC * BAR_BEATS; // 2.0 s

export const INTRO_BARS = 3;
export const INTRO_SEC = INTRO_BARS * BAR_SEC; // 6.0 s

export const SCENE_BARS = 4;
export const SCENE_SEC = SCENE_BARS * BAR_SEC; // 8.0 s per era
export const NUM_SCENES = ERAS.length; // 20
export const SCENES_TOTAL_SEC = NUM_SCENES * SCENE_SEC; // 160.0 s

export const OUTRO_BARS = 6;
export const OUTRO_SEC = OUTRO_BARS * BAR_SEC; // 12.0 s
export const OUTRO_START = INTRO_SEC + SCENES_TOTAL_SEC; // 166.0 s

export const TOTAL_DURATION = INTRO_SEC + SCENES_TOTAL_SEC + OUTRO_SEC; // 178.0 s

export const PANEL_SIZE = 1000;
/** Canonical road height at x = 0 and x = 1000 of every panel (slope must be 0 there). */
export const ROAD_Y = 700;
/** Rider ground speed in world px / s: one panel per era. */
export const RIDER_SPEED = PANEL_SIZE / SCENE_SEC; // 125 px/s

export const SCENES = ERAS.map((e, idx) => ({
  ...e,
  index: idx,
  num: idx + 1,
  t0: INTRO_SEC + idx * SCENE_SEC,
  t1: INTRO_SEC + (idx + 1) * SCENE_SEC,
  worldX0: idx * PANEL_SIZE,
  worldX1: (idx + 1) * PANEL_SIZE,
}));

// -----------------------------------------------------------------------------
// Math helpers (shared by every module)
// -----------------------------------------------------------------------------
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
export function smootherstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
/** Quantize time to `hz` updates per second (stop-motion / retro looks). */
export function quantizeTime(t, hz = 12) {
  if (!hz || hz <= 0) return t;
  return Math.floor(t * hz + 1e-6) / hz;
}
/** Ease value in [0,1] that rises at e0..e1 and falls at e2..e3. */
export function envelope(x, e0, e1, e2, e3) {
  return smoothstep(e0, e1, x) * (1 - smoothstep(e2, e3, x));
}

export function sceneById(id) {
  return SCENES.find((s) => s.id === id) || null;
}

// -----------------------------------------------------------------------------
// Musical clock
// -----------------------------------------------------------------------------
export function getBeatState(rawT) {
  const t = clamp(rawT, 0, TOTAL_DURATION);
  const globalBeat = t / BEAT_SEC;
  const beatIndex = Math.floor(globalBeat + 1e-7);
  const beatFrac = globalBeat - beatIndex;

  let section = 'scenes';
  let sceneIndex = -1;
  let scene = null;
  let localT = 0;
  let barInScene = 0;
  let beatInScene = 0;

  if (t < INTRO_SEC) {
    section = 'intro';
    localT = t;
  } else if (t < OUTRO_START) {
    const st = t - INTRO_SEC;
    sceneIndex = clamp(Math.floor(st / SCENE_SEC), 0, NUM_SCENES - 1);
    scene = SCENES[sceneIndex];
    localT = st - sceneIndex * SCENE_SEC;
    beatInScene = localT / BEAT_SEC;
    barInScene = clamp(Math.floor(localT / BAR_SEC), 0, SCENE_BARS - 1);
  } else {
    section = 'outro';
    localT = t - OUTRO_START;
  }

  return {
    t,
    globalBeat,
    beatIndex,
    beatFrac,
    isDownbeat: beatIndex % BAR_BEATS === 0,
    section,
    sceneIndex,
    scene,
    localT,
    barInScene,
    beatInScene,
  };
}

// -----------------------------------------------------------------------------
// Rider world motion
// -----------------------------------------------------------------------------
/** Crank angle: one full pedal revolution every 2 beats (1.0 s). */
export function pedalAngleAt(t) {
  return (t / BEAT_SEC) * Math.PI;
}

const INTRO_RIDE_START = 4.0; // rider starts rolling at 4.0 s and reaches x = 0 at 6.0 s

/**
 * Continuous world X of the rider's bicycle centre.
 * - Intro 4.0 -> 6.0 s: accelerates from rest (x = -125) to x = 0 with C2-matched
 *   position / velocity / acceleration so the hand-off into era #01 has zero kink.
 * - Eras: x = idx * 1000 + 125 * localT (constant speed, one panel per 8 s).
 * - Outro: keeps rolling for the cross-dissolve.
 */
export function getRiderWorldState(t) {
  if (t < INTRO_SEC) {
    const dur = INTRO_SEC - INTRO_RIDE_START; // 2.0 s
    const s = clamp((t - INTRO_RIDE_START) / dur, 0, 1);
    const s3 = s * s * s;
    const s4 = s3 * s;
    const ease = -0.5 + s3 - 0.5 * s4; // -0.5 -> 0, d/ds = 1 at s = 1, d2/ds2 = 0 at s = 1
    const mX = RIDER_SPEED * dur; // 250
    const mTheta = (Math.PI / BEAT_SEC) * dur;
    return {
      visible: t >= INTRO_RIDE_START - 1.2,
      worldX: mX * ease,
      speedScale: s * s * (3 - 2 * s),
      pedalAngle: pedalAngleAt(INTRO_SEC) + mTheta * ease,
    };
  }
  return {
    visible: true,
    worldX: (t - INTRO_SEC) * RIDER_SPEED,
    speedScale: 1,
    pedalAngle: pedalAngleAt(t),
  };
}

/**
 * Pinwheel / mini-rotor spin angle carried by the rider. Monotonic, deterministic,
 * ~2.2 rev/s at cruising speed with a gentle gust modulation.
 */
export function pinwheelAngleAt(t) {
  const base = t * Math.PI * 2 * 2.2;
  const gust = 0.9 * Math.sin(t * 0.73) + 0.45 * Math.sin(t * 1.91 + 1.3);
  return base + gust;
}
