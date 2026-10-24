// Looplair Reels renderer. Draws one frame of a 9:16 reel onto a 1080x1920 canvas.
// Used by the tool's builder (live preview) and by the MP4 exporter (render.html), so the
// two can never look different. Pulled out of the signed-off Stem Reel Builder page unchanged
// apart from: lanes shrink to fit past 12 (or are hidden per reel), per-bar corrections from
// the tool, and the browser panel's pack list passed in.
(function () {
  // Soul Sample Club's own look, not Looplair's DAW skins: black and white chrome, colour only
  // from the pack's cover (as on soulsampleclub.com), Unbounded type, a glass glow under what plays.
  const SKINS = [
    {id: 'club', name: 'Club', back: '#000000',
     bg: '#0A0A0B', alt: '#0E0E10', rail: '#060607', railText: '#FFFFFF', railDim: 'rgba(255,255,255,.34)',
     ruler: '#050506', rulerText: 'rgba(255,255,255,.55)', beat: 'rgba(255,255,255,.035)', bar: 'rgba(255,255,255,.10)', bar2: 'rgba(255,255,255,.015)',
     tool: '#050506', lcd: '#000000', lcdText: '#FFFFFF', play: '#FFFFFF', rec: '#FF453A', accentText: '#000000',
     wave: 'rgba(0,0,0,.55)', head: 'rgba(0,0,0,.24)', headText: '#FFFFFF', btn: '#141416',
     clips: [], r: 12, emboss: .06, drop: false, fromCover: true, glow: true},
    {id: 'cover', name: 'Cover', back: '#000000',
     bg: 'rgba(0,0,0,.46)', alt: 'rgba(0,0,0,.38)', rail: 'rgba(0,0,0,.58)', railText: '#FFFFFF', railDim: 'rgba(255,255,255,.4)',
     ruler: 'rgba(0,0,0,.62)', rulerText: 'rgba(255,255,255,.6)', beat: 'rgba(255,255,255,.04)', bar: 'rgba(255,255,255,.12)', bar2: 'rgba(255,255,255,0)',
     tool: 'rgba(0,0,0,.62)', lcd: 'rgba(0,0,0,.55)', lcdText: '#FFFFFF', play: '#FFFFFF', rec: '#FF453A', accentText: '#000000',
     wave: 'rgba(0,0,0,.5)', head: 'rgba(0,0,0,.22)', headText: '#FFFFFF', btn: '#1C1C1F',
     clips: [], r: 12, emboss: .05, drop: false, fromCover: true, glow: true, blur: true},
    {id: 'mono', name: 'Mono', back: '#000000',
     bg: '#000000', alt: '#060606', rail: '#000000', railText: '#FFFFFF', railDim: 'rgba(255,255,255,.3)',
     ruler: '#000000', rulerText: 'rgba(255,255,255,.5)', beat: 'rgba(255,255,255,.04)', bar: 'rgba(255,255,255,.12)', bar2: 'rgba(255,255,255,0)',
     tool: '#000000', lcd: '#0B0B0C', lcdText: '#FFFFFF', play: '#FFFFFF', rec: '#FFFFFF', accentText: '#000000',
     wave: 'rgba(255,255,255,.78)', head: 'rgba(255,255,255,.06)', headText: '#FFFFFF', btn: '#141416',
     clips: ['#232326'], r: 10, emboss: 0, drop: false, accentFromCover: true, monoLive: true, glow: true},
    {id: 'daylight', name: 'Daylight', back: '#E8E8E4', light: true,
     bg: '#F7F7F4', alt: '#F1F1ED', rail: '#EDEDE9', railText: '#111111', railDim: 'rgba(17,17,17,.38)',
     ruler: '#E6E6E2', rulerText: 'rgba(17,17,17,.6)', beat: 'rgba(0,0,0,.05)', bar: 'rgba(0,0,0,.12)', bar2: 'rgba(0,0,0,0)',
     tool: '#FFFFFF', lcd: '#111111', lcdText: '#FFFFFF', play: '#111111', rec: '#E5463B', accentText: '#FFFFFF',
     wave: 'rgba(0,0,0,.5)', head: 'rgba(0,0,0,.10)', headText: '#111111', btn: '#E4E4E0',
     clips: [], r: 12, emboss: .05, drop: false, fromCover: true, glow: true},
  ];
  const FALLBACK = ['#C98A5B', '#7FA38E', '#B89A5E', '#6E86A8', '#A86E6E', '#8E7AB0'];

  function create(canvas, D, opts = {}) {
  const DUR = D.dur, BAR = D.bar, RATE = D.rate || 100, BPM = D.bpm;
  const PALETTE = (opts.palette && opts.palette.length ? opts.palette : FALLBACK).filter(c => /^#[0-9a-f]{6}$/i.test(c));
  const COVER = opts.cover || null;
  const skinOf = id => { const K0 = SKINS.find(k => k.id === id) || SKINS[0];
    return {...K0, clips: K0.fromCover ? PALETTE : K0.clips, accent: PALETTE[0]}; };
  // the Cover skin: the pack's art, blurred and dimmed, behind see-through lanes
  let blurred = null;
  if (COVER) { blurred = document.createElement('canvas'); blurred.width = 1080; blurred.height = 1920;
    const b = blurred.getContext('2d'), sc = Math.max(1080 / COVER.width, 1920 / COVER.height) * 1.15;
    b.filter = 'blur(70px) saturate(1.25)';
    b.drawImage(COVER, (1080 - COVER.width * sc) / 2, (1920 - COVER.height * sc) / 2, COVER.width * sc, COVER.height * sc);
    b.filter = 'none'; b.fillStyle = 'rgba(0,0,0,.38)'; b.fillRect(0, 0, 1080, 1920); }
  let st = {};
  // ---------------------------------------------------------------- stems, and the moments read off them
  // A lane's bars: the reading's spans, unless Chris has corrected them (click a bar on/off).
  const BARS = Math.max(1, Math.round(DUR / BAR));
  const barsOf = s => { const on = Array(BARS).fill(false);
    s.spans.forEach(([a, b]) => { for (let k = a; k < b && k < BARS; k++) on[k] = true; }); return on; };
  const spansOf = on => { const out = []; let a = null;
    for (let k = 0; k <= on.length; k++) { if (on[k] && a === null) a = k; else if (!on[k] && a !== null) { out.push([a, k]); a = null; } }
    return out; };
  const S = D.stems.map((s, i) => {
    const e = s.env, out = new Float32Array(e.length);
    for (let k = 0; k < e.length; k++) { let a = 0, n = 0;
      for (let j = -2; j <= 2; j++) { const v = e[k + j]; if (v !== undefined) { a += v; n++; } }
      out[k] = Math.pow(a / n, .7); }
    const fix = (D.overrides || {})[s.name];
    const on = fix && fix.length === BARS ? fix.slice() : barsOf(s);
    const spans = spansOf(on).map(([a, b]) => [a * BAR, b * BAR]);
    // Every stem file starts on bar 1 but its SOUND starts where the part comes in; The Build
    // records each clip from there, snapped back to the beat like a punch-in.
    const peak = Math.max(...e) || 1, beat = BAR / 4;
    const starts = spans.map(([a, b]) => {
      for (let k = Math.floor(a * RATE); k < Math.min(e.length, b * RATE); k++)
        if (e[k] > .06 * peak) return Math.max(a, Math.floor(k / RATE / beat) * beat);
      return a; });
    return {i, name: s.name, on, spans, starts, env: out, lvl: 0, first: starts.length ? Math.min(...starts) : Infinity};
  });
  const wrapT = t => ((t % DUR) + DUR) % DUR;
  const at = (s, t) => s.env[Math.min(s.env.length - 1, Math.floor(wrapT(t) * RATE))] || 0;
  const active = (s, t) => s.spans.some(([a, b]) => t >= a && t < b);
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = p => 1 - Math.pow(1 - clamp(p), 3);
  const inOut = p => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const back = p => { p = clamp(p); const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

  const DISPLAY = s => `800 ${s}px Unbounded, "Arial Black", sans-serif`;
  const UI = (s, w = 700) => `${w} ${s}px Archivo, Arial, sans-serif`;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixc = (h, to, k) => { const a = rgb(h); return `rgb(${a.map(v => Math.round(v + (to - v) * k)).join(',')})`; };
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function wave(ctx, s, t0, t1, x, y, w, h, gain) {
    if (w < 2) return;
    const N = Math.max(24, Math.floor(w / 4));
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const v = at(s, t0 + (t1 - t0) * i / N) * gain;
      i ? ctx.lineTo(x + w * i / N, y - v * h / 2) : ctx.moveTo(x, y - v * h / 2); }
    for (let i = N; i >= 0; i--) ctx.lineTo(x + w * i / N, y + at(s, t0 + (t1 - t0) * i / N) * gain * h / 2);
    ctx.closePath(); ctx.fill();
  }

  // ---------------------------------------------------------------- the session, full bleed
  // Sized off the reference screen recording: the playlist runs edge to edge,
  // about four bars across, and tracks keep stacking below the used ones.
  const RW = 1080, RH = 1920;
  const G = {W: RW, H: RH, TB: 124, RUL: 58, L: 216, ROW: 142};
  G.TOP = G.TB + G.RUL;
  const FULL = 142, FIT = Math.floor((G.H - G.TOP) / FULL);   // ~12 lanes at the approved height
  let ROWS = Math.ceil((G.H - G.TOP) / G.ROW), VIS = S, K1 = 1;
  // Which lanes show, and how tall. Each reel picks a lane height (st.laneH: 142 is the approved
  // "Big", thinner ones read more like a real DAW). Lanes keep that height with empty "Track N"
  // rows below; when they don't all fit, every lane shrinks evenly so all of them do.
  // Chris can hide lanes per reel instead.
  function layout() {
    const hidden = new Set(st.hidden || []);
    VIS = S.filter(s => !hidden.has(s.name));
    const base = st.laneH || FULL, fit = Math.floor((G.H - G.TOP) / base);
    G.ROW = VIS.length > fit ? (G.H - G.TOP) / VIS.length : base;
    K1 = G.ROW / FULL;
    ROWS = Math.ceil((G.H - G.TOP) / G.ROW);
  }

  function clip(ctx, K, s, x, w, ly, lh, sx, opt) {
    if (w < 1) return;
    const pad = 5, y = ly + pad, h = lh - pad * 2, col = K.clips[s.i % K.clips.length];
    if (K.glow && opt.live) { ctx.save(); ctx.shadowColor = K.monoLive ? K.accent : col; ctx.shadowBlur = 34; ctx.fillStyle = col; rr(ctx, x, y, w, h, K.r); ctx.fill(); ctx.restore(); }
    if (K.drop) { ctx.fillStyle = 'rgba(0,0,0,.32)'; rr(ctx, x + 1, y + 3, w, h, K.r); ctx.fill(); }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mixc(col, 255, K.emboss)); g.addColorStop(.5, col); g.addColorStop(1, mixc(col, 0, K.emboss));
    ctx.fillStyle = g; rr(ctx, x, y, w, h, K.r); ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, K.r); ctx.clip();
    const hh = Math.max(14, 28 * K1);
    ctx.fillStyle = K.monoLive && opt.live ? K.accent : K.head; ctx.fillRect(x, y, w, hh);   // Mono: only a playing clip's header takes the cover colour
    ctx.font = UI(Math.max(10, 17 * K1)); ctx.fillStyle = K.headText; ctx.letterSpacing = '2px'; ctx.fillText(s.name, x + 11, y + hh * .72); ctx.letterSpacing = '0px';
    ctx.fillStyle = K.wave;
    wave(ctx, s, opt.tStart, opt.tStart + w / sx, x, y + hh + (h - hh) / 2, w, (h - hh) * .86, 1 + s.lvl * .1);
    if (opt.live) { ctx.fillStyle = `rgba(255,255,255,${.05 + s.lvl * .14})`; ctx.fillRect(x, y, w, h); }
    if (opt.rec) { const fx = Math.max(x, x + w - opt.rec), rg = ctx.createLinearGradient(fx, 0, x + w, 0);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, K.rec);
      ctx.globalAlpha = .82; ctx.fillStyle = rg; ctx.fillRect(fx, y, x + w - fx, h); ctx.globalAlpha = 1; }
    ctx.restore();
    if (K.emboss > .1) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x + K.r, y + .5, w - K.r * 2, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,.30)'; ctx.fillRect(x + K.r, y + h - 2, w - K.r * 2, 1.5); }
    if (K.outline) { ctx.strokeStyle = K.outline; ctx.lineWidth = 3; rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, K.r); ctx.stroke(); }
    if (K.win98) {                      // the 3D bevel: light top-left, dark bottom-right
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
      ctx.fillStyle = '#404040'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
    }
  }
  function bevel(ctx, K, x, y, w, h, glyph, on) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mixc(K.btn, 255, .14)); g.addColorStop(1, mixc(K.btn, 0, .2));
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x + 5, y + .5, w - 10, 1.5);
    ctx.fillStyle = on ? (glyph === 'rec' ? K.rec : K.play) : K.railDim;
    const cx = x + w / 2, cy = y + h / 2; ctx.beginPath();
    if (glyph === 'play') { ctx.moveTo(cx - 9, cy - 12); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx - 9, cy + 12); }
    else if (glyph === 'stop') ctx.rect(cx - 10, cy - 10, 20, 20); else ctx.arc(cx, cy, 11, 0, 7);
    ctx.fill();
  }
  const posText = t => `${String(Math.floor(t / BAR) + 1).padStart(3, '0')}.${Math.floor((t % BAR) / (BAR / 4)) + 1}.${String(Math.floor(((t % (BAR / 4)) / (BAR / 4)) * 96)).padStart(2, '0')}`;

  function chrome(ctx, K, t, label, recording) {
    const {W, H, TB, RUL, L, TOP} = G;
    if (K.blur && blurred) ctx.drawImage(blurred, 0, 0);
    ctx.fillStyle = K.bg; ctx.fillRect(0, 0, W, H);
    if (K.toolGrad) { const tg = ctx.createLinearGradient(0, 0, W, 0); tg.addColorStop(0, K.toolGrad[0]); tg.addColorStop(1, K.toolGrad[1]); ctx.fillStyle = tg; }
    else ctx.fillStyle = K.tool;
    ctx.fillRect(0, 0, W, TB);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, TB - 1.5, W, 1.5);
    const by = TB - 80;
    bevel(ctx, K, 22, by, 58, 56, 'play', true); bevel(ctx, K, 88, by, 58, 56, 'stop', false); bevel(ctx, K, 154, by, 58, 56, 'rec', recording);
    ctx.fillStyle = K.lcd; rr(ctx, 230, by - 4, 420, 64, 9); ctx.fill();
    ctx.font = DISPLAY(30); ctx.fillStyle = K.lcdText; ctx.fillText(posText(t), 250, by + 40);
    ctx.font = UI(14); ctx.letterSpacing = '3px'; ctx.globalAlpha = .7; ctx.fillText('BPM', 512, by + 20); ctx.globalAlpha = 1;
    ctx.font = DISPLAY(24); ctx.fillText(BPM.toFixed(1), 512, by + 48); ctx.letterSpacing = '0px';
    ctx.font = DISPLAY(24); ctx.fillStyle = K.toolText || K.railText; ctx.textAlign = 'right'; ctx.letterSpacing = '2px';
    // the label belongs to the edge you can SEE: with the messy crop the session is pushed
    // right and scaled, so its own right edge is off screen
    const vr = st.crop ? (RW - (st.bw - 4)) / 1.02 : W;
    let lx = vr - 28;
    if (COVER) {                              // the pack's cover, like album art in a player
      const cs = 60, cx = lx - cs, cy = by - 2;
      ctx.save(); rr(ctx, cx, cy, cs, cs, 10); ctx.clip(); ctx.drawImage(COVER, cx, cy, cs, cs); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; rr(ctx, cx, cy, cs, cs, 10); ctx.stroke();
      lx = cx - 18;
    }
    // the label fits the gap between the position/BPM display and the cover (track names never shrink; this does)
    const room = lx - 670, full = ctx.measureText(label).width;
    if (full > room && room > 40) ctx.font = DISPLAY(Math.max(12, 24 * room / full));
    ctx.fillText(label, lx, by + 38); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    ctx.fillStyle = K.ruler; ctx.fillRect(0, TB, W, RUL);
    ctx.fillStyle = K.rail; ctx.fillRect(0, TOP, L, H - TOP);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(L - 1.5, TB, 1.5, H - TB);
  }
  function rows(ctx, K) {
    for (let r = 0; r < ROWS; r++) { ctx.fillStyle = r % 2 ? K.alt : K.bg; ctx.fillRect(G.L, G.TOP + r * G.ROW, G.W - G.L, G.ROW); }
  }
  function grid(ctx, K, t0, sx) {
    const {W, H, TB, L, TOP} = G, q = BAR / 4;
    for (let k = Math.floor(t0 / q) - 1, last = Math.ceil((t0 + (W - L) / sx) / q) + 1; k <= last; k++) {
      const x = L + (k * q - t0) * sx; if (x < L || x > W) continue;
      const isBar = k % 4 === 0;
      if (isBar && K.bar2 && Math.floor(k / 4) % 2 === 0) { ctx.fillStyle = K.bar2; ctx.fillRect(x, TOP, BAR * sx, H - TOP); }
      ctx.fillStyle = isBar ? K.bar : K.beat; ctx.fillRect(x, isBar ? TB + 12 : TOP, 1.5, H - (isBar ? TB + 12 : TOP));
      if (isBar) { ctx.font = UI(22); ctx.fillStyle = K.rulerText; ctx.fillText(String(((Math.floor(k / 4) % 8) + 8) % 8 + 1), x + 9, TB + 38); }
    }
  }
  function head(ctx, K, r, s, on, armed) {
    const y = G.TOP + r * G.ROW, h = G.ROW;
    if (s) {
      ctx.fillStyle = armed ? K.clips[s.i % K.clips.length] : K.railDim; ctx.fillRect(14, y + 12 * K1, 8, h - 24 * K1);
      // one size for every name in the reel, scaled with the lane height; never shrunk per name
      const nm = armed ? s.name : `TRACK ${r + 1}`; ctx.font = DISPLAY(26 * Math.max(.6, Math.min(1, K1)));
      // every name the same size; a long one runs under the column edge and is cut off, as in a DAW
      ctx.save(); ctx.beginPath(); ctx.rect(30, y, G.L - 44, h); ctx.clip();
      ctx.fillStyle = on ? K.railText : K.railDim; ctx.fillText(nm, 36, y + h / 2 + (K1 > .7 ? 2 : 8 * K1)); ctx.restore();
      if (K1 > .7) {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, 36, y + h / 2 + 18 * K1, 160, 7, 3.5); ctx.fill();
        if (armed) { ctx.fillStyle = on ? K.play : K.railDim; rr(ctx, 36, y + h / 2 + 18 * K1, 160 * s.lvl, 7, 3.5); ctx.fill(); } }
    } else {
      ctx.font = UI(Math.max(12, 22 * K1)); ctx.fillStyle = K.railDim; ctx.fillText(`Track ${r + 1}`, 36, y + h / 2 + 8 * K1);
    }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, y + h - 1.5, G.W, 1.5);
  }
  function playhead(ctx, K, x) {
    ctx.fillStyle = K.play; ctx.fillRect(x - 1.5, G.TB + 6, 3, G.H - G.TB);
    ctx.beginPath(); ctx.moveTo(x - 13, G.TB + 6); ctx.lineTo(x + 13, G.TB + 6); ctx.lineTo(x, G.TB + 24); ctx.fill();
  }
  const SPAN = BAR * 4;            // about four bars across, like the reference

  function drawScroll(ctx, K, t, label) {
    chrome(ctx, K, t, label, false); rows(ctx, K);
    const {W, L, TOP, ROW} = G, sx = (W - L) / SPAN;
    let t0 = t - SPAN * .3, ph = L + (W - L) * .3;
    if (st.jump) { const P = SPAN * .85, page = Math.floor(t / P); t0 = page * P - SPAN * .06; ph = L + (t - t0) * sx; }
    if (K.cycle) { ctx.fillStyle = K.cycle; ctx.globalAlpha = .85; const a = L + (0 - t0) * sx, b = L + (DUR - t0) * sx;
      ctx.fillRect(Math.max(L, a), G.TB + 44, Math.min(W, b) - Math.max(L, a), 9); ctx.globalAlpha = 1; }
    grid(ctx, K, t0, sx);
    VIS.forEach((s, r) => { const y = TOP + r * ROW;
      ctx.save(); ctx.beginPath(); ctx.rect(L, y, W - L, ROW); ctx.clip();
      for (let rep = -1; rep <= 1; rep++) s.spans.forEach(([a, b]) => { const A = a + rep * DUR, B = b + rep * DUR;
        const x0 = L + (A - t0) * sx, x1 = L + (B - t0) * sx; if (x1 < L || x0 > W) return;
        clip(ctx, K, s, x0, x1 - x0, y, ROW, sx, {tStart: A, live: t >= A && t < B}); });
      ctx.restore(); });
    for (let r = 0; r < ROWS; r++) head(ctx, K, r, VIS[r], VIS[r] && active(VIS[r], wrapT(t)), true);
    playhead(ctx, K, ph);
    return {fx: ph, fy: TOP + ROW / 2};
  }
  function drawBuild(ctx, K, t, label) {
    chrome(ctx, K, t, label, true); rows(ctx, K);
    const {W, H, L, TOP, ROW} = G, now = L + (W - L) * .72, t0 = t - SPAN * .72, sx = (W - L) / SPAN;
    grid(ctx, K, t0, sx);
    VIS.forEach((s, r) => { const y = TOP + r * ROW;
      ctx.save(); ctx.beginPath(); ctx.rect(L, y, now - L, ROW); ctx.clip();
      s.spans.forEach(([a0, b], k) => { const a = s.starts[k] ?? a0; if (t < a) return; const x0 = L + (a - t0) * sx, x1 = L + (Math.min(b, t) - t0) * sx;
        if (x1 < L) return; clip(ctx, K, s, x0, x1 - x0, y, ROW, sx, {tStart: a, rec: t < b ? sx * BAR * .5 : 0, live: t < b}); });
      ctx.restore(); });
    ctx.fillStyle = 'rgba(0,0,0,.10)'; ctx.fillRect(now, TOP, W - now, H - TOP);
    for (let r = 0; r < ROWS; r++) head(ctx, K, r, VIS[r], VIS[r] && active(VIS[r], wrapT(t)), VIS[r] && t >= VIS[r].first);
    playhead(ctx, K, now);
    return {fx: now - 60, fy: TOP + ROW / 2};
  }

  const grain = document.createElement('canvas'); grain.width = grain.height = 200;
  { const g = grain.getContext('2d'), im = g.createImageData(200, 200);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i+1] = im.data[i+2] = v; im.data[i+3] = 255; }
    g.putImageData(im, 0, 0); }
  const daw = document.createElement('canvas'); daw.width = RW; daw.height = RH;
  const dctx = daw.getContext('2d');

  function lines(ctx, text, maxW) {
    const out = [];
    text.split('\n').forEach(par => { let cur = '';
      par.split(/\s+/).filter(Boolean).forEach(w => { const test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = w; } else cur = test; });
      if (cur) out.push(cur); });
    return out.slice(0, 4);
  }
  const CAP = s => `800 ${s}px "TikTok Sans", Montserrat, "Arial Black", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  function caption(ctx, st, K) {
    const text = st.caption.trim(); if (!text) return;
    const size = st.csize; ctx.font = CAP(size);
    const ls = lines(ctx, text, 950), lh = size * 1.16;
    let y = RH * st.cpos - (ls.length * lh) / 2 + size * .8;
    ctx.save(); ctx.textAlign = 'center';
    ls.forEach(ln => {
      const w = ctx.measureText(ln).width;
      if (st.cstyle === 'box') {
        ctx.fillStyle = '#FFFFFF'; rr(ctx, RW / 2 - w / 2 - size * .28, y - size * .88, w + size * .56, size * 1.16, size * .2); ctx.fill();
        ctx.fillStyle = '#121212'; ctx.fillText(ln, RW / 2, y);
      } else if (st.cstyle === 'outline') {
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(6, size * .16); ctx.strokeStyle = '#000'; ctx.strokeText(ln, RW / 2, y);
        ctx.fillStyle = '#FFF'; ctx.fillText(ln, RW / 2, y);
      } else if (K.light) {                        // plain caption on the light skin: dark text
        ctx.fillStyle = '#141414'; ctx.fillText(ln, RW / 2, y);
      } else {                                     // plain: white with a soft shadow, as in the reference
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#FFF'; ctx.fillText(ln, RW / 2, y);
      }
      y += lh;
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- rough it up
  // the browser panel that sat left of the playlist: the real Looplair catalogue
  // (standalone packs from the live store, grouped by series). The pack the sample
  // came from opens its series and is highlighted; with no pack, nothing is.
  const SERIES = opts.series || [];
  function folder(ctx, x, y, col) {
    ctx.fillStyle = col; rr(ctx, x, y - 13, 9, 5, 1.5); ctx.fill(); rr(ctx, x, y - 10, 22, 15, 2.5); ctx.fill();
  }
  // the browser panel: Soul Sample Club's released packs, newest first, each with its cover colour.
  // The pack the sample came from is highlighted; with no pack, nothing is.
  const PACKS = opts.packs || [];
  function sliver(ctx, K, w, sel) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, RH); ctx.clip();
    if (K.blur && blurred) { ctx.drawImage(blurred, 0, 0); ctx.fillStyle = 'rgba(0,0,0,.55)'; }
    else ctx.fillStyle = K.light ? '#E9E9E5' : '#030303';
    ctx.fillRect(0, 0, w, RH);
    ctx.font = UI(16, 800); ctx.letterSpacing = '3px'; ctx.fillStyle = K.railDim; ctx.fillText('SOUL SAMPLE CLUB', 18, 58); ctx.letterSpacing = '0px';
    let y = 150;
    ctx.font = UI(19, 700); ctx.fillStyle = K.railText; ctx.fillText('▾  Packs', 14, y); y += 48;
    PACKS.forEach(({name, color}) => {
      const hit = name === sel;
      if (hit) { ctx.fillStyle = color; ctx.globalAlpha = .9; ctx.fillRect(0, y - 30, w, 42); ctx.globalAlpha = 1; }
      ctx.fillStyle = hit ? '#000' : color; rr(ctx, 18, y - 20, 22, 22, 6); ctx.fill();
      ctx.font = UI(19, hit ? 800 : 600); ctx.fillStyle = hit ? '#000' : K.railText;
      ctx.fillText(name, 52, y - 2); y += 44;
    });
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(w - 4, 0, 4, RH);
    ctx.restore();
  }

  function igOverlay(ctx) {
    ctx.save();
    const shade = ctx.createLinearGradient(0, 1500, 0, RH); shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = shade; ctx.fillRect(0, 1500, RW, RH - 1500);
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12;
    ctx.font = UI(46, 800); ctx.fillText('Reels', 52, 150);
    [[1240, '♥', '12.4K'], [1420, '●', '318'], [1600, '➤', '1.9K'], [1760, '⋯', '']].forEach(([y, g, n]) => {
      ctx.font = UI(64, 700); ctx.textAlign = 'center'; ctx.fillText(g, RW - 72, y);
      if (n) { ctx.font = UI(28, 700); ctx.fillText(n, RW - 72, y + 46); } });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(84, 1716, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = UI(34, 800); ctx.fillText('looplair', 136, 1728);
    ctx.font = UI(30, 500); ctx.fillText('the caption you write in the app sits here…', 52, 1800);
    ctx.font = UI(28, 600); ctx.fillText('♫  Original audio', 52, 1866);
    ctx.restore();
  }

  const ctx = canvas.getContext('2d');
  function render(t, state) {
    st = state; layout();
    const K = skinOf(st.skin);
    const label = st.corner || 'SOUL SAMPLE CLUB';
    (st.format === 'build' ? drawBuild : drawScroll)(dctx, K, t, label);
    if (K.blur && blurred) ctx.drawImage(blurred, 0, 0); else { ctx.fillStyle = K.back; ctx.fillRect(0, 0, RW, RH); }
    if (st.crop) {                    // pushed right, toolbar half off the top, right edge cut
      sliver(ctx, K, st.bw, st.pack);
      ctx.save(); ctx.translate(st.bw - 4, -38); ctx.scale(1.02, 1.02); ctx.drawImage(daw, 0, 0); ctx.restore();
    } else ctx.drawImage(daw, 0, 0);
    caption(ctx, st, K);
    ctx.save(); ctx.globalAlpha = .05; ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-Math.random() * 200, -Math.random() * 200); ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, RW + 200, RH + 200); ctx.restore();
    if (st.ig) igOverlay(ctx);
  }
  // levels: fast attack, slower release; stepped with a fixed dt by the exporter
  function step(t, dt) {
    S.forEach(s => { const target = active(s, t) ? at(s, t) : 0;
      s.lvl += (target - s.lvl) * (1 - Math.exp(-dt * (target > s.lvl ? 38 : 9))); });
  }
  return { render, step, dur: DUR, bar: BAR, bpm: BPM, bars: BARS,
           lanes: S.map(s => ({ name: s.name, on: s.on.slice() })) };
  }

  const CAP = s => `800 ${s}px "TikTok Sans", Montserrat, "Arial Black", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  // canvas text never waits for a font, so load every face the reel draws with before the first frame
  const FACES = [CAP(60), '800 30px Unbounded', '700 20px Archivo', '800 20px Archivo', '600 20px Archivo', '500 20px Archivo'];
  const ready = () => document.fonts ? Promise.all([document.fonts.ready, ...FACES.map(f => document.fonts.load(f).catch(() => {}))]) : Promise.resolve();
  window.LooplairReel = { SKINS, create, ready };   // same API as Looplair Reels, SSC skins
})();
