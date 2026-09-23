import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import type { Body, CollisionWorld } from '../Collision'
import { box, glowMaterial, Label, lampPost, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { toon } from '../materials'
import { P } from '../palette'
import type { Particles } from '../Particles'

// Arena interior (world units), centred on ZONES.arena.
export const ARENA_W = 22
export const ARENA_D = 40
const GATE_HALF = 2.6
const BEST_KEY = 'arena-best-ms'

// Coin trail: a serpentine through the whole arena. Offsets from the centre.
const COINS: Array<[number, number]> = [
  [-7, -14], [-2, -17], [4, -16], [6.5, -11], [5, -5], [-1, -3],
  [-6, 3], [-6, 10], [-1, 15], [4.5, 16.5], [6.5, 11], [3, 5.5],
]
// Pushable cones: a slalom down the middle plus a few strays.
const CONES: Array<[number, number]> = [
  [0, -11], [0, -8.5], [0, -6], [0, 8.5], [0, 11], [0, 13.5],
  [-8, -8], [-8, 7], [8, 0], [6.5, -1], [9.5, 1], [-3, -12], [3, 12],
]
const HAY: Array<[number, number, number]> = [
  [-4, 8, 0.3], [4, -10, -0.2], [8, 15, 0.5], [-8, -17, 0],
]

interface Cone {
  body: Body
  mesh: THREE.Group
  home: [number, number]
  fallen: boolean
}

export interface ArenaHooks {
  sfx: (name: string) => void
  hud: (text: string | null) => void
  finish: (ms: number, best: number, record: boolean) => void
}

const fmt = (ms: number) => {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(1).padStart(4, '0')}`
}

/**
 * ATV time-trial: drive through the start gate, collect every coin as fast as
 * you can. Cones get knocked over, hay bales don't move. Best time is kept in
 * localStorage and shown on the board above the gate.
 */
export class Arena {
  private coins: Array<{ mesh: THREE.Mesh; x: number; z: number; taken: boolean }> = []
  private cones: Cone[] = []
  private running = false
  private startedAt = 0
  private collected = 0
  private offFor = 0
  private lastX = 0
  private best: number
  private board: Label
  private resetAt = 0

  constructor(ctx: WorldContext, private collision: CollisionWorld, private particles: Particles, private hooks: ArenaHooks) {
    const { x, z } = ZONES.arena
    this.best = readBest()

    // ground: packed dirt with tyre tracks
    ctx.decal({ x, z, w: ARENA_W + 3, d: ARENA_D + 3, color: '#b98d5c', edge: '#8a6440', pattern: 'stripes' })
    ctx.decal({ x: x - ARENA_W / 2 - 2, z, w: 4, d: GATE_HALF * 2 + 1, color: '#b98d5c', edge: '#8a6440' })

    // tyre-stack walls with a gap on the west side for the start gate
    const tyres: THREE.Vector3[] = []
    const step = 1.1
    const x0 = x - ARENA_W / 2
    const x1 = x + ARENA_W / 2
    const z0 = z - ARENA_D / 2
    const z1 = z + ARENA_D / 2
    for (let t = x0; t <= x1 + 0.01; t += step) tyres.push(new THREE.Vector3(t, 0, z0), new THREE.Vector3(t, 0, z1))
    for (let t = z0 + step; t < z1 - 0.01; t += step) {
      tyres.push(new THREE.Vector3(x1, 0, t))
      if (Math.abs(t - z) > GATE_HALF) tyres.push(new THREE.Vector3(x0, 0, t))
    }
    const tyreGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.32, 10)
    const tyreMesh = new THREE.InstancedMesh(tyreGeo, toon('#2a2530'), tyres.length * 2)
    const m = new THREE.Matrix4()
    tyres.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        m.makeTranslation(p.x, 0.16 + k * 0.33, p.z)
        tyreMesh.setMatrixAt(i * 2 + k, m)
      }
    })
    tyreMesh.castShadow = tyreMesh.receiveShadow = true
    ctx.scene.add(tyreMesh)
    const t = 0.9
    collision.addBox(x, z0, ARENA_W + t, t)
    collision.addBox(x, z1, ARENA_W + t, t)
    collision.addBox(x1, z, t, ARENA_D + t)
    const sideLen = ARENA_D / 2 - GATE_HALF
    collision.addBox(x0, z0 + sideLen / 2, t, sideLen)
    collision.addBox(x0, z1 - sideLen / 2, t, sideLen)
    ctx.reserve(x, z, ARENA_W + 6, ARENA_D + 6)

    // start gate
    const gate = new THREE.Group()
    for (const s of [-1, 1]) {
      gate.add(box(0.6, 3.4, 0.6, P.ink, 0, 0, s * (GATE_HALF + 0.4)))
      gate.add(box(0.7, 0.3, 0.7, P.gold, 0, 3.4, s * (GATE_HALF + 0.4)))
    }
    const checker = glowMaterial(ctx, '#f6f4f1', '#fff1b8', 0.1, 1.2)
    for (let i = 0; i < 8; i++) gate.add(box(0.3, 0.45, (GATE_HALF * 2 + 0.8) / 8, i % 2 ? P.ink : checker, 0, 3.0, -GATE_HALF - 0.4 + ((i + 0.5) * (GATE_HALF * 2 + 0.8)) / 8))
    gate.position.set(x0, 0, z)
    ctx.scene.add(solid(gate))
    collision.addCircle(x0, z - GATE_HALF - 0.4, 0.4)
    collision.addCircle(x0, z + GATE_HALF + 0.4, 0.4)

    const title = new Label(() => (i18n.lang === 'tr' ? 'ATV PARKURU' : 'ATV ARENA'), { background: P.ink, color: P.gold, border: P.gold, scale: 2 })
    title.at(x0 - 0.2, 5.2, z)
    ctx.scene.add(title.mesh)
    this.board = new Label(() => this.boardText(), { background: P.white, border: P.ink })
    this.board.at(x0 - 0.2, 3.9, z + 0.2)
    ctx.scene.add(this.board.mesh)

    // hay bales (static)
    for (const [hx, hz, r] of HAY) {
      const bale = box(1.8, 1, 1.1, '#e3c066', x + hx, 0, z + hz)
      bale.rotation.y = r
      bale.add(box(1.82, 0.12, 1.12, '#b8943c', 0, 0.3 - 0.5, 0))
      ctx.scene.add(bale)
      ctx.collision.addCircle(x + hx, z + hz, 0.8)
    }

    // coins
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12)
    coinGeo.rotateX(Math.PI / 2)
    const coinMat = glowMaterial(ctx, P.gold, '#ffe07a', 0.35, 1.4)
    for (const [cx, cz] of COINS) {
      const mesh = new THREE.Mesh(coinGeo, coinMat)
      mesh.position.set(x + cx, 0.9, z + cz)
      mesh.castShadow = true
      mesh.userData.dynamic = true
      ctx.scene.add(mesh)
      this.coins.push({ mesh, x: x + cx, z: z + cz, taken: false })
    }

    // cones
    for (const [cx, cz] of CONES) {
      const g = new THREE.Group()
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 8), toon(P.coral))
      cone.position.y = 0.42
      g.add(cone, box(0.5, 0.06, 0.5, P.coral), box(0.3, 0.1, 0.3, P.white, 0, 0.35))
      g.position.set(x + cx, 0, z + cz)
      g.userData.dynamic = true
      ctx.scene.add(solid(g))
      this.cones.push({ body: { x: x + cx, z: z + cz, vx: 0, vz: 0, r: 0.32 }, mesh: g, home: [x + cx, z + cz], fallen: false })
    }

    lampPost(ctx, x0 - 2, z - 4.5)
    lampPost(ctx, x0 - 2, z + 4.5)
  }

  private boardText() {
    const tr = i18n.lang === 'tr'
    return this.best ? `${tr ? 'EN İYİ' : 'BEST'}: ${fmt(this.best)}` : tr ? 'KAPIDAN GEÇ, PARALARI TOPLA' : 'DRIVE THROUGH, GRAB THE COINS'
  }

  private start(elapsed: number) {
    this.running = true
    this.startedAt = elapsed
    this.collected = 0
    this.offFor = 0
    for (const c of this.coins) {
      c.taken = false
      c.mesh.visible = true
    }
    for (const c of this.cones) {
      Object.assign(c.body, { x: c.home[0], z: c.home[1], vx: 0, vz: 0 })
      c.fallen = false
      c.mesh.rotation.set(0, 0, 0)
      c.mesh.position.set(c.home[0], 0, c.home[1])
    }
    this.hooks.sfx('engine-start')
  }

  private stop() {
    this.running = false
    this.hooks.hud(null)
  }

  update(dt: number, elapsed: number, body: Body, riding: boolean) {
    const { x, z } = ZONES.arena
    const x0 = x - ARENA_W / 2

    // start: crossing the gate line eastwards on the ATV
    if (riding && !this.running && this.lastX < x0 && body.x >= x0 && Math.abs(body.z - z) < GATE_HALF + 0.5) this.start(elapsed)
    this.lastX = body.x

    // coins spin; collect while a run is going
    for (const c of this.coins) {
      if (!c.mesh.visible) continue
      c.mesh.rotation.y = elapsed * 3 + c.x
      c.mesh.position.y = 0.9 + Math.sin(elapsed * 3 + c.z) * 0.12
      if (this.running && !c.taken && riding && Math.hypot(c.x - body.x, c.z - body.z) < body.r + 0.6) {
        c.taken = true
        c.mesh.visible = false
        this.collected++
        this.particles.confetti(c.x, 1, c.z, [P.gold, '#fff1b8', P.white], 14)
        this.hooks.sfx('coin')
      }
    }

    // cones: pushed like the football, fall over when hit hard
    for (const c of this.cones) {
      const b = c.body
      const dx = b.x - body.x
      const dz = b.z - body.z
      const d = Math.hypot(dx, dz)
      const min = b.r + body.r
      if (d < min && d > 1e-4) {
        const nx = dx / d
        const nz = dz / d
        b.x = body.x + nx * min
        b.z = body.z + nz * min
        const hit = Math.max(0, body.vx * nx + body.vz * nz)
        b.vx += nx * (hit * 1.3 + 0.8)
        b.vz += nz * (hit * 1.3 + 0.8)
        if (hit > 3 && !c.fallen) {
          c.fallen = true
          // tip over away from the impact
          c.mesh.rotation.set((nz * Math.PI) / 2, 0, (-nx * Math.PI) / 2)
          this.hooks.sfx('kick')
        }
      }
      if (Math.abs(b.vx) + Math.abs(b.vz) < 0.01) continue // resting cones cost nothing
      const f = Math.exp(-2.5 * dt)
      b.vx *= f
      b.vz *= f
      b.x += b.vx * dt
      b.z += b.vz * dt
      this.collision.resolve(b, 0.3)
      c.mesh.position.set(b.x, c.fallen ? 0.3 : 0, b.z)
    }

    if (this.resetAt && elapsed > this.resetAt) {
      this.resetAt = 0
      for (const c of this.coins) c.mesh.visible = true
    }

    if (!this.running) return
    const ms = (elapsed - this.startedAt) * 1000
    const tr = i18n.lang === 'tr'
    this.hooks.hud(`${tr ? 'PARA' : 'COINS'} ${this.collected}/${this.coins.length} · ${fmt(ms)}${this.best ? ` · ${tr ? 'EN İYİ' : 'BEST'} ${fmt(this.best)}` : ''}`)

    if (this.collected === this.coins.length) {
      const record = !this.best || ms < this.best
      if (record) {
        this.best = ms
        writeBest(ms)
        this.board.refresh()
      }
      this.stop()
      this.resetAt = elapsed + 2.5
      this.particles.confetti(body.x, 1.5, body.z, [P.gold, P.cyan, P.magenta, P.coral, P.lime], 80)
      this.hooks.finish(ms, this.best, record)
      return
    }

    // abort if the driver walks off or leaves the arena
    const inside = Math.abs(body.x - x) < ARENA_W / 2 + 3 && Math.abs(body.z - z) < ARENA_D / 2 + 3
    this.offFor = riding && inside ? 0 : this.offFor + dt
    if (this.offFor > 2) this.stop()
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(ms: number) {
  try {
    localStorage.setItem(BEST_KEY, String(Math.round(ms)))
  } catch {
    /* ignore */
  }
}
