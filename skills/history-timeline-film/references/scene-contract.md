# Scene contract (condensed) + per-scene checklist

The full guide ships inside every project as `SCENE_GUIDE.md` (from `assets/template/`). This
page is the short version plus the checklist and quality bar that apply to every scene.

## Contents
1. The module
2. The `p` object
3. Canvas per stage
4. Writing one scene for both stages
5. Hard rules
6. Quality bar
7. Per-scene checklist
8. Technique cookbook
9. Porting the reference scenes

## 1. The module

```js
// src/scenes/<id>.js
export const meta = { stages: ['gallery-ride', 'easel'] };  // stages this scene supports (optional)
export function render(kit, ctx, p) { /* paint one chapter into ctx (p.W x p.H, cleared) */ }
```

- `node tools/new-scene.mjs <id> --look <look>` writes a skeleton and registers it in `src/scenes/index.js`.
  `new_film.mjs` already did this for every chapter, with the **look** of its medium
  (`engraving poster blueprint newsreel screen pixel ink fresco`; §4). `--look plain` gives the bare
  design-square skeleton, `--wide` a bare native easel valley (1920x1080).
- A look skeleton already reads as its medium on both stages. Your job is the blocks marked
  `// REPLACE:` (the subject and the bar-3 beat) plus the setting in `paintBackground()`.
  check_film fails while a `// REPLACE:` comment or a `<fill in` header remains.
- A chapter uses `chapter.scene || chapter.id`. Several chapters may share one module.
- If a module is missing, throws, or its `meta.stages` leaves out the active stage, the placeholder renders and the problem is logged once. `check_film` fails on that log.
- Only edit your own `src/scenes/<id>.js`. Never touch stages, characters, kit or audio from a scene task.

## 2. The `p` object

| field | use |
|---|---|
| `p.rawLocalT` | **animate with this**: seconds since the chapter's downbeat, unclamped (negative while sliding in) |
| `p.localT`, `p.u` | clamped time, and 0..1 progress |
| `p.chapterSec`, `p.beat.barSec`, `p.beat.beatSec` | lengths. **Never hard-code 8 s or 2 s**: BPM and bars are configurable |
| `p.beat.pulse(len)` | 1 → 0 decay after each beat (good for pulsing lights, nods) |
| `p.isThumbnail` | draw a calm representative frame (outro axis, gallery, easel board miniature) |
| `p.chapter` | the record from `chapters.js` (`title`, `dateLabel`, `palette`, `style` …) |
| `p.palette` | `chapter.palette` (5 colours) |
| `p.prop` | `{type, colors}` the character carries; draw it with `kit.drawProp(ctx, hub, angle, {...p.prop})` |
| `p.stage` | `'gallery-ride'` or `'easel'` |
| `p.W`, `p.H` | canvas size |
| `p.actor` | gallery-ride: the rider API (`visible`, `rig(opts)`, `draw(ctx, rig, style)`); easel: `null` |
| `p.layout` / `kit.layout(p)` | maps a 1000x1000 design square onto the stage canvas (`{x, y, s, x0, x1, y0, y1}`) |
| gallery-ride extras | `groundY` 700, `riderLocalX`, `pedalAngle`, `speedScale`, `pinwheelAngle` |
| easel extras | `safe {x:760,y:110,w:1000,h:830}` (clear of the paper fade), `horizonY` 430, `groundY` 720, `cover` polygon |

## 3. Canvas per stage

**gallery-ride**: 1000x1000, a framed panel on a museum wall.
- The road is at y = 700 with zero slope at x = 0 and x = 1000, so panels join there.
  Use `kit.sampleRoad(x, arch)` for an arched road and pass the same `arch` to `p.actor.rig({arch})`.
- The outer 26 px are under the frame. The placard below already prints the number, date, title and caption, so do **not** draw modern title cards. Inscriptions that belong to the medium are welcome.
- The rider crosses the panel during the chapter (`riderLocalX` 0 → 1000). It is about 230 px tall including the prop (top near y 470), so it sweeps the whole band y 470–700. Keep text and small key details above y ≈ 450 or to one side; a big subject can stand behind the rider as long as it still reads.
- Do not leave the band below the road (y 700–1000) as one flat colour: texture it in the medium (hatching, dots, water, paving, a printed border). The look skeletons already do.
- The panel is visible from `rawLocalT ≈ −chapterSec` to `+2·chapterSec`.

**easel**: 1920x1080 valley behind a hilltop painter.
- The stage covers:
  - the lower left (hill, easel and painter: everything left of x ≈ 640 below y ≈ 300);
  - the top ~70 px (ruler);
  - ragged paper fades on the edges.
- Keep the subject in `p.safe`. The horizon is near y 430, and figures on the valley floor stand around y 720.
- The board on the easel already shows the date and title, and a miniature cut from a calm mid-chapter frame. Set `chapter.easel.crop` to choose that cut.
- Chapters change with a one-beat paper-wash wipe on the bar line.
- Check coverage: `node tools/shot.mjs panel <id> 4 out/<id>_e --stage easel --guides`.

## 4. Writing one scene for both stages

- **Look skeleton (default):** draws on `p.W x p.H` directly. The subject goes in the focus box
  `F` (`p.safe` on easel; `{x:80,y:80,w:840,h:600}` above the road on gallery-ride) and stands on
  `p.groundY`; `geom(p, F)` gives a placeholder tower + wheel you replace. Backgrounds are baked
  per stage size automatically (the bake key gets `@WxH`).
- **Square design (`--look plain`):** draw in 1000x1000 design units.
  - `const L = kit.layout(p); ctx.translate(L.x, L.y); ctx.scale(L.s, L.s);`
  - Fill the margins with `ctx.drawImage(kit.wideBackdrop('<id>_bg_v1', bg, p, {mode}), 0, 0)` before translating. Modes:
    - `'mirror'`: textures, reliefs, registers;
    - `'edge'`: horizontal bands continue;
    - `{mode:'edge', fill:'corner'}`: plain paper margins.
  - Use `L.x0..L.x1` to extend crowds or flocks across the whole valley.
  - Guard stage-only fields: `p.actor && p.actor.visible`, `p.riderLocalX ?? -1e4`.
- **Native wide (`--wide`):** set `meta.stages: ['easel']` and draw on `p.W x p.H` directly.
  This suits landscapes: a city across decades, a process along a valley, a coastline.
  Branch on `p.stage` if one module must serve both stages.

## 5. Hard rules

1. **Deterministic.** No `Math.random`, `Date` or `performance.now`. Use these instead:
   - `kit.makePRNG(seed)` for a seeded stream (seed from `kit.hashSeed('<id>')`);
   - `kit.hash11(n)` and `kit.hash21(x,y)` for per-item stable values;
   - `kit.noise1/noise2/fbm2` for smooth motion.

   A PRNG must be created at bake time, or recreated with a fixed seed each frame. Never keep advancing one across frames.
2. **< 12 ms per scene frame.** Bake everything static once: `kit.bake('<id>_name_v1', w, h, (g, rng, w, h) => …)`, then `drawImage` it.
   - No per-frame `getImageData`, `ctx.filter`, `shadowBlur` on many shapes, or pixel loops.
   - `kit.addGrain` / `kit.addBlotches` / `kit.vignette` are for bake time only.
3. **No external assets.** No images, fetch or base64 blobs. Canvas 2D and fonts from `kit.FONT` only.
4. **Text** is in the film language, Traditional Chinese (Taiwan usage) by default.
   - Latin display faces (`blackletter`, `poster`, `pixel`, `engraving` …) are for Latin text only.
   - No real brand logos or trademarks. Use generic period wording.
5. **Leave ctx clean.** Wrap the scene in `save/restore` and reset `globalAlpha` and `globalCompositeOperation`.
   **Never call `setTransform`/`resetTransform`**: ctx may arrive transformed (gallery thumbnails, easel push-in).
6. **Accuracy.** Machines, tools, costumes and buildings follow the fact sheet's "Visual facts". If unsure, simplify rather than invent detail.
7. **Thumbnails are a fixed frame.** With `p.isThumbnail`, draw a calm state that does not depend on `rawLocalT`, `p.beat.pulse()` or any other time value (the skeletons set `T = chapterSec/2`).
8. **Negative time.** `rawLocalT` is negative while a panel slides in, and JS `%` keeps the sign: loop with `((x % n) + n) % n`, and never pass a negative radius to `arc`.
9. **Full-frame blits** must be unscaled and at whole-pixel offsets (~0.7 ms); a scaled or sub-pixel 1920x1080 `drawImage` costs ~6 ms. `kit.gateWeave` already returns whole pixels.
10. **Glyphs.** Any scene text works: `tools/glyphs.mjs` (run by every tool) preloads every non-ASCII character in `src/`, so fonts never load lazily mid-film. Only text assembled at runtime from outside `src/` needs `FILM.extraGlyphs`.

## 6. Quality bar (what "done" looks like)

- **One big, accurate, animated main subject.** It is readable at thumbnail size, and something on it moves on every frame (rotor, wheel, smoke, waves, hands).
- **Three depth layers:** back (sky, wall, paper), mid (subject and setting) and fore (framing elements, foreground plants or people). Each moves at its own rate.
- **The medium is unmistakable at a glance** (see `art-media.md`): its line quality, palette, texture and layout conventions. Museum quality, not clip-art.
- **One story beat timed to the music,** usually in bar 3: `T` in `[2·barSec, 3·barSec]`. Examples: a gull lands, a flag drops, a stamp hits, a light switches on. Ease it with `kit.envelope(T, a, b, c, d)` and land accents with `p.beat.pulse(0.5)`.
- **Alive before and after:** the `before` and `after` frames in check_film's strips must not look frozen or empty.
- **Gallery-ride: the rider is re-styled into the medium.** For example: `silhouette` for shadow puppets, `wire` for blueprints or engravings, flat colours for posters, recoloured props.
- **The thumbnail** (`isThumbnail`) shows the subject clearly, with no mid-transition states.

## 7. Per-scene checklist (copy into your notes for each scene)

- [ ] Header comment filled in: medium, subject, story beat.
- [ ] `meta.stages` matches the film's stage (both, if it should survive a staging switch).
- [ ] Background and static layers are baked, with a key that ends in `_v1` (bump the version when the bake changes).
- [ ] Animation uses `p.rawLocalT` and `p.beat.*`. No literal seconds.
- [ ] Story beat in bar 3, visible in the `mid`–`end` frames.
- [ ] The subject matches the fact sheet's visual facts. No brands.
- [ ] Text is in the film language. Simplified characters fail check_film.
- [ ] `node tools/shot.mjs panel <id> 0.5,4,7.5 out/<id> --timing` prints no console errors and < 12 ms.
- [ ] `--thumb` frame looks calm. On easel: `--guides` shows the subject inside `p.safe`.
- [ ] Looked at the PNGs (actually open them).

## 8. Technique cookbook

The medium helpers in `src/kit/media.js` do the hard part (full table: SCENE_GUIDE.md "Medium helpers").

| effect | how (cheap) |
|---|---|
| paper / plaster / parchment | `g.drawImage(kit.paper(id, w, h, {color, grain, blotches, foxing}), 0, 0)` inside your background bake |
| glow (neon, screens, lamps) | `kit.glow(ctx, x, y, r, color, a)`; never per-frame `shadowBlur` |
| halftone / print dots | `kit.halftoneShade(g, …, {tone})` at bake time; `ctx.fillStyle = kit.dots(ctx, {cell, r, color})` for flat screens; `kit.misregister(ctx, draw, {colors})` for off-register inks |
| film grain / flicker / gate weave | `const wv = kit.gateWeave(T)`; translate the picture by it; then `kit.filmLook(ctx, p.W, p.H, T)` last |
| CRT / terminal / HUD | draw strokes + `kit.glow`, then `kit.crt(ctx, p.W, p.H, T, {tint})` last |
| ink wash / watercolour | `kit.wash(g, x, y, w, h, color, {shape: 'ridge'})` for ranges, default blots for bodies; `kit.inkLine` for brush outlines; reveal with a clip path that grows over time |
| engraving hatching | clip to the shape, `kit.hatch(ctx, {spacing, angle, cross})` (denser = darker); rebuild the path before stroking the outline |
| relief / clay / coin | `kit.emboss(ctx, pathFn, {fill, depth})` |
| pixel art | `kit.pixelate(ctx, key, p.W, p.H, 6, g => …)`; quantise time with `kit.quantizeTime(T, 8)` |
| wireframe / HUD | strokes only, `lineWidth` 1–2, accent colour, scrolling tick labels in `kit.FONT.mono` |
| crowds / flocks | positions from `kit.hash11(i)`, phase from `T`, loop with modulo over `L.x0..L.x1` |
| camera-like push | `ctx.translate/scale` by `1 + 0.03*kit.smoothstep(0, p.chapterSec, T)` |

## 9. Porting the reference scenes

`references/examples/` holds four scenes from the finished wind film:
- `gedser`: modernist poster;
- `putnam`: newsreel;
- `china`: silk ink painting;
- `california`: synthwave.

They are the best reading for the quality bar. They use the old signature `render(kit, slot, scene, params)`. To port one:
- Replace `slot.ctx` with `ctx`, `scene` with `p.chapter`, `params.*` with `p.*`, and `scene.pinwheel` with `p.prop`.
- Replace `kit.riderVisible(params)` with `p.actor.visible`, and `kit.riderRig(params, o)` with `p.actor.rig(o)`.
- Replace `8` / `2` with `p.chapterSec` / `p.beat.barSec`.

Or wrap one unchanged with `legacy(mod)` from `src/scenes/legacy.js`. This works on gallery-ride only, and the scene assumes 8 s chapters at 120 BPM.
