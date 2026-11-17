#!/usr/bin/env node
// scripts/new_film.mjs — scaffold a new history-timeline film project from assets/template.
//
//   node <skill>/scripts/new_film.mjs --dir ~/films/my-film [options]
//
// Copies assets/template (without node_modules / out / dist), writes src/data/film.config.js
// from the options, writes src/data/chapters.js with one stub record per chapter (date / medium /
// palette / frame / music pre-filled from the chapter's year when given), generates one scene
// skeleton per chapter (src/scenes/<id>.js, registered in src/scenes/index.js), and writes
// research/fact-sheet.md (one section per chapter) + film.options.json.
//
// Options (all optional except --dir):
//   --dir <path>                 target directory (must be empty or absent; --force to reuse)
//   --spec <file.json>           JSON with any of the options below (camelCase) + "chapters": [ {...} ].
//                                Chapter records take EVERY chapters.js field (dateLabel, ruler, title,
//                                titleAlt, caption, description, facts, specs, sources, style, styleAlt,
//                                palette, frame, prop, music, scene, easel) plus scaffold-only fields:
//                                year, preset (= music.preset), medium (a MEDIA id below or its name),
//                                look, and the fact-sheet fields claim, when, visual, doNotClaim, hedged,
//                                justified. A complete spec scaffolds a film with no TODO left except
//                                the scenes. Example: <skill>/references/examples/spec-example.json
//   media ids: fresco blackfigure miniature inkwash manuscript tapestry woodcut delft copperplate map
//              woodengraving chromolith patent blueprint newsreel deco wpa midcentury lignecaire
//              screenprint synthwave gui pixel infographic satellite hud iso watercolour
//   --title "..."  --subtitle "..."  --subtitle-alt "..."  --quote "..."
//   --lang zh-Hant|en            UI + placeholder language (default zh-Hant, Taiwan usage)
//   --staging <stage>+<char>     or --stage gallery-ride|easel  --character spoonbill|person
//                                (default gallery-ride+spoonbill; easel defaults to person)
//   --hat beret|straw|cap|none   person's hat (default beret; each hat has its own default colour)
//   --chapters N                 number of chapters (default 6) — or --ids a,b,c (scene/chapter ids)
//   --years 1900,1950,...        representative year per chapter (drives the auto medium + music)
//   --bpm 120  --bars-per-chapter 4 | --seconds-per-chapter 8  --intro-bars 3  --outro-bars 6
//   --presets p1,p2,...|auto     music preset per chapter (default auto: by year, else a contrast cycle)
//   --intro wind-chimes|pad-swell|none  --outro relay-finale|pad-swell|none  --bed wind|breeze|none
//   --transpose <semitones>
//   --look <look>|plain          scene skeleton look for every chapter (default: per chapter, from its
//                                medium: engraving poster blueprint newsreel screen pixel ink fresco);
//                                plain = the bare square / wide skeleton (--scene-kind)
//   --scene-kind square|wide     bare skeleton type with --look plain (default: square on gallery-ride, wide on easel)
//   --demo                       keep the 3-chapter demo (書寫的旅程) as-is (only staging / lang /
//                                bpm options are applied) — a known-good project for smoke tests
//   --node-modules <path>        symlink an existing node_modules (needs esbuild, for build.mjs)
//   --install                    run `npm install` in the new project (esbuild for build.mjs)
//   --force                      allow a non-empty target directory (files are overwritten)
//
// Nothing here uses the network. Playwright (tools) and ffmpeg (MP4) are expected on the machine.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(SKILL, 'assets', 'template');

// ---------------------------------------------------------------------------- args
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) o[key] = true;
    else {
      o[key] = next;
      i++;
    }
  }
  return o;
}
const cli = parseArgs(process.argv.slice(2));
if (!cli.dir || cli.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(cli.dir ? 0 : 1);
}
let spec = {};
if (cli.spec) spec = JSON.parse(fs.readFileSync(path.resolve(cli.spec), 'utf8'));
const opt = { ...spec, ...cli }; // command line wins
delete opt.chapters;
const specChapters = Array.isArray(spec.chapters) ? spec.chapters : null;
const chapterCount = cli.chapters && cli.chapters !== true ? Number(cli.chapters) : null;

const DIR = path.resolve(String(opt.dir));
const lang = opt.lang === 'en' ? 'en' : 'zh-Hant';
const zh = lang === 'zh-Hant';

let [stage, character] = String(opt.staging || '').split('+');
stage = opt.stage || stage || 'gallery-ride';
character = opt.character || character || (stage === 'easel' ? 'person' : 'spoonbill');
const STAGES = ['gallery-ride', 'easel'];
const CHARS = ['spoonbill', 'person'];
if (!STAGES.includes(stage)) fail(`unknown stage "${stage}" (${STAGES.join(' | ')}); new stages: see references/stages.md`);
if (!CHARS.includes(character)) fail(`unknown character "${character}" (${CHARS.join(' | ')}); new characters: see references/characters.md`);

function fail(msg) {
  console.error(`new_film: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------- copy
if (fs.existsSync(DIR) && fs.readdirSync(DIR).length && !opt.force) fail(`${DIR} is not empty (use --force)`);
const SKIP = new Set(['node_modules', 'out', 'dist']);
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(e.name) && src === TEMPLATE) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
copyDir(TEMPLATE, DIR);
const P = (...a) => path.join(DIR, ...a);

// ---------------------------------------------------------------------------- media + era table
// Auto suggestions by representative year: medium (style + its own palette + frame + scene look),
// music preset. The author is expected to refine them (references/art-media.md, music-presets.md).
// rating: 1 = ● simple, 2 = ●● moderate, 3 = ●●● rich (art-media.md). look = tools/scene-looks.mjs.
const MEDIA = {
  fresco: { zh: '古代壁畫浮雕', en: 'Ancient fresco / relief', frame: 'stone', look: 'fresco', rating: 1, palette: ['#e8d6b0', '#b5523b', '#1d6b73', '#d9a441', '#2a1d14'] },
  blackfigure: { zh: '陶器黑繪', en: 'Black-figure pottery', frame: 'stone', look: 'fresco', rating: 2, palette: ['#d9824a', '#1b1410', '#f0d9b5', '#8a3b1e', '#3a2418'] },
  miniature: { zh: '古典細密畫', en: 'Classical miniature painting', frame: 'gilt', look: 'poster', rating: 3, palette: ['#efe2c4', '#1d4e89', '#b23a2b', '#c99a2e', '#2a2017'] },
  inkwash: { zh: '水墨畫', en: 'Ink wash painting', frame: 'mount', look: 'ink', rating: 2, palette: ['#efe8d8', '#1c1c1c', '#6b7b6e', '#b8322a', '#a89f8a'] },
  manuscript: { zh: '中世紀泥金手抄本', en: 'Illuminated manuscript', frame: 'gilt', look: 'poster', rating: 2, palette: ['#f1e4c3', '#b32d2a', '#1f3f8f', '#c99a2e', '#2a2017'] },
  tapestry: { zh: '掛毯刺繡', en: 'Embroidered tapestry', frame: 'wood', look: 'poster', rating: 2, palette: ['#e9dcc0', '#8a2f24', '#2f4f6f', '#c9a23a', '#3a2a1e'] },
  woodcut: { zh: '木刻版畫', en: 'Woodcut print', frame: 'paper', look: 'engraving', rating: 1, palette: ['#efe6d2', '#1b1a18', '#8a3b2a', '#c9b48a', '#4a443a'] },
  delft: { zh: '台夫特藍陶磚', en: 'Delftware tile', frame: 'tile', look: 'ink', rating: 1, palette: ['#f4f3ee', '#1f3f8f', '#5b7fc0', '#a9bde0', '#24324f'] },
  copperplate: { zh: '銅版雕刻科學插圖', en: 'Copperplate engraving', frame: 'paper', look: 'engraving', rating: 2, palette: ['#f2ead8', '#1b1a18', '#7a3b2a', '#a89a7a', '#4a443a'] },
  map: { zh: '銅版地圖', en: 'Copperplate map', frame: 'paper', look: 'engraving', rating: 2, palette: ['#efe2c4', '#2a2017', '#6f8f9f', '#c9a45c', '#8a3b2a'] },
  woodengraving: { zh: '維多利亞木口版畫', en: 'Victorian wood engraving', frame: 'paper', look: 'engraving', rating: 2, palette: ['#efe9dc', '#151413', '#8a3b2a', '#b9ad96', '#2d2a26'] },
  chromolith: { zh: '彩色石版印刷', en: 'Chromolithograph', frame: 'wood', look: 'poster', rating: 2, palette: ['#f0e2c0', '#a8322d', '#2f5d50', '#d9a03f', '#3a2a20'] },
  patent: { zh: '專利圖', en: 'Patent drawing', frame: 'paper', look: 'engraving', rating: 1, palette: ['#f7f4ea', '#1a1a1a', '#8a3b2a', '#c8c0ad', '#2e2b27'] },
  blueprint: { zh: '工程藍圖', en: 'Engineering blueprint', frame: 'steel', look: 'blueprint', rating: 1, palette: ['#1f4e8c', '#e8f1ff', '#9cc3e6', '#f2d16b', '#0f2a4d'] },
  newsreel: { zh: '黑白新聞片', en: 'Black-and-white newsreel', frame: 'film', look: 'newsreel', rating: 2, palette: ['#e8e2d2', '#9a958a', '#55524b', '#1e1d1b', '#c7c0ad'] },
  deco: { zh: '裝飾藝術海報', en: 'Art Deco poster', frame: 'poster', look: 'poster', rating: 2, palette: ['#efe3c8', '#1d2b3a', '#c9a23a', '#b23a2b', '#2f6b6b'] },
  wpa: { zh: '公共工程海報', en: 'Public-works poster', frame: 'poster', look: 'poster', rating: 1, palette: ['#efe2c2', '#c4572e', '#2b4a6f', '#e0b04a', '#2a2420'] },
  midcentury: { zh: '世紀中期現代主義海報', en: 'Mid-century modernist poster', frame: 'poster', look: 'poster', rating: 1, palette: ['#f2ebdc', '#c8102e', '#1d3557', '#f1c40f', '#2a2a2a'] },
  lignecaire: { zh: '漫畫清線風格', en: 'Ligne claire comic', frame: 'paper', look: 'poster', rating: 2, palette: ['#f6f0e0', '#d8483b', '#3f7cb5', '#f2c94c', '#1a1a1a'] },
  screenprint: { zh: '絲網印刷海報', en: 'Screen-printed poster', frame: 'poster', look: 'poster', rating: 1, palette: ['#f3e3c3', '#e85d2a', '#2a6f97', '#f2b134', '#2b2b2b'] },
  synthwave: { zh: '合成器浪潮霓虹', en: 'Synthwave neon', frame: 'screen', look: 'screen', rating: 2, palette: ['#16121f', '#ff4f9a', '#35d0ff', '#ffd166', '#5b2a86'] },
  gui: { zh: '早期電腦介面', en: 'Early GUI / CRT terminal', frame: 'screen', look: 'screen', rating: 1, palette: ['#0c140c', '#39ff88', '#c8ffd8', '#ffb347', '#14351f'] },
  pixel: { zh: '像素遊戲', en: 'Pixel art', frame: 'screen', look: 'pixel', rating: 1, palette: ['#c9c5bb', '#3f8fd2', '#2e7d32', '#f2c14e', '#1d1d1d'] },
  infographic: { zh: '扁平資訊圖表', en: 'Flat infographic', frame: 'poster', look: 'poster', rating: 1, palette: ['#f4f1ea', '#ff5a5f', '#087e8b', '#f2c14e', '#3c3c3c'] },
  satellite: { zh: '衛星地圖', en: 'Satellite map', frame: 'screen', look: 'screen', rating: 2, palette: ['#0e1a24', '#7fd1ae', '#f2c14e', '#ff7a59', '#20384a'] },
  hud: { zh: '數位線框 HUD', en: 'Wireframe HUD', frame: 'screen', look: 'screen', rating: 2, palette: ['#07131f', '#39d0ff', '#9effc8', '#ffb347', '#1c3b57'] },
  iso: { zh: '等角 3D 低多邊形', en: 'Isometric low-poly 3D', frame: 'screen', look: 'poster', rating: 2, palette: ['#eef1f5', '#f08a5d', '#3a4a6b', '#6ec6ca', '#2b2d42'] },
  watercolour: { zh: '水彩速寫', en: 'Watercolour sketch', frame: 'mount', look: 'ink', rating: 1, palette: ['#f6f1e6', '#2c2721', '#5b8c9a', '#c8553d', '#a9c4a0'] },
};
// a = default medium, b = alternative used when the neighbour already has a's medium / preset
const ERA = [
  { to: -500, a: 'fresco', b: 'blackfigure', preset: 'ancient-harp', altPreset: 'santur-dastgah' },
  { to: 600, a: 'inkwash', b: 'miniature', preset: 'guzheng-pentatonic', altPreset: 'santur-dastgah' },
  { to: 1450, a: 'manuscript', b: 'tapestry', preset: 'medieval-recorder', altPreset: 'flamenco-guitar' },
  { to: 1650, a: 'woodcut', b: 'delft', preset: 'baroque-harpsichord', altPreset: 'flamenco-guitar' },
  { to: 1800, a: 'copperplate', b: 'map', preset: 'string-quartet', altPreset: 'baroque-harpsichord' },
  { to: 1880, a: 'patent', b: 'chromolith', preset: 'victorian-musicbox', altPreset: 'frontier-banjo' },
  { to: 1915, a: 'blueprint', b: 'deco', preset: 'ragtime-piano', altPreset: 'victorian-musicbox' },
  { to: 1945, a: 'newsreel', b: 'deco', preset: 'newsreel-brass', altPreset: 'ragtime-piano' },
  { to: 1965, a: 'midcentury', b: 'newsreel', preset: 'cool-jazz-vibes', altPreset: 'newsreel-brass' },
  { to: 1980, a: 'screenprint', b: 'lignecaire', preset: 'seventies-analog', altPreset: 'cool-jazz-vibes' },
  { to: 1990, a: 'synthwave', b: 'gui', preset: 'synthwave', altPreset: 'seventies-analog' },
  { to: 2000, a: 'pixel', b: 'gui', preset: 'chiptune', altPreset: 'synthwave' },
  { to: 2015, a: 'infographic', b: 'satellite', preset: 'ambient-fm-bells', altPreset: 'fm-keys-electro' },
  { to: 1e9, a: 'hud', b: 'iso', preset: 'electro-arps', altPreset: 'fm-keys-electro' },
];
const CYCLE = ['ancient-harp', 'medieval-recorder', 'baroque-harpsichord', 'guzheng-pentatonic', 'string-quartet', 'frontier-banjo', 'ragtime-piano', 'newsreel-brass', 'cool-jazz-vibes', 'seventies-analog', 'synthwave', 'chiptune', 'temple-yueqin', 'ambient-fm-bells', 'electro-arps', 'fm-keys-electro'];
// process / non-dated films: a contrasting medium cycle (all with ready-made looks)
const MEDIA_CYCLE = ['woodcut', 'blueprint', 'midcentury', 'newsreel', 'watercolour', 'screenprint', 'pixel', 'infographic', 'hud', 'patent', 'gui', 'deco'];
const eraOf = (y) => ERA.find((e) => y < e.to) || ERA[ERA.length - 1];
const mediumByName = (name) => {
  if (!name) return null;
  if (MEDIA[name]) return { id: name, ...MEDIA[name] };
  const hit = Object.entries(MEDIA).find(([, m]) => m.zh === name || m.en.toLowerCase() === String(name).toLowerCase());
  return hit ? { id: hit[0], ...hit[1] } : null;
};

// ---------------------------------------------------------------------------- chapters
const presetList = typeof opt.presets === 'string' && opt.presets !== 'auto' ? opt.presets.split(',').map((s) => s.trim()) : null;
const yearList = typeof opt.years === 'string' ? opt.years.split(',').map(Number) : null;
const idList = typeof opt.ids === 'string' ? opt.ids.split(',').map((s) => s.trim()) : null;
const N = specChapters ? specChapters.length : idList ? idList.length : chapterCount || yearList?.length || 6;
if (!(N >= 1 && N <= 40)) fail(`chapter count ${N} out of range`);

function stubChapter(i) {
  const s = (specChapters && specChapters[i]) || {};
  const id = s.id || (idList && idList[i]) || `ch${String(i + 1).padStart(2, '0')}`;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) fail(`chapter id "${id}" must match /^[a-z][a-z0-9_]*$/ (it is also the scene module name)`);
  const year = s.year ?? (yearList ? yearList[i] : undefined);
  const era = year !== undefined && Number.isFinite(year) ? eraOf(year) : null;
  // medium: spec "medium" (a MEDIA id or its zh / en name) > era default > contrast cycle
  const med = mediumByName(s.medium) || (era ? { id: era.a, ...MEDIA[era.a] } : { id: MEDIA_CYCLE[i % MEDIA_CYCLE.length], ...MEDIA[MEDIA_CYCLE[i % MEDIA_CYCLE.length]] });
  const preset = s.preset || (s.music && s.music.preset) || (presetList && presetList[i]) || (era ? era.preset : CYCLE[(i * 5) % CYCLE.length]);
  const num = i + 1;
  const palette = s.palette || med.palette;
  const c = {
    id,
    dateLabel: s.dateLabel || (year !== undefined ? String(year) : zh ? `第 ${num} 章` : `Chapter ${num}`),
    ruler: s.ruler || (year !== undefined ? String(year) : zh ? `第${num}章` : `Ch ${num}`),
    ...(year !== undefined ? { year } : {}),
    title: s.title || (zh ? `第 ${num} 章標題` : `Chapter ${num} title`),
    titleAlt: s.titleAlt ?? (zh ? `Chapter ${num}` : ''),
    caption: s.caption || 'TODO: one-line on-screen caption',
    description: s.description || 'TODO: teaching paragraph (3–5 sentences, conservative wording, see research/fact-sheet.md)',
    facts: s.facts || ['TODO: fact 1 (sourced)', 'TODO: fact 2 (sourced)'],
    specs: s.specs || '',
    sources: s.sources || [{ label: 'TODO: source', url: 'https://' }],
    style: s.style || (zh ? med.zh : med.en),
    styleAlt: s.styleAlt || (zh ? med.en : med.zh),
    palette,
    frame: s.frame || { family: med.frame, color: '#7a5a3a', accent: palette[1] },
    prop: s.prop || { type: 'pennant', colors: [palette[1], palette[2]] },
    music: { ...(s.music || {}), preset },
  };
  for (const k of ['scene', 'easel']) if (s[k]) c[k] = s[k];
  // kept out of chapters.js: scaffold-only fields
  Object.defineProperty(c, '_medium', { value: med, enumerable: false, writable: true });
  Object.defineProperty(c, '_look', { value: s.look || opt.look || med.look, enumerable: false, writable: true });
  Object.defineProperty(c, '_spec', { value: s, enumerable: false });
  return c;
}
const chapters = Array.from({ length: N }, (_, i) => stubChapter(i));
// avoid the same preset / medium on two neighbouring chapters (the look and music should change at
// every bar line): the second of a pair switches to its era's alternative (with its own palette).
for (let i = 1; i < chapters.length; i++) {
  const c = chapters[i];
  const s = c._spec;
  const era = c.year !== undefined ? eraOf(c.year) : null;
  const sp = s.preset || (s.music && s.music.preset);
  if (!sp && !presetList && c.music.preset === chapters[i - 1].music.preset) {
    if (era && era.altPreset !== chapters[i - 1].music.preset) c.music.preset = era.altPreset;
    else {
      const k = CYCLE.indexOf(c.music.preset);
      c.music.preset = CYCLE[(Math.max(k, 0) + 3) % CYCLE.length];
    }
  }
  if (era && !s.style && !s.medium && c.style === chapters[i - 1].style) {
    const alt = { id: era.b, ...MEDIA[era.b] };
    c._medium = alt;
    if (!s.look && !opt.look) c._look = alt.look;
    c.style = zh ? alt.zh : alt.en;
    c.styleAlt = zh ? alt.en : alt.zh;
    if (!s.palette) c.palette = alt.palette;
    if (!s.frame) c.frame = { family: alt.frame, color: '#7a5a3a', accent: c.palette[1] };
    if (!s.prop) c.prop = { type: 'pennant', colors: [c.palette[1], c.palette[2]] };
  }
}

// ---------------------------------------------------------------------------- config
const cfgFile = P('src/data/film.config.js');
let cfg = fs.readFileSync(cfgFile, 'utf8');
const q = (v) => JSON.stringify(String(v));
function setLine(key, value, indent = '  ') {
  const re = new RegExp(`^${indent}(// )?${key}: [^\\n]*$`, 'm');
  if (!re.test(cfg)) fail(`film.config.js: could not find "${key}"`);
  cfg = cfg.replace(re, `${indent}${key}: ${value},`);
}
const demo = !!opt.demo;
if (!demo) {
  setLine('title', q(opt.title || (zh ? 'TODO 片名' : 'TODO Film title')));
  setLine('subtitle', q(opt.subtitle || (zh ? 'TODO 副標題' : 'TODO subtitle')));
  setLine('subtitleAlt', q(opt.subtitleAlt ?? ''));
  setLine('quote', q(opt.quote || (zh ? '「TODO 一句開場引言」' : '“TODO one-line opening quote”')));
  setLine('headline', q(opt.headline || (zh ? 'TODO 終章標語' : 'TODO outro headline')), '    ');
  setLine('summary', q(opt.summary || (zh ? 'TODO 一句話總結' : 'TODO one-line summary')), '    ');
  setLine('closing', q(opt.closing || (zh ? 'TODO 結語' : 'TODO closing line')), '    ');
  setLine('credits', q(opt.credits || (zh ? '100% 程式即時生成的動畫時間軸 · 史料出處見畫廊頁' : '100% procedurally generated timeline · sources in the gallery')), '    ');
}
setLine('lang', q(lang));
setLine('staging', q(`${stage}+${character}`));
if (opt.bpm) setLine('bpm', Number(opt.bpm));
if (opt.introBars) setLine('introBars', Math.max(2, Number(opt.introBars)));
if (opt.outroBars) setLine('outroBars', Math.max(6, Number(opt.outroBars)));
if (opt.secondsPerChapter) {
  setLine('secondsPerChapter', Number(opt.secondsPerChapter));
  cfg = cfg.replace(/^  barsPerChapter: .*,$/m, '  // barsPerChapter: 4,');
} else if (opt.barsPerChapter) setLine('barsPerChapter', Number(opt.barsPerChapter));
if (opt.hat) setLine('hat', q(opt.hat), '    ');
if (opt.transpose !== undefined) setLine('transpose', Number(opt.transpose), '    ');
if (opt.intro) setLine('intro', q(opt.intro), '    ');
if (opt.outro) setLine('outro', q(opt.outro), '    ');
if (opt.bed) setLine('bed', q(opt.bed), '    ');
fs.writeFileSync(cfgFile, cfg);

// ---------------------------------------------------------------------------- chapters.js + scenes
const sceneKind = opt.sceneKind || (stage === 'easel' ? 'wide' : 'square');
let sceneIds = [];
if (!demo) {
  const chFile = P('src/data/chapters.js');
  const head = fs.readFileSync(chFile, 'utf8').split('export const CHAPTERS')[0];
  const body = `export const CHAPTERS = ${JSON.stringify(chapters, null, 2)};\n`;
  fs.writeFileSync(chFile, `${head}// Generated by new_film.mjs — replace every TODO (node <skill>/scripts/check_film.mjs . lists them).\n${body}`);

  // remove the demo scenes and write a clean registry for this film's scene ids
  for (const f of ['tablet.js', 'quill.js', 'ballpoint.js']) fs.rmSync(P('src/scenes', f), { force: true });
  sceneIds = [...new Set(chapters.map((c) => c.scene || c.id))];
  const idxFile = P('src/scenes/index.js');
  let idx = fs.readFileSync(idxFile, 'utf8');
  idx = idx.replace(/^import \* as [A-Za-z0-9_$]+ from '\.\/[^']+';\n/gm, '');
  idx = idx.replace(/import \{ renderPlaceholder \} from '\.\/placeholder\.js';\n/, (m) => m + sceneIds.map((id) => `import * as ${id} from './${id}.js';\n`).join(''));
  idx = idx.replace(/export const SCENE_MODULES = \{[\s\S]*?\n\};/, `export const SCENE_MODULES = {\n${sceneIds.map((id) => `  ${id},`).join('\n')}\n};`);
  fs.writeFileSync(idxFile, idx);
  for (const id of sceneIds) {
    const c0 = chapters.find((x) => (x.scene || x.id) === id);
    const look = opt.look === 'plain' || c0._look === 'plain' ? null : c0._look;
    const kindArgs = look ? ['--look', look] : sceneKind === 'wide' ? ['--wide'] : [];
    const r = spawnSync(process.execPath, ['tools/new-scene.mjs', id, '--force', ...kindArgs], { cwd: DIR, encoding: 'utf8' });
    if (r.status !== 0) fail(`new-scene ${id}: ${r.stdout}${r.stderr}`);
    // pre-fill the header with what we know about the chapter
    const c = chapters.find((x) => (x.scene || x.id) === id);
    const f = P('src/scenes', `${id}.js`);
    let src = fs.readFileSync(f, 'utf8');
    src = src.replace('<date> · <title>', `${c.dateLabel} · ${c.title}`);
    src = src.replace('<the art medium of this chapter — what makes it unmistakable at a glance>', `${c.style} (${c.styleAlt}) — <fill in: what makes it unmistakable at a glance; references/art-media.md>`);
    if (sceneKind === 'square') src = src.replace("['#e9dcc0', '#2a2622', '#7a8c6e', '#c9a45c']", JSON.stringify(c.palette.slice(0, 4)).replace(/"/g, "'"));
    fs.writeFileSync(f, src);
  }

  // research/fact-sheet.md
  fs.mkdirSync(P('research'), { recursive: true });
  const fsLines = [
    `# Fact sheet — ${opt.title || 'TODO'}`,
    '',
    'One section per chapter (heading must contain the chapter id). Template + rules: <skill>/references/content-research.md.',
    'check_film.mjs requires every section to have Sources and Do-not-claim entries.',
    '',
  ];
  for (const c of chapters) {
    // spec chapters may carry the research too: claim, when, visual, doNotClaim, hedged, justified
    const s = c._spec || {};
    const realFacts = (c.facts || []).filter((f) => !/\bTODO\b/.test(f));
    const realSources = (c.sources || []).filter((x) => x && /^https?:\/\/[^/\s]+\.[^/\s]+/.test(x.url || ''));
    fsLines.push(
      `## ${c.id} · ${c.dateLabel} · ${c.title}`,
      '',
      `- **Claim (one sentence the chapter makes):** ${s.claim || 'TODO'}`,
      `- **Date / place / people:** ${s.when || 'TODO'}`,
      `- **Visual facts for the scene (what it looked like: machine, tools, costume, setting):** ${s.visual || 'TODO'}`,
      '- **Facts for the info card (2–4, each with its source):**',
      ...(realFacts.length ? realFacts.map((f, k) => `  ${k + 1}. ${f}`) : ['  1. TODO — [source]']),
      '- **Sources:**',
      ...(realSources.length ? realSources.map((x) => `  - ${x.label} — ${x.url}`) : ['  - TODO label — https://']),
      `- **Do not claim:** ${s.doNotClaim || 'TODO (contested firsts, exact numbers you could not verify, legends)'}`,
      `- **Uncertain / hedged wording used:** ${s.hedged || 'TODO'}`,
      ...(s.justified ? [`- **Strong words justified:** ${s.justified}`] : []),
      '',
    );
  }
  fs.writeFileSync(P('research/fact-sheet.md'), fsLines.join('\n'));
}

// ---------------------------------------------------------------------------- deps
if (opt.nodeModules) {
  const nm = path.resolve(String(opt.nodeModules));
  if (!fs.existsSync(nm)) fail(`--node-modules ${nm} does not exist`);
  fs.rmSync(P('node_modules'), { recursive: true, force: true });
  fs.symlinkSync(nm, P('node_modules'), 'dir');
} else if (opt.install) {
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: DIR, stdio: 'inherit' });
  if (r.status !== 0) console.warn('npm install failed: build.mjs needs esbuild (npm i -D esbuild)');
}

const options = {
  createdWith: 'history-timeline-film/scripts/new_film.mjs',
  skill: SKILL,
  examples: path.join(SKILL, 'references', 'examples'),
  staging: `${stage}+${character}`,
  lang,
  sceneKind,
  demo,
  chapters: chapters.map((c) => ({ id: c.id, year: c.year, preset: c.music.preset, style: c.style, medium: c._medium.id, look: c._look })),
};
fs.writeFileSync(P('film.options.json'), JSON.stringify(options, null, 2) + '\n');

// ---------------------------------------------------------------------------- summary
const v = spawnSync(process.execPath, ['tools/validate.mjs'], { cwd: DIR, encoding: 'utf8' });
console.log(`\nnew film at ${DIR}`);
console.log(`  staging ${stage}+${character} · lang ${lang} · ${demo ? 'demo chapters' : `${N} chapters (scene skeletons: ${opt.look === 'plain' ? sceneKind : 'per-medium looks, both stages'})`}`);
const DOTS = ['', '●', '●●', '●●●'];
const sameLook = chapters.slice(1).map((c, i) => (c._look && c._look === chapters[i]._look ? `${chapters[i].id}/${c.id}` : null)).filter(Boolean);
if (!demo) {
  console.log(`  ${'id'.padEnd(12)} ${'year'.padEnd(6)} ${'preset'.padEnd(20)} ${'look'.padEnd(10)} medium (effort: ● simple · ●● moderate · ●●● rich)`);
  for (const c of chapters) console.log(`  ${c.id.padEnd(12)} ${String(c.year ?? '').padEnd(6)} ${c.music.preset.padEnd(20)} ${String(c._look || sceneKind).padEnd(10)} ${c.style} ${DOTS[c._medium.rating] || ''}`);
}
if (!demo && sameLook.length) console.log(`  note: neighbours share a look (${sameLook.join(', ')}): give them clearly different palettes / subjects, or change one "medium"`);
console.log(v.stdout.trim().split('\n').map((l) => `  ${l}`).join('\n'));
console.log(`\nnext:
  1. research/fact-sheet.md        (references/content-research.md)
  2. src/data/film.config.js + src/data/chapters.js   (replace every TODO)
  3. src/scenes/<id>.js            one per chapter: replace every "// REPLACE:" block (references/scene-contract.md)
  4. node ${path.join(SKILL, 'scripts', 'check_film.mjs')} ${DIR} --draft   while working; without --draft before delivery`);
