// Renders chosen moments as PNG stills, plus an optional contact sheet.
// Usage: node render/preview.cjs <outDir> [--beats] [--sheet] [t1 t2 ...]
//   --beats  one frame per beat, taken 0.2 s after each beat lands (motion settled)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const args = process.argv.slice(2);
  const outDir = args.shift();
  const beats = args.includes('--beats');
  const sheet = args.includes('--sheet');
  let times = args.filter((a) => !a.startsWith('--')).map(Number);
  if (beats) for (let b = 0; b < 30; b++) times.push(+(b * 0.5 + 0.2).toFixed(3));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'showreel.html'));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

  const files = [];
  for (const t of times) {
    const k = await page.evaluate((tt) => window.seek(tt), t);
    const f = path.join(outDir, `t${t.toFixed(3).padStart(7, '0')}.png`);
    await page.screenshot({ path: f });
    files.push(f);
    console.log(`t=${t.toFixed(3)}  samples=${k}`);
  }
  await browser.close();

  if (sheet && files.length) {
    const cols = 5;
    const inputs = files.flatMap((f) => ['-i', f]);
    const n = files.length;
    const parts = files.map((_, i) => `[${i}:v]scale=384:216,drawtext=text='${times[i].toFixed(2)}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`);
    const layout = files.map((_, i) => `${(i % cols) * 384}_${Math.floor(i / cols) * 216}`).join('|');
    const filter = parts.join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=${layout}:fill=black`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', path.join(outDir, 'sheet.png')]);
    console.log('sheet:', path.join(outDir, 'sheet.png'));
  }
})();
