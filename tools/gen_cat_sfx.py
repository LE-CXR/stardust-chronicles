"""Regenerate 10 category clicks with more distinct, less synthetic-identical feel."""
from __future__ import annotations
import math, wave, struct, random
from pathlib import Path

SR = 48000
OUT = Path("assets/sfx")

def clamp(x, lo=-1.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x

def noise(i, seed):
    x = (i * 1103515245 + seed) & 0x7fffffff
    return x / 0x7fffffff * 2 - 1

def write_wav(path, samples):
    peak = max(abs(v) for v in samples) or 1.0
    scale = 0.82 / peak
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(clamp(s*scale)*32767)) for s in samples))

def synth_alkali(n):
    # warm crackle tick
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-28*i/n)
        f=1950 + (780-1950)*(i/n)
        x=0.55*math.sin(2*math.pi*f*t)*e
        x+=0.38*noise(i,17)*e*e
        out.append(x)
    return out

def synth_alkaline(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-24*i/n)
        f=1350+(620-1350)*(i/n)
        x=0.5*math.sin(2*math.pi*f*t)*e
        x+=0.22*math.sin(2*math.pi*f*0.5*t)*e
        x+=0.25*noise(i,31)*e*e
        out.append(x)
    return out

def synth_transition(n):
    out=[]
    for i in range(n):
        t=i/SR
        x=0
        for k,h in enumerate((1.0,1.498,2.003,2.51)):
            e=math.exp(-(16+k*6)*i/n)
            x+=(0.42/(k+1))*math.sin(2*math.pi*540*h*t)*e
        x+=0.1*noise(i,7)*math.exp(-55*i/n)
        out.append(x)
    return out

def synth_post(n):
    out=[]
    for i in range(n):
        t=i/SR
        x=0
        for k,h in enumerate((1.0,1.38,1.86)):
            e=math.exp(-(20+k*7)*i/n)
            x+=(0.4/(k+1))*math.sin(2*math.pi*360*h*t)*e
        x+=0.14*noise(i,99)*math.exp(-40*i/n)
        out.append(x)
    return out

def synth_metalloid(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-26*i/n)
        x=0.48*math.sin(2*math.pi*1520*t)*e
        x+=0.3*math.sin(2*math.pi*3040*t+0.4)*math.exp(-34*i/n)
        x+=0.06*noise(i,44)*math.exp(-50*i/n)
        out.append(x)
    return out

def synth_nonmetal(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-32*i/n)
        x=0.42*math.sin(2*math.pi*290*t)*e
        x+=0.55*noise(i,123)*math.exp(-42*i/n)
        out.append(x)
    return out

def synth_halogen(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-36*i/n)
        f=3400+(1600-3400)*(i/n)
        x=0.58*math.sin(2*math.pi*f*t)*e
        x+=0.42*noise(i,5)*e*e
        out.append(x)
    return out

def synth_noble(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-18*i/n)
        x=0.62*noise(i,77)*e
        x+=0.16*math.sin(2*math.pi*880*t)*e
        out.append(x)
    return out

def synth_lanthanide(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-22*i/n)
        x=0.36*math.sin(2*math.pi*700*t)*e
        x+=0.28*math.sin(2*math.pi*1400*t+0.8)*math.exp(-28*i/n)
        x+=0.18*math.sin(2*math.pi*2100*t+1.2)*math.exp(-34*i/n)
        out.append(x)
    return out

def synth_actinide(n):
    out=[]
    for i in range(n):
        t=i/SR; e=math.exp(-15*i/n)
        x=0.48*math.sin(2*math.pi*180*t)*e
        x+=0.22*math.sin(2*math.pi*360*t)*math.exp(-20*i/n)
        x+=0.28*noise(i,201)*math.exp(-25*i/n)
        out.append(x)
    return out

SPECS = {
  "alkali": (0.13, synth_alkali),
  "alkaline": (0.14, synth_alkaline),
  "transition": (0.20, synth_transition),
  "post": (0.18, synth_post),
  "metalloid": (0.15, synth_metalloid),
  "nonmetal": (0.12, synth_nonmetal),
  "halogen": (0.11, synth_halogen),
  "noble": (0.15, synth_noble),
  "lanthanide": (0.17, synth_lanthanide),
  "actinide": (0.16, synth_actinide),
}

for cat,(dur,fn) in SPECS.items():
  n=max(64,int(SR*dur))
  path=OUT/f"cat-{cat}.wav"
  write_wav(path, fn(n))
  print("wrote", path.name, f"{dur:.2f}s")
