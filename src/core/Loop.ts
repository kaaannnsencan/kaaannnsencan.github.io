/**
 * requestAnimationFrame loop with a fixed simulation step. Long frames (tab
 * switches, GC pauses) are clamped so physics never explodes or spirals.
 */
export class Loop {
  readonly step = 1 / 60
  private acc = 0
  private last = 0
  private raf = 0
  private running = false
  elapsed = 0
  fps = 60

  constructor(private fixedUpdate: (dt: number) => void, private frame: (dt: number, alpha: number) => void) {}

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private tick = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05
    this.acc += dt
    let steps = 0
    while (this.acc >= this.step && steps < 5) {
      this.fixedUpdate(this.step)
      this.elapsed += this.step
      this.acc -= this.step
      steps++
    }
    if (steps === 5) this.acc = 0
    this.frame(dt, this.acc / this.step)
  }
}
