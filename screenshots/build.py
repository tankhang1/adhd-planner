#!/usr/bin/env python3
"""Render Dayflow App Store screenshots (1206x2622) from raw simulator captures.

Each shot = flat violet background + heavy white headline + iPhone frame that
bleeds off the bottom + optional breakout panel (cropped from the real app
screen, enlarged, with a soft shadow) + 1-2 sticker accents.
Rendered with headless Chrome so CSS shadows / rounded corners look crisp.

Usage: python3 screenshots/build.py [iphone|ipad]
"""
import re, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
RAW = ROOT / 'raw'
OUT = ROOT / 'final'
TMP = ROOT / '.build'
W, H = 1206, 2622
BG = '#5B3FE8'
INTER = ROOT.parent / 'node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/@expo-google-fonts/inter'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Phone geometry (smaller + tilted, so the background can breathe)
SCREEN_W = 860
K = SCREEN_W / 1206           # raw px -> canvas px
BEZEL = 20
PHONE_TOP = 760
SCREEN_TOP = PHONE_TOP + BEZEL
PHONE_LEFT = (W - SCREEN_W - 2 * BEZEL) // 2
BREAKOUT_W = 1060
TILTS = [-4, 4, -4, 4, -4, 4, -4, 4]

# Cloud mascot body (same art as the app)
CLOUD_BODY = "M52 136 C28 136 18 118 24 102 C14 88 24 64 46 66 C48 42 72 30 92 40 C104 22 136 22 146 46 C170 44 184 66 174 86 C190 98 182 136 152 136 Z"

# --- Mascot: the Dayflow cloud with a mood and a little prop -------------------
FACES = {
    'hello': '<circle cx="78" cy="92" r="7" fill="#2B2650"/><circle cx="122" cy="92" r="7" fill="#2B2650"/><circle cx="80.5" cy="89.5" r="2.5" fill="#fff"/><circle cx="124.5" cy="89.5" r="2.5" fill="#fff"/><path d="M88 110 Q100 122 112 110" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/>',
    'happy': '<path d="M70 95 Q78 85 86 95" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M114 95 Q122 85 130 95" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M86 108 Q100 124 114 108 Z" fill="#2B2650"/><path d="M93 114 Q100 120 107 114" fill="#FF8FA3"/>',
    'okay': '<circle cx="78" cy="92" r="6" fill="#2B2650"/><circle cx="122" cy="92" r="6" fill="#2B2650"/><circle cx="80" cy="90" r="2" fill="#fff"/><circle cx="124" cy="90" r="2" fill="#fff"/><path d="M90 112 Q100 117 110 112" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/>',
    'sleepy': '<path d="M70 92 Q78 98 86 92" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M114 92 Q122 98 130 92" stroke="#2B2650" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="100" cy="112" rx="6" ry="4" fill="#2B2650"/>',
}
OUTLINE = 'stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"'
PROPS = {
    # each prop is drawn in the cloud's coordinate space (cloud spans ~20..185 x, 25..140 y)
    'calendar': f'<g transform="translate(150 70) rotate(12)"><rect x="0" y="0" width="62" height="58" rx="10" fill="#fff" {OUTLINE}/><rect x="0" y="0" width="62" height="18" rx="9" fill="#6C5CE7"/><circle cx="16" cy="34" r="5" fill="#6C5CE7"/><circle cx="31" cy="34" r="5" fill="#FFD84D"/><circle cx="46" cy="34" r="5" fill="#FF8FA3"/><circle cx="16" cy="47" r="5" fill="#2ECC8F"/></g>'
                '<path d="M28 96 Q8 78 18 60" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M28 96 Q8 78 18 60" stroke="#EDE9FF" stroke-width="9" stroke-linecap="round" fill="none"/>',
    'bolt': f'<path d="M168 18 L140 70 L162 70 L146 116 L196 56 L172 56 L190 18 Z" fill="#FFD84D" {OUTLINE}/>'
            '<text x="172" y="150" font-family="InterBlack" font-size="30" fill="#fff" text-anchor="middle" transform="rotate(-10 172 150)">go!</text>',
    'clock': f'<g transform="translate(150 78)"><circle cx="0" cy="0" r="34" fill="#fff" {OUTLINE}/><circle cx="0" cy="0" r="27" fill="#fff" stroke="#2ECC8F" stroke-width="6"/><path d="M0 -15 L0 0 L11 7" stroke="#2B2650" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M-12 -38 L12 -38" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M-10 -38 L10 -38" stroke="#2ECC8F" stroke-width="6" stroke-linecap="round"/></g>',
    'zzz': '<text x="150" y="40" font-family="InterBlack" font-size="34" fill="#fff" transform="rotate(-8 150 40)">z</text><text x="172" y="14" font-family="InterBlack" font-size="26" fill="#fff" opacity=".85">z</text><text x="190" y="-6" font-family="InterBlack" font-size="20" fill="#fff" opacity=".7">z</text>'
           f'<g transform="translate(-36 88) rotate(-14)"><rect x="0" y="0" width="58" height="30" rx="7" fill="#fff" {OUTLINE}/><rect x="58" y="9" width="7" height="12" rx="2" fill="#fff"/><rect x="5" y="5" width="13" height="20" rx="4" fill="#FF6B6B"/></g>',
    'keys': f'<g transform="translate(160 66) rotate(25)"><circle cx="0" cy="0" r="17" fill="#FFD84D" {OUTLINE}/><circle cx="0" cy="0" r="6" fill="#E8692F"/><rect x="12" y="-5" width="44" height="10" rx="4" fill="#FFD84D" {OUTLINE}/><rect x="44" y="4" width="8" height="12" rx="2" fill="#FFD84D"/></g>',
    'bulb': f'<g transform="translate(152 24) rotate(10)"><circle cx="0" cy="0" r="27" fill="#FFE27A" {OUTLINE}/><rect x="-12" y="24" width="24" height="16" rx="5" fill="#B7B2CC" {OUTLINE}/><path d="M-8 -2 L-2 8 L2 -6 L8 4" stroke="#E8A400" stroke-width="4" fill="none" stroke-linecap="round"/></g>'
            '<path d="M196 0 L208 -10 M200 22 L216 22 M190 -24 L198 -38" stroke="#FFE27A" stroke-width="6" stroke-linecap="round"/>',
    'checklist': f'<g transform="translate(150 54) rotate(10)"><rect x="0" y="0" width="60" height="74" rx="10" fill="#fff" {OUTLINE}/>'
                 '<path d="M10 18 L15 23 L24 13" stroke="#2ECC8F" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="30" y="15" width="22" height="6" rx="3" fill="#D6D2E8"/>'
                 '<path d="M10 39 L15 44 L24 34" stroke="#2ECC8F" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="30" y="36" width="22" height="6" rx="3" fill="#D6D2E8"/>'
                 '<rect x="10" y="54" width="13" height="13" rx="3" fill="none" stroke="#C9A100" stroke-width="4"/><rect x="30" y="57" width="22" height="6" rx="3" fill="#D6D2E8"/></g>',
    'party': f'<path d="M84 36 L104 -26 L124 32 Z" fill="#FF8FA3" {OUTLINE}/><path d="M92 14 L116 12 M98 -6 L112 -8" stroke="#FFD84D" stroke-width="7" stroke-linecap="round"/><circle cx="104" cy="-30" r="9" fill="#FFD84D" {OUTLINE}/>'
             '<rect x="-20" y="10" width="12" height="20" rx="3" fill="#FFD84D" transform="rotate(-25 -14 20)"/><rect x="200" y="30" width="12" height="20" rx="3" fill="#6C5CE7" transform="rotate(30 206 40)"/>'
             '<circle cx="-6" cy="60" r="7" fill="#FF8FA3"/><circle cx="214" cy="-4" r="7" fill="#2ECC8F"/><rect x="186" y="96" width="12" height="20" rx="3" fill="#FF8FA3" transform="rotate(-20 192 106)"/>',
}

def mascot(mood, fill, prop, size, rot, x, y, flip=False):
    """Cloud character with a prop; white sticker outline + soft shadow."""
    body = CLOUD_BODY
    sx = '-1' if flip else '1'
    return f'''<svg class="sticker" style="left:{x}px;top:{y}px;width:{size}px;transform:rotate({rot}deg) scaleX({sx})" viewBox="-50 -60 290 220" overflow="visible">
      <path d="{body}" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>
      <path d="{body}" fill="{fill}"/>
      <path d="M40 128 C62 140 140 140 164 126 C160 134 154 136 152 136 L52 136 C46 136 42 133 40 128 Z" fill="#000" opacity=".06"/>
      <ellipse cx="64" cy="108" rx="9" ry="6" fill="#FFB8C9"/><ellipse cx="136" cy="108" rx="9" ry="6" fill="#FFB8C9"/>
      {FACES[mood]}
      {PROPS[prop]}
    </svg>'''


# shot: (slug, verb, desc, raw file, breakout (x, y, w, h, radius) in raw px or None, stickers html)
# Mascot sits in the gap between headline and phone, peeking from behind the phone's top corner.
SHOTS = [
    ('01-see-your-whole-day', 'SEE', 'YOUR WHOLE DAY', '01-today.png', (58, 875, 1090, 345, 64),
     mascot('hello', '#EDE9FF', 'calendar', 500, -6, 700, 430)),
    ('02-start-with-2-minutes', 'START', 'WITH JUST 2 MINUTES', '02-one-thing.png', None,
     mascot('happy', '#FFF1B8', 'bolt', 500, 6, 0, 430)),
    ('03-feel-time-passing', 'FEEL', 'TIME PASSING', '03-focus.png', None,
     mascot('okay', '#D9F5E6', 'clock', 500, -5, 700, 430)),
    ('04-plan-for-your-energy', 'PLAN', 'FOR YOUR ENERGY', '04-energy.png', None,
     mascot('sleepy', '#E4E9F5', 'zzz', 500, 5, 0, 440)),
    ('05-never-run-late', 'NEVER', 'RUN LATE', '07-nudges.png', (52, 1050, 1100, 500, 56),
     mascot('hello', '#FFE4D3', 'keys', 500, -6, 700, 430)),
    ('06-clear-your-head', 'CLEAR', 'YOUR HEAD', '06-inbox.png', None,
     mascot('happy', '#EDE9FF', 'bulb', 500, 6, 0, 460)),
    ('07-build-routines', 'BUILD', 'ROUTINES THAT STICK', '05-routine.png', None,
     mascot('happy', '#FFF1B8', 'checklist', 500, -5, 700, 440)),
    ('08-celebrate-every-win', 'CELEBRATE', 'EVERY WIN', '08-weekly.png', (112, 1365, 980, 300, 40),
     mascot('happy', '#D9F5E6', 'party', 500, 5, 0, 460)),
]

def slide(i, slug, verb, desc, raw, breakout, stickers, target=None):
    """Markup for one slide. Content is laid out in a 1206×2622 box, then placed
    (and scaled) inside the target canvas — so one design serves iPhone and iPad."""
    x0 = 0
    tw, th, scale, push = target or (W, H, 1.0, 0)
    tilt = TILTS[i % len(TILTS)]
    raw_uri = (RAW / raw).as_uri()
    bo = ''
    if breakout:
        bx, by, bw, bh, br = breakout
        s = BREAKOUT_W / bw
        h = bh * s
        cy = SCREEN_TOP + (by + bh / 2) * K
        bo = f'''<div class="breakout" style="left:{x0 + (W - BREAKOUT_W) / 2}px;top:{cy - h / 2}px;width:{BREAKOUT_W}px;height:{h}px;border-radius:{br * s}px;transform:rotate({tilt}deg)">
          <img src="{raw_uri}" style="width:{1206 * s}px;left:{-bx * s}px;top:{-by * s}px"/></div>'''
    badge = ''
    if i == 0:
        badge = f'<div class="badge" style="left:{x0}px">✦ MADE FOR ADHD BRAINS ✦</div>'
    # On wider canvases, move the mascot outward into the extra side space.
    def _push(m):
        x = float(m.group(1))
        return f'left:{x + (push if x > W / 2 - 200 else -push)}px'
    sticks = re.sub(r'left:(-?[\d.]+)px', _push, stickers) if push else stickers
    box_left = i * tw + (tw - W * scale) / 2
    return f'''<div class="slide" style="left:{box_left}px;top:{(th - H * scale) / 2 if scale < 1 else 0}px;transform:scale({scale})">
<div class="head" style="left:{x0}px"><div class="verb" id="verb{i}">{verb}</div><div class="desc"><span>{desc}</span></div></div>
{badge}
<div class="phone" style="left:{x0 + PHONE_LEFT}px;transform:rotate({tilt}deg)"><div class="screen"><img src="{raw_uri}"/></div></div>
{bo}
{sticks}
</div>'''

def page(shots, target=None):
    tw, th = (target or (W, H))[:2]
    total = tw * len(shots)
    fx, fy = tw / W, th / H        # stretch the background art to the canvas
    slides = ''.join(slide(i, *sh, target=target) for i, sh in enumerate(shots))
    # One continuous background across the whole set (ribbons flow from slide to slide).
    bgsvg = f'''<svg class="bg" width="{total}" height="{th}" viewBox="0 0 {total} {th}">
      <path transform="scale({fx} {fy})" d="M -200 1500 C 700 1150, 1500 1900, 2600 1550 S 4600 1100, 5600 1600 S 7600 2000, {W * len(shots) + 200} 1450 L {W * len(shots) + 200} {H} L -200 {H} Z"
            fill="#7259F2"/>
    </svg>'''
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: InterBlack; src: url("{(INTER / '900Black/Inter_900Black.ttf').as_uri()}"); }}
@font-face {{ font-family: InterX; src: url("{(INTER / '800ExtraBold/Inter_800ExtraBold.ttf').as_uri()}"); }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:{total}px; height:{th}px; overflow:hidden; background:{BG}; position:relative; }}
.bg {{ position:absolute; left:0; top:0; }}
.slide {{ position:absolute; width:{W}px; height:{H}px; transform-origin: 0 0; }}
.head {{ position:absolute; top:150px; width:{W}px; text-align:center; color:#fff; }}
.verb {{ font-family:InterBlack; font-size:230px; line-height:0.9; letter-spacing:-8px; display:inline-block; }}
.desc {{ font-family:InterBlack; font-size:80px; line-height:1.02; letter-spacing:-2px; margin-top:18px; padding:0 150px; color:#FFD84D; }}
.desc span {{ }}
.badge {{ position:absolute; top:70px; width:{W}px; text-align:center; font-family:InterX; font-size:34px; letter-spacing:4px; color:#FFD84D; }}
.phone {{ position:absolute; top:{PHONE_TOP}px; width:{SCREEN_W + 2 * BEZEL}px; height:{2622 * K + 2 * BEZEL}px; transform-origin: 50% 40%;
  background:#0E0B1F; border-radius:128px; padding:{BEZEL}px; box-shadow: 0 40px 80px rgba(20,8,90,.4), inset 0 0 0 3px #3A3550; }}
.phone .screen {{ width:100%; height:100%; border-radius:{128 - BEZEL}px; overflow:hidden; background:#fff; }}
.phone .screen img {{ width:100%; display:block; }}
.breakout {{ position:absolute; overflow:hidden; box-shadow: 0 30px 60px rgba(18,6,80,.35); }}
.breakout img {{ position:absolute; max-width:none; }}
.sticker {{ position:absolute; filter: drop-shadow(0 12px 18px rgba(18,6,80,.4)); }}
.tag {{ position:absolute; font-family:InterX; font-size:48px; letter-spacing:-0.5px; padding:18px 34px; border-radius:999px;
  border:7px solid #fff; box-shadow: 0 14px 28px rgba(18,6,80,.4); white-space:nowrap; }}
</style></head><body>
{bgsvg}
{slides}
<script>
  document.querySelectorAll('.verb').forEach((v) => {{
    let s = 250; while (v.scrollWidth > 1040 && s > 130) {{ s -= 4; v.style.fontSize = s + 'px'; }}
  }});
</script>
</body></html>'''

TARGETS = {
    # name: (canvas w, canvas h, content scale, mascot push, out dir)
    'iphone': (W, H, 1.0, 0, 'final'),
    'ipad': (2064, 2752, 1.22, 230, 'final-ipad'),   # iPad 13"
}

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'iphone'
    tw, th, scale, push, out_dir = TARGETS[name]
    out_root = ROOT / out_dir
    out_root.mkdir(exist_ok=True); TMP.mkdir(exist_ok=True)
    pano = TMP / f'panorama-{name}.png'
    html_file = TMP / f'panorama-{name}.html'
    html_file.write_text(page(SHOTS, (tw, th, scale, push)))
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={tw * len(SHOTS)},{th}', '--allow-file-access-from-files', '--virtual-time-budget=3000',
                    f'--screenshot={pano}', html_file.as_uri()], check=True, capture_output=True)
    for i, sh in enumerate(SHOTS):
        out = out_root / f'{sh[0]}.png'
        subprocess.run(['magick', str(pano), '-crop', f'{tw}x{th}+{i * tw}+0', '+repage', str(out)], check=True)
        print('ok', out.relative_to(ROOT.parent))
    subprocess.run(['magick', str(pano), '-resize', '20%', str(ROOT / f'preview-strip-{name}.png')], check=True)

if __name__ == '__main__':
    main()
