// Real-time Web Audio DSP engine shared by all FREKANSLA modules.
// Chain: input -> warm -> morph -> harmonic -> eqLow -> eqMid -> eqHigh -> comp -> makeup
//        -> vsat -> panner -> [dry / conv->wet] -> analyser -> master -> out

function makeShaperCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount * 4;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const impulse = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return impulse;
}

export class FrekAudioEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.sourceType = "synth";
    this.buffer = null;
    this.macros = {
      warm_analog: 30,
      intention_morph_x: 0.5,
      intention_morph_y: 0.5,
      harmonic_aggression: 15,
      spatial_depth: 40,
    };
    this.vintage = {
      eq_low: 50, eq_mid: 50, eq_high: 50, eq_freq: 40, bypass: false,
      comp_threshold: 60, comp_ratio: 30, comp_attack: 20, comp_release: 40, comp_makeup: 20,
      sat_drive: 25, sat_bright: false,
    };
  }

  ensure() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.inputGain = ctx.createGain(); this.inputGain.gain.value = 0.7;
    this.warmShaper = ctx.createWaveShaper(); this.warmShaper.oversample = "2x";
    this.morphFilter = ctx.createBiquadFilter(); this.morphFilter.type = "lowpass";
    this.harmonicShaper = ctx.createWaveShaper(); this.harmonicShaper.oversample = "4x";

    this.eqLow = ctx.createBiquadFilter(); this.eqLow.type = "lowshelf"; this.eqLow.frequency.value = 120;
    this.eqMid = ctx.createBiquadFilter(); this.eqMid.type = "peaking"; this.eqMid.frequency.value = 1000; this.eqMid.Q.value = 1;
    this.eqHigh = ctx.createBiquadFilter(); this.eqHigh.type = "highshelf"; this.eqHigh.frequency.value = 8000;

    this.comp = ctx.createDynamicsCompressor();
    this.makeup = ctx.createGain(); this.makeup.gain.value = 1;
    this.vsat = ctx.createWaveShaper(); this.vsat.oversample = "2x";

    this.panner = ctx.createStereoPanner();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.convolver = ctx.createConvolver(); this.convolver.buffer = makeImpulse(ctx, 2.2, 3.0);
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
    this.freqAnalyser = ctx.createAnalyser(); this.freqAnalyser.fftSize = 512;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;

    this.inputGain.connect(this.warmShaper);
    this.warmShaper.connect(this.morphFilter);
    this.morphFilter.connect(this.harmonicShaper);
    this.harmonicShaper.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.comp);
    this.comp.connect(this.makeup);
    this.makeup.connect(this.vsat);
    this.vsat.connect(this.panner);
    this.panner.connect(this.dryGain);
    this.panner.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.dryGain.connect(this.analyser);
    this.wetGain.connect(this.analyser);
    this.analyser.connect(this.freqAnalyser);
    this.analyser.connect(this.master);
    this.master.connect(ctx.destination);

    Object.keys(this.macros).forEach((k) => this.setMacro(k, this.macros[k]));
    Object.keys(this.vintage).forEach((k) => this.setVintage(k, this.vintage[k]));
  }

  setMacro(name, value) {
    this.macros[name] = value;
    if (!this.ctx) return;
    const m = this.macros, t = this.ctx.currentTime;
    if (name === "warm_analog") this.warmShaper.curve = makeShaperCurve(m.warm_analog / 100);
    else if (name === "intention_morph_x" || name === "intention_morph_y") {
      this.morphFilter.frequency.setTargetAtTime(180 + m.intention_morph_x * 7000, t, 0.02);
      this.morphFilter.Q.setTargetAtTime(0.5 + m.intention_morph_y * 18, t, 0.02);
    } else if (name === "harmonic_aggression") this.harmonicShaper.curve = makeShaperCurve((m.harmonic_aggression / 100) * 3);
    else if (name === "spatial_depth") {
      const wet = m.spatial_depth / 100;
      this.wetGain.gain.setTargetAtTime(wet * 0.9, t, 0.05);
      this.dryGain.gain.setTargetAtTime(1 - wet * 0.4, t, 0.05);
    }
  }

  setVintage(name, value) {
    this.vintage[name] = value;
    if (!this.ctx) return;
    const v = this.vintage, t = this.ctx.currentTime;
    const db = (x) => (x - 50) / 50 * 12;
    if (name === "eq_low") this.eqLow.gain.setTargetAtTime(v.bypass ? 0 : db(v.eq_low), t, 0.02);
    else if (name === "eq_mid") this.eqMid.gain.setTargetAtTime(v.bypass ? 0 : db(v.eq_mid), t, 0.02);
    else if (name === "eq_high") this.eqHigh.gain.setTargetAtTime(v.bypass ? 0 : db(v.eq_high), t, 0.02);
    else if (name === "eq_freq") this.eqMid.frequency.setTargetAtTime(200 * Math.pow(40, v.eq_freq / 100), t, 0.02);
    else if (name === "bypass") { this.setVintage("eq_low", v.eq_low); this.setVintage("eq_mid", v.eq_mid); this.setVintage("eq_high", v.eq_high); }
    else if (name === "comp_threshold") this.comp.threshold.setTargetAtTime(-60 + (v.comp_threshold / 100) * 60, t, 0.02);
    else if (name === "comp_ratio") this.comp.ratio.setTargetAtTime(1 + (v.comp_ratio / 100) * 19, t, 0.02);
    else if (name === "comp_attack") this.comp.attack.setTargetAtTime((v.comp_attack / 100) * 0.3, t, 0.02);
    else if (name === "comp_release") this.comp.release.setTargetAtTime(0.05 + (v.comp_release / 100) * 0.95, t, 0.02);
    else if (name === "comp_makeup") this.makeup.gain.setTargetAtTime(Math.pow(10, ((v.comp_makeup / 100) * 24) / 20), t, 0.02);
    else if (name === "sat_drive") this.vsat.curve = makeShaperCurve((v.sat_drive / 100) * 2 + (v.sat_bright ? 0.3 : 0));
    else if (name === "sat_bright") this.setVintage("sat_drive", v.sat_drive);
  }

  setSourceType(type) { this.sourceType = type; }

  async loadFile(file) {
    this.ensure();
    const arr = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arr.slice(0));
    this.sourceType = "file";
    return { duration: this.buffer.duration };
  }

  _startSynth() {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator();
    osc1.type = "sawtooth"; osc2.type = "square";
    osc1.frequency.value = 110; osc2.frequency.value = 165;
    const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.25; lfoGain.gain.value = 12;
    lfo.connect(lfoGain); lfoGain.connect(osc1.frequency);
    osc1.connect(this.inputGain); osc2.connect(this.inputGain);
    osc1.start(); osc2.start(); lfo.start();
    this._nodes = [osc1, osc2, lfo];
  }

  _startBuffer() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer; src.loop = true;
    src.connect(this.inputGain); src.start();
    this._nodes = [src];
  }

  async play() {
    this.ensure();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (this.playing) return;
    if (this.sourceType === "file" && this.buffer) this._startBuffer();
    else this._startSynth();
    this.playing = true;
  }

  stop() {
    if (this._nodes) {
      this._nodes.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
      this._nodes = null;
    }
    this.playing = false;
  }

  getWaveform() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  getSpectrum() {
    if (!this.freqAnalyser) return null;
    const data = new Uint8Array(this.freqAnalyser.frequencyBinCount);
    this.freqAnalyser.getByteFrequencyData(data);
    return data;
  }

  getLevel() {
    const w = this.getWaveform();
    if (!w) return 0;
    let sum = 0;
    for (let i = 0; i < w.length; i++) { const v = (w[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / w.length);
  }

  getCompReduction() {
    return this.comp ? this.comp.reduction : 0;
  }

  async renderWav(seconds = 4) {
    const rate = 44100;
    const off = new OfflineAudioContext(2, rate * seconds, rate);
    const m = this.macros;
    const inputGain = off.createGain(); inputGain.gain.value = 0.7;
    const warm = off.createWaveShaper(); warm.curve = makeShaperCurve(m.warm_analog / 100); warm.oversample = "2x";
    const morph = off.createBiquadFilter(); morph.type = "lowpass";
    morph.frequency.value = 180 + m.intention_morph_x * 7000; morph.Q.value = 0.5 + m.intention_morph_y * 18;
    const harm = off.createWaveShaper(); harm.curve = makeShaperCurve((m.harmonic_aggression / 100) * 3); harm.oversample = "4x";
    const dry = off.createGain(); dry.gain.value = 1 - (m.spatial_depth / 100) * 0.4;
    const wet = off.createGain(); wet.gain.value = (m.spatial_depth / 100) * 0.9;
    const conv = off.createConvolver(); conv.buffer = makeImpulse(off, 2.2, 3.0);
    const master = off.createGain(); master.gain.value = 0.9;
    inputGain.connect(warm); warm.connect(morph); morph.connect(harm);
    harm.connect(dry); harm.connect(conv); conv.connect(wet);
    dry.connect(master); wet.connect(master); master.connect(off.destination);
    if (this.sourceType === "file" && this.buffer) {
      const src = off.createBufferSource(); src.buffer = this.buffer; src.connect(inputGain); src.start();
    } else {
      const o1 = off.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 110;
      const o2 = off.createOscillator(); o2.type = "square"; o2.frequency.value = 165;
      o1.connect(inputGain); o2.connect(inputGain); o1.start(); o2.start();
    }
    return this._bufferToWav(await off.startRendering());
  }

  _bufferToWav(buffer) {
    const numCh = buffer.numberOfChannels;
    const len = buffer.length * numCh * 2 + 44;
    const ab = new ArrayBuffer(len); const view = new DataView(ab);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    let pos = 0;
    writeStr(pos, "RIFF"); pos += 4; view.setUint32(pos, len - 8, true); pos += 4;
    writeStr(pos, "WAVE"); pos += 4; writeStr(pos, "fmt "); pos += 4;
    view.setUint32(pos, 16, true); pos += 4; view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, numCh, true); pos += 2; view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * numCh * 2, true); pos += 4;
    view.setUint16(pos, numCh * 2, true); pos += 2; view.setUint16(pos, 16, true); pos += 2;
    writeStr(pos, "data"); pos += 4; view.setUint32(pos, len - pos - 4, true); pos += 4;
    const chans = [];
    for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
    for (let i = 0; i < buffer.length; i++)
      for (let c = 0; c < numCh; c++) {
        let s = Math.max(-1, Math.min(1, chans[c][i]));
        view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true); pos += 2;
      }
    return new Blob([ab], { type: "audio/wav" });
  }
}
