# QA checklist

Everything automatable is run by one command from the project directory:

```bash
node <skill>/scripts/check_film.mjs . --draft          # while authoring (content gaps = WARN)
node <skill>/scripts/check_film.mjs . --quick --only <id>   # one scene, fast (no audio)
node <skill>/scripts/check_film.mjs .                  # before delivery: every gate must PASS
node <skill>/scripts/check_film.mjs . --build --mp4    # final: also the single-file build + an MP4 clip
node <skill>/scripts/check_film.mjs . --all-stagings   # if the film should work in every staging
```

The command exits 1 if any gate fails, prints a markdown table, and lists the images to look at
(in `out/qa/<staging>/`). It also writes `out/qa/check.json`.

## Automated gates

| gate | passes when | typical fix |
|---|---|---|
| validate | config and chapters well formed, scenes registered, presets exist, no `Math.random/Date` in scenes | follow the message, re-run `node tools/validate.mjs` |
| presets | every music preset renders notes | only fails if `src/audio/presets.js` was edited |
| content | no `TODO`, description ≥ 40 chars, ≥ 2 facts, a real source URL, a style per chapter | fill in from the fact sheet |
| zh-Hant | no simplified characters (FAIL); mainland terms and ASCII punctuation in CJK (WARN) | replace characters and terms (content-research.md §6) |
| facts | `research/fact-sheet.md` has a section per chapter with a URL and "Do not claim"; strong-claim words listed (WARN) unless that section has a `- **Strong words justified:** …` line naming them | re-check each claim against its source, hedge it, then add the justified line |
| scenes | every chapter has its own module, no `// REPLACE:` placeholder or `<fill in` header left, and `meta.stages` includes the stage | write the subject and beat |
| render | each chapter renders at before / start / mid / end / after plus a thumbnail, and none is blank; the strip also shows the chapter `in film` (composited by the stage) and, on easel, the finished `board / card` | check the strip image `scene_NN_<id>.jpg` |
| perf | each scene < 12 ms per frame, GPU-synced (one pixel read back per frame, so the number is the real drawing cost) (`--budget` to change) | bake static layers; blit full-frame layers unscaled at whole pixels; remove per-frame blur, `getImageData` and big loops |
| console | sweeping the whole film every 0.5 s logs no console errors or warnings | the message names the scene (`[scene-error:<id>]`) |
| determinism | same t gives the same pixels (same page after the sweep, and a fresh page) | remove state carried between frames; recreate PRNGs from fixed seeds. Outro-only differences: a thumbnail depends on time, or glyphs loaded late (the message says which) |
| player | `index.html` boots clean | usually a config typo |
| sheet | contact sheet written without console errors | — |
| audio | `check-audio --determinism`: right duration, no silent chapter, no NaN, peak ≤ −0.2 dBFS, identical hashes with workers, workers again and the main thread | unusual BPM or bar counts: check `music` recipes |
| build (`--build`) | `dist/index.html`, `dist/gallery.html` and `dist/artifact/index.html` load clean | needs esbuild: `npm install`, or link a `node_modules` that has it |
| mp4 (`--mp4`) | H.264 + AAC clip probes OK | needs ffmpeg |

Film-frame time (about 20–35 ms in headless software Chromium) is reported for information only. In a real
browser with a GPU it runs much faster.

## Manual gates (look at the images; nobody else will)

Open every image check_film lists. Use the Read tool on the JPG and PNG files.

For **each scene strip** (`scene_NN_<id>.jpg`):
- [ ] The medium reads at a glance (art-media.md "tells").
- [ ] The main subject is big, accurate and readable in the thumbnail.
- [ ] The before and after frames are alive, not empty. The story beat is visible in mid → end.
- [ ] No modern title cards in the scene. No text clipped by the frame or the easel cover.
- [ ] Gallery-ride: the rider is on the road, re-styled into the medium, and not floating.
- [ ] Easel: the subject is inside the safe area and not hidden behind the hill, painter or paper fade (`in film` cell; `--guides`).
- [ ] Easel: the `board / card` miniature shows the subject, not an empty band (tune `chapter.easel.crop`, stages.md).
- [ ] Gallery-ride: the rider does not hide the subject's key detail or any text; the band below the road is textured, not flat.

For the **film keyframes** (`film_keyframes.jpg`):
- [ ] The intro title, subtitle and quote are legible and nothing overlaps.
- [ ] Chapter boundaries look clean: no gaps, seams or pops.
- [ ] Outro: every chapter thumbnail is present and the headline, closing line and credits are legible.

For the **player** (`player.png`):
- [ ] Title badge, controls and a "配樂就緒" state after loading. Check the info card in teaching mode once by hand if possible.

**Content** (fact-sheet pass, content-research.md §7):
- [ ] Every number is sourced, every strong word is justified, nothing listed under "Do not claim" appears on screen or in a scene.

**Listening** (optional, if the user can listen):
- [ ] `node tools/render-audio.mjs`, then listen to `out/soundtrack.wav`. Each chapter should sound different and the transitions should land on the bar line.

## Before handing over

- [ ] `check_film.mjs .` shows no FAIL (and `--build` if delivering a page).
- [ ] Remaining WARNs are explained to the user (e.g. a strong claim that is sourced).
- [ ] Deliverables: `dist/index.html` (player), `dist/gallery.html`, optionally `out/film.mp4`. Optionally publish `dist/artifact/` (SKILL.md step 7).
