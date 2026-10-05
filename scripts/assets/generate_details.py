"""Add deterministic, authored stone wear to the original arena vector source."""
from pathlib import Path
import random

path = Path('public/assets/arena.svg')
source = path.read_text(encoding='utf-8')
start, end = '<!-- DETAIL_START -->', '<!-- DETAIL_END -->'
if start in source:
    source = source[:source.index(start)] + source[source.index(end) + len(end):]
rng = random.Random(1039)
parts = [start, '<g fill="none" stroke-linecap="round">']
for row in range(6):
    for col in range(6):
        left, top = 134 + col * 76, 238 + row * 73
        for _ in range(2):
            x, y = left + rng.uniform(13, 62), top + rng.uniform(11, 61)
            dx, dy = rng.uniform(5, 13), rng.uniform(-4, 5)
            parts.append(f'<path d="M{x:.1f} {y:.1f} q{dx/2:.1f} {dy-3:.1f} {dx:.1f} {dy:.1f}" stroke="#725b43" stroke-width="1.5" opacity=".20"/>')
        for _ in range(6):
            x, y = left + rng.uniform(9, 69), top + rng.uniform(8, 65)
            length = rng.uniform(1.0, 2.8)
            parts.append(f'<path d="M{x:.1f} {y:.1f} l{length:.1f} -.5" stroke="#68513e" stroke-width="1" opacity=".17"/>')
        if (row + col) % 4 == 0:
            x, y = left + 10, top + 8
            parts.append(f'<path d="M{x} {y+10} q8 -10 18 -8 M{x+41} {y+49} q10 3 16 -5" stroke="#fff1cc" stroke-width="2" opacity=".17"/>')
parts.append('</g>')
parts.append('<g fill="none" stroke="#e7d4a8" stroke-width="2" opacity=".62">')
parts.append('<path d="M82 238 Q93 229 106 235 M614 237 Q630 227 640 238 M80 680 Q97 691 113 682 M608 683 Q628 694 642 676"/>')
parts.append('<path d="M80 300 l15 -8 8 7 -8 9z M615 302 l14 -8 8 8 -8 9z M82 618 l14 -8 9 9 -9 8z M613 621 l14 -8 9 9 -9 8z"/>')
parts.append('</g>')
parts.append('<g stroke="#406b54" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"><path d="M42 700 q10 -23 19 -26 q-9 25 -6 31 M62 713 q12 -26 25 -32 q-9 22 -5 30 M641 707 q-10 -26 -22 -31 q8 27 4 36 M672 697 q-12 -26 -27 -30 q8 26 7 39"/></g>')
parts.append(end)
source = source.replace('</svg>', '\n'.join(parts) + '\n</svg>')
path.write_text(source, encoding='utf-8')
