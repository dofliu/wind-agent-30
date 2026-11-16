// src/audio/instruments.js — procedural instrument & percussion voices.
//
// Every voice is a pure function (sr, freq, dur, vel, params, rand) -> Float32Array (mono),
// rendered in plain JS so results are deterministic and can be cached per (voice, pitch,
// duration, velocity-bucket). `vel` only changes timbre here; loudness is applied by the
// mixer. Each voice is auto-calibrated (K-weighted RMS of a reference note) so mix gains
// mean the same thing for a harp as for a tuba.
//
// Techniques: extended Karplus–Strong strings (precomputed buffers, no AudioWorklet),
// modal / additive bars and bells, 2-op FM, band-limited subtractive synths, chip voices
// and noise-based percussion — all driven by seeded PRNGs only.

import { TAU, SVF, Biquad, eq, dcBlock, fadeEnds, sawBL, pulseBL, adsr, t60coef, clamp, smoothstep, mulberry32, hashStr, kRmsMax, mtof, fsin } from './dsp.js';

// =============================================================================
// Building blocks
// =============================================================================

/**
 * Extended Karplus–Strong string.
 * o: { t60, ring, rel, b (loss 0..0.5), pick (0..0.5), bright (0..1), hammer (s), body, bend(t)->semitones, detune (cents) }
 */
function ks(sr, f0, dur, vel, o, rnd) {
  const ring = o.ring ?? 2;
  const rel = o.rel;
  const len = Math.max(8, Math.ceil(sr * (rel != null ? Math.min(dur, ring) + rel * 0.75 : ring)));
  const f = f0 * Math.pow(2, (o.detune || 0) / 1200);
  const out = new Float32Array(len);
  const b = o.b ?? 0.5;
  const P = sr / f;
  const maxP = P * (o.bend ? 1.6 : 1) + 8;
  let size = 64;
  while (size < maxP) size <<= 1;
  const mask = size - 1;
  const line = new Float32Array(size);

  // ---- excitation (one period) --------------------------------------------
  const exLen = Math.max(4, Math.round(P));
  const ex = new Float32Array(exLen);
  if (o.hammer) {
    const w = Math.max(2, Math.round(sr * o.hammer));
    for (let i = 0; i < exLen; i++) {
      const pulse = i < w ? 0.5 - 0.5 * Math.cos((TAU * i) / w) : 0;
      ex[i] = pulse + 0.15 * (rnd() * 2 - 1);
    }
  } else {
    for (let i = 0; i < exLen; i++) ex[i] = rnd() * 2 - 1;
  }
  // brightness: one-pole lowpass on the excitation
  const a = clamp((o.bright ?? 0.6) * (0.45 + 0.55 * vel), 0.03, 1);
  let z = 0;
  for (let i = 0; i < exLen; i++) {
    z += a * (ex[i] - z);
    ex[i] = z;
  }
  // pick position comb
  const pk = Math.max(1, Math.round((o.pick ?? 0.2) * P));
  for (let i = exLen - 1; i >= pk; i--) ex[i] -= ex[i - pk];
  let mean = 0;
  for (let i = 0; i < exLen; i++) mean += ex[i];
  mean /= exLen;
  let pk2 = 1e-9;
  for (let i = 0; i < exLen; i++) {
    ex[i] -= mean;
    pk2 = Math.max(pk2, Math.abs(ex[i]));
  }
  for (let i = 0; i < exLen; i++) ex[i] /= pk2;

  // ---- loop ----------------------------------------------------------------
  const g0 = Math.pow(0.001, 1 / (o.t60 * f));
  const gR = rel != null ? Math.pow(0.001, 1 / (rel * f)) : g0;
  const offN = rel != null ? Math.round(Math.min(dur, ring) * sr) : Infinity;
  let D = P - b;
  let prev = 0;
  for (let n = 0; n < len; n++) {
    if (o.bend && (n & 15) === 0) D = sr / (f * Math.pow(2, o.bend(n / sr) / 12)) - b;
    const rp = n - D;
    const i0 = Math.floor(rp);
    const fr = rp - i0;
    const v = line[i0 & mask] * (1 - fr) + line[(i0 + 1) & mask] * fr;
    const lp = (1 - b) * v + b * prev;
    prev = v;
    const y = (n < exLen ? ex[n] : 0) + (n < offN ? g0 : gR) * lp;
    line[n & mask] = y;
    out[n] = y;
  }
  dcBlock(out, sr, 25);
  if (o.body) eq(out, sr, o.body);
  return fadeEnds(out, sr, 0, 20);
}

/** Add an exponentially decaying sinusoid (two-pole resonator recurrence). */
function addMode(out, sr, f, amp, t60, ph = 0, offN = Infinity, relT60 = 0, start = 0) {
  if (f <= 0 || f >= sr * 0.45 || amp === 0) return;
  const w = (TAU * f) / sr;
  let r = t60coef(t60, sr);
  const r2 = relT60 > 0 ? t60coef(relT60, sr) : r;
  let c = 2 * r * Math.cos(w);
  let rr = r * r;
  // y[n] = A r^n sin(w n + ph)
  let y2 = (amp * Math.sin(ph - 2 * w)) / (r * r);
  let y1 = (amp * Math.sin(ph - w)) / r;
  // stop once the partial has decayed below -100 dB of its start (saves most of the work)
  const thr = 1e-5 / Math.abs(amp);
  let end = start + Math.ceil(Math.log(thr) / Math.log(r));
  if (offN < end) {
    const left = Math.abs(amp) * Math.pow(r, offN - start);
    end = left < 1e-5 ? offN : offN + Math.ceil(Math.log(1e-5 / left) / Math.log(r2));
  }
  end = Math.min(out.length, end);
  for (let n = start; n < end; n++) {
    if (n === offN) {
      r = r2;
      c = 2 * r * Math.cos(w);
      rr = r * r;
    }
    const y = c * y1 - rr * y2;
    out[n] += y;
    y2 = y1;
    y1 = y;
  }
}

function noiseBurst(out, sr, rnd, filt, amp, decay, attack = 0, start = 0, lenS = Infinity) {
  // stop at -90 dB
  const n1 = Math.min(out.length, start + Math.round(lenS * sr), start + Math.ceil((attack + decay * 10.4) * sr));
  const na = Math.round(attack * sr);
  const dk = Math.exp(-1 / (decay * sr));
  let e = 1;
  for (let n = start; n < n1; n++) {
    const i = n - start;
    let x = rnd() * 2 - 1;
    if (filt) for (const fl of filt) x = fl.process(x);
    if (i < na) out[n] += (amp * x * i) / na;
    else {
      out[n] += amp * e * x;
      e *= dk;
    }
  }
}

/** Padé tanh approximation (|err| < 2e-3 within ±3, saturates beyond). */
function ftanh(x) {
  if (x > 3) return 1;
  if (x < -3) return -1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}
const softClip = (x, k) => ftanh(k * x) / ftanh(k);

// =============================================================================
// Pitched voices
// =============================================================================

function piano(sr, f, dur, vel, p, rnd) {
  const honky = p.honky ? 7 : 1.2;
  const len = Math.ceil(sr * (Math.min(dur, 2.2) + 0.35));
  const out = new Float32Array(len);
  const offN = Math.round(Math.min(dur, 2.2) * sr);
  const B = 0.00012 * Math.pow(f / 130, 1.2);
  const K = Math.min(16, Math.floor((sr * 0.42) / f));
  const t60base = clamp(9 * Math.pow(110 / f, 0.55), 1.4, 9);
  const hard = 0.35 + 0.65 * vel;
  const detunes = [0, honky, -honky * 0.8];
  for (let s = 0; s < 3; s++) {
    const fs = f * Math.pow(2, detunes[s] / 1200);
    for (let k = 1; k <= K; k++) {
      const fk = k * fs * Math.sqrt(1 + B * k * k);
      // hammer spectrum: brighter with velocity; strike point near 1/8 suppresses k=8
      const amp = (Math.exp(-(k - 1) * (0.55 - 0.35 * hard) * Math.sqrt(f / 260)) * Math.abs(Math.sin((Math.PI * k) / 8.3))) / k ** 0.35;
      const t60 = t60base / (1 + 0.22 * (k - 1) ** 1.25);
      addMode(out, sr, fk, amp / 3, t60, rnd() * TAU, offN, 0.18 + 0.05 * s);
    }
  }
  // hammer thump
  noiseBurst(out, sr, rnd, [Biquad.make('lowpass', 900, 0.7, 0, sr)], 0.25 * hard, 0.012);
  for (let n = 0; n < Math.min(len, 64); n++) out[n] *= n / 64;
  return fadeEnds(dcBlock(out, sr, 20), sr, 0, 30);
}

function vibes(sr, f, dur, vel, p, rnd) {
  const len = Math.ceil(sr * (Math.min(dur + 0.6, 2.8) + 0.2));
  const out = new Float32Array(len);
  const offN = Math.round(Math.min(dur + 0.6, 2.8) * sr);
  addMode(out, sr, f, 1, 3.2, 0, offN, 0.25);
  addMode(out, sr, f * 3.98, 0.2 * (0.5 + vel), 1.0, 0, offN, 0.15);
  addMode(out, sr, f * 9.94, 0.06 * (0.4 + vel), 0.3, 0, offN, 0.1);
  noiseBurst(out, sr, rnd, [Biquad.make('bandpass', 2500, 1.2, 0, sr)], 0.12 * vel, 0.004);
  for (let n = 0; n < Math.min(len, 40); n++) out[n] *= n / 40;
  return fadeEnds(out, sr, 0, 30);
}

function musicBox(sr, f, dur, vel, p, rnd) {
  const len = Math.ceil(sr * 2.0);
  const out = new Float32Array(len);
  addMode(out, sr, f, 1, 2.2, 0);
  addMode(out, sr, f * 1.0016, 0.35, 2.0, 1.1); // twin tine shimmer
  addMode(out, sr, f * 5.93, 0.22 * (0.6 + vel), 0.45, 0);
  addMode(out, sr, f * 12.4, 0.07, 0.15, 0);
  noiseBurst(out, sr, rnd, [Biquad.make('highpass', 4000, 0.7, 0, sr)], 0.25, 0.0025);
  for (let n = 0; n < 20; n++) out[n] *= n / 20;
  return fadeEnds(out, sr, 0, 40);
}

/** DX7-flavoured electric piano: soft 1:1 pair + bright 14:1 tine pair. */
function fmKeys(sr, f, dur, vel, p, rnd) {
  const hold = Math.min(dur, 2.5);
  const len = Math.ceil(sr * (hold + 0.45));
  const out = new Float32Array(len);
  const offN = Math.round(hold * sr);
  let pc = 0;
  let pt = 0;
  const dc = f / sr;
  const decay = clamp(2.6 * Math.pow(260 / f, 0.4), 0.8, 4);
  const det = 1.0012;
  let pc2 = 0.3;
  const kD = Math.exp(-1 / (decay * sr));
  const kR = Math.exp(-1 / (0.12 * sr));
  const kI = Math.exp(-1 / (0.5 * sr));
  const kT = Math.exp(-1 / (0.05 * sr));
  const kT2 = Math.exp(-1 / (0.18 * sr));
  let eD = 1;
  let eR = 1;
  let eI = 0.6 + 1.6 * vel;
  let eT = (1.2 * vel + 0.3) / TAU;
  let eT2 = 1;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    if (n >= offN) eR *= kR;
    const eAmp = eD * eR * (n < 88 ? n / 88 : 1);
    eD *= kD;
    const idx = eI + 0.25;
    eI *= kI;
    pc += dc;
    pc2 += dc * det;
    pt += dc * 14;
    if (pc >= 1) pc -= 1;
    if (pc2 >= 1) pc2 -= 1;
    if (pt >= 1) pt -= 1;
    const body = fsin(pc + (idx / TAU) * fsin(pc)) + 0.6 * fsin(pc2 + ((idx * 0.8) / TAU) * fsin(pc2));
    const tine = t < 1 ? fsin(pc + eT * fsin(pt)) * eT2 : 0;
    eT *= kT;
    eT2 *= kT2;
    out[n] = (0.62 * body + 0.35 * tine) * eAmp;
  }
  return fadeEnds(out, sr, 0, 20);
}

/** Glassy FM bell (carrier:mod 1:3.5) for ambient eras, chimes and the outro. */
function bell(sr, f, dur, vel, p, rnd) {
  const L = p.long ? 3.6 : 2.6;
  const len = Math.ceil(sr * L);
  const out = new Float32Array(len);
  let pc = rnd();
  let pm = rnd();
  let p2 = rnd();
  const dc = f / sr;
  const kE = Math.exp(-1 / (L * 0.32 * sr));
  const kI = Math.exp(-1 / (0.45 * sr));
  const kP = Math.exp(-1 / (0.8 * sr));
  let eE = 1;
  let eI = 1.2 + 1.8 * vel;
  let eP = 0.18;
  const na = Math.round(0.003 * sr);
  for (let n = 0; n < len; n++) {
    const e = eE * (n < na ? n / na : 1);
    eE *= kE;
    const idx = eI + 0.35;
    eI *= kI;
    pc += dc;
    pm += dc * 3.5;
    p2 += dc * 2.0;
    if (pc >= 1) pc -= 1;
    if (pm >= 1) pm -= 1;
    if (p2 >= 1) p2 -= 1;
    out[n] = e * (fsin(pc + (idx / TAU) * fsin(pm)) + eP * fsin(p2));
    eP *= kP;
  }
  return fadeEnds(out, sr, 0, 60);
}

function bowedCore(sr, f, dur, vel, p, rnd, c) {
  const len = Math.ceil(sr * (dur + c.rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  let ph = rnd();
  const lp = new SVF().set(Math.min(f * c.lpMul, c.lpMax), 0.6, sr);
  const lp2 = new SVF().set(Math.min(f * c.lpMul * 1.3, c.lpMax * 1.2), 0.6, sr);
  const nb = new SVF().set(clamp(f * 4, 800, 6000), 0.9, sr);
  const vibPh = rnd();
  const vibRate = c.vibRate * (0.95 + 0.1 * rnd());
  const slide = p.slide || 0;
  let jit = 0;
  const att = p.att ?? c.att;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    let cents = t > c.vibDelay ? c.vib * smoothstep(c.vibDelay, c.vibDelay + 0.3, t) * fsin(vibRate * t + vibPh) : 0;
    if ((n & 63) === 0) jit = jit * 0.97 + (rnd() - 0.5) * 0.6;
    cents += jit;
    if (slide) {
      const k = Math.max(0, 1 - t / 0.08);
      cents += slide * 100 * k * k;
    }
    const fi = f * (1 + cents * 5.7779e-4);
    const dt = fi / sr;
    ph += dt;
    if (ph >= 1) ph -= 1;
    let v = sawBL(ph, dt);
    v = lp2.lp(lp.lp(v));
    const e = adsr(t, dur, att, 0.15, 0.82, c.rel) * (1 + c.swell * smoothstep(0.1, Math.max(0.2, dur), t));
    out[n] = (v + c.noise * nb.bp(rnd() * 2 - 1)) * e;
  }
  eq(out, sr, c.body);
  return fadeEnds(out, sr, 1, 10);
}

const BOWED = {
  violin: { att: 0.07, rel: 0.14, vib: 14, vibRate: 5.6, vibDelay: 0.16, lpMul: 9, lpMax: 7000, noise: 0.05, swell: 0.12, body: [['peaking', 290, 2.5, 5], ['peaking', 520, 2.5, 3], ['peaking', 2800, 1.2, 4], ['peaking', 5200, 2, -5], ['highpass', 180, 0.7, 0]] },
  viola: { att: 0.08, rel: 0.16, vib: 12, vibRate: 5.3, vibDelay: 0.18, lpMul: 8, lpMax: 5000, noise: 0.04, swell: 0.1, body: [['peaking', 230, 2.5, 5], ['peaking', 420, 2.5, 3], ['peaking', 2200, 1.2, 3], ['highpass', 120, 0.7, 0]] },
  cello: { att: 0.08, rel: 0.2, vib: 10, vibRate: 5.0, vibDelay: 0.2, lpMul: 9, lpMax: 3500, noise: 0.035, swell: 0.08, body: [['peaking', 110, 2, 4], ['peaking', 220, 2.5, 3], ['peaking', 1200, 1.5, 2], ['highpass', 50, 0.7, 0]] },
  fiddle: { att: 0.04, rel: 0.1, vib: 7, vibRate: 6.0, vibDelay: 0.25, lpMul: 11, lpMax: 7500, noise: 0.08, swell: 0.05, body: [['peaking', 300, 2.5, 5], ['peaking', 600, 2, 2], ['peaking', 3000, 1.2, 5], ['peaking', 5500, 2, -4], ['highpass', 190, 0.7, 0]] },
};

function brassCore(sr, f, dur, vel, p, rnd, c) {
  const len = Math.ceil(sr * (dur + c.rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  let ph = rnd();
  let ph2 = rnd();
  const f1 = new SVF();
  const f2 = new SVF();
  const vibPh = rnd() * TAU;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    const e = adsr(t, dur, c.att, 0.15, 0.78, c.rel);
    if ((n & 31) === 0) {
      const fc = f * (c.base + c.bright * Math.pow(e, 1.6) * (0.55 + 0.45 * vel)) + 150;
      f1.set(Math.min(fc, 9000), 0.75, sr);
      f2.set(Math.min(fc * 1.4, 10000), 0.6, sr);
    }
    const cents = -c.scoop * Math.exp(-t / 0.035) + c.vib * smoothstep(0.25, 0.55, t) * Math.sin(TAU * 5.4 * t + vibPh);
    const fi = f * (1 + cents * 5.7779e-4);
    const dt = fi / sr;
    ph += dt;
    if (ph >= 1) ph -= 1;
    ph2 += dt * 1.0035;
    if (ph2 >= 1) ph2 -= 1;
    let v = sawBL(ph, dt) + c.ens * sawBL(ph2, dt * 1.0035);
    v = f2.lp(f1.lp(v));
    out[n] = softClip(v * (0.6 + 0.5 * e), c.sat) * e;
  }
  eq(out, sr, c.body);
  return fadeEnds(out, sr, 1, 10);
}

const BRASS = {
  trumpet: { att: 0.03, rel: 0.09, base: 1.4, bright: 9, scoop: 35, vib: 6, ens: 0.45, sat: 1.6, body: [['peaking', 1300, 1.2, 3], ['highpass', 200, 0.7, 0], ['lowpass', 8000, 0.7, 0]] },
  horn: { att: 0.05, rel: 0.12, base: 1.2, bright: 4, scoop: 25, vib: 0, ens: 0.5, sat: 1.2, body: [['peaking', 500, 1.2, 2], ['lowpass', 3500, 0.7, 0], ['highpass', 90, 0.7, 0]] },
  tuba: { att: 0.035, rel: 0.1, base: 1.6, bright: 4.5, scoop: 20, vib: 0, ens: 0.3, sat: 1.4, body: [['peaking', 240, 1.5, 3], ['lowpass', 2200, 0.7, 0], ['highpass', 30, 0.7, 0]] },
};

/** Free-reed / reed organ family (accordion, pump organ, sheng, drones). */
function reedCore(sr, f, dur, vel, p, rnd, c) {
  const len = Math.ceil(sr * (dur + c.rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  const nv = c.cents.length;
  const phs = c.cents.map(() => rnd());
  const incs = c.cents.map((ct) => (f * Math.pow(2, ct / 1200)) / sr);
  const lp = new SVF().set(Math.min(c.lp, f * c.lpMul), 0.7, sr);
  const tremPh = rnd() * TAU;
  const att = p.att ?? c.att;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    let v = 0;
    for (let i = 0; i < nv; i++) {
      phs[i] += incs[i];
      if (phs[i] >= 1) phs[i] -= 1;
      v += c.saw * sawBL(phs[i], incs[i]) + (1 - c.saw) * pulseBL(phs[i], incs[i], c.duty);
    }
    v = lp.lp(v / nv);
    const trem = 1 + c.trem * Math.sin(TAU * c.tremRate * t + tremPh);
    out[n] = v * adsr(t, dur, att, 0.1, 0.9, c.rel) * trem;
  }
  eq(out, sr, c.body);
  return fadeEnds(out, sr, 1, 10);
}

const REED = {
  accordion: { cents: [0, 9, -8], saw: 0.4, duty: 0.32, lp: 4200, lpMul: 14, att: 0.03, rel: 0.07, trem: 0.03, tremRate: 4, body: [['peaking', 1200, 1, 3], ['highpass', 150, 0.7, 0]] },
  accbass: { cents: [0, 1200], saw: 0.6, duty: 0.4, lp: 1600, lpMul: 10, att: 0.02, rel: 0.08, trem: 0, tremRate: 1, body: [['peaking', 160, 1.4, 3], ['highpass', 45, 0.7, 0]] },
  organ: { cents: [0, 2], saw: 0.2, duty: 0.42, lp: 1900, lpMul: 7, att: 0.09, rel: 0.14, trem: 0.025, tremRate: 1.1, body: [['peaking', 700, 1, 2], ['highpass', 70, 0.7, 0]] },
  sheng: { cents: [0, 4, 1200], saw: 0.3, duty: 0.3, lp: 3500, lpMul: 9, att: 0.12, rel: 0.25, trem: 0.02, tremRate: 5, body: [['peaking', 1500, 1.2, 3], ['highpass', 200, 0.7, 0]] },
  drone: { cents: [0, 3, -3], saw: 0.1, duty: 0.5, lp: 1100, lpMul: 6, att: 0.6, rel: 0.6, trem: 0.06, tremRate: 0.35, body: [['peaking', 450, 1, 2], ['highpass', 80, 0.7, 0]] },
  pipes: { cents: [0, 5], saw: 0.7, duty: 0.5, lp: 2000, lpMul: 9, att: 0.25, rel: 0.3, trem: 0.02, tremRate: 0.5, body: [['peaking', 1100, 1.5, 3], ['highpass', 100, 0.7, 0]] },
};

/** Recorder / flute: near-sine with breath noise and a tonguing chiff. */
function recorder(sr, f, dur, vel, p, rnd) {
  const soft = !!p.soft;
  const rel = soft ? 0.18 : 0.06;
  const len = Math.ceil(sr * (dur + rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  let ph = rnd();
  const nb = new SVF().set(Math.min(f * 2, 9000), 1.4, sr);
  const ch = new SVF().set(Math.min(f * 3, 10000), 0.8, sr);
  const vibPh = rnd();
  const att = soft ? 0.08 : 0.025;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    const cents = (t < 0.3 ? 9 * Math.exp(-t / 0.04) : 0) + (t > 0.25 ? 9 * smoothstep(0.25, 0.6, t) * fsin(5.2 * t + vibPh) : 0);
    ph += (f * (1 + cents * 5.7779e-4)) / sr;
    if (ph >= 1) ph -= 1;
    const tone = fsin(ph) + 0.1 * fsin(2 * ph) + (soft ? 0.03 : 0.11) * fsin(3 * ph);
    const e = adsr(t, dur, att, 0.1, 0.9, rel);
    const breath = nb.bp(rnd() * 2 - 1) * (soft ? 0.12 : 0.08);
    const chiff = soft || t > 0.12 ? 0 : ch.bp(rnd() * 2 - 1) * 0.9 * Math.exp(-t / 0.018) * Math.min(1, t / 0.002);
    out[n] = (tone + breath) * e + chiff;
  }
  return fadeEnds(out, sr, 1, 10);
}

/** Polyphonic-style detuned saw pad (one note). */
function padCore(sr, f, dur, vel, p, rnd, c) {
  const att = p.att ?? c.att;
  const rel = p.rel ?? c.rel;
  const len = Math.ceil(sr * (dur + rel * 1.25 + 0.02));
  const out = new Float32Array(len);
  const n = c.cents.length;
  const phs = c.cents.map(() => rnd());
  const incs = c.cents.map((ct) => (f * Math.pow(2, ct / 1200)) / sr);
  const lfoPh = c.cents.map(() => rnd());
  const cur = new Float64Array(n);
  const f1 = new SVF();
  const hp = new SVF().set(c.hp, 0.7, sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const e = adsr(t, dur, att, 0.3, 0.85, rel);
    if ((i & 31) === 0) f1.set(Math.min(c.lp0 + (c.lp1 - c.lp0) * e, f * 24), c.q, sr);
    if ((i & 31) === 0) for (let k = 0; k < n; k++) cur[k] = incs[k] * (1 + c.drift * fsin(0.55 * t + lfoPh[k]));
    let v = 0;
    for (let k = 0; k < n; k++) {
      const inc = cur[k];
      phs[k] += inc;
      if (phs[k] >= 1) phs[k] -= 1;
      v += sawBL(phs[k], inc);
    }
    out[i] = hp.hp(f1.lp(v / Math.sqrt(n))) * e;
  }
  return fadeEnds(out, sr, 1, 20);
}

const PADS = {
  pad: { cents: [0, 7, -7, 14, -13], att: 0.6, rel: 1.0, lp0: 300, lp1: 1600, q: 0.7, hp: 90, drift: 0.0008 },
  strpad: { cents: [0, 6, -6, 11], att: 0.14, rel: 0.45, lp0: 1200, lp1: 3200, q: 0.6, hp: 180, drift: 0.0025 },
  supersaw: { cents: [0, 9, -9, 17, -16], att: 0.012, rel: 0.16, lp0: 1500, lp1: 5200, q: 0.8, hp: 160, drift: 0.0006 },
};

function analogLead(sr, f, dur, vel, p, rnd) {
  const rel = 0.12;
  const len = Math.ceil(sr * (dur + rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  const from = p.from ? mtof(p.from) : f;
  let a = rnd();
  let b = rnd();
  let s = rnd();
  const f1 = new SVF();
  const f2 = new SVF();
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    const g = from === f ? 1 : Math.min(1, t / 0.045);
    const fi = from * Math.pow(f / from, g) * (1 + 6 * smoothstep(0.3, 0.6, t) * Math.sin(TAU * 5.5 * t) * 5.7779e-4);
    const e = adsr(t, dur, 0.006, 0.2, 0.8, rel);
    if ((n & 31) === 0) {
      const fe = Math.exp(-t / 0.22);
      const fc = Math.min(f * 1.2 + 300 + 3800 * fe * (0.5 + 0.5 * vel) + 1200 * e, 11000);
      f1.set(fc, 1.3, sr);
      f2.set(fc, 0.7, sr);
    }
    const da = fi / sr;
    a += da;
    if (a >= 1) a -= 1;
    b += da * 1.0045;
    if (b >= 1) b -= 1;
    s += da * 0.5;
    if (s >= 1) s -= 1;
    const v = sawBL(a, da) + 0.8 * sawBL(b, da * 1.0045) + 0.45 * pulseBL(s, da * 0.5, 0.5);
    out[n] = softClip(f2.lp(f1.lp(v)) * 0.6, 1.3) * e;
  }
  return fadeEnds(out, sr, 1, 10);
}

function synthBass(sr, f, dur, vel, p, rnd) {
  const rel = 0.05;
  const len = Math.ceil(sr * (dur + rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  let a = rnd();
  let s = rnd();
  const f1 = new SVF();
  const da = f / sr;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    if ((n & 15) === 0) f1.set(160 + (p.funk ? 1400 : 2400) * Math.exp(-t / (p.funk ? 0.06 : 0.1)), 1.6, sr);
    a += da;
    if (a >= 1) a -= 1;
    s += da * 0.5;
    if (s >= 1) s -= 1;
    const v = sawBL(a, da) + 0.55 * pulseBL(s, da * 0.5, 0.5);
    out[n] = softClip(f1.lp(v), 1.5) * adsr(t, dur, 0.003, 0.15, 0.72, rel);
  }
  eq(out, sr, [['highpass', 32, 0.7, 0]]);
  return fadeEnds(out, sr, 1, 8);
}

function pluckSynth(sr, f, dur, vel, p, rnd) {
  const len = Math.ceil(sr * Math.min(1.2, dur + 0.6));
  const out = new Float32Array(len);
  let a = rnd();
  let b = rnd();
  const f1 = new SVF();
  const da = f / sr;
  const dk = p.long ? 0.6 : 0.32;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    if ((n & 15) === 0) f1.set(Math.min(f * 1.5 + 5200 * Math.exp(-t / 0.07) * (0.5 + 0.5 * vel), 12000), 1.1, sr);
    a += da;
    if (a >= 1) a -= 1;
    b += da * 1.006;
    if (b >= 1) b -= 1;
    const v = sawBL(a, da) + 0.7 * sawBL(b, da * 1.006);
    out[n] = f1.lp(v) * Math.exp(-t / dk) * Math.min(1, t / 0.002);
  }
  eq(out, sr, [['highpass', 180, 0.7, 0]]);
  return fadeEnds(out, sr, 0, 20);
}

function sub(sr, f, dur, vel, p, rnd) {
  const rel = 0.09;
  const len = Math.ceil(sr * (dur + rel * 1.3 + 0.02));
  const out = new Float32Array(len);
  let ph = 0;
  const da = f / sr;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    ph += da;
    if (ph >= 1) ph -= 1;
    out[n] = (fsin(ph) + 0.22 * fsin(2 * ph) + 0.06 * fsin(3 * ph)) * adsr(t, dur, 0.012, 0.2, 0.85, rel);
  }
  return fadeEnds(out, sr, 1, 8);
}

function chipPulse(sr, f, dur, vel, p, rnd) {
  const len = Math.ceil(sr * (dur + 0.03));
  const out = new Float32Array(len);
  const duty = p.duty ?? 0.25;
  const notes = p.arp ? p.arp.map((m) => mtof(m)) : null;
  let ph = 0;
  const lp = new SVF().set(9000, 0.7, sr);
  const frame = sr / 60;
  for (let n = 0; n < len; n++) {
    const t = n / sr;
    const fr = Math.floor(n / frame);
    let fi = notes ? notes[Math.floor(fr / 2) % notes.length] : f;
    if (!notes) fi *= 1 + 18 * smoothstep(0.18, 0.3, t) * Math.sin(TAU * 6 * t) * 5.7779e-4;
    const vol = Math.max(p.sustain ?? 9, 15 - Math.floor(fr / 3)) / 15;
    const dt = fi / sr;
    ph += dt;
    if (ph >= 1) ph -= 1;
    const gate = t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.02);
    out[n] = lp.lp(pulseBL(ph, dt, duty)) * vol * gate;
  }
  return fadeEnds(out, sr, 1, 4);
}

function chipTri(sr, f, dur, vel, p, rnd) {
  const len = Math.ceil(sr * (dur + 0.01));
  const out = new Float32Array(len);
  let ph = 0;
  const dt = f / sr;
  for (let n = 0; n < len; n++) {
    ph += dt;
    if (ph >= 1) ph -= 1;
    const step = Math.floor(ph * 32);
    const lv = step < 16 ? 15 - step : step - 16; // 4-bit triangle
    out[n] = lv / 7.5 - 1;
  }
  dcBlock(out, sr, 15);
  return fadeEnds(out, sr, 2, 6);
}

// =============================================================================
// Percussion
// =============================================================================
const DRUM_LEN = {
  kick: 0.5, kick808: 0.9, kickSoft: 0.45, bdMarch: 0.9, snareGated: 0.32, snareDisco: 0.3, snareMarch: 0.35, snareBuzz: 0.12, tabor: 0.3,
  clap: 0.32, hatC: 0.09, hatO: 0.45, shaker: 0.13, tamb: 0.25, rim: 0.07, frameDum: 0.6, frameTek: 0.16, tombakTom: 0.42, tombakBak: 0.1,
  castanet: 0.06, palmas: 0.16, wbHi: 0.12, wbLo: 0.14, muyu: 0.18, wbScrape: 0.16, wbTap: 0.07, brushSwish: 0.5, brushTap: 0.2,
  cymbal: 1.6, zill: 1.3, gongBig: 3.0, gongSmall: 1.0, bo: 0.8, bangu: 0.14, ban: 0.09, chipKick: 0.16, chipSnare: 0.2, chipHat: 0.06,
  tomHi: 0.5, tomMid: 0.55, tomLo: 0.6, riser: 0.5, swell: 0.55, ratchet: 0.05, glitch: 0.06, bikeBell: 1.7, tick: 0.025, crackle: 0.01, pengling: 1.4,
};

function metalPartials(out, sr, rnd, freqs, t60, amp) {
  for (const fr of freqs) addMode(out, sr, fr * (0.98 + 0.04 * rnd()), amp * (0.5 + 0.5 * rnd()), t60 * (0.6 + 0.6 * rnd()), rnd() * TAU);
}

function sweepTone(out, sr, f0, f1, tau, decay, amp, start = 0) {
  let ph = 0;
  const kf = Math.exp(-1 / (tau * sr));
  const ka = Math.exp(-1 / (decay * sr));
  let df = f0 - f1;
  let a = amp;
  const end = Math.min(out.length, start + Math.ceil(decay * 10.4 * sr));
  for (let n = start; n < end; n++) {
    ph += (f1 + df) / sr;
    df *= kf;
    out[n] += a * fsin(ph);
    a *= ka;
  }
}

function drum(sr, kind, vel, p, rnd) {
  const len = Math.ceil(sr * (DRUM_LEN[kind] || 0.3));
  const o = new Float32Array(len);
  const BP = (f, q) => Biquad.make('bandpass', f, q, 0, sr);
  const HP = (f) => Biquad.make('highpass', f, 0.7, 0, sr);
  const LP = (f) => Biquad.make('lowpass', f, 0.7, 0, sr);
  switch (kind) {
    case 'kick':
      sweepTone(o, sr, 170, 48, 0.03, 0.26, 1);
      noiseBurst(o, sr, rnd, [HP(1500)], 0.35, 0.004);
      for (let n = 0; n < len; n++) o[n] = softClip(o[n], 1.6);
      break;
    case 'kick808':
      sweepTone(o, sr, 120, 44, 0.05, 0.45, 1);
      noiseBurst(o, sr, rnd, [HP(2000)], 0.2, 0.003);
      for (let n = 0; n < len; n++) o[n] = softClip(o[n], 1.3);
      break;
    case 'kickSoft':
      sweepTone(o, sr, 95, 50, 0.04, 0.25, 1);
      break;
    case 'bdMarch':
      sweepTone(o, sr, 80, 56, 0.08, 0.42, 1);
      noiseBurst(o, sr, rnd, [LP(250)], 0.6, 0.06);
      break;
    case 'snareGated':
      sweepTone(o, sr, 230, 180, 0.02, 0.07, 0.7);
      noiseBurst(o, sr, rnd, [BP(2600, 0.6)], 0.9, 0.05);
      // gated "reverb": dense flat tail chopped at ~240 ms
      noiseBurst(o, sr, rnd, [LP(6500), HP(400)], 0.32, 2.0, 0.01, 0, 0.25);
      for (let n = Math.round(0.21 * sr); n < len; n++) o[n] *= Math.max(0, 1 - (n / sr - 0.21) / 0.035);
      break;
    case 'snareDisco':
      sweepTone(o, sr, 240, 190, 0.02, 0.06, 0.6);
      noiseBurst(o, sr, rnd, [HP(1500)], 0.8, 0.09);
      break;
    case 'snareMarch':
      sweepTone(o, sr, 260, 200, 0.015, 0.05, 0.55);
      noiseBurst(o, sr, rnd, [BP(4200, 0.5)], 0.9, 0.13);
      break;
    case 'snareBuzz':
      noiseBurst(o, sr, rnd, [BP(4000, 0.6)], 0.8, 0.04);
      sweepTone(o, sr, 230, 200, 0.01, 0.025, 0.3);
      break;
    case 'tabor':
      sweepTone(o, sr, 190, 150, 0.02, 0.12, 0.8);
      noiseBurst(o, sr, rnd, [BP(2800, 0.9)], 0.55, 0.09);
      break;
    case 'clap':
      for (const d of [0, 0.009, 0.019, 0.03]) noiseBurst(o, sr, rnd, [BP(1300, 1.1)], 0.8, 0.006, 0, Math.round(d * sr), 0.05);
      noiseBurst(o, sr, rnd, [BP(1200, 0.9)], 0.45, 0.09, 0, Math.round(0.03 * sr));
      break;
    case 'palmas':
      noiseBurst(o, sr, rnd, [BP(1600, 1.2)], 0.9, 0.012);
      noiseBurst(o, sr, rnd, [BP(1400, 1)], 0.25, 0.05, 0, Math.round(0.006 * sr));
      break;
    case 'hatC':
    case 'hatO': {
      const base = [205.3, 304.4, 369.6, 522.7, 540, 800].map((x) => x * 1.7);
      const ph = base.map(() => rnd());
      const hp = HP(7000);
      const hp2 = HP(6000);
      const dk = kind === 'hatC' ? 0.03 : 0.22;
      for (let n = 0; n < len; n++) {
        let v = 0;
        for (let i = 0; i < 6; i++) {
          ph[i] += base[i] / sr;
          if (ph[i] >= 1) ph[i] -= 1;
          v += ph[i] < 0.5 ? 1 : -1;
        }
        o[n] = (hp.process(v / 6) + 0.6 * hp2.process(rnd() * 2 - 1)) * Math.exp(-n / sr / dk);
      }
      break;
    }
    case 'shaker':
      noiseBurst(o, sr, rnd, [BP(6500, 0.9)], 1, 0.035, 0.014);
      break;
    case 'tamb':
      noiseBurst(o, sr, rnd, [HP(5000)], 0.6, 0.08, 0.002);
      metalPartials(o, sr, rnd, [4600, 5800, 7100, 8600], 0.25, 0.08);
      break;
    case 'rim':
      addMode(o, sr, 1700, 0.8, 0.03);
      addMode(o, sr, 2900, 0.4, 0.02);
      noiseBurst(o, sr, rnd, [HP(3000)], 0.4, 0.002);
      break;
    case 'frameDum':
      sweepTone(o, sr, 105, 76, 0.03, 0.32, 1);
      noiseBurst(o, sr, rnd, [LP(400)], 0.45, 0.02);
      break;
    case 'frameTek':
      addMode(o, sr, 540, 0.5, 0.12);
      addMode(o, sr, 890, 0.4, 0.09);
      addMode(o, sr, 1450, 0.25, 0.06);
      noiseBurst(o, sr, rnd, [BP(2600, 0.8)], 0.7, 0.012);
      break;
    case 'tombakTom':
      sweepTone(o, sr, 140, 102, 0.02, 0.24, 1);
      addMode(o, sr, 205, 0.3, 0.25);
      noiseBurst(o, sr, rnd, [LP(700)], 0.3, 0.015);
      break;
    case 'tombakBak':
      addMode(o, sr, 1150, 0.5, 0.06);
      addMode(o, sr, 1930, 0.35, 0.045);
      addMode(o, sr, 3300, 0.2, 0.03);
      noiseBurst(o, sr, rnd, [HP(2000)], 0.6, 0.006);
      break;
    case 'castanet':
      addMode(o, sr, 2350, 0.7, 0.02);
      addMode(o, sr, 3700, 0.45, 0.015);
      noiseBurst(o, sr, rnd, [HP(2500)], 0.5, 0.0025);
      break;
    case 'wbHi':
    case 'wbLo': {
      const f = kind === 'wbHi' ? 1250 : 840;
      addMode(o, sr, f, 0.8, 0.07);
      addMode(o, sr, f * 2.47, 0.2, 0.03);
      noiseBurst(o, sr, rnd, [BP(f * 2, 1)], 0.3, 0.003);
      break;
    }
    case 'muyu':
      addMode(o, sr, 640, 0.8, 0.12);
      addMode(o, sr, 1690, 0.25, 0.05);
      noiseBurst(o, sr, rnd, [BP(1200, 1)], 0.3, 0.004);
      break;
    case 'wbScrape': {
      const bp = BP(3600, 1.3);
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        const env = Math.min(1, t / 0.006) * (t < 0.08 ? 1 : Math.exp(-(t - 0.08) / 0.02));
        const ridges = Math.pow(Math.abs(Math.sin(Math.PI * 290 * t)), 3);
        o[n] = bp.process(rnd() * 2 - 1) * env * (0.35 + ridges);
      }
      break;
    }
    case 'wbTap':
      metalPartials(o, sr, rnd, [3200, 5100, 7300], 0.06, 0.4);
      noiseBurst(o, sr, rnd, [HP(4000)], 0.4, 0.003);
      break;
    case 'brushSwish': {
      const bp = BP(3200, 0.45);
      const hp = HP(1200);
      for (let n = 0; n < len; n++) {
        const t = n / len;
        o[n] = hp.process(bp.process(rnd() * 2 - 1)) * Math.pow(Math.sin(Math.PI * t), 1.6);
      }
      break;
    }
    case 'brushTap':
      noiseBurst(o, sr, rnd, [BP(2600, 0.6)], 0.9, 0.045, 0.003);
      sweepTone(o, sr, 210, 185, 0.02, 0.05, 0.25);
      break;
    case 'cymbal':
      noiseBurst(o, sr, rnd, [HP(4500)], 0.55, 0.55, 0.002);
      metalPartials(o, sr, rnd, [3100, 3900, 4700, 5600, 6400, 7900, 8800], 1.4, 0.06);
      break;
    case 'zill':
      metalPartials(o, sr, rnd, [2750, 4120, 6290, 7880], 1.4, 0.3);
      for (let n = 0; n < 40; n++) o[n] *= n / 40;
      break;
    case 'pengling':
      metalPartials(o, sr, rnd, [3520, 5280, 8150], 1.3, 0.3);
      for (let n = 0; n < 40; n++) o[n] *= n / 40;
      break;
    case 'gongBig': {
      const ratios = [1, 1.52, 2.03, 2.74, 3.41, 4.18, 5.07, 6.3];
      const f0 = 210;
      const phs = ratios.map(() => rnd());
      const amps = ratios.map((_, i) => 1 / (1 + i * 0.45));
      const ks = ratios.map((_, i) => Math.exp(-(1 + i * 0.35) / (1.4 * sr)));
      const kg = Math.exp(-1 / (0.35 * sr));
      let gl = 0.07;
      const na = Math.round(0.004 * sr);
      for (let n = 0; n < len; n++) {
        const glide = 1 + gl; // opera gong: pitch falls
        gl *= kg;
        let v = 0;
        for (let i = 0; i < ratios.length; i++) {
          phs[i] += (f0 * ratios[i] * glide) / sr;
          if (phs[i] >= 1) phs[i] -= 1;
          v += fsin(phs[i]) * amps[i];
          amps[i] *= ks[i];
        }
        o[n] = v * (n < na ? n / na : 1);
      }
      noiseBurst(o, sr, rnd, [BP(1200, 0.7)], 0.4, 0.05);
      break;
    }
    case 'gongSmall': {
      const ratios = [1, 1.47, 2.09, 2.88];
      const f0 = 640;
      const phs = ratios.map(() => rnd());
      const amps = ratios.map((_, i) => 1 / (1 + i * 0.6));
      const ks = ratios.map((_, i) => Math.exp(-(1 + i * 0.4) / (0.32 * sr)));
      const kg = Math.exp(-1 / (0.07 * sr));
      let gl = 0.09;
      const na = Math.round(0.002 * sr);
      for (let n = 0; n < len; n++) {
        const glide = 1 - gl; // small gong: pitch rises
        gl *= kg;
        let v = 0;
        for (let i = 0; i < 4; i++) {
          phs[i] += (f0 * ratios[i] * glide) / sr;
          if (phs[i] >= 1) phs[i] -= 1;
          v += fsin(phs[i]) * amps[i];
          amps[i] *= ks[i];
        }
        o[n] = v * (n < na ? n / na : 1);
      }
      break;
    }
    case 'bo':
      noiseBurst(o, sr, rnd, [HP(2500)], 0.6, 0.22, 0.002);
      metalPartials(o, sr, rnd, [1900, 2600, 3400, 4300, 5200], 0.6, 0.12);
      break;
    case 'bangu':
      sweepTone(o, sr, 700, 520, 0.008, 0.045, 1);
      noiseBurst(o, sr, rnd, [HP(2500)], 0.4, 0.004);
      break;
    case 'ban':
      addMode(o, sr, 1150, 0.6, 0.04);
      addMode(o, sr, 2650, 0.4, 0.025);
      noiseBurst(o, sr, rnd, [BP(1900, 1.5)], 0.7, 0.008);
      break;
    case 'chipKick': {
      let ph = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        const f = 50 + 110 * Math.exp(-t / 0.03);
        ph += f / sr;
        if (ph >= 1) ph -= 1;
        const step = Math.floor(ph * 32);
        o[n] = ((step < 16 ? 15 - step : step - 16) / 7.5 - 1) * Math.max(0, 1 - t / 0.15);
      }
      break;
    }
    case 'chipSnare':
    case 'chipHat': {
      // NES-style 15-bit LFSR noise (short mode for the hat -> metallic)
      let reg = 1;
      const short = kind === 'chipHat';
      const hold = Math.max(1, Math.round(sr / (short ? 22000 : 9000)));
      let v = 1;
      const dk = short ? 0.035 : 0.12;
      for (let n = 0; n < len; n++) {
        if (n % hold === 0) {
          const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1;
          reg = (reg >> 1) | (bit << 14);
          v = reg & 1 ? 1 : -1;
        }
        const t = n / sr;
        o[n] = v * Math.ceil(15 * Math.exp(-t / dk)) / 15;
      }
      break;
    }
    case 'tomHi':
    case 'tomMid':
    case 'tomLo': {
      const f0 = kind === 'tomHi' ? 190 : kind === 'tomMid' ? 140 : 100;
      sweepTone(o, sr, f0 * 1.6, f0, 0.05, 0.22, 1);
      noiseBurst(o, sr, rnd, [BP(f0 * 6, 1)], 0.2, 0.01);
      break;
    }
    case 'riser': {
      const bp = new SVF();
      for (let n = 0; n < len; n++) {
        const t = n / len;
        if ((n & 31) === 0) bp.set(400 * Math.pow(15, t), 2, sr);
        o[n] = bp.bp(rnd() * 2 - 1) * t * t;
      }
      break;
    }
    case 'swell': {
      const hp = HP(2500);
      for (let n = 0; n < len; n++) {
        const t = n / len;
        o[n] = hp.process(rnd() * 2 - 1) * t * t * t * (t > 0.96 ? (1 - t) / 0.04 : 1);
      }
      break;
    }
    case 'ratchet':
      addMode(o, sr, 2300, 0.6, 0.02);
      addMode(o, sr, 3500, 0.4, 0.012);
      noiseBurst(o, sr, rnd, [HP(1800)], 0.5, 0.004);
      break;
    case 'glitch': {
      const f = 1800 + 3600 * rnd();
      const bits = 6;
      let ph = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        ph += (f * (1 + 2 * t)) / sr;
        const v = Math.sin(TAU * ph) > 0 ? 1 : -1;
        o[n] = (Math.round(v * Math.exp(-t / 0.018) * bits) / bits) * (t < 0.003 ? t / 0.003 : 1);
      }
      break;
    }
    case 'bikeBell':
      addMode(o, sr, 2030, 1, 1.3, 0);
      addMode(o, sr, 2030 * 1.0042, 0.8, 1.2, 1); // beating shell
      addMode(o, sr, 4710, 0.45, 0.8, 0);
      addMode(o, sr, 7350, 0.2, 0.45, 0);
      noiseBurst(o, sr, rnd, [HP(3000)], 0.6, 0.002);
      for (let n = 0; n < 24; n++) o[n] *= n / 24;
      break;
    case 'tick':
      addMode(o, sr, 3600, 0.7, 0.008);
      noiseBurst(o, sr, rnd, [HP(4000)], 0.5, 0.0015);
      break;
    case 'crackle':
      noiseBurst(o, sr, rnd, [BP(2500, 0.7)], 1, 0.0012);
      break;
    default:
      break;
  }
  return fadeEnds(dcBlock(o, sr, 20), sr, 0, 6);
}

// =============================================================================
// Voice table
// =============================================================================
// ref: reference MIDI pitch for calibration; drum: percussion (pitch ignored)
export const VOICES = {
  // plucked strings (Karplus–Strong)
  harp: { ref: 62, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 3.2 * Math.pow(196 / f, 0.4), ring: 1.8, b: 0.3, pick: 0.28, bright: 0.45, body: [['peaking', 250, 1.2, 3], ['highshelf', 4000, 0.7, -3], ['highpass', 60, 0.7, 0]] }, r) },
  santur: {
    ref: 62,
    fn: (sr, f, d, v, p, r) => {
      const o = { t60: 3.6 * Math.pow(262 / f, 0.3), ring: p.ring || 1.8, b: 0.12, pick: 0.13, bright: 0.9, hammer: 0.0007, body: [['peaking', 650, 1, 2], ['peaking', 2600, 1.2, 2.5], ['highpass', 120, 0.7, 0]] };
      const a = ks(sr, f, d, v, { ...o, detune: 3.5 }, r);
      const b = ks(sr, f, d, v, { ...o, detune: -3 }, r);
      for (let i = 0; i < a.length; i++) a[i] = 0.5 * (a[i] + b[i]);
      return a;
    },
  },
  guitar: { ref: 57, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 3.2 * Math.sqrt(110 / f), ring: 1.7, rel: p.mute ? 0.05 : 0.35, b: 0.28, pick: 0.17, bright: 0.55, body: [['peaking', 105, 1.5, 4], ['peaking', 215, 2, 3], ['peaking', 2800, 1, 1.5], ['highpass', 65, 0.7, 0]] }, r) },
  harpsichord: {
    ref: 62,
    fn: (sr, f, d, v, p, r) => {
      const o = { t60: 4 * Math.pow(220 / f, 0.3), ring: 2.4, rel: 0.1, b: 0.12, pick: 0.07, bright: 1, body: [['peaking', 900, 1, 2], ['highpass', 90, 0.7, 0]] };
      const a = ks(sr, f, d, 0.9, o, r);
      const b = ks(sr, f * 2, d, 0.9, { ...o, detune: 2 }, r);
      for (let i = 0; i < a.length; i++) a[i] = 0.75 * a[i] + 0.3 * (b[i] || 0);
      return a;
    },
  },
  guzheng: { ref: 62, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 4 * Math.pow(147 / f, 0.35), ring: p.ring || 2.0, b: 0.2, pick: 0.1, bright: 0.75, bend: p.bend ? bendFn(p.bend) : null, body: [['peaking', 180, 1.2, 3], ['peaking', 1800, 1.2, 2.5], ['highpass', 55, 0.7, 0]] }, r) },
  yueqin: { ref: 69, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 1.3, ring: p.ring || 1.2, b: 0.14, pick: 0.12, bright: 0.85, body: [['peaking', 1100, 1.2, 4], ['highshelf', 6000, 0.7, -3], ['highpass', 180, 0.7, 0]] }, r) },
  banjo: { ref: 62, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 1.0, ring: 1.1, b: 0.08, pick: 0.12, bright: 0.95, body: [['peaking', 450, 1, 3], ['peaking', 1800, 1.2, 5], ['highshelf', 7000, 0.7, -4], ['highpass', 150, 0.7, 0]] }, r) },
  upright: { ref: 45, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 1.8 * Math.pow(73 / f, 0.4), ring: 1.5, rel: 0.25, b: 0.45, pick: 0.25, bright: 0.4, body: [['peaking', 90, 1.2, 4], ['lowpass', 2600, 0.7, 0], ['highpass', 35, 0.7, 0]] }, r) },
  ebass: { ref: 45, fn: (sr, f, d, v, p, r) => ks(sr, f, d, v, { t60: 2.5, ring: 1.5, rel: 0.07, b: 0.3, pick: 0.2, bright: 0.7, body: [['peaking', 120, 1.2, 3], ['peaking', 900, 1.2, 2], ['highpass', 35, 0.7, 0]] }, r) },
  // struck / modal
  piano: { ref: 62, fn: piano },
  vibes: { ref: 62, fn: vibes },
  musicbox: { ref: 74, fn: musicBox },
  fmkeys: { ref: 62, fn: fmKeys },
  bell: { ref: 74, fn: bell },
  // bowed
  violin: { ref: 74, fn: (sr, f, d, v, p, r) => bowedCore(sr, f, d, v, p, r, BOWED.violin) },
  viola: { ref: 62, fn: (sr, f, d, v, p, r) => bowedCore(sr, f, d, v, p, r, BOWED.viola) },
  cello: { ref: 45, fn: (sr, f, d, v, p, r) => bowedCore(sr, f, d, v, p, r, BOWED.cello) },
  fiddle: { ref: 62, fn: (sr, f, d, v, p, r) => bowedCore(sr, f, d, v, p, r, BOWED.fiddle) },
  // winds
  recorder: { ref: 74, fn: recorder },
  trumpet: { ref: 62, fn: (sr, f, d, v, p, r) => brassCore(sr, f, d, v, p, r, BRASS.trumpet) },
  horn: { ref: 57, fn: (sr, f, d, v, p, r) => brassCore(sr, f, d, v, p, r, BRASS.horn) },
  tuba: { ref: 40, fn: (sr, f, d, v, p, r) => brassCore(sr, f, d, v, p, r, BRASS.tuba) },
  // reeds
  accordion: { ref: 62, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.accordion) },
  accbass: { ref: 43, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.accbass) },
  organ: { ref: 57, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.organ) },
  sheng: { ref: 62, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.sheng) },
  drone: { ref: 50, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.drone) },
  pipes: { ref: 50, fn: (sr, f, d, v, p, r) => reedCore(sr, f, d, v, p, r, REED.pipes) },
  // synths
  pad: { ref: 57, fn: (sr, f, d, v, p, r) => padCore(sr, f, d, v, p, r, PADS.pad) },
  strpad: { ref: 57, fn: (sr, f, d, v, p, r) => padCore(sr, f, d, v, p, r, PADS.strpad) },
  supersaw: { ref: 62, fn: (sr, f, d, v, p, r) => padCore(sr, f, d, v, p, r, PADS.supersaw) },
  analog: { ref: 62, fn: analogLead },
  synthbass: { ref: 38, fn: synthBass },
  pluck: { ref: 69, fn: pluckSynth },
  sub: { ref: 38, fn: sub },
  chip: { ref: 74, fn: chipPulse },
  chiptri: { ref: 50, fn: chipTri },
};
for (const k of Object.keys(DRUM_LEN)) VOICES[k] = { drum: true, fn: (sr, f, d, v, p, r) => drum(sr, k, v, p, r) };

function bendFn(spec) {
  // spec: { from: semitones at onset (slide), slideT, vib: semitone depth, vibStart }
  const from = spec.from || 0;
  const st = spec.slideT || 0.08;
  const vib = spec.vib || 0;
  const vs = spec.vibStart ?? 0.25;
  return (t) => {
    let s = 0;
    if (from) s += from * Math.max(0, 1 - t / st);
    if (vib) s += vib * smoothstep(vs, vs + 0.15, t) * (0.5 - 0.5 * Math.cos(TAU * 5 * Math.max(0, t - vs)));
    return s;
  };
}

// =============================================================================
// Cache + calibration
// =============================================================================
const CAL_TARGET = 0.25;
const calCache = new Map();
const noteCache = new Map();
let cacheSr = 0;

/** Drop cached pitched notes (keeps the small percussion hits). */
export function clearVoiceCache(all = false) {
  for (const k of noteCache.keys()) if (all || !VOICES[k.slice(0, k.indexOf('|'))].drum) noteCache.delete(k);
}

function calibration(name, sr) {
  const key = `${name}@${sr}`;
  if (calCache.has(key)) return calCache.get(key);
  const def = VOICES[name];
  const rnd = mulberry32(hashStr(key));
  const dur = def.drum ? 0.2 : 0.9;
  const buf = def.fn(sr, mtof(def.ref ?? 60), dur, 0.8, {}, rnd);
  const rms = kRmsMax(buf, sr, def.drum ? 0.2 : 0.3) || 1e-6;
  const c = CAL_TARGET / rms;
  calCache.set(key, c);
  return c;
}

/**
 * Rendered, calibrated mono note (cached). Velocity is quantised for timbre; the caller
 * applies the exact velocity as gain.
 */
export function renderVoice(name, sr, midi, dur, vel, p = {}) {
  const def = VOICES[name];
  if (!def) throw new Error(`unknown voice ${name}`);
  if (cacheSr !== sr) {
    noteCache.clear();
    cacheSr = sr;
  }
  const vq = Math.round(clamp(vel, 0.05, 1) * 10) / 10;
  const dq = Math.round(dur * 1000) / 1000;
  const mq = def.drum ? 0 : Math.round(midi * 100) / 100;
  const pk = p && Object.keys(p).length ? JSON.stringify(p) : '';
  const key = `${name}|${mq}|${def.drum ? 0 : dq}|${vq}|${pk}|${p.v || 0}`;
  let buf = noteCache.get(key);
  if (!buf) {
    const rnd = mulberry32(hashStr(key));
    buf = def.fn(sr, mtof(mq), dq, vq, p || {}, rnd);
    const c = calibration(name, sr);
    for (let i = 0; i < buf.length; i++) buf[i] *= c;
    noteCache.set(key, buf);
  }
  return buf;
}
