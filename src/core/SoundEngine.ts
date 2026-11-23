/**
 * Lightweight procedural Web Audio synthesizer inspired by Splatoon 3 SFX:
 * - E-liter 4K charger lock-on chirp & crisp piercing sniper crack
 * - Splat Bomb warning beeps & wet ink detonation thump
 * - Squishy ink splats, combo pitch escalations, and badge unlock fanfare
 * Unlocked cleanly on the first pointerdown event per mobile audio guidelines.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private getReadyCtx(): AudioContext | null {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  public playSelect(): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playInvalidSwap(): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.14);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** E-liter 4K Charger lock chirp + piercing high-velocity ink laser crack */
  public playEliter4K(fullColumn: boolean, comboIndex: number): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchBoost = 1 + Math.min(comboIndex - 1, 6) * 0.07;

    // 1. High-pitched charger lock ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(980 * pitchBoost, now);
    ping.frequency.exponentialRampToValueAtTime(2200 * pitchBoost, now + 0.07);
    pingGain.gain.setValueAtTime(fullColumn ? 0.16 : 0.11, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    ping.connect(pingGain).connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.095);

    // 2. Piercing sniper crack sweep
    const shot = ctx.createOscillator();
    const shotGain = ctx.createGain();
    shot.type = 'sawtooth';
    shot.frequency.setValueAtTime(fullColumn ? 1500 : 1200, now + 0.055);
    shot.frequency.exponentialRampToValueAtTime(150, now + (fullColumn ? 0.28 : 0.2));
    shotGain.gain.setValueAtTime(fullColumn ? 0.2 : 0.14, now + 0.055);
    shotGain.gain.exponentialRampToValueAtTime(0.001, now + (fullColumn ? 0.3 : 0.22));
    shot.connect(shotGain).connect(ctx.destination);
    shot.start(now + 0.055);
    shot.stop(now + (fullColumn ? 0.31 : 0.23));

    // 3. Crisp filtered noise burst
    this.playNoiseBurst(ctx, now + 0.055, fullColumn ? 0.22 : 0.14, 2400, fullColumn ? 0.18 : 0.12);
  }

  /** Splat Bomb classic triangle warning beep + wet bass ink detonation */
  public playSplatBomb(fullRow: boolean, comboIndex: number): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchBoost = 1 + Math.min(comboIndex - 1, 6) * 0.06;

    // Classic fast double beep before boom
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.045;
      const beep = ctx.createOscillator();
      const bGain = ctx.createGain();
      beep.type = 'square';
      beep.frequency.setValueAtTime((1120 + i * 240) * pitchBoost, t);
      bGain.gain.setValueAtTime(0.06, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      beep.connect(bGain).connect(ctx.destination);
      beep.start(t);
      beep.stop(t + 0.04);
    }

    // Wet splat explosion punch
    const boomTime = now + 0.09;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(fullRow ? 210 : 185, boomTime);
    sub.frequency.exponentialRampToValueAtTime(42, boomTime + (fullRow ? 0.28 : 0.2));
    subGain.gain.setValueAtTime(fullRow ? 0.28 : 0.2, boomTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, boomTime + (fullRow ? 0.3 : 0.22));
    sub.connect(subGain).connect(ctx.destination);
    sub.start(boomTime);
    sub.stop(boomTime + (fullRow ? 0.31 : 0.23));

    this.playNoiseBurst(ctx, boomTime, fullRow ? 0.25 : 0.17, 780, fullRow ? 0.22 : 0.15);
  }

  public playBooyah(): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
    this.playNoiseBurst(ctx, now + 0.18, 0.28, 1200, 0.2);
  }

  public playVictory(): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Upbeat Splatoon-esque pentatonic victory riff!
    const riff = [
      { f: 523.25, t: 0, d: 0.11 },
      { f: 659.25, t: 0.1, d: 0.11 },
      { f: 783.99, t: 0.2, d: 0.11 },
      { f: 1046.5, t: 0.32, d: 0.22 },
      { f: 880.0, t: 0.48, d: 0.12 },
      { f: 1046.5, t: 0.6, d: 0.36 },
    ];
    for (const n of riff) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.16, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  }

  public playDefeat(): void {
    const ctx = this.getReadyCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      const t = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  private playNoiseBurst(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number,
    volume: number,
  ): void {
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.35));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(0.9, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }
}
