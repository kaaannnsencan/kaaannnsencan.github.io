import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import { box, glowMaterial, house, label, lampPost, PITCH, signpost, solid, windowMaterial, type WorldContext } from '../kit'
import { LAYER_SPRITES } from '../../core/PixelRenderer'
import { ZONES } from '../layout'
import { canvas2d, pixelTexture } from '../materials'
import { P } from '../palette'

/** University (education), career office (experience), flags (languages). */
export function buildCampus(ctx: WorldContext) {
  const { x, z } = ZONES.campus
  ctx.decal({ x, z: z + 1, w: 26, d: 14, color: P.plaza, edge: P.plazaDark, pattern: 'tiles' })

  const uni = house(ctx, x, z - 1, { w: 16, d: 6, h: 4.2, wall: '#eef1f6', roof: P.roofBlue, roofH: 2.4, windows: 6 }, windowMaterial(ctx))
  // classical columns + steps
  for (let i = -3; i <= 3; i++) if (i !== 0) uni.group.add(box(0.45, 3.6, 0.45, P.white, i * 1.25, 0.3, 3.4))
  uni.group.add(box(9.4, 0.4, 0.8, P.white, 0, 3.9, 3.4))
  uni.group.add(box(9.4, 0.3, 1.6, P.stone, 0, 0, 3.8))
  label(ctx, 'İSTİNYE ÜNİVERSİTESİ', x, 8.4, z - 1, { background: P.ink, color: P.white, border: P.roofBlue })
  ctx.interact.add({
    id: 'campus-uni',
    position: new THREE.Vector3(x, 0, z + 3.6),
    radius: 2.2,
    height: 2.6,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'education' }),
  })

  // career office kiosk
  const kx = x + 10.5
  const kz = z + 4
  const kiosk = new THREE.Group()
  kiosk.add(box(3, 2.2, 2.2, P.gold))
  kiosk.add(box(3.4, 0.25, 2.6, P.ink, 0, 2.2))
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.05), glowMaterial(ctx, '#34466b', '#ffcf6b', 0, 1.4))
  win.position.set(0, 1.3, 1.11)
  kiosk.add(win)
  kiosk.position.set(kx, 0, kz)
  ctx.scene.add(solid(kiosk))
  ctx.collision.addBox(kx, kz, 3, 2.2)
  label(ctx, { tr: 'KARİYER OFİSİ', en: 'CAREER OFFICE' }, kx, 3.4, kz)
  ctx.interact.add({
    id: 'campus-career',
    position: new THREE.Vector3(kx, 0, kz + 1.9),
    radius: 1.8,
    height: 2.4,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'experience' }),
  })

  // language flags
  const fx = x - 10.5
  const fz = z + 4
  flag(ctx, fx - 1, fz, 'tr', 3.6)
  flag(ctx, fx + 1, fz, 'en', 3.2)
  ctx.interact.add({
    id: 'campus-langs',
    position: new THREE.Vector3(fx, 0, fz + 1.2),
    radius: 2,
    height: 2,
    label: () => i18n.t('interact'),
    action: () => ctx.openPanel({ kind: 'languages' }),
  })
  label(ctx, { tr: 'DİLLER', en: 'LANGUAGES' }, fx, 0.6, fz + 0.9, { background: P.white })

  signpost(ctx, x - 4, z + 7.5, { tr: 'EĞİTİM', en: 'EDUCATION' }, () => ctx.openPanel({ kind: 'education' }), P.roofBlue)
  lampPost(ctx, x - 13, z - 3)
  lampPost(ctx, x + 13, z - 3)
}

function flag(ctx: WorldContext, x: number, z: number, kind: 'tr' | 'en', h: number) {
  ctx.scene.add(solid(box(0.12, h, 0.12, P.stoneDark, x, 0, z)))
  ctx.collision.addCircle(x, z, 0.2)
  const { canvas, ctx: c } = canvas2d(20, 13)
  if (kind === 'tr') {
    c.fillStyle = '#e30a17'
    c.fillRect(0, 0, 20, 13)
    c.fillStyle = '#ffffff'
    // crescent + star
    for (let y = 0; y < 13; y++)
      for (let xx = 0; xx < 20; xx++) {
        const outer = (xx - 7) ** 2 + (y - 6) ** 2 < 16
        const inner = (xx - 8.2) ** 2 + (y - 6) ** 2 < 10
        if (outer && !inner) c.fillRect(xx, y, 1, 1)
      }
    c.fillRect(12, 5, 3, 3)
    c.fillRect(13, 4, 1, 5)
    c.fillRect(11, 6, 5, 1)
  } else {
    c.fillStyle = '#1f3b8f'
    c.fillRect(0, 0, 20, 13)
    c.fillStyle = '#ffffff'
    c.fillRect(0, 5, 20, 3)
    c.fillRect(8, 0, 4, 13)
    c.fillStyle = '#c8102e'
    c.fillRect(0, 6, 20, 1)
    c.fillRect(9, 0, 2, 13)
  }
  const tex = pixelTexture(canvas)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(20 / 16, 13 / 16, 6, 1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }))
  mesh.rotation.x = -PITCH * 0.2
  mesh.position.set(x + 20 / 32 + 0.06, h - 13 / 32, z)
  mesh.layers.set(LAYER_SPRITES)
  ctx.scene.add(mesh)
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
  const base = Float32Array.from(pos.array as Float32Array)
  ctx.animators.push((t) => {
    for (let i = 0; i < pos.count; i++) {
      const px = base[i * 3]
      const k = (px + 20 / 32) / (20 / 16)
      pos.setZ(i, Math.sin(t * 5 + px * 5 + x) * 0.12 * k)
    }
    pos.needsUpdate = true
  })
}
