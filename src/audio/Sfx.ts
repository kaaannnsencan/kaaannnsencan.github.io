/**
 * Tiny chiptune synth — every sound is generated with WebAudio oscillators,
 * so there are no audio files to download.
 */
export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  muted: boolean
  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null

  constructor() {
    let stored: string | null = null
    try {
      stored = localStorage.getItem('muted')
    } catch {
      /* ignore */
    }
    this.muted = stored === '1'
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.35
    this.master.connect(this.ctx.destination)
    const len = this.ctx.sampleRate * 0.2
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem('muted', m ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.35, this.ctx.currentTime, 0.05)
  }

  suspend() {
    void this.ctx?.suspend()
  }

  resume() {
    void this.ctx?.resume()
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, when = 0, slide = 0) {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime + when
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private hiss(dur: number, vol: number, freq: number) {
    if (!this.ctx || !this.master || !this.noise || this.muted) return
    const t = this.ctx.currentTime
    const s = this.ctx.createBufferSource()
    s.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    s.connect(f).connect(g).connect(this.master)
    s.start(t)
    s.stop(t + dur)
  }

  /** Continuous engine hum; pass null to switch it off. */
  engine(speed: number | null) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    if (speed === null) {
      this.engineGain?.gain.setTargetAtTime(0, t, 0.08)
      return
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator()
      this.engineOsc.type = 'sawtooth'
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 520
      this.engineGain = this.ctx.createGain()
      this.engineGain.gain.value = 0
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master)
      this.engineOsc.start()
    }
    const s = Math.abs(speed)
    this.engineOsc.frequency.setTargetAtTime(42 + s * 7, t, 0.06)
    this.engineGain!.gain.setTargetAtTime(0.05 + s * 0.004, t, 0.06)
  }

  play(name: string) {
    switch (name) {
      case 'step':
        this.hiss(0.06, 0.12, 900 + Math.random() * 500)
        break
      case 'pop':
        this.tone(500 + Math.random() * 500, 0.08, 'square', 0.08, 0, 300)
        break
      case 'open':
        ;[523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'square', 0.09, i * 0.05))
        break
      case 'close':
        ;[784, 523].forEach((f, i) => this.tone(f, 0.08, 'square', 0.07, i * 0.05))
        break
      case 'kick':
        this.tone(160, 0.12, 'triangle', 0.4, 0, -100)
        this.hiss(0.05, 0.1, 400)
        break
      case 'goal':
        ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, i * 0.09))
        break
      case 'select':
        this.tone(880, 0.05, 'square', 0.06)
        break
      case 'coin':
        this.tone(988, 0.06, 'square', 0.08)
        this.tone(1319, 0.12, 'square', 0.08, 0.06)
        break
      case 'engine-start':
        ;[90, 130, 70].forEach((f, i) => this.tone(f, 0.12, 'sawtooth', 0.12, i * 0.08))
        break
      case 'travel':
        this.tone(300, 0.3, 'sawtooth', 0.06, 0, 600)
        break
    }
  }
}
