# Reference scenes (reading material — they do not run here)

Four era scenes copied unchanged from the finished reference film 《乘風騎行》
(`wind-history-ride`). They show the quality bar: a historically accurate machine, an
unmistakable period medium, three depth layers, a story beat on bar 3, the rider re-styled
into the medium, everything static baked once, < 12 ms per frame.

| file | medium | worth studying |
|---|---|---|
| `gedser.js` | 1950s Danish modernist poster (flat inks, halftone, misregistration) | offset-print look, gull gag riding the rider's pole, flat rider re-style |
| `putnam.js` | 1940s black-and-white newsreel | film grain / gate weave / flicker, intertitle, band-limited look |
| `china.js` | silk-scroll ink painting with colour | brush textures, mounting, calligraphy inscriptions and seals |
| `california.js` | 1980s synthwave neon | glow without per-frame blur, scanlines, grid perspective |

They use the older signature `render(kit, slot, scene, params)` with fixed 8 s chapters.
Port with the mapping in `assets/template/SCENE_GUIDE.md` §7:
`slot.ctx` → `ctx`, `scene` → `p.chapter`, `params.*` → `p.*`, `scene.zh/en` → `title/titleAlt`,
`scene.pinwheel` → `p.prop`, `kit.riderVisible(params)` → `p.actor.visible`,
`kit.riderRig(params, o)` → `p.actor.rig(o)`, literal `8` / `2` seconds → `p.chapterSec` / `p.beat.barSec`.

To run one unchanged (gallery-ride, pixel-identical to the reference), copy it into
`src/scenes/` and register it through the adapter: `gedser: legacy(gedser)` with
`import { legacy } from './legacy.js'`. Legacy scenes assume 8 s chapters at 120 BPM.
