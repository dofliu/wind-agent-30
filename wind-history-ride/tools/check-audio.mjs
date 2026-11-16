// tools/check-audio.mjs — render the procedural soundtrack in the browser and measure it.
//
//   node tools/check-audio.mjs                 render at 44.1 kHz, print per-section RMS / peak
//   node tools/check-audio.mjs --sr 48000      other sample rate
//   node tools/check-audio.mjs --determinism   render twice and compare a hash of the samples
//   node tools/check-audio.mjs --json out.json also write the measurements as JSON
//
// Fails (exit 1) if the duration is wrong, any section is (near) silent, a sample is NaN,
// or the peak exceeds 0.98.
import fs from 'node:fs';
import { openRenderHost } from './browser.mjs';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const sr = Number(arg('--sr', 44100));
const determinism = args.includes('--determinism');
const jsonOut = arg('--json', null);

const { page, errors, close } = await openRenderHost();
let failed = false;
try {
  const res = await page.evaluate(
    async ([sr, determinism]) => {
      const m = await import('./src/audio/engine.js');
      const hashBuf = (buf) => {
        let h = 2166136261 >>> 0;
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const d = buf.getChannelData(c);
          for (let i = 0; i < d.length; i++) {
            h ^= Math.round(d[i] * 32767) & 0xffff;
            h = Math.imul(h, 16777619);
          }
        }
        return (h >>> 0).toString(16);
      };
      const t0 = performance.now();
      const buf = await m.renderSoundtrack(sr);
      const ms = performance.now() - t0;
      const stats = m.getLastRenderStats();
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      const measure = (a, b) => {
        const i0 = Math.max(0, Math.round(a * buf.sampleRate));
        const i1 = Math.min(buf.length, Math.round(b * buf.sampleRate));
        let pk = 0;
        let ss = 0;
        let nan = 0;
        let clip = 0;
        for (let i = i0; i < i1; i++) {
          const l = L[i];
          const r = R[i];
          if (!Number.isFinite(l) || !Number.isFinite(r)) {
            nan++;
            continue;
          }
          const al = Math.abs(l);
          const ar = Math.abs(r);
          if (al > pk) pk = al;
          if (ar > pk) pk = ar;
          if (al >= 0.999 || ar >= 0.999) clip++;
          ss += l * l + r * r;
        }
        return { peak: pk, rms: Math.sqrt(ss / Math.max(1, 2 * (i1 - i0))), nan, clip };
      };
      const sections = [{ id: 'intro', a: 0, b: 6 }];
      for (const s of window.__WIND_SCENES__) sections.push({ id: s.id, num: s.num, a: s.t0, b: s.t0 + 8 });
      sections.push({ id: 'outro', a: 166, b: 178 });
      const rows = sections.map((s) => ({ ...s, ...measure(s.a, s.b) }));
      const all = measure(0, buf.duration);
      let hash = null;
      let hash2 = null;
      if (determinism) {
        hash = hashBuf(buf);
        const buf2 = await m.renderSoundtrack(sr);
        hash2 = hashBuf(buf2);
      }
      return { ms, duration: buf.duration, length: buf.length, sampleRate: buf.sampleRate, channels: buf.numberOfChannels, all, rows, stats, hash, hash2 };
    },
    [sr, determinism],
  );

  const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf').padStart(6);
  console.log(`soundtrack: ${res.duration.toFixed(3)} s, ${res.channels} ch @ ${res.sampleRate} Hz (${res.length} samples)`);
  console.log(`render time: ${(res.ms / 1000).toFixed(2)} s`);
  console.log(`overall: peak ${res.all.peak.toFixed(4)} (${db(res.all.peak)} dBFS)  RMS ${res.all.rms.toFixed(4)} (${db(res.all.rms)} dBFS)  clipped samples ${res.all.clip}  NaN ${res.all.nan}`);
  console.log('');
  console.log('section        window (s)       RMS      RMS dB   peak    peak dB');
  const eraRms = [];
  for (const r of res.rows) {
    const name = (r.num ? `${String(r.num).padStart(2, '0')} ${r.id}` : r.id).padEnd(14);
    const win = `${r.a.toFixed(1).padStart(6)}–${r.b.toFixed(1).padEnd(6)}`;
    console.log(`${name} ${win}   ${r.rms.toFixed(4)}  ${db(r.rms)}   ${r.peak.toFixed(3)}  ${db(r.peak)}`);
    if (r.num) eraRms.push(20 * Math.log10(Math.max(r.rms, 1e-9)));
    if (r.rms < 0.005) {
      console.log(`  !! ${r.id} is (near) silent`);
      failed = true;
    }
    if (r.nan) {
      console.log(`  !! ${r.id} has ${r.nan} NaN samples`);
      failed = true;
    }
  }
  const spread = Math.max(...eraRms) - Math.min(...eraRms);
  console.log('');
  console.log(`era RMS spread: ${spread.toFixed(2)} dB (min ${Math.min(...eraRms).toFixed(1)}, max ${Math.max(...eraRms).toFixed(1)} dBFS)`);
  if (res.stats) {
    if (res.stats.phase) console.log('phases (ms): ' + Object.entries(res.stats.phase).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '));
    console.log(`limiter active on ${(100 * res.stats.limitedFraction).toFixed(2)}% of samples, pre-limit peak ${res.stats.prePeak.toFixed(3)}, final norm gain ${res.stats.normGain.toFixed(3)}`);
  }
  if (res.hash) console.log(`determinism: ${res.hash} vs ${res.hash2} -> ${res.hash === res.hash2 ? 'identical' : 'DIFFERENT'}`);
  if (Math.abs(res.duration - 178) > 0.01) {
    console.log(`!! duration ${res.duration} != 178`);
    failed = true;
  }
  if (res.all.peak > 0.98) {
    console.log(`!! peak ${res.all.peak} > 0.98`);
    failed = true;
  }
  if (res.hash && res.hash !== res.hash2) failed = true;
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 2));
} finally {
  if (errors.length) {
    console.log('--- browser console errors/warnings ---');
    for (const e of errors) console.log(e);
  }
  await close();
}
console.log(failed ? 'AUDIO CHECK FAILED' : 'audio check OK');
process.exit(failed ? 1 : 0);
