// src/data/film.config.js
// Film-level settings. Everything that is not per-chapter lives here; the timeline,
// player UI, intro/outro cards, fonts and soundtrack are all derived from it.
//
// Durations: 1 bar = 4 beats = 240 / bpm seconds.
//   intro  = introBars × bar          (min 2 bars; the intro music is written for 3)
//   chapter = barsPerChapter × bar    (or set secondsPerChapter; it is rounded to whole bars)
//   outro  = outroBars × bar          (min 6 bars: time-axis recap + closing line)
//   total  = intro + N × chapter + outro
// With bpm 120, introBars 3, barsPerChapter 4, outroBars 6 and N chapters:
//   total = 6 + 8N + 12 s   (3 demo chapters -> 42 s; 20 chapters -> 2:58)

export const FILM = {
  /** Shown on the intro card, the browser tab, the player badge and the outro credits. */
  title: '書寫的旅程',
  subtitle: '從泥板到原子筆 · 書寫工具簡史',
  /** Secondary-language line under the subtitle ('' to hide). */
  subtitleAlt: 'A Cycling History of Writing Tools',
  /** Intro quote (one line). */
  quote: '「人類花了五千年，讓思想留在手邊。」',
  /** Outro: headline, one-line summary, closing line and a small credits line. */
  outro: {
    headline: '字，一直都在。',
    summary: '從蘆葦筆壓進泥板、鵝毛筆沾墨，到一支會滾動的小鋼珠',
    closing: '下一行，換你來寫。',
    credits: '100% 程式即時生成的動畫時間軸 · 史料出處見畫廊頁',
  },
  /** UI language: 'zh-Hant' (default, Traditional Chinese, Taiwan usage) or 'en'. */
  lang: 'zh-Hant',

  // ---- clock -----------------------------------------------------------------
  bpm: 120,
  introBars: 3,
  barsPerChapter: 4,
  // secondsPerChapter: 8,        // alternative to barsPerChapter (rounded to whole bars)
  outroBars: 6,

  // ---- staging ---------------------------------------------------------------
  /**
   * ONE-LINE SWITCH: '<stage>+<character>'. Ready-made combinations:
   *   'gallery-ride+spoonbill'  rides through framed panels on a museum wall (reference look)
   *   'gallery-ride+person'     the same ride with the stylised human rider
   *   'easel+person'            a painter on a hilltop paints each chapter; the valley below is the scene
   *   'easel+spoonbill'         the spoonbill paints, brush in its bill
   * Try one without editing: index.html?staging=easel+person (or ?stage=easel&character=person;
   * tools: --staging easel+person). `stage` / `character.id` below are derived from it.
   */
  staging: 'gallery-ride+spoonbill',
  /** 'gallery-ride' | 'easel' (set by `staging`; edit `staging` instead). */
  get stage() {
    return this.staging.split('+')[0];
  },
  /**
   * Character options (merged into the character's default style; unknown keys are ignored).
   * spoonbill: plumage, bill, crest, frame (bike) ...   (src/characters/spoonbill.js)
   * person:    skin, hair, hairStyle ('bob'|'short'|'bun'|'ponytail'), top, topShade, trousers,
   *            shoes, hatColor, hatBand, scarf (true/false), scarfColor, scarfStripe, frame ...
   *            (src/characters/person.js)
   * hat (person): 'beret' | 'straw' | 'cap' | 'none'
   */
  character: {
    get id() {
      return FILM.staging.split('+')[1] || 'spoonbill';
    },
    colors: {
      // skin: '#e8b58f', hair: '#3a2a22', top: '#47708c', scarfColor: '#e9c46a',
    },
    hat: 'beret',
  },
  /** Prop the character carries when a chapter does not set one (see src/kit/props.js). */
  defaultProp: { type: 'paper', colors: ['#d9cdb2', '#b8a88a', '#d9cdb2', '#b8a88a'] },

  // ---- look --------------------------------------------------------------------
  /** Film-level palette tokens (wall, title cards, ruler, outro). */
  palette: {
    wall: '#201d19', // museum wall / backdrop
    wallDeep: '#141210',
    ink: '#f3efe4', // primary text on dark
    inkSoft: '#b9d7e2', // secondary text
    inkMuted: '#8fa3ad',
    accent: '#e9c46a', // ruler progress, active marks
    introBg: ['#0b1620', '#111c25'],
    outroBg: ['#0d141b', '#16110d'],
    flow: '170, 214, 230', // intro streamline rgb
  },
  /**
   * Google Fonts families to load (CSS2 API "family=" values). The FONT stacks in
   * src/kit/fonts.js name them; unknown families just fall back to system fonts.
   */
  fonts: [
    'Noto+Serif+TC:wght@400;700;900',
    'Noto+Sans+TC:wght@400;500;700',
    'LXGW+WenKai+TC:wght@400;700',
    'JetBrains+Mono:wght@400;700',
    'UnifrakturMaguntia',
    'IM+Fell+English:ital@0;1',
    'Cormorant+Garamond:wght@500;700',
    'Playfair+Display:wght@700;900',
    'Bebas+Neue',
    'Press+Start+2P',
    'VT323',
  ],

  // ---- soundtrack ----------------------------------------------------------------
  music: {
    /** Global transposition in semitones (the score is written around D; -2 -> C, +3 -> F). */
    transpose: 0,
    /** Intro preset: 'wind-chimes' (pad swell + flute + chimes; bicycle bell if the character cycles) | 'pad-swell' | 'none'. */
    intro: 'wind-chimes',
    /** Outro preset: 'relay-finale' (motif handed through every chapter's lead voice, full cadence) | 'pad-swell' | 'none'. */
    outro: 'relay-finale',
    /** Ambience bed under everything: 'wind' | 'breeze' | 'none'. */
    bed: 'wind',
    /** Bed level multiplier (1 = reference mix). */
    bedLevel: 1,
  },

  /** Seed for anything film-level that needs randomness. */
  seed: 2026,
};
