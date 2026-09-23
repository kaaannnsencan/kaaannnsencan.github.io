import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { profile } from '../../content/profile'
import { box, glowMaterial, label, lampPost, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { P } from '../palette'

/** One floating crystal per skill group, arranged on an arc of stone pedestals. */
export function buildSkills(ctx: WorldContext) {
  const { x, z } = ZONES.skills
  ctx.decal({ x, z, w: 26, d: 16, color: P.grassLight, edge: P.grassDark, round: true })
  ctx.reserve(x, z, 26, 16)
  label(ctx, { tr: 'YETENEK BAHÇESİ', en: 'SKILL GARDEN' }, x, 1.2, z + 6.5, { background: P.ink, color: P.white, border: P.lime })

  const groups = profile.skills
  groups.forEach((group, i) => {
    const t = groups.length === 1 ? 0.5 : i / (groups.length - 1)
    const angle = Math.PI * (0.9 - t * 0.8)
    const px = x + Math.cos(angle) * 9
    const pz = z - Math.sin(angle) * 4.2 + 1.5

    const g = new THREE.Group()
    g.add(box(1.4, 0.5, 1.4, P.stoneDark))
    g.add(box(1.1, 0.5, 1.1, P.stone, 0, 0.5))
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), glowMaterial(ctx, group.color, group.color, 0.25, 1.2))
    crystal.scale.set(0.8, 1.35, 0.8)
    crystal.position.y = 2
    crystal.userData.dynamic = true
    g.add(crystal)
    g.position.set(px, 0, pz)
    ctx.scene.add(solid(g))
    ctx.collision.addBox(px, pz, 1.4, 1.4)

    const phase = i * 1.3
    ctx.animators.push((time) => {
      crystal.rotation.y = time * 0.9 + phase
      crystal.position.y = 2 + Math.sin(time * 2 + phase) * 0.15
    })

    label(ctx, group.title, px, 3.4, pz, { background: P.white, border: group.color })
    ctx.interact.add({
      id: `skill-${group.id}`,
      position: new THREE.Vector3(px, 0, pz + 1.3),
      radius: 1.8,
      height: 2,
      label: () => i18n.t('interact'),
      action: () => ctx.openPanel({ kind: 'skills', id: group.id }),
    })
  })

  lampPost(ctx, x - 12, z + 5)
  lampPost(ctx, x + 12, z + 5)
}
