"""The colours a pack's cover gives its reel: six strong, distinct colours from the art.

SSC's look is black and white chrome with colour only from pack covers, so the reel's clips
take theirs from the cover the same way the site's glass boxes do.

    python3 cover_palette.py <cover image> -> prints ["#rrggbb", ...]
"""
import colorsys
import json
import subprocess
import sys

import numpy as np


def pixels(path, n=96):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={n}:{n}", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(float) / 255


def lift(rgb):
    """A clip colour: readable under a dark waveform, never neon."""
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    s, v = min(.78, max(.42, s * 1.2)), min(.88, max(.58, v * 1.1))
    return np.array(colorsys.hsv_to_rgb(h, s, v))


def palette(px, k=6):
    """k colours that come from the cover AND look different from each other, so lanes read
    apart: cluster the art, then pick greedily for distance; if the cover is one colour family
    (most are), add its neighbours on the colour wheel."""
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px])
    keep = (hsv[:, 1] > .18) & (hsv[:, 2] > .22)
    pool = px[keep] if keep.sum() > 60 else px
    rng = np.random.default_rng(7)
    n = min(14, len(pool))
    cents = pool[rng.choice(len(pool), n, replace=False)]
    for _ in range(25):
        lab = np.argmin(((pool[:, None] - cents[None]) ** 2).sum(-1), 1)
        cents = np.array([pool[lab == j].mean(0) if (lab == j).any() else cents[j] for j in range(n)])
    size = np.bincount(lab, minlength=n).astype(float)
    sat = np.array([colorsys.rgb_to_hsv(*c)[1] for c in cents])
    order = list(np.argsort(-(size * (.35 + sat))))
    picked = [lift(cents[order[0]])]
    for j in order[1:]:
        c = lift(cents[j])
        if min(np.abs(c - p).sum() for p in picked) > .32:
            picked.append(c)
        if len(picked) == k:
            break
    h0, s0, v0 = colorsys.rgb_to_hsv(*picked[0])
    step = 0
    while len(picked) < k:                      # one-family cover: walk the wheel around its main colour
        step += 1
        h = (h0 + (1 if step % 2 else -1) * .085 * ((step + 1) // 2)) % 1
        c = np.array(colorsys.hsv_to_rgb(h, s0, min(.88, v0 * (1.06 if step % 2 else .92))))
        if min(np.abs(c - p).sum() for p in picked) > .2:
            picked.append(c)
    return ["#%02x%02x%02x" % tuple(int(x * 255) for x in c) for c in picked]


if __name__ == "__main__":
    print(json.dumps(palette(pixels(sys.argv[1]))))
