import { openRenderHost } from './browser.mjs';
const { page, errors, close } = await openRenderHost();
try {
  const r = await page.evaluate(async () => {
    const sr = 44100, len = Math.round(9.1 * sr);
    const mkIR = (sec) => { const b = new AudioBuffer({ length: Math.round(sec * sr), numberOfChannels: 2, sampleRate: sr }); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr * 3); } return b; };
    const hall = mkIR(2.4), room = mkIR(0.7);
    const input = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: sr });
    for (let c = 0; c < 2; c++) { const d = input.getChannelData(c); for (let i = 0; i < len; i++) d[i] = Math.random() - 0.5; }
    const run = async (convs, mono) => {
      const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: len, sampleRate: sr });
      for (const ir of convs) { const s = ctx.createBufferSource(); s.buffer = input; const cv = ctx.createConvolver(); cv.normalize = false; cv.buffer = ir; s.connect(cv).connect(ctx.destination); s.start(0); }
      const s = ctx.createBufferSource(); s.buffer = input; s.connect(ctx.destination); s.start(0);
      const t = performance.now(); await ctx.startRendering(); return performance.now() - t;
    };
    const out = {};
    out.none = await run([]);
    out.room = await run([room]);
    out.hall = await run([hall]);
    out.both = await run([hall, room]);
    const t = performance.now(); await Promise.all([run([hall, room]), run([hall, room])]); out.both2parallel = performance.now() - t;
    const t2 = performance.now(); await Promise.all([run([hall, room]), run([hall, room]), run([hall, room]), run([hall, room])]); out.both4parallel = performance.now() - t2;
    return out;
  });
  console.log(r);
} finally { console.log(errors); await close(); }
