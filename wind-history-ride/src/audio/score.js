// src/audio/score.js — the leitmotif and its 22 orchestrations (intro, 20 eras, outro).
//
// One original 4-bar tune (16 beats, 22 notes) is written in scale degrees and mapped onto
// each era's mode (Phrygian dominant, dastgah Shur with a quarter-flat 2nd, Dorian, Chinese
// gong pentatonic, Lydian ...). Each era re-voices it with its own instruments, harmony,
// rhythm feel and percussion, plus a one-beat pickup that crossfades in under the bar line.
//
// Output: plain data. buildScore() -> [{ id, t0, t1, start, tracks, events, eq, loudDb, wind }]
// where events are { tr, voice, t (s, absolute film time), dur (s), midi, vel, pan, p }.

import { mulberry32, hashStr, clamp } from './dsp.js';
import { ERAS } from '../data/eras.js';
import { INTRO_SEC, SCENE_SEC, OUTRO_START, TOTAL_DURATION, BEAT_SEC } from '../beat/timeline.js';

export const TONIC = 62; // D4 — one tonal centre for the whole film, so era crossfades never clash

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  // Shur on D: D, E-koron (quarter-flat, ~1.5 semitones), F, G, A, Bb, C
  dastgah_shur: [0, 1.5, 3, 5, 7, 8, 10],
  // gong (宮) pentatonic seen through heptatonic degrees: fa -> sol, ti -> do'
  gong: [0, 2, 4, 7, 7, 9, 12],
};

/** Chord per bar as scale-degree stacks (root first). Chosen so every strong-beat note of the motif is a chord tone. */
const PROG = {
  major: [[0, 2, 4], [3, 5, 7], [4, 6, 8, 10], [0, 2, 4]], // I  IV  V7  I
  dorian: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]], // i  IV  v   i
  mixolydian: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]], // I  IV  v   I
  natural_minor: [[0, 2, 4], [3, 5, 7], [2, 4, 6, 8], [0, 2, 4]], // i  iv  IIImaj7  i (synthwave)
  lydian: [[0, 2, 4, 8], [1, 3, 5, 7], [4, 6, 8], [0, 2, 4, 5]], // Iadd9  II7  V  I6
  phrygian_dominant: [[0, 2, 4], [3, 5, 7], [0, 2, 6, 8], [0, 2, 4]], // I  iv  I7(b9)  I
  dastgah_shur: [[0, 4], [3, 7], [4, 8], [0, 4]], // drone eras: only used for virtual roots
  gong: [[0, 4], [0, 4], [4, 8], [0, 4]],
};

/**
 * The leitmotif: [startSlot (8th notes from bar 1), lengthSlots, scaleDegree (0 = tonic, 7 = octave)].
 * In D major:  A— F# A | D'—— C# | B— G B | D'— B G | A B C# E' | C#'— A— | D' A F# E | D———
 */
export const MOTIF = [
  [0, 2, 4], [2, 1, 2], [3, 1, 4], [4, 3, 7], [7, 1, 6],
  [8, 2, 5], [10, 1, 3], [11, 1, 5], [12, 2, 7], [14, 1, 5], [15, 1, 3],
  [16, 1, 4], [17, 1, 5], [18, 1, 6], [19, 1, 8], [20, 2, 6], [22, 2, 4],
  [24, 1, 7], [25, 1, 4], [26, 1, 2], [27, 1, 1], [28, 4, 0],
];

export function degSemi(mode, deg) {
  const sc = MODES[mode] || MODES.major;
  const o = Math.floor(deg / 7);
  return sc[deg - o * 7] + 12 * o;
}

const melVel = (s) => 0.74 + (s % 8 === 0 ? 0.12 : s % 2 === 0 ? 0.06 : 0) + (s >= 16 && s < 24 ? 0.04 : 0) + (s === 28 ? 0.04 : 0);

// -----------------------------------------------------------------------------
// Arranger: beat grid -> absolute seconds, with swing and light humanisation
// -----------------------------------------------------------------------------
class Arr {
  constructor(t0, { swing = 0.5, human = 0, seed = 1 } = {}) {
    this.t0 = t0;
    this.swing = swing;
    this.human = human;
    this.rnd = mulberry32(seed);
    this.events = [];
  }
  time(b) {
    const ib = Math.floor(b);
    let f = b - ib;
    if (this.swing !== 0.5) f = f < 0.5 ? f * 2 * this.swing : this.swing + (f - 0.5) * 2 * (1 - this.swing);
    return this.t0 + (ib + f) * BEAT_SEC;
  }
  note(tr, voice, b, d, midi, vel, x = {}) {
    let t = this.time(b);
    const te = this.time(b + d);
    let v = vel;
    if (this.human) {
      t += (this.rnd() - 0.5) * 0.014 * this.human;
      v *= 1 + (this.rnd() - 0.5) * 0.16 * this.human;
    }
    this.events.push({ tr, voice, t, dur: Math.max(0.03, te - t), midi, vel: clamp(v, 0.02, 1), pan: x.pan ?? 0, p: x.p });
  }
  hit(tr, kind, b, vel, x = {}) {
    this.note(tr, kind, b, 0.1, 60, vel, x);
  }
}

// -----------------------------------------------------------------------------
// Harmony helpers
// -----------------------------------------------------------------------------
function voiceChord(mode, degs, lo, hi, prev) {
  const n = degs.length;
  const cands = [];
  for (let inv = 0; inv < n; inv++) {
    const st = [];
    let last = -Infinity;
    for (let k = 0; k < n; k++) {
      let s = degSemi(mode, degs[(inv + k) % n]);
      while (s <= last) s += 12;
      st.push(s);
      last = s;
    }
    for (let o = -4; o <= 4; o++) {
      const notes = st.map((s) => TONIC + s + 12 * o);
      if (notes[0] < lo || notes[n - 1] > hi) continue;
      let ok = true;
      for (let k = 1; k < n; k++) if (notes[k] - notes[k - 1] === 1) ok = false;
      if (ok) cands.push(notes);
    }
  }
  if (!cands.length) {
    // fallback: root position near the bottom of the range
    const st = degs.map((d) => degSemi(mode, d));
    let o = 0;
    while (TONIC + st[0] + 12 * o > lo + 6) o--;
    while (TONIC + st[0] + 12 * o < lo) o++;
    return st.map((s) => TONIC + s + 12 * o);
  }
  const mid = (lo + hi) / 2;
  let best = cands[0];
  let bestScore = Infinity;
  for (const c of cands) {
    let score;
    if (prev) {
      score = 0;
      for (let k = 0; k < Math.min(c.length, prev.length); k++) score += Math.abs(c[k] - prev[k]);
    } else score = Math.abs(c.reduce((a, b) => a + b, 0) / c.length - mid);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function makeCtx(mode, prog = PROG[mode] || PROG.major) {
  const m = (deg, oct = 0) => TONIC + degSemi(mode, deg) + 12 * oct;
  const root = (bar) => 38 + degSemi(mode, prog[bar][0]);
  const fifth = (bar) => {
    const f = 38 + degSemi(mode, prog[bar][0] + 4);
    return f > 47 ? f - 12 : f;
  };
  const voicings = (lo, hi) => {
    const out = [];
    let prev = null;
    for (let bar = 0; bar < 4; bar++) {
      prev = voiceChord(mode, prog[bar], lo, hi, prev);
      out.push(prev);
    }
    return out;
  };
  const mel = (oct = 0) => MOTIF.map(([s, l, d], i) => ({ i, s, l, b: s / 2, d: l / 2, deg: d, midi: m(d, oct), vel: melVel(s) }));
  return { mode, prog, m, root, fifth, voicings, mel };
}

/** Highest chord tone of the note's bar at least a minor third below it (brass-section harmony). */
function harmonyBelow(c, n) {
  const bar = Math.min(3, Math.floor(n.s / 8));
  let best = n.midi - 12;
  for (const d of c.prog[bar]) for (let o = -2; o <= 1; o++) {
    const m = c.m(d, o);
    if (m <= n.midi - 3 && m > best) best = m;
  }
  return best;
}

const at = (V, i) => V[((i % V.length) + V.length) % V.length] + 12 * Math.floor(i / V.length);

/** Index of the first of the next `look` melody notes a semitone (or less) away from note i, or -1. */
function rubIndex(mel, i, look = 2) {
  for (let k = 1; k <= look && i + k < mel.length; k++) {
    const d = Math.abs(mel[i + k].midi - mel[i].midi);
    if (d > 0 && d <= 1.01) return i + k;
  }
  return -1;
}
const rubsAhead = (mel, i, look = 2) => rubIndex(mel, i, look) >= 0;

function strum(A, tr, voice, b, notes, vel, dur, dir = 'd', spread = 0.03, p) {
  const order = dir === 'd' ? notes : [...notes].reverse();
  order.forEach((m, k) => A.note(tr, voice, b + k * spread, Math.max(0.05, dur - k * spread), m, vel * (1 - k * 0.06), { p, pan: (k / Math.max(1, order.length - 1) - 0.5) * 0.3 }));
}

/** steps: [beatOffset, chordIndex, durBeats, vel] applied to every bar. */
function pattern(A, tr, voice, V, steps, bars = [0, 1, 2, 3], x = {}) {
  for (const bar of bars) for (const [o, i, d, v] of steps) A.note(tr, voice, bar * 4 + o, d, at(V[bar], i), v, x);
}

const T = (gain, pan = 0, hall = 0, room = 0, fx) => ({ gain, pan, hall, room, fx });

// -----------------------------------------------------------------------------
// Era arrangements (keyed by era id). Each gets (A: Arr, c: ctx) and returns { tracks, eq? }.
// -----------------------------------------------------------------------------
const ERA_ARR = {
  // 01 Egyptian harp, Phrygian dominant, reed drone, frame drum (maqsum)
  nile(A, c) {
    const mel = c.mel(0);
    mel.forEach((n, i) => {
      // the harpist stops a string whose neighbour a semitone away is about to sound (A->Bb, Eb->D)
      A.note('lead', 'harp', n.b, n.d, n.midi, n.vel, { pan: 0.1, p: rubsAhead(mel, i) ? { damp: 0.3 } : undefined });
      if (n.l >= 3) A.note('lead', 'harp', n.b - 0.06, 0.2, c.m(n.deg - 3), n.vel * 0.45, { pan: 0.1 }); // grace from the fifth below
    });
    // final rolled chord
    [0, 2, 4].forEach((d, k) => A.note('comp', 'harp', 14 + k * 0.08, 2, c.m(d, -1), 0.5));
    const V = c.voicings(45, 62);
    pattern(A, 'comp', 'harp', V, [[0, 0, 1, 0.55], [1, 1, 1, 0.42], [2, 2, 1, 0.48], [3, 1, 0.5, 0.4], [3.5, 0, 0.5, 0.36]], [0, 1, 2], { pan: -0.35 });
    A.note('comp', 'harp', 12, 1, c.root(3) + 12, 0.5, { pan: -0.35 });
    // arghul-style drone on the tonic only (a fifth drone would grind against the Bb of the iv bar)
    A.note('drone', 'drone', 0, 16, 50, 0.6);
    A.note('drone', 'drone', 0, 16, 38, 0.42);
    for (let bar = 0; bar < 4; bar++) {
      const B = bar * 4;
      A.hit('perc', 'frameDum', B, 0.9);
      A.hit('perc', 'frameTek', B + 0.5, 0.6);
      A.hit('perc', 'frameTek', B + 1.5, 0.6);
      A.hit('perc', 'frameDum', B + 2, 0.82);
      A.hit('perc', 'frameTek', B + 3, 0.62);
      for (const g of [0.75, 2.75, 3.5]) A.hit('perc', 'frameTek', B + g, 0.28);
    }
    A.hit('perc', 'zill', 0, 0.35, { pan: 0.4 });
    A.hit('perc', 'zill', 8, 0.3, { pan: 0.4 });
    // pickup: harp sweep up the tonic chord (pedals set to D–F#–A) into the first A
    [50, 54, 57, 62, 66].forEach((m, k) => A.note('lead', 'harp', -0.8 + k * 0.15, 0.6, m, 0.3 + k * 0.06, { pan: 0.1 }));
    return {
      tracks: { lead: T(1, 0.1, 0.3, 0.05), comp: T(0.42, -0.35, 0.3, 0.05), drone: T(0.3, 0, 0.3), perc: T(0.5, 0.15, 0.12, 0.22) },
    };
  },

  // 02 Santur in dastgah Shur, drone, tombak
  persia(A, c) {
    const mel = c.mel(0);
    mel.forEach((n, i) => {
      if (n.s % 8 === 0) A.note('lead', 'santur', n.b - 0.09, 0.1, c.m(n.deg + 1), n.vel * 0.42, { p: { ring: 0.2 } }); // grace: short ring
      // the santur rings undamped (~1.8 s), except that a string is stilled as a semitone neighbour sounds
      const j = rubIndex(mel, i, 3);
      const ringP = j >= 0 ? { ring: Math.round(((mel[j].b - n.b) * BEAT_SEC + 0.05) * 1000) / 1000 } : undefined;
      if (n.l >= 2) {
        const k = Math.round(n.d / 0.25);
        for (let j = 0; j < k; j++) A.note('lead', 'santur', n.b + j * 0.25, 0.25, n.midi, n.vel * (j === 0 ? 1 : j % 2 ? 0.55 : 0.68) * (1 - j * 0.03), { p: j < k - 1 ? { ring: 0.55 } : ringP });
      } else A.note('lead', 'santur', n.b, n.d, n.midi, n.vel, { p: ringP });
    });
    const lh = [[0, 50, 0.6], [1, 62, 0.42], [1.5, 62, 0.32], [2, 50, 0.55], [3, 57, 0.45], [3.5, 62, 0.32]];
    for (let bar = 0; bar < 4; bar++)
      for (const [o, m, v] of lh) {
        const mm = m === 57 && bar === 1 ? 55 : m; // G under the iv-ish bar
        if (bar === 3 && o >= 3) continue;
        A.note('comp', 'santur', bar * 4 + o, 0.5, mm, v);
      }
    A.note('drone', 'drone', 0, 16, 50, 0.5);
    for (let bar = 0; bar < 4; bar++) {
      const B = bar * 4;
      const pat = [[0, 'tombakTom', 0.9], [0.75, 'tombakBak', 0.45], [1, 'tombakBak', 0.6], [1.5, 'tombakTom', 0.7], [2, 'tombakBak', 0.72], [2.5, 'tombakBak', 0.48], [3, 'tombakTom', 0.75], [3.5, 'tombakBak', 0.52]];
      for (const [o, k, v] of pat) A.hit('perc', k, B + o, v);
      if (bar === 1) for (const o of [3.625, 3.75, 3.875]) A.hit('perc', 'tombakBak', B + o, 0.3);
    }
    // pickup: tombak riz (roll)
    for (let k = 0; k < 6; k++) A.hit('perc', 'tombakBak', -0.75 + k * 0.125, 0.28 + k * 0.08);
    return { tracks: { lead: T(1, 0.12, 0.28, 0.05), comp: T(0.78, -0.3, 0.28), drone: T(0.45, 0, 0.3), perc: T(0.72, -0.12, 0.1, 0.22) } };
  },

  // 03 Medieval: recorder + parallel-fourth organum, bagpipe-like drone, tabor
  postmill(A, c) {
    for (const n of c.mel(1)) {
      if (n.s === 4) {
        // mordent on the dotted D
        A.note('lead', 'recorder', n.b, 0.12, n.midi, n.vel);
        A.note('lead', 'recorder', n.b + 0.12, 0.12, c.m(n.deg - 1, 1), n.vel * 0.85);
        A.note('lead', 'recorder', n.b + 0.24, n.d - 0.24, n.midi, n.vel);
      } else A.note('lead', 'recorder', n.b, n.d * 0.92, n.midi, n.vel);
      if (n.l >= 2 || n.s % 4 === 0) {
        let lower = c.m(n.deg - 3, 1);
        if (n.midi - lower !== 5) lower = c.m(n.deg - 4, 1);
        A.note('lead2', 'recorder', n.b, n.d * 0.92, lower, n.vel * 0.6);
      }
    }
    A.note('drone', 'pipes', 0, 16, 50, 0.55);
    A.note('drone', 'pipes', 0, 16, 57, 0.45);
    for (let bar = 0; bar < 4; bar++) {
      const B = bar * 4;
      for (const [o, v] of [[0, 0.9], [1, 0.5], [1.5, 0.6], [2, 0.85], [3, 0.55], [3.5, 0.5]]) A.hit('perc', 'tabor', B + o, v);
    }
    for (const [o, v] of [[-0.5, 0.35], [-0.375, 0.42], [-0.25, 0.5], [-0.125, 0.58]]) A.hit('perc', 'tabor', o, v);
    return { tracks: { lead: T(1, 0.08, 0.42), lead2: T(0.8, -0.25, 0.42), drone: T(0.35, 0, 0.4), perc: T(0.55, 0.2, 0.3, 0.1) } };
  },

  // 04 La Mancha: nylon guitar, rasgueado, thumb bass, castanets + palmas (Phrygian dominant)
  quixote(A, c) {
    for (const n of c.mel(0)) {
      if (n.s === 4) A.note('lead', 'guitar', n.b - 0.1, 0.1, c.m(n.deg + 1), n.vel * 0.5, { pan: 0.15 });
      if (n.s === 28) A.note('lead', 'guitar', n.b - 0.1, 0.1, c.m(1), n.vel * 0.55, { pan: 0.15 }); // Eb -> D
      A.note('lead', 'guitar', n.b, n.d, n.midi, n.vel, { pan: 0.15 });
    }
    const V = c.voicings(47, 69);
    const strums = [[0, 'd', 0.85], [1, 'd', 0.5], [1.5, 'u', 0.42], [2, 'd', 0.78], [2.75, 'u', 0.4], [3, 'd', 0.6], [3.5, 'u', 0.42]];
    for (let bar = 0; bar < 3; bar++) {
      strums.forEach(([o, dir, v], k) => {
        const nxt = k + 1 < strums.length ? strums[k + 1][0] : 4;
        strum(A, 'comp', 'guitar', bar * 4 + o, V[bar], v, nxt - o, dir, 0.03);
      });
    }
    strum(A, 'comp', 'guitar', 12, V[3], 0.85, 1, 'd');
    strum(A, 'comp', 'guitar', 13, V[3], 0.5, 1, 'd');
    for (let k = 0; k < 4; k++) strum(A, 'comp', 'guitar', 14 + k * 0.125, V[3], 0.35 + k * 0.05, 0.13, 'd', 0.02, { mute: 1 });
    strum(A, 'comp', 'guitar', 14.5, V[3], 0.8, 1.5, 'd');
    for (let bar = 0; bar < 4; bar++) {
      A.note('bass', 'guitar', bar * 4, 1.8, c.root(bar), 0.75);
      A.note('bass', 'guitar', bar * 4 + 2, bar === 3 ? 2 : 1.8, bar === 3 ? c.root(bar) : c.fifth(bar), 0.6);
      const B = bar * 4;
      for (const [o, v] of [[0, 0.75], [0.5, 0.45], [1, 0.65], [1.75, 0.38], [2, 0.75], [2.5, 0.45], [3, 0.62], [3.5, 0.45]]) A.hit('perc', 'castanet', B + o, v, { pan: 0.35 });
      for (const o of [1.8125, 1.875, 1.9375]) A.hit('perc', 'castanet', B + o, 0.3, { pan: 0.35 });
      for (const o of [0.5, 1.5, 2.5, 3.5]) A.hit('perc', 'palmas', B + o, 0.32, { pan: -0.4 });
    }
    for (const [o, v] of [[-0.25, 0.4], [-0.1875, 0.5], [-0.125, 0.6], [-0.0625, 0.7]]) A.hit('perc', 'castanet', o, v, { pan: 0.35 });
    A.hit('perc', 'palmas', -0.5, 0.4, { pan: -0.4 });
    return { tracks: { lead: T(1, 0.15, 0.14, 0.2), comp: T(0.26, -0.3, 0.12, 0.2), bass: T(0.5, -0.1, 0.05, 0.15), perc: T(0.7, 0, 0.08, 0.2) } };
  },

  // 05 Dutch Golden Age: harpsichord with ornaments, harpsichord chords, cello continuo (Pachelbel-ish descent)
  dutch(A, c) {
    for (const n of c.mel(0)) {
      if (n.s === 4) {
        A.note('lead', 'harpsichord', n.b, 0.12, n.midi, n.vel);
        A.note('lead', 'harpsichord', n.b + 0.12, 0.12, c.m(n.deg - 1), n.vel * 0.8);
        A.note('lead', 'harpsichord', n.b + 0.24, n.d - 0.3, n.midi, n.vel * 0.9);
      } else if (n.s === 20) {
        for (let k = 0; k < 4; k++) A.note('lead', 'harpsichord', n.b + k * 0.125, 0.12, k % 2 ? c.m(n.deg + 1) : n.midi, n.vel * (k ? 0.75 : 1));
        A.note('lead', 'harpsichord', n.b + 0.5, 0.45, n.midi, n.vel * 0.8);
      } else A.note('lead', 'harpsichord', n.b, n.d * 0.85, n.midi, n.vel);
    }
    // continuo realisation: chords on beats 1 and 3, released before the passing bass notes
    const harm = [[[0, 2, 4], [5, 7, 9]], [[3, 5, 7], [0, 2, 4]], [[4, 6, 8], [4, 6, 8, 10]], [[0, 2, 4], [0, 2, 4]]];
    let prev = null;
    harm.forEach((pair, bar) =>
      pair.forEach((degs, h) => {
        prev = voiceChord('major', degs, 52, 67, prev);
        A.note('comp', 'harpsichord', bar * 4 + h * 2, 0.9, prev[0], 0.5, { pan: -0.15 });
        prev.slice(1).forEach((m, k) => A.note('comp', 'harpsichord', bar * 4 + h * 2 + 0.02 * (k + 1), 0.88, m, 0.45, { pan: -0.15 }));
      }),
    );
    const bass = [[50, 49, 47, 45], [43, 47, 50, 47], [45, 49, 52, 45], [50, 45, 38]];
    bass.forEach((line, bar) => line.forEach((m, k) => A.note('bass', 'cello', bar * 4 + k, k === 2 && bar === 3 ? 2 : 0.85, m, 0.6)));
    for (const [o, m, v] of [[-0.5, 62, 0.5], [-0.375, 64, 0.55], [-0.25, 66, 0.6], [-0.125, 67, 0.65]]) A.note('lead', 'harpsichord', o, 0.12, m, v);
    return { tracks: { lead: T(1, 0.15, 0.1, 0.3), comp: T(0.5, -0.15, 0.1, 0.3), bass: T(0.48, -0.1, 0.08, 0.3) } };
  },

  // 06 Ming/Qing: guzheng (bends, slides, glissandi), low open-string drone, muyu
  china(A, c) {
    for (const n of c.mel(0)) {
      let bend = null;
      if (n.s === 8 || n.s === 24) bend = { from: -2, slideT: 0.09 };
      else if (n.l >= 2) bend = { vib: 0.3, vibStart: 0.22 };
      A.note('lead', 'guzheng', n.b, n.d, n.midi, n.vel, { pan: 0.12, p: bend ? { bend } : undefined });
    }
    const pent = [50, 52, 54, 57, 59, 62, 64, 66, 69];
    for (let k = 0; k < 8; k++) A.note('lead', 'guzheng', -0.9 + k * 0.1, 0.5, pent[k], 0.28 + k * 0.035, { pan: 0.12 });
    // descending flourish into bar 3
    for (let k = 0; k < 5; k++) A.note('comp', 'guzheng', 7.5 + k * 0.08, 0.4, pent[8 - k] + 12, 0.25 - k * 0.02, { pan: 0.3 });
    const lhs = [
      [[0, 50, 0.55], [1, 57, 0.4], [1.5, 62, 0.34], [2, 57, 0.45], [3, 62, 0.36]],
      [[0, 50, 0.5], [1, 57, 0.38], [1.5, 62, 0.32], [2, 59, 0.42], [3, 62, 0.34]],
      [[0, 45, 0.5], [1, 52, 0.38], [1.5, 57, 0.32], [2, 52, 0.42], [3, 57, 0.34]],
      [[0, 50, 0.5], [0.06, 57, 0.4], [0.12, 62, 0.36]],
    ];
    lhs.forEach((pat, bar) => pat.forEach(([o, m, v]) => A.note('comp', 'guzheng', bar * 4 + o, 1, m, v, { pan: -0.25 })));
    for (const bar of [0, 2]) {
      A.note('drone', 'guzheng', bar * 4, 4, 38, 0.55);
      A.note('drone', 'guzheng', bar * 4 + 0.05, 4, 45, 0.42);
    }
    for (let bar = 0; bar < 4; bar++) for (const [o, v] of [[0, 0.7], [1, 0.38], [2, 0.55], [3, 0.38]]) A.hit('perc', 'muyu', bar * 4 + o, v);
    A.hit('perc', 'pengling', 0, 0.3, { pan: -0.3 });
    A.hit('perc', 'pengling', 8, 0.26, { pan: -0.3 });
    return { tracks: { lead: T(1, 0.12, 0.32), comp: T(0.6, -0.2, 0.32), drone: T(0.75, -0.05, 0.3), perc: T(0.65, 0.3, 0.12, 0.2) } };
  },

  // 07 Enlightenment string quartet: violin I melody, repeated-8th inner voices, cello bass
  smeaton(A, c) {
    for (const n of c.mel(1)) A.note('lead', 'violin', n.b, n.d * (n.l >= 2 ? 0.94 : 0.8), n.midi, n.vel, { pan: 0.2 });
    const V = c.voicings(55, 72);
    for (let bar = 0; bar < 4; bar++) {
      const steps = bar === 3 ? 4 : 8;
      for (let k = 0; k < steps; k++) {
        const b = bar * 4 + k * 0.5;
        const acc = k % 2 === 0 ? 0.52 : 0.42;
        A.note('comp', 'violin', b, 0.38, V[bar][V[bar].length - 1], acc, { pan: 0.35 });
        A.note('comp', 'viola', b, 0.38, V[bar][V[bar].length - 2], acc * 0.95, { pan: -0.35 });
      }
      if (bar === 3) {
        A.note('comp', 'violin', 14, 1.8, V[3][V[3].length - 1], 0.45, { pan: 0.35 });
        A.note('comp', 'viola', 14, 1.8, V[3][V[3].length - 2], 0.43, { pan: -0.35 });
      }
      A.note('bass', 'cello', bar * 4, 0.9, c.root(bar) + 12 > 52 ? c.root(bar) : c.root(bar) + 12, 0.62);
      A.note('bass', 'cello', bar * 4 + 2, bar === 3 ? 1.8 : 0.9, bar === 3 ? c.root(bar) : c.fifth(bar) + 12 > 55 ? c.fifth(bar) : c.fifth(bar) + 12, 0.55);
    }
    A.note('lead', 'violin', -0.5, 0.22, 78, 0.5, { pan: 0.2 });
    A.note('lead', 'violin', -0.25, 0.22, 79, 0.55, { pan: 0.2 });
    return { tracks: { lead: T(1, 0.2, 0.2, 0.3), comp: T(0.5, 0, 0.18, 0.3), bass: T(0.7, -0.25, 0.15, 0.3) } };
  },

  // 08 American West: banjo with drone-string rolls, boom-chick guitar, upright, washboard (shuffle)
  halladay(A, c) {
    for (const n of c.mel(0)) {
      A.note('lead', 'banjo', n.b, n.d, n.midi, n.vel, { pan: 0.15 });
      if (n.l >= 2) A.note('lead', 'banjo', n.b + 0.5, 0.5, 69, 0.38, { pan: 0.2 });
      if (n.l >= 3) A.note('lead', 'banjo', n.b + 1, 0.5, n.midi, 0.48, { pan: 0.15 });
    }
    const V = c.voicings(52, 67);
    for (let bar = 0; bar < 4; bar++) {
      for (const o of bar === 3 ? [1] : [1, 3]) strum(A, 'comp', 'guitar', bar * 4 + o, V[bar], 0.5, 0.3, 'd', 0.016, { mute: 1 });
      A.note('bass', 'upright', bar * 4, 1.4, c.root(bar), 0.75);
      if (bar < 3) {
        A.note('bass', 'upright', bar * 4 + 2, 0.9, c.fifth(bar), 0.62);
        A.note('bass', 'upright', bar * 4 + 3, 0.9, 38 + degSemi(c.mode, c.prog[bar + 1][0] - 1), 0.55);
      } else A.note('bass', 'upright', 14, 1.6, c.fifth(3), 0.6);
      for (let k = 0; k < 8; k++) A.hit('perc', 'wbTap', bar * 4 + k * 0.5, k % 2 ? 0.28 : 0.42, { pan: 0.3 });
      for (const o of [1, 3]) A.hit('perc', 'wbScrape', bar * 4 + o, 0.6, { pan: 0.3 });
    }
    A.hit('perc', 'wbScrape', -0.5, 0.4, { pan: 0.3 });
    A.note('lead', 'banjo', -0.5, 0.5, 66, 0.5, { pan: 0.15 }); // pickup on F#: era 07's D chord is still ringing
    return { tracks: { lead: T(1, 0.15, 0.08, 0.24), comp: T(0.5, -0.3, 0.06, 0.22), bass: T(0.72, -0.05, 0.05, 0.2), perc: T(0.7, 0.3, 0.05, 0.18) } };
  },

  // 09 Victorian parlour: music box over a pump organ, clockwork ticks
  brush(A, c) {
    for (const n of c.mel(1)) A.note('lead', 'musicbox', n.b, n.d, n.midi, n.vel, { pan: 0.08 });
    for (let bar = 0; bar < 4; bar++) A.note('lead', 'musicbox', bar * 4, 1, c.root(bar) + 24, 0.45, { pan: -0.1 });
    const V = c.voicings(52, 67);
    for (let bar = 0; bar < 4; bar++) {
      V[bar].forEach((m) => A.note('comp', 'organ', bar * 4, bar === 3 ? 3.6 : 3.8, m, 0.5));
      A.note('bass', 'organ', bar * 4, bar === 3 ? 3.6 : 3.8, c.root(bar), 0.55);
    }
    for (let k = 0; k < 32; k++) A.hit('fx', 'tick', k * 0.5, k % 2 ? 0.15 : 0.22, { pan: 0.45 });
    for (const o of [-0.9, -0.72, -0.54, -0.36]) A.hit('fx', 'ratchet', o, 0.45, { pan: 0.3 });
    return { tracks: { lead: T(1, 0.08, 0.32, 0.05), comp: T(0.42, -0.15, 0.3), bass: T(0.75, 0, 0.25), fx: T(0.8, 0.4, 0.05, 0.1) } };
  },

  // 10 Danish folk: fiddle with slides, cuts and double-stops; accordion oom-pah (Mixolydian)
  lacour(A, c) {
    for (const n of c.mel(0)) {
      const p = n.s % 8 === 0 && n.s > 0 ? { slide: -1 } : undefined;
      if (n.s === 12) A.note('lead', 'fiddle', n.b - 0.07, 0.07, c.m(n.deg + 1), n.vel * 0.5, { pan: 0.15 });
      A.note('lead', 'fiddle', n.b, n.d * (n.l >= 2 ? 0.95 : 0.85), n.midi, n.vel, { pan: 0.15, p });
      if (n.s === 4) A.note('lead', 'fiddle', n.b, n.d * 0.95, 69, 0.38, { pan: 0.15 });
      if (n.s === 28) A.note('lead', 'fiddle', n.b, n.d * 0.78, 69, 0.34, { pan: 0.15 }); // lifts before era 11's G#->A pickup
    }
    const V = c.voicings(55, 69);
    for (let bar = 0; bar < 4; bar++) {
      for (const o of bar === 3 ? [0.5, 1.5] : [0.5, 1.5, 2.5, 3.5]) V[bar].forEach((m) => A.note('comp', 'accordion', bar * 4 + o, 0.4, m, 0.42));
      if (bar === 3) V[3].forEach((m) => A.note('comp', 'accordion', 14, 1.6, m, 0.4));
      A.note('bass', 'accbass', bar * 4, 0.8, c.root(bar), 0.7);
      A.note('bass', 'accbass', bar * 4 + 2, bar === 3 ? 1.6 : 0.8, bar === 3 ? c.root(bar) : c.fifth(bar), 0.6);
    }
    for (const [o, m, v] of [[-0.375, 64, 0.5], [-0.25, 66, 0.55], [-0.125, 67, 0.6]]) A.note('lead', 'fiddle', o, 0.12, m, v, { pan: 0.15 });
    return { tracks: { lead: T(1, 0.15, 0.14, 0.26), comp: T(0.6, -0.25, 0.1, 0.24), bass: T(0.6, -0.1, 0.06, 0.2) } };
  },

  // 11 1920s: honky-tonk ragtime piano (RH octaves), stride chords, tuba, brushes (Dorian, swung)
  betz(A, c) {
    for (const n of c.mel(0)) {
      A.note('lead', 'piano', n.b, n.d * 0.9, n.midi, n.vel, { p: { honky: 1 } });
      A.note('lead', 'piano', n.b, n.d * 0.9, n.midi + 12, n.vel * 0.42, { p: { honky: 1 } });
    }
    const V = c.voicings(52, 66);
    for (let bar = 0; bar < 4; bar++) {
      for (const o of bar === 3 ? [1] : [1, 3]) V[bar].forEach((m) => A.note('comp', 'piano', bar * 4 + o, 0.45, m, 0.48, { p: { honky: 1 } }));
      A.note('bass', 'tuba', bar * 4, 0.8, c.root(bar), 0.72);
      A.note('bass', 'tuba', bar * 4 + 2, bar === 3 ? 1.5 : 0.8, bar === 3 ? c.root(bar) : c.fifth(bar), 0.62);
      for (let k = 0; k < 4; k++) A.hit('perc', 'brushSwish', bar * 4 + k, 0.32);
      for (const o of [1, 3]) A.hit('perc', 'brushTap', bar * 4 + o, 0.6);
      A.hit('perc', 'brushTap', bar * 4 + 3.5, 0.32);
    }
    A.hit('perc', 'brushSwish', -1, 0.4);
    A.note('lead', 'piano', -0.12, 0.12, 68, 0.5, { p: { honky: 1 } });
    return { tracks: { lead: T(1, 0.1, 0.12, 0.28), comp: T(0.68, -0.15, 0.1, 0.28), bass: T(0.5, -0.2, 0.06, 0.24), perc: T(0.54, 0.3, 0.06, 0.25) } };
  },

  // 12 1941 newsreel: trumpets + horn thirds, afterbeats, tuba, march snare/bass drum/cymbals (band-limited)
  putnam(A, c) {
    for (const n of c.mel(0)) {
      A.note('lead', 'trumpet', n.b, n.d * 0.82, n.midi, n.vel, { pan: 0.08 });
      A.note('lead2', 'horn', n.b, n.d * 0.82, harmonyBelow(c, n), n.vel * 0.62, { pan: -0.2 });
    }
    const V = c.voicings(53, 67);
    for (let bar = 0; bar < 4; bar++) {
      for (const o of bar === 3 ? [1] : [1, 3]) V[bar].forEach((m) => A.note('comp', 'horn', bar * 4 + o, 0.35, m, 0.45));
      A.note('bass', 'tuba', bar * 4, 0.8, c.root(bar), 0.75);
      A.note('bass', 'tuba', bar * 4 + 2, bar === 3 ? 1.6 : 0.8, bar === 3 ? c.root(bar) : c.fifth(bar), 0.65);
      const B = bar * 4;
      A.hit('perc', 'bdMarch', B, 0.72);
      A.hit('perc', 'bdMarch', B + 2, 0.62);
      for (const [o, v] of [[0, 0.7], [0.5, 0.32], [1, 0.58], [1.5, 0.32], [1.75, 0.28], [2, 0.68], [2.5, 0.32], [3, 0.58], [3.5, 0.38]]) A.hit('perc', 'snareMarch', B + o, v, { pan: 0.15 });
    }
    A.hit('perc', 'cymbal', 0, 0.4, { pan: -0.3 });
    A.hit('perc', 'cymbal', 8, 0.32, { pan: -0.3 });
    for (let k = 0; k < 12; k++) A.hit('perc', 'snareBuzz', -0.75 + k * 0.0625, 0.18 + k * 0.035, { pan: 0.15 });
    const r = mulberry32(77);
    for (let k = 0; k < 40; k++) A.hit('fx', 'crackle', -0.5 + r() * 16.5, 0.15 + r() * 0.25, { pan: r() - 0.5 });
    return {
      tracks: { lead: T(1, 0.08, 0.22, 0.05), lead2: T(0.64, -0.2, 0.22), comp: T(0.62, -0.3, 0.2), bass: T(0.68, 0, 0.12), perc: T(0.55, 0.1, 0.18, 0.12), fx: T(0.4, 0, 0) },
      eq: [['highpass', 150, 0.7, 0], ['peaking', 1600, 0.9, 2.5], ['lowpass', 5200, 0.7, 0]],
    };
  },

  // 13 1957 cool jazz: vibraphone (motor tremolo), rootless piano comping, walking bass, brushes (Lydian, swung)
  gedser(A, c) {
    const mel = c.mel(0);
    mel.forEach((n, i) => A.note('lead', 'vibes', n.b, n.d, n.midi, n.vel, { pan: 0.12, p: rubsAhead(mel, i) ? { pedal: 0.04 } : undefined }));
    const harm = [[2, 4, 5, 8], [1, 3, 5, 7], [6, 8, 12], [2, 4, 5, 8]];
    let prev = null;
    harm.forEach((degs, bar) => {
      prev = voiceChord('lydian', degs, 54, 70, prev);
      for (const [o, d] of bar === 3 ? [[0, 0.4], [1.5, 1.9]] : [[0, 0.4], [1.5, 1.2]]) prev.forEach((m) => A.note('comp', 'piano', bar * 4 + o, d, m, 0.36));
    });
    const walk = [[38, 42, 45, 41], [40, 44, 47, 44], [45, 49, 52, 49], [38, 45, 38]];
    walk.forEach((line, bar) => line.forEach((m, k) => A.note('bass', 'upright', bar * 4 + k, k === 2 && bar === 3 ? 2 : 0.92, m, k === 0 ? 0.75 : 0.62)));
    for (let bar = 0; bar < 4; bar++) {
      for (let k = 0; k < 4; k++) A.hit('perc', 'brushSwish', bar * 4 + k, 0.3);
      for (const [o, v] of [[1, 0.5], [3, 0.5], [2.5, 0.28], [3.5, 0.3]]) A.hit('perc', 'brushTap', bar * 4 + o, v);
    }
    A.hit('perc', 'brushSwish', -1, 0.38);
    return { tracks: { lead: T(1, 0.12, 0.22, 0.22, { trem: { rate: 5.5, depth: 0.28 } }), comp: T(0.72, -0.2, 0.2, 0.22), bass: T(0.55, -0.05, 0.05, 0.2), perc: T(0.7, 0.3, 0.08, 0.22) } };
  },

  // 14 1970s: analog mono lead with glide, string machine, octave disco bass, four-on-the-floor (Dorian)
  tvind(A, c) {
    const mel = c.mel(0);
    const legato = (a, b) => !!(a && b) && Math.abs(a.b + a.d - b.b) < 1e-6 && Math.abs(a.midi - b.midi) <= 4;
    mel.forEach((n, i) => {
      const p = {};
      if (legato(mel[i - 1], n)) p.from = mel[i - 1].midi; // portamento from the previous pitch
      const tied = legato(n, mel[i + 1]);
      if (tied) p.rel = 0.012; // mono synth: no release tail under the next note's glide
      A.note('lead', 'analog', n.b, tied ? n.d : n.d * 0.95, n.midi, n.vel, { p: Object.keys(p).length ? p : undefined });
    });
    const V = c.voicings(50, 67);
    // string machine re-bowed per bar; released just before the bar line (B->C, E->F voice leading)
    V.forEach((ch, bar) => ch.forEach((m, k) => A.note('comp', 'strpad', bar * 4, bar === 3 ? 3.4 : 3.5, m, 0.55, { pan: (k - 1) * 0.35, p: { rel: 0.3 } })));
    for (let bar = 0; bar < 4; bar++) {
      for (let k = 0; k < 8; k++) {
        if (bar === 3 && k >= 6) continue;
        A.note('bass', 'ebass', bar * 4 + k * 0.5, 0.22, c.root(bar) + (k % 2 ? 12 : 0), k % 2 ? 0.6 : 0.75);
      }
      for (let k = 0; k < 4; k++) A.hit('perc', 'kick', bar * 4 + k, 0.85);
      for (const o of [1, 3]) {
        A.hit('perc', 'clap', bar * 4 + o, 0.55, { pan: -0.1 });
        A.hit('perc', 'snareDisco', bar * 4 + o, 0.42);
      }
      for (let k = 0; k < 4; k++) A.hit('perc', 'hatO', bar * 4 + k + 0.5, 0.42, { pan: 0.3 });
      for (let k = 0; k < 16; k++) A.hit('perc', 'tamb', bar * 4 + k * 0.25, k % 2 ? 0.16 : 0.24, { pan: -0.35 });
    }
    for (const [o, k, v] of [[-0.5, 'tomHi', 0.5], [-0.375, 'tomHi', 0.52], [-0.25, 'tomMid', 0.56], [-0.125, 'tomLo', 0.6]]) A.hit('perc', k, o, v);
    return { tracks: { lead: T(1, 0.05, 0.14, 0.12, { delay: { time: 0.375, fb: 0.25, mix: 0.16 } }), comp: T(0.3, 0, 0.18, 0.1), bass: T(0.42, 0, 0.04, 0.08), perc: T(0.42, 0, 0.06, 0.15) } };
  },

  // 15 1980s synthwave: supersaw lead with ping-pong delay, warm pad, 8th bass, gated snare (natural minor)
  california(A, c) {
    for (const n of c.mel(0)) A.note('lead', 'supersaw', n.b, n.d * 0.92, n.midi, n.vel);
    const V = c.voicings(50, 67);
    // last chord released a beat early so the minor third has gone before the next era's major downbeat
    // and every chord lets go just before the next one (A->Bb, Bb->A, E->F voice leading)
    V.forEach((ch, bar) => ch.forEach((m, k) => A.note('comp', 'pad', bar * 4, bar === 3 ? 2.5 : 3.4, m, 0.55, { pan: ((k / Math.max(1, ch.length - 1)) - 0.5) * 0.8, p: { att: 0.15, rel: 0.3 } })));
    for (let bar = 0; bar < 4; bar++) {
      for (let k = 0; k < 8; k++) {
        if (bar === 3 && k >= 6) continue;
        A.note('bass', 'synthbass', bar * 4 + k * 0.5, 0.42, c.root(bar), k % 2 ? 0.62 : 0.75);
      }
      for (const [o, v] of [[0, 0.85], [2, 0.8], [2.5, 0.55]]) A.hit('perc', 'kick', bar * 4 + o, v);
      for (const o of [1, 3]) A.hit('perc', 'snareGated', bar * 4 + o, 0.72);
      for (let k = 0; k < 8; k++) A.hit('perc', 'hatC', bar * 4 + k * 0.5, k % 2 ? 0.22 : 0.32, { pan: 0.3 });
    }
    for (const [o, k, v] of [[-0.75, 'tomHi', 0.5], [-0.5, 'tomMid', 0.55], [-0.25, 'tomLo', 0.6]]) A.hit('perc', k, o, v);
    return { tracks: { lead: T(1, 0, 0.22, 0.05, { delay: { time: 0.375, fb: 0.3, mix: 0.2, pingpong: true } }), comp: T(0.32, 0, 0.3), bass: T(0.5, 0, 0.04), perc: T(0.44, 0, 0.12, 0.1) } };
  },

  // 16 1991 pixel game: 25% pulse lead, 12.5% arpeggio chords, 4-bit triangle bass, LFSR noise drums
  vindeby(A, c) {
    for (const n of c.mel(1)) A.note('lead', 'chip', n.b, n.d * 0.88, n.midi, n.vel, { p: { duty: 0.25 } });
    const V = c.voicings(62, 76);
    for (let bar = 0; bar < 4; bar++) {
      for (let k = 0; k < (bar === 3 ? 3 : 4); k++) A.note('comp', 'chip', bar * 4 + k, 0.45, V[bar][0], 0.5, { p: { duty: 0.125, arp: V[bar], sustain: 6 } });
      for (let k = 0; k < 8; k++) {
        if (bar === 3 && k >= 6) continue;
        A.note('bass', 'chiptri', bar * 4 + k * 0.5, 0.42, c.root(bar) + 12 + (k % 2 ? 12 : 0), 0.7);
      }
      for (const o of [0, 2, 2.5]) A.hit('perc', 'chipKick', bar * 4 + o, 0.8);
      for (const o of [1, 3]) A.hit('perc', 'chipSnare', bar * 4 + o, 0.62);
      for (let k = 0; k < 8; k++) A.hit('perc', 'chipHat', bar * 4 + k * 0.5, k % 2 ? 0.3 : 0.4, { pan: 0.25 });
    }
    [62, 66, 69, 74, 78].forEach((m, k) => A.note('lead', 'chip', -0.6 + k * 0.1, 0.09, m + 12, 0.45, { p: { duty: 0.5 } }));
    return { tracks: { lead: T(1, 0.08, 0.04, 0.12), comp: T(0.8, -0.25, 0.04, 0.1), bass: T(0.5, 0, 0, 0.06), perc: T(0.5, 0.05, 0, 0.08) } };
  },

  // 17 2017 floating offshore: FM bells over an evolving pad, sub, soft clicks (Lydian, spacious)
  hywind(A, c) {
    // long notes ring on; eighth notes are damped, and any note with a semitone neighbour coming
    // up (C#-D, G#-A) is stopped as that neighbour sounds, so the bells never pile into clusters
    const mel = c.mel(1);
    mel.forEach((n, i) => {
      const p = n.l >= 2 ? { long: 1 } : { damp: 0.35 };
      if (rubsAhead(mel, i)) p.damp = 0.04;
      A.note('lead', 'bell', n.b, n.d, n.midi, n.vel * 0.92, { pan: 0.1, p });
    });
    const V = c.voicings(55, 74);
    // slow pads that hand over at the bar line (released 0.35 s early, new chord swells in over 0.5 s)
    V.forEach((ch, bar) => ch.forEach((m, k) => A.note('comp', 'pad', bar * 4, bar === 3 ? 3.6 : 3.3, m, 0.5, { pan: (k / (ch.length - 1) - 0.5) * 0.8, p: { att: 0.5, rel: 0.6 } })));
    for (let bar = 0; bar < 4; bar++) {
      A.note('bass', 'sub', bar * 4, bar === 3 ? 3.4 : 3.9, c.root(bar), 0.62);
      A.hit('perc', 'kickSoft', bar * 4, 0.45);
      for (const o of [1, 3]) A.hit('perc', 'rim', bar * 4 + o, 0.32, { pan: -0.25 });
      for (let k = 0; k < 8; k++) A.hit('perc', 'shaker', bar * 4 + k * 0.5, k % 2 ? 0.16 : 0.24, { pan: 0.35 });
    }
    A.hit('perc', 'swell', -1, 0.45);
    return { tracks: { lead: T(1, 0.1, 0.5, 0, { delay: { time: 0.75, fb: 0.35, mix: 0.18, pingpong: true } }), comp: T(0.36, 0, 0.5), bass: T(0.42, 0, 0), perc: T(0.75, 0, 0.3, 0.2) } };
  },

  // 18 Taiwan 2019: yueqin with tremolo, sheng fifths, temple gongs, cymbals, clapper and drum (gong pentatonic)
  taiwan(A, c) {
    for (const n of c.mel(1)) {
      if (n.l >= 2) {
        const k = Math.round(n.d / 0.125);
        for (let j = 0; j < k; j++) A.note('lead', 'yueqin', n.b + j * 0.125, 0.125, n.midi, n.vel * (j === 0 ? 1 : j % 2 ? 0.5 : 0.62), { p: j < k - 1 ? { ring: 0.35 } : undefined });
      } else A.note('lead', 'yueqin', n.b, n.d, n.midi, n.vel);
    }
    A.note('comp', 'sheng', 0, 16, 62, 0.45, { pan: -0.2 });
    A.note('comp', 'sheng', 0, 16, 69, 0.38, { pan: 0.2 });
    A.note('drone', 'drone', 0, 16, 50, 0.5);
    for (let bar = 0; bar < 4; bar++) {
      const B = bar * 4;
      A.hit('perc', 'ban', B, 0.55, { pan: -0.2 });
      for (const o of [1, 3]) A.hit('perc', 'gongSmall', B + o, 0.32, { pan: 0.3 });
      for (const [o, v] of [[0, 0.55], [0.5, 0.3], [1.5, 0.4], [2, 0.5], [2.5, 0.3], [3, 0.45], [3.5, 0.3]]) A.hit('perc', 'bangu', B + o, v, { pan: -0.1 });
      if (bar % 2 === 1) A.hit('perc', 'bo', B + 2, 0.3, { pan: 0.15 });
    }
    A.hit('perc', 'gongBig', 0, 0.55);
    A.hit('perc', 'gongBig', 8, 0.42);
    for (let k = 0; k < 6; k++) A.hit('perc', 'bangu', -0.75 + k * 0.125, 0.28 + k * 0.06, { pan: -0.1 });
    return { tracks: { lead: T(1, 0.12, 0.26, 0.05), comp: T(0.5, 0, 0.3), drone: T(0.4, 0, 0.25), perc: T(0.75, 0.1, 0.2, 0.18) } };
  },

  // 19 2020s giants: pluck lead + 16th arps, side-chained supersaw pad and sub, modern electro drums (Lydian)
  giants(A, c) {
    const mel = c.mel(1);
    mel.forEach((n, i) => {
      const p = n.l >= 2 ? { long: 1 } : {};
      if (rubsAhead(mel, i)) p.gate = 0.03; // gate closes before a semitone neighbour
      A.note('lead', 'pluck', n.b, n.d, n.midi, n.vel, { p: Object.keys(p).length ? p : undefined });
    });
    const V = c.voicings(57, 74);
    const seq = [0, 1, 2, 1];
    for (let bar = 0; bar < 4; bar++) {
      const steps = bar === 3 ? 8 : 16;
      for (let k = 0; k < steps; k++) A.note('comp', 'pluck', bar * 4 + k * 0.25, 0.22, at(V[bar], seq[k % 4] + (k % 8 >= 4 ? 1 : 0)), k % 4 === 0 ? 0.55 : 0.4, { pan: k % 2 ? 0.35 : -0.35 });
      V[bar].forEach((m, k) => A.note('pad', 'supersaw', bar * 4, bar === 3 ? 3.5 : 3.6, m - 12, 0.5, { pan: (k - 1) * 0.4, p: { att: 0.06, rel: 0.3 } }));
      A.note('bass', 'sub', bar * 4, bar === 3 ? 3.4 : 3.9, c.root(bar), 0.7);
      for (let k = 0; k < 4; k++) A.hit('perc', 'kick', bar * 4 + k, 0.85);
      for (const o of [1, 3]) A.hit('perc', 'clap', bar * 4 + o, 0.62);
      for (let k = 0; k < 16; k++) A.hit('perc', 'hatC', bar * 4 + k * 0.25, [0.3, 0.15, 0.22, 0.15][k % 4], { pan: 0.3 });
      for (let k = 0; k < 4; k++) A.hit('perc', 'hatO', bar * 4 + k + 0.5, 0.26, { pan: -0.25 });
    }
    A.hit('perc', 'riser', -1, 0.5);
    for (const [o, v] of [[-0.5, 0.3], [-0.375, 0.38], [-0.25, 0.46], [-0.125, 0.55]]) A.hit('perc', 'snareDisco', o, v);
    const kicks = [];
    for (let b = 0; b < 16; b++) kicks.push(A.time(b));
    const duck = { times: kicks, depth: 0.6, release: 0.18 };
    return {
      tracks: {
        lead: T(1, 0, 0.22, 0.05, { delay: { time: 0.375, fb: 0.28, mix: 0.18, pingpong: true } }),
        comp: T(0.45, 0, 0.2, 0.05, { duck: { ...duck, depth: 0.35 } }),
        pad: T(0.28, 0, 0.25, 0, { duck }),
        bass: T(0.48, 0, 0, 0, { duck: { ...duck, depth: 0.5 } }),
        perc: T(0.44, 0, 0.08, 0.1),
      },
    };
  },

  // 20 2026 AI agent: FM electric piano, syncopated chords, sub, light electro with digital glitches (major)
  agent(A, c) {
    for (const n of c.mel(0)) A.note('lead', 'fmkeys', n.b, n.d * 0.95, n.midi, n.vel, { pan: 0.08 });
    const V = c.voicings(52, 67);
    for (let bar = 0; bar < 4; bar++) {
      for (const [o, d] of bar === 3 ? [[0, 0.6], [1.5, 2.3]] : [[0, 0.6], [1.5, 1.0], [3, 0.5]]) V[bar].forEach((m) => A.note('comp', 'fmkeys', bar * 4 + o, d, m, 0.42, { pan: -0.2 }));
      for (const [o, d] of bar === 3 ? [[0, 1.3], [1.5, 2.2]] : [[0, 1.3], [1.5, 0.4], [2.5, 1.3]]) A.note('bass', 'sub', bar * 4 + o, d, c.root(bar), 0.7);
      for (const [o, v] of [[0, 0.85], [1.5, 0.5], [2, 0.78]]) A.hit('perc', 'kick', bar * 4 + o, v);
      for (const o of [1, 3]) A.hit('perc', 'clap', bar * 4 + o, 0.5);
      for (let k = 0; k < 8; k++) A.hit('perc', 'hatC', bar * 4 + k * 0.5, k % 2 ? 0.2 : 0.3, { pan: 0.25 });
      if (bar % 2 === 1) for (const o of [3.25, 3.5, 3.75]) A.hit('perc', 'glitch', bar * 4 + o, 0.22, { pan: (o - 3.5) * 2, p: { v: Math.round(o * 4) } });
    }
    for (let k = 0; k < 6; k++) A.hit('perc', 'glitch', -0.5 + k * 0.0625, 0.2 + k * 0.03, { pan: k % 2 ? 0.3 : -0.3, p: { v: k } });
    return { tracks: { lead: T(1, 0.08, 0.2, 0.12, { delay: { time: 0.25, fb: 0.2, mix: 0.1, pingpong: true } }), comp: T(0.5, -0.2, 0.18, 0.1), bass: T(0.48, 0, 0), perc: T(0.53, 0, 0.08, 0.12) } };
  },
};

// Era lead voices in chronological order (for the outro recap relay).
const RELAY = ['harp', 'santur', 'recorder', 'guitar', 'harpsichord', 'guzheng', 'violin', 'banjo', 'musicbox', 'fiddle', 'piano', 'trumpet', 'vibes', 'analog', 'supersaw', 'chip', 'bell', 'yueqin', 'pluck', 'fmkeys'];

function intro(A) {
  // bars 1–2: wind + wind chimes, a slow pad swell; bar 2: flute states the motif's first bar;
  // bar 3: IV -> V turnaround while the bicycle bell rings and the rider sets off (4.0 s).
  // Chord tones that would rub a semitone against the next chord let go just before it
  // (F# before IV's G, IV before V's C#, V's C# before the harp's D sweep into era 01).
  [50, 57, 62, 66].forEach((m, k) => A.note('pad', 'pad', 0.5, m === 66 ? 7 : 7.5, m, 0.5, { pan: (k - 1.5) * 0.25, p: { att: 1.4, rel: m === 66 ? 0.3 : 0.6 } }));
  [55, 59, 62].forEach((m, k) => A.note('pad', 'pad', 8, 1.6, m, 0.48, { pan: (k - 1) * 0.3, p: { att: 0.25, rel: 0.25 } }));
  [57, 61, 64].forEach((m, k) => A.note('pad', 'pad', 10, m === 61 ? 1.2 : 1.9, m, 0.48, { pan: (k - 1) * 0.3, p: { att: 0.25, rel: m === 61 ? 0.3 : 0.5 } }));
  const fl = [[4, 1, 81], [5, 0.5, 78], [5.5, 0.5, 81], [6, 1.5, 86], [7.5, 0.5, 85], [8, 1, 83], [9, 0.5, 79], [9.5, 0.5, 83], [10, 1.4, 85]];
  fl.forEach(([b, d, m], k) => A.note('lead', 'recorder', b, d * 0.95, m, 0.5 + k * 0.015, { p: { soft: 1 } }));
  const chimes = [[0.6, 86, 0.32], [1.3, 93, 0.25], [1.75, 88, 0.3], [2.6, 90, 0.26], [3.1, 95, 0.2], [3.45, 86, 0.24], [6.8, 93, 0.16], [11.2, 90, 0.15]];
  chimes.forEach(([b, m, v], k) => A.note('chime', 'bell', b, 1, m, v, { pan: k % 2 ? 0.45 : -0.4 }));
  A.hit('fx', 'bikeBell', 8, 0.55, { pan: -0.1 });
  A.hit('fx', 'bikeBell', 8.42, 0.45, { pan: -0.1 });
  return { tracks: { pad: T(0.4, 0, 0.45), lead: T(0.85, 0.05, 0.45), chime: T(0.55, 0, 0.55), fx: T(0.6, -0.1, 0.2, 0.15) } };
}

function outro(A) {
  const c = makeCtx('major');
  // bars 1–4: the motif once more in D major, every note handed to the next era's voice in
  // chronological order, glued by a soft legato violin an octave below; harp keeps cycling.
  for (const n of c.mel(1)) {
    const v = RELAY[Math.round((n.i * (RELAY.length - 1)) / (MOTIF.length - 1))];
    const p = v === 'chip' ? { duty: 0.25 } : v === 'bell' ? { long: 1 } : v === 'piano' ? { honky: 1 } : undefined;
    A.note('relay', v, n.b, n.d * 0.95, n.midi, n.vel * 0.95, { pan: ((n.i % 5) - 2) * 0.15, p });
    A.note('glue', 'violin', n.b, n.d * 0.98, n.midi - 12, 0.4);
  }
  const V = c.voicings(50, 67);
  const seq = [0, 1, 2, 3, 2, 1, 2, 1];
  for (let bar = 0; bar < 4; bar++) {
    for (let k = 0; k < 8; k++) A.note('harp', 'harp', bar * 4 + k * 0.5, 0.5, at(V[bar], seq[k]), k % 2 ? 0.38 : 0.46, { pan: -0.3 });
    V[bar].forEach((m, k) => A.note('pad', 'pad', bar * 4, 3.4, m, 0.42, { pan: (k - 1) * 0.35, p: { att: 0.3, rel: 0.4 } }));
    A.note('bass', 'cello', bar * 4, 1.9, c.root(bar) + 12, 0.5);
    A.note('bass', 'cello', bar * 4 + 2, 1.9, c.fifth(bar) + 12, 0.45);
    A.note('sub', 'sub', bar * 4, 3.9, c.root(bar), 0.5);
    A.hit('perc', 'frameDum', bar * 4, 0.6);
    A.hit('perc', 'frameDum', bar * 4 + 2, 0.5);
    for (let k = 0; k < 8; k++) A.hit('perc', 'shaker', bar * 4 + k * 0.5, k % 2 ? 0.14 : 0.2, { pan: 0.35 });
    A.hit('perc', 'castanet', bar * 4 + 3.5, 0.25, { pan: 0.4 });
  }
  // bar 5: IV -> V7 cadence with a tutti line
  const cad = [[16, 0.5, 83], [16.5, 0.5, 85], [17, 1, 86], [18, 1, 88], [19, 1, 85]];
  for (const [b, d, m] of cad) {
    const lift = b === 19 ? 0.8 : 0.95; // the leading tone C# lets go before the final D
    A.note('relay', 'violin', b, d * lift, m, 0.7, { pan: 0.15 });
    A.note('relay', 'trumpet', b, d * Math.min(lift, 0.9), m - 12, 0.45, { pan: -0.1 });
    A.note('relay', 'vibes', b, d * lift, m, 0.38, { pan: 0.25, p: { pedal: 0.04 } });
  }
  const IV = voiceChord('major', [3, 5, 7], 50, 67, V[3]);
  const V7 = voiceChord('major', [4, 6, 8, 10], 50, 67, IV);
  for (const [b, ch, root] of [[16, IV, 43], [18, V7, 45]]) {
    for (let k = 0; k < 4; k++) A.note('harp', 'harp', b + k * 0.5, 0.5, at(ch, seq[k]), 0.42, { pan: -0.3 });
    ch.forEach((m, k) => A.note('pad', 'pad', b, 1.6, m, 0.45, { pan: (k - 1) * 0.35, p: { att: 0.2, rel: 0.25 } }));
    A.note('bass', 'cello', b, 1.9, root + 12, 0.5);
    A.note('sub', 'sub', b, 1.9, root, 0.5);
    A.hit('perc', 'frameDum', b, 0.55);
  }
  for (let k = 0; k < 4; k++) A.hit('perc', 'frameDum', 19 + k * 0.25, 0.3 + k * 0.1);
  A.hit('perc', 'riser', 19, 0.45);
  // bar 6 (176.0 s): resolved D major (add9) chord, every family together, ringing out
  [38, 50, 57, 62, 66, 69, 74].forEach((m, k) => A.note('harp', 'harp', 19.72 + k * 0.04, 3, m, 0.5 + k * 0.03, { pan: -0.3 + k * 0.08 }));
  A.note('relay', 'violin', 20, 3.4, 86, 0.65, { pan: 0.15 });
  A.note('relay', 'trumpet', 20, 2.6, 74, 0.42, { pan: -0.1 });
  A.note('relay', 'horn', 20, 2.6, 66, 0.4, { pan: -0.25 });
  A.note('relay', 'horn', 20, 2.6, 69, 0.38, { pan: 0.25 });
  A.note('relay', 'bell', 20, 2, 86, 0.45, { pan: 0.3, p: { long: 1 } });
  A.note('relay', 'musicbox', 20.5, 1, 90, 0.35, { pan: 0.4 });
  A.note('relay', 'musicbox', 21, 1, 93, 0.3, { pan: -0.4 });
  A.note('relay', 'santur', 20, 2, 74, 0.35, { pan: -0.4 });
  [50, 57, 66, 76].forEach((m, k) => A.note('pad', 'pad', 20, 3.4, m, 0.45, { pan: (k - 1.5) * 0.3, p: { att: 0.15, rel: 0.8 } }));
  A.note('bass', 'cello', 20, 3.4, 50, 0.5);
  A.note('bass', 'cello', 20, 3.4, 38, 0.45);
  A.note('sub', 'sub', 20, 3.2, 38, 0.55);
  A.hit('perc', 'frameDum', 20, 0.7);
  A.hit('perc', 'kickSoft', 20, 0.6);
  A.hit('perc', 'gongBig', 20, 0.3);
  A.hit('perc', 'cymbal', 20, 0.3, { pan: 0.3 });
  // the rider coasts on: freewheel ticks slowing down, one last bell
  let b = 20.8;
  for (let k = 0; k < 22 && b < 23.6; k++) {
    A.hit('fx', 'tick', b, 0.3 - k * 0.008, { pan: 0.1 });
    b += 0.13 + k * 0.012;
  }
  A.hit('fx', 'bikeBell', 22, 0.35, { pan: 0.15 });
  return {
    tracks: {
      relay: T(0.95, 0, 0.3, 0.1),
      glue: T(0.5, 0.1, 0.32, 0.1),
      harp: T(0.45, -0.3, 0.3),
      pad: T(0.3, 0, 0.4),
      bass: T(0.52, -0.1, 0.2, 0.15),
      sub: T(0.3, 0, 0),
      perc: T(0.48, 0.1, 0.15, 0.15),
      fx: T(0.22, 0.1, 0.1, 0.1),
    },
  };
}

// -----------------------------------------------------------------------------
// Per-era mix intent: relative loudness (dB) and wind strength (0..1).
// -----------------------------------------------------------------------------
const ERA_LOUD = { nile: 0, persia: 0, postmill: 0, quixote: -0.4, dutch: -0.6, china: -0.2, smeaton: -0.1, halladay: -0.4, brush: 0.2, lacour: 0, betz: 0, putnam: 0, gedser: 0.1, tvind: 0, california: 0, vindeby: -0.3, hywind: -0.3, taiwan: -1.4, giants: 0, agent: 0 };
export const ERA_WIND = { nile: 0.85, persia: 0.7, postmill: 0.55, quixote: 0.65, dutch: 0.6, china: 0.5, smeaton: 0.35, halladay: 0.55, brush: 0.4, lacour: 0.45, betz: 0.3, putnam: 0.5, gedser: 0.5, tvind: 0.45, california: 0.5, vindeby: 0.85, hywind: 0.95, taiwan: 0.9, giants: 0.85, agent: 0.5 };
const HUMAN = { nile: 1, persia: 1, postmill: 1, quixote: 1, dutch: 0.7, china: 1, smeaton: 0.8, halladay: 1, brush: 0.4, lacour: 1, betz: 0.9, putnam: 0.6, gedser: 1, tvind: 0.3 };
const SWING = { halladay: 0.64, betz: 0.6, gedser: 0.64 };

/** Build all sections of the film score. Pure & deterministic. */
export function buildScore() {
  const sections = [];
  {
    const A = new Arr(0, { seed: hashStr('intro') });
    const r = intro(A);
    sections.push({ id: 'intro', index: -1, t0: 0, t1: INTRO_SEC, start: 0, end: INTRO_SEC + 0.6, events: A.events, ...r, loudDb: -4.5, measure: [0.5, INTRO_SEC] });
  }
  ERAS.forEach((era, i) => {
    const t0 = INTRO_SEC + i * SCENE_SEC;
    const mode = (era.music && era.music.mode) || 'major';
    const A = new Arr(t0, { swing: SWING[era.id] ?? 0.5, human: HUMAN[era.id] ?? 0, seed: hashStr(era.id) });
    const fn = ERA_ARR[era.id] || ERA_ARR.agent;
    const r = fn(A, makeCtx(mode));
    sections.push({ id: era.id, index: i, mode, t0, t1: t0 + SCENE_SEC, start: t0 - 0.5, end: t0 + SCENE_SEC + 0.6, events: A.events, ...r, loudDb: ERA_LOUD[era.id] ?? 0, measure: [t0, t0 + SCENE_SEC] });
  });
  {
    const A = new Arr(OUTRO_START, { seed: hashStr('outro') });
    const r = outro(A);
    sections.push({ id: 'outro', index: ERAS.length, t0: OUTRO_START, t1: TOTAL_DURATION, start: OUTRO_START - 0.5, end: TOTAL_DURATION, events: A.events, ...r, loudDb: 0.5, measure: [OUTRO_START, OUTRO_START + 10] });
  }
  return sections;
}

/**
 * Wind strength over the film (0..1): strong at the very start (the wind comes first), the
 * per-era level, then a lull that swells again under the final chord. Segments are blended
 * with a 1.2 s smoothstep centred on every bar-line boundary (intro|01 … 20|outro), so the
 * curve is continuous everywhere.
 */
export function windinessAt(t) {
  const n = ERAS.length;
  const level = (idx, tt) => {
    if (idx < 0) return 0.95 - 0.25 * clamp((tt - 2) / 3, 0, 1); // intro: 0.95 -> 0.7
    if (idx >= n) return 0.6 + 0.25 * clamp((tt - 174) / 2, 0, 1); // outro: 0.6 -> 0.85
    return ERA_WIND[ERAS[idx].id] ?? 0.5;
  };
  const x = (t - INTRO_SEC) / SCENE_SEC;
  const seg = clamp(Math.floor(x), -1, n);
  const kb = clamp(Math.round(x), 0, n); // nearest boundary
  const dt = t - (INTRO_SEC + kb * SCENE_SEC);
  const H = 0.6;
  if (dt > -H && dt < H) {
    const u = (dt + H) / (2 * H);
    const s = u * u * (3 - 2 * u);
    return level(kb - 1, t) * (1 - s) + level(kb, t) * s;
  }
  return level(seg, t);
}
