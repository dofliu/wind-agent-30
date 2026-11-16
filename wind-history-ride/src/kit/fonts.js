// src/kit/fonts.js
// Font stacks used on canvas. Web fonts come from Google Fonts (see index.html <link>);
// every stack falls back to common Traditional-Chinese system fonts so the film still
// renders offline.

const CJK_FALLBACK = '"PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "WenQuanYi Zen Hei"';

export const FONT = {
  /** Museum serif for titles (Traditional Chinese). */
  serif: `"Noto Serif TC", "Songti TC", "PMingLiU", ${CJK_FALLBACK}, serif`,
  /** Clean sans for captions / UI. */
  sans: `"Noto Sans TC", ${CJK_FALLBACK}, sans-serif`,
  /** Brush-like kai for ink / calligraphy scenes. */
  kai: `"LXGW WenKai TC", "BiauKai", "DFKai-SB", "Noto Serif TC", ${CJK_FALLBACK}, serif`,
  /** Code / HMI / terminal. */
  mono: `"JetBrains Mono", "Noto Sans TC", ${CJK_FALLBACK}, monospace`,
  /** Latin display faces for period flavour (Latin text only). */
  blackletter: '"UnifrakturMaguntia", "Old English Text MT", serif',
  engraving: '"IM Fell English", "Cormorant Garamond", Georgia, serif',
  garamond: '"Cormorant Garamond", Georgia, serif',
  didone: '"Playfair Display", Georgia, serif',
  poster: '"Bebas Neue", "Oswald", Impact, sans-serif',
  pixel: '"Press Start 2P", monospace',
  terminal: '"VT323", "JetBrains Mono", monospace',
};

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Noto+Serif+TC:wght@400;700;900',
    'family=Noto+Sans+TC:wght@400;500;700',
    'family=LXGW+WenKai+TC:wght@400;700',
    'family=JetBrains+Mono:wght@400;700',
    'family=UnifrakturMaguntia',
    'family=IM+Fell+English:ital@0;1',
    'family=Cormorant+Garamond:wght@500;700',
    'family=Playfair+Display:wght@700;900',
    'family=Bebas+Neue',
    'family=Press+Start+2P',
    'family=VT323',
    'family=Noto+Naskh+Arabic:wght@500;600',
  ].join('&') +
  '&display=block';

/**
 * Ensure web fonts (including the CJK unicode-range slices for `sampleText`)
 * are loaded before the first canvas draw. Resolves even if offline.
 */
export async function loadFonts(sampleText = '') {
  if (!document.fonts || !document.fonts.load) return;
  const latin = 'AaBbWindPower0123456789';
  const text = sampleText + latin;
  const specs = [
    ['400', 'Noto Serif TC'],
    ['700', 'Noto Serif TC'],
    ['900', 'Noto Serif TC'],
    ['400', 'Noto Sans TC'],
    ['500', 'Noto Sans TC'],
    ['700', 'Noto Sans TC'],
    ['400', 'LXGW WenKai TC'],
    ['700', 'LXGW WenKai TC'],
    ['400', 'JetBrains Mono'],
    ['700', 'JetBrains Mono'],
  ];
  const latinOnly = [
    ['400', 'UnifrakturMaguntia'],
    ['400', 'IM Fell English'],
    ['italic 400', 'IM Fell English'],
    ['500', 'Cormorant Garamond'],
    ['700', 'Cormorant Garamond'],
    ['700', 'Playfair Display'],
    ['900', 'Playfair Display'],
    ['400', 'Bebas Neue'],
    ['400', 'Press Start 2P'],
    ['400', 'VT323'],
  ];
  // Persian label in the #02 persia miniature (Arabic script)
  const persian = 'آسیاب بادی باد صد و بیست روزه سیستان';
  const jobs = [
    ...specs.map(([w, f]) => document.fonts.load(`${w} 32px "${f}"`, text)),
    document.fonts.load('600 32px "Noto Naskh Arabic"', persian),
    document.fonts.load('500 32px "Noto Naskh Arabic"', persian),
    ...latinOnly.map(([w, f]) => document.fonts.load(`${w} 32px "${f}"`, latin)),
  ];
  const timeout = new Promise((res) => setTimeout(res, 12000));
  try {
    await Promise.race([Promise.allSettled(jobs), timeout]);
    await Promise.race([document.fonts.ready, timeout]);
  } catch (e) {
    // offline: fall back silently
  }
}
