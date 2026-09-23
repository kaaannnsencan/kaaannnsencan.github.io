/**
 * Unified input: keyboard, on-screen joystick (touch/pen/mouse) and gamepad.
 * `move` is in screen space: x → right, y → down, length ≤ 1.
 */
export class Input {
  readonly move = { x: 0, y: 0 }
  /** −1..1 yaw input from the arrow keys (first person only). */
  turn = 0
  /** In first person the left/right arrows turn instead of strafing. */
  firstPerson = false
  run = false
  enabled = true
  private keys = new Set<string>()
  private interactQueued = false
  private stick = { id: -1, x: 0, y: 0, ox: 0, oy: 0 }
  private listeners: Array<() => void> = []
  private hotkeys = new Map<string, () => void>()
  private padA = false
  onFirstMove: (() => void) | null = null

  constructor(private joystickEl: HTMLElement, private knobEl: HTMLElement, interactBtn: HTMLElement) {
    this.on(window, 'keydown', (e) => this.onKey(e as KeyboardEvent, true))
    this.on(window, 'keyup', (e) => this.onKey(e as KeyboardEvent, false))
    this.on(window, 'blur', () => this.keys.clear())
    this.on(joystickEl, 'pointerdown', (e) => this.stickStart(e as PointerEvent))
    this.on(window, 'pointermove', (e) => this.stickMove(e as PointerEvent))
    this.on(window, 'pointerup', (e) => this.stickEnd(e as PointerEvent))
    this.on(window, 'pointercancel', (e) => this.stickEnd(e as PointerEvent))
    this.on(interactBtn, 'pointerdown', (e) => {
      e.preventDefault()
      this.interactQueued = true
    })
  }

  private on(target: EventTarget, type: string, fn: (e: Event) => void) {
    target.addEventListener(type, fn, { passive: false })
    this.listeners.push(() => target.removeEventListener(type, fn))
  }

  hotkey(code: string, fn: () => void) {
    this.hotkeys.set(code, fn)
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (down) {
      if (!e.repeat && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
        // Enter/Space on a focused button should click it, not interact in-world
        if (!(target && target.tagName === 'BUTTON') || e.code === 'KeyE') this.interactQueued = true
      }
      if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.hotkeys.get(e.code)?.()
      this.keys.add(e.code)
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
    } else this.keys.delete(e.code)
  }

  private stickStart(e: PointerEvent) {
    if (this.stick.id !== -1) return
    e.preventDefault()
    const r = this.joystickEl.getBoundingClientRect()
    this.stick.id = e.pointerId
    this.stick.ox = r.left + r.width / 2
    this.stick.oy = r.top + r.height / 2
    this.stickMove(e)
  }

  private stickMove(e: PointerEvent) {
    if (e.pointerId !== this.stick.id) return
    const max = this.joystickEl.clientWidth * 0.38
    let dx = e.clientX - this.stick.ox
    let dy = e.clientY - this.stick.oy
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    this.stick.x = dx / max
    this.stick.y = dy / max
    this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`
  }

  private stickEnd(e: PointerEvent) {
    if (e.pointerId !== this.stick.id) return
    this.stick.id = -1
    this.stick.x = this.stick.y = 0
    this.knobEl.style.transform = ''
  }

  consumeInteract(): boolean {
    const v = this.interactQueued
    this.interactQueued = false
    return v && this.enabled
  }

  update() {
    let x = 0
    let y = 0
    const k = this.keys
    this.turn = 0
    if (this.firstPerson) {
      if (k.has('ArrowLeft')) this.turn -= 1
      if (k.has('ArrowRight')) this.turn += 1
      if (k.has('KeyA')) x -= 1
      if (k.has('KeyD')) x += 1
    } else {
      if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
      if (k.has('KeyD') || k.has('ArrowRight')) x += 1
    }
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1
    this.run = k.has('ShiftLeft') || k.has('ShiftRight')

    if (this.stick.id !== -1) {
      x = this.stick.x
      y = this.stick.y
      this.run = Math.hypot(x, y) > 0.85
    }

    const pads = navigator.getGamepads?.() ?? []
    for (const pad of pads) {
      if (!pad) continue
      const ax = pad.axes[0] ?? 0
      const ay = pad.axes[1] ?? 0
      if (Math.hypot(ax, ay) > 0.2) {
        x = ax
        y = ay
        this.run = pad.buttons[1]?.pressed ?? false
      }
      const a = pad.buttons[0]?.pressed ?? false
      if (a && !this.padA) this.interactQueued = true
      this.padA = a
      break
    }

    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    if (!this.enabled) x = y = 0
    this.move.x = x
    this.move.y = y
    if ((x || y) && this.onFirstMove) {
      this.onFirstMove()
      this.onFirstMove = null
    }
  }

  dispose() {
    this.listeners.forEach((off) => off())
  }
}
