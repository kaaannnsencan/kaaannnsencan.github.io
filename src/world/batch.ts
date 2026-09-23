import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Mark an object (and everything under it) as moving, so batching leaves it alone. */
export function dynamic<T extends THREE.Object3D>(o: T): T {
  o.userData.dynamic = true
  return o
}

/** Mark a group whose children must stay together (e.g. a fading building). */
export function batchRoot<T extends THREE.Object3D>(o: T): T {
  o.userData.batchRoot = true
  return o
}

const CHUNK = 24 // world units per spatial chunk, so frustum culling still works

/**
 * Static batching: merges every non-moving mesh that shares a material (and
 * shadow flags) into one mesh per spatial chunk. Hundreds of little boxes
 * become a few dozen draw calls — the single biggest win on phones, where
 * each frame renders the scene three times (colour, normals, shadows).
 */
export function batchStatic(scene: THREE.Scene) {
  scene.updateMatrixWorld(true)
  const groups = new Map<string, { root: THREE.Object3D; material: THREE.Material; cast: boolean; receive: boolean; meshes: THREE.Mesh[] }>()

  const visit = (obj: THREE.Object3D, root: THREE.Object3D) => {
    if (obj.userData.dynamic) return
    const nextRoot = obj.userData.batchRoot ? obj : root
    const mesh = obj as THREE.Mesh
    if (
      mesh.isMesh &&
      !(mesh as THREE.InstancedMesh).isInstancedMesh &&
      !Array.isArray(mesh.material) &&
      mesh.layers.mask === 1 &&
      mesh.children.length === 0 &&
      mesh.geometry.attributes.position &&
      mesh.geometry.attributes.normal
    ) {
      const p = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld)
      const chunk = nextRoot === scene ? `${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}` : 'g'
      const key = `${nextRoot.uuid}|${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${chunk}`
      let g = groups.get(key)
      if (!g) groups.set(key, (g = { root: nextRoot, material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, meshes: [] }))
      g.meshes.push(mesh)
    }
    for (const child of [...obj.children]) visit(child, nextRoot)
  }
  visit(scene, scene)

  let before = 0
  let after = 0
  const inv = new THREE.Matrix4()
  const m = new THREE.Matrix4()
  for (const g of groups.values()) {
    before += g.meshes.length
    if (g.meshes.length < 2) {
      after += g.meshes.length
      continue
    }
    inv.copy(g.root.matrixWorld).invert()
    const geos = g.meshes.map((mesh) => {
      let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      // keep a common attribute set so everything can be merged
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name)
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2))
      geo.morphAttributes = {}
      geo.clearGroups()
      geo.applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld))
      return geo
    })
    const merged = mergeGeometries(geos, false)
    geos.forEach((geo) => geo.dispose())
    if (!merged) {
      after += g.meshes.length
      continue
    }
    merged.computeBoundingSphere()
    const out = new THREE.Mesh(merged, g.material)
    out.castShadow = g.cast
    out.receiveShadow = g.receive
    for (const mesh of g.meshes) mesh.removeFromParent()
    g.root.add(out)
    after++
  }
  return { before, after }
}
