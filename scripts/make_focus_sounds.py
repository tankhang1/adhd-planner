#!/usr/bin/env python3
"""Generate Dayflow's focus-room ambience as seamless loops (no licensed audio needed).

Output: artifacts/mobile/assets/sounds/{brown,pink,fan}.m4a  (60 s, mono, AAC)
Usage:  python3 scripts/make_focus_sounds.py
"""
import pathlib, subprocess, wave
import numpy as np

SR = 44100
SECONDS = 60
FADE = 3  # seconds of crossfade so the loop has no click
OUT = pathlib.Path(__file__).resolve().parents[1] / 'artifacts/mobile/assets/sounds'
rng = np.random.default_rng(7)

def normalize(x, peak=0.32):
    x = x - x.mean()
    return x / np.max(np.abs(x)) * peak

def brown(n):
    x = np.cumsum(rng.standard_normal(n))
    # Leaky integrator keeps it from drifting.
    b = np.empty(n); acc = 0.0
    w = rng.standard_normal(n)
    for i in range(n):
        acc = 0.998 * acc + w[i] * 0.02
        b[i] = acc
    return b

def pink(n):
    # Voss-McCartney approximation via 1/f filtering in the frequency domain.
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR); f[0] = f[1]
    return np.fft.irfft(spec / np.sqrt(f), n)

def fan(n):
    # Low-passed noise with a faint motor hum and slow wobble.
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (f / 900) ** 2)
    x = np.fft.irfft(spec, n)
    t = np.arange(n) / SR
    x = normalize(x, 1.0) + 0.04 * np.sin(2 * np.pi * 110 * t)
    return x * (1 + 0.06 * np.sin(2 * np.pi * 0.25 * t))

def loopable(x):
    k = FADE * SR
    head, body, tail = x[:k], x[k:-k], x[-k:]
    ramp = np.linspace(0, 1, k)
    joined = tail * (1 - ramp) + head * ramp
    return np.concatenate([body, joined])

def write(name, x):
    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f'{name}.wav'
    pcm = (normalize(loopable(x)) * 32767).astype('<i2')
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    m4a = OUT / f'{name}.m4a'
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', str(wav), str(m4a)], check=True)
    wav.unlink()
    print('ok', m4a.relative_to(OUT.parents[2]), f'{m4a.stat().st_size // 1024} KB')

n = (SECONDS + FADE) * SR
write('brown', brown(n))
write('pink', pink(n))
write('fan', fan(n))
