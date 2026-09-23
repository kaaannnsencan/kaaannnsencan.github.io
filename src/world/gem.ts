import * as THREE from 'three'
import type { WorldContext } from './kit'
import { toonGradient } from './materials'

/** Brilliant-cut diamond: flat-shaded lathe (table, crown, girdle, pavilion). */
export function gemGeometry(size = 1) {
  const pts = [
    new THREE.Vector2(0, -1.0),
    new THREE.Vector2(0.95, 0),
    new THREE.Vector2(1.0, 0.08),
    new THREE.Vector2(0.62, 0.42),
    new THREE.Vector2(0, 0.42),
  ].map((p) => p.multiplyScalar(size))
  const geo = new THREE.LatheGeometry(pts, 8)
  // non-indexed + recomputed normals = one flat normal per facet
  const flat = geo.toNonIndexed()
  flat.computeVertexNormals()
  return flat
}

let gemMat: THREE.MeshToonMaterial | null = null

/** Shared icy material that glows brighter at night. */
export function gemMaterial(ctx: WorldContext) {
  if (!gemMat) {
    gemMat = new THREE.MeshToonMaterial({
      color: '#e9fbff',
      emissive: '#9fe8ff',
      emissiveIntensity: 0.35,
      gradientMap: toonGradient(),
    })
  }
  if (!ctx.nightMaterials.some((n) => n.material === gemMat)) ctx.nightMaterials.push({ material: gemMat, day: 0.35, night: 1.6 })
  return gemMat
}

/** A floating, spinning gem that throws sparkles now and then. */
export function floatingGem(ctx: WorldContext, size: number, x: number, y: number, z: number, phase = 0) {
  const gem = new THREE.Mesh(gemGeometry(size), gemMaterial(ctx))
  gem.castShadow = true
  gem.userData.dynamic = true
  gem.position.set(x, y, z)
  ctx.scene.add(gem)
  let nextSparkle = phase
  ctx.animators.push((t) => {
    gem.rotation.y = t * 1.1 + phase
    gem.position.y = y + Math.sin(t * 1.8 + phase) * size * 0.25
    if (t > nextSparkle) {
      nextSparkle = t + 0.25 + Math.random() * 0.5
      const a = Math.random() * Math.PI * 2
      ctx.particles.emit(
        gem.position.x + Math.cos(a) * size * 0.9,
        gem.position.y + (Math.random() - 0.3) * size,
        gem.position.z + Math.sin(a) * size * 0.9,
        0,
        0.6,
        0,
        0.07 + Math.random() * 0.05,
        Math.random() < 0.5 ? '#ffffff' : '#fff1b8',
        0.7,
      )
    }
  })
  return gem
}
