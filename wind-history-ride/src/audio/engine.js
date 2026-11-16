// src/audio/engine.js — procedural soundtrack engine for 《乘風騎行》.
//
// Interface used by main.js (unchanged from the stub):
//   createAudioEngine() -> { init(): Promise, isReady(), onReady(cb), onEnded(cb),
//     play(t): Promise, pause(), seek(t), isPlaying(), getCurrentTime(),
//     setVolume(v), getVolume(), setMuted(b), isMuted(), toggleMute() }
// Extra exports for tools:
//   renderSoundtrack(sampleRate = 48000) -> Promise<AudioBuffer>   (stereo, 178 s, deterministic)
//   encodeWav16(audioBuffer) -> Uint8Array                          (16-bit PCM WAV)
//   getLastRenderStats() -> { ms, phase, sections: [...] }
//
// Render pipeline (deterministic: seeded PRNGs only, no Math.random, no timers in the DSP):
//   1. score.js turns the leitmotif into 22 sections (intro, 20 eras, outro) of note events.
//   2. Notes are synthesised as precomputed buffers (instruments.js: Karplus–Strong strings,
//      modal bars/bells, FM, subtractive synths, noise percussion) — in a small pool of
//      module Web Workers when available, otherwise on the main thread in ~20 ms slices.
//   3. Each section is mixed into a dry stem plus hall/room reverb sends with per-track
//      FX (vibraphone tremolo, ping-pong delay, side-chain ducking).
//   4. Each section's reverb sends are rendered by its own OfflineAudioContext through
//      two ConvolverNodes with procedurally generated impulse responses (at half rate:
//      reverb tails carry little above 10 kHz, and it quarters the convolution cost).
//   5. Stems are loudness-matched per era (K-weighted RMS) and overlap-added: each era's
//      pickup fades in over the beat before its bar line, its tail fades out over the beat
//      after the next one — a one-beat crossfade aligned to the bar line.
//   6. The stereo wind bed (foley.js) is added, then a 5 ms look-ahead peak limiter and a
//      final normalisation to a -1 dBFS sample peak.

import { TOTAL_DURATION } from '../beat/timeline.js';
import { buildScore, windinessAt } from './score.js';
import { renderVoice, voiceKey, clearVoiceCache } from './instruments.js';
import { WindGen } from './foley.js';
import { mulberry32, eq, kRms, peakOf, dbToGain, clamp } from './dsp.js';

const MUSIC_TARGET = 0.1; // K-weighted RMS each era stem is matched to (≈ -20 dB)
const WIND_LEVEL = 0.36; // wind K-RMS relative to MUSIC_TARGET at windiness 1
const CEILING = dbToGain(-1); // final sample peak: -1 dBFS
const XFADE = 0.5; // one beat at 120 BPM
const MAX_INFLIGHT = 3; // concurrent reverb renders
const LOOKAHEAD = 4; // sections whose notes are queued ahead in the worker pool
const WIND_SEED = 4242;

let lastStats = null;
export function getLastRenderStats() {
  return lastStats;
}

// -----------------------------------------------------------------------------
// Cooperative yielding (MessageChannel is not throttled like setTimeout in background tabs)
// -----------------------------------------------------------------------------
function makeYielder(budgetMs = 20) {
  const hasPerf = typeof performance !== 'undefined';
  const clock = () => (hasPerf ? performance.now() : Date.now());
  let last = clock();
  let ch = null;
  const queue = [];
  if (typeof MessageChannel !== 'undefined') {
    ch = new MessageChannel();
    ch.port1.onmessage = () => {
      const r = queue.shift();
      if (r) r();
    };
  }
  const yieldNow = () =>
    new Promise((res) => {
      if (ch) {
        queue.push(res);
        ch.port2.postMessage(0);
      } else setTimeout(res, 0);
    });
  const fn = async () => {
    if (clock() - last < budgetMs) return;
    await yieldNow();
    last = clock();
  };
  fn.close = () => {
    if (ch) {
      ch.port1.onmessage = null;
      ch.port1.close();
      ch.port2.close();
    }
  };
  return fn;
}

// -----------------------------------------------------------------------------
// Procedural impulse responses
// -----------------------------------------------------------------------------
function makeIR(sr, { seconds, rt60, predelay, bright, dark, early, seed }) {
  const len = Math.round(seconds * sr);
  const buf = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: sr });
  for (let c = 0; c < 2; c++) {
    const rnd = mulberry32(seed + c * 977);
    const d = new Float32Array(len);
    const pd = Math.round(predelay * sr);
    let z = 0;
    for (let n = pd; n < len; n++) {
      const t = (n - pd) / sr;
      // high frequencies die faster: one-pole lowpass that closes over time
      const fc = dark + (bright - dark) * Math.exp(-t / (rt60 * 0.35));
      const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
      z += a * (rnd() * 2 - 1 - z);
      const env = Math.exp((-6.9078 * t) / rt60) * Math.min(1, t / 0.004);
      d[n] = z * env;
    }
    for (let k = 0; k < early; k++) {
      const n = pd + Math.round((0.004 + 0.07 * rnd()) * sr);
      if (n < len) d[n] += (rnd() < 0.5 ? -1 : 1) * (0.25 + 0.45 * rnd()) * Math.exp(-k * 0.18);
    }
    // energy-normalise so a send of 1 gives roughly equal wet/dry loudness
    let e = 0;
    for (let n = 0; n < len; n++) e += d[n] * d[n];
    const g = 1 / Math.sqrt(e || 1);
    for (let n = 0; n < len; n++) d[n] *= g;
    buf.copyToChannel(d, c);
  }
  return buf;
}

// -----------------------------------------------------------------------------
// Worker pool for note synthesis (falls back to the main thread when unavailable)
// -----------------------------------------------------------------------------
class SynthPool {
  constructor(workers) {
    this.workers = workers;
    this.load = workers.map(() => 0);
    this.pending = new Map();
    this.nextId = 1;
    workers.forEach((w) => {
      w.onmessage = (e) => {
        const d = e.data;
        const p = this.pending.get(d.id);
        if (!p) return;
        this.pending.delete(d.id);
        if (d.type === 'error') p.reject(new Error(d.message));
        else p.resolve(d);
      };
      w.onerror = (e) => {
        for (const p of this.pending.values()) p.reject(new Error((e && e.message) || 'worker error'));
        this.pending.clear();
      };
    });
  }

  static async create(n, timeoutMs = 5000) {
    if (typeof Worker === 'undefined' || n < 1) return null;
    let url;
    try {
      url = new URL('./synth-worker.js', import.meta.url);
    } catch (e) {
      return null;
    }
    const workers = [];
    try {
      for (let i = 0; i < n; i++) workers.push(new Worker(url, { type: 'module' }));
    } catch (e) {
      workers.forEach((w) => w.terminate());
      return null;
    }
    const ok = await Promise.all(
      workers.map(
        (w) =>
          new Promise((res) => {
            const to = setTimeout(() => res(false), timeoutMs);
            w.onmessage = (e) => {
              if (e.data && e.data.type === 'pong') {
                clearTimeout(to);
                res(true);
              }
            };
            w.onerror = () => {
              clearTimeout(to);
              res(false);
            };
            w.postMessage({ type: 'ping', id: 0 });
          }),
      ),
    );
    if (!ok.every(Boolean)) {
      workers.forEach((w) => w.terminate());
      return null;
    }
    return new SynthPool(workers);
  }

  post(i, msg, transfer = []) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.workers[i].postMessage({ ...msg, id }, transfer);
    });
  }

  leastLoaded() {
    let b = 0;
    for (let i = 1; i < this.load.length; i++) if (this.load[i] < this.load[b]) b = i;
    return b;
  }

  terminate() {
    this.workers.forEach((w) => w.terminate());
  }
}

/** Queue all distinct notes of a section on the pool; resolves to Map(key -> Float32Array). */
function requestSectionNotes(pool, sec, sr) {
  const jobs = new Map();
  for (const ev of sec.events) {
    if (!jobs.has(ev.key)) jobs.set(ev.key, { key: ev.key, p: ev.p || {}, cost: 0.3 + Math.min(ev.dur, 3) });
  }
  const per = pool.workers.map(() => []);
  for (const j of [...jobs.values()].sort((a, b) => b.cost - a.cost)) {
    const w = pool.leastLoaded();
    per[w].push(j);
    pool.load[w] += j.cost;
  }
  return Promise.all(per.map((js, i) => (js.length ? pool.post(i, { type: 'notes', sr, jobs: js.map(({ key, p }) => ({ key, p })) }) : null))).then((results) => {
    const map = new Map();
    for (const r of results) if (r) r.keys.forEach((k, i) => map.set(k, r.bufs[i]));
    return map;
  });
}

// -----------------------------------------------------------------------------
// Section mixing (JS)
// -----------------------------------------------------------------------------
function applyTrackFx(L, R, fx, sr, startT) {
  if (!fx) return;
  const n = L.length;
  if (fx.trem) {
    const { rate, depth } = fx.trem;
    for (let i = 0; i < n; i++) {
      const m = 1 - depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * rate * (startT + i / sr)));
      L[i] *= m;
      R[i] *= m;
    }
  }
  if (fx.duck) {
    const { times, depth, release } = fx.duck;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const t = startT + i / sr;
      while (k + 1 < times.length && times[k + 1] <= t) k++;
      const dt = t - times[k];
      let env = 0;
      if (dt >= 0) env = dt < 0.006 ? dt / 0.006 : Math.exp(-(dt - 0.006) / release);
      const g = 1 - depth * env;
      L[i] *= g;
      R[i] *= g;
    }
  }
  if (fx.delay) {
    const { time, fb, mix, pingpong } = fx.delay;
    const D = Math.max(1, Math.round(time * sr));
    const eL = new Float32Array(n);
    const eR = new Float32Array(n);
    const a = 1 - Math.exp((-2 * Math.PI * 3800) / sr);
    let zl = 0;
    let zr = 0;
    for (let i = D; i < n; i++) {
      if (pingpong) {
        zl += a * (0.5 * (L[i - D] + R[i - D]) + fb * eR[i - D] - zl);
        zr += a * (fb * eL[i - D] - zr);
      } else {
        zl += a * (L[i - D] + fb * eL[i - D] - zl);
        zr += a * (R[i - D] + fb * eR[i - D] - zr);
      }
      eL[i] = zl;
      eR[i] = zr;
    }
    for (let i = 0; i < n; i++) {
      L[i] += mix * eL[i];
      R[i] += mix * eR[i];
    }
  }
}

/**
 * Mix one section: a full-rate dry stem plus half-rate hall/room sends (decimated with a
 * [1/4 1/2 1/4] kernel). Track buffers are scratch arrays reused across tracks/sections.
 */
async function mixSection(sec, sr, maybeYield, scratch, notes) {
  const len = Math.ceil((sec.end - sec.start) * sr);
  const half = (len >> 1) + 2;
  const bus = { len, half, dry: [new Float32Array(len), new Float32Array(len)], hall: null, room: null };
  const byTrack = new Map();
  for (const ev of sec.events) {
    if (!byTrack.has(ev.tr)) byTrack.set(ev.tr, []);
    byTrack.get(ev.tr).push(ev);
  }
  if (scratch.L.length < len + 2) {
    scratch.L = new Float32Array(len + 2);
    scratch.R = new Float32Array(len + 2);
  }
  const tL = scratch.L;
  const tR = scratch.R;
  for (const [name, evs] of byTrack) {
    const cfg = sec.tracks[name] || { gain: 0.5, pan: 0, hall: 0.2, room: 0 };
    tL.fill(0);
    tR.fill(0);
    let lo = len;
    let hi = 0;
    for (const ev of evs) {
      const buf = (notes && notes.get(ev.key)) || renderVoice(ev.voice, sr, ev.midi, ev.dur, ev.vel, ev.p || {});
      const off = Math.round((ev.t - sec.start) * sr);
      const pan = clamp(cfg.pan + (ev.pan || 0), -1, 1);
      const th = ((pan + 1) * Math.PI) / 4;
      const gl = Math.cos(th) * ev.vel;
      const gr = Math.sin(th) * ev.vel;
      const i0 = Math.max(0, -off);
      const i1 = Math.min(buf.length, len - off);
      if (i1 <= i0) continue;
      lo = Math.min(lo, off + i0);
      hi = Math.max(hi, off + i1);
      for (let i = i0; i < i1; i++) {
        const v = buf[i];
        tL[off + i] += v * gl;
        tR[off + i] += v * gr;
      }
      if (!notes) await maybeYield();
    }
    if (hi <= lo) continue;
    if (cfg.fx) {
      hi = len; // delay tails run to the end of the section
      applyTrackFx(tL.subarray(0, len), tR.subarray(0, len), cfg.fx, sr, sec.start);
    }
    const g = cfg.gain;
    const [DL, DR] = bus.dry;
    for (let i = lo; i < hi; i++) {
      DL[i] += tL[i] * g;
      DR[i] += tR[i] * g;
    }
    for (const key of ['hall', 'room']) {
      const gs = g * (cfg[key] || 0);
      if (gs <= 0) continue;
      if (!bus[key]) bus[key] = [new Float32Array(half), new Float32Array(half)];
      const [SL, SR] = bus[key];
      const j0 = Math.max(1, lo >> 1);
      const j1 = Math.min(half, (hi >> 1) + 1, (len - 1) >> 1);
      for (let j = j0; j < j1; j++) {
        const i = j << 1;
        SL[j] += (0.25 * tL[i - 1] + 0.5 * tL[i] + 0.25 * tL[i + 1]) * gs;
        SR[j] += (0.25 * tR[i - 1] + 0.5 * tR[i] + 0.25 * tR[i + 1]) * gs;
      }
    }
    await maybeYield();
  }
  return bus;
}

/** Render a section's reverb returns through its own OfflineAudioContext (half rate). */
function renderWetOAC(bus, irs, srHalf) {
  if (!bus.hall && !bus.room) return Promise.resolve(null);
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: bus.half, sampleRate: srHalf });
  for (const key of ['hall', 'room']) {
    if (!bus[key]) continue;
    const b = ctx.createBuffer(2, bus.half, srHalf);
    b.copyToChannel(bus[key][0], 0);
    b.copyToChannel(bus[key][1], 1);
    const s = ctx.createBufferSource();
    s.buffer = b;
    const cv = ctx.createConvolver();
    cv.normalize = false;
    cv.buffer = irs[key];
    s.connect(cv);
    cv.connect(ctx.destination);
    s.start(0);
  }
  return ctx.startRendering();
}

// -----------------------------------------------------------------------------
// Master: look-ahead peak limiter
// -----------------------------------------------------------------------------
async function limitInPlace(L, R, sr, ceiling, maybeYield) {
  const n = L.length;
  const la = Math.max(1, Math.round(0.005 * sr));
  const rel = Math.exp(-1 / (0.12 * sr));
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    req[i] = p > ceiling ? ceiling / p : 1;
  }
  await maybeYield();
  // sliding-window minimum over [i, i + la] (monotonic deque)
  const win = new Float32Array(n);
  const dq = new Int32Array(n + la + 1);
  let h = 0;
  let tq = 0;
  for (let j = 0; j < n + la; j++) {
    if (j < n) {
      while (tq > h && req[dq[tq - 1]] >= req[j]) tq--;
      dq[tq++] = j;
    }
    const i = j - la;
    if (i >= 0) {
      while (dq[h] < i) h++;
      win[i] = req[dq[h]];
    }
  }
  await maybeYield();
  let g = 1;
  let reduced = 0;
  for (let i = 0; i < n; i++) {
    const target = win[i];
    g = target < g ? target : target + (g - target) * rel;
    if (g < 0.999) reduced++;
    L[i] *= g;
    R[i] *= g;
  }
  return reduced / n;
}

// -----------------------------------------------------------------------------
// Full render
// -----------------------------------------------------------------------------
export async function renderSoundtrack(sampleRate = 48000, opts = {}) {
  if (typeof OfflineAudioContext === 'undefined') throw new Error('OfflineAudioContext unavailable');
  const sr = sampleRate;
  const srHalf = sr / 2;
  const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tStart = clock();
  const phase = { pool: 0, mix: 0, waitNotes: 0, waitWet: 0, place: 0, wind: 0, master: 0 };
  const maybeYield = makeYielder(opts.budgetMs ?? 20);
  const total = Math.round(TOTAL_DURATION * sr);
  const L = new Float32Array(total);
  const R = new Float32Array(total);
  const irs = {
    hall: makeIR(srHalf, { seconds: 2.4, rt60: 2.1, predelay: 0.018, bright: 6500, dark: 1800, early: 10, seed: 11 }),
    room: makeIR(srHalf, { seconds: 0.7, rt60: 0.5, predelay: 0.005, bright: 8000, dark: 2500, early: 14, seed: 23 }),
  };
  const sections = buildScore();
  for (const sec of sections) for (const ev of sec.events) ev.key = voiceKey(ev.voice, ev.midi, ev.dur, ev.vel, ev.p || {});
  const stats = [];

  let c0 = clock();
  const hc = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 2;
  const pool = opts.workers === false ? null : await SynthPool.create(clamp(hc - 1, 1, 3));
  phase.pool = clock() - c0;

  // wind bed: half rate, in a worker if we have one
  const windLen = (total >> 1) + 2;
  let windP = null;
  if (pool) {
    const w = pool.leastLoaded();
    pool.load[w] += 120;
    windP = pool.post(w, { type: 'wind', sr: srHalf, length: windLen, seed: WIND_SEED });
  }

  const noteReqs = [];
  const request = (k) => {
    if (pool && k < sections.length && !noteReqs[k]) noteReqs[k] = requestSectionNotes(pool, sections[k], sr).catch(() => null);
  };
  for (let k = 0; k < LOOKAHEAD; k++) request(k);

  const place = (sec, bus, wet) => {
    const [DL, DR] = bus.dry;
    const len = bus.len;
    if (wet) {
      const wl = wet.getChannelData(0);
      const wr = wet.getChannelData(1);
      const hmax = wl.length - 2;
      for (let i = 0; i < len; i++) {
        const j = Math.min(i >> 1, hmax);
        const fr = (i & 1) * 0.5;
        DL[i] += wl[j] + (wl[j + 1] - wl[j]) * fr;
        DR[i] += wr[j] + (wr[j + 1] - wr[j]) * fr;
      }
    }
    if (sec.eq) {
      eq(DL, sr, sec.eq);
      eq(DR, sr, sec.eq);
    }
    const a = Math.round((sec.measure[0] - sec.start) * sr);
    const b = Math.round((sec.measure[1] - sec.start) * sr);
    const rms = kRms([DL, DR], sr, a, b);
    const want = MUSIC_TARGET * dbToGain(sec.loudDb || 0);
    const g = rms > 1e-6 ? clamp(want / rms, 0.05, 30) : 1;
    const s0 = Math.round(sec.start * sr);
    const fadeInEnd = Math.round((sec.t0 - sec.start) * sr);
    const tailStart = Math.round((sec.t1 - sec.start) * sr);
    const tailLen = Math.round(XFADE * sr);
    const iEnd = Math.min(len, total - s0, tailStart + tailLen);
    for (let i = Math.max(0, -s0); i < iEnd; i++) {
      let w = g;
      if (i < fadeInEnd) w *= Math.sin(((i / fadeInEnd) * Math.PI) / 2) ** 2;
      else if (i > tailStart) w *= Math.cos((((i - tailStart) / tailLen) * Math.PI) / 2) ** 2;
      L[s0 + i] += DL[i] * w;
      R[s0 + i] += DR[i] * w;
    }
    stats.push({ id: sec.id, rawRms: rms, gain: g, events: sec.events.length });
  };

  const scratch = { L: new Float32Array(0), R: new Float32Array(0) };
  const inflight = [];
  for (let k = 0; k < sections.length; k++) {
    const sec = sections[k];
    request(k + LOOKAHEAD);
    c0 = clock();
    const notes = pool ? await noteReqs[k] : null;
    phase.waitNotes += clock() - c0;
    c0 = clock();
    const bus = await mixSection(sec, sr, maybeYield, scratch, notes);
    if (!pool) clearVoiceCache(); // bounded memory on the fallback path
    phase.mix += clock() - c0;
    inflight.push(renderWetOAC(bus, irs, srHalf).then((wet) => ({ sec, bus, wet })));
    if (inflight.length >= MAX_INFLIGHT) {
      c0 = clock();
      const r = await inflight.shift();
      phase.waitWet += clock() - c0;
      c0 = clock();
      place(r.sec, r.bus, r.wet);
      phase.place += clock() - c0;
      await maybeYield();
    }
    if (opts.onProgress) opts.onProgress((k + 1) / sections.length);
  }
  for (const p of inflight) {
    c0 = clock();
    const r = await p;
    phase.waitWet += clock() - c0;
    c0 = clock();
    place(r.sec, r.bus, r.wet);
    phase.place += clock() - c0;
  }

  c0 = clock();
  let windL;
  let windR;
  const windRes = windP ? await windP.catch(() => null) : null;
  if (windRes) {
    windL = windRes.L;
    windR = windRes.R;
  } else {
    const wind = new WindGen(srHalf, windLen, windinessAt, WIND_SEED);
    while (!wind.process(1 << 15)) await maybeYield();
    windL = wind.L;
    windR = wind.R;
  }
  if (pool) pool.terminate();
  phase.wind = clock() - c0;
  c0 = clock();

  // wind level: K-RMS of the bed relative to its mean windiness
  let meanW = 0;
  let cnt = 0;
  for (let t = 0; t < TOTAL_DURATION; t += 0.1) {
    meanW += windinessAt(t);
    cnt++;
  }
  meanW /= cnt;
  const windRms = kRms([windL, windR], srHalf) || 1e-6;
  const wg = (WIND_LEVEL * MUSIC_TARGET * meanW) / windRms;
  await maybeYield();

  // sum (wind interpolated up from half rate), fade the very start and end
  const fadeInN = Math.round(0.4 * sr);
  const endFadeA = Math.round(176.9 * sr);
  for (let i = 0; i < total; i++) {
    const j = i >> 1;
    const fr = (i & 1) * 0.5;
    const wl = windL[j] + (windL[j + 1] - windL[j]) * fr;
    const wr = windR[j] + (windR[j + 1] - windR[j]) * fr;
    let w = 1;
    if (i < fadeInN) w = i / fadeInN;
    else if (i > endFadeA) w = Math.cos((((i - endFadeA) / (total - endFadeA)) * Math.PI) / 2) ** 2;
    L[i] = (L[i] + wl * wg) * w;
    R[i] = (R[i] + wr * wg) * w;
  }
  await maybeYield();
  const prePeak = peakOf([L, R]);
  const limited = await limitInPlace(L, R, sr, CEILING * 0.995, maybeYield);
  const peak = peakOf([L, R]) || 1;
  const norm = (CEILING * 0.995) / peak;
  for (let i = 0; i < total; i++) {
    L[i] *= norm;
    R[i] *= norm;
  }
  maybeYield.close();

  const out = new AudioBuffer({ length: total, numberOfChannels: 2, sampleRate: sr });
  out.copyToChannel(L, 0);
  out.copyToChannel(R, 1);
  const tEnd = clock();
  phase.master = tEnd - c0;
  lastStats = { ms: tEnd - tStart, workers: pool ? pool.workers.length : 0, phase, sampleRate: sr, prePeak, limitedFraction: limited, normGain: norm, windGain: wg, sections: stats };
  return out;
}

// -----------------------------------------------------------------------------
// WAV export
// -----------------------------------------------------------------------------
export function encodeWav16(audioBuffer) {
  const nCh = audioBuffer.numberOfChannels;
  const n = audioBuffer.length;
  const sr = audioBuffer.sampleRate;
  const dataBytes = n * nCh * 2;
  const bytes = new Uint8Array(44 + dataBytes);
  const dv = new DataView(bytes.buffer);
  const str = (o, s) => {
    for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i);
  };
  str(0, 'RIFF');
  dv.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, nCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * nCh * 2, true);
  dv.setUint16(32, nCh * 2, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, dataBytes, true);
  const chans = [];
  for (let c = 0; c < nCh; c++) chans.push(audioBuffer.getChannelData(c));
  const rnd = mulberry32(16);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nCh; c++) {
      const dither = (rnd() - rnd()) / 32768; // TPDF, ±1 LSB, seeded -> deterministic
      const v = clamp(chans[c][i] + dither, -1, 1);
      dv.setInt16(o, Math.round(v < 0 ? v * 32768 : v * 32767), true);
      o += 2;
    }
  }
  return bytes;
}

// -----------------------------------------------------------------------------
// Playback engine
// -----------------------------------------------------------------------------
export function createAudioEngine() {
  const DUR = TOTAL_DURATION;
  let buffer = null;
  let ready = false;
  let renderPromise = null;
  const readyCbs = [];
  const endedCbs = [];
  let ctx = null;
  let master = null;
  let source = null;
  let srcGain = null;
  let token = 0;
  let playing = false; // a source is actually running
  let wantPlay = false; // play requested (possibly before the buffer is ready)
  let offset = 0; // film time at ctxStart (or the paused position)
  let ctxStart = 0;
  let wallStart = 0;
  let volume = 0.9;
  let muted = false;

  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    const limiter = ctx.createDynamicsCompressor(); // gentle safety limiter (volume > 1 or resampling overs)
    limiter.threshold.value = -2;
    limiter.knee.value = 2;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    const trim = ctx.createGain();
    trim.gain.value = 0.89; // offsets the compressor's automatic make-up gain
    master.connect(trim);
    trim.connect(limiter);
    limiter.connect(ctx.destination);
    return ctx;
  }

  const outLatency = () => (ctx ? clamp((ctx.outputLatency || 0) + (ctx.baseLatency || 0), 0, 0.25) : 0);

  function currentTime() {
    if (playing && source && ctx) {
      const el = ctx.currentTime - ctxStart - outLatency();
      return clamp(offset + Math.max(0, el), 0, DUR);
    }
    if (wantPlay) return clamp(offset + (nowMs() - wallStart) / 1000, 0, DUR);
    return offset;
  }

  function stopSource() {
    if (!source) return;
    token++;
    const s = source;
    const g = srcGain;
    source = null;
    srcGain = null;
    playing = false;
    try {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.015);
      s.stop(t + 0.03);
    } catch (e) {
      /* already stopped */
    }
    setTimeout(() => {
      try {
        s.disconnect();
        g.disconnect();
      } catch (e) {
        /* ignore */
      }
    }, 120);
  }

  function startSource(t) {
    stopSource();
    if (!ctx || !buffer) return;
    const pos = clamp(t, 0, DUR);
    if (pos >= buffer.duration - 0.01) {
      offset = DUR;
      wantPlay = false;
      endedCbs.forEach((cb) => cb());
      return;
    }
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    const g = ctx.createGain();
    const when = ctx.currentTime + 0.02;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(1, when + 0.012);
    s.connect(g);
    g.connect(master);
    const my = ++token;
    s.onended = () => {
      if (my !== token || source !== s) return;
      source = null;
      srcGain = null;
      playing = false;
      wantPlay = false;
      offset = DUR;
      endedCbs.forEach((cb) => cb());
    };
    s.start(when, pos);
    source = s;
    srcGain = g;
    ctxStart = when;
    offset = pos;
    playing = true;
  }

  function applyGain() {
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.015);
  }

  return {
    init() {
      if (!renderPromise) {
        renderPromise = (async () => {
          // let the first frame paint and the player boot before the heavy lifting
          await new Promise((r) => setTimeout(r, 250));
          buffer = await renderSoundtrack(44100);
          ready = true;
          readyCbs.slice().forEach((cb) => cb());
          if (wantPlay && ctx) {
            if (ctx.state !== 'running') {
              try {
                await ctx.resume();
              } catch (e) {
                /* ignore */
              }
            }
            if (wantPlay) startSource(currentTime());
          }
        })();
      }
      return renderPromise;
    },
    isReady: () => ready,
    onReady(cb) {
      if (typeof cb !== 'function') return;
      readyCbs.push(cb);
      if (ready) queueMicrotask(cb);
    },
    onEnded(cb) {
      if (typeof cb === 'function') endedCbs.push(cb);
    },
    async play(t) {
      offset = clamp(Number(t) || 0, 0, DUR);
      wallStart = nowMs();
      wantPlay = true;
      const c = ensureCtx();
      if (!c) return;
      if (c.state !== 'running') {
        try {
          await c.resume();
        } catch (e) {
          /* autoplay policy: stays silent, the visuals keep their own clock */
        }
      }
      if (!wantPlay || !ready) return;
      // continue from where the wall clock says we are (resume() may take a moment)
      startSource(currentTime());
    },
    pause() {
      const t = currentTime();
      wantPlay = false;
      stopSource();
      offset = t;
    },
    seek(t) {
      const pos = clamp(Number(t) || 0, 0, DUR);
      if (playing && ready) startSource(pos);
      else {
        offset = pos;
        wallStart = nowMs();
      }
    },
    isPlaying: () => playing && !!source,
    getCurrentTime: () => currentTime(),
    setVolume(v) {
      volume = clamp(Number(v) || 0, 0, 1);
      applyGain();
    },
    getVolume: () => volume,
    setMuted(b) {
      muted = !!b;
      applyGain();
    },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      applyGain();
    },
  };
}
