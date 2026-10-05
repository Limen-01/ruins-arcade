"""Render the original adventurer as four idle and six walk SVG frames per direction."""
from pathlib import Path
from math import sin, pi

root = Path('public/assets/hero')
root.mkdir(parents=True, exist_ok=True)

def frame(direction: str, mode: str, index: int) -> str:
    walking = mode == 'walk'
    phase = index / (6 if walking else 4) * 2 * pi
    stride = sin(phase) * (8 if walking else 1)
    bob = abs(sin(phase)) * (4 if walking else 1.2)
    sway = sin(phase - .7) * (6 if walking else 2)
    facing_back = direction == 'up'
    profile = direction in ('left', 'right')
    mirror_open = '<g transform="translate(80 0) scale(-1 1)">' if direction == 'left' else '<g>'
    cape = f'M28 40 Q{14+sway:.1f} 51 {18+sway:.1f} 76 Q31 86 42 76 Q54 85 {64+sway:.1f} 75 Q60 49 52 40Z'
    if profile:
        cape = f'M33 39 Q{10+sway:.1f} 51 {12+sway:.1f} 77 Q28 83 43 75 L53 43Z'
    head = ('<path d="M27 24 Q39 8 53 22 L54 41 Q41 49 27 40Z" fill="#4b3a2e" stroke="#342e29" stroke-width="3"/>'
            '<path d="M30 19 Q42 11 51 24" fill="none" stroke="#806b4d" stroke-width="4"/>') if facing_back else (
            '<path d="M28 25 Q40 14 54 26 L54 42 Q41 51 26 42Z" fill="#a8774e" stroke="#563b2c" stroke-width="3"/>'
            '<path d="M30 31 Q43 36 51 31 L49 41 Q39 45 31 40Z" fill="#d8be97"/>'
            '<path d="M26 27 Q28 8 43 9 Q54 12 57 29 Q46 21 26 30Z" fill="#3c3430" stroke="#292929" stroke-width="3"/>'
            '<path d="M33 16 Q43 8 53 23" fill="none" stroke="#806c51" stroke-width="3"/>')
    if profile:
        head = ('<path d="M29 24 Q38 12 52 22 L56 32 50 43 30 41Z" fill="#a97950" stroke="#563c2e" stroke-width="3"/>'
                '<path d="M31 21 Q38 8 51 17 L57 31 Q43 25 30 31Z" fill="#403630" stroke="#292929" stroke-width="3"/>'
                '<path d="M50 33 l6 2 -5 5" fill="#d8bd93" stroke="#704b31" stroke-width="2"/>')
    bag_x = 56 if not facing_back else 35
    if profile: bag_x = 26
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 98">
<defs><linearGradient id="cape" x2=".8" y2="1"><stop stop-color="#3a8584"/><stop offset=".5" stop-color="#226368"/><stop offset="1" stop-color="#123c48"/></linearGradient><linearGradient id="leather" x2=".5" y2="1"><stop stop-color="#a86e41"/><stop offset="1" stop-color="#563522"/></linearGradient></defs>
<ellipse cx="40" cy="87" rx="23" ry="6" fill="#163d3b" opacity=".28"/>{mirror_open}
<g transform="translate(0 {-bob:.1f})">
<path d="M27 63 Q{20-stride/2:.1f} 72 {22-stride/2:.1f} 81 L31 79 35 64Z" fill="#573923" stroke="#382b20" stroke-width="2"/>
<path d="M47 64 Q{60+stride/2:.1f} 71 {58+stride/2:.1f} 82 L50 79 44 65Z" fill="#573923" stroke="#382b20" stroke-width="2"/>
<path d="{cape}" fill="url(#cape)" stroke="#133c43" stroke-width="3"/>
<path d="M24 58 Q36 71 56 60" fill="none" stroke="#8db0a2" stroke-opacity=".3" stroke-width="2"/>
<path d="M27 27 Q40 17 54 28 L55 45 Q42 53 25 44Z" fill="url(#leather)" stroke="#4a3222" stroke-width="3"/>
<path d="M27 42 Q38 50 53 42 L49 70 Q39 76 30 70Z" fill="#24555c" opacity=".58"/>
<path d="M30 44 L35 53 33 66 M51 43 L45 53 47 66" fill="none" stroke="#d9b980" stroke-width="3"/>
<path d="M25 43 Q{17-stride/4:.1f} 49 20 61 L27 63 31 47Z M54 44 Q{63+stride/4:.1f} 49 61 62 L53 64 49 48Z" fill="#b27d4f" stroke="#59402a" stroke-width="2"/>
{head}
<path d="M{bag_x-2} 45 Q{bag_x+10} 40 {bag_x+12} 49 L{bag_x+11} 63 Q{bag_x+5} 71 {bag_x-3} 63Z" fill="#b98952" stroke="#5d422c" stroke-width="3"/>
<path d="M{bag_x} 51 L{bag_x+11} 51 M{bag_x} 59 L{bag_x+10} 59" stroke="#e5c590" stroke-width="2"/>
</g></g></svg>'''

for direction in ('up', 'down', 'left', 'right'):
    for mode, count in (('idle', 4), ('walk', 6)):
        for index in range(count):
            (root / f'{direction}-{mode}-{index}.svg').write_text(frame(direction, mode, index), encoding='utf-8')
