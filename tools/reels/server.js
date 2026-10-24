// SSC Reels: the local server behind the Soul Sample Club reel maker.
//
// Same tool as Looplair Reels, fed from Soul Sample Club instead of Drive:
//   * the sample list comes from the live site (published monthly packs only, never bonus
//     packs, which are Looplair's), with names, BPM, key and each pack's cover;
//   * the audio is the sample's MP3 preview from the site, cut to its first 8 bars;
//   * the stems come from Chris's Dropbox when they're there, else from the site's stems zip,
//     fetched only for the sample he opens.
// It only ever READS from the site. Reels and the tool's memory go to Dropbox/SOUL SAMPLE CLUB/REELS.
//
//   node server.js            (the SSC Reels launcher does this, then opens Chrome)
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { exportReel } = require('./exporter');

const PORT = +process.env.PORT || 7476;              // 4747 is the SSC Uploader, 7474 Looplair Reels
const HOME = os.homedir();
const HERE = __dirname;
const REPO = path.join(HERE, '..', '..');
const LOCAL = path.join(HOME, '.ssc-reels');          // this Mac only: settings, index, downloads, covers
const DROPBOX = path.join(HOME, 'Library/CloudStorage/Dropbox/SOUL SAMPLE CLUB');
const DEFAULTS = {
  dropbox: DROPBOX,
  outputDir: path.join(DROPBOX, 'REELS'),
  dataDir: '',                                          // empty = <outputDir>/_data
  bars: 8,
  python: 'python3',
};
for (const p of ['/usr/local/bin', '/opt/homebrew/bin']) if (!process.env.PATH.includes(p)) process.env.PATH = `${p}:${process.env.PATH}`;

// ------------------------------------------------------------------ the site's keys (read from its .env.local, never copied here)
const ENV = {};
for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) ENV[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const SB_URL = ENV.NEXT_PUBLIC_SUPABASE_URL, SB_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) throw new Error(".env.local is missing the Supabase URL or service role key");
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
async function sb(query) {                             // read-only REST select
  const r = await fetch(`${SB_URL}/rest/v1/${query}`, { headers: { ...sbHeaders, Range: '0-4999' } });
  if (!r.ok) throw new Error(`Soul Sample Club database: ${r.status} ${await r.text()}`);
  return r.json();
}
async function signed(bucketPath) {                    // the samples bucket is private: a short signed link
  const r = await fetch(`${SB_URL}/storage/v1/object/sign/samples/${bucketPath.split('/').map(encodeURIComponent).join('/')}`,
    { method: 'POST', headers: { ...sbHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ expiresIn: 900 }) });
  if (!r.ok) throw new Error(`Couldn't get ${bucketPath} from the site (${r.status})`);
  const { signedURL } = await r.json();
  return `${SB_URL}/storage/v1${signedURL}`;
}
async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.part';
  await fsp.writeFile(tmp, Buffer.from(await r.arrayBuffer()));
  fs.renameSync(tmp, file);
}

// ------------------------------------------------------------------ small JSON store
function readJSON(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}
fs.mkdirSync(LOCAL, { recursive: true });
let settings = { ...DEFAULTS, ...readJSON(path.join(LOCAL, 'settings.json'), {}) };
const dataDir = () => settings.dataDir || path.join(settings.outputDir, '_data');
const dataFile = name => path.join(dataDir(), name);

let queue, log, corrections;
function loadData() {
  queue = readJSON(dataFile('queue.json'), { running: false, items: [] });
  queue.items.forEach(e => { if (e.status === 'rendering') { e.status = 'waiting'; e.progress = 0; } });
  log = readJSON(dataFile('exports.json'), []);
  corrections = readJSON(dataFile('corrections.json'), {});
}
loadData();
const saveQueue = () => writeJSON(dataFile('queue.json'), { running: queue.running, items: queue.items.map(({ progress, stage, ...e }) => e) });
const saveLog = () => writeJSON(dataFile('exports.json'), log);
const saveCorrections = () => writeJSON(dataFile('corrections.json'), corrections);

// ------------------------------------------------------------------ names, BPM, lane order (same rules as Looplair's reader)
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const titleOf = s => String(s).replace(/\.[a-z0-9]+$/i, '').replace(/\s*\(.*$/, '').trim();
const BPM_RE = /\((\d+(?:\.\d+)?)\s*BPM\s*[,:\-–]?\s*([^)]*)\)?/i;
const parseBpm = s => { const m = String(s).match(BPM_RE); return m ? { bpm: +m[1], key: m[2].trim() } : null; };
const ORDER = [/drum|kick|snare|hat|perc|clap|break|beat|loop|bongo|conga|shaker|tamb/i, /bass|808|sub/i,
  /key|piano|rhodes|organ|synth|pad|chord|guitar|gtr|arp|bell|harp|vibe/i,
  /string|violin|cello|horn|brass|trombone|trumpet|sax|flute|wind/i, /vox|vocal|voice|choir|chop|sing/i, /fx|riser|sweep|noise|vinyl|crackle/i];
const DRUM_FIRST = ['drum', 'break', 'beat', 'loop', 'kick', 'snare', 'clap', 'hat', 'perc'];
function laneKey(name) {
  const r = ORDER.findIndex(p => p.test(name)), rank = r < 0 ? ORDER.length : r;
  const sub = rank === 0 ? ((i => i < 0 ? DRUM_FIRST.length : i)(DRUM_FIRST.findIndex(w => name.toLowerCase().includes(w)))) : 0;
  return [rank, sub, name];
}
const byLane = (a, b) => { const x = laneKey(a.name), y = laneKey(b.name); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };
function lanesFrom(files) {                            // <Part>_<anything>.wav -> lane PART
  const seen = {};
  return files.map(f => {
    const t = titleOf(path.basename(f)), base = (t.includes('_') ? t.split('_')[0] : t).trim().toUpperCase() || 'STEM';
    seen[base] = (seen[base] || 0) + 1;
    return { name: seen[base] === 1 ? base : `${base} ${seen[base]}`, path: f };
  }).sort(byLane);
}

// ------------------------------------------------------------------ library: the site's published packs + Dropbox stems
let index = readJSON(path.join(LOCAL, 'index.json'), { scanned: null, samples: [], packs: [] });
let byId = new Map(index.samples.map(s => [s.id, s]));
let scanning = null, scanError = '';

function walkDropbox(root) {
  // names only: stems folders (…/STEMS/<NAME>/*.wav) and the full samples (SAMPLES/ or
  // Compositions/ "<NAME> (BPM, Key).wav", the most precise BPM there is)
  const stems = new Map(), tempo = new Map();
  const skip = new Set(['BONUS PACKS', 'STEM ZIPS + MP3', 'REELS', 'USAGE']);
  (function walk(dir, depth) {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const parts = path.relative(root, dir).split(path.sep);
    const wavs = ents.filter(e => e.isFile() && /\.(wav|aiff?)$/i.test(e.name)).map(e => e.name);
    const underStems = parts.slice(0, -1).some(p => p.toLowerCase() === 'stems');
    if (underStems && wavs.length) {
      const k = norm(titleOf(path.basename(dir)));
      (stems.get(k) || stems.set(k, []).get(k)).push({ dir, files: wavs.map(w => path.join(dir, w)) });
    } else for (const w of wavs) {
      const p = parseBpm(w);
      if (p && !w.includes('_')) tempo.set(norm(titleOf(w)), p);
    }
    for (const e of ents) if (e.isDirectory() && !(depth === 0 && skip.has(e.name)) && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth + 1);
  })(root, 0);
  return { stems, tempo };
}

const palettes = readJSON(path.join(LOCAL, 'palettes.json'), {});
async function coverFor(pack) {
  if (!pack.cover_image_url) return null;
  const file = path.join(LOCAL, 'covers', `${pack.id}${path.extname(new URL(pack.cover_image_url).pathname) || '.img'}`);
  const tag = pack.cover_image_url;
  if (!fs.existsSync(file) || (palettes[pack.id] && palettes[pack.id].tag !== tag)) await download(pack.cover_image_url, file);
  if (!palettes[pack.id] || palettes[pack.id].tag !== tag) {
    const out = await run(settings.python, [path.join(HERE, 'cover_palette.py'), file]);
    palettes[pack.id] = { tag, colors: JSON.parse(out) };
    writeJSON(path.join(LOCAL, 'palettes.json'), palettes);
  }
  return file;
}

function scan() {
  if (scanning) return scanning;
  scanning = (async () => {
    const packs = await sb('packs?select=id,name,cover_image_url,release_date&is_published=eq.true&is_bonus=eq.false&order=release_date.desc');
    const ids = packs.map(p => p.id);
    const rows = ids.length ? await sb(`samples?select=id,name,pack_id,bpm,key,preview_path,stems_path,order_index&pack_id=in.(${ids.join(',')})&order=order_index`) : [];
    const { stems, tempo } = walkDropbox(settings.dropbox);
    const packById = new Map(packs.map(p => [p.id, p]));
    for (const p of packs) { try { p.cover = await coverFor(p); } catch { p.cover = null; } p.colors = (palettes[p.id] || {}).colors || []; }
    const samples = rows.map(r => {
      const pack = packById.get(r.pack_id), title = titleOf(r.name), k = norm(title);
      const t = tempo.get(k) || parseBpm(r.name);
      const cands = stems.get(k) || [];
      const local = cands.find(c => norm(c.dir).includes(norm(pack.name))) || cands[0] || null;
      const status = !r.preview_path ? 'no_preview' : (local || r.stems_path) ? 'ready' : 'no_stems';
      return { id: r.id, title, pack: pack.name, packId: pack.id, released: pack.release_date,
               bpm: t ? t.bpm : r.bpm, key: (t && t.key) || r.key || '', bpm_source: t ? 'name' : r.bpm ? 'site' : '',
               preview_path: r.preview_path, stems_path: r.stems_path,
               stemsDir: local ? local.dir : null, stemFiles: local ? local.files : null,
               lanes: local ? local.files.length : null, source: local ? 'dropbox' : r.stems_path ? 'site' : '', status };
    });
    index = { scanned: new Date().toISOString().slice(0, 16).replace('T', ' '), samples,
              packs: packs.map(p => ({ id: p.id, name: p.name, released: p.release_date, colors: p.colors, cover: !!p.cover })) };
    writeJSON(path.join(LOCAL, 'index.json'), index);
    byId = new Map(samples.map(s => [s.id, s]));
    scanError = '';
  })().catch(e => { scanError = `Couldn't read Soul Sample Club: ${e.message}`; }).finally(() => { scanning = null; });
  return scanning;
}

function usedInfo() {
  const used = {};
  log.forEach(e => (used[e.id] = used[e.id] || []).push({ eid: e.eid, skin: e.skin, format: e.format, at: e.at, posted: e.posted }));
  return used;
}

// ------------------------------------------------------------------ readings: fetch on demand, first N bars, read once, cache
function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args); let out = '', err = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
    p.on('error', rej);
    p.on('close', c => c === 0 ? res(out) : rej(new Error(err.trim().split('\n').pop() || `${cmd} exited ${c}`)));
  });
}
const drain = file => new Promise((res, rej) => fs.createReadStream(file, { highWaterMark: 1 << 20 }).on('data', () => {}).on('end', res).on('error', rej));
const walkWavs = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name.startsWith('.') || e.name === '__MACOSX' ? []
  : e.isDirectory() ? walkWavs(path.join(dir, e.name)) : /\.(wav|aiff?)$/i.test(e.name) ? [path.join(dir, e.name)] : []);
const trimmedAudio = id => path.join(LOCAL, 'audio', `${id}.${settings.bars}bars.wav`);

const opening = new Map();
function ensureReading(id) {
  const s = byId.get(id);
  if (!s) return Promise.reject(new Error('That sample is no longer in the library. Try Refresh.'));
  if (s.status === 'no_preview') return Promise.reject(new Error(`${s.title} has no MP3 preview on the site.`));
  if (s.status !== 'ready') return Promise.reject(new Error(`No stems found for ${s.title}, in Dropbox or on the site.`));
  const cur = opening.get(id);
  if (cur && cur.promise && !cur.error) return cur.promise;
  const job = { stage: 'checking', done: 0, total: 2 + (s.lanes || 1) };
  opening.set(id, job);
  job.promise = (async () => {
    const stemSig = s.stemFiles ? await Promise.all(s.stemFiles.map(f => fsp.stat(f).then(x => [path.basename(f), x.size], () => [f, -1]))) : s.stems_path;
    const sig = crypto.createHash('sha1').update(JSON.stringify([s.preview_path, stemSig, s.bpm, settings.bars])).digest('hex').slice(0, 16);
    const cacheFile = dataFile(`readings/${id}.json`), cached = readJSON(cacheFile, null);
    if (cached && cached.sig === sig && fs.existsSync(trimmedAudio(id))) { job.stage = 'ready'; return cached; }
    job.stage = 'downloading';
    // the preview MP3 from the site, cut to the first N bars with a short fade so the reel ends clean
    const mp3 = path.join(LOCAL, 'audio', `${id}.mp3`);
    if (!fs.existsSync(mp3)) await download(await signed(s.preview_path), mp3);
    job.done++;
    const dur = settings.bars * 240 / s.bpm, fade = Math.min(.35, dur / 10);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-t', dur.toFixed(4), '-af', `afade=t=out:st=${(dur - fade).toFixed(4)}:d=${fade.toFixed(3)}`,
                         '-ar', '44100', '-ac', '2', trimmedAudio(id)]);
    job.done++;
    let files = s.stemFiles;
    if (files) for (const f of files) { await drain(f); job.done++; }   // reading a Dropbox file makes Dropbox fetch it
    else {                                                             // only on the site: its stems zip
      const dir = path.join(LOCAL, 'stems', id), zip = path.join(LOCAL, 'stems', `${id}.zip`);
      if (!fs.existsSync(dir)) {
        await download(await signed(s.stems_path), zip);
        fs.mkdirSync(dir, { recursive: true });
        await run('/usr/bin/unzip', ['-o', '-q', zip, '-d', dir]);
        fs.rmSync(zip, { force: true });
      }
      files = walkWavs(dir);
      job.done = job.total;
    }
    if (!files.length) throw new Error(`The stems for ${s.title} are empty.`);
    job.stage = 'reading';
    const jobFile = path.join(LOCAL, 'jobs', `${id}.json`), outFile = path.join(LOCAL, 'jobs', `${id}.out.json`);
    writeJSON(jobFile, { title: s.title, bpm: s.bpm, key: s.key, preview: trimmedAudio(id), pack: s.pack, stems: lanesFrom(files) });
    await run(settings.python, [path.join(HERE, 'read_stems.py'), '--job', jobFile, outFile]);
    const reading = { ...readJSON(outFile, null), sig, read: new Date().toISOString(), source: s.stemFiles ? 'dropbox' : 'site' };
    writeJSON(cacheFile, reading);
    fs.rmSync(outFile, { force: true });
    job.stage = 'ready';
    return reading;
  })();
  job.promise.catch(e => { job.error = e.message; job.stage = 'error'; });
  return job.promise;
}

function warnings(s, reading) {
  const w = [];
  if (s.bpm_source === 'site') w.push(`BPM ${s.bpm} is from the site (whole numbers only). If the clips drift, the real tempo has a decimal.`);
  if (reading.source === 'site') w.push("These stems aren't in Dropbox, so they came from the site's stems zip.");
  const silent = reading.stems.filter(x => !x.spans.length).map(x => x.name);
  if (silent.length) w.push(`Not heard in the first ${settings.bars} bars, so no clip: ${silent.join(', ')}. Click its bars to put it in.`);
  return w;
}

// ------------------------------------------------------------------ queue, rendered one at a time
let browser = null, working = false;
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  const { chromium } = require('playwright-core');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  return browser;
}
const nextJob = () => queue.items.find(e => e.status === 'waiting' && e.now) || (queue.running ? queue.items.find(e => e.status === 'waiting') : null);
const reelOpts = s => ({ packs: index.packs.map(p => ({ name: p.name, color: (p.colors || [])[0] || '#888888' })),
                         palette: ((palettes[s.packId] || {}).colors) || [], coverUrl: `http://127.0.0.1:${PORT}/api/cover/${s.packId}` });
async function work() {
  if (working) return;
  working = true;
  try {
    for (let e = nextJob(); e; e = nextJob()) {
      e.status = 'rendering'; e.progress = 0; e.stage = 'Getting the stems'; e.error = '';
      saveQueue();
      try {
        const reading = await ensureReading(e.id);
        const s = byId.get(e.id);
        e.stage = 'Rendering';
        const fixed = corrections[e.id];
        const out = await exportReel({
          browser: await getBrowser(), reading: { ...reading, overrides: fixed && fixed.lanes }, opts: reelOpts(s), state: e.state,
          preview: trimmedAudio(e.id), outDir: settings.outputDir, pageUrl: `http://127.0.0.1:${PORT}/render.html`,
          onProgress: p => { e.progress = p; },
        });
        const rec = { eid: crypto.randomUUID(), at: new Date().toISOString(), id: e.id, title: e.title, pack: s.pack,
                      skin: e.state.skin, format: e.state.format, state: e.state, out, posted: null };
        log.push(rec); saveLog();
        e.status = 'done'; e.out = out; e.eid = rec.eid; e.progress = 1;
      } catch (err) {
        e.status = 'failed'; e.error = err.message;
        if (/Target page|browser has been closed/i.test(err.message)) browser = null;
      }
      e.now = false; e.stage = '';
      saveQueue();
    }
    if (queue.running) { queue.running = false; saveQueue(); }
  } finally {
    working = false;
    if (browser) { await browser.close().catch(() => {}); browser = null; }
  }
}

// ------------------------------------------------------------------ http
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
                '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function send(res, code, body) { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); }
async function body(req) { let raw = ''; for await (const c of req) raw += c; return raw ? JSON.parse(raw) : {}; }
const qview = () => ({ running: queue.running, working, items: queue.items });
const ID = /^[a-z0-9-]+$/;

const routes = {
  'GET /api/library': () => ({
    scanned: index.scanned, scanning: !!scanning, error: scanError, root: settings.dropbox, used: usedInfo(), bars: settings.bars,
    samples: index.samples.map(({ stemFiles, stemsDir, preview_path, stems_path, ...s }) => s),
  }),
  'POST /api/rescan': async () => { await scan(); return { ok: !scanError, error: scanError, count: index.samples.length }; },
  'GET /api/catalogue': () => index.packs.map(p => [p.name, []]),
  'GET /api/packs': () => index.packs,

  'POST /api/open/:id': ({ id }) => {
    const job = opening.get(id);
    if (job && (job.stage === 'ready' || job.error)) opening.delete(id);
    ensureReading(id).catch(() => {});
    return routes['GET /api/open/:id']({ id });
  },
  'GET /api/open/:id': ({ id }) => {
    const s = byId.get(id), job = opening.get(id);
    if (!s) return { state: 'error', error: 'That sample is no longer in the library. Try Refresh.' };
    if (s.status !== 'ready') return { state: 'error', error: s.status === 'no_preview' ? `${s.title} has no MP3 preview on the site.` : `No stems found for ${s.title}, in Dropbox or on the site.` };
    if (!job) return { state: 'idle' };
    if (job.error) { const error = job.error; opening.delete(id); return { state: 'error', error }; }
    if (job.stage !== 'ready') return { state: job.stage, done: job.done, total: job.total };
    const reading = readJSON(dataFile(`readings/${id}.json`), null);
    if (!reading) { opening.delete(id); return { state: 'idle' }; }
    const { sig, ...r } = reading;
    return { state: 'ready', sample: { id: s.id, title: s.title, pack: s.pack, packId: s.packId, bpm: s.bpm, key: s.key, bpm_source: s.bpm_source },
             reading: r, corrections: (corrections[id] || {}).lanes || null, warnings: warnings(s, reading), versions: usedInfo()[id] || [],
             opts: reelOpts(s) };
  },
  'PUT /api/corrections/:id': async ({ id }, req) => {
    const b = await body(req);
    if (b.lanes) corrections[id] = { lanes: b.lanes, at: new Date().toISOString() }; else delete corrections[id];
    saveCorrections(); return { ok: true };
  },

  'GET /api/captions': () => readJSON(dataFile('captions.json'), ['comment CLUB for more 🔑']),
  'PUT /api/captions': async (_, req) => { const b = await body(req); writeJSON(dataFile('captions.json'), b.captions || []); return { ok: true }; },
  'GET /api/last': () => readJSON(dataFile('last.json'), null),

  'GET /api/queue': () => qview(),
  'POST /api/queue': async (_, req) => {
    const b = await body(req), s = byId.get(b.id);
    if (!s) throw new Error('Unknown sample');
    const e = { qid: crypto.randomUUID(), id: s.id, title: s.title, pack: s.pack, state: b.state, status: 'waiting', now: !!b.now, added: new Date().toISOString() };
    queue.items.push(e); saveQueue();
    writeJSON(dataFile('last.json'), { state: b.state, pack: s.pack, id: s.id });
    if (e.now) work();
    return e;
  },
  'PUT /api/queue/:qid': async ({ qid }, req) => {
    const b = await body(req), e = queue.items.find(x => x.qid === qid);
    if (!e) throw new Error('Not in the queue');
    if (e.status === 'rendering') throw new Error('That reel is rendering right now');
    if (b.state) e.state = b.state;
    if (b.retry) { e.status = 'waiting'; e.error = ''; }
    saveQueue(); return e;
  },
  'DELETE /api/queue/:qid': ({ qid }) => {
    const e = queue.items.find(x => x.qid === qid);
    if (e && e.status === 'rendering') throw new Error('That reel is rendering right now');
    queue.items = queue.items.filter(x => x.qid !== qid); saveQueue(); return qview();
  },
  'POST /api/queue/order': async (_, req) => {
    const { qids } = await body(req), pos = new Map(qids.map((q, i) => [q, i]));
    queue.items.sort((a, b) => (pos.get(a.qid) ?? 1e9) - (pos.get(b.qid) ?? 1e9)); saveQueue(); return qview();
  },
  'POST /api/queue/clear': () => { queue.items = queue.items.filter(e => e.status !== 'done'); saveQueue(); return qview(); },
  'POST /api/export-all': () => { queue.running = true; saveQueue(); work(); return qview(); },
  'POST /api/stop': () => { queue.running = false; queue.items.forEach(e => { e.now = false; }); saveQueue(); return qview(); },

  'GET /api/exports': () => log.slice().reverse(),
  'POST /api/exports/:eid/posted': async ({ eid }, req) => {
    const b = await body(req), e = log.find(x => x.eid === eid);
    if (!e) throw new Error('Not in the log');
    e.posted = b.posted ? (e.posted || new Date().toISOString()) : null; saveLog(); return e;
  },
  'POST /api/reveal': async (_, req) => {
    const { file } = await body(req);
    fs.mkdirSync(settings.outputDir, { recursive: true });
    spawn('open', file && fs.existsSync(file) ? ['-R', file] : [settings.outputDir]);
    return { ok: true };
  },

  'GET /api/settings': () => ({ ...settings, dataDirResolved: dataDir(), defaults: DEFAULTS }),
  'PUT /api/settings': async (_, req) => {
    const b = await body(req);
    for (const k of ['dropbox', 'outputDir', 'dataDir', 'python']) if (k in b) settings[k] = b[k];
    writeJSON(path.join(LOCAL, 'settings.json'), settings);
    loadData(); scan();
    return { ...settings, dataDirResolved: dataDir() };
  },
};

function match(method, pathname) {
  for (const key of Object.keys(routes)) {
    const [m, pat] = key.split(' ');
    if (m !== method) continue;
    const a = pat.split('/'), b = pathname.split('/');
    if (a.length !== b.length) continue;
    const params = {};
    if (a.every((seg, i) => seg.startsWith(':') ? (params[seg.slice(1)] = decodeURIComponent(b[i]), true) : seg === b[i])) {
      if (params.id && !ID.test(params.id)) return null;
      return { fn: routes[key], params };
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname.startsWith('/api/audio/')) {           // the first N bars of the site's MP3 preview: what the reel plays
      const id = pathname.split('/').pop(), f = trimmedAudio(id);
      if (!ID.test(id) || !fs.existsSync(f)) return send(res, 404, { error: 'open the sample first' });
      res.writeHead(200, { 'content-type': 'audio/wav', 'cache-control': 'no-store' });
      return fs.createReadStream(f).pipe(res);
    }
    if (pathname.startsWith('/api/cover/')) {           // the pack's cover, for the toolbar and the Cover skin
      const id = pathname.split('/').pop(), p = index.packs.find(x => x.id === id);
      const dir = path.join(LOCAL, 'covers'), f = p && fs.existsSync(dir) && fs.readdirSync(dir).find(n => n.startsWith(id));
      if (!f) return send(res, 404, { error: 'no cover' });
      res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'image/png', 'cache-control': 'no-store' });
      return fs.createReadStream(path.join(dir, f)).pipe(res);
    }
    if (pathname.startsWith('/api/')) {
      const m = match(req.method, pathname);
      if (!m) return send(res, 404, { error: 'not found' });
      return send(res, 200, await m.fn(m.params, req));
    }
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.normalize(path.join(HERE, 'app', rel));
    if (!file.startsWith(path.join(HERE, 'app') + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    send(res, 400, { error: e.message });
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log(`Port ${PORT} is taken by another program. Start with PORT=<other> node server.js`); process.exit(1); }
  throw e;
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`SSC Reels on http://localhost:${PORT}`);
  console.log(`  stems   ${settings.dropbox} (else the site's stems zips)`);
  console.log(`  reels   ${settings.outputDir}`);
  console.log(`  memory  ${dataDir()}`);
  scan().then(() => console.log(scanError || `  library ${index.samples.length} samples in ${index.packs.length} published packs`));
  if (nextJob()) work();
});
