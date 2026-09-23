import * as THREE from 'three'
import { toon } from './materials'

/** Pooled voxel particles (dust puffs, confetti) in a single instanced mesh. */
export class Particles {
  readonly mesh: THREE.InstancedMesh
  private max: number
  private life: Float32Array
  private data: Float32Array // x y z vx vy vz size gravity
  private cursor = 0
  private dummy = new THREE.Object3D()
  private color = new THREE.Color()
  private alive = 0

  constructor(max = 256) {
    this.max = max
    this.life = new Float32Array(max)
    this.data = new Float32Array(max * 8)
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff'), max)
    this.mesh.frustumCulled = false
    this.mesh.castShadow = false
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.color.set('#ffffff'))
    this.mesh.count = 0
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, color: string, life = 0.6, gravity = 0) {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.max
    this.life[i] = life
    this.alive = Math.max(this.alive, 1)
    this.data.set([x, y, z, vx, vy, vz, size, gravity], i * 8)
    this.mesh.setColorAt(i, this.color.set(color))
    this.mesh.instanceColor!.needsUpdate = true
  }

  dust(x: number, z: number, color = '#e8dcc0') {
    for (let i = 0; i < 3; i++)
      this.emit(
        x + (Math.random() - 0.5) * 0.4,
        0.1,
        z + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.8,
        0.6 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4,
        0.12 + Math.random() * 0.08,
        color,
        0.45,
      )
  }

  confetti(x: number, y: number, z: number, colors: string[], n = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 2 + Math.random() * 4
      this.emit(x, y, z, Math.cos(a) * s, 5 + Math.random() * 5, Math.sin(a) * s, 0.12 + Math.random() * 0.1, colors[i % colors.length], 1.8, 12)
    }
  }

  update(dt: number) {
    if (this.alive === 0) return
    let top = 0
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.dummy.scale.setScalar(0)
      } else {
        this.life[i] -= dt
        const k = i * 8
        const d = this.data
        d[k + 4] -= d[k + 7] * dt
        d[k] += d[k + 3] * dt
        d[k + 1] = Math.max(0.05, d[k + 1] + d[k + 4] * dt)
        d[k + 2] += d[k + 5] * dt
        const s = d[k + 6] * Math.min(1, Math.max(0, this.life[i]) * 3)
        this.dummy.position.set(d[k], d[k + 1], d[k + 2])
        this.dummy.rotation.set(this.life[i] * 7, this.life[i] * 5, 0)
        this.dummy.scale.setScalar(s)
        top = i + 1
      }
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.mesh.count = top
    this.mesh.instanceMatrix.needsUpdate = true
    this.alive = top
  }
}
