// Retro Web Audio engine — crunchy 1982-style sounds, no assets needed

export class RetroAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;
  private ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  private ensureContext() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(state: boolean) {
    this.enabled = state;
  }

  private play(
    type: OscillatorType,
    freq: number,
    duration: number,
    vol = 0.6,
    attack = 0.002,
    _decay = 0.08,
    filterFreq?: number
  ) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = filterFreq ?? (type === 'sawtooth' ? 1800 : 3200);

    gain.gain.value = vol;

    // Simple envelope
    const end = t + duration;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.linearRampToValueAtTime(0.0001, end);

    const noise = type === 'square' ? this.makeNoise(duration, vol * 0.6) : null;

    if (noise) {
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = vol * 0.55;
      noise.connect(noiseGain);
      noiseGain.connect(filter);
      noiseGain.gain.linearRampToValueAtTime(0.0001, end);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(end + 0.05);
  }

  private makeNoise(duration: number, vol: number) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration * 1.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.8;

    const g = this.ctx.createGain();
    g.gain.value = vol;

    noise.connect(filter);
    filter.connect(g);
    return g;
  }

  // === Game-specific sounds — now much more visceral and distinct ===

  swing(arm: 'left' | 'right', power = 1.0) {
    const isAxe = arm === 'right';
    const base = isAxe ? 248 : 168;
    const dur = isAxe ? 0.19 : 0.15;

    // Primary whoosh / chop
    this.play(isAxe ? 'sawtooth' : 'square', base + Math.random() * 28, dur, 0.42 * power, 0.002, 0.13, isAxe ? 1350 : 980);

    // High metallic ring for axe, duller thud for shield
    setTimeout(() => {
      if (this.ctx) {
        this.play(isAxe ? 'triangle' : 'sine', base * (isAxe ? 2.05 : 1.45), isAxe ? 0.08 : 0.1, 0.19 * power, 0.001, 0.09);
      }
    }, 9);

    // Extra air-rush layer for weight
    if (isAxe && power > 0.8) {
      setTimeout(() => {
        if (this.ctx) this.play('sawtooth', 410, 0.07, 0.16, 0.001, 0.06, 2200);
      }, 22);
    }
  }

  hit(damage: number) {
    const i = Math.min(1.0, damage / 5.8);
    // Deep meaty body impact (low end)
    this.play('square', 58 + i * 52, 0.27, 0.92 * i, 0.001, 0.24);

    // Sharp crack / bone
    setTimeout(() => {
      this.play('sawtooth', 148 + i * 95, 0.13, 0.48 * i, 0.001, 0.09, 820);
    }, 13);

    // Wet gore / blood layer on solid hits
    if (damage > 2.8) {
      setTimeout(() => {
        if (this.ctx) this.play('sine', 52, 0.22, 0.55 * i, 0.003, 0.19);
      }, 32);
    }
  }

  limbSever() {
    // Horrific multi-layered sever: low tear + high shriek + wet impact
    this.play('square', 78, 0.38, 0.95, 0.001, 0.29);
    setTimeout(() => {
      if (this.ctx) this.play('sawtooth', 385, 0.18, 0.6, 0.001, 0.14, 520);
    }, 18);
    setTimeout(() => {
      if (this.ctx) this.play('sine', 58, 0.31, 0.72, 0.002, 0.25);
    }, 38);
    // Final ripping tail
    setTimeout(() => {
      if (this.ctx) this.play('sawtooth', 195, 0.24, 0.38, 0.001, 0.17, 780);
    }, 55);
  }

  thrust() {
    this.play('sawtooth', 105, 0.13, 0.42, 0.002, 0.09);
  }

  // Very crude "Für Elise" spirit — just a few low beeps for now
  playMenuTone() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    [329.6, 311.1, 329.6, 246.9].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.value = 0.12;
      g.gain.setValueAtTime(0.12, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.0001, t + i * 0.09 + 0.18);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.22);
    });
  }

  // Brooding low ambient drone for the cursed island — gives the arena soul
  startAmbient() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain || this.ambientNodes.length > 0) return;

    // Very low, slow, unsettling chord (three detuned voices)
    const freqs = [36.2, 49.8, 68.5];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = (idx === 1) ? 'sine' : 'sawtooth';
      osc.frequency.value = f + (idx - 1) * 0.6;

      const filt = this.ctx!.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 165;

      const g = this.ctx!.createGain();
      g.gain.value = 0.018 + idx * 0.007;

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain!);

      osc.start();
      this.ambientNodes.push({ osc, gain: g });
    });
  }

  stopAll() {
    this.ambientNodes.forEach(({ osc }) => {
      try { osc.stop(0.2); } catch (e) {}
    });
    this.ambientNodes = [];
  }
}

export const audio = new RetroAudio();
