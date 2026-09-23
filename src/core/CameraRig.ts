import * as THREE from 'three'

/**
 * Fixed-angle orthographic "HD-2D" camera. Follows a target smoothly but snaps
 * its position to the low-res texel grid (so the world never shimmers), and
 * reports the leftover sub-texel offset so the compositor can keep motion smooth.
 */
export class CameraRig {
  readonly camera: THREE.OrthographicCamera
  readonly pitch = THREE.MathUtils.degToRad(40)
  readonly distance = 60
  readonly focus = new THREE.Vector3()
  private goal = new THREE.Vector3()
  private right = new THREE.Vector3()
  private up = new THREE.Vector3()
  private texelsPerUnit = 16
  readonly subPixel = new THREE.Vector2()
  /** extra zoom; 1 = pixel perfect */
  zoom = 1
  private shake = 0

  constructor() {
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 140)
    this.camera.position.set(0, Math.sin(this.pitch) * this.distance, Math.cos(this.pitch) * this.distance)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateMatrixWorld()
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0)
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1)
  }

  resize(lowW: number, lowH: number, texelsPerUnit = 16) {
    this.texelsPerUnit = texelsPerUnit
    const halfW = lowW / texelsPerUnit / 2
    const halfH = lowH / texelsPerUnit / 2
    this.camera.left = -halfW
    this.camera.right = halfW
    this.camera.top = halfH
    this.camera.bottom = -halfH
    this.camera.zoom = this.zoom
    this.camera.updateProjectionMatrix()
  }

  /** Visible half-extents in world units (for culling / UI projection helpers). */
  get halfExtents() {
    return { x: this.camera.right / this.camera.zoom, y: this.camera.top / this.camera.zoom }
  }

  jump(target: THREE.Vector3) {
    this.goal.copy(target)
    this.focus.copy(target)
  }

  addShake(amount: number) {
    this.shake = Math.min(1, this.shake + amount)
  }

  update(target: THREE.Vector3, dt: number) {
    this.goal.copy(target)
    const k = 1 - Math.exp(-dt * 6)
    this.focus.lerp(this.goal, k)

    const shakeOffset = this.shake > 0.001 ? (Math.random() - 0.5) * this.shake * 0.6 : 0
    this.shake *= Math.exp(-dt * 8)

    // camera position before snapping
    const pos = new THREE.Vector3(
      this.focus.x + shakeOffset,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.pitch) * this.distance,
    )

    // snap along the camera's right/up axes to whole texels
    const texel = 1 / (this.texelsPerUnit * this.camera.zoom)
    const rx = pos.dot(this.right)
    const ry = pos.dot(this.up)
    const sx = Math.round(rx / texel) * texel
    const sy = Math.round(ry / texel) * texel
    pos.addScaledVector(this.right, sx - rx).addScaledVector(this.up, sy - ry)
    this.subPixel.set((rx - sx) / texel, (ry - sy) / texel)

    this.camera.position.copy(pos)
    this.camera.updateMatrixWorld()
  }
}
