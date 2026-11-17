---
name: history-timeline-film
description: Make a deterministic, 100% procedural animated timeline film (web player + gallery + MP4) that tells the history or stages of any topic chapter by chapter, each chapter drawn in its own period art medium, with a synthesised soundtrack and sourced teaching notes. Stagings - a character riding through framed panels on a museum wall, or a painter at an easel on a hilltop painting each era while the valley below plays it. Use whenever the user wants a timeline animation or history video, e.g. 「做一支像乘風騎行那樣的時間軸動畫」「歷史時間軸動畫／影片」「用動畫講某某的發展史／演進史」「畫家在山丘寫生、山下演出各年代」「每個年代一種畫風」, a Pelican-test style timeline, an animated history of a technology, a process or a project's milestones as a film - even if they only say "turn the history of X into an animation". Also use to add chapters, switch stage, character or music, or fix a film made with this skill.
---

# History timeline film

This skill builds films like 《乘風騎行》 (wind power history, 20 eras, 2:58).
- **Purely procedural:** every frame is a pure function `renderAt(t)` drawn with Canvas 2D, and the soundtrack is synthesised in the browser. There are no image or audio assets, and the same `t` always gives the same pixels.
- **Chapters:** one chapter per date, era or step, each in its own art medium, with an info card (description, facts, sources). The film opens with an intro and closes with an outro that recaps every chapter on a time axis.
- **Deliverables:**
  - a single-file player `dist/index.html` (also shaped for an Artifact);
  - a gallery page with all chapters and sources;
  - an MP4 rendered with ffmpeg.

The engine is finished and lives in `assets/template/`. **A new film is mostly content plus one
scene module per chapter.** You will not need to touch the engine.

```
assets/template/           the engine + a 3-chapter demo (《書寫的旅程》); copied by new_film.mjs
scripts/new_film.mjs       scaffold a project from options
scripts/check_film.mjs     run every QA gate, print a pass/fail table, list images to look at
references/                read when the step says so (each is self-contained)
  scene-contract.md  stages.md  characters.md  music-presets.md
  content-research.md  qa-checklist.md  art-media.md
  examples/  4 reference scenes + spec-example.json (a complete scaffold spec)
  gallery/   stills from the reference film and from trial films (what to aim for)
```

Requirements: Node 20+, Playwright with Chromium (`require('playwright')` must resolve), and ffmpeg for MP4.
The build also needs esbuild: run `npm install` in the project, or pass `--node-modules <path>`.
Throughout, `<skill>` is the directory that contains this file.

---

## Step 0: options (ask once, then proceed)

Ask **one** short round of questions only if the topic or audience is unclear. Otherwise state the
defaults below in one message and start. Users can change anything later. Every option is one line
in the config.

| option | default | notes |
|---|---|---|
| topic + audience | from the request | general public / students / colleagues. Sets the depth of the text |
| chapters N | 8–12 (4–6 for a short, up to 24) | ≈ one idea per chapter |
| length | intro 6 s + N × 8 s + outro 12 s at 120 BPM | `--seconds-per-chapter` or `--bars-per-chapter`; keep the bar count a multiple of 4 |
| stage | `gallery-ride`; `easel` if they mention a painter, sketching, watercolour, an easel or a hill | details in `references/stages.md` |
| character | `spoonbill` on gallery-ride, `person` on easel | `references/characters.md`; colours and hat for the person |
| language | Traditional Chinese, Taiwan usage (`zh-Hant`) | `--lang en` for English |
| art medium per chapter | auto: by period (`references/art-media.md`) | or one family for process topics |
| music | auto: preset by period, no repeats between neighbours | `references/music-presets.md` |
| title / subtitle / quote / outro lines | you draft them | show them in the plan |

**Easel option, the user's sketching idea:** a character paints on a hilltop. The board on the easel shows
the era (e.g. 「1980 年代」) and the title being painted in. The valley below plays that era's scene, and
chapters change with a watercolour wash on the bar line. This is `--staging easel+person`.

Then **show a plan table** and continue unless the user objects:

| # | id | dateLabel | title | one-line claim | medium | music preset |
|---|---|---|---|---|---|---|

Ids are lowercase ASCII (`[a-z][a-z0-9_]*`). They become scene file names.

## Step 1: research + fact sheet

Read `references/content-research.md`. For each chapter, write a section in
`research/fact-sheet.md` (the scaffold creates the skeleton):
- the claim;
- date, place and people;
- **visual facts** (what to draw);
- 2–4 info-card facts, each with its source;
- source URLs;
- **Do not claim** (contested firsts, unverified numbers, legends);
- the hedged wording used.

Wording is conservative: 「約」「已知最早的…之一」「申請專利」 instead of 「發明」.
Never invent quotes, numbers or URLs. If you cannot verify something, hedge it or drop it, and tell the user.

If you can use web search, verify every number you put on screen. Without it, keep to well-known
facts, hedge them, and flag what needs a human check.

## Step 2: scaffold

```bash
node <skill>/scripts/new_film.mjs --dir <project> --title "腳踏車簡史" --subtitle "…" \
  --staging gallery-ride+spoonbill --chapters 10 --years 1817,1860,1885,… --lang zh-Hant
# or: --ids draisine,boneshaker,safety,…   --presets auto|p1,p2,…   --seconds-per-chapter 8
# or put everything (incl. chapter records) in a JSON file: --spec plan.json
```

This does the following:
- copies the template (without the demo scenes; `--demo` keeps the working 3-chapter demo instead);
- writes `film.config.js` (title, staging, BPM, bars, music settings);
- writes `chapters.js` with one record per chapter; the medium (with its own palette, frame and scene look) and preset are pre-filled from the year, and neighbours never share a medium or preset;
- writes one **look skeleton** per chapter (`src/scenes/<id>.js`): a working scene already in the chapter's medium on both stages;
- writes `research/fact-sheet.md` and `film.options.json`;
- runs `validate`.

**Best: write the plan as one `--spec` JSON.** Chapter records take every `chapters.js` field (caption,
description, facts, sources, style, palette …) plus `year`, `medium`, `preset`, `look` and the fact-sheet
fields `claim`, `when`, `visual`, `doNotClaim`, `hedged`, `justified`. A complete spec leaves no content
TODO. Copy `references/examples/spec-example.json`. The scaffold prints each chapter's medium with its
effort rating (● simple … ●●●); for low effort, swap ●●● media via `"medium"` (ids listed in `new_film.mjs --help`).

Check that it runs: `cd <project> && node <skill>/scripts/check_film.mjs . --draft --quick`
(stubs render as simple skeleton scenes, and content gates show WARN).

## Step 3: film.config.js + chapters.js

Edit `src/data/film.config.js`:
- the title, subtitle (plus `subtitleAlt` in English) and quote;
- the `outro` lines: headline, summary, closing, credits;
- `character.colors` and `hat` (each hat has its own default colour);
- `palette` (dark museum wall by default);
- `fonts` (Google Fonts families; the defaults cover Traditional Chinese and the Latin display faces).

Fill `src/data/chapters.js` from the fact sheet. The field guide is at the top of the file and in
`references/content-research.md` §5:
- `dateLabel`, `ruler` (≤ 6 CJK chars), `title`, `titleAlt`;
- `caption` (≤ 30 CJK chars), `description` (3–5 sentences), `facts` (2–4), `sources`;
- `style` and `styleAlt` (the medium), `palette` (5 colours of that medium), `frame` (gallery-ride frame family);
- `prop` (what the character carries: for non-wind topics use `pennant`, `balloon`, `lantern` or `none`);
- `music.preset`;
- optional: `scene` (to share a module) and `easel.crop`.

Run `node tools/validate.mjs` after editing.

## Step 4: scene modules (the main work)

Read `references/scene-contract.md`, then the chapter's entry in `references/art-media.md`.
For a quality reference, read one example in `references/examples/` (gedser = poster,
putnam = newsreel, china = ink, california = synthwave) and the demo scenes in
`<skill>/assets/template/src/scenes/` (tablet, quill, ballpoint: written to the current contract; the scaffold leaves them out of your project, so read them in the skill).

Each skeleton already has the medium's background, textured ground, overlay and rider style, a
placeholder subject (a tower with a wheel) and a bar-3 beat. For each chapter, edit `src/scenes/<id>.js`:
1. Fill in the header comment (`<fill in …>`): medium tells, subject, story beat.
2. Adjust `paintBackground()` to the chapter's setting (it is baked once).
3. Replace every `// REPLACE:` block: the **main subject** (big, accurate per the fact sheet's visual facts,
   animated with `T`) and **one story beat in bar 3**. Use the medium helpers on `kit` (`paper`, `hatch`,
   `halftoneShade`, `dots`, `misregister`, `wash`, `inkLine`, `emboss`, `glow`, `crt`, `filmLook`,
   `pixelate`; SCENE_GUIDE.md "Medium helpers"). Add a foreground layer for depth.
4. Gallery-ride: the rider sweeps y 470–700 across the panel; keep text and small details above y ≈ 450.
   Easel: keep the subject in `p.safe`; set `chapter.easel.crop` so the board miniature shows it (stages.md).
5. Check it (`out/<id>` is a file prefix: it writes `out/<id>_lt4.png` …):
   ```bash
   node tools/shot.mjs panel <id> 0.5,4,7.5 out/<id> --timing     # then LOOK at the PNGs
   node tools/shot.mjs panel <id> 4 out/<id>_e --stage easel --guides   # easel: safe area + paper fade
   node <skill>/scripts/check_film.mjs . --quick --draft --only <id>    # strip incl. the in-film frame + board
   ```

Hard rules:
- deterministic (no `Math.random`, `Date` or `performance.now`; use `kit.makePRNG`, `kit.hash11`, `kit.noise*`);
- < 12 ms per scene frame (measured GPU-synced); never `ctx.setTransform`; thumbnails are a fixed frame;
- no external assets;
- Traditional Chinese text;
- no real logos;
- edit only your own scene file.

The per-scene checklist is in `scene-contract.md` §7.

## Step 5: music

Each chapter's `music.preset` comes from `references/music-presets.md`. Pick by period and mood, and
make sure neighbours differ. Film-level choices live in `FILM.music`:
- `intro`: `wind-chimes` or `pad-swell`;
- `outro`: `relay-finale` or `pad-swell`;
- `bed`: `wind`, `breeze` or `none`;
- `transpose`.

Run `node tools/presets.mjs` to list presets. Do not edit `src/audio/` unless the user asks for a new
sound; that is high-effort work.

## Step 6: QA gates (all must pass)

```bash
node <skill>/scripts/check_film.mjs <project>            # full: content + render + console + perf + determinism + audio
```

The gates are:
- validate, presets, content (no TODO), zh-Hant (no simplified characters; mainland terms are warnings), facts (fact sheet complete; strong claims listed);
- scenes (no skeleton left);
- per-chapter renders at before / start / mid / end / after plus a thumbnail (non-blank), perf < 12 ms;
- a whole-film console sweep, determinism, the player page, the contact sheet;
- audio `check-audio --determinism`.

Strong-claim words stay a WARN until the chapter's fact-sheet section has a
`- **Strong words justified:** <words> — <why / source>` line.

Then **look at every image it lists** (`out/qa/<staging>/scene_*.jpg` — each strip ends with the chapter
`in film` and, on easel, the painted `board / card` —, `film_keyframes.jpg`,
`sheet.png`, `player.png`) using the Read tool, and go through the manual list in
`references/qa-checklist.md`: medium tells, subject accuracy, story beat, nothing hidden by the
frame or the easel, legible intro and outro. Fix, re-run, and look again. A film is done when the table
has no FAIL and you have looked at the images.

## Step 7: build, publish, render

```bash
npm install            # once, for esbuild (or new_film --node-modules <dir with esbuild>)
node <skill>/scripts/check_film.mjs . --build --mp4      # build + load dist pages + short MP4 clip
node tools/render-audio.mjs                               # out/soundtrack.wav
node tools/render.mjs --audio out/soundtrack.wav --jpeg   # out/film.mp4, full film 1920x1080 30 fps
```
`tools/render.mjs` flags (`--help`): `--out <file>`, `--audio <wav>`, `--from/--to <sec>`, `--scale 0.5`, `--jpeg`, `--fps`, `--staging`.
A 1-minute film renders in about 2 minutes.

- `dist/index.html` (player), `dist/gallery.html` and `dist/render.html` are single files that work offline except for Google Fonts.
- **Publishing as an Artifact (optional):** offer it when the user wants a link. Publish `dist/artifact/index.html` with `files: {"gallery.html": "dist/artifact/gallery.html"}`.
- **MP4:** a full 3-minute render takes a few minutes. Use `--from/--to` for clips and `--scale 0.5` for previews.
- Report to the user: the deliverable paths, the chapter table, the remaining WARNs and why they are acceptable, and anything that needs a human fact check.

---

## Effort guide

This skill is designed so a **low or medium effort** run can finish a good film. The engine,
stagings, characters, music and QA are already done. Spend effort where it shows.

| task | low / medium effort is fine | benefits from high effort or a subagent |
|---|---|---|
| options, plan, scaffold | yes: defaults + `new_film.mjs` | — |
| research + fact sheet | yes, if facts stay conservative | many chapters with contested history |
| chapters.js text | yes | — |
| music | yes: pick presets | writing new presets |
| scenes in ● media (art-media.md) | yes: skeleton + baked background + one animated subject + beat | — |
| scenes in ●●● media, crowds, intricate machines | a simplified first version | a dedicated agent per scene |
| new stage / character / prop | no | yes (stages.md, characters.md) |
| QA | yes: `check_film` + looking at the images | — |

**Low-effort recipe per scene (keep the look skeleton, change ~40–80 lines):**
1. set the setting in `paintBackground()` (keep the medium's texture calls);
2. replace the placeholder with one big, recognisable subject in the medium's technique (palette colours);
3. one moving part and one bar-3 beat;
4. keep the subject clear of the rider band / inside `p.safe`; easel: set `easel.crop`;
5. look at the strip (`in film` + `board` cells).

This passes every gate and reads as the medium (calibrate against `references/gallery/`). Then spend extra effort on the scenes the user
cares about most: more detail on the subject, a foreground layer, a second motion.

## Parallel scene authoring (when subagents are available)

Scenes are independent files with a fixed contract, so they parallelise well.
1. **You (the lead)** finish steps 0–3 and 5: the fact sheet, config, `chapters.js` and presets. The project must pass `check_film --draft --quick`.
2. **Start one agent per scene** (or per 2–3 simple scenes). Give each agent:
   - the project path and the chapter id;
   - the fact-sheet section;
   - the medium entry from `art-media.md`;
   - the path to `references/scene-contract.md`;
   - the active staging;
   - these rules: "Edit ONLY `src/scenes/<id>.js`. Do not touch chapters.js, index.js, the engine or other scenes. No `Math.random`/`Date`. < 12 ms. Verify with `node tools/shot.mjs panel <id> 0.5,4,7.5 out/<id> --timing` and `node <skill>/scripts/check_film.mjs . --quick --only <id> --draft`, look at the images, then report the timing and any doubts about accuracy."
3. Agents share the project directory. They write only their own file, and `out/` file names include the id, so there are no conflicts. **Do not** let agents run `new-scene.mjs` (it edits `index.js`) or the build.
4. When all agents are done: run the full `check_film`, look at the strips, and send fixes back to the specific agent or fix them yourself.

## Changing an existing film

- **Staging:** the `staging:` line in `film.config.js`, or `?staging=` to preview. Square scenes work on both stages; wide scenes need `meta.stages` updated or a gallery-ride branch.
- **Add a chapter:**
  1. add its fact-sheet section;
  2. run `node tools/new-scene.mjs <id>` (`--wide` for easel);
  3. add the record to `chapters.js` at the right position;
  4. run `check_film`.
- **Change pacing:** `bpm`, `barsPerChapter` or `secondsPerChapter`. Scenes adapt if they use `p.beat` and `p.chapterSec`. Re-run the audio gate.
- **English version:** set `lang: 'en'` and translate `title`/`caption`/`description`/`facts`. Scene text must be translated too.

## Troubleshooting

| symptom | cause / fix |
|---|---|
| `Cannot find module 'playwright'` | install it (`npm i -D playwright && npx playwright install chromium`), or set `NODE_PATH` to a global install |
| placeholder card in a chapter | module missing, thrown, or `meta.stages` excludes the stage; the console names it (`[scene-error:<id>]`) |
| perf FAIL | something static is drawn per frame: bake it; remove `shadowBlur`, `filter` and per-frame `getImageData` |
| determinism FAIL | state kept between frames (a PRNG advanced across calls, arrays mutated); outro-only: a thumbnail that depends on time. The message names the case |
| text in the first frame uses a fallback font | glyphs are synced by every tool; run `node tools/glyphs.mjs` after editing scenes outside the tools |
| `<title>` of a built page is wrong | it comes from `FILM.title`; rebuild |
| fonts look wrong in the first frame | wait for boot (`__FILM_READY__`); the tools already do |
| build fails: esbuild | `npm install` in the project, or `new_film --node-modules <dir>` |
| easel subject hidden | move it into `p.safe`; check with `--guides` |
