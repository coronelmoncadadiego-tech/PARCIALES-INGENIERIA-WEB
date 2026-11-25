/**
 * AUDIO.JS - Motor de Sonido Procedural con Web Audio API (Expandido)
 * 100% sintetizado por software, sin archivos de audio externos.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Nodos principales
    this.masterGain = null;
    this.droneGain = null;
    this.droneFilter = null;

    // Temporizador de latido cardíaco
    this.heartbeatTimer = null;
    this.currentBpm = 60;
    this.lucidity = 100;
  }

  init() {
    if (this.isInitialized) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(compressor);

    this.startAmbientDrone();
    this.startHeartbeatLoop();
    this.isInitialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbientDrone() {
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(44, t);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(46.5, t);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(90, t);
    this.droneFilter.Q.setValueAtTime(3.5, t);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(25, t);
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);
    lfo.start();

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.35, t);

    osc1.connect(this.droneFilter);
    osc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.startRoomNoise();
  }

  startRoomNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start();
  }

  startHeartbeatLoop() {
    const playNextBeat = () => {
      if (!this.isInitialized) return;

      if (this.lucidity < 85) {
        this.triggerHeartbeatPulse();
      }

      // Lucidez 100 -> 55 BPM, Lucidez 0 -> 155 BPM
      const targetBpm = 55 + (100 - this.lucidity) * 1.0;
      this.currentBpm = targetBpm;
      const intervalMs = (60 / this.currentBpm) * 1000;

      this.heartbeatTimer = setTimeout(playNextBeat, intervalMs);
    };

    playNextBeat();
  }

  triggerHeartbeatPulse() {
    const t = this.ctx.currentTime;
    const volumeFactor = Math.max(0.01, Math.min(1.0, (85 - this.lucidity) / 60));
    this.createThump(t, 82, 30, 0.12, 0.45 * volumeFactor);
    this.createThump(t + 0.14, 96, 36, 0.10, 0.35 * volumeFactor);
  }

  createThump(startTime, startFreq, endFreq, duration, volume) {
    const safeVol = Math.max(0.001, volume);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gain.gain.setValueAtTime(safeVol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Clic interruptor de la linterna
   */
  playFlashlightClick(isOn) {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isOn ? 1800 : 1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Quemadura / Huida del Demonio cuando es alumbrado
   */
  playDemonBurn() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    // Alarido áspero y chirrido de humo
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.6);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(6, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.75);
  }

  /**
   * Rugido aterrador cuando el Demonio se acostumbra a la luz y se vuelve inmune
   */
  playDemonRoarImmune() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    // Cluster infernal
    [65, 82, 115, 160].forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.5, t + 0.8);
      osc.frequency.exponentialRampToValueAtTime(40, t + 1.8);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.9);
    });
  }

  /**
   * Tic-tac del reloj
   */
  playClockTick(isTock = false) {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isTock ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(isTock ? 780 : 1050, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isTock ? 1200 : 1600, t);
    filter.Q.setValueAtTime(8, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Clic general
   */
  playClick() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Sonido de la tableta / bip tecnológico
   */
  playTabletBeep() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(2100, t + 0.05);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Respiración profunda
   */
  playFocusBreathe(success = false) {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.6;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    if (success) setTimeout(() => this.playLucidChime(), 150);
  }

  playLucidChime() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.05 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  playClockBell() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(220, t);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(308, t);

    modGain.gain.setValueAtTime(450, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + 2.0);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrierGain.gain.setValueAtTime(0.4, t);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

    carrier.connect(carrierGain);
    carrierGain.connect(this.masterGain);

    modulator.start(t);
    carrier.start(t);
    modulator.stop(t + 2.9);
    carrier.stop(t + 2.9);
  }

  /**
   * Salpicadura de agua fría (Baño)
   */
  playWaterSplash() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Silbato de la caldera / infusión (Cocina)
   */
  playKettleWhistle() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.linearRampToValueAtTime(1750, t + 0.4);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  /**
   * Llave inglesa apretando tubería (Cocina)
   */
  playPipeWrench() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Tecla de máquina de escribir con campana (Estudio)
   */
  playTypewriterKey(isBell = false) {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    if (isBell) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.65);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Interruptor pesado de fusible eléctrico con chispazo (Sótano)
   */
  playFuseClick() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playHorrorStinger() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    [73.4, 77.8, 110, 116.5, 233.1, 466.2].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 2.6);
    });

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 1.2);

    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + 1.5);
  }

  triggerWhisperBurst() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.8;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900 + Math.random() * 700, t);
    filter.Q.setValueAtTime(10, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  playFootstep() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 + Math.random() * 20, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  updateLucidity(value) {
    this.lucidity = Math.max(0, Math.min(100, value));
    if (this.droneFilter) {
      const cutoff = 90 + (100 - this.lucidity) * 2.5;
      this.droneFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.4);
    }
  }
}

const audioEngine = new SoundEngine();
