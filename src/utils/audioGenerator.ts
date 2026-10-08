/**
 * NoteSphere OS - Web Audio Ambient Sound Generator
 * Real-time procedural ambient sounds (Rain, Cosmic Synth, Waves, White Noise, Focus Drone)
 * 100% offline, lightweight and dependency-free using standard Web Audio API.
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentType: string | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume() {
    return this.volume;
  }

  public getCurrentType() {
    return this.currentType;
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch (_) {}
    });
    this.activeNodes = [];
    this.currentType = null;
  }

  public play(type: 'rain' | 'waves' | 'cosmic' | 'whitenoise' | 'focus') {
    this.initCtx();
    if (!this.ctx) return;

    if (this.currentType === type) {
      this.stop();
      return;
    }

    this.stop();
    this.currentType = type;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    switch (type) {
      case 'rain':
        this.generateRain();
        break;
      case 'waves':
        this.generateWaves();
        break;
      case 'cosmic':
        this.generateCosmicSynth();
        break;
      case 'whitenoise':
        this.generateWhiteNoise();
        break;
      case 'focus':
        this.generateFocusDrone();
        break;
    }
  }

  private createNoiseBuffer(durationSeconds = 2): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private generateRain() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(3);
    if (!buffer) return;

    // Pink/Rain filter
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const biquad = this.ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.setValueAtTime(1200, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    noiseSource.connect(biquad);
    biquad.connect(rainGain);
    rainGain.connect(this.masterGain);

    noiseSource.start();

    this.activeNodes.push({
      stop: () => {
        try { noiseSource.stop(); } catch (_) {}
      }
    });
  }

  private generateWaves() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(4);
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    // LFO for wave modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec wave cycle

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);

    noiseSource.start();
    lfo.start();

    this.activeNodes.push({
      stop: () => {
        try { noiseSource.stop(); lfo.stop(); } catch (_) {}
      }
    });
  }

  private generateCosmicSynth() {
    if (!this.ctx || !this.masterGain) return;

    const frequencies = [110, 164.81, 220, 277.18]; // A2, C#3, A3, C#4 chord
    const oscs: OscillatorNode[] = [];

    frequencies.forEach(freq => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start();
      oscs.push(osc);
    });

    this.activeNodes.push({
      stop: () => {
        oscs.forEach(o => { try { o.stop(); } catch (_) {} });
      }
    });
  }

  private generateWhiteNoise() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(2);
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push({
      stop: () => {
        try { noiseSource.stop(); } catch (_) {}
      }
    });
  }

  private generateFocusDrone() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2 deep binaural focus drone

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);
    osc.start();

    this.activeNodes.push({
      stop: () => {
        try { osc.stop(); } catch (_) {}
      }
    });
  }
}

export const ambientEngine = new AmbientSoundEngine();
