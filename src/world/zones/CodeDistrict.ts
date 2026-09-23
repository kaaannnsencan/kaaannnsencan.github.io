import * as THREE from 'three'
import { i18n } from '../../content/i18n'
import type { CityPlan, Lot } from '../../data/city'
import { colorFor } from '../../data/city'
import { LAYER_SPRITES } from '../../core/PixelRenderer'
import { box, label, lampPost, PITCH, signpost, snapQuad, solid, type WorldContext } from '../kit'
import { ZONES } from '../layout'
import { buildVitrinTower } from './Vitrin'
import { canvas2d, pixelTexture, rng, toon, toonGradient } from '../materials'
import { P } from '../palette'
import { drawText, measure } from '../PixelFont'
import { shade } from '../Terrain'
import { dynamic } from '../batch'

const LOT_W = 8
const LOT_D = 8.5
const FLOOR_H = 0.9

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** 8×8 window cells; every cell = 1 world unit. Lit pattern is random per texture. */
function facadeTextures(seed: number) {
  const N = 8
  const S = 16
  const { canvas: wall, ctx: w } = canvas2d(N * S, N * S)
  const { canvas: glow, ctx: g } = canvas2d(N * S, N * S)
  const r = rng(seed)
  w.fillStyle = '#ffffff'
  w.fillRect(0, 0, N * S, N * S)
  g.fillStyle = '#000000'
  g.fillRect(0, 0, N * S, N * S)
  for (let cy = 0; cy < N; cy++)
    for (let cx = 0; cx < N; cx++) {
      const x = cx * S
      const y = cy * S
      // floor line
      w.fillStyle = '#d6d6d6'
      w.fillRect(x, y + S - 2, S, 2)
      // window with frame + sill
      w.fillStyle = '#4a5572'
      w.fillRect(x + 4, y + 3, 8, 9)
      w.fillStyle = '#6f7d9e'
      w.fillRect(x + 5, y + 4, 3, 3)
      w.fillStyle = '#bdbdbd'
      w.fillRect(x + 3, y + 12, 10, 1)
      if (r() < 0.55) {
        g.fillStyle = r() < 0.8 ? '#ffd27a' : '#9fe3ff'
        g.fillRect(x + 4, y + 3, 8, 9)
      }
    }
  const make = (c: HTMLCanvasElement) => {
    const t = pixelTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }
  const glowTex = make(glow)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return { wall: make(wall), glow: glowTex }
}

/** Box with side UVs in world units so the facade texture tiles one window per unit. */
function towerGeometry(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.attributes.uv as THREE.BufferAttribute
  // face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const sizes: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = sizes[f]
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setXY(i, (uv.getX(i) * su) / 8, (uv.getY(i) * sv) / 8)
    }
  }
  geo.translate(0, h / 2, 0)
  return geo
}

export interface DistrictHandles {
  lots: Array<{ lot: Lot; x: number; z: number }>
}

export function buildCodeDistrict(ctx: WorldContext, plan: CityPlan): DistrictHandles {
  const cx = ZONES.code.x
  const cz = ZONES.code.z
  const width = plan.columns * LOT_W
  const depth = plan.rows * LOT_D
  const x0 = cx - width / 2 + LOT_W / 2
  const z0 = cz - depth / 2 + LOT_D / 2

  const forecourt = 6
  ctx.decal({ x: cx, z: cz + forecourt / 2, w: width + 3, d: depth + 3 + forecourt, color: P.plaza, edge: P.plazaDark, pattern: 'tiles' })

  const facades = [facadeTextures(11), facadeTextures(23), facadeTextures(37)]
  const handles: DistrictHandles = { lots: [] }

  plan.lots.forEach((lot, i) => {
    const col = i % plan.columns
    // fill from the front (south) row so buildings are never hidden behind empty lots
    const row = plan.rows - 1 - Math.floor(i / plan.columns)
    const x = x0 + col * LOT_W
    const z = z0 + row * LOT_D
    handles.lots.push({ lot, x, z })

    if (lot.kind === 'empty') {
      ctx.decal({ x, z, w: 5, d: 5, color: P.dirt, edge: P.woodDark })
      const s = new THREE.Group()
      s.add(box(0.12, 0.9, 0.12, P.woodDark, -0.5))
      s.add(box(0.12, 0.9, 0.12, P.woodDark, 0.5))
      s.add(box(1.4, 0.6, 0.1, P.gold, 0, 0.7))
      s.position.set(x, 0, z + 1.6)
      ctx.scene.add(s)
      // traffic cones
      for (const [ox, oz] of [[-1.8, -1.6], [1.8, -1.6], [1.8, 1.8]] as const) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), toon(P.coral))
        cone.position.set(x + ox, 0.25, z + oz)
        ctx.scene.add(solid(cone))
      }
      label(ctx, { tr: 'YAKINDA', en: 'SOON' }, x, 1.9, z + 1.6, { background: P.gold })
      ctx.interact.add({
        id: `lot-${i}`,
        position: new THREE.Vector3(x, 0, z + 2.4),
        radius: 1.8,
        height: 2.4,
        label: () => i18n.t('interact'),
        action: () => ctx.openPanel({ kind: 'empty' }),
      })
      return
    }

    if (lot.kind === 'project' && lot.project.landmark === 'vitrin') {
      buildVitrinTower(ctx, lot, x, z)
      return
    }

    const name = lot.kind === 'repo' ? lot.repo.name : lot.project.id
    const seed = hash(name)
    const r = rng(seed)
    const color = new THREE.Color(lot.color).lerp(new THREE.Color('#ffffff'), 0.12).getHexString()
    const bw = 4.4 + Math.floor(r() * 2) * 0.4
    const bd = 4.2
    const h = lot.floors * FLOOR_H
    const fac = facades[seed % facades.length]

    const wallMat = new THREE.MeshToonMaterial({
      color: `#${color}`,
      map: fac.wall,
      emissive: '#ffffff',
      emissiveMap: fac.glow,
      emissiveIntensity: 0,
      gradientMap: toonGradient(),
    })
    const roofMat = toon(shade(`#${color}`, 0.72))
    ctx.nightMaterials.push({ material: wallMat, day: 0, night: 1.3 })

    const g = new THREE.Group()
    const tower = new THREE.Mesh(towerGeometry(bw, h, bd), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat])
    g.add(tower)
    // plinth + entrance canopy
    g.add(box(bw + 0.3, 0.35, bd + 0.3, P.stoneDark))
    g.add(box(1.6, 1.5, 0.3, P.ink, 0, 0, bd / 2 + 0.05))
    g.add(box(2.2, 0.15, 0.9, shade(`#${color}`, 0.6), 0, 1.6, bd / 2 + 0.4))

    let top = h
    // tall buildings get a set-back crown
    if (lot.floors >= 8) {
      const ch = 2 * FLOOR_H
      const crown = new THREE.Mesh(towerGeometry(bw * 0.6, ch, bd * 0.6), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat])
      crown.position.y = h
      g.add(crown)
      top += ch
    }
    // roof clutter: AC units / water tank / antenna
    const clutter = Math.floor(r() * 3)
    if (clutter === 0) g.add(box(0.9, 0.5, 0.7, P.stone, -bw * 0.22, top, -0.6))
    if (clutter === 1) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), toon(P.wood))
      tank.position.set(bw * 0.2, top + 0.85, -0.5)
      g.add(tank, box(0.8, 0.4, 0.8, P.ink, bw * 0.2, top, -0.5))
    }
    g.add(box(0.08, 1.4, 0.08, P.ink, bw * 0.3, top, bd * 0.25))

    if (lot.kind === 'repo') {
      // one golden block on the roof per star (max 5)
      for (let s = 0; s < Math.min(5, lot.repo.stars); s++) g.add(box(0.3, 0.3, 0.3, P.gold, -bw * 0.3 + s * 0.4, top, bd * 0.3))
      if (lot.repo.archived) g.add(box(bw * 0.8, 0.2, 0.15, P.wood, 0, h * 0.4, bd / 2 + 0.1).rotateZ(0.3))
    } else {
      // curated CV projects get an observatory dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), toon(lot.project.accent))
      dome.position.set(-bw * 0.15, top, -0.2)
      g.add(dome)
    }

    g.position.set(x, 0, z - 0.6)
    ctx.scene.add(solid(g))
    ctx.collision.addBox(x, z - 0.6, bw + 0.3, bd + 0.3)
    ctx.occluders.add(g, x - bw / 2, x + bw / 2, z - 0.6 - bd / 2, z - 0.6 + bd / 2, top + 1)

    if (lot.active) addCrane(ctx, x + bw / 2 + 0.6, z - 0.6 - bd / 2 + 0.6, top + 2.2)

    const signText = () => {
      const t = lot.project ? i18n.pick(lot.project.short) : lot.kind === 'repo' ? lot.repo.name : ''
      const short = t.length > 18 ? `${t.slice(0, 17)}.` : t
      return lot.kind === 'repo' && lot.repo.stars > 0 ? `${short} ★${lot.repo.stars}` : short
    }
    // front row: shop sign in front of the facade; rows behind: name floats above the roof
    // so it is never hidden by the buildings in front
    const frontRow = row === plan.rows - 1
    if (frontRow) label(ctx, signText, x, 2.3, z - 0.6 + bd / 2 + 1.2, { background: P.ink, color: P.white, border: lot.color })
    else label(ctx, signText, x, top + 1.6, z - 0.6, { background: P.ink, color: P.white, border: lot.color })

    ctx.interact.add({
      id: `lot-${i}`,
      position: new THREE.Vector3(x, 0, z - 0.6 + bd / 2 + 1),
      radius: 1.9,
      height: 3.6,
      label: () => i18n.t('interact'),
      action: () => ctx.openPanel({ kind: lot.kind, payload: lot }),
    })
  })

  // district gate + legend board
  const gx = cx - width / 2 - 2.4
  const gz = ZONES.spawn.z
  // entrance pylons either side of the road
  for (const side of [-1, 1]) {
    const pz = gz + side * 2.6
    const pylon = new THREE.Group()
    pylon.add(box(0.8, 3.2, 0.8, P.ink))
    pylon.add(box(0.9, 0.3, 0.9, P.cyan, 0, 3.2))
    pylon.position.set(gx, 0, pz)
    ctx.scene.add(solid(pylon))
    ctx.collision.addBox(gx, pz, 0.8, 0.8)
  }
  label(ctx, { tr: '</> KOD MAHALLESİ', en: '</> CODE DISTRICT' }, gx, 3.9, gz + 2.6, { background: P.ink, color: P.cyan, border: P.cyan })

  signpost(ctx, gx + 2.2, gz + 6, 'GITHUB', () => ctx.openPanel({ kind: 'github' }), P.ink)
  const langs = Array.from(new Set(plan.lots.flatMap((l) => (l.kind === 'repo' && l.repo.language ? [l.repo.language] : []))))
  if (langs.length) ctx.scene.add(legend(langs, gx + 5.8, gz + 6.1))

  lampPost(ctx, gx + 1.5, gz - 3)
  lampPost(ctx, gx + 1.5, gz + 3)
  return handles
}

/** Floating board listing the languages used, each with its GitHub colour. */
function legend(langs: string[], x: number, z: number) {
  const rowH = 10
  const w = Math.max(...langs.map((l) => measure(l))) + 16
  const h = langs.length * rowH + 6
  const { canvas, ctx } = canvas2d(w, h)
  ctx.fillStyle = P.ink
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = P.white
  ctx.fillRect(1, 1, w - 2, h - 2)
  langs.forEach((l, i) => {
    ctx.fillStyle = P.ink
    ctx.fillRect(4, 4 + i * rowH, 7, 7)
    ctx.fillStyle = colorFor(l)
    ctx.fillRect(5, 5 + i * rowH, 5, 5)
    ctx.fillStyle = P.ink
    drawText(ctx, l, 14, 4 + i * rowH)
  })
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w / 16, h / 16),
    new THREE.MeshBasicMaterial({ map: pixelTexture(canvas), transparent: true, alphaTest: 0.5, depthWrite: false }),
  )
  mesh.rotation.x = -PITCH
  mesh.position.set(x, 0.4 + h / 32, z)
  snapQuad(mesh, w, h)
  mesh.layers.set(LAYER_SPRITES)
  return mesh
}

function addCrane(ctx: WorldContext, x: number, z: number, height: number) {
  const g = new THREE.Group()
  g.add(box(0.35, height, 0.35, P.gold))
  const jib = new THREE.Group()
  jib.add(box(5, 0.3, 0.3, P.gold, 1.6, 0, 0))
  jib.add(box(1, 0.6, 0.6, P.stoneDark, -1.2, -0.15, 0))
  const cable = box(0.05, 1.8, 0.05, P.ink, 3.6, -1.8, 0)
  const hook = box(0.3, 0.3, 0.3, P.coral, 3.6, -2.1, 0)
  jib.add(cable, hook)
  jib.position.y = height
  g.add(dynamic(jib))
  g.position.set(x, 0, z)
  ctx.scene.add(solid(g))
  ctx.animators.push((t) => {
    jib.rotation.y = Math.sin(t * 0.25) * 1.2
  })
}
