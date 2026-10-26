// Renders showreel.html to MP4: 60 fps, 3 subframes per frame blended with ffmpeg tmix, soundtrack muxed in.
//
// Usage: node render/render.cjs [--voice am_michael] [--out out/showreel.mp4] [--work <dir>] [--workers 4] [--from 0] [--to <frames>]
//   --voice  which embedded voiceover to use (am_michael or af_heart); the picture follows its timestamps
//   --work   where subframe PNGs and the WAV go (defaults to a temp dir; ~3 GB for a full run)
//   --skip-frames  reuse PNGs already in --work and only encode
//
// Each output frame k is the average of subframes at k/60 - 1/360, k/60, k/60 + 1/360. Inside the page,
// seek() also blurs each subframe across its own 1/360 s slice, so the three slices tile a 1/120 s
// shutter (180° at 60 fps) and fast moves get continuous blur rather than three ghosts.
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const FPS = 60, SUB = 3;
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, arg('out', 'out/showreel.mp4'));
const work = path.resolve(arg('work', fs.mkdtempSync(path.join(os.tmpdir(), 'showreel-'))));
const workers = +arg('workers', Math.max(1, os.cpus().length));
const voice = arg('voice', 'am_michael');
let from = +arg('from', 0), to = null;
const skipFrames = process.argv.includes('--skip-frames');
const frameDir = path.join(work, 'frames');
fs.mkdirSync(frameDir, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

const subTime = (i) => {
  const k = Math.floor(i / SUB), j = i % SUB;
  return k / FPS + (j - (SUB - 1) / 2) / (FPS * SUB * 2);
};

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(root, 'showreel.html') + '?voice=' + voice);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

async function renderWorker(browser, w, jobs, progress) {
  const page = await openPage(browser);
  const cdp = await page.context().newCDPSession(page);
  for (const i of jobs) {
    await page.evaluate((t) => window.seek(t), subTime(i));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    fs.writeFileSync(path.join(frameDir, `f${String(i).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'));
    progress();
  }
  await page.close();
}

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();

  const wav = path.join(work, 'soundtrack.wav');
  {
    const page = await openPage(browser);
    const b64 = await page.evaluate(() => window.soundtrackWav());
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    const dur = await page.evaluate(() => window.DUR);
    if (await page.evaluate(() => window.VOICE) !== voice) throw new Error('no voiceover called ' + voice);
    to = +arg('to', Math.round(FPS * dur));
    await page.close();
    console.log('soundtrack:', wav, `(${voice}, ${dur} s)`);
  }

  if (!skipFrames) {
    const all = [];
    for (let i = from * SUB; i < to * SUB; i++) all.push(i);
    const lanes = Array.from({ length: workers }, () => []);
    all.forEach((i, n) => lanes[Math.floor(n / SUB) % workers].push(i));
    let done = 0;
    const progress = () => {
      done++;
      if (done % 150 === 0 || done === all.length) {
        const s = (Date.now() - t0) / 1000;
        console.log(`${done}/${all.length} subframes  ${s.toFixed(0)}s  eta ${((s / done) * (all.length - done)).toFixed(0)}s`);
      }
    };
    await Promise.all(lanes.map((jobs, w) => renderWorker(browser, w, jobs, progress)));
  }
  await browser.close();

  const vf = [
    `tmix=frames=${SUB}:weights=${Array(SUB).fill(1).join(' ')}`,
    `select='eq(mod(n\\,${SUB})\\,${SUB - 1})'`,
    `setpts=N/(${FPS}*TB)`,
    'scale=out_color_matrix=bt709:out_range=tv',
    'format=yuv420p',
  ].join(',');
  const ff = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS * SUB), '-start_number', String(from * SUB), '-i', path.join(frameDir, 'f%05d.png'),
    '-ss', String(from / FPS), '-i', wav,
    '-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]', '-map', '1:a',
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
    '-t', String((to - from) / FPS), '-movflags', '+faststart', out,
  ], { stdio: 'inherit' });
  if (ff.status !== 0) process.exit(ff.status || 1);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${out}`);
})();
