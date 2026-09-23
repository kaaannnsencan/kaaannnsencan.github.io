import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { profile } from '../../content/profile'
import { box, house, label, lampPost, PITCH, snapQuad, solid, windowMaterial, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { pixelTexture, toon } from '../materials'
import { P } from '../palette'
import { paintPoster, POSTER_H, POSTER_W } from '../posters'

/** Open-air design gallery: easels angled to face the camera so posters stay pixel-perfect. */
export function buildGallery(ctx: WorldContext) {
  const { x, z } = ZONES.design
  ctx.decal({ x, z: z + 1, w: 26, d: 22, color: '#e9dfcf', edge: '#c9b89e', pattern: 'tiles' })

  const studio = house(ctx, x, z - 12, { w: 10, d: 4.5, h: 3, wall: '#f4eefc', roof: P.roofPurple, roofH: 2.2, windows: 4 }, windowMaterial(ctx))
  label(ctx, { tr: 'TASARIM STÜDYOSU', en: 'DESIGN STUDIO' }, x, 6.2, z - 12, { background: P.ink, color: P.white, border: P.magenta })
  ctx.interact.add({
    id: 'design-studio',
    position: studio.door,
    radius: 1.8,
    height: 2.2,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'design' }),
  })

  const works = profile.design
  const perRow = 3
  works.forEach((work, i) => {
    const col = i % perRow
    const row = Math.floor(i / perRow)
    const ex = x + (col - 1) * 7.6
    const ez = z - 3.5 + row * 9
    const g = new THREE.Group()

    const pw = POSTER_W / 16
    const ph = POSTER_H / 16
    // board faces the camera exactly (tilted back by the camera pitch)
    const board = new THREE.Group()
    board.rotation.x = -PITCH
    const frame = box(pw + 0.3, ph + 0.3, 0.12, P.woodDark, 0, -(ph + 0.3) / 2, -0.07)
    board.add(frame)
    let tex: THREE.Texture = pixelTexture(paintPoster(work))
    const mat = new THREE.MeshBasicMaterial({ map: tex })
    if (work.image) {
      new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}${work.image.replace(/^\//, '')}`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        tex.dispose()
        tex = t
        mat.map = t
        mat.needsUpdate = true
      })
    }
    const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat)
    board.add(canvasMesh)
    board.position.y = 0.6 + (ph / 2) * Math.cos(PITCH)
    g.add(board)
    g.position.set(ex, 0, ez)
    snapQuad(board, POSTER_W, POSTER_H, g.position)
    // easel legs
    g.add(box(0.12, 1.2, 0.12, P.woodDark, -pw / 2 + 0.2, 0, -0.3))
    g.add(box(0.12, 1.2, 0.12, P.woodDark, pw / 2 - 0.2, 0, -0.3))
    g.position.set(ex, 0, ez)
    ctx.scene.add(solid(g, true, false))
    ctx.collision.addBox(ex, ez - 0.5, pw, 1.2)

    label(ctx, work.title, ex, 0.2, ez + 2, { background: P.white })

    ctx.interact.add({
      id: `design-${work.id}`,
      position: new THREE.Vector3(ex, 0, ez + 2.4),
      radius: 1.8,
      height: 1.4,
      label: () => i18n.t('interact'),
      action: () => ctx.openPanel({ kind: 'designWork', id: work.id }),
    })
  })

  // decorative paint pots
  for (const [px, pz, c] of [[x - 9.5, z + 6, P.magenta], [x - 8.7, z + 6.6, P.cyan], [x + 9.2, z + 6.2, P.gold]] as const) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 8), toon(c))
    pot.position.set(px, 0.22, pz)
    ctx.scene.add(solid(pot))
  }
  lampPost(ctx, x - 12.5, z - 2)
  lampPost(ctx, x + 12.5, z - 2)
}
