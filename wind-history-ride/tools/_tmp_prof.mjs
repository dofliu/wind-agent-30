import { openRenderHost } from './browser.mjs';
const { page, errors, close } = await openRenderHost();
try {
  const client = await page.context().newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 200 });
  await client.send('Profiler.start');
  const r = await page.evaluate(async () => { const m = await import('./src/audio/engine.js'); const t = performance.now(); await m.renderSoundtrack(44100); return { ms: performance.now() - t, st: m.getLastRenderStats().phase }; });
  const { profile } = await client.send('Profiler.stop');
  console.log(r);
  const idx = {}; profile.nodes.forEach((n) => (idx[n.id] = n));
  const self = {};
  profile.samples.forEach((s, i) => { const n = idx[s]; const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self[k] = (self[k] || 0) + (profile.timeDeltas[i] || 0); });
  console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`).join('\n'));
} finally { console.log(errors); await close(); }
