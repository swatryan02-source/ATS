# DIVE DEEP: 22-second voiceover ad

An ad for recruitment automation, read aloud and set in type as it's read. The voice names the problem (you don't know where your leads come from, how automated hiring could be, or how many hours it eats), and the O inside each problem word turns into the instrument that measures it: a lead-source chart, an automation meter, a clock. The camera then dives into the hiring process, comes out at a free consultation, and ends on a DM box for Ryan Ang. The last frame is the first frame, so the file loops.

- `showreel.html` is the whole piece: 1920x1080, one self-contained file with the font and both voiceovers embedded. Every pixel is computed from time inside `window.seek(t)`. There are no CSS animations, no timers, and no state carried between frames.
- `out/showreel-am_michael.mp4` and `out/showreel-af_heart.mp4` are the final renders, one per voice: H.264 1080p60, BT.709, AAC 320k, 22.0 s, −13.9 and −13.4 LUFS, true peak −1 dBFS.
- `out/soundtrack-am_michael.wav` and `out/soundtrack-af_heart.wav` are the mixes on their own: 48 kHz 16-bit stereo, loop with no click.
- `STORYBOARD.md` has the word-by-word breakdown.

## Look and sound

| | |
|---|---|
| Typeface | Geist, variable 100–900 (SIL OFL 1.1, see `OFL-Geist.txt`) |
| Palette | ink `#0B0B0C`, paper `#F5F5F0`, orange `#FF5A1F` = time lost by hand, lime `#D4FF3A` = done automatically, cobalt `#3D3DFF` = the system |
| Type | Every spoken word appears as it's said. Lines roll up and out of their band like a slot reel; big words hang from one line; the shared O travels from word to word |
| Camera | It only moves forward: a dive into the DM box at the loop seam, a dive over the chart and along the process, punch-ins on the drop |
| Tempo | 120 BPM, 11 bars. Bar lines fall half a beat after the seam, so RECRUITMENT, LEADS, TIME, FREE and DM land on downbeats |
| Voice | Kokoro-82M (Apache 2.0), two voices: `am_michael` (lower) and `af_heart` (brighter). Each phrase is cut at a pause and placed so its key word lands on the beat grid |
| Mix | The music ducks under the voice using the voice's own timestamps, and the band rests for "Ryan Ang" so the name is said in the clear. Through a phone-speaker filter (320 Hz high-pass) speech recognition gets 52 or 53 of the 53 words. The one it can miss over a whole take is the surname, and it hears that correctly when the call to action is checked on its own |

## Preview in a browser

Open `showreel.html?play` and click to play with sound. Add `&voice=af_heart` for the other voice. Open `showreel.html?t=7.2` to see a single frame.

## Render

Needs Node 18+, Playwright with Chromium, and ffmpeg with the `tmix` filter.

```bash
node render/render.cjs --voice am_michael --out out/showreel-am_michael.mp4   # about 4 minutes on 4 cores; ~3 GB of temp PNGs
python3 render/analyze.py out/showreel-am_michael.mp4 report.png              # holds, motion per beat, loop seam
node render/preview.cjs /tmp/beats --beats --sheet --voice af_heart           # one still per beat plus a contact sheet
```

How the render works:

1. The soundtrack is synthesised in the page with an `OfflineAudioContext`: every beat has a kick, scene changes have hits, a riser runs into the drop, and foley is locked to the picture. The voice clips are decoded from the page, placed on the grid, compressed and mixed on top. The tail is folded back onto the head so the WAV loops without a click.
2. Playwright seeks 3,960 subframes (60 fps × 3) across 4 browser pages and saves PNGs.
3. Inside `seek(t)`, a cheap probe render measures how far things move. The frame is then drawn up to 36 times across a 1/360 s window and averaged, so blur follows the real speed and direction of each element. Still frames are drawn once.
4. ffmpeg's `tmix` blends each group of 3 subframes into one frame, giving a 1/120 s (180°) shutter. Video is encoded with x264 at CRF 14, tagged BT.709, and muxed with the WAV.

## Changing the script or the voice

The words live in two places that must match: `SCRIPT` in `render/voiceover.py` (what is spoken) and `TXT` in `showreel.html` (how each word is set). To regenerate the voiceover:

```bash
python3.13 -m venv tts && tts/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
tts/bin/pip install --only-binary=:all: spacy soundfile numpy
tts/bin/pip install --ignore-requires-python kokoro==0.9.4 "misaki[en]>=0.9.4"
tts/bin/pip install --no-deps en_core_web_sm-3.8.0-py3-none-any.whl   # spaCy's small English model
tts/bin/python render/voiceover.py --voices am_michael:1.1,af_heart:1.0
```

The script rewrites the `vo-data` block in `showreel.html` with each clip and its word timestamps. `am_michael` reads slower, so it runs at 1.1× to sit on the same grid as `af_heart`. If you change the words, check `PHRASES` in `showreel.html` too: it says where each phrase is cut and which word lands on which beat.

The surname is read the way US English reads it, "Ang" as in "bang". For "Ahng", change the last line of `SCRIPT` to `DM me. Ryan [Ang](/ˈɑŋ/).` and regenerate; speech recognition then hears "Ong", which is why it isn't the default.

## Changing the call to action

The end card reads **Free consultation.** over a lime button that drains into a DM box, both reading "DM me – Ryan Ang". The strings live in the `EC` constant near the top of the script; the button sizes itself to the text. `ECS` scales the whole end card (1.4 keeps the CTA readable on a phone), and the dive at the loop seam compensates. If you swap in a longer string, check frame 0 (`?t=0`) and the end card (`?t=21.9`).
