// tools/build.mjs — produce self-contained single-file pages in dist/:
//   dist/index.html    player (all JS + CSS inlined; only Google Fonts loaded remotely)
//   dist/gallery.html  20-era gallery
//   dist/render.html   render host
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { ROOT } from './serve.mjs';

const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });
const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');

async function bundle(entry) {
  const res = await build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
  });
  return res.outputFiles[0].text;
}

function inline(htmlFile, js, outName) {
  let html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="\.\/public\/style\.css" \/>/, `<style>\n${css}\n</style>`);
  // escape any closing script tag sequences inside the bundle
  const safe = js.replace(/<\/script/gi, '<\\/script');
  html = html.replace(/<script type="module" src="\.\/src\/[a-z]+\.js"><\/script>/, () => `<script type="module">\n${safe}\n</script>`);
  fs.writeFileSync(path.join(DIST, outName), html);
  const kb = (fs.statSync(path.join(DIST, outName)).size / 1024).toFixed(0);
  console.log(`dist/${outName}  ${kb} KiB`);
}

const playerJs = await bundle('src/player.js');
const galleryJs = await bundle('src/gallery.js');
inline('index.html', playerJs, 'index.html');
inline('render.html', playerJs, 'render.html');
inline('gallery.html', galleryJs, 'gallery.html');
