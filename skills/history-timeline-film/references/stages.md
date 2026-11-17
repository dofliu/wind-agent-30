# Stages: how the film is staged

A **stage** owns the whole 1920x1080 frame. It handles:
- the layout and camera;
- where the character is;
- how chapters hand over to each other;
- the time ruler, the intro hand-off and the outro.

Scenes only paint the chapter canvas the stage gives them. The stage is picked with
`FILM.staging = '<stage>+<character>'` in `src/data/film.config.js`. To try another stage without
editing anything, use `index.html?staging=easel+person`, or pass `--staging easel+person` to any tool.

| | gallery-ride | easel |
|---|---|---|
| one-liner | a character rides left → right along one road through framed chapter panels on a museum wall | a painter on a hilltop paints each chapter on an easel; the valley below is the chapter |
| scene canvas | 1000 x 1000 (square panel) | 1920 x 1080 (full-bleed valley) |
| character action | `cycle` | `paint` |
| chapter text | museum placard under each frame (number, date, title, caption) | painted on the board: date, title, miniature, signature + seal |
| transition | continuous camera dolly; the rider crosses frame edges | one-beat paper-wash wipe on the bar line, painter sweeps the board |
| intro | title card over wind streamlines, then the rider enters | camera close on the board while the title is painted, quote lettered across the sky, pull back over a pencil-sketch valley |
| outro | time axis with every chapter thumbnail, the rider rides it, headline + closing + credits | painter steps back, strings fan from the easel with every painting pinned on, then headline + closing + credits |
| best for | history across many periods and media; a "journey" feel; museum or teaching tone | reflective storytelling, a single place changing over time, "how it looks through the years", a calmer tone |
| scene cost | the scene draws the rider itself (it can restyle it) | the stage draws the painter; `p.actor = null` |

## gallery-ride (1000x1000 panel)

- The road is at **y = 700 with zero slope at x = 0 and x = 1000**. Use `kit.sampleRoad(x, arch)` for an arched road.
- The frame covers the outer 26 px.
- The frame style comes from `chapter.frame.family`: `gilt | wood | stone | mount | tile | paper | poster | film | screen | steel`, plus `color` and `accent`.
- The placard below prints the number, date, title and caption, so draw no title cards in the scene.
- The rider is drawn **by the scene**: `if (p.actor && p.actor.visible) p.actor.draw(ctx, p.actor.rig({arch}), STYLE)`.
  - Its centre is at `p.riderLocalX`. It is about 230 px tall including the prop on its pole.
- The panel is on screen from `rawLocalT ≈ −chapterSec` to `≈ +2·chapterSec`.
- Below the road (y 700–1000) is foreground or margin. Use it for water, reeds, pavement, a printed border.

## easel (1920x1080 valley)

- The stage covers:
  - the hill, painter and easel in the lower left (`p.cover`): everything left of x ≈ 640 below y ≈ 300, and the hill crest falling from y ≈ 760 at x 600 to the bottom edge at x ≈ 1110;
  - the top ~70 px (ruler and paper haze);
  - a ragged 60–160 px paper fade on the other edges.
- The **safe area** for the subject is `p.safe = {x:760, y:70, w:1100, h:890}`. The horizon is near `p.horizonY = 430`, and the valley floor is near `p.groundY = 720`.
- `p.layout = {x:840, y:50, s:0.9, x0, x1, y0, y1}` maps a 1000-unit design square into the safe area. `x0..x1` and `y0..y1` give the whole canvas in design units.
- **Board miniature:** the stage cuts it from a calm mid-chapter still, using a wide band through the layout box. Override it per chapter with `chapter.easel = {crop:[x,y,w,h], ink, dateInk, seal}`, where the crop aspect is about 2.9 : 1.
- **Wipe:** the incoming scene is rendered from `rawLocalT ≈ −0.25 s`, so animate with `rawLocalT`.
- `PUSH` in `src/stages/easel.js` turns on a slow push-in on the valley. It costs about 5 ms per frame, so it is off by default.
- Painter options come from `FILM.character` (`colors`, `hat`). See `characters.md`.
- Check coverage: `node tools/shot.mjs panel <id> 4 out/<id>_e --stage easel --guides`.
- A square scene works on easel through `kit.layout` + `kit.wideBackdrop`. Native wide scenes (`new-scene.mjs <id> --wide`) look better for landscapes.

## Choosing a stage (default rules)

- The user's words mention a painter, sketching, watercolour, an easel, a hilltop or a valley → **easel** (character `person` unless they name another).
- The user mentions riding, a journey, a museum, a gallery, or "like 乘風騎行" → **gallery-ride**.
- Otherwise use gallery-ride for many periods or media (≥ 10 chapters) and easel for one place over time or a reflective tone. Tell the user which one you picked; switching later is one line, as long as the scenes support both stages (square scenes do).

## Adding a stage

1. Copy `src/stages/easel.js` (with its helpers in `src/stages/easel/`) or `gallery-ride.js` to `src/stages/<id>.js`.
2. Implement the default export:
   ```
   { id, label, labelAlt, action, scene: {W, H, groundY, edge}, view: {W: 1920, H: 1080},
     init({kit, character, renderChapter}),
     renderFrame(ctx, t) -> beatState,            // PURE function of t
     chapterParams(chapter, t, opts) -> p,        // baseParams(...) from stages/common.js + extras
     renderStill(ctx, chapter, localT, opts) -> p,
     thumbnail(chapter) -> canvas,
     card?(chapter) -> canvas }                   // optional
   ```
3. Document the scene canvas in the file header: size, covered regions, safe area, extra `p` fields.
4. Register it in `src/stages/index.js` (`STAGES`). Add its action to `STAGE_ACTIONS` in `tools/validate.mjs` and to the `CHARACTER_CYCLES` rule in `src/data/staging.js` if the character cycles.
5. Make sure the characters you need have the stage's action (`characters.md`).
6. Run `check_film.mjs --all-stagings` and look at every image.

Ideas for later stages:
- **train-window:** chapters pass outside a carriage window, with the character seated.
- **stage-play:** a proscenium where the curtains open on each chapter.
- **book:** pages turn, and each spread is a chapter.
- **map-walk:** the character walks a route on an unrolling map.

Each needs a new action (`sit`, `bow`, `walk`) in the character interface.
