# Scene Author Guide — 《乘風騎行》

Each of the 20 eras is one ES module in `src/scenes/<id>.js` that paints a
1000×1000 panel. The engine composites panels side by side on a museum wall, a
black-faced spoonbill (黑面琵鷺) rides a bicycle along one continuous road
through all of them, and the camera dollies along. This guide is the contract.

## 1. The contract

```js
// src/scenes/<id>.js
export function render(kit, slot, scene, params) {
  const { ctx } = slot;           // CanvasRenderingContext2D, 1000x1000, already cleared
  const { t, localT, rawLocalT, riderLocalX, pedalAngle, speedScale,
          pinwheelAngle, isThumbnail } = params;
  ...
}
```

| param | meaning |
|---|---|
| `t` | global film time (s), 0–178 |
| `localT` | time inside this era, clamped to 0–8 s (4 bars @ 120 BPM, 1 bar = 2 s, 1 beat = 0.5 s) |
| `rawLocalT` | unclamped (negative while the panel is visible before its era starts, > 8 after) — the panel is on screen from rawLocalT ≈ −8 to ≈ +16 |
| `riderLocalX` | rider bicycle centre x in panel px (0 → 1000 during the era; outside that range the rider is in a neighbouring panel) |
| `pedalAngle`, `speedScale`, `pinwheelAngle` | pass through to the rig |
| `isThumbnail` | render a calm, representative frame (used once for the outro time-axis) |

* `scene` is the era record from `src/data/eras.js` (`palette`, `pinwheel`, `style`, `frame` …).
* Animate with `rawLocalT` / `t` so the panel is alive while it slides in and out
  (`localT` freezes outside 0–8).
* The panel is visible ~24 s in total, fully on screen during its own 8 s.

## 2. Hard rules

1. **Deterministic.** Never use `Math.random`, `Date`, `performance.now`. Use
   `kit.makePRNG(seed)`, `kit.hash11`, `kit.noise1/noise2/fbm2`. Same inputs → same pixels.
2. **The road.** The rider's road must be at **y = 700 with zero slope at x = 0 and
   x = 1000** (`kit.sampleRoad(x, arch)` gives a valid arched road; pass the same
   `arch` to `kit.riderRig(params, { arch })`). Adjacent panels join there, and the
   rider crosses frame boundaries.
3. **Draw the rider** whenever `kit.riderVisible(params)` is true (the canvas clips
   whatever is outside). Default: `const rig = kit.riderRig(params, { arch }); kit.drawRider(ctx, rig, style)`.
   Re-style it into the panel's medium (see §4). It must stay readable as a
   white spoonbill with a black face mask and spoon-tipped black bill, riding a
   bicycle, with the era's mini-rotor (`scene.pinwheel`) on the rear pole.
4. **Performance budget: < 12 ms per panel frame** (check with `--timing`). Bake
   everything static once with `kit.bake('<id>_name', w, h, (g, rng, w, h) => {...})`
   and `ctx.drawImage` it each frame. Only animate what moves. No per-frame
   `getImageData`, no per-frame `ctx.filter` blur, no huge per-pixel loops outside bake.
5. **No external assets** (no images, no fetch). Everything is drawn with Canvas 2D.
6. **Text:** the engine already prints the era number / date / title / caption on a
   museum placard below the frame. Do **not** add a modern UI title card. Era-native
   inscriptions are welcome (cartouche, manuscript rubric, figure labels on an
   engraving plate, patent title block, newsreel intertitle, poster headline,
   HMI labels …). Chinese text must be **Traditional Chinese (Taiwan usage)**. Avoid
   real brand logos / company trademarks; generic period wording only.
7. **Edges.** The outer 26 px of each side are covered by the frame. Keep the
   panel's key subject away from the frame; the road must run edge to edge.
8. **Leave ctx clean**: wrap your drawing in `ctx.save()/ctx.restore()`; reset
   `globalAlpha`/`globalCompositeOperation` you changed.

## 3. Composition

* Rider: bicycle centre at `riderLocalX`, wheels on the road (y ≈ 700), figure ~230 px
  tall incl. the pole-mounted rotor (top ≈ y 470). Everything below the road
  (y 700–1000) is foreground ground / water / margin of the artwork.
* Put the era's machine where it reads clearly: big, accurate, animated (rotors
  turning at a plausible rate, sails billowing, pumps stroking). The rider passes
  in front of / below it — plan that overlap.
* Give each panel 3 depth layers (back / mid / fore) and one **gag / story beat**
  timed to the music (e.g. something happens on bar 3, localT 4–6 s).
* Every visual detail of the machine must be **historically accurate** (follow the
  brief: axis orientation, number and kind of sails/blades, tower type, upwind vs
  downwind, materials).
* Make the medium unmistakable at a glance (texture, line quality, palette,
  composition conventions of that art form). Museum quality, not clip-art.

## 4. Re-styling the rider

`kit.drawRider(ctx, rig, style)` options (all optional):

```js
{
  plumage, plumageShade, mask, bill, eyeRing, legs, crest, breast,   // bird colours
  frame, frameShade, metal, tire, rim, saddle,                       // bicycle colours
  outline: '#1b1a18', outlineWidth: 1.5, lineScale: 1,
  silhouette: null,   // e.g. '#111' -> flat shadow-puppet / film-noir silhouette
  wire: null,         // e.g. '#e8f1ff' -> line art only (blueprint, engraving)
  shading: true, spokes: 12,
  pinwheel: { type, colors, ...},  // usually scene.pinwheel
  showPinwheel: true, showRider: true, showBike: true,
}
```

For a fully bespoke look (e.g. hatching, pixel art, halftone) draw your own rider
from the rig points (`rig.rearWheel`, `rig.frontWheel`, `rig.bb`, `rig.nearPedal`,
`rig.body {x,y,rx,ry,tilt}`, `rig.head`, `rig.billBase`, `rig.billTip`, `rig.eye`,
`rig.neckBase/neckC1/neckC2`, `rig.crestRoot/crestTip1/crestTip2`, `rig.wingShoulder/
wingElbow/wingHand`, `rig.nearHip/nearKnee/nearFoot`, `rig.farHip/farKnee/farFoot`,
`rig.poleBase/poleTop/pinHub {x,y,r}`, `rig.pinwheelAngle`, `rig.wheelAngle` …), or
draw the default into an offscreen canvas and post-process it (e.g. quantise to
pixels). `kit.drawPinwheel(ctx, hub, angle, {type, colors, wire, silhouette})`
draws a mini-rotor of any type: `paper | sail | panemone | chinese | post |
multiblade | three | two | darrieus`.

## 5. Kit helpers

`kit.bake`, `kit.sampleRoad`, `kit.riderRig`, `kit.riderVisible`, `kit.drawRider`,
`kit.drawPinwheel`, `kit.makePRNG`, `kit.hashSeed`, `kit.hash11`, `kit.hash21`,
`kit.noise1`, `kit.noise2`, `kit.fbm2`, `kit.clamp`, `kit.lerp`, `kit.smoothstep`,
`kit.smootherstep`, `kit.envelope(x,e0,e1,e2,e3)`, `kit.quantizeTime(t,hz)`,
`kit.createCanvas`, `kit.rgba(hex,a)`, `kit.mixColor(a,b,t)`, `kit.sampleCubic`,
`kit.wobblyLine`, `kit.addGrain` / `kit.addBlotches` / `kit.vignette` (bake-time
textures), `kit.wrapText`, `kit.FONT.{serif,sans,kai,mono,blackletter,engraving,
garamond,didone,poster,pixel,terminal}`.

## 6. Checking your work

```bash
node tools/shot.mjs panel <id> 0,2,4,6,7.9 out/<id> --timing   # panel stills + perf
node tools/shot.mjs panel <id> 4 out/<id>_thumb --thumb --x 500  # outro thumbnail
node tools/shot.mjs film <t0-0.4>,<t0+4>,<t1-0.2> out/<id>_film   # in context, incl. frame crossings
```

`t0 = 6 + 8 × (num − 1)`. Look at the PNGs (they are deterministic). The command
prints browser console errors — there must be none.
