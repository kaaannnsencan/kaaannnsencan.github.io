import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import type { GithubSnapshot } from '../../data/github'
import { box, label, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { toon } from '../materials'
import { P } from '../palette'

const GREENS = ['#2d333b', '#0e4429', '#006d32', '#26a641', '#39d353']

/**
 * GitHub contribution calendar as a 3D skyline (53 weeks × 7 days).
 * Bars only appear when the snapshot includes contributions (needs a token at build time).
 */
export function buildSkyline(ctx: WorldContext, github: GithubSnapshot) {
  const contrib = github.contributions
  const { x, z } = ZONES.skyline
  const weeks = contrib?.weeks ?? []
  const cell = 0.42
  const width = Math.max(weeks.length, 53) * cell
  const depth = 7 * cell

  ctx.reserve(x, z, width + 4, depth + 6)
  ctx.decal({ x, z: z + 0.5, w: width + 3, d: depth + 4, color: P.plaza, edge: P.plazaDark, pattern: 'tiles' })

  ctx.scene.add(box(width + 0.6, 0.4, depth + 0.6, P.ink, x, 0, z))
  ctx.collision.addBox(x, z, width + 0.6, depth + 0.6)

  ctx.interact.add({
    id: 'skyline',
    position: new THREE.Vector3(x, 0, z + depth / 2 + 1.6),
    radius: 2.2,
    height: 1.8,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'github' }),
  })

  if (!contrib || weeks.length === 0) {
    label(ctx, { tr: 'KATKI GRAFİĞİ YAKINDA', en: 'CONTRIBUTION SKYLINE SOON' }, x, 1.2, z + depth / 2 + 0.8, { background: P.white })
    return
  }

  const max = Math.max(1, ...weeks.flat())
  const count = weeks.reduce((n, w) => n + w.length, 0)
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(cell * 0.86, 1, cell * 0.86), toon('#ffffff'), count)
  const m = new THREE.Matrix4()
  const color = new THREE.Color()
  let i = 0
  weeks.forEach((week, wi) =>
    week.forEach((n, di) => {
      const level = n === 0 ? 0 : Math.min(4, 1 + Math.floor((n / max) * 3.999))
      // sqrt keeps quiet weeks visible next to busy ones
      const h = n === 0 ? 0.08 : 0.35 + Math.sqrt(n / max) * 3
      m.makeScale(1, h, 1).setPosition(x - width / 2 + (wi + 0.5) * cell, 0.4 + h / 2, z - depth / 2 + (di + 0.5) * cell)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, color.set(GREENS[level]))
      i++
    }),
  )
  mesh.instanceMatrix.needsUpdate = true
  ctx.scene.add(solid(mesh))
  label(ctx, () => `${contrib.total} ${i18n.t('contributions')}`, x, 1, z + depth / 2 + 1, { background: P.ink, color: '#39d353', border: '#39d353' })
}
