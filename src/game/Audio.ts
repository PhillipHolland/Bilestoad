// Retro Web Audio engine — crunchy 1982-style sounds, no assets needed

export class RetroAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;

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

  // === Game-specific sounds ===

  swing(arm: 'left' | 'right') {
    const base = arm === 'left' ? 180 : 240;
    this.play('sawtooth', base + Math.random() * 40, 0.18, 0.45, 0.003, 0.12, 1400);
    // whoosh layer
    setTimeout(() => {
      if (this.ctx) this.play('sine', base * 1.6, 0.09, 0.22, 0.001, 0.1);
    }, 12);
  }

  hit(damage: number) {
    const intensity = Math.min(1, damage / 6);
    this.play('square', 80 + intensity * 40, 0.22, 0.7 * intensity, 0.001, 0.18);
    // meaty crack
    setTimeout(() => {
      this.play('sawtooth', 160, 0.11, 0.35, 0.001, 0.07, 900);
    }, 18);
  }

  limbSever() {
    this.play('square', 95, 0.32, 0.85, 0.002, 0.26);
    setTimeout(() => this.play('sawtooth', 420, 0.14, 0.4, 0.001, 0.12, 650), 25);
    // wet splat layer
    setTimeout(() => {
      if (this.ctx) this.play('sine', 65, 0.28, 0.5, 0.002, 0.2);
    }, 40);
  }

  thrust() {
    this.play('sawtooth', 110, 0.15, 0.5, 0.002, 0.11);
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

  // Soft ambient pulse for the island
  startAmbient() {
    // placeholder — we can expand this later
  }

  stopAll() {
    // For now just let things decay
  }
}

export const audio = new RetroAudio();
