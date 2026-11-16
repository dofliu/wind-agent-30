// src/scenes/index.js
// Dispatches each era to its renderer module (falls back to the placeholder on error).

import { renderPlaceholderPanel } from './placeholder.js';
import * as nile from './nile.js';
import * as persia from './persia.js';
import * as postmill from './postmill.js';
import * as dutch from './dutch.js';
import * as quixote from './quixote.js';
import * as china from './china.js';
import * as smeaton from './smeaton.js';
import * as halladay from './halladay.js';
import * as brush from './brush.js';
import * as lacour from './lacour.js';
import * as betz from './betz.js';
import * as putnam from './putnam.js';
import * as gedser from './gedser.js';
import * as tvind from './tvind.js';
import * as california from './california.js';
import * as vindeby from './vindeby.js';
import * as hywind from './hywind.js';
import * as taiwan from './taiwan.js';
import * as giants from './giants.js';
import * as agent from './agent.js';

const SCENE_MODULES = {
  nile,
  persia,
  postmill,
  dutch,
  quixote,
  china,
  smeaton,
  halladay,
  brush,
  lacour,
  betz,
  putnam,
  gedser,
  tvind,
  california,
  vindeby,
  hywind,
  taiwan,
  giants,
  agent,
};

const errorOnce = new Set();

/**
 * Render one era panel into slot.ctx (1000x1000, already cleared).
 * params: { t, localT, rawLocalT, riderLocalX, riderWorldX, pedalAngle, speedScale,
 *           pinwheelAngle, isThumbnail }
 */
export function renderScenePanel(kit, slot, scene, params) {
  const mod = SCENE_MODULES[scene.id];
  const ctx = slot.ctx;
  ctx.save();
  try {
    if (mod && typeof mod.render === 'function') mod.render(kit, slot, scene, params);
    else renderPlaceholderPanel(kit, slot, scene, params);
  } catch (err) {
    if (!errorOnce.has(scene.id)) {
      errorOnce.add(scene.id);
      console.error(`[scene-error:${scene.id}]`, err);
    }
    ctx.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, kit.PANEL_SIZE, kit.PANEL_SIZE);
    renderPlaceholderPanel(kit, slot, scene, params);
  }
  ctx.restore();
}
