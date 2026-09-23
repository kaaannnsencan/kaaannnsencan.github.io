import * as THREE from 'three'
import config from '../content/config.json'
import { LAYER_SPRITES } from '../core/PixelRenderer'
import type { CollisionWorld, Body } from '../world/Collision'
import { snapPoint } from '../world/kit'
import { pixelTexture } from '../world/materials'
import { DIRS, FRAME_H, FRAME_W, paintCharacterSheet, type Dir } from './SpriteFactory'

export interface SheetSpec {
  frameWidth: number
  frameHeight: number
  frames: number
  rows: Record<Dir, number>
  /** texels per world unit; defaults to 16 */
  texelsPerUnit?: number
}

const DEFAULT_SPEC: SheetSpec = {
  frameWidth: FRAME_W,
  frameHeight: FRAME_H,
  frames: 4,
  rows: { down: 0, up: 1, left: 2, right: 3 },
}

/**
 * Uses /sprites/player.json + player.png when `customSprite` is on in config.json;
 * otherwise (or if loading fails) the procedural sheet.
 */
export async function loadPlayerSheet(): Promise<{ image: HTMLCanvasElement | HTMLImageElement; spec: SheetSpec }> {
  if (!config.customSprite) return { image: paintCharacterSheet(), spec: DEFAULT_SPEC }
  try {
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}sprites/player.json`, { cache: 'no-cache' })
    if (!res.ok) throw new Error('no custom sheet')
    const spec = { ...DEFAULT_SPEC, ...(await res.json()) } as SheetSpec
    const img = new Image()
    img.src = `${base}sprites/player.png`
    await img.decode()
    return { image: img, spec }
  } catch {
    return { image: paintCharacterSheet(), spec: DEFAULT_SPEC }
  }
}

export class Player {
  readonly group = new THREE.Group()
  readonly body: Body = { x: 0, z: 0, vx: 0, vz: 0, r: 0.35 }
  readonly position = new THREE.Vector3()
  dir: Dir = 'down'
  speed = 0
  onStep: ((running: boolean) => void) | null = null

  private sprite: THREE.Mesh
  private texture: THREE.Texture
  private shadow: THREE.Mesh
  private animTime = 0
  private frame = 0
  private lastStepFrame = -1
  private spec: SheetSpec
  private rowCount = 4
  private autoTarget: THREE.Vector2 | null = null
  private autoDone: (() => void) | null = null

  constructor(sheet: { image: HTMLCanvasElement | HTMLImageElement; spec: SheetSpec }, pitch: number, private world: CollisionWorld) {
    this.spec = sheet.spec
    const tex =
      sheet.image instanceof HTMLCanvasElement
        ? pixelTexture(sheet.image)
        : Object.assign(new THREE.Texture(sheet.image), { needsUpdate: true })
    tex.magFilter = tex.minFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.colorSpace = THREE.SRGBColorSpace
    this.rowCount = Math.max(...Object.values(this.spec.rows)) + 1
    tex.repeat.set(1 / this.spec.frames, 1 / this.rowCount)
    this.texture = tex

    const tpu = this.spec.texelsPerUnit ?? 16
    const w = this.spec.frameWidth / tpu
    // vertical plane, stretched so that after the camera's foreshortening it is exactly pixel-perfect
    const h = this.spec.frameHeight / tpu / Math.cos(pitch)
    const geo = new THREE.PlaneGeometry(w, h)
    geo.translate(0, h / 2 - 1 / tpu / Math.cos(pitch), 0)
    this.sprite = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide }),
    )
    this.sprite.layers.set(LAYER_SPRITES)
    this.sprite.renderOrder = 2

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 12),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.02
    this.shadow.scale.set(1, 0.55, 1)
    this.shadow.layers.set(LAYER_SPRITES)

    this.group.add(this.sprite, this.shadow)
    this.setFrame()
  }

  /** Rides along with a vehicle: follows the seat, faces the driving direction. */
  ride(seat: THREE.Vector3, forward: { x: number; z: number }, vx: number, vz: number) {
    this.body.x = seat.x
    this.body.z = seat.z
    this.body.vx = vx
    this.body.vz = vz
    this.speed = Math.hypot(vx, vz)
    this.dir = Math.abs(forward.x) > Math.abs(forward.z) ? (forward.x > 0 ? 'right' : 'left') : forward.z > 0 ? 'down' : 'up'
    this.frame = 0
    this.animTime = 0
    this.autoTarget = null
    this.shadow.visible = false
    this.setFrame()
    this.position.set(seat.x, 0, seat.z)
    this.group.position.set(seat.x, seat.y, seat.z)
    snapPoint(this.group.position)
  }

  teleport(x: number, z: number, dir: Dir = 'down') {
    this.shadow.visible = true
    this.body.x = x
    this.body.z = z
    this.body.vx = this.body.vz = 0
    this.dir = dir
    this.autoTarget = null
    this.sync()
  }

  /** Walks automatically to a point (used by fast travel); input cancels it. */
  walkTo(x: number, z: number, done?: () => void) {
    this.autoTarget = new THREE.Vector2(x, z)
    this.autoDone = done ?? null
  }

  get autoWalking() {
    return this.autoTarget !== null
  }

  update(dt: number, move: { x: number; y: number }, run: boolean) {
    let mx = move.x
    let mz = move.y
    if (mx || mz) this.autoTarget = null
    else if (this.autoTarget) {
      const dx = this.autoTarget.x - this.body.x
      const dz = this.autoTarget.y - this.body.z
      const d = Math.hypot(dx, dz)
      if (d < 0.3) {
        this.autoTarget = null
        const cb = this.autoDone
        this.autoDone = null
        cb?.()
      } else {
        mx = dx / d
        mz = dz / d
        run = d > 4
      }
    }

    const max = run ? 7.5 : 4.2
    const tx = mx * max
    const tz = mz * max
    const accel = mx || mz ? 18 : 22
    const k = 1 - Math.exp(-accel * dt)
    this.body.vx += (tx - this.body.vx) * k
    this.body.vz += (tz - this.body.vz) * k
    this.body.x += this.body.vx * dt
    this.body.z += this.body.vz * dt
    this.world.resolve(this.body)
    this.speed = Math.hypot(this.body.vx, this.body.vz)

    if (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01) {
      this.dir = Math.abs(mx) > Math.abs(mz) * 1.05 ? (mx > 0 ? 'right' : 'left') : mz > 0 ? 'down' : 'up'
    }

    if (this.speed > 0.4) {
      this.animTime += dt * (this.speed > 5.5 ? 12 : 8)
      this.frame = Math.floor(this.animTime) % 4
      if ((this.frame === 1 || this.frame === 3) && this.frame !== this.lastStepFrame) this.onStep?.(this.speed > 5.5)
      this.lastStepFrame = this.frame
    } else {
      this.animTime = 0
      this.frame = 0
      this.lastStepFrame = -1
    }
    this.setFrame()
    this.sync()
  }

  private setFrame() {
    const row = this.spec.rows[this.dir] ?? DIRS.indexOf(this.dir)
    this.texture.offset.set(this.frame / this.spec.frames, 1 - (row + 1) / this.rowCount)
  }

  private sync() {
    this.position.set(this.body.x, 0, this.body.z)
    this.group.position.copy(this.position)
    // draw the sprite on whole texels so its pixels never shear while walking
    snapPoint(this.group.position)
  }
}
