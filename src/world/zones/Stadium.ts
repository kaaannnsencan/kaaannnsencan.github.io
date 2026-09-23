import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import type { Body, CollisionWorld } from '../Collision'
import { box, Label, lampPost, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { canvas2d, pixelTexture, toonWithMap } from '../materials'
import { P } from '../palette'
import type { Particles } from '../Particles'
import { paintFenerbahceCrest } from '../crest'

const FIELD_W = 20
const FIELD_D = 12
const GOAL_W = 3.6

/** A small pitch with a kickable ball and a live goal counter. */
export class Stadium {
  readonly ball: Body = { x: 0, z: 0, vx: 0, vz: 0, r: 0.42 }
  private mesh: THREE.Mesh
  private score = 0
  private scoreLabel: Label
  private resetAt = 0
  private kickCooldown = 0
  private axis = new THREE.Vector3()
  onGoal: (() => void) | null = null
  onKick: (() => void) | null = null

  constructor(private ctx: WorldContext, private collision: CollisionWorld, private particles: Particles) {
    const { x, z } = ZONES.stadium
    ctx.decal({ x, z, w: FIELD_W + 2, d: FIELD_D + 2, color: P.grass, edge: P.white, pattern: 'stripes' })
    ctx.decal({ x, z, w: 0.3, d: FIELD_D, color: P.white })
    // centre circle and crest are stretched in z so they read as round from the tilted camera
    ctx.decal({ x, z, w: 8, d: 12, color: P.grass, edge: P.white, round: true })
    ctx.decal({ x, z, w: 6.75, d: 10.5, color: P.white, paint: paintFenerbahceCrest })
    ctx.reserve(x, z, FIELD_W + 6, FIELD_D + 6)

    for (const side of [-1, 1]) this.goal(x + side * (FIELD_W / 2 + 0.2), z, side)

    // ball: pixel checker texture on a low-poly sphere
    const { canvas, ctx: c } = canvas2d(16, 8)
    for (let y = 0; y < 8; y++)
      for (let xx = 0; xx < 16; xx++) {
        c.fillStyle = (Math.floor(xx / 4) + Math.floor(y / 4)) % 2 ? P.ink : P.white
        c.fillRect(xx, y, 1, 1)
      }
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(this.ball.r, 1), toonWithMap(pixelTexture(canvas)))
    this.mesh.userData.dynamic = true
    ctx.scene.add(solid(this.mesh))
    this.resetBall()

    this.scoreLabel = new Label(() => `${i18n.t('goals').toUpperCase()}: ${this.score}`, { background: P.ink, color: P.gold, border: P.gold, scale: 2 })
    this.scoreLabel.at(x, 4.6, z - FIELD_D / 2 - 1.7)
    ctx.scene.add(this.scoreLabel.mesh)
    const board = new THREE.Group()
    board.add(box(0.3, 3.6, 0.3, P.ink, -2.5))
    board.add(box(0.3, 3.6, 0.3, P.ink, 2.5))
    board.position.set(x, 0, z - FIELD_D / 2 - 1.9)
    ctx.scene.add(solid(board))
    ctx.collision.addCircle(x - 2.5, z - FIELD_D / 2 - 1.9, 0.3)
    ctx.collision.addCircle(x + 2.5, z - FIELD_D / 2 - 1.9, 0.3)

    lampPost(ctx, x - FIELD_W / 2 - 2, z - FIELD_D / 2 - 1)
    lampPost(ctx, x + FIELD_W / 2 + 2, z - FIELD_D / 2 - 1)
  }

  private goal(gx: number, gz: number, side: number) {
    const g = new THREE.Group()
    const depth = 1.4
    g.add(box(0.2, 1.8, 0.2, P.white, 0, 0, -GOAL_W / 2))
    g.add(box(0.2, 1.8, 0.2, P.white, 0, 0, GOAL_W / 2))
    g.add(box(0.2, 0.2, GOAL_W + 0.2, P.white, 0, 1.8, 0))
    g.add(box(0.05, 1.8, GOAL_W, '#d9e6ef', side * depth, 0, 0))
    g.add(box(depth, 0.05, GOAL_W, '#d9e6ef', (side * depth) / 2, 1.8, 0))
    g.position.set(gx, 0, gz)
    this.ctx.scene.add(solid(g))
    const c = this.ctx.collision
    c.addCircle(gx, gz - GOAL_W / 2, 0.15)
    c.addCircle(gx, gz + GOAL_W / 2, 0.15)
    c.addBox(gx + side * depth, gz, 0.2, GOAL_W)
    c.addBox(gx + (side * depth) / 2, gz - GOAL_W / 2, depth, 0.15)
    c.addBox(gx + (side * depth) / 2, gz + GOAL_W / 2, depth, 0.15)
  }

  private resetBall() {
    const { x, z } = ZONES.stadium
    Object.assign(this.ball, { x, z: z + 0.01, vx: 0, vz: 0 })
    this.mesh.position.set(x, this.ball.r, z)
  }

  update(dt: number, player: Body, elapsed: number) {
    const b = this.ball
    if (this.resetAt && elapsed > this.resetAt) {
      this.resetAt = 0
      this.resetBall()
    }
    this.kickCooldown -= dt

    // player ↔ ball
    const dx = b.x - player.x
    const dz = b.z - player.z
    const d = Math.hypot(dx, dz)
    const min = b.r + player.r
    if (d < min && d > 1e-4) {
      const nx = dx / d
      const nz = dz / d
      b.x = player.x + nx * min
      b.z = player.z + nz * min
      const pv = Math.max(0, player.vx * nx + player.vz * nz)
      const kick = pv * 1.7 + 1.5
      const bn = b.vx * nx + b.vz * nz
      if (bn < kick) {
        b.vx += (kick - bn) * nx
        b.vz += (kick - bn) * nz
        if (this.kickCooldown <= 0 && kick > 4) {
          this.kickCooldown = 0.25
          this.onKick?.()
        }
      }
    }

    const friction = Math.exp(-1.1 * dt)
    b.vx *= friction
    b.vz *= friction
    b.x += b.vx * dt
    b.z += b.vz * dt
    this.collision.resolve(b, 0.6)

    // roll without slipping
    const speed = Math.hypot(b.vx, b.vz)
    if (speed > 0.01) {
      this.axis.set(b.vz, 0, -b.vx).normalize()
      this.mesh.rotateOnWorldAxis(this.axis, (speed * dt) / b.r)
    }
    this.mesh.position.set(b.x, b.r, b.z)

    // goal?
    const { x, z } = ZONES.stadium
    if (!this.resetAt && Math.abs(b.z - z) < GOAL_W / 2 && Math.abs(b.x - x) > FIELD_W / 2 + 0.4) {
      this.score++
      this.scoreLabel.refresh()
      this.resetAt = elapsed + 1.6
      this.particles.confetti(b.x, 1, b.z, [P.gold, P.cyan, P.magenta, P.coral, P.lime])
      this.onGoal?.()
    }
  }
}
