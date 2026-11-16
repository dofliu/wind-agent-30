// tools/render.mjs — offline render of the whole film to MP4 (H.264) with ffmpeg.
//
//   node tools/render.mjs [--fps 30] [--from 0] [--to 178] [--out out/riding-the-wind.mp4] [--scale 1]
//                         [--audio out/soundtrack.wav] [--jpeg]
//
// Frames are rendered deterministically via window.renderAt(t) in headless Chromium and
// piped straight into ffmpeg (no PNG sequence on disk). If --audio is given (see
// tools/render-audio.mjs) it is muxed in.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openRenderHost } from './browser.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const fps = Number(arg('--fps', '30'));
const from = Number(arg('--from', '0'));
const total = Number(arg('--to', '178'));
const out = arg('--out', 'out/riding-the-wind.mp4');
const audio = arg('--audio', null);
const scale = Number(arg('--scale', '1'));
const useJpeg = args.includes('--jpeg');
fs.mkdirSync(path.dirname(out), { recursive: true });

const { page, errors, close } = await openRenderHost();
const W = Math.round(1920 * scale);
const H = Math.round(1080 * scale);
const ffArgs = [
  '-y',
  '-f', 'image2pipe',
  '-framerate', String(fps),
  '-c:v', useJpeg ? 'mjpeg' : 'png',
  '-i', '-',
  ...(audio ? ['-ss', String(from), '-i', audio] : []),
  '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  ...(audio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
  '-movflags', '+faststart',
  out,
];
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

const n = Math.round((total - from) * fps);
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const t = from + i / fps;
  const b64 = await page.evaluate(
    ([tt, j]) => window.captureFrameAt(tt, j ? 'image/jpeg' : 'image/png', 0.93),
    [t, useJpeg],
  );
  const buf = Buffer.from(b64, 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\rframe ${i}/${n}  t=${t.toFixed(1)}s  ${(i / Math.max(el, 0.001)).toFixed(1)} fps   `);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
console.log(`\nwrote ${out}`);
if (errors.length) console.log(errors.slice(0, 20).join('\n'));
await close();
