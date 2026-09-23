import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { CHAPTERS, type Chapter } from '../../content/village'
import { box, gableRoof, glowMaterial, label, lampPost, signpost, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { toon } from '../materials'
import { P } from '../palette'

/** Tiny cottage facing the camera; returns the door position. */
function cottage(ctx: WorldContext, ch: Chapter, x: number, z: number) {
  const w = 3
  const d = 2.4
  const h = 1.5
  const g = new THREE.Group()
  g.add(box(w, h, d, ch.wall))
  g.add(box(w + 0.1, 0.18, d + 0.1, P.stoneDark))
  const roof = gableRoof(w, d, 1.2, ch.roof, 0.25)
  roof.position.y = h
  g.add(roof)
  g.add(box(0.7, 1.1, 0.1, P.woodDark, -0.55, 0, d / 2 + 0.02))
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), glowMaterial(ctx, '#34466b', '#ffcf6b', 0, 1.6))
  win.position.set(0.7, 0.85, d / 2 + 0.03)
  g.add(win)
  // chimney + flower box
  g.add(box(0.35, 0.8, 0.35, P.stoneDark, 0.8, h + 0.4, -0.4))
  g.add(box(0.7, 0.15, 0.2, P.wood, 0.7, 0.5, d / 2 + 0.12))
  g.add(box(0.6, 0.1, 0.12, P.blossom, 0.7, 0.65, d / 2 + 0.12))
  g.position.set(x, 0, z)
  ctx.scene.add(solid(g))
  ctx.collision.addBox(x, z, w, d)
  ctx.occluders.add(g, x - w / 2, x + w / 2, z - d / 2, z + d / 2, h + 1.2)

  label(ctx, ch.name, x, h + 2.2, z + d / 2, { background: P.ink, color: P.white, border: ch.roof })
  ctx.interact.add({
    id: `village-${ch.id}`,
    position: new THREE.Vector3(x - 0.55, 0, z + d / 2 + 0.9),
    radius: 1.7,
    height: 1.8,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'cards', id: ch.id }),
  })
}

/**
 * Kaan's Village: a handful of tiny houses, each telling one chapter of the CV
 * as a deck of game cards. Small, flat and dense so it takes seconds to walk.
 */
export function buildVillage(ctx: WorldContext) {
  const { x, z } = ZONES.village
  ctx.decal({ x, z: z + 0.5, w: 28, d: 19, color: P.path, edge: P.pathDark, pattern: 'tiles' })

  const houses = CHAPTERS.filter((c) => !c.quests)
  const north = houses.slice(0, 4)
  const south = houses.slice(4)
  north.forEach((ch, i) => cottage(ctx, ch, x - 9 + i * 6, z - 5))
  south.forEach((ch, i) => cottage(ctx, ch, x - 9 + i * 18, z + 3.5))

  // quest board in the middle of the south row
  const board = CHAPTERS.find((c) => c.quests)
  if (board) {
    const bx = x
    const bz = z + 4
    const g = new THREE.Group()
    g.add(box(0.2, 2.2, 0.2, P.woodDark, -1.3))
    g.add(box(0.2, 2.2, 0.2, P.woodDark, 1.3))
    g.add(box(2.9, 1.4, 0.15, P.wood, 0, 0.7))
    g.add(box(3.2, 0.2, 0.5, P.roofRed, 0, 2.2))
    // pinned notes
    ;[[-0.8, 1.6], [0.1, 1.5], [0.9, 1.65], [-0.4, 1.0], [0.6, 0.95]].forEach(([nx, ny]) => g.add(box(0.5, 0.45, 0.04, P.white, nx, ny - 0.22, 0.1)))
    g.position.set(bx, 0, bz)
    ctx.scene.add(solid(g))
    ctx.collision.addBox(bx, bz, 3, 0.4)
    label(ctx, board.name, bx, 3.1, bz + 0.4, { background: P.gold, border: P.ink })
    ctx.interact.add({
      id: 'village-board',
      position: new THREE.Vector3(bx, 0, bz + 1.1),
      radius: 1.9,
      height: 2.4,
      label: () => i18n.t('interact'),
      action: () => ctx.openPanel({ kind: 'cards', id: board.id }),
    })
  }

  // well in the square
  const well = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.7, 10), toon(P.stone))
  ring.position.y = 0.35
  well.add(ring)
  well.add(box(0.12, 1.5, 0.12, P.woodDark, -0.7, 0.3))
  well.add(box(0.12, 1.5, 0.12, P.woodDark, 0.7, 0.3))
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.7, 4), toon(P.roofRed))
  roof.position.y = 2.1
  roof.rotation.y = Math.PI / 4
  well.add(roof)
  well.position.set(x, 0, z - 0.5)
  ctx.scene.add(solid(well))
  ctx.collision.addCircle(x, z - 0.5, 0.9)

  signpost(ctx, x + 12.5, z + 7.5, { tr: "KAAN'IN KÖYÜ", en: "KAAN'S VILLAGE" }, () => ctx.openPanel({ kind: 'cards', id: 'hero' }), P.gold)
  lampPost(ctx, x - 12.5, z + 7)
  lampPost(ctx, x + 12.5, z - 6)
}
