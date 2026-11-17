// src/data/chapters.js
// The chapters of the film, in order. N can be anything from ~4 to ~24 (the demo ships 3
// so the template runs out of the box); the timeline, ruler, outro axis and score adapt.
//
// Chapter record
//   id          unique id; also the scene module id unless `scene` is given
//   scene       (optional) module id in src/scenes/index.js (default: id)
//   dateLabel   on-screen date / era label ("約前 3300–3000", "1980s", "第 3 步" ...)
//   ruler       short label for the time ruler / outro axis (≤ 6 CJK chars or ~8 Latin)
//   year        representative number for sorting (optional, informational)
//   title       primary-language title          titleAlt  secondary-language title
//   caption     one-line on-screen caption (placard / canvas)
//   description teaching paragraph (player info card, gallery)
//   facts       [string] bullet facts           specs     one-line technical specs (optional)
//   sources     [{ label, url }]  (shown in the info card and the gallery)
//   style       the art medium this chapter is drawn in (shown in UI)   styleAlt  same, other language
//   palette     [5 hex colours] the scene's own colours (placeholder + thumbnails use them)
//   frame       { family, color, accent }  gallery-ride frame: gilt | wood | stone | mount |
//               tile | paper | poster | film | screen | steel
//   prop        what the character carries in this chapter, e.g. { type: 'pennant', colors: [...] }
//               types: see src/kit/props.js (paper | sail | panemone | chinese | post | multiblade |
//               three | two | darrieus | pennant | balloon | lantern | none)
//   easel       (optional, easel stage) { crop: [x, y, w, h] miniature source in the 1920x1080 valley,
//               ink, dateInk, seal } colours of the painted board
//   music       { preset, mode?, loudDb?, wind?, swing?, human? }  preset ids: src/audio/presets.js
//               (`node tools/presets.mjs` lists them). mode overrides the preset's default mode.

export const CHAPTERS = [
  {
    id: 'tablet',
    dateLabel: '約前 3300–3000',
    ruler: '前3200',
    year: -3200,
    title: '泥板與蘆葦筆',
    titleAlt: 'Clay & Reed',
    caption: '兩河流域：把削尖的蘆葦壓進濕泥板，記下穀物與牲畜',
    description:
      '約公元前 3300–3000 年，兩河流域南部的烏魯克等城市出現了最早的「原始楔形文字」泥板，內容大多是記帳：穀物、牲畜、配給與勞役。書寫者用削尖的蘆葦桿在濕黏土上壓出筆畫，筆尖斜壓留下的三角形痕跡，後來演變成楔形文字。泥板曬乾或燒製後可以保存數千年，今天我們讀得到的五千年前帳本，就是這樣留下來的。',
    facts: [
      '已知最早的原始楔形文字泥板大多出土於烏魯克（約前 3300–3100 年），以行政記帳為主。',
      '筆畫呈楔形，是因為蘆葦筆的三角形筆尖斜斜壓進泥中，而不是刻出來的。',
      '楔形文字被兩河流域多種語言沿用了約三千年。',
    ],
    specs: '削尖的蘆葦筆＋濕黏土板；壓印成字；曬乾或燒製保存',
    sources: [
      { label: 'Wikipedia — Cuneiform', url: 'https://en.wikipedia.org/wiki/Cuneiform' },
      { label: 'Wikipedia — Proto-cuneiform', url: 'https://en.wikipedia.org/wiki/Proto-cuneiform' },
    ],
    style: '蘇美浮雕與泥板',
    styleAlt: 'Sumerian relief & clay tablet',
    palette: ['#dcc29a', '#8a5a3b', '#3d6b6e', '#c48a3a', '#2a1d14'],
    frame: { family: 'stone', color: '#b9a07a', accent: '#3d6b6e' },
    prop: { type: 'pennant', colors: ['#c48a3a', '#3d6b6e'] },
    music: { preset: 'ancient-harp' },
  },
  {
    id: 'quill',
    dateLabel: '約 6–19 世紀',
    ruler: '中世紀',
    year: 1200,
    title: '鵝毛筆與手抄本',
    titleAlt: 'Quill & Parchment',
    caption: '修道院抄寫室：鵝毛筆沾鐵膽墨，一字一字抄在羊皮紙上',
    description:
      '從約 6 世紀到 19 世紀，鵝毛筆是歐洲最主要的書寫工具。抄寫員把飛羽的羽管泡軟、硬化後，削出斜口與筆縫，沾墨書寫；常用的鐵膽墨由五倍子（蟲癭）萃取液與硫酸亞鐵調成，寫在處理過的獸皮——羊皮紙上。修道院的抄寫室以這套工具複製書籍，再用金箔與礦物顏料裝飾首字母，這就是「泥金手抄本」。',
    facts: [
      '7 世紀初，塞維亞的依西多祿在著作中已提到用羽毛書寫，是已知最早的鵝毛筆記載之一。',
      '筆尖寫久會磨鈍，抄寫員隨身帶著小刀隨時重削——英文 penknife（削筆刀）由此得名。',
      '鐵膽墨會由灰黑慢慢轉成深褐，且帶酸性，是古籍保存的一大難題。',
      '19 世紀金屬筆尖大量生產後，鵝毛筆才逐漸退場。',
    ],
    specs: '鵝的飛羽羽管（硬化）＋斜削筆尖與筆縫；鐵膽墨；羊皮紙',
    sources: [
      { label: 'Wikipedia — Quill', url: 'https://en.wikipedia.org/wiki/Quill' },
      { label: 'Wikipedia — Iron gall ink', url: 'https://en.wikipedia.org/wiki/Iron_gall_ink' },
      { label: 'Wikipedia — Illuminated manuscript', url: 'https://en.wikipedia.org/wiki/Illuminated_manuscript' },
    ],
    style: '中世紀泥金手抄本',
    styleAlt: 'Illuminated manuscript',
    palette: ['#f1e4c3', '#b32d2a', '#1f3f8f', '#c99a2e', '#2a2017'],
    frame: { family: 'gilt', color: '#c99a2e', accent: '#b32d2a' },
    prop: { type: 'pennant', colors: ['#b32d2a', '#c99a2e'] },
    music: { preset: 'medieval-recorder' },
  },
  {
    id: 'ballpoint',
    dateLabel: '1938',
    ruler: '1938',
    year: 1938,
    title: '原子筆',
    titleAlt: 'The Ballpoint Pen',
    caption: '筆尖一顆會滾動的小鋼珠：快乾油墨，不再暈開',
    description:
      '1938 年，匈牙利記者比羅·拉斯洛與化學家哥哥比羅·哲爾吉，為一種筆尖裝著小滾珠、使用類似報紙印刷般快乾黏稠油墨的筆，在英國申請專利；兄弟倆移居阿根廷後，於 1943 年取得專利並開始生產。滾珠在書寫時轉動，一面把管內的油墨帶到紙上，一面封住墨管不讓墨水乾掉。戰後大量生產讓價格一路下降，原子筆成了世界上最普及的書寫工具。',
    facts: [
      '早在 1888 年，美國人約翰·勞德就取得滾珠筆專利，用來在皮革上做記號，但在紙上寫起來太粗。',
      '比羅兄弟 1938 年在英國申請專利，1943 年在阿根廷取得專利並設廠生產。',
      '英國皇家空軍曾採用這種筆：它不像鋼筆那樣在高空低氣壓下漏墨。',
      '油墨靠重力流向筆尖，所以一般原子筆倒過來寫不了多久。',
    ],
    specs: '金屬滾珠（約 0.5–1.2 mm）＋黏稠油性墨水＋墨管；靠重力與滾珠帶墨',
    sources: [
      { label: 'Wikipedia — Ballpoint pen', url: 'https://en.wikipedia.org/wiki/Ballpoint_pen' },
      { label: 'Wikipedia — László Bíró', url: 'https://en.wikipedia.org/wiki/L%C3%A1szl%C3%B3_B%C3%ADr%C3%B3' },
    ],
    style: '世紀中期現代主義海報',
    styleAlt: 'Mid-century modernist poster',
    palette: ['#f2ebdc', '#c8102e', '#1d3557', '#f1c40f', '#2a2a2a'],
    frame: { family: 'poster', color: '#9aa0a6', accent: '#c8102e' },
    prop: { type: 'pennant', colors: ['#f1c40f', '#1d3557'] },
    music: { preset: 'cool-jazz-vibes' },
  },
];
