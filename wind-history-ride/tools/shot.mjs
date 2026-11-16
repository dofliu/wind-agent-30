// tools/shot.mjs — deterministic screenshots.
//
//   node tools/shot.mjs film 12.5 out/film_12.5.png        full 1920x1080 frame at t = 12.5 s
//   node tools/shot.mjs film 6,10,14 out/film               several frames -> out/film_t6.png ...
//   node tools/shot.mjs panel nile 0,4,7.9 out/nile         one era panel (1000x1000) at local times
//   node tools/shot.mjs panel nile 4 out/nile --x 500       force the rider's local x
//   node tools/shot.mjs panel nile 4 out/nile --thumb       render as an outro thumbnail
//   add --timing to print average render time per frame (perf budget: < 12 ms per panel)
import fs from 'node:fs';
import path from 'node:path';
import { openRenderHost, grabCanvas } from './browser.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--x'].includes(args[i - 1])));
const mode = pos[0];
if (!mode || !['film', 'panel'].includes(mode)) {
  console.log('usage: node tools/shot.mjs film <t[,t2..]> <out> | panel <id> <localT[,..]> <out> [--x 500] [--thumb] [--timing]');
  process.exit(1);
}

const { page, errors, close } = await openRenderHost();
try {
  if (mode === 'film') {
    const times = pos[1].split(',').map(Number);
    const out = pos[2] || 'out/film';
    for (const t of times) {
      const t0 = Date.now();
      await page.evaluate((tt) => window.renderAt(tt), t);
      const file = times.length > 1 || !out.endsWith('.png') ? `${out.replace(/\.png$/, '')}_t${t}.png` : out;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, await grabCanvas(page));
      console.log(`wrote ${file} (${Date.now() - t0} ms)`);
    }
  } else {
    const id = pos[1];
    const times = (pos[2] || '4').split(',').map(Number);
    const out = pos[3] || `out/${id}`;
    const x = getFlag('--x');
    const thumb = flags.has('--thumb');
    for (const lt of times) {
      await page.evaluate(([i, l, xx, th]) => window.renderPanelAt(i, l, xx, { isThumbnail: th }), [id, lt, x === null ? null : Number(x), thumb]);
      const file = times.length > 1 || !out.endsWith('.png') ? `${out.replace(/\.png$/, '')}_lt${lt}.png` : out;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, await grabCanvas(page));
      console.log(`wrote ${file}`);
    }
    if (flags.has('--timing')) {
      const ms = await page.evaluate(async (i) => {
        // warm-up (bakes caches), then time 60 frames across the era
        await window.renderPanelAt(i, 1);
        const t0 = performance.now();
        for (let k = 0; k < 60; k++) await window.renderPanelAt(i, (k / 60) * 8);
        return (performance.now() - t0) / 60;
      }, id);
      console.log(`timing: ${ms.toFixed(2)} ms / panel frame (budget < 12 ms)`);
    }
  }
  if (flags.has('--timing') && mode === 'film') {
    const ms = await page.evaluate(async () => {
      await window.renderAt(10);
      const t0 = performance.now();
      for (let k = 0; k < 60; k++) await window.renderAt(6 + k * 2.6);
      return (performance.now() - t0) / 60;
    });
    console.log(`timing: ${ms.toFixed(2)} ms / film frame`);
  }
} finally {
  if (errors.length) {
    console.log('--- browser console errors/warnings ---');
    for (const e of errors) console.log(e);
  } else {
    console.log('no console errors');
  }
  await close();
}
