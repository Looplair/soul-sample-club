# SSC Reels

A local tool for making 9:16 Instagram reels of Soul Sample Club samples: the sample's stems laid
out as lanes in a session, the playhead moving, a caption on top, and the first 8 bars of the
sample's MP3 preview as the audio. Same engine as Looplair Reels, with Soul Sample Club's own look.

## Use it

Double-click **SSC Reels** on the Desktop. Chrome opens at http://localhost:7476.

- **Library**: every sample in Soul Sample Club's *released* monthly packs, read from the site
  (bonus packs are Looplair's and are left out; a pack appears once it's published). Search,
  filter by pack, "unused only", "Pick an unused one", Refresh.
- **Builder**: four SSC skins (Club, Cover, Mono, Daylight) that take their colours from the
  pack's cover, as the site does; the cover sits in the toolbar and the browser panel lists SSC's
  packs. Format, lane height, caption (saved captions include "comment CLUB for more"), corner
  label, messy crop, page-jump, per-bar lane fixes, hide lanes. Add to queue or Export now.
- **Queue**: Export all renders one reel at a time (about 1½ minutes each) and keeps going if the
  tab is closed. Closing the Terminal window stops it. Tick **Posted** once a reel is up.

Reels go to `Dropbox/SOUL SAMPLE CLUB/REELS/`; the tool's memory (export log, queue, bar
corrections, saved captions, readings) is in `_data` inside it.

## Where things come from

| What | From |
|---|---|
| Which samples exist, names, BPM, key, cover | the site's database (read-only, keys from the repo's `.env.local`) |
| Audio | the sample's MP3 preview on the site, cut to the first 8 bars with a short fade |
| Stems | `Dropbox/SOUL SAMPLE CLUB/**/STEMS/<NAME>/` when there, else the site's stems zip |
| BPM | the Dropbox file name `NAME (74 BPM, Bb Minor).wav` when there (decimals), else the site |

Nothing is downloaded until a sample is opened. The tool never writes to the site.

## Files

`server.js` (library, readings, queue, export worker, memory), `read_stems.py` (reads the
arrangement by un-mixing each bar against the stems; same as Looplair Reels), `exporter.js`
(headless Chrome → ffmpeg), `cover_palette.py` (six distinct colours from a cover),
`app/render.js` (the renderer, SSC skins), `app/index.html` (the tool).

Needs Node 22, Python 3 + numpy, ffmpeg, Google Chrome. First run: `npm install` in this folder
(the launcher does it).
