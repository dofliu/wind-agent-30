# Characters

The character is the film's guide. It rides through the gallery (`cycle`) or paints at the easel
(`paint`). Select it with `FILM.staging = '<stage>+<character>'`. Style it with `FILM.character.colors`
and `FILM.character.hat`. Scenes re-style it per chapter on gallery-ride.

| id | label | actions | notes |
|---|---|---|---|
| `spoonbill` | 黑面琵鷺 Black-faced spoonbill | `cycle`, `paint` | the reference film's bird. Paints with the brush in its bill (no palette; loads colour from the jar). Analytic 2-bone IK pedalling |
| `person` | stylised human (no real likeness) | `cycle`, `paint`, `stand` | profile on the bicycle, rear 3/4 view at the easel. Breathing, hair, scarf and coat hem move in the wind (seeded) |

If the stage needs an action the character lacks, the stage substitutes `person` and logs a
warning, and `check_film` fails on that warning. Pick a character that has the action.

## person style keys (`FILM.character.colors` + `FILM.character.hat`)

- Body: `skin, skinShade, hair, top, topShade, trousers, shoes`.
- `hairStyle`: `'bob' | 'short' | 'bun' | 'ponytail'`.
- `hat`: `'beret' | 'straw' | 'cap' | 'none'`, with `hatColor` and `hatBand`.
- `scarf` (true/false), with `scarfColor` and `scarfStripe`.
- Painting kit: `paletteWood, brushHandle, brushPaint, paints[5]`.
- Bicycle: `frame, frameShade, metal, tire, rim, saddle, spokes`.
- Rendering: `outline, outlineWidth, lineScale, silhouette, wire, showProp, prop`.

Example: a painter in a straw hat with a green smock.
```js
character: { colors: { top: '#5b7f4a', topShade: '#46663a', hairStyle: 'bun', scarf: false }, hat: 'straw' },
```

## spoonbill style keys

- Bird: `plumage, plumageShade, mask, bill, eyeRing, legs, crest, breast`.
- Bicycle: the same keys as for the person.
- Also `shading`, `spokes`, `outline*`, `silhouette`, `wire`, `prop`, `showProp`.

## Re-styling inside a scene (gallery-ride)

```js
if (p.actor && p.actor.visible) p.actor.draw(ctx, p.actor.rig({ arch }), {
  silhouette: '#1b1a18',            // shadow puppet / relief / newsreel
  // wire: '#e8f1ff',               // blueprint / engraving line art
  // plumage: '#f2ebdc', frame: '#c8102e', outline: '#1d3557', outlineWidth: 2,   // poster flats
  prop: { type: p.prop.type, colors: ['#c8102e', '#1d3557'] },
});
```
For bespoke looks, draw from the rig points (`rig.rearWheel`, `rig.frontWheel`, `rig.bb`,
`rig.body`, `rig.head`, `rig.propHub` …). Another option is to draw the default into an offscreen canvas and
post-process that small canvas (pixelate, posterise).

**Props** (`chapter.prop.type`) are drawn at `rig.propHub` by `kit.drawProp`. The available types:
- `paper`, `sail`, `panemone`, `chinese`, `post`, `multiblade`, `three`, `two`, `darrieus` (the 9 windmill rotors);
- `pennant`, `balloon`, `lantern`, `none`.

For non-wind topics prefer `pennant`, `balloon`, `lantern` or `none`. Add new prop types to `EXTRA_PROPS` in `src/kit/props.js`.

## Adding a character

1. Create `src/characters/<id>.js`. Copy `person.js`, which is the most general.
2. Default export:
   ```
   { id, label, labelAlt, actions: ['cycle', 'paint', ...], size: {w, h}, defaultStyle,
     holdsPalette?: true, easel?: { x, scale },
     computeRig(a) -> rig,     // PURE. a = {action, x, y, slope, scale, phase, speedScale, time,
                               //   worldX, propAngle, ...paint args: brush{x,y}, lift, look, nod,
                               //   walk{phase,amount}, wind, brushLen, brushPref}
                               // rig: root{x,y,scale,slope}, time, propHub{x,y,r} | null
     draw(ctx, rig, style),
     drawMarker(ctx, x, y, style) }   // ~30x16 px icon for the time-ruler marker
   ```
3. Register it in `src/characters/index.js`.
4. Select it with `staging: '<stage>+<id>'`.
5. Check it with `node tools/shot.mjs film <t> out/c --staging <stage>+<id>` at the intro, mid-chapter, a transition and the outro.

Rules:
- Deterministic: secondary motion comes from `noise1` and `hash11` of `time`, never from state.
- Stylised and original: no real people, no copyrighted characters, no mascots.
- At most about 1.5 ms per draw.
- A new action (e.g. `walk`, `sit`, `fly`, `row`) needs a stage that asks for it. Document the action's extra args in `src/characters/index.js`.

Character ideas that fit the interface:
- an owl scholar (paint, with the brush in its talon);
- a robot (cycle; `wire` style comes for free);
- a child with a kite (stand + prop);
- a cat painter.

Choose an animal that is local to the topic. The reference film used Taiwan's black-faced spoonbill.
