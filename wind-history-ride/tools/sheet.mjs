// tools/sheet.mjs — contact sheet: every era panel at local times 1, 4, 7 s -> out/sheet.png
import fs from 'node:fs';
import { openRenderHost } from './browser.mjs';

const times = (process.argv[2] || '1,4,7').split(',').map(Number);
const out = process.argv[3] || 'out/sheet.png';
const { page, errors, close } = await openRenderHost();
const png = await page.evaluate(async (lts) => {
  const scenes = window.__WIND_SCENES__;
  const S = 240;
  const c = document.createElement('canvas');
  c.width = S * lts.length * 2 + 20;
  c.height = Math.ceil(scenes.length / 2) * (S + 10) + 10;
  const g = c.getContext('2d');
  g.fillStyle = '#111';
  g.fillRect(0, 0, c.width, c.height);
  const src = document.querySelector('#canvas-host canvas');
  for (let i = 0; i < scenes.length; i++) {
    for (let k = 0; k < lts.length; k++) {
      await window.renderPanelAt(scenes[i].id, lts[k]);
      const col = (i % 2) * lts.length + k;
      const row = Math.floor(i / 2);
      g.drawImage(src, 10 + col * S + (i % 2) * 0, 10 + row * (S + 10), S - 6, S - 6);
    }
  }
  return c.toDataURL('image/png').split(',')[1];
}, times);
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log(`wrote ${out}`);
if (errors.length) console.log(errors.join('\n'));
await close();
