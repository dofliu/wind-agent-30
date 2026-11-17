# Music presets

The soundtrack is synthesised in the browser and is deterministic. One shared leitmotif is
re-orchestrated per chapter. Each chapter picks a **style preset** in `chapters.js`:

```js
music: { preset: 'cool-jazz-vibes', mode?: 'dorian', loudDb?: 0, wind?: 0.4, swing?: 0.58, human?: 0.5 }
```

- Each preset is a 4-bar phrase. It is tiled across the chapter's bars, and the chapter changes on the bar line with a one-beat crossfade.
- BPM and `FILM.music.transpose` apply to everything (drums are not transposed).
- Every chapter is loudness-matched (K-weighted), so `loudDb` is only a nudge (±2 dB).
- `mode` overrides the preset's scale, but presets are tuned for their default modes. Override rarely.
- `wind` (0–1) sets how much of the wind/ambience bed sits under this chapter.
- `swing` 0.5 is straight and 0.58–0.66 is swung. `human` sets the timing and velocity looseness.

Run `node tools/presets.mjs` in the project for the live list, and `node tools/test-presets.mjs` after editing `src/audio/presets.js`.

## Chapter presets

| id | era / feel | lead + instruments | default mode | pairs well with (media) |
|---|---|---|---|---|
| `ancient-harp` | antiquity, Egypt / Near East; processional, warm | harp with grace notes, rolled chords, reed drone, frame drum (maqsum), zills | phrygian dominant | tomb fresco, relief, papyrus, clay tablet |
| `santur-dastgah` | Persia / Silk Road / Islamic golden age; ornate, flowing | hammered santur with tremolo, left-hand ostinato, drone, tombak | dastgah Shur (quarter-flat 2nd) | Persian miniature, tilework, astrolabe diagram |
| `medieval-recorder` | European Middle Ages; modal, rustic | recorder with mordents, parallel-fourth organum, bagpipe drone, tabor | dorian | illuminated manuscript, tapestry, stained glass |
| `flamenco-guitar` | Iberia, 16th–17th c.; fiery | nylon guitar, rasgueado, thumb bass, castanets, palmas | phrygian dominant | woodcut, Golden Age engraving, azulejo |
| `baroque-harpsichord` | 17th–early 18th c.; ordered, ornamented | harpsichord melody + chords, cello continuo (Pachelbel-like descent) | major | Delftware tile, Dutch genre painting, copperplate map |
| `guzheng-pentatonic` | classical China / East Asia; poised | guzheng with bends and glissandi, open-string drone, muyu woodblock | gong pentatonic | ink wash, silk scroll, gongbi, woodblock |
| `string-quartet` | 18th-c. Enlightenment, science; elegant | violin I melody, repeated-8th inner voices, cello bass | major | copperplate scientific engraving, encyclopaedia plate |
| `frontier-banjo` | 19th-c. American frontier, rural, farms; bouncy | banjo rolls, boom-chick guitar, upright bass, washboard (shuffle) | major | chromolithograph trade card, letterpress poster |
| `victorian-musicbox` | Victorian invention, parlour science; delicate | music box over pump organ, clockwork ticks | major | Victorian wood engraving, patent drawing, cyanotype |
| `nordic-fiddle` | Scandinavia, 19th-c. folk; open-air | fiddle with slides and double-stops, accordion oom-pah | mixolydian | Golden Age oil painting, folk-art rosemaling |
| `ragtime-piano` | 1900s–1920s; jaunty, industrial optimism | honky-tonk piano octaves, stride chords, tuba, brushes (swung) | dorian | engineering blueprint, Art Nouveau / Deco poster, silent film |
| `newsreel-brass` | 1930s–1940s, wartime, big projects; heroic | trumpets in horn thirds, tuba, march snare, "radio" EQ | major | black-and-white newsreel, propaganda-style poster (generic), WPA poster |
| `cool-jazz-vibes` | 1950s–early 60s; modern, relaxed | vibraphone with motor tremolo, rootless piano, walking bass, brushes (swung) | lydian | mid-century modernist poster, atomic-age ad, Swiss style |
| `seventies-analog` | 1970s; activist, groovy | analog mono lead with glide, string machine, octave disco bass, four-on-the-floor | dorian | screen-printed poster, underground comix, Polaroid |
| `synthwave` | 1980s; neon, futurist | supersaw lead, ping-pong delay, warm pad, 8th bass, gated snare | natural minor | synthwave neon grid, VHS, airbrush chrome |
| `chiptune` | late 80s–90s computing / games; playful | 25 % pulse lead, 12.5 % arps, 4-bit triangle bass, noise drums | major | pixel art, early GUI, dot-matrix printout |
| `ambient-fm-bells` | 2000s–2010s; spacious, digital calm | FM bells, evolving pad, sub bass, soft clicks, long delay | lydian | flat infographic, satellite map, data viz |
| `temple-yueqin` | Taiwan / Southern Chinese festival; festive | yueqin with tremolo, sheng fifths, temple gongs, cymbals, clapper, drum | gong pentatonic | Taiwanese floral fabric, temple painting, paper-cut |
| `electro-arps` | 2020s; bright, technological | pluck lead + 16th arps, side-chained supersaw pad, sub, electro drums | lydian | wireframe HUD, digital twin, isometric 3D |
| `fm-keys-electro` | contemporary tech / startup / now; optimistic | FM electric piano, syncopated chords, sub bass, light electro beat, glitches | major | flat UI, motion-graphics, glassmorphism |

## Film-level presets (`FILM.music`)

| key | options | notes |
|---|---|---|
| `intro` | `wind-chimes` (pad swell + flute + chimes; bicycle bell when the character cycles) · `pad-swell` · `none` | written for 3 bars; longer intros hold a pad first |
| `outro` | `relay-finale` (motif passed through every chapter's lead voice, full cadence) · `pad-swell` · `none` | written for 6 bars; longer outros let the last chord ring |
| `bed` | `wind` · `breeze` · `none` | ambience under everything; `bedLevel` multiplier (1 = reference) |
| `transpose` | semitones (score is around D) | −2 → C, +3 → F |

## Choosing presets

- **Change the colour at every chapter.** Neighbouring chapters should use different presets. `new_film.mjs` avoids repeats automatically.
- **Match the period first, then the place.** A 1960s Japanese chapter can use `cool-jazz-vibes`, or `guzheng-pentatonic` for a traditional feel. The music should support the chosen art medium.
- **Timelines that are not about history** (a process, a product, a project) use energy instead. Early or simple stages get acoustic presets (`string-quartet`, `victorian-musicbox`), middle stages get `ragtime-piano` or `cool-jazz-vibes`, and scaling or launch gets `synthwave`, `electro-arps` or `fm-keys-electro`.
- **Taiwan topics:** `temple-yueqin` is a strong closer, as in the reference film.
- **Bars per chapter** should be a multiple of 4, or the 4-bar phrase is cut at the chapter end.
- **More presets:** add `PRESETS[id]` + `ARRANGE[id](A, c)` in `src/audio/presets.js`. Copy the closest preset, keep it 4 bars long with beat 0 on the downbeat, then run `test-presets.mjs` and `check-audio.mjs --determinism`. This is higher-effort work. Prefer existing presets.
