import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import type { Project } from '../../content/profile'
import { VITRIN_LOGO_SIGN, VITRIN_LOGO_STATUE } from '../../content/vitrinLogo'
import { LAYER_SPRITES } from '../../core/PixelRenderer'
import type { Lot } from '../../data/city'
import { floatingGem } from '../gem'
import { dynamic } from '../batch'
import { box, glowMaterial, label, PITCH, snapQuad, solid, type WorldContext } from '../kit'
import { canvas2d, pixelTexture, toon } from '../materials'
import { drawText, measure } from '../PixelFont'

// Vitrin AI brand: near-black, warm white and jeweller's gold.
export const VITRIN = {
  black: '#1a1917',
  black2: '#2b2825',
  gold: '#d4af37',
  goldDark: '#9c7c1c',
  goldLight: '#f3d77a',
  warm: '#f6f4f1',
  velvet: '#8e1b2b',
}

/** Pixel shop sign: gold logo + wordmark on black, framed in gold. */
function signCanvas() {
  const logo = VITRIN_LOGO_SIGN
  const text = 'VİTRİN AI'
  const lw = logo[0].length
  const lh = logo.length
  const tw = measure(text) * 2
  const pad = 5
  const w = pad + lw + 6 + tw + pad
  const h = lh + pad * 2
  const { canvas, ctx } = canvas2d(w + (w % 2), h + (h % 2))
  ctx.fillStyle = VITRIN.goldDark
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = VITRIN.gold
  ctx.fillRect(1, 1, canvas.width - 2, canvas.height - 2)
  ctx.fillStyle = VITRIN.black
  ctx.fillRect(3, 3, canvas.width - 6, canvas.height - 6)
  logo.forEach((row, y) => {
    for (let x = 0; x < row.length; x++)
      if (row[x] === '1') {
        ctx.fillStyle = y < lh / 2 ? VITRIN.goldLight : VITRIN.gold
        ctx.fillRect(pad + x, pad + y, 1, 1)
      }
  })
  ctx.fillStyle = VITRIN.warm
  drawText(ctx, text, pad + lw + 6, Math.round((canvas.height - 14) / 2), 2)
  return canvas
}

/**
 * The flagship landmark of the Code District: a black-and-gold art-deco
 * jewel box with a lit showcase ("vitrin") on the ground floor, a spinning
 * diamond on the crown and a red carpet out front.
 */
export function buildVitrinTower(ctx: WorldContext, lot: Extract<Lot, { kind: 'project' }>, x: number, lotZ: number) {
  const W = 6.4
  const D = 4.8
  const z = lotZ - 0.6
  const g = new THREE.Group()
  const black = toon(VITRIN.black)
  const gold = toon(VITRIN.gold)

  // plinth with gold trim
  g.add(box(W + 0.6, 0.35, D + 0.6, black))
  g.add(box(W + 0.7, 0.08, D + 0.7, gold, 0, 0.35))

  // ---- ground floor showcase: open, warmly lit recess
  const baseY = 0.43
  const showH = 2.6
  const inner = glowMaterial(ctx, '#5a4a3c', '#ffd9a0', 0.9, 1.6)
  g.add(box(W, showH, 0.3, inner, 0, baseY, -D / 2 + 0.15))
  g.add(box(0.35, showH, D, black, -W / 2 + 0.175, baseY))
  g.add(box(0.35, showH, D, black, W / 2 - 0.175, baseY))
  g.add(box(W, 0.3, D, black, 0, baseY + showH))
  g.add(box(W - 0.7, 0.05, D - 0.4, toon('#b89a78'), 0, baseY))
  // gold frame around the opening
  g.add(box(0.2, showH, 0.25, gold, -W / 2 + 0.1, baseY, D / 2 - 0.1))
  g.add(box(0.2, showH, 0.25, gold, W / 2 - 0.1, baseY, D / 2 - 0.1))
  g.add(box(W, 0.22, 0.3, gold, 0, baseY + showH - 0.1, D / 2 - 0.1))

  // jewels on pedestals inside the showcase
  const jewels: THREE.Object3D[] = []
  ;[-1.9, 0, 1.9].forEach((px, i) => {
    g.add(box(0.7, 0.85, 0.7, toon(VITRIN.warm), px, baseY, D / 2 - 0.9))
    g.add(box(0.76, 0.06, 0.76, gold, px, baseY + 0.85, D / 2 - 0.9))
    const holder = new THREE.Group()
    holder.position.set(px, baseY + 1.35, D / 2 - 0.9)
    if (i === 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12), gold)
      const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), glowMaterial(ctx, '#e9fbff', '#9fe8ff', 0.4, 1.4))
      stone.position.y = 0.3
      holder.add(ring, stone)
    } else {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 14), gold)
      const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), toon(i === 0 ? '#e0115f' : '#0f9d58'))
      drop.position.y = -0.34
      holder.add(chain, drop)
    }
    g.add(dynamic(holder))
    jewels.push(holder)
  })

  // ---- tower: black body, gold fins, lit window bays, gold floor bands
  const towerY = baseY + showH + 0.3
  const towerH = 4.6
  const TW = W - 0.5
  const TD = D - 0.5
  g.add(box(TW, towerH, TD, black, 0, towerY))
  const windows = glowMaterial(ctx, '#2f3446', '#ffd27a', 0, 1.5)
  const bays = 7
  const bayW = TW / bays
  for (let i = 0; i <= bays; i++) g.add(box(0.12, towerH, 0.16, gold, -TW / 2 + i * bayW, towerY, TD / 2 + 0.05))
  for (let i = 0; i < bays; i++) g.add(box(bayW - 0.3, towerH - 0.5, 0.06, windows, -TW / 2 + (i + 0.5) * bayW, towerY + 0.25, TD / 2 + 0.02))
  for (let f = 1; f < 3; f++) g.add(box(TW + 0.1, 0.12, 0.2, gold, 0, towerY + (towerH / 3) * f, TD / 2 + 0.06))
  // side edges
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.16, towerH, 0.16, gold, (sx * TW) / 2, towerY, (sz * TD) / 2))

  // ---- stepped art-deco crown
  const crownY = towerY + towerH
  g.add(box(TW + 0.2, 0.18, TD + 0.2, black, 0, crownY))
  g.add(box(TW + 0.24, 0.06, TD + 0.24, gold, 0, crownY + 0.12))
  g.add(box(TW - 1.2, 0.7, TD - 1.2, black, 0, crownY + 0.18))
  g.add(box(TW - 1.14, 0.06, TD - 1.14, gold, 0, crownY + 0.82))
  g.add(box(TW - 2.6, 0.5, TD - 2.6, black, 0, crownY + 0.88))
  g.add(box(TW - 2.54, 0.06, TD - 2.54, gold, 0, crownY + 1.32))
  const top = crownY + 1.4

  g.position.set(x, 0, z)
  ctx.scene.add(solid(g))
  ctx.collision.addBox(x, z, W + 0.6, D + 0.6)
  ctx.occluders.add(g, x - W / 2, x + W / 2, z - D / 2, z + D / 2, top + 2)

  // jewels turn slowly in the showcase
  ctx.animators.push((t) => jewels.forEach((j, i) => (j.rotation.y = t * 0.8 + i * 2)))

  // the diamond on the crown
  floatingGem(ctx, 0.75, x, top + 1.4, z)

  // ---- camera-facing pixel sign above the showcase
  const canvas = signCanvas()
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width / 16, canvas.height / 16),
    new THREE.MeshBasicMaterial({ map: pixelTexture(canvas), transparent: true, alphaTest: 0.5, depthWrite: false }),
  )
  sign.rotation.x = -PITCH
  sign.position.set(x, towerY + 2.2, z + D / 2 + 1.4)
  snapQuad(sign, canvas.width, canvas.height)
  sign.layers.set(LAYER_SPRITES)
  sign.renderOrder = 3
  ctx.scene.add(sign)

  // ---- red carpet, velvet ropes and spotlights out front
  const front = z + D / 2 + 0.3
  ctx.decal({ x, z: front + 1.6, w: 2.4, d: 3.2, color: VITRIN.velvet, edge: VITRIN.gold })
  for (const sx of [-1.6, 1.6])
    for (const dz of [0.6, 2.8]) {
      ctx.scene.add(solid(box(0.14, 0.9, 0.14, gold, x + sx, 0, front + dz)))
      ctx.collision.addCircle(x + sx, front + dz, 0.12)
    }
  for (const sx of [-1.6, 1.6]) {
    const rope = box(0.06, 0.06, 2.2, VITRIN.velvet, x + sx, 0.72, front + 1.7)
    ctx.scene.add(rope)
  }
  for (const sx of [-W / 2 - 0.6, W / 2 + 0.6]) {
    ctx.scene.add(solid(box(0.4, 0.3, 0.4, VITRIN.black, x + sx, 0, front)))
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.28), glowMaterial(ctx, '#fff4d0', '#ffe39a', 0.6, 2.4))
    lamp.position.set(x + sx, 0.37, front)
    ctx.scene.add(lamp)
  }

  label(ctx, 'VİTRİN AI', x, 0.35, front + 3.8, { background: VITRIN.black, color: VITRIN.gold, border: VITRIN.gold })

  ctx.interact.add({
    id: 'vitrin-tower',
    position: new THREE.Vector3(x, 0, front + 1.2),
    radius: 2.2,
    height: 3.2,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'project', payload: lot }),
  })
}

/**
 * Plaza monument: the Vitrin AI logo as a gold voxel sculpture on a black
 * plinth. The gem from the logo is a real floating diamond.
 */
export function buildVitrinStatue(ctx: WorldContext, project: Project, x: number, z: number) {
  const mask = VITRIN_LOGO_STATUE
  const voxel = 0.16
  const cols = mask[0].length
  const rows = mask.length
  const gemCols = 4 // the logo's gem lives in the first columns; it becomes a 3D gem instead
  const plinthH = 0.9
  const width = cols * voxel

  const group = new THREE.Group()
  group.add(box(width + 0.9, plinthH, 1.6, VITRIN.black))
  group.add(box(width + 0.95, 0.08, 0.08, VITRIN.gold, 0, plinthH - 0.18, 0.8))
  group.add(box(width + 0.95, 0.08, 0.08, VITRIN.gold, 0, 0.3, 0.8))
  group.add(box(width + 1.3, 0.2, 2.0, VITRIN.black2))

  const cells: Array<[number, number]> = []
  mask.forEach((row, r) => {
    for (let c = gemCols; c < row.length; c++) if (row[c] === '1') cells.push([c, r])
  })
  const depth = 2
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(voxel, voxel, voxel), toon('#ffffff'), cells.length * depth)
  const m = new THREE.Matrix4()
  const color = new THREE.Color()
  let i = 0
  for (const [c, r] of cells)
    for (let d = 0; d < depth; d++) {
      m.makeTranslation(-width / 2 + (c + 0.5) * voxel, plinthH + 0.1 + (rows - r - 0.5) * voxel, -d * voxel)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, color.set(d === 0 ? (r < rows * 0.35 ? VITRIN.goldLight : VITRIN.gold) : VITRIN.goldDark))
      i++
    }
  mesh.castShadow = mesh.receiveShadow = true
  group.add(mesh)
  group.position.set(x, 0, z)
  ctx.scene.add(solid(group))
  ctx.collision.addBox(x, z, width + 1.3, 2)
  ctx.occluders.add(group, x - width / 2, x + width / 2, z - 1, z + 1, plinthH + rows * voxel)
  ctx.reserve(x, z, width + 3, 4)

  // the logo sways gently like a museum piece on a turntable
  ctx.animators.push((t) => (mesh.rotation.y = Math.sin(t * 0.45) * 0.28))

  // gem sits where the logo's diamond is (rows ~8–10 of the mask)
  floatingGem(ctx, 0.5, x - width / 2 + 0.6, plinthH + 0.35 + (rows - 9) * voxel, z)

  label(ctx, 'VİTRİN AI', x, 0.45, z + 1.05, { background: VITRIN.black, color: VITRIN.gold, border: VITRIN.gold })

  ctx.interact.add({
    id: 'vitrin-statue',
    position: new THREE.Vector3(x, 0, z + 1.8),
    radius: 2.4,
    height: plinthH + rows * voxel + 0.6,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'project', id: project.id }),
  })
}
