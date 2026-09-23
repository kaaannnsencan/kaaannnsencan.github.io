import * as THREE from 'three'
import { roundedRectSdf, type CollisionWorld } from './Collision'
import { ISLAND, PATHS, PATH_WIDTH } from './layout'
import { rng, toon } from './materials'
import { P } from './palette'

export interface Rect { x: number; z: number; w: number; d: number }

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

export function isFree(x: number, z: number, reserved: Rect[], margin = 0): boolean {
  if (roundedRectSdf(x, z, ISLAND.halfW, ISLAND.halfH, ISLAND.radius) > -3.2 - margin) return false
  for (const r of reserved)
    if (Math.abs(x - r.x) < r.w / 2 + margin && Math.abs(z - r.z) < r.d / 2 + margin) return false
  for (const path of PATHS)
    for (let i = 0; i < path.length - 1; i++)
      if (distToSegment(x, z, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) < PATH_WIDTH / 2 + 0.8 + margin) return false
  return true
}

/**
 * Scatters trees, bushes and rocks over every free patch of grass using
 * instanced meshes (a few draw calls for the whole forest).
 */
export function scatterProps(scene: THREE.Scene, collision: CollisionWorld, reserved: Rect[]) {
  const rand = rng(42)
  const trees: Array<{ x: number; z: number; s: number; kind: 0 | 1; color: string }> = []
  const bushes: Array<{ x: number; z: number; s: number; color: string }> = []
  const rocks: Array<{ x: number; z: number; s: number; r: number }> = []

  const { halfW, halfH } = ISLAND
  const step = 2.3
  for (let z = -halfH; z < halfH; z += step)
    for (let x = -halfW; x < halfW; x += step) {
      const px = x + (rand() - 0.5) * step * 0.9
      const pz = z + (rand() - 0.5) * step * 0.9
      if (!isFree(px, pz, reserved)) continue
      // denser forest towards the rim, sparse meadows inside
      const edge = -roundedRectSdf(px, pz, halfW, halfH, ISLAND.radius)
      const density = edge < 14 ? 0.62 : 0.16
      const roll = rand()
      if (roll < density) {
        const autumn = rand() < 0.14
        const blossom = !autumn && rand() < 0.08
        trees.push({
          x: px,
          z: pz,
          s: 0.8 + rand() * 0.55,
          kind: rand() < 0.4 ? 1 : 0,
          color: autumn ? P.leafAutumn : blossom ? P.blossom : rand() < 0.5 ? P.leaf : P.leafDark,
        })
      } else if (roll < density + 0.08) bushes.push({ x: px, z: pz, s: 0.5 + rand() * 0.4, color: rand() < 0.5 ? P.leaf : P.leafDark })
      else if (roll < density + 0.11) rocks.push({ x: px, z: pz, s: 0.35 + rand() * 0.5, r: rand() * Math.PI })
    }

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const color = new THREE.Color()
  const up = new THREE.Vector3(0, 1, 0)

  // trunks
  const trunkGeo = new THREE.BoxGeometry(0.34, 1, 0.34)
  trunkGeo.translate(0, 0.5, 0)
  const trunks = new THREE.InstancedMesh(trunkGeo, toon(P.woodDark), trees.length)
  // round canopies + pine canopies
  const roundGeo = new THREE.IcosahedronGeometry(1, 0)
  const pineGeo = new THREE.ConeGeometry(1, 2, 6)
  const rounds = trees.filter((t) => t.kind === 0)
  const pines = trees.filter((t) => t.kind === 1)
  const roundMesh = new THREE.InstancedMesh(roundGeo, toon('#ffffff'), rounds.length)
  const pineMesh = new THREE.InstancedMesh(pineGeo, toon('#ffffff'), pines.length * 2)

  trees.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(t.s, t.s * (t.kind ? 1.1 : 1.3), t.s))
    trunks.setMatrixAt(i, m)
    collision.addCircle(t.x, t.z, 0.32 * t.s)
  })
  rounds.forEach((t, i) => {
    q.setFromAxisAngle(up, (t.x * 13.1 + t.z * 7.7) % Math.PI)
    m.compose(new THREE.Vector3(t.x, 1.6 * t.s + 0.4, t.z), q, new THREE.Vector3(1.15 * t.s, 1.05 * t.s, 1.15 * t.s))
    roundMesh.setMatrixAt(i, m)
    roundMesh.setColorAt(i, color.set(t.color))
  })
  pines.forEach((t, i) => {
    const c = t.color === P.blossom ? P.leafDark : t.color
    q.setFromAxisAngle(up, (t.x + t.z) % Math.PI)
    m.compose(new THREE.Vector3(t.x, 1.55 * t.s + 0.3, t.z), q, new THREE.Vector3(1.0 * t.s, 0.9 * t.s, 1.0 * t.s))
    pineMesh.setMatrixAt(i * 2, m)
    pineMesh.setColorAt(i * 2, color.set(c))
    m.compose(new THREE.Vector3(t.x, 2.45 * t.s + 0.3, t.z), q, new THREE.Vector3(0.72 * t.s, 0.7 * t.s, 0.72 * t.s))
    pineMesh.setMatrixAt(i * 2 + 1, m)
    pineMesh.setColorAt(i * 2 + 1, color.set(c).multiplyScalar(1.12))
  })

  const bushMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), toon('#ffffff'), bushes.length)
  bushes.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, b.s * 0.55, b.z), q.identity(), new THREE.Vector3(b.s * 1.2, b.s * 0.8, b.s * 1.2))
    bushMesh.setMatrixAt(i, m)
    bushMesh.setColorAt(i, color.set(b.color))
    collision.addCircle(b.x, b.z, b.s * 0.9)
  })

  const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), toon(P.stone), rocks.length)
  rocks.forEach((r, i) => {
    q.setFromAxisAngle(up, r.r)
    m.compose(new THREE.Vector3(r.x, r.s * 0.3, r.z), q, new THREE.Vector3(r.s, r.s * 0.7, r.s))
    rockMesh.setMatrixAt(i, m)
    collision.addCircle(r.x, r.z, r.s * 0.9)
  })

  for (const mesh of [trunks, roundMesh, pineMesh, bushMesh, rockMesh]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    scene.add(mesh)
  }
  return { trees: trees.length }
}
