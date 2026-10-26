/*
 * stardust-audio.js — 元素的声音（浏览器实时合成，无采样、无外部文件）
 *
 * 映射规则：把可见光谱整段等比搬进可听频段。
 *     f(Hz) = 110 * 780 / λ(nm)          780 nm → 110 Hz，380 nm → 225.8 Hz
 * 这是纯等比搬移：谱线之间的音程关系保持真实，没有任何"美化"。
 * 声像按波长展开：长波（红）在左，短波（紫）在右。
 *
 * 已知的诚实边界：钠 D 双线（588.995 / 589.592 nm）相差只有 0.15%，
 * 搬到听觉后是 0.147 Hz 的拍音，人耳听不出来。任何单调映射都改变不了这个相对差，
 * 所以钠听起来就是一个纯音——这正好对应它焰色是标准里最纯的亮黄。
 *
 * 用法：
 *     const au = new StardustAudio();
 *     au.setSpectra(spectraJson);        // { "Na": [{nm, intensity}, ...], ... }
 *     au.unlock();                       // 必须在一次用户手势里调用（浏览器自动播放策略）
 *     au.playChord("Na");                // 悬浮/点击元素时发声
 *     au.setDuck(true);                  // 旁白说话时压低元素音
 */
(function (root) {
  "use strict";
  var F_RED = 110, LAM_RED = 780, RATIO = F_RED * LAM_RED;

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
  }

  StardustAudio.prototype.unlock = function () {
    if (!this.ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.opts.master === undefined ? 0.75 : this.opts.master;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume();
    return this.ctx;
  };

  StardustAudio.prototype.setSpectra = function (s) { this.spectra = s || {}; return this; };
  StardustAudio.prototype.chord = function (symbol) { return chordOf(this.spectra, symbol); };

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

  /* UI 轻点：极短噪声瞬态，与格子高亮同帧，不当成谱线 */
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

  /* 无可见强线：诚实的空响——低通噪声空心轻叩，不编假音高 */
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
