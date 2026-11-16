// src/main.js
// Pure-function frame scheduler `renderFilmFrame(ctx, t)` for 《乘風騎行》 plus the
// interactive player (index.html), the deterministic render host (render.html) and
// the single-panel inspector used by tools/shot.mjs.

import {
  TOTAL_DURATION,
  INTRO_SEC,
  SCENE_SEC,
  OUTRO_START,
  NUM_SCENES,
  PANEL_SIZE,
  ROAD_Y,
  SCENES,
  clamp,
  smoothstep,
  envelope,
  getBeatState,
  getRiderWorldState,
  pinwheelAngleAt,
  pedalAngleAt,
  sceneById,
} from './beat/timeline.js';
import { VIEW_W, VIEW_H, getCameraState, getVisiblePanelIndices } from './beat/camera.js';
import { createKit } from './kit/kit.js';
import { FONT, loadFonts } from './kit/fonts.js';
import { drawPanelFrame, drawPlacard } from './kit/frame.js';
import { renderScenePanel } from './scenes/index.js';
import { renderIntroOverlay, INTRO_FADE_END } from './scenes/intro.js';
import { renderOutro, tickX } from './scenes/outro.js';
import { createAudioEngine } from './audio/engine.js';

const params = new URLSearchParams(window.location.search);
const IS_RENDER_MODE = window.__WIND_RENDER_MODE__ === true || params.get('render') === '1';
const IS_GALLERY = window.__WIND_GALLERY_MODE__ === true;

let kit = null;
let mainCanvas = null;
let mainCtx = null;
let audioEngine = null;
let currentT = clamp(parseFloat(params.get('t') || '0') || 0, 0, TOTAL_DURATION);
let isPlaying = false;
let lastWallMs = 0;
let teachMode = false;
let teachPausedScene = -1;

const OUTRO_XFADE = 0.6;

// =============================================================================
// Frame renderer
// =============================================================================

function panelParams(scene, t, rider) {
  const rawLocalT = t - scene.t0;
  return {
    t,
    localT: clamp(rawLocalT, 0, SCENE_SEC),
    rawLocalT,
    riderLocalX: rider.worldX - scene.worldX0,
    riderWorldX: rider.worldX,
    pedalAngle: rider.pedalAngle,
    speedScale: rider.speedScale,
    pinwheelAngle: pinwheelAngleAt(t),
    isThumbnail: false,
  };
}

/** Neutral "pencil sketch" rider used on the bare wall before #01 / after #20. */
const WALL_RIDER_STYLE = {
  plumage: '#efe9dc',
  plumageShade: '#cfc6b3',
  frame: '#8a7a62',
  frameShade: '#7a6b55',
  outline: '#2a251f',
  pinwheel: { type: 'paper', colors: ['#d9cdb2', '#b8a88a', '#d9cdb2', '#b8a88a'] },
};

function drawWallRoad(ctx, x0, x1) {
  ctx.strokeStyle = 'rgba(190, 170, 140, 0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(x0, ROAD_Y);
  ctx.lineTo(x1, ROAD_Y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWall(ctx, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#24211d');
  g.addColorStop(0.75, '#1c1a17');
  g.addColorStop(1, '#141210');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // faint wall texture bands that scroll with the camera (parallax 1.0)
  ctx.fillStyle = 'rgba(255, 240, 210, 0.018)';
  const off = (-cam.camX * cam.scale) % 240;
  for (let x = off - 240; x < VIEW_W + 240; x += 240) ctx.fillRect(x, 0, 120, VIEW_H);
}

function drawTimeRuler(ctx, t, alpha) {
  if (alpha <= 0.01) return;
  const y = 1052;
  const x0 = 70;
  const x1 = VIEW_W - 70;
  const step = (x1 - x0) / NUM_SCENES;
  const pos = clamp((t - INTRO_SEC) / SCENE_SEC, 0, NUM_SCENES);
  const cur = clamp(Math.floor(pos), 0, NUM_SCENES - 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10, 9, 8, 0.55)';
  ctx.fillRect(0, y - 26, VIEW_W, 54);
  ctx.strokeStyle = 'rgba(233, 226, 207, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y - 8);
  ctx.lineTo(x1, y - 8);
  ctx.stroke();
  // progress
  ctx.strokeStyle = 'rgba(233, 196, 106, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y - 8);
  ctx.lineTo(x0 + pos * step, y - 8);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < NUM_SCENES; i++) {
    const x = x0 + (i + 0.5) * step;
    const active = i === cur && t >= INTRO_SEC && t < OUTRO_START;
    ctx.fillStyle = active ? '#e9c46a' : i < pos ? 'rgba(233, 226, 207, 0.8)' : 'rgba(233, 226, 207, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y - 8, active ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = active ? `700 17px ${FONT.sans}` : `500 15px ${FONT.sans}`;
    ctx.fillText(SCENES[i].ruler, x, y + 16);
  }
  // spoonbill-head marker
  const mx = x0 + pos * step;
  ctx.fillStyle = '#f7f4ec';
  ctx.beginPath();
  ctx.arc(mx, y - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#161514';
  ctx.beginPath();
  ctx.moveTo(mx + 3, y - 12);
  ctx.lineTo(mx + 22, y - 5);
  ctx.quadraticCurveTo(mx + 27, y - 3, mx + 22, y);
  ctx.lineTo(mx + 3, y - 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderFilmFrame(ctx, tIn) {
  const t = clamp(tIn, 0, TOTAL_DURATION);
  const beat = getBeatState(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // ---- pure outro --------------------------------------------------------
  if (t >= OUTRO_START + OUTRO_XFADE) {
    renderOutro(ctx, kit, t - OUTRO_START, renderScenePanel);
    return beat;
  }

  // ---- scrolling museum wall --------------------------------------------
  const cam = getCameraState(t);
  const rider = cam.rider;
  const visible = getVisiblePanelIndices(cam);

  const rendered = visible.map((idx, slotIdx) => {
    const scene = SCENES[idx];
    const slot = kit.getSlot(slotIdx);
    slot.ctx.setTransform(1, 0, 0, 1, 0, 0);
    slot.ctx.globalAlpha = 1;
    slot.ctx.globalCompositeOperation = 'source-over';
    slot.ctx.clearRect(0, 0, PANEL_SIZE, PANEL_SIZE);
    renderScenePanel(kit, slot, scene, panelParams(scene, t, rider));
    return { scene, slot };
  });

  drawWall(ctx, cam);
  ctx.save();
  ctx.setTransform(cam.scale, 0, 0, cam.scale, VIEW_W / 2 - cam.camX * cam.scale, VIEW_H / 2 - cam.camY * cam.scale);

  // bare wall road before #01 and after #20
  const lastX = NUM_SCENES * PANEL_SIZE;
  if (cam.camX < 1300) drawWallRoad(ctx, -1500, 0);
  if (cam.camX > lastX - 1300) drawWallRoad(ctx, lastX, lastX + 1500);

  for (const { scene, slot } of rendered) {
    ctx.drawImage(slot.canvas, scene.worldX0, 0, PANEL_SIZE, PANEL_SIZE);
  }
  for (const { scene } of rendered) {
    drawPanelFrame(ctx, scene, scene.worldX0, beat.sceneIndex === scene.index);
    drawPlacard(ctx, scene, scene.worldX0, 1);
  }

  // rider on the bare wall (clipped outside the panels)
  if (rider.visible && (rider.worldX < 270 || rider.worldX > lastX - 270)) {
    ctx.save();
    ctx.beginPath();
    if (rider.worldX < 270) ctx.rect(-2000, -500, 2000, 2000);
    else ctx.rect(lastX, -500, 2000, 2000);
    ctx.clip();
    const rig = kit.computeRiderRig({
      x: rider.worldX,
      y: ROAD_Y,
      pedalAngle: rider.pedalAngle,
      speedScale: rider.speedScale,
      time: t,
      worldX: rider.worldX,
      pinwheelAngle: pinwheelAngleAt(t),
    });
    kit.drawRider(ctx, rig, WALL_RIDER_STYLE);
    ctx.restore();
  }
  ctx.restore();

  // time ruler HUD
  const rulerA = smoothstep(INTRO_FADE_END - 0.6, INTRO_FADE_END + 0.6, t) * (1 - smoothstep(OUTRO_START - 0.4, OUTRO_START + 0.2, t));
  drawTimeRuler(ctx, t, rulerA);

  // intro title overlay
  if (t < INTRO_FADE_END) renderIntroOverlay(ctx, t);

  // cross-dissolve into the outro
  if (t >= OUTRO_START - 0.01) {
    const a = smoothstep(OUTRO_START, OUTRO_START + OUTRO_XFADE, t);
    if (a > 0.001) {
      ctx.save();
      ctx.globalAlpha = a;
      renderOutro(ctx, kit, t - OUTRO_START, renderScenePanel);
      ctx.restore();
    }
  }
  return beat;
}

/** Render one era panel alone (1000x1000) — used by tools/shot.mjs and the gallery. */
export function renderPanelInto(ctx, sceneId, localT = 4, riderLocalX = null, opts = {}) {
  const scene = typeof sceneId === 'number' ? SCENES[sceneId] : sceneById(sceneId);
  if (!scene) throw new Error(`unknown scene ${sceneId}`);
  const t = scene.t0 + localT;
  const rider = getRiderWorldState(t);
  const p = {
    t,
    localT: clamp(localT, 0, SCENE_SEC),
    rawLocalT: localT,
    riderLocalX: riderLocalX === null || riderLocalX === undefined ? rider.worldX - scene.worldX0 : riderLocalX,
    riderWorldX: riderLocalX === null || riderLocalX === undefined ? rider.worldX : scene.worldX0 + riderLocalX,
    pedalAngle: pedalAngleAt(t),
    speedScale: 1,
    pinwheelAngle: pinwheelAngleAt(t),
    isThumbnail: Boolean(opts.isThumbnail),
  };
  const slot = { canvas: ctx.canvas, ctx };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, PANEL_SIZE, PANEL_SIZE);
  renderScenePanel(kit, slot, scene, p);
  if (opts.withFrame) {
    drawPanelFrame(ctx, scene, 0, false);
  }
  return scene;
}

// =============================================================================
// Boot
// =============================================================================

function allText() {
  const parts = ['乘風騎行風力發電五千年二十站騎行時間軸「風一直都在；人類花了五千年，學會騎上它。」風，一直都在。從尼羅河的帆、磨坊的風車，到百萬瓦級的離岸巨人與走進機艙的 AI Agent下一站，換你騎上風。《》·程式即時生成的動畫畫廊頁史料出處見'];
  for (const s of SCENES) parts.push(s.zh, s.caption, s.dateLabel, s.ruler, s.style, s.description || '', (s.facts || []).join(''), s.specs || '');
  return Array.from(new Set(parts.join(''))).join('');
}

export async function boot() {
  await loadFonts(allText());
  kit = createKit();
  window.__WIND_KIT__ = kit;

  const host = document.getElementById('canvas-host');
  mainCanvas = document.createElement('canvas');
  mainCanvas.width = VIEW_W;
  mainCanvas.height = VIEW_H;
  mainCanvas.id = 'film';
  if (host) host.appendChild(mainCanvas);
  mainCtx = mainCanvas.getContext('2d');

  // ---- deterministic external API (tools/*.mjs) ------------------------
  window.renderAt = async (t) => {
    if (mainCanvas.width !== VIEW_W) {
      mainCanvas.width = VIEW_W;
      mainCanvas.height = VIEW_H;
    }
    currentT = clamp(Number(t) || 0, 0, TOTAL_DURATION);
    if (!IS_RENDER_MODE && audioEngine && !isPlaying) audioEngine.seek(currentT);
    const st = renderFilmFrame(mainCtx, currentT);
    if (!IS_RENDER_MODE) updateHUD(st);
    return { t: st.t, section: st.section, sceneIndex: st.sceneIndex };
  };
  window.renderPanelAt = async (sceneId, localT = 4, riderLocalX = null, opts = {}) => {
    mainCanvas.width = PANEL_SIZE;
    mainCanvas.height = PANEL_SIZE;
    const s = renderPanelInto(mainCtx, sceneId, localT, riderLocalX, opts);
    return { id: s.id, num: s.num };
  };
  window.captureFrameAt = async (t, mime = 'image/png', quality = 0.92) => {
    await window.renderAt(t);
    return mainCanvas.toDataURL(mime, quality).split(',')[1];
  };
  window.__WIND_SCENES__ = SCENES.map((s) => ({ id: s.id, num: s.num, zh: s.zh, t0: s.t0 }));
  window.__WIND_TOTAL__ = TOTAL_DURATION;

  if (IS_GALLERY) {
    window.__WIND_READY__ = true;
    return;
  }

  const st = renderFilmFrame(mainCtx, currentT);
  window.__WIND_READY__ = true;
  if (IS_RENDER_MODE) return;

  audioEngine = createAudioEngine();
  window.__windAudio = audioEngine;
  initControls();
  updateHUD(st);
  updateAudioHUD();
  audioEngine.onReady(() => updateAudioHUD());
  audioEngine.onEnded(() => {
    currentT = TOTAL_DURATION;
    setPlaying(false, { fromEnded: true });
  });
  audioEngine.init().catch((e) => console.warn('[audio]', e));
  requestAnimationFrame(tick);
}

function tick() {
  if (isPlaying) {
    if (audioEngine && audioEngine.isPlaying()) {
      currentT = audioEngine.getCurrentTime();
    } else {
      const now = performance.now();
      currentT += Math.min(0.1, (now - lastWallMs) / 1000);
      lastWallMs = now;
    }
    // teaching mode: pause in the middle of each era
    if (teachMode && currentT >= INTRO_SEC && currentT < OUTRO_START) {
      const idx = Math.floor((currentT - INTRO_SEC) / SCENE_SEC);
      const mid = INTRO_SEC + idx * SCENE_SEC + SCENE_SEC * 0.5;
      if (idx !== teachPausedScene && currentT >= mid) {
        teachPausedScene = idx;
        currentT = mid;
        setPlaying(false);
      }
    }
    if (currentT >= TOTAL_DURATION) {
      currentT = TOTAL_DURATION;
      setPlaying(false, { fromEnded: true });
    }
    const st = renderFilmFrame(mainCtx, currentT);
    updateHUD(st);
  }
  requestAnimationFrame(tick);
}

// =============================================================================
// Player UI
// =============================================================================

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

function setPlaying(next, opts = {}) {
  if (next && currentT >= TOTAL_DURATION - 0.01) {
    currentT = 0;
    teachPausedScene = -1;
  }
  isPlaying = next;
  lastWallMs = performance.now();
  const btn = document.getElementById('btn-play');
  if (btn) btn.textContent = isPlaying ? '暫停 ⏸' : '播放 ▶';
  if (!audioEngine) return;
  if (isPlaying) audioEngine.play(currentT).catch((e) => console.warn('[audio]', e));
  else if (!opts.fromEnded) audioEngine.pause();
}

let lastInfoScene = -2;
function updateHUD(st) {
  const scrub = document.getElementById('scrubber');
  if (scrub && document.activeElement !== scrub) scrub.value = st.t.toFixed(3);
  const time = document.getElementById('time-readout');
  if (time) time.textContent = `${fmt(st.t)} / ${fmt(TOTAL_DURATION)}`;
  const badge = document.getElementById('era-badge');
  const idx = st.section === 'scenes' ? st.sceneIndex : st.section === 'intro' ? -1 : NUM_SCENES;
  if (badge) {
    badge.textContent =
      st.section === 'intro' ? '序章 · 乘風騎行' : st.section === 'outro' ? '終章 · 風，一直都在' : `${String(st.scene.num).padStart(2, '0')} · ${st.scene.dateLabel} · ${st.scene.zh}`;
  }
  const jump = document.getElementById('scene-jump');
  if (jump && document.activeElement !== jump) jump.value = String(idx);
  if (idx !== lastInfoScene) {
    lastInfoScene = idx;
    renderInfoCard(idx);
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function renderInfoCard(idx) {
  const el = document.getElementById('info-card');
  if (!el) return;
  if (idx < 0) {
    el.innerHTML = `<h2>乘風騎行 <small>Riding the Wind</small></h2>
      <p>一隻黑面琵鷺騎著腳踏車，車尾插著小風車，沿著一條連續的道路穿過 20 幅畫框；每一幅都是風力利用史上的一站，並用那個時代、那個地方的藝術媒材畫成。車尾的小風車會變成該時代的轉子型式。</p>
      <p class="hint">空白鍵播放／暫停 · ←/→ 微調 0.5 秒（Shift 2 秒）· M 靜音 · F 全螢幕 · 勾選「每站暫停」可在每一站中段自動停下講解。</p>`;
    return;
  }
  if (idx >= NUM_SCENES) {
    el.innerHTML = `<h2>風，一直都在 <small>Epilogue</small></h2><p>二十站一起排上時間軸。完整史料、出處與每一站的畫面請見 <a href="./gallery.html">畫廊頁</a>。</p>`;
    return;
  }
  const s = SCENES[idx];
  const facts = (s.facts || []).map((f) => `<li>${esc(f)}</li>`).join('');
  const srcs = (s.sources || []).map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join('');
  el.innerHTML = `
    <div class="info-head"><span class="num" style="background:${esc((s.frame && s.frame.accent) || '#c9a45c')}">${String(s.num).padStart(2, '0')}</span>
      <div><h2>${esc(s.zh)} <small>${esc(s.en)}</small></h2><div class="meta">${esc(s.dateLabel)} · 畫風：${esc(s.style)}</div></div></div>
    <p class="caption">${esc(s.caption)}</p>
    ${s.description ? `<p>${esc(s.description)}</p>` : ''}
    ${facts ? `<ul class="facts">${facts}</ul>` : ''}
    ${s.specs ? `<p class="specs"><b>規格</b> ${esc(s.specs)}</p>` : ''}
    ${srcs ? `<details><summary>資料來源</summary><ul class="sources">${srcs}</ul></details>` : ''}`;
}

function updateAudioHUD() {
  const btn = document.getElementById('btn-mute');
  const status = document.getElementById('audio-status');
  if (!audioEngine) return;
  if (btn) btn.textContent = audioEngine.isMuted() ? '🔇 靜音' : '🔊 聲音';
  if (status) {
    const ready = audioEngine.isReady();
    status.textContent = ready ? '配樂就緒' : '配樂合成中…';
    status.className = ready ? 'is-ready' : 'is-loading';
  }
}

function seekTo(t) {
  currentT = clamp(t, 0, TOTAL_DURATION);
  teachPausedScene = Math.floor((currentT - INTRO_SEC) / SCENE_SEC + 1e-6);
  // allow the teaching pause of the current era if we landed before its middle
  const local = currentT - INTRO_SEC - teachPausedScene * SCENE_SEC;
  if (local < SCENE_SEC * 0.5 - 0.05) teachPausedScene -= 1;
  if (audioEngine) audioEngine.seek(currentT);
  const st = renderFilmFrame(mainCtx, currentT);
  updateHUD(st);
}

function initControls() {
  const btn = document.getElementById('btn-play');
  const scrub = document.getElementById('scrubber');
  const jump = document.getElementById('scene-jump');
  const mute = document.getElementById('btn-mute');
  const vol = document.getElementById('volume-slider');
  const fs = document.getElementById('btn-fullscreen');
  const teach = document.getElementById('teach-mode');
  const stage = document.getElementById('stage-wrap');

  if (btn) btn.addEventListener('click', () => setPlaying(!isPlaying));
  if (stage) stage.addEventListener('click', () => setPlaying(!isPlaying));
  if (scrub) {
    scrub.max = String(TOTAL_DURATION);
    scrub.addEventListener('input', () => {
      if (isPlaying) setPlaying(false);
      seekTo(parseFloat(scrub.value) || 0);
    });
  }
  if (jump) {
    const add = (v, label) => {
      const o = document.createElement('option');
      o.value = String(v);
      o.textContent = label;
      jump.appendChild(o);
    };
    add(-1, '序章 · 乘風騎行');
    SCENES.forEach((s, i) => add(i, `${String(s.num).padStart(2, '0')} · ${s.dateLabel} · ${s.zh}`));
    add(NUM_SCENES, '終章 · 時間軸總覽');
    jump.addEventListener('change', () => {
      const v = parseInt(jump.value, 10);
      const target = v < 0 ? 0 : v >= NUM_SCENES ? OUTRO_START + 1 : SCENES[v].t0 + 0.01;
      seekTo(target);
    });
  }
  if (mute)
    mute.addEventListener('click', () => {
      audioEngine.toggleMute();
      updateAudioHUD();
    });
  if (vol)
    vol.addEventListener('input', () => {
      const v = parseFloat(vol.value);
      audioEngine.setVolume(Number.isFinite(v) ? v : 0.9);
      audioEngine.setMuted(v <= 0.001);
      updateAudioHUD();
    });
  if (teach)
    teach.addEventListener('change', () => {
      teachMode = teach.checked;
      teachPausedScene = Math.floor((currentT - INTRO_SEC) / SCENE_SEC + 1e-6) - 1;
    });
  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  if (fs) fs.addEventListener('click', toggleFs);

  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!isPlaying);
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleFs();
    } else if (e.code === 'KeyM') {
      audioEngine.toggleMute();
      updateAudioHUD();
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      const d = (e.shiftKey ? 2 : 0.5) * (e.code === 'ArrowRight' ? 1 : -1);
      seekTo(currentT + d);
    }
  });
}

export { tickX, envelope };
