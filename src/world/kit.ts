import * as THREE from 'three'
import { LAYER_SPRITES } from '../core/PixelRenderer'
import { i18n } from '../content/i18n'
import type { L } from '../content/profile'
import type { CollisionWorld } from './Collision'
import type { Interactables } from './Interactables'
import type { Particles } from './Particles'
import { canvas2d, pixelTexture, toon } from './materials'
import { P } from './palette'
import { drawText, GLYPH_HEIGHT, LINE_HEIGHT, measure } from './PixelFont'

// Shared building blocks for the zones: labels, signs, houses, fading occluders.

export const PITCH = THREE.MathUtils.degToRad(40)

/**
 * Every camera-facing quad (labels, signs). In the top-down view they keep the
 * fixed −PITCH tilt; the first-person camera turns them towards itself.
 */
export const billboards: THREE.Object3D[] = []

const FP_SIGN_SCALE = 0.5

export function faceCamera(camera: THREE.Camera | null) {
  for (const b of billboards) {
    // signs are sized for the top-down view; at eye level half size reads better
    const base = (b.userData.baseScale as THREE.Vector3 | undefined) ?? (b.userData.baseScale = b.scale.clone())
    if (camera) {
      b.quaternion.copy(camera.quaternion)
      b.scale.copy(base).multiplyScalar(FP_SIGN_SCALE)
    } else {
      b.rotation.set(-PITCH, 0, 0)
      b.scale.copy(base)
    }
  }
}
const TPU = 16
const UP_Y = Math.cos(PITCH)
const UP_Z = -Math.sin(PITCH)
const ZERO = new THREE.Vector3()

/**
 * Nudges a camera-facing quad (whose position is its centre) so its edges sit
 * exactly on the world texel grid. Without this, nearest sampling can drop or
 * double a column and pixel text gets corrupted ("A" turning into "F").
 * Assumes the parent only translates; `origin` is that translation.
 */
export function snapQuad(obj: THREE.Object3D, widthTexels: number, heightTexels: number, origin: THREE.Vector3 = ZERO) {
  const left = origin.x + obj.position.x - widthTexels / (2 * TPU)
  obj.position.x += Math.round(left * TPU) / TPU - left
  const u = (origin.y + obj.position.y) * UP_Y + (origin.z + obj.position.z) * UP_Z
  const bottom = u - heightTexels / (2 * TPU)
  const delta = Math.round(bottom * TPU) / TPU - bottom
  // shift along z only: keeps the quad's height above ground
  obj.position.z += delta / UP_Z
}

/** Same idea for a point whose screen projection must land on a texel corner. */
export function snapPoint(p: THREE.Vector3) {
  p.x = Math.round(p.x * TPU) / TPU
  const u = p.y * UP_Y + p.z * UP_Z
  p.z += (Math.round(u * TPU) / TPU - u) / UP_Z
}

export interface PanelRequest {
  kind: string
  id?: string
  payload?: unknown
}

export interface WorldContext {
  scene: THREE.Scene
  collision: CollisionWorld
  interact: Interactables
  occluders: Occluders
  animators: Array<(t: number, dt: number) => void>
  particles: Particles
  nightMaterials: NightMaterial[]
  openPanel: (req: PanelRequest) => void
  sfx: (name: string) => void
  /** Keeps props (trees, rocks…) out of the given rectangle. */
  reserve: (x: number, z: number, w: number, d: number) => void
  /** Paints a ground decal (plaza, field, dirt lot) into the terrain texture. */
  decal: (d: GroundDecal) => void
}

export interface GroundDecal {
  x: number
  z: number
  w: number
  d: number
  color: string
  edge?: string
  round?: boolean
  /** 'tiles' draws a paving pattern, 'stripes' a mowed-lawn pattern */
  pattern?: 'tiles' | 'stripes' | 'plain'
  /** Custom painter (x0/y0 = top-left texel, w/h in texels); replaces the fill. */
  paint?: (ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) => void
}

export interface NightMaterial {
  material: THREE.MeshToonMaterial | THREE.MeshBasicMaterial
  day: number
  night: number
}

/** Adds shadow flags and puts a mesh on the world layer. */
export function solid<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast
      c.receiveShadow = receive
    }
  })
  return o
}

export function box(w: number, h: number, d: number, color: string | THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? toon(color) : color)
  m.position.set(x, y + h / 2, z)
  return solid(m)
}

// ---------------------------------------------------------------- labels

export interface LabelOptions {
  color?: string
  background?: string | null
  border?: string | null
  scale?: number
  padding?: number
  maxWidth?: number
}

/** Draws pixel text into a canvas and returns it with its logical size. */
export function renderLabel(lines: string[], o: LabelOptions = {}) {
  const scale = o.scale ?? 1
  const pad = o.padding ?? 3
  const w = Math.max(1, ...lines.map((l) => measure(l))) * scale + pad * 2
  const h = (lines.length * LINE_HEIGHT - (LINE_HEIGHT - GLYPH_HEIGHT)) * scale + pad * 2 + 2
  const { canvas, ctx } = canvas2d(w + 2, h + 2)
  if (o.background !== null) {
    ctx.fillStyle = o.border ?? P.ink
    ctx.fillRect(1, 0, w, h + 2)
    ctx.fillRect(0, 1, w + 2, h)
    ctx.fillStyle = o.background ?? P.white
    ctx.fillRect(1, 1, w, h)
  }
  ctx.fillStyle = o.color ?? P.ink
  lines.forEach((line, i) => drawText(ctx, line, 1 + pad, 1 + pad + i * LINE_HEIGHT * scale, scale))
  return canvas
}

/**
 * Camera-facing text label. Re-renders itself when the language changes.
 * Pixel-perfect: 1 canvas pixel = 1 low-res texel.
 */
export class Label {
  readonly mesh: THREE.Mesh
  private material: THREE.MeshBasicMaterial
  private base = new THREE.Vector3()

  constructor(private text: () => string | string[], private opts: LabelOptions = {}) {
    this.material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, depthWrite: false })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material)
    this.mesh.rotation.x = -PITCH
    this.mesh.layers.set(LAYER_SPRITES)
    this.mesh.renderOrder = 3
    billboards.push(this.mesh)
    this.refresh()
    i18n.onChange(() => this.refresh())
  }

  refresh() {
    const t = this.text()
    const canvas = renderLabel(Array.isArray(t) ? t : [t], this.opts)
    this.material.map?.dispose()
    this.material.map = pixelTexture(canvas)
    this.material.needsUpdate = true
    this.mesh.scale.set(canvas.width / TPU, canvas.height / TPU, 1)
    this.mesh.userData.baseScale = this.mesh.scale.clone()
    this.mesh.position.copy(this.base)
    snapQuad(this.mesh, canvas.width, canvas.height)
  }

  at(x: number, y: number, z: number) {
    this.base.set(x, y, z)
    this.mesh.position.copy(this.base)
    const map = this.material.map?.image as HTMLCanvasElement | undefined
    if (map) snapQuad(this.mesh, map.width, map.height)
    return this
  }
}

export function label(ctx: WorldContext, text: L | string | (() => string | string[]), x: number, y: number, z: number, opts?: LabelOptions) {
  const getter = typeof text === 'function' ? text : typeof text === 'string' ? () => text : () => i18n.pick(text)
  const l = new Label(getter, opts).at(x, y, z)
  ctx.scene.add(l.mesh)
  return l
}

// ---------------------------------------------------------------- signs

/** Wooden signpost with a pixel label; interacting opens a panel. */
export function signpost(ctx: WorldContext, x: number, z: number, text: L | string, onUse?: () => void, color: string = P.wood) {
  const g = new THREE.Group()
  g.add(box(0.18, 1.1, 0.18, P.woodDark, 0, 0, 0))
  g.add(box(1.6, 0.7, 0.14, color, 0, 0.9, 0))
  g.position.set(x, 0, z)
  ctx.scene.add(g)
  ctx.collision.addCircle(x, z, 0.3)
  label(ctx, text, x, 2.3, z + 0.2, { background: P.white })
  if (onUse)
    ctx.interact.add({
      id: `sign-${x}-${z}`,
      position: new THREE.Vector3(x, 0, z + 0.8),
      radius: 1.8,
      height: 2.8,
      label: () => i18n.t('interact'),
      action: onUse,
    })
  return g
}

// ---------------------------------------------------------------- occluders

interface Occluder {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
  materials: THREE.Material[]
  fade: number
}

/**
 * Buildings between the camera and the player dissolve (dithered alpha-hash)
 * so the character is never hidden.
 */
export class Occluders {
  private list: Occluder[] = []

  constructor(private night: NightMaterial[]) {}

  add(object: THREE.Object3D, minX: number, maxX: number, minZ: number, maxZ: number, height: number) {
    object.userData.batchRoot = true
    const materials: THREE.Material[] = []
    object.traverse((c) => {
      const m = (c as THREE.Mesh).material
      if (!m) return
      const arr = Array.isArray(m) ? m : [m]
      arr.forEach((mat, i) => {
        // clone so fading one building doesn't fade every building sharing the material
        const own = mat.clone()
        own.alphaHash = true
        materials.push(own)
        // keep day/night control over cloned emissive materials
        for (const n of this.night.filter((n) => n.material === mat)) this.night.push({ ...n, material: own as NightMaterial['material'] })
        if (Array.isArray(m)) m[i] = own
        else (c as THREE.Mesh).material = own
      })
    })
    this.list.push({ minX, maxX, minZ, maxZ, height, materials, fade: 1 })
  }

  update(px: number, pz: number, dt: number, disabled = false) {
    const reach = 1 / Math.tan(PITCH)
    for (const o of this.list) {
      if (disabled) {
        if (o.fade !== 1) {
          o.fade = 1
          for (const m of o.materials) m.opacity = 1
        }
        continue
      }
      const behind =
        px > o.minX - 0.6 && px < o.maxX + 0.6 && pz < o.minZ + 0.2 && pz > o.minZ - o.height * reach - 0.5
      const inside = px > o.minX && px < o.maxX && pz > o.minZ && pz < o.maxZ
      const target = behind || inside ? 0.3 : 1
      o.fade += (target - o.fade) * (1 - Math.exp(-dt * 10))
      for (const m of o.materials) m.opacity = o.fade
    }
  }
}

// ---------------------------------------------------------------- buildings

export function gableRoof(w: number, d: number, h: number, color: string, overhang = 0.35) {
  const shape = new THREE.Shape()
  const hw = w / 2 + overhang
  shape.moveTo(-hw, 0)
  shape.lineTo(hw, 0)
  shape.lineTo(0, h)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d + overhang * 2, bevelEnabled: false })
  geo.translate(0, 0, -(d + overhang * 2) / 2)
  return solid(new THREE.Mesh(geo, toon(color)))
}

export interface HouseOptions {
  w: number
  d: number
  h: number
  wall?: string
  roof?: string
  roofH?: number
  door?: string
  windows?: number
}

/** A simple house facing +z (towards the camera). Returns the group and the door position. */
export function house(ctx: WorldContext, x: number, z: number, o: HouseOptions, windowMat: THREE.Material) {
  const g = new THREE.Group()
  g.add(box(o.w, o.h, o.d, o.wall ?? P.wall))
  // base trim
  g.add(box(o.w + 0.1, 0.25, o.d + 0.1, P.stoneDark))
  const roof = gableRoof(o.w, o.d, o.roofH ?? o.w * 0.35, o.roof ?? P.roofRed)
  roof.position.y = o.h
  g.add(roof)
  // door
  g.add(box(1.1, 1.8, 0.12, o.door ?? P.woodDark, 0, 0, o.d / 2 + 0.03))
  // windows
  const n = o.windows ?? 2
  for (let i = 0; i < n; i++) {
    const wx = (i % 2 === 0 ? -1 : 1) * (o.w / 4 + 0.3) * (1 + Math.floor(i / 2) * 0.9)
    if (Math.abs(wx) > o.w / 2 - 0.5) continue
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), windowMat)
    win.position.set(wx, o.h * 0.55, o.d / 2 + 0.03)
    g.add(win)
    g.add(box(1.1, 0.12, 0.2, P.woodDark, wx, o.h * 0.55 - 0.55, o.d / 2 + 0.05))
  }
  g.position.set(x, 0, z)
  ctx.scene.add(g)
  ctx.collision.addBox(x, z, o.w, o.d)
  ctx.reserve(x, z + 1, o.w + 3, o.d + 4)
  ctx.occluders.add(g, x - o.w / 2, x + o.w / 2, z - o.d / 2, z + o.d / 2, o.h + (o.roofH ?? o.w * 0.35))
  return { group: g, door: new THREE.Vector3(x, 0, z + o.d / 2 + 0.9) }
}

// ---------------------------------------------------------------- glow

/** Toon material whose emissive glow is driven by the day/night cycle. */
export function glowMaterial(ctx: WorldContext, base: string, glow: string, day = 0, night = 1.4) {
  const m = toon(base, { emissive: glow, emissiveIntensity: day })
  if (!ctx.nightMaterials.some((n) => n.material === m)) ctx.nightMaterials.push({ material: m, day, night })
  return m
}

export function windowMaterial(ctx: WorldContext) {
  return glowMaterial(ctx, '#34466b', '#ffcf6b', 0, 1.6)
}

export function lampPost(ctx: WorldContext, x: number, z: number) {
  const g = new THREE.Group()
  g.add(box(0.16, 2.4, 0.16, P.ink))
  g.add(box(0.5, 0.12, 0.5, P.ink, 0, 2.4))
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), glowMaterial(ctx, '#fff1c1', '#ffd98a', 0.15, 2.2))
  bulb.position.y = 2.28
  g.add(bulb)
  g.position.set(x, 0, z)
  ctx.scene.add(solid(g))
  ctx.collision.addCircle(x, z, 0.2)
  ctx.reserve(x, z, 1, 1)
  return g
}

export function bench(ctx: WorldContext, x: number, z: number) {
  const g = new THREE.Group()
  g.add(box(1.8, 0.12, 0.6, P.wood, 0, 0.45))
  g.add(box(1.8, 0.5, 0.1, P.wood, 0, 0.6, -0.28))
  g.add(box(0.12, 0.45, 0.5, P.ink, -0.75, 0))
  g.add(box(0.12, 0.45, 0.5, P.ink, 0.75, 0))
  g.position.set(x, 0, z)
  ctx.scene.add(g)
  ctx.collision.addBox(x, z, 1.8, 0.6)
  ctx.reserve(x, z, 2.5, 1.5)
  return g
}
