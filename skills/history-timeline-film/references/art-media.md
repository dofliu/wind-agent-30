# Art media menu

Every chapter is drawn in an art medium that belongs to its period or place. That medium is
the film's signature look: the viewer should name it at a glance. Pick one per chapter. Neighbours
should contrast, and you should not repeat a medium unless the story asks for it. `new_film.mjs` suggests one by year;
refine it here.

Each entry gives:
- **Tells:** what makes the medium unmistakable;
- **Canvas:** how to get it cheaply (bake the static layers; see scene-contract.md §8);
- **Frame / fonts / preset:** a good `chapter.frame.family`, `kit.FONT` face and music preset.

Effort: ● = simple with kit helpers (good for low-effort runs) · ●● = moderate · ●●● = rich, benefits from a dedicated subagent.

## Contents
Ancient · Medieval & early modern · 18th–19th c. · 20th c. · Digital & contemporary · East Asia & Taiwan · Neutral / process

## Ancient

1. **Egyptian tomb fresco / relief** ●
   - Tells: figures in profile with frontal eyes; registers (horizontal bands) with ground lines; flat ochre, red, blue-green and black; hieroglyph-like ornament; no perspective; flaking plaster.
   - Canvas: bake a plaster texture with blotches, draw flat fills with 2 px dark outlines, and keep animation small (oars, sails, water zigzags).
   - Frame `stone` · fonts serif · preset `ancient-harp`.
2. **Clay tablet & Sumerian relief** ●
   - Tells: impressed wedge marks, raised-relief figures lit from the upper left, one monochrome clay colour.
   - Canvas: emboss by drawing each shape twice (light offset −1,−1 and dark +1,+1) on clay grain. `wideBackdrop` mode `'mirror'`.
   - Frame `stone` · preset `ancient-harp`.
3. **Greek black-figure vase** ●●
   - Tells: black silhouettes on terracotta orange, incised lines showing the clay colour, meander (Greek key) border bands, a curved vessel edge.
   - Canvas: `silhouette:'#1b1410'` on the rider, meander bands baked, incisions as thin orange strokes.
   - Frame `stone` · preset `ancient-harp` (mode dorian sparingly).
4. **Roman mosaic** ●●
   - Tells: small square tesserae in rows that follow the contours, grout lines, a limited stone palette.
   - Canvas: bake a tessera grid by sampling a hidden drawing at a coarse step (bake time only).
   - Frame `stone` · preset `medieval-recorder` or `ancient-harp`.

## Medieval & early modern

5. **Illuminated manuscript** ●●
   - Tells: parchment, gold leaf with a burnished sheen, ultramarine and vermilion, a decorated initial, ruled text lines in a Gothic hand, vine borders, a flat gold or diaper background.
   - Canvas: patterned background baked, gold as a gradient with `noise` sparkle, text in `kit.FONT.blackletter` (Latin only).
   - Frame `gilt` · preset `medieval-recorder`.
6. **Persian / Mughal miniature** ●●●
   - Tells: a high viewpoint, flat jewel colours, patterned tiles and carpets, a gold sky or margin, small elegant figures, a calligraphy cartouche.
   - Frame `gilt` · preset `santur-dastgah`.
7. **Bayeux-style embroidery / tapestry** ●●
   - Tells: wool stitches on linen, laid-and-couched fills, limited dyes (madder, woad, weld), a running border with animals.
   - Canvas: stroke fills with short hatched "stitches" baked once.
   - Frame `wood` · preset `medieval-recorder`.
8. **Stained glass** ●●
   - Tells: lead cames (thick dark lines), saturated translucent colour with uneven density, light glowing through.
   - Canvas: fills with an `fbm2` alpha mottle, `lighter` glow sprites, thick black lines on top.
   - Frame `stone` · preset `medieval-recorder`.
9. **Woodcut (15th–16th c.)** ●
   - Tells: bold black line, parallel cuts for shading, white gouges, slightly uneven ink, optional hand-colouring in two or three washes.
   - Canvas: black on paper with `wobblyLine`, hatching clipped to shapes.
   - Frame `paper` · preset `baroque-harpsichord` or `flamenco-guitar`.
10. **Delftware tile** ●
    - Tells: cobalt blue on a white tin glaze, a grid of square tiles with corner motifs, brushy blue washes, crackle.
    - Canvas: bake a tile grid, `wideBackdrop` mode `'mirror'`.
    - Frame `tile` · preset `baroque-harpsichord`.
11. **Copperplate map / cartography** ●●
    - Tells: hatched coastlines, a compass rose, rhumb lines, cartouches, sea monsters, hand-coloured borders.
    - Frame `paper` · fonts engraving · preset `baroque-harpsichord`.

## 18th–19th century

12. **Copperplate scientific engraving** ●●
    - Tells: fine cross-hatching, an encyclopaedia-plate layout with lettered figures (Fig. 1, A, B), a plate mark, cream paper.
    - Canvas: `wire` style on the rider, hatch fills, engraving font for labels.
    - Frame `paper` · preset `string-quartet`.
13. **Wood engraving (Victorian popular science)** ●●
    - Tells: white-line tonal engraving, dense tonal areas, a dramatic sky, a caption under the picture.
    - Frame `paper` · preset `victorian-musicbox`.
14. **Patent drawing** ●
    - Tells: black line only, numbered leader lines, hatched cut sections, "Fig. 2", a border with a signature line.
    - Canvas: animate parts slowly and add numbers with leaders.
    - Frame `paper` · preset `victorian-musicbox`.
15. **Chromolithograph trade card** ●●
    - Tells: rich printed colour with a stipple texture, an ornate frame, period display type, a cheerful idealised scene. No real brand: invent a generic shop name.
    - Frame `wood` · fonts didone / garamond · preset `frontier-banjo`.
16. **Cyanotype / blueprint** ●
    - Tells:
      - cyanotype: Prussian blue ground, white lines, a cloudy uneven exposure;
      - blueprint: grid, dimension lines, a title block.
    - Canvas: `wire:'#e8f1ff'` rider, baked grid, dimension arrows.
    - Frame `steel` · fonts mono · preset `ragtime-piano` or `victorian-musicbox`.
17. **Golden-age oil painting** ●●●
    - Tells: luminous sky gradients, glazed shadows, visible brush texture, warm varnish.
    - Canvas: many baked translucent brush strokes; animate only light and small motion.
    - Frame `gilt` · preset `nordic-fiddle` or `string-quartet`.

## 20th century

18. **Art Nouveau / Art Deco poster** ●●
    - Tells:
      - Nouveau: whiplash curves, floral borders, muted gold and green;
      - Deco: geometric sunbursts, stepped forms, metallic gold on black, tall sans.
    - Frame `poster` · fonts poster / didone · preset `ragtime-piano`.
19. **Silent film / black-and-white newsreel** ●●
    - Tells: grain, flicker, gate weave, a vignette, scratches, an intertitle card, a 4:3 feel, slightly fast motion.
    - Canvas: baked grain frames, `noise` flicker (see `references/examples/putnam.js`).
    - Frame `film` · preset `newsreel-brass` (1930s–40s) or `ragtime-piano` (1910s–20s).
20. **WPA / public-works poster** ●
    - Tells: flat silkscreen colours, strong diagonals, heroic workers and machines, simple sans type. Keep wording generic.
    - Frame `poster` · preset `newsreel-brass`.
21. **Mid-century modernist poster** ●
    - Tells: flat inks, halftone dots, overprint and misregistration, big geometric shapes, Swiss-style grid, bold sans.
    - Canvas: see `references/examples/gedser.js`.
    - Frame `poster` · fonts poster · preset `cool-jazz-vibes`.
22. **Screen-printed protest / 1970s poster** ●
    - Tells: 2–4 flat spot colours, rough registration, a hand-cut stencil edge, a big slogan (generic), sun or fist motifs.
    - Frame `poster` · preset `seventies-analog`.
23. **Comic / ligne claire** ●●
    - Tells: uniform black outlines, flat colours, speech balloons, panel borders, Ben-Day dots.
    - Frame `paper` · preset `cool-jazz-vibes` or `seventies-analog`.
24. **Synthwave neon** ●●
    - Tells: a magenta–cyan gradient sky, a striped sun, a perspective grid scrolling to the horizon, glow, scanlines, chrome type.
    - Canvas: see `references/examples/california.js` (glow without blur).
    - Frame `screen` · fonts poster · preset `synthwave`.

## Digital & contemporary

25. **Pixel art (8/16-bit)** ●
    - Tells: a low-res grid, a limited palette, dithering, sprite animation on 2–4 frames, a HUD with a score-like counter (generic).
    - Canvas: draw at 1/6 size and upscale with smoothing off; `kit.quantizeTime(T, 8)`.
    - Frame `screen` · fonts pixel · preset `chiptune`.
26. **Early GUI / dot-matrix** ●
    - Tells: a monochrome or 4-colour screen, window chrome, a bitmap font, a blinking cursor; or a green-bar printout.
    - Frame `screen` · fonts terminal / mono · preset `chiptune`.
27. **Flat infographic** ●
    - Tells: flat icons, a clear data callout (numbers from the fact sheet), thin connector lines, generous white space, one accent colour.
    - Frame `poster` · fonts sans · preset `ambient-fm-bells`.
28. **Satellite map / GIS** ●●
    - Tells: a top-down terrain with false colour, contour lines, a scale bar, a north arrow, coordinate ticks.
    - Frame `screen` · preset `ambient-fm-bells`.
29. **Wireframe HUD / digital twin** ●●
    - Tells: stroke-only geometry, a dark ground, cyan or green lines, scrolling telemetry, brackets around targets, scan sweeps.
    - Canvas: `wire` rider; animate the scan line and numbers.
    - Frame `screen` · fonts mono · preset `electro-arps`.
30. **Isometric 3D / low-poly** ●●
    - Tells: a 30° isometric grid, flat-shaded faces (three tones per material), tiny people, soft shadows.
    - Frame `screen` · preset `fm-keys-electro`.

## East Asia & Taiwan

31. **Ink wash (水墨)** ●●
    - Tells: graded ink from dry brush to wet wash, empty space as mist, a calligraphy inscription and red seals, rice-paper fibres.
    - Canvas: baked wash blotches, `kit.FONT.kai` for the inscription (see `references/examples/china.js`).
    - Frame `mount` · preset `guzheng-pentatonic`.
32. **Gongbi / silk scroll in colour** ●●●
    - Tells: fine even outlines, mineral green and blue, aged silk, scroll mounting.
    - Frame `mount` · preset `guzheng-pentatonic`.
33. **Ukiyo-e woodblock** ●●
    - Tells: bold contour keyblock, flat colour blocks with bokashi gradients (sky), Prussian blue, wave curls, a cartouche, wood grain in flats.
    - Frame `mount` or `paper` · preset `guzheng-pentatonic`.
34. **Taiwanese floral fabric (客家花布) + temple painting** ●●
    - Tells: big peonies on red or green, bold outlines, gold trim, door-god–style borders, auspicious clouds.
    - Frame `wood` · preset `temple-yueqin`.
35. **Paper-cut (剪紙) / shadow puppet (皮影)** ●
    - Tells: one red sheet with cut-out lace patterns; or translucent coloured leather silhouettes with joints on a lit screen.
    - Canvas: `silhouette` rider, `evenodd` fills for the cut-outs.
    - Frame `paper` · preset `temple-yueqin` or `guzheng-pentatonic`.

## Neutral / process topics (any period)

36. **Watercolour sketch** ●
    - Tells: wet edges, granulation, unpainted paper highlights, a pencil underdrawing. This is the natural partner of the easel stage.
    - Preset: any calm one.
37. **Technical cutaway / exploded view** ●●
    - Tells: a sectioned object with hatched cuts, parts sliding apart on the story beat, numbered callouts. Good for "how it works" chapters.
    - Frame `steel`.
38. **Chalkboard / classroom diagram** ●
    - Tells: a chalk texture on dark green, hand-drawn arrows, smudges, a formula written step by step.
    - Frame `wood`.

## Picking media for a film (default rules)

- **Historical chapters:** use the medium of the chapter's own period and place. This is the reference film's rule, and it is what makes the film memorable.
- **Process or project timelines:** pick a family and vary it. For example, blueprint → patent drawing → cutaway → infographic → HUD, or a set of print techniques.
- **Contrast neighbours** in value (light vs dark ground) and colour temperature.
- **Low-effort runs:** prefer ● media. For ●●● media, do a simplified version first and upgrade the scene later if there is time.
- **Easel stage:** the valley is "painted", but each chapter still keeps its own medium. The board shows a watercolour miniature of it.
