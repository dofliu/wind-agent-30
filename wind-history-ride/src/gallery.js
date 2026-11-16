// src/gallery.js — 20-era gallery: one still per era + the teaching text and sources.
import { boot, renderPanelInto } from './main.js';
import { SCENES } from './beat/timeline.js';

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

async function main() {
  await boot();
  const grid = document.getElementById('grid');
  for (const s of SCENES) {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = `era-${s.id}`;
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${s.zh}（${s.style}）`);
    const facts = (s.facts || []).map((f) => `<li>${esc(f)}</li>`).join('');
    const srcs = (s.sources || []).map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join('');
    card.appendChild(canvas);
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `
      <div class="date">${String(s.num).padStart(2, '0')} · ${esc(s.dateLabel)}</div>
      <h3>${esc(s.zh)}</h3>
      <div class="en">${esc(s.en)}</div>
      <div class="style">畫風：${esc(s.style)} · ${esc(s.styleEn)}</div>
      <p class="cap">${esc(s.caption)}</p>
      ${s.description ? `<p>${esc(s.description)}</p>` : ''}
      ${facts ? `<ul>${facts}</ul>` : ''}
      ${s.specs ? `<p class="style"><b>規格</b> ${esc(s.specs)}</p>` : ''}
      ${srcs ? `<details><summary>資料來源</summary><ul>${srcs}</ul></details>` : ''}
      <p class="play"><a href="./index.html?t=${(s.t0 + 0.01).toFixed(2)}">▶ 從這一站開始播放</a></p>`;
    card.appendChild(body);
    grid.appendChild(card);
    // render lazily, one per animation frame, so the page stays responsive
    await new Promise((r) => requestAnimationFrame(r));
    renderPanelInto(canvas.getContext('2d'), s.id, 4, 500, { withFrame: false });
  }
  window.__WIND_GALLERY_DONE__ = true;
}
main();
