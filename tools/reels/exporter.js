// Render one SSC reel to MP4: the shared renderer draws each frame at exactly 1/30s,
// ffmpeg encodes, the sample's preview MP3 is the audio (never the stems).
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const SKIN_NAMES = { club: 'Club', cover: 'Cover', mono: 'Mono', daylight: 'Daylight' };

function outName(dir, title, state) {
  const base = `${title} – ${state.format === 'build' ? 'Build' : 'Scroll'} – ${SKIN_NAMES[state.skin] || state.skin}`
    .replace(/[\/:]/g, '-');
  let name = `${base}.mp4`, n = 2;
  while (fs.existsSync(path.join(dir, name))) name = `${base} (${n++}).mp4`;   // never overwrite
  return path.join(dir, name);
}

// browser: a playwright Browser. reading: the stem reading (with overrides merged in).
async function exportReel({ browser, reading, opts, state, preview, outDir, onProgress, pageUrl }) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(pageUrl || 'file://' + path.join(__dirname, 'app', 'render.html'));
    await page.waitForFunction(() => window.reel);
    await page.evaluate(() => window.reel.ready);
    const { dur } = await page.evaluate(([d, o]) => window.reel.load(d, o), [reading, opts]);
    const out = outName(outDir, reading.title, state);
    const frames = Math.ceil(dur * FPS);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
      '-i', preview, '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErr = '';
    ff.stderr.on('data', d => { ffErr += d; });
    const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg: ' + (ffErr.trim() || 'exited ' + c)))));
    for (let i = 0; i < frames; i++) {
      if (errors.length) throw new Error('render: ' + errors[0]);
      const url = await page.evaluate(([t, dt, s]) => window.reel.frame(t, dt, s), [i / FPS, 1 / FPS, state]);
      if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')))
        await new Promise(r => ff.stdin.once('drain', r));
      if (onProgress && (i % 15 === 0 || i === frames - 1)) onProgress((i + 1) / frames);
    }
    ff.stdin.end();
    await done;
    return out;
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { exportReel, SKIN_NAMES };
