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
//   --spec <file.json>           JSON with any of the options below (camelCase) + "chapters": [ {...} ]
//                                (chapter fields as in chapters.js; extra "preset" = music.preset)
//   --title "..."  --subtitle "..."  --subtitle-alt "..."  --quote "..."
//   --lang zh-Hant|en            UI + placeholder language (default zh-Hant, Taiwan usage)
//   --staging <stage>+<char>     or --stage gallery-ride|easel  --character spoonbill|person
//                                (default gallery-ride+spoonbill; easel defaults to person)
//   --hat beret|straw|cap|none   person's hat (default beret)
//   --chapters N                 number of chapters (default 6) — or --ids a,b,c (scene/chapter ids)
//   --years 1900,1950,...        representative year per chapter (drives the auto medium + music)
//   --bpm 120  --bars-per-chapter 4 | --seconds-per-chapter 8  --intro-bars 3  --outro-bars 6
//   --presets p1,p2,...|auto     music preset per chapter (default auto: by year, else a contrast cycle)
//   --intro wind-chimes|pad-swell|none  --outro relay-finale|pad-swell|none  --bed wind|breeze|none
//   --transpose <semitones>
//   --scene-kind square|wide     skeleton type (default: square on gallery-ride, wide on easel)
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

// ---------------------------------------------------------------------------- era table
// Auto suggestions by representative year: medium (style), frame, palette, music preset.
// The author is expected to refine them (references/art-media.md, references/music-presets.md).
const ERA = [
  { to: -500, preset: 'ancient-harp', style: ['古代壁畫浮雕', 'Ancient fresco / relief'], frame: 'stone', palette: ['#e8d6b0', '#b5523b', '#1d6b73', '#d9a441', '#2a1d14'], alt: { preset: 'santur-dastgah', style: ['陶器黑繪', 'Black-figure pottery'], frame: 'stone' } },
  { to: 600, preset: 'santur-dastgah', style: ['古典細密畫', 'Classical miniature painting'], frame: 'gilt', palette: ['#efe2c4', '#1d4e89', '#b23a2b', '#c99a2e', '#2a2017'], alt: { preset: 'guzheng-pentatonic', style: ['水墨畫', 'Ink wash painting'], frame: 'mount' } },
  { to: 1450, preset: 'medieval-recorder', style: ['中世紀泥金手抄本', 'Illuminated manuscript'], frame: 'gilt', palette: ['#f1e4c3', '#b32d2a', '#1f3f8f', '#c99a2e', '#2a2017'], alt: { preset: 'flamenco-guitar', style: ['掛毯刺繡', 'Embroidered tapestry'], frame: 'wood' } },
  { to: 1650, preset: 'baroque-harpsichord', style: ['木刻版畫', 'Woodcut print'], frame: 'paper', palette: ['#efe6d2', '#1b1a18', '#8a3b2a', '#c9b48a', '#4a443a'], alt: { preset: 'flamenco-guitar', style: ['台夫特藍陶磚', 'Delftware tile'], frame: 'tile' } },
  { to: 1800, preset: 'string-quartet', style: ['銅版雕刻科學插圖', 'Copperplate engraving'], frame: 'paper', palette: ['#f2ead8', '#1b1a18', '#7a3b2a', '#a89a7a', '#4a443a'], alt: { preset: 'baroque-harpsichord', style: ['銅版地圖', 'Copperplate map'], frame: 'paper' } },
  { to: 1880, preset: 'victorian-musicbox', style: ['彩色石版印刷', 'Chromolithograph'], frame: 'wood', palette: ['#f0e2c0', '#a8322d', '#2f5d50', '#d9a03f', '#3a2a20'], alt: { preset: 'frontier-banjo', style: ['維多利亞木口版畫', 'Victorian wood engraving'], frame: 'paper' } },
  { to: 1915, preset: 'ragtime-piano', style: ['工程藍圖', 'Engineering blueprint'], frame: 'steel', palette: ['#1f4e8c', '#e8f1ff', '#9cc3e6', '#f2d16b', '#0f2a4d'], alt: { preset: 'victorian-musicbox', style: ['專利圖', 'Patent drawing'], frame: 'paper' } },
  { to: 1945, preset: 'newsreel-brass', style: ['黑白新聞片', 'Black-and-white newsreel'], frame: 'film', palette: ['#e8e2d2', '#9a958a', '#55524b', '#1e1d1b', '#c7c0ad'], alt: { preset: 'ragtime-piano', style: ['裝飾藝術海報', 'Art Deco poster'], frame: 'poster' } },
  { to: 1965, preset: 'cool-jazz-vibes', style: ['世紀中期現代主義海報', 'Mid-century modernist poster'], frame: 'poster', palette: ['#f2ebdc', '#c8102e', '#1d3557', '#f1c40f', '#2a2a2a'], alt: { preset: 'newsreel-brass', style: ['漫畫清線風格', 'Ligne claire comic'], frame: 'paper' } },
  { to: 1980, preset: 'seventies-analog', style: ['絲網印刷海報', 'Screen-printed poster'], frame: 'poster', palette: ['#f3e3c3', '#e85d2a', '#2a6f97', '#f2b134', '#2b2b2b'], alt: { preset: 'cool-jazz-vibes', style: ['漫畫清線風格', 'Ligne claire comic'], frame: 'paper' } },
  { to: 1990, preset: 'synthwave', style: ['合成器浪潮霓虹', 'Synthwave neon'], frame: 'screen', palette: ['#16121f', '#ff4f9a', '#35d0ff', '#ffd166', '#5b2a86'], alt: { preset: 'seventies-analog', style: ['早期電腦介面', 'Early GUI / dot matrix'], frame: 'screen' } },
  { to: 2000, preset: 'chiptune', style: ['像素遊戲', 'Pixel art'], frame: 'screen', palette: ['#c9c5bb', '#3f8fd2', '#2e7d32', '#f2c14e', '#1d1d1d'], alt: { preset: 'synthwave', style: ['早期電腦介面', 'Early GUI / dot matrix'], frame: 'screen' } },
  { to: 2015, preset: 'ambient-fm-bells', style: ['扁平資訊圖表', 'Flat infographic'], frame: 'poster', palette: ['#f4f1ea', '#087e8b', '#ff5a5f', '#3c3c3c', '#c4d7d1'], alt: { preset: 'fm-keys-electro', style: ['衛星地圖', 'Satellite map'], frame: 'screen' } },
  { to: 1e9, preset: 'electro-arps', style: ['數位線框 HUD', 'Wireframe HUD'], frame: 'screen', palette: ['#07131f', '#39d0ff', '#9effc8', '#ffb347', '#1c3b57'], alt: { preset: 'fm-keys-electro', style: ['等角 3D 低多邊形', 'Isometric low-poly 3D'], frame: 'screen' } },
];
const CYCLE = ['ancient-harp', 'medieval-recorder', 'baroque-harpsichord', 'guzheng-pentatonic', 'string-quartet', 'frontier-banjo', 'ragtime-piano', 'newsreel-brass', 'cool-jazz-vibes', 'seventies-analog', 'synthwave', 'chiptune', 'temple-yueqin', 'ambient-fm-bells', 'electro-arps', 'fm-keys-electro'];
const eraOf = (y) => ERA.find((e) => y < e.to) || ERA[ERA.length - 1];

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
  let preset = s.preset || (s.music && s.music.preset) || (presetList && presetList[i]) || (era ? era.preset : CYCLE[(i * 5) % CYCLE.length]);
  const num = i + 1;
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
    style: s.style || (era ? era.style[zh ? 0 : 1] : 'TODO: art medium'),
    styleAlt: s.styleAlt || (era ? era.style[zh ? 1 : 0] : ''),
    palette: s.palette || (era ? era.palette : ['#e9dcc0', '#2a2622', '#7a8c6e', '#c9a45c', '#3d6b6e']),
    frame: s.frame || { family: era ? era.frame : 'wood', color: '#7a5a3a', accent: (s.palette || (era && era.palette) || ['', '#c8102e'])[1] },
    prop: s.prop || { type: 'pennant', colors: [(s.palette || (era && era.palette) || ['', '#c8102e', '#1d3557'])[1], (s.palette || (era && era.palette) || ['', '#c8102e', '#1d3557'])[2]] },
    music: { ...(s.music || {}), preset },
  };
  for (const k of ['scene', 'easel']) if (s[k]) c[k] = s[k];
  return c;
}
const chapters = Array.from({ length: N }, (_, i) => stubChapter(i));
// avoid the same preset / medium on two neighbouring chapters (the look and music should change at
// every bar line): the second of a pair switches to its era's alternative.
for (let i = 1; i < chapters.length; i++) {
  const s = (specChapters && specChapters[i]) || {};
  const era = chapters[i].year !== undefined ? eraOf(chapters[i].year) : null;
  const sp = s.preset || (s.music && s.music.preset);
  if (!sp && !presetList && chapters[i].music.preset === chapters[i - 1].music.preset) {
    if (era && era.alt.preset !== chapters[i - 1].music.preset) chapters[i].music.preset = era.alt.preset;
    else {
      const k = CYCLE.indexOf(chapters[i].music.preset);
      chapters[i].music.preset = CYCLE[(Math.max(k, 0) + 3) % CYCLE.length];
    }
  }
  if (era && !s.style && chapters[i].style === chapters[i - 1].style) {
    chapters[i].style = era.alt.style[zh ? 0 : 1];
    chapters[i].styleAlt = era.alt.style[zh ? 1 : 0];
    if (!s.frame) chapters[i].frame = { ...chapters[i].frame, family: era.alt.frame };
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
    const r = spawnSync(process.execPath, ['tools/new-scene.mjs', id, '--force', ...(sceneKind === 'wide' ? ['--wide'] : [])], { cwd: DIR, encoding: 'utf8' });
    if (r.status !== 0) fail(`new-scene ${id}: ${r.stdout}${r.stderr}`);
    // pre-fill the header with what we know about the chapter
    const c = chapters.find((x) => (x.scene || x.id) === id);
    const f = P('src/scenes', `${id}.js`);
    let src = fs.readFileSync(f, 'utf8');
    src = src.replace('<date> · <title>', `${c.dateLabel} · ${c.title}`);
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
    fsLines.push(
      `## ${c.id} · ${c.dateLabel} · ${c.title}`,
      '',
      '- **Claim (one sentence the chapter makes):** TODO',
      '- **Date / place / people:** TODO',
      '- **Visual facts for the scene (what it looked like: machine, tools, costume, setting):** TODO',
      '- **Facts for the info card (2–4, each with its source):**',
      '  1. TODO — [source]',
      '- **Sources:**',
      '  - TODO label — https://',
      '- **Do not claim:** TODO (contested firsts, exact numbers you could not verify, legends)',
      '- **Uncertain / hedged wording used:** TODO',
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
  chapters: chapters.map((c) => ({ id: c.id, year: c.year, preset: c.music.preset, style: c.style })),
};
fs.writeFileSync(P('film.options.json'), JSON.stringify(options, null, 2) + '\n');

// ---------------------------------------------------------------------------- summary
const v = spawnSync(process.execPath, ['tools/validate.mjs'], { cwd: DIR, encoding: 'utf8' });
console.log(`\nnew film at ${DIR}`);
console.log(`  staging ${stage}+${character} · lang ${lang} · ${demo ? 'demo chapters' : `${N} chapters (${sceneKind} scene skeletons)`}`);
if (!demo) for (const c of chapters) console.log(`  ${c.id.padEnd(12)} ${String(c.year ?? '').padEnd(6)} ${c.music.preset.padEnd(20)} ${c.style}`);
console.log(v.stdout.trim().split('\n').map((l) => `  ${l}`).join('\n'));
console.log(`\nnext:
  1. research/fact-sheet.md        (references/content-research.md)
  2. src/data/film.config.js + src/data/chapters.js   (replace every TODO)
  3. src/scenes/<id>.js            one per chapter (references/scene-contract.md, art-media.md)
  4. node ${path.join(SKILL, 'scripts', 'check_film.mjs')} ${DIR} --draft   while working; without --draft before delivery`);
