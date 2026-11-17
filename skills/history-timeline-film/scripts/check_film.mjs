#!/usr/bin/env node
// scripts/check_film.mjs — run every QA gate on a film project and print a pass/fail table.
//
//   node <skill>/scripts/check_film.mjs <projectDir> [options]
//
//   --draft            content gates (TODO markers, skeleton scenes, fact sheet) WARN instead of FAIL
//   --staging s+c      check another staging (default: FILM.staging); --all-stagings checks all four
//   --quick            skip audio + determinism-across-pages (fast loop while authoring)
//   --no-audio         skip the audio gate
//   --build            also run tools/build.mjs and load dist/index.html + dist/gallery.html
//   --mp4              also render a short MP4 clip with audio (out/qa/clip.mp4) and probe it
//   --step 0.5         film sweep step in seconds (console-error scan of the whole film)
//   --budget 12        per-scene frame budget in ms (FAIL above)
//   --only id1,id2     render gates for these chapters only
//
// Writes images to <project>/out/qa/ (look at them!) and out/qa/check.json. Exit 1 on any FAIL.
// Gates:
//   validate     tools/validate.mjs (config, chapters, registry, presets, Math.random/Date in scenes)
//   presets      tools/test-presets.mjs (every music preset runs)
//   content      no TODO left, teaching fields filled, sources are URLs
//   zh-Hant      (lang zh-Hant) no simplified characters; mainland terms + ASCII punctuation as warnings
//   facts        research/fact-sheet.md has a section per chapter with Sources + Do-not-claim;
//                strong claims (最早/第一/唯一/first/invented …) in on-screen text listed for re-checking
//   scenes       every chapter has its own scene module, not the untouched skeleton, supports the stage
//   render       per chapter: before / start / mid / end / after + thumbnail; non-blank; < budget ms
//   console      whole-film sweep + player page: no console errors / warnings
//   determinism  same t -> same pixels (same page after a sweep, and a fresh page)
//   sheet        tools/sheet.mjs contact sheet
//   audio        tools/check-audio.mjs --determinism (loudness per chapter, peak, NaN, identical hashes)
//   build / mp4  optional
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------- args
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const dirArg = argv.find((a, i) => !a.startsWith('--') && !['--staging', '--step', '--budget', '--only'].includes(argv[i - 1]));
if (!dirArg) {
  console.log('usage: node check_film.mjs <projectDir> [--draft] [--staging s+c | --all-stagings] [--quick] [--no-audio] [--build] [--mp4] [--step 0.5] [--budget 12] [--only a,b]');
  process.exit(1);
}
const ROOT = path.resolve(dirArg);
if (!fs.existsSync(path.join(ROOT, 'src/data/film.config.js'))) {
  console.error(`${ROOT} is not a film project (no src/data/film.config.js)`);
  process.exit(1);
}
const DRAFT = flag('--draft');
const QUICK = flag('--quick');
const STEP = Number(val('--step', 0.5));
const BUDGET = Number(val('--budget', 12));
const ONLY = val('--only', null) ? val('--only').split(',') : null;
const QA = path.join(ROOT, 'out', 'qa');
fs.mkdirSync(QA, { recursive: true });

const rows = [];
const add = (gate, status, detail = '') => {
  rows.push({ gate, status, detail });
  const mark = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'skip' }[status];
  console.log(`  [${mark}] ${gate.padEnd(22)} ${detail.split('\n')[0]}`);
};
const contentFail = DRAFT ? 'WARN' : 'FAIL';
const run = (args, opts = {}) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
const tail = (s, n = 6) => s.trim().split('\n').slice(-n).join(' | ');

const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { FILM } = await imp('src/data/film.config.js');
const { CHAPTERS } = await imp('src/data/chapters.js');
const zh = (FILM.lang || 'zh-Hant') !== 'en';
const cfgStaging = String(FILM.staging || 'gallery-ride+spoonbill');
const stagings = flag('--all-stagings') ? ['gallery-ride+spoonbill', 'gallery-ride+person', 'easel+person', 'easel+spoonbill'] : [val('--staging', cfgStaging)];

console.log(`check_film: ${FILM.title} · ${CHAPTERS.length} chapters · ${stagings.join(', ')}${DRAFT ? ' · draft' : ''}`);

// ---------------------------------------------------------------------------- static gates
{
  const r = run(['tools/validate.mjs']);
  const warns = (r.stdout.match(/warn:/g) || []).length;
  add('validate', r.status === 0 ? (warns ? 'WARN' : 'PASS') : 'FAIL', `${warns} warning(s) · ${tail(r.stdout, r.status === 0 ? 1 : 4)}`);
  if (warns) for (const l of r.stdout.split('\n').filter((l) => l.includes('warn:'))) console.log(`        ${l.trim()}`);
}
{
  const r = run(['tools/test-presets.mjs']);
  add('presets', r.status === 0 ? 'PASS' : 'FAIL', tail(r.stdout + r.stderr, 1));
}

const chaptersSrc = fs.readFileSync(path.join(ROOT, 'src/data/chapters.js'), 'utf8');
const configSrc = fs.readFileSync(path.join(ROOT, 'src/data/film.config.js'), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');

{
  // content completeness
  const issues = [];
  const todo = (s) => /\bTODO\b/.test(s);
  if (todo(stripComments(configSrc))) issues.push('film.config.js still has TODO');
  for (const c of CHAPTERS) {
    const t = `${c.id}:`;
    if (todo(JSON.stringify(c))) issues.push(`${t} TODO left`);
    if (!c.description || c.description.length < 40) issues.push(`${t} description too short`);
    if (!Array.isArray(c.facts) || c.facts.length < 2) issues.push(`${t} fewer than 2 facts`);
    if (!c.style) issues.push(`${t} no style (art medium)`);
    const src = (c.sources || []).filter((s) => s && /^https?:\/\/[^/\s]+\.[^/\s]+/.test(s.url || ''));
    if (!src.length) issues.push(`${t} no source with a real URL`);
    if (zh && c.caption && [...c.caption].length > 34) issues.push(`${t} caption long (${[...c.caption].length} chars; aim ≤ 30)`);
  }
  add('content', issues.length ? contentFail : 'PASS', issues.length ? `${issues.length} issue(s): ${issues.slice(0, 4).join('; ')}${issues.length > 4 ? ' …' : ''}` : `${CHAPTERS.length} chapters complete`);
  if (issues.length > 4) for (const i of issues.slice(4, 30)) console.log(`        ${i}`);
}

// Traditional Chinese (Taiwan usage)
if (zh) {
  // simplified-only characters (never valid in Traditional Chinese text)
  const SIMP = '这们来时个为说国会对发经过还进动样现开关问长见点从种实学门间头东车风电机号书写图简历万与业两严临乐习乡买乱争亏亚产亲亿仅仓仪价众优伙伟传伤伦体佣侠侣侦侧俭债倾偿储儿兑党兰兴兹养兽冈册军农冯冲决况冻净凉减凑凤凭凯击凿刍刘则刚创删别剂剧劝办务励劲劳势勋匀华协单卖卢卫却厂厅厉压厌县参双变叙叹吓吗启吴员呜咏响哑唤团园围圆圣场坏块坚坛坝垄垒垫处备复头夹夺奋奖妇妈娄娱孙宁宝宠审宪宫宽宾寻导寿将尔尘尝层属岁岂岗岛岭峡币帅师帐帜带帮庆库应庙废异弃张弯弹归当录彻径忆忧怀态怜总恋恳恶悬惊惧惨惯愤战戏执扩扫扬扰抚抛抢护报担拟拥拦择挡挤挥损换据摄摆摇敌数斋断无旧显晋晒晓暂杀杂权条杨极构枪柜标栏树桥档梦检楼欢欧残毁毕气汇汉汤沟没泪泽洁浅测济浏浓涛润涨渐湾湿满滚灭灯灵灾炉炼烂烟热爱爷牵犹状独狮献环画畅疗疯痒盖盘矿码砖础确礼祸离积称稳穷窃竞笔笋签类粮紧纪约红纤级纯纳纸纹线练组细织终绍结绕给络绝统继绩续维绿编缘罗罚职联聪肃脑舰艺节苏荣药莱获虽蚁补装观规视览觉计订认讨让训议记讲许论设访证评识诉词译试诗诚话该详语误请读课谁调谈谢贝负贡财责贤败货质购贵费贸资赏赛赞赵赶趋跃践踪轨转轮软轻载较辅辆输辞边达迁运远违连迟选递遗邮邻郑酱释针钟钢钱铁铜银铺链销锁锅错键镜闪闭闲闻阀阅队阳阴阵阶际陆陈险随隐难雾韩页顶项顺须顾顿预领频题颜额飞饭饮饰馆驱驶验骑鱼鲁鸟鸡鸣麦黄齐龙龟';
  const SIMP_SET = new Set([...SIMP]);
  const TERMS = [
    ['视频', '影片'], ['視頻', '影片'], ['软件', '軟體'], ['軟件', '軟體'], ['硬件', '硬體'], ['網絡', '網路'], ['互聯網', '網際網路'],
    ['默認', '預設'], ['屏幕', '螢幕'], ['鼠標', '滑鼠'], ['打印', '列印'], ['激光', '雷射'], ['宇航員', '太空人'], ['航天', '太空／航太'],
    ['出租車', '計程車'], ['短信', '簡訊'], ['內存', '記憶體'], ['芯片', '晶片'], ['服務器', '伺服器'], ['數字化', '數位化'],
    ['人工智能', '人工智慧'], ['數據庫', '資料庫'], ['集成電路', '積體電路'], ['晶體管', '電晶體'], ['光盤', '光碟'], ['硬盤', '硬碟'],
    ['公交車', '公車'], ['導彈', '飛彈'], ['新西蘭', '紐西蘭'], ['意大利', '義大利'], ['悉尼', '雪梨'], ['卡塔爾', '卡達'],
    ['肯尼亞', '肯亞'], ['尼日利亞', '奈及利亞'], ['信息', '資訊／訊息'], ['博客', '部落格'], ['質量', '品質（物理「質量」可）'],
    ['程序員', '程式設計師'], ['攝像頭', '攝影機／鏡頭'], ['視頻', '影片'], ['土豆', '馬鈴薯'],
  ];
  const files = [['film.config.js', configSrc], ['chapters.js', chaptersSrc], ['i18n.js', fs.readFileSync(path.join(ROOT, 'src/data/i18n.js'), 'utf8')]];
  for (const f of fs.readdirSync(path.join(ROOT, 'src/scenes'))) if (f.endsWith('.js')) files.push([`scenes/${f}`, fs.readFileSync(path.join(ROOT, 'src/scenes', f), 'utf8')]);
  const bad = [];
  const warnTerms = [];
  const punct = [];
  for (const [name, text] of files) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const hits = [...line].filter((ch) => SIMP_SET.has(ch));
      if (hits.length) bad.push(`${name}:${i + 1} ${[...new Set(hits)].join('')}`);
      for (const [term, tw] of TERMS) if (line.includes(term)) warnTerms.push(`${name}:${i + 1} 「${term}」→「${tw}」`);
      if (!name.startsWith('scenes/') && /[一-鿿][,;:?!]|[,;:?!][一-鿿]/.test(line.replace(/\/\/.*$/, ''))) punct.push(`${name}:${i + 1}`);
    });
  }
  const st = bad.length ? 'FAIL' : warnTerms.length || punct.length ? 'WARN' : 'PASS';
  const detail = bad.length
    ? `simplified characters: ${bad.slice(0, 5).join('; ')}`
    : `${warnTerms.length} mainland term(s), ${punct.length} ASCII-punctuation line(s)${warnTerms.length ? ': ' + warnTerms.slice(0, 3).join('; ') : ''}${punct.length ? ' · punct at ' + punct.slice(0, 3).join(', ') : ''}`;
  add('zh-Hant', st, detail);
  for (const l of [...bad.slice(5, 20), ...warnTerms.slice(3, 15)]) console.log(`        ${l}`);
} else add('zh-Hant', 'SKIP', `lang ${FILM.lang}`);

{
  // fact sheet + strong-claim list
  const fsFile = path.join(ROOT, 'research', 'fact-sheet.md');
  const issues = [];
  if (!fs.existsSync(fsFile)) issues.push('research/fact-sheet.md missing');
  else {
    const md = fs.readFileSync(fsFile, 'utf8');
    const sections = md.split(/^## /m).slice(1);
    for (const c of CHAPTERS) {
      const s = sections.find((x) => x.split('\n')[0].includes(c.id));
      if (!s) {
        issues.push(`${c.id}: no "## ${c.id} …" section`);
        continue;
      }
      if (/\bTODO\b/.test(s)) issues.push(`${c.id}: TODO in fact sheet`);
      if (!/https?:\/\/\S+\.\S+/.test(s)) issues.push(`${c.id}: no source URL in fact sheet`);
      if (!/do not claim|do-not-claim|不要宣稱|避免宣稱/i.test(s)) issues.push(`${c.id}: no "Do not claim" entry`);
    }
  }
  const STRONG = /(最早|第一[個座台部位次]?|首次|首座|首創|唯一|世界最大|全球最大|發明了|史上最|always|the first|first ever|only one|invented|largest|biggest|oldest)/gi;
  const strong = [];
  for (const c of CHAPTERS) {
    const text = [c.title, c.caption, c.description, ...(c.facts || [])].join(' ');
    const m = text.match(STRONG);
    if (m) strong.push(`${c.id}: ${[...new Set(m)].join('/')}`);
  }
  const st = issues.length ? contentFail : strong.length ? 'WARN' : 'PASS';
  add('facts', st, `${issues.length ? issues.slice(0, 3).join('; ') + ' · ' : ''}${strong.length ? `strong claims to re-check against sources: ${strong.slice(0, 4).join('; ')}` : 'no strong-claim words'}`);
  for (const l of [...issues.slice(3, 20), ...strong.slice(4, 30)]) console.log(`        ${l}`);
}

{
  // scene modules
  const idx = fs.readFileSync(path.join(ROOT, 'src/scenes/index.js'), 'utf8');
  const issues = [];
  const stageIds = [...new Set(stagings.map((s) => s.split('+')[0]))];
  for (const c of CHAPTERS) {
    const id = c.scene || c.id;
    const f = path.join(ROOT, 'src/scenes', `${id}.js`);
    if (!fs.existsSync(f)) {
      issues.push(`${c.id}: src/scenes/${id}.js missing (placeholder renders)`);
      continue;
    }
    const src = fs.readFileSync(f, 'utf8');
    if (src.includes('<the art medium of this chapter')) issues.push(`${c.id}: ${id}.js is still the new-scene skeleton`);
    if (!idx.includes(`'./${id}.js'`)) issues.push(`${c.id}: ${id}.js not imported in scenes/index.js`);
    const m = src.match(/export const meta\s*=\s*\{\s*stages:\s*\[([^\]]*)\]/);
    if (m) for (const sid of stageIds) if (!m[1].includes(`'${sid}'`) && !m[1].includes(`"${sid}"`)) issues.push(`${c.id}: meta.stages lacks '${sid}' (placeholder on that stage)`);
  }
  add('scenes', issues.length ? contentFail : 'PASS', issues.length ? `${issues.length}: ${issues.slice(0, 3).join('; ')}` : `${CHAPTERS.length} scene modules`);
  for (const l of issues.slice(3, 30)) console.log(`        ${l}`);
}

// ---------------------------------------------------------------------------- browser gates
let browserMod;
try {
  browserMod = await imp('tools/browser.mjs');
} catch (e) {
  add('render', 'FAIL', `cannot load Playwright via tools/browser.mjs: ${e.message.split('\n')[0]}`);
}

/** In-page: stats of the main canvas (blank check) + a content hash. */
async function canvasStats(page, withHash = false) {
  return page.evaluate((h) => {
    const c = document.querySelector('#canvas-host canvas');
    const s = document.createElement('canvas');
    s.width = 96;
    s.height = 54;
    const g = s.getContext('2d');
    g.drawImage(c, 0, 0, 96, 54);
    const d = g.getImageData(0, 0, 96, 54).data;
    let sum = 0;
    let sum2 = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += y;
      sum2 += y * y;
    }
    const mean = sum / n;
    const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    return { mean, sd, url: h ? c.toDataURL('image/png') : null };
  }, withHash);
}
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 10);

/** In-page strip builder: copies the main canvas into a labelled cell of a strip canvas. */
async function stripInit(page, cols, rows, cw, chh) {
  await page.evaluate(([cols, rows, cw, chh]) => {
    const s = document.createElement('canvas');
    s.width = cols * cw;
    s.height = rows * (chh + 22);
    const g = s.getContext('2d');
    g.fillStyle = '#222';
    g.fillRect(0, 0, s.width, s.height);
    window.__qaStrip = { s, g, cw, chh, cols, k: 0 };
  }, [cols, rows, cw, chh]);
}
async function stripAdd(page, label) {
  await page.evaluate((label) => {
    const q = window.__qaStrip;
    const c = document.querySelector('#canvas-host canvas');
    const x = (q.k % q.cols) * q.cw;
    const y = Math.floor(q.k / q.cols) * (q.chh + 22);
    const sc = Math.min(q.cw / c.width, q.chh / c.height);
    q.g.drawImage(c, x + (q.cw - c.width * sc) / 2, y, c.width * sc, c.height * sc);
    q.g.fillStyle = '#eee';
    q.g.font = '14px monospace';
    q.g.fillText(label, x + 6, y + q.chh + 16);
    q.k++;
  }, label);
}
async function stripSave(page, file) {
  const b64 = await page.evaluate(() => window.__qaStrip.s.toDataURL('image/jpeg', 0.85).split(',')[1]);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

const looks = [];
if (browserMod) {
  for (const staging of stagings) {
    const tag = stagings.length > 1 ? ` (${staging})` : '';
    const sdir = path.join(QA, staging.replace('+', '_'));
    fs.mkdirSync(sdir, { recursive: true });
    const query = staging === cfgStaging && !val('--staging') ? '' : `?staging=${encodeURIComponent(staging)}`;
    let host;
    try {
      host = await browserMod.openRenderHost({ query });
    } catch (e) {
      add(`render${tag}`, 'FAIL', `render host did not boot: ${e.message.split('\n')[0]}`);
      continue;
    }
    const { page, errors, close } = host;
    try {
      const info = await page.evaluate(() => window.__FILM_INFO__);
      const cs = info.chapterSec;
      // ---- per-chapter scene renders
      const sceneIssues = [];
      const slow = [];
      let worst = 0;
      const times = [
        ['before', -0.5 * cs],
        ['start', 0.06 * cs],
        ['mid', 0.5 * cs],
        ['end', 0.97 * cs],
        ['after', 1.5 * cs],
      ];
      for (const ch of info.chapters) {
        if (ONLY && !ONLY.includes(ch.id)) continue;
        await stripInit(page, 6, 1, 360, info.sceneH / info.sceneW > 0.8 ? 360 : 203);
        for (const [label, lt] of times) {
          await page.evaluate(([id, l]) => window.renderPanelAt(id, l), [ch.id, lt]);
          const st = await canvasStats(page);
          if (label === 'mid' && st.sd < 3) sceneIssues.push(`${ch.id}: mid frame looks blank (luma sd ${st.sd.toFixed(1)})`);
          await stripAdd(page, `${label} ${lt.toFixed(2)}s`);
        }
        await page.evaluate((id) => window.renderPanelAt(id, window.__FILM_INFO__.chapterSec / 2, null, { isThumbnail: true }), ch.id);
        const th = await canvasStats(page);
        if (th.sd < 3) sceneIssues.push(`${ch.id}: thumbnail looks blank`);
        await stripAdd(page, 'thumbnail');
        const file = path.join(sdir, `scene_${String(ch.num).padStart(2, '0')}_${ch.id}.jpg`);
        await stripSave(page, file);
        looks.push(file);
        const ms = await page.evaluate(async (id) => {
          const cs = window.__FILM_INFO__.chapterSec;
          await window.renderPanelAt(id, 1);
          const t0 = performance.now();
          for (let k = 0; k < 30; k++) await window.renderPanelAt(id, (k / 30) * cs);
          return (performance.now() - t0) / 30;
        }, ch.id);
        worst = Math.max(worst, ms);
        if (ms > BUDGET) slow.push(`${ch.id} ${ms.toFixed(1)} ms`);
      }
      add(`render${tag}`, sceneIssues.length ? 'FAIL' : 'PASS', sceneIssues.length ? sceneIssues.slice(0, 3).join('; ') : `${ONLY ? ONLY.length : info.chapters.length} chapters × 5 times + thumbnail -> ${path.relative(ROOT, sdir)}/scene_*.jpg`);
      add(`perf${tag}`, slow.length ? 'FAIL' : 'PASS', slow.length ? `over ${BUDGET} ms: ${slow.join(', ')}` : `worst scene ${worst.toFixed(2)} ms / frame (budget ${BUDGET})`);

      // ---- whole-film sweep (console errors) + film strip
      const keyT = [info.introSec * 0.5, info.introSec - 0.3];
      for (const ch of info.chapters) keyT.push(ch.t0 + 0.15, ch.t0 + cs * 0.5);
      keyT.push(info.outroStart + 0.5, info.outroStart + (info.total - info.outroStart) * 0.45, info.total - 0.3);
      const cols = 4;
      await stripInit(page, cols, Math.ceil(keyT.length / cols), 480, 270);
      for (const t of keyT) {
        await page.evaluate((tt) => window.renderAt(tt), t);
        await stripAdd(page, `t=${t.toFixed(2)}`);
      }
      const filmStrip = path.join(sdir, 'film_keyframes.jpg');
      await stripSave(page, filmStrip);
      looks.push(filmStrip);
      const n0 = errors.length;
      const sweep = await page.evaluate(async (step) => {
        const total = window.__FILM_INFO__.total;
        let n = 0;
        const t0 = performance.now();
        for (let t = 0; t <= total; t += step) {
          await window.renderAt(t);
          n++;
        }
        return { n, ms: (performance.now() - t0) / n };
      }, STEP);
      add(`console${tag}`, errors.length ? 'FAIL' : 'PASS', errors.length ? `${errors.length} console error(s)/warning(s): ${errors.slice(0, 2).join(' | ')}` : `${sweep.n} frames swept every ${STEP} s, none (avg ${sweep.ms.toFixed(1)} ms / film frame, info only)`);
      if (errors.length > 2) for (const e of errors.slice(2, 12)) console.log(`        ${e}`);
      void n0;

      // ---- determinism
      const probe = [info.introSec * 0.5, info.chapters[Math.floor(info.chapters.length / 2)].t0 + cs * 0.37, info.outroStart + 2.1];
      const hashesA = [];
      for (const t of probe) {
        await page.evaluate((tt) => window.renderAt(tt), t);
        hashesA.push(md5((await canvasStats(page, true)).url));
      }
      let detOk = true;
      let detail = `${probe.length} frames identical after the sweep`;
      // first render of those frames happened during the key-frame strip; compare with a fresh page
      if (!QUICK) {
        const h2 = await browserMod.openRenderHost({ query });
        try {
          const hashesB = [];
          for (const t of probe) {
            await h2.page.evaluate((tt) => window.renderAt(tt), t);
            hashesB.push(md5((await canvasStats(h2.page, true)).url));
          }
          if (hashesB.join() !== hashesA.join()) {
            detOk = false;
            detail = `fresh page differs: ${hashesA.join(',')} vs ${hashesB.join(',')}`;
          } else detail = `${probe.length} frames identical across pages (${hashesA.join(',')})`;
        } finally {
          await h2.close();
        }
      }
      // re-render the first probe once more on the same page
      await page.evaluate((tt) => window.renderAt(tt), probe[0]);
      if (md5((await canvasStats(page, true)).url) !== hashesA[0]) {
        detOk = false;
        detail = 'same page, same t, different pixels';
      }
      add(`determinism${tag}`, detOk ? 'PASS' : 'FAIL', detail);
    } catch (e) {
      add(`render${tag}`, 'FAIL', `exception: ${e.message.split('\n')[0]}`);
    } finally {
      await close();
    }

    // ---- player page (UI, info card) boots without errors
    try {
      const h = await browserMod.openRenderHost({ page: 'index.html', query });
      await h.page.waitForTimeout(400);
      const shot = path.join(sdir, 'player.png');
      await h.page.screenshot({ path: shot });
      looks.push(shot);
      add(`player${tag}`, h.errors.length ? 'FAIL' : 'PASS', h.errors.length ? h.errors.slice(0, 2).join(' | ') : 'index.html boots clean');
      await h.close();
    } catch (e) {
      add(`player${tag}`, 'FAIL', e.message.split('\n')[0]);
    }

    // ---- contact sheet
    {
      const out = path.join(sdir, 'sheet.png');
      const r = run(['tools/sheet.mjs', '0.12,0.5,0.88', out, '--staging', staging]);
      const errs = /\[(error|warning|pageerror)\]/.test(r.stdout);
      add(`sheet${tag}`, r.status === 0 && !errs ? 'PASS' : 'FAIL', r.status === 0 ? path.relative(ROOT, out) : tail(r.stdout + r.stderr, 3));
      if (fs.existsSync(out)) looks.push(out);
    }

    // ---- audio
    if (QUICK || flag('--no-audio')) add(`audio${tag}`, 'SKIP', QUICK ? '--quick' : '--no-audio');
    else {
      const r = run(['tools/check-audio.mjs', '--determinism', '--staging', staging, '--json', path.join(sdir, 'audio.json')], { timeout: 600000 });
      const lines = (r.stdout + r.stderr).trim().split('\n');
      const key = lines.filter((l) => /hash|spread|peak|RMS|OK|FAIL|error/i.test(l)).slice(-3).join(' | ');
      add(`audio${tag}`, r.status === 0 ? 'PASS' : 'FAIL', key || tail(r.stdout + r.stderr, 3));
    }
  }
}

// ---------------------------------------------------------------------------- build / mp4
if (flag('--build')) {
  const r = run(['tools/build.mjs']);
  if (r.status !== 0) add('build', 'FAIL', tail(r.stdout + r.stderr, 3) + (/esbuild/.test(r.stderr) ? ' (npm install, or link a node_modules with esbuild)' : ''));
  else {
    add('build', 'PASS', tail(r.stdout, 5));
    try {
      const { startServer } = await imp('tools/serve.mjs');
      const { createRequire } = await import('node:module');
      const req = createRequire(path.join(ROOT, 'tools', 'browser.mjs'));
      const { chromium } = req('playwright');
      const { server, port } = await startServer(path.join(ROOT, 'dist'), 0);
      const browser = await chromium.launch();
      for (const pg of ['index.html', 'gallery.html', 'artifact/index.html']) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errs = [];
        page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
        page.on('pageerror', (e) => errs.push(e.message));
        await page.goto(`http://127.0.0.1:${port}/${pg}`, { waitUntil: 'load' });
        await page.waitForTimeout(2500);
        add(`dist ${pg}`, errs.length ? 'FAIL' : 'PASS', errs.length ? errs.slice(0, 2).join(' | ') : 'loads clean');
        await page.close();
      }
      await browser.close();
      server.close();
    } catch (e) {
      add('dist pages', 'FAIL', e.message.split('\n')[0]);
    }
  }
}
if (flag('--mp4')) {
  const wav = path.join(QA, 'clip.wav');
  const mp4 = path.join(QA, 'clip.mp4');
  const ra = run(['tools/render-audio.mjs', '--out', wav], { timeout: 600000 });
  const intro = (await imp('src/beat/timeline.js')).INTRO_SEC;
  const to = Math.min(intro + 6, (await imp('src/beat/timeline.js')).TOTAL_DURATION);
  const rv = ra.status === 0 ? run(['tools/render.mjs', '--from', '0', '--to', String(to), '--out', mp4, '--audio', wav], { timeout: 900000 }) : ra;
  if (rv.status !== 0) add('mp4', 'FAIL', tail(rv.stdout + rv.stderr, 3));
  else {
    const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
    const streams = pr.stdout.trim().replace(/\n/g, ' | ');
    add('mp4', /h264/.test(streams) && /aac/.test(streams) ? 'PASS' : 'FAIL', `${path.relative(ROOT, mp4)} (${streams})`);
  }
}

// ---------------------------------------------------------------------------- summary
const fails = rows.filter((r) => r.status === 'FAIL');
const warns = rows.filter((r) => r.status === 'WARN');
console.log('\n| gate | status | detail |\n|---|---|---|');
for (const r of rows) console.log(`| ${r.gate} | ${r.status} | ${r.detail.replace(/\|/g, '/').slice(0, 160)} |`);
console.log(`\n${fails.length ? 'FAIL' : 'PASS'}: ${rows.length - fails.length - warns.length} pass, ${warns.length} warn, ${fails.length} fail${DRAFT ? ' (draft mode: content gates are warnings)' : ''}`);
console.log('\nLOOK AT these images before calling the film done (visual review is a gate too):');
for (const f of looks) console.log(`  ${f}`);
fs.writeFileSync(path.join(QA, 'check.json'), JSON.stringify({ title: FILM.title, draft: DRAFT, stagings, rows, images: looks }, null, 2));
process.exit(fails.length ? 1 : 0);
