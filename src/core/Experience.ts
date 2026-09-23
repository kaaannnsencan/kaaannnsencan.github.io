import * as THREE from 'three'
import type { Sfx } from '../audio/Sfx'
import { i18n } from '../content/i18n'
import type { GithubSnapshot } from '../data/github'
import { Player, type SheetSpec } from '../player/Player'
import { UI } from '../ui/UI'
import type { Interactable } from '../world/Interactables'
import { TRAVEL, type TravelId } from '../world/layout'
import { World } from '../world/World'
import { faceCamera } from '../world/kit'
import { CameraRig } from './CameraRig'
import { Input } from './Input'
import { Loop } from './Loop'
import { PixelRenderer } from './PixelRenderer'

const TEXELS_PER_UNIT = 16

/** Phones/tablets and small-memory devices get cheaper settings from the start. */
function lowPower() {
  const coarse = matchMedia('(pointer: coarse)').matches
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return coarse || (mem !== undefined && mem <= 4) || (navigator.hardwareConcurrency ?? 8) <= 4
}

/** Wires renderer, world, player, input and UI together and runs the loop. */
export class Experience {
  readonly renderer: PixelRenderer
  readonly rig = new CameraRig()
  readonly world: World
  readonly player: Player
  readonly ui: UI
  readonly input: Input
  private loop: Loop
  private near: Interactable | null = null
  private panelSource: Interactable | null = null
  private focus = new THREE.Vector3()
  private tmp = new THREE.Vector3()
  private qualityBias = 0
  private slowTime = 0
  private mapTimer = 0
  private resizeRaf = 0
  private traveling = false
  private vehicle: import('../world/Atv').Atv | null = null
  // first-person camera
  private fp = false
  private fpCam = new THREE.PerspectiveCamera(72, 1, 0.05, 140)
  private yaw = 0 // 0 = looking north (−z)
  private look = -0.08
  private bob = 0
  private fpMove = { x: 0, y: 0 }
  private disposers: Array<() => void> = []
  onFatal: ((reason: string) => void) | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    github: GithubSnapshot,
    sheet: { image: HTMLCanvasElement | HTMLImageElement; spec: SheetSpec },
    private sfx: Sfx,
    showClassic: () => void,
  ) {
    this.renderer = new PixelRenderer(canvas)

    // world first: the UI queries it (day/night state) while localizing
    this.world = new World(github, {
      openPanel: (req) => this.ui.openPanel(req),
      sfx: (n) => sfx.play(n),
      arena: {
        hud: (text) => this.ui.setGameHud(text),
        finish: (ms, _best, record) => {
          sfx.play('goal')
          this.rig.addShake(0.4)
          const t = (ms / 1000).toFixed(1)
          this.ui.toast(i18n.lang === 'tr' ? `${record ? 'YENİ REKOR! ' : 'BİTTİ! '}${t} sn` : `${record ? 'NEW RECORD! ' : 'DONE! '}${t}s`)
        },
      },
    }, lowPower())
    if (lowPower()) this.renderer.shadowEvery = 2
    this.ui = new UI(github, {
      travel: (id) => this.travel(id),
      toggleFirstPerson: () => this.toggleFirstPerson(),
      toggleNight: () => {
        this.world.env.toggle()
        return this.world.env.target > 0.5
      },
      toggleSound: () => {
        sfx.setMuted(!sfx.muted)
        return !sfx.muted
      },
      isMuted: () => sfx.muted,
      isNight: () => this.world.env.target > 0.5,
      showClassic,
      sfx: (n) => sfx.play(n),
    })

    this.ui.syncButtons()

    this.player = new Player(sheet, this.rig.pitch, this.world.collision)
    this.world.scene.add(this.player.group)
    this.player.onStep = (running) => {
      if (running) this.world.particles.dust(this.player.body.x, this.player.body.z)
      sfx.play('step')
    }
    this.world.stadium.onKick = () => sfx.play('kick')
    this.world.stadium.onGoal = () => {
      sfx.play('goal')
      this.rig.addShake(0.6)
      this.ui.toast(i18n.lang === 'tr' ? 'GOOOL!' : 'GOAL!')
    }

    this.world.atvs.forEach((atv, i) =>
      this.world.interact.add({
        id: `atv-${i}`,
        position: atv.group.position,
        radius: 2,
        height: 1.8,
        label: () => i18n.t('ride'),
        action: () => this.mount(atv),
      }),
    )

    const spawn = TRAVEL[0]
    this.player.teleport(spawn.x, spawn.z, 'up')
    this.focus.copy(this.player.position)
    this.rig.jump(this.focus)

    this.input = new Input(document.getElementById('joystick')!, document.getElementById('knob')!, document.getElementById('btn-action')!)
    this.input.onFirstMove = () => this.ui.fadeHint()
    this.input.hotkey('KeyM', () => this.ui.toggleMap())
    this.input.hotkey('KeyV', () => this.toggleFirstPerson())
    this.input.hotkey('KeyN', () => {
      this.world.env.toggle()
      this.ui.syncButtons()
    })
    this.input.hotkey('Escape', () => {
      if (this.ui.mapOpen) this.ui.toggleMap(false)
      else this.ui.closePanel()
    })

    this.loop = new Loop(
      (dt) => this.fixedUpdate(dt),
      (dt) => this.frame(dt),
    )

    this.bind()
    this.resize()
  }

  private bind() {
    const on = <K extends keyof WindowEventMap>(t: Window | Document | HTMLElement, type: K | string, fn: EventListener) => {
      t.addEventListener(type, fn)
      this.disposers.push(() => t.removeEventListener(type, fn))
    }
    on(window, 'resize', () => {
      cancelAnimationFrame(this.resizeRaf)
      this.resizeRaf = requestAnimationFrame(() => this.resize())
    })
    on(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.loop.stop()
        this.sfx.suspend()
      } else if (!this.stopped) {
        this.loop.start()
        this.sfx.resume()
      }
    })
    let lostTimer = 0
    on(this.canvas, 'webglcontextlost', ((e: Event) => {
      e.preventDefault()
      this.loop.stop()
      this.ui.toast(i18n.t('contextLost'))
      lostTimer = window.setTimeout(() => this.onFatal?.('context-lost'), 4000)
    }) as EventListener)
    // mouse look (first person): click the world to capture the mouse
    on(this.canvas, 'click', () => {
      if (this.fp && !document.pointerLockElement) this.lockPointer()
    })
    on(document, 'pointerlockchange', () => this.ui.setFirstPerson(this.fp, !!document.pointerLockElement))
    on(document, 'mousemove', ((e: MouseEvent) => {
      if (!this.fp || document.pointerLockElement !== this.canvas) return
      this.yaw -= e.movementX * 0.0024
      this.look = THREE.MathUtils.clamp(this.look - e.movementY * 0.0024, -1.25, 1.1)
    }) as EventListener)
    on(this.canvas, 'webglcontextrestored', () => {
      clearTimeout(lostTimer)
      location.reload()
    })
  }

  private stopped = true

  get firstPerson() {
    return this.fp
  }

  /** Switches between the top-down pixel view and the character's own eyes. */
  toggleFirstPerson(on = !this.fp) {
    if (on === this.fp) return
    this.fp = on
    this.input.firstPerson = on
    this.player.group.visible = !on
    this.world.env.setFirstPerson(on)
    if (on) {
      // start looking the way the character faces
      const d = this.player.dir
      this.yaw = d === 'up' ? 0 : d === 'down' ? Math.PI : d === 'left' ? Math.PI / 2 : -Math.PI / 2
      this.look = -0.08
      this.lockPointer()
    } else {
      faceCamera(null)
      if (document.pointerLockElement) document.exitPointerLock()
    }
    this.ui.setFirstPerson(on, !!document.pointerLockElement)
    this.sfx.play('select')
    this.resize()
  }

  private lockPointer() {
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined
      p?.catch?.(() => {})
    } catch {
      /* pointer lock unavailable (iframes, some browsers): arrows still turn */
    }
  }

  start() {
    this.stopped = false
    this.loop.start()
    this.canvas.focus({ preventScroll: true })
  }

  stop() {
    this.stopped = true
    this.loop.stop()
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    // How much of the world fits on screen: portrait phones are sized by width
    // (≈18 units across), everything else by height (≈19 units on small screens,
    // 22 on desktops). Computed in device pixels so dense phone screens aren't
    // stuck zoomed in. Slow devices get bigger texels (fewer pixels to shade).
    const units = h > w ? 18 : h < 600 || w < 900 ? 19 : 22
    const base = ((h > w ? w : h) * dpr) / (TEXELS_PER_UNIT * units)
    const px = Math.max(2, Math.round(base))
    this.renderer.resize(w, h, px + Math.round(this.qualityBias * Math.max(1, px / 3)), dpr)
    this.rig.resize(this.renderer.width, this.renderer.height, TEXELS_PER_UNIT)
    this.fpCam.aspect = this.renderer.width / this.renderer.height
    this.fpCam.updateProjectionMatrix()
  }

  private mount(atv: import('../world/Atv').Atv) {
    if (this.vehicle) return
    this.vehicle = atv
    this.panelSource = null
    this.ui.closePanel()
    atv.mount()
    this.sfx.play('engine-start')
    this.ui.toast(i18n.t('rideHint'))
  }

  private dismount() {
    const atv = this.vehicle
    if (!atv) return
    this.vehicle = null
    atv.dismount()
    this.sfx.engine(null)
    const exit = atv.exitPoint()
    this.player.teleport(exit.x, exit.z, this.player.dir)
    this.world.collision.resolve(this.player.body)
  }

  travel(id: TravelId) {
    const dest = TRAVEL.find((t) => t.id === id)
    if (!dest || this.traveling) return
    this.traveling = true
    this.panelSource = null
    this.sfx.play('travel')
    const wipe = document.getElementById('wipe')!
    wipe.classList.add('on')
    setTimeout(() => {
      if (this.vehicle) {
        // drive the ATV along to the destination, facing north
        this.vehicle.place(dest.x, dest.z)
        this.vehicle.heading = Math.PI
      }
      this.player.teleport(dest.x, dest.z, 'up')
      this.focus.copy(this.player.position)
      this.rig.jump(this.focus)
      wipe.classList.remove('on')
      this.traveling = false
    }, 280)
  }

  private fixedUpdate(dt: number) {
    const blocked = this.ui.mapOpen || this.traveling
    this.input.enabled = !blocked
    this.input.update()
    const p = this.player
    const atv = this.vehicle

    // first person: input is relative to where you look, arrows turn
    let move: { x: number; y: number } = this.input.move
    if (this.fp) {
      this.yaw -= this.input.turn * 2.4 * dt
      const c = Math.cos(this.yaw)
      const s = Math.sin(this.yaw)
      const mx = this.input.move.x
      const my = this.input.move.y
      this.fpMove.x = c * mx + s * my
      this.fpMove.y = -s * mx + c * my
      move = this.fpMove
    }

    if (atv) {
      atv.update(dt, move, this.input.run)
      p.ride(atv.seat, atv.forward, atv.body.vx, atv.body.vz)
      this.world.update(dt, this.loop.elapsed, { x: atv.body.x, z: atv.body.z, speed: Math.abs(atv.speed), body: atv.body, riding: true }, this.fp)
      this.sfx.engine(atv.speed)
      this.near = null
      if (this.input.consumeInteract()) this.dismount()
      return
    }

    this.player.update(dt, move, this.input.run)
    this.world.update(dt, this.loop.elapsed, { x: p.body.x, z: p.body.z, speed: p.speed, body: p.body }, this.fp)

    // interaction
    this.near = this.world.interact.nearest(p.body.x, p.body.z)
    if (this.input.consumeInteract()) {
      if (this.near) {
        this.panelSource = this.near
        this.near.action()
      } else if (this.ui.panelOpen) this.ui.closePanel()
    }
    // walking away from what you opened closes it
    if (this.ui.panelOpen && this.panelSource) {
      const s = this.panelSource
      if (Math.hypot(s.position.x - p.body.x, s.position.z - p.body.z) > s.radius + 2.5) {
        this.ui.closePanel()
        this.panelSource = null
      }
    }
  }

  private frame(dt: number) {
    const p = this.player
    this.world.env.update(dt, p.position)

    let camera: THREE.Camera = this.rig.camera
    if (this.fp) {
      // eye height with a little head bob while walking
      const speed = this.vehicle ? 0 : p.speed
      if (speed > 0.5) this.bob += dt * speed * 2.2
      const bobY = Math.sin(this.bob) * 0.045 * Math.min(1, speed / 4)
      if (this.vehicle) this.fpCam.position.set(this.vehicle.seat.x, 1.75, this.vehicle.seat.z)
      else this.fpCam.position.set(p.body.x, 1.45 + bobY, p.body.z)
      this.fpCam.rotation.set(this.look, this.yaw, 0, 'YXZ')
      this.fpCam.updateMatrixWorld()
      faceCamera(this.fpCam)
      this.renderer.setSubPixel(0, 0)
      camera = this.fpCam
    } else {
      // camera leads the movement slightly
      this.tmp.set(p.position.x + p.body.vx * 0.18, 0.8, p.position.z + p.body.vz * 0.18)
      this.rig.update(this.tmp, dt)
      this.renderer.setSubPixel(this.rig.subPixel.x, this.rig.subPixel.y)
    }
    this.renderer.render(this.world.scene, camera)

    // prompt bubble above the nearest interactable
    if (this.near && !this.ui.mapOpen && !(this.ui.panelOpen && this.panelSource === this.near)) {
      this.tmp.copy(this.near.position)
      this.tmp.y += this.near.height ?? 2
      this.tmp.project(camera)
      // project onto the canvas' real CSS size (it can overhang the viewport by a few px)
      const cw = this.renderer.cssWidth
      const ch = this.renderer.cssHeight
      // behind the first-person camera: pin the bubble to the bottom centre instead
      const onScreen = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.1 && Math.abs(this.tmp.y) < 1.1
      const pos = onScreen ? { x: (this.tmp.x * 0.5 + 0.5) * cw, y: (-this.tmp.y * 0.5 + 0.5) * ch } : { x: cw / 2, y: ch - 90 }
      this.ui.setPrompt(pos, this.near.label())
    } else this.ui.setPrompt(null, this.vehicle ? i18n.t('dismount') : undefined)

    this.mapTimer += dt
    if (this.mapTimer > 0.1) {
      this.mapTimer = 0
      this.ui.drawMaps(p.body.x, p.body.z, this.loop.elapsed)
    }

    this.adaptQuality(dt)
  }

  /** If the device can't keep up, render at a lower internal resolution. */
  private adaptQuality(dt: number) {
    if (this.loop.fps < 40 && this.qualityBias < 2) {
      this.slowTime += dt
      if (this.slowTime > 3) {
        this.qualityBias++
        this.slowTime = 0
        this.renderer.renderer.shadowMap.enabled = this.qualityBias < 2
        this.resize()
      }
    } else this.slowTime = Math.max(0, this.slowTime - dt)
  }

  /** Dev helper: advance the simulation and render one frame synchronously (works in hidden tabs). */
  debugStep(seconds = 1 / 60) {
    for (let t = 0; t < seconds; t += 1 / 60) {
      this.fixedUpdate(1 / 60)
      this.loop.elapsed += 1 / 60
    }
    this.frame(1 / 60)
  }

  dispose() {
    this.stop()
    this.input.dispose()
    this.disposers.forEach((d) => d())
    this.renderer.dispose()
  }
}
