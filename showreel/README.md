# RUNS ITSELF: 15-second showreel

An ad for automation services, built as a motion piece. One copy-paste done by hand turns into a workflow, the workflow becomes a machine, and the machine spells out the pitch. The last frame is the first frame, so the file loops forever, and so does the workflow.

- `showreel.html` is the whole piece: 1920x1080, one self-contained file with the font embedded. Every pixel is computed from time inside `window.seek(t)`. There are no CSS animations, no timers, and no state carried between frames.
- `out/showreel.mp4` is the final render: H.264 1080p60, BT.709, AAC 320k, 15.0 s, −13.4 LUFS.
- `out/soundtrack.wav` is the soundtrack on its own: 48 kHz 16-bit stereo, loops with no click.
- `STORYBOARD.md` has the beat-by-beat breakdown.

## Look

| | |
|---|---|
| Typeface | Geist, variable 100–900 (SIL OFL 1.1, see `OFL-Geist.txt`) |
| Palette | ink `#0B0B0C`, paper `#F5F5F0`, orange `#FF5A1F` = a person doing it by hand, lime `#D4FF3A` = done automatically, cobalt `#3D3DFF` = the system |
| Camera | locked and front-on. It only ever moves forward: a dive into the DM box at the loop seam, a dolly through the 3D bar, a push through the grid, and punch-ins on the drop |
| Tempo | 120 BPM: one beat = 0.5 s, one bar = 2 s, 7½ bars |

## Preview in a browser

Open `showreel.html?play` and click to play with sound. Open `showreel.html?t=7.95` to see a single frame.

## Render

Needs Node 18+, Playwright with Chromium, and ffmpeg with the `tmix` filter.

```bash
node render/render.cjs --out out/showreel.mp4            # about 4 minutes on 4 cores; ~300 MB of temp PNGs
python3 render/analyze.py out/showreel.mp4 report.png   # holds, motion per beat, loop seam
node render/preview.cjs /tmp/beats --beats --sheet       # one still per beat plus a contact sheet
```

How the render works:

1. The soundtrack is synthesised in the page with an `OfflineAudioContext`. Every beat has a kick, every bar line has a hit, the riser runs 10–12 s, and foley is locked to the picture. The tail is folded back onto the head so the WAV loops without a click.
2. Playwright seeks 2,700 subframes (60 fps × 3) across 4 browser pages and saves PNGs.
3. Inside `seek(t)`, a cheap probe render measures how far things move. The frame is then drawn up to 16 times across a 1/360 s window and averaged, so blur follows the real speed and direction of each element. Still frames are drawn once.
4. ffmpeg's `tmix` blends each group of 3 subframes into one frame, giving a 1/120 s (180°) shutter. Video is encoded with x264 at CRF 14, tagged BT.709, and muxed with the WAV.

## Changing the call to action

The end card reads "Let's automate yours." over a DM box with the placeholder "DM me". Both strings live in the `EC` constant near the top of the script, so you can swap in an email address or handle and run the render again.

If you swap in a longer string, check frame 0 (`?t=0`) and the end card (`?t=14.9`), since both are laid out around these words.
