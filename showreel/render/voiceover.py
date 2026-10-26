"""Generates the voiceover with Kokoro-82M (Apache 2.0) and embeds it in showreel.html.

Usage: <venv>/bin/python render/voiceover.py [--voices am_michael:1.1,af_heart:1.0]

Needs: torch (CPU), kokoro==0.9.4, misaki[en], soundfile, numpy, spaCy's en_core_web_sm.
Each line of SCRIPT becomes one utterance. Its audio is stored as base64 16-bit WAV alongside
per-word timestamps, so the page can place the clip on the beat grid and show every word as it
is spoken. Words inside [brackets](/phonemes/) are pronounced with the given IPA, e.g. [Ang](/ˈɑŋ/)
for "Ahng" (US-trained listeners then hear "Ong", so the default reading is kept).
"""
import argparse
import base64
import io
import json
import re
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from kokoro import KPipeline  # noqa: E402

SR = 24000
SCRIPT = [
    "You're doing recruitment, but you don't know where your leads are coming from.",
    "You don't know how automated it can be.",
    "You're spending hours.",
    "You're wasting time.",
    "You're wasting man-hours that could improve your productivity.",
    "Let's dive deep into your recruitment process, and give you a free consultation.",
    "DM me. Ryan Ang.",
]
HTML = Path(__file__).resolve().parent.parent / 'showreel.html'


def synth(pipe, text, voice, speed):
    audio, words = [], []
    offset = 0.0
    for r in pipe(text, voice=voice, speed=speed):
        a = r.audio.numpy()
        for tk in r.tokens:
            if tk.start_ts is None:
                continue
            if re.fullmatch(r"[^\w']+", tk.text):            # punctuation sticks to the previous word
                if words:
                    words[-1]['w'] += tk.text
                continue
            words.append({'w': tk.text, 't0': round(offset + tk.start_ts, 4), 't1': round(offset + tk.end_ts, 4)})
        audio.append(a)
        offset += len(a) / SR
    a = np.concatenate(audio).astype(np.float32)
    # trim silence after the last word, keep a short natural tail
    end = min(len(a), int((words[-1]['t1'] + 0.12) * SR))
    a = a[:end]
    buf = io.BytesIO()
    sf.write(buf, a, SR, subtype='PCM_16', format='WAV')
    return {'text': re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text), 'dur': round(len(a) / SR, 4),
            'words': words, 'wav': base64.b64encode(buf.getvalue()).decode()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voices', default='am_michael:1.1,af_heart:1.0',
                    help='comma-separated voice[:speed]; am_michael reads slower, so it runs at 1.1')
    args = ap.parse_args()
    pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    data = {}
    for spec in args.voices.split(','):
        voice, _, speed = spec.partition(':')
        data[voice] = [synth(pipe, line, voice, float(speed or 1)) for line in SCRIPT]
        print(voice, [u['dur'] for u in data[voice]], 'total', round(sum(u['dur'] for u in data[voice]), 2))
    html = HTML.read_text()
    block = '<script id="vo-data" type="application/json">\n' + json.dumps(data) + '\n</script>'
    if '<script id="vo-data"' in html:
        html = re.sub(r'<script id="vo-data" type="application/json">[\s\S]*?</script>', lambda _: block, html)
    else:
        html = html.replace('<script id="geist-ttf"', block + '\n<script id="geist-ttf"', 1)
    HTML.write_text(html)
    print('embedded', ', '.join(data), 'into', HTML.name)


if __name__ == '__main__':
    main()
