/*
 * stardust-audio.js — 元素的声音
 *
 * 谱线和弦：把可见光谱整段等比搬进可听频段（浏览器实时合成）。
 *     f(Hz) = 110 * 780 / λ(nm)          780 nm → 110 Hz，380 nm → 225.8 Hz
 * 点选 hit：按元素类别共 10 种预载 WAV（同类同声）。
 *     alkali alkaline transition post metalloid
 *     nonmetal halogen noble lanthanide actinide
 *     → assets/sfx/cat-<category>.wav
 *
 * 用法：
 *     const au = new StardustAudio();
 *     au.setSpectra(spectraJson);
 *     au.preload();                      // 拉取短 WAV；缺文件静默 + console.warn
 *     au.unlock();                       // 必须在一次用户手势里调用
 *     au.playSelect("Na", { category: "alkali" });  // 与金边 rim / 开档同帧
 *     au.playChord("Na");                // 仅谱线层
 */
(function (root) {
  "use strict";
  var F_RED = 110, LAM_RED = 780, RATIO = F_RED * LAM_RED;
  var DEBOUNCE_MS = 80;
  var CAT_SFX = {
    alkali: "cat-alkali",
    alkaline: "cat-alkaline",
    transition: "cat-transition",
    post: "cat-post",
    metalloid: "cat-metalloid",
    nonmetal: "cat-nonmetal",
    halogen: "cat-halogen",
    noble: "cat-noble",
    lanthanide: "cat-lanthanide",
    actinide: "cat-actinide"
  };
  var SFX_FILES = {
    "cat-alkali": "cat-alkali.wav",
    "cat-alkaline": "cat-alkaline.wav",
    "cat-transition": "cat-transition.wav",
    "cat-post": "cat-post.wav",
    "cat-metalloid": "cat-metalloid.wav",
    "cat-nonmetal": "cat-nonmetal.wav",
    "cat-halogen": "cat-halogen.wav",
    "cat-noble": "cat-noble.wav",
    "cat-lanthanide": "cat-lanthanide.wav",
    "cat-actinide": "cat-actinide.wav",
    "select-click": "select-click.wav",
    "og-hollow-tap": "og-hollow-tap.wav"
  };

  function pitchOf(nm) { return RATIO / nm; }

  function chordOf(spectra, symbol) {
    var ls = (spectra && spectra[symbol]) || [];
    if (!ls.length) return [];
    var imax = 0, i;
    for (i = 0; i < ls.length; i++) if (ls[i].intensity > imax) imax = ls[i].intensity;
    var out = [];
    for (i = 0; i < ls.length; i++) {
      var f = pitchOf(ls[i].nm);
      if (f < 40 || f > 6000) continue;
      out.push({
        nm: ls[i].nm,
        f: f,
        a: Math.pow(ls[i].intensity / imax, 0.6) / Math.pow(ls.length, 0.45),
        pan: Math.max(-0.8, Math.min(0.8, (LAM_RED - ls[i].nm) / 400))
      });
    }
    return out;
  }

  function buildGraph(ctx, notes, dest, dur, gain, when) {
    var t0 = when || ctx.currentTime;
    var voices = [];
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, t0);
      var g = ctx.createGain();
      var atk = Math.min(1.2, dur * 0.3), rel = Math.min(2.5, dur * 0.5);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(n.a * gain, t0 + atk);
      g.gain.setValueAtTime(n.a * gain, Math.max(t0 + atk, t0 + dur - rel));
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.setValueAtTime(n.pan, t0); osc.connect(g); g.connect(p); p.connect(dest); }
      else { osc.connect(g); g.connect(dest); }
      osc.start(t0); osc.stop(t0 + dur + 0.05);
      voices.push(osc);
    }
    return voices;
  }

  function StardustAudio(opts) {
    this.opts = opts || {};
    this.ctx = null; this.master = null; this.spectra = {};
    this.voices = []; this.duckGain = 1;
    this.buffers = {};
    this._warned = {};
    this._lastEventAt = {};
    this._preloadStarted = false;
  }

  StardustAudio.prototype.unlock = function () {
    if (!this.ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.opts.master === undefined ? 0.55 : this.opts.master;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume();
    return this.ctx;
  };

  StardustAudio.prototype.setSpectra = function (s) { this.spectra = s || {}; return this; };
  StardustAudio.prototype.chord = function (symbol) { return chordOf(this.spectra, symbol); };

  /* 预载短 WAV；缺文件静默并 console.warn（禁止空 Audio 假装播放） */
  StardustAudio.prototype.preload = function () {
    if (this._preloadStarted) return this;
    this._preloadStarted = true;
    var self = this;
    var base = this.opts.sfxBase || "assets/sfx/";
    var ctx = this.unlock();
    if (!ctx) return this;
    Object.keys(SFX_FILES).forEach(function (key) {
      var url = base + SFX_FILES[key];
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      }).then(function (ab) {
        return self.ctx.decodeAudioData(ab.slice ? ab.slice(0) : ab);
      }).then(function (buf) {
        self.buffers[key] = buf;
      }).catch(function (err) {
        if (!self._warned[key]) {
          console.warn("[stardust-audio] missing SFX:", key, url, err && err.message ? err.message : err);
          self._warned[key] = true;
        }
      });
    });
    return this;
  };

  StardustAudio.prototype._debounceOk = function (eventId) {
    var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    var last = this._lastEventAt[eventId] || 0;
    if (now - last < DEBOUNCE_MS) return false;
    this._lastEventAt[eventId] = now;
    return true;
  };

  /* 播已解码缓冲；缺失则静默返回 null */
  StardustAudio.prototype.playBuffer = function (key, o) {
    o = o || {};
    var ctx = this.unlock();
    if (!ctx) return null;
    var buf = this.buffers[key];
    if (!buf) {
      if (!this._warned[key]) {
        console.warn("[stardust-audio] missing SFX:", key);
        this._warned[key] = true;
      }
      return null;
    }
    var t0 = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    var peak = o.gain === undefined ? 0.4 : o.gain;
    g.gain.setValueAtTime(peak * this.duckGain, t0);
    src.connect(g); g.connect(this.master);
    src.start(t0);
    try { src.stop(t0 + buf.duration + 0.02); } catch (e) {}
    return true;
  };

  StardustAudio.prototype.playChord = function (symbol, o) {
    o = o || {};
    var ctx = this.unlock();
    if (!ctx) return null;
    var notes = chordOf(this.spectra, symbol);
    if (!notes.length) return null;
    var bus = ctx.createGain();
    bus.gain.value = this.duckGain;
    bus.connect(this.master);
    var voices = buildGraph(ctx, notes, bus, o.dur || 4, o.gain === undefined ? 0.22 : o.gain);
    this.voices.push({ bus: bus, voices: voices, stopAt: ctx.currentTime + (o.dur || 4) + 0.1 });
    return voices.length;
  };

  var oCategoryCache = {};
  StardustAudio.prototype._categoryOf = function (symbol) {
    if (oCategoryCache[symbol]) return oCategoryCache[symbol];
    var list = (root.STARDUST_ELEMENTS) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].symbol === symbol) {
        oCategoryCache[symbol] = list[i].category || "";
        return oCategoryCache[symbol];
      }
    }
    return "";
  };

  /* 点选 hit：按类别 10 声；有谱线时再叠一层轻和弦 */
  StardustAudio.prototype.playSelect = function (symbol, o) {
    o = o || {};
    var ctx = this.unlock();
    if (!ctx) return null;
    this.preload();

    var cat = o.category || this._categoryOf(symbol) || "";
    var sampleKey = CAT_SFX[cat] || "select-click";
    var eventId = "ui.select." + (cat || "default");
    var hasLines = chordOf(this.spectra, symbol).length > 0;
    var hitGain = o.gain === undefined ? 0.42 : o.gain;
    var chordGain = hasLines ? (o.chordGain === undefined ? 0.14 : o.chordGain) : 0;

    if (!this._debounceOk(eventId)) return null;

    var played = this.playBuffer(sampleKey, { gain: hitGain });
    if (!played) {
      /* 样本缺失：回退 procedural，不假装播空文件 */
      this.playUiClick({ gain: Math.min(0.14, hitGain * 0.35) });
    }

    if (hasLines && chordGain > 0) {
      this.playChord(symbol, {
        dur: o.dur || 1.6,
        gain: chordGain * 0.75
      });
    }
    return eventId;
  };

  /* UI 轻点：极短噪声瞬态（样本缺失时的回退 / 可选 hover） */
  StardustAudio.prototype.playUiClick = function (o) {
    o = o || {};
    var ctx = this.unlock();
    if (!ctx) return null;
    var t0 = ctx.currentTime;
    var dur = o.dur || 0.042;
    var n = Math.max(32, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.16));
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(o.freq || 1750, t0);
    bp.Q.setValueAtTime(1.1, t0);
    var g = ctx.createGain();
    var peak = o.gain === undefined ? 0.15 : o.gain;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
    return true;
  };

  /* 无可见强线：诚实的空响——低通噪声空心轻叩（样本缺失回退） */
  StardustAudio.prototype.playEmpty = function (o) {
    o = o || {};
    var ctx = this.unlock();
    if (!ctx) return null;
    var t0 = ctx.currentTime;
    var dur = o.dur || 0.15;
    var n = Math.max(64, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) {
      var env = Math.exp(-i / (n * 0.28));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(o.freq || 380, t0);
    lp.Q.setValueAtTime(0.7, t0);
    var g = ctx.createGain();
    var peak = o.gain === undefined ? 0.09 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.03);
    return true;
  };

  StardustAudio.prototype.stopAll = function () {
    if (!this.ctx) return;
    var now = this.ctx.currentTime;
    for (var i = 0; i < this.voices.length; i++) {
      try { this.voices[i].bus.gain.setTargetAtTime(0, now, 0.04); } catch (e) {}
      for (var k = 0; k < this.voices[i].voices.length; k++) {
        try { this.voices[i].voices[k].stop(now + 0.2); } catch (e) {}
      }
    }
    this.voices = [];
  };

  StardustAudio.prototype.setDuck = function (on, sec) {
    this.duckGain = on ? 0.28 : 1;
    if (this.ctx) {
      for (var i = 0; i < this.voices.length; i++) {
        this.voices[i].bus.gain.setTargetAtTime(this.duckGain, this.ctx.currentTime, sec || 0.12);
      }
    }
  };

  /* 离线渲染：给测试用，产物是 Float32Array，不发声 */
  StardustAudio.renderOffline = function (spectra, symbol, cfg) {
    cfg = cfg || {};
    var sr = cfg.sr || 48000, dur = cfg.dur || 2;
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var ctx = new OAC(2, Math.round(sr * dur), sr);
    var master = ctx.createGain();
    master.gain.value = 1; master.connect(ctx.destination);
    buildGraph(ctx, chordOf(spectra, symbol), master, dur, cfg.gain === undefined ? 0.3 : cfg.gain, 0);
    return ctx.startRendering();
  };

  /* Goertzel：在给定频点上测能量，避免把整段样本搬出浏览器 */
  StardustAudio.magnitudesAt = function (buf, freqs) {
    var x = buf.getChannelData ? buf.getChannelData(0) : buf;
    var n = x.length, out = new Array(freqs.length);
    for (var k = 0; k < freqs.length; k++) {
      var w = 2 * Math.PI * freqs[k] / (buf.sampleRate || 48000);
      var c = 2 * Math.cos(w), s1 = 0, s2 = 0;
      for (var i = 0; i < n; i++) { var s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      out[k] = Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / n;
    }
    return out;
  };

  root.StardustAudio = StardustAudio;
  root.__stardustPitch = pitchOf;
})(typeof window !== "undefined" ? window : this);
