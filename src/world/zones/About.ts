import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { bench, box, glowMaterial, house, label, lampPost, signpost, solid, windowMaterial, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { canvas2d, pixelTexture } from '../materials'
import { P } from '../palette'

/** Kaan's house (bio) + a desk with a glowing monitor + the contact corner. */
export function buildAbout(ctx: WorldContext) {
  const { x, z } = ZONES.about
  ctx.decal({ x, z: z + 3.5, w: 14, d: 5, color: P.path, edge: P.pathDark, pattern: 'tiles' })

  const h = house(ctx, x, z - 1, { w: 9, d: 6, h: 3.4, roof: P.roofRed, roofH: 2.6, windows: 2 }, windowMaterial(ctx))
  // chimney
  h.group.add(box(0.8, 1.6, 0.8, P.stoneDark, 2.6, 4.2, -1))
  label(ctx, { tr: 'KAAN\'IN EVİ', en: "KAAN'S HOUSE" }, x, 7.4, z - 1)

  ctx.interact.add({
    id: 'about-door',
    position: h.door,
    radius: 1.8,
    height: 2.4,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'about' }),
  })

  // outdoor desk: laptop showing scrolling code
  const deskX = x + 6.5
  const deskZ = z + 2.5
  const desk = new THREE.Group()
  desk.add(box(1.8, 0.1, 0.9, P.wood, 0, 0.75))
  for (const [lx, lz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) desk.add(box(0.1, 0.75, 0.1, P.woodDark, lx, 0, lz))
  const { canvas, ctx: c2 } = canvas2d(16, 10)
  const screenTex = pixelTexture(canvas)
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.62), screenMat)
  screen.position.set(0, 1.2, -0.12)
  screen.rotation.x = -0.25
  desk.add(box(1.1, 0.72, 0.06, P.ink, 0, 0.84, -0.17).rotateX(-0.25))
  desk.add(screen)
  desk.position.set(deskX, 0, deskZ)
  ctx.scene.add(solid(desk))
  ctx.collision.addBox(deskX, deskZ, 1.8, 0.9)
  ctx.reserve(deskX, deskZ, 3, 3)
  const codeColors = [P.cyan, P.lime, P.gold, P.magenta, P.white]
  let line = 0
  let acc = 0
  ctx.animators.push((_t, dt) => {
    acc += dt
    if (acc < 0.35) return
    acc = 0
    const img = c2.getImageData(0, 1, 16, 9)
    c2.fillStyle = '#10131c'
    c2.fillRect(0, 0, 16, 10)
    c2.putImageData(img, 0, 0)
    const indent = [1, 3, 3, 5, 3, 1][line % 6]
    const len = 3 + ((line * 7) % 9)
    c2.fillStyle = codeColors[line % codeColors.length]
    c2.fillRect(indent, 9, Math.min(len, 15 - indent), 1)
    line++
    screenTex.needsUpdate = true
  })

  bench(ctx, x - 6, z + 3)
  lampPost(ctx, x - 4.2, z + 5.2)
  lampPost(ctx, x + 4.2, z + 5.2)

  buildContact(ctx)
}

function buildContact(ctx: WorldContext) {
  const { x, z } = ZONES.contact
  ctx.decal({ x, z: z + 1, w: 10, d: 7, color: P.plaza, edge: P.plazaDark, pattern: 'tiles' })
  ctx.reserve(x, z, 11, 8)
  const open = () => ctx.openPanel({ kind: 'contact' })

  // phone booth
  const booth = new THREE.Group()
  booth.add(box(1.3, 2.5, 1.3, P.roofRed))
  booth.add(box(1.45, 0.25, 1.45, '#a3362e', 0, 2.5))
  const glass = glowMaterial(ctx, '#9fd6ef', '#fff2c2', 0, 0.9)
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.05), glass)
  win.position.set(0, 1.35, 0.66)
  booth.add(win)
  booth.position.set(x - 2.5, 0, z)
  ctx.scene.add(solid(booth))
  ctx.collision.addBox(x - 2.5, z, 1.3, 1.3)
  label(ctx, { tr: 'TELEFON', en: 'PHONE' }, x - 2.5, 3.4, z)

  // mailbox
  const mail = new THREE.Group()
  mail.add(box(0.15, 1, 0.15, P.woodDark))
  mail.add(box(0.7, 0.55, 0.9, P.roofBlue, 0, 1))
  mail.add(box(0.08, 0.35, 0.08, P.roofRed, 0.4, 1.35))
  mail.position.set(x + 2.3, 0, z + 0.5)
  ctx.scene.add(solid(mail))
  ctx.collision.addCircle(x + 2.3, z + 0.5, 0.45)
  label(ctx, 'E-MAIL', x + 2.3, 2.3, z + 0.5)

  for (const [px, pz] of [[x - 2.5, z + 1.4], [x + 2.3, z + 1.6]] as const)
    ctx.interact.add({ id: `contact-${px}`, position: new THREE.Vector3(px, 0, pz), radius: 1.7, height: 2.6, label: () => i18n.t('interact'), action: open })

  signpost(ctx, x, z + 3.2, { tr: 'İLETİŞİM', en: 'CONTACT' }, open, P.gold)
}
