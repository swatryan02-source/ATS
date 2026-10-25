"""Checks a rendered MP4 against the brief: motion on every beat, no hold longer than 0.5 s, loop seam.

Usage: python3 render/analyze.py out/showreel.mp4 [report.png]

Prints the longest run of near-identical frames, the motion around each beat, and how closely the
last frame matches the first. With a second argument it also draws motion energy against the beat grid.
"""
import subprocess
import sys

import numpy as np

FPS, BPM, W, H = 60, 120, 192, 108


def frames(path):
    cmd = ['ffmpeg', '-loglevel', 'error', '-i', path, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)


def main():
    path = sys.argv[1]
    f = frames(path)
    n = len(f)
    diff = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2, 3))          # motion between frame i and i+1
    still = diff < 0.15
    run, best, best_end = 0, 0, 0
    for i, s in enumerate(still):
        run = run + 1 if s else 0
        if run > best:
            best, best_end = run, i
    print(f'{n} frames ({n / FPS:.2f} s)')
    print(f'longest hold: {best} frames = {best / FPS:.3f} s, ending at {best_end / FPS:.2f} s  (limit 0.5 s)')
    beat = FPS * 60 / BPM
    quiet = []
    for b in range(int(n / beat)):
        i = int(round(b * beat))
        win = diff[max(0, i - 2): i + 12]
        if win.max() < 0.6:
            quiet.append(b + 1)
    print('beats with little motion in the 200 ms after them:', quiet or 'none')
    seam = np.abs(f[-1] - f[0]).mean()
    print(f'last frame vs first frame: mean abs diff {seam:.3f} (0-255 scale)')
    if len(sys.argv) > 2:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (1800, 300), (11, 11, 12))
        d = ImageDraw.Draw(img)
        x = lambda i: 20 + i * 1760 / n
        top = max(diff.max(), 1)
        for b in range(31):
            d.line([(x(b * beat), 0), (x(b * beat), 300)], fill=(80, 80, 200) if b % 4 else (255, 90, 31), width=1)
        pts = [(x(i), 290 - 270 * min(1, v / top) ** 0.5) for i, v in enumerate(diff)]
        d.line(pts, fill=(212, 255, 58), width=2)
        img.save(sys.argv[2])
        print('report:', sys.argv[2])


if __name__ == '__main__':
    main()
