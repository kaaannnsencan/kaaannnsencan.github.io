import * as THREE from 'three'
import type { NightMaterial } from './kit'
import { P } from './palette'

/**
 * Lighting + day/night. `night` animates 0 → 1; everything that glows at
 * night (windows, lamps, crystals) registers in `nightMaterials`.
 */
export class Environment {
  readonly sun: THREE.DirectionalLight
  readonly hemi: THREE.HemisphereLight
  readonly lantern: THREE.PointLight
  night = 0
  target = 0
  private skyDay = new THREE.Color(P.waterDeep)
  private skyNight = new THREE.Color('#0b1428')
  private sunDay = new THREE.Color('#fff4de')
  private sunNight = new THREE.Color('#6d83c9')

  private shadowSpan: number
  private shadowTexel: number

  constructor(private scene: THREE.Scene, private nightMaterials: NightMaterial[], lowPower = false) {
    scene.background = this.skyDay.clone()

    this.hemi = new THREE.HemisphereLight('#dff3ff', '#5c7a4a', 1.4)
    scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(this.sunDay, 2.6)
    this.sun.castShadow = true
    // phones: smaller map over a smaller area keeps the same sharpness for a quarter of the cost
    const size = lowPower ? 1024 : 2048
    this.shadowSpan = lowPower ? 46 : 68
    this.shadowTexel = this.shadowSpan / size
    this.sun.shadow.mapSize.set(size, size)
    const s = this.sun.shadow.camera
    s.left = -this.shadowSpan / 2
    s.right = this.shadowSpan / 2
    s.top = this.shadowSpan / 2
    s.bottom = -this.shadowSpan / 2
    s.near = 1
    s.far = 120
    this.sun.shadow.bias = -0.0008
    this.sun.shadow.normalBias = 0.02
    scene.add(this.sun, this.sun.target)

    this.lantern = new THREE.PointLight('#ffc774', 0, 9, 1.4)
    this.lantern.position.y = 1.8
    scene.add(this.lantern)

    const hour = new Date().getHours()
    this.night = this.target = hour >= 20 || hour < 6 ? 1 : 0
    this.apply()
  }

  toggle() {
    this.target = this.target > 0.5 ? 0 : 1
  }

  update(dt: number, focus: THREE.Vector3) {
    if (this.night !== this.target) {
      const dir = Math.sign(this.target - this.night)
      this.night = THREE.MathUtils.clamp(this.night + dir * dt * 0.8, 0, 1)
      this.apply()
    }
    // shadow camera follows the player on a texel-snapped grid to avoid swimming shadows
    const texel = this.shadowTexel
    const fx = Math.round(focus.x / texel) * texel
    const fz = Math.round(focus.z / texel) * texel
    this.sun.position.set(fx - 18, 40, fz + 22)
    this.sun.target.position.set(fx, 0, fz)
    this.lantern.position.set(focus.x, 1.8, focus.z + 0.4)
  }

  private apply() {
    const n = this.night
    ;(this.scene.background as THREE.Color).copy(this.skyDay).lerp(this.skyNight, n)
    this.sun.color.copy(this.sunDay).lerp(this.sunNight, n)
    this.sun.intensity = THREE.MathUtils.lerp(2.6, 0.55, n)
    this.hemi.intensity = THREE.MathUtils.lerp(1.4, 0.45, n)
    this.hemi.color.set('#dff3ff').lerp(new THREE.Color('#5a6fb0'), n)
    this.lantern.intensity = n * 14
    for (const m of this.nightMaterials) {
      const v = THREE.MathUtils.lerp(m.day, m.night, n)
      if ('emissiveIntensity' in m.material) m.material.emissiveIntensity = v
      else m.material.opacity = v
    }
  }
}
