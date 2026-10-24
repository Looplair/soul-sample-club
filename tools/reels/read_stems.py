"""Read a Looplair sample's arrangement from its preview MP3, using its stems.

How Looplair packs are laid out (the rules this is built on):
  * stems are named  <Part>_<anything>.wav  ->  the part name is the lane
  * the preview MP3 is named  <SAMPLE NAME> (<BPM> BPM, <Key>).mp3  or the older
    <SAMPLE NAME> (<BPM> BPM : <Key>).mp3
  * stems are a raw loop at full loudness; the MP3 is the ARRANGED preview
    (usually ~8 bars, everything in from the start, drums often out after bar 4)

So the arrangement cannot be read off the stems: a stem is loud in its own file
whether or not it made the preview. It has to be read off the MP3. For every bar
of the MP3 we ask "how much of each stem is in here?" by un-mixing: model that
bar's spectrum as a non-negative sum of the stems' spectra at the same point in
their loops, and solve for the amounts. A stem that comes out near zero was muted.

The MP3 is also the audio we play, because the stems are not balanced.

Two different kinds of "not playing", which look different on screen:
  a MUTE  - the stem was taken out of the preview (drums after bar 4): no clip
  a REST  - the part is silent at that point in its own loop: the clip carries on,
            with a flat waveform
Bars where a stem is near-silent in its own file can't be measured (a near-empty
column soaks up any amount), so they are left out and inherit the bar before.

    python3 read_stems.py --job job.json out.json                (what the tool calls)
    python3 read_stems.py <stem folder> <preview.mp3> out.json   (by hand)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 22050
N_FFT, HOP = 2048, 512
PRESENT = 0.30        # a stem is "in" a bar when its amount is above 30% of its best bar
QUIET = 0.04          # ...unless the stem itself is near-silent at that point in its loop

# lane order: rhythm section on top, then harmony and melody, voices, then effects
ORDER = [r"drum|kick|snare|hat|perc|clap|break|beat|loop|bongo|conga|shaker|tamb",
         r"bass|808|sub",
         r"key|piano|rhodes|organ|synth|pad|chord|guitar|gtr|arp|bell|harp|vibe",
         r"string|violin|cello|horn|brass|trombone|trumpet|sax|flute|wind",
         r"vox|vocal|voice|choir|chop|sing",
         r"fx|riser|sweep|noise|vinyl|crackle"]

# "(71 BPM, Eb Minor)"  "(68 BPM : A Minor Pentatonic)"  "(79 BPM)"  "(90BPM - C Min)"
BPM_RE = re.compile(r"\((\d+(?:\.\d+)?)\s*BPM\s*[,:\-–]?\s*([^)]*)\)?", re.I)


def parse_bpm(name):
    """-> (bpm, key) from a filename, or (None, '')."""
    m = BPM_RE.search(name)
    return (float(m.group(1)), m.group(2).strip()) if m else (None, "")


def lane_rank(name):
    return next((i for i, pat in enumerate(ORDER) if re.search(pat, name, re.I)), len(ORDER))


# inside the rhythm section the main kit leads: DRUMS before BONGOS
DRUM_FIRST = ["drum", "break", "beat", "loop", "kick", "snare", "clap", "hat", "perc"]


def lane_key(name):
    r = lane_rank(name)
    sub = next((i for i, w in enumerate(DRUM_FIRST) if w in name.lower()), len(DRUM_FIRST)) if r == 0 else 0
    return (r, sub, name)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64)


def spec(x):
    """Magnitude spectrogram, frames x bins."""
    if len(x) < N_FFT:
        x = np.pad(x, (0, N_FFT - len(x)))
    win = np.hanning(N_FFT)
    n = 1 + (len(x) - N_FFT) // HOP
    frames = np.stack([x[i * HOP:i * HOP + N_FFT] * win for i in range(n)])
    return np.abs(np.fft.rfft(frames, axis=1))


def nnls(A, y, iters=500):
    """Non-negative least squares (Lawson-Hanson), on the normal equations.

    The first version tried every subset of stems, which is exact but doubles in
    cost per stem: fine for 5, hopeless for the 14-23 that a third of the packs
    have. This finds the same answer in a handful of small solves."""
    AtA, Aty = A.T @ A, A.T @ y
    n = len(Aty)
    P, x = np.zeros(n, bool), np.zeros(n)
    tol = 1e-10 * max(1.0, float(np.abs(Aty).max()))
    for _ in range(iters):
        w = Aty - AtA @ x
        cand = np.flatnonzero(~P)
        if cand.size == 0:
            break
        j = cand[np.argmax(w[cand])]
        if w[j] <= tol:
            break
        P[j] = True
        while True:
            idx = np.flatnonzero(P)
            z = np.zeros(n)
            z[idx] = np.linalg.lstsq(AtA[np.ix_(idx, idx)], Aty[idx], rcond=None)[0]
            if (z[idx] > tol).all():
                x = z
                break
            neg = idx[z[idx] <= tol]
            alpha = np.min(x[neg] / np.maximum(x[neg] - z[neg], 1e-300))
            x = x + alpha * (z - x)
            P &= x > tol
            if not P.any():
                break
    return np.maximum(x, 0)


def align(mix, loop):
    """Where the stem loop starts in the MP3 (MP3s carry a few ms of encoder delay)."""
    n = min(len(mix), len(loop), SR * 6)
    a, b = mix[:n] - mix[:n].mean(), loop[:n] - loop[:n].mean()
    corr = np.fft.irfft(np.fft.rfft(a, 2 * n) * np.conj(np.fft.rfft(b, 2 * n)))
    w = int(.25 * SR)
    lag = int(np.argmax(np.r_[corr[:w], corr[-w:]]))
    return lag if lag < w else lag - 2 * w


def estimate_bpm(loop_seconds):
    """No BPM in any filename: take the tempo that makes the stem loop a whole
    number of bars, preferring 4 or 8 bars in the range these packs live in."""
    cands = [(bars, 240 * bars / loop_seconds) for bars in (4, 8, 2, 16, 1)]
    for lo, hi in ((70, 140), (60, 180)):
        for bars, bpm in cands:
            if lo <= bpm <= hi:
                return round(bpm, 2)
    return round(cands[0][1], 2)


def read_job(job):
    """job: {title, bpm|None, key, preview, stems:[{name, path}], pack}"""
    mix = load(job["preview"])
    stems = [load(s["path"]) for s in job["stems"]]
    if not stems:
        raise SystemExit("no stems")
    bpm, estimated = job.get("bpm"), False
    if not bpm:
        bpm, estimated = estimate_bpm(min(len(s) for s in stems) / SR), True
    bar = 4 * 60 / bpm
    bs = int(round(bar * SR))
    loop_bars = [max(1, round(len(s) / SR / bar)) for s in stems]
    total_bars = max(1, round(len(mix) / SR / bar))
    L = min(len(s) for s in stems)
    off = align(mix, sum(s[:L] for s in stems))

    G = np.zeros((total_bars, len(stems)))
    own = np.zeros((total_bars, len(stems)))
    for b in range(total_bars):
        m0 = off + b * bs
        seg = mix[max(0, m0):m0 + bs]
        if len(seg) < bs // 2:
            continue
        cols = []
        for i, s in enumerate(stems):
            lb = (b % loop_bars[i]) * bs
            piece = s[lb:lb + len(seg)]
            if len(piece) < len(seg):
                piece = np.pad(piece, (0, len(seg) - len(piece)))
            own[b, i] = np.sqrt(np.mean(piece ** 2))
            cols.append(spec(piece).ravel())
        G[b] = nnls(np.stack(cols, axis=1), spec(seg).ravel())

    loud = own / np.maximum(own.max(axis=0, keepdims=True), 1e-9)
    measurable = loud > QUIET
    Gm = np.where(measurable, G, 0.0)
    norm = Gm / np.maximum(Gm.max(axis=0, keepdims=True), 1e-9)
    on = np.zeros_like(measurable)
    for i in range(len(stems)):
        known = [b for b in range(total_bars) if measurable[b, i]]
        for b in range(total_bars):
            if measurable[b, i]:
                on[b, i] = norm[b, i] > PRESENT
            else:                               # a rest: same state as the nearest measured bar before it
                prev = [k for k in known if k < b]
                ref = prev[-1] if prev else (known[0] if known else None)
                on[b, i] = bool(ref is not None and norm[ref, i] > PRESENT)

    dur = len(mix) / SR
    rate, n = 100, int(dur * 100)
    hop = SR // rate
    out = {"title": job["title"], "bpm": bpm, "bpm_estimated": estimated, "key": job.get("key", ""),
           "pack": job.get("pack", ""), "bar": round(bar, 4), "dur": round(dur, 4), "bars": total_bars,
           "offset_ms": round(off / SR * 1000, 1), "rate": rate, "stems": []}
    for i, (s, meta) in enumerate(zip(stems, job["stems"])):
        spans, a = [], None
        for b in range(total_bars + 1):
            hit = b < total_bars and on[b, i]
            if hit and a is None:
                a = b
            elif not hit and a is not None:
                spans.append([a, b]); a = None
        # the waveform for the video: the stem's own loop laid over the preview timeline,
        # NOT gated - the page only draws inside clips, and a bar Chris switches back on
        # needs its real waveform to show
        tiled = np.zeros(int(dur * SR) + SR)
        pos = max(0, off)
        while pos < len(tiled):
            k = min(len(s), len(tiled) - pos); tiled[pos:pos + k] = s[:k]; pos += len(s)
        env = np.sqrt(np.convolve(tiled ** 2, np.ones(hop) / hop, "same"))[::hop][:n]
        env = env / (env.max() or 1)
        out["stems"].append({"name": meta["name"], "file": Path(meta["path"]).name, "spans": spans,
                             "amount": [round(float(v), 2) for v in norm[:, i]],
                             "env": [round(float(v), 3) for v in env]})
    return out


def job_from_folder(stem_dir, mp3):
    """By-hand mode: a stems folder and its preview."""
    bpm, key = parse_bpm(Path(mp3).name)
    title = re.sub(r"\s*\(.*$", "", Path(mp3).stem).strip()
    stems = [{"name": (f.stem.split("_")[0] if "_" in f.stem else f.stem).strip().upper(), "path": str(f)}
             for f in sorted(Path(stem_dir).iterdir()) if f.suffix.lower() in (".wav", ".aif", ".aiff")]
    stems.sort(key=lambda s: lane_key(s["name"]))
    return {"title": title, "bpm": bpm, "key": key, "preview": str(mp3), "stems": stems, "pack": ""}


if __name__ == "__main__":
    if sys.argv[1] == "--job":
        job = json.loads(Path(sys.argv[2]).read_text())
        out_path = Path(sys.argv[3])
    else:
        job = job_from_folder(sys.argv[1], sys.argv[2])
        out_path = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("reading.json")
    info = read_job(job)
    out_path.write_text(json.dumps(info, separators=(",", ":")))
    print(f"{info['title']} — {info['bpm']:g} BPM{' (estimated)' if info['bpm_estimated'] else ''} "
          f"{info['key']}, {info['bars']} bars, offset {info['offset_ms']:+.0f}ms")
    for st in info["stems"]:
        print(f"  {st['name']:<14}" + "".join(f"{v:>6.2f}" for v in st["amount"]) + f"   {st['spans']}")
