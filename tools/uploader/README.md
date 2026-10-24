# SSC Pack Uploader

A local app that turns a Dropbox release folder into a pack on
soulsampleclub.com, hidden until the time you pick.

Open **SSC Uploader** on the Desktop (or run `node tools/uploader/server.mjs --open`),
pick a release, fill in the description and tags, and press the button. It:

1. checks the folder (cover, Pre-Clearance Document, WAVs named
   `NAME (BPM, Key).wav`, a STEMS folder per track)
2. makes the 160kbps MP3s, a zip per track's stems and the full pack zip in
   `STEM ZIPS + MP3/<PACK>`, skipping anything already made
3. uploads it all as an **unpublished** pack, the same way the admin panel does,
   with names cleaned, BPM, key, track order and waveforms filled in
4. optionally schedules it to go live at a UTC time

Re-running carries on where it stopped (progress is kept in
`STEM ZIPS + MP3/<PACK>/.ssc-upload.json`).

Going live: the schedule is a small JSON file in the samples bucket
(`_admin/pack-schedule.json`). `/api/cron/publish-scheduled-packs` publishes
anything due. Supabase pg_cron calls it every 5 minutes (job `publish-scheduled-packs`),
with GitHub Actions and a daily Vercel cron as backups. Supabase keys are read from the site's `.env.local`.
