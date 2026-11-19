#!/usr/bin/env python3
"""Render Dayflow Pro alternate app icons (1024x1024, opaque) from logo.svg.

Usage: python3 screenshots/logo/icons.py
Output: artifacts/mobile/assets/images/icons/icon-<theme>.png
Keep THEMES in sync with artifacts/mobile/constants/themes.ts.
"""
import pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'artifacts/mobile/assets/images/icons'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# name: (gradient top, gradient bottom, wedge colour)
THEMES = {
    'Ocean':    ('#6BB6FF', '#2F7FD8', '#FF8A65'),
    'Forest':   ('#5FD39B', '#1E9E62', '#FF8A65'),
    'Sunset':   ('#FFB27D', '#E8692F', '#6C5CE7'),
    'Berry':    ('#F68AB2', '#E0457B', '#6C5CE7'),
    'Midnight': ('#4A4380', '#1F1B3A', '#FF8A65'),
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / '.tmp'
    tmp.mkdir(exist_ok=True)
    base = (ROOT / 'logo.svg').read_text()
    for name, (top, bottom, wedge) in THEMES.items():
        svg = (base.replace('#8B7CF6', top).replace('stop-color="#6C5CE7"', f'stop-color="{bottom}"')
                   .replace('fill="#FF8A65"', f'fill="{wedge}"'))
        page = tmp / f'{name}.html'
        page.write_text(f'<html><body style="margin:0">{svg}</body></html>')
        out = OUT / f'icon-{name.lower()}.png'
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                        '--window-size=1024,1024', f'--screenshot={out}', page.as_uri()], check=True, capture_output=True)
        print('ok', out.relative_to(ROOT.parents[1]))
    for f in tmp.iterdir(): f.unlink()
    tmp.rmdir()

if __name__ == '__main__':
    main()
