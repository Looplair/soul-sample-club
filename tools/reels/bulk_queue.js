// Queue a reel for many samples at once, each with a mix of looks so the feed doesn't repeat itself.
// Talks to the running tool (port 7476) exactly as the Add to queue button does.
//   node bulk_queue.js --count 5            the next 5 samples with stems that have no reel yet
//   node bulk_queue.js --all                every one of them
//   add --export to start the queue straight away
// Chris's rules (3 Nov 2026): The Scroll on ~80%, The Build on the rest; lane height Medium or Thin only;
// skins Club, Cover or Mono (never Daylight); no messy crop, no page-jump follow; a "comment CLUB"
// caption picked from the list below. Caption style, height and size follow his last reel.
const API = 'http://localhost:7476/api';
const arg = k => process.argv.includes(k), val = k => process.argv[process.argv.indexOf(k) + 1];
const COUNT = arg('--all') ? Infinity : +(val('--count') || 5);

const CAPTIONS = [
  'Comment "CLUB" and we\'ll send original soul right to your DAW 🔥',
  'Comment "CLUB" for original soul, straight to your DAW 💎',
  'Want this one? Comment "CLUB" 🔥',
  'Comment "CLUB" for more soul like this 💎',
  'Comment "CLUB" and we\'ll send you more like this 🔥',
  'Original soul samples. Comment "CLUB" 💎',
];
const SKINS = ['club', 'cover', 'mono'], LANES = [110, 84];

async function api(p, method = 'GET', body) {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j;
}
// a fixed shuffle, so the mix is even rather than streaky: every 5 reels get 4 Scrolls and 1 Build,
// and skins, lane heights and captions each cycle through before repeating
const cycle = (list, i, step) => list[(i * step) % list.length];

(async () => {
  const lib = await api('/library'), last = (await api('/last')) || {};
  const queued = new Set((await api('/queue')).items.filter(e => e.status !== 'failed').map(e => e.id));
  const base = { skin: 'club', format: 'scroll', laneH: 110, caption: '', cstyle: 'plain', cpos: .24, csize: 60, corner: 'SOUL SAMPLE CLUB', bw: 140, pack: '', hidden: [], ...(last.state || {}) };
  // samples with stems that have no reel and aren't already waiting, one per pack first so a batch is varied
  const fresh = lib.samples.filter(s => s.lanes && !(lib.used[s.id] || []).length && !queued.has(s.id));
  const byPack = {}; for (const s of fresh) (byPack[s.pack] = byPack[s.pack] || []).push(s);
  const order = []; for (let round = 0; order.length < fresh.length; round++) for (const p of Object.keys(byPack)) if (byPack[p][round]) order.push(byPack[p][round]);
  const pick = order.slice(0, COUNT);
  const done = (lib.samples.length - fresh.length);
  for (const [i, s] of pick.entries()) {
    const n = done + i;   // carry on the pattern from where earlier batches left off
    const state = { ...base, skin: cycle(SKINS, n, 1), format: n % 5 === 4 ? 'build' : 'scroll', laneH: cycle(LANES, n, 1),
      caption: cycle(CAPTIONS, n, 1), crop: false, jump: false, pack: s.pack, hidden: [] };
    await api('/queue', 'POST', { id: s.id, state });
    console.log(`queued  ${s.title} (${s.pack}) · ${state.format} · ${state.skin} · lanes ${state.laneH === 110 ? 'Medium' : 'Thin'} · "${state.caption}"`);
  }
  if (arg('--export') && pick.length) { await api('/export-all', 'POST'); console.log('exporting'); }
  console.log(`${pick.length} queued; ${fresh.length - pick.length} still without a reel`);
})().catch(e => { console.error(e.message); process.exit(1); });
