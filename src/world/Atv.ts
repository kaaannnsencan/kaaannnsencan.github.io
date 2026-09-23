import * as THREE from 'three'
import type { Body, Circle, CollisionWorld } from './Collision'
import { box, glowMaterial, solid, type WorldContext } from './kit'
import { toon } from './materials'
import { P } from './palette'
import type { Particles } from './Particles'

const MAX_SPEED = 12
const BOOST_SPEED = 16
const TURN_RATE = 3.4

/**
 * A rideable quad bike. Arcade handling: the stick/keys give a desired
 * direction, the ATV steers towards it (turning rate grows with speed),
 * throttles up and slides off walls. Built from boxes so it goes through the
 * same pixel/outline pipeline as the rest of the world.
 */
export class Atv {
  readonly group = new THREE.Group()
  readonly body: Body = { x: 0, z: 0, vx: 0, vz: 0, r: 0.8 }
  /** Where the rider sits, in world space (updated every step). */
  readonly seat = new THREE.Vector3()
  heading = 0
  speed = 0
  occupied = false
  private model = new THREE.Group()
  private wheels: THREE.Mesh[] = []
  private frontWheels: THREE.Group[] = []
  private blocker: Circle
  private dustTimer = 0

  constructor(ctx: WorldContext, private collision: CollisionWorld, private particles: Particles, x: number, z: number, heading: number) {
    const red = toon('#d8452c')
    const black = toon(P.ink)
    const m = this.model
    // chassis + fenders + seat + rack
    m.add(box(1.0, 0.35, 1.7, red, 0, 0.45, 0))
    m.add(box(1.25, 0.12, 0.6, red, 0, 0.72, 0.62))
    m.add(box(1.25, 0.12, 0.6, red, 0, 0.72, -0.62))
    m.add(box(0.6, 0.18, 0.75, black, 0, 0.8, -0.2))
    m.add(box(0.9, 0.08, 0.45, P.stoneDark, 0, 0.84, -0.72))
    // handlebar
    m.add(box(0.08, 0.45, 0.08, black, 0, 0.8, 0.52))
    m.add(box(0.95, 0.08, 0.08, black, 0, 1.22, 0.52))
    // headlights (glow at night)
    const lamp = glowMaterial(ctx, '#fff4d0', '#ffe39a', 0.2, 2.4)
    for (const sx of [-0.25, 0.25]) m.add(box(0.18, 0.12, 0.06, lamp, sx, 0.55, 0.86))
    // wheels
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10)
    wheelGeo.rotateZ(Math.PI / 2)
    const tyre = toon('#2a2530')
    for (const [wx, wz] of [[-0.62, 0.62], [0.62, 0.62], [-0.62, -0.62], [0.62, -0.62]] as const) {
      const wheel = new THREE.Mesh(wheelGeo, tyre)
      const hub = box(0.32, 0.14, 0.14, P.stone, 0, -0.07, 0)
      wheel.add(hub)
      if (wz > 0) {
        const pivot = new THREE.Group()
        pivot.position.set(wx, 0.34, wz)
        pivot.add(wheel)
        m.add(pivot)
        this.frontWheels.push(pivot)
      } else {
        wheel.position.set(wx, 0.34, wz)
        m.add(wheel)
      }
      this.wheels.push(wheel)
    }
    this.group.add(m)
    this.group.userData.dynamic = true
    ctx.scene.add(solid(this.group))

    this.body.x = x
    this.body.z = z
    this.heading = heading
    // while parked the ATV blocks walkers and the ball; disabled while it drives
    this.blocker = collision.addDynamicCircle({ x, z, r: 0.85 })
    this.sync(0, 0)
  }

  get forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) }
  }

  mount() {
    this.occupied = true
    this.blocker.r = 0
  }

  dismount() {
    this.occupied = false
    this.speed = 0
    this.body.vx = this.body.vz = 0
    this.blocker.x = this.body.x
    this.blocker.z = this.body.z
    this.blocker.r = 0.85
  }

  place(x: number, z: number) {
    this.body.x = x
    this.body.z = z
    this.body.vx = this.body.vz = 0
    this.speed = 0
    this.sync(0, 0)
  }

  /** Point beside the ATV where the rider steps off. */
  exitPoint() {
    const f = this.forward
    return { x: this.body.x + f.z * 1.3, z: this.body.z - f.x * 1.3 }
  }

  update(dt: number, move: { x: number; y: number }, boost: boolean) {
    const mag = Math.min(1, Math.hypot(move.x, move.y))
    let steer = 0
    if (mag > 0.1) {
      const target = Math.atan2(move.x, move.y)
      let diff = target - this.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      // turning needs some speed, but allow pivoting from standstill
      const turnScale = 0.45 + Math.min(1, Math.abs(this.speed) / 6) * 0.55
      const step = Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * turnScale * dt)
      this.heading += step
      steer = Math.max(-1, Math.min(1, diff * 2))
      // brake when asked to go the opposite way
      const throttle = Math.abs(diff) > 2.2 ? 0 : mag * Math.cos(Math.min(Math.abs(diff), 1.2) * 0.6)
      const top = boost ? BOOST_SPEED : MAX_SPEED
      this.speed += (throttle * top - this.speed) * (1 - Math.exp(-dt * (throttle > 0 ? 1.6 : 4)))
    } else {
      this.speed *= Math.exp(-dt * 2.2)
      if (Math.abs(this.speed) < 0.05) this.speed = 0
    }

    const f = this.forward
    this.body.vx = f.x * this.speed
    this.body.vz = f.z * this.speed
    this.body.x += this.body.vx * dt
    this.body.z += this.body.vz * dt
    if (this.collision.resolve(this.body, 0.2)) {
      // keep only the velocity that survived the wall
      this.speed = this.body.vx * f.x + this.body.vz * f.z
    }

    // dust from the rear wheels
    this.dustTimer -= dt
    if (Math.abs(this.speed) > 4 && this.dustTimer <= 0) {
      this.dustTimer = 0.06
      this.particles.dust(this.body.x - f.x * 0.8, this.body.z - f.z * 0.8, '#d9c9a4')
    }
    this.sync(dt, steer)
  }

  private sync(dt: number, steer: number) {
    this.group.position.set(this.body.x, 0, this.body.z)
    this.group.rotation.y = this.heading
    const spin = (this.speed * dt) / 0.34
    for (const w of this.wheels) w.rotation.x += spin
    for (const p of this.frontWheels) p.rotation.y = steer * 0.45
    // body leans into turns and bobs with speed
    this.model.rotation.z = -steer * Math.min(1, Math.abs(this.speed) / MAX_SPEED) * 0.12
    this.model.position.y = Math.abs(this.speed) > 1 ? Math.sin(performance.now() * 0.03) * 0.015 : 0
    const f = this.forward
    this.seat.set(this.body.x - f.x * 0.2, 0.62, this.body.z - f.z * 0.2)
  }
}
