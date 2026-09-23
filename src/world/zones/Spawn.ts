import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { profile } from '../../content/profile'
import { bench, box, label, lampPost, signpost, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { toon } from '../materials'
import { buildVitrinStatue } from './Vitrin'
import { P } from '../palette'
import { glyph, normalize } from '../PixelFont'

/**
 * The name, built from voxels. Walking through it scatters the voxels, which
 * spring back into place — a small physics toy right at the spawn point.
 */
export class VoxelTitle {
  readonly mesh: THREE.InstancedMesh
  private home: Float32Array
  private pos: Float32Array
  private vel: Float32Array
  private count: number
  private dummy = new THREE.Object3D()
  private settled = true
  onScatter: (() => void) | null = null
  private lastScatter = 0

  constructor(text: string, center: THREE.Vector3, voxel = 0.36, colors: string[] = [P.gold, P.white]) {
    const cells: Array<{ x: number; y: number; word: number }> = []
    let cx = 0
    let word = 0
    const lift = 2 // leave room for Ş/Ç descenders
    for (const ch of normalize(text)) {
      if (ch === ' ') word++
      const rows = glyph(ch)
      rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] === '1') cells.push({ x: cx + c, y: 6 - r + lift, word })
      })
      cx += rows[0].length + 1
    }
    const width = (cx - 1) * voxel
    const depth = 2
    this.count = cells.length * depth
    this.home = new Float32Array(this.count * 3)
    this.pos = new Float32Array(this.count * 3)
    this.vel = new Float32Array(this.count * 3)

    const geo = new THREE.BoxGeometry(voxel, voxel, voxel)
    this.mesh = new THREE.InstancedMesh(geo, toon('#ffffff'), this.count)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    const color = new THREE.Color()
    let i = 0
    for (const cell of cells)
      for (let d = 0; d < depth; d++) {
        const x = center.x - width / 2 + cell.x * voxel + voxel / 2
        const y = cell.y * voxel + voxel / 2 - lift * voxel + voxel * 2
        const z = center.z - d * voxel
        this.home.set([x, y, z], i * 3)
        this.pos.set([x, y, z], i * 3)
        color.set(colors[cell.word % colors.length])
        if (d === 1) color.multiplyScalar(0.8)
        this.mesh.setColorAt(i, color)
        i++
      }
    this.writeMatrices()
  }

  update(dt: number, px: number, pz: number, speed: number) {
    const r = 1.1
    let disturbed = false
    for (let i = 0; i < this.count; i++) {
      const k = i * 3
      const dx = this.pos[k] - px
      const dz = this.pos[k + 2] - pz
      const d2 = dx * dx + dz * dz
      if (d2 < r * r && this.pos[k + 1] < 3.2) {
        const d = Math.sqrt(d2) || 0.001
        const push = (1 - d / r) * (3 + speed * 1.6)
        this.vel[k] += (dx / d) * push
        this.vel[k + 1] += push * 0.9
        this.vel[k + 2] += (dz / d) * push
        disturbed = true
      }
    }
    if (disturbed) {
      this.settled = false
      const now = performance.now()
      if (now - this.lastScatter > 180) {
        this.lastScatter = now
        this.onScatter?.()
      }
    }
    if (this.settled) return

    let energy = 0
    const stiffness = 26
    const damping = Math.exp(-5.5 * dt)
    for (let i = 0; i < this.count * 3; i++) {
      const a = (this.home[i] - this.pos[i]) * stiffness
      this.vel[i] = (this.vel[i] + a * dt) * damping
      this.pos[i] += this.vel[i] * dt
      energy += Math.abs(this.vel[i]) + Math.abs(this.home[i] - this.pos[i])
    }
    // keep voxels above ground
    for (let i = 0; i < this.count; i++) if (this.pos[i * 3 + 1] < 0.18) this.pos[i * 3 + 1] = 0.18
    if (energy < 0.02) {
      this.pos.set(this.home)
      this.vel.fill(0)
      this.settled = true
    }
    this.writeMatrices()
  }

  private writeMatrices() {
    for (let i = 0; i < this.count; i++) {
      const k = i * 3
      this.dummy.position.set(this.pos[k], this.pos[k + 1], this.pos[k + 2])
      const tumble = Math.min(1, Math.abs(this.pos[k + 1] - this.home[k + 1]))
      this.dummy.rotation.set(tumble * (k % 7), tumble * (k % 5), 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

export function buildSpawn(ctx: WorldContext) {
  const { x, z } = ZONES.spawn
  ctx.decal({ x, z: z + 1, w: 30, d: 24, color: P.plaza, edge: P.plazaDark, pattern: 'tiles' })

  const vitrin = profile.projects.find((p) => p.landmark === 'vitrin')
  if (vitrin) buildVitrinStatue(ctx, vitrin, x, z + 8.5)

  const titleZ = z - 8.5
  const voxel = 0.36
  const title = new VoxelTitle(profile.shortName, new THREE.Vector3(x, 0, titleZ), voxel)
  ctx.scene.add(title.mesh)
  // stone stage right behind the letters; Ş/Ç cedillas hang in front of it
  const stageZ = titleZ - voxel * 1.5 - 0.55
  ctx.scene.add(box(24, voxel * 2, 1.1, P.stone, x, 0, stageZ))
  ctx.scene.add(box(24.4, 0.14, 1.3, P.stoneDark, x, voxel * 2, stageZ))
  ctx.collision.addBox(x, stageZ, 24, 1.1)
  title.onScatter = () => ctx.sfx('pop')

  label(ctx, () => i18n.pick(profile.role), x, 0.9, z - 6.2, { background: P.ink, color: P.white, border: P.gold })

  signpost(ctx, x + 4.5, z + 1.5, { tr: 'BAŞLANGIÇ', en: 'START HERE' }, () => ctx.openPanel({ kind: 'welcome' }), P.gold)
  signpost(ctx, x - 9, z + 3.6, { tr: '← TASARIM', en: '← DESIGN' })
  signpost(ctx, x + 9, z + 3.6, { tr: 'KOD →', en: 'CODE →' })
  signpost(ctx, x - 5, z + 11.5, { tr: '↓ KAMPÜS', en: '↓ CAMPUS' })
  signpost(ctx, x + 2.6, z - 12, { tr: '↑ HAKKIMDA', en: '↑ ABOUT' })

  for (const [lx, lz] of [[-14, -1], [14, -1], [-14, 4], [14, 4]] as const) lampPost(ctx, x + lx, z + lz)
  bench(ctx, x - 7, z + 0.5)
  bench(ctx, x + 7.5, z + 0.5)

  return title
}
