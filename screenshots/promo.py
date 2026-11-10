#!/usr/bin/env python3
"""Render Dayflow promo graphics in the same style as the screenshot set.

Presets:
  header   3840×1646  wide header graphic
  search   1920×1280  search-result graphic
  feature  1024×500   Google Play feature graphic (centre-safe, no "#1/best/free" claims)

Usage: python3 screenshots/promo.py [header|search|feature ...]   (default: all)
"""
import subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import build as b  # fonts, colours, Chrome path, mascot art, raw captures

OUT_DIR = ROOT / 'header'

# Each preset is described in its own pixel space; `u` scales shared CSS (fonts, radii, shadows).
PRESETS = {
    'header': dict(
        size=(3840, 1646), u=1.0, phone_w=560,
        copy=(220, 330, 1700), word=370, tag=118, badge=54,
        badge_text='✦ MADE FOR ADHD BRAINS ✦',
        tag_text='A visual day planner<br/>that gets your brain.',
        pills=['See your day', 'Start in 2 min', 'No streaks'],
        # (raw capture, centre x, top, rotation, z-index)
        phones=[('03-focus.png', 2440, 300, -9, 1), ('04-energy.png', 3380, 300, 9, 1), ('01-today.png', 2910, 200, 0, 2)],
        mascots=[('hello', '#EDE9FF', 'calendar', 520, -8, 1860, 1080), ('happy', '#D9F5E6', 'party', 480, 8, 3360, 1150)],
        wave='M -100 1180 C 700 900, 1400 1450, 2300 1150 S 3400 820, {W} 1050',
        out='header-3840x1646.png'),
    'search': dict(
        size=(1920, 1280), u=0.62, phone_w=430,
        copy=(110, 300, 900), word=230, tag=76, badge=34,
        badge_text='✦ MADE FOR ADHD BRAINS ✦',
        tag_text='See your day.<br/>Start in 2 minutes.',
        pills=[],
        phones=[('03-focus.png', 1610, 210, 9, 1), ('01-today.png', 1270, 150, -5, 2)],
        mascots=[('hello', '#EDE9FF', 'calendar', 360, -8, 830, 880)],
        wave='M -100 920 C 400 720, 800 1100, 1250 880 S 1750 700, {W} 820',
        out='search-1920x1280.png'),
    'feature': dict(
        size=(1024, 500), u=0.32, phone_w=200,
        copy=(64, 118, 520), word=118, tag=38, badge=17,
        badge_text='✦ SEE YOUR WHOLE DAY ✦',
        tag_text='A visual day planner<br/>for ADHD brains.',
        pills=[],
        phones=[('03-focus.png', 820, 95, 9, 1), ('01-today.png', 660, 60, -6, 2)],
        mascots=[('hello', '#EDE9FF', 'calendar', 190, -8, 470, 330)],
        wave='M -50 360 C 200 270, 420 440, 660 350 S 930 270, {W} 320',
        out='play-feature-1024x500.png'),
}

def html(p):
    W, H = p['size']
    u = p['u']
    bezel = round(16 * u) or 1
    radius = round(92 * u)
    k = p['phone_w'] / 1206

    def phone(raw, cx, top, rot, z):
        w = p['phone_w'] + 2 * bezel
        h = 2622 * k + 2 * bezel
        return (f'<div class="phone" style="left:{cx - w / 2}px;top:{top}px;width:{w}px;height:{h}px;'
                f'transform:rotate({rot}deg);z-index:{z}"><div class="screen"><img src="{(b.RAW / raw).as_uri()}"/></div></div>')

    phones = ''.join(phone(*ph) for ph in p['phones'])
    mascots = ''.join(b.mascot(*m) for m in p['mascots'])
    pills = ''.join(f'<div class="pill">{t}</div>' for t in p['pills'])
    cx, cy, cw = p['copy']
    wave = p['wave'].format(W=W + 100) + f' L {W + 100} {H} L -100 {H} Z'
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: InterBlack; src: url("{(b.INTER / '900Black/Inter_900Black.ttf').as_uri()}"); }}
@font-face {{ font-family: InterX; src: url("{(b.INTER / '800ExtraBold/Inter_800ExtraBold.ttf').as_uri()}"); }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:{W}px; height:{H}px; overflow:hidden; background:{b.BG}; position:relative; }}
.bg {{ position:absolute; inset:0; }}
.copy {{ position:absolute; left:{cx}px; top:{cy}px; width:{cw}px; color:#fff; }}
.badge {{ font-family:InterX; font-size:{p['badge']}px; letter-spacing:{p['badge'] * .13}px; color:#FFD84D; margin-bottom:{p['badge'] * .55}px; }}
.word {{ font-family:InterBlack; font-size:{p['word']}px; line-height:.9; letter-spacing:{-p['word'] * .04}px; }}
.tag {{ font-family:InterBlack; font-size:{p['tag']}px; line-height:1.05; letter-spacing:{-p['tag'] * .026}px; color:#FFD84D; margin-top:{p['tag'] * .36}px; }}
.points {{ display:flex; gap:{22 * u}px; margin-top:{64 * u}px; }}
.pill {{ font-family:InterX; font-size:{52 * u}px; padding:{22 * u}px {44 * u}px; border-radius:999px; background:rgba(255,255,255,.14); color:#fff; }}
.phone {{ position:absolute; background:#0E0B1F; border-radius:{radius}px; padding:{bezel}px;
  box-shadow: 0 {50 * u}px {100 * u}px rgba(20,8,90,.45), inset 0 0 0 {max(1, 3 * u)}px #3A3550; transform-origin: 50% 30%; }}
.phone .screen {{ width:100%; height:100%; border-radius:{radius - bezel}px; overflow:hidden; background:#fff; }}
.phone .screen img {{ width:100%; display:block; }}
.sticker {{ position:absolute; z-index:3; filter: drop-shadow(0 {14 * u}px {22 * u}px rgba(18,6,80,.4)); }}
</style></head><body>
<svg class="bg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><path d="{wave}" fill="#7259F2"/></svg>
<div class="copy">
  <div class="badge">{p['badge_text']}</div>
  <div class="word">dayflow</div>
  <div class="tag">{p['tag_text']}</div>
  {f'<div class="points">{pills}</div>' if pills else ''}
</div>
{phones}
{mascots}
</body></html>'''

def render(name):
    p = PRESETS[name]
    W, H = p['size']
    OUT_DIR.mkdir(exist_ok=True); b.TMP.mkdir(exist_ok=True)
    page = b.TMP / f'promo-{name}.html'
    out = OUT_DIR / p['out']
    page.write_text(html(p))
    subprocess.run([b.CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={W},{H}', '--allow-file-access-from-files', '--virtual-time-budget=3000',
                    f'--screenshot={out}', page.as_uri()], check=True, capture_output=True)
    print('ok', out.relative_to(ROOT.parent))

if __name__ == '__main__':
    for n in (sys.argv[1:] or PRESETS):
        render(n)
