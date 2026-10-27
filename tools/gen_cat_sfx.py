"""Generate 10 category click SFX for stardust-chronicles (ui.select by category)."""
from __future__ import annotations
import math, wave, struct
from pathlib import Path

SR = 48000
OUT = Path("assets/sfx")

# name -> (dur_s, synth_kind, params)
# keep paper/museum: short, dry, no game-gun tails
SPECS = {
    "alkali":     (0.14, "tick",   dict(f0=2100, f1=900, noise=0.35, bright=1.0)),
    "alkaline":   (0.15, "tick",   dict(f0=1600, f1=700, noise=0.28, bright=0.85)),
    "transition": (0.22, "metal",  dict(f0=620,  harm=(1.0, 1.52, 2.01), decay=18)),
    "post":       (0.20, "metal",  dict(f0=420,  harm=(1.0, 1.41, 1.9), decay=22)),
    "metalloid":  (0.16, "glass",  dict(f0=1400, f1=2800, decay=28)),
    "nonmetal":   (0.13, "wood",   dict(f0=380, noise=0.55, decay=35)),
    "halogen":    (0.12, "tick",   dict(f0=3200, f1=1400, noise=0.45, bright=1.2)),
    "noble":      (0.16, "air",    dict(f0=900, noise=0.7, decay=20)),
    "lanthanide": (0.18, "shimmer",dict(f0=780, f1=1560, decay=24)),
    "actinide":   (0.17, "hollow", dict(f0=220, noise=0.5, decay=16)),
}

def clamp(x, lo=-1.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x

def env_exp(i, n, decay):
    return math.exp(-decay * i / n)

def synth(kind, dur, p):
    n = max(64, int(SR * dur))
    out = []
    for i in range(n):
        t = i / SR
        e = env_exp(i, n, p.get("decay", 25))
        x = 0.0
        if kind == "tick":
            # band-limited noise + quick sine sweep
            noise = (math.sin(i * 12.9898) * 43758.5453) % 1.0
            noise = noise * 2 - 1
            f = p["f0"] + (p["f1"] - p["f0"]) * (i / n)
            x = 0.55 * math.sin(2 * math.pi * f * t) * e
            x += p["noise"] * noise * e * e
            x *= p.get("bright", 1.0)
        elif kind == "metal":
            for k, h in enumerate(p["harm"]):
                a = 0.45 / (k + 1)
                x += a * math.sin(2 * math.pi * p["f0"] * h * t) * env_exp(i, n, p["decay"] * (1 + 0.15 * k))
            # tiny noise transient
            noise = ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1
            x += 0.12 * noise * env_exp(i, n, 60)
        elif kind == "glass":
            x = 0.5 * math.sin(2 * math.pi * p["f0"] * t) * e
            x += 0.28 * math.sin(2 * math.pi * p["f1"] * t) * env_exp(i, n, p["decay"] * 1.3)
            noise = ((i * 214013 + 2531011) & 0x7fffffff) / 0x7fffffff * 2 - 1
            x += 0.08 * noise * env_exp(i, n, 50)
        elif kind == "wood":
            noise = ((i * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff * 2 - 1
            x = 0.55 * math.sin(2 * math.pi * p["f0"] * t) * e
            x += p["noise"] * noise * env_exp(i, n, 45)
        elif kind == "air":
            noise = ((i * 214013 + 2531011) & 0x7fffffff) / 0x7fffffff * 2 - 1
            # soft highpassed-ish noise + faint tone
            x = p["noise"] * noise * e
            x += 0.18 * math.sin(2 * math.pi * p["f0"] * t) * e
        elif kind == "shimmer":
            x = 0.4 * math.sin(2 * math.pi * p["f0"] * t) * e
            x += 0.25 * math.sin(2 * math.pi * p["f1"] * t + 0.7) * env_exp(i, n, p["decay"] * 1.1)
            x += 0.12 * math.sin(2 * math.pi * (p["f0"] * 2.7) * t) * env_exp(i, n, p["decay"] * 1.5)
        elif kind == "hollow":
            noise = ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1
            x = 0.5 * math.sin(2 * math.pi * p["f0"] * t) * e
            x += 0.2 * math.sin(2 * math.pi * p["f0"] * 2.1 * t) * env_exp(i, n, p["decay"] * 1.4)
            x += p["noise"] * 0.35 * noise * env_exp(i, n, 30)
        out.append(clamp(x * 0.72))
    # peak normalize ~0.85
    peak = max(abs(v) for v in out) or 1.0
    scale = 0.85 / peak
    return [v * scale for v in out]

def write_wav(path: Path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(clamp(s) * 32767)) for s in samples)
        w.writeframes(frames)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for cat, (dur, kind, params) in SPECS.items():
        samples = synth(kind, dur, params)
        path = OUT / f"cat-{cat}.wav"
        write_wav(path, samples)
        print(f"wrote {path} ({len(samples)/SR:.3f}s)")

if __name__ == "__main__":
    main()
