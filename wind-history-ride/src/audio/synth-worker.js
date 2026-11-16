// src/audio/synth-worker.js — module Web Worker that renders note buffers (and the wind
// bed) off the main thread. Pure functions of their inputs, so results are bit-identical
// to the main-thread fallback path in engine.js.
import { renderKey } from './instruments.js';
import { WindGen } from './foley.js';
import { windinessAt } from './score.js';

self.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'ping') {
      self.postMessage({ type: 'pong', id: msg.id });
    } else if (msg.type === 'notes') {
      const bufs = msg.jobs.map((j) => renderKey(j.key, msg.sr, j.p));
      self.postMessage({ type: 'notes', id: msg.id, keys: msg.jobs.map((j) => j.key), bufs }, bufs.map((b) => b.buffer));
    } else if (msg.type === 'wind') {
      const w = new WindGen(msg.sr, msg.length, windinessAt, msg.seed);
      while (!w.process(1 << 16));
      self.postMessage({ type: 'wind', id: msg.id, L: w.L, R: w.R }, [w.L.buffer, w.R.buffer]);
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String((err && err.stack) || err) });
  }
};
